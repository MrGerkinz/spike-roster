'use client';

import { PlayerRoundAssignment } from '@/lib/types';

interface RotationMatrixProps {
  matrix: PlayerRoundAssignment[];
  roundCount: number;
}

export default function RotationMatrix({ matrix, roundCount }: RotationMatrixProps) {
  if (matrix.length === 0) {
    return null;
  }

  // Color coding for courts (includes print-specific classes)
  const getAssignmentStyle = (assignment: string | 'BYE'): string => {
    if (assignment === 'BYE') {
      return 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 print-bye';
    }
    
    const court = parseInt(assignment.charAt(0));
    const team = assignment.charAt(1);
    
    const courtColors: Record<number, { A: string; B: string }> = {
      1: { 
        A: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 print-court-1a',
        B: 'bg-blue-200 dark:bg-blue-800/40 text-blue-900 dark:text-blue-200 print-court-1b'
      },
      2: { 
        A: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 print-court-2a',
        B: 'bg-green-200 dark:bg-green-800/40 text-green-900 dark:text-green-200 print-court-2b'
      },
      3: { 
        A: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 print-court-3a',
        B: 'bg-amber-200 dark:bg-amber-800/40 text-amber-900 dark:text-amber-200 print-court-3b'
      },
      4: { 
        A: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 print-court-4a',
        B: 'bg-purple-200 dark:bg-purple-800/40 text-purple-900 dark:text-purple-200 print-court-4b'
      },
    };
    
    return courtColors[court]?.[team as 'A' | 'B'] || 'bg-zinc-100 dark:bg-zinc-800';
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 print:shadow-none print:p-0">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100 print:text-black">
        Rotation Schedule
      </h2>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-300 dark:border-zinc-600 print:border-black">
              <th className="text-left py-2 px-3 font-semibold text-zinc-700 dark:text-zinc-300 print:text-black">
                Player
              </th>
              {Array.from({ length: roundCount }, (_, i) => (
                <th 
                  key={i} 
                  className="text-center py-2 px-3 font-semibold text-zinc-700 dark:text-zinc-300 print:text-black"
                >
                  R{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((player, idx) => (
              <tr 
                key={player.playerId}
                className={`
                  border-b border-zinc-200 dark:border-zinc-700 print:border-zinc-400
                  ${idx % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-800/50 print:bg-white' : ''}
                `}
              >
                <td className="py-2 px-3 font-medium text-zinc-900 dark:text-zinc-100 print:text-black whitespace-nowrap">
                  {player.playerName}
                </td>
                {player.roundAssignments.map((assignment, roundIdx) => (
                  <td key={roundIdx} className="py-2 px-3 text-center">
                    <span 
                      className={`
                        inline-block px-2 py-1 rounded font-mono text-xs font-medium
                        print:border print:border-zinc-400
                        ${getAssignmentStyle(assignment)}
                      `}
                    >
                      {assignment}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Court legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs print:mt-2">
        <span className="text-zinc-600 dark:text-zinc-400 print:text-black font-medium">Legend:</span>
        {[1, 2, 3, 4].slice(0, Math.max(...matrix.flatMap(p => 
          p.roundAssignments
            .filter(a => a !== 'BYE')
            .map(a => parseInt(a.charAt(0)))
        ))).map(court => (
          <div key={court} className="flex items-center gap-1">
            <span className={`inline-block w-4 h-4 rounded ${
              court === 1 ? 'bg-blue-200 dark:bg-blue-800 print-legend-1' :
              court === 2 ? 'bg-green-200 dark:bg-green-800 print-legend-2' :
              court === 3 ? 'bg-amber-200 dark:bg-amber-800 print-legend-3' :
              'bg-purple-200 dark:bg-purple-800 print-legend-4'
            }`}></span>
            <span className="text-zinc-600 dark:text-zinc-400 print:text-black">Court {court}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-zinc-200 dark:bg-zinc-700 print-legend-bye"></span>
          <span className="text-zinc-600 dark:text-zinc-400 print:text-black">BYE</span>
        </div>
      </div>
    </div>
  );
}
