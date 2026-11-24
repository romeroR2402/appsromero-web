import { useMemo, useState } from 'react';
import { CATEGORIES, CONDITIONS, errMsg, money } from '../lib/db.js';
import { cleanText, prepareImage } from '../security.js';
import { Chips, ConditionBadge, Field, Img, Sheet } from '../components/UI.jsx';
import * as I from '../components/Icons.jsx';
import { sb, useAdmin } from './data.jsx';

const EMPTY = { nombre: '', categoria: CATEGORIES[0], condicion: 'nuevo', precio: '', precio_antes: '', costo: '', stock: '1', descripcion: '', imagenes: [], colores: [], tallas: '', activo: true };

export function Productos() {
  const { products } = useAdmin();
  const [q, setQ] = useState('');
  const [cond, setCond] = useState('all');
  const [edit, setEdit] = useState(null);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => (cond === 'all' || p.condicion === cond || (cond === 'ocultos' && !p.activo) || (cond === 'agotados' && p.stock === 0))
      && (!t || `${p.nombre} ${p.categoria}`.toLowerCase().includes(t)));
  }, [products, q, cond]);
  const valorInv = products.filter((p) => p.activo).reduce((s, p) => s + p.precio * p.stock, 0);

  return (
    <>
      <div className="kpis compact">
        <div className="kpi"><small>Productos activos</small><b>{products.filter((p) => p.activo).length}</b></div>
        <div className="kpi"><small>Unidades en stock</small><b>{products.reduce((s, p) => s + (p.activo ? p.stock : 0), 0)}</b></div>
        <div className="kpi"><small>Valor de inventario</small><b>{money(valorInv)}</b></div>
      </div>
      <div className="toolbar">
        <label className="search-input"><I.Search size={18} /><input type="search" placeholder="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar productos" /></label>
        <button className="btn" onClick={() => setEdit({ ...EMPTY })}><I.Plus size={18} /> Nuevo producto</button>
      </div>
      <Chips label="Filtro" value={cond} onChange={setCond} options={[{ value: 'all', label: 'Todos' },
        ...Object.entries(CONDITIONS).map(([value, c]) => ({ value, label: c.label })), { value: 'agotados', label: 'Agotados' }, { value: 'ocultos', label: 'Ocultos' }]} />
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Producto</th><th>Estado</th><th className="num">Precio</th><th className="num">Margen</th><th className="num">Stock</th><th className="num">Vendidos</th><th>Visible</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} onClick={() => setEdit(toForm(p))} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setEdit(toForm(p))}>
                <td><div className="prod-cell"><Img src={p.imagenes[0]} alt="" className="thumb xs" /><div><b>{p.nombre}</b><small className="muted">{p.categoria}</small></div></div></td>
                <td><ConditionBadge c={p.condicion} solid /></td>
                <td className="num">{money(p.precio)}</td>
                <td className="num">{p.costo != null ? `${Math.round(((p.precio - p.costo) / p.precio) * 100)}%` : <span className="muted">—</span>}</td>
                <td className={`num ${p.stock === 0 ? 'err' : p.stock <= 1 ? 'warn-t' : ''}`}>{p.stock}</td>
                <td className="num">{p.vendidos}</td>
                <td>{p.activo ? <span className="status ok">Sí</span> : <span className="status bad">Oculto</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <Editor initial={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

const toForm = (p) => ({ ...p, precio: String(p.precio), precio_antes: p.precio_antes ? String(p.precio_antes) : '', costo: p.costo != null ? String(p.costo) : '', stock: String(p.stock), tallas: p.tallas.join(', ') });

function Editor({ initial, onClose }) {
  const { refresh, notify } = useAdmin();
  const [f, setF] = useState(initial);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newColor, setNewColor] = useState('#1E2A5A');
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const num = (v) => v.replace(/[^\d.]/g, '').slice(0, 10);

  const onFiles = async (files) => {
    setErr(''); setUploading(true);
    try {
      const urls = [];
      for (const file of [...files].slice(0, 6 - f.imagenes.length)) {
        const blob = await prepareImage(file);
        const path = `productos/${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from('fg-fotos').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (error) throw error;
        urls.push(sb.storage.from('fg-fotos').getPublicUrl(path).data.publicUrl);
      }
      setF((x) => ({ ...x, imagenes: [...x.imagenes, ...urls] }));
    } catch (e) { setErr(errMsg(e)); }
    setUploading(false);
  };
  const move = (i, d) => setF((x) => { const a = [...x.imagenes]; const j = i + d; if (j < 0 || j >= a.length) return x; [a[i], a[j]] = [a[j], a[i]]; return { ...x, imagenes: a }; });

  const save = async () => {
    setErr('');
    const nombre = cleanText(f.nombre, 80);
    const precio = Number(f.precio);
    const precio_antes = f.precio_antes ? Number(f.precio_antes) : null;
    const costo = f.costo !== '' ? Number(f.costo) : null;
    if (nombre.length < 2) return setErr('Escribe el nombre.');
    if (!(precio > 0) || precio > 1e6) return setErr('Precio inválido.');
    if (precio_antes != null && precio_antes <= precio) return setErr('“Precio antes” debe ser mayor al precio actual.');
    if (f.condicion !== 'nuevo' && cleanText(f.descripcion, 1000).length < 15) return setErr('Para usados o caja dañada, describe el estado real (mín. 15 caracteres).');
    const row = {
      nombre, categoria: f.categoria, condicion: f.condicion, precio, precio_antes, costo,
      stock: Math.max(0, Math.min(9999, parseInt(f.stock, 10) || 0)), descripcion: cleanText(f.descripcion, 1000),
      imagenes: f.imagenes, colores: f.colores, tallas: f.tallas.split(',').map((s) => cleanText(s, 10)).filter(Boolean), activo: f.activo,
    };
    setBusy(true);
    const { error } = f.id ? await sb.from('fg_productos').update(row).eq('id', f.id) : await sb.from('fg_productos').insert(row);
    setBusy(false);
    if (error) return setErr(errMsg(error));
    notify(f.id ? 'Producto actualizado' : 'Producto publicado'); refresh(); onClose();
  };
  const remove = async () => {
    setBusy(true);
    const { error } = await sb.from('fg_productos').delete().eq('id', f.id);
    setBusy(false);
    if (error) return setErr('No se puede borrar (puede tener pedidos). Mejor ocúltalo.');
    notify('Producto eliminado'); refresh(); onClose();
  };

  return (
    <Sheet open onClose={onClose} title={f.id ? 'Editar producto' : 'Nuevo producto'} wide>
      <div className="detail-grid">
        <div>
          <label className="lbl">Fotos (hasta 6 · la primera es la portada)</label>
          <div className="photos">
            {f.imagenes.map((src, i) => (
              <div key={src} className="photo"><Img src={src} alt="" />
                <div className="photo-tools">
                  <button type="button" aria-label="Mover a la izquierda" onClick={() => move(i, -1)}>‹</button>
                  <button type="button" aria-label="Quitar foto" onClick={() => set('imagenes')(f.imagenes.filter((_, k) => k !== i))}><I.Close size={12} /></button>
                  <button type="button" aria-label="Mover a la derecha" onClick={() => move(i, 1)}>›</button>
                </div>
              </div>
            ))}
            {f.imagenes.length < 6 && (
              <label className={`photo add ${uploading ? 'busy' : ''}`}>{uploading ? '…' : <I.Plus />}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={uploading} onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
              </label>
            )}
          </div>
          <p className="hint">Las fotos se reducen y se les quita la ubicación GPS antes de subirlas.</p>
          <Field label="Nombre"><input className="input" maxLength={80} value={f.nombre} onChange={(e) => set('nombre')(e.target.value)} /></Field>
          <label className="lbl">Estado del producto</label>
          <Chips wrap label="Estado" value={f.condicion} onChange={set('condicion')} options={Object.entries(CONDITIONS).map(([value, c]) => ({ value, label: c.label }))} />
          <label className="lbl">Categoría</label>
          <Chips wrap label="Categoría" value={f.categoria} onChange={set('categoria')} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </div>
        <div>
          <div className="row2">
            <Field label="Precio de venta"><input className="input" inputMode="decimal" value={f.precio} onChange={(e) => set('precio')(num(e.target.value))} /></Field>
            <Field label="Precio antes (opcional)"><input className="input" inputMode="decimal" value={f.precio_antes} onChange={(e) => set('precio_antes')(num(e.target.value))} /></Field>
          </div>
          <div className="row2">
            <Field label="Tu costo (privado)" hint={f.costo && f.precio ? `Ganancia ${money(f.precio - f.costo)} por pieza` : 'Sólo tú lo ves'}>
              <input className="input" inputMode="decimal" value={f.costo} onChange={(e) => set('costo')(num(e.target.value))} /></Field>
            <Field label="Stock"><input className="input" inputMode="numeric" value={f.stock} onChange={(e) => set('stock')(e.target.value.replace(/\D/g, '').slice(0, 4))} /></Field>
          </div>
          <Field label="Descripción" hint={f.condicion === 'nuevo' ? '' : 'Detalla golpes, rayones o señales de uso: evita devoluciones.'}>
            <textarea className="input" rows={4} maxLength={1000} value={f.descripcion} onChange={(e) => set('descripcion')(e.target.value)} />
          </Field>
          <Field label="Tallas (separadas por coma)"><input className="input" value={f.tallas} onChange={(e) => set('tallas')(e.target.value)} placeholder="S, M, L" /></Field>
          <label className="lbl">Colores</label>
          <div className="colors edit">
            {f.colores.map((c) => <button type="button" key={c} style={{ background: c }} aria-label={`Quitar color ${c}`} onClick={() => set('colores')(f.colores.filter((x) => x !== c))}><I.Close size={12} /></button>)}
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} aria-label="Elegir color" />
            <button type="button" className="btn ghost sm" onClick={() => !f.colores.includes(newColor) && f.colores.length < 8 && set('colores')([...f.colores, newColor])}>Agregar color</button>
          </div>
          <label className="check"><input type="checkbox" checked={f.activo} onChange={(e) => set('activo')(e.target.checked)} /><span>Visible en la tienda</span></label>
        </div>
      </div>
      {err && <p className="err-box" role="alert"><I.Alert size={16} /> {err}</p>}
      {confirmDel ? (
        <div className="confirm-bar"><p>¿Eliminar “{f.nombre}” para siempre?</p>
          <div className="row2"><button className="btn ghost" onClick={() => setConfirmDel(false)}>No</button><button className="btn" disabled={busy} onClick={remove}>Sí, eliminar</button></div></div>
      ) : (
        <div className="row2 sheet-actions">
          {f.id ? <button className="btn ghost danger" onClick={() => setConfirmDel(true)}>Eliminar</button> : <button className="btn ghost" onClick={onClose}>Cancelar</button>}
          <button className="btn" disabled={busy || uploading} onClick={save}>{busy ? 'Guardando…' : f.id ? 'Guardar cambios' : 'Publicar'}</button>
        </div>
      )}
    </Sheet>
  );
}
