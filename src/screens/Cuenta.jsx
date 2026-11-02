import { useCallback, useRef, useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import { Avatar, Camera, Chevron, Pencil } from '../components/Icons.jsx'

// Mis datos: email, contraseña, teléfono e información personal (nombre y apellidos).
export default function Cuenta({ me, email, onSaveProfile, onSaveEmail, onSavePassword, onSaveFoto, onRemoveFoto, onBack }) {
  const [editing, setEditing] = useState(null) // 'email' | 'password' | 'telefono' | 'personal'
  const close = useCallback(() => setEditing(null), [])

  return (
    <section className="screen">
      <div className="screen-title-row cuenta-title">
        <ScreenTitle title="Mis datos" onBack={onBack} />
        <span className="badge admin">{me.es_admin ? 'Socio · Admin' : 'Socio'}</span>
      </div>

      <FotoPerfil me={me} onSave={onSaveFoto} onRemove={onRemoveFoto} />

      <div className="card data-list">
        <DataRow label="Email" value={email || '—'} onClick={() => setEditing('email')} />
        <DataRow label="Contraseña" value="••••••••••" onClick={() => setEditing('password')} />
        <DataRow label="Teléfono" value={me.telefono || 'Sin añadir'} empty={!me.telefono} onClick={() => setEditing('telefono')} />
      </div>

      <div className="card data-list">
        <div className="data-head">
          <h2>Información personal</h2>
          <button type="button" className="icon-plain" aria-label="Editar información personal" onClick={() => setEditing('personal')}>
            <Pencil size={20} />
          </button>
        </div>
        <div className="data-field">
          <span className="data-label">Nombre</span>
          <span className="data-value">{me.nombre}</span>
        </div>
        <div className="data-field">
          <span className="data-label">Apellidos</span>
          <span className={`data-value${me.apellidos ? '' : ' is-empty'}`}>{me.apellidos || 'Sin añadir'}</span>
        </div>
      </div>

      {editing === 'email' ? (
        <EditSheet
          title="Cambiar email"
          fields={[{ id: 'email', label: 'Email nuevo', type: 'email', value: email, autoComplete: 'email', required: true }]}
          note="Te llegará un correo a la dirección nueva para confirmarla. Hasta entonces seguirás entrando con la de ahora."
          doneText="Te hemos enviado un correo para confirmar el email nuevo."
          onClose={close}
          onSave={({ email: nuevo }) => onSaveEmail(nuevo.trim())}
        />
      ) : editing === 'password' ? (
        <EditSheet
          title="Cambiar contraseña"
          fields={[
            { id: 'pw', label: 'Contraseña nueva', type: 'password', autoComplete: 'new-password', required: true },
            { id: 'pw2', label: 'Repítela', type: 'password', autoComplete: 'new-password', required: true },
          ]}
          doneText="Contraseña cambiada."
          onClose={close}
          onSave={({ pw, pw2 }) => {
            if (pw.length < 8) throw new Error('La contraseña tiene que tener al menos 8 caracteres.')
            if (pw !== pw2) throw new Error('Las dos contraseñas no coinciden.')
            return onSavePassword(pw)
          }}
        />
      ) : editing === 'telefono' ? (
        <EditSheet
          title="Teléfono"
          fields={[{ id: 'telefono', label: 'Teléfono', type: 'tel', value: me.telefono || '', autoComplete: 'tel', placeholder: '+34 600 000 000' }]}
          onClose={close}
          onSave={({ telefono }) => onSaveProfile({ telefono: telefono.trim() || null })}
        />
      ) : editing === 'personal' ? (
        <EditSheet
          title="Información personal"
          fields={[
            { id: 'nombre', label: 'Nombre (lo ven los demás socios)', value: me.nombre, autoComplete: 'given-name', required: true, maxLength: 40 },
            { id: 'apellidos', label: 'Apellidos', value: me.apellidos || '', autoComplete: 'family-name', maxLength: 80 },
          ]}
          onClose={close}
          onSave={({ nombre, apellidos }) => onSaveProfile({ nombre: nombre.trim(), apellidos: apellidos.trim() || null })}
        />
      ) : null}
    </section>
  )
}

function DataRow({ label, value, empty, onClick }) {
  return (
    <button type="button" className="data-row" onClick={onClick}>
      <span className="data-field">
        <span className="data-label">{label}</span>
        <span className={`data-value${empty ? ' is-empty' : ''}`}>{value}</span>
      </span>
      <Chevron size={20} className="chevron" />
    </button>
  )
}

// Panel con uno o varios campos. Si hay doneText, al guardar muestra ese mensaje; si no, se cierra.
function EditSheet({ title, fields, note, doneText, onClose, onSave }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.id, f.value || ''])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSave(values)
      if (doneText) setDone(true)
      else onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title={title} onClose={onClose}>
      {done ? (
        <div className="form">
          <p className="ok" role="status">{doneText}</p>
          <button type="button" className="btn primary block" onClick={onClose}>Cerrar</button>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          {fields.map((f) => (
            <div key={f.id} className="field">
              <label className="label" htmlFor={`f-${f.id}`}>{f.label}</label>
              <input
                id={`f-${f.id}`}
                className="input"
                type={f.type || 'text'}
                required={f.required}
                maxLength={f.maxLength}
                autoComplete={f.autoComplete}
                placeholder={f.placeholder}
                value={values[f.id]}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            </div>
          ))}
          {note ? <p className="small muted">{note}</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" className="btn primary block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </form>
      )}
    </Sheet>
  )
}

// Foto del socio en grande, con botón para elegir una de la galería, la cámara o los archivos.
function FotoPerfil({ me, onSave, onRemove }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(fn) {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(/bucket|not found/i.test(err.message) ? 'Falta preparar el almacenamiento de fotos en Supabase.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) run(() => onSave(file))
  }

  return (
    <div className="foto-perfil">
      <button type="button" className="foto-btn" onClick={() => input.current?.click()} disabled={busy} aria-label={me.foto_url ? 'Cambiar mi foto' : 'Añadir una foto'}>
        <Avatar src={me.foto_url} size={84} className="avatar-lg" />
        <span className="foto-badge"><Camera size={18} /></span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
      <div className="foto-actions">
        <button type="button" className="btn link-btn small-btn" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Guardando…' : me.foto_url ? 'Cambiar foto' : 'Añadir foto'}
        </button>
        {me.foto_url && !busy ? (
          <button type="button" className="btn danger small-btn" onClick={() => run(onRemove)}>Quitar</button>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
