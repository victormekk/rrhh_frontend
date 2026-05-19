<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEmpleadosStore } from '../../stores/empleados'

const route  = useRoute()
const router = useRouter()
const store  = useEmpleadosStore()

const loading      = ref(true)
const fotoInput    = ref(null)
const uploadingFoto = ref(false)

onMounted(async () => {
  await store.fetchEmpleado(route.params.id)
  loading.value = false
})

async function onFotoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  uploadingFoto.value = true
  const res = await store.uploadFoto(route.params.id, file)
  store.empleado.foto_url = res.foto_url
  uploadingFoto.value = false
}

function formatCurrency(val, moneda = 'HNL') {
  if (val == null) return '—'
  const currency = moneda === 'Dólares' ? 'USD' : 'HNL'
  return new Intl.NumberFormat('es-HN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(val)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
}

function estadoClass(estado) {
  const map = {
    Activo:     'bg-emerald-100 text-emerald-700',
    Inactivo:   'bg-red-100 text-red-700',
    Suspendido: 'bg-amber-100 text-amber-700',
  }
  return map[estado] ?? 'bg-gray-100 text-gray-600'
}
</script>

<template>
  <div>
    <!-- Back button -->
    <div class="flex items-center gap-3 mb-6">
      <button @click="router.push('/empleados')" class="text-slate-400 hover:text-slate-600 transition">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </button>
      <h2 class="text-xl font-bold text-slate-800">Ficha del Empleado</h2>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else-if="store.empleado">
      <!-- Profile header card -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div class="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          <!-- Foto -->
          <div class="relative group flex-shrink-0">
            <img
              v-if="store.empleado.foto_url"
              :src="store.empleado.foto_url"
              alt="Foto"
              class="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
            />
            <div v-else class="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-3xl border-4 border-white shadow-md">
              {{ store.empleado.nombres?.charAt(0) }}{{ store.empleado.apellidos?.charAt(0) }}
            </div>
            <button
              @click="fotoInput.click()"
              :disabled="uploadingFoto"
              class="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white shadow hover:bg-blue-700 transition"
              title="Cambiar foto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </button>
            <input ref="fotoInput" type="file" accept="image/*" class="hidden" @change="onFotoChange" />
          </div>

          <!-- Info principal -->
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-3 mb-1">
              <h3 class="text-2xl font-bold text-slate-800">{{ store.empleado.nombres }} {{ store.empleado.apellidos }}</h3>
              <span :class="[estadoClass(store.empleado.informacion_laboral?.estado), 'text-xs font-semibold px-2.5 py-1 rounded-full']">
                {{ store.empleado.informacion_laboral?.estado ?? '—' }}
              </span>
            </div>
            <p class="text-slate-500 text-sm">{{ store.empleado.puesto?.nombre ?? '—' }} · {{ store.empleado.departamento?.nombre ?? '—' }}</p>
            <p class="text-slate-400 text-xs mt-1">Cédula: {{ store.empleado.cedula }}</p>
          </div>

          <!-- Acciones -->
          <button
            @click="router.push(`/empleados/${store.empleado.id}/editar`)"
            class="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
            Editar
          </button>
        </div>
      </div>

      <!-- Details grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Datos Personales -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h4 class="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Datos Personales</h4>
          <dl class="space-y-3">
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Género</dt>
              <dd class="text-slate-700 font-medium">{{ store.empleado.genero }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Nacimiento</dt>
              <dd class="text-slate-700 font-medium">{{ formatDate(store.empleado.fecha_nacimiento) }} ({{ store.empleado.edad }} años)</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Estado Civil</dt>
              <dd class="text-slate-700 font-medium">{{ store.empleado.estado_civil }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">N° de Hijos</dt>
              <dd class="text-slate-700 font-medium">{{ store.empleado.num_hijos }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Tipo de Sangre</dt>
              <dd class="text-slate-700 font-medium">{{ store.empleado.tipo_sangre }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Nacionalidad</dt>
              <dd class="text-slate-700 font-medium">{{ store.empleado.nacionalidad }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Residencia</dt>
              <dd class="text-slate-700 font-medium">{{ store.empleado.residencia }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Teléfono</dt>
              <dd class="text-slate-700 font-medium">{{ store.empleado.telefono }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Correo</dt>
              <dd class="text-slate-700 font-medium">{{ store.empleado.correo ?? '—' }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Emergencia</dt>
              <dd class="text-slate-700 font-medium">{{ store.empleado.contacto_emergencia }} · {{ store.empleado.telefono_emergencia }}</dd>
            </div>
          </dl>
        </div>

        <!-- Información Laboral -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h4 class="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Información Laboral</h4>
          <dl class="space-y-3" v-if="store.empleado.informacion_laboral">
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Tipo Contrato</dt>
              <dd class="text-slate-700 font-medium">{{ store.empleado.informacion_laboral.tipo_contrato }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Fecha Inicio</dt>
              <dd class="text-slate-700 font-medium">{{ formatDate(store.empleado.informacion_laboral.fecha_inicio) }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Salario Base</dt>
              <dd class="text-slate-700 font-bold text-base">{{ formatCurrency(store.empleado.informacion_laboral.salario_base, store.empleado.informacion_laboral.moneda) }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Quincenal</dt>
              <dd class="text-slate-700 font-medium">{{ formatCurrency(store.empleado.informacion_laboral.salario_quincenal, store.empleado.informacion_laboral.moneda) }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Diario</dt>
              <dd class="text-slate-700 font-medium">{{ formatCurrency(store.empleado.informacion_laboral.salario_diario, store.empleado.informacion_laboral.moneda) }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Forma de Pago</dt>
              <dd class="text-slate-700 font-medium">{{ store.empleado.informacion_laboral.forma_de_pago }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Banco</dt>
              <dd class="text-slate-700 font-medium">{{ store.empleado.informacion_laboral.banco?.nombre ?? '—' }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">N° Cuenta</dt>
              <dd class="text-slate-700 font-medium font-mono">{{ store.empleado.informacion_laboral.num_cuenta ?? '—' }}</dd>
            </div>
            <div v-if="store.empleado.informacion_laboral.fecha_cese" class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-slate-400">Fecha Cese</dt>
              <dd class="text-red-600 font-medium">{{ formatDate(store.empleado.informacion_laboral.fecha_cese) }}</dd>
            </div>
            <div v-if="store.empleado.informacion_laboral.motivo_cese" class="text-sm">
              <dt class="text-slate-400 mb-1">Motivo de Cese</dt>
              <dd class="text-slate-700 bg-slate-50 rounded p-2 text-xs">{{ store.empleado.informacion_laboral.motivo_cese }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </template>
  </div>
</template>
