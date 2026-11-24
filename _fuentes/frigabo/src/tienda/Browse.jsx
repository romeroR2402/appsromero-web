import { useMemo, useState } from 'react';
import { CATEGORIES, CONDITIONS, money } from '../lib/db.js';
import { useStore } from './store.jsx';
import { Chips, ConditionBadge, Empty, Header, Img, LogoMark, Sheet, Spinner, Wordmark } from '../components/UI.jsx';
import * as I from '../components/Icons.jsx';

const COND_OPTS = [{ value: 'all', label: 'Todos' }, ...Object.entries(CONDITIONS).map(([value, c]) => ({ value, label: c.label }))];
const CAT_OPTS = [{ value: 'all', label: 'Todas' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))];
const SORT_OPTS = [
  { value: 'popular', label: 'Populares' }, { value: 'nuevo', label: 'Recientes' },
  { value: 'low', label: 'Precio menor' }, { value: 'high', label: 'Precio mayor' }, { value: 'saving', label: 'Mayor ahorro' },
];
const DEFAULT_F = { condition: 'all', category: 'all', sort: 'popular', min: '', max: '', rating: 0 };
const saving = (p) => (p.precio_antes ? (p.precio_antes - p.precio) / p.precio_antes : 0);

export function applyFilters(products, f, q = '') {
  const t = q.trim().toLowerCase();
  const r = products.filter((p) =>
    (f.condition === 'all' || p.condicion === f.condition) &&
    (f.category === 'all' || p.categoria === f.category) &&
    (!f.min || p.precio >= Number(f.min)) && (!f.max || p.precio <= Number(f.max)) &&
    Number(p.calificacion) >= f.rating &&
    (!t || `${p.nombre} ${p.categoria} ${CONDITIONS[p.condicion].label} ${p.descripcion}`.toLowerCase().includes(t)));
  const by = {
    popular: (a, b) => b.vendidos - a.vendidos, nuevo: (a, b) => b.creado.localeCompare(a.creado),
    low: (a, b) => a.precio - b.precio, high: (a, b) => b.precio - a.precio, saving: (a, b) => saving(b) - saving(a),
  };
  return [...r].sort((a, b) => (b.stock > 0) - (a.stock > 0) || by[f.sort](a, b));
}

export function ProductCard({ p, go }) {
  const { favs, toggleFav } = useStore();
  const fav = favs.includes(p.id);
  return (
    <article className="card" onClick={() => go(`/p/${p.id}`)}>
      <div className="card-img">
        <Img src={p.imagenes[0]} alt={p.nombre} />
        <button className="fav" aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }}><I.Heart size={16} filled={fav} /></button>
        <ConditionBadge c={p.condicion} />
        {p.stock === 0 && <div className="soldout">Agotado</div>}
      </div>
      <h3>{p.nombre}</h3>
      <div className="meta"><I.Star size={13} /> {Number(p.calificacion).toFixed(1)} <span className="sep" /> <span className="pill">{p.vendidos} vendidos</span></div>
      <div className="price">{money(p.precio)} {p.precio_antes && <s>{money(p.precio_antes)}</s>}</div>
    </article>
  );
}
export const Grid = ({ items, go }) => <div className="grid">{items.map((p) => <ProductCard key={p.id} p={p} go={go} />)}</div>;

function LoadState() {
  const { loading, loadError, loadProducts } = useStore();
  if (loading) return <Spinner />;
  if (loadError) return <Empty title="Algo salió mal" text={loadError} action={<button className="btn" onClick={loadProducts}>Reintentar</button>} />;
  return null;
}

export function Home({ go }) {
  const { products, loading, loadError, ajustes, user } = useStore();
  const [cond, setCond] = useState('all');
  const list = applyFilters(products, { ...DEFAULT_F, condition: cond });
  const offers = Object.entries(CONDITIONS).map(([k, c]) => {
    const items = products.filter((p) => p.condicion === k);
    const best = items.reduce((m, p) => (saving(p) > saving(m || {}) ? p : m), items[0]);
    return { k, c, pct: Math.round(Math.max(0, ...items.map(saving)) * 100), img: best?.imagenes[0], n: items.length };
  }).filter((o) => o.n);

  return (
    <div className="screen">
      <header className="home-top">
        <div className="brand-row"><LogoMark size={46} /><div><Wordmark /><p className="tagline">TODO A UN CLIC</p></div></div>
        <button className="icon-btn" aria-label="Mi cuenta" onClick={() => go('/cuenta')}><I.User /></button>
      </header>
      <p className="muted small deliver-note"><I.Pin size={14} /> Entregas en {ajustes?.punto || 'Metro Iztacalco'}{user ? '' : ' · crea tu cuenta para seguir tus pedidos'}</p>
      <button className="search-fake" onClick={() => go('/buscar')}><I.Search size={18} /> Buscar productos…</button>

      {(loading || loadError) ? <LoadState /> : (<>
        <section className="offers" aria-label="Ofertas">
          {offers.map((o, i) => (
            <button key={o.k} className={`offer offer-${i}`} onClick={() => go(`/condicion/${o.k}`)}>
              <div>
                <strong>{o.pct ? `Hasta ${o.pct}%` : o.n + ' artículos'}</strong>
                <span>{o.c.label}</span>
                <small>{o.c.hint}</small>
              </div>
              <Img src={o.img} alt="" />
            </button>
          ))}
        </section>

        <section className="conditions" aria-label="Estado del producto">
          {Object.entries(CONDITIONS).map(([k, c]) => (
            <button key={k} className={`cond-card cond-${k}`} onClick={() => go(`/condicion/${k}`)}><b>{c.label}</b><small>{c.hint}</small></button>
          ))}
        </section>

        <div className="section-head"><h2>Categorías</h2></div>
        <div className="cats">{CATEGORIES.map((c) => <button key={c} className="cat" onClick={() => go(`/c/${encodeURIComponent(c)}`)}>{c}</button>)}</div>

        <div className="section-head"><h2>Más populares</h2></div>
        <Chips label="Estado" options={COND_OPTS} value={cond} onChange={setCond} />
        {list.length ? <Grid items={list} go={go} /> : <Empty title="Pronto habrá más" text="Estamos subiendo artículos nuevos." />}
      </>)}
    </div>
  );
}

export function ListScreen({ go, back, category, condition, favoritos }) {
  const { products, favs, loading } = useStore();
  const [f, setF] = useState({ ...DEFAULT_F, category: category || 'all', condition: condition || 'all' });
  const [open, setOpen] = useState(false);
  const base = favoritos ? products.filter((p) => favs.includes(p.id)) : products;
  const list = applyFilters(base, f);
  const title = favoritos ? 'Favoritos' : category || CONDITIONS[condition]?.label || 'Productos';
  return (
    <div className="screen">
      <Header title={title} onBack={back} right={<button className="icon-btn" aria-label="Filtrar" onClick={() => setOpen(true)}><I.Filter /></button>} />
      {condition && <p className="note">{CONDITIONS[condition].hint}</p>}
      {!category && <Chips label="Categoría" options={CAT_OPTS} value={f.category} onChange={(v) => setF({ ...f, category: v })} />}
      {category && <Chips label="Estado" options={COND_OPTS} value={f.condition} onChange={(v) => setF({ ...f, condition: v })} />}
      {loading ? <Spinner /> : list.length ? <Grid items={list} go={go} /> :
        <Empty title={favoritos ? 'Sin favoritos' : 'Sin productos aquí'} text={favoritos ? 'Toca el corazón de un producto para guardarlo.' : 'Prueba con otro filtro o vuelve pronto.'} />}
      <FilterSheet open={open} onClose={() => setOpen(false)} value={f} onApply={setF} />
    </div>
  );
}

export function FilterSheet({ open, onClose, value, onApply }) {
  const [f, setF] = useState(value);
  const upd = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Sheet open={open} onClose={onClose} title="Ordenar y filtrar">
      <label className="lbl">Estado</label>
      <Chips wrap label="Estado" options={COND_OPTS} value={f.condition} onChange={upd('condition')} />
      <label className="lbl">Categoría</label>
      <Chips wrap label="Categoría" options={CAT_OPTS} value={f.category} onChange={upd('category')} />
      <label className="lbl">Rango de precio</label>
      <div className="row2">
        <input className="input" inputMode="numeric" placeholder="Mín." aria-label="Precio mínimo" value={f.min} onChange={(e) => upd('min')(e.target.value.replace(/\D/g, '').slice(0, 7))} />
        <input className="input" inputMode="numeric" placeholder="Máx." aria-label="Precio máximo" value={f.max} onChange={(e) => upd('max')(e.target.value.replace(/\D/g, '').slice(0, 7))} />
      </div>
      <label className="lbl">Ordenar por</label>
      <Chips wrap label="Orden" options={SORT_OPTS} value={f.sort} onChange={upd('sort')} />
      <label className="lbl">Calificación</label>
      <Chips wrap label="Calificación" options={[{ value: 0, label: 'Todas' }, { value: 4.5, label: '★ 4.5+' }, { value: 4, label: '★ 4+' }]} value={f.rating} onChange={upd('rating')} />
      <div className="row2 sheet-actions">
        <button className="btn ghost" onClick={() => setF(DEFAULT_F)}>Restablecer</button>
        <button className="btn" onClick={() => { onApply(f); onClose(); }}>Aplicar</button>
      </div>
    </Sheet>
  );
}

export function SearchScreen({ go, back }) {
  const { products, recent, setRecent, pushRecent } = useStore();
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [f, setF] = useState(DEFAULT_F);
  const [open, setOpen] = useState(false);
  const results = useMemo(() => applyFilters(products, f, submitted), [products, f, submitted]);
  const run = (term) => { const t = term.trim().slice(0, 60); setQ(t); setSubmitted(t); if (t) pushRecent(t); };
  return (
    <div className="screen">
      <form className="search-bar" role="search" onSubmit={(e) => { e.preventDefault(); run(q); }}>
        <button type="button" className="icon-btn" aria-label="Regresar" onClick={back}><I.Back /></button>
        <label className="search-input">
          <I.Search size={18} />
          <input autoFocus type="search" enterKeyHint="search" maxLength={60} placeholder="Busca audífonos, tenis…" value={q}
            onChange={(e) => { setQ(e.target.value); if (!e.target.value) setSubmitted(''); }} aria-label="Buscar" />
          <button type="button" className="icon-btn sm" aria-label="Filtros" onClick={() => setOpen(true)}><I.Filter size={18} /></button>
        </label>
      </form>
      {!submitted ? (<>
        <div className="section-head"><h2>Recientes</h2>{recent.length > 0 && <button className="link" onClick={() => setRecent([])}>Borrar todo</button>}</div>
        {recent.length === 0 && <p className="muted pad">Aún no buscas nada.</p>}
        <ul className="recent">
          {recent.map((r) => (
            <li key={r}><button onClick={() => run(r)}>{r}</button>
              <button className="icon-btn sm" aria-label={`Quitar ${r}`} onClick={() => setRecent(recent.filter((x) => x !== r))}><I.Close size={16} /></button></li>
          ))}
        </ul>
      </>) : (<>
        <div className="section-head"><h2>Resultados para “{submitted}”</h2><span className="muted small">{results.length} encontrados</span></div>
        {results.length ? <Grid items={results} go={go} /> :
          <Empty title="No encontrado" text="No hay productos con esa palabra. Revisa la ortografía o busca otra palabra clave." />}
      </>)}
      <FilterSheet open={open} onClose={() => setOpen(false)} value={f} onApply={setF} />
    </div>
  );
}
