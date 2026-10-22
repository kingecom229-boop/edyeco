import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Flame, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useStore } from '../../context/StoreContext';
import { formatCents } from '../../lib/format';
import { QuantityStepper } from '../ui';
import { useBodyLock } from '../../lib/hooks';

export default function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, updateItem, removeItem, count } = useCart();
  const { deliveryOptions } = useStore();
  useBodyLock(drawerOpen);

  const freeAbove = deliveryOptions?.freeAboveCents || 0;
  const remaining = Math.max(0, freeAbove - (cart.subtotalCents || 0));
  const progress = freeAbove > 0 ? Math.min(100, ((cart.subtotalCents || 0) / freeAbove) * 100) : 0;

  return (
    <AnimatePresence>
      {drawerOpen && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Panier">
          <motion.button
            type="button"
            aria-label="Fermer le panier"
            className="absolute inset-0 bg-forest-950/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream shadow-lift"
          >
            <header className="flex items-center justify-between border-b border-forest-900/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-forest-700" />
                <h2 className="font-display text-lg font-semibold">Votre panier</h2>
                <span className="rounded-full bg-forest-100 px-2 py-0.5 text-xs font-semibold text-forest-800">{count}</span>
              </div>
              <button type="button" onClick={closeDrawer} aria-label="Fermer le panier" className="rounded-full p-2 hover:bg-forest-50">
                <X className="h-5 w-5" />
              </button>
            </header>

            {freeAbove > 0 && cart.items?.length > 0 && (
              <div className="border-b border-forest-900/10 px-5 py-3">
                <p className="text-xs text-ink/65">
                  {remaining > 0 ? (
                    <>Plus que <strong className="text-forest-800">{formatCents(remaining)}</strong> pour la livraison offerte</>
                  ) : (
                    <span className="flex items-center gap-1 font-semibold text-forest-700"><Flame className="h-3.5 w-3.5" /> Livraison offerte !</span>
                  )}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-forest-100">
                  <motion.div className="h-full rounded-full bg-ember-gradient" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }} />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!cart.items?.length ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-forest-50">
                    <ShoppingBag className="h-9 w-9 text-forest-400" />
                  </div>
                  <p className="mt-4 font-display text-lg font-semibold">Votre panier est vide</p>
                  <p className="mt-1 text-sm text-ink/55">Il ne manque plus qu’une bonne flambée.</p>
                  <Link to="/boutique" onClick={closeDrawer} className="btn-primary mt-6">
                    Découvrir la boutique <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {cart.items.map((item) => (
                    <li key={item.productId} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
                      <Link to={`/produit/${item.slug}`} onClick={closeDrawer} className="shrink-0">
                        <img src={item.image} alt={item.name} className="h-20 w-20 rounded-xl object-cover" loading="lazy" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link to={`/produit/${item.slug}`} onClick={closeDrawer} className="text-sm font-medium leading-snug hover:text-forest-700">
                            {item.name}
                          </Link>
                          <button type="button" onClick={() => removeItem(item.productId)} aria-label={`Retirer ${item.name}`} className="rounded-full p-1 text-ink/40 hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="mt-0.5 text-xs text-ink/45">{formatCents(item.priceCents)} / {item.unit}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <QuantityStepper size="sm" value={item.quantity} min={1} max={Math.min(50, item.stock || 50)} onChange={(q) => updateItem(item.productId, q)} />
                          <span className="text-sm font-semibold text-forest-900">{formatCents(item.lineTotalCents)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cart.items?.length > 0 && (
              <footer className="border-t border-forest-900/10 bg-white/70 px-5 py-4">
                <div className="mb-1 flex items-center justify-between text-sm text-ink/60">
                  <span>Sous-total</span>
                  <span className="font-semibold text-forest-900">{formatCents(cart.subtotalCents)}</span>
                </div>
                <p className="mb-4 text-[11px] text-ink/45">Frais de livraison calculés à l’étape suivante.</p>
                <Link to="/commande" onClick={closeDrawer} className="btn-primary w-full">
                  Passer commande <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/panier" onClick={closeDrawer} className="btn-ghost mt-1 w-full text-xs">
                  Voir le panier en détail
                </Link>
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
