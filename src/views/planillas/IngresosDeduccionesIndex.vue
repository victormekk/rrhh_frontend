<script setup>
import { ref, computed, onMounted } from 'vue'
import { useIngresosDeduccionesStore } from '../../stores/ingresosDeducciones'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

const store     = useIngresosDeduccionesStore()
const authStore = useAuthStore()
const { error } = useToast()

// Columnas de la planilla donde puede caer cada tipo (igual que el backend).
const COLUMNAS = {
  Ingreso: [
    { valor: 'otros_ingresos', nombre: 'Otros ingresos' },
  ],
  Deduccion: [
    { valor: 'otras_deducciones', nombre: 'Otras deducciones' },
    { valor: 'retencion_ahorro',  nombre: 'RAP' },
    { valor: 'crefisa',           nombre: 'Crefisa' },
    { valor: 'transporte',        nombre: 'Transporte' },
    { valor: 'radios',            nombre: 'Radios' },
    { valor: 'i_vecinal',         nombre: 'Impuesto vecinal' },
    { valor: 'uniforme',          nombre: 'Uniforme' },
    { valor: 'garden',            nombre: 'Garden' },
  ],
}
const NOMBRE_COLUMNA = Object.fromEntries(
  [...COLUMNAS.Ingreso, ...COLUMNAS.Deduccion].map(c => [c.valor, c.nombre])
)

// ── filtros ───────────────────────────────────────────────────────────────────
const filtroSearch = ref('')
const filtroTipo   = ref('')
const filtroEstado = ref('Activo')
let debounceFiltro = null

async function cargarDatos(page) {
  await store.fetchRegistros({
    search: filtroSearch.value || undefined,
    tipo:   filtroTipo.value   || undefined,
    estado: filtroEstado.value || undefined,
    page,
  })
}

function onBuscar() {
  clearTimeout(debounceFiltro)
  debounceFiltro = setTimeout(() => cargarDatos(), 300)
}

function limpiarFiltros() {
  filtroSearch.value = ''
  filtroTipo.value   = ''
  filtroEstado.value = 'Activo'
  cargarDatos()
}

function cambiarPagina(url) {
  if (!url) return
  cargarDatos(new URL(url).searchParams.get('page'))
}

onMounted(() => cargarDatos())

// ── modal crear/editar ────────────────────────────────────────────────────────
const showModal  = ref(false)
const editando   = ref(null)
const saving     = ref(false)
const errorModal = ref('')

function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formVacio() {
  return {
    id_empleado:  null,
    tipo:         'Deduccion',
    concepto:     '',
    columna:      'otras_deducciones',
    monto:        '',
    frecuencia:   'Quincenal',
    quincena_mes: 1,
    con_cuotas:   true,
    total_cuotas: '',
    fecha_inicio: hoy(),
    observacion:  '',
  }
}
const form = ref(formVacio())

const columnasDelTipo = computed(() => COLUMNAS[form.value.tipo])
// Con cuotas ya cargadas en planillas no se cambia el empleado ni el tipo (el backend también lo bloquea).
const bloqueado = computed(() => (editando.value?.aplicaciones_count ?? 0) > 0)

function elegirTipo(tipo) {
  if (bloqueado.value) return
  form.value.tipo    = tipo
  form.value.columna = COLUMNAS[tipo][0].valor
}

// Resumen del plan, ej. "Total L 12,000.00 en 24 quincenas (unos 12 meses)".
const resumenPlan = computed(() => {
  const monto  = Number(form.value.monto)
  const cuotas = Number(form.value.total_cuotas)
  if (!(monto > 0)) return ''
  const porMes = form.value.frecuencia === 'Quincenal' ? 'cada quincena' : 'cada mes'
  if (!form.value.con_cuotas) return `L ${fmt(monto)} ${porMes}, hasta que se pause o cancele.`
  if (!(cuotas > 0)) return ''
  const meses = form.value.frecuencia === 'Quincenal' ? cuotas / 2 : cuotas
  const plazo = form.value.frecuencia === 'Quincenal' ? `${cuotas} quincena${cuotas === 1 ? '' : 's'}` : `${cuotas} mes${cuotas === 1 ? '' : 'es'}`
  const aprox = form.value.frecuencia === 'Quincenal' && cuotas > 1 ? ` (unos ${fmtNum(meses)} meses)` : ''
  return `Total L ${fmt(monto * cuotas)} en ${plazo}${aprox}.`
})

// Typeahead empleado
const empleadoQuery    = ref('')
const empleadoSel      = ref(null)
const sugerencias      = ref([])
const buscandoEmpleado = ref(false)
let debounceEmpleado   = null

function onEmpleadoInput() {
  empleadoSel.value = null
  form.value.id_empleado = null
  if (empleadoQuery.value.length < 2) { sugerencias.value = []; return }
  clearTimeout(debounceEmpleado)
  debounceEmpleado = setTimeout(async () => {
    buscandoEmpleado.value = true
    try {
      sugerencias.value = await store.buscarEmpleados(empleadoQuery.value)
    } finally {
      buscandoEmpleado.value = false
    }
  }, 300)
}

function seleccionarEmpleado(emp) {
  empleadoSel.value      = emp
  form.value.id_empleado = emp.id
  empleadoQuery.value    = `${emp.nombres} ${emp.apellidos}`
  sugerencias.value      = []
}

function abrirCrear() {
  editando.value      = null
  empleadoSel.value   = null
  empleadoQuery.value = ''
  sugerencias.value   = []
  form.value          = formVacio()
  errorModal.value    = ''
  showModal.value     = true
}

function abrirEditar(r) {
  editando.value      = r
  empleadoSel.value   = r.empleado
  empleadoQuery.value = `${r.empleado.nombres} ${r.empleado.apellidos}`
  sugerencias.value   = []
  form.value = {
    id_empleado:  r.id_empleado,
    tipo:         r.tipo,
    concepto:     r.concepto,
    columna:      r.columna,
    monto:        Number(r.monto),
    frecuencia:   r.frecuencia,
    quincena_mes: r.quincena_mes ?? 1,
    con_cuotas:   r.total_cuotas !== null,
    total_cuotas: r.total_cuotas ?? '',
    fecha_inicio: String(r.fecha_inicio).slice(0, 10),
    observacion:  r.observacion ?? '',
  }
  errorModal.value = ''
  showModal.value  = true
}

function cerrarModal() {
  showModal.value   = false
  sugerencias.value = []
}

async function guardar() {
  const f = form.value
  if (!f.id_empleado)                        { errorModal.value = 'Seleccione un empleado.'; return }
  if (!f.concepto.trim())                    { errorModal.value = 'Escriba el concepto.'; return }
  if (!(Number(f.monto) > 0))                { errorModal.value = 'El monto debe ser mayor que cero.'; return }
  if (f.con_cuotas && !(Number(f.total_cuotas) >= 1)) { errorModal.value = 'Indique cuántas cuotas son.'; return }
  if (!f.fecha_inicio)                       { errorModal.value = 'Indique desde cuándo aplica.'; return }

  const payload = {
    id_empleado:  f.id_empleado,
    tipo:         f.tipo,
    concepto:     f.concepto.trim(),
    columna:      f.columna,
    monto:        Number(f.monto),
    frecuencia:   f.frecuencia,
    quincena_mes: f.frecuencia === 'Mensual' ? Number(f.quincena_mes) : null,
    total_cuotas: f.con_cuotas ? Number(f.total_cuotas) : null,
    fecha_inicio: f.fecha_inicio,
    observacion:  f.observacion.trim() || null,
  }

  errorModal.value = ''
  saving.value     = true
  try {
    if (editando.value) await store.updateRegistro(editando.value.id, payload)
    else                await store.createRegistro(payload)
    cerrarModal()
    cargarDatos(store.pagination?.current_page)
  } catch (e) {
    const errs = e.response?.data?.errors
    errorModal.value = errs
      ? Object.values(errs).flat().join(' | ')
      : e.response?.data?.message ?? 'Error al guardar.'
  } finally {
    saving.value = false
  }
}

// ── historial (planillas donde se cargó) ──────────────────────────────────────
const historial = ref({ abierto: false, cargando: false, registro: null })

async function verHistorial(r) {
  historial.value = { abierto: true, cargando: true, registro: { ...r, aplicaciones: [] } }
  try {
    historial.value.registro = { ...r, ...(await store.fetchRegistro(r.id)) }
  } catch {
    error('No se pudo cargar el historial.')
    historial.value.abierto = false
  } finally {
    historial.value.cargando = false
  }
}

// ── cambiar estado / eliminar (con confirmación) ──────────────────────────────
const confirmar = ref({ abierto: false, accion: null, registro: null, trabajando: false })

const TEXTOS_CONFIRMAR = {
  Pausado:   { titulo: 'Pausar registro',   aviso: 'No se cargará en las planillas hasta que lo reanude. No cuenta como cuota pagada.', boton: 'Sí, pausar',   color: 'bg-amber-600 hover:bg-amber-700' },
  Cancelado: { titulo: 'Cancelar registro', aviso: 'Deja de cargarse para siempre (por ejemplo, si ya pagó el préstamo completo). Se conserva el historial.', boton: 'Sí, cancelar', color: 'bg-red-600 hover:bg-red-700' },
  eliminar:  { titulo: 'Eliminar registro', aviso: 'Se borra por completo. Solo es posible si nunca se cargó en una planilla.', boton: 'Sí, eliminar', color: 'bg-red-600 hover:bg-red-700' },
}

function pedirConfirmacion(accion, r) {
  confirmar.value = { abierto: true, accion, registro: r, trabajando: false }
}

async function reanudar(r) {
  try {
    await store.cambiarEstado(r.id, 'Activo')
    cargarDatos(store.pagination?.current_page)
  } catch (e) {
    error(e.response?.data?.message ?? 'No se pudo reanudar.')
  }
}

async function ejecutarConfirmacion() {
  const { accion, registro } = confirmar.value
  confirmar.value.trabajando = true
  try {
    if (accion === 'eliminar') await store.deleteRegistro(registro.id)
    else                       await store.cambiarEstado(registro.id, accion)
    confirmar.value.abierto = false
    cargarDatos(store.pagination?.current_page)
  } catch (e) {
    error(e.response?.data?.message ?? 'No se pudo completar la acción.')
  } finally {
    confirmar.value.trabajando = false
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  return Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtNum(n) {
  return Number(n).toLocaleString('es-HN', { maximumFractionDigits: 1 })
}

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(String(d).slice(0, 10) + 'T00:00:00')
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function frecuenciaTexto(r) {
  if (r.frecuencia === 'Quincenal') return 'Cada quincena'
  return r.quincena_mes === 1 ? 'Mensual · 1ª quinc.' : 'Mensual · 2ª quinc.'
}

function saldo(r) {
  if (r.total_cuotas === null) return null
  return Math.max(0, r.total_cuotas - r.cuotas_pagadas) * Number(r.monto)
}

function porcentaje(r) {
  return r.total_cuotas ? Math.min(100, Math.round(r.cuotas_pagadas / r.total_cuotas * 100)) : 0
}

function estadoClass(estado) {
  return {
    Activo:     'bg-emerald-100 text-emerald-700',
    Pausado:    'bg-amber-100 text-amber-700',
    Completado: 'bg-blue-100 text-blue-700',
    Cancelado:  'bg-slate-100 text-slate-500',
  }[estado] ?? 'bg-slate-100 text-slate-600'
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h2 class="text-xl font-bold text-slate-800">Ingresos/Deducciones</h2>
        <p class="text-sm text-slate-500 mt-0.5">Préstamos, adelantos y bonos que se cargan solos en cada planilla</p>
      </div>
      <button
        @click="abrirCrear"
        class="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nuevo registro
      </button>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <input
        v-model="filtroSearch"
        @input="onBuscar"
        type="text"
        placeholder="Buscar empleado o concepto..."
        class="filtro"
      />
      <select v-model="filtroTipo" @change="cargarDatos()" class="filtro">
        <option value="">Ingresos y deducciones</option>
        <option value="Deduccion">Solo deducciones</option>
        <option value="Ingreso">Solo ingresos</option>
      </select>
      <div class="flex gap-2">
        <select v-model="filtroEstado" @change="cargarDatos()" class="filtro flex-1">
          <option value="">Todos los estados</option>
          <option>Activo</option>
          <option>Pausado</option>
          <option>Completado</option>
          <option>Cancelado</option>
        </select>
        <button @click="limpiarFiltros" title="Limpiar filtros" class="px-3 py-2 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 transition text-xs">✕</button>
      </div>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-slate-600">Empleado</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600">Concepto</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600">Monto</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600">Frecuencia</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 min-w-[140px]">Cuotas</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600">Saldo</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="store.loading">
              <tr v-for="i in 6" :key="i" class="border-b border-slate-100">
                <td v-for="j in 8" :key="j" class="px-4 py-3"><div class="h-4 w-20 bg-slate-200 rounded animate-pulse" /></td>
              </tr>
            </template>

            <tr v-else-if="store.registros.length === 0">
              <td colspan="8" class="text-center py-12 text-slate-400">
                No hay registros{{ filtroEstado ? ` en estado ${filtroEstado}` : '' }}.
              </td>
            </tr>

            <tr
              v-else
              v-for="r in store.registros"
              :key="r.id"
              class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td class="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                {{ r.empleado?.nombres }} {{ r.empleado?.apellidos }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span
                    :class="r.tipo === 'Ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
                    class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                  >{{ r.tipo === 'Ingreso' ? 'Ingreso' : 'Deducción' }}</span>
                  <span class="text-slate-800">{{ r.concepto }}</span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">Columna: {{ NOMBRE_COLUMNA[r.columna] ?? r.columna }}</p>
              </td>
              <td class="px-4 py-3 text-right font-semibold whitespace-nowrap" :class="r.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-red-600'">
                L {{ fmt(r.monto) }}
              </td>
              <td class="px-4 py-3 text-slate-600 whitespace-nowrap">{{ frecuenciaTexto(r) }}</td>
              <td class="px-4 py-3">
                <template v-if="r.total_cuotas">
                  <div class="flex justify-between text-xs text-slate-600 mb-1">
                    <span>{{ r.cuotas_pagadas }} de {{ r.total_cuotas }}</span>
                    <span class="text-slate-400">{{ porcentaje(r) }}%</span>
                  </div>
                  <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-600 rounded-full" :style="{ width: porcentaje(r) + '%' }" />
                  </div>
                </template>
                <span v-else class="text-xs text-slate-500">{{ r.cuotas_pagadas }} pagada{{ r.cuotas_pagadas === 1 ? '' : 's' }} · sin fin</span>
              </td>
              <td class="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                {{ saldo(r) === null ? '—' : `L ${fmt(saldo(r))}` }}
              </td>
              <td class="px-4 py-3">
                <span :class="[estadoClass(r.estado), 'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium']">{{ r.estado }}</span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1">
                  <button @click="verHistorial(r)" class="accion hover:text-blue-600 hover:bg-blue-50" title="Ver planillas donde se cargó">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                  <template v-if="r.estado === 'Activo' || r.estado === 'Pausado'">
                    <button @click="abrirEditar(r)" class="accion hover:text-amber-600 hover:bg-amber-50" title="Editar">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                    </button>
                    <button v-if="r.estado === 'Activo'" @click="pedirConfirmacion('Pausado', r)" class="accion hover:text-amber-600 hover:bg-amber-50" title="Pausar">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" /></svg>
                    </button>
                    <button v-else @click="reanudar(r)" class="accion hover:text-emerald-600 hover:bg-emerald-50" title="Reanudar">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
                    </button>
                    <button @click="pedirConfirmacion('Cancelado', r)" class="accion hover:text-red-600 hover:bg-red-50" title="Cancelar (ya no se cobra)">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    </button>
                  </template>
                  <button
                    v-if="authStore.isAdmin && r.aplicaciones_count === 0"
                    @click="pedirConfirmacion('eliminar', r)"
                    class="accion hover:text-red-600 hover:bg-red-50" title="Eliminar"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div v-if="store.pagination?.last_page > 1" class="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
        <span class="text-xs text-slate-500">
          Mostrando {{ store.pagination.from }}–{{ store.pagination.to }} de {{ store.pagination.total }}
        </span>
        <div class="flex items-center gap-1">
          <button @click="cambiarPagina(store.pagination.prev_page_url)" :disabled="!store.pagination.prev_page_url" class="pagina">Anterior</button>
          <span class="text-xs text-slate-600 px-2">{{ store.pagination.current_page }} / {{ store.pagination.last_page }}</span>
          <button @click="cambiarPagina(store.pagination.next_page_url)" :disabled="!store.pagination.next_page_url" class="pagina">Siguiente</button>
        </div>
      </div>
    </div>

    <p class="text-xs text-slate-400 mt-3">
      Cada registro se carga solo al crear la planilla de la quincena que le toca. Si en una quincena quita el monto de la celda,
      esa cuota no cuenta como pagada y el plazo se corre una quincena.
    </p>
  </div>

  <!-- Modal crear/editar -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="cerrarModal">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 class="text-base font-bold text-slate-800">{{ editando ? 'Editar registro' : 'Nuevo ingreso/deducción' }}</h3>
          <button @click="cerrarModal" class="text-slate-400 hover:text-slate-600 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form @submit.prevent="guardar" class="px-6 py-5 space-y-4 overflow-y-auto">
          <div v-if="errorModal" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{{ errorModal }}</div>

          <!-- Tipo -->
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button" @click="elegirTipo('Deduccion')" :disabled="bloqueado"
              :class="form.tipo === 'Deduccion' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'"
              class="border-2 rounded-lg py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
            >Deducción</button>
            <button
              type="button" @click="elegirTipo('Ingreso')" :disabled="bloqueado"
              :class="form.tipo === 'Ingreso' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'"
              class="border-2 rounded-lg py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
            >Ingreso</button>
          </div>

          <!-- Empleado -->
          <div>
            <label class="campo-label">Empleado <span class="text-red-500">*</span></label>
            <div class="relative">
              <input
                v-model="empleadoQuery" @input="onEmpleadoInput" :disabled="bloqueado"
                type="text" placeholder="Escriba el nombre del empleado..." autocomplete="off"
                class="campo disabled:bg-slate-100 disabled:cursor-not-allowed"
                :class="empleadoSel ? 'border-emerald-400 bg-emerald-50' : ''"
              />
              <span v-if="buscandoEmpleado" class="absolute right-3 top-1/2 -translate-y-1/2">
                <svg class="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              </span>
              <ul v-if="sugerencias.length" class="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                <li v-for="emp in sugerencias" :key="emp.id" @mousedown.prevent="seleccionarEmpleado(emp)" class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm">
                  <span class="font-medium text-slate-800">{{ emp.nombres }} {{ emp.apellidos }}</span>
                  <span class="text-slate-400 text-xs ml-2">{{ emp.cedula }}</span>
                </li>
              </ul>
            </div>
            <p v-if="bloqueado" class="text-xs text-slate-400 mt-1">Ya tiene cuotas en planillas: el empleado y el tipo no se pueden cambiar.</p>
          </div>

          <!-- Concepto + columna -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="campo-label">Concepto <span class="text-red-500">*</span></label>
              <input v-model="form.concepto" type="text" maxlength="50" :placeholder="form.tipo === 'Ingreso' ? 'Ej. Bono de puesto' : 'Ej. Préstamo, Adelanto'" class="campo" />
            </div>
            <div>
              <label class="campo-label">Columna en la planilla</label>
              <select v-model="form.columna" :disabled="columnasDelTipo.length === 1" class="campo disabled:bg-slate-100">
                <option v-for="c in columnasDelTipo" :key="c.valor" :value="c.valor">{{ c.nombre }}</option>
              </select>
            </div>
          </div>

          <!-- Monto + frecuencia -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="campo-label">Monto por {{ form.frecuencia === 'Quincenal' ? 'quincena' : 'mes' }} (L) <span class="text-red-500">*</span></label>
              <input v-model="form.monto" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" class="campo" />
            </div>
            <div>
              <label class="campo-label">Frecuencia</label>
              <select v-model="form.frecuencia" class="campo">
                <option value="Quincenal">Cada quincena</option>
                <option value="Mensual">Una vez al mes</option>
              </select>
            </div>
          </div>

          <div v-if="form.frecuencia === 'Mensual'">
            <label class="campo-label">¿En qué quincena del mes?</label>
            <div class="grid grid-cols-2 gap-2">
              <label class="opcion" :class="form.quincena_mes === 1 ? 'opcion-activa' : ''">
                <input type="radio" v-model="form.quincena_mes" :value="1" class="sr-only" /> 1ª quincena (día 15)
              </label>
              <label class="opcion" :class="form.quincena_mes === 2 ? 'opcion-activa' : ''">
                <input type="radio" v-model="form.quincena_mes" :value="2" class="sr-only" /> 2ª quincena (fin de mes)
              </label>
            </div>
          </div>

          <!-- Duración -->
          <div>
            <label class="campo-label">Duración</label>
            <div class="grid grid-cols-2 gap-2">
              <label class="opcion" :class="form.con_cuotas ? 'opcion-activa' : ''">
                <input type="radio" v-model="form.con_cuotas" :value="true" class="sr-only" /> Número de cuotas
              </label>
              <label class="opcion" :class="!form.con_cuotas ? 'opcion-activa' : ''">
                <input type="radio" v-model="form.con_cuotas" :value="false" class="sr-only" /> Sin fin
              </label>
            </div>
            <div v-if="form.con_cuotas" class="mt-2 flex items-center gap-2">
              <input v-model="form.total_cuotas" type="number" min="1" max="600" step="1" placeholder="Ej. 24" class="campo w-28" />
              <span class="text-sm text-slate-500">{{ form.frecuencia === 'Quincenal' ? 'quincenas (24 = un año)' : 'meses' }}</span>
            </div>
            <p v-if="resumenPlan" class="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-2">{{ resumenPlan }}</p>
          </div>

          <!-- Inicio + observación -->
          <div>
            <label class="campo-label">Aplica desde <span class="text-red-500">*</span></label>
            <input v-model="form.fecha_inicio" type="date" class="campo sm:w-1/2" />
            <p class="text-xs text-slate-400 mt-1">Se carga en las planillas con fecha igual o posterior.</p>
          </div>
          <div>
            <label class="campo-label">Observación</label>
            <textarea v-model="form.observacion" maxlength="200" rows="2" placeholder="Opcional" class="campo resize-none" />
          </div>

          <div class="flex justify-end gap-3 pt-1">
            <button type="button" @click="cerrarModal" class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancelar</button>
            <button type="submit" :disabled="saving" class="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- Modal historial -->
  <Teleport to="body">
    <div v-if="historial.abierto" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="historial.abierto = false">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 class="text-base font-bold text-slate-800">{{ historial.registro.concepto }}</h3>
            <p class="text-xs text-slate-500">{{ historial.registro.empleado?.nombres }} {{ historial.registro.empleado?.apellidos }} · L {{ fmt(historial.registro.monto) }} {{ frecuenciaTexto(historial.registro).toLowerCase() }}</p>
          </div>
          <button @click="historial.abierto = false" class="text-slate-400 hover:text-slate-600 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="px-6 py-4 overflow-y-auto">
          <p v-if="historial.registro.observacion" class="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-4">{{ historial.registro.observacion }}</p>
          <p v-if="historial.cargando" class="text-sm text-slate-400 py-6 text-center">Cargando...</p>
          <p v-else-if="!historial.registro.aplicaciones?.length" class="text-sm text-slate-400 py-6 text-center">
            Todavía no se ha cargado en ninguna planilla. Desde {{ formatDate(historial.registro.fecha_inicio) }}.
          </p>
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="a in historial.registro.aplicaciones" :key="a.id" class="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div class="min-w-0">
                <p class="text-slate-800 truncate">{{ a.planilla?.nombre_planilla ?? '—' }}</p>
                <p class="text-xs text-slate-400">{{ formatDate(a.planilla?.fecha_generada) }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="font-medium text-slate-700">L {{ fmt(a.monto) }}</p>
                <p :class="a.aplicada ? 'text-emerald-600' : 'text-amber-600'" class="text-xs">{{ a.aplicada ? 'Pagada' : 'Planilla abierta' }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal confirmación -->
  <Teleport to="body">
    <div v-if="confirmar.abierto" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" @click.self="confirmar.abierto = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 class="text-base font-bold text-slate-800">{{ TEXTOS_CONFIRMAR[confirmar.accion].titulo }}</h3>
        <div class="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm space-y-1">
          <div class="flex justify-between gap-3"><span class="text-slate-500">Empleado</span><span class="font-semibold text-slate-800 text-right">{{ confirmar.registro.empleado?.nombres }} {{ confirmar.registro.empleado?.apellidos }}</span></div>
          <div class="flex justify-between gap-3"><span class="text-slate-500">Concepto</span><span class="font-semibold text-slate-800 text-right">{{ confirmar.registro.concepto }} · L {{ fmt(confirmar.registro.monto) }}</span></div>
        </div>
        <p class="text-sm text-slate-600">{{ TEXTOS_CONFIRMAR[confirmar.accion].aviso }}</p>
        <div class="flex justify-end gap-3 pt-1">
          <button type="button" @click="confirmar.abierto = false" :disabled="confirmar.trabajando" class="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">Volver</button>
          <button
            type="button" @click="ejecutarConfirmacion" :disabled="confirmar.trabajando"
            :class="TEXTOS_CONFIRMAR[confirmar.accion].color"
            class="px-5 py-2 rounded-lg disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >{{ confirmar.trabajando ? 'Procesando...' : TEXTOS_CONFIRMAR[confirmar.accion].boton }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@reference "tailwindcss";
.filtro     { @apply border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition; }
.campo       { @apply w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition; }
.campo-label { @apply block text-sm font-medium text-slate-700 mb-1.5; }
.opcion      { @apply flex items-center justify-center border-2 border-slate-200 rounded-lg py-2 px-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition text-center; }
.opcion-activa { @apply border-blue-500 bg-blue-50 text-blue-700 font-medium; }
.accion      { @apply p-1.5 text-slate-400 rounded transition; }
.pagina      { @apply px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition; }
</style>
