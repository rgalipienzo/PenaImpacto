import { useCallback, useEffect, useState } from 'react'
import * as api from '../api.js'
import Sheet from '../components/Sheet.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import { Chevron, Pencil } from '../components/Icons.jsx'
import Ticket from '../components/Ticket.jsx'
import { KIND_LABEL, euros, parseEuros, shortDate } from '../lib.js'

// Pagos: la cuota mensual (igual para todos, la pone el administrador)
// y, más adelante, los gastos de cada socio en los eventos.
export default function Pagos({ me, onBack }) {
  const [cuota, setCuota] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const close = useCallback(() => setEditing(false), [])

  const load = useCallback(async () => {
    try {
      setCuota(await api.getCuota())
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <section className="screen">
      <ScreenTitle title="Pagos" onBack={onBack} />

      <div className="card cuota">
        <div className="data-head">
          <h2>Cuota mensual</h2>
          {me.es_admin && cuota !== null ? (
            <button type="button" className="icon-plain" aria-label="Cambiar la cuota mensual" onClick={() => setEditing(true)}>
              <Pencil size={20} />
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="error">No se ha podido cargar la cuota.</p>
        ) : cuota === null ? (
          <p className="muted">Cargando…</p>
        ) : (
          <p className="cuota-num">{euros(cuota)}<span> / mes</span></p>
        )}
        <p className="small muted">Es la misma para todos los socios.</p>
      </div>

      <MisGastos meId={me.id} />

      {editing ? (
        <CuotaSheet
          cuota={cuota}
          onClose={close}
          onSave={async (c) => { await api.saveCuota(c); setEditing(false); await load() }}
        />
      ) : null}
    </section>
  )
}

function CuotaSheet({ cuota, onClose, onSave }) {
  const [value, setValue] = useState(String(cuota).replace('.', ','))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    const c = parseEuros(value)
    if (!Number.isFinite(c) || c < 0) return setError('Escribe una cantidad válida, por ejemplo 20 o 25,50.')
    setBusy(true)
    setError('')
    try {
      await onSave(Math.round(c * 100) / 100)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Sheet title="Cuota mensual" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="cuota">Cuota de cada socio al mes (€)</label>
          <input id="cuota" className="input" type="text" inputMode="decimal" required value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn primary block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </Sheet>
  )
}

// Mi cuenta de cada evento: mi parte de la comida + mis consumiciones − lo que he pagado yo.
function MisGastos({ meId }) {
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [abiertos, setAbiertos] = useState({}) // evento id → true si su ticket está desplegado

  useEffect(() => {
    api.listMisCuentas(meId).then(setList, (err) => setError(err.message))
  }, [meId])

  // Lo pendiente de cada evento: si lo marqué como pagado, solo cuenta la diferencia (si la cuenta cambió después).
  const pendiente = (g) => (g.pago && g.saldo > 0 ? Math.round((g.saldo - g.pago.importe) * 100) / 100 : g.saldo)
  const saldo = (list || []).reduce((s, g) => s + pendiente(g), 0)
  const toggle = (id) => setAbiertos((a) => ({ ...a, [id]: !a[id] }))

  return (
    <>
      <div className="card data-list">
        <div className="data-head">
          <h2>Mis gastos en eventos</h2>
          {list?.length ? <strong className={`gastos-total${saldo < 0 ? ' te-deben' : saldo > 0.005 ? ' debe' : ''}`}>{euros(Math.abs(saldo))}</strong> : null}
        </div>
        {error ? (
          <p className="error pagos-soon">No se han podido cargar tus gastos.</p>
        ) : !list ? (
          <p className="muted pagos-soon">Cargando…</p>
        ) : list.length ? (
          <p className="small muted pagos-soon">
            {Math.abs(saldo) < 0.005 ? 'Lo tienes todo pagado.' : `${saldo < 0 ? 'En total te deben' : 'En total te queda por pagar'} ${euros(Math.abs(saldo))}.`} Toca un evento para ver su ticket.
          </p>
        ) : (
          <p className="muted pagos-soon">Todavía no tienes gastos. Se apuntan en la pantalla principal, tocando tu evento.</p>
        )}
      </div>

      {(list || []).map((g) => {
        const open = !!abiertos[g.evento.id]
        return (
          <div key={g.evento.id} className={`card gasto-card ${g.evento.tipo}${open ? ' is-open' : ''}`}>
            <button type="button" className="gasto-head gasto-toggle" aria-expanded={open} onClick={() => toggle(g.evento.id)}>
              <span className="data-field">
                <span className="event-meta"><span className={`event-kind ${g.evento.tipo}`}>{KIND_LABEL[g.evento.tipo]}</span> · {shortDate(g.evento.fecha)}</span>
                <span className="data-value">{g.evento.titulo}</span>
              </span>
              {g.pago && Math.abs(pendiente(g)) < 0.005 ? (
                <span className="state ok">Pagado</span>
              ) : (
                <strong className={g.saldo < 0 ? 'te-deben' : pendiente(g) > 0.005 ? 'debe' : ''}>{g.saldo < 0 ? '+' : ''}{euros(Math.abs(g.pago ? pendiente(g) : g.saldo))}</strong>
              )}
              <Chevron size={20} className="gasto-chevron" />
            </button>
            {open ? (
              <Ticket r={g} consumos={g.consumos}>
                {g.pago ? (
                  <ul className="gasto-items">
                    <li className="gasto-pagado">
                      <span>✓ Pagado el {new Date(g.pago.pagado_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      <span>{euros(g.pago.importe)}</span>
                    </li>
                    {Math.abs(pendiente(g)) >= 0.005 ? (
                      <li className={`gasto-saldo${pendiente(g) > 0 ? ' debe' : ' te-deben'}`}><span>{pendiente(g) > 0 ? 'Me falta por pagar' : 'He pagado de más'}</span><span>{euros(Math.abs(pendiente(g)))}</span></li>
                    ) : null}
                  </ul>
                ) : null}
              </Ticket>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
