import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown, Flame, MapPin, Menu, Phone, Search, ShoppingBag, User, X, Leaf, Truck, BookOpen, HelpCircle, Package, Plus,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import SearchDialog from './SearchDialog';
import PostalModal from './PostalModal';
import { useBodyLock } from '../../lib/hooks';

const NAV = [
  { label: 'Boutique', to: '/boutique' },
  {
    label: 'Bois de chauffage',
    to: '/categorie/bois-de-chauffage',
    children: {
      featured: { title: 'Nos bûches', text: 'Chêne, hêtre et charme séchés naturellement', to: '/categorie/bois-de-chauffage', image: '/products/palette-33.png' },
      links: [
        { label: 'Bûches 25 cm — poêles compacts', to: '/boutique?length=25' },
        { label: 'Bûches 30 cm — polyvalentes', to: '/boutique?length=30' },
        { label: 'Bûches 33 cm — les plus vendues', to: '/boutique?length=33' },
        { label: 'Bûches 40 cm — grands poêles', to: '/boutique?length=40' },
        { label: 'Bûches 50 cm — cheminées', to: '/boutique?length=50' },
      ],
      aside: { title: 'Quelle longueur choisir ?', text: 'Notre guide vous aide à mesurer votre foyer.', to: '/blog/buches-25-30-50-cm-quelle-longueur-choisir' },
    },
  },
  {
    label: 'Granulés de bois',
    to: '/categorie/granules-de-bois',
    children: {
      featured: { title: 'Granulés ENplus A1', text: '66 sacs de 15 kg, chaleur régulière et faible cendre', to: '/categorie/granules-de-bois', image: '/products/granules.png' },
      links: [
        { label: 'Palette de granulés', to: '/produit/granules-de-bois-enplus-a1-palette-66-sacs' },
        { label: 'Bien choisir ses pellets', to: '/blog/granules-de-bois-bien-choisir-ses-pellets' },
        { label: 'Stockage des granulés', to: '/faq' },
      ],
    },
  },
  {
    label: 'Bûches compressées',
    to: '/categorie/buches-compressees',
    children: {
      featured: { title: 'Bois densifié', text: 'Haute densité, combustion longue, sans additif', to: '/categorie/buches-compressees', image: '/products/buches-compressees.png' },
      links: [
        { label: 'Palette 1,2 stère', to: '/produit/buches-compressees-palette-12-stere' },
        { label: 'Bûches de nuit', to: '/produit/buches-de-nuit-palette-12-stere' },
        { label: 'Tout savoir sur le bois densifié', to: '/blog/quel-bois-de-chauffage-choisir-guide-2026' },
      ],
    },
  },
  {
    label: 'Infos pratiques',
    to: '/livraison',
    children: {
      links: [
        { label: 'Livraison & délais', to: '/livraison', icon: Truck },
        { label: 'FAQ bois de chauffage', to: '/faq', icon: HelpCircle },
        { label: 'Conseils & guides', to: '/blog', icon: BookOpen },
        { label: 'Nous contacter', to: '/contact', icon: Phone },
        { label: 'Retrait entrepôt', to: '/livraison#retrait', icon: Package },
      ],
    },
  },
  {
    label: 'EdyEco',
    to: '/a-propos',
    children: {
      links: [
        { label: 'Qui sommes-nous ?', to: '/a-propos', icon: Leaf },
        { label: 'Nos engagements', to: '/a-propos#engagements', icon: Flame },
        { label: 'CGV', to: '/cgv' },
        { label: 'Mentions légales', to: '/mentions-legales' },
        { label: 'Confidentialité', to: '/confidentialite' },
      ],
    },
  },
];

function Logo({ muted = false }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="EdyEco — accueil">
      <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden">
        <img
          src="/brand/logo-mark.png"
          alt=""
          width="48"
          height="48"
          className="h-12 w-12 object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
        />
      </span>
      <span className="leading-none">
        <span className={`block font-display text-2xl font-bold tracking-tight ${muted ? 'text-white' : 'text-forest-900'}`}>
          Edy<span className="text-ember-600">Eco</span>
        </span>
        <span className={`mt-1 block text-[9px] font-semibold uppercase tracking-[0.28em] ${muted ? 'text-white/60' : 'text-forest-800/60'}`}>
          Bois de chauffage
        </span>
      </span>
    </Link>
  );
}

function DesktopDropdown({ item, open, onOpen, onClose }) {
  const ref = useRef(null);
  const closeTimer = useRef(null);
  const location = useLocation();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  const enter = () => {
    clearTimeout(closeTimer.current);
    onOpen();
  };
  const leave = () => {
    closeTimer.current = setTimeout(onClose, 160);
  };
  const children = item.children;

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <Link
        to={item.to}
        aria-expanded={open}
        aria-haspopup="true"
        onFocus={enter}
        className={`flex items-center gap-1 rounded-full px-3 py-2 text-[13.5px] font-medium transition ${
          open ? 'bg-forest-50 text-forest-900' : 'text-ink/75 hover:bg-forest-50 hover:text-forest-900'
        }`}
      >
        {item.label}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </Link>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16 }}
            className="absolute left-1/2 top-full z-50 w-[640px] -translate-x-1/2 pt-3"
          >
            <div className="overflow-hidden rounded-3xl border border-forest-900/10 bg-white shadow-lift">
              <div className="grid grid-cols-5 gap-2 p-3">
                {children.featured && (
                  <Link to={children.featured.to} className="col-span-2 group relative overflow-hidden rounded-2xl bg-forest-50 p-4">
                    <div className="flex h-full flex-col justify-between">
                      <div>
                        <p className="eyebrow !text-[10px]">À la une</p>
                        <p className="mt-2 font-display text-lg font-semibold leading-tight text-forest-950">{children.featured.title}</p>
                        <p className="mt-1 text-xs text-ink/60">{children.featured.text}</p>
                      </div>
                      <img src={children.featured.image} alt="" className="mt-3 h-24 w-full rounded-xl object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                    </div>
                  </Link>
                )}
                <div className={`${children.featured ? 'col-span-3' : 'col-span-5'} grid gap-1 p-2`}>
                  {children.links.map((link) => (
                    <Link
                      key={link.to + link.label}
                      to={link.to}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink/75 transition hover:bg-forest-50 hover:text-forest-900"
                    >
                      {link.icon && <link.icon className="h-4 w-4 text-forest-600" aria-hidden="true" />}
                      {link.label}
                    </Link>
                  ))}
                  {children.aside && (
                    <Link to={children.aside.to} className="mt-2 rounded-xl bg-ember-50 px-3 py-3 text-sm transition hover:bg-ember-100">
                      <span className="font-semibold text-ember-900">{children.aside.title}</span>
                      <span className="mt-0.5 block text-xs text-ember-800/70">{children.aside.text}</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Header() {
  const { count, openDrawer } = useCart();
  const { settings, store, postalCode } = useStore();
  const { user } = useAuth();
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [postalOpen, setPostalOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState(null);
  const navigate = useNavigate();
  useBodyLock(mobileOpen);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const announcement = settings.announcement;
  const reviews = settings.features || {};
  const warehouseLabel = String(store.warehouse || 'Entrepôt de Soulac-sur-Mer — 33')
    .replace(/^Entrepôt (de )?/i, '')
    .replace(/\s*—\s*/, ' · ');

  return (
    <>
      {announcement?.enabled && (
        <div className="bg-forest-gradient text-white">
          <div className="container-page flex h-9 items-center justify-center gap-2 overflow-hidden text-[11.5px] font-medium sm:text-xs">
            <Flame className="h-3.5 w-3.5 shrink-0 text-ember-400" aria-hidden="true" />
            <Link to={announcement.link || '/boutique'} className="truncate hover:underline">{announcement.text}</Link>
          </div>
        </div>
      )}

      <div className="bg-forest-950 text-white/85">
        <div className="container-page flex h-9 items-center justify-between gap-4 text-[11px] sm:text-xs">
          <button type="button" onClick={() => setPostalOpen(true)} className="flex min-w-0 items-center gap-1.5 hover:text-white">
            <MapPin className="h-3.5 w-3.5 text-ember-400" aria-hidden="true" />
            <span className="truncate">
              Mon entrepôt : <strong className="font-semibold text-white">{postalCode ? `Zone ${postalCode}` : warehouseLabel}</strong>
              {!postalCode && <span className="hidden text-white/55 sm:inline"> · Choisir mon code postal</span>}
            </span>
          </button>
          <div className="hidden items-center gap-2 md:flex">
            <span className="font-semibold italic text-ember-300">Avis Vérifiés</span>
            <span className="flex" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <span key={i} className="text-ember-400">★</span>)}
              <span className="text-ember-400/60">★</span>
            </span>
            <span className="text-white/70">{reviews.reviewsAverage || 4.5}/5 sur {new Intl.NumberFormat('fr-FR').format(reviews.reviewsCount || 6882)} avis</span>
          </div>
          <div className="flex items-center gap-3">
            <a href={`tel:${String(store.phone || '').replace(/\s/g, '')}`} className="hidden items-center gap-1.5 hover:text-white sm:flex">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {store.phone}
            </a>
            <Link to={user ? '/compte' : '/connexion'} className="flex items-center gap-1.5 hover:text-white">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{user ? user.firstName || 'Mon compte' : 'Se connecter'}</span>
            </Link>
            <button type="button" onClick={openDrawer} className="relative flex items-center gap-1.5 hover:text-white" aria-label={`Panier, ${count} article(s)`}>
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Panier</span>
              {count > 0 && (
                <span className="absolute -right-3 -top-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember-500 px-1 text-[9px] font-bold text-white">{count}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-forest-900/10 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80">
        <div className="container-page flex h-[72px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-full p-2 text-forest-900 hover:bg-forest-50 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
              <Menu className="h-6 w-6" />
            </button>
            <Logo />
          </div>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navigation principale">
            {NAV.map((item) => (item.children ? (
              <DesktopDropdown
                key={item.label}
                item={item}
                open={openMenu === item.label}
                onOpen={() => setOpenMenu(item.label)}
                onClose={() => setOpenMenu((cur) => (cur === item.label ? null : cur))}
              />
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => `rounded-full px-3 py-2 text-[13.5px] font-medium transition ${isActive ? 'bg-forest-50 text-forest-900' : 'text-ink/75 hover:bg-forest-50 hover:text-forest-900'}`}
              >
                {item.label}
              </NavLink>
            )))}
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Rechercher" className="rounded-full p-2.5 text-forest-900 transition hover:bg-forest-50">
              <Search className="h-5 w-5" />
            </button>
            <button type="button" onClick={openDrawer} aria-label={`Panier, ${count} article(s)`} className="relative rounded-full p-2.5 text-forest-900 transition hover:bg-forest-50 lg:hidden">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember-500 px-1 text-[9px] font-bold text-white">{count}</span>}
            </button>
            <button type="button" onClick={() => navigate('/boutique')} className="btn-primary btn-sm hidden xl:inline-flex">
              Commander mon bois
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-[70] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-forest-950/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-cream shadow-lift"
            >
              <div className="flex items-center justify-between border-b border-forest-900/10 px-5 py-4">
                <Logo />
                <button type="button" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" className="rounded-full p-2 hover:bg-forest-50">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Menu mobile">
                {NAV.map((item) => (
                  <div key={item.label} className="border-b border-forest-900/8 py-1">
                    <div className="flex items-center justify-between">
                      <Link to={item.to} onClick={() => setMobileOpen(false)} className="flex-1 py-3 font-display text-base font-semibold text-forest-950">
                        {item.label}
                      </Link>
                      {item.children && (
                        <button
                          type="button"
                          onClick={() => setMobileSection(mobileSection === item.label ? null : item.label)}
                          aria-expanded={mobileSection === item.label}
                          aria-label={`Déplier ${item.label}`}
                          className="rounded-full p-2 hover:bg-forest-50"
                        >
                          <Plus className={`h-4 w-4 transition ${mobileSection === item.label ? 'rotate-45' : ''}`} />
                        </button>
                      )}
                    </div>
                    <AnimatePresence initial={false}>
                      {item.children && mobileSection === item.label && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pb-3 pl-2">
                            {item.children.links.map((link) => (
                              <Link key={link.to + link.label} to={link.to} onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-sm text-ink/70 hover:bg-forest-50">
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </nav>
              <div className="space-y-2 border-t border-forest-900/10 p-4">
                <button type="button" onClick={() => { setMobileOpen(false); setPostalOpen(true); }} className="btn-outline w-full">
                  <MapPin className="h-4 w-4" /> {postalCode || 'Choisir mon code postal'}
                </button>
                <Link to={user ? '/compte' : '/connexion'} onClick={() => setMobileOpen(false)} className="btn-secondary w-full">
                  <User className="h-4 w-4" /> {user ? 'Mon compte' : 'Se connecter'}
                </Link>
                <a href={`tel:${String(store.phone || '').replace(/\s/g, '')}`} className="btn-ghost w-full">
                  <Phone className="h-4 w-4" /> {store.phone}
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <PostalModal open={postalOpen} onClose={() => setPostalOpen(false)} />
    </>
  );
}

export { Logo };
