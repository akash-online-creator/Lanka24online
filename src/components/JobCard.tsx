import React, { useState } from 'react';
import { JobListing, LOCAL_BENEFITS, OVERSEAS_BENEFITS } from '../types/job';
import { calculateDistanceKm, formatProximityDisplay } from '../utils/jobStorage';
import { 
  MapPin, 
  Phone, 
  MessageCircle, 
  Navigation, 
  Share2, 
  CheckCircle2, 
  Building2, 
  Plane, 
  Coins, 
  Check,
  ChevronRight
} from 'lucide-react';

interface JobCardProps {
  job: JobListing;
  userLat?: number;
  userLng?: number;
  onViewDetails: (job: JobListing) => void;
  language?: string;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  userLat,
  userLng,
  onViewDetails,
  language = 'si',
}) => {
  const [copiedShare, setCopiedShare] = useState(false);

  const hasUserCoords = typeof userLat === 'number' && typeof userLng === 'number';
  const distanceKm = hasUserCoords && job.lat && job.lng
    ? calculateDistanceKm(userLat!, userLng!, job.lat, job.lng)
    : null;

  const proximity = distanceKm !== null ? formatProximityDisplay(distanceKm) : null;

  const renderSalary = () => {
    if (job.scope === 'overseas') {
      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
            <Coins className="w-4 h-4 shrink-0" />
            <span>{job.currency || 'USD'} {job.salaryForeign?.toLocaleString()}</span>
          </div>
          {job.salaryLkrApprox && (
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              (දළ වශයෙන් රු. {job.salaryLkrApprox.toLocaleString()})
            </span>
          )}
        </div>
      );
    }

    if (job.salaryMin || job.salaryMax) {
      const minStr = job.salaryMin ? `රු. ${job.salaryMin.toLocaleString()}` : '';
      const maxStr = job.salaryMax ? `රු. ${job.salaryMax.toLocaleString()}` : '';
      const salaryText = minStr && maxStr ? `${minStr} - ${maxStr}` : (minStr || maxStr);
      const periodMap: Record<string, string> = {
        monthly: 'මසකට',
        daily: 'දිනකට',
        weekly: 'සතියකට',
        hourly: 'පැයකට'
      };
      const periodStr = periodMap[job.salaryPeriod || 'monthly'] || 'මසකට';

      return (
        <div className="flex items-center gap-1.5 font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
          <Coins className="w-4 h-4 shrink-0 text-amber-500" />
          <span>{salaryText} <span className="text-xs font-bold text-slate-500">/ {periodStr}</span></span>
        </div>
      );
    }

    return (
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
        වැටුප සාකච්ඡා කළ හැක
      </span>
    );
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!job.phone) return;
    window.location.href = `tel:${job.phone.replace(/[^0-9+]/g, '')}`;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phoneNum = job.whatsapp || job.phone;
    if (!phoneNum) return;
    const cleanNumber = phoneNum.replace(/[^0-9]/g, '');
    const fullNumber = cleanNumber.startsWith('94') ? cleanNumber : `94${cleanNumber.replace(/^0/, '')}`;
    
    const textMsg = encodeURIComponent(
      `ආයුබෝවන්, මම සහය සේවා (Sahaya Sewa) ඇප් එකේ පළ කර ඇති ඔබගේ "${job.title}" දැන්වීම දුටුවෙමි. ඒ පිළිබඳ වැඩිදුර විස්තර ලබාගත හැකිද?`
    );
    window.open(`https://wa.me/${fullNumber}?text=${textMsg}`, '_blank');
  };

  const handleNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!job.lat || !job.lng) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`, '_blank');
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = window.location.href;
    const shareText = `💼 රැකියා අවස්ථාව: ${job.title}\n🏢 ආයතනය: ${job.companyName}\n📍 ස්ථානය: ${job.scope === 'overseas' ? job.country : (job.city || 'ශ්‍රී ලංකාව')}\n📞 අමතන්න: ${job.phone}\n\nසහය සේවා (Sahaya Sewa) ඇප් එක හරහා වැඩිදුර විස්තර බලන්න: ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, text: shareText, url: shareUrl });
        return;
      } catch (err) {}
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    }
  };

  const benefitDefs = job.scope === 'overseas' ? OVERSEAS_BENEFITS : LOCAL_BENEFITS;
  const activeBenefits = benefitDefs.filter((b) => job.benefits.includes(b.key));

  return (
    <div 
      onClick={() => onViewDetails(job)}
      className="bg-white dark:bg-[#07190f] border-2 border-slate-200 dark:border-[#132d20] hover:border-emerald-500 rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer space-y-3 relative overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {job.scope === 'overseas' ? (
            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 flex items-center gap-1 shadow-xs">
              <Plane className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>විදේශීය රැකියා ({job.country || 'Overseas'})</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>ලංකාව තුළ ({job.city || job.district || 'දේශීය'})</span>
            </span>
          )}

          {job.isFreeVisa && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white flex items-center gap-1 shadow-xs">
              <CheckCircle2 className="w-3 h-3" />
              <span>නොමිලේ වීසා (Zero Cost)</span>
            </span>
          )}

          {job.isUrgentHiring && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
              🔥 කඩිනම් බඳවා ගැනීම
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0c2417] dark:hover:bg-[#123623] text-slate-600 dark:text-slate-300 transition-colors"
          title="දැන්වීම බෙදාගන්න"
        >
          {copiedShare ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
              <Check className="w-3.5 h-3.5" /> පිටපත් විය!
            </span>
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3.5 items-start">
        {job.images && job.images.length > 0 && (
          <div className="w-full sm:w-28 h-32 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-800 relative">
            <img src={job.images[0]} alt={job.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1.5">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 transition-colors">
            {job.title}
          </h2>

          <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{job.companyName}</span>
            </span>
            {job.slbfeRegNo && (
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-md font-mono text-[10px]">
                {job.slbfeRegNo}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{job.scope === 'overseas' ? job.country : (job.city ? `${job.city}, ${job.district || ''}` : job.address)}</span>
            </span>

            {proximity && job.scope === 'local' && (
              <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold text-[11px] border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <Navigation className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>ඔබගේ සිට {proximity.distanceStr}</span>
                {proximity.isWalkable ? (
                  <span className="text-emerald-600 font-extrabold">(මිනිත්තු {proximity.walkMinutes} ඇවිදින දුරින්)</span>
                ) : proximity.isTuktukClose ? (
                  <span className="text-amber-600 font-extrabold">(මිනිත්තු {proximity.tuktukMinutes} ත්‍රීවීල් දුරින්)</span>
                ) : null}
              </span>
            )}
          </div>

          <div className="pt-1">{renderSalary()}</div>
        </div>
      </div>

      {activeBenefits.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {activeBenefits.slice(0, 4).map((b) => (
            <span key={b.key} className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-[#0e2c1c] text-slate-700 dark:text-emerald-300 border border-slate-200 dark:border-emerald-900/60 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-500" />
              <span>{b.labelSi}</span>
            </span>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 dark:border-[#132d20] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          <button type="button" onClick={handleCall} className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20">
            <Phone className="w-3.5 h-3.5" />
            <span>අමතන්න</span>
          </button>

          <button type="button" onClick={handleWhatsApp} className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          {job.lat && job.lng && (
            <button type="button" onClick={handleNavigation} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0c2417] text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-all flex items-center gap-1 border border-slate-200 dark:border-slate-700">
              <Navigation className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">ස්ථානයට යන්න</span>
            </button>
          )}
        </div>

        <button type="button" onClick={() => onViewDetails(job)} className="px-3 py-2 rounded-xl text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center gap-1 transition-colors">
          <span>විස්තර</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
