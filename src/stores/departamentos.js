import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

export const useDepartamentosStore = defineStore('departamentos', () => {
  const { success, error } = useToast()

  const departamentos = ref([])
  const loading       = ref(false)

  async function fetchDepartamentos(soloActivos = false) {
    loading.value = true
    try {
      const { data } = await api.get('/departamentos', {
        params: { solo_activos: soloActivos },
      })
      departamentos.value = data
    } finally {
      loading.value = false
    }
  }

  async function createDepartamento(payload) {
    const { data } = await api.post('/departamentos', payload)
    departamentos.value.push(data)
    departamentos.value.sort((a, b) => a.nombre.localeCompare(b.nombre))
    success('Departamento registrado exitosamente.')
    return data
  }

  async function updateDepartamento(id, payload) {
    const { data } = await api.put(`/departamentos/${id}`, payload)
    const idx = departamentos.value.findIndex((d) => d.id === id)
    if (idx !== -1) departamentos.value[idx] = data
    success('Departamento actualizado.')
    return data
  }

  async function deleteDepartamento(id) {
    await api.delete(`/departamentos/${id}`)
    const idx = departamentos.value.findIndex((d) => d.id === id)
    if (idx !== -1) departamentos.value[idx].estado = 'Inactivo'
    success('Departamento desactivado.')
  }

  return { departamentos, loading, fetchDepartamentos, createDepartamento, updateDepartamento, deleteDepartamento }
})
