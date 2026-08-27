<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/images/hpr_logo.png'

const router    = useRouter()
const authStore = useAuthStore()

const email    = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)

async function handleLogin() {
  error.value   = ''
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    const status = e.response?.status
    if (status >= 500) {
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
  <div class="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">

      <!-- Header -->
      <div class="text-center mb-8">
        <img :src="logo" alt="Palma Real Hotel y Villas" class="h-24 mx-auto mb-3" />
        <p class="text-slate-500 text-sm mt-1">Sistema de Recursos Humanos</p>
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
        {{ error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Correo electrónico</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="usuario@palmareal.com"
            class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition text-sm"
        >
          {{ loading ? 'Ingresando...' : 'Iniciar sesión' }}
        </button>
      </form>
    </div>
  </div>
</template>
