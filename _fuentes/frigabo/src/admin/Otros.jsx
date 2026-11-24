import { useMemo, useState } from 'react';
import { CASO_ESTADOS, CASO_TIPOS, errMsg, fmtDateTime, money } from '../lib/db.js';
import { cleanText, formatClabe, isValidClabe, onlyDigits } from '../security.js';
import { CasoPill, Chips, Field, Sheet } from '../components/UI.jsx';
import * as I from '../components/Icons.jsx';
import { sb, useAdmin, VENTA } from './data.jsx';

export function Clientes() {
  const { perfiles, orders } = useAdmin();
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const by = {};
    orders.forEach((o) => {
      const r = (by[o.cliente_id] = by[o.cliente_id] || { id: o.cliente_id, nombre: o.nombre, telefono: o.telefono, correo: o.correo, pedidos: 0, gastado: 0, ultimo: o.creado });
      r.pedidos += 1; if (VENTA.includes(o.estado)) r.gastado += Number(o.total);
      if (o.creado > r.ultimo) r.ultimo = o.creado;
    });
    perfiles.forEach((p) => { by[p.id] = { pedidos: 0, gastado: 0, ...by[p.id], id: p.id, nombre: p.nombre || by[p.id]?.nombre || '—', telefono: p.telefono || by[p.id]?.telefono, alta: p.creado }; });
    const t = q.trim().toLowerCase();
    return Object.values(by).filter((r) => !t || `${r.nombre} ${r.telefono} ${r.correo}`.toLowerCase().includes(t)).sort((a, b) => b.gastado - a.gastado);
  }, [perfiles, orders, q]);
  const recurrentes = rows.filter((r) => r.pedidos > 1).length;
  return (
    <>
      <div className="kpis compact">
        <div className="kpi"><small>Clientes</small><b>{rows.length}</b></div>
        <div className="kpi"><small>Compran más de una vez</small><b>{recurrentes}</b></div>
      </div>
      <div className="toolbar"><label className="search-input"><I.Search size={18} /><input type="search" placeholder="Nombre, teléfono o correo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar clientes" /></label></div>
      {!rows.length ? <p className="muted pad">Aún no hay clientes registrados.</p> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Cliente</th><th>WhatsApp</th><th className="num">Pedidos</th><th className="num">Gastado</th><th>Último pedido</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><b>{r.nombre}</b><small className="muted">{r.correo || ''}</small></td>
              <td>{r.telefono ? <a className="link" href={`https://wa.me/52${r.telefono}`} target="_blank" rel="noopener noreferrer">{r.telefono}</a> : <span className="muted">—</span>}</td>
              <td className="num">{r.pedidos}</td>
              <td className="num"><b>{money(r.gastado)}</b></td>
              <td>{r.ultimo ? fmtDateTime(r.ultimo) : <span className="muted">Sin pedidos</span>}</td>
            </tr>))}</tbody>
        </table></div>
      )}
    </>
  );
}

export function Casos() {
  const { casos, refresh, notify } = useAdmin();
  const [filtro, setFiltro] = useState('abiertos');
  const [sel, setSel] = useState(null);
  const [f, setF] = useState({ estado: 'en_revision', respuesta: '' });
  const [busy, setBusy] = useState(false);
  const list = casos.filter((c) => filtro === 'todos' || (filtro === 'abiertos' ? ['abierto', 'en_revision'].includes(c.estado) : c.estado === filtro));
  const open = (c) => { setSel(c); setF({ estado: c.estado === 'abierto' ? 'en_revision' : c.estado, respuesta: c.respuesta }); };
  const save = async () => {
    setBusy(true);
    const { error } = await sb.from('fg_casos').update({ estado: f.estado, respuesta: cleanText(f.respuesta, 1000), actualizado: new Date().toISOString() }).eq('id', sel.id);
    setBusy(false);
    if (error) return notify(errMsg(error));
    notify('Caso actualizado'); setSel(null); refresh();
  };
  return (
    <>
      <Chips label="Filtro" value={filtro} onChange={setFiltro} options={[{ value: 'abiertos', label: 'Pendientes' }, { value: 'resuelto', label: 'Resueltos' }, { value: 'rechazado', label: 'Rechazados' }, { value: 'todos', label: 'Todos' }]} />
      {!list.length ? <p className="muted pad">No hay casos aquí. 🎉</p> : (
        <ul className="case-list">{list.map((c) => (
          <li key={c.id}><button onClick={() => open(c)}>
            <div className="grow"><b>{CASO_TIPOS[c.tipo]}</b><small className="muted">{c.fg_pedidos?.folio} · {c.fg_pedidos?.nombre} · {fmtDateTime(c.creado)}</small><p className="small">“{c.mensaje}”</p></div>
            <CasoPill s={c.estado} />
          </button></li>))}
        </ul>
      )}
      <Sheet open={!!sel} onClose={() => setSel(null)} title="Resolver caso">
        {sel && (<>
          <p><b>{CASO_TIPOS[sel.tipo]}</b> · pedido <b className="mono">{sel.fg_pedidos?.folio}</b><br /><small className="muted">{sel.fg_pedidos?.nombre} · WhatsApp {sel.fg_pedidos?.telefono} · Pide: {sel.solucion_deseada}</small></p>
          <p className="note">“{sel.mensaje}”</p>
          <label className="lbl">Estado</label>
          <Chips wrap label="Estado" value={f.estado} onChange={(v) => setF({ ...f, estado: v })} options={Object.entries(CASO_ESTADOS).map(([value, c]) => ({ value, label: c.label }))} />
          <Field label="Respuesta para el cliente" hint="El cliente la verá en su pedido.">
            <textarea className="input" rows={4} maxLength={1000} value={f.respuesta} onChange={(e) => setF({ ...f, respuesta: e.target.value })} placeholder="Ej. Te cambiamos la pieza el jueves en el mismo punto." />
          </Field>
          <div className="row2 sheet-actions"><button className="btn ghost" onClick={() => setSel(null)}>Cancelar</button><button className="btn" disabled={busy} onClick={save}>Guardar</button></div>
        </>)}
      </Sheet>
    </>
  );
}

export function Ajustes() {
  const { ajustes, setAjustes, notify } = useAdmin();
  const [f, setF] = useState({ ...ajustes, horarios: ajustes.horarios.join('\n') });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const clabeOk = isValidClabe(f.clabe);

  const save = async () => {
    setErr('');
    if (!clabeOk) return setErr('La CLABE no es válida (revisa los 18 dígitos).');
    if (cleanText(f.titular, 80).length < 5) return setErr('Escribe el titular tal como aparece en tu banco.');
    if (f.whatsapp && !/^\d{10}$/.test(f.whatsapp)) return setErr('WhatsApp de 10 dígitos.');
    const horarios = f.horarios.split('\n').map((h) => cleanText(h, 30)).filter(Boolean);
    if (!horarios.length) return setErr('Agrega al menos un horario.');
    const row = { nombre: cleanText(f.nombre, 60), titular: cleanText(f.titular, 80), banco: cleanText(f.banco, 40), clabe: f.clabe, whatsapp: f.whatsapp,
      punto: cleanText(f.punto, 80), punto_detalle: cleanText(f.punto_detalle, 160), horarios, horas_pago: Math.max(1, Math.min(72, parseInt(f.horas_pago, 10) || 24)), actualizado: new Date().toISOString() };
    setBusy(true);
    const { data, error } = await sb.from('fg_ajustes').update(row).eq('id', 1).select().single();
    setBusy(false);
    if (error) return setErr(errMsg(error));
    setAjustes(data); notify('Ajustes guardados');
  };

  const checks = [
    { ok: isValidClabe(ajustes.clabe) && ajustes.clabe !== '002180700000000008', t: 'CLABE real configurada', f: 'Aún tienes la CLABE de ejemplo. Mientras sea inválida, la transferencia se oculta en la tienda.' },
    { ok: ajustes.titular !== 'NOMBRE DEL TITULAR', t: 'Titular configurado', f: 'Tus clientes comparan este nombre en su app del banco.' },
    { ok: /^\d{10}$/.test(ajustes.whatsapp), t: 'WhatsApp de ventas', f: 'Sin WhatsApp los clientes no pueden mandarte su comprobante.' },
    { ok: location.protocol === 'https:', t: 'Sitio con HTTPS', f: 'Publica sólo por HTTPS.' },
  ];

  return (
    <div className="settings">
      <section className="panel">
        <div className="panel-head"><h2>Checklist de seguridad</h2></div>
        <ul className="checks">{checks.map((c) => (
          <li key={c.t} className={c.ok ? 'ok' : 'bad'}><span className="ck">{c.ok ? <I.Check size={16} /> : '!'}</span><div><b>{c.t}</b>{!c.ok && <small>{c.f}</small>}</div></li>
        ))}</ul>
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Datos para recibir transferencias</h2></div>
        <p className="hint"><I.Shield size={14} /> Sólo CLABE, titular y banco. Nunca guardes aquí número de tarjeta, NIP ni contraseñas.</p>
        <Field label="CLABE (18 dígitos)" error={f.clabe.length === 18 && !clabeOk ? 'Dígito verificador incorrecto.' : ''} hint={clabeOk ? `✓ Válida · ${formatClabe(f.clabe)}` : ''}>
          <input className="input mono" inputMode="numeric" maxLength={18} value={f.clabe} onChange={(e) => setF({ ...f, clabe: onlyDigits(e.target.value, 18) })} />
        </Field>
        <div className="row2">
          <Field label="Titular"><input className="input" maxLength={80} value={f.titular} onChange={set('titular')} /></Field>
          <Field label="Banco"><input className="input" maxLength={40} value={f.banco} onChange={set('banco')} /></Field>
        </div>
        <div className="row2">
          <Field label="WhatsApp de ventas"><input className="input" inputMode="numeric" maxLength={10} value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: onlyDigits(e.target.value) })} /></Field>
          <Field label="Horas para pagar (apartado)"><input className="input" inputMode="numeric" maxLength={2} value={f.horas_pago} onChange={(e) => setF({ ...f, horas_pago: onlyDigits(e.target.value, 2) })} /></Field>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Entregas</h2></div>
        <Field label="Punto de entrega"><input className="input" maxLength={80} value={f.punto} onChange={set('punto')} /></Field>
        <Field label="Indicaciones"><input className="input" maxLength={160} value={f.punto_detalle} onChange={set('punto_detalle')} /></Field>
        <Field label="Horarios (uno por línea)"><textarea className="input" rows={4} value={f.horarios} onChange={set('horarios')} /></Field>
      </section>
      {err && <p className="err-box" role="alert"><I.Alert size={16} /> {err}</p>}
      <button className="btn" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar ajustes'}</button>
    </div>
  );
}
