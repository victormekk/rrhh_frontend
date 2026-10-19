import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

// Ingresos y deducciones recurrentes (préstamos, adelantos, bonos fijos) que se
// cargan solos en cada planilla.
export const useIngresosDeduccionesStore = defineStore('ingresosDeducciones', () => {
  const { success } = useToast()

  const registros  = ref([])
  const pagination = ref(null)
  const loading    = ref(false)

  async function fetchRegistros(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/ingresos-deducciones', { params })
      registros.value  = data.data
      pagination.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchRegistro(id) {
    const { data } = await api.get(`/ingresos-deducciones/${id}`)
    return data
  }

  async function buscarEmpleados(search) {
    const { data } = await api.get('/empleados', { params: { search, estado: 'Activo' } })
    return data.data
  }

  async function createRegistro(payload) {
    const { data } = await api.post('/ingresos-deducciones', payload)
    success('Registro guardado. Se cargará solo en las próximas planillas.')
    return data
  }

  async function updateRegistro(id, payload) {
    const { data } = await api.put(`/ingresos-deducciones/${id}`, payload)
    success('Registro actualizado.')
    return data
  }

  async function cambiarEstado(id, estado) {
    const { data } = await api.patch(`/ingresos-deducciones/${id}/estado`, { estado })
    success({ Activo: 'Registro reanudado.', Pausado: 'Registro pausado.', Cancelado: 'Registro cancelado.' }[estado])
    return data
  }

  async function deleteRegistro(id) {
    await api.delete(`/ingresos-deducciones/${id}`)
    success('Registro eliminado.')
  }

  return {
    registros, pagination, loading,
    fetchRegistros, fetchRegistro, buscarEmpleados,
    createRegistro, updateRegistro, cambiarEstado, deleteRegistro,
  }
})
