import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { track } from '../lib/analytics';

const CartContext = createContext(null);

const EMPTY = { id: null, items: [], subtotalCents: 0, count: 0, deliveryOptions: null };

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [cart, setCart] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/cart');
      setCart(data.cart || EMPTY);
    } catch {
      setCart(EMPTY);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) refresh();
  }, [authLoading, user?.id, refresh]);

  const addItem = useCallback(
    async (productId, quantity = 1, { openDrawer = true } = {}) => {
      setLoading(true);
      try {
        const data = await api.post('/cart/items', { productId, quantity });
        setCart(data.cart);
        if (openDrawer) setDrawerOpen(true);
        toast.success('Ajouté à votre panier');
        track('add_to_cart', { productId, quantity });
        return data.cart;
      } catch (err) {
        toast.error(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const updateItem = useCallback(
    async (productId, quantity) => {
      setLoading(true);
      try {
        const data = await api.patch(`/cart/items/${productId}`, { quantity });
        setCart(data.cart);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const removeItem = useCallback(
    async (productId) => {
      try {
        const data = await api.del(`/cart/items/${productId}`);
        setCart(data.cart);
        toast.info('Article retiré du panier');
      } catch (err) {
        toast.error(err.message);
      }
    },
    [toast]
  );

  const clear = useCallback(async () => {
    try {
      await api.del('/cart');
      setCart(EMPTY);
    } catch (err) {
      toast.error(err.message);
    }
  }, [toast]);

  const saveEmail = useCallback(
    async (email) => {
      try {
        await api.post('/cart/email', { email });
      } catch {
        /* non-blocking */
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      cart,
      loading,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      addItem,
      updateItem,
      removeItem,
      clear,
      refresh,
      saveEmail,
      count: cart.count || 0,
    }),
    [cart, loading, drawerOpen, addItem, updateItem, removeItem, clear, refresh, saveEmail]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
