// Feriados nacionales de Honduras. Semana Santa se calcula a partir del Domingo
// de Pascua (algoritmo de Meeus/Jones/Butcher) y el Feriado Morazánico son los
// 3 días (miércoles, jueves, viernes) de la primera semana de octubre que
// contiene un miércoles. El resto de fechas son fijas según el Código del
// Trabajo de Honduras. Debe reflejar exactamente la misma lógica del backend
// (App\Traits\TieneFeriados) para que la vista previa coincida con lo guardado.

function domingoDePascua(anio) {
  const a = anio % 19
  const b = Math.floor(anio / 100)
  const c = anio % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(anio, mes - 1, dia)
}

function sumarDias(fecha, n) {
  const r = new Date(fecha)
  r.setDate(r.getDate() + n)
  return r
}

export function feriadosDelAnio(anio) {
  const pascua = domingoDePascua(anio)

  const primerMiercolesOctubre = new Date(anio, 9, 1)
  while (primerMiercolesOctubre.getDay() !== 3) {
    primerMiercolesOctubre.setDate(primerMiercolesOctubre.getDate() + 1)
  }

  return [
    { fecha: new Date(anio, 0, 1),  nombre: 'Año Nuevo' },
    { fecha: sumarDias(pascua, -3), nombre: 'Jueves Santo' },
    { fecha: sumarDias(pascua, -2), nombre: 'Viernes Santo' },
    { fecha: sumarDias(pascua, -1), nombre: 'Sábado de Gloria' },
    { fecha: new Date(anio, 3, 14), nombre: 'Día de las Américas' },
    { fecha: new Date(anio, 4, 1),  nombre: 'Día del Trabajo' },
    { fecha: new Date(anio, 8, 15), nombre: 'Día de la Independencia' },
    { fecha: new Date(primerMiercolesOctubre),       nombre: 'Feriado Morazánico' },
    { fecha: sumarDias(primerMiercolesOctubre, 1),   nombre: 'Feriado Morazánico' },
    { fecha: sumarDias(primerMiercolesOctubre, 2),   nombre: 'Feriado Morazánico' },
    { fecha: new Date(anio, 11, 25), nombre: 'Navidad' },
  ]
}

// Nombre del feriado si la fecha cae en uno, o null si es un día normal.
export function nombreFeriado(fecha) {
  const feriados = feriadosDelAnio(fecha.getFullYear())
  const match = feriados.find(f => f.fecha.toDateString() === fecha.toDateString())
  return match ? match.nombre : null
}
