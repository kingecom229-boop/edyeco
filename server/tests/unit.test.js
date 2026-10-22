import test from 'node:test';
import assert from 'node:assert/strict';
import { money, slugify, parsePagination, toCsv } from '../src/lib/text.js';
import { renderMarkdown } from '../src/lib/markdown.js';
import { product, blogPost, order } from '../src/lib/serialize.js';
import { payments } from '../src/services/payments.js';
import config from '../src/config.js';

test('slugify normalise les accents et la ponctuation', () => {
  assert.equal(slugify('Bûches de chauffage — 33 cm / palette'), 'buches-de-chauffage-33-cm-palette');
  assert.equal(slugify('   Édition 2026 !  '), 'edition-2026');
  assert.equal(slugify(''), '');
});

test('parsePagination borne page et limite', () => {
  assert.deepEqual(parsePagination({ query: {} }, { defaultLimit: 12, maxLimit: 48 }), { page: 1, limit: 12, offset: 0 });
  assert.deepEqual(parsePagination({ query: { page: '3', limit: '999' } }, { maxLimit: 48 }), { page: 3, limit: 48, offset: 96 });
  assert.deepEqual(parsePagination({ query: { page: '-4', limit: 'abc' } }, { defaultLimit: 20 }), { page: 1, limit: 20, offset: 0 });
});

test('toCsv échappe les séparateurs et ajoute le BOM', () => {
  const csv = toCsv([{ name: 'Chêne; 33 cm', price: 12.5 }], [
    { label: 'nom', key: 'name' },
    { label: 'prix', key: 'price' },
  ]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"Chêne; 33 cm";12\.5/);
});

test('money convertit les centimes en euros', () => {
  assert.equal(money(1290), 12.9);
  assert.equal(money(null), 0);
  assert.equal(money('990'), 9.9);
});

test('markdown échappe le HTML et applique les titres/listes', () => {
  const html = renderMarkdown('## Titre\n\nTexte <script>alert(1)</script>\n\n- un\n- deux\n\n**gras** et [lien](https://example.com)');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('<h2>Titre</h2>'));
  assert.ok(html.includes('<ul>') && html.includes('<li>un</li>'));
  assert.ok(html.includes('<strong>gras</strong>'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
});

test('markdown neutralise les javascript: dans les liens', () => {
  const html = renderMarkdown('[clic](javascript:alert(1))');
  assert.ok(!html.includes('href="javascript:'));
});

test('serialize produit expose cents et euros', () => {
  const p = product({
    id: 1, slug: 'bois', name: 'Bois', sku: 'X1', category_slug: 'bois-de-chauffage', category_name: 'Bois',
    short_description: 'Court', description: 'Long', price_cents: 43400, compare_at_cents: 49900, stock: 4,
    unit: 'palette', log_length_cm: 33, volume_m3: '1.80', wood_type: 'Chêne', moisture: '< 20 %',
    image_url: '/products/palette-33.png', gallery: [], badges: ['Bois sec'], is_active: true, is_featured: true,
    delivery_class: 'classique', weight_kg: 900, position: 1, rating: '4.8', review_count: 2,
    seo_title: 't', seo_description: 'd', created_at: new Date(), updated_at: new Date(),
  });
  assert.equal(p.price, 434);
  assert.equal(p.priceCents, 43400);
  assert.equal(p.compareAtPrice, 499);
  assert.equal(p.category.slug, 'bois-de-chauffage');
  assert.equal(p.volumeM3, 1.8);
  assert.equal(p.inStock, true);
});

test('serialize commande calcule les lignes et les montants', () => {
  const o = order(
    { id: 1, reference: 'EDY-1', email: 'a@b.fr', customer_name: 'A', total_cents: 43400, subtotal_cents: 43400, discount_cents: 0, delivery_fee_cents: 0, status: 'paid', created_at: new Date(), updated_at: new Date() },
    [{ id: 2, product_id: 3, product_slug: 'bois', name: 'Bois', image_url: '/x.png', unit_price_cents: 21700, quantity: 2, line_total_cents: 43400 }]
  );
  assert.equal(o.total, 434);
  assert.equal(o.items[0].lineTotal, 434);
  assert.equal(o.items[0].quantity, 2);
});

test('paiement simulé : carte valide acceptée, refus et Luhn gérés', () => {
  const valid = payments.confirm({ order: { total_cents: 1000 }, card: { number: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' } });
  assert.equal(valid.ok, true);
  assert.equal(valid.last4, '4242');
  assert.equal(valid.brand, 'Visa');

  const declined = payments.confirm({ order: { total_cents: 1000 }, card: { number: '4000 0000 0000 0002', expiry: '12/30', cvc: '123' } });
  assert.equal(declined.ok, false);
  assert.equal(declined.declined, true);

  const invalid = payments.confirm({ order: { total_cents: 1000 }, card: { number: '1234', expiry: '12/30', cvc: '123' } });
  assert.equal(invalid.ok, false);
});

test('configuration : secret JWT de dev suffisant, mode paiement simulation', () => {
  assert.ok(config.jwtSecret.length >= 32);
  assert.equal(config.stripe.mode, 'simulation');
  assert.equal(config.admin.email, 'admin@edyeco.com');
});
