import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Check, MapPin, Package, ShieldCheck, Truck, Warehouse } from 'lucide-react';
import Seo from '../components/Seo';
import PageHero from '../components/layout/PageHero';
import { Accordion, SectionHeading } from '../components/ui';
import { useStore } from '../context/StoreContext';
import { formatCents } from '../lib/format';

const STEPS = [
  { title: 'Commande confirmée', text: 'Vous recevez immédiatement un email récapitulatif avec votre référence.' },
  { title: 'Validation de l’accès', text: 'Sous 10 jours, le transporteur vérifie votre accès (largeur, hauteur, revêtement) et fixe la date.' },
  { title: 'Créneau confirmé', text: 'Deux jours avant, vous êtes contacté pour confirmer la date et une tranche horaire indicative.' },
  { title: 'Livraison', text: 'Le jour J, le chauffeur vous prévient de son arrivée et dépose votre palette au plus près.' },
];

const DELIVERY_FAQ = [
  {
    question: 'Quelle est la différence entre livraison classique et confort ?',
    answer:
      'La livraison classique utilise un camion porteur de 19 tonnes et dépose la palette au pied du camion. La livraison confort mobilise un camion de 44 tonnes équipé d’un chariot élévateur embarqué : la palette est posée dans votre propriété, dans la limite d’accès sécurisés.',
  },
  {
    question: 'Quels sont les délais ?',
    answer:
      'Livraison classique : 5 à 8 jours ouvrés après confirmation. Livraison confort : environ deux semaines, le temps de valider l’accès et de planifier la tournée. Retrait entrepôt : sous 48 h sur rendez-vous.',
  },
  {
    question: 'Comment préparer mon accès ?',
    answer:
      'Vérifiez la largeur de votre portail (3 m minimum pour le confort), la hauteur libre (branches, câbles) et la nature du sol. Signalez toute pente ou chemin étroit : nous adapterons le camion.',
  },
  {
    question: 'Puis-je modifier la date de livraison ?',
    answer:
      'Oui, jusqu’à 48 h avant la date prévue, en nous contactant par téléphone ou email. Nous transmettons la demande au transporteur et vous confirmons le nouveau créneau.',
  },
];

export default function Delivery() {
  const { deliveryOptions, store } = useStore();

  return (
    <>
      <Seo
        title="Livraison de bois de chauffage : classique ou confort | EdyEco"
        description="Livraison classique par camion porteur ou livraison confort avec chariot élévateur. Délais, conditions d’accès et retrait entrepôt à Nantes-est."
      />
      <PageHero
        title="Livraison de bois de chauffage à domicile"
        description="Facilitez-vous la vie : nos palettes sont conditionnées pour être manipulées par une seule personne, et livrées au plus près de votre stockage."
        image="/products/palette-50.png"
        breadcrumbs={[{ label: 'Livraison' }]}
        compact
      />

      <section className="container-page py-12">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-forest-900/8 bg-white p-6 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-50 text-forest-700"><Truck className="h-5 w-5" /></span>
            <h2 className="mt-4 font-display text-xl font-semibold">Livraison classique</h2>
            <p className="mt-1 text-sm text-ink/60">Camion porteur de 19 tonnes · dépôt au pied du camion.</p>
            <p className="mt-4 font-display text-2xl font-bold text-forest-900">{formatCents(deliveryOptions.classique?.fee_cents ?? 4900)}</p>
            <p className="text-xs text-ink/45">{deliveryOptions.classique?.eta || '5 à 8 jours ouvrés'}</p>
            <ul className="mt-4 space-y-2 text-sm text-ink/65">
              {['Le plus économique', 'Accès dégagé requis', 'Palette cerclée prête à stocker'].map((p) => (
                <li key={p} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-forest-600" /> {p}</li>
              ))}
            </ul>
            <Link to="/boutique" className="btn-outline mt-5 w-full">Commander</Link>
          </div>

          <div className="relative rounded-3xl border border-ember-300 bg-ember-50/40 p-6 shadow-sm">
            <span className="absolute right-5 top-5 rounded-full bg-ember-500 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Recommandé</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ember-600"><Warehouse className="h-5 w-5" /></span>
            <h2 className="mt-4 font-display text-xl font-semibold">Livraison confort</h2>
            <p className="mt-1 text-sm text-ink/60">Camion 44 t · chariot élévateur embarqué, palette posée dans la propriété.</p>
            <p className="mt-4 font-display text-2xl font-bold text-forest-900">{formatCents(deliveryOptions.confort?.fee_cents ?? 8900)}</p>
            <p className="text-xs text-ink/45">{deliveryOptions.confort?.eta || 'environ 2 semaines'}</p>
            <ul className="mt-4 space-y-2 text-sm text-ink/65">
              {['Zéro manutention pour vous', 'Accès validé par le transporteur', 'Créneau confirmé 48 h avant'].map((p) => (
                <li key={p} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-ember-600" /> {p}</li>
              ))}
            </ul>
            <Link to="/boutique" className="btn-primary mt-5 w-full">Commander</Link>
          </div>
        </div>

        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-forest-50 px-4 py-3 text-xs text-forest-900">
          <ShieldCheck className="h-4 w-4 shrink-0" /> Livraison offerte dès {formatCents(deliveryOptions.freeAboveCents || 150000)} d’achat, sur l’ensemble de la France métropolitaine.
        </p>

        <div className="mt-16">
          <SectionHeading eyebrow="Comment ça marche" title="Votre livraison, étape par étape" description="Un process simple et suivi, du clic jusqu’au coin de votre feu." />
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative rounded-2xl border border-forest-900/8 bg-white p-5">
                <span className="absolute -top-3 left-5 flex h-7 w-7 items-center justify-center rounded-full bg-forest-900 text-xs font-bold text-white">{i + 1}</span>
                <p className="mt-3 font-display text-sm font-semibold">{step.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink/55">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold">Conditions et délais de la livraison confort</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink/65">
              <p>Sous 10 jours, le transporteur valide l’accès et fixe la date de livraison de votre bois. Deux jours avant, vous êtes contacté pour confirmer la date et recevoir une tranche horaire indicative. Le jour de la livraison, le chauffeur vous prévient de son arrivée.</p>
              <p>La livraison en chariot embarqué est garantie en limite de propriété, avec la possibilité d’une livraison à l’intérieur de votre propriété sous réserve d’une décharge de responsabilité et d’un accès adapté.</p>
              <p>En cas d’accès impossible, le transporteur vous contactera pour convenir d’une solution (dépôt au plus près, report).</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-ink/55">
              <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-ember-600" /> Créneau confirmé 48 h avant</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-ember-600" /> France métropolitaine</span>
            </div>
          </div>

          <div id="retrait" className="rounded-3xl bg-forest-950 p-6 text-white sm:p-8">
            <Package className="h-8 w-8 text-ember-300" />
            <h2 className="mt-4 font-display text-2xl font-semibold">Retrait entrepôt gratuit</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Retirez votre commande à {store.warehouse || 'Nantes-est'}, sur rendez-vous. Nos équipes chargent votre palette avec un chariot élévateur, en moins de 20 minutes.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>• Gratuit, sans frais de livraison</li>
              <li>• Sur rendez-vous, sous 48 h</li>
              <li>• Chargement assisté</li>
            </ul>
            <p className="mt-5 text-xs text-white/45">Sélectionnez « Retrait entrepôt » lors de la commande, nous vous appelons pour fixer le créneau.</p>
            <a href={`tel:${String(store.phone || '').replace(/\s/g, '')}`} className="btn-primary btn-sm mt-5">Appeler l’entrepôt</a>
          </div>
        </div>

        <div className="mt-16">
          <SectionHeading eyebrow="FAQ livraison" title="Les questions que l’on nous pose le plus" />
          <div className="mt-4 rounded-3xl border border-forest-900/8 bg-white px-6 py-2">
            <Accordion items={DELIVERY_FAQ} defaultOpen={0} />
          </div>
          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl bg-white p-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-lg font-semibold">Une adresse particulière à nous signaler ?</p>
              <p className="mt-1 text-sm text-ink/55">Portail étroit, chemin, cour intérieure : écrivez-nous avant de commander.</p>
            </div>
            <Link to="/contact" className="btn-secondary shrink-0">Contacter l’équipe <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
