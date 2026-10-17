import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { nombreArchivo, descargarBlob } from '../utils/archivos'

// Marcas de los relojes biométricos, cargadas por CSV en "Cargar Marcas".
export const useMarcacionesStore = defineStore('marcaciones', () => {
  const estado = ref(null)

  async function fetchEstado() {
    const { data } = await api.get('/asistencias/estado')
    estado.value = data
    return data
  }

  async function cargarCsv(archivo) {
    const form = new FormData()
    form.append('archivo', archivo)
    const { data } = await api.post('/asistencias/cargar-csv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    await fetchEstado()
    return data
  }

  async function contarParaEliminar(params) {
    const { data } = await api.get('/asistencias/eliminar/contar', { params })
    return data.total
  }

  async function eliminar(params) {
    const { data } = await api.delete('/asistencias', { params })
    await fetchEstado()
    return data.eliminadas
  }

  // ── Marcas incompletas ──────────────────────────────────────────────────
  async function fetchIncompletas(params) {
    const { data } = await api.get('/marcas-incompletas', { params })
    return data
  }

  async function justificar(payload) {
    const { data } = await api.post('/marcas-incompletas/justificar', payload)
    return data
  }

  async function quitarJustificacion(id) {
    await api.delete(`/marcas-incompletas/justificar/${id}`)
  }

  async function descargarIncompletas(params, formato) {
    const { data } = await api.get(`/marcas-incompletas/${formato}`, { params, responseType: 'blob' })
    descargarBlob(data, nombreArchivo('MarcasIncompletas', '', formato === 'excel' ? 'xlsx' : 'pdf'))
  }

  return {
    estado, fetchEstado, cargarCsv, contarParaEliminar, eliminar,
    fetchIncompletas, justificar, quitarJustificacion, descargarIncompletas,
  }
})
