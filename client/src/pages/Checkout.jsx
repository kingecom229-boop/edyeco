import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, Loader2, Lock, Tag, Truck, Warehouse, Store, ShieldCheck } from 'lucide-react';
import Seo from '../components/Seo';
import PageHero from '../components/layout/PageHero';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCents, deliveryEstimate } from '../lib/format';
import { Checkbox, EmptyState, Spinner } from '../components/ui';
import api from '../lib/api';
import { track } from '../lib/analytics';

const initialForm = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  line1: '',
  line2: '',
  postalCode: '',
  city: '',
  country: 'France',
};

export default function Checkout() {
  const { cart, refresh } = useCart();
  const { deliveryOptions, postalCode } = useStore();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [method, setMethod] = useState('classique');
  const [code, setCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      email: f.email || user.email || '',
      firstName: f.firstName || user.firstName || '',
      lastName: f.lastName || user.lastName || '',
      phone: f.phone || user.phone || '',
    }));
  }, [user]);

  useEffect(() => {
    if (postalCode) setForm((f) => (f.postalCode ? f : { ...f, postalCode }));
  }, [postalCode]);

  const refreshQuote = async (deliveryMethod = method, discountCode = appliedCode) => {
    try {
      const res = await api.post('/checkout/quote', { deliveryMethod, discountCode: discountCode || null });
      setQuote(res.quote);
      setQuoteError('');
    } catch (err) {
      setQuoteError(err.message);
    }
  };

  useEffect(() => {
    if (cart.items?.length) refreshQuote(method, appliedCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, appliedCode, cart.items?.length, cart.subtotalCents]);

  const applyCode = async (e) => {
    e?.preventDefault?.();
    if (!code.trim()) return;
    try {
      await api.get(`/discounts/${encodeURIComponent(code.trim())}`);
      setAppliedCode(code.trim().toUpperCase());
      setQuoteError('');
      toast.success('Code promo appliqué.');
      track('promo_applied', { code: code.trim().toUpperCase() });
    } catch (err) {
      setQuoteError(err.message);
      setAppliedCode('');
    }
  };

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'Prénom requis';
    if (!form.lastName.trim()) next.lastName = 'Nom requis';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Email valide requis';
    if (!/^[+0-9 ().-]{6,}$/.test(form.phone)) next.phone = 'Téléphone requis';
    if (form.line1.trim().length < 3) next.line1 = 'Adresse requise';
    if (!/^\d{5}$/.test(form.postalCode)) next.postalCode = 'Code postal à 5 chiffres';
    if (form.city.trim().length < 2) next.city = 'Ville requise';
    if (!terms) next.terms = 'Vous devez accepter les conditions de vente.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Merci de vérifier les champs en rouge.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/checkout/orders', {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        address: {
          line1: form.line1,
          line2: form.line2,
          postalCode: form.postalCode,
          city: form.city,
          country: form.country,
        },
        deliveryMethod: method,
        discountCode: appliedCode || null,
        newsletter,
        acceptTerms: true,
        customerNote: '',
      });
      try {
        sessionStorage.setItem(
          `edyeco_order_${res.order.reference}`,
          JSON.stringify({ token: res.orderToken, order: res.order, payment: res.payment })
        );
      } catch {
        /* storage may be unavailable */
      }
      track('begin_checkout', { total: res.order.total, items: res.order.items.length });
      navigate(`/paiement/${res.order.reference}`, { state: { token: res.orderToken, order: res.order, payment: res.payment } });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const estimate = deliveryEstimate(form.postalCode);
  const deliveryFee = quote?.deliveryFeeCents ?? (method === 'retrait' ? 0 : deliveryOptions[method]?.fee_cents ?? 0);
  const total = quote?.totalCents ?? (cart.subtotalCents || 0) + deliveryFee;

  if (!cart.items?.length) {
    return (
      <>
        <Seo title="Commande | EdyEco" robots="noindex, nofollow" />
        <PageHero title="Finaliser ma commande" breadcrumbs={[{ label: 'Panier', href: '/panier' }, { label: 'Commande' }]} compact />
        <div className="container-page py-14">
          <EmptyState icon={Truck} title="Votre panier est vide" description="Ajoutez du bois à votre panier pour passer commande." action={<Link to="/boutique" className="btn-primary">Voir la boutique</Link>} />
        </div>
      </>
    );
  }

  const deliveryChoices = [
    { id: 'classique', label: deliveryOptions.classique?.label || 'Livraison classique', eta: deliveryOptions.classique?.eta || '5 à 8 jours ouvrés', icon: Truck, description: 'Camion 19 t · dépôt au pied du camion' },
    { id: 'confort', label: deliveryOptions.confort?.label || 'Livraison confort', eta: deliveryOptions.confort?.eta || 'environ 2 semaines', icon: Warehouse, description: 'Chariot élévateur · palette posée dans votre propriété' },
    { id: 'retrait', label: 'Retrait entrepôt', eta: 'sur rendez-vous', icon: Store, description: 'Soulac-sur-Mer · chargement par nos équipes' },
  ];

  return (
    <>
      <Seo title="Finaliser ma commande | EdyEco" description="Coordonnées, livraison et récapitulatif de votre commande EdyEco." robots="noindex, nofollow" />
      <PageHero title="Finaliser ma commande" description="Vos coordonnées, votre mode de livraison, puis le paiement sécurisé." breadcrumbs={[{ label: 'Panier', href: '/panier' }, { label: 'Commande' }]} compact />

      <section className="container-page py-10">
        <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1.45fr_1fr]" noValidate>
          <div className="space-y-6">
            <div className="rounded-3xl border border-forest-900/8 bg-white p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold">1. Vos coordonnées</h2>
              {!user && (
                <p className="mt-2 text-xs text-ink/55">
                  Vous avez déjà un compte ? <Link to="/connexion?next=/commande" className="font-semibold text-forest-800 underline underline-offset-2">Connectez-vous</Link> pour retrouver vos informations.
                </p>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FieldInput label="Prénom" required value={form.firstName} onChange={(v) => update('firstName', v)} error={errors.firstName} autoComplete="given-name" />
                <FieldInput label="Nom" required value={form.lastName} onChange={(v) => update('lastName', v)} error={errors.lastName} autoComplete="family-name" />
                <FieldInput label="Email" type="email" required value={form.email} onChange={(v) => update('email', v)} error={errors.email} autoComplete="email" />
                <FieldInput label="Téléphone" type="tel" required value={form.phone} onChange={(v) => update('phone', v)} error={errors.phone} autoComplete="tel" placeholder="06 12 34 56 78" />
              </div>
            </div>

            <div className="rounded-3xl border border-forest-900/8 bg-white p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold">2. Adresse de livraison</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldInput label="Adresse" required value={form.line1} onChange={(v) => update('line1', v)} error={errors.line1} autoComplete="address-line1" placeholder="12 rue des Chênes" />
                </div>
                <div className="sm:col-span-2">
                  <FieldInput label="Complément d’adresse (optionnel)" value={form.line2} onChange={(v) => update('line2', v)} autoComplete="address-line2" placeholder="Bâtiment, hameau, instruction d’accès…" />
                </div>
                <FieldInput label="Code postal" required value={form.postalCode} onChange={(v) => update('postalCode', v.replace(/\D/g, '').slice(0, 5))} error={errors.postalCode} autoComplete="postal-code" inputMode="numeric" placeholder="44300" />
                <FieldInput label="Ville" required value={form.city} onChange={(v) => update('city', v)} error={errors.city} autoComplete="address-level2" placeholder="Soulac-sur-Mer" />
              </div>
              {estimate && (
                <p className="mt-3 rounded-xl bg-forest-50 px-3 py-2 text-[11px] text-forest-800">
                  {estimate.label} — {estimate.detail}
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-forest-900/8 bg-white p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold">3. Mode de livraison</h2>
              <div className="mt-4 space-y-2">
                {deliveryChoices.map((choice) => {
                  const free = (deliveryOptions.freeAboveCents || 0) > 0 && cart.subtotalCents >= deliveryOptions.freeAboveCents && choice.id !== 'retrait';
                  const fee = choice.id === 'retrait' ? 0 : deliveryOptions[choice.id]?.fee_cents ?? 0;
                  return (
                    <label key={choice.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${method === choice.id ? 'border-forest-700 bg-forest-50/60 ring-1 ring-forest-700' : 'border-forest-900/12 hover:border-forest-300'}`}>
                      <input type="radio" name="delivery" value={choice.id} checked={method === choice.id} onChange={() => setMethod(choice.id)} className="mt-1 h-4 w-4 text-forest-700 focus:ring-forest-600" />
                      <choice.icon className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" />
                      <span className="flex-1">
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{choice.label}</span>
                          <span className="text-sm font-semibold text-ember-700">{free || fee === 0 ? 'Offert' : formatCents(fee)}</span>
                        </span>
                        <span className="mt-0.5 block text-xs text-ink/55">{choice.description} · {choice.eta}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-forest-900/8 bg-white p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold">4. Options</h2>
              <div className="mt-4 space-y-3">
                <Checkbox label="Je souhaite recevoir les conseils et offres EdyEco" description="Un email par mois maximum, désinscription en un clic." checked={newsletter} onChange={setNewsletter} />
                <Checkbox
                  label="J’accepte les conditions générales de vente et la politique de confidentialité"
                  description="Obligatoire pour finaliser votre commande."
                  checked={terms}
                  onChange={(v) => { setTerms(v); setErrors((e) => ({ ...e, terms: undefined })); }}
                />
                {errors.terms && <p className="text-xs font-medium text-rose-600">{errors.terms}</p>}
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl border border-forest-900/8 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-display text-lg font-semibold">Votre commande</h2>
              <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                {cart.items.map((item) => (
                  <li key={item.productId} className="flex items-center gap-3">
                    <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{item.name}</p>
                      <p className="text-[10px] text-ink/45">Qté {item.quantity}</p>
                    </div>
                    <p className="text-xs font-semibold">{formatCents(item.lineTotalCents)}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Code promo"
                    aria-label="Code promo"
                    className="field !py-2.5 !pl-9 text-sm"
                  />
                </div>
                <button type="button" onClick={applyCode} className="btn-outline btn-sm">Appliquer</button>
              </div>
              {quoteError && <p className="mt-2 text-xs font-medium text-rose-600">{quoteError}</p>}
              {quote?.discountCents > 0 && <p className="mt-2 text-xs font-medium text-forest-700">Code {quote.discountCode} appliqué : -{formatCents(quote.discountCents)}</p>}

              <dl className="mt-4 space-y-2 border-t border-forest-900/10 pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-ink/55">Sous-total</dt><dd>{formatCents(cart.subtotalCents)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/55">Livraison</dt><dd>{deliveryFee === 0 ? 'Offerte' : formatCents(deliveryFee)}</dd></div>
                {quote?.discountCents > 0 && <div className="flex justify-between text-forest-700"><dt>Remise</dt><dd>-{formatCents(quote.discountCents)}</dd></div>}
                <div className="flex justify-between border-t border-forest-900/10 pt-3 text-base"><dt className="font-semibold">Total TTC</dt><dd className="font-display text-xl font-bold text-forest-900">{formatCents(total)}</dd></div>
              </dl>

              <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Continuer vers le paiement
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink/45">
                <ShieldCheck className="h-3.5 w-3.5 text-forest-600" /> Paiement sécurisé · Simulation en démonstration
              </p>
              <Link to="/panier" className="btn-ghost mt-1 w-full text-xs"><ChevronLeft className="h-3.5 w-3.5" /> Retour au panier</Link>
            </div>
            <div className="mt-4 rounded-2xl bg-forest-50 p-4 text-[11px] leading-relaxed text-forest-900/70">
              <p className="flex items-center gap-2 font-semibold text-forest-900"><ShieldCheck className="h-4 w-4" /> Vos données sont protégées</p>
              <p className="mt-1">Aucune donnée bancaire n’est stockée sur nos serveurs. Le paiement est traité par un prestataire certifié.</p>
            </div>
          </aside>
        </form>
      </section>
    </>
  );
}

function FieldInput({ label, required, error, onChange, ...props }) {
  return (
    <div>
      <label className="label" htmlFor={`field-${label}`}>{label} {required && <span className="text-ember-600">*</span>}</label>
      <input
        id={`field-${label}`}
        className={`field ${error ? 'input-error' : ''}`}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}
