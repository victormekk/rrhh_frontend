<script setup>
import { reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlanillasStore } from '../../stores/planillas'
import { useToast } from '../../composables/useToast'

const route   = useRoute()
const router  = useRouter()
const store   = usePlanillasStore()
const { error } = useToast()

const state = reactive({
  loading:  true,
  cerrando: false,
})

onMounted(async () => {
  await store.fetchPlanilla(route.params.id)
  state.loading = false
})

const esCerrada = computed(() => store.planilla?.estado === 'Cerrado')

// Las columnas IHSS/ISR/Crefisa no aplican a planillas "Extras" (personal temporal sin esas
// retenciones fijas) — se ocultan para no dejar la grilla llena de columnas siempre en cero.
const mostrarColumnasFijos = computed(() => store.planilla?.tipo_planilla !== 'Extras')
const totalColumnas        = computed(() => mostrarColumnasFijos.value ? 17 : 14)

// ── Agrupación por departamento, con subtotal por grupo ──────────────────────
const CAMPOS_SUMABLES = [
  'dias_trabajados', 'salario_base', 'monto_horas_extras', 'otros_ingresos',
  'ihss', 'retencion_ahorro', 'isr', 'crefisa', 'transporte', 'radios',
  'i_vecinal', 'uniforme', 'garden', 'otras_deducciones',
  'deduccion_neta', 'salario_neto',
]

function sumarCampos(filas) {
  return CAMPOS_SUMABLES.reduce((acc, campo) => {
    acc[campo] = filas.reduce((sum, f) => sum + Number(f[campo] || 0), 0)
    return acc
  }, {})
}

const grupos = computed(() => {
  const detalles = store.planilla?.detalles ?? []
  const bloques  = []
  for (const d of detalles) {
    const actual = bloques[bloques.length - 1]
    if (!actual || actual.departamento !== d.departamento) {
      bloques.push({ departamento: d.departamento, filas: [d] })
    } else {
      actual.filas.push(d)
    }
  }
  return bloques.map(bloque => ({ ...bloque, subtotal: sumarCampos(bloque.filas) }))
})

const totales = computed(() => sumarCampos(store.planilla?.detalles ?? []))

// ── Edición directa en celda (números simples: días, IHSS, RAP, ISR, etc.) ───
async function onBlurCampo(detalle, campo, event) {
  const valor = Number(event.target.value)
  if (Number.isNaN(valor) || valor === Number(detalle[campo])) return
  try {
    await store.updateDetalle(route.params.id, detalle.id, { [campo]: valor }, { silent: true })
  } catch (e) {
    event.target.value = detalle[campo]
    error(e.response?.data?.message ?? 'No se pudo guardar el cambio.')
  }
}

// ── Modal chico: Horas Extra ──────────────────────────────────────────────────
const modalHoras = reactive({ abierto: false, detalle: null, horas: 0, guardando: false, error: '' })

function abrirModalHoras(detalle) {
  modalHoras.detalle   = detalle
  modalHoras.horas     = detalle.horas_extras
  modalHoras.error     = ''
  modalHoras.abierto   = true
}

const montoHorasPreview = computed(() => {
  if (!modalHoras.detalle) return 0
  const horas = Number(modalHoras.horas) || 0
  return Number((modalHoras.detalle.salario_diario / 8 * horas).toFixed(2))
})

async function guardarModalHoras() {
  modalHoras.guardando = true
  modalHoras.error     = ''
  try {
    await store.updateDetalle(route.params.id, modalHoras.detalle.id, {
      horas_extras: Number(modalHoras.horas) || 0,
    })
    modalHoras.abierto = false
  } catch (e) {
    modalHoras.error = e.response?.data?.message ?? 'Error al guardar.'
  } finally {
    modalHoras.guardando = false
  }
}

// ── Modal chico compartido: Otros Ingresos / Otras Deducciones ───────────────
const modalMonto = reactive({
  abierto: false, detalle: null, tipo: 'ingreso',
  descripcion: '', monto: 0, guardando: false, error: '',
})

function abrirModalIngreso(detalle) {
  modalMonto.detalle     = detalle
  modalMonto.tipo        = 'ingreso'
  modalMonto.descripcion = detalle.desc_ingresos ?? ''
  modalMonto.monto       = detalle.otros_ingresos
  modalMonto.error       = ''
  modalMonto.abierto     = true
}

function abrirModalDeduccion(detalle) {
  modalMonto.detalle     = detalle
  modalMonto.tipo        = 'deduccion'
  modalMonto.descripcion = detalle.desc_otras_deducciones ?? ''
  modalMonto.monto       = detalle.otras_deducciones
  modalMonto.error       = ''
  modalMonto.abierto     = true
}

const modalMontoTitulo = computed(() => modalMonto.tipo === 'ingreso' ? 'Otros Ingresos' : 'Otras Deducciones')

async function guardarModalMonto() {
  modalMonto.guardando = true
  modalMonto.error     = ''
  const payload = modalMonto.tipo === 'ingreso'
    ? { otros_ingresos: Number(modalMonto.monto) || 0, desc_ingresos: modalMonto.descripcion || null }
    : { otras_deducciones: Number(modalMonto.monto) || 0, desc_otras_deducciones: modalMonto.descripcion || null }
  try {
    await store.updateDetalle(route.params.id, modalMonto.detalle.id, payload)
    modalMonto.abierto = false
  } catch (e) {
    modalMonto.error = e.response?.data?.message ?? 'Error al guardar.'
  } finally {
    modalMonto.guardando = false
  }
}

// ── Acciones generales ────────────────────────────────────────────────────────
async function cerrar() {
  if (!confirm('¿Cerrar esta planilla? Las cuotas de deducciones serán aplicadas y no podrá editarla.')) return
  state.cerrando = true
  try {
    await store.cerrarPlanilla(route.params.id)
  } catch {
    error('Ocurrió un error. Intenta de nuevo.')
  } finally {
    state.cerrando = false
  }
}

function exportarPdf() {
  const token = localStorage.getItem('token')
  const url   = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'}/planillas/${route.params.id}/pdf`
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const link  = document.createElement('a')
      link.href   = URL.createObjectURL(blob)
      const _norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').replace(/[^a-zA-Z0-9+\-]/g, '')
      const _d = new Date(), _dd = String(_d.getDate()).padStart(2,'0'), _mm = String(_d.getMonth()+1).padStart(2,'0')
      const _n = _norm(store.planilla?.nombre_planilla ?? String(route.params.id))
      link.download = `${_dd}${_mm}${_d.getFullYear()}-${_n}-planilla.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    })
}

function exportarExcel() {
  const token = localStorage.getItem('token')
  const url   = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'}/planillas/${route.params.id}/excel`
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const link  = document.createElement('a')
      link.href   = URL.createObjectURL(blob)
      const _norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').replace(/[^a-zA-Z0-9+\-]/g, '')
      const _d = new Date(), _dd = String(_d.getDate()).padStart(2,'0'), _mm = String(_d.getMonth()+1).padStart(2,'0')
      const _n = _norm(store.planilla?.nombre_planilla ?? String(route.params.id))
      link.download = `${_dd}${_mm}${_d.getFullYear()}-${_n}-pago.xlsx`
      link.click()
      URL.revokeObjectURL(link.href)
    })
}

function fmt(val) {
  if (val == null) return '—'
  return 'L ' + Number(val).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d) {
  if (!d) return '—'
  const date = new Date(String(d).slice(0, 10) + 'T00:00:00')
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
}
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

    <div v-if="state.loading" class="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-xl border border-slate-200">
      <svg class="w-10 h-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <p class="text-sm text-slate-500">Cargando planilla...</p>
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
            @click="exportarExcel"
            title="Excel con Empleado y Salario Neto, para el archivo de pago"
            class="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 13.5h3.75m-3.75 3h3.75M9 8.25h6a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25H9a2.25 2.25 0 01-2.25-2.25v-9A2.25 2.25 0 019 8.25zM12 3v5.25" />
            </svg>
            Exportar Excel
          </button>
          <button
            v-if="!esCerrada"
            @click="cerrar"
            :disabled="state.cerrando"
            class="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {{ state.cerrando ? 'Cerrando...' : 'Cerrar Planilla' }}
          </button>
        </div>
      </div>

      <p v-if="!esCerrada" class="text-xs text-slate-400 mb-2">
        Los campos numéricos se guardan al salir de la celda. Los campos con
        <svg class="w-3 h-3 inline -mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108" /></svg>
        se editan con un clic (abren un formulario corto).
      </p>

      <!-- Grilla -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-auto max-h-[65vh]">
          <table class="w-full text-xs table-fixed">
            <colgroup>
              <col style="width:260px">
              <col style="width:55px">
              <col style="width:100px">
              <col style="width:90px">
              <col style="width:90px">
              <col v-if="mostrarColumnasFijos" style="width:85px">
              <col style="width:85px">
              <col v-if="mostrarColumnasFijos" style="width:85px">
              <col v-if="mostrarColumnasFijos" style="width:85px">
              <col style="width:85px">
              <col style="width:85px">
              <col style="width:90px">
              <col style="width:85px">
              <col style="width:85px">
              <col style="width:90px">
              <col style="width:105px">
              <col style="width:110px">
            </colgroup>
            <thead class="sticky top-0 z-10">
              <tr class="bg-slate-800 text-white text-left">
                <th class="px-3 py-2.5 font-semibold">Empleado</th>
                <th class="px-2 py-2.5 font-semibold text-right">Días</th>
                <th class="px-2 py-2.5 font-semibold text-right">Sal. Base</th>
                <th class="px-2 py-2.5 font-semibold text-right">H. Extra</th>
                <th class="px-2 py-2.5 font-semibold text-right">Otros Ing.</th>
                <th v-if="mostrarColumnasFijos" class="px-2 py-2.5 font-semibold text-right">IHSS</th>
                <th class="px-2 py-2.5 font-semibold text-right">RAP</th>
                <th v-if="mostrarColumnasFijos" class="px-2 py-2.5 font-semibold text-right">ISR</th>
                <th v-if="mostrarColumnasFijos" class="px-2 py-2.5 font-semibold text-right">Crefisa</th>
                <th class="px-2 py-2.5 font-semibold text-right">Transp.</th>
                <th class="px-2 py-2.5 font-semibold text-right">Radios</th>
                <th class="px-2 py-2.5 font-semibold text-right">I. Vecinal</th>
                <th class="px-2 py-2.5 font-semibold text-right">Uniforme</th>
                <th class="px-2 py-2.5 font-semibold text-right">Garden</th>
                <th class="px-2 py-2.5 font-semibold text-right">Otras Ded.</th>
                <th class="px-3 py-2.5 font-semibold text-right text-red-300">Ded. Neta</th>
                <th class="px-3 py-2.5 font-semibold text-right text-emerald-300">Sal. Neto</th>
              </tr>
            </thead>

            <tbody v-if="!store.planilla.detalles?.length">
              <tr>
                <td :colspan="totalColumnas" class="px-4 py-10 text-center text-slate-400">Sin empleados en esta planilla.</td>
              </tr>
            </tbody>

            <template v-for="grupo in grupos" :key="grupo.departamento">
              <tbody>
                <tr>
                  <td :colspan="totalColumnas" class="px-3 py-1.5 bg-amber-50 text-amber-800 font-bold uppercase tracking-wide text-[11px] truncate">
                    {{ grupo.departamento }}
                  </td>
                </tr>

                <tr
                  v-for="d in grupo.filas"
                  :key="d.id"
                  class="border-b border-gray-100 hover:bg-slate-50 transition-colors"
                >
                  <td class="px-3 py-1.5 font-medium text-slate-800 truncate" :title="`${d.empleado?.nombres} ${d.empleado?.apellidos}`">
                    {{ d.empleado?.nombres }} {{ d.empleado?.apellidos }}
                  </td>
                  <td class="px-1 py-1">
                    <input
                      v-if="!esCerrada" type="number" min="0" max="30" :value="d.dias_trabajados"
                      @blur="onBlurCampo(d, 'dias_trabajados', $event)" @keyup.enter="$event.target.blur()"
                      class="celda-input" />
                    <span v-else class="celda-texto">{{ d.dias_trabajados }}</span>
                  </td>
                  <td class="px-2 py-1.5 text-right text-slate-700">{{ fmt(d.salario_base) }}</td>

                  <td class="px-1 py-1 text-right">
                    <button
                      v-if="!esCerrada" @click="abrirModalHoras(d)"
                      class="celda-btn" :title="d.horas_extras ? `${d.horas_extras} hora(s) extra` : 'Registrar horas extra'"
                    >
                      {{ fmt(d.monto_horas_extras) }}
                    </button>
                    <span v-else class="celda-texto">{{ fmt(d.monto_horas_extras) }}</span>
                  </td>

                  <td class="px-1 py-1 text-right">
                    <button
                      v-if="!esCerrada" @click="abrirModalIngreso(d)"
                      class="celda-btn text-emerald-700" :title="d.desc_ingresos || 'Registrar otro ingreso'"
                    >
                      {{ fmt(d.otros_ingresos) }}
                    </button>
                    <span v-else class="celda-texto text-emerald-600">{{ fmt(d.otros_ingresos) }}</span>
                  </td>

                  <td v-if="mostrarColumnasFijos" class="px-1 py-1">
                    <input v-if="!esCerrada" type="number" min="0" step="0.01" :value="d.ihss" @blur="onBlurCampo(d, 'ihss', $event)" @keyup.enter="$event.target.blur()" class="celda-input" />
                    <span v-else class="celda-texto">{{ fmt(d.ihss) }}</span>
                  </td>
                  <td class="px-1 py-1">
                    <input v-if="!esCerrada" type="number" min="0" step="0.01" :value="d.retencion_ahorro" @blur="onBlurCampo(d, 'retencion_ahorro', $event)" @keyup.enter="$event.target.blur()" class="celda-input" />
                    <span v-else class="celda-texto">{{ fmt(d.retencion_ahorro) }}</span>
                  </td>
                  <td v-if="mostrarColumnasFijos" class="px-1 py-1">
                    <input v-if="!esCerrada" type="number" min="0" step="0.01" :value="d.isr" @blur="onBlurCampo(d, 'isr', $event)" @keyup.enter="$event.target.blur()" class="celda-input" />
                    <span v-else class="celda-texto">{{ fmt(d.isr) }}</span>
                  </td>
                  <td v-if="mostrarColumnasFijos" class="px-1 py-1">
                    <input v-if="!esCerrada" type="number" min="0" step="0.01" :value="d.crefisa" @blur="onBlurCampo(d, 'crefisa', $event)" @keyup.enter="$event.target.blur()" class="celda-input" />
                    <span v-else class="celda-texto">{{ fmt(d.crefisa) }}</span>
                  </td>
                  <td class="px-1 py-1">
                    <input v-if="!esCerrada" type="number" min="0" step="0.01" :value="d.transporte" @blur="onBlurCampo(d, 'transporte', $event)" @keyup.enter="$event.target.blur()" class="celda-input" />
                    <span v-else class="celda-texto">{{ fmt(d.transporte) }}</span>
                  </td>
                  <td class="px-1 py-1">
                    <input v-if="!esCerrada" type="number" min="0" step="0.01" :value="d.radios" @blur="onBlurCampo(d, 'radios', $event)" @keyup.enter="$event.target.blur()" class="celda-input" />
                    <span v-else class="celda-texto">{{ fmt(d.radios) }}</span>
                  </td>
                  <td class="px-1 py-1">
                    <input v-if="!esCerrada" type="number" min="0" step="0.01" :value="d.i_vecinal" @blur="onBlurCampo(d, 'i_vecinal', $event)" @keyup.enter="$event.target.blur()" class="celda-input" />
                    <span v-else class="celda-texto">{{ fmt(d.i_vecinal) }}</span>
                  </td>
                  <td class="px-1 py-1">
                    <input v-if="!esCerrada" type="number" min="0" step="0.01" :value="d.uniforme" @blur="onBlurCampo(d, 'uniforme', $event)" @keyup.enter="$event.target.blur()" class="celda-input" />
                    <span v-else class="celda-texto">{{ fmt(d.uniforme) }}</span>
                  </td>
                  <td class="px-1 py-1">
                    <input v-if="!esCerrada" type="number" min="0" step="0.01" :value="d.garden" @blur="onBlurCampo(d, 'garden', $event)" @keyup.enter="$event.target.blur()" class="celda-input" />
                    <span v-else class="celda-texto">{{ fmt(d.garden) }}</span>
                  </td>

                  <td class="px-1 py-1 text-right">
                    <button
                      v-if="!esCerrada" @click="abrirModalDeduccion(d)"
                      class="celda-btn text-red-600" :title="d.desc_otras_deducciones || 'Registrar otra deducción'"
                    >
                      {{ fmt(d.otras_deducciones) }}
                    </button>
                    <span v-else class="celda-texto text-red-600">{{ fmt(d.otras_deducciones) }}</span>
                  </td>

                  <td class="px-3 py-1.5 text-right font-medium text-red-600">{{ fmt(d.deduccion_neta) }}</td>
                  <td class="px-3 py-1.5 text-right font-bold text-emerald-700">{{ fmt(d.salario_neto) }}</td>
                </tr>

                <!-- Subtotal del departamento -->
                <tr class="bg-amber-100/60 font-semibold text-[11px]">
                  <td class="px-3 py-1.5 truncate" :title="`SUBTOTAL: ${grupo.departamento}`">SUBTOTAL: {{ grupo.departamento }}</td>
                  <td class="px-2 py-1.5 text-right">{{ grupo.subtotal.dias_trabajados }}</td>
                  <td class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.salario_base) }}</td>
                  <td class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.monto_horas_extras) }}</td>
                  <td class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.otros_ingresos) }}</td>
                  <td v-if="mostrarColumnasFijos" class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.ihss) }}</td>
                  <td class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.retencion_ahorro) }}</td>
                  <td v-if="mostrarColumnasFijos" class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.isr) }}</td>
                  <td v-if="mostrarColumnasFijos" class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.crefisa) }}</td>
                  <td class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.transporte) }}</td>
                  <td class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.radios) }}</td>
                  <td class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.i_vecinal) }}</td>
                  <td class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.uniforme) }}</td>
                  <td class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.garden) }}</td>
                  <td class="px-2 py-1.5 text-right">{{ fmt(grupo.subtotal.otras_deducciones) }}</td>
                  <td class="px-3 py-1.5 text-right text-red-700">{{ fmt(grupo.subtotal.deduccion_neta) }}</td>
                  <td class="px-3 py-1.5 text-right text-emerald-700">{{ fmt(grupo.subtotal.salario_neto) }}</td>
                </tr>
              </tbody>
            </template>

            <tfoot v-if="store.planilla.detalles?.length > 0" class="sticky bottom-0 z-10">
              <tr class="bg-slate-800 text-white font-bold text-xs">
                <td class="px-3 py-2.5">TOTAL GENERAL</td>
                <td class="px-2 py-2.5 text-right">{{ totales.dias_trabajados }}</td>
                <td class="px-2 py-2.5 text-right">{{ fmt(totales.salario_base) }}</td>
                <td class="px-2 py-2.5 text-right">{{ fmt(totales.monto_horas_extras) }}</td>
                <td class="px-2 py-2.5 text-right text-emerald-300">{{ fmt(totales.otros_ingresos) }}</td>
                <td v-if="mostrarColumnasFijos" class="px-2 py-2.5 text-right">{{ fmt(totales.ihss) }}</td>
                <td class="px-2 py-2.5 text-right">{{ fmt(totales.retencion_ahorro) }}</td>
                <td v-if="mostrarColumnasFijos" class="px-2 py-2.5 text-right">{{ fmt(totales.isr) }}</td>
                <td v-if="mostrarColumnasFijos" class="px-2 py-2.5 text-right">{{ fmt(totales.crefisa) }}</td>
                <td class="px-2 py-2.5 text-right">{{ fmt(totales.transporte) }}</td>
                <td class="px-2 py-2.5 text-right">{{ fmt(totales.radios) }}</td>
                <td class="px-2 py-2.5 text-right">{{ fmt(totales.i_vecinal) }}</td>
                <td class="px-2 py-2.5 text-right">{{ fmt(totales.uniforme) }}</td>
                <td class="px-2 py-2.5 text-right">{{ fmt(totales.garden) }}</td>
                <td class="px-2 py-2.5 text-right">{{ fmt(totales.otras_deducciones) }}</td>
                <td class="px-3 py-2.5 text-right text-red-300">{{ fmt(totales.deduccion_neta) }}</td>
                <td class="px-3 py-2.5 text-right text-emerald-300 text-sm">{{ fmt(totales.salario_neto) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>

    <!-- Modal chico: Horas Extra -->
    <Teleport to="body">
      <div v-if="modalHoras.abierto" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="modalHoras.abierto = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 class="font-bold text-slate-800 text-base mb-1">Horas extra</h3>
          <p class="text-sm text-slate-500 mb-4">
            {{ modalHoras.detalle?.empleado?.nombres }} {{ modalHoras.detalle?.empleado?.apellidos }}
          </p>

          <div v-if="modalHoras.error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 mb-4 text-xs">
            {{ modalHoras.error }}
          </div>

          <label class="field-label">¿Cuántas horas extra trabajó?</label>
          <input v-model.number="modalHoras.horas" type="number" min="0" step="0.5" class="field-input" autofocus />

          <div class="bg-slate-50 rounded-xl p-3 mt-3 text-center">
            <p class="text-xs text-slate-400 mb-0.5">Monto calculado (salario diario ÷ 8 × horas)</p>
            <p class="font-bold text-slate-800 text-lg">{{ fmt(montoHorasPreview) }}</p>
          </div>

          <div class="flex justify-end gap-3 mt-5">
            <button @click="modalHoras.abierto = false" class="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">Cancelar</button>
            <button
              @click="guardarModalHoras" :disabled="modalHoras.guardando"
              class="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition"
            >
              {{ modalHoras.guardando ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal chico compartido: Otros Ingresos / Otras Deducciones -->
    <Teleport to="body">
      <div v-if="modalMonto.abierto" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="modalMonto.abierto = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 class="font-bold text-slate-800 text-base mb-1">{{ modalMontoTitulo }}</h3>
          <p class="text-sm text-slate-500 mb-4">
            {{ modalMonto.detalle?.empleado?.nombres }} {{ modalMonto.detalle?.empleado?.apellidos }}
          </p>

          <div v-if="modalMonto.error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 mb-4 text-xs">
            {{ modalMonto.error }}
          </div>

          <div class="space-y-3">
            <div>
              <label class="field-label">Descripción</label>
              <input v-model="modalMonto.descripcion" maxlength="100" class="field-input" placeholder="Ej. Bono, préstamo personal..." autofocus />
            </div>
            <div>
              <label class="field-label">Monto (L)</label>
              <input v-model.number="modalMonto.monto" type="number" min="0" step="0.01" class="field-input" />
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-5">
            <button @click="modalMonto.abierto = false" class="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">Cancelar</button>
            <button
              @click="guardarModalMonto" :disabled="modalMonto.guardando"
              class="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition"
            >
              {{ modalMonto.guardando ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.field-label  { @apply block text-xs font-medium text-slate-600 mb-1; }
.field-input  { @apply w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition; }
.celda-input  { @apply w-full text-right border border-transparent rounded px-1 py-0.5 text-xs bg-transparent hover:border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:bg-white transition; }
.celda-texto  { @apply block text-right px-1 py-0.5 text-xs text-slate-700; }
.celda-btn    { @apply text-right w-full px-1 py-0.5 text-xs rounded hover:bg-blue-50 hover:underline decoration-dotted transition; }

/* Ningun numero debe partirse en dos lineas (ej. "L" arriba y el monto abajo) aunque la
   columna quede angosta para nombres largos en otras filas de la misma tabla. */
table th, table td { white-space: nowrap; }
table td.truncate  { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* El spinner nativo de <input type="number"> reserva espacio distinto en cada navegador
   (muy notorio en Firefox) y corre el texto right-aligned fuera del borde de la columna. */
.celda-input::-webkit-outer-spin-button,
.celda-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.celda-input { -moz-appearance: textfield; appearance: textfield; }
</style>
