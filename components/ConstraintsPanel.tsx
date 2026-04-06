'use client';

import { useState, useCallback } from 'react';
import { Player, SameTeamConstraint } from '@/lib/types';

interface ConstraintsPanelProps {
  players: Player[];
  constraints: SameTeamConstraint[];
  onConstraintsChange: (constraints: SameTeamConstraint[]) => void;
}

export default function ConstraintsPanel({
  players,
  constraints,
  onConstraintsChange,
}: ConstraintsPanelProps) {
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');

  const sortedPlayers = [...players].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const alreadyExists = (p1: string, p2: string) =>
    constraints.some(
      (c) =>
        (c.player1Id === p1 && c.player2Id === p2) ||
        (c.player1Id === p2 && c.player2Id === p1)
    );

  const canAdd =
    player1Id !== '' &&
    player2Id !== '' &&
    player1Id !== player2Id &&
    !alreadyExists(player1Id, player2Id);

  const handleAdd = useCallback(() => {
    if (!canAdd) return;
    onConstraintsChange([
      ...constraints,
      { player1Id, player2Id },
    ]);
    setPlayer1Id('');
    setPlayer2Id('');
  }, [canAdd, player1Id, player2Id, constraints, onConstraintsChange]);

  const handleRemove = useCallback(
    (index: number) => {
      onConstraintsChange(constraints.filter((_, i) => i !== index));
    },
    [constraints, onConstraintsChange]
  );

  const playerName = (id: string) =>
    players.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-1 text-zinc-900 dark:text-zinc-100">
        Same-Team Constraints
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Lock two players onto the same team every round.
      </p>

      {/* Add constraint form */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={player1Id}
          onChange={(e) => setPlayer1Id(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
        >
          <option value="">Select player…</option>
          {sortedPlayers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <span className="hidden sm:flex items-center text-zinc-400 text-sm">
          with
        </span>

        <select
          value={player2Id}
          onChange={(e) => setPlayer2Id(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
        >
          <option value="">Select player…</option>
          {sortedPlayers
            .filter((p) => p.id !== player1Id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>

        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            canAdd
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
          }`}
        >
          Add
        </button>
      </div>

      {player1Id && player2Id && player1Id === player2Id && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          Please select two different players.
        </p>
      )}
      {player1Id && player2Id && alreadyExists(player1Id, player2Id) && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          This constraint already exists.
        </p>
      )}

      {/* Constraint list */}
      {constraints.length > 0 && (
        <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-md">
          {constraints.map((c, i) => (
            <li
              key={`${c.player1Id}-${c.player2Id}`}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span className="text-zinc-900 dark:text-zinc-100">
                {playerName(c.player1Id)}{' '}
                <span className="text-zinc-400">&amp;</span>{' '}
                {playerName(c.player2Id)}
              </span>
              <button
                onClick={() => handleRemove(i)}
                className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                title="Remove constraint"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
