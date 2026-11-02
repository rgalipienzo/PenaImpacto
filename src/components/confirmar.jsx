import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'

// Pregunta "¿Seguro?" con una ventana propia de la app.
// (La ventanita del navegador, window.confirm, no sale en algunos móviles con la app instalada.)
// Uso: if (!(await confirmar('¿Borrar…?'))) return
export function confirmar(mensaje, { si = 'Sí', no = 'No' } = {}) {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const done = (value) => {
      root.unmount()
      host.remove()
      resolve(value)
    }
    root.render(<Confirm mensaje={mensaje} si={si} no={no} onDone={done} />)
  })
}

function Confirm({ mensaje, si, no, onDone }) {
  const okRef = useRef(null)

  useEffect(() => {
    okRef.current?.focus()
    // Escape responde "No" sin cerrar el panel que haya debajo.
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onDone(false) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onDone])

  return (
    <div className="confirm-backdrop" onClick={() => onDone(false)}>
      <div className="confirm" role="alertdialog" aria-modal="true" aria-label={mensaje} onClick={(e) => e.stopPropagation()}>
        <p>{mensaje}</p>
        <div className="confirm-actions">
          <button type="button" className="btn secondary" onClick={() => onDone(false)}>{no}</button>
          <button type="button" className="btn primary" ref={okRef} onClick={() => onDone(true)}>{si}</button>
        </div>
      </div>
    </div>
  )
}
