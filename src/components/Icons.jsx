// Iconos de línea. Todos heredan el color del texto.
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

function Svg({ size = 24, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base} {...rest}>
      {children}
    </svg>
  )
}

export const Menu = (p) => <Svg {...p} strokeWidth="2.4"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></Svg>
export const Close = (p) => <Svg {...p} strokeWidth="2.4"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></Svg>
export const Chevron = (p) => <Svg {...p} strokeWidth="2.2"><path d="M9 6l6 6-6 6" /></Svg>
export const Plus = (p) => <Svg {...p} strokeWidth="2.4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Svg>
export const Minus = (p) => <Svg {...p} strokeWidth="2.4"><line x1="5" y1="12" x2="19" y2="12" /></Svg>

// Cubiertos: tenedor y cuchillo
export const Cutlery = (p) => <Svg {...p}><path d="M7 3v8M4.5 3v5.5A2.5 2.5 0 0 0 7 11a2.5 2.5 0 0 0 2.5-2.5V3M7 11v10" /><path d="M17.5 21V3c-2.2 1.2-3.5 3.6-3.5 7v3.5h3.5" /></Svg>
export const Home = (p) => <Svg {...p}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></Svg>
export const Cart = (p) => <Svg {...p}><circle cx="9" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /><path d="M3 4h2l2.4 11h11l2-8H6.2" /></Svg>
export const Calendar = (p) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" strokeWidth="2.6" /></Svg>
// Cartera
export const Wallet = (p) => <Svg {...p}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="4" y="8" width="16" height="12" rx="2.5" /><path d="M15.5 14h2" strokeWidth="2.6" /></Svg>
export const User = (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></Svg>
export const UserPlus = (p) => <Svg {...p}><circle cx="10" cy="8" r="4" /><path d="M3 21c0-4.4 3.1-7 7-7s7 2.6 7 7" /><path d="M19 8v6M16 11h6" /></Svg>
export const Logout = (p) => <Svg {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" /></Svg>
export const Pencil = (p) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></Svg>
export const Camera = (p) => <Svg {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg>
export const Bell = (p) => <Svg {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></Svg>
export const Book = (p) => <Svg {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5" /><path d="M9 7h7M9 11h5" /></Svg>

// Almuerzo: bocadillo (baguette)
export const Almuerzo = (p) => <Svg {...p}><path d="M5.6 11.3l5.7-5.6c2.6-2.7 5.9-3.8 8.6-1.2l.2.2a3 3 0 0 1 0 4.2l-11.3 11.3a3 3 0 0 1-4.1.1l-.1-.1c-2.7-2.7-1.7-6.1 1-8.9z" /><path d="M9.5 7.5l1.5 3.5" /><path d="M6.5 10.5l1.5 3.5" /><path d="M12.5 4.5l1.5 3.5" /></Svg>
// Comida: gorro de cocinero
export const Comida = (p) => <Svg {...p}><path d="M12 3c1.9 0 3.5 1.35 3.9 3.15a4 4 0 0 1 2.1 7.72V21H6v-7.13a4 4 0 1 1 2.1-7.72A4 4 0 0 1 12 3z" /><path d="M6.2 17h11.8" /></Svg>
// Cena: cubiertos (cuchillo y tenedor)
export const Cena = (p) => <Svg {...p}><path d="M19 3v12h-5c0-3.7.2-7.4 5-12z" /><path d="M19 15v6h-1v-3" /><path d="M8 3v17" /><path d="M5 3v3a3 3 0 1 0 6 0V3" /></Svg>

export const Reserva = (p) => <Svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
export const KIND_ICON = { almuerzo: Almuerzo, comida: Comida, cena: Cena, reserva: Reserva }

// Foto del socio o, si no tiene, la silueta de una persona.
export function Avatar({ src, size, className = '' }) {
  const style = size ? { width: size, height: size } : undefined
  return (
    <div className={`avatar${src ? ' has-photo' : ''} ${className}`} style={style} aria-hidden="true">
      {src ? (
        <img src={src} alt="" />
      ) : (
        <svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="15" r="8" /><path d="M4 40c0-9 7-15 16-15s16 6 16 15z" /></svg>
      )}
    </div>
  )
}
