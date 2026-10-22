import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Mail, Package, ShoppingBag, Wallet } from 'lucide-react';
import Seo from '../../components/Seo';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { formatCents, formatDate, statusMeta } from '../../lib/format';
import { Spinner } from '../../components/ui';

export default function Dashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/account/orders?limit=4').then((res) => setOrders(res.orders || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const spent = orders
    .filter((o) => ['paid', 'in_production', 'shipped', 'delivered'].includes(o.status))
    .reduce((sum, o) => sum + o.totalCents, 0);

  return (
    <>
      <Seo title="Mon compte | EdyEco" robots="noindex, nofollow" />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-forest-900/8 bg-white p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-50 text-forest-700"><Package className="h-4 w-4" /></span>
            <p className="mt-3 font-display text-2xl font-bold">{orders.length}</p>
            <p className="text-xs text-ink/50">Commande{orders.length > 1 ? 's' : ''} récente{orders.length > 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-2xl border border-forest-900/8 bg-white p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-50 text-ember-700"><Wallet className="h-4 w-4" /></span>
            <p className="mt-3 font-display text-2xl font-bold">{formatCents(spent)}</p>
            <p className="text-xs text-ink/50">Total de vos commandes</p>
          </div>
          <div className="rounded-2xl border border-forest-900/8 bg-white p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-50 text-forest-700"><Mail className="h-4 w-4" /></span>
            <p className="mt-3 font-display text-lg font-semibold">{user?.emailOptIn ? 'Inscrit' : 'Non inscrit'}</p>
            <p className="text-xs text-ink/50">Newsletter conseils & offres</p>
          </div>
        </div>

        <div className="rounded-2xl border border-forest-900/8 bg-white">
          <div className="flex items-center justify-between border-b border-forest-900/8 px-5 py-4">
            <h2 className="font-display text-lg font-semibold">Dernières commandes</h2>
            <Link to="/compte/commandes" className="text-xs font-semibold text-forest-800 hover:underline">Tout voir</Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-forest-600" /></div>
          ) : orders.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-forest-300" />
              <p className="mt-3 text-sm font-medium">Vous n’avez pas encore passé commande.</p>
              <p className="mt-1 text-xs text-ink/50">Découvrez nos bois secs et nos granulés.</p>
              <Link to="/boutique" className="btn-primary btn-sm mt-4">Voir la boutique</Link>
            </div>
          ) : (
            <ul className="divide-y divide-forest-900/8">
              {orders.map((order) => {
                const meta = statusMeta(order.status);
                return (
                  <li key={order.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{order.reference}</p>
                      <p className="text-[11px] text-ink/45">{formatDate(order.createdAt)} · {order.items.length} article(s)</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${meta.tone}`}>{meta.label}</span>
                    <p className="text-sm font-semibold">{formatCents(order.totalCents)}</p>
                    <Link to="/compte/commandes" className="rounded-full border border-forest-900/15 p-2 text-forest-800 hover:bg-forest-50" aria-label={`Voir la commande ${order.reference}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-forest-950 p-5 text-white">
            <Flame className="h-6 w-6 text-ember-300" />
            <p className="mt-3 font-display text-lg font-semibold">Un doute sur votre bois ?</p>
            <p className="mt-1 text-xs text-white/60">Nos experts vous aident à choisir la longueur et le volume adaptés à votre appareil.</p>
            <Link to="/contact" className="btn-primary btn-sm mt-4">Demander conseil</Link>
          </div>
          <div className="rounded-2xl border border-forest-900/8 bg-white p-5">
            <p className="font-display text-lg font-semibold">Vos informations</p>
            <p className="mt-1 text-xs text-ink/50">{user?.firstName} {user?.lastName} · {user?.email}</p>
            <Link to="/compte/profil" className="btn-outline btn-sm mt-4">Modifier mes informations</Link>
          </div>
        </div>
      </div>
    </>
  );
}
