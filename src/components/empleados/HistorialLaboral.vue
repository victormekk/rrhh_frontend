<script setup>
// Línea de tiempo del historial laboral de un empleado (ficha del empleado).
import { ref, watch } from 'vue'
import { useEmpleadosStore } from '../../stores/empleados'
import { useToast } from '../../composables/useToast'
import LoadingSpinner from '../LoadingSpinner.vue'
import { ESTILO_EVENTO, ESTILO_LIQUIDACION, ESTILO_GRADO_INCIDENCIA, OPCIONES_LIQUIDACION, detallePuesto, formatFecha, mensajeError } from '../../constants/historialLaboral'

const props = defineProps({
  idEmpleado: { type: [Number, String], required: true },
  // Cambia cada vez que la ficha registra un movimiento, para recargar.
  version: { type: Number, default: 0 },
})

const store = useEmpleadosStore()
const { error: toastError } = useToast()
const movimientos = ref([])
const cargando = ref(true)
const guardandoId = ref(null)

async function cargar() {
  cargando.value = true
  try {
    // Lo más reciente arriba
    movimientos.value = (await store.fetchHistorial(props.idEmpleado)).slice().reverse()
  } catch {
    toastError('No se pudo cargar el historial laboral.')
  } finally {
    cargando.value = false
  }
}

watch(() => [props.idEmpleado, props.version], cargar, { immediate: true })

async function cambiarLiquidacion(mov, valor) {
  if (valor === mov.liquidacion) return
  guardandoId.value = mov.id
  try {
    const actualizado = await store.actualizarLiquidacion(mov.id, valor)
    Object.assign(mov, actualizado)
  } catch (e) {
    toastError(mensajeError(e, 'No se pudo actualizar la liquidación.'))
  } finally {
    guardandoId.value = null
  }
}

function contrato(m) {
  if (m.tipo_contrato_anterior && m.tipo_contrato_nuevo && m.tipo_contrato_anterior !== m.tipo_contrato_nuevo) {
    return `${m.tipo_contrato_anterior} → ${m.tipo_contrato_nuevo}`
  }
  return m.tipo_contrato_nuevo ?? m.tipo_contrato_anterior ?? null
}
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 p-6">
    <h4 class="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Historial Laboral</h4>

    <LoadingSpinner v-if="cargando" />

    <p v-else-if="movimientos.length === 0" class="text-sm text-slate-400">Sin movimientos registrados.</p>

    <ol v-else class="relative border-l-2 border-slate-100 ml-2 space-y-5">
      <li v-for="m in movimientos" :key="m.id" class="ml-5">
        <span :class="[ESTILO_EVENTO[m.tipo_evento]?.punto ?? 'bg-slate-400', 'absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full ring-4 ring-white']" />

        <div class="flex flex-wrap items-center gap-2">
          <span :class="[ESTILO_EVENTO[m.tipo_evento]?.badge ?? 'bg-slate-100 text-slate-600', 'text-xs font-semibold px-2 py-0.5 rounded-full']">
            {{ m.tipo_evento }}
          </span>
          <span class="text-sm font-semibold text-slate-800">{{ formatFecha(m.fecha) }}</span>
          <span v-if="contrato(m)" class="text-xs text-slate-500">· {{ contrato(m) }}</span>
          <span
            v-if="m.tipo_evento === 'Incidencia'"
            :class="[ESTILO_GRADO_INCIDENCIA[m.grado] ?? 'bg-gray-100 text-gray-600', 'text-xs font-semibold px-2 py-0.5 rounded-full']"
            :title="`Grado de la incidencia: ${m.grado}`"
          >
            {{ m.grado }}
          </span>
        </div>

        <p v-if="m.tipo_evento === 'Incidencia'" class="mt-1.5 text-sm font-medium text-slate-700">{{ m.titulo }}</p>

        <dl v-else class="mt-1.5 text-sm text-slate-600 space-y-0.5">
          <div v-if="m.tipo_evento === 'Cese'">
            Trabajó desde <strong class="text-slate-700">{{ formatFecha(m.fecha_inicio_anterior) }}</strong>.
            Motivo: <strong class="text-slate-700">{{ m.motivo_cese ?? '—' }}</strong>
          </div>
          <template v-if="m.tipo_evento === 'Cambio de puesto'">
            <div v-for="linea in detallePuesto(m)" :key="linea">{{ linea }}</div>
          </template>
          <div v-if="m.fecha_inicio_nueva && m.fecha_inicio_anterior && m.tipo_evento !== 'Ingreso'">
            Fecha de inicio: {{ formatFecha(m.fecha_inicio_anterior) }} → <strong class="text-slate-700">{{ formatFecha(m.fecha_inicio_nueva) }}</strong>
          </div>
          <div v-if="m.observaciones" class="text-slate-500 italic">"{{ m.observaciones }}"</div>

          <!-- Liquidación: editable para pasarla de Pendiente a Sí cuando contabilidad confirme -->
          <div v-if="m.liquidacion" class="flex items-center gap-2 pt-1">
            <span class="text-xs text-slate-400">Liquidación:</span>
            <select
              :value="m.liquidacion"
              @change="cambiarLiquidacion(m, $event.target.value)"
              :disabled="guardandoId === m.id"
              :class="[ESTILO_LIQUIDACION[m.liquidacion], 'text-xs font-semibold rounded-full pl-2 pr-6 py-0.5 border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 disabled:opacity-60']"
            >
              <option v-for="o in OPCIONES_LIQUIDACION" :key="o">{{ o }}</option>
            </select>
            <span v-if="m.fecha_liquidacion" class="text-xs text-slate-400">el {{ formatFecha(m.fecha_liquidacion) }}</span>
          </div>
        </dl>

        <p v-if="m.usuario?.name" class="text-xs text-slate-400 mt-1">Registrado por {{ m.usuario.name }}</p>
      </li>
    </ol>
  </div>
</template>
