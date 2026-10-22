import fs from 'node:fs/promises';
import path from 'node:path';
import { query } from '../db/pool.js';
import config from '../config.js';

const cache = new Map();
const CACHE_TTL = 60 * 1000;

export const esc = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const abs = (url) => (url?.startsWith('http') ? url : `${config.siteUrl}${url || '/brand/favicon-512.png'}`);

async function getSettings() {
  const { rows } = await query('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function organizationJsonLd(store, social) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: 'EdyEco',
    url: config.siteUrl,
    logo: abs('/brand/favicon-512.png'),
    image: abs('/brand/logo-lockup.png'),
    description:
      'EdyEco vend du bois de chauffage sec, des granulés de bois et des bûches compressées, livrés à domicile en France.',
    telephone: store?.phone,
    email: store?.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: store?.address || '',
      addressCountry: 'FR',
    },
    priceRange: '€€',
    sameAs: Object.values(social || {}).filter(Boolean),
  };
}

function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'EdyEco',
    url: config.siteUrl,
    inLanguage: 'fr-FR',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${config.siteUrl}/boutique?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

const STATIC_META = {
  '/': {
    title: 'EdyEco — Bois de chauffage sec, granulés et bûches compressées',
    description:
      "Bois de chauffage sec (moins de 20 % d'humidité), granulés ENplus A1 et bûches compressées. Vente directe producteur, livraison à domicile, paiement sécurisé.",
  },
  '/boutique': {
    title: 'Boutique — Bois de chauffage, granulés et bûches compressées | EdyEco',
    description:
      'Toute la gamme EdyEco : palettes et ballots de bois de chauffage 25 à 50 cm, granulés ENplus A1, bûches compressées et allume-feu. Livraison en France.',
  },
  '/livraison': {
    title: 'Livraison de bois de chauffage : classique ou confort | EdyEco',
    description:
      'Livraison classique par camion porteur ou livraison confort avec chariot élévateur. Délais, conditions d’accès et retrait entrepôt à Soulac-sur-Mer.',
  },
  '/faq': {
    title: 'FAQ — Toutes vos questions sur le bois de chauffage | EdyEco',
    description:
      'Délais de livraison, séchage du bois, longueur de bûches, granulés, retrait entrepôt : les réponses de l’équipe EdyEco.',
  },
  '/blog': {
    title: 'Conseils & guides bois de chauffage | EdyEco',
    description:
      'Guides pratiques sur le bois de chauffage, les granulés, le séchage, les essences et la livraison. Les conseils des experts EdyEco.',
  },
  '/contact': {
    title: 'Contact — EdyEco, bois de chauffage | EdyEco',
    description: 'Une question sur votre commande ou votre appareil de chauffage ? L’équipe EdyEco vous répond sous 24 h ouvrées.',
  },
  '/a-propos': {
    title: 'Qui sommes-nous ? — EdyEco, le bois de chauffage responsable',
    description:
      'EdyEco, spécialiste du bois de chauffage en circuit court : séchage contrôlé, essences locales, livraison soignée et service client disponible.',
  },
  '/mentions-legales': { title: 'Mentions légales | EdyEco', description: 'Mentions légales et informations éditeur du site EdyEco.' },
  '/cgv': { title: 'Conditions générales de vente | EdyEco', description: 'Conditions générales de vente EdyEco : commande, livraison, paiement, rétractation et garanties.' },
  '/confidentialite': { title: 'Politique de confidentialité | EdyEco', description: 'Comment EdyEco collecte et protège vos données personnelles, conformément au RGPD.' },
  '/panier': { title: 'Votre panier | EdyEco', description: 'Retrouvez les articles de votre panier EdyEco.', noindex: true },
  '/commande': { title: 'Votre commande | EdyEco', description: 'Finalisez votre commande de bois de chauffage.', noindex: true },
  '/paiement': { title: 'Paiement sécurisé | EdyEco', description: 'Paiement sécurisé de votre commande EdyEco.', noindex: true },
  '/compte': { title: 'Mon compte | EdyEco', description: 'Votre compte EdyEco.', noindex: true },
  '/connexion': { title: 'Connexion | EdyEco', description: 'Connectez-vous à votre compte EdyEco.', noindex: true },
  '/inscription': { title: 'Créer un compte | EdyEco', description: 'Créez votre compte EdyEco.', noindex: true },
  '/admin': { title: 'Administration | EdyEco', description: 'Espace administration EdyEco.', noindex: true },
};

export async function buildSeo(pathname) {
  const settings = await getSettings();
  const store = settings.store || {};
  const seoDefaults = settings.seo || {};
  const social = settings.social || {};
  const base = {
    title: seoDefaults.title,
    description: seoDefaults.description,
    canonical: `${config.siteUrl}${pathname === '/' ? '' : pathname}`,
    ogImage: abs(seoDefaults.ogImage || '/media/hero-fire-poster.jpg'),
    ogType: 'website',
    robots: 'index, follow',
    jsonLd: [organizationJsonLd(store, social), webSiteJsonLd()],
    noscript: '',
  };

  if (STATIC_META[pathname]) {
    Object.assign(base, STATIC_META[pathname]);
    if (STATIC_META[pathname].noindex) base.robots = 'noindex, nofollow';
  }

  if (pathname === '/') {
    const { rows } = await query('SELECT question, answer FROM faqs WHERE is_published = true ORDER BY position LIMIT 6');
    const { rows: products } = await query('SELECT name, slug FROM products WHERE is_active = true ORDER BY position LIMIT 6');
    if (rows.length) {
      base.jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: rows.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      });
    }
    base.noscript = `<h1>EdyEco — Bois de chauffage sec, granulés et bûches compressées</h1>
<p>${esc(seoDefaults.description)}</p>
<ul>${products.map((p) => `<li><a href="/produit/${esc(p.slug)}">${esc(p.name)}</a></li>`).join('')}</ul>`;
  }

  const productMatch = pathname.match(/^\/produit\/([a-z0-9-]+)$/i);
  if (productMatch) {
    const { rows } = await query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
         (SELECT ROUND(AVG(rating)::numeric,1) FROM reviews r WHERE r.product_id = p.id AND r.is_published) AS rating,
         (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.is_published) AS review_count
       FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.slug = $1 AND p.is_active = true`,
      [productMatch[1]]
    );
    const p = rows[0];
    if (p) {
      base.title = p.seo_title || `${p.name} | EdyEco`;
      base.description = p.seo_description || p.short_description.slice(0, 155);
      base.ogImage = abs(p.image_url);
      base.ogType = 'product';
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        image: [abs(p.image_url), ...(p.gallery || []).map(abs)],
        description: p.short_description,
        sku: p.sku,
        brand: { '@type': 'Brand', name: 'EdyEco' },
        category: p.category_name,
        url: base.canonical,
        offers: {
          '@type': 'Offer',
          url: base.canonical,
          priceCurrency: 'EUR',
          price: (p.price_cents / 100).toFixed(2),
          availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: 'EdyEco' },
        },
      };
      if (p.rating && p.review_count > 0) {
        jsonLd.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: Number(p.rating),
          reviewCount: Number(p.review_count),
          bestRating: 5,
        };
      }
      base.jsonLd.push(jsonLd, {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: config.siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Boutique', item: `${config.siteUrl}/boutique` },
          ...(p.category_slug
            ? [{ '@type': 'ListItem', position: 3, name: p.category_name, item: `${config.siteUrl}/categorie/${p.category_slug}` }]
            : []),
          { '@type': 'ListItem', position: p.category_slug ? 4 : 3, name: p.name, item: base.canonical },
        ],
      });
      base.noscript = `<h1>${esc(p.name)}</h1><p>${esc(p.short_description)}</p><p>Prix : ${(p.price_cents / 100).toFixed(2)} € — ${esc(p.unit)}</p>`;
    } else {
      base.robots = 'noindex, nofollow';
    }
  }

  const categoryMatch = pathname.match(/^\/categorie\/([a-z0-9-]+)$/i);
  if (categoryMatch) {
    const { rows } = await query(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active) AS n
       FROM categories c WHERE c.slug = $1 AND c.is_active = true`,
      [categoryMatch[1]]
    );
    const c = rows[0];
    if (c) {
      base.title = c.seo_title || `${c.name} — EdyEco`;
      base.description = c.seo_description || c.description.slice(0, 155);
      base.ogImage = abs(c.image_url);
      base.noscript = `<h1>${esc(c.name)}</h1><p>${esc(c.description)}</p>`;
    } else {
      base.robots = 'noindex, nofollow';
    }
  }

  const blogMatch = pathname.match(/^\/blog\/([a-z0-9-]+)$/i);
  if (blogMatch) {
    const { rows } = await query("SELECT * FROM blog_posts WHERE slug = $1 AND status = 'published'", [blogMatch[1]]);
    const post = rows[0];
    if (post) {
      base.title = post.seo_title || `${post.title} | EdyEco`;
      base.description = post.seo_description || post.excerpt.slice(0, 155);
      base.ogImage = abs(post.cover_url);
      base.ogType = 'article';
      base.jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt,
        image: abs(post.cover_url),
        datePublished: post.published_at,
        dateModified: post.updated_at,
        author: { '@type': 'Organization', name: post.author },
        publisher: { '@type': 'Organization', name: 'EdyEco', logo: { '@type': 'ImageObject', url: abs('/brand/favicon-512.png') } },
        mainEntityOfPage: base.canonical,
      });
      base.noscript = `<h1>${esc(post.title)}</h1><p>${esc(post.excerpt)}</p>`;
    } else {
      base.robots = 'noindex, nofollow';
    }
  }

  if (pathname === '/faq') {
    const { rows } = await query('SELECT question, answer FROM faqs WHERE is_published = true ORDER BY position');
    if (rows.length) {
      base.jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: rows.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      });
    }
    base.noscript = `<h1>FAQ EdyEco</h1>${rows.map((f) => `<h2>${esc(f.question)}</h2><p>${esc(f.answer)}</p>`).join('')}`;
  }

  return base;
}

export function renderSeoHead(meta, nonce) {
  const jsonLd = meta.jsonLd
    .map((obj) => `<script type="application/ld+json" nonce="${nonce}">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`)
    .join('\n    ');
  return `<title>${esc(meta.title)}</title>
    <meta name="description" content="${esc(meta.description)}">
    <meta name="robots" content="${esc(meta.robots)}">
    <link rel="canonical" href="${esc(meta.canonical)}">
    <meta property="og:site_name" content="EdyEco">
    <meta property="og:locale" content="fr_FR">
    <meta property="og:type" content="${esc(meta.ogType)}">
    <meta property="og:title" content="${esc(meta.title)}">
    <meta property="og:description" content="${esc(meta.description)}">
    <meta property="og:url" content="${esc(meta.canonical)}">
    <meta property="og:image" content="${esc(meta.ogImage)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(meta.title)}">
    <meta name="twitter:description" content="${esc(meta.description)}">
    <meta name="twitter:image" content="${esc(meta.ogImage)}">
    ${jsonLd}`;
}

export async function loadIndexHtml(distDir) {
  const file = path.join(distDir, 'index.html');
  const html = await fs.readFile(file, 'utf8');
  return html;
}

export function injectHtml(template, { head = '', noscript = '', nonce = '' }) {
  let html = template;
  if (template.includes('<!--SEO_HEAD-->')) {
    html = html.replace('<!--SEO_HEAD-->', head);
  } else {
    html = html.replace('</head>', `${head}\n</head>`);
  }
  if (nonce) {
    // Allow the Vite entry script under a nonce-based CSP.
    html = html.replace(/<script (?![^>]*\bnonce=)/g, `<script nonce="${nonce}" `);
  }
  if (noscript) {
    html = html.replace('<div id="root">', `<noscript>${noscript}</noscript>\n    <div id="root">`);
  }
  return html;
}

export async function cachedSeo(pathname) {
  const hit = cache.get(pathname);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.meta;
  const meta = await buildSeo(pathname);
  cache.set(pathname, { at: Date.now(), meta });
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  return meta;
}

export function clearSeoCache() {
  cache.clear();
}

export async function generateSitemap() {
  const base = config.siteUrl;
  const [{ rows: products }, { rows: posts }, { rows: cats }] = await Promise.all([
    query('SELECT slug, updated_at FROM products WHERE is_active = true'),
    query("SELECT slug, updated_at FROM blog_posts WHERE status = 'published'"),
    query('SELECT slug FROM categories WHERE is_active = true'),
  ]);
  const staticUrls = ['/', '/boutique', '/livraison', '/faq', '/blog', '/contact', '/a-propos', '/mentions-legales', '/cgv', '/confidentialite'];
  const url = (loc, lastmod, priority = '0.7', changefreq = 'weekly') =>
    `  <url><loc>${base}${loc}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.map((u) => url(u, null, u === '/' ? '1.0' : '0.8')).join('\n')}
${cats.map((c) => url(`/categorie/${c.slug}`, null, '0.8')).join('\n')}
${products.map((p) => url(`/produit/${p.slug}`, p.updated_at, '0.9')).join('\n')}
${posts.map((p) => url(`/blog/${p.slug}`, p.updated_at, '0.7')).join('\n')}
</urlset>`;
}

export const robotsTxt = () =>
  `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /compte\nDisallow: /paiement\nDisallow: /api\n\nSitemap: ${config.siteUrl}/sitemap.xml\n`;
