import { useLayoutEffect, useRef } from 'react'
import EventCard from '../components/EventCard.jsx'
import { Chevron } from '../components/Icons.jsx'
import { horaText, longDate, shortDate } from '../lib.js'
import { groupByDay } from './Eventos.jsx'

// Pantalla principal: el día elegido (hoy al abrir) y los eventos a los que me he apuntado.
export default function Inicio({ meId, today, day, dayEvents, events, loaded, error, onDay, onToday, onOpen, onSeeAll, onRetry }) {
  const isToday = day === today
  // Mis eventos: a los que voy y los días que he reservado yo.
  const esMio = (e) => e.misComensales > 0 || (e.tipo === 'reserva' && e.organizadorId === meId)
  const mineDay = dayEvents.filter(esMio)
  const mine = events.filter(esMio)
  const reservaAjena = dayEvents.find((e) => e.tipo === 'reserva' && e.organizadorId !== meId)
  const proximos = groupByDay(mine.filter((e) => e.fecha > today && e.fecha !== day))

  return (
    <section className="screen">
      <div className="day-nav">
        <button type="button" className="day-arrow" aria-label="Día anterior" onClick={() => onDay(-1)}>
          <Chevron size={28} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <FitDate text={longDate(day)} />
        <button type="button" className="day-arrow" aria-label="Día siguiente" onClick={() => onDay(1)}>
          <Chevron size={28} />
        </button>
      </div>
      {!isToday ? (
        <button type="button" className="btn link-btn back-today" onClick={onToday}>Volver a hoy</button>
      ) : null}

      {reservaAjena ? <p className="closed-note reserva-note">🔒 Este día está reservado ({horaText(reservaAjena).toLowerCase()}) por {reservaAjena.titulo}.</p> : null}

      <h2 className="section-title">{isToday ? 'Mis eventos de hoy' : 'Mis eventos de este día'}</h2>

      {error ? (
        <div className="empty">
          <p>No se han podido cargar los eventos.</p>
          <button type="button" className="btn secondary" onClick={onRetry}>Reintentar</button>
        </div>
      ) : !loaded ? (
        <div className="empty">Cargando…</div>
      ) : mineDay.length ? (
        <div className="events">
          {mineDay.map((e) => <EventCard key={e.id} event={e} onOpen={(ev) => onOpen(ev, 'dia')} />)}
        </div>
      ) : (
        <div className="empty">{isToday ? 'Hoy no te has apuntado a nada.' : 'Este día no te has apuntado a nada.'}</div>
      )}

      {loaded && !error ? (
        <>
          <h2 className="section-title">Mis próximos eventos</h2>
          {proximos.length ? (
            proximos.map((d) => (
              <div key={d.fecha} className="day-group">
                <h3 className="day-title">{shortDate(d.fecha)}</h3>
                <div className="events">
                  {d.items.map((e) => <EventCard key={e.id} event={e} onOpen={(ev) => onOpen(ev, 'proximos')} />)}
                </div>
              </div>
            ))
          ) : (
            <div className="empty">No te has apuntado a ningún evento de los próximos días.</div>
          )}
          <button type="button" className="btn secondary block" onClick={onSeeAll}>Ver todos los eventos</button>
        </>
      ) : null}
    </section>
  )
}

// La fecha en una sola línea: si no cabe, se reduce la letra hasta que quepa.
function FitDate({ text }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      let size = 19
      el.style.fontSize = `${size}px`
      while (el.scrollWidth > el.clientWidth && size > 11) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
    }
    fit()
    document.fonts?.ready.then(fit) // al terminar de cargar la letra, se vuelve a medir
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [text])

  return <h1 ref={ref} className="day-date" aria-live="polite">{text}</h1>
}
