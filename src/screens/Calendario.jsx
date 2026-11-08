import EventCard from '../components/EventCard.jsx'
import { Chevron, Plus } from '../components/Icons.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import { BotonVotaciones } from './Votaciones.jsx'
import { addDays, monthDays, monthTitle, shortDate } from '../lib.js'

const WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const COLOR = { almuerzo: 'var(--almuerzo)', comida: 'var(--comida)', cena: 'var(--cena)', reserva: 'var(--reserva)' }

// Color del sombreado del día: la reserva manda; si no, el primer evento del día.
const fillTipo = (list) => (list.some((e) => e.tipo === 'reserva') ? 'reserva' : list[0].tipo)

// Círculo alrededor del número con el color de cada evento del día (si hay varios, repartido en trozos).
function ringStyle(list) {
  if (!list.length) return undefined
  const tipos = [...new Set(list.map((e) => e.tipo))]
  if (tipos.length === 1) return { background: COLOR[tipos[0]] }
  const paso = 360 / tipos.length
  const trozos = tipos.map((t, i) => `${COLOR[t]} ${i * paso}deg ${(i + 1) * paso}deg`)
  return { background: `conic-gradient(${trozos.join(', ')})` }
}

// Calendario del mes: cada día muestra un punto por evento. Al tocar un día, salen sus eventos debajo.
export default function Calendario({ month, today, selected, events, loaded, error, onMonth, onSelect, onOpen, onNew, onRetry, onVotaciones, onBack }) {
  const byDay = {}
  for (const e of events) (byDay[e.fecha] ||= []).push(e)
  const dayEvents = byDay[selected] || []
  const days = monthDays(month)

  return (
    <section className="screen">
      <ScreenTitle title="Calendario" onBack={onBack} />
      <BotonVotaciones onOpen={onVotaciones} />
      <div className="cal-head">
        <button type="button" className="icon-btn" aria-label="Mes anterior" onClick={() => onMonth(-1)}>
          <Chevron size={22} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <h2 className="cal-title" aria-live="polite">{monthTitle(month)}</h2>
        <button type="button" className="icon-btn" aria-label="Mes siguiente" onClick={() => onMonth(1)}>
          <Chevron size={22} />
        </button>
      </div>

      <div className="card cal">
        <div className="cal-grid cal-week" aria-hidden="true">
          {WEEK.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="cal-grid">
          {days.map((key, i) => {
            if (!key) return <span key={`b${i}`} />
            const list = byDay[key] || []
            const cls = ['cal-day']
            if (key === today) cls.push('is-today')
            if (key === selected) cls.push('is-selected')
            if (key < today) cls.push('is-past')
            return (
              <button
                key={key}
                type="button"
                className={cls.join(' ')}
                aria-pressed={key === selected}
                aria-label={`${shortDate(key)}${list.length ? `, ${list.length} ${list.length === 1 ? 'evento' : 'eventos'}` : ''}`}
                onClick={() => onSelect(key)}
              >
                <span className={`cal-ring${list.length ? ` has fill-${fillTipo(list)}` : ''}`} style={ringStyle(list)}>
                  <span className="cal-num">{Number(key.slice(8))}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="cal-legend" aria-hidden="true">
          <span><span className="cal-dot almuerzo" /> Almuerzo</span>
          <span><span className="cal-dot comida" /> Comida</span>
          <span><span className="cal-dot cena" /> Cena</span>
          <span><span className="cal-dot reserva" /> Reservado</span>
        </div>
      </div>

      <div className="section-head">
        <h2>{selected === today ? 'Hoy' : selected === addDays(today, 1) ? 'Mañana' : shortDate(selected)}</h2>
        {selected >= today ? (
          <button type="button" className="btn small-btn primary" onClick={() => onNew(selected)}>
            <Plus size={18} /> Nuevo
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="empty">
          <p>No se han podido cargar los eventos.</p>
          <button type="button" className="btn secondary" onClick={onRetry}>Reintentar</button>
        </div>
      ) : !loaded ? (
        <div className="empty">Cargando…</div>
      ) : dayEvents.length ? (
        <div className="events">
          {dayEvents.map((e) => <EventCard key={e.id} event={e} onOpen={onOpen} />)}
        </div>
      ) : (
        <div className="empty">No hay nada organizado este día.</div>
      )}
    </section>
  )
}
