import {
  Player,
  Assignment,
  ByeAssignment,
  Round,
  RoundAssignment,
  PlayerStats,
  Schedule,
  ScheduleConfig,
  ScheduleResult,
  PlayerRoundAssignment,
  isCourtAssignment,
} from './types';

/**
 * Main scheduling function that generates an optimized rotation schedule
 */
export function generateSchedule(players: Player[], config: ScheduleConfig): ScheduleResult {
  const warnings: string[] = [];
  
  // Validate inputs
  const playersPerRound = config.courts * 2 * config.teamSize;
  const byesPerRound = players.length - playersPerRound;
  
  if (byesPerRound < 0) {
    warnings.push(`Not enough players. Need at least ${playersPerRound} for ${config.courts} courts with ${config.teamSize} per team.`);
  }
  
  const maxByesPerPlayer = Math.ceil((byesPerRound * config.rounds) / players.length);
  const minByesPerPlayer = Math.floor((byesPerRound * config.rounds) / players.length);
  
  // Initialize tracking structures
  const pairingMatrix = new PairingMatrix(players);
  const byeCounts = new Map<string, number>();
  players.forEach(p => byeCounts.set(p.id, 0));
  
  const rounds: Round[] = [];
  
  // Phase 1: Greedy construction
  for (let roundNum = 1; roundNum <= config.rounds; roundNum++) {
    const round = constructRound(
      players,
      config,
      roundNum,
      pairingMatrix,
      byeCounts,
      maxByesPerPlayer
    );
    rounds.push(round);
    
    // Update pairing matrix with this round's assignments
    updatePairingMatrix(round, pairingMatrix);
  }
  
  // Phase 2: Local swap refinement for fairness
  const schedule: Schedule = {
    rounds,
    stats: calculateStats(players, rounds, pairingMatrix),
  };
  
  refineScheduleForFairness(schedule, players, config, pairingMatrix);
  
  // Recalculate final stats
  schedule.stats = calculateStats(players, schedule.rounds, pairingMatrix);
  
  return {
    schedule,
    config,
    players,
    warnings,
  };
}

/**
 * Construct a single round using greedy assignment
 */
function constructRound(
  players: Player[],
  config: ScheduleConfig,
  roundNumber: number,
  pairingMatrix: PairingMatrix,
  byeCounts: Map<string, number>,
  maxByesPerPlayer: number
): Round {
  const playersPerRound = config.courts * 2 * config.teamSize;
  const byesNeeded = Math.max(0, players.length - playersPerRound);
  
  // Sort players by bye count (ascending) to distribute byes fairly
  const sortedPlayers = [...players].sort((a, b) => {
    const aCount = byeCounts.get(a.id) || 0;
    const bCount = byeCounts.get(b.id) || 0;
    return aCount - bCount;
  });
  
  // Assign byes to players who have the fewest (but haven't hit max)
  const byePlayers: Player[] = [];
  const playingPlayers: Player[] = [];
  
  // Players who need byes (those with lowest bye counts, respecting max)
  const eligibleForBye = sortedPlayers.filter(p => {
    const count = byeCounts.get(p.id) || 0;
    return count < maxByesPerPlayer;
  });
  
  // Reverse sort for bye assignment - give byes to those with lowest counts
  // But add some randomization to avoid patterns
  const shuffledForBye = shuffleArray([...eligibleForBye]);
  shuffledForBye.sort((a, b) => {
    const aCount = byeCounts.get(a.id) || 0;
    const bCount = byeCounts.get(b.id) || 0;
    return aCount - bCount;
  });
  
  for (const player of shuffledForBye) {
    if (byePlayers.length < byesNeeded) {
      byePlayers.push(player);
      byeCounts.set(player.id, (byeCounts.get(player.id) || 0) + 1);
    } else {
      playingPlayers.push(player);
    }
  }
  
  // Add any remaining players who weren't eligible for bye
  for (const player of sortedPlayers) {
    if (!byePlayers.includes(player) && !playingPlayers.includes(player)) {
      playingPlayers.push(player);
    }
  }
  
  // Assign playing players to courts and teams
  const assignments: RoundAssignment[] = [];
  
  // Create bye assignments
  for (const player of byePlayers) {
    assignments.push({
      playerId: player.id,
      isBye: true,
    } as ByeAssignment);
  }
  
  // Assign players to teams using greedy optimization
  const teamAssignments = assignPlayersToTeams(playingPlayers, config, pairingMatrix);
  assignments.push(...teamAssignments);
  
  return {
    roundNumber,
    assignments,
  };
}

/**
 * Assign players to teams, optimizing for teammate diversity
 */
function assignPlayersToTeams(
  players: Player[],
  config: ScheduleConfig,
  pairingMatrix: PairingMatrix
): Assignment[] {
  const assignments: Assignment[] = [];
  const unassigned = shuffleArray([...players]); // Shuffle for randomization
  
  for (let court = 1; court <= config.courts; court++) {
    for (const team of ['A', 'B'] as const) {
      const teamPlayers: Player[] = [];
      
      for (let i = 0; i < config.teamSize && unassigned.length > 0; i++) {
        if (teamPlayers.length === 0) {
          // First player on team - pick randomly from remaining
          const player = unassigned.shift()!;
          teamPlayers.push(player);
        } else {
          // Find the best teammate based on pairing history
          let bestIndex = 0;
          let bestScore = -Infinity;
          
          for (let j = 0; j < unassigned.length; j++) {
            const candidate = unassigned[j];
            const score = scorePotentialTeammate(candidate, teamPlayers, pairingMatrix);
            if (score > bestScore) {
              bestScore = score;
              bestIndex = j;
            }
          }
          
          const selectedPlayer = unassigned.splice(bestIndex, 1)[0];
          teamPlayers.push(selectedPlayer);
        }
      }
      
      // Create assignments for this team
      for (const player of teamPlayers) {
        assignments.push({
          playerId: player.id,
          court,
          team,
        });
      }
    }
  }
  
  return assignments;
}

/**
 * Score a potential teammate - higher is better (fewer previous pairings)
 */
function scorePotentialTeammate(
  candidate: Player,
  currentTeam: Player[],
  pairingMatrix: PairingMatrix
): number {
  let score = 0;
  
  for (const teammate of currentTeam) {
    const pairCount = pairingMatrix.getPairCount(candidate.id, teammate.id);
    // Heavily penalize repeat pairings
    score -= pairCount * 10;
    // Bonus for never having played together
    if (pairCount === 0) {
      score += 5;
    }
  }
  
  // Add small random factor to break ties and add variety
  score += Math.random() * 0.5;
  
  return score;
}

/**
 * Update the pairing matrix after a round is constructed
 */
function updatePairingMatrix(round: Round, pairingMatrix: PairingMatrix): void {
  // Group players by court and team
  const teams = new Map<string, string[]>(); // "court-team" -> playerIds
  
  for (const assignment of round.assignments) {
    if (isCourtAssignment(assignment)) {
      const key = `${assignment.court}-${assignment.team}`;
      if (!teams.has(key)) {
        teams.set(key, []);
      }
      teams.get(key)!.push(assignment.playerId);
    }
  }
  
  // Record pairings within each team
  for (const playerIds of teams.values()) {
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        pairingMatrix.recordPairing(playerIds[i], playerIds[j]);
      }
    }
  }
}

/**
 * Calculate statistics for all players
 */
function calculateStats(
  players: Player[],
  rounds: Round[],
  pairingMatrix: PairingMatrix
): Map<string, PlayerStats> {
  const stats = new Map<string, PlayerStats>();
  
  for (const player of players) {
    const teammateIds = pairingMatrix.getTeammates(player.id);
    let byeCount = 0;
    
    for (const round of rounds) {
      const assignment = round.assignments.find(a => a.playerId === player.id);
      if (assignment && 'isBye' in assignment) {
        byeCount++;
      }
    }
    
    stats.set(player.id, {
      playerId: player.id,
      playerName: player.name,
      byeCount,
      uniqueTeammateCount: teammateIds.size,
      totalPairings: pairingMatrix.getTotalPairings(player.id),
      teammateIds,
    });
  }
  
  return stats;
}

/**
 * Refine the schedule to improve fairness for bottom 10% players
 */
function refineScheduleForFairness(
  schedule: Schedule,
  players: Player[],
  config: ScheduleConfig,
  pairingMatrix: PairingMatrix
): void {
  const maxIterations = 100;
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Find players in bottom 10% by unique teammate count
    const statsList = Array.from(schedule.stats.values());
    statsList.sort((a, b) => a.uniqueTeammateCount - b.uniqueTeammateCount);
    
    const bottom10Percent = Math.max(1, Math.ceil(players.length * 0.1));
    const needsImprovement = statsList.slice(0, bottom10Percent);
    
    // Calculate threshold - if everyone is within 2 of average, we're done
    const avgTeammates = statsList.reduce((sum, s) => sum + s.uniqueTeammateCount, 0) / statsList.length;
    const minTeammates = statsList[0].uniqueTeammateCount;
    
    if (minTeammates >= avgTeammates - 2) {
      break; // Good enough
    }
    
    // Try to improve the worst player
    const worstPlayer = needsImprovement[0];
    let improved = false;
    
    // Try swapping this player with someone in a different team in some round
    for (const round of schedule.rounds) {
      if (improved) break;
      
      const worstAssignment = round.assignments.find(
        a => a.playerId === worstPlayer.playerId && isCourtAssignment(a)
      );
      
      if (!worstAssignment || !isCourtAssignment(worstAssignment)) continue;
      
      // Find a player on a different team to swap with
      for (const otherAssignment of round.assignments) {
        if (!isCourtAssignment(otherAssignment)) continue;
        if (otherAssignment.playerId === worstPlayer.playerId) continue;
        
        // Different team check
        if (otherAssignment.court === worstAssignment.court && 
            otherAssignment.team === worstAssignment.team) continue;
        
        // Try the swap
        const oldWorstTeammates = getTeammatesInRound(round, worstPlayer.playerId);
        const oldOtherTeammates = getTeammatesInRound(round, otherAssignment.playerId);
        
        // Calculate new teammates after swap
        const newWorstTeammates = oldOtherTeammates.filter(id => id !== worstPlayer.playerId);
        
        // Check if swap improves worst player's unique teammate count
        let newUniqueCount = 0;
        for (const teammateId of newWorstTeammates) {
          if (!worstPlayer.teammateIds.has(teammateId)) {
            newUniqueCount++;
          }
        }
        
        if (newUniqueCount > 0) {
          // Perform the swap
          const worstIdx = round.assignments.findIndex(a => a.playerId === worstPlayer.playerId);
          const otherIdx = round.assignments.findIndex(a => a.playerId === otherAssignment.playerId);
          
          const tempCourt = worstAssignment.court;
          const tempTeam = worstAssignment.team;
          
          (round.assignments[worstIdx] as Assignment).court = otherAssignment.court;
          (round.assignments[worstIdx] as Assignment).team = otherAssignment.team;
          (round.assignments[otherIdx] as Assignment).court = tempCourt;
          (round.assignments[otherIdx] as Assignment).team = tempTeam;
          
          // Recalculate pairing matrix
          rebuildPairingMatrix(schedule.rounds, pairingMatrix, players);
          schedule.stats = calculateStats(players, schedule.rounds, pairingMatrix);
          
          improved = true;
          break;
        }
      }
    }
    
    if (!improved) {
      break; // No more improvements possible
    }
  }
}

/**
 * Get teammate IDs for a player in a specific round
 */
function getTeammatesInRound(round: Round, playerId: string): string[] {
  const playerAssignment = round.assignments.find(
    a => a.playerId === playerId && isCourtAssignment(a)
  );
  
  if (!playerAssignment || !isCourtAssignment(playerAssignment)) {
    return [];
  }
  
  return round.assignments
    .filter(a => 
      isCourtAssignment(a) &&
      a.playerId !== playerId &&
      a.court === playerAssignment.court &&
      a.team === playerAssignment.team
    )
    .map(a => a.playerId);
}

/**
 * Rebuild the pairing matrix from scratch based on current schedule
 */
function rebuildPairingMatrix(rounds: Round[], pairingMatrix: PairingMatrix, players: Player[]): void {
  pairingMatrix.clear();
  for (const round of rounds) {
    updatePairingMatrix(round, pairingMatrix);
  }
}

/**
 * Convert schedule to rotation matrix format for display
 */
export function scheduleToRotationMatrix(
  schedule: Schedule,
  players: Player[]
): PlayerRoundAssignment[] {
  const matrix: PlayerRoundAssignment[] = [];
  
  for (const player of players) {
    const roundAssignments: (string | 'BYE')[] = [];
    
    for (const round of schedule.rounds) {
      const assignment = round.assignments.find(a => a.playerId === player.id);
      
      if (!assignment) {
        roundAssignments.push('BYE'); // Should not happen, but fallback
      } else if ('isBye' in assignment) {
        roundAssignments.push('BYE');
      } else {
        roundAssignments.push(`${assignment.court}${assignment.team}`);
      }
    }
    
    matrix.push({
      playerId: player.id,
      playerName: player.name,
      roundAssignments,
    });
  }
  
  // Sort by player name for consistent display
  matrix.sort((a, b) => a.playerName.localeCompare(b.playerName));
  
  return matrix;
}

/**
 * Pairing matrix class to track teammate history
 */
class PairingMatrix {
  private pairings: Map<string, Map<string, number>>;
  private playerIds: Set<string>;
  
  constructor(players: Player[]) {
    this.pairings = new Map();
    this.playerIds = new Set(players.map(p => p.id));
    
    for (const player of players) {
      this.pairings.set(player.id, new Map());
    }
  }
  
  clear(): void {
    for (const playerMap of this.pairings.values()) {
      playerMap.clear();
    }
  }
  
  recordPairing(playerId1: string, playerId2: string): void {
    this.incrementPair(playerId1, playerId2);
    this.incrementPair(playerId2, playerId1);
  }
  
  private incrementPair(from: string, to: string): void {
    if (!this.pairings.has(from)) {
      this.pairings.set(from, new Map());
    }
    const current = this.pairings.get(from)!.get(to) || 0;
    this.pairings.get(from)!.set(to, current + 1);
  }
  
  getPairCount(playerId1: string, playerId2: string): number {
    return this.pairings.get(playerId1)?.get(playerId2) || 0;
  }
  
  getTeammates(playerId: string): Set<string> {
    const teammates = new Set<string>();
    const playerPairings = this.pairings.get(playerId);
    
    if (playerPairings) {
      for (const [teammateId, count] of playerPairings) {
        if (count > 0) {
          teammates.add(teammateId);
        }
      }
    }
    
    return teammates;
  }
  
  getTotalPairings(playerId: string): number {
    let total = 0;
    const playerPairings = this.pairings.get(playerId);
    
    if (playerPairings) {
      for (const count of playerPairings.values()) {
        total += count;
      }
    }
    
    return total;
  }
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
