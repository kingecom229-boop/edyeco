import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, Drawer, EmptyRow, ErrorBox, Loading, StatusPill, useAdminApi, useConfirm } from './ui';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

const EMPTY = { question: '', answer: '', category: 'Général', position: '0', isPublished: true };

export default function AdminFaqs() {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const { data, loading, error, reload } = useAdminApi('/admin/faqs');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setEditing('new'); setForm(EMPTY); };
  const openEdit = (faq) => {
    setEditing(faq.id);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category, position: String(faq.position), isPublished: faq.isPublished });
  };
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, position: Number(form.position) || 0 };
      if (editing === 'new') await api.post('/admin/faqs', payload);
      else await api.patch(`/admin/faqs/${editing}`, payload);
      toast.success('FAQ enregistrée.');
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (faq) => {
    const ok = await confirm({ title: 'Supprimer cette question ?', message: faq.question, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await api.del(`/admin/faqs/${faq.id}`);
      toast.success('FAQ supprimée.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AdminPage title="FAQ" description="Les questions/réponses alimentent la page FAQ et le balisage FAQPage (rich results Google)." actions={<button type="button" className="btn-primary btn-sm" onClick={openNew}><Plus className="h-4 w-4" /> Nouvelle question</button>}>
      <Seo title="FAQ — Administration | EdyEco" robots="noindex, nofollow" />
      <ErrorBox message={error} onRetry={reload} />
      <div className="overflow-hidden rounded-2xl border border-forest-900/8 bg-white">
        {loading && !data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="border-b border-forest-900/8 bg-cream/40"><tr><th className="admin-th">Question</th><th className="admin-th">Catégorie</th><th className="admin-th">Position</th><th className="admin-th">Statut</th><th className="admin-th text-right">Actions</th></tr></thead>
              <tbody>
                {(data?.faqs || []).map((faq) => (
                  <tr key={faq.id} className="border-b border-forest-900/5 last:border-0">
                    <td className="admin-td"><p className="max-w-[420px] font-medium">{faq.question}</p><p className="max-w-[420px] truncate text-[10px] text-ink/40">{faq.answer}</p></td>
                    <td className="admin-td text-xs">{faq.category}</td>
                    <td className="admin-td text-xs">{faq.position}</td>
                    <td className="admin-td"><StatusPill tone={faq.isPublished ? 'bg-forest-100 text-forest-800' : 'bg-stone-100 text-stone-600'}>{faq.isPublished ? 'Publiée' : 'Masquée'}</StatusPill></td>
                    <td className="admin-td">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => openEdit(faq)} className="rounded-lg p-2 text-forest-700 hover:bg-forest-50" aria-label="Modifier"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => remove(faq)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data && data.faqs.length === 0 && <EmptyRow colSpan={5}>Aucune question.</EmptyRow>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nouvelle question' : 'Modifier la question'} footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={() => setEditing(null)}>Annuler</button>
          <button type="submit" form="faq-form" disabled={saving} className="btn-primary btn-sm">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      }>
        <form id="faq-form" onSubmit={save} className="space-y-4">
          <div><label className="label">Question *</label><input required minLength={5} value={form.question} onChange={set('question')} className="admin-input" /></div>
          <div><label className="label">Réponse *</label><textarea required rows={6} minLength={5} value={form.answer} onChange={set('answer')} className="admin-input" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Catégorie</label><input value={form.category} onChange={set('category')} className="admin-input" list="faq-cats" /><datalist id="faq-cats"><option value="Livraison" /><option value="Qualité" /><option value="Conseils" /><option value="Commande" /><option value="Général" /></datalist></div>
            <div><label className="label">Position</label><input type="number" min="0" value={form.position} onChange={set('position')} className="admin-input" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished} onChange={set('isPublished')} className="h-4 w-4 rounded" /> Publiée sur le site</label>
        </form>
      </Drawer>
      {confirmElement}
    </AdminPage>
  );
}
