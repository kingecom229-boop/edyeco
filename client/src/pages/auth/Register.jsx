import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2, UserPlus } from 'lucide-react';
import Seo from '../../components/Seo';
import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Checkbox } from '../../components/ui';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [newsletter, setNewsletter] = useState(true);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = form.password.length >= 12 ? 3 : form.password.length >= 8 ? 2 : form.password.length > 0 ? 1 : 0;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!terms) {
      setError('Merci d’accepter les conditions générales de vente.');
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, newsletter });
      toast.success('Votre compte est créé, bienvenue chez EdyEco !');
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : '/compte', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo title="Créer un compte | EdyEco" description="Créez votre compte EdyEco pour suivre vos commandes." robots="noindex, nofollow" />
      <AuthLayout title="Créons votre compte." subtitle="Suivez vos commandes, enregistrez vos adresses et recevez nos conseils.">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="reg-first">Prénom *</label>
              <input id="reg-first" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="field" autoComplete="given-name" placeholder="Camille" />
            </div>
            <div>
              <label className="label" htmlFor="reg-last">Nom</label>
              <input id="reg-last" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="field" autoComplete="family-name" placeholder="Martin" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="reg-email">Adresse email *</label>
            <input id="reg-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" autoComplete="email" placeholder="vous@exemple.fr" />
          </div>
          <div>
            <label className="label" htmlFor="reg-phone">Téléphone (optionnel)</label>
            <input id="reg-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="field" autoComplete="tel" placeholder="06 12 34 56 78" />
          </div>
          <div>
            <label className="label" htmlFor="reg-password">Mot de passe *</label>
            <input id="reg-password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field" autoComplete="new-password" placeholder="8 caractères minimum" />
            <div className="mt-1.5 flex gap-1" aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <span key={i} className={`h-1 flex-1 rounded-full ${strength >= i ? (strength === 1 ? 'bg-rose-400' : strength === 2 ? 'bg-amber-400' : 'bg-forest-500') : 'bg-forest-900/10'}`} />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink/45">8 caractères minimum. Une phrase longue est plus sûre qu’un mot court.</p>
          </div>
          <div className="space-y-2 pt-1">
            <Checkbox label="Je souhaite recevoir les conseils EdyEco" description="Un email par mois, désinscription en un clic." checked={newsletter} onChange={setNewsletter} />
            <Checkbox label="J’accepte les CGV et la politique de confidentialité" checked={terms} onChange={setTerms} />
          </div>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700" role="alert">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Créer mon compte
          </button>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink/45">
            <li className="flex items-center gap-1"><Check className="h-3 w-3 text-forest-600" /> Commande suivie</li>
            <li className="flex items-center gap-1"><Check className="h-3 w-3 text-forest-600" /> Adresses enregistrées</li>
            <li className="flex items-center gap-1"><Check className="h-3 w-3 text-forest-600" /> Conseils personnalisés</li>
          </ul>
        </form>
        <p className="mt-6 text-center text-sm text-ink/60">
          Déjà client ? <Link to="/connexion" className="font-semibold text-forest-800 underline underline-offset-2">Se connecter</Link>
        </p>
      </AuthLayout>
    </>
  );
}
