-- ============================================================
-- Módulo de Evaluación de Instructor — Comunicación Alto Valor
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

create table if not exists evaluaciones_ediciones (
  id             uuid primary key default uuid_generate_v4(),
  cliente        text not null,
  edicion_num    int  not null default 1,
  token          text unique not null,
  created_at     timestamptz default now(),
  closed_at      timestamptz,
  expected_count int default 0
);

alter table evaluaciones_ediciones enable row level security;
create policy "read ediciones"   on evaluaciones_ediciones for select using (true);
create policy "insert ediciones" on evaluaciones_ediciones for insert with check (true);
create policy "update ediciones" on evaluaciones_ediciones for update using (true);
create policy "delete ediciones" on evaluaciones_ediciones for delete using (true);

create table if not exists evaluaciones_respuestas (
  id               uuid primary key default uuid_generate_v4(),
  edicion_id       uuid references evaluaciones_ediciones(id) on delete cascade not null,
  participant_name text not null,
  created_at       timestamptz default now(),
  -- Sección 1: Relevancia del contenido
  q1_aplicacion    int check (q1_aplicacion between 1 and 5),
  q2_temas         text,           -- JSON string de array de temas seleccionados
  q3_roleplay      int check (q3_roleplay between 1 and 5),
  q4_momento       text,           -- Abierta opcional
  -- Sección 2: Calidad del instructor
  q5_grid          jsonb,          -- {dominio,claridad,adaptacion,retroalimentacion,presencia}
  q6_negocio       text,
  q7_diferente     text,           -- Abierta opcional
  -- Sección 3: Valor percibido
  q8_nps           int check (q8_nps between 0 and 10),
  q9_repetir       text,
  q10_comentarios  text            -- Abierta opcional
);

alter table evaluaciones_respuestas enable row level security;
create policy "read respuestas eval"   on evaluaciones_respuestas for select using (true);
create policy "insert respuestas eval" on evaluaciones_respuestas for insert with check (true);
