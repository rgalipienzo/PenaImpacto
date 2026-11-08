-- 16. Votaciones: elegir entre todos qué día hacemos la comida o la cena.
-- Un socio crea la votación con varios días; cada socio marca todos los días que puede.
-- Quien la crea (o un administrador) la cierra, la vuelve a abrir o la borra.

create table if not exists public.votaciones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'comida' check (tipo in ('almuerzo', 'comida', 'cena')),
  creado_por uuid not null default auth.uid() references public.socios (id) on delete cascade,
  cerrada boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.votacion_dias (
  id uuid primary key default gen_random_uuid(),
  votacion_id uuid not null references public.votaciones (id) on delete cascade,
  fecha date not null,
  unique (votacion_id, fecha)
);

create table if not exists public.votos (
  dia_id uuid not null references public.votacion_dias (id) on delete cascade,
  socio_id uuid not null default auth.uid() references public.socios (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (dia_id, socio_id)
);

alter table public.votaciones enable row level security;
alter table public.votacion_dias enable row level security;
alter table public.votos enable row level security;

-- ¿Puedo gestionar esta votación? (la he creado yo o soy administrador)
create or replace function public.mando_votacion(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_admin() or exists (select 1 from public.votaciones v where v.id = p_id and v.creado_por = auth.uid())
$$;

-- ¿Está abierta la votación de este día?
create or replace function public.dia_abierto(p_dia uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.votacion_dias d join public.votaciones v on v.id = d.votacion_id
    where d.id = p_dia and not v.cerrada
  )
$$;

-- Votaciones: todos las ven; cualquiera crea; quien la crea o un administrador la cambia o la borra.
drop policy if exists "Ver votaciones" on public.votaciones;
create policy "Ver votaciones" on public.votaciones for select to authenticated using (true);
drop policy if exists "Crear votaciones" on public.votaciones;
create policy "Crear votaciones" on public.votaciones for insert to authenticated with check (creado_por = auth.uid());
drop policy if exists "Cambiar votaciones" on public.votaciones;
create policy "Cambiar votaciones" on public.votaciones for update to authenticated
  using (creado_por = auth.uid() or public.es_admin()) with check (creado_por = auth.uid() or public.es_admin());
drop policy if exists "Borrar votaciones" on public.votaciones;
create policy "Borrar votaciones" on public.votaciones for delete to authenticated
  using (creado_por = auth.uid() or public.es_admin());

-- Días de la votación: todos los ven; solo quien gestiona la votación los pone o los quita.
drop policy if exists "Ver dias" on public.votacion_dias;
create policy "Ver dias" on public.votacion_dias for select to authenticated using (true);
drop policy if exists "Poner dias" on public.votacion_dias;
create policy "Poner dias" on public.votacion_dias for insert to authenticated with check (public.mando_votacion(votacion_id));
drop policy if exists "Quitar dias" on public.votacion_dias;
create policy "Quitar dias" on public.votacion_dias for delete to authenticated using (public.mando_votacion(votacion_id));

-- Votos: todos ven quién ha votado; cada uno pone o quita solo los suyos, mientras esté abierta.
drop policy if exists "Ver votos" on public.votos;
create policy "Ver votos" on public.votos for select to authenticated using (true);
drop policy if exists "Votar" on public.votos;
create policy "Votar" on public.votos for insert to authenticated
  with check (socio_id = auth.uid() and public.dia_abierto(dia_id));
drop policy if exists "Quitar voto" on public.votos;
create policy "Quitar voto" on public.votos for delete to authenticated
  using (socio_id = auth.uid() and public.dia_abierto(dia_id));

-- Tiempo real: que se vean los votos de los demás al momento.
do $$
declare t text;
begin
  foreach t in array array['votaciones', 'votacion_dias', 'votos']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
