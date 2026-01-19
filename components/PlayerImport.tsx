'use client';

import { useState, useCallback, useRef } from 'react';
import { Player } from '@/lib/types';
import { parsePlayersFromCSV } from '@/lib/csv-parser';

interface PlayerImportProps {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
}

export default function PlayerImport({ players, onPlayersChange }: PlayerImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      setError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = parsePlayersFromCSV(content);
        
        if (parsed.length === 0) {
          setError('No players found in the CSV file');
          return;
        }
        
        onPlayersChange(parsed);
      } catch {
        setError('Error parsing CSV file');
      }
    };
    reader.onerror = () => {
      setError('Error reading file');
    };
    reader.readAsText(file);
  }, [onPlayersChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleRemovePlayer = useCallback((id: string) => {
    onPlayersChange(players.filter(p => p.id !== id));
  }, [players, onPlayersChange]);

  const handleAddPlayer = useCallback(() => {
    const name = prompt('Enter player name:');
    if (name?.trim()) {
      const newPlayer: Player = {
        id: Math.random().toString(36).substring(2, 11),
        name: name.trim(),
      };
      onPlayersChange([...players, newPlayer]);
    }
  }, [players, onPlayersChange]);

  const handleEditPlayer = useCallback((id: string) => {
    const player = players.find(p => p.id === id);
    if (!player) return;
    
    const newName = prompt('Edit player name:', player.name);
    if (newName?.trim() && newName !== player.name) {
      onPlayersChange(
        players.map(p => p.id === id ? { ...p, name: newName.trim() } : p)
      );
    }
  }, [players, onPlayersChange]);

  const handleClearAll = useCallback(() => {
    if (confirm('Are you sure you want to remove all players?')) {
      onPlayersChange([]);
    }
  }, [onPlayersChange]);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
        Players
      </h2>
      
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="text-zinc-600 dark:text-zinc-400">
          <svg 
            className="mx-auto h-12 w-12 mb-3" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
          <p className="text-sm">
            <span className="font-medium text-blue-600 dark:text-blue-400">
              Click to upload
            </span>{' '}
            or drag and drop
          </p>
          <p className="text-xs mt-1">CSV file with player names</p>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Player list */}
      {players.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {players.length} player{players.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleAddPlayer}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Add
              </button>
              <button
                onClick={handleClearAll}
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Clear all
              </button>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {players.map((player, index) => (
                <li 
                  key={player.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <span className="text-sm text-zinc-900 dark:text-zinc-100">
                    <span className="text-zinc-400 dark:text-zinc-500 mr-2">
                      {index + 1}.
                    </span>
                    {player.name}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditPlayer(player.id)}
                      className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      title="Edit"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Remove"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {players.length === 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={handleAddPlayer}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Or add players manually
          </button>
        </div>
      )}
    </div>
  );
}
