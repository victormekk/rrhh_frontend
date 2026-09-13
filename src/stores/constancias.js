import { defineStore } from 'pinia'
import api from '../services/api'
import { useToast } from '../composables/useToast'

export const useConstanciasStore = defineStore('constancias', () => {
  const { info } = useToast()

  async function buscarEmpleados(search) {
    const { data } = await api.get('/empleados', { params: { search, estado: 'Activo' } })
    return data.data
  }

  async function downloadLaboral(idEmpleado, nombres = '', apellidos = '') {
    const { data } = await api.get(`/constancias/laboral/${idEmpleado}/pdf`, { responseType: 'blob' })
    const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').replace(/[^a-zA-Z0-9+\-]/g, '')
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const filename = `${dd}${mm}${d.getFullYear()}-${norm(nombres)}+${norm(apellidos)}-constancia-laboral.pdf`
    const url = URL.createObjectURL(data)
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    info('Constancia descargada.')
  }

  return { buscarEmpleados, downloadLaboral }
})
