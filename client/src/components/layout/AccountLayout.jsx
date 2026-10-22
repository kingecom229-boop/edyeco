import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Package, ShieldCheck, User, Flame } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Spinner } from '../ui';

const LINKS = [
  { to: '/compte', label: 'Vue d’ensemble', icon: LayoutDashboard, end: true },
  { to: '/compte/commandes', label: 'Mes commandes', icon: Package },
  { to: '/compte/profil', label: 'Mes informations', icon: User },
];

export default function AccountLayout() {
  const { user, loading, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Spinner className="h-8 w-8 text-forest-600" /></div>;
  }
  if (!user) {
    return <Navigate to={`/connexion?next=${encodeURIComponent('/compte')}`} replace />;
  }

  const signOut = async () => {
    await logout();
    toast.info('Vous êtes déconnecté. À bientôt !');
    navigate('/');
  };

  return (
    <div className="bg-cream">
      <div className="bg-forest-950 py-10 text-white">
        <div className="container-page flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow !text-ember-300">Espace client</p>
            <h1 className="mt-2 font-display text-3xl font-semibold">Bonjour {user.firstName || user.email.split('@')[0]} 👋</h1>
            <p className="mt-1 text-sm text-white/55">Retrouvez vos commandes, vos informations et vos préférences.</p>
          </div>
          {isAdmin && (
            <Link to="/admin" className="btn inline-flex items-center gap-2 rounded-full bg-ember-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ember-600">
              <ShieldCheck className="h-4 w-4" /> Administration
            </Link>
          )}
        </div>
      </div>

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[240px_1fr]">
        <aside>
          <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-forest-900/8 bg-white p-2 no-scrollbar lg:flex-col" aria-label="Compte">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-forest-900 text-white' : 'text-ink/65 hover:bg-forest-50 hover:text-forest-900'}`}
              >
                <link.icon className="h-4 w-4" /> {link.label}
              </NavLink>
            ))}
            <button type="button" onClick={signOut} className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium text-ink/55 transition hover:bg-rose-50 hover:text-rose-700">
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
          </nav>
          <div className="mt-4 hidden rounded-2xl bg-forest-50 p-4 text-xs text-forest-900/70 lg:block">
            <p className="flex items-center gap-1.5 font-semibold text-forest-900"><Flame className="h-4 w-4" /> Besoin d’aide ?</p>
            <p className="mt-1">Notre équipe vous répond sous 24 h ouvrées.</p>
            <Link to="/contact" className="mt-2 inline-flex font-semibold text-forest-800 underline underline-offset-2">Nous contacter</Link>
          </div>
        </aside>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}
