import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MailCheck, Send } from 'lucide-react';
import Seo from '../../components/Seo';
import AuthLayout from '../../components/layout/AuthLayout';
import api from '../../lib/api';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo title="Mot de passe oublié | EdyEco" robots="noindex, nofollow" />
      <AuthLayout title="Mot de passe oublié ?" subtitle="Indiquez votre email : si un compte existe, vous recevrez un lien de réinitialisation valable 1 heure.">
        {done ? (
          <div className="rounded-2xl border border-forest-200 bg-white p-6 text-center">
            <MailCheck className="mx-auto h-8 w-8 text-forest-600" />
            <p className="mt-3 font-display text-lg font-semibold">Demande envoyée</p>
            <p className="mt-2 text-sm text-ink/60">
              Si un compte correspond à <strong>{email}</strong>, un email vient de partir. Pensez à vérifier vos spams.
            </p>
            <Link to="/connexion" className="btn-outline mt-5">Retour à la connexion</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="forgot-email">Votre adresse email</label>
              <input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="vous@exemple.fr" autoComplete="email" />
            </div>
            {error && <p className="text-xs font-medium text-rose-600" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer le lien
            </button>
            <p className="text-center text-sm text-ink/55">
              <Link to="/connexion" className="font-semibold text-forest-800 underline underline-offset-2">Retour à la connexion</Link>
            </p>
          </form>
        )}
      </AuthLayout>
    </>
  );
}
