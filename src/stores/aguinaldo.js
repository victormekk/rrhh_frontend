import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

export const useAguinaldoStore = defineStore('aguinaldo', () => {
  const { success, error } = useToast()

  const lista     = ref([])
  const detalle   = ref(null)
  const loading   = ref(false)

  async function fetchLista() {
    loading.value = true
    try {
      const { data } = await api.get('/aguinaldo')
      lista.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchDetalle(nombre) {
    const { data } = await api.get(`/aguinaldo/${encodeURIComponent(nombre)}`)
    detalle.value = data
    return data
  }

  async function crear(payload) {
    const { data } = await api.post('/aguinaldo', payload)
    success('Aguinaldo generado.')
    return data
  }

  async function updateFijo(id, payload) {
    const { data } = await api.put(`/aguinaldo/fijos/${id}`, payload)
    if (detalle.value) {
      const idx = detalle.value.fijos.findIndex(r => r.id === id)
      if (idx !== -1) detalle.value.fijos[idx] = data
      detalle.value.totales_fijos = calcTotalesFijos(detalle.value.fijos)
    }
    success('Aguinaldo actualizado.')
    return data
  }

  async function updateExtra(id, payload) {
    const { data } = await api.put(`/aguinaldo/extras/${id}`, payload)
    if (detalle.value) {
      const idx = detalle.value.extras.findIndex(r => r.id === id)
      if (idx !== -1) detalle.value.extras[idx] = data
      detalle.value.totales_extras = calcTotalesExtras(detalle.value.extras)
    }
    success('Aguinaldo actualizado.')
    return data
  }

  async function cerrar(nombre) {
    const { data } = await api.post(`/aguinaldo/${encodeURIComponent(nombre)}/cerrar`)
    if (detalle.value) detalle.value.estado = 'Cerrado'
    success('Aguinaldo cerrado.')
    return data
  }

  async function eliminar(nombre) {
    await api.delete(`/aguinaldo/${encodeURIComponent(nombre)}`)
    success('Aguinaldo eliminado.')
  }

  function pdfUrl(nombre) {
    const token = localStorage.getItem('token')
    const base  = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
    return `${base}/aguinaldo/${encodeURIComponent(nombre)}/pdf?token=${token}`
  }

  function calcTotalesFijos(fijos) {
    return {
      dias_trabajados: fijos.reduce((s, r) => s + (r.dias_trabajados ?? 0), 0),
      salario_base:    fijos.reduce((s, r) => s + parseFloat(r.salario_base ?? 0), 0),
      anticipo:        fijos.reduce((s, r) => s + parseFloat(r.anticipo ?? 0), 0),
      total_aguinaldo: fijos.reduce((s, r) => s + parseFloat(r.total_aguinaldo ?? 0), 0),
    }
  }

  function calcTotalesExtras(extras) {
    return {
      subtotal:        extras.reduce((s, r) => s + parseFloat(r.subtotal ?? 0), 0),
      antiguedad:      extras.reduce((s, r) => s + parseFloat(r.antiguedad ?? 0), 0),
      anticipos:       extras.reduce((s, r) => s + parseFloat(r.anticipos ?? 0), 0),
      total_aguinaldo: extras.reduce((s, r) => s + parseFloat(r.total_aguinaldo ?? 0), 0),
    }
  }

  return {
    lista, detalle, loading,
    fetchLista, fetchDetalle, crear,
    updateFijo, updateExtra, cerrar, eliminar, pdfUrl,
  }
})
