import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'
import { nombreArchivo, descargarBlob } from '../utils/archivos'

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

  // Si el rango incluyó feriados nacionales, el backend los excluye del conteo
  // de días y los informa aquí para avisarle al usuario cuáles no se contaron.
  function avisarFeriados(data) {
    const feriados = data?.feriados_excluidos ?? []
    if (feriados.length === 0) return
    const detalle = feriados.map(f => `${f.fecha} (${f.nombre})`).join(', ')
    const verbo   = feriados.length === 1 ? 'contó' : 'contaron'
    info(`No se ${verbo} ${feriados.length} día${feriados.length === 1 ? '' : 's'} feriado${feriados.length === 1 ? '' : 's'}: ${detalle}`)
  }

  async function createSolicitud(payload) {
    const { data } = await api.post('/vacaciones', payload)
    success('Solicitud registrada exitosamente.')
    avisarFeriados(data)
    return data
  }

  async function updateSolicitud(id, payload) {
    const { data } = await api.put(`/vacaciones/${id}`, payload)
    success('Solicitud actualizada.')
    avisarFeriados(data)
    return data
  }

  async function deleteSolicitud(id) {
    await api.delete(`/vacaciones/${id}`)
    success('Solicitud eliminada.')
  }

  async function downloadPdf(id, nombres = '', apellidos = '') {
    const { data } = await api.get(`/vacaciones/${id}/pdf`, { responseType: 'blob' })
    descargarBlob(data, nombreArchivo('Vacaciones', `${nombres} ${apellidos}`, 'pdf'))
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
