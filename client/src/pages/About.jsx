import { Link } from 'react-router-dom';
import { ArrowRight, Award, Flame, Leaf, MapPin, TreePine, Users } from 'lucide-react';
import Seo from '../components/Seo';
import PageHero from '../components/layout/PageHero';
import { SectionHeading } from '../components/ui';

const VALUES = [
  { icon: TreePine, title: 'Des forêts gérées', text: 'Nous travaillons avec des exploitants forestiers qui respectent les plans de gestion et replantent chaque parcelle prélevée.' },
  { icon: Flame, title: 'La qualité avant le volume', text: 'Chaque lot est contrôlé : humidité, propreté, calibrage. Un bois qui brûle mal ne quitte pas notre entrepôt.' },
  { icon: MapPin, title: 'Le circuit court', text: 'Nos essences proviennent de forêts françaises, transformées et conditionnées à moins de 300 km de nos entrepôts.' },
  { icon: Users, title: 'Le service humain', text: 'Une équipe joignable, qui connaît les poêles et les cheminées. Pas de robot, pas de réponse copiée-collée.' },
];

const NUMBERS = [
  ['4,5/5', 'note moyenne sur 6 882 avis'],
  ['< 20 %', 'd’humidité sur tous nos bois bûche'],
  ['100 %', 'de bois français'],
  ['48 h', 'pour préparer un retrait entrepôt'],
];

export default function About() {
  return (
    <>
      <Seo
        title="Qui sommes-nous ? — EdyEco, le bois de chauffage responsable"
        description="EdyEco, spécialiste du bois de chauffage en circuit court : séchage contrôlé, essences locales, livraison soignée et service client disponible."
      />
      <PageHero
        title="Le bois de chauffage, fait avec soin."
        description="EdyEco est né d’une conviction simple : se chauffer au bois doit être une évidence, pas une source d’inquiétude."
        image="/media/hero-fire-poster.jpg"
        breadcrumbs={[{ label: 'Qui sommes-nous' }]}
      />

      <section className="container-page py-14">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Notre histoire</p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Une histoire de feu, de forêt et de patience.</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink/65">
              <p>
                EdyEco est une entreprise familiale spécialisée dans le bois de chauffage. Nous avons grandi
                au rythme des saisons, entre les forêts du Sud-Ouest et notre entrepôt de Soulac-sur-Mer, à force
                de livrer des palettes et d’écouter les mêmes questions : « est-il bien sec ? », « combien de
                stères pour l’hiver ? », « quelle longueur pour mon poêle ? ».
              </p>
              <p>
                Nous avons décidé d’y répondre sérieusement. Séchage contrôlé, essences sélectionnées,
                conditionnements pensés pour être manipulés sans effort, livraison accompagnée : chaque
                détail compte quand il s’agit de chauffer une maison.
              </p>
              <p>
                Aujourd’hui, des milliers de foyers nous font confiance. Nous continuons à faire ce que nous
                savons faire : du bon bois, livré au bon moment, avec des gens qui répondent.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/boutique" className="btn-primary">Découvrir nos bois <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/contact" className="btn-outline">Nous rencontrer</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src="/products/palette-50.png" alt="Palette de bûches de 50 cm" loading="lazy" className="col-span-2 aspect-[16/10] rounded-3xl object-cover shadow-soft" />
            <img src="/products/sac-13.png" alt="Ballot de bûches prêt à brûler" loading="lazy" className="aspect-square rounded-3xl object-cover shadow-soft" />
            <img src="/media/hero-fire-poster.jpg" alt="Feu de bois dans une cheminée" loading="lazy" className="aspect-square rounded-3xl object-cover shadow-soft" />
          </div>
        </div>
      </section>

      <section className="bg-forest-950 py-12 text-white" id="engagements">
        <div className="container-page grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {NUMBERS.map(([value, label]) => (
            <div key={label} className="border-l border-white/15 pl-5">
              <p className="font-display text-3xl font-semibold text-ember-300">{value}</p>
              <p className="mt-1 text-xs text-white/60">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container-page">
          <SectionHeading align="center" eyebrow="Nos engagements" title="Quatre promesses que nous tenons." description="Elles guident chaque palette que nous préparons." />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <div key={value.title} className="rounded-3xl border border-forest-900/8 bg-white p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-50 text-forest-700"><value.icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-display text-lg font-semibold">{value.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink/55">{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-white" id="partenaires">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Nos partenaires</p>
            <h2 className="mt-3 font-display text-3xl font-semibold">Des partenaires choisis, pas subis.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/65">
              Exploitants forestiers, scieries, transporteurs : nous travaillons avec une poignée de partenaires
              de confiance, sélectionnés pour la qualité de leur travail et leur proximité. Chaque lot est tracé
              depuis la parcelle jusqu’à votre palette.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ['Forêts du Sud-Ouest', 'Chêne, hêtre et charme issus de parcelles gérées durablement.'],
                ['Scieries partenaires', 'Séchage lent et calibrage rigoureux, à moins de 300 km.'],
                ['Transporteurs locaux', 'Des chauffeurs formés aux accès difficiles et au placement de palette.'],
                ['Entrepôt de Soulac-sur-Mer', 'Stockage ventilé, préparation des commandes et retrait sur place.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl bg-forest-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-forest-950"><Award className="h-4 w-4 text-ember-600" /> {title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink/55">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-forest-gradient p-8 text-white">
            <Leaf className="h-8 w-8 text-ember-300" />
            <h2 className="mt-4 font-display text-2xl font-semibold">Notre engagement environnemental</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex gap-2"><span className="text-ember-300">•</span> Bois issu de forêts gérées durablement, avec replantation.</li>
              <li className="flex gap-2"><span className="text-ember-300">•</span> Valorisation des résidus de scierie pour nos bûches compressées.</li>
              <li className="flex gap-2"><span className="text-ember-300">•</span> Emballages recyclables et palettes consignées lorsque possible.</li>
              <li className="flex gap-2"><span className="text-ember-300">•</span> Optimisation des tournées de livraison pour réduire les kilomètres à vide.</li>
              <li className="flex gap-2"><span className="text-ember-300">•</span> Un bois sec, c’est moins de fumée et un meilleur rendement : la meilleure économie d’énergie commence par la qualité.</li>
            </ul>
            <Link to="/blog/quel-bois-de-chauffage-choisir-guide-2026" className="btn-primary mt-6">Lire notre guide du bois <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
