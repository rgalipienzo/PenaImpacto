-- 13. Los administradores pueden hacer lo mismo que el socio que creó cada cosa:
--     modificar eventos de otros (con su lista), apuntar o corregir a cualquier socio
--     en un evento y cambiar gastos que puso otro.

-- Lista de la compra de un evento: la crea su organizador o un administrador.
drop policy if exists "Los socios crean listas" on public.listas;
create policy "Los socios crean listas" on public.listas
  for insert to authenticated
  with check (
    creado_por = auth.uid()
    and (evento_id is null or public.es_admin() or exists (
      select 1 from public.eventos e where e.id = evento_id and e.organizador_id = auth.uid()
    ))
  );

-- Apuntados: un administrador apunta a cualquier socio y cambia sus comensales.
drop policy if exists "El administrador apunta a cualquiera" on public.apuntados;
create policy "El administrador apunta a cualquiera" on public.apuntados
  for insert to authenticated
  with check (public.es_admin());

drop policy if exists "El administrador cambia comensales" on public.apuntados;
create policy "El administrador cambia comensales" on public.apuntados
  for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Gastos de la comida: un administrador cambia cualquier gasto.
drop policy if exists "El administrador cambia gastos" on public.gastos_evento;
create policy "El administrador cambia gastos" on public.gastos_evento
  for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
