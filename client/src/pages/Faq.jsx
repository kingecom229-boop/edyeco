import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, MessageCircle, Phone } from 'lucide-react';
import Seo from '../components/Seo';
import PageHero from '../components/layout/PageHero';
import { Accordion } from '../components/ui';
import api from '../lib/api';
import { useStore } from '../context/StoreContext';

export default function Faq() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { store } = useStore();

  useEffect(() => {
    api.get('/faqs').then((res) => setFaqs(res.faqs || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(faqs.map((f) => f.category))];

  return (
    <>
      <Seo
        title="FAQ — Toutes vos questions sur le bois de chauffage | EdyEco"
        description="Délais de livraison, séchage du bois, longueur de bûches, granulés, retrait entrepôt : les réponses de l’équipe EdyEco."
      />
      <PageHero
        title="Questions fréquentes"
        description="Livraison, qualité du bois, commandes : tout ce que nos clients nous demandent, réuni au même endroit."
        image="/products/palette-33.png"
        breadcrumbs={[{ label: 'FAQ' }]}
        compact
      />

      <section className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            {loading && <div className="h-64 animate-pulse rounded-3xl bg-white" />}
            {!loading && faqs.length === 0 && <p className="rounded-3xl bg-white p-8 text-sm text-ink/60">Notre FAQ est en cours de mise à jour. Contactez-nous pour toute question.</p>}
            {categories.map((category) => (
              <div key={category}>
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-forest-950">
                  <HelpCircle className="h-5 w-5 text-ember-600" /> {category}
                </h2>
                <div className="mt-3 rounded-3xl border border-forest-900/8 bg-white px-6 py-2">
                  <Accordion items={faqs.filter((f) => f.category === category)} />
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl bg-forest-gradient p-6 text-white">
              <MessageCircle className="h-7 w-7 text-ember-300" />
              <p className="mt-3 font-display text-lg font-semibold">Une question précise ?</p>
              <p className="mt-1 text-sm text-white/65">Notre équipe répond sous 24 h ouvrées, du lundi au vendredi.</p>
              <Link to="/contact" className="btn-primary btn-sm mt-4">Nous écrire</Link>
              <a href={`tel:${String(store.phone || '').replace(/\s/g, '')}`} className="mt-4 flex items-center gap-2 text-sm text-white/80 hover:text-white">
                <Phone className="h-4 w-4" /> {store.phone}
              </a>
              <p className="mt-1 text-[11px] text-white/45">{store.hours}</p>
            </div>
            <div className="rounded-3xl border border-forest-900/8 bg-white p-5 text-sm">
              <p className="font-display text-base font-semibold">Guides utiles</p>
              <ul className="mt-3 space-y-2 text-ink/65">
                <li><Link to="/blog/quel-bois-de-chauffage-choisir-guide-2026" className="hover:text-forest-800">Quel bois de chauffage choisir ?</Link></li>
                <li><Link to="/blog/stere-m3-palette-comprendre-les-unites-de-bois" className="hover:text-forest-800">Comprendre stère et m³</Link></li>
                <li><Link to="/blog/taux-humidite-bois-chauffage" className="hover:text-forest-800">Taux d’humidité du bois</Link></li>
                <li><Link to="/livraison" className="hover:text-forest-800">Livraison : classique ou confort</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
