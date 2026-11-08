import { useEffect, useState } from 'react'
import * as api from '../api.js'
import Sheet from './Sheet.jsx'
import { Close, Minus, Plus } from './Icons.jsx'
import { genteText } from '../lib.js'
import { confirmar } from './confirmar.jsx'

// Solo administradores: apuntar a cualquier socio en un evento, cambiar sus comensales o quitarlo,
// en cualquier momento (también después de la comida, para que cuadre el reparto).
export default function CorregirApuntados({ event, onClose, onChanged }) {
  const [socios, setSocios] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // socio que se está corrigiendo
  const [busyId, setBusyId] = useState(null)
  const [quitarError, setQuitarError] = useState('')

  useEffect(() => {
    api.listSocios().then((l) => setSocios(l.filter((s) => !s.baja)), (err) => setError(err.message))
  }, [])

  const apuntado = (id) => event.apuntados.find((a) => a.id === id)
  const van = (socios || []).filter((s) => apuntado(s.id))
  const noVan = (socios || []).filter((s) => !apuntado(s.id))

  async function quitar(s) {
    if (!(await confirmar(`¿Quitar a ${s.nombre} de «${event.titulo}»?`, { si: 'Quitar' }))) return
    setBusyId(s.id)
    setQuitarError('')
    try {
      await api.leave(event.id, s.id)
      await onChanged()
    } catch (err) {
      setQuitarError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (editing) {
    return (
      <Editar
        event={event}
        socio={editing}
        apuntado={apuntado(editing.id)}
        onClose={() => setEditing(null)}
        onSaved={async () => { await onChanged(); setEditing(null) }}
      />
    )
  }

  return (
    <Sheet title="Corregir apuntados" onClose={onClose}>
      <p className="small muted">Como administrador puedes apuntar a cualquier socio, cambiar con cuántos va o quitarlo. Cuenta para el reparto de la comida.</p>
      {error ? <p className="error">{error}</p> : !socios ? <div className="empty">Cargando…</div> : (
        <>
          <p className="counter-group">Apuntados</p>
          {van.length ? (
            <ul className="corregir-list">
              {van.map((s) => (
                <li key={s.id} className="corregir-item">
                  <button type="button" className="corregir-row" onClick={() => setEditing(s)}>
                    <span>{s.nombre}{s.id === event.organizadorId ? <span className="muted"> · organiza</span> : null}</span>
                    <span className="muted">{genteText(apuntado(s.id))}</span>
                  </button>
                  <button type="button" className="icon-plain" aria-label={`Quitar a ${s.nombre}`} disabled={busyId === s.id} onClick={() => quitar(s)}>
                    <Close size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="small muted">Todavía no hay nadie apuntado.</p>}
          {quitarError ? <p className="error">{quitarError}</p> : null}
          {van.length ? <p className="small muted">Toca un nombre para cambiar con cuántos va, o la ✕ para quitarlo.</p> : null}
          {noVan.length ? (
            <>
              <p className="counter-group">Sin apuntar</p>
              <ul className="corregir-list">
                {noVan.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="corregir-row" onClick={() => setEditing(s)}>
                      <span>{s.nombre}</span>
                      <span className="corregir-add"><Plus size={16} /> Apuntar</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </Sheet>
  )
}

function Editar({ event, socio, apuntado, onClose, onSaved }) {
  const [adultos, setAdultos] = useState(apuntado?.comensales || 1)
  const [ninos, setNinos] = useState(apuntado?.ninos || 0)
  const [amigos, setAmigos] = useState(apuntado?.amigos || 0)
  const [amigosNinos, setAmigosNinos] = useState(apuntado?.amigos_ninos || 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(fn) {
    setBusy(true)
    setError('')
    try {
      await fn()
      await onSaved()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function quitar() {
    if (await confirmar(`¿Quitar a ${socio.nombre} de «${event.titulo}»?`, { si: 'Quitar' })) run(() => api.leave(event.id, socio.id))
  }

  return (
    <Sheet title={socio.nombre} onClose={onClose}>
      <p className="counter-group">Familia</p>
      <Contador id="c-adultos" label="Adultos" hint={`Contando a ${socio.nombre}`} value={adultos} min={1} onChange={setAdultos} />
      <Contador id="c-ninos" label="Niños" value={ninos} min={0} onChange={setNinos} />
      <p className="counter-group">Amigos invitados</p>
      <Contador id="c-amigos" label="Adultos" value={amigos} min={0} onChange={setAmigos} />
      <Contador id="c-amigos-ninos" label="Niños" value={amigosNinos} min={0} onChange={setAmigosNinos} />
      {error ? <p className="error">{error}</p> : null}
      <div className="actions">
        <button type="button" className="btn primary block" disabled={busy} onClick={() => run(() => api.join(event.id, socio.id, adultos, ninos, amigos, amigosNinos))}>
          {apuntado ? 'Guardar' : `Apuntar a ${socio.nombre}`}
        </button>
        {apuntado ? (
          <button type="button" className="btn secondary block" disabled={busy} onClick={quitar}>Quitar del evento</button>
        ) : null}
        <button type="button" className="btn link-btn block" disabled={busy} onClick={onClose}>Volver</button>
      </div>
    </Sheet>
  )
}

function Contador({ id, label, hint, value, min, onChange }) {
  return (
    <div className="counter" role="group" aria-labelledby={`${id}-label`}>
      <span className="counter-label" id={`${id}-label`}>
        {label}
        {hint ? <span className="counter-hint">{hint}</span> : null}
      </span>
      <div className="stepper">
        <button type="button" className="icon-btn" aria-label={`${label}: uno menos`} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus size={20} /></button>
        <output aria-live="polite">{value}</output>
        <button type="button" className="icon-btn" aria-label={`${label}: uno más`} disabled={value >= 50} onClick={() => onChange(value + 1)}><Plus size={20} /></button>
      </div>
    </div>
  )
}
