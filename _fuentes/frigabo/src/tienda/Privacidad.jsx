import { useCallback, useEffect, useState } from 'react';
import { AVISO_VERSION, SOLICITUD_ESTADOS, SOLICITUD_TIPOS, errMsg, fmtDateTime } from '../lib/db.js';
import { sb, useStore } from './store.jsx';
import { cleanText } from '../security.js';
import { Chips, Empty, Field, Header, Sheet, Spinner } from '../components/UI.jsx';
import * as I from '../components/Icons.jsx';

const fechaAviso = new Date(AVISO_VERSION + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

/** Texto corto que se muestra donde se recaban datos (registro y pago). */
export function AvisoCorto({ go }) {
  return (
    <p className="aviso-corto">
      <I.Shield size={14} /> Usamos tu nombre, correo y WhatsApp sólo para tu cuenta, tus pedidos y su entrega. No vendemos tus datos.{' '}
      <button type="button" className="link inline" onClick={() => go('/privacidad')}>Aviso de privacidad</button>
    </p>
  );
}

export function AvisoPrivacidad({ back, go }) {
  const { ajustes } = useStore();
  const resp = ajustes?.responsable_nombre || 'Fri & Gabo';
  const correo = ajustes?.privacidad_correo;
  return (
    <div className="screen narrow legal-page">
      <Header title="Aviso de privacidad" onBack={back} />
      <p className="muted small">Última actualización: {fechaAviso}</p>

      <section className="toc box">
        <b>En resumen</b>
        <ul>
          <li>Pedimos sólo lo necesario para venderte y entregarte: nombre, correo y WhatsApp.</li>
          <li>No pedimos datos de tarjeta, bancarios ni datos sensibles.</li>
          <li>No vendemos ni rentamos tus datos.</li>
          <li>Puedes ver, corregir, descargar o pedir que borremos tus datos desde <b>Mi cuenta → Privacidad y mis datos</b>.</li>
        </ul>
      </section>

      <h2>1. Quién es responsable de tus datos</h2>
      <p><b>{resp}</b>, que opera la tienda en línea “Fri & Gabo”{ajustes?.responsable_domicilio ? <>, con domicilio en {ajustes.responsable_domicilio}</> : null}, es responsable del tratamiento de tus datos personales.
        {correo ? <> Para cualquier tema de privacidad escríbenos a <a className="link inline" href={`mailto:${correo}`}>{correo}</a>.</> : null}</p>

      <h2>2. Qué datos recabamos</h2>
      <ul>
        <li><b>Identificación y contacto:</b> nombre, correo electrónico y número de WhatsApp.</li>
        <li><b>De tus compras:</b> productos, montos, forma de pago elegida (transferencia o efectivo), día y horario de entrega, notas que nos dejes y el historial de cada pedido.</li>
        <li><b>De atención:</b> los reportes de problemas (casos) que abras y nuestras respuestas.</li>
        <li><b>Técnicos:</b> la sesión de tu cuenta y, en tu propio dispositivo, el carrito, favoritos y búsquedas recientes (ver punto 7).</li>
      </ul>
      <p>No recabamos datos personales sensibles. No recibimos ni guardamos datos de tarjetas ni claves bancarias: la transferencia la haces tú desde tu banco.</p>

      <h2>3. Para qué usamos tus datos</h2>
      <p><b>Finalidades necesarias</b> (sin ellas no podemos venderte):</p>
      <ul>
        <li>Crear y administrar tu cuenta.</li>
        <li>Registrar, apartar y dar seguimiento a tus pedidos.</li>
        <li>Verificar tu pago y coordinar la entrega en {ajustes?.punto || 'el punto de entrega'}, incluido el código de entrega.</li>
        <li>Atender aclaraciones, cambios, devoluciones y reportes de problemas.</li>
        <li>Prevenir fraudes y mantener segura la tienda.</li>
        <li>Cumplir obligaciones legales y fiscales.</li>
      </ul>
      <p><b>Finalidades voluntarias</b> (sólo si nos das permiso, y puedes quitarlo cuando quieras):</p>
      <ul>
        <li>Enviarte novedades, ofertas y productos nuevos por WhatsApp o correo.</li>
      </ul>
      <p>Si no quieres que usemos tus datos para la finalidad voluntaria, desactívala en <b>Mi cuenta → Privacidad y mis datos</b>. Negarte no afecta tus compras.</p>

      <h2>4. Con quién compartimos tus datos</h2>
      <p>No vendemos, rentamos ni compartimos tus datos con terceros para sus propios fines. Usamos proveedores que sólo los procesan por nuestra cuenta para que la tienda funcione:</p>
      <ul>
        <li><b>Supabase</b>: base de datos e inicio de sesión (servidores en Estados Unidos).</li>
        <li><b>GitHub Pages</b>: publica el sitio web.</li>
        <li><b>WhatsApp (Meta)</b>: sólo si tú eliges escribirnos o enviarnos tu comprobante por ese medio.</li>
      </ul>
      <p>Podríamos entregar datos a autoridades cuando una ley o una orden lo exija.</p>

      <h2>5. Cuánto tiempo los conservamos</h2>
      <p>Los datos de tu cuenta se conservan mientras la tengas activa. Si pides que los borremos, eliminamos tu perfil y quitamos tu nombre, teléfono y correo de tus pedidos. Conservamos sólo los montos y productos de las ventas el tiempo que exigen las leyes fiscales.</p>

      <h2>6. Tus derechos (ARCO) y cómo revocar tu consentimiento</h2>
      <p>Tienes derecho a <b>Acceder</b> a tus datos, <b>Rectificarlos</b>, pedir su <b>Cancelación</b> y <b>Oponerte</b> a su uso para fines específicos. También puedes <b>revocar</b> el consentimiento que nos diste.</p>
      <ul>
        <li><b>Desde la tienda:</b> Mi cuenta → Privacidad y mis datos. Ahí puedes descargar tus datos, corregir tu perfil y enviar una solicitud. Verás su estado y nuestra respuesta.</li>
        {correo && <li><b>Por correo:</b> escribe a {correo} desde el correo de tu cuenta, con tu nombre, qué derecho quieres ejercer y, si aplica, qué dato corregir.</li>}
      </ul>
      <p>Respondemos dentro de los plazos que marca la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Si consideras que no atendimos tu solicitud, puedes acudir a la autoridad en materia de protección de datos, que actualmente es la Secretaría Anticorrupción y Buen Gobierno.</p>

      <h2>7. Almacenamiento en tu dispositivo</h2>
      <p>No usamos cookies de publicidad ni herramientas de rastreo o analítica. Tu navegador guarda localmente tu sesión, tu carrito, favoritos y búsquedas recientes para que la tienda funcione. Puedes borrarlos en Mi cuenta → Privacidad y mis datos → “Borrar datos de este dispositivo”.</p>

      <h2>8. Cambios a este aviso</h2>
      <p>Si cambiamos este aviso, publicaremos la nueva versión en esta misma página con su fecha. Si el cambio afecta finalidades que requieren tu consentimiento, te lo pediremos de nuevo.</p>
      {go && <button className="btn ghost full" onClick={() => go('/mis-datos')}>Ir a Privacidad y mis datos</button>}
    </div>
  );
}

export function MisDatos({ go, back }) {
  const { user, authReady, perfil, setPerfil, notify, clearCart, setRecent } = useStore();
  const [sol, setSol] = useState(null);
  const [nueva, setNueva] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmLocal, setConfirmLocal] = useState(false);

  const load = useCallback(async () => {
    const { data } = await sb.from('fg_solicitudes_datos').select('*').order('creado', { ascending: false });
    setSol(data || []);
  }, []);
  useEffect(() => { if (authReady && !user) go('/cuenta?next=/mis-datos', { replace: true }); if (user) load(); }, [authReady, user, load]);
  if (!user || !perfil || !sol) return <div className="screen narrow"><Header title="Privacidad y mis datos" onBack={back} /><Spinner /></div>;

  const descargar = async () => {
    setBusy(true);
    const [p, o, c, s] = await Promise.all([
      sb.from('fg_perfiles').select('*').eq('id', user.id).maybeSingle(),
      sb.from('fg_pedidos').select('folio,estado,items,total,pago,dia,horario,nombre,telefono,correo,nota,historial,creado'),
      sb.from('fg_casos').select('tipo,mensaje,solucion_deseada,estado,respuesta,creado'),
      sb.from('fg_solicitudes_datos').select('tipo,detalle,estado,respuesta,creado'),
    ]);
    setBusy(false);
    const datos = { generado: new Date().toISOString(), cuenta: { correo: user.email, creada: user.created_at }, perfil: p.data, pedidos: o.data, casos: c.data, solicitudes_de_privacidad: s.data };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `mis-datos-fri-gabo-${new Date().toLocaleDateString('en-CA')}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    notify('Descargando tus datos');
  };

  const togglePromos = async () => {
    const v = !perfil.acepta_promociones;
    const { error } = await sb.from('fg_perfiles').update({ acepta_promociones: v }).eq('id', user.id);
    if (error) return notify(errMsg(error));
    setPerfil({ ...perfil, acepta_promociones: v }); notify(v ? 'Recibirás novedades' : 'Ya no te enviaremos promociones');
  };

  const borrarLocal = () => {
    clearCart(); setRecent([]);
    try { ['fg_cart', 'fg_favs', 'fg_recent'].forEach((k) => localStorage.removeItem(k)); } catch { /* sin almacenamiento */ }
    setConfirmLocal(false); notify('Datos de este dispositivo borrados');
  };

  return (
    <div className="screen narrow">
      <Header title="Privacidad y mis datos" onBack={back} />

      <section className="box">
        <div className="box-head"><I.User size={18} /><b className="grow">Datos que tenemos de ti</b><button className="link" onClick={() => go('/cuenta')}>Corregir</button></div>
        <dl className="datos">
          <dt>Nombre</dt><dd>{perfil.nombre || '—'}</dd>
          <dt>Correo</dt><dd>{user.email}</dd>
          <dt>WhatsApp</dt><dd>{perfil.telefono || '—'}</dd>
          <dt>Aviso aceptado</dt><dd>{perfil.acepta_privacidad_at ? `${fmtDateTime(perfil.acepta_privacidad_at)} (versión ${perfil.aviso_version})` : 'Pendiente'}</dd>
        </dl>
        <p className="muted small">Además guardamos tus pedidos y los casos que abras. Descárgalos todos aquí:</p>
        <button className="btn ghost full" disabled={busy} onClick={descargar}><I.Receipt size={18} /> {busy ? 'Preparando…' : 'Descargar mis datos (JSON)'}</button>
      </section>

      <section className="box">
        <div className="box-head"><I.Chat size={18} /><b>Permisos</b></div>
        <label className="toggle-row">
          <span><b>Novedades y ofertas</b><small className="muted">Por WhatsApp o correo. Es opcional y no afecta tus compras.</small></span>
          <input type="checkbox" role="switch" checked={!!perfil.acepta_promociones} onChange={togglePromos} />
        </label>
      </section>

      <section className="box">
        <div className="box-head"><I.Shield size={18} /><b className="grow">Ejercer mis derechos</b></div>
        <p className="small muted">Acceso, rectificación, cancelación, oposición o revocar tu consentimiento. Registramos la fecha de tu solicitud y te respondemos aquí.</p>
        <button className="btn full" onClick={() => setNueva(true)}>Nueva solicitud</button>
        {sol.length > 0 && (
          <ul className="sol-list">{sol.map((s) => (
            <li key={s.id}>
              <div className="row-between"><b>{SOLICITUD_TIPOS[s.tipo].label}</b><span className={`status ${SOLICITUD_ESTADOS[s.estado].tone}`}>{SOLICITUD_ESTADOS[s.estado].label}</span></div>
              <small className="muted">Enviada el {fmtDateTime(s.creado)}</small>
              {s.detalle && <p className="small">“{s.detalle}”</p>}
              {s.respuesta && <div className="reply"><b>Respuesta</b><p>{s.respuesta}</p></div>}
            </li>
          ))}</ul>
        )}
      </section>

      <section className="box">
        <div className="box-head"><I.Trash size={18} /><b>Este dispositivo</b></div>
        <p className="small muted">Borra el carrito, favoritos y búsquedas recientes guardados en este navegador. Tu cuenta y tus pedidos no se tocan.</p>
        <button className="btn ghost full" onClick={() => setConfirmLocal(true)}>Borrar datos de este dispositivo</button>
      </section>

      <button className="link center" onClick={() => go('/privacidad')}>Leer el aviso de privacidad completo</button>

      <NuevaSolicitud open={nueva} onClose={() => setNueva(false)} onDone={() => { setNueva(false); load(); }} />
      <Sheet open={confirmLocal} onClose={() => setConfirmLocal(false)} title="¿Borrar datos del dispositivo?">
        <p className="muted">Se vaciará tu carrito y se borrarán favoritos y búsquedas de este navegador.</p>
        <div className="row2 sheet-actions"><button className="btn ghost" onClick={() => setConfirmLocal(false)}>Cancelar</button><button className="btn" onClick={borrarLocal}>Sí, borrar</button></div>
      </Sheet>
    </div>
  );
}

function NuevaSolicitud({ open, onClose, onDone }) {
  const { user, notify } = useStore();
  const [tipo, setTipo] = useState('acceso');
  const [detalle, setDetalle] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setErr('');
    const d = cleanText(detalle, 1000);
    if (['rectificacion', 'oposicion'].includes(tipo) && d.length < 5) return setErr('Indica qué dato o qué uso.');
    setBusy(true);
    const { error } = await sb.from('fg_solicitudes_datos').insert({ cliente_id: user.id, tipo, detalle: d });
    setBusy(false);
    if (error) return setErr(errMsg(error));
    notify('Solicitud enviada'); setDetalle(''); onDone();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Nueva solicitud">
      <label className="lbl">¿Qué quieres hacer?</label>
      <Chips wrap label="Tipo" value={tipo} onChange={setTipo} options={Object.entries(SOLICITUD_TIPOS).map(([value, t]) => ({ value, label: t.label }))} />
      <p className="note">{SOLICITUD_TIPOS[tipo].hint}{tipo === 'cancelacion' && ' Si tienes pedidos en curso, primero los terminamos. Conservamos sólo los montos de tus compras por obligaciones fiscales.'}</p>
      <Field label={tipo === 'rectificacion' ? '¿Qué dato hay que corregir?' : tipo === 'oposicion' ? '¿A qué uso te opones?' : 'Detalles (opcional)'}>
        <textarea className="input" rows={3} maxLength={1000} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
      </Field>
      {err && <p className="err">{err}</p>}
      <div className="row2 sheet-actions"><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" disabled={busy} onClick={send}>Enviar</button></div>
    </Sheet>
  );
}

export function ConsentimientoPendiente({ go }) {
  const { user, perfil, setPerfil, notify } = useStore();
  const [busy, setBusy] = useState(false);
  if (!user || !perfil || perfil.aviso_version === AVISO_VERSION) return null;
  const aceptar = async () => {
    setBusy(true);
    const row = { id: user.id, nombre: perfil.nombre || '', acepta_privacidad_at: new Date().toISOString(), aviso_version: AVISO_VERSION };
    const { error } = await sb.from('fg_perfiles').upsert(row);
    setBusy(false);
    if (error) return notify(errMsg(error));
    setPerfil({ ...perfil, ...row }); notify('Gracias');
  };
  return (
    <div className="consent-banner" role="region" aria-label="Aviso de privacidad">
      <p><I.Shield size={16} /> {perfil.aviso_version ? 'Actualizamos nuestro aviso de privacidad.' : 'Revisa nuestro aviso de privacidad.'} Léelo y confirma para seguir comprando.</p>
      <div className="row2"><button className="btn ghost sm" onClick={() => go('/privacidad')}>Leer</button><button className="btn sm" disabled={busy} onClick={aceptar}>Acepto</button></div>
    </div>
  );
}

export { Empty };
