import { useState } from 'react';
import { Copy, Mail, Trash2, CheckCircle2 } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, EmptyRow, ErrorBox, Loading, StatCard, useAdminApi, useConfirm } from './ui';
import { formatCents, formatDateTime } from '../lib/format';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

export default function AdminCarts() {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const { data, loading, error, reload } = useAdminApi('/admin/carts/abandoned?limit=50');
  const [busy, setBusy] = useState(null);

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Lien de récupération copié.');
    } catch {
      toast.error('Copie impossible sur ce navigateur.');
    }
  };

  const recover = async (cart) => {
    setBusy(cart.id);
    try {
      const res = await api.post(`/admin/carts/${cart.id}/recover`);
      toast.success(res.message);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const markConverted = async (cart) => {
    try {
      await api.patch(`/admin/carts/${cart.id}`, { status: 'converted' });
      toast.success('Panier marqué comme récupéré.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (cart) => {
    const ok = await confirm({ title: 'Supprimer ce panier ?', message: 'Le panier et ses articles seront définitivement supprimés.', confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await api.del(`/admin/carts/${cart.id}`);
      toast.success('Panier supprimé.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AdminPage title="Paniers abandonnés" description="Repérez les paniers inactifs depuis 45 minutes et relancez vos clients.">
      <Seo title="Paniers abandonnés — Administration | EdyEco" robots="noindex, nofollow" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Paniers à relancer" value={data?.pagination?.total ?? '—'} icon={Mail} tone="ember" />
        <StatCard label="Valeur récupérable" value={formatCents(data?.totalValueCents || 0)} hint="Somme des paniers inactifs" icon={Copy} tone="sky" />
        <StatCard label="Délai de relance" value="45 min" hint="Détection automatique côté serveur" icon={CheckCircle2} />
      </div>

      <ErrorBox message={error} onRetry={reload} />
      <div className="overflow-hidden rounded-2xl border border-forest-900/8 bg-white">
        {loading && !data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-forest-900/8 bg-cream/40"><tr><th className="admin-th">Client</th><th className="admin-th">Contenu</th><th className="admin-th">Valeur</th><th className="admin-th">Inactif depuis</th><th className="admin-th text-right">Relance</th></tr></thead>
              <tbody>
                {(data?.carts || []).map((cart) => (
                  <tr key={cart.id} className="border-b border-forest-900/5 last:border-0">
                    <td className="admin-td">
                      <p className="font-medium">{cart.name || 'Panier invité'}</p>
                      <p className="text-[10px] text-ink/45">{cart.email || 'Email non capturé'}</p>
                    </td>
                    <td className="admin-td">
                      <div className="flex items-center gap-2">
                        {cart.items.slice(0, 3).map((item, i) => (
                          <img key={i} src={item.image} alt="" className="h-9 w-9 rounded-lg object-cover" title={`${item.quantity} × ${item.name}`} />
                        ))}
                        <span className="text-[10px] text-ink/45">{cart.items.reduce((s, i) => s + i.quantity, 0)} article(s)</span>
                      </div>
                    </td>
                    <td className="admin-td font-semibold">{formatCents(cart.valueCents)}</td>
                    <td className="admin-td text-xs text-ink/50">{formatDateTime(cart.lastActivityAt)}</td>
                    <td className="admin-td">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => copy(cart.recoveryUrl)} title="Copier le lien de récupération" className="rounded-lg p-2 text-ink/45 hover:bg-forest-50"><Copy className="h-4 w-4" /></button>
                        <button type="button" onClick={() => recover(cart)} disabled={busy === cart.id || !cart.email} title={cart.email ? 'Envoyer un email de relance' : 'Pas d’email'} className="rounded-lg p-2 text-forest-700 hover:bg-forest-50 disabled:opacity-30"><Mail className="h-4 w-4" /></button>
                        <button type="button" onClick={() => markConverted(cart)} title="Marquer comme récupéré" className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /></button>
                        <button type="button" onClick={() => remove(cart)} title="Supprimer" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data && data.carts.length === 0 && <EmptyRow colSpan={5}>Aucun panier abandonné. 🎉</EmptyRow>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[11px] text-ink/40">Un email n’est envoyé que si le client a laissé son adresse ou possède un compte. Sans SMTP configuré, l’envoi est simulé et journalisé côté serveur.</p>
      {confirmElement}
    </AdminPage>
  );
}
