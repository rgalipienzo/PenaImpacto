import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY, DEMO } from './config.js'
import * as demo from './demo.js'

export { dateKey, addDays } from './lib.js'
import { dateKey, reparto } from './lib.js'

// Si al volver de Google/Microsoft hay un error, viene en la dirección: se lee antes de que Supabase la limpie.
export const OAUTH_ERROR = (() => {
  if (typeof window === 'undefined') return ''
  const p = new URLSearchParams(window.location.hash.slice(1) + '&' + window.location.search.slice(1))
  return p.get('error_description') || p.get('error') || ''
})()

export const supabase = DEMO ? null : createClient(SUPABASE_URL, SUPABASE_KEY)

// ---- Sesión ----

export async function getSession() {
  if (DEMO) return demo.session
  const { data } = await supabase.auth.getSession()
  return data.session
}

// ¿Se ha abierto la app desde un enlace de invitación o de recuperar contraseña?
// Hay que leerlo antes de que Supabase limpie la dirección.
export const LINK_TYPE = (() => {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const t = params.get('type')
  return t === 'invite' || t === 'recovery' ? t : null
})()

export function onAuthChange(cb, onRecovery) {
  if (DEMO) return () => {}
  const { data } = supabase.auth.onAuthStateChange((event, s) => {
    if (event === 'PASSWORD_RECOVERY') onRecovery?.()
    cb(s)
  })
  return () => data.subscription.unsubscribe()
}

// Qué formas de entrar están activadas en Supabase (Authentication → Providers): { google, azure }.
export async function getProveedores() {
  if (DEMO) return {}
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
    const { external = {} } = await r.json()
    return { google: !!external.google, azure: !!external.azure }
  } catch {
    return {}
  }
}

// Entrar con Google ('google') o Microsoft ('azure': Hotmail, Outlook).
export async function signInWith(provider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin, scopes: provider === 'azure' ? 'email' : undefined },
  })
  if (error) throw error
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

// Manda un correo para poner una contraseña nueva.
export async function sendReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
  if (error) throw error
}

export async function setPassword(password) {
  if (DEMO) return
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function signOut() {
  if (DEMO) return
  await supabase.auth.signOut()
}

// ---- Socios ----

export async function getMe(userId) {
  if (DEMO) return demo.getMe()
  // Todas las columnas que haya (así no falla si aún falta alguna columna nueva en Supabase).
  const { data, error } = await supabase.from('socios').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

// fields: { nombre?, apellidos?, telefono? }
export async function updateMyProfile(userId, fields) {
  if (DEMO) return demo.updateMyProfile(fields)
  const { error } = await supabase.from('socios').update(fields).eq('id', userId)
  if (error) throw error
}

// Supabase manda un correo a la dirección nueva para confirmarla.
export async function updateEmail(email) {
  if (DEMO) return
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: window.location.origin })
  if (error) throw error
}

// ---- Eventos ----

function shape(e, meId) {
  const apuntados = (e.apuntados || [])
    .map((a) => ({ id: a.socio_id, nombre: a.socio?.nombre || '—', comensales: a.comensales, ninos: a.ninos || 0, amigos: a.amigos || 0, amigos_ninos: a.amigos_ninos || 0 }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  const mine = apuntados.find((a) => a.id === meId)
  return {
    id: e.id,
    fecha: e.fecha,
    hora: String(e.hora).slice(0, 5),
    tipo: e.tipo,
    titulo: e.titulo,
    notas: e.notas || '',
    listaId: e.lista?.id || null,
    compra: sortItems(e.lista?.items || []).map((i) => i.texto), // cosas de la lista de la compra
    organizadorId: e.organizador_id,
    reabierto: !!e.reabierto, // el organizador lo ha vuelto a abrir para apuntarse después de la hora
    organizador: e.organizador?.nombre || '—',
    apuntados,
    personas: apuntados.reduce((n, a) => n + a.comensales + a.ninos + a.amigos + a.amigos_ninos, 0),
    ninos: apuntados.reduce((n, a) => n + a.ninos + a.amigos_ninos, 0),
    misComensales: mine ? mine.comensales : 0, // adultos
    misNinos: mine ? mine.ninos : 0,
    misAmigos: mine ? mine.amigos : 0,
    misAmigosNinos: mine ? mine.amigos_ninos : 0,
  }
}

const EVENT_FIELDS =
  'id, fecha, hora, tipo, titulo, notas, organizador_id, reabierto, lista:listas(id, items:lista_items(id, texto, comprado, created_at)), organizador:socios!eventos_organizador_id_fkey(nombre), apuntados(socio_id, comensales, ninos, amigos, amigos_ninos, socio:socios(nombre))'

// Eventos entre dos fechas (incluidas), ordenados por fecha y hora.
export async function listEvents(fromKey, toKey, meId) {
  const rows = DEMO
    ? demo.listEvents(fromKey, toKey)
    : await supabase
        .from('eventos')
        .select(EVENT_FIELDS)
        .gte('fecha', fromKey)
        .lte('fecha', toKey)
        .order('fecha')
        .order('hora')
        .then(({ data, error }) => {
          if (error) throw error
          return data
        })
  return rows.map((e) => shape(e, meId))
}

// Crea el evento, apunta al organizador y guarda su lista de la compra.
export async function createEvent({ compra, ...fields }, meId) {
  if (DEMO) return demo.createEvent(fields)
  const { data, error } = await supabase.from('eventos').insert(fields).select('id').single()
  if (error) throw error
  if (fields.tipo !== 'reserva') {
    await join(data.id, meId, 1, 0)
    await setEventList(data.id, fields.titulo, null, compra)
  }
}

export async function updateEvent(event, { compra, ...fields }) {
  if (DEMO) return demo.updateEvent(event.id, fields)
  const { error } = await supabase.from('eventos').update(fields).eq('id', event.id)
  if (error) throw error
  await setEventList(event.id, fields.titulo, event.listaId, compra)
}

export async function deleteEvent(id) {
  if (DEMO) return demo.deleteEvent(id)
  const { error } = await supabase.from('eventos').delete().eq('id', id)
  if (error) throw error
}

// Quien organiza el evento lo vuelve a abrir (o lo cierra) para apuntarse después de la hora.
export async function setReabierto(eventId, reabierto) {
  if (DEMO) return
  const { error } = await supabase.from('eventos').update({ reabierto }).eq('id', eventId)
  if (error) throw error
}

// Familia: comensales = adultos (contándome a mí), ninos = niños de 0 a 14 años.
// Amigos invitados: amigos = adultos, amigosNinos = niños (pagan la cuota de invitado).
export async function join(eventId, meId, comensales, ninos = 0, amigos = 0, amigosNinos = 0) {
  if (DEMO) return demo.join(eventId, comensales, ninos, amigos, amigosNinos)
  const { error } = await supabase
    .from('apuntados')
    .upsert({ evento_id: eventId, socio_id: meId, comensales, ninos, amigos, amigos_ninos: amigosNinos })
  if (error) throw error
}

export async function leave(eventId, meId) {
  if (DEMO) return demo.leave(eventId)
  const { error } = await supabase.from('apuntados').delete().eq('evento_id', eventId).eq('socio_id', meId)
  if (error) throw error
}

// ---- Estatutos ----

export async function listSocios() {
  if (DEMO) return demo.listSocios()
  const { data, error } = await supabase.from('socios').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function getNormas() {
  if (DEMO) return demo.getNormas()
  const { data, error } = await supabase
    .from('normas')
    .select('texto, actualizado, autor:socios(nombre)')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw error
  return { texto: data?.texto || '', actualizado: data?.actualizado || null, autor: data?.autor?.nombre || '' }
}

export async function saveNormas(texto) {
  if (DEMO) return demo.saveNormas(texto)
  const { error } = await supabase
    .from('normas')
    .update({ texto, actualizado: new Date().toISOString(), actualizado_por: (await supabase.auth.getUser()).data.user?.id })
    .eq('id', 1)
  if (error) throw error
}

// ---- Listas de la compra ----

const sortItems = (items) => [...items].sort((a, b) => a.created_at.localeCompare(b.created_at))

// Deja la lista del evento con estas cosas (una por línea): añade las nuevas y quita las que ya no están.
async function setEventList(eventoId, titulo, listaId, texto) {
  const wanted = (texto || '').split('\n').map((l) => l.trim()).filter(Boolean)
  if (!listaId) {
    if (!wanted.length) return
    const { data, error } = await supabase.from('listas').insert({ nombre: titulo, evento_id: eventoId }).select('id').single()
    if (error) throw error
    listaId = data.id
  }
  const { data: items, error } = await supabase.from('lista_items').select('id, texto').eq('lista_id', listaId)
  if (error) throw error
  const have = items.map((i) => i.texto)
  const remove = items.filter((i) => !wanted.includes(i.texto)).map((i) => i.id)
  const add = wanted.filter((t, i) => !have.includes(t) && wanted.indexOf(t) === i)
  if (remove.length) {
    const { error: e1 } = await supabase.from('lista_items').delete().in('id', remove)
    if (e1) throw e1
  }
  if (add.length) {
    const { error: e2 } = await supabase.from('lista_items').insert(add.map((t) => ({ lista_id: listaId, texto: t })))
    if (e2) throw e2
  }
  await supabase.from('listas').update({ nombre: titulo }).eq('id', listaId)
}

// Listas de los eventos de hoy en adelante y todas las listas sueltas.
export async function listListas(today) {
  if (DEMO) return demo.listListas()
  const { data, error } = await supabase
    .from('listas')
    .select('id, nombre, evento_id, creado_por, created_at, autor:socios!listas_creado_por_fkey(nombre), evento:eventos(fecha, hora, tipo, titulo, organizador_id, organizador:socios!eventos_organizador_id_fkey(nombre)), items:lista_items(id, texto, comprado, created_at, creado_por)')
    .order('created_at')
  if (error) throw error
  const listas = data.map((l) => ({ ...l, items: sortItems(l.items || []), autor: l.autor?.nombre || '' }))
  return {
    eventos: listas
      .filter((l) => l.evento && l.evento.fecha >= today)
      .sort((a, b) => (a.evento.fecha + a.evento.hora).localeCompare(b.evento.fecha + b.evento.hora)),
    otras: listas.filter((l) => !l.evento_id).reverse(),
  }
}

export async function createLista(nombre) {
  if (DEMO) return demo.createLista(nombre)
  const { error } = await supabase.from('listas').insert({ nombre })
  if (error) throw error
}

export async function deleteLista(id) {
  if (DEMO) return demo.deleteLista(id)
  const { error } = await supabase.from('listas').delete().eq('id', id)
  if (error) throw error
}

export async function addItem(listaId, texto) {
  if (DEMO) return demo.addItem(listaId, texto)
  const { error } = await supabase.from('lista_items').insert({ lista_id: listaId, texto })
  if (error) throw error
}

export async function setComprado(itemId, comprado) {
  if (DEMO) return demo.setComprado(itemId, comprado)
  const { error } = await supabase.from('lista_items').update({ comprado }).eq('id', itemId)
  if (error) throw error
}

export async function deleteItem(itemId) {
  if (DEMO) return demo.deleteItem(itemId)
  const { error } = await supabase.from('lista_items').delete().eq('id', itemId)
  if (error) throw error
}

// ---- Invitaciones de socios ----

// Si la app se abre desde el enlace de una invitación: ?invitacion=TOKEN
export const INVITE_TOKEN = new URLSearchParams(window.location.search).get('invitacion')

export function inviteLink(token) {
  return `${window.location.origin}/?invitacion=${token}`
}

export async function createInvitacion({ nombre, telefono } = {}) {
  if (DEMO) return 'demo'
  const { data, error } = await supabase
    .from('invitaciones')
    .insert({ nombre: nombre || null, telefono: telefono || null })
    .select('token')
    .single()
  if (error) throw error
  return data.token
}

// Las mías (o todas, si soy administrador), de la más nueva a la más vieja.
export async function listInvitaciones() {
  if (DEMO) return []
  const { data, error } = await supabase
    .from('invitaciones')
    .select('id, nombre, telefono, estado, email, nombre_solicitud, created_at, invitado_por, invita:socios!invitaciones_invitado_por_fkey(nombre)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deleteInvitacion(id) {
  if (DEMO) return
  const { error } = await supabase.from('invitaciones').delete().eq('id', id)
  if (error) throw error
}

// Solo administradores: accion = 'aceptar' | 'rechazar'
export async function resolverInvitacion(id, accion) {
  if (DEMO) return
  const { data, error } = await supabase.functions.invoke('aceptar-invitacion', {
    body: { id, accion, redirectTo: window.location.origin },
  })
  if (error) {
    let msg = error.message
    try { msg = (await error.context.json()).error || msg } catch { /* sin detalle */ }
    if (/Failed to send|not found|404/i.test(msg)) msg = 'Falta crear la función "aceptar-invitacion" en Supabase.'
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
}

// Para el invitado, sin haber entrado en la app.
export async function verInvitacion(token) {
  const { data, error } = await supabase.rpc('ver_invitacion', { p_token: token })
  if (error) throw error
  return data?.[0] || null
}

export async function solicitarAlta(token, nombre, email) {
  const { data, error } = await supabase.rpc('solicitar_alta', { p_token: token, p_nombre: nombre, p_email: email })
  if (error) throw error
  if (!data) throw new Error('Esta invitación ya no es válida.')
}

// ---- Foto del socio ----

// Recorta la imagen en cuadrado y la reduce a 512 px (JPEG) para que ocupe poco.
async function squareJpeg(file, size = 512) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null)
  const img = bitmap || await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('No se ha podido leer la imagen.'))
    i.src = URL.createObjectURL(file)
  })
  const w = img.width, h = img.height, side = Math.min(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.min(size, side)
  canvas.getContext('2d').drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
}

// Sube la foto nueva, la guarda en la ficha del socio y borra las anteriores. Devuelve la dirección de la foto.
export async function uploadFoto(userId, file) {
  if (!file.type.startsWith('image/')) throw new Error('Elige una imagen.')
  const blob = await squareJpeg(file)
  if (DEMO) return URL.createObjectURL(blob)
  const path = `${userId}/${Date.now()}.jpg`
  const bucket = supabase.storage.from('avatares')
  const { error } = await bucket.upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw error
  const url = bucket.getPublicUrl(path).data.publicUrl
  const { error: e2 } = await supabase.from('socios').update({ foto_url: url }).eq('id', userId)
  if (e2) throw e2
  await removeOldFotos(userId, path)
  return url
}

export async function removeFoto(userId) {
  if (DEMO) return
  const { error } = await supabase.from('socios').update({ foto_url: null }).eq('id', userId)
  if (error) throw error
  await removeOldFotos(userId, null)
}

async function removeOldFotos(userId, keep) {
  const bucket = supabase.storage.from('avatares')
  const { data } = await bucket.list(userId)
  const old = (data || []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep)
  if (old.length) await bucket.remove(old)
}

// ---- Tarifas y cuota ----

export async function listTarifas() {
  if (DEMO) return demo.listTarifas()
  const { data, error } = await supabase.from('tarifas').select('id, nombre, precio, categoria').order('categoria').order('nombre')
  if (error) throw error
  return data.map((t) => ({ ...t, precio: Number(t.precio) }))
}

// Crea (sin id) o cambia (con id) una tarifa. Solo administradores.
export async function saveTarifa({ id, nombre, precio, categoria }) {
  if (DEMO) return demo.saveTarifa({ id, nombre, precio, categoria })
  const fields = { nombre, precio, categoria }
  const { error } = id
    ? await supabase.from('tarifas').update(fields).eq('id', id)
    : await supabase.from('tarifas').insert(fields)
  if (error) throw error
}

export async function deleteTarifa(id) {
  if (DEMO) return demo.deleteTarifa(id)
  const { error } = await supabase.from('tarifas').delete().eq('id', id)
  if (error) throw error
}

export async function getCuota() {
  return (await getAjustes()).cuota
}

// { cuota, porcentajeNinos }
export async function getAjustes() {
  if (DEMO) return demo.getAjustes()
  const { data, error } = await supabase.from('ajustes').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return { cuota: Number(data?.cuota_mensual || 0), porcentajeNinos: data?.porcentaje_ninos ?? 50 }
}

export async function savePorcentajeNinos(pct) {
  if (DEMO) return demo.savePorcentajeNinos(pct)
  const { error } = await supabase.from('ajustes').update({ porcentaje_ninos: pct, actualizado: new Date().toISOString() }).eq('id', 1)
  if (error) throw error
}

export async function saveCuota(cuota) {
  if (DEMO) return demo.saveCuota(cuota)
  const { error } = await supabase.from('ajustes').update({ cuota_mensual: cuota, actualizado: new Date().toISOString() }).eq('id', 1)
  if (error) throw error
}

// ---- Consumiciones en eventos ----

export async function listMisConsumiciones(eventoId, meId) {
  if (DEMO) return demo.listMisConsumiciones(eventoId)
  const { data, error } = await supabase
    .from('consumiciones')
    .select('id, tarifa_id, nombre, precio, cantidad')
    .eq('evento_id', eventoId)
    .eq('socio_id', meId)
  if (error) throw error
  return data.map((c) => ({ ...c, precio: Number(c.precio) }))
}

// Deja la cantidad de una tarifa en un evento (0 = quitarla).
export async function setConsumicion(eventoId, meId, tarifa, cantidad) {
  if (DEMO) return demo.setConsumicion(eventoId, tarifa, cantidad)
  if (cantidad <= 0) {
    const { error } = await supabase.from('consumiciones').delete()
      .eq('evento_id', eventoId).eq('socio_id', meId).eq('tarifa_id', tarifa.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('consumiciones').upsert(
    { evento_id: eventoId, socio_id: meId, tarifa_id: tarifa.id, nombre: tarifa.nombre, precio: tarifa.precio, cantidad },
    { onConflict: 'evento_id,socio_id,tarifa_id' },
  )
  if (error) throw error
}

// Mis consumiciones de todos los eventos, agrupadas por evento (más reciente primero).
export async function listMisGastos(meId) {
  if (DEMO) return demo.listMisGastos()
  const { data, error } = await supabase
    .from('consumiciones')
    .select('id, nombre, precio, cantidad, evento:eventos(id, fecha, hora, tipo, titulo)')
    .eq('socio_id', meId)
  if (error) throw error
  const byEvent = new Map()
  for (const c of data) {
    if (!c.evento) continue
    const g = byEvent.get(c.evento.id) || { evento: c.evento, items: [], total: 0 }
    const precio = Number(c.precio)
    g.items.push({ ...c, precio })
    g.total += precio * c.cantidad
    byEvent.set(c.evento.id, g)
  }
  return [...byEvent.values()].sort((a, b) => (b.evento.fecha + b.evento.hora).localeCompare(a.evento.fecha + a.evento.hora))
}

// ---- Gastos de la comida (compras para un evento) ----

export async function listGastos(eventoId) {
  if (DEMO) return demo.listGastos(eventoId)
  const { data, error } = await supabase
    .from('gastos_evento')
    .select('id, socio_id, concepto, importe, created_at, socio:socios(nombre)')
    .eq('evento_id', eventoId)
    .order('created_at')
  if (error) throw error
  return data.map((g) => ({ ...g, importe: Number(g.importe), nombre: g.socio?.nombre || '—' }))
}

export async function addGasto(eventoId, concepto, importe) {
  if (DEMO) return demo.addGasto(eventoId, concepto, importe)
  const { error } = await supabase.from('gastos_evento').insert({ evento_id: eventoId, concepto, importe })
  if (error) throw error
}

export async function deleteGasto(id) {
  if (DEMO) return demo.deleteGasto(id)
  const { error } = await supabase.from('gastos_evento').delete().eq('id', id)
  if (error) throw error
}

// Mis cuentas por evento: mi parte de la comida + mis consumiciones − lo que he pagado.
// Incluye los eventos a los que voy y aquellos donde he consumido o pagado algo aunque no vaya.
// Solo eventos con gastos o consumiciones, del más reciente al más antiguo.
export async function listMisCuentas(meId) {
  if (DEMO) return demo.listMisCuentas()
  const EV = 'id, fecha, hora, tipo, titulo, apuntados(socio_id, comensales, ninos, amigos, amigos_ninos)'
  const [{ data: mios, error: e1 }, { data: misPagos, error: e2 }, consumos, ajustes, cuotaInv] = await Promise.all([
    supabase.from('apuntados').select(`evento:eventos(${EV})`).eq('socio_id', meId),
    supabase.from('gastos_evento').select('evento_id').eq('socio_id', meId),
    listMisGastos(meId),
    getAjustes(),
    getCuotasInvitado(),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const eventos = (mios || []).map((m) => m.evento).filter(Boolean)
  const faltan = [...new Set([...misPagos.map((g) => g.evento_id), ...consumos.map((c) => c.evento.id)])]
    .filter((id) => !eventos.some((e) => e.id === id))
  if (faltan.length) {
    const { data, error } = await supabase.from('eventos').select(EV).in('id', faltan)
    if (error) throw error
    eventos.push(...data)
  }
  const ids = eventos.map((e) => e.id)
  let gastos = []
  let pagos = []
  if (ids.length) {
    const { data, error } = await supabase.from('gastos_evento').select('evento_id, socio_id, importe').in('evento_id', ids)
    if (error) throw error
    gastos = data
    const { data: ps, error: e3 } = await supabase.from('pagos_evento').select('evento_id, importe, pagado_at').eq('socio_id', meId).in('evento_id', ids)
    if (!e3) pagos = ps // si aún no existe la tabla, se sigue sin pagos
  }
  const out = []
  for (const e of eventos) {
    const g = gastos.filter((x) => x.evento_id === e.id)
    const c = consumos.find((x) => x.evento.id === e.id)
    const yo = e.apuntados.find((x) => x.socio_id === meId)
    const conFamilia = (cuotaInv.famAdulto && yo?.comensales > 1) || (cuotaInv.famNino && yo?.ninos)
    if (!g.length && !c && !(yo?.amigos || yo?.amigos_ninos || conFamilia)) continue
    const p = pagos.find((x) => x.evento_id === e.id)
    out.push({
      evento: e,
      consumos: c?.items || [],
      pago: p ? { importe: Number(p.importe), pagado_at: p.pagado_at } : null,
      ...reparto({ apuntados: e.apuntados, gastos: g, pct: ajustes.porcentajeNinos, meId, consumo: c?.total || 0, cuotaInv }),
    })
  }
  return out.sort((a, b) => (b.evento.fecha + b.evento.hora).localeCompare(a.evento.fecha + a.evento.hora))
}

export async function deleteConsumicion(id) {
  if (DEMO) return demo.deleteConsumicion(id)
  const { error } = await supabase.from('consumiciones').delete().eq('id', id)
  if (error) throw error
}

export async function updateGasto(id, concepto, importe) {
  if (DEMO) return demo.updateGasto(id, concepto, importe)
  const { error } = await supabase.from('gastos_evento').update({ concepto, importe }).eq('id', id)
  if (error) throw error
}

// ---- "Pagado" de cada evento ----

export async function getMiPago(eventoId, meId) {
  if (DEMO) return demo.getMiPago(eventoId)
  const { data, error } = await supabase.from('pagos_evento').select('importe, pagado_at').eq('evento_id', eventoId).eq('socio_id', meId).maybeSingle()
  if (error) throw error
  return data ? { importe: Number(data.importe), pagado_at: data.pagado_at } : null
}

export async function marcarPagado(eventoId, meId, importe) {
  if (DEMO) return demo.marcarPagado(eventoId, importe)
  const { error } = await supabase.from('pagos_evento').upsert(
    { evento_id: eventoId, socio_id: meId, importe, pagado_at: new Date().toISOString() },
    { onConflict: 'evento_id,socio_id' },
  )
  if (error) throw error
}

export async function quitarPagado(eventoId, meId) {
  if (DEMO) return demo.quitarPagado(eventoId)
  const { error } = await supabase.from('pagos_evento').delete().eq('evento_id', eventoId).eq('socio_id', meId)
  if (error) throw error
}

// ---- Campana de avisos: eventos creados por otros socios ----

// Últimos eventos creados por otros (de hoy en adelante) y cuántos son nuevos desde la última vez.
export async function listAvisos(me) {
  if (DEMO) return { list: [], nuevos: 0 }
  const { data, error } = await supabase
    .from('eventos')
    .select('id, fecha, hora, tipo, titulo, created_at, organizador:socios!eventos_organizador_id_fkey(nombre)')
    .neq('organizador_id', me.id)
    .gte('fecha', dateKey())
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  const visto = me.avisos_vistos_at || '1970-01-01'
  const list = data.map((e) => ({ ...e, organizador: e.organizador?.nombre || '—', nuevo: e.created_at > visto }))
  return { list, nuevos: list.filter((e) => e.nuevo).length }
}

export async function marcarAvisosVistos(meId) {
  if (DEMO) return
  const now = new Date().toISOString()
  const { error } = await supabase.from('socios').update({ avisos_vistos_at: now }).eq('id', meId)
  if (error) throw error
  return now
}

// Cuotas de invitado (Tarifas → Invitados). Por el nombre de cada tarifa:
// "familiar" = familia del socio (si no, amigo); "infantil"/"niño" = niños (si no, adultos).
export async function getCuotasInvitado() {
  const inv = (await listTarifas()).filter((t) => t.categoria === 'Invitado')
  const esFam = (t) => /famil/i.test(t.nombre)
  const esNino = (t) => /infantil|niñ/i.test(t.nombre)
  const precio = (fam, nino) => inv.find((t) => esFam(t) === fam && esNino(t) === nino)?.precio || 0
  return { adulto: precio(false, false), nino: precio(false, true), famAdulto: precio(true, false), famNino: precio(true, true) }
}

// ---- Bajas de socios (solo administradores) ----

export async function setBaja(socioId, baja) {
  if (DEMO) return demo.setBaja(socioId, baja)
  const { error } = await supabase.rpc('dar_de_baja', { p_socio: socioId, p_baja: baja })
  if (error) throw error
}

// Dar o quitar permisos de administrador a otro socio (solo administradores).
export async function setAdmin(socioId, admin) {
  if (DEMO) return
  const { error } = await supabase.rpc('set_admin', { p_socio: socioId, p_admin: admin })
  if (error) throw error
}

// { invitacion_id: socio_id } de las invitaciones aceptadas (solo administradores).
export async function sociosDeInvitaciones() {
  if (DEMO) return {}
  const { data, error } = await supabase.rpc('socios_de_invitaciones')
  if (error) throw error
  return Object.fromEntries(data.map((r) => [r.invitacion_id, r.socio_id]))
}
