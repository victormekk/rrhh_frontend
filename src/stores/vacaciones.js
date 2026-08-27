import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

export const useVacacionesStore = defineStore('vacaciones', () => {
  const { success, error, info } = useToast()

  const solicitudes = ref([])
  const pagination  = ref(null)
  const saldo       = ref(null)
  const empleado    = ref(null)
  const loading     = ref(false)
  const loadingSaldo = ref(false)

  async function fetchSolicitudes(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/vacaciones', { params })
      solicitudes.value = data.data
      pagination.value  = data
    } finally {
      loading.value = false
    }
  }

  async function fetchSaldo(id, { silent = false } = {}) {
    if (!silent) loadingSaldo.value = true
    try {
      const { data } = await api.get(`/vacaciones/saldo/${id}`)
      empleado.value = data.empleado
      saldo.value    = data.saldo
    } finally {
      if (!silent) loadingSaldo.value = false
    }
  }

  async function buscarEmpleados(search) {
    const { data } = await api.get('/empleados', { params: { search, estado: 'Activo' } })
    return data.data
  }

  async function createSolicitud(payload) {
    const { data } = await api.post('/vacaciones', payload)
    success('Solicitud registrada exitosamente.')
    return data
  }

  async function updateSolicitud(id, payload) {
    const { data } = await api.put(`/vacaciones/${id}`, payload)
    success('Solicitud actualizada.')
    return data
  }

  async function deleteSolicitud(id) {
    await api.delete(`/vacaciones/${id}`)
    success('Solicitud eliminada.')
  }

  async function downloadPdf(id, nombres = '', apellidos = '') {
    const { data } = await api.get(`/vacaciones/${id}/pdf`, { responseType: 'blob' })
    const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').replace(/[^a-zA-Z0-9+\-]/g, '')
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const filename = `${dd}${mm}${d.getFullYear()}-${norm(nombres)}+${norm(apellidos)}-vacaciones.pdf`
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

  function limpiar() {
    solicitudes.value  = []
    pagination.value   = null
    saldo.value        = null
    empleado.value     = null
  }

  return {
    solicitudes, pagination, saldo, empleado, loading, loadingSaldo,
    fetchSolicitudes, fetchSaldo, buscarEmpleados,
    createSolicitud, updateSolicitud, deleteSolicitud, downloadPdf, limpiar,
  }
})
