import React from 'react';
import { 
  AlertTriangle, 
  Wrench, 
  FileText, 
  Car, 
  Banknote, 
  MapPin, 
  Phone, 
  MessageSquare, 
  UserCheck, 
  Share2, 
  Clock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { HelpPost, Language } from '../types';
import { translations } from '../data/translations';
import { Card3D } from './Card3D';

interface PostCardProps {
  post: HelpPost;
  lang: Language;
  onOfferSupport: (post: HelpPost) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, lang, onOfferSupport }) => {
  const t = translations[lang];

  const handleWhatsAppClick = () => {
    const formattedPhone = post.userPhone.replace(/^0/, '94');
    const text = encodeURIComponent(
      `හලෝ ${post.userName}, මම සහය සේවා (Sahaya Seva) ඇප් එකෙන් ඔබේ ඉල්ලීම (${post.postCode}) දැක්කා. මට ඔබට සහාය වීමට හැක.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  const isLocal = post.distanceKm <= 15;

  return (
    <Card3D className="bg-slate-900/90 border border-slate-700/70 hover:border-emerald-500/50 shadow-xl rounded-2xl p-5 sm:p-6 transition-all duration-300 relative group overflow-hidden">
      
      {/* Top Banner Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"></div>

      {/* Post Header: Code, Distance Badge, Time */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold bg-slate-800 text-emerald-400 px-2.5 py-1 rounded-lg border border-slate-700">
            {post.postCode}
          </span>
          {post.verifiedOtp && (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              OTP Verified
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Distance Badge (<15km vs >15km) */}
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border ${
              isLocal
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-amber-950/90 text-amber-300 border-amber-500/50'
            }`}
          >
            <MapPin className="w-3 h-3" />
            {isLocal ? `ළඟම (${post.distanceKm.toFixed(1)} km)` : `දුරස්ථ (${post.distanceKm.toFixed(1)} km)`}
          </span>

          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {post.createdAt}
          </span>
        </div>
      </div>

      {/* User Info & Location Header */}
      <div className="flex items-center justify-between gap-3 mb-4 bg-slate-850/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-sm shadow">
            {post.userName.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">{post.userName}</h4>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-rose-400" />
              {post.locationName}
            </p>
          </div>
        </div>

        {/* Direct WhatsApp Call Button */}
        <button
          onClick={handleWhatsAppClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 text-xs font-semibold transition-all shadow-sm active:scale-95"
          title="Direct WhatsApp Contact"
        >
          <Phone className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">WhatsApp</span>
          <ExternalLink className="w-3 h-3 text-emerald-400" />
        </button>
      </div>

      {/* Main Details Grid */}
      <div className="space-y-3 mb-5 text-sm">
        {/* 📌 සිදුවී ඇති දේ (What Happened) */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-500/20">
          <div className="flex items-center gap-1.5 font-bold text-rose-400 text-xs uppercase tracking-wider mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>{t.whatHappenedLabel}</span>
          </div>
          <p className="text-slate-200 font-medium leading-relaxed">{post.whatHappened}</p>
        </div>

        {/* 🛠️ වියයුතු දේ (What is Needed) */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/20">
          <div className="flex items-center gap-1.5 font-bold text-cyan-400 text-xs uppercase tracking-wider mb-1">
            <Wrench className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.whatIsNeededLabel}</span>
          </div>
          <p className="text-slate-200 font-medium leading-relaxed">{post.whatIsNeeded}</p>
        </div>

        {/* Optional Section: 📜 කොන්දේසි (Conditions) */}
        {post.conditions && (
          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-amber-500/20 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 uppercase tracking-wider mb-0.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.conditionsLabel}</span>
            </div>
            <p className="text-slate-300 leading-snug">{post.conditions}</p>
          </div>
        )}

        {/* Transport & Payment Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* 🚗 ගමනාගමනය (Transport) */}
          <div className="p-2.5 rounded-xl bg-slate-850/80 border border-slate-800 flex items-start gap-2">
            <Car className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <span className="block font-semibold text-slate-400 text-[10px] uppercase">
                {t.transportLabel}
              </span>
              <span className="text-slate-200 font-medium">{post.transport}</span>
            </div>
          </div>

          {/* 💰 ගෙවීම් (Payment/Reward) */}
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2">
            <Banknote className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <span className="block font-semibold text-emerald-400 text-[10px] uppercase">
                {t.paymentLabel}
              </span>
              <span className="text-emerald-200 font-bold">{post.payment}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Responses & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
        
        {/* Helpers & Replies badges */}
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-slate-200">{post.helpersCount}</span> {t.helpersCountLabel}
          </span>
          {post.replies && post.replies.length > 0 && (
            <span className="flex items-center gap-1 text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-slate-200">{post.replies.length}</span> පිළිතුරු
            </span>
          )}
        </div>

        {/* Offer Support Main CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOfferSupport(post)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all transform active:scale-95"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t.quickReplyBtn}</span>
          </button>
        </div>
      </div>

    </Card3D>
  );
};
