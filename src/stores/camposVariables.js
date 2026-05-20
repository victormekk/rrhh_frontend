import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'
import { useToast } from '../composables/useToast'

export const useCamposVariablesStore = defineStore('camposVariables', () => {
  const { success, error } = useToast()

  const campos  = ref({ ihss: 297.58, salario_minimo: 16317.60 })
  const loading = ref(false)
  const saving  = ref(false)

  async function fetchCampos() {
    loading.value = true
    try {
      const { data } = await api.get('/campos-variables')
      campos.value = data
    } finally {
      loading.value = false
    }
  }

  async function saveCampos(payload) {
    saving.value = true
    try {
      const { data } = await api.put('/campos-variables', payload)
      campos.value = { ihss: payload.ihss, salario_minimo: payload.salario_minimo }
      success('Campos variables guardados.')
      return data
    } finally {
      saving.value = false
    }
  }

  return { campos, loading, saving, fetchCampos, saveCampos }
})
