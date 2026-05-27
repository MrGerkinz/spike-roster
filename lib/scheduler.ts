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
  SameTeamConstraint,
  isCourtAssignment,
} from './types';

/**
 * Hidden, hardcoded couples that should share a team in at least one round
 * whenever both are present. This is intentionally not surfaced in the UI.
 * Names are matched case-insensitively (trim + lowercase) and exactly.
 */
const HIDDEN_SAME_TEAM_COUPLES: ReadonlyArray<readonly [string, string]> = [
  ['EJ', 'Jelly'],
  ['Hans', 'Deb'],
];

/**
 * Main scheduling function that generates an optimized rotation schedule
 */
export function generateSchedule(
  players: Player[],
  config: ScheduleConfig,
  constraints: SameTeamConstraint[] = []
): ScheduleResult {
  const warnings: string[] = [];
  
  // Validate inputs
  const playersPerRound = config.courts * 2 * config.teamSize;
  const byesPerRound = players.length - playersPerRound;
  
  if (byesPerRound < 0) {
    warnings.push(`Not enough players. Need at least ${playersPerRound} for ${config.courts} courts with ${config.teamSize} per team.`);
  }
  
  const maxByesPerPlayer = Math.ceil((byesPerRound * config.rounds) / players.length);
  const minByesPerPlayer = Math.floor((byesPerRound * config.rounds) / players.length);

  // Build locked groups from same-team constraints (transitive closure via union-find)
  const lockedGroups = buildLockedGroups(players, constraints);
  const largestGroup = lockedGroups.reduce((max, g) => Math.max(max, g.length), 0);
  if (largestGroup > config.teamSize) {
    warnings.push(
      `A same-team constraint group has ${largestGroup} players but team size is only ${config.teamSize}. The constraint cannot be fully satisfied.`
    );
  }

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
      maxByesPerPlayer,
      lockedGroups
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
  
  refineScheduleForFairness(schedule, players, config, pairingMatrix, constraints);

  // Recalculate final stats
  schedule.stats = calculateStats(players, schedule.rounds, pairingMatrix);

  // Final guarantee pass: hidden couples get at least one shared game. Runs
  // last so the fairness refinement above can't separate them again.
  enforceHiddenCouples(schedule, players, pairingMatrix, constraints);

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
  maxByesPerPlayer: number,
  lockedGroups: Player[][]
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
  const teamAssignments = assignPlayersToTeams(playingPlayers, config, pairingMatrix, lockedGroups);
  assignments.push(...teamAssignments);
  
  return {
    roundNumber,
    assignments,
  };
}

/**
 * Assign players to teams, optimizing for teammate diversity
 * while respecting locked groups (same-team constraints).
 */
function assignPlayersToTeams(
  players: Player[],
  config: ScheduleConfig,
  pairingMatrix: PairingMatrix,
  lockedGroups: Player[][]
): Assignment[] {
  const assignments: Assignment[] = [];
  const unassigned = new Set(shuffleArray([...players]).map(p => p.id));
  const playerById = new Map(players.map(p => [p.id, p]));

  // Build a lookup from playerId -> the locked group they belong to (only groups present in this round)
  const playerGroup = new Map<string, Player[]>();
  for (const group of lockedGroups) {
    const activeMembers = group.filter(p => unassigned.has(p.id));
    if (activeMembers.length > 1) {
      for (const p of activeMembers) {
        playerGroup.set(p.id, activeMembers);
      }
    }
  }

  // Collect groups that need placement, sorted largest-first so they get seated before slots fill
  const groupsToPlace: Player[][] = [];
  const seen = new Set<string>();
  for (const [, group] of playerGroup) {
    const key = group.map(p => p.id).sort().join(',');
    if (!seen.has(key)) {
      seen.add(key);
      groupsToPlace.push(group);
    }
  }
  groupsToPlace.sort((a, b) => b.length - a.length);

  // Pre-compute team slots: court -> team -> capacity
  type Slot = { court: number; team: 'A' | 'B'; players: Player[] };
  const slots: Slot[] = [];
  for (let court = 1; court <= config.courts; court++) {
    for (const team of ['A', 'B'] as const) {
      slots.push({ court, team, players: [] });
    }
  }

  // Phase 1: Place locked groups into slots that can fit them
  for (const group of groupsToPlace) {
    // Find best slot: must have enough remaining capacity; prefer slot that minimises repeat pairings with existing members
    let bestSlot: Slot | null = null;
    let bestScore = -Infinity;

    for (const slot of slots) {
      const remaining = config.teamSize - slot.players.length;
      if (remaining < group.length) continue;

      let score = 0;
      for (const candidate of group) {
        score += scorePotentialTeammate(candidate, slot.players, pairingMatrix);
      }
      score += Math.random() * 0.1;
      if (score > bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    }

    if (bestSlot) {
      for (const p of group) {
        bestSlot.players.push(p);
        unassigned.delete(p.id);
      }
    }
  }

  // Phase 2: Fill remaining slots with unconstrained players using greedy optimisation
  const remaining = shuffleArray(
    Array.from(unassigned).map(id => playerById.get(id)!)
  );

  for (const slot of slots) {
    while (slot.players.length < config.teamSize && remaining.length > 0) {
      if (slot.players.length === 0) {
        slot.players.push(remaining.shift()!);
      } else {
        let bestIndex = 0;
        let bestScore = -Infinity;
        for (let j = 0; j < remaining.length; j++) {
          const score = scorePotentialTeammate(remaining[j], slot.players, pairingMatrix);
          if (score > bestScore) {
            bestScore = score;
            bestIndex = j;
          }
        }
        slot.players.push(remaining.splice(bestIndex, 1)[0]);
      }
    }
  }

  // Convert to Assignment[]
  for (const slot of slots) {
    for (const player of slot.players) {
      assignments.push({ playerId: player.id, court: slot.court, team: slot.team });
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
  pairingMatrix: PairingMatrix,
  constraints: SameTeamConstraint[] = []
): void {
  const constrainedPairs = new Set(
    constraints.map(c => [c.player1Id, c.player2Id].sort().join(':'))
  );
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

        // Skip if swap would separate a constrained pair
        if (wouldBreakConstraint(round, worstPlayer.playerId, otherAssignment.playerId, constrainedPairs)) continue;

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
 * Build groups of players that must stay on the same team (transitive closure via union-find).
 * Returns only groups with 2+ members; ungrouped players are omitted.
 */
function buildLockedGroups(players: Player[], constraints: SameTeamConstraint[]): Player[][] {
  if (constraints.length === 0) return [];

  const parent = new Map<string, string>();
  const playerById = new Map(players.map(p => [p.id, p]));

  const find = (id: string): string => {
    while (parent.get(id) !== id) {
      parent.set(id, parent.get(parent.get(id)!)!);
      id = parent.get(id)!;
    }
    return id;
  };

  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const p of players) parent.set(p.id, p.id);

  for (const c of constraints) {
    if (playerById.has(c.player1Id) && playerById.has(c.player2Id)) {
      union(c.player1Id, c.player2Id);
    }
  }

  const groups = new Map<string, Player[]>();
  for (const p of players) {
    const root = find(p.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(p);
  }

  return Array.from(groups.values()).filter(g => g.length > 1);
}

/**
 * Best-effort pass that guarantees each hidden couple shares a team in at least
 * one round. Mutates the schedule's rounds, then rebuilds the pairing matrix and
 * stats so they stay accurate. Couples with only one (or neither) partner present
 * are skipped silently — that's a common, unremarkable case.
 */
function enforceHiddenCouples(
  schedule: Schedule,
  players: Player[],
  pairingMatrix: PairingMatrix,
  uiConstraints: SameTeamConstraint[]
): void {
  // Index players by normalised name (there can be duplicates).
  const byName = new Map<string, Player[]>();
  for (const p of players) {
    const key = normalizeName(p.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(p);
  }

  // Resolve each couple to a present pair of player IDs.
  const couples: Array<{ names: readonly [string, string]; a: string; b: string }> = [];
  for (const [name1, name2] of HIDDEN_SAME_TEAM_COUPLES) {
    const p1 = byName.get(normalizeName(name1))?.[0];
    const p2 = byName.get(normalizeName(name2))?.[0];
    if (!p1 || !p2) continue; // only one partner present — skip silently
    couples.push({ names: [name1, name2], a: p1.id, b: p2.id });
  }
  if (couples.length === 0) return;

  // Players we must not displace when making room: hard UI-locked players and
  // every hidden-couple member (so fixing one couple can't break another).
  const protectedIds = new Set<string>();
  for (const c of uiConstraints) {
    protectedIds.add(c.player1Id);
    protectedIds.add(c.player2Id);
  }
  for (const c of couples) {
    protectedIds.add(c.a);
    protectedIds.add(c.b);
  }

  let changed = false;
  for (const couple of couples) {
    if (sharesTeamInAnyRound(schedule, couple.a, couple.b)) continue;
    if (pairCoupleViaSwap(schedule, couple.a, couple.b, protectedIds)) {
      changed = true;
    } else {
      console.warn(
        `[scheduler] Could not give ${couple.names[0]} & ${couple.names[1]} a shared game; they never both play the same round.`
      );
    }
  }

  if (changed) {
    rebuildPairingMatrix(schedule.rounds, pairingMatrix, players);
    schedule.stats = calculateStats(players, schedule.rounds, pairingMatrix);
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** True if the two players are on the same court+team in any round. */
function sharesTeamInAnyRound(schedule: Schedule, idA: string, idB: string): boolean {
  return schedule.rounds.some((round) => {
    const a = round.assignments.find((x) => x.playerId === idA);
    const b = round.assignments.find((x) => x.playerId === idB);
    return (
      !!a && !!b && isCourtAssignment(a) && isCourtAssignment(b) &&
      a.court === b.court && a.team === b.team
    );
  });
}

/**
 * Find a round where both players are on court and put them on the same team via
 * a 1-for-1 swap (which preserves team sizes). Returns true once paired.
 */
function pairCoupleViaSwap(
  schedule: Schedule,
  idA: string,
  idB: string,
  protectedIds: Set<string>
): boolean {
  for (const round of schedule.rounds) {
    const aAssign = round.assignments.find((x) => x.playerId === idA);
    const bAssign = round.assignments.find((x) => x.playerId === idB);
    if (
      !aAssign || !bAssign ||
      !isCourtAssignment(aAssign) || !isCourtAssignment(bAssign)
    ) {
      continue; // at least one is on a bye this round
    }
    // Try moving B onto A's team; if A's team has no swappable player, try the reverse.
    if (moveOntoTeam(round, bAssign, aAssign, protectedIds)) return true;
    if (moveOntoTeam(round, aAssign, bAssign, protectedIds)) return true;
  }
  return false;
}

/**
 * Move `mover` onto `target`'s team by swapping it with a non-protected player
 * already on that team. Mutates the assignment objects in place.
 */
function moveOntoTeam(
  round: Round,
  mover: Assignment,
  target: Assignment,
  protectedIds: Set<string>
): boolean {
  const swapTarget = round.assignments.find(
    (x) =>
      isCourtAssignment(x) &&
      x.court === target.court &&
      x.team === target.team &&
      x.playerId !== mover.playerId &&
      x.playerId !== target.playerId &&
      !protectedIds.has(x.playerId)
  ) as Assignment | undefined;

  if (!swapTarget) return false;

  const moverCourt = mover.court;
  const moverTeam = mover.team;
  mover.court = swapTarget.court;
  mover.team = swapTarget.team;
  swapTarget.court = moverCourt;
  swapTarget.team = moverTeam;
  return true;
}

/**
 * Check whether swapping two players in a round would break a same-team constraint.
 */
function wouldBreakConstraint(
  round: Round,
  playerId1: string,
  playerId2: string,
  constrainedPairs: Set<string>
): boolean {
  if (constrainedPairs.size === 0) return false;

  const teammates1 = getTeammatesInRound(round, playerId1);
  const teammates2 = getTeammatesInRound(round, playerId2);

  // After the swap, player1 joins player2's old team (teammates2, minus player2, plus player1)
  // Check if player1 has a constrained partner still on their OLD team (teammates1)
  for (const tid of teammates1) {
    if (tid === playerId2) continue;
    const key = [playerId1, tid].sort().join(':');
    if (constrainedPairs.has(key)) return true;
  }

  // Check if player2 has a constrained partner still on their OLD team (teammates2)
  for (const tid of teammates2) {
    if (tid === playerId1) continue;
    const key = [playerId2, tid].sort().join(':');
    if (constrainedPairs.has(key)) return true;
  }

  return false;
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
