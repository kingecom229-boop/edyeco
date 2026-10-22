import { useEffect, useState } from 'react';
import { Download, Pencil, Plus, Star, Trash2, Upload, Eye } from 'lucide-react';
import Seo from '../components/Seo';
import {
  AdminPage, Drawer, EmptyRow, ErrorBox, ImagePicker, Loading, SearchInput, StatusPill, centsToEuro, euroToCents,
  useAdminApi, useConfirm,
} from './ui';
import { Pagination } from '../components/ui';
import { formatCents } from '../lib/format';
import { downloadFile } from '../lib/download';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

const EMPTY_FORM = {
  name: '', slug: '', sku: '', categoryId: '', shortDescription: '', description: '',
  price: '', compareAt: '', stock: '0', unit: 'palette', logLengthCm: '', volumeM3: '',
  woodType: 'Chêne & hêtre', moisture: 'Moins de 20 %', image: '', gallery: '', badges: '',
  position: '0', isActive: true, isFeatured: false, deliveryClass: 'classique', seoTitle: '', seoDescription: '',
};

const SAMPLE_CSV = `name,category,price,stock,unit,log_length_cm,volume_m3,short_description,image_url,featured
Bois de chauffage 45 cm — palette 1,5 m³,bois-de-chauffage,459.00,20,palette,45,1.5,Bûches de 45 cm prêtes à brûler,/products/palette-50.png,true
Granulés premium 15 kg — palette 33 sacs,granules-de-bois,229.00,30,palette,,,Granulés ENplus A1 en palette de 33 sacs,/products/granules.png,false`;

export default function AdminProducts() {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const path = `/admin/products?page=${page}&q=${encodeURIComponent(query)}&status=${status}`;
  const { data, loading, error, reload } = useAdminApi(path);

  useEffect(() => {
    api.get('/admin/categories').then((res) => setCategories(res.categories || [])).catch(() => {});
  }, []);

  const openNew = () => {
    setEditing('new');
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id ? String(categories[0].id) : '' });
  };

  const openEdit = (product) => {
    setEditing(product.id);
    setForm({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      categoryId: product.category ? String(categories.find((c) => c.slug === product.category.slug)?.id || '') : '',
      shortDescription: product.shortDescription || '',
      description: product.description || '',
      price: centsToEuro(product.priceCents),
      compareAt: product.compareAtCents ? centsToEuro(product.compareAtCents) : '',
      stock: String(product.stock),
      unit: product.unit,
      logLengthCm: product.logLengthCm ? String(product.logLengthCm) : '',
      volumeM3: product.volumeM3 ? String(product.volumeM3) : '',
      woodType: product.woodType,
      moisture: product.moisture,
      image: product.image,
      gallery: (product.gallery || []).join('\n'),
      badges: (product.badges || []).join(', '),
      position: String(product.position ?? 0),
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      deliveryClass: product.deliveryClass,
      seoTitle: product.seo.title || '',
      seoDescription: product.seo.description || '',
    });
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug || undefined,
      sku: form.sku || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      shortDescription: form.shortDescription,
      description: form.description,
      priceCents: euroToCents(form.price),
      compareAtCents: form.compareAt ? euroToCents(form.compareAt) : null,
      stock: Number(form.stock) || 0,
      unit: form.unit,
      logLengthCm: form.logLengthCm ? Number(form.logLengthCm) : null,
      volumeM3: form.volumeM3 ? Number(String(form.volumeM3).replace(',', '.')) : null,
      woodType: form.woodType,
      moisture: form.moisture,
      image: form.image,
      gallery: form.gallery.split('\n').map((s) => s.trim()).filter(Boolean),
      badges: form.badges.split(',').map((s) => s.trim()).filter(Boolean),
      position: Number(form.position) || 0,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      deliveryClass: form.deliveryClass,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
    };
    try {
      if (editing === 'new') await api.post('/admin/products', payload);
      else await api.patch(`/admin/products/${editing}`, payload);
      toast.success(editing === 'new' ? 'Produit créé.' : 'Produit mis à jour.');
      setEditing(null);
      reload(path);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async (product) => {
    try {
      await api.patch(`/admin/products/${product.id}`, { isFeatured: !product.isFeatured });
      reload(path);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (product) => {
    const ok = await confirm({
      title: 'Supprimer ce produit ?',
      message: `« ${product.name} » sera archivé s’il a déjà été commandé, sinon supprimé définitivement. Les commandes existantes restent intactes.`,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await api.del(`/admin/products/${product.id}?hard=1`);
      toast.success('Produit traité.');
      reload(path);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const doImport = async (e) => {
    e.preventDefault();
    setImporting(true);
    setImportResult(null);
    try {
      const res = await api.post('/admin/products/import', { csv });
      setImportResult(res);
      toast.success(res.message);
      reload(path);
    } catch (err) {
      toast.error(err.message);
      setImportResult({ errors: [{ line: 0, error: err.message }], created: [] });
    } finally {
      setImporting(false);
    }
  };

  const readFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ''));
    reader.readAsText(file);
  };

  return (
    <AdminPage
      title="Produits"
      description="Créez, modifiez, importez et archivez vos références. Les prix sont en euros TTC."
      actions={
        <>
          <button type="button" className="btn-outline btn-sm" onClick={() => downloadFile('/admin/products/export', 'edyeco-produits.csv').catch((err) => toast.error(err.message))}>
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
          <button type="button" className="btn-outline btn-sm" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Importer</button>
          <button type="button" className="btn-primary btn-sm" onClick={openNew}><Plus className="h-4 w-4" /> Nouveau produit</button>
        </>
      }
    >
      <Seo title="Produits — Administration | EdyEco" robots="noindex, nofollow" />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} onSearch={() => { setQuery(search); setPage(1); }} placeholder="Nom ou SKU…" />
        <div className="flex gap-1">
          {[['', 'Tous'], ['active', 'Actifs'], ['inactive', 'Archivés'], ['low', 'Stock faible']].map(([value, label]) => (
            <button key={value} type="button" onClick={() => { setStatus(value); setPage(1); }} className={`rounded-full px-3 py-1.5 text-xs font-medium ${status === value ? 'bg-forest-900 text-white' : 'bg-white text-ink/60 hover:bg-forest-50'}`}>{label}</button>
          ))}
        </div>
      </div>

      <ErrorBox message={error} onRetry={() => reload(path)} />

      <div className="overflow-hidden rounded-2xl border border-forest-900/8 bg-white">
        {loading && !data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-forest-900/8 bg-cream/40">
                <tr>
                  <th className="admin-th">Produit</th>
                  <th className="admin-th">Catégorie</th>
                  <th className="admin-th">Prix</th>
                  <th className="admin-th">Stock</th>
                  <th className="admin-th">Statut</th>
                  <th className="admin-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.products || []).map((product) => (
                  <tr key={product.id} className="border-b border-forest-900/5 last:border-0 hover:bg-forest-50/30">
                    <td className="admin-td">
                      <div className="flex items-center gap-3">
                        <img src={product.image} alt="" className="h-11 w-11 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="max-w-[260px] truncate font-medium">{product.name}</p>
                          <p className="text-[10px] text-ink/40">{product.sku} · {product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="admin-td text-xs text-ink/60">{product.category?.name || '—'}</td>
                    <td className="admin-td font-semibold">{formatCents(product.priceCents)}</td>
                    <td className="admin-td">
                      <span className={`text-xs font-semibold ${product.stock === 0 ? 'text-rose-600' : product.stock <= 10 ? 'text-amber-600' : 'text-forest-700'}`}>{product.stock}</span>
                    </td>
                    <td className="admin-td">
                      <div className="flex flex-wrap gap-1">
                        <StatusPill tone={product.isActive ? 'bg-forest-100 text-forest-800' : 'bg-stone-200 text-stone-600'}>{product.isActive ? 'Actif' : 'Archivé'}</StatusPill>
                        {product.isFeatured && <StatusPill tone="bg-ember-100 text-ember-800">Mis en avant</StatusPill>}
                      </div>
                    </td>
                    <td className="admin-td">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => toggleFeatured(product)} title="Mettre en avant" aria-label="Mettre en avant" className={`rounded-lg p-2 hover:bg-forest-50 ${product.isFeatured ? 'text-ember-600' : 'text-ink/35'}`}><Star className={`h-4 w-4 ${product.isFeatured ? 'fill-current' : ''}`} /></button>
                        <a href={`/produit/${product.slug}`} target="_blank" rel="noopener noreferrer" title="Voir la fiche" aria-label="Voir la fiche" className="rounded-lg p-2 text-ink/40 hover:bg-forest-50"><Eye className="h-4 w-4" /></a>
                        <button type="button" onClick={() => openEdit(product)} title="Modifier" aria-label="Modifier" className="rounded-lg p-2 text-forest-700 hover:bg-forest-50"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => remove(product)} title="Supprimer" aria-label="Supprimer" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data && data.products.length === 0 && <EmptyRow colSpan={6}>Aucun produit ne correspond à cette recherche.</EmptyRow>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.pagination && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink/45">{data.pagination.total} produit(s) · page {data.pagination.page}/{data.pagination.pages || 1}</p>
          <Pagination page={page} pages={data.pagination.pages || 1} onChange={setPage} />
        </div>
      )}

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nouveau produit' : 'Modifier le produit'}
        wide
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-outline btn-sm" onClick={() => setEditing(null)}>Annuler</button>
            <button type="submit" form="product-form" disabled={saving} className="btn-primary btn-sm">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        }
      >
        <form id="product-form" onSubmit={save} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label">Nom du produit *</label><input required minLength={3} value={form.name} onChange={set('name')} className="admin-input" placeholder="Bois de chauffage 33 cm — palette 2,7 stères" /></div>
            <div><label className="label">Slug (URL)</label><input value={form.slug} onChange={set('slug')} className="admin-input" placeholder="généré automatiquement" /></div>
            <div><label className="label">SKU</label><input value={form.sku} onChange={set('sku')} className="admin-input" placeholder="généré automatiquement" /></div>
            <div>
              <label className="label">Catégorie</label>
              <select value={form.categoryId} onChange={set('categoryId')} className="admin-input">
                <option value="">Sans catégorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="label">Unité</label><input value={form.unit} onChange={set('unit')} className="admin-input" placeholder="palette, ballot, stère…" /></div>
            <div><label className="label">Prix TTC (€) *</label><input required inputMode="decimal" value={form.price} onChange={set('price')} className="admin-input" placeholder="434,00" /></div>
            <div><label className="label">Prix barré (€)</label><input inputMode="decimal" value={form.compareAt} onChange={set('compareAt')} className="admin-input" placeholder="599,00" /></div>
            <div><label className="label">Stock</label><input type="number" min="0" value={form.stock} onChange={set('stock')} className="admin-input" /></div>
            <div><label className="label">Position d’affichage</label><input type="number" min="0" value={form.position} onChange={set('position')} className="admin-input" /></div>
            <div><label className="label">Longueur (cm)</label><input type="number" min="0" value={form.logLengthCm} onChange={set('logLengthCm')} className="admin-input" placeholder="33" /></div>
            <div><label className="label">Volume (m³)</label><input inputMode="decimal" value={form.volumeM3} onChange={set('volumeM3')} className="admin-input" placeholder="2.7" /></div>
            <div><label className="label">Essence</label><input value={form.woodType} onChange={set('woodType')} className="admin-input" /></div>
            <div><label className="label">Humidité</label><input value={form.moisture} onChange={set('moisture')} className="admin-input" /></div>
          </div>

          <div className="sm:col-span-2"><ImagePicker value={form.image} onChange={(v) => setForm((f) => ({ ...f, image: v }))} /></div>

          <div><label className="label">Description courte</label><textarea rows={2} maxLength={400} value={form.shortDescription} onChange={set('shortDescription')} className="admin-input" /></div>
          <div><label className="label">Description longue</label><textarea rows={6} value={form.description} onChange={set('description')} className="admin-input" placeholder="Séparez les paragraphes par une ligne vide." /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Galerie (une URL par ligne)</label><textarea rows={3} value={form.gallery} onChange={set('gallery')} className="admin-input" /></div>
            <div><label className="label">Badges (séparés par des virgules)</label><textarea rows={3} value={form.badges} onChange={set('badges')} className="admin-input" placeholder="Extra sec, Meilleure vente" /></div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">SEO — titre</label><input maxLength={70} value={form.seoTitle} onChange={set('seoTitle')} className="admin-input" placeholder="70 caractères max." /></div>
            <div><label className="label">SEO — description</label><input maxLength={180} value={form.seoDescription} onChange={set('seoDescription')} className="admin-input" placeholder="180 caractères max." /></div>
          </div>

          <div className="flex flex-wrap gap-4 rounded-xl bg-white p-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} className="h-4 w-4 rounded" /> Actif</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} className="h-4 w-4 rounded" /> Mis en avant</label>
            <label className="flex items-center gap-2">
              Livraison
              <select value={form.deliveryClass} onChange={set('deliveryClass')} className="admin-input !w-auto !py-1">
                <option value="classique">Classique</option>
                <option value="confort">Confort</option>
              </select>
            </label>
          </div>
        </form>
      </Drawer>

      <Drawer open={importOpen} onClose={() => { setImportOpen(false); setImportResult(null); }} title="Importer des produits (CSV)" wide footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={() => { setImportOpen(false); setImportResult(null); }}>Fermer</button>
          <button type="submit" form="import-form" disabled={importing || !csv.trim()} className="btn-primary btn-sm">{importing ? 'Import…' : 'Lancer l’import'}</button>
        </div>
      }>
        <form id="import-form" onSubmit={doImport} className="space-y-4">
          <div className="rounded-xl bg-forest-50 p-4 text-xs text-forest-900/70">
            <p className="font-semibold text-forest-900">Colonnes reconnues</p>
            <p className="mt-1 font-mono text-[10px] leading-relaxed">name, category, price, stock, unit, log_length_cm, volume_m3, short_description, description, image_url, sku, featured, position</p>
            <p className="mt-2">Le séparateur est détecté automatiquement (virgule ou point-virgule). Les produits au slug déjà existant sont ignorés.</p>
            <button type="button" className="mt-2 font-semibold text-forest-800 underline" onClick={() => setCsv(SAMPLE_CSV)}>Utiliser un exemple</button>
          </div>
          <div>
            <label className="label">Fichier CSV</label>
            <input type="file" accept=".csv,text/csv" onChange={(e) => readFile(e.target.files?.[0])} className="admin-input" />
          </div>
          <div>
            <label className="label">Ou collez le contenu</label>
            <textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} className="admin-input font-mono text-xs" placeholder={SAMPLE_CSV} />
          </div>
          {importResult && (
            <div className="space-y-2 text-xs">
              <p className="rounded-lg bg-forest-50 px-3 py-2 font-medium text-forest-800">{importResult.created?.length || 0} produit(s) importé(s)</p>
              {importResult.errors?.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-rose-50 p-3 text-rose-700">
                  {importResult.errors.map((err, i) => <li key={i}>Ligne {err.line} — {err.name} : {err.error}</li>)}
                </ul>
              )}
            </div>
          )}
        </form>
      </Drawer>

      {confirmElement}
    </AdminPage>
  );
}
