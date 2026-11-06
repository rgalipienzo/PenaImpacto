-- 11. Tiempo real: que la app de cada socio se entere al momento de los cambios de los demás.
-- Añade las tablas a la publicación "supabase_realtime" (si ya estaban, no hace nada).
do $$
declare t text;
begin
  foreach t in array array['eventos', 'apuntados', 'listas', 'lista_items', 'gastos_evento', 'consumiciones', 'pagos_evento', 'tarifas', 'ajustes']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
