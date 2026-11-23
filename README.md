# Apps Romero — sitio principal

Página de Apps Romero: apps y micro APIs a la medida para negocios pequeños.
Se publica con GitHub Pages en **https://www.appsromero.com**.

## Archivos
| Archivo | Qué es |
|---|---|
| `index.html` | Página principal (servicios, proyectos, planes y contacto) |
| `antojos/index.html` | Demo de menú y pedidos (marquesitas, waffles, pizzas, helados). No se conecta a nada real |
| `assets/logo-hero.webp` | Logo recortado para la portada |
| `assets/logo.svg`, `assets/emblem.svg` | Logo vectorial completo y solo el escorpión |
| `CNAME` | Dominio para GitHub Pages |

## Configuración
Al inicio del `<script>` de `index.html` está `CONFIG`: enlaces a las apps (Doctores y Tiendas), WhatsApp y correo.

## Formulario de contacto
- **Correo:** se envía con FormSubmit a la dirección de `CONFIG.correo`. La primera solicitud manda un correo de activación: hay que darle "Activate Form" una sola vez.
- **WhatsApp:** abre WhatsApp del cliente con un mensaje a `CONFIG.whatsapp` con todos sus datos; el cliente presiona Enviar.

## DNS
En el proveedor del dominio: registro **CNAME** `www` → `romeroR2402.github.io`.
