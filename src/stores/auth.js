import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const user  = ref(null)
  const token = ref(localStorage.getItem('token'))

  const isAuthenticated = computed(() => !!token.value)

  async function login(email, password) {
    const { data } = await api.post('/login', { email, password })
    token.value = data.token
    user.value  = data.user
    localStorage.setItem('token', data.token)
  }

  async function logout() {
    try {
      await api.post('/logout')
    } finally {
      clearAuth()
    }
  }

  async function fetchUser() {
    const { data } = await api.get('/me')
    user.value = data
  }

  function clearAuth() {
    token.value = null
    user.value  = null
    localStorage.removeItem('token')
  }

  const isAdmin = computed(() => !!user.value?.rol?.es_admin)

  // Permisos del rol (ver config/permisos.php en el backend), ej. 'empleados.editar'.
  // puede('a', 'b') es true si tiene cualquiera de los dos.
  const permisos = computed(() => new Set(user.value?.permisos ?? []))
  function puede(...lista) {
    return isAdmin.value || lista.flat().some((p) => permisos.value.has(p))
  }

  return { user, token, isAuthenticated, isAdmin, puede, login, logout, fetchUser, clearAuth }
})
