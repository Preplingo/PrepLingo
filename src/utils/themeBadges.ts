import { PartOfSpeech } from '../types';

/**
 * Returns vibrant, modern CEFR badge classes matching the university prep theme:
 * - A1-A2: Bright fresh Emerald Green (#059669 bg, white text)
 * - B1-B2: Rich Indigo/Violet (#6366F1 bg, white text)
 */
export function getCefrBadgeClass(level: string): string {
  if (level === 'Genel') {
    return 'bg-sky-700 text-white font-bold shadow-xs border border-sky-600/50';
  }
  if (level === 'A1' || level === 'A2') {
    return 'bg-emerald-600 text-white font-bold shadow-xs border border-emerald-500/40';
  }
  return 'bg-indigo-600 text-white font-bold shadow-xs border border-indigo-500/40';
}

/**
 * Returns vibrant Part of Speech badge classes:
 * - İsim (noun): Sky Blue
 * - Fiil (verb): Rose / Coral
 * - Sıfat (adj): Amber / Gold
 * - Zarf (adv): Purple
 */
export function getPosBadgeClass(pos: PartOfSpeech | string): string {
  switch (pos) {
    case 'noun':
    case 'n':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-200 border border-sky-300 dark:border-sky-800 font-semibold';
    case 'verb':
    case 'v':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 font-semibold';
    case 'adjective':
    case 'adj':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-semibold';
    case 'adverb':
    case 'adv':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-200 border border-purple-300 dark:border-purple-800 font-semibold';
    case 'preposition':
    case 'prep':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-200 border border-teal-300 dark:border-teal-800 font-semibold';
    case 'conjunction':
    case 'conj':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800 font-semibold';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-semibold';
  }
}

/**
 * Clean Turkish labels for parts of speech
 */
export function getPosTurkishLabel(pos: string): string {
  switch (pos) {
    case 'noun':
    case 'n':
      return 'İsim';
    case 'verb':
    case 'v':
      return 'Fiil';
    case 'adjective':
    case 'adj':
      return 'Sıfat';
    case 'adverb':
    case 'adv':
      return 'Zarf';
    case 'preposition':
    case 'prep':
      return 'Edat';
    case 'conjunction':
    case 'conj':
      return 'Bağlaç';
    default:
      return pos;
  }
}
