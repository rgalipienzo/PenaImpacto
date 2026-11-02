-- 17. "Pagado": cada socio marca que ha pagado su cuenta de un evento (se guarda el importe de ese momento).
create table if not exists public.pagos_evento (
  evento_id uuid not null references public.eventos (id) on delete cascade,
  socio_id uuid not null default auth.uid() references public.socios (id) on delete cascade,
  importe numeric(8, 2) not null check (importe >= 0),
  pagado_at timestamptz not null default now(),
  primary key (evento_id, socio_id)
);

alter table public.pagos_evento enable row level security;

-- Cada uno ve lo suyo; el organizador del evento y los administradores ven todos los pagos del evento.
drop policy if exists "Ver pagos" on public.pagos_evento;
create policy "Ver pagos" on public.pagos_evento
  for select to authenticated
  using (
    socio_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.eventos e where e.id = evento_id and e.organizador_id = auth.uid())
  );

drop policy if exists "Marcar mi pago" on public.pagos_evento;
create policy "Marcar mi pago" on public.pagos_evento
  for insert to authenticated with check (socio_id = auth.uid());

drop policy if exists "Cambiar mi pago" on public.pagos_evento;
create policy "Cambiar mi pago" on public.pagos_evento
  for update to authenticated using (socio_id = auth.uid()) with check (socio_id = auth.uid());

drop policy if exists "Quitar mi pago" on public.pagos_evento;
create policy "Quitar mi pago" on public.pagos_evento
  for delete to authenticated using (socio_id = auth.uid());

-- 18. Campana de avisos: hasta cuándo ha visto cada socio los eventos nuevos.
alter table public.socios add column if not exists avisos_vistos_at timestamptz not null default now();

revoke update on public.socios from authenticated;
grant update (nombre, apellidos, telefono, foto_url, avisos_vistos_at) on public.socios to authenticated;
