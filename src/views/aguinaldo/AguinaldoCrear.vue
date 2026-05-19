<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAguinaldoStore } from '../../stores/aguinaldo'

const router  = useRouter()
const store   = useAguinaldoStore()

const loading = ref(false)
const error   = ref('')

const form = reactive({
  nombre_aguinaldo: '',
  tipo_aguinaldo:   'Fijos',
  fecha_generada:   new Date().toISOString().split('T')[0],
})

function sugerirNombre() {
  const anio = new Date().getFullYear()
  const tipos = { Fijos: 'Fijos', Extras: 'Extras', Ambos: '' }
  const suf   = tipos[form.tipo_aguinaldo]
  form.nombre_aguinaldo = suf
    ? `Aguinaldo ${suf} ${anio}`
    : `Aguinaldo ${anio}`
}

async function submit() {
  error.value   = ''
  loading.value = true
  try {
    await store.crear({ ...form })
    router.push(`/aguinaldo/${encodeURIComponent(form.nombre_aguinaldo)}`)
  } catch (e) {
    const errs = e.response?.data?.errors
    error.value = errs
      ? Object.values(errs).flat().join(' | ')
      : e.response?.data?.message ?? 'Error al generar el aguinaldo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <button @click="router.push('/aguinaldo')" class="text-slate-400 hover:text-slate-600 transition">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </button>
      <h2 class="text-xl font-bold text-slate-800">Generar Aguinaldo</h2>
    </div>

    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
      {{ error }}
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <form @submit.prevent="submit" class="space-y-5">

        <!-- Tipo -->
        <div>
          <label class="label">Tipo de Aguinaldo <span class="text-red-500">*</span></label>
          <div class="grid grid-cols-3 gap-3">
            <label
              v-for="tipo in ['Fijos', 'Extras', 'Ambos']"
              :key="tipo"
              :class="[
                'flex flex-col items-center gap-2 border-2 rounded-xl p-4 cursor-pointer transition text-sm font-medium',
                form.tipo_aguinaldo === tipo
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              ]"
            >
              <input type="radio" v-model="form.tipo_aguinaldo" :value="tipo" class="sr-only" @change="sugerirNombre" />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path v-if="tipo==='Fijos'" stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                <path v-else-if="tipo==='Extras'" stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1012 10.5m0-5.625a2.625 2.625 0 100 5.625M12 10.5V21m0-10.5H6.375c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125H12m0 0h5.625c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H12" />
              </svg>
              {{ tipo }}
            </label>
          </div>
        </div>

        <!-- Nombre -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="label mb-0">Nombre del Aguinaldo <span class="text-red-500">*</span></label>
            <button type="button" @click="sugerirNombre" class="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Auto-completar
            </button>
          </div>
          <input
            v-model="form.nombre_aguinaldo"
            required
            maxlength="50"
            class="input"
            placeholder="Ej. Aguinaldo Fijos 2026"
          />
        </div>

        <!-- Fecha -->
        <div>
          <label class="label">Fecha de Generación <span class="text-red-500">*</span></label>
          <input v-model="form.fecha_generada" type="date" required class="input" />
        </div>

        <!-- Info -->
        <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
          <p class="font-semibold mb-1">¿Qué se generará?</p>
          <ul class="list-disc list-inside space-y-0.5 text-xs">
            <li v-if="form.tipo_aguinaldo !== 'Extras'">
              Empleados <strong>Fijos</strong>: aguinaldo = (salario mensual / 365) × días trabajados
            </li>
            <li v-if="form.tipo_aguinaldo !== 'Fijos'">
              Empleados <strong>Extras</strong>: aguinaldo = diario × días promedio de planillas
            </li>
            <li>Solo empleados con estado <strong>Activo</strong></li>
            <li>Anticipos se pueden registrar individualmente después</li>
          </ul>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="router.push('/aguinaldo')" class="px-5 py-2.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition flex items-center gap-2"
          >
            <svg v-if="loading" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ loading ? 'Generando...' : 'Generar Aguinaldo' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.label { @apply block text-sm font-medium text-slate-700 mb-1.5; }
.input { @apply w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition; }
</style>
