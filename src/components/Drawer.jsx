import { useEffect, useRef } from 'react'
import { Chevron, Close, Logout, User, UserPlus } from './Icons.jsx'

// Menú de las tres rayas: Cuenta, Altas de socios (solo administradores) y Cerrar sesión.
export default function Drawer({ open, onClose, isAdmin, onAccount, onAltas, onSignOut }) {
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {open ? <div className="drawer-backdrop" onClick={onClose} /> : null}
      <aside id="drawer" className={`drawer${open ? ' is-open' : ''}`} aria-label="Menú" aria-hidden={!open}>
        <div className="drawer-head">
          <strong>Menú</strong>
          <button type="button" className="icon-btn" ref={closeRef} aria-label="Cerrar menú" onClick={onClose}>
            <Close size={22} />
          </button>
        </div>

        <ul className="drawer-list">
          <li>
            <button type="button" onClick={onAccount}>
              <User size={22} />
              <span>Cuenta</span>
              <Chevron size={20} className="chevron" />
            </button>
          </li>
          {isAdmin ? (
            <li>
              <button type="button" onClick={onAltas}>
                <UserPlus size={22} />
                <span>Altas de socios</span>
                <Chevron size={20} className="chevron" />
              </button>
            </li>
          ) : null}
          <li>
            <button type="button" className="is-danger" onClick={onSignOut}>
              <Logout size={22} />
              <span>Cerrar sesión</span>
            </button>
          </li>
        </ul>
      </aside>
    </>
  )
}
