import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import config from '../config.js';
import { query } from '../db/pool.js';
import { unauthorized, forbidden } from './http.js';

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.cookieSecure,
  path: '/',
  ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
};

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpires,
    issuer: 'edyeco',
    audience: 'edyeco-web',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { issuer: 'edyeco', audience: 'edyeco-web' });
}

export function setAuthCookies(res, token) {
  const csrf = crypto.randomBytes(24).toString('hex');
  res.cookie(config.cookieName, token, { ...COOKIE_BASE, maxAge: 7 * 24 * 3600 * 1000 });
  // Double-submit CSRF token: readable by JS, checked against the header.
  res.cookie(config.csrfCookie, csrf, {
    ...COOKIE_BASE,
    httpOnly: false,
    maxAge: 7 * 24 * 3600 * 1000,
  });
  return csrf;
}

export function clearAuthCookies(res) {
  res.clearCookie(config.cookieName, COOKIE_BASE);
  res.clearCookie(config.csrfCookie, { ...COOKIE_BASE, httpOnly: false });
}

/** Attach req.user when a valid session cookie is present (never throws). */
export async function loadUser(req, _res, next) {
  const token = req.cookies?.[config.cookieName];
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const { rows } = await query(
      'SELECT id, email, first_name, last_name, phone, role, email_opt_in, created_at FROM users WHERE id = $1',
      [payload.sub]
    );
    if (rows[0]) req.user = rows[0];
  } catch {
    /* invalid or expired token: treated as anonymous */
  }
  next();
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized('Connectez-vous pour continuer.'));
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(unauthorized('Connectez-vous pour continuer.'));
  if (req.user.role !== 'admin') return next(forbidden('Espace réservé à l’administration.'));
  next();
}

/** CSRF double-submit check for state-changing requests. */
export function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookieToken = req.cookies?.[config.csrfCookie];
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) {
    return next(forbidden('Jeton CSRF invalide. Rechargez la page.'));
  }
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (!crypto.timingSafeEqual(a, b)) {
    return next(forbidden('Jeton CSRF invalide. Rechargez la page.'));
  }
  next();
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    role: user.role,
    emailOptIn: user.email_opt_in,
    createdAt: user.created_at,
  };
}
