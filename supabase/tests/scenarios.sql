-- ═════════════════════════════════════════════════════════════════════════
-- Database scenario tests for PROXIMA 2.0 (scenarios 1, 3, 4, 5, 10 + extras)
--
-- Runs inside a transaction and ROLLS BACK, so nothing is kept.
-- Run on a TEST project or local Postgres — it wipes the roster inside the
-- transaction, so never run it on the live event database while the hunt is on.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/scenarios.sql
-- ═════════════════════════════════════════════════════════════════════════
begin;

-- Helper: assert that a statement raises an exception containing the given text.
create or replace function pg_temp.expect_error(p_sql text, p_expected text) returns void
language plpgsql as $$
begin
  execute p_sql;
  raise exception 'EXPECTED ERROR "%" BUT STATEMENT SUCCEEDED: %', p_expected, p_sql;
exception when others then
  if sqlerrm like 'EXPECTED ERROR%' then raise; end if;
  if position(p_expected in sqlerrm) = 0 then
    raise exception 'EXPECTED "%" BUT GOT "%"', p_expected, sqlerrm;
  end if;
end $$;

do $$
declare
  v_teams jsonb;
  v_t1 uuid;
  v_t2 uuid;
  v_count int;
begin
  perform public.reset_event('all', 'test');

  -- Build 15 teams × 3 students = 45 distinct students.
  select jsonb_agg(
           jsonb_build_object(
             'team_number', t,
             'members', (
               select jsonb_agg(jsonb_build_object('name', 'Student ' || t || '-' || m, 'branch', 'CSE'))
               from generate_series(1, 3) m
             )
           ) order by t)
    into v_teams
    from generate_series(1, 15) t;

  -- Scenario 1: 45 students → exactly 15 teams of 3, event moves to "generated".
  perform public.save_teams(v_teams, 'test');
  assert (select count(*) from public.teams) = 15, 'S1: 15 teams';
  assert (select count(*) from public.students) = 45, 'S1: 45 students';
  assert (select count(*) from public.team_members) = 45, 'S1: 45 memberships';
  assert (select count(*) from public.stage_progress) = 75, 'S1: 75 stage rows (15x5)';
  assert (select bool_and(c = 3) from (select count(*) c from public.team_members group by team_id) x), 'S1: 3 per team';
  assert (select status from public.event_state) = 'generated', 'S1: status generated';

  -- Wrong roster shapes are rejected.
  perform pg_temp.expect_error($q$select public.save_teams('[]'::jsonb, 'test')$q$, 'E_BAD_ROSTER');

  select id into v_t1 from public.teams where team_number = 3;
  select id into v_t2 from public.teams where team_number = 7;

  -- Stages cannot be cleared until the event is running.
  perform pg_temp.expect_error(format($q$select public.complete_stage(%L, 1, 'tester')$q$, v_t1), 'E_EVENT_NOT_RUNNING');

  -- Cannot start without confirming first.
  perform pg_temp.expect_error($q$select public.advance_event('running', 'tester')$q$, 'E_BAD_TRANSITION');
  perform public.advance_event('confirmed', 'tester');
  perform public.advance_event('running', 'tester');
  assert (select status from public.event_state) = 'running', 'event running';

  -- Locked: roster cannot be regenerated while running.
  perform pg_temp.expect_error(format($q$select public.save_teams(%L::jsonb, 'x')$q$, v_teams::text), 'E_EVENT_LOCKED');

  -- Scenario 3: Team 03 clears Stage 1 → progress 1/5.
  perform public.complete_stage(v_t1, 1, 'tester');
  select count(*) into v_count from public.stage_progress where team_id = v_t1 and completed;
  assert v_count = 1, 'S3: 1/5';
  assert (select completed_by from public.stage_progress where team_id = v_t1 and stage_number = 1) = 'tester', 'S3: completed_by';
  assert (select completed_at from public.stage_progress where team_id = v_t1 and stage_number = 1) is not null, 'S3: completed_at';

  -- Already cleared.
  perform pg_temp.expect_error(format($q$select public.complete_stage(%L, 1, 'tester')$q$, v_t1), 'E_ALREADY_COMPLETED');

  -- Scenario 4: Stage 3 before Stage 2 → rejected (function AND trigger).
  perform pg_temp.expect_error(format($q$select public.complete_stage(%L, 3, 'tester')$q$, v_t1), 'E_PREV_STAGE_INCOMPLETE');
  perform pg_temp.expect_error(
    format($q$update public.stage_progress set completed = true, completed_at = now(), completed_by = 'hacker' where team_id = %L and stage_number = 4$q$, v_t1),
    'E_PREV_STAGE_INCOMPLETE');

  -- Invalid stage numbers and unknown teams.
  perform pg_temp.expect_error(format($q$select public.complete_stage(%L, 6, 'tester')$q$, v_t1), 'E_INVALID_STAGE');
  perform pg_temp.expect_error($q$select public.complete_stage(gen_random_uuid(), 1, 'tester')$q$, 'E_TEAM_NOT_FOUND');

  -- Scenario 5: finish all five stages → winner + finished_at recorded.
  perform public.complete_stage(v_t1, 2, 'tester');
  perform public.complete_stage(v_t1, 3, 'tester');
  perform public.complete_stage(v_t1, 4, 'tester');
  assert (select winner from public.teams where id = v_t1) = false, 'S5: not winner at 4/5';
  perform public.complete_stage(v_t1, 5, 'tester');
  assert (select winner from public.teams where id = v_t1), 'S5: winner';
  assert (select finished_at from public.teams where id = v_t1)
       = (select completed_at from public.stage_progress where team_id = v_t1 and stage_number = 5), 'S5: finished_at = stage 5 time';

  -- A second team can also reach 5/5; completion order is preserved by timestamps.
  for i in 1..5 loop perform public.complete_stage(v_t2, i, 'tester2'); end loop;
  assert (select finished_at from public.teams where id = v_t1) < (select finished_at from public.teams where id = v_t2), 'S5: completion order';

  -- Scenario 10: reset Stage 3 → Stages 3, 4, 5 incomplete; 1 and 2 stay; winner cleared.
  assert public.reset_stage(v_t1, 3, 'tester') = 3, 'S10: three stages reset';
  assert (select array_agg(completed order by stage_number) from public.stage_progress where team_id = v_t1)
       = array[true, true, false, false, false], 'S10: 1,2 kept; 3,4,5 reset';
  assert (select winner from public.teams where id = v_t1) = false, 'S10: winner cleared';
  assert (select finished_at from public.teams where id = v_t1) is null, 'S10: finished_at cleared';
  assert (select count(*) from public.stage_progress where team_id = v_t1 and (completed_at is not null or completed_by is not null)
          and not completed) = 0, 'S10: timestamps cleared';
  perform pg_temp.expect_error(format($q$select public.reset_stage(%L, 4, 'tester')$q$, v_t1), 'E_NOT_COMPLETED');

  -- Re-clearing after a reset must again respect the order.
  perform pg_temp.expect_error(format($q$select public.complete_stage(%L, 4, 'tester')$q$, v_t1), 'E_PREV_STAGE_INCOMPLETE');
  perform public.complete_stage(v_t1, 3, 'tester');

  -- Database-level guards.
  perform pg_temp.expect_error(
    format($q$insert into public.stage_progress (team_id, stage_number) values (%L, 9)$q$, v_t1), 'stage_progress_stage_number_check');
  -- A 4th member cannot join a full team.
  perform pg_temp.expect_error(
    $q$insert into public.team_members (team_id, student_id, position)
       select t.id, s.id, 1 from public.teams t, public.students s
       where t.team_number = 1 limit 1$q$,
    'E_TEAM_FULL');

  -- A student cannot be on two teams (free a seat first so the size guard is not what fires).
  delete from public.team_members where team_id = (select id from public.teams where team_number = 1) and position = 3;
  perform pg_temp.expect_error(
    $q$insert into public.team_members (team_id, student_id, position)
       select (select id from public.teams where team_number = 1),
              (select student_id from public.team_members where position = 1 limit 1), 3$q$,
    'duplicate key');

  -- Audit trail captured the actions.
  assert (select count(*) from public.activity_log where action = 'complete_stage') >= 11, 'audit: completions logged';
  assert (select count(*) from public.activity_log where action = 'reset_stage') = 1, 'audit: reset logged';

  -- Reset progress only: keeps teams, clears everything else.
  perform public.reset_event('progress', 'tester');
  assert (select count(*) from public.teams) = 15, 'progress reset keeps teams';
  assert (select count(*) from public.stage_progress where completed) = 0, 'progress reset clears stages';
  assert (select status from public.event_state) = 'confirmed', 'progress reset → confirmed';

  -- Reset everything.
  perform public.reset_event('all', 'tester');
  assert (select count(*) from public.teams) = 0, 'full reset clears teams';
  assert (select count(*) from public.students) = 0, 'full reset clears students';
  assert (select status from public.event_state) = 'setup', 'full reset → setup';
  perform pg_temp.expect_error($q$select public.reset_event('bogus', 'x')$q$, 'E_BAD_MODE');

  raise notice 'ALL DATABASE SCENARIOS PASSED';
end $$;

rollback;
