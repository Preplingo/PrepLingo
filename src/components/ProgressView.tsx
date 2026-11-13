import React, { useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Bookmark,
  Trophy,
  Volume2,
  Layers,
  Mic,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';
import { WordEntry, WordStatus, CefrLevel } from '../types';
import { speakText } from '../utils/textToSpeech';
import { getCefrBadgeClass } from '../utils/themeBadges';

interface ProgressViewProps {
  words: WordEntry[];
  highScore: number;
  onUpdateStatus: (id: string, status: WordStatus) => void;
  onNavigateToTab: (tab: 'flashcards' | 'games') => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  words,
  highScore,
  onUpdateStatus,
  onNavigateToTab,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'ogrenildi' | 'calisiliyor'>('all');

  const totalWords = words.length;
  const masteredWords = words.filter((w) => w.status === 'ogrenildi');
  const learningWords = words.filter((w) => w.status === 'calisiliyor');
  const starredWords = words.filter((w) => w.isFavorite);

  const masteredRate = totalWords > 0 ? Math.round((masteredWords.length / totalWords) * 100) : 0;

  // CEFR breakdowns
  const aLevelWords = words.filter((w) => w.cefrLevel === 'A1' || w.cefrLevel === 'A2');
  const aLevelMastered = aLevelWords.filter((w) => w.status === 'ogrenildi');
  const aLevelRate = aLevelWords.length > 0 ? Math.round((aLevelMastered.length / aLevelWords.length) * 100) : 0;

  const bLevelWords = words.filter((w) => w.cefrLevel === 'B1' || w.cefrLevel === 'B2');
  const bLevelMastered = bLevelWords.filter((w) => w.status === 'ogrenildi');
  const bLevelRate = bLevelWords.length > 0 ? Math.round((bLevelMastered.length / bLevelWords.length) * 100) : 0;

  // Filtered list for detailed view
  const displayedWords = words.filter((w) => {
    if (filterStatus === 'ogrenildi') return w.status === 'ogrenildi';
    if (filterStatus === 'calisiliyor') return w.status === 'calisiliyor';
    return true;
  });

  const handleSpeakEnglish = (word: string) => {
    speakText(word, 'en-US', 1.0);
  };

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto">
      {/* Overview Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-6 border border-indigo-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>Hazırlık Kelime Hakimiyeti</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit'] tracking-tight">
              Gelişim Tablonuz
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/80">
              Muafiyet ve hazırlık sınavlarına yönelik kelime öğrenme durumunuz
            </p>
          </div>

          {/* Mastered Percentage Ring Card */}
          <div className="flex items-center gap-3 bg-white/10 px-4 py-3 rounded-2xl border border-white/15 backdrop-blur-xs self-start sm:self-auto">
            <div className="text-right">
              <span className="text-[11px] text-indigo-200 block uppercase font-medium">Genel Başarı</span>
              <span className="text-2xl font-extrabold font-mono text-white">%{masteredRate}</span>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-indigo-400/40 border-t-emerald-400 flex items-center justify-center font-mono text-xs font-bold">
              {masteredWords.length}/{totalWords}
            </div>
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Öğrenildi */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 space-y-1">
            <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Öğrenildi</span>
            </span>
            <span className="text-2xl font-bold font-mono text-white block">
              {masteredWords.length}
            </span>
            <span className="text-[10px] text-indigo-200/70 block">kelime tamamlandı</span>
          </div>

          {/* Çalışılıyor */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 space-y-1">
            <span className="text-amber-400 text-xs font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Çalışılıyor</span>
            </span>
            <span className="text-2xl font-bold font-mono text-white block">
              {learningWords.length}
            </span>
            <span className="text-[10px] text-indigo-200/70 block">tekrar edilecek</span>
          </div>

          {/* Yıldızlı */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 space-y-1">
            <span className="text-amber-300 text-xs font-medium flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 fill-amber-300" />
              <span>Yıldızlı</span>
            </span>
            <span className="text-2xl font-bold font-mono text-white block">
              {starredWords.length}
            </span>
            <span className="text-[10px] text-indigo-200/70 block">favori kelime</span>
          </div>

          {/* Eşleştirme Rekoru */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 space-y-1">
            <span className="text-indigo-300 text-xs font-medium flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Oyun Rekoru</span>
            </span>
            <span className="text-2xl font-bold font-mono text-white block">
              {highScore}
            </span>
            <span className="text-[10px] text-indigo-200/70 block">en yüksek skor</span>
          </div>
        </div>
      </div>

      {/* CEFR Level Breakdown Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>CEFR Seviyelerine Göre İlerleme</span>
        </h3>

        <div className="space-y-4">
          {/* A1 - A2 Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                A1 - A2 Seviyesi (Temel Hazırlık)
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">
                {aLevelMastered.length} / {aLevelWords.length} kelime (%{aLevelRate})
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-teal-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${aLevelRate}%` }}
              />
            </div>
          </div>

          {/* B1 - B2 Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                B1 - B2 Seviyesi (Akademik Yeterlilik / Proficiency)
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">
                {bLevelMastered.length} / {bLevelWords.length} kelime (%{bLevelRate})
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${bLevelRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Study Action Shortcuts */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateToTab('flashcards')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Kartlarla Tekrar Et</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('games')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Eşleştirme Oyunu Oyna</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>

      {/* Word List by Status */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Kelimeler ve Durumları
          </h3>

          {/* Filter segment */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tümü ({words.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ogrenildi')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterStatus === 'ogrenildi'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              Öğrenildi ({masteredWords.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('calisiliyor')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterStatus === 'calisiliyor'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              Çalışılıyor ({learningWords.length})
            </button>
          </div>
        </div>

        {/* Word rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-96 overflow-y-auto pr-1">
          {displayedWords.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              {filterStatus === 'ogrenildi'
                ? 'Henüz öğrenildi olarak işaretlenmiş kelime bulunmuyor.'
                : filterStatus === 'calisiliyor'
                ? 'Çalışılmakta olan kelime bulunmuyor.'
                : 'Gösterilecek kelime bulunamadı.'}
            </div>
          ) : (
            displayedWords.map((word) => (
              <div
                key={word.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleSpeakEnglish(word.word)}
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors shrink-0"
                    title="İngilizce telaffuzu dinle"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {word.word}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${getCefrBadgeClass(word.cefrLevel)}`}>
                        {word.cefrLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {word.trMeaning}
                    </p>
                  </div>
                </div>

                {/* Status Action / Toggle Button */}
                {filterStatus === 'ogrenildi' ? (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(word.id, 'calisiliyor')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 shrink-0 transition-all bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/60 cursor-pointer active:scale-95 shadow-2xs"
                    title="Öğrenildi listesinden çıkar ve tekrar çalışma havuzuna al"
                  >
                    <X className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Listeden Çıkar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateStatus(
                        word.id,
                        word.status === 'ogrenildi' ? 'calisiliyor' : 'ogrenildi'
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                      word.status === 'ogrenildi'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}
                    title="Durumu değiştir"
                  >
                    {word.status === 'ogrenildi' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Öğrenildi</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Çalışılıyor</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
