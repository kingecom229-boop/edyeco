import { useState } from 'react';
import { CornerUpLeft, Mail, MailOpen, Trash2 } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, Drawer, ErrorBox, Loading, StatusPill, useAdminApi, useConfirm } from './ui';
import { formatDateTime } from '../lib/format';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

const TONES = { new: 'bg-ember-100 text-ember-800', read: 'bg-stone-100 text-stone-600', replied: 'bg-forest-100 text-forest-800' };
const LABELS = { new: 'Nouveau', read: 'Lu', replied: 'Répondu' };

export default function AdminMessages() {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useAdminApi(`/admin/messages${status ? `?status=${status}` : ''}`);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const remove = async (message) => {
    const ok = await confirm({ title: 'Supprimer ce message ?', message: message.subject, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await api.del(`/admin/messages/${message.id}`);
      toast.success('Message supprimé.');
      setSelected(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const open = async (message) => {
    setSelected(message);
    setReply(message.admin_reply || '');
    if (message.status === 'new') {
      try {
        await api.patch(`/admin/messages/${message.id}`, { status: 'read' });
        reload();
      } catch { /* non bloquant */ }
    }
  };

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.patch(`/admin/messages/${selected.id}`, { status: 'replied', reply });
      toast.success('Réponse envoyée et message marqué comme traité.');
      setSelected(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminPage title="Messages" description="Les demandes envoyées depuis le formulaire de contact, centralisées ici.">
      <Seo title="Messages — Administration | EdyEco" robots="noindex, nofollow" />
      <div className="flex gap-1">
        {[['', 'Tous'], ['new', 'Nouveaux'], ['read', 'Lus'], ['replied', 'Répondus']].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${status === value ? 'bg-forest-900 text-white' : 'bg-white text-ink/60 hover:bg-forest-50'}`}>{label}</button>
        ))}
      </div>
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data ? <Loading /> : (
        <ul className="space-y-2">
          {(data?.messages || []).map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => open(m)} className={`w-full rounded-2xl border bg-white p-4 text-left transition hover:border-forest-300 ${m.status === 'new' ? 'border-ember-200' : 'border-forest-900/8'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {m.status === 'new' ? <Mail className="h-4 w-4 text-ember-600" /> : <MailOpen className="h-4 w-4 text-ink/35" />}
                    <span className="text-sm font-semibold">{m.subject}</span>
                  </div>
                  <StatusPill tone={TONES[m.status] || TONES.read}>{LABELS[m.status] || m.status}</StatusPill>
                </div>
                <p className="mt-1 text-xs text-ink/50">{m.name} · {m.email} · {formatDateTime(m.created_at)}</p>
                <p className="mt-1.5 line-clamp-2 text-xs text-ink/60">{m.message}</p>
              </button>
            </li>
          ))}
          {data && data.messages.length === 0 && <li className="rounded-2xl border border-forest-900/8 bg-white py-14 text-center text-sm text-ink/45">Aucun message.</li>}
        </ul>
      )}

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.subject || 'Message'} footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={() => setSelected(null)}>Fermer</button>
          <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => remove(selected)}><Trash2 className="h-4 w-4" /> Supprimer</button>
          <button type="submit" form="reply-form" disabled={sending || reply.trim().length < 5} className="btn-primary btn-sm"><CornerUpLeft className="h-4 w-4" /> {sending ? 'Envoi…' : 'Répondre'}</button>
        </div>
      }>
        {selected && (
          <div className="space-y-4">
            <div className="rounded-xl bg-cream/60 p-3 text-xs text-ink/60">
              <p className="font-semibold text-ink">{selected.name}</p>
              <p>{selected.email}{selected.phone ? ` · ${selected.phone}` : ''}</p>
              <p className="mt-1">{formatDateTime(selected.created_at)}</p>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed">{selected.message}</p>
            {selected.admin_reply && (
              <div className="rounded-xl border border-forest-200 bg-forest-50 p-3 text-xs">
                <p className="mb-1 font-semibold text-forest-800">Réponse enregistrée</p>
                <p className="whitespace-pre-line text-forest-900/80">{selected.admin_reply}</p>
              </div>
            )}
            <form id="reply-form" onSubmit={send}>
              <label className="label" htmlFor="reply">Votre réponse (e-mail)</label>
              <textarea id="reply" rows={7} minLength={5} value={reply} onChange={(e) => setReply(e.target.value)} className="admin-input" placeholder="Bonjour, merci pour votre message…" />
            </form>
          </div>
        )}
      </Drawer>
      {confirmElement}
    </AdminPage>
  );
}
