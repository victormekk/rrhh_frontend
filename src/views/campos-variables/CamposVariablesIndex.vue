<script setup>
import { ref, onMounted } from 'vue'
import { useCamposVariablesStore } from '../../stores/camposVariables'
import { useToast } from '../../composables/useToast'

const store = useCamposVariablesStore()
const { error: toastError } = useToast()

const form = ref({ ihss: 297.58, salario_minimo: 16317.60 })
const resultado = ref(null)
const error     = ref('')
const confirmando = ref(false)
const cambioSalario = ref(false)

onMounted(async () => {
  await store.fetchCampos()
  form.value = { ...store.campos }
})

function formatLPS(val) {
  return new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

function detectarCambioSalario() {
  cambioSalario.value = parseFloat(form.value.salario_minimo) !== parseFloat(store.campos.salario_minimo)
}

function solicitarGuardar() {
  error.value   = ''
  resultado.value = null
  detectarCambioSalario()

  if (!form.value.ihss || parseFloat(form.value.ihss) < 0) {
    error.value = 'El valor de IHSS debe ser mayor o igual a cero.'
    return
  }
  if (!form.value.salario_minimo || parseFloat(form.value.salario_minimo) <= 0) {
    error.value = 'El salario mínimo debe ser mayor a cero.'
    return
  }

  confirmando.value = true
}

async function confirmarGuardar() {
  confirmando.value = false
  try {
    const res = await store.saveCampos({
      ihss:           parseFloat(form.value.ihss),
      salario_minimo: parseFloat(form.value.salario_minimo),
    })
    resultado.value = res
    cambioSalario.value = false
  } catch (e) {
    const msgs = e.response?.data?.errors
    if (msgs) {
      error.value = Object.values(msgs).flat().join(' ')
    } else {
      error.value = e.response?.data?.message ?? 'Error al guardar los cambios.'
    }
  }
}

function cancelarConfirmar() {
  confirmando.value = false
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">

    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-slate-800">Campos Variables</h2>
      <p class="text-sm text-slate-500 mt-0.5">Configura los valores globales que afectan el cálculo de planillas y salarios.</p>
    </div>

    <!-- Alerta resultado -->
    <div v-if="resultado" class="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
      <svg class="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <div class="text-sm text-emerald-800">
        <p class="font-semibold">Campos actualizados correctamente.</p>
        <p v-if="resultado.empleados_actualizados > 0" class="mt-0.5">
          {{ resultado.empleados_actualizados }} empleado(s) con salario mínimo actualizado automáticamente.
        </p>
      </div>
      <button @click="resultado = null" class="ml-auto text-emerald-500 hover:text-emerald-700">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Alerta error -->
    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
      <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
      </svg>
      <p class="text-sm text-red-700">{{ error }}</p>
    </div>

    <!-- Loading skeleton -->
    <template v-if="store.loading">
      <div class="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-4">
        <div class="h-4 bg-gray-200 rounded w-1/3"></div>
        <div class="h-10 bg-gray-100 rounded"></div>
        <div class="h-4 bg-gray-200 rounded w-1/4 mt-4"></div>
        <div class="h-4 bg-gray-100 rounded w-1/2"></div>
        <div class="h-10 bg-gray-100 rounded"></div>
      </div>
    </template>

    <!-- Formulario -->
    <template v-else>

      <!-- Card IHSS -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-800">Deducción IHSS Quincenal</p>
            <p class="text-xs text-slate-500">Monto fijo descontado a cada empleado en cada planilla.</p>
          </div>
        </div>
        <div class="px-6 py-5">
          <label class="block text-xs font-medium text-slate-600 mb-1.5">Monto quincenal (L.)</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-medium pointer-events-none">L.</span>
            <input
              v-model="form.ihss"
              type="number"
              step="0.01"
              min="0"
              placeholder="297.58"
              class="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <p class="text-xs text-slate-400 mt-2">
            Valor actual en BD: <span class="font-semibold text-slate-600">L. {{ formatLPS(store.campos.ihss) }}</span>
          </p>
        </div>
      </div>

      <!-- Card Salario Mínimo -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-800">Salario Mínimo Mensual</p>
            <p class="text-xs text-slate-500">Al cambiar este valor, todos los empleados con salario mínimo serán actualizados automáticamente.</p>
          </div>
        </div>
        <div class="px-6 py-5">
          <label class="block text-xs font-medium text-slate-600 mb-1.5">Salario mínimo mensual (L.)</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-medium pointer-events-none">L.</span>
            <input
              v-model="form.salario_minimo"
              type="number"
              step="0.01"
              min="0"
              placeholder="16317.60"
              class="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div class="mt-2 space-y-1">
            <p class="text-xs text-slate-400">
              Valor actual en BD: <span class="font-semibold text-slate-600">L. {{ formatLPS(store.campos.salario_minimo) }}</span>
            </p>
            <div class="text-xs text-slate-400 grid grid-cols-3 gap-x-4">
              <span>Quincenal: <strong class="text-slate-600">L. {{ formatLPS(form.salario_minimo / 2) }}</strong></span>
              <span>Diario: <strong class="text-slate-600">L. {{ formatLPS(form.salario_minimo / 30) }}</strong></span>
              <span>Por hora: <strong class="text-slate-600">L. {{ formatLPS(form.salario_minimo / 30 / 8) }}</strong></span>
            </div>
          </div>

          <!-- Advertencia cambio salario -->
          <div
            v-if="parseFloat(form.salario_minimo) !== parseFloat(store.campos.salario_minimo)"
            class="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2"
          >
            <svg class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            <p class="text-xs text-amber-700">
              Se detectó un cambio en el salario mínimo. Al guardar, los empleados con <strong>salario mínimo vinculado</strong> serán recalculados automáticamente.
            </p>
          </div>
        </div>
      </div>

      <!-- Botón guardar -->
      <div class="flex justify-end">
        <button
          @click="solicitarGuardar"
          :disabled="store.saving"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg v-if="store.saving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
          </svg>
          {{ store.saving ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </div>

    </template>

    <!-- Modal de confirmación -->
    <Teleport to="body">
      <div v-if="confirmando" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="cancelarConfirmar"></div>
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
            </div>
            <h3 class="text-base font-bold text-slate-800">Confirmar cambios</h3>
          </div>

          <div class="space-y-2 text-sm text-slate-600">
            <p>¿Estás seguro de que deseas guardar los siguientes cambios?</p>
            <ul class="mt-2 space-y-1 text-xs bg-slate-50 rounded-lg p-3 border border-slate-200">
              <li class="flex justify-between">
                <span class="text-slate-500">IHSS quincenal</span>
                <span class="font-semibold text-slate-800">L. {{ formatLPS(form.ihss) }}</span>
              </li>
              <li class="flex justify-between">
                <span class="text-slate-500">Salario mínimo</span>
                <span class="font-semibold text-slate-800">L. {{ formatLPS(form.salario_minimo) }}</span>
              </li>
            </ul>
            <p v-if="cambioSalario" class="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
              Esto actualizará automáticamente el salario de todos los empleados con salario mínimo vinculado.
            </p>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button
              @click="cancelarConfirmar"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm text-slate-700 hover:bg-gray-50 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
            <button
              @click="confirmarGuardar"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Sí, guardar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
