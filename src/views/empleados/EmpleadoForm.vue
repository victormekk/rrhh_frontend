<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEmpleadosStore } from '../../stores/empleados'
import api from '../../services/api'
import CambioContratoModal from '../../components/empleados/CambioContratoModal.vue'
import CambioFechaModal from '../../components/empleados/CambioFechaModal.vue'
import CambioPuestoModal from '../../components/empleados/CambioPuestoModal.vue'
import { formatFecha, es29Febrero, AVISO_29_FEBRERO } from '../../constants/historialLaboral'
import { useToast } from '../../composables/useToast'

const route   = useRoute()
const router  = useRouter()
const store   = useEmpleadosStore()

const isEdit        = computed(() => !!route.params.id)
const loading       = ref(false)   // spinner del botón Guardar
const formLoading   = ref(true)    // spinner mientras carga datos iniciales
const error         = ref('')
const loadError     = ref('')      // si falla la carga del empleado a editar, no se muestra el form
const salarioMinimo = ref(0)

// ── Sanitizadores de input ────────────────────────────────────────────────────
// Todo texto libre se normaliza a mayúsculas para mantener un formato unificado.
function soloLetras(field, e) {
  const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ\s]/g, '').toUpperCase()
  form[field] = val
  e.target.value = val
}
function soloDigitos(field, e) {
  const val = e.target.value.replace(/\D/g, '')
  form[field] = val
  e.target.value = val
}
// DNI: números y guiones (el carnet de residencia de extranjeros trae guiones).
function soloDigitosYGuiones(field, e) {
  const val = e.target.value.replace(/[^0-9-]/g, '')
  form[field] = val
  e.target.value = val
}
function soloTelefono(field, e) {
  const val = e.target.value.replace(/[^0-9+\-\s()]/g, '')
  form[field] = val
  e.target.value = val
}
function mayusculas(field, e) {
  const val = e.target.value.toUpperCase()
  form[field] = val
  e.target.value = val
}

const departamentos = ref([])
const cargos          = ref([])
const bancos        = ref([])

const form = reactive({
  // Datos personales
  nombres: '', apellidos: '', cedula: '', codigo_biometrico: '', rtn: '', genero: '',
  fecha_nacimiento: '', estado_civil: '', num_hijos: 0,
  nacionalidad: 'HONDUREÑO', residencia: '', telefono: '',
  contacto_emergencia: '', parentesco_emergencia: '', telefono_emergencia: '', correo: '',
  tipo_sangre: '',
  // Asignación
  id_departamento: '', id_cargo: '',
  // Info laboral
  tipo_contrato: '', fecha_inicio: '', moneda: 'Lempiras',
  // Por defecto todo empleado nuevo cobra por cheque; si se le agrega cuenta
  // bancaria en Informacion Laboral, la planilla lo detecta automaticamente
  // como pago por transferencia (ver "Exportar Bancos"/"Exportar Cheques").
  forma_de_pago: 'Cheque', salario_base: '', usa_salario_minimo: false, sin_promedio_dias: false,
  num_cuenta: '', id_banco: '',
  // Solo edición (Inactivo solo con "Dar de baja"; volver a Activo solo con "Reintegrar")
  estado: 'Activo',
})

// Valores al cargar el empleado: para detectar cambio de contrato y saber si está inactivo.
const original = reactive({ tipo_contrato: '', fecha_inicio: '', estado: '', id_cargo: null, id_departamento: null })

// Aviso según forma de pago y cuenta (ver InformacionLaboral::cuentaParaPago en el backend)
const avisoPago = computed(() => {
  const tieneCuenta = !!form.num_cuenta?.trim()
  if (form.forma_de_pago === 'Transferencia' && !tieneCuenta) {
    return { clase: 'bg-amber-50 border-amber-200 text-amber-700', texto: 'Sin número de cuenta no se le puede depositar: en planillas y aguinaldos saldrá en el listado de cheques.' }
  }
  if (form.forma_de_pago && form.forma_de_pago !== 'Transferencia' && tieneCuenta) {
    return { clase: 'bg-blue-50 border-blue-200 text-blue-700', texto: `Cobrará por ${form.forma_de_pago.toLowerCase()} aunque tenga cuenta. La cuenta se conserva: cuando vuelva a cobrar en banco, basta con cambiar la forma de pago a Transferencia.` }
  }
  return null
})

const { warning } = useToast()

// Fecha de inicio el 29 de febrero: se avisa y se vuelve a la fecha anterior
watch(() => form.fecha_inicio, (nueva, anterior) => {
  if (es29Febrero(nueva)) {
    warning(AVISO_29_FEBRERO)
    form.fecha_inicio = es29Febrero(anterior) ? '' : (anterior ?? '')
  }
})

watch(() => form.usa_salario_minimo, (checked) => {
  if (checked) form.salario_base = salarioMinimo.value
})

onMounted(async () => {
  try {
    const [deps, crgs, banc, campos] = await Promise.all([
      api.get('/departamentos'),
      api.get('/cargos'),
      api.get('/bancos'),
      api.get('/campos-variables'),
    ])
    departamentos.value = deps.data
    cargos.value        = crgs.data
    bancos.value        = banc.data
    salarioMinimo.value = campos.data.salario_minimo

    if (isEdit.value) {
      try {
        const emp = await store.fetchEmpleado(route.params.id)
        const il  = emp.informacion_laboral ?? {}
        Object.assign(form, {
        nombres:              emp.nombres?.toUpperCase() ?? '',
        apellidos:            emp.apellidos?.toUpperCase() ?? '',
        cedula:               emp.cedula,
        codigo_biometrico:    emp.codigo_biometrico ?? '',
        rtn:                  emp.rtn ?? '',
        genero:               emp.genero,
        fecha_nacimiento:     emp.fecha_nacimiento ? String(emp.fecha_nacimiento).slice(0, 10) : '',
        estado_civil:         emp.estado_civil,
        num_hijos:            emp.num_hijos,
        nacionalidad:         emp.nacionalidad?.toUpperCase() ?? '',
        residencia:           emp.residencia?.toUpperCase() ?? '',
        telefono:             emp.telefono,
        contacto_emergencia:  emp.contacto_emergencia?.toUpperCase() ?? '',
        parentesco_emergencia: emp.parentesco_emergencia?.toUpperCase() ?? '',
        telefono_emergencia:  emp.telefono_emergencia,
        correo:               emp.correo ?? '',
        tipo_sangre:          emp.tipo_sangre,
        id_departamento:      emp.id_departamento,
        id_cargo:            emp.id_cargo,
        tipo_contrato:        il.tipo_contrato ?? '',
        fecha_inicio:         il.fecha_inicio ? String(il.fecha_inicio).slice(0, 10) : '',
        estado:               il.estado ?? 'Activo',
        moneda:               il.moneda ?? 'Lempiras',
        forma_de_pago:        il.forma_de_pago ?? '',
        salario_base:         il.salario_base ?? '',
        usa_salario_minimo:   il.usa_salario_minimo ?? false,
        sin_promedio_dias:    il.sin_promedio_dias ?? false,
        num_cuenta:           il.num_cuenta?.toUpperCase() ?? '',
        id_banco:             il.id_banco ?? '',
      })
      Object.assign(original, {
        tipo_contrato: form.tipo_contrato, fecha_inicio: form.fecha_inicio, estado: form.estado,
        id_cargo: form.id_cargo, id_departamento: form.id_departamento,
      })
      } catch (e) {
        // Si falla la carga, NO mostramos el formulario: hacerlo con campos
        // vacíos permitiría guardar y borrar datos reales del empleado.
        loadError.value = 'No se pudieron cargar los datos del empleado. Recarga la página antes de continuar.'
      }
    }
  } finally {
    formLoading.value = false
  }
})

// ── DNI: no se puede registrar a la misma persona dos veces ───────────────────
const dniExistente = ref(null) // { id, nombre, cedula, estado, fecha_cese }
let ultimaVerificacion = 0

async function verificarDni() {
  const cedula = form.cedula.trim()
  const id = ++ultimaVerificacion
  if (cedula.replace(/\D/g, '').length < 6) { dniExistente.value = null; return }
  try {
    const res = await store.verificarDni(cedula, isEdit.value ? route.params.id : undefined)
    if (id === ultimaVerificacion) dniExistente.value = res.existe ? res.empleado : null
  } catch {
    // Si falla la verificación, el backend igual rechaza el duplicado al guardar.
  }
}

watch(() => form.cedula, () => { dniExistente.value = null })

// ── Cambio de tipo de contrato (Extra ↔ Fijo) ────────────────────────────────
const cambioPendiente = ref(null) // datos para el modal

// ── Cambio de la fecha de inicio: pide el motivo (queda en el historial laboral) ──
const cambioFechaPendiente = ref(null) // { anterior, nueva } para el modal

// ── Cambio de cargo y/o departamento: pide la fecha en que se hace efectivo ──
const cambioPuestoPendiente = ref(null) // { cargo?: { de, a }, departamento?: { de, a } }

const nombreDe = (lista, id) => lista.find((x) => x.id === id)?.nombre ?? '—'

// Antes de guardar se piden, en orden, los datos del cambio de contrato y el motivo
// del cambio de fecha. Cada modal, al confirmar, vuelve a llamar a continuarGuardado().
let cambioContratoConfirmado = null
let motivoFechaConfirmado    = null
let cambioPuestoConfirmado   = null

async function submit() {
  if (dniExistente.value) {
    error.value = 'El DNI ya pertenece a otro empleado. Revisa el aviso junto al DNI.'
    return
  }
  cambioContratoConfirmado = null
  motivoFechaConfirmado    = null
  cambioPuestoConfirmado   = null
  await continuarGuardado()
}

async function continuarGuardado() {
  if (isEdit.value) {
    const cambiaContrato = original.tipo_contrato && form.tipo_contrato !== original.tipo_contrato
    if (cambiaContrato && !cambioContratoConfirmado) {
      cambioPendiente.value = { de: original.tipo_contrato, a: form.tipo_contrato, fechaInicio: original.fecha_inicio }
      return
    }
    // Si el cambio de contrato asigna nueva fecha, ese modal ya la registra.
    const fechaPorContrato = cambioContratoConfirmado?.modo === 'nueva_fecha'
    if (!fechaPorContrato && form.fecha_inicio !== original.fecha_inicio && !motivoFechaConfirmado) {
      cambioFechaPendiente.value = { anterior: original.fecha_inicio, nueva: form.fecha_inicio }
      return
    }
    const cambiaCargo = original.id_cargo && form.id_cargo !== original.id_cargo
    const cambiaDepto = original.id_departamento && form.id_departamento !== original.id_departamento
    if ((cambiaCargo || cambiaDepto) && !cambioPuestoConfirmado) {
      cambioPuestoPendiente.value = {
        cargo:        cambiaCargo ? { de: nombreDe(cargos.value, original.id_cargo), a: nombreDe(cargos.value, form.id_cargo) } : null,
        departamento: cambiaDepto ? { de: nombreDe(departamentos.value, original.id_departamento), a: nombreDe(departamentos.value, form.id_departamento) } : null,
      }
      return
    }
  }
  await guardar(cambioContratoConfirmado, motivoFechaConfirmado, cambioPuestoConfirmado)
}

async function confirmarCambioContrato(cambio) {
  cambioPendiente.value = null
  cambioContratoConfirmado = cambio
  await continuarGuardado()
}

async function confirmarCambioFecha(motivo) {
  cambioFechaPendiente.value = null
  motivoFechaConfirmado = motivo
  await continuarGuardado()
}

async function confirmarCambioPuesto(cambio) {
  cambioPuestoPendiente.value = null
  cambioPuestoConfirmado = cambio
  await continuarGuardado()
}

async function guardar(cambioContrato = null, motivoCambioFecha = null, cambioPuesto = null) {
  error.value   = ''
  loading.value = true
  try {
    if (isEdit.value) {
      await store.updateEmpleado(route.params.id, { ...form, cambio_contrato: cambioContrato, motivo_cambio_fecha: motivoCambioFecha, cambio_puesto: cambioPuesto })
    } else {
      await store.createEmpleado({ ...form })
    }
    router.push('/empleados')
  } catch (e) {
    if (e.response?.data?.empleado_existente) dniExistente.value = e.response.data.empleado_existente
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

    <!-- Spinner inicial (carga de departamentos, cargos, bancos, datos del empleado) -->
    <div v-if="formLoading" class="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-xl border border-slate-200">
      <svg class="w-10 h-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <p class="text-sm text-slate-500">Cargando Información...</p>
    </div>

    <!-- Falló la carga del empleado: no se muestra el formulario para evitar guardar datos vacíos -->
    <div v-else-if="loadError" class="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-xl border border-red-200">
      <p class="text-sm text-red-600 font-medium text-center px-6">{{ loadError }}</p>
      <button @click="router.push('/empleados')" class="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
        Volver a Empleados
      </button>
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

          <!-- Nombres | Apellidos | Fecha de Nacimiento -->
          <div>
            <label class="label">Nombres <span class="text-red-500">*</span></label>
            <input :value="form.nombres" @input="soloLetras('nombres', $event)" required maxlength="30" class="input" placeholder="Ej. JUAN CARLOS" autocomplete="off" />
          </div>
          <div>
            <label class="label">Apellidos <span class="text-red-500">*</span></label>
            <input :value="form.apellidos" @input="soloLetras('apellidos', $event)" required maxlength="30" class="input" placeholder="Ej. GARCÍA LÓPEZ" autocomplete="off" />
          </div>
          <div>
            <label class="label">Fecha de Nacimiento <span class="text-red-500">*</span></label>
            <input v-model="form.fecha_nacimiento" type="date" required class="input" />
          </div>

          <!-- DNI | RTN | Teléfono -->
          <div>
            <label class="label">DNI <span class="text-red-500">*</span></label>
            <input :value="form.cedula" @input="soloDigitosYGuiones('cedula', $event)" @blur="verificarDni" required maxlength="30"
              :class="['input font-mono', dniExistente ? 'border-red-400' : '']" placeholder="0000000000000" autocomplete="off" />
            <!-- La misma persona no se registra dos veces: si está inactiva, se reintegra -->
            <div v-if="dniExistente" class="mt-1.5 text-xs rounded-lg px-2.5 py-2 border"
              :class="dniExistente.estado === 'Inactivo' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-700'">
              <template v-if="dniExistente.estado === 'Inactivo'">
                Este DNI es de <strong>{{ dniExistente.nombre }}</strong>, inactivo
                <template v-if="dniExistente.fecha_cese">desde el {{ formatFecha(dniExistente.fecha_cese) }}</template>.
                <RouterLink :to="{ path: `/empleados/${dniExistente.id}`, query: { reintegrar: 1 } }" class="font-semibold underline">
                  Reintegrarlo
                </RouterLink>
              </template>
              <template v-else>
                Este DNI ya pertenece a
                <RouterLink :to="`/empleados/${dniExistente.id}`" class="font-semibold underline">{{ dniExistente.nombre }}</RouterLink>.
              </template>
            </div>
          </div>
          <div>
            <label class="label">RTN</label>
            <input :value="form.rtn" @input="soloDigitos('rtn', $event)" maxlength="14" inputmode="numeric" class="input font-mono" placeholder="00000000000000" autocomplete="off" />
          </div>
          <div>
            <label class="label">Teléfono <span class="text-red-500">*</span></label>
            <input :value="form.telefono" @input="soloTelefono('telefono', $event)" required maxlength="20" inputmode="tel" class="input" placeholder="+504 0000-0000" autocomplete="off" />
          </div>

          <!-- Sexo | N° de Hijos | Tipo de Sangre -->
          <div>
            <label class="label">Sexo <span class="text-red-500">*</span></label>
            <select v-model="form.genero" required class="input">
              <option value="">Seleccionar</option>
              <option>Masculino</option>
              <option>Femenino</option>
            </select>
          </div>
          <div>
            <label class="label">N° de Hijos</label>
            <input v-model.number="form.num_hijos" type="text" inputmode="numeric" pattern="[0-9]*" class="input" />
          </div>
          <div>
            <label class="label">Tipo de Sangre <span class="text-red-500">*</span></label>
            <select v-model="form.tipo_sangre" required class="input">
              <option value="">Seleccionar</option>
              <option v-for="t in ['A+','A-','B+','B-','AB+','AB-','O+','O-']" :key="t">{{ t }}</option>
            </select>
          </div>

          <!-- Nacionalidad | Residencia | Código Biométrico -->
          <div>
            <label class="label">Nacionalidad <span class="text-red-500">*</span></label>
            <input :value="form.nacionalidad" @input="soloLetras('nacionalidad', $event)" required maxlength="50" class="input" autocomplete="off" />
          </div>
          <div>
            <label class="label">Residencia <span class="text-red-500">*</span></label>
            <input :value="form.residencia" @input="mayusculas('residencia', $event)" required maxlength="60" class="input" placeholder="COLONIA, CIUDAD, DEPARTAMENTO" />
          </div>
          <div>
            <label class="label">Código Biométrico</label>
            <input v-model="form.codigo_biometrico" maxlength="20" class="input font-mono" placeholder="ID en el reloj marcador" autocomplete="off" />
          </div>

          <!-- Correo Electrónico | Estado Civil -->
          <div class="sm:col-span-2">
            <label class="label">Correo Electrónico</label>
            <input v-model="form.correo" type="email" maxlength="50" class="input" placeholder="correo@ejemplo.com" />
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

          <!-- Contacto de Emergencia | Teléfono de Emergencia | Parentesco -->
          <div>
            <label class="label">Contacto de Emergencia <span class="text-red-500">*</span></label>
            <input :value="form.contacto_emergencia" @input="soloLetras('contacto_emergencia', $event)" required maxlength="50" class="input" autocomplete="off" />
          </div>
          <div>
            <label class="label">Teléfono de Emergencia <span class="text-red-500">*</span></label>
            <input :value="form.telefono_emergencia" @input="soloTelefono('telefono_emergencia', $event)" required maxlength="30" inputmode="tel" class="input" autocomplete="off" />
          </div>
          <div>
            <label class="label">Parentesco <span class="text-red-500">*</span></label>
            <input :value="form.parentesco_emergencia" @input="soloLetras('parentesco_emergencia', $event)" required maxlength="30" class="input" placeholder="Ej. MADRE" autocomplete="off" />
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
            <label class="label">Cargo <span class="text-red-500">*</span></label>
            <select v-model="form.id_cargo" required class="input">
              <option value="">Seleccionar cargo</option>
              <option v-for="p in cargos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
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
              type="text" inputmode="decimal" required
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

          <!-- Solo extras: los que trabajan todos los días (ej. Animación) no llevan promedio de días -->
          <div v-if="form.tipo_contrato === 'Extra'" class="sm:col-span-2 lg:col-span-3">
            <label class="flex items-start gap-2 cursor-pointer select-none">
              <input v-model="form.sin_promedio_dias" type="checkbox" class="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600" />
              <span class="text-sm text-slate-700">
                Trabaja todos los días
                <span class="block text-xs text-slate-400">En aguinaldo y catorceavo no se le aplica el promedio de días trabajados: se calcula solo con su antigüedad (fecha de inicio).</span>
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
            <input :value="form.num_cuenta" @input="mayusculas('num_cuenta', $event)" maxlength="25" class="input font-mono" placeholder="000-000-000000" />
          </div>

          <!-- La forma de pago decide el destino en planillas y aguinaldos: solo
               "Transferencia" cobra por banco; con otra forma la cuenta se conserva. -->
          <div v-if="avisoPago" class="sm:col-span-2 lg:col-span-3">
            <p class="flex items-start gap-2 text-xs rounded-lg px-3 py-2 border" :class="avisoPago.clase">
              <svg class="w-4 h-4 flex-shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <span>{{ avisoPago.texto }}</span>
            </p>
          </div>

          <!-- Solo edición: estado del contrato. La baja y el reintegro se hacen desde la ficha
               o la lista de empleados, para que el motivo quede en el historial laboral. -->
          <template v-if="isEdit">
            <div>
              <label class="label">Estado <span class="text-red-500">*</span></label>
              <select v-if="original.estado !== 'Inactivo'" v-model="form.estado" required class="input">
                <option>Activo</option>
                <option>Suspendido</option>
              </select>
              <input v-else value="Inactivo" disabled class="input bg-slate-50 text-slate-500" />
            </div>
            <div class="sm:col-span-1 lg:col-span-2 flex items-end">
              <p class="text-xs text-slate-500 pb-2">
                <template v-if="original.estado === 'Inactivo'">Para reactivarlo usa <strong>Reintegrar</strong> en su ficha.</template>
                <template v-else>Para darlo de baja usa <strong>Dar de baja</strong> en su ficha o en la lista de empleados.</template>
              </p>
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

    <CambioContratoModal :cambio="cambioPendiente" @cerrar="cambioPendiente = null" @confirmar="confirmarCambioContrato" />
    <CambioFechaModal :cambio="cambioFechaPendiente" @cerrar="cambioFechaPendiente = null" @confirmar="confirmarCambioFecha" />
    <CambioPuestoModal :cambio="cambioPuestoPendiente" @cerrar="cambioPuestoPendiente = null" @confirmar="confirmarCambioPuesto" />
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
