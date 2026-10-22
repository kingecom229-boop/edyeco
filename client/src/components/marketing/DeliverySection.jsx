import { Link } from 'react-router-dom';
import { ArrowRight, Check, Truck, Warehouse, CalendarClock, MapPin } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCents } from '../../lib/format';
import ThreeLogs from './ThreeLogs';

export default function DeliverySection() {
  const { deliveryOptions } = useStore();
  const options = [
    {
      id: 'classique',
      title: 'Livraison classique',
      price: deliveryOptions.classique?.fee_cents ?? 4900,
      icon: Truck,
      eta: deliveryOptions.classique?.eta || '5 à 8 jours ouvrés',
      points: ['Camion porteur de 19 tonnes', 'Dépôt au pied du camion', 'Le plus économique'],
    },
    {
      id: 'confort',
      title: 'Livraison confort',
      price: deliveryOptions.confort?.fee_cents ?? 8900,
      icon: Warehouse,
      eta: deliveryOptions.confort?.eta || 'environ 2 semaines',
      points: ['Camion 44 tonnes + chariot élévateur', 'Palette posée dans votre propriété', 'Créneau confirmé par le transporteur'],
      highlight: true,
    },
  ];

  return (
    <section className="section bg-forest-950 text-white" id="livraison">
      <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="eyebrow !text-ember-300">Livraison de bois de chauffage à domicile</p>
          <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
            Du camion au coin de votre feu, sans effort.
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/65">
            Nos palettes sont cerclées, stables et prêtes à être stockées. Une seule personne peut les déplacer :
            une palette équivaut à 5 stères de bois traditionnel, pour une demi-journée de manutention en moins.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {options.map((option) => (
              <div
                key={option.id}
                className={`relative rounded-2xl border p-5 transition ${option.highlight ? 'border-ember-400/60 bg-white/[0.07]' : 'border-white/10 bg-white/[0.04]'}`}
              >
                {option.highlight && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-ember-500 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Recommandé</span>
                )}
                <option.icon className={`h-6 w-6 ${option.highlight ? 'text-ember-300' : 'text-forest-300'}`} />
                <h3 className="mt-3 font-display text-base font-semibold">{option.title}</h3>
                <p className="mt-0.5 text-xs text-white/55">{option.eta}</p>
                <p className="mt-3 text-lg font-semibold">{option.price === 0 ? 'Offert' : formatCents(option.price)}</p>
                <ul className="mt-3 space-y-1.5">
                  {option.points.map((point) => (
                    <li key={point} className="flex items-start gap-1.5 text-[11px] text-white/60">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-forest-400" /> {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/55">
            <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-ember-300" /> Livraison offerte dès 1 500 €</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-ember-300" /> France métropolitaine</span>
            <Link to="/livraison" className="link-underline !text-white">Tout savoir sur la livraison</Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[3rem] bg-ember-500/10 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <ThreeLogs />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ['< 20 %', 'humidité'],
                ['> 4,2', 'kWh/kg'],
                ['100 %', 'français'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <p className="font-display text-lg font-semibold text-ember-300">{value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-page mt-14">
        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-lg font-semibold">Pas sûr de la quantité pour passer l’hiver ?</p>
            <p className="mt-1 text-sm text-white/55">Nos experts calculent votre besoin en 2 minutes, sans engagement.</p>
          </div>
          <Link to="/contact" className="btn-primary shrink-0">
            Calculer mes besoins <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
