// Tarjeta de cumpleaños como imagen PNG, dibujada en un <canvas>.
// Replica el diseño "Carta de Cumpleaños – Palma Real" (carta 8.5×11, 816×1056 px):
// mismas medidas, colores y fuentes; solo se reemplaza el nombre del colaborador.
import logoUrl from '../assets/cumpleanos/logo-palma-real.png'
import cormorantUrl from '../assets/cumpleanos/cormorant-garamond.woff2'
import cormorantItalicUrl from '../assets/cumpleanos/cormorant-garamond-italic.woff2'
import greatVibesUrl from '../assets/cumpleanos/great-vibes.woff2'
import loraUrl from '../assets/cumpleanos/lora.woff2'

const W = 816
const H = 1056
const ESCALA = 2 // se exporta a 1632×2112 para que se vea nítida en el celular

const COLOR = {
  fondo:   '#FBF6EC',
  texto:   '#3B2A14',
  dorado:  '#C9A227',
  doradoClaro: '#E3CF8C',
  ocre:    '#8A6A12',
  acento:  '#C4361B',
}

// Nombres propios para no chocar con otras fuentes de la página.
const F = {
  cormorant: 'TarjetaCormorant',
  greatVibes: 'TarjetaGreatVibes',
  lora: 'TarjetaLora',
}

const MARIPOSA = new Path2D(
  'M20 14 C14 2, 2 2, 4 12 C6 20, 16 18, 20 14 Z M20 14 C26 2, 38 2, 36 12 C34 20, 24 18, 20 14 Z ' +
  'M20 15 C16 20, 12 28, 18 27 C21 26, 20 20, 20 15 Z M20 15 C24 20, 28 28, 22 27 C19 26, 20 20, 20 15 Z',
)

const PARRAFOS = [
  'Hoy toda la familia de Palma Real se detiene para celebrarte. Tu esfuerzo, tu sonrisa y tu dedicación de cada día hacen que nuestros huéspedes se sientan en casa, y que nosotros nos sintamos orgullosos de trabajar a tu lado.',
  'Como la mariposa que nos representa, deseamos que este nuevo año de vida te lleve a volar cada vez más alto: que esté lleno de salud, de alegría junto a los tuyos y de muchos sueños cumplidos.',
  'Gracias por ser parte esencial de lo que somos. Disfruta tu día al máximo, ¡te lo mereces!',
]

// ── Recursos (se cargan una sola vez) ─────────────────────────────────────────
let recursos = null

function cargarRecursos() {
  if (!recursos) {
    const fuentes = [
      new FontFace(F.cormorant, `url(${cormorantUrl})`, { weight: '500 600', style: 'normal' }),
      new FontFace(F.cormorant, `url(${cormorantItalicUrl})`, { weight: '500', style: 'italic' }),
      new FontFace(F.greatVibes, `url(${greatVibesUrl})`),
      new FontFace(F.lora, `url(${loraUrl})`, { weight: '400 500' }),
    ]
    const logo = new Image()
    logo.src = logoUrl
    recursos = Promise.all([
      ...fuentes.map((f) => f.load().then((ok) => document.fonts.add(ok))),
      logo.decode(),
    ]).then(() => ({ logo }))
      .catch((e) => { recursos = null; throw e })
  }
  return recursos
}

// ── Nombre ────────────────────────────────────────────────────────────────────
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y'])

// En el sistema los nombres se guardan en mayúsculas; en la carta van como nombre
// propio: "JUAN CARLOS DE LA CRUZ" -> "Juan Carlos de la Cruz".
export function nombrePropio(texto) {
  return (texto || '')
    .trim()
    .toLocaleLowerCase('es')
    .split(/\s+/)
    .map((p, i) => (i > 0 && PARTICULAS.has(p)) ? p : p.charAt(0).toLocaleUpperCase('es') + p.slice(1))
    .join(' ')
}

// ── Utilidades de texto (posicionan igual que una línea de CSS) ──────────────
function fuente(ctx, css) { ctx.font = css }

// Dibuja una línea dentro de una "caja de línea" de alto `alto` que empieza en `top`,
// centrando verticalmente el texto como lo hace el navegador.
function linea(ctx, texto, x, top, alto) {
  const m = ctx.measureText(texto)
  const asc = m.fontBoundingBoxAscent
  const desc = m.fontBoundingBoxDescent
  ctx.fillText(texto, x, top + (alto - (asc + desc)) / 2 + asc)
}

// Alto de línea "normal" de la fuente actual (lo que usa CSS sin line-height).
function altoNormal(ctx) {
  const m = ctx.measureText('Hg')
  return m.fontBoundingBoxAscent + m.fontBoundingBoxDescent
}

function partirEnLineas(ctx, texto, ancho) {
  const palabras = texto.split(' ')
  const lineas = []
  let actual = ''
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p
    if (actual && ctx.measureText(prueba).width > ancho) {
      lineas.push(actual)
      actual = p
    } else {
      actual = prueba
    }
  }
  if (actual) lineas.push(actual)
  return lineas
}

// Como `text-wrap: balance`: si no cabe en una línea, reparte en dos de largo parecido.
function lineasBalanceadas(ctx, texto, ancho) {
  if (ctx.measureText(texto).width <= ancho) return [texto]
  const palabras = texto.split(' ')
  let mejor = null
  for (let i = 1; i < palabras.length; i++) {
    const a = palabras.slice(0, i).join(' ')
    const b = palabras.slice(i).join(' ')
    const max = Math.max(ctx.measureText(a).width, ctx.measureText(b).width)
    if (!mejor || max < mejor.max) mejor = { max, lineas: [a, b] }
  }
  return mejor.max <= ancho ? mejor.lineas : partirEnLineas(ctx, texto, ancho)
}

// Texto centrado con espaciado entre letras (letter-spacing de CSS).
function lineaEspaciada(ctx, texto, centroX, top, alto, espacio) {
  const letras = [...texto]
  const anchos = letras.map((l) => ctx.measureText(l).width)
  // CSS deja el espacio también después de la última letra.
  const total = anchos.reduce((s, w) => s + w + espacio, 0)
  let x = centroX - total / 2
  ctx.textAlign = 'left'
  letras.forEach((l, i) => {
    linea(ctx, l, x, top, alto)
    x += anchos[i] + espacio
  })
}

// ── Dibujo ────────────────────────────────────────────────────────────────────
function marco(ctx, inset, grosor, color, radio) {
  ctx.strokeStyle = color
  ctx.lineWidth = grosor
  ctx.beginPath()
  const o = inset + grosor / 2
  ctx.roundRect(o, o, W - 2 * o, H - 2 * o, radio)
  ctx.stroke()
}

// Mariposa del diseño: SVG de viewBox 40×30 dentro de una caja w×h, rotada sobre su centro.
function mariposa(ctx, x, y, w, h, grados, color, grosor) {
  const s = Math.min(w / 40, h / 30)
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.rotate((grados * Math.PI) / 180)
  ctx.scale(s, s)
  ctx.translate(-20, -15)
  ctx.strokeStyle = color
  ctx.lineWidth = grosor
  ctx.lineJoin = 'round'
  ctx.stroke(MARIPOSA)
  ctx.restore()
}

// "Querido" / "Querida" según el género; si no está registrado, se deja "Querido(a)" como en el diseño.
function saludo(genero) {
  if (genero === 'Masculino') return 'Querido'
  if (genero === 'Femenino') return 'Querida'
  return 'Querido(a)'
}

function dibujar(ctx, { logo }, nombreCompleto, nombreSaludo, genero) {
  ctx.fillStyle = COLOR.fondo
  ctx.fillRect(0, 0, W, H)

  marco(ctx, 24, 1.5, COLOR.dorado, 6)
  marco(ctx, 32, 1, COLOR.doradoClaro, 3)

  mariposa(ctx, 62, 58, 46, 36, -18, '#D9531E', 1.4)
  mariposa(ctx, 112, 92, 26, 20, 12, '#E9A52B', 1.6)
  mariposa(ctx, W - 64 - 52, H - 70 - 40, 52, 40, 16, COLOR.acento, 1.3)
  mariposa(ctx, W - 118 - 24, H - 118 - 18, 24, 18, -10, '#E9A52B', 1.6)

  const cx = W / 2
  const izq = 96
  const ancho = W - 96 * 2
  let y = 64

  // Logo
  const logoAlto = 200 * (logo.naturalHeight / logo.naturalWidth)
  ctx.drawImage(logo, cx - 100, y, 200, logoAlto)
  y += logoAlto

  ctx.textBaseline = 'alphabetic'

  // "CON CARIÑO, PARA"
  y += 26
  ctx.fillStyle = COLOR.ocre
  fuente(ctx, `600 14px ${F.cormorant}`)
  const altoPara = altoNormal(ctx)
  lineaEspaciada(ctx, 'CON CARIÑO, PARA', cx, y, altoPara, 14 * 0.32)
  y += altoPara

  // Nombre
  y += 4
  ctx.fillStyle = COLOR.texto
  ctx.textAlign = 'center'
  fuente(ctx, `600 44px ${F.cormorant}`)
  for (const l of lineasBalanceadas(ctx, nombreCompleto, ancho)) {
    linea(ctx, l, cx, y, 44 * 1.1)
    y += 44 * 1.1
  }

  // ¡Feliz Cumpleaños!
  y += 2
  ctx.fillStyle = COLOR.acento
  fuente(ctx, `92px ${F.greatVibes}`)
  linea(ctx, '¡Feliz Cumpleaños!', cx, y, 92 * 1.1)
  y += 92 * 1.1

  // Separador: línea · mariposa · línea (360 px de ancho)
  y += 10
  const sepIzq = cx - 180
  const tramo = (360 - 30 - 14 * 2) / 2
  ctx.fillStyle = COLOR.dorado
  ctx.fillRect(sepIzq, y + 10.5, tramo, 1)
  ctx.fillRect(cx + 180 - tramo, y + 10.5, tramo, 1)
  mariposa(ctx, cx - 15, y, 30, 22, 0, COLOR.dorado, 1.6)
  y += 22

  // Carta
  y += 26
  ctx.fillStyle = COLOR.texto
  ctx.textAlign = 'left'
  fuente(ctx, `400 17px ${F.lora}`)
  const altoLinea = 17 * 1.62
  const parrafos = [`${saludo(genero)} ${nombreSaludo}:`, ...PARRAFOS]
  parrafos.forEach((p, i) => {
    if (i > 0) y += 14
    for (const l of partirEnLineas(ctx, p, ancho)) {
      linea(ctx, l, izq, y, altoLinea)
      y += altoLinea
    }
  })

  // Firma, pegada abajo (margin-top: auto)
  ctx.textAlign = 'center'
  fuente(ctx, `600 18px ${F.cormorant}`)
  const altoFirma = altoNormal(ctx)
  fuente(ctx, `italic 500 22px ${F.cormorant}`)
  const altoDespedida = altoNormal(ctx)
  let yFirma = H - 64 - altoFirma - 4 - 6 - altoDespedida
  linea(ctx, 'Con cariño y gratitud,', cx, yFirma, altoDespedida)
  yFirma += altoDespedida + 6 + 4
  fuente(ctx, `600 18px ${F.cormorant}`)
  linea(ctx, 'Gerencia General · Hotel y Villas Palma Real', cx, yFirma, altoFirma)
}

// Devuelve un Blob PNG con la tarjeta del empleado.
export async function generarTarjetaCumpleanos(emp) {
  const res = await cargarRecursos()
  const canvas = document.createElement('canvas')
  canvas.width = W * ESCALA
  canvas.height = H * ESCALA
  const ctx = canvas.getContext('2d')
  ctx.scale(ESCALA, ESCALA)

  const nombres = nombrePropio(emp.nombres)
  const completo = nombrePropio(`${emp.nombres ?? ''} ${emp.apellidos ?? ''}`)
  dibujar(ctx, res, completo, nombres || completo, emp.genero)

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen.'))), 'image/png')
  })
}
