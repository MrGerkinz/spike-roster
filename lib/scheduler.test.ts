import { describe, it, expect } from 'vitest';
import { generateSchedule } from './scheduler';
import { Player, Schedule, ScheduleConfig, isCourtAssignment } from './types';

function makePlayers(names: string[]): Player[] {
  return names.map((name, i) => ({ id: `p${i}`, name }));
}

function findId(players: Player[], name: string): string {
  return players.find(p => p.name === name)!.id;
}

function sharesTeamInAnyRound(schedule: Schedule, idA: string, idB: string): boolean {
  return schedule.rounds.some((round) => {
    const a = round.assignments.find((x) => x.playerId === idA);
    const b = round.assignments.find((x) => x.playerId === idB);
    return (
      !!a &&
      !!b &&
      isCourtAssignment(a) &&
      isCourtAssignment(b) &&
      a.court === b.court &&
      a.team === b.team
    );
  });
}

// 32 players fit exactly into 4 courts x 2 teams x 4 (no byes). With only 3
// rounds each player meets ~9 of 31 others, so an accidental couple pairing is
// unlikely — the guarantee must come from the feature, not from luck.
const config: ScheduleConfig = { courts: 4, teamSize: 4, rounds: 3 };

function filler(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `F${i}`);
}

describe('hidden same-team couples', () => {
  it('always gives EJ and Jelly at least one shared game when both are present', () => {
    const players = makePlayers(['EJ', 'Jelly', ...filler(30)]);
    const ej = findId(players, 'EJ');
    const jelly = findId(players, 'Jelly');

    // The scheduler is randomized, so prove the guarantee holds across many runs.
    for (let i = 0; i < 30; i++) {
      const { schedule } = generateSchedule(players, config);
      expect(sharesTeamInAnyRound(schedule, ej, jelly)).toBe(true);
    }
  });

  it('matches couple names case-insensitively (hans / DEB)', () => {
    const players = makePlayers(['hans', 'DEB', ...filler(30)]);
    const hans = findId(players, 'hans');
    const deb = findId(players, 'DEB');

    for (let i = 0; i < 30; i++) {
      const { schedule } = generateSchedule(players, config);
      expect(sharesTeamInAnyRound(schedule, hans, deb)).toBe(true);
    }
  });

  it('does not throw when only one partner is present', () => {
    const players = makePlayers(['EJ', ...filler(31)]);
    const result = generateSchedule(players, config);
    expect(result.schedule.rounds).toHaveLength(3);
  });
});
