<script setup>
import { computed, onMounted, ref } from 'vue'
import { useMarcacionesStore } from '../../stores/marcaciones'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

const store = useMarcacionesStore()
const authStore = useAuthStore()
const { success } = useToast()

const archivo   = ref(null)
const inputRef  = ref(null)
const arrastrando = ref(false)
const subiendo  = ref(false)
const error     = ref('')
const resultado = ref(null)

onMounted(async () => {
  try {
    await store.fetchEstado()
  } catch {
    return
  }
  // Período sugerido: la quincena de la marca más reciente.
  if (store.estado?.hasta) {
    const [y, m, d] = store.estado.hasta.split('-').map(Number)
    const mm = String(m).padStart(2, '0')
    incompletas.value.desde = `${y}-${mm}-${d <= 15 ? '01' : '16'}`
    incompletas.value.hasta = d <= 15 ? `${y}-${mm}-15` : `${y}-${mm}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    consultarIncompletas()
  }
})

// ── Marcas incompletas ──────────────────────────────────────────────────────
const MOTIVOS = ['Falla de energía', 'Olvido de marcar', 'Falla del reloj', 'Permiso autorizado por el jefe']

const incompletas   = ref({ desde: '', hasta: '' })
const listado       = ref(null)   // { filas, total, justificadas }
const buscando      = ref(false)
const errorInc      = ref('')
const descargando   = ref('')
const soloPendientes = ref(false)
const justificando  = ref(null)   // fila en el modal
const motivo        = ref({ tipo: MOTIVOS[0], detalle: '' })
const guardando     = ref(false)

const filasVisibles = computed(() =>
  (listado.value?.filas ?? []).filter((f) => !soloPendientes.value || !f.justificacion),
)

async function consultarIncompletas() {
  errorInc.value = ''
  if (!incompletas.value.desde || !incompletas.value.hasta) {
    errorInc.value = 'Indique el período.'
    return
  }
  buscando.value = true
  try {
    listado.value = await store.fetchIncompletas({ ...incompletas.value })
  } catch (e) {
    errorInc.value = e.response?.data?.message ?? 'No se pudieron consultar las marcas incompletas.'
  } finally {
    buscando.value = false
  }
}

async function descargar(formato) {
  descargando.value = formato
  try {
    await store.descargarIncompletas({ ...incompletas.value }, formato)
  } catch {
    errorInc.value = 'No se pudo descargar el archivo.'
  } finally {
    descargando.value = ''
  }
}

function abrirJustificar(fila) {
  motivo.value = { tipo: MOTIVOS[0], detalle: '' }
  justificando.value = fila
}

function cerrarJustificar() {
  if (!guardando.value) justificando.value = null
}

async function guardarJustificacion() {
  const f = justificando.value
  const texto = motivo.value.tipo === 'Otro'
    ? motivo.value.detalle.trim()
    : [motivo.value.tipo, motivo.value.detalle.trim()].filter(Boolean).join(': ')
  if (!texto) return
  guardando.value = true
  try {
    f.justificacion = await store.justificar({ id_empleado: f.id_empleado, fecha: f.fecha, motivo: texto })
    listado.value.justificadas++
    success('Día justificado: contará como trabajado en la planilla.')
    justificando.value = null
  } catch (e) {
    errorInc.value = e.response?.data?.message ?? 'No se pudo justificar.'
    justificando.value = null
  } finally {
    guardando.value = false
  }
}

async function quitarJustificacion(fila) {
  try {
    await store.quitarJustificacion(fila.justificacion.id)
    fila.justificacion = null
    listado.value.justificadas--
    success('Justificación quitada.')
  } catch {
    errorInc.value = 'No se pudo quitar la justificación.'
  }
}

function horaCorta(h) {
  return String(h ?? '').slice(0, 5)
}

function formatDate(f) {
  if (!f) return '—'
  const [y, m, d] = String(f).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function formatDateTime(f) {
  if (!f) return '—'
  return new Date(String(f).replace(' ', 'T')).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' })
}

function numero(n) {
  return Number(n ?? 0).toLocaleString('es-HN')
}

function elegir(e) {
  const f = e.target.files?.[0]
  if (f) seleccionar(f)
}

function soltar(e) {
  arrastrando.value = false
  const f = e.dataTransfer.files?.[0]
  if (f) seleccionar(f)
}

function seleccionar(f) {
  error.value = ''
  resultado.value = null
  if (!/\.(csv|txt)$/i.test(f.name)) {
    error.value = 'El archivo debe ser .csv'
    archivo.value = null
    return
  }
  archivo.value = f
}

function quitar() {
  archivo.value = null
  if (inputRef.value) inputRef.value.value = ''
}

async function subir() {
  if (!archivo.value) return
  error.value = ''
  resultado.value = null
  subiendo.value = true
  try {
    resultado.value = await store.cargarCsv(archivo.value)
    success(`${numero(resultado.value.insertadas)} marca(s) nueva(s) cargada(s).`)
    quitar()
    if (incompletas.value.desde && incompletas.value.hasta) consultarIncompletas()
  } catch (e) {
    const errs = e.response?.data?.errors
    error.value = errs
      ? Object.values(errs).flat().join(' | ')
      : e.response?.data?.message ?? 'No se pudo cargar el archivo.'
  } finally {
    subiendo.value = false
  }
}

// ── Eliminar marcas (solo administradores) ──────────────────────────────────
const borrar       = ref({ desde: '', hasta: '', reloj: '' })
const errorBorrar  = ref('')
const contando     = ref(false)
const confirmacion = ref(null)   // { total, desde, hasta, reloj }
const eliminando   = ref(false)

function filtrosBorrar() {
  const { desde, hasta, reloj } = borrar.value
  return reloj ? { desde, hasta, reloj } : { desde, hasta }
}

async function pedirEliminar() {
  errorBorrar.value = ''
  if (!borrar.value.desde || !borrar.value.hasta) {
    errorBorrar.value = 'Indique el rango de fechas.'
    return
  }
  contando.value = true
  try {
    const total = await store.contarParaEliminar(filtrosBorrar())
    if (!total) {
      errorBorrar.value = 'No hay marcas en ese rango.'
      return
    }
    confirmacion.value = { total, ...borrar.value }
  } catch (e) {
    errorBorrar.value = e.response?.data?.message ?? 'No se pudieron contar las marcas.'
  } finally {
    contando.value = false
  }
}

function cancelarEliminar() {
  if (!eliminando.value) confirmacion.value = null
}

async function confirmarEliminar() {
  eliminando.value = true
  try {
    const n = await store.eliminar(filtrosBorrar())
    success(`${numero(n)} marca(s) eliminada(s).`)
    confirmacion.value = null
    borrar.value = { desde: '', hasta: '', reloj: '' }
    if (listado.value) consultarIncompletas()
  } catch (e) {
    errorBorrar.value = e.response?.data?.message ?? 'No se pudieron eliminar las marcas.'
    confirmacion.value = null
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">

    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-slate-800">Cargar Marcas</h2>
      <p class="text-sm text-slate-500 mt-0.5">Sube el CSV con las marcas de los relojes biométricos para contar los días trabajados en la planilla.</p>
    </div>

    <!-- Estado actual -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-xs text-slate-500">Marcas guardadas</p>
        <p class="text-lg font-bold text-slate-800 mt-0.5">{{ numero(store.estado?.total) }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-xs text-slate-500">Período con marcas</p>
        <p class="text-sm font-semibold text-slate-800 mt-1">
          <template v-if="store.estado?.desde">{{ formatDate(store.estado.desde) }} al {{ formatDate(store.estado.hasta) }}</template>
          <template v-else>—</template>
        </p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-xs text-slate-500">Empleados con código</p>
        <p class="text-lg font-bold text-slate-800 mt-0.5">{{ numero(store.estado?.con_codigo) }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-xs text-slate-500">Última carga</p>
        <p class="text-sm font-semibold text-slate-800 mt-1">{{ formatDateTime(store.estado?.ultima_carga) }}</p>
      </div>
    </div>

    <!-- Subir archivo -->
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div
        class="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
        :class="arrastrando ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'"
        @click="inputRef?.click()"
        @dragover.prevent="arrastrando = true"
        @dragleave.prevent="arrastrando = false"
        @drop.prevent="soltar"
      >
        <svg class="w-10 h-10 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p v-if="!archivo" class="mt-2 text-sm text-slate-600">
          Arrastre aquí el archivo <span class="font-semibold">.csv</span> o <span class="text-blue-600 font-medium">haga clic para elegirlo</span>
        </p>
        <p v-else class="mt-2 text-sm text-slate-700">
          <span class="font-semibold">{{ archivo.name }}</span>
          <span class="text-slate-400"> · {{ (archivo.size / 1024).toFixed(0) }} KB</span>
        </p>
        <input ref="inputRef" type="file" accept=".csv,.txt" class="hidden" @change="elegir" />
      </div>

      <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{{ error }}</div>

      <div class="flex justify-end">
        <div class="flex gap-2 justify-end">
          <button v-if="archivo" @click="quitar" :disabled="subiendo" class="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
            Quitar
          </button>
          <button
            @click="subir"
            :disabled="!archivo || subiendo"
            class="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition flex items-center gap-2"
          >
            <svg v-if="subiendo" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            {{ subiendo ? 'Cargando...' : 'Cargar marcas' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Resultado de la carga -->
    <div v-if="resultado" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 bg-emerald-50">
        <p class="font-semibold text-emerald-800">Carga completada</p>
        <p class="text-sm text-emerald-700 mt-0.5">
          Marcas del {{ formatDate(resultado.desde) }} al {{ formatDate(resultado.hasta) }}.
        </p>
      </div>
      <div class="px-6 py-5 space-y-4">
        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="rounded-lg bg-slate-50 p-3">
            <p class="text-xs text-slate-500">Leídas</p>
            <p class="text-lg font-bold text-slate-800">{{ numero(resultado.leidas) }}</p>
          </div>
          <div class="rounded-lg bg-emerald-50 p-3">
            <p class="text-xs text-emerald-700">Nuevas</p>
            <p class="text-lg font-bold text-emerald-700">{{ numero(resultado.insertadas) }}</p>
          </div>
          <div class="rounded-lg bg-slate-50 p-3">
            <p class="text-xs text-slate-500">Ya estaban cargadas</p>
            <p class="text-lg font-bold text-slate-800">{{ numero(resultado.repetidas) }}</p>
          </div>
        </div>

        <div v-if="resultado.total_errores" class="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <p class="font-semibold">{{ numero(resultado.total_errores) }} línea(s) no se pudieron leer:</p>
          <ul class="list-disc list-inside text-xs mt-1 space-y-0.5">
            <li v-for="(e, i) in resultado.errores" :key="i">{{ e }}</li>
          </ul>
        </div>

        <div v-if="resultado.sin_empleado.length" class="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <p class="font-semibold">Códigos sin empleado asignado ({{ resultado.sin_empleado.length }})</p>
          <p class="text-xs mt-0.5">Sus marcas se guardaron, pero no cuentan en la planilla hasta asignar el código en la ficha del empleado (campo Código biométrico).</p>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span v-for="s in resultado.sin_empleado" :key="s.codigo" class="px-2 py-0.5 rounded bg-white border border-amber-200 text-xs font-mono">
              {{ s.codigo }} <span class="text-amber-600">· {{ s.marcas }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Marcas incompletas -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-slate-800">Marcas incompletas</p>
          <p class="text-xs text-slate-500 mt-0.5">Días con una sola marca (solo entrada o solo salida). Verifique con el jefe y justifique los que correspondan: un día justificado cuenta como trabajado.</p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button @click="descargar('excel')" :disabled="!listado?.total || !!descargando"
            class="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg text-emerald-700 hover:bg-slate-50 disabled:opacity-50 transition">
            {{ descargando === 'excel' ? 'Descargando...' : 'Excel' }}
          </button>
          <button @click="descargar('pdf')" :disabled="!listado?.total || !!descargando"
            class="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg text-red-600 hover:bg-slate-50 disabled:opacity-50 transition">
            {{ descargando === 'pdf' ? 'Descargando...' : 'PDF' }}
          </button>
        </div>
      </div>

      <div class="px-6 py-4 flex flex-col sm:flex-row sm:items-end gap-3 border-b border-gray-100">
        <div class="flex-1">
          <label class="label text-xs">Desde</label>
          <input v-model="incompletas.desde" type="date" class="input" />
        </div>
        <div class="flex-1">
          <label class="label text-xs">Hasta</label>
          <input v-model="incompletas.hasta" type="date" :min="incompletas.desde" class="input" />
        </div>
        <button @click="consultarIncompletas" :disabled="buscando"
          class="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition">
          {{ buscando ? 'Consultando...' : 'Consultar' }}
        </button>
      </div>

      <div v-if="errorInc" class="mx-6 mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{{ errorInc }}</div>

      <template v-if="listado">
        <div class="px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <p class="text-slate-600">
            <strong class="text-slate-800">{{ listado.total }}</strong> caso(s) ·
            <span class="text-emerald-700"><strong>{{ listado.justificadas }}</strong> justificado(s)</span> ·
            <span class="text-amber-700"><strong>{{ listado.total - listado.justificadas }}</strong> pendiente(s)</span>
          </p>
          <label class="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
            <input v-model="soloPendientes" type="checkbox" class="w-3.5 h-3.5 rounded border-slate-300" />
            Solo pendientes
          </label>
        </div>

        <div class="overflow-x-auto max-h-[28rem] overflow-y-auto border-t border-gray-100">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide sticky top-0">
              <tr>
                <th class="px-4 py-2.5 text-left">Empleado</th>
                <th class="px-4 py-2.5 text-left">Departamento</th>
                <th class="px-4 py-2.5 text-left">Fecha</th>
                <th class="px-4 py-2.5 text-left">Marca</th>
                <th class="px-4 py-2.5 text-left">Justificación</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filasVisibles.length">
                <td colspan="5" class="px-4 py-8 text-center text-slate-400 text-sm">
                  {{ listado.total ? 'Todos los casos están justificados.' : 'No hay marcas incompletas en el período.' }}
                </td>
              </tr>
              <tr v-for="f in filasVisibles" :key="f.id_empleado + f.fecha" class="border-t border-gray-100 hover:bg-slate-50">
                <td class="px-4 py-2.5">
                  <p class="font-medium text-slate-800">{{ f.empleado }}</p>
                  <p class="text-xs text-slate-400">{{ f.cargo ?? '' }}</p>
                </td>
                <td class="px-4 py-2.5 text-slate-600 text-xs">{{ f.departamento ?? '—' }}</td>
                <td class="px-4 py-2.5 whitespace-nowrap">
                  <p class="text-slate-700">{{ formatDate(f.fecha) }}</p>
                  <p class="text-xs text-slate-400">{{ f.dia }}</p>
                </td>
                <td class="px-4 py-2.5 whitespace-nowrap">
                  <span class="text-slate-700 font-mono text-xs">{{ horaCorta(f.hora) }}</span>
                  <span v-if="f.tipo" class="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    :class="f.tipo.startsWith('Entrada') ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'">
                    {{ f.tipo }}
                  </span>
                </td>
                <td class="px-4 py-2.5">
                  <div v-if="f.justificacion" class="flex items-start gap-2">
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-emerald-700">{{ f.justificacion.motivo }}</p>
                      <p class="text-[11px] text-slate-400">{{ f.justificacion.usuario }}</p>
                    </div>
                    <button @click="quitarJustificacion(f)" title="Quitar justificación"
                      class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition flex-shrink-0">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <button v-else @click="abrirJustificar(f)"
                    class="px-3 py-1 text-xs font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition">
                    Justificar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- Cómo se usan -->
    <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
      <p class="font-semibold mb-1">¿Cómo se usan las marcas?</p>
      <ul class="list-disc list-inside space-y-0.5 text-xs">
        <li>Cada marca se asigna al empleado por su <strong>Código biométrico</strong> (ficha del empleado).</li>
        <li>Al crear la planilla, active <strong>Cargar días trabajados desde marcaciones biométricas</strong> e indique el período.</li>
        <li>Cuenta como día trabajado cada día con entrada y salida marcadas (2 marcas o más).</li>
      </ul>
    </div>

    <!-- Eliminar marcas (solo administradores) -->
    <div v-if="authStore.isAdmin" class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div>
        <p class="text-sm font-semibold text-slate-800">Eliminar marcas</p>
        <p class="text-xs text-slate-500 mt-0.5">Para quitar un archivo cargado por error o limpiar historial antiguo. Las planillas ya generadas no cambian.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="label text-xs">Desde <span class="text-red-500">*</span></label>
          <input v-model="borrar.desde" type="date" class="input" />
        </div>
        <div>
          <label class="label text-xs">Hasta <span class="text-red-500">*</span></label>
          <input v-model="borrar.hasta" type="date" :min="borrar.desde" class="input" />
        </div>
        <div>
          <label class="label text-xs">Reloj</label>
          <select v-model="borrar.reloj" class="input">
            <option value="">Todos los relojes</option>
            <option v-for="r in store.estado?.relojes ?? []" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
      </div>
      <div v-if="errorBorrar" class="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{{ errorBorrar }}</div>
      <div class="flex justify-end">
        <button
          @click="pedirEliminar"
          :disabled="contando"
          class="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-60 text-sm font-semibold transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          {{ contando ? 'Contando...' : 'Eliminar marcas' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Modal justificar marca incompleta -->
  <Teleport to="body">
    <div
      v-if="justificando"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="cerrarJustificar"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div>
          <h3 class="text-base font-bold text-slate-800">Justificar marca incompleta</h3>
          <p class="text-xs text-slate-500 mt-0.5">El día contará como trabajado al generar la planilla.</p>
        </div>

        <div class="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm space-y-1.5">
          <div class="flex justify-between gap-4">
            <span class="text-slate-500">Empleado</span>
            <span class="font-semibold text-slate-800 text-right">{{ justificando.empleado }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-slate-500">Fecha</span>
            <span class="font-semibold text-slate-800">{{ justificando.dia }} {{ formatDate(justificando.fecha) }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-slate-500">Marca registrada</span>
            <span class="font-semibold text-slate-800">{{ horaCorta(justificando.hora) }} · {{ justificando.tipo ?? '—' }}</span>
          </div>
        </div>

        <div>
          <label class="label text-xs">Motivo <span class="text-red-500">*</span></label>
          <select v-model="motivo.tipo" class="input">
            <option v-for="m in MOTIVOS" :key="m" :value="m">{{ m }}</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div>
          <label class="label text-xs">
            Detalle <span v-if="motivo.tipo === 'Otro'" class="text-red-500">*</span><span v-else class="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input v-model="motivo.detalle" maxlength="200" class="input" placeholder="Ej. confirmado con el jefe de Bares" />
        </div>

        <div class="flex justify-end gap-3 pt-1">
          <button type="button" @click="cerrarJustificar" :disabled="guardando"
            class="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
            Cancelar
          </button>
          <button type="button" @click="guardarJustificacion"
            :disabled="guardando || (motivo.tipo === 'Otro' && !motivo.detalle.trim())"
            class="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {{ guardando ? 'Guardando...' : 'Justificar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal confirmación eliminar marcas -->
  <Teleport to="body">
    <div
      v-if="confirmacion"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="cancelarEliminar"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100 text-red-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-800">Eliminar marcas</h3>
            <p class="text-xs text-slate-500 mt-0.5">Esta acción no se puede deshacer. Si las necesita de nuevo, vuelva a subir el CSV.</p>
          </div>
        </div>

        <div class="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm space-y-1.5">
          <div class="flex justify-between gap-4">
            <span class="text-slate-500">Período</span>
            <span class="font-semibold text-slate-800">{{ formatDate(confirmacion.desde) }} al {{ formatDate(confirmacion.hasta) }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-slate-500">Reloj</span>
            <span class="font-semibold text-slate-800">{{ confirmacion.reloj || 'Todos' }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-slate-500">Marcas a eliminar</span>
            <span class="font-semibold text-red-600">{{ numero(confirmacion.total) }}</span>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-1">
          <button
            type="button"
            @click="cancelarEliminar"
            :disabled="eliminando"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
          <button
            type="button"
            @click="confirmarEliminar"
            :disabled="eliminando"
            class="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            <svg v-if="eliminando" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            {{ eliminando ? 'Eliminando...' : 'Sí, eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
<style scoped>
@reference "tailwindcss";
.label { @apply block text-sm font-medium text-slate-700 mb-1.5; }
.input { @apply w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition; }
</style>
