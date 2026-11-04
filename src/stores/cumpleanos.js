import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'
import { descargarBlob } from '../utils/archivos'

export const useCumpleanosStore = defineStore('cumpleanos', () => {
  const empleados = ref([])
  const loading   = ref(false)
  const mesActivo = ref(new Date().getMonth() + 1)

  async function fetchCumpleanos(mes) {
    const m = mes ?? mesActivo.value
    mesActivo.value = m
    loading.value   = true
    try {
      const { data } = await api.get('/cumpleanos', { params: { mes: m } })
      empleados.value = data
    } finally {
      loading.value = false
    }
  }

  // PDF con los cumpleañeros del mes, con el mismo aspecto que la pantalla.
  async function exportarPdf(mes, nombreMes) {
    const { data } = await api.get('/cumpleanos/pdf', { params: { mes }, responseType: 'blob' })
    const d = new Date()
    const fecha = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`
    descargarBlob(data, `Cumpleanos_${nombreMes}_${fecha}.pdf`)
  }

  return { empleados, loading, mesActivo, fetchCumpleanos, exportarPdf }
})
