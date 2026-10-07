# Etapa 1 — Arquitectura del sistema

Aplicación web académica de **Estadística I** para el estudio  
**“Comercio electrónico y medios de pago digitales”**.

Frontend estático (HTML5, CSS3, JavaScript ES Modules).  
Backend: **Supabase (PostgreSQL + Auth + RLS)**.  
Sin frameworks (React, Vue, Angular).

---

## 1. Principio de separación de audiencias

| Área | Rutas | Quién | Qué puede hacer |
|------|--------|--------|------------------|
| Pública | `/`, `/encuesta.html`, `/gracias.html` | Anónimo | Leer información, enviar **una** respuesta |
| Administrativa | `/admin/login.html`, `/admin/dashboard.html` | Usuario Auth con `profiles.role = 'admin'` | Consultar, importar, limpiar, analizar, exportar |

Los encuestados **nunca** ven resultados, gráficos, tablas ni UI de administración.  
La URL `/admin` no es un secreto: la seguridad es **Auth + RLS + comprobación de rol en cliente**.

---

## 2. Diagrama de flujo

```
[Landing index.html]
        │  "Comenzar encuesta"
        ▼
[encuesta.html]  wizard 4 pasos  →  validar  →  INSERT respuestas (anon)
        │
        ▼
[gracias.html]  + localStorage anti-doble envío

        ················· privacidad visual ·················
footer "2026" × 5 clics / 4 s  →  modal  →  admin/login.html
acceso directo: admin/login.html

[login]  email + password  →  Supabase Auth
        │
        ├─ sin sesión / sin perfil / role ≠ admin  →  logout + login
        └─ role = admin  →  dashboard.html
                │
                ├─ SELECT respuestas (RLS admin)
                ├─ INSERT/UPDATE/DELETE + data_cleaning_log
                ├─ motor estadístico (cliente)
                ├─ Chart.js
                └─ import CSV/XLSX / export CSV/XLSX / impresión
```

---

## 3. Arquitectura de capas (frontend)

```
Presentación (HTML + CSS)
        ↓
Páginas (encuesta.js | admin.js / dashboard.js)
        ↓
Dominio
  validaciones.js  frecuencias.js  estadistica.js
  interpretaciones.js  graficos.js  importador.js
        ↓
Infraestructura
  config.js  supabase.js  utils.js
        ↓
Supabase (PostgreSQL + Auth + RLS)
```

El cliente **nunca** usa `service_role`. Solo `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

---

## 4. Estructura de archivos

```
/
├── index.html                 Landing pública
├── encuesta.html              Wizard de 10 preguntas
├── gracias.html               Confirmación post-envío
├── admin/
│   ├── login.html
│   └── dashboard.html         SPA ligera por secciones (hash o data-view)
├── css/
│   ├── global.css             Tokens, paleta, tipografía, componentes
│   ├── encuesta.css
│   └── admin.css
├── js/
│   ├── config.js              URL + anon key (no versionar secretos reales)
│   ├── config.example.js
│   ├── supabase.js            Cliente + helpers de sesión/rol
│   ├── utils.js
│   ├── validaciones.js
│   ├── catalogo.js            Definición de las 10 variables
│   ├── encuesta.js
│   ├── estadistica.js
│   ├── frecuencias.js
│   ├── graficos.js
│   ├── interpretaciones.js
│   ├── importador.js
│   ├── exportador.js
│   ├── calidad.js
│   ├── admin.js               Auth gate + navegación dashboard
│   └── dashboard.js           Orquestación de vistas admin
├── sql/
│   └── schema.sql             Etapa 2
├── assets/
│   └── icons/                 SVG simples (KPI, sidebar)
├── docs/
│   └── ARQUITECTURA.md        Este documento
└── README.md                  Etapa 15
```

Librerías CDN (sin bundler):

- `@supabase/supabase-js`
- Chart.js
- Papa Parse
- SheetJS (XLSX)

---

## 5. Catálogo de variables (contrato de datos)

Exactamente **10** preguntas: **8 cuantitativas** + **2 cualitativas nominales**.

| # | Variable | Tipo estadístico | Input | Rango / dominio |
|---|----------|------------------|-------|-----------------|
| 1 | `edad` | Cuantitativa discreta | number | 15–80 |
| 2 | `compras_mes` | Cuantitativa discreta | number | 0–50 |
| 3 | `gasto_mensual` | Cuantitativa continua (Q) | number | 0–50 000 |
| 4 | `anios_comprando` | Cuantitativa continua | number (decimal) | 0–30 |
| 5 | `cantidad_metodos_pago` | Cuantitativa discreta | number | 0–10 |
| 6 | `seguridad_pago` | Cuantitativa ordinal (1–5) | radio | 1–5 |
| 7 | `confianza_pago` | Cuantitativa ordinal (1–5) | radio | 1–5 |
| 8 | `compras_pago_digital` | Cuantitativa discreta | number | 0–10 |
| 9 | `metodo_preferido` | Cualitativa nominal | select/radio | 7 categorías |
| 10 | `factor_eleccion` | Cualitativa nominal | select/radio | 8 categorías |

**No se recopila:** nombre, DPI, correo, teléfono, dirección, IP, fingerprint.

Wizard:

| Paso | Contenido |
|------|-----------|
| 1 | Intro + privacidad + `edad`, `compras_mes` |
| 2 | `gasto_mensual`, `anios_comprando`, `cantidad_metodos_pago` |
| 3 | `seguridad_pago`, `confianza_pago`, `compras_pago_digital` |
| 4 | `metodo_preferido`, `factor_eleccion` + revisión + envío |

Persistencia: **solo al pulsar “Enviar encuesta”**.  
Anti-doble envío: `localStorage` (`encuesta_enviada_at`, ventana razonable, p. ej. 24 h).

---

## 6. Modelo de datos (contrato; SQL en Etapa 2)

### `respuestas`

Campos de las 10 variables + `id` UUID + `created_at`.  
CHECK constraints alineados con el catálogo.  
Índice en `created_at` para filtros de fecha.

Campo opcional de calidad (decisión de implementación Etapa 2):

- `excluded_from_analysis BOOLEAN DEFAULT false`  
  permite excluir un registro del análisis sin borrarlo.

### `profiles`

- `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `role TEXT NOT NULL CHECK (role IN ('admin'))`
- `created_at`

Sin registro público. El primer admin se crea en el panel de Supabase Auth y se inserta la fila en `profiles`.

### `data_cleaning_log`

Auditoría de limpieza: `response_id`, `action`, `variable`, `old_value`, `new_value`, `reason`, `admin_id`, `created_at`.

Acciones previstas: `exclude`, `restore`, `delete`, `note`.

---

## 7. Seguridad

### 7.1 Auth

- Login: email + contraseña (Supabase Auth).
- Dashboard: 1) sesión 2) perfil 3) `role === 'admin'` 4) si falla → `signOut` + redirect login.
- **No cargar datos** hasta pasar el gate.

### 7.2 RLS (resumen; políticas completas en Etapa 2)

**`respuestas`**

- Anónimo: `INSERT` únicamente (sin SELECT/UPDATE/DELETE).
- Admin (`is_admin()`): SELECT, INSERT, UPDATE, DELETE.

**`profiles`**

- Usuario autenticado: SELECT de **su** fila (para leer el rol).
- Admin: SELECT de perfiles si se requiere.
- Sin INSERT/UPDATE público.

**`data_cleaning_log`**

- Solo admin: SELECT e INSERT.

Helper SQL sugerido:

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

`SECURITY DEFINER` evita recursión RLS al comprobar el rol.

### 7.3 Secretos

| Clave | Dónde |
|-------|--------|
| `SUPABASE_URL` | `js/config.js` |
| `SUPABASE_ANON_KEY` | `js/config.js` |
| `service_role` | **Nunca** en el navegador |

El modal “2026” es **descubrimiento visual**, no control de acceso.

---

## 8. Módulos JavaScript (responsabilidades)

| Archivo | Responsabilidad |
|---------|-----------------|
| `config.js` | Constantes de entorno y metas de muestra (50 / 100) |
| `supabase.js` | `createClient`, `getSession`, `requireAdmin`, `signOut` |
| `utils.js` | Formato numérico (2–3 decimales), fechas, toast, debounce, IDs `#001` |
| `catalogo.js` | Metadatos de preguntas, etiquetas, rangos, tipos de gráfico |
| `validaciones.js` | Validación de un registro (encuesta + importación) |
| `encuesta.js` | Wizard, estado en memoria, submit, localStorage |
| `admin.js` | Gate, sidebar, routing interno, logout |
| `dashboard.js` | Carga de datos, KPIs, vistas |
| `estadistica.js` | Media, mediana, moda, min/max, rango, varianza (muestra/población), DE, CV, cuartiles, percentiles (interpolación documentada), RIC, asimetría, curtosis (exceso), atípicos Tukey |
| `frecuencias.js` | fi, Fi, hi, %; agrupación Sturges |
| `graficos.js` | Chart.js, paleta, PNG |
| `interpretaciones.js` | Textos descriptivos, hallazgos, conclusiones, recomendaciones (sin causalidad) |
| `importador.js` | Papa Parse + XLSX, mapeo, preview, validación, confirmación |
| `exportador.js` | CSV, Excel, impresión `@media print` |
| `calidad.js` | Incidencias, exclusiones, log de limpieza |

---

## 9. Motor estadístico (contrato)

- Precisión interna completa; UI: 2–3 decimales; porcentajes 2 decimales.
- Varianza **muestra** por defecto: \(s^2 = \sum(x-\bar{x})^2/(n-1)\).  
  Población: \(\sigma^2 = \sum(x-\mu)^2/n\).
- CV: \((\text{DE}/\bar{x})\times 100\); media 0 → “No definido”.
- Percentiles: método de interpolación lineal tipo NIST / Excel `PERCENTILE.INC` (documentado en código en Etapa 8).
- Asimetría: sesgo muestral (momento 3).
- Curtosis: **exceso** (momento 4 − 3).
- Atípicos: \(Q_1 - 1.5\,\text{RIC}\) y \(Q_3 + 1.5\,\text{RIC}\).
- Moda: múltiples valores; si todas las frecuencias = 1 → “No existe una moda representativa.”
- Cualitativas: solo frecuencias, moda, gráficos; **sin** media ni DE.

---

## 10. Dashboard (mapa de vistas)

Navegación interna en `dashboard.html` (una página, secciones):

1. Resumen — KPIs, barra 50/100, fechas min/max  
2. Respuestas — tabla (paginar, buscar, ordenar, filtrar, ver, borrar, duplicados)  
3. Variables — panel por variable (frecuencias + gráfico + medidas + interpretación)  
4. Estadísticas — selector muestra/población, medidas globales  
5. Gráficos — un gráfico por pregunta + PNG  
6. Calidad de datos — incidencias y exclusiones  
7. Importar archivo — flujo 11 pasos  
8. Exportar — CSV, XLSX, reporte impresión  
9. Cruces — análisis cruzado adicional  
10. Conclusiones — conclusiones + recomendaciones  
11. Configuración — umbrales, cuenta  
12. Cerrar sesión  

Desktop: sidebar `#001B47`. Móvil: sidebar colapsable.

---

## 11. Identidad visual

| Uso | Color |
|-----|--------|
| Fondo | `#F6F8FC` |
| Texto | `#001B47` |
| Navbar / sidebar | `#001B47` |
| Botón primario | `#00408D` |
| Secundario / acento | `#A952B9` |
| Detalle | `#642A5E` |
| Superficies suaves | `#B0BBDE` (alpha) |
| Gradiente hero | `linear-gradient(135deg, #001B47, #00408D, #642A5E)` |

Radios 12–18 px, sombras suaves, transiciones 150–250 ms, focus visible, labels asociados.

---

## 12. Privacidad

- Aviso breve en landing y paso 1 del wizard.  
- Análisis agregado con fines educativos.  
- Sin PII, sin IP desde el frontend, sin fingerprinting.

---

## 13. Despliegue previsto

Sitio estático (Netlify, Vercel, GitHub Pages o cualquier hosting HTML).  
CORS de Supabase debe incluir el origen de producción.  
`config.js` se copia desde `config.example.js` y se rellenan URL y anon key.

---

## 14. Orden de implementación (siguientes etapas)

| Etapa | Entregable |
|-------|------------|
| 2 | `sql/schema.sql` (tablas, índices, CHECK, RLS, políticas) |
| 3 | HTML público (landing, encuesta, gracias) |
| 4 | CSS (global, encuesta, admin) |
| 5 | JS encuesta + cliente Supabase |
| 6 | Login admin |
| 7 | Shell dashboard + resumen + tabla |
| 8 | `estadistica.js` |
| 9 | `frecuencias.js` + vista variables |
| 10 | `graficos.js` |
| 11 | Importador |
| 12 | Calidad + `data_cleaning_log` |
| 13 | Interpretaciones, hallazgos, conclusiones |
| 14 | Exportaciones + reporte impresión |
| 15 | README y cierre |

Esta etapa **no** incluye SQL ejecutable ni UI funcional; solo el contrato de arquitectura y el esqueleto de carpetas.
