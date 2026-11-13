import React, { useState, useMemo } from 'react';
import {
  Heart,
  Volume2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  BookOpen,
  Mic,
} from 'lucide-react';
import { WordEntry, PartOfSpeech, CefrLevel, WordStatus } from '../types';
import { VerbConjugationBadge } from '../utils/verbConjugation';

interface FavoritesViewProps {
  words: WordEntry[];
  onToggleFavorite: (id: string) => void;
  onUpdateStatus?: (id: string, status: WordStatus) => void;
  onPracticeWord?: (word: WordEntry) => void;
  onNavigateToDictionary?: () => void;
}

type FavPosFilter = 'all' | 'verb' | 'noun' | 'adj' | 'adv' | 'conjunction';
type FavSortOption = 'recent' | 'alphabetical';

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  words,
  onToggleFavorite,
  onUpdateStatus,
  onPracticeWord,
  onNavigateToDictionary,
}) => {
  const [posFilter, setPosFilter] = useState<FavPosFilter>('all');
  const [sortOption, setSortOption] = useState<FavSortOption>('recent');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Filter only favorited words
  const favoriteWords = useMemo(() => {
    return words.filter((w) => w.isFavorite);
  }, [words]);

  // Apply POS filter and sorting
  const filteredAndSortedWords = useMemo(() => {
    let result = [...favoriteWords];

    // Filter by Part of Speech
    if (posFilter !== 'all') {
      result = result.filter((w) => {
        const p = w.partOfSpeech;
        const t = w.type;
        if (posFilter === 'verb') return p === 'verb' || t === 'verb';
        if (posFilter === 'noun') return p === 'noun' || t === 'noun';
        if (posFilter === 'adj') return p === 'adjective' || p === 'adj' || t === 'adj';
        if (posFilter === 'adv') return p === 'adverb' || p === 'adv' || t === 'adv';
        if (posFilter === 'conjunction') return p === 'conjunction' || t === 'conjunction';
        return true;
      });
    }

    // Apply Sorting
    if (sortOption === 'alphabetical') {
      result.sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }));
    }
    // 'recent' retains the order as passed (or custom order)

    return result;
  }, [favoriteWords, posFilter, sortOption]);

  // English Audio speech handler
  const handleSpeakEnglish = (text: string, id: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      setSpeakingId(id);
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingId(null);
    }
  };

  const getCefrBadgeClass = (level: CefrLevel) => {
    switch (level) {
      case 'A1':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'A2':
        return 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800';
      case 'B1':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'B2':
        return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  const getPosBadgeClass = (pos: PartOfSpeech) => {
    switch (pos) {
      case 'verb':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'noun':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'adjective':
      case 'adj':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      case 'adverb':
      case 'adv':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      case 'conjunction':
        return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  const getPosTurkishLabel = (pos: PartOfSpeech) => {
    switch (pos) {
      case 'verb':
        return 'Fiil';
      case 'noun':
        return 'İsim';
      case 'adjective':
      case 'adj':
        return 'Sıfat';
      case 'adverb':
      case 'adv':
        return 'Zarf';
      case 'conjunction':
        return 'Bağlaç';
      default:
        return pos;
    }
  };

  const filterButtons: { id: FavPosFilter; label: string }[] = [
    { id: 'all', label: 'Tümü' },
    { id: 'verb', label: 'Fiil' },
    { id: 'noun', label: 'İsim' },
    { id: 'adj', label: 'Sıfat' },
    { id: 'adv', label: 'Zarf' },
    { id: 'conjunction', label: 'Bağlaç' },
  ];

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-rose-50 via-white to-indigo-50/40 dark:from-rose-950/30 dark:via-slate-900 dark:to-indigo-950/30 rounded-3xl p-5 sm:p-6 border border-rose-200/70 dark:border-rose-900/40 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-500">
                <Heart className="w-5 h-5 fill-rose-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-slate-900 dark:text-white tracking-tight">
                Kelime Defterim
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Sınav öncesi odaklanmak istediğiniz favori kelimeleriniz ve notlarınız.
            </p>
          </div>

          {/* Counter Badge */}
          <div className="self-start sm:self-auto px-4 py-2 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-rose-200/80 dark:border-rose-800/60 shadow-2xs flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
              {favoriteWords.length} Kelime Kaydedildi
            </span>
          </div>
        </div>

        {/* Filter and Sort Toolbar */}
        {favoriteWords.length > 0 && (
          <div className="mt-5 pt-4 border-t border-rose-200/50 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Part of Speech Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {filterButtons.map((btn) => {
                const isActive = posFilter === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setPosFilter(btn.id)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/25 font-semibold'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">Sıralama:</span>
              <button
                type="button"
                onClick={() => setSortOption(sortOption === 'recent' ? 'alphabetical' : 'recent')}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:border-rose-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Sıralama biçimini değiştir"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-rose-500" />
                <span>{sortOption === 'recent' ? 'Son Eklenenler' : 'A-Z Alfabetik'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {favoriteWords.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-500">
            <Heart className="w-8 h-8 fill-rose-500/30" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold font-['Outfit'] text-slate-900 dark:text-white">
              Defteriniz Henüz Boş
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Henüz kelime eklemediniz. Kartlardaki kalp simgesine dokunarak kelimelerinizi buraya kaydedebilirsiniz.
            </p>
          </div>
          {onNavigateToDictionary && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateToDictionary}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
              >
                <BookOpen className="w-4 h-4" />
                <span>Sözlüğe Git ve Kelime Ekle</span>
              </button>
            </div>
          )}
        </div>
      ) : filteredAndSortedWords.length === 0 ? (
        <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Seçilen türde kaydedilmiş kelime bulunamadı.
          </p>
          <button
            type="button"
            onClick={() => setPosFilter('all')}
            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            Tüm kaydedilenleri göster
          </button>
        </div>
      ) : (
        /* Saved Words List */
        <div className="grid grid-cols-1 gap-3.5">
          {filteredAndSortedWords.map((item) => {
            const isExpanded = expandedCardId === item.id;
            const isSpeakingWord = speakingId === `fav-word-${item.id}`;
            const isSpeakingEx = speakingId === `fav-ex-${item.id}`;
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
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 hover:border-rose-400/60 dark:hover:border-rose-600/60 shadow-xs hover:shadow-md transition-all"
              >
                {/* Header Row: English Word, Audio, Badges, Heart Button */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-slate-900 dark:text-white tracking-tight">
                        {item.word}
                      </h3>

                      {/* ENGLISH Word Audio Speaker */}
                      <button
                        type="button"
                        onClick={() => handleSpeakEnglish(item.word, `fav-word-${item.id}`)}
                        className={`p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors ${
                          isSpeakingWord ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950 animate-pulse' : ''
                        }`}
                        title="İngilizce kelime telaffuzunu dinle"
                        aria-label={`İngilizce telaffuz: ${item.word}`}
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Badges & Learning Status */}
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
                          title="Öğrenme durumunu değiştir"
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

                    {/* Verb Conjugation (V1 / V2 / V3 or Regular) */}
                    <VerbConjugationBadge
                      word={item.word}
                      type={item.type}
                      partOfSpeech={item.partOfSpeech}
                      className="pt-0.5"
                    />
                  </div>

                  {/* Heart Icon Button with pop animation */}
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(item.id)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-transform active:scale-125 cursor-pointer"
                    title="Kelime defterinden çıkar"
                    aria-label="Kelime defterinden çıkar"
                  >
                    <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                  </button>
                </div>

                {/* Turkish Meaning - Tap to Expand in place */}
                <div
                  onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
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

                {/* In-Place Expanded Details Drawer */}
                {isExpanded && (
                  <div className="mt-3.5 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
                    {/* Example Sentence with Audio */}
                    {item.enExample && (
                      <div className="bg-slate-50/90 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/80 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                            &quot;{item.enExample}&quot;
                          </p>
                          <button
                            type="button"
                            onClick={() => handleSpeakEnglish(item.enExample, `fav-ex-${item.id}`)}
                            className={`p-1.5 shrink-0 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors ${
                              isSpeakingEx ? 'text-indigo-600 animate-pulse' : ''
                            }`}
                            title="İngilizce örnek cümleyi dinle"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        {item.trExample && (
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic">
                            &quot;{item.trExample}&quot;
                          </p>
                        )}
                      </div>
                    )}

                    {/* Academic Exam Tip */}
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

                    {/* Pronunciation Practice Action */}
                    {onPracticeWord && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onPracticeWord(item)}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
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
  );
};
