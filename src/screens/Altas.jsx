import { useCallback, useEffect, useState } from 'react'
import * as api from '../api.js'
import ScreenTitle from '../components/ScreenTitle.jsx'
import BajaSheet from '../components/BajaSheet.jsx'
import { InviteRow, InviteSheet, useInvitaciones } from '../components/Invitaciones.jsx'

// Altas de socios (solo administradores): invitar a un socio, aceptar o rechazar las solicitudes
// que llegan desde los enlaces de invitación, y ver el historial de todas las invitaciones.
export default function Altas({ me, onBack }) {
  const { list, error, busyId, load, run } = useInvitaciones()
  // Socio de cada invitación aceptada, para poder darle de baja tocándola.
  const [socioDe, setSocioDe] = useState({}) // invitacion_id → socio
  const [elegido, setElegido] = useState(null)
  const closeBaja = useCallback(() => setElegido(null), [])
  const loadSocios = useCallback(async () => {
    try {
      const [mapa, socios] = await Promise.all([api.sociosDeInvitaciones(), api.listSocios()])
      setSocioDe(Object.fromEntries(Object.entries(mapa).map(([inv, id]) => [inv, socios.find((s) => s.id === id)]).filter(([, s]) => s)))
    } catch {
      setSocioDe({}) // si aún no existe la función en Supabase, simplemente no se pueden tocar
    }
  }, [])
  useEffect(() => { loadSocios() }, [loadSocios])
  const [inviting, setInviting] = useState(false)
  const closeInvite = useCallback(() => { setInviting(false); load() }, [load])
  const pendientes = (list || []).filter((i) => i.estado === 'solicitada')
  const resto = (list || []).filter((i) => i.estado !== 'solicitada')

  return (
    <section className="screen">
      <ScreenTitle title="Altas de socios" onBack={onBack} />

      <button type="button" className="btn primary block" onClick={() => setInviting(true)}>Invitación socio</button>

      {error ? (
        <div className="empty">
          <p>{error}</p>
          <button type="button" className="btn secondary" onClick={load}>Reintentar</button>
        </div>
      ) : !list ? (
        <div className="empty">Cargando…</div>
      ) : (
        <>
          <h2 className="section-title">Pendientes de aceptar</h2>
          {pendientes.length ? (
            <div className="card data-list">
              {pendientes.map((i) => (
                <div key={i.id} className="invite-row">
                  <div className="data-field">
                    <span className="data-value">{i.nombre_solicitud || i.nombre}</span>
                    <span className="small muted">{i.email}</span>
                    <span className="small muted">Invitado por {i.invita?.nombre}</span>
                  </div>
                  <div className="invite-actions">
                    <button type="button" className="btn primary small-btn" disabled={busyId === i.id} onClick={() => run(i.id, () => api.resolverInvitacion(i.id, 'aceptar'))}>Aceptar</button>
                    <button type="button" className="btn secondary small-btn" disabled={busyId === i.id} onClick={() => run(i.id, () => api.resolverInvitacion(i.id, 'rechazar'))}>Rechazar</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No hay solicitudes pendientes.</div>
          )}
          <p className="small muted">Al aceptar, al nuevo socio le llega un correo para poner su contraseña y entrar.</p>

          <h2 className="section-title">Todas las invitaciones</h2>
          {resto.length ? (
            <div className="card data-list">
              {resto.map((i) => (
                <InviteRow
                  key={i.id}
                  inv={i}
                  me={me}
                  showWho
                  busy={busyId === i.id}
                  onRemove={() => run(i.id, () => api.deleteInvitacion(i.id))}
                  socio={socioDe[i.id]}
                  onPick={socioDe[i.id] && socioDe[i.id].id !== me.id ? () => setElegido(socioDe[i.id]) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="empty">Todavía no se ha mandado ninguna invitación.</div>
          )}
          {Object.keys(socioDe).length ? <p className="small muted">Toca una invitación aceptada para hacer administrador o dar de baja a ese socio.</p> : null}
        </>
      )}

      {inviting ? <InviteSheet me={me} onClose={closeInvite} /> : null}
      {elegido ? <BajaSheet socio={elegido} onClose={closeBaja} onDone={() => { setElegido(null); loadSocios() }} /> : null}
    </section>
  )
}


