import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import { Modal } from '../ui';
import { formatPrice } from '../../lib/format';
import { useDebounced } from '../../lib/hooks';
import api from '../../lib/api';

export default function SearchDialog({ open, onClose }) {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 280);
  const [results, setResults] = useState({ products: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const q = debounced.trim();
    if (q.length < 2) {
      setResults({ products: [], posts: [] });
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    api
      .get(`/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then((data) => setResults({ products: data.products || [], posts: data.posts || [] }))
      .catch((err) => {
        if (err.name !== 'AbortError') setResults({ products: [], posts: [] });
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debounced, open]);

  const hasResults = results.products.length > 0 || results.posts.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Rechercher un produit, un conseil…" size="lg">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-forest-700" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex. bûches 33 cm, granulés, humidité…"
          className="field !py-4 pl-12 text-base"
          aria-label="Rechercher"
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-forest-500" />}
      </div>

      <div className="mt-5">
        {debounced.trim().length < 2 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: 'Bois de chauffage 33 cm', to: '/boutique?length=33' },
              { label: 'Granulés ENplus A1', to: '/categorie/granules-de-bois' },
              { label: 'Bûches compressées', to: '/categorie/buches-compressees' },
              { label: 'Quel bois choisir ?', to: '/blog/quel-bois-de-chauffage-choisir-guide-2026' },
            ].map((s) => (
              <Link key={s.to} to={s.to} onClick={onClose} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-medium hover:bg-forest-50">
                {s.label} <ArrowRight className="h-4 w-4 text-ember-500" />
              </Link>
            ))}
          </div>
        )}

        {debounced.trim().length >= 2 && !loading && !hasResults && (
          <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-ink/60">
            Aucun résultat pour « {debounced} ». Essayez « bûches », « granulés » ou « livraison ».
          </p>
        )}

        {results.products.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-forest-900/60">Produits</p>
            <div className="space-y-1">
              {results.products.map((p) => (
                <Link key={p.id} to={`/produit/${p.slug}`} onClick={onClose} className="flex items-center gap-3 rounded-xl bg-white p-2.5 transition hover:bg-forest-50">
                  <img src={p.image} alt="" className="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-ink/50">{p.category?.name}</span>
                  </span>
                  <span className="text-sm font-semibold text-forest-900">{formatPrice(p.price)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {results.posts.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-forest-900/60">Conseils</p>
            <div className="space-y-1">
              {results.posts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} onClick={onClose} className="block rounded-xl bg-white px-3 py-2.5 text-sm transition hover:bg-forest-50">
                  <span className="font-medium">{post.title}</span>
                  <span className="mt-0.5 block text-xs text-ink/50">{post.category} · {post.readMinutes} min</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
