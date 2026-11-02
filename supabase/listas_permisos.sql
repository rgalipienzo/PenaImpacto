-- 9. Quién puede tocar cada lista:
--    · Lista de un evento (creada desde el Calendario): solo quien creó el evento.
--    · Lista suelta (creada desde Compras): cualquier socio.
-- Todos los socios pueden VER todas las listas.

create or replace function public.puede_editar_lista(l_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listas l
    left join public.eventos e on e.id = l.evento_id
    where l.id = l_id
      and (l.evento_id is null or e.organizador_id = auth.uid())
  )
$$;

-- Listas
drop policy if exists "Quien crea la lista la cambia" on public.listas;
create policy "Quien crea la lista la cambia" on public.listas
  for update to authenticated
  using (public.puede_editar_lista(id)) with check (public.puede_editar_lista(id));

drop policy if exists "Quien crea la lista la borra" on public.listas;
create policy "Quien crea la lista la borra" on public.listas
  for delete to authenticated
  using (public.puede_editar_lista(id));

-- Cosas de cada lista
drop policy if exists "Los socios añaden cosas" on public.lista_items;
create policy "Los socios añaden cosas" on public.lista_items
  for insert to authenticated
  with check (creado_por = auth.uid() and public.puede_editar_lista(lista_id));

drop policy if exists "Los socios marcan lo comprado" on public.lista_items;
create policy "Los socios marcan lo comprado" on public.lista_items
  for update to authenticated
  using (public.puede_editar_lista(lista_id)) with check (public.puede_editar_lista(lista_id));

drop policy if exists "Borrar cosas" on public.lista_items;
create policy "Borrar cosas" on public.lista_items
  for delete to authenticated
  using (public.puede_editar_lista(lista_id));
