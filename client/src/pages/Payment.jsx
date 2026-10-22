import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, CreditCard, Info, Loader2, Lock, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import Seo from '../components/Seo';
import { formatCents } from '../lib/format';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

function formatCardNumber(value) {
  return value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export default function Payment() {
  const { reference } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [order, setOrder] = useState(location.state?.order || null);
  const [token, setToken] = useState(location.state?.token || '');
  const [payment, setPayment] = useState(location.state?.payment || null);
  const [card, setCard] = useState({ number: '', holder: '', expiry: '', cvc: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (order && token) return;
    try {
      const stored = sessionStorage.getItem(`edyeco_order_${reference}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setOrder(parsed.order);
        setToken(parsed.token);
        setPayment(parsed.payment);
      }
    } catch {
      /* ignore */
    }
  }, [order, reference, token]);

  const brand = useMemo(() => {
    const n = card.number.replace(/\s/g, '');
    if (/^4/.test(n)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'American Express';
    return 'Carte bancaire';
  }, [card.number]);

  const prefill = (number) => {
    setCard({ number: formatCardNumber(number), holder: 'Camille Martin', expiry: '12/30', cvc: '123' });
    setErrors({});
    setServerError('');
  };

  const validate = () => {
    const next = {};
    const digits = card.number.replace(/\s/g, '');
    if (digits.length < 13) next.number = 'Numéro de carte incomplet.';
    if (card.holder.trim().length < 2) next.holder = 'Nom du titulaire requis.';
    if (!/^\d{2}\/\d{2,4}$/.test(card.expiry)) next.expiry = 'Format MM/AA.';
    if (!/^\d{3,4}$/.test(card.cvc)) next.cvc = 'CVC à 3 ou 4 chiffres.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const pay = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setStatus('processing');
    try {
      const res = await api.post(`/checkout/orders/${reference}/pay`, { token, card });
      setStatus('success');
      try {
        sessionStorage.setItem(`edyeco_confirmation_${reference}`, JSON.stringify({ order: res.order, payment: res.payment }));
        sessionStorage.removeItem(`edyeco_order_${reference}`);
      } catch {
        /* ignore */
      }
      setTimeout(() => navigate(`/confirmation/${reference}`, { replace: true, state: { order: res.order, payment: res.payment } }), 900);
    } catch (err) {
      setStatus('error');
      setServerError(err.message);
      toast.error(err.message);
    }
  };

  if (!order || !token) {
    return (
      <>
        <Seo title="Paiement | EdyEco" robots="noindex, nofollow" />
        <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
          <Info className="h-12 w-12 text-ember-500" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Session de paiement expirée</h1>
          <p className="mt-2 max-w-md text-sm text-ink/60">
            Pour votre sécurité, les sessions de paiement expirent après quelques minutes.
            Reprenez votre commande depuis le panier : votre sélection est conservée.
          </p>
          <Link to="/commande" className="btn-primary mt-6">Reprendre ma commande</Link>
        </div>
      </>
    );
  }

  const expired = order.status !== 'pending';

  return (
    <>
      <Seo title={`Paiement de la commande ${reference} | EdyEco`} description="Paiement sécurisé de votre commande EdyEco." robots="noindex, nofollow" />
      <section className="bg-forest-950 pb-10 pt-8 text-white">
        <div className="container-page">
          <Link to="/commande" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Modifier ma commande</Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow !text-ember-300">Paiement sécurisé</p>
              <h1 className="mt-2 font-display text-3xl font-semibold">Finalisez votre commande</h1>
              <p className="mt-1 text-sm text-white/55">Commande {reference} · {order.items?.length} article(s)</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-white/55">
              <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-forest-300" /> Connexion chiffrée</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-forest-300" /> 3-D Secure simulé</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page -mt-4 pb-16">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-forest-900/8 bg-white p-5 shadow-soft sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold">Carte bancaire</h2>
                <p className="mt-1 text-xs text-ink/50">Visa, Mastercard, CB — débit immédiat.</p>
              </div>
              <span className="rounded-full bg-ember-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-ember-700">Mode simulation</span>
            </div>

            <div className="mt-4 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                <strong>Page de démonstration.</strong> Aucun débit réel ne sera effectué. En production, ce module est remplacé
                par Stripe (aucune donnée bancaire ne transite par nos serveurs).
              </p>
            </div>

            {expired ? (
              <div className="mt-6 rounded-2xl bg-forest-50 p-5 text-sm">
                <p className="font-semibold">Cette commande a déjà été traitée.</p>
                <Link to={`/confirmation/${reference}`} className="btn-primary mt-4">Voir ma commande</Link>
              </div>
            ) : (
              <form onSubmit={pay} className="mt-5 space-y-4" noValidate>
                <div>
                  <label className="label" htmlFor="card-holder">Nom du titulaire</label>
                  <input id="card-holder" autoComplete="cc-name" value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })} className={`field ${errors.holder ? 'input-error' : ''}`} placeholder="Camille Martin" />
                  {errors.holder && <p className="mt-1 text-xs text-rose-600">{errors.holder}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="card-number">Numéro de carte</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
                    <input
                      id="card-number"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={card.number}
                      onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                      className={`field !pl-10 tracking-wider ${errors.number ? 'input-error' : ''}`}
                      placeholder="4242 4242 4242 4242"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-ink/40">{brand}</span>
                  </div>
                  {errors.number && <p className="mt-1 text-xs text-rose-600">{errors.number}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="card-expiry">Expiration</label>
                    <input id="card-expiry" inputMode="numeric" autoComplete="cc-exp" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })} className={`field ${errors.expiry ? 'input-error' : ''}`} placeholder="MM/AA" />
                    {errors.expiry && <p className="mt-1 text-xs text-rose-600">{errors.expiry}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="card-cvc">CVC</label>
                    <input id="card-cvc" inputMode="numeric" autoComplete="cc-csc" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} className={`field ${errors.cvc ? 'input-error' : ''}`} placeholder="123" />
                    {errors.cvc && <p className="mt-1 text-xs text-rose-600">{errors.cvc}</p>}
                  </div>
                </div>

                {serverError && (
                  <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700" role="alert">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}
                  </p>
                )}

                <button type="submit" disabled={status === 'processing' || status === 'success'} className="btn-primary w-full py-4 text-base">
                  {status === 'processing' ? <><Loader2 className="h-5 w-5 animate-spin" /> Paiement en cours…</> :
                   status === 'success' ? <><CheckCircle2 className="h-5 w-5" /> Paiement accepté</> :
                   <><Lock className="h-4 w-4" /> Payer {formatCents(order.totalCents)}</>}
                </button>
                <p className="text-center text-[10px] text-ink/40">
                  En validant, vous acceptez les <Link to="/cgv" className="underline">CGV</Link> d’EdyEco. Simulation : aucune carte n’est débitée.
                </p>
              </form>
            )}

            <div className="mt-5 rounded-2xl border border-forest-900/10 bg-cream/60 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-forest-900"><Info className="h-3.5 w-3.5" /> Cartes de test</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => prefill('4242424242424242')} className="rounded-xl border border-forest-900/10 bg-white px-3 py-2 text-left text-[11px] hover:border-forest-400">
                  <span className="block font-semibold text-forest-800">4242 4242 4242 4242</span>
                  <span className="text-ink/50">Paiement accepté</span>
                </button>
                <button type="button" onClick={() => prefill('4000000000000002')} className="rounded-xl border border-forest-900/10 bg-white px-3 py-2 text-left text-[11px] hover:border-rose-300">
                  <span className="block font-semibold text-rose-700">4000 0000 0000 0002</span>
                  <span className="text-ink/50">Paiement refusé</span>
                </button>
              </div>
              <p className="mt-2 text-[10px] text-ink/40">Date future au format MM/AA, CVC 3 chiffres.</p>
            </div>
          </motion.div>

          <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-4">
            <div className="rounded-3xl border border-forest-900/8 bg-white p-5">
              <h2 className="font-display text-base font-semibold">Récapitulatif</h2>
              <ul className="mt-3 space-y-3">
                {order.items?.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{item.name}</p>
                      <p className="text-[10px] text-ink/45">Qté {item.quantity}</p>
                    </div>
                    <p className="text-xs font-semibold">{formatCents(item.lineTotalCents)}</p>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2 border-t border-forest-900/10 pt-3 text-xs">
                <div className="flex justify-between"><dt className="text-ink/55">Sous-total</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/55">Livraison ({order.deliveryMethod})</dt><dd>{order.deliveryFeeCents ? formatCents(order.deliveryFeeCents) : 'Offerte'}</dd></div>
                {order.discountCents > 0 && <div className="flex justify-between text-forest-700"><dt>Remise {order.discountCode}</dt><dd>-{formatCents(order.discountCents)}</dd></div>}
                <div className="flex justify-between border-t border-forest-900/10 pt-2 text-sm"><dt className="font-semibold">Total TTC</dt><dd className="font-display text-lg font-bold text-forest-900">{formatCents(order.totalCents)}</dd></div>
              </dl>
            </div>
            <div className="rounded-3xl border border-forest-900/8 bg-forest-50 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-forest-900"><ShieldCheck className="h-4 w-4" /> Livraison</p>
              <p className="mt-1 text-xs text-ink/60">
                {order.deliveryMethod === 'retrait' ? 'Retrait à l’entrepôt de Soulac-sur-Mer, sur rendez-vous.' :
                 order.deliveryMethod === 'confort' ? 'Livraison confort : le transporteur vous contacte sous 10 jours.' :
                 'Livraison classique : créneau communiqué sous 5 jours ouvrés.'}
              </p>
              <p className="mt-2 text-xs text-ink/60">{order.shippingAddress?.line1}, {order.shippingAddress?.postalCode} {order.shippingAddress?.city}</p>
              <p className="mt-2 text-[11px] text-ink/45">Un email de confirmation sera envoyé à {order.email}.</p>
            </div>
          </motion.aside>
        </div>
      </section>
    </>
  );
}
