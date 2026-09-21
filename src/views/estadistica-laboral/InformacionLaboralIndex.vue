<script setup>
import { ref, onMounted, watch } from 'vue'
import { useInformacionLaboralStore } from '../../stores/informacionLaboral'
import { useToast } from '../../composables/useToast'

const store = useInformacionLaboralStore()
const { error } = useToast()

// ── filtro por estado (afecta el buscador por nombre y el filtro por depto) ──
const estadoFiltro = ref('')

// ── typeahead de empleado ────────────────────────────────────────────────────
const empleadoQuery    = ref('')
const sugerencias      = ref([])
const buscandoEmpleado = ref(false)
let debounceTimer      = null

async function onEmpleadoInput() {
  if (empleadoQuery.value.length < 2) { sugerencias.value = []; return }
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    buscandoEmpleado.value = true
    try {
      sugerencias.value = await store.buscarEmpleados(empleadoQuery.value, estadoFiltro.value)
    } finally {
      buscandoEmpleado.value = false
    }
  }, 300)
}

// ── seleccionados ─────────────────────────────────────────────────────────────
const seleccionados = ref([])

function agregar(emp) {
  if (!seleccionados.value.some((e) => e.id === emp.id)) {
    seleccionados.value.push(emp)
  }
  empleadoQuery.value = ''
  sugerencias.value   = []
}

function quitar(emp) {
  seleccionados.value = seleccionados.value.filter((e) => e.id !== emp.id)
}

function limpiarSeleccion() {
  seleccionados.value = []
}

function yaAgregado(emp) {
  return seleccionados.value.some((e) => e.id === emp.id)
}

// ── filtro por departamento ─────────────────────────────────────────────────
const departamentos     = ref([])
const deptosFiltro      = ref([])
const resultadosDepto   = ref([])
const buscandoDeptos    = ref(false)

onMounted(async () => {
  departamentos.value = await store.fetchDepartamentos()
})

function toggleDepto(id) {
  deptosFiltro.value = deptosFiltro.value.includes(id)
    ? deptosFiltro.value.filter((d) => d !== id)
    : [...deptosFiltro.value, id]
}

// Evita que una respuesta vieja (de un clic anterior) pise el resultado de
// una consulta más reciente si llegan desordenadas (el backend de desarrollo
// atiende una petición a la vez).
let ultimaConsultaId = 0

watch([deptosFiltro, estadoFiltro], async ([ids]) => {
  const consultaId = ++ultimaConsultaId

  if (ids.length === 0) { resultadosDepto.value = []; return }
  buscandoDeptos.value = true
  try {
    const resultados = await store.buscarPorDepartamentos(ids, estadoFiltro.value)
    if (consultaId === ultimaConsultaId) resultadosDepto.value = resultados
  } finally {
    if (consultaId === ultimaConsultaId) buscandoDeptos.value = false
  }
}, { deep: true })

function agregarTodosDepto() {
  resultadosDepto.value.forEach((emp) => agregar(emp))
}

// ── exportar ──────────────────────────────────────────────────────────────────
const exportando = ref(false)

async function exportar() {
  if (seleccionados.value.length === 0) { error('Selecciona al menos un empleado.'); return }
  exportando.value = true
  try {
    await store.exportarExcel(seleccionados.value.map((e) => e.id))
  } catch {
    error('No se pudo generar el Excel.')
  } finally {
    exportando.value = false
  }
}

// ── formato ───────────────────────────────────────────────────────────────────
function formatCurrency(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 }).format(val)
}

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(String(d).slice(0, 10) + 'T00:00:00')
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">Información Laboral</h2>
        <p class="text-sm text-slate-500 mt-0.5">Busca uno o varios empleados y exporta su información laboral básica.</p>
      </div>
      <button
        @click="exportar"
        :disabled="seleccionados.length === 0 || exportando"
        title="Excel con la información laboral de los empleados seleccionados"
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

    <!-- Buscador -->
    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <div class="flex flex-wrap gap-4 mb-1">
        <div class="flex-1 min-w-[220px]">
          <label class="text-xs font-medium text-slate-500 mb-1 block">Buscar empleado</label>
        </div>
        <div>
          <label class="text-xs font-medium text-slate-500 mb-1 block">Estado</label>
          <select
            v-model="estadoFiltro"
            @change="onEmpleadoInput"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="Activo">Activos</option>
            <option value="Inactivo">Inactivos</option>
            <option value="Suspendido">Suspendidos</option>
          </select>
        </div>
      </div>
      <div class="relative max-w-md">
        <input
          v-model="empleadoQuery"
          @input="onEmpleadoInput"
          type="text"
          placeholder="Buscar por nombre, apellido o cédula..."
          autocomplete="off"
          class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span v-if="buscandoEmpleado" class="absolute right-3 top-1/2 -translate-y-1/2">
          <svg class="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </span>
        <ul
          v-if="sugerencias.length"
          class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
        >
          <li
            v-for="emp in sugerencias"
            :key="emp.id"
            @click="agregar(emp)"
            class="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
          >
            <span>{{ emp.nombres }} {{ emp.apellidos }}</span>
            <span class="text-xs text-slate-400">{{ emp.cedula }}</span>
          </li>
        </ul>
      </div>
      <p class="text-xs text-slate-400 mt-2">Haga clic en un resultado para agregarlo a la selección.</p>
    </div>

    <!-- Filtro por departamento -->
    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <label class="text-xs font-medium text-slate-500 mb-2 block">Filtrar por departamento</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="dep in departamentos"
          :key="dep.id"
          type="button"
          @click="toggleDepto(dep.id)"
          class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
          :class="deptosFiltro.includes(dep.id)
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'border-gray-300 text-slate-600 hover:border-blue-300 hover:bg-slate-50'"
        >
          {{ dep.nombre }}
        </button>
      </div>

      <div v-if="deptosFiltro.length > 0" class="mt-4 border-t border-gray-100 pt-4">
        <p v-if="buscandoDeptos" class="text-xs text-slate-400">Buscando empleados...</p>

        <template v-else>
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs text-slate-500">{{ resultadosDepto.length }} empleado(s) encontrado(s)</p>
            <button
              v-if="resultadosDepto.length > 0"
              @click="agregarTodosDepto"
              class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Agregar todos
            </button>
          </div>

          <ul v-if="resultadosDepto.length" class="max-h-56 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
            <li
              v-for="emp in resultadosDepto"
              :key="emp.id"
              class="px-3 py-2 text-sm flex items-center justify-between"
            >
              <div class="min-w-0">
                <span class="text-slate-700 font-medium">{{ emp.nombres }} {{ emp.apellidos }}</span>
                <span class="text-xs text-slate-400 ml-2">{{ emp.departamento?.nombre }} · {{ emp.cargo?.nombre }}</span>
              </div>
              <button
                v-if="!yaAgregado(emp)"
                @click="agregar(emp)"
                class="text-xs font-semibold text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2"
              >
                Agregar
              </button>
              <span v-else class="text-xs text-emerald-600 font-medium flex-shrink-0 ml-2">Agregado</span>
            </li>
          </ul>

          <p v-else class="text-xs text-slate-400">No hay empleados activos en el/los departamento(s) seleccionado(s).</p>
        </template>
      </div>
    </div>

    <!-- Tabla de seleccionados -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-700">Empleados seleccionados</h3>
        <div class="flex items-center gap-3">
          <span class="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{{ seleccionados.length }}</span>
          <button
            v-if="seleccionados.length > 0"
            @click="limpiarSeleccion"
            class="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-gray-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th class="px-4 py-3">Nombre completo</th>
              <th class="px-4 py-3">DNI</th>
              <th class="px-4 py-3">Fecha de inicio</th>
              <th class="px-4 py-3">Departamento</th>
              <th class="px-4 py-3">Cargo</th>
              <th class="px-4 py-3 text-right">Salario mensual</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="seleccionados.length === 0">
              <td colspan="7" class="text-center py-12 text-slate-400 text-sm">
                Busca empleados arriba y agrégalos para ver su información laboral aquí.
              </td>
            </tr>
            <tr
              v-else
              v-for="emp in seleccionados"
              :key="emp.id"
              class="border-b border-gray-100 hover:bg-slate-50"
            >
              <td class="px-4 py-3 font-medium text-slate-800">{{ emp.nombres }} {{ emp.apellidos }}</td>
              <td class="px-4 py-3 text-slate-600">{{ emp.cedula ?? '—' }}</td>
              <td class="px-4 py-3 text-slate-600">{{ formatDate(emp.informacion_laboral?.fecha_inicio) }}</td>
              <td class="px-4 py-3 text-slate-600">{{ emp.departamento?.nombre ?? '—' }}</td>
              <td class="px-4 py-3 text-slate-600">{{ emp.cargo?.nombre ?? '—' }}</td>
              <td class="px-4 py-3 text-right text-slate-700 font-medium">{{ formatCurrency(emp.informacion_laboral?.salario_base) }}</td>
              <td class="px-4 py-3 text-right">
                <button @click="quitar(emp)" class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Quitar">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
