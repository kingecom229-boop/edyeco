/* Smoke test: rend chaque route dans jsdom contre l'API locale. */
import { JSDOM } from 'jsdom';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const API = 'http://127.0.0.1:4000';
const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
});

const { window } = dom;
global.window = window;
global.document = window.document;
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true });
global.HTMLElement = window.HTMLElement;
global.Element = window.Element;
global.Node = window.Node;
global.Event = window.Event;
global.MouseEvent = window.MouseEvent;
global.screen = window.screen;
global.localStorage = window.localStorage;
global.sessionStorage = window.sessionStorage;
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = clearTimeout;
global.IS_REACT_ACT_ENVIRONMENT = false;

window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};
window.HTMLMediaElement.prototype.load = () => {};
window.scrollTo = () => {};
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
});
window.URL.createObjectURL = () => 'blob:mock';
window.URL.revokeObjectURL = () => {};
window.Element.prototype.scrollIntoView = () => {};

class IO {
  constructor(cb) { this.cb = cb; }
  observe(el) { setTimeout(() => this.cb([{ isIntersecting: true, target: el, intersectionRatio: 1 }], this), 0); }
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
global.IntersectionObserver = IO;
window.IntersectionObserver = IO;
class RO { observe() {} unobserve() {} disconnect() {} }
global.ResizeObserver = RO;
window.ResizeObserver = RO;

const jar = new Map();
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

const nativeFetch = globalThis.fetch;

global.fetch = async (input, init = {}) => {
  const url = String(input).startsWith('http') ? String(input) : `${API}${input}`;
  const headers = new Headers(init.headers || {});
  if (jar.size) headers.set('cookie', cookieHeader());
  if (!headers.has('content-type') && init.body && typeof init.body === 'string') headers.set('content-type', 'application/json');
  const res = await nativeFetch(url, { ...init, headers, redirect: 'manual' });
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const [pair] = sc.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
  return res;
};

const errors = [];
const origError = console.error;
console.error = (...args) => {
  const text = args.map((a) => (a instanceof Error ? a.stack : String(a))).join(' ');
  if (!/React Router Future Flag|Warning:.*act\(|not wrapped in act/.test(text)) errors.push(text);
  if (process.env.VERBOSE) origError(...args);
};
process.on('uncaughtException', (e) => errors.push(`uncaught: ${e.stack}`));
process.on('unhandledRejection', (e) => { console.log('REJECTION:', e?.stack || e); errors.push(`unhandled: ${e?.stack || e}`); });

const outDir = '.tmp-smoke';
fs.mkdirSync(outDir, { recursive: true });
execSync(
  `npx esbuild smoke.entry.jsx --bundle --format=esm --platform=browser --jsx=automatic --loader:.js=jsx --outfile=${outDir}/bundle.mjs --define:process.env.NODE_ENV='"development"' --define:import.meta.env.VITE_API_URL='"/api"' --log-level=error`,
  { stdio: 'inherit' }
);

console.log('bundle built');
const { mountAt } = await import(`./${outDir}/bundle.mjs`);
console.log('bundle imported');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Connexion admin pour tester l'espace d'administration.
console.log('before login');
const login = await nativeFetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'admin@edyeco.com', password: 'pypython10' }),
});
const loginData = await login.json();
const setCookies = login.headers.getSetCookie();
for (const sc of setCookies) {
  const [pair] = sc.split(';');
  const idx = pair.indexOf('=');
  if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
}
console.log('login admin:', login.status, loginData.user?.role || loginData.error?.message);

const routes = [
  '/', '/boutique', '/boutique/bois-de-chauffage', '/produit/bois-de-chauffage-33-cm-palette-27-steres',
  '/panier', '/blog', '/faq', '/livraison', '/a-propos', '/contact', '/mentions-legales', '/cgv',
  '/confidentialite', '/connexion', '/inscription', '/mot-de-passe-oublie', '/reinitialiser-mot-de-passe?token=abc',
  '/compte', '/compte/commandes', '/compte/profil',
  '/admin', '/admin/produits', '/admin/categories', '/admin/commandes', '/admin/clients', '/admin/paniers',
  '/admin/avis', '/admin/promos', '/admin/blog', '/admin/faq', '/admin/newsletter', '/admin/messages',
  '/admin/reglages', '/admin/analytics', '/admin/journal', '/route-inconnue',
];

let failures = 0;
for (const path of routes) {
  errors.length = 0;
  let unmount = null;
  try {
    unmount = mountAt(path);
    await sleep(path.startsWith('/admin') ? 700 : 550);
    const text = document.getElementById('root').textContent || '';
    if (text.trim().length < 40) throw new Error(`page quasi vide (${text.trim().length} caractères)`);
    if (errors.length) throw new Error(errors.slice(0, 2).join('\n---\n'));
    if (process.env.DUMP && process.env.DUMP === path) console.log('---TEXT---\n' + text.replace(/\s+/g, ' ').slice(0, 1200));
    console.log(`✓ ${path} (${text.trim().length} car.)`);
  } catch (err) {
    failures += 1;
    console.log(`✗ ${path}\n  ${String(err.message).slice(0, 900).replace(/\n/g, '\n  ')}`);
  } finally {
    try { unmount?.(); } catch { /* ignore */ }
    await sleep(50);
  }
}

console.log(`\n${routes.length - failures}/${routes.length} routes OK`);
process.exit(failures ? 1 : 0);
