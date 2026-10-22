import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { asyncHandler, notFound, badRequest } from '../lib/http.js';
import config from '../config.js';
import { getPublicSettings } from './catalog.js';

const router = Router();
const CART_COOKIE = 'edyeco_cart';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.cookieSecure,
  path: '/',
  maxAge: 30 * 24 * 3600 * 1000,
};

async function findCart(req) {
  const id = req.cookies?.[CART_COOKIE];
  if (id && /^[0-9a-f-]{36}$/i.test(id)) {
    const { rows } = await query('SELECT * FROM carts WHERE id = $1', [id]);
    if (rows[0] && rows[0].status !== 'converted') return rows[0];
  }
  if (req.user) {
    const { rows } = await query(
      `SELECT * FROM carts WHERE user_id = $1 AND status = 'active' ORDER BY last_activity_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (rows[0]) return rows[0];
  }
  return null;
}

export async function getOrCreateCart(req, res) {
  let cart = await findCart(req);
  if (!cart) {
    const { rows } = await query(
      'INSERT INTO carts (user_id, email) VALUES ($1,$2) RETURNING *',
      [req.user?.id ?? null, req.user?.email ?? null]
    );
    cart = rows[0];
  }
  if (res) res.cookie(CART_COOKIE, cart.id, cookieOptions);
  return cart;
}

/** Called on login/register: attach guest cart to the account, merging if needed. */
export async function mergeGuestCart(req, userId) {
  const guestId = req.cookies?.[CART_COOKIE];
  if (!guestId) return;
  const { rows: guestRows } = await query('SELECT * FROM carts WHERE id = $1', [guestId]);
  const guest = guestRows[0];
  if (!guest || guest.user_id === userId) return;

  const { rows: userCarts } = await query(
    "SELECT * FROM carts WHERE user_id = $1 AND status = 'active' ORDER BY last_activity_at DESC LIMIT 1",
    [userId]
  );
  const userCart = userCarts[0];

  if (!userCart) {
    await query('UPDATE carts SET user_id = $1, email = $2 WHERE id = $3', [userId, req.user?.email ?? guest.email, guest.id]);
    return;
  }
  await withTransaction(async (db) => {
    const { rows: items } = await db.query('SELECT * FROM cart_items WHERE cart_id = $1', [guest.id]);
    for (const item of items) {
      await db.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1,$2,$3)
         ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = LEAST(50, cart_items.quantity + EXCLUDED.quantity)`,
        [userCart.id, item.product_id, item.quantity]
      );
    }
    await db.query("UPDATE carts SET status = 'converted' WHERE id = $1", [guest.id]);
    await db.query('UPDATE carts SET updated_at = now(), last_activity_at = now() WHERE id = $1', [userCart.id]);
  });
}

async function cartPayload(cart, deliveryMethod = null) {
  const { rows } = await query(
    `SELECT ci.product_id, ci.quantity, p.name, p.slug, p.price_cents, p.image_url, p.stock, p.unit, p.short_description, p.is_active
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = $1 ORDER BY ci.id`,
    [cart.id]
  );
  const items = rows.map((r) => ({
    productId: r.product_id,
    slug: r.slug,
    name: r.name,
    priceCents: r.price_cents,
    price: r.price_cents / 100,
    quantity: r.quantity,
    lineTotalCents: r.price_cents * r.quantity,
    image: r.image_url,
    stock: r.stock,
    unit: r.unit,
    shortDescription: r.short_description,
    isActive: r.is_active,
  }));

  const settings = await getPublicSettings();
  const delivery = settings.delivery || {};
  const subtotalCents = items.reduce((s, i) => s + (i.isActive ? i.lineTotalCents : 0), 0);
  const method = deliveryMethod || null;
  let deliveryFeeCents = 0;
  if (method && delivery[method]) deliveryFeeCents = delivery[method].fee_cents;
  const freeAbove = delivery.freeAboveCents || 0;
  const freeShipping = freeAbove > 0 && subtotalCents >= freeAbove;

  return {
    id: cart.id,
    items,
    subtotalCents,
    subtotal: subtotalCents / 100,
    deliveryFeeCents: freeShipping ? 0 : deliveryFeeCents,
    deliveryMethod: method,
    freeShipping,
    freeAboveCents: freeAbove,
    totalCents: subtotalCents + (freeShipping ? 0 : deliveryFeeCents),
    deliveryOptions: delivery,
    count: items.reduce((s, i) => s + i.quantity, 0),
  };
}

router.get('/', asyncHandler(async (req, res) => {
  const cart = await findCart(req);
  if (!cart) {
    return res.json({
      cart: { id: null, items: [], subtotalCents: 0, count: 0, deliveryOptions: (await getPublicSettings()).delivery },
    });
  }
  res.cookie(CART_COOKIE, cart.id, cookieOptions);
  res.json({ cart: await cartPayload(cart, req.query.deliveryMethod) });
}));

const addSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
});

router.post('/items', asyncHandler(async (req, res) => {
  const { productId, quantity } = addSchema.parse(req.body);
  const { rows: productRows } = await query('SELECT id, stock, is_active FROM products WHERE id = $1', [productId]);
  const product = productRows[0];
  if (!product || !product.is_active) throw notFound('Produit introuvable.');
  if (product.stock < 1) throw badRequest('Ce produit est momentanément épuisé.');

  const cart = await getOrCreateCart(req, res);
  const requested = Math.min(quantity, product.stock);
  await query(
    `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1,$2,$3)
     ON CONFLICT (cart_id, product_id)
     DO UPDATE SET quantity = LEAST(50, cart_items.quantity + EXCLUDED.quantity)`,
    [cart.id, productId, requested]
  );
  await query('UPDATE carts SET last_activity_at = now(), updated_at = now(), status = \'active\' WHERE id = $1', [cart.id]);
  res.status(201).json({ cart: await cartPayload(cart) });
}));

const updateSchema = z.object({ quantity: z.coerce.number().int().min(0).max(50) });

router.patch('/items/:productId', asyncHandler(async (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const { quantity } = updateSchema.parse(req.body);
  const cart = await findCart(req);
  if (!cart) throw notFound('Panier introuvable.');
  if (quantity === 0) {
    await query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cart.id, productId]);
  } else {
    const { rows } = await query('SELECT stock FROM products WHERE id = $1', [productId]);
    if (!rows[0]) throw notFound('Produit introuvable.');
    await query(
      'UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND product_id = $3',
      [Math.min(quantity, rows[0].stock, 50), cart.id, productId]
    );
  }
  await query('UPDATE carts SET last_activity_at = now(), updated_at = now() WHERE id = $1', [cart.id]);
  res.json({ cart: await cartPayload(cart) });
}));

router.delete('/items/:productId', asyncHandler(async (req, res) => {
  const cart = await findCart(req);
  if (!cart) return res.json({ cart: { id: null, items: [], subtotalCents: 0, count: 0 } });
  await query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cart.id, Number.parseInt(req.params.productId, 10)]);
  await query('UPDATE carts SET last_activity_at = now(), updated_at = now() WHERE id = $1', [cart.id]);
  res.json({ cart: await cartPayload(cart) });
}));

router.delete('/', asyncHandler(async (req, res) => {
  const cart = await findCart(req);
  if (cart) {
    await query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
    await query('UPDATE carts SET last_activity_at = now(), updated_at = now() WHERE id = $1', [cart.id]);
  }
  res.json({ cart: { id: cart?.id ?? null, items: [], subtotalCents: 0, count: 0 } });
}));

// Email capture: powers abandoned-cart recovery without forcing an account.
const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(180) });
router.post('/email', asyncHandler(async (req, res) => {
  const { email } = emailSchema.parse(req.body);
  const cart = await getOrCreateCart(req, res);
  await query('UPDATE carts SET email = $1, updated_at = now() WHERE id = $2', [email, cart.id]);
  res.json({ ok: true });
}));

export { cartPayload, findCart, CART_COOKIE };
export default router;
