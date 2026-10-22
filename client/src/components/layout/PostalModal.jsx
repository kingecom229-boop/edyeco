import { useState } from 'react';
import { MapPin, Navigation, Warehouse } from 'lucide-react';
import { Modal } from '../ui';
import { useStore } from '../../context/StoreContext';
import { deliveryEstimate } from '../../lib/format';
import { useToast } from '../../context/ToastContext';

const WAREHOUSE = { lat: 45.5126, lng: -1.0617, city: 'Soulac-sur-Mer' };

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function PostalModal({ open, onClose }) {
  const { postalCode, setPostalCode, store } = useStore();
  const [value, setValue] = useState(postalCode);
  const [geo, setGeo] = useState(null);
  const [geoError, setGeoError] = useState('');
  const toast = useToast();
  const estimate = deliveryEstimate(value);

  const save = () => {
    if (!estimate) {
      toast.error('Entrez un code postal à 5 chiffres.');
      return;
    }
    setPostalCode(value);
    toast.success(`Zone de livraison enregistrée : ${value}`);
    onClose();
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const km = distanceKm(position.coords.latitude, position.coords.longitude, WAREHOUSE.lat, WAREHOUSE.lng);
        setGeo({ km, local: km < 150 });
      },
      () => setGeoError('Localisation refusée. Saisissez votre code postal.'),
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Où souhaitez-vous être livré ?"
      size="sm"
      footer={
        <button type="button" onClick={save} className="btn-primary w-full">
          <MapPin className="h-4 w-4" /> Enregistrer ma zone
        </button>
      }
    >
      <p className="text-sm text-ink/70">
        Indiquez votre code postal pour connaître les délais de livraison depuis notre entrepôt de <strong>{store.warehouse || 'Soulac-sur-Mer (33)'}</strong>.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{5}"
          maxLength={5}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="33780"
          aria-label="Code postal"
          className="field flex-1"
        />
        <button type="button" onClick={locate} className="btn-outline shrink-0">
          <Navigation className="h-4 w-4" /> Localisez-moi
        </button>
      </div>
      {geoError && <p className="mt-2 text-xs font-medium text-rose-600">{geoError}</p>}
      {geo && (
        <p className="mt-3 rounded-xl bg-forest-50 px-3 py-2 text-xs text-forest-900">
          Vous êtes à environ <strong>{geo.km} km</strong> de notre entrepôt.{' '}
          {geo.local ? 'Livraison locale éligible (3 à 5 jours).' : 'Livraison France métropolitaine (5 à 8 jours).'}
        </p>
      )}
      {estimate && (
        <div className={`mt-4 rounded-2xl border p-4 ${estimate.available ? 'border-forest-200 bg-forest-50/60' : 'border-amber-200 bg-amber-50'}`}>
          <p className="flex items-center gap-2 text-sm font-semibold text-forest-900">
            <Warehouse className="h-4 w-4" /> {estimate.label}
          </p>
          <p className="mt-1 text-xs text-ink/65">{estimate.detail}</p>
        </div>
      )}
      <p className="mt-4 text-[11px] leading-relaxed text-ink/45">
        Nous n’utilisons votre code postal que pour estimer la livraison. Il reste sur votre appareil et peut être effacé à tout moment.
      </p>
    </Modal>
  );
}
