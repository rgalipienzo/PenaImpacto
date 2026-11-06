import { useCallback, useEffect, useState } from 'react'
import * as api from '../api.js'
import { useCambios } from '../realtime.js'
import Sheet from '../components/Sheet.jsx'
import { Pencil, Plus } from '../components/Icons.jsx'
import { euros, parseEuros } from '../lib.js'
import { confirmar } from '../components/confirmar.jsx'

const CATEGORIAS = ['Bebidas', 'Comida', 'Invitado', 'Otros']

// Pestaña Tarifas de Estatutos: precios de bebidas y demás. Todos la ven; el administrador la edita.
export default function Tarifas({ me }) {
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | {} (nueva) | tarifa
  const close = useCallback(() => setEditing(null), [])

  const load = useCallback(async () => {
    try {
      setList(await api.listTarifas())
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const cambios = useCambios()
  useEffect(() => { load() }, [load, cambios])

  if (error) {
    return (
      <div className="empty">
        <p>No se han podido cargar las tarifas.</p>
        <button type="button" className="btn secondary" onClick={load}>Reintentar</button>
      </div>
    )
  }
  if (!list) return <div className="empty">Cargando…</div>

  const todos = [...new Set([...CATEGORIAS, ...list.map((t) => t.categoria)])]
    .map((c) => ({ categoria: c, items: list.filter((t) => t.categoria === c) }))
    .filter((g) => g.items.length)
  // "Invitado" es una norma, como el reparto de la comida: va justo debajo de él.
  const invitados = todos.find((g) => g.categoria === 'Invitado')
  if (invitados) {
    // Familiar antes que amigo; adulto antes que infantil.
    const orden = (t) => (/famil/i.test(t.nombre) ? 0 : 2) + (/infantil|niñ/i.test(t.nombre) ? 1 : 0)
    invitados.items = [...invitados.items].sort((a, b) => orden(a) - orden(b))
  }
  const grupos = todos.filter((g) => g.categoria !== 'Invitado')

  const Grupo = ({ g }) => (
    <div className="card data-list">
      <div className="data-head"><h2>{g.categoria === 'Invitado' ? 'Invitados' : g.categoria}</h2></div>
      {g.items.map((t) =>
        me.es_admin ? (
          <button key={t.id} type="button" className="tarifa-row" onClick={() => setEditing(t)} aria-label={`Editar ${t.nombre}`}>
            <span>{t.nombre}</span>
            <strong>{euros(t.precio)}</strong>
          </button>
        ) : (
          <div key={t.id} className="tarifa-row">
            <span>{t.nombre}</span>
            <strong>{euros(t.precio)}</strong>
          </div>
        ),
      )}
    </div>
  )

  return (
    <div className="tarifas">
      {me.es_admin ? (
        <button type="button" className="btn primary block" onClick={() => setEditing({})}>
          <Plus size={18} /> Añadir tarifa
        </button>
      ) : null}

      <CuotaMensual me={me} />
      <PrecioNinos me={me} />
      {invitados ? <Grupo g={invitados} /> : null}

      {grupos.length ? (
        grupos.map((g) => <Grupo key={g.categoria} g={g} />)
      ) : invitados ? null : (
        <div className="empty">Todavía no hay tarifas.</div>
      )}

      {me.es_admin && list.length ? <p className="small muted center-text">Toca una tarifa para cambiarla o borrarla.</p> : null}

      {editing ? (
        <TarifaSheet
          tarifa={editing}
          onClose={close}
          onSave={async (t) => { await api.saveTarifa(t); setEditing(null); await load() }}
          onDelete={async () => { await api.deleteTarifa(editing.id); setEditing(null); await load() }}
        />
      ) : null}
    </div>
  )
}

function TarifaSheet({ tarifa, onClose, onSave, onDelete }) {
  const [nombre, setNombre] = useState(tarifa.nombre || '')
  const [precio, setPrecio] = useState(tarifa.id ? String(tarifa.precio).replace('.', ',') : '')
  const [categoria, setCategoria] = useState(tarifa.categoria || 'Bebidas')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(fn) {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  function submit(e) {
    e.preventDefault()
    const p = parseEuros(precio)
    if (!Number.isFinite(p) || p < 0) return setError('Escribe un precio válido, por ejemplo 1,50.')
    run(() => onSave({ id: tarifa.id, nombre: nombre.trim(), precio: Math.round(p * 100) / 100, categoria }))
  }

  async function borrar() {
    if (await confirmar(`¿Borrar «${tarifa.nombre}»?`, { si: 'Borrar' })) run(onDelete)
  }

  return (
    <Sheet title={tarifa.id ? 'Cambiar tarifa' : 'Nueva tarifa'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <fieldset className="field">
          <legend className="label">Tipo</legend>
          <div className="segmented four">
            {CATEGORIAS.map((c) => (
              <label key={c} className={categoria === c ? 'is-on' : ''}>
                <input type="radio" name="categoria" value={c} checked={categoria === c} onChange={() => setCategoria(c)} />
                {c}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label className="label" htmlFor="tar-nombre">Nombre</label>
          <input id="tar-nombre" className="input" type="text" required maxLength={80} placeholder="Caña" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="tar-precio">Precio (€)</label>
          <input id="tar-precio" className="input" type="text" inputMode="decimal" required placeholder="1,50" value={precio} onChange={(e) => setPrecio(e.target.value)} />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn primary block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        {tarifa.id ? <button type="button" className="btn danger block" disabled={busy} onClick={borrar}>Borrar tarifa</button> : null}
      </form>
    </Sheet>
  )
}

// Cuánto paga un niño en el reparto de la comida, respecto a un adulto (en %). Lo cambia un administrador.
function PrecioNinos({ me }) {
  const [pct, setPct] = useState(null)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const close = useCallback(() => setEditing(false), [])

  const cambios = useCambios()
  useEffect(() => {
    api.getAjustes().then((a) => setPct(a.porcentajeNinos), () => setPct(null))
  }, [cambios])

  async function submit(e) {
    e.preventDefault()
    const n = Math.round(Number(String(value).replace(',', '.')))
    if (!Number.isFinite(n) || n < 0 || n > 100) return setError('Pon un número del 0 al 100.')
    setBusy(true)
    setError('')
    try {
      await api.savePorcentajeNinos(n)
      setPct(n)
      setEditing(false)
    } catch (err) {
      setError(/porcentaje/i.test(err.message) ? 'Falta preparar este ajuste en Supabase.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  if (pct === null) return null

  return (
    <div className="card data-list">
      <div className="data-head">
        <h2>Reparto de la comida</h2>
        {me.es_admin ? (
          <button type="button" className="icon-plain" aria-label="Cambiar lo que paga un niño" onClick={() => { setValue(String(pct)); setError(''); setEditing(true) }}>
            <Pencil size={20} />
          </button>
        ) : null}
      </div>
      <div className="tarifa-row"><span>Adulto</span><strong>100 %</strong></div>
      <div className="tarifa-row"><span>Niño (0 a 14 años)</span><strong>{pct} %</strong></div>
      <p className="small muted pagos-soon">Los gastos de cada comida se reparten así: un niño paga el {pct} % de lo que paga un adulto.</p>

      {editing ? (
        <Sheet title="Lo que paga un niño" onClose={close}>
          <form className="form" onSubmit={submit}>
            <div className="field">
              <label className="label" htmlFor="pct-ninos">Un niño paga este % de lo que paga un adulto</label>
              <input id="pct-ninos" className="input" type="number" min={0} max={100} step={1} inputMode="numeric" required value={value} onChange={(e) => setValue(e.target.value)} />
              <span className="small muted">0 = los niños no pagan · 50 = la mitad · 100 = igual que un adulto</span>
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit" className="btn primary block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
          </form>
        </Sheet>
      ) : null}
    </div>
  )
}

// Cuota mensual de cada socio (la misma para todos). La cambia un administrador; también se ve en Pagos.
function CuotaMensual({ me }) {
  const [cuota, setCuota] = useState(null)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const close = useCallback(() => setEditing(false), [])

  const cambios = useCambios()
  useEffect(() => {
    api.getCuota().then(setCuota, () => setCuota(null))
  }, [cambios])

  async function submit(e) {
    e.preventDefault()
    const c = parseEuros(value)
    if (!Number.isFinite(c) || c < 0) return setError('Escribe una cantidad válida, por ejemplo 20 o 25,50.')
    setBusy(true)
    setError('')
    try {
      const n = Math.round(c * 100) / 100
      await api.saveCuota(n)
      setCuota(n)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (cuota === null) return null

  return (
    <div className="card data-list">
      <div className="data-head">
        <h2>Cuota mensual</h2>
        {me.es_admin ? (
          <button type="button" className="icon-plain" aria-label="Cambiar la cuota mensual" onClick={() => { setValue(String(cuota).replace('.', ',')); setError(''); setEditing(true) }}>
            <Pencil size={20} />
          </button>
        ) : null}
      </div>
      <div className="tarifa-row"><span>Cada socio, al mes</span><strong>{euros(cuota)}</strong></div>

      {editing ? (
        <Sheet title="Cuota mensual" onClose={close}>
          <form className="form" onSubmit={submit}>
            <div className="field">
              <label className="label" htmlFor="cuota-tarifas">Cuota de cada socio al mes (€)</label>
              <input id="cuota-tarifas" className="input" type="text" inputMode="decimal" required value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit" className="btn primary block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
          </form>
        </Sheet>
      ) : null}
    </div>
  )
}
