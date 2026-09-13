import React, { useState } from 'react';
import { Sparkles, Check, X, BookOpen, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';
import { SearchSuggestionPrompt } from '../types';
import { learnAndSaveSynonymPair } from '../data/searchDictionary';

interface SmartSearchSynonymPromptProps {
  prompt: SearchSuggestionPrompt;
  onAcceptSuggestion: (newTerm: string) => void;
  onDismiss: () => void;
  className?: string;
}

export const SmartSearchSynonymPrompt: React.FC<SmartSearchSynonymPromptProps> = ({
  prompt,
  onAcceptSuggestion,
  onDismiss,
  className = '',
}) => {
  const [learnedNotice, setLearnedNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = () => {
    setIsProcessing(true);
    try {
      // 1. Persist the synonym association to the dynamic self-learning dictionary!
      const { updatedGroup, isNew } = learnAndSaveSynonymPair(
        prompt.originalQuery,
        prompt.suggestedTerm
      );

      setLearnedNotice(`"${prompt.originalQuery}" සහ "${prompt.suggestedTerm}" සාර්ථකව ඩික්ෂනරියේ සුරකින ලදී!`);

      // 2. Trigger the callback to update search results immediately
      setTimeout(() => {
        onAcceptSuggestion(prompt.suggestedTerm);
      }, 500);
    } catch (err) {
      console.warn('Failed to learn synonym:', err);
      onAcceptSuggestion(prompt.suggestedTerm);
    }
  };

  if (learnedNotice) {
    return (
      <div className={`p-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs font-bold animate-fadeIn ${className}`}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 animate-bounce" />
          <span>{learnedNotice}</span>
        </div>
        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
          Learned & Saved
        </span>
      </div>
    );
  }

  return (
    <div
      className={`p-3.5 sm:p-4 bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-teal-500/15 border-2 border-amber-400 dark:border-amber-500/80 rounded-2xl shadow-lg backdrop-blur-md animate-fadeIn text-slate-900 dark:text-slate-100 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Left: Question Header & Details */}
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-900 dark:text-amber-300 border border-amber-400/50">
                ස්මාර්ට් සෙවුම් යෝජනාව
              </span>
              {prompt.matchingCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-400/40">
                  දැන්වීම් {prompt.matchingCount} ක් පවතී
                </span>
              )}
            </div>

            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1 flex-wrap pt-0.5">
              <span>ඔබ සොයන්නේ</span>
              <span className="px-1.5 py-0.5 bg-amber-400 dark:bg-amber-500 text-slate-950 font-black rounded-lg text-xs sm:text-sm shadow-xs underline">
                "{prompt.suggestedTerm}"
              </span>
              <span>නේද?</span>
            </h4>

            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              ඔබ ටයිප් කළ <strong>"{prompt.originalQuery}"</strong> වෙනුවට ඩික්ෂනරියේ ඇති අදේශිත නම <strong>"{prompt.suggestedTerm}"</strong> මගින් දැන්වීම් සොයන්නද?
            </p>
          </div>
        </div>

        {/* Right: YES / NO Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          
          {/* YES BUTTON */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleAccept}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer border border-emerald-400/40"
          >
            <Check className="w-4 h-4" />
            <span>ඔව්, "{prompt.suggestedTerm}" සොයන්න</span>
          </button>

          {/* NO BUTTON */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={onDismiss}
            className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            title="මෙම යෝජනාව ඉවත් කරන්න"
          >
            <X className="w-3.5 h-3.5" />
            <span>නැත</span>
          </button>

        </div>

      </div>
    </div>
  );
};
