import React from 'react';
import { Moon, Sun, Plus, Heart, Info } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  totalWords: number;
  favoritesCount: number;
  showOnlyFavorites: boolean;
  onToggleFavoritesOnly: () => void;
  onOpenAddWord: () => void;
  onOpenAbout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  favoritesCount,
  showOnlyFavorites,
  onToggleFavoritesOnly,
  onOpenAddWord,
  onOpenAbout,
  darkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Wordmark (clean and compact, min-w-0 for long subtitle safety) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0">
            <AppLogo size={34} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-['Outfit'] font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white shrink-0">
                PrepLingo
              </span>
              {/* Subtitle badge: hidden on mobile, visible on sm and up */}
              <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/40 shrink-0">
                AKADEMİK &amp; GENEL SÖZLÜK
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block truncate">
              Üniversite Hazırlık, YDS/IELTS/TOEFL ve Tüm İngilizce Öğrenenler İçin Sözlük &amp; Çalışma Platformu
            </p>
          </div>
        </div>

        {/* Right-Side Action Controls: strictly inside the viewport on all screens (360px+) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* PWA Install Button (hidden if already installed or unsupported) */}
          <PWAInstallButton />

          {/* Kelime Defterim Heart Action Button */}
          <button
            type="button"
            onClick={onToggleFavoritesOnly}
            className={`min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
              showOnlyFavorites
                ? 'bg-rose-500/10 border-rose-400 text-rose-700 dark:text-rose-300 shadow-2xs'
                : 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700'
            }`}
            title="Kelime Defterim (Favoriler)"
            aria-label="Kelime defterim filtresini aç veya kapat"
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                showOnlyFavorites || favoritesCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-slate-500 dark:text-slate-400'
              }`}
            />
            <span className="hidden sm:inline text-xs">Defterim</span>
            {favoritesCount > 0 && (
              <span className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400">
                {favoritesCount > 99 ? '99+' : favoritesCount}
              </span>
            )}
          </button>

          {/* Add Custom Word Button (Icon on mobile, text on sm+) */}
          <button
            type="button"
            onClick={onOpenAddWord}
            className="min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] px-2 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center gap-1.5 shadow-2xs shadow-indigo-600/25 transition-all cursor-pointer"
            title="Yeni Kelime Ekle"
            aria-label="Yeni kelime ekle"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Kelime Ekle</span>
          </button>

          {/* About / Info Button */}
          <button
            type="button"
            onClick={onOpenAbout}
            className="min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] p-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50 transition-colors flex items-center justify-center cursor-pointer"
            title="PrepLingo Hakkında"
            aria-label="PrepLingo Hakkında bilgi penceresini aç"
          >
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] p-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50 transition-colors flex items-center justify-center cursor-pointer"
            title={darkMode ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç'}
            aria-label="Tema değiştir"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
          </button>
        </div>
      </div>
    </header>
  );
};
