'use client';

import { PlayerRoundAssignment } from '@/lib/types';
import { generateScheduleCSV, downloadCSV } from '@/lib/csv-parser';

interface ExportButtonsProps {
  matrix: PlayerRoundAssignment[];
  roundCount: number;
  disabled?: boolean;
}

export default function ExportButtons({ matrix, roundCount, disabled = false }: ExportButtonsProps) {
  const handleExportCSV = () => {
    const csvContent = generateScheduleCSV(matrix, roundCount);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csvContent, `volleyball-rotation-${date}.csv`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex gap-3 print:hidden">
      <button
        onClick={handleExportCSV}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
          transition-colors duration-200
          ${disabled 
            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
        `}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export CSV
      </button>
      
      <button
        onClick={handlePrint}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
          transition-colors duration-200
          ${disabled 
            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            : 'bg-zinc-700 hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-500 text-white'
          }
        `}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print
      </button>
    </div>
  );
}
