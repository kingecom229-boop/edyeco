const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const eurNoDecimals = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const formatPrice = (value) => eur.format(Number(value) || 0);
export const formatPriceRound = (value) => eurNoDecimals.format(Number(value) || 0);
export const formatCents = (cents) => eur.format((Number(cents) || 0) / 100);

export const formatDate = (value, options = {}) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', ...options }).format(new Date(value))
    : '—';

export const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    : '—';

export const formatNumber = (value) => new Intl.NumberFormat('fr-FR').format(Number(value) || 0);

export const DELIVERY_OPTIONS = {
  classique: {
    id: 'classique',
    label: 'Livraison classique',
    description: 'Camion porteur 19 t · dépôt au pied du camion',
    eta: '5 à 8 jours ouvrés',
  },
  confort: {
    id: 'confort',
    label: 'Livraison confort',
    description: 'Camion 44 t · chariot élévateur embarqué, pose dans la propriété',
    eta: 'environ 2 semaines',
  },
  retrait: {
    id: 'retrait',
    label: 'Retrait entrepôt',
    description: 'Soulac-sur-Mer · sur rendez-vous, chargement par nos équipes',
    eta: 'sous 48 h',
  },
};

const LOCAL_PREFIXES = new Set(['33', '17', '16', '24', '47', '40', '64', '32']);

/** Simple, honest delivery estimator based on the warehouse region. */
export function deliveryEstimate(postalCode) {
  const code = String(postalCode || '').trim();
  if (!/^\d{5}$/.test(code)) return null;
  if (/^9[78]/.test(code)) {
    return { available: false, label: 'Hors zone de livraison standard', detail: 'Contactez-nous pour une étude sur mesure (DOM-TOM).', zone: 'DROM' };
  }
  const prefix = code.slice(0, 2);
  if (LOCAL_PREFIXES.has(prefix)) {
    return { available: true, label: 'Livraison locale', detail: '3 à 5 jours ouvrés · chariot élévateur disponible', zone: 'local' };
  }
  return { available: true, label: 'Livraison France métropolitaine', detail: '5 à 8 jours ouvrés · livraison confort sous 2 semaines', zone: 'france' };
}

export const ORDER_STATUS = {
  pending: { label: 'En attente de paiement', tone: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Payée', tone: 'bg-emerald-100 text-emerald-800' },
  in_production: { label: 'En préparation', tone: 'bg-sky-100 text-sky-800' },
  shipped: { label: 'Expédiée', tone: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Livrée', tone: 'bg-forest-100 text-forest-800' },
  cancelled: { label: 'Annulée', tone: 'bg-rose-100 text-rose-700' },
  refunded: { label: 'Remboursée', tone: 'bg-stone-200 text-stone-700' },
};

export const statusMeta = (status) => ORDER_STATUS[status] || { label: status, tone: 'bg-stone-100 text-stone-700' };
