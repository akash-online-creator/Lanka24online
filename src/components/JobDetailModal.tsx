import React, { useState } from 'react';
import { JobListing, LOCAL_BENEFITS, OVERSEAS_BENEFITS } from '../types/job';
import { calculateDistanceKm, formatProximityDisplay } from '../utils/jobStorage';
import { 
  X, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Navigation, 
  Share2, 
  CheckCircle2, 
  Building2, 
  Plane, 
  Coins
} from 'lucide-react';

interface JobDetailModalProps {
  job: JobListing | null;
  onClose: () => void;
  userLat?: number;
  userLng?: number;
  language?: string;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  onClose,
  userLat,
  userLng,
  language = 'si',
}) => {
  const [copied, setCopied] = useState(false);

  if (!job) return null;

  const hasUserCoords = typeof userLat === 'number' && typeof userLng === 'number';
  const distanceKm = hasUserCoords && job.lat && job.lng
    ? calculateDistanceKm(userLat!, userLng!, job.lat, job.lng)
    : null;

  const proximity = distanceKm !== null ? formatProximityDisplay(distanceKm) : null;

  // Direct Phone Call
  const handleCall = () => {
    if (!job.phone) return;
    window.location.href = `tel:${job.phone.replace(/[^0-9+]/g, '')}`;
  };

  // Direct WhatsApp with Sinhala Pre-filled Text
  const handleWhatsApp = () => {
    const phoneNum = job.whatsapp || job.phone;
    if (!phoneNum) return;
    const cleanNumber = phoneNum.replace(/[^0-9]/g, '');
    const fullNumber = cleanNumber.startsWith('94') ? cleanNumber : `94${cleanNumber.replace(/^0/, '')}`;
    
    const textMsg = encodeURIComponent(
      `ආයුබෝවන්, මම සහය සේවා (Sahaya Sewa) ඇප් එකේ පළ කර ඇති ඔබගේ "${job.title}" (${job.companyName}) රැකියා දැන්වීම දුටුවෙමි. මේ සඳහා ඉල්ලුම් කිරීමට වැඩිදුර විස්තර ලබාගත හැකිද? ස්තූතියි.`
    );
    window.open(`https://wa.me/${fullNumber}?text=${textMsg}`, '_blank');
  };

  // Google Maps Navigation
  const handleNavigation = () => {
    if (!job.lat || !job.lng) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`, '_blank');
  };

  // Share Listing
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `💼 රැකියා අවස්ථාව: ${job.title}\n🏢 ආයතනය: ${job.companyName}\n📍 ස්ථානය: ${job.scope === 'overseas' ? job.country : (job.city || 'ශ්‍රී ලංකාව')}\n📞 අමතන්න: ${job.phone}\n\nසහය සේවා ඇප් එක හරහා සම්පූර්ණ විස්තර බලන්න: ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, text: shareText, url: shareUrl });
        return;
      } catch {}
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const benefitDefs = job.scope === 'overseas' ? OVERSEAS_BENEFITS : LOCAL_BENEFITS;
  const activeBenefits = benefitDefs.filter((b) => job.benefits.includes(b.key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white dark:bg-[#07190f] border-2 border-emerald-500 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-t-3xl flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2">
            {job.scope === 'overseas' ? (
              <span className="px-3 py-1 bg-sky-500/30 border border-sky-300 text-sky-100 rounded-full font-black text-xs flex items-center gap-1">
                <Plane className="w-3.5 h-3.5" /> විදේශීය රැකියා ({job.country})
              </span>
            ) : (
              <span className="px-3 py-1 bg-white/20 border border-white/30 text-white rounded-full font-black text-xs flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> ලංකාව තුළ රැකියා ({job.city || job.district})
              </span>
            )}

            {job.isFreeVisa && (
              <span className="px-2.5 py-0.5 bg-emerald-400 text-slate-950 font-black text-[10px] rounded-full">
                නොමිලේ වීසා
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
              title="දැන්වීම බෙදාගන්න"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 text-slate-800 dark:text-slate-200">
          {/* Title & Employer */}
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {job.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap text-sm font-bold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>{job.companyName}</span>
              </span>
              {job.slbfeRegNo && (
                <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-mono font-bold">
                  {job.slbfeRegNo}
                </span>
              )}
            </div>
          </div>

          {/* Flyer Gallery (if available) */}
          {job.images && job.images.length > 0 && (
            <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-72 flex items-center justify-center">
              <img 
                src={job.images[0]} 
                alt={job.title}
                className="w-full h-full object-cover max-h-72" 
              />
            </div>
          )}

          {/* Salary & Proximity Spotlight Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-[#0a2416] border-2 border-emerald-400/80 dark:border-emerald-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-300 block">
                {job.scope === 'overseas' ? 'විදේශීය වැටුප් පරිමාණය' : 'වැටුප් සහ දීමනා'}
              </span>
              <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-amber-500" />
                {job.scope === 'overseas' ? (
                  <span>{job.currency} {job.salaryForeign?.toLocaleString()} <span className="text-xs font-bold text-slate-500">(දළ වශයෙන් රු. {job.salaryLkrApprox?.toLocaleString()})</span></span>
                ) : (
                  <span>රු. {job.salaryMin?.toLocaleString()} {job.salaryMax ? `- ${job.salaryMax.toLocaleString()}` : ''} <span className="text-xs font-bold text-slate-500">/ {job.salaryPeriod === 'daily' ? 'දිනකට' : 'මසකට'}</span></span>
                )}
              </div>
            </div>

            {proximity && job.scope === 'local' && (
              <div className="px-3 py-1.5 bg-white dark:bg-[#07190f] rounded-xl border border-emerald-300 dark:border-emerald-700 text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ඔබගේ සිට {proximity.distanceStr}</span>
                {proximity.isWalkable ? (
                  <span className="text-emerald-600 font-black">(මිනිත්තු {proximity.walkMinutes} ඇවිදින දුරින්)</span>
                ) : proximity.isTuktukClose ? (
                  <span className="text-amber-600 font-black">(මිනිත්තු {proximity.tuktukMinutes} ත්‍රීවීල් දුරින්)</span>
                ) : null}
              </div>
            )}
          </div>

          {/* Description */}
          {job.description && (
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                රැකියා විස්තරය සහ රාජකාරි
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-[#0a2014] p-3.5 rounded-2xl border border-slate-200 dark:border-[#132d20]">
                {job.description}
              </p>
            </div>
          )}

          {/* Key Requirements & Qualifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {job.qualifications && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c2417] border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block mb-0.5">අධ්‍යාපනික සුදුසුකම්:</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{job.qualifications}</span>
              </div>
            )}
            {job.experience && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c2417] border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block mb-0.5">අවශ්‍ය පළපුරුද්ද:</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{job.experience}</span>
              </div>
            )}
            {job.contractPeriod && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c2417] border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block mb-0.5">ගිවිසුම් කාලය:</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{job.contractPeriod}</span>
              </div>
            )}
            {job.languageRequired && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c2417] border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block mb-0.5">භාෂා දැනුම:</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{job.languageRequired}</span>
              </div>
            )}
          </div>

          {/* Benefits Checklist */}
          {activeBenefits.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-emerald-800 dark:text-emerald-300">
                නොමිලේ හිමිවන පහසුකම් සහ වරප්‍රසාද
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeBenefits.map((b) => (
                  <div 
                    key={b.key}
                    className="p-2.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-bold text-xs flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{b.labelSi}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location & Navigation */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0a2014] border border-slate-200 dark:border-[#132d20] space-y-2">
            <span className="font-bold text-slate-500 text-xs block">රැකියා ස්ථානය / ඒජන්සි කාර්යාලය:</span>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{job.address || `${job.city || ''}, ${job.district || ''}`}</span>
              </span>

              {job.lat && job.lng && (
                <button
                  type="button"
                  onClick={handleNavigation}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Google Map Navigation</span>
                </button>
              )}
            </div>
          </div>

          {/* How to Apply */}
          {job.howToApply && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              <span className="font-black block mb-0.5">ඉල්ලුම් කරන ආකාරය:</span>
              <span>{job.howToApply}</span>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 bg-slate-100 dark:bg-[#0a2014] border-t border-slate-200 dark:border-[#132d20] rounded-b-3xl sticky bottom-0 z-20 flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleCall}
            className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            <span>සෘජුවම අමතන්න ({job.phone})</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp පණිවිඩයක් යවන්න</span>
          </button>
        </div>
      </div>
    </div>
  );
};
