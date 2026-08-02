import React from 'react';
import { MessageCircle, CheckCircle, MapPin, Users, Wrench, Car, Banknote, HelpCircle } from 'lucide-react';
import { HelpPost, Language } from '../types';
import { Card3D } from './Card3D';

interface QuickServiceDetailModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (post: HelpPost) => void;
  onOpenConfirm: (post: HelpPost) => void;
  lang: Language;
}

export const QuickServiceDetailModal: React.FC<QuickServiceDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  onOpenChat,
  onOpenConfirm,
}) => {
  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/50 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden relative p-6">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-slate-800 text-emerald-400 px-3 py-1 rounded-xl border border-slate-700">
              {post.postCode}
            </span>
            <span className="text-xs text-slate-400">ක්ෂණික සේවා විස්තරය</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content Box formatted exactly as per PDF node 4 */}
        <Card3D className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-3 mb-6 text-sm">
          
          {/* Hi Greeting */}
          <div className="text-base font-extrabold text-white flex items-center gap-2">
            <span>Hi, මම</span>
            <span className="text-emerald-400">{post.userName}</span>
          </div>

          {/* Problem */}
          <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-200 font-bold">
            {post.whatHappened}
          </div>

          {/* Requested Result */}
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>උදව් ඉල්ලන්නේ: <strong className="text-cyan-300">{post.whatIsNeeded}</strong></span>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>ඔබ ඉන්න තැනට <strong className="text-emerald-400 font-mono text-base">{post.distanceKm || 20}KM</strong> දුරයි</span>
          </div>

          {/* Helpers needed */}
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <span>මට <strong className="text-amber-300 font-bold">{post.helpersNeeded || 3} දෙනෙක්</strong> අවශ්‍යයි</span>
          </div>

          {/* Conditions */}
          {post.conditions && (
            <div className="flex items-start gap-2 text-slate-300 text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <Wrench className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{post.conditions}</span>
            </div>
          )}

          {/* Transport */}
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <Car className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{post.transport}</span>
          </div>

          {/* Payment */}
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
            <Banknote className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>ගෙවීම් ලෙස {post.payment}</span>
          </div>

          <p className="text-center text-emerald-400 font-extrabold pt-2 text-base tracking-wide">
            උදව් කරන්න.
          </p>

        </Card3D>

        {/* Bottom Action Buttons: CHAT and CONFIRM */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onOpenChat(post)}
            className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-extrabold text-sm border border-cyan-500/40 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
          >
            <MessageCircle className="w-4 h-4 text-cyan-400" />
            <span>CHAT</span>
          </button>

          <button
            onClick={() => onOpenConfirm(post)}
            className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <CheckCircle className="w-4 h-4 text-white" />
            <span>CONFIRM</span>
          </button>
        </div>

      </div>
    </div>
  );
};
