<script setup>
import { ref, onMounted } from 'vue'
import { useIncidenciasStore } from '../../stores/incidencias'
import { useToast } from '../../composables/useToast'

const store = useIncidenciasStore()
const { error } = useToast()

// ── filtros ───────────────────────────────────────────────────────────────────
const filtroSearch      = ref('')
const filtroGrado       = ref('')
const filtroFechaInicio = ref('')
const filtroFechaFin    = ref('')

async function cargarDatos(page) {
  await store.fetchIncidencias({
    search:       filtroSearch.value      || undefined,
    grado:        filtroGrado.value       || undefined,
    fecha_inicio: filtroFechaInicio.value || undefined,
    fecha_fin:    filtroFechaFin.value    || undefined,
    page,
  })
}

function limpiarFiltros() {
  filtroSearch.value      = ''
  filtroGrado.value       = ''
  filtroFechaInicio.value = ''
  filtroFechaFin.value    = ''
  cargarDatos()
}

async function cambiarPagina(url) {
  if (!url) return
  const page = new URL(url).searchParams.get('page')
  cargarDatos(page)
}

onMounted(() => cargarDatos())

// ── modal detalle (solo lectura) ──────────────────────────────────────────────
const showDetalle   = ref(false)
const incDetalle    = ref(null)

function verDetalle(inc) {
  incDetalle.value  = inc
  showDetalle.value = true
}

// ── modal crear/editar ────────────────────────────────────────────────────────
const showModal  = ref(false)
const editando   = ref(null)
const saving     = ref(false)
const errorModal = ref('')

const form = ref({
  id_empleado:      null,
  fecha_incidencia: '',
  titulo:           '',
  descripcion:      '',
  grado:            'Leve',
})

// Typeahead empleado
const empleadoQuery    = ref('')
const empleadoSel      = ref(null)
const sugerencias      = ref([])
const buscandoEmpleado = ref(false)
let debounceTimer      = null

async function onEmpleadoInput() {
  empleadoSel.value = null
  form.value.id_empleado = null
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
  empleadoSel.value      = emp
  form.value.id_empleado = emp.id
  empleadoQuery.value    = `${emp.nombres} ${emp.apellidos}`
  sugerencias.value      = []
}

function abrirCrear() {
  editando.value         = null
  empleadoSel.value      = null
  empleadoQuery.value    = ''
  sugerencias.value      = []
  form.value             = { id_empleado: null, fecha_incidencia: '', titulo: '', descripcion: '', grado: 'Leve' }
  errorModal.value       = ''
  showModal.value        = true
}

function abrirEditar(inc) {
  editando.value      = inc
  empleadoSel.value   = inc.empleado
  empleadoQuery.value = `${inc.empleado.nombres} ${inc.empleado.apellidos}`
  sugerencias.value   = []
  form.value = {
    id_empleado:      inc.id_empleado,
    fecha_incidencia: String(inc.fecha_incidencia).slice(0, 10),
    titulo:           inc.titulo,
    descripcion:      inc.descripcion,
    grado:            inc.grado,
  }
  errorModal.value  = ''
  showModal.value   = true
}

function cerrarModal() {
  showModal.value = false
  sugerencias.value = []
}

async function guardar() {
  if (!form.value.id_empleado)      { errorModal.value = 'Selecciona un empleado.'; return }
  if (!form.value.fecha_incidencia) { errorModal.value = 'La fecha es requerida.'; return }
  if (!form.value.titulo.trim())    { errorModal.value = 'El título es requerido.'; return }
  if (!form.value.descripcion.trim()) { errorModal.value = 'La observación es requerida.'; return }

  errorModal.value = ''
  saving.value     = true
  try {
    if (editando.value) {
      await store.updateIncidencia(editando.value.id, form.value)
    } else {
      await store.createIncidencia(form.value)
    }
    cerrarModal()
    cargarDatos()
  } catch (e) {
    const errs = e.response?.data?.errors
    errorModal.value = errs
      ? Object.values(errs).flat().join(' | ')
      : e.response?.data?.message ?? 'Error al guardar.'
  } finally {
    saving.value = false
  }
}

async function eliminar(inc) {
  if (!confirm(`¿Eliminar la incidencia de "${inc.empleado.nombres} ${inc.empleado.apellidos}"?`)) return
  try {
    await store.deleteIncidencia(inc.id)
    cargarDatos()
  } catch {
    error('No se pudo eliminar la incidencia.')
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  const date = new Date(String(d).slice(0, 10) + 'T00:00:00')
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function gradoClass(grado) {
  return {
    Leve:     'bg-amber-100 text-amber-700',
    Moderada: 'bg-orange-100 text-orange-700',
    Grave:    'bg-red-100 text-red-700',
  }[grado] ?? 'bg-gray-100 text-gray-600'
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-slate-800">Incidencias</h2>
        <p class="text-sm text-slate-500 mt-0.5">Registro de sanciones y medidas disciplinarias</p>
      </div>
      <button
        @click="abrirCrear"
        class="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nueva incidencia
      </button>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <input
        v-model="filtroSearch"
        @input="cargarDatos()"
        type="text"
        placeholder="Buscar empleado..."
        class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
      <select
        v-model="filtroGrado"
        @change="cargarDatos()"
        class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      >
        <option value="">Todos los grados</option>
        <option>Leve</option>
        <option>Moderada</option>
        <option>Grave</option>
      </select>
      <input
        v-model="filtroFechaInicio"
        @change="cargarDatos()"
        type="date"
        class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
      <div class="flex gap-2">
        <input
          v-model="filtroFechaFin"
          @change="cargarDatos()"
          type="date"
          class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <button
          @click="limpiarFiltros"
          title="Limpiar filtros"
          class="px-3 py-2 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 transition text-xs"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="text-left px-5 py-3 font-semibold text-slate-600">Empleado</th>
              <th class="text-left px-5 py-3 font-semibold text-slate-600">Título</th>
              <th class="text-left px-5 py-3 font-semibold text-slate-600">Fecha</th>
              <th class="text-left px-5 py-3 font-semibold text-slate-600">Grado</th>
              <th class="text-right px-5 py-3 font-semibold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <!-- Skeleton -->
            <template v-if="store.loading">
              <tr v-for="i in 6" :key="i" class="border-b border-slate-100">
                <td class="px-5 py-3"><div class="h-4 w-36 bg-slate-200 rounded animate-pulse" /></td>
                <td class="px-5 py-3"><div class="h-4 w-32 bg-slate-200 rounded animate-pulse" /></td>
                <td class="px-5 py-3"><div class="h-4 w-24 bg-slate-200 rounded animate-pulse" /></td>
                <td class="px-5 py-3"><div class="h-5 w-16 bg-slate-200 rounded-full animate-pulse" /></td>
                <td class="px-5 py-3 text-right"><div class="h-4 w-20 bg-slate-200 rounded animate-pulse ml-auto" /></td>
              </tr>
            </template>

            <!-- Vacío -->
            <tr v-else-if="store.incidencias.length === 0">
              <td colspan="5" class="text-center py-12 text-slate-400">No hay incidencias registradas.</td>
            </tr>

            <!-- Datos -->
            <tr
              v-else
              v-for="inc in store.incidencias"
              :key="inc.id"
              class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td class="px-5 py-3 font-medium text-slate-800">
                {{ inc.empleado.nombres }} {{ inc.empleado.apellidos }}
              </td>
              <td class="px-5 py-3 text-slate-600 max-w-xs truncate" :title="inc.titulo">
                {{ inc.titulo }}
              </td>
              <td class="px-5 py-3 text-slate-600 whitespace-nowrap">{{ formatDate(inc.fecha_incidencia) }}</td>
              <td class="px-5 py-3">
                <span :class="[gradoClass(inc.grado), 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium']">
                  {{ inc.grado }}
                </span>
              </td>
              <td class="px-5 py-3 text-right whitespace-nowrap">
                <button @click="verDetalle(inc)" class="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium mr-4 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                  </svg>
                  Ver
                </button>
                <button @click="abrirEditar(inc)" class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium mr-4 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                  Editar
                </button>
                <button @click="eliminar(inc)" class="inline-flex items-center gap-1 text-red-500 hover:text-red-700 font-medium transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Eliminar
                </button>
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
          <button
            @click="cambiarPagina(store.pagination.prev_page_url)"
            :disabled="!store.pagination.prev_page_url"
            class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >Anterior</button>
          <span class="text-xs text-slate-600 px-2">{{ store.pagination.current_page }} / {{ store.pagination.last_page }}</span>
          <button
            @click="cambiarPagina(store.pagination.next_page_url)"
            :disabled="!store.pagination.next_page_url"
            class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >Siguiente</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal detalle -->
  <Teleport to="body">
    <div
      v-if="showDetalle && incDetalle"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showDetalle = false"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <h3 class="text-base font-bold text-slate-800">Detalle de incidencia</h3>
            <span :class="[gradoClass(incDetalle.grado), 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold']">
              {{ incDetalle.grado }}
            </span>
          </div>
          <button @click="showDetalle = false" class="text-slate-400 hover:text-slate-600 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="px-6 py-5 space-y-5">

          <!-- Empleado + fecha -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Empleado</p>
              <p class="text-sm font-semibold text-slate-800">
                {{ incDetalle.empleado.nombres }} {{ incDetalle.empleado.apellidos }}
              </p>
            </div>
            <div>
              <p class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Fecha</p>
              <p class="text-sm text-slate-700">{{ formatDate(incDetalle.fecha_incidencia) }}</p>
            </div>
          </div>

          <!-- Título -->
          <div>
            <p class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Título</p>
            <p class="text-sm font-semibold text-slate-800">{{ incDetalle.titulo }}</p>
          </div>

          <!-- Observación -->
          <div>
            <p class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Observación</p>
            <div class="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
              {{ incDetalle.descripcion || '—' }}
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            @click="showDetalle = false; abrirEditar(incDetalle)"
            class="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Editar
          </button>
          <button
            @click="showDetalle = false"
            class="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  </Teleport>

  <!-- Modal crear/editar -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="cerrarModal"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg">

        <!-- Modal header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 class="text-base font-bold text-slate-800">
            {{ editando ? 'Editar incidencia' : 'Nueva incidencia' }}
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

          <!-- Empleado (typeahead) -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Empleado <span class="text-red-500">*</span></label>
            <div class="relative">
              <input
                v-model="empleadoQuery"
                @input="onEmpleadoInput"
                type="text"
                placeholder="Escribe el nombre del empleado..."
                autocomplete="off"
                class="w-full border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                :class="empleadoSel ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300'"
              />
              <!-- Indicador seleccionado -->
              <span v-if="empleadoSel" class="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <!-- Spinner -->
              <span v-else-if="buscandoEmpleado" class="absolute right-3 top-1/2 -translate-y-1/2">
                <svg class="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              </span>
              <!-- Dropdown sugerencias -->
              <ul
                v-if="sugerencias.length"
                class="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto"
              >
                <li
                  v-for="emp in sugerencias"
                  :key="emp.id"
                  @mousedown.prevent="seleccionarEmpleado(emp)"
                  class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm"
                >
                  <span class="font-medium text-slate-800">{{ emp.nombres }} {{ emp.apellidos }}</span>
                  <span class="text-slate-400 text-xs ml-2">{{ emp.cedula }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Fecha + Grado -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Fecha <span class="text-red-500">*</span></label>
              <input
                v-model="form.fecha_incidencia"
                type="date"
                class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Grado <span class="text-red-500">*</span></label>
              <select
                v-model="form.grado"
                class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="Leve">Leve</option>
                <option value="Moderada">Moderada</option>
                <option value="Grave">Grave</option>
              </select>
            </div>
          </div>

          <!-- Título -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Título <span class="text-red-500">*</span></label>
            <input
              v-model="form.titulo"
              type="text"
              maxlength="50"
              placeholder="Ej. Memorándum por impuntualidad"
              class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <!-- Observación -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Observación <span class="text-red-500">*</span></label>
            <textarea
              v-model="form.descripcion"
              maxlength="300"
              rows="3"
              placeholder="Describe detalladamente la razón de la sanción..."
              class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            />
            <p class="text-xs text-slate-400 mt-1 text-right">{{ form.descripcion.length }}/300</p>
          </div>

          <!-- Acciones -->
          <div class="flex justify-end gap-3 pt-1">
            <button
              type="button"
              @click="cerrarModal"
              class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
