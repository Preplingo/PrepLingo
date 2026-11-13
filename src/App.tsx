import React, { useState, useEffect, useRef } from 'react';
import { WordEntry, ActiveTab, WordStatus } from './types';
import { INITIAL_WORDS, deduplicateWordEntries } from './data/initialWords';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DictionaryView } from './components/DictionaryView';
import { FlashcardsView } from './components/FlashcardsView';
import { FavoritesView } from './components/FavoritesView';
import { GamesView } from './components/GamesView';
import { ProgressView } from './components/ProgressView';
import { AddWordModal } from './components/AddWordModal';
import { AboutModal } from './components/AboutModal';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { SplashScreen } from './components/SplashScreen';
import { OfflineIndicator } from './components/OfflineIndicator';

import { findExactInGeneralDictionary } from './data/generalDictionaryLoader';
import { findInEssentialFallback } from './data/essentialFallback';
import { getCachedOnlineWord } from './utils/onlineDictionary';

const STORAGE_KEY_CUSTOM_WORDS = 'preplingo_custom_words_v1';
const STORAGE_KEY_FAVS = 'preplingo_favs_v2';
const STORAGE_KEY_STATUS = 'preplingo_status_v2';
const STORAGE_KEY_THEME = 'preplingo_theme_v2';
const STORAGE_KEY_HIGHSCORE = 'preplingo_highscore_v2';

export default function App() {
  // Animated Splash Screen state - displays for 3.5s on first load per session
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const splashShown = sessionStorage.getItem('preplingo_splash_shown');
      return splashShown !== 'true';
    }
    return false;
  });

  const handleSplashComplete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('preplingo_splash_shown', 'true');
    }
    setShowSplash(false);
  };

  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply dark mode class to html root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // High score state for speed match game
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_HIGHSCORE);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  // Ultra-fast word state management: merges static JSON with custom words and localized progress
  const [words, setWords] = useState<WordEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_WORDS);
        const savedFavs = localStorage.getItem(STORAGE_KEY_FAVS);
        const savedStatus = localStorage.getItem(STORAGE_KEY_STATUS);

        const customWords: WordEntry[] = savedCustom ? JSON.parse(savedCustom) : [];
        const favSet = new Set(savedFavs ? JSON.parse(savedFavs) : []);
        const statusMap: Record<string, WordStatus> = savedStatus ? JSON.parse(savedStatus) : {};

        // App-Level Shield: filter duplicates and keep the richest entry
        const mergedWords = deduplicateWordEntries([...customWords, ...INITIAL_WORDS]);

        return mergedWords.map((w: WordEntry) => ({
          ...w,
          isFavorite: favSet.has(w.id) || w.isFavorite,
          status: statusMap[w.id] || w.status || 'calisiliyor',
        }));
      } catch (e) {
        console.error('Error loading initial words:', e);
      }
    }
    return deduplicateWordEntries(INITIAL_WORDS).map((w) => ({
      ...w,
      status: 'calisiliyor' as WordStatus,
    }));
  });

  // Active Bottom Nav Tab: 'dictionary' | 'flashcards' | 'favorites' | 'games' | 'progress'
  const [activeTab, setActiveTab] = useState<ActiveTab>('dictionary');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const isExitingRef = useRef(false);
  const [practiceWordId, setPracticeWordId] = useState<string | undefined>(undefined);

  // Android / Browser Back Button Interception (Exit Safety Guard)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Push initial history state so back button events trigger popstate
    window.history.pushState({ appGuard: true }, '', window.location.href);

    const handlePopState = () => {
      if (isExitingRef.current) {
        return; // User clicked "Evet, Çık", let browser proceed
      }

      // Re-arm history guard to avoid leaving the app
      window.history.pushState({ appGuard: true }, '', window.location.href);

      // Rule 1: If exit confirmation modal is already open and back is pressed again,
      // dismiss the modal and KEEP the user inside the app.
      if (isExitConfirmOpen) {
        setIsExitConfirmOpen(false);
        return;
      }

      // Rule 2: If About modal is open, close it
      if (isAboutOpen) {
        setIsAboutOpen(false);
        return;
      }

      // Rule 3: If Add Word modal is open, close it
      if (isAddWordOpen) {
        setIsAddWordOpen(false);
        return;
      }

      // Rule 4: If on another tab, navigate back to root view ('dictionary')
      if (activeTab !== 'dictionary') {
        setActiveTab('dictionary');
        return;
      }

      // Rule 5: User is on root view ('dictionary') with no open modals -> open exit confirm dialog
      setIsExitConfirmOpen(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isExitConfirmOpen, isAboutOpen, isAddWordOpen, activeTab]);

  const handleConfirmExit = () => {
    isExitingRef.current = true;
    setIsExitConfirmOpen(false);
    try {
      if (window.history.length > 1) {
        window.history.go(-2);
      } else {
        window.close();
      }
    } catch {
      window.close();
    }
  };

  const handleCancelExit = () => {
    setIsExitConfirmOpen(false);
  };

  // Sync favorites to localStorage with O(1) set operations
  const handleToggleFavorite = (id: string) => {
    setWords((prev) => {
      const exists = prev.some((w) => w.id === id);
      let updated: WordEntry[];
      if (exists) {
        updated = prev.map((w) => (w.id === id ? { ...w, isFavorite: !w.isFavorite } : w));
      } else {
        const cleanWord = id.replace(/^(ess|gen|online)_/, '').replace(/_/g, ' ');
        const rawKey = id.replace(/^(ess|gen|online)_/, '');
        const fallbackWord =
          findInEssentialFallback(cleanWord) ||
          findInEssentialFallback(rawKey) ||
          getCachedOnlineWord(cleanWord) ||
          getCachedOnlineWord(rawKey) ||
          findExactInGeneralDictionary(cleanWord) ||
          findExactInGeneralDictionary(rawKey);
        if (fallbackWord) {
          updated = [{ ...fallbackWord, isFavorite: true }, ...prev];
        } else {
          updated = prev;
        }
      }
      const favIds = updated.filter((w) => w.isFavorite).map((w) => w.id);
      localStorage.setItem(STORAGE_KEY_FAVS, JSON.stringify(favIds));
      return updated;
    });
  };

  // Update status: 'ogrenildi' (Mastered) vs 'calisiliyor' (Learning) with lightweight key-value map
  const handleUpdateStatus = (id: string, newStatus: WordStatus) => {
    setWords((prev) => {
      const exists = prev.some((w) => w.id === id);
      let updated: WordEntry[];
      if (exists) {
        updated = prev.map((w) => (w.id === id ? { ...w, status: newStatus } : w));
      } else {
        const cleanWord = id.replace(/^(ess|gen|online)_/, '').replace(/_/g, ' ');
        const rawKey = id.replace(/^(ess|gen|online)_/, '');
        const fallbackWord =
          findInEssentialFallback(cleanWord) ||
          findInEssentialFallback(rawKey) ||
          getCachedOnlineWord(cleanWord) ||
          getCachedOnlineWord(rawKey) ||
          findExactInGeneralDictionary(cleanWord) ||
          findExactInGeneralDictionary(rawKey);
        if (fallbackWord) {
          updated = [{ ...fallbackWord, status: newStatus }, ...prev];
        } else {
          updated = prev;
        }
      }
      const statusMap: Record<string, WordStatus> = {};
      updated.forEach((w) => {
        if (w.status) statusMap[w.id] = w.status;
      });
      localStorage.setItem(STORAGE_KEY_STATUS, JSON.stringify(statusMap));
      return updated;
    });
  };

  // Custom word added by user is stored separately to scale seamlessly to 1000+ words
  const handleAddWord = (newWord: WordEntry) => {
    setWords((prev) => deduplicateWordEntries([newWord, ...prev]));
    try {
      const savedCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_WORDS);
      const customList: WordEntry[] = savedCustom ? JSON.parse(savedCustom) : [];
      const updatedCustom = deduplicateWordEntries([newWord, ...customList]);
      localStorage.setItem(STORAGE_KEY_CUSTOM_WORDS, JSON.stringify(updatedCustom));
    } catch (e) {
      console.error('Error saving custom word:', e);
    }
  };

  const handleGameComplete = (finalScore: number) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem(STORAGE_KEY_HIGHSCORE, finalScore.toString());
    }
  };

  // Shortcut from Dictionary: practice a specific word in speaking check
  const handlePracticeWord = (word: WordEntry) => {
    setPracticeWordId(word.id);
    setActiveTab('games');
  };

  // Active word list filtered by favorites if toggle is active
  const displayedWords = showOnlyFavorites ? words.filter((w) => w.isFavorite) : words;
  const favoritesCount = words.filter((w) => w.isFavorite).length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8fafc] dark:bg-[#020617] text-[#0f172a] dark:text-[#f1f5f9] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Animated Splash Screen on first load (3.5s) */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} durationMs={3500} />}

      {/* Top Header */}
      <Header
        totalWords={words.length}
        favoritesCount={favoritesCount}
        showOnlyFavorites={activeTab === 'favorites'}
        onToggleFavoritesOnly={() => setActiveTab(activeTab === 'favorites' ? 'dictionary' : 'favorites')}
        onOpenAddWord={() => setIsAddWordOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      <OfflineIndicator />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'dictionary' && (
          <DictionaryView
            words={displayedWords}
            onToggleFavorite={handleToggleFavorite}
            onUpdateStatus={handleUpdateStatus}
            onPracticeWord={handlePracticeWord}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardsView
            words={displayedWords}
            onToggleFavorite={handleToggleFavorite}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesView
            words={words}
            onToggleFavorite={handleToggleFavorite}
            onUpdateStatus={handleUpdateStatus}
            onPracticeWord={handlePracticeWord}
            onNavigateToDictionary={() => setActiveTab('dictionary')}
          />
        )}

        {activeTab === 'games' && (
          <GamesView
            words={words}
            initialWordId={practiceWordId}
            onGameComplete={handleGameComplete}
            onNavigateToDictionary={() => setActiveTab('dictionary')}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressView
            words={words}
            highScore={highScore}
            onUpdateStatus={handleUpdateStatus}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}
      </main>

      {/* Add Word Modal */}
      <AddWordModal
        isOpen={isAddWordOpen}
        onClose={() => setIsAddWordOpen(false)}
        onAddWord={handleAddWord}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Exit Safety Guard Confirmation Modal */}
      <ExitConfirmModal
        isOpen={isExitConfirmOpen}
        onConfirmExit={handleConfirmExit}
        onCancelExit={handleCancelExit}
      />

      {/* Material 3 Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        favoritesCount={favoritesCount}
      />
    </div>
  );
}
