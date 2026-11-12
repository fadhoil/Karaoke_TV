-- Jalankan seluruh file ini di Supabase -> SQL Editor -> New query -> Run.

create extension if not exists "pgcrypto";

create table if not exists public.rooms (
  code text primary key,
  name text not null default 'Karaoke Room',
  now_item_id uuid,
  is_playing boolean not null default false,
  position_ms bigint not null default 0,
  started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.queue_items (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  video_id text not null,
  title text not null,
  channel text,
  thumbnail text,
  duration_seconds integer,
  added_by text,
  status text not null default 'pending' check (status in ('pending', 'playing', 'done')),
  sort_order bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists queue_items_room_order_idx
  on public.queue_items (room_code, sort_order);

create index if not exists rooms_updated_at_idx on public.rooms (updated_at);

-- Room karaoke bersifat publik: siapa pun yang punya kode/QR boleh ikut.
-- Karena tidak ada login, RLS dibuka untuk anon. Kode room adalah "kata sandi"-nya.
alter table public.rooms enable row level security;
alter table public.queue_items enable row level security;

drop policy if exists "rooms public access" on public.rooms;
create policy "rooms public access" on public.rooms
  for all using (true) with check (true);

drop policy if exists "queue public access" on public.queue_items;
create policy "queue public access" on public.queue_items
  for all using (true) with check (true);

-- Aktifkan Realtime Supabase untuk kedua tabel.
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.queue_items;

-- (Opsional) bersihkan room yang sudah tidak dipakai lebih dari 12 jam.
-- Jalankan manual atau lewat cron Supabase:
-- delete from public.rooms where updated_at < now() - interval '12 hours';
