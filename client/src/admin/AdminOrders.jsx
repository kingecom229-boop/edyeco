import { useEffect, useState } from 'react';
import { Download, ExternalLink, Pencil, Receipt } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, Drawer, EmptyRow, ErrorBox, Loading, SearchInput, StatusPill, useAdminApi } from './ui';
import { Pagination } from '../components/ui';
import { formatCents, formatDateTime, statusMeta } from '../lib/format';
import { downloadFile } from '../lib/download';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

const STATUSES = ['pending', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function AdminOrders() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const path = `/admin/orders?page=${page}&q=${encodeURIComponent(query)}${status ? `&status=${status}` : ''}`;
  const { data, loading, error, reload } = useAdminApi(path);
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState({ status: '', trackingNumber: '', adminNote: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selected) setEdit({ status: selected.status, trackingNumber: selected.trackingNumber || '', adminNote: selected.adminNote || '' });
  }, [selected]);

  const open = async (order) => {
    setSelected(order);
    try {
      const res = await api.get(`/admin/orders/${order.id}`);
      setSelected(res.order);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await api.patch(`/admin/orders/${selected.id}`, edit);
      setSelected(res.order);
      toast.success('Commande mise à jour.');
      reload(path);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage
      title="Commandes"
      description="Suivez les paiements, préparez les livraisons et gérez le service client."
      actions={<button type="button" className="btn-outline btn-sm" onClick={() => downloadFile('/admin/orders/export', 'edyeco-commandes.csv').catch((e) => toast.error(e.message))}><Download className="h-4 w-4" /> Exporter CSV</button>}
    >
      <Seo title="Commandes — Administration | EdyEco" robots="noindex, nofollow" />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} onSearch={() => { setQuery(search); setPage(1); }} placeholder="Référence, nom, email…" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="admin-input !w-auto" aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusMeta(s).label}</option>)}
        </select>
      </div>

      <ErrorBox message={error} onRetry={() => reload(path)} />
      <div className="overflow-hidden rounded-2xl border border-forest-900/8 bg-white">
        {loading && !data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-forest-900/8 bg-cream/40"><tr><th className="admin-th">Commande</th><th className="admin-th">Client</th><th className="admin-th">Date</th><th className="admin-th">Statut</th><th className="admin-th">Paiement</th><th className="admin-th text-right">Total</th><th className="admin-th" /></tr></thead>
              <tbody>
                {(data?.orders || []).map((order) => {
                  const meta = statusMeta(order.status);
                  return (
                    <tr key={order.id} className="cursor-pointer border-b border-forest-900/5 last:border-0 hover:bg-forest-50/30" onClick={() => open(order)}>
                      <td className="admin-td font-semibold">{order.reference}</td>
                      <td className="admin-td"><p>{order.customerName}</p><p className="text-[10px] text-ink/40">{order.email}</p></td>
                      <td className="admin-td text-xs text-ink/55">{formatDateTime(order.createdAt)}</td>
                      <td className="admin-td"><StatusPill tone={meta.tone}>{meta.label}</StatusPill></td>
                      <td className="admin-td text-xs capitalize text-ink/55">{order.paymentMethod}</td>
                      <td className="admin-td text-right font-semibold">{formatCents(order.totalCents)}</td>
                      <td className="admin-td text-right"><button type="button" className="rounded-lg p-2 text-forest-700 hover:bg-forest-50" aria-label="Ouvrir"><Pencil className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
                {data && data.orders.length === 0 && <EmptyRow colSpan={7}>Aucune commande pour ce filtre.</EmptyRow>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {data?.pagination && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink/45">{data.pagination.total} commande(s)</p>
          <Pagination page={page} pages={data.pagination.pages || 1} onChange={setPage} />
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Commande ${selected.reference}` : ''}
        wide
        footer={selected && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a href={`/api/admin/orders/${selected.id}/invoice`} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm"><Receipt className="h-4 w-4" /> Facture</a>
            <div className="flex gap-2">
              <button type="button" className="btn-outline btn-sm" onClick={() => setSelected(null)}>Fermer</button>
              <button type="button" onClick={save} disabled={saving} className="btn-primary btn-sm">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </div>
        )}
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Client</p>
                <p className="mt-1 text-sm font-semibold">{selected.customerName}</p>
                <p className="text-xs text-ink/55">{selected.email}</p>
                <p className="text-xs text-ink/55">{selected.phone || '—'}</p>
                <p className="mt-2 text-xs text-ink/55">{selected.shippingAddress?.line1}</p>
                <p className="text-xs text-ink/55">{selected.shippingAddress?.postalCode} {selected.shippingAddress?.city}</p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Paiement & livraison</p>
                <p className="mt-1 text-sm font-semibold">{formatCents(selected.totalCents)}</p>
                <p className="text-xs capitalize text-ink/55">{selected.deliveryMethod} · {selected.deliveryFeeCents ? formatCents(selected.deliveryFeeCents) : 'offert'}</p>
                <p className="text-xs text-ink/55">Paiement : {selected.paymentMethod}</p>
                <p className="text-[11px] text-ink/40">{formatDateTime(selected.createdAt)}</p>
                {selected.paidAt && <p className="text-[11px] text-forest-700">Payée le {formatDateTime(selected.paidAt)}</p>}
              </div>
            </div>

            <div className="rounded-xl border border-forest-900/8 bg-white">
              <table className="w-full">
                <thead><tr className="border-b border-forest-900/8"><th className="admin-th">Produit</th><th className="admin-th">Qté</th><th className="admin-th text-right">Total</th></tr></thead>
                <tbody>
                  {selected.items.map((item) => (
                    <tr key={item.id} className="border-b border-forest-900/5 last:border-0">
                      <td className="admin-td">
                        <div className="flex items-center gap-2">
                          <img src={item.image} alt="" className="h-8 w-8 rounded object-cover" />
                          <span className="text-xs">{item.name}</span>
                        </div>
                      </td>
                      <td className="admin-td text-xs">{item.quantity}</td>
                      <td className="admin-td text-right text-xs font-medium">{formatCents(item.lineTotalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 border-t border-forest-900/8 p-4 text-xs">
                <p className="flex justify-between"><span className="text-ink/50">Sous-total</span><span>{formatCents(selected.subtotalCents)}</span></p>
                <p className="flex justify-between"><span className="text-ink/50">Livraison</span><span>{formatCents(selected.deliveryFeeCents)}</span></p>
                {selected.discountCents > 0 && <p className="flex justify-between text-forest-700"><span>Remise {selected.discountCode}</span><span>-{formatCents(selected.discountCents)}</span></p>}
                <p className="flex justify-between pt-1 text-sm font-bold"><span>Total</span><span>{formatCents(selected.totalCents)}</span></p>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl bg-white p-4 sm:grid-cols-2">
              <div>
                <label className="label">Statut de la commande</label>
                <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} className="admin-input">
                  {STATUSES.map((s) => <option key={s} value={s}>{statusMeta(s).label}</option>)}
                </select>
                <p className="mt-1 text-[10px] text-ink/40">Le passage à « payée » décrémente le stock. Le remboursement le réincrémente.</p>
              </div>
              <div>
                <label className="label">Numéro de suivi</label>
                <input value={edit.trackingNumber} onChange={(e) => setEdit({ ...edit, trackingNumber: e.target.value })} className="admin-input" placeholder="Transporteur / n° de palette" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Note interne</label>
                <textarea rows={3} value={edit.adminNote} onChange={(e) => setEdit({ ...edit, adminNote: e.target.value })} className="admin-input" placeholder="Instruction de livraison, échange SAV…" />
              </div>
              {selected.customerNote && (
                <div className="sm:col-span-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold">Note du client</p>
                  <p>{selected.customerNote}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </AdminPage>
  );
}
