// Event shape. The same numbers are enforced in supabase/schema.sql.
export const TOTAL_STUDENTS = 45;
export const TEAM_COUNT = 15;
export const TEAM_SIZE = 3;
export const STAGE_COUNT = 5;
export const STAGE_NUMBERS = [1, 2, 3, 4, 5] as const;

export const SESSION_COOKIE = 'proxima_core_session';
export const SESSION_TTL_SECONDS = 12 * 60 * 60; // a full event day, then log in again

export const RESET_PHRASE = 'RESET EVENT';

export const EVENT_TIMEZONE = process.env.NEXT_PUBLIC_EVENT_TIMEZONE || 'Asia/Kolkata';
