<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBancosStore } from '../../stores/bancos'
import { useToast } from '../../composables/useToast'

const store = useBancosStore()
const { error } = useToast()

const mostrarInactivos = ref(false)
const showModal        = ref(false)
const editando         = ref(null)
const saving           = ref(false)
const errorModal       = ref('')
const form             = ref({ nombre: '', estado: 'Activo' })

const lista = computed(() =>
  mostrarInactivos.value
    ? store.bancos
    : store.bancos.filter((b) => b.estado === 'Activo')
)

onMounted(() => store.fetchBancos(false))

function abrirCrear() {
  editando.value   = null
  form.value       = { nombre: '' }
  errorModal.value = ''
  showModal.value  = true
}

function abrirEditar(banco) {
  editando.value   = banco
  form.value       = { nombre: banco.nombre, estado: banco.estado }
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
    editando.value
      ? await store.updateBanco(editando.value.id, form.value)
      : await store.createBanco({ nombre: form.value.nombre.trim() })
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

async function desactivar(banco) {
  if (!confirm(`¿Desactivar el banco "${banco.nombre}"?`)) return
  try {
    await store.deleteBanco(banco.id)
  } catch {
    error('No se pudo desactivar el banco.')
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-slate-800">Bancos</h2>
        <p class="text-sm text-slate-500 mt-0.5">Entidades bancarias registradas en el sistema</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="mostrarInactivos = !mostrarInactivos"
          class="text-sm px-3 py-2 rounded-lg border transition-colors"
          :class="mostrarInactivos
            ? 'bg-slate-100 border-slate-300 text-slate-700'
            : 'border-slate-200 text-slate-500 hover:bg-slate-50'"
        >
          {{ mostrarInactivos ? 'Ocultar inactivos' : 'Ver inactivos' }}
        </button>
        <button
          @click="abrirCrear"
          class="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo banco
        </button>
      </div>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-5 py-3 font-semibold text-slate-600">#</th>
            <th class="text-left px-5 py-3 font-semibold text-slate-600">Nombre</th>
            <th class="text-left px-5 py-3 font-semibold text-slate-600">Estado</th>
            <th class="text-right px-5 py-3 font-semibold text-slate-600">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <!-- Skeleton -->
          <template v-if="store.loading">
            <tr v-for="i in 5" :key="i" class="border-b border-slate-100">
              <td class="px-5 py-3"><div class="h-4 w-6 bg-slate-200 rounded animate-pulse" /></td>
              <td class="px-5 py-3"><div class="h-4 w-48 bg-slate-200 rounded animate-pulse" /></td>
              <td class="px-5 py-3"><div class="h-5 w-16 bg-slate-200 rounded-full animate-pulse" /></td>
              <td class="px-5 py-3 text-right"><div class="h-4 w-20 bg-slate-200 rounded animate-pulse ml-auto" /></td>
            </tr>
          </template>

          <!-- Vacío -->
          <tr v-else-if="lista.length === 0">
            <td colspan="4" class="text-center py-12 text-slate-400">No hay bancos registrados.</td>
          </tr>

          <!-- Datos -->
          <tr
            v-else
            v-for="(banco, idx) in lista"
            :key="banco.id"
            class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            :class="banco.estado === 'Inactivo' ? 'opacity-60' : ''"
          >
            <td class="px-5 py-3 text-slate-400">{{ idx + 1 }}</td>
            <td class="px-5 py-3 font-medium text-slate-800">{{ banco.nombre }}</td>
            <td class="px-5 py-3">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="banco.estado === 'Activo'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'"
              >
                {{ banco.estado }}
              </span>
            </td>
            <td class="px-5 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button @click="abrirEditar(banco)" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition" title="Editar">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                </button>
                <button v-if="banco.estado === 'Activo'" @click="desactivar(banco)" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Desactivar">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal crear/editar -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="cerrarModal"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 class="text-base font-bold text-slate-800 mb-5">
          {{ editando ? 'Editar banco' : 'Nuevo banco' }}
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
              maxlength="30"
              placeholder="Ej. Banco Atlántida"
              autofocus
              class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
              class="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
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
