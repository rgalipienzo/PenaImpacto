-- 21. Dar de baja a un socio (solo administradores).
-- No se borra nada (sus eventos, gastos y pagos siguen ahí para que cuadren las cuentas),
-- pero el socio queda marcado como "de baja" y se le bloquea la entrada a la app.
alter table public.socios add column if not exists baja boolean not null default false;
alter table public.socios add column if not exists baja_at timestamptz;

create or replace function public.dar_de_baja(p_socio uuid, p_baja boolean)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede dar de baja a un socio';
  end if;
  if p_socio = auth.uid() then
    raise exception 'No puedes darte de baja a ti mismo';
  end if;

  update public.socios
     set baja = p_baja,
         baja_at = case when p_baja then now() else null end
   where id = p_socio;

  -- Bloquea (o desbloquea) la entrada: con la cuenta bloqueada no puede iniciar sesión.
  update auth.users
     set banned_until = case when p_baja then now() + interval '100 years' else null end
   where id = p_socio;
end;
$$;

revoke all on function public.dar_de_baja(uuid, boolean) from public;
grant execute on function public.dar_de_baja(uuid, boolean) to authenticated;
