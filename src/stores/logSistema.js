import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'

export const useLogSistemaStore = defineStore('logSistema', () => {
  const logs       = ref([])
  const pagination = ref(null)
  const loading    = ref(false)

  async function fetchLogs(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/log-sistema', { params })
      logs.value       = data.data
      pagination.value = data
    } finally {
      loading.value = false
    }
  }

  return { logs, pagination, loading, fetchLogs }
})
