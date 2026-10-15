import React, { useState } from 'react';
import {
  AccommodationListing,
  AccommodationCategory,
} from '../types/accommodation';
import { getTravelEstimate } from '../utils/accommodationStorage';
import {
  MapPin,
  Phone,
  MessageCircle,
  Navigation,
  Share2,
  Home,
  Users,
  Hotel,
  ChevronLeft,
  ChevronRight,
  Check,
  Bed,
  Bath,
  Car,
  Sparkles,
  ShieldCheck,
  Utensils,
  Clock,
  Compass,
} from 'lucide-react';

interface AccommodationCardProps {
  item: AccommodationListing;
  onViewDetails: (item: AccommodationListing) => void;
  userLat?: number;
  userLng?: number;
}

export const AccommodationCard: React.FC<AccommodationCardProps> = ({
  item,
  onViewDetails,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  const photos = item.photos && item.photos.length > 0 ? item.photos : [
    {
      id: 'default_img',
      url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=720&h=1280&q=80',
      caption: 'නවාතැන',
      aspectRatio: '9:16' as const,
    }
  ];

  const travel = getTravelEstimate(item.distanceKm ?? 5);

  const getCategoryInfo = (cat: AccommodationCategory) => {
    switch (cat) {
      case 'house':
        return {
          label: 'කුලී නිවාස',
          icon: Home,
          color: 'bg-emerald-600 text-white',
        };
      case 'boarding':
        return {
          label: 'බෝඩින් / ඇනෙක්ස්',
          icon: Users,
          color: 'bg-blue-600 text-white',
        };
      case 'hotel':
        return {
          label: 'හෝටල් Room',
          icon: Hotel,
          color: 'bg-purple-600 text-white',
        };
    }
  };

  const catInfo = getCategoryInfo(item.category);
  const CatIcon = catInfo.icon;

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const getWhatsAppUrl = () => {
    const phone = item.ownerWhatsApp.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('0') ? `94${phone.slice(1)}` : phone;
    const msg = encodeURIComponent(
      `ආයුබෝවන්! මම 'සහය සේවා' ඇප් එක හරහා ඔබගේ "${item.title}" (#${item.id}) නවාතැන පිළිබඳ විස්තර දැනගැනීමට කැමතියි. එය තවමත් ලබාගත හැකිද?`
    );
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  const getGoogleMapsUrl = () => {
    return `https://www.google.com/maps/dir/?api=1&destination=${item.location.lat},${item.location.lng}`;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `🏡 ${item.title}\n📍 ස්ථානය: ${item.location.city} (${travel.distanceText})\n💰 මිල: රු. ${item.price.toLocaleString()} (${item.pricePeriod === 'per_person_month' ? 'එක් අයෙකුට' : item.pricePeriod === 'per_day' ? 'දිනකට' : 'මසකට'})\n📞 අමතන්න: ${item.ownerPhone}\n🧭 Map: ${getGoogleMapsUrl()}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch (err) {}
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {}
  };

  return (
    <div
      onClick={() => onViewDetails(item)}
      className="group relative bg-white dark:bg-[#071910] border-2 border-emerald-500/30 dark:border-emerald-700/50 hover:border-emerald-500 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* 9:16 Photo Carousel */}
      <div className="relative w-full aspect-[9/13] bg-slate-900 overflow-hidden">
        <img
          src={photos[activePhotoIndex].url}
          alt={photos[activePhotoIndex].caption || item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-md ${catInfo.color}`}
            >
              <CatIcon className="w-3.5 h-3.5" />
              <span>{catInfo.label}</span>
            </span>

            {item.boardingDetails?.targetAudience && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 shadow-md">
                {item.boardingDetails.targetAudience === 'boys'
                  ? '👦 පිරිමි ළමුන්'
                  : item.boardingDetails.targetAudience === 'girls'
                  ? '👧 ගැහැණු ළමුන්'
                  : item.boardingDetails.targetAudience === 'couples'
                  ? '💑 යුවළක්'
                  : '👥 ඕනෑම අයෙකුට'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {item.isVerified && (
              <span className="p-1.5 rounded-full bg-emerald-500 text-white shadow-md">
                <ShieldCheck className="w-4 h-4" />
              </span>
            )}

            <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white font-mono text-[10px] font-bold border border-white/20">
              {activePhotoIndex + 1}/{photos.length}
            </span>
          </div>
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm z-20 cursor-pointer transition-all hover:scale-110"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm z-20 cursor-pointer transition-all hover:scale-110"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
              {photos.map((_, idx) => (
                <span
                  key={`dot_${idx}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === activePhotoIndex ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute bottom-3 left-3 right-3 z-10 text-white pointer-events-none">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-amber-400 drop-shadow-md">
                රු. {item.price.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-200 ml-1">
                {item.pricePeriod === 'per_person_month'
                  ? '/ එක් අයෙකුට'
                  : item.pricePeriod === 'per_day'
                  ? '/ දිනකට'
                  : '/ මසකට'}
              </span>
            </div>

            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/90 text-white font-extrabold text-[11px] backdrop-blur-sm flex items-center gap-1 shadow-md shrink-0">
              <Compass className="w-3.5 h-3.5" />
              <span>{travel.distanceText}</span>
            </span>
          </div>

          <p className="text-sm font-bold text-white/95 line-clamp-1 mt-1">
            {item.title}
          </p>

          <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{item.location.city}</span>
            {item.location.nearestCampusOrSchool && (
              <span className="truncate text-amber-300 font-semibold">
                • {item.location.nearestCampusOrSchool}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body Content & Specs */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
            {travel.walkingText}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-bold">
            {travel.tukText}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-center">
          {item.category === 'house' && item.houseDetails && (
            <>
              <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-50 dark:bg-[#0c2518]">
                <Bed className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-0.5" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {item.houseDetails.bedrooms} කාමර
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-50 dark:bg-[#0c2518]">
                <Bath className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-0.5" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {item.houseDetails.bathrooms} බාත්රූම්
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-50 dark:bg-[#0c2518]">
                <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-0.5" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {item.houseDetails.parkingSpaces > 0 ? `${item.houseDetails.parkingSpaces} වාහන` : 'වාහන නැත'}
                </span>
              </div>
            </>
          )}

          {item.category === 'boarding' && item.boardingDetails && (
            <>
              <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-50 dark:bg-[#0c2518]">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-0.5" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate w-full">
                  {item.boardingDetails.roomSharingType === 'single_room' ? 'තනි කාමර' : 'Sharing'}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-50 dark:bg-[#0c2518]">
                <Bath className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-0.5" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {item.boardingDetails.bathroomType === 'attached' ? 'Attached' : 'Shared'}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-50 dark:bg-[#0c2518]">
                <Utensils className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-0.5" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {item.boardingDetails.cookingAllowed ? 'කෑම පිසීමට' : 'කෑම නැත'}
                </span>
              </div>
            </>
          )}

          {item.category === 'hotel' && item.hotelDetails && (
            <>
              <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-50 dark:bg-[#0c2518]">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 mb-0.5" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  {item.hotelDetails.acStatus}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-50 dark:bg-[#0c2518]">
                <Bed className="w-4 h-4 text-purple-600 dark:text-purple-400 mb-0.5" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 capitalize">
                  {item.hotelDetails.bedType}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-50 dark:bg-[#0c2518]">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 mb-0.5" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {item.hotelDetails.checkInTime} In
                </span>
              </div>
            </>
          )}
        </div>

        {item.keyMoneyOrDepositText && (
          <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-50/70 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
            🔑 {item.keyMoneyOrDepositText}
          </p>
        )}

        <div className="pt-2 grid grid-cols-4 gap-1.5 border-t border-slate-100 dark:border-slate-800/80">
          <a
            href={`tel:${item.ownerPhone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-sm"
          >
            <Phone className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] font-black">Call</span>
          </a>

          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5b] active:scale-95 text-white transition-all shadow-sm"
          >
            <MessageCircle className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] font-black">WhatsApp</span>
          </a>

          <a
            href={getGoogleMapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white transition-all shadow-sm"
          >
            <Navigation className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] font-black">Navigate</span>
          </a>

          <button
            type="button"
            onClick={handleShare}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer ${
              isCopied
                ? 'bg-amber-400 border-amber-500 text-slate-950 font-black'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {isCopied ? <Check className="w-4 h-4 mb-0.5" /> : <Share2 className="w-4 h-4 mb-0.5" />}
            <span className="text-[10px] font-black">{isCopied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
