<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAguinaldoStore } from '../../stores/aguinaldo'
import { useToast } from '../../composables/useToast'
import { sanitizarNombreArchivo, descargarBlob } from '../../utils/archivos'

const route  = useRoute()
const router = useRouter()
const store  = useAguinaldoStore()
const { error } = useToast()

const loading  = ref(true)
const cerrando = ref(false)

function formatDate(d) {
  if (!d) return '—'
  const [anio, mes, dia] = String(d).slice(0, 10).split('-')
  return `${dia}-${mes}-${anio}`
}

// Modal
const modal       = reactive({ open: false, tipo: '', registro: null })
const modalForm   = reactive({ dias_trabajados: 0, anticipo: 0, dias_promedio: 0, antiguedad: 0, anticipos: 0, sin_promedio: false })
const modalLoading = ref(false)

const nombre = computed(() => decodeURIComponent(route.params.nombre))
const detalle = computed(() => store.detalle)
const esCerrada = computed(() => detalle.value?.estado === 'Cerrado')

// ── Agrupación por departamento, igual que en las planillas de pago ─────────
const CAMPOS_SUMABLES_FIJOS  = ['dias_trabajados', 'salario_base', 'anticipo', 'total_aguinaldo']
// La antigüedad (días de 30) y los días promediados no se suman: no son montos.
const CAMPOS_SUMABLES_EXTRAS = ['subtotal', 'anticipos', 'total_aguinaldo']

function sumarCampos(filas, campos) {
  return campos.reduce((acc, campo) => {
    acc[campo] = filas.reduce((sum, f) => sum + Number(f[campo] || 0), 0)
    return acc
  }, {})
}

function agruparPorDepartamento(filas, campos) {
  const bloques = []
  for (const f of filas) {
    const actual = bloques[bloques.length - 1]
    if (!actual || actual.departamento !== f.departamento) {
      bloques.push({ departamento: f.departamento, filas: [f] })
    } else {
      actual.filas.push(f)
    }
  }
  return bloques.map(bloque => ({ ...bloque, subtotal: sumarCampos(bloque.filas, campos) }))
}

const gruposFijos  = computed(() => agruparPorDepartamento(detalle.value?.fijos ?? [], CAMPOS_SUMABLES_FIJOS))
const gruposExtras = computed(() => agruparPorDepartamento(detalle.value?.extras ?? [], CAMPOS_SUMABLES_EXTRAS))

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
  modalForm.dias_promedio = r.dias_promedio ?? 0
  modalForm.antiguedad    = parseFloat(r.antiguedad)
  modalForm.anticipos     = parseFloat(r.anticipos)
  modalForm.sin_promedio  = !!r.sin_promedio
  modal.open = true
}

// ── Calculados en tiempo real (modal) ────────────────────────────
const totalFijoCalc = computed(() => {
  if (modal.tipo !== 'fijo' || !modal.registro) return 0
  const base = parseFloat(modal.registro.salario_base)
  return Math.max(0, parseFloat(((base / 360) * modalForm.dias_trabajados - modalForm.anticipo).toFixed(2)))
})

// Mismas fórmulas que la planilla de Excel:
// Subtotal = diario × antigüedad; Total = días prom. ÷ 30 × subtotal − anticipos
// (si trabaja todos los días no se aplica el promedio).
const subtotalExtraCalc = computed(() => {
  if (modal.tipo !== 'extra' || !modal.registro) return 0
  return parseFloat(modal.registro.diario) * (Number(modalForm.antiguedad) || 0)
})

const totalExtraCalc = computed(() => {
  const factor = modalForm.sin_promedio ? 1 : (Number(modalForm.dias_promedio) || 0) / 30
  return Math.max(0, parseFloat((factor * subtotalExtraCalc.value - (Number(modalForm.anticipos) || 0)).toFixed(2)))
})

// ── Desglose del promedio de días (quincenas) ───────────────────
const quincenas = reactive({ open: false, loading: false, registro: null, data: null })

async function verQuincenas(e) {
  Object.assign(quincenas, { open: true, loading: true, registro: e, data: null })
  try {
    quincenas.data = await store.fetchQuincenasExtra(e.id)
  } catch (err) {
    quincenas.open = false
    error(err.response?.data?.message ?? 'No se pudo cargar el detalle de quincenas.')
  } finally {
    quincenas.loading = false
  }
}

const periodoExtras = computed(() => {
  const r = detalle.value?.extras?.[0]
  return r?.periodo_desde ? { desde: r.periodo_desde, hasta: r.periodo_hasta, meses: Number(r.meses_promedio) } : null
})

function fmtAntig(v) {
  return Number(v ?? 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

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
        sin_promedio:  modalForm.sin_promedio,
        dias_promedio: modalForm.sin_promedio ? null : modalForm.dias_promedio,
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
const showConfirmCerrar = ref(false)

function abrirConfirmCerrar() {
  showConfirmCerrar.value = true
}

function cancelarCerrar() {
  showConfirmCerrar.value = false
}

async function cerrar() {
  cerrando.value = true
  try {
    await store.cerrar(nombre.value)
    showConfirmCerrar.value = false
  } catch {
    error('Ocurrió un error. Intenta de nuevo.')
  } finally {
    cerrando.value = false
  }
}

// ── Exportaciones (las mismas que en las planillas de pago) ──────
// ruta: 'pdf' | 'excel' | 'pago/excel' | 'bancos/excel' | 'bancos/pdf' | 'cheques/excel' | 'cheques/pdf'
function exportar(ruta, prefijo = '') {
  const token  = localStorage.getItem('token')
  const base   = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
  const url    = `${base}/aguinaldo/${encodeURIComponent(nombre.value)}/${ruta}`
  const ext    = ruta.endsWith('excel') ? 'xlsx' : 'pdf'
  const archivo = sanitizarNombreArchivo(nombre.value)
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => {
      if (!r.ok) throw new Error()
      return r.blob()
    })
    .then(blob => descargarBlob(blob, prefijo ? `${prefijo} (${archivo}).${ext}` : `${archivo}.${ext}`))
    .catch(() => error('No se pudo generar el archivo.'))
}

// Bancos = empleados con cuenta bancaria registrada (transferencia); Cheques = sin cuenta.
function exportarPagoPorMetodo(metodo, formato) {
  exportar(`${metodo}/${formato}`, metodo === 'bancos' ? 'Bancos' : 'Cheques')
}

// ── Helpers ──────────────────────────────────────────────────────
function fmt(val) {
  if (val == null) return '—'
  return 'L ' + Number(val).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template>
  <div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-xl border border-slate-200">
    <svg class="w-10 h-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
    <p class="text-sm text-slate-500">Cargando aguinaldo...</p>
  </div>

  <div v-else-if="detalle">
    <!-- Header -->
    <div class="flex items-start justify-between mb-6">
      <div class="flex items-center gap-3">
        <button @click="router.push({ path: '/aguinaldo', query: { concepto: detalle.concepto, tipo: detalle.tipo_aguinaldo } })" class="text-slate-400 hover:text-slate-600 transition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 class="text-xl font-bold text-slate-800">{{ detalle.nombre_aguinaldo }}</h2>
          <p class="text-xs text-slate-500 mt-0.5">
            {{ detalle.concepto }} {{ detalle.tipo_aguinaldo }} &bull;
            Fecha: {{ formatDate(detalle.fecha_generada) }} &bull;
            Corte: {{ formatDate(detalle.fecha_corte) }} &bull;
            Empleados: {{ (detalle.fijos?.length ?? 0) + (detalle.extras?.length ?? 0) }} &bull;
            <span :class="detalle.estado === 'Cerrado' ? 'text-slate-500' : 'text-emerald-600'">
              {{ detalle.estado }}
            </span>
          </p>
        </div>
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <button
          @click="exportar('pdf')"
          class="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          PDF General
        </button>
        <button
          @click="exportar('excel')"
          title="Excel con el detalle completo (mismas columnas que la planilla en Excel)"
          class="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
            <path stroke-linecap="round" d="M3 9.75h18M3 15h18M9.75 4.5v15M15 4.5v15" />
          </svg>
          Excel General
        </button>
        <button
          @click="exportar('pago/excel', 'Pago')"
          title="Excel con Empleado y Total a Pagar (solo empleados con cuenta bancaria registrada), ordenado alfabéticamente"
          class="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
          </svg>
          Generar Pago
        </button>
        <!-- Bancos: empleados con cuenta bancaria registrada (transferencia) / Cheques: sin cuenta -->
        <div
          v-for="m in [{ metodo: 'bancos', etiqueta: 'Bancos', titulo: 'Empleados que cobran por transferencia bancaria (tienen cuenta registrada)', icono: 'M2.25 21h19.5M4.5 3h15l-1.5 3.75h-12L4.5 3zM4.5 21V9.75m15 11.25V9.75M3 9.75h18M6.75 12.75v5.25M11.25 12.75v5.25M12.75 12.75v5.25M17.25 12.75v5.25' },
                       { metodo: 'cheques', etiqueta: 'Cheques', titulo: 'Empleados que cobran por cheque (sin cuenta bancaria registrada)', icono: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z' }]"
          :key="m.metodo"
          :title="m.titulo"
          class="flex items-stretch border border-slate-300 rounded-lg overflow-hidden"
        >
          <span class="flex items-center gap-2 px-3 text-sm font-medium text-slate-700 bg-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" :d="m.icono" />
            </svg>
            {{ m.etiqueta }}
          </span>
          <button @click="exportarPagoPorMetodo(m.metodo, 'excel')" title="Excel" class="px-2.5 border-l border-slate-300 hover:bg-slate-50 text-emerald-600 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
              <path stroke-linecap="round" d="M3 9.75h18M3 15h18M9.75 4.5v15M15 4.5v15" />
            </svg>
          </button>
          <button @click="exportarPagoPorMetodo(m.metodo, 'pdf')" title="PDF" class="px-2.5 border-l border-slate-300 hover:bg-slate-50 text-red-600 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
        </div>
        <button
          v-if="!esCerrada"
          @click="abrirConfirmCerrar"
          :disabled="cerrando"
          class="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          {{ cerrando ? 'Cerrando...' : `Cerrar ${detalle.concepto}` }}
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
                <th class="px-4 py-3 text-left">Nombre</th>
                <th class="px-4 py-3 text-center">Cuenta</th>
                <th class="px-4 py-3 text-left">Cargo</th>
                <th class="px-4 py-3 text-center">Fecha Inicio</th>
                <th class="px-4 py-3 text-center">Salario Mensual</th>
                <th class="px-4 py-3 text-center">Días Año</th>
                <th class="px-4 py-3 text-center">Anticipo</th>
                <th class="px-4 py-3 text-center">A Pagar</th>
                <th v-if="!esCerrada" class="px-4 py-3 text-center">Editar</th>
              </tr>
            </thead>
            <tbody v-for="grupo in gruposFijos" :key="grupo.departamento">
              <tr>
                <td :colspan="esCerrada ? 8 : 9" class="px-4 py-1.5 bg-amber-50 text-amber-800 font-bold uppercase tracking-wide text-xs">
                  {{ grupo.departamento }}
                </td>
              </tr>
              <tr v-for="f in grupo.filas" :key="f.id" class="border-b border-gray-100 hover:bg-slate-50">
                <td class="px-4 py-2.5 font-medium text-slate-800">{{ f.nombres }} {{ f.apellidos }}</td>
                <td class="px-4 py-2.5 text-center text-slate-600 text-xs">{{ f.cuenta ?? '—' }}</td>
                <td class="px-4 py-2.5 text-slate-600 text-xs">{{ f.cargo ?? '—' }}</td>
                <td class="px-4 py-2.5 text-center text-slate-600 text-xs">{{ formatDate(f.fecha_inicio) }}</td>
                <td class="px-4 py-2.5 text-center text-slate-700">{{ fmt(f.salario_base) }}</td>
                <td class="px-4 py-2.5 text-center text-slate-700">{{ f.dias_trabajados }}</td>
                <td class="px-4 py-2.5 text-center text-amber-600">{{ fmt(f.anticipo) }}</td>
                <td class="px-4 py-2.5 text-center font-semibold text-slate-800">{{ fmt(f.total_aguinaldo) }}</td>
                <td v-if="!esCerrada" class="px-4 py-2.5 text-center">
                  <button @click="abrirModalFijo(f)" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                </td>
              </tr>
              <!-- Subtotal por departamento -->
              <tr class="bg-amber-100/60 font-semibold text-xs">
                <td class="px-4 py-1.5" colspan="4">SUBTOTAL: {{ grupo.departamento }}</td>
                <td class="px-4 py-1.5 text-center">{{ fmt(grupo.subtotal.salario_base) }}</td>
                <td class="px-4 py-1.5 text-center">{{ grupo.subtotal.dias_trabajados }}</td>
                <td class="px-4 py-1.5 text-center">{{ fmt(grupo.subtotal.anticipo) }}</td>
                <td class="px-4 py-1.5 text-center">{{ fmt(grupo.subtotal.total_aguinaldo) }}</td>
                <td v-if="!esCerrada"></td>
              </tr>
            </tbody>
            <tfoot>
              <!-- Total general -->
              <tr class="bg-blue-700 text-white text-xs font-semibold">
                <td class="px-4 py-2.5" colspan="4">TOTAL GENERAL</td>
                <td class="px-4 py-2.5 text-center">{{ fmt(detalle.totales_fijos?.salario_base) }}</td>
                <td class="px-4 py-2.5 text-center">{{ detalle.totales_fijos?.dias_trabajados }}</td>
                <td class="px-4 py-2.5 text-center">{{ fmt(detalle.totales_fijos?.anticipo) }}</td>
                <td class="px-4 py-2.5 text-center">{{ fmt(detalle.totales_fijos?.total_aguinaldo) }}</td>
                <td v-if="!esCerrada"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>

    <!-- Extras -->
    <template v-if="detalle.extras?.length > 0">
      <div class="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h3 class="text-sm font-semibold text-slate-600">Empleados Extras</h3>
        <p v-if="periodoExtras" class="text-xs text-slate-500">
          Promedio de días: planillas del {{ formatDate(periodoExtras.desde) }} al {{ formatDate(periodoExtras.hasta) }}
          · {{ periodoExtras.meses }} {{ periodoExtras.meses === 1 ? 'mes' : 'meses' }} · máx. 15 días por quincena
        </p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-gray-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th class="px-4 py-3 text-left">Empleado</th>
                <th class="px-4 py-3 text-center">F. Inicio</th>
                <th class="px-4 py-3 text-center">Diario</th>
                <th class="px-4 py-3 text-center" title="Días de 30 según la fecha de inicio: 30 si cumple 360 días al corte">Antigüedad</th>
                <th class="px-4 py-3 text-center" title="Diario × antigüedad">Subtotal</th>
                <th class="px-4 py-3 text-center" title="Promedio mensual de días trabajados (clic para ver las quincenas)">Días Prom.</th>
                <th class="px-4 py-3 text-center">Anticipos</th>
                <th class="px-4 py-3 text-center">Total</th>
                <th v-if="!esCerrada" class="px-4 py-3 text-center">Editar</th>
              </tr>
            </thead>
            <tbody v-for="grupo in gruposExtras" :key="grupo.departamento">
              <tr>
                <td :colspan="esCerrada ? 8 : 9" class="px-4 py-1.5 bg-amber-50 text-amber-800 font-bold uppercase tracking-wide text-xs">
                  {{ grupo.departamento }}
                </td>
              </tr>
              <tr v-for="e in grupo.filas" :key="e.id" class="border-b border-gray-100 hover:bg-slate-50">
                <td class="px-4 py-2.5 font-medium text-slate-800">{{ e.nombres }} {{ e.apellidos }}</td>
                <td class="px-4 py-2.5 text-center text-slate-500 text-xs">{{ formatDate(e.fecha_inicio) }}</td>
                <td class="px-4 py-2.5 text-center text-slate-700">{{ fmt(e.diario) }}</td>
                <td class="px-4 py-2.5 text-center text-slate-700">{{ fmtAntig(e.antiguedad) }}</td>
                <td class="px-4 py-2.5 text-center text-slate-700">{{ fmt(e.subtotal) }}</td>
                <td class="px-4 py-2.5 text-center">
                  <span v-if="e.sin_promedio" class="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full" title="Trabaja todos los días: no se aplica el promedio">No aplica</span>
                  <button v-else type="button" @click="verQuincenas(e)"
                    class="font-medium text-blue-700 hover:underline"
                    :title="`Promedio exacto: ${e.promedio_dias ?? '—'} · clic para ver las quincenas`">
                    {{ e.dias_promedio }}
                  </button>
                </td>
                <td class="px-4 py-2.5 text-center text-amber-600">{{ fmt(e.anticipos) }}</td>
                <td class="px-4 py-2.5 text-center font-semibold text-slate-800">{{ fmt(e.total_aguinaldo) }}</td>
                <td v-if="!esCerrada" class="px-4 py-2.5 text-center">
                  <button @click="abrirModalExtra(e)" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                </td>
              </tr>
              <!-- Subtotal por departamento -->
              <tr class="bg-amber-100/60 font-semibold text-xs">
                <td class="px-4 py-1.5" colspan="4">SUBTOTAL: {{ grupo.departamento }}</td>
                <td class="px-4 py-1.5 text-center">{{ fmt(grupo.subtotal.subtotal) }}</td>
                <td></td>
                <td class="px-4 py-1.5 text-center">{{ fmt(grupo.subtotal.anticipos) }}</td>
                <td class="px-4 py-1.5 text-center">{{ fmt(grupo.subtotal.total_aguinaldo) }}</td>
                <td v-if="!esCerrada"></td>
              </tr>
            </tbody>
            <tfoot>
              <!-- Total general -->
              <tr class="bg-blue-700 text-white text-xs font-semibold">
                <td class="px-4 py-2.5" colspan="4">TOTAL GENERAL</td>
                <td class="px-4 py-2.5 text-center">{{ fmt(detalle.totales_extras?.subtotal) }}</td>
                <td></td>
                <td class="px-4 py-2.5 text-center">{{ fmt(detalle.totales_extras?.anticipos) }}</td>
                <td class="px-4 py-2.5 text-center">{{ fmt(detalle.totales_extras?.total_aguinaldo) }}</td>
                <td v-if="!esCerrada"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>
  </div>

  <!-- Modal confirmación cerrar aguinaldo -->
  <Teleport to="body">
    <div
      v-if="showConfirmCerrar"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="cancelarCerrar"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">

        <!-- Encabezado -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-800">Cerrar aguinaldo</h3>
            <p class="text-xs text-slate-500 mt-0.5">¿Seguro que quieres cerrar este aguinaldo?</p>
          </div>
        </div>

        <!-- Detalle -->
        <div class="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm">
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Planilla</span>
            <span class="font-semibold text-slate-800">{{ detalle?.nombre_aguinaldo }}</span>
          </div>
        </div>

        <p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No podrás editarlo después de cerrarlo.
        </p>

        <!-- Acciones -->
        <div class="flex justify-end gap-3 pt-1">
          <button
            type="button"
            @click="cancelarCerrar"
            :disabled="cerrando"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
          <button
            type="button"
            @click="cerrar"
            :disabled="cerrando"
            class="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            <svg v-if="cerrando" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {{ cerrando ? 'Cerrando...' : `Cerrar ${detalle.concepto}` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

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
              <input v-model.number="modalForm.dias_trabajados" type="text" inputmode="numeric" pattern="[0-9]*" class="input" />
            </div>
            <div>
              <label class="label">Anticipo (L)</label>
              <input v-model.number="modalForm.anticipo" type="text" inputmode="decimal" class="input" />
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
            <label class="flex items-start gap-2 cursor-pointer select-none">
              <input v-model="modalForm.sin_promedio" type="checkbox" class="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600" />
              <span class="text-sm text-slate-700">
                Trabaja todos los días
                <span class="block text-xs text-slate-400">No se aplica el promedio: el total depende solo de la antigüedad.</span>
              </span>
            </label>
            <div v-if="!modalForm.sin_promedio">
              <label class="label">Días Promedio (máx. 30)</label>
              <input v-model.number="modalForm.dias_promedio" type="text" inputmode="numeric" pattern="[0-9]*" class="input" />
              <p v-if="modal.registro?.promedio_dias != null" class="text-xs text-slate-400 mt-1">
                Calculado: {{ modal.registro.promedio_dias }} → {{ Math.min(30, Math.floor(modal.registro.promedio_dias)) }} (se cortan los decimales)
              </p>
            </div>
            <div>
              <label class="label">Antigüedad (días de 30, máx. 30)</label>
              <input v-model.number="modalForm.antiguedad" type="text" inputmode="decimal" class="input" />
              <p class="text-xs text-slate-400 mt-1">30 si al corte cumple 360 días; si no, proporcional a su fecha de inicio.</p>
            </div>
            <div>
              <label class="label">Anticipos (L)</label>
              <input v-model.number="modalForm.anticipos" type="text" inputmode="decimal" class="input" />
            </div>
            <div class="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
              <div>
                <span class="text-slate-500">Subtotal:</span>
                <span class="float-right font-medium text-slate-700">{{ 'L ' + subtotalExtraCalc.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
              </div>
              <div>
                <span class="text-slate-500">Total calculado:</span>
                <span class="float-right font-bold text-blue-700">{{ 'L ' + totalExtraCalc.toLocaleString('es-HN', { minimumFractionDigits: 2 }) }}</span>
              </div>
            </div>
          </div>
        </template>

        <div class="flex justify-end gap-3 mt-5">
          <button type="button" @click="modal.open = false" class="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
          <button
            @click="guardarModal"
            :disabled="modalLoading"
            class="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {{ modalLoading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Modal: quincenas del promedio de días ── -->
  <Teleport to="body">
    <div v-if="quincenas.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="quincenas.open = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
        <h3 class="text-base font-bold text-slate-800">
          Promedio de días — {{ quincenas.registro?.nombres }} {{ quincenas.registro?.apellidos }}
        </h3>

        <div v-if="quincenas.loading" class="py-10 text-center text-sm text-slate-400">Cargando...</div>

        <template v-else-if="quincenas.data">
          <p class="text-xs text-slate-500 mt-1 mb-3">
            Planillas de extras del {{ formatDate(quincenas.data.periodo_desde) }} al {{ formatDate(quincenas.data.periodo_hasta) }}.
            Cada quincena cuenta como máximo 15 días.
          </p>
          <div class="overflow-y-auto border border-slate-200 rounded-lg">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th class="px-3 py-2 text-left">Quincena</th>
                  <th class="px-3 py-2 text-center">Días en planilla</th>
                  <th class="px-3 py-2 text-center">Días contados</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="q in quincenas.data.quincenas" :key="q.fecha" class="border-t border-slate-100">
                  <td class="px-3 py-1.5 text-slate-700">{{ formatDate(q.fecha) }}</td>
                  <td class="px-3 py-1.5 text-center" :class="q.dias > 15 ? 'text-red-600 font-semibold' : 'text-slate-600'">
                    {{ q.dias ?? '—' }}
                  </td>
                  <td class="px-3 py-1.5 text-center font-medium" :class="q.dias > 15 ? 'text-red-600' : 'text-slate-800'">
                    {{ q.contado }}<span v-if="q.dias > 15" class="text-xs font-normal"> (tope)</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 text-sm mt-3 space-y-1">
            <div><span class="text-slate-500">Total de días contados:</span><span class="float-right font-medium">{{ quincenas.data.total_contado }}</span></div>
            <div><span class="text-slate-500">÷ Meses del período:</span><span class="float-right font-medium">{{ quincenas.data.meses }}</span></div>
            <div><span class="text-slate-500">Promedio:</span><span class="float-right font-medium">{{ quincenas.data.promedio }}</span></div>
            <div><span class="text-slate-500">Días promediados (sin decimales):</span><span class="float-right font-bold text-blue-700">{{ quincenas.data.dias_promedio }}</span></div>
          </div>
          <p v-if="quincenas.registro && quincenas.registro.dias_promedio !== quincenas.data.dias_promedio" class="text-xs text-amber-600 mt-2">
            En este aguinaldo figura {{ quincenas.registro.dias_promedio }}: se ajustó a mano o cambiaron las planillas después de generarlo.
          </p>
        </template>

        <div class="flex justify-end mt-4">
          <button type="button" @click="quincenas.open = false" class="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">Cerrar</button>
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
