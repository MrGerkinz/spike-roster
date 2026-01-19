'use client';

import { ScheduleConfig } from '@/lib/types';

interface ConfigPanelProps {
  config: ScheduleConfig;
  onConfigChange: (config: ScheduleConfig) => void;
  playerCount: number;
}

export default function ConfigPanel({ config, onConfigChange, playerCount }: ConfigPanelProps) {
  const playersPerRound = config.courts * 2 * config.teamSize;
  const byesPerRound = Math.max(0, playerCount - playersPerRound);
  const totalByes = byesPerRound * config.rounds;
  const maxByesPerPlayer = playerCount > 0 ? Math.ceil(totalByes / playerCount) : 0;
  
  const hasEnoughPlayers = playerCount >= playersPerRound;
  const minPlayersNeeded = config.courts * 2 * config.teamSize;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
        Configuration
      </h2>

      <div className="space-y-4">
        {/* Courts */}
        <div>
          <label 
            htmlFor="courts" 
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Number of Courts
          </label>
          <select
            id="courts"
            value={config.courts}
            onChange={(e) => onConfigChange({ ...config, courts: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md 
                       bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={2}>2 courts (4 teams)</option>
            <option value={3}>3 courts (6 teams)</option>
            <option value={4}>4 courts (8 teams)</option>
          </select>
        </div>

        {/* Team Size */}
        <div>
          <label 
            htmlFor="teamSize" 
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Players per Team
          </label>
          <select
            id="teamSize"
            value={config.teamSize}
            onChange={(e) => onConfigChange({ ...config, teamSize: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md 
                       bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={4}>4 players</option>
            <option value={5}>5 players</option>
            <option value={6}>6 players</option>
            <option value={7}>7 players</option>
            <option value={8}>8 players</option>
          </select>
        </div>

        {/* Rounds */}
        <div>
          <label 
            htmlFor="rounds" 
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Number of Rounds
          </label>
          <select
            id="rounds"
            value={config.rounds}
            onChange={(e) => onConfigChange({ ...config, rounds: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md 
                       bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {[4, 5, 6, 7, 8, 9, 10].map(n => (
              <option key={n} value={n}>{n} rounds</option>
            ))}
          </select>
        </div>

        {/* Summary */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Summary
          </h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Players per round:</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">{playersPerRound}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Byes per round:</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {playerCount > 0 ? byesPerRound : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Max byes per player:</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {playerCount > 0 ? maxByesPerPlayer : '-'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Validation */}
        {playerCount > 0 && !hasEnoughPlayers && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Need at least {minPlayersNeeded} players for this configuration. 
              Currently have {playerCount}.
            </p>
          </div>
        )}

        {playerCount > 0 && hasEnoughPlayers && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-400">
              Ready to generate schedule for {playerCount} players
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
