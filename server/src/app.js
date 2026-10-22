import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config.js';
import { loadUser } from './lib/auth.js';
import { asyncHandler, errorHandler, notFoundHandler } from './lib/http.js';
import { limiters } from './lib/limiters.js';
import { cachedSeo, renderSeoHead, injectHtml, loadIndexHtml, generateSitemap, robotsTxt } from './services/seo.js';

import catalogRoutes from './routes/catalog.js';
import authRoutes from './routes/auth.js';
import cartRoutes from './routes/cart.js';
import checkoutRoutes from './routes/checkout.js';
import accountRoutes from './routes/account.js';
import contentRoutes from './routes/content.js';
import adminRoutes from './routes/admin/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

export function createApp() {
  const app = express();
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Per-request CSP nonce, used for JSON-LD and the Vite entry script.
  app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'blob:'],
          'font-src': ["'self'", 'data:'],
          'media-src': ["'self'", 'blob:'],
          'connect-src': ["'self'"],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'self'"],
          'frame-src': ["'self'"],
          'manifest-src': ["'self'"],
          'upgrade-insecure-requests': config.isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(self), usb=()');
    next();
  });
  app.use(compression());
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || config.clientOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Requested-With'],
    })
  );
  app.use(express.json({ limit: '120kb' }));
  app.use(express.urlencoded({ extended: false, limit: '120kb' }));
  app.use(cookieParser());
  if (!config.isProd || process.env.HTTP_LOG === '1') app.use(morgan('dev'));

  // Static uploads are immutable (filenames are randomised).
  app.use(
    '/uploads',
    express.static(config.uploadsDir, {
      maxAge: '365d',
      immutable: true,
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    })
  );

  app.use(loadUser);

  /* ------------------------------- API ---------------------------------- */
  const api = express.Router();
  api.use(limiters.global);
  api.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  api.get('/health', (_req, res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()) }));
  api.use('/auth', authRoutes);
  api.use('/cart', cartRoutes);
  api.use('/checkout', checkoutRoutes);
  api.use('/account', accountRoutes);
  api.use('/', catalogRoutes);
  api.use('/', contentRoutes);
  api.use('/admin', adminRoutes);
  api.use(notFoundHandler);

  app.use('/api', api);

  /* ------------------------- SEO endpoints ------------------------------ */
  app.get(['/sitemap.xml', '/api/sitemap.xml'], asyncHandler(async (_req, res) => {
    res.type('application/xml').set('Cache-Control', 'public, max-age=1800').send(await generateSitemap());
  }));
  app.get(['/robots.txt', '/api/robots.txt'], (_req, res) => {
    res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(robotsTxt());
  });

  /* ---------------------- Static SPA + SEO injection -------------------- */
  if (fs.existsSync(clientDist)) {
    app.use(
      '/assets',
      express.static(path.join(clientDist, 'assets'), { maxAge: '1y', immutable: true })
    );
    app.use(
      express.static(clientDist, {
        index: false,
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          if (/\.(png|jpg|jpeg|webp|avif|svg|mp4|webm|woff2?)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000');
          }
        },
      })
    );

    app.get('*', asyncHandler(async (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
      const accept = req.get('accept') || '';
      if (!accept.includes('text/html')) return next();

      const template = await loadIndexHtml(clientDist);
      let meta;
      try {
        meta = await cachedSeo(req.path);
      } catch (err) {
        console.error('[seo]', err.message);
        meta = { title: 'EdyEco', description: '', canonical: `${config.siteUrl}${req.path}`, robots: 'index, follow', ogImage: `${config.siteUrl}/brand/favicon-512.png`, ogType: 'website', jsonLd: [], noscript: '' };
      }
      const head = renderSeoHead(meta, res.locals.nonce);
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.type('html').send(injectHtml(template, { head, noscript: meta.noscript, nonce: res.locals.nonce }));
    }));
  } else {
    app.get('/', (_req, res) =>
      res
        .status(200)
        .type('html')
        .send('<h1>EdyEco API</h1><p>Le client n’est pas compilé. Lancez <code>npm run build</code> puis redémarrez, ou utilisez <code>npm run dev</code>.</p>')
    );
  }

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}

export default createApp;
