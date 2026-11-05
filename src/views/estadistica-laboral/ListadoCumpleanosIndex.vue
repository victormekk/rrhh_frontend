<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useInformacionLaboralStore } from '../../stores/informacionLaboral'
import { useListadoCumpleanosStore } from '../../stores/listadoCumpleanos'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

const busqueda  = useInformacionLaboralStore()
const store     = useListadoCumpleanosStore()
const authStore = useAuthStore()
const { error } = useToast()

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// 0 = todo el año. Por defecto, el mes actual.
const mes = ref(new Date().getMonth() + 1)

// ── departamentos (ninguno marcado = todos) ─────────────────────────────────
const departamentos = ref([])
const deptosFiltro  = ref([])

function toggleDepto(id) {
  deptosFiltro.value = deptosFiltro.value.includes(id)
    ? deptosFiltro.value.filter((d) => d !== id)
    : [...deptosFiltro.value, id]
}

// ── lista ─────────────────────────────────────────────────────────────────────
const filas    = ref([])
const cargando = ref(false)
let ultimaConsulta = 0

async function cargar() {
  const consulta = ++ultimaConsulta
  cargando.value = true
  try {
    const data = await store.listar(mes.value, deptosFiltro.value)
    if (consulta === ultimaConsulta) filas.value = data
  } catch {
    if (consulta === ultimaConsulta) error('No se pudo cargar el listado.')
  } finally {
    if (consulta === ultimaConsulta) cargando.value = false
  }
}

onMounted(async () => {
  cargar()
  departamentos.value = await busqueda.fetchDepartamentos()
})
watch([mes, deptosFiltro], cargar)

// Con "Todo el año", la tabla separa los meses con un encabezado.
const grupos = computed(() => {
  const porMes = new Map()
  for (const f of filas.value) {
    if (!porMes.has(f.mes)) porMes.set(f.mes, [])
    porMes.get(f.mes).push(f)
  }
  return [...porMes.entries()].map(([m, lista]) => ({ mes: m, nombre: MESES[m - 1], lista }))
})

const titulo = computed(() => (mes.value ? `Cumpleaños de ${MESES[mes.value - 1]}` : 'Cumpleaños de todo el año'))

// ── exportar ──────────────────────────────────────────────────────────────────
const exportando = ref(false)

async function exportar() {
  exportando.value = true
  try {
    await store.exportarExcel(mes.value, deptosFiltro.value)
  } catch {
    error('No se pudo generar el Excel.')
  } finally {
    exportando.value = false
  }
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold text-slate-800">Listado de Cumpleaños</h2>
        <p class="text-sm text-slate-500 mt-0.5">Empleados activos que cumplen años en el mes elegido, o en todo el año.</p>
      </div>
      <button
        v-if="authStore.puede('listado_cumpleanos.exportar')"
        @click="exportar"
        :disabled="exportando || filas.length === 0"
        title="Excel con el listado de cumpleaños"
        class="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition"
      >
        <svg v-if="exportando" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
          <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
          <path stroke-linecap="round" d="M3 9.75h18M3 15h18M9.75 4.5v15M15 4.5v15" />
        </svg>
        {{ exportando ? 'Generando...' : 'Exportar Excel' }}
      </button>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <label class="text-xs font-medium text-slate-500 mb-1 block">Mes</label>
        <select v-model.number="mes"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option :value="0">Todo el año</option>
          <option v-for="(m, i) in MESES" :key="m" :value="i + 1">{{ m }}</option>
        </select>
      </div>
      <div>
        <label class="text-xs font-medium text-slate-500 mb-2 block">Departamentos</label>
        <div class="flex flex-wrap gap-2">
          <button type="button" @click="deptosFiltro = []"
            class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
            :class="deptosFiltro.length === 0 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-slate-600 hover:border-blue-300 hover:bg-slate-50'">
            TODOS
          </button>
          <button v-for="dep in departamentos" :key="dep.id" type="button" @click="toggleDepto(dep.id)"
            class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
            :class="deptosFiltro.includes(dep.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-slate-600 hover:border-blue-300 hover:bg-slate-50'">
            {{ dep.nombre }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-700">
          {{ titulo }}
          <span v-if="cargando" class="ml-2 text-xs font-normal text-slate-400">Cargando...</span>
        </h3>
        <span class="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{{ filas.length }}</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-gray-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th class="px-4 py-3">Nombre completo</th>
              <th class="px-4 py-3">Departamento</th>
              <th class="px-4 py-3 text-center">Cumpleaños</th>
              <th class="px-4 py-3 text-center">Edad que cumple</th>
              <th class="px-4 py-3">Teléfono</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!cargando && filas.length === 0">
              <td colspan="5" class="text-center py-12 text-slate-400 text-sm">
                Ningún empleado activo cumple años en lo seleccionado.
              </td>
            </tr>
            <template v-for="g in grupos" :key="g.mes">
              <tr v-if="!mes" class="bg-amber-50/60 border-b border-gray-100">
                <td colspan="5" class="px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-800">
                  {{ g.nombre }} <span class="font-medium text-amber-700/70">· {{ g.lista.length }}</span>
                </td>
              </tr>
              <tr v-for="f in g.lista" :key="f.id" class="border-b border-gray-100 hover:bg-slate-50">
                <td class="px-4 py-3 font-medium text-slate-800">{{ f.nombre }}</td>
                <td class="px-4 py-3 text-slate-600">{{ f.departamento }}</td>
                <td class="px-4 py-3 text-center text-slate-600">{{ f.cumpleanos }}</td>
                <td class="px-4 py-3 text-center text-slate-600">{{ f.edad }} años</td>
                <td class="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">{{ f.telefono }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
