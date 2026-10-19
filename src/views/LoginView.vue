<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/images/hpr_logo.png'

const router    = useRouter()
const authStore = useAuthStore()

const email       = ref('')
const password    = ref('')
const verPassword = ref(false)
const error       = ref(sessionStorage.getItem('avisoLogin') ?? '')
const loading     = ref(false)

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
  <div class="min-h-screen flex items-center justify-center bg-[#faf6ec] px-4 py-10 overflow-hidden">
    <div class="relative w-full max-w-sm">
      <!-- Resplandor tenue con los colores de la mariposa, detrás de la tarjeta -->
      <div class="absolute -top-16 -left-20 w-64 h-64 rounded-full bg-[#e07a2c]/15 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-20 -right-16 w-64 h-64 rounded-full bg-[#f5d92a]/20 blur-3xl pointer-events-none"></div>

      <div class="relative overflow-hidden bg-white rounded-2xl shadow-sm ring-1 ring-[#3b2b16]/10 p-8">
        <!-- Franja con el degradado de la mariposa -->
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#c0101a] via-[#e8892f] to-[#f5d92a]"></div>
        <img :src="logo" alt="Palma Real Hotel y Villas" class="h-20 mx-auto mb-5" />

        <h1 class="text-center text-lg font-semibold text-[#3b2b16]">Sistema de Recursos Humanos</h1>
        <p class="text-center text-stone-500 text-sm mt-1 mb-7">Ingrese con su correo y contraseña</p>

        <!-- Error -->
        <div v-if="error" class="flex gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3.5 py-3 mb-5 text-sm">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>{{ error }}</span>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-[#3b2b16] mb-1.5">Correo electrónico</label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="username"
              placeholder="usuario@email.com"
              class="w-full border border-stone-300 rounded-lg px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-[#3b2b16] mb-1.5">Contraseña</label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="verPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full border border-stone-300 rounded-lg pl-3.5 pr-11 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              <button
                type="button"
                @click="verPassword = !verPassword"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-stone-400 hover:text-[#3b2b16] hover:bg-stone-100 transition"
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
            class="w-full flex items-center justify-center gap-2 rounded-lg bg-[#3b2b16] hover:bg-[#241a0d] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 text-sm transition"
          >
            <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {{ loading ? 'Ingresando...' : 'Iniciar sesión' }}
          </button>
        </form>
      </div>

      <p class="relative text-center text-xs text-stone-500 mt-5">
        Acceso exclusivo para personal autorizado.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Edge agrega su propio botón para ver la contraseña; se oculta para que quede solo el del sistema. */
input::-ms-reveal,
input::-ms-clear {
  display: none;
}
</style>
