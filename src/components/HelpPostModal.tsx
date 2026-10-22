import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, 
  Wrench, 
  FileText, 
  Car, 
  Banknote, 
  Phone, 
  ShieldCheck, 
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Sparkles,
  Video,
  Mic,
  Image as ImageIcon,
  Cloud,
  Loader2,
  Trash2,
  Play,
  Type,
  Camera,
  Eye,
  EyeOff,
  MessageSquare,
  UserCheck,
  Send,
  Upload,
  Layers,
  HelpCircle
} from 'lucide-react';
import { HelpPost, Language, LocationOption, TagItem, TelegramMediaRecord, User } from '../types';
import { translations } from '../data/translations';
import { TagSelector } from './TagSelector';
import { getStoredTags } from '../utils/tagUtils';
import { uploadMediaToTelegram } from '../utils/telegramStorage';
import { AudioVoiceRecorder, AudioVoicePlayer } from './AudioVoiceNote';
import { EmbeddedMediaViewer } from './EmbeddedMediaViewer';
import { AiVoiceInlineBar } from './AiVoiceInlineBar';
import { SUPPORTED_POST_FONTS, injectPostFonts, getFontFamilyById } from '../utils/postFontManager';

export interface HelpPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPost?: (post: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>) => void;
  onSubmit?: (post: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>) => void;
  currentLocation?: LocationOption;
  availableLocations?: LocationOption[];
  selectedCategory?: any;
  lang?: Language;
  language?: Language;
  currentUser?: User | null;
}

export const HelpPostModal: React.FC<HelpPostModalProps> = ({
  isOpen,
  onClose,
  onSubmitPost,
  onSubmit,
  currentLocation = { id: 'loc_colombo', nameSi: 'කොළඹ', nameEn: 'Colombo', lat: 6.9271, lng: 79.8612 },
  availableLocations,
  selectedCategory,
  lang,
  language = 'si',
  currentUser = null,
}) => {
  const activeLang = lang || language || 'si';
  const t = translations[activeLang] || translations.si;

  // 🔀 3-Way Method Mode State:
  // 'standard' = ප්‍රශ්න වලට තොරතුරු සපයන සාමාන්‍ය ක්‍රමය
  // 'text_post' = Facebook-style Text Post
  // 'picture_post' = 16:9 Picture Post
  const [postMode, setPostMode] = useState<'standard' | 'text_post' | 'picture_post'>('standard');

  // Shared Author Identity State
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // 📝 2nd Method: Text Post State
  const [textHeadline, setTextHeadline] = useState('');
  const [selectedFont, setSelectedFont] = useState('noto-sans-sinhala');
  const [textDescription, setTextDescription] = useState('');
  const [showCommentsText, setShowCommentsText] = useState(true);
  const [showProfileText, setShowProfileText] = useState(true);
  const [generatedAnonymousId, setGeneratedAnonymousId] = useState('');

  // 📸 3rd Method: Picture Post State
  const [pictureHeadline, setPictureHeadline] = useState('');
  const [pictureImageBase64, setPictureImageBase64] = useState('');
  const [showCommentsPic, setShowCommentsPic] = useState(true);
  const [showProfilePic, setShowProfilePic] = useState(true);

  // 1st Method: Standard Form State
  const [step, setStep] = useState<1 | 2>(1);
  const [whatHappened, setWhatHappened] = useState('');
  const [whatIsNeeded, setWhatIsNeeded] = useState('');
  const [conditions, setConditions] = useState('');
  const [transport, setTransport] = useState('');
  const [payment, setPayment] = useState('');
  const [externalLink, setExternalLink] = useState('');

  // Voice Data state
  const [voiceData, setVoiceData] = useState<{
    audioUrl?: string;
    durationSec?: number;
    transcript?: string;
    date?: string;
    time?: string;
    location?: string;
    coords?: { lat: number; lng: number };
  } | null>(null);

  // Media & Telegram State
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState('');
  const [audioDurationSec, setAudioDurationSec] = useState(0);
  const [telegramStorage, setTelegramStorage] = useState<TelegramMediaRecord | undefined>(undefined);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const picturePostImageRef = useRef<HTMLInputElement | null>(null);

  // Tag State
  const [allTags, setAllTags] = useState<TagItem[]>(() => getStoredTags());
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);
  const [tagError, setTagError] = useState('');

  // Status & OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [rateLimitError, setRateLimitError] = useState('');

  // Initialize Fonts & Defaults
  useEffect(() => {
    injectPostFonts();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setUserName(currentUser?.name || '');
      setUserPhone(currentUser?.whatsappPhone || currentUser?.phone || '');
      setTextHeadline('');
      setTextDescription('');
      setSelectedFont('noto-sans-sinhala');
      setShowCommentsText(true);
      setShowProfileText(true);
      setPictureHeadline('');
      setPictureImageBase64('');
      setShowCommentsPic(true);
      setShowProfilePic(true);
      // Generate unique random anonymous ID e.g. Anonymous #4829
      const randCode = Math.floor(1000 + Math.random() * 9000);
      setGeneratedAnonymousId(`Anonymous #${randCode}`);
      setWhatHappened('');
      setWhatIsNeeded('');
      setConditions('');
      setTransport('');
      setPayment('');
      setExternalLink('');
      setUploadedImageUrl('');
      setUploadedVideoUrl('');
      setUploadedAudioUrl('');
      setAudioDurationSec(0);
      setTelegramStorage(undefined);
      setIsUploadingMedia(false);
      setShowVoiceRecorder(false);
      setSelectedTag(null);
      setTagError('');
      setOtpSent(false);
      setEnteredOtp('');
      setOtpError(false);
      setIsSuccess(false);
      setAllTags(getStoredTags());
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const submitHandler = onSubmit || onSubmitPost;

  // -------------------------------------------------------------
  // 📸 Picture Post File Selection
  // -------------------------------------------------------------
  const handlePicturePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setPictureImageBase64(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // 🚀 SUBMIT METHOD 2: TEXT POST (Facebook Style)
  // -------------------------------------------------------------
  const handleTextPostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textHeadline.trim()) {
      alert('කරුණාකර හෙඩ්ලයින් එක (Headline) ඇතුළත් කරන්න.');
      return;
    }
    if (!textDescription.trim()) {
      alert('කරුණාකර දැන්වීමේ විස්තරය ඇතුළත් කරන්න.');
      return;
    }

    const isAnon = !showProfileText;
    const authorDisplayName = isAnon ? generatedAnonymousId : (userName.trim() || currentUser?.name || 'සහය ඉල්ලුම්කරු');
    const authorDisplayPhoto = isAnon ? '' : (currentUser?.photoUrl || '');

    const postPayload: any = {
      userName: authorDisplayName,
      userPhotoUrl: authorDisplayPhoto,
      userPhone: userPhone.trim() || currentUser?.whatsappPhone || currentUser?.phone || '',
      postType: 'text_post',
      headline: textHeadline.trim(),
      title: textHeadline.trim(),
      selectedFont: selectedFont,
      whatHappened: textDescription.trim(),
      whatIsNeeded: textHeadline.trim(),
      conditions: 'විශේෂ කොන්දේසි නොමැත.',
      transport: 'අදාළ නොවේ',
      payment: 'නොමිලේ / සාකච්ඡා කළ හැක',
      locationName: `${currentLocation.nameSi} (${currentLocation.nameEn})`,
      distanceKm: 0.5,
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      verifiedOtp: true,
      showComments: showCommentsText,
      isAnonymous: isAnon,
      anonymousId: isAnon ? generatedAnonymousId : undefined,
      // 🛡️ Secure Admin Audit Trail
      actualAuthorId: currentUser?.id || currentUser?.userId || 'unknown',
      actualAuthorName: currentUser?.name || userName.trim() || 'Anonymous User',
      actualAuthorNic: currentUser?.nicNumber || currentUser?.nic || currentUser?.userId || 'N/A',
      actualAuthorPhone: currentUser?.whatsappPhone || currentUser?.phone || userPhone.trim() || 'N/A',
      likeCount: 0,
      unlikeCount: 0,
      unlikesCount: 0,
      savesCount: 0,
      commentsCount: 0,
      commentsList: [],
    };

    if (submitHandler) {
      submitHandler(postPayload);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  // -------------------------------------------------------------
  // 🚀 SUBMIT METHOD 3: PICTURE POST (16:9 Image)
  // -------------------------------------------------------------
  const handlePicturePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pictureHeadline.trim()) {
      alert('කරුණාකර හෙඩ්ලයින් එක (Headline) ඇතුළත් කරන්න.');
      return;
    }
    if (!pictureImageBase64) {
      alert('කරුණාකර 16:9 අනුපාතයේ ඡායාරූපයක් තෝරාගන්න.');
      return;
    }

    const isAnon = !showProfilePic;
    const authorDisplayName = isAnon ? generatedAnonymousId : (userName.trim() || currentUser?.name || 'සහය ඉල්ලුම්කරු');
    const authorDisplayPhoto = isAnon ? '' : (currentUser?.photoUrl || '');

    const postPayload: any = {
      userName: authorDisplayName,
      userPhotoUrl: authorDisplayPhoto,
      userPhone: userPhone.trim() || currentUser?.whatsappPhone || currentUser?.phone || '',
      postType: 'picture_post',
      headline: pictureHeadline.trim(),
      title: pictureHeadline.trim(),
      imageUrl: pictureImageBase64,
      mediaType: 'photo',
      whatHappened: pictureHeadline.trim(),
      whatIsNeeded: pictureHeadline.trim(),
      conditions: 'විශේෂ කොන්දේසි නොමැත.',
      transport: 'අදාළ නොවේ',
      payment: 'නොමිලේ / සාකච්ඡා කළ හැක',
      locationName: `${currentLocation.nameSi} (${currentLocation.nameEn})`,
      distanceKm: 0.5,
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      verifiedOtp: true,
      showComments: showCommentsPic,
      isAnonymous: isAnon,
      anonymousId: isAnon ? generatedAnonymousId : undefined,
      // 🛡️ Secure Admin Audit Trail
      actualAuthorId: currentUser?.id || currentUser?.userId || 'unknown',
      actualAuthorName: currentUser?.name || userName.trim() || 'Anonymous User',
      actualAuthorNic: currentUser?.nicNumber || currentUser?.nic || currentUser?.userId || 'N/A',
      actualAuthorPhone: currentUser?.whatsappPhone || currentUser?.phone || userPhone.trim() || 'N/A',
      likeCount: 0,
      unlikeCount: 0,
      unlikesCount: 0,
      savesCount: 0,
      commentsCount: 0,
      commentsList: [],
    };

    if (submitHandler) {
      submitHandler(postPayload);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  // -------------------------------------------------------------
  // 🚀 SUBMIT METHOD 1: STANDARD QUESTIONNAIRE FORM
  // -------------------------------------------------------------
  const handleStandardFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatHappened.trim()) {
      alert('කරුණාකර සිදුවී ඇති දේ ඇතුළත් කරන්න.');
      return;
    }

    const postPayload: any = {
      userName: userName.trim() || currentUser?.name || 'සහය ඉල්ලුම්කරු',
      userPhotoUrl: currentUser?.photoUrl || '',
      userPhone: userPhone.trim() || currentUser?.whatsappPhone || currentUser?.phone || '',
      postType: 'standard',
      whatHappened: whatHappened.trim(),
      whatIsNeeded: whatIsNeeded.trim() || whatHappened.trim(),
      conditions: conditions.trim() || 'විශේෂ කොන්දේසි නොමැත.',
      transport: transport.trim() || 'අදාළ නොවේ',
      payment: payment.trim() || 'නොමිලේ / සාකච්ඡා කළ හැක',
      externalLink: externalLink.trim(),
      imageUrl: uploadedImageUrl || undefined,
      videoUrl: uploadedVideoUrl || undefined,
      telegramStorage: telegramStorage || undefined,
      mediaType: uploadedVideoUrl ? 'video' : (voiceData?.audioUrl || uploadedAudioUrl) ? 'voice' : uploadedImageUrl ? 'photo' : undefined,
      locationName: `${currentLocation.nameSi} (${currentLocation.nameEn})`,
      distanceKm: 0.5,
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      verifiedOtp: true,
      tagName: selectedTag?.tagName,
      tagCategory: selectedTag?.category,
      tagId: selectedTag?.id,
      audioUrl: voiceData?.audioUrl || uploadedAudioUrl || undefined,
      audioDurationSec: voiceData?.durationSec || audioDurationSec || undefined,
      isVoicePost: Boolean(voiceData?.audioUrl || uploadedAudioUrl),
      voiceTranscript: voiceData?.transcript,
      showComments: true,
      likeCount: 0,
      unlikeCount: 0,
      unlikesCount: 0,
      savesCount: 0,
      commentsCount: 0,
      commentsList: [],
    };

    if (submitHandler) {
      submitHandler(postPayload);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-[#07190f] border-2 border-emerald-500/80 rounded-3xl shadow-2xl overflow-hidden relative max-h-[92vh] flex flex-col text-slate-800 dark:text-zinc-100">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-[#04160d] px-5 py-4 text-white flex items-center justify-between border-b border-emerald-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black leading-tight flex items-center gap-2">
                <span>සාමාන්‍ය සේවා දැන්වීම් පුවරුව</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/40">
                  New Post
                </span>
              </h3>
              <p className="text-[11px] text-emerald-200/90 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-300" />
                <span>ස්ථානය: <strong className="text-white">{currentLocation.nameSi} ({currentLocation.nameEn})</strong></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-black text-sm transition-all cursor-pointer active:scale-95"
            title="වසන්න"
          >
            ✕
          </button>
        </div>

        {/* 🔀 3-WAY METHOD SELECTOR TABS */}
        <div className="p-2 sm:p-2.5 bg-emerald-50/90 dark:bg-[#05140b] border-b border-emerald-200/80 dark:border-emerald-900/60 shrink-0">
          <div className="text-[11px] font-black text-emerald-950 dark:text-emerald-300 mb-1.5 px-1 flex items-center justify-between">
            <span>දැන්වීම පළකිරීමේ ක්‍රමය තෝරන්න (Select Posting Method):</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">ක්‍රම 3කි</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/80 dark:bg-[#071d12] rounded-2xl border border-slate-300/80 dark:border-emerald-900/50">
            {/* Tab 1: Standard Questionnaire */}
            <button
              type="button"
              onClick={() => setPostMode('standard')}
              className={`py-2 px-1.5 rounded-xl text-center font-black text-[11px] sm:text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                postMode === 'standard'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">1. සාමාන්‍ය පෝරමය</span>
            </button>

            {/* Tab 2: Facebook-style Text Post */}
            <button
              type="button"
              onClick={() => setPostMode('text_post')}
              className={`py-2 px-1.5 rounded-xl text-center font-black text-[11px] sm:text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                postMode === 'text_post'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">2. Text Post</span>
            </button>

            {/* Tab 3: 16:9 Picture Post */}
            <button
              type="button"
              onClick={() => setPostMode('picture_post')}
              className={`py-2 px-1.5 rounded-xl text-center font-black text-[11px] sm:text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                postMode === 'picture_post'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">3. Picture Post</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {isSuccess ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-3 animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">දැන්වීම සාර්ථකව පළකරන ලදී!</h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md">
                ඔබගේ දැන්වීම ප්‍රජා පුවරුවේ සජීවීව දිස්වනු ඇත.
              </p>
            </div>
          ) : postMode === 'text_post' ? (
            /* ==============================================================
               📝 METHOD 2: TEXT POST (FACEBOOK STYLE) FORM
               ============================================================== */
            <form onSubmit={handleTextPostSubmit} className="space-y-4 animate-fadeIn">
              
              {/* 01. Headline Box */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>හෙඩ්ලයින් එක (Headline / Title):</span>
                </label>
                <input
                  type="text"
                  required
                  value={textHeadline}
                  onChange={(e) => setTextHeadline(e.target.value)}
                  placeholder="උදා: කඩවත අවට විශ්වාසනීය ජලනල කාර්මික සේවාවක් සොයමි..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#06160d] border border-slate-300 dark:border-emerald-800/80 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  style={{ fontFamily: getFontFamilyById(selectedFont) }}
                />
              </div>

              {/* 02. Font Selection Box (Sinhala / English / Tamil Repository) */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">2</span>
                    <Type className="w-3.5 h-3.5 text-emerald-600" />
                    <span>අකුරු විලාසය (Select Font Style):</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    Google Web Fonts Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {SUPPORTED_POST_FONTS.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setSelectedFont(font.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedFont === font.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 shadow-xs ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-emerald-900/40 bg-white dark:bg-[#06160d] hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-black text-slate-800 dark:text-zinc-200">{font.name}</span>
                        {selectedFont === font.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <div 
                        className="text-xs text-slate-600 dark:text-zinc-400 truncate"
                        style={{ fontFamily: font.fontFamily }}
                      >
                        {font.previewSample}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 03. Description Box */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>දැන්වීමේ විස්තරය (Post Description):</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  placeholder="ඔබගේ අවශ්‍යතාවය, සම්බන්ධ කරගත හැකි ආකාරය සහ අනෙකුත් සියලු විස්තර මෙහි සටහන් කරන්න..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-[#06160d] border border-slate-300 dark:border-emerald-800/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                  style={{ fontFamily: getFontFamilyById(selectedFont) }}
                />
              </div>

              {/* 04 & 05. Checkboxes (Comments Toggle & Profile / Anonymous Toggle) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* 04. Comments Tick Box */}
                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCommentsText}
                    onChange={(e) => setShowCommentsText(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-800 dark:text-zinc-200 block">
                      Comment අන් අයට පෙන්වන්නද?
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                      {showCommentsText ? 'අන් අයට අදහස් දැක්වීමට සහ කියවීමට හැක.' : 'අදහස් දැක්වීම අක්‍රීය කෙරේ.'}
                    </span>
                  </div>
                </label>

                {/* 05. Profile / Anonymous Tick Box */}
                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProfileText}
                    onChange={(e) => setShowProfileText(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-800 dark:text-zinc-200 block">
                      Profile එක පෙන්වන්නද?
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                      {showProfileText 
                        ? 'ඔබගේ නම සහ Profile පින්තූරය පෙන්වයි.' 
                        : `අප්‍රකටව (${generatedAnonymousId}) ලෙස පළවේ.`}
                    </span>
                  </div>
                </label>
              </div>

              {!showProfileText && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>අප්‍රකට දැන්වීමකි:</strong> පරිශීලකයින්ට <strong>{generatedAnonymousId}</strong> ලෙස පෙනෙන අතර, වංචනික ක්‍රියා වැළැක්වීම සඳහා Admin ට සැබෑ අයිතිකරු සෙවිය හැක.
                  </span>
                </div>
              )}

              {/* 06. Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-98 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Text Post එක පළ කරන්න (Submit)</span>
                </button>
              </div>
            </form>
          ) : postMode === 'picture_post' ? (
            /* ==============================================================
               📸 METHOD 3: 16:9 PICTURE POST FORM
               ============================================================== */
            <form onSubmit={handlePicturePostSubmit} className="space-y-4 animate-fadeIn">
              
              {/* 01. Head Line Box */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>හෙඩ්ලයින් එක (Headline / Title):</span>
                </label>
                <input
                  type="text"
                  required
                  value={pictureHeadline}
                  onChange={(e) => setPictureHeadline(e.target.value)}
                  placeholder="උදා: අලෙවි කිරීමට ඇති නව උපකරණ තොගය..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#06160d] border border-slate-300 dark:border-emerald-800/80 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* 02. Upload Image (Strict 16:9 Ratio Container) */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">2</span>
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>16:9 ඡායාරූපය උඩුගත කරන්න (Upload 16:9 Image):</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    Ratio 16:9 පමණි
                  </span>
                </div>

                <input
                  ref={picturePostImageRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePicturePostImageChange}
                />

                {/* 16:9 Preview Frame */}
                {pictureImageBase64 ? (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md group">
                    <img
                      src={pictureImageBase64}
                      alt="16:9 Uploaded Post"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => picturePostImageRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>වෙනස් කරන්න</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPictureImageBase64('')}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ඉවත් කරන්න</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => picturePostImageRef.current?.click()}
                    className="w-full aspect-video rounded-2xl border-2 border-dashed border-emerald-400 dark:border-emerald-700 bg-white dark:bg-[#06160d] hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all flex flex-col items-center justify-center p-4 text-center cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-white">
                      16:9 ඡායාරූපය මෙතැනින් තෝරන්න
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      කැමරාවෙන් හෝ ගොනු අතරින් ඡායාරූපය ලබාගන්න (16:9 Screen Fit)
                    </span>
                  </button>
                )}
              </div>

              {/* Checkboxes: Comments & Profile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCommentsPic}
                    onChange={(e) => setShowCommentsPic(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-800 dark:text-zinc-200 block">
                      Comment අන් අයට පෙන්වන්නද?
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                      {showCommentsPic ? 'අන් අයට අදහස් දැක්වීමට හැක.' : 'අදහස් දැක්වීම අක්‍රීයයි.'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProfilePic}
                    onChange={(e) => setShowProfilePic(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-800 dark:text-zinc-200 block">
                      Profile එක පෙන්වන්නද?
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                      {showProfilePic 
                        ? 'ඔබගේ Profile එක පෙන්වයි.' 
                        : `අප්‍රකටව (${generatedAnonymousId}) ලෙස පළවේ.`}
                    </span>
                  </div>
                </label>
              </div>

              {/* 03. Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!pictureImageBase64}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-98 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Picture Post එක පළ කරන්න (Submit)</span>
                </button>
              </div>
            </form>
          ) : (
            /* ==============================================================
               📄 METHOD 1: STANDARD QUESTIONNAIRE FORM
               ============================================================== */
            <form onSubmit={handleStandardFormSubmit} className="space-y-4 animate-fadeIn">
              
              {/* AI Voice Inline Bar */}
              <AiVoiceInlineBar
                currentLocation={currentLocation}
                lang={activeLang}
                titlePrompt="🎙️ AI හඬ සහය (Voice Input):"
                onVoiceCaptured={(data) => {
                  setVoiceData(data);
                  if (data.parsedFields?.whatHappened) {
                    setWhatHappened(data.parsedFields.whatHappened);
                  } else if (data.transcript) {
                    setWhatHappened(data.transcript);
                  }
                  if (data.parsedFields?.whatIsNeeded) setWhatIsNeeded(data.parsedFields.whatIsNeeded);
                }}
              />

              {/* What Happened */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800 dark:text-emerald-300">
                  සිදුවී ඇති දේ (විස්තරය):
                </label>
                <textarea
                  required
                  rows={3}
                  value={whatHappened}
                  onChange={(e) => setWhatHappened(e.target.value)}
                  placeholder="සිදුවී ඇති ගැටලුව හෝ සේවාවේ අවශ්‍යතාවය විස්තර කරන්න..."
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#06160d] border border-slate-300 dark:border-emerald-800/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* What is Needed */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800 dark:text-emerald-300">
                  වියයුතු දේ (බලාපොරොත්තු වන සහය):
                </label>
                <input
                  type="text"
                  value={whatIsNeeded}
                  onChange={(e) => setWhatIsNeeded(e.target.value)}
                  placeholder="උදා: අලුත්වැඩියාවක්, ප්‍රවාහන සහයක් හෝ වෙනත්..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#06160d] border border-slate-300 dark:border-emerald-800/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Conditions & Payment Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-800 dark:text-emerald-300">
                    ගෙවීම් (Payment / Fee):
                  </label>
                  <input
                    type="text"
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                    placeholder="උදා: රු. 2,000 හෝ නොමිලේ"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#06160d] border border-slate-300 dark:border-emerald-800/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-800 dark:text-emerald-300">
                    ගමනාගමනය (Transport):
                  </label>
                  <input
                    type="text"
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    placeholder="උදා: පැමිණිය යුතුය හෝ යවනු ලැබේ"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#06160d] border border-slate-300 dark:border-emerald-800/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Tag Selector */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800 dark:text-emerald-300">
                  වර්ගීකරණ ටැගය (Category Tag):
                </label>
                <TagSelector
                  tags={allTags}
                  selectedTag={selectedTag}
                  onSelectTag={(t) => setSelectedTag(t)}
                  language={activeLang}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-98 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>දැන්වීම පළ කරන්න (Submit)</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};

