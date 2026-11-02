-- 10. Datos de la cuenta: apellidos y teléfono de cada socio.
alter table public.socios add column if not exists apellidos text;
alter table public.socios add column if not exists telefono text;

-- Cada socio puede cambiar su nombre, apellidos y teléfono (pero no hacerse administrador).
revoke update on public.socios from authenticated;
grant update (nombre, apellidos, telefono) on public.socios to authenticated;
