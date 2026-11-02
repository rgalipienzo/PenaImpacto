-- 13. Tarifas (precios de bebidas y demás) y cuota mensual.
-- Todos los socios las ven; solo los administradores las cambian.

create table if not exists public.tarifas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 1 and 80),
  precio numeric(8, 2) not null check (precio >= 0),
  categoria text not null default 'Bebidas',
  created_at timestamptz not null default now()
);

alter table public.tarifas enable row level security;

drop policy if exists "Los socios ven las tarifas" on public.tarifas;
create policy "Los socios ven las tarifas" on public.tarifas
  for select to authenticated using (true);

drop policy if exists "Los administradores cambian las tarifas" on public.tarifas;
create policy "Los administradores cambian las tarifas" on public.tarifas
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Ajustes generales del txoko (una sola fila). De momento, la cuota mensual.
create table if not exists public.ajustes (
  id int primary key default 1 check (id = 1),
  cuota_mensual numeric(8, 2) not null default 0 check (cuota_mensual >= 0),
  actualizado timestamptz not null default now()
);

insert into public.ajustes (id) values (1) on conflict (id) do nothing;

alter table public.ajustes enable row level security;

drop policy if exists "Los socios ven los ajustes" on public.ajustes;
create policy "Los socios ven los ajustes" on public.ajustes
  for select to authenticated using (true);

drop policy if exists "Los administradores cambian los ajustes" on public.ajustes;
create policy "Los administradores cambian los ajustes" on public.ajustes
  for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
