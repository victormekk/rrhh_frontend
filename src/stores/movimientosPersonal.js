import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'
import { nombreArchivo, descargarBlob } from '../utils/archivos'

// Reporte de Movimientos de Personal: ingresos, ceses, reintegros y cambios de contrato.
export const useMovimientosPersonalStore = defineStore('movimientosPersonal', () => {
  const { info, success } = useToast()

  const movimientos = ref([])
  const pagination  = ref(null)
  const loading     = ref(false)

  async function fetchMovimientos(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/historial-laboral', { params })
      movimientos.value = data.data
      pagination.value  = data
    } finally {
      loading.value = false
    }
  }

  async function actualizarLiquidacion(id, liquidacion) {
    const { data } = await api.patch(`/historial-laboral/${id}/liquidacion`, { liquidacion })
    success('Liquidación actualizada.')
    return data
  }

  async function exportarExcel(params = {}) {
    const { data } = await api.get('/historial-laboral/excel', { params, responseType: 'blob' })
    descargarBlob(data, nombreArchivo('MovimientosPersonal', '', 'xlsx'))
    info('Excel descargado.')
  }

  return { movimientos, pagination, loading, fetchMovimientos, actualizarLiquidacion, exportarExcel }
})
