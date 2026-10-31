import React, { useState } from 'react';
import { AccommodationListing } from '../types/accommodation';
import { getTravelEstimate } from '../utils/accommodationStorage';
import {
  X,
  MapPin,
  Phone,
  MessageCircle,
  Navigation,
  Share2,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
} from 'lucide-react';

interface AccommodationDetailModalProps {
  item: AccommodationListing | null;
  onClose: () => void;
  userLat?: number;
  userLng?: number;
}

export const AccommodationDetailModal: React.FC<AccommodationDetailModalProps> = ({
  item,
  onClose,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  if (!item) return null;

  const photos = item.photos && item.photos.length > 0 ? item.photos : [
    {
      id: 'default_img',
      url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=720&h=1280&q=80',
      caption: 'නවාතැන',
      aspectRatio: '9:16' as const,
    }
  ];

  const travel = getTravelEstimate(item.distanceKm ?? 5);

  const getWhatsAppUrl = () => {
    const phone = item.ownerWhatsApp.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('0') ? `94${phone.slice(1)}` : phone;
    const msg = encodeURIComponent(
      `ආයුබෝවන්! මම 'සහය සේවා' ඇප් එකෙන් ඔබගේ "${item.title}" (#${item.id}) නවාතැන පිළිබඳ විස්තර දැනගැනීමට කැමතියි. එය තවමත් ලබාගත හැකිද?`
    );
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  const getGoogleMapsUrl = () => {
    return `https://www.google.com/maps/dir/?api=1&destination=${item.location.lat},${item.location.lng}`;
  };

  const handleShare = async () => {
    const shareText = `🏡 ${item.title}\n📍 ${item.location.city} (${travel.distanceText})\n💰 රු. ${item.price.toLocaleString()} (${item.pricePeriod === 'per_person_month' ? 'එක් අයෙකුට' : item.pricePeriod === 'per_day' ? 'දිනකට' : 'මසකට'})\n📞 ${item.ownerPhone}\n🧭 ${getGoogleMapsUrl()}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#071910] border-2 border-emerald-500 rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/20 text-white">
              {item.category === 'house'
                ? 'කුලී නිවාස'
                : item.category === 'boarding'
                ? 'බෝඩින් / ඇනෙක්ස්'
                : 'හෝටල් Room'}
            </span>
            <span className="text-xs font-mono text-emerald-200">
              #{item.id.replace('acc_', '')}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="relative w-full max-w-xs mx-auto aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl bg-black border-2 border-emerald-500">
              <img
                src={photos[activePhotoIndex].url}
                alt={photos[activePhotoIndex].caption || item.title}
                className="w-full h-full object-cover"
              />

              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/70 text-white font-mono text-xs font-bold border border-white/20">
                {activePhotoIndex + 1}/{photos.length}
              </div>

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePhotoIndex((prev) => (prev + 1) % photos.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                  {item.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-bold">{item.location.address || item.location.city}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-teal-500/10 border-2 border-emerald-500/30">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 block mb-0.5">
                  කුලිය / ගාස්තුව:
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    රු. {item.price.toLocaleString()}
                  </span>
                  <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                    {item.pricePeriod === 'per_person_month'
                      ? '/ එක් අයෙකුට'
                      : item.pricePeriod === 'per_day'
                      ? '/ දිනකට'
                      : '/ මසකට'}
                  </span>
                </div>

                {item.keyMoneyOrDepositText && (
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-1">
                    🔑 {item.keyMoneyOrDepositText}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                  ඔබ සිටින ස්ථානයේ සිට ගමන් කාලය:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    {travel.walkingText}
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                      දුර: {travel.distanceText}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs font-bold text-amber-950 dark:text-amber-200">
                    {travel.tukText}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              විස්තරය (Description):
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#0a2316] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 whitespace-pre-line">
              {item.description}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              පහසුකම් (Facilities):
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {item.facilities.map((fac, idx) => (
                <div
                  key={`full_fac_${idx}`}
                  className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 dark:bg-[#0c281a] border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-950 dark:text-emerald-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{fac}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0a2316] border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                  දැන්වීම්කරු:
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {item.ownerName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
              <a
                href={`tel:${item.ownerPhone}`}
                className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <Phone className="w-4 h-4" />
                <span>Call ({item.ownerPhone})</span>
              </a>

              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>

              <a
                href={getGoogleMapsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <Navigation className="w-4 h-4" />
                <span>Navigation</span>
              </a>

              <button
                type="button"
                onClick={handleShare}
                className="py-3 px-3 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                <span>{isCopied ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
