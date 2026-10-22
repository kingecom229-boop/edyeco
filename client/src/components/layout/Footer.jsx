import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Facebook, Instagram, Mail, MapPin, Phone, Youtube, Clock, Leaf } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { Logo } from './Header';

const COLUMNS = [
  {
    title: 'Infos pratiques',
    links: [
      { label: 'Bois de chauffage', to: '/categorie/bois-de-chauffage' },
      { label: 'Granulés de bois', to: '/categorie/granules-de-bois' },
      { label: 'Bûches compressées', to: '/categorie/buches-compressees' },
      { label: 'Bûches fendues', to: '/boutique' },
      { label: 'Stère de bois', to: '/produit/stere-de-bois-33-cm-vrac' },
      { label: 'Livraison & délais', to: '/livraison' },
    ],
  },
  {
    title: 'Commander',
    links: [
      { label: 'Mon compte', to: '/compte' },
      { label: 'Mes commandes', to: '/compte/commandes' },
      { label: 'Facilités de paiement', to: '/cgv#paiement' },
      { label: 'Conditions générales de vente', to: '/cgv' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Nous contacter', to: '/contact' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'Qui sommes-nous ?', to: '/a-propos' },
      { label: 'Nos engagements', to: '/a-propos#engagements' },
      { label: 'Nos partenaires', to: '/a-propos#partenaires' },
      { label: 'Fabrication française', to: '/a-propos#engagements' },
      { label: 'Mentions légales', to: '/mentions-legales' },
      { label: 'Politique de confidentialité', to: '/confidentialite' },
    ],
  },
];

export default function Footer() {
  const { store, settings } = useStore();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const social = settings.social || {};

  const subscribe = async (e) => {
    e.preventDefault();
    if (!consent) {
      toast.error('Merci de cocher la case de consentement.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/newsletter', { email, consent: true, source: 'footer' });
      setDone(true);
      setEmail('');
      setConsent(false);
      toast.success('Inscription confirmée. À très vite dans votre boîte mail !');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-forest-950 text-white/75">
      <div className="border-b border-white/10">
        <div className="container-page grid gap-8 py-12 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Logo muted />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
              Le bois de chauffage sec, en circuit court, livré avec soin partout en France métropolitaine.
              Une chaleur naturelle, toute l’année.
            </p>
            <address className="mt-5 space-y-2 text-sm not-italic text-white/60">
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" />{store.address}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-ember-400" /><a href={`tel:${String(store.phone || '').replace(/\s/g, '')}`} className="hover:text-white">{store.phone}</a></p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-ember-400" /><a href={`mailto:${store.email}`} className="hover:text-white">{store.email}</a></p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-ember-400" />{store.hours}</p>
            </address>
            <Link to="/contact" className="btn-primary btn-sm mt-5">Nous contacter</Link>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white">{col.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-white/60 transition hover:text-ember-300">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-b border-white/10">
        <div className="container-page grid gap-6 py-8 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 font-display text-lg font-semibold text-white">
              <Leaf className="h-5 w-5 text-forest-400" /> Conseils de saison, sans spam
            </p>
            <p className="mt-1 text-sm text-white/55">Un email par mois : entretien du poêle, prix du bois, astuces de séchage.</p>
          </div>
          {done ? (
            <p className="self-center rounded-2xl bg-forest-800/60 px-4 py-3 text-sm text-white">Merci ! Vous êtes bien inscrit à notre newsletter.</p>
          ) : (
            <form onSubmit={subscribe} className="self-center">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor="footer-email">Votre email</label>
                <input
                  id="footer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/35 focus:border-ember-400 focus:outline-none"
                />
                <button type="submit" disabled={loading} className="btn-primary shrink-0">
                  {loading ? 'Envoi…' : 'Je m’inscris'} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11px] text-white/45">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 rounded border-white/30 bg-transparent" />
                J’accepte de recevoir les conseils EdyEco et d’être inscrit à la newsletter (désinscription en un clic).
              </label>
            </form>
          )}
        </div>
      </div>

      <div className="container-page flex flex-col gap-6 py-8 text-xs text-white/45">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white/70">Paiement sécurisé</span>
            {['VISA', 'Mastercard', 'CB', '3× sans frais'].map((p) => (
              <span key={p} className="rounded-md border border-white/15 px-2 py-1 font-semibold tracking-wide text-white/60">{p}</span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="rounded-full border border-white/15 p-2 hover:border-ember-400 hover:text-white"><Facebook className="h-4 w-4" /></a>}
            {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="rounded-full border border-white/15 p-2 hover:border-ember-400 hover:text-white"><Instagram className="h-4 w-4" /></a>}
            {social.youtube && <a href={social.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="rounded-full border border-white/15 p-2 hover:border-ember-400 hover:text-white"><Youtube className="h-4 w-4" /></a>}
          </div>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row">
          <p>© {new Date().getFullYear()} {store.legalName || 'EdyEco'} — Tous droits réservés. Bois compressé, compacté et densifié.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/cgv" className="hover:text-white">CGV</Link>
            <Link to="/mentions-legales" className="hover:text-white">Mentions légales</Link>
            <Link to="/confidentialite" className="hover:text-white">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
