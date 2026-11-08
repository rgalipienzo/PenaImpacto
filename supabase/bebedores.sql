-- 22. Quién ha bebido cada bebida compartida.
-- bebedores = { "id del socio": nº de adultos de su grupo que han bebido }. Vacío = todos (como la comida).
alter table public.botellas_evento add column if not exists bebedores jsonb;
