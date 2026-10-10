<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppToast from './AppToast.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import logo from '../assets/images/hpr_logo.png'
import mariposa from '../assets/images/MariposaPNG (2021_01_15 15_14_58 UTC).png'

const route     = useRoute()
const router    = useRouter()

// ── Menú en celular/tablet (< lg): el sidebar se oculta y se abre con el botón ☰ ──
const menuMovil = ref(false)

watch(() => route.fullPath, () => { menuMovil.value = false })

function cerrarConEscape(e) {
  if (e.key === 'Escape') menuMovil.value = false
}
window.addEventListener('keydown', cerrarConEscape)
onUnmounted(() => window.removeEventListener('keydown', cerrarConEscape))
const authStore = useAuthStore()

// Mientras se descarga la vista de la siguiente ruta, el área principal queda
// vacía; mostramos la rueda de carga. Se espera un poco antes de mostrarla para
// que no parpadee en navegaciones instantáneas.
const navegando = ref(false)
let navTimer = null
function finNavegacion() {
  clearTimeout(navTimer)
  navegando.value = false
}
const quitarBefore = router.beforeEach(() => {
  clearTimeout(navTimer)
  navTimer = setTimeout(() => { navegando.value = true }, 150)
})
const quitarAfter = router.afterEach(finNavegacion)
const quitarError = router.onError(finNavegacion)
onUnmounted(() => {
  finNavegacion()
  quitarBefore()
  quitarAfter()
  quitarError()
})

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
    name: 'Constancias',
    path: '/constancias',
    icon: 'M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z',
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
]

const planillasSubItems = [
  // Fijos/Extras (y Aguinaldo/Catorceavo) se eligen al crear y se filtran dentro de cada lista.
  { name: 'Planillas de Pago',    path: '/planillas' },
  { name: 'Planillas Especiales', path: '/aguinaldo' },
]

// Configuración: solo administradores (el router y el backend también lo restringen).
const CONFIG_PATHS = ['/usuarios', '/campos-variables', '/log-sistema']

const configSubItems = [
  { name: 'Usuarios',         path: '/usuarios' },
  { name: 'Campos Variables', path: '/campos-variables' },
  { name: 'Log del Sistema',  path: '/log-sistema' },
]

const ESTADISTICA_PATHS = ['/estadistica-laboral', '/informacion-laboral', '/movimientos-personal']

const estadisticaSubItems = [
  { name: 'Estadística Laboral', path: '/estadistica-laboral' },
  { name: 'Información Laboral', path: '/informacion-laboral' },
  { name: 'Movimientos de Personal', path: '/movimientos-personal' },
]

// Menús desplegables como acordeón: solo uno abierto a la vez.
const SUBMENUS = {
  planillas:   PLANILLAS_PATHS,
  estadistica: ESTADISTICA_PATHS,
  config:      CONFIG_PATHS,
}

function submenuDeRuta(path) {
  return Object.keys(SUBMENUS).find((k) => SUBMENUS[k].some((base) => path.startsWith(base))) ?? null
}

const submenuAbierto = ref(submenuDeRuta(route.path))

// Al entrar a una pantalla de un submenú, ese queda abierto (y se cierra el otro).
watch(() => route.path, (p) => {
  const actual = submenuDeRuta(p)
  if (actual) submenuAbierto.value = actual
})

function toggleSubmenu(nombre) {
  submenuAbierto.value = submenuAbierto.value === nombre ? null : nombre
}

function isActive(path) {
  return route.path.startsWith(path)
}

function isSubActive(item) {
  if (route.path !== item.path) return false
  if (!item.query) return true
  return Object.entries(item.query).every(([k, v]) => route.query[k] === v)
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

// Formato: "Sábado 10 de Octubre de 2026"
function currentDate() {
  const hoy = new Date()
  const mayuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const dia = mayuscula(hoy.toLocaleDateString('es-HN', { weekday: 'long' }))
  const mes = mayuscula(hoy.toLocaleDateString('es-HN', { month: 'long' }))
  return `${dia} ${hoy.getDate()} de ${mes} de ${hoy.getFullYear()}`
}
</script>

<template>
  <div class="flex h-screen bg-gray-50 overflow-hidden">

    <!-- Fondo oscuro detrás del menú abierto (solo celular/tablet) -->
    <Transition
      enter-active-class="transition-opacity duration-300" enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-300" leave-to-class="opacity-0"
    >
      <div v-if="menuMovil" class="fixed inset-0 z-40 bg-black/50 lg:hidden" @click="menuMovil = false" aria-hidden="true" />
    </Transition>

    <!-- Sidebar: fijo en pantallas grandes; en celular/tablet entra deslizándose -->
    <aside
      class="w-64 bg-stone-900 flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0"
      :class="menuMovil ? 'translate-x-0 shadow-2xl' : '-translate-x-full'"
    >

      <!-- Brand -->
      <div class="px-4 py-4 bg-stone-900 border-b border-stone-700/60 flex-shrink-0 flex items-center gap-3">
        <img :src="mariposa" alt="Palma Real Hotel y Villas" class="h-10 w-auto flex-shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="text-white font-bold text-sm leading-tight truncate">Hotel Palma Real</p>
          <p class="text-amber-400 text-[10px] font-semibold uppercase tracking-widest">Sistema RRHH</p>
        </div>
        <button @click="menuMovil = false" class="lg:hidden p-1.5 -mr-1 text-stone-400 hover:text-white rounded-lg transition" aria-label="Cerrar menú">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">

        <!-- Ítems normales (antes de Planillas) -->
        <template v-for="item in navItems.slice(0, 4)" :key="item.path">
          <RouterLink
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
            :class="isActive(item.path) ? 'bg-blue-600 text-white' : 'text-stone-400 hover:text-white hover:bg-stone-800'"
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
            @click="toggleSubmenu('planillas')"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
            :class="PLANILLAS_PATHS.some(p => route.path.startsWith(p))
              ? 'bg-blue-700 text-white'
              : 'text-stone-400 hover:text-white hover:bg-stone-800'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 flex-shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span class="flex-1 text-left">Planillas</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
              class="w-3.5 h-3.5 transition-transform duration-300 ease-in-out"
              :class="submenuAbierto === 'planillas' ? 'rotate-180' : ''"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <!-- Sub-ítems -->
          <!-- Despliegue suave: anima la altura de 0 a su tamaño real (grid 0fr -> 1fr) -->
          <div
            class="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
            :class="submenuAbierto === 'planillas' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
            :inert="submenuAbierto !== 'planillas'"
          >
            <div class="min-h-0 overflow-hidden">
              <div class="mt-0.5 ml-3 pl-3 border-l border-stone-700 space-y-0.5">
                <RouterLink
                  v-for="sub in planillasSubItems"
                  :key="sub.name"
                  :to="{ path: sub.path, query: sub.query }"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150"
                  :class="isSubActive(sub) ? 'bg-blue-600 text-white' : 'text-stone-400 hover:text-white hover:bg-stone-800'"
                >
                  <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    :class="isSubActive(sub) ? 'bg-white' : 'bg-stone-600'"
                  />
                  {{ sub.name }}
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Ítems normales (entre Planillas y Estadística Laboral) -->
        <template v-for="item in navItems.slice(4, 8)" :key="item.path">
          <RouterLink
            v-if="!item.adminOnly || authStore.isAdmin"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
            :class="isActive(item.path) ? 'bg-blue-600 text-white' : 'text-stone-400 hover:text-white hover:bg-stone-800'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 flex-shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
            </svg>
            {{ item.name }}
          </RouterLink>
        </template>

        <!-- Grupo Estadística Laboral (expandible) -->
        <div>
          <button
            @click="toggleSubmenu('estadistica')"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
            :class="ESTADISTICA_PATHS.some(p => route.path.startsWith(p))
              ? 'bg-blue-700 text-white'
              : 'text-stone-400 hover:text-white hover:bg-stone-800'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 flex-shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span class="flex-1 text-left">Estadística Laboral</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
              class="w-3.5 h-3.5 transition-transform duration-300 ease-in-out"
              :class="submenuAbierto === 'estadistica' ? 'rotate-180' : ''"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <!-- Sub-ítems -->
          <!-- Despliegue suave: anima la altura de 0 a su tamaño real (grid 0fr -> 1fr) -->
          <div
            class="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
            :class="submenuAbierto === 'estadistica' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
            :inert="submenuAbierto !== 'estadistica'"
          >
            <div class="min-h-0 overflow-hidden">
              <div class="mt-0.5 ml-3 pl-3 border-l border-stone-700 space-y-0.5">
                <RouterLink
                  v-for="sub in estadisticaSubItems"
                  :key="sub.name"
                  :to="sub.path"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150"
                  :class="isSubActive(sub) ? 'bg-blue-600 text-white' : 'text-stone-400 hover:text-white hover:bg-stone-800'"
                >
                  <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    :class="isSubActive(sub) ? 'bg-white' : 'bg-stone-600'"
                  />
                  {{ sub.name }}
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Grupo Configuración (expandible, solo administradores) -->
        <div v-if="authStore.isAdmin">
          <button
            @click="toggleSubmenu('config')"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
            :class="CONFIG_PATHS.some(p => route.path.startsWith(p))
              ? 'bg-blue-700 text-white'
              : 'text-stone-400 hover:text-white hover:bg-stone-800'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 flex-shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="flex-1 text-left">Configuración</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
              class="w-3.5 h-3.5 transition-transform duration-300 ease-in-out"
              :class="submenuAbierto === 'config' ? 'rotate-180' : ''"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <!-- Sub-ítems -->
          <!-- Despliegue suave: anima la altura de 0 a su tamaño real (grid 0fr -> 1fr) -->
          <div
            class="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
            :class="submenuAbierto === 'config' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
            :inert="submenuAbierto !== 'config'"
          >
            <div class="min-h-0 overflow-hidden">
              <div class="mt-0.5 ml-3 pl-3 border-l border-stone-700 space-y-0.5">
                <RouterLink
                  v-for="sub in configSubItems"
                  :key="sub.name"
                  :to="sub.path"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150"
                  :class="isSubActive(sub) ? 'bg-blue-600 text-white' : 'text-stone-400 hover:text-white hover:bg-stone-800'"
                >
                  <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    :class="isSubActive(sub) ? 'bg-white' : 'bg-stone-600'"
                  />
                  {{ sub.name }}
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

      </nav>

      <!-- User info + logout -->
      <div class="px-4 py-4 border-t border-stone-700/60 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {{ authStore.user?.name?.charAt(0)?.toUpperCase() ?? 'U' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm font-medium truncate">{{ authStore.user?.name ?? 'Usuario' }}</p>
            <p class="text-stone-400 text-xs truncate">{{ authStore.user?.email ?? '' }}</p>
          </div>
          <button
            @click="handleLogout"
            title="Cerrar sesión"
            class="text-stone-400 hover:text-red-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex-1 min-w-0 lg:ml-64 flex flex-col min-h-screen overflow-hidden">

      <!-- Top header -->
      <header class="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 flex-shrink-0 relative">
        <div class="flex items-center gap-2 min-w-0">
          <button @click="menuMovil = true" class="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition" aria-label="Abrir menú">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <h1 class="text-base sm:text-lg font-semibold text-slate-800 truncate">{{ route.meta.title ?? 'Sistema RRHH' }}</h1>
        </div>
        <span class="hidden sm:inline text-sm text-slate-500 whitespace-nowrap">{{ currentDate() }}</span>
        <!-- En celular, la mariposa ocupa el lugar de la fecha -->
        <img :src="mariposa" alt="Palma Real Hotel y Villas" class="sm:hidden h-8 w-auto flex-shrink-0" />
        <!-- En iPad/tablet (md a lg), la mariposa va centrada en la barra; de 640 a 767 px no cabe junto a títulos largos -->
        <img :src="mariposa" alt="" aria-hidden="true" class="hidden md:block lg:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-9 w-auto pointer-events-none" />
      </header>

      <!-- Page -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6">
        <LoadingSpinner v-if="navegando" card />
        <RouterView v-show="!navegando" />
      </main>
    </div>
  </div>
  <AppToast />
</template>
