import { useState } from 'react';
import { Download, Mail, Send, Trash2, Users } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, EmptyRow, ErrorBox, Loading, StatCard, StatusPill, useAdminApi, useConfirm } from './ui';
import { formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import { downloadFile } from '../lib/download';

export default function AdminNewsletter() {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAdminApi(`/admin/newsletter?page=${page}&q=${encodeURIComponent(query)}`);
  const { data: campaignsData, reload: reloadCampaigns } = useAdminApi('/admin/campaigns');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const exportCsv = async () => {
    try {
      await downloadFile('/admin/newsletter/export', 'edyeco-newsletter.csv');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (sub) => {
    const ok = await confirm({ title: 'Supprimer cet abonné ?', message: sub.email, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await api.del(`/admin/newsletter/${sub.id}`);
      toast.success('Abonné supprimé.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/admin/campaigns', { subject, content });
      toast.success('Campagne créée en brouillon. Relisez-la puis lancez l’envoi.');
      setSubject('');
      setContent('');
      reloadCampaigns();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const removeCampaign = async (campaign) => {
    const ok = await confirm({ title: 'Supprimer cette campagne ?', message: campaign.subject, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await api.del(`/admin/campaigns/${campaign.id}`);
      toast.success('Campagne supprimée.');
      reloadCampaigns();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const send = async (campaign) => {
    const ok = await confirm({ title: 'Envoyer la campagne ?', message: `${campaign.subject} — jusqu’à 500 destinataires actifs.`, confirmLabel: 'Envoyer' });
    if (!ok) return;
    try {
      const res = await api.post(`/admin/campaigns/${campaign.id}/send`);
      toast.success(res.message || 'Campagne envoyée.');
      reloadCampaigns();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AdminPage title="Newsletter" description="Collectez les e-mails, exportez votre base et adressez vos campagnes. Consentement et désinscription gérés côté serveur." actions={<button type="button" className="btn-outline btn-sm" onClick={exportCsv}><Download className="h-4 w-4" /> Exporter (CSV)</button>}>
      <Seo title="Newsletter — Administration | EdyEco" robots="noindex, nofollow" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Abonnés" value={data?.stats?.total ?? '—'} icon={Users} tone="forest" />
        <StatCard label="Actifs" value={data?.stats?.active ?? '—'} icon={Mail} tone="forest" />
        <StatCard label="30 derniers jours" value={data?.stats?.recent ?? '—'} icon={Send} tone="ember" />
      </div>

      <ErrorBox message={error} onRetry={reload} />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-forest-900/8 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-forest-900/8 p-3">
            <h2 className="text-sm font-semibold">Abonnés</h2>
            <form onSubmit={(e) => { e.preventDefault(); setPage(1); }} className="flex gap-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un e-mail…" className="admin-input h-9 max-w-[220px] text-xs" />
              <button type="submit" className="btn-outline btn-sm">Chercher</button>
            </form>
          </div>
          {loading && !data ? <Loading /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px]">
                <thead className="bg-cream/40"><tr><th className="admin-th">E-mail</th><th className="admin-th">Source</th><th className="admin-th">Inscrit le</th><th className="admin-th">État</th><th className="admin-th" /></tr></thead>
                <tbody>
                  {(data?.subscribers || []).map((sub) => (
                    <tr key={sub.id} className="border-t border-forest-900/5">
                      <td className="admin-td text-xs font-medium">{sub.email}{sub.first_name ? <span className="block text-[10px] text-ink/40">{sub.first_name}</span> : null}</td>
                      <td className="admin-td text-xs text-ink/50">{sub.source || 'site'}</td>
                      <td className="admin-td text-xs text-ink/50">{formatDate(sub.created_at)}</td>
                      <td className="admin-td"><StatusPill tone={sub.is_active ? 'bg-forest-100 text-forest-800' : 'bg-stone-100 text-stone-600'}>{sub.is_active ? 'Actif' : 'Désinscrit'}</StatusPill></td>
                      <td className="admin-td text-right"><button type="button" onClick={() => remove(sub)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                  {data && data.subscribers.length === 0 && <EmptyRow colSpan={5}>Aucun abonné pour le moment.</EmptyRow>}
                </tbody>
              </table>
            </div>
          )}
          {data?.pagination?.pages > 1 && (
            <div className="flex items-center justify-between border-t border-forest-900/8 p-3 text-xs text-ink/50">
              <span>Page {data.pagination.page} / {data.pagination.pages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-outline btn-sm">Précédent</button>
                <button type="button" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)} className="btn-outline btn-sm">Suivant</button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <form onSubmit={create} className="rounded-2xl border border-forest-900/8 bg-white p-4">
            <h2 className="text-sm font-semibold">Nouvelle campagne</h2>
            <p className="mb-3 mt-0.5 text-[11px] text-ink/45">Un e-mail est envoyé à chaque abonné actif (500 max par envoi).</p>
            <label className="label" htmlFor="campaign-subject">Objet</label>
            <input id="campaign-subject" required minLength={3} value={subject} onChange={(e) => setSubject(e.target.value)} className="admin-input" placeholder="Vos bûches sont prêtes pour l’hiver" />
            <label className="label mt-3" htmlFor="campaign-content">Contenu (Markdown)</label>
            <textarea id="campaign-content" required minLength={10} rows={7} value={content} onChange={(e) => setContent(e.target.value)} className="admin-input font-mono text-xs" />
            <button type="submit" disabled={sending} className="btn-primary btn-sm mt-3 w-full">{sending ? 'Création…' : 'Créer la campagne'}</button>
          </form>

          <div className="rounded-2xl border border-forest-900/8 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold">Campagnes</h2>
            {(campaignsData?.campaigns || []).length === 0 && <p className="text-xs text-ink/40">Aucune campagne.</p>}
            <ul className="space-y-2">
              {(campaignsData?.campaigns || []).map((c) => (
                <li key={c.id} className="rounded-xl border border-forest-900/8 p-3">
                  <p className="text-xs font-medium">{c.subject}</p>
                  <p className="mt-0.5 text-[10px] text-ink/40">{c.status === 'sent' ? `Envoyée le ${formatDate(c.sent_at)} · ${c.recipients} destinataires` : 'Brouillon'}</p>
                  <div className="mt-2 flex gap-2">
                    {c.status !== 'sent' && <button type="button" onClick={() => send(c)} className="btn-outline btn-sm"><Send className="h-3 w-3" /> Envoyer</button>}
                    <button type="button" onClick={() => removeCampaign(c)} className="btn-ghost btn-sm text-rose-600"><Trash2 className="h-3 w-3" /> Supprimer</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {confirmElement}
    </AdminPage>
  );
}
