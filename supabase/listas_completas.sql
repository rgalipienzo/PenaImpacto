-- 8. Una lista con todo comprado la puede borrar cualquier socio.
-- (Antes, solo quien la creó o un administrador.)
drop policy if exists "Quien crea la lista la borra" on public.listas;
create policy "Quien crea la lista la borra" on public.listas
  for delete to authenticated
  using (
    creado_por = auth.uid()
    or public.es_admin()
    or (
      exists (select 1 from public.lista_items i where i.lista_id = listas.id)
      and not exists (select 1 from public.lista_items i where i.lista_id = listas.id and not i.comprado)
    )
  );
