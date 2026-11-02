-- 16. Cualquier socio puede apuntar consumiciones y gastos de la comida en cualquier evento,
-- aunque no esté apuntado como comensal. Siempre a su propio nombre.
drop policy if exists "Apuntar mis consumiciones" on public.consumiciones;
create policy "Apuntar mis consumiciones" on public.consumiciones
  for insert to authenticated
  with check (socio_id = auth.uid());

drop policy if exists "Apuntar mis gastos" on public.gastos_evento;
create policy "Apuntar mis gastos" on public.gastos_evento
  for insert to authenticated
  with check (socio_id = auth.uid());
