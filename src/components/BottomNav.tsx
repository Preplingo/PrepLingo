import React from 'react';
import { BookOpen, Layers, Heart, Zap, TrendingUp } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  favoritesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, favoritesCount }) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dictionary', label: 'Sözlük', icon: BookOpen },
    { id: 'flashcards', label: 'Kartlar', icon: Layers },
    { id: 'favorites', label: 'Defterim', icon: Heart },
    { id: 'games', label: 'Oyun', icon: Zap },
    { id: 'progress', label: 'Gelişim', icon: TrendingUp },
  ];

  return (
    <nav
      aria-label="Alt Menü Gezintisi"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/92 dark:bg-slate-900/92 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-md sm:max-w-xl mx-auto px-2 h-16 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center min-w-[64px] min-h-[48px] py-1 px-2 rounded-2xl transition-all select-none group"
            >
              {/* Material 3 active pill background */}
              <div
                className={`relative flex items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 scale-100'
                    : 'text-slate-500 dark:text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} />
                {tab.id === 'favorites' && typeof favoritesCount === 'number' && favoritesCount > 0 && (
                  <span className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono ${
                    isActive ? 'bg-white text-indigo-700 shadow-xs' : 'bg-rose-500 text-white'
                  }`}>
                    {favoritesCount > 99 ? '99+' : favoritesCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
