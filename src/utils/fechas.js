// Fechas y horas que vienen del backend (created_at, etc.).
// Laravel las manda en UTC con "Z" al final (ej. 2026-11-04T14:13:31.000000Z);
// aquí se muestran siempre en hora de Honduras, sin importar la zona de la computadora.
const ZONA = 'America/Tegucigalpa'

function aFecha(dt) {
  if (!dt) return null
  const d = new Date(dt)
  return isNaN(d) ? null : d
}

export function formatFechaHora(dt) {
  const d = aFecha(dt)
  if (!d) return dt ? String(dt) : '—'
  return d.toLocaleString('es-HN', {
    timeZone: ZONA, year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export function formatSoloFecha(dt) {
  const d = aFecha(dt)
  if (!d) return '—'
  return d.toLocaleDateString('es-HN', { timeZone: ZONA, year: 'numeric', month: 'short', day: 'numeric' })
}
