import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function PageHero({ title, description, image, breadcrumbs = [], children, compact = false }) {
  return (
    <section className="relative isolate overflow-hidden bg-forest-950 text-white">
      {image && (
        <>
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-r from-forest-950 via-forest-950/85 to-forest-950/40" />
        </>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(242,121,27,0.22),transparent_45%)]" aria-hidden="true" />
      <div className={`container-page relative ${compact ? 'py-10 sm:py-12' : 'py-14 sm:py-20'}`}>
        <nav aria-label="Fil d’Ariane" className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/55">
          <Link to="/" className="transition hover:text-white">Accueil</Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              {crumb.href ? <Link to={crumb.href} className="transition hover:text-white">{crumb.label}</Link> : <span className="text-white/90">{crumb.label}</span>}
            </span>
          ))}
        </nav>
        <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl font-semibold sm:text-4xl lg:text-5xl">{title}</h1>
            {description && <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">{description}</p>}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
