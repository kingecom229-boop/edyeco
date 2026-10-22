import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Pause, Play, ShieldCheck, Truck, Droplets, Star } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { deliveryEstimate } from '../../lib/format';
import PostalModal from '../layout/PostalModal';
import { track } from '../../lib/analytics';

const STATS = [
  { icon: Droplets, label: 'Moins de 20 % d’humidité' },
  { icon: ShieldCheck, label: 'Bois contrôlé lot par lot' },
  { icon: Truck, label: 'Livraison offerte dès 1 500 €' },
];

export default function Hero() {
  const videoRef = useRef(null);
  const { postalCode, settings } = useStore();
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [postalOpen, setPostalOpen] = useState(false);
  const estimate = deliveryEstimate(postalCode);
  const features = settings.features || {};

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (e) => setReduced(e.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reduced) {
      video.pause();
      setPlaying(false);
    } else {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [reduced]);

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
      track('video_play');
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <section className="relative isolate overflow-hidden bg-forest-950">
      <div className="absolute inset-0 -z-10">
        <video
          ref={videoRef}
          className="h-full w-full object-cover object-center opacity-90"
          poster="/media/hero-fire-poster.jpg"
          autoPlay={!reduced}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src="/media/hero-fire.webm" type="video/webm" />
          <source src="/media/hero-fire.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-forest-950 via-forest-950/80 to-forest-950/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-transparent to-forest-950/40" />
      </div>

      <div className="container-page relative flex min-h-[600px] flex-col justify-center py-16 sm:min-h-[660px] lg:min-h-[700px] lg:py-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember-400" />
              Vente directe producteur · Bois français
            </span>
            <span className="hidden items-center gap-1.5 text-xs text-white/70 sm:flex">
              <Star className="h-3.5 w-3.5 fill-ember-400 text-ember-400" />
              {features.reviewsAverage || 4.5}/5 — {new Intl.NumberFormat('fr-FR').format(features.reviewsCount || 6882)} avis vérifiés
            </span>
          </div>

          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            La chaleur du bois.
            <span className="block bg-gradient-to-r from-ember-300 via-ember-400 to-ember-500 bg-clip-text text-transparent">
              La promesse du sec.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/75 sm:text-base">
            Bûches de chêne et de hêtre, granulés ENplus A1 et bûches compressées.
            Un bois séché et contrôlé, livré chez vous avec le soin qu’on doit à votre feu.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/boutique" className="btn-primary group px-7 py-3.5 text-[15px]">
              Découvrir la boutique
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <button type="button" onClick={() => setPostalOpen(true)} className="btn inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition hover:bg-white/15">
              <MapPin className="h-4 w-4 text-ember-300" />
              Calculer ma livraison
            </button>
          </div>

          {postalCode && estimate && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
              <MapPin className="h-3.5 w-3.5 text-ember-300" />
              {estimate.label} · {postalCode}
            </p>
          )}

          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2">
            {STATS.map((stat) => (
              <li key={stat.label} className="flex items-center gap-2 text-xs text-white/65">
                <stat.icon className="h-4 w-4 text-ember-400" aria-hidden="true" />
                {stat.label}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      <div className="container-page relative -mt-4 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-forest-950/50 px-4 py-3 backdrop-blur-md sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/90">Pour afficher nos tarifs, choisissez votre département</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPostalOpen(true)} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-left text-xs text-white/70 transition hover:bg-white/10">
              <span className="block font-semibold text-white">{postalCode || '75001'}</span>
              <span className="text-[10px]">{postalCode ? estimate?.label : 'Saisir mon code postal'}</span>
            </button>
            <Link to="/boutique" className="rounded-xl bg-ember-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-ember-600">Voir l’entrepôt</Link>
            <Link to="/boutique" className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20">Aller à la boutique</Link>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleVideo}
        aria-label={playing ? 'Mettre la vidéo en pause' : 'Lire la vidéo'}
        className="absolute bottom-24 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-forest-950/50 text-white/80 backdrop-blur transition hover:bg-forest-950/80 sm:bottom-28"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>

      <PostalModal open={postalOpen} onClose={() => setPostalOpen(false)} />
    </section>
  );
}
