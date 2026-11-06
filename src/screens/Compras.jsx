import { useCallback, useEffect, useState } from 'react'
import * as api from '../api.js'
import { useCambios } from '../realtime.js'
import Sheet from '../components/Sheet.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import { Chevron, Close, KIND_ICON, Plus } from '../components/Icons.jsx'
import { KIND_LABEL, shortDate } from '../lib.js'
import { confirmar } from '../components/confirmar.jsx'

// Listas de la compra: las de los próximos eventos y otras sueltas (compra del mes…).
export default function Compras({ today, onBack }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await api.listListas(today))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [today])

  const cambios = useCambios()
  useEffect(() => { load() }, [load, cambios])

  return (
    <section className="screen">
      <div className="section-head">
        <ScreenTitle title="Compras" onBack={onBack} />
        <button type="button" className="btn small-btn primary" onClick={() => setCreating(true)}>
          <Plus size={18} /> Crear lista
        </button>
      </div>

      {error ? (
        <div className="empty">
          <p>No se han podido cargar las listas.</p>
          <button type="button" className="btn secondary" onClick={load}>Reintentar</button>
        </div>
      ) : !data ? (
        <div className="empty">Cargando…</div>
      ) : (
        <>
          <h2 className="section-title">Listas de eventos</h2>
          {data.eventos.length ? (
            data.eventos.map((l) => <ListaCard key={l.id} lista={l} onChange={load} />)
          ) : (
            <div className="empty">Ningún evento próximo tiene lista. Se añade al crear el evento en el Calendario.</div>
          )}

          <h2 className="section-title">Otras listas</h2>
          {data.otras.length ? (
            data.otras.map((l) => <ListaCard key={l.id} lista={l} onChange={load} />)
          ) : (
            <div className="empty">No hay otras listas. Crea una para la compra del mes o lo que haga falta.</div>
          )}
        </>
      )}

      {creating ? (
        <NuevaLista
          onClose={() => setCreating(false)}
          onSave={async (nombre) => { await api.createLista(nombre); setCreating(false); await load() }}
        />
      ) : null}
    </section>
  )
}

// Listas desplegadas: se recuerdan en este móvil para que sigan abiertas al volver a Compras.
const ABIERTAS_KEY = 'compras-abiertas'
function leerAbiertas() {
  try { return new Set(JSON.parse(localStorage.getItem(ABIERTAS_KEY)) || []) } catch { return new Set() }
}
function guardarAbierta(id, abierta) {
  const s = leerAbiertas()
  if (abierta) s.add(id)
  else s.delete(id)
  try { localStorage.setItem(ABIERTAS_KEY, JSON.stringify([...s])) } catch { /* sin almacenamiento: no pasa nada */ }
}

// Cada lista se ve plegada (solo la cabecera); al tocarla se despliega y sigue así hasta que se vuelve a tocar.
function ListaCard({ lista, onChange }) {
  const [abierta, setAbierta] = useState(() => leerAbiertas().has(lista.id))
  const [texto, setTexto] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ev = lista.evento
  const Icon = ev ? KIND_ICON[ev.tipo] : null
  const hechas = lista.items.filter((i) => i.comprado).length
  const completa = lista.items.length > 0 && hechas === lista.items.length

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

  function add(e) {
    e.preventDefault()
    const t = texto.trim()
    if (!t) return
    run(async () => { await api.addItem(lista.id, t); setTexto('') })
  }

  async function borrarLista() {
    const nombre = ev ? ev.titulo : lista.nombre
    if (await confirmar(`¿Borrar la lista «${nombre}»?`, { si: 'Borrar' })) run(() => api.deleteLista(lista.id))
  }

  function toggle() {
    guardarAbierta(lista.id, !abierta)
    setAbierta(!abierta)
  }

  return (
    <article className={`lista${ev ? ` ${ev.tipo}` : ''}${abierta ? ' is-open' : ''}`}>
      <header className="lista-head">
        <button type="button" className="lista-toggle" aria-expanded={abierta} onClick={toggle}>
          {ev ? <span className={`event-icon small ${ev.tipo}`}><Icon size={20} /></span> : null}
          <span className="lista-title">
            {ev ? (
              <>
                <span className="event-meta"><span className={`event-kind ${ev.tipo}`}>{KIND_LABEL[ev.tipo]}</span> · {shortDate(ev.fecha)}</span>
                <strong>{ev.titulo}</strong>
                <span className="event-sub">Organiza {ev.organizador?.nombre || '—'}</span>
              </>
            ) : (
              <>
                <strong>{lista.nombre}</strong>
                <span className="event-sub">Creada por {lista.autor}</span>
              </>
            )}
          </span>
          <Chevron size={22} className="lista-chevron" />
        </button>
      </header>

      {abierta ? (
        <>
          {lista.items.length ? (
            <>
              <p className="lista-count">{hechas} de {lista.items.length} compradas</p>
              <ul className="lista-items">
                {lista.items.map((i) => (
                  <li key={i.id} className={i.comprado ? 'is-done' : ''}>
                    <label>
                      <input type="checkbox" checked={i.comprado} disabled={busy} onChange={(e) => run(() => api.setComprado(i.id, e.target.checked))} />
                      <span>{i.texto}</span>
                    </label>
                    <button type="button" className="icon-plain" aria-label={`Quitar ${i.texto}`} disabled={busy} onClick={() => run(() => api.deleteItem(i.id))}>
                      <Close size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="lista-count">Todavía está vacía.</p>
          )}

          {completa ? (
            <div className="lista-done">
              <span>✓ Compra completada</span>
              <button type="button" className="btn danger small-btn" disabled={busy} onClick={borrarLista}>Borrar lista</button>
            </div>
          ) : null}

          <form className="lista-add" onSubmit={add}>
            <input className="input" type="text" maxLength={200} placeholder="Añadir algo…" aria-label={`Añadir a ${lista.nombre}`} value={texto} onChange={(e) => setTexto(e.target.value)} />
            <button type="submit" className="btn primary small-btn" disabled={busy || !texto.trim()}>Añadir</button>
          </form>

          {/* Cuando está todo comprado, el botón ya sale arriba en verde. */}
          {!completa ? (
            <button type="button" className="lista-borrar" disabled={busy} onClick={borrarLista}>Borrar lista</button>
          ) : null}
        </>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </article>
  )
}

function NuevaLista({ onClose, onSave }) {
  const [nombre, setNombre] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSave(nombre.trim())
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Sheet title="Nueva lista" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="lista-nombre">Nombre de la lista</label>
          <input id="lista-nombre" className="input" type="text" required maxLength={80} placeholder="Compra del mes" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn primary block" disabled={busy || !nombre.trim()}>{busy ? 'Creando…' : 'Crear lista'}</button>
        <p className="small muted center-text">Después podrás añadirle cosas desde la propia lista.</p>
      </form>
    </Sheet>
  )
}
