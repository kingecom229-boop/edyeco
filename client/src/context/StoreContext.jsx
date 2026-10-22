import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

const StoreContext = createContext(null);

const FALLBACK = {
  store: {
    name: 'EdyEco',
    legalName: 'EdyEco SAS',
    email: 'contact@edyeco.fr',
    phone: '05 56 09 90 99',
    address: '68 route de Bordeaux, 33780 Soulac-sur-Mer',
    warehouse: 'Entrepôt de Soulac-sur-Mer — 33',
    hours: 'Du lundi au vendredi, 8h30 – 18h00',
    siret: 'SIRET 000 000 000 00000',
    vat: 'TVA FR00000000000',
  },
  delivery: {
    classique: { fee_cents: 4900, label: 'Livraison classique', eta: '5 à 8 jours ouvrés' },
    confort: { fee_cents: 8900, label: 'Livraison confort', eta: 'environ 2 semaines' },
    retrait: { fee_cents: 0, label: 'Retrait entrepôt', eta: 'sur rendez-vous' },
    freeAboveCents: 150000,
  },
  announcement: { enabled: false, text: '', link: '/boutique' },
  seo: {},
  social: {},
  features: { reviewsAverage: 4.5, reviewsCount: 6882 },
};

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK);
  const [ready, setReady] = useState(false);
  const [postalCode, setPostalCodeState] = useState(() => {
    try {
      return localStorage.getItem('edyeco_postal') || '';
    } catch {
      return '';
    }
  });

  const setPostalCode = (value) => {
    setPostalCodeState(value);
    try {
      localStorage.setItem('edyeco_postal', value);
    } catch {
      /* storage unavailable */
    }
  };

  useEffect(() => {
    let cancelled = false;
    api
      .get('/settings')
      .then((data) => {
        if (!cancelled && data.settings) {
          setSettings({ ...FALLBACK, ...data.settings, delivery: { ...FALLBACK.delivery, ...data.settings.delivery } });
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      settings,
      ready,
      deliveryOptions: settings.delivery || FALLBACK.delivery,
      store: settings.store || FALLBACK.store,
      postalCode,
      setPostalCode,
    }),
    [settings, ready, postalCode]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
