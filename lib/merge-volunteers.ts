import type { Player, RosterSession, VolunteerRole } from './types';

const ROLE_FIELDS: Array<[keyof RosterSession, VolunteerRole]> = [
  ['equipmentManager', 'EM'],
  ['sessionFacilitator', 'SF'],
  ['skillsCoach', 'SC'],
];

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function newPlayerId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function mergeVolunteersIntoPlayers(
  players: Player[],
  session: RosterSession,
): Player[] {
  const result: Player[] = players.map(p => ({ ...p }));

  for (const [field, role] of ROLE_FIELDS) {
    const cell = session[field];
    if (typeof cell !== 'string' || cell.trim() === '') continue;
    const candidate = cell.trim();
    const candidateNorm = normalize(candidate);

    const existingIndex = result.findIndex(p => normalize(p.name) === candidateNorm);
    if (existingIndex >= 0) {
      result[existingIndex] = { ...result[existingIndex], volunteerRole: role };
    } else {
      result.push({ id: newPlayerId(), name: candidate, volunteerRole: role });
    }
  }

  return result;
}
