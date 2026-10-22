import { Droplets, Leaf, ShieldCheck, Truck, Flame, BadgeCheck } from 'lucide-react';

const ITEMS = [
  { icon: Droplets, title: 'Bois extra sec', text: 'Moins de 20 % d’humidité, contrôlé lot par lot' },
  { icon: Truck, title: 'Livraison soignée', text: 'Classique ou confort, au pied de votre stockage' },
  { icon: Leaf, title: 'Circuit court', text: 'Bois français, producteurs partenaires locaux' },
  { icon: ShieldCheck, title: 'Paiement sécurisé', text: 'Données chiffrées, 3× sans frais dès 300 €' },
];

export default function TrustBar() {
  return (
    <section className="border-b border-forest-900/8 bg-white" aria-label="Nos garanties">
      <div className="container-page grid grid-cols-2 gap-x-4 gap-y-6 py-7 lg:grid-cols-4">
        {ITEMS.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-forest-950">{item.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-ink/55">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-forest-900/8 bg-cream/60">
        <div className="container-page flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-forest-900/45">
          <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5" /> Production 100 % française</span>
          <span className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5" /> Pouvoir calorifique contrôlé</span>
          <span className="flex items-center gap-1.5"><Leaf className="h-3.5 w-3.5" /> Bois issu de forêts gérées</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> SAV réactif sous 24 h</span>
        </div>
      </div>
    </section>
  );
}
