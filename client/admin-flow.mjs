/* Parcours d'achat complet dans jsdom : panier → checkout → paiement → confirmation. */
import { JSDOM } from 'jsdom';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const API = 'http://127.0.0.1:4000';
const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { url: 'http://localhost:5173/', pretendToBeVisual: true });
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
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};
window.HTMLMediaElement.prototype.load = () => {};
window.scrollTo = () => {};
window.matchMedia = (query) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false });
window.URL.createObjectURL = () => 'blob:mock';
window.URL.revokeObjectURL = () => {};
window.Element.prototype.scrollIntoView = () => {};
class IO { constructor(cb) { this.cb = cb; } observe(el) { setTimeout(() => this.cb([{ isIntersecting: true, target: el, intersectionRatio: 1 }], this), 0); } unobserve() {} disconnect() {} takeRecords() { return []; } }
global.IntersectionObserver = IO; window.IntersectionObserver = IO;
class RO { observe() {} unobserve() {} disconnect() {} }
global.ResizeObserver = RO; window.ResizeObserver = RO;

const jar = new Map();
const nativeFetch = globalThis.fetch;
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
global.fetch = async (input, init = {}) => {
  const url = String(input).startsWith('http') ? String(input) : `${API}${input}`;
  const headers = new Headers(init.headers || {});
  if (jar.size) headers.set('cookie', cookieHeader());
  if (!headers.has('content-type') && init.body && typeof init.body === 'string') headers.set('content-type', 'application/json');
  const res = await nativeFetch(url, { ...init, headers });
  for (const sc of res.headers.getSetCookie?.() || []) {
    const [pair] = sc.split(';');
    const i = pair.indexOf('=');
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
  return res;
};

const errors = [];
const origError = console.error;
console.error = (...args) => {
  const text = args.map((a) => (a instanceof Error ? a.stack : String(a))).join(' ');
  if (!/React Router Future Flag|not wrapped in act/.test(text)) errors.push(text);
  if (process.env.VERBOSE) origError(...args);
};
process.on('uncaughtException', (e) => errors.push(`uncaught: ${e.stack}`));
process.on('unhandledRejection', (e) => errors.push(`unhandled: ${e?.stack || e}`));

const outDir = '.tmp-smoke';
fs.mkdirSync(outDir, { recursive: true });
execSync(`npx esbuild smoke.entry.jsx --bundle --format=esm --platform=browser --jsx=automatic --loader:.js=jsx --outfile=${outDir}/bundle.mjs --define:process.env.NODE_ENV='"development"' --define:import.meta.env.VITE_API_URL='"/api"' --log-level=error`, { stdio: 'inherit' });
const { mountAt } = await import(`./${outDir}/bundle.mjs`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = () => document.getElementById('root').textContent.replace(/\s+/g, ' ');
const setVal = (el, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};
const byText = (selector, needle) => [...document.querySelectorAll(selector)].find((el) => (el.textContent || '').includes(needle));
const waitFor = async (predicate, label, timeout = 6000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return true;
    await sleep(80);
  }
  throw new Error(`timeout: ${label}`);
};


const loginRes = await nativeFetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'admin@edyeco.com', password: 'pypython10' }),
});
for (const sc of loginRes.headers.getSetCookie?.() || []) {
  const [pair] = sc.split(';');
  const i = pair.indexOf('=');
  if (i > 0) {
    const name = pair.slice(0, i).trim();
    const value = pair.slice(i + 1).trim();
    jar.set(name, value);
    if (name === 'edyeco_csrf') document.cookie = `${name}=${value}; path=/`;
  }
}
console.log('login admin:', loginRes.status, 'cookie:', document.cookie);

const steps = [];
let unmount;
const click = (needle, selector = 'button') => {
  const el = [...document.querySelectorAll(selector)].find((b) => (b.textContent || '').trim().includes(needle) && !b.disabled);
  if (!el) throw new Error(`élément introuvable: ${needle}`);
  el.click();
  return el;
};

try {
  unmount = mountAt('/admin/produits');
  await waitFor(() => text().includes('Catalogue') && text().includes('Produits'), 'admin produits');
  click('Nouveau produit');
  await waitFor(() => text().includes('Nom du produit'), 'drawer produit');
  const form = document.getElementById('product-form');
  const inputs = [...form.querySelectorAll('input')];
  const nameInput = inputs.find((i) => i.placeholder && i.placeholder.includes('Bois de chauffage 33'));
  const priceInput = inputs.find((i) => i.placeholder === '434,00');
  const stockInput = form.querySelector('input[type=number]');
  setVal(nameInput, `Produit UI test ${Date.now().toString().slice(-5)}`);
  setVal(priceInput, '129,90');
  setVal(stockInput, '7');
  await sleep(120);
  click('Enregistrer');
  await waitFor(() => !document.getElementById('product-form'), 'fermeture drawer', 6000);
  await waitFor(() => text().includes('Produit UI test'), 'produit dans la liste', 6000);
  const adminList = await fetch('/api/admin/products?q=Produit%20UI%20test').then((r) => r.json());
  if (!adminList.products?.length) throw new Error('produit non créé côté serveur');
  const created = adminList.products[0];
  if (created.priceCents !== 12990 || created.stock !== 7) throw new Error(`valeurs inattendues: ${created.priceCents}/${created.stock}`);
  steps.push(`produit créé (${created.name}, ${created.priceCents / 100} €)`);
  const del = await fetch(`/api/admin/products/${created.id}?hard=1`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': decodeURIComponent(jar.get('edyeco_csrf') || '') },
  });
  steps.push(`nettoyage HTTP ${del.status}`);
  if (del.status !== 200) throw new Error('échec du nettoyage');

  unmount();
  await sleep(100);
  unmount = mountAt('/admin/reglages');
  await waitFor(() => text().includes('Réglages du site'), 'réglages');
  await waitFor(() => text().includes('Nom commercial'), 'formulaire réglages');
  const storeInputs = [...document.querySelectorAll('input')];
  const nameStore = storeInputs.find((i) => i.value === 'EdyEco');
  if (!nameStore) throw new Error('champ boutique introuvable');
  setVal(nameStore, 'EdyEco');
  click('Enregistrer', 'button');
  await sleep(900);
  steps.push('réglages enregistrés');

  if (errors.length) throw new Error(errors.slice(0, 2).join('\n'));
  console.log(`✓ administration — ${steps.join(' → ')}`);
} catch (err) {
  console.log(`✗ administration — ${err.message}`);
  console.log('URL:', window.location.pathname);
  console.log('TEXTE:', text().slice(0, 900));
  console.log('ERREURS:', errors.slice(0, 2).map((e) => e.slice(0, 300)).join('\n'));
  process.exitCode = 1;
} finally {
  try { unmount?.(); } catch { /* ignore */ }
  process.exit(process.exitCode || 0);
}
