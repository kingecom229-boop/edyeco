import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, Droplets, Flame, Loader2, Package, Ruler, ShieldCheck, ShoppingBag, Star, Truck,
} from 'lucide-react';
import api from '../lib/api';
import { formatCents, formatDate, deliveryEstimate } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { QuantityStepper, Stars, SectionHeading, Checkbox } from '../components/ui';
import ProductCard from '../components/marketing/ProductCard';
import Seo from '../components/Seo';
import { track } from '../lib/analytics';

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, loading: cartLoading } = useCart();
  const { postalCode, deliveryOptions } = useStore();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [tab, setTab] = useState('description');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    api
      .get(`/products/${slug}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setActiveImage(0);
        setQuantity(1);
        track('product_view', { slug });
      })
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const product = data?.product;
  const images = useMemo(() => (product ? [product.image, ...(product.gallery || [])].filter(Boolean) : []), [product]);
  const estimate = deliveryEstimate(postalCode);
  const deliveryFee = product && product.priceCents >= (deliveryOptions.freeAboveCents || 0)
    ? 0
    : deliveryOptions.classique?.fee_cents ?? 4900;

  const add = async (goToCheckout = false) => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, quantity, { openDrawer: !goToCheckout });
      if (goToCheckout) navigate('/commande');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-3xl bg-white" />
          <div className="space-y-4">
            <div className="h-4 w-32 animate-pulse rounded bg-white" />
            <div className="h-10 w-4/5 animate-pulse rounded bg-white" />
            <div className="h-4 w-full animate-pulse rounded bg-white" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-white" />
            <div className="h-12 w-40 animate-pulse rounded bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <Package className="h-12 w-12 text-forest-300" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Produit introuvable</h1>
        <p className="mt-2 text-sm text-ink/60">Cette référence a peut-être été archivée. Découvrez le reste de notre gamme.</p>
        <Link to="/boutique" className="btn-primary mt-6"><ArrowLeft className="h-4 w-4" /> Retour à la boutique</Link>
      </div>
    );
  }

  const paragraphs = product.description?.split(/\n{2,}/).filter(Boolean) || [];
  const specs = [
    ['Essence', product.woodType],
    ['Humidité', product.moisture],
    ['Longueur des bûches', product.logLengthCm ? `${product.logLengthCm} cm` : null],
    ['Volume', product.volumeM3 ? `${String(product.volumeM3).replace('.', ',')} m³` : null],
    ['Conditionnement', product.unit],
    ['Référence', product.sku],
  ].filter(([, value]) => value);

  return (
    <>
      <Seo title={product.seo.title || `${product.name} | EdyEco`} description={product.seo.description || product.shortDescription} image={product.image} type="product" />

      <div className="border-b border-forest-900/8 bg-white/60">
        <nav aria-label="Fil d’Ariane" className="container-page flex flex-wrap items-center gap-1.5 py-3 text-[11px] text-ink/50">
          <Link to="/" className="hover:text-forest-800">Accueil</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/boutique" className="hover:text-forest-800">Boutique</Link>
          {product.category && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to={`/categorie/${product.category.slug}`} className="hover:text-forest-800">{product.category.name}</Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="max-w-[200px] truncate text-ink/80 sm:max-w-none">{product.name}</span>
        </nav>
      </div>

      <section className="container-page py-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div>
            <div className="overflow-hidden rounded-3xl border border-forest-900/8 bg-[#f3eee2]">
              <img
                src={images[activeImage]}
                alt={`${product.name} — ${product.woodType}, ${product.moisture}`}
                className="aspect-square w-full object-cover"
                width="900"
                height="900"
                fetchPriority="high"
              />
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
                {images.map((img, i) => (
                  <button
                    key={img + i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`Voir l’image ${i + 1}`}
                    aria-current={activeImage === i}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${activeImage === i ? 'border-ember-500' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: Droplets, label: product.moisture },
                { icon: ShieldCheck, label: 'Bois contrôlé' },
                { icon: Truck, label: 'Livraison à domicile' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-forest-900/8 bg-white px-2 py-3">
                  <item.icon className="mx-auto h-4 w-4 text-forest-600" />
                  <p className="mt-1.5 text-[10px] font-medium text-ink/60">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {product.category && <Link to={`/categorie/${product.category.slug}`} className="tag">{product.category.name}</Link>}
              {product.badges?.map((badge) => <span key={badge} className="tag !bg-ember-50 !text-ember-800">{badge}</span>)}
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-forest-950 sm:text-4xl">{product.name}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {product.rating ? (
                <span className="flex items-center gap-2"><Stars rating={product.rating} size={15} /><span className="text-xs text-ink/55">{product.rating}/5 · {product.reviewCount} avis</span></span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-ink/55"><Star className="h-3.5 w-3.5 text-ember-500" /> Nouveau produit</span>
              )}
              <span className="text-xs text-ink/35">|</span>
              <span className="text-xs text-ink/55">Réf. {product.sku}</span>
            </div>

            <p className="mt-4 text-[15px] leading-relaxed text-ink/70">{product.shortDescription}</p>

            <div className="mt-6 flex flex-wrap items-end gap-3">
              <p className="font-display text-3xl font-bold text-forest-900">{formatCents(product.priceCents)}</p>
              {product.compareAtCents && <p className="pb-1 text-sm text-ink/40 line-through">{formatCents(product.compareAtCents)}</p>}
              <span className="pb-1 text-xs text-ink/45">TTC · {product.unit}</span>
            </div>
            <p className="mt-1 text-xs text-ink/50">Paiement en 3× sans frais dès 300 € · Livraison offerte dès {formatCents(deliveryOptions.freeAboveCents || 150000)}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, product.stock)} />
              <button type="button" onClick={() => add(false)} disabled={adding || cartLoading || product.stock <= 0} className="btn-primary flex-1 sm:flex-none">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                {product.stock <= 0 ? 'Produit épuisé' : 'Ajouter au panier'}
              </button>
              <button type="button" onClick={() => add(true)} disabled={adding || cartLoading || product.stock <= 0} className="btn-secondary">
                Commander
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs">
              {product.stock > 0 ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span className="font-medium text-forest-700">En stock</span>
                  <span className="text-ink/45">— {product.stock} {product.unit}{product.stock > 1 ? 's' : ''} disponibles</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-amber-700">Réapprovisionnement en cours — contactez-nous.</span>
                </>
              )}
            </div>

            <div className="mt-6 space-y-3 rounded-2xl border border-forest-900/8 bg-white p-4">
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-ember-600" />
                <div className="text-xs">
                  <p className="font-semibold text-forest-950">Livraison classique dès {formatCents(deliveryFee)}</p>
                  <p className="text-ink/55">{estimate ? `${estimate.label} — ${estimate.detail}` : '5 à 8 jours ouvrés · dépose au pied du camion'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-ember-600" />
                <div className="text-xs">
                  <p className="font-semibold text-forest-950">Retrait entrepôt gratuit</p>
                  <p className="text-ink/55">Soulac-sur-Mer · sur rendez-vous sous 48 h</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ember-600" />
                <div className="text-xs">
                  <p className="font-semibold text-forest-950">Satisfait ou échange</p>
                  <p className="text-ink/55">Bois non conforme ? Nous intervenons sous 7 jours.</p>
                </div>
              </div>
            </div>

            <ul className="mt-5 grid grid-cols-2 gap-2 text-[11px] text-ink/60">
              {['Bois séché naturellement', 'Vente directe producteur', 'Paiement sécurisé', 'Facture disponible'].map((point) => (
                <li key={point} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-forest-600" /> {point}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page pb-12">
        <div className="rounded-3xl border border-forest-900/8 bg-white">
          <div className="flex overflow-x-auto border-b border-forest-900/8 px-4 no-scrollbar" role="tablist" aria-label="Informations produit">
            {[
              ['description', 'Description'],
              ['specs', 'Caractéristiques'],
              ['delivery', 'Livraison'],
              ['reviews', `Avis${product.reviewCount ? ` (${product.reviewCount})` : ''}`],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`whitespace-nowrap border-b-2 px-4 py-4 text-sm font-semibold transition ${tab === id ? 'border-ember-500 text-forest-950' : 'border-transparent text-ink/50 hover:text-forest-800'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="p-6 sm:p-8">
            {tab === 'description' && (
              <div className="prose-edyeco max-w-3xl">
                {paragraphs.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
                <h2>Pourquoi choisir ce conditionnement ?</h2>
                <p>
                  Ce produit est préparé sur palette ou en ballot, cerclé et filmé pour résister au transport.
                  Il se stocke à l’abri de la pluie, sur une surface plane, sans contact direct avec le sol.
                  Pour préserver sa qualité, laissez circuler l’air autour de la palette.
                </p>
                <ul>
                  <li>Bois issu de forêts françaises gérées durablement</li>
                  <li>Séchage contrôlé et taux d’humidité vérifié avant expédition</li>
                  <li>Livraison en France métropolitaine, retrait possible à l’entrepôt</li>
                </ul>
              </div>
            )}
            {tab === 'specs' && (
              <div className="max-w-2xl overflow-hidden rounded-2xl border border-forest-900/10">
                <table className="w-full text-sm">
                  <tbody>
                    {specs.map(([label, value], i) => (
                      <tr key={label} className={i % 2 ? 'bg-white' : 'bg-forest-50/40'}>
                        <th scope="row" className="w-1/2 px-4 py-3 text-left font-medium text-ink/60">{label}</th>
                        <td className="px-4 py-3 font-medium text-forest-950">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tab === 'delivery' && (
              <div className="max-w-3xl space-y-4">
                <div className="rounded-2xl bg-forest-50 p-5">
                  <h2 className="font-display text-lg font-semibold text-forest-950">Deux options de livraison</h2>
                  <p className="mt-2 text-sm text-ink/65">
                    <strong>Classique</strong> : camion porteur de 19 tonnes, dépose au pied du camion. {formatCents(deliveryOptions.classique?.fee_cents ?? 4900)}.
                  </p>
                  <p className="mt-2 text-sm text-ink/65">
                    <strong>Confort</strong> : camion de 44 tonnes avec chariot élévateur embarqué, palette posée dans votre propriété. {formatCents(deliveryOptions.confort?.fee_cents ?? 8900)}.
                  </p>
                  <p className="mt-3 text-xs text-ink/50">Livraison offerte dès {formatCents(deliveryOptions.freeAboveCents || 150000)} d’achat. Retrait entrepôt gratuit sur rendez-vous.</p>
                </div>
                <p className="text-sm leading-relaxed text-ink/65">
                  Le transporteur vous contacte sous 10 jours pour valider l’accès et fixer la date. Deux jours avant,
                  vous recevez une confirmation avec une tranche horaire. Le jour J, le chauffeur vous prévient de son arrivée.
                </p>
                <Link to="/livraison" className="link-underline inline-flex text-sm">Toutes les conditions de livraison</Link>
              </div>
            )}
            {tab === 'reviews' && <ReviewsTab product={product} reviews={data.reviews || []} onSubmitted={() => setTab('reviews')} />}
          </div>
        </div>
      </section>

      {data.related?.length > 0 && (
        <section className="container-page pb-20">
          <SectionHeading eyebrow="Compléter votre chauffage" title="Ces produits peuvent vous intéresser" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      <div className="sticky bottom-0 z-30 border-t border-forest-900/10 bg-cream/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-ink/60">{product.name}</p>
            <p className="font-display text-lg font-bold text-forest-900">{formatCents(product.priceCents)}</p>
          </div>
          <button type="button" onClick={() => add(false)} disabled={adding || product.stock <= 0} className="btn-primary btn-sm">
            <ShoppingBag className="h-4 w-4" /> Ajouter
          </button>
        </div>
      </div>
    </>
  );
}

function ReviewsTab({ product, reviews, onSubmitted }) {
  const toast = useToast();
  const [form, setForm] = useState({ authorName: '', rating: 5, title: '', content: '' });
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('Merci de confirmer que votre avis est authentique.');
      return;
    }
    if (form.content.trim().length < 10) {
      setError('Votre avis doit contenir au moins 10 caractères.');
      return;
    }
    setSending(true);
    try {
      await api.post(`/products/${product.id}/reviews`, { ...form, rating: Number(form.rating) });
      setDone(true);
      toast.success('Merci ! Votre avis sera publié après vérification.');
      onSubmitted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="flex items-center gap-4">
          <p className="font-display text-4xl font-bold text-forest-900">{product.rating || '—'}<span className="text-lg text-ink/40">/5</span></p>
          <div>
            <Stars rating={product.rating || 0} size={18} />
            <p className="mt-1 text-xs text-ink/50">{product.reviewCount} avis vérifié{product.reviewCount > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {reviews.length === 0 && <p className="text-sm text-ink/55">Soyez le premier à partager votre expérience sur ce produit.</p>}
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-forest-900/8 bg-cream/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-800">{review.author_name.slice(0, 1)}</span>
                  <div>
                    <p className="text-sm font-semibold">{review.author_name}</p>
                    <p className="text-[10px] text-ink/45">{formatDate(review.created_at)} · Achat vérifié</p>
                  </div>
                </div>
                <Stars rating={review.rating} size={13} />
              </div>
              {review.title && <p className="mt-3 text-sm font-semibold text-forest-950">{review.title}</p>}
              <p className="mt-1 text-sm leading-relaxed text-ink/65">{review.content}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-forest-900/8 bg-forest-50/50 p-5">
        <h3 className="font-display text-lg font-semibold">Laisser un avis</h3>
        {done ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-white p-4 text-sm text-forest-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-forest-600" />
            <p>Merci pour votre retour ! Il sera publié après vérification par notre équipe.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="review-name">Votre nom</label>
              <input id="review-name" required minLength={2} maxLength={80} value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} className="field" placeholder="Camille L." />
            </div>
            <div>
              <span className="label">Votre note</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} étoile${n > 1 ? 's' : ''}`} aria-pressed={form.rating === n} className="rounded p-1">
                    <Star className={`h-6 w-6 ${n <= form.rating ? 'fill-ember-400 text-ember-400' : 'text-forest-900/20'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="review-title">Titre (optionnel)</label>
              <input id="review-title" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="field" placeholder="Bois impeccable" />
            </div>
            <div>
              <label className="label" htmlFor="review-content">Votre expérience</label>
              <textarea id="review-content" required minLength={10} maxLength={2000} rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="field" placeholder="Qualité du bois, livraison, combustion…" />
            </div>
            <Checkbox label="Mon avis est authentique et je n’ai pas été rémunéré." checked={consent} onChange={setConsent} />
            {error && <p className="text-xs font-medium text-rose-600" role="alert">{error}</p>}
            <button type="submit" disabled={sending} className="btn-secondary w-full">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Publier mon avis
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
