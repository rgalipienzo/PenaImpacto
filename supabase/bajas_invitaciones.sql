-- 22. Para dar de baja desde "Todas las invitaciones": qué socio es cada invitación aceptada
-- (se cruza el email de la invitación con el de su cuenta). Solo para administradores.
create or replace function public.socios_de_invitaciones()
returns table (invitacion_id uuid, socio_id uuid)
language sql
stable
security definer
set search_path = public, auth
as $$
  select i.id, s.id
  from public.invitaciones i
  join auth.users u on lower(u.email) = lower(i.email)
  join public.socios s on s.id = u.id
  where i.estado = 'aceptada'
    and public.es_admin()
$$;

revoke all on function public.socios_de_invitaciones() from public;
grant execute on function public.socios_de_invitaciones() to authenticated;
