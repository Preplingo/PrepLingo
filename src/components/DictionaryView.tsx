import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Volume2,
  Bookmark,
  Heart,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  Mic,
  CheckCircle2,
  Clock,
  Filter,
  ArrowUpRight,
  ArrowRight,
  BookA,
  Globe,
  Loader2,
  WifiOff
} from 'lucide-react';
import { WordEntry, CefrFilter, PosFilter, WordStatus } from '../types';
import { fastMatchWord, getWordSearchIndex, normalizeForSearch } from '../utils/turkishSearch';
import { speakText } from '../utils/textToSpeech';
import { getCefrBadgeClass, getPosBadgeClass, getPosTurkishLabel } from '../utils/themeBadges';
import { VerbConjugationBadge } from '../utils/verbConjugation';
import {
  generalDictionary,
  searchGeneralDictionary,
  ensureGeneralDictionaryLoaded,
} from '../data/generalDictionaryLoader';
import { searchEssentialFallback } from '../data/essentialFallback';
import { lookupOnlineDictionary, getCachedOnlineWord } from '../utils/onlineDictionary';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface DictionaryViewProps {
  words: WordEntry[];
  onToggleFavorite: (id: string) => void;
  onUpdateStatus?: (id: string, status: WordStatus) => void;
  onPracticeWord?: (word: WordEntry) => void;
}

const getPosAbbr = (pos: string) => {
  switch (pos) {
    case 'noun': return 'n';
    case 'verb': return 'v';
    case 'adjective': return 'adj';
    case 'adverb': return 'adv';
    default: return pos;
  }
};

export const DictionaryView: React.FC<DictionaryViewProps> = ({
  words,
  onToggleFavorite,
  onUpdateStatus,
  onPracticeWord,
}) => {
  // View mode switcher: standard (Sözlük Arama) vs directory (A-Z Dizin)
  const [viewMode, setViewMode] = useState<'standard' | 'directory'>('standard');

  // Track lazy load state of the general dictionary
  const [isGeneralDictLoaded, setIsGeneralDictLoaded] = useState(() => generalDictionary.getIsLoaded());

  useEffect(() => {
    return generalDictionary.subscribe(() => {
      setIsGeneralDictLoaded(true);
    });
  }, []);

  // Directory Mode states: default Part of Speech is 'verb' (Fiil) as requested
  const [directoryPos, setDirectoryPos] = useState<PosFilter>('verb');
  const [selectedLetter, setSelectedLetter] = useState<string>('A');
  const [expandedDirCardId, setExpandedDirCardId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [cefrFilter, setCefrFilter] = useState<CefrFilter>('Tümü');
  const [posFilter, setPosFilter] = useState<PosFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ogrenildi' | 'calisiliyor'>('all');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Tier 3 Online Dictionary Fallback states
  const [onlineResults, setOnlineResults] = useState<WordEntry[]>([]);
  const [isOnlineLoading, setIsOnlineLoading] = useState(false);
  const [onlineErrorReason, setOnlineErrorReason] = useState<'offline' | 'not_found' | 'network_error' | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [searchSubmitCount, setSearchSubmitCount] = useState(0);
  const forceImmediateRef = useRef(false);

  // Progressive batch rendering for scaling smoothly to 1000+ words
  const [visibleBatchCount, setVisibleBatchCount] = useState(30);

  // Autocomplete dropdown & keyboard friendly states
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [highlightedWordId, setHighlightedWordId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Track live browser online/offline state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Reset pagination batch count when search or filters change
  useEffect(() => {
    setVisibleBatchCount(30);
  }, [searchQuery, cefrFilter, posFilter, statusFilter]);

  // Compute word counts per letter for the alphabet selector given the current directory POS filter
  const letterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const char of ALPHABET) {
      counts[char] = 0;
    }
    for (const w of words) {
      if (directoryPos !== 'all' && w.partOfSpeech !== directoryPos) continue;
      const firstChar = w.word.charAt(0).toUpperCase();
      if (counts[firstChar] !== undefined) {
        counts[firstChar]++;
      }
    }
    return counts;
  }, [words, directoryPos]);

  // Words matching the selected letter and directory POS filter
  const directoryWords = useMemo(() => {
    return words
      .filter((w) => {
        if (directoryPos !== 'all' && w.partOfSpeech !== directoryPos) return false;
        return w.word.toUpperCase().startsWith(selectedLetter);
      })
      .sort((a, b) => a.word.localeCompare(b.word));
  }, [words, directoryPos, selectedLetter]);

  // Generate top 5 autocomplete candidate suggestions with indexed prefix matching.
  // First searches the primary rich prep dataset; backfills with secondary general dictionary if fewer than 5.
  const suggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const normQuery = normalizeForSearch(query);

    const scored = words
      .map((word) => {
        const index = getWordSearchIndex(word);

        let score = 0;
        if (index.wordLower === query) score = 100;
        else if (index.wordLower.startsWith(query)) score = 85;
        else if (index.wordNorm.startsWith(normQuery)) score = 80;
        else if (index.meaningLower.startsWith(query) || index.meaningNorm.startsWith(normQuery)) score = 75;
        else if (index.wordNorm.includes(normQuery)) score = 55;
        else if (index.meaningNorm.includes(normQuery)) score = 45;

        return { word, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.word.word.localeCompare(b.word.word));

    const primaryResults = scored.slice(0, 5).map((item) => item.word);
    const seenWords = new Set(primaryResults.map((w) => w.word.toLowerCase()));

    // 1. If fewer than 5 primary suggestions, backfill from essential fallback dataset
    if (primaryResults.length < 5) {
      const needed = 5 - primaryResults.length;
      const essentialMatches = searchEssentialFallback(query, needed + 5);

      for (const essWord of essentialMatches) {
        if (!seenWords.has(essWord.word.toLowerCase())) {
          seenWords.add(essWord.word.toLowerCase());
          primaryResults.push(essWord);
          if (primaryResults.length >= 5) break;
        }
      }
    }

    // 2. If still fewer than 5 primary suggestions, backfill from secondary compact general dictionary
    if (primaryResults.length < 5) {
      const needed = 5 - primaryResults.length;
      const generalMatches = searchGeneralDictionary(query, needed + 5);

      for (const genWord of generalMatches) {
        if (!seenWords.has(genWord.word.toLowerCase())) {
          seenWords.add(genWord.word.toLowerCase());
          primaryResults.push(genWord);
          if (primaryResults.length >= 5) break;
        }
      }
    }

    return primaryResults;
  }, [words, searchQuery, isGeneralDictLoaded]);

  // Click outside listener to dismiss suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setIsInputFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Explicit Search Submit handler (Arrow button click or mobile/desktop Enter key)
  const handleExplicitSearch = () => {
    setShowSuggestions(false);
    setIsInputFocused(false);
    setActiveSuggestionIndex(-1);
    inputRef.current?.blur();
    ensureGeneralDictionaryLoaded();

    const trimmed = searchQuery.trim();
    if (trimmed.length >= 2 && !hasExactLocalMatch) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setIsOnline(false);
        setOnlineResults([]);
        setIsOnlineLoading(false);
        setOnlineErrorReason('offline');
        return;
      }
      forceImmediateRef.current = true;
      setSearchSubmitCount((prev) => prev + 1);
    }
  };

  // Keyboard navigation within suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === 'Enter') {
      if (showSuggestions && suggestions.length > 0 && activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeSuggestionIndex]);
      } else {
        e.preventDefault();
        handleExplicitSearch();
      }
      return;
    }

    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    }
  };

  // Handle selecting an autocomplete suggestion item
  const handleSelectSuggestion = (word: WordEntry) => {
    setSearchQuery(word.word);
    setShowSuggestions(false);
    setIsInputFocused(false);
    setActiveSuggestionIndex(-1);

    // Dismiss virtual keyboard on mobile so screen isn't obstructed
    inputRef.current?.blur();

    // Reset filters if they would hide the chosen card
    if (word.isGeneralDict || word.cefrLevel === 'Genel') {
      setCefrFilter('Tümü');
    } else if (cefrFilter === 'A1-A2' && (word.cefrLevel === 'B1' || word.cefrLevel === 'B2')) {
      setCefrFilter('Tümü');
    } else if (cefrFilter === 'B1-B2' && (word.cefrLevel === 'A1' || word.cefrLevel === 'A2')) {
      setCefrFilter('Tümü');
    }

    if (posFilter !== 'all' && word.partOfSpeech !== posFilter) {
      setPosFilter('all');
    }

    if (statusFilter !== 'all' && word.status !== statusFilter) {
      setStatusFilter('all');
    }

    // Ensure selected card is within the rendered progressive slice
    const targetIdx = words.findIndex((w) => w.id === word.id);
    if (targetIdx >= visibleBatchCount) {
      setVisibleBatchCount(targetIdx + 20);
    }

    // Scroll to & highlight the selected card
    setHighlightedWordId(word.id);

    setTimeout(() => {
      const cardEl = document.getElementById(`word-card-${word.id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);

    setTimeout(() => {
      setHighlightedWordId(null);
    }, 2800);
  };

  // 3-Tier Search Pipeline:
  // Tier 1: Search dictionaryData.json (+ essentialFallback merged into words).
  // Tier 2: Search essentialFallback and generalDictionary.json whenever exact word match isn't in Tier 1.
  const { localMatches, isFromGeneralDict } = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    const trimmedLower = trimmedQuery.toLowerCase();

    // Tier 1: Primary rich prep search
    const primaryMatches = words.filter((item) => {
      // CEFR Filter
      if (cefrFilter === 'A1-A2') {
        if (item.cefrLevel !== 'A1' && item.cefrLevel !== 'A2') return false;
      } else if (cefrFilter === 'B1-B2') {
        if (item.cefrLevel !== 'B1' && item.cefrLevel !== 'B2') return false;
      }

      // Part of speech filter
      if (posFilter !== 'all' && item.partOfSpeech !== posFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (item.status !== statusFilter) return false;
      }

      // Fast pre-indexed tokenized search query matching (< 0.5ms on 1000+ words)
      if (trimmedQuery) {
        return fastMatchWord(item, trimmedQuery);
      }

      return true;
    });

    if (!trimmedQuery) {
      return { localMatches: primaryMatches, isFromGeneralDict: false };
    }

    const primaryHasExact = primaryMatches.some(
      (w) => w.word.toLowerCase().trim() === trimmedLower
    );

    if (primaryHasExact) {
      return { localMatches: primaryMatches, isFromGeneralDict: false };
    }

    // Tier 2a: Essential everyday & academic fallback search (synchronous, instant)
    const essentialMatches = searchEssentialFallback(trimmedQuery, 40).filter((item) => {
      if (posFilter !== 'all' && item.partOfSpeech !== posFilter) {
        return false;
      }
      return true;
    });

    const essentialHasExact = essentialMatches.some(
      (w) => w.word.toLowerCase().trim() === trimmedLower
    );

    if (essentialHasExact) {
      const seen = new Set(essentialMatches.map((w) => w.word.toLowerCase().trim()));
      const merged = [
        ...essentialMatches,
        ...primaryMatches.filter((w) => !seen.has(w.word.toLowerCase().trim())),
      ];
      return { localMatches: merged, isFromGeneralDict: false };
    }

    // Tier 2b: Secondary compact general dataset (30,000+ words)
    const generalMatches = searchGeneralDictionary(trimmedQuery, 40).filter((item) => {
      if (posFilter !== 'all' && item.partOfSpeech !== posFilter) {
        return false;
      }
      return true;
    });

    const generalExactMatches = generalMatches.filter(
      (w) => w.word.toLowerCase().trim() === trimmedLower
    );

    if (generalExactMatches.length > 0) {
      const seen = new Set(generalMatches.map((w) => w.word.toLowerCase().trim()));
      const merged = [
        ...generalMatches,
        ...essentialMatches.filter((w) => !seen.has(w.word.toLowerCase().trim())),
        ...primaryMatches.filter((w) => !seen.has(w.word.toLowerCase().trim())),
      ];
      return {
        localMatches: merged,
        isFromGeneralDict: primaryMatches.length === 0 && essentialMatches.length === 0,
      };
    }

    if (primaryMatches.length > 0) {
      return { localMatches: primaryMatches, isFromGeneralDict: false };
    }

    if (essentialMatches.length > 0) {
      return { localMatches: essentialMatches, isFromGeneralDict: false };
    }

    return {
      localMatches: generalMatches,
      isFromGeneralDict: generalMatches.length > 0,
    };
  }, [words, cefrFilter, posFilter, statusFilter, searchQuery, isGeneralDictLoaded]);

  // Exact local word match check (ignores partial/example-sentence substring matches like "publicly" inside "repudiate")
  const hasExactLocalMatch = useMemo(() => {
    const trimmedLower = searchQuery.toLowerCase().trim();
    if (!trimmedLower) return false;
    return localMatches.some((w) => w.word.toLowerCase().trim() === trimmedLower);
  }, [localMatches, searchQuery]);

  // Tier 3: Automatic Online Lookup (500ms debounced on typing, 0ms on Search Button / Enter)
  // Triggered whenever a searched word (min 2 chars) has NO exact local match.
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (viewMode !== 'standard' || trimmedQuery.length < 2 || hasExactLocalMatch) {
      forceImmediateRef.current = false;
      setOnlineResults([]);
      setIsOnlineLoading(false);
      setOnlineErrorReason(null);
      return;
    }

    // Ensure Tier 2 generalDictionary finishes loading before falling back to Tier 3 online API
    if (!isGeneralDictLoaded) {
      ensureGeneralDictionaryLoaded();
      return;
    }

    // Check memory/session cache synchronously for instant re-search
    const cached = getCachedOnlineWord(trimmedQuery);
    if (cached) {
      forceImmediateRef.current = false;
      setOnlineResults([cached]);
      setIsOnlineLoading(false);
      setOnlineErrorReason(null);
      return;
    }

    // Graceful offline detection before querying external API
    const currentlyOffline = !isOnline || (typeof navigator !== 'undefined' && navigator.onLine === false);
    if (currentlyOffline) {
      forceImmediateRef.current = false;
      setOnlineResults([]);
      setIsOnlineLoading(false);
      setOnlineErrorReason('offline');
      return;
    }

    const isImmediate = forceImmediateRef.current;
    forceImmediateRef.current = false;

    const controller = new AbortController();
    setIsOnlineLoading(true);
    setOnlineErrorReason(null);
    setOnlineResults([]);

    const debounceTimer = setTimeout(async () => {
      const response = await lookupOnlineDictionary(trimmedQuery, controller.signal);
      if (controller.signal.aborted) return;

      setIsOnlineLoading(false);
      if (response.result) {
        setOnlineResults([response.result]);
        setOnlineErrorReason(null);
      } else {
        setOnlineResults([]);
        setOnlineErrorReason(
          response.status === 'offline' || response.status === 'network_error'
            ? response.status
            : 'not_found'
        );
      }
    }, isImmediate ? 0 : 500);

    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [searchQuery, hasExactLocalMatch, isGeneralDictLoaded, viewMode, isOnline, searchSubmitCount]);

  const filteredWords = useMemo(() => {
    if (onlineResults.length > 0 && !hasExactLocalMatch) {
      const onlineWordSet = new Set(onlineResults.map((w) => w.word.toLowerCase().trim()));
      const remainingLocal = localMatches.filter(
        (w) => !onlineWordSet.has(w.word.toLowerCase().trim())
      );
      return [...onlineResults, ...remainingLocal];
    }
    return localMatches;
  }, [localMatches, onlineResults, hasExactLocalMatch]);

  const isFromOnlineDict = onlineResults.length > 0 && !hasExactLocalMatch;

  // Pronunciation handler - ONLY used for English target words and English example sentences
  const handleSpeakEnglish = (text: string, id: string) => {
    setSpeakingId(id);
    speakText(text, 'en-US', 1.0, () => {
      setSpeakingId(null);
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* View Switcher: Sözlük Arama vs A-Z Dizin (Fihrist) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-2 sm:p-2.5 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setViewMode('standard')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewMode === 'standard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Sözlük Arama</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('directory')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewMode === 'directory'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookA className="w-4 h-4" />
            <span>A-Z Dizin (Fihrist)</span>
          </button>
        </div>
      </div>

      {viewMode === 'directory' ? (
        /* A-Z Directory / Glossary Mode */
        <div className="space-y-6">
          {/* Directory Filter Box: Part of Speech + Alphabet Selector */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            {/* Top filter bar: Part of Speech buttons ("Tümü", "Fiil", "İsim", "Sıfat", "Zarf"), with "Fiil" selected by DEFAULT */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-indigo-500" />
                  <span>Sözcük Türü (Fihrist)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Fihristte listelemek istediğiniz sözcük türünü seçin
                </p>
              </div>

              {/* Part of Speech buttons: Tümü, Fiil (Default), İsim, Sıfat, Zarf */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
                {[
                  { id: 'all', label: 'Tümü' },
                  { id: 'verb', label: 'Fiil' },
                  { id: 'noun', label: 'İsim' },
                  { id: 'adjective', label: 'Sıfat' },
                  { id: 'adverb', label: 'Zarf' },
                ].map((p) => {
                  const isActive = directoryPos === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDirectoryPos(p.id as PosFilter)}
                      className={`px-3.5 py-2 rounded-xl text-xs tracking-tight transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/20 scale-102'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-header / Alphabet Selector: Clean wrap-around grid of uppercase letters A to Z */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Harf Seçin (A - Z):
                </span>
                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  Seçili Harf: &quot;{selectedLetter}&quot; ({letterCounts[selectedLetter] || 0} kelime)
                </span>
              </div>

              <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-13 gap-1.5">
                {ALPHABET.map((char) => {
                  const isSelected = selectedLetter === char;
                  const count = letterCounts[char] || 0;
                  const hasWords = count > 0;

                  return (
                    <button
                      key={char}
                      type="button"
                      onClick={() => {
                        setSelectedLetter(char);
                        setExpandedDirCardId(null);
                      }}
                      className={`h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 scale-105 z-10 ring-2 ring-indigo-400/40'
                          : hasWords
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 font-semibold'
                          : 'bg-slate-50/60 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 hover:bg-slate-100/60 font-normal'
                      }`}
                      title={`${char} ile başlayan ${count} kelime`}
                    >
                      <span className="text-xs sm:text-sm leading-none font-bold">{char}</span>
                      <span
                        className={`text-[9px] font-mono leading-none mt-0.5 ${
                          isSelected
                            ? 'text-indigo-100 font-medium'
                            : hasWords
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Directory Word Entries Header */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                &quot;{selectedLetter}&quot; Harfi Fihristi
              </span>
              <span className="ml-2 font-medium">
                ({directoryPos === 'all' ? 'Tüm Türler' : getPosTurkishLabel(directoryPos)})
              </span>
            </div>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {directoryWords.length} kelime
            </span>
          </div>

          {/* Directory Word List or Empty State */}
          {directoryWords.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200/90 dark:border-slate-800 transition-colors">
              <BookOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Bu harf ile başlayan kelime bulunamadı.
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                &quot;{selectedLetter}&quot; harfi ile başlayan {directoryPos === 'all' ? '' : getPosTurkishLabel(directoryPos).toLowerCase() + ' '}kelime mevcut veri setinde yer almıyor. Başka bir harf veya &quot;Tümü&quot; türünü deneyebilirsiniz.
              </p>
              {directoryPos !== 'all' && (
                <button
                  type="button"
                  onClick={() => setDirectoryPos('all')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Tüm Türleri Göster
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {directoryWords.map((item) => {
                const isExpanded = expandedDirCardId === item.id;
                const isSpeakingWord = speakingId === `dir-word-${item.id}`;
                const isSpeakingEx = speakingId === `dir-ex-${item.id}`;
                const hasCollocations = Boolean(
                  Array.isArray(item.collocations) &&
                  item.collocations.length > 0 &&
                  item.collocations.some((c) => typeof c === 'string' && c.trim().length > 0)
                );
                const hasTip = Boolean(
                  item.academicNote &&
                  item.academicNote.trim().length > 0 &&
                  !item.isGeneralDict
                );

                return (
                  <article
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400/60 dark:hover:border-indigo-600/60 shadow-xs hover:shadow-md transition-all"
                  >
                    {/* Header Row: Word, Audio, Phonetic, Badges, Status & Bookmark */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-slate-900 dark:text-white tracking-tight">
                            {item.word}
                          </h4>

                          {/* ENGLISH Word Audio Speaker */}
                          <button
                            type="button"
                            onClick={() => handleSpeakEnglish(item.word, `dir-word-${item.id}`)}
                            className={`p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors ${
                              isSpeakingWord ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950 animate-pulse' : ''
                            }`}
                            title="İngilizce kelime telaffuzunu dinle"
                            aria-label={`İngilizce telaffuz: ${item.word}`}
                          >
                            <Volume2 className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Badges & Status */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-lg tracking-wide ${getCefrBadgeClass(
                              item.cefrLevel
                            )}`}
                          >
                            {item.cefrLevel}
                          </span>

                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-lg ${getPosBadgeClass(
                              item.partOfSpeech
                            )}`}
                          >
                            {getPosTurkishLabel(item.partOfSpeech)}
                          </span>

                          {onUpdateStatus && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStatus(
                                  item.id,
                                  item.status === 'ogrenildi' ? 'calisiliyor' : 'ogrenildi'
                                )
                              }
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all ${
                                item.status === 'ogrenildi'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              }`}
                              title="Durumu değiştir"
                            >
                              {item.status === 'ogrenildi' ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>Öğrenildi</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                  <span>Çalışılıyor</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Verb Forms (V1 / V2 / V3) or Regular Verb Badge */}
                        <VerbConjugationBadge
                          word={item.word}
                          type={item.type}
                          partOfSpeech={item.partOfSpeech}
                        />
                      </div>

                      {/* Heart Favorite Icon */}
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(item.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-transform active:scale-125 cursor-pointer"
                        title={item.isFavorite ? 'Kelime defterinden çıkar' : 'Kelime defterine ekle'}
                        aria-label={item.isFavorite ? 'Kelime defterinden çıkar' : 'Kelime defterine ekle'}
                      >
                        <Heart
                          className={`w-5 h-5 transition-colors ${
                            item.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Turkish Meaning - Tap to Expand */}
                    <div
                      onClick={() => setExpandedDirCardId(isExpanded ? null : item.id)}
                      className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 cursor-pointer flex items-center justify-between gap-2 hover:opacity-90"
                    >
                      <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {item.trMeaning}
                      </p>
                      <button
                        type="button"
                        className="text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 shrink-0"
                      >
                        <span>{isExpanded ? 'Gizle' : 'Detaylar'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Expandable Details Drawer */}
                    {isExpanded && (
                      <div className="mt-3.5 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
                        {/* Example sentence with English Audio */}
                        <div className="bg-slate-50/90 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/80 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                              &quot;{item.enExample}&quot;
                            </p>
                            <button
                              type="button"
                              onClick={() => handleSpeakEnglish(item.enExample, `dir-ex-${item.id}`)}
                              className={`p-1.5 shrink-0 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors ${
                                isSpeakingEx ? 'text-indigo-600 animate-pulse' : ''
                              }`}
                              title="İngilizce örnek cümleyi dinle"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic">
                            &quot;{item.trExample}&quot;
                          </p>
                        </div>

                        {/* Exam Tip */}
                        {hasTip && (
                          <div className="flex items-start gap-2.5 text-xs bg-amber-50/90 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200/70 dark:border-amber-800/60 text-amber-950 dark:text-amber-100">
                            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold block mb-0.5 text-amber-950 dark:text-amber-200">
                                Hazırlık Sınavı İpucu:
                              </strong>
                              <span className="leading-relaxed">{item.academicNote}</span>
                            </div>
                          </div>
                        )}

                        {/* Collocations */}
                        {hasCollocations && item.collocations && (
                          <div className="text-xs">
                            <span className="font-bold text-slate-900 dark:text-white block mb-1.5">
                              Sık Kullanılan Birlikte Kullanımlar (Collocations):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.collocations.filter(Boolean).map((col, idx) => (
                                <span
                                  key={idx}
                                  className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px]"
                                >
                                  {col}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {onPracticeWord && (
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onPracticeWord(item)}
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                            >
                              <Mic className="w-3.5 h-3.5" />
                              <span>Telaffuz Testi Yap</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Standard Search & List View */
        <>
          {/* Search & Filter Header Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors space-y-4">
        {/* Instant Search Bar with Search Action Button & Floating Autocomplete Suggestions */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExplicitSearch();
          }}
          className="relative w-full"
        >
          <div className="relative flex items-center w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="w-5 h-5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              enterKeyHint="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
                setActiveSuggestionIndex(-1);
                ensureGeneralDictionaryLoaded();
              }}
              onFocus={() => {
                setIsInputFocused(true);
                setShowSuggestions(true);
                ensureGeneralDictionaryLoaded();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Kelime veya anlam ara (İngilizce / Türkçe)..."
              className={`w-full pl-11 py-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all ${
                searchQuery ? 'pr-20' : 'pr-12'
              }`}
              autoComplete="off"
              spellCheck="false"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                  setOnlineResults([]);
                  setOnlineErrorReason(null);
                  inputRef.current?.focus();
                }}
                className="absolute right-12 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Aramayı temizle"
                title="Temizle"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleExplicitSearch()}
              aria-label="Ara"
              title="Ara"
              className="absolute right-2 flex items-center justify-center w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-sm transition cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Autocomplete Suggestions Floating Dropdown */}
          {showSuggestions && isInputFocused && suggestions.length > 0 && searchQuery.trim().length >= 1 && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Önerilen Kelimeler ({suggestions.length})</span>
                <span className="text-[10px] hidden sm:inline text-slate-400 font-mono">
                  Seçmek için dokunun
                </span>
              </div>
              <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {suggestions.map((item, index) => {
                  const isSelected = activeSuggestionIndex === index;
                  return (
                    <li
                      key={item.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestion(item);
                      }}
                      className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold font-['Outfit'] text-slate-900 dark:text-white text-sm sm:text-base">
                          {item.word}
                        </span>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
                          ({getPosAbbr(item.partOfSpeech)})
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate">
                          {item.trMeaning}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.isGeneralDict ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300/60 dark:border-sky-800/60">
                            Genel Sözlük
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${getCefrBadgeClass(
                              item.cefrLevel
                            )}`}
                          >
                            {item.cefrLevel}
                          </span>
                        )}
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </form>

        {/* Immediate Feedback Card right below the Search Bar when exact word match is missing (>= 2 chars) */}
        {!hasExactLocalMatch && onlineResults.length === 0 && searchQuery.trim().length >= 2 && (
          <div className="pt-1">
            {!isOnline ||
            (typeof navigator !== 'undefined' && navigator.onLine === false) ||
            onlineErrorReason === 'offline' ||
            onlineErrorReason === 'network_error' ? (
              <div className="rounded-2xl p-4 sm:p-5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/70 flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left animate-in fade-in duration-150">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                  <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                    &lsquo;{searchQuery.trim()}&rsquo; yerel veritabanında bulunamadı. Çevrimiçi sözlükte aramak için internet bağlantınızı açın.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setOnlineResults([]);
                    setOnlineErrorReason(null);
                  }}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-amber-100/60 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
                >
                  Temizle
                </button>
              </div>
            ) : isOnlineLoading || !isGeneralDictLoaded || onlineErrorReason === null ? (
              <div className="rounded-2xl p-4 sm:p-5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center gap-3 animate-in fade-in duration-150">
                <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Çevrimiçi sözlükte aranıyor...
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    &lsquo;{searchQuery.trim()}&rsquo; için anlam, telaffuz ve tanım getiriliyor.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left animate-in fade-in duration-150">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-slate-400 shrink-0" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Bu kelime sözlüklerde bulunamadı.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCefrFilter('Tümü');
                    setPosFilter('all');
                    setStatusFilter('all');
                  }}
                  className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shrink-0 cursor-pointer"
                >
                  Aramayı Temizle
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filter Controls Row: CEFR Level & Part of Speech */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* CEFR Level Segmented Control Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl w-full sm:w-auto">
            {(['Tümü', 'A1-A2', 'B1-B2'] as CefrFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCefrFilter(tab)}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  cefrFilter === tab
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                }`}
              >
                {tab === 'Tümü' ? 'Tüm Seviyeler' : tab}
              </button>
            ))}
          </div>

          {/* Part of Speech Filter - HIGH CONTRAST ACTIVE STATE & VIBRANT PRIMARY COLOR */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-bold shrink-0 mr-1 text-[11px] flex items-center gap-1">
              <Filter className="w-3 h-3 text-indigo-500" />
              <span>Tür:</span>
            </span>
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'noun', label: 'İsim' },
              { id: 'verb', label: 'Fiil' },
              { id: 'adjective', label: 'Sıfat' },
              { id: 'adverb', label: 'Zarf' },
            ].map((p) => {
              const isActive = posFilter === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPosFilter(p.id as PosFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs tracking-tight transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/20 scale-102'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filters: All, Öğrenildi, Çalışılıyor + Audio Speed */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-semibold mr-1 text-[11px]">Durum:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-xl font-semibold text-[11px] transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tümü
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ogrenildi')}
              className={`px-3 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all ${
                statusFilter === 'ogrenildi'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Öğrenildi</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('calisiliyor')}
              className={`px-3 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all ${
                statusFilter === 'calisiliyor'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Çalışılıyor</span>
            </button>
          </div>

          {/* Results Count Line */}
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {isOnlineLoading ? (
              <span className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>Çevrimiçi sözlükte aranıyor...</span>
              </span>
            ) : isFromOnlineDict ? (
              <span className="flex items-center gap-1.5 font-medium text-teal-700 dark:text-teal-300">
                <Globe className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <span>
                  Yerel listede bulunamadı, <strong className="font-bold">Çevrimiçi Sözlük 🌐</strong> üzerinden sonuç gösteriliyor
                </span>
              </span>
            ) : isFromGeneralDict ? (
              <span className="flex items-center gap-1.5 font-medium text-sky-700 dark:text-sky-300">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                <span>
                  Hazırlık listesinde bulunamadı, <strong className="font-bold underline">Genel Sözlük</strong>&apos;ten{' '}
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{filteredWords.length}</span> sonuç gösteriliyor
                </span>
              </span>
            ) : (
              <span>
                Toplam <span className="font-mono font-semibold">{words.length}</span> kelimeden{' '}
                <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{filteredWords.length}</strong> tanesi gösteriliyor
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Word Entries List */}
      {filteredWords.length === 0 ? (
        searchQuery.trim().length >= 2 ? null : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800 transition-colors">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Kelime bulunamadı
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Farklı harflerle aramayı deneyebilir veya filtreyi &quot;Tümü&quot; olarak sıfırlayabilirsiniz.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCefrFilter('Tümü');
                setPosFilter('all');
                setStatusFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Tüm Filtreleri Temizle
            </button>
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {filteredWords.slice(0, visibleBatchCount).map((item) => {
            const isExpanded = expandedCardId === item.id;
            const isSpeakingWord = speakingId === `word-${item.id}`;
            const isSpeakingEx = speakingId === `ex-${item.id}`;
            const isHighlighted = highlightedWordId === item.id;
            const hasCollocations = Boolean(
              Array.isArray(item.collocations) &&
              item.collocations.length > 0 &&
              item.collocations.some((c) => typeof c === 'string' && c.trim().length > 0)
            );
            const hasTip = Boolean(
              item.academicNote &&
              item.academicNote.trim().length > 0 &&
              !item.isGeneralDict
            );

            return (
              <article
                key={item.id}
                id={`word-card-${item.id}`}
                className={`group bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border transition-all duration-300 ${
                  isHighlighted
                    ? 'ring-4 ring-indigo-500 shadow-2xl shadow-indigo-500/30 border-indigo-500 dark:border-indigo-400 scale-[1.015]'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-400/60 dark:hover:border-indigo-600/60 shadow-xs hover:shadow-md'
                }`}
              >
                {/* Header Row: English Word + Phonetic + Vibrant Badges + Audio (ONLY English) + Status Indicator + Bookmark */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-slate-900 dark:text-white tracking-tight">
                        {item.word}
                      </h2>

                      {/* ENGLISH Word Audio Speaker Button */}
                      <button
                        type="button"
                        onClick={() => handleSpeakEnglish(item.word, `word-${item.id}`)}
                        className={`p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors ${
                          isSpeakingWord ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950 animate-pulse' : ''
                        }`}
                        title="İngilizce kelime telaffuzunu dinle"
                        aria-label={`İngilizce telaffuz: ${item.word}`}
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>

                      {item.isOnlineDict && item.phonetic && (
                        <span className="text-xs sm:text-sm font-mono text-slate-500 dark:text-slate-400">
                          {item.phonetic}
                        </span>
                      )}
                    </div>

                    {/* Part of Speech & CEFR Level Badges & Status */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {/* CEFR Badge or Online/Genel Sözlük Badge */}
                      {item.isOnlineDict ? (
                        <>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800 flex items-center gap-1 shadow-2xs">
                            <Globe className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>Çevrimiçi Sözlük 🌐</span>
                          </span>
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-lg ${getPosBadgeClass(
                              item.partOfSpeech
                            )}`}
                          >
                            {getPosTurkishLabel(item.partOfSpeech)}
                          </span>
                        </>
                      ) : item.isGeneralDict ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-1 shadow-2xs">
                          <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          <span>Genel Sözlük</span>
                        </span>
                      ) : (
                        <>
                          <span
                            className={`text-[11px] uppercase px-2.5 py-0.5 rounded-lg tracking-wide ${getCefrBadgeClass(
                              item.cefrLevel
                            )}`}
                          >
                            {item.cefrLevel}
                          </span>

                          {/* Part of Speech Badge - Vibrant Domain Colors */}
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-lg ${getPosBadgeClass(
                              item.partOfSpeech
                            )}`}
                          >
                            {getPosTurkishLabel(item.partOfSpeech)}
                          </span>

                          {/* Word Status Indicator: Öğrenildi or Çalışılıyor */}
                          {onUpdateStatus && (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateStatus(
                                    item.id,
                                    item.status === 'ogrenildi' ? 'calisiliyor' : 'ogrenildi'
                                  )
                                }
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1 transition-all ${
                                  item.status === 'ogrenildi'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                                }`}
                                title="Durumu değiştir"
                              >
                                {item.status === 'ogrenildi' ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Öğrenildi</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                    <span>Çalışılıyor</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {item.isCustom && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                              Özel
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Verb Forms (V1 / V2 / V3) or Regular Verb Badge */}
                    <VerbConjugationBadge
                      word={item.word}
                      type={item.type}
                      partOfSpeech={item.partOfSpeech}
                    />
                  </div>

                  {/* Heart Favorite Button */}
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(item.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-transform active:scale-125 cursor-pointer"
                    title={item.isFavorite ? 'Kelime defterinden çıkar' : 'Kelime defterine ekle'}
                    aria-label={item.isFavorite ? 'Kelime defterinden çıkar' : 'Kelime defterine ekle'}
                  >
                    <Heart
                      className={`w-5 h-5 transition-colors ${
                        item.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                  </button>
                </div>

                {/* Primary Turkish Meaning */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                  <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {item.trMeaning}
                  </p>
                  {item.isOnlineDict && item.enDefinition && item.enDefinition !== item.trMeaning && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-teal-700 dark:text-teal-400 mr-1.5">
                        Akademik Tanım (EN):
                      </span>
                      {item.enDefinition}
                    </p>
                  )}
                </div>

                {/* General Dictionary Fallback vs Rich/Online Card Content */}
                {item.isGeneralDict ? (
                  <div className="mt-3.5 py-2.5 px-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>Temel sözlük kaydı (Hazırlık kartı bulunmamaktadır).</span>
                  </div>
                ) : (
                  <>
                    {/* English Example Sentence (WITH ENGLISH AUDIO) & Turkish Translation (WITHOUT AUDIO) */}
                    <div className="mt-3.5 bg-slate-50/90 dark:bg-slate-950/60 rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                          &quot;{item.enExample}&quot;
                        </p>
                        {/* ENGLISH Example Sentence Audio Speaker Button */}
                        <button
                          type="button"
                          onClick={() => handleSpeakEnglish(item.enExample, `ex-${item.id}`)}
                          className={`p-1.5 shrink-0 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors ${
                            isSpeakingEx ? 'text-indigo-600 animate-pulse' : ''
                          }`}
                          title="İngilizce örnek cümleyi dinle"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Turkish translation of example sentence (NO AUDIO BUTTON) */}
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic">
                        &quot;{item.trExample}&quot;
                      </p>
                    </div>

                    {/* Academic Prep Notes & Collocations Expandable Drawer */}
                    {(hasTip || hasCollocations) && (
                      <div className="mt-3.5 pt-2">
                        {isExpanded ? (
                          <div className="space-y-3 pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
                            {hasTip && (
                              <div className="flex items-start gap-2.5 text-xs bg-amber-50/90 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200/70 dark:border-amber-800/60 text-amber-950 dark:text-amber-100">
                                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="font-bold block mb-0.5 text-amber-950 dark:text-amber-200">Hazırlık Sınavı İpucu:</strong>
                                  <span className="leading-relaxed text-amber-900 dark:text-amber-100">{item.academicNote}</span>
                                </div>
                              </div>
                            )}

                            {hasCollocations && item.collocations && (
                              <div className="text-xs text-slate-700 dark:text-slate-300">
                                <span className="font-bold text-slate-900 dark:text-white block mb-1.5">
                                  Sık Kullanılan Birlikte Kullanımlar (Collocations):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.collocations.filter(Boolean).map((col, idx) => (
                                    <span
                                      key={idx}
                                      className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] shadow-2xs"
                                    >
                                      {col}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Toggle Details Button & Quick Practice CTA */}
                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <span>Gizle</span>
                                <ChevronUp className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                <span>
                                  {hasTip && hasCollocations
                                    ? 'Akademik İpuçları ve Birlikte Kullanımlar'
                                    : hasCollocations
                                    ? 'Birlikte Kullanımlar (Collocations)'
                                    : 'Hazırlık Sınavı İpucu'}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>

                          {onPracticeWord && (
                            <button
                              type="button"
                              onClick={() => onPracticeWord(item)}
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                            >
                              <Mic className="w-3.5 h-3.5" />
                              <span>Telaffuz Testi Yap</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sleek footer for cards without tips or collocations */}
                    {!hasTip && !hasCollocations && onPracticeWord && (
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onPracticeWord(item)}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>Telaffuz Testi Yap</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>

          {filteredWords.length > visibleBatchCount && (
            <div className="pt-2 pb-4 text-center">
              <button
                type="button"
                onClick={() => setVisibleBatchCount((prev) => prev + 30)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <span>Daha Fazla Kelime Göster</span>
                <span className="text-xs px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono">
                  {visibleBatchCount} / {filteredWords.length}
                </span>
              </button>
            </div>
          )}
        </>
      )}
        </>
      )}
    </div>
  );
};
