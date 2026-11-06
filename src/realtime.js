import { useEffect, useState } from 'react'
import { supabase } from './api.js'

// Tiempo real: cuando cualquier socio cambia algo, Supabase nos avisa y las pantallas
// abiertas vuelven a cargar sus datos. (Las tablas tienen que estar en la publicación
// "supabase_realtime": ver supabase/tiempo_real.sql.)
const TABLAS = ['eventos', 'apuntados', 'listas', 'lista_items', 'gastos_evento', 'consumiciones', 'pagos_evento', 'tarifas', 'ajustes']

let version = 0
const oyentes = new Set()

// Se llama una vez al entrar en la app. Devuelve la función para desconectarse.
export function startRealtime() {
  if (!supabase) return undefined
  let timer = null
  const avisar = () => {
    // Varios cambios seguidos (p. ej. guardar un evento con su lista) → una sola recarga.
    clearTimeout(timer)
    timer = setTimeout(() => {
      version += 1
      oyentes.forEach((f) => f(version))
    }, 400)
  }
  let canal = supabase.channel('cambios')
  for (const table of TABLAS) canal = canal.on('postgres_changes', { event: '*', schema: 'public', table }, avisar)
  canal.subscribe()
  return () => {
    clearTimeout(timer)
    supabase.removeChannel(canal)
  }
}

// Número que sube cada vez que alguien cambia algo. Ponlo en las dependencias del useEffect que carga.
export function useCambios() {
  const [v, setV] = useState(version)
  useEffect(() => {
    oyentes.add(setV)
    return () => oyentes.delete(setV)
  }, [])
  return v
}
