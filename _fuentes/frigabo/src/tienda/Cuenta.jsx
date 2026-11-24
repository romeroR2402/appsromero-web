import { useCallback, useEffect, useState } from 'react';
import { CASO_TIPOS, ESTADOS, errMsg, fmtDateTime, fmtDay, money } from '../lib/db.js';
import { sb, useStore } from './store.jsx';
import { cleanText, formatClabe, isValidEmail, isValidPhone, onlyDigits, passwordIssue } from '../security.js';
import { CasoPill, Chips, ConditionBadge, Empty, Field, Header, Img, LogoMark, Sheet, Spinner, StatusPill, Wordmark } from '../components/UI.jsx';
import * as I from '../components/Icons.jsx';

const redirectUrl = () => location.origin + location.pathname;

export function AuthScreen({ go, back, next }) {
  const { notify, recovery } = useStore();
  const [mode, setMode] = useState('entrar');
  const [f, setF] = useState({ nombre: '', email: '', pass: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  if (recovery) return <NewPassword go={go} />;

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setInfo('');
    const email = f.email.trim().toLowerCase();
    if (!isValidEmail(email)) return setErr('Escribe un correo válido.');
    if (mode === 'olvide') {
      setBusy(true);
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
      setBusy(false);
      // Mismo mensaje exista o no la cuenta (no revelamos qué correos están registrados)
      return error && !/rate/i.test(error.message) ? setErr(errMsg(error)) : setInfo('Si el correo tiene cuenta, te enviamos un enlace para cambiar tu contraseña.');
    }
    if (mode === 'crear') {
      if (cleanText(f.nombre, 80).length < 3) return setErr('Escribe tu nombre.');
      const pi = passwordIssue(f.pass); if (pi) return setErr(pi);
    }
    setBusy(true);
    const res = mode === 'crear'
      ? await sb.auth.signUp({ email, password: f.pass, options: { data: { nombre: cleanText(f.nombre, 80) }, emailRedirectTo: redirectUrl() } })
      : await sb.auth.signInWithPassword({ email, password: f.pass });
    setBusy(false);
    if (res.error) return setErr(errMsg(res.error));
    if (mode === 'crear') {
      if (!res.data.session) return setInfo('¡Listo! Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego inicia sesión.');
      await sb.from('fg_perfiles').upsert({ id: res.data.user.id, nombre: cleanText(f.nombre, 80) });
    }
    notify(mode === 'crear' ? 'Cuenta creada' : 'Bienvenido de nuevo');
    go(next || '/cuenta', { replace: true });
  };

  return (
    <div className="screen narrow auth">
      <Header title="" onBack={back} />
      <div className="auth-brand"><LogoMark size={96} /><Wordmark /><p className="tagline">TODO A UN CLIC</p></div>
      {mode !== 'olvide' && <Chips label="Modo" value={mode} onChange={(m) => { setMode(m); setErr(''); setInfo(''); }}
        options={[{ value: 'entrar', label: 'Iniciar sesión' }, { value: 'crear', label: 'Crear cuenta' }]} />}
      {mode === 'olvide' && <h2 className="auth-title">Recuperar contraseña</h2>}
      <form onSubmit={submit} noValidate>
        {mode === 'crear' && <Field label="Nombre"><input className="input" autoComplete="name" maxLength={80} value={f.nombre} onChange={set('nombre')} /></Field>}
        <Field label="Correo"><input className="input" type="email" autoComplete="email" inputMode="email" maxLength={120} value={f.email} onChange={set('email')} /></Field>
        {mode !== 'olvide' && (
          <Field label="Contraseña" hint={mode === 'crear' ? 'Mínimo 8 caracteres, con letras y números.' : ''}>
            <div className="pass">
              <input className="input" type={show ? 'text' : 'password'} autoComplete={mode === 'crear' ? 'new-password' : 'current-password'} maxLength={72} value={f.pass} onChange={set('pass')} />
              <button type="button" className="icon-btn sm" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(!show)}><I.Eye size={18} /></button>
            </div>
          </Field>
        )}
        {err && <p className="err-box" role="alert"><I.Alert size={16} /> {err}</p>}
        {info && <p className="ok-box" role="status"><I.Check size={16} /> {info}</p>}
        <button className="btn full" disabled={busy}>{busy ? 'Un momento…' : mode === 'crear' ? 'Crear cuenta' : mode === 'olvide' ? 'Enviar enlace' : 'Entrar'}</button>
      </form>
      {mode === 'entrar' && <button className="link center" onClick={() => { setMode('olvide'); setErr(''); }}>¿Olvidaste tu contraseña?</button>}
      {mode === 'olvide' && <button className="link center" onClick={() => setMode('entrar')}>Volver a iniciar sesión</button>}
      <p className="muted small center legal"><I.Shield size={14} /> Sólo usamos tu nombre, correo y WhatsApp para tus pedidos. Nunca te pediremos datos de tarjeta.</p>
    </div>
  );
}

function NewPassword({ go }) {
  const { setRecovery, notify } = useStore();
  const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    const pi = passwordIssue(p); if (pi) return setErr(pi);
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: p });
    setBusy(false);
    if (error) return setErr(errMsg(error));
    setRecovery(false); notify('Contraseña actualizada'); go('/cuenta', { replace: true });
  };
  return (
    <div className="screen narrow auth">
      <Header title="Nueva contraseña" />
      <form onSubmit={save}>
        <Field label="Nueva contraseña" hint="Mínimo 8 caracteres, con letras y números." error={err}>
          <input className="input" type="password" autoComplete="new-password" maxLength={72} value={p} onChange={(e) => setP(e.target.value)} />
        </Field>
        <button className="btn full" disabled={busy}>Guardar</button>
      </form>
    </div>
  );
}

export function CuentaScreen({ go }) {
  const { user, perfil, setPerfil, notify, authReady, favs } = useStore();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ nombre: '', telefono: '' });
  const [err, setErr] = useState('');
  const [counts, setCounts] = useState({ activos: 0, total: 0, casos: 0 });
  useEffect(() => {
    if (!user) return;
    Promise.all([
      sb.from('fg_pedidos').select('estado'),
      sb.from('fg_casos').select('id', { count: 'exact', head: true }).in('estado', ['abierto', 'en_revision']),
    ]).then(([p, c]) => setCounts({
      total: p.data?.length || 0,
      activos: p.data?.filter((x) => !['entregado', 'cancelado'].includes(x.estado)).length || 0,
      casos: c.count || 0,
    }));
  }, [user]);

  if (!authReady) return <div className="screen narrow"><Spinner /></div>;
  if (!user) return <AuthScreen go={go} />;
  const save = async () => {
    const nombre = cleanText(f.nombre, 80);
    if (nombre.length < 3) return setErr('Nombre muy corto.');
    if (f.telefono && !isValidPhone(f.telefono)) return setErr('WhatsApp de 10 dígitos.');
    const row = { id: user.id, nombre, telefono: onlyDigits(f.telefono) };
    const { error } = await sb.from('fg_perfiles').upsert(row);
    if (error) return setErr(errMsg(error));
    setPerfil({ ...perfil, ...row }); setEdit(false); notify('Perfil actualizado');
  };
  const name = perfil?.nombre || user.email;
  return (
    <div className="screen narrow">
      <Header title="Mi cuenta" />
      <section className="profile-card">
        <div className="avatar">{name.slice(0, 1).toUpperCase()}</div>
        <div><b>{name}</b><small>{user.email}</small>{perfil?.telefono && <small>WhatsApp {perfil.telefono}</small>}</div>
        <button className="btn ghost sm" onClick={() => { setF({ nombre: perfil?.nombre || '', telefono: perfil?.telefono || '' }); setErr(''); setEdit(true); }}>Editar</button>
      </section>
      <div className="stats">
        <button onClick={() => go('/pedidos')}><b>{counts.activos}</b><small>En curso</small></button>
        <button onClick={() => go('/pedidos')}><b>{counts.total}</b><small>Pedidos</small></button>
        <button onClick={() => go('/casos')}><b>{counts.casos}</b><small>Casos abiertos</small></button>
      </div>
      <ul className="menu">
        <li><button onClick={() => go('/pedidos')}><I.Receipt /> Mis pedidos y entregas <I.Arrow size={16} /></button></li>
        <li><button onClick={() => go('/casos')}><I.Chat /> Resolución de problemas <I.Arrow size={16} /></button></li>
        <li><button onClick={() => go('/favoritos')}><I.Heart /> Favoritos ({favs.length}) <I.Arrow size={16} /></button></li>
        <li><button onClick={() => go('/seguridad')}><I.Shield /> Compra segura <I.Arrow size={16} /></button></li>
        <li><button onClick={async () => { await sb.auth.signOut(); notify('Sesión cerrada'); go('/'); }}><I.LogOut /> Cerrar sesión</button></li>
      </ul>
      <Sheet open={edit} onClose={() => setEdit(false)} title="Editar perfil">
        <Field label="Nombre"><input className="input" maxLength={80} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
        <Field label="WhatsApp"><input className="input" type="tel" inputMode="numeric" maxLength={10} value={f.telefono} onChange={(e) => setF({ ...f, telefono: onlyDigits(e.target.value) })} /></Field>
        {err && <p className="err">{err}</p>}
        <div className="row2 sheet-actions"><button className="btn ghost" onClick={() => setEdit(false)}>Cancelar</button><button className="btn" onClick={save}>Guardar</button></div>
      </Sheet>
    </div>
  );
}

const useRequireUser = (go, next) => {
  const { user, authReady } = useStore();
  useEffect(() => { if (authReady && !user) go(`/cuenta?next=${next}`, { replace: true }); }, [authReady, user]);
  return authReady && user;
};

export function PedidosScreen({ go }) {
  const ok = useRequireUser(go, '/pedidos');
  const [orders, setOrders] = useState(null);
  useEffect(() => {
    if (!ok) return;
    sb.from('fg_pedidos').select('folio,estado,total,items,dia,horario,creado').order('creado', { ascending: false }).then(({ data }) => setOrders(data || []));
  }, [ok]);
  if (!ok || !orders) return <div className="screen narrow"><Header title="Mis pedidos" /><Spinner /></div>;
  const activos = orders.filter((o) => !['entregado', 'cancelado'].includes(o.estado));
  const pasados = orders.filter((o) => ['entregado', 'cancelado'].includes(o.estado));
  const Row = ({ o }) => (
    <li><button onClick={() => go(`/pedido/${o.folio}`)}>
      <Img src={o.items[0]?.imagen} alt="" className="thumb sm" />
      <div className="grow"><b className="mono">{o.folio}</b>
        <small className="muted">{o.items.reduce((s, i) => s + i.qty, 0)} artículo(s) · {money(o.total)}</small>
        {!['entregado', 'cancelado'].includes(o.estado) && <small><I.Clock size={13} /> Entrega {fmtDay(o.dia)} · {o.horario}</small>}
      </div>
      <StatusPill s={o.estado} />
    </button></li>
  );
  return (
    <div className="screen narrow">
      <Header title="Mis pedidos" />
      {!orders.length && <Empty title="Aún no tienes pedidos" text="Cuando compres algo aparecerá aquí con su folio, fecha de entrega y estado." action={<button className="btn" onClick={() => go('/')}>Ir a la tienda</button>} />}
      {activos.length > 0 && <><div className="section-head"><h2>En curso</h2></div><ul className="order-list">{activos.map((o) => <Row key={o.folio} o={o} />)}</ul></>}
      {pasados.length > 0 && <><div className="section-head"><h2>Historial</h2></div><ul className="order-list">{pasados.map((o) => <Row key={o.folio} o={o} />)}</ul></>}
    </div>
  );
}

function CopyField({ label, value, display }) {
  const { notify } = useStore();
  const copy = async () => { try { await navigator.clipboard.writeText(value); notify(`${label} copiado`); } catch { notify('Mantén presionado para copiar'); } };
  return (
    <div className="copy-field"><div><small className="muted">{label}</small><b className="mono">{display || value}</b></div>
      <button className="icon-btn sm" aria-label={`Copiar ${label}`} onClick={copy}><I.Copy size={18} /></button></div>
  );
}

const PASOS = ['Pedido recibido', 'Pago verificado', 'Listo para entregar', 'Entregado'];
function Timeline({ o }) {
  const paso = ESTADOS[o.estado].paso;
  const when = (estado) => o.historial.find((h) => h.estado === estado)?.fecha;
  const fechas = [o.creado, when('pagado'), when('listo'), when('entregado')];
  if (o.estado === 'cancelado') return <p className="err-box"><I.Close size={16} /> Pedido cancelado {when('cancelado') && `el ${fmtDateTime(when('cancelado'))}`}. El stock se liberó.</p>;
  return (
    <ol className="timeline">
      {PASOS.map((t, i) => (
        <li key={t} className={i <= paso ? 'done' : i === paso + 1 ? 'next' : ''}>
          <span className="dot">{i <= paso ? <I.Check size={12} /> : null}</span>
          <div><b>{t}</b>{i <= paso && fechas[i] && <small>{fmtDateTime(fechas[i])}</small>}
            {i === 3 && i > paso && <small>Programado: {fmtDay(o.dia)} · {o.horario}</small>}</div>
        </li>
      ))}
    </ol>
  );
}

function daysUntil(dia) {
  const d = new Date(dia + 'T12:00:00'); const t = new Date(); t.setHours(12, 0, 0, 0);
  const n = Math.round((d - t) / 86400000);
  return n === 0 ? 'hoy' : n === 1 ? 'mañana' : n > 1 ? `en ${n} días` : '';
}

export function PedidoScreen({ folio, go }) {
  const ok = useRequireUser(go, `/pedido/${folio}`);
  const { ajustes, notify, loadProducts } = useStore();
  const [o, setO] = useState(undefined);
  const [casos, setCasos] = useState([]);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [caso, setCaso] = useState(false);
  const load = useCallback(async () => {
    const { data } = await sb.from('fg_pedidos').select('*').eq('folio', folio).maybeSingle();
    setO(data);
    if (data) { const c = await sb.from('fg_casos').select('*').eq('pedido_id', data.id).order('creado', { ascending: false }); setCasos(c.data || []); }
  }, [folio]);
  useEffect(() => { if (ok) load(); }, [ok, load]);

  if (!ok || o === undefined || !ajustes) return <div className="screen narrow"><Header title="Pedido" /><Spinner /></div>;
  if (!o) return <div className="screen narrow"><Header title="Pedido" onBack={() => go('/pedidos')} /><Empty title="Pedido no encontrado" text="Revisa tus pedidos." /></div>;

  const cancel = async () => {
    const { error } = await sb.rpc('fg_cancelar_pedido', { p_folio: o.folio });
    setConfirmCancel(false);
    if (error) return notify(errMsg(error));
    notify('Pedido cancelado'); load(); loadProducts();
  };
  const msg = [`Hola Fri & Gabo, hice el pedido *${o.folio}*`, ...o.items.map((i) => `• ${i.qty} × ${i.nombre} (${money(i.precio)})`),
    `Total: ${money(o.total)}`, `Entrega: ${fmtDay(o.dia)} ${o.horario} en ${ajustes.punto}`,
    o.pago === 'transferencia' ? 'Adjunto mi comprobante de transferencia.' : 'Pagaré en efectivo al recibir.'].join('\n');
  const wa = ajustes.whatsapp ? `https://wa.me/52${ajustes.whatsapp}?text=${encodeURIComponent(msg)}` : null;
  const activo = !['entregado', 'cancelado'].includes(o.estado);

  return (
    <div className="screen narrow">
      <Header title="Tu pedido" onBack={() => go('/pedidos')} />
      <div className="order-hero">
        <h2 className="mono">{o.folio}</h2>
        <StatusPill s={o.estado} />
        {activo && <p className="eta"><I.Clock size={16} /> Entrega <b>{fmtDay(o.dia)} · {o.horario}</b> {daysUntil(o.dia) && `(${daysUntil(o.dia)})`}</p>}
      </div>
      <Timeline o={o} />

      {o.estado === 'pago_pendiente' && (
        <section className="box">
          <div className="box-head"><I.Shield size={18} /><b>Datos para transferir (SPEI)</b></div>
          <CopyField label="CLABE" value={ajustes.clabe} display={formatClabe(ajustes.clabe)} />
          <CopyField label="Titular" value={ajustes.titular} />
          <CopyField label="Banco" value={ajustes.banco} />
          <CopyField label="Monto exacto" value={Number(o.total).toFixed(2)} display={money(o.total)} />
          <CopyField label="Concepto (obligatorio)" value={o.folio} />
          {o.vence && <p className="muted small"><I.Clock size={14} /> Tu apartado vence el {fmtDateTime(o.vence)}</p>}
        </section>
      )}

      {activo && (
        <section className="box">
          <div className="box-head"><I.Pin size={18} /><b>Entrega</b></div>
          <p><b>{ajustes.punto}</b><br /><span className="muted small">{ajustes.punto_detalle}</span></p>
          <div className="pickup"><small>Código de entrega · díselo al vendedor</small><b className="mono">{o.codigo_entrega}</b></div>
        </section>
      )}

      <div className="summary">
        {o.items.map((i, k) => (
          <div key={k} className="sum-item"><Img src={i.imagen} alt="" className="thumb xs" />
            <div className="grow"><span>{i.qty} × {i.nombre}</span><small className="muted"><ConditionBadge c={i.condicion} /> {i.talla && `Talla ${i.talla}`}</small></div>
            <span>{money(i.precio * i.qty)}</span></div>
        ))}
        <div className="sum-row total"><span>Total · {o.pago === 'transferencia' ? 'Transferencia' : 'Efectivo'}</span><span>{money(o.total)}</span></div>
      </div>

      {casos.length > 0 && (<>
        <div className="section-head"><h2>Resolución</h2></div>
        {casos.map((c) => <CasoCard key={c.id} c={c} />)}
      </>)}

      <div className="actions-col">
        {wa && activo && <a className="btn wa" href={wa} target="_blank" rel="noopener noreferrer">{o.pago === 'transferencia' && o.estado === 'pago_pendiente' ? 'Enviar comprobante por WhatsApp' : 'Escribir por WhatsApp'}</a>}
        {['pagado', 'listo', 'entregado'].includes(o.estado) && <button className="btn ghost" onClick={() => setCaso(true)}><I.Chat size={18} /> Reportar un problema</button>}
        {['pago_pendiente', 'por_confirmar'].includes(o.estado) && <button className="btn ghost danger" onClick={() => setConfirmCancel(true)}>Cancelar pedido</button>}
      </div>

      <Sheet open={confirmCancel} onClose={() => setConfirmCancel(false)} title="¿Cancelar pedido?">
        <p className="muted">Se liberan los productos apartados. Si ya transferiste, no canceles: escríbenos por WhatsApp.</p>
        <div className="row2 sheet-actions"><button className="btn ghost" onClick={() => setConfirmCancel(false)}>No</button><button className="btn" onClick={cancel}>Sí, cancelar</button></div>
      </Sheet>
      <NuevoCaso open={caso} onClose={() => setCaso(false)} pedido={o} onDone={() => { setCaso(false); load(); }} />
    </div>
  );
}

function CasoCard({ c, folio }) {
  return (
    <div className="box caso">
      <div className="box-head"><b className="grow">{CASO_TIPOS[c.tipo]}</b><CasoPill s={c.estado} /></div>
      {folio && <small className="muted mono">{folio}</small>}
      <p className="small">“{c.mensaje}”</p>
      <small className="muted">Abierto el {fmtDateTime(c.creado)} · Solicitas: {c.solucion_deseada}</small>
      {c.respuesta ? <div className="reply"><b>Respuesta de Fri & Gabo</b><p>{c.respuesta}</p></div>
        : <p className="muted small"><I.Clock size={13} /> Te respondemos en menos de 48 h.</p>}
    </div>
  );
}

function NuevoCaso({ open, onClose, pedido, onDone }) {
  const { user, notify } = useStore();
  const [f, setF] = useState({ tipo: 'defecto', mensaje: '', solucion_deseada: 'reembolso' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const send = async () => {
    const mensaje = cleanText(f.mensaje, 1000);
    if (mensaje.length < 10) return setErr('Cuéntanos un poco más (mín. 10 caracteres).');
    setBusy(true);
    const { error } = await sb.from('fg_casos').insert({ pedido_id: pedido.id, cliente_id: user.id, tipo: f.tipo, mensaje, solucion_deseada: f.solucion_deseada });
    setBusy(false);
    if (error) return setErr(errMsg(error));
    notify('Caso enviado'); setF({ tipo: 'defecto', mensaje: '', solucion_deseada: 'reembolso' }); onDone();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Reportar un problema">
      <label className="lbl">¿Qué pasó?</label>
      <Chips wrap label="Tipo" value={f.tipo} onChange={(v) => setF({ ...f, tipo: v })} options={Object.entries(CASO_TIPOS).map(([value, label]) => ({ value, label }))} />
      <Field label="Descríbelo"><textarea className="input" rows={4} maxLength={1000} value={f.mensaje} onChange={(e) => setF({ ...f, mensaje: e.target.value })} placeholder="Ej. el botón lateral no funciona" /></Field>
      <label className="lbl">¿Qué solución prefieres?</label>
      <Chips wrap label="Solución" value={f.solucion_deseada} onChange={(v) => setF({ ...f, solucion_deseada: v })}
        options={[{ value: 'reembolso', label: 'Reembolso' }, { value: 'cambio', label: 'Cambio' }, { value: 'otro', label: 'Otra' }]} />
      {err && <p className="err">{err}</p>}
      <div className="row2 sheet-actions"><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" disabled={busy} onClick={send}>Enviar</button></div>
    </Sheet>
  );
}

export function CasosScreen({ go }) {
  const ok = useRequireUser(go, '/casos');
  const [casos, setCasos] = useState(null);
  useEffect(() => {
    if (!ok) return;
    sb.from('fg_casos').select('*, fg_pedidos(folio)').order('creado', { ascending: false }).then(({ data }) => setCasos(data || []));
  }, [ok]);
  return (
    <div className="screen narrow">
      <Header title="Resolución" onBack={() => go('/cuenta')} />
      <p className="note">¿Algo no salió bien? Abre un caso desde el pedido (botón “Reportar un problema”). Aquí ves el avance y nuestra respuesta.</p>
      {!casos ? <Spinner /> : !casos.length ? <Empty title="Sin casos" text="¡Qué bien! No tienes problemas reportados." /> :
        casos.map((c) => <button key={c.id} className="plain" onClick={() => go(`/pedido/${c.fg_pedidos.folio}`)}><CasoCard c={c} folio={c.fg_pedidos.folio} /></button>)}
    </div>
  );
}

export function SeguridadScreen({ back }) {
  const { ajustes } = useStore();
  return (
    <div className="screen narrow">
      <Header title="Compra segura" onBack={back} />
      <section className="box tips">
        <ul>
          <li>Transfiere <b>sólo</b> a la CLABE que aparece en tu pedido, a nombre de <b>{ajustes?.titular}</b>. Si alguien te da otra cuenta, no pagues y avísanos.</li>
          <li>Usa siempre tu <b>folio</b> como concepto de la transferencia.</li>
          <li>Nunca te pediremos NIP, contraseñas, códigos por SMS ni datos de tarjeta.</li>
          <li>Revisa el producto en la entrega. Tu <b>código de 4 dígitos</b> confirma que eres tú: no lo compartas con nadie más.</li>
          <li>Entregamos dentro de {ajustes?.punto}, en un lugar visible y con vigilancia, de día.</li>
          <li>Si algo falla, abre un caso desde tu pedido. Queda registrado con fecha.</li>
        </ul>
      </section>
    </div>
  );
}
