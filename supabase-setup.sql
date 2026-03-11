-- Tabla principal de pallets para la gestión de filtro
-- Ejecutar en el SQL Editor de Supabase

create table if not exists pallets (
  id uuid default gen_random_uuid() primary key,
  lote text not null,
  ubicado boolean default false,
  created_at timestamptz default now()
);

-- Índice para consultas de pallets no ubicados
create index if not exists idx_pallets_ubicado on pallets (ubicado) where ubicado = false;

-- Habilitar Realtime en la tabla
alter publication supabase_realtime add table pallets;

-- Habilitar RLS (Row Level Security) con política abierta (sin login)
alter table pallets enable row level security;

create policy "Acceso público lectura" on pallets
  for select using (true);

create policy "Acceso público inserción" on pallets
  for insert with check (true);

create policy "Acceso público actualización" on pallets
  for update using (true);
