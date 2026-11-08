-- 18. Cuentas al estilo Tricount.
-- La comida se cuadra entre socios por Bizum: la app dice quién paga a quién y cada Bizum hecho se apunta aquí.
-- Las consumiciones y las cuotas de invitados van al bote de la peña: se marca con "pagos_evento" (Puesto en el bote).

create table if not exists public.reembolsos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  de_socio uuid not null references public.socios (id) on delete cascade,   -- quien hace el Bizum
  a_socio uuid not null references public.socios (id) on delete cascade,    -- quien lo recibe
  importe numeric(8, 2) not null check (importe > 0),
  creado_por uuid not null default auth.uid() references public.socios (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (de_socio <> a_socio)
);

alter table public.reembolsos enable row level security;

-- Todos ven los Bizums de los eventos. Lo apunta (o lo deshace) quien paga, quien cobra o un administrador.
drop policy if exists "Ver bizums" on public.reembolsos;
create policy "Ver bizums" on public.reembolsos for select to authenticated using (true);
drop policy if exists "Apuntar bizum" on public.reembolsos;
create policy "Apuntar bizum" on public.reembolsos for insert to authenticated
  with check (creado_por = auth.uid() and (de_socio = auth.uid() or a_socio = auth.uid() or public.es_admin()));
drop policy if exists "Deshacer bizum" on public.reembolsos;
create policy "Deshacer bizum" on public.reembolsos for delete to authenticated
  using (de_socio = auth.uid() or a_socio = auth.uid() or public.es_admin());

-- Bote: todos ven quién ha puesto lo suyo; un administrador también lo puede marcar o quitar por otro.
drop policy if exists "Ver pagos" on public.pagos_evento;
create policy "Ver pagos" on public.pagos_evento for select to authenticated using (true);
drop policy if exists "Admin bote" on public.pagos_evento;
create policy "Admin bote" on public.pagos_evento for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Tiempo real.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reembolsos'
  ) then
    alter publication supabase_realtime add table public.reembolsos;
  end if;
end $$;
