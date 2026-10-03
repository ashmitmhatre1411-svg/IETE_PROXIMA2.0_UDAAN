import { TOTAL_STUDENTS } from '../constants';
import type { StudentInput } from '../types';

export interface RowIssue {
  /** 1-based position among student rows (header excluded). 0 = applies to the whole file. */
  row: number;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  students: StudentInput[];
  issues: RowIssue[];
  /** Number of non-blank rows found. */
  count: number;
}

const MAX_NAME = 80;
const MAX_BRANCH = 40;

/** Collapse whitespace, strip control characters. */
export function clean(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pure validation shared by the browser preview and the server route.
 * The server never trusts the browser: it runs this again before saving.
 */
export function validateStudents(rows: Array<{ name?: unknown; branch?: unknown }>): ValidationResult {
  const issues: RowIssue[] = [];
  const students: StudentInput[] = [];
  const seen = new Map<string, number>();
  let count = 0;

  rows.forEach((raw, i) => {
    const row = i + 1;
    const name = clean(raw?.name);
    const branch = clean(raw?.branch);
    if (!name && !branch) return; // completely blank line — ignore
    count += 1;

    if (!name) {
      issues.push({ row, message: `Row ${row}: name is empty.` });
      return;
    }
    if (name.length > MAX_NAME) {
      issues.push({ row, message: `Row ${row}: name is longer than ${MAX_NAME} characters.` });
      return;
    }
    if (branch.length > MAX_BRANCH) {
      issues.push({ row, message: `Row ${row}: branch is longer than ${MAX_BRANCH} characters.` });
      return;
    }

    const key = `${name.toLowerCase()}|${branch.toLowerCase()}`;
    const first = seen.get(key);
    if (first !== undefined) {
      issues.push({ row, message: `Row ${row}: "${name}" (${branch || 'no branch'}) is a duplicate of row ${first}.` });
      return;
    }
    seen.set(key, row);
    students.push({ name, branch });
  });

  if (count !== TOTAL_STUDENTS) {
    issues.unshift({
      row: 0,
      message: `Expected exactly ${TOTAL_STUDENTS} students but found ${count}.`,
    });
  }

  return { ok: issues.length === 0, students, issues, count };
}
