import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import Seo from '../components/Seo';
import PageHero from '../components/layout/PageHero';
import { EmptyState, Pagination } from '../components/ui';
import { formatDate } from '../lib/format';
import api from '../lib/api';

export default function Blog() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ posts: [], categories: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const page = Number(params.get('page') || 1);
  const category = params.get('category') || '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), limit: '9' });
    if (category) query.set('category', category);
    api
      .get(`/blog?${query}`)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setData({ posts: [], categories: [], pagination: null }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, category]);

  const [featured, ...rest] = data.posts;

  return (
    <>
      <Seo
        title="Conseils & guides bois de chauffage | EdyEco"
        description="Guides pratiques sur le bois de chauffage, les granulés, le séchage, les essences et la livraison. Les conseils des experts EdyEco."
      />
      <PageHero
        title="Conseils & guides"
        description="Tout ce que nous savons sur le bois de chauffage, expliqué simplement : choisir, stocker, brûler, économiser."
        image="/media/hero-fire-poster.jpg"
        breadcrumbs={[{ label: 'Conseils' }]}
        compact
      />

      <section className="container-page py-10">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setParams({})}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${!category ? 'bg-forest-900 text-white' : 'bg-white text-ink/65 hover:bg-forest-50'}`}
          >
            Tous les articles
          </button>
          {data.categories.map((cat) => (
            <button
              key={cat.category}
              type="button"
              onClick={() => setParams({ category: cat.category })}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${category === cat.category ? 'bg-forest-900 text-white' : 'bg-white text-ink/65 hover:bg-forest-50'}`}
            >
              {cat.category} <span className="text-[10px] opacity-60">{cat.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-3xl bg-white" />)}
          </div>
        ) : data.posts.length === 0 ? (
          <div className="mt-8">
            <EmptyState icon={BookOpen} title="Aucun article dans cette catégorie" description="Nous préparons de nouveaux conseils. En attendant, parcourez tous nos guides." action={<Link to="/blog" className="btn-secondary">Tous les articles</Link>} />
          </div>
        ) : (
          <>
            {featured && (
              <article className="group mt-8 grid overflow-hidden rounded-3xl border border-forest-900/8 bg-white shadow-sm lg:grid-cols-2">
                <Link to={`/blog/${featured.slug}`} className="relative block min-h-[240px] overflow-hidden">
                  <img src={featured.cover} alt={featured.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <span className="absolute left-4 top-4 rounded-full bg-ember-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">À la une</span>
                </Link>
                <div className="flex flex-col justify-center p-6 sm:p-10">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ember-700">{featured.category} · {featured.readMinutes} min de lecture</p>
                  <h2 className="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl">
                    <Link to={`/blog/${featured.slug}`} className="hover:text-forest-700">{featured.title}</Link>
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink/60">{featured.excerpt}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <p className="text-[11px] text-ink/45">{formatDate(featured.publishedAt)}</p>
                    <Link to={`/blog/${featured.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-forest-800">Lire le guide <ArrowRight className="h-4 w-4" /></Link>
                  </div>
                </div>
              </article>
            )}

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {rest.map((post) => (
                <article key={post.id} className="group flex flex-col overflow-hidden rounded-3xl border border-forest-900/8 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lift">
                  <Link to={`/blog/${post.slug}`} className="overflow-hidden">
                    <img src={post.cover} alt={post.title} loading="lazy" className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-105" />
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ember-700">{post.category}</p>
                    <h3 className="mt-2 font-display text-lg font-semibold leading-snug">
                      <Link to={`/blog/${post.slug}`} className="hover:text-forest-700">{post.title}</Link>
                    </h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink/55">{post.excerpt}</p>
                    <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-ink/45">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readMinutes} min</span>
                      <span>{formatDate(post.publishedAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <Pagination page={page} pages={data.pagination?.pages || 1} onChange={(p) => { setParams({ ...(category ? { category } : {}), page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </>
        )}
      </section>
    </>
  );
}
