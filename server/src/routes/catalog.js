import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asyncHandler, notFound, badRequest } from '../lib/http.js';
import { parsePagination } from '../lib/utils.js';
import { product, category, blogPost, faq } from '../lib/serialize.js';
import { limiters } from '../lib/limiters.js';

const router = Router();

const PRODUCT_SELECT = `
  SELECT p.*, c.slug AS category_slug, c.name AS category_name,
         COALESCE(r.rating, NULL) AS rating, COALESCE(r.review_count, 0) AS review_count
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN (
    SELECT product_id, ROUND(AVG(rating)::numeric, 1) AS rating, COUNT(*) AS review_count
    FROM reviews WHERE is_published = true GROUP BY product_id
  ) r ON r.product_id = p.id
`;

const PUBLIC_SETTING_KEYS = ['store', 'delivery', 'announcement', 'seo', 'social', 'features'];

export async function getPublicSettings() {
  const { rows } = await query('SELECT key, value FROM settings WHERE key = ANY($1)', [PUBLIC_SETTING_KEYS]);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

router.get('/settings', asyncHandler(async (_req, res) => {
  res.json({ settings: await getPublicSettings() });
}));

router.get('/categories', asyncHandler(async (_req, res) => {
  const { rows } = await query(`
    SELECT c.*, COUNT(p.id) FILTER (WHERE p.is_active) AS product_count
    FROM categories c LEFT JOIN products p ON p.category_id = c.id
    WHERE c.is_active = true
    GROUP BY c.id ORDER BY c.position, c.name
  `);
  res.json({ categories: rows.map(category) });
}));

router.get('/products', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req, { defaultLimit: 12, maxLimit: 48 });
  const { category: categorySlug, q, sort, featured, minPrice, maxPrice, length } = req.query;

  const where = ['p.is_active = true', 'c.is_active = true'];
  const params = [];
  if (categorySlug) {
    params.push(categorySlug);
    where.push(`c.slug = $${params.length}`);
  }
  if (q && String(q).trim()) {
    params.push(`%${String(q).trim().toLowerCase()}%`);
    where.push(`(lower(p.name) LIKE $${params.length} OR lower(p.short_description) LIKE $${params.length} OR lower(p.wood_type) LIKE $${params.length})`);
  }
  if (featured === 'true') where.push('p.is_featured = true');
  if (minPrice) {
    params.push(Math.round(Number(minPrice) * 100));
    where.push(`p.price_cents >= $${params.length}`);
  }
  if (maxPrice) {
    params.push(Math.round(Number(maxPrice) * 100));
    where.push(`p.price_cents <= $${params.length}`);
  }
  if (length) {
    params.push(Number(length));
    where.push(`p.log_length_cm = $${params.length}`);
  }

  const orderBy = {
    price_asc: 'p.price_cents ASC',
    price_desc: 'p.price_cents DESC',
    newest: 'p.created_at DESC',
    popular: 'COALESCE(r.review_count,0) DESC, p.position ASC',
  }[String(sort)] || 'p.position ASC, p.id ASC';

  params.push(limit, offset);
  const { rows } = await query(
    `${PRODUCT_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const countParams = params.slice(0, -2);
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${where.join(' AND ')}`,
    countParams
  );
  res.json({
    products: rows.map(product),
    pagination: { page, limit, total: countRows[0].total, pages: Math.ceil(countRows[0].total / limit) },
  });
}));

router.get('/products/:slug', asyncHandler(async (req, res) => {
  const { rows } = await query(`${PRODUCT_SELECT} WHERE p.slug = $1 AND c.is_active = true`, [req.params.slug]);
  if (!rows[0]) throw notFound('Produit introuvable.');
  const p = product(rows[0]);

  const { rows: reviews } = await query(
    'SELECT id, author_name, rating, title, content, created_at FROM reviews WHERE product_id = $1 AND is_published = true ORDER BY created_at DESC LIMIT 20',
    [p.id]
  );
  const { rows: related } = await query(
    `${PRODUCT_SELECT} WHERE p.is_active = true AND p.category_id = (SELECT category_id FROM products WHERE id = $1) AND p.id <> $1 ORDER BY p.position LIMIT 4`,
    [p.id]
  );

  res.json({ product: p, reviews, related: related.map(product) });
}));

const reviewSchema = z.object({
  authorName: z.string().trim().min(2).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().default(''),
  content: z.string().trim().min(10).max(2000),
});

router.post('/products/:id/reviews', limiters.review, asyncHandler(async (req, res) => {
  const data = reviewSchema.parse(req.body);
  const productId = Number.parseInt(req.params.id, 10);
  const { rows } = await query('SELECT id FROM products WHERE id = $1 AND is_active = true', [productId]);
  if (!rows[0]) throw notFound('Produit introuvable.');
  await query(
    `INSERT INTO reviews (product_id, author_name, rating, title, content, is_published)
     VALUES ($1,$2,$3,$4,$5,false)`,
    [productId, data.authorName, data.rating, data.title, data.content]
  );
  res.status(201).json({ message: 'Merci ! Votre avis sera publié après vérification.' });
}));

router.get('/home', asyncHandler(async (_req, res) => {
  const [settings, categories, products, posts, faqs, reviews] = await Promise.all([
    getPublicSettings(),
    query(`SELECT c.*, COUNT(p.id) FILTER (WHERE p.is_active) AS product_count
           FROM categories c LEFT JOIN products p ON p.category_id = c.id
           WHERE c.is_active = true GROUP BY c.id ORDER BY c.position, c.name`),
    query(`${PRODUCT_SELECT} WHERE p.is_active = true AND c.is_active = true ORDER BY p.is_featured DESC, p.position LIMIT 8`),
    query(`SELECT * FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 3`),
    query('SELECT * FROM faqs WHERE is_published = true ORDER BY position, id LIMIT 6'),
    query(`SELECT r.author_name, r.rating, r.title, r.content, r.created_at, p.name AS product_name, p.slug AS product_slug
           FROM reviews r JOIN products p ON p.id = r.product_id
           WHERE r.is_published = true AND r.rating >= 4 ORDER BY r.created_at DESC LIMIT 3`),
  ]);

  res.json({
    settings,
    categories: categories.rows.map(category),
    featured: products.rows.map(product),
    posts: posts.rows.map((p) => blogPost(p, { withContent: false })),
    faqs: faqs.rows.map(faq),
    reviews: reviews.rows,
  });
}));

router.get('/faqs', asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT * FROM faqs WHERE is_published = true ORDER BY position, id');
  res.json({ faqs: rows.map(faq) });
}));

router.get('/search', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (q.length < 2) return res.json({ products: [], posts: [] });
  const like = `%${q}%`;
  const [products, posts] = await Promise.all([
    query(`${PRODUCT_SELECT} WHERE p.is_active = true AND (lower(p.name) LIKE $1 OR lower(p.short_description) LIKE $1) ORDER BY p.position LIMIT 8`, [like]),
    query(`SELECT * FROM blog_posts WHERE status = 'published' AND (lower(title) LIKE $1 OR lower(excerpt) LIKE $1) ORDER BY published_at DESC LIMIT 5`, [like]),
  ]);
  res.json({ products: products.rows.map(product), posts: posts.rows.map((p) => blogPost(p, { withContent: false })) });
}));

router.get('/discounts/:code', asyncHandler(async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const { rows } = await query(
    `SELECT code, type, value, min_order_cents, expires_at, is_active, max_uses, used_count
     FROM discount_codes WHERE code = $1`,
    [code]
  );
  const d = rows[0];
  if (!d || !d.is_active) throw badRequest('Code promo inconnu ou inactif.');
  if (d.expires_at && new Date(d.expires_at) < new Date()) throw badRequest('Ce code promo a expiré.');
  if (d.max_uses && d.used_count >= d.max_uses) throw badRequest('Ce code promo a atteint sa limite d’utilisation.');
  res.json({
    discount: {
      code: d.code,
      type: d.type,
      value: d.value,
      minOrderCents: d.min_order_cents,
      label: d.type === 'percent' ? `-${d.value} %` : `-${(d.value / 100).toFixed(2)} €`,
    },
  });
}));

export default router;
