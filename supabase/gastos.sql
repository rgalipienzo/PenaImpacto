-- 15. Gastos de la comida: lo que cada socio compra para un evento (carne, pan…).
-- El total se reparte entre los comensales; un niño paga un porcentaje de lo que paga un adulto.

create table if not exists public.gastos_evento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  socio_id uuid not null default auth.uid() references public.socios (id) on delete cascade,
  concepto text not null check (length(trim(concepto)) between 1 and 80),
  importe numeric(8, 2) not null check (importe > 0),
  created_at timestamptz not null default now()
);

create index if not exists gastos_evento_evento on public.gastos_evento (evento_id);

alter table public.gastos_evento enable row level security;

drop policy if exists "Los socios ven los gastos" on public.gastos_evento;
create policy "Los socios ven los gastos" on public.gastos_evento
  for select to authenticated using (true);

-- Solo apunta gastos quien va al evento, y siempre a su nombre.
drop policy if exists "Apuntar mis gastos" on public.gastos_evento;
create policy "Apuntar mis gastos" on public.gastos_evento
  for insert to authenticated
  with check (
    socio_id = auth.uid()
    and exists (select 1 from public.apuntados a where a.evento_id = gastos_evento.evento_id and a.socio_id = auth.uid())
  );

drop policy if exists "Cambiar mis gastos" on public.gastos_evento;
create policy "Cambiar mis gastos" on public.gastos_evento
  for update to authenticated
  using (socio_id = auth.uid()) with check (socio_id = auth.uid());

-- Quita un gasto quien lo puso, el organizador del evento o un administrador.
drop policy if exists "Quitar gastos" on public.gastos_evento;
create policy "Quitar gastos" on public.gastos_evento
  for delete to authenticated
  using (
    socio_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.eventos e where e.id = evento_id and e.organizador_id = auth.uid())
  );

-- Cuánto paga un niño respecto a un adulto (en %). Lo cambia un administrador en Tarifas.
alter table public.ajustes add column if not exists porcentaje_ninos int not null default 50
  check (porcentaje_ninos between 0 and 100);
