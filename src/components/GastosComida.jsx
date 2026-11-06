import { useCallback, useEffect, useState } from 'react'
import * as api from '../api.js'
import { useCambios } from '../realtime.js'
import Sheet from './Sheet.jsx'
import Ticket from './Ticket.jsx'
import { Close, Plus } from './Icons.jsx'
import { euros, parseEuros, plural, reparto } from '../lib.js'
import { confirmar } from './confirmar.jsx'

// "Gastos de la comida" dentro de un evento: lo que ha comprado cada socio, el total,
// el precio por adulto y por niño, y mi cuenta (mi parte + mis consumiciones − lo que he pagado).
export default function GastosComida({ event, me, voy, consumo, consumos = [], onChange }) {
  const [gastos, setGastos] = useState(null)
  const [pct, setPct] = useState(50)
  const [cuotaInv, setCuotaInv] = useState({ adulto: 0, nino: 0 })
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null) // gasto que se está cambiando
  const [busyId, setBusyId] = useState(null)
  const [pago, setPago] = useState(null) // { importe, pagado_at } si he marcado Pagado
  const [payBusy, setPayBusy] = useState(false)
  const closeAdd = useCallback(() => setAdding(false), [])
  const closeEdit = useCallback(() => setEditing(null), [])

  const load = useCallback(async () => {
    try {
      const [gs, aj, ci] = await Promise.all([api.listGastos(event.id), api.getAjustes(), api.getCuotasInvitado()])
      setGastos(gs)
      setPct(aj.porcentajeNinos)
      setCuotaInv(ci)
      setPago(await api.getMiPago(event.id, me.id).catch(() => null))
      setError('')
    } catch (err) {
      setError(/gastos_evento|porcentaje/i.test(err.message) ? 'Falta preparar los gastos en Supabase.' : err.message)
    }
  }, [event.id, me.id])

  const cambios = useCambios()
  useEffect(() => { load() }, [load, cambios])

  async function quitar(g) {
    if (!(await confirmar(`¿Quitar «${g.concepto}» (${euros(g.importe)})?`, { si: 'Quitar' }))) return
    setBusyId(g.id)
    try {
      await api.deleteGasto(g.id)
      await load()
      onChange?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (error && !gastos) return <section className="detail-block"><h3 className="counter-title">Gastos de la comida</h3><p className="error">{error}</p></section>
  if (!gastos) return null

  const r = reparto({ apuntados: event.apuntados, gastos, pct, meId: me.id, consumo, cuotaInv })
  const puedeQuitar = (g) => g.socio_id === me.id || event.organizadorId === me.id || me.es_admin

  return (
    <section className="detail-block gastos">
      <div className="consumos-head">
        <h3 className="counter-title">Gastos de la comida</h3>
        {gastos.length ? <strong>{euros(r.total)}</strong> : null}
      </div>

      {gastos.length ? (
        <ul className="consumo-list">
          {gastos.map((g) => (
            <li key={g.id}>
              {g.socio_id === me.id || me.es_admin ? (
                <button type="button" className="line-btn" onClick={() => setEditing(g)} aria-label={`Cambiar ${g.concepto}`}>
                  <span>{g.concepto}<span className="gasto-who"> · {g.socio_id === me.id ? 'tú' : g.nombre}</span></span>
                  <strong>{euros(g.importe)}</strong>
                </button>
              ) : (
                <>
                  <span>{g.concepto}<span className="gasto-who"> · {g.nombre}</span></span>
                  <strong>{euros(g.importe)}</strong>
                </>
              )}
              {puedeQuitar(g) ? (
                <button type="button" className="icon-plain" aria-label={`Quitar ${g.concepto}`} disabled={busyId === g.id} onClick={() => quitar(g)}>
                  <Close size={16} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">Todavía nadie ha apuntado lo que ha comprado.</p>
      )}

      <button type="button" className="btn secondary block" onClick={() => setAdding(true)}>
        <Plus size={18} /> Añadir gasto
      </button>

      {gastos.length && r.adultos + r.ninos ? (
        <div className="reparto">
          <div><span>Por adulto</span><strong>{euros(r.porAdulto)}</strong></div>
          {r.ninos ? <div><span>Por niño ({pct} %)</span><strong>{euros(r.porNino)}</strong></div> : null}
          <p className="small muted">Entre {plural(r.adultos, 'adulto', 'adultos')}{r.ninos ? ` y ${plural(r.ninos, 'niño', 'niños')}` : ''}.</p>
        </div>
      ) : null}

      {(voy ? gastos.length || consumo || r.cuotaInvitados : r.pagado || consumo) ? (
        <Ticket r={r} consumos={consumos}>
          {r.saldo > 0.005 || pago ? (
            <PagadoBox pago={pago} saldo={r.saldo} busy={payBusy} onMark={async () => {
              setPayBusy(true)
              try {
                await api.marcarPagado(event.id, me.id, Math.round(r.saldo * 100) / 100)
                setPago(await api.getMiPago(event.id, me.id))
                onChange?.()
              } catch (err) {
                setError(/pagos_evento/i.test(err.message) ? 'Falta preparar "Pagado" en Supabase.' : err.message)
              } finally {
                setPayBusy(false)
              }
            }} onUnmark={async () => {
              if (!(await confirmar('¿Quitar la marca de pagado?', { si: 'Quitar' }))) return
              setPayBusy(true)
              try {
                await api.quitarPagado(event.id, me.id)
                setPago(null)
                onChange?.()
              } catch (err) {
                setError(err.message)
              } finally {
                setPayBusy(false)
              }
            }} />
          ) : null}
        </Ticket>
      ) : null}

      {me.es_admin && gastos.length ? <p className="small muted">Como administrador, toca cualquier gasto para cambiarlo o la ✕ para borrarlo.</p> : null}
      {!me.es_admin && gastos.some((g) => g.socio_id === me.id) ? <p className="small muted">Toca uno de tus gastos para cambiarlo o la ✕ para borrarlo.</p> : null}

      {error ? <p className="error">{error}</p> : null}

      {editing ? (
        <NuevoGasto
          gasto={editing}
          onClose={closeEdit}
          onSave={async (concepto, importe) => {
            await api.updateGasto(editing.id, concepto, importe)
            setEditing(null)
            await load()
            onChange?.()
          }}
        />
      ) : null}

      {adding ? (
        <NuevoGasto
          onClose={closeAdd}
          onSave={async (concepto, importe) => {
            await api.addGasto(event.id, concepto, importe)
            setAdding(false)
            await load()
            onChange?.()
          }}
        />
      ) : null}
    </section>
  )
}

function NuevoGasto({ gasto, onClose, onSave }) {
  const [concepto, setConcepto] = useState(gasto?.concepto || '')
  const [importe, setImporte] = useState(gasto ? String(gasto.importe).replace('.', ',') : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    const n = parseEuros(importe)
    if (!Number.isFinite(n) || n <= 0) return setError('Escribe el importe, por ejemplo 45,80.')
    setBusy(true)
    setError('')
    try {
      await onSave(concepto.trim(), Math.round(n * 100) / 100)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Sheet title={gasto ? 'Cambiar gasto' : 'Añadir gasto'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p className="small muted">Lo que has comprado tú para esta comida. Se reparte entre todos los comensales.</p>
        <div className="field">
          <label className="label" htmlFor="gasto-concepto">¿Qué has comprado?</label>
          <input id="gasto-concepto" className="input" type="text" required maxLength={80} placeholder="Carne, pan, verdura…" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="gasto-importe">Importe (€)</label>
          <input id="gasto-importe" className="input" type="text" inputMode="decimal" required placeholder="45,80" value={importe} onChange={(e) => setImporte(e.target.value)} />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn primary block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar gasto'}</button>
      </form>
    </Sheet>
  )
}

// Botón "Pagado" de mi cuenta del evento. Si la cuenta cambia después de pagar, avisa de la diferencia.
function PagadoBox({ pago, saldo, busy, onMark, onUnmark }) {
  if (!pago) {
    return (
      <button type="button" className="btn primary block pay-btn" disabled={busy} onClick={onMark}>
        {busy ? 'Guardando…' : `Pagado (${euros(saldo)})`}
      </button>
    )
  }
  const fecha = new Date(pago.pagado_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
  const falta = Math.round((saldo - pago.importe) * 100) / 100
  return (
    <div className="pagado-box">
      <p className="pagado-ok">✓ Pagado el {fecha} · {euros(pago.importe)}</p>
      {Math.abs(falta) >= 0.01 ? (
        <>
          <p className="small pagado-diff">
            La cuenta ha cambiado: {falta > 0 ? `te faltan ${euros(falta)}` : `has pagado ${euros(-falta)} de más`}.
          </p>
          {saldo > 0.005 ? (
            <button type="button" className="btn primary block" disabled={busy} onClick={onMark}>Marcar pagado {euros(saldo)}</button>
          ) : null}
        </>
      ) : null}
      <button type="button" className="unpay-btn" disabled={busy} onClick={onUnmark}>Quitar "Pagado"</button>
    </div>
  )
}
