import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { asyncHandler, badRequest, notFound, unauthorized } from '../lib/http.js';
import { requireAuth, publicUser, clearAuthCookies, csrfProtection } from '../lib/auth.js';
import { order as serializeOrder } from '../lib/serialize.js';
import { parsePagination } from '../lib/utils.js';

const router = Router();
router.use(csrfProtection, requireAuth);

router.get('/orders', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req, { defaultLimit: 10, maxLimit: 30 });
  const { rows } = await query(
    'SELECT * FROM orders WHERE user_id = $1 OR email = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4',
    [req.user.id, req.user.email, limit, offset]
  );
  const { rows: count } = await query('SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1 OR email = $2', [req.user.id, req.user.email]);
  const orders = [];
  for (const row of rows) {
    const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1', [row.id]);
    orders.push(serializeOrder(row, items));
  }
  res.json({ orders, pagination: { page, limit, total: count[0].total, pages: Math.ceil(count[0].total / limit) } });
}));

router.get('/orders/:reference', asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM orders WHERE reference = $1 AND (user_id = $2 OR email = $3)',
    [req.params.reference, req.user.id, req.user.email]
  );
  if (!rows[0]) throw notFound('Commande introuvable.');
  const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1', [rows[0].id]);
  res.json({ order: serializeOrder(rows[0], items) });
}));

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).default(''),
  phone: z.string().trim().max(30).default(''),
  emailOptIn: z.boolean().default(false),
});

router.patch('/profile', asyncHandler(async (req, res) => {
  const data = profileSchema.parse(req.body);
  const { rows } = await query(
    `UPDATE users SET first_name = $1, last_name = $2, phone = $3, email_opt_in = $4, updated_at = now()
     WHERE id = $5 RETURNING id, email, first_name, last_name, phone, role, email_opt_in, created_at`,
    [data.firstName, data.lastName, data.phone, data.emailOptIn, req.user.id]
  );
  if (data.emailOptIn) {
    await query(
      `INSERT INTO newsletter_subscribers (email, source, first_name) VALUES ($1,'compte',$2)
       ON CONFLICT (email) DO UPDATE SET is_active = true`,
      [req.user.email, data.firstName]
    );
  } else {
    await query('UPDATE newsletter_subscribers SET is_active = false WHERE email = $1', [req.user.email]);
  }
  res.json({ user: publicUser(rows[0]) });
}));

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8, '8 caractères minimum').max(128),
});

router.post('/password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = passwordSchema.parse(req.body);
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!ok) throw unauthorized('Mot de passe actuel incorrect.');
  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, req.user.id]);
  res.json({ message: 'Mot de passe modifié.' });
}));

// RGPD : suppression de compte avec anonymisation des commandes (obligation comptable).
router.delete('/', asyncHandler(async (req, res) => {
  const schema = z.object({ confirm: z.literal(true) });
  schema.parse(req.body || {});
  if (req.user.role === 'admin') throw badRequest('Un administrateur ne peut pas supprimer son compte ici.');
  await withTransaction(async (db) => {
    await db.query(
      `UPDATE orders SET user_id = NULL, email = 'anonyme@edyeco.fr', customer_name = 'Client supprimé',
         phone = '', shipping_address = '{}'::jsonb WHERE user_id = $1`,
      [req.user.id]
    );
    await db.query('UPDATE newsletter_subscribers SET is_active = false WHERE email = $1', [req.user.email]);
    await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
  });
  clearAuthCookies(res);
  res.json({ message: 'Compte supprimé.' });
}));

export default router;
