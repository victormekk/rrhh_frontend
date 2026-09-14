import { defineStore } from 'pinia'
import api from '../services/api'
import { useToast } from '../composables/useToast'
import { nombreArchivo, descargarBlob } from '../utils/archivos'

export const useConstanciasStore = defineStore('constancias', () => {
  const { info } = useToast()

  async function buscarEmpleados(search) {
    const { data } = await api.get('/empleados', { params: { search, estado: 'Activo' } })
    return data.data
  }

  async function downloadLaboral(idEmpleado, nombres = '', apellidos = '') {
    const { data } = await api.get(`/constancias/laboral/${idEmpleado}/pdf`, { responseType: 'blob' })
    descargarBlob(data, nombreArchivo('ConstanciaLaboral', `${nombres} ${apellidos}`, 'pdf'))
    info('Constancia descargada.')
  }

  return { buscarEmpleados, downloadLaboral }
})
