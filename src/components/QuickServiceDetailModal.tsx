import React from 'react';
import { 
  MessageCircle, 
  CheckCircle, 
  MapPin, 
  Users, 
  Car, 
  Banknote, 
  HelpCircle,
  Compass,
  Clock,
  Calendar,
  Sparkles,
  ExternalLink,
  User,
  Wrench,
  AlertCircle,
  Trash2,
  X,
  Search,
  Gift,
  Truck,
  Phone,
  MessageSquare,
  ShieldCheck,
  Pencil,
  Lock,
  Languages,
  Loader2,
  Check,
  Trophy,
  RotateCcw,
  Star,
  UserPlus
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User as UserType, HelperApplicant } from '../types';
import { applyToHelpPost, selectHelperApplicant, cancelAndReopenPost, calculateTravelFee, maskNicNumber } from '../utils/serviceWorkflowManager';
import { calculateMotorcycleRoadDistance, getVillageOrTownDisplay } from '../utils/geoUtils';
import { inspectAndSanitizeMessage } from '../utils/policyGuard';
import { maskName, maskPhone, maskAddress } from '../utils/demoDataMasker';
import { getLocalizedPost, getCardLabels, translateText, translateName } from '../utils/postTranslator';
import { translatePostWithGoogle } from '../utils/googleTranslator';
import { renderTextWithLinks } from '../utils/textUtils';
import { checkIsPostOwner } from '../utils/postOwnerHelper';
import { EmbeddedMediaViewer } from './EmbeddedMediaViewer';
import { AudioVoicePlayer } from './AudioVoiceNote';

interface QuickServiceDetailModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (post: HelpPost) => void;
  onOpenConfirm: (post: HelpPost) => void;
  onDeletePost?: (post: HelpPost) => void;
  onEditPost?: (post: HelpPost) => void;
  onRequireRegistration?: () => void;
  lang: Language;
  currentLocation?: LocationOption;
  currentUser?: UserType;
  onOpenLeaderboard?: () => void;
  onPostUpdated?: (updated: HelpPost) => void;
}

export const QuickServiceDetailModal: React.FC<QuickServiceDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  onOpenChat,
  onOpenConfirm,
  onDeletePost,
  onEditPost,
  onRequireRegistration,
  lang = 'si',
  currentLocation,
  currentUser,
  onOpenLeaderboard,
  onPostUpdated,
}) => {
  const isDemo = Boolean(currentUser?.isDemo);
  const [activePost, setActivePost] = React.useState<HelpPost | null>(post);
  const [isApplying, setIsApplying] = React.useState(false);
  const [applySuccessMsg, setApplySuccessMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    setActivePost(post);
  }, [post]);

  const currentPost = activePost || post;
  const isPostOwner = Boolean(checkIsPostOwner(currentUser, currentPost));
  const applicants = currentPost?.applicants || [];
  const selectedHelpers = currentPost?.selectedHelpers || [];
  const helpersNeeded = currentPost?.helpersNeeded || 1;
  const isHelperApplied = Boolean(currentUser && applicants.some(a => a.helperId === currentUser.userId || a.helperId === currentUser.id));
  const isHelperAccepted = Boolean(currentUser && selectedHelpers.some(h => h.helperId === currentUser.userId || h.helperId === currentUser.id));
  const startPin = currentPost?.startPin || currentPost?.completionPin || '4829';

  const displayPost = React.useMemo(() => (currentPost ? getLocalizedPost(currentPost, lang) : null), [currentPost, lang]);
  const cardLabels = React.useMemo(() => getCardLabels(lang), [lang]);

  const getLangText = (si: string, en: string, ta: string) => {
    if (lang === 'en') return en;
    if (lang === 'ta') return ta;
    return si;
  };

  // Google Translate Dynamic Integration
  const [googlePost, setGooglePost] = React.useState<HelpPost | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [translationMode, setTranslationMode] = React.useState<'auto' | 'google' | 'original'>('auto');
  const [targetGoogleLang, setTargetGoogleLang] = React.useState<Language>(lang);

  React.useEffect(() => {
    setTargetGoogleLang(lang);
  }, [lang]);

  React.useEffect(() => {
    let isMounted = true;
    if (!currentPost || translationMode === 'original') {
      setGooglePost(null);
      setIsTranslating(false);
      return;
    }

    if (targetGoogleLang === 'en' || targetGoogleLang === 'ta' || translationMode === 'google') {
      setIsTranslating(true);
      translatePostWithGoogle(currentPost, targetGoogleLang)
        .then((res) => {
          if (isMounted) {
            setGooglePost(res);
            setIsTranslating(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setIsTranslating(false);
          }
        });
    } else {
      setGooglePost(null);
      setIsTranslating(false);
    }

    return () => {
      isMounted = false;
    };
  }, [currentPost, targetGoogleLang, translationMode]);

  // Determine active display source
  const effectivePost = (translationMode !== 'original' && googlePost) ? googlePost : (displayPost || currentPost);

  // Helper Actions
  const handleApply = async () => {
    if (!currentPost || !currentUser) return;
    if (isDemo) {
      if (onRequireRegistration) onRequireRegistration();
      return;
    }
    setIsApplying(true);
    try {
      const updated = await applyToHelpPost({
        post: currentPost,
        helperUser: currentUser,
        distanceKm: motorcycleRoute.distanceKm,
      });
      setActivePost(updated);
      if (onPostUpdated) onPostUpdated(updated);
      setApplySuccessMsg('ඔබගේ සහයෝගීතා අයදුම්පත සාර්ථකව යවන ලදී!');
      setTimeout(() => setApplySuccessMsg(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplying(false);
    }
  };

  const handleAcceptApplicant = async (app: HelperApplicant) => {
    if (!currentPost) return;
    const updated = await selectHelperApplicant({
      post: currentPost,
      applicant: app,
    });
    setActivePost(updated);
    if (onPostUpdated) onPostUpdated(updated);
  };

  const handleCancelReopen = async () => {
    if (!currentPost) return;
    const updated = await cancelAndReopenPost({
      post: currentPost,
      reason: 'සහායකයා නොපැමිණීම හේතුවෙන් අවලංගු කරන ලදී.',
    });
    setActivePost(updated);
    if (onPostUpdated) onPostUpdated(updated);
  };

  if (!isOpen || !currentPost) return null;

  const isConfirmed = Boolean(currentPost.isConfirmed);

  // Extract and sanitize conditions & special notice
  const safeConditions = inspectAndSanitizeMessage(currentPost.conditions || '', isConfirmed).sanitizedText;
  const safeSpecialNotice = inspectAndSanitizeMessage(currentPost.specialNotice || '', isConfirmed).sanitizedText;

  // Real Motorcycle Road Distance Calculation
  const viewerLat = currentLocation?.lat || 7.1712;
  const viewerLng = currentLocation?.lng || 79.8978;
  const postLat = currentPost.lat || 6.9271;
  const postLng = currentPost.lng || 79.8612;

  const motorcycleRoute = calculateMotorcycleRoadDistance(viewerLat, viewerLng, postLat, postLng);
  const travelFee = calculateTravelFee(motorcycleRoute.distanceKm, currentPost.transport);

  // Formatted location display
  const rawLoc = currentPost.locationName || '';
  const safeLocationDisplay = getVillageOrTownDisplay(rawLoc);

  const viewerLocName = currentLocation?.nameSi 
    ? `${currentLocation.nameSi} (${currentLocation.nameEn || ''})` 
    : 'ඔබගේ ස්ථානය';

  const helpersCount = currentPost.helpersNeeded || currentPost.helpersCount || 1;

  // Format creation time
  let formattedCreatedTime = currentPost.createdAt || '';
  if (currentPost.createdAtMs) {
    try {
      const d = new Date(currentPost.createdAtMs);
      formattedCreatedTime = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/70 backdrop-blur-md animate-fadeIn">
      {/* Green and White Mixed Modal Container */}
      <div className="w-full max-w-xl bg-gradient-to-b from-white via-emerald-50/30 to-white dark:from-[#06180f] dark:via-[#04120a] dark:to-[#06180f] border-2 border-emerald-500/50 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,122,75,0.25)] overflow-hidden relative p-5 sm:p-7 max-h-[92vh] flex flex-col">
        
        {/* Header Bar with Emerald accents */}
        <div className="flex items-center justify-between pb-3.5 border-b border-emerald-200/80 dark:border-emerald-900/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700/60 shadow-sm">
              {currentPost.postCode}
            </span>
            <span className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-extrabold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{effectivePost?.title || effectivePost?.whatHappened?.slice(0, 30) || 'ඉක්මන් සේවාව'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 flex items-center gap-1 cursor-pointer"
                title="Leaderboard බලන්න"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Leaderboard</span>
              </button>
            )}

            {isPostOwner && onDeletePost && (
              <button
                onClick={() => onDeletePost(currentPost)}
                className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                title="දැන්වීම මකන්න"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-emerald-100/80 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 flex items-center justify-center font-bold transition-all cursor-pointer shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="overflow-y-auto space-y-3.5 py-4 text-left flex-1 pr-1">
          
          {/* Hi Greeting & User info */}
          <div className="p-3 bg-white/95 dark:bg-[#071a12] rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-sm flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>{translateName(currentPost.userName, lang)}</span>
                  {currentPost.isMedicalVerified && (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    <span>{formattedCreatedTime}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">සේවා කාණ්ඩය</span>
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300/60">
                {currentPost.category === 'quick_services' ? 'ඉක්මන් සේවා' : 'සාමාන්‍ය සේවා'}
              </span>
            </div>
          </div>

          {/* Google Translate Interactive Bar */}
          <div className="flex items-center justify-between gap-2 p-2 bg-slate-50/90 dark:bg-[#082216] rounded-2xl border border-slate-200/90 dark:border-emerald-800/70 flex-wrap shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                <Languages className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1 truncate">
                <span>Google Translate:</span>
                {isTranslating ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold animate-pulse text-[10px]">
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    <span>{getLangText('පරිවර්තනය වෙමින්...', 'Translating...', 'மொழிபெயர்க்கிறது...')}</span>
                  </span>
                ) : googlePost && translationMode !== 'original' ? (
                  <span className="text-emerald-700 dark:text-emerald-300 font-black text-[10px] bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-700 flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" />
                    <span>{getLangText('පරිවර්තනය විය', 'Translated', 'மொழிபெயர்க்கப்பட்டது')}</span>
                  </span>
                ) : null}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setTranslationMode('original')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  translationMode === 'original'
                    ? 'bg-emerald-700 text-white shadow-2xs ring-1 ring-emerald-500'
                    : 'bg-white dark:bg-[#07180f] text-slate-600 dark:text-slate-300 hover:text-emerald-600 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {getLangText('මුල් පිටපත', 'Original', 'அசல்')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTranslationMode('google');
                  setTargetGoogleLang('en');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  translationMode !== 'original' && targetGoogleLang === 'en'
                    ? 'bg-sky-600 text-white shadow-2xs ring-1 ring-sky-400'
                    : 'bg-white dark:bg-[#07180f] text-slate-600 dark:text-slate-300 hover:text-sky-600 border border-slate-200 dark:border-slate-800'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => {
                  setTranslationMode('google');
                  setTargetGoogleLang('ta');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  translationMode !== 'original' && targetGoogleLang === 'ta'
                    ? 'bg-amber-600 text-white shadow-2xs ring-1 ring-amber-400'
                    : 'bg-white dark:bg-[#07180f] text-slate-600 dark:text-slate-300 hover:text-amber-600 border border-slate-200 dark:border-slate-800'
                }`}
              >
                தமிழ்
              </button>
            </div>
          </div>

          {/* Voice Player Header Card */}
          {(currentPost.isVoicePost || currentPost.audioUrl) && (
            <div className="p-3 bg-emerald-50/70 dark:bg-[#081e14] rounded-2xl border border-emerald-300/80 dark:border-emerald-800/60 space-y-2 shadow-xs">
              <AudioVoicePlayer
                audioUrl={currentPost.audioUrl || ''}
                durationSec={currentPost.audioDurationSec}
                title="හඬ පණිවිඩය (Voice Request)"
              />
              {currentPost.voiceTranscript && (
                <div className="p-2 bg-white/90 dark:bg-[#071710] rounded-xl border border-emerald-200 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block text-[10px] uppercase">හඬ පිටපත:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{currentPost.voiceTranscript}</p>
                </div>
              )}
            </div>
          )}

          {/* 1. සිදුවී ඇති දේ (What Happened) */}
          <div className="p-3 bg-white/95 dark:bg-[#071a12] rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 text-xs space-y-1 shadow-sm">
            <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {getLangText('සිදුවී ඇති දේ:', 'What Happened:', 'நடந்தது என்ன:')}
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {renderTextWithLinks(effectivePost?.whatHappened || currentPost.whatHappened)}
            </p>
          </div>

          {/* 2. වියයුතු දේ (What is Needed) */}
          <div className="p-3 bg-white/95 dark:bg-[#071a12] rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 text-xs space-y-1 shadow-sm">
            <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {getLangText('වියයුතු දේ:', 'What is Needed:', 'தேவைப்படுவது என்ன:')}
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {renderTextWithLinks(effectivePost?.whatIsNeeded || currentPost.whatIsNeeded)}
            </p>
          </div>

          {/* Two Locations & Distance Comparison */}
          <div className="p-3 bg-emerald-100/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-300/70 dark:border-emerald-800/60 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white dark:bg-[#071a12] rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-2.5 shadow-sm">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] text-rose-600 dark:text-rose-400 font-extrabold block">{getLangText('දැන්වීම පළකළ ස්ථානය:', 'Posted Location:', 'விளம்பரம் இடப்பட்ட இடம்:')}</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold truncate block">{safeLocationDisplay}</span>
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-[#071a12] rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-2.5 shadow-sm">
                <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-extrabold block">{getLangText('ඔබ සිටින ස්ථානය (නරඹන්නා):', 'Your Location (Viewer):', 'உங்கள் இடம் (பார்வையாளர்):')}</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold truncate block">{viewerLocName}</span>
                </div>
              </div>
            </div>

            {/* Distance & Travel Time readout */}
            <div className="p-2.5 bg-white/95 dark:bg-[#081e14] rounded-xl border border-emerald-300 dark:border-emerald-800/70 flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300">
                  {motorcycleRoute.formattedRoadDistance}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">{getLangText('(මෝටර් සයිකල් මාර්ගය)', '(Motorcycle Route)', '(மோட்டார் சைக்கிள் பாதை)')}</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 text-[11px] font-bold">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{getLangText('ගමන් කාලය:', 'Travel Time:', 'பயண நேரம்:')} <strong className="text-emerald-700 dark:text-emerald-300 font-black">~{motorcycleRoute.formattedTime}</strong></span>
              </div>
            </div>

            {/* Travel Allowance Fee Readout (Rs. 100/km) */}
            {currentPost.transport && (currentPost.transport.includes('ඔබ පැමිණිය') || currentPost.transport.toLowerCase().includes('arrive')) && (
              <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/60 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs shadow-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ප්‍රවාහන දීමනාව:</span>
                </span>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                  + රු. {travelFee.toLocaleString()}.00 (කි.මී. 1 ට රු. 100)
                </span>
              </div>
            )}

            {/* Direct Google Maps Directions link / Privacy Lock */}
            {currentPost.isConfirmed || currentPost.category === 'find_for_me' ? (
              <a
                href={motorcycleRoute.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>{getLangText('🏍️ Google Maps මෝටර් සයිකල් මාර්ගය (Directions) විවෘත කරන්න', '🏍️ Open Motorcycle Route in Google Maps', '🏍️ Google Maps இல் மோட்டார் சைக்கிள் பாதையை திறக்கவும்')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <div className="w-full py-2 px-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-2 shadow-xs">
                <span>{getLangText('🔒 සහය CONFIRM කළ පසු Google Maps මාර්ගය හා නිශ්චිත ලිපිනය විවෘත වේ', '🔒 Full address and Google Maps route unlocked after support confirmation', '🔒 உதவி உறுதிப்படுத்திய பின் வரைபடம் மற்றும் முகவரி திறக்கப்படும்')}</span>
              </div>
            )}
          </div>

          {/* 3. කොන්දේසි (Conditions) */}
          <div className="p-2.5 bg-emerald-50/50 dark:bg-[#071a12] rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 text-xs space-y-0.5">
            <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {getLangText('කොන්දේසි:', 'Conditions:', 'நிபந்தனைகள்:')}
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
              {translateText(safeConditions, lang)}
            </p>
          </div>

          {/* 4. විශේෂ දැනුවත් කිරීම (Special Notice) */}
          <div className="p-2.5 bg-emerald-50/50 dark:bg-[#071a12] rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 text-xs space-y-0.5">
            <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {getLangText('විශේෂ දැනුවත් කිරීම:', 'Special Notice:', 'விசேட அறிவிப்பு:')}
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
              {translateText(safeSpecialNotice, lang)}
            </p>
          </div>

          {/* 5. අවශ්‍ය සහායකයින් ගණන */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 pt-0.5">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{getLangText('අවශ්‍ය සහායකයින් ගණන: ', 'Helpers needed: ', 'தேவையான உதவியாளர்கள்: ')}</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-black text-sm sm:text-base">
              {helpersCount}
            </span>
            <span>{getLangText(' කි.', ' person(s)', ' நபர்(கள்)')}</span>
          </div>

          {/* 6. ගමනාගමනය (Transport) */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
            <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{getLangText('ගමනාගමනය: ', 'Transport: ', 'போக்குவரத்து: ')}<span className="font-extrabold text-slate-900 dark:text-slate-100">{translateText(currentPost.transport || 'ඔබ පැමිණිය යුතුයි', lang)}</span></span>
          </div>

          {/* 7. ගෙවීම් (Payment) */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-300/80 dark:border-emerald-700/60 shadow-sm">
            <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{getLangText('ගෙවීම් : ', 'Payment / Fee: ', 'கட்டணம்: ')}<span className="font-black text-slate-900 dark:text-white">{translateText(currentPost.payment || 'කතා කරගත් ගාස්තුව', lang)}</span></span>
          </div>

          {/* Embedded Media / Video Link Player */}
          {(currentPost.externalLink || currentPost.videoUrl) && (
            <div className="pt-2">
              <EmbeddedMediaViewer
                url={currentPost.externalLink || currentPost.videoUrl}
                compact={false}
              />
            </div>
          )}

          {/* Seeker / Post Owner: Applicants Pool & Start PIN Management */}
          {isPostOwner && (
            <div className="p-4 bg-emerald-50/70 dark:bg-[#071911] border-2 border-emerald-400/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>සහායකයින් තෝරාගැනීම (අවශ්‍ය: {helpersNeeded} | තෝරාගත්: {selectedHelpers.length}/{helpersNeeded})</span>
                </h4>
                {onOpenLeaderboard && (
                  <button
                    type="button"
                    onClick={onOpenLeaderboard}
                    className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trophy className="w-3 h-3" />
                    <span>Leaderboard</span>
                  </button>
                )}
              </div>

              {/* Start PIN Display for Seeker */}
              {selectedHelpers.length > 0 && (
                <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-400 rounded-xl text-center space-y-1">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
                    රහස් Start PIN අංකය (සහායකයා පැමිණි පසු වැඩේ ආරම්භ කිරීමට ඔහුට දෙන්න):
                  </span>
                  <span className="text-2xl font-black font-mono tracking-widest text-emerald-700 dark:text-emerald-300 block">
                    {startPin}
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelReopen}
                    className="mt-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 rounded-lg text-[10px] font-bold hover:bg-rose-100 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>සහායකයා නොපැමිණියේ නම් අවලංගු කර නැවත විවෘත කරන්න</span>
                  </button>
                </div>
              )}

              {/* Applicants List */}
              {applicants.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center py-2">
                  තවමත් සහායකයින් ඉදිරිපත් වී නොමැත. සහායකයෙකු ඉදිරිපත් වූ සැනින් ඔබට Notification එකක් ලැබේ.
                </p>
              ) : (
                <div className="space-y-2">
                  {applicants.map((app) => {
                    const isSelected = selectedHelpers.some(h => h.helperId === app.helperId);
                    return (
                      <div
                        key={app.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          isSelected
                            ? 'bg-emerald-100/90 dark:bg-emerald-950 border-emerald-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">{app.helperName}</span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                              {app.helperNicMasked}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 pt-0.5">
                            <span className="text-amber-600 font-bold flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400" /> {app.helperRating?.toFixed(2) || '1.10'}
                            </span>
                            <span>•</span>
                            <span>දුර: ~{app.distanceKm ? app.distanceKm.toFixed(1) : '1.5'} km</span>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200/80 px-2 py-1 rounded-lg">
                            ✓ තෝරාගන්නා ලදී
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAcceptApplicant(app)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                          >
                            තෝරාගන්න
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Toast on apply success */}
          {applySuccessMsg && (
            <div className="p-3 bg-emerald-100 text-emerald-900 text-xs rounded-xl font-bold text-center animate-bounce">
              {applySuccessMsg}
            </div>
          )}

        </div>

        {/* Bottom Action Buttons: CHAT and CONFIRM / APPLY */}
        <div className="grid grid-cols-2 gap-3 pt-4 shrink-0">
          <button
            onClick={() => {
              if (isDemo) {
                if (onRequireRegistration) onRequireRegistration();
                return;
              }
              onOpenChat(currentPost || post);
            }}
            className="py-3 sm:py-3.5 px-4 rounded-2xl bg-white dark:bg-[#071a12] hover:bg-emerald-50 dark:hover:bg-[#0d2a1b] text-emerald-700 dark:text-emerald-300 font-black text-sm border-2 border-emerald-500/70 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>CHAT</span>
          </button>

          {isPostOwner ? (
            /* Post Owner View */
            <button
              onClick={() => onOpenConfirm(currentPost || post)}
              className="py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isConfirmed ? 'ගනුදෙනු ලදුපත (Receipt)' : 'තහවුරු කිරීම (Confirm)'}</span>
            </button>
          ) : isHelperAccepted ? (
            /* Helper is Selected: Enter Start PIN */
            <button
              onClick={() => onOpenConfirm(currentPost || post)}
              className="py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>🚀 වැඩේ ආරම්භ කරන්න (Start Job)</span>
            </button>
          ) : isHelperApplied ? (
            /* Helper has applied and is waiting */
            <div className="py-3 sm:py-3.5 px-3 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border border-amber-400 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-1 text-center">
              <span>⏳ අයදුම් කර ඇත (Pending)</span>
            </div>
          ) : (
            /* Outside Helper: Apply to Help */
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 text-white font-black text-xs sm:text-sm shadow-[0_4px_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-emerald-400/40"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isApplying ? 'යවමින්...' : '🤝 මම සහය වෙන්නම්'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
