-- ═════════════════════════════════════════════════════════════════════════
-- PROXIMA 2.0 — UDAAN UNLOCKED · Supabase schema
--
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is idempotent: running it again will not drop any event data.
--
-- Security model
--   • The browser (anon key) can only READ. No insert/update/delete policies exist.
--   • Every write goes through Next.js API routes that check the core session,
--     then call the SECURITY DEFINER functions below using the service-role key.
--   • The functions are executable by service_role only.
-- ═════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Tables ──────────────────────────────────────────────────────────────

create table if not exists public.students (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  branch      text not null default '' check (char_length(branch) <= 40),
  created_at  timestamptz not null default now()
);
-- The same person cannot appear twice (case-insensitive name + branch).
create unique index if not exists students_name_branch_uniq
  on public.students (lower(btrim(name)), lower(btrim(branch)));

create table if not exists public.teams (
  id           uuid primary key default gen_random_uuid(),
  team_number  smallint not null unique check (team_number between 1 and 15),
  winner       boolean not null default false,
  finished_at  timestamptz,                       -- set when Stage 5 is cleared
  created_at   timestamptz not null default now(),
  check ((winner and finished_at is not null) or (not winner and finished_at is null))
);
create index if not exists teams_finished_at_idx on public.teams (finished_at) where winner;

create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  position    smallint not null check (position between 1 and 3),
  created_at  timestamptz not null default now(),
  constraint team_members_student_once unique (student_id),        -- one team per student
  constraint team_members_team_student unique (team_id, student_id),
  constraint team_members_team_position unique (team_id, position)
);
create index if not exists team_members_team_idx on public.team_members (team_id);

create table if not exists public.stage_progress (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  stage_number  smallint not null check (stage_number between 1 and 5),
  completed     boolean not null default false,
  completed_at  timestamptz,
  completed_by  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint stage_progress_team_stage unique (team_id, stage_number),
  constraint stage_progress_consistent check (
    (completed and completed_at is not null and completed_by is not null)
    or (not completed and completed_at is null and completed_by is null)
  )
);
create index if not exists stage_progress_team_idx on public.stage_progress (team_id);
create index if not exists stage_progress_done_idx on public.stage_progress (stage_number, completed_at) where completed;

-- Single-row table describing where the event is in its lifecycle.
--   setup      → no teams yet
--   generated  → teams saved, waiting for the core team to confirm them
--   confirmed  → allocation confirmed, waiting to start
--   running    → hunt is live; allocation is locked and stages can be cleared
create table if not exists public.event_state (
  id          smallint primary key default 1 check (id = 1),
  status      text not null default 'setup'
              check (status in ('setup', 'generated', 'confirmed', 'running')),
  started_at  timestamptz,
  updated_at  timestamptz not null default now()
);
insert into public.event_state (id, status) values (1, 'setup') on conflict (id) do nothing;

-- Private audit trail. Survives event resets. Not readable by the browser.
create table if not exists public.activity_log (
  id            bigint generated always as identity primary key,
  action        text not null,
  team_number   smallint,
  stage_number  smallint,
  performed_by  text not null,
  details       text,
  created_at    timestamptz not null default now()
);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);

-- ─── Triggers (defence in depth: the database itself refuses bad states) ──

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists stage_progress_touch on public.stage_progress;
create trigger stage_progress_touch before update on public.stage_progress
  for each row execute function public.touch_updated_at();

drop trigger if exists event_state_touch on public.event_state;
create trigger event_state_touch before update on public.event_state
  for each row execute function public.touch_updated_at();

-- A stage can only be completed when the previous stage is completed.
create or replace function public.enforce_stage_order() returns trigger
language plpgsql as $$
begin
  if new.completed and new.stage_number > 1 then
    if not exists (
      select 1 from public.stage_progress p
      where p.team_id = new.team_id
        and p.stage_number = new.stage_number - 1
        and p.completed
    ) then
      raise exception 'E_PREV_STAGE_INCOMPLETE';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists stage_progress_order on public.stage_progress;
create trigger stage_progress_order before insert or update of completed on public.stage_progress
  for each row execute function public.enforce_stage_order();

-- At most 3 members per team.
create or replace function public.enforce_team_size() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.team_members where team_id = new.team_id) >= 3 then
    raise exception 'E_TEAM_FULL';
  end if;
  return new;
end $$;

drop trigger if exists team_members_size on public.team_members;
create trigger team_members_size before insert on public.team_members
  for each row execute function public.enforce_team_size();

-- ─── Functions (called only by the Next.js server with the service-role key) ─

-- Replace the whole roster. p_teams = [{team_number, members:[{name, branch}, x3]}, x15]
-- Atomic: either all 15 teams are saved or nothing changes. Refused once the hunt is running.
create or replace function public.save_teams(p_teams jsonb, p_performed_by text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_team jsonb;
  v_member jsonb;
  v_team_id uuid;
  v_student_id uuid;
  v_pos int;
  v_students int := 0;
begin
  select status into v_status from public.event_state where id = 1 for update;
  if v_status = 'running' then raise exception 'E_EVENT_LOCKED'; end if;

  if jsonb_typeof(p_teams) <> 'array' or jsonb_array_length(p_teams) <> 15 then
    raise exception 'E_BAD_ROSTER';
  end if;
  for v_team in select * from jsonb_array_elements(p_teams) loop
    if jsonb_typeof(v_team -> 'members') <> 'array' or jsonb_array_length(v_team -> 'members') <> 3 then
      raise exception 'E_BAD_ROSTER';
    end if;
  end loop;

  delete from public.stage_progress where true;
  delete from public.team_members where true;
  delete from public.teams where true;
  delete from public.students where true;

  for v_team in select * from jsonb_array_elements(p_teams) loop
    insert into public.teams (team_number) values ((v_team ->> 'team_number')::smallint)
      returning id into v_team_id;

    insert into public.stage_progress (team_id, stage_number)
      select v_team_id, s from generate_series(1, 5) as s;

    v_pos := 0;
    for v_member in select * from jsonb_array_elements(v_team -> 'members') loop
      v_pos := v_pos + 1;
      insert into public.students (name, branch)
        values (btrim(v_member ->> 'name'), btrim(coalesce(v_member ->> 'branch', '')))
        returning id into v_student_id;
      insert into public.team_members (team_id, student_id, position)
        values (v_team_id, v_student_id, v_pos);
      v_students := v_students + 1;
    end loop;
  end loop;

  if v_students <> 45 then raise exception 'E_BAD_ROSTER'; end if;

  update public.event_state set status = 'generated', started_at = null where id = 1;
  insert into public.activity_log (action, performed_by, details)
    values ('generate_teams', p_performed_by, '15 teams / 45 students');
  return 15;
end $$;

-- generated → confirmed → running
create or replace function public.advance_event(p_to text, p_performed_by text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  select status into v_status from public.event_state where id = 1 for update;
  if p_to = 'confirmed' and v_status = 'generated' then
    update public.event_state set status = 'confirmed' where id = 1;
    insert into public.activity_log (action, performed_by) values ('confirm_teams', p_performed_by);
  elsif p_to = 'running' and v_status = 'confirmed' then
    update public.event_state set status = 'running', started_at = now() where id = 1;
    insert into public.activity_log (action, performed_by) values ('start_event', p_performed_by);
  else
    raise exception 'E_BAD_TRANSITION';
  end if;
  return p_to;
end $$;

create or replace function public.complete_stage(p_team_id uuid, p_stage_number int, p_performed_by text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_team_number smallint;
  v_done boolean;
  v_prev boolean;
  v_now timestamptz := clock_timestamp();
begin
  if p_stage_number is null or p_stage_number not between 1 and 5 then
    raise exception 'E_INVALID_STAGE';
  end if;

  select status into v_status from public.event_state where id = 1;
  if v_status is distinct from 'running' then raise exception 'E_EVENT_NOT_RUNNING'; end if;

  -- Row lock serialises concurrent clicks on the same team.
  select team_number into v_team_number from public.teams where id = p_team_id for update;
  if not found then raise exception 'E_TEAM_NOT_FOUND'; end if;

  select completed into v_done from public.stage_progress
    where team_id = p_team_id and stage_number = p_stage_number;
  if not found then raise exception 'E_TEAM_NOT_FOUND'; end if;
  if v_done then raise exception 'E_ALREADY_COMPLETED'; end if;

  if p_stage_number > 1 then
    select completed into v_prev from public.stage_progress
      where team_id = p_team_id and stage_number = p_stage_number - 1;
    if not coalesce(v_prev, false) then raise exception 'E_PREV_STAGE_INCOMPLETE'; end if;
  end if;

  update public.stage_progress
     set completed = true, completed_at = v_now, completed_by = p_performed_by
   where team_id = p_team_id and stage_number = p_stage_number;

  if p_stage_number = 5 then
    update public.teams set winner = true, finished_at = v_now where id = p_team_id;
  end if;

  insert into public.activity_log (action, team_number, stage_number, performed_by)
    values ('complete_stage', v_team_number, p_stage_number, p_performed_by);
end $$;

-- Resetting stage N also resets every later stage, so progress can never be inconsistent.
create or replace function public.reset_stage(p_team_id uuid, p_stage_number int, p_performed_by text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_team_number smallint;
  v_done boolean;
  v_count integer;
begin
  if p_stage_number is null or p_stage_number not between 1 and 5 then
    raise exception 'E_INVALID_STAGE';
  end if;

  select team_number into v_team_number from public.teams where id = p_team_id for update;
  if not found then raise exception 'E_TEAM_NOT_FOUND'; end if;

  select completed into v_done from public.stage_progress
    where team_id = p_team_id and stage_number = p_stage_number;
  if not coalesce(v_done, false) then raise exception 'E_NOT_COMPLETED'; end if;

  update public.stage_progress
     set completed = false, completed_at = null, completed_by = null
   where team_id = p_team_id and stage_number >= p_stage_number and completed;
  get diagnostics v_count = row_count;

  update public.teams set winner = false, finished_at = null where id = p_team_id;

  insert into public.activity_log (action, team_number, stage_number, performed_by, details)
    values ('reset_stage', v_team_number, p_stage_number, p_performed_by,
            v_count || ' stage(s) reset');
  return v_count;
end $$;

-- p_mode = 'progress' → keep teams, wipe stage progress, go back to "confirmed" (dry runs)
-- p_mode = 'all'      → wipe teams, students and progress, go back to "setup"
create or replace function public.reset_event(p_mode text, p_performed_by text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_mode = 'progress' then
    update public.stage_progress
       set completed = false, completed_at = null, completed_by = null where true;
    update public.teams set winner = false, finished_at = null where true;
    update public.event_state
       set status = case when exists (select 1 from public.teams) then 'confirmed' else 'setup' end,
           started_at = null
     where id = 1;
  elsif p_mode = 'all' then
    delete from public.stage_progress where true;
    delete from public.team_members where true;
    delete from public.teams where true;
    delete from public.students where true;
    update public.event_state set status = 'setup', started_at = null where id = 1;
  else
    raise exception 'E_BAD_MODE';
  end if;
  insert into public.activity_log (action, performed_by, details)
    values ('reset_event', p_performed_by, p_mode);
end $$;

-- ─── Privileges & Row Level Security ─────────────────────────────────────

alter table public.students       enable row level security;
alter table public.teams          enable row level security;
alter table public.team_members   enable row level security;
alter table public.stage_progress enable row level security;
alter table public.event_state    enable row level security;
alter table public.activity_log   enable row level security;

-- Read-only public policies. There are deliberately NO insert/update/delete policies.
drop policy if exists "public read teams" on public.teams;
create policy "public read teams" on public.teams
  for select to anon, authenticated using (true);

drop policy if exists "public read team_members" on public.team_members;
create policy "public read team_members" on public.team_members
  for select to anon, authenticated using (true);

drop policy if exists "public read stage_progress" on public.stage_progress;
create policy "public read stage_progress" on public.stage_progress
  for select to anon, authenticated using (true);

drop policy if exists "public read event_state" on public.event_state;
create policy "public read event_state" on public.event_state
  for select to anon, authenticated using (true);

-- Students are only visible once they belong to a team.
drop policy if exists "public read students" on public.students;
create policy "public read students" on public.students
  for select to anon, authenticated
  using (exists (select 1 from public.team_members tm where tm.student_id = students.id));

-- activity_log: RLS on, no policies → invisible to anon/authenticated.

revoke all on public.students, public.teams, public.team_members,
              public.stage_progress, public.event_state, public.activity_log
  from anon, authenticated;
grant select on public.students, public.teams, public.team_members,
                public.stage_progress, public.event_state
  to anon, authenticated;

-- The server (service_role) needs full table access; Supabase usually grants this already.
grant usage on schema public to service_role;
grant all on public.students, public.teams, public.team_members,
             public.stage_progress, public.event_state, public.activity_log
  to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke all on function public.save_teams(jsonb, text)               from public, anon, authenticated;
revoke all on function public.advance_event(text, text)             from public, anon, authenticated;
revoke all on function public.complete_stage(uuid, int, text)       from public, anon, authenticated;
revoke all on function public.reset_stage(uuid, int, text)          from public, anon, authenticated;
revoke all on function public.reset_event(text, text)               from public, anon, authenticated;
grant execute on function public.save_teams(jsonb, text)            to service_role;
grant execute on function public.advance_event(text, text)          to service_role;
grant execute on function public.complete_stage(uuid, int, text)    to service_role;
grant execute on function public.reset_stage(uuid, int, text)       to service_role;
grant execute on function public.reset_event(text, text)            to service_role;

-- ─── Realtime (public leaderboard updates without refreshing) ────────────

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['teams', 'team_members', 'stage_progress', 'event_state'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
