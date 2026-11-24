import { useMemo, useState } from 'react';
import { ESTADOS, errMsg, fmtDateTime, fmtDay, money } from '../lib/db.js';
import { cleanText } from '../security.js';
import { Chips, ConditionBadge, Img, Sheet, StatusPill } from '../components/UI.jsx';
import * as I from '../components/Icons.jsx';
import { sb, useAdmin } from './data.jsx';

const FILTROS = [
  { value: 'activos', label: 'Activos' }, { value: 'pago_pendiente', label: 'Esperando pago' },
  { value: 'por_confirmar', label: 'Por confirmar' }, { value: 'pagado', label: 'Pagados' }, { value: 'listo', label: 'Listos' },
  { value: 'entregado', label: 'Entregados' }, { value: 'cancelado', label: 'Cancelados' }, { value: 'todos', label: 'Todos' },
];

export function Pedidos() {
  const { orders } = useAdmin();
  const [filtro, setFiltro] = useState('activos');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return orders.filter((o) =>
      (filtro === 'todos' || (filtro === 'activos' ? !['entregado', 'cancelado'].includes(o.estado) : o.estado === filtro)) &&
      (!t || `${o.folio} ${o.nombre} ${o.telefono} ${o.correo}`.toLowerCase().includes(t)));
  }, [orders, filtro, q]);
  const o = orders.find((x) => x.id === sel);
  const vencido = (x) => x.estado === 'pago_pendiente' && x.vence && new Date(x.vence) < new Date();

  return (
    <>
      <div className="toolbar">
        <label className="search-input"><I.Search size={18} /><input type="search" placeholder="Folio, nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar pedidos" /></label>
      </div>
      <Chips label="Filtro" options={FILTROS} value={filtro} onChange={setFiltro} />
      {!list.length ? <p className="muted pad">No hay pedidos con este filtro.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Folio</th><th>Cliente</th><th>Entrega</th><th>Pago</th><th className="num">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id} onClick={() => setSel(x.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel(x.id)}>
                  <td><b className="mono">{x.folio}</b><small className="muted">{fmtDateTime(x.creado)}</small></td>
                  <td>{x.nombre}<small className="muted">{x.telefono}</small></td>
                  <td>{fmtDay(x.dia)}<small className="muted">{x.horario}</small></td>
                  <td>{x.pago === 'transferencia' ? 'SPEI' : 'Efectivo'}{vencido(x) && <small className="err">Vencido</small>}</td>
                  <td className="num"><b>{money(x.total)}</b></td>
                  <td><StatusPill s={x.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {o && <PedidoDetalle o={o} onClose={() => setSel(null)} />}
    </>
  );
}

function PedidoDetalle({ o, onClose }) {
  const { refresh, notify, ajustes } = useAdmin();
  const [code, setCode] = useState('');
  const [nota, setNota] = useState(o.nota_admin);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const update = async (patch, ok) => {
    setBusy(true);
    const { error } = await sb.from('fg_pedidos').update(patch).eq('id', o.id);
    setBusy(false); setConfirm(null);
    if (error) return notify(errMsg(error));
    notify(ok); refresh();
  };
  const codeOk = code === o.codigo_entrega;
  const waMsg = `Hola ${o.nombre.split(' ')[0]}, te escribimos de Fri & Gabo sobre tu pedido ${o.folio}.`;
  const cerrado = ['entregado', 'cancelado'].includes(o.estado);

  const acciones = [];
  if (['pago_pendiente', 'por_confirmar'].includes(o.estado)) {
    acciones.push(o.pago === 'transferencia'
      ? { label: 'Marcar pago verificado', run: () => setConfirm('pagado') }
      : { label: 'Confirmar pedido', run: () => update({ estado: 'pagado' }, 'Pedido confirmado') });
  }
  if (o.estado === 'pagado') acciones.push({ label: 'Marcar listo para entregar', run: () => update({ estado: 'listo' }, 'Pedido listo') });

  return (
    <Sheet open onClose={onClose} title={o.folio} wide>
      <div className="detail-grid">
        <div>
          <div className="row-between"><StatusPill s={o.estado} /><small className="muted">Creado {fmtDateTime(o.creado)}</small></div>
          <section className="box">
            <div className="box-head"><I.User size={18} /><b>{o.nombre}</b></div>
            <p className="small">{o.correo}<br />WhatsApp {o.telefono}</p>
            <a className="btn wa sm" href={`https://wa.me/52${o.telefono}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
          </section>
          <section className="box">
            <div className="box-head"><I.Pin size={18} /><b>Entrega {fmtDay(o.dia)} · {o.horario}</b></div>
            <p className="small muted">{ajustes?.punto}</p>
            {o.nota && <p className="note">Nota del cliente: “{o.nota}”</p>}
          </section>
          <div className="summary">
            {o.items.map((i, k) => (
              <div key={k} className="sum-item"><Img src={i.imagen} alt="" className="thumb xs" />
                <div className="grow"><span>{i.qty} × {i.nombre}</span><small className="muted"><ConditionBadge c={i.condicion} /> {i.talla && `Talla ${i.talla}`}</small></div>
                <span>{money(i.precio * i.qty)}</span></div>
            ))}
            <div className="sum-row total"><span>Total · {o.pago === 'transferencia' ? 'SPEI' : 'Efectivo'}</span><span>{money(o.total)}</span></div>
          </div>
        </div>
        <div>
          {o.estado === 'pago_pendiente' && (
            <p className="warn-box"><I.Shield size={16} /> Marca el pago sólo cuando veas en <b>tu app del banco</b> un depósito de <b>{money(o.total)}</b> con concepto <b>{o.folio}</b>. Una captura de pantalla no es prueba.
              {o.vence && <><br />Apartado vence: {fmtDateTime(o.vence)}</>}</p>
          )}
          {!cerrado && (
            <section className="box">
              <div className="box-head"><I.Lock size={18} /><b>Entregar en el metro</b></div>
              <p className="small muted">Pide al cliente su código de 4 dígitos.{o.pago === 'efectivo' && ' Cobra en efectivo antes de entregar.'}</p>
              <input className="input center mono" inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="0000" aria-label="Código de entrega" />
              {code.length === 4 && <p className={codeOk ? 'ok-text' : 'err'}>{codeOk ? '✓ Código correcto' : '✗ No coincide. No entregues.'}</p>}
              <button className="btn full" disabled={!codeOk || busy || (o.pago === 'transferencia' && o.estado === 'pago_pendiente')}
                onClick={() => update({ estado: 'entregado' }, 'Pedido entregado')}><I.Check size={18} /> Marcar entregado</button>
              {o.pago === 'transferencia' && o.estado === 'pago_pendiente' && <p className="hint">Primero verifica el pago.</p>}
            </section>
          )}
          <div className="status-actions">
            {acciones.map((a) => <button key={a.label} className="btn sm" disabled={busy} onClick={a.run}>{a.label}</button>)}
            {!cerrado && <button className="btn ghost sm danger" disabled={busy} onClick={() => setConfirm('cancelado')}>Cancelar pedido</button>}
          </div>
          <label className="lbl">Nota interna (sólo tú la ves)</label>
          <textarea className="input" rows={2} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} />
          <button className="btn ghost sm" disabled={busy || nota === o.nota_admin} onClick={() => update({ nota_admin: cleanText(nota, 300) }, 'Nota guardada')}>Guardar nota</button>
          <label className="lbl">Historial</label>
          <ol className="history">
            {o.historial.map((h, i) => <li key={i}><StatusPill s={h.estado} /> <small className="muted">{fmtDateTime(h.fecha)}</small></li>)}
          </ol>
        </div>
      </div>
      {confirm && (
        <div className="confirm-bar">
          <p>{confirm === 'pagado' ? `¿Confirmas que ya ves ${money(o.total)} con concepto ${o.folio} en tu banco?` : '¿Cancelar este pedido? Se devuelve el stock y no se puede reactivar.'}</p>
          <div className="row2"><button className="btn ghost" onClick={() => setConfirm(null)}>No</button>
            <button className="btn" disabled={busy} onClick={() => update({ estado: confirm }, confirm === 'pagado' ? 'Pago verificado' : 'Pedido cancelado')}>Sí, confirmar</button></div>
        </div>
      )}
    </Sheet>
  );
}

export { ESTADOS };
