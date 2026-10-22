-- EdyEco — schéma initial (PostgreSQL 14+)
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending','paid','in_production','shipped','delivered','cancelled','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percent','fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id            serial PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  first_name    text NOT NULL DEFAULT '',
  last_name     text NOT NULL DEFAULT '',
  phone         text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  email_opt_in  boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS categories (
  id          serial PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  tagline     text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url   text NOT NULL DEFAULT '',
  position    integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  seo_title   text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id                serial PRIMARY KEY,
  slug              text NOT NULL UNIQUE,
  name              text NOT NULL,
  sku               text NOT NULL UNIQUE,
  category_id       integer REFERENCES categories(id) ON DELETE SET NULL,
  short_description text NOT NULL DEFAULT '',
  description       text NOT NULL DEFAULT '',
  price_cents       integer NOT NULL CHECK (price_cents >= 0),
  compare_at_cents  integer CHECK (compare_at_cents IS NULL OR compare_at_cents >= 0),
  stock             integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit              text NOT NULL DEFAULT 'palette',
  log_length_cm     integer,
  volume_m3         numeric(5,2),
  wood_type         text NOT NULL DEFAULT 'Chêne & hêtre',
  moisture          text NOT NULL DEFAULT 'Moins de 20 %',
  image_url         text NOT NULL DEFAULT '',
  gallery           jsonb NOT NULL DEFAULT '[]'::jsonb,
  badges            jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active         boolean NOT NULL DEFAULT true,
  is_featured       boolean NOT NULL DEFAULT false,
  delivery_class    text NOT NULL DEFAULT 'classique',
  weight_kg         integer,
  position          integer NOT NULL DEFAULT 0,
  seo_title         text NOT NULL DEFAULT '',
  seo_description   text NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id);
CREATE INDEX IF NOT EXISTS products_active_idx ON products (is_active, position);

CREATE TABLE IF NOT EXISTS carts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          integer REFERENCES users(id) ON DELETE SET NULL,
  email            text,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','abandoned','converted')),
  recovery_token   text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  recovery_sent_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carts_status_idx ON carts (status, last_activity_at);
CREATE INDEX IF NOT EXISTS carts_user_idx ON carts (user_id);

CREATE TABLE IF NOT EXISTS cart_items (
  id         serial PRIMARY KEY,
  cart_id    uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   integer NOT NULL CHECK (quantity > 0 AND quantity <= 50),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id              serial PRIMARY KEY,
  code            text NOT NULL UNIQUE,
  type            discount_type NOT NULL DEFAULT 'percent',
  value           integer NOT NULL CHECK (value > 0),
  min_order_cents integer NOT NULL DEFAULT 0,
  max_uses        integer,
  used_count      integer NOT NULL DEFAULT 0,
  expires_at      timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id                serial PRIMARY KEY,
  reference         text NOT NULL UNIQUE,
  user_id           integer REFERENCES users(id) ON DELETE SET NULL,
  cart_id           uuid REFERENCES carts(id) ON DELETE SET NULL,
  email             text NOT NULL,
  customer_name     text NOT NULL,
  phone             text NOT NULL DEFAULT '',
  shipping_address  jsonb NOT NULL DEFAULT '{}'::jsonb,
  billing_address   jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_method   text NOT NULL DEFAULT 'classique' CHECK (delivery_method IN ('classique','confort','retrait')),
  delivery_fee_cents integer NOT NULL DEFAULT 0,
  subtotal_cents    integer NOT NULL DEFAULT 0,
  discount_cents    integer NOT NULL DEFAULT 0,
  total_cents       integer NOT NULL DEFAULT 0,
  discount_code     text,
  status            order_status NOT NULL DEFAULT 'pending',
  payment_method    text NOT NULL DEFAULT 'simulation',
  payment_ref       text,
  customer_note     text NOT NULL DEFAULT '',
  admin_note        text NOT NULL DEFAULT '',
  tracking_number   text NOT NULL DEFAULT '',
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (lower(email));
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id               serial PRIMARY KEY,
  order_id         integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       integer REFERENCES products(id) ON DELETE SET NULL,
  product_slug     text NOT NULL DEFAULT '',
  name             text NOT NULL,
  image_url        text NOT NULL DEFAULT '',
  unit_price_cents integer NOT NULL,
  quantity         integer NOT NULL CHECK (quantity > 0),
  line_total_cents integer NOT NULL
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

CREATE TABLE IF NOT EXISTS reviews (
  id          serial PRIMARY KEY,
  product_id  integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       text NOT NULL DEFAULT '',
  content     text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews (product_id, is_published);

CREATE TABLE IF NOT EXISTS blog_posts (
  id              serial PRIMARY KEY,
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  excerpt         text NOT NULL DEFAULT '',
  content         text NOT NULL DEFAULT '',
  cover_url       text NOT NULL DEFAULT '',
  author          text NOT NULL DEFAULT 'Équipe EdyEco',
  category        text NOT NULL DEFAULT 'Conseils',
  tags            text[] NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  read_minutes    integer NOT NULL DEFAULT 5,
  seo_title       text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_status_idx ON blog_posts (status, published_at DESC);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id           serial PRIMARY KEY,
  email        text NOT NULL UNIQUE,
  source       text NOT NULL DEFAULT 'site',
  first_name   text NOT NULL DEFAULT '',
  is_active    boolean NOT NULL DEFAULT true,
  consent_at   timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id           serial PRIMARY KEY,
  subject      text NOT NULL,
  content      text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent')),
  recipients   integer NOT NULL DEFAULT 0,
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL,
  phone      text NOT NULL DEFAULT '',
  subject    text NOT NULL DEFAULT '',
  message    text NOT NULL,
  status     text NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','replied')),
  admin_reply text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faqs (
  id          serial PRIMARY KEY,
  question    text NOT NULL,
  answer      text NOT NULL,
  category    text NOT NULL DEFAULT 'Général',
  position    integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         serial PRIMARY KEY,
  user_id    integer REFERENCES users(id) ON DELETE SET NULL,
  action     text NOT NULL,
  entity     text NOT NULL DEFAULT '',
  entity_id  text NOT NULL DEFAULT '',
  meta       jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip         text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  path       text NOT NULL DEFAULT '',
  referrer   text NOT NULL DEFAULT '',
  session_id text NOT NULL DEFAULT '',
  meta       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_name_idx ON analytics_events (name, created_at DESC);
