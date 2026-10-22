import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import Seo from '../../components/Seo';
import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      toast.success(`Bienvenue ${user.firstName || ''} !`);
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : user.role === 'admin' ? '/admin' : '/compte', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo title="Connexion | EdyEco" description="Connectez-vous à votre compte EdyEco." robots="noindex, nofollow" />
      <AuthLayout title="Content de vous revoir." subtitle="Connectez-vous pour retrouver vos commandes et vos informations.">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="login-email">Adresse email</label>
            <input id="login-email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" placeholder="vous@exemple.fr" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label" htmlFor="login-password">Mot de passe</label>
              <Link to="/mot-de-passe-oublie" className="mb-1.5 text-[11px] font-medium text-forest-700 hover:underline">Mot de passe oublié ?</Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="field pr-12"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink/40 hover:bg-forest-50">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700" role="alert">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Se connecter
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-ink/60">
          Pas encore de compte ? <Link to="/inscription" className="font-semibold text-forest-800 underline underline-offset-2">Créer mon compte</Link>
        </p>
        <p className="mt-6 rounded-2xl border border-forest-900/10 bg-white/60 px-4 py-3 text-[11px] leading-relaxed text-ink/55">
          Environnement de démonstration : le paiement est simulé, aucun débit réel n’est effectué. Les identifiants
          d’administration sont transmis séparément et doivent être changés avant la mise en production.
        </p>
      </AuthLayout>
    </>
  );
}
