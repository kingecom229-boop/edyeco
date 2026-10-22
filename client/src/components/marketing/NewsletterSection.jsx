import { useState } from 'react';
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { track } from '../../lib/analytics';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!consent) {
      toast.error('Merci de cocher la case de consentement.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/newsletter', { email, consent: true, source: 'home' });
      setDone(true);
      track('newsletter_signup', { source: 'home' });
      toast.success('Bienvenue ! Votre inscription est confirmée.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section bg-sand/60">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-4xl bg-forest-gradient p-8 text-white sm:p-12 lg:p-14">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-ember-500/20 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-forest-400/20 blur-3xl" aria-hidden="true" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="eyebrow !text-ember-300"><Mail className="h-3.5 w-3.5" /> La lettre du feu</p>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Un email par mois pour mieux chauffer, moins dépenser.</h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/65">
                Conseils d’entretien, guides de choix, alertes de disponibilité et offres réservées aux abonnés.
                Pas de spam, une désinscription en un clic.
              </p>
              <div className="mt-5 flex flex-wrap gap-4 text-[11px] text-white/55">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-forest-300" /> Données protégées (RGPD)</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-forest-300" /> Jamais revendues</span>
              </div>
            </div>
            {done ? (
              <div className="rounded-3xl border border-white/15 bg-white/10 p-8 text-center">
                <p className="font-display text-2xl font-semibold">C’est noté, merci !</p>
                <p className="mt-2 text-sm text-white/65">Vous recevrez nos prochains conseils dans votre boîte mail.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <label htmlFor="newsletter-home" className="text-xs font-semibold uppercase tracking-wider text-white/60">Votre adresse email</label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="newsletter-home"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.fr"
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-ember-400 focus:outline-none"
                  />
                  <button type="submit" disabled={loading} className="btn-primary shrink-0">
                    {loading ? 'Envoi…' : 'Je m’inscris'} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] text-white/50">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 rounded border-white/30 bg-transparent" />
                  J’accepte de recevoir la newsletter EdyEco et j’ai lu la politique de confidentialité.
                </label>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
