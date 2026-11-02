import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Close } from './Icons.jsx'

// Panel que sube desde abajo, con fondo oscuro. Se cierra con Escape o tocando fuera.
// Se pinta directamente en <body> para quedar siempre por encima (aunque se abra desde la cabecera).
export default function Sheet({ title, onClose, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const prev = document.activeElement
    ref.current?.focus()
    // Escape solo cierra el panel de más arriba (puede haber uno abierto encima de otro).
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      const all = document.querySelectorAll('.sheet')
      if (all[all.length - 1] === ref.current) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      if (!document.querySelector('.sheet')) document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}>
            <Close size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
