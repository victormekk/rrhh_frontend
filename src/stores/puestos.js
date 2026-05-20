import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

export const usePuestosStore = defineStore('puestos', () => {
  const { success, error } = useToast()

  const puestos = ref([])
  const loading = ref(false)

  async function fetchPuestos(soloActivos = false) {
    loading.value = true
    try {
      const { data } = await api.get('/puestos', { params: { solo_activos: soloActivos } })
      puestos.value = data
    } finally {
      loading.value = false
    }
  }

  async function createPuesto(payload) {
    const { data } = await api.post('/puestos', payload)
    puestos.value.push(data)
    puestos.value.sort((a, b) => a.nombre.localeCompare(b.nombre))
    success('Puesto registrado exitosamente.')
    return data
  }

  async function updatePuesto(id, payload) {
    const { data } = await api.put(`/puestos/${id}`, payload)
    const idx = puestos.value.findIndex((p) => p.id === id)
    if (idx !== -1) puestos.value[idx] = data
    success('Puesto actualizado.')
    return data
  }

  async function deletePuesto(id) {
    await api.delete(`/puestos/${id}`)
    const idx = puestos.value.findIndex((p) => p.id === id)
    if (idx !== -1) puestos.value[idx].estado = 'Inactivo'
    success('Puesto desactivado.')
  }

  return { puestos, loading, fetchPuestos, createPuesto, updatePuesto, deletePuesto }
})
