<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAguinaldoStore } from '../../stores/aguinaldo'

const route  = useRoute()
const router = useRouter()
const store  = useAguinaldoStore()

const loading  = ref(true)
const cerrando = ref(false)

// Modal
const modal       = reactive({ open: false, tipo: '', registro: null })
const modalForm   = reactive({ dias_trabajados: 0, anticipo: 0, dias_promedio: 0, antiguedad: 0, anticipos: 0 })
const modalLoading = ref(false)

const nombre = computed(() => decodeURIComponent(route.params.nombre))
const detalle = computed(() => store.detalle)
const esCerrada = computed(() => detalle.value?.estado === 'Cerrado')

onMounted(async () => {
  await store.fetchDetalle(nombre.value)
  loading.value = false
})

// ── Edición ──────────────────────────────────────────────────────
function abrirModalFijo(r) {
  modal.tipo     = 'fijo'
  modal.registro = r
  modalForm.dias_trabajados = r.dias_trabajados
  modalForm.anticipo        = parseFloat(r.anticipo)
  modal.open = true
}

function abrirModalExtra(r) {
  modal.tipo     = 'extra'
  modal.registro = r
  modalForm.dias_promedio = r.dias_promedio
  modalForm.antiguedad    = parseFloat(r.antiguedad)
  modalForm.anticipos     = parseFloat(r.anticipos)
  modal.open = true
}

// ── Calculados en tiempo real (modal) ────────────────────────────
const totalFijoCalc = computed(() => {
  if (modal.tipo !== 'fijo' || !modal.registro) return 0
  const base = parseFloat(modal.registro.salario_base)
  return Math.max(0, parseFloat(((base / 365) * modalForm.dias_trabajados - modalForm.anticipo).toFixed(2)))
})

const subtotalExtraCalc = computed(() => {
  if (modal.tipo !== 'extra' || !modal.registro) return 0
  return parseFloat((parseFloat(modal.registro.diario) * modalForm.dias_promedio + modalForm.antiguedad).toFixed(2))
})

const totalExtraCalc = computed(() => {
  return Math.max(0, parseFloat((subtotalExtraCalc.value - modalForm.anticipos).toFixed(2)))
})

async function guardarModal() {
  modalLoading.value = true
  try {
    if (modal.tipo === 'fijo') {
      await store.updateFijo(modal.registro.id, {
        dias_trabajados: modalForm.dias_trabajados,
        anticipo:        modalForm.anticipo,
      })
    } else {
      await store.updateExtra(modal.registro.id, {
        dias_promedio: modalForm.dias_promedio,
        antiguedad:    modalForm.antiguedad,
        anticipos:     modalForm.anticipos,
      })
    }
    modal.open = false
  } finally {
    modalLoading.value = false
  }
}

// ── Cerrar aguinaldo ─────────────────────────────────────────────
async function cerrar() {
  if (!confirm(`¿Cerrar el aguinaldo "${nombre.value}"? No se podrá editar después.`)) return
  cerrando.value = true
  try {
    await store.cerrar(nombre.value)
  } finally {
    cerrando.value = false
  }
}

// ── PDF ──────────────────────────────────────────────────────────
function exportarPdf() {
  const token = localStorage.getItem('token')
  const base  = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
  const url   = `${base}/aguinaldo/${encodeURIComponent(nombre.value)}/pdf`
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const link    = document.createElement('a')
      link.href     = URL.createObjectURL(blob)
      link.download = `aguinaldo_${nombre.value}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    })
}

// ── Helpers ──────────────────────────────────────────────────────
function fmt(val) {
  if (val == null) return '—'
  return 'L ' + Number(val).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400">Cargando...</div>

  <div v-else-if="detalle">
    <!-- Header -->
    <div class="flex items-start justify-between mb-6">
      <div class="flex items-center gap-3">
        <button @click="router.push('/aguinaldo')" class="text-slate-400 hover:text-slate-600 transition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 class="text-xl font-bold text-slate-800">{{ detalle.nombre_aguinaldo }}</h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Tipo: {{ detalle.tipo_aguinaldo }} &bull;
            Fecha: {{ detalle.fecha_generada }} &bull;
            <span :class="detalle.estado === 'Cerrado' ? 'text-slate-500' : 'text-emerald-600'">
              {{ detalle.estado }}
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
          class="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          {{ cerrando ? 'Cerrando...' : 'Cerrar Aguinaldo' }}
        </button>
      </div>
    </div>

    <!-- Fijos -->
    <template v-if="detalle.fijos?.length > 0">
      <h3 class="text-sm font-semibold text-slate-600 mb-2">Empleados Fijos</h3>
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-gray-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th class="px-4 py-3 text-left">Depto.</th>
                <th class="px-4 py-3 text-left">Empleado</th>
                <th class="px-4 py-3 text-left">Cuenta</th>
                <th class="px-4 py-3 text-left">Fecha Inicio</th>
                <th class="px-4 py-3 text-right">Salario Mensual</th>
                <th class="px-4 py-3 text-right">Días Trab.</th>
                <th class="px-4 py-3 text-right">Anticipo</th>
                <th class="px-4 py-3 text-right">Total</th>
                <th v-if="!esCerrada" class="px-4 py-3 text-right">Editar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in detalle.fijos" :key="f.id" class="border-b border-gray-100 hover:bg-slate-50">
                <td class="px-4 py-2.5 text-slate-600 text-xs">{{ f.departamento }}</td>
                <td class="px-4 py-2.5 font-medium text-slate-800">{{ f.nombres }} {{ f.apellidos }}</td>
                <td class="px-4 py-2.5 text-slate-600 text-xs">{{ f.cuenta ?? '—' }}</td>
                <td class="px-4 py-2.5 text-slate-600 text-xs">{{ f.fecha_inicio }}</td>
                <td class="px-4 py-2.5 text-right text-slate-700">{{ fmt(f.salario_base) }}</td>
                <td class="px-4 py-2.5 text-right text-slate-700">{{ f.dias_trabajados }}</td>
                <td class="px-4 py-2.5 text-right text-amber-600">{{ fmt(f.anticipo) }}</td>
                <td class="px-4 py-2.5 text-right font-semibold text-slate-800">{{ fmt(f.total_aguinaldo) }}</td>
                <td v-if="!esCerrada" class="px-4 py-2.5 text-right">
                  <button @click="abrirModalFijo(f)" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                </td>
              </tr>
              <!-- Totals row -->
              <tr class="bg-blue-700 text-white text-xs font-semibold">
                <td class="px-4 py-2.5" colspan="4">TOTALES</td>
                <td class="px-4 py-2.5 text-right">{{ fmt(detalle.totales_fijos?.salario_base) }}</td>
                <td class="px-4 py-2.5 text-right">{{ detalle.totales_fijos?.dias_trabajados }}</td>
                <td class="px-4 py-2.5 text-right">{{ fmt(detalle.totales_fijos?.anticipo) }}</td>
                <td class="px-4 py-2.5 text-right">{{ fmt(detalle.totales_fijos?.total_aguinaldo) }}</td>
                <td v-if="!esCerrada"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Extras -->
    <template v-if="detalle.extras?.length > 0">
      <h3 class="text-sm font-semibold text-slate-600 mb-2">Empleados Extras</h3>
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-gray-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th class="px-4 py-3 text-left">Depto.</th>
                <th class="px-4 py-3 text-left">Empleado</th>
                <th class="px-4 py-3 text-right">Diario</th>
                <th class="px-4 py-3 text-right">Días Prom.</th>
                <th class="px-4 py-3 text-right">Antigüedad</th>
                <th class="px-4 py-3 text-right">Subtotal</th>
                <th class="px-4 py-3 text-right">Anticipos</th>
                <th class="px-4 py-3 text-right">Total</th>
                <th v-if="!esCerrada" class="px-4 py-3 text-right">Editar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in detalle.extras" :key="e.id" class="border-b border-gray-100 hover:bg-slate-50">
                <td class="px-4 py-2.5 text-slate-600 text-xs">{{ e.departamento }}</td>
                <td class="px-4 py-2.5 font-medium text-slate-800">{{ e.nombres }} {{ e.apellidos }}</td>
                <td class="px-4 py-2.5 text-right text-slate-700">{{ fmt(e.diario) }}</td>
                <td class="px-4 py-2.5 text-right text-slate-700">{{ e.dias_promedio }}</td>
                <td class="px-4 py-2.5 text-right text-slate-700">{{ fmt(e.antiguedad) }}</td>
                <td class="px-4 py-2.5 text-right text-slate-700">{{ fmt(e.subtotal) }}</td>
                <td class="px-4 py-2.5 text-right text-amber-600">{{ fmt(e.anticipos) }}</td>
                <td class="px-4 py-2.5 text-right font-semibold text-slate-800">{{ fmt(e.total_aguinaldo) }}</td>
                <td v-if="!esCerrada" class="px-4 py-2.5 text-right">
                  <button @click="abrirModalExtra(e)" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                </td>
              </tr>
              <!-- Totals row -->
              <tr class="bg-blue-700 text-white text-xs font-semibold">
                <td class="px-4 py-2.5" colspan="4">TOTALES</td>
                <td class="px-4 py-2.5 text-right">{{ fmt(detalle.totales_extras?.antiguedad) }}</td>
                <td class="px-4 py-2.5 text-right">{{ fmt(detalle.totales_extras?.subtotal) }}</td>
                <td class="px-4 py-2.5 text-right">{{ fmt(detalle.totales_extras?.anticipos) }}</td>
                <td class="px-4 py-2.5 text-right">{{ fmt(detalle.totales_extras?.total_aguinaldo) }}</td>
                <td v-if="!esCerrada"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>

  <!-- ── Modal de edición ── -->
  <Teleport to="body">
    <div v-if="modal.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="modal.open = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="text-base font-bold text-slate-800 mb-4">
          Editar — {{ modal.registro?.nombres }} {{ modal.registro?.apellidos }}
        </h3>

        <!-- Fijo form -->
        <template v-if="modal.tipo === 'fijo'">
          <div class="space-y-3">
            <div>
              <label class="label">Días Trabajados</label>
              <input v-model.number="modalForm.dias_trabajados" type="number" min="0" max="365" class="input" />
            </div>
            <div>
              <label class="label">Anticipo (L)</label>
              <input v-model.number="modalForm.anticipo" type="number" min="0" step="0.01" class="input" />
            </div>
            <div class="bg-blue-50 rounded-lg p-3 text-sm">
              <span class="text-slate-500">Total calculado:</span>
              <span class="float-right font-bold text-blue-700">{{ 'L ' + totalFijoCalc.toLocaleString('es-HN', { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>
        </template>

        <!-- Extras form -->
        <template v-else-if="modal.tipo === 'extra'">
          <div class="space-y-3">
            <div>
              <label class="label">Días Promedio</label>
              <input v-model.number="modalForm.dias_promedio" type="number" min="0" class="input" />
            </div>
            <div>
              <label class="label">Antigüedad (L)</label>
              <input v-model.number="modalForm.antiguedad" type="number" min="0" step="0.01" class="input" />
            </div>
            <div>
              <label class="label">Anticipos (L)</label>
              <input v-model.number="modalForm.anticipos" type="number" min="0" step="0.01" class="input" />
            </div>
            <div class="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
              <div>
                <span class="text-slate-500">Subtotal:</span>
                <span class="float-right font-medium text-slate-700">{{ 'L ' + subtotalExtraCalc.toLocaleString('es-HN', { minimumFractionDigits: 2 }) }}</span>
              </div>
              <div>
                <span class="text-slate-500">Total calculado:</span>
                <span class="float-right font-bold text-blue-700">{{ 'L ' + totalExtraCalc.toLocaleString('es-HN', { minimumFractionDigits: 2 }) }}</span>
              </div>
            </div>
          </div>
        </template>

        <div class="flex justify-end gap-3 mt-5">
          <button type="button" @click="modal.open = false" class="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button
            @click="guardarModal"
            :disabled="modalLoading"
            class="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
          >
            {{ modalLoading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@reference "tailwindcss";
.label { @apply block text-xs font-medium text-slate-600 mb-1; }
.input { @apply w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition; }
</style>
