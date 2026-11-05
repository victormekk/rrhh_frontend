import { defineStore } from 'pinia'
import api from '../services/api'
import { useToast } from '../composables/useToast'
import { nombreArchivo, descargarBlob } from '../utils/archivos'

// Reportes → Listado de Cumpleaños (mes = 0 es todo el año).
export const useListadoCumpleanosStore = defineStore('listadoCumpleanos', () => {
  const { info } = useToast()

  async function listar(mes, departamentos) {
    const { data } = await api.get('/listado-cumpleanos', { params: { mes, departamentos } })
    return data
  }

  async function exportarExcel(mes, departamentos) {
    const { data } = await api.get('/listado-cumpleanos/excel', {
      params: { mes, departamentos },
      responseType: 'blob',
    })
    descargarBlob(data, nombreArchivo('ListadoCumpleanos', '', 'xlsx'))
    info('Excel descargado.')
  }

  return { listar, exportarExcel }
})
