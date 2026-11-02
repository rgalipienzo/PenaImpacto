import { useCallback, useEffect, useState } from 'react'
import * as api from '../api.js'
import Sheet from './Sheet.jsx'
import { Close } from './Icons.jsx'

const ESTADO = {
  enviada: { text: 'Enviada', cls: '' },
  solicitada: { text: 'Pendiente de aceptar', cls: 'warn' },
  aceptada: { text: 'Aceptada', cls: 'ok' },
  rechazada: { text: 'Rechazada', cls: 'ko' },
}

// Carga las invitaciones que el socio puede ver (las suyas; todas si es administrador)
// y da una función para ejecutar acciones y recargar después.
export function useInvitaciones() {
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      setList(await api.listInvitaciones())
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function run(id, fn) {
    setBusyId(id)
    setError('')
    try {
      await fn()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return { list, error, busyId, load, run }
}

// Una invitación con su estado y, si se puede, la ✕ para retirarla.
// Si se pasa onPick (invitación aceptada de un socio), la fila se puede tocar para darle de baja.
export function InviteRow({ inv, me, busy, onRemove, showWho, socio, onPick }) {
  const deBaja = socio?.baja
  const Tag = onPick ? 'button' : 'div'
  return (
    <Tag type={onPick ? 'button' : undefined} className={`invite-row${onPick ? ' invite-pick' : ''}`} onClick={onPick}>
      <div className="data-field">
        <span className="data-value">{inv.nombre_solicitud || inv.nombre || 'Sin nombre'}</span>
        <span className="small muted">
          {new Date(inv.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          {inv.email ? ` · ${inv.email}` : ''}
          {showWho ? ` · invitado por ${inv.invita?.nombre}` : ''}
        </span>
      </div>
      {deBaja ? <span className="state ko">De baja</span> : <span className={`state ${ESTADO[inv.estado].cls}`}>{ESTADO[inv.estado].text}</span>}
      {(inv.estado === 'enviada' || inv.estado === 'solicitada') && (inv.invitado_por === me.id || me.es_admin) ? (
        <button type="button" className="icon-plain" aria-label="Retirar invitación" disabled={busy} onClick={onRemove}>
          <Close size={16} />
        </button>
      ) : null}
    </Tag>
  )
}

// Se comparte con el botón "Compartir" del propio móvil u ordenador (WhatsApp, Telegram, SMS, correo…).
// Si el dispositivo no lo tiene, se ofrece WhatsApp y copiar el enlace.
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

export function InviteSheet({ me, onClose }) {
  const [nombre, setNombre] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState(null)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setToken(await api.createInvitacion({ nombre: nombre.trim() }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const link = token ? api.inviteLink(token) : ''
  const saludo = nombre.trim() ? `¡Hola ${nombre.trim().split(' ')[0]}!` : '¡Hola!'
  const texto = `${saludo} ${me.nombre} te invita a Peña Impacto, la app del txoko para apuntarse a almuerzos, comidas y cenas. Pide tu alta aquí:`
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${texto} ${link}`)}`

  async function share() {
    setError('')
    try {
      await navigator.share({ title: 'Invitación a Peña Impacto', text: texto, url: link })
      setShared(true)
    } catch (err) {
      if (err?.name !== 'AbortError') setError('No se ha podido abrir Compartir. Copia el enlace y mándalo tú.')
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${texto} ${link}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Sheet title="Invitar a un socio" onClose={onClose}>
      {!token ? (
        <form className="form" onSubmit={submit}>
          <p className="small muted">Prepararemos un enlace para que pida el alta y lo podrás mandar por WhatsApp, SMS, correo… Un administrador tendrá que aceptarla.</p>
          <div className="field">
            <label className="label" htmlFor="inv-nombre">Nombre del socio (opcional)</label>
            <input id="inv-nombre" className="input" type="text" maxLength={80} autoComplete="off" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" className="btn primary block" disabled={busy}>{busy ? 'Preparando…' : 'Preparar invitación'}</button>
        </form>
      ) : (
        <div className="form">
          <p className="ok" role="status">
            {shared ? 'Invitación compartida.' : `Invitación lista${nombre.trim() ? ` para ${nombre.trim()}` : ''}. Elige cómo enviarla:`}
          </p>
          {canShare ? (
            <button type="button" className="btn primary block" onClick={share}>Compartir</button>
          ) : (
            <a className="btn whatsapp block" href={waUrl} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>
          )}
          <button type="button" className="btn secondary block" onClick={copy}>{copied ? 'Mensaje copiado' : 'Copiar mensaje con el enlace'}</button>
          {error ? <p className="error">{error}</p> : null}
          <button type="button" className="btn link-btn block" onClick={onClose}>Hecho</button>
        </div>
      )}
    </Sheet>
  )
}
