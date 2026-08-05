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
    <Card3D className="bg-white border-2 border-emerald-500/20 hover:border-emerald-500/60 shadow-[0_12px_30px_rgba(0,122,75,0.08),0_2px_8px_rgba(0,0,0,0.04)] rounded-3xl p-5 sm:p-6 transition-all duration-300 relative group overflow-hidden text-slate-900">
      
      {/* Top Banner Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400"></div>

      {/* Post Header: Code, Distance Badge, Time */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-200">
            {post.postCode}
          </span>
          {post.verifiedOtp && (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              OTP Verified
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Distance Badge (<15km vs >15km) */}
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border ${
              isLocal
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm'
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            <MapPin className="w-3 h-3" />
            {isLocal ? `ළඟම (${post.distanceKm.toFixed(1)} km)` : `දුරස්ථ (${post.distanceKm.toFixed(1)} km)`}
          </span>

          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {post.createdAt}
          </span>
        </div>
      </div>

      {/* User Info & Location Header */}
      <div className="flex items-center justify-between gap-3 mb-4 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-sm shadow">
            {post.userName.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">{post.userName}</h4>
            <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3 text-rose-500" />
              {post.locationName}
            </p>
          </div>
        </div>

        {/* Direct WhatsApp Call Button */}
        <button
          onClick={handleWhatsAppClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          title="Direct WhatsApp Contact"
        >
          <Phone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">WhatsApp</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Main Details Grid */}
      <div className="space-y-3 mb-5 text-sm">
        {/* 📌 සිදුවී ඇති දේ (What Happened) */}
        <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/90 shadow-sm">
          <div className="flex items-center gap-1.5 font-extrabold text-rose-700 text-xs uppercase tracking-wider mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>{t.whatHappenedLabel}</span>
          </div>
          <p className="text-slate-900 font-semibold leading-relaxed">{post.whatHappened}</p>
        </div>

        {/* 🛠️ වියයුතු දේ (What is Needed) */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 shadow-sm">
          <div className="flex items-center gap-1.5 font-extrabold text-emerald-800 text-xs uppercase tracking-wider mb-1">
            <Wrench className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.whatIsNeededLabel}</span>
          </div>
          <p className="text-slate-900 font-semibold leading-relaxed">{post.whatIsNeeded}</p>
        </div>

        {/* Optional Section: 📜 කොන්දේසි (Conditions) */}
        {post.conditions && (
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs shadow-sm">
            <div className="flex items-center gap-1.5 font-extrabold text-amber-800 uppercase tracking-wider mb-0.5">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>{t.conditionsLabel}</span>
            </div>
            <p className="text-slate-800 font-medium leading-snug">{post.conditions}</p>
          </div>
        )}

        {/* Transport & Payment Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* 🚗 ගමනාගමනය (Transport) */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2">
            <Car className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="block font-bold text-slate-500 text-[10px] uppercase">
                {t.transportLabel}
              </span>
              <span className="text-slate-900 font-semibold">{post.transport}</span>
            </div>
          </div>

          {/* 💰 ගෙවීම් (Payment/Reward) */}
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2">
            <Banknote className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="block font-bold text-emerald-800 text-[10px] uppercase">
                {t.paymentLabel}
              </span>
              <span className="text-emerald-950 font-extrabold">{post.payment}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Responses & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-emerald-100">
        
        {/* Helpers & Replies badges */}
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-slate-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl font-bold">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-extrabold text-emerald-900">{post.helpersCount}</span> {t.helpersCountLabel}
          </span>
          {post.replies && post.replies.length > 0 && (
            <span className="flex items-center gap-1 text-slate-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-xl font-bold">
              <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
              <span className="font-extrabold text-teal-900">{post.replies.length}</span> පිළිතුරු
            </span>
          )}
        </div>

        {/* Offer Support Main CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOfferSupport(post)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-[0_4px_0_#005a37] active:translate-y-1 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t.quickReplyBtn}</span>
          </button>
        </div>
      </div>

    </Card3D>
  );
};
