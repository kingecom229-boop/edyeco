import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asyncHandler, notFound, badRequest } from '../lib/http.js';
import { parsePagination } from '../lib/utils.js';
import { blogPost } from '../lib/serialize.js';
import { limiters } from '../lib/limiters.js';
import { sendMail } from '../lib/mailer.js';
import config from '../config.js';
import { renderMarkdown } from '../lib/markdown.js';

const router = Router();

/* ------------------------------- Blog ---------------------------------- */
router.get('/blog', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req, { defaultLimit: 9, maxLimit: 30 });
  const { category, q } = req.query;
  const where = ["status = 'published'"];
  const params = [];
  if (category) {
    params.push(String(category));
    where.push(`category = $${params.length}`);
  }
  if (q) {
    params.push(`%${String(q).toLowerCase()}%`);
    where.push(`(lower(title) LIKE $${params.length} OR lower(excerpt) LIKE $${params.length})`);
  }
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT * FROM blog_posts WHERE ${where.join(' AND ')} ORDER BY published_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: count } = await query(`SELECT COUNT(*)::int AS total FROM blog_posts WHERE ${where.join(' AND ')}`, params.slice(0, -2));
  const { rows: categories } = await query(
    `SELECT category, COUNT(*)::int AS count FROM blog_posts WHERE status = 'published' GROUP BY category ORDER BY count DESC`
  );
  res.json({
    posts: rows.map((p) => blogPost(p, { withContent: false })),
    categories,
    pagination: { page, limit, total: count[0].total, pages: Math.ceil(count[0].total / limit) },
  });
}));

router.get('/blog/:slug', asyncHandler(async (req, res) => {
  const { rows } = await query("SELECT * FROM blog_posts WHERE slug = $1 AND status = 'published'", [req.params.slug]);
  if (!rows[0]) throw notFound('Article introuvable.');
  const post = blogPost(rows[0]);
  const { rows: related } = await query(
    "SELECT * FROM blog_posts WHERE status = 'published' AND slug <> $1 ORDER BY (category = $2) DESC, published_at DESC LIMIT 3",
    [req.params.slug, rows[0].category]
  );
  res.json({
    post: { ...post, html: renderMarkdown(post.content) },
    related: related.map((p) => blogPost(p, { withContent: false })),
  });
}));

/* ----------------------------- Newsletter ------------------------------- */
const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email('Adresse email invalide').max(180),
  firstName: z.string().trim().max(60).optional().default(''),
  consent: z.literal(true, { errorMap: () => ({ message: 'Merci de cocher la case de consentement.' }) }),
  source: z.string().trim().max(40).optional().default('site'),
});

router.post('/newsletter', limiters.newsletter, asyncHandler(async (req, res) => {
  const data = newsletterSchema.parse(req.body);
  await query(
    `INSERT INTO newsletter_subscribers (email, source, first_name) VALUES ($1,$2,$3)
     ON CONFLICT (email) DO UPDATE SET is_active = true, unsubscribed_at = NULL`,
    [data.email, data.source, data.firstName]
  );
  res.status(201).json({ message: 'Merci ! Votre inscription est confirmée.' });
}));

router.get('/newsletter/unsubscribe', asyncHandler(async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) throw badRequest('Email manquant.');
  await query(
    'UPDATE newsletter_subscribers SET is_active = false, unsubscribed_at = now() WHERE email = $1',
    [email]
  );
  res.json({ message: 'Vous êtes désinscrit de notre newsletter.' });
}));

/* ------------------------------ Contact --------------------------------- */
const contactSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis').max(90),
  email: z.string().trim().toLowerCase().email('Email invalide').max(180),
  phone: z.string().trim().max(30).optional().default(''),
  subject: z.string().trim().max(140).optional().default('Demande générale'),
  message: z.string().trim().min(10, 'Merci de détailler votre demande').max(4000),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consentement requis.' }) }),
});

router.post('/contact', limiters.contact, asyncHandler(async (req, res) => {
  const data = contactSchema.parse(req.body);
  await query(
    'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES ($1,$2,$3,$4,$5)',
    [data.name, data.email, data.phone, data.subject, data.message]
  );
  sendMail({
    to: config.mail.to,
    replyTo: data.email,
    subject: `[Contact] ${data.subject}`,
    text: `${data.name} (${data.email}, ${data.phone})\n\n${data.message}`,
  }).catch(() => {});
  res.status(201).json({ message: 'Message reçu. Nous vous répondons sous 24 h ouvrées.' });
}));

/* ----------------------------- Analytics -------------------------------- */
const ALLOWED_EVENTS = new Set([
  'page_view', 'product_view', 'add_to_cart', 'begin_checkout', 'purchase',
  'newsletter_signup', 'search', 'promo_applied', 'video_play',
]);

router.post('/analytics', limiters.analytics, asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().max(40),
    path: z.string().max(250).optional().default(''),
    referrer: z.string().max(300).optional().default(''),
    sessionId: z.string().max(64).optional().default(''),
    meta: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().default({}),
  });
  const data = schema.parse(req.body || {});
  if (!ALLOWED_EVENTS.has(data.name)) return res.status(204).end();
  await query(
    'INSERT INTO analytics_events (name, path, referrer, session_id, meta) VALUES ($1,$2,$3,$4,$5::jsonb)',
    [data.name, data.path, data.referrer, data.sessionId, JSON.stringify(data.meta)]
  );
  res.status(204).end();
}));

/* ------------------------------- Sitemap -------------------------------- */
router.get('/sitemap.xml', asyncHandler(async (_req, res) => {
  const base = config.siteUrl;
  const [{ rows: products }, { rows: posts }, { rows: cats }] = await Promise.all([
    query('SELECT slug, updated_at FROM products WHERE is_active = true'),
    query("SELECT slug, updated_at FROM blog_posts WHERE status = 'published'"),
    query('SELECT slug FROM categories WHERE is_active = true'),
  ]);
  const staticUrls = ['/', '/boutique', '/livraison', '/faq', '/blog', '/contact', '/a-propos', '/mentions-legales', '/cgv', '/confidentialite'];
  const url = (loc, lastmod, priority = '0.7', changefreq = 'weekly') =>
    `  <url><loc>${base}${loc}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.map((u) => url(u, null, u === '/' ? '1.0' : '0.8')).join('\n')}
${cats.map((c) => url(`/categorie/${c.slug}`, null, '0.8')).join('\n')}
${products.map((p) => url(`/produit/${p.slug}`, p.updated_at, '0.9')).join('\n')}
${posts.map((p) => url(`/blog/${p.slug}`, p.updated_at, '0.7')).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
}));

router.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /compte\nDisallow: /paiement\nDisallow: /api\n\nSitemap: ${config.siteUrl}/sitemap.xml\n`
  );
});

export default router;
