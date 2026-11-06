-- 14. Un administrador puede hacer administrador a otro socio, o quitárselo.
-- No se puede quitar el permiso a uno mismo (así siempre queda al menos un administrador).
create or replace function public.set_admin(p_socio uuid, p_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede dar o quitar permisos de administrador';
  end if;
  if p_socio = auth.uid() then
    raise exception 'No puedes cambiar tus propios permisos';
  end if;
  if p_admin and exists (select 1 from public.socios where id = p_socio and baja) then
    raise exception 'Un socio dado de baja no puede ser administrador';
  end if;

  update public.socios set es_admin = p_admin where id = p_socio;
end;
$$;

revoke all on function public.set_admin(uuid, boolean) from public;
grant execute on function public.set_admin(uuid, boolean) to authenticated;
