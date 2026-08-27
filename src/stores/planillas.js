import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

export const usePlanillasStore = defineStore('planillas', () => {
  const { success, error } = useToast()

  const planillas  = ref([])
  const planilla   = ref(null)
  const pagination = ref(null)
  const loading    = ref(false)

  async function fetchPlanillas(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/planillas', { params })
      planillas.value  = data.data
      pagination.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchPlanilla(id) {
    const { data } = await api.get(`/planillas/${id}`)
    planilla.value = data
    return data
  }

  async function createPlanilla(payload) {
    const { data } = await api.post('/planillas', payload)
    success('Planilla registrada exitosamente.')
    return data
  }

  async function updateDetalle(planillaId, detalleId, payload, { silent = false } = {}) {
    const { data } = await api.put(`/planillas/${planillaId}/detalles/${detalleId}`, payload)
    // Actualizar el detalle en el store local
    if (planilla.value) {
      const idx = planilla.value.detalles.findIndex(d => d.id === detalleId)
      if (idx !== -1) planilla.value.detalles[idx] = data
    }
    if (!silent) success('Detalle actualizado.')
    return data
  }

  async function cerrarPlanilla(id) {
    const { data } = await api.post(`/planillas/${id}/cerrar`)
    if (planilla.value?.id === id) planilla.value.estado = 'Cerrado'
    success('Planilla cerrada exitosamente.')
    return data
  }

  async function deletePlanilla(id) {
    await api.delete(`/planillas/${id}`)
    success('Planilla eliminada.')
  }

  function pdfUrl(id) {
    const token = localStorage.getItem('token')
    return `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'}/planillas/${id}/pdf?token=${token}`
  }

  return {
    planillas, planilla, pagination, loading,
    fetchPlanillas, fetchPlanilla, createPlanilla,
    updateDetalle, cerrarPlanilla, deletePlanilla, pdfUrl,
  }
})
