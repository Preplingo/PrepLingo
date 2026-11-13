import React, { useState } from 'react';
import { Zap, Mic } from 'lucide-react';
import { WordEntry, GameMode } from '../types';
import { SpeedMatchGame } from './SpeedMatchGame';
import { SpeakingPractice } from './SpeakingPractice';

interface GamesViewProps {
  words: WordEntry[];
  initialWordId?: string;
  onGameComplete?: (score: number, pairsMatched: number) => void;
  onNavigateToDictionary?: () => void;
}

export const GamesView: React.FC<GamesViewProps> = ({
  words,
  initialWordId,
  onGameComplete,
  onNavigateToDictionary,
}) => {
  const [gameMode, setGameMode] = useState<GameMode>(initialWordId ? 'speaking-check' : 'speed-match');

  return (
    <div className="space-y-6 pb-[120px]">
      {/* Game Mode Selector Segmented Tabs */}
      <div className="max-w-md mx-auto p-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl flex items-center justify-between border border-slate-200/60 dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => setGameMode('speed-match')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            gameMode === 'speed-match'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Kelime Eşleştirme</span>
        </button>

        <button
          type="button"
          onClick={() => setGameMode('speaking-check')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            gameMode === 'speaking-check'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Mic className="w-4 h-4 text-indigo-500" />
          <span>Telaffuz &amp; Konuşma</span>
        </button>
      </div>

      {/* Render Active Game */}
      {gameMode === 'speed-match' ? (
        <SpeedMatchGame
          words={words}
          onGameComplete={onGameComplete}
          onNavigateToDictionary={onNavigateToDictionary}
        />
      ) : (
        <SpeakingPractice words={words} initialWordId={initialWordId} />
      )}
    </div>
  );
};
