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
      <div className="bg-[#1e1b4b] bg-gradient-to-br from-[#312e81] via-[#1e1b4b] to-[#020617] rounded-3xl p-6 sm:p-8 text-[#ffffff] shadow-lg space-y-6 border border-[#3730a3]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-widest text-[#a5b4fc] flex items-center gap-1.5">
              <TrendingUp width={16} height={16} fill="none" stroke="#a5b4fc" className="w-4 h-4" />
              <span>Hazırlık Kelime Hakimiyeti</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit'] tracking-tight text-[#ffffff]">
              Gelişim Tablonuz
            </h2>
            <p className="text-xs sm:text-sm text-[#c7d2fe]">
              Muafiyet ve hazırlık sınavlarına yönelik kelime öğrenme durumunuz
            </p>
          </div>

          {/* Mastered Percentage Ring Card */}
          <div className="flex items-center gap-3 bg-[#312e81] px-4 py-3 rounded-2xl border border-[#4338ca] self-start sm:self-auto">
            <div className="text-right">
              <span className="text-[11px] text-[#c7d2fe] block uppercase font-medium">Genel Başarı</span>
              <span className="text-2xl font-extrabold font-mono text-[#ffffff]">%{masteredRate}</span>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[#6366f1] border-t-[#34d399] flex items-center justify-center font-mono text-xs font-bold text-[#ffffff]">
              {masteredWords.length}/{totalWords}
            </div>
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Öğrenildi */}
          <div className="bg-[#0f172a] rounded-2xl p-3.5 border border-[#312e81] space-y-1">
            <span className="text-[#34d399] text-xs font-medium flex items-center gap-1">
              <CheckCircle2 width={14} height={14} fill="none" stroke="#34d399" className="w-3.5 h-3.5" />
              <span>Öğrenildi</span>
            </span>
            <span className="text-2xl font-bold font-mono text-[#ffffff] block">
              {masteredWords.length}
            </span>
            <span className="text-[10px] text-[#c7d2fe] block">kelime tamamlandı</span>
          </div>

          {/* Çalışılıyor */}
          <div className="bg-[#0f172a] rounded-2xl p-3.5 border border-[#312e81] space-y-1">
            <span className="text-[#fbbf24] text-xs font-medium flex items-center gap-1">
              <Clock width={14} height={14} fill="none" stroke="#fbbf24" className="w-3.5 h-3.5" />
              <span>Çalışılıyor</span>
            </span>
            <span className="text-2xl font-bold font-mono text-[#ffffff] block">
              {learningWords.length}
            </span>
            <span className="text-[10px] text-[#c7d2fe] block">tekrar edilecek</span>
          </div>

          {/* Yıldızlı */}
          <div className="bg-[#0f172a] rounded-2xl p-3.5 border border-[#312e81] space-y-1">
            <span className="text-[#fcd34d] text-xs font-medium flex items-center gap-1">
              <Bookmark width={14} height={14} fill="#fcd34d" stroke="#fcd34d" className="w-3.5 h-3.5" />
              <span>Yıldızlı</span>
            </span>
            <span className="text-2xl font-bold font-mono text-[#ffffff] block">
              {starredWords.length}
            </span>
            <span className="text-[10px] text-[#c7d2fe] block">favori kelime</span>
          </div>

          {/* Eşleştirme Rekoru */}
          <div className="bg-[#0f172a] rounded-2xl p-3.5 border border-[#312e81] space-y-1">
            <span className="text-[#a5b4fc] text-xs font-medium flex items-center gap-1">
              <Trophy width={14} height={14} fill="none" stroke="#fbbf24" className="w-3.5 h-3.5" />
              <span>Oyun Rekoru</span>
            </span>
            <span className="text-2xl font-bold font-mono text-[#ffffff] block">
              {highScore}
            </span>
            <span className="text-[10px] text-[#c7d2fe] block">en yüksek skor</span>
          </div>
        </div>
      </div>

      {/* CEFR Level Breakdown Card */}
      <div className="bg-[#ffffff] dark:bg-[#0f172a] rounded-3xl p-5 sm:p-6 border border-[#e2e8f0] dark:border-[#1e293b] shadow-sm space-y-4">
        <h3 className="text-base font-bold text-[#0f172a] dark:text-[#ffffff] flex items-center gap-2">
          <Sparkles width={16} height={16} fill="none" stroke="#4f46e5" className="w-4 h-4" />
          <span>CEFR Seviyelerine Göre İlerleme</span>
        </h3>

        <div className="space-y-4">
          {/* A1 - A2 Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1e293b] dark:text-[#e2e8f0]">
                A1 - A2 Seviyesi (Temel Hazırlık)
              </span>
              <span className="font-mono text-[#64748b] dark:text-[#94a3b8]">
                {aLevelMastered.length} / {aLevelWords.length} kelime (%{aLevelRate})
              </span>
            </div>
            <div className="w-full bg-[#f1f5f9] dark:bg-[#1e293b] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#14b8a6] h-full rounded-full transition-all duration-500"
                style={{ width: `${aLevelRate}%` }}
              />
            </div>
          </div>

          {/* B1 - B2 Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1e293b] dark:text-[#e2e8f0]">
                B1 - B2 Seviyesi (Akademik Yeterlilik / Proficiency)
              </span>
              <span className="font-mono text-[#64748b] dark:text-[#94a3b8]">
                {bLevelMastered.length} / {bLevelWords.length} kelime (%{bLevelRate})
              </span>
            </div>
            <div className="w-full bg-[#f1f5f9] dark:bg-[#1e293b] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#4f46e5] h-full rounded-full transition-all duration-500"
                style={{ width: `${bLevelRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Study Action Shortcuts */}
        <div className="pt-3 border-t border-[#f1f5f9] dark:border-[#1e293b] flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateToTab('flashcards')}
            className="px-4 py-2 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] dark:bg-[#1e293b] dark:hover:bg-[#334155] text-xs font-semibold text-[#334155] dark:text-[#e2e8f0] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Layers width={16} height={16} fill="none" stroke="#6366f1" className="w-4 h-4" />
            <span>Kartlarla Tekrar Et</span>
            <ArrowRight width={14} height={14} fill="none" stroke="#475569" className="w-3.5 h-3.5 ml-1" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('games')}
            className="px-4 py-2 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] dark:bg-[#1e293b] dark:hover:bg-[#334155] text-xs font-semibold text-[#334155] dark:text-[#e2e8f0] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trophy width={16} height={16} fill="none" stroke="#f59e0b" className="w-4 h-4" />
            <span>Eşleştirme Oyunu Oyna</span>
            <ArrowRight width={14} height={14} fill="none" stroke="#475569" className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>

      {/* Word List by Status */}
      <div className="bg-[#ffffff] dark:bg-[#0f172a] rounded-3xl p-5 sm:p-6 border border-[#e2e8f0] dark:border-[#1e293b] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#0f172a] dark:text-[#ffffff]">
            Kelimeler ve Durumları
          </h3>

          {/* Filter segment */}
          <div className="flex items-center gap-1 p-1 bg-[#f1f5f9] dark:bg-[#1e293b] rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              style={filterStatus === 'all' ? { backgroundColor: '#4f46e5', color: '#ffffff' } : undefined}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filterStatus === 'all'
                  ? 'legacy-btn-indigo bg-[#4f46e5] text-[#ffffff] shadow-xs font-bold'
                  : 'text-[#475569] dark:text-[#cbd5e1]'
              }`}
            >
              Tümü ({words.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ogrenildi')}
              style={filterStatus === 'ogrenildi' ? { backgroundColor: '#16a34a', color: '#ffffff' } : undefined}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filterStatus === 'ogrenildi'
                  ? 'legacy-btn-green bg-[#16a34a] text-[#ffffff] shadow-xs font-bold'
                  : 'text-[#15803d] dark:text-[#34d399]'
              }`}
            >
              Öğrenildi ({masteredWords.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('calisiliyor')}
              style={filterStatus === 'calisiliyor' ? { backgroundColor: '#d97706', color: '#ffffff' } : undefined}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filterStatus === 'calisiliyor'
                  ? 'bg-[#d97706] text-[#ffffff] shadow-xs font-bold'
                  : 'text-[#b45309] dark:text-[#fbbf24]'
              }`}
            >
              Çalışılıyor ({learningWords.length})
            </button>
          </div>
        </div>

        {/* Word rows */}
        <div className="divide-y divide-[#f1f5f9] dark:divide-[#1e293b] max-h-96 overflow-y-auto pr-1">
          {displayedWords.length === 0 ? (
            <div className="py-8 text-center text-[#64748b] dark:text-[#94a3b8] text-xs">
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
                className="py-3 flex items-center justify-between gap-3 hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleSpeakEnglish(word.word)}
                    className="p-1 rounded-lg text-[#64748b] hover:text-[#4f46e5] hover:bg-[#eef2ff] dark:hover:bg-[#1e1b4b] transition-colors shrink-0 cursor-pointer"
                    title="İngilizce telaffuzu dinle"
                  >
                    <Volume2 width={16} height={16} fill="none" stroke="#64748b" className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-[#0f172a] dark:text-[#ffffff] truncate">
                        {word.word}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${getCefrBadgeClass(word.cefrLevel)}`}>
                        {word.cefrLevel}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748b] dark:text-[#94a3b8] truncate">
                      {word.trMeaning}
                    </p>
                  </div>
                </div>

                {/* Status Action / Toggle Button */}
                {filterStatus === 'ogrenildi' ? (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(word.id, 'calisiliyor')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 shrink-0 transition-all bg-[#fff1f2] hover:bg-[#ffe4e6] text-[#be123c] dark:bg-[#4c0519] dark:hover:bg-[#881337] dark:text-[#fda4af] border-[#fecdd3] dark:border-[#881337] cursor-pointer active:scale-95 shadow-2xs"
                    title="Öğrenildi listesinden çıkar ve tekrar çalışma havuzuna al"
                  >
                    <X width={14} height={14} fill="none" stroke="#e11d48" className="w-3.5 h-3.5" />
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
                        ? 'bg-[#ecfdf5] dark:bg-[#022c22] text-[#15803d] dark:text-[#6ee7b7] border-[#a7f3d0] dark:border-[#065f46]'
                        : 'bg-[#fffbeb] dark:bg-[#451a03] text-[#b45309] dark:text-[#fcd34d] border-[#fde68a] dark:border-[#92400e]'
                    }`}
                    title="Durumu değiştir"
                  >
                    {word.status === 'ogrenildi' ? (
                      <>
                        <CheckCircle2 width={14} height={14} fill="none" stroke="#16a34a" className="w-3.5 h-3.5" />
                        <span>Öğrenildi</span>
                      </>
                    ) : (
                      <>
                        <Clock width={14} height={14} fill="none" stroke="#d97706" className="w-3.5 h-3.5" />
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
