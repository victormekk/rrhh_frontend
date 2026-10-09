import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

export const useBancosStore = defineStore('bancos', () => {
  const { success, error } = useToast()

  const bancos  = ref([])
  const loading = ref(false)

  async function fetchBancos(soloActivos = false) {
    loading.value = true
    try {
      const { data } = await api.get('/bancos', { params: { solo_activos: soloActivos } })
      bancos.value = data
    } finally {
      loading.value = false
    }
  }

  async function createBanco(payload) {
    const { data } = await api.post('/bancos', payload)
    bancos.value.push(data)
    bancos.value.sort((a, b) => a.nombre.localeCompare(b.nombre))
    success('Banco registrado exitosamente.')
    return data
  }

  async function updateBanco(id, payload) {
    const { data } = await api.put(`/bancos/${id}`, payload)
    const idx = bancos.value.findIndex((b) => b.id === id)
    if (idx !== -1) bancos.value[idx] = data
    success('Banco actualizado.')
    return data
  }

  async function deleteBanco(id) {
    await api.delete(`/bancos/${id}`)
    const idx = bancos.value.findIndex((b) => b.id === id)
    if (idx !== -1) bancos.value[idx].estado = 'Inactivo'
    success('Banco desactivado.')
  }

  // ── Empleados activos sin cuenta bancaria (cobran por cheque) ──
  const sinCuenta        = ref([])
  const loadingSinCuenta = ref(false)

  async function fetchSinCuenta() {
    loadingSinCuenta.value = true
    try {
      const { data } = await api.get('/empleados-sin-cuenta')
      sinCuenta.value = data
    } finally {
      loadingSinCuenta.value = false
    }
  }

  async function asignarCuenta(idEmpleado, payload) {
    const { data } = await api.post(`/empleados/${idEmpleado}/cuenta`, payload)
    sinCuenta.value = sinCuenta.value.filter((e) => e.id !== idEmpleado)
    const abiertas = data.planillas_actualizadas + data.especiales_actualizadas
    success(abiertas
      ? `Cuenta asignada. También se aplicó a ${abiertas} planilla(s) abierta(s).`
      : 'Cuenta asignada. Desde ahora cobra por banco.')
    return data
  }

  return {
    bancos, loading, fetchBancos, createBanco, updateBanco, deleteBanco,
    sinCuenta, loadingSinCuenta, fetchSinCuenta, asignarCuenta,
  }
})
