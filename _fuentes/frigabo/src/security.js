// Validaciones y utilidades de seguridad (la seguridad real vive en las reglas RLS de Supabase).

/** CLABE interbancaria: 18 dígitos + dígito verificador (pesos 3,7,1). */
export function isValidClabe(clabe) {
  const s = String(clabe || '').replace(/\s/g, '');
  if (!/^\d{18}$/.test(s)) return false;
  const w = [3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += (Number(s[i]) * w[i % 3]) % 10;
  return (10 - (sum % 10)) % 10 === Number(s[17]);
}
export const formatClabe = (c) => String(c).replace(/(\d{3})(\d{3})(\d{11})(\d)/, '$1 $2 $3 $4');
export const onlyDigits = (v, max = 10) => String(v || '').replace(/\D/g, '').slice(0, max);
export const isValidPhone = (p) => /^\d{10}$/.test(onlyDigits(p));
export const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

/** Texto libre: sin caracteres de control ni < >, recortado. */
export function cleanText(v, max = 120) {
  return String(v ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F<>]/g, '').trim().slice(0, max);
}

/** Contraseña: mínimo 8, con letra y número. */
export function passwordIssue(p) {
  if (p.length < 8) return 'Mínimo 8 caracteres.';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Usa letras y números.';
  return '';
}

/** Fotos: sólo JPG/PNG/WebP ≤ 8 MB de entrada; se reescalan a 1200 px y se re-codifican (quita EXIF/GPS). */
export function prepareImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Sólo JPG, PNG o WebP.'));
    if (file.size > 8 * 1024 * 1024) return reject(new Error('Máximo 8 MB por foto.'));
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1200 / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * k);
      c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto.'))), 'image/jpeg', 0.82);
    };
    im.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    im.src = url;
  });
}

export function readJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento: sigue en memoria */ }
}
