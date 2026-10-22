import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Package, ShoppingBag } from 'lucide-react';
import Seo from '../../components/Seo';
import api from '../../lib/api';
import { formatCents, formatDate, statusMeta } from '../../lib/format';
import { EmptyState, Spinner } from '../../components/ui';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.get('/account/orders?limit=30').then((res) => setOrders(res.orders || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Seo title="Mes commandes | EdyEco" robots="noindex, nofollow" />
      <div className="rounded-2xl border border-forest-900/8 bg-white">
        <div className="border-b border-forest-900/8 px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Historique de mes commandes</h2>
          <p className="mt-0.5 text-xs text-ink/50">Suivez l’état de vos livraisons et retrouvez vos factures.</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-14"><Spinner className="h-6 w-6 text-forest-600" /></div>
        ) : orders.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={ShoppingBag} title="Aucune commande pour l’instant" description="Vos prochaines commandes apparaîtront ici." action={<Link to="/boutique" className="btn-primary">Découvrir la boutique</Link>} />
          </div>
        ) : (
          <ul className="divide-y divide-forest-900/8">
            {orders.map((order) => {
              const meta = statusMeta(order.status);
              const isOpen = open === order.id;
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : order.id)}
                    aria-expanded={isOpen}
                    className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left transition hover:bg-forest-50/40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700"><Package className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{order.reference}</span>
                      <span className="text-[11px] text-ink/45">{formatDate(order.createdAt)} · {order.items.length} article(s) · {order.deliveryMethod}</span>
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${meta.tone}`}>{meta.label}</span>
                    <span className="text-sm font-semibold">{formatCents(order.totalCents)}</span>
                    <ChevronDown className={`h-4 w-4 text-ink/40 transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="bg-forest-50/30 px-5 pb-5 pt-1">
                      <ul className="space-y-2">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-3 rounded-xl bg-white p-2.5">
                            <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" loading="lazy" />
                            <span className="min-w-0 flex-1">
                              <Link to={`/produit/${item.slug}`} className="block truncate text-xs font-medium hover:text-forest-700">{item.name}</Link>
                              <span className="text-[10px] text-ink/45">Qté {item.quantity}</span>
                            </span>
                            <span className="text-xs font-semibold">{formatCents(item.lineTotalCents)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 grid gap-3 text-[11px] text-ink/60 sm:grid-cols-2">
                        <div>
                          <p className="font-semibold text-forest-950">Livraison</p>
                          <p>{order.shippingAddress?.line1}</p>
                          <p>{order.shippingAddress?.postalCode} {order.shippingAddress?.city}</p>
                          {order.trackingNumber && <p className="mt-1">Suivi : <strong>{order.trackingNumber}</strong></p>}
                        </div>
                        <div>
                          <p className="font-semibold text-forest-950">Total</p>
                          <p>Sous-total {formatCents(order.subtotalCents)}</p>
                          <p>Livraison {order.deliveryFeeCents ? formatCents(order.deliveryFeeCents) : 'offerte'}</p>
                          {order.discountCents > 0 && <p>Remise -{formatCents(order.discountCents)}</p>}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link to="/contact" className="btn-outline btn-sm">Une question sur cette commande</Link>
                        {['paid', 'in_production'].includes(order.status) && <span className="rounded-full bg-white px-3 py-2 text-[10px] text-ink/50">Modification possible jusqu’à 48 h avant livraison</span>}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
