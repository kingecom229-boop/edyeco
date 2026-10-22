import { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, Loader2, Star, X } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function Badge({ children, tone = 'forest', className = '' }) {
  const tones = {
    forest: 'bg-forest-50 text-forest-800 border-forest-200',
    ember: 'bg-ember-50 text-ember-800 border-ember-200',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone] || tones.forest} ${className}`}>
      {children}
    </span>
  );
}

export function Stars({ rating = 0, count, size = 16, className = '' }) {
  const rounded = Math.round(Number(rating) * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-label={`Note ${rating} sur 5${count ? `, ${count} avis` : ''}`}>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={i <= rounded ? 'fill-ember-400 text-ember-400' : i - 0.5 === rounded ? 'fill-ember-200 text-ember-400' : 'fill-transparent text-forest-900/25'}
          />
        ))}
      </span>
      {count !== undefined && <span className="text-xs font-medium text-ink/60">({count})</span>}
    </span>
  );
}

export function Field({ label, error, hint, required, children, htmlFor }) {
  return (
    <div>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label} {required && <span className="text-ember-600">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink/50">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ error, className = '', ...props }) {
  return <input {...props} className={`field ${error ? 'input-error' : ''} ${className}`} aria-invalid={error ? 'true' : undefined} />;
}

export function Textarea({ error, className = '', ...props }) {
  return <textarea {...props} className={`field min-h-[120px] ${error ? 'input-error' : ''} ${className}`} />;
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select {...props} className={`field appearance-none pr-10 ${error ? 'input-error' : ''} ${className}`}>
      {children}
    </select>
  );
}

export function Checkbox({ label, description, checked, onChange, id, required }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <label htmlFor={inputId} className="flex cursor-pointer items-start gap-3 text-sm text-ink/80">
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-forest-900/30 text-forest-700 focus:ring-forest-600"
      />
      <span>
        <span className="font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink/55">{description}</span>}
      </span>
    </label>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 50, disabled = false, size = 'md' }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const btn = size === 'sm' ? 'h-8 w-8 text-base' : 'h-10 w-10 text-lg';
  return (
    <div className="inline-flex items-center rounded-full border border-forest-900/15 bg-white">
      <button type="button" onClick={dec} disabled={disabled || value <= min} aria-label="Diminuer la quantité" className={`${btn} rounded-l-full text-forest-800 transition hover:bg-forest-50 disabled:opacity-30`}>
        −
      </button>
      <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">{value}</span>
      <button type="button" onClick={inc} disabled={disabled || value >= max} aria-label="Augmenter la quantité" className={`${btn} rounded-r-full text-forest-800 transition hover:bg-forest-50 disabled:opacity-30`}>
        +
      </button>
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <motion.button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-forest-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={`relative flex max-h-[92vh] w-full ${widths[size]} flex-col overflow-hidden rounded-t-3xl bg-cream shadow-lift sm:rounded-3xl`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-forest-900/10 px-6 py-4">
              <h2 id={titleId} className="font-display text-lg font-semibold">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Fermer la fenêtre" className="rounded-full p-2 text-ink/60 hover:bg-forest-50 hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="border-t border-forest-900/10 bg-white/60 px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Accordion({ items, className = '', defaultOpen = -1 }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`divide-y divide-forest-900/10 ${className}`}>
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <div key={item.id || item.question || index}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : index)}
              aria-expanded={isOpen}
              className="flex w-full items-start justify-between gap-4 py-5 text-left"
            >
              <span className="font-display text-base font-semibold text-forest-950">{item.question}</span>
              <ChevronDown className={`mt-0.5 h-5 w-5 shrink-0 text-ember-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <p className="pb-5 pr-8 text-sm leading-relaxed text-ink/70">{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-forest-900/15 bg-white/50 px-6 py-16 text-center">
      {Icon && <Icon className="mb-4 h-10 w-10 text-forest-400" aria-hidden="true" />}
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-ink/60">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const list = [];
  const start = Math.max(1, page - 1);
  const end = Math.min(pages, start + 2);
  for (let i = start; i <= end; i++) list.push(i);
  return (
    <nav className="flex items-center justify-center gap-2 pt-10" aria-label="Pagination">
      <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Précédent
      </button>
      {list.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={p === page ? 'btn-secondary btn-sm h-9 w-9 !p-0' : 'btn-outline btn-sm h-9 w-9 !p-0'}
        >
          {p}
        </button>
      ))}
      <button type="button" className="btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Suivant
      </button>
    </nav>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Fil d’Ariane" className="flex flex-wrap items-center gap-2 text-xs text-white/70">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true">/</span>}
          {item.href ? (
            <Link to={item.href} className="transition hover:text-white">{item.label}</Link>
          ) : (
            <span className="font-medium text-white" aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SectionHeading({ eyebrow, title, description, align = 'left', light = false, action }) {
  return (
    <div className={`flex flex-col gap-4 ${align === 'center' ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'}`}>
      <div className={align === 'center' ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && <p className={`eyebrow ${light ? '!text-ember-300' : ''}`}>{eyebrow}</p>}
        <h2 className={`mt-3 font-display text-3xl font-semibold sm:text-4xl ${light ? 'text-white' : 'text-forest-950'}`}>{title}</h2>
        {description && <p className={`mt-3 text-[15px] leading-relaxed ${light ? 'text-white/70' : 'text-ink/65'}`}>{description}</p>}
      </div>
      {action}
    </div>
  );
}
