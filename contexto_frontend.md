# Contexto de Cambios — RRHH Frontend

> Proyecto: Sistema de Recursos Humanos — Hotel Palma Real y Villas
> Fecha de última actualización: 2026-09-14

---

## Stack tecnológico — qué es cada cosa y para qué se usa

| Tecnología | Versión | Qué hace en este proyecto |
|---|---|---|
| **Vue 3** | ^3.5.32 | Framework de UI. Todas las vistas usan Composition API con `<script setup>` (sin Options API). |
| **Vue Router** | ^5.0.4 | Enrutamiento SPA (`src/router/index.js`). Protege rutas con `meta: { requiresAuth: true }` y redirige a `/login` si no hay sesión. |
| **Pinia** | ^3.0.4 | Manejo de estado global. Un store por módulo de negocio (`src/stores/`) — cada uno encapsula las llamadas a la API y el estado de esa entidad (empleados, planillas, etc.), para que las vistas no llamen a `axios` directamente. |
| **Axios** | ^1.15.2 | Cliente HTTP (`src/services/api.js`). Interceptor de request agrega el Bearer token desde `localStorage`; interceptor de response redirige a `/login` en 401 y marca `error.friendlyMessage` en 5xx. |
| **Tailwind CSS** | ^4.2.4 | Estilos utilitarios. En v4 no hay `tailwind.config.js` — la paleta de marca se redefine con `@theme` directamente en `src/assets/main.css` (ver "Identidad visual" abajo). |
| **Vite** | ^8.0.8 | Bundler/dev server. `@vitejs/plugin-vue` + `vite-plugin-vue-devtools`. Lazy-loading de cada vista de módulo vía `() => import(...)` en el router. |
| **ESLint + oxlint** | — | Lint (`npm run lint`). oxlint corre primero (más rápido, reglas básicas) y ESLint después (reglas de Vue). |
| **Node requerido** | `^20.19.0 \|\| >=22.12.0` | — |

Consume la API del backend Laravel (`rrhh-backend`) vía Sanctum: autenticación por **Bearer token** en el header `Authorization`, no por cookies (`supports_credentials: false` en CORS del backend — por eso no hay `withCredentials` en el cliente Axios).

---

## Identidad visual — Hotel Palma Real y Villas

`src/assets/main.css` redefine la escala `blue` nativa de Tailwind con `@theme` para que **todas** las clases ya usadas en la app (`bg-blue-700`, `focus:ring-blue-500`, etc.) hereden el color de marca sin reescribir cada componente:

| Token | Valor | Uso |
|---|---|---|
| `--color-blue-500` | `#b9921a` (dorado, extraído del logo) | acentos, focus rings |
| `--color-blue-700` | `#3b2b16` (marrón, extraído del logo) | botones primarios, marca |

Logo oficial (`hpr_logo.png`) en `src/assets/images/hpr_logo.png`, usado en `AppLayout.vue` (sidebar) y `LoginView.vue`. Favicon: mariposa (elegida explícitamente sobre otras opciones probadas). Grises del sidebar en `stone` (no `slate`) para combinar con la paleta marrón/dorado.

**Paleta de datos (gráficos):** validada con el skill `dataviz` — azul `#2a78d6` / naranja `#eb6834`, primer par de un set categórico de 8 colores en orden fijo, verificado contra CVD (daltonismo) y contraste normal-vision con `scripts/validate_palette.js`.

---

## Estructura de rutas (`src/router/index.js`)

Todas bajo `AppLayout` con `meta: { requiresAuth: true }`, excepto `/login` (`meta: { guest: true }`).

```
/dashboard
/empleados, /empleados/crear, /empleados/:id, /empleados/:id/editar
/vacaciones
/incidencias
/constancias                (Constancia Laboral + Voucher de Pago)
/bancos
/departamentos               (Cargos se gestiona en la misma vista; renombrado de "Puestos" a "Cargos")
/planillas, /planillas/crear, /planillas/:id
/aguinaldo, /aguinaldo/crear, /aguinaldo/:nombre   (param string, no ID numérico)
/cumpleanos
/estadistica-laboral
/log-sistema
/campos-variables            (solo admin)
/usuarios                    (solo admin)
```

---

## Stores Pinia (`src/stores/`)

| Store | Responsabilidad |
|---|---|
| `auth.js` | Login/logout, usuario actual, token, rol (admin vs RRHH — controla qué botones destructivos se muestran) |
| `empleados.js` | CRUD empleados, foto, filtro por departamento/modalidad(tipo_contrato)/estado |
| `departamentos.js` / `cargos.js` (renombrado de `puestos.js`) | Catálogos: crear/editar, **desactivar** (soft, cualquier rol) y **eliminar** (hard delete, solo admin y solo si está Inactivo) |
| `bancos.js` | Catálogo bancos |
| `vacaciones.js` | Solicitudes + saldo (`fetchSaldo` acepta `{ silent }`), descarga de PDF |
| `incidencias.js` | CRUD incidencias, descarga de PDF |
| `planillas.js` | CRUD planillas, cierre, detalle, `eliminarPlanillaCerrada(id, password)` (solo admin, requiere reingresar contraseña) |
| `aguinaldo.js` | Lotes de aguinaldo, edición de registros fijos/extras, cierre, PDF |
| `constancias.js` | Constancia Laboral, **Voucher de Pago** (`buscarPlanillasVoucher`, `downloadVoucher`) |
| `camposVariables.js` | IHSS y salario mínimo configurables |
| `estadisticaLaboral.js` | Reporte agregado + detalle por empleado, con buscador tipo typeahead |
| `logSistema.js` | Listado paginado + descarga de PDF |
| `usuarios.js` | Gestión de usuarios (solo admin) |
| `cumpleanos.js` | Cumpleaños del mes |

### Patrón de descarga de PDF
`incidencias.js`, `logSistema.js`, `vacaciones.js` y `constancias.js` piden el PDF con `responseType: 'blob'`, arman el nombre de archivo vía `src/utils/archivos.js` y descargan con un link temporal (`URL.createObjectURL` + click programático), revocado tras unos segundos. Dos convenciones de nombre:
- **Por-empleado** (Constancia, Incidencia, Vacaciones, Voucher, Estadística): `Tipo_Nombre_ddmmaaaa.ext`.
- **Lote con nombre propio** (Planilla, Aguinaldo): conserva el nombre que el usuario le dio a la planilla/lote.

### Patrón de modal de confirmación
Reemplaza `confirm()` nativo en toda acción destructiva o irreversible (desactivar/eliminar empleado, departamento, cargo; anular/cerrar/eliminar planilla o aguinaldo). Modal propio vía `Teleport`, con estado de carga y, para "eliminar planilla cerrada", un campo de contraseña que se valida contra el backend antes de proceder.

---

## Vistas y funcionalidad por módulo (estado actual)

### Dashboard (`src/views/DashboardView.vue`)
- Tarjetas de estadísticas (`empleados_total`, `activos`, `fijos`, `extras`, `cumpleanos_mes`) que enlazan a `/empleados` con `query.tipo_contrato` pre-filtrado (Fijos/Extras filtran; "Empleados" muestra todos).
- Gráfico de barras SVG (costo de planillas por mes, últimos 12 meses, Fijos vs Extras): barras con esquina superior redondeada (4px) y base recta, paleta validada (`#2a78d6` / `#eb6834`), tooltip con el valor primero (bold) y la etiqueta de serie después (tenue), leyenda con swatches. Tamaño del `viewBox` ajustado varias veces por preferencia visual — actualmente `VW=900 VH=180`.

### Constancias (`src/views/constancias/ConstanciasIndex.vue`)
Dos tipos de documento, seleccionables desde un panel lateral:
- **Constancia Laboral**: buscador de empleado (typeahead) → genera PDF.
- **Voucher de Pago**: buscador de empleado → lista las planillas **cerradas** donde aparece ese empleado (paginada de 5 en 5) → al elegir una, genera el voucher con el detalle de esa quincena (ingresos, deducciones, salario neto) y espacio de firma.
- Historial de documentos emitidos (reusa `logSistema.js`, filtrado por módulo "Constancias"), paginado igual que Log del Sistema.
- Manejo de error explícito al buscar planillas del voucher: un fallo de red muestra un mensaje de error real, no el aviso genérico de "no aparece en ninguna planilla".

### Planillas
- `PlanillaCrear.vue`: autocompleta el nombre según la fecha elegida — `Planilla {Tipo} {día} de {Mes} {Año}`, donde el día es **15** para la 1ra quincena y el **último día real del mes** (30 o 31) para la 2da.
- `PlanillasIndex.vue`: botón para que el **admin** elimine una planilla ya **Cerrada**, con confirmación por contraseña.
- `PlanillaDetalle.vue`: grilla editable estilo Excel, agrupada por departamento con subtotales y fila de TOTAL GENERAL (incluye días trabajados). Edición directa en celda con autoguardado (`@blur`), campos numéricos como `type="text"` + `inputmode` (sin flechitas de spinner), Enter salta al siguiente empleado en la columna Días.
- Salario neto en rojo si queda negativo.

### Empleados (`EmpleadosIndex.vue`)
Filtros combinables: Departamento → Modalidad (Fijo/Extra) → Estado. Listado ordenado alfabéticamente por departamento y luego por nombre del empleado (mismo criterio usado al generar planillas/aguinaldo, para que el orden visual coincida).

### Departamentos / Cargos (`DepartamentosIndex.vue`, renombrado de "Puestos" a "Cargos" en toda la app y en la base de datos)
- **Desactivar** (cualquier rol): bloqueado si el departamento/cargo tiene empleados activos asignados (el mensaje lista los nombres).
- **Eliminar** (solo admin, botón separado): solo permitido si ya está Inactivo y sin ningún empleado asignado (activo o no).
- **Habilitar**: reactiva un departamento/cargo desactivado.
- Tooltips (`title`) en todos los botones de solo-ícono.

### Vacaciones
Mensaje de saldo agotado: "Sin días disponibles" (antes "Sin saldo disponible"), y "No hay suficientes días disponibles..." en vez de "Saldo insuficiente" al validar una solicitud.

### Consistencia visual (todas las tablas de listado)
Botones de acción solo-ícono con `title` (tooltip nativo); skeletons de carga unificados; spinners de página completa con texto descriptivo.

---

## Historial de sesiones / cambios

### 2026-09-14 — sesión larga (múltiples commits)
Trabajo extenso sobre módulos ya existentes, sin cambios de arquitectura:
- Login: distingue error de conexión vs credenciales incorrectas.
- Reemplazo sistemático de `confirm()` nativo por modales propios en toda acción destructiva.
- Fix de filtrado por `tipo_contrato` en generación de Planillas y Aguinaldo (antes incluían empleados del tipo equivocado).
- Autocompletar de nombre de planilla: detecta 1ra/2da quincena según la fecha elegida (no la fecha del sistema); formato final `{día} de {Mes} {Año}` (ver arriba).
- Limpieza de spinners nativos de `<input type="number">` en todo el proyecto (convertidos a `type="text"` + `inputmode`).
- Salario neto negativo en rojo; IHSS eliminado de planillas tipo "Extras".
- Estandarización de nombres de archivo descargado (`Tipo_Nombre_ddmmaaaa.ext` vs. nombre propio del lote).
- PDF de planilla: columnas reajustadas para que montos de más dígitos no se monten; fila TOTAL GENERAL con días trabajados.
- Aguinaldo: base de cálculo confirmada en 360 días (12×30, no 365); campo `fecha_corte` separado de `fecha_generada`; tabla de Fijos reordenada para calzar con el Excel real de referencia (Nombre, Cuenta, Cargo, Fecha Inicio, Salario Mensual, Días Año, Anticipo, Aguinaldo a Pagar), agrupada por departamento igual que Extras.
- **Renombre completo de "Puestos" a "Cargos"**, incluida la base de datos.
- Permisos: solo **admin** puede eliminar (hard delete) departamentos/cargos; cualquier rol puede desactivar. Validaciones para no desactivar/eliminar con empleados activos asignados (mensaje lista los nombres).
- Botón "Habilitar" simétrico a "Desactivar".
- 200 empleados de prueba sintéticos generados para pruebas de rendimiento (cédula `9999...`), con planillas e incidencias de prueba realistas.
- Log de auditoría para Constancias (quién solicitó, quién emitió, qué constancia).
- Empleados listados alfabéticamente por departamento.
- Dashboard: tarjetas de stat enlazan con filtro `tipo_contrato` pre-aplicado.
- Orden alfabético de empleados dentro de cada departamento en Planillas/Aguinaldo, corregido de apellidos a **nombres** (para calzar con el formato de display "Nombres Apellidos").
- Botón de eliminar planilla cerrada (solo admin, confirmación por contraseña).
- Paginación en historial de Constancias (igual que Log del Sistema).
- Mensajes de saldo de vacaciones agotado reformulados.
- **Nuevo tipo de constancia: Voucher de Pago** — buscador de empleado, lista de planillas cerradas paginada (5 por página), PDF con detalle completo de esa quincena.
- Rediseño del gráfico de costo de planillas del dashboard (paleta validada, barras con tope redondeado, tooltip valor-primero), ajustado de tamaño varias veces hasta el actual `VH=180`.
- Corregido ícono de "Descargar PDF" en Constancias (mostraba el ícono de subir/upload en vez de descargar).
- Fix de manejo de errores silencioso al buscar planillas para el voucher (antes cualquier fallo de red se veía igual que "empleado no aparece en ninguna planilla").

### 2026-08-27 — commit `944c279`
- `PlanillaDetalle.vue` reescrito como grilla editable estilo Excel: agrupación por departamento con subtotales, columnas con ancho fijo (`table-fixed` + `colgroup`), edición directa en celda, modales chicos para Horas Extra/Otros Ingresos/Otras Deducciones, scroll vertical con header/footer fijos, botón Exportar Excel.
- Fix de alineación por navegador: se ocultó el spinner nativo de `<input type="number">` (afectaba especialmente a Firefox).
- Corregido `.gitignore` (estaba en UTF-16, Git no aplicaba las reglas).

### 2026-08-26 — commit `d356c63`
Rebrand Hotel Palma Real y Villas, sincronización de la UI de vacaciones con el nuevo cálculo de saldo del backend, sanitizadores de input y autocompletado de salario mínimo en el formulario de empleados, descarga de PDF en incidencias y log del sistema, modal de confirmación reemplazando `confirm()`, limpieza visual de botones/skeletons.

### Commits previos relevantes
| Commit | Descripción |
|---|---|
| `ed2cb2c` | Módulos de empleados, planillas, banco, usuarios y exportación de PDF |
| `df639d0` | fix: `@reference "tailwindcss"` en `<style scoped>` con `@apply` (Tailwind v4) |
| `962622e` | Módulo 2 - Empleados (frontend completo) |
| `9b8de80` | Módulo 1 - Autenticación y layout base |

---

## Notas de arquitectura (vigentes)

- **Skeleton loaders** en todas las tablas de listado mientras `loading === true`.
- **Estado vacío** con mensaje centrado cuando la lista está vacía.
- **Eliminación/desactivación solo en estado Activo**: el botón correspondiente se oculta con `v-if`; eliminar (hard delete) requiere Inactivo y rol admin.
- **Formateo de fechas**: `new Date(d + 'T00:00:00')` para evitar desfase de timezone al parsear fechas ISO sin hora; fecha "de hoy" siempre calculada en hora local, nunca `toISOString()` (UTC) para no adelantarse un día de noche.
- **Lazy-loading** de todas las vistas de módulo vía `() => import(...)` en el router.
- **Correlativo de documentos**: cada PDF muestra un número de 5 dígitos (`N° 00001`) propio de su tipo de documento — la lógica vive en el backend (ver `contexto_backend.md`), el frontend solo lo muestra tal como viene del PDF generado.
