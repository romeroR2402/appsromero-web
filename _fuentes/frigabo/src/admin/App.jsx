import { useEffect, useState } from 'react';
import { errMsg } from '../lib/db.js';
import { isValidEmail } from '../security.js';
import { LogoMark, Spinner, Wordmark, Field } from '../components/UI.jsx';
import * as I from '../components/Icons.jsx';
import { AdminProvider, sb, useAdmin } from './data.jsx';
import { Resumen } from './Resumen.jsx';
import { Pedidos } from './Pedidos.jsx';
import { Productos } from './Productos.jsx';
import { Clientes, Casos, Ajustes, Privacidad } from './Otros.jsx';

const IDLE_MS = 30 * 60_000;

export default function App() {
  const [state, setState] = useState('cargando'); // cargando | fuera | admin
  const [msg, setMsg] = useState('');

  const verify = async (session) => {
    if (!session) return setState('fuera');
    const { data, error } = await sb.rpc('fg_es_admin');
    if (error || !data) {
      await sb.auth.signOut();
      setMsg('Esta cuenta no tiene permiso de administrador.');
      return setState('fuera');
    }
    setState('admin');
  };
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => verify(data.session));
    const { data } = sb.auth.onAuthStateChange((e) => { if (e === 'SIGNED_OUT') setState('fuera'); });
    return () => data.subscription.unsubscribe();
  }, []);

  // Cierre de sesión por inactividad
  useEffect(() => {
    if (state !== 'admin') return;
    let t = setTimeout(() => sb.auth.signOut(), IDLE_MS);
    const reset = () => { clearTimeout(t); t = setTimeout(() => sb.auth.signOut(), IDLE_MS); };
    ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, reset));
    return () => { clearTimeout(t); ['pointerdown', 'keydown'].forEach((ev) => window.removeEventListener(ev, reset)); };
  }, [state]);

  if (state === 'cargando') return <div className="login-wrap"><Spinner /></div>;
  if (state === 'fuera') return <Login msg={msg} onOk={(s) => { setMsg(''); verify(s); }} />;
  return <AdminProvider><Shell /></AdminProvider>;
}

function Login({ msg, onOk }) {
  const [f, setF] = useState({ email: '', pass: '' });
  const [err, setErr] = useState(msg);
  const [busy, setBusy] = useState(false);
  useEffect(() => setErr(msg), [msg]);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!isValidEmail(f.email) || !f.pass) return setErr('Escribe tu correo y contraseña.');
    setBusy(true);
    const { data, error } = await sb.auth.signInWithPassword({ email: f.email.trim().toLowerCase(), password: f.pass });
    setBusy(false);
    if (error) return setErr(errMsg(error));
    onOk(data.session);
  };
  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <LogoMark size={110} />
        <Wordmark />
        <p className="muted">Panel de administración</p>
        <Field label="Correo"><input className="input" type="email" autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Contraseña"><input className="input" type="password" autoComplete="current-password" value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} /></Field>
        {err && <p className="err-box" role="alert"><I.Alert size={16} /> {err}</p>}
        <button className="btn full" disabled={busy}><I.Lock size={18} /> {busy ? 'Verificando…' : 'Entrar'}</button>
        <a className="link small" href="./">← Ir a la tienda</a>
      </form>
    </div>
  );
}

const NAV = [
  { k: 'resumen', label: 'Resumen', icon: I.Chart },
  { k: 'pedidos', label: 'Pedidos', icon: I.Receipt },
  { k: 'productos', label: 'Productos', icon: I.Box },
  { k: 'clientes', label: 'Clientes', icon: I.Users },
  { k: 'casos', label: 'Resolución', icon: I.Chat },
  { k: 'privacidad', label: 'Privacidad', icon: I.Shield },
  { k: 'ajustes', label: 'Ajustes', icon: I.Gear },
];

function Shell() {
  const [tab, setTab] = useState(() => location.hash.replace('#', '') || 'resumen');
  const { orders, casos, solicitudes, loading, error, refresh, toast } = useAdmin();
  useEffect(() => { location.replace('#' + tab); window.scrollTo(0, 0); }, [tab]);
  const badge = {
    pedidos: orders.filter((o) => ['pago_pendiente', 'por_confirmar'].includes(o.estado)).length,
    casos: casos.filter((c) => ['abierto', 'en_revision'].includes(c.estado)).length,
    privacidad: solicitudes.filter((s) => ['recibida', 'en_proceso'].includes(s.estado)).length,
  };
  const Page = { resumen: Resumen, pedidos: Pedidos, productos: Productos, clientes: Clientes, casos: Casos, privacidad: Privacidad, ajustes: Ajustes }[tab] || Resumen;
  return (
    <div className="admin">
      <aside className="side">
        <div className="side-brand"><LogoMark size={44} /><div><Wordmark small /><small>Administrador</small></div></div>
        <nav aria-label="Secciones">
          {NAV.map(({ k, label, icon: Ic }) => (
            <button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>
              <Ic size={20} /><span>{label}</span>{badge[k] > 0 && <b>{badge[k]}</b>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <a href="./" target="_blank" rel="noopener"><I.Bag size={18} /> Ver tienda</a>
          <button onClick={() => sb.auth.signOut()}><I.LogOut size={18} /> Salir</button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-top">
          <h1>{NAV.find((n) => n.k === tab)?.label}</h1>
          <button className="btn ghost sm" onClick={refresh}>Actualizar</button>
        </div>
        {error && <p className="err-box"><I.Alert size={16} /> {error}</p>}
        {loading ? <Spinner /> : <Page go={setTab} />}
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
