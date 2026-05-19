import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'

export const useIncidenciasStore = defineStore('incidencias', () => {
  const incidencias = ref([])
  const pagination  = ref(null)
  const loading     = ref(false)

  async function fetchIncidencias(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/incidencias', { params })
      incidencias.value = data.data
      pagination.value  = data
    } finally {
      loading.value = false
    }
  }

  async function createIncidencia(payload) {
    const { data } = await api.post('/incidencias', payload)
    return data
  }

  async function updateIncidencia(id, payload) {
    const { data } = await api.put(`/incidencias/${id}`, payload)
    return data
  }

  async function deleteIncidencia(id) {
    await api.delete(`/incidencias/${id}`)
  }

  return { incidencias, pagination, loading, fetchIncidencias, createIncidencia, updateIncidencia, deleteIncidencia }
})
