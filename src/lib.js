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
    total, adultos, ninos, porAdulto, porNino, pct: pct ?? 50, parte, cuotaInvitados, consumo, pagado, cuotaInv,
    yo: mio || null,
    saldo: r2(parte + cuotaInvitados + consumo - pagado),
  }
}

// Cuentas de un evento al estilo Tricount.
// La COMIDA se cuadra entre socios por Bizum: cada uno tiene su parte, lo que ha comprado
// y los Bizums ya hechos; con eso se calcula quién paga a quién (con los menos Bizums posibles).
// El BOTE (consumiciones + cuotas de invitados y familiares) va aparte, al bote de la peña.
// reembolsos = [{ id, de, a, importe, deNombre, aNombre }]; pagoBote = { importe, pagado_at } | null
// botellas = [{ nombre, precio, cantidad }]: botellas de la peña abiertas en el evento. Se reparten
// entre todos como la comida (los niños con su %) y cada uno pone su parte en el bote.
export function cuentaEvento({ apuntados, gastos, pct, meId, consumo = 0, cuotaInv, reembolsos = [], pagoBote = null, botellas = [] }) {
  const r = reparto({ apuntados, gastos, pct, meId, consumo, cuotaInv })
  // Cada bebida compartida se reparte entre quien la ha bebido (bebedores = { socio: nº de adultos });
  // si no se ha marcado a nadie, entre todos como la comida.
  const r2b = (n) => Math.round(n * 100) / 100
  const botellasLineas = botellas.map((b) => {
    const coste = r2b(Number(b.precio) * b.cantidad)
    const beb = b.bebedores && Object.keys(b.bebedores).length ? b.bebedores : null
    if (beb) {
      const n = Object.values(beb).reduce((s, x) => s + (Number(x) || 0), 0)
      const mios = Number(beb[meId]) || 0
      return { ...b, coste, adultos: n, mios, todos: false, parte: n ? r2b((coste * mios) / n) : 0, porAdulto: n ? r2b(coste / n) : 0 }
    }
    const rr = reparto({ apuntados, gastos: [{ importe: coste }], pct, meId })
    return { ...b, coste, adultos: rr.adultos, todos: true, parte: r2b(rr.parte), porAdulto: rr.porAdulto, porNino: rr.porNino }
  })
  const botellasTotal = r2b(botellasLineas.reduce((s, b) => s + b.coste, 0))
  const parteBotellas = r2b(botellasLineas.reduce((s, b) => s + b.parte, 0))
  const cent = (n) => Math.round(n * 100)
  const bal = {} // en céntimos: + le deben, − debe
  const nombres = {}
  const compra = {}
  const mover = (id, n, nombre) => {
    if (!id) return
    bal[id] = (bal[id] || 0) + n
    if (nombre && !nombres[id]) nombres[id] = nombre
  }
  for (const a of apuntados) {
    const parte = ((a.comensales || 0) + (a.amigos || 0)) * r.porAdulto + ((a.ninos || 0) + (a.amigos_ninos || 0)) * r.porNino
    mover(a.id || a.socio_id, -cent(parte), a.nombre)
  }
  for (const g of gastos) {
    mover(g.socio_id, cent(Number(g.importe)), g.nombre)
    compra[g.socio_id] = (compra[g.socio_id] || 0) + Number(g.importe)
  }
  for (const x of reembolsos) {
    mover(x.de, cent(x.importe), x.deNombre)
    mover(x.a, -cent(x.importe), x.aNombre)
  }
  // Los céntimos del redondeo se los queda quien más ha comprado.
  const resto = Object.values(bal).reduce((s, n) => s + n, 0)
  if (resto && gastos.length) {
    const top = Object.keys(compra).sort((x, y) => compra[y] - compra[x])[0]
    bal[top] -= resto
  }

  // Quién paga a quién: el que más debe paga al que más le deben, y así hasta cuadrar.
  const deben = Object.entries(bal).filter(([, n]) => n < 0).map(([id, n]) => ({ id, n: -n })).sort((x, y) => y.n - x.n)
  const cobran = Object.entries(bal).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n })).sort((x, y) => y.n - x.n)
  const bizums = []
  for (let i = 0, j = 0; i < deben.length && j < cobran.length;) {
    const m = Math.min(deben[i].n, cobran[j].n)
    if (m > 0) bizums.push({ de: deben[i].id, a: cobran[j].id, importe: m / 100, deNombre: nombres[deben[i].id] || '—', aNombre: nombres[cobran[j].id] || '—' })
    deben[i].n -= m
    cobran[j].n -= m
    if (!deben[i].n) i++
    if (!cobran[j].n) j++
  }

  const suma = (l) => Math.round(l.reduce((s, t) => s + t.importe, 0) * 100) / 100
  const misBizums = bizums.filter((t) => t.de === meId)
  const meDeben = bizums.filter((t) => t.a === meId)
  const bote = Math.round((r.cuotaInvitados + r.consumo + parteBotellas) * 100) / 100
  const botePendiente = Math.round((bote - (pagoBote?.importe || 0)) * 100) / 100
  return {
    ...r,
    bizums, // todos los Bizums pendientes del evento
    misBizums, // los que tengo que hacer yo
    meDeben, // los que me tienen que hacer a mí
    hechos: reembolsos.filter((x) => x.de === meId || x.a === meId),
    reembolsos,
    comidaPendiente: suma(misBizums),
    meDebenTotal: suma(meDeben),
    botellas,
    botellasTotal,
    botellasLineas,
    parteBotellas,
    bote,
    pagoBote,
    botePendiente,
  }
}

// Líneas del ticket. Comida: lo que me toca de la compra (adultos y niños, con el % de los niños).
export function lineasComida(r) {
  const yo = r.yo || {}
  const lineas = []
  const add = (cant, concepto, unidad) => {
    if (cant > 0) lineas.push({ cant, concepto, unidad, total: Math.round(cant * unidad * 100) / 100 })
  }
  if (!r.total) return lineas
  const pc = ` (${r.pct} %)`
  add(yo.comensales || 0, 'Adulto', r.porAdulto)
  add(yo.ninos || 0, `Niño${pc}`, r.porNino)
  add(yo.amigos || 0, 'Adulto amigo', r.porAdulto)
  add(yo.amigos_ninos || 0, `Niño amigo${pc}`, r.porNino)
  return lineas
}

// Bote de la peña: cuotas de familiares e invitados y consumiciones (consumos = [{ cantidad, nombre, precio }]).
export function lineasBote(r, consumos = []) {
  const yo = r.yo || {}
  const { adulto = 0, nino = 0, famAdulto = 0, famNino = 0 } = r.cuotaInv || {}
  const lineas = []
  const add = (cant, concepto, unidad) => {
    if (cant > 0 && unidad > 0) lineas.push({ cant, concepto, unidad, total: Math.round(cant * unidad * 100) / 100 })
  }
  for (const b of r.botellasLineas || []) {
    if (b.parte <= 0) continue
    const detalle = b.todos
      ? `${euros(b.coste)} entre todos · ${euros(b.porAdulto)} por adulto`
      : `${euros(b.coste)} entre ${plural(b.adultos, 'adulto', 'adultos')} · ${b.mios > 1 ? `${b.mios} de tu grupo` : 'tú'}`
    lineas.push({ cant: null, concepto: `${b.cantidad} × ${b.nombre} (compartida)`, detalle, total: b.parte })
  }
  add(Math.max(0, (yo.comensales || 0) - 1), 'Cuota familiar adulto', famAdulto)
  add(yo.ninos || 0, 'Cuota familiar niño', famNino)
  add(yo.amigos || 0, 'Cuota invitado adulto', adulto)
  add(yo.amigos_ninos || 0, 'Cuota invitado niño', nino)
  for (const c of consumos) add(c.cantidad, c.nombre, Number(c.precio))
  return lineas
}

// "1 de noviembre de 2026" (sin el día de la semana)
export function fullDate(key) {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(parse(key))
}
