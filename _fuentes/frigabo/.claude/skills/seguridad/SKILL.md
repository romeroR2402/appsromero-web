---
name: seguridad
description: Reglas de seguridad de Fri & Gabo para clientes y vendedor (Supabase RLS, pedidos, pagos SPEI, cuentas, panel, fotos, entregas en Metro Iztacalco). Úsala antes de tocar base de datos, pedidos, pagos, autenticación, formularios, panel o publicación.
---

# Seguridad · Fri & Gabo

## Arquitectura
- Frontend estático (GitHub Pages, HTTPS) + Supabase (proyecto compartido con otras apps: **todo lo de esta tienda usa el prefijo `fg_`**; no tocar tablas de otros prefijos).
- En el frontend sólo va la clave **publishable**. Nunca `service_role`/secret, tokens ni contraseñas.
- La seguridad real vive en **RLS**: cada cambio de esquema debe mantener RLS activo y revisarse con los advisors de Supabase.

## Reglas de datos (no romper)
- `fg_productos`: lectura pública sólo de activos; escritura sólo admin. La columna `costo` NO es legible por anon/authenticated (permiso por columnas); el admin la lee con `fg_productos_admin()`.
- `fg_pedidos`: el cliente sólo ve los suyos; **no hay INSERT directo**. Se crean únicamente con `fg_crear_pedido()` (SECURITY DEFINER) que recalcula precios, valida stock/día/horario/teléfono, bloquea filas (`for update`), limita 3 pedidos sin pagar, genera folio y código de entrega con `gen_random_bytes`. Nunca confiar en precios del navegador.
- Cancelar: cliente sólo vía `fg_cancelar_pedido()` y sólo sin pagar; el trigger devuelve stock y registra historial. Un cancelado no se reactiva.
- `fg_casos`: el cliente sólo crea casos de SUS pedidos pagados/entregados, sin poder fijar estado ni respuesta.
- `fg_admins` define quién es admin (`fg_es_admin()` por email del JWT).
- Fotos: bucket `fg-fotos` público para leer; subir/borrar sólo admin; ≤ 2 MB, sólo jpeg/png/webp; el navegador re-codifica (quita EXIF/GPS).

## Cliente
- Cuenta con correo + contraseña (≥ 8, letras y números). Recuperar contraseña con mensaje neutro (no revelar si el correo existe).
- Se pide lo mínimo: nombre, correo, WhatsApp. Nada de dirección, INE ni datos bancarios del cliente.
- Avisos visibles: transferir sólo a la CLABE/titular del pedido, folio como concepto, nunca pedimos NIP/SMS/tarjeta.
- Código de 4 dígitos para recoger en el metro.

## Vendedor
- Panel separado (`admin.html`, `noindex`), sesión independiente (`fg-admin`), verificación `fg_es_admin` al entrar, cierre por 30 min de inactividad.
- "Pago verificado" sólo viendo el depósito en la app del banco (no capturas). "Entregado" exige el código correcto.
- CLABE validada con dígito verificador; si es inválida, la tienda oculta la transferencia.

## Frontend
- CSP estricta en ambos HTML (sólo self, Supabase, Unsplash, Google Fonts). Si agregas un dominio, actualiza la CSP.
- Prohibido `dangerouslySetInnerHTML`. Texto libre pasa por `cleanText` y límites de longitud (también en la BD con `check`).
- Redirecciones `?next=` sólo a rutas internas que empiezan con `/`.

## Pendientes recomendados (configuración de Supabase, no de código)
Activar "Leaked password protection"; agregar `https://www.appsromero.com/frigabo/` a Redirect URLs de Auth.
