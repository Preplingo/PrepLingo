import React from 'react';
import { BookOpen, Layers, Heart, Zap, TrendingUp } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  favoritesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, favoritesCount }) => {
  const tabs: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{
      className?: string;
      width?: number | string;
      height?: number | string;
      fill?: string;
      stroke?: string;
    }>;
  }[] = [
    { id: 'dictionary', label: 'Sözlük', icon: BookOpen },
    { id: 'flashcards', label: 'Kartlar', icon: Layers },
    { id: 'favorites', label: 'Defterim', icon: Heart },
    { id: 'games', label: 'Oyun', icon: Zap },
    { id: 'progress', label: 'Gelişim', icon: TrendingUp },
  ];

  return (
    <nav
      aria-label="Alt Menü Gezintisi"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#ffffff] dark:bg-[#0f172a] border-t border-[#e2e8f0] dark:border-[#1e293b] transition-colors"
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
              className="relative flex flex-col items-center justify-center min-w-[64px] min-h-[48px] py-1 px-2 rounded-2xl transition-all select-none group cursor-pointer"
            >
              {/* Material 3 active pill background */}
              <div
                style={isActive ? { backgroundColor: '#4f46e5', color: '#ffffff' } : undefined}
                className={`relative flex items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'legacy-btn-indigo bg-[#4f46e5] text-[#ffffff] shadow-sm scale-100'
                    : 'text-[#64748b] dark:text-[#94a3b8] group-hover:bg-[#f1f5f9] dark:group-hover:bg-[#1e293b]'
                }`}
              >
                <Icon
                  width={20}
                  height={20}
                  fill="none"
                  stroke={isActive ? '#ffffff' : '#64748b'}
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'scale-105' : 'group-hover:scale-105 dark:stroke-[#94a3b8]'
                  }`}
                />
                {tab.id === 'favorites' && typeof favoritesCount === 'number' && favoritesCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono ${
                      isActive ? 'bg-[#ffffff] text-[#4338ca] shadow-xs' : 'bg-[#f43f5e] text-[#ffffff]'
                    }`}
                  >
                    {favoritesCount > 99 ? '99+' : favoritesCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-[#4f46e5] dark:text-[#818cf8] font-semibold'
                    : 'text-[#64748b] dark:text-[#94a3b8]'
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
