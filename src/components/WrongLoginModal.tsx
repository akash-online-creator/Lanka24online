import React from 'react';
import { Language } from '../types';
import { translations } from '../data/translations';

interface WrongLoginModalProps {
  isOpen: boolean;
  onRetry: () => void;
  language: Language;
}

export const WrongLoginModal: React.FC<WrongLoginModalProps> = ({
  isOpen,
  onRetry,
  language,
}) => {
  if (!isOpen) return null;
  const t = translations[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-[360px] bg-[#1e1010] border border-red-500/30 p-6 sm:p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_25px_rgba(239,68,68,0.3)] backdrop-blur-xl animate-scaleUp">
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center animate-pulse">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <h3 className="text-center text-red-400 font-bold text-lg mb-2">
          {t.wrongLoginHeader}
        </h3>

        <p className="text-center text-red-200/90 text-sm mb-6 leading-relaxed font-medium">
          {t.wrongLoginMsg}
        </p>

        <button
          onClick={onRetry}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-widest py-3.5 rounded-xl shadow-[0_10px_20px_rgba(220,38,38,0.4)] border-b-4 border-red-900 transition-all active:translate-y-1 active:border-b-0 cursor-pointer"
        >
          {t.retryBtn}
        </button>
      </div>
    </div>
  );
};
