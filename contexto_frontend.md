# Contexto de Cambios — RRHH Frontend

> Proyecto: Sistema de Recursos Humanos — Hotel Palma Real y Villas
> Fecha de última actualización: 2026-08-26

---

## Stack tecnológico

| Componente | Versión |
|---|---|
| Vue | ^3.5.32 (`<script setup>` en todas las vistas) |
| Vue Router | ^5.0.4 |
| Pinia | ^3.0.4 |
| Axios | ^1.15.2 |
| Tailwind CSS | ^4.2.4 (`@theme` en `src/assets/main.css`, sin `tailwind.config.js`) |
| Vite | ^8.0.8 (`@vitejs/plugin-vue`, `vite-plugin-vue-devtools`) |
| Lint | ESLint + oxlint (`npm run lint`) |
| Node requerido | `^20.19.0 || >=22.12.0` |

Consume la API del backend Laravel (`rrhh-backend`) vía Sanctum (Bearer token, sin cookies — `supports_credentials: false` en CORS del backend).

---

## Identidad visual — Hotel Palma Real y Villas (rebrand 2026-08-26)

`src/assets/main.css` redefine la escala `blue` nativa de Tailwind con `@theme` para que **todas** las clases ya usadas en la app (`bg-blue-700`, `focus:ring-blue-500`, etc.) hereden el color de marca sin reescribir cada componente:

| Token | Valor | Uso |
|---|---|---|
| `--color-blue-500` | `#b9921a` (dorado, extraído del logo) | acentos, focus rings |
| `--color-blue-700` | `#3b2b16` (marrón, extraído del logo) | botones primarios, marca |

Logo oficial (`hpr_logo.png`) ubicado en `src/assets/images/hpr_logo.png`, usado en:
- `AppLayout.vue` (sidebar, junto con fondo blanco en el header del sidebar en vez de slate-900)
- `LoginView.vue` (reemplaza el ícono genérico anterior)

También se ajustaron los grises del sidebar de `slate` a `stone` para que combinen mejor con la paleta marrón/dorado.

---

## Estructura de rutas (`src/router/index.js`)

Todas bajo `AppLayout` con `meta: { requiresAuth: true }`, excepto `/login` (`meta: { guest: true }`).

```
/dashboard
/empleados, /empleados/crear, /empleados/:id, /empleados/:id/editar
/vacaciones
/incidencias
/bancos
/departamentos            (puestos se gestiona en la misma vista; /puestos redirige aquí)
/planillas, /planillas/crear, /planillas/:id
/aguinaldo, /aguinaldo/crear, /aguinaldo/:nombre   (param string, no ID numérico)
/cumpleanos
/estadistica-laboral
/log-sistema
/campos-variables          (solo admin)
/usuarios                  (solo admin)
```

---

## Stores Pinia (`src/stores/`)

| Store | Responsabilidad |
|---|---|
| `auth.js` | Login/logout, usuario actual, token |
| `empleados.js` | CRUD empleados, foto |
| `departamentos.js` / `puestos.js` | Catálogos, desactivar |
| `bancos.js` | Catálogo bancos |
| `vacaciones.js` | Solicitudes + saldo (`fetchSaldo` acepta `{ silent }` para refrescar sin mostrar spinner), descarga de PDF |
| `incidencias.js` | CRUD incidencias, descarga de PDF (nuevo `downloadPdf`) |
| `planillas.js` | CRUD planillas, cierre, detalle |
| `aguinaldo.js` | Lotes de aguinaldo, edición de registros fijos/extras, cierre, PDF |
| `camposVariables.js` | IHSS y salario mínimo configurables |
| `estadisticaLaboral.js` | Reporte agregado + detalle por empleado |
| `logSistema.js` | Listado paginado + descarga de PDF (nuevo `downloadPdf`) |
| `usuarios.js` | Gestión de usuarios (solo admin) |
| `cumpleanos.js` | Cumpleaños del mes |

### Patrón de descarga de PDF (agregado 2026-08-26)
`incidencias.js`, `logSistema.js` y `vacaciones.js` implementan `downloadPdf()`: piden el PDF con `responseType: 'blob'`, arman el nombre de archivo (`ddmmyyyy-nombre-tipo.pdf`, normalizando acentos), crean un link temporal (`URL.createObjectURL` + click programático) y lo revocan tras 5s. Notifican con el composable `useToast()`.

---

## Vistas y funcionalidad por módulo

### Vacaciones (`src/views/vacaciones/VacacionesIndex.vue`)
Actualizado 2026-08-26 junto con el nuevo cálculo de saldo del backend:
- Muestra `dias_previos`, `dias_anio_actual` ("Del período"), `dias_tomados_periodo` y `dias_tomados` histórico (antes solo mostraba `dias_por_ley` y `dias_tomados`).
- `saldoEfectivo` (computed): al editar una solicitud, devuelve los días originales al saldo antes de validar.
- `fechaMaxFin` (computed): calcula la fecha máxima de fin sin exceder el saldo disponible (excluye domingos), usada para acotar el date picker.
- Paginación numerada con elipsis (antes solo Anterior/Siguiente).

### Empleados — Formulario (`src/views/empleados/EmpleadoForm.vue`)
- Sanitizadores de input en tiempo real: `soloLetras`, `soloDigitos`, `soloTelefono` (reemplazan `v-model` directo por `:value` + `@input` con regex).
- Al marcar "Usa salario mínimo", autocompleta `salario_base` con el valor de `/campos-variables` (`salarioMinimo`) y deshabilita el campo.
- Spinner de carga inicial (`formLoading`) mientras se resuelven departamentos/puestos/bancos/campos-variables (y el empleado en modo edición).

### Planillas — Detalle (`src/views/planillas/PlanillaDetalle.vue`, reescrito 2026-08-27)
Reemplaza el modal grande "Editar Detalle" por una grilla estilo Excel:
- **Agrupación por departamento** con fila de subtotal por grupo y fila de TOTAL GENERAL — computed `grupos` parte `store.planilla.detalles` (ya vienen ordenados por `departamento`) en bloques y suma cada columna numérica.
- **Layout de tabla**: `table-layout: fixed` + `<colgroup>` con anchos en px fijos por columna — evita que un nombre de empleado o departamento largo desalinee las demás filas (el `table-layout: auto` por defecto no lo garantiza, sobre todo con filas `colspan` mezcladas con filas normales).
- **Celdas editables directas** (días, IHSS, RAP, ISR, Crefisa, Transporte, Radios, I. Vecinal, Uniforme, Garden): `<input type="number">` dentro de la celda, `w-full` (¡no ancho fijo! — un input más angosto que la columna hace que el número no quede alineado con el encabezado), guardado en `@blur` vía `store.updateDetalle(..., { silent: true })`. El spinner nativo del input se oculta con CSS (`::-webkit-*-spin-button` + `appearance: textfield`) — en Firefox el spinner reserva espacio distinto y corría el texto fuera de la columna.
- **Horas Extra / Otros Ingresos / Otras Deducciones**: celda clicable que abre un modal chico. Horas Extra pide la cantidad de horas y muestra el monto calculado en vivo (`salario_diario del empleado / 8 × horas`); Otros Ingresos y Otras Deducciones comparten un mismo modal (descripción + monto).
- **Scroll**: contenedor con `max-h-[65vh] overflow-auto` (X e Y), `<thead>`/`<tfoot>` con `sticky top-0`/`sticky bottom-0` — pensado para cuando la planilla tenga 100+ empleados (encabezado y total siempre visibles).
- **Exportar Excel**: botón nuevo junto a Exportar PDF, llama a `/planillas/{id}/excel` (mismo patrón fetch+blob que `exportarPdf`).
- Columnas IHSS/ISR/Crefisa se ocultan cuando `tipo_planilla === 'Extras'` (no aplican a personal temporal).

### `src/stores/planillas.js`
`updateDetalle(planillaId, detalleId, payload, { silent = false } = {})` — con `silent: true` no dispara el toast de éxito (usado por el autoguardado de cada celda; sin esto sería un toast por cada campo editado).

### Departamentos / Puestos (`DepartamentosIndex.vue`)
Reemplazado el `confirm()` nativo del navegador por un modal de confirmación propio (`showConfirm`/`confirmarDesactivar`) con estado de carga y mensaje explicando el efecto de desactivar.

### Incidencias / Log del Sistema
Botón de descarga de PDF conectado a los endpoints nuevos del backend (`/incidencias/{id}/pdf`, `/log-sistema/pdf`), con manejo de errores por status code (500, 401, sin red).

### Consistencia visual (todas las tablas de listado)
- Botones de acción (Editar/Eliminar/Ver/Desactivar) migrados de texto+ícono a **solo ícono con `title`** (tooltip nativo), agrupados en un `flex` al final de la fila.
- Skeletons de carga unificados de `gray-100` a `slate-200`/`slate-100` en todos los módulos.
- Spinners de carga de página completa (empleado detalle, planilla detalle, aguinaldo detalle) ahora incluyen texto descriptivo ("Cargando ficha del empleado...", etc.) en vez de solo el ícono girando.

---

## Historial de sesiones / cambios

### 2026-08-27 — commit `944c279`
- `PlanillaDetalle.vue` reescrito como grilla editable estilo Excel (ver detalle arriba): agrupación por departamento con subtotales, columnas con ancho fijo (`table-fixed` + `colgroup`), edición directa en celda para campos simples, modales chicos para Horas Extra/Otros Ingresos/Otras Deducciones, scroll vertical con header/footer fijos, botón Exportar Excel.
- Fix de alineación por navegador: se ocultó el spinner nativo de `<input type="number">` (afectaba especialmente a Firefox).
- Corregido `.gitignore`: estaba guardado en UTF-16 y Git no aplicaba las reglas de verdad (`node_modules` no quedaba realmente ignorado). Reescrito en UTF-8 y se agregó `src/assets/recursos/` (excels de referencia con datos reales de empleados: nombres, salarios, cuentas bancarias — nunca se suben al repo).
- Corregido el texto de `PlanillaCrear.vue` que decía "RAP e ISR calculados automáticamente" (ya no aplica).

### 2026-08-26 — commit `d356c63`
Ver detalle completo arriba. Resumen: rebrand Hotel Palma Real y Villas, sincronización de la UI de vacaciones con el nuevo cálculo de saldo del backend, sanitizadores de input y autocompletado de salario mínimo en el formulario de empleados, descarga de PDF en incidencias y log del sistema, modal de confirmación reemplazando `confirm()`, y limpieza visual de botones/skeletons en todos los listados.

> Nota: quedaron sin commitear (por no estar referenciadas en el código) dos capturas de pantalla sueltas en `src/assets/` — probablemente usadas para extraer los colores del logo durante el rebrand.

### Commits previos relevantes
| Commit | Descripción |
|---|---|
| `ed2cb2c` | Módulos de empleados, planillas, banco, usuarios y exportación de PDF; corrección de bugs |
| `df639d0` | fix: `@reference "tailwindcss"` en bloques `<style scoped>` con `@apply` (Tailwind v4) |
| `962622e` | Módulo 2 - Empleados (frontend completo) |
| `9b8de80` | Módulo 1 - Autenticación y layout base |

---

## Notas de arquitectura (vigentes)

- **Skeleton loaders** en todas las tablas de listado mientras `loading === true`.
- **Estado vacío** con mensaje centrado cuando la lista está vacía.
- **Eliminación/desactivación solo en estado Activo**: el botón correspondiente se oculta con `v-if`.
- **Formateo de fechas**: `new Date(d + 'T00:00:00')` para evitar desfase de timezone al parsear fechas ISO sin hora.
- **Lazy-loading** de todas las vistas de módulo vía `() => import(...)` en el router.
