import { KIND_ICON, Plus } from '../components/Icons.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import { KIND_LABEL, esReserva, horaText, addDays, genteText, joinClosed, plural, shortDate } from '../lib.js'

// Agrupa eventos ya ordenados por fecha: [{ fecha, items }]
export function groupByDay(events) {
  const dias = []
  for (const e of events) {
    const last = dias[dias.length - 1]
    if (last && last.fecha === e.fecha) last.items.push(e)
    else dias.push({ fecha: e.fecha, items: [e] })
  }
  return dias
}

// Todos los eventos de todos los socios, con quién va a cada uno.
// Desde aquí solo se puede apuntar uno con el botón +; crear eventos se hace desde el Calendario.
export default function Eventos({ meId, today, events, loaded, error, onJoin, onRetry, onBack }) {
  const dias = groupByDay(events)
  const label = (f) => (f === today ? 'Hoy' : f === addDays(today, 1) ? 'Mañana' : shortDate(f))

  return (
    <section className="screen">
      <ScreenTitle title="Eventos" onBack={onBack} />
      <p className="pantalla-aviso">
        En esta pantalla solo puedes apuntarte. Para modificar o borrar un evento, quien lo organiza tiene que hacerlo desde el Calendario.
      </p>

      {error ? (
        <div className="empty">
          <p>No se han podido cargar los eventos.</p>
          <button type="button" className="btn secondary" onClick={onRetry}>Reintentar</button>
        </div>
      ) : !loaded ? (
        <div className="empty">Cargando…</div>
      ) : dias.length ? (
        dias.map((d) => (
          <div key={d.fecha} className="day-group">
            <h2 className="day-title">{label(d.fecha)}</h2>
            <div className="events">
              {d.items.map((e) => <EventFull key={e.id} event={e} meId={meId} onJoin={onJoin} />)}
            </div>
          </div>
        ))
      ) : (
        <div className="empty">No hay eventos organizados. Se crean desde el Calendario.</div>
      )}
    </section>
  )
}

// Un evento con la lista completa de socios apuntados y sus comensales.
function EventFull({ event, meId, onJoin }) {
  const Icon = KIND_ICON[event.tipo]
  // Día reservado por un socio para algo particular: solo se avisa, no se apunta nadie.
  if (esReserva(event)) {
    return (
      <article className="event-full reserva">
        <div className="event-full-head">
          <span className="event-icon reserva"><Icon size={26} /></span>
          <span className="event-body">
            <span className="event-meta"><span className="event-kind reserva">Día reservado</span> · {horaText(event)}</span>
            <span className="event-title">Reservado por {event.titulo}</span>
            {event.titulo !== event.organizador ? <span className="event-sub">Lo apuntó {event.organizador}</span> : null}
          </span>
        </div>
      </article>
    )
  }
  return (
    <article className={`event-full ${event.tipo}`}>
      <div className="event-full-head">
        <button type="button" className="event-full-open" onClick={() => onJoin(event)} aria-label={`Abrir ${event.titulo}`}>
          <span className={`event-icon ${event.tipo}`}><Icon size={26} /></span>
          <span className="event-body">
          <span className="event-meta">
            <span className={`event-kind ${event.tipo}`}>{KIND_LABEL[event.tipo]}</span> · {horaText(event)}
          </span>
          <span className="event-title">{event.titulo}</span>
          <span className="event-sub">Organiza {event.organizador}</span>
        </span>
        </button>
        {joinClosed(event) ? (
          <span className="closed-tag">Cerrado</span>
        ) : (
        <button
          type="button"
          className="join-btn"
          aria-label={event.misComensales ? `Cambiar mis comensales en ${event.titulo}` : `Apuntarme a ${event.titulo}`}
          onClick={() => onJoin(event)}
        >
          <Plus size={18} />
        </button>
        )}
      </div>

      <div className="attendees">
        <div className="attendees-head">
          <span>Apuntados</span>
          <span className="attendees-total">{plural(event.personas, 'comensal', 'comensales')}{event.ninos ? ` (${plural(event.ninos, 'niño', 'niños')})` : ''}</span>
        </div>
        {event.apuntados.length ? (
          <ul className="attendees-list">
            {event.apuntados.map((a) => (
              <li key={a.id}>
                <span className="attendee-name">
                  {a.nombre}
                  {a.id === meId ? <span className="badge">Tú</span> : null}
                </span>
                <span className="attendee-count">{genteText(a)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="attendees-empty">Todavía no se ha apuntado nadie.</p>
        )}
      </div>
    </article>
  )
}
