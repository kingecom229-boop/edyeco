# EdyEco — boutique en ligne de bois de chauffage

EdyEco est une boutique e-commerce complète, pensée comme une **machine à convertir** : identité de marque issue du logo fourni, tunnel d'achat court, preuve sociale, contenus éditoriaux SEO et back-office complet pour piloter le catalogue, les commandes et les campagnes.

> Le paiement est **simulé** (mode démonstration). L'architecture est prête pour Stripe (voir plus bas). Aucun débit réel n'est effectué.

---

## Sommaire

- [Aperçu](#aperçu)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Compte administrateur](#compte-administrateur)
- [Scripts](#scripts)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [Paiement simulé & passage à Stripe](#paiement-simulé--passage-à-stripe)
- [SEO](#seo)
- [Sécurité](#sécurité)
- [Tests & vérifications](#tests--vérifications)
- [Docker](#docker)
- [Déploiement en production](#déploiement-en-production)
- [Structure du projet](#structure-du-projet)
- [Accessibilité & performance](#accessibilité--performance)
- [Crédits & inspiration](#crédits--inspiration)

---

## Aperçu

**Boutique**

- Accueil éditorial avec **vidéo de feu de bois en plein écran** (MP4 + WebM + poster), animations discrètes et accent 3D (bûches flottantes) chargé uniquement à la demande.
- Catalogue filtrable (catégorie, longueur de bûche, tri, recherche), fiches produit détaillées (humidité, essence, volume, stock, avis, produits liés).
- Panier persistant (cookie + fusion au login), livraison classique / confort / retrait, codes promo, seuil de livraison offerte.
- Tunnel de commande en 4 étapes, **page de paiement simulée** (cartes de test, refus géré), confirmation, emails transactionnels (simulés sans SMTP).
- Blog, FAQ, pages livraison, à propos, contact, mentions légales, CGV, confidentialité.
- Espace client : commandes, suivi, informations, changement de mot de passe, suppression de compte.

**Back-office** (`/admin`)

- Tableau de bord (CA, panier moyen, commandes, taux de conversion panier, paniers abandonnés, abonnés, stock faible).
- Produits : création/édition, médiathèque et upload, mise en avant, archivage, **import/export CSV**.
- Catégories, commandes (statuts, suivi, note interne, facture imprimable, export CSV), clients (historique, export), paniers abandonnés (relance email, marquage).
- Blog & guides (Markdown), FAQ, avis (modération), codes promo, newsletter (abonnés, export, campagnes), messages de contact, réglages du site, analytics interne, journal d'audit.

## Stack technique

| Couche | Technologies |
| --- | --- |
| Frontend | React 19, Vite 6, React Router 7, Tailwind CSS 3, Framer Motion, Three.js / React Three Fiber, Lucide |
| Backend | Node.js 20+, Express 4, Zod, JWT (cookie httpOnly), bcryptjs, Multer, Nodemailer, Helmet, express-rate-limit |
| Base de données | PostgreSQL 14+ (production) · **PGlite** embarqué (dev/démo, zéro installation) |
| Tests | `node:test`, jsdom (parcours UI), script d'intégration API |
| Déploiement | Docker multi-stage, docker compose, compatible Render / Railway / Fly.io / VPS |

## Démarrage rapide

Prérequis : **Node.js ≥ 20** et npm. Aucun PostgreSQL à installer : le serveur démarre une instance PGlite embarquée et applique migrations + seed automatiquement.

```bash
git clone https://github.com/kingecom229-boop/edyeco.git
cd edyeco
npm install                 # outil dev racine (concurrently)
npm run install:all         # client + serveur
cp server/.env.example server/.env   # facultatif en développement

npm run dev                 # API :4000 + Vite :5173
```

Ouvrez **http://localhost:5173**.

En développement, Vite proxifie `/api`, `/uploads`, `/sitemap.xml` et `/robots.txt` vers l'API (`127.0.0.1:4000`). Le serveur Vite écoute sur `0.0.0.0` pour fonctionner dans un environnement conteneurisé.

### Build de production en local

```bash
npm run build               # compile client/dist
NODE_ENV=production JWT_SECRET="<32 caractères minimum>" npm start
```

Le serveur Express sert alors l'application compilée sur **http://localhost:4000**, avec injection SEO côté serveur. Sans `client/dist`, `/` renvoie uniquement un message d'aide.

## Compte administrateur

| Champ | Valeur |
| --- | --- |
| URL | `/admin` |
| Email | `admin@edyeco.com` |
| Mot de passe | `pypython10` |

Le compte est créé au premier seed, mot de passe **haché bcrypt (coût 12)**. Aucun identifiant n'est présent dans le bundle client.

> ⚠️ **Avant toute mise en production :** définissez `ADMIN_EMAIL` et un `ADMIN_PASSWORD` fort dans les variables d'environnement, puis supprimez/régénérez la base de démonstration. Ne réutilisez jamais le mot de passe par défaut.

Comptes clients de démonstration (mot de passe `demo12345`) : `camille@example.com`, `lucas@example.com`.

## Scripts

Depuis la racine :

| Commande | Effet |
| --- | --- |
| `npm run dev` | API + Vite en parallèle |
| `npm run build` | Build du client dans `client/dist` |
| `npm start` | Serveur Express (sert aussi le client compilé) |
| `npm run db:migrate` | Applique les migrations SQL |
| `npm run db:seed` | Insère les données de démonstration |
| `npm run db:seed -- --reset` | Réinitialise la base puis re-seed |
| `npm test` | Tests unitaires serveur (Node test runner) |

Depuis `client/` :

| Commande | Effet |
| --- | --- |
| `npm run dev` | Vite sur `0.0.0.0:5173` |
| `npm run build` | Build production |
| `npm run preview` | Prévisualisation du build |
| `node smoke.mjs` | Rend les 36 routes dans jsdom contre l'API locale |
| `node flow.mjs` | Parcours d'achat complet (panier → paiement) |
| `node admin-flow.mjs` | Création produit + réglages via l'UI admin |

Depuis `server/` :

| Commande | Effet |
| --- | --- |
| `npm run dev` | API avec `--watch` |
| `npm test` | Tests unitaires |
| `node scripts/api-smoke.mjs` | 38 contrôles d'intégration sur l'API démarrée |
| `node scripts/cleanup-smoke.mjs` | Nettoie les données créées par les smoke tests |

## Variables d'environnement

Copiez `server/.env.example` vers `server/.env`. Les principales variables :

| Variable | Défaut (dev) | Description |
| --- | --- | --- |
| `PORT` | `4000` | Port HTTP de l'API |
| `SITE_URL` | `http://localhost:4000` | URL publique (canonical, sitemap, emails) |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origine(s) CORS autorisée(s), séparées par des virgules |
| `DATABASE_URL` | *(vide)* | Si vide : PGlite embarqué sur le port 5433 |
| `DB_SSL` | `false` | Active TLS vers PostgreSQL managé |
| `DB_AUTO_MIGRATE` / `DB_AUTO_SEED` | `true` | Migrations/seed au démarrage |
| `JWT_SECRET` | secret de dev | **Obligatoire en production**, ≥ 32 caractères |
| `COOKIE_SECURE` | `true` en prod | Cookies `Secure` (HTTPS) |
| `COOKIE_DOMAIN` | *(vide)* | Domaine des cookies (ex. `.edyeco.fr`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | voir ci-dessus | Compte admin initial |
| `SMTP_HOST` … | *(vide)* | SMTP ; sans configuration, emails **simulés** dans les logs |
| `MAIL_FROM` / `MAIL_TO` | `contact@edyeco.fr` | Expéditeur / destinataire des formulaires |
| `PAYMENT_MODE` | `simulation` | `simulation` ou `stripe` |
| `MAX_UPLOAD_BYTES` | `6291456` | Taille maximale des images (6 Mo) |
| `TRUST_PROXY` | `false` | À activer derrière un reverse proxy |

Le serveur refuse de démarrer en production sans `JWT_SECRET` valide.

## Base de données

Deux modes, même code SQL :

1. **Développement / démo** : si `DATABASE_URL` est absent, une instance **PGlite** (PostgreSQL compilé en WASM) est lancée sur `127.0.0.1:5433` et exposée via le protocole PostgreSQL. Les données vivent dans `server/data/pglite`.
2. **Production** : renseignez `DATABASE_URL` (Neon, Supabase, RDS, postgres Docker…). Les migrations sont exécutées au démarrage.

```bash
npm run db:migrate
npm run db:seed
npm run db:seed -- --reset   # ⚠️ efface les données et recharge la démo
```

Schéma principal : `users`, `categories`, `products`, `carts`, `cart_items`, `orders`, `order_items`, `discount_codes`, `reviews`, `blog_posts`, `newsletter_subscribers`, `newsletter_campaigns`, `contact_messages`, `faqs`, `settings`, `audit_log`, `analytics_events`, `password_resets`.

## Paiement simulé & passage à Stripe

- Le checkout crée une commande `pending` avec un **JWT de paiement** (3 h) stocké côté client dans `sessionStorage`.
- La page `/paiement/:reference` valide la carte (Luhn, expiration, CVC) et appelle `POST /api/checkout/orders/:reference/pay`.
- Aucune donnée de carte n'est stockée ni journalisée. Seule une référence `simulation:SIM-…` est enregistrée.
- Le stock n'est décrémenté qu'au paiement réussi, dans une transaction SQL. Un paiement rejoué renvoie `409`.

**Cartes de test**

| Carte | Résultat |
| --- | --- |
| `4242 4242 4242 4242` | Paiement accepté (Visa) |
| `4000 0000 0000 0002` | Paiement refusé |

Le module `server/src/services/payments.js` expose une interface `createIntent` / `confirm`. Pour Stripe : implémentez `stripeProvider` (squelette commenté dans le fichier), renseignez `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`, passez `PAYMENT_MODE=stripe`, puis remplacez le formulaire de carte par Stripe Elements.

## SEO

- **Injection serveur** des balises `<title>`, description, canonical, Open Graph, Twitter Card et JSON-LD pour chaque URL (accueil, produit, catégorie, article, FAQ…), y compris pour les crawlers qui n'exécutent pas JavaScript.
- Données structurées Schema.org : `Store`, `WebSite` + `SearchAction`, `Product` + `Offer` + `AggregateRating`, `BreadcrumbList`, `FAQPage`, `Article`.
- `sitemap.xml` généré dynamiquement depuis la base, `robots.txt` avec exclusion de `/admin`, `/compte`, `/paiement`, `/api`.
- URL françaises lisibles, titres/descriptions éditables par produit, catégorie et article dans l'admin.
- Hiérarchie de titres, `alt`, fil d'Ariane, contenu éditorial (guides d'achat) et maillage interne produit ↔ blog.
- Balises `noindex` sur les pages privées et le tunnel de paiement.
- Polices auto-hébergées, images compressées, `loading="lazy"`, preload du poster de hero.

## Sécurité

- Authentification par **JWT signé** dans un cookie `httpOnly`, `SameSite=Lax`, `Secure` en production ; expiration 7 jours.
- **Double-submit CSRF** (`edyeco_csrf` + en-tête `X-CSRF-Token`, comparaison à temps constant) sur toutes les routes d'écriture authentifiées.
- Mots de passe **bcrypt** (coût 12), reset par jeton aléatoire haché SHA-256, usage unique, expiration 1 h.
- Validation **Zod** systématique des entrées ; requêtes SQL **paramétrées** ; listes de tri en liste blanche.
- En-têtes de sécurité via Helmet : CSP avec nonce par requête, HSTS en production, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Rate limiting par IP (auth, inscription, contact, avis, checkout, analytics).
- Uploads : types MIME et extensions limités (JPEG/PNG/WebP/AVIF), taille max 6 Mo, noms aléatoires, `nosniff`. **Les SVG sont refusés** (vecteur XSS).
- Markdown rendu après échappement HTML : aucune injection possible via le back-office.
- Rôles `customer` / `admin` vérifiés côté serveur ; accès aux commandes limité au propriétaire ou au jeton de paiement.
- Journal d'audit des actions sensibles, aucune stack trace exposée au client, aucune clé secrète dans le bundle frontend (seules les variables `VITE_*` publiques le seraient).

## Tests & vérifications

```bash
# Tests unitaires (aucune base requise)
cd server && npm test

# Contrôles d'intégration (API démarrée sur :4000)
node scripts/api-smoke.mjs

# Rendu des 36 routes (jsdom, API démarrée)
cd ../client && node smoke.mjs

# Parcours d'achat complet (crée une vraie commande de test payée)
node flow.mjs

# Back-office : création produit + réglages
node admin-flow.mjs
```

Les scripts `flow.mjs` et `admin-flow.mjs` créent des données de test ; `server/scripts/cleanup-smoke.mjs` et `server/scripts/cleanup-extra.mjs` les suppriment.

## Docker

```bash
cp .env.example .env        # renseignez POSTGRES_PASSWORD, JWT_SECRET, ADMIN_PASSWORD
docker compose up -d --build
```

- `db` : PostgreSQL 16 avec volume persistant `edyeco_pgdata`.
- `app` : image multi-stage Node 22 (build Vite + dépendances de prod uniquement), utilisateur non-root, healthcheck `/api/health`, volume `edyeco_uploads`.
- Site sur **http://localhost:4000**.

En production HTTPS, placez l'application derrière un reverse proxy (Nginx, Traefik, Caddy) et définissez :

```env
SITE_URL=https://www.votre-domaine.fr
CLIENT_ORIGIN=https://www.votre-domaine.fr
COOKIE_SECURE=true
TRUST_PROXY=true
```

## Déploiement en production

**Render / Railway / Fly.io** : build `npm run build`, start `npm start`, `DATABASE_URL` fourni par le service PostgreSQL, `JWT_SECRET` aléatoire (32+), `NODE_ENV=production`, disque persistant pour `server/uploads`.

**VPS** : Docker compose ci-dessus + Nginx en frontal, `certbot` pour TLS. Configurez `client_max_body_size 8m` pour les uploads.

**Checklist avant ouverture**

- [ ] `JWT_SECRET` unique, ≥ 32 caractères (généré avec `openssl rand -hex 32`)
- [ ] `ADMIN_PASSWORD` changé, compte de démonstration supprimé
- [ ] `COOKIE_SECURE=true`, HTTPS actif, `TRUST_PROXY=true` derrière proxy
- [ ] `SITE_URL` et `CLIENT_ORIGIN` sur le domaine définitif
- [ ] SMTP configuré (sinon les emails restent simulés dans les logs)
- [ ] Sauvegardes PostgreSQL planifiées + volume uploads sauvegardé
- [ ] `PAYMENT_MODE` et clés Stripe avant d'encaisser réellement

## Structure du projet

```
edyeco/
├── client/                     # React + Vite
│   ├── public/
│   │   ├── brand/              # logo, favicons, image de marque
│   │   ├── media/              # vidéo hero MP4/WebM + poster
│   │   └── products/           # visuels produits
│   └── src/
│       ├── admin/              # back-office (dashboard, produits, commandes…)
│       ├── components/         # UI, layout, marketing, SEO
│       ├── context/            # auth, panier, boutique, toasts
│       ├── lib/                # api, formatage, hooks, analytics
│       └── pages/              # public, auth, compte
├── server/
│   ├── scripts/                # smoke tests API + nettoyage
│   ├── src/
│   │   ├── db/                 # pool, migrations SQL, seed
│   │   ├── lib/                # auth, http, markdown, mailer, validation
│   │   ├── routes/             # catalog, auth, panier, checkout, admin…
│   │   └── services/           # paiement, SEO
│   └── tests/                  # tests unitaires
├── docs/screenshots/           # captures de l'ancienne boutique (inspiration)
├── Dockerfile · docker-compose.yml · .env.example
└── package.json
```

## Accessibilité & performance

- Navigation clavier, lien d'évitement, `aria-label`, focus visibles, contrastes vérifiés, `prefers-reduced-motion` respecté (vidéo et 3D désactivées).
- Découpage de code par route, préchargement des polices auto-hébergées, compression Brotli/Gzip, cache long sur les assets immuables, images `lazy`.
- La scène 3D n'est chargée qu'à l'approche du viewport, et retombe sur un visuel de marque si WebGL est indisponible.

## Crédits & inspiration

- Logo et favicon : fichiers fournis par le projet (`client/public/brand/`).
- Le site s'inspire de codes e-commerce observés sur la boutique historique du client (captures dans `docs/screenshots/`) : hiérarchie visuelle, sélecteur de code postal, comparaison livraison classique/confort, FAQ. Aucun contenu, texte ou nom de l'ancienne boutique n'est repris.
- Vidéo hero générée pour le projet ; visuels produits générés/optimisés pour la démonstration.

---

© 2026 EdyEco — Bois de chauffage. Projet livré avec paiement simulé, prêt à être branché sur Stripe.
