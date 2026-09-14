import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'
import { nombreArchivo, descargarBlob } from '../utils/archivos'

export const useIncidenciasStore = defineStore('incidencias', () => {
  const { success, error, info } = useToast()

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

  async function buscarEmpleados(search) {
    const { data } = await api.get('/empleados', { params: { search, estado: 'Activo' } })
    return data.data
  }

  async function createIncidencia(payload) {
    const { data } = await api.post('/incidencias', payload)
    success('Incidencia registrada exitosamente.')
    return data
  }

  async function updateIncidencia(id, payload) {
    const { data } = await api.put(`/incidencias/${id}`, payload)
    success('Incidencia actualizada.')
    return data
  }

  async function deleteIncidencia(id) {
    await api.delete(`/incidencias/${id}`)
    success('Incidencia eliminada.')
  }

  async function downloadPdf(id, nombres = '', apellidos = '') {
    const { data } = await api.get(`/incidencias/${id}/pdf`, { responseType: 'blob' })
    descargarBlob(data, nombreArchivo('Incidencia', `${nombres} ${apellidos}`, 'pdf'))
    info('PDF descargado.')
  }

  return {
    incidencias, pagination, loading,
    fetchIncidencias, buscarEmpleados,
    createIncidencia, updateIncidencia, deleteIncidencia, downloadPdf,
  }
})
