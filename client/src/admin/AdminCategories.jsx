import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, EmptyRow, ErrorBox, ImagePicker, Loading, useAdminApi, useConfirm } from './ui';
import { Drawer } from './ui';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

const EMPTY = { name: '', slug: '', tagline: '', description: '', image: '', position: '0', isActive: true, seoTitle: '', seoDescription: '' };

export default function AdminCategories() {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const { data, loading, error, reload } = useAdminApi('/admin/categories');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setEditing('new'); setForm(EMPTY); };
  const openEdit = (category) => {
    setEditing(category.id);
    setForm({
      name: category.name, slug: category.slug, tagline: category.tagline, description: category.description,
      image: category.image, position: String(category.position), isActive: true,
      seoTitle: category.seo?.title || '', seoDescription: category.seo?.description || '',
    });
  };
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, position: Number(form.position) || 0 };
      if (editing === 'new') await api.post('/admin/categories', payload);
      else await api.patch(`/admin/categories/${editing}`, payload);
      toast.success('Catégorie enregistrée.');
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category) => {
    const ok = await confirm({ title: 'Supprimer la catégorie ?', message: `« ${category.name} » sera supprimée. Les produits associés doivent d’abord être déplacés.`, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await api.del(`/admin/categories/${category.id}`);
      toast.success('Catégorie supprimée.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AdminPage title="Catégories" description="Organisez votre catalogue et travaillez le maillage SEO." actions={<button type="button" className="btn-primary btn-sm" onClick={openNew}><Plus className="h-4 w-4" /> Nouvelle catégorie</button>}>
      <Seo title="Catégories — Administration | EdyEco" robots="noindex, nofollow" />
      <ErrorBox message={error} onRetry={reload} />
      <div className="overflow-hidden rounded-2xl border border-forest-900/8 bg-white">
        {loading && !data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-forest-900/8 bg-cream/40"><tr><th className="admin-th">Catégorie</th><th className="admin-th">Slug</th><th className="admin-th">Produits</th><th className="admin-th">Position</th><th className="admin-th text-right">Actions</th></tr></thead>
              <tbody>
                {(data?.categories || []).map((category) => (
                  <tr key={category.id} className="border-b border-forest-900/5 last:border-0">
                    <td className="admin-td">
                      <div className="flex items-center gap-3">
                        <img src={category.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        <div><p className="font-medium">{category.name}</p><p className="text-[10px] text-ink/40">{category.tagline}</p></div>
                      </div>
                    </td>
                    <td className="admin-td text-xs text-ink/50">/{category.slug}</td>
                    <td className="admin-td">{category.productCount ?? 0}</td>
                    <td className="admin-td">{category.position}</td>
                    <td className="admin-td">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => openEdit(category)} className="rounded-lg p-2 text-forest-700 hover:bg-forest-50" aria-label="Modifier"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => remove(category)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data && data.categories.length === 0 && <EmptyRow colSpan={5}>Aucune catégorie.</EmptyRow>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nouvelle catégorie' : 'Modifier la catégorie'} footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={() => setEditing(null)}>Annuler</button>
          <button type="submit" form="category-form" disabled={saving} className="btn-primary btn-sm">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      }>
        <form id="category-form" onSubmit={save} className="space-y-4">
          <div><label className="label">Nom *</label><input required value={form.name} onChange={set('name')} className="admin-input" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Slug</label><input value={form.slug} onChange={set('slug')} className="admin-input" placeholder="auto" /></div>
            <div><label className="label">Position</label><input type="number" min="0" value={form.position} onChange={set('position')} className="admin-input" /></div>
          </div>
          <div><label className="label">Accroche</label><input value={form.tagline} onChange={set('tagline')} className="admin-input" placeholder="Le classique, sec et performant" /></div>
          <div><label className="label">Description</label><textarea rows={4} value={form.description} onChange={set('description')} className="admin-input" /></div>
          <ImagePicker value={form.image} onChange={(v) => setForm((f) => ({ ...f, image: v }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">SEO — titre</label><input maxLength={70} value={form.seoTitle} onChange={set('seoTitle')} className="admin-input" /></div>
            <div><label className="label">SEO — description</label><input maxLength={180} value={form.seoDescription} onChange={set('seoDescription')} className="admin-input" /></div>
          </div>
        </form>
      </Drawer>
      {confirmElement}
    </AdminPage>
  );
}
