import { useState } from 'react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, Drawer, EmptyRow, ErrorBox, ImagePicker, Loading, MarkdownPreview, SearchInput, StatusPill, useAdminApi, useConfirm } from './ui';
import { formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

const EMPTY = {
  title: '', slug: '', excerpt: '', content: '', cover: '', category: 'Conseils', tags: '',
  author: 'Équipe EdyEco', status: 'draft', readMinutes: '5', seoTitle: '', seoDescription: '',
};

export default function AdminBlog() {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const { data, loading, error, reload } = useAdminApi(`/admin/blog?q=${encodeURIComponent(query)}`);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openNew = () => { setEditing('new'); setForm(EMPTY); setPreview(false); };
  const openEdit = async (post) => {
    setPreview(false);
    try {
      const res = await api.get(`/admin/blog/${post.id}`);
      const p = res.post;
      setEditing(p.id);
      setForm({
        title: p.title, slug: p.slug, excerpt: p.excerpt, content: p.content, cover: p.cover,
        category: p.category, tags: (p.tags || []).join(', '), author: p.author, status: p.status,
        readMinutes: String(p.readMinutes), seoTitle: p.seo.title || '', seoDescription: p.seo.description || '',
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        readMinutes: Number(form.readMinutes) || 5,
      };
      if (editing === 'new') await api.post('/admin/blog', payload);
      else await api.patch(`/admin/blog/${editing}`, payload);
      toast.success('Article enregistré.');
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (post) => {
    const ok = await confirm({ title: 'Supprimer l’article ?', message: `« ${post.title} » sera définitivement supprimé.`, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await api.del(`/admin/blog/${post.id}`);
      toast.success('Article supprimé.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AdminPage title="Blog & guides" description="Publiez des contenus qui attirent du trafic organique et rassurent vos clients." actions={<button type="button" className="btn-primary btn-sm" onClick={openNew}><Plus className="h-4 w-4" /> Nouvel article</button>}>
      <Seo title="Blog — Administration | EdyEco" robots="noindex, nofollow" />
      <SearchInput value={search} onChange={setSearch} onSearch={() => setQuery(search)} placeholder="Titre ou slug…" />
      <ErrorBox message={error} onRetry={reload} />
      <div className="overflow-hidden rounded-2xl border border-forest-900/8 bg-white">
        {loading && !data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-forest-900/8 bg-cream/40"><tr><th className="admin-th">Article</th><th className="admin-th">Catégorie</th><th className="admin-th">Statut</th><th className="admin-th">Publication</th><th className="admin-th">Lecture</th><th className="admin-th text-right">Actions</th></tr></thead>
              <tbody>
                {(data?.posts || []).map((post) => (
                  <tr key={post.id} className="border-b border-forest-900/5 last:border-0">
                    <td className="admin-td"><p className="max-w-[320px] truncate font-medium">{post.title}</p><p className="text-[10px] text-ink/40">/{post.slug}</p></td>
                    <td className="admin-td text-xs">{post.category}</td>
                    <td className="admin-td"><StatusPill tone={post.status === 'published' ? 'bg-forest-100 text-forest-800' : 'bg-amber-100 text-amber-800'}>{post.status === 'published' ? 'Publié' : 'Brouillon'}</StatusPill></td>
                    <td className="admin-td text-xs text-ink/50">{post.publishedAt ? formatDate(post.publishedAt) : '—'}</td>
                    <td className="admin-td text-xs">{post.readMinutes} min</td>
                    <td className="admin-td">
                      <div className="flex justify-end gap-1">
                        <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-ink/40 hover:bg-forest-50" aria-label="Voir"><Eye className="h-4 w-4" /></a>
                        <button type="button" onClick={() => openEdit(post)} className="rounded-lg p-2 text-forest-700 hover:bg-forest-50" aria-label="Modifier"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => remove(post)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data && data.posts.length === 0 && <EmptyRow colSpan={6}>Aucun article. Lancez-vous !</EmptyRow>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nouvel article' : 'Modifier l’article'} wide footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={() => setPreview((p) => !p)}>{preview ? 'Éditer' : 'Prévisualiser'}</button>
          <div className="flex gap-2">
            <button type="button" className="btn-outline btn-sm" onClick={() => setEditing(null)}>Annuler</button>
            <button type="submit" form="blog-form" disabled={saving} className="btn-primary btn-sm">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </div>
      }>
        {preview ? (
          <div className="space-y-3">
            <h2 className="font-display text-2xl font-semibold">{form.title || 'Titre de l’article'}</h2>
            <p className="text-sm text-ink/55">{form.excerpt}</p>
            <MarkdownPreview text={form.content} />
          </div>
        ) : (
          <form id="blog-form" onSubmit={save} className="space-y-4">
            <div><label className="label">Titre *</label><input required minLength={5} value={form.title} onChange={set('title')} className="admin-input" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Slug</label><input value={form.slug} onChange={set('slug')} className="admin-input" placeholder="auto" /></div>
              <div><label className="label">Catégorie</label><input value={form.category} onChange={set('category')} className="admin-input" list="blog-categories" /><datalist id="blog-categories"><option value="Conseils" /><option value="Guides" /><option value="Livraison" /><option value="Produits" /></datalist></div>
              <div><label className="label">Auteur</label><input value={form.author} onChange={set('author')} className="admin-input" /></div>
              <div><label className="label">Temps de lecture (min)</label><input type="number" min="1" max="60" value={form.readMinutes} onChange={set('readMinutes')} className="admin-input" /></div>
            </div>
            <div><label className="label">Accroche *</label><textarea required rows={2} maxLength={400} value={form.excerpt} onChange={set('excerpt')} className="admin-input" /></div>
            <ImagePicker value={form.cover} onChange={(v) => setForm((f) => ({ ...f, cover: v }))} label="Image de couverture" />
            <div><label className="label">Contenu (Markdown) *</label><textarea required rows={14} value={form.content} onChange={set('content')} className="admin-input font-mono text-xs" placeholder="## Sous-titre&#10;&#10;Votre paragraphe…" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Tags (séparés par des virgules)</label><input value={form.tags} onChange={set('tags')} className="admin-input" /></div>
              <div><label className="label">Statut</label><select value={form.status} onChange={set('status')} className="admin-input"><option value="draft">Brouillon</option><option value="published">Publié</option></select></div>
              <div><label className="label">SEO — titre</label><input maxLength={70} value={form.seoTitle} onChange={set('seoTitle')} className="admin-input" /></div>
              <div><label className="label">SEO — description</label><input maxLength={180} value={form.seoDescription} onChange={set('seoDescription')} className="admin-input" /></div>
            </div>
            <p className="rounded-xl bg-forest-50 p-3 text-[11px] text-forest-900/70">Le Markdown est converti côté serveur avec échappement préalable : aucun HTML brut n’est interprété, ce qui empêche toute injection.</p>
          </form>
        )}
      </Drawer>
      {confirmElement}
    </AdminPage>
  );
}
