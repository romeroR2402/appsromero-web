import { useCallback, useEffect, useRef, useState } from 'react';
import { Img } from '../components/UI.jsx';
import * as I from '../components/Icons.jsx';

const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

/** Carrusel deslizable: swipe en celular, flechas/teclado/miniaturas en computadora, toque para ampliar. */
function useCarousel(count) {
  const ref = useRef(null);
  const [idx, setIdx] = useState(0);
  const onScroll = useCallback(() => {
    const el = ref.current; if (!el) return;
    setIdx(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth))));
  }, [count]);
  const goTo = useCallback((i, instant) => {
    const el = ref.current; if (!el) return;
    const n = Math.max(0, Math.min(count - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: instant ? 'auto' : smooth() });
    setIdx(n);
  }, [count]);
  return { ref, idx, onScroll, goTo };
}

function Track({ images, alt, c, onOpen, contain }) {
  return (
    <div className="g-track" ref={c.ref} onScroll={c.onScroll} tabIndex={-1}>
      {images.map((src, i) => (
        <div className="g-slide" key={src + i} onClick={onOpen ? () => onOpen(i) : undefined}
          role="group" aria-roledescription="foto" aria-label={`${i + 1} de ${images.length}`}>
          <Img src={src} alt={`${alt} · foto ${i + 1}`} className={contain ? 'contain' : ''} />
        </div>
      ))}
    </div>
  );
}

function Arrows({ c, count }) {
  if (count < 2) return null;
  return (<>
    <button type="button" className="g-arrow prev" aria-label="Foto anterior" disabled={c.idx === 0} onClick={(e) => { e.stopPropagation(); c.goTo(c.idx - 1); }}><I.Back size={20} /></button>
    <button type="button" className="g-arrow next" aria-label="Foto siguiente" disabled={c.idx === count - 1} onClick={(e) => { e.stopPropagation(); c.goTo(c.idx + 1); }}><I.Arrow size={20} /></button>
  </>);
}

export function Gallery({ images, alt, onBack }) {
  const imgs = images.length ? images : [null];
  const c = useCarousel(imgs.length);
  const [zoom, setZoom] = useState(null);
  const thumbsRef = useRef(null);

  // Mantener visible la miniatura activa
  useEffect(() => {
    thumbsRef.current?.children[c.idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: smooth() });
  }, [c.idx]);

  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); c.goTo(c.idx + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); c.goTo(c.idx - 1); }
  };

  return (
    <div className="hero gallery" onKeyDown={onKey}>
      <div className="g-main" tabIndex={imgs.length > 1 ? 0 : -1} aria-label={`Fotos de ${alt}`} aria-roledescription="carrusel">
        <Track images={imgs} alt={alt} c={c} onOpen={images.length ? setZoom : undefined} />
        {onBack && <button className="icon-btn float" aria-label="Regresar" onClick={onBack}><I.Back /></button>}
        {images.length > 0 && <button className="icon-btn float right" aria-label="Ampliar foto" onClick={() => setZoom(c.idx)}><I.Expand size={18} /></button>}
        <Arrows c={c} count={imgs.length} />
        {imgs.length > 1 && (<>
          <span className="g-count" aria-live="polite">{c.idx + 1} / {imgs.length}</span>
          <div className="dots g-dots">{imgs.map((_, i) => <button key={i} aria-label={`Ver foto ${i + 1}`} className={i === c.idx ? 'on' : ''} onClick={() => c.goTo(i)} />)}</div>
        </>)}
      </div>
      {imgs.length > 1 && (
        <div className="g-thumbs" ref={thumbsRef} role="tablist" aria-label="Miniaturas">
          {imgs.map((src, i) => (
            <button key={i} role="tab" aria-selected={i === c.idx} aria-label={`Foto ${i + 1}`} className={i === c.idx ? 'on' : ''} onClick={() => c.goTo(i)}>
              <Img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
      {zoom != null && <Lightbox images={images} alt={alt} start={zoom} onClose={(i) => { setZoom(null); c.goTo(i, true); }} />}
    </div>
  );
}

function Lightbox({ images, alt, start, onClose }) {
  const c = useCarousel(images.length);
  const closeRef = useRef(null);
  const idxRef = useRef(start);
  idxRef.current = c.idx;

  useEffect(() => {
    c.goTo(start, true);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e) => {
      if (e.key === 'Escape') onClose(idxRef.current);
      if (e.key === 'ArrowRight') c.goTo(idxRef.current + 1);
      if (e.key === 'ArrowLeft') c.goTo(idxRef.current - 1);
    };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', key); };
  }, []);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Fotos de ${alt}`}>
      <div className="lb-top">
        <span className="lb-count">{c.idx + 1} / {images.length}</span>
        <button ref={closeRef} className="icon-btn lb-close" aria-label="Cerrar" onClick={() => onClose(c.idx)}><I.Close /></button>
      </div>
      <div className="lb-main">
        <Track images={images} alt={alt} c={c} contain />
        <Arrows c={c} count={images.length} />
      </div>
      {images.length > 1 && (
        <div className="lb-thumbs">
          {images.map((src, i) => (
            <button key={i} aria-label={`Foto ${i + 1}`} className={i === c.idx ? 'on' : ''} onClick={() => c.goTo(i)}><Img src={src} alt="" /></button>
          ))}
        </div>
      )}
    </div>
  );
}
