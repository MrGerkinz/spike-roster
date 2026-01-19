import { Player, PlayerRoundAssignment } from './types';

/**
 * Parse a CSV file containing player names
 * Expects either a single column of names, or a column with header "Name" or "Player"
 */
export function parsePlayersFromCSV(csvContent: string): Player[] {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return [];
  }

  const players: Player[] = [];
  let startIndex = 0;

  // Check if first line is a header
  const firstLine = lines[0].trim().toLowerCase();
  if (firstLine === 'name' || firstLine === 'player' || firstLine === 'players' || firstLine === 'names') {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      // Handle CSV with commas - take first column
      const name = line.split(',')[0].trim().replace(/^["']|["']$/g, '');
      if (name) {
        players.push({
          id: generateId(),
          name: name,
        });
      }
    }
  }

  return players;
}

/**
 * Generate the rotation matrix as CSV content for export
 */
export function generateScheduleCSV(rotationMatrix: PlayerRoundAssignment[], roundCount: number): string {
  const headers = ['Player Name'];
  for (let i = 1; i <= roundCount; i++) {
    headers.push(`Round ${i}`);
  }

  const rows: string[] = [headers.join(',')];

  for (const player of rotationMatrix) {
    const row = [
      `"${player.playerName}"`,
      ...player.roundAssignments.map(a => a === 'BYE' ? 'BYE' : a)
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Trigger a file download in the browser
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a unique ID for a player
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
