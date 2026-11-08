-- 17. Porcentaje de los niños en cada evento (unas veces 50 %, otras 100 %...).
-- Si un evento no lo tiene, se usa el de Tarifas → Reparto de la comida.
alter table public.eventos add column if not exists porcentaje_ninos smallint check (porcentaje_ninos between 0 and 100);
