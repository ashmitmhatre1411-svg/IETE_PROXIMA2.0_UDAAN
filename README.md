# PROXIMA 2.0 — UDAAN UNLOCKED · IETE SPIT Treasure Hunt

Live event system: random team generation from a CSV, five sequential stages, a realtime public leaderboard, a projector display mode, and a password-protected core control panel.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · Supabase (Postgres + Realtime) · PapaParse · Vercel.

## Pages

| URL | Who | What |
|---|---|---|
| `/leaderboard` | Public | Live leaderboard (read-only), search, links to team pages |
| `/leaderboard/team/7` | Public | One team's members and progress |
| `/leaderboard/display` | Public | Projector view, all 15 teams on one screen |
| `/core/login` | Core | Name + password |
| `/core` | Core | Stats, stage controls, search/filter, reset event |
| `/core/setup` | Core | 5-step wizard: CSV → verify → generate → confirm → start |

## 1. Install
```bash
npm install
```

## 2. Create the database
1. Create a project at https://supabase.com.
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, click **Run**. (Safe to re-run; it never drops data.)
3. Confirm **Database → Replication** lists `teams`, `team_members`, `stage_progress`, `event_state` under `supabase_realtime`. The script adds them.

## 3. Configure `.env.local`
```bash
cp .env.local.example .env.local
```
| Variable | Where to get it | Exposed to browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | yes (safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page → `anon` / publishable key | yes (read-only via RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | same page → `service_role` / secret key | **never** |
| `CORE_PASSWORD` | You choose (`UDAAN@spit`) | **never** |
| `SESSION_SECRET` | `openssl rand -base64 48` | **never** |
| `NEXT_PUBLIC_EVENT_TIMEZONE` | optional, default `Asia/Kolkata` | yes |

## 4. Run locally
```bash
npm run dev      # http://localhost:3000
npm test         # unit tests
npm run typecheck
```

## 5. Run the event
1. Go to `/core/login`, enter your name and the core password.
2. **Setup → Upload CSV** (`name,branch`, exactly 45 rows; try `samples/students-45.csv`).
3. Review the preview. Errors (wrong count, empty names, duplicates) are listed by row.
4. **Generate Teams.** Students are shuffled with an unbiased Fisher–Yates shuffle (crypto RNG) on the server and split into Team 01–15. The result is saved in Supabase; refreshing never reshuffles.
5. **Confirm teams**, then **Start treasure hunt**. Teams are now locked.
6. On `/core`, press **COMPLETE STAGE n** for a team (after a confirmation). Stages only clear in order. **Reset** on a stage also resets every later stage.
7. Put `/leaderboard/display` on the projector (button for full screen).

Reset event (bottom of `/core`) requires typing `RESET EVENT`. "Clear progress only" keeps the teams, which is handy for a dry run.

## How the rules are enforced
Everything that matters lives in Postgres functions (`supabase/schema.sql`), not just the UI: stage order, "already cleared", "event must be running", winner flag, cascading reset, and server-side timestamps. Triggers refuse out-of-order or oversized teams even for direct SQL. The browser's anon key can only `SELECT`; every write goes through API routes that verify the signed, HttpOnly session cookie and call functions that only `service_role` may execute. Every action is recorded in the private `activity_log`.

Stage 5 completion sets `teams.winner = true` and `finished_at`. Several teams may finish; they are shown in finishing order, and the first is highlighted.

## Deploy to Vercel
1. Push to GitHub.
2. Vercel → **Add New → Project** → import the repo (framework: Next.js, defaults).
3. **Settings → Environment Variables**: add every variable from the table above for Production (and Preview).
4. Deploy. Open `https://<your-app>.vercel.app/core/login`.
5. Changing `CORE_PASSWORD` later logs everyone out; redeploy after editing variables.

## Testing
- `npm test`: shuffle uniformity, 15×3 generation, CSV validation, sorting.
- `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/scenarios.sql`: database scenarios (rolls back; use a test database, not the live one).

## Notes
- Login throttling is per server instance (serverless), so it slows guessing but is not absolute.
- To add the IETE logo, place it in `public/` and add an `<Image>` in `components/Hero.tsx`.
