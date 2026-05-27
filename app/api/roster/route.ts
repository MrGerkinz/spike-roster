import { NextResponse } from 'next/server';
import { parseRows } from '@/lib/roster-parser';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.ROSTER_SHEET_ID;

  if (!apiKey || !sheetId) {
    return NextResponse.json(
      { error: 'Roster source not configured' },
      { status: 503 },
    );
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Master Roster')}!A5:L?key=${apiKey}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the Google Sheets API" },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    let message = `Sheets API error ${upstream.status}`;
    if (upstream.status === 403) message = "Sheet is not shared as 'Anyone with link'. Update the sheet's share settings and try again.";
    if (upstream.status === 404) message = 'Sheet not found. Check ROSTER_SHEET_ID.';
    return NextResponse.json({ error: message }, { status: upstream.status });
  }

  const data = (await upstream.json()) as { values?: string[][] };
  const sessions = parseRows(data.values ?? []);
  return NextResponse.json({ sessions });
}
