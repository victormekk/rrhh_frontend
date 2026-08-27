<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlanillasStore } from '../../stores/planillas'

const router  = useRouter()
const store   = usePlanillasStore()

const loading = ref(false)
const error   = ref('')

const form = reactive({
  nombre_planilla: '',
  tipo_planilla:   'Fijos',
  fecha_generada:  new Date().toISOString().split('T')[0],
})

function sugerirNombre() {
  const now    = new Date()
  const mes    = now.toLocaleDateString('es-HN', { month: 'long' })
  const anio   = now.getFullYear()
  const quince = now.getDate() <= 15 ? '1ra' : '2da'
  const tipo   = form.tipo_planilla

  if (tipo === 'Fijos') {
    form.nombre_planilla = `Planilla ${quince} Quincena ${mes.charAt(0).toUpperCase() + mes.slice(1)} ${anio}`
  } else if (tipo === 'Extras') {
    form.nombre_planilla = `Planilla Extras ${mes.charAt(0).toUpperCase() + mes.slice(1)} ${anio}`
  } else {
    form.nombre_planilla = `Planilla Especial ${mes.charAt(0).toUpperCase() + mes.slice(1)} ${anio}`
  }
}

async function submit() {
  error.value   = ''
  loading.value = true
  try {
    const planilla = await store.createPlanilla({ ...form })
    router.push(`/planillas/${planilla.id}`)
  } catch (e) {
    const errs = e.response?.data?.errors
    error.value = errs
      ? Object.values(errs).flat().join(' | ')
      : e.response?.data?.message ?? 'Error al generar la planilla.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <button @click="router.push('/planillas')" class="text-slate-400 hover:text-slate-600 transition">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </button>
      <h2 class="text-xl font-bold text-slate-800">Nueva Planilla</h2>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
      {{ error }}
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <form @submit.prevent="submit" class="space-y-5">

        <div>
          <label class="label">Tipo de Planilla <span class="text-red-500">*</span></label>
          <div class="grid grid-cols-3 gap-3">
            <label
              v-for="tipo in ['Fijos', 'Extras', 'Especial']"
              :key="tipo"
              :class="[
                'flex flex-col items-center gap-2 border-2 rounded-xl p-4 cursor-pointer transition text-sm font-medium',
                form.tipo_planilla === tipo
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              ]"
            >
              <input type="radio" v-model="form.tipo_planilla" :value="tipo" class="sr-only" @change="sugerirNombre" />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path v-if="tipo==='Fijos'" stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                <path v-else-if="tipo==='Extras'" stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {{ tipo }}
            </label>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="label mb-0">Nombre de la Planilla <span class="text-red-500">*</span></label>
            <button type="button" @click="sugerirNombre" class="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Auto-completar
            </button>
          </div>
          <input
            v-model="form.nombre_planilla"
            required
            maxlength="50"
            class="input"
            placeholder="Ej. Planilla 1ra Quincena Mayo 2026"
          />
        </div>

        <div>
          <label class="label">Fecha de Generación <span class="text-red-500">*</span></label>
          <input v-model="form.fecha_generada" type="date" required class="input" />
        </div>

        <!-- Info box -->
        <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
          <p class="font-semibold mb-1">¿Qué se generará?</p>
          <ul class="list-disc list-inside space-y-0.5 text-xs">
            <li>Una fila por cada empleado <strong>Activo</strong> en el sistema</li>
            <li>IHSS (3.5%), RAP (1.5%) e ISR calculados automáticamente</li>
            <li v-if="form.tipo_planilla === 'Fijos'">15 días trabajados por defecto (planilla Fijos)</li>
            <li v-else>0 días trabajados — editable manualmente por empleado</li>
            <li>Cuotas de deducciones activas incluidas automáticamente</li>
          </ul>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="router.push('/planillas')" class="px-5 py-2.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition flex items-center gap-2"
          >
            <svg v-if="loading" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            {{ loading ? 'Generando...' : 'Generar Planilla' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.label { @apply block text-sm font-medium text-slate-700 mb-1.5; }
.input { @apply w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition; }
</style>
