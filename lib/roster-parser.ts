import type { RosterSession } from './types';

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function toISO(displayDate: string): string {
  // Expected input: "30 May 2026" (also tolerates extra whitespace)
  const parts = displayDate.trim().split(/\s+/);
  if (parts.length !== 3) return '';
  const [day, month, year] = parts;
  const mm = MONTHS[month.slice(0, 3).toLowerCase()];
  if (!mm) return '';
  return `${year}-${mm}-${day.padStart(2, '0')}`;
}

function nullable(cell: string | undefined): string | null {
  if (!cell) return null;
  const trimmed = cell.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'tbc') return null;
  return trimmed;
}

export function parseRow(row: string[]): RosterSession | null {
  const date = (row[0] ?? '').trim();
  if (!date) return null;

  const ampmRaw = (row[2] ?? '').trim().toUpperCase();
  const ampm: 'AM' | 'PM' = ampmRaw === 'PM' ? 'PM' : 'AM';

  const statusRaw = (row[9] ?? '').trim();
  const status: 'Confirmed' | 'Pending' = statusRaw === 'Confirmed' ? 'Confirmed' : 'Pending';

  return {
    date,
    dateISO: toISO(date),
    week: Number((row[1] ?? '').trim()) || 0,
    ampm,
    time: (row[3] ?? '').trim(),
    equipmentManager: nullable(row[4]),
    sessionFacilitator: nullable(row[5]),
    skillsCoach: nullable(row[6]),
    status,
    notes: (row[11] ?? '').trim(),
  };
}

export function parseRows(rows: string[][]): RosterSession[] {
  const out: RosterSession[] = [];
  for (const row of rows) {
    const parsed = parseRow(row);
    if (parsed) out.push(parsed);
  }
  return out;
}
