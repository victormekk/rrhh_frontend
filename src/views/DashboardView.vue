<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const authStore = useAuthStore()

// ── Stats ────────────────────────────────────────────────────────────────────

const stats = ref([
  {
    key:   'empleados_total',
    label: 'Empleados Total',
    value: null,
    color: 'blue',
    path:  '/empleados',
    icon:  'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  },
  {
    key:   'empleados_activos',
    label: 'Activos',
    value: null,
    color: 'emerald',
    path:  { path: '/empleados', query: { estado: 'Activo' } },
    icon:  'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key:   'empleados_fijos',
    label: 'Empleados Fijos',
    value: null,
    color: 'indigo',
    path:  { path: '/empleados', query: { tipo_contrato: 'Fijo' } },
    icon:  'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  },
  {
    key:   'empleados_extras',
    label: 'Empleados Extras',
    value: null,
    color: 'amber',
    path:  { path: '/empleados', query: { tipo_contrato: 'Extra' } },
    icon:  'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
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
// Paleta categorica validada (azul/naranja): ver skill de dataviz, ambos pasan
// separacion CVD y de vision normal en el par adyacente (light mode).
const COLOR_FIJOS  = '#2a78d6'
const COLOR_EXTRAS = '#eb6834'

const chartData   = ref([])
const chartLoaded = ref(false)
const hoveredIdx  = ref(null)

// SVG geometry
const VW = 900
const VH = 160
const PL = 72   // padding left  (Y-axis labels)
const PR = 16   // padding right
const PT = 16   // padding top
const PB = 48   // padding bottom (X-axis labels)

const innerW = VW - PL - PR
const innerH = VH - PT - PB
const N      = 12
const groupW = innerW / N
const barW   = Math.min(24, groupW * 0.34)
const barGap = 3 // separador entre las dos barras de un mismo grupo

function niceMax(v) {
  if (v <= 0) return 100000
  const mag  = Math.pow(10, Math.floor(Math.log10(v)))
  const norm = v / mag
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return nice * mag
}

const yMax = computed(() => niceMax(
  Math.max(...chartData.value.flatMap(d => [d.fijos, d.extras]), 1)
))

const yTicks = computed(() => {
  const max  = yMax.value
  const step = max / 5
  return [0, 1, 2, 3, 4, 5].map(i => Math.round(i * step))
})

function yPx(val) {
  return PT + innerH - (val / yMax.value) * innerH
}

function barXF(i)  { return PL + i * groupW + (groupW - (barW * 2 + barGap)) / 2 }
function barXE(i)  { return barXF(i) + barW + barGap }
function barHeight(val) { return Math.max((val / yMax.value) * innerH, 0) }

// Barra con esquinas redondeadas solo arriba (recta contra la linea base) —
// nunca "pill" completo, que agregaria peso visual que no es dato.
function barPath(x, y, w, h) {
  const r = Math.min(4, h, w / 2)
  if (h <= 0) return ''
  if (r <= 0) return `M${x},${y} h${w} v${h} h${-w} Z`
  return `M${x},${y + r}
    Q${x},${y} ${x + r},${y}
    L${x + w - r},${y}
    Q${x + w},${y} ${x + w},${y + r}
    L${x + w},${y + h}
    L${x},${y + h} Z`
}

function formatK(val) {
  if (val >= 1_000_000) return `L. ${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000)     return `L. ${(val / 1_000).toFixed(0)}k`
  return `L. ${val}`
}

function formatLPS(val) {
  return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2 }).format(val)
}

function tooltipX(i) {
  const cx = PL + i * groupW + groupW / 2
  const tw = 165
  return Math.min(Math.max(cx - tw / 2, PL), VW - PR - tw)
}

function tooltipY(i) {
  const d   = chartData.value[i]
  const top = yPx(Math.max(d.fijos, d.extras)) - 78
  return Math.max(top, PT)
}

// ── Quick links ──────────────────────────────────────────────────────────────

const quickLinks = [
  { name: 'Nuevo Empleado',  path: '/empleados/crear',  color: 'bg-blue-600' },
  { name: 'Nueva Planilla',  path: '/planillas/crear',  color: 'bg-emerald-600' },
  { name: 'Registrar Inc.',  path: '/incidencias',      color: 'bg-amber-600' },
  { name: 'Ver Aguinaldo',   path: '/aguinaldo',         color: 'bg-purple-600' },
  { name: 'Vacaciones',      path: '/vacaciones',        color: 'bg-cyan-600' },
  { name: 'Cumpleaños',      path: '/cumpleanos',        color: 'bg-rose-500' },
]

// ── Init ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    const [{ data: statsData }, { data: chart }] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/planillas-chart'),
    ])
    stats.value.forEach(s => { s.value = statsData[s.key] ?? 0 })
    cumpleanosStat.value.value = statsData.cumpleanos_mes ?? 0
    generoStats.value = {
      masculinos: statsData.empleados_masculinos ?? 0,
      femeninos:  statsData.empleados_femeninos ?? 0,
    }
    chartData.value  = chart
    chartLoaded.value = true
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

    <!-- Stats cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-7">
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
        <div class="flex -space-x-2 flex-shrink-0">
          <div class="bg-sky-50 p-3 rounded-xl border-2 border-white z-10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="text-sky-600 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div class="bg-pink-50 p-3 rounded-xl border-2 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="text-pink-600 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        </div>
        <div>
          <p class="text-xs text-slate-500 font-medium leading-tight">Empleados por Género</p>
          <p class="mt-0.5 flex items-center gap-2.5">
            <span v-if="generoStats.masculinos === null" class="inline-block w-16 h-6 bg-slate-200 rounded animate-pulse" />
            <template v-else>
              <span class="text-2xl font-bold text-sky-600">{{ generoStats.masculinos }}</span>
              <span class="text-slate-300 text-lg font-light">/</span>
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
    <div class="bg-white rounded-xl border border-gray-200 p-6 mb-7">
      <div class="flex items-center justify-between mb-5">
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

      <svg
        v-else
        :viewBox="`0 0 ${VW} ${VH}`"
        class="w-full"
        style="overflow: visible;"
        @mouseleave="hoveredIdx = null"
      >
        <!-- Y-axis grid lines & labels -->
        <g v-for="tick in yTicks" :key="tick">
          <line
            :x1="PL" :y1="yPx(tick)"
            :x2="VW - PR" :y2="yPx(tick)"
            stroke="#e1e0d9" stroke-width="1"
          />
          <text
            :x="PL - 8" :y="yPx(tick) + 4"
            text-anchor="end"
            style="font-size: 10px; fill: #898781; font-family: inherit;"
          >{{ formatK(tick) }}</text>
        </g>

        <!-- Bars + hover zones -->
        <g
          v-for="(d, i) in chartData"
          :key="i"
          @mouseenter="hoveredIdx = i"
          @focus="hoveredIdx = i"
          tabindex="0"
          style="cursor: default; outline: none;"
        >
          <!-- Hover background zone (hit target wider than the bars themselves) -->
          <rect
            :x="PL + i * groupW" :y="PT"
            :width="groupW" :height="innerH + 1"
            :fill="hoveredIdx === i ? '#f4f3f0' : 'transparent'"
            rx="4"
          />

          <!-- Fijos bar: 4px rounded top, square baseline -->
          <path :d="barPath(barXF(i), yPx(d.fijos), barW, barHeight(d.fijos))" :fill="COLOR_FIJOS" />

          <!-- Extras bar -->
          <path :d="barPath(barXE(i), yPx(d.extras), barW, barHeight(d.extras))" :fill="COLOR_EXTRAS" />

          <!-- X-axis label -->
          <text
            :x="PL + i * groupW + groupW / 2"
            :y="VH - PB + 16"
            text-anchor="middle"
            style="font-size: 9px; fill: #898781; font-family: inherit;"
          >{{ d.label }}</text>
        </g>

        <!-- Tooltip: value leads (bold), series name follows (muted) -->
        <g v-if="hoveredIdx !== null" style="pointer-events: none;">
          <rect
            :x="tooltipX(hoveredIdx)"
            :y="tooltipY(hoveredIdx)"
            width="172" height="68"
            rx="6" fill="#0b0b0b"
            opacity="0.92"
          />
          <text
            :x="tooltipX(hoveredIdx) + 10"
            :y="tooltipY(hoveredIdx) + 18"
            style="font-size: 11px; font-weight: 600; fill: white; font-family: inherit;"
          >{{ chartData[hoveredIdx].label }}</text>

          <!-- Fijos: linea-clave + valor (fuerte) + etiqueta (tenue) -->
          <rect :x="tooltipX(hoveredIdx) + 10" :y="tooltipY(hoveredIdx) + 30" width="10" height="3" rx="1.5" :fill="COLOR_FIJOS" />
          <text
            :x="tooltipX(hoveredIdx) + 26"
            :y="tooltipY(hoveredIdx) + 38"
            style="font-size: 10.5px; font-weight: 700; fill: white; font-family: inherit;"
          >L. {{ formatLPS(chartData[hoveredIdx].fijos) }}</text>
          <text
            :x="tooltipX(hoveredIdx) + 162"
            :y="tooltipY(hoveredIdx) + 38"
            text-anchor="end"
            style="font-size: 9px; fill: #c3c2b7; font-family: inherit;"
          >Fijos</text>

          <!-- Extras -->
          <rect :x="tooltipX(hoveredIdx) + 10" :y="tooltipY(hoveredIdx) + 48" width="10" height="3" rx="1.5" :fill="COLOR_EXTRAS" />
          <text
            :x="tooltipX(hoveredIdx) + 26"
            :y="tooltipY(hoveredIdx) + 56"
            style="font-size: 10.5px; font-weight: 700; fill: white; font-family: inherit;"
          >L. {{ formatLPS(chartData[hoveredIdx].extras) }}</text>
          <text
            :x="tooltipX(hoveredIdx) + 162"
            :y="tooltipY(hoveredIdx) + 56"
            text-anchor="end"
            style="font-size: 9px; fill: #c3c2b7; font-family: inherit;"
          >Extras</text>
        </g>

        <!-- Y-axis line -->
        <line :x1="PL" :y1="PT" :x2="PL" :y2="PT + innerH + 1" stroke="#e2e8f0" stroke-width="1" />
      </svg>
    </div>

    <!-- Quick links -->
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <h3 class="font-semibold text-slate-700 mb-4 text-sm">Accesos Rápidos</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
