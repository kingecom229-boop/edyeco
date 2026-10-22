import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Plus, Ruler, Boxes } from 'lucide-react';
import { formatPrice } from '../../lib/format';
import { useCart } from '../../context/CartContext';
import { Stars } from '../ui';

export default function ProductCard({ product, index = 0 }) {
  const { addItem, loading } = useCart();
  const [busy, setBusy] = useState(false);

  const quickAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await addItem(product.id, 1);
    } finally {
      setBusy(false);
    }
  };

  const discount = product.compareAtCents && product.compareAtCents > product.priceCents
    ? Math.round((1 - product.priceCents / product.compareAtCents) * 100)
    : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.25) }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-forest-900/8 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <Link to={`/produit/${product.slug}`} className="relative block overflow-hidden bg-[#f3eee2]">
        <img
          src={product.image}
          alt={`${product.name} — bois de chauffage EdyEco`}
          loading={index < 4 ? 'eager' : 'lazy'}
          decoding="async"
          width="600"
          height="600"
          className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.badges?.slice(0, 2).map((badge) => (
            <span key={badge} className="w-fit rounded-full bg-forest-900/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
              {badge}
            </span>
          ))}
        </div>
        {discount > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-ember-500 px-2.5 py-1 text-[10px] font-bold text-white">-{discount}%</span>
        )}
        {product.stock <= 0 && (
          <span className="absolute inset-x-3 bottom-3 rounded-xl bg-forest-950/85 py-1.5 text-center text-xs font-semibold text-white">Bientôt de retour</span>
        )}
        <button
          type="button"
          onClick={quickAdd}
          disabled={busy || loading || product.stock <= 0}
          aria-label={`Ajouter ${product.name} au panier`}
          className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-white text-forest-900 opacity-0 shadow-soft transition-all duration-300 hover:bg-ember-500 hover:text-white group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 disabled:opacity-40"
        >
          <Plus className="h-5 w-5" />
        </button>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-forest-700">{product.category?.name}</span>
          {product.rating ? (
            <Stars rating={product.rating} count={product.reviewCount} size={12} />
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ember-700"><Flame className="h-3 w-3" /> Bois sec</span>
          )}
        </div>
        <h3 className="mt-2 text-[15px] font-semibold leading-snug text-forest-950">
          <Link to={`/produit/${product.slug}`} className="hover:text-forest-700">{product.name}</Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink/55">{product.shortDescription}</p>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-ink/60">
          {product.logLengthCm && <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5"><Ruler className="h-3 w-3 text-forest-600" />{product.logLengthCm} cm</span>}
          {product.volumeM3 ? <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5"><Boxes className="h-3 w-3 text-forest-600" />{String(product.volumeM3).replace('.', ',')} m³</span> : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5">{product.moisture}</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div>
            <p className="text-lg font-bold text-forest-900">{formatPrice(product.price)}</p>
            {product.compareAtPrice && (
              <p className="text-xs text-ink/40 line-through">{formatPrice(product.compareAtPrice)}</p>
            )}
            <p className="text-[10px] text-ink/45">soit {formatPrice(product.price)} / {product.unit}</p>
          </div>
          <Link
            to={`/produit/${product.slug}`}
            className="rounded-full border border-forest-900/15 px-4 py-2 text-xs font-semibold text-forest-900 transition hover:border-ember-500 hover:bg-ember-500 hover:text-white"
          >
            Voir le produit
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
