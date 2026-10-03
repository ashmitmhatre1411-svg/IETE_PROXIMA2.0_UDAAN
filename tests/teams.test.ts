import { describe, expect, it } from 'vitest';
import { generateTeams } from '../lib/teamGeneration/generate';
import { shuffle } from '../lib/teamGeneration/shuffle';
import type { StudentInput } from '../lib/types';

const students: StudentInput[] = Array.from({ length: 45 }, (_, i) => ({ name: `Student ${i + 1}`, branch: 'CSE' }));

describe('team generation (scenario 1)', () => {
  it('creates exactly 15 teams of 3 using every student exactly once', () => {
    const teams = generateTeams(students);
    expect(teams).toHaveLength(15);
    expect(teams.map((t) => t.team_number)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    teams.forEach((t) => expect(t.members).toHaveLength(3));
    const names = teams.flatMap((t) => t.members.map((m) => m.name));
    expect(new Set(names).size).toBe(45);
    expect([...names].sort()).toEqual(students.map((s) => s.name).sort());
  });

  it('rejects anything other than 45 students', () => {
    expect(() => generateTeams(students.slice(0, 44))).toThrow();
    expect(() => generateTeams([...students, { name: 'Extra', branch: 'X' }])).toThrow();
  });

  it('does not mutate the input array', () => {
    const copy = students.map((s) => ({ ...s }));
    generateTeams(students);
    expect(students).toEqual(copy);
  });

  it('actually shuffles (different runs give different assignments)', () => {
    const a = JSON.stringify(generateTeams(students));
    const b = JSON.stringify(generateTeams(students));
    expect(a).not.toEqual(b); // probability of equality ≈ 1/45!
  });
});

describe('Fisher–Yates shuffle', () => {
  it('is uniform: every position gets every element about equally often', () => {
    const n = 4;
    const runs = 24000;
    const counts = Array.from({ length: n }, () => Array(n).fill(0) as number[]);
    for (let r = 0; r < runs; r++) {
      shuffle([0, 1, 2, 3]).forEach((v, pos) => counts[v]![pos]!++);
    }
    const expected = runs / n;
    for (const row of counts) for (const c of row) expect(Math.abs(c - expected) / expected).toBeLessThan(0.08);
  });

  it('is deterministic with an injected generator', () => {
    const zero = () => 0;
    expect(shuffle([1, 2, 3, 4], zero)).toEqual([2, 3, 4, 1]);
  });
});
