-- 19. Bebidas compartidas del evento (botellas…): gasto común de todos.
-- Quien organiza el evento (o un administrador) apunta las botellas de Tarifas que se han abierto.
-- Su precio se reparte entre todos los comensales como la comida, y cada uno pone su parte en el bote.

create table if not exists public.botellas_evento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  tarifa_id uuid references public.tarifas (id) on delete set null,
  nombre text not null,
  precio numeric(8, 2) not null check (precio >= 0),
  cantidad int not null check (cantidad between 1 and 99),
  created_at timestamptz not null default now(),
  unique (evento_id, tarifa_id)
);

alter table public.botellas_evento enable row level security;

-- ¿Organizo este evento o soy administrador?
create or replace function public.mando_evento(p_evento uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_admin() or exists (select 1 from public.eventos e where e.id = p_evento and e.organizador_id = auth.uid())
$$;

drop policy if exists "Ver botellas" on public.botellas_evento;
create policy "Ver botellas" on public.botellas_evento for select to authenticated using (true);
drop policy if exists "Poner botellas" on public.botellas_evento;
create policy "Poner botellas" on public.botellas_evento for insert to authenticated with check (public.mando_evento(evento_id));
drop policy if exists "Cambiar botellas" on public.botellas_evento;
create policy "Cambiar botellas" on public.botellas_evento for update to authenticated
  using (public.mando_evento(evento_id)) with check (public.mando_evento(evento_id));
drop policy if exists "Quitar botellas" on public.botellas_evento;
create policy "Quitar botellas" on public.botellas_evento for delete to authenticated using (public.mando_evento(evento_id));

-- Tiempo real.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'botellas_evento'
  ) then
    alter publication supabase_realtime add table public.botellas_evento;
  end if;
end $$;

-- Tarifas: las botellas pasan a «Bebidas compartidas».
update public.tarifas set categoria = 'Compartidas' where nombre ilike '%botella%';
