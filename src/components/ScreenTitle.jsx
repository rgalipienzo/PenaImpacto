import { Chevron } from './Icons.jsx'

// Título de pestaña con la flecha para volver a la pantalla principal.
export default function ScreenTitle({ title, onBack }) {
  return (
    <div className="screen-title-row">
      <button type="button" className="back-btn" aria-label="Volver a la pantalla principal" onClick={onBack}>
        <Chevron size={24} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <h1 className="screen-title">{title}</h1>
    </div>
  )
}
