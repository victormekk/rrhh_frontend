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
    path:  '/empleados',
    icon:  'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key:   'empleados_fijos',
    label: 'Empleados Fijos',
    value: null,
    color: 'indigo',
    path:  '/empleados',
    icon:  'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  },
  {
    key:   'empleados_extras',
    label: 'Empleados Extras',
    value: null,
    color: 'amber',
    path:  '/empleados',
    icon:  'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
  },
  {
    key:   'cumpleanos_mes',
    label: 'Cumpleaños del Mes',
    value: null,
    color: 'rose',
    path:  '/cumpleanos',
    icon:  'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-1.5-.75M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5',
  },
])

const colorMap = {
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    num: 'text-blue-700' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', num: 'text-emerald-700' },
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  num: 'text-indigo-700' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   num: 'text-amber-700' },
  rose:    { bg: 'bg-rose-50',    icon: 'text-rose-500',    num: 'text-rose-600' },
}

// ── Chart ────────────────────────────────────────────────────────────────────

const chartData   = ref([])
const chartLoaded = ref(false)
const hoveredIdx  = ref(null)

// SVG geometry
const VW = 900
const VH = 280
const PL = 80   // padding left  (Y-axis labels)
const PR = 20   // padding right
const PT = 16   // padding top
const PB = 48   // padding bottom (X-axis labels)

const innerW = VW - PL - PR
const innerH = VH - PT - PB
const N      = 12
const groupW = innerW / N
const barW   = groupW * 0.3

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

function barXF(i)  { return PL + i * groupW + groupW * 0.1 }
function barXE(i)  { return barXF(i) + barW + groupW * 0.03 }
function barHeight(val) { return Math.max((val / yMax.value) * innerH, 0) }

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
    chartData.value  = chart
    chartLoaded.value = true
  } catch {
    stats.value.forEach(s => { s.value = 0 })
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
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-7">
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
            <span v-if="stat.value === null" class="inline-block w-8 h-6 bg-gray-100 rounded animate-pulse" />
            <span v-else>{{ stat.value }}</span>
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
        <div class="flex items-center gap-4 text-xs text-slate-500">
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span> Fijos
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-sm bg-amber-400 inline-block"></span> Extras
          </span>
        </div>
      </div>

      <!-- Skeleton -->
      <div v-if="!chartLoaded" class="h-[260px] flex items-end gap-2 px-4 pb-6 animate-pulse">
        <div v-for="i in 12" :key="i" class="flex-1 flex gap-0.5 items-end">
          <div class="flex-1 bg-blue-100 rounded-t" :style="`height: ${30 + Math.random() * 130}px`"></div>
          <div class="flex-1 bg-amber-100 rounded-t" :style="`height: ${10 + Math.random() * 70}px`"></div>
        </div>
      </div>

      <svg
        v-else
        :viewBox="`0 0 ${VW} ${VH}`"
        class="w-full"
        style="height: 260px; overflow: visible;"
        @mouseleave="hoveredIdx = null"
      >
        <!-- Y-axis grid lines & labels -->
        <g v-for="tick in yTicks" :key="tick">
          <line
            :x1="PL" :y1="yPx(tick)"
            :x2="VW - PR" :y2="yPx(tick)"
            stroke="#f1f5f9" stroke-width="1"
          />
          <text
            :x="PL - 8" :y="yPx(tick) + 4"
            text-anchor="end"
            class="text-[10px]"
            style="font-size: 10px; fill: #94a3b8; font-family: inherit;"
          >{{ formatK(tick) }}</text>
        </g>

        <!-- Bars + hover zones -->
        <g
          v-for="(d, i) in chartData"
          :key="i"
          @mouseenter="hoveredIdx = i"
          style="cursor: default;"
        >
          <!-- Hover background zone -->
          <rect
            :x="PL + i * groupW" :y="PT"
            :width="groupW" :height="innerH + 1"
            :fill="hoveredIdx === i ? '#f8fafc' : 'transparent'"
            rx="4"
          />

          <!-- Fijos bar -->
          <rect
            :x="barXF(i)"
            :y="yPx(d.fijos)"
            :width="barW"
            :height="barHeight(d.fijos)"
            :fill="hoveredIdx === i ? '#3b82f6' : '#93c5fd'"
            rx="3" ry="3"
            style="transition: fill 0.15s;"
          />

          <!-- Extras bar -->
          <rect
            :x="barXE(i)"
            :y="yPx(d.extras)"
            :width="barW"
            :height="barHeight(d.extras)"
            :fill="hoveredIdx === i ? '#f59e0b' : '#fcd34d'"
            rx="3" ry="3"
            style="transition: fill 0.15s;"
          />

          <!-- X-axis label -->
          <text
            :x="PL + i * groupW + groupW / 2"
            :y="VH - PB + 16"
            text-anchor="middle"
            style="font-size: 9px; fill: #94a3b8; font-family: inherit;"
          >{{ d.label }}</text>
        </g>

        <!-- Tooltip -->
        <g v-if="hoveredIdx !== null" style="pointer-events: none;">
          <!-- Tooltip box -->
          <rect
            :x="tooltipX(hoveredIdx)"
            :y="tooltipY(hoveredIdx)"
            width="165" height="68"
            rx="6" fill="#1e293b"
            opacity="0.95"
          />
          <!-- Month label -->
          <text
            :x="tooltipX(hoveredIdx) + 10"
            :y="tooltipY(hoveredIdx) + 18"
            style="font-size: 11px; font-weight: 600; fill: white; font-family: inherit;"
          >{{ chartData[hoveredIdx].label }}</text>
          <!-- Fijos -->
          <circle
            :cx="tooltipX(hoveredIdx) + 10"
            :cy="tooltipY(hoveredIdx) + 34"
            r="4" fill="#60a5fa"
          />
          <text
            :x="tooltipX(hoveredIdx) + 20"
            :y="tooltipY(hoveredIdx) + 38"
            style="font-size: 10px; fill: #cbd5e1; font-family: inherit;"
          >Fijos: L. {{ formatLPS(chartData[hoveredIdx].fijos) }}</text>
          <!-- Extras -->
          <circle
            :cx="tooltipX(hoveredIdx) + 10"
            :cy="tooltipY(hoveredIdx) + 52"
            r="4" fill="#fbbf24"
          />
          <text
            :x="tooltipX(hoveredIdx) + 20"
            :y="tooltipY(hoveredIdx) + 56"
            style="font-size: 10px; fill: #cbd5e1; font-family: inherit;"
          >Extras: L. {{ formatLPS(chartData[hoveredIdx].extras) }}</text>
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
