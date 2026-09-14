import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'
import { nombreArchivo, descargarBlob } from '../utils/archivos'

export const useEstadisticaLaboralStore = defineStore('estadisticaLaboral', () => {
  const rows       = ref([])
  const totales    = ref(null)
  const pagination = ref(null)
  const loading    = ref(false)

  const detalle        = ref(null)
  const loadingDetalle = ref(false)
  const exportando     = ref(false)

  async function fetchEstadistica(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/estadistica-laboral', { params })
      rows.value       = data.data
      totales.value    = data.totales
      pagination.value = {
        current_page:  data.current_page,
        last_page:     data.last_page,
        from:          data.from,
        to:            data.to,
        total:         data.total,
        prev_page_url: data.prev_page_url,
        next_page_url: data.next_page_url,
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchDetalle(empleadoId, params = {}) {
    loadingDetalle.value = true
    detalle.value        = null
    try {
      const { data } = await api.get(`/estadistica-laboral/${empleadoId}`, { params })
      detalle.value = data
    } finally {
      loadingDetalle.value = false
    }
  }

  async function downloadPdf(params = {}) {
    exportando.value = true
    try {
      const { data } = await api.get('/estadistica-laboral/pdf', {
        params,
        responseType: 'blob',
      })
      const label = params.search || 'TodosEmpleados'
      descargarBlob(data, nombreArchivo('EstadisticaLaboral', label, 'pdf'))
    } finally {
      exportando.value = false
    }
  }

  return {
    rows, totales, pagination, loading,
    detalle, loadingDetalle, exportando,
    fetchEstadistica, fetchDetalle, downloadPdf,
  }
})
