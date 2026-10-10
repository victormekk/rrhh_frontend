<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/images/hpr_logo.png'
import mariposa from '../assets/images/MariposaPNG (2021_01_15 15_14_58 UTC).png'

const router    = useRouter()
const authStore = useAuthStore()

const email       = ref('')
const password    = ref('')
const verPassword = ref(false)
const error       = ref(sessionStorage.getItem('avisoLogin') ?? '')
const loading     = ref(false)
const hoy         = new Date()
const fechaTexto  = hoy.toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })
const fechaHoy    = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1)
const saludo      = ref(calcularSaludo())

// 05:00–11:59 días · 12:00–18:59 tardes · 19:00–04:59 noches
function calcularSaludo() {
  const hora = new Date().getHours()
  if (hora >= 5 && hora < 12) return 'Buenos días'
  if (hora >= 12 && hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

// Si la pantalla queda abierta, el saludo se actualiza al cambiar de franja
const intervaloSaludo = setInterval(() => { saludo.value = calcularSaludo() }, 60_000)
onUnmounted(() => clearInterval(intervaloSaludo))

sessionStorage.removeItem('avisoLogin')

async function handleLogin() {
  error.value   = ''
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    const status = e.response?.status
    if (!e.response) {
      error.value = 'No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.'
    } else if (status === 429) {
      error.value = 'Demasiados intentos de inicio de sesión. Espere un minuto e intente nuevamente.'
    } else if (status >= 500) {
      error.value = 'Error interno del servidor. Intente más tarde.'
    } else {
      error.value = e.response?.data?.errors?.email?.[0]
        ?? e.response?.data?.message
        ?? 'Credenciales incorrectas.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex bg-[#faf6ec]">

    <!-- Panel de marca (escritorio) -->
    <aside class="hidden lg:flex relative w-[46%] xl:w-1/2 overflow-hidden bg-[#180f07] text-white flex-col justify-between p-12">
      <!-- Destellos con los colores de la mariposa -->
      <div class="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#c0101a]/35 blur-3xl"></div>
      <div class="absolute top-1/3 -right-32 w-[26rem] h-[26rem] rounded-full bg-[#e07a2c]/25 blur-3xl"></div>
      <div class="absolute -bottom-40 left-1/4 w-[30rem] h-[30rem] rounded-full bg-[#f5d92a]/15 blur-3xl"></div>
      <!-- Textura de puntos sutil -->
      <div
        class="absolute inset-0 opacity-[0.06]"
        style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 22px 22px;"
      ></div>

      <div class="relative flex items-center gap-3">
        <img :src="mariposa" alt="" class="h-9 w-auto" />
        <div>
          <p class="font-semibold leading-tight">Hotel Palma Real</p>
          <p class="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-semibold">Hotel y Villas</p>
        </div>
      </div>

      <div class="relative flex flex-col items-center text-center">
        <img :src="mariposa" alt="" class="w-72 xl:w-80 mariposa-flota drop-shadow-[0_20px_45px_rgba(224,122,44,0.35)]" />
        <h2 class="mt-10 text-3xl xl:text-4xl font-semibold leading-tight tracking-tight">
          Cuidamos a quienes<br />
          <span class="bg-gradient-to-r from-[#e0322a] via-[#e8892f] to-[#f5d92a] bg-clip-text text-transparent">
            hacen especial cada estadía
          </span>
        </h2>
        <p class="mt-4 max-w-sm text-stone-400 text-sm leading-relaxed">
          Planillas, vacaciones, incidencias y expedientes de nuestro equipo en un solo lugar.
        </p>
      </div>

      <!-- Espaciador para que el contenido central quede centrado -->
      <div></div>
    </aside>

    <!-- Formulario -->
    <main class="flex-1 relative flex items-center justify-center px-4 py-10 sm:px-8 overflow-hidden">
      <!-- Destellos cálidos -->
      <div class="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#e07a2c]/20 blur-3xl"></div>
      <div class="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#f5d92a]/25 blur-3xl"></div>
      <div class="hidden lg:block absolute top-1/2 left-0 -translate-x-1/2 w-64 h-64 rounded-full bg-[#c0101a]/10 blur-3xl"></div>
      <!-- Puntos marrones que se desvanecen hacia el centro -->
      <div
        class="absolute inset-0 opacity-[0.12] puntos"
        style="background-image: radial-gradient(#3b2b16 1px, transparent 1px); background-size: 22px 22px;"
      ></div>
      <!-- Anillos dorados que evocan los lazos de la mariposa -->
      <svg class="absolute -top-28 -right-28 w-[26rem] h-[26rem] text-blue-500/25 pointer-events-none" viewBox="0 0 200 200" fill="none" stroke="currentColor">
        <circle cx="100" cy="100" r="98" stroke-width="0.6" />
        <circle cx="100" cy="100" r="78" stroke-width="0.6" />
        <circle cx="100" cy="100" r="58" stroke-width="0.6" />
      </svg>
      <svg class="absolute -bottom-24 -left-24 w-80 h-80 text-[#e07a2c]/20 pointer-events-none" viewBox="0 0 200 200" fill="none" stroke="currentColor">
        <circle cx="100" cy="100" r="98" stroke-width="0.7" />
        <circle cx="100" cy="100" r="74" stroke-width="0.7" />
      </svg>

      <div class="relative w-full max-w-md">
        <div class="relative overflow-hidden bg-white/90 backdrop-blur rounded-3xl shadow-[0_25px_60px_-20px_rgba(59,43,22,0.25)] ring-1 ring-[#3b2b16]/5 p-8 pt-10 sm:p-10 sm:pt-12">
          <!-- Franja superior con el degradado de la mariposa -->
          <div class="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#c0101a] via-[#e8892f] to-[#f5d92a]"></div>

          <!-- En escritorio el logo ya está en el panel de marca -->
          <img :src="logo" alt="Palma Real Hotel y Villas" class="lg:hidden h-24 mb-6 -ml-2" />

          <span class="inline-flex items-center gap-1.5 rounded-full bg-blue-50 ring-1 ring-blue-200/70 px-3 py-1 text-xs font-medium text-blue-600 mb-4">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {{ fechaHoy }}
          </span>

          <h1 class="text-2xl font-semibold text-[#3b2b16] tracking-tight">{{ saludo }}</h1>
          <p class="text-stone-500 text-sm mt-1 mb-8">Ingrese al Sistema de Recursos Humanos</p>

          <!-- Error -->
          <div v-if="error" class="flex gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>{{ error }}</span>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-5">
            <div>
              <label for="email" class="block text-sm font-medium text-[#3b2b16] mb-1.5">Correo electrónico</label>
              <div class="relative">
                <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  required
                  autocomplete="username"
                  placeholder="usuario@email.com"
                  class="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-[#3b2b16] mb-1.5">Contraseña</label>
              <div class="relative">
                <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  id="password"
                  v-model="password"
                  :type="verPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-12 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  @click="verPassword = !verPassword"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-stone-400 hover:text-[#3b2b16] hover:bg-stone-100 transition"
                  :aria-label="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                >
                  <svg v-if="!verPassword" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="group relative w-full overflow-hidden rounded-xl bg-[#3b2b16] hover:bg-[#241a0d] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 text-sm shadow-lg shadow-[#3b2b16]/20 transition"
            >
              <span class="relative flex items-center justify-center gap-2">
                <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                {{ loading ? 'Ingresando...' : 'Iniciar sesión' }}
                <svg v-if="!loading" class="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </button>
          </form>

          <div class="mt-8 pt-6 border-t border-stone-100 flex items-start gap-3">
            <div class="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-[#c0101a]/10 via-[#e8892f]/10 to-[#f5d92a]/20 flex items-center justify-center text-[#c2571f]">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <p class="text-xs text-stone-500 leading-relaxed">
              <span class="font-medium text-[#3b2b16]">Acceso exclusivo para personal autorizado.</span><br />
              ¿Problemas para ingresar? Contacte al administrador del sistema.
            </p>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<style scoped>
.mariposa-flota {
  animation: flotar 6s ease-in-out infinite;
}
@keyframes flotar {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50%      { transform: translateY(-14px) rotate(1deg); }
}
.puntos {
  mask-image: radial-gradient(ellipse at center, transparent 30%, #000 85%);
  -webkit-mask-image: radial-gradient(ellipse at center, transparent 30%, #000 85%);
}
@media (prefers-reduced-motion: reduce) {
  .mariposa-flota { animation: none; }
}
</style>
