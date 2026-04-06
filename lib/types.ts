// Core types for the volleyball rostering system

export interface Player {
  id: string;
  name: string;
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
