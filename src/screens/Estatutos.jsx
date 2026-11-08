import { useCallback, useEffect, useState } from 'react'
import * as api from '../api.js'
import { Avatar } from '../components/Icons.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import Sheet from '../components/Sheet.jsx'
import Tarifas from './Tarifas.jsx'

const TABS = [
  { id: 'socios', label: 'Socios' },
  { id: 'normas', label: 'Normas' },
  { id: 'tarifas', label: 'Tarifas' },
]

export default function Estatutos({ me, onBack }) {
  const [tab, setTab] = useState('socios')

  return (
    <section className="screen">
      <ScreenTitle title="Estatutos" onBack={onBack} />

      <div className="subtabs" role="tablist" aria-label="Estatutos">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={`subtab${tab === t.id ? ' is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'socios' ? <Socios me={me} /> : tab === 'normas' ? <Normas me={me} /> : <Tarifas me={me} />}
      </div>
    </section>
  )
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function Socios({ me }) {
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // socio al que el administrador le cambia el mes

  const load = useCallback(() => {
    setError('')
    api.listSocios().then(setList, (err) => setError(err.message))
  }, [])
  useEffect(load, [load])

  if (error) return <Failed onRetry={load} />
  if (!list) return <div className="empty">Cargando…</div>
  return (
    <>
      <ListaSocios me={me} list={list.filter((s) => !s.baja)} onPick={me.es_admin ? setEditing : undefined} pickSelf conMes />
      {me.es_admin ? <p className="small muted center-text">Toca un socio para cambiar el mes que organiza.</p> : null}
      {editing ? (
        <MesSheet
          socio={editing}
          onClose={() => setEditing(null)}
          onSave={async (mes) => { await api.setMesOrganiza(editing.id, mes); setEditing(null); load() }}
        />
      ) : null}
    </>
  )
}

// El administrador elige el mes en que organiza un socio (o ninguno).
function MesSheet({ socio, onClose, onSave }) {
  const [mes, setMes] = useState(socio.mes_organiza || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    setBusy(true)
    setError('')
    try {
      await onSave(mes)
    } catch (err) {
      setError(/set_mes_organiza|PGRST202/i.test(err.message) ? 'Falta preparar los meses en Supabase.' : err.message)
      setBusy(false)
    }
  }

  return (
    <Sheet title={`¿Qué mes organiza ${socio.nombre}?`} onClose={onClose}>
      <div className="form">
        <div className="segmented mes-grid">
          {MESES.map((m, i) => (
            <label key={m} className={mes === i + 1 ? 'is-on' : ''}>
              <input type="radio" name="mes" checked={mes === i + 1} onChange={() => setMes(i + 1)} />
              {m}
            </label>
          ))}
        </div>
        <button type="button" className="btn link-btn block" onClick={() => setMes(null)} disabled={mes === null}>Sin mes</button>
        {error ? <p className="error">{error}</p> : null}
        <button type="button" className="btn primary block" disabled={busy} onClick={guardar}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </Sheet>
  )
}

// Lista de socios (foto, nombre, "Tú", "Admin"). Si se pasa onPick, cada socio se puede tocar.
export function ListaSocios({ me, list, titulo, onPick, pickSelf = false, conMes = false, className = '' }) {
  return (
    <div className={`card members ${className}`}>
      <div className="members-head">
        <p className="members-count">{titulo || `${list.length} ${list.length === 1 ? 'socio' : 'socios'}`}</p>
        {conMes ? <p className="members-count">Organiza</p> : null}
      </div>
      <ul className="members-list">
        {list.map((s) => {
          const inner = (
            <>
              <Avatar src={s.foto_url} />
              <span className="member-name">{s.nombre}</span>
              {s.id === me.id ? <span className="badge">Tú</span> : null}
              {s.es_admin ? <span className="badge admin">Admin</span> : null}
              {conMes ? (
                <strong className={`organiza${s.mes_organiza ? '' : ' sin'}`}>{s.mes_organiza ? MESES[s.mes_organiza - 1] : '—'}</strong>
              ) : null}
            </>
          )
          return onPick && (pickSelf || s.id !== me.id) ? (
            <li key={s.id}><button type="button" className="member-btn" onClick={() => onPick(s)}>{inner}</button></li>
          ) : (
            <li key={s.id}>{inner}</li>
          )
        })}
      </ul>
    </div>
  )
}


function Normas({ me }) {
  const [normas, setNormas] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const load = useCallback(() => {
    setError('')
    api.getNormas().then(setNormas, (err) => setError(err.message))
  }, [])
  useEffect(load, [load])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      await api.saveNormas(draft.trim())
      setEditing(false)
      load()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error) return <Failed onRetry={load} />
  if (!normas) return <div className="empty">Cargando…</div>

  if (editing) {
    return (
      <form className="card form" onSubmit={save}>
        <div className="field">
          <label className="label" htmlFor="normas">Normas de la peña</label>
          <textarea id="normas" className="input normas-input" rows={14} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="1. …" />
        </div>
        {saveError ? <p className="error">{saveError}</p> : null}
        <button type="submit" className="btn primary block" disabled={saving}>{saving ? 'Guardando…' : 'Guardar normas'}</button>
        <button type="button" className="btn secondary block" onClick={() => setEditing(false)} disabled={saving}>Cancelar</button>
      </form>
    )
  }

  return (
    <div className="normas-wrap">
      {normas.texto ? (
        <div className="card normas">
          <p className="normas-text">{normas.texto}</p>
          {normas.actualizado ? (
            <p className="small muted">
              Actualizadas el {new Date(normas.actualizado).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              {normas.autor ? ` por ${normas.autor}` : ''}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="empty">Todavía no se han escrito las normas.</div>
      )}
      {me.es_admin ? (
        <button type="button" className="btn secondary block" onClick={() => { setDraft(normas.texto); setEditing(true) }}>
          {normas.texto ? 'Editar normas' : 'Escribir normas'}
        </button>
      ) : null}
    </div>
  )
}

function Failed({ onRetry }) {
  return (
    <div className="empty">
      <p>No se ha podido cargar.</p>
      <button type="button" className="btn secondary" onClick={onRetry}>Reintentar</button>
    </div>
  )
}
