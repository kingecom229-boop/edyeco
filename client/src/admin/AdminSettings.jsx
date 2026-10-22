import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Save, Search, Share2, Store, Sparkles, Truck } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, ErrorBox, Loading, euroToCents, useAdminApi } from './ui';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

const TABS = [
  { id: 'store', label: 'Boutique', icon: Store },
  { id: 'delivery', label: 'Livraison', icon: Truck },
  { id: 'announcement', label: 'Bandeau d’annonce', icon: Megaphone },
  { id: 'seo', label: 'SEO & partage', icon: Search },
  { id: 'social', label: 'Réseaux sociaux', icon: Share2 },
  { id: 'features', label: 'Options', icon: Sparkles },
];

const euro = (cents) => (Number(cents || 0) / 100).toFixed(2).replace('.', ',');

export default function AdminSettings() {
  const toast = useToast();
  const { data, loading, error, reload } = useAdminApi('/admin/settings');
  const [tab, setTab] = useState('store');
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.settings) setDraft(JSON.parse(JSON.stringify(data.settings)));
  }, [data]);

  const current = useMemo(() => draft?.[tab], [draft, tab]);

  const patch = (path, value) => {
    setDraft((d) => {
      const next = { ...d, [tab]: { ...d[tab] } };
      const keys = path.split('.');
      let target = next[tab];
      for (let i = 0; i < keys.length - 1; i += 1) {
        target[keys[i]] = { ...target[keys[i]] };
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', { key: tab, value: current });
      toast.success('Réglages enregistrés.');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage title="Réglages du site" description="Ces valeurs alimentent directement les pages publiques, les e-mails et les données structurées. Les secrets (SMTP, paiement) restent côté serveur." actions={
      <button type="button" className="btn-primary btn-sm" onClick={save} disabled={saving || !current}><Save className="h-4 w-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
    }>
      <Seo title="Réglages — Administration | EdyEco" robots="noindex, nofollow" />
      <ErrorBox message={error} onRetry={reload} />
      {loading && !draft ? <Loading /> : draft && (
        <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
          <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-forest-900/8 bg-white p-1.5 lg:flex-col lg:overflow-visible">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${tab === id ? 'bg-forest-900 text-white' : 'text-ink/60 hover:bg-forest-50'}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>

          <div className="rounded-2xl border border-forest-900/8 bg-white p-5">
            {tab === 'store' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="label">Nom commercial</label><input value={current.name || ''} onChange={(e) => patch('name', e.target.value)} className="admin-input" /></div>
                <div><label className="label">Raison sociale</label><input value={current.legalName || ''} onChange={(e) => patch('legalName', e.target.value)} className="admin-input" /></div>
                <div><label className="label">E-mail de contact</label><input type="email" value={current.email || ''} onChange={(e) => patch('email', e.target.value)} className="admin-input" /></div>
                <div><label className="label">Téléphone</label><input value={current.phone || ''} onChange={(e) => patch('phone', e.target.value)} className="admin-input" /></div>
                <div className="sm:col-span-2"><label className="label">Adresse</label><input value={current.address || ''} onChange={(e) => patch('address', e.target.value)} className="admin-input" /></div>
                <div><label className="label">Entrepôt</label><input value={current.warehouse || ''} onChange={(e) => patch('warehouse', e.target.value)} className="admin-input" /></div>
                <div><label className="label">Horaires</label><input value={current.hours || ''} onChange={(e) => patch('hours', e.target.value)} className="admin-input" /></div>
                <div><label className="label">SIRET</label><input value={current.siret || ''} onChange={(e) => patch('siret', e.target.value)} className="admin-input" /></div>
                <div><label className="label">TVA intracom.</label><input value={current.vat || ''} onChange={(e) => patch('vat', e.target.value)} className="admin-input" /></div>
              </div>
            )}

            {tab === 'delivery' && (
              <div className="space-y-5">
                {[['classique', 'Livraison classique', '5 à 8 jours ouvrés'], ['confort', 'Livraison confort', 'environ 2 semaines'], ['retrait', 'Retrait entrepôt', 'sur rendez-vous']].map(([key, label, eta]) => (
                  <div key={key} className="grid gap-3 rounded-xl border border-forest-900/8 p-3 sm:grid-cols-[1fr_120px_1fr]">
                    <div><p className="text-sm font-semibold">{label}</p><p className="text-[11px] text-ink/40">Clé technique : {key}</p></div>
                    <div><label className="label">Frais (€)</label><input inputMode="decimal" value={euro(current[key]?.fee_cents)} onChange={(e) => patch(`${key}.fee_cents`, euroToCents(e.target.value))} className="admin-input" /></div>
                    <div><label className="label">Délai affiché</label><input value={current[key]?.eta || ''} onChange={(e) => patch(`${key}.eta`, e.target.value)} className="admin-input" /></div>
                  </div>
                ))}
                <div className="max-w-xs"><label className="label">Livraison offerte à partir de (€)</label><input inputMode="decimal" value={euro(current.freeAboveCents)} onChange={(e) => patch('freeAboveCents', euroToCents(e.target.value))} className="admin-input" /></div>
                <p className="rounded-xl bg-cream/70 p-3 text-[11px] text-ink/55">Les frais sont recalculés et vérifiés côté serveur au moment de la commande.</p>
              </div>
            )}

            {tab === 'announcement' && (
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(current.enabled)} onChange={(e) => patch('enabled', e.target.checked)} className="h-4 w-4 rounded" /> Afficher le bandeau en haut du site</label>
                <div><label className="label">Texte</label><textarea rows={3} maxLength={200} value={current.text || ''} onChange={(e) => patch('text', e.target.value)} className="admin-input" /></div>
                <div><label className="label">Lien (chemin interne)</label><input value={current.link || ''} onChange={(e) => patch('link', e.target.value)} className="admin-input" placeholder="/boutique" /></div>
              </div>
            )}

            {tab === 'seo' && (
              <div className="space-y-4">
                <div><label className="label">Titre par défaut</label><input maxLength={70} value={current.title || ''} onChange={(e) => patch('title', e.target.value)} className="admin-input" /></div>
                <div><label className="label">Description par défaut</label><textarea rows={3} maxLength={180} value={current.description || ''} onChange={(e) => patch('description', e.target.value)} className="admin-input" /></div>
                <div><label className="label">Mots-clés</label><input value={current.keywords || ''} onChange={(e) => patch('keywords', e.target.value)} className="admin-input" /></div>
                <div><label className="label">Image de partage (OG)</label><input value={current.ogImage || ''} onChange={(e) => patch('ogImage', e.target.value)} className="admin-input" /></div>
              </div>
            )}

            {tab === 'social' && (
              <div className="space-y-4">
                {[['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube']].map(([key, label]) => (
                  <div key={key}><label className="label">{label}</label><input type="url" value={current[key] || ''} onChange={(e) => patch(key, e.target.value)} className="admin-input" placeholder={`https://www.${key}.com/…`} /></div>
                ))}
              </div>
            )}

            {tab === 'features' && (
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(current.showFloatingStars)} onChange={(e) => patch('showFloatingStars', e.target.checked)} className="h-4 w-4 rounded" /> Afficher les étincelles animées</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label">Note moyenne affichée</label><input type="number" min="0" max="5" step="0.1" value={current.reviewsAverage ?? 0} onChange={(e) => patch('reviewsAverage', Number(e.target.value))} className="admin-input" /></div>
                  <div><label className="label">Nombre d’avis (social proof)</label><input type="number" min="0" value={current.reviewsCount ?? 0} onChange={(e) => patch('reviewsCount', Number(e.target.value))} className="admin-input" /></div>
                </div>
                <p className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800">N’affichez ici que des chiffres que vous pouvez justifier : la transparence protège votre marque et votre SEO.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminPage>
  );
}
