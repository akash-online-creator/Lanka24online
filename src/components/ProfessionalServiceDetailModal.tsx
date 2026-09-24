import React, { useState } from 'react';
import { User, Language, ProfessionalService, ServiceReview } from '../types';
import { getVillageOrTownDisplay } from '../utils/geoUtils';
import { 
  X, 
  MapPin, 
  Phone, 
  Award, 
  Clock, 
  Star, 
  MessageSquare, 
  MessageCircle, 
  CheckCircle2, 
  Share2, 
  ShieldCheck, 
  Send, 
  Sparkles, 
  Check, 
  Lock 
} from 'lucide-react';
import { ProfessionalServiceChatModal } from './ProfessionalServiceChatModal';
import { calculateProviderReputation } from '../utils/reputationSystem';
import { ProviderReputationCard } from './ProviderReputationCard';

interface ProfessionalServiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ProfessionalService | null;
  currentUser: User;
  language: Language;
  onAddReview: (serviceId: string, review: ServiceReview) => void;
}

export const ProfessionalServiceDetailModal: React.FC<ProfessionalServiceDetailModalProps> = ({
  isOpen,
  onClose,
  service,
  currentUser,
  language,
  onAddReview,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [commentText, setCommentText] = useState('');
  const [commentSuccess, setCommentSuccess] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (!isOpen || !service) return null;

  const isOwner = Boolean(
    currentUser && (
      (currentUser.userId && service.userId && (currentUser.userId === service.userId || (currentUser.id && currentUser.id === service.userId))) ||
      (currentUser.id && service.userId && currentUser.id === service.userId) ||
      (currentUser.phone && service.providerPhone && currentUser.phone.replace(/\D/g, '') === service.providerPhone.replace(/\D/g, ''))
    )
  );
  const isAdmin = currentUser?.role === 'admin';
  const hasContactPermission = isOwner || isAdmin || service.revealContactConsent !== false;

  const getDeliveryMethodLabel = (method: string) => {
    switch (method) {
      case 'location':
        return 'ස්ථානය සටහන් කිරීම (Specific Area)';
      case 'anywhere':
        return 'ඕනෑම තැනකට පැමිණිය හැක (Anywhere)';
      case 'online':
        return 'Online හරහා (Remote / Online)';
      case 'customer_must_come':
        return 'ඔබ පැමිණිය යුතුයි (Client Visit)';
      case 'other':
      default:
        return 'වෙනත් (Other)';
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newReview: ServiceReview = {
      id: `rev_${Date.now()}`,
      userId: currentUser?.userId || currentUser?.id || 'guest',
      userName: currentUser?.name || 'පරිශීලක',
      userPhotoUrl: currentUser?.photoUrl || '',
      rating,
      comment: commentText.trim(),
      createdAt: 'දැන්',
      createdAtMs: Date.now(),
    };

    onAddReview(service.id, newReview);
    setCommentText('');
    setCommentSuccess(true);
    setTimeout(() => {
      setCommentSuccess(false);
    }, 2000);
  };

  const formatWhatsAppUrl = (phone: string, title: string) => {
    const cleanNumber = phone.replace(/\D/g, '').replace(/^0/, '94');
    const msg = encodeURIComponent(`ආයුබෝවන් ${service.providerName}, සහය සේවා (Sahaya Seva) හරහා ඔබගේ "${title}" සේවාව පිළිබඳව විමසීමට සම්බන්ධ වෙමි.`);
    return `https://wa.me/${cleanNumber}?text=${msg}`;
  };

  const reviewsList = service.reviews || [];
  const averageRating = reviewsList.length > 0
    ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1)
    : service.avgRating?.toFixed(1) || '5.0';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center animate-fadeIn">
      <div className="bg-white dark:bg-[#0c1a12] border border-slate-200 dark:border-[#1a3826] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#173222] flex items-center justify-between bg-slate-50/80 dark:bg-[#0f2418]/80">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span>{service.categoryIcon}</span>
            <span>{service.categoryName}</span>
            <span>•</span>
            <span>{service.subCategoryName}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#162e20] hover:bg-slate-200 dark:hover:bg-[#1f422e] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Profile Header & Rating Banner */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/30 dark:from-[#0f281b] dark:via-[#112d1e] dark:to-[#0c2216] border border-emerald-200/60 dark:border-[#1d432b]">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-md flex-shrink-0 bg-slate-100 dark:bg-slate-800">
              {service.providerPhotoUrl && service.providerPhotoUrl.trim() !== '' ? (
                <img
                  src={service.providerPhotoUrl}
                  alt={service.providerName || 'Provider'}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-3xl">
                  {(service.providerName || 'P').charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  {service.providerName}
                </h3>
                {service.isVerified && (
                  <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>සහතිකලත් වෘත්තික</span>
                  </span>
                )}
              </div>

              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                {service.subCategoryIcon} {service.subCategoryName}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600 dark:text-[#88ad97]">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{getVillageOrTownDisplay(service.locationName || 'කඩවත')}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>පළපුරුද්ද: {service.experienceDuration}</span>
                </span>
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{averageRating} ({reviewsList.length} reviews)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Direct Call, WhatsApp & In-App Chat */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. In-App Chat Button (Requirement 03) */}
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-[#00603a] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer border border-emerald-400/30"
            >
              <MessageCircle className="w-4 h-4 text-emerald-200 animate-pulse" />
              <span>ඇප් එක තුළ Chat කරන්න</span>
            </button>

            {hasContactPermission ? (
              <>
                {/* 2. WhatsApp Button */}
                {(service.providerWhatsapp || service.providerPhone) && (
                  <a
                    href={formatWhatsAppUrl(service.providerWhatsapp || service.providerPhone, service.serviceTitle)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp පණිවිඩයක්</span>
                  </a>
                )}

                {/* 3. Phone Call Button */}
                {service.providerPhone && (
                  <a
                    href={`tel:${service.providerPhone}`}
                    className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>අමතන්න ({service.providerPhone})</span>
                  </a>
                )}
              </>
            ) : (
              <div className="sm:col-span-2 py-3 px-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-extrabold text-xs flex items-center justify-center gap-2 text-center">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>🔒 දුරකථන අංකය ආරක්ෂිතයි (Chat මගින් ඉල්ලන්න)</span>
              </div>
            )}
          </div>

          {service.altPhone && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#112318] border border-slate-200 dark:border-[#1c3a27] text-xs flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                විකල්ප දුරකථන අංකය: <strong>{hasContactPermission ? service.altPhone : '🔒 ආරක්ෂිතයි'}</strong>
              </span>
            </div>
          )}

          {/* 🛡️ Trust & Insurance Platform Guarantee Card */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950 via-[#07291a] to-slate-950 border-2 border-emerald-500/50 text-white shadow-md space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-950" />
              </div>
              <div>
                <h5 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <span>🛡️ Trust & Insurance වේදිකා වගකීම් සහතිකය</span>
                </h5>
                <p className="text-[11px] text-emerald-200 leading-snug">
                  ඇප් එක හරහා සම්බන්ධ වන ගනුදෙනුවලට පමණක් පාරිභෝගික ආරක්ෂාව සහ මැදිහත්වීම හිමිවේ.
                </p>
              </div>
            </div>
            <p className="text-[10px] text-emerald-200/90 bg-black/40 p-2.5 rounded-2xl border border-emerald-500/20 leading-relaxed">
              ⚠️ <strong>අවධාරණය:</strong> ඇප් එකෙන් බාහිරව කරන සෘජු මුදල් ගනුදෙනු, වංචා හෝ සේවා බාලවීම් සඳහා වේදිකාවේ කිසිදු වගකීමක් නොමැත. දෙපාර්ශ්වයේම උපරිම ආරක්ෂාව උදෙසා ඇප් එක තුළම රැඳී ගනුදෙනු කරන්න.
            </p>
          </div>

          {/* Detailed Info Cards */}
          <div className="space-y-3.5">
            {/* 1. Service Offered */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e2116] border border-slate-200/90 dark:border-[#173222] shadow-sm space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#789d87] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>ලබාදිය හැකි සේවය</span>
              </h4>
              <p className="text-sm text-slate-800 dark:text-slate-100 font-semibold leading-relaxed">
                {service.serviceTitle}
              </p>
            </div>

            {/* 2. Delivery Method */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e2116] border border-slate-200/90 dark:border-[#173222] shadow-sm space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#789d87] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>සේවය ලබාදෙන ආකාරය</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-bold">
                {getDeliveryMethodLabel(service.deliveryMethod)}
              </p>
              {service.deliveryMethodDetails && (
                <p className="text-xs text-slate-600 dark:text-[#88ad97]">
                  {service.deliveryMethodDetails}
                </p>
              )}
            </div>

            {/* 3. Qualifications */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e2116] border border-slate-200/90 dark:border-[#173222] shadow-sm space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#789d87] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>සුදුසුකම් සහ සහතික</span>
              </h4>
              
              {service.qualificationsList && service.qualificationsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {service.qualificationsList.map((qual, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-center gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {qual}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-medium">
                  {service.qualifications}
                </p>
              )}
            </div>
          </div>

          {/* Reputation & Leveling Card */}
          <div className="my-2">
            <ProviderReputationCard
              reputation={calculateProviderReputation(service.userId, service)}
              showAllLevelsLadder={false}
            />
          </div>

          {/* 4. Comments & Reviews Section (Requirement 04) */}
          <div className="pt-4 border-t border-slate-200 dark:border-[#173222] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span>අදහස් දැක්වීම් සහ ඇගයීම් (Reviews & Comments)</span>
              </h4>
              <span className="text-xs font-bold text-slate-500 dark:text-[#789d87]">
                ({reviewsList.length})
              </span>
            </div>

            {/* Add Review Form */}
            <form onSubmit={handleReviewSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0e2116] border border-slate-200 dark:border-[#1a3826] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ඔබගේ අදහස සහ තරු ඇගයීම ලබාදෙන්න:
                </span>
                {/* Star rating selector */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="cursor-pointer transition-transform hover:scale-110 p-0.5"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-500 ml-1.5">{rating}.0</span>
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={`${service.providerName} ගේ සේවය පිළිබඳ ඔබගේ සත්‍ය අත්දැකීම සටහන් කරන්න...`}
                  className="w-full p-3 bg-white dark:bg-[#12281b] border border-slate-300 dark:border-[#1e3e2b] rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {commentSuccess && (
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ඔබගේ අදහස සාර්ථකව සටහන් විය!</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>අදහස පළ කරන්න</span>
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-2.5">
              {reviewsList.length === 0 ? (
                <p className="text-xs text-center py-4 text-slate-400 dark:text-[#678b75]">
                  මෙම සේවාව සඳහා තවම අදහස් පළ කර නොමැත. පළමු අදහස ඔබ එක් කරන්න!
                </p>
              ) : (
                reviewsList.map((rev, rIdx) => (
                  <div
                    key={`ps_rev_${rev.id || 'r'}_${rIdx}`}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#112318] border border-slate-200/80 dark:border-[#173222] shadow-sm space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                          {(rev.userName || 'U').charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {rev.userName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= rev.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">{rev.createdAt}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-[#88ad97] pl-9 leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* In-App Chat Modal for this Professional Service */}
        <ProfessionalServiceChatModal
          service={service}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentUser={currentUser}
          language={language}
        />
      </div>
    </div>
  );
};
