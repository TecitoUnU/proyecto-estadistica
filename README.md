# Comercio electrónico y medios de pago digitales

Aplicación web académica de **Estadística I** para analizar hábitos, frecuencia, gasto,
confianza, percepción de seguridad y uso de medios de pago digitales.

## Objetivo

Recopilar 50–100 respuestas anónimas mediante un cuestionario de 10 preguntas y
ofrecer un panel administrativo con estadística descriptiva completa, gráficos,
calidad de datos, importación CSV/XLSX y exportaciones.

## Tecnologías

- HTML5, CSS3, JavaScript ES Modules (sin frameworks)
- Supabase (PostgreSQL + Auth + Row Level Security)
- Chart.js, Papa Parse, SheetJS (XLSX) vía CDN

## Estructura de carpetas

```
/
├── index.html, encuesta.html, gracias.html
├── admin/login.html, admin/dashboard.html
├── css/ (global.css, encuesta.css, admin.css)
├── js/ (config, supabase, utils, catalogo, validaciones, encuesta,
│        login, admin, dashboard, estadistica, frecuencias, variables,
│        graficos, importador, calidad, interpretaciones, exportador, accesoAdmin)
├── sql/ (schema.sql, crear_admin.sql, verificar_rls.sql)
├── docs/ARQUITECTURA.md
└── assets/
```

## Configuración de Supabase

1. Cree un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor** ejecute en este orden:
   - `sql/schema.sql` (tablas, índices, constraints, RLS, políticas, helper `is_admin()`)
   - `sql/crear_admin.sql` después de crear el usuario en Auth (ver abajo)
   - `sql/verificar_rls.sql` para comprobar las políticas
3. En **Project Settings → API** copie:
   - Project URL → `SUPABASE_URL`
   - anon public key → `SUPABASE_ANON_KEY`
4. Péguelos en `js/config.js` (no suba la `service_role` key a ningún archivo del navegador).

## Creación del primer administrador

1. Supabase Dashboard → **Authentication → Users → Add user** (correo + contraseña).
2. Copie el `id` del usuario y ejecute:

```sql
insert into public.profiles (id, role) values ('<UUID>', 'admin');
```

No existe registro público de administradores. La contraseña solo la administra Supabase Auth.

## Ejecutar localmente

Los ES Modules requieren un servidor (no `file://`):

```bash
npx serve .
# o: python3 -m http.server 8000
```

Abra `http://localhost:8000`. El acceso discreto al admin son 5 clics en "2026" (footer) o directamente `/admin/login.html`.

## Importar CSV/XLSX

Panel → **Importar archivo** → seleccione el archivo → revise el mapeo de columnas
(detección automática por sinónimos, editable) → vista previa de 10 filas →
resumen de válidos/inválidos/duplicados → **Confirmar importación**.
Funciona con exportaciones de Google Forms.

## Exportar

Panel → **Exportar**: CSV limpio, Excel, PNG de todos los gráficos, e impresión / reporte estadístico (`@media print`).

## Seguridad

- RLS activo: anónimos solo `INSERT` en `respuestas`; admin (`profiles.role='admin'`) todo.
- El dashboard verifica sesión + rol antes de cargar datos y cierra sesión si no es admin.
- Encuesta anónima: sin nombre, DPI, correo, teléfono ni dirección; sin cookies de tracking ni fingerprinting.

## Despliegue

Sitio estático (Netlify, Vercel, GitHub Pages). Incluya `js/config.js` con la URL y anon key del proyecto y configure el origen en Supabase → Authentication → URL Configuration.
