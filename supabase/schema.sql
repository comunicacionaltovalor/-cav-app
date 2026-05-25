create extension if not exists "uuid-ossp";

create table if not exists alumnos (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  group_name text,
  slug text unique not null,
  created_at timestamptz default now()
);

create table if not exists misiones (
  id uuid primary key default uuid_generate_v4(),
  day_number integer default 1,
  title text not null,
  slug text unique not null,
  publish_date date not null,
  tip text not null,
  question text not null,
  open_field boolean default true,
  created_at timestamptz default now()
);

create table if not exists opciones_mision (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid references misiones(id) on delete cascade,
  label text not null,
  position integer default 1
);

create table if not exists respuestas (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid references misiones(id) on delete cascade,
  student_id uuid references alumnos(id) on delete set null,
  open_answer text,
  created_at timestamptz default now(),
  unique(mission_id, student_id)
);

create table if not exists respuestas_opciones (
  id uuid primary key default uuid_generate_v4(),
  response_id uuid references respuestas(id) on delete cascade,
  option_id uuid references opciones_mision(id) on delete cascade
);

create or replace view respuestas_detalle as
select
  r.id,
  r.created_at,
  coalesce(a.name,'Anónimo') as alumno,
  a.group_name as grupo,
  m.title as mision,
  r.open_answer,
  string_agg(o.label, ' | ') as opciones
from respuestas r
left join alumnos a on a.id = r.student_id
join misiones m on m.id = r.mission_id
left join respuestas_opciones ro on ro.response_id = r.id
left join opciones_mision o on o.id = ro.option_id
group by r.id, a.name, a.group_name, m.title, r.open_answer, r.created_at;

alter table alumnos enable row level security;
alter table misiones enable row level security;
alter table opciones_mision enable row level security;
alter table respuestas enable row level security;
alter table respuestas_opciones enable row level security;

create policy "lectura publica alumnos" on alumnos for select using (true);
create policy "crud publico alumnos" on alumnos for all using (true) with check (true);
create policy "lectura publica misiones" on misiones for select using (true);
create policy "crud publico misiones" on misiones for all using (true) with check (true);
create policy "lectura publica opciones" on opciones_mision for select using (true);
create policy "crud publico opciones" on opciones_mision for all using (true) with check (true);
create policy "insert respuestas" on respuestas for insert with check (true);
create policy "lectura respuestas" on respuestas for select using (true);
create policy "insert respuestas opciones" on respuestas_opciones for insert with check (true);
create policy "lectura respuestas opciones" on respuestas_opciones for select using (true);

insert into misiones(day_number,title,slug,publish_date,tip,question,open_field)
values(1,'LA PAUSA ANTES DE LA CIFRA','la-pausa-antes-de-la-cifra',current_date,'Antes de decir una cifra, una condición o un dato importante, haz una pausa de dos segundos. El silencio le da peso a lo que sigue.','¿Qué ocurrió cuando sostuviste la pausa?',true)
on conflict(slug) do nothing;

insert into opciones_mision(mission_id,label,position)
select m.id, x.label, x.position from misiones m,
(values
('El interlocutor prestó más atención.',1),
('Sentí ansiedad por llenar el silencio.',2),
('La cifra tuvo más peso.',3),
('No pude sostener la pausa.',4),
('No tuve oportunidad de practicarlo.',5)
) as x(label,position)
where m.slug='la-pausa-antes-de-la-cifra';
