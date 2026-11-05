import { defineStore } from 'pinia'
import api from '../services/api'
import { useToast } from '../composables/useToast'
import { nombreArchivo, descargarBlob } from '../utils/archivos'

// Reportes → Salarios Devengados (varios o todos los empleados, en un rango de fechas).
export const useSalariosDevengadosStore = defineStore('salariosDevengados', () => {
  const { info } = useToast()

  async function calcular(ids, fechaInicio, fechaFin) {
    const { data } = await api.get('/salarios-devengados', {
      params: { ids, fecha_inicio: fechaInicio, fecha_fin: fechaFin },
    })
    return data
  }

  async function exportarExcel(ids, fechaInicio, fechaFin) {
    const { data } = await api.get('/salarios-devengados/excel', {
      params: { ids, fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      responseType: 'blob',
    })
    descargarBlob(data, nombreArchivo('SalariosDevengados', '', 'xlsx'))
    info('Excel descargado.')
  }

  return { calcular, exportarExcel }
})
