<script setup>
// Reintegrar a un empleado inactivo: nueva fecha de inicio, tipo de contrato y motivo
// obligatorio. La fecha de inicio y el cese anteriores quedan en su historial laboral.
import { ref, reactive, watch } from 'vue'
import { useEmpleadosStore } from '../../stores/empleados'
import { useToast } from '../../composables/useToast'
import { hoyISO, formatFecha, mensajeError, es29Febrero, AVISO_29_FEBRERO } from '../../constants/historialLaboral'

const props = defineProps({
  // { id, nombres, apellidos, informacion_laboral: { tipo_contrato, fecha_inicio, fecha_cese, motivo_cese } } o null
  empleado: { type: Object, default: null },
})
const emit = defineEmits(['cerrar', 'guardado'])

const store = useEmpleadosStore()
const guardando = ref(false)
const error = ref('')
const form = reactive({ fecha_inicio: '', tipo_contrato: '', motivo: '' })

// Fecha de inicio el 29 de febrero: se avisa y se vuelve a la fecha anterior
const { warning } = useToast()
watch(() => form.fecha_inicio, (nueva, anterior) => {
  if (es29Febrero(nueva)) {
    warning(AVISO_29_FEBRERO)
    form.fecha_inicio = es29Febrero(anterior) ? '' : (anterior ?? '')
  }
})

watch(() => props.empleado, (emp) => {
  if (!emp) return
  Object.assign(form, { fecha_inicio: hoyISO(), tipo_contrato: emp.informacion_laboral?.tipo_contrato ?? '', motivo: '' })
  error.value = ''
})

async function guardar() {
  error.value = ''
  guardando.value = true
  try {
    await store.reintegrar(props.empleado.id, { ...form })
    emit('guardado')
  } catch (e) {
    error.value = mensajeError(e, 'No se pudo reintegrar al empleado.')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="empleado"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="!guardando && emit('cerrar')"
    >
      <form @submit.prevent="guardar" class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-bold text-slate-800">Reintegrar empleado</h3>
            <p class="text-xs text-slate-500 mt-0.5 truncate">{{ empleado.nombres }} {{ empleado.apellidos }}</p>
          </div>
        </div>

        <!-- Período anterior: queda en el historial -->
        <div class="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-500">Período anterior</span>
            <span class="font-semibold text-slate-800">
              {{ formatFecha(empleado.informacion_laboral?.fecha_inicio) }} – {{ formatFecha(empleado.informacion_laboral?.fecha_cese) }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Contrato · motivo de cese</span>
            <span class="text-slate-700">{{ empleado.informacion_laboral?.tipo_contrato }} · {{ empleado.informacion_laboral?.motivo_cese ?? '—' }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Nueva fecha de inicio <span class="text-red-500">*</span></label>
            <input v-model="form.fecha_inicio" type="date" required class="input" />
          </div>
          <div>
            <label class="label">Tipo de contrato <span class="text-red-500">*</span></label>
            <select v-model="form.tipo_contrato" required class="input">
              <option value="" disabled>Seleccionar</option>
              <option>Fijo</option>
              <option>Extra</option>
            </select>
          </div>
        </div>

        <div>
          <label class="label">Motivo del reintegro <span class="text-red-500">*</span></label>
          <textarea v-model="form.motivo" required minlength="5" maxlength="500" rows="3" class="input resize-none"
            placeholder="Ej. Regresa por temporada alta" />
        </div>

        <p class="text-xs text-slate-500">
          Después de reintegrarlo, revisa en "Editar" su departamento, cargo y salario por si cambiaron.
        </p>

        <p v-if="error" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</p>

        <div class="flex justify-end gap-3 pt-1">
          <button type="button" @click="emit('cerrar')" :disabled="guardando"
            class="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" :disabled="guardando"
            class="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            <svg v-if="guardando" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            {{ guardando ? 'Guardando...' : 'Reintegrar' }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
@reference "tailwindcss";
.label { @apply block text-sm font-medium text-slate-700 mb-1.5; }
.input { @apply w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white; }
</style>
