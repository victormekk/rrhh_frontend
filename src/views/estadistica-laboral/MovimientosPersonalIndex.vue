<script setup>
import { ref, onMounted } from 'vue'
import { useMovimientosPersonalStore } from '../../stores/movimientosPersonal'
import { useToast } from '../../composables/useToast'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import {
  TIPOS_EVENTO, MOTIVOS_CESE, OPCIONES_LIQUIDACION,
  ESTILO_EVENTO, ESTILO_LIQUIDACION, formatFecha, mensajeError,
} from '../../constants/historialLaboral'

const store = useMovimientosPersonalStore()
const { error: toastError } = useToast()

// ── Filtros ───────────────────────────────────────────────────────────────────
const VACIOS = { search: '', tipo_evento: '', motivo_cese: '', liquidacion: '', desde: '', hasta: '' }
const filtros = ref({ ...VACIOS })

function paramsActuales(extra = {}) {
  // Solo los filtros con valor
  return Object.fromEntries(Object.entries({ ...filtros.value, ...extra }).filter(([, v]) => v !== '' && v != null))
}

async function aplicarFiltros() {
  await store.fetchMovimientos(paramsActuales({ page: 1 }))
}

async function limpiarFiltros() {
  filtros.value = { ...VACIOS }
  await store.fetchMovimientos()
}

async function cambiarPagina(url) {
  if (!url) return
  const page = new URL(url).searchParams.get('page')
  await store.fetchMovimientos(paramsActuales({ page }))
}

// Atajo: ver las liquidaciones que contabilidad aún no confirma
async function verPendientes() {
  filtros.value = { ...VACIOS, liquidacion: 'Pendiente' }
  await aplicarFiltros()
}

onMounted(() => store.fetchMovimientos())

// ── Liquidación ───────────────────────────────────────────────────────────────
const guardandoId = ref(null)

async function cambiarLiquidacion(mov, valor) {
  if (valor === mov.liquidacion) return
  guardandoId.value = mov.id
  try {
    const actualizado = await store.actualizarLiquidacion(mov.id, valor)
    Object.assign(mov, { liquidacion: actualizado.liquidacion, fecha_liquidacion: actualizado.fecha_liquidacion })
  } catch (e) {
    toastError(mensajeError(e, 'No se pudo actualizar la liquidación.'))
  } finally {
    guardandoId.value = null
  }
}

// ── Exportar ──────────────────────────────────────────────────────────────────
const exportando = ref(false)

async function exportar() {
  exportando.value = true
  try {
    await store.exportarExcel(paramsActuales())
  } catch {
    toastError('No se pudo generar el Excel.')
  } finally {
    exportando.value = false
  }
}

function contrato(m) {
  if (m.tipo_contrato_anterior && m.tipo_contrato_nuevo && m.tipo_contrato_anterior !== m.tipo_contrato_nuevo) {
    return `${m.tipo_contrato_anterior} → ${m.tipo_contrato_nuevo}`
  }
  return m.tipo_contrato_nuevo ?? m.tipo_contrato_anterior ?? '—'
}

function detalle(m) {
  if (m.tipo_evento === 'Cese') return m.motivo_cese ?? '—'
  if (m.fecha_inicio_nueva && m.fecha_inicio_anterior && m.tipo_evento !== 'Ingreso') {
    return `Inicio: ${formatFecha(m.fecha_inicio_anterior)} → ${formatFecha(m.fecha_inicio_nueva)}`
  }
  return ''
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h2 class="text-xl font-bold text-slate-800">Movimientos de Personal</h2>
        <p class="text-sm text-slate-500 mt-0.5">Ingresos, ceses, reintegros y cambios de contrato de todos los empleados.</p>
      </div>
      <div class="flex gap-2">
        <button @click="verPendientes"
          class="px-4 py-2 border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-medium rounded-lg transition-colors">
          Liquidaciones pendientes
        </button>
        <button @click="exportar" :disabled="exportando"
          class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <svg v-if="exportando" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          {{ exportando ? 'Generando...' : 'Exportar Excel' }}
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="relative sm:col-span-2 lg:col-span-1">
          <input v-model="filtros.search" @keyup.enter="aplicarFiltros" type="text" placeholder="Nombre o DNI..."
            class="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
            class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <select v-model="filtros.tipo_evento" class="filtro">
          <option value="">Todos los movimientos</option>
          <option v-for="t in TIPOS_EVENTO" :key="t">{{ t }}</option>
        </select>
        <select v-model="filtros.motivo_cese" class="filtro">
          <option value="">Todos los motivos de cese</option>
          <option v-for="m in MOTIVOS_CESE" :key="m">{{ m }}</option>
        </select>
        <select v-model="filtros.liquidacion" class="filtro">
          <option value="">Liquidación: todas</option>
          <option v-for="o in OPCIONES_LIQUIDACION" :key="o">{{ o }}</option>
        </select>

        <div class="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3">
          <span class="text-xs text-slate-500 whitespace-nowrap">Fecha del movimiento:</span>
          <input v-model="filtros.desde" type="date" class="filtro py-1.5" />
          <span class="text-slate-400 text-sm">—</span>
          <input v-model="filtros.hasta" type="date" class="filtro py-1.5" />
        </div>
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
      </div>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 class="font-semibold text-slate-700">Movimientos</h3>
        <span class="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{{ store.pagination?.total ?? 0 }} registros</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="text-left px-5 py-3 font-semibold text-slate-600">Fecha</th>
              <th class="text-left px-5 py-3 font-semibold text-slate-600">Movimiento</th>
              <th class="text-left px-5 py-3 font-semibold text-slate-600">Empleado</th>
              <th class="text-left px-5 py-3 font-semibold text-slate-600">Contrato</th>
              <th class="text-left px-5 py-3 font-semibold text-slate-600">Detalle</th>
              <th class="text-left px-5 py-3 font-semibold text-slate-600">Liquidación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="store.loading">
              <td colspan="6"><LoadingSpinner /></td>
            </tr>
            <tr v-else-if="store.movimientos.length === 0">
              <td colspan="6" class="px-5 py-12 text-center text-slate-400">No hay movimientos con estos filtros.</td>
            </tr>
            <tr v-else v-for="m in store.movimientos" :key="m.id" class="border-b border-slate-100 hover:bg-slate-50 align-top">
              <td class="px-5 py-3 whitespace-nowrap text-slate-700">{{ formatFecha(m.fecha) }}</td>
              <td class="px-5 py-3">
                <span :class="[ESTILO_EVENTO[m.tipo_evento]?.badge ?? 'bg-slate-100 text-slate-600', 'text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap']">
                  {{ m.tipo_evento }}
                </span>
              </td>
              <td class="px-5 py-3">
                <RouterLink :to="`/empleados/${m.id_empleado}`" class="font-medium text-slate-800 hover:text-blue-700">
                  {{ m.empleado?.nombres }} {{ m.empleado?.apellidos }}
                </RouterLink>
                <p class="text-xs text-slate-400">{{ m.empleado?.departamento?.nombre ?? '—' }} · {{ m.empleado?.cedula }}</p>
              </td>
              <td class="px-5 py-3 whitespace-nowrap text-slate-600">{{ contrato(m) }}</td>
              <td class="px-5 py-3 text-slate-600 max-w-xs">
                <p>{{ detalle(m) }}</p>
                <p v-if="m.observaciones" class="text-xs text-slate-400 italic mt-0.5">"{{ m.observaciones }}"</p>
              </td>
              <td class="px-5 py-3 whitespace-nowrap">
                <template v-if="m.liquidacion">
                  <select
                    :value="m.liquidacion"
                    @change="cambiarLiquidacion(m, $event.target.value)"
                    :disabled="guardandoId === m.id"
                    :class="[ESTILO_LIQUIDACION[m.liquidacion], 'text-xs font-semibold rounded-full pl-2 pr-6 py-0.5 border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 disabled:opacity-60']"
                  >
                    <option v-for="o in OPCIONES_LIQUIDACION" :key="o">{{ o }}</option>
                  </select>
                  <p v-if="m.fecha_liquidacion" class="text-xs text-slate-400 mt-0.5">el {{ formatFecha(m.fecha_liquidacion) }}</p>
                </template>
                <span v-else class="text-slate-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div v-if="store.pagination && store.pagination.last_page > 1" class="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
        <span class="text-xs text-slate-500">
          Mostrando {{ store.pagination.from }}–{{ store.pagination.to }} de {{ store.pagination.total }}
        </span>
        <div class="flex gap-2">
          <button @click="cambiarPagina(store.pagination.prev_page_url)" :disabled="!store.pagination.prev_page_url"
            class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">Anterior</button>
          <button @click="cambiarPagina(store.pagination.next_page_url)" :disabled="!store.pagination.next_page_url"
            class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">Siguiente</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.filtro { @apply border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white; }
</style>
