-- 21. Mes en el que cada socio organiza el evento (1 = enero … 12 = diciembre).
-- Se ve en Estatutos → Socios. Solo un administrador lo cambia.

alter table public.socios add column if not exists mes_organiza smallint check (mes_organiza between 1 and 12);

create or replace function public.set_mes_organiza(p_socio uuid, p_mes smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar el mes que organiza cada socio';
  end if;
  update public.socios set mes_organiza = p_mes where id = p_socio;
end;
$$;

revoke all on function public.set_mes_organiza(uuid, smallint) from public;
grant execute on function public.set_mes_organiza(uuid, smallint) to authenticated;

-- Reparto actual (Maite y Rebe se ponen desde la app cuando se den de alta: Maite enero, Rebe junio).
update public.socios set mes_organiza = 10 where nombre = 'Ana';
update public.socios set mes_organiza = 11 where nombre = 'Cristina';
update public.socios set mes_organiza = 12 where nombre = 'Eli';
update public.socios set mes_organiza = 2  where nombre = 'María';
update public.socios set mes_organiza = 3  where nombre = 'Miriam';
update public.socios set mes_organiza = 4  where nombre = 'Nagore';
update public.socios set mes_organiza = 5  where nombre = 'Laura';
update public.socios set mes_organiza = 7  where nombre = 'Sandra';
update public.socios set mes_organiza = 8  where nombre = 'Sara Torrellas';
