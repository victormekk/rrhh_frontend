<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const authStore = useAuthStore()

const stats = ref([
  {
    label: 'Empleados Activos',
    value: null,
    color: 'blue',
    icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  },
  {
    label: 'Departamentos',
    value: null,
    color: 'indigo',
    icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  },
  {
    label: 'Incidencias del Mes',
    value: null,
    color: 'amber',
    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
  {
    label: 'Planillas Activas',
    value: null,
    color: 'emerald',
    icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  },
])

const colorMap = {
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    num: 'text-blue-700' },
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  num: 'text-indigo-700' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   num: 'text-amber-700' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', num: 'text-emerald-700' },
}

const quickLinks = [
  { name: 'Nuevo Empleado',   path: '/empleados/crear',     color: 'bg-blue-600' },
  { name: 'Nueva Planilla',   path: '/planillas/crear',     color: 'bg-emerald-600' },
  { name: 'Registrar Inc.',   path: '/incidencias/crear',   color: 'bg-amber-600' },
  { name: 'Ver Aguinaldo',    path: '/aguinaldo',           color: 'bg-purple-600' },
  { name: 'Vacaciones',       path: '/vacaciones',          color: 'bg-cyan-600' },
  { name: 'Log del Sistema',  path: '/log-sistema',         color: 'bg-slate-600' },
]

onMounted(async () => {
  try {
    const { data } = await api.get('/dashboard/stats')
    stats.value[0].value = data.empleados
    stats.value[1].value = data.departamentos
    stats.value[2].value = data.incidencias
    stats.value[3].value = data.planillas
  } catch {
    stats.value.forEach((s) => (s.value = 0))
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

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
      >
        <div :class="[colorMap[stat.color].bg, 'p-3 rounded-xl flex-shrink-0']">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            :class="[colorMap[stat.color].icon, 'w-6 h-6']"
          >
            <path stroke-linecap="round" stroke-linejoin="round" :d="stat.icon" />
          </svg>
        </div>
        <div>
          <p class="text-xs text-slate-500 font-medium">{{ stat.label }}</p>
          <p :class="[colorMap[stat.color].num, 'text-2xl font-bold mt-0.5']">
            <span v-if="stat.value === null" class="inline-block w-8 h-6 bg-gray-100 rounded animate-pulse" />
            <span v-else>{{ stat.value }}</span>
          </p>
        </div>
      </div>
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
