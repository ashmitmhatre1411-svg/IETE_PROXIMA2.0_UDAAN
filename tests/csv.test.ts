import { describe, expect, it } from 'vitest';
import { validateStudents } from '../lib/csv/validate';

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Person ${i + 1}`, branch: 'EXTC' }));

describe('CSV validation', () => {
  it('accepts exactly 45 valid students', () => {
    const r = validateStudents(rows(45));
    expect(r.ok).toBe(true);
    expect(r.students).toHaveLength(45);
  });

  it('rejects 44 and 46 students with a clear message', () => {
    for (const n of [44, 46]) {
      const r = validateStudents(rows(n));
      expect(r.ok).toBe(false);
      expect(r.issues[0]?.message).toBe(`Expected exactly 45 students but found ${n}.`);
    }
  });

  it('flags empty names with the row number', () => {
    const data = rows(45);
    data[6] = { name: '   ', branch: 'CSE' };
    const r = validateStudents(data);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.message === 'Row 7: name is empty.')).toBe(true);
  });

  it('flags duplicates case-insensitively', () => {
    const data = rows(45);
    data[10] = { name: '  person   3 ', branch: 'extc' };
    const r = validateStudents(data);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => /Row 11: .*duplicate of row 3/.test(i.message))).toBe(true);
  });

  it('allows the same name in different branches and ignores blank lines', () => {
    const data = [...rows(44), { name: 'Person 1', branch: 'CSE' }, { name: '', branch: '' }];
    const r = validateStudents(data);
    expect(r.ok).toBe(true);
    expect(r.count).toBe(45);
  });

  it('strips control characters and collapses whitespace', () => {
    const data = rows(45);
    data[0] = { name: 'Ashmit\u0000\t  Mhatre', branch: ' EXTC ' };
    const r = validateStudents(data);
    expect(r.students[0]).toEqual({ name: 'Ashmit Mhatre', branch: 'EXTC' });
  });
});
