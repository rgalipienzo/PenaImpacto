import { useState } from 'react'
import * as api from '../api.js'
import Sheet from './Sheet.jsx'
import { Avatar } from './Icons.jsx'

// Panel del administrador al tocar un socio: dar de baja (o readmitir si ya lo está).
export default function BajaSheet({ socio, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const baja = !socio.baja

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
        {error ? <p className="error">{error}</p> : null}
        <button type="button" className={`btn block ${baja ? 'danger-fill' : 'primary'}`} disabled={busy} onClick={hacer}>
          {busy ? 'Un momento…' : baja ? `Dar de baja a ${socio.nombre}` : `Readmitir a ${socio.nombre}`}
        </button>
        <button type="button" className="btn link-btn block" onClick={onClose}>Cancelar</button>
      </div>
    </Sheet>
  )
}
