import { useState } from 'react';
import { Check, Star, Trash2, X } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, EmptyRow, ErrorBox, Loading, StatusPill, useAdminApi, useConfirm } from './ui';
import { Stars } from '../components/ui';
import { formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

export default function AdminReviews() {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const [filter, setFilter] = useState('pending');
  const { data, loading, error, reload } = useAdminApi(`/admin/reviews?status=${filter}`);

  const toggle = async (review, published) => {
    try {
      await api.patch(`/admin/reviews/${review.id}`, { isPublished: published });
      toast.success(published ? 'Avis publié.' : 'Avis masqué.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (review) => {
    const ok = await confirm({ title: 'Supprimer cet avis ?', message: 'Cette action est définitive.', confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await api.del(`/admin/reviews/${review.id}`);
      toast.success('Avis supprimé.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AdminPage title="Avis clients" description="Modérez les avis avant publication. Les avis publiés alimentent les étoiles et le balisage SEO.">
      <Seo title="Avis — Administration | EdyEco" robots="noindex, nofollow" />
      <div className="flex gap-1">
        {[['pending', 'En attente'], ['published', 'Publiés'], ['all', 'Tous']].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === value ? 'bg-forest-900 text-white' : 'bg-white text-ink/60 hover:bg-forest-50'}`}>{label}</button>
        ))}
      </div>
      <ErrorBox message={error} onRetry={reload} />
      <div className="space-y-3">
        {loading && !data && <Loading />}
        {(data?.reviews || []).map((review) => (
          <article key={review.id} className="rounded-2xl border border-forest-900/8 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{review.author_name}</p>
                  <Stars rating={review.rating} size={12} />
                  <StatusPill tone={review.is_published ? 'bg-forest-100 text-forest-800' : 'bg-amber-100 text-amber-800'}>{review.is_published ? 'Publié' : 'En attente'}</StatusPill>
                </div>
                <p className="mt-0.5 text-[10px] text-ink/40">{review.product_name} · {formatDate(review.created_at)}</p>
              </div>
              <div className="flex gap-1">
                {review.is_published ? (
                  <button type="button" onClick={() => toggle(review, false)} className="rounded-lg border border-forest-900/10 p-2 text-ink/50 hover:bg-forest-50" title="Masquer"><X className="h-4 w-4" /></button>
                ) : (
                  <button type="button" onClick={() => toggle(review, true)} className="rounded-lg border border-forest-900/10 p-2 text-forest-700 hover:bg-forest-50" title="Publier"><Check className="h-4 w-4" /></button>
                )}
                <button type="button" onClick={() => remove(review)} className="rounded-lg border border-forest-900/10 p-2 text-rose-600 hover:bg-rose-50" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            {review.title && <p className="mt-2 text-sm font-medium">{review.title}</p>}
            <p className="mt-1 text-sm leading-relaxed text-ink/65">{review.content}</p>
          </article>
        ))}
        {data && data.reviews.length === 0 && (
          <div className="rounded-2xl border border-forest-900/8 bg-white py-14 text-center text-sm text-ink/45">
            <Star className="mx-auto mb-2 h-6 w-6 text-forest-300" /> Aucun avis dans cette catégorie.
          </div>
        )}
      </div>
      {confirmElement}
    </AdminPage>
  );
}
