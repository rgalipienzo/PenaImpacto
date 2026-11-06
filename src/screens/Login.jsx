import { useEffect, useState } from 'react'
import { OAUTH_ERROR, getProveedores, sendReset, signIn, signInWith } from '../api.js'

// Solo entrar: las cuentas se crean invitando a cada socio (Menú → Altas de socios).
// Se puede entrar con email y contraseña, o con Google / Microsoft si el email es el mismo.
export default function Login({ aviso = '' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => (OAUTH_ERROR ? traducir(OAUTH_ERROR) : ''))

  // Los botones de Google y Microsoft solo salen si están activados en Supabase.
  const [prov, setProv] = useState({})
  useEffect(() => { getProveedores().then(setProv) }, [])

  // Quita el error de la dirección para que no vuelva a salir al recargar.
  useEffect(() => {
    if (OAUTH_ERROR) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  async function conProveedor(provider) {
    setError('')
    try {
      await signInWith(provider)
    } catch (err) {
      setError(traducir(err.message))
    }
  }
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
        {prov.google || prov.azure ? <div className="login-or"><span>o entra con</span></div> : null}
        {prov.google ? (
          <button type="button" className="btn secondary block oauth-btn" onClick={() => conProveedor('google')}>
            <GoogleLogo /> Google
          </button>
        ) : null}
        {prov.azure ? (
          <button type="button" className="btn secondary block oauth-btn" onClick={() => conProveedor('azure')}>
            <MicrosoftLogo /> Microsoft (Hotmail, Outlook)
          </button>
        ) : null}
        <p className="small muted center-text">El acceso es solo para socios invitados.</p>
      </form>
    </div>
  )
}

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.1z" />
    <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
)

const MicrosoftLogo = () => (
  <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
)

function traducir(msg) {
  if (/database error saving new user|sin invitaci/i.test(msg)) return 'Esa cuenta no tiene invitación. Entra con la cuenta del email con el que te invitaron, o pide una invitación a un socio.'
  if (/provider is not enabled|unsupported provider/i.test(msg)) return 'Esta forma de entrar todavía no está activada. Entra con tu email y contraseña.'
  if (/access_denied|cancel/i.test(msg)) return 'Has cancelado la entrada.'
  if (/invalid login/i.test(msg)) return 'Email o contraseña incorrectos.'
  if (/banned/i.test(msg)) return 'Tu cuenta está dada de baja. Habla con un administrador del txoko.'
  if (/not confirmed/i.test(msg)) return 'Tienes que confirmar tu email primero (mira tu correo).'
  if (/signups not allowed|signup is disabled/i.test(msg)) return 'Esta cuenta no tiene acceso.'
  return msg
}
