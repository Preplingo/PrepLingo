import React, { useState, useEffect, useMemo } from 'react';
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Check,
  Bookmark,
  Heart,
  Sparkles,
  Layers,
  Clock
} from 'lucide-react';
import { WordEntry, CefrFilter, WordStatus } from '../types';
import { speakText } from '../utils/textToSpeech';
import { getCefrBadgeClass, getPosBadgeClass, getPosTurkishLabel } from '../utils/themeBadges';
import { VerbConjugationBadge } from '../utils/verbConjugation';
import confetti from 'canvas-confetti';

interface FlashcardsViewProps {
  words: WordEntry[];
  onToggleFavorite: (id: string) => void;
  onUpdateStatus?: (id: string, status: WordStatus) => void;
}

// Robust Fisher-Yates shuffle algorithm to ensure true uniform randomization
function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  words,
  onToggleFavorite,
  onUpdateStatus,
}) => {
  const [cefrFilter, setCefrFilter] = useState<CefrFilter | 'Yıldızlılar'>('Tümü');
  const [deck, setDeck] = useState<WordEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Filter words according to chosen tab
  const eligibleWords = useMemo(() => {
    return words.filter((item) => {
      if (cefrFilter === 'Yıldızlılar') {
        return Boolean(item.isFavorite);
      }
      if (cefrFilter === 'A1-A2') {
        return item.cefrLevel === 'A1' || item.cefrLevel === 'A2';
      }
      if (cefrFilter === 'B1-B2') {
        return item.cefrLevel === 'B1' || item.cefrLevel === 'B2';
      }
      return true;
    });
  }, [words, cefrFilter]);

  // Reset deck on filter change and automatically randomize with Fisher-Yates shuffle
  useEffect(() => {
    setDeck(fisherYatesShuffle(eligibleWords));
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [eligibleWords]);

  const currentWord = deck[currentIndex];

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    if (deck.length <= 1) return;
    const shuffled = fisherYatesShuffle(deck);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleMarkMastered = () => {
    if (!currentWord) return;
    if (onUpdateStatus) {
      onUpdateStatus(currentWord.id, 'ogrenildi');
    }

    if (currentIndex === deck.length - 1) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });
    } else {
      handleNext();
    }
  };

  const handleMarkReviewLater = () => {
    if (!currentWord) return;
    if (onUpdateStatus) {
      onUpdateStatus(currentWord.id, 'calisiliyor');
    }

    if (currentIndex < deck.length - 1) {
      handleNext();
    }
  };

  // Speaks English ONLY
  const handleSpeakEnglish = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    setIsSpeaking(true);
    speakText(text, 'en-US', 0.9, () => {
      setIsSpeaking(false);
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'KeyM') {
        handleMarkMastered();
      } else if (e.code === 'KeyR') {
        handleMarkReviewLater();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const masteredCount = deck.filter((w) => w.status === 'ogrenildi').length;
  const learningCount = deck.filter((w) => w.status === 'calisiliyor').length;
  const progressPercentage = deck.length > 0 ? Math.round(((currentIndex + 1) / deck.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto">
      {/* Controls Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors space-y-4">
        {/* CEFR Level & Starred Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            {(['Tümü', 'A1-A2', 'B1-B2', 'Yıldızlılar'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCefrFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  cefrFilter === tab
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'Tümü' ? 'Tüm Kartlar' : tab === 'Yıldızlılar' ? '★ Yıldızlılar' : tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShuffle}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Desteyi yeniden karıştır"
            >
              <Shuffle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Karıştır</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Counters */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Kart <strong className="text-slate-900 dark:text-white font-mono">{deck.length > 0 ? currentIndex + 1 : 0}</strong> /{' '}
              <span className="font-mono">{deck.length}</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>{masteredCount} Öğrenildi</span>
              </span>
              <span className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{learningCount} Çalışılıyor</span>
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Flashcard Container */}
      {deck.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200/80 dark:border-slate-800">
          <Layers className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Bu destede kelime bulunmuyor</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {cefrFilter === 'Yıldızlılar'
              ? 'Henüz yıldızlı kelimeniz yok. Sözlükten kelimelere yıldız ekleyerek burada pratik yapabilirsiniz!'
              : 'Farklı bir seviye filtresi seçmeyi deneyebilirsiniz.'}
          </p>
          <button
            type="button"
            onClick={() => setCefrFilter('Tümü')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            Tüm Kartları Göster
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Card Container with edge navigation arrows OUTSIDE the flip-card clickable area */}
          <div className="relative w-full flex items-center justify-center">
            {/* Left Arrow Button - outside the flip-card onClick */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePrev();
              }}
              disabled={currentIndex === 0}
              aria-label="Önceki Kelime"
              title="Önceki Kelime"
              className={`absolute left-1 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/95 dark:bg-slate-800/95 border-2 border-indigo-200 dark:border-slate-600 shadow-lg flex items-center justify-center text-2xl font-bold leading-none text-slate-700 dark:text-slate-200 transition ${
                currentIndex === 0
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-indigo-50 dark:hover:bg-indigo-950/70 active:scale-95 cursor-pointer'
              }`}
            >
              ‹
            </button>

            {/* Flip Card Area (ONLY tapping this area flips the card; mx-14 keeps side gutters outside onClick) */}
            <div
              onClick={handleFlip}
              className="flex-1 min-w-0 mx-14 cursor-pointer select-none transition-all duration-150"
            >
              {!isFlipped ? (
                <div className="card-front text-center p-5 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-indigo-400/60 dark:hover:border-indigo-600/60 min-h-[360px] flex flex-col justify-between">
                  {/* Top Bar: Level Badge & Bookmark */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs uppercase px-2.5 py-1 rounded-lg tracking-wide ${getCefrBadgeClass(currentWord.cefrLevel)}`}>
                      {currentWord.cefrLevel}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(currentWord.id);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-transform active:scale-125 cursor-pointer"
                      title={currentWord.isFavorite ? 'Kelime defterinden çıkar' : 'Kelime defterine kaydet'}
                    >
                      <Heart
                        className={`w-5 h-5 transition-colors ${
                          currentWord.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Center: Word, Audio, Type */}
                  <div className="my-auto py-4 space-y-3">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <h2 className="text-3xl sm:text-4xl font-bold font-['Outfit'] text-slate-900 dark:text-white break-words">
                        {currentWord.word}
                      </h2>
                      <button
                        type="button"
                        onClick={(e) => handleSpeakEnglish(e, currentWord.word)}
                        className={`p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors ${
                          isSpeaking ? 'text-indigo-600 animate-pulse' : ''
                        }`}
                        title="İngilizce telaffuzu dinle"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="pt-1">
                      <span className={`text-xs px-2.5 py-1 rounded-lg inline-block ${getPosBadgeClass(currentWord.partOfSpeech)}`}>
                        {getPosTurkishLabel(currentWord.partOfSpeech)}
                      </span>
                      <VerbConjugationBadge
                        word={currentWord.word}
                        type={currentWord.type}
                        partOfSpeech={currentWord.partOfSpeech}
                        className="justify-center mt-1.5"
                      />
                    </div>
                  </div>

                  {/* Bottom Prompt */}
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800">
                    Anlamı görmek için dokunun
                  </p>
                </div>
              ) : (
                <div className="card-back text-center p-5 sm:p-8 bg-blue-50 dark:bg-slate-900 rounded-3xl border-2 border-blue-200 dark:border-indigo-800 shadow-sm min-h-[360px] flex flex-col justify-between">
                  {/* Top Bar: Word hint & Bookmark */}
                  <div className="flex items-center justify-between text-xs text-blue-700 dark:text-indigo-300">
                    <span className="font-bold uppercase tracking-wider">
                      {currentWord.word} · {getPosTurkishLabel(currentWord.partOfSpeech)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(currentWord.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-transform active:scale-125 cursor-pointer"
                      title={currentWord.isFavorite ? 'Kelime defterinden çıkar' : 'Kelime defterine kaydet'}
                    >
                      <Heart
                        className={`w-4 h-4 transition-colors ${
                          currentWord.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Center: Meaning & Examples */}
                  <div className="my-auto py-4 space-y-3">
                    <h3 className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-white mb-2 break-words">
                      {currentWord.trMeaning}
                    </h3>

                    <VerbConjugationBadge
                      word={currentWord.word}
                      type={currentWord.type}
                      partOfSpeech={currentWord.partOfSpeech}
                      className="justify-center mb-2"
                    />

                    <div className="max-w-lg mx-auto bg-white/70 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-blue-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-gray-800 dark:text-slate-100 italic font-medium text-sm sm:text-base">
                          &quot;{currentWord.enExample}&quot;
                        </p>
                        <button
                          type="button"
                          onClick={(e) => handleSpeakEnglish(e, currentWord.enExample)}
                          className="p-1 rounded text-blue-600 dark:text-indigo-400 hover:bg-blue-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                          title="İngilizce örnek cümleyi dinle"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-gray-600 dark:text-slate-400 text-sm">
                        &quot;{currentWord.trExample}&quot;
                      </p>
                    </div>
                  </div>

                  {/* Bottom Prompt */}
                  <p className="text-sm text-blue-600 dark:text-indigo-400 font-medium mt-6 pt-3 border-t border-blue-100 dark:border-slate-800">
                    Kelimeye dönmek için dokunun
                  </p>
                </div>
              )}
            </div>

            {/* Right Arrow Button - outside the flip-card onClick */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNext();
              }}
              disabled={currentIndex === deck.length - 1}
              aria-label="Sonraki Kelime"
              title="Sonraki Kelime"
              className={`absolute right-1 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/95 dark:bg-slate-800/95 border-2 border-indigo-200 dark:border-slate-600 shadow-lg flex items-center justify-center text-2xl font-bold leading-none text-slate-700 dark:text-slate-200 transition ${
                currentIndex === deck.length - 1
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-indigo-50 dark:hover:bg-indigo-950/70 active:scale-95 cursor-pointer'
              }`}
            >
              ›
            </button>
          </div>

          {/* Action Decision Buttons: "Çalışılıyor" (Learning) vs "Öğrenildi" (Mastered) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleMarkReviewLater}
              className="min-h-[50px] py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
            >
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Çalışılıyor</span>
              <span className="hidden sm:inline text-[11px] opacity-70">(R)</span>
            </button>

            <button
              type="button"
              onClick={handleMarkMastered}
              className="min-h-[50px] py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Öğrenildi</span>
              <span className="hidden sm:inline text-[11px] opacity-80">(M)</span>
            </button>
          </div>

          {/* Previous / Next Deck Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                currentIndex === 0
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Önceki</span>
            </button>

            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
              {currentIndex + 1} / {deck.length}
            </span>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === deck.length - 1}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                currentIndex === deck.length - 1
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Sonraki</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
