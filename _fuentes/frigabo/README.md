# Fri & Gabo · Todo a un clic

Tienda de productos **nuevos, usados y con caja dañada**, con entregas en **Metro Iztacalco** y pago por **SPEI** o **efectivo**.

- **Tienda (clientes):** `index.html` → https://www.appsromero.com/frigabo/
- **Panel (administrador):** `admin.html` → https://www.appsromero.com/frigabo/admin.html

Son dos apps independientes (React + Vite) que comparten la base de datos en Supabase (tablas `fg_*`).

## Desarrollo
```bash
npm install
npm run dev        # tienda en http://localhost:5173/ y panel en /admin.html
npm run build      # genera dist/
```

## Publicar
Copia el contenido de `dist/` a la carpeta `frigabo/` del repositorio `appsromero-web` y haz push a `main` (GitHub Pages).

## Base de datos
Las tablas `fg_*`, reglas RLS, funciones (`fg_crear_pedido`, `fg_cancelar_pedido`, `fg_productos_admin`) y el bucket `fg-fotos` viven en Supabase (migraciones `fg_tienda_fri_gabo` y `fg_pedido_sin_costo_y_semilla`). Quién es administrador se define en la tabla `fg_admins`.
