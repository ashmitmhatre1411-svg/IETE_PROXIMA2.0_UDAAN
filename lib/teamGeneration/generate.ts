import { TEAM_COUNT, TEAM_SIZE, TOTAL_STUDENTS } from '../constants';
import type { StudentInput } from '../types';
import { shuffle } from './shuffle';

export interface GeneratedTeam {
  team_number: number;
  members: StudentInput[];
}

/** Randomly split exactly 45 students into 15 teams of 3 (Team 01 … Team 15). */
export function generateTeams(
  students: readonly StudentInput[],
  rand?: (maxExclusive: number) => number,
): GeneratedTeam[] {
  if (students.length !== TOTAL_STUDENTS) {
    throw new Error(`generateTeams needs exactly ${TOTAL_STUDENTS} students, got ${students.length}`);
  }
  const shuffled = shuffle(students, rand);
  return Array.from({ length: TEAM_COUNT }, (_, i) => ({
    team_number: i + 1,
    members: shuffled.slice(i * TEAM_SIZE, (i + 1) * TEAM_SIZE),
  }));
}
