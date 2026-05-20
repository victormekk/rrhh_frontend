import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'

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

  return { empleados, loading, mesActivo, fetchCumpleanos }
})
