<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRolesStore } from '../../stores/roles'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

const store     = useRolesStore()
const authStore = useAuthStore()
const { error } = useToast()

onMounted(() => {
  store.fetchRoles()
  store.fetchCatalogo()
})

const totalPermisos = computed(() =>
  store.catalogo.reduce((n, g) => n + Object.values(g.modulos).reduce((m, mod) => m + Object.keys(mod.permisos).length, 0), 0)
)

// ── Editor de rol (modal con los checks) ─────────────────────────────────────
const showModal  = ref(false)
const editando   = ref(null)
const saving     = ref(false)
const errorModal = ref('')
const form       = ref({ nombre: '', descripcion: '' })
const marcados   = ref(new Set())

function abrirCrear() {
  editando.value   = null
  form.value       = { nombre: '', descripcion: '' }
  marcados.value   = new Set()
  errorModal.value = ''
  showModal.value  = true
}

function abrirEditar(rol) {
  editando.value   = rol
  form.value       = { nombre: rol.nombre, descripcion: rol.descripcion ?? '' }
  marcados.value   = new Set(rol.permisos)
  errorModal.value = ''
  showModal.value  = true
}

function cerrarModal() {
  if (!saving.value) showModal.value = false
}

const clave = (modulo, accion) => `${modulo}.${accion}`

// Quien no es Administrador solo puede dar o quitar permisos que él mismo tiene.
function bloqueado(modulo, accion) {
  return !authStore.puede(clave(modulo, accion))
}

function alternar(modulo, accion, mod) {
  if (bloqueado(modulo, accion)) return
  const s = new Set(marcados.value)
  const k = clave(modulo, accion)
  const tieneVer = 'ver' in mod.permisos
  if (s.has(k)) {
    s.delete(k)
    // Sin "Ver módulo" no tiene sentido lo demás del módulo.
    if (accion === 'ver') {
      Object.keys(mod.permisos).forEach((a) => { if (!bloqueado(modulo, a)) s.delete(clave(modulo, a)) })
    }
  } else {
    s.add(k)
    // Crear, editar, etc. necesitan poder ver el módulo.
    if (tieneVer && accion !== 'ver' && !bloqueado(modulo, 'ver')) s.add(clave(modulo, 'ver'))
  }
  marcados.value = s
}

function estadoModulo(modulo, mod) {
  const acciones = Object.keys(mod.permisos)
  const n = acciones.filter((a) => marcados.value.has(clave(modulo, a))).length
  return n === 0 ? 'ninguno' : n === acciones.length ? 'todos' : 'algunos'
}

function alternarModulo(modulo, mod) {
  const s = new Set(marcados.value)
  const marcarTodos = estadoModulo(modulo, mod) !== 'todos'
  Object.keys(mod.permisos).forEach((a) => {
    if (bloqueado(modulo, a)) return
    marcarTodos ? s.add(clave(modulo, a)) : s.delete(clave(modulo, a))
  })
  marcados.value = s
}

function contarModulo(modulo, mod) {
  return Object.keys(mod.permisos).filter((a) => marcados.value.has(clave(modulo, a))).length
}

async function guardar() {
  if (!form.value.nombre.trim()) { errorModal.value = 'El nombre del rol es requerido.'; return }

  errorModal.value = ''
  saving.value     = true
  try {
    const payload = {
      nombre:      form.value.nombre.trim(),
      descripcion: form.value.descripcion.trim() || null,
      permisos:    [...marcados.value],
    }
    if (editando.value) {
      await store.updateRol(editando.value.id, payload)
    } else {
      await store.createRol(payload)
    }
    showModal.value = false
    await store.fetchRoles()
    // Si editó su propio rol, se refrescan sus permisos (menú y botones).
    if (editando.value?.id === authStore.user?.rol?.id) await authStore.fetchUser()
  } catch (e) {
    const errs = e.response?.data?.errors
    errorModal.value = errs ? Object.values(errs).flat().join(' ') : (e.response?.data?.message ?? 'Error al guardar el rol.')
  } finally {
    saving.value = false
  }
}

// ── Eliminar ─────────────────────────────────────────────────────────────────
const porEliminar = ref(null)
const eliminando  = ref(false)

function pedirEliminar(rol) {
  if (rol.usuarios_count > 0) {
    error(`No se puede eliminar: ${rol.usuarios_count} usuario(s) tienen este rol. Asígnales otro rol primero.`)
    return
  }
  porEliminar.value = rol
}

async function confirmarEliminar() {
  eliminando.value = true
  try {
    await store.deleteRol(porEliminar.value.id)
    porEliminar.value = null
    await store.fetchRoles()
  } catch (e) {
    error(e.response?.data?.message ?? 'No se pudo eliminar el rol.')
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold text-slate-800">Gestión de Roles</h2>
        <p class="text-sm text-slate-500 mt-0.5">Define qué puede ver y hacer cada rol en el sistema. Los usuarios se asignan a un rol en Usuarios.</p>
      </div>
      <button v-if="authStore.puede('roles.crear')" @click="abrirCrear"
        class="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nuevo rol
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="store.loading && !store.roles.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div class="h-5 w-32 bg-slate-200 rounded animate-pulse" />
        <div class="h-4 w-full bg-slate-200 rounded animate-pulse" />
        <div class="h-4 w-24 bg-slate-200 rounded animate-pulse" />
      </div>
    </div>

    <!-- Roles -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="rol in store.roles" :key="rol.id"
        class="bg-white rounded-xl border p-5 flex flex-col"
        :class="rol.es_admin ? 'border-blue-200' : 'border-slate-200'">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            :class="rol.es_admin ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'">
            <svg v-if="rol.es_admin" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-slate-800 truncate">{{ rol.nombre }}</p>
            <p class="text-xs text-slate-500 mt-0.5 line-clamp-2">{{ rol.descripcion || 'Sin descripción' }}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 mt-4 text-xs">
          <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {{ rol.usuarios_count }} {{ rol.usuarios_count === 1 ? 'usuario' : 'usuarios' }}
          </span>
          <span v-if="rol.es_admin" class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Acceso total</span>
          <span v-else class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            {{ rol.permisos.length }} de {{ totalPermisos }} permisos
          </span>
          <span v-if="!rol.es_admin && rol.permisos.includes('salarios.ver')" class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Ve salarios</span>
        </div>

        <div class="flex items-center justify-end gap-1 mt-auto pt-4">
          <p v-if="rol.es_admin" class="text-xs text-slate-400 mr-auto">No se puede modificar ni eliminar.</p>
          <template v-else>
            <button v-if="authStore.puede('roles.editar')" @click="abrirEditar(rol)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
              Editar permisos
            </button>
            <button v-if="authStore.puede('roles.eliminar')" @click="pedirEliminar(rol)"
              class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Eliminar rol" aria-label="Eliminar rol">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: crear / editar rol con sus permisos -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="cerrarModal">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 class="text-base font-bold text-slate-800">{{ editando ? `Editar rol: ${editando.nombre}` : 'Nuevo rol' }}</h3>
            <p class="text-xs text-slate-500 mt-0.5">{{ marcados.size }} de {{ totalPermisos }} permisos marcados</p>
          </div>
          <button @click="cerrarModal" class="text-slate-400 hover:text-slate-600 transition" aria-label="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="guardar" class="flex flex-col min-h-0 flex-1">
          <div class="px-6 py-5 space-y-5 overflow-y-auto">
            <div v-if="errorModal" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{{ errorModal }}</div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Nombre <span class="text-red-500">*</span></label>
                <input v-model="form.nombre" type="text" maxlength="50" placeholder="Ej. Mercadeo"
                  class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
                <input v-model="form.descripcion" type="text" maxlength="255" placeholder="Para qué sirve este rol"
                  class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            <p v-if="!authStore.isAdmin" class="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              Los permisos en gris son permisos que tu propio rol no tiene: no puedes darlos ni quitarlos.
            </p>

            <!-- Permisos por grupo y módulo -->
            <section v-for="grupo in store.catalogo" :key="grupo.grupo">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{{ grupo.grupo }}</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div v-for="(mod, modulo) in grupo.modulos" :key="modulo"
                  class="rounded-lg border p-3.5"
                  :class="estadoModulo(modulo, mod) === 'ninguno' ? 'border-slate-200' : 'border-blue-200 bg-blue-50/30'">
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <p class="text-sm font-semibold text-slate-800">{{ mod.nombre }}</p>
                    <button type="button" @click="alternarModulo(modulo, mod)"
                      class="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap">
                      {{ estadoModulo(modulo, mod) === 'todos' ? 'Quitar todos' : 'Marcar todos' }}
                      <span class="text-slate-400 font-normal">({{ contarModulo(modulo, mod) }}/{{ Object.keys(mod.permisos).length }})</span>
                    </button>
                  </div>
                  <p v-if="mod.descripcion" class="text-xs text-slate-500 mb-2">{{ mod.descripcion }}</p>
                  <div class="space-y-1.5">
                    <label v-for="(etiqueta, accion) in mod.permisos" :key="accion"
                      class="flex items-center gap-2 text-sm select-none"
                      :class="bloqueado(modulo, accion) ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 cursor-pointer'">
                      <input type="checkbox"
                        :checked="marcados.has(clave(modulo, accion))"
                        :disabled="bloqueado(modulo, accion)"
                        @change="alternar(modulo, accion, mod)"
                        class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50" />
                      {{ etiqueta }}
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <button type="button" @click="cerrarModal"
              class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" :disabled="saving"
              class="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {{ saving ? 'Guardando...' : 'Guardar rol' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- Confirmar eliminación -->
  <Teleport to="body">
    <div v-if="porEliminar" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="!eliminando && (porEliminar = null)">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100 text-red-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-800">Eliminar rol</h3>
            <p class="text-xs text-slate-500 mt-0.5">Se eliminará el rol <span class="font-semibold">{{ porEliminar.nombre }}</span>. Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-1">
          <button type="button" @click="porEliminar = null" :disabled="eliminando"
            class="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
            Cancelar
          </button>
          <button type="button" @click="confirmarEliminar" :disabled="eliminando"
            class="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {{ eliminando ? 'Eliminando...' : 'Sí, eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
