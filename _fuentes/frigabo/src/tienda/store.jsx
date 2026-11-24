import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { makeClient } from '../lib/db.js';
import { readJSON, writeJSON } from '../security.js';

export const sb = makeClient('fg-cliente');
const Ctx = createContext(null);

const usePersisted = (key, init) => {
  const [v, setV] = useState(() => readJSON(key, init));
  useEffect(() => writeJSON(key, v), [key, v]);
  return [v, setV];
};

export function StoreProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [ajustes, setAjustes] = useState(null);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [recovery, setRecovery] = useState(false);
  const [cart, setCart] = usePersisted('fg_cart', []);
  const [favs, setFavs] = usePersisted('fg_favs', []);
  const [recent, setRecent] = usePersisted('fg_recent', []);
  const [toast, setToast] = useState(null);
  const toastT = useRef();

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const loadProducts = useCallback(async () => {
    const [p, a] = await Promise.all([
      sb.from('fg_productos').select('id,nombre,categoria,condicion,descripcion,precio,precio_antes,stock,vendidos,calificacion,colores,tallas,imagenes,creado').eq('activo', true).order('vendidos', { ascending: false }),
      sb.from('fg_ajustes').select('*').eq('id', 1).single(),
    ]);
    if (p.error) setLoadError('No pudimos cargar los productos. Revisa tu conexión.');
    else { setProducts(p.data); setLoadError(''); }
    if (!a.error) setAjustes(a.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data } = sb.auth.onAuthStateChange((e, s) => { setSession(s); if (e === 'PASSWORD_RECOVERY') setRecovery(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const loadPerfil = useCallback(async () => {
    if (!session) return setPerfil(null);
    const { data } = await sb.from('fg_perfiles').select('*').eq('id', session.user.id).maybeSingle();
    setPerfil(data || { id: session.user.id, nombre: session.user.user_metadata?.nombre || '', telefono: '' });
  }, [session]);
  useEffect(() => { loadPerfil(); }, [loadPerfil]);

  const byId = useCallback((id) => products.find((p) => p.id === id), [products]);

  const addToCart = (item) => setCart((c) => {
    const key = `${item.id}|${item.color || ''}|${item.talla || ''}`;
    const p = byId(item.id);
    const found = c.find((x) => x.key === key);
    if (found) return c.map((x) => (x.key === key ? { ...x, qty: Math.min(p.stock, 10, x.qty + item.qty) } : x));
    return [...c, { ...item, key }];
  });
  const setQty = (key, qty) => setCart((c) => c.map((x) => (x.key === key ? { ...x, qty } : x)));
  const removeFromCart = (key) => setCart((c) => c.filter((x) => x.key !== key));
  const clearCart = () => setCart([]);

  const cartLines = useMemo(
    () => cart.map((x) => ({ ...x, product: byId(x.id) })).filter((x) => x.product && x.product.stock > 0)
      .map((x) => ({ ...x, qty: Math.min(x.qty, x.product.stock) })),
    [cart, byId]
  );
  const cartTotal = cartLines.reduce((s, x) => s + x.product.precio * x.qty, 0);
  const cartCount = cartLines.reduce((s, x) => s + x.qty, 0);

  const toggleFav = (id) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const pushRecent = (q) => setRecent((r) => [q, ...r.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8));

  const value = {
    products, loading, loadError, loadProducts, byId, ajustes,
    session, user: session?.user || null, recovery, setRecovery, authReady, perfil, setPerfil, loadPerfil,
    cart: cartLines, cartTotal, cartCount, addToCart, setQty, removeFromCart, clearCart,
    favs, toggleFav, recent, setRecent, pushRecent, toast, notify,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useStore = () => useContext(Ctx);
