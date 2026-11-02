-- 20. Reservar el día: un socio reserva el txoko para algo particular (sale en rojo en el calendario).
alter table public.eventos drop constraint if exists eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('almuerzo', 'comida', 'cena', 'reserva'));
