import { Book, Calendar, Cart, Cutlery, Wallet } from './Icons.jsx'

export const TABS = [
  { id: 'eventos', label: 'Eventos', Icon: Cutlery },
  { id: 'calendario', label: 'Calendario', Icon: Calendar },
  { id: 'pagos', label: 'Pagos', Icon: Wallet },
  { id: 'compras', label: 'Compras', Icon: Cart },
  { id: 'estatutos', label: 'Estatutos', Icon: Book },
]

export default function Nav({ tab, onChange }) {
  return (
    <nav className="tabbar" aria-label="Menú principal">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`tab${tab === id || (tab === 'votaciones' && id === 'calendario') ? ' is-active' : ''}`}
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <span className="tab-pill"><Icon size={22} /></span>
          <span className="tab-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}
