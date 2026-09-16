import { defineStore } from 'pinia'
import api from '../services/api'
import { useToast } from '../composables/useToast'
import { nombreArchivo, descargarBlob } from '../utils/archivos'

export const useInformacionLaboralStore = defineStore('informacionLaboral', () => {
  const { info } = useToast()

  async function buscarEmpleados(search, estado = '') {
    const { data } = await api.get('/empleados', { params: { search, estado: estado || undefined } })
    return data.data
  }

  async function fetchDepartamentos() {
    const { data } = await api.get('/departamentos')
    return data
  }

  async function buscarPorDepartamentos(idDepartamentos, estado = '') {
    const { data } = await api.get('/empleados', {
      params: { id_departamento: idDepartamentos, estado: estado || undefined, per_page: 500 },
    })
    return data.data
  }

  async function exportarExcel(ids) {
    const { data } = await api.get('/empleados-informacion-laboral/excel', {
      params: { ids },
      responseType: 'blob',
    })
    descargarBlob(data, nombreArchivo('InformacionLaboral', '', 'xlsx'))
    info('Excel descargado.')
  }

  return { buscarEmpleados, fetchDepartamentos, buscarPorDepartamentos, exportarExcel }
})
