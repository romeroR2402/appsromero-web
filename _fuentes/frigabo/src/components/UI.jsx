import { useState } from 'react';
import { CONDITIONS, ESTADOS, CASO_ESTADOS } from '../lib/db.js';
import * as I from './Icons.jsx';

/** Logo Fri & Gabo: carrito con ruedas F y G */
export function LogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size * 0.77} viewBox="0 0 300 230" role="img" aria-label="Fri & Gabo">
      <path d="M10 30 H55 L90 150 H250 L280 60 H70" fill="none" stroke="var(--brand-navy)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="95" y="72" width="40" height="52" rx="8" fill="#FF7A1A" />
      <rect x="145" y="62" width="40" height="62" rx="8" fill="#E8336B" />
      <rect x="195" y="78" width="40" height="46" rx="8" fill="#FFC93C" />
      <circle cx="115" cy="190" r="30" fill="#00796B" />
      <circle cx="230" cy="190" r="30" fill="#00796B" />
      <text x="115" y="203" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="36" fill="#fff">F</text>
      <text x="230" y="203" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="36" fill="#fff">G</text>
    </svg>
  );
}
export const Wordmark = ({ small }) => (
  <span className={`wordmark ${small ? 'sm' : ''}`}>Fri <em>&amp;</em> Gabo</span>
);

export function Header({ title, onBack, right }) {
  return (
    <header className="top">
      {onBack && <button className="icon-btn" onClick={onBack} aria-label="Regresar"><I.Back /></button>}
      <h1>{title}</h1>
      <div className="top-right">{right}</div>
    </header>
  );
}

export function Img({ src, alt, className }) {
  const [err, setErr] = useState(false);
  if (!src || err) return <div className={`img-fallback ${className || ''}`}><I.Box size={32} /></div>;
  return <img className={className} src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setErr(true)} />;
}

export const ConditionBadge = ({ c, solid }) => (
  <span className={`badge badge-${c} ${solid ? 'solid' : ''}`}>{CONDITIONS[c]?.label}</span>
);
export const StatusPill = ({ s }) => <span className={`status ${ESTADOS[s]?.tone}`}>{ESTADOS[s]?.label}</span>;
export const CasoPill = ({ s }) => <span className={`status ${CASO_ESTADOS[s]?.tone}`}>{CASO_ESTADOS[s]?.label}</span>;

export function Chips({ options, value, onChange, label, wrap }) {
  return (
    <div className={`chips ${wrap ? 'wrap' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o.value} role="radio" aria-checked={value === o.value}
          className={`chip ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Qty({ value, onChange, max }) {
  return (
    <div className="qty">
      <button type="button" aria-label="Menos" disabled={value <= 1} onClick={() => onChange(value - 1)}><I.Minus size={16} /></button>
      <span aria-live="polite">{value}</span>
      <button type="button" aria-label="Más" disabled={value >= max} onClick={() => onChange(value + 1)}><I.Plus size={16} /></button>
    </div>
  );
}

export function Sheet({ open, onClose, children, title, wide }) {
  if (!open) return null;
  return (
    <div className="scrim" onClick={onClose}>
      <div className={`sheet ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {title && <div className="sheet-head"><h2>{title}</h2><button className="icon-btn sm" aria-label="Cerrar" onClick={onClose}><I.Close size={18} /></button></div>}
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <svg width="140" height="120" viewBox="0 0 140 120" aria-hidden="true">
        <rect x="18" y="20" width="70" height="90" rx="8" transform="rotate(-10 53 65)" fill="var(--surface-2)" stroke="var(--line)" />
        <rect x="50" y="18" width="70" height="92" rx="8" fill="var(--surface)" stroke="var(--line-strong)" />
        <rect x="60" y="30" width="50" height="68" rx="4" fill="var(--surface-2)" />
        <rect x="72" y="10" width="26" height="12" rx="3" fill="var(--brand-navy)" />
      </svg>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export const Spinner = ({ label = 'Cargando…' }) => <div className="spinner" role="status"><span />{label}</div>;

export function Field({ label, error, children, hint }) {
  return (
    <div className="field">
      <label className="lbl">{label}</label>
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="err">{error}</p>}
    </div>
  );
}
