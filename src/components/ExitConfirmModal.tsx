import React, { useEffect } from 'react';
import { LogOut, X, ShieldAlert } from 'lucide-react';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onConfirmExit: () => void;
  onCancelExit: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onConfirmExit,
  onCancelExit,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancelExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancelExit]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancelExit}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Kapat"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 id="exit-modal-title" className="text-lg sm:text-xl font-bold font-['Outfit'] text-slate-900 dark:text-white">
              Çıkış Onayı
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              PrepLingo Güvenli Çıkış Koruması
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="py-2 space-y-2">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200 leading-snug">
            Uygulamadan çıkmak istediğinize emin misiniz?
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Kaydettiğiniz kelimeler ve çalışma ilerlemeniz cihazınızda güvendedir. Dilediğiniz zaman kaldığınız yerden devam edebilirsiniz.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onConfirmExit}
            className="w-full sm:w-1/2 py-3 px-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>Evet, Çık</span>
          </button>

          <button
            type="button"
            onClick={onCancelExit}
            className="w-full sm:w-1/2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Vazgeç / Uygulamada Kal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
