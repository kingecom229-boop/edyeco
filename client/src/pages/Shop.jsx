import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Search, PackageSearch } from 'lucide-react';
import PageHero from '../components/layout/PageHero';
import ProductCard from '../components/marketing/ProductCard';
import { EmptyState, Pagination, Select } from '../components/ui';
import api from '../lib/api';
import { useSeo } from '../components/Seo';

const SORTS = [
  { value: 'position', label: 'Nos recommandations' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'newest', label: 'Nouveautés' },
  { value: 'popular', label: 'Les plus populaires' },
];

const LENGTHS = [25, 30, 33, 40, 50];

export default function Shop() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ products: [], pagination: null });
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(params.get('q') || '');

  const page = Number(params.get('page') || 1);
  const category = slug || params.get('category') || '';
  const length = params.get('length') || '';
  const sort = params.get('sort') || 'position';
  const q = params.get('q') || '';

  useEffect(() => {
    api.get('/categories').then((res) => {
      setCategories(res.categories || []);
      if (slug) setActiveCategory(res.categories.find((c) => c.slug === slug) || null);
      else setActiveCategory(null);
    }).catch(() => {});
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), limit: '12', sort });
    if (category) query.set('category', category);
    if (length) query.set('length', length);
    if (q) query.set('q', q);
    api
      .get(`/products?${query}`)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setData({ products: [], pagination: null }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, category, length, sort, q]);

  const title = activeCategory?.name || 'Boutique — Bois de chauffage';
  const description = activeCategory?.description ||
    'Bois de chauffage sec, granulés ENplus A1, bûches compressées et accessoires. Palettes et ballots livrés partout en France métropolitaine.';

  useSeo({ title: `${title} | EdyEco`, description });

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const activeFilters = [
    length && { key: 'length', label: `${length} cm` },
    q && { key: 'q', label: `« ${q} »` },
  ].filter(Boolean);

  const heading = activeCategory?.name || 'Toute la boutique';

  return (
    <>
      <PageHero
        title={heading}
        description={activeCategory?.tagline ? `${activeCategory.tagline} — ${description}` : description}
        image={activeCategory?.image || '/products/palette-33.png'}
        breadcrumbs={[activeCategory ? { label: 'Boutique', href: '/boutique' } : { label: 'Boutique' }, ...(activeCategory ? [{ label: activeCategory.name }] : [])]}
        compact
      />

      <section className="container-page py-10">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="hidden w-64 shrink-0 lg:block" aria-label="Filtres">
            <div className="sticky top-24 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-forest-900/60">Rechercher</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateParam('q', search.trim());
                  }}
                  className="relative mt-2"
                >
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Bûches, granulés…" className="field !py-2.5 !pl-9 text-sm" aria-label="Rechercher dans la boutique" />
                </form>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-forest-900/60">Catégories</p>
                <ul className="mt-2 space-y-1">
                  <li>
                    <Link to="/boutique" className={`block rounded-xl px-3 py-2 text-sm transition ${!category ? 'bg-forest-900 text-white' : 'hover:bg-forest-50'}`}>Tous les produits</Link>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.slug}>
                      <Link
                        to={`/categorie/${cat.slug}`}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${category === cat.slug ? 'bg-forest-900 text-white' : 'hover:bg-forest-50'}`}
                      >
                        {cat.name}
                        <span className={`text-[10px] ${category === cat.slug ? 'text-white/60' : 'text-ink/40'}`}>{cat.productCount}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-forest-900/60">Longueur des bûches</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LENGTHS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => updateParam('length', String(length) === String(l) ? '' : String(l))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${String(length) === String(l) ? 'border-forest-900 bg-forest-900 text-white' : 'border-forest-900/15 bg-white hover:border-forest-400'}`}
                    >
                      {l} cm
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-forest-50 p-4">
                <p className="text-sm font-semibold text-forest-900">Besoin d’un conseil ?</p>
                <p className="mt-1 text-xs text-ink/60">Mesurez votre foyer, nous vous guidons sur la longueur et le volume.</p>
                <Link to="/contact" className="mt-3 inline-flex text-xs font-semibold text-forest-800 underline underline-offset-4">Parler à un expert</Link>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setFiltersOpen(true)} className="btn-outline btn-sm lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" /> Filtres
                </button>
                <p className="text-sm text-ink/55">
                  {loading ? 'Chargement…' : `${data.pagination?.total || 0} produit${(data.pagination?.total || 0) > 1 ? 's' : ''}`}
                </p>
                {activeFilters.map((f) => (
                  <button key={f.key} type="button" onClick={() => updateParam(f.key, '')} className="inline-flex items-center gap-1 rounded-full bg-forest-100 px-2.5 py-1 text-[11px] font-medium text-forest-800">
                    {f.label} <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-ink/55">
                Trier par
                <Select value={sort} onChange={(e) => updateParam('sort', e.target.value)} className="!w-auto !py-2 text-xs">
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </label>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-96 animate-pulse rounded-3xl bg-white" />
                  ))}
                </div>
              ) : data.products.length ? (
                <>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {data.products.map((product, index) => (
                      <ProductCard key={product.id} product={product} index={index} />
                    ))}
                  </div>
                  <Pagination page={page} pages={data.pagination?.pages || 1} onChange={(p) => { updateParam('page', String(p)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
                </>
              ) : (
                <EmptyState
                  icon={PackageSearch}
                  title="Aucun produit ne correspond à votre recherche"
                  description="Essayez une autre longueur, une autre catégorie, ou contactez-nous : nous avons peut-être la référence qu’il vous faut en entrepôt."
                  action={<Link to="/boutique" className="btn-secondary">Voir toute la boutique</Link>}
                />
              )}
            </div>

            <div className="mt-14 rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold text-forest-950">{activeCategory ? `Acheter ${activeCategory.name.toLowerCase()} en ligne` : 'Bien choisir son bois de chauffage'}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">
                {activeCategory?.description || (
                  <>
                    Le bon bois dépend de votre appareil et de votre usage. Les bûches de <Link to="/boutique?length=25" className="font-medium text-forest-800 underline underline-offset-2">25 cm</Link> conviennent aux petits poêles,
                    celles de <Link to="/boutique?length=33" className="font-medium text-forest-800 underline underline-offset-2">33 cm</Link> à la majorité des inserts modernes, et les
                    <Link to="/boutique?length=50" className="ml-1 font-medium text-forest-800 underline underline-offset-2">50 cm</Link> aux grandes cheminées. Pour un chauffage automatique,
                    les <Link to="/categorie/granules-de-bois" className="font-medium text-forest-800 underline underline-offset-2">granulés de bois ENplus A1</Link> offrent un confort incomparable.
                  </>
                )}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
                <Link to="/blog/quel-bois-de-chauffage-choisir-guide-2026" className="rounded-full bg-forest-50 px-3 py-1.5 text-forest-800 hover:bg-forest-100">Guide : quel bois choisir ?</Link>
                <Link to="/blog/stere-m3-palette-comprendre-les-unites-de-bois" className="rounded-full bg-forest-50 px-3 py-1.5 text-forest-800 hover:bg-forest-100">Comprendre stère et m³</Link>
                <Link to="/livraison" className="rounded-full bg-forest-50 px-3 py-1.5 text-forest-800 hover:bg-forest-100">Livraison & délais</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {filtersOpen && (
        <div className="fixed inset-0 z-[75] lg:hidden" role="dialog" aria-modal="true" aria-label="Filtres">
          <button type="button" className="absolute inset-0 bg-forest-950/50" aria-label="Fermer les filtres" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-cream p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg font-semibold">Filtrer</p>
              <button type="button" onClick={() => setFiltersOpen(false)} className="rounded-full p-2 hover:bg-forest-50" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-forest-900/60">Catégories</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to="/boutique" onClick={() => setFiltersOpen(false)} className={`rounded-xl border px-3 py-2.5 text-sm ${!category ? 'border-forest-900 bg-forest-900 text-white' : 'border-forest-900/15 bg-white'}`}>Tous</Link>
              {categories.map((cat) => (
                <Link key={cat.slug} to={`/categorie/${cat.slug}`} onClick={() => setFiltersOpen(false)} className={`rounded-xl border px-3 py-2.5 text-sm ${category === cat.slug ? 'border-forest-900 bg-forest-900 text-white' : 'border-forest-900/15 bg-white'}`}>
                  {cat.name}
                </Link>
              ))}
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-forest-900/60">Longueur</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LENGTHS.map((l) => (
                <button key={l} type="button" onClick={() => updateParam('length', String(length) === String(l) ? '' : String(l))} className={`rounded-full border px-4 py-2 text-sm ${String(length) === String(l) ? 'border-forest-900 bg-forest-900 text-white' : 'border-forest-900/15 bg-white'}`}>
                  {l} cm
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setFiltersOpen(false)} className="btn-primary mt-6 w-full">Voir les résultats</button>
          </div>
        </div>
      )}
    </>
  );
}
