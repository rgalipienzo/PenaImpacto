import { useState } from 'react'
import * as api from '../api.js'
import Sheet from './Sheet.jsx'
import { Avatar } from './Icons.jsx'
import { confirmar } from './confirmar.jsx'

// Panel del administrador al tocar un socio: hacerle administrador (o quitárselo)
// y darle de baja (o readmitirle si ya lo está).
export default function BajaSheet({ socio, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const baja = !socio.baja

  async function cambiarAdmin() {
    const dar = !socio.es_admin
    const ok = await confirmar(
      dar
        ? `¿Hacer administrador a ${socio.nombre}? Podrá cambiar normas y tarifas, dar de alta y de baja, y modificar o borrar cualquier evento.`
        : `¿Quitar a ${socio.nombre} los permisos de administrador?`,
      { si: dar ? 'Hacer administrador' : 'Quitar' },
    )
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await api.setAdmin(socio.id, dar)
      onDone()
    } catch (err) {
      setError(/set_admin|function/i.test(err.message) ? 'Falta preparar los administradores en Supabase.' : err.message)
      setBusy(false)
    }
  }

  async function hacer() {
    setBusy(true)
    setError('')
    try {
      await api.setBaja(socio.id, baja)
      onDone()
    } catch (err) {
      setError(/dar_de_baja|function/i.test(err.message) ? 'Falta preparar las bajas en Supabase.' : err.message)
      setBusy(false)
    }
  }

  return (
    <Sheet title={socio.nombre} onClose={onClose}>
      <div className="form">
        <div className="baja-head">
          <Avatar src={socio.foto_url} size={56} />
          <p className="muted">
            {baja
              ? 'Si se da de baja, ya no podrá entrar en la app. Sus eventos, gastos y pagos se conservan.'
              : `Está dado de baja${socio.baja_at ? ` desde el ${new Date(socio.baja_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}. Si se readmite, podrá volver a entrar con su email y contraseña.`}
          </p>
        </div>
        {baja ? (
          <div className="admin-box">
            <p className="counter-group">Administrador</p>
            <p className="small muted">
              {socio.es_admin
                ? `${socio.nombre} es administrador. Puedes quitarle el permiso cuando quieras.`
                : 'Dale permiso de administrador si tiene que hacer cambios cuando tú no estés. Se lo puedes quitar cuando quieras.'}
            </p>
            <button type="button" className="btn secondary block" disabled={busy} onClick={cambiarAdmin}>
              {socio.es_admin ? 'Quitar administrador' : 'Hacer administrador'}
            </button>
          </div>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <button type="button" className={`btn block ${baja ? 'danger-fill' : 'primary'}`} disabled={busy} onClick={hacer}>
          {busy ? 'Un momento…' : baja ? `Dar de baja a ${socio.nombre}` : `Readmitir a ${socio.nombre}`}
        </button>
        <button type="button" className="btn link-btn block" onClick={onClose}>Cancelar</button>
      </div>
    </Sheet>
  )
}
