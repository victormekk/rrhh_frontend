<script setup>
// Se abre al guardar un empleado al que se le cambió el cargo y/o el departamento en
// "Editar": pide la fecha en que se hace efectivo, que queda en su historial laboral.
import { ref, watch } from 'vue'
import { hoyISO } from '../../constants/historialLaboral'

const props = defineProps({
  // { cargo: { de, a }, departamento: { de, a } } (solo lo que cambió) o null para cerrar
  cambio: { type: Object, default: null },
})
const emit = defineEmits(['cerrar', 'confirmar'])

const fecha         = ref('')
const observaciones = ref('')

watch(() => props.cambio, (c) => {
  if (c) {
    fecha.value         = hoyISO()
    observaciones.value = ''
  }
})

function confirmar() {
  emit('confirmar', { fecha: fecha.value, observaciones: observaciones.value.trim() || null })
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
          <h3 class="text-base font-bold text-slate-800">Cambio de puesto</h3>
          <p class="text-sm text-slate-500 mt-0.5">Quedará en el historial laboral del empleado.</p>
        </div>

        <div class="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm space-y-2">
          <div v-if="cambio.cargo">
            <p class="text-xs text-slate-400 uppercase tracking-wide">Cargo</p>
            <p class="flex flex-wrap items-center gap-2">
              <span class="text-slate-500 line-through">{{ cambio.cargo.de }}</span>
              <span class="text-slate-400">→</span>
              <span class="font-semibold text-slate-800">{{ cambio.cargo.a }}</span>
            </p>
          </div>
          <div v-if="cambio.departamento">
            <p class="text-xs text-slate-400 uppercase tracking-wide">Departamento</p>
            <p class="flex flex-wrap items-center gap-2">
              <span class="text-slate-500 line-through">{{ cambio.departamento.de }}</span>
              <span class="text-slate-400">→</span>
              <span class="font-semibold text-slate-800">{{ cambio.departamento.a }}</span>
            </p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">¿Desde qué fecha? <span class="text-red-500">*</span></label>
          <input
            v-model="fecha"
            type="date" required
            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Observaciones <span class="text-slate-400 font-normal">(opcional)</span></label>
          <textarea
            v-model="observaciones"
            maxlength="500" rows="2"
            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white resize-none"
            placeholder="Ej. Ascenso a capitán de meseros."
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
