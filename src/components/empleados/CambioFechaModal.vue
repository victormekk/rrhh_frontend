<script setup>
// Se abre al guardar un empleado cuya fecha de inicio cambió en "Editar": pide el motivo,
// que queda en su historial laboral junto con la fecha anterior y quién lo registró.
import { ref, watch } from 'vue'
import { formatFecha } from '../../constants/historialLaboral'

const props = defineProps({
  // { anterior, nueva } o null para cerrar
  cambio: { type: Object, default: null },
})
const emit = defineEmits(['cerrar', 'confirmar'])

const motivo = ref('')

watch(() => props.cambio, (c) => { if (c) motivo.value = '' })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="cambio"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="emit('cerrar')"
    >
      <form @submit.prevent="emit('confirmar', motivo.trim())" class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div>
          <h3 class="text-base font-bold text-slate-800">Cambio de fecha de inicio</h3>
          <p class="text-sm text-slate-500 mt-0.5">Quedará en el historial laboral del empleado.</p>
        </div>

        <div class="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span class="text-slate-500 line-through">{{ formatFecha(cambio.anterior) }}</span>
          <span class="text-slate-400">→</span>
          <span class="font-semibold text-slate-800">{{ formatFecha(cambio.nueva) }}</span>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">¿Por qué se cambia? <span class="text-red-500">*</span></label>
          <textarea
            v-model="motivo"
            required minlength="5" maxlength="500" rows="3"
            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white resize-none"
            placeholder="Ej. Se registró mal al crear el empleado; según contrato inició el 15 de enero."
          />
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
