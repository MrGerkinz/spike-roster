import { describe, it, expect } from 'vitest';
import { mergeVolunteersIntoPlayers } from './merge-volunteers';
import type { Player, RosterSession } from './types';

const baseSession: RosterSession = {
  date: '30 May 2026',
  dateISO: '2026-05-30',
  week: 2,
  ampm: 'AM',
  time: '11:00–1:30 PM',
  equipmentManager: 'Liam S',
  sessionFacilitator: 'Ryan N',
  skillsCoach: 'Jacob M',
  status: 'Pending',
  notes: 'Coaching week',
};

describe('mergeVolunteersIntoPlayers', () => {
  it('appends new players when no names match', () => {
    const players: Player[] = [{ id: '1', name: 'Alice' }];
    const result = mergeVolunteersIntoPlayers(players, baseSession);
    expect(result).toHaveLength(4);
    expect(result.find(p => p.name === 'Liam S')?.volunteerRole).toBe('EM');
    expect(result.find(p => p.name === 'Ryan N')?.volunteerRole).toBe('SF');
    expect(result.find(p => p.name === 'Jacob M')?.volunteerRole).toBe('SC');
  });

  it('updates existing players in place when names match (case-insensitive trim)', () => {
    const players: Player[] = [
      { id: '1', name: 'Alice' },
      { id: '2', name: '  ryan n  ' },
    ];
    const result = mergeVolunteersIntoPlayers(players, baseSession);
    expect(result).toHaveLength(4); // Alice + ryan (updated) + Liam S + Jacob M
    const ryan = result.find(p => p.id === '2');
    expect(ryan?.name).toBe('  ryan n  '); // original name preserved
    expect(ryan?.volunteerRole).toBe('SF');
  });

  it('is idempotent — running twice gives the same result as running once', () => {
    const players: Player[] = [{ id: '1', name: 'Alice' }];
    const once = mergeVolunteersIntoPlayers(players, baseSession);
    const twice = mergeVolunteersIntoPlayers(once, baseSession);
    expect(twice).toHaveLength(once.length);
    expect(twice.map(p => p.name).sort()).toEqual(once.map(p => p.name).sort());
  });

  it('skips null volunteer cells', () => {
    const session: RosterSession = { ...baseSession, skillsCoach: null };
    const players: Player[] = [];
    const result = mergeVolunteersIntoPlayers(players, session);
    expect(result).toHaveLength(2); // EM + SF only
    expect(result.find(p => p.volunteerRole === 'SC')).toBeUndefined();
  });

  it('last-click wins — re-merging with a different session overwrites the badge', () => {
    const sessionA: RosterSession = { ...baseSession, equipmentManager: 'Ryan N', sessionFacilitator: null, skillsCoach: null };
    const sessionB: RosterSession = { ...baseSession, equipmentManager: null, sessionFacilitator: 'Ryan N', skillsCoach: null };
    const afterA = mergeVolunteersIntoPlayers([], sessionA);
    const afterB = mergeVolunteersIntoPlayers(afterA, sessionB);
    expect(afterB).toHaveLength(1);
    expect(afterB[0].volunteerRole).toBe('SF');
  });
});
