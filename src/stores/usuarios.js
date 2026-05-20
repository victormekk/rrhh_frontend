import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

export const useUsuariosStore = defineStore('usuarios', () => {
  const { success, error } = useToast()

  const usuarios   = ref([])
  const pagination = ref(null)
  const loading    = ref(false)

  async function fetchUsuarios(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/usuarios', { params })
      usuarios.value   = data.data
      pagination.value = data
    } finally {
      loading.value = false
    }
  }

  async function createUsuario(payload) {
    const { data } = await api.post('/usuarios', payload)
    success('Usuario registrado exitosamente.')
    return data
  }

  async function updateUsuario(id, payload) {
    const { data } = await api.put(`/usuarios/${id}`, payload)
    success('Usuario actualizado.')
    return data
  }

  async function deleteUsuario(id) {
    await api.delete(`/usuarios/${id}`)
    success('Usuario eliminado.')
  }

  return { usuarios, pagination, loading, fetchUsuarios, createUsuario, updateUsuario, deleteUsuario }
})
