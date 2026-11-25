import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '../config.js';

// Sesiones separadas para tienda y panel (mismo dominio, distintas llaves)
export const makeClient = (storageKey) =>
  createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storageKey, persistSession: true, autoRefreshToken: true } });

export const CONDITIONS = {
  nuevo: { label: 'Nuevo', hint: 'Sellado, sin uso.' },
  usado: { label: 'Usado', hint: 'Funciona perfecto, con señales de uso.' },
  caja: { label: 'Caja dañada', hint: 'Producto nuevo; sólo el empaque tiene golpes.' },
};
export const CATEGORIES = ['Electrónica', 'Ropa', 'Zapatos', 'Bolsas', 'Relojes', 'Cocina', 'Juguetes', 'Hogar'];

export const ESTADOS = {
  pago_pendiente: { label: 'Esperando pago', tone: 'warn', paso: 0 },
  por_confirmar: { label: 'Por confirmar', tone: 'warn', paso: 0 },
  pagado: { label: 'Pago verificado', tone: 'ok', paso: 1 },
  listo: { label: 'Listo para entregar', tone: 'ok', paso: 2 },
  entregado: { label: 'Entregado', tone: 'ok', paso: 3 },
  cancelado: { label: 'Cancelado', tone: 'bad', paso: -1 },
};
export const CASO_TIPOS = {
  defecto: 'Llegó con defecto',
  no_coincide: 'No coincide con la descripción',
  incompleto: 'Llegó incompleto',
  no_entregado: 'No me lo entregaron',
  otro: 'Otro',
};
export const CASO_ESTADOS = {
  abierto: { label: 'Abierto', tone: 'warn' },
  en_revision: { label: 'En revisión', tone: 'warn' },
  resuelto: { label: 'Resuelto', tone: 'ok' },
  rechazado: { label: 'Rechazado', tone: 'bad' },
};

export const money = (n) =>
  '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDay = (d) =>
  new Date(typeof d === 'string' && d.length === 10 ? d + 'T12:00:00' : d)
    .toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtDateTime = (d) => new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

/** Mensajes de error de Supabase en español claro */
export function errMsg(e) {
  const m = e?.message || String(e);
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'Confirma tu correo: te enviamos un enlace.';
  if (/User already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Inicia sesión.';
  // Reglas de contraseña de Supabase: se explica el motivo real del rechazo
  const largo = m.match(/Password should be at least (\d+)/i);
  if (largo) return `La contraseña debe tener al menos ${largo[1]} caracteres.`;
  if (/Password should contain/i.test(m)) {
    const pide = [];
    if (/abcdefghijklmnopqrstuvwxyz/.test(m)) pide.push('minúsculas');
    if (/ABCDEFGHIJKLMNOPQRSTUVWXYZ/.test(m)) pide.push('mayúsculas');
    if (/0123456789/.test(m)) pide.push('números');
    if (/[!@#$%^&*()_+\-=[\]{};':"|<>?,./`~]{5,}/.test(m)) pide.push('símbolos (como ! @ # $)');
    return `La contraseña debe incluir ${pide.length ? pide.join(', ') : 'distintos tipos de caracteres'}.`;
  }
  if (/weak|pwned|leaked|easy to guess/i.test(m) || e?.code === 'weak_password') return 'Esa contraseña es muy común o apareció en filtraciones de internet. Elige otra.';
  if (/should be different/i.test(m) || e?.code === 'same_password') return 'La nueva contraseña debe ser distinta a la anterior.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera unos minutos.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Revisa tu internet.';
  return m;
}

// Privacidad
export const AVISO_VERSION = '2026-11-25';
export const SOLICITUD_TIPOS = {
  acceso: { label: 'Acceso', hint: 'Saber qué datos tenemos y cómo los usamos.' },
  rectificacion: { label: 'Rectificación', hint: 'Corregir datos inexactos o incompletos.' },
  cancelacion: { label: 'Cancelación', hint: 'Borrar mis datos y mi perfil de la tienda.' },
  oposicion: { label: 'Oposición', hint: 'Que dejen de usar mis datos para un fin específico.' },
  revocacion: { label: 'Revocar consentimiento', hint: 'Retirar el permiso que di para usar mis datos.' },
};
export const SOLICITUD_ESTADOS = {
  recibida: { label: 'Recibida', tone: 'warn' },
  en_proceso: { label: 'En proceso', tone: 'warn' },
  atendida: { label: 'Atendida', tone: 'ok' },
  rechazada: { label: 'Rechazada', tone: 'bad' },
};
