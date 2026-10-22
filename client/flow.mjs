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

const steps = [];
let unmount;
try {
  unmount = mountAt('/produit/bois-de-chauffage-33-cm-palette-27-steres');
  await waitFor(() => text().includes('Ajouter au panier'), 'produit chargé');
  await waitFor(() => {
    const b = byText('button', 'Ajouter au panier');
    return b && !b.disabled;
  }, 'bouton panier actif');
  const add = byText('button', 'Ajouter au panier');
  add.click();
  let cart = null;
  await waitFor(async () => false, 'noop', 10).catch(() => {});
  for (let i = 0; i < 50; i += 1) {
    cart = await fetch('/api/cart').then((r) => r.json());
    if (cart.cart?.items?.length) break;
    await sleep(120);
  }
  if (!cart?.cart?.items?.length) throw new Error(`panier vide après ajout${errors.length ? ` — ${errors[0].slice(0, 300)}` : ''}`);
  steps.push(`ajout panier (${cart.cart.count} article(s))`);
  unmount();
  await sleep(150);

  unmount = mountAt('/commande');
  await waitFor(() => text().includes('Vos coordonnées'), 'checkout chargé');
  setVal(document.getElementById('field-Prénom'), 'Camille');
  setVal(document.getElementById('field-Nom'), 'Martin');
  setVal(document.getElementById('field-Email'), `camille.${Date.now()}@example.com`);
  setVal(document.getElementById('field-Téléphone'), '0612345678');
  setVal(document.getElementById('field-Adresse'), '12 rue des Chênes');
  setVal(document.getElementById('field-Code postal'), '44300');
  setVal(document.getElementById('field-Ville'), 'Nantes');
  const termsLabel = [...document.querySelectorAll('label')].find((l) => l.textContent.includes('J’accepte'));
  const terms = termsLabel.querySelector('input[type=checkbox]');
  terms.click();
  if (!terms.checked) throw new Error('case CGV non cochée');
  await sleep(250);
  const submit = byText('button', 'Continuer vers le paiement');
  if (!submit) throw new Error('bouton de commande introuvable');
  submit.click();
  await sleep(1500);
  if (!window.location.pathname.startsWith('/paiement/')) {
    console.log('DEBUG inputs:', ['field-Prénom','field-Nom','field-Email','field-Téléphone','field-Adresse','field-Code postal','field-Ville'].map((id) => `${id}=${document.getElementById(id)?.value}`).join(' | '));
    console.log('DEBUG erreurs page:', [...document.querySelectorAll('.text-rose-600, .input-error')].map((e) => e.textContent).join(' / '));
    console.log('DEBUG console:', errors.slice(0, 3).map((e) => e.slice(0, 400)).join('\n'));
  }
  await waitFor(() => window.location.pathname.startsWith('/paiement/'), 'redirection paiement', 8000);
  const reference = window.location.pathname.split('/').pop();
  steps.push(`commande ${reference} créée`);

  unmount();
  await sleep(150);
  unmount = mountAt(window.location.pathname);
  await waitFor(() => text().includes('Numéro de carte') || text().includes('Paiement'), 'page paiement');
  setVal(document.getElementById('card-number'), '4242424242424242');
  setVal(document.getElementById('card-holder'), 'Camille Martin');
  setVal(document.getElementById('card-expiry'), '12/30');
  setVal(document.getElementById('card-cvc'), '123');
  await sleep(150);
  const payButton = [...document.querySelectorAll('button')].find((b) => /Payer/i.test(b.textContent || ''));
  if (!payButton) throw new Error('bouton payer introuvable');
  payButton.click();
  await waitFor(() => window.location.pathname.startsWith('/confirmation/'), 'confirmation', 10000);
  await sleep(300);
  if (!/Merci|confirmée/i.test(text())) throw new Error('confirmation non affichée');
  steps.push('paiement simulé + confirmation');

  if (errors.length) throw new Error(errors.slice(0, 2).join('\n'));
  console.log(`✓ parcours d'achat complet — ${steps.join(' → ')}`);
} catch (err) {
  console.log(`✗ parcours d'achat — ${err.message}`);
  console.log('URL:', window.location.pathname);
  console.log('TEXTE:', text().slice(0, 600));
  process.exitCode = 1;
} finally {
  try { unmount?.(); } catch { /* ignore */ }
  process.exit(process.exitCode || 0);
}
