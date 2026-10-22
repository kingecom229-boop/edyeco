import { useState } from 'react';
import { Download, Mail } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, Drawer, EmptyRow, ErrorBox, Loading, SearchInput, StatusPill, useAdminApi } from './ui';
import { Pagination } from '../components/ui';
import { formatCents, formatDate } from '../lib/format';
import { downloadFile } from '../lib/download';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

export default function AdminCustomers() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const path = `/admin/customers?page=${page}&q=${encodeURIComponent(query)}`;
  const { data, loading, error, reload } = useAdminApi(path);
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const open = async (customer) => {
    setSelected({ customer, orders: [] });
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/customers/${customer.id}`);
      setSelected(res);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <AdminPage
      title="Clients"
      description="Vos clients, leur valeur et leurs préférences d’emailing."
      actions={<button type="button" className="btn-outline btn-sm" onClick={() => downloadFile('/admin/customers/export', 'edyeco-clients.csv').catch((e) => toast.error(e.message))}><Download className="h-4 w-4" /> Exporter CSV</button>}
    >
      <Seo title="Clients — Administration | EdyEco" robots="noindex, nofollow" />
      <SearchInput value={search} onChange={setSearch} onSearch={() => { setQuery(search); setPage(1); }} placeholder="Email ou nom…" />
      <ErrorBox message={error} onRetry={() => reload(path)} />
      <div className="overflow-hidden rounded-2xl border border-forest-900/8 bg-white">
        {loading && !data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-forest-900/8 bg-cream/40"><tr><th className="admin-th">Client</th><th className="admin-th">Commandes</th><th className="admin-th">Total dépensé</th><th className="admin-th">Newsletter</th><th className="admin-th">Inscrit le</th><th className="admin-th">Dernière commande</th></tr></thead>
              <tbody>
                {(data?.customers || []).map((customer) => (
                  <tr key={customer.id} className="cursor-pointer border-b border-forest-900/5 last:border-0 hover:bg-forest-50/30" onClick={() => open(customer)}>
                    <td className="admin-td"><p className="font-medium">{customer.firstName} {customer.lastName}</p><p className="text-[10px] text-ink/40">{customer.email}</p></td>
                    <td className="admin-td">{customer.ordersCount}</td>
                    <td className="admin-td font-semibold">{formatCents(customer.spentCents)}</td>
                    <td className="admin-td"><StatusPill tone={customer.emailOptIn ? 'bg-forest-100 text-forest-800' : 'bg-stone-100 text-stone-600'}>{customer.emailOptIn ? 'Opt-in' : 'Non'}</StatusPill></td>
                    <td className="admin-td text-xs text-ink/50">{formatDate(customer.createdAt)}</td>
                    <td className="admin-td text-xs text-ink/50">{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}</td>
                  </tr>
                ))}
                {data && data.customers.length === 0 && <EmptyRow colSpan={6}>Aucun client pour le moment.</EmptyRow>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {data?.pagination && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink/45">{data.pagination.total} client(s)</p>
          <Pagination page={page} pages={data.pagination.pages || 1} onChange={setPage} />
        </div>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Fiche client">
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4">
              <p className="font-display text-lg font-semibold">{selected.customer.firstName} {selected.customer.lastName}</p>
              <p className="text-sm text-ink/60">{selected.customer.email}</p>
              <p className="text-sm text-ink/60">{selected.customer.phone || 'Téléphone non renseigné'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <StatusPill tone="bg-forest-100 text-forest-800">Inscrit le {formatDate(selected.customer.createdAt)}</StatusPill>
                <StatusPill tone={selected.customer.emailOptIn ? 'bg-ember-100 text-ember-800' : 'bg-stone-100 text-stone-600'}>{selected.customer.emailOptIn ? 'Newsletter activée' : 'Pas de newsletter'}</StatusPill>
              </div>
              <a href={`mailto:${selected.customer.email}`} className="btn-outline btn-sm mt-3"><Mail className="h-4 w-4" /> Écrire</a>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/45">Commandes</p>
              {loadingDetail ? <Loading label="Chargement…" /> : selected.orders.length === 0 ? (
                <p className="rounded-xl bg-white p-4 text-xs text-ink/45">Aucune commande.</p>
              ) : (
                <ul className="space-y-2">
                  {selected.orders.map((order) => (
                    <li key={order.id} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs">
                      <div><p className="font-semibold">{order.reference}</p><p className="text-[10px] text-ink/40">{formatDate(order.createdAt)}</p></div>
                      <span className="capitalize text-ink/50">{order.status}</span>
                      <span className="font-semibold">{formatCents(order.totalCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </AdminPage>
  );
}
