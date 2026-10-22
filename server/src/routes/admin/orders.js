import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../../db/pool.js';
import { asyncHandler, notFound, conflict, badRequest } from '../../lib/http.js';
import { parsePagination, toCsv, logAudit } from '../../lib/utils.js';
import { order as serializeOrder } from '../../lib/serialize.js';
import { abandonedCartEmail, sendMail } from '../../lib/mailer.js';
import config from '../../config.js';

const router = Router();

const ORDER_STATUSES = ['pending', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled', 'refunded'];

router.get('/stats', asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(7, Number.parseInt(req.query.days ?? '30', 10) || 30));
  const paidStatuses = "('paid','in_production','shipped','delivered')";

  const [kpi, productCounts, series, top, statuses, carts, recent, stock, visits, subscribers, customers] = await Promise.all([
    query(`SELECT
        COALESCE(SUM(total_cents) FILTER (WHERE status IN ${paidStatuses}),0)::int AS revenue_cents,
        COUNT(*) FILTER (WHERE status IN ${paidStatuses})::int AS paid_orders,
        COUNT(*)::int AS total_orders,
        COALESCE(ROUND(AVG(total_cents) FILTER (WHERE status IN ${paidStatuses})),0)::int AS aov_cents,
        COALESCE(SUM(total_cents) FILTER (WHERE status IN ${paidStatuses} AND created_at > now() - ($1 || ' days')::interval),0)::int AS revenue_period,
        COUNT(*) FILTER (WHERE status IN ${paidStatuses} AND created_at > now() - ($1 || ' days')::interval)::int AS orders_period,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
      FROM orders`, [String(days)]),
    query(`SELECT COUNT(*) FILTER (WHERE is_active)::int AS active, COUNT(*) FILTER (WHERE is_active AND stock <= 10)::int AS low FROM products`),
    query(`SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(o.total_cents) FILTER (WHERE o.status IN ${paidStatuses}),0)::int AS revenue_cents,
        COUNT(o.id) FILTER (WHERE o.status IN ${paidStatuses})::int AS orders
      FROM generate_series(current_date - ($1::int - 1), current_date, '1 day') AS d(day)
      LEFT JOIN orders o ON date_trunc('day', o.created_at) = d.day
      GROUP BY d.day ORDER BY d.day`, [days]),
    query(`SELECT p.name, p.slug, SUM(oi.quantity)::int AS quantity, SUM(oi.line_total_cents)::int AS revenue_cents
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.status IN ${paidStatuses} AND o.created_at > now() - ($1 || ' days')::interval
      GROUP BY p.id, p.name, p.slug ORDER BY revenue_cents DESC LIMIT 5`, [String(days)]),
    query('SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_cents),0)::int AS value_cents FROM orders GROUP BY status'),
    query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(s.total),0)::int AS value_cents FROM (
        SELECT c.id, COALESCE(SUM(ci.quantity * p.price_cents),0) AS total FROM carts c
        JOIN cart_items ci ON ci.cart_id = c.id JOIN products p ON p.id = ci.product_id
        WHERE c.status = 'abandoned' OR (c.status = 'active' AND c.last_activity_at < now() - interval '45 minutes')
        GROUP BY c.id) s`),
    query(`SELECT id, reference, customer_name, total_cents, status, created_at FROM orders ORDER BY created_at DESC LIMIT 6`),
    query(`SELECT id, name, stock, image_url FROM products WHERE is_active = true AND stock <= 10 ORDER BY stock ASC LIMIT 8`),
    query(`SELECT COUNT(*)::int AS count FROM analytics_events WHERE created_at > now() - ($1 || ' days')::interval`, [String(days)]),
    query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active FROM newsletter_subscribers`),
    query('SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at > now() - interval \'30 days\')::int AS recent FROM users WHERE role = \'customer\''),
  ]);

  const k = kpi.rows[0];
  const visitsCount = visits.rows[0].count;
  res.json({
    kpi: {
      revenueCents: k.revenue_cents,
      revenuePeriodCents: k.revenue_period,
      paidOrders: k.paid_orders,
      ordersPeriod: k.orders_period,
      totalOrders: k.total_orders,
      aovCents: k.aov_cents,
      pendingOrders: k.pending,
      conversionRate: visitsCount ? Math.round((k.orders_period / visitsCount) * 10000) / 100 : null,
      abandonedCarts: carts.rows[0].count,
      abandonedValueCents: carts.rows[0].value_cents,
      subscribersTotal: subscribers.rows[0].total,
      subscribersActive: subscribers.rows[0].active,
      customersTotal: customers.rows[0].total,
      customersRecent: customers.rows[0].recent,
      productsActive: productCounts.rows[0].active,
      productsLow: productCounts.rows[0].low,
    },
    series: series.rows,
    topProducts: top.rows,
    statuses: statuses.rows,
    recentOrders: recent.rows,
    lowStock: stock.rows,
    periodDays: days,
  });
}));

router.get('/orders', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
  const { status, q } = req.query;
  const where = ['1=1'];
  const params = [];
  if (status && ORDER_STATUSES.includes(String(status))) {
    params.push(String(status));
    where.push(`status = $${params.length}`);
  }
  if (q) {
    params.push(`%${String(q).toLowerCase()}%`);
    where.push(`(lower(reference) LIKE $${params.length} OR lower(email) LIKE $${params.length} OR lower(customer_name) LIKE $${params.length})`);
  }
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT * FROM orders WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: count } = await query(`SELECT COUNT(*)::int AS total FROM orders WHERE ${where.join(' AND ')}`, params.slice(0, -2));
  const enriched = [];
  for (const row of rows) {
    const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1', [row.id]);
    enriched.push(serializeOrder(row, items));
  }
  res.json({ orders: enriched, pagination: { page, limit, total: count[0].total, pages: Math.ceil(count[0].total / limit) } });
}));

router.get('/orders/export', asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT * FROM orders ORDER BY created_at DESC');
  const csv = toCsv(rows, [
    { label: 'reference', key: 'reference' },
    { label: 'date', value: (r) => new Date(r.created_at).toISOString() },
    { label: 'client', key: 'customer_name' },
    { label: 'email', key: 'email' },
    { label: 'telephone', key: 'phone' },
    { label: 'statut', key: 'status' },
    { label: 'sous_total_eur', value: (r) => (r.subtotal_cents / 100).toFixed(2) },
    { label: 'livraison_eur', value: (r) => (r.delivery_fee_cents / 100).toFixed(2) },
    { label: 'total_eur', value: (r) => (r.total_cents / 100).toFixed(2) },
    { label: 'code_promo', key: 'discount_code' },
  ]);
  res.attachment('edyeco-commandes.csv').type('text/csv').send(csv);
}));

async function getOrder(id) {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1', [Number.parseInt(id, 10)]);
  if (!rows[0]) throw notFound('Commande introuvable.');
  const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1', [rows[0].id]);
  return { row: rows[0], items };
}

router.get('/orders/:id', asyncHandler(async (req, res) => {
  const { row, items } = await getOrder(req.params.id);
  res.json({ order: serializeOrder(row, items) });
}));

const patchSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  adminNote: z.string().trim().max(2000).optional(),
});

router.patch('/orders/:id', asyncHandler(async (req, res) => {
  const data = patchSchema.parse(req.body);
  const { row } = await getOrder(req.params.id);
  const nextStatus = data.status ?? row.status;
  if (row.status === 'refunded' && nextStatus !== 'refunded') throw badRequest('Une commande remboursée ne peut plus changer de statut.');

  const updated = await withTransaction(async (db) => {
    // Stock is decremented once, when the order first becomes paid.
    const wasPaid = ['paid', 'in_production', 'shipped', 'delivered'].includes(row.status);
    const isPaid = ['paid', 'in_production', 'shipped', 'delivered'].includes(nextStatus);
    if (!wasPaid && isPaid && row.status === 'pending') {
      const { rows: items } = await db.query('SELECT * FROM order_items WHERE order_id = $1', [row.id]);
      for (const item of items) {
        if (!item.product_id) continue;
        const { rows: stockRows } = await db.query(
          'UPDATE products SET stock = stock - $1, updated_at = now() WHERE id = $2 AND stock >= $1 RETURNING stock',
          [item.quantity, item.product_id]
        );
        if (!stockRows[0]) throw conflict(`Stock insuffisant pour ${item.name}.`);
      }
    }
    if (isPaid && !wasPaid) {
      await db.query("UPDATE orders SET paid_at = COALESCE(paid_at, now()) WHERE id = $1", [row.id]);
    }
    if (nextStatus === 'refunded' && row.status !== 'refunded') {
      const { rows: items } = await db.query('SELECT * FROM order_items WHERE order_id = $1', [row.id]);
      for (const item of items) {
        if (!item.product_id) continue;
        await db.query('UPDATE products SET stock = stock + $1, updated_at = now() WHERE id = $2', [item.quantity, item.product_id]);
      }
    }
    const { rows } = await db.query(
      `UPDATE orders SET status = $1, tracking_number = $2, admin_note = $3, updated_at = now() WHERE id = $4 RETURNING *`,
      [nextStatus, data.trackingNumber ?? row.tracking_number, data.adminNote ?? row.admin_note, row.id]
    );
    return rows[0];
  });

  await logAudit(req, 'order.update', 'order', row.id, { from: row.status, to: nextStatus });
  const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1', [row.id]);
  res.json({ order: serializeOrder(updated, items) });
}));

router.get('/orders/:id/invoice', asyncHandler(async (req, res) => {
  const { row, items } = await getOrder(req.params.id);
  const { rows: settings } = await query("SELECT value FROM settings WHERE key = 'store'");
  const store = settings[0]?.value || {};
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const addr = row.shipping_address || {};
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Facture ${esc(row.reference)}</title>
  <style>
    body{font-family:system-ui,sans-serif;color:#1f2937;max-width:760px;margin:40px auto;padding:0 24px}
    h1{font-size:22px;margin:0} .muted{color:#6b7280;font-size:13px}
    .head{display:flex;justify-content:space-between;border-bottom:3px solid #1f7a3f;padding-bottom:16px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;margin:24px 0} th,td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:14px}
    th{background:#f3f7f2} .totals{margin-left:auto;width:280px} .totals td{border:none;padding:6px 10px}
    .totals .grand{font-weight:700;font-size:16px;border-top:2px solid #1f7a3f}
    @media print{body{margin:0}}
  </style></head><body>
  <div class="head"><div><h1>${esc(store.legalName || 'EdyEco')}</h1><p class="muted">${esc(store.address || '')}<br>${esc(store.email || '')} — ${esc(store.phone || '')}<br>${esc(store.siret || '')} · ${esc(store.vat || '')}</p></div>
  <div style="text-align:right"><h1>Facture</h1><p class="muted">${esc(row.reference)}<br>${new Date(row.created_at).toLocaleDateString('fr-FR')}<br>Statut : ${esc(row.status)}</p></div></div>
  <p><strong>${esc(row.customer_name)}</strong><br>${esc(row.email)}<br>${esc(addr.line1 || '')}${addr.line2 ? `<br>${esc(addr.line2)}` : ''}<br>${esc(addr.postal_code || '')} ${esc(addr.city || '')}</p>
  <table><thead><tr><th>Produit</th><th>Qté</th><th>PU</th><th>Total</th></tr></thead><tbody>
  ${items.map((i) => `<tr><td>${esc(i.name)}</td><td>${i.quantity}</td><td>${(i.unit_price_cents / 100).toFixed(2)} €</td><td>${(i.line_total_cents / 100).toFixed(2)} €</td></tr>`).join('')}
  </tbody></table>
  <table class="totals">
    <tr><td>Sous-total</td><td style="text-align:right">${(row.subtotal_cents / 100).toFixed(2)} €</td></tr>
    <tr><td>Livraison (${esc(row.delivery_method)})</td><td style="text-align:right">${(row.delivery_fee_cents / 100).toFixed(2)} €</td></tr>
    ${row.discount_cents ? `<tr><td>Remise ${esc(row.discount_code || '')}</td><td style="text-align:right">-${(row.discount_cents / 100).toFixed(2)} €</td></tr>` : ''}
    <tr class="grand"><td>Total TTC</td><td style="text-align:right">${(row.total_cents / 100).toFixed(2)} €</td></tr>
  </table>
  <p class="muted">TVA non applicable, art. 293 B du CGI — document généré automatiquement.</p>
  <script>window.print && setTimeout(() => window.print(), 400);</script>
  </body></html>`;
  res.type('html').send(html);
}));

/* ------------------------------- Clients -------------------------------- */
router.get('/customers', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req, { defaultLimit: 25, maxLimit: 100 });
  const q = String(req.query.q || '').trim().toLowerCase();
  const like = `%${q}%`;
  const params = [];
  let where = "u.role = 'customer'";
  if (q) {
    params.push(like);
    where += ` AND (lower(u.email) LIKE $1 OR lower(u.first_name || ' ' || u.last_name) LIKE $1)`;
  }
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.email_opt_in, u.created_at, u.last_login_at,
       COUNT(o.id)::int AS orders_count,
       COALESCE(SUM(o.total_cents) FILTER (WHERE o.status IN ('paid','in_production','shipped','delivered')),0)::int AS spent_cents,
       MAX(o.created_at) AS last_order_at
     FROM users u LEFT JOIN orders o ON o.user_id = u.id
     WHERE ${where} GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: count } = await query(`SELECT COUNT(*)::int AS total FROM users u WHERE ${where}`, params.slice(0, -2));
  res.json({
    customers: rows.map((u) => ({
      id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, phone: u.phone,
      emailOptIn: u.email_opt_in, createdAt: u.created_at, lastLoginAt: u.last_login_at,
      ordersCount: u.orders_count, spentCents: u.spent_cents, lastOrderAt: u.last_order_at,
    })),
    pagination: { page, limit, total: count[0].total, pages: Math.ceil(count[0].total / limit) },
  });
}));

router.get('/customers/export', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT u.*, COUNT(o.id)::int AS orders_count, COALESCE(SUM(o.total_cents),0)::int AS spent_cents
     FROM users u LEFT JOIN orders o ON o.user_id = u.id WHERE u.role = 'customer' GROUP BY u.id ORDER BY u.created_at DESC`
  );
  const csv = toCsv(rows, [
    { label: 'email', key: 'email' },
    { label: 'prenom', key: 'first_name' },
    { label: 'nom', key: 'last_name' },
    { label: 'telephone', key: 'phone' },
    { label: 'opt_in_newsletter', key: 'email_opt_in' },
    { label: 'commandes', key: 'orders_count' },
    { label: 'depense_eur', value: (r) => (r.spent_cents / 100).toFixed(2) },
    { label: 'inscription', value: (r) => new Date(r.created_at).toISOString() },
  ]);
  res.attachment('edyeco-clients.csv').type('text/csv').send(csv);
}));

router.get('/customers/:id', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { rows } = await query(
    `SELECT id, email, first_name, last_name, phone, email_opt_in, created_at, last_login_at
     FROM users WHERE id = $1 AND role = 'customer'`,
    [id]
  );
  if (!rows[0]) throw notFound('Client introuvable.');
  const { rows: orders } = await query('SELECT * FROM orders WHERE user_id = $1 OR email = $2 ORDER BY created_at DESC', [id, rows[0].email]);
  res.json({
    customer: {
      id: rows[0].id, email: rows[0].email, firstName: rows[0].first_name, lastName: rows[0].last_name,
      phone: rows[0].phone, emailOptIn: rows[0].email_opt_in, createdAt: rows[0].created_at, lastLoginAt: rows[0].last_login_at,
    },
    orders: orders.map((o) => serializeOrder(o, [])),
  });
}));

/* --------------------------- Paniers abandonnés -------------------------- */
router.get('/carts/abandoned', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req, { defaultLimit: 25, maxLimit: 100 });
  const base = `FROM carts c
    JOIN cart_items ci ON ci.cart_id = c.id
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.status IN ('active','abandoned') AND c.last_activity_at < now() - interval '45 minutes'`;
  const { rows } = await query(
    `SELECT c.id, c.email, c.recovery_token, c.status, c.last_activity_at,
       u.first_name, u.last_name, u.email AS user_email,
       json_agg(json_build_object('name', p.name, 'slug', p.slug, 'quantity', ci.quantity,
         'priceCents', p.price_cents, 'image', p.image_url)) AS items,
       SUM(ci.quantity * p.price_cents)::int AS value_cents
     ${base} GROUP BY c.id, u.first_name, u.last_name, u.email
     ORDER BY value_cents DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const { rows: count } = await query(`SELECT COUNT(DISTINCT c.id)::int AS total ${base}`);
  const { rows: totals } = await query(
    `SELECT COALESCE(SUM(s.total),0)::int AS value_cents FROM (
      SELECT SUM(ci.quantity * p.price_cents) AS total ${base} GROUP BY c.id) s`
  );
  res.json({
    carts: rows.map((c) => ({
      id: c.id,
      email: c.email || c.user_email,
      name: [c.first_name, c.last_name].filter(Boolean).join(' '),
      status: c.status,
      lastActivityAt: c.last_activity_at,
      items: c.items,
      valueCents: c.value_cents,
      recoveryUrl: `${config.siteUrl}/panier?recover=${c.recovery_token}`,
    })),
    totalValueCents: totals[0].value_cents,
    pagination: { page, limit, total: count[0].total, pages: Math.ceil(count[0].total / limit) },
  });
}));

router.post('/carts/:id/recover', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT c.*, u.email AS user_email FROM carts c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
    [req.params.id]
  );
  const cart = rows[0];
  if (!cart) throw notFound('Panier introuvable.');
  const email = cart.email || cart.user_email;
  if (!email) throw badRequest('Aucun email associé à ce panier.');
  const { rows: items } = await query(
    `SELECT p.* FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.cart_id = $1`,
    [cart.id]
  );
  await query("UPDATE carts SET recovery_sent_at = now(), status = 'abandoned' WHERE id = $1", [cart.id]);
  const result = await sendMail({ to: email, ...abandonedCartEmail(cart, items) });
  await logAudit(req, 'cart.recover_email', 'cart', cart.id, { email });
  res.json({ message: result.simulated ? 'Email de relance simulé (SMTP non configuré).' : 'Email de relance envoyé.' });
}));

router.patch('/carts/:id', asyncHandler(async (req, res) => {
  const schema = z.object({ status: z.enum(['active', 'abandoned', 'converted']) });
  const { status } = schema.parse(req.body);
  const { rowCount } = await query('UPDATE carts SET status = $1, updated_at = now() WHERE id = $2', [status, req.params.id]);
  if (!rowCount) throw notFound('Panier introuvable.');
  res.json({ message: 'Panier mis à jour.' });
}));

router.delete('/carts/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM carts WHERE id = $1', [req.params.id]);
  if (!rowCount) throw notFound('Panier introuvable.');
  res.json({ message: 'Panier supprimé.' });
}));

export default router;
