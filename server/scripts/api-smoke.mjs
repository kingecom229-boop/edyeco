/* Integration smoke test against a running EdyEco API (http://127.0.0.1:4000). */
const BASE = process.env.API_BASE || 'http://127.0.0.1:4000';
const jar = new Map();
let csrf = '';

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function absorb(res) {
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const sc of cookies) {
    const [pair] = sc.split(';');
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    jar.set(name, value);
    if (name === 'edyeco_csrf') csrf = decodeURIComponent(value);
  }
}

export async function call(method, path, body, { raw = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (jar.size) headers.cookie = cookieHeader();
  if (csrf && !['GET', 'HEAD'].includes(method)) headers['x-csrf-token'] = csrf;
  let payload = body;
  if (body !== undefined && !(body instanceof FormData)) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload, redirect: 'manual' });
  absorb(res);
  if (raw) return res;
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    results.push({ name, ok: false, detail: err.message });
    console.log(`✗ ${name} — ${err.message}`);
  }
}
function ok(cond, message) { if (!cond) throw new Error(message); }
function expectStatus(r, status) {
  if (r.status !== status) throw new Error(`HTTP ${r.status} (attendu ${status}) : ${JSON.stringify(r.data).slice(0, 300)}`);
}

const stamp = Date.now().toString().slice(-6);
const login = await call('POST', '/api/auth/login', { email: 'admin@edyeco.com', password: 'pypython10' });
expectStatus(login, 200);
ok(login.data.user.role === 'admin', 'rôle admin attendu');
await check('login admin + CSRF', async () => `utilisateur ${login.data.user.email}`);

await check('GET /api/settings', async () => {
  const r = await call('GET', '/api/settings');
  expectStatus(r, 200);
  ok(r.data.settings.store.name === 'EdyEco', 'nom boutique');
  return `${Object.keys(r.data.settings).length} clés`;
});
await check('GET /api/home', async () => {
  const r = await call('GET', '/api/home');
  expectStatus(r, 200);
  ok(Array.isArray(r.data.products) || Array.isArray(r.data.featured), 'produits absents');
  return 'ok';
});
await check('GET /api/search?q=bois', async () => {
  const r = await call('GET', '/api/search?q=bois');
  expectStatus(r, 200);
  return `${r.data.products?.length ?? 0} produits`;
});
await check('GET /api/products filtres', async () => {
  const r = await call('GET', '/api/products?category=bois-de-chauffage&length=33&sort=price_asc&limit=4');
  expectStatus(r, 200);
  ok(r.data.products.length > 0, 'aucun produit');
  return `${r.data.pagination.total} résultats`;
});
await check('GET /api/admin/stats', async () => {
  const r = await call('GET', '/api/admin/stats');
  expectStatus(r, 200);
  ok(typeof r.data.kpi?.revenueCents === 'number', 'kpi.revenueCents manquant');
  return `CA ${r.data.kpi.revenueCents}`;
});

let categoryId;
await check('POST /api/admin/categories', async () => {
  const r = await call('POST', '/api/admin/categories', { name: `Catégorie test ${stamp}`, description: 'Test', position: 99 });
  expectStatus(r, 201);
  categoryId = r.data.category.id;
  return `id ${categoryId}`;
});
await check('PATCH /api/admin/categories/:id', async () => {
  const r = await call('PATCH', `/api/admin/categories/${categoryId}`, { name: `Catégorie test ${stamp} modifiée` });
  expectStatus(r, 200);
  return r.data.category.name;
});

let productId;
await check('POST /api/admin/products', async () => {
  const r = await call('POST', '/api/admin/products', {
    name: `Produit test ${stamp}`, categoryId, priceCents: 1990, stock: 5, unit: 'test',
    shortDescription: 'Produit de test', description: 'Description de test', image: '/products/palette-50.png',
    logLengthCm: 33, volumeM3: 1.8, woodType: 'Chêne', moisture: '< 20 %', isActive: true, isFeatured: false,
    sku: `TEST-${Date.now()}`, seoTitle: 'Test', seoDescription: 'Test',
  });
  expectStatus(r, 201);
  productId = r.data.product.id;
  return `id ${productId}`;
});
await check('PATCH produit vedette', async () => {
  const r = await call('PATCH', `/api/admin/products/${productId}`, { isFeatured: true });
  expectStatus(r, 200);
  ok(r.data.product.isFeatured === true, 'isFeatured non mis à jour');
  return 'ok';
});
await check('GET /api/admin/products?q=', async () => {
  const r = await call('GET', '/api/admin/products?q=test&limit=5');
  expectStatus(r, 200);
  ok(r.data.products.some((p) => p.id === productId), 'produit test absent');
  return `${r.data.pagination.total} produits`;
});
await check('GET /api/admin/products/export', async () => {
  const r = await call('GET', '/api/admin/products/export', undefined, { raw: true });
  ok(r.status === 200, `HTTP ${r.status}`);
  const text = await r.text();
  ok(text.includes('name') && text.includes('slug'), 'entête CSV manquante');
  return `${text.split('\n').length} lignes`;
});
await check('POST /api/admin/products/import', async () => {
  const csv = `nom;categorie;prix;stock;unite;image;description_courte\nImport test;${categoryId};25,50;3;lot;/products/palette-50.png;Produit importé`;
  const r = await call('POST', '/api/admin/products/import', { csv });
  if (r.status !== 200 && r.status !== 201) throw new Error(`HTTP ${r.status} : ${JSON.stringify(r.data).slice(0, 300)}`);
  return `créés: ${r.data.created?.length ?? 0}, erreurs: ${r.data.errors?.length ?? 0}`;
});

await check('GET /api/admin/media', async () => {
  const r = await call('GET', '/api/admin/media');
  expectStatus(r, 200);
  ok(Array.isArray(r.data.media), 'media[] manquant');
  return `${r.data.media.length} fichiers`;
});
await check('POST /api/admin/uploads (multipart)', async () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63fcffff3f0300050001a5f645400000000049454e44ae426082', 'hex');
  const form = new FormData();
  form.append('file', new Blob([png], { type: 'image/png' }), 'test.png');
  const r = await call('POST', '/api/admin/uploads', form);
  expectStatus(r, 201);
  ok(r.data.url.startsWith('/uploads/'), 'url invalide');
  return r.data.url;
});

await check('GET /api/admin/orders', async () => {
  const r = await call('GET', '/api/admin/orders?limit=5');
  expectStatus(r, 200);
  ok(Array.isArray(r.data.orders), 'orders[] manquant');
  return `${r.data.pagination.total} commandes`;
});
let orderId;
let orderReference;
await check('GET /api/admin/orders/:id + invoice', async () => {
  const list = await call('GET', '/api/admin/orders?limit=1');
  const order = list.data.orders[0];
  ok(order, 'aucune commande');
  orderId = order.id; orderReference = order.reference;
  const detail = await call('GET', `/api/admin/orders/${orderId}`);
  expectStatus(detail, 200);
  const invoice = await call('GET', `/api/admin/orders/${orderId}/invoice`, undefined, { raw: true });
  ok(invoice.status === 200, `facture HTTP ${invoice.status}`);
  return `${orderReference}`;
});
await check('PATCH /api/admin/orders/:id (statut)', async () => {
  const r = await call('PATCH', `/api/admin/orders/${orderId}`, { adminNote: 'Note de test', trackingNumber: 'TRACK123' });
  expectStatus(r, 200);
  return 'ok';
});
await check('GET /api/admin/orders/export', async () => {
  const r = await call('GET', '/api/admin/orders/export', undefined, { raw: true });
  ok(r.status === 200, `HTTP ${r.status}`);
  return `${(await r.text()).split('\n').length} lignes`;
});
await check('GET /api/admin/customers + détail + export', async () => {
  const list = await call('GET', '/api/admin/customers?limit=5');
  expectStatus(list, 200);
  ok(Array.isArray(list.data.customers), 'customers[] manquant');
  if (list.data.customers[0]) {
    const detail = await call('GET', `/api/admin/customers/${list.data.customers[0].id}`);
    expectStatus(detail, 200);
  }
  const exp = await call('GET', '/api/admin/customers/export', undefined, { raw: true });
  ok(exp.status === 200, `export HTTP ${exp.status}`);
  return `${list.data.customers.length} clients`;
});
await check('GET /api/admin/carts/abandoned', async () => {
  const r = await call('GET', '/api/admin/carts/abandoned');
  expectStatus(r, 200);
  return `${r.data.carts?.length ?? 0} paniers`;
});

let postId;
await check('POST /api/admin/blog', async () => {
  const r = await call('POST', '/api/admin/blog', {
    title: `Article test ${stamp}`, excerpt: 'Extrait', content: '## Sous-titre\n\nContenu de test suffisamment long.',
    category: 'Conseils', status: 'published', cover: '/products/palette-50.png',
    tags: ['test'], readMinutes: 3, seoTitle: 'Test', seoDescription: 'Test',
  });
  expectStatus(r, 201);
  postId = r.data.post.id;
  return `id ${postId}`;
});
await check('GET /api/admin/blog/:id', async () => {
  const r = await call('GET', `/api/admin/blog/${postId}`);
  expectStatus(r, 200);
  ok(r.data.post.content.includes('Sous-titre'), 'contenu manquant');
  return 'ok';
});
await check('PATCH /api/admin/blog/:id', async () => {
  const r = await call('PATCH', `/api/admin/blog/${postId}`, { title: `Article test ${stamp} modifié` });
  expectStatus(r, 200);
  return 'ok';
});

let faqId;
await check('POST/PATCH /api/admin/faqs', async () => {
  const c = await call('POST', '/api/admin/faqs', { question: `Question de test ${stamp} ?`, answer: 'Réponse de test.', category: 'Général', position: 50, isPublished: true });
  expectStatus(c, 201);
  faqId = c.data.faq.id;
  const p = await call('PATCH', `/api/admin/faqs/${faqId}`, { answer: 'Réponse modifiée.', isPublished: false });
  expectStatus(p, 200);
  const l = await call('GET', '/api/admin/faqs');
  expectStatus(l, 200);
  ok(l.data.faqs.some((f) => f.id === faqId), 'faq absente');
  return 'ok';
});

let discountId;
await check('POST/PATCH /api/admin/discounts', async () => {
  const c = await call('POST', '/api/admin/discounts', { code: `TEST${Date.now() % 100000}`, type: 'percent', value: 5, minOrderCents: 0, maxUses: 10, isActive: true });
  expectStatus(c, 201);
  discountId = c.data.discount.id;
  const p = await call('PATCH', `/api/admin/discounts/${discountId}`, { isActive: false });
  expectStatus(p, 200);
  return 'ok';
});
await check('GET /api/discounts/BIENVENUE10', async () => {
  const r = await call('GET', '/api/discounts/BIENVENUE10');
  expectStatus(r, 200);
  return `${r.data.discount?.value ?? '?'}`;
});

await check('GET /api/admin/reviews + modération', async () => {
  const list = await call('GET', '/api/admin/reviews?status=all');
  expectStatus(list, 200);
  const review = list.data.reviews?.[0];
  if (review) {
    const before = review.is_published;
    const p = await call('PATCH', `/api/admin/reviews/${review.id}`, { isPublished: !before });
    expectStatus(p, 200);
    await call('PATCH', `/api/admin/reviews/${review.id}`, { isPublished: before });
  }
  return `${list.data.reviews?.length ?? 0} avis`;
});

await check('GET /api/admin/newsletter + export', async () => {
  const r = await call('GET', '/api/admin/newsletter');
  expectStatus(r, 200);
  ok(r.data.stats, 'stats manquantes');
  const exp = await call('GET', '/api/admin/newsletter/export', undefined, { raw: true });
  ok(exp.status === 200, `export HTTP ${exp.status}`);
  return `${r.data.pagination.total} abonnés`;
});

await check('POST /api/newsletter (public)', async () => {
  const r = await call('POST', '/api/newsletter', { email: `smoke-${Date.now()}@example.com`, consent: true, source: 'test' });
  if (r.status !== 200 && r.status !== 201) throw new Error(`HTTP ${r.status} : ${JSON.stringify(r.data)}`);
  return 'ok';
});
await check('POST /api/contact', async () => {
  const r = await call('POST', '/api/contact', { name: 'Smoke', email: 'smoke@example.com', phone: '0612345678', subject: 'Test', message: 'Message de test suffisamment long.', consent: true });
  if (r.status !== 200 && r.status !== 201) throw new Error(`HTTP ${r.status} : ${JSON.stringify(r.data)}`);
  return 'ok';
});
await check('GET/PATCH /api/admin/messages', async () => {
  const list = await call('GET', '/api/admin/messages');
  expectStatus(list, 200);
  const m = list.data.messages?.[0];
  if (m) {
    const p = await call('PATCH', `/api/admin/messages/${m.id}`, { status: 'read' });
    expectStatus(p, 200);
  }
  return `${list.data.messages?.length ?? 0} messages`;
});
await check('POST /api/admin/campaigns', async () => {
  const r = await call('POST', '/api/admin/campaigns', { subject: 'Campagne test', content: 'Contenu de campagne suffisamment long.' });
  if (r.status !== 201 && r.status !== 200) throw new Error(`HTTP ${r.status} : ${JSON.stringify(r.data).slice(0, 200)}`);
  return 'ok';
});

await check('GET/PUT /api/admin/settings', async () => {
  const r = await call('GET', '/api/admin/settings');
  expectStatus(r, 200);
  ok(r.data.settings.store, 'store manquant');
  const put = await call('PUT', '/api/admin/settings', { key: 'settings', value: { test: true } });
  ok(put.status === 400 || put.status === 200, `réponse inattendue ${put.status}`);
  return 'ok';
});
await check('GET /api/admin/analytics', async () => {
  const r = await call('GET', '/api/admin/analytics?days=7');
  expectStatus(r, 200);
  ok(Array.isArray(r.data.byName), 'byName manquant');
  return 'ok';
});
await check('GET /api/admin/audit', async () => {
  const r = await call('GET', '/api/admin/audit');
  expectStatus(r, 200);
  ok(Array.isArray(r.data.entries), 'entries manquant');
  return `${r.data.pagination?.total ?? 0} entrées`;
});

await check('Nettoyage campagne + message + abonné', async () => {
  const camps = await call('GET', '/api/admin/campaigns');
  for (const c of camps.data.campaigns || []) {
    if (/test/i.test(c.subject)) await call('DELETE', `/api/admin/campaigns/${c.id}`);
  }
  const msgs = await call('GET', '/api/admin/messages');
  for (const m of msgs.data.messages || []) {
    if (m.email === 'smoke@example.com') await call('DELETE', `/api/admin/messages/${m.id}`);
  }
  const subs = await call('GET', '/api/admin/newsletter?limit=100');
  for (const sub of subs.data.subscribers || []) {
    if (sub.email.startsWith('smoke-')) await call('DELETE', `/api/admin/newsletter/${sub.id}`);
  }
  const imports = await call('GET', '/api/admin/products?q=Import%20test&limit=50');
  for (const p of imports.data.products || []) {
    if (/import test/i.test(p.name)) await call('DELETE', `/api/admin/products/${p.id}?hard=1`);
  }
  return 'ok';
});

await check('POST /api/analytics (public)', async () => {
  const r = await call('POST', '/api/analytics', { name: 'page_view', path: '/smoke', meta: {} });
  if (r.status !== 200 && r.status !== 201 && r.status !== 204) throw new Error(`HTTP ${r.status}`);
  return 'ok';
});

/* ------------------------------- Nettoyage ------------------------------- */
await check('DELETE données de test', async () => {
  const del = [
    ...(productId ? [['DELETE', `/api/admin/products/${productId}?hard=1`]] : []),
    ...(postId ? [['DELETE', `/api/admin/blog/${postId}`]] : []),
    ...(faqId ? [['DELETE', `/api/admin/faqs/${faqId}`]] : []),
    ...(discountId ? [['DELETE', `/api/admin/discounts/${discountId}`]] : []),
    ...(categoryId ? [['DELETE', `/api/admin/categories/${categoryId}`]] : []),
  ];
  for (const [m, p] of del) {
    const r = await call(m, p);
    if (![200, 204, 404, 409].includes(r.status)) throw new Error(`${p} → HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 160)}`);
  }
  return 'ok';
});

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} contrôles OK`);
if (failed.length) process.exitCode = 1;
