import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

export const useEmpleadosStore = defineStore('empleados', () => {
  const { success, error } = useToast()

  const empleados  = ref([])
  const empleado   = ref(null)
  const pagination = ref(null)
  const loading    = ref(false)

  async function fetchEmpleados(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/empleados', { params })
      empleados.value  = data.data
      pagination.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchEmpleado(id) {
    const { data } = await api.get(`/empleados/${id}`)
    empleado.value = data
    return data
  }

  async function createEmpleado(payload) {
    const { data } = await api.post('/empleados', payload)
    success('Empleado registrado exitosamente.')
    return data
  }

  async function updateEmpleado(id, payload) {
    const { data } = await api.put(`/empleados/${id}`, payload)
    success('Empleado actualizado.')
    return data
  }

  async function uploadFoto(id, file) {
    const form = new FormData()
    form.append('foto', file)
    const { data } = await api.post(`/empleados/${id}/foto`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  async function deactivateEmpleado(id) {
    await api.delete(`/empleados/${id}`)
    success('Empleado desactivado.')
  }

  return {
    empleados, empleado, pagination, loading,
    fetchEmpleados, fetchEmpleado, createEmpleado,
    updateEmpleado, uploadFoto, deactivateEmpleado,
  }
})
