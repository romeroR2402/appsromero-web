import { useEffect, useState } from 'react';
import { CONDITIONS, errMsg, fmtDay, money } from '../lib/db.js';
import { sb, useStore } from './store.jsx';
import { cleanText, isValidClabe, isValidPhone, onlyDigits } from '../security.js';
import { ConditionBadge, Empty, Field, Header, Img, Qty, Sheet, Spinner } from '../components/UI.jsx';
import * as I from '../components/Icons.jsx';

export function ProductScreen({ id, go, back }) {
  const { byId, addToCart, favs, toggleFav, notify, loading } = useStore();
  const p = byId(id);
  const [color, setColor] = useState();
  const [talla, setTalla] = useState();
  const [qty, setQty] = useState(1);
  const [slide, setSlide] = useState(0);
  useEffect(() => { if (p) { setColor((c) => c ?? p.colores[0]); setTalla((t) => t ?? p.tallas[0]); } }, [p]);
  if (loading) return <div className="screen"><Spinner /></div>;
  if (!p) return <div className="screen"><Header title="" onBack={back} /><Empty title="Producto no disponible" text="Puede que ya se haya vendido." /></div>;
  const soldOut = p.stock === 0;
  return (
    <div className="screen detail">
      <div className="hero">
        <button className="icon-btn float" aria-label="Regresar" onClick={back}><I.Back /></button>
        <Img src={p.imagenes[slide]} alt={p.nombre} />
        {p.imagenes.length > 1 && <div className="dots">{p.imagenes.map((_, i) => <button key={i} aria-label={`Foto ${i + 1}`} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} />)}</div>}
      </div>
      <div className="detail-body">
        <div className="title-row">
          <h1>{p.nombre}</h1>
          <button className="icon-btn" aria-label="Favorito" onClick={() => toggleFav(p.id)}><I.Heart filled={favs.includes(p.id)} /></button>
        </div>
        <div className="meta"><ConditionBadge c={p.condicion} solid /> <span className="pill">{p.vendidos} vendidos</span> <I.Star size={14} /> {Number(p.calificacion).toFixed(1)}</div>
        <div className={`cond-explain cond-${p.condicion}`}><I.Box size={18} /><span><b>{CONDITIONS[p.condicion].label}:</b> {CONDITIONS[p.condicion].hint}</span></div>
        <h2 className="lbl">Descripción</h2>
        <p className="desc">{p.descripcion}</p>
        {p.tallas.length > 0 && (<><h2 className="lbl">Talla</h2>
          <div className="sizes">{p.tallas.map((s) => <button key={s} aria-pressed={talla === s} className={talla === s ? 'on' : ''} onClick={() => setTalla(s)}>{s}</button>)}</div></>)}
        {p.colores.length > 0 && (<><h2 className="lbl">Color</h2>
          <div className="colors">{p.colores.map((c) => (
            <button key={c} aria-label={`Color ${c}`} aria-pressed={color === c} style={{ background: c }} className={color === c ? 'on' : ''} onClick={() => setColor(c)}>{color === c && <I.Check size={16} />}</button>))}
          </div></>)}
        <div className="qty-row">
          <h2 className="lbl">Cantidad</h2>
          <Qty value={qty} max={Math.max(1, Math.min(10, p.stock))} onChange={setQty} />
          <span className="muted small">{soldOut ? 'Agotado' : `${p.stock} disponible${p.stock > 1 ? 's' : ''}`}</span>
        </div>
      </div>
      <div className="buy-bar">
        <div><small className="muted">Total</small><strong>{money(p.precio * qty)}</strong></div>
        <button className="btn" disabled={soldOut} onClick={() => { addToCart({ id: p.id, color, talla, qty }); notify('Agregado al carrito'); go('/carrito'); }}>
          <I.Bag size={18} /> {soldOut ? 'Agotado' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  );
}

export function CartScreen({ go }) {
  const { cart, cartTotal, setQty, removeFromCart, user } = useStore();
  const [confirm, setConfirm] = useState(null);
  return (
    <div className="screen narrow">
      <Header title="Mi carrito" />
      {cart.length === 0 ? (
        <Empty title="Tu carrito está vacío" text="Explora nuevos, usados y productos con caja dañada a precio especial."
          action={<button className="btn" onClick={() => go('/')}>Ver productos</button>} />
      ) : (<>
        <ul className="cart-list">{cart.map((x) => <CartItem key={x.key} x={x} onQty={(q) => setQty(x.key, q)} onRemove={() => setConfirm(x)} />)}</ul>
        <div className="buy-bar">
          <div><small className="muted">Total</small><strong>{money(cartTotal)}</strong></div>
          <button className="btn" onClick={() => go(user ? '/checkout' : '/cuenta?next=/checkout')}>{user ? 'Continuar' : 'Inicia sesión y paga'} <I.Arrow size={18} /></button>
        </div>
      </>)}
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="¿Quitar del carrito?">
        {confirm && <ul className="cart-list"><CartItem x={confirm} readOnly /></ul>}
        <div className="row2 sheet-actions">
          <button className="btn ghost" onClick={() => setConfirm(null)}>Cancelar</button>
          <button className="btn" onClick={() => { removeFromCart(confirm.key); setConfirm(null); }}>Sí, quitar</button>
        </div>
      </Sheet>
    </div>
  );
}

function CartItem({ x, onQty, onRemove, readOnly }) {
  const p = x.product;
  return (
    <li className="cart-item">
      <Img src={p.imagenes[0]} alt={p.nombre} className="thumb" />
      <div className="ci-body">
        <div className="ci-top"><b>{p.nombre}</b>{!readOnly && <button className="icon-btn sm" aria-label="Quitar" onClick={onRemove}><I.Trash size={18} /></button>}</div>
        <div className="muted small ci-opts">
          <ConditionBadge c={p.condicion} />
          {x.color && <><span className="swatch" style={{ background: x.color }} /> Color</>}
          {x.talla && <> · Talla {x.talla}</>}
        </div>
        <div className="ci-bottom"><strong>{money(p.precio)}</strong>
          {readOnly ? <span className="muted">x{x.qty}</span> : <Qty value={x.qty} max={Math.min(10, p.stock)} onChange={onQty} />}</div>
      </div>
    </li>
  );
}

function nextDays(n) {
  const out = []; const d = new Date(); d.setHours(12, 0, 0, 0);
  while (out.length < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) out.push(d.toLocaleDateString('en-CA')); }
  return out;
}

export function Checkout({ go, back }) {
  const { cart, cartTotal, clearCart, ajustes, perfil, user, loadProducts, loadPerfil } = useStore();
  const days = nextDays(6);
  const transferOk = ajustes && isValidClabe(ajustes.clabe);
  const [form, setForm] = useState({ nombre: '', telefono: '', dia: days[0], horario: '', pago: 'transferencia', nota: '', ok: false });
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverErr, setServerErr] = useState('');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  useEffect(() => { if (perfil) setForm((f) => ({ ...f, nombre: f.nombre || perfil.nombre, telefono: f.telefono || perfil.telefono })); }, [perfil]);
  useEffect(() => { if (ajustes) setForm((f) => ({ ...f, horario: f.horario || ajustes.horarios[0], pago: transferOk ? f.pago : 'efectivo' })); }, [ajustes, transferOk]);

  if (!user) { go('/cuenta?next=/checkout', { replace: true }); return null; }
  if (!cart.length) return <div className="screen narrow"><Header title="Entrega y pago" onBack={back} /><Empty title="No hay nada que pagar" text="Agrega productos a tu carrito." /></div>;
  if (!ajustes) return <div className="screen"><Spinner /></div>;

  const errors = {
    nombre: cleanText(form.nombre, 80).length < 3 ? 'Escribe tu nombre (mín. 3 letras).' : '',
    telefono: !isValidPhone(form.telefono) ? 'WhatsApp de 10 dígitos.' : '',
    ok: !form.ok ? 'Necesitamos tu confirmación.' : '',
  };
  const valid = !Object.values(errors).some(Boolean);

  const submit = async () => {
    setTouched(true); setServerErr('');
    if (!valid || sending) return;
    setSending(true);
    // El servidor recalcula precios, valida stock y genera folio + código de entrega.
    const { data, error } = await sb.rpc('fg_crear_pedido', {
      p_items: cart.map((x) => ({ id: x.id, qty: x.qty, color: x.color || '', talla: x.talla || '' })),
      p_dia: form.dia, p_horario: form.horario, p_pago: form.pago,
      p_nombre: cleanText(form.nombre, 80), p_telefono: onlyDigits(form.telefono), p_nota: cleanText(form.nota, 200),
    });
    setSending(false);
    if (error) { setServerErr(errMsg(error)); loadProducts(); return; }
    clearCart(); loadProducts(); loadPerfil();
    go(`/pedido/${data}`, { replace: true });
  };

  return (
    <div className="screen narrow checkout">
      <Header title="Entrega y pago" onBack={back} />
      <section className="box">
        <div className="box-head"><I.Pin size={18} /><b>Punto de entrega</b></div>
        <p><b>{ajustes.punto}</b><br /><span className="muted small">{ajustes.punto_detalle}</span></p>
      </section>
      <label className="lbl">Día</label>
      <div className="chips" role="radiogroup" aria-label="Día">
        {days.map((d) => <button key={d} role="radio" aria-checked={form.dia === d} className={`chip ${form.dia === d ? 'on' : ''}`} onClick={() => set('dia')(d)}>{fmtDay(d)}</button>)}
      </div>
      <label className="lbl">Horario</label>
      <div className="chips" role="radiogroup" aria-label="Horario">
        {ajustes.horarios.map((s) => <button key={s} role="radio" aria-checked={form.horario === s} className={`chip ${form.horario === s ? 'on' : ''}`} onClick={() => set('horario')(s)}>{s}</button>)}
      </div>
      <Field label="Nombre de quien recoge" error={touched && errors.nombre}>
        <input className={`input ${touched && errors.nombre ? 'bad' : ''}`} autoComplete="name" maxLength={80} value={form.nombre} onChange={(e) => set('nombre')(e.target.value)} />
      </Field>
      <Field label="WhatsApp" error={touched && errors.telefono}>
        <input className={`input ${touched && errors.telefono ? 'bad' : ''}`} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="5512345678" maxLength={10}
          value={form.telefono} onChange={(e) => set('telefono')(onlyDigits(e.target.value))} />
      </Field>
      <Field label="Nota (opcional)">
        <input className="input" maxLength={200} placeholder="Ej. llevaré playera roja" value={form.nota} onChange={(e) => set('nota')(e.target.value)} />
      </Field>
      <label className="lbl">Forma de pago</label>
      <div className="pay-opts">
        <button className={`pay ${form.pago === 'transferencia' ? 'on' : ''}`} disabled={!transferOk} onClick={() => set('pago')('transferencia')} aria-pressed={form.pago === 'transferencia'}>
          <b>Transferencia SPEI</b><small>{transferOk ? `Apartas tu producto ${ajustes.horas_pago} h` : 'No disponible por ahora'}</small>
        </button>
        <button className={`pay ${form.pago === 'efectivo' ? 'on' : ''}`} onClick={() => set('pago')('efectivo')} aria-pressed={form.pago === 'efectivo'}>
          <b>Efectivo al recibir</b><small>Pagas en el metro tras revisar</small>
        </button>
      </div>
      <label className="check">
        <input type="checkbox" checked={form.ok} onChange={(e) => set('ok')(e.target.checked)} />
        <span>Entiendo el estado de cada producto (nuevo, usado o caja dañada) y lo revisaré al recibirlo.</span>
      </label>
      {touched && errors.ok && <p className="err">{errors.ok}</p>}
      <aside className="checkout-side">
        <div className="summary">
          <b className="side-title">Tu pedido</b>
          {cart.map((x) => <div key={x.key} className="sum-row"><span>{x.qty} × {x.product.nombre}</span><span>{money(x.product.precio * x.qty)}</span></div>)}
          <div className="sum-row total"><span>Total</span><span>{money(cartTotal)}</span></div>
        </div>
        {serverErr && <p className="err-box" role="alert"><I.Alert size={16} /> {serverErr}</p>}
        <div className="buy-bar">
          <div><small className="muted">Total</small><strong>{money(cartTotal)}</strong></div>
          <button className="btn" onClick={submit} disabled={sending}><I.Lock size={18} /> {sending ? 'Enviando…' : 'Confirmar pedido'}</button>
        </div>
        <p className="muted small side-note"><I.Shield size={14} /> Precio y stock se confirman en el servidor al crear tu pedido.</p>
      </aside>
    </div>
  );
}
