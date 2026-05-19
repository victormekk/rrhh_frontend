<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlanillasStore } from '../../stores/planillas'

const router = useRouter()
const store  = usePlanillasStore()

const filtroTipo   = ref('')
const filtroEstado = ref('')

onMounted(() => cargarDatos())

async function cargarDatos() {
  await store.fetchPlanillas({
    tipo:   filtroTipo.value   || undefined,
    estado: filtroEstado.value || undefined,
  })
}

async function eliminar(p) {
  if (!confirm(`¿Eliminar la planilla "${p.nombre_planilla}"? Esta acción no se puede deshacer.`)) return
  await store.deletePlanilla(p.id)
  await cargarDatos()
}

async function cambiarPagina(url) {
  if (!url) return
  const page = new URL(url).searchParams.get('page')
  await store.fetchPlanillas({
    page,
    tipo:   filtroTipo.value   || undefined,
    estado: filtroEstado.value || undefined,
  })
}

function estadoClass(estado) {
  return estado === 'Cerrado'
    ? 'bg-slate-100 text-slate-600'
    : 'bg-emerald-100 text-emerald-700'
}

function tipoClass(tipo) {
  const m = { Fijos: 'bg-blue-100 text-blue-700', Extras: 'bg-amber-100 text-amber-700', Especial: 'bg-purple-100 text-purple-700' }
  return m[tipo] ?? 'bg-gray-100 text-gray-600'
}

function formatCurrency(val) {
  if (val == null) return '—'
  return 'L ' + Number(val).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div>
    <!-- Top bar -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div class="flex-1 flex gap-3">
        <select v-model="filtroTipo" @change="cargarDatos" class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los tipos</option>
          <option>Fijos</option>
          <option>Extras</option>
          <option>Especial</option>
        </select>
        <select v-model="filtroEstado" @change="cargarDatos" class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los estados</option>
          <option>Activo</option>
          <option>Cerrado</option>
        </select>
      </div>
      <button
        @click="router.push('/planillas/crear')"
        class="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nueva Planilla
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-gray-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th class="px-4 py-3">Planilla</th>
              <th class="px-4 py-3">Tipo</th>
              <th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3 text-right">Empleados</th>
              <th class="px-4 py-3 text-right">Total Neto</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="store.loading">
              <tr v-for="n in 5" :key="n" class="border-b border-gray-100">
                <td v-for="i in 7" :key="i" class="px-4 py-3">
                  <div class="h-4 bg-gray-100 rounded animate-pulse" />
                </td>
              </tr>
            </template>

            <tr v-else-if="store.planillas.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-slate-400">
                No hay planillas generadas.
              </td>
            </tr>

            <tr
              v-else
              v-for="p in store.planillas"
              :key="p.id"
              class="border-b border-gray-100 hover:bg-slate-50 transition-colors"
            >
              <td class="px-4 py-3 font-medium text-slate-800">{{ p.nombre_planilla }}</td>
              <td class="px-4 py-3">
                <span :class="[tipoClass(p.tipo_planilla), 'text-xs font-medium px-2.5 py-1 rounded-full']">
                  {{ p.tipo_planilla }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ formatDate(p.fecha_generada) }}</td>
              <td class="px-4 py-3 text-right text-slate-700 font-medium">{{ p.detalles_count }}</td>
              <td class="px-4 py-3 text-right font-semibold text-slate-800">{{ formatCurrency(p.detalles_sum_salario_neto) }}</td>
              <td class="px-4 py-3">
                <span :class="[estadoClass(p.estado), 'text-xs font-medium px-2.5 py-1 rounded-full']">
                  {{ p.estado }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button @click="router.push(`/planillas/${p.id}`)" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Ver detalle">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    v-if="p.estado === 'Activo'"
                    @click="eliminar(p)"
                    class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                    title="Eliminar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="store.pagination?.last_page > 1" class="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <span class="text-xs text-slate-500">
          Mostrando {{ store.pagination.from }}–{{ store.pagination.to }} de {{ store.pagination.total }}
        </span>
        <div class="flex items-center gap-1">
          <button @click="cambiarPagina(store.pagination.prev_page_url)" :disabled="!store.pagination.prev_page_url" class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">Anterior</button>
          <span class="text-xs text-slate-600 px-2">{{ store.pagination.current_page }} / {{ store.pagination.last_page }}</span>
          <button @click="cambiarPagina(store.pagination.next_page_url)" :disabled="!store.pagination.next_page_url" class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">Siguiente</button>
        </div>
      </div>
    </div>
  </div>
</template>
