import { useState } from 'react'
import * as api from '../api.js'
import { euros, lineasBote, lineasComida } from '../lib.js'
import { confirmar } from './confirmar.jsx'

// La cuenta de un socio en un evento, en dos partes:
// · COMIDA: su parte de la compra, lo que ha comprado él y los Bizums que tiene que hacer o recibir.
// · BOTE: cuotas de invitados y familiares y consumiciones, que se ponen en el bote de la peña.
// k = cuentaEvento(); onChange se llama después de apuntar o deshacer un pago.
export default function Ticket({ k, eventoId, meId, consumos = [], onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const comida = lineasComida(k)
  const bote = lineasBote(k, consumos)
  const hayComida = comida.length > 0 || k.pagado > 0 || k.hechos.length > 0

  async function run(fn) {
    setBusy(true)
    setError('')
    try {
      await fn()
      await onChange?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const fecha = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

  return (
    <div className="ticket">
      {hayComida ? (
        <>
          <p className="ticket-sec">🍽️ Comida · se paga por Bizum</p>
          <ul className="ticket-lines">
            {comida.map((l, i) => (
              <li key={i}>
                <span className="ticket-concepto">
                  <strong>{l.cant} × {l.concepto}</strong>
                  <span className="ticket-detalle">{euros(l.unidad)} c/u</span>
                </span>
                <span className="ticket-importe">{euros(l.total)}</span>
              </li>
            ))}
          </ul>
          <div className="ticket-sub"><span>Tu parte de la comida</span><strong>{euros(k.parte)}</strong></div>
          {k.pagado ? <div className="ticket-sub"><span>Lo que has comprado tú</span><strong>− {euros(k.pagado)}</strong></div> : null}

          {k.misBizums.map((t) => (
            <div key={`d-${t.a}`} className="bizum debe">
              <span className="bizum-text">Haz un Bizum a <strong>{t.aNombre}</strong></span>
              <strong className="bizum-imp">{euros(t.importe)}</strong>
              <button type="button" className="btn primary small-btn" disabled={busy} onClick={() => run(() => api.marcarBizum(eventoId, meId, t.a, t.importe))}>Hecho</button>
            </div>
          ))}
          {k.meDeben.map((t) => (
            <div key={`a-${t.de}`} className="bizum te-deben">
              <span className="bizum-text"><strong>{t.deNombre}</strong> te tiene que hacer un Bizum</span>
              <strong className="bizum-imp">{euros(t.importe)}</strong>
              <button type="button" className="btn secondary small-btn" disabled={busy} onClick={() => run(() => api.marcarBizum(eventoId, t.de, meId, t.importe))}>Recibido</button>
            </div>
          ))}
          {k.hechos.map((h) => (
            <div key={h.id} className="bizum-hecho">
              <span>✓ {h.de === meId ? `Bizum a ${h.aNombre}` : `${h.deNombre} te hizo un Bizum`} · {fecha(h.created_at)}</span>
              <strong>{euros(h.importe)}</strong>
              <button
                type="button"
                className="unpay-btn"
                disabled={busy}
                onClick={async () => { if (await confirmar('¿Deshacer este Bizum?', { si: 'Deshacer' })) run(() => api.deshacerBizum(h.id)) }}
              >
                Deshacer
              </button>
            </div>
          ))}
          {k.total && !k.misBizums.length && !k.meDeben.length ? <p className="bizum-ok">✓ Tu parte de la comida está cuadrada</p> : null}
        </>
      ) : null}

      {bote.length ? (
        <>
          <p className="ticket-sec">🫙 Para el bote de la peña</p>
          <ul className="ticket-lines">
            {bote.map((l, i) => (
              <li key={i}>
                <span className="ticket-concepto">
                  <strong>{l.cant ? `${l.cant} × ` : ''}{l.concepto}</strong>
                  <span className="ticket-detalle">{l.detalle || `${euros(l.unidad)} c/u`}</span>
                </span>
                <span className="ticket-importe">{euros(l.total)}</span>
              </li>
            ))}
          </ul>
          <div className={`ticket-total${k.pagoBote && Math.abs(k.botePendiente) < 0.005 ? '' : ' debe'}`}>
            <span>AL BOTE</span>
            <strong>{euros(k.bote)}</strong>
          </div>
          {!k.pagoBote ? (
            <button type="button" className="btn primary block pay-btn" disabled={busy} onClick={() => run(() => api.marcarPagado(eventoId, meId, k.bote))}>
              {busy ? 'Guardando…' : `Puesto en el bote (${euros(k.bote)})`}
            </button>
          ) : (
            <div className="pagado-box">
              <p className="pagado-ok">✓ Puesto en el bote el {fecha(k.pagoBote.pagado_at)} · {euros(k.pagoBote.importe)}</p>
              {Math.abs(k.botePendiente) >= 0.01 ? (
                <>
                  <p className="small pagado-diff">
                    Ha cambiado: {k.botePendiente > 0 ? `te faltan ${euros(k.botePendiente)}` : `has puesto ${euros(-k.botePendiente)} de más`}.
                  </p>
                  {k.botePendiente > 0 ? (
                    <button type="button" className="btn primary block" disabled={busy} onClick={() => run(() => api.marcarPagado(eventoId, meId, k.bote))}>Ya he puesto el resto</button>
                  ) : null}
                </>
              ) : null}
              <button
                type="button"
                className="unpay-btn"
                disabled={busy}
                onClick={async () => { if (await confirmar('¿Quitar la marca del bote?', { si: 'Quitar' })) run(() => api.quitarPagado(eventoId, meId)) }}
              >
                Quitar «Puesto en el bote»
              </button>
            </div>
          )}
        </>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
