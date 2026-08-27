<script setup>
import { ref } from 'vue'
import { useEstadisticaLaboralStore } from '../../stores/estadisticaLaboral'

const store = useEstadisticaLaboralStore()

// ── filtros ───────────────────────────────────────────────────────────────────

const filtros = ref({ search: '', fecha_inicio: '', fecha_fin: '' })
const buscado = ref(false)

function paramsActuales(page) {
  const p = {}
  if (page)                      p.page         = page
  if (filtros.value.search)      p.search        = filtros.value.search
  if (filtros.value.fecha_inicio)p.fecha_inicio  = filtros.value.fecha_inicio
  if (filtros.value.fecha_fin)   p.fecha_fin     = filtros.value.fecha_fin
  return p
}

async function buscar(page) {
  await store.fetchEstadistica(paramsActuales(page))
  buscado.value = true
}

function limpiar() {
  filtros.value = { search: '', fecha_inicio: '', fecha_fin: '' }
  store.rows       = []
  store.totales    = null
  store.pagination = null
  buscado.value    = false
}

function cambiarPagina(url) {
  if (!url) return
  const page = new URL(url).searchParams.get('page')
  buscar(page)
}

async function exportarPdf() {
  await store.downloadPdf(paramsActuales())
}

// ── modal detalle ─────────────────────────────────────────────────────────────

const showDetalle = ref(false)

async function verDetalle(row) {
  showDetalle.value = true
  const params = {}
  if (filtros.value.fecha_inicio) params.fecha_inicio = filtros.value.fecha_inicio
  if (filtros.value.fecha_fin)    params.fecha_fin    = filtros.value.fecha_fin
  await store.fetchDetalle(row.id_empleado, params)
}

// ── formatters ────────────────────────────────────────────────────────────────

function formatLPS(val) {
  if (!val && val !== 0) return '—'
  return 'L. ' + new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

function formatDias(val) {
  return (parseFloat(val) || 0).toLocaleString('es-HN')
}

function formatFecha(d) {
  if (!d) return '—'
  return new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-HN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatPeriodo() {
  if (!filtros.value.fecha_inicio && !filtros.value.fecha_fin) return 'Todos los períodos'
  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' }) : '…'
  return `${fmt(filtros.value.fecha_inicio)} — ${fmt(filtros.value.fecha_fin)}`
}

function iniciales(nombres, apellidos) {
  return (nombres?.[0] ?? '') + (apellidos?.[0] ?? '')
}

const AVATAR_COLORS = [
  'bg-blue-500','bg-emerald-500','bg-violet-500','bg-rose-500',
  'bg-amber-500','bg-cyan-500','bg-pink-500','bg-indigo-500',
]
function avatarColor(id) { return AVATAR_COLORS[id % AVATAR_COLORS.length] }

function tipoBadge(tipo) {
  return tipo === 'Fijos'
    ? 'bg-blue-100 text-blue-700'
    : tipo === 'Extras'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-slate-100 text-slate-600'
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-slate-800">Estadística Laboral</h2>
        <p class="text-sm text-slate-500 mt-0.5">Días trabajados y salario neto devengado por empleado en el período seleccionado.</p>
      </div>
      <button
        v-if="buscado && store.rows.length > 0"
        @click="exportarPdf"
        :disabled="store.exportando"
        class="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
      >
        <svg v-if="store.exportando" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
        </svg>
        {{ store.exportando ? 'Exportando...' : 'Exportar PDF' }}
      </button>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Filtros de búsqueda</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1.5">Empleado</label>
          <input
            v-model="filtros.search"
            type="text"
            placeholder="Nombre o apellido..."
            @keyup.enter="buscar()"
            class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1.5">Fecha inicio</label>
          <input
            v-model="filtros.fecha_inicio"
            type="date"
            class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1.5">Fecha fin</label>
          <input
            v-model="filtros.fecha_fin"
            type="date"
            class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </div>
      <div class="flex items-center justify-between mt-4">
        <button v-if="buscado" @click="limpiar" class="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          Limpiar búsqueda
        </button>
        <span v-else />
        <button
          @click="buscar()"
          :disabled="store.loading"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg v-if="store.loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          {{ store.loading ? 'Buscando...' : 'Generar estadística' }}
        </button>
      </div>
    </div>

    <!-- Estado inicial -->
    <div v-if="!buscado && !store.loading" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
        </svg>
      </div>
      <p class="text-slate-500 font-medium">Configura los filtros y genera la estadística</p>
      <p class="text-slate-400 text-sm mt-1">Puedes buscar por empleado, por rango de fechas, o ambos.</p>
    </div>

    <!-- Resultados -->
    <template v-if="buscado || store.loading">

      <!-- Cards totales -->
      <div v-if="store.totales" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div class="p-3 rounded-xl bg-blue-50 flex-shrink-0">
            <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-xs text-slate-500 font-medium">Empleados</p>
            <p class="text-2xl font-bold text-blue-700">{{ store.totales.total_empleados ?? 0 }}</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div class="p-3 rounded-xl bg-indigo-50 flex-shrink-0">
            <svg class="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"/>
            </svg>
          </div>
          <div>
            <p class="text-xs text-slate-500 font-medium">Total días trabajados</p>
            <p class="text-2xl font-bold text-indigo-700">{{ formatDias(store.totales.total_dias) }}</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div class="p-3 rounded-xl bg-emerald-50 flex-shrink-0">
            <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-xs text-slate-500 font-medium">Salario neto devengado</p>
            <p class="text-xl font-bold text-emerald-700 leading-tight mt-0.5">{{ formatLPS(store.totales.total_salario_neto) }}</p>
          </div>
        </div>
      </div>

      <!-- Período info -->
      <div v-if="store.totales" class="flex items-center gap-2 text-xs text-slate-500">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Período: <span class="font-medium text-slate-700">{{ formatPeriodo() }}</span>
        <span class="text-slate-300">·</span>
        {{ store.totales.total_quincenas }} quincena(s) procesada(s)
      </div>

      <!-- Tabla -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="text-left px-5 py-3 font-semibold text-slate-600">Empleado</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600">Departamento</th>
                <th class="text-center px-4 py-3 font-semibold text-slate-600">Quincenas</th>
                <th class="text-center px-4 py-3 font-semibold text-slate-600">Días trabajados</th>
                <th class="text-right px-4 py-3 font-semibold text-slate-600">Salario base</th>
                <th class="text-right px-4 py-3 font-semibold text-slate-600">Deducciones</th>
                <th class="text-right px-5 py-3 font-semibold text-slate-600">Salario neto</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <!-- Skeleton -->
              <template v-if="store.loading">
                <tr v-for="i in 8" :key="i" class="border-b border-slate-100">
                  <td class="px-5 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-full bg-slate-200 animate-pulse flex-shrink-0"></div>
                      <div class="h-3.5 w-32 bg-slate-200 rounded animate-pulse"></div>
                    </div>
                  </td>
                  <td class="px-4 py-3"><div class="h-3.5 w-24 bg-slate-200 rounded animate-pulse"></div></td>
                  <td class="px-4 py-3 text-center"><div class="h-3.5 w-8 bg-slate-200 rounded animate-pulse mx-auto"></div></td>
                  <td class="px-4 py-3 text-center"><div class="h-3.5 w-10 bg-slate-200 rounded animate-pulse mx-auto"></div></td>
                  <td class="px-4 py-3 text-right"><div class="h-3.5 w-24 bg-slate-200 rounded animate-pulse ml-auto"></div></td>
                  <td class="px-4 py-3 text-right"><div class="h-3.5 w-20 bg-slate-200 rounded animate-pulse ml-auto"></div></td>
                  <td class="px-5 py-3 text-right"><div class="h-3.5 w-24 bg-slate-200 rounded animate-pulse ml-auto"></div></td>
                  <td class="px-4 py-3"></td>
                </tr>
              </template>

              <!-- Sin resultados -->
              <tr v-else-if="store.rows.length === 0">
                <td colspan="8" class="text-center py-14 text-slate-400">
                  No se encontraron registros en el período seleccionado.
                </td>
              </tr>

              <!-- Filas -->
              <tr
                v-else
                v-for="row in store.rows"
                :key="row.id_empleado"
                class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td class="px-5 py-3">
                  <div class="flex items-center gap-3">
                    <div :class="[avatarColor(row.id_empleado), 'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0']">
                      {{ iniciales(row.nombres, row.apellidos) }}
                    </div>
                    <span class="font-semibold text-slate-800">{{ row.nombres }} {{ row.apellidos }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-slate-600">{{ row.departamento }}</td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold min-w-[1.75rem]">
                    {{ row.total_quincenas }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold min-w-[2.5rem]">
                    {{ formatDias(row.total_dias) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right text-slate-600 tabular-nums">{{ formatLPS(row.total_salario_base) }}</td>
                <td class="px-4 py-3 text-right text-red-500 tabular-nums">– {{ formatLPS(row.total_deducciones) }}</td>
                <td class="px-5 py-3 text-right font-semibold text-emerald-700 tabular-nums">{{ formatLPS(row.total_salario_neto) }}</td>
                <td class="px-4 py-3 text-right">
                  <button @click="verDetalle(row)" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Ver detalle">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </button>
                </td>
              </tr>

              <!-- Fila totales -->
              <tr v-if="!store.loading && store.rows.length > 0 && store.totales" class="bg-slate-50 border-t-2 border-slate-300">
                <td class="px-5 py-3 font-bold text-slate-700" colspan="3">Totales generales</td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-sm font-bold min-w-[2.5rem]">
                    {{ formatDias(store.totales.total_dias) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right font-bold text-slate-700 tabular-nums">{{ formatLPS(store.totales.total_salario_base) }}</td>
                <td class="px-4 py-3 text-right font-bold text-red-600 tabular-nums">– {{ formatLPS(store.totales.total_deducciones) }}</td>
                <td class="px-5 py-3 text-right font-bold text-emerald-700 tabular-nums text-base">{{ formatLPS(store.totales.total_salario_neto) }}</td>
                <td class="px-4 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div v-if="store.pagination?.last_page > 1" class="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <span class="text-xs text-slate-500">
            Mostrando {{ store.pagination.from }}–{{ store.pagination.to }} de {{ store.pagination.total }} empleados
          </span>
          <div class="flex items-center gap-1">
            <button @click="cambiarPagina(store.pagination.prev_page_url)" :disabled="!store.pagination.prev_page_url"
              class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
              Anterior
            </button>
            <span class="text-xs text-slate-600 px-2">{{ store.pagination.current_page }} / {{ store.pagination.last_page }}</span>
            <button @click="cambiarPagina(store.pagination.next_page_url)" :disabled="!store.pagination.next_page_url"
              class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
              Siguiente
            </button>
          </div>
        </div>
      </div>

    </template>
  </div>

  <!-- Modal detalle por empleado -->
  <Teleport to="body">
    <div
      v-if="showDetalle"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showDetalle = false"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">

        <!-- Header modal -->
        <div class="flex items-start justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <template v-if="store.detalle">
              <h3 class="text-base font-bold text-slate-800">
                {{ store.detalle.empleado.nombres }} {{ store.detalle.empleado.apellidos }}
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                {{ store.detalle.empleado.departamento }}
                <span v-if="store.detalle.empleado.puesto !== '—'"> · {{ store.detalle.empleado.puesto }}</span>
                · {{ formatPeriodo() }}
              </p>
            </template>
            <div v-else class="space-y-1.5">
              <div class="h-4 w-48 bg-slate-200 rounded animate-pulse"></div>
              <div class="h-3 w-32 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
          <button @click="showDetalle = false" class="text-slate-400 hover:text-slate-600 transition mt-0.5">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Resumen rápido -->
        <div v-if="store.detalle && !store.loadingDetalle" class="grid grid-cols-4 gap-px bg-slate-200 border-b border-slate-200 flex-shrink-0">
          <div class="bg-white px-4 py-3 text-center">
            <p class="text-xs text-slate-500">Quincenas</p>
            <p class="text-lg font-bold text-slate-800">{{ store.detalle.totales.total_quincenas }}</p>
          </div>
          <div class="bg-white px-4 py-3 text-center">
            <p class="text-xs text-slate-500">Días totales</p>
            <p class="text-lg font-bold text-indigo-700">{{ formatDias(store.detalle.totales.total_dias) }}</p>
          </div>
          <div class="bg-white px-4 py-3 text-center">
            <p class="text-xs text-slate-500">Deducciones</p>
            <p class="text-base font-bold text-red-500">{{ formatLPS(store.detalle.totales.total_deducciones) }}</p>
          </div>
          <div class="bg-white px-4 py-3 text-center">
            <p class="text-xs text-slate-500">Salario neto total</p>
            <p class="text-base font-bold text-emerald-700">{{ formatLPS(store.detalle.totales.total_salario_neto) }}</p>
          </div>
        </div>

        <!-- Tabla quincenas -->
        <div class="overflow-y-auto flex-1">

          <!-- Loading -->
          <div v-if="store.loadingDetalle" class="flex flex-col items-center justify-center py-16 gap-3">
            <svg class="animate-spin w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p class="text-sm text-slate-500">Cargando detalle...</p>
          </div>

          <table v-else-if="store.detalle" class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th class="text-left px-5 py-3 font-semibold text-slate-600 whitespace-nowrap">Fecha</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600">Planilla</th>
                <th class="text-center px-3 py-3 font-semibold text-slate-600">Días</th>
                <th class="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Sal. base</th>
                <th class="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Otros ing.</th>
                <th class="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Deducción</th>
                <th class="text-right px-5 py-3 font-semibold text-slate-600 whitespace-nowrap">Sal. neto</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, i) in store.detalle.detalles"
                :key="i"
                class="border-b border-slate-100 hover:bg-slate-50"
              >
                <td class="px-5 py-2.5 text-slate-600 whitespace-nowrap">{{ formatFecha(d.fecha_generada) }}</td>
                <td class="px-4 py-2.5">
                  <div class="flex items-center gap-1.5">
                    <span class="text-slate-700 text-xs">{{ d.nombre_planilla }}</span>
                    <span :class="[tipoBadge(d.tipo_planilla), 'text-xs px-1.5 py-0.5 rounded-full font-medium']">
                      {{ d.tipo_planilla }}
                    </span>
                  </div>
                  <p v-if="d.desc_ingresos" class="text-xs text-emerald-600 mt-0.5">+ {{ d.desc_ingresos }}</p>
                  <p v-if="d.desc_otras_deducciones" class="text-xs text-red-500 mt-0.5">– {{ d.desc_otras_deducciones }}</p>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span class="inline-flex items-center justify-center w-8 h-6 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                    {{ d.dias_trabajados }}
                  </span>
                </td>
                <td class="px-4 py-2.5 text-right text-slate-600 tabular-nums whitespace-nowrap">{{ formatLPS(d.salario_base) }}</td>
                <td class="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                  <span v-if="d.otros_ingresos > 0" class="text-emerald-600">+{{ formatLPS(d.otros_ingresos) }}</span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-4 py-2.5 text-right text-red-500 tabular-nums whitespace-nowrap">– {{ formatLPS(d.deduccion_neta) }}</td>
                <td class="px-5 py-2.5 text-right font-semibold text-emerald-700 tabular-nums whitespace-nowrap">{{ formatLPS(d.salario_neto) }}</td>
              </tr>

              <!-- Totales -->
              <tr class="bg-slate-50 border-t-2 border-slate-300">
                <td class="px-5 py-3 font-bold text-slate-700" colspan="2">Total del período</td>
                <td class="px-3 py-3 text-center">
                  <span class="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-sm font-bold">
                    {{ formatDias(store.detalle.totales.total_dias) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">{{ formatLPS(store.detalle.totales.total_salario_base) }}</td>
                <td class="px-4 py-3 text-right font-bold text-emerald-600 tabular-nums whitespace-nowrap">
                  <span v-if="store.detalle.totales.total_otros_ingresos > 0">+{{ formatLPS(store.detalle.totales.total_otros_ingresos) }}</span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-4 py-3 text-right font-bold text-red-600 tabular-nums whitespace-nowrap">– {{ formatLPS(store.detalle.totales.total_deducciones) }}</td>
                <td class="px-5 py-3 text-right font-bold text-emerald-700 tabular-nums text-base whitespace-nowrap">{{ formatLPS(store.detalle.totales.total_salario_neto) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer modal -->
        <div class="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button @click="showDetalle = false"
            class="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
