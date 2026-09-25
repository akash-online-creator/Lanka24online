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
  Check
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User as UserType } from '../types';
import { calculateMotorcycleRoadDistance, getVillageOrTownDisplay } from '../utils/geoUtils';
import { inspectAndSanitizeMessage } from '../utils/policyGuard';
import { maskName, maskPhone, maskAddress } from '../utils/demoDataMasker';
import { getLocalizedPost, getCardLabels, translateText, translateName } from '../utils/postTranslator';
import { translatePostWithGoogle } from '../utils/googleTranslator';
import { renderTextWithLinks } from '../utils/textUtils';
import { checkIsPostOwner } from '../utils/postOwnerHelper';
import { EmbeddedMediaViewer } from './EmbeddedMediaViewer';

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
}) => {
  const isDemo = Boolean(currentUser?.isDemo);
  const displayPost = React.useMemo(() => (post ? getLocalizedPost(post, lang) : null), [post, lang]);
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
    if (!post || translationMode === 'original') {
      setGooglePost(null);
      setIsTranslating(false);
      return;
    }

    if (targetGoogleLang === 'en' || targetGoogleLang === 'ta' || translationMode === 'google') {
      setIsTranslating(true);
      translatePostWithGoogle(post, targetGoogleLang)
        .then((res) => {
          if (isMounted) {
            setGooglePost(res);
            setIsTranslating(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsTranslating(false);
        });
    } else {
      setGooglePost(null);
      setIsTranslating(false);
    }

    return () => {
      isMounted = false;
    };
  }, [post, targetGoogleLang, translationMode]);

  const effectivePost = React.useMemo(() => {
    if (!post) return null;
    if (translationMode === 'original') return post;
    if (googlePost) return googlePost;
    return displayPost;
  }, [translationMode, googlePost, displayPost, post]);

  if (!isOpen || !post || !effectivePost) return null;

  const isAdmin = currentUser?.role === 'admin' && !isDemo;
  const isOwner = checkIsPostOwner(currentUser, post);
  const normalizePhone = (phone?: string) => (phone ? phone.replace(/[^0-9]/g, '') : '');

  const isConfirmedHelper = Boolean(
    !isDemo &&
    currentUser && (
      (post.confirmedHelperPhone && normalizePhone(currentUser.phone) === normalizePhone(post.confirmedHelperPhone)) ||
      (post.confirmedBy && currentUser.name && currentUser.name.trim().toLowerCase() === post.confirmedBy.trim().toLowerCase())
    )
  );
  const hasContactPermission = Boolean(
    !isDemo && (isOwner || isAdmin || isConfirmedHelper || post.revealContactConsent === true)
  );

  // Calculate accurate Motorcycle Road Distance
  const viewerLat = currentLocation?.lat || 7.1710;
  const viewerLng = currentLocation?.lng || 79.8986;
  const viewerLocName = currentLocation?.nameSi || (lang === 'en' ? 'Your Location (Viewer)' : lang === 'ta' ? 'உங்கள் இடம்' : 'ඔබ සිටින ස්ථානය (නරඹන්නා)');

  const postLat = post.lat || 7.1710;
  const postLng = post.lng || 79.8986;
  const postLocName = effectivePost.locationName || (lang === 'en' ? 'Posted Location' : lang === 'ta' ? 'பதிவு செய்யப்பட்ட இடம்' : 'දැන්වීම පළකළ ස්ථානය');

  const motorcycleRoute = calculateMotorcycleRoadDistance(
    postLat,
    postLng,
    viewerLat,
    viewerLng,
    postLocName,
    viewerLocName,
    lang
  );

  const displayPostCode = post.postCode.startsWith('#') ? post.postCode : `#${post.postCode}`;
  const helpersCount = post.helpersNeeded || post.helpersCount || 1;

  const isConfirmed = Boolean(post.isConfirmed);

  // Extract conditions & special notice cleanly
  let displaySpecialNotice = effectivePost.specialNotice || '';
  let displayConditions = effectivePost.conditions || '';

  if (!displaySpecialNotice && effectivePost.conditions) {
    if (effectivePost.conditions.includes('විශේෂ දැනුවත් කිරීම')) {
      const parts = effectivePost.conditions.split(/කොන්දේසි[:\s]*/i);
      if (parts.length > 1) {
        displaySpecialNotice = parts[0].replace(/විශේෂ දැනුවත් කිරීම්?[:\s]*/gi, '').trim();
        displayConditions = parts.slice(1).join(' ').trim();
      } else {
        displaySpecialNotice = effectivePost.conditions.replace(/විශේෂ දැනුවත් කිරීම්?[:\s]*/gi, '').trim();
        displayConditions = lang === 'en' ? 'Experienced technicians only, please.' : lang === 'ta' ? 'அனுபவமுள்ளவர்கள் மட்டும் தொடர்பு கொள்ளவும்.' : 'පළපුරුදු කාර්මික ශිල්පින් විමසන්න.';
      }
    }
  }

  if (!displayConditions || displayConditions.trim() === '') {
    displayConditions = lang === 'en' ? 'Experienced technicians only, please.' : lang === 'ta' ? 'அனுபவமுள்ளவர்கள் மட்டும் தொடர்பு கொள்ளவும்.' : 'පළපුරුදු කාර්මික ශිල්පින් විමසන්න.';
  }
  if (!displaySpecialNotice || displaySpecialNotice.trim() === '') {
    displaySpecialNotice = lang === 'en' ? 'Today' : lang === 'ta' ? 'இன்று' : 'අද දවස තුල';
  }

  const safeWhatHappened = !isConfirmed ? inspectAndSanitizeMessage(effectivePost.whatHappened, false).sanitizedText : effectivePost.whatHappened;
  const safeWhatIsNeeded = !isConfirmed ? inspectAndSanitizeMessage(effectivePost.whatIsNeeded, false).sanitizedText : effectivePost.whatIsNeeded;
  const safeConditions = !isConfirmed ? inspectAndSanitizeMessage(displayConditions, false).sanitizedText : displayConditions;
  const safeSpecialNotice = !isConfirmed ? inspectAndSanitizeMessage(displaySpecialNotice, false).sanitizedText : displaySpecialNotice;
  const safeLocationDisplay = isConfirmed 
    ? getVillageOrTownDisplay(postLocName) 
    : (postLocName ? `${getVillageOrTownDisplay(postLocName).split(',')[0]} (🔒)` : '🔒');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* Green and White Mixed Modal Container */}
      <div className="w-full max-w-lg bg-gradient-to-b from-white via-emerald-50/40 to-white dark:from-[#06180f] dark:via-[#04120a] dark:to-[#06180f] border-2 border-emerald-500/50 rounded-[2rem] shadow-[0_20px_60px_rgba(0,122,75,0.25)] overflow-hidden relative p-5 sm:p-6 my-4 flex flex-col max-h-[92vh]">
        
        {/* Header Bar with Emerald accents */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-emerald-200/80 dark:border-emerald-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700/60 shadow-sm">
              {displayPostCode}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
              {post.category === 'find_for_me' 
                ? getLangText('සොයාදෙන්න දැන්වීම් විස්තරය', 'Find For Me Details', 'தேடித்தருக விளம்பர விவரம்') 
                : getLangText('ක්ෂණික සේවා විස්තරය', 'Quick Service Details', 'உடனடி சேவை விவரம்')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(isOwner || isAdmin) && onEditPost && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditPost(post);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer border border-amber-300/40"
                title={getLangText('දැන්වීම සංස්කරණය', 'Edit Post', 'திருத்து')}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{getLangText('සංස්කරණය', 'Edit', 'திருத்து')}</span>
              </button>
            )}

            {(isOwner || isAdmin) && onDeletePost && (
              <button
                type="button"
                onClick={() => {
                  onDeletePost(post);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer border border-rose-400/40"
                title={getLangText('දැන්වීම මකා දමන්න (Delete Post)', 'Delete Post', 'நீக்கு')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{getLangText('මකා දමන්න', 'Delete', 'நீக்கு')}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-emerald-100/80 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 hover:text-emerald-900 dark:hover:text-emerald-100 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-center font-bold transition-all cursor-pointer"
              title={getLangText('වසන්න', 'Close', 'மூடு')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="bg-white dark:bg-[#071710] border border-emerald-200/90 dark:border-emerald-900/70 rounded-2xl p-4 sm:p-5 space-y-3.5 text-sm overflow-y-auto shadow-sm">
          
          {/* Hi Greeting & User info */}
          <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-emerald-100 dark:border-emerald-950/80 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/50 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                <span>{getLangText('Hi, මම', 'Hi, I am', 'வணக்கம், நான்')}</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-black">
                  {maskName(
                    translateName(
                      effectivePost?.userName || post.userName,
                      translationMode === 'original' ? 'si' : targetGoogleLang
                    ),
                    isDemo,
                    translationMode === 'original' ? 'si' : targetGoogleLang
                  )}
                </span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>{cardLabels.accountHolder}</span>
                </span>
              </div>
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
                onClick={() => {
                  setTranslationMode('original');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  translationMode === 'original'
                    ? 'bg-emerald-700 text-white shadow-2xs ring-1 ring-emerald-500'
                    : 'bg-white dark:bg-[#07180f] text-slate-600 dark:text-slate-300 hover:text-emerald-600 border border-slate-200 dark:border-slate-800'
                }`}
                title={getLangText('දැන්වීම පළකළ මුල් භාෂාවෙන් බැලීම', 'View original post language', 'அசல் மொழியில் பார்க்க')}
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
                title="Translate to English"
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
                title="தமிழில் படிக்க"
              >
                தமிழ்
              </button>
              <button
                type="button"
                onClick={() => {
                  setTranslationMode('google');
                  setTargetGoogleLang('si');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  translationMode !== 'original' && targetGoogleLang === 'si'
                    ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-400'
                    : 'bg-white dark:bg-[#07180f] text-slate-600 dark:text-slate-300 hover:text-emerald-600 border border-slate-200 dark:border-slate-800'
                }`}
                title="සිංහලට පරිවර්තනය"
              >
                සිංහල
              </button>
            </div>
          </div>

          {post.category === 'find_for_me' ? (() => {
            const effectiveType = post.findForMeType || (
              post.whatHappened?.includes('නැතිවූ') || post.whatIsNeeded?.includes('නැතිවූ') || post.tagName?.toLowerCase().includes('lost')
                ? 'lost'
                : post.whatHappened?.includes('සොරාගත්') || post.whatIsNeeded?.includes('සොරාගත්') || post.tagName?.toLowerCase().includes('stolen')
                ? 'stolen'
                : 'find'
            );

            const effectiveItemName = post.itemLostStolenOrSearched ||
              post.whatHappened?.replace(/^(නැතිවූ|සොරාගත්|සොයන|අවශ්‍ය)\s*(දෙයක්|භාණ්ඩයක්)?:\s*/i, '')?.split('.')[0] ||
              post.whatIsNeeded?.replace(/^නැතිවූ\s*|^සොරාගත්\s*|^සොයන\s*|සොයාදෙන්න\.?$/g, '')?.trim() ||
              post.tagName ||
              'අදාළ භාණ්ඩය / සේවාව';

            const rawContactPhone = post.contactPhone || post.userPhone || '';
            const rawContactWhatsapp = post.contactWhatsapp || post.userPhone || '';
            const rawContactAddress = post.contactAddress || post.locationName || '';

            const effectiveContactPhone = hasContactPermission 
              ? (rawContactPhone || '0771234567') 
              : (rawContactPhone ? `${rawContactPhone.slice(0, 3)} *** **** (🔒 ආරක්ෂිතයි)` : '07* *** **** (🔒 ආරක්ෂිතයි)');
            const effectiveContactWhatsapp = hasContactPermission 
              ? (rawContactWhatsapp || '0771234567') 
              : (rawContactWhatsapp ? `${rawContactWhatsapp.slice(0, 3)} *** **** (🔒 ආරක්ෂිතයි)` : '07* *** **** (🔒 ආරක්ෂිතයි)');
            const effectiveContactAddress = hasContactPermission
              ? (rawContactAddress || 'ගෙදර ලිපිනය')
              : '🔒 නිශ්චිත ලිපිනය ආරක්ෂිතයි (දැන්වීම්කරුගේ අවසරය අවශ්‍යයි)';
            const effectiveLocationName = post.locationName || 'ස්ථානය තහවුරු කර ඇත';
            const effectiveIncidentLocation = post.incidentLocation || post.locationName || '';
            const effectiveIncidentDate = post.incidentDate || (post.createdAt?.includes('මීට') ? 'අද' : post.createdAt) || '';
            const effectiveIncidentTime = post.incidentTime || '';
            const effectiveDelivery = post.deliveryOption || post.transport || 'ගෙනවිත් දෙන්න ඒ සදහා මම ඔබට වෙනම ගෙවන්නම්';
            const effectiveOtherDetails = post.otherDetails || (post.conditions && !post.conditions.startsWith('ගණුදෙනුව') && !post.conditions.startsWith('සම්බන්ධ') ? post.conditions : '');
            const showReward = (post.hasReward || Boolean(post.rewardDetails)) && Boolean(post.rewardDetails && post.rewardDetails.trim() !== '');
            const safeIdentifyingInfo = hasContactPermission 
              ? post.identifyingInfo 
              : (post.identifyingInfo ? inspectAndSanitizeMessage(post.identifyingInfo, false).sanitizedText : '');

            return (
              /* DEDICATED FIND FOR ME PRESENTATION IN DETAIL MODAL */
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-xl shadow-xs border ${
                    effectiveType === 'lost'
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                      : effectiveType === 'stolen'
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                      : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                  }`}>
                    <Search className="w-3.5 h-3.5" />
                    <span>
                      {effectiveType === 'lost'
                        ? getLangText('🔴 නැතිවූ දෙයක් (Lost Item)', '🔴 Lost Item', '🔴 தொலைந்த பொருள்')
                        : effectiveType === 'stolen'
                        ? getLangText('⚠️ සොරාගත් දෙයක් (Stolen Item)', '⚠️ Stolen Item', '⚠️ திருடப்பட்ட பொருள்')
                        : getLangText('🔍 සොයාදෙන්න (Search / Procurement)', '🔍 Find For Me', '🔍 தேடித்தருக')}
                    </span>
                  </span>

                  {showReward && (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/90 px-3 py-1 rounded-xl border border-amber-300 dark:border-amber-600">
                      <Gift className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{getLangText('තෑග්ගක් සහිතයි', 'Reward Offered', 'பரிசு உண்டு')}</span>
                    </span>
                  )}
                </div>

                {(effectiveType === 'lost' || effectiveType === 'stolen') && (
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-[#071d12] rounded-2xl border border-emerald-300/80 dark:border-emerald-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed space-y-2">
                    <p>
                      {effectiveIncidentDate ? `${effectiveIncidentDate} ${getLangText('දින, ', 'on, ', 'அன்று, ')}` : ''}
                      {effectiveIncidentTime ? `${effectiveIncidentTime} ${getLangText('පමණ, ', 'around, ', 'அளவில், ')}` : ''}
                      {effectiveIncidentLocation ? `${effectiveIncidentLocation} ${getLangText('දී, ', 'at, ', 'இடத்தில், ')}` : ''}
                      <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                        {translateText(effectiveItemName, lang)}
                      </strong>{' '}
                      {effectiveType === 'lost' ? getLangText('නැතිවී ඇත,', 'is lost,', 'தொலைந்துவிட்டது,') : getLangText('සොරාගෙන ඇත,', 'is stolen,', 'திருடப்பட்டுவிட்டது,')}{' '}
                      {getLangText('සොයාගත් කෙනෙක් වේනම්', 'if found please contact me via', 'கண்டெடுத்தால் என்னை தொடர்பு கொள்ளவும்:')}{' '}
                      <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">
                        {effectiveContactPhone}
                        {effectiveContactWhatsapp && effectiveContactWhatsapp !== effectiveContactPhone ? ` ${getLangText('හෝ', 'or', 'அல்லது')} ${effectiveContactWhatsapp}` : ''}
                      </span>{' '}
                      {getLangText('හරහා මා සම්බන්ධකරගන්න.', '.', '.')}
                    </p>
                    <p className="text-slate-800 dark:text-slate-200">
                      {getLangText('නැතිනම්', 'Or send to', 'அல்லது பின்வரும் முகவரிக்கு அனுப்பவும்:')}{' '}
                      <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
                        {getVillageOrTownDisplay(effectiveContactAddress)}
                      </span>{' '}
                      {getLangText('ට එවන්න. නිවැරදි ස්ථානය:', '. Verified location:', '. உறுதிப்படுத்தப்பட்ட இடம்:')}{' '}
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {getVillageOrTownDisplay(effectiveLocationName)}
                      </span>
                    </p>

                    {/* Identifying info on item (Phone, NIC, Reg/Serial No, or Name) */}
                    {safeIdentifyingInfo && safeIdentifyingInfo.trim() !== '' && (
                      <div className="mt-2 p-3 bg-amber-500/10 dark:bg-amber-950/40 rounded-xl border-2 border-amber-400/70 dark:border-amber-700/70 text-xs text-amber-950 dark:text-amber-100 shadow-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-300">
                          <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>{getLangText('නැති වූ දේ ඇති දුරකථන අංකය / හැඳුනුම්පත් අංකය / සලකුණු / නම:', 'Phone / NIC / Serial / Markings on item:', 'பொருளிலுள்ள தொலைபேசி / அடையாள அட்டை / அடையாளங்கள்:')}</span>
                        </div>
                        <p className="font-extrabold text-sm pl-5 text-slate-900 dark:text-white bg-white/70 dark:bg-black/30 py-1.5 px-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                          {safeIdentifyingInfo}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {effectiveType === 'find' && (
                  <div className="space-y-2.5">
                    <div className="p-3.5 bg-emerald-50/60 dark:bg-[#071d12] rounded-2xl border border-emerald-300/80 dark:border-emerald-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed space-y-1.5">
                      <p>
                        {post.targetPrice ? `${post.targetPrice} ${getLangText('පමණ, ', 'around, ', 'அளவில், ')}` : ''}
                        <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                          {translateText(effectiveItemName, lang)}
                        </strong>{' '}
                        {post.quantityNeeded ? `${post.quantityNeeded} ` : ''}{getLangText('අවශ්‍යයි,', 'is needed,', 'தேவைப்படுகிறது,')}
                      </p>
                      {post.hasDeadline && post.deadlineDate && (
                        <p className="text-rose-600 dark:text-rose-400 font-extrabold">
                          {getLangText('පෙර සොයාදෙන්න:', 'Please find before:', 'இதற்கு முன்னர் கண்டறியவும்:')} {post.deadlineDate} {post.deadlineTime ? `(${post.deadlineTime}) ` : ''}
                        </p>
                      )}
                    </div>

                    {/* Contact & Location Info */}
                    <div className="p-3 bg-white dark:bg-[#082014] rounded-2xl border border-emerald-200 dark:border-emerald-900 text-xs space-y-1.5">
                      <strong className="text-emerald-900 dark:text-emerald-300 font-black block pb-1 border-b border-emerald-200/80 dark:border-emerald-900/50">
                        {getLangText('ස්ථානය හා සම්බන්ධකරගතහැකි තොරතුරු:', 'Location & Contact Information:', 'இடம் மற்றும் தொடர்பு விவரங்கள்:')}
                      </strong>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 font-semibold">
                        <div>
                          <span className="text-slate-500">{getLangText('දුරකථන: ', 'Phone: ', 'தொலைபேசி: ')}</span>
                          <strong className="text-slate-900 dark:text-white">{effectiveContactPhone}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">WhatsApp: </span>
                          <strong className="text-slate-900 dark:text-white">{effectiveContactWhatsapp}</strong>
                        </div>
                        {effectiveContactAddress && (
                          <div className="sm:col-span-2">
                            <span className="text-slate-500">{getLangText('ගෙදර ලිපිනය: ', 'Address: ', 'முகவரி: ')}</span>
                            <strong className="text-slate-900 dark:text-white">{getVillageOrTownDisplay(effectiveContactAddress)}</strong>
                          </div>
                        )}
                        <div className="sm:col-span-2">
                          <span className="text-slate-500">{getLangText('නිවැරදි ස්ථානය: ', 'Verified Location: ', 'உறுதிப்படுத்தப்பட்ட இடம்: ')}</span>
                          <strong className="text-slate-900 dark:text-white">{getVillageOrTownDisplay(effectiveLocationName)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Delivery / Transaction Method */}
                    <div className="p-3 bg-emerald-100/60 dark:bg-[#0a2719] rounded-2xl border border-emerald-300 text-xs space-y-1">
                      <strong className="text-emerald-900 dark:text-emerald-300 font-black flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{getLangText('ගණුදෙනුව සිදුවියයුතු ආකාරය:', 'Transaction / Delivery Method:', 'பரிவர்த்தனை / விநியோக முறை:')}</span>
                      </strong>
                      <p className="font-bold text-slate-900 dark:text-white pl-5">
                        {translateText(effectiveDelivery, lang)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Other details */}
                {effectiveOtherDetails && effectiveOtherDetails.trim() !== '' && (
                  <div className="p-3 bg-slate-50 dark:bg-[#081e14] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                    <strong className="text-emerald-900 dark:text-emerald-300 font-black block mb-0.5">
                      {getLangText('වැඩි විස්තර:', 'Additional Details:', 'கூடுதல் விவரங்கள்:')}
                    </strong>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{translateText(effectiveOtherDetails, lang)}</p>
                  </div>
                )}

                {/* Reward (Only shown if hasReward) */}
                {showReward && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/80 rounded-2xl text-amber-900 dark:text-amber-200 font-extrabold text-xs flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      <strong>{getLangText('සොයාදෙන්නාහට මගෙන්:', 'Reward for finder:', 'கண்டெடுப்பவருக்கு பரிசு:')}</strong> {post.rewardDetails}
                    </span>
                  </div>
                )}

                {/* Direct Instant Action chips */}
                <div className="pt-2 grid grid-cols-2 gap-2">
                  {hasContactPermission ? (
                    <>
                      {rawContactPhone && (
                        <a
                          href={`tel:${rawContactPhone.replace(/\D/g, '')}`}
                          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{getLangText('ඇමතුමක් ගන්න', 'Call', 'அழைக்கவும்')}</span>
                        </a>
                      )}

                      {rawContactWhatsapp && (
                        <a
                          href={`https://wa.me/${rawContactWhatsapp.replace(/^0/, '94').replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenChat(post)}
                        title={getLangText('දුරකථන අංකය ලබා ගැනීමට ඉල්ලුම්කරු සමග Chat කරන්න', 'Chat to request phone number', 'தொலைபேசி எண்ணை பெற உரையாடவும்')}
                        className="py-2.5 px-3 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{getLangText('අංකය ඉල්ලන්න (Chat)', 'Request Number', 'எண்ணை கேளுங்கள்')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenChat(post)}
                        title={getLangText('ලිපිනය හා WhatsApp තොරතුරු ලබා ගැනීමට Chat කරන්න', 'Chat for address and WhatsApp', 'முகவரி மற்றும் WhatsApp விவரங்களுக்கு உரையாடவும்')}
                        className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-teal-600" />
                        <span>{getLangText('සංවාදය (Chat)', 'Chat', 'உரையாடு')}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })() : (
            /* STANDARD QUICK SERVICES VIEW */
            <>
              {/* 1. සිදුවී ඇති දේ (What Happened) */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl space-y-0.5">
                <span className="font-extrabold text-xs text-emerald-900 dark:text-emerald-300 block">
                  {getLangText('සිදුවී ඇති දේ:', 'What happened:', 'நடந்தது என்ன:')}
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {renderTextWithLinks(safeWhatHappened)}
                </p>
              </div>

              {/* 2. වියයුතු දේ (What is Needed) */}
              <div className="p-3 bg-white dark:bg-[#0b2419]/70 border border-emerald-300/80 dark:border-emerald-700/60 rounded-xl space-y-0.5 shadow-sm">
                <span className="font-extrabold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  {getLangText('වියයුතු දේ:', 'What is needed:', 'செய்ய வேண்டியது:')}
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {renderTextWithLinks(safeWhatIsNeeded)}
                </p>
              </div>
            </>
          )}

          {/* 🏍️ ACCURATE MOTORCYCLE ROAD ROUTE & DISTANCE CARD (White & Emerald Styled) */}
          <div className="p-3.5 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white dark:from-[#092217] dark:via-[#05180f] dark:to-[#092217] border-2 border-emerald-500/50 dark:border-emerald-600/50 rounded-2xl space-y-2.5 shadow-sm">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-black text-xs text-emerald-800 dark:text-emerald-300">
                <span className="text-sm">🏍️</span>
                <span>{getLangText('මෝටර් සයිකලයෙන් මාර්ග දුර (Motorcycle Road Distance)', 'Motorcycle Road Distance', 'மோட்டார் சைக்கிள் வீதி தூரம்')}</span>
              </div>
              <span className="text-[10px] font-mono font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg shadow-sm">
                ~{motorcycleRoute.formattedTime}
              </span>
            </div>

            {/* Two Locations Comparison */}
            <div className="grid grid-cols-1 gap-2 text-xs">
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

            {/* Direct Google Maps Directions link / Privacy Lock */}
            {post.isConfirmed || post.category === 'find_for_me' ? (
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

          {post.category !== 'find_for_me' && (
            <>
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

              {/* 5. අවශ්‍ය සහායකයින් ගණන (Helpers Count - No underscores!) */}
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
                <span>{getLangText('ගමනාගමනය: ', 'Transport: ', 'போக்குவரத்து: ')}<span className="font-extrabold text-slate-900 dark:text-slate-100">{translateText(post.transport || (lang === 'en' ? 'You should arrive' : lang === 'ta' ? 'நீங்கள் வர வேண்டும்' : 'ඔබ පැමිණිය යුතුයි'), lang)}</span></span>
              </div>

              {/* 7. ගෙවීම් (Payment) */}
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-300/80 dark:border-emerald-700/60 shadow-sm">
                <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{getLangText('ගෙවීම් : ', 'Payment / Fee: ', 'கட்டணம்: ')}<span className="font-black text-slate-900 dark:text-white">{translateText(post.payment || (lang === 'en' ? 'I agree to your fee' : lang === 'ta' ? 'உங்கள் கட்டணத்திற்கு சம்மதிக்கிறேன்' : 'ඔබගේ ගාස්තුවට මම එකඟ වෙමි (I agree to your fee)'), lang)}</span></span>
              </div>

              {/* Embedded Media / Video Link Player */}
              {(post.externalLink || post.videoUrl) && (
                <div className="pt-2">
                  <EmbeddedMediaViewer
                    url={post.externalLink || post.videoUrl}
                    compact={false}
                  />
                </div>
              )}

              {/* 8. උදව් කරන්න Prompt */}
              <p className="text-center text-emerald-700 dark:text-emerald-400 font-black pt-1 text-base sm:text-lg tracking-wide">
                {getLangText('උදව් කරන්න.', 'Please help.', 'உதவி செய்யுங்கள்.')}
              </p>
            </>
          )}

        </div>

        {/* Bottom Action Buttons: CHAT and CONFIRM */}
        <div className="grid grid-cols-2 gap-3 pt-4 shrink-0">
          <button
            onClick={() => {
              if (isDemo) {
                if (onRequireRegistration) onRequireRegistration();
                return;
              }
              onOpenChat(post);
            }}
            className="py-3 sm:py-3.5 px-4 rounded-2xl bg-white dark:bg-[#071a12] hover:bg-emerald-50 dark:hover:bg-[#0d2a1b] text-emerald-700 dark:text-emerald-300 font-black text-sm border-2 border-emerald-500/70 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>CHAT</span>
          </button>

          {isConfirmed ? (
            <div className="py-3 sm:py-3.5 px-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm text-center">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{getLangText('දැනටමත් සනාථ කර ඇත', 'Already Confirmed', 'ஏற்கனவே உறுதிப்படுத்தப்பட்டது')}</span>
            </div>
          ) : (
            <button
              onClick={() => {
                if (isDemo) {
                  if (onRequireRegistration) onRequireRegistration();
                  return;
                }
                onOpenConfirm(post);
              }}
              className="py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-[0_4px_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border border-emerald-400/40"
            >
              <CheckCircle className="w-4 h-4 text-white" />
              <span>CONFIRM</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};


