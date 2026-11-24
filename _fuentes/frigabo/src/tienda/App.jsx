import { useEffect, useState } from 'react';
import { useStore } from './store.jsx';
import { Home, ListScreen, SearchScreen } from './Browse.jsx';
import { CartScreen, Checkout, ProductScreen } from './Buy.jsx';
import { AuthScreen, CasosScreen, CuentaScreen, PedidoScreen, PedidosScreen, SeguridadScreen } from './Cuenta.jsx';
import * as I from '../components/Icons.jsx';

const parse = () => {
  const raw = location.hash.replace(/^#/, '');
  // Enlaces de correo de Supabase llegan como #access_token=…: se procesan y mandan a la cuenta
  if (/access_token=|error_description=|type=recovery/.test(raw)) return { path: '/cuenta', query: {} };
  const [p, q] = raw.split('?');
  return { path: decodeURI(p || '/') || '/', query: Object.fromEntries(new URLSearchParams(q || '')) };
};

export default function App() {
  const [route, setRoute] = useState(parse);
  const { toast, cartCount } = useStore();
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (to, { replace } = {}) => (replace ? location.replace('#' + to) : (location.hash = to));
  const back = () => (history.length > 1 ? history.back() : go('/'));
  const { path, query } = route;
  const seg = path.split('/').filter(Boolean);
  const next = query.next && query.next.startsWith('/') ? query.next : undefined; // sólo rutas internas

  let screen;
  switch (seg[0]) {
    case undefined: screen = <Home go={go} />; break;
    case 'buscar': screen = <SearchScreen go={go} back={back} />; break;
    case 'c': screen = <ListScreen key={path} go={go} back={back} category={seg[1]} />; break;
    case 'condicion': screen = <ListScreen key={path} go={go} back={back} condition={seg[1]} />; break;
    case 'favoritos': screen = <ListScreen key={path} go={go} back={back} favoritos />; break;
    case 'p': screen = <ProductScreen key={path} id={seg[1]} go={go} back={back} />; break;
    case 'carrito': screen = <CartScreen go={go} />; break;
    case 'checkout': screen = <Checkout go={go} back={back} />; break;
    case 'cuenta': screen = next ? <AuthGate go={go} back={back} next={next} /> : <CuentaScreen go={go} />; break;
    case 'pedidos': screen = <PedidosScreen go={go} />; break;
    case 'pedido': screen = <PedidoScreen key={path} folio={seg[1]} go={go} />; break;
    case 'casos': screen = <CasosScreen go={go} />; break;
    case 'seguridad': screen = <SeguridadScreen back={back} />; break;
    default: screen = <Home go={go} />;
  }
  const tabs = [
    { to: '/', label: 'Inicio', icon: <I.Home /> },
    { to: '/buscar', label: 'Buscar', icon: <I.Search /> },
    { to: '/carrito', label: 'Carrito', icon: <I.Bag />, badge: cartCount },
    { to: '/pedidos', label: 'Pedidos', icon: <I.Receipt /> },
    { to: '/cuenta', label: 'Cuenta', icon: <I.User /> },
  ];
  const showNav = tabs.some((t) => t.to === path) && !next || ['c', 'condicion', 'favoritos'].includes(seg[0]);
  return (
    <div className={`app ${showNav ? 'with-nav' : ''}`}>
      <main>{screen}</main>
      {showNav && (
        <nav className="bottom-nav" aria-label="Principal">
          {tabs.map((t) => (
            <button key={t.to} className={path === t.to ? 'on' : ''} onClick={() => go(t.to)} aria-current={path === t.to ? 'page' : undefined}>
              <span className="bn-icon">{t.icon}{t.badge > 0 && <b>{t.badge}</b>}</span>{t.label}
            </button>
          ))}
        </nav>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function AuthGate({ go, back, next }) {
  const { user, authReady } = useStore();
  useEffect(() => { if (authReady && user) go(next, { replace: true }); }, [authReady, user]);
  return <AuthScreen go={go} back={back} next={next} />;
}
