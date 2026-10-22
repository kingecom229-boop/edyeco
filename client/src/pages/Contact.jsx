import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Loader2, Mail, MapPin, Phone, Send, ShieldCheck, Warehouse } from 'lucide-react';
import Seo from '../components/Seo';
import PageHero from '../components/layout/PageHero';
import { Checkbox } from '../components/ui';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

export default function Contact() {
  const { store } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'Demande générale', message: '' });
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('Merci de consentir au traitement de vos données.');
      return;
    }
    setSending(true);
    try {
      await api.post('/contact', { ...form, consent: true });
      setDone(true);
      toast.success('Message envoyé, nous revenons vers vous rapidement.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Seo
        title="Contact — EdyEco, bois de chauffage | EdyEco"
        description="Une question sur votre commande ou votre appareil de chauffage ? L’équipe EdyEco vous répond sous 24 h ouvrées."
      />
      <PageHero
        title="Parlons de votre feu"
        description="Commande, livraison, conseil sur un appareil : écrivez-nous ou appelez-nous, une vraie personne vous répond."
        image="/media/hero-fire-poster.jpg"
        breadcrumbs={[{ label: 'Contact' }]}
        compact
      />

      <section className="container-page py-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-forest-900/8 bg-white p-6 shadow-sm sm:p-8">
            {done ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-700"><Send className="h-6 w-6" /></div>
                <h2 className="mt-4 font-display text-2xl font-semibold">Message bien reçu !</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">Notre équipe vous répond sous 24 h ouvrées à l’adresse {form.email}.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link to="/boutique" className="btn-primary">Découvrir la boutique</Link>
                  <button type="button" onClick={() => { setDone(false); setForm({ name: '', email: '', phone: '', subject: 'Demande générale', message: '' }); setConsent(false); }} className="btn-outline">Envoyer un autre message</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl font-semibold">Écrivez-nous</h2>
                <p className="mt-1 text-sm text-ink/55">Tous les champs marqués d’un * sont obligatoires. Réponse sous 24 h ouvrées.</p>
                <form onSubmit={submit} className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="contact-name">Nom complet *</label>
                      <input id="contact-name" required minLength={2} value={form.name} onChange={(e) => update('name', e.target.value)} className="field" placeholder="Camille Martin" autoComplete="name" />
                    </div>
                    <div>
                      <label className="label" htmlFor="contact-email">Email *</label>
                      <input id="contact-email" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} className="field" placeholder="vous@exemple.fr" autoComplete="email" />
                    </div>
                    <div>
                      <label className="label" htmlFor="contact-phone">Téléphone (optionnel)</label>
                      <input id="contact-phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="field" placeholder="06 12 34 56 78" autoComplete="tel" />
                    </div>
                    <div>
                      <label className="label" htmlFor="contact-subject">Sujet</label>
                      <select id="contact-subject" value={form.subject} onChange={(e) => update('subject', e.target.value)} className="field">
                        {['Demande générale', 'Suivi de commande', 'Conseil sur un appareil', 'Livraison', 'Retour / SAV', 'Professionnel'].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="contact-message">Votre message *</label>
                    <textarea id="contact-message" required minLength={10} rows={6} value={form.message} onChange={(e) => update('message', e.target.value)} className="field" placeholder="Décrivez votre besoin, votre appareil, votre code postal…" />
                  </div>
                  <Checkbox label="J’accepte que mes données soient utilisées pour traiter ma demande." description="Aucune revente, aucune newsletter automatique. Voir la politique de confidentialité." checked={consent} onChange={setConsent} />
                  {error && <p className="text-xs font-medium text-rose-600" role="alert">{error}</p>}
                  <button type="submit" disabled={sending} className="btn-primary">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer mon message
                  </button>
                </form>
              </>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl bg-forest-950 p-6 text-white">
              <h2 className="font-display text-lg font-semibold">Nos coordonnées</h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" /><span><span className="block text-xs text-white/45">Téléphone</span><a href={`tel:${String(store.phone || '').replace(/\s/g, '')}`} className="font-medium hover:text-ember-300">{store.phone}</a></span></li>
                <li className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" /><span><span className="block text-xs text-white/45">Email</span><a href={`mailto:${store.email}`} className="font-medium hover:text-ember-300">{store.email}</a></span></li>
                <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" /><span><span className="block text-xs text-white/45">Siège</span><span className="font-medium text-white/85">{store.address}</span></span></li>
                <li className="flex gap-3"><Warehouse className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" /><span><span className="block text-xs text-white/45">Entrepôt & retrait</span><span className="font-medium text-white/85">{store.warehouse}</span></span></li>
                <li className="flex gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" /><span><span className="block text-xs text-white/45">Horaires</span><span className="font-medium text-white/85">{store.hours}</span></span></li>
              </ul>
              <a href="https://www.google.com/maps/search/?api=1&query=68+route+de+Bordeaux+33780+Soulac-sur-Mer" target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm mt-5">Itinéraire vers l’entrepôt</a>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-forest-900/8 bg-sand p-6">
              <div className="absolute inset-0 opacity-[0.35]" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(#143f27 1px, transparent 1px), linear-gradient(90deg, #143f27 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
              <div className="relative">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ember-500 text-white shadow-ember"><MapPin className="h-5 w-5" /></span>
                <p className="mt-3 font-display text-base font-semibold">Entrepôt de Soulac-sur-Mer</p>
                <p className="mt-1 text-xs text-ink/55">Retrait sur rendez-vous, du lundi au vendredi. Prévoyez un véhicule adapté ou demandez le chargement assisté.</p>
                <Link to="/livraison#retrait" className="mt-3 inline-flex text-xs font-semibold text-forest-800 underline underline-offset-4">En savoir plus sur le retrait</Link>
              </div>
            </div>

            <p className="flex items-start gap-2 rounded-2xl bg-forest-50 px-4 py-3 text-[11px] text-forest-900/70">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Vos informations sont utilisées uniquement pour répondre à votre demande et conservées 12 mois maximum.
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
