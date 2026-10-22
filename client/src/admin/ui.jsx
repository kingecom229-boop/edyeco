import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, Search, X } from 'lucide-react';
import api from '../lib/api';
import { Modal, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';

export function useAdminApi(path, { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState('');

  const reload = useCallback(
    async (nextPath = path) => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(nextPath);
        setData(res);
        return res;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [path]
  );

  useEffect(() => {
    if (immediate) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, immediate]);

  return { data, loading, error, reload, setData };
}

export function AdminPage({ title, description, actions, children }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-950">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink/55">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'forest' }) {
  const tones = {
    forest: 'bg-forest-50 text-forest-700',
    ember: 'bg-ember-50 text-ember-700',
    sky: 'bg-sky-50 text-sky-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="rounded-2xl border border-forest-900/8 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">{label}</p>
        {Icon && <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-4 w-4" /></span>}
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-forest-950">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-ink/45">{hint}</p>}
    </div>
  );
}

export function Loading({ label = 'Chargement…' }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-forest-900/8 bg-white py-16 text-sm text-ink/50">
      <Spinner className="h-5 w-5 text-forest-600" /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {message}</span>
      {onRetry && <button type="button" onClick={onRetry} className="rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold hover:bg-rose-100">Réessayer</button>}
    </div>
  );
}

export function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-ink/45">{children}</td>
    </tr>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher…', onSearch }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch?.();
      }}
      className="relative w-full sm:w-64"
    >
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="admin-input !pl-9" />
    </form>
  );
}

export function StatusPill({ children, tone = 'bg-stone-100 text-stone-700' }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{children}</span>;
}

export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (options) => new Promise((resolve) => setState({ ...options, resolve }));
  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };
  const element = (
    <Modal
      open={!!state}
      onClose={() => close(false)}
      title={state?.title || 'Confirmer l’action'}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={() => close(false)}>Annuler</button>
          <button type="button" className={`btn btn-sm ${state?.danger === false ? 'bg-forest-800 text-white' : 'bg-rose-600 text-white hover:bg-rose-700'}`} onClick={() => close(true)}>
            {state?.confirmLabel || 'Confirmer'}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-ink/70">{state?.message}</p>
    </Modal>
  );
  return { confirm, confirmElement: element };
}

export function centsToEuro(cents) {
  if (cents === null || cents === undefined || cents === '') return '';
  return (Number(cents) / 100).toFixed(2).replace('.', ',');
}

export function euroToCents(value) {
  const normalized = String(value ?? '').replace(/\s/g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

export function ImagePicker({ value, onChange, label = 'Image principale' }) {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api.get('/admin/media').then((res) => setMedia(res.media || [])).catch(() => {}).finally(() => setLoading(false));
  };

  const openPicker = () => {
    setOpen(true);
    if (!media.length) load();
  };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.upload('/admin/uploads', file);
      setMedia((m) => [res.url, ...m]);
      onChange(res.url);
      toast.success('Image téléversée.');
      setOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="h-16 w-16 rounded-xl border border-forest-900/10 object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-forest-900/20 text-ink/30"><ImagePlus className="h-5 w-5" /></span>
        )}
        <div className="flex-1">
          <input value={value || ''} onChange={(e) => onChange(e.target.value)} className="admin-input" placeholder="/products/palette-33.png" aria-label={label} />
          <div className="mt-1.5 flex items-center gap-3 text-[11px]">
            <button type="button" onClick={openPicker} className="font-semibold text-forest-700 hover:underline">Choisir dans la médiathèque</button>
            <label className="cursor-pointer font-semibold text-ember-700 hover:underline">
              Téléverser
              <input type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-forest-600" />}
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Médiathèque" size="lg">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {media.map((url) => (
              <button key={url} type="button" onClick={() => { onChange(url); setOpen(false); }} className={`group overflow-hidden rounded-xl border-2 bg-white ${value === url ? 'border-ember-500' : 'border-transparent hover:border-forest-300'}`}>
                <img src={url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                <span className="sr-only">Utiliser {url}</span>
              </button>
            ))}
            {!media.length && <p className="col-span-full py-8 text-center text-sm text-ink/45">Aucun média. Téléversez une image depuis le champ image.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[85] flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-forest-950/45 backdrop-blur-sm" aria-label="Fermer" onClick={onClose} />
      <div className={`relative flex h-full w-full flex-col bg-cream shadow-lift ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <div className="flex items-center justify-between border-b border-forest-900/10 px-5 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-2 hover:bg-forest-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-forest-900/10 bg-white/60 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function SuccessNote({ children }) {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-forest-50 px-3 py-2 text-xs font-medium text-forest-800">
      <CheckCircle2 className="h-4 w-4" /> {children}
    </p>
  );
}

export function MarkdownPreview({ text }) {
  return (
    <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-forest-900/10 bg-white p-4 text-xs leading-relaxed text-ink/70">
      {text || 'Rien à prévisualiser pour le moment.'}
    </div>
  );
}
