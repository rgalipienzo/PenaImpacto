import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from './api.js'
import { DEMO } from './config.js'
import { startRealtime, useCambios } from './realtime.js'
import { addMonths, monthEnd, monthStart } from './lib.js'
import { Avatar, Menu } from './components/Icons.jsx'
import Nav from './components/Nav.jsx'
import Drawer from './components/Drawer.jsx'
import Avisos from './components/Avisos.jsx'
import AvisosScreen from './screens/AvisosScreen.jsx'
import AvisarGrupo from './components/AvisarGrupo.jsx'
import EventDetail from './components/EventDetail.jsx'
import EventForm from './components/EventForm.jsx'
import Login from './screens/Login.jsx'
import SolicitudAlta from './screens/SolicitudAlta.jsx'
import Inicio from './screens/Inicio.jsx'
import Eventos from './screens/Eventos.jsx'
import Calendario from './screens/Calendario.jsx'
import Estatutos from './screens/Estatutos.jsx'
import Compras from './screens/Compras.jsx'
import Pagos from './screens/Pagos.jsx'
import Cuenta from './screens/Cuenta.jsx'
import Altas from './screens/Altas.jsx'
import Votaciones from './screens/Votaciones.jsx'
import SetPassword from './screens/SetPassword.jsx'

const DAYS_AHEAD = 30

export default function App() {
  const [session, setSession] = useState(undefined)
  const [me, setMe] = useState(null)
  const [meError, setMeError] = useState('')
  const [tab, setTab] = useState('inicio')
  const [menuOpen, setMenuOpen] = useState(false)
  const [today, setToday] = useState(api.dateKey)
  const [events, setEvents] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [openFrom, setOpenFrom] = useState(null) // pestaña desde la que se abrió el evento
  const [creating, setCreating] = useState(null) // null o la fecha con la que empieza el formulario
  const [desdeVotacion, setDesdeVotacion] = useState(null) // { tipo, titulo, votacionId } si se crea desde una votación
  const [editing, setEditing] = useState(null) // evento que se está modificando
  const [creado, setCreado] = useState(null) // evento recién creado, para avisar al grupo
  const [month, setMonth] = useState(() => monthStart(api.dateKey()))
  const [selected, setSelected] = useState(api.dateKey)
  const [monthEvents, setMonthEvents] = useState([])
  const [monthLoaded, setMonthLoaded] = useState(false)
  const [monthError, setMonthError] = useState('')
  const monthReq = useRef(0)
  const [homeDay, setHomeDay] = useState(api.dateKey)
  const [pastEvents, setPastEvents] = useState({ day: null, list: [], error: '' }) // días fuera de lo ya cargado
  const pastReq = useRef(0)
  const [mustSetPassword, setMustSetPassword] = useState(api.LINK_TYPE)
  const [deBaja, setDeBaja] = useState(false)

  // Sesión
  useEffect(() => {
    api.getSession().then(setSession)
    return api.onAuthChange(setSession, () => setMustSetPassword('recovery'))
  }, [])

  const userId = session?.user?.id

  // Ficha del socio
  useEffect(() => {
    if (!userId) { setMe(null); return }
    api.getMe(userId).then(
      async (m) => {
        // Si un administrador le ha dado de baja, se le saca de la app.
        if (m?.baja) {
          setDeBaja(true)
          await api.signOut()
          return
        }
        setMe(m)
      },
      (err) => setMeError(err.message),
    )
  }, [userId])

  // Eventos de hoy y de los próximos días
  const reload = useCallback(async () => {
    if (!userId) return
    const key = api.dateKey()
    setToday(key)
    try {
      setEvents(await api.listEvents(key, api.addDays(key, DAYS_AHEAD), userId))
      setLoadError('')
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoaded(true)
    }
  }, [userId])

  // Eventos del mes que se ve en el calendario
  const reloadMonth = useCallback(async () => {
    if (!userId) return
    const req = ++monthReq.current
    try {
      const list = await api.listEvents(month, monthEnd(month), userId)
      if (req !== monthReq.current) return // ya se ha cambiado de mes
      setMonthEvents(list)
      setMonthError('')
    } catch (err) {
      if (req === monthReq.current) setMonthError(err.message)
    } finally {
      if (req === monthReq.current) setMonthLoaded(true)
    }
  }, [userId, month])

  // En la pantalla principal: si el día elegido no está entre hoy y los próximos días, se pide aparte.
  const inRange = homeDay >= today && homeDay <= api.addDays(today, DAYS_AHEAD)
  const reloadPast = useCallback(async () => {
    if (!userId || inRange) return
    const req = ++pastReq.current
    try {
      const list = await api.listEvents(homeDay, homeDay, userId)
      if (req === pastReq.current) setPastEvents({ day: homeDay, list, error: '' })
    } catch (err) {
      if (req === pastReq.current) setPastEvents({ day: homeDay, list: [], error: err.message })
    }
  }, [userId, homeDay, inRange])

  useEffect(() => { reloadPast() }, [reloadPast])

  const reloadAll = useCallback(() => Promise.all([reload(), reloadMonth(), reloadPast()]), [reload, reloadMonth, reloadPast])

  useEffect(() => { reload() }, [reload])
  useEffect(() => { if (tab === 'calendario') reloadMonth() }, [tab, reloadMonth])

  function changeMonth(n) {
    const next = addMonths(month, n)
    setMonth(next)
    setMonthLoaded(false)
    setSelected(next === monthStart(today) ? today : next)
  }

  // Tiempo real: si otro socio cambia algo, se vuelve a cargar.
  useEffect(() => (userId && !DEMO ? startRealtime() : undefined), [userId])
  const cambios = useCambios()
  useEffect(() => {
    if (cambios) reloadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cambios])

  // Al volver a la app (por ejemplo, al día siguiente), refresca.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') reloadAll() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reloadAll])

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const onAvisosSeen = useCallback((vistos) => setMe((m) => ({ ...m, avisos_vistos_at: vistos })), [])
  const closeDetail = useCallback(() => setOpenId(null), [])
  const closeForm = useCallback(() => { setCreating(null); setDesdeVotacion(null) }, [])

  const home = () => go('inicio')

  function go(t) {
    setTab(t)
    setMenuOpen(false)
    window.scrollTo(0, 0)
  }

  async function signOut() {
    setMenuOpen(false)
    await api.signOut()
    setTab('inicio')
    setEvents([])
    setLoaded(false)
  }

  if (session === undefined) return <div className="splash" aria-label="Cargando" />
  if (!session) return api.INVITE_TOKEN && !DEMO ? <SolicitudAlta token={api.INVITE_TOKEN} /> : <Login aviso={deBaja ? 'Tu cuenta está dada de baja. Si crees que es un error, habla con un administrador del txoko.' : ''} />
  if (mustSetPassword) return <SetPassword invite={mustSetPassword === 'invite'} onDone={() => setMustSetPassword(null)} />
  if (meError) return <div className="splash"><p className="error">No se ha podido cargar tu ficha de socio: {meError}</p></div>
  if (!me) return <div className="splash" aria-label="Cargando" />

  // Días reservados (para avisar al crear un evento): { fecha: 'Nombre' }
  const reservasMap = Object.fromEntries(
    [...events, ...monthEvents].filter((e) => e.tipo === 'reserva').map((e) => [e.fecha, e.titulo]),
  )
  const opened = [events, monthEvents, pastEvents.list].map((l) => l.find((e) => e.id === openId)).find(Boolean)

  return (
    <div className={`app${tab === 'inicio' ? ' is-home' : ''}`}>
      {DEMO ? <div className="demo-bar" role="status">Modo demo: datos de ejemplo, no se guardan.</div> : null}

      {/* La cabecera con el socio solo se ve en la pantalla principal; el resto de pestañas ocupan toda la pantalla. */}
      {tab === 'inicio' ? (
        <header className="topbar">
          <div className="user">
            <Avatar src={me.foto_url} />
            <div className="user-text">
              <span className="user-role">{me.es_admin ? 'Socio · Admin' : 'Socio'}</span>
              <span className="user-name">{me.nombre}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <Avisos me={me} refreshKey={events} onOpen={() => go('avisos')} />
            <button type="button" className="icon-btn" aria-label="Abrir menú" aria-controls="drawer" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <Menu size={24} />
            </button>
          </div>
        </header>
      ) : null}

      <main className={`content${tab === 'inicio' ? '' : ' no-topbar'}`}>
        {tab === 'inicio' ? (
          <Inicio
            meId={userId}
            today={today}
            day={homeDay}
            dayEvents={inRange ? events.filter((e) => e.fecha === homeDay) : pastEvents.day === homeDay ? pastEvents.list : []}
            events={events}
            loaded={inRange ? loaded : pastEvents.day === homeDay}
            error={inRange ? loadError : pastEvents.day === homeDay ? pastEvents.error : ''}
            onDay={(n) => setHomeDay((d) => api.addDays(d, n))}
            onToday={() => setHomeDay(today)}
            onOpen={(e, desde) => { setOpenFrom(desde === 'dia' ? 'inicio-dia' : 'inicio'); setOpenId(e.id) }}
            onSeeAll={() => go('eventos')}
            onVotaciones={() => go('votaciones')}
            onRetry={reloadAll}
          />
        ) : tab === 'eventos' ? (
          <Eventos
            meId={userId}
            today={today}
            events={events}
            loaded={loaded}
            error={loadError}
            onJoin={(e) => { setOpenFrom('eventos'); setOpenId(e.id) }}
            onRetry={reload}
            onBack={home}
          />
        ) : tab === 'calendario' ? (
          <Calendario
            month={month}
            today={today}
            selected={selected}
            events={monthEvents}
            loaded={monthLoaded}
            error={monthError}
            onMonth={changeMonth}
            onSelect={setSelected}
            onOpen={(e) => { setOpenFrom('calendario'); setOpenId(e.id) }}
            onNew={(fecha) => setCreating(fecha)}
            onRetry={reloadMonth}
            onVotaciones={() => go('votaciones')}
            onBack={home}
          />
        ) : tab === 'votaciones' ? (
          <Votaciones
            me={me}
            today={today}
            onBack={() => go('calendario')}
            onCrearEvento={({ fecha, ...rest }) => { setDesdeVotacion(rest); setCreating(fecha) }}
          />
        ) : tab === 'compras' ? (
          <Compras me={me} today={today} onBack={home} />
        ) : tab === 'cuenta' ? (
          <Cuenta
            me={me}
            email={DEMO ? '' : session.user.email}
            onSaveProfile={async (fields) => {
              await api.updateMyProfile(userId, fields)
              setMe((m) => ({ ...m, ...fields }))
              if (fields.nombre) reloadAll()
            }}
            onSaveEmail={api.updateEmail}
            onSaveFoto={async (file) => {
              const foto_url = await api.uploadFoto(userId, file)
              setMe((m) => ({ ...m, foto_url }))
            }}
            onRemoveFoto={async () => {
              await api.removeFoto(userId)
              setMe((m) => ({ ...m, foto_url: null }))
            }}
            onSavePassword={api.setPassword}
            onBack={home}
          />
        ) : tab === 'altas' && me.es_admin ? (
          <Altas me={me} onBack={home} />
        ) : tab === 'avisos' ? (
          <AvisosScreen me={me} onSeen={onAvisosSeen} onGoEventos={() => go('eventos')} onBack={home} />
        ) : tab === 'pagos' ? (
          <Pagos me={me} onBack={home} />
        ) : (
          <Estatutos me={me} onBack={home} />
        )}
      </main>

      <Nav tab={tab} onChange={go} />
      <Drawer
        open={menuOpen}
        onClose={closeMenu}
        isAdmin={me.es_admin}
        onAccount={() => go('cuenta')}
        onAltas={() => go('altas')}
        onSignOut={signOut}
      />

      {opened ? (
        <EventDetail
          key={`${opened.id}-${opened.reabierto}-${opened.misComensales}-${opened.misNinos}-${opened.misAmigos}-${opened.misAmigosNinos}`}
          event={opened}
          me={me}
          allowDelete={openFrom === 'calendario'}
          withDeadline={openFrom !== 'calendario'}
          allowJoin={openFrom === 'eventos'}
          allowExpenses={openFrom === 'inicio-dia'}
          showExpensesNote={openFrom === 'inicio'}
          onClose={closeDetail}
          onJoin={async (adultos, ninos, amigos, amigosNinos) => { await api.join(opened.id, userId, adultos, ninos, amigos, amigosNinos); await reloadAll() }}
          onLeave={async () => { await api.leave(opened.id, userId); await reloadAll() }}
          onCorregido={reloadAll}
          onReabrir={async (v) => { await api.setReabierto(opened.id, v); await reloadAll() }}
          onEdit={() => { setEditing(opened); setOpenId(null) }}
          onDelete={async () => { await api.deleteEvent(opened.id); setOpenId(null); await reloadAll() }}
        />
      ) : null}

      {creating ? (
        <EventForm
          initialDate={creating}
          initialTipo={desdeVotacion?.tipo}
          initialTitulo={desdeVotacion?.titulo}
          meNombre={me.nombre}
          reservas={reservasMap}
          onClose={closeForm}
          onSave={async (fields) => {
            await api.createEvent(fields, userId)
            // Si viene de una votación, la votación queda cerrada.
            if (desdeVotacion) await api.setVotacionCerrada(desdeVotacion.votacionId, true).catch(() => {})
            closeForm()
            setCreado(fields)
            await reloadAll()
          }}
        />
      ) : null}

      {creado ? <AvisarGrupo evento={creado} onClose={() => setCreado(null)} /> : null}

      {editing ? (
        <EventForm
          event={editing}
          meNombre={me.nombre}
          reservas={reservasMap}
          onClose={() => setEditing(null)}
          onSave={async (fields) => { await api.updateEvent(editing, fields); setEditing(null); await reloadAll() }}
        />
      ) : null}
    </div>
  )
}
