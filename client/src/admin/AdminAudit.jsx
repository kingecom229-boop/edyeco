import Seo from '../components/Seo';
import { AdminPage, ErrorBox, Loading, StatusPill, useAdminApi } from './ui';
import { formatDateTime } from '../lib/format';

const ACTION_LABELS = {
  'product.create': 'Création produit', 'product.update': 'Modification produit', 'product.delete': 'Suppression produit',
  'category.create': 'Création catégorie', 'category.update': 'Modification catégorie', 'category.delete': 'Suppression catégorie',
  'order.update': 'Mise à jour commande', 'blog.create': 'Création article', 'blog.update': 'Modification article',
  'blog.delete': 'Suppression article', 'faq.create': 'Création FAQ', 'faq.update': 'Modification FAQ',
  'faq.delete': 'Suppression FAQ', 'review.moderate': 'Modération avis', 'discount.create': 'Création code promo',
  'settings.update': 'Modification réglages', 'campaign.send': 'Envoi campagne', 'cart.recover': 'Relance panier',
  'user.login': 'Connexion', 'user.login_failed': 'Connexion échouée', 'auth.login': 'Connexion administrateur',
  'admin.login': 'Connexion administrateur', 'products.import': 'Import produits',
};

const TONE = (action) => {
  if (/delete|failed/.test(action)) return 'bg-rose-100 text-rose-700';
  if (/create|import/.test(action)) return 'bg-forest-100 text-forest-800';
  if (/update|moderate|send|recover/.test(action)) return 'bg-amber-100 text-amber-800';
  return 'bg-stone-100 text-stone-600';
};

export default function AdminAudit() {
  const { data, loading, error, reload } = useAdminApi('/admin/audit?limit=100');

  return (
    <AdminPage title="Journal d’audit" description="Traçabilité des actions sensibles : produits, commandes, contenus, réglages et connexions administratives.">
      <Seo title="Journal — Administration | EdyEco" robots="noindex, nofollow" />
      <ErrorBox message={error} onRetry={reload} />
      <div className="overflow-hidden rounded-2xl border border-forest-900/8 bg-white">
        {loading && !data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-forest-900/8 bg-cream/40"><tr><th className="admin-th">Date</th><th className="admin-th">Action</th><th className="admin-th">Cible</th><th className="admin-th">Auteur</th><th className="admin-th">IP</th></tr></thead>
              <tbody>
                {(data?.entries || []).map((entry) => (
                  <tr key={entry.id} className="border-b border-forest-900/5 last:border-0">
                    <td className="admin-td whitespace-nowrap text-[11px] text-ink/50">{formatDateTime(entry.created_at)}</td>
                    <td className="admin-td"><StatusPill tone={TONE(entry.action)}>{ACTION_LABELS[entry.action] || entry.action}</StatusPill></td>
                    <td className="admin-td text-xs text-ink/60">{entry.target_type || '—'}{entry.target_id ? ` #${entry.target_id}` : ''}</td>
                    <td className="admin-td text-xs">{entry.email || '—'}</td>
                    <td className="admin-td font-mono text-[10px] text-ink/40">{entry.ip || '—'}</td>
                  </tr>
                ))}
                {data && data.entries.length === 0 && <tr><td colSpan={5} className="py-14 text-center text-sm text-ink/45">Journal vide.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[11px] text-ink/40">Le journal est en lecture seule : aucune entrée ne peut être modifiée ou supprimée depuis l’interface.</p>
    </AdminPage>
  );
}
