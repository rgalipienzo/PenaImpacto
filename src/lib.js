// 'YYYY-MM-DD' en la hora local
export function dateKey(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + n))
}

export const KINDS = [
  { id: 'almuerzo', label: 'Almuerzo', hora: '11:00', titulo: 'Almuerzo' },
  { id: 'comida', label: 'Comida', hora: '14:30', titulo: 'Comida' },
  { id: 'cena', label: 'Cena', hora: '21:30', titulo: 'Cena' },
  // Reserva: un socio reserva el día para algo particular (todo el día, sin apuntados).
  { id: 'reserva', label: 'Reserva', hora: '00:00', titulo: 'Día reservado' },
]

export const esReserva = (e) => e?.tipo === 'reserva'

// Franjas de una reserva (se guardan como hora: 09:00 mañana, 16:00 tarde, 00:00 todo el día)
export const FRANJAS = [
  { id: 'manana', label: 'Mañana', hora: '09:00' },
  { id: 'tarde', label: 'Tarde', hora: '16:00' },
  { id: 'dia', label: 'Todo el día', hora: '00:00' },
]
export const franjaDe = (hora) => FRANJAS.find((f) => f.hora === String(hora).slice(0, 5)) || FRANJAS[2]

// "14:30", o "Mañana" / "Tarde" / "Todo el día" para las reservas
export const horaText = (e) => (esReserva(e) ? franjaDe(e.hora).label : String(e.hora).slice(0, 5))

export const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label]))

function parse(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// "Sábado, 31 de octubre de 2026"
export function longDate(key) {
  const s = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parse(key))
  return cap(s)
}

// "Lunes 2 de noviembre"
export function shortDate(key) {
  const s = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(parse(key))
  return cap(s)
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

// Primer día del mes de una fecha: '2026-10-31' → '2026-10-01'
export function monthStart(key) {
  return key.slice(0, 8) + '01'
}

// Suma meses a un primer día de mes.
export function addMonths(monthKey, n) {
  const [y, m] = monthKey.split('-').map(Number)
  return dateKey(new Date(y, m - 1 + n, 1))
}

export function monthEnd(monthKey) {
  return addDays(addMonths(monthKey, 1), -1)
}

// Casillas del mes, empezando en lunes. Los huecos antes del día 1 son null.
export function monthDays(monthKey) {
  const first = parse(monthKey)
  const blanks = (first.getDay() + 6) % 7
  const total = Number(monthEnd(monthKey).slice(8))
  const out = Array(blanks).fill(null)
  for (let d = 1; d <= total; d++) out.push(monthKey.slice(0, 8) + String(d).padStart(2, '0'))
  return out
}

// "Octubre 2026"
export function monthTitle(monthKey) {
  return cap(new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(parse(monthKey)))
}

// Hasta cuándo se puede apuntar o desapuntar uno: hasta la hora de comienzo del evento.
export const CIERRE_MINUTOS = 0
export function haEmpezado(event, now = new Date()) {
  const [y, m, d] = event.fecha.split('-').map(Number)
  const [h, min] = event.hora.split(':').map(Number)
  const start = new Date(y, m - 1, d, h, min)
  return now.getTime() > start.getTime() - CIERRE_MINUTOS * 60 * 1000
}
// Cerrado para apuntarse, salvo que quien lo organiza lo haya vuelto a abrir.
export const joinClosed = (event, now = new Date()) => !event.reabierto && haEmpezado(event, now)

// "3 adultos · 1 niño": familia y amigos sumados (cuando solo interesa el total)
export function totalText(a) {
  const ad = (a.comensales || 0) + (a.amigos || 0)
  const ni = (a.ninos || 0) + (a.amigos_ninos || 0)
  return ni ? `${plural(ad, 'adulto', 'adultos')} · ${plural(ni, 'niño', 'niños')}` : plural(ad, 'adulto', 'adultos')
}

// "2 adultos · 1 niño · 2 amigos" a partir de un apuntado
// (comensales y ninos = familia; amigos y amigos_ninos = amigos invitados)
export function genteText(a) {
  const partes = [plural(a.comensales || 0, 'adulto', 'adultos')]
  if (a.ninos) partes.push(plural(a.ninos, 'niño', 'niños'))
  const amigos = (a.amigos || 0) + (a.amigos_ninos || 0)
  if (amigos) partes.push(plural(amigos, 'amigo', 'amigos'))
  return partes.join(' · ')
}


// 1.5 → "1,50 €"
const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
export const euros = (n) => eur.format(Number(n) || 0)

// "1,5" o "1.50" → 1.5 (o NaN si no es un número)
export const parseEuros = (s) => Number(String(s).trim().replace(/\s|€/g, '').replace(',', '.'))

// Reparto de los gastos de la comida entre los comensales.
// Un niño cuenta como `pct` % de un adulto. Devuelve el precio por adulto y por niño,
// y, para un socio, su parte, lo que ha pagado y lo que le toca pagar (negativo = le deben).
// cuotaInv = { adulto, nino, famAdulto, famNino }: lo que paga cada invitado (Tarifas → Invitados),
// amigo o familiar. El socio no paga cuota: de sus "comensales" (familia) el primero es él.
export function reparto({ apuntados, gastos, pct, meId, consumo = 0, cuotaInv = { adulto: 0, nino: 0 } }) {
  cuotaInv = { famAdulto: 0, famNino: 0, ...cuotaInv }
  const total = gastos.reduce((s, g) => s + Number(g.importe), 0)
  const peso = (pct ?? 50) / 100
  const adultos = apuntados.reduce((s, a) => s + (a.comensales || 0) + (a.amigos || 0), 0)
  const ninos = apuntados.reduce((s, a) => s + (a.ninos || 0) + (a.amigos_ninos || 0), 0)
  const unidades = adultos + ninos * peso
  // Precios por persona redondeados al céntimo, para que el ticket cuadre línea a línea.
  const r2 = (n) => Math.round(n * 100) / 100
  const porAdulto = unidades ? r2(total / unidades) : 0
  const porNino = r2(porAdulto * peso)
  const mio = apuntados.find((a) => (a.id || a.socio_id) === meId)
  const parte = mio
    ? ((mio.comensales || 0) + (mio.amigos || 0)) * porAdulto + ((mio.ninos || 0) + (mio.amigos_ninos || 0)) * porNino
    : 0
  const cuotaInvitados = mio
    ? (mio.amigos || 0) * cuotaInv.adulto + (mio.amigos_ninos || 0) * cuotaInv.nino +
      Math.max(0, (mio.comensales || 0) - 1) * cuotaInv.famAdulto + (mio.ninos || 0) * cuotaInv.famNino
    : 0
  const pagado = gastos.filter((g) => g.socio_id === meId).reduce((s, g) => s + Number(g.importe), 0)
  return {
    total, adultos, ninos, porAdulto, porNino, parte, cuotaInvitados, consumo, pagado, cuotaInv,
    yo: mio || null,
    saldo: r2(parte + cuotaInvitados + consumo - pagado),
  }
}

// Líneas del ticket de un socio en un evento: [{ cant, concepto, detalle, unidad, total }]
// r = resultado de reparto(); consumos = [{ cantidad, nombre, precio }]
export function ticketLines(r, consumos = []) {
  const yo = r.yo || {}
  const lineas = []
  const add = (cant, concepto, unidad, detalle) => {
    if (cant > 0) lineas.push({ cant, concepto, detalle, unidad, total: Math.round(cant * unidad * 100) / 100 })
  }
  const { famAdulto = 0, famNino = 0 } = r.cuotaInv
  const comida = (precio) => (r.total ? precio : 0)
  // Con cuota de familiar, la familia sale aparte (el socio, en "Adulto"); sin ella, todos juntos como hasta ahora.
  const famAdultos = famAdulto ? Math.max(0, (yo.comensales || 0) - 1) : 0
  if (r.total) {
    add((yo.comensales || 0) - famAdultos, 'Adulto', r.porAdulto)
    if (!famNino) add(yo.ninos || 0, 'Niño', r.porNino)
  }
  add(famAdultos, 'Adulto familiar', comida(r.porAdulto) + famAdulto,
    r.total ? `${euros(r.porAdulto)} comida + ${euros(famAdulto)} familiar` : 'cuota de familiar')
  if (famNino) {
    add(yo.ninos || 0, 'Niño familiar', comida(r.porNino) + famNino,
      r.total ? `${euros(r.porNino)} comida + ${euros(famNino)} familiar` : 'cuota de familiar')
  }
  add(yo.amigos || 0, 'Adulto amigo', r.porAdulto + r.cuotaInv.adulto,
    r.total ? `${euros(r.porAdulto)} comida + ${euros(r.cuotaInv.adulto)} invitado` : 'cuota de invitado')
  add(yo.amigos_ninos || 0, 'Niño amigo', r.porNino + r.cuotaInv.nino,
    r.total ? `${euros(r.porNino)} comida + ${euros(r.cuotaInv.nino)} invitado` : 'cuota de invitado')
  for (const c of consumos) add(c.cantidad, c.nombre, Number(c.precio))
  return lineas
}

// "1 de noviembre de 2026" (sin el día de la semana)
export function fullDate(key) {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(parse(key))
}
