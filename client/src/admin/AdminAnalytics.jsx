import { useState } from 'react';
import { Activity, Eye, MousePointerClick, TrendingUp } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, ErrorBox, Loading, StatCard, useAdminApi } from './ui';
import { formatNumber } from '../lib/format';

const LABELS = {
  page_view: 'Pages vues',
  add_to_cart: 'Ajouts au panier',
  begin_checkout: 'Début de commande',
  purchase: 'Achats',
  search: 'Recherches',
  newsletter_signup: 'Inscriptions newsletter',
  contact_submit: 'Messages contact',
  review_submit: 'Avis déposés',
  product_view: 'Fiches produit',
  cta_click: 'Clics sur boutons',
};

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useAdminApi(`/admin/analytics?days=${days}`);

  const daily = data?.daily || [];
  const max = Math.max(1, ...daily.map((d) => d.count));
  const width = 640;
  const height = 180;
  const step = daily.length > 1 ? width / (daily.length - 1) : width;
  const points = daily.map((d, i) => `${i * step},${height - (d.count / max) * (height - 24) - 8}`).join(' ');
  const totalViews = daily.reduce((sum, d) => sum + d.count, 0);
  const events = (data?.byName || []).reduce((sum, e) => sum + e.count, 0);
  const purchases = (data?.byName || []).find((e) => e.name === 'purchase')?.count || 0;
  const carts = (data?.byName || []).find((e) => e.name === 'add_to_cart')?.count || 0;

  return (
    <AdminPage title="Mesure d’audience" description="Statistiques respectueuses de la vie privée, collectées côté serveur sans cookie publicitaire." actions={
      <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="admin-input h-9 w-auto text-xs">
        <option value={7}>7 derniers jours</option>
        <option value={30}>30 derniers jours</option>
        <option value={90}>90 derniers jours</option>
        <option value={365}>12 mois</option>
      </select>
    }>
      <Seo title="Analytics — Administration | EdyEco" robots="noindex, nofollow" />
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data ? <Loading /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Pages vues" value={formatNumber(totalViews)} icon={Eye} tone="forest" />
            <StatCard label="Événements" value={formatNumber(events)} icon={Activity} tone="ember" />
            <StatCard label="Ajouts au panier" value={formatNumber(carts)} icon={MousePointerClick} tone="forest" />
            <StatCard label="Achats" value={formatNumber(purchases)} icon={TrendingUp} tone="ember" hint={carts ? `${Math.round((purchases / carts) * 100)} % de conversion panier` : undefined} />
          </div>

          <div className="rounded-2xl border border-forest-900/8 bg-white p-5">
            <h2 className="text-sm font-semibold">Trafic quotidien</h2>
            {daily.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink/45">Aucune donnée sur la période. Les événements apparaissent dès les premières visites.</p>
            ) : (
              <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-48 w-full" role="img" aria-label="Courbe du trafic quotidien">
                <defs>
                  <linearGradient id="traffic-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#237843" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#237843" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#traffic-fill)" />
                <polyline points={points} fill="none" stroke="#237843" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            )}
            <div className="mt-2 flex justify-between text-[10px] text-ink/40">
              <span>{daily[0]?.date}</span>
              <span>{daily[daily.length - 1]?.date}</span>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-forest-900/8 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold">Événements</h2>
              <ul className="space-y-2">
                {(data?.byName || []).map((e) => {
                  const maxEvent = Math.max(...(data?.byName || [{ count: 1 }]).map((x) => x.count));
                  return (
                    <li key={e.name}>
                      <div className="flex justify-between text-xs"><span>{LABELS[e.name] || e.name}</span><span className="font-medium">{formatNumber(e.count)}</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream"><div className="h-full rounded-full bg-forest-500" style={{ width: `${Math.max(3, (e.count / maxEvent) * 100)}%` }} /></div>
                    </li>
                  );
                })}
                {(data?.byName || []).length === 0 && <li className="text-xs text-ink/40">Aucun événement.</li>}
              </ul>
            </div>
            <div className="rounded-2xl border border-forest-900/8 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold">Pages les plus visitées</h2>
              <ol className="space-y-2">
                {(data?.topPages || []).map((p, i) => (
                  <li key={p.path} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate"><span className="mr-2 text-ink/30">{String(i + 1).padStart(2, '0')}</span>{p.path}</span>
                    <span className="shrink-0 font-medium">{formatNumber(p.count)}</span>
                  </li>
                ))}
                {(data?.topPages || []).length === 0 && <li className="text-xs text-ink/40">Aucune page enregistrée.</li>}
              </ol>
            </div>
          </div>
        </>
      )}
    </AdminPage>
  );
}
