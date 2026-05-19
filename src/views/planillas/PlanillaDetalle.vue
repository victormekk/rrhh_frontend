<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlanillasStore } from '../../stores/planillas'

const route   = useRoute()
const router  = useRouter()
const store   = usePlanillasStore()

const loading        = ref(true)
const cerrando       = ref(false)
const modalAbierto   = ref(false)
const guardando      = ref(false)
const errorModal     = ref('')

const editForm = reactive({
  id: null,
  nombre: '',
  dias_trabajados: 0,
  salario_diario: 0,
  otros_ingresos: 0,
  desc_ingresos: '',
  ihss: 0,
  retencion_ahorro: 0,
  isr: 0,
  crefisa: 0,
  transporte: 0,
  radios: 0,
  uniforme: 0,
  garden: 0,
  otras_deducciones: 0,
  desc_otras_deducciones: '',
})

onMounted(async () => {
  await store.fetchPlanilla(route.params.id)
  loading.value = false
})

function abrirModal(detalle) {
  errorModal.value = ''
  Object.assign(editForm, {
    id:                    detalle.id,
    nombre:                `${detalle.empleado?.nombres} ${detalle.empleado?.apellidos}`,
    dias_trabajados:       detalle.dias_trabajados,
    salario_diario:        detalle.salario_diario,
    otros_ingresos:        detalle.otros_ingresos,
    desc_ingresos:         detalle.desc_ingresos ?? '',
    ihss:                  detalle.ihss,
    retencion_ahorro:      detalle.retencion_ahorro,
    isr:                   detalle.isr,
    crefisa:               detalle.crefisa,
    transporte:            detalle.transporte,
    radios:                detalle.radios,
    uniforme:              detalle.uniforme,
    garden:                detalle.garden,
    otras_deducciones:     detalle.otras_deducciones,
    desc_otras_deducciones: detalle.desc_otras_deducciones ?? '',
  })
  modalAbierto.value = true
}

const salarioBaseCalc = computed(() =>
  Number((editForm.dias_trabajados * editForm.salario_diario).toFixed(2))
)

const deduccionNetaCalc = computed(() =>
  Number((
    +editForm.ihss + +editForm.retencion_ahorro + +editForm.isr
    + +editForm.crefisa + +editForm.transporte + +editForm.radios
    + +editForm.uniforme + +editForm.garden + +editForm.otras_deducciones
  ).toFixed(2))
)

const salarioNetoCalc = computed(() =>
  Number((salarioBaseCalc.value + +editForm.otros_ingresos - deduccionNetaCalc.value).toFixed(2))
)

async function guardarDetalle() {
  errorModal.value = ''
  guardando.value  = true
  try {
    await store.updateDetalle(route.params.id, editForm.id, {
      dias_trabajados:        editForm.dias_trabajados,
      otros_ingresos:         editForm.otros_ingresos,
      desc_ingresos:          editForm.desc_ingresos || null,
      ihss:                   editForm.ihss,
      retencion_ahorro:       editForm.retencion_ahorro,
      isr:                    editForm.isr,
      crefisa:                editForm.crefisa,
      transporte:             editForm.transporte,
      radios:                 editForm.radios,
      uniforme:               editForm.uniforme,
      garden:                 editForm.garden,
      otras_deducciones:      editForm.otras_deducciones,
      desc_otras_deducciones: editForm.desc_otras_deducciones || null,
    })
    modalAbierto.value = false
  } catch (e) {
    errorModal.value = e.response?.data?.message ?? 'Error al guardar.'
  } finally {
    guardando.value = false
  }
}

async function cerrar() {
  if (!confirm('¿Cerrar esta planilla? Las cuotas de deducciones serán aplicadas y no podrá editarla.')) return
  cerrando.value = true
  await store.cerrarPlanilla(route.params.id)
  cerrando.value = false
}

function exportarPdf() {
  const token = localStorage.getItem('token')
  const url   = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'}/planillas/${route.params.id}/pdf`
  // Descargar via fetch para incluir el Authorization header
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const link  = document.createElement('a')
      link.href   = URL.createObjectURL(blob)
      link.download = `planilla_${store.planilla?.nombre_planilla ?? route.params.id}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    })
}

function recalcularTotales() {
  if (!store.planilla?.detalles) return {}
  return store.planilla.detalles.reduce((acc, d) => {
    acc.salario_base     = (acc.salario_base     || 0) + +d.salario_base
    acc.otros_ingresos   = (acc.otros_ingresos   || 0) + +d.otros_ingresos
    acc.ihss             = (acc.ihss             || 0) + +d.ihss
    acc.retencion_ahorro = (acc.retencion_ahorro || 0) + +d.retencion_ahorro
    acc.isr              = (acc.isr              || 0) + +d.isr
    acc.deduccion_neta   = (acc.deduccion_neta   || 0) + +d.deduccion_neta
    acc.salario_neto     = (acc.salario_neto     || 0) + +d.salario_neto
    return acc
  }, {})
}

const totales = computed(() => recalcularTotales())

function fmt(val) {
  if (val == null) return '—'
  return 'L ' + Number(val).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
}

const esCerrada = computed(() => store.planilla?.estado === 'Cerrado')
</script>

<template>
  <div>
    <!-- Back + header -->
    <div class="flex items-center gap-3 mb-5">
      <button @click="router.push('/planillas')" class="text-slate-400 hover:text-slate-600 transition">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </button>
      <div class="flex-1">
        <h2 class="text-xl font-bold text-slate-800">{{ store.planilla?.nombre_planilla ?? 'Cargando...' }}</h2>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else-if="store.planilla">
      <!-- Info bar -->
      <div class="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-6 items-center justify-between">
        <div class="flex flex-wrap gap-6 text-sm">
          <div>
            <span class="text-slate-400">Tipo</span>
            <p class="font-semibold text-slate-700 mt-0.5">{{ store.planilla.tipo_planilla }}</p>
          </div>
          <div>
            <span class="text-slate-400">Fecha</span>
            <p class="font-semibold text-slate-700 mt-0.5">{{ fmtDate(store.planilla.fecha_generada) }}</p>
          </div>
          <div>
            <span class="text-slate-400">Empleados</span>
            <p class="font-semibold text-slate-700 mt-0.5">{{ store.planilla.detalles?.length ?? 0 }}</p>
          </div>
          <div>
            <span class="text-slate-400">Total Neto</span>
            <p class="font-bold text-emerald-700 text-base mt-0.5">{{ fmt(totales.salario_neto) }}</p>
          </div>
          <div>
            <span class="text-slate-400">Estado</span>
            <p class="mt-0.5">
              <span :class="esCerrada ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'" class="text-xs font-semibold px-2.5 py-1 rounded-full">
                {{ store.planilla.estado }}
              </span>
            </p>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            @click="exportarPdf"
            class="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar PDF
          </button>
          <button
            v-if="!esCerrada"
            @click="cerrar"
            :disabled="cerrando"
            class="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {{ cerrando ? 'Cerrando...' : 'Cerrar Planilla' }}
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="bg-slate-800 text-white text-left">
                <th class="px-3 py-2.5 font-semibold">Empleado</th>
                <th class="px-3 py-2.5 font-semibold">Depto.</th>
                <th class="px-3 py-2.5 font-semibold text-right">Días</th>
                <th class="px-3 py-2.5 font-semibold text-right">Sal. Base</th>
                <th class="px-3 py-2.5 font-semibold text-right">Otros Ing.</th>
                <th class="px-3 py-2.5 font-semibold text-right">IHSS</th>
                <th class="px-3 py-2.5 font-semibold text-right">RAP</th>
                <th class="px-3 py-2.5 font-semibold text-right">ISR</th>
                <th class="px-3 py-2.5 font-semibold text-right">Otras Ded.</th>
                <th class="px-3 py-2.5 font-semibold text-right text-red-300">Ded. Neta</th>
                <th class="px-3 py-2.5 font-semibold text-right text-emerald-300">Sal. Neto</th>
                <th v-if="!esCerrada" class="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="store.planilla.detalles?.length === 0">
                <td colspan="12" class="px-4 py-10 text-center text-slate-400">Sin empleados en esta planilla.</td>
              </tr>
              <tr
                v-for="d in store.planilla.detalles"
                :key="d.id"
                class="border-b border-gray-100 hover:bg-slate-50 transition-colors"
              >
                <td class="px-3 py-2 font-medium text-slate-800">
                  {{ d.empleado?.nombres }} {{ d.empleado?.apellidos }}
                </td>
                <td class="px-3 py-2 text-slate-500">{{ d.departamento }}</td>
                <td class="px-3 py-2 text-right text-slate-700">{{ d.dias_trabajados }}</td>
                <td class="px-3 py-2 text-right text-slate-700">{{ fmt(d.salario_base) }}</td>
                <td class="px-3 py-2 text-right text-emerald-600">{{ fmt(d.otros_ingresos) }}</td>
                <td class="px-3 py-2 text-right text-slate-500">{{ fmt(d.ihss) }}</td>
                <td class="px-3 py-2 text-right text-slate-500">{{ fmt(d.retencion_ahorro) }}</td>
                <td class="px-3 py-2 text-right text-slate-500">{{ fmt(d.isr) }}</td>
                <td class="px-3 py-2 text-right text-slate-500">{{ fmt(d.otras_deducciones) }}</td>
                <td class="px-3 py-2 text-right font-medium text-red-600">{{ fmt(d.deduccion_neta) }}</td>
                <td class="px-3 py-2 text-right font-bold text-emerald-700">{{ fmt(d.salario_neto) }}</td>
                <td v-if="!esCerrada" class="px-3 py-2">
                  <button
                    @click="abrirModal(d)"
                    class="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    title="Editar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
            <!-- Totals row -->
            <tfoot v-if="store.planilla.detalles?.length > 0">
              <tr class="bg-slate-800 text-white font-bold text-xs">
                <td colspan="3" class="px-3 py-2.5">TOTALES</td>
                <td class="px-3 py-2.5 text-right">{{ fmt(totales.salario_base) }}</td>
                <td class="px-3 py-2.5 text-right text-emerald-300">{{ fmt(totales.otros_ingresos) }}</td>
                <td class="px-3 py-2.5 text-right">{{ fmt(totales.ihss) }}</td>
                <td class="px-3 py-2.5 text-right">{{ fmt(totales.retencion_ahorro) }}</td>
                <td class="px-3 py-2.5 text-right">{{ fmt(totales.isr) }}</td>
                <td class="px-3 py-2.5 text-right">{{ fmt(totales.otras_deducciones ?? 0) }}</td>
                <td class="px-3 py-2.5 text-right text-red-300">{{ fmt(totales.deduccion_neta) }}</td>
                <td class="px-3 py-2.5 text-right text-emerald-300 text-sm">{{ fmt(totales.salario_neto) }}</td>
                <td v-if="!esCerrada"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>

    <!-- Modal de edición de detalle -->
    <Teleport to="body">
      <div v-if="modalAbierto" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="modalAbierto = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-base">Editar Detalle</h3>
            <button @click="modalAbierto = false" class="text-slate-400 hover:text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="px-6 py-4">
            <p class="text-sm font-semibold text-slate-700 mb-4">{{ editForm.nombre }}</p>

            <div v-if="errorModal" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 mb-4 text-xs">
              {{ errorModal }}
            </div>

            <!-- Cálculos en tiempo real -->
            <div class="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3 mb-5 text-center">
              <div>
                <p class="text-xs text-slate-400 mb-0.5">Sal. Base</p>
                <p class="font-bold text-slate-800 text-sm">{{ fmt(salarioBaseCalc) }}</p>
              </div>
              <div>
                <p class="text-xs text-red-400 mb-0.5">Ded. Neta</p>
                <p class="font-bold text-red-600 text-sm">{{ fmt(deduccionNetaCalc) }}</p>
              </div>
              <div>
                <p class="text-xs text-emerald-600 mb-0.5">Sal. Neto</p>
                <p class="font-bold text-emerald-700 text-sm">{{ fmt(salarioNetoCalc) }}</p>
              </div>
            </div>

            <div class="space-y-4">
              <!-- Días e ingresos -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="field-label">Días Trabajados</label>
                  <input v-model.number="editForm.dias_trabajados" type="number" min="0" max="30" class="field-input" />
                </div>
                <div>
                  <label class="field-label">Otros Ingresos (L)</label>
                  <input v-model.number="editForm.otros_ingresos" type="number" step="0.01" min="0" class="field-input" />
                </div>
              </div>
              <div>
                <label class="field-label">Descripción Ingresos</label>
                <input v-model="editForm.desc_ingresos" maxlength="100" class="field-input" placeholder="Ej. Horas extra, bonificación..." />
              </div>

              <div class="border-t border-gray-100 pt-3">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Deducciones</p>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="field-label">IHSS (L)</label>
                    <input v-model.number="editForm.ihss" type="number" step="0.01" min="0" class="field-input" />
                  </div>
                  <div>
                    <label class="field-label">RAP / Ah. (L)</label>
                    <input v-model.number="editForm.retencion_ahorro" type="number" step="0.01" min="0" class="field-input" />
                  </div>
                  <div>
                    <label class="field-label">ISR (L)</label>
                    <input v-model.number="editForm.isr" type="number" step="0.01" min="0" class="field-input" />
                  </div>
                  <div>
                    <label class="field-label">Crefisa (L)</label>
                    <input v-model.number="editForm.crefisa" type="number" step="0.01" min="0" class="field-input" />
                  </div>
                  <div>
                    <label class="field-label">Transporte (L)</label>
                    <input v-model.number="editForm.transporte" type="number" step="0.01" min="0" class="field-input" />
                  </div>
                  <div>
                    <label class="field-label">Radios (L)</label>
                    <input v-model.number="editForm.radios" type="number" step="0.01" min="0" class="field-input" />
                  </div>
                  <div>
                    <label class="field-label">Uniforme (L)</label>
                    <input v-model.number="editForm.uniforme" type="number" step="0.01" min="0" class="field-input" />
                  </div>
                  <div>
                    <label class="field-label">Garden (L)</label>
                    <input v-model.number="editForm.garden" type="number" step="0.01" min="0" class="field-input" />
                  </div>
                  <div>
                    <label class="field-label">Otras Ded. (L)</label>
                    <input v-model.number="editForm.otras_deducciones" type="number" step="0.01" min="0" class="field-input" />
                  </div>
                </div>
                <div class="mt-3">
                  <label class="field-label">Descripción Otras Deducciones</label>
                  <input v-model="editForm.desc_otras_deducciones" maxlength="100" class="field-input" placeholder="Ej. Préstamo personal, multa..." />
                </div>
              </div>
            </div>
          </div>

          <div class="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button @click="modalAbierto = false" class="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button
              @click="guardarDetalle"
              :disabled="guardando"
              class="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition"
            >
              {{ guardando ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.field-label { @apply block text-xs font-medium text-slate-600 mb-1; }
.field-input { @apply w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition; }
</style>
