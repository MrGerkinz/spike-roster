'use client';

import { PlayerStats } from '@/lib/types';

interface StatsPanelProps {
  stats: Map<string, PlayerStats>;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  if (stats.size === 0) {
    return null;
  }

  const statsList = Array.from(stats.values());
  
  // Calculate averages and identify issues
  const avgUniqueTeammates = statsList.reduce((sum, s) => sum + s.uniqueTeammateCount, 0) / statsList.length;
  const avgByes = statsList.reduce((sum, s) => sum + s.byeCount, 0) / statsList.length;
  
  const minUniqueTeammates = Math.min(...statsList.map(s => s.uniqueTeammateCount));
  const maxUniqueTeammates = Math.max(...statsList.map(s => s.uniqueTeammateCount));
  
  const minByes = Math.min(...statsList.map(s => s.byeCount));
  const maxByes = Math.max(...statsList.map(s => s.byeCount));
  
  // Flag bottom 10% for teammate diversity
  const threshold = Math.floor(statsList.length * 0.1);
  const sortedByTeammates = [...statsList].sort((a, b) => a.uniqueTeammateCount - b.uniqueTeammateCount);
  const flaggedPlayers = new Set(sortedByTeammates.slice(0, Math.max(1, threshold)).map(s => s.playerId));
  
  // Sort for display: by name
  const sortedStats = [...statsList].sort((a, b) => a.playerName.localeCompare(b.playerName));

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 print:hidden">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
        Fairness Statistics
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Avg Unique Teammates
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {avgUniqueTeammates.toFixed(1)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Range: {minUniqueTeammates} - {maxUniqueTeammates}
          </div>
        </div>
        
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Avg Byes
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {avgByes.toFixed(1)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Range: {minByes} - {maxByes}
          </div>
        </div>
        
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Bye Fairness
          </div>
          <div className={`text-2xl font-bold ${
            maxByes - minByes <= 1 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {maxByes - minByes <= 1 ? 'Good' : 'Fair'}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Spread: {maxByes - minByes}
          </div>
        </div>
        
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Flagged Players
          </div>
          <div className={`text-2xl font-bold ${
            flaggedPlayers.size === 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {flaggedPlayers.size}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Bottom 10% diversity
          </div>
        </div>
      </div>

      {/* Detailed stats table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left py-2 px-2 font-medium text-zinc-600 dark:text-zinc-400">
                Player
              </th>
              <th className="text-center py-2 px-2 font-medium text-zinc-600 dark:text-zinc-400">
                Byes
              </th>
              <th className="text-center py-2 px-2 font-medium text-zinc-600 dark:text-zinc-400">
                Unique Teammates
              </th>
              <th className="text-center py-2 px-2 font-medium text-zinc-600 dark:text-zinc-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((stat) => (
              <tr 
                key={stat.playerId}
                className={`
                  border-b border-zinc-100 dark:border-zinc-800
                  ${flaggedPlayers.has(stat.playerId) 
                    ? 'bg-amber-50 dark:bg-amber-900/20' 
                    : ''
                  }
                `}
              >
                <td className="py-2 px-2 text-zinc-900 dark:text-zinc-100">
                  {stat.playerName}
                </td>
                <td className="py-2 px-2 text-center">
                  <span className={`
                    inline-block min-w-[2rem] px-2 py-0.5 rounded text-xs font-medium
                    ${stat.byeCount === maxByes && maxByes > minByes
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }
                  `}>
                    {stat.byeCount}
                  </span>
                </td>
                <td className="py-2 px-2 text-center">
                  <span className={`
                    inline-block min-w-[2rem] px-2 py-0.5 rounded text-xs font-medium
                    ${stat.uniqueTeammateCount === minUniqueTeammates && minUniqueTeammates < avgUniqueTeammates - 1
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                      : stat.uniqueTeammateCount === maxUniqueTeammates
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }
                  `}>
                    {stat.uniqueTeammateCount}
                  </span>
                </td>
                <td className="py-2 px-2 text-center">
                  {flaggedPlayers.has(stat.playerId) ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      Low diversity
                    </span>
                  ) : (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      OK
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
