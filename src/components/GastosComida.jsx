import { useCallback, useEffect, useState } from 'react'
import * as api from '../api.js'
import { useCambios } from '../realtime.js'
import Sheet from './Sheet.jsx'
import Ticket from './Ticket.jsx'
import { ElegirConsumiciones } from './Consumiciones.jsx'
import { Close, Minus, Plus } from './Icons.jsx'
import { cuentaEvento, euros, parseEuros, plural } from '../lib.js'
import { confirmar } from './confirmar.jsx'

// "Gastos de la comida" dentro de un evento: lo que ha comprado cada socio, el total,
// el precio por adulto y por niño, quién paga a quién por Bizum y mi cuenta (comida + bote).
export default function GastosComida({ event, me, voy, consumo, consumos = [], onChange }) {
  const [gastos, setGastos] = useState(null)
  const [pct, setPct] = useState(50)
  const [cuotaInv, setCuotaInv] = useState({ adulto: 0, nino: 0 })
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null) // gasto que se está cambiando
  const [busyId, setBusyId] = useState(null)
  const [pagoBote, setPagoBote] = useState(null) // { importe, pagado_at } si he marcado «Puesto en el bote»
  const [reembolsos, setReembolsos] = useState([]) // Bizums ya hechos en este evento
  const [botellas, setBotellas] = useState([]) // bebidas compartidas (gasto común)
  const [tarifasBotella, setTarifasBotella] = useState(null)
  const [eligiendo, setEligiendo] = useState(false)
  const [bebedoresDe, setBebedoresDe] = useState(null) // bebida compartida a la que se le marca quién ha bebido
  const closeAdd = useCallback(() => setAdding(false), [])
  const closeEdit = useCallback(() => setEditing(null), [])

  const load = useCallback(async () => {
    try {
      const [gs, aj, ci] = await Promise.all([api.listGastos(event.id), api.getAjustes(), api.getCuotasInvitado()])
      setGastos(gs)
      setPct(event.porcentajeNinos ?? aj.porcentajeNinos)
      setCuotaInv(ci)
      setPagoBote(await api.getMiPago(event.id, me.id).catch(() => null))
      setReembolsos(await api.listReembolsos([event.id]).catch(() => []))
      setBotellas(await api.listBotellas([event.id]).catch(() => []))
      setError('')
    } catch (err) {
      setError(/gastos_evento|porcentaje/i.test(err.message) ? 'Falta preparar los gastos en Supabase.' : err.message)
    }
  }, [event.id, event.porcentajeNinos, me.id])

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

  if (error && !gastos) return <section className="detail-block"><h3 className="counter-title seccion-titulo">Gastos de la comida</h3><p className="error">{error}</p></section>
  if (!gastos) return null

  const r = cuentaEvento({ apuntados: event.apuntados, gastos, pct, meId: me.id, consumo, cuotaInv, reembolsos, pagoBote, botellas })
  const mando = event.organizadorId === me.id || me.es_admin
  const puedeQuitar = (g) => g.socio_id === me.id || event.organizadorId === me.id || me.es_admin

  return (
    <section className="detail-block gastos">
      <div className="consumos-head">
        <h3 className="counter-title seccion-titulo">Gastos de la comida</h3>
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
          {mando && r.ninos ? (
            <PctNinos
              pct={pct}
              onSave={async (p) => { await api.setPorcentajeNinos(event.id, p); setPct(p); onChange?.() }}
            />
          ) : null}
        </div>
      ) : null}

      <div className="botellas">
        <div className="consumos-head">
          <h3 className="counter-title seccion-titulo">Bebidas compartidas</h3>
          {botellas.length ? <strong>{euros(r.botellasTotal)}</strong> : null}
        </div>
        {botellas.length ? (
          <ul className="consumo-list">
            {r.botellasLineas.map((b) => {
              const inner = (
                <>
                  <span className="botella-info">
                    <span>{b.cantidad} × {b.nombre}</span>
                    <span className={`botella-entre${b.todos ? '' : ' marcada'}`}>
                      {b.todos ? 'Entre todos' : `Entre ${plural(b.adultos, 'adulto', 'adultos')} · ${euros(b.porAdulto)} c/u`}
                    </span>
                  </span>
                  <strong>{euros(b.coste)}</strong>
                </>
              )
              return (
                <li key={b.id}>
                  {mando ? (
                    <button type="button" className="line-btn botella-btn" onClick={() => setBebedoresDe(b)} aria-label={`Quién ha bebido ${b.nombre}`}>{inner}</button>
                  ) : inner}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="small muted">{mando ? 'Apunta aquí las botellas y bebidas de todos.' : 'No se ha apuntado ninguna bebida compartida.'}</p>
        )}
        {mando ? (
          <button
            type="button"
            className="btn secondary block"
            onClick={async () => {
              try {
                const ts = await api.listTarifas()
                setTarifasBotella(ts.filter(api.esBotella))
                setEligiendo(true)
              } catch (err) {
                setError(err.message)
              }
            }}
          >
            <Plus size={18} /> {botellas.length ? 'Cambiar bebidas compartidas' : 'Añadir bebidas compartidas'}
          </button>
        ) : null}
        {botellas.length ? (
          <p className="small muted">
            Se reparten entre todos como la comida, o solo entre quien ha bebido si se marca. Cada uno pone su parte en el bote.
            {mando ? ' Toca una bebida para marcar quién la ha bebido.' : ' Solo quien organiza el evento las puede cambiar.'}
          </p>
        ) : null}
      </div>

      {(voy ? gastos.length || r.bote : r.pagado || r.bote || r.hechos.length) ? (
        <>
          <h4 className="counter-group">Tu cuenta</h4>
          <Ticket k={r} eventoId={event.id} meId={me.id} consumos={consumos} onChange={async () => { await load(); onChange?.() }} />
        </>
      ) : null}

      {gastos.length ? (
        <div className="quien-paga">
          <h4 className="counter-group">Quién paga a quién</h4>
          {r.bizums.length ? (
            <ul className="quien-list">
              {r.bizums.map((t) => (
                <li key={`${t.de}-${t.a}`}>
                  <span><strong>{t.de === me.id ? 'Tú' : t.deNombre}</strong> → <strong>{t.a === me.id ? 'ti' : t.aNombre}</strong></span>
                  <strong>{euros(t.importe)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="bizum-ok">✓ La comida está cuadrada: no falta ningún Bizum.</p>
          )}
          {r.reembolsos.length ? <p className="small muted">{plural(r.reembolsos.length, 'Bizum hecho', 'Bizums hechos')}.</p> : null}
        </div>
      ) : null}

      {me.es_admin && gastos.length ? <p className="small muted">Como administrador, toca cualquier gasto para cambiarlo o la ✕ para borrarlo.</p> : null}
      {!me.es_admin && gastos.some((g) => g.socio_id === me.id) ? <p className="small muted">Toca uno de tus gastos para cambiarlo o la ✕ para borrarlo.</p> : null}

      {error ? <p className="error">{error}</p> : null}

      {bebedoresDe ? (
        <QuienHaBebido
          botella={bebedoresDe}
          apuntados={event.apuntados}
          onClose={() => setBebedoresDe(null)}
          onSave={async (beb) => { await api.setBebedores(bebedoresDe.id, beb); setBebedoresDe(null); await load(); onChange?.() }}
        />
      ) : null}

      {eligiendo && tarifasBotella ? (
        tarifasBotella.length ? (
          <ElegirConsumiciones
            titulo="Bebidas compartidas"
            tarifas={tarifasBotella}
            mine={botellas}
            onCancel={() => setEligiendo(false)}
            onAccept={async (cambios) => {
              for (const { tarifa, cantidad } of cambios) await api.setBotella(event.id, tarifa, cantidad)
              await load()
              setEligiendo(false)
              onChange?.()
            }}
          />
        ) : (
          <Sheet title="Bebidas compartidas" onClose={() => setEligiendo(false)}>
            <p className="muted">No hay bebidas compartidas en Tarifas. Un administrador las puede añadir en Estatutos → Tarifas, con el tipo «Bebidas compartidas».</p>
          </Sheet>
        )
      ) : null}

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

// La organizadora marca quién ha bebido una bebida compartida: de cada socio, cuántos adultos de su grupo.
// Si están todos, se guarda como «todos» y se reparte como la comida.
function QuienHaBebido({ botella, apuntados, onClose, onSave }) {
  const maximo = (a) => (a.comensales || 0) + (a.amigos || 0)
  const [cant, setCant] = useState(() =>
    Object.fromEntries(apuntados.map((a) => [a.id, botella.todos ? maximo(a) : Number(botella.bebedores?.[a.id]) || 0])),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const total = Object.values(cant).reduce((s, n) => s + n, 0)
  const todos = apuntados.every((a) => cant[a.id] === maximo(a))
  const poner = (a, n) => setCant((c) => ({ ...c, [a.id]: Math.max(0, Math.min(maximo(a), n)) }))

  async function guardar() {
    if (!total) return setError('Marca al menos a una persona.')
    setBusy(true)
    setError('')
    try {
      await onSave(todos ? null : Object.fromEntries(Object.entries(cant).filter(([, n]) => n > 0)))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Sheet title="¿Quién ha bebido?" onClose={onClose}>
      <p className="small muted">{botella.cantidad} × {botella.nombre} · {euros(botella.coste)}. Se reparte solo entre los adultos marcados.</p>
      <ul className="bebedores-list">
        {apuntados.map((a) => {
          const max = maximo(a)
          const n = cant[a.id] || 0
          return (
            <li key={a.id} className={n ? 'is-on' : ''}>
              <button type="button" className="bebedor-check" aria-pressed={n > 0} onClick={() => poner(a, n ? 0 : max)}>
                <span className="voto-check" aria-hidden="true">{n ? '✓' : ''}</span>
                <span className="bebedor-nombre">{a.nombre}{max > 1 ? <span className="muted"> · {max} adultos</span> : null}</span>
              </button>
              {max > 1 ? (
                <div className="stepper">
                  <button type="button" className="icon-btn" aria-label={`${a.nombre}: uno menos`} disabled={!n} onClick={() => poner(a, n - 1)}><Minus size={18} /></button>
                  <output aria-live="polite">{n}</output>
                  <button type="button" className="icon-btn" aria-label={`${a.nombre}: uno más`} disabled={n >= max} onClick={() => poner(a, n + 1)}><Plus size={18} /></button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      <p className="bebedores-total">{total ? `Entre ${plural(total, 'adulto', 'adultos')} · ${euros(botella.coste / total)} cada uno` : 'Nadie marcado'}</p>
      <div className="actions">
        <button type="button" className="btn link-btn block" onClick={() => setCant(Object.fromEntries(apuntados.map((a) => [a.id, maximo(a)])))} disabled={todos}>Marcar a todos</button>
        {error ? <p className="error">{error}</p> : null}
        <button type="button" className="btn primary block" disabled={busy} onClick={guardar}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </Sheet>
  )
}

// Quien organiza el evento (o un administrador) elige lo que paga un niño: 50 %, 100 % u otro.
function PctNinos({ pct, onSave }) {
  const [otro, setOtro] = useState(pct !== 50 && pct !== 100)
  const [valor, setValor] = useState(String(pct))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function guardar(p) {
    const n = Math.round(Number(p))
    if (!Number.isFinite(n) || n < 0 || n > 100) return setError('Pon un número de 0 a 100.')
    setBusy(true)
    setError('')
    try {
      await onSave(n)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pct-ninos">
      <span className="pct-ninos-label">Los niños pagan</span>
      <div className="segmented pct-seg">
        {[50, 100].map((v) => (
          <label key={v} className={!otro && pct === v ? 'is-on' : ''}>
            <input type="radio" name="pct-ninos" disabled={busy} checked={!otro && pct === v} onChange={() => { setOtro(false); setValor(String(v)); guardar(v) }} />
            {v} %
          </label>
        ))}
        <label className={otro ? 'is-on' : ''}>
          <input type="radio" name="pct-ninos" disabled={busy} checked={otro} onChange={() => setOtro(true)} />
          Otro
        </label>
      </div>
      {otro ? (
        <div className="pct-otro-row">
          <input className="input" type="number" min={0} max={100} step={1} inputMode="numeric" aria-label="Porcentaje que paga un niño" value={valor} onChange={(e) => setValor(e.target.value)} />
          <span>%</span>
          <button type="button" className="btn primary small-btn" disabled={busy || valor === ''} onClick={() => guardar(valor)}>Guardar</button>
        </div>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
