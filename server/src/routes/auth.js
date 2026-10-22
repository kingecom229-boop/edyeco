import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { asyncHandler, badRequest, unauthorized, conflict } from '../lib/http.js';
import { signToken, setAuthCookies, clearAuthCookies, publicUser, requireAuth, csrfProtection } from '../lib/auth.js';
import { limiters } from '../lib/limiters.js';
import { sendMail } from '../lib/mailer.js';
import config from '../config.js';
import { mergeGuestCart } from './cart.js';

const router = Router();

const emailSchema = z.string().trim().toLowerCase().email('Adresse email invalide').max(180);
const passwordSchema = z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(128);
// Deliberately light on rules, strong on length — and never leaked back.
const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'Prénom requis').max(60),
  lastName: z.string().trim().max(60).optional().default(''),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().max(30).optional().default(''),
  newsletter: z.boolean().optional().default(false),
});

router.post('/register', limiters.register, asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const hash = await bcrypt.hash(data.password, 12);

  const user = await withTransaction(async (db) => {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows[0]) throw conflict('Un compte existe déjà avec cette adresse email.');
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, email_opt_in)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, email, first_name, last_name, phone, role, email_opt_in, created_at`,
      [data.email, hash, data.firstName, data.lastName, data.phone, data.newsletter]
    );
    if (data.newsletter) {
      await db.query(
        `INSERT INTO newsletter_subscribers (email, source, first_name)
         VALUES ($1,'inscription',$2) ON CONFLICT (email) DO UPDATE SET is_active = true`,
        [data.email, data.firstName]
      );
    }
    return rows[0];
  });

  await mergeGuestCart(req, user.id);
  setAuthCookies(res, signToken(user));
  res.status(201).json({ user: publicUser(user) });
}));

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

router.post('/login', limiters.auth, asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  // Constant-ish time behaviour: always compare against a hash.
  const hash = user?.password_hash || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) throw unauthorized('Email ou mot de passe incorrect.');

  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  await mergeGuestCart(req, user.id);
  setAuthCookies(res, signToken(user));
  res.json({ user: publicUser(user) });
}));

router.post('/logout', csrfProtection, requireAuth, asyncHandler(async (_req, res) => {
  clearAuthCookies(res);
  res.json({ message: 'Déconnecté.' });
}));

router.get('/me', asyncHandler(async (req, res) => {
  res.json({
    user: publicUser(req.user),
    csrfToken: req.cookies?.[config.csrfCookie] || null,
  });
}));

const forgotSchema = z.object({ email: emailSchema });

router.post('/forgot-password', limiters.passwordReset, asyncHandler(async (req, res) => {
  const { email } = forgotSchema.parse(req.body);
  const { rows } = await query('SELECT id, first_name FROM users WHERE email = $1', [email]);
  // Always answer 200: no account enumeration.
  if (rows[0]) {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1,$2, now() + interval \'1 hour\')',
      [rows[0].id, hash]
    );
    const link = `${config.siteUrl}/reinitialiser-mot-de-passe?token=${token}`;
    await sendMail({
      to: email,
      subject: 'Réinitialisation de votre mot de passe EdyEco',
      text: `Bonjour ${rows[0].first_name || ''},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    });
  }
  res.json({ message: 'Si un compte existe avec cet email, un lien de réinitialisation vient d’être envoyé.' });
}));

const resetSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });

router.post('/reset-password', limiters.passwordReset, asyncHandler(async (req, res) => {
  const { token, password } = resetSchema.parse(req.body);
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const { rows } = await query(
    `SELECT id, user_id FROM password_resets
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [hash]
  );
  const reset = rows[0];
  if (!reset) throw badRequest('Ce lien est invalide ou expiré. Demandez-en un nouveau.');

  const passwordHash = await bcrypt.hash(password, 12);
  await withTransaction(async (db) => {
    await db.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, reset.user_id]);
    await db.query('UPDATE password_resets SET used_at = now() WHERE id = $1', [reset.id]);
    await db.query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [reset.user_id]);
  });
  clearAuthCookies(res);
  res.json({ message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' });
}));

export default router;
