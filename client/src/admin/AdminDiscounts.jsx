import { useState } from 'react';
import { Plus, Power, Trash2, Percent } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, EmptyRow, ErrorBox, Loading, StatusPill, centsToEuro, euroToCents, useAdminApi, useConfirm } from './ui';
import { Modal } from '../components/ui';
import { formatCents, formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

const EMPTY = { code: '', type: 'percent', value: '10', minOrder: '0', maxUses: '', expiresAt: '', isActive: true };

export default function AdminDiscounts() {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const { data, loading, error, reload } = useAdminApi('/admin/discounts');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/discounts', {
        code: form.code,
        type: form.type,
        value: form.type === 'percent' ? Number(form.value) : euroToCents(form.value),
        minOrderCents: euroToCents(form.minOrder),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        isActive: true,
      });
      toast.success('Code promo créé.');
      setOpen(false);
      setForm(EMPTY);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (discount) => {
    try {
      await api.patch(`/admin/discounts/${discount.id}`, { isActive: !discount.isActive });
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (discount) => {
    const ok = await confirm({ title: 'Supprimer ce code ?', message: `Le code ${discount.code} ne sera plus utilisable.`, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await api.del(`/admin/discounts/${discount.id}`);
      toast.success('Code supprimé.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AdminPage title="Codes promo" description="Créez des remises en pourcentage ou en euros, avec minimum d’achat et limite d’utilisation." actions={<button type="button" className="btn-primary btn-sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nouveau code</button>}>
      <Seo title="Codes promo — Administration | EdyEco" robots="noindex, nofollow" />
      <ErrorBox message={error} onRetry={reload} />
      <div className="overflow-hidden rounded-2xl border border-forest-900/8 bg-white">
        {loading && !data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-forest-900/8 bg-cream/40"><tr><th className="admin-th">Code</th><th className="admin-th">Remise</th><th className="admin-th">Minimum</th><th className="admin-th">Utilisations</th><th className="admin-th">Expiration</th><th className="admin-th">Statut</th><th className="admin-th text-right">Actions</th></tr></thead>
              <tbody>
                {(data?.discounts || []).map((discount) => (
                  <tr key={discount.id} className="border-b border-forest-900/5 last:border-0">
                    <td className="admin-td font-mono text-xs font-semibold">{discount.code}</td>
                    <td className="admin-td text-sm">{discount.type === 'percent' ? `${discount.value} %` : formatCents(discount.value)}</td>
                    <td className="admin-td text-xs">{discount.minOrderCents ? formatCents(discount.minOrderCents) : '—'}</td>
                    <td className="admin-td text-xs">{discount.usedCount}{discount.maxUses ? ` / ${discount.maxUses}` : ''}</td>
                    <td className="admin-td text-xs text-ink/50">{discount.expiresAt ? formatDate(discount.expiresAt) : '—'}</td>
                    <td className="admin-td"><StatusPill tone={discount.isActive ? 'bg-forest-100 text-forest-800' : 'bg-stone-100 text-stone-600'}>{discount.isActive ? 'Actif' : 'Inactif'}</StatusPill></td>
                    <td className="admin-td">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => toggle(discount)} className="rounded-lg p-2 text-forest-700 hover:bg-forest-50" title="Activer/désactiver"><Power className="h-4 w-4" /></button>
                        <button type="button" onClick={() => remove(discount)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data && data.discounts.length === 0 && <EmptyRow colSpan={7}>Aucun code promo.</EmptyRow>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau code promo" size="sm" footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={() => setOpen(false)}>Annuler</button>
          <button type="submit" form="discount-form" disabled={saving} className="btn-primary btn-sm">{saving ? 'Création…' : 'Créer le code'}</button>
        </div>
      }>
        <form id="discount-form" onSubmit={save} className="space-y-3">
          <div><label className="label">Code *</label><input required minLength={3} maxLength={40} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })} className="admin-input font-mono" placeholder="BIENVENUE10" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Type</label><select value={form.type} onChange={set('type')} className="admin-input"><option value="percent">Pourcentage</option><option value="fixed">Montant fixe</option></select></div>
            <div><label className="label">{form.type === 'percent' ? 'Valeur (%)' : 'Valeur (€)'} *</label><input required inputMode="decimal" value={form.value} onChange={set('value')} className="admin-input" /></div>
            <div><label className="label">Minimum d’achat (€)</label><input inputMode="decimal" value={form.minOrder} onChange={set('minOrder')} className="admin-input" /></div>
            <div><label className="label">Utilisations max.</label><input type="number" min="1" value={form.maxUses} onChange={set('maxUses')} className="admin-input" placeholder="illimité" /></div>
          </div>
          <div><label className="label">Date d’expiration</label><input type="date" value={form.expiresAt} onChange={set('expiresAt')} className="admin-input" /></div>
          <p className="rounded-xl bg-forest-50 px-3 py-2 text-[11px] text-forest-900/70"><Percent className="mr-1 inline h-3 w-3" /> Les montants sont vérifiés côté serveur au moment du paiement.</p>
        </form>
      </Modal>
      {confirmElement}
    </AdminPage>
  );
}
