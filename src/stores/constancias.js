import { defineStore } from 'pinia'
import api from '../services/api'
import { useToast } from '../composables/useToast'
import { nombreArchivo, sanitizarNombreArchivo, descargarBlob } from '../utils/archivos'

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

  async function buscarBancos() {
    const { data } = await api.get('/bancos')
    return data
  }

  async function downloadBancaria(idEmpleado, idBanco, nombres = '', apellidos = '') {
    const { data } = await api.get(`/constancias/bancaria/${idEmpleado}/${idBanco}/pdf`, { responseType: 'blob' })
    descargarBlob(data, nombreArchivo('ConstanciaBancaria', `${nombres} ${apellidos}`, 'pdf'))
    info('Constancia descargada.')
  }

  async function buscarPlanillasVoucher(idEmpleado) {
    const { data } = await api.get(`/constancias/voucher/${idEmpleado}/planillas`)
    return data
  }

  async function downloadVoucher(idEmpleado, idPlanilla, nombrePlanilla, nombreEmpleado) {
    const { data } = await api.get(`/constancias/voucher/${idEmpleado}/${idPlanilla}/pdf`, { responseType: 'blob' })
    const archivo = `${sanitizarNombreArchivo(nombrePlanilla)}_${sanitizarNombreArchivo(nombreEmpleado)}.pdf`
    descargarBlob(data, archivo)
    info('Voucher descargado.')
  }

  return { buscarEmpleados, downloadLaboral, buscarBancos, downloadBancaria, buscarPlanillasVoucher, downloadVoucher }
})
