// Core types for the volleyball rostering system

export type VolunteerRole = 'EM' | 'SF' | 'SC';

export interface Player {
  id: string;
  name: string;
  volunteerRole?: VolunteerRole;
}

export interface Assignment {
  playerId: string;
  court: number;      // 1, 2, 3, 4...
  team: 'A' | 'B';
}

export interface ByeAssignment {
  playerId: string;
  isBye: true;
}

export type RoundAssignment = Assignment | ByeAssignment;

export interface Round {
  roundNumber: number;
  assignments: RoundAssignment[];
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  byeCount: number;
  uniqueTeammateCount: number;
  totalPairings: number;
  teammateIds: Set<string>;
}

export interface Schedule {
  rounds: Round[];
  stats: Map<string, PlayerStats>;
}

export interface ScheduleConfig {
  courts: number;       // Number of courts (2-4)
  teamSize: number;     // Players per team (3-6, default 4)
  rounds: number;       // Number of rounds (4-10, default 6)
}

export interface ScheduleResult {
  schedule: Schedule;
  config: ScheduleConfig;
  players: Player[];
  warnings: string[];
}

// Helper type for the rotation matrix display
export interface PlayerRoundAssignment {
  playerId: string;
  playerName: string;
  roundAssignments: (string | 'BYE')[];  // "1A", "2B", "BYE", etc.
}

export interface SameTeamConstraint {
  player1Id: string;
  player2Id: string;
}

// Type guard functions
export function isByeAssignment(assignment: RoundAssignment): assignment is ByeAssignment {
  return 'isBye' in assignment && assignment.isBye === true;
}

export function isCourtAssignment(assignment: RoundAssignment): assignment is Assignment {
  return 'court' in assignment && 'team' in assignment;
}

export interface RosterSession {
  date: string;          // "30 May 2026" — original display
  dateISO: string;       // "2026-05-30" — sortable
  week: number;
  ampm: 'AM' | 'PM';
  time: string;
  equipmentManager: string | null;
  sessionFacilitator: string | null;
  skillsCoach: string | null;
  status: 'Confirmed' | 'Pending';
  notes: string;         // col L — "Coaching week" / "Social games only" / etc
}
