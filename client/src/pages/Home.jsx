import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Flame, Leaf, Quote, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react';
import Seo from '../components/Seo';
import Hero from '../components/marketing/Hero';
import TrustBar from '../components/marketing/TrustBar';
import CategoryGrid from '../components/marketing/CategoryGrid';
import ProductCard from '../components/marketing/ProductCard';
import DeliverySection from '../components/marketing/DeliverySection';
import NewsletterSection from '../components/marketing/NewsletterSection';
import { Accordion, SectionHeading, Stars } from '../components/ui';
import { formatDate, formatNumber } from '../lib/format';
import api from '../lib/api';

const TABS = [
  { id: 'all', label: 'Tous nos bois' },
  { id: 'bois-de-chauffage', label: 'Bûches' },
  { id: 'granules-de-bois', label: 'Granulés' },
  { id: 'buches-compressees', label: 'Bûches compressées' },
];

const COMMITMENTS = [
  { icon: ShieldCheck, title: 'Le sec, vraiment', text: 'Chaque lot est contrôlé : moins de 20 % d’humidité pour le bois bûche, moins de 8 % pour les granulés et bûches densifiées.' },
  { icon: Leaf, title: 'Circuit court', text: 'Des feuillus français issus de forêts gérées durablement, transformés à moins de 300 km de nos entrepôts.' },
  { icon: Truck, title: 'Livraison maîtrisée', text: 'Palettes cerclées, transporteurs partenaires, créneau confirmé : votre bois arrive prêt à être stocké.' },
  { icon: Flame, title: 'Le bon conseil', text: 'Une équipe qui connaît les poêles, les inserts et les cheminées. Nous dimensionnons votre commande avec vous.' },
];

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-forest-900/8 bg-white">
      <div className="aspect-[4/3] w-full animate-pulse bg-forest-50" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-24 animate-pulse rounded bg-forest-50" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-forest-50" />
        <div className="h-3 w-full animate-pulse rounded bg-forest-50" />
        <div className="h-6 w-24 animate-pulse rounded bg-forest-50" />
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/home')
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setError('Impossible de charger la boutique pour le moment.'));
    return () => {
      cancelled = true;
    };
  }, []);

  const products = useMemo(() => {
    if (!data?.featured) return [];
    if (tab === 'all') return data.featured.slice(0, 8);
    return data.featured.filter((p) => p.category?.slug === tab);
  }, [data, tab]);

  const reviews = data?.reviews || [];
  const averageRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 4.8;

  return (
    <>
      <Seo
        title="EdyEco — Bois de chauffage sec, granulés et bûches compressées"
        description="Bois de chauffage sec en palette ou ballot, granulés ENplus A1 et bûches compressées. Vente directe producteur, livraison à domicile, paiement sécurisé."
        canonical="https://edyeco.fr/"
      />
      <Hero />
      <TrustBar />

      <section className="section bg-cream" id="gamme">
        <div className="container-page">
          <SectionHeading
            eyebrow="Notre gamme"
            title="Notre gamme de bois de chauffage"
            description={
              <>
                Découvrez nos bois de chauffage en vente en ligne : <Link to="/categorie/bois-de-chauffage" className="font-semibold text-ember-700 hover:underline">bûches de chêne et de hêtre</Link>,{' '}
                <Link to="/categorie/buches-compressees" className="font-semibold text-ember-700 hover:underline">bûches compressées</Link>,{' '}
                <Link to="/categorie/granules-de-bois" className="font-semibold text-ember-700 hover:underline">granulés de bois</Link> et accessoires d’allumage.
                Chauffez votre domicile avec un bois performant, sec et économique.
              </>
            }
            action={
              <Link to="/boutique" className="btn-outline shrink-0">
                Voir toute la boutique <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />

          <div className="mt-8 flex gap-2 overflow-x-auto pb-2 no-scrollbar" role="tablist" aria-label="Filtrer les produits">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  tab === t.id ? 'bg-forest-900 text-white shadow-soft' : 'bg-white text-ink/65 hover:bg-forest-50 hover:text-forest-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {!data && !error && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          {error && <p className="mt-8 rounded-2xl bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</p>}

          {tab !== 'all' && products.length === 0 && !error && data && (
            <p className="mt-8 rounded-2xl bg-white px-5 py-6 text-center text-sm text-ink/60">Aucun produit dans cette sélection pour le moment.</p>
          )}

          <div className="mt-14">
            <SectionHeading eyebrow="Explorer" title="Une gamme, quatre usages" description="Chaque appareil a son combustible idéal. Nous vous aidons à trouver le vôtre." />
            <div className="mt-6">
              <CategoryGrid categories={data?.categories || []} />
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div className="relative order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-4">
              <img src="/products/palette-33.png" alt="Palette de bûches de 33 cm prêtes à brûler" loading="lazy" className="col-span-2 aspect-[16/10] w-full rounded-3xl object-cover shadow-soft" />
              <img src="/products/granules.png" alt="Sacs de granulés de bois ENplus A1" loading="lazy" className="aspect-square w-full rounded-3xl object-cover shadow-soft" />
              <img src="/products/buches-compressees.png" alt="Bûches compressées haute densité" loading="lazy" className="aspect-square w-full rounded-3xl object-cover shadow-soft" />
            </div>
            <div className="absolute -bottom-4 -right-2 flex items-center gap-2 rounded-2xl bg-forest-950 px-4 py-3 text-white shadow-lift sm:right-6">
              <Sparkles className="h-4 w-4 text-ember-400" />
              <span className="text-xs font-medium">Séchage contrôlé, prêt à brûler</span>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow">Pourquoi EdyEco</p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Le bois de chauffage, sans compromis.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/65">
              Acheter du bois, c’est acheter de la chaleur. Nous sélectionnons des feuillus denses, les séchons
              naturellement et contrôlons chaque lot avant expédition. Résultat : une flamme claire, moins de
              fumée, et jusqu’à 25 % de rendement en plus qu’un bois humide.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {COMMITMENTS.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700"><item.icon className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-semibold text-forest-950">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink/55">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/a-propos" className="btn-secondary">Notre histoire <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/blog/quel-bois-de-chauffage-choisir-guide-2026" className="btn-outline">Quel bois choisir ?</Link>
            </div>
          </div>
        </div>
      </section>

      <DeliverySection />

      <section className="section bg-cream">
        <div className="container-page">
          <SectionHeading
            align="center"
            eyebrow="Ils se chauffent avec EdyEco"
            title="Une chaleur qui se transmet"
            description="Des milliers de foyers nous font confiance pour passer l’hiver sereinement."
          />
          <div className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm">
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-forest-900">{(data?.settings?.features?.reviewsAverage || 4.5).toString().replace('.', ',')}/5</p>
              <p className="text-[10px] uppercase tracking-wider text-ink/45">Note moyenne</p>
            </div>
            <div className="h-8 w-px bg-forest-900/10" />
            <Stars rating={data?.settings?.features?.reviewsAverage || 4.5} size={18} />
            <div className="h-8 w-px bg-forest-900/10" />
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-forest-900">{formatNumber(data?.settings?.features?.reviewsCount || 6882)}</p>
              <p className="text-[10px] uppercase tracking-wider text-ink/45">Avis vérifiés</p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {(reviews.length ? reviews : new Array(3).fill(null)).map((review, i) => (
              <motion.figure
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative flex h-full flex-col rounded-3xl border border-forest-900/8 bg-white p-6 shadow-sm"
              >
                <Quote className="h-7 w-7 text-ember-200" aria-hidden="true" />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink/70">
                  “{review ? review.content : 'Un bois sec, une livraison impeccable et un service qui répond vraiment. Je recommande sans hésiter.'}”
                </blockquote>
                <figcaption className="mt-5 flex items-center justify-between border-t border-forest-900/8 pt-4">
                  <div>
                    <p className="text-sm font-semibold text-forest-950">{review?.author_name || 'Client EdyEco'}</p>
                    <p className="text-[11px] text-ink/45">{review?.product_name || 'Bois de chauffage 33 cm'}</p>
                  </div>
                  <Stars rating={review?.rating || 5} size={13} />
                </figcaption>
              </motion.figure>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-ink/45">Avis collectés sur les commandes EdyEco et publiés après vérification.</p>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container-page">
          <SectionHeading
            eyebrow="Conseils & guides"
            title="Mieux chauffer, c’est d’abord mieux comprendre."
            description="Séchage, essences, longueurs, granulés : nos guides répondent aux questions que l’on nous pose tous les jours."
            action={<Link to="/blog" className="btn-outline shrink-0"><BookOpen className="h-4 w-4" /> Tous les articles</Link>}
          />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {(data?.posts || []).map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="group overflow-hidden rounded-3xl border border-forest-900/8 bg-cream shadow-sm transition hover:-translate-y-1 hover:shadow-lift"
              >
                <Link to={`/blog/${post.slug}`} className="block overflow-hidden">
                  <img src={post.cover} alt={post.title} loading="lazy" className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-105" />
                </Link>
                <div className="p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ember-700">{post.category} · {post.readMinutes} min</p>
                  <h3 className="mt-2 font-display text-lg font-semibold leading-snug">
                    <Link to={`/blog/${post.slug}`} className="hover:text-forest-700">{post.title}</Link>
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink/55">{post.excerpt}</p>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-ink/45">
                    <span>{formatDate(post.publishedAt)}</span>
                    <Link to={`/blog/${post.slug}`} className="inline-flex items-center gap-1 font-semibold text-forest-800 group-hover:text-ember-600">
                      Lire <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-cream" id="faq">
        <div className="container-page grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="eyebrow">Questions fréquentes</p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">FAQ sur le bois de chauffage</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/65">
              Livraison, séchage, longueur de bûches, paiement : tout ce qu’il faut savoir avant de commander.
              Une autre question ? Notre équipe répond sous 24 h ouvrées.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/faq" className="btn-secondary">Toutes les questions <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/contact" className="btn-outline">Nous écrire</Link>
            </div>
            <div className="mt-8 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ember-50 text-ember-600"><Star className="h-5 w-5 fill-current" /></div>
              <div>
                <p className="text-sm font-semibold">Service client noté 4,9/5</p>
                <p className="text-xs text-ink/50">Réponse moyenne : 3 heures ouvrées</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-forest-900/8 bg-white px-6 py-2 shadow-sm">
            <Accordion items={data?.faqs || []} defaultOpen={0} />
          </div>
        </div>
      </section>

      <NewsletterSection />

      <section className="bg-forest-950 py-14 text-white">
        <div className="container-page flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow !text-ember-300">Passons à l’action</p>
            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Votre prochain hiver commence ici.</h2>
            <p className="mt-2 text-sm text-white/60">Palettes prêtes à brûler, livraison offerte dès 1 500 €.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/boutique" className="btn-primary">Commander mon bois <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/livraison" className="btn inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">Options de livraison</Link>
          </div>
        </div>
      </section>
    </>
  );
}
