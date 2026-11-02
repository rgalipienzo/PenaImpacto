-- 6. Lista de la compra de cada evento (texto libre, una cosa por línea).
alter table public.eventos add column if not exists compra text;
