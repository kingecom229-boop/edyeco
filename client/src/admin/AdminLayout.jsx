import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, BookOpen, Boxes, ClipboardList, ExternalLink, Flame, HelpCircle, LayoutDashboard, LogOut, Mail, Menu,
  MessageSquare, Package, Percent, Settings, ShieldCheck, ShoppingCart, Star, Tags, Users, X, History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/ui';
import { Logo } from '../components/layout/Header';

const NAV = [
  {
    section: 'Pilotage',
    items: [
      { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
      { to: '/admin/commandes', label: 'Commandes', icon: ClipboardList },
      { to: '/admin/clients', label: 'Clients', icon: Users },
      { to: '/admin/paniers', label: 'Paniers abandonnés', icon: ShoppingCart },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    section: 'Catalogue',
    items: [
      { to: '/admin/produits', label: 'Produits', icon: Package },
      { to: '/admin/categories', label: 'Catégories', icon: Tags },
      { to: '/admin/avis', label: 'Avis clients', icon: Star },
      { to: '/admin/promos', label: 'Codes promo', icon: Percent },
    ],
  },
  {
    section: 'Contenu & CRM',
    items: [
      { to: '/admin/blog', label: 'Blog & guides', icon: BookOpen },
      { to: '/admin/faq', label: 'FAQ', icon: HelpCircle },
      { to: '/admin/newsletter', label: 'Newsletter', icon: Mail },
      { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
    ],
  },
  {
    section: 'Système',
    items: [
      { to: '/admin/reglages', label: 'Réglages', icon: Settings },
      { to: '/admin/journal', label: 'Journal d’audit', icon: History },
    ],
  },
];

export default function AdminLayout() {
  const { user, loading, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-cream"><Spinner className="h-8 w-8 text-forest-600" /></div>;
  }
  if (!user) {
    return <Navigate to={`/connexion?next=${encodeURIComponent('/admin')}`} replace />;
  }
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
        <ShieldCheck className="h-12 w-12 text-rose-500" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Accès administrateur requis</h1>
        <p className="mt-2 max-w-md text-sm text-ink/55">Ce compte n’a pas les droits nécessaires. Connectez-vous avec un compte administrateur.</p>
        <Link to="/connexion?next=/admin" className="btn-primary mt-6">Changer de compte</Link>
      </div>
    );
  }

  const signOut = async () => {
    await logout();
    toast.info('Déconnecté de l’administration.');
    navigate('/');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-ink/50 hover:bg-forest-50 lg:hidden" aria-label="Fermer le menu"><X className="h-5 w-5" /></button>
      </div>
      <div className="mx-4 mb-4 flex items-center gap-2 rounded-xl bg-forest-50 px-3 py-2 text-[11px] font-medium text-forest-800">
        <ShieldCheck className="h-3.5 w-3.5" /> Session administrateur
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Navigation administration">
        {NAV.map((group) => (
          <div key={group.section} className="mb-5">
            <p className="px-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-ink/35">{group.section}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `mb-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition ${isActive ? 'bg-forest-900 text-white shadow-sm' : 'text-ink/65 hover:bg-forest-50 hover:text-forest-900'}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-forest-900/10 p-3">
        <Link to="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-ink/60 hover:bg-forest-50" target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5" /> Voir la boutique
        </Link>
        <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-ink/60 hover:bg-rose-50 hover:text-rose-700">
          <LogOut className="h-3.5 w-3.5" /> Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f4ee]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-forest-900/10 bg-white lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button type="button" className="absolute inset-0 bg-forest-950/50" aria-label="Fermer le menu" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 bg-white shadow-lift">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-forest-900/10 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setOpen(true)} className="rounded-full p-2 hover:bg-forest-50 lg:hidden" aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button>
            <div className="flex items-center gap-2 text-xs text-ink/45">
              <Boxes className="h-4 w-4" />
              <span className="hidden sm:inline">Administration</span>
              <span className="text-ink/25">/</span>
              <span className="font-medium text-forest-900">{location.pathname.replace('/admin', '') || 'Tableau de bord'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 rounded-full border border-forest-900/15 px-3 py-1.5 text-[11px] font-semibold text-forest-800 hover:bg-forest-50 sm:flex">
              <ExternalLink className="h-3.5 w-3.5" /> Boutique
            </Link>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-900 text-xs font-bold text-white">
                {(user.firstName || user.email).slice(0, 1).toUpperCase()}
              </span>
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold leading-tight">{user.firstName || 'Admin'} {user.lastName}</p>
                <p className="text-[10px] text-ink/40">{user.email}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8"><Outlet /></main>
        <p className="px-6 pb-6 text-center text-[10px] text-ink/30">EdyEco — console d’administration. Toutes les actions sensibles sont journalisées.</p>
      </div>
    </div>
  );
}

export { Flame, Boxes };
