import { useCallback, useEffect, useState } from 'react'
import * as api from '../api.js'
import Sheet from './Sheet.jsx'
import { KIND_ICON, Minus, Plus } from './Icons.jsx'
import Consumiciones from './Consumiciones.jsx'
import CorregirApuntados from './CorregirApuntados.jsx'
import GastosComida from './GastosComida.jsx'
import { KIND_LABEL, esReserva, euros, genteText, haEmpezado, horaText, joinClosed, longDate, plural, totalText } from '../lib.js'
import { confirmar } from './confirmar.jsx'

// allowDelete: Modificar y Borrar evento solo se ofrecen desde el Calendario, y solo a quien lo creó.
// withDeadline: desde Eventos, apuntarse y desapuntarse se cierra a la hora de comienzo
// (salvo que el organizador lo vuelva a abrir: onReabrir).
// allowJoin: apuntarse, desapuntarse y cambiar acompañantes (solo desde Eventos).
// allowExpenses: mis consumiciones y los gastos de la comida (solo desde la pantalla principal).
export default function EventDetail({ event, me, allowDelete, withDeadline, allowJoin, allowExpenses, showExpensesNote, onClose, onJoin, onLeave, onEdit, onDelete, onReabrir, onCorregido }) {
  const [adultos, setAdultos] = useState(event.misComensales || 1)
  const [ninos, setNinos] = useState(event.misNinos || 0)
  const [amigos, setAmigos] = useState(event.misAmigos || 0)
  const [amigosNinos, setAmigosNinos] = useState(event.misAmigosNinos || 0)
  const [cuotaInv, setCuotaInv] = useState(null) // { adulto, nino, famAdulto, famNino }: cuota de cada invitado
  useEffect(() => { api.getCuotasInvitado().then(setCuotaInv, () => {}) }, [])
  const cambiado = adultos !== event.misComensales || ninos !== event.misNinos || amigos !== (event.misAmigos || 0) || amigosNinos !== (event.misAmigosNinos || 0)
  const voy = event.misComensales > 0
  // Lista y total tal y como quedarían con los contadores actuales (antes de guardar).
  const lista = voy
    ? event.apuntados.map((a) => (a.id === me.id ? { ...a, comensales: adultos, ninos, amigos, amigos_ninos: amigosNinos } : a))
    : event.apuntados
  const total = lista.reduce((n, a) => n + a.comensales + a.ninos + (a.amigos || 0) + (a.amigos_ninos || 0), 0) + (voy ? 0 : adultos + ninos + amigos + amigosNinos)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [consumo, setConsumo] = useState({ total: 0, items: [] }) // mis consumiciones, para la cuenta
  const onConsumo = useCallback((total, items) => setConsumo({ total, items }), [])
  const Icon = KIND_ICON[event.tipo]
  // Modificar y borrar (desde el Calendario): quien lo creó o un administrador.
  const mando = event.organizadorId === me.id || me.es_admin // puede hacer lo que haría el organizador
  const puedeModificar = allowDelete && mando
  const puedeBorrar = allowDelete && mando
  const [corrigiendo, setCorrigiendo] = useState(false)
  const cerrado = allowJoin && withDeadline && joinClosed(event)
  // Consumiciones y gastos: desde "Mis eventos de este día" de la pantalla principal; desde "próximos" solo se ven.
  const gastosAbiertos = allowExpenses
  // Quien crea el evento siempre cuenta como mínimo 1 adulto: no se puede desapuntar.
  const esOrganizador = event.organizadorId === me.id

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

  async function borrar() {
    if (await confirmar(`¿Borrar «${event.titulo}»? Se quitará para todos los socios.`, { si: 'Borrar' })) run(onDelete)
  }

  return (
    <Sheet title={esReserva(event) ? 'Día reservado' : event.titulo} onClose={onClose}>
      <div className="detail-top">
        <span className={`event-icon ${event.tipo}`}><Icon size={26} /></span>
        <div>
          <div className="event-meta"><span className={`event-kind ${event.tipo}`}>{KIND_LABEL[event.tipo]}</span> · {horaText(event)}</div>
          <div className="detail-date">{longDate(event.fecha)}</div>
          <div className="event-sub">{esReserva(event) ? `Reservado por ${event.titulo}` : `Organiza ${event.organizador}`}</div>
        </div>
      </div>

      {event.notas ? <p className="notes">{event.notas}</p> : null}

      {event.compra.length ? (
        <section className="detail-block">
          <h3>Lista de la compra</h3>
          <ul className="shopping">
            {event.compra.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </section>
      ) : null}

      {esReserva(event) ? (
        <p className="closed-note reserva-note">🔒 Día reservado por {event.titulo}. Ese día el txoko no está disponible para otros eventos.</p>
      ) : (
      <>
      <section className="detail-block">
        <h3 aria-live="polite">
          {!allowJoin
            ? `Van ${totalText(sumar(lista)).replace(' · ', ' y ')}`
            : voy ? `Van ${plural(total, 'persona', 'personas')}` : `Van ${plural(event.personas, 'persona', 'personas')}`}
          {voy && cambiado ? <span className="unsaved"> · sin guardar</span> : null}
        </h3>
        {!voy ? <p className="small muted">Contigo seríais {plural(total, 'persona', 'personas')}.</p> : null}
        {lista.length ? (
          <ul className="people">
            {lista.map((a) => (
              <li key={a.id}>
                <span>{a.nombre}{a.id === me.id ? ' (tú)' : ''}</span>
                {/* En Eventos (para apuntarse) se distingue familia y amigos; en el resto, solo el total. */}
                <span className="muted">{allowJoin ? genteText(a) : totalText(a)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Todavía no se ha apuntado nadie.</p>
        )}
      </section>

      {!allowJoin ? (
        <p className="small muted center-text">{allowExpenses || showExpensesNote ? 'Para cambiar tus acompañantes, ve a la pestaña Eventos.' : 'Para apuntarte o cambiar tus acompañantes, ve a la pestaña Eventos.'}</p>
      ) : cerrado ? (
        <p className="closed-note">
          Ya no te puedes apuntar ni desapuntar: se cierra a la hora de comienzo.
          {mando ? ' Si hace falta, puedes volver a abrirlo desde el Calendario.' : ` Si hace falta, ${event.organizador} lo puede volver a abrir.`}
        </p>
      ) : (
      <>
      {event.reabierto && haEmpezado(event) ? (
        <p className="reabierto-note">{esOrganizador ? 'Lo has vuelto a abrir: todavía se puede apuntar la gente.' : `${event.organizador} lo ha vuelto a abrir: todavía te puedes apuntar.`}</p>
      ) : withDeadline ? (
        <p className="hasta-note">Puedes apuntarte o desapuntarte hasta la hora del evento.</p>
      ) : null}
      <section className="detail-block">
        <h3 className="counter-title">{voy ? 'Acompañantes' : '¿Cuántos vais?'}</h3>
        <p className="counter-group">Familia <span>· {cuotaInv?.famAdulto || cuotaInv?.famNino ? 'paga cuota de familiar' : 'no paga cuota de invitado'}</span></p>
        <Counter id="adultos" label="Adultos" hint={cuotaInv?.famAdulto ? `Contándote a ti · los demás, ${euros(cuotaInv.famAdulto)} cada uno` : 'Contándote a ti'} value={adultos} min={1} onChange={setAdultos} />
        <Counter id="ninos" label="Niños" hint={cuotaInv?.famNino ? `De 0 a 14 años · ${euros(cuotaInv.famNino)} cada uno` : 'De 0 a 14 años'} value={ninos} min={0} onChange={setNinos} />
        <p className="counter-group">Amigos invitados <span>· pagan cuota de invitado</span></p>
        <Counter id="amigos" label="Adultos" hint={cuotaInv ? `${euros(cuotaInv.adulto)} cada uno` : null} value={amigos} min={0} onChange={setAmigos} />
        <Counter id="amigos-ninos" label="Niños" hint={cuotaInv ? `De 0 a 14 años · ${euros(cuotaInv.nino)} cada uno` : 'De 0 a 14 años'} value={amigosNinos} min={0} onChange={setAmigosNinos} />
      </section>
      </>
      )}

      {gastosAbiertos ? <Consumiciones eventoId={event.id} meId={me.id} onTotal={onConsumo} /> : null}
      {gastosAbiertos ? <GastosComida event={event} me={me} voy={voy} consumo={consumo.total} consumos={consumo.items} /> : null}
      {showExpensesNote ? (
        <p className="closed-note">Para apuntar tus consumiciones y los gastos de comida, podrás hacerlo el día del evento.</p>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      </>
      )}

      <div className="actions">
        {!allowJoin || cerrado || esReserva(event) ? null : voy ? (
          <>
            {cambiado ? (
              <button type="button" className="btn primary block" disabled={busy} onClick={() => run(() => onJoin(adultos, ninos, amigos, amigosNinos))}>Guardar comensales</button>
            ) : null}
            {esOrganizador ? (
              <p className="small muted center-text">Como organizador cuentas siempre como mínimo 1 adulto.</p>
            ) : (
              <button type="button" className="btn secondary block" disabled={busy} onClick={() => run(onLeave)}>Desapuntarme</button>
            )}
          </>
        ) : (
          <button type="button" className="btn primary block" disabled={busy} onClick={() => run(() => onJoin(adultos, ninos, amigos, amigosNinos))}>Me apunto</button>
        )}
        {allowDelete && me.es_admin && onCorregido && !esReserva(event) ? (
          <button type="button" className="btn secondary block" disabled={busy} onClick={() => setCorrigiendo(true)}>Corregir apuntados</button>
        ) : null}
        {allowDelete && mando && onReabrir && !esReserva(event) && haEmpezado(event) ? (
          event.reabierto ? (
            <button type="button" className="btn secondary block" disabled={busy} onClick={() => run(() => onReabrir(false))}>Cerrar para apuntarse</button>
          ) : (
            <button type="button" className="btn secondary block" disabled={busy} onClick={() => run(() => onReabrir(true))}>Volver a abrir para apuntarse</button>
          )
        ) : null}
        {puedeModificar ? <button type="button" className="btn secondary block" disabled={busy} onClick={onEdit}>Modificar evento</button> : null}
        {puedeBorrar ? <button type="button" className="btn danger block" disabled={busy} onClick={borrar}>Borrar evento</button> : null}
      </div>
      {corrigiendo ? <CorregirApuntados event={event} onClose={() => setCorrigiendo(false)} onChanged={onCorregido} /> : null}
    </Sheet>
  )
}

// Fila con nombre y botones − / +
function Counter({ id, label, hint, value, min, onChange }) {
  return (
    <div className="counter" role="group" aria-labelledby={`${id}-label`}>
      <span className="counter-label" id={`${id}-label`}>
        {label}
        {hint ? <span className="counter-hint">{hint}</span> : null}
      </span>
      <div className="stepper">
        <button type="button" className="icon-btn" aria-label={`${label}: uno menos`} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus size={20} /></button>
        <output aria-live="polite">{value}</output>
        <button type="button" className="icon-btn" aria-label={`${label}: uno más`} disabled={value >= 50} onClick={() => onChange(value + 1)}><Plus size={20} /></button>
      </div>
    </div>
  )
}

// Suma los adultos y niños (familia y amigos) de todos los apuntados.
function sumar(lista) {
  return lista.reduce(
    (t, a) => ({ comensales: t.comensales + (a.comensales || 0) + (a.amigos || 0), ninos: t.ninos + (a.ninos || 0) + (a.amigos_ninos || 0) }),
    { comensales: 0, ninos: 0 },
  )
}
