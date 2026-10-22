import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Package, Truck, Home, Mail, ArrowRight } from 'lucide-react';
import Seo from '../components/Seo';
import { formatCents } from '../lib/format';
import { useAuth } from '../context/AuthContext';

export default function Confirmation() {
  const { reference } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [data, setData] = useState(location.state || null);

  useEffect(() => {
    if (data) return;
    try {
      const stored = sessionStorage.getItem(`edyeco_confirmation_${reference}`);
      if (stored) setData(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, [data, reference]);

  const order = data?.order;
  const payment = data?.payment;

  return (
    <>
      <Seo title={`Commande ${reference} confirmée | EdyEco`} description="Votre commande EdyEco est confirmée." robots="noindex, nofollow" />
      <section className="bg-forest-950 pb-20 pt-14 text-white">
        <div className="container-page text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ember-500 shadow-ember"
          >
            <CheckCircle2 className="h-10 w-10" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 font-display text-3xl font-semibold sm:text-4xl">
            Merci, votre commande est confirmée !
          </motion.h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/65">
            {order ? `La commande ${order.reference} a bien été enregistrée. Un email de confirmation a été envoyé à ${order.email}.` : `La référence ${reference} a bien été enregistrée.`}
          </p>
          {payment && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] text-white/75 backdrop-blur">
              Paiement {payment.brand} •••• {payment.last4} accepté
            </p>
          )}
        </div>
      </section>

      <section className="container-page -mt-12 pb-16">
        <div className="mx-auto max-w-3xl space-y-5">
          {order ? (
            <div className="rounded-3xl border border-forest-900/8 bg-white p-6 shadow-soft sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest-900/10 pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/45">Commande</p>
                  <p className="font-display text-lg font-semibold">{order.reference}</p>
                </div>
                <p className="font-display text-2xl font-bold text-forest-900">{formatCents(order.totalCents)}</p>
              </div>
              <ul className="mt-4 space-y-3">
                {order.items?.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <img src={item.image} alt="" className="h-14 w-14 rounded-xl object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-ink/45">Quantité {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCents(item.lineTotalCents)}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-5 grid gap-4 border-t border-forest-900/10 pt-4 text-xs sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-forest-950">Adresse de livraison</p>
                  <p className="mt-1 text-ink/60">
                    {order.shippingAddress?.line1}<br />
                    {order.shippingAddress?.line2 && <>{order.shippingAddress.line2}<br /></>}
                    {order.shippingAddress?.postalCode} {order.shippingAddress?.city}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-forest-950">Mode de livraison</p>
                  <p className="mt-1 capitalize text-ink/60">{order.deliveryMethod} · {order.deliveryFeeCents ? formatCents(order.deliveryFeeCents) : 'Offert'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-forest-900/8 bg-white p-8 text-center text-sm text-ink/60 shadow-sm">
              <Package className="mx-auto h-8 w-8 text-forest-400" />
              <p className="mt-3">Le détail de cette commande n’est plus disponible dans cette session.</p>
              <Link to="/compte/commandes" className="btn-outline mt-4">Retrouver mes commandes</Link>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Mail, title: 'Email de confirmation', text: 'Récapitulatif et facture envoyés sous 5 minutes.' },
              { icon: Truck, title: 'Appel du transporteur', text: 'Sous 10 jours pour fixer votre créneau.' },
              { icon: Home, title: 'Livraison à domicile', text: 'Palette déposée au plus près de votre stockage.' },
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border border-forest-900/8 bg-white p-4">
                <step.icon className="h-5 w-5 text-ember-600" />
                <p className="mt-2 text-xs font-semibold text-forest-950">{step.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink/55">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/boutique" className="btn-primary">Continuer mes achats <ArrowRight className="h-4 w-4" /></Link>
            <Link to={user ? '/compte/commandes' : '/connexion'} className="btn-outline">{user ? 'Suivre mes commandes' : 'Créer mon compte'}</Link>
          </div>
          <p className="text-center text-[11px] text-ink/45">
            Un souci avec votre commande ? <Link to="/contact" className="font-semibold text-forest-800 underline underline-offset-2">Contactez-nous</Link>, nous répondons sous 24 h ouvrées.
          </p>
        </div>
      </section>
    </>
  );
}
