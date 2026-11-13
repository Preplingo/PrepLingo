import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { WordEntry, CefrLevel, PartOfSpeech } from '../types';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWord: (word: WordEntry) => void;
}

export const AddWordModal: React.FC<AddWordModalProps> = ({ isOpen, onClose, onAddWord }) => {
  const [word, setWord] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>('noun');
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>('B1');
  const [trMeaning, setTrMeaning] = useState('');
  const [enExample, setEnExample] = useState('');
  const [trExample, setTrExample] = useState('');
  const [academicNote, setAcademicNote] = useState('');
  const [collocationsText, setCollocationsText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !trMeaning.trim()) return;

    const collocations = collocationsText
      ? collocationsText.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const newEntry: WordEntry = {
      id: `custom-${Date.now()}`,
      word: word.trim(),
      phonetic: phonetic.trim() ? (phonetic.startsWith('/') ? phonetic.trim() : `/${phonetic.trim()}/`) : '/-/',
      partOfSpeech,
      cefrLevel,
      trMeaning: trMeaning.trim(),
      enExample: enExample.trim() || `The professor asked us to define the term "${word.trim()}".`,
      trExample: trExample.trim() || `Profesör bizden "${word.trim()}" terimini tanımlamamızı istedi.`,
      collocations: collocations.length > 0 ? collocations : undefined,
      academicNote: academicNote.trim() || undefined,
      isCustom: true,
      isFavorite: false,
      status: 'calisiliyor',
    };

    onAddWord(newEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Yeni Hazırlık Kelimesi Ekle
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="px-6 py-2 overflow-y-auto space-y-4 flex-1">
          {/* English Word & Phonetic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                İngilizce Kelime *
              </label>
              <input
                type="text"
                required
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Örn: formulate"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Fonetik / Telaffuz (isteğe bağlı)
              </label>
              <input
                type="text"
                value={phonetic}
                onChange={(e) => setPhonetic(e.target.value)}
                placeholder="/ˈfɔː.mjə.leɪt/"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* CEFR Level & Part of Speech */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                CEFR Seviyesi
              </label>
              <select
                value={cefrLevel}
                onChange={(e) => setCefrLevel(e.target.value as CefrLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="A1">A1 - Başlangıç</option>
                <option value="A2">A2 - Temel</option>
                <option value="B1">B1 - Orta Düzey</option>
                <option value="B2">B2 - Üst Orta / Yeterlilik</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Kelime Türü
              </label>
              <select
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value as PartOfSpeech)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="noun">İsim (Noun)</option>
                <option value="verb">Fiil (Verb)</option>
                <option value="adjective">Sıfat (Adjective)</option>
                <option value="adverb">Zarf (Adverb)</option>
              </select>
            </div>
          </div>

          {/* Turkish Meaning */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Türkçe Anlamı *
            </label>
            <input
              type="text"
              required
              value={trMeaning}
              onChange={(e) => setTrMeaning(e.target.value)}
              placeholder="Örn: formüle etmek, açıkça ifade etmek"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* English Example & Turkish Example */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                İngilizce Örnek Cümle
              </label>
              <textarea
                rows={2}
                value={enExample}
                onChange={(e) => setEnExample(e.target.value)}
                placeholder="The team must formulate a new hypothesis before testing."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Örnek Cümlenin Türkçe Çevirisi
              </label>
              <textarea
                rows={2}
                value={trExample}
                onChange={(e) => setTrExample(e.target.value)}
                placeholder="Ekip test yapmadan önce yeni bir hipotez formüle etmelidir."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
          </div>

          {/* Collocations */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Birlikte Kullanımlar (Collocations - virgülle ayırın)
            </label>
            <input
              type="text"
              value={collocationsText}
              onChange={(e) => setCollocationsText(e.target.value)}
              placeholder="Örn: formulate a policy, formulate a plan"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Academic Tip */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Hazırlık Sınavı İpucu / Not (isteğe bağlı)
            </label>
            <input
              type="text"
              value={academicNote}
              onChange={(e) => setAcademicNote(e.target.value)}
              placeholder="Örn: Akademik kompozisyon ve makale girişlerinde sıkça kullanılır."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 pb-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-sm shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Kelimeyi Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
