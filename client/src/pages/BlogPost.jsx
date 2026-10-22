import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Clock, User } from 'lucide-react';
import Seo from '../components/Seo';
import { formatDate } from '../lib/format';
import api from '../lib/api';
import ProductCard from '../components/marketing/ProductCard';

export default function BlogPost() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    api
      .get(`/blog/${slug}`)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    api.get('/products?limit=3&sort=popular').then((res) => !cancelled && setProducts(res.products || [])).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  if (loading) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-4 w-24 animate-pulse rounded bg-white" />
          <div className="h-12 w-full animate-pulse rounded bg-white" />
          <div className="h-72 w-full animate-pulse rounded-3xl bg-white" />
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <BookOpen className="h-12 w-12 text-forest-300" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Article introuvable</h1>
        <p className="mt-2 text-sm text-ink/60">Ce guide n’existe pas ou a été déplacé.</p>
        <Link to="/blog" className="btn-primary mt-6"><ArrowLeft className="h-4 w-4" /> Tous les guides</Link>
      </div>
    );
  }

  const { post, related } = data;

  return (
    <>
      <Seo title={post.seo.title || `${post.title} | EdyEco`} description={post.seo.description || post.excerpt} image={post.cover} type="article" />

      <article>
        <header className="relative overflow-hidden bg-forest-950 pb-16 pt-10 text-white">
          <img src={post.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/85 to-forest-950/60" />
          <div className="container-page relative max-w-4xl">
            <nav aria-label="Fil d’Ariane" className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/55">
              <Link to="/" className="hover:text-white">Accueil</Link>
              <span>/</span>
              <Link to="/blog" className="hover:text-white">Conseils</Link>
              <span>/</span>
              <span className="text-white/85">{post.category}</span>
            </nav>
            <p className="mt-6 inline-flex rounded-full bg-ember-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">{post.category}</p>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{post.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">{post.excerpt}</p>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-[11px] text-white/55">
              <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {post.author}</span>
              <span>{formatDate(post.publishedAt)}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {post.readMinutes} min de lecture</span>
            </div>
          </div>
        </header>

        <div className="container-page -mt-8 pb-16">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_300px]">
            <div className="rounded-3xl border border-forest-900/8 bg-white p-6 shadow-sm sm:p-10">
              <div className="prose-edyeco" dangerouslySetInnerHTML={{ __html: post.html }} />
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags?.map((tag) => <span key={tag} className="tag">#{tag}</span>)}
              </div>
              <div className="mt-8 rounded-2xl bg-forest-50 p-5">
                <p className="font-display text-lg font-semibold text-forest-950">Un doute sur votre appareil ?</p>
                <p className="mt-1 text-sm text-ink/60">Envoyez-nous la référence de votre poêle ou la dimension de votre foyer : nous vous conseillons la longueur et le volume adaptés.</p>
                <Link to="/contact" className="btn-primary btn-sm mt-4">Demander conseil <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-3xl border border-forest-900/8 bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ember-700">À lire aussi</p>
                <ul className="mt-3 space-y-3">
                  {related.map((item) => (
                    <li key={item.id}>
                      <Link to={`/blog/${item.slug}`} className="group block">
                        <p className="text-sm font-medium leading-snug group-hover:text-forest-700">{item.title}</p>
                        <p className="mt-0.5 text-[10px] text-ink/40">{item.readMinutes} min · {item.category}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl bg-forest-gradient p-5 text-white">
                <p className="font-display text-lg font-semibold">Bois sec garanti</p>
                <p className="mt-1 text-xs text-white/65">Moins de 20 % d’humidité, contrôlé lot par lot. Livraison offerte dès 1 500 €.</p>
                <Link to="/boutique" className="btn-primary btn-sm mt-4">Voir la boutique</Link>
              </div>
            </aside>
          </div>

          {products.length > 0 && (
            <div className="mx-auto mt-12 max-w-5xl">
              <div className="flex items-end justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold">Les produits cités dans nos conseils</h2>
                <Link to="/boutique" className="text-xs font-semibold text-forest-800 hover:underline">Tout voir</Link>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
              </div>
            </div>
          )}

          <div className="mx-auto mt-10 max-w-5xl">
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-forest-800 hover:text-ember-600">
              <ArrowLeft className="h-4 w-4" /> Tous les conseils
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
