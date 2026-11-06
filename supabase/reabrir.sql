-- 12. Quien organiza un evento lo puede volver a abrir para que la gente se apunte después de la hora
--     de comienzo (por si al final se queda alguien que no estaba apuntado).
alter table public.eventos add column if not exists reabierto boolean not null default false;
