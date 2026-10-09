<script setup>
// Se abre al guardar un empleado cuyo tipo de contrato cambió (Extra ↔ Fijo) sin que se vaya:
// ¿se respeta su fecha de inicio o se le liquida y se le da una nueva? Queda en el historial.
import { reactive, watch } from 'vue'
import { useToast } from '../../composables/useToast'
import { OPCIONES_LIQUIDACION, hoyISO, formatFecha, es29Febrero, AVISO_29_FEBRERO } from '../../constants/historialLaboral'

const props = defineProps({
  // { de, a, fechaInicio } o null para cerrar
  cambio: { type: Object, default: null },
})
const emit = defineEmits(['cerrar', 'confirmar'])

const form = reactive({ modo: 'respetar', fecha_inicio: '', liquidacion: 'Pendiente', observaciones: '' })

// Fecha de inicio el 29 de febrero: se avisa y se vuelve a la fecha anterior
const { warning } = useToast()
watch(() => form.fecha_inicio, (nueva, anterior) => {
  if (es29Febrero(nueva)) {
    warning(AVISO_29_FEBRERO)
    form.fecha_inicio = es29Febrero(anterior) ? '' : (anterior ?? '')
  }
})

watch(() => props.cambio, (c) => {
  if (!c) return
  Object.assign(form, { modo: 'respetar', fecha_inicio: hoyISO(), liquidacion: 'Pendiente', observaciones: '' })
})

function confirmar() {
  const payload = { modo: form.modo, observaciones: form.observaciones || null }
  if (form.modo === 'nueva_fecha') {
    payload.fecha_inicio = form.fecha_inicio
    payload.liquidacion  = form.liquidacion
  }
  emit('confirmar', payload)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="cambio"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="emit('cerrar')"
    >
      <form @submit.prevent="confirmar" class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div>
          <h3 class="text-base font-bold text-slate-800">Cambio de tipo de contrato</h3>
          <p class="text-sm text-slate-500 mt-0.5">
            De <strong class="text-slate-700">{{ cambio.de }}</strong> a <strong class="text-slate-700">{{ cambio.a }}</strong>.
            ¿Cómo se maneja su antigüedad?
          </p>
        </div>

        <div class="space-y-2">
          <label class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
            :class="form.modo === 'respetar' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'">
            <input v-model="form.modo" type="radio" value="respetar" class="mt-0.5" />
            <span class="text-sm">
              <span class="font-semibold text-slate-800">Se respeta la fecha de inicio</span>
              <span class="block text-xs text-slate-500">Sigue contando desde el {{ formatFecha(cambio.fechaInicio) }}.</span>
            </span>
          </label>
          <label class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
            :class="form.modo === 'nueva_fecha' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'">
            <input v-model="form.modo" type="radio" value="nueva_fecha" class="mt-0.5" />
            <span class="text-sm">
              <span class="font-semibold text-slate-800">Se liquida y se da nueva fecha de inicio</span>
              <span class="block text-xs text-slate-500">La fecha anterior queda guardada en su historial.</span>
            </span>
          </label>
        </div>

        <div v-if="form.modo === 'nueva_fecha'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Nueva fecha de inicio <span class="text-red-500">*</span></label>
            <input v-model="form.fecha_inicio" type="date" required class="input" />
          </div>
          <div>
            <label class="label">¿Se liquidó? <span class="text-red-500">*</span></label>
            <select v-model="form.liquidacion" required class="input">
              <option v-for="o in OPCIONES_LIQUIDACION" :key="o">{{ o }}</option>
            </select>
          </div>
        </div>

        <div>
          <label class="label">Observaciones</label>
          <textarea v-model="form.observaciones" maxlength="500" rows="2" class="input resize-none" placeholder="Opcional" />
        </div>

        <div class="flex justify-end gap-3 pt-1">
          <button type="button" @click="emit('cerrar')"
            class="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button type="submit"
            class="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors">
            Confirmar y guardar
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
