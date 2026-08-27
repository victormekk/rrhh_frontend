import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

export const useLogSistemaStore = defineStore('logSistema', () => {
  const { info } = useToast()

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

  async function downloadPdf(params = {}) {
    const { data } = await api.get('/log-sistema/pdf', { params, responseType: 'blob' })
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const filename = `${dd}${mm}${d.getFullYear()}-log-sistema.pdf`
    const url = URL.createObjectURL(data)
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    info('PDF descargado.')
  }

  return { logs, pagination, loading, fetchLogs, downloadPdf }
})
