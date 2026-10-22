import { Link } from 'react-router-dom';
import { Flame, ShieldCheck, Truck, Droplets } from 'lucide-react';
import { Logo } from './Header';

export default function AuthLayout({ title, subtitle, children, aside }) {
  return (
    <div className="grid min-h-[calc(100vh-136px)] lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-forest-950 text-white lg:block">
        <img src="/media/hero-fire-poster.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/80 to-forest-950/30" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo muted />
          <div>
            <p className="eyebrow !text-ember-300">Chaleur naturelle, toute l’année</p>
            <h2 className="mt-4 max-w-md font-display text-4xl font-semibold leading-tight">
              Le bois le plus sec, le service le plus simple.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
              Retrouvez vos commandes, vos adresses et vos préférences. Et profitez de conseils réservés aux membres.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-2"><Droplets className="h-4 w-4 text-ember-300" /> Moins de 20 % d’humidité, contrôlé</li>
              <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-ember-300" /> Suivi de livraison en temps réel</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-ember-300" /> Données protégées, paiement sécurisé</li>
            </ul>
          </div>
          <p className="text-[11px] text-white/35">© {new Date().getFullYear()} EdyEco — Bois de chauffage</p>
        </div>
      </div>

      <div className="flex flex-col justify-center bg-cream px-5 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden"><Logo /></div>
          <p className="eyebrow"><Flame className="h-3.5 w-3.5" /> Espace client</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink/60">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {aside}
          <p className="mt-8 text-center text-[11px] text-ink/40">
            Besoin d’aide ? <Link to="/contact" className="font-semibold text-forest-800 underline underline-offset-2">Contactez-nous</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
