import { Player, PlayerRoundAssignment } from './types';

/**
 * Parse a CSV file containing player names
 * Supports multiple formats:
 * - Simple one-column list of names
 * - TryBooking attendee reports (with headers and "1,Name" format)
 */
export function parsePlayersFromCSV(csvContent: string): Player[] {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return [];
  }

  const players: Player[] = [];
  let inPlayerSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect TryBooking format - look for the ticket data header
    if (line.toLowerCase().includes('ticket data') || line.toLowerCase().includes('tickets,')) {
      inPlayerSection = true;
      continue;
    }

    // Skip TryBooking footer
    if (line.toLowerCase().includes('trybooking.com')) {
      break;
    }

    // Skip common header lines
    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith('attendee') || 
        lowerLine.startsWith('event name') ||
        lowerLine.startsWith('session time') ||
        lowerLine.startsWith('booking date') ||
        lowerLine.startsWith('no. of')) {
      continue;
    }

    // Parse the line
    const parts = parseCSVLine(line);
    
    if (parts.length >= 2 && /^\d+$/.test(parts[0].trim())) {
      // TryBooking format: "1,Player Name" - take second column
      const name = parts[1].trim();
      if (name && !isHeaderText(name)) {
        players.push({
          id: generateId(),
          name: name,
        });
      }
    } else if (parts.length >= 1 && !inPlayerSection) {
      // Simple format: just the name (first column)
      const name = parts[0].trim();
      if (name && !isHeaderText(name)) {
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
 * Parse a CSV line handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  
  parts.push(current.replace(/^["']|["']$/g, ''));
  return parts;
}

/**
 * Check if text looks like a header rather than a player name
 */
function isHeaderText(text: string): boolean {
  const lower = text.toLowerCase();
  return lower === 'name' || 
         lower === 'player' || 
         lower === 'players' || 
         lower === 'names' ||
         lower.includes('ticket data') ||
         lower.includes('please put');
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
