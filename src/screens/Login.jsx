import { useState } from 'react'
import { sendReset, signIn } from '../api.js'

// Solo entrar: las cuentas se crean invitando a cada socio desde
// Supabase > Authentication > Users > Invite user.
export default function Login({ aviso = '' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function forgot() {
    if (!email) return setError('Escribe tu email y vuelve a pulsar.')
    setError('')
    try {
      await sendReset(email)
      setSent(true)
    } catch (err) {
      setError(traducir(err.message))
    }
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(email, password)
    } catch (err) {
      setError(traducir(err.message))
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <img src="/icon-512.png" alt="Peña Impacto" width="120" height="120" className="login-logo" />
        <h1>Entra en el txoko</h1>
        {aviso ? <p className="error center-text">{aviso}</p> : null}
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error ? <p className="error">{error}</p> : null}
        {sent ? <p className="ok" role="status">Te hemos enviado un correo para poner una contraseña nueva.</p> : null}
        <button className="btn primary block" type="submit" disabled={busy}>{busy ? 'Un momento…' : 'Entrar'}</button>
        <button type="button" className="btn danger block link-btn" onClick={forgot}>He olvidado mi contraseña</button>
        <p className="small muted center-text">El acceso es solo para socios invitados.</p>
      </form>
    </div>
  )
}

function traducir(msg) {
  if (/invalid login/i.test(msg)) return 'Email o contraseña incorrectos.'
  if (/banned/i.test(msg)) return 'Tu cuenta está dada de baja. Habla con un administrador del txoko.'
  if (/not confirmed/i.test(msg)) return 'Tienes que confirmar tu email primero (mira tu correo).'
  if (/signups not allowed|signup is disabled/i.test(msg)) return 'Esta cuenta no tiene acceso.'
  return msg
}
