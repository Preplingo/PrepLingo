import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { WordEntry } from '../types';
import { speakText } from '../utils/textToSpeech';
import {
  isSpeechRecognitionSupported,
  evaluateSpeechAccuracy,
  PronunciationResult
} from '../utils/speechRecognition';
import { getCefrBadgeClass, getPosBadgeClass, getPosTurkishLabel } from '../utils/themeBadges';
import confetti from 'canvas-confetti';

interface SpeakingPracticeProps {
  words: WordEntry[];
  initialWordId?: string;
}

// Global browser SpeechRecognition type declaration
interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export const SpeakingPractice: React.FC<SpeakingPracticeProps> = ({ words, initialWordId }) => {
  const [selectedWordIndex, setSelectedWordIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedTranscript, setRecordedTranscript] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<PronunciationResult | null>(null);
  const [isListeningAudio, setIsListeningAudio] = useState(false);
  const [isSlowAudio, setIsSlowAudio] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [recognitionSupported, setRecognitionSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setRecognitionSupported(isSpeechRecognitionSupported());
  }, []);

  // Set initial word if passed
  useEffect(() => {
    if (initialWordId) {
      const idx = words.findIndex((w) => w.id === initialWordId);
      if (idx !== -1) {
        setSelectedWordIndex(idx);
        setEvaluationResult(null);
        setRecordedTranscript('');
      }
    }
  }, [initialWordId, words]);

  const currentWord = words[selectedWordIndex] || words[0];

  const handleNextWord = () => {
    setSelectedWordIndex((prev) => (prev + 1) % words.length);
    setEvaluationResult(null);
    setRecordedTranscript('');
    setMicError(null);
  };

  const handlePrevWord = () => {
    setSelectedWordIndex((prev) => (prev - 1 + words.length) % words.length);
    setEvaluationResult(null);
    setRecordedTranscript('');
    setMicError(null);
  };

  // Speaks English ONLY
  const handleListenSample = (text: string) => {
    setIsListeningAudio(true);
    speakText(text, 'en-US', isSlowAudio ? 0.75 : 1.0, () => {
      setIsListeningAudio(false);
    });
  };

  const startRecording = () => {
    setMicError(null);
    setEvaluationResult(null);
    setRecordedTranscript('');

    const win = window as unknown as IWindowWithSpeech;
    const SpeechRecognitionConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setMicError('Tarayıcınızda konuşma tanıma özelliği desteklenmiyor. Lütfen Chrome, Edge veya Safari güncel sürümü kullanın.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setRecordedTranscript(transcript);
        const evalResult = evaluateSpeechAccuracy(currentWord.enExample, transcript);
        setEvaluationResult(evalResult);
        setIsRecording(false);

        if (evalResult.accuracy >= 85) {
          confetti({
            particleCount: 50,
            spread: 50,
            origin: { y: 0.7 },
          });
        }
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        console.warn('Konuşma tanıma hatası:', event.error);
        if (event.error === 'not-allowed') {
          setMicError('Mikrofon izni verilmedi. Lütfen tarayıcı ayarlarından mikrofon erişimine izin verin.');
        } else if (event.error === 'no-speech') {
          setMicError('Ses algılanamadı. Lütfen mikrofona daha yakın konuşarak tekrar deneyin.');
        } else {
          setMicError(`Ses algılama hatası (${event.error}). Lütfen tekrar deneyin.`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsRecording(false);
      setMicError('Mikrofon başlatılamadı. Lütfen mikrofon bağlantınızı kontrol edip tekrar deneyin.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsRecording(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Practice Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        {/* Top Header: Word + Level + Index */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs uppercase px-2.5 py-1 rounded-lg tracking-wide ${getCefrBadgeClass(currentWord.cefrLevel)}`}>
              {currentWord.cefrLevel}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-lg ${getPosBadgeClass(currentWord.partOfSpeech)}`}>
              {getPosTurkishLabel(currentWord.partOfSpeech)}
            </span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevWord}
              className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Önceki cümle"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-mono text-slate-400">
              {selectedWordIndex + 1} / {words.length}
            </span>
            <button
              type="button"
              onClick={handleNextWord}
              className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Sonraki cümle"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Word Info & English Audio */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold font-['Outfit'] text-slate-900 dark:text-white">
              {currentWord.word}
            </h2>
          </div>
          {/* ENGLISH audio button */}
          <button
            type="button"
            onClick={() => handleListenSample(currentWord.word)}
            className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
            title="İngilizce kelimeyi dinle"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        {/* Target Sentence Box */}
        <div className="bg-slate-50/90 dark:bg-slate-950/60 rounded-2xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-800 space-y-3">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
              Seslendirilecek İngilizce Cümle:
            </span>
            <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
              &quot;{currentWord.enExample}&quot;
            </p>
            {/* Turkish translation: NO AUDIO BUTTON */}
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              &quot;{currentWord.trExample}&quot;
            </p>
          </div>

          {/* Audio Pacing Controls (ENGLISH ONLY) */}
          <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-200/50 dark:border-slate-800/60">
            <button
              type="button"
              onClick={() => handleListenSample(currentWord.enExample)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 flex items-center gap-1.5 transition-colors ${
                isListeningAudio ? 'animate-pulse text-indigo-600' : ''
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Önce Doğru Telaffuzu Dinle</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSlowAudio(!isSlowAudio)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono border transition-colors ${
                isSlowAudio
                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                  : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title="Yavaş oynatmayı aç/kapat"
            >
              {isSlowAudio ? 'Yavaş (0.75x)' : 'Normal (1.0x)'}
            </button>
          </div>
        </div>

        {/* Error message if microphone issue */}
        {micError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>{micError}</p>
            </div>
          </div>
        )}

        {/* Speaking Trigger Area */}
        <div className="pt-2 text-center space-y-3">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-lg ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-500/20 shadow-rose-600/30'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 active:scale-95 shadow-indigo-600/30'
            }`}
            aria-label={isRecording ? 'Kaydı Durdur' : 'Kaydı Başlat'}
          >
            {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>

          <div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
              {isRecording ? 'Dinleniyor... Cümleyi şimdi seslendirin!' : 'Mikrofona Dokun ve Telaffuzunu Test Et'}
            </span>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {isRecording ? 'Konuşmayı bitirince tekrar dokunun' : 'İngilizce cümleyi sesli olarak okuyun'}
            </p>
          </div>
        </div>

        {/* Evaluation Feedback Panel */}
        {evaluationResult && (
          <div className="mt-4 p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-4 animate-in fade-in duration-200">
            {/* Accuracy Score Banner */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                  Telaffuz Doğruluk Skoru
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-extrabold font-mono ${
                      evaluationResult.accuracy >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : evaluationResult.accuracy >= 60
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    %{evaluationResult.accuracy}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {evaluationResult.accuracy >= 85 ? 'Mükemmel Telaffuz!' : evaluationResult.accuracy >= 60 ? 'Başarılı' : 'Geliştirilmeli'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={handleNextWord}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>Sonraki Cümle</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Word-by-Word Breakdown Tokens */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Kelime Bazında Artikülasyon:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {evaluationResult.wordsAnalysis.map((item, idx) => {
                  let badgeClass = '';
                  if (item.status === 'matched') {
                    badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
                  } else if (item.status === 'near') {
                    badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
                  } else {
                    badgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800';
                  }

                  return (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 ${badgeClass}`}
                    >
                      <span>{item.word}</span>
                      {item.status === 'matched' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : null}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Academic Feedback Tip */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5 text-slate-900 dark:text-white">Telaffuz Testi Değerlendirmesi:</strong>
                <span className="leading-relaxed">{evaluationResult.feedback}</span>
              </div>
            </div>

            {/* Recognized Speech Transcript */}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span>Algılanan Konuşma: </span>
              <span className="italic font-mono text-slate-700 dark:text-slate-300">
                &quot;{evaluationResult.transcript}&quot;
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
