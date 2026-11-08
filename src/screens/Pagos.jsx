import { useCallback, useEffect, useState } from 'react'
import * as api from '../api.js'
import { useCambios } from '../realtime.js'
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

  const cambios = useCambios()
  useEffect(() => { load() }, [load, cambios])

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

// Mis cuentas de cada evento: los Bizums de la comida (que tengo que hacer o recibir) y lo del bote.
function MisGastos({ meId }) {
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [abiertos, setAbiertos] = useState({}) // evento id → true si su ticket está desplegado
  const [ocultos, setOcultos] = useState(new Set()) // eventos que he quitado de mi pantalla
  const [verQuitados, setVerQuitados] = useState(false)

  const cambios = useCambios()
  const load = useCallback(() => Promise.all([api.listMisCuentas(meId), api.listOcultos('pago')]).then(
    ([l, o]) => { setList(l); setOcultos(o) },
    (err) => setError(err.message),
  ), [meId])
  useEffect(() => { load() }, [load, cambios])

  const r2 = (n) => Math.round(n * 100) / 100
  const debo = (g) => r2(g.comidaPendiente + Math.max(0, g.botePendiente))
  const totalBizums = r2((list || []).reduce((s, g) => s + g.comidaPendiente, 0))
  const totalBote = r2((list || []).reduce((s, g) => s + Math.max(0, g.botePendiente), 0))
  const meDeben = r2((list || []).reduce((s, g) => s + g.meDebenTotal, 0))
  const toggle = (id) => setAbiertos((a) => ({ ...a, [id]: !a[id] }))
  // Solo se puede quitar un evento cuadrado; si después vuelve a quedar algo pendiente, sale otra vez.
  const cuadrado = (g) => debo(g) <= 0.005 && g.meDebenTotal <= 0.005
  const quitado = (g) => ocultos.has(g.evento.id) && cuadrado(g)
  const visibles = (list || []).filter((g) => !quitado(g))
  const quitados = (list || []).filter(quitado)

  return (
    <>
      <div className="card data-list">
        <div className="data-head">
          <h2>Mis cuentas en eventos</h2>
        </div>
        {error ? (
          <p className="error pagos-soon">No se han podido cargar tus cuentas.</p>
        ) : !list ? (
          <p className="muted pagos-soon">Cargando…</p>
        ) : list.length ? (
          <>
            {totalBizums ? <div className="tarifa-row"><span>Bizums que tienes que hacer</span><strong className="debe">{euros(totalBizums)}</strong></div> : null}
            {totalBote ? <div className="tarifa-row"><span>Para poner en el bote</span><strong className="debe">{euros(totalBote)}</strong></div> : null}
            {meDeben ? <div className="tarifa-row"><span>Te tienen que pagar</span><strong className="te-deben">{euros(meDeben)}</strong></div> : null}
            <p className="small muted pagos-soon">
              {!totalBizums && !totalBote && !meDeben ? 'Lo tienes todo cuadrado. ' : ''}La comida se paga por Bizum entre socios; las consumiciones y los invitados, al bote. Toca un evento para ver su cuenta.
            </p>
          </>
        ) : (
          <p className="muted pagos-soon">Todavía no tienes gastos. Se apuntan en la pantalla principal, tocando tu evento.</p>
        )}
      </div>

      {[...visibles, ...(verQuitados ? quitados : [])].map((g) => {
        const open = !!abiertos[g.evento.id]
        const esQuitado = quitado(g)
        const d = debo(g)
        return (
          <div key={g.evento.id} className={`card gasto-card ${g.evento.tipo}${open ? ' is-open' : ''}`}>
            <button type="button" className="gasto-head gasto-toggle" aria-expanded={open} onClick={() => toggle(g.evento.id)}>
              <span className="data-field">
                <span className="event-meta"><span className={`event-kind ${g.evento.tipo}`}>{KIND_LABEL[g.evento.tipo]}</span> · {shortDate(g.evento.fecha)}</span>
                <span className="data-value">{g.evento.titulo}</span>
              </span>
              {d > 0.005 ? (
                <strong className="debe">{euros(d)}</strong>
              ) : g.meDebenTotal > 0.005 ? (
                <strong className="te-deben">+{euros(g.meDebenTotal)}</strong>
              ) : (
                <span className="state ok">Cuadrado</span>
              )}
              <Chevron size={20} className="gasto-chevron" />
            </button>
            {open ? (
              <>
                <Ticket k={g} eventoId={g.evento.id} meId={meId} consumos={g.consumos} onChange={load} />
                {esQuitado ? (
                  <button type="button" className="lista-mostrar quitar-pago" onClick={() => api.mostrar('pago', g.evento.id).then(load, (err) => setError(err.message))}>Volver a mostrarlo</button>
                ) : cuadrado(g) ? (
                  <button type="button" className="lista-mostrar quitar-pago" onClick={() => api.ocultar('pago', g.evento.id).then(load, (err) => setError(err.message))}>Quitar de mi pantalla</button>
                ) : null}
              </>
            ) : null}
          </div>
        )
      })}

      {quitados.length ? (
        <button type="button" className="btn link-btn block" onClick={() => setVerQuitados(!verQuitados)}>
          {verQuitados ? 'Esconder los eventos que has quitado' : `Ver ${quitados.length === 1 ? 'el evento que has quitado' : `los ${quitados.length} eventos que has quitado`}`}
        </button>
      ) : null}
    </>
  )
}
