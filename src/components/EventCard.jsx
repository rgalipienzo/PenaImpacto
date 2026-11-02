import { KIND_ICON, Chevron } from './Icons.jsx'
import { KIND_LABEL, esReserva, horaText, plural } from '../lib.js'

export default function EventCard({ event, onOpen }) {
  const Icon = KIND_ICON[event.tipo]
  return (
    <button type="button" className="event" onClick={() => onOpen(event)}>
      <span className={`event-icon ${event.tipo}`}>
        <Icon size={26} />
      </span>
      <span className="event-body">
        <span className="event-meta">
          <span className={`event-kind ${event.tipo}`}>{KIND_LABEL[event.tipo]}</span> · {horaText(event)}
          {event.misComensales && !esReserva(event) ? <span className="badge">Vas</span> : null}
        </span>
        <span className="event-title">{esReserva(event) ? 'Día reservado' : event.titulo}</span>
        <span className="event-sub">
          {esReserva(event) ? `Reservado por ${event.titulo}` : `${plural(event.personas, 'apuntado', 'apuntados')} · Organiza ${event.organizador}`}
        </span>
      </span>
      <Chevron size={20} className="chevron" />
    </button>
  )
}

