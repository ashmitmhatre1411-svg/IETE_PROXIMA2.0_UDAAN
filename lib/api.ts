import 'server-only';
import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Database exceptions raised by supabase/schema.sql → friendly API errors. */
const DB_ERRORS: Record<string, [number, string]> = {
  E_PREV_STAGE_INCOMPLETE: [409, 'Clear the previous stage first. Stages must be completed in order.'],
  E_ALREADY_COMPLETED: [409, 'That stage is already cleared.'],
  E_NOT_COMPLETED: [409, 'That stage is not cleared, so there is nothing to reset.'],
  E_EVENT_NOT_RUNNING: [409, 'The hunt has not started yet. Start the event from the Setup page first.'],
  E_EVENT_LOCKED: [409, 'The hunt is running, so teams are locked. Reset the event to change them.'],
  E_TEAM_NOT_FOUND: [404, 'Team not found.'],
  E_INVALID_STAGE: [400, 'Stage must be a number from 1 to 5.'],
  E_BAD_TRANSITION: [409, 'That step is not available right now. Refresh the page and try again.'],
  E_BAD_ROSTER: [422, 'The team list was not valid. Please upload the CSV again.'],
  E_BAD_MODE: [400, 'Unknown reset option.'],
};

export function mapDbError(error: { message?: string; code?: string } | null | undefined): ApiError {
  const message = error?.message ?? '';
  for (const [code, [status, text]] of Object.entries(DB_ERRORS)) {
    if (message.includes(code)) return new ApiError(code, status, text);
  }
  console.error('[db error]', error);
  return new ApiError('DATABASE_ERROR', 500, 'The database could not complete that request. Please try again.');
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }
  console.error('[unhandled]', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Something went wrong on our side. Please try again.' } },
    { status: 500 },
  );
}

/** Wraps a route handler so every failure becomes a clean JSON error (never a stack trace). */
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError('BAD_REQUEST', 400, 'The request body was not valid JSON.');
  }
}
