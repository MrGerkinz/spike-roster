import { describe, it, expect } from 'vitest';
import { parseRow } from './roster-parser';

describe('parseRow', () => {
  it('parses a confirmed AM session with all volunteers', () => {
    const row = [
      '30 May 2026', '2', 'AM', '11:00–1:30 PM',
      'Liam S', 'Ryan N', 'Jacob M',
      '', 'Ryan N',
      'Pending', '', 'Coaching week',
    ];
    expect(parseRow(row)).toEqual({
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
    });
  });

  it('treats blank cells as null for volunteer roles', () => {
    const row = [
      '23 May 2026', '1', 'AM', '11:00–1:30 PM',
      'Ryan N', 'Ryan N', '',
      '', '',
      'Confirmed', '', 'No coaching',
    ];
    const parsed = parseRow(row);
    expect(parsed?.skillsCoach).toBeNull();
    expect(parsed?.equipmentManager).toBe('Ryan N');
  });

  it('treats TBC (case-insensitive, trimmed) as null', () => {
    const row = [
      '13 Jun 2026', '4', 'AM', '11:00–1:30 PM',
      'Reda A', 'Ryan N', '  tbc  ',
      '', '',
      'Pending', '', 'Coaching week',
    ];
    expect(parseRow(row)?.skillsCoach).toBeNull();
  });

  it('returns null for rows with no date (spacer rows)', () => {
    expect(parseRow(['', '', '', '', '', '', '', '', '', '', '', ''])).toBeNull();
  });

  it('returns null when the date is present but unparseable', () => {
    const row = ['30 Movember 2026', '2', 'AM', '11:00–1:30 PM', 'Liam S', '', '', '', '', 'Pending', '', 'Coaching week'];
    expect(parseRow(row)).toBeNull();
  });

  it('returns null for a two-digit year (malformed date)', () => {
    const row = ['5 May 26', '1', 'AM', '11:00–1:30 PM', 'Ryan N', '', '', '', '', 'Confirmed', '', 'No coaching'];
    expect(parseRow(row)).toBeNull();
  });

  it('handles short rows (trailing empty cells omitted by Sheets API)', () => {
    const row = ['20 Jun 2026', '5', 'PM', '1:30–4:00 PM']; // no volunteers, status, etc
    const parsed = parseRow(row);
    expect(parsed?.equipmentManager).toBeNull();
    expect(parsed?.sessionFacilitator).toBeNull();
    expect(parsed?.skillsCoach).toBeNull();
    expect(parsed?.status).toBe('Pending'); // default for missing status
    expect(parsed?.notes).toBe('');
  });
});

import { parseRows } from './roster-parser';

describe('parseRows', () => {
  it('parses multiple rows and skips empty/spacer rows', () => {
    const rows = [
      ['23 May 2026', '1', 'AM', '11:00–1:30 PM', 'Ryan N', 'Ryan N', '', '', '', 'Confirmed', '', 'No coaching'],
      [],
      ['', '', '', '', '', '', '', '', '', '', '', ''],
      ['30 May 2026', '2', 'AM', '11:00–1:30 PM', 'Liam S', 'Ryan N', 'Jacob M', '', 'Ryan N', 'Pending', '', 'Coaching week'],
    ];
    const sessions = parseRows(rows);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].date).toBe('23 May 2026');
    expect(sessions[1].date).toBe('30 May 2026');
  });

  it('returns an empty array for empty input', () => {
    expect(parseRows([])).toEqual([]);
  });

  it('sorts sessions ascending by date then AM before PM regardless of input order', () => {
    const rows = [
      ['30 May 2026', '2', 'PM', '1:30–4:00 PM', 'Ryan N', '', '', '', '', 'Pending', '', 'Social games only'],
      ['23 May 2026', '1', 'AM', '11:00–1:30 PM', 'Ryan N', '', '', '', '', 'Confirmed', '', 'No coaching'],
      ['30 May 2026', '2', 'AM', '11:00–1:30 PM', 'Liam S', '', '', '', '', 'Pending', '', 'Coaching week'],
    ];
    const sessions = parseRows(rows);
    expect(sessions.map(s => `${s.dateISO}-${s.ampm}`)).toEqual([
      '2026-05-23-AM',
      '2026-05-30-AM',
      '2026-05-30-PM',
    ]);
  });
});
