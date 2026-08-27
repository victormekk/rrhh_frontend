<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEmpleadosStore } from '../../stores/empleados'
import api from '../../services/api'

const route   = useRoute()
const router  = useRouter()
const store   = useEmpleadosStore()

const isEdit        = computed(() => !!route.params.id)
const loading       = ref(false)   // spinner del botón Guardar
const formLoading   = ref(true)    // spinner mientras carga datos iniciales
const error         = ref('')
const salarioMinimo = ref(0)

// ── Sanitizadores de input ────────────────────────────────────────────────────
function soloLetras(field, e) {
  const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ\s]/g, '')
  form[field] = val
  e.target.value = val
}
function soloDigitos(field, e) {
  const val = e.target.value.replace(/\D/g, '')
  form[field] = val
  e.target.value = val
}
function soloTelefono(field, e) {
  const val = e.target.value.replace(/[^0-9+\-\s()]/g, '')
  form[field] = val
  e.target.value = val
}

const departamentos = ref([])
const puestos       = ref([])
const bancos        = ref([])

const form = reactive({
  // Datos personales
  nombres: '', apellidos: '', cedula: '', rtn: '', genero: '',
  fecha_nacimiento: '', estado_civil: '', num_hijos: 0,
  nacionalidad: 'Hondureño', residencia: '', telefono: '',
  contacto_emergencia: '', telefono_emergencia: '', correo: '',
  tipo_sangre: '',
  // Asignación
  id_departamento: '', id_puesto: '',
  // Info laboral
  tipo_contrato: '', fecha_inicio: '', moneda: 'Lempiras',
  forma_de_pago: '', salario_base: '', usa_salario_minimo: false,
  num_cuenta: '', id_banco: '',
  // Solo edición
  estado: 'Activo', fecha_cese: '', motivo_cese: '',
})

watch(() => form.usa_salario_minimo, (checked) => {
  if (checked) form.salario_base = salarioMinimo.value
})

onMounted(async () => {
  try {
    const [deps, pues, banc, campos] = await Promise.all([
      api.get('/departamentos'),
      api.get('/puestos'),
      api.get('/bancos'),
      api.get('/campos-variables'),
    ])
    departamentos.value = deps.data
    puestos.value       = pues.data
    bancos.value        = banc.data
    salarioMinimo.value = campos.data.salario_minimo

    if (isEdit.value) {
      const emp = await store.fetchEmpleado(route.params.id)
      const il  = emp.informacion_laboral ?? {}
      Object.assign(form, {
      nombres:              emp.nombres,
      apellidos:            emp.apellidos,
      cedula:               emp.cedula,
      rtn:                  emp.rtn ?? '',
      genero:               emp.genero,
      fecha_nacimiento:     emp.fecha_nacimiento ? String(emp.fecha_nacimiento).slice(0, 10) : '',
      estado_civil:         emp.estado_civil,
      num_hijos:            emp.num_hijos,
      nacionalidad:         emp.nacionalidad,
      residencia:           emp.residencia,
      telefono:             emp.telefono,
      contacto_emergencia:  emp.contacto_emergencia,
      telefono_emergencia:  emp.telefono_emergencia,
      correo:               emp.correo ?? '',
      tipo_sangre:          emp.tipo_sangre,
      id_departamento:      emp.id_departamento,
      id_puesto:            emp.id_puesto,
      tipo_contrato:        il.tipo_contrato ?? '',
      fecha_inicio:         il.fecha_inicio ? String(il.fecha_inicio).slice(0, 10) : '',
      fecha_cese:           il.fecha_cese   ? String(il.fecha_cese).slice(0, 10)   : '',
      motivo_cese:          il.motivo_cese ?? '',
      estado:               il.estado ?? 'Activo',
      moneda:               il.moneda ?? 'Lempiras',
      forma_de_pago:        il.forma_de_pago ?? '',
      salario_base:         il.salario_base ?? '',
      usa_salario_minimo:   il.usa_salario_minimo ?? false,
      num_cuenta:           il.num_cuenta ?? '',
      id_banco:             il.id_banco ?? '',
    })
    }
  } finally {
    formLoading.value = false
  }
})

async function submit() {
  error.value   = ''
  loading.value = true
  try {
    if (isEdit.value) {
      await store.updateEmpleado(route.params.id, { ...form })
    } else {
      await store.createEmpleado({ ...form })
    }
    router.push('/empleados')
  } catch (e) {
    const errs = e.response?.data?.errors
    if (errs) {
      error.value = Object.values(errs).flat().join(' | ')
    } else {
      error.value = e.response?.data?.message ?? 'Error al guardar.'
    }
  } finally {
    loading.value = false
  }
}

function salariosCalculados() {
  const base = parseFloat(form.salario_base)
  if (!base || isNaN(base)) return null
  return {
    quincenal: (base / 2).toFixed(2),
    diario:    (base / 30).toFixed(2),
    por_hora:  (base / 30 / 8).toFixed(2),
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <button @click="router.push('/empleados')" class="text-slate-400 hover:text-slate-600 transition">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </button>
      <h2 class="text-xl font-bold text-slate-800">{{ isEdit ? 'Editar Empleado' : 'Nuevo Empleado' }}</h2>
    </div>

    <!-- Spinner inicial (carga de departamentos, puestos, bancos, datos del empleado) -->
    <div v-if="formLoading" class="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-xl border border-slate-200">
      <svg class="w-10 h-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <p class="text-sm text-slate-500">{{ isEdit ? 'Cargando datos del empleado...' : 'Preparando formulario...' }}</p>
    </div>

    <template v-else>
    <!-- Error -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
      {{ error }}
    </div>

    <form @submit.prevent="submit" class="space-y-6">

      <!-- Datos Personales -->
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h3 class="font-semibold text-slate-700 mb-4 pb-3 border-b border-gray-100 text-sm uppercase tracking-wide">Datos Personales</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <div>
            <label class="label">Nombres <span class="text-red-500">*</span></label>
            <input :value="form.nombres" @input="soloLetras('nombres', $event)" required maxlength="30" class="input" placeholder="Ej. Juan Carlos" autocomplete="off" />
          </div>
          <div>
            <label class="label">Apellidos <span class="text-red-500">*</span></label>
            <input :value="form.apellidos" @input="soloLetras('apellidos', $event)" required maxlength="30" class="input" placeholder="Ej. García López" autocomplete="off" />
          </div>
          <div>
            <label class="label">DNI <span class="text-red-500">*</span></label>
            <input :value="form.cedula" @input="soloDigitos('cedula', $event)" required maxlength="13" inputmode="numeric" class="input font-mono" placeholder="0000000000000" autocomplete="off" />
          </div>

          <div>
            <label class="label">RTN</label>
            <input :value="form.rtn" @input="soloDigitos('rtn', $event)" maxlength="14" inputmode="numeric" class="input font-mono" placeholder="00000000000000" autocomplete="off" />
          </div>
          <div>
            <label class="label">Sexo <span class="text-red-500">*</span></label>
            <select v-model="form.genero" required class="input">
              <option value="">Seleccionar</option>
              <option>Masculino</option>
              <option>Femenino</option>
            </select>
          </div>
          <div>
            <label class="label">Fecha de Nacimiento <span class="text-red-500">*</span></label>
            <input v-model="form.fecha_nacimiento" type="date" required class="input" />
          </div>

          <div>
            <label class="label">Estado Civil <span class="text-red-500">*</span></label>
            <select v-model="form.estado_civil" required class="input">
              <option value="">Seleccionar</option>
              <option>Soltero/a</option>
              <option>Casado/a</option>
              <option>Divorciado/a</option>
              <option>Viudo/a</option>
              <option>Unión Libre</option>
            </select>
          </div>
          <div>
            <label class="label">N° de Hijos</label>
            <input v-model.number="form.num_hijos" type="number" min="0" step="1" class="input" />
          </div>
          <div>
            <label class="label">Tipo de Sangre <span class="text-red-500">*</span></label>
            <select v-model="form.tipo_sangre" required class="input">
              <option value="">Seleccionar</option>
              <option v-for="t in ['A+','A-','B+','B-','AB+','AB-','O+','O-']" :key="t">{{ t }}</option>
            </select>
          </div>

          <div>
            <label class="label">Nacionalidad <span class="text-red-500">*</span></label>
            <input :value="form.nacionalidad" @input="soloLetras('nacionalidad', $event)" required maxlength="50" class="input" autocomplete="off" />
          </div>
          <div class="sm:col-span-2">
            <label class="label">Residencia <span class="text-red-500">*</span></label>
            <input v-model="form.residencia" required maxlength="60" class="input" placeholder="Colonia, ciudad, departamento" />
          </div>

          <div>
            <label class="label">Teléfono <span class="text-red-500">*</span></label>
            <input :value="form.telefono" @input="soloTelefono('telefono', $event)" required maxlength="20" inputmode="tel" class="input" placeholder="+504 0000-0000" autocomplete="off" />
          </div>
          <div>
            <label class="label">Contacto de Emergencia <span class="text-red-500">*</span></label>
            <input :value="form.contacto_emergencia" @input="soloLetras('contacto_emergencia', $event)" required maxlength="50" class="input" autocomplete="off" />
          </div>
          <div>
            <label class="label">Teléfono Emergencia <span class="text-red-500">*</span></label>
            <input :value="form.telefono_emergencia" @input="soloTelefono('telefono_emergencia', $event)" required maxlength="30" inputmode="tel" class="input" autocomplete="off" />
          </div>

          <div class="sm:col-span-2">
            <label class="label">Correo Electrónico</label>
            <input v-model="form.correo" type="email" maxlength="50" class="input" placeholder="correo@ejemplo.com" />
          </div>
        </div>
      </div>

      <!-- Asignación -->
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h3 class="font-semibold text-slate-700 mb-4 pb-3 border-b border-gray-100 text-sm uppercase tracking-wide">Asignación</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Departamento <span class="text-red-500">*</span></label>
            <select v-model="form.id_departamento" required class="input">
              <option value="">Seleccionar departamento</option>
              <option v-for="d in departamentos" :key="d.id" :value="d.id">{{ d.nombre }}</option>
            </select>
          </div>
          <div>
            <label class="label">Puesto <span class="text-red-500">*</span></label>
            <select v-model="form.id_puesto" required class="input">
              <option value="">Seleccionar puesto</option>
              <option v-for="p in puestos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Información Laboral -->
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h3 class="font-semibold text-slate-700 mb-4 pb-3 border-b border-gray-100 text-sm uppercase tracking-wide">Información Laboral</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <div>
            <label class="label">Tipo de Contrato <span class="text-red-500">*</span></label>
            <select v-model="form.tipo_contrato" required class="input">
              <option value="">Seleccionar</option>
              <option>Fijo</option>
              <option>Extra</option>
            </select>
          </div>
          <div>
            <label class="label">Fecha de Inicio <span class="text-red-500">*</span></label>
            <input v-model="form.fecha_inicio" type="date" required class="input" />
          </div>
          <div>
            <label class="label">Moneda <span class="text-red-500">*</span></label>
            <select v-model="form.moneda" required class="input">
              <option>Lempiras</option>
              <option>Dólares</option>
            </select>
          </div>

          <div>
            <label class="label">Forma de Pago <span class="text-red-500">*</span></label>
            <select v-model="form.forma_de_pago" required class="input">
              <option value="">Seleccionar</option>
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Cheque</option>
            </select>
          </div>
          <div>
            <label class="label">
              Salario Base <span class="text-red-500">*</span>
              <span v-if="form.usa_salario_minimo" class="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                Salario mínimo
              </span>
            </label>
            <input
              v-model="form.salario_base"
              type="number" step="0.01" min="0" required
              :disabled="form.usa_salario_minimo"
              :class="['input', form.usa_salario_minimo ? 'bg-blue-50 text-blue-700 cursor-not-allowed' : '']"
              placeholder="0.00"
            />
          </div>
          <div class="flex items-end pb-0.5">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input v-model="form.usa_salario_minimo" type="checkbox" class="w-4 h-4 rounded border-slate-300 text-blue-600" />
              <span class="text-sm text-slate-700">
                Usa salario mínimo
                <span class="text-xs text-slate-400 ml-1">(L {{ Number(salarioMinimo).toLocaleString('es-HN', {minimumFractionDigits:2}) }})</span>
              </span>
            </label>
          </div>

          <!-- Salarios calculados -->
          <div v-if="salariosCalculados()" class="sm:col-span-2 lg:col-span-3">
            <div class="bg-slate-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p class="text-xs text-slate-500">Quincenal</p>
                <p class="font-semibold text-slate-700">L {{ salariosCalculados().quincenal }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Diario</p>
                <p class="font-semibold text-slate-700">L {{ salariosCalculados().diario }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Por Hora</p>
                <p class="font-semibold text-slate-700">L {{ salariosCalculados().por_hora }}</p>
              </div>
            </div>
          </div>

          <div>
            <label class="label">Banco</label>
            <select v-model="form.id_banco" class="input">
              <option value="">Sin banco</option>
              <option v-for="b in bancos" :key="b.id" :value="b.id">{{ b.nombre }}</option>
            </select>
          </div>
          <div>
            <label class="label">N° de Cuenta</label>
            <input v-model="form.num_cuenta" maxlength="25" class="input font-mono" placeholder="000-000-000000" />
          </div>

          <!-- Solo edición: estado del contrato -->
          <template v-if="isEdit">
            <div>
              <label class="label">Estado <span class="text-red-500">*</span></label>
              <select v-model="form.estado" required class="input">
                <option>Activo</option>
                <option>Inactivo</option>
                <option>Suspendido</option>
              </select>
            </div>
            <div>
              <label class="label">Fecha de Cese</label>
              <input v-model="form.fecha_cese" type="date" class="input" />
            </div>
            <div class="sm:col-span-2 lg:col-span-3">
              <label class="label">Motivo de Cese</label>
              <textarea v-model="form.motivo_cese" maxlength="300" rows="2" class="input resize-none" placeholder="Describir el motivo si aplica..." />
            </div>
          </template>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex justify-end gap-3">
        <button type="button" @click="router.push('/empleados')" class="px-5 py-2.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="loading"
          class="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition"
        >
          {{ loading ? 'Guardando...' : (isEdit ? 'Actualizar Empleado' : 'Crear Empleado') }}
        </button>
      </div>
    </form>
    </template>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.label {
  @apply block text-sm font-medium text-slate-700 mb-1.5;
}
.input {
  @apply w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white;
}
</style>
