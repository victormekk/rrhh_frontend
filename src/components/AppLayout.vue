<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppToast from './AppToast.vue'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()

const PLANILLAS_PATHS = ['/planillas', '/aguinaldo']

const navItems = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  },
  {
    name: 'Empleados',
    path: '/empleados',
    icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  },
  {
    name: 'Estructura Org.',
    path: '/departamentos',
    icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  },
  {
    name: 'Bancos',
    path: '/bancos',
    icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
  },
  {
    name: 'Incidencias',
    path: '/incidencias',
    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
  {
    name: 'Vacaciones',
    path: '/vacaciones',
    icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z',
  },
  {
    name: 'Cumpleaños',
    path: '/cumpleanos',
    icon: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-1.5-.75M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5',
  },
  {
    name: 'Estadística Laboral',
    path: '/estadistica-laboral',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  },
  {
    name: 'Log del Sistema',
    path: '/log-sistema',
    icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z',
  },
  {
    name: 'Campos Variables',
    path: '/campos-variables',
    adminOnly: true,
    icon: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75',
  },
  {
    name: 'Usuarios',
    path: '/usuarios',
    adminOnly: true,
    icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  },
]

const planillasSubItems = [
  { name: 'Planillas Fijos',   path: '/planillas', query: { tipo: 'Fijos'  } },
  { name: 'Planillas Extras',  path: '/planillas', query: { tipo: 'Extras' } },
  { name: 'Aguinaldo Fijos',   path: '/aguinaldo', query: { tipo: 'Fijos'  } },
  { name: 'Aguinaldo Extras',  path: '/aguinaldo', query: { tipo: 'Extras' } },
]

const planillasOpen = ref(PLANILLAS_PATHS.some((p) => route.path.startsWith(p)))

watch(() => route.path, (p) => {
  if (PLANILLAS_PATHS.some((base) => p.startsWith(base))) planillasOpen.value = true
})

function isActive(path) {
  return route.path.startsWith(path)
}

function isSubActive(item) {
  return route.path === item.path && route.query.tipo === item.query.tipo
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

function currentDate() {
  return new Date().toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="flex h-screen bg-gray-50 overflow-hidden">

    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 flex flex-col fixed inset-y-0 left-0 z-50">

      <!-- Brand -->
      <div class="px-5 py-5 border-b border-slate-700/60 flex-shrink-0">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest">Hotel Palma Real</p>
        <p class="text-white font-bold text-base mt-0.5">Sistema RRHH</p>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">

        <!-- Ítems normales (antes de Planillas) -->
        <template v-for="item in navItems.slice(0, 4)" :key="item.path">
          <RouterLink
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
            :class="isActive(item.path) ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 flex-shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
            </svg>
            {{ item.name }}
          </RouterLink>
        </template>

        <!-- Grupo Planillas (expandible) -->
        <div>
          <button
            @click="planillasOpen = !planillasOpen"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
            :class="PLANILLAS_PATHS.some(p => route.path.startsWith(p))
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 flex-shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span class="flex-1 text-left">Planillas</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
              class="w-3.5 h-3.5 transition-transform duration-200"
              :class="planillasOpen ? 'rotate-180' : ''"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <!-- Sub-ítems -->
          <div v-show="planillasOpen" class="mt-0.5 ml-3 pl-3 border-l border-slate-700 space-y-0.5">
            <RouterLink
              v-for="sub in planillasSubItems"
              :key="sub.name"
              :to="{ path: sub.path, query: sub.query }"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150"
              :class="isSubActive(sub) ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'"
            >
              <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                :class="isSubActive(sub) ? 'bg-white' : 'bg-slate-600'"
              />
              {{ sub.name }}
            </RouterLink>
          </div>
        </div>

        <!-- Ítems normales (después de Planillas) -->
        <template v-for="item in navItems.slice(4)" :key="item.path">
          <RouterLink
            v-if="!item.adminOnly || authStore.isAdmin"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
            :class="isActive(item.path) ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 flex-shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
            </svg>
            {{ item.name }}
          </RouterLink>
        </template>

      </nav>

      <!-- User info + logout -->
      <div class="px-4 py-4 border-t border-slate-700/60 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {{ authStore.user?.name?.charAt(0)?.toUpperCase() ?? 'U' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm font-medium truncate">{{ authStore.user?.name ?? 'Usuario' }}</p>
            <p class="text-slate-400 text-xs truncate">{{ authStore.user?.email ?? '' }}</p>
          </div>
          <button
            @click="handleLogout"
            title="Cerrar sesión"
            class="text-slate-400 hover:text-red-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex-1 ml-64 flex flex-col min-h-screen overflow-hidden">

      <!-- Top header -->
      <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <h1 class="text-lg font-semibold text-slate-800">{{ route.meta.title ?? 'Sistema RRHH' }}</h1>
        <span class="text-sm text-slate-500 capitalize">{{ currentDate() }}</span>
      </header>

      <!-- Page -->
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
  <AppToast />
</template>
