-- 0001_init.sql — wedding photo game schema
-- Run against a fresh Supabase project (SQL editor or `supabase db push`).

create table if not exists public.config (
  key text primary key,
  value jsonb not null
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id uuid references public.teams(id) on delete set null,
  solo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title_cs text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  image_key text not null,
  title text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists submissions_team_id_idx on public.submissions(team_id);
create index if not exists submissions_player_id_idx on public.submissions(player_id);
create index if not exists submissions_task_id_idx on public.submissions(task_id);

-- One submission per task per team (or per player for solo players).
create unique index if not exists submissions_unique_team_task
  on public.submissions(team_id, task_id) where team_id is not null;
create unique index if not exists submissions_unique_solo_task
  on public.submissions(player_id, task_id) where team_id is null;

-- ---------------------------------------------------------------------------
-- Row level security: private one-day event, anonymous access via anon key.
-- ---------------------------------------------------------------------------
alter table public.config enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;

-- `create policy` has no `if not exists` — guard with existence checks so the
-- migration stays re-runnable (prebuild applies it on every Vercel build).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'config' and policyname = 'config readable by everyone') then
    create policy "config readable by everyone" on public.config for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'teams' and policyname = 'teams readable by everyone') then
    create policy "teams readable by everyone" on public.teams for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'teams' and policyname = 'anyone can create team') then
    create policy "anyone can create team" on public.teams for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'teams' and policyname = 'anyone can update team') then
    create policy "anyone can update team" on public.teams for update using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'players' and policyname = 'players readable by everyone') then
    create policy "players readable by everyone" on public.players for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'players' and policyname = 'anyone can create player') then
    create policy "anyone can create player" on public.players for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'players' and policyname = 'anyone can update player') then
    create policy "anyone can update player" on public.players for update using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks readable by everyone') then
    create policy "tasks readable by everyone" on public.tasks for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'submissions' and policyname = 'submissions readable by everyone') then
    create policy "submissions readable by everyone" on public.submissions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'submissions' and policyname = 'anyone can create submission') then
    create policy "anyone can create submission" on public.submissions for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'submissions' and policyname = 'anyone can update submission') then
    create policy "anyone can update submission" on public.submissions for update using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'submissions' and policyname = 'anyone can delete submission') then
    create policy "anyone can delete submission" on public.submissions for delete using (true);
  end if;
end $$;

-- Realtime: broadcast submission changes to teammates.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submissions'
  ) then
    alter publication supabase_realtime add table public.submissions;
  end if;
end $$;
