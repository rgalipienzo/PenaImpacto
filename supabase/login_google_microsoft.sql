-- 15. Entrar con Google o Microsoft (Hotmail/Outlook).
-- Quien ya es socio y entra con Google/Microsoft con el mismo email se une a su cuenta de siempre
-- (eso lo hace Supabase y no pasa por aquí). Una cuenta NUEVA creada con Google/Microsoft
-- solo se permite si hay una invitación aceptada con ese email: así nadie entra sin invitación.
create or replace function public.crear_socio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'email'
     and not exists (
       select 1 from public.invitaciones i
       where lower(i.email) = lower(new.email) and i.estado = 'aceptada'
     ) then
    raise exception 'Sin invitación para %', new.email;
  end if;

  insert into public.socios (id, nombre)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'nombre', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
