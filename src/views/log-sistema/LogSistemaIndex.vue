<script setup>
import { ref, onMounted } from 'vue'
import { useLogSistemaStore } from '../../stores/logSistema'

const store = useLogSistemaStore()

// ── Filtros ───────────────────────────────────────────────────────────────────
const filtros = ref({ modulo: '', accion: '', search: '', fecha_desde: '', fecha_hasta: '' })

const MODULOS  = ['Empleados', 'Vacaciones', 'Incidencias', 'Usuarios', 'Sistema']
const ACCIONES = ['creado', 'editado', 'eliminado', 'login']

const descargandoPdf = ref(false)

async function aplicarFiltros() {
  await store.fetchLogs({ ...filtros.value, page: 1 })
}

async function limpiarFiltros() {
  filtros.value = { modulo: '', accion: '', search: '', fecha_desde: '', fecha_hasta: '' }
  await store.fetchLogs()
}

async function descargarPdf() {
  descargandoPdf.value = true
  try {
    await store.downloadPdf(filtros.value)
  } finally {
    descargandoPdf.value = false
  }
}

async function cambiarPagina(url) {
  if (!url) return
  const page = new URL(url).searchParams.get('page')
  await store.fetchLogs({ ...filtros.value, page })
}

onMounted(() => store.fetchLogs())

// ── Helpers ───────────────────────────────────────────────────────────────────
const accionClases = {
  creado:   'bg-emerald-100 text-emerald-700',
  editado:  'bg-blue-100 text-blue-700',
  eliminado:'bg-red-100 text-red-700',
  login:    'bg-purple-100 text-purple-700',
  logout:   'bg-slate-100 text-slate-600',
}

const accionIconos = {
  creado:   'M12 4.5v15m7.5-7.5h-15',
  editado:  'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125',
  eliminado:'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  login:    'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9',
  logout:   'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
}

function badgeClass(accion) {
  return accionClases[accion] ?? 'bg-slate-100 text-slate-600'
}

function iconPath(accion) {
  return accionIconos[accion] ?? accionIconos.editado
}

function formatDateTime(dt) {
  if (!dt) return '—'
  const d = new Date(String(dt).slice(0, 19).replace('T', ' '))
  if (isNaN(d)) return dt
  return d.toLocaleString('es-HN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-slate-800">Log del Sistema</h2>
        <p class="text-sm text-slate-500 mt-0.5">Historial de actividad: acciones registradas por todos los usuarios</p>
      </div>
      <button
        @click="descargarPdf"
        :disabled="descargandoPdf"
        class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        title="Descargar PDF con los filtros aplicados"
      >
        <svg v-if="descargandoPdf" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {{ descargandoPdf ? 'Generando...' : 'Descargar PDF' }}
      </button>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

        <!-- Búsqueda libre -->
        <div class="lg:col-span-2 relative">
          <input
            v-model="filtros.search"
            @keyup.enter="aplicarFiltros"
            type="text"
            placeholder="Buscar en descripción..."
            class="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
            class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        <!-- Módulo -->
        <select v-model="filtros.modulo"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Todos los módulos</option>
          <option v-for="m in MODULOS" :key="m" :value="m">{{ m }}</option>
        </select>

        <!-- Acción -->
        <select v-model="filtros.accion"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Todas las acciones</option>
          <option v-for="a in ACCIONES" :key="a" :value="a">{{ a.charAt(0).toUpperCase() + a.slice(1) }}</option>
        </select>

        <!-- Botones -->
        <div class="flex gap-2">
          <button @click="aplicarFiltros"
            class="flex-1 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            Filtrar
          </button>
          <button @click="limpiarFiltros"
            class="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm rounded-lg transition-colors">
            Limpiar
          </button>
        </div>

        <!-- Rango de fechas -->
        <div class="flex items-center gap-2 sm:col-span-2 lg:col-span-5">
          <span class="text-xs text-slate-500 whitespace-nowrap">Rango de fechas:</span>
          <input v-model="filtros.fecha_desde" type="date"
            class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span class="text-slate-400 text-sm">—</span>
          <input v-model="filtros.fecha_hasta" type="date"
            class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button @click="aplicarFiltros" class="text-xs text-blue-600 hover:text-blue-800 font-medium">Aplicar</button>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 class="font-semibold text-slate-700">Registros de actividad</h3>
        <span class="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          {{ store.pagination?.total ?? 0 }} registros
        </span>
      </div>

      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-5 py-3 font-semibold text-slate-600 w-40">Fecha / Hora</th>
            <th class="text-left px-5 py-3 font-semibold text-slate-600 w-28">Módulo</th>
            <th class="text-left px-5 py-3 font-semibold text-slate-600 w-24">Acción</th>
            <th class="text-left px-5 py-3 font-semibold text-slate-600">Descripción</th>
            <th class="text-left px-5 py-3 font-semibold text-slate-600 w-32">Usuario</th>
          </tr>
        </thead>
        <tbody>
          <!-- Skeleton -->
          <template v-if="store.loading">
            <tr v-for="i in 8" :key="i" class="border-b border-slate-100">
              <td class="px-5 py-3"><div class="h-4 w-32 bg-slate-200 rounded animate-pulse" /></td>
              <td class="px-5 py-3"><div class="h-4 w-20 bg-slate-200 rounded animate-pulse" /></td>
              <td class="px-5 py-3"><div class="h-5 w-16 bg-slate-200 rounded-full animate-pulse" /></td>
              <td class="px-5 py-3"><div class="h-4 w-56 bg-slate-200 rounded animate-pulse" /></td>
              <td class="px-5 py-3"><div class="h-4 w-24 bg-slate-200 rounded animate-pulse" /></td>
            </tr>
          </template>

          <!-- Sin resultados -->
          <tr v-else-if="store.logs.length === 0">
            <td colspan="5" class="text-center py-14 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor"
                class="w-10 h-10 mx-auto mb-2 text-slate-300">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <p class="text-sm">No hay registros con los filtros aplicados</p>
            </td>
          </tr>

          <!-- Datos -->
          <tr v-else v-for="log in store.logs" :key="log.id"
            class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
              {{ formatDateTime(log.created_at) }}
            </td>
            <td class="px-5 py-3">
              <span class="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {{ log.objeto_actualizado ?? '—' }}
              </span>
            </td>
            <td class="px-5 py-3">
              <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                :class="badgeClass(log.accion)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                  stroke="currentColor" class="w-3 h-3">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="iconPath(log.accion)" />
                </svg>
                {{ log.accion }}
              </span>
            </td>
            <td class="px-5 py-3 text-slate-700 max-w-xs">
              {{ log.descripcion ?? '—' }}
            </td>
            <td class="px-5 py-3 text-slate-500 text-xs">
              {{ log.usuario?.name ?? '—' }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Paginación -->
      <div v-if="store.pagination?.last_page > 1"
        class="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
        <span class="text-xs text-slate-500">
          Mostrando {{ store.pagination.from }}–{{ store.pagination.to }} de {{ store.pagination.total }}
        </span>
        <div class="flex items-center gap-1">
          <button @click="cambiarPagina(store.pagination.prev_page_url)"
            :disabled="!store.pagination.prev_page_url"
            class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
            Anterior
          </button>
          <span class="text-xs text-slate-600 px-2">
            {{ store.pagination.current_page }} / {{ store.pagination.last_page }}
          </span>
          <button @click="cambiarPagina(store.pagination.next_page_url)"
            :disabled="!store.pagination.next_page_url"
            class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
            Siguiente
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
