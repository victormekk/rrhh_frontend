// Catálogos del historial laboral (deben coincidir con App\Models\HistorialLaboral en el backend).

export const MOTIVOS_CESE = [
  'Despido', 'Despido justificado', 'Renuncia', 'Jubilación',
  'Abandono de trabajo', 'Fin de contrato', 'Mutuo acuerdo', 'Fallecimiento',
]

export const OPCIONES_LIQUIDACION = ['Sí', 'No', 'Pendiente']

export const TIPOS_EVENTO = ['Ingreso', 'Cese', 'Reintegro', 'Cambio de contrato', 'Cambio de fecha']

export const ESTILO_EVENTO = {
  'Ingreso':            { punto: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  'Cese':               { punto: 'bg-red-500',     badge: 'bg-red-100 text-red-700' },
  'Reintegro':          { punto: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700' },
  'Cambio de contrato': { punto: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700' },
  'Cambio de fecha':    { punto: 'bg-violet-500',  badge: 'bg-violet-100 text-violet-700' },
}

export const ESTILO_LIQUIDACION = {
  'Sí':        'bg-emerald-100 text-emerald-700',
  'No':        'bg-slate-100 text-slate-600',
  'Pendiente': 'bg-amber-100 text-amber-700',
}

// Fecha de inicio laboral: no se permite 29 de febrero (el aniversario no existiría
// 3 de cada 4 años). Al elegirla se avisa con un toast y se deshace el cambio.
export const AVISO_29_FEBRERO = 'El 29 de febrero solo existe en años bisiestos: elige el 28 de febrero o el 1 de marzo como fecha de inicio.'

export function es29Febrero(fecha) {
  return typeof fecha === 'string' && fecha.slice(5, 10) === '02-29'
}

export function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatFecha(d) {
  if (!d) return '—'
  const date = new Date(String(d).slice(0, 10) + 'T00:00:00')
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Mensaje legible a partir de un error 422 de Laravel.
export function mensajeError(e, porDefecto = 'No se pudo guardar.') {
  const errs = e?.response?.data?.errors
  if (errs) return Object.values(errs).flat().join(' ')
  return e?.response?.data?.message ?? porDefecto
}
