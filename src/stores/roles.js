import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useToast } from '../composables/useToast'

// Configuración → Gestión de Roles: roles y el catálogo de permisos (checks).
export const useRolesStore = defineStore('roles', () => {
  const { success } = useToast()

  const roles    = ref([])
  const catalogo = ref([]) // [{ grupo, modulos: { clave: { nombre, descripcion?, permisos: { accion: etiqueta } } } }]
  const loading  = ref(false)

  async function fetchRoles() {
    loading.value = true
    try {
      const { data } = await api.get('/roles')
      roles.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchCatalogo() {
    if (catalogo.value.length) return
    const { data } = await api.get('/roles/catalogo')
    catalogo.value = data
  }

  async function createRol(payload) {
    const { data } = await api.post('/roles', payload)
    success('Rol creado.')
    return data
  }

  async function updateRol(id, payload) {
    const { data } = await api.put(`/roles/${id}`, payload)
    success('Rol actualizado.')
    return data
  }

  async function deleteRol(id) {
    await api.delete(`/roles/${id}`)
    success('Rol eliminado.')
  }

  return { roles, catalogo, loading, fetchRoles, fetchCatalogo, createRol, updateRol, deleteRol }
})
