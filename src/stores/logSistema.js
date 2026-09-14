import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'
import { nombreArchivo, descargarBlob } from '../utils/archivos'

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
    descargarBlob(data, nombreArchivo('LogSistema', '', 'pdf'))
    info('PDF descargado.')
  }

  return { logs, pagination, loading, fetchLogs, downloadPdf }
})
