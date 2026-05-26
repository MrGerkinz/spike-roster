'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Player, RosterSession } from '@/lib/types';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function VolunteersPanel(_: VolunteersPanelProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [loadTick, setLoadTick] = useState(0);

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

      {state.kind === 'ready' && state.sessions.length > 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Loaded {state.sessions.length} session{state.sessions.length === 1 ? '' : 's'}. Dropdown and Add button come next.
        </p>
      )}
    </div>
  );
}
