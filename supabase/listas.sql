-- 7. Listas de la compra: las de cada evento y otras sueltas (compra del mes, etc.).
-- Cualquier socio puede ver las listas, añadir cosas y marcarlas como compradas.
create table if not exists public.listas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  evento_id uuid unique references public.eventos (id) on delete cascade, -- vacío = lista suelta
  creado_por uuid not null default auth.uid() references public.socios (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.lista_items (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references public.listas (id) on delete cascade,
  texto text not null check (length(texto) between 1 and 200),
  comprado boolean not null default false,
  creado_por uuid not null default auth.uid() references public.socios (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists lista_items_lista on public.lista_items (lista_id);

alter table public.listas enable row level security;
alter table public.lista_items enable row level security;

-- Listas
drop policy if exists "Los socios ven las listas" on public.listas;
create policy "Los socios ven las listas" on public.listas
  for select to authenticated using (true);

drop policy if exists "Los socios crean listas" on public.listas;
create policy "Los socios crean listas" on public.listas
  for insert to authenticated
  with check (
    creado_por = auth.uid()
    and (evento_id is null or exists (
      select 1 from public.eventos e where e.id = evento_id and e.organizador_id = auth.uid()
    ))
  );

drop policy if exists "Quien crea la lista la cambia" on public.listas;
create policy "Quien crea la lista la cambia" on public.listas
  for update to authenticated
  using (creado_por = auth.uid()) with check (creado_por = auth.uid());

drop policy if exists "Quien crea la lista la borra" on public.listas;
create policy "Quien crea la lista la borra" on public.listas
  for delete to authenticated
  using (creado_por = auth.uid() or public.es_admin());

-- Cosas de cada lista
drop policy if exists "Los socios ven las cosas" on public.lista_items;
create policy "Los socios ven las cosas" on public.lista_items
  for select to authenticated using (true);

drop policy if exists "Los socios añaden cosas" on public.lista_items;
create policy "Los socios añaden cosas" on public.lista_items
  for insert to authenticated
  with check (creado_por = auth.uid());

drop policy if exists "Los socios marcan lo comprado" on public.lista_items;
create policy "Los socios marcan lo comprado" on public.lista_items
  for update to authenticated using (true) with check (true);

-- Solo se puede marcar como comprado; el texto no se cambia (se borra y se añade otro).
revoke update on public.lista_items from authenticated;
grant update (comprado) on public.lista_items to authenticated;

drop policy if exists "Borrar cosas" on public.lista_items;
create policy "Borrar cosas" on public.lista_items
  for delete to authenticated
  using (
    creado_por = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.listas l where l.id = lista_id and l.creado_por = auth.uid())
  );

-- Pasar las listas que ya se escribieron en los eventos (columna "compra") a las tablas nuevas.
insert into public.listas (nombre, evento_id, creado_por)
select e.titulo, e.id, e.organizador_id
from public.eventos e
where coalesce(trim(e.compra), '') <> ''
on conflict (evento_id) do nothing;

insert into public.lista_items (lista_id, texto, creado_por)
select l.id, trim(linea), l.creado_por
from public.eventos e
join public.listas l on l.evento_id = e.id
cross join lateral regexp_split_to_table(e.compra, E'\n') as linea
where coalesce(trim(e.compra), '') <> ''
  and trim(linea) <> ''
  and not exists (select 1 from public.lista_items i where i.lista_id = l.id);
