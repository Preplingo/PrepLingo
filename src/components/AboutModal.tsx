import React, { useEffect, useState } from 'react';
import {
  X,
  GraduationCap,
  Database,
  WifiOff,
  Sparkles,
  BookOpen,
  Heart,
  ShieldCheck,
  Mail,
  Check,
  MessageSquareHeart,
} from 'lucide-react';
import { AppLogo } from './AppLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const supportEmail = 'preplingostudio@gmail.com';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFeedbackClick = () => {
    const mailtoUrl = `mailto:${supportEmail}?subject=Preplingo%20Geri%20Bildirim%20ve%20%C3%96neri&body=Merhaba%20Preplingo%20Ekibi%2C%0A%0A%5BHata%20bildirimi%2C%20eksik%20kelime%20veya%20%C3%B6nerinizi%20buraya%20yazabilirsiniz%5D%0A%0A%C4%B0yi%20%C3%A7al%C4%B1%C5%9Fmalar.`;

    try {
      window.location.href = mailtoUrl;
    } catch {
      // Fallback: clipboard copy
    }

    // Also copy to clipboard so users without a default mail client don't get stuck
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(supportEmail).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto animate-in zoom-in-95 duration-200 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Kapat"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header / Brand info */}
        <div className="flex items-center gap-3.5 pr-8">
          <AppLogo size={46} />
          <div>
            <div className="flex items-center gap-2">
              <h3 id="about-modal-title" className="text-xl sm:text-2xl font-bold font-['Outfit'] text-slate-900 dark:text-white">
                PrepLingo
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
                AKADEMİK &amp; GENEL SÖZLÜK
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Üniversite Hazırlık, YDS/IELTS/TOEFL ve Tüm İngilizce Öğrenenler İçin Sözlük &amp; Çalışma Platformu
            </p>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="space-y-3.5 pt-1 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
          {/* Section 1: Prep Exam & All Learners Focus */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-indigo-950 dark:text-indigo-200">
              <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Üniversite Hazırlık, Sınavlar ve Tüm Öğrenenler İçin</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
              Üniversite hazırlık öğrencileri, yeni başlayanlar ve YDS, YÖKDİL, IELTS, TOEFL sınavlarına hazırlananlar için kapsamlı İngilizce-Türkçe / Türkçe-İngilizce sözlük ve kelime platformu. A1–B2 temel sözcüklerden yüksek frekanslı 2.500 akademik kelimeye ve 30.000+ genel sözlük arşivine kadar tüm seviyeleri kapsar.
            </p>
          </div>

          {/* Section 2: Dual Layer Architecture */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Bilinçli İki Katmanlı Sözlük Mimarisi</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2.500 Zengin Akademik Kart</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  CEFR A1–B2 seviye rozetleri, İngilizce telaffuz sesleri, çift dilli örnek cümleler, sınav ipuçları ve fiil çekim formları (V1/V2/V3).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-300">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>25.000+ Kelimelik Genel Sözlük</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Akademik liste dışındaki günlük kelimeleri aradığınızda, internet gerekmeksizin anında Türkçe karşılık sağlayan ultra hafif çevrimdışı yedek katman.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: 100% Offline & Kelime Defterim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                <WifiOff className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>%100 Çevrimdışı (Offline-First)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tüm veri tabanı, arama motoru ve ses sentezleyici cihazınızda yerel çalışır. Metroda, otobüste veya uçuş modunda kesintisiz çalışabilirsiniz.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                <Heart className="w-4 h-4 text-rose-500 shrink-0 fill-rose-500" />
                <span>Kişisel Kelime Defterim</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Kartlardaki kalp simgesine dokunarak zorlandığınız kelimeleri defterinize kaydedebilir, türlerine göre filtreleyerek odaklı tekrar yapabilirsiniz.
              </p>
            </div>
          </div>

          {/* Section 4: Contact, Support & Student Feedback */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-pink-50/60 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900/60 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                <MessageSquareHeart className="w-4 h-4 text-rose-500 shrink-0" />
                <span>İletişim &amp; Destek</span>
              </div>
              {copied && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 animate-in fade-in duration-150">
                  <Check className="w-3 h-3" />
                  <span>E-posta adresi kopyalandı!</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Hatalı gördüğünüz bir kelimeyi, teknik desteği veya önerilerinizi bize iletebilirsiniz. Öğrenci geri bildirimleriyle PrepLingo her geçen gün daha da gelişiyor.
            </p>

            <div className="pt-1 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
              <a
                href={`mailto:${supportEmail}?subject=PrepLingo%20%C4%B0leti%C5%9Fim%20ve%20Destek`}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs transition-all inline-flex items-center justify-center gap-2 shadow-xs"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>{supportEmail}</span>
              </a>

              <button
                type="button"
                onClick={handleFeedbackClick}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 font-semibold text-xs transition-all cursor-pointer"
              >
                E-posta Adresini Kopyala
              </button>

              <a
                href="https://preplingo-privacy.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 font-semibold text-xs transition-all inline-flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Gizlilik Politikası</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer info & Dismiss */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Kişisel verileriniz ve ilerlemeniz yalnızca cihazınızda saklanır.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
};
