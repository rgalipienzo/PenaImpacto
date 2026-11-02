import { useEffect, useState } from 'react'
import * as api from '../api.js'
import { Bell } from './Icons.jsx'

// Campana de la cabecera: el numerito son los eventos que han creado otros socios desde la última vez.
// Al tocarla se abre la pantalla de Avisos.
export default function Avisos({ me, refreshKey, onOpen }) {
  const [nuevos, setNuevos] = useState(0)

  useEffect(() => {
    api.listAvisos(me).then((d) => setNuevos(d.nuevos), () => setNuevos(0))
  }, [me, refreshKey])

  return (
    <button
      type="button"
      className="icon-btn bell-btn"
      aria-label={nuevos ? `Avisos: ${nuevos} nuevos` : 'Avisos'}
      onClick={onOpen}
    >
      <Bell size={22} />
      {nuevos ? <span className="bell-badge">{nuevos > 9 ? '9+' : nuevos}</span> : null}
    </button>
  )
}
