import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { KIND_ICON } from './Icons.jsx'
import { FRANJAS, KINDS, dateKey } from '../lib.js'

// Sirve para crear un evento nuevo o, si recibe `event`, para modificarlo.
// reservas: { 'AAAA-MM-DD': 'Nombre' } para avisar si el día ya está reservado.
export default function EventForm({ event, initialDate, reservas = {}, meNombre = '', onClose, onSave }) {
  const [tipo, setTipo] = useState(event?.tipo || 'comida')
  const [fecha, setFecha] = useState(event?.fecha || initialDate || dateKey())
  const [hora, setHora] = useState(event?.hora || '14:30')
  const [titulo, setTitulo] = useState(event?.titulo || '')
  const [notas, setNotas] = useState(event?.notas || '')
  const [compra, setCompra] = useState(event ? event.compra.join('\n') : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const kind = KINDS.find((k) => k.id === tipo)
  const reserva = tipo === 'reserva'
  const reservadoPor = reservas[fecha]

  function pick(k) {
    setTipo(k.id)
    setHora(k.hora)
    // En una reserva se pone el nombre de quien reserva: por defecto, el mío.
    if (k.id === 'reserva' && !titulo.trim()) setTitulo(meNombre)
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSave({ tipo, fecha, hora, titulo: titulo.trim() || (reserva ? meNombre : kind.titulo), notas: notas.trim() || null, compra: reserva ? '' : compra })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Sheet title={event ? 'Modificar evento' : 'Nuevo evento'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <fieldset className="field">
          <legend className="label">Tipo</legend>
          <div className="segmented four">
            {KINDS.map((k) => {
              const Icon = KIND_ICON[k.id]
              return (
                <label key={k.id} className={tipo === k.id ? 'is-on' : ''}>
                  <input type="radio" name="tipo" value={k.id} checked={tipo === k.id} onChange={() => pick(k)} />
                  <Icon size={20} />
                  {k.label}
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className={reserva ? 'field' : 'row2'}>
          <div className="field">
            <label className="label" htmlFor="fecha">Día</label>
            <input id="fecha" className="input" type="date" required min={dateKey()} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          {reserva ? null : (
            <div className="field">
              <label className="label" htmlFor="hora">Hora</label>
              <input id="hora" className="input" type="time" required value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          )}
        </div>
        {reserva ? (
          <fieldset className="field">
            <legend className="label">¿Cuándo?</legend>
            <div className="segmented">
              {FRANJAS.map((f) => (
                <label key={f.id} className={hora.slice(0, 5) === f.hora ? 'is-on' : ''}>
                  <input type="radio" name="franja" value={f.id} checked={hora.slice(0, 5) === f.hora} onChange={() => setHora(f.hora)} />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        {reservadoPor && !(event && event.fecha === fecha) ? (
          <p className="reserva-aviso">⚠️ Ese día está reservado por {reservadoPor}.</p>
        ) : null}

        <div className="field">
          <label className="label" htmlFor="titulo">{reserva ? '¿Quién reserva?' : kind.label}</label>
          <input id="titulo" className="input" type="text" maxLength={80} placeholder={reserva ? 'Nombre de la socia o persona' : kind.titulo} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>

        <div className="field">
          <label className="label" htmlFor="notas">Notas (opcional)</label>
          <textarea id="notas" className="input" rows={3} maxLength={500} placeholder={reserva ? 'Motivo, horario…' : 'Menú, qué traer…'} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        {reserva ? null : (
          <div className="field">
            <label className="label" htmlFor="compra">Lista de la compra (opcional)</label>
            <textarea id="compra" className="input" rows={5} maxLength={2000} placeholder={'Una cosa en cada línea:\nPan\nTxistorra\nSidra'} value={compra} onChange={(e) => setCompra(e.target.value)} />
          </div>
        )}

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" className={`btn block ${reserva ? 'danger-fill' : 'primary'}`} disabled={busy}>
          {busy ? 'Guardando…' : event ? 'Guardar cambios' : reserva ? 'Reservar el día' : 'Crear evento'}
        </button>
        {event ? null : (
          <p className="small muted center-text">
            {reserva ? 'El día saldrá en rojo en el calendario como reservado por esa persona.' : 'Quedarás apuntado como organizador.'}
          </p>
        )}
      </form>
    </Sheet>
  )
}
