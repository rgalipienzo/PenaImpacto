// Datos de ejemplo para probar la app sin Supabase. Se pierden al recargar.
import { addDays, dateKey, reparto } from './lib.js'

const ME = 'demo-ricardo'
const socios = {
  [ME]: { id: ME, nombre: 'Ricardo', es_admin: true },
  inaki: { id: 'inaki', nombre: 'Iñaki' },
  mikel: { id: 'mikel', nombre: 'Mikel' },
  ane: { id: 'ane', nombre: 'Ane' },
  jon: { id: 'jon', nombre: 'Jon' },
}

export const session = { user: { id: ME, email: 'demo@txokoplan' } }

const hoy = dateKey()
let seq = 1
let eventos = [
  { id: 'e1', fecha: hoy, hora: '11:00', tipo: 'almuerzo', titulo: 'Almuerzo de cuadrilla', notas: 'Huevos con txistorra.', organizador_id: 'inaki', apuntados: [['inaki', 3], ['jon', 5]] },
  { id: 'e2', fecha: hoy, hora: '14:30', tipo: 'comida', titulo: 'Comida de socios', notas: '', organizador_id: ME, apuntados: [[ME, 4], ['ane', 4], ['mikel', 4]] },
  { id: 'e3', fecha: hoy, hora: '21:30', tipo: 'cena', titulo: 'Cena de txoko', notas: 'Chuletón. Trae el vino quien pueda.', organizador_id: 'mikel', apuntados: [['mikel', 6]] },
  { id: 'e4', fecha: addDays(hoy, 2), hora: '21:00', tipo: 'cena', titulo: 'Cena de cumpleaños de Ane', notas: '', organizador_id: 'ane', apuntados: [['ane', 8]] },
].map((e) => ({ ...e, apuntados: e.apuntados.map(([socio_id, comensales]) => ({ socio_id, comensales })) }))

function withNames(e) {
  return {
    ...e,
    organizador: socios[e.organizador_id],
    apuntados: e.apuntados.map((a) => ({ ...a, socio: socios[a.socio_id] })),
  }
}

export const getMe = () => socios[ME]
export const updateMyProfile = (fields) => { Object.assign(socios[ME], fields) }

export function listEvents(from, to) {
  return eventos
    .filter((e) => e.fecha >= from && e.fecha <= to)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .map(withNames)
}

export function createEvent(fields) {
  eventos.push({ ...fields, id: `n${seq++}`, organizador_id: ME, apuntados: [{ socio_id: ME, comensales: 1 }] })
}

export function updateEvent(id, fields) {
  Object.assign(eventos.find((e) => e.id === id), fields)
}

export function deleteEvent(id) {
  eventos = eventos.filter((e) => e.id !== id)
}

export function join(id, comensales, ninos = 0, amigos = 0, amigos_ninos = 0) {
  const e = eventos.find((x) => x.id === id)
  const mine = e.apuntados.find((a) => a.socio_id === ME)
  if (mine) Object.assign(mine, { comensales, ninos, amigos, amigos_ninos })
  else e.apuntados.push({ socio_id: ME, comensales, ninos, amigos, amigos_ninos })
}

export function leave(id) {
  const e = eventos.find((x) => x.id === id)
  e.apuntados = e.apuntados.filter((a) => a.socio_id !== ME)
}

export const listSocios = () =>
  Object.values(socios).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

const normas = { texto: '1. Deja la cocina limpia.\n2. Apunta lo que gastes.', actualizado: new Date().toISOString(), autor: 'Ricardo' }
export const getNormas = () => ({ ...normas })
export const saveNormas = (texto) => { Object.assign(normas, { texto, actualizado: new Date().toISOString(), autor: socios[ME].nombre }) }

// Listas de la compra de ejemplo
const now = () => new Date().toISOString()
let listas = [
  { id: 'l1', nombre: 'Comida de socios', evento_id: 'e2', creado_por: ME, autor: 'Ricardo', created_at: now(),
    items: [{ id: 'i1', texto: 'Pan', comprado: true, creado_por: ME, created_at: now() }, { id: 'i2', texto: 'Sidra', comprado: false, creado_por: 'ane', created_at: now() }] },
  { id: 'l3', nombre: 'Almuerzo de cuadrilla', evento_id: 'e1', creado_por: 'inaki', autor: 'Iñaki', created_at: now(),
    items: [{ id: 'i4', texto: 'Txistorra', comprado: false, creado_por: 'inaki', created_at: now() }] },
  { id: 'l2', nombre: 'Compra del mes', evento_id: null, creado_por: 'mikel', autor: 'Mikel', created_at: now(),
    items: [{ id: 'i3', texto: 'Aceite', comprado: false, creado_por: 'mikel', created_at: now() }] },
]
export function listListas() {
  const withEvent = (l) => {
    const e = eventos.find((x) => x.id === l.evento_id)
    return { ...l, evento: e ? { fecha: e.fecha, hora: e.hora, tipo: e.tipo, titulo: e.titulo, organizador_id: e.organizador_id, organizador: socios[e.organizador_id] } : null }
  }
  return { eventos: listas.filter((l) => l.evento_id).map(withEvent), otras: listas.filter((l) => !l.evento_id).map(withEvent) }
}
export const createLista = (nombre) => { listas.push({ id: `l${seq++}`, nombre, evento_id: null, creado_por: ME, autor: 'Ricardo', created_at: now(), items: [] }) }
export const deleteLista = (id) => { listas = listas.filter((l) => l.id !== id) }
export const addItem = (listaId, texto) => { listas.find((l) => l.id === listaId).items.push({ id: `i${seq++}`, texto, comprado: false, creado_por: ME, created_at: now() }) }
const findItem = (id) => listas.flatMap((l) => l.items).find((i) => i.id === id)
export const setComprado = (id, comprado) => { findItem(id).comprado = comprado }
export const deleteItem = (id) => { for (const l of listas) l.items = l.items.filter((i) => i.id !== id) }

// Tarifas y cuota de ejemplo
let tarifas = [
  { id: 't1', nombre: 'Caña', precio: 1.5, categoria: 'Bebidas' },
  { id: 't2', nombre: 'Vino', precio: 1.2, categoria: 'Bebidas' },
  { id: 't3', nombre: 'Café', precio: 1, categoria: 'Otros' },
  { id: 't4', nombre: 'Invitado adulto', precio: 4, categoria: 'Invitado' },
  { id: 't5', nombre: 'Invitado infantil', precio: 2, categoria: 'Invitado' },
]
let cuota = 20
export const listTarifas = () => [...tarifas].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre))
export const saveTarifa = (t) => { if (t.id) Object.assign(tarifas.find((x) => x.id === t.id), t); else tarifas.push({ ...t, id: `t${seq++}` }) }
export const deleteTarifa = (id) => { tarifas = tarifas.filter((t) => t.id !== id) }
export const getCuota = () => cuota
export const saveCuota = (c) => { cuota = c }

// Consumiciones de ejemplo (del socio de la demo)
let consumos = []
export const listMisConsumiciones = (eventoId) => consumos.filter((c) => c.evento_id === eventoId)
export function setConsumicion(eventoId, tarifa, cantidad) {
  consumos = consumos.filter((c) => !(c.evento_id === eventoId && c.tarifa_id === tarifa.id))
  if (cantidad > 0) consumos.push({ id: `c${seq++}`, evento_id: eventoId, tarifa_id: tarifa.id, nombre: tarifa.nombre, precio: tarifa.precio, cantidad })
}
export function listMisGastos() {
  const groups = new Map()
  for (const c of consumos) {
    const e = eventos.find((x) => x.id === c.evento_id)
    if (!e) continue
    const g = groups.get(e.id) || { evento: e, items: [], total: 0 }
    g.items.push(c)
    g.total += c.precio * c.cantidad
    groups.set(e.id, g)
  }
  return [...groups.values()]
}

// Gastos de la comida de ejemplo
let pctNinos = 50
let gastosEv = [{ id: 'g1', evento_id: 'e2', socio_id: 'ane', concepto: 'Carne', importe: 60, created_at: now() }]
export const getAjustes = () => ({ cuota, porcentajeNinos: pctNinos })
export const savePorcentajeNinos = (p) => { pctNinos = p }
export const listGastos = (eventoId) => gastosEv.filter((g) => g.evento_id === eventoId).map((g) => ({ ...g, nombre: socios[g.socio_id]?.nombre || '—' }))
export const addGasto = (eventoId, concepto, importe) => { gastosEv.push({ id: `g${seq++}`, evento_id: eventoId, socio_id: ME, concepto, importe, created_at: now() }) }
export const deleteGasto = (id) => { gastosEv = gastosEv.filter((g) => g.id !== id) }
export function listMisCuentas() {
  const out = []
  for (const e of eventos) {
    if (!e.apuntados.some((a) => a.socio_id === ME)) continue
    const g = gastosEv.filter((x) => x.evento_id === e.id)
    const c = listMisGastos().find((x) => x.evento.id === e.id)
    const yo = e.apuntados.find((x) => x.socio_id === ME)
    if (!g.length && !c && !(yo?.amigos || yo?.amigos_ninos)) continue
    out.push({ evento: e, consumos: c?.items || [], pago: pagosEv[e.id] || null, ...reparto({ apuntados: e.apuntados, gastos: g, pct: pctNinos, meId: ME, consumo: c?.total || 0, cuotaInv: { adulto: 4, nino: 2 } }) })
  }
  return out
}
export const deleteConsumicion = (id) => { consumos = consumos.filter((c) => c.id !== id) }
export const updateGasto = (id, concepto, importe) => { Object.assign(gastosEv.find((g) => g.id === id), { concepto, importe }) }
let pagosEv = {}
export const getMiPago = (eventoId) => pagosEv[eventoId] || null
export const marcarPagado = (eventoId, importe) => { pagosEv[eventoId] = { importe, pagado_at: new Date().toISOString() } }
export const quitarPagado = (eventoId) => { delete pagosEv[eventoId] }
export const setBaja = (id, baja) => { if (socios[id]) socios[id].baja = baja }
