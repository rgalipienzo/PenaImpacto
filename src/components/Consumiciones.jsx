import { useEffect, useRef, useState } from 'react'
import * as api from '../api.js'
import { Chevron, Close, Minus, Plus } from './Icons.jsx'
import { euros } from '../lib.js'
import { confirmar } from './confirmar.jsx'

// "Mis consumiciones" dentro de un evento: lo que he tomado con su precio y un botón "Añadir"
// que abre una pantalla con todas las tarifas (− cantidad +) y "Aceptar" para guardar.
export default function Consumiciones({ eventoId, meId, onTotal }) {
  const [tarifas, setTarifas] = useState(null)
  const [mine, setMine] = useState([]) // mis consumiciones guardadas
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)

  async function load() {
    const [ts, cs] = await Promise.all([api.listTarifas(), api.listMisConsumiciones(eventoId, meId)])
    setTarifas(ts)
    setMine(cs)
  }

  useEffect(() => {
    load().catch((err) => setError(/consumiciones|tarifas/i.test(err.message) ? 'Falta preparar las consumiciones en Supabase.' : err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoId, meId])

  const total = mine.reduce((s, c) => s + c.cantidad * c.precio, 0)

  async function borrar(c) {
    if (!(await confirmar(`¿Borrar ${c.cantidad} × ${c.nombre}?`, { si: 'Borrar' }))) return
    setBusyId(c.id)
    try {
      await api.deleteConsumicion(c.id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }
  useEffect(() => { onTotal?.(total, mine) }, [total, mine, onTotal])

  return (
    <section className="detail-block consumos">
      <div className="consumos-head">
        <h3 className="counter-title">Mis consumiciones</h3>
        {mine.length ? <strong>{euros(total)}</strong> : null}
      </div>

      {error ? (
        <p className="error">{error}</p>
      ) : mine.length ? (
        <ul className="consumo-list">
          {mine.map((c) => (
            <li key={c.id}>
              <button type="button" className="line-btn" onClick={() => setOpen(true)} aria-label={`Cambiar ${c.nombre}`}>
                <span>{c.cantidad} × {c.nombre}</span>
                <span className="muted">{euros(c.precio)} c/u</span>
                <strong>{euros(c.cantidad * c.precio)}</strong>
              </button>
              <button type="button" className="icon-plain" aria-label={`Borrar ${c.nombre}`} disabled={busyId === c.id} onClick={() => borrar(c)}>
                <Close size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">Todavía no has apuntado nada.</p>
      )}

      <button type="button" className="btn secondary block" disabled={!tarifas} onClick={() => setOpen(true)}>
        <Plus size={18} /> {mine.length ? 'Añadir o cambiar' : 'Añadir'}
      </button>
      {mine.length ? <p className="small muted">Toca una línea para cambiar la cantidad o la ✕ para borrarla.</p> : null}

      {open ? (
        <ElegirConsumiciones
          tarifas={tarifas}
          mine={mine}
          onCancel={() => setOpen(false)}
          onAccept={async (cambios) => {
            for (const { tarifa, cantidad } of cambios) await api.setConsumicion(eventoId, meId, tarifa, cantidad)
            await load()
            setOpen(false)
          }}
        />
      ) : null}
    </section>
  )
}

// Pantalla completa con todas las tarifas y su cantidad. Solo se guarda al pulsar "Aceptar".
function ElegirConsumiciones({ tarifas, mine, onCancel, onAccept }) {
  const inicial = Object.fromEntries(mine.filter((c) => c.tarifa_id).map((c) => [c.tarifa_id, c.cantidad]))
  const [cant, setCant] = useState(inicial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef(null)

  // Escape cierra esta pantalla sin cerrar también la ficha del evento que hay debajo.
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onCancel() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  // Suma o resta sobre el valor más reciente (así no se pierden pulsaciones rápidas).
  const add = (t, d) => setCant((c) => ({ ...c, [t.id]: Math.max(0, Math.min(99, (c[t.id] || 0) + d)) }))
  const total = tarifas.reduce((s, t) => s + (cant[t.id] || 0) * t.precio, 0)

  async function aceptar() {
    const cambios = tarifas
      .filter((t) => (cant[t.id] || 0) !== (inicial[t.id] || 0))
      .map((t) => ({ tarifa: t, cantidad: cant[t.id] || 0 }))
    setBusy(true)
    setError('')
    try {
      await onAccept(cambios)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="consumo-screen" role="dialog" aria-modal="true" aria-labelledby="consumo-title" tabIndex={-1} ref={ref}>
      <header className="consumo-screen-head">
        <button type="button" className="back-btn" aria-label="Volver sin guardar" onClick={onCancel}>
          <Chevron size={24} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <h2 id="consumo-title">¿Qué has consumido?</h2>
      </header>

      <div className="consumo-screen-body">
        {tarifas.length ? (
          tarifas.map((t) => {
            const n = cant[t.id] || 0
            return (
              <div key={t.id} className={`counter consumo${n ? ' has' : ''}`} role="group" aria-label={t.nombre}>
                <span className="counter-label">
                  {t.nombre}
                  <span className="counter-hint">{euros(t.precio)}{n ? ` · ${euros(n * t.precio)}` : ''}</span>
                </span>
                <div className="stepper">
                  <button type="button" className="icon-btn" aria-label={`${t.nombre}: uno menos`} disabled={!n} onClick={() => add(t, -1)}><Minus size={18} /></button>
                  <output aria-live="polite">{n}</output>
                  <button type="button" className="icon-btn" aria-label={`${t.nombre}: uno más`} onClick={() => add(t, 1)}><Plus size={18} /></button>
                </div>
              </div>
            )
          })
        ) : (
          <p className="muted">Todavía no hay tarifas. Un administrador las añade en Estatutos → Tarifas.</p>
        )}
      </div>

      <footer className="consumo-screen-foot">
        {error ? <p className="error">{error}</p> : null}
        <div className="consumo-total"><span>Total</span><strong>{euros(total)}</strong></div>
        <button type="button" className="btn primary block" disabled={busy} onClick={aceptar}>{busy ? 'Guardando…' : 'Aceptar'}</button>
      </footer>
    </div>
  )
}
