import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Lock } from 'lucide-react';
import Seo from '../../components/Seo';
import AuthLayout from '../../components/layout/AuthLayout';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export default function Reset() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('8 caractères minimum.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      toast.success('Mot de passe mis à jour.');
      setTimeout(() => navigate('/connexion'), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Lien invalide" subtitle="Ce lien de réinitialisation est incomplet ou expiré.">
        <Link to="/mot-de-passe-oublie" className="btn-primary w-full">Demander un nouveau lien</Link>
      </AuthLayout>
    );
  }

  return (
    <>
      <Seo title="Réinitialiser mon mot de passe | EdyEco" robots="noindex, nofollow" />
      <AuthLayout title="Choisissez un nouveau mot de passe" subtitle="Le lien est valable une heure et ne peut être utilisé qu’une fois.">
        {done ? (
          <div className="rounded-2xl border border-forest-200 bg-white p-6 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-forest-600" />
            <p className="mt-3 font-display text-lg font-semibold">C’est fait !</p>
            <p className="mt-1 text-sm text-ink/60">Vous allez être redirigé vers la page de connexion.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="reset-password">Nouveau mot de passe</label>
              <input id="reset-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="field" autoComplete="new-password" placeholder="8 caractères minimum" />
            </div>
            <div>
              <label className="label" htmlFor="reset-confirm">Confirmer le mot de passe</label>
              <input id="reset-confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field" autoComplete="new-password" placeholder="Retapez votre mot de passe" />
            </div>
            {error && <p className="text-xs font-medium text-rose-600" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Mettre à jour
            </button>
            <p className="text-center text-sm text-ink/55"><Link to="/connexion" className="font-semibold text-forest-800 underline underline-offset-2">Retour à la connexion</Link></p>
          </form>
        )}
      </AuthLayout>
    </>
  );
}
