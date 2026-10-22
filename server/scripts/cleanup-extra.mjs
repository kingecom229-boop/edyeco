const BASE = 'http://127.0.0.1:4000';
const jar = new Map();
let csrf = '';
const absorb = (r) => { for (const sc of r.headers.getSetCookie?.() || []) { const [p] = sc.split(';'); const i = p.indexOf('='); const n = p.slice(0, i).trim(); jar.set(n, p.slice(i + 1).trim()); if (n === 'edyeco_csrf') csrf = decodeURIComponent(p.slice(i + 1).trim()); } };
async function call(method, path, body) {
  const headers = { Accept: 'application/json', cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
  if (csrf && method !== 'GET') headers['x-csrf-token'] = csrf;
  let payload = body;
  if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  absorb(res);
  const t = await res.text(); let d; try { d = JSON.parse(t); } catch { d = t; }
  return { status: res.status, data: d };
}
await call('POST', '/api/auth/login', { email: 'admin@edyeco.com', password: 'pypython10' });
for (const m of (await call('GET', '/api/admin/messages')).data.messages.filter((x) => x.email === 'smoke@example.com')) {
  console.log('msg', m.id, (await call('DELETE', `/api/admin/messages/${m.id}`)).status);
}
for (const c of (await call('GET', '/api/admin/campaigns')).data.campaigns) {
  console.log('campagne', c.id, c.subject, (await call('DELETE', `/api/admin/campaigns/${c.id}`)).status);
}
