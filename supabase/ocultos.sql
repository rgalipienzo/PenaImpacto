-- 20. Lo que cada socio quita de SU pantalla (listas de la compra y eventos de Pagos).
-- No se borra nada: solo deja de salirle a él. Los demás socios lo siguen viendo.

create table if not exists public.ocultos (
  socio_id uuid not null default auth.uid() references public.socios (id) on delete cascade,
  tipo text not null check (tipo in ('lista', 'pago')),
  ref_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (socio_id, tipo, ref_id)
);

alter table public.ocultos enable row level security;

drop policy if exists "Mis ocultos" on public.ocultos;
create policy "Mis ocultos" on public.ocultos for all to authenticated
  using (socio_id = auth.uid()) with check (socio_id = auth.uid());
