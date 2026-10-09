<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCumpleanosStore } from '../../stores/cumpleanos'
import { useToast } from '../../composables/useToast'
import { generarTarjetaCumpleanos } from '../../utils/tarjetaCumpleanos'
import { nombreArchivo, descargarBlob } from '../../utils/archivos'
import LoadingSpinner from '../../components/LoadingSpinner.vue'

const store = useCumpleanosStore()
const { error: toastError } = useToast()

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

onMounted(() => store.fetchCumpleanos())

function seleccionarMes(n) {
  store.fetchCumpleanos(n)
}

const cumpleanosHoy   = computed(() => store.empleados.filter(e => e.es_hoy))
const cumpleanosResto = computed(() => store.empleados.filter(e => !e.es_hoy))

function iniciales(emp) {
  return (emp.nombres?.[0] ?? '') + (emp.apellidos?.[0] ?? '')
}

function formatFecha(fechaStr) {
  const [, m, d] = fechaStr.split('-')
  return `${parseInt(d)} de ${MESES[parseInt(m) - 1]}`
}

// ── Tarjeta de felicitación ──────────────────────────────────────────────────
const tarjeta = ref(null) // { id, emp, blob, url, generando }
let ultimaTarjetaId = 0

async function felicitar(emp) {
  cerrarTarjeta()
  // Se compara por id y no por objeto: el ref envuelve el objeto en un proxy reactivo.
  const id = ++ultimaTarjetaId
  tarjeta.value = { id, emp, blob: null, url: '', generando: true }
  try {
    const blob = await generarTarjetaCumpleanos(emp)
    // Si se cerró o se abrió otra tarjeta mientras se generaba, se descarta.
    if (tarjeta.value?.id !== id) return
    tarjeta.value = { id, emp, blob, url: URL.createObjectURL(blob), generando: false }
  } catch {
    if (tarjeta.value?.id === id) tarjeta.value = null
    toastError('No se pudo generar la tarjeta de cumpleaños.')
  }
}

function descargarTarjeta() {
  const t = tarjeta.value
  if (!t?.blob) return
  descargarBlob(t.blob, nombreArchivo('Cumpleanos', `${t.emp.nombres} ${t.emp.apellidos}`, 'png'))
}

function cerrarTarjeta() {
  if (tarjeta.value?.url) URL.revokeObjectURL(tarjeta.value.url)
  tarjeta.value = null
}

onUnmounted(cerrarTarjeta)

function colorAvatar(id) {
  const colors = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-cyan-500','bg-pink-500','bg-indigo-500']
  return colors[id % colors.length]
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">Cumpleaños</h2>
        <p class="text-sm text-slate-500 mt-0.5">Empleados activos por mes de cumpleaños.</p>
      </div>
      <div class="text-sm text-slate-500 font-medium">
        {{ store.empleados.length }} empleado{{ store.empleados.length !== 1 ? 's' : '' }} en {{ MESES[store.mesActivo - 1] }}
      </div>
    </div>

    <!-- Tabs de meses -->
    <div class="flex gap-1 flex-wrap bg-white rounded-xl border border-gray-200 p-1.5">
      <button
        v-for="(m, idx) in MESES_CORTO"
        :key="idx"
        @click="seleccionarMes(idx + 1)"
        class="flex-1 min-w-[3.5rem] py-1.5 px-2 rounded-lg text-xs font-medium transition-colors"
        :class="store.mesActivo === idx + 1
          ? 'bg-blue-600 text-white'
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'"
      >
        {{ m }}
      </button>
    </div>

    <!-- Loading skeleton -->
    <template v-if="store.loading">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="i in 6" :key="i" class="bg-white rounded-xl border border-gray-200 p-4 animate-pulse flex gap-3">
          <div class="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0"></div>
          <div class="flex-1 space-y-2 pt-1">
            <div class="h-3.5 bg-gray-200 rounded w-3/4"></div>
            <div class="h-3 bg-gray-100 rounded w-1/2"></div>
            <div class="h-3 bg-gray-100 rounded w-2/5"></div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>

      <!-- Hoy -->
      <template v-if="cumpleanosHoy.length > 0">
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <span class="text-lg">🎂</span>
            <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide">Hoy</h3>
            <span class="text-xs bg-rose-100 text-rose-700 font-semibold px-2 py-0.5 rounded-full">{{ cumpleanosHoy.length }}</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="emp in cumpleanosHoy"
              :key="emp.id"
              class="relative bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border border-rose-200 p-4 flex gap-3 overflow-hidden"
            >
              <!-- Confetti accent -->
              <div class="absolute top-0 right-0 text-4xl leading-none pr-2 pt-1">🎉</div>

              <div class="relative">
                <img v-if="emp.foto_url" :src="emp.foto_url" class="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                <div v-else :class="[colorAvatar(emp.id), 'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0']">
                  {{ iniciales(emp) }}
                </div>
                <span class="absolute -bottom-1 -right-1 text-base">🎂</span>
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-semibold text-slate-800 text-sm truncate">{{ emp.nombres }} {{ emp.apellidos }}</p>
                <p class="text-xs text-slate-500 truncate">{{ emp.departamento }}</p>
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="text-xs text-rose-700 font-medium">{{ formatFecha(emp.fecha_nacimiento) }}</span>
                  <span class="bg-rose-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">¡{{ emp.edad_cumple }} años hoy!</span>
                </div>
                <button
                  type="button"
                  @click="felicitar(emp)"
                  class="relative mt-2.5 inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <span aria-hidden="true">🎉</span> Felicitar
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Resto del mes -->
      <template v-if="cumpleanosResto.length > 0">
        <div class="space-y-3">
          <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide">
            {{ cumpleanosHoy.length > 0 ? 'Resto del mes' : MESES[store.mesActivo - 1] }}
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="emp in cumpleanosResto"
              :key="emp.id"
              class="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 hover:border-blue-200 hover:shadow-sm transition-all"
            >
              <img v-if="emp.foto_url" :src="emp.foto_url" class="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              <div v-else :class="[colorAvatar(emp.id), 'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0']">
                {{ iniciales(emp) }}
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-semibold text-slate-800 text-sm truncate">{{ emp.nombres }} {{ emp.apellidos }}</p>
                <p class="text-xs text-slate-500 truncate">{{ emp.departamento }}</p>
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="text-xs text-slate-600">{{ formatFecha(emp.fecha_nacimiento) }}</span>
                  <span class="bg-slate-100 text-slate-600 text-xs font-medium px-1.5 py-0.5 rounded-full">{{ emp.edad_cumple }} años</span>
                  <span v-if="emp.dias_para <= 7 && emp.dias_para > 0" class="bg-amber-100 text-amber-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                    en {{ emp.dias_para }} día{{ emp.dias_para !== 1 ? 's' : '' }}
                  </span>
                </div>
                <button
                  type="button"
                  @click="felicitar(emp)"
                  class="mt-2.5 inline-flex items-center gap-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <span aria-hidden="true">🎉</span> Felicitar
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-if="store.empleados.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="text-5xl mb-4">🎂</div>
        <p class="text-slate-500 font-medium">Sin cumpleaños en {{ MESES[store.mesActivo - 1] }}</p>
        <p class="text-slate-400 text-sm mt-1">No hay empleados activos con cumpleaños este mes.</p>
      </div>

    </template>
    <!-- Tarjeta de cumpleaños -->
    <div v-if="tarjeta" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="cerrarTarjeta">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] flex flex-col">
        <div class="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="text-base font-bold text-slate-800">Tarjeta de cumpleaños</h3>
            <p class="text-xs text-slate-500 truncate">{{ tarjeta.emp.nombres }} {{ tarjeta.emp.apellidos }}</p>
          </div>
          <button @click="cerrarTarjeta" class="text-slate-400 hover:text-slate-600 transition" aria-label="Cerrar">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-5 bg-slate-50">
          <LoadingSpinner v-if="tarjeta.generando" />
          <img v-else :src="tarjeta.url" alt="Tarjeta de cumpleaños" class="w-full rounded-lg shadow-sm border border-slate-200" />
        </div>

        <div class="px-5 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button @click="cerrarTarjeta" class="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
            Cerrar
          </button>
          <button
            @click="descargarTarjeta"
            :disabled="tarjeta.generando"
            class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
            </svg>
            Descargar imagen
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
