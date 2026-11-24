import { useMemo, useState } from 'react';
import { CONDITIONS, fmtDay, money } from '../lib/db.js';
import { Chips, Img, StatusPill } from '../components/UI.jsx';
import * as I from '../components/Icons.jsx';
import { useAdmin, VENTA, dayKey } from './data.jsx';

const RANGOS = [{ value: 1, label: 'Hoy' }, { value: 7, label: '7 días' }, { value: 30, label: '30 días' }, { value: 90, label: '90 días' }];

function startOf(days) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days - 1)); return d; }

export function Resumen({ go }) {
  const { orders, products, casos } = useAdmin();
  const [rango, setRango] = useState(7);
  const costoDe = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.costo])), [products]);

  const stats = useMemo(() => {
    const from = startOf(rango); const prevFrom = startOf(rango * 2);
    const ventas = orders.filter((o) => VENTA.includes(o.estado));
    const inR = ventas.filter((o) => new Date(o.creado) >= from);
    const prev = ventas.filter((o) => new Date(o.creado) >= prevFrom && new Date(o.creado) < from);
    const sum = (a) => a.reduce((s, o) => s + Number(o.total), 0);
    let costoConocido = 0, ventaConCosto = 0;
    inR.forEach((o) => o.items.forEach((i) => { const c = costoDe[i.id]; if (c != null) { costoConocido += c * i.qty; ventaConCosto += i.precio * i.qty; } }));
    const porCond = {};
    inR.forEach((o) => o.items.forEach((i) => { porCond[i.condicion] = (porCond[i.condicion] || 0) + i.precio * i.qty; }));
    const top = {};
    inR.forEach((o) => o.items.forEach((i) => { top[i.id] = top[i.id] || { ...i, qty: 0, monto: 0 }; top[i.id].qty += i.qty; top[i.id].monto += i.precio * i.qty; }));
    const nDias = Math.max(rango, 7);
    const serie = Array.from({ length: nDias }, (_, k) => { const d = startOf(nDias); d.setDate(d.getDate() + k); return { key: dayKey(d), d, total: 0, n: 0 }; });
    const idx = Object.fromEntries(serie.map((s, i) => [s.key, i]));
    ventas.forEach((o) => { const i = idx[dayKey(o.creado)]; if (i != null) { serie[i].total += Number(o.total); serie[i].n += 1; } });
    const porCobrar = orders.filter((o) => ['pago_pendiente', 'por_confirmar'].includes(o.estado));
    return {
      total: sum(inR), prevTotal: sum(prev), n: inR.length, ticket: inR.length ? sum(inR) / inR.length : 0,
      ganancia: ventaConCosto ? ventaConCosto - costoConocido : null, porCobrar: sum(porCobrar), nPorCobrar: porCobrar.length,
      porCond, top: Object.values(top).sort((a, b) => b.monto - a.monto).slice(0, 5), serie,
    };
  }, [orders, rango, costoDe]);

  const hoy = dayKey(new Date()); const manana = dayKey(new Date(Date.now() + 86400000));
  const entregas = orders.filter((o) => !['entregado', 'cancelado'].includes(o.estado) && [hoy, manana].includes(o.dia))
    .sort((a, b) => a.dia.localeCompare(b.dia) || a.horario.localeCompare(b.horario));
  const bajos = products.filter((p) => p.activo && p.stock <= 1);
  const casosAb = casos.filter((c) => ['abierto', 'en_revision'].includes(c.estado));
  const delta = stats.prevTotal ? Math.round(((stats.total - stats.prevTotal) / stats.prevTotal) * 100) : null;
  const condTotal = Object.values(stats.porCond).reduce((a, b) => a + b, 0);

  return (
    <div className="dash">
      <Chips label="Periodo" options={RANGOS} value={rango} onChange={setRango} />
      <div className="kpis">
        <div className="kpi hero"><small>Ventas</small><b>{money(stats.total)}</b>
          {delta != null && <span className={`delta ${delta >= 0 ? 'up' : 'down'}`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs periodo anterior</span>}</div>
        <div className="kpi"><small>Pedidos pagados</small><b>{stats.n}</b></div>
        <div className="kpi"><small>Ticket promedio</small><b>{money(stats.ticket)}</b></div>
        <div className="kpi"><small>Ganancia estimada</small><b>{stats.ganancia == null ? '—' : money(stats.ganancia)}</b>
          {stats.ganancia == null && <span className="muted tiny">Agrega el costo a tus productos</span>}</div>
        <button className="kpi warn" onClick={() => go('pedidos')}><small>Por cobrar</small><b>{money(stats.porCobrar)}</b>
          <span className="muted tiny">{stats.nPorCobrar} pedido(s) sin pago</span></button>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Ventas por día</h2><span className="muted small">últimos {stats.serie.length} días</span></div>
        <BarChart data={stats.serie} />
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><h2>Entregas hoy y mañana</h2><span className="muted small">{entregas.length}</span></div>
          {!entregas.length ? <p className="muted small">No hay entregas programadas.</p> : (
            <ul className="mini-list">{entregas.map((o) => (
              <li key={o.id}><div className="grow"><b className="mono">{o.folio}</b><small className="muted">{o.nombre} · {fmtDay(o.dia)} {o.horario}</small></div><StatusPill s={o.estado} /></li>
            ))}</ul>
          )}
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Ventas por estado del producto</h2></div>
          {!condTotal ? <p className="muted small">Sin ventas en este periodo.</p> : Object.entries(CONDITIONS).map(([k, c]) => {
            const v = stats.porCond[k] || 0;
            return (
              <div key={k} className="share" title={`${c.label}: ${money(v)}`}>
                <div className="share-row"><span><i className={`dotc dot-${k}`} />{c.label}</span><span>{money(v)} · {Math.round((v / condTotal) * 100)}%</span></div>
                <div className="share-track"><div className={`share-fill fill-${k}`} style={{ width: `${(v / condTotal) * 100}%` }} /></div>
              </div>
            );
          })}
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Más vendidos</h2></div>
          {!stats.top.length ? <p className="muted small">Sin ventas en este periodo.</p> : (
            <ul className="mini-list">{stats.top.map((t) => (
              <li key={t.id}><Img src={t.imagen} alt="" className="thumb xs" /><div className="grow"><b>{t.nombre}</b><small className="muted">{t.qty} vendidos</small></div><b>{money(t.monto)}</b></li>
            ))}</ul>
          )}
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Requiere atención</h2></div>
          <ul className="mini-list">
            <li><I.Receipt size={18} /><div className="grow">Pedidos por verificar pago</div><button className="link" onClick={() => go('pedidos')}>{stats.nPorCobrar}</button></li>
            <li><I.Chat size={18} /><div className="grow">Casos abiertos</div><button className="link" onClick={() => go('casos')}>{casosAb.length}</button></li>
            <li><I.Box size={18} /><div className="grow">Productos con stock 0–1</div><button className="link" onClick={() => go('productos')}>{bajos.length}</button></li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function BarChart({ data }) {
  const [hover, setHover] = useState(null);
  const W = 720, H = 220, P = { l: 52, r: 8, t: 12, b: 26 };
  const max = Math.max(...data.map((d) => d.total), 1);
  const e = 10 ** Math.floor(Math.log10(max));
  const nice = Math.ceil(max / e) * e;
  const bw = (W - P.l - P.r) / data.length;
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / nice);
  const ticks = [0, nice / 2, nice];
  const labelEvery = Math.ceil(data.length / 8);
  const short = (v) => (v >= 1000 ? '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : '$' + v);
  if (!data.some((d) => d.total)) {
    return <p className="muted small chart-empty">Aún no hay ventas pagadas en estos días. Aparecerán aquí cuando marques un pedido como “Pago verificado”.</p>;
  }
  return (
    <div className="chart" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ventas por día">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{short(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = P.l + i * bw;
          const top = y(d.total);
          const h = H - P.b - top;
          const r = Math.max(0, Math.min(4, h / 2, (bw - 2) / 2));
          const path = `M${x + 1},${H - P.b} V${top + r} Q${x + 1},${top} ${x + 1 + r},${top} H${x + bw - 1 - r} Q${x + bw - 1},${top} ${x + bw - 1},${top + r} V${H - P.b} Z`;
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)} tabIndex={0} aria-label={`${fmtDay(d.d)}: ${money(d.total)}`}>
              <rect x={x} y={P.t} width={bw} height={H - P.t - P.b} fill="transparent" />
              {d.total > 0 && <path className={`bar ${hover === i ? 'on' : ''}`} d={path} />}
              {i % labelEvery === 0 && <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="axis">{d.d.getDate()}/{d.d.getMonth() + 1}</text>}
            </g>
          );
        })}
        <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} className="baseline" />
      </svg>
      {hover != null && (
        <div className="tip" style={{ left: `${((P.l + (hover + 0.5) * bw) / W) * 100}%` }}>
          <b>{fmtDay(data[hover].d)}</b><span>{money(data[hover].total)}</span><small>{data[hover].n} pedido(s)</small>
        </div>
      )}
    </div>
  );
}
