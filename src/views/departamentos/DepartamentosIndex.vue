<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDepartamentosStore } from '../../stores/departamentos'
import { usePuestosStore }       from '../../stores/puestos'
import { useToast } from '../../composables/useToast'

const deptStore  = useDepartamentosStore()
const puestoStore = usePuestosStore()
const { error } = useToast()

// ── filtros ──────────────────────────────────────────────────────────────────
const verInactivosDept   = ref(false)
const verInactivosPuesto = ref(false)

const listaDept = computed(() =>
  verInactivosDept.value
    ? deptStore.departamentos
    : deptStore.departamentos.filter((d) => d.estado === 'Activo')
)

const listaPuesto = computed(() =>
  verInactivosPuesto.value
    ? puestoStore.puestos
    : puestoStore.puestos.filter((p) => p.estado === 'Activo')
)

onMounted(() => {
  deptStore.fetchDepartamentos(false)
  puestoStore.fetchPuestos(false)
})

// ── modal genérico ────────────────────────────────────────────────────────────
// tipo: 'dept' | 'puesto'
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
  form.value       = { nombre: item.nombre, estado: item.estado }
  errorModal.value = ''
  showModal.value  = true
}

function cerrarModal() {
  showModal.value = false
}

async function guardar() {
  if (!form.value.nombre.trim()) {
    errorModal.value = 'El nombre es requerido.'
    return
  }
  errorModal.value = ''
  saving.value     = true
  try {
    if (modalTipo.value === 'dept') {
      editando.value
        ? await deptStore.updateDepartamento(editando.value.id, form.value)
        : await deptStore.createDepartamento({ nombre: form.value.nombre.trim() })
    } else {
      editando.value
        ? await puestoStore.updatePuesto(editando.value.id, form.value)
        : await puestoStore.createPuesto({ nombre: form.value.nombre.trim() })
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

async function desactivar(tipo, item) {
  const label = tipo === 'dept' ? 'departamento' : 'puesto'
  if (!confirm(`¿Desactivar el ${label} "${item.nombre}"?`)) return
  try {
    tipo === 'dept'
      ? await deptStore.deleteDepartamento(item.id)
      : await puestoStore.deletePuesto(item.id)
  } catch {
    error(`No se pudo desactivar el ${label}.`)
  }
}

const modalLabel = computed(() => modalTipo.value === 'dept' ? 'departamento' : 'puesto')
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-xl font-bold text-slate-800">Estructura Organizacional</h2>
      <p class="text-sm text-slate-500 mt-0.5">Administra los departamentos y puestos de la empresa</p>
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
                <tr v-for="i in 4" :key="i" class="border-b border-slate-50">
                  <td class="px-5 py-3"><div class="h-4 w-40 bg-slate-100 rounded animate-pulse" /></td>
                  <td class="px-5 py-3"><div class="h-5 w-14 bg-slate-100 rounded-full animate-pulse" /></td>
                  <td class="px-5 py-3"><div class="h-4 w-16 bg-slate-100 rounded animate-pulse ml-auto" /></td>
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
                  <button @click="abrirEditar('dept', dep)" class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium mr-3 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                    </svg>
                    Editar
                  </button>
                  <button
                    v-if="dep.estado === 'Activo'"
                    @click="desactivar('dept', dep)"
                    class="inline-flex items-center gap-1 text-red-500 hover:text-red-700 font-medium transition-colors"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Desactivar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── PUESTOS ─────────────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
        <!-- Cabecera del panel -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-purple-600"></div>
            <h3 class="font-semibold text-slate-700">Puestos</h3>
            <span class="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {{ puestoStore.puestos.filter(p => p.estado === 'Activo').length }} activos
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="verInactivosPuesto = !verInactivosPuesto"
              class="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
              :class="verInactivosPuesto ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50'"
            >
              {{ verInactivosPuesto ? 'Ocultar inactivos' : 'Ver inactivos' }}
            </button>
            <button
              @click="abrirCrear('puesto')"
              class="inline-flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo
            </button>
          </div>
        </div>

        <!-- Tabla puestos -->
        <div class="flex-1 overflow-y-auto">
          <table class="w-full text-sm">
            <tbody>
              <template v-if="puestoStore.loading">
                <tr v-for="i in 4" :key="i" class="border-b border-slate-50">
                  <td class="px-5 py-3"><div class="h-4 w-40 bg-slate-100 rounded animate-pulse" /></td>
                  <td class="px-5 py-3"><div class="h-5 w-14 bg-slate-100 rounded-full animate-pulse" /></td>
                  <td class="px-5 py-3"><div class="h-4 w-16 bg-slate-100 rounded animate-pulse ml-auto" /></td>
                </tr>
              </template>

              <tr v-else-if="listaPuesto.length === 0">
                <td colspan="3" class="text-center py-10 text-slate-400 text-sm">Sin puestos registrados.</td>
              </tr>

              <tr
                v-else
                v-for="pst in listaPuesto"
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
                  <button @click="abrirEditar('puesto', pst)" class="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium mr-3 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                    </svg>
                    Editar
                  </button>
                  <button
                    v-if="pst.estado === 'Activo'"
                    @click="desactivar('puesto', pst)"
                    class="inline-flex items-center gap-1 text-red-500 hover:text-red-700 font-medium transition-colors"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Desactivar
                  </button>
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
              v-model="form.nombre"
              type="text"
              maxlength="50"
              :placeholder="modalTipo === 'dept' ? 'Ej. Recepción' : 'Ej. Recepcionista'"
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
</template>
