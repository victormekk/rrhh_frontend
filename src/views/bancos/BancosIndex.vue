<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
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

onMounted(() => {
  store.fetchBancos(false)
  store.fetchSinCuenta()
})

// ── Empleados sin cuenta bancaria ────────────────────────────────
// Cobran por cheque hasta que se les registre una cuenta; al asignarla pasan a
// "Bancos" en las planillas (también en las que siguen abiertas).
const filtros = reactive({ texto: '', tipo: '', departamento: '' })

const departamentosSinCuenta = computed(() =>
  [...new Set(store.sinCuenta.map((e) => e.departamento).filter(Boolean))].sort()
)

const sinCuentaFiltrados = computed(() => {
  const texto = filtros.texto.trim().toUpperCase()
  return store.sinCuenta.filter((e) =>
    (!texto || e.nombre.toUpperCase().includes(texto) || String(e.cedula).includes(texto)) &&
    (!filtros.tipo || e.tipo_contrato === filtros.tipo) &&
    (!filtros.departamento || e.departamento === filtros.departamento)
  )
})

const bancosActivos = computed(() => store.bancos.filter((b) => b.estado === 'Activo'))

const cuenta = reactive({ open: false, empleado: null, id_banco: '', num_cuenta: '', error: '', saving: false })

function abrirCuenta(empleado) {
  Object.assign(cuenta, { open: true, empleado, id_banco: bancosActivos.value[0]?.id ?? '', num_cuenta: '', error: '', saving: false })
}

async function guardarCuenta() {
  if (!cuenta.id_banco || !cuenta.num_cuenta.trim()) {
    cuenta.error = 'Seleccione el banco y escriba el número de cuenta.'
    return
  }
  cuenta.error  = ''
  cuenta.saving = true
  try {
    await store.asignarCuenta(cuenta.empleado.id, { id_banco: cuenta.id_banco, num_cuenta: cuenta.num_cuenta.trim() })
    cuenta.open = false
  } catch (e) {
    const errs = e.response?.data?.errors
    cuenta.error = errs ? Object.values(errs).flat().join(' ') : (e.response?.data?.message ?? 'No se pudo guardar la cuenta.')
  } finally {
    cuenta.saving = false
  }
}

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(String(d).slice(0, 10) + 'T00:00:00')
  return isNaN(date) ? '—' : date.toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })
}

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

  <!-- Empleados sin cuenta bancaria -->
  <div class="mt-10">
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
      <div>
        <h3 class="text-lg font-bold text-slate-800">Empleados sin cuenta bancaria</h3>
        <p class="text-sm text-slate-500 mt-0.5">
          <template v-if="store.loadingSinCuenta">Cargando Información...</template>
          <template v-else-if="store.sinCuenta.length === 0">Todos los empleados activos tienen cuenta registrada.</template>
          <template v-else>
            {{ store.sinCuenta.length }} {{ store.sinCuenta.length === 1 ? 'empleado activo cobra' : 'empleados activos cobran' }} por cheque.
            Al agregarles la cuenta pasan a pagarse por banco.
          </template>
        </p>
      </div>
      <div v-if="store.sinCuenta.length" class="flex flex-wrap gap-2">
        <input v-model="filtros.texto" type="text" placeholder="Buscar por nombre o cédula" class="border border-slate-300 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select v-model="filtros.tipo" class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los tipos</option>
          <option>Fijo</option>
          <option>Extra</option>
        </select>
        <select v-model="filtros.departamento" class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los departamentos</option>
          <option v-for="d in departamentosSinCuenta" :key="d">{{ d }}</option>
        </select>
      </div>
    </div>

    <div v-if="store.sinCuenta.length" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-5 py-3 font-semibold text-slate-600">Empleado</th>
            <th class="text-left px-5 py-3 font-semibold text-slate-600">Departamento</th>
            <th class="text-left px-5 py-3 font-semibold text-slate-600">Cargo</th>
            <th class="text-center px-5 py-3 font-semibold text-slate-600">Tipo</th>
            <th class="text-left px-5 py-3 font-semibold text-slate-600">Inicio</th>
            <th class="text-right px-5 py-3 font-semibold text-slate-600">Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="sinCuentaFiltrados.length === 0">
            <td colspan="6" class="text-center py-10 text-slate-400">Ningún empleado coincide con los filtros.</td>
          </tr>
          <tr v-for="e in sinCuentaFiltrados" :key="e.id" class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="px-5 py-3">
              <p class="font-medium text-slate-800">{{ e.nombre }}</p>
              <p class="text-xs text-slate-400 font-mono">{{ e.cedula }}</p>
            </td>
            <td class="px-5 py-3 text-slate-600">{{ e.departamento ?? '—' }}</td>
            <td class="px-5 py-3 text-slate-600">{{ e.cargo ?? '—' }}</td>
            <td class="px-5 py-3 text-center">
              <span class="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full"
                :class="e.tipo_contrato === 'Fijo' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'">
                {{ e.tipo_contrato }}
              </span>
            </td>
            <td class="px-5 py-3 text-slate-500 text-xs">{{ formatDate(e.fecha_inicio) }}</td>
            <td class="px-5 py-3 text-right">
              <button @click="abrirCuenta(e)"
                class="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Agregar cuenta
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  </div>

  <!-- Modal agregar cuenta -->
  <Teleport to="body">
    <div v-if="cuenta.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="cuenta.open = false">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 class="text-base font-bold text-slate-800">Agregar cuenta bancaria</h3>
        <p class="text-sm text-slate-500 mt-0.5 mb-5">{{ cuenta.empleado?.nombre }}</p>

        <div v-if="cuenta.error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{{ cuenta.error }}</div>

        <form @submit.prevent="guardarCuenta" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Banco</label>
            <select v-model="cuenta.id_banco" class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
              <option v-for="b in bancosActivos" :key="b.id" :value="b.id">{{ b.nombre }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Número de cuenta</label>
            <input v-model="cuenta.num_cuenta" @input="cuenta.num_cuenta = cuenta.num_cuenta.toUpperCase()" maxlength="25" autofocus
              placeholder="000-000-000000" autocomplete="off"
              class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
          </div>
          <p class="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            Desde ahora cobra por transferencia. También se aplica a las planillas de pago y especiales que sigan abiertas; las cerradas no se modifican.
          </p>
          <div class="flex justify-end gap-3 pt-1">
            <button type="button" @click="cuenta.open = false" class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancelar</button>
            <button type="submit" :disabled="cuenta.saving"
              class="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
              {{ cuenta.saving ? 'Guardando...' : 'Guardar cuenta' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

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
