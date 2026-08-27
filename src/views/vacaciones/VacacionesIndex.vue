<script setup>
import { ref, computed } from 'vue'
import { useVacacionesStore } from '../../stores/vacaciones'
import { useToast } from '../../composables/useToast'

const store = useVacacionesStore()
const { error } = useToast()

// ── Búsqueda de empleado ──────────────────────────────────────────────────────
const empleadoQuery    = ref('')
const sugerencias      = ref([])
const buscandoEmpleado = ref(false)
let debounceTimer      = null

async function onEmpleadoInput() {
  store.limpiar()
  if (empleadoQuery.value.length < 2) { sugerencias.value = []; return }
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    buscandoEmpleado.value = true
    try {
      sugerencias.value = await store.buscarEmpleados(empleadoQuery.value)
    } finally {
      buscandoEmpleado.value = false
    }
  }, 300)
}

async function seleccionarEmpleado(emp) {
  empleadoQuery.value = `${emp.nombres} ${emp.apellidos}`
  sugerencias.value   = []
  await Promise.all([
    store.fetchSaldo(emp.id),
    store.fetchSolicitudes({ id_empleado: emp.id }),
  ])
}

function limpiarBusqueda() {
  empleadoQuery.value = ''
  sugerencias.value   = []
  store.limpiar()
}

// ── Saldo helpers ─────────────────────────────────────────────────────────────
const saldoColor = computed(() => {
  if (!store.saldo) return ''
  const s = store.saldo.saldo
  if (s <= 0)  return 'text-red-600'
  if (s <= 3)  return 'text-amber-600'
  return 'text-emerald-600'
})

function aniosLabel(n) {
  if (n === 0) return 'Menos de 1 año'
  return `${n} ${n === 1 ? 'año' : 'años'}`
}

// ── Modal solicitud ───────────────────────────────────────────────────────────
const showModal  = ref(false)
const editando   = ref(null)
const saving     = ref(false)
const errorModal = ref('')

const form = ref({ fecha_inicio: '', fecha_fin: '', observaciones: '' })

const diasCalculados = computed(() => {
  if (!form.value.fecha_inicio || !form.value.fecha_fin) return 0
  const a = new Date(form.value.fecha_inicio + 'T00:00:00')
  const b = new Date(form.value.fecha_fin    + 'T00:00:00')
  if (b < a) return 0
  let dias = 0
  const cur = new Date(a)
  while (cur <= b) {
    if (cur.getDay() !== 0) dias++ // excluir domingos
    cur.setDate(cur.getDate() + 1)
  }
  return dias
})

// Saldo real disponible: cuando se edita, devolver los días originales al conteo
const saldoEfectivo = computed(() => {
  const base = store.saldo?.saldo ?? 0
  return editando.value ? base + (editando.value.dias_tomados ?? 0) : base
})

// Fecha máxima de fin que agota exactamente el saldo disponible (excluye domingos)
const fechaMaxFin = computed(() => {
  if (!form.value.fecha_inicio || saldoEfectivo.value <= 0) return ''
  const cur = new Date(form.value.fecha_inicio + 'T00:00:00')
  let count = 0
  while (count < saldoEfectivo.value) {
    if (cur.getDay() !== 0) count++
    if (count < saldoEfectivo.value) cur.setDate(cur.getDate() + 1)
  }
  return cur.toISOString().slice(0, 10)
})

const excedeSaldo = computed(() =>
  diasCalculados.value > 0 && diasCalculados.value > saldoEfectivo.value
)

function abrirCrear() {
  editando.value   = null
  form.value       = { fecha_inicio: '', fecha_fin: '', observaciones: '' }
  errorModal.value = ''
  showModal.value  = true
}

function abrirEditar(sol) {
  editando.value = sol
  form.value = {
    fecha_inicio:   String(sol.fecha_inicio).slice(0, 10),
    fecha_fin:      String(sol.fecha_fin).slice(0, 10),
    observaciones:  sol.observaciones ?? '',
  }
  errorModal.value = ''
  showModal.value  = true
}

function cerrarModal() { showModal.value = false }

async function guardar() {
  if (!form.value.fecha_inicio) { errorModal.value = 'La fecha de inicio es requerida.'; return }
  if (!form.value.fecha_fin)    { errorModal.value = 'La fecha de fin es requerida.'; return }
  if (diasCalculados.value <= 0) { errorModal.value = 'La fecha de fin debe ser igual o posterior al inicio.'; return }

  errorModal.value = ''
  saving.value     = true
  try {
    if (editando.value) {
      await store.updateSolicitud(editando.value.id, form.value)
    } else {
      await store.createSolicitud({
        ...form.value,
        id_empleado: store.empleado.id,
      })
    }
    cerrarModal()
    await Promise.all([
      store.fetchSaldo(store.empleado.id, { silent: true }),
      store.fetchSolicitudes({ id_empleado: store.empleado.id }),
    ])
  } catch (e) {
    errorModal.value = e.response?.data?.message ?? 'Error al guardar.'
  } finally {
    saving.value = false
  }
}

async function eliminar(sol) {
  if (!confirm('¿Eliminar esta solicitud de vacaciones? Los días se reintegrarán al saldo.')) return
  try {
    await store.deleteSolicitud(sol.id)
    await Promise.all([
      store.fetchSaldo(store.empleado.id, { silent: true }),
      store.fetchSolicitudes({ id_empleado: store.empleado.id }),
    ])
  } catch {
    error('No se pudo eliminar la solicitud.')
  }
}

async function irPagina(page) {
  await store.fetchSolicitudes({ id_empleado: store.empleado.id, page })
}

// Páginas numeradas con ellipsis
const paginationPages = computed(() => {
  const last = store.pagination?.last_page ?? 1
  const cur  = store.pagination?.current_page ?? 1
  if (last <= 1) return []
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)

  const pages = []
  pages.push(1)
  if (cur > 3) pages.push(null)
  for (let p = Math.max(2, cur - 1); p <= Math.min(last - 1, cur + 2); p++) pages.push(p)
  if (cur < last - 2) pages.push(null)
  pages.push(last)
  return pages
})

const descargandoPdf = ref(null)

async function descargarPdf(sol) {
  descargandoPdf.value = sol.id
  try {
    await store.downloadPdf(sol.id, sol.empleado?.nombres ?? '', sol.empleado?.apellidos ?? '')
  } catch (e) {
    console.error('PDF error:', e?.response?.status, e?.message, e)
    const status = e?.response?.status
    if (status === 500) {
      error('Error interno del servidor al generar el PDF.')
    } else if (status === 401) {
      error('Sesión expirada. Recarga e inicia sesión nuevamente.')
    } else if (!status) {
      error('Error de red. Verifica que el backend esté activo.')
    } else {
      error(`Error ${status} al generar el PDF.`)
    }
  } finally {
    descargandoPdf.value = null
  }
}

// ── Formato ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  const date = new Date(String(d).slice(0, 10) + 'T00:00:00')
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-xl font-bold text-slate-800">Vacaciones</h2>
      <p class="text-sm text-slate-500 mt-0.5">Control de vacaciones conforme al Código de Trabajo de Honduras</p>
    </div>

    <!-- Tabla de derechos por ley (referencia rápida) -->
    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
      <p class="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Días de vacaciones por ley</p>
      <div class="grid grid-cols-4 gap-3 text-center">
        <div v-for="item in [
          { label: '1 año', dias: 10 }, { label: '2 años', dias: 12 },
          { label: '3 años', dias: 15 }, { label: '4+ años', dias: 20 }
        ]" :key="item.label" class="bg-white rounded-lg py-2 border border-blue-100">
          <p class="text-lg font-bold text-blue-700">{{ item.dias }}</p>
          <p class="text-xs text-slate-500">días · {{ item.label }}</p>
        </div>
      </div>
    </div>

    <!-- Buscador de empleado -->
    <div class="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <label class="block text-sm font-semibold text-slate-700 mb-2">Buscar empleado</label>
      <div class="relative max-w-md">
        <input
          v-model="empleadoQuery"
          @input="onEmpleadoInput"
          type="text"
          placeholder="Escribe el nombre del empleado..."
          autocomplete="off"
          class="w-full border border-slate-300 rounded-lg pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
          class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <button v-if="empleadoQuery" @click="limpiarBusqueda"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <!-- Spinner -->
        <span v-if="buscandoEmpleado" class="absolute right-3 top-1/2 -translate-y-1/2">
          <svg class="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </span>
        <!-- Dropdown -->
        <ul v-if="sugerencias.length" class="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          <li
            v-for="emp in sugerencias" :key="emp.id"
            @mousedown.prevent="seleccionarEmpleado(emp)"
            class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm"
          >
            <span class="font-medium text-slate-800">{{ emp.nombres }} {{ emp.apellidos }}</span>
            <span class="text-slate-400 text-xs ml-2">{{ emp.cedula }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- ── Panel del empleado seleccionado ──────────────────────────────────── -->
    <template v-if="store.loadingSaldo">
      <div class="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-xl border border-slate-200">
        <svg class="w-10 h-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p class="text-sm text-slate-500">Cargando saldo de vacaciones...</p>
      </div>
    </template>

    <template v-else-if="store.empleado">

      <!-- Tarjeta de saldo -->
      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center gap-5">

          <!-- Info empleado -->
          <div class="flex items-center gap-4 flex-1">
            <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
              {{ store.empleado.nombres?.charAt(0) }}{{ store.empleado.apellidos?.charAt(0) }}
            </div>
            <div>
              <p class="font-bold text-slate-800 text-base">{{ store.empleado.nombres }} {{ store.empleado.apellidos }}</p>
              <p class="text-sm text-slate-500">{{ store.empleado.puesto?.nombre ?? '—' }} · {{ store.empleado.departamento?.nombre ?? '—' }}</p>
              <p class="text-xs text-slate-400 mt-0.5">{{ aniosLabel(store.saldo?.anios_laborados ?? 0) }} de antigüedad</p>
            </div>
          </div>

          <!-- Métricas de saldo -->
          <div class="flex gap-4 sm:gap-6 text-center">
            <div>
              <p class="text-2xl font-bold" :class="(store.saldo?.dias_previos ?? 0) > 0 ? 'text-indigo-600' : 'text-slate-300'">
                {{ store.saldo?.dias_previos ?? 0 }}
              </p>
              <p class="text-xs text-slate-500">Previos</p>
            </div>
            <div class="w-px bg-slate-200"></div>
            <div>
              <p class="text-2xl font-bold" :class="(store.saldo?.dias_anio_actual ?? 0) > 0 ? 'text-blue-700' : 'text-slate-300'">
                {{ store.saldo?.dias_anio_actual ?? 0 }}
              </p>
              <p class="text-xs text-slate-500">Del período</p>
            </div>
            <div class="w-px bg-slate-200"></div>
            <div>
              <p class="text-2xl font-bold" :class="saldoColor">{{ store.saldo?.saldo ?? 0 }}</p>
              <p class="text-xs text-slate-500">Disponibles</p>
            </div>
          </div>

          <!-- Botón nueva solicitud -->
          <button
            v-if="(store.saldo?.saldo ?? 0) > 0"
            @click="abrirCrear"
            class="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Solicitud de vacaciones
          </button>
          <p v-else-if="(store.saldo?.dias_por_ley ?? 0) === 0" class="text-xs text-amber-600 font-medium text-center">
            Sin días disponibles aún<br/><span class="text-slate-400">(requiere 1 año laborado)</span>
          </p>
          <p v-else class="text-xs text-red-600 font-medium">Sin saldo disponible</p>
        </div>

        <!-- Período aniversario actual + detalle de tomados -->
        <div v-if="store.saldo?.periodo_inicio" class="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            Período actual:
            <span class="font-medium text-slate-700">
              {{ formatDate(store.saldo.periodo_inicio) }} — {{ formatDate(store.saldo.periodo_fin) }}
            </span>
          </span>
          <span class="text-slate-300">·</span>
          <span>
            Tomados este período:
            <span class="font-medium text-slate-600">{{ store.saldo.dias_tomados_periodo ?? 0 }}</span>
          </span>
          <span class="text-slate-300">·</span>
          <span>
            Tomados histórico:
            <span class="font-medium text-slate-600">{{ store.saldo.dias_tomados ?? 0 }}</span>
          </span>
        </div>
      </div>

      <!-- Historial de solicitudes -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-semibold text-slate-700">Historial de solicitudes</h3>
          <span class="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            {{ store.pagination?.total ?? store.solicitudes.length }} registros
          </span>
        </div>

        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="text-left px-5 py-3 font-semibold text-slate-600">Período</th>
              <th class="text-center px-5 py-3 font-semibold text-slate-600">Días</th>
              <th class="text-left px-5 py-3 font-semibold text-slate-600">Observaciones</th>
              <th class="text-right px-5 py-3 font-semibold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="store.loading">
              <tr v-for="i in 3" :key="i" class="border-b border-slate-100">
                <td class="px-5 py-3"><div class="h-4 w-48 bg-slate-200 rounded animate-pulse" /></td>
                <td class="px-5 py-3"><div class="h-4 w-10 bg-slate-200 rounded animate-pulse mx-auto" /></td>
                <td class="px-5 py-3"><div class="h-4 w-32 bg-slate-200 rounded animate-pulse" /></td>
                <td class="px-5 py-3"><div class="h-4 w-24 bg-slate-200 rounded animate-pulse ml-auto" /></td>
              </tr>
            </template>

            <tr v-else-if="store.solicitudes.length === 0">
              <td colspan="4" class="text-center py-10 text-slate-400">No hay solicitudes registradas.</td>
            </tr>

            <tr
              v-else
              v-for="sol in store.solicitudes"
              :key="sol.id"
              class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td class="px-5 py-3 text-slate-700">
                {{ formatDate(sol.fecha_inicio) }}
                <span class="text-slate-400 mx-1">→</span>
                {{ formatDate(sol.fecha_fin) }}
              </td>
              <td class="px-5 py-3 text-center">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                  {{ sol.dias_tomados }}
                </span>
              </td>
              <td class="px-5 py-3 text-slate-500 text-xs max-w-xs truncate" :title="sol.observaciones">
                {{ sol.observaciones || '—' }}
              </td>
              <td class="px-5 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1">
                <button
                  @click="descargarPdf(sol)"
                  :disabled="descargandoPdf === sol.id"
                  class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mr-2"
                  title="Descargar PDF"
                >
                  <svg v-if="descargandoPdf === sol.id" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {{ descargandoPdf === sol.id ? '...' : 'PDF' }}
                </button>
                <button @click="abrirEditar(sol)" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition" title="Editar">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                </button>
                <button @click="eliminar(sol)" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Eliminar">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Paginación numerada -->
        <div v-if="paginationPages.length > 0" class="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <span class="text-xs text-slate-500">
            Mostrando {{ store.pagination.from }}–{{ store.pagination.to }} de {{ store.pagination.total }}
          </span>
          <div class="flex items-center gap-1">
            <!-- Anterior -->
            <button
              @click="irPagina(store.pagination.current_page - 1)"
              :disabled="store.pagination.current_page <= 1 || store.loading"
              class="h-8 w-8 flex items-center justify-center rounded border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            <!-- Números + ellipsis -->
            <template v-for="(page, i) in paginationPages" :key="i">
              <span v-if="page === null" class="h-8 w-6 flex items-end justify-center pb-1.5 text-slate-400 text-xs select-none">…</span>
              <button
                v-else
                @click="irPagina(page)"
                :disabled="store.loading"
                :class="page === store.pagination.current_page
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'"
                class="h-8 min-w-[32px] px-2 text-xs border rounded transition disabled:opacity-60"
              >{{ page }}</button>
            </template>

            <!-- Siguiente -->
            <button
              @click="irPagina(store.pagination.current_page + 1)"
              :disabled="store.pagination.current_page >= store.pagination.last_page || store.loading"
              class="h-8 w-8 flex items-center justify-center rounded border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Estado inicial (sin empleado) -->
    <div v-else-if="!empleadoQuery" class="text-center py-16 text-slate-400">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-12 h-12 mx-auto mb-3 text-slate-300">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <p class="text-sm">Busca un empleado para ver su saldo y solicitudes de vacaciones</p>
    </div>
  </div>

  <!-- Modal solicitud -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="cerrarModal"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 class="text-base font-bold text-slate-800">
            {{ editando ? 'Editar solicitud' : 'Nueva solicitud de vacaciones' }}
          </h3>
          <button @click="cerrarModal" class="text-slate-400 hover:text-slate-600 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="guardar" class="px-6 py-5 space-y-4">
          <div v-if="errorModal" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {{ errorModal }}
          </div>

          <!-- Empleado (solo lectura en crear) -->
          <div class="bg-slate-50 rounded-lg px-4 py-3">
            <p class="text-xs text-slate-500">Empleado</p>
            <p class="font-semibold text-slate-800">{{ store.empleado?.nombres }} {{ store.empleado?.apellidos }}</p>
            <p class="text-xs text-slate-500 mt-0.5">
              Saldo disponible:
              <span class="font-bold" :class="saldoColor">{{ store.saldo?.saldo ?? 0 }} días</span>
            </p>
          </div>

          <!-- Fechas -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Fecha inicio <span class="text-red-500">*</span></label>
              <input v-model="form.fecha_inicio" type="date"
                class="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Fecha fin <span class="text-red-500">*</span></label>
              <input v-model="form.fecha_fin" type="date" :min="form.fecha_inicio" :max="fechaMaxFin || undefined"
                class="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
              <p v-if="fechaMaxFin && form.fecha_inicio" class="text-xs mt-1" :class="excedeSaldo ? 'text-red-500' : 'text-slate-400'">
                Máx. con saldo disponible: <span class="font-medium">{{ formatDate(fechaMaxFin) }}</span>
              </p>
            </div>
          </div>

          <!-- Días calculados + advertencia de saldo -->
          <div
            v-if="diasCalculados > 0"
            class="border rounded-lg px-4 py-2.5"
            :class="excedeSaldo ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'"
          >
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm font-medium" :class="excedeSaldo ? 'text-red-700' : 'text-blue-700'">
                  Días a tomar
                </span>
                <p v-if="excedeSaldo" class="text-xs text-red-600 mt-0.5">
                  Excede el saldo: solo {{ saldoEfectivo }} día{{ saldoEfectivo === 1 ? '' : 's' }} disponible{{ saldoEfectivo === 1 ? '' : 's' }}
                </p>
              </div>
              <span class="text-xl font-bold" :class="excedeSaldo ? 'text-red-700' : 'text-blue-700'">
                {{ diasCalculados }}
              </span>
            </div>
          </div>

          <!-- Observaciones -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Observaciones</label>
            <textarea
              v-model="form.observaciones"
              maxlength="500"
              rows="3"
              placeholder="Motivo u observaciones adicionales..."
              class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            />
            <p class="text-xs text-slate-400 mt-1 text-right">{{ form.observaciones.length }}/500</p>
          </div>

          <div class="flex justify-end gap-3 pt-1">
            <button type="button" @click="cerrarModal"
              class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
            <button type="submit" :disabled="saving"
              class="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {{ saving ? 'Guardando...' : 'Guardar solicitud' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
