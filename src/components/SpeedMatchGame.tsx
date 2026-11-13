import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  Timer,
  Trophy,
  RotateCcw,
  Play,
  Heart,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  Flame,
  Hourglass,
  Layers,
  Medal,
  BookOpen,
} from 'lucide-react';
import { WordEntry } from '../types';
import { speakText } from '../utils/textToSpeech';
import { getCefrBadgeClass } from '../utils/themeBadges';
import confetti from 'canvas-confetti';

export type DeckFilter = 'all' | 'a1-a2' | 'b1-b2' | 'favorites';
export type MatchGameMode = 'classic' | 'time_attack';

const STORAGE_KEY_TIME_ATTACK_BEST = 'preplingo_match_time_attack_best';
const STORAGE_KEY_TIME_ATTACK_BEST_ALT = 'bestTimeAttackScore';
const STORAGE_KEY_NOTEBOOK_MISTAKES = 'preplingo_match_notebook_mistakes';

interface SpeedMatchGameProps {
  words: WordEntry[];
  onGameComplete?: (finalScore: number, pairsMatched: number) => void;
  onNavigateToDictionary?: () => void;
}

/**
 * Strict Tile Schema ensuring 1-to-1 pair architecture:
 * Both English and Turkish tiles share the identical `pairId`.
 */
export interface GameTile {
  id: string; // `en_${word.id}` or `tr_${word.id}` (guaranteed globally unique key)
  pairId: string; // strictly word.id
  text: string;
  lang: 'en' | 'tr';
  wordObj: WordEntry;
}

// Fisher-Yates shuffle algorithm
function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Weighted random selection without replacement:
 * Words with higher mistake counts have a higher probability of selection.
 */
function weightedSampleWithoutReplacement<T extends { id: string }>(
  items: T[],
  weightsMap: Record<string, number>,
  k: number
): T[] {
  if (items.length <= k) return fisherYatesShuffle(items);

  const pool = [...items];
  const selected: T[] = [];

  for (let step = 0; step < k; step++) {
    const weights = pool.map((item) => 1 + (weightsMap[item.id] || 0) * 3);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let randomVal = Math.random() * totalWeight;
    let chosenIndex = 0;

    for (let i = 0; i < pool.length; i++) {
      randomVal -= weights[i];
      if (randomVal <= 0) {
        chosenIndex = i;
        break;
      }
    }

    selected.push(pool[chosenIndex]);
    pool.splice(chosenIndex, 1);
  }

  return selected;
}

export const SpeedMatchGame: React.FC<SpeedMatchGameProps> = ({
  words,
  onGameComplete,
  onNavigateToDictionary,
}) => {
  // Game Mode: 'classic' (relaxed round) vs 'time_attack' (60s countdown)
  const [gameMode, setGameMode] = useState<MatchGameMode>('classic');

  // Filter & Deck state
  const [deckFilter, setDeckFilter] = useState<DeckFilter>('all');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'round_completed'>('idle');

  // Active board tiles (6 pairs = 6 En tiles and 6 Tr tiles)
  const [enTiles, setEnTiles] = useState<GameTile[]>([]);
  const [trTiles, setTrTiles] = useState<GameTile[]>([]);

  // Selection states (firstTile and secondTile)
  const [firstSelected, setFirstSelected] = useState<GameTile | null>(null);
  const [secondSelected, setSecondSelected] = useState<GameTile | null>(null);

  // Interaction feedback states
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set());
  const [justMatchedPairId, setJustMatchedPairId] = useState<string | null>(null);
  const [mismatchTileIds, setMismatchTileIds] = useState<{ firstId: string; secondId: string } | null>(null);
  const [waveCount, setWaveCount] = useState(1);
  const [isWaveTransitioning, setIsWaveTransitioning] = useState(false);

  // Metrics & Performance tracking
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds (for classic)
  const [timeLeft, setTimeLeft] = useState(60); // 60s countdown for time attack
  const [pairsMatchedCount, setPairsMatchedCount] = useState(0); // total correct pairs matched
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [score, setScore] = useState(0);

  // Personal Best (En Yüksek Skor) in Time Attack mode
  const [personalBest, setPersonalBest] = useState<number>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY_TIME_ATTACK_BEST) ||
        localStorage.getItem(STORAGE_KEY_TIME_ATTACK_BEST_ALT);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // Adaptive mistake weight map for Kelime Defterim practice (word.id -> mistake count)
  const [notebookMistakes, setNotebookMistakes] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTEBOOK_MISTAKES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Track words that were part of any mismatch during the current wave/attempt
  const currentWaveMistakenWordIds = useRef<Set<string>>(new Set());

  // Increment (+2) on mismatch or gently decrease (-1, min 0) on first-try correct match
  const updateNotebookMistake = useCallback((wordId: string, delta: number) => {
    setNotebookMistakes((prev) => {
      const current = prev[wordId] || 0;
      const updatedValue = Math.max(0, current + delta);
      const updated = { ...prev, [wordId]: updatedValue };
      try {
        localStorage.setItem(STORAGE_KEY_NOTEBOOK_MISTAKES, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Track unused words in active deck for seamless replenishment in time-attack
  const availableReplenishPoolRef = useRef<WordEntry[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mismatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const justMatchedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTimeAttackRef = useRef(false);
  isTimeAttackRef.current = gameMode === 'time_attack';

  // Calculate pool based on active filter
  const getFilteredPool = useCallback(
    (filter: DeckFilter): WordEntry[] => {
      if (filter === 'a1-a2') {
        return words.filter((w) => w.cefrLevel === 'A1' || w.cefrLevel === 'A2');
      }
      if (filter === 'b1-b2') {
        return words.filter((w) => w.cefrLevel === 'B1' || w.cefrLevel === 'B2');
      }
      if (filter === 'favorites') {
        return words.filter((w) => Boolean(w.isFavorite));
      }
      return words;
    },
    [words]
  );

  const activePool = getFilteredPool(deckFilter);
  const savedWords = words.filter((w) => Boolean(w.isFavorite));
  const isFavoritesInsufficient = deckFilter === 'favorites' && savedWords.length < 5;

  /**
   * Helper to create a paired GameTile from a WordEntry
   */
  const createTilesFromWord = (word: WordEntry): { en: GameTile; tr: GameTile } => {
    const rawMeaning = (word.trMeaning || word.meaning || '').trim();
    const primaryMeaning = rawMeaning.split(',')[0].split(';')[0].trim() || rawMeaning || word.word;
    return {
      en: {
        id: `en_${word.id}`,
        pairId: word.id,
        text: word.word.trim(),
        lang: 'en',
        wordObj: word,
      },
      tr: {
        id: `tr_${word.id}`,
        pairId: word.id,
        text: primaryMeaning,
        lang: 'tr',
        wordObj: word,
      },
    };
  };

  /**
   * Initialize a fresh round:
   * Sets up pairs based on mode (Classic vs Time-Attack) and deck (including Kelime Defterim Smart Review),
   * populates replenishment queue, and resets timers.
   */
  const initRound = useCallback(
    (filter = deckFilter, mode = gameMode) => {
      if (mismatchTimeoutRef.current) clearTimeout(mismatchTimeoutRef.current);
      if (justMatchedTimeoutRef.current) clearTimeout(justMatchedTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);

      currentWaveMistakenWordIds.current.clear();

      let chosenWords: WordEntry[] = [];

      if (filter === 'favorites') {
        const pool = words.filter((w) => Boolean(w.isFavorite));
        if (pool.length < 5) {
          setEnTiles([]);
          setTrTiles([]);
          return false;
        }

        // Deal 5 pairs if exactly 5 words are saved, or 6 pairs per wave if 6 or more words are saved
        const sampleCount = pool.length === 5 ? 5 : Math.min(6, pool.length);
        chosenWords = weightedSampleWithoutReplacement(pool, notebookMistakes, sampleCount);

        // Remaining words in favorites become the replenishment reserve for Time Attack
        availableReplenishPoolRef.current = pool.filter((w) => !chosenWords.some((cw) => cw.id === w.id));
      } else {
        const pool = getFilteredPool(filter);
        if (pool.length === 0) {
          setEnTiles([]);
          setTrTiles([]);
          return false;
        }

        // Shuffle available words with Fisher-Yates
        const shuffledPool = fisherYatesShuffle(pool);
        const sampleCount = Math.min(6, shuffledPool.length);
        chosenWords = shuffledPool.slice(0, sampleCount);

        // Remaining words in pool become the replenishment reserve for Time Attack
        availableReplenishPoolRef.current = shuffledPool.slice(sampleCount);
      }

      const generatedEn: GameTile[] = [];
      const generatedTr: GameTile[] = [];

      chosenWords.forEach((word) => {
        const { en, tr } = createTilesFromWord(word);
        generatedEn.push(en);
        generatedTr.push(tr);
      });

      // Independently Fisher-Yates shuffle the English and Turkish columns
      setEnTiles(fisherYatesShuffle(generatedEn));
      setTrTiles(fisherYatesShuffle(generatedTr));

      // Reset selection and interaction states
      setFirstSelected(null);
      setSecondSelected(null);
      setMatchedPairIds(new Set());
      setJustMatchedPairId(null);
      setMismatchTileIds(null);
      setWaveCount(1);
      setIsWaveTransitioning(false);

      // Reset round metrics
      setElapsedTime(0);
      setTimeLeft(60);
      setPairsMatchedCount(0);
      setTotalAttempts(0);
      setMistakesCount(0);
      setStreak(0);
      setScore(0);
      return true;
    },
    [deckFilter, gameMode, getFilteredPool, words, notebookMistakes]
  );

  // Start new game round
  const handleStartGame = (filter = deckFilter, mode = gameMode) => {
    if (filter === 'favorites') {
      const favCount = words.filter((w) => Boolean(w.isFavorite)).length;
      if (favCount < 5) return;
    }
    const success = initRound(filter, mode);
    if (success) {
      setGameState('playing');
    }
  };

  // Timer effect when playing:
  // - In 'classic' mode: counts elapsed time up (0s, 1s, 2s...)
  // - In 'time_attack' mode: counts down 60s to 0s
  useEffect(() => {
    if (gameState === 'playing') {
      if (gameMode === 'time_attack') {
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              // Time's up! Finish round
              setGameState('round_completed');
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
              });
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        timerRef.current = setInterval(() => {
          setElapsedTime((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, gameMode]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (mismatchTimeoutRef.current) clearTimeout(mismatchTimeoutRef.current);
      if (justMatchedTimeoutRef.current) clearTimeout(justMatchedTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Update personal best in Time Attack
  useEffect(() => {
    if (gameState === 'round_completed' && gameMode === 'time_attack') {
      if (score > personalBest) {
        setPersonalBest(score);
        try {
          localStorage.setItem(STORAGE_KEY_TIME_ATTACK_BEST, score.toString());
          localStorage.setItem(STORAGE_KEY_TIME_ATTACK_BEST_ALT, score.toString());
        } catch {
          // ignore
        }
      }
    }
  }, [gameState, gameMode, score, personalBest]);

  // Filter change handler
  const handleFilterChange = (newFilter: DeckFilter) => {
    setDeckFilter(newFilter);
    const pool = getFilteredPool(newFilter);
    if (newFilter === 'favorites' && pool.length < 5) {
      setGameState('idle');
      return;
    }
    if (pool.length > 0 && gameState === 'playing') {
      initRound(newFilter, gameMode);
    } else if (pool.length === 0) {
      setGameState('idle');
    }
  };

  // Mode change handler (Classic vs 60s Time Attack)
  const handleModeChange = (newMode: MatchGameMode) => {
    setGameMode(newMode);
    if (gameState === 'playing') {
      initRound(deckFilter, newMode);
    }
  };

  /**
   * Full-Board Wave Refresh in Time Attack mode:
   * When all pairs on the active board are matched, immediately loads
   * a brand-new wave (shuffled English words, independently shuffled Turkish meanings)
   * while maintaining strict 1-to-1 pairId integrity.
   */
  const loadNextWave = useCallback(() => {
    let waveTarget = 6;
    if (deckFilter === 'favorites') {
      const favPool = words.filter((w) => Boolean(w.isFavorite));
      if (favPool.length < 5) return;
      waveTarget = favPool.length === 5 ? 5 : 6;
      if (availableReplenishPoolRef.current.length < waveTarget) {
        availableReplenishPoolRef.current = weightedSampleWithoutReplacement(
          favPool,
          notebookMistakes,
          Math.min(12, favPool.length)
        );
      }
    } else {
      // If available replenish pool has fewer than 6 words, resupply from activePool
      if (availableReplenishPoolRef.current.length < 6) {
        const freshPool = fisherYatesShuffle(activePool);
        availableReplenishPoolRef.current = freshPool;
      }
    }

    const nextBatch = availableReplenishPoolRef.current.splice(
      0,
      Math.min(waveTarget, availableReplenishPoolRef.current.length)
    );
    if (nextBatch.length === 0) return;

    const nextEn: GameTile[] = [];
    const nextTr: GameTile[] = [];

    nextBatch.forEach((word) => {
      const { en, tr } = createTilesFromWord(word);
      nextEn.push(en);
      nextTr.push(tr);
    });

    // Reset interaction & selection states for the fresh wave
    setMatchedPairIds(new Set());
    setFirstSelected(null);
    setSecondSelected(null);
    setJustMatchedPairId(null);
    setMismatchTileIds(null);

    // Independently Fisher-Yates shuffle the English and Turkish columns
    setEnTiles(fisherYatesShuffle(nextEn));
    setTrTiles(fisherYatesShuffle(nextTr));

    setWaveCount((prev) => prev + 1);
    setIsWaveTransitioning(true);
    setTimeout(() => {
      setIsWaveTransitioning(false);
    }, 350);
  }, [activePool, deckFilter, words, notebookMistakes]);

  /**
   * Strict Validation Logic:
   * Evaluate pair matching when user selects two tiles.
   */
  const evaluateMatch = (tile1: GameTile, tile2: GameTile) => {
    setTotalAttempts((prev) => prev + 1);

    // Strict validation: check pairId equality
    const isMatch = tile1.pairId === tile2.pairId;

    if (isMatch) {
      // Find the English word to pronounce
      const enWord = tile1.lang === 'en' ? tile1.wordObj.word : tile2.wordObj.word;
      speakText(enWord, 'en-US', 1.0);

      // Streak & score calculations
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);

      let addedPoints = 0;
      if (gameMode === 'time_attack') {
        // Base score: +10 points per correct match
        // Streak >= 3: 2x Kombo awards +20 points per match
        const isCombo = newStreak >= 3;
        addedPoints = isCombo ? 20 : 10;
      } else {
        const bonus = Math.min(newStreak * 25, 125);
        addedPoints = 100 + bonus;
      }

      setScore((prev) => prev + addedPoints);
      setPairsMatchedCount((prev) => prev + 1);

      // Flash green success highlight for 250ms
      setJustMatchedPairId(tile1.pairId);
      justMatchedTimeoutRef.current = setTimeout(() => {
        setJustMatchedPairId(null);
      }, 250);

      const matchedId = tile1.pairId;

      // Clear active selection immediately
      setFirstSelected(null);
      setSecondSelected(null);

      // If in Kelime Defterim deck and matched on the first try without prior mismatch, gently decrease mistake weight
      if (deckFilter === 'favorites') {
        if (!currentWaveMistakenWordIds.current.has(tile1.wordObj.id)) {
          updateNotebookMistake(tile1.wordObj.id, -1);
        }
      }

      // Mark pair as matched: keep in exact grid positions, faded/muted and non-interactive
      const updated = new Set(matchedPairIds);
      updated.add(matchedId);
      setMatchedPairIds(updated);

      const totalPairsOnBoard = enTiles.length;
      const isBoardCleared = updated.size >= totalPairsOnBoard && totalPairsOnBoard > 0;

      if (isBoardCleared) {
        if (gameMode === 'time_attack') {
          // In 60-Second Time-Attack Mode:
          // Once all pairs on the current board are matched, immediately generate
          // a brand-new wave with a smooth transition, continuing seamlessly until 60s expires.
          setTimeout(() => {
            loadNextWave();
          }, 280);
        } else {
          // In Classic Mode: Show the Round Summary modal as usual
          if (timerRef.current) clearInterval(timerRef.current);

          // Confetti celebration
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
          });

          if (onGameComplete) {
            onGameComplete(score + addedPoints, updated.size);
          }

          setTimeout(() => {
            setGameState('round_completed');
          }, 500);
        }
      }
    } else {
      // Mismatch: Flash soft error red and trigger smooth CSS shake animation for 500ms
      // Reset streak to 0 on an incorrect match without deducting time
      setMismatchTileIds({ firstId: tile1.id, secondId: tile2.id });
      setMistakesCount((prev) => prev + 1);
      setStreak(0);

      // In Kelime Defterim deck, increment mistake weight (+2) for both mistaken words
      if (deckFilter === 'favorites') {
        currentWaveMistakenWordIds.current.add(tile1.wordObj.id);
        currentWaveMistakenWordIds.current.add(tile2.wordObj.id);
        updateNotebookMistake(tile1.wordObj.id, 2);
        updateNotebookMistake(tile2.wordObj.id, 2);
      }

      mismatchTimeoutRef.current = setTimeout(() => {
        setMismatchTileIds(null);
        setFirstSelected(null);
        setSecondSelected(null);
      }, 500);
    }
  };

  /**
   * Tile click handler supporting flexible interaction:
   * User can click EN first then TR, or TR first then EN.
   */
  const handleTileClick = (clickedTile: GameTile) => {
    // In classic mode, ignore already matched tiles; in time attack, ignore active mismatch
    if (matchedPairIds.has(clickedTile.pairId) || mismatchTileIds) return;

    // If no tile selected yet:
    if (!firstSelected) {
      setFirstSelected(clickedTile);
      return;
    }

    // If clicking the exact same tile: deselect it
    if (firstSelected.id === clickedTile.id) {
      setFirstSelected(null);
      return;
    }

    // If clicking another tile of the SAME language: switch the selection to the new tile
    if (firstSelected.lang === clickedTile.lang) {
      setFirstSelected(clickedTile);
      return;
    }

    // Clicking a tile of the OPPOSITE language: trigger evaluation!
    setSecondSelected(clickedTile);
    evaluateMatch(firstSelected, clickedTile);
  };

  // Calculate Accuracy
  const accuracyPercentage =
    totalAttempts > 0
      ? Math.max(0, Math.round(((totalAttempts - mistakesCount) / totalAttempts) * 100))
      : 100;

  // Deck filter button options: 4 clear source options
  const filterButtons: { id: DeckFilter; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'Tümü' },
    { id: 'a1-a2', label: 'A1 - A2' },
    { id: 'b1-b2', label: 'B1 - B2' },
    { id: 'favorites', label: 'Kelime Defterim 📖', icon: <BookOpen className="w-3.5 h-3.5 text-rose-500 shrink-0" /> },
  ];

  return (
    <div className="space-y-4 max-w-2xl mx-auto min-h-screen pb-[140px]">
      {/* 1. Mode & Deck Selector (Top Controls) */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        {/* Game Mode Segmented Switch: ONLY 2 Gameplay Style Modes (Klasik, 60s Yarış) */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5 px-0.5">
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleModeChange('classic')}
              className={`flex-1 sm:flex-initial py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                gameMode === 'classic'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Klasik</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('time_attack')}
              className={`flex-1 sm:flex-initial py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                gameMode === 'time_attack'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Hourglass className="w-3.5 h-3.5 text-amber-500" />
              <span>60s Yarış ⏱️</span>
            </button>
          </div>

          {/* Time Attack Best Badge */}
          {gameMode === 'time_attack' && personalBest > 0 && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-[11px] font-bold text-amber-700 dark:text-amber-300 font-mono">
              <Medal className="w-3.5 h-3.5 text-amber-500" />
              <span>Rekor: {personalBest}</span>
            </div>
          )}

          {gameState === 'playing' && (
            <button
              type="button"
              onClick={() => handleStartGame(deckFilter, gameMode)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-3 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title="Yeni tur başlat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Yenile</span>
            </button>
          )}
        </div>

        {/* 2. Unified Deck / Source Selector in the Second Row ("Kelime Destesi") */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3 h-3 text-slate-400" />
              <span>Kelime Destesi:</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {deckFilter === 'favorites'
                ? `${savedWords.length} kayıtlı kelime (Akıllı Tekrar)`
                : `${activePool.length.toLocaleString('tr-TR')} kelime aktif`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl">
            {filterButtons.map((btn) => {
              const isActive = deckFilter === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => handleFilterChange(btn.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                    isActive
                      ? btn.id === 'favorites'
                        ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {btn.icon}
                  <span className="truncate">{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Single Unified Empty State when Kelime Defterim has fewer than 5 saved words */}
      {isFavoritesInsufficient && (
        <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-rose-200 dark:border-rose-900/50 space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-500">
            <BookOpen className="w-8 h-8 text-rose-500" />
          </div>
          <div className="space-y-3 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
              Kelime Defterim ile eşleştirme oynamak için önce sözlükten en az 5 kelime ekleyin. (Mevcut: {savedWords.length} / 5)
            </h3>
            {/* Progress bar towards 5 words */}
            <div className="w-48 max-w-full mx-auto bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (savedWords.length / 5) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Defterinize eklediğiniz kelimeler burada akıllı tekrar algoritmasıyla sunulur. Hata yaptığınız kelimeler pekişene kadar daha sık sorulur.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            {onNavigateToDictionary && (
              <button
                type="button"
                onClick={onNavigateToDictionary}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                <span>Sözlüğe Git ve Kelime Ekle</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleFilterChange('all')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Tüm Seviyeleri Oyna</span>
            </button>
          </div>
        </div>
      )}

      {/* Idle Screen (Pre-game Intro) */}
      {!isFavoritesInsufficient && activePool.length > 0 && gameState === 'idle' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-2xs text-center space-y-6">
          <div
            className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border ${
              gameMode === 'time_attack'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-500 border-amber-200 dark:border-amber-800'
                : deckFilter === 'favorites'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 border-rose-200 dark:border-rose-800'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
            }`}
          >
            {gameMode === 'time_attack' ? (
              <Hourglass className="w-8 h-8 text-amber-500" />
            ) : deckFilter === 'favorites' ? (
              <BookOpen className="w-8 h-8 text-rose-500" />
            ) : (
              <Zap className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit'] text-slate-900 dark:text-white">
              {gameMode === 'time_attack'
                ? '60 Saniye Zamana Karşı Yarış ⏱️'
                : deckFilter === 'favorites'
                ? 'Kelime Defterim: Akıllı Tekrar 📖'
                : 'Kelime Eşleştirme Oyunu'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {gameMode === 'time_attack'
                ? deckFilter === 'favorites'
                  ? 'Kelime defterinizdeki kelimelerle 60 saniye boyunca yarışın! Hata yaptığınız kelimeler pekişene kadar daha sık karşınıza gelir.'
                  : '60 saniye boyunca eşleşen her kelimenin yerine anında yenisi gelir! Akıcı kalın, serinizi bozmadan rekor puanı yakalayın.'
                : deckFilter === 'favorites'
                ? 'Kelime Defterinizdeki kelimelerle akıllı pratik yapın. Geçmişte hata yaptığınız kelimeler pekişene kadar daha sık sorulur.'
                : 'Her turda 6 İngilizce kelime ile Türkçe karşılıklarını en kısa sürede ve en az hatayla eşleştirin!'}
            </p>
          </div>

          {gameMode === 'time_attack' && personalBest > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs font-bold text-amber-800 dark:text-amber-200">
              <Medal className="w-4 h-4 text-amber-500" />
              <span>Kişisel En İyi Skorunuz: {personalBest} Puan</span>
            </div>
          )}

          {deckFilter === 'favorites' && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 font-mono">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>{savedWords.length} Kayıtlı Kelime</span>
              </span>
              {savedWords.filter((w) => (notebookMistakes[w.id] || 0) > 0).length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-200 font-mono">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>
                    {savedWords.filter((w) => (notebookMistakes[w.id] || 0) > 0).length} Tekrar Odaklı
                  </span>
                </span>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => handleStartGame(deckFilter, gameMode)}
              className="w-full sm:w-auto my-2 mx-auto bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-3.5 px-9 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[52px]"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>
                {gameMode === 'time_attack'
                  ? '60s Yarışı Başlat ⏱️'
                  : deckFilter === 'favorites'
                  ? `Alıştırmaya Başla (${savedWords.length === 5 ? 5 : 6} Çift)`
                  : 'Eşleştirmeye Başla (6 Çift)'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Active Game Arena */}
      {!isFavoritesInsufficient && gameState === 'playing' && (
        <div className="space-y-4">
          {/* Top Live Metrics Dashboard Bar */}
          <div
            className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border transition-all shadow-2xs flex items-center justify-between gap-2 sm:gap-4 ${
              gameMode === 'time_attack' && timeLeft <= 10
                ? 'border-rose-400/80 dark:border-rose-800/80 ring-2 ring-rose-500/20'
                : 'border-slate-200/80 dark:border-slate-800'
            }`}
          >
            {/* Timer: Live countdown in time-attack vs elapsed in classic */}
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-xl transition-all ${
                  gameMode === 'time_attack' && timeLeft <= 10
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/40 animate-pulse'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {gameMode === 'time_attack' ? (
                  <Hourglass className={`w-4 h-4 sm:w-5 sm:h-5 ${timeLeft <= 10 ? 'animate-spin' : ''}`} />
                ) : (
                  <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  {gameMode === 'time_attack' ? 'Kalan Süre' : 'Süre'}
                </span>
                <span
                  className={`text-base sm:text-lg font-mono tabular-nums ${
                    gameMode === 'time_attack' && timeLeft <= 10
                      ? 'text-rose-600 dark:text-rose-400 font-black animate-pulse'
                      : 'font-extrabold text-slate-900 dark:text-white'
                  }`}
                >
                  {gameMode === 'time_attack' ? `${timeLeft}s` : `${elapsedTime}s`}
                </span>
              </div>
            </div>

            {/* Matched Count */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Doğru Eşleşme</span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                  {gameMode === 'time_attack' ? pairsMatchedCount : `${matchedPairIds.size} / ${enTiles.length}`}
                </span>
              </div>
            </div>

            {/* Streak & 2x Kombo Badge */}
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-xl transition-all ${
                  gameMode === 'time_attack' && streak >= 3
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                }`}
              >
                <Flame className={`w-4 h-4 sm:w-5 sm:h-5 ${streak >= 3 ? 'animate-bounce' : streak > 1 ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Seri</span>
                  {gameMode === 'time_attack' && streak >= 3 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-linear-to-r from-amber-500 to-rose-500 text-[9px] font-black text-white tracking-wider animate-bounce shadow-xs whitespace-nowrap">
                      2x Kombo 🔥
                    </span>
                  )}
                </div>
                <span
                  className={`text-base sm:text-lg font-extrabold font-mono ${
                    gameMode === 'time_attack' && streak >= 3
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {streak}x
                </span>
              </div>
            </div>

            {/* Total Score */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Puan</span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                  {score}
                </span>
              </div>
            </div>
          </div>

          {/* Time Attack Progress Bar with 10s soft red alert */}
          {gameMode === 'time_attack' && (
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden transition-all">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeLeft <= 10
                    ? 'bg-rose-500 animate-pulse shadow-md shadow-rose-500/40'
                    : 'bg-linear-to-r from-amber-500 to-indigo-500'
                }`}
                style={{ width: `${(timeLeft / 60) * 100}%` }}
              />
            </div>
          )}

          {/* Time Attack Wave Sub-header */}
          {gameMode === 'time_attack' && (
            <div className="flex items-center justify-between text-xs px-1 text-slate-500 font-medium">
              <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-[11px] font-mono">
                  Dalga {waveCount}
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  ({matchedPairIds.size} / {enTiles.length} eşleşti)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                6 çift tamamlandığında yeni dalga gelir
              </span>
            </div>
          )}

          {/* Cards Matching Arena (2 Columns: 6 En & 6 Tr) */}
          <div
            className={`grid grid-cols-2 gap-3 sm:gap-4 pt-1 transition-all duration-300 ${
              isWaveTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
            }`}
          >
            {/* English Words Column */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  İngilizce Kelime
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {enTiles.length} Kart
                </span>
              </div>

              {enTiles.map((tile) => {
                const isMatched = matchedPairIds.has(tile.pairId);
                const isJustMatched = justMatchedPairId === tile.pairId;
                const isSelected = firstSelected?.id === tile.id || secondSelected?.id === tile.id;
                const isMismatch = mismatchTileIds?.firstId === tile.id || mismatchTileIds?.secondId === tile.id;
                const isWeak = (notebookMistakes[tile.wordObj.id] || 0) > 0;

                let stateClasses =
                  'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-600 active:scale-98 shadow-2xs';

                if (isJustMatched) {
                  stateClasses =
                    'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-800 dark:text-emerald-200 ring-4 ring-emerald-500/30 scale-[1.02] transition-all duration-250 shadow-md';
                } else if (isMatched) {
                  stateClasses =
                    'opacity-35 bg-slate-100/70 dark:bg-slate-800/40 border-slate-300 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 cursor-default scale-[0.98] pointer-events-none transition-all duration-300';
                } else if (isMismatch) {
                  stateClasses =
                    'bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-700 dark:text-rose-200 ring-4 ring-rose-500/20 animate-shake shadow-md';
                } else if (isSelected) {
                  stateClasses =
                    'bg-indigo-50/90 dark:bg-indigo-950/90 border-indigo-600 text-indigo-700 dark:text-indigo-200 shadow-md ring-4 ring-indigo-500/25 scale-[1.02]';
                }

                return (
                  <button
                    key={tile.id}
                    type="button"
                    disabled={isMatched}
                    onClick={() => handleTileClick(tile)}
                    className={`w-full min-h-[62px] p-3 sm:p-3.5 rounded-2xl text-left border-2 font-semibold text-sm sm:text-base select-none flex items-center justify-between cursor-pointer ${stateClasses}`}
                  >
                    <div className="flex items-center gap-2 truncate mr-1.5">
                      {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      <span className="font-['Outfit'] tracking-tight truncate">{tile.text}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isWeak && !isMatched && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 flex items-center gap-0.5 font-bold shrink-0"
                          title="Hata yapılan kelime - tekrar odaklı"
                        >
                          <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                          <span className="hidden sm:inline">Tekrar</span>
                          <span className="sm:hidden">!</span>
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 font-mono ${
                          isMatched ? 'opacity-40 grayscale' : getCefrBadgeClass(tile.wordObj.cefrLevel)
                        }`}
                      >
                        {tile.wordObj.cefrLevel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Turkish Meanings Column */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Türkçe Anlam
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {trTiles.length} Kart
                </span>
              </div>

              {trTiles.map((tile) => {
                const isMatched = matchedPairIds.has(tile.pairId);
                const isJustMatched = justMatchedPairId === tile.pairId;
                const isSelected = firstSelected?.id === tile.id || secondSelected?.id === tile.id;
                const isMismatch = mismatchTileIds?.firstId === tile.id || mismatchTileIds?.secondId === tile.id;

                let stateClasses =
                  'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-600 active:scale-98 shadow-2xs';

                if (isJustMatched) {
                  stateClasses =
                    'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-800 dark:text-emerald-200 ring-4 ring-emerald-500/30 scale-[1.02] transition-all duration-250 shadow-md';
                } else if (isMatched) {
                  stateClasses =
                    'opacity-35 bg-slate-100/70 dark:bg-slate-800/40 border-slate-300 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 cursor-default scale-[0.98] pointer-events-none transition-all duration-300';
                } else if (isMismatch) {
                  stateClasses =
                    'bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-700 dark:text-rose-200 ring-4 ring-rose-500/20 animate-shake shadow-md';
                } else if (isSelected) {
                  stateClasses =
                    'bg-indigo-50/90 dark:bg-indigo-950/90 border-indigo-600 text-indigo-700 dark:text-indigo-200 shadow-md ring-4 ring-indigo-500/25 scale-[1.02]';
                }

                return (
                  <button
                    key={tile.id}
                    type="button"
                    disabled={isMatched}
                    onClick={() => handleTileClick(tile)}
                    className={`w-full min-h-[62px] p-3 sm:p-3.5 rounded-2xl text-left border-2 font-medium text-xs sm:text-sm select-none flex items-center justify-between cursor-pointer ${stateClasses}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      <span className="line-clamp-2 leading-snug">{tile.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Round Summary & Results Modal */}
      {gameState === 'round_completed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            {/* Header Icon */}
            <div
              className={`w-18 h-18 mx-auto rounded-3xl flex items-center justify-center border shadow-md ${
                gameMode === 'time_attack'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-500 border-amber-200 dark:border-amber-800/80'
                  : deckFilter === 'favorites'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 border-rose-200 dark:border-rose-800/80'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80'
              }`}
            >
              {gameMode === 'time_attack' ? (
                <Hourglass className="w-9 h-9" />
              ) : deckFilter === 'favorites' ? (
                <BookOpen className="w-9 h-9" />
              ) : (
                <Sparkles className="w-9 h-9" />
              )}
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit'] text-slate-900 dark:text-white">
                {gameMode === 'time_attack'
                  ? 'Süre Doldu! ⏱️ Harika Yarış'
                  : deckFilter === 'favorites'
                  ? 'Tebrikler! Defter Paketi Tamamlandı 📖'
                  : 'Tebrikler! Tur Tamamlandı 🎉'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {gameMode === 'time_attack'
                  ? `60 saniye boyunca toplam ${pairsMatchedCount} kelime çifti başarıyla eşleştirdiniz!`
                  : `${enTiles.length} kelime çiftini başarıyla eşleştirdiniz!`}
              </p>
            </div>

            {/* Metrics Scorecard: 4-Item Comprehensive Grid for Time Attack */}
            {gameMode === 'time_attack' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 text-center">
                {/* 1. Total Points */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Toplam Puan
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {score}
                  </span>
                </div>

                {/* 2. Matched Pairs */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Eşleşen Çift
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {pairsMatchedCount}
                  </span>
                </div>

                {/* 3. Max Streak */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Maks Seri
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-amber-500 font-mono">
                    {maxStreak}x
                  </span>
                </div>

                {/* 4. Personal Best */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    En İyi Skor
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-rose-500 dark:text-rose-400 font-mono">
                    {Math.max(score, personalBest)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Geçen Süre
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {elapsedTime}s
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Hata Sayısı
                  </span>
                  <span
                    className={`text-xl sm:text-2xl font-black font-mono ${
                      mistakesCount === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                    }`}
                  >
                    {mistakesCount}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Toplam Skor
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {score}
                  </span>
                </div>
              </div>
            )}

            {/* Badges / High Score Callout */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
              {gameMode === 'time_attack' && (
                <span className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 flex items-center gap-1 font-mono">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Maks Seri: {maxStreak}x {maxStreak >= 3 ? '(2x Kombo 🔥)' : ''}
                </span>
              )}

              {gameMode === 'time_attack' && (
                <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60 flex items-center gap-1 font-mono">
                  <Layers className="w-3.5 h-3.5 text-purple-500" />
                  Dalga Sayısı: {waveCount}
                </span>
              )}

              {gameMode === 'time_attack' && (
                <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1 font-mono">
                  <Medal className="w-3.5 h-3.5 text-emerald-500" />
                  {score >= personalBest && score > 0 ? '🏆 Yeni Rekor Kırdınız!' : `Kişisel Rekor: ${personalBest}`}
                </span>
              )}

              {deckFilter === 'favorites' && (
                <span className="px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1 font-mono">
                  <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                  Akıllı Tekrar Paketi
                </span>
              )}

              <span className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                İsabet: %{accuracyPercentage}
              </span>
            </div>

            {/* Action Buttons: Tekrar Oyna / Yeni Paket and Oyuna Geri Dön */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleStartGame(deckFilter, gameMode)}
                className="w-full sm:flex-1 py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {gameMode === 'time_attack'
                    ? 'Tekrar Yarış ⏱️'
                    : deckFilter === 'favorites'
                    ? 'Yeni Paket (Defterim) 📖'
                    : 'Tekrar Oyna / Yeni Paket'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGameState('idle')}
                className="w-full sm:flex-1 py-3.5 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Oyuna Geri Dön</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
