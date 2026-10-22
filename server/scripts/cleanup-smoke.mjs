const BASE = 'http://127.0.0.1:4000';
const jar = new Map();
let csrf = '';
const absorb = (res) => {
  for (const sc of res.headers.getSetCookie?.() || []) {
    const [pair] = sc.split(';');
    const i = pair.indexOf('=');
    const name = pair.slice(0, i).trim();
    jar.set(name, pair.slice(i + 1).trim());
    if (name === 'edyeco_csrf') csrf = decodeURIComponent(pair.slice(i + 1).trim());
  }
};
async function call(method, path, body) {
  const headers = { Accept: 'application/json', cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
  if (csrf && method !== 'GET') headers['x-csrf-token'] = csrf;
  let payload = body;
  if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  absorb(res);
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}
const login = await call('POST', '/api/auth/login', { email: 'admin@edyeco.com', password: 'pypython10' });
console.log('login', login.status);

const products = await call('GET', '/api/admin/products?limit=100');
for (const p of (products.data.products || []).filter((x) => /test|import/i.test(x.name))) {
  const r = await call('DELETE', `/api/admin/products/${p.id}?hard=1`);
  console.log('produit', p.id, p.name, '→', r.status);
}
const cats = await call('GET', '/api/admin/categories');
for (const c of (cats.data.categories || []).filter((x) => /test/i.test(x.name))) {
  const r = await call('DELETE', `/api/admin/categories/${c.id}`);
  console.log('catégorie', c.id, c.name, '→', r.status);
}
const blog = await call('GET', '/api/admin/blog');
for (const b of (blog.data.posts || []).filter((x) => /test/i.test(x.title))) {
  const r = await call('DELETE', `/api/admin/blog/${b.id}`);
  console.log('article', b.id, b.title, '→', r.status);
}
const faqs = await call('GET', '/api/admin/faqs');
for (const f of (faqs.data.faqs || []).filter((x) => /test/i.test(x.question))) {
  const r = await call('DELETE', `/api/admin/faqs/${f.id}`);
  console.log('faq', f.id, '→', r.status);
}
const discounts = await call('GET', '/api/admin/discounts');
for (const d of (discounts.data.discounts || []).filter((x) => x.code.startsWith('TEST'))) {
  const r = await call('DELETE', `/api/admin/discounts/${d.id}`);
  console.log('promo', d.code, '→', r.status);
}
const messages = await call('GET', '/api/admin/messages');
for (const m of (messages.data.messages || []).filter((x) => x.email === 'smoke@example.com')) {
  const r = await call('PATCH', `/api/admin/messages/${m.id}`, { status: 'replied', reply: 'Nettoyage de test' });
  console.log('message', m.id, '→', r.status);
}
const subs = await call('GET', '/api/admin/newsletter?limit=100');
for (const s of (subs.data.subscribers || []).filter((x) => x.email.startsWith('smoke-'))) {
  const r = await call('DELETE', `/api/admin/newsletter/${s.id}`);
  console.log('abonné', s.email, '→', r.status);
}
const campaigns = await call('GET', '/api/admin/campaigns');
console.log('campagnes restantes', campaigns.data.campaigns?.length);
