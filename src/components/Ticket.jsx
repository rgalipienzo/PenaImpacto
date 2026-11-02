import { euros, ticketLines } from '../lib.js'

// La cuenta de un socio en un evento, como un ticket de compra:
// una línea por concepto (cantidad × concepto, precio por unidad y total), lo ya pagado y el TOTAL.
export default function Ticket({ r, consumos = [], children }) {
  const lineas = ticketLines(r, consumos)
  const debe = r.saldo > 0.005
  return (
    <div className="ticket">
      <ul className="ticket-lines">
        {lineas.map((l, i) => (
          <li key={i}>
            <span className="ticket-concepto">
              <strong>{l.cant} × {l.concepto}</strong>
              <span className="ticket-detalle">{l.detalle || euros(l.unidad)}{l.detalle ? ` = ${euros(l.unidad)}` : ''} c/u</span>
            </span>
            <span className="ticket-importe">{euros(l.total)}</span>
          </li>
        ))}
        {r.pagado ? (
          <li className="ticket-pagado">
            <span className="ticket-concepto"><strong>Lo que has comprado tú</strong></span>
            <span className="ticket-importe">− {euros(r.pagado)}</span>
          </li>
        ) : null}
      </ul>
      <div className={`ticket-total${debe ? ' debe' : r.saldo < -0.005 ? ' te-deben' : ''}`}>
        <span>{r.saldo < -0.005 ? 'TE DEBEN' : 'TOTAL A PAGAR'}</span>
        <strong>{euros(Math.abs(r.saldo))}</strong>
      </div>
      {children}
    </div>
  )
}
