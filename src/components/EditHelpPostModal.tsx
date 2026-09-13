import React, { useState } from 'react';
import { HelpPost, TagItem } from '../types';
import { TagSelector } from './TagSelector';
import { getStoredTags } from '../utils/tagUtils';
import { Edit3, CheckCircle2, AlertTriangle, X, Save } from 'lucide-react';

interface EditHelpPostModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPost: HelpPost) => void;
}

export const EditHelpPostModal: React.FC<EditHelpPostModalProps> = ({
  post,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !post) return null;

  const isConfirmed = post.isConfirmed || post.status === 'confirmed' || (post.helpersAccepted && post.helpersAccepted > 0);

  const [whatHappened, setWhatHappened] = useState(post.whatHappened || '');
  const [whatIsNeeded, setWhatIsNeeded] = useState(post.whatIsNeeded || '');
  const [conditions, setConditions] = useState(post.conditions || '');
  const [specialNotice, setSpecialNotice] = useState(post.specialNotice || '');
  const [transport, setTransport] = useState(post.transport || '');
  const [payment, setPayment] = useState(post.payment || '');
  const [helpersNeeded, setHelpersNeeded] = useState<number>(post.helpersNeeded || post.helpersCount || 1);

  const [allTags, setAllTags] = useState<TagItem[]>(() => getStoredTags());
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(() => {
    if (post.tagName) {
      return {
        id: post.tagId || 'tag_curr',
        tagName: post.tagName,
        category: post.tagCategory || '',
      };
    }
    return null;
  });

  const [errorMsg, setErrorMsg] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isConfirmed) {
      setErrorMsg('මෙම දැන්වීම සාර්ථකව තහවුරු කර ඇති බැවින් විස්තර වෙනස් කිරීමට නොහැක.');
      return;
    }

    if (!whatHappened.trim() || !whatIsNeeded.trim()) {
      setErrorMsg('කරුණාකර සියලු අත්‍යවශ්‍ය තොරතුරු (සිදුවී ඇති දේ සහ වියයුතු දේ) පූරණය කරන්න.');
      return;
    }

    const updatedPost: HelpPost = {
      ...post,
      whatHappened: whatHappened.trim(),
      whatIsNeeded: whatIsNeeded.trim(),
      conditions: conditions.trim(),
      specialNotice: specialNotice.trim(),
      transport: transport.trim(),
      payment: payment.trim(),
      helpersNeeded: helpersNeeded,
      helpersCount: helpersNeeded,
      tagName: selectedTag?.tagName || post.tagName,
      tagCategory: selectedTag?.category || post.tagCategory,
      tagId: selectedTag?.id || post.tagId,
    };

    onSave(updatedPost);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-[#071710] border-2 border-emerald-500/60 rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-emerald-500/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-300">
              <Edit3 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>දැන්වීම් විස්තර සංස්කරණය (Edit Post)</span>
                <span className="text-xs font-mono bg-emerald-900/80 border border-emerald-400/40 px-2 py-0.5 rounded-lg text-emerald-300 font-bold">
                  #{post.postCode}
                </span>
              </h3>
              <p className="text-xs text-emerald-200 font-medium">
                ඔබ ඇතුළත් කළ තොරතුරු යාවත්කාලීන කරන්න.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-rose-600 text-white flex items-center justify-center font-bold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-900 dark:text-slate-100">
          
          {/* Confirmed Notice Warning (Requirement 01) */}
          {isConfirmed ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/80 border-2 border-amber-400 rounded-2xl space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>දැන්වීම වෙනස් කිරීමට නොහැක! (Already Confirmed)</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-bold leading-relaxed">
                මෙම දැන්වීම යම් අයෙකු විසින් තහවුරු කර ඇති බැවින් (Confirmed/Solved) ඇතුළත් කළ කරුණු වෙනස් කිරීමට නොහැකි වන පරිදි අක්‍රිය කර ඇත.
              </p>
            </div>
          ) : (
            <form id="editPostForm" onSubmit={handleFormSubmit} className="space-y-4">
              
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. සිදුවී ඇති දේ (What Happened) */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  1. සිදුවී ඇති දේ (What Happened) *
                </label>
                <textarea
                  rows={2}
                  value={whatHappened}
                  onChange={(e) => setWhatHappened(e.target.value)}
                  required
                  className="w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 2. වියයුතු දේ (What is Needed) */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  2. වියයුතු දේ (What is Needed) *
                </label>
                <textarea
                  rows={2}
                  value={whatIsNeeded}
                  onChange={(e) => setWhatIsNeeded(e.target.value)}
                  required
                  className="w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Tag Selector Component */}
              <TagSelector
                selectedTag={selectedTag}
                onSelectTag={(tag) => setSelectedTag(tag)}
                allTags={allTags}
                onTagCreated={(newTag) => setAllTags((prev) => [newTag, ...prev])}
              />

              {/* 3. කොන්දේසි (Conditions) */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  3. කොන්දේසි (Conditions)
                </label>
                <input
                  type="text"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  className="w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 4. විශේෂ දැනුවත් කිරීම (Special Notice) */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  4. විශේෂ දැනුවත් කිරීම (Special Notice)
                </label>
                <input
                  type="text"
                  value={specialNotice}
                  onChange={(e) => setSpecialNotice(e.target.value)}
                  className="w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 5. ගමනාගමනය (Transport) */}
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                    5. ගමනාගමනය (Transport)
                  </label>
                  <input
                    type="text"
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    className="w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 6. ගෙවීම් (Payment) */}
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                    6. ගෙවීම් (Payment)
                  </label>
                  <input
                    type="text"
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                    className="w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 7. අවශ්‍ය සහායකයින් ගණන */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  7. අවශ්‍ය සහායකයින් ගණන (Helpers Needed)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={helpersNeeded}
                  onChange={(e) => setHelpersNeeded(Number(e.target.value) || 1)}
                  className="w-full sm:w-1/2 bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-emerald-50 dark:bg-[#05170f] border-t border-emerald-200 dark:border-emerald-800/80 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-300 cursor-pointer"
          >
            අවලංගුයි
          </button>

          {!isConfirmed && (
            <button
              type="submit"
              form="editPostForm"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>ලබාදුන් වෙනස්කම් සුරකින්න (Save Changes)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
