'use client';

import { useState, useCallback } from 'react';
import { Player, ScheduleConfig, ScheduleResult, PlayerRoundAssignment } from '@/lib/types';
import { generateSchedule, scheduleToRotationMatrix } from '@/lib/scheduler';
import PlayerImport from '@/components/PlayerImport';
import ConfigPanel from '@/components/ConfigPanel';
import RotationMatrix from '@/components/RotationMatrix';
import StatsPanel from '@/components/StatsPanel';
import ExportButtons from '@/components/ExportButtons';

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [config, setConfig] = useState<ScheduleConfig>({
    courts: 3,
    teamSize: 7,
    rounds: 6,
  });
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [matrix, setMatrix] = useState<PlayerRoundAssignment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const playersPerRound = config.courts * 2 * config.teamSize;
  const canGenerate = players.length >= playersPerRound;

  const handleGenerate = useCallback(() => {
    if (!canGenerate) return;
    
    setIsGenerating(true);
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const scheduleResult = generateSchedule(players, config);
        setResult(scheduleResult);
        setMatrix(scheduleToRotationMatrix(scheduleResult.schedule, players));
      } catch (error) {
        console.error('Error generating schedule:', error);
      } finally {
        setIsGenerating(false);
      }
    }, 50);
  }, [players, config, canGenerate]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      {/* Header - hidden on print */}
      <header className="bg-white dark:bg-zinc-900 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Volleyball Roster Generator
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Create optimized rotation schedules for your volleyball sessions
              </p>
            </div>
            {result && (
              <ExportButtons 
                matrix={matrix} 
                roundCount={config.rounds}
                disabled={matrix.length === 0}
              />
            )}
          </div>
        </div>
      </header>

      {/* Print header - only visible on print */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-black">Volleyball Rotation Schedule</h1>
        <p className="text-sm text-zinc-600">
          {players.length} players | {config.courts} courts | {config.rounds} rounds
        </p>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
        {/* Setup section - hidden on print when schedule exists */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 ${result ? 'print:hidden' : ''}`}>
          <PlayerImport 
            players={players} 
            onPlayersChange={setPlayers} 
          />
          <ConfigPanel 
            config={config} 
            onConfigChange={setConfig}
            playerCount={players.length}
          />
        </div>

        {/* Generate button - hidden on print */}
        <div className="mb-6 print:hidden">
          <button
            onClick={result ? handleRegenerate : handleGenerate}
            disabled={!canGenerate || isGenerating}
            className={`
              w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-lg
              transition-all duration-200
              ${!canGenerate || isGenerating
                ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              }
            `}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" cy="12" r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                    fill="none"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </span>
            ) : result ? (
              'Regenerate Schedule'
            ) : (
              'Generate Schedule'
            )}
          </button>
          
          {!canGenerate && players.length > 0 && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              Need at least {playersPerRound} players for {config.courts} courts with {config.teamSize} per team
            </p>
          )}
        </div>

        {/* Warnings */}
        {result?.warnings && result.warnings.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg print:hidden">
            <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-2">Warnings</h3>
            <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-400">
              {result.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Results */}
        {result && matrix.length > 0 && (
          <div className="space-y-6">
            <RotationMatrix 
              matrix={matrix} 
              roundCount={config.rounds}
            />
            <StatsPanel stats={result.schedule.stats} />
          </div>
        )}

        {/* Empty state */}
        {!result && players.length === 0 && (
          <div className="text-center py-12 print:hidden">
            <svg 
              className="mx-auto h-16 w-16 text-zinc-400 dark:text-zinc-600 mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Get Started
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
              Upload a CSV file with player names or add players manually, 
              then configure your court settings and generate the rotation schedule.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
