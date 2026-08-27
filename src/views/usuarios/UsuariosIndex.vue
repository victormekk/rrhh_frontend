<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUsuariosStore } from '../../stores/usuarios'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

const store     = useUsuariosStore()
const authStore = useAuthStore()
const { error } = useToast()

onMounted(() => store.fetchUsuarios())

// ── Modal ─────────────────────────────────────────────────────────────────────
const showModal  = ref(false)
const editando   = ref(null)
const saving     = ref(false)
const errorModal = ref('')

const form = ref({ name: '', email: '', rol: 'rrhh', password: '' })

function abrirCrear() {
  editando.value   = null
  form.value       = { name: '', email: '', rol: 'rrhh', password: '' }
  errorModal.value = ''
  showModal.value  = true
}

function abrirEditar(u) {
  editando.value   = u
  form.value       = { name: u.name, email: u.email, rol: u.rol, password: '' }
  errorModal.value = ''
  showModal.value  = true
}

function cerrarModal() { showModal.value = false }

async function guardar() {
  if (!form.value.name)  { errorModal.value = 'El nombre es requerido.'; return }
  if (!form.value.email) { errorModal.value = 'El correo es requerido.'; return }
  if (!editando.value && !form.value.password) { errorModal.value = 'La contraseña es requerida.'; return }

  errorModal.value = ''
  saving.value     = true
  try {
    const payload = { ...form.value }
    if (!payload.password) delete payload.password

    if (editando.value) {
      await store.updateUsuario(editando.value.id, payload)
    } else {
      await store.createUsuario(payload)
    }
    cerrarModal()
    await store.fetchUsuarios()
  } catch (e) {
    const errs = e.response?.data?.errors
    if (errs) {
      errorModal.value = Object.values(errs).flat().join(' ')
    } else {
      errorModal.value = e.response?.data?.message ?? 'Error al guardar.'
    }
  } finally {
    saving.value = false
  }
}

async function eliminar(u) {
  if (u.id === authStore.user?.id) {
    error('No puedes eliminar tu propio usuario.')
    return
  }
  if (!confirm(`¿Eliminar al usuario "${u.name}"? Esta acción no se puede deshacer.`)) return
  try {
    await store.deleteUsuario(u.id)
    await store.fetchUsuarios()
  } catch (e) {
    error(e.response?.data?.message ?? 'No se pudo eliminar el usuario.')
  }
}

async function cambiarPagina(url) {
  if (!url) return
  const page = new URL(url).searchParams.get('page')
  await store.fetchUsuarios({ page })
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const rolClases = {
  admin: 'bg-blue-100 text-blue-700',
  rrhh:  'bg-emerald-100 text-emerald-700',
}

function rolBadge(rol) { return rolClases[rol] ?? 'bg-slate-100 text-slate-600' }

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(String(d).slice(0, 10) + 'T00:00:00')
  return isNaN(date) ? '—' : date.toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const passwordPlaceholder = computed(() =>
  editando.value ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres'
)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">Gestión de Usuarios</h2>
        <p class="text-sm text-slate-500 mt-0.5">Administra los accesos al sistema RRHH</p>
      </div>
      <button @click="abrirCrear"
        class="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nuevo usuario
      </button>
    </div>

    <!-- Info roles -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-blue-700">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-blue-800">Administrador</p>
            <p class="text-xs text-blue-600 mt-0.5">Acceso total: CRUD usuarios, ver logs, todos los módulos</p>
          </div>
        </div>
      </div>
      <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-emerald-700">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-emerald-800">RRHH</p>
            <p class="text-xs text-emerald-600 mt-0.5">Acceso operativo: empleados, planillas, vacaciones, incidencias</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 class="font-semibold text-slate-700">Usuarios del sistema</h3>
        <span class="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          {{ store.pagination?.total ?? 0 }} usuarios
        </span>
      </div>

      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-5 py-3 font-semibold text-slate-600">Nombre</th>
            <th class="text-left px-5 py-3 font-semibold text-slate-600">Correo</th>
            <th class="text-center px-5 py-3 font-semibold text-slate-600">Rol</th>
            <th class="text-left px-5 py-3 font-semibold text-slate-600">Registrado</th>
            <th class="text-right px-5 py-3 font-semibold text-slate-600">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <!-- Skeleton -->
          <template v-if="store.loading">
            <tr v-for="i in 5" :key="i" class="border-b border-slate-100">
              <td class="px-5 py-3"><div class="h-4 w-36 bg-slate-200 rounded animate-pulse" /></td>
              <td class="px-5 py-3"><div class="h-4 w-44 bg-slate-200 rounded animate-pulse" /></td>
              <td class="px-5 py-3 text-center"><div class="h-5 w-16 bg-slate-200 rounded-full animate-pulse mx-auto" /></td>
              <td class="px-5 py-3"><div class="h-4 w-24 bg-slate-200 rounded animate-pulse" /></td>
              <td class="px-5 py-3"><div class="h-4 w-20 bg-slate-200 rounded animate-pulse ml-auto" /></td>
            </tr>
          </template>

          <tr v-else-if="store.usuarios.length === 0">
            <td colspan="5" class="text-center py-12 text-slate-400">No hay usuarios registrados.</td>
          </tr>

          <tr v-else v-for="u in store.usuarios" :key="u.id"
            class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="px-5 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">
                  {{ u.name?.charAt(0)?.toUpperCase() }}
                </div>
                <span class="font-medium text-slate-800">{{ u.name }}</span>
                <span v-if="u.id === authStore.user?.id"
                  class="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Tú</span>
              </div>
            </td>
            <td class="px-5 py-3 text-slate-500">{{ u.email }}</td>
            <td class="px-5 py-3 text-center">
              <span class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full" :class="rolBadge(u.rol)">
                {{ u.rol === 'admin' ? 'Administrador' : 'RRHH' }}
              </span>
            </td>
            <td class="px-5 py-3 text-slate-500 text-xs">{{ formatDate(u.created_at) }}</td>
            <td class="px-5 py-3 text-right whitespace-nowrap">
              <div class="flex items-center justify-end gap-1">
                <button @click="abrirEditar(u)" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition" title="Editar">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                </button>
                <button @click="eliminar(u)" :disabled="u.id === authStore.user?.id" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed" title="Eliminar">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Paginación -->
      <div v-if="store.pagination?.last_page > 1"
        class="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
        <span class="text-xs text-slate-500">
          Mostrando {{ store.pagination.from }}–{{ store.pagination.to }} de {{ store.pagination.total }}
        </span>
        <div class="flex items-center gap-1">
          <button @click="cambiarPagina(store.pagination.prev_page_url)"
            :disabled="!store.pagination.prev_page_url"
            class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
            Anterior
          </button>
          <span class="text-xs text-slate-600 px-2">{{ store.pagination.current_page }} / {{ store.pagination.last_page }}</span>
          <button @click="cambiarPagina(store.pagination.next_page_url)"
            :disabled="!store.pagination.next_page_url"
            class="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
            Siguiente
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal -->
  <Teleport to="body">
    <div v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="cerrarModal">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 class="text-base font-bold text-slate-800">
            {{ editando ? 'Editar usuario' : 'Nuevo usuario' }}
          </h3>
          <button @click="cerrarModal" class="text-slate-400 hover:text-slate-600 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="guardar" class="px-6 py-5 space-y-4">
          <div v-if="errorModal" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {{ errorModal }}
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Nombre <span class="text-red-500">*</span></label>
            <input v-model="form.name" type="text" placeholder="Nombre completo"
              class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Correo electrónico <span class="text-red-500">*</span></label>
            <input v-model="form.email" type="email" placeholder="correo@empresa.com"
              class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Rol <span class="text-red-500">*</span></label>
            <select v-model="form.rol"
              class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="rrhh">RRHH — acceso operativo</option>
              <option value="admin">Administrador — acceso total</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">
              Contraseña {{ editando ? '(opcional)' : '' }}
              <span v-if="!editando" class="text-red-500">*</span>
            </label>
            <input v-model="form.password" type="password" :placeholder="passwordPlaceholder"
              class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div class="flex justify-end gap-3 pt-1">
            <button type="button" @click="cerrarModal"
              class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
            <button type="submit" :disabled="saving"
              class="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
