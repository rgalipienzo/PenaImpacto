import { useEffect, useState } from 'react'
import * as api from '../api.js'

// Lo que ve quien abre el enlace de invitación: pide el alta con su nombre y su email.
export default function SolicitudAlta({ token }) {
  const [inv, setInv] = useState(undefined) // undefined = cargando, null = no existe
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    api.verInvitacion(token).then(
      (data) => {
        setInv(data)
        if (data?.nombre) setNombre(data.nombre)
      },
      () => setInv(null),
    )
  }, [token])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.solicitarAlta(token, nombre.trim(), email.trim())
      setSent(true)
    } catch (err) {
      setError(/no válidos/i.test(err.message) ? 'Revisa el nombre y el email.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  function goLogin() {
    window.location.href = '/'
  }

  let body
  if (inv === undefined) {
    body = <p className="muted center-text">Cargando…</p>
  } else if (!inv || inv.estado === 'rechazada') {
    body = (
      <>
        <h1>Enlace no válido</h1>
        <p className="muted center-text">Esta invitación no existe o ya no está activa. Pide a un socio que te mande otra.</p>
      </>
    )
  } else if (inv.estado === 'aceptada') {
    body = (
      <>
        <h1>Ya tienes el alta</h1>
        <p className="muted center-text">Mira tu correo: tienes un mensaje para poner tu contraseña. Después, entra con tu email.</p>
        <button type="button" className="btn primary block" onClick={goLogin}>Ir a entrar</button>
      </>
    )
  } else if (sent || inv.estado === 'solicitada') {
    body = (
      <>
        <h1>Solicitud enviada</h1>
        <p className="muted center-text">
          Un administrador del txoko tiene que aceptarla. Cuando lo haga, te llegará un correo para poner tu contraseña y entrar.
        </p>
      </>
    )
  } else {
    body = (
      <>
        <h1>¡Bienvenido a la Peña Impacto!</h1>
        <p className="muted center-text"><strong>{inv.invita}</strong> te ha invitado a Peña Impacto. Pide tu alta:</p>
        <div className="field">
          <label className="label" htmlFor="sol-nombre">Tu nombre</label>
          <input id="sol-nombre" className="input" type="text" required maxLength={40} autoComplete="given-name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="sol-email">Tu email</label>
          <input id="sol-email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn primary block" disabled={busy}>{busy ? 'Enviando…' : 'Pedir el alta'}</button>
        <p className="small muted center-text">Con ese email entrarás en la app.</p>
      </>
    )
  }

  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <img src="/icon-512.png" alt="Peña Impacto" width="120" height="120" className="login-logo" />
        {body}
        <button type="button" className="btn link-btn block" onClick={goLogin}>Ya tengo cuenta: entrar</button>
      </form>
    </div>
  )
}
