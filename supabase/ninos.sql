-- 5. Niños: al apuntarse, cada socio dice cuántos adultos y cuántos niños (de 0 a 14 años) van.
-- La columna "comensales" pasa a ser el número de adultos.
alter table public.apuntados add column if not exists ninos int not null default 0;

alter table public.apuntados drop constraint if exists apuntados_ninos_check;
alter table public.apuntados add constraint apuntados_ninos_check check (ninos between 0 and 50);
