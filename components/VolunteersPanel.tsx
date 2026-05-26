'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Player, RosterSession } from '@/lib/types';
import { mergeVolunteersIntoPlayers } from '@/lib/merge-volunteers';

interface VolunteersPanelProps {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unconfigured' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; sessions: RosterSession[] };

async function fetchRoster(): Promise<LoadState> {
  const res = await fetch('/api/roster');
  if (res.status === 503) {
    return { kind: 'unconfigured' };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    return { kind: 'error', message: (body as { error?: string }).error ?? `HTTP ${res.status}` };
  }
  const body = (await res.json()) as { sessions: RosterSession[] };
  return { kind: 'ready', sessions: body.sessions };
}

function sessionKey(s: RosterSession): string {
  return `${s.dateISO}-${s.ampm}`;
}

function pickDefaultSessionKey(sessions: RosterSession[]): string | null {
  if (sessions.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const future = sessions.find(s => s.dateISO >= today);
  return sessionKey(future ?? sessions[sessions.length - 1]);
}

export default function VolunteersPanel({ players, onPlayersChange }: VolunteersPanelProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [loadTick, setLoadTick] = useState(0);
  const [manualKey, setManualKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRoster()
      .then((next) => { if (!cancelled) setState(next); })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({ kind: 'error', message: e instanceof Error ? e.message : 'Network error' });
        }
      });
    return () => { cancelled = true; };
  }, [loadTick]);

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    setLoadTick(t => t + 1);
  }, []);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
        Session volunteers
      </h2>

      {state.kind === 'loading' && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading roster…</p>
      )}

      {state.kind === 'unconfigured' && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Roster source not configured. See the README for setup steps.
        </p>
      )}

      {state.kind === 'error' && (
        <div className="text-sm">
          <p className="text-red-600 dark:text-red-400 mb-2">{state.message}</p>
          <button
            onClick={load}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {state.kind === 'ready' && state.sessions.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No upcoming sessions in roster.</p>
      )}

      {state.kind === 'ready' && state.sessions.length > 0 && (() => {
        const sessions = state.sessions;
        const defaultKey = pickDefaultSessionKey(sessions);
        const activeKey = (manualKey && sessions.some(s => sessionKey(s) === manualKey))
          ? manualKey
          : defaultKey;
        const selected = sessions.find(s => sessionKey(s) === activeKey) ?? sessions[0];
        const hasAnyVolunteer =
          selected.equipmentManager !== null ||
          selected.sessionFacilitator !== null ||
          selected.skillsCoach !== null;
        const handleAdd = () => {
          onPlayersChange(mergeVolunteersIntoPlayers(players, selected));
        };
        const roleRow = (label: string, value: string | null) => (
          <div className="flex justify-between text-sm py-1">
            <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
            <span className={value ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600'}>
              {value ?? '—'}
            </span>
          </div>
        );
        return (
          <div className="space-y-3">
            <select
              value={sessionKey(selected)}
              onChange={(e) => setManualKey(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              {sessions.map(s => (
                <option key={sessionKey(s)} value={sessionKey(s)}>
                  {s.date} · {s.ampm} · {s.notes || s.status}
                </option>
              ))}
            </select>

            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2">
              {roleRow('Equipment Manager', selected.equipmentManager)}
              {roleRow('Session Facilitator', selected.sessionFacilitator)}
              {roleRow('Skills Coach', selected.skillsCoach)}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleAdd}
                disabled={!hasAnyVolunteer}
                className={`px-4 py-2 rounded-md text-sm font-medium
                  ${hasAnyVolunteer
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                  }`}
              >
                Add volunteers to roster
              </button>
              <button
                onClick={load}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Refresh
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
