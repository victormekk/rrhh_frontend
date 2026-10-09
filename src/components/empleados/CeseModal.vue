<script setup>
// Dar de baja a un empleado: fecha, motivo (lista), liquidación y observaciones.
// Todo queda en su historial laboral.
import { ref, reactive, watch } from 'vue'
import { useEmpleadosStore } from '../../stores/empleados'
import { MOTIVOS_CESE, OPCIONES_LIQUIDACION, hoyISO, formatFecha, mensajeError } from '../../constants/historialLaboral'

const props = defineProps({
  // { id, nombres, apellidos, informacion_laboral: { tipo_contrato, fecha_inicio } } o null para cerrar
  empleado: { type: Object, default: null },
})
const emit = defineEmits(['cerrar', 'guardado'])

const store = useEmpleadosStore()
const guardando = ref(false)
const error = ref('')
const form = reactive({ fecha_cese: '', motivo_cese: '', liquidacion: '', observaciones: '' })

watch(() => props.empleado, (emp) => {
  if (!emp) return
  Object.assign(form, { fecha_cese: hoyISO(), motivo_cese: '', liquidacion: 'Pendiente', observaciones: '' })
  error.value = ''
})

async function guardar() {
  error.value = ''
  guardando.value = true
  try {
    await store.darDeBaja(props.empleado.id, { ...form })
    emit('guardado')
  } catch (e) {
    error.value = mensajeError(e, 'No se pudo dar de baja al empleado.')
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
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-bold text-slate-800">Dar de baja</h3>
            <p class="text-xs text-slate-500 mt-0.5 truncate">{{ empleado.nombres }} {{ empleado.apellidos }}</p>
          </div>
        </div>

        <div class="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm flex justify-between">
          <span class="text-slate-500">{{ empleado.informacion_laboral?.tipo_contrato }} desde</span>
          <span class="font-semibold text-slate-800">{{ formatFecha(empleado.informacion_laboral?.fecha_inicio) }}</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Fecha de cese <span class="text-red-500">*</span></label>
            <input v-model="form.fecha_cese" type="date" required class="input" />
          </div>
          <div>
            <label class="label">¿Se liquidó? <span class="text-red-500">*</span></label>
            <select v-model="form.liquidacion" required class="input">
              <option v-for="o in OPCIONES_LIQUIDACION" :key="o">{{ o }}</option>
            </select>
          </div>
        </div>

        <div>
          <label class="label">Motivo <span class="text-red-500">*</span></label>
          <select v-model="form.motivo_cese" required class="input">
            <option value="" disabled>Seleccionar motivo</option>
            <option v-for="m in MOTIVOS_CESE" :key="m">{{ m }}</option>
          </select>
        </div>

        <div>
          <label class="label">Observaciones</label>
          <textarea v-model="form.observaciones" maxlength="500" rows="2" class="input resize-none" placeholder="Detalle adicional (opcional)" />
        </div>

        <p v-if="form.liquidacion === 'Pendiente'" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Cuando contabilidad confirme la liquidación, márcala como "Sí" desde el historial del empleado o en Movimientos de Personal.
        </p>

        <p v-if="error" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</p>

        <div class="flex justify-end gap-3 pt-1">
          <button type="button" @click="emit('cerrar')" :disabled="guardando"
            class="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" :disabled="guardando"
            class="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            <svg v-if="guardando" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            {{ guardando ? 'Guardando...' : 'Dar de baja' }}
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
