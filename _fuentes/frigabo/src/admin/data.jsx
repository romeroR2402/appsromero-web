import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { makeClient } from '../lib/db.js';

export const sb = makeClient('fg-admin');
const Ctx = createContext(null);

export function AdminProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [casos, setCasos] = useState([]);
  const [ajustes, setAjustes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const t = useRef();
  const notify = useCallback((m) => { setToast(m); clearTimeout(t.current); t.current = setTimeout(() => setToast(null), 2600); }, []);

  const refresh = useCallback(async () => {
    const [o, p, pf, c, a] = await Promise.all([
      sb.from('fg_pedidos').select('*').order('creado', { ascending: false }).limit(2000),
      sb.rpc('fg_productos_admin'),
      sb.from('fg_perfiles').select('*'),
      sb.from('fg_casos').select('*, fg_pedidos(folio,nombre,telefono)').order('creado', { ascending: false }),
      sb.from('fg_ajustes').select('*').eq('id', 1).single(),
    ]);
    const err = [o, p, pf, c, a].find((r) => r.error)?.error;
    setError(err ? err.message : '');
    if (!o.error) setOrders(o.data);
    if (!p.error) setProducts(p.data);
    if (!pf.error) setPerfiles(pf.data);
    if (!c.error) setCasos(c.data);
    if (!a.error) setAjustes(a.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(() => document.visibilityState === 'visible' && refresh(), 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const value = { orders, products, perfiles, casos, ajustes, setAjustes, loading, error, refresh, toast, notify };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAdmin = () => useContext(Ctx);

// Ventas = pedidos con pago confirmado o entregados
export const VENTA = ['pagado', 'listo', 'entregado'];
export const dayKey = (d) => new Date(d).toLocaleDateString('en-CA');
