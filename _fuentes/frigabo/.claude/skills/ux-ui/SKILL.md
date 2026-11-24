---
name: ux-ui
description: Reglas de diseño UX/UI de Fri & Gabo (tienda y panel). Úsala antes de crear o modificar cualquier pantalla, componente o estilo (src/tienda, src/admin, src/components, src/styles.css, src/admin/admin.css).
---

# UX/UI · Fri & Gabo — "Todo a un clic"

Estilo: **catálogo limpio** (mucho blanco, tarjetas gris-menta, botones píldora) con la **marca** como acento.

## Marca
- Logo: carrito con ruedas F y G → componente `LogoMark` + `Wordmark` (src/components/UI.jsx). No redibujarlo.
- Colores de marca: navy `#1E2A5A` (texto y botones), teal `#00796B` (acento, "&", activo), menta `#E9FBF8`; naranja/rosa/amarillo sólo como chispas (ofertas, badge del carrito, estrellas).
- Tipografías: **Fredoka** para títulos, cifras grandes y logotipo; **Outfit** para todo lo demás.
- Colores siempre desde tokens de `:root`; existe modo oscuro con valores propios.

## Estado del producto (es la promesa al cliente)
Nuevo = azul · Usado = café · Caja dañada = naranja. La etiqueta aparece en tarjeta, detalle, carrito, pedido y panel. En usados/caja dañada la descripción debe explicar el daño real.

## Tienda (cliente, móvil primero, máx. 480 px)
- Navegación inferior: Inicio · Buscar · Carrito · Pedidos · Cuenta.
- Grid de 2 columnas; barra fija inferior con total + acción principal.
- Pedido = folio grande, línea de tiempo (recibido → pago verificado → listo → entregado), fecha/hora de entrega con "(mañana)", código de entrega destacado, datos SPEI con botón copiar.
- Problemas: botón "Reportar un problema" en el pedido → caso con estado y respuesta visible.

## Panel (admin, escritorio primero, responsivo)
- Barra lateral (se vuelve barra superior < 900 px) con contadores rosa en Pedidos y Resolución.
- Resumen: KPIs (ventas con comparación, pedidos, ticket, ganancia, por cobrar), gráfica de barras de un solo color teal con tooltip, entregas de hoy/mañana, más vendidos, "requiere atención".
- Tablas con búsqueda + chips de filtro; el detalle abre en hoja lateral/inferior ancha.
- Acciones destructivas o de dinero piden confirmación en una barra amarilla.

## Usabilidad
Áreas táctiles ≥ 40 px · `inputMode`/`autoComplete` correctos · errores bajo el campo tras intentar enviar · `aria-label` en botones de icono · foco visible · `prefers-reduced-motion` · textos en español de México, breves y cercanos.
