-- 19. Al apuntarse se distingue entre familia y amigos invitados.
-- "comensales" y "ninos" son la familia (no pagan cuota de invitado);
-- "amigos" y "amigos_ninos" son amigos invitados (pagan la cuota de Tarifas → Invitados).
alter table public.apuntados add column if not exists amigos int not null default 0;
alter table public.apuntados add column if not exists amigos_ninos int not null default 0;

alter table public.apuntados drop constraint if exists apuntados_amigos_check;
alter table public.apuntados add constraint apuntados_amigos_check check (amigos between 0 and 50 and amigos_ninos between 0 and 50);
