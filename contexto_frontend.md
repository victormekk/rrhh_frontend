# Contexto de Cambios — RRHH Frontend

**Fecha:** 2026-05-19  
**Rama:** `main`  
**Último commit:** `df639d0` — _"fix: agregar @reference "tailwindcss" en bloques `<style scoped>` con @apply"_

---

## Resumen de cambios

Se incorporaron tres módulos nuevos al sistema RRHH: **Planillas**, **Aguinaldo** e **Incidencias**. Cada módulo sigue el mismo patrón arquitectónico ya establecido (store Pinia + vistas Vue 3 `<script setup>` + router lazy-load).

---

## Archivos nuevos

### Stores (`src/stores/`)

| Archivo | Store | Descripción |
|---|---|---|
| `planillas.js` | `usePlanillasStore` | CRUD de planillas con paginación |
| `aguinaldo.js` | `useAguinaldoStore` | CRUD de aguinaldos, cálculo de totales en cliente |
| `incidencias.js` | `useIncidenciasStore` | CRUD de incidencias con paginación |

#### Detalles por store

**`planillas.js`**
- Estado: `planillas[]`, `planilla` (detalle), `pagination`, `loading`
- Métodos: `fetchPlanillas(params)`, `fetchPlanilla(id)`, `createPlanilla`, `updateDetalle`, `cerrarPlanilla`, `deletePlanilla`, `pdfUrl(id)`
- La lista soporta filtros por tipo/estado y paginación Laravel (`data.data` + `data.meta`)

**`aguinaldo.js`**
- Estado: `lista[]`, `detalle`, `loading`
- Métodos: `fetchLista`, `fetchDetalle(nombre)`, `crear`, `updateFijo(id)`, `updateExtra(id)`, `cerrar(nombre)`, `eliminar(nombre)`, `pdfUrl(nombre)`
- Identificador por `nombre_aguinaldo` (string URL-encoded, no ID numérico)
- Actualización optimista local: al editar un fijo/extra recalcula `totales_fijos`/`totales_extras` en el store sin refetch
- `pdfUrl` construye la URL con el token Bearer como query param (`?token=`)

**`incidencias.js`**
- Estado: `incidencias[]`, `pagination`, `loading`
- Métodos: `fetchIncidencias(params)`, `createIncidencia`, `updateIncidencia(id)`, `deleteIncidencia(id)`

---

### Vistas (`src/views/`)

#### Módulo Planillas (`src/views/planillas/`)

| Vista | Ruta | Función |
|---|---|---|
| `PlanillasIndex.vue` | `/planillas` | Listado con filtros de tipo/estado y paginación |
| `PlanillaCrear.vue` | `/planillas/crear` | Formulario de creación; auto-sugiere nombre según tipo y quincena |
| `PlanillaDetalle.vue` | `/planillas/:id` | Detalle con modal de edición por empleado (ingresos y deducciones) |

**Tipos de planilla:** Fijos · Extras · Especial  
**Campos de detalle editables:** `dias_trabajados`, `salario_diario`, `otros_ingresos`, `ihss`, `retencion_ahorro`, `isr`, `crefisa`, `transporte`, `radios`, `uniforme`, `garden`, `otras_deducciones`  
**Moneda:** Lempiras (L), formateada con `es-HN` locale, 2 decimales

#### Módulo Aguinaldo (`src/views/aguinaldo/`)

| Vista | Ruta | Función |
|---|---|---|
| `AguinaldoIndex.vue` | `/aguinaldo` | Listado de aguinaldos generados |
| `AguinaldoCrear.vue` | `/aguinaldo/crear` | Selección de tipo (Fijos/Extras/Ambos) + nombre + fecha |
| `AguinaldoDetalle.vue` | `/aguinaldo/:nombre` | Tablas separadas por tipo con modal de edición y exportación PDF |

**Fórmulas de cálculo (mostradas en UI y aplicadas en backend):**
- Fijos: `(salario_mensual / 365) × dias_trabajados − anticipo`
- Extras: `diario × dias_promedio + antiguedad − anticipos`

**Preview en tiempo real en el modal:** computed `totalFijoCalc` y `totalExtraCalc`/`subtotalExtraCalc` actualizan el total visible mientras el usuario edita los campos.

**PDF:** descarga blob via `fetch` con header `Authorization: Bearer <token>` — no redirige al navegador directamente.

---

### Router (`src/router/index.js`)

Se agregaron 6 rutas nuevas bajo el layout autenticado `AppLayout`:

```
/planillas               → PlanillasIndex  (lazy)
/planillas/crear         → PlanillaCrear   (lazy)
/planillas/:id           → PlanillaDetalle (lazy)

/aguinaldo               → AguinaldoIndex  (lazy)
/aguinaldo/crear         → AguinaldoCrear  (lazy)
/aguinaldo/:nombre       → AguinaldoDetalle (lazy)  ← param es string, no ID numérico
```

Todas requieren `meta: { requiresAuth: true }`. El guard global ya existía; no se modificó su lógica.

---

## Patrones y convenciones aplicados

- **Skeleton loaders** en todas las tablas de listado (filas con `animate-pulse`) mientras `loading === true`
- **Estado vacío** con mensaje centrado cuando la lista está vacía
- **Badges de color** para tipo y estado: Fijos (azul), Extras (ámbar), Especial/Ambos (púrpura), Activo (emerald), Cerrado (slate)
- **Eliminación solo en estado Activo**: el botón de eliminar se oculta con `v-if="estado === 'Activo'"`
- **Cierre irreversible**: confirm antes de cerrar; tras cerrar se ocultan los botones de edición (`v-if="!esCerrada"`)
- **Formateo de fechas**: `new Date(d + 'T00:00:00')` para evitar desfase de timezone al parsear fechas ISO sin hora

---

## Endpoints de API consumidos

| Módulo | Método | Endpoint |
|---|---|---|
| Planillas | GET | `/planillas?tipo=&estado=&page=` |
| Planillas | GET | `/planillas/:id` |
| Planillas | POST | `/planillas` |
| Planillas | PUT | `/planillas/:id/detalles/:detalleId` |
| Planillas | POST | `/planillas/:id/cerrar` |
| Planillas | DELETE | `/planillas/:id` |
| Planillas | GET | `/planillas/:id/pdf` |
| Aguinaldo | GET | `/aguinaldo` |
| Aguinaldo | GET | `/aguinaldo/:nombre` |
| Aguinaldo | POST | `/aguinaldo` |
| Aguinaldo | PUT | `/aguinaldo/fijos/:id` |
| Aguinaldo | PUT | `/aguinaldo/extras/:id` |
| Aguinaldo | POST | `/aguinaldo/:nombre/cerrar` |
| Aguinaldo | DELETE | `/aguinaldo/:nombre` |
| Aguinaldo | GET | `/aguinaldo/:nombre/pdf` |
| Incidencias | GET | `/incidencias?page=` |
| Incidencias | POST | `/incidencias` |
| Incidencias | PUT | `/incidencias/:id` |
| Incidencias | DELETE | `/incidencias/:id` |

---

## Fix aplicado — Tailwind CSS v4 (`@reference`)

**Commit:** `df639d0`

En Tailwind CSS v4, los bloques `<style scoped>` que usan `@apply` requieren la directiva `@reference "tailwindcss";` al inicio, de lo contrario el compilador no puede resolver las utilidades y lanza un error en tiempo de desarrollo.

Archivos corregidos:
- `src/views/empleados/EmpleadoForm.vue`
- `src/views/planillas/PlanillaCrear.vue`
- `src/views/planillas/PlanillaDetalle.vue`
- `src/views/aguinaldo/AguinaldoCrear.vue`
- `src/views/aguinaldo/AguinaldoDetalle.vue`

---

## Historial de commits

| Commit | Descripción |
|---|---|
| `df639d0` | fix: `@reference "tailwindcss"` en bloques `<style scoped>` con `@apply` |
| `ab7f72a` | Cambios varios en los módulos de RRHH |
| `e198ccd` | Cambio varios en los modulos de RRHH |
| `da8cdd2` | fix: placeholder cédula sin guiones (max 13 dígitos) |
| `962622e` | feat: Módulo 2 - Empleados (frontend completo) |
| `9b8de80` | feat: Módulo 1 - Autenticación y layout base |

---

## Estado pendiente

- Las vistas del módulo **Incidencias** aún no existen (solo el store). Falta implementar `IncidenciasIndex`, `IncidenciaForm` y registrar las rutas.
- Los módulos de Planillas y Aguinaldo ya están en el router pero **no aparecen en el sidebar** del `AppLayout` — pendiente agregar los ítems de navegación correspondientes.
