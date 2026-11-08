import { useCallback, useEffect, useState } from 'react'
import * as api from '../api.js'
import { useCambios } from '../realtime.js'
import Sheet from '../components/Sheet.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import { Chevron, KIND_ICON, Plus } from '../components/Icons.jsx'
import { KINDS, KIND_LABEL, addMonths, monthDays, monthStart, monthTitle, plural } from '../lib.js'
import { confirmar } from '../components/confirmar.jsx'

const TIPOS = KINDS.filter((k) => k.id !== 'reserva')
const WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// "Sáb 15 nov"
function diaCorto(key) {
  const [y, m, d] = key.split('-').map(Number)
  const s = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d))
  return (s.charAt(0).toUpperCase() + s.slice(1)).replace(/\./g, '').replace(',', '')
}

// Votaciones abiertas, para avisar en Inicio y en el Calendario.
function useVotaciones() {
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      setList(await api.listVotaciones())
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [])
  const cambios = useCambios()
  useEffect(() => { load() }, [load, cambios])
  return { list, error, load }
}

const heVotado = (v, meId) => v.dias.some((d) => d.votos.some((x) => x.id === meId))

// Aviso en la pantalla principal: hay votaciones abiertas en las que todavía no he votado.
export function AvisoVotaciones({ meId, onOpen }) {
  const { list } = useVotaciones()
  const pendientes = (list || []).filter((v) => !v.cerrada && !heVotado(v, meId))
  if (!pendientes.length) return null
  return (
    <button type="button" className="voto-aviso" onClick={onOpen}>
      <span className="voto-aviso-icon" aria-hidden="true">🗳️</span>
      <span className="voto-aviso-text">
        <strong>{pendientes.length === 1 ? 'Hay una votación para ti' : `Hay ${pendientes.length} votaciones para ti`}</strong>
        <span>{pendientes.length === 1 ? `«${pendientes[0].titulo}»: ` : ''}marca los días que puedes</span>
      </span>
      <Chevron size={20} className="chevron" />
    </button>
  )
}

// Botón del Calendario para entrar en las votaciones.
export function BotonVotaciones({ onOpen }) {
  const { list } = useVotaciones()
  const abiertas = (list || []).filter((v) => !v.cerrada).length
  return (
    <button type="button" className="voto-boton" onClick={onOpen}>
      <span aria-hidden="true">🗳️</span>
      <span className="voto-boton-text">Votaciones de días</span>
      {abiertas ? <span className="state warn">{plural(abiertas, 'abierta', 'abiertas')}</span> : null}
      <Chevron size={20} className="chevron" />
    </button>
  )
}

export default function Votaciones({ me, today, onBack, onCrearEvento }) {
  const { list, error, load } = useVotaciones()
  const [creating, setCreating] = useState(false)
  const abiertas = (list || []).filter((v) => !v.cerrada)
  const cerradas = (list || []).filter((v) => v.cerrada)

  return (
    <section className="screen">
      <div className="section-head">
        <ScreenTitle title="Votaciones" onBack={onBack} />
        <button type="button" className="btn small-btn primary" onClick={() => setCreating(true)}>
          <Plus size={18} /> Nueva
        </button>
      </div>
      <p className="pantalla-aviso">Marca <strong>todos los días que puedes</strong>. El día con más votos es el mejor para hacer la comida o la cena.</p>

      {error ? (
        <div className="empty">
          <p>{error}</p>
          <button type="button" className="btn secondary" onClick={load}>Reintentar</button>
        </div>
      ) : !list ? (
        <div className="empty">Cargando…</div>
      ) : (
        <>
          <h2 className="section-title">Abiertas</h2>
          {abiertas.length ? (
            abiertas.map((v) => <VotacionCard key={v.id} v={v} me={me} today={today} onChange={load} onCrearEvento={onCrearEvento} />)
          ) : (
            <div className="empty">No hay ninguna votación abierta. Crea una con «+ Nueva».</div>
          )}
          {cerradas.length ? (
            <>
              <h2 className="section-title">Cerradas</h2>
              {cerradas.map((v) => <VotacionCard key={v.id} v={v} me={me} today={today} onChange={load} onCrearEvento={onCrearEvento} />)}
            </>
          ) : null}
        </>
      )}

      {creating ? (
        <NuevaVotacion
          today={today}
          onClose={() => setCreating(false)}
          onSave={async (fields) => { await api.createVotacion(fields); setCreating(false); await load() }}
        />
      ) : null}
    </section>
  )
}

// Votaciones desplegadas: se recuerdan en este móvil para que sigan abiertas al volver.
const ABIERTAS_KEY = 'votaciones-abiertas'
function leerAbiertas() {
  try { return new Set(JSON.parse(localStorage.getItem(ABIERTAS_KEY)) || []) } catch { return new Set() }
}
function guardarAbierta(id, abierta) {
  const s = leerAbiertas()
  if (abierta) s.add(id)
  else s.delete(id)
  try { localStorage.setItem(ABIERTAS_KEY, JSON.stringify([...s])) } catch { /* sin almacenamiento: no pasa nada */ }
}

// Cada votación se ve plegada (título y resumen); al tocarla se despliegan los días con sus votos.
function VotacionCard({ v, me, today, onChange, onCrearEvento }) {
  const [abierta, setAbierta] = useState(() => leerAbiertas().has(v.id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const mando = v.creado_por === me.id || me.es_admin
  const Icon = KIND_ICON[v.tipo]
  const max = Math.max(0, ...v.dias.map((d) => d.votos.length))
  const top = max ? v.dias.filter((d) => d.votos.length === max) : []
  const votantes = new Set(v.dias.flatMap((d) => d.votos.map((x) => x.id))).size
  const yo = heVotado(v, me.id)

  async function run(fn) {
    setBusy(true)
    setError('')
    try {
      await fn()
      await onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function toggle() {
    guardarAbierta(v.id, !abierta)
    setAbierta(!abierta)
  }

  const resumen = !max
    ? 'Nadie ha votado aún'
    : `${v.cerrada ? 'Ganador' : top.length > 1 ? 'Empate' : 'Más votado'}: ${top.map((d) => diaCorto(d.fecha)).join(', ')} · ${plural(max, 'voto', 'votos')}`

  function avisar() {
    const texto = `🗳️ Votación en la app de la *Peña Impacto*: *${v.titulo}*.\n\nEntra en *Calendario → Votaciones de días* y marca todos los días que puedes:\n${window.location.origin}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
  }

  return (
    <article className={`lista voto${v.cerrada ? ' is-closed' : ''}${abierta ? ' is-open' : ''}`}>
      <header className="lista-head">
        <button type="button" className="lista-toggle" aria-expanded={abierta} onClick={toggle}>
          <span className={`event-icon small ${v.tipo}`}><Icon size={20} /></span>
          <span className="lista-title">
            <span className="event-meta">
              <span className={`event-kind ${v.tipo}`}>{KIND_LABEL[v.tipo]}</span>
              {v.cerrada ? ' · Cerrada' : null}
              {!v.cerrada ? <span className={`state ${yo ? 'ok' : 'warn'}`}>{yo ? 'Has votado' : 'Sin votar'}</span> : null}
            </span>
            <strong>{v.titulo}</strong>
            <span className="event-sub">{resumen}</span>
          </span>
          <Chevron size={22} className="lista-chevron" />
        </button>
      </header>

      {abierta ? (
        <>
      <p className="event-sub voto-quien">Creada por {v.creado_por === me.id ? 'ti' : v.autor} · {votantes ? plural(votantes, 'socio ha votado', 'socios han votado') : 'nadie ha votado aún'}</p>

      <ul className="voto-dias">
        {v.dias.map((d) => {
          const mio = d.votos.some((x) => x.id === me.id)
          const pasado = d.fecha < today
          const esTop = top.includes(d)
          return (
            <li key={d.id} className={`${mio ? 'is-mine' : ''}${esTop ? ' is-top' : ''}`}>
              <button
                type="button"
                className="voto-dia"
                aria-pressed={mio}
                disabled={busy || v.cerrada || pasado}
                onClick={() => run(() => api.votar(d.id, me.id, !mio))}
              >
                <span className="voto-check" aria-hidden="true">{mio ? '✓' : ''}</span>
                <span className="voto-fecha">{diaCorto(d.fecha)}</span>
                {esTop ? <span className="voto-top">{v.cerrada ? 'Ganador' : 'Más votado'}</span> : null}
                <span className="voto-num">{d.votos.length}</span>
              </button>
              <span className="voto-barra" aria-hidden="true"><span style={{ width: `${max ? (d.votos.length / max) * 100 : 0}%` }} /></span>
              {d.votos.length ? <span className="voto-nombres">{d.votos.map((x) => (x.id === me.id ? 'Tú' : x.nombre)).join(', ')}</span> : null}
            </li>
          )
        })}
      </ul>

      {!v.cerrada ? (
        <p className="small muted">{yo ? 'Toca un día para quitar o poner tu voto.' : 'Toca los días que puedes ir.'}</p>
      ) : null}

      {mando ? (
        <div className="voto-acciones">
          {top.filter((d) => d.fecha >= today).slice(0, 3).map((d) => (
            <button key={d.id} type="button" className="btn primary block" disabled={busy} onClick={() => onCrearEvento({ fecha: d.fecha, tipo: v.tipo, titulo: v.titulo, votacionId: v.id })}>
              Crear evento el {diaCorto(d.fecha).toLowerCase()}
            </button>
          ))}
          {!v.cerrada ? <button type="button" className="btn secondary block" disabled={busy} onClick={avisar}>Avisar al grupo por WhatsApp</button> : null}
          <button type="button" className="btn secondary block" disabled={busy} onClick={() => run(() => api.setVotacionCerrada(v.id, !v.cerrada))}>
            {v.cerrada ? 'Volver a abrir la votación' : 'Cerrar la votación'}
          </button>
          <button
            type="button"
            className="lista-borrar"
            disabled={busy}
            onClick={async () => { if (await confirmar(`¿Borrar la votación «${v.titulo}»?`, { si: 'Borrar' })) run(() => api.deleteVotacion(v.id)) }}
          >
            Borrar votación
          </button>
        </div>
      ) : null}
        </>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </article>
  )
}

function NuevaVotacion({ today, onClose, onSave }) {
  const [tipo, setTipo] = useState('comida')
  const [titulo, setTitulo] = useState('')
  const [mes, setMes] = useState(() => monthStart(today))
  const [fechas, setFechas] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const kind = TIPOS.find((k) => k.id === tipo)
  const sugerido = `${kind.label} de ${monthTitle(mes).split(' ')[0].toLowerCase()}`

  function toggle(key) {
    setFechas((f) => (f.includes(key) ? f.filter((x) => x !== key) : [...f, key].sort()))
  }

  async function submit(e) {
    e.preventDefault()
    if (fechas.length < 2) return setError('Elige al menos dos días para votar.')
    setBusy(true)
    setError('')
    try {
      await onSave({ tipo, titulo: titulo.trim() || sugerido, fechas })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Sheet title="Nueva votación" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <fieldset className="field">
          <legend className="label">¿Para qué?</legend>
          <div className="segmented">
            {TIPOS.map((k) => {
              const I = KIND_ICON[k.id]
              return (
                <label key={k.id} className={tipo === k.id ? 'is-on' : ''}>
                  <input type="radio" name="voto-tipo" value={k.id} checked={tipo === k.id} onChange={() => setTipo(k.id)} />
                  <I size={20} />
                  {k.label}
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="field">
          <label className="label" htmlFor="voto-titulo">Título</label>
          <input id="voto-titulo" className="input" type="text" maxLength={80} placeholder={sugerido} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>

        <fieldset className="field">
          <legend className="label">Días para votar <span className="muted">· {fechas.length ? plural(fechas.length, 'elegido', 'elegidos') : 'toca los días'}</span></legend>
          <div className="card cal voto-cal">
            <div className="cal-head">
              <button type="button" className="icon-btn" aria-label="Mes anterior" disabled={mes <= monthStart(today)} onClick={() => setMes(addMonths(mes, -1))}>
                <Chevron size={20} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <strong className="voto-cal-title">{monthTitle(mes)}</strong>
              <button type="button" className="icon-btn" aria-label="Mes siguiente" onClick={() => setMes(addMonths(mes, 1))}>
                <Chevron size={20} />
              </button>
            </div>
            <div className="cal-grid cal-week" aria-hidden="true">{WEEK.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="cal-grid">
              {monthDays(mes).map((key, i) => {
                if (!key) return <span key={`b${i}`} />
                const on = fechas.includes(key)
                const pasado = key < today
                return (
                  <button
                    key={key}
                    type="button"
                    className={`cal-day${on ? ' is-selected' : ''}${pasado ? ' is-past' : ''}`}
                    aria-pressed={on}
                    disabled={pasado}
                    onClick={() => toggle(key)}
                  >
                    <span className="cal-num">{Number(key.slice(8))}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {fechas.length ? <p className="small muted voto-elegidos">{fechas.map(diaCorto).join(' · ')}</p> : null}
        </fieldset>

        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn primary block" disabled={busy}>{busy ? 'Creando…' : 'Crear votación'}</button>
        <p className="small muted center-text">Todos los socios podrán votar. Tú podrás cerrarla y crear el evento el día ganador.</p>
      </form>
    </Sheet>
  )
}
