-- ============================================================
-- MIGRACIÓN: Sistema multi-cliente
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1. Tabla de clientes
create table if not exists clientes (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  slug       text unique not null,
  created_at timestamptz default now()
);

-- 2. RLS para clientes
alter table clientes enable row level security;
create policy "lectura publica clientes"  on clientes for select using (true);
create policy "crud publico clientes"     on clientes for all    using (true) with check (true);

-- 3. Agregar cliente_id a misiones y alumnos
alter table misiones add column if not exists cliente_id uuid references clientes(id) on delete cascade;
alter table alumnos  add column if not exists cliente_id uuid references clientes(id) on delete cascade;

-- 4. Crear SISU como primer cliente
insert into clientes(name, slug)
values ('SISU', 'sisu')
on conflict(slug) do nothing;

-- 5. Asignar misiones y alumnos existentes a SISU
update misiones set cliente_id = (select id from clientes where slug = 'sisu') where cliente_id is null;
update alumnos  set cliente_id = (select id from clientes where slug = 'sisu') where cliente_id is null;

-- 6. Actualizar la vista para incluir cliente_id
create or replace view respuestas_detalle as
select
  r.id,
  r.created_at,
  coalesce(a.name, 'Anónimo') as alumno,
  a.group_name                as grupo,
  m.title                     as mision,
  m.cliente_id,
  r.open_answer,
  string_agg(o.label, ' | ')  as opciones
from respuestas r
left join alumnos          a  on a.id  = r.student_id
join  misiones             m  on m.id  = r.mission_id
left join respuestas_opciones ro on ro.response_id = r.id
left join opciones_mision  o  on o.id  = ro.option_id
group by r.id, a.name, a.group_name, m.title, m.cliente_id, r.open_answer, r.created_at;
