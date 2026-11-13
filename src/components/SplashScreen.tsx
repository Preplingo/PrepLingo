import React, { useEffect, useState, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { AppLogo } from './AppLogo';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 3500, // 3.5 seconds per user specification
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    const startTime = performance.now();

    const frame = () => {
      if (hasFinishedRef.current) return;
      const now = performance.now();
      const elapsed = now - startTime;
      const rawPct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(rawPct);

      // Start fade-out 350ms before duration completes
      if (elapsed >= durationMs - 350 && !isExiting) {
        setIsExiting(true);
      }

      if (elapsed >= durationMs) {
        hasFinishedRef.current = true;
        onComplete();
        return;
      }

      requestAnimationFrame(frame);
    };

    const animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [durationMs, onComplete, isExiting]);

  const handleSkip = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 200);
  };

  return (
    <div
      role="dialog"
      aria-label="Preplingo Açılış Ekranı"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020617] text-[#ffffff] select-none transition-all duration-400 ease-out ${
        isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Top-Right "Geç ›" (Skip) Pill Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={handleSkip}
          className="px-4 py-1.5 rounded-full bg-[#1e293b] hover:bg-[#334155] active:scale-95 text-xs text-[#e2e8f0] hover:text-[#ffffff] font-medium border border-[#475569] transition-all flex items-center gap-1 cursor-pointer shadow-sm group"
          title="Açılış ekranını geç"
        >
          <span>Geç</span>
          <ChevronRight
            width={14}
            height={14}
            fill="none"
            stroke="#e2e8f0"
            className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
          />
        </button>
      </div>

      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-600/25 rounded-full blur-3xl pointer-events-none animate-pulse delay-700" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0%,transparent_70%)] pointer-events-none" />

      {/* Main Branding Card Container */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm mx-auto">
        {/* Prominent Vector SVG Logo with Soft Pulse */}
        <div className="mb-6 relative">
          <div className="animate-[pulse_3s_ease-in-out_infinite]">
            <AppLogo size={110} animate={false} />
          </div>
          {/* Subtle Outer Ambient Ring */}
          <div className="absolute -inset-3 rounded-full bg-indigo-500/10 blur-md pointer-events-none -z-10" />
        </div>

        {/* Title: "Preplingo" - solid high-contrast HEX for full legacy browser support */}
        <h1 className="font-['Outfit'] font-extrabold text-4xl sm:text-5xl tracking-tight text-[#ffffff]">
          Preplingo
        </h1>

        {/* Subtitle */}
        <div className="mt-4 px-4 py-2.5 rounded-2xl bg-[#1e1b4b] border border-[#4338ca] shadow-inner flex items-start gap-2.5 text-left">
          <span className="w-2 h-2 rounded-full bg-[#34d399] animate-ping shrink-0 mt-1.5" />
          <span className="text-xs sm:text-sm font-medium text-[#e0e7ff] leading-relaxed">
            Üniversite hazırlık öğrencileri, yeni başlayanlar ve YDS, YÖKDİL, IELTS, TOEFL sınavlarına hazırlananlar için kapsamlı İngilizce-Türkçe / Türkçe-İngilizce sözlük ve kelime platformu
          </span>
        </div>

        {/* Smooth 0% to 100% Linear Loading Progress Bar */}
        <div className="mt-9 w-56 space-y-2.5">
          <div className="w-full bg-[#1e293b] h-2 rounded-full overflow-hidden p-0.5 border border-[#334155] shadow-inner">
            <div
              className="bg-[#6366f1] h-full rounded-full transition-all duration-75 ease-linear shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#94a3b8] font-mono px-0.5">
            <span className="text-[#94a3b8]">Hazırlanıyor...</span>
            <span className="text-[#a5b4fc] font-bold font-mono">%{Math.round(progress)}</span>
          </div>
        </div>

        {/* Subtle hint */}
        <button
          type="button"
          onClick={handleSkip}
          className="mt-6 text-[11px] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors cursor-pointer"
        >
          Beklemek istemiyorsanız dokunun
        </button>
      </div>
    </div>
  );
};
