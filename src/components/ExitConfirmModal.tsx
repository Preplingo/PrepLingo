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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-[#ffffff] dark:bg-[#1e293b] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#e2e8f0] dark:border-[#334155] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancelExit}
          className="absolute top-4 right-4 p-2 text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-[#f8fafc] rounded-xl hover:bg-[#f1f5f9] dark:hover:bg-[#0f172a] transition-colors cursor-pointer"
          title="Kapat"
          aria-label="Kapat"
        >
          <X width={20} height={20} stroke="currentColor" fill="none" className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#fffbeb] dark:bg-[#451a03] border border-[#fde68a] dark:border-[#92400e] flex items-center justify-center text-[#d97706] dark:text-[#fbbf24] shrink-0">
            <ShieldAlert width={24} height={24} stroke="currentColor" fill="none" className="w-6 h-6" />
          </div>
          <div>
            <h3 id="exit-modal-title" className="text-lg sm:text-xl font-bold font-['Outfit'] text-[#0f172a] dark:text-[#f8fafc]">
              Çıkış Onayı
            </h3>
            <p className="text-xs text-[#475569] dark:text-[#94a3b8]">
              PrepLingo Güvenli Çıkış Koruması
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="py-2 space-y-2">
          <p className="text-base font-semibold text-[#0f172a] dark:text-[#f8fafc] leading-snug">
            Uygulamadan çıkmak istediğinize emin misiniz?
          </p>
          <p className="text-xs text-[#475569] dark:text-[#94a3b8] leading-relaxed">
            Kaydettiğiniz kelimeler ve çalışma ilerlemeniz cihazınızda güvendedir. Dilediğiniz zaman kaldığınız yerden devam edebilirsiniz.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onConfirmExit}
            className="w-full sm:w-1/2 py-3 px-4 rounded-2xl border border-[#fecdd3] dark:border-[#9f1239] bg-[#fff1f2] hover:bg-[#ffe4e6] dark:bg-[#4c0519] dark:hover:bg-[#881337] text-[#be123c] dark:text-[#fda4af] font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <LogOut width={16} height={16} stroke="currentColor" fill="none" className="w-4 h-4" />
            <span>Evet, Çık</span>
          </button>

          <button
            type="button"
            onClick={onCancelExit}
            style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
            className="legacy-btn-green w-full sm:w-1/2 py-3 px-4 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-[#ffffff] font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Vazgeç / Uygulamada Kal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
