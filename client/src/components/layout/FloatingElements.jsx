import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, MessageCircle, Phone, Mail, HelpCircle, X, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { formatNumber } from '../../lib/format';
import { useScrollPosition } from '../../lib/hooks';

export default function FloatingElements() {
  const { settings, store } = useStore();
  const shown = useScrollPosition(600);
  const [chatOpen, setChatOpen] = useState(false);
  const features = settings.features || {};

  return (
    <>
      <div className="pointer-events-none fixed bottom-5 left-4 z-40 hidden sm:block">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="pointer-events-auto flex items-center gap-3 rounded-full bg-forest-950/95 px-4 py-3 text-white shadow-lift backdrop-blur"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-bold text-forest-900">
            {(features.reviewsAverage || 4.5).toString().replace('.', ',')}/5
          </div>
          <div className="leading-tight">
            <div className="flex text-ember-400" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-3 w-3 fill-current" />)}
            </div>
            <p className="mt-1 text-[10px] font-medium text-white/70">
              {formatNumber(features.reviewsCount || 6882)} avis clients · <span className="italic text-ember-300">Avis Vérifiés</span>
            </p>
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3">
        <AnimatePresence>
          {shown && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Revenir en haut de la page"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-forest-900/10 bg-white text-forest-900 shadow-soft transition hover:-translate-y-0.5"
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="w-[300px] overflow-hidden rounded-3xl border border-forest-900/10 bg-white shadow-lift"
              role="dialog"
              aria-label="Aide EdyEco"
            >
              <div className="bg-forest-gradient px-5 py-4 text-white">
                <p className="font-display text-base font-semibold">Besoin d’un coup de main ?</p>
                <p className="mt-1 text-xs text-white/65">Une vraie personne vous répond, du lundi au vendredi.</p>
              </div>
              <div className="divide-y divide-forest-900/8">
                <a href={`tel:${String(store.phone || '').replace(/\s/g, '')}`} className="flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-forest-50">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-50 text-forest-700"><Phone className="h-4 w-4" /></span>
                  <span><span className="block font-medium">Appeler l’équipe</span><span className="text-xs text-ink/50">{store.phone}</span></span>
                </a>
                <Link to="/contact" className="flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-forest-50">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ember-50 text-ember-700"><Mail className="h-4 w-4" /></span>
                  <span><span className="block font-medium">Écrire un message</span><span className="text-xs text-ink/50">Réponse sous 24 h ouvrées</span></span>
                </Link>
                <Link to="/faq" className="flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-forest-50">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-50 text-forest-700"><HelpCircle className="h-4 w-4" /></span>
                  <span><span className="block font-medium">Consulter la FAQ</span><span className="text-xs text-ink/50">Livraison, séchage, longueurs</span></span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          aria-label={chatOpen ? 'Fermer l’aide' : 'Ouvrir l’aide'}
          aria-expanded={chatOpen}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-900 text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-forest-800"
        >
          {chatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
