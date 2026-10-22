import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

const bool = (v, fallback = false) => {
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};
const int = (v, fallback) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  // Fail fast: never run production with a development signing key.
  console.error('[edyeco] JWT_SECRET manquant : refuse de démarrer en production.');
  process.exit(1);
}
if (isProd && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('[edyeco] JWT_SECRET trop court (32 caractères minimum).');
  process.exit(1);
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd,
  port: int(process.env.PORT, 4000),
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  siteUrl: (process.env.SITE_URL || 'http://localhost:4000').replace(/\/$/, ''),

  // PostgreSQL: provided DATABASE_URL wins. Otherwise an embedded PGlite
  // instance (real PostgreSQL compiled to WASM) is exposed over the wire
  // protocol so the app always talks standard PostgreSQL through `pg`.
  databaseUrl: process.env.DATABASE_URL || '',
  pglite: {
    enabled: !process.env.DATABASE_URL,
    dataDir: process.env.PGLITE_DATA_DIR || path.join(ROOT, 'data', 'pglite'),
    port: int(process.env.PGLITE_PORT, 5433),
  },
  dbAutoMigrate: bool(process.env.DB_AUTO_MIGRATE, true),
  dbAutoSeed: bool(process.env.DB_AUTO_SEED, true),
  dbSsl: bool(process.env.DB_SSL, isProd && !!process.env.DATABASE_URL),

  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me-please-32chars',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  cookieName: 'edyeco_session',
  csrfCookie: 'edyeco_csrf',
  cookieSecure: bool(process.env.COOKIE_SECURE, isProd),
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  admin: {
    email: (process.env.ADMIN_EMAIL || 'admin@edyeco.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'pypython10',
    name: process.env.ADMIN_NAME || 'Administrateur EdyEco',
  },

  uploadsDir: process.env.UPLOADS_DIR || path.join(ROOT, 'uploads'),
  uploadsUrlPath: '/uploads',
  maxUploadBytes: int(process.env.MAX_UPLOAD_BYTES, 6 * 1024 * 1024),

  mail: {
    host: process.env.SMTP_HOST || '',
    port: int(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'EdyEco <contact@edyeco.fr>',
    to: process.env.MAIL_TO || 'contact@edyeco.fr',
  },

  stripe: {
    // Simulation only for now. The checkout abstraction is ready for Stripe:
    // set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET and flip PAYMENT_MODE.
    mode: process.env.PAYMENT_MODE || 'simulation',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  trustProxy: bool(process.env.TRUST_PROXY, isProd),
  seedDemoData: bool(process.env.SEED_DEMO_DATA, true),
  maintenance: bool(process.env.MAINTENANCE_MODE, false),
};

export default config;
