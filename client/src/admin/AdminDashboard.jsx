import { Link } from 'react-router-dom';
import { ArrowRight, BadgeEuro, Boxes, Mail, ShoppingCart, TrendingUp, Users, Wallet, AlertTriangle } from 'lucide-react';
import Seo from '../components/Seo';
import { AdminPage, ErrorBox, Loading, StatCard, StatusPill, useAdminApi } from './ui';
import { formatCents, formatDate, formatNumber, statusMeta } from '../lib/format';

function RevenueChart({ series = [] }) {
  const width = 720;
  const height = 220;
  const padding = { top: 16, right: 12, bottom: 26, left: 46 };
  const max = Math.max(1, ...series.map((s) => s.revenue_cents));
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const step = series.length > 1 ? innerW / (series.length - 1) : innerW;
  const points = series.map((s, i) => ({
    x: padding.left + i * step,
    y: padding.top + innerH - (s.revenue_cents / max) * innerH,
    ...s,
  }));
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1]?.x || padding.left},${padding.top + innerH} L${padding.left},${padding.top + innerH} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Évolution du chiffre d’affaires">
      <defs>
        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2791b" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f2791b" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t) => {
        const y = padding.top + innerH - t * innerH;
        return (
          <g key={t}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#143f27" strokeOpacity="0.08" strokeDasharray="3 4" />
            <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#5a6b5e">{Math.round((max * t) / 100)} €</text>
          </g>
        );
      })}
      {points.length > 0 && <path d={area} fill="url(#revenueFill)" />}
      {points.length > 0 && <path d={line} fill="none" stroke="#e05f0c" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => (
        <g key={p.date}>
          {p.revenue_cents > 0 && <circle cx={p.x} cy={p.y} r="2.6" fill="#e05f0c" />}
          {(i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0) && (
            <text x={p.x} y={height - 8} textAnchor="middle" fontSize="9" fill="#5a6b5e">{p.date.slice(5).split('-').reverse().join('/')}</text>
          )}
          <title>{`${p.date} — ${formatCents(p.revenue_cents)} · ${p.orders} commande(s)`}</title>
        </g>
      ))}
    </svg>
  );
}

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAdminApi('/admin/stats?days=30');

  if (loading && !data) return <Loading label="Chargement du tableau de bord…" />;
  if (error) return <ErrorBox message={error} onRetry={() => reload()} />;
  if (!data) return null;

  const { kpi, series, topProducts, recentOrders, lowStock } = data;
  const maxTop = Math.max(1, ...topProducts.map((p) => p.revenue_cents));

  return (
    <AdminPage
      title="Tableau de bord"
      description="Vue d’ensemble de la boutique sur les 30 derniers jours."
      actions={
        <>
          <Link to="/admin/produits" className="btn-outline btn-sm">Gérer les produits</Link>
          <Link to="/admin/commandes" className="btn-primary btn-sm">Voir les commandes</Link>
        </>
      }
    >
      <Seo title="Administration — Tableau de bord | EdyEco" robots="noindex, nofollow" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Chiffre d’affaires (30 j)" value={formatCents(kpi.revenuePeriodCents)} hint={`${formatCents(kpi.revenueCents)} depuis le début`} icon={Wallet} tone="ember" />
        <StatCard label="Commandes payées (30 j)" value={formatNumber(kpi.ordersPeriod)} hint={`${kpi.paidOrders} au total · ${kpi.pendingOrders} en attente`} icon={ShoppingCart} />
        <StatCard label="Panier moyen" value={formatCents(kpi.aovCents)} hint="Commandes payées, toutes périodes" icon={TrendingUp} tone="sky" />
        <StatCard label="Paniers abandonnés" value={formatNumber(kpi.abandonedCarts)} hint={`${formatCents(kpi.abandonedValueCents)} de panier potentiel`} icon={AlertTriangle} tone="rose" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clients" value={formatNumber(kpi.customersTotal)} hint={`${kpi.customersRecent} nouveaux sur 30 j`} icon={Users} />
        <StatCard label="Abonnés newsletter" value={formatNumber(kpi.subscribersActive)} hint={`${kpi.subscribersTotal} inscrits au total`} icon={Mail} />
        <StatCard label="Conversion" value={kpi.conversionRate === null ? '—' : `${String(kpi.conversionRate).replace('.', ',')} %`} hint="Commandes / visites mesurées" icon={BadgeEuro} />
        <StatCard label="Références actives" value={formatNumber(kpi.productsActive ?? 0)} hint={`${kpi.productsLow ?? 0} produit(s) en stock faible`} icon={Boxes} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-forest-900/8 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold">Chiffre d’affaires</h2>
              <p className="text-[11px] text-ink/45">30 derniers jours, commandes payées</p>
            </div>
            <span className="rounded-full bg-ember-50 px-3 py-1 text-[10px] font-bold text-ember-700">{formatCents(kpi.revenuePeriodCents)}</span>
          </div>
          <div className="mt-4">
            <RevenueChart series={series} />
          </div>
        </div>

        <div className="rounded-2xl border border-forest-900/8 bg-white p-5">
          <h2 className="font-display text-base font-semibold">Meilleures ventes</h2>
          <p className="text-[11px] text-ink/45">Sur 30 jours, par chiffre d’affaires</p>
          <ul className="mt-4 space-y-3">
            {topProducts.length === 0 && <li className="text-xs text-ink/40">Aucune vente sur la période.</li>}
            {topProducts.map((p) => (
              <li key={p.slug}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <Link to={`/produit/${p.slug}`} target="_blank" className="truncate font-medium hover:text-forest-700">{p.name}</Link>
                  <span className="shrink-0 font-semibold">{formatCents(p.revenue_cents)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-forest-50">
                    <div className="h-full rounded-full bg-ember-400" style={{ width: `${(p.revenue_cents / maxTop) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-ink/40">{p.quantity} u.</span>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/admin/produits" className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700">Gérer le catalogue <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-forest-900/8 bg-white">
          <div className="flex items-center justify-between border-b border-forest-900/8 px-5 py-4">
            <h2 className="font-display text-base font-semibold">Commandes récentes</h2>
            <Link to="/admin/commandes" className="text-[11px] font-semibold text-forest-700 hover:underline">Tout voir</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead><tr className="border-b border-forest-900/8"><th className="admin-th">Référence</th><th className="admin-th">Client</th><th className="admin-th">Statut</th><th className="admin-th text-right">Total</th></tr></thead>
              <tbody>
                {recentOrders.map((order) => {
                  const meta = statusMeta(order.status);
                  return (
                    <tr key={order.id} className="border-b border-forest-900/5 last:border-0">
                      <td className="admin-td font-medium">{order.reference}<span className="block text-[10px] font-normal text-ink/40">{formatDate(order.created_at)}</span></td>
                      <td className="admin-td">{order.customer_name}</td>
                      <td className="admin-td"><StatusPill tone={meta.tone}>{meta.label}</StatusPill></td>
                      <td className="admin-td text-right font-semibold">{formatCents(order.total_cents)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-forest-900/8 bg-white p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold"><AlertTriangle className="h-4 w-4 text-ember-600" /> Stock faible</h2>
            <ul className="mt-3 space-y-2">
              {lowStock.length === 0 && <li className="text-xs text-ink/40">Tous les stocks sont confortables.</li>}
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <img src={p.image_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 truncate text-xs">{p.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>{p.stock}</span>
                </li>
              ))}
            </ul>
            <Link to="/admin/produits?status=low" className="mt-3 inline-flex text-[11px] font-semibold text-forest-700 hover:underline">Réapprovisionner</Link>
          </div>
          <div className="rounded-2xl bg-forest-950 p-5 text-white">
            <p className="font-display text-base font-semibold">Paniers abandonnés</p>
            <p className="mt-1 text-2xl font-bold text-ember-300">{kpi.abandonedCarts}</p>
            <p className="mt-0.5 text-[11px] text-white/55">{formatCents(kpi.abandonedValueCents)} de valeur récupérable</p>
            <Link to="/admin/paniers" className="btn-primary btn-sm mt-3">Relancer les paniers</Link>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
