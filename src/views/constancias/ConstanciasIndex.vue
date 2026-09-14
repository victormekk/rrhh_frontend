<script setup>
import { ref, onMounted } from 'vue'
import { useConstanciasStore } from '../../stores/constancias'
import { useToast } from '../../composables/useToast'
import api from '../../services/api'

const store = useConstanciasStore()
const { error } = useToast()

// ── Historial de constancias emitidas ────────────────────────────────────────
const historial          = ref([])
const cargandoHistorial  = ref(false)

async function cargarHistorial() {
  cargandoHistorial.value = true
  try {
    const { data } = await api.get('/log-sistema', { params: { modulo: 'Constancias' } })
    historial.value = data.data
  } finally {
    cargandoHistorial.value = false
  }
}

onMounted(cargarHistorial)

function formatFecha(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-HN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const TIPOS = [
  {
    id: 'laboral',
    nombre: 'Constancia Laboral',
    descripcion: 'Nombre, fecha de inicio, cargo y salario mensual del empleado.',
    icon: 'M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z',
  },
]

const tipoSel = ref(null)

function seleccionarTipo(tipo) {
  tipoSel.value       = tipo
  empleadoQuery.value = ''
  empleadoSel.value   = null
  sugerencias.value   = []
}

// ── typeahead de empleado ────────────────────────────────────────────────────
const empleadoQuery    = ref('')
const empleadoSel      = ref(null)
const sugerencias      = ref([])
const buscandoEmpleado = ref(false)
let debounceTimer      = null

async function onEmpleadoInput() {
  empleadoSel.value = null
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

function seleccionarEmpleado(emp) {
  empleadoSel.value   = emp
  empleadoQuery.value = `${emp.nombres} ${emp.apellidos}`
  sugerencias.value   = []
}

// ── generar ───────────────────────────────────────────────────────────────────
const generando = ref(false)

async function generar() {
  if (!empleadoSel.value) { error('Selecciona un empleado.'); return }
  generando.value = true
  try {
    if (tipoSel.value.id === 'laboral') {
      await store.downloadLaboral(empleadoSel.value.id, empleadoSel.value.nombres, empleadoSel.value.apellidos)
    }
    await cargarHistorial()
  } catch (e) {
    error(e.response?.data?.message || 'No se pudo generar la constancia.')
  } finally {
    generando.value = false
  }
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-slate-800">Constancias</h2>
      <p class="text-sm text-slate-500 mt-0.5">Selecciona el tipo de constancia y el empleado para generar el documento.</p>
    </div>

    <div class="flex gap-6 items-start">

      <!-- Panel izquierdo: opciones -->
      <div class="w-72 flex-shrink-0 space-y-3">
        <button
          v-for="tipo in TIPOS"
          :key="tipo.id"
          @click="seleccionarTipo(tipo)"
          class="w-full text-left bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors"
          :class="tipoSel?.id === tipo.id
            ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/40'
            : 'border-gray-200 hover:border-blue-300 hover:bg-slate-50'"
        >
          <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            :class="tipoSel?.id === tipo.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" :d="tipo.icon" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-800">{{ tipo.nombre }}</p>
            <p class="text-xs text-slate-500 mt-0.5 leading-snug">{{ tipo.descripcion }}</p>
          </div>
        </button>
      </div>

      <!-- Panel derecho: formulario de generación -->
      <div class="flex-1 bg-white rounded-xl border border-gray-200 p-6">

        <div v-if="!tipoSel" class="text-center py-16 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-12 h-12 mx-auto mb-3 text-slate-300">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p class="text-sm">Selecciona un tipo de constancia para comenzar.</p>
        </div>

        <div v-else class="max-w-md space-y-4">
          <h3 class="text-base font-semibold text-slate-800">{{ tipoSel.nombre }}</h3>

          <div class="relative">
            <label class="text-xs font-medium text-slate-500 mb-1 block">Empleado</label>
            <input
              v-model="empleadoQuery"
              @input="onEmpleadoInput"
              type="text"
              placeholder="Buscar por nombre o apellido..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <ul
              v-if="sugerencias.length"
              class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
            >
              <li
                v-for="emp in sugerencias"
                :key="emp.id"
                @click="seleccionarEmpleado(emp)"
                class="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer"
              >
                {{ emp.nombres }} {{ emp.apellidos }}
              </li>
            </ul>
            <p v-if="buscandoEmpleado" class="text-xs text-slate-400 mt-1">Buscando...</p>
          </div>

          <div v-if="empleadoSel" class="bg-slate-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {{ empleadoSel.nombres?.charAt(0)?.toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate">{{ empleadoSel.nombres }} {{ empleadoSel.apellidos }}</p>
              <p class="text-xs text-slate-500 truncate">{{ empleadoSel.cargo?.nombre ?? empleadoSel.departamento?.nombre ?? '' }}</p>
            </div>
          </div>

          <button
            @click="generar"
            :disabled="!empleadoSel || generando"
            class="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {{ generando ? 'Generando...' : 'Descargar PDF' }}
          </button>
        </div>

      </div>
    </div>

    <!-- Historial de constancias emitidas -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100">
        <h3 class="text-sm font-semibold text-slate-700">Historial de Constancias Emitidas</h3>
        <p class="text-xs text-slate-400 mt-0.5">Quién generó cada constancia y para qué empleado.</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-gray-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3">Emitida por</th>
              <th class="px-4 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargandoHistorial">
              <td colspan="3" class="px-4 py-8 text-center text-slate-400 text-sm">Cargando...</td>
            </tr>
            <tr v-else-if="historial.length === 0">
              <td colspan="3" class="px-4 py-8 text-center text-slate-400 text-sm">Aún no se ha emitido ninguna constancia.</td>
            </tr>
            <tr v-else v-for="log in historial" :key="log.id" class="border-b border-gray-100 hover:bg-slate-50">
              <td class="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{{ formatFecha(log.created_at) }}</td>
              <td class="px-4 py-3 text-slate-700 font-medium">{{ log.usuario?.name ?? '—' }}</td>
              <td class="px-4 py-3 text-slate-600">{{ log.descripcion ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
