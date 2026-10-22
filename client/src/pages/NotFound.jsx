import { Link } from 'react-router-dom';
import { Flame, ArrowLeft } from 'lucide-react';
import Seo from '../components/Seo';

export default function NotFound() {
  return (
    <>
      <Seo title="Page introuvable | EdyEco" robots="noindex, nofollow" />
      <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <div className="relative">
          <div className="absolute -inset-10 rounded-full bg-ember-200/40 blur-3xl" aria-hidden="true" />
          <Flame className="relative h-16 w-16 text-ember-500" />
        </div>
        <p className="mt-6 font-display text-6xl font-bold text-forest-900">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">Cette page a pris froid.</h1>
        <p className="mt-2 max-w-md text-sm text-ink/60">La page que vous cherchez n’existe pas ou a été déplacée. Retrouvez la chaleur de notre boutique.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary"><ArrowLeft className="h-4 w-4" /> Retour à l’accueil</Link>
          <Link to="/boutique" className="btn-outline">Voir la boutique</Link>
        </div>
      </div>
    </>
  );
}
