import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { asyncHandler, badRequest, notFound, conflict, forbidden } from '../lib/http.js';
import config from '../config.js';
import { findCart, cartPayload } from './cart.js';
import { order as serializeOrder } from '../lib/serialize.js';
import { sendMail, orderConfirmationEmail } from '../lib/mailer.js';
import { limiters } from '../lib/limiters.js';
import { payments } from '../services/payments.js';
import { getPublicSettings } from './catalog.js';

const router = Router();

const addressSchema = z.object({
  line1: z.string().trim().min(3, 'Adresse requise').max(160),
  line2: z.string().trim().max(160).optional().default(''),
  postalCode: z.string().trim().regex(/^\d{5}$/, 'Code postal invalide (5 chiffres)'),
  city: z.string().trim().min(2, 'Ville requise').max(90),
  country: z.string().trim().max(60).default('France'),
});

const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide').max(180),
  firstName: z.string().trim().min(1, 'Prénom requis').max(60),
  lastName: z.string().trim().min(1, 'Nom requis').max(60),
  phone: z.string().trim().min(6, 'Téléphone requis').max(30),
  address: addressSchema,
  deliveryMethod: z.enum(['classique', 'confort', 'retrait']),
  discountCode: z.string().trim().max(40).optional().nullable(),
  customerNote: z.string().trim().max(800).optional().default(''),
  newsletter: z.boolean().optional().default(false),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Vous devez accepter les conditions de vente.' }) }),
});

function orderToken(order) {
  return jwt.sign({ orderId: order.id, reference: order.reference }, config.jwtSecret, {
    expiresIn: '3h',
    issuer: 'edyeco',
    audience: 'edyeco-order',
  });
}

function verifyOrderToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret, { issuer: 'edyeco', audience: 'edyeco-order' });
  } catch {
    return null;
  }
}

async function loadDeliverySettings() {
  const settings = await getPublicSettings();
  return settings.delivery || {};
}

function computeDiscount(discount, subtotalCents) {
  if (!discount) return 0;
  if (discount.type === 'percent') return Math.round((subtotalCents * discount.value) / 100);
  return Math.min(discount.value, subtotalCents);
}

async function findValidDiscount(code, subtotalCents) {
  if (!code) return null;
  const { rows } = await query(
    `SELECT * FROM discount_codes WHERE code = $1 AND is_active = true`,
    [String(code).trim().toUpperCase()]
  );
  const d = rows[0];
  if (!d) throw badRequest('Code promo invalide.');
  if (d.expires_at && new Date(d.expires_at) < new Date()) throw badRequest('Ce code promo a expiré.');
  if (d.max_uses && d.used_count >= d.max_uses) throw badRequest('Ce code promo n’est plus disponible.');
  if (subtotalCents < d.min_order_cents) {
    throw badRequest(`Ce code est valable à partir de ${(d.min_order_cents / 100).toFixed(2)} € d’achat.`);
  }
  return d;
}

/** Server-side quote: prices, delivery and discounts are never trusted from the client. */
router.post('/quote', asyncHandler(async (req, res) => {
  const schema = z.object({
    deliveryMethod: z.enum(['classique', 'confort', 'retrait']).optional(),
    discountCode: z.string().trim().max(40).optional().nullable(),
  });
  const { deliveryMethod, discountCode } = schema.parse(req.body || {});
  const cart = await findCart(req);
  if (!cart) return res.json({ quote: { items: [], subtotalCents: 0, totalCents: 0 } });

  const payload = await cartPayload(cart, deliveryMethod || null);
  const delivery = await loadDeliverySettings();
  const freeShipping = delivery.freeAboveCents > 0 && payload.subtotalCents >= delivery.freeAboveCents;
  const deliveryFeeCents = freeShipping ? 0 : (delivery[deliveryMethod]?.fee_cents ?? 0);
  const discount = await findValidDiscount(discountCode, payload.subtotalCents);
  const discountCents = computeDiscount(discount, payload.subtotalCents);

  res.json({
    quote: {
      ...payload,
      deliveryFeeCents,
      discountCents,
      discountCode: discount?.code ?? null,
      discountLabel: discount ? (discount.type === 'percent' ? `-${discount.value} %` : `-${(discount.value / 100).toFixed(2)} €`) : null,
      totalCents: Math.max(0, payload.subtotalCents + deliveryFeeCents - discountCents),
      freeShipping,
    },
  });
}));

router.post('/orders', limiters.checkout, asyncHandler(async (req, res) => {
  const data = checkoutSchema.parse(req.body);
  const cart = await findCart(req);
  if (!cart) throw badRequest('Votre panier est vide.');

  const payload = await cartPayload(cart, data.deliveryMethod);
  if (!payload.items.length) throw badRequest('Votre panier est vide.');
  const unavailable = payload.items.filter((i) => !i.isActive || i.stock < i.quantity);
  if (unavailable.length) {
    throw conflict(`Stock insuffisant pour : ${unavailable.map((i) => i.name).join(', ')}.`);
  }

  const delivery = await loadDeliverySettings();
  const freeShipping = delivery.freeAboveCents > 0 && payload.subtotalCents >= delivery.freeAboveCents;
  const deliveryFeeCents = freeShipping ? 0 : delivery[data.deliveryMethod]?.fee_cents ?? 0;
  const discount = await findValidDiscount(data.discountCode, payload.subtotalCents);
  const discountCents = computeDiscount(discount, payload.subtotalCents);
  const totalCents = Math.max(0, payload.subtotalCents + deliveryFeeCents - discountCents);
  const reference = `EDY-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomInt(1000, 9999)}`;

  const result = await withTransaction(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO orders (reference, user_id, cart_id, email, customer_name, phone, shipping_address, billing_address,
         delivery_method, delivery_fee_cents, subtotal_cents, discount_cents, total_cents, discount_code,
         status, payment_method, customer_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13,'pending','simulation',$14)
       RETURNING *`,
      [
        reference, req.user?.id ?? null, cart.id, data.email, `${data.firstName} ${data.lastName}`.trim(), data.phone,
        JSON.stringify({ ...data.address, fullName: `${data.firstName} ${data.lastName}`.trim() }),
        data.deliveryMethod, deliveryFeeCents, payload.subtotalCents, discountCents, totalCents,
        discount?.code ?? null, data.customerNote,
      ]
    );
    const orderRow = rows[0];
    for (const item of payload.items) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, product_slug, name, image_url, unit_price_cents, quantity, line_total_cents)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [orderRow.id, item.productId, item.slug, item.name, item.image, item.priceCents, item.quantity, item.lineTotalCents]
      );
    }
    await db.query("UPDATE carts SET email = $1, updated_at = now() WHERE id = $2", [data.email, cart.id]);

    if (data.newsletter) {
      await db.query(
        `INSERT INTO newsletter_subscribers (email, source, first_name) VALUES ($1,'commande',$2)
         ON CONFLICT (email) DO UPDATE SET is_active = true`,
        [data.email, data.firstName]
      );
    }
    return orderRow;
  });

  const intent = payments.createIntent(result);
  const { rows: itemRows } = await query('SELECT * FROM order_items WHERE order_id = $1', [result.id]);

  res.status(201).json({
    order: serializeOrder(result, itemRows),
    payment: intent,
    orderToken: orderToken(result),
  });
}));

const paySchema = z.object({
  token: z.string().min(10),
  card: z.object({
    number: z.string().min(12).max(25),
    holder: z.string().trim().min(2).max(90),
    expiry: z.string().regex(/^\d{2}\s*\/\s*\d{2,4}$/, 'Date au format MM/AA'),
    cvc: z.string().regex(/^\d{3,4}$/, 'CVC invalide'),
  }),
  saveCard: z.boolean().optional().default(false),
});

router.post('/orders/:reference/pay', limiters.checkout, asyncHandler(async (req, res) => {
  const { token, card } = paySchema.parse(req.body);
  const claims = verifyOrderToken(token);
  if (!claims || claims.reference !== req.params.reference) {
    throw forbidden('Session de paiement invalide ou expirée. Reprenez votre commande.');
  }

  const { rows } = await query('SELECT * FROM orders WHERE id = $1 AND reference = $2', [claims.orderId, claims.reference]);
  const current = rows[0];
  if (!current) throw notFound('Commande introuvable.');
  if (current.status !== 'pending') throw conflict('Cette commande a déjà été traitée.');

  // Never persist card data. Only the provider reference is stored.
  const outcome = payments.confirm({ order: current, card });
  if (!outcome.ok) throw badRequest(outcome.error || 'Paiement refusé.');

  const paid = await withTransaction(async (db) => {
    const { rows: lockedRows } = await db.query(
      `UPDATE orders SET status = 'paid', payment_ref = $1, paid_at = now(), updated_at = now()
       WHERE id = $2 AND status = 'pending' RETURNING *`,
      [`${outcome.provider}:${outcome.reference}`, current.id]
    );
    if (!lockedRows[0]) throw conflict('Commande déjà traitée.');

    const { rows: items } = await db.query('SELECT * FROM order_items WHERE order_id = $1', [current.id]);
    for (const item of items) {
      if (!item.product_id) continue;
      const { rows: stockRows } = await db.query(
        'UPDATE products SET stock = stock - $1, updated_at = now() WHERE id = $2 AND stock >= $1 RETURNING stock',
        [item.quantity, item.product_id]
      );
      if (!stockRows[0]) {
        throw conflict(`Stock insuffisant pour ${item.name}. Contactez-nous pour un remboursement.`);
      }
    }
    if (current.discount_code) {
      await db.query('UPDATE discount_codes SET used_count = used_count + 1 WHERE code = $1', [current.discount_code]);
    }
    if (current.cart_id) {
      await db.query('DELETE FROM cart_items WHERE cart_id = $1', [current.cart_id]);
      await db.query("UPDATE carts SET status = 'converted', updated_at = now() WHERE id = $1", [current.cart_id]);
    }
    return { order: lockedRows[0], items };
  });

  sendMail({
    to: paid.order.email,
    ...orderConfirmationEmail(paid.order, paid.items),
  }).catch(() => {});

  res.json({
    order: serializeOrder(paid.order, paid.items),
    payment: { provider: outcome.provider, brand: outcome.brand, last4: outcome.last4, accepted: true },
  });
}));

router.get('/orders/:reference', asyncHandler(async (req, res) => {
  let authorized = false;
  if (req.user) {
    const { rows } = await query('SELECT user_id, email FROM orders WHERE reference = $1', [req.params.reference]);
    if (rows[0] && (rows[0].user_id === req.user.id || rows[0].email === req.user.email)) authorized = true;
  }
  if (!authorized) {
    const claims = verifyOrderToken(String(req.query.token || ''));
    if (!claims || claims.reference !== req.params.reference) {
      throw forbidden('Accès à cette commande non autorisé.');
    }
  }

  const { rows } = await query('SELECT * FROM orders WHERE reference = $1', [req.params.reference]);
  if (!rows[0]) throw notFound('Commande introuvable.');
  const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1', [rows[0].id]);
  res.json({ order: serializeOrder(rows[0], items) });
}));

export { verifyOrderToken };
export default router;
