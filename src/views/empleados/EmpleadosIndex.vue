<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEmpleadosStore } from '../../stores/empleados'
import api from '../../services/api'

const router        = useRouter()
const store         = useEmpleadosStore()

const search        = ref('')
const filtroDep     = ref('')
const filtroEstado  = ref('')
const departamentos = ref([])

let searchTimer = null

onMounted(async () => {
  await cargarDatos()
  const { data } = await api.get('/departamentos')
  departamentos.value = data
})

async function cargarDatos() {
  await store.fetchEmpleados({
    search:         search.value || undefined,
    id_departamento: filtroDep.value || undefined,
    estado:         filtroEstado.value || undefined,
  })
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(cargarDatos, 350)
}

async function cambiarPagina(url) {
  if (!url) return
  const page = new URL(url).searchParams.get('page')
  await store.fetchEmpleados({
    page,
    search:          search.value || undefined,
    id_departamento: filtroDep.value || undefined,
    estado:          filtroEstado.value || undefined,
  })
}

async function desactivar(emp) {
  if (!confirm(`¿Desactivar a ${emp.nombres} ${emp.apellidos}?`)) return
  await store.deactivateEmpleado(emp.id)
  await cargarDatos()
}

function estadoClass(estado) {
  const map = {
    Activo:    'bg-emerald-100 text-emerald-700',
    Inactivo:  'bg-red-100 text-red-700',
    Suspendido: 'bg-amber-100 text-amber-700',
  }
  return map[estado] ?? 'bg-gray-100 text-gray-600'
}

function formatCurrency(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 }).format(val)
}
</script>

<template>
  <div>
    <!-- Top bar -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div class="flex-1 relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          v-model="search"
          @input="onSearch"
          type="search"
          placeholder="Buscar por nombre o cédula..."
          class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <select v-model="filtroDep" @change="cargarDatos" class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">Todos los departamentos</option>
        <option v-for="d in departamentos" :key="d.id" :value="d.id">{{ d.nombre }}</option>
      </select>

      <select v-model="filtroEstado" @change="cargarDatos" class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">Todos los estados</option>
        <option value="Activo">Activo</option>
        <option value="Inactivo">Inactivo</option>
        <option value="Suspendido">Suspendido</option>
      </select>

      <button
        @click="router.push('/empleados/crear')"
        class="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nuevo Empleado
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-gray-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th class="px-4 py-3">Empleado</th>
              <th class="px-4 py-3">DNI</th>
              <th class="px-4 py-3">Departamento</th>
              <th class="px-4 py-3">Puesto</th>
              <th class="px-4 py-3">Salario Base</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading skeleton -->
            <template v-if="store.loading">
              <tr v-for="n in 6" :key="n" class="border-b border-slate-100">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-slate-200 animate-pulse" />
                    <div class="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                  </div>
                </td>
                <td v-for="i in 5" :key="i" class="px-4 py-3">
                  <div class="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                </td>
                <td class="px-4 py-3" />
              </tr>
            </template>

            <!-- Empty -->
            <tr v-else-if="store.empleados.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-slate-400">
                No se encontraron empleados.
              </td>
            </tr>

            <!-- Rows -->
            <tr
              v-else
              v-for="emp in store.empleados"
              :key="emp.id"
              class="border-b border-gray-100 hover:bg-slate-50 transition-colors"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <img
                    v-if="emp.foto_url"
                    :src="emp.foto_url"
                    :alt="emp.nombres"
                    class="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                  <div v-else class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                    {{ emp.nombres?.charAt(0) }}{{ emp.apellidos?.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-medium text-slate-800">{{ emp.nombres }} {{ emp.apellidos }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-slate-600 font-mono text-xs">{{ emp.cedula }}</td>
              <td class="px-4 py-3 text-slate-600">{{ emp.departamento?.nombre ?? '—' }}</td>
              <td class="px-4 py-3 text-slate-600">{{ emp.puesto?.nombre ?? '—' }}</td>
              <td class="px-4 py-3 text-slate-600">{{ formatCurrency(emp.informacion_laboral?.salario_base) }}</td>
              <td class="px-4 py-3">
                <span :class="[estadoClass(emp.informacion_laboral?.estado), 'text-xs font-medium px-2.5 py-1 rounded-full']">
                  {{ emp.informacion_laboral?.estado ?? '—' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="router.push(`/empleados/${emp.id}`)"
                    class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    title="Ver detalle"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    @click="router.push(`/empleados/${emp.id}/editar`)"
                    class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                    title="Editar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    v-if="emp.informacion_laboral?.estado === 'Activo'"
                    @click="desactivar(emp)"
                    class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                    title="Desactivar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="store.pagination && store.pagination.last_page > 1" class="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <span class="text-xs text-slate-500">
          Mostrando {{ store.pagination.from }}–{{ store.pagination.to }} de {{ store.pagination.total }} empleados
        </span>
        <div class="flex items-center gap-1">
          <button
            @click="cambiarPagina(store.pagination.prev_page_url)"
            :disabled="!store.pagination.prev_page_url"
            class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >Anterior</button>
          <span class="text-xs text-slate-600 px-2">Pág. {{ store.pagination.current_page }} / {{ store.pagination.last_page }}</span>
          <button
            @click="cambiarPagina(store.pagination.next_page_url)"
            :disabled="!store.pagination.next_page_url"
            class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >Siguiente</button>
        </div>
      </div>
    </div>
  </div>
</template>
