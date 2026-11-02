-- 4. Normas de la peña: un único texto que todos leen y solo los administradores cambian.
create table if not exists public.normas (
  id int primary key default 1 check (id = 1),
  texto text not null default '',
  actualizado timestamptz not null default now(),
  actualizado_por uuid default auth.uid() references public.socios (id) on delete set null
);

insert into public.normas (id) values (1) on conflict (id) do nothing;

alter table public.normas enable row level security;

drop policy if exists "Los socios leen las normas" on public.normas;
create policy "Los socios leen las normas" on public.normas
  for select to authenticated
  using (true);

drop policy if exists "Los administradores cambian las normas" on public.normas;
create policy "Los administradores cambian las normas" on public.normas
  for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());
