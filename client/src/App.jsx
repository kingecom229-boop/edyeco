import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { StoreProvider } from './context/StoreContext';
import { CartProvider } from './context/CartContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/layout/CartDrawer';
import FloatingElements from './components/layout/FloatingElements';
import { Spinner } from './components/ui';

/* Public pages — each one is code-split so the first paint stays light. */
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const Product = lazy(() => import('./pages/Product'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Payment = lazy(() => import('./pages/Payment'));
const Confirmation = lazy(() => import('./pages/Confirmation'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Faq = lazy(() => import('./pages/Faq'));
const Delivery = lazy(() => import('./pages/Delivery'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Legal = lazy(() => import('./pages/Legal'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Forgot = lazy(() => import('./pages/auth/Forgot'));
const Reset = lazy(() => import('./pages/auth/Reset'));

const AccountLayout = lazy(() => import('./components/layout/AccountLayout'));
const AccountDashboard = lazy(() => import('./pages/account/Dashboard'));
const AccountOrders = lazy(() => import('./pages/account/Orders'));
const AccountProfile = lazy(() => import('./pages/account/Profile'));

/* Admin — loaded only when the /admin area is opened. */
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./admin/AdminProducts'));
const AdminCategories = lazy(() => import('./admin/AdminCategories'));
const AdminOrders = lazy(() => import('./admin/AdminOrders'));
const AdminCustomers = lazy(() => import('./admin/AdminCustomers'));
const AdminCarts = lazy(() => import('./admin/AdminCarts'));
const AdminReviews = lazy(() => import('./admin/AdminReviews'));
const AdminDiscounts = lazy(() => import('./admin/AdminDiscounts'));
const AdminBlog = lazy(() => import('./admin/AdminBlog'));
const AdminFaqs = lazy(() => import('./admin/AdminFaqs'));
const AdminNewsletter = lazy(() => import('./admin/AdminNewsletter'));
const AdminMessages = lazy(() => import('./admin/AdminMessages'));
const AdminSettings = lazy(() => import('./admin/AdminSettings'));
const AdminAnalytics = lazy(() => import('./admin/AdminAnalytics'));
const AdminAudit = lazy(() => import('./admin/AdminAudit'));

function CategoryRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/categorie/${slug}`} replace />;
}

function ProductRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/produit/${slug}`} replace />;
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname, hash]);
  return null;
}

function PublicLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-forest-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white">
        Aller au contenu principal
      </a>
      <Header />
      <main id="contenu" className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <FloatingElements />
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="h-8 w-8 text-forest-600" />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <StoreProvider>
          <CartProvider>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Administration — layout plein écran, protégé côté serveur et côté client. */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="produits" element={<AdminProducts />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="commandes" element={<AdminOrders />} />
                  <Route path="clients" element={<AdminCustomers />} />
                  <Route path="paniers" element={<AdminCarts />} />
                  <Route path="avis" element={<AdminReviews />} />
                  <Route path="promos" element={<AdminDiscounts />} />
                  <Route path="blog" element={<AdminBlog />} />
                  <Route path="faq" element={<AdminFaqs />} />
                  <Route path="newsletter" element={<AdminNewsletter />} />
                  <Route path="messages" element={<AdminMessages />} />
                  <Route path="reglages" element={<AdminSettings />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="journal" element={<AdminAudit />} />
                </Route>

                {/* Site public */}
                <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
                <Route path="/boutique" element={<PublicLayout><Shop /></PublicLayout>} />
                <Route path="/categorie" element={<PublicLayout><Shop /></PublicLayout>} />
                <Route path="/categorie/:slug" element={<PublicLayout><Shop /></PublicLayout>} />
                <Route path="/boutique/:slug" element={<PublicLayout><CategoryRedirect /></PublicLayout>} />
                <Route path="/produit/:slug" element={<PublicLayout><Product /></PublicLayout>} />
                <Route path="/panier" element={<PublicLayout><Cart /></PublicLayout>} />
                <Route path="/commande" element={<PublicLayout><Checkout /></PublicLayout>} />
                <Route path="/commande/:reference/paiement" element={<PublicLayout><Payment /></PublicLayout>} />
                <Route path="/commande/:reference/confirmation" element={<PublicLayout><Confirmation /></PublicLayout>} />
                <Route path="/paiement/:reference" element={<PublicLayout><Payment /></PublicLayout>} />
                <Route path="/confirmation/:reference" element={<PublicLayout><Confirmation /></PublicLayout>} />
                <Route path="/blog" element={<PublicLayout><Blog /></PublicLayout>} />
                <Route path="/blog/:slug" element={<PublicLayout><BlogPost /></PublicLayout>} />
                <Route path="/faq" element={<PublicLayout><Faq /></PublicLayout>} />
                <Route path="/livraison" element={<PublicLayout><Delivery /></PublicLayout>} />
                <Route path="/a-propos" element={<PublicLayout><About /></PublicLayout>} />
                <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
                <Route path="/mentions-legales" element={<PublicLayout><Legal /></PublicLayout>} />
                <Route path="/cgv" element={<PublicLayout><Legal /></PublicLayout>} />
                <Route path="/confidentialite" element={<PublicLayout><Legal /></PublicLayout>} />

                {/* Authentification */}
                <Route path="/connexion" element={<PublicLayout><Login /></PublicLayout>} />
                <Route path="/inscription" element={<PublicLayout><Register /></PublicLayout>} />
                <Route path="/mot-de-passe-oublie" element={<PublicLayout><Forgot /></PublicLayout>} />
                <Route path="/reinitialiser-mot-de-passe" element={<PublicLayout><Reset /></PublicLayout>} />

                {/* Espace client */}
                <Route path="/compte" element={<PublicLayout><AccountLayout /></PublicLayout>}>
                  <Route index element={<AccountDashboard />} />
                  <Route path="commandes" element={<AccountOrders />} />
                  <Route path="profil" element={<AccountProfile />} />
                </Route>

                {/* Compatibilité avec les anciennes URL */}
                <Route path="/produits" element={<PublicLayout><Shop /></PublicLayout>} />
                <Route path="/produits/:slug" element={<PublicLayout><ProductRedirect /></PublicLayout>} />
                <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
                <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
                <Route path="/account" element={<Navigate to="/compte" replace />} />

                <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
              </Routes>
            </Suspense>
          </CartProvider>
        </StoreProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
