import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

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
    const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').replace(/[^a-zA-Z0-9+\-]/g, '')
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const filename = `${dd}${mm}${d.getFullYear()}-${norm(nombres)}+${norm(apellidos)}-incidencia.pdf`
    const url = URL.createObjectURL(data)
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    info('PDF descargado.')
  }

  return {
    incidencias, pagination, loading,
    fetchIncidencias, buscarEmpleados,
    createIncidencia, updateIncidencia, deleteIncidencia, downloadPdf,
  }
})
