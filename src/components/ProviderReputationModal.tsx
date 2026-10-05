import React, { useState } from 'react';
import { 
  calculateProviderReputation, 
  PROVIDER_LEVELS, 
  ProviderLevelId,
  saveServiceReviewToStorage
} from '../utils/reputationSystem';
import { User, ProfessionalService, ServiceReview, Language } from '../types';
import { 
  X, 
  Award, 
  Star, 
  Briefcase, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  CheckCircle2, 
  Lock, 
  MessageSquare, 
  Send, 
  Sparkles, 
  Coins, 
  Flame,
  ThumbsUp
} from 'lucide-react';
import { ProviderReputationCard } from './ProviderReputationCard';

interface ProviderReputationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  service?: ProfessionalService | null;
  allServices?: ProfessionalService[];
  language?: Language;
  onAddReview?: (serviceId: string, review: ServiceReview) => void;
}

export const ProviderReputationModal: React.FC<ProviderReputationModalProps> = ({
  isOpen,
  onClose,
  user,
  service,
  allServices = [],
  language = 'si',
  onAddReview,
}) => {
  const [activeTab, setActiveTab] = useState<'reputation' | 'reviews' | 'freetier'>('reputation');
  const [rating, setRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  if (!isOpen) return null;

  const reputation = calculateProviderReputation(user, service, allServices);
  const reviews = service?.reviews || [];

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim() || !service?.id) return;

    const newRev: ServiceReview = {
      id: `rev_${Date.now()}`,
      userId: user.userId || user.id || 'user',
      userName: user.name || 'පරිශීලක',
      userPhotoUrl: user.photoUrl,
      rating,
      comment: reviewComment.trim(),
      createdAt: 'දැන්',
      createdAtMs: Date.now(),
    };

    saveServiceReviewToStorage(service.id, newRev);
    if (onAddReview) {
      onAddReview(service.id, newRev);
    }

    setReviewComment('');
    setReviewSuccess(true);
    setTimeout(() => setReviewSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white dark:bg-[#09180f] border-2 border-emerald-500/50 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl transition-all relative max-h-[92vh] flex flex-col text-slate-900 dark:text-white">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-[#007a4b] to-teal-800 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-md shrink-0 text-2xl">
              {reputation.levelConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  ප්‍රසාද ලකුණු සහ ශ්‍රේණිගත කිරීම (Reputation & Leveling)
                </h2>
                <span className="bg-amber-400/20 text-amber-200 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Level {reputation.level}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                {reputation.providerName} • 5-Star Verified Professional System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-[#163a25] bg-slate-50 dark:bg-[#07150d] px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('reputation')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'reputation'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#09180f] rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>ශ්‍රේණිය සහ ප්‍රගතිය (Level)</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#09180f] rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            <Star className="w-4 h-4 text-amber-500" />
            <span>පාරිභෝගික පැසසුම් ({reputation.totalReviewsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('freetier')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'freetier'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#09180f] rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            <Coins className="w-4 h-4 text-emerald-500" />
            <span>රු. 100 නොමිලේ (Free Tier)</span>
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: REPUTATION */}
          {activeTab === 'reputation' && (
            <div className="space-y-5">
              <ProviderReputationCard 
                reputation={reputation} 
                showAllLevelsLadder={true}
              />
            </div>
          )}

          {/* TAB 2: REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              
              {/* Write a review if inspecting a service */}
              {service && (
                <form onSubmit={handleReviewSubmit} className="bg-emerald-50/70 dark:bg-[#0d2618] border border-emerald-200 dark:border-[#1d4b31] p-4 sm:p-5 rounded-2xl space-y-3">
                  <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-emerald-600" />
                    <span>සේවා සපයන්නා වෙනුවෙන් ඔබගේ පැසසුම / Review එක එක්කරන්න</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    ඔබගේ තරු ශ්‍රේණිගත කිරීම සේවා සපයන්නාගේ ශ්‍රේණිය (Reputation Level) ඉහළ නැංවීමට ඍජුවම දායක වේ.
                  </p>

                  <div className="flex items-center gap-2 py-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">තරු ප්‍රමාණය:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 hover:scale-125 transition-all cursor-pointer"
                        >
                          <Star 
                            className={`w-6 h-6 ${
                              star <= rating 
                                ? 'fill-amber-400 text-amber-400 drop-shadow-sm' 
                                : 'text-slate-300 dark:text-slate-600'
                            }`} 
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-black text-amber-500 ml-2">{rating}.0 / 5.0</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="සේවාව පිළිබඳ පැසසුම හෝ අදහස ලියන්න..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="flex-1 bg-white dark:bg-[#07130b] border border-emerald-300 dark:border-[#1b432a] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      <span>යොමු කරන්න</span>
                    </button>
                  </div>

                  {reviewSuccess && (
                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>ඔබගේ පැසසුම සාර්ථකව සටහන් විය! සේවා සපයන්නාට +20 ප්‍රසාද ලකුණු එක්විය.</span>
                    </div>
                  )}
                </form>
              )}

              {/* Reviews List */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                  ලැබී ඇති පාරිභෝගික විචාර සහ පැසසුම් ({reviews.length})
                </h4>

                {reviews.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-[#08150d] rounded-2xl border border-slate-200 dark:border-[#132a1d]">
                    <Star className="w-10 h-10 text-amber-400/50 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      තවමත් පාරිභෝගික Reviews නොමැත. පළමු සේවාව නිමකළ පසු මෙහි දිස්වේ.
                    </p>
                  </div>
                ) : (
                  reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#0d2215] border border-slate-200 dark:border-[#1a3826] shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                            {rev.userName ? rev.userName[0] : 'U'}
                          </div>
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {rev.userName}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300 dark:text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 pl-9">
                        {rev.comment}
                      </p>
                      <div className="text-[10px] text-slate-400 pl-9">
                        {rev.createdAt}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FREE TIER MODEL */}
          {activeTab === 'freetier' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 p-5 sm:p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-2xl shadow-lg">
                    🎁
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black">
                      "රුපියල් 100 නොමිලේ" (Free Tier Model)
                    </h3>
                    <p className="text-xs text-emerald-100">
                      කිසිදු මූලික වියදමකින් තොරව ඇප් එකට සම්බන්ධ වී සේවා ආරම්භ කරන්න
                    </p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm leading-relaxed border border-white/20">
                  <p>
                    <strong>1. සේවා සපයන්නෙකුට නොමිලේ ඇතුළු වීම:</strong> ඔබ සහය සේවා ජාලයට සම්බන්ධ වූ වහාම ඔබගේ ගිණුමට <strong>රු. 100 ක ආරම්භක ක්‍රෙඩිට් (Welcome Bonus)</strong> ස්වයංක්‍රීයව බැර වේ.
                  </p>
                  <p>
                    <strong>2. මූලික වියදමක් නැත:</strong> එම රු. 100 මඟින් ඔබගේ වෘත්තීය සේවය ලියාපදිංචි කිරීම හෝ පළමු දැන්වීම් 4ක් සම්පූර්ණයෙන්ම නොමිලේ පළකිරීමේ හැකියාව ලැබේ.
                  </p>
                  <p>
                    <strong>3. සේවාවේ වටිනාකම තේරුණු පසු:</strong> ඇප් එක හරහා වැඩ සහ පාරිභෝගිකයන් ලැබී ඔබේ ආදායම වැඩි වූ පසු, ඉදිරි දැන්වීම් සඳහා ඉතා කුඩා ක්ෂුද්‍ර ගාස්තුවක් (Micro-Fee) හෝ ස්වේච්ඡා දායකත්වයක් පමණක් අය කෙරේ.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0e2417] border border-slate-200 dark:border-[#173823] text-center space-y-1">
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">රු. 100</div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-200">නොමිලේ ආරම්භක ත්‍යාගය</div>
                  <div className="text-[11px] text-slate-500">ලියාපදිංචි වූ සැනින් හිමිවේ</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0e2417] border border-slate-200 dark:border-[#173823] text-center space-y-1">
                  <div className="text-2xl font-black text-amber-500">0% බරක්</div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-200">ආරම්භක පීඩනයක් නැත</div>
                  <div className="text-[11px] text-slate-500">වැඩ සාර්ථක වූ පසු පමණි</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0e2417] border border-slate-200 dark:border-[#173823] text-center space-y-1">
                  <div className="text-2xl font-black text-blue-500">5-Star</div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-200">ස්ථිර පාරිභෝගික ජාලය</div>
                  <div className="text-[11px] text-slate-500">ඉහළ ශ්‍රේණිය නිසා ස්වයංක්‍රීයව Jobs</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
