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
