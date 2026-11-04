<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const authStore = useAuthStore()

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

// ── Stats ────────────────────────────────────────────────────────────────────

// Orden: fila 1 Total, Fijos, Extras; fila 2 Activos, luego Género y Cumpleaños (se renderizan aparte).
const stats = ref([
  {
    key:   'empleados_total',
    label: 'Empleados Total',
    value: null,
    color: 'blue',
    path:  { path: '/empleados', query: { estado: 'todos' } },
    icon:  'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  },
  {
    key:   'empleados_fijos',
    label: 'Empleados Fijos',
    value: null,
    color: 'indigo',
    path:  { path: '/empleados', query: { tipo_contrato: 'Fijo', estado: 'Activo' } },
    icon:  'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  },
  {
    key:   'empleados_extras',
    label: 'Empleados Extras',
    value: null,
    color: 'amber',
    path:  { path: '/empleados', query: { tipo_contrato: 'Extra', estado: 'Activo' } },
    icon:  'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
  },
  {
    key:   'empleados_activos',
    label: 'Activos',
    value: null,
    color: 'emerald',
    path:  { path: '/empleados', query: { estado: 'Activo' } },
    icon:  'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
])

// Se renderiza aparte (al final, despues de la tarjeta de genero).
const cumpleanosStat = ref({
  key:   'cumpleanos_mes',
  label: 'Cumpleaños del Mes',
  value: null,
  color: 'rose',
  path:  '/cumpleanos',
  icon:  'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-1.5-.75M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5',
})

const colorMap = {
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    num: 'text-blue-700' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', num: 'text-emerald-700' },
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  num: 'text-indigo-700' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   num: 'text-amber-700' },
  rose:    { bg: 'bg-rose-50',    icon: 'text-rose-500',    num: 'text-rose-600' },
}

// Tarjeta especial: empleados activos (fijos + extras) por género, en una sola card.
const generoStats = ref({ masculinos: null, femeninos: null })

// ── Chart ────────────────────────────────────────────────────────────────────
// Chart.js redibuja la gráfica para el ancho real de la pantalla (en lugar de
// encoger un dibujo fijo), así las letras conservan su tamaño en celular.
// Paleta categorica validada (azul/naranja): ver skill de dataviz, ambos pasan
// separacion CVD y de vision normal en el par adyacente (light mode).
const COLOR_FIJOS  = '#2a78d6'
const COLOR_EXTRAS = '#eb6834'
const TINTA_TENUE  = '#898781'
const LINEA_GRILLA = '#e1e0d9'

const chartData   = ref([])
const chartLoaded = ref(false)
const canvasRef   = ref(null)
let grafica = null

function formatK(val) {
  if (val >= 1_000_000) return `L. ${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000)     return `L. ${(val / 1_000).toFixed(0)}k`
  return `L. ${val}`
}

function formatLPS(val) {
  return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2 }).format(val)
}

// Barras: 4px redondeadas arriba y rectas contra la línea base.
const barra = (label, color, campo) => ({
  label,
  data: chartData.value.map(d => d[campo]),
  backgroundColor: color,
  hoverBackgroundColor: color,
  borderRadius: { topLeft: 4, topRight: 4 },
  borderSkipped: 'start',
  maxBarThickness: 24,
  barPercentage: 0.9,
  categoryPercentage: 0.6,
})

function dibujarGrafica() {
  if (!canvasRef.value) return
  grafica?.destroy()
  grafica = new Chart(canvasRef.value, {
    type: 'bar',
    data: {
      labels: chartData.value.map(d => d.label),
      datasets: [barra('Fijos', COLOR_FIJOS, 'fijos'), barra('Extras', COLOR_EXTRAS, 'extras')],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // Al pasar el mouse (o tocar en celular) por un mes se ven sus dos montos.
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false }, // la leyenda va en el encabezado de la tarjeta
        tooltip: {
          backgroundColor: 'rgba(11, 11, 11, 0.92)',
          padding: 10,
          cornerRadius: 6,
          boxWidth: 10,
          boxHeight: 3,
          titleFont: { size: 12, weight: '600' },
          bodyFont: { size: 12 },
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: L. ${formatLPS(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: LINEA_GRILLA },
          ticks: { color: TINTA_TENUE, font: { size: 11 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 8 },
        },
        y: {
          beginAtZero: true,
          grid: { color: LINEA_GRILLA },
          border: { display: false },
          ticks: { color: TINTA_TENUE, font: { size: 11 }, maxTicksLimit: 6, callback: (v) => formatK(v) },
        },
      },
    },
  })
}

onBeforeUnmount(() => grafica?.destroy())

// ── Quick links ──────────────────────────────────────────────────────────────

// Solo atajos a pantallas que en el menú están dentro de un submenú o requieren
// varios clics; los menús principales (y lo que ya tiene card arriba) no se repiten.
const todosLosAccesos = [
  { name: 'Nuevo Empleado',        path: '/empleados/crear',     color: 'bg-blue-600',    permiso: 'empleados.crear' },
  { name: 'Ver Planillas',         path: '/planillas',           color: 'bg-emerald-600', permiso: 'planillas.ver' },
  { name: 'Ver Planilla Especial', path: '/aguinaldo',           color: 'bg-purple-600',  permiso: 'aguinaldo.ver' },
  { name: 'Estadística Laboral',   path: '/estadistica-laboral', color: 'bg-indigo-600',  permiso: 'estadistica.ver' },
  { name: 'Generar Constancia',    path: '/constancias',         color: 'bg-amber-600',   permiso: ['constancias.laboral', 'constancias.bancaria', 'constancias.voucher'] },
]
// Solo los atajos a pantallas que el rol del usuario puede abrir.
const quickLinks = todosLosAccesos.filter((l) => authStore.puede(l.permiso))
// El gráfico muestra montos pagados: requiere su permiso.
const verGrafica = authStore.puede('dashboard.ver_montos')

// ── Control de jubilaciones (60 y 65 años) ──────────────────────────────────
// Empleados activos desde los 59 años. Si no hay ninguno, la lista no se muestra.
const jubilaciones = ref([])
const MESES_LARGO  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

async function cargarJubilaciones() {
  if (!authStore.puede('dashboard.ver_jubilaciones')) return
  try {
    const { data } = await api.get('/dashboard/jubilaciones')
    jubilaciones.value = data
  } catch {
    jubilaciones.value = []
  }
}

function fechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} de ${MESES_LARGO[m - 1]} de ${y}`
}

function enTiempo(dias) {
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  if (dias < 60) return `en ${dias} días`
  const meses = Math.round(dias / 30.4)
  return meses < 12 ? `en ${meses} meses` : `en ${(dias / 365.25).toFixed(1).replace('.0', '')} años`
}

function etapa(emp) {
  if (emp.proximo === 60) return { texto: `Cumple 60 ${enTiempo(emp.dias_proximo)}`, clase: 'bg-amber-100 text-amber-800' }
  if (emp.proximo === 65) return { texto: `Cumple 65 ${enTiempo(emp.dias_proximo)}`, clase: 'bg-orange-100 text-orange-800' }
  return { texto: 'Ya tiene 65 o más', clase: 'bg-red-100 text-red-700' }
}

// ── Init ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  cargarJubilaciones()
  try {
    const [{ data: statsData }, { data: chart }] = await Promise.all([
      api.get('/dashboard/stats'),
      verGrafica ? api.get('/dashboard/planillas-chart') : Promise.resolve({ data: [] }),
    ])
    stats.value.forEach(s => { s.value = statsData[s.key] ?? 0 })
    cumpleanosStat.value.value = statsData.cumpleanos_mes ?? 0
    generoStats.value = {
      masculinos: statsData.empleados_masculinos ?? 0,
      femeninos:  statsData.empleados_femeninos ?? 0,
    }
    chartData.value  = chart
    chartLoaded.value = true
    if (verGrafica) {
      await nextTick()
      dibujarGrafica()
    }
  } catch {
    stats.value.forEach(s => { s.value = 0 })
    cumpleanosStat.value.value = 0
    generoStats.value = { masculinos: 0, femeninos: 0 }
    chartLoaded.value = true
  }
})
</script>

<template>
  <div>
    <!-- Welcome -->
    <div class="mb-7">
      <h2 class="text-2xl font-bold text-slate-800">
        Bienvenido, {{ authStore.user?.name ?? 'Usuario' }}
      </h2>
      <p class="text-slate-500 text-sm mt-1">Resumen del estado actual del sistema.</p>
    </div>

    <!-- Stats cards: en una sola fila solo en pantallas muy anchas; en laptops,
         6 columnas dejan cada tarjeta demasiado angosta y los números se enciman. -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1800px]:grid-cols-6 gap-4 mb-7">
      <RouterLink
        v-for="stat in stats"
        :key="stat.key"
        :to="stat.path"
        class="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md hover:border-gray-300 transition-all duration-150 group"
      >
        <div :class="[colorMap[stat.color].bg, 'p-3 rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-150']">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
            :class="[colorMap[stat.color].icon, 'w-6 h-6']">
            <path stroke-linecap="round" stroke-linejoin="round" :d="stat.icon" />
          </svg>
        </div>
        <div>
          <p class="text-xs text-slate-500 font-medium leading-tight">{{ stat.label }}</p>
          <p :class="[colorMap[stat.color].num, 'text-2xl font-bold mt-0.5']">
            <span v-if="stat.value === null" class="inline-block w-8 h-6 bg-slate-200 rounded animate-pulse" />
            <span v-else>{{ stat.value }}</span>
          </p>
        </div>
      </RouterLink>

      <!-- Tarjeta especial: género (masculino / femenino) de empleados activos -->
      <div class="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
        <!-- Un solo ícono (dos personas: celeste y rosado) para que ocupe lo mismo que las demás -->
        <div class="bg-gradient-to-br from-sky-50 to-pink-50 p-3 rounded-xl flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path class="text-sky-600" stroke-linecap="round" stroke-linejoin="round" d="M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM2.25 19.125v-.109a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766z" />
            <path class="text-pink-600" stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0zM15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-6.24-3.548" />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs text-slate-500 font-medium leading-tight">Empleados por Género</p>
          <p class="mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
            <span v-if="generoStats.masculinos === null" class="inline-block w-16 h-6 bg-slate-200 rounded animate-pulse" />
            <template v-else>
              <span class="text-2xl font-bold text-sky-600">{{ generoStats.masculinos }}</span>
              <span class="text-slate-300 text-xl font-light">/</span>
              <span class="text-2xl font-bold text-pink-600">{{ generoStats.femeninos }}</span>
            </template>
          </p>
        </div>
      </div>

      <!-- Cumpleaños del mes: va al final -->
      <RouterLink
        :to="cumpleanosStat.path"
        class="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md hover:border-gray-300 transition-all duration-150 group"
      >
        <div :class="[colorMap[cumpleanosStat.color].bg, 'p-3 rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-150']">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
            :class="[colorMap[cumpleanosStat.color].icon, 'w-6 h-6']">
            <path stroke-linecap="round" stroke-linejoin="round" :d="cumpleanosStat.icon" />
          </svg>
        </div>
        <div>
          <p class="text-xs text-slate-500 font-medium leading-tight">{{ cumpleanosStat.label }}</p>
          <p :class="[colorMap[cumpleanosStat.color].num, 'text-2xl font-bold mt-0.5']">
            <span v-if="cumpleanosStat.value === null" class="inline-block w-8 h-6 bg-slate-200 rounded animate-pulse" />
            <span v-else>{{ cumpleanosStat.value }}</span>
          </p>
        </div>
      </RouterLink>
    </div>

    <!-- Bar chart -->
    <div v-if="verGrafica" class="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-7">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 class="font-semibold text-slate-800 text-sm">Costo de Planillas por Mes</h3>
          <p class="text-xs text-slate-400 mt-0.5">Últimos 12 meses — salario neto total</p>
        </div>
        <div class="flex items-center gap-5 text-sm font-medium text-slate-600">
          <span class="flex items-center gap-2">
            <span class="w-3.5 h-3.5 rounded-sm inline-block" style="background:#2a78d6"></span> Fijos
          </span>
          <span class="flex items-center gap-2">
            <span class="w-3.5 h-3.5 rounded-sm inline-block" style="background:#eb6834"></span> Extras
          </span>
        </div>
      </div>

      <!-- Skeleton -->
      <div v-if="!chartLoaded" class="h-[180px] flex items-end gap-2 px-4 pb-6 animate-pulse">
        <div v-for="i in 12" :key="i" class="flex-1 flex gap-0.5 items-end">
          <div class="flex-1 bg-blue-100 rounded-t" :style="`height: ${30 + Math.random() * 130}px`"></div>
          <div class="flex-1 bg-amber-100 rounded-t" :style="`height: ${10 + Math.random() * 70}px`"></div>
        </div>
      </div>

      <div v-else class="relative h-56 sm:h-64">
        <canvas ref="canvasRef" role="img"
          :aria-label="`Costo de planillas por mes, Fijos y Extras: ${chartData.map(d => `${d.label} Fijos L. ${formatLPS(d.fijos)}, Extras L. ${formatLPS(d.extras)}`).join('; ')}`">
        </canvas>
      </div>
    </div>

    <!-- Próximos a jubilarse: desde los 59 años (la jubilación es a los 60 y 65) -->
    <div v-if="jubilaciones.length" class="bg-white rounded-xl border border-gray-200 mb-7 overflow-hidden">
      <div class="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="font-semibold text-slate-800 text-sm">Próximos a jubilarse</h3>
          <p class="text-xs text-slate-400 mt-0.5">Empleados activos desde los 59 años · jubilación a los 60 y 65 años</p>
        </div>
        <span class="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          {{ jubilaciones.length }} empleado{{ jubilaciones.length !== 1 ? 's' : '' }}
        </span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th class="px-4 sm:px-6 py-2.5 font-semibold">Empleado</th>
              <th class="px-4 py-2.5 font-semibold text-center">Edad</th>
              <th class="px-4 py-2.5 font-semibold">Cumple 60</th>
              <th class="px-4 py-2.5 font-semibold">Cumple 65</th>
              <th class="px-4 sm:px-6 py-2.5 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in jubilaciones" :key="emp.id" class="border-t border-slate-100">
              <td class="px-4 sm:px-6 py-3">
                <RouterLink v-if="authStore.puede('empleados.ver')" :to="`/empleados/${emp.id}`" class="font-medium text-slate-800 hover:text-blue-700 hover:underline">{{ emp.nombre }}</RouterLink>
                <p v-else class="font-medium text-slate-800">{{ emp.nombre }}</p>
                <p class="text-xs text-slate-400">{{ emp.departamento }} · {{ emp.cargo }}</p>
              </td>
              <td class="px-4 py-3 text-center font-semibold text-slate-700">{{ emp.edad }}</td>
              <td class="px-4 py-3 whitespace-nowrap" :class="emp.proximo === 60 ? 'text-slate-800 font-medium' : 'text-slate-400'">{{ fechaLarga(emp.fecha_60) }}</td>
              <td class="px-4 py-3 whitespace-nowrap" :class="emp.proximo === 65 ? 'text-slate-800 font-medium' : 'text-slate-400'">{{ fechaLarga(emp.fecha_65) }}</td>
              <td class="px-4 sm:px-6 py-3 whitespace-nowrap">
                <span :class="[etapa(emp).clase, 'text-xs font-semibold px-2.5 py-1 rounded-full']">{{ etapa(emp).texto }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Accesos rápidos -->
    <div v-if="quickLinks.length" class="bg-white rounded-xl border border-gray-200 p-6">
      <h3 class="font-semibold text-slate-700 mb-4 text-sm">Accesos Rápidos</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <RouterLink
          v-for="link in quickLinks"
          :key="link.path"
          :to="link.path"
          :class="[link.color, 'text-white text-xs font-medium rounded-lg px-3 py-2.5 text-center hover:opacity-90 transition-opacity']"
        >
          {{ link.name }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>
