-- 14. Consumiciones: lo que cada socio toma en un evento (café, cerveza…), según las Tarifas.
-- Se guarda el nombre y el precio del momento, para que no cambie si luego cambia la tarifa.
create table if not exists public.consumiciones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  socio_id uuid not null default auth.uid() references public.socios (id) on delete cascade,
  tarifa_id uuid references public.tarifas (id) on delete set null,
  nombre text not null,
  precio numeric(8, 2) not null check (precio >= 0),
  cantidad int not null check (cantidad between 1 and 99),
  created_at timestamptz not null default now(),
  unique (evento_id, socio_id, tarifa_id)
);

create index if not exists consumiciones_socio on public.consumiciones (socio_id);

alter table public.consumiciones enable row level security;

-- Cada socio ve lo suyo; el organizador del evento y los administradores ven todo el evento.
drop policy if exists "Ver consumiciones" on public.consumiciones;
create policy "Ver consumiciones" on public.consumiciones
  for select to authenticated
  using (
    socio_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.eventos e where e.id = evento_id and e.organizador_id = auth.uid())
  );

-- Solo se apunta uno sus consumiciones, y solo en eventos a los que va.
drop policy if exists "Apuntar mis consumiciones" on public.consumiciones;
create policy "Apuntar mis consumiciones" on public.consumiciones
  for insert to authenticated
  with check (
    socio_id = auth.uid()
    and exists (select 1 from public.apuntados a where a.evento_id = consumiciones.evento_id and a.socio_id = auth.uid())
  );

drop policy if exists "Cambiar mis consumiciones" on public.consumiciones;
create policy "Cambiar mis consumiciones" on public.consumiciones
  for update to authenticated
  using (socio_id = auth.uid()) with check (socio_id = auth.uid());

drop policy if exists "Quitar mis consumiciones" on public.consumiciones;
create policy "Quitar mis consumiciones" on public.consumiciones
  for delete to authenticated
  using (socio_id = auth.uid());
