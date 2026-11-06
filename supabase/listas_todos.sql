-- 10. Cualquier socio puede cambiar y borrar cualquier lista de la compra,
--     también las de los eventos (antes, solo quien organizaba el evento).
--     Así se añaden cosas sobre la marcha y quien hace la compra la borra al acabar.
create or replace function public.puede_editar_lista(l_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and exists (select 1 from public.listas l where l.id = l_id)
$$;
