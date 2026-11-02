-- Peña Impacto: pega todo esto en Supabase > SQL Editor > New query y pulsa Run.
-- Se puede ejecutar más de una vez sin romper nada.

-- 1. Socios: una fila por cada cuenta (se crea sola al invitar a alguien)
create table if not exists public.socios (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  es_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.socios enable row level security;

-- ¿El socio que hace la petición es administrador?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select es_admin from public.socios where id = auth.uid()), false)
$$;

drop policy if exists "Los socios ven a los socios" on public.socios;
create policy "Los socios ven a los socios" on public.socios
  for select to authenticated
  using (true);

drop policy if exists "Cada socio cambia su nombre" on public.socios;
create policy "Cada socio cambia su nombre" on public.socios
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Cada socio solo puede cambiar su nombre (no puede hacerse administrador)
revoke update on public.socios from authenticated;
grant update (nombre) on public.socios to authenticated;

-- Al crear una cuenta, se crea su ficha de socio
create or replace function public.crear_socio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.socios (id, nombre)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'nombre', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_cuenta on auth.users;
create trigger al_crear_cuenta
  after insert on auth.users
  for each row execute function public.crear_socio();

-- Cuentas que ya existieran antes de ejecutar esto
insert into public.socios (id, nombre)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- 2. Eventos: almuerzos, comidas y cenas
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora time not null,
  tipo text not null check (tipo in ('almuerzo', 'comida', 'cena')),
  titulo text not null,
  notas text,
  organizador_id uuid not null default auth.uid() references public.socios (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists eventos_fecha on public.eventos (fecha);

alter table public.eventos enable row level security;

drop policy if exists "Los socios ven los eventos" on public.eventos;
create policy "Los socios ven los eventos" on public.eventos
  for select to authenticated
  using (true);

drop policy if exists "Los socios crean eventos" on public.eventos;
create policy "Los socios crean eventos" on public.eventos
  for insert to authenticated
  with check (organizador_id = auth.uid());

drop policy if exists "El organizador cambia su evento" on public.eventos;
create policy "El organizador cambia su evento" on public.eventos
  for update to authenticated
  using (organizador_id = auth.uid() or public.es_admin())
  with check (organizador_id = auth.uid() or public.es_admin());

drop policy if exists "El organizador borra su evento" on public.eventos;
create policy "El organizador borra su evento" on public.eventos
  for delete to authenticated
  using (organizador_id = auth.uid() or public.es_admin());

-- 3. Apuntados: quién va a cada evento y cuántos comensales lleva
create table if not exists public.apuntados (
  evento_id uuid not null references public.eventos (id) on delete cascade,
  socio_id uuid not null default auth.uid() references public.socios (id) on delete cascade,
  comensales int not null default 1 check (comensales between 1 and 50),
  created_at timestamptz not null default now(),
  primary key (evento_id, socio_id)
);

alter table public.apuntados enable row level security;

drop policy if exists "Los socios ven quién va" on public.apuntados;
create policy "Los socios ven quién va" on public.apuntados
  for select to authenticated
  using (true);

drop policy if exists "Cada socio se apunta" on public.apuntados;
create policy "Cada socio se apunta" on public.apuntados
  for insert to authenticated
  with check (socio_id = auth.uid());

drop policy if exists "Cada socio cambia sus comensales" on public.apuntados;
create policy "Cada socio cambia sus comensales" on public.apuntados
  for update to authenticated
  using (socio_id = auth.uid())
  with check (socio_id = auth.uid());

drop policy if exists "Cada socio se desapunta" on public.apuntados;
create policy "Cada socio se desapunta" on public.apuntados
  for delete to authenticated
  using (socio_id = auth.uid() or public.es_admin());

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

-- 5. Niños: al apuntarse, cada socio dice cuántos adultos y cuántos niños (de 0 a 14 años) van.
-- La columna "comensales" pasa a ser el número de adultos.
alter table public.apuntados add column if not exists ninos int not null default 0;

alter table public.apuntados drop constraint if exists apuntados_ninos_check;
alter table public.apuntados add constraint apuntados_ninos_check check (ninos between 0 and 50);

-- 6. Lista de la compra de cada evento (texto libre, una cosa por línea).
alter table public.eventos add column if not exists compra text;

-- 7. Listas de la compra: las de cada evento y otras sueltas (compra del mes, etc.).
-- Cualquier socio puede ver las listas, añadir cosas y marcarlas como compradas.
create table if not exists public.listas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  evento_id uuid unique references public.eventos (id) on delete cascade, -- vacío = lista suelta
  creado_por uuid not null default auth.uid() references public.socios (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.lista_items (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references public.listas (id) on delete cascade,
  texto text not null check (length(texto) between 1 and 200),
  comprado boolean not null default false,
  creado_por uuid not null default auth.uid() references public.socios (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists lista_items_lista on public.lista_items (lista_id);

alter table public.listas enable row level security;
alter table public.lista_items enable row level security;

-- Listas
drop policy if exists "Los socios ven las listas" on public.listas;
create policy "Los socios ven las listas" on public.listas
  for select to authenticated using (true);

drop policy if exists "Los socios crean listas" on public.listas;
create policy "Los socios crean listas" on public.listas
  for insert to authenticated
  with check (
    creado_por = auth.uid()
    and (evento_id is null or exists (
      select 1 from public.eventos e where e.id = evento_id and e.organizador_id = auth.uid()
    ))
  );

drop policy if exists "Quien crea la lista la cambia" on public.listas;
create policy "Quien crea la lista la cambia" on public.listas
  for update to authenticated
  using (creado_por = auth.uid()) with check (creado_por = auth.uid());

drop policy if exists "Quien crea la lista la borra" on public.listas;
create policy "Quien crea la lista la borra" on public.listas
  for delete to authenticated
  using (creado_por = auth.uid() or public.es_admin());

-- Cosas de cada lista
drop policy if exists "Los socios ven las cosas" on public.lista_items;
create policy "Los socios ven las cosas" on public.lista_items
  for select to authenticated using (true);

drop policy if exists "Los socios añaden cosas" on public.lista_items;
create policy "Los socios añaden cosas" on public.lista_items
  for insert to authenticated
  with check (creado_por = auth.uid());

drop policy if exists "Los socios marcan lo comprado" on public.lista_items;
create policy "Los socios marcan lo comprado" on public.lista_items
  for update to authenticated using (true) with check (true);

-- Solo se puede marcar como comprado; el texto no se cambia (se borra y se añade otro).
revoke update on public.lista_items from authenticated;
grant update (comprado) on public.lista_items to authenticated;

drop policy if exists "Borrar cosas" on public.lista_items;
create policy "Borrar cosas" on public.lista_items
  for delete to authenticated
  using (
    creado_por = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.listas l where l.id = lista_id and l.creado_por = auth.uid())
  );

-- Pasar las listas que ya se escribieron en los eventos (columna "compra") a las tablas nuevas.
insert into public.listas (nombre, evento_id, creado_por)
select e.titulo, e.id, e.organizador_id
from public.eventos e
where coalesce(trim(e.compra), '') <> ''
on conflict (evento_id) do nothing;

insert into public.lista_items (lista_id, texto, creado_por)
select l.id, trim(linea), l.creado_por
from public.eventos e
join public.listas l on l.evento_id = e.id
cross join lateral regexp_split_to_table(e.compra, E'\n') as linea
where coalesce(trim(e.compra), '') <> ''
  and trim(linea) <> ''
  and not exists (select 1 from public.lista_items i where i.lista_id = l.id);

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

-- 10. Datos de la cuenta: apellidos y teléfono de cada socio.
alter table public.socios add column if not exists apellidos text;
alter table public.socios add column if not exists telefono text;

-- Cada socio puede cambiar su nombre, apellidos y teléfono (pero no hacerse administrador).
revoke update on public.socios from authenticated;
grant update (nombre, apellidos, telefono) on public.socios to authenticated;

-- 11. Invitaciones de socios.
-- Cualquier socio crea una invitación y la manda por WhatsApp con un enlace.
-- El invitado abre el enlace y pide el alta (nombre y email).
-- Solo un administrador la acepta (con la función "aceptar-invitacion") o la rechaza.

create table if not exists public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  nombre text,                      -- nombre que puso quien invita
  telefono text,
  invitado_por uuid not null default auth.uid() references public.socios (id) on delete cascade,
  estado text not null default 'enviada' check (estado in ('enviada', 'solicitada', 'aceptada', 'rechazada')),
  email text,                       -- lo rellena el invitado al pedir el alta
  nombre_solicitud text,            -- nombre que pone el invitado
  created_at timestamptz not null default now(),
  solicitada_at timestamptz,
  resuelta_at timestamptz,
  resuelta_por uuid references public.socios (id) on delete set null
);

alter table public.invitaciones enable row level security;

drop policy if exists "Cada socio ve sus invitaciones" on public.invitaciones;
create policy "Cada socio ve sus invitaciones" on public.invitaciones
  for select to authenticated
  using (invitado_por = auth.uid() or public.es_admin());

drop policy if exists "Cualquier socio invita" on public.invitaciones;
create policy "Cualquier socio invita" on public.invitaciones
  for insert to authenticated
  with check (invitado_por = auth.uid() and estado = 'enviada');

drop policy if exists "Quien invita la retira" on public.invitaciones;
create policy "Quien invita la retira" on public.invitaciones
  for delete to authenticated
  using ((invitado_por = auth.uid() and estado in ('enviada', 'solicitada')) or public.es_admin());

-- Lo que ve el invitado al abrir el enlace (sin haber entrado en la app).
create or replace function public.ver_invitacion(p_token text)
returns table (nombre text, invita text, estado text)
language sql
stable
security definer
set search_path = public
as $$
  select i.nombre, s.nombre, i.estado
  from public.invitaciones i
  join public.socios s on s.id = i.invitado_por
  where i.token = p_token
$$;

-- El invitado pide el alta con su nombre y su email.
create or replace function public.solicitar_alta(p_token text, p_nombre text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(p_nombre), '') = '' or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Nombre o email no válidos';
  end if;
  update public.invitaciones
     set nombre_solicitud = trim(p_nombre),
         email = lower(trim(p_email)),
         estado = 'solicitada',
         solicitada_at = now()
   where token = p_token
     and estado in ('enviada', 'solicitada');
  return found;
end;
$$;

revoke all on function public.ver_invitacion(text) from public;
revoke all on function public.solicitar_alta(text, text, text) from public;
grant execute on function public.ver_invitacion(text) to anon, authenticated;
grant execute on function public.solicitar_alta(text, text, text) to anon, authenticated;

-- 12. Foto de perfil de cada socio.
-- Las fotos se guardan en el almacenamiento "avatares", cada socio en su propia carpeta (su id).
alter table public.socios add column if not exists foto_url text;

revoke update on public.socios from authenticated;
grant update (nombre, apellidos, telefono, foto_url) on public.socios to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Los socios ven las fotos" on storage.objects;
create policy "Los socios ven las fotos" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares');

drop policy if exists "Cada socio sube su foto" on storage.objects;
create policy "Cada socio sube su foto" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Cada socio cambia su foto" on storage.objects;
create policy "Cada socio cambia su foto" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Cada socio borra su foto" on storage.objects;
create policy "Cada socio borra su foto" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

-- 13. Tarifas (precios de bebidas y demás) y cuota mensual.
-- Todos los socios las ven; solo los administradores las cambian.

create table if not exists public.tarifas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 1 and 80),
  precio numeric(8, 2) not null check (precio >= 0),
  categoria text not null default 'Bebidas',
  created_at timestamptz not null default now()
);

alter table public.tarifas enable row level security;

drop policy if exists "Los socios ven las tarifas" on public.tarifas;
create policy "Los socios ven las tarifas" on public.tarifas
  for select to authenticated using (true);

drop policy if exists "Los administradores cambian las tarifas" on public.tarifas;
create policy "Los administradores cambian las tarifas" on public.tarifas
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Ajustes generales del txoko (una sola fila). De momento, la cuota mensual.
create table if not exists public.ajustes (
  id int primary key default 1 check (id = 1),
  cuota_mensual numeric(8, 2) not null default 0 check (cuota_mensual >= 0),
  actualizado timestamptz not null default now()
);

insert into public.ajustes (id) values (1) on conflict (id) do nothing;

alter table public.ajustes enable row level security;

drop policy if exists "Los socios ven los ajustes" on public.ajustes;
create policy "Los socios ven los ajustes" on public.ajustes
  for select to authenticated using (true);

drop policy if exists "Los administradores cambian los ajustes" on public.ajustes;
create policy "Los administradores cambian los ajustes" on public.ajustes
  for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- 14. Consumiciones: lo que cada socio toma en un evento (café, cerveza…), según las Tarifas.
-- Se guarda el nombre y el precio del momento, para que no cambie si luego cambia la tarifa.
create table if not exists public.consumiciones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  socio_id uuid not null default auth.uid() references public.socios (id) on delete cascade,
  tarifa_id uuid references public.tarifas (id) on delete set null,
  nombre text not null,
  precio numeric(8, 2) not null check (precio >= 0),
  cantidad int not null check (cantidad between 1 and 99),
  created_at timestamptz not null default now(),
  unique (evento_id, socio_id, tarifa_id)
);

create index if not exists consumiciones_socio on public.consumiciones (socio_id);

alter table public.consumiciones enable row level security;

-- Cada socio ve lo suyo; el organizador del evento y los administradores ven todo el evento.
drop policy if exists "Ver consumiciones" on public.consumiciones;
create policy "Ver consumiciones" on public.consumiciones
  for select to authenticated
  using (
    socio_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.eventos e where e.id = evento_id and e.organizador_id = auth.uid())
  );

-- Solo se apunta uno sus consumiciones, y solo en eventos a los que va.
drop policy if exists "Apuntar mis consumiciones" on public.consumiciones;
create policy "Apuntar mis consumiciones" on public.consumiciones
  for insert to authenticated
  with check (
    socio_id = auth.uid()
    and exists (select 1 from public.apuntados a where a.evento_id = consumiciones.evento_id and a.socio_id = auth.uid())
  );

drop policy if exists "Cambiar mis consumiciones" on public.consumiciones;
create policy "Cambiar mis consumiciones" on public.consumiciones
  for update to authenticated
  using (socio_id = auth.uid()) with check (socio_id = auth.uid());

drop policy if exists "Quitar mis consumiciones" on public.consumiciones;
create policy "Quitar mis consumiciones" on public.consumiciones
  for delete to authenticated
  using (socio_id = auth.uid());

-- 15. Gastos de la comida: lo que cada socio compra para un evento (carne, pan…).
-- El total se reparte entre los comensales; un niño paga un porcentaje de lo que paga un adulto.

create table if not exists public.gastos_evento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  socio_id uuid not null default auth.uid() references public.socios (id) on delete cascade,
  concepto text not null check (length(trim(concepto)) between 1 and 80),
  importe numeric(8, 2) not null check (importe > 0),
  created_at timestamptz not null default now()
);

create index if not exists gastos_evento_evento on public.gastos_evento (evento_id);

alter table public.gastos_evento enable row level security;

drop policy if exists "Los socios ven los gastos" on public.gastos_evento;
create policy "Los socios ven los gastos" on public.gastos_evento
  for select to authenticated using (true);

-- Solo apunta gastos quien va al evento, y siempre a su nombre.
drop policy if exists "Apuntar mis gastos" on public.gastos_evento;
create policy "Apuntar mis gastos" on public.gastos_evento
  for insert to authenticated
  with check (
    socio_id = auth.uid()
    and exists (select 1 from public.apuntados a where a.evento_id = gastos_evento.evento_id and a.socio_id = auth.uid())
  );

drop policy if exists "Cambiar mis gastos" on public.gastos_evento;
create policy "Cambiar mis gastos" on public.gastos_evento
  for update to authenticated
  using (socio_id = auth.uid()) with check (socio_id = auth.uid());

-- Quita un gasto quien lo puso, el organizador del evento o un administrador.
drop policy if exists "Quitar gastos" on public.gastos_evento;
create policy "Quitar gastos" on public.gastos_evento
  for delete to authenticated
  using (
    socio_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.eventos e where e.id = evento_id and e.organizador_id = auth.uid())
  );

-- Cuánto paga un niño respecto a un adulto (en %). Lo cambia un administrador en Tarifas.
alter table public.ajustes add column if not exists porcentaje_ninos int not null default 50
  check (porcentaje_ninos between 0 and 100);

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

-- 19. Al apuntarse se distingue entre familia y amigos invitados.
-- "comensales" y "ninos" son la familia (no pagan cuota de invitado);
-- "amigos" y "amigos_ninos" son amigos invitados (pagan la cuota de Tarifas → Invitados).
alter table public.apuntados add column if not exists amigos int not null default 0;
alter table public.apuntados add column if not exists amigos_ninos int not null default 0;

alter table public.apuntados drop constraint if exists apuntados_amigos_check;
alter table public.apuntados add constraint apuntados_amigos_check check (amigos between 0 and 50 and amigos_ninos between 0 and 50);

-- 20. Reservar el día: un socio reserva el txoko para algo particular (sale en rojo en el calendario).
alter table public.eventos drop constraint if exists eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('almuerzo', 'comida', 'cena', 'reserva'));

-- 21. Dar de baja a un socio (solo administradores).
-- No se borra nada (sus eventos, gastos y pagos siguen ahí para que cuadren las cuentas),
-- pero el socio queda marcado como "de baja" y se le bloquea la entrada a la app.
alter table public.socios add column if not exists baja boolean not null default false;
alter table public.socios add column if not exists baja_at timestamptz;

create or replace function public.dar_de_baja(p_socio uuid, p_baja boolean)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede dar de baja a un socio';
  end if;
  if p_socio = auth.uid() then
    raise exception 'No puedes darte de baja a ti mismo';
  end if;

  update public.socios
     set baja = p_baja,
         baja_at = case when p_baja then now() else null end
   where id = p_socio;

  -- Bloquea (o desbloquea) la entrada: con la cuenta bloqueada no puede iniciar sesión.
  update auth.users
     set banned_until = case when p_baja then now() + interval '100 years' else null end
   where id = p_socio;
end;
$$;

revoke all on function public.dar_de_baja(uuid, boolean) from public;
grant execute on function public.dar_de_baja(uuid, boolean) to authenticated;

-- 22. Para dar de baja desde "Todas las invitaciones": qué socio es cada invitación aceptada
-- (se cruza el email de la invitación con el de su cuenta). Solo para administradores.
create or replace function public.socios_de_invitaciones()
returns table (invitacion_id uuid, socio_id uuid)
language sql
stable
security definer
set search_path = public, auth
as $$
  select i.id, s.id
  from public.invitaciones i
  join auth.users u on lower(u.email) = lower(i.email)
  join public.socios s on s.id = u.id
  where i.estado = 'aceptada'
    and public.es_admin()
$$;

revoke all on function public.socios_de_invitaciones() from public;
grant execute on function public.socios_de_invitaciones() to authenticated;
