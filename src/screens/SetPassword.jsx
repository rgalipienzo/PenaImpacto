import { useState } from 'react'
import { setPassword } from '../api.js'

// Se muestra al entrar desde el correo de invitación o de "he olvidado mi contraseña".
export default function SetPassword({ invite, onDone }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (pw.length < 8) return setError('La contraseña tiene que tener al menos 8 caracteres.')
    if (pw !== pw2) return setError('Las dos contraseñas no coinciden.')
    setBusy(true)
    setError('')
    try {
      await setPassword(pw)
      onDone()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <img src="/icon-512.png" alt="Peña Impacto" width="120" height="120" className="login-logo" />
        <h1>{invite ? '¡Bienvenido a la Peña Impacto!' : 'Nueva contraseña'}</h1>
        <p className="muted center-text">{invite ? 'Elige una contraseña para entrar a partir de ahora.' : 'Escribe tu nueva contraseña.'}</p>
        <div className="field">
          <label className="label" htmlFor="pw">Contraseña</label>
          <input id="pw" className="input" type="password" autoComplete="new-password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="pw2">Repite la contraseña</label>
          <input id="pw2" className="input" type="password" autoComplete="new-password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary block" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar y entrar'}</button>
      </form>
    </div>
  )
}
