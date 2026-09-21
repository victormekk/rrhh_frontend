<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDepartamentosStore } from '../../stores/departamentos'
import { useCargosStore }       from '../../stores/cargos'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

const deptStore  = useDepartamentosStore()
const cargoStore = useCargosStore()
const authStore  = useAuthStore()
const { error } = useToast()

// ── filtros ──────────────────────────────────────────────────────────────────
const verInactivosDept   = ref(false)
const verInactivosCargo = ref(false)

const listaDept = computed(() =>
  verInactivosDept.value
    ? deptStore.departamentos
    : deptStore.departamentos.filter((d) => d.estado === 'Activo')
)

const listaCargo = computed(() =>
  verInactivosCargo.value
    ? cargoStore.cargos
    : cargoStore.cargos.filter((p) => p.estado === 'Activo')
)

onMounted(() => {
  deptStore.fetchDepartamentos(false)
  cargoStore.fetchCargos(false)
})

// ── modal genérico ────────────────────────────────────────────────────────────
// tipo: 'dept' | 'cargo'
const showModal  = ref(false)
const modalTipo  = ref('dept')
const editando   = ref(null)
const saving     = ref(false)
const errorModal = ref('')
const form       = ref({ nombre: '', estado: 'Activo' })

function abrirCrear(tipo) {
  modalTipo.value  = tipo
  editando.value   = null
  form.value       = { nombre: '', estado: 'Activo' }
  errorModal.value = ''
  showModal.value  = true
}

function abrirEditar(tipo, item) {
  modalTipo.value  = tipo
  editando.value   = item
  form.value       = { nombre: item.nombre.toUpperCase(), estado: item.estado }
  errorModal.value = ''
  showModal.value  = true
}

function cerrarModal() {
  showModal.value = false
}

function mayusculas(e) {
  const val = e.target.value.toUpperCase()
  form.value.nombre = val
  e.target.value = val
}

async function guardar() {
  if (!form.value.nombre.trim()) {
    errorModal.value = 'El nombre es requerido.'
    return
  }
  errorModal.value = ''
  saving.value     = true
  try {
    const nombre = form.value.nombre.trim().toUpperCase()
    if (modalTipo.value === 'dept') {
      editando.value
        ? await deptStore.updateDepartamento(editando.value.id, { ...form.value, nombre })
        : await deptStore.createDepartamento({ nombre })
    } else {
      editando.value
        ? await cargoStore.updateCargo(editando.value.id, { ...form.value, nombre })
        : await cargoStore.createCargo({ nombre })
    }
    cerrarModal()
  } catch (e) {
    errorModal.value =
      e.response?.data?.errors?.nombre?.[0] ??
      e.response?.data?.message ??
      'Error al guardar.'
  } finally {
    saving.value = false
  }
}

// ── modal confirmación de desactivar ─────────────────────────────────────────
const showConfirm  = ref(false)
const confirmItem  = ref(null)
const confirmTipo  = ref('dept')
const desactivando = ref(false)

function desactivar(tipo, item) {
  confirmTipo.value = tipo
  confirmItem.value = item
  showConfirm.value = true
}

function cancelarDesactivar() {
  showConfirm.value = false
  confirmItem.value = null
}

async function confirmarDesactivar() {
  const tipo  = confirmTipo.value
  const item  = confirmItem.value
  const label = tipo === 'dept' ? 'departamento' : 'cargo'
  desactivando.value = true
  try {
    tipo === 'dept'
      ? await deptStore.deleteDepartamento(item.id)
      : await cargoStore.deleteCargo(item.id)
    cancelarDesactivar()
  } catch (e) {
    error(e.response?.data?.message ?? `No se pudo desactivar el ${label}.`)
    cancelarDesactivar()
  } finally {
    desactivando.value = false
  }
}

// ── habilitar (reactivar) ─────────────────────────────────────────────────────
const habilitandoId = ref(null)

async function habilitar(tipo, item) {
  const label = tipo === 'dept' ? 'departamento' : 'cargo'
  habilitandoId.value = item.id
  try {
    tipo === 'dept'
      ? await deptStore.updateDepartamento(item.id, { nombre: item.nombre, estado: 'Activo' })
      : await cargoStore.updateCargo(item.id, { nombre: item.nombre, estado: 'Activo' })
  } catch {
    error(`No se pudo habilitar el ${label}.`)
  } finally {
    habilitandoId.value = null
  }
}

const modalLabel   = computed(() => modalTipo.value === 'dept' ? 'departamento' : 'cargo')
const confirmLabel = computed(() => confirmTipo.value === 'dept' ? 'departamento' : 'cargo')

// ── modal confirmación de eliminar (permanente, solo admin) ──────────────────
const showConfirmEliminar = ref(false)
const confirmEliminarItem = ref(null)
const confirmEliminarTipo = ref('dept')
const eliminando          = ref(false)

function eliminar(tipo, item) {
  confirmEliminarTipo.value = tipo
  confirmEliminarItem.value = item
  showConfirmEliminar.value = true
}

function cancelarEliminar() {
  showConfirmEliminar.value = false
  confirmEliminarItem.value = null
}

async function confirmarEliminar() {
  const tipo  = confirmEliminarTipo.value
  const item  = confirmEliminarItem.value
  const label = tipo === 'dept' ? 'departamento' : 'cargo'
  eliminando.value = true
  try {
    tipo === 'dept'
      ? await deptStore.eliminarDepartamento(item.id)
      : await cargoStore.eliminarCargo(item.id)
    cancelarEliminar()
  } catch (e) {
    error(e.response?.data?.message ?? `No se pudo eliminar el ${label}.`)
    cancelarEliminar()
  } finally {
    eliminando.value = false
  }
}

const eliminarLabel = computed(() => confirmEliminarTipo.value === 'dept' ? 'departamento' : 'cargo')
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-xl font-bold text-slate-800">Estructura Organizacional</h2>
      <p class="text-sm text-slate-500 mt-0.5">Administra los departamentos y cargos de la empresa</p>
    </div>

    <!-- Dos paneles -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- ── DEPARTAMENTOS ───────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
        <!-- Cabecera del panel -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-blue-600"></div>
            <h3 class="font-semibold text-slate-700">Departamentos</h3>
            <span class="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {{ deptStore.departamentos.filter(d => d.estado === 'Activo').length }} activos
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="verInactivosDept = !verInactivosDept"
              class="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
              :class="verInactivosDept ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50'"
            >
              {{ verInactivosDept ? 'Ocultar inactivos' : 'Ver inactivos' }}
            </button>
            <button
              @click="abrirCrear('dept')"
              class="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo
            </button>
          </div>
        </div>

        <!-- Tabla departamentos -->
        <div class="flex-1 overflow-y-auto">
          <table class="w-full text-sm">
            <tbody>
              <template v-if="deptStore.loading">
                <tr v-for="i in 4" :key="i" class="border-b border-slate-100">
                  <td class="px-5 py-3"><div class="h-4 w-40 bg-slate-200 rounded animate-pulse" /></td>
                  <td class="px-5 py-3"><div class="h-5 w-14 bg-slate-200 rounded-full animate-pulse" /></td>
                  <td class="px-5 py-3"><div class="h-4 w-16 bg-slate-200 rounded animate-pulse ml-auto" /></td>
                </tr>
              </template>

              <tr v-else-if="listaDept.length === 0">
                <td colspan="3" class="text-center py-10 text-slate-400 text-sm">Sin departamentos registrados.</td>
              </tr>

              <tr
                v-else
                v-for="dep in listaDept"
                :key="dep.id"
                class="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                :class="dep.estado === 'Inactivo' ? 'opacity-55' : ''"
              >
                <td class="px-5 py-3 font-medium text-slate-800">{{ dep.nombre }}</td>
                <td class="px-5 py-3">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="dep.estado === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                  >
                    {{ dep.estado }}
                  </span>
                </td>
                <td class="px-5 py-3 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1">
                    <button @click="abrirEditar('dept', dep)" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition" title="Editar">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button v-if="dep.estado === 'Activo'" @click="desactivar('dept', dep)" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Desactivar">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                    <button
                      v-if="dep.estado === 'Inactivo'"
                      @click="habilitar('dept', dep)"
                      :disabled="habilitandoId === dep.id"
                      class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition disabled:opacity-60"
                      title="Habilitar"
                    >
                      <svg v-if="habilitandoId === dep.id" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button v-if="authStore.isAdmin && dep.estado === 'Inactivo'" @click="eliminar('dept', dep)" class="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition" title="Eliminar permanentemente">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── CARGOS ─────────────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
        <!-- Cabecera del panel -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-purple-600"></div>
            <h3 class="font-semibold text-slate-700">Cargos</h3>
            <span class="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {{ cargoStore.cargos.filter(p => p.estado === 'Activo').length }} activos
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="verInactivosCargo = !verInactivosCargo"
              class="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
              :class="verInactivosCargo ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50'"
            >
              {{ verInactivosCargo ? 'Ocultar inactivos' : 'Ver inactivos' }}
            </button>
            <button
              @click="abrirCrear('cargo')"
              class="inline-flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo
            </button>
          </div>
        </div>

        <!-- Tabla cargos -->
        <div class="flex-1 overflow-y-auto">
          <table class="w-full text-sm">
            <tbody>
              <template v-if="cargoStore.loading">
                <tr v-for="i in 4" :key="i" class="border-b border-slate-100">
                  <td class="px-5 py-3"><div class="h-4 w-40 bg-slate-200 rounded animate-pulse" /></td>
                  <td class="px-5 py-3"><div class="h-5 w-14 bg-slate-200 rounded-full animate-pulse" /></td>
                  <td class="px-5 py-3"><div class="h-4 w-16 bg-slate-200 rounded animate-pulse ml-auto" /></td>
                </tr>
              </template>

              <tr v-else-if="listaCargo.length === 0">
                <td colspan="3" class="text-center py-10 text-slate-400 text-sm">Sin cargos registrados.</td>
              </tr>

              <tr
                v-else
                v-for="pst in listaCargo"
                :key="pst.id"
                class="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                :class="pst.estado === 'Inactivo' ? 'opacity-55' : ''"
              >
                <td class="px-5 py-3 font-medium text-slate-800">{{ pst.nombre }}</td>
                <td class="px-5 py-3">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="pst.estado === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                  >
                    {{ pst.estado }}
                  </span>
                </td>
                <td class="px-5 py-3 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1">
                    <button @click="abrirEditar('cargo', pst)" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition" title="Editar">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button v-if="pst.estado === 'Activo'" @click="desactivar('cargo', pst)" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Desactivar">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                    <button
                      v-if="pst.estado === 'Inactivo'"
                      @click="habilitar('cargo', pst)"
                      :disabled="habilitandoId === pst.id"
                      class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition disabled:opacity-60"
                      title="Habilitar"
                    >
                      <svg v-if="habilitandoId === pst.id" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button v-if="authStore.isAdmin && pst.estado === 'Inactivo'" @click="eliminar('cargo', pst)" class="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition" title="Eliminar permanentemente">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal compartido crear/editar -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="cerrarModal"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 class="text-base font-bold text-slate-800 mb-5 capitalize">
          {{ editando ? 'Editar' : 'Nuevo' }} {{ modalLabel }}
        </h3>

        <div v-if="errorModal" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {{ errorModal }}
        </div>

        <form @submit.prevent="guardar" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
            <input
              :value="form.nombre"
              @input="mayusculas"
              type="text"
              maxlength="50"
              :placeholder="modalTipo === 'dept' ? 'Ej. RECEPCIÓN' : 'Ej. RECEPCIONISTA'"
              class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              autofocus
            />
          </div>

          <div v-if="editando">
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Estado</label>
            <select
              v-model="form.estado"
              class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="cerrarModal"
              class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="inline-flex items-center gap-1.5 px-5 py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              :class="modalTipo === 'dept' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-purple-700 hover:bg-purple-800'"
            >
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

  <!-- Modal confirmación desactivar -->
  <Teleport to="body">
    <div
      v-if="showConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="cancelarDesactivar"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">

        <!-- Encabezado -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-800 capitalize">Desactivar {{ confirmLabel }}</h3>
            <p class="text-xs text-slate-500 mt-0.5">Esta acción cambiará el estado a inactivo</p>
          </div>
        </div>

        <!-- Detalle -->
        <div class="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm space-y-1">
          <div class="flex justify-between items-center">
            <span class="text-slate-500 capitalize">{{ confirmLabel }}</span>
            <span class="font-semibold text-slate-800">{{ confirmItem?.nombre }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Estado actual</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Activo</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Nuevo estado</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Inactivo</span>
          </div>
        </div>

        <p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Los empleados asignados a este {{ confirmLabel }} no serán afectados, pero no aparecerá en nuevas asignaciones.
        </p>

        <!-- Acciones -->
        <div class="flex justify-end gap-3 pt-1">
          <button
            type="button"
            @click="cancelarDesactivar"
            :disabled="desactivando"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
          <button
            type="button"
            @click="confirmarDesactivar"
            :disabled="desactivando"
            class="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            <svg v-if="desactivando" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            {{ desactivando ? 'Desactivando...' : 'Sí, desactivar' }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>

  <!-- Modal confirmación eliminar permanente (solo admin) -->
  <Teleport to="body">
    <div
      v-if="showConfirmEliminar"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="cancelarEliminar"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">

        <!-- Encabezado -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-800 capitalize">Eliminar {{ eliminarLabel }}</h3>
            <p class="text-xs text-slate-500 mt-0.5">Esta acción es permanente y no se puede deshacer</p>
          </div>
        </div>

        <!-- Detalle -->
        <div class="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm">
          <div class="flex justify-between items-center">
            <span class="text-slate-500 capitalize">{{ eliminarLabel }}</span>
            <span class="font-semibold text-slate-800">{{ confirmEliminarItem?.nombre }}</span>
          </div>
        </div>

        <p class="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          El registro se borrará por completo de la base de datos. Si hay empleados asignados,
          no se podrá eliminar.
        </p>

        <!-- Acciones -->
        <div class="flex justify-end gap-3 pt-1">
          <button
            type="button"
            @click="cancelarEliminar"
            :disabled="eliminando"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
          <button
            type="button"
            @click="confirmarEliminar"
            :disabled="eliminando"
            class="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            <svg v-if="eliminando" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            {{ eliminando ? 'Eliminando...' : 'Sí, eliminar' }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>
