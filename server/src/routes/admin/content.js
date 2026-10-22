import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { asyncHandler, notFound, conflict, badRequest } from '../../lib/http.js';
import { parsePagination, slugify, toCsv, logAudit } from '../../lib/utils.js';
import { blogPost, faq } from '../../lib/serialize.js';
import { sendMail } from '../../lib/mailer.js';
import { renderMarkdown } from '../../lib/markdown.js';

const router = Router();

/* --------------------------------- Blog --------------------------------- */
const blogSchema = z.object({
  title: z.string().trim().min(5, 'Titre trop court').max(180),
  slug: z.string().trim().max(140).optional().default(''),
  excerpt: z.string().trim().max(400).optional().default(''),
  content: z.string().trim().min(20, 'Contenu trop court').max(60000),
  cover: z.string().trim().max(500).optional().default(''),
  category: z.string().trim().max(60).optional().default('Conseils'),
  tags: z.array(z.string().max(40)).max(10).optional().default([]),
  author: z.string().trim().max(80).optional().default('Équipe EdyEco'),
  status: z.enum(['draft', 'published']).optional().default('draft'),
  readMinutes: z.coerce.number().int().min(1).max(60).optional().default(5),
  seoTitle: z.string().trim().max(70).optional().default(''),
  seoDescription: z.string().trim().max(180).optional().default(''),
});

router.get('/blog', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
  const q = String(req.query.q || '').trim().toLowerCase();
  const params = [];
  let where = '1=1';
  if (q) {
    params.push(`%${q}%`);
    where = '(lower(title) LIKE $1 OR lower(slug) LIKE $1)';
  }
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT * FROM blog_posts WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: count } = await query(`SELECT COUNT(*)::int AS total FROM blog_posts WHERE ${where}`, params.slice(0, -2));
  res.json({ posts: rows.map((p) => blogPost(p, { withContent: false })), pagination: { page, limit, total: count[0].total, pages: Math.ceil(count[0].total / limit) } });
}));

router.get('/blog/:id', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM blog_posts WHERE id = $1', [Number.parseInt(req.params.id, 10)]);
  if (!rows[0]) throw notFound('Article introuvable.');
  res.json({ post: { ...blogPost(rows[0]), html: renderMarkdown(rows[0].content) } });
}));

router.post('/blog', asyncHandler(async (req, res) => {
  const d = blogSchema.parse(req.body);
  const slug = slugify(d.slug || d.title);
  const { rows: exists } = await query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
  if (exists[0]) throw conflict('Ce slug est déjà utilisé.');
  const { rows } = await query(
    `INSERT INTO blog_posts (slug, title, excerpt, content, cover_url, author, category, tags, status, read_minutes,
       seo_title, seo_description, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, CASE WHEN $9 = 'published' THEN now() ELSE NULL END)
     RETURNING *`,
    [slug, d.title, d.excerpt, d.content, d.cover, d.author, d.category, d.tags, d.status, d.readMinutes,
      d.seoTitle || `${d.title} | EdyEco`, d.seoDescription || d.excerpt.slice(0, 155)]
  );
  await logAudit(req, 'blog.create', 'blog_post', rows[0].id, { title: d.title });
  res.status(201).json({ post: blogPost(rows[0]) });
}));

router.patch('/blog/:id', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { rows: existingRows } = await query('SELECT * FROM blog_posts WHERE id = $1', [id]);
  const e = existingRows[0];
  if (!e) throw notFound('Article introuvable.');
  const d = blogSchema.parse({
    title: req.body.title ?? e.title,
    slug: req.body.slug ?? e.slug,
    excerpt: req.body.excerpt ?? e.excerpt,
    content: req.body.content ?? e.content,
    cover: req.body.cover ?? e.cover_url,
    category: req.body.category ?? e.category,
    tags: req.body.tags ?? e.tags,
    author: req.body.author ?? e.author,
    status: req.body.status ?? e.status,
    readMinutes: req.body.readMinutes ?? e.read_minutes,
    seoTitle: req.body.seoTitle ?? e.seo_title,
    seoDescription: req.body.seoDescription ?? e.seo_description,
  });
  const slug = slugify(d.slug || d.title);
  const { rows: taken } = await query('SELECT id FROM blog_posts WHERE slug = $1 AND id <> $2', [slug, id]);
  if (taken[0]) throw conflict('Ce slug est déjà utilisé.');
  const { rows } = await query(
    `UPDATE blog_posts SET slug=$1, title=$2, excerpt=$3, content=$4, cover_url=$5, author=$6, category=$7, tags=$8,
       status=$9, read_minutes=$10, seo_title=$11, seo_description=$12,
       published_at = CASE WHEN $9 = 'published' AND published_at IS NULL THEN now() ELSE published_at END,
       updated_at = now()
     WHERE id=$13 RETURNING *`,
    [slug, d.title, d.excerpt, d.content, d.cover, d.author, d.category, d.tags, d.status, d.readMinutes,
      d.seoTitle, d.seoDescription, id]
  );
  await logAudit(req, 'blog.update', 'blog_post', id);
  res.json({ post: blogPost(rows[0]) });
}));

router.delete('/blog/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM blog_posts WHERE id = $1', [Number.parseInt(req.params.id, 10)]);
  if (!rowCount) throw notFound('Article introuvable.');
  await logAudit(req, 'blog.delete', 'blog_post', req.params.id);
  res.json({ message: 'Article supprimé.' });
}));

/* -------------------------------- Avis ---------------------------------- */
router.get('/reviews', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req, { defaultLimit: 30, maxLimit: 100 });
  const filter = req.query.status;
  let where = '1=1';
  if (filter === 'published') where = 'r.is_published = true';
  if (filter === 'pending') where = 'r.is_published = false';
  const { rows } = await query(
    `SELECT r.*, p.name AS product_name, p.slug AS product_slug FROM reviews r
     JOIN products p ON p.id = r.product_id WHERE ${where}
     ORDER BY r.is_published ASC, r.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const { rows: count } = await query(`SELECT COUNT(*)::int AS total FROM reviews r WHERE ${where}`);
  res.json({ reviews: rows, pagination: { page, limit, total: count[0].total, pages: Math.ceil(count[0].total / limit) } });
}));

router.patch('/reviews/:id', asyncHandler(async (req, res) => {
  const { isPublished } = z.object({ isPublished: z.boolean() }).parse(req.body);
  const { rows } = await query('UPDATE reviews SET is_published = $1 WHERE id = $2 RETURNING *', [isPublished, Number.parseInt(req.params.id, 10)]);
  if (!rows[0]) throw notFound('Avis introuvable.');
  await logAudit(req, 'review.moderate', 'review', rows[0].id, { published: isPublished });
  res.json({ review: rows[0] });
}));

router.delete('/reviews/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM reviews WHERE id = $1', [Number.parseInt(req.params.id, 10)]);
  if (!rowCount) throw notFound('Avis introuvable.');
  res.json({ message: 'Avis supprimé.' });
}));

/* --------------------------------- FAQ ---------------------------------- */
const faqSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(5000),
  category: z.string().trim().max(60).optional().default('Général'),
  position: z.coerce.number().int().min(0).max(999).optional().default(0),
  isPublished: z.boolean().optional().default(true),
});

router.get('/faqs', asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT * FROM faqs ORDER BY position, id');
  res.json({ faqs: rows.map((f) => ({ ...faq(f), isPublished: f.is_published })) });
}));

router.post('/faqs', asyncHandler(async (req, res) => {
  const d = faqSchema.parse(req.body);
  const { rows } = await query(
    'INSERT INTO faqs (question, answer, category, position, is_published) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [d.question, d.answer, d.category, d.position, d.isPublished]
  );
  await logAudit(req, 'faq.create', 'faq', rows[0].id);
  res.status(201).json({ faq: faq(rows[0]) });
}));

router.patch('/faqs/:id', asyncHandler(async (req, res) => {
  const d = faqSchema.partial().parse(req.body);
  const { rows: existingRows } = await query('SELECT * FROM faqs WHERE id = $1', [Number.parseInt(req.params.id, 10)]);
  const e = existingRows[0];
  if (!e) throw notFound('FAQ introuvable.');
  const { rows } = await query(
    `UPDATE faqs SET question=$1, answer=$2, category=$3, position=$4, is_published=$5, updated_at=now() WHERE id=$6 RETURNING *`,
    [d.question ?? e.question, d.answer ?? e.answer, d.category ?? e.category, d.position ?? e.position, d.isPublished ?? e.is_published, e.id]
  );
  res.json({ faq: faq(rows[0]) });
}));

router.delete('/faqs/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM faqs WHERE id = $1', [Number.parseInt(req.params.id, 10)]);
  if (!rowCount) throw notFound('FAQ introuvable.');
  res.json({ message: 'FAQ supprimée.' });
}));

/* ------------------------------ Codes promo ----------------------------- */
const discountSchema = z.object({
  code: z.string().trim().min(3).max(40),
  type: z.enum(['percent', 'fixed']),
  value: z.coerce.number().int().positive(),
  minOrderCents: z.coerce.number().int().min(0).optional().default(0),
  maxUses: z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().int().positive().nullable()).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

router.get('/discounts', asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT * FROM discount_codes ORDER BY created_at DESC');
  res.json({
    discounts: rows.map((d) => ({
      id: d.id, code: d.code, type: d.type, value: d.value, minOrderCents: d.min_order_cents,
      maxUses: d.max_uses, usedCount: d.used_count, expiresAt: d.expires_at, isActive: d.is_active,
    })),
  });
}));

router.post('/discounts', asyncHandler(async (req, res) => {
  const d = discountSchema.parse(req.body);
  if (d.type === 'percent' && d.value > 100) throw badRequest('Une remise en pourcentage ne peut pas dépasser 100 %.');
  const { rows } = await query(
    `INSERT INTO discount_codes (code, type, value, min_order_cents, max_uses, expires_at, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [d.code.toUpperCase().replace(/\s/g, ''), d.type, d.value, d.minOrderCents, d.maxUses ?? null, d.expiresAt ?? null, d.isActive]
  );
  await logAudit(req, 'discount.create', 'discount', rows[0].id, { code: d.code });
  res.status(201).json({ discount: rows[0] });
}));

router.patch('/discounts/:id', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  const { rows } = await query('UPDATE discount_codes SET is_active = $1 WHERE id = $2 RETURNING *', [isActive, id]);
  if (!rows[0]) throw notFound('Code promo introuvable.');
  res.json({ discount: rows[0] });
}));

router.delete('/discounts/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM discount_codes WHERE id = $1', [Number.parseInt(req.params.id, 10)]);
  if (!rowCount) throw notFound('Code promo introuvable.');
  res.json({ message: 'Code promo supprimé.' });
}));

/* ------------------------------- Newsletter ------------------------------ */
router.get('/newsletter', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req, { defaultLimit: 30, maxLimit: 200 });
  const q = String(req.query.q || '').trim().toLowerCase();
  const params = [];
  let where = '1=1';
  if (q) {
    params.push(`%${q}%`);
    where = 'lower(email) LIKE $1';
  }
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT id, email, first_name, source, is_active, consent_at, created_at FROM newsletter_subscribers
     WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: count } = await query(`SELECT COUNT(*)::int AS total FROM newsletter_subscribers WHERE ${where}`, params.slice(0, -2));
  const { rows: stats } = await query(
    'SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active, COUNT(*) FILTER (WHERE created_at > now() - interval \'30 days\')::int AS recent FROM newsletter_subscribers'
  );
  res.json({ subscribers: rows, stats: stats[0], pagination: { page, limit, total: count[0].total, pages: Math.ceil(count[0].total / limit) } });
}));

router.get('/newsletter/export', asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT email, first_name, source, is_active, created_at FROM newsletter_subscribers ORDER BY created_at DESC');
  const csv = toCsv(rows, [
    { label: 'email', key: 'email' },
    { label: 'prenom', key: 'first_name' },
    { label: 'source', key: 'source' },
    { label: 'actif', key: 'is_active' },
    { label: 'date', value: (r) => new Date(r.created_at).toISOString() },
  ]);
  res.attachment('edyeco-newsletter.csv').type('text/csv').send(csv);
}));

router.delete('/newsletter/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM newsletter_subscribers WHERE id = $1', [Number.parseInt(req.params.id, 10)]);
  if (!rowCount) throw notFound('Abonné introuvable.');
  res.json({ message: 'Abonné supprimé.' });
}));

router.get('/campaigns', asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT * FROM newsletter_campaigns ORDER BY created_at DESC LIMIT 50');
  res.json({ campaigns: rows });
}));

const campaignSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  content: z.string().trim().min(10).max(20000),
});

router.post('/campaigns', asyncHandler(async (req, res) => {
  const d = campaignSchema.parse(req.body);
  const { rows: subs } = await query('SELECT COUNT(*)::int AS n FROM newsletter_subscribers WHERE is_active = true');
  const { rows } = await query(
    `INSERT INTO newsletter_campaigns (subject, content, recipients) VALUES ($1,$2,$3) RETURNING *`,
    [d.subject, d.content, subs[0].n]
  );
  res.status(201).json({ campaign: rows[0] });
}));

router.delete('/campaigns/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM newsletter_campaigns WHERE id = $1', [Number.parseInt(req.params.id, 10)]);
  if (!rowCount) throw notFound('Campagne introuvable.');
  await logAudit(req, 'campaign.delete', 'campaign', req.params.id);
  res.json({ message: 'Campagne supprimée.' });
}));

router.post('/campaigns/:id/send', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { rows } = await query('SELECT * FROM newsletter_campaigns WHERE id = $1', [id]);
  const campaign = rows[0];
  if (!campaign) throw notFound('Campagne introuvable.');
  if (campaign.status === 'sent') throw conflict('Cette campagne a déjà été envoyée.');
  const { rows: subscribers } = await query("SELECT email FROM newsletter_subscribers WHERE is_active = true LIMIT 500");
  let simulated = 0;
  for (const sub of subscribers) {
    const result = await sendMail({
      to: sub.email,
      subject: campaign.subject,
      text: campaign.content,
      html: renderMarkdown(campaign.content),
    });
    if (result.simulated) simulated += 1;
  }
  await query("UPDATE newsletter_campaigns SET status = 'sent', sent_at = now(), recipients = $1 WHERE id = $2", [subscribers.length, id]);
  await logAudit(req, 'campaign.send', 'campaign', id, { recipients: subscribers.length });
  res.json({ message: `Campagne traitée pour ${subscribers.length} abonné(s).${simulated ? ' SMTP non configuré : envois simulés.' : ''}` });
}));

/* ------------------------------ Messages -------------------------------- */
router.delete('/messages/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM contact_messages WHERE id = $1', [Number.parseInt(req.params.id, 10)]);
  if (!rowCount) throw notFound('Message introuvable.');
  await logAudit(req, 'message.delete', 'contact_message', req.params.id);
  res.json({ message: 'Message supprimé.' });
}));

router.get('/messages', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req, { defaultLimit: 30, maxLimit: 100 });
  const status = req.query.status;
  const params = [];
  let where = '1=1';
  if (['new', 'read', 'replied'].includes(String(status))) {
    params.push(String(status));
    where = `status = $${params.length}`;
  }
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT * FROM contact_messages WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: count } = await query(`SELECT COUNT(*)::int AS total FROM contact_messages WHERE ${where}`, params.slice(0, -2));
  res.json({ messages: rows, pagination: { page, limit, total: count[0].total, pages: Math.ceil(count[0].total / limit) } });
}));

router.patch('/messages/:id', asyncHandler(async (req, res) => {
  const { status, reply } = z.object({
    status: z.enum(['new', 'read', 'replied']).optional(),
    reply: z.string().trim().max(4000).optional(),
  }).parse(req.body);
  const { rows: existingRows } = await query('SELECT * FROM contact_messages WHERE id = $1', [Number.parseInt(req.params.id, 10)]);
  const m = existingRows[0];
  if (!m) throw notFound('Message introuvable.');
  if (reply) {
    await sendMail({ to: m.email, subject: `Re: ${m.subject}`, text: reply, replyTo: undefined });
  }
  const { rows } = await query(
    'UPDATE contact_messages SET status = $1, admin_reply = $2 WHERE id = $3 RETURNING *',
    [status ?? (reply ? 'replied' : m.status), reply ?? m.admin_reply, m.id]
  );
  res.json({ message: rows[0] });
}));

/* ------------------------------- Réglages ------------------------------- */
const SETTINGS_KEYS = ['store', 'delivery', 'announcement', 'seo', 'social', 'features'];

router.get('/settings', asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT key, value FROM settings ORDER BY key');
  res.json({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
}));

router.put('/settings', asyncHandler(async (req, res) => {
  const schema = z.object({ key: z.enum(SETTINGS_KEYS), value: z.record(z.any()) });
  const { key, value } = schema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1,$2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now() RETURNING *`,
    [key, JSON.stringify(value)]
  );
  await logAudit(req, 'settings.update', 'settings', key);
  res.json({ setting: rows[0] });
}));

/* ------------------------- Audit & analytics ---------------------------- */
router.get('/audit', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
  const { rows } = await query(
    `SELECT a.*, u.email FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const { rows: count } = await query('SELECT COUNT(*)::int AS total FROM audit_log');
  res.json({ entries: rows, pagination: { page, limit, total: count[0].total, pages: Math.ceil(count[0].total / limit) } });
}));

router.get('/analytics', asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, Number.parseInt(req.query.days ?? '30', 10) || 30));
  const [byName, byPath, daily] = await Promise.all([
    query(`SELECT name, COUNT(*)::int AS count FROM analytics_events WHERE created_at > now() - ($1 || ' days')::interval GROUP BY name ORDER BY count DESC`, [String(days)]),
    query(`SELECT path, COUNT(*)::int AS count FROM analytics_events WHERE name = 'page_view' AND created_at > now() - ($1 || ' days')::interval GROUP BY path ORDER BY count DESC LIMIT 10`, [String(days)]),
    query(`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS count FROM analytics_events WHERE created_at > now() - ($1 || ' days')::interval GROUP BY 1 ORDER BY 1`, [String(days)]),
  ]);
  res.json({ byName: byName.rows, topPages: byPath.rows, daily: daily.rows, days });
}));

export default router;
