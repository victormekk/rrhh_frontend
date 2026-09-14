// Nombres de archivo para todo lo que se descarga en el sistema (PDFs, Excel).

// Para nombres tipo "Tipo_Nombre_ddmmaaaa": junta todo en un solo token sin espacios ni acentos.
export function normalizarNombre(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9+-]/g, '')
}

// Para archivos que ya llevan su propio nombre descriptivo (planilla, aguinaldo):
// solo quita acentos y caracteres invalidos en un nombre de archivo, conserva los espacios.
export function sanitizarNombreArchivo(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
}

export function fechaCompacta(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}${mm}${date.getFullYear()}`
}

// "Tipo_Nombre_ddmmaaaa.ext" (omite el segmento de nombre si viene vacio)
export function nombreArchivo(tipo, nombre, ext) {
  const partes = [tipo, normalizarNombre(nombre), fechaCompacta()].filter(Boolean)
  return `${partes.join('_')}.${ext}`
}

export function descargarBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
