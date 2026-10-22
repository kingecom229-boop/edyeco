import { Router } from 'express';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { query } from '../../db/pool.js';
import { asyncHandler, notFound, conflict, badRequest } from '../../lib/http.js';
import { parsePagination, slugify, toCsv, logAudit } from '../../lib/utils.js';
import { product as serialize, category as serializeCategory } from '../../lib/serialize.js';
import config from '../../config.js';

const router = Router();

const PRODUCT_SELECT = `
  SELECT p.*, c.slug AS category_slug, c.name AS category_name FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

const nullableInt = z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().int().min(0).nullable());

const productSchema = z.object({
  name: z.string().trim().min(3, 'Nom trop court').max(160),
  slug: z.string().trim().max(120).optional().default(''),
  sku: z.string().trim().max(40).optional().default(''),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  shortDescription: z.string().trim().max(400).optional().default(''),
  description: z.string().trim().max(12000).optional().default(''),
  priceCents: z.coerce.number().int().min(0).max(10_000_000),
  compareAtCents: nullableInt.optional(),
  stock: z.coerce.number().int().min(0).max(100000).default(0),
  unit: z.string().trim().max(30).default('palette'),
  logLengthCm: nullableInt.optional(),
  volumeM3: z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().min(0).max(99).nullable()).optional(),
  woodType: z.string().trim().max(90).optional().default('Chêne & hêtre'),
  moisture: z.string().trim().max(60).optional().default('Moins de 20 %'),
  image: z.string().trim().max(500).optional().default(''),
  gallery: z.array(z.string().max(500)).max(8).optional().default([]),
  badges: z.array(z.string().max(40)).max(6).optional().default([]),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  deliveryClass: z.enum(['classique', 'confort']).optional().default('classique'),
  position: z.coerce.number().int().min(0).max(9999).optional().default(0),
  seoTitle: z.string().trim().max(70).optional().default(''),
  seoDescription: z.string().trim().max(180).optional().default(''),
});

router.get('/products', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
  const { q, category, status } = req.query;
  const where = ['1=1'];
  const params = [];
  if (q) {
    params.push(`%${String(q).toLowerCase()}%`);
    where.push(`(lower(p.name) LIKE $${params.length} OR lower(p.sku) LIKE $${params.length})`);
  }
  if (category) {
    params.push(String(category));
    where.push(`c.slug = $${params.length}`);
  }
  if (status === 'active') where.push('p.is_active = true');
  if (status === 'inactive') where.push('p.is_active = false');
  if (status === 'low') where.push('p.stock <= 10');
  params.push(limit, offset);
  const { rows } = await query(
    `${PRODUCT_SELECT} WHERE ${where.join(' AND ')} ORDER BY p.position, p.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: count } = await query(
    `SELECT COUNT(*)::int AS total FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${where.join(' AND ')}`,
    params.slice(0, -2)
  );
  res.json({ products: rows.map(serialize), pagination: { page, limit, total: count[0].total, pages: Math.ceil(count[0].total / limit) } });
}));

function normalize(input) {
  const data = productSchema.parse(input);
  return {
    ...data,
    slug: data.slug ? slugify(data.slug) : slugify(data.name),
    sku: data.sku || `EDY-${Date.now().toString(36).toUpperCase()}`,
    image: data.image || '/products/palette-33.png',
  };
}

router.post('/products', asyncHandler(async (req, res) => {
  const d = normalize(req.body);
  if (!d.slug) throw badRequest('Slug invalide.');
  const { rows: takenSlug } = await query('SELECT id FROM products WHERE slug = $1', [d.slug]);
  if (takenSlug[0]) throw conflict('Ce slug est déjà utilisé par un produit.');
  const { rows: takenSku } = await query('SELECT id FROM products WHERE sku = $1', [d.sku]);
  if (takenSku[0]) throw conflict('Ce SKU est déjà utilisé par un produit.');
  if (d.categoryId) {
    const { rows: cat } = await query('SELECT id FROM categories WHERE id = $1', [d.categoryId]);
    if (!cat[0]) throw badRequest('Catégorie introuvable.');
  }
  const { rows } = await query(
    `INSERT INTO products (slug, name, sku, category_id, short_description, description, price_cents, compare_at_cents,
       stock, unit, log_length_cm, volume_m3, wood_type, moisture, image_url, gallery, badges, is_active, is_featured,
       delivery_class, position, seo_title, seo_description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19,$20,$21,$22,$23)
     RETURNING id`,
    [d.slug, d.name, d.sku, d.categoryId ?? null, d.shortDescription, d.description, d.priceCents, d.compareAtCents ?? null,
      d.stock, d.unit, d.logLengthCm ?? null, d.volumeM3 ?? null, d.woodType, d.moisture, d.image,
      JSON.stringify(d.gallery), JSON.stringify(d.badges), d.isActive, d.isFeatured, d.deliveryClass, d.position,
      d.seoTitle || `${d.name} | EdyEco`, d.seoDescription || d.shortDescription.slice(0, 155)]
  );
  await logAudit(req, 'product.create', 'product', rows[0].id, { name: d.name });
  const { rows: created } = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [rows[0].id]);
  res.status(201).json({ product: serialize(created[0]) });
}));

router.patch('/products/:id', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { rows: existingRows } = await query('SELECT * FROM products WHERE id = $1', [id]);
  const existing = existingRows[0];
  if (!existing) throw notFound('Produit introuvable.');

  const merged = {
    name: req.body.name ?? existing.name,
    slug: req.body.slug ?? existing.slug,
    sku: req.body.sku ?? existing.sku,
    categoryId: req.body.categoryId ?? existing.category_id,
    shortDescription: req.body.shortDescription ?? existing.short_description,
    description: req.body.description ?? existing.description,
    priceCents: req.body.priceCents ?? existing.price_cents,
    compareAtCents: req.body.compareAtCents ?? existing.compare_at_cents,
    stock: req.body.stock ?? existing.stock,
    unit: req.body.unit ?? existing.unit,
    logLengthCm: req.body.logLengthCm ?? existing.log_length_cm,
    volumeM3: req.body.volumeM3 ?? existing.volume_m3,
    woodType: req.body.woodType ?? existing.wood_type,
    moisture: req.body.moisture ?? existing.moisture,
    image: req.body.image ?? existing.image_url,
    gallery: req.body.gallery ?? existing.gallery,
    badges: req.body.badges ?? existing.badges,
    isActive: req.body.isActive ?? existing.is_active,
    isFeatured: req.body.isFeatured ?? existing.is_featured,
    deliveryClass: req.body.deliveryClass ?? existing.delivery_class,
    position: req.body.position ?? existing.position,
    seoTitle: req.body.seoTitle ?? existing.seo_title,
    seoDescription: req.body.seoDescription ?? existing.seo_description,
  };
  const d = normalize(merged);
  if (!d.slug) throw badRequest('Slug invalide.');
  const { rows: slugTaken } = await query('SELECT id FROM products WHERE slug = $1 AND id <> $2', [d.slug, id]);
  if (slugTaken[0]) throw conflict('Ce slug est déjà utilisé par un autre produit.');
  const { rows: skuTaken } = await query('SELECT id FROM products WHERE sku = $1 AND id <> $2', [d.sku, id]);
  if (skuTaken[0]) throw conflict('Ce SKU est déjà utilisé par un autre produit.');

  await query(
    `UPDATE products SET slug=$1, name=$2, sku=$3, category_id=$4, short_description=$5, description=$6,
       price_cents=$7, compare_at_cents=$8, stock=$9, unit=$10, log_length_cm=$11, volume_m3=$12, wood_type=$13,
       moisture=$14, image_url=$15, gallery=$16::jsonb, badges=$17::jsonb, is_active=$18, is_featured=$19,
       delivery_class=$20, position=$21, seo_title=$22, seo_description=$23, updated_at=now()
     WHERE id=$24`,
    [d.slug, d.name, d.sku, d.categoryId ?? null, d.shortDescription, d.description, d.priceCents, d.compareAtCents ?? null,
      d.stock, d.unit, d.logLengthCm ?? null, d.volumeM3 ?? null, d.woodType, d.moisture, d.image,
      JSON.stringify(d.gallery), JSON.stringify(d.badges), d.isActive, d.isFeatured, d.deliveryClass, d.position,
      d.seoTitle, d.seoDescription, id]
  );
  await logAudit(req, 'product.update', 'product', id, { name: d.name });
  const { rows } = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
  res.json({ product: serialize(rows[0]) });
}));

router.delete('/products/:id', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const hard = req.query.hard === '1';
  const { rows: used } = await query('SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1', [id]);
  if (hard && !used[0]) {
    const { rowCount } = await query('DELETE FROM products WHERE id = $1', [id]);
    if (!rowCount) throw notFound('Produit introuvable.');
    await logAudit(req, 'product.delete', 'product', id, { hard: true });
    return res.json({ message: 'Produit supprimé définitivement.' });
  }
  const { rowCount } = await query('UPDATE products SET is_active = false, updated_at = now() WHERE id = $1', [id]);
  if (!rowCount) throw notFound('Produit introuvable.');
  await logAudit(req, 'product.delete', 'product', id, { hard: false });
  res.json({ message: 'Produit archivé (il reste visible dans l’historique des commandes).' });
}));

/* ------------------------------ Import CSV ------------------------------ */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const delimiter = text.includes(';') && !text.split('\n')[0].includes(',') ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((v) => String(v).trim() !== ''));
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [String(h).trim().toLowerCase(), (r[i] ?? '').trim()])));
}

router.post('/products/import', asyncHandler(async (req, res) => {
  const csv = typeof req.body?.csv === 'string' ? req.body.csv : '';
  if (!csv.trim()) throw badRequest('Fichier CSV vide.');
  const rows = parseCsv(csv);
  if (!rows.length) throw badRequest('Aucune ligne exploitable dans le CSV.');
  if (rows.length > 500) throw badRequest('500 produits maximum par import.');

  const { rows: cats } = await query('SELECT id, slug, name FROM categories');
  const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  const catByName = Object.fromEntries(cats.map((c) => [c.name.toLowerCase(), c.id]));
  const created = [];
  const errors = [];
  const pick = (row, keys) => {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && String(value).trim() !== '') return String(value).trim();
    }
    return '';
  };

  for (const [index, raw] of rows.entries()) {
    try {
      const name = pick(raw, ['name', 'nom', 'titre', 'produit']);
      const priceRaw = pick(raw, ['price', 'prix', 'prix_ttc', 'tarif']);
      const priceCents = Math.round(Number(priceRaw.replace(/\s/g, '').replace(',', '.')) * 100);
      if (!name) throw new Error('nom manquant');
      if (!Number.isFinite(priceCents) || priceCents <= 0) throw new Error('prix manquant ou invalide');
      const slug = slugify(pick(raw, ['slug']) || name);
      const { rows: exists } = await query('SELECT id FROM products WHERE slug = $1', [slug]);
      if (exists[0]) throw new Error('slug déjà existant');
      const catKey = pick(raw, ['category', 'categorie', 'catégorie']).toLowerCase();
      const catId = catBySlug[catKey] ?? catByName[catKey] ?? null;
      const compareRaw = pick(raw, ['compare_at_price', 'compare_at', 'prix_barre']);
      const compareAt = compareRaw ? Math.round(Number(compareRaw.replace(',', '.')) * 100) : null;
      const description = pick(raw, ['description', 'descriptif']);
      const stockValue = Number.parseInt(pick(raw, ['stock', 'quantite', 'quantité']) || '0', 10);
      const { rows } = await query(
        `INSERT INTO products (slug, name, sku, category_id, short_description, description, price_cents, compare_at_cents,
          stock, unit, log_length_cm, volume_m3, wood_type, moisture, image_url, is_active, is_featured, position,
          seo_title, seo_description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,$16,$17,$18,$19) RETURNING id`,
        [
          slug, name, pick(raw, ['sku', 'reference', 'référence']) || `IMP-${Date.now().toString(36).toUpperCase()}-${index}`,
          catId, pick(raw, ['short_description', 'description_courte', 'accroche']) || description.slice(0, 160), description,
          priceCents, Number.isFinite(compareAt) && compareAt > priceCents ? compareAt : null,
          Number.isFinite(stockValue) ? Math.max(0, stockValue) : 0, pick(raw, ['unit', 'unite', 'unité']) || 'palette',
          pick(raw, ['log_length_cm', 'longueur', 'longueur_cm']) ? Number.parseInt(pick(raw, ['log_length_cm', 'longueur', 'longueur_cm']), 10) : null,
          pick(raw, ['volume_m3', 'volume']) ? Number(pick(raw, ['volume_m3', 'volume']).replace(',', '.')) : null,
          pick(raw, ['wood_type', 'essence', 'bois']) || 'Chêne & hêtre',
          pick(raw, ['moisture', 'humidite', 'humidité']) || 'Moins de 20 %',
          pick(raw, ['image_url', 'image', 'photo']) || '/products/palette-33.png',
          ['1', 'true', 'oui', 'yes'].includes(pick(raw, ['featured', 'is_featured', 'vedette']).toLowerCase()),
          Number.parseInt(pick(raw, ['position', 'ordre']) || '0', 10) || 0,
          pick(raw, ['seo_title']) || `${name} | EdyEco`,
          pick(raw, ['seo_description']) || description.slice(0, 155),
        ]
      );
      created.push({ id: rows[0].id, name });
    } catch (err) {
      errors.push({ line: index + 2, name: pick(raw, ['name', 'nom']) || '(sans nom)', error: err.message });
    }
  }
  await logAudit(req, 'product.import', 'product', '', { created: created.length, errors: errors.length });
  res.status(created.length ? 201 : 400).json({ created, errors, message: `${created.length} produit(s) importé(s), ${errors.length} erreur(s).` });
}));

router.get('/products/export', asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT * FROM products ORDER BY position, id');
  const { rows: catRows } = await query('SELECT id, slug FROM categories');
  const catById = Object.fromEntries(catRows.map((c) => [c.id, c.slug]));
  const csv = toCsv(rows, [
    { label: 'id', key: 'id' },
    { label: 'name', key: 'name' },
    { label: 'slug', key: 'slug' },
    { label: 'sku', key: 'sku' },
    { label: 'category', value: (r) => catById[r.category_id] || '' },
    { label: 'price', value: (r) => (r.price_cents / 100).toFixed(2) },
    { label: 'compare_at_price', value: (r) => (r.compare_at_cents ? (r.compare_at_cents / 100).toFixed(2) : '') },
    { label: 'stock', key: 'stock' },
    { label: 'unit', key: 'unit' },
    { label: 'log_length_cm', key: 'log_length_cm' },
    { label: 'volume_m3', key: 'volume_m3' },
    { label: 'wood_type', key: 'wood_type' },
    { label: 'moisture', key: 'moisture' },
    { label: 'short_description', key: 'short_description' },
    { label: 'description', key: 'description' },
    { label: 'is_active', key: 'is_active' },
    { label: 'is_featured', key: 'is_featured' },
    { label: 'image_url', key: 'image_url' },
  ]);
  res.attachment('edyeco-produits.csv').type('text/csv').send(csv);
}));

/* ------------------------------- Categories ----------------------------- */
const categorySchema = z.object({
  name: z.string().trim().min(2).max(90),
  slug: z.string().trim().max(90).optional().default(''),
  tagline: z.string().trim().max(140).optional().default(''),
  description: z.string().trim().max(3000).optional().default(''),
  image: z.string().trim().max(500).optional().default(''),
  position: z.coerce.number().int().min(0).max(999).optional().default(0),
  isActive: z.boolean().optional().default(true),
  seoTitle: z.string().trim().max(70).optional().default(''),
  seoDescription: z.string().trim().max(180).optional().default(''),
});

router.get('/categories', asyncHandler(async (_req, res) => {
  const { rows } = await query(`
    SELECT c.*, COUNT(p.id) AS product_count FROM categories c
    LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id ORDER BY c.position, c.name`);
  res.json({ categories: rows.map(serializeCategory) });
}));

router.post('/categories', asyncHandler(async (req, res) => {
  const d = categorySchema.parse(req.body);
  const slug = slugify(d.slug || d.name);
  if (!slug) throw badRequest('Nom de catégorie invalide.');
  const { rows: taken } = await query('SELECT id FROM categories WHERE slug = $1', [slug]);
  if (taken[0]) throw conflict('Une catégorie utilise déjà ce nom.');
  const { rows } = await query(
    `INSERT INTO categories (slug, name, tagline, description, image_url, position, is_active, seo_title, seo_description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [slug, d.name, d.tagline, d.description, d.image, d.position, d.isActive, d.seoTitle, d.seoDescription]
  );
  await logAudit(req, 'category.create', 'category', rows[0].id, { name: d.name });
  res.status(201).json({ category: serializeCategory(rows[0]) });
}));

router.patch('/categories/:id', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { rows: existingRows } = await query('SELECT * FROM categories WHERE id = $1', [id]);
  const e = existingRows[0];
  if (!e) throw notFound('Catégorie introuvable.');
  const d = categorySchema.parse({
    name: req.body.name ?? e.name,
    slug: req.body.slug ?? e.slug,
    tagline: req.body.tagline ?? e.tagline,
    description: req.body.description ?? e.description,
    image: req.body.image ?? e.image_url,
    position: req.body.position ?? e.position,
    isActive: req.body.isActive ?? e.is_active,
    seoTitle: req.body.seoTitle ?? e.seo_title,
    seoDescription: req.body.seoDescription ?? e.seo_description,
  });
  const { rows } = await query(
    `UPDATE categories SET slug=$1, name=$2, tagline=$3, description=$4, image_url=$5, position=$6, is_active=$7,
       seo_title=$8, seo_description=$9, updated_at=now() WHERE id=$10 RETURNING *`,
    [slugify(d.slug || d.name), d.name, d.tagline, d.description, d.image, d.position, d.isActive, d.seoTitle, d.seoDescription, id]
  );
  await logAudit(req, 'category.update', 'category', id);
  res.json({ category: serializeCategory(rows[0]) });
}));

router.delete('/categories/:id', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { rows: used } = await query('SELECT COUNT(*)::int AS n FROM products WHERE category_id = $1', [id]);
  if (used[0].n > 0) throw conflict('Déplacez ou supprimez d’abord les produits de cette catégorie.');
  const { rowCount } = await query('DELETE FROM categories WHERE id = $1', [id]);
  if (!rowCount) throw notFound('Catégorie introuvable.');
  await logAudit(req, 'category.delete', 'category', id);
  res.json({ message: 'Catégorie supprimée.' });
}));

/* -------------------------------- Médias -------------------------------- */
router.get('/media', asyncHandler(async (_req, res) => {
  const media = new Set();
  const scanDirs = [
    [config.uploadsDir, '/uploads'],
    [path.resolve(process.cwd(), 'public/products'), '/products'],
    [path.resolve(process.cwd(), '../client/public/products'), '/products'],
    [path.resolve(process.cwd(), '../client/dist/products'), '/products'],
    [path.resolve(process.cwd(), '../client/public/media'), '/media'],
    [path.resolve(process.cwd(), '../client/dist/media'), '/media'],
  ];
  for (const [dir, prefix] of scanDirs) {
    try {
      const files = await fs.readdir(dir);
      for (const f of files) {
        if (!/\.(png|jpe?g|webp|avif|svg|mp4|webm)$/i.test(f)) continue;
        media.add(`${prefix}/${f}`);
      }
    } catch {
      /* dossier absent */
    }
  }
  res.json({ media: [...media].sort() });
}));

export default router;
