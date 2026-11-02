-- 11. Invitaciones de socios.
-- Cualquier socio crea una invitación y la manda por WhatsApp con un enlace.
-- El invitado abre el enlace y pide el alta (nombre y email).
-- Solo un administrador la acepta (con la función "aceptar-invitacion") o la rechaza.

create table if not exists public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  nombre text,                      -- nombre que puso quien invita
  telefono text,
  invitado_por uuid not null default auth.uid() references public.socios (id) on delete cascade,
  estado text not null default 'enviada' check (estado in ('enviada', 'solicitada', 'aceptada', 'rechazada')),
  email text,                       -- lo rellena el invitado al pedir el alta
  nombre_solicitud text,            -- nombre que pone el invitado
  created_at timestamptz not null default now(),
  solicitada_at timestamptz,
  resuelta_at timestamptz,
  resuelta_por uuid references public.socios (id) on delete set null
);

alter table public.invitaciones enable row level security;

drop policy if exists "Cada socio ve sus invitaciones" on public.invitaciones;
create policy "Cada socio ve sus invitaciones" on public.invitaciones
  for select to authenticated
  using (invitado_por = auth.uid() or public.es_admin());

drop policy if exists "Cualquier socio invita" on public.invitaciones;
create policy "Cualquier socio invita" on public.invitaciones
  for insert to authenticated
  with check (invitado_por = auth.uid() and estado = 'enviada');

drop policy if exists "Quien invita la retira" on public.invitaciones;
create policy "Quien invita la retira" on public.invitaciones
  for delete to authenticated
  using ((invitado_por = auth.uid() and estado in ('enviada', 'solicitada')) or public.es_admin());

-- Lo que ve el invitado al abrir el enlace (sin haber entrado en la app).
create or replace function public.ver_invitacion(p_token text)
returns table (nombre text, invita text, estado text)
language sql
stable
security definer
set search_path = public
as $$
  select i.nombre, s.nombre, i.estado
  from public.invitaciones i
  join public.socios s on s.id = i.invitado_por
  where i.token = p_token
$$;

-- El invitado pide el alta con su nombre y su email.
create or replace function public.solicitar_alta(p_token text, p_nombre text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(p_nombre), '') = '' or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Nombre o email no válidos';
  end if;
  update public.invitaciones
     set nombre_solicitud = trim(p_nombre),
         email = lower(trim(p_email)),
         estado = 'solicitada',
         solicitada_at = now()
   where token = p_token
     and estado in ('enviada', 'solicitada');
  return found;
end;
$$;

revoke all on function public.ver_invitacion(text) from public;
revoke all on function public.solicitar_alta(text, text, text) from public;
grant execute on function public.ver_invitacion(text) to anon, authenticated;
grant execute on function public.solicitar_alta(text, text, text) to anon, authenticated;
