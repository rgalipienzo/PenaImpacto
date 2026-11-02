import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { KIND_LABEL, esReserva, horaText, shortDate } from '../lib.js'

// Tras crear un evento: mensaje listo para mandar al grupo de WhatsApp del txoko.
// (WhatsApp no deja que una app escriba sola en un grupo: lo envía quien crea el evento.)
export default function AvisarGrupo({ evento, onClose }) {
  const [error, setError] = useState('')
  const url = window.location.origin
  const texto = esReserva(evento)
    ? `🔒 El txoko está reservado el ${shortDate(evento.fecha).toLowerCase()} (${horaText(evento).toLowerCase()}) por ${evento.titulo}.\nLo tenéis en el calendario de Peña Impacto.`
    : `📅 Nuevo evento en el txoko: ${KIND_LABEL[evento.tipo].toLowerCase()} «${evento.titulo}» ` +
      `el ${shortDate(evento.fecha).toLowerCase()} a las ${evento.hora.slice(0, 5)}.\n¡Apúntate en Peña Impacto!`
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`
  const canShare = typeof navigator.share === 'function'

  async function share() {
    setError('')
    try {
      await navigator.share({ text: texto, url })
      onClose()
    } catch (err) {
      if (err?.name !== 'AbortError') setError('No se ha podido abrir Compartir. Prueba con WhatsApp.')
    }
  }

  return (
    <Sheet title="Evento creado" onClose={onClose}>
      <div className="form">
        <p className="ok" role="status">{esReserva(evento) ? 'Día reservado. Ya está en el calendario, en rojo.' : 'Ya está en el calendario.'}</p>
        <p className="muted">{esReserva(evento) ? '¿Avisas al grupo de WhatsApp?' : '¿Avisas al grupo de WhatsApp para que se apunten?'}</p>
        <p className="aviso-preview">{texto}</p>
        <a className="btn whatsapp block" href={waUrl} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(onClose, 300)}>
          Avisar al grupo de WhatsApp
        </a>
        {canShare ? <button type="button" className="btn secondary block" onClick={share}>Compartir de otra forma</button> : null}
        {error ? <p className="error">{error}</p> : null}
        <button type="button" className="btn link-btn block" onClick={onClose}>Ahora no</button>
      </div>
    </Sheet>
  )
}
