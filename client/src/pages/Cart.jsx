import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ShoppingBag, Trash2, Truck, Warehouse, Store, ShieldCheck } from 'lucide-react';
import Seo from '../components/Seo';
import PageHero from '../components/layout/PageHero';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { formatCents, deliveryEstimate } from '../lib/format';
import { EmptyState, QuantityStepper } from '../components/ui';
import api from '../lib/api';

export default function Cart() {
  const { cart, updateItem, removeItem, loading, refresh } = useCart();
  const { deliveryOptions, postalCode } = useStore();
  const [method, setMethod] = useState('classique');
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!cart.items?.length) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    api
      .post('/checkout/quote', { deliveryMethod: method })
      .then((res) => !cancelled && setQuote(res.quote))
      .catch(() => !cancelled && setQuote(null));
    return () => {
      cancelled = true;
    };
  }, [method, cart.items?.length, cart.subtotalCents]);

  const deliveryFee = quote?.deliveryFeeCents ?? (method === 'retrait' ? 0 : deliveryOptions[method]?.fee_cents ?? 0);
  const estimate = deliveryEstimate(postalCode);

  const options = [
    { id: 'classique', label: deliveryOptions.classique?.label || 'Livraison classique', eta: deliveryOptions.classique?.eta || '5 à 8 jours ouvrés', icon: Truck },
    { id: 'confort', label: deliveryOptions.confort?.label || 'Livraison confort', eta: deliveryOptions.confort?.eta || 'environ 2 semaines', icon: Warehouse },
    { id: 'retrait', label: 'Retrait entrepôt', eta: 'sur rendez-vous · Nantes-est', icon: Store },
  ];

  return (
    <>
      <Seo title="Votre panier | EdyEco" description="Retrouvez les articles de votre panier EdyEco." robots="noindex, nofollow" />
      <PageHero title="Votre panier" description="Vérifiez votre sélection, choisissez votre mode de livraison, puis finalisez en toute sécurité." breadcrumbs={[{ label: 'Panier' }]} compact />

      <section className="container-page py-10">
        {!cart.items?.length ? (
          <EmptyState
            icon={ShoppingBag}
            title="Votre panier est vide"
            description="Parcourez notre gamme de bois de chauffage, granulés et bûches compressées pour commencer."
            action={<Link to="/boutique" className="btn-primary">Découvrir la boutique <ArrowRight className="h-4 w-4" /></Link>}
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4">
              <ul className="space-y-3">
                {cart.items.map((item) => (
                  <li key={item.productId} className="flex flex-col gap-4 rounded-3xl border border-forest-900/8 bg-white p-4 sm:flex-row sm:items-center">
                    <Link to={`/produit/${item.slug}`} className="shrink-0">
                      <img src={item.image} alt={item.name} className="h-28 w-full rounded-2xl object-cover sm:w-28" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/produit/${item.slug}`} className="font-display text-base font-semibold hover:text-forest-700">{item.name}</Link>
                      <p className="mt-1 text-xs text-ink/50">{item.shortDescription}</p>
                      <p className="mt-1 text-xs text-ink/45">{formatCents(item.priceCents)} / {item.unit} · {item.stock} en stock</p>
                      <div className="mt-3 flex items-center gap-3">
                        <QuantityStepper value={item.quantity} onChange={(q) => updateItem(item.productId, q)} max={Math.min(50, item.stock || 50)} size="sm" disabled={loading} />
                        <button type="button" onClick={() => removeItem(item.productId)} className="inline-flex items-center gap-1 text-[11px] font-medium text-ink/45 hover:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" /> Retirer
                        </button>
                      </div>
                    </div>
                    <p className="text-right font-display text-lg font-bold text-forest-900">{formatCents(item.lineTotalCents)}</p>
                  </li>
                ))}
              </ul>

              <div className="rounded-3xl border border-forest-900/8 bg-white p-5">
                <h2 className="font-display text-base font-semibold">Mode de livraison</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {options.map((option) => {
                    const fee = option.id === 'retrait' ? 0 : deliveryOptions[option.id]?.fee_cents ?? 0;
                    const free = (deliveryOptions.freeAboveCents || 0) > 0 && cart.subtotalCents >= (deliveryOptions.freeAboveCents || 0) && option.id !== 'retrait';
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setMethod(option.id)}
                        aria-pressed={method === option.id}
                        className={`rounded-2xl border p-3 text-left transition ${method === option.id ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700' : 'border-forest-900/12 hover:border-forest-300'}`}
                      >
                        <option.icon className="h-4 w-4 text-forest-700" />
                        <p className="mt-2 text-xs font-semibold text-forest-950">{option.label}</p>
                        <p className="text-[10px] text-ink/50">{option.eta}</p>
                        <p className="mt-1 text-xs font-semibold text-ember-700">{free || fee === 0 ? 'Offert' : formatCents(fee)}</p>
                      </button>
                    );
                  })}
                </div>
                {estimate && (
                  <p className="mt-3 text-[11px] text-ink/50">
                    Estimation pour le code postal {postalCode} : {estimate.label} — {estimate.detail}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink/50">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-forest-600" /> Paiement sécurisé</span>
                <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-forest-600" /> Livraison suivie</span>
                <span>Besoin d’aide ? <Link to="/contact" className="font-semibold text-forest-800 underline underline-offset-2">Contactez-nous</Link></span>
              </div>
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-3xl border border-forest-900/8 bg-white p-6 shadow-sm">
                <h2 className="font-display text-lg font-semibold">Récapitulatif</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-ink/55">Sous-total</dt><dd className="font-medium">{formatCents(cart.subtotalCents)}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink/55">Livraison</dt><dd className="font-medium">{deliveryFee === 0 ? 'Offerte' : formatCents(deliveryFee)}</dd></div>
                  {quote?.discountCents > 0 && (
                    <div className="flex justify-between text-forest-700"><dt>Remise {quote.discountCode}</dt><dd>-{formatCents(quote.discountCents)}</dd></div>
                  )}
                  <div className="mt-3 flex justify-between border-t border-forest-900/10 pt-3">
                    <dt className="font-semibold">Total TTC</dt>
                    <dd className="font-display text-xl font-bold text-forest-900">{formatCents((quote?.totalCents ?? cart.subtotalCents + deliveryFee))}</dd>
                  </div>
                </dl>
                <Link to="/commande" className="btn-primary mt-5 w-full">Passer commande <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/boutique" className="btn-ghost mt-1 w-full text-xs"><ChevronLeft className="h-3.5 w-3.5" /> Continuer mes achats</Link>
                <p className="mt-4 rounded-xl bg-forest-50 px-3 py-2 text-[11px] text-forest-800">
                  Code promo, livraison et paiement se finalisent à l’étape suivante.
                </p>
              </div>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}
