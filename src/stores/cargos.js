import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

export const useCargosStore = defineStore('cargos', () => {
  const { success, error } = useToast()

  const cargos  = ref([])
  const loading = ref(false)

  async function fetchCargos(soloActivos = false) {
    loading.value = true
    try {
      const { data } = await api.get('/cargos', { params: { solo_activos: soloActivos } })
      cargos.value = data
    } finally {
      loading.value = false
    }
  }

  async function createCargo(payload) {
    const { data } = await api.post('/cargos', payload)
    cargos.value.push(data)
    cargos.value.sort((a, b) => a.nombre.localeCompare(b.nombre))
    success('Cargo registrado exitosamente.')
    return data
  }

  async function updateCargo(id, payload) {
    const { data } = await api.put(`/cargos/${id}`, payload)
    const idx = cargos.value.findIndex((c) => c.id === id)
    if (idx !== -1) cargos.value[idx] = data
    success('Cargo actualizado.')
    return data
  }

  async function deleteCargo(id) {
    await api.delete(`/cargos/${id}`)
    const idx = cargos.value.findIndex((c) => c.id === id)
    if (idx !== -1) cargos.value[idx].estado = 'Inactivo'
    success('Cargo desactivado.')
  }

  async function eliminarCargo(id) {
    await api.delete(`/cargos/${id}/eliminar`)
    cargos.value = cargos.value.filter((c) => c.id !== id)
    success('Cargo eliminado permanentemente.')
  }

  return { cargos, loading, fetchCargos, createCargo, updateCargo, deleteCargo, eliminarCargo }
})
