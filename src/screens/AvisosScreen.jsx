import { useEffect, useState } from 'react'
import * as api from '../api.js'
import ScreenTitle from '../components/ScreenTitle.jsx'
import { KIND_ICON } from '../components/Icons.jsx'
import { KIND_LABEL, esReserva, horaText, shortDate } from '../lib.js'

// Pantalla de Avisos: los eventos que han creado los demás socios (de hoy en adelante).
// Los nuevos (desde la última vez) salen resaltados; al entrar se dan por vistos.
export default function AvisosScreen({ me, onSeen, onGoEventos, onBack }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api.listAvisos(me).then(
      async (d) => {
        if (!alive) return
        setData(d) // se pinta con los "nuevos" de antes de marcarlos como vistos
        if (d.nuevos) {
          try {
            const vistos = await api.marcarAvisosVistos(me.id)
            if (vistos) onSeen(vistos)
          } catch {
            /* si falla, se volverá a avisar la próxima vez */
          }
        }
      },
      (err) => alive && setError(err.message),
    )
    return () => { alive = false }
    // Solo al entrar en la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="screen">
      <ScreenTitle title="Avisos" onBack={onBack} />
      <p className="small muted avisos-intro">Aquí salen los eventos y reservas que crean los demás socios. Toca uno para ir a Eventos y apuntarte.</p>

      {error ? (
        <div className="empty">No se han podido cargar los avisos.</div>
      ) : !data ? (
        <div className="empty">Cargando…</div>
      ) : data.list.length ? (
        <ul className="avisos">
          {data.list.map((e) => {
            const Icon = KIND_ICON[e.tipo]
            return (
              <li key={e.id}>
                <button type="button" className={`aviso${e.nuevo ? ' is-new' : ''}`} onClick={onGoEventos}>
                  <span className={`event-icon small ${e.tipo}`}><Icon size={20} /></span>
                  <span className="aviso-text">
                    <strong>{esReserva(e) ? `Día reservado por ${e.titulo}` : `${e.organizador} ha creado ${KIND_LABEL[e.tipo].toLowerCase()}: ${e.titulo}`}</strong>
                    <span className="small muted">{shortDate(e.fecha)} · {horaText(e)}</span>
                  </span>
                  {e.nuevo ? <span className="aviso-new">Nuevo</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="empty">No hay avisos. Cuando otro socio cree un evento, te saldrá aquí.</div>
      )}
    </section>
  )
}
