import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  HelpCircle, 
  FileText, 
  Car, 
  Banknote, 
  Users, 
  MessageSquare, 
  ArrowRight,
  ShieldCheck,
  Check,
  Plus,
  Minus,
  AlertTriangle,
  Type,
  Camera,
  Upload,
  Trash2,
  Send,
  Sparkles
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User, CategoryItem, TagItem } from '../types';
import { translations } from '../data/translations';
import { TagSelector } from './TagSelector';
import { getStoredTags } from '../utils/tagUtils';
import { AiVoiceInlineBar } from './AiVoiceInlineBar';
import { broadcastPushNotification } from '../utils/fcmNotificationService';
import { generateStartPin, calculatePlatformFee } from '../utils/serviceWorkflowManager';
import { SUPPORTED_POST_FONTS, injectPostFonts, getFontFamilyById } from '../utils/postFontManager';

interface QuickServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPost: (post: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>) => void;
  currentLocation: LocationOption;
  availableLocations: LocationOption[];
  currentUser: User;
  categories?: CategoryItem[];
  lang?: Language;
  editPost?: HelpPost | null;
  onUpdatePost?: (post: HelpPost) => void;
}

export const QuickServiceModal: React.FC<QuickServiceModalProps> = ({
  isOpen,
  onClose,
  onSubmitPost,
  currentLocation,
  availableLocations,
  currentUser,
  categories = [],
  lang = 'si',
  editPost,
  onUpdatePost,
}) => {
  const t = translations[lang] || translations.si;

  // 🔀 3-Way Method Mode State:
  // 'standard' = ප්‍රශ්න වලට තොරතුරු සපයන සාමාන්‍ය ක්‍රමය
  // 'text_post' = Facebook-style Text Post
  // 'picture_post' = 16:9 Picture Post
  const [postMode, setPostMode] = useState<'standard' | 'text_post' | 'picture_post'>('standard');

  // Selected Tag
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);

  // Form Fields State (Standard)
  const [whatHappened, setWhatHappened] = useState('');
  const [whatIsNeeded, setWhatIsNeeded] = useState('');
  const [conditions, setConditions] = useState('');
  const [specialNotice, setSpecialNotice] = useState('');
  
  // 5 Transport Modes
  const transportOptions = [
    'ඔබ පැමිණිය යුතුයි.',
    'මා එවන්නම්',
    'මා ගෙනවිත් දෙන්නම්.',
    'ඔබ එවන්න :Free delivery',
    'ඔබ එවන්න :ප්‍රවාහන ගාස්තු ගෙවන්නම්'
  ];
  const [transport, setTransport] = useState<string>('ඔබ පැමිණිය යුතුයි.');
  const [customTransportFee, setCustomTransportFee] = useState<string>('');

  // Payment State (No hardcoded 1500)
  const [paymentType, setPaymentType] = useState<'agree' | 'custom'>('agree');
  const [customPaymentAmount, setCustomPaymentAmount] = useState('');
  const [helpersNeeded, setHelpersNeeded] = useState<number>(1);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [voiceData, setVoiceData] = useState<any>(null);

  // 📝 2nd Method: Text Post State
  const [textHeadline, setTextHeadline] = useState('');
  const [selectedFont, setSelectedFont] = useState('noto-sans-sinhala');
  const [textDescription, setTextDescription] = useState('');
  const [showCommentsText, setShowCommentsText] = useState(true);
  const [showProfileText, setShowProfileText] = useState(true);

  // 📸 3rd Method: Picture Post State
  const [pictureHeadline, setPictureHeadline] = useState('');
  const [pictureImageBase64, setPictureImageBase64] = useState('');
  const [showCommentsPic, setShowCommentsPic] = useState(true);
  const [showProfilePic, setShowProfilePic] = useState(true);
  const picturePostImageRef = useRef<HTMLInputElement | null>(null);

  // Shared Anonymous ID for privacy
  const [generatedAnonymousId, setGeneratedAnonymousId] = useState('');

  // Validation Error States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const userWhatsAppNumber = currentUser?.whatsappNumber || currentUser?.phone || '';

  useEffect(() => {
    injectPostFonts();
  }, []);

  useEffect(() => {
    if (currentUser && !whatsappNumber) {
      setWhatsappNumber(userWhatsAppNumber);
    }
  }, [currentUser, userWhatsAppNumber]);

  useEffect(() => {
    if (editPost && isOpen) {
      setWhatHappened(editPost.whatHappened || '');
      setWhatIsNeeded(editPost.whatIsNeeded || '');
      setConditions(editPost.conditions || '');
      setSpecialNotice(editPost.specialNotice || '');
      setTransport(editPost.transport || 'ඔබ පැමිණිය යුතුයි.');
      setCustomTransportFee(editPost.customTransportFee ? String(editPost.customTransportFee) : '');
      setWhatsappNumber(editPost.userPhone || userWhatsAppNumber);
      
      if (editPost.payment && (editPost.payment.includes('රු.') || editPost.payment.includes('ගෙවිය හැක'))) {
        setPaymentType('custom');
        const extractedNum = editPost.payment.replace(/\D/g, '');
        if (extractedNum) setCustomPaymentAmount(extractedNum);
      } else {
        setPaymentType('agree');
      }

      setHelpersNeeded(editPost.helpersNeeded || editPost.helpersCount || 1);

      if (editPost.tagId) {
        const allTags = getStoredTags();
        const found = allTags.find(t => t.id === editPost.tagId);
        if (found) setSelectedTag(found);
      }

      if ((editPost as any).postType === 'text_post') {
        setPostMode('text_post');
        setTextHeadline(editPost.headline || editPost.title || '');
        setTextDescription(editPost.whatHappened || '');
        setSelectedFont((editPost as any).selectedFont || 'noto-sans-sinhala');
      } else if ((editPost as any).postType === 'picture_post') {
        setPostMode('picture_post');
        setPictureHeadline(editPost.headline || editPost.title || '');
        setPictureImageBase64(editPost.imageUrl || '');
      } else {
        setPostMode('standard');
      }
    } else if (!editPost && isOpen) {
      setPostMode('standard');
      setWhatHappened('');
      setWhatIsNeeded('');
      setConditions('');
      setSpecialNotice('');
      setTransport('ඔබ පැමිණිය යුතුයි.');
      setCustomTransportFee('');
      setPaymentType('agree');
      setCustomPaymentAmount('');
      setHelpersNeeded(1);
      setWhatsappNumber(userWhatsAppNumber);
      setSelectedTag(null);
      setVoiceData(null);
      setErrors({});
      setHasAttemptedSubmit(false);
      setIsSuccess(false);

      // Text and Picture defaults
      const randCode = Math.floor(1000 + Math.random() * 9000);
      setGeneratedAnonymousId(`Anonymous #${randCode}`);
      setTextHeadline('');
      setTextDescription('');
      setSelectedFont('noto-sans-sinhala');
      setShowCommentsText(true);
      setShowProfileText(true);
      setPictureHeadline('');
      setPictureImageBase64('');
      setShowCommentsPic(true);
      setShowProfilePic(true);
    }
  }, [editPost, isOpen, userWhatsAppNumber]);

  if (!isOpen) return null;

  // 16:9 Image Change Handler
  const handlePicturePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      if (event.target?.result) {
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
    const authorDisplayName = isAnon ? generatedAnonymousId : (currentUser?.name || 'සහය ඉල්ලුම්කරු');
    const authorDisplayPhoto = isAnon ? '' : (currentUser?.photoUrl || '');
    const resolvedLocation = voiceData?.location || (currentLocation?.nameSi ? `${currentLocation.nameSi} (${currentLocation.nameEn || ''})` : 'කෝවින්න, කටුනායක');

    onSubmitPost({
      userName: authorDisplayName,
      userPhotoUrl: authorDisplayPhoto,
      userPhone: whatsappNumber.trim() || userWhatsAppNumber,
      userId: currentUser?.userId || currentUser?.id || '',
      postType: 'text_post',
      headline: textHeadline.trim(),
      title: textHeadline.trim(),
      selectedFont: selectedFont,
      whatHappened: textDescription.trim(),
      whatIsNeeded: textHeadline.trim(),
      conditions: 'විශේෂ කොන්දේසි නොමැත.',
      transport: 'අදාළ නොවේ',
      payment: 'නොමිලේ / සාකච්ඡා කළ හැක',
      locationName: resolvedLocation,
      distanceKm: 0.5,
      lat: currentLocation?.lat || 7.1712,
      lng: currentLocation?.lng || 79.8978,
      verifiedOtp: true,
      category: 'quick_services',
      tagName: selectedTag?.tagName,
      tagCategory: selectedTag?.category,
      tagId: selectedTag?.id,
      showComments: showCommentsText,
      isAnonymous: isAnon,
      anonymousId: isAnon ? generatedAnonymousId : undefined,
      // 🛡️ Secure Admin Audit Trail
      actualAuthorId: currentUser?.id || currentUser?.userId || 'unknown',
      actualAuthorName: currentUser?.name || 'Anonymous User',
      actualAuthorNic: currentUser?.nicNumber || currentUser?.nic || currentUser?.userId || 'N/A',
      actualAuthorPhone: currentUser?.whatsappPhone || currentUser?.phone || userWhatsAppNumber || 'N/A',
      likeCount: 0,
      unlikeCount: 0,
      unlikesCount: 0,
      savesCount: 0,
      commentsCount: 0,
      commentsList: [],
    } as any);

    broadcastPushNotification({
      category: 'quick_service',
      title: '📝 නව Text පෝස්ට් එකක්!',
      message: `${textHeadline.trim().slice(0, 45)}... • 📍 ${resolvedLocation}`,
      locationName: resolvedLocation,
      lat: currentLocation?.lat,
      lng: currentLocation?.lng,
      targetModal: 'quick_service',
    });

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
    const authorDisplayName = isAnon ? generatedAnonymousId : (currentUser?.name || 'සහය ඉල්ලුම්කරු');
    const authorDisplayPhoto = isAnon ? '' : (currentUser?.photoUrl || '');
    const resolvedLocation = voiceData?.location || (currentLocation?.nameSi ? `${currentLocation.nameSi} (${currentLocation.nameEn || ''})` : 'කෝවින්න, කටුනායක');

    onSubmitPost({
      userName: authorDisplayName,
      userPhotoUrl: authorDisplayPhoto,
      userPhone: whatsappNumber.trim() || userWhatsAppNumber,
      userId: currentUser?.userId || currentUser?.id || '',
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
      locationName: resolvedLocation,
      distanceKm: 0.5,
      lat: currentLocation?.lat || 7.1712,
      lng: currentLocation?.lng || 79.8978,
      verifiedOtp: true,
      category: 'quick_services',
      tagName: selectedTag?.tagName,
      tagCategory: selectedTag?.category,
      tagId: selectedTag?.id,
      showComments: showCommentsPic,
      isAnonymous: isAnon,
      anonymousId: isAnon ? generatedAnonymousId : undefined,
      // 🛡️ Secure Admin Audit Trail
      actualAuthorId: currentUser?.id || currentUser?.userId || 'unknown',
      actualAuthorName: currentUser?.name || 'Anonymous User',
      actualAuthorNic: currentUser?.nicNumber || currentUser?.nic || currentUser?.userId || 'N/A',
      actualAuthorPhone: currentUser?.whatsappPhone || currentUser?.phone || userWhatsAppNumber || 'N/A',
      likeCount: 0,
      unlikeCount: 0,
      unlikesCount: 0,
      savesCount: 0,
      commentsCount: 0,
      commentsList: [],
    } as any);

    broadcastPushNotification({
      category: 'quick_service',
      title: '📸 නව Picture පෝස්ට් එකක්!',
      message: `${pictureHeadline.trim().slice(0, 45)}... • 📍 ${resolvedLocation}`,
      locationName: resolvedLocation,
      lat: currentLocation?.lat,
      lng: currentLocation?.lng,
      targetModal: 'quick_service',
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  // -------------------------------------------------------------
  // 🚀 SUBMIT METHOD 1: STANDARD QUESTIONNAIRE
  // -------------------------------------------------------------
  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!whatHappened.trim()) {
      newErrors.whatHappened = 'කරුණාකර සිදුවී ඇති දේ කෙටියෙන් සටහන් කරන්න.';
    }

    if (!whatIsNeeded.trim()) {
      newErrors.whatIsNeeded = 'කරුණාකර වියයුතු දේ සටහන් කරන්න.';
    }

    const phoneToTest = whatsappNumber.trim() || userWhatsAppNumber;
    if (!phoneToTest) {
      newErrors.whatsappNumber = 'කරුණාකර සම්බන්ධ කරගත හැකි WhatsApp දුරකථන අංකයක් ඇතුළත් කරන්න.';
    } else {
      const cleanPhone = phoneToTest.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 12) {
        newErrors.whatsappNumber = 'වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 0771234567).';
      }
    }

    if (paymentType === 'custom' && (!customPaymentAmount || Number(customPaymentAmount) <= 0)) {
      newErrors.payment = 'කරුණාකර ඔබ ගෙවීමට බලාපොරොත්තු වන මුදල ඇතුළත් කරන්න.';
    }

    if (transport === 'ඔබ එවන්න :ප්‍රවාහන ගාස්තු ගෙවන්නම්' && (!customTransportFee || Number(customTransportFee) <= 0)) {
      newErrors.transportFee = 'කරුණාකර ප්‍රවාහනය සඳහා ගෙවන මුදල ඇතුළත් කරන්න.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    if (!validate()) {
      return;
    }

    const paymentText = paymentType === 'agree' ? 'සාකච්ඡා කර තීරණය කරමු' : `රු. ${customPaymentAmount} ගෙවිය හැක`;

    if (editPost && onUpdatePost) {
      const updatedPost: HelpPost = {
        ...editPost,
        whatHappened: whatHappened.trim(),
        whatIsNeeded: whatIsNeeded.trim(),
        conditions: conditions.trim() || 'විශේෂ කොන්දේසි නොමැත.',
        specialNotice: specialNotice.trim(),
        transport: transport,
        customTransportFee: transport === 'ඔබ එවන්න :ප්‍රවාහන ගාස්තු ගෙවන්නම්' ? (Number(customTransportFee) || 0) : 0,
        payment: paymentText,
        helpersNeeded: helpersNeeded,
        userPhone: whatsappNumber.trim() || userWhatsAppNumber,
        tagName: selectedTag?.tagName || editPost.tagName,
        tagCategory: selectedTag?.category || editPost.tagCategory,
        tagId: selectedTag?.id || editPost.tagId,
      };

      onUpdatePost(updatedPost);
      setHasAttemptedSubmit(false);
      setErrors({});
      onClose();
      return;
    }

    const resolvedLocation = voiceData?.location || (currentLocation?.nameSi ? `${currentLocation.nameSi} (${currentLocation.nameEn || ''})` : 'කෝවින්න, කටුනායක');
    const autoPlatformFee = calculatePlatformFee(paymentText);
    const newStartPin = generateStartPin();
    const finalTransportFee = transport === 'ඔබ එවන්න :ප්‍රවාහන ගාස්තු ගෙවන්නම්' ? (Number(customTransportFee) || 0) : 0;

    onSubmitPost({
      userName: currentUser?.name || 'පරිශීලක',
      userPhone: whatsappNumber.trim() || userWhatsAppNumber,
      userId: currentUser?.userId || currentUser?.id || '',
      whatHappened: whatHappened.trim(),
      whatIsNeeded: whatIsNeeded.trim(),
      conditions: conditions.trim() || 'විශේෂ කොන්දේසි නොමැත.',
      specialNotice: specialNotice.trim(),
      transport: transport,
      customTransportFee: finalTransportFee,
      payment: paymentText,
      helpersNeeded: helpersNeeded,
      helpersAccepted: 0,
      feeAgreed: true,
      startPin: newStartPin,
      completionPin: newStartPin,
      platformFee: autoPlatformFee,
      travelFeePerKm: 100,
      serviceStage: 'open',
      applicants: [],
      selectedHelpers: [],
      locationName: resolvedLocation,
      distanceKm: 0.8,
      lat: voiceData?.coords?.lat || currentLocation?.lat || 7.1712,
      lng: voiceData?.coords?.lng || currentLocation?.lng || 79.8978,
      verifiedOtp: true,
      category: 'quick_services',
      tagName: selectedTag?.tagName,
      tagCategory: selectedTag?.category,
      tagId: selectedTag?.id,
      audioUrl: (voiceData as any)?.audioUrl,
      audioDurationSec: (voiceData as any)?.durationSec,
      voiceSentDate: (voiceData as any)?.date,
      voiceSentTime: (voiceData as any)?.time,
      voiceSentLocation: (voiceData as any)?.location,
      voiceCoordinates: (voiceData as any)?.coords,
      isVoicePost: Boolean((voiceData as any)?.audioUrl),
      voiceTranscript: (voiceData as any)?.transcript,
    });

    broadcastPushNotification({
      category: 'quick_service',
      title: '⚡ නව සේවා දැන්වීමක්!',
      message: `${whatHappened.trim().slice(0, 45)}... • 📍 ${resolvedLocation}`,
      locationName: resolvedLocation,
      lat: currentLocation?.lat,
      lng: currentLocation?.lng,
      targetModal: 'quick_service',
    });

    setHasAttemptedSubmit(false);
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-[#06180f] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] border-2 border-emerald-500/40 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 p-4 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-1.5">
                <span>{editPost ? 'සේවා දැන්වීම සංස්කරණය' : 'සේවා ඉල්ලීමක් පළකරන්න'}</span>
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium">
                අවට සිටින සහායකයින් සමඟ සම්බන්ධ වී සේවාවන් ලබාගන්න
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold transition-all cursor-pointer"
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
              <span className="truncate">2. Text පෝස්ට්</span>
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
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">3. Picture පෝස්ට්</span>
            </button>
          </div>
        </div>

        {isSuccess ? (
          <div className="py-12 text-center flex flex-col items-center justify-center space-y-3 animate-fadeIn flex-1">
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
          <form onSubmit={handleTextPostSubmit} className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-4 text-left text-sm animate-fadeIn">
            {/* Tag Selector for Text Post */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>අදාළ Tag එක තෝරන්න (විකල්ප):</span>
              </label>
              <TagSelector
                selectedTag={selectedTag}
                onSelectTag={(t) => setSelectedTag(t)}
                activeCategory={categories.find(c => c.id === 'quick_services') || null}
              />
            </div>

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

            {/* 02. Font Selection Box */}
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

            {/* 04 & 05. Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
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
          <form onSubmit={handlePicturePostSubmit} className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-4 text-left text-sm animate-fadeIn">
            {/* Tag Selector for Picture Post */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>අදාළ Tag එක තෝරන්න (විකල්ප):</span>
              </label>
              <TagSelector
                selectedTag={selectedTag}
                onSelectTag={(t) => setSelectedTag(t)}
                activeCategory={categories.find(c => c.id === 'quick_services') || null}
              />
            </div>

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
                      ? 'ඔබගේ නම සහ Profile පින්තූරය පෙන්වයි.' 
                      : `අප්‍රකටව (${generatedAnonymousId}) ලෙස පළවේ.`}
                  </span>
                </div>
              </label>
            </div>

            {!showProfilePic && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>අප්‍රකට දැන්වීමකි:</strong> පරිශීලකයින්ට <strong>{generatedAnonymousId}</strong> ලෙස පෙනෙන අතර, වංචනික ක්‍රියා වැළැක්වීම සඳහා Admin ට සැබෑ අයිතිකරු සෙවිය හැක.
                </span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-98 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Picture Post එක පළ කරන්න (Submit)</span>
              </button>
            </div>
          </form>
        ) : (
          /* ==============================================================
             📋 METHOD 1: STANDARD QUESTIONNAIRE FORM
             ============================================================== */
          <>
            {/* AI Voice Inline Bar */}
            <div className="p-3 bg-emerald-50/70 dark:bg-[#092216] border-b border-emerald-200/80 dark:border-emerald-900/60 shrink-0">
              <AiVoiceInlineBar
                onVoiceDataReceived={(data) => {
                  setVoiceData(data);
                  if (data.transcript) {
                    setWhatHappened(data.transcript);
                  }
                  if (data.parsedFields?.whatHappened) {
                    setWhatHappened(data.parsedFields.whatHappened);
                  }
                  if (data.parsedFields?.whatIsNeeded) {
                    setWhatIsNeeded(data.parsedFields.whatIsNeeded);
                  }
                  if (data.parsedFields?.transport) {
                    setTransport(data.parsedFields.transport);
                  }
                  if (data.parsedFields?.payment && data.parsedFields.payment.includes('රු.')) {
                    setPaymentType('custom');
                    setCustomPaymentAmount(data.parsedFields.payment.replace(/\D/g, ''));
                  }
                }}
                currentLocation={currentLocation}
              />
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5 text-left text-sm animate-fadeIn">
              
              {/* Tag Selector */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>අදාළ Tag එක තෝරන්න (විකල්ප):</span>
                </label>
                <TagSelector
                  selectedTag={selectedTag}
                  onSelectTag={(t) => setSelectedTag(t)}
                  activeCategory={categories.find(c => c.id === 'quick_services') || null}
                />
              </div>

              {/* 1. What Happened */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>සිදුවී ඇති දේ (What Happened) <span className="text-rose-500">*</span>:</span>
                </label>
                <textarea
                  rows={2}
                  value={whatHappened}
                  onChange={(e) => setWhatHappened(e.target.value)}
                  placeholder="උදා: මෝටර් සයිකලයේ ටයර් එක පැන්චර් වී ඇත / වතුර බටයක් කැඩී වතුර කාන්දු වේ..."
                  className={`w-full p-3 bg-slate-50 dark:bg-[#041209] border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs sm:text-sm ${errors.whatHappened ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200 dark:border-[#143823]'}`}
                />
                {errors.whatHappened && (
                  <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.whatHappened}</span>
                  </p>
                )}
              </div>

              {/* 2. What is Needed */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>වියයුතු දේ (What is Needed) <span className="text-rose-500">*</span>:</span>
                </label>
                <textarea
                  rows={2}
                  value={whatIsNeeded}
                  onChange={(e) => setWhatIsNeeded(e.target.value)}
                  placeholder="උදා: පැන්චරය දමා දීමට කාර්මිකයෙකු අවශ්‍යයි / ජලනල කාර්මිකයෙකු අවශ්‍යයි..."
                  className={`w-full p-3 bg-slate-50 dark:bg-[#041209] border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs sm:text-sm ${errors.whatIsNeeded ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200 dark:border-[#143823]'}`}
                />
                {errors.whatIsNeeded && (
                  <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.whatIsNeeded}</span>
                  </p>
                )}
              </div>

              {/* 3. Transport Options */}
              <div className="space-y-2">
                <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Car className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ගමනාගමනය සිදුවන්නේ කෙසේද? (පහතින් එකක් තෝරන්න):</span>
                </label>
                <div className="space-y-2">
                  {transportOptions.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                        transport === opt 
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 font-bold text-emerald-900 dark:text-emerald-200' 
                          : 'border-slate-200 dark:border-[#143823] hover:bg-slate-50 dark:hover:bg-[#081e13]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="transport"
                        value={opt}
                        checked={transport === opt}
                        onChange={(e) => setTransport(e.target.value)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs sm:text-sm">{opt}</span>
                    </label>
                  ))}
                </div>

                {transport === 'ඔබ එවන්න :ප්‍රවාහන ගාස්තු ගෙවන්නම්' && (
                  <div className="mt-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-300 dark:border-emerald-800/60 space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ප්‍රවාහනය සඳහා ඔබ ගෙවන උපරිම මුදල (රු.):
                    </label>
                    <input
                      type="number"
                      value={customTransportFee}
                      onChange={(e) => setCustomTransportFee(e.target.value)}
                      placeholder="උදා: 350"
                      className="w-full p-2.5 bg-white dark:bg-[#06180f] border border-slate-300 dark:border-[#143823] rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                    />
                    {errors.transportFee && (
                      <p className="text-[11px] text-rose-500 font-bold">{errors.transportFee}</p>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Payment Agreement / Custom Fee */}
              <div className="space-y-2">
                <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>සේවා ගාස්තුව (ගෙවීම් ක්‍රමය):</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('agree')}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      paymentType === 'agree'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-[#143823] hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="text-xs sm:text-sm font-bold block">සාකච්ඡා කර තීරණය කරමු</span>
                      <span className="text-[10px] text-slate-500">කතාබස් කර එකඟ වන මුදල</span>
                    </div>
                    {paymentType === 'agree' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('custom')}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      paymentType === 'custom'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-[#143823] hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="text-xs sm:text-sm font-bold block">නිශ්චිත මුදලක් ගෙවිය හැක</span>
                      <span className="text-[10px] text-slate-500">ඔබ ගෙවන මුදල සටහන් කරන්න</span>
                    </div>
                    {paymentType === 'custom' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                </div>

                {paymentType === 'custom' && (
                  <div className="mt-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-300 dark:border-emerald-800/60 space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ඔබ සේවාව වෙනුවෙන් ගෙවීමට බලාපොරොත්තු වන මුදල (රු.):
                    </label>
                    <input
                      type="number"
                      value={customPaymentAmount}
                      onChange={(e) => setCustomPaymentAmount(e.target.value)}
                      placeholder="උදා: 2500"
                      className="w-full p-2.5 bg-white dark:bg-[#06180f] border border-slate-300 dark:border-[#143823] rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                    />
                    {errors.payment && (
                      <p className="text-[11px] text-rose-500 font-bold">{errors.payment}</p>
                    )}
                  </div>
                )}
              </div>

              {/* 5. Helpers Needed Counter */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>අවශ්‍ය සහායකයින් ගණන (Helpers Needed):</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setHelpersNeeded(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-lg"
                  >
                    -
                  </button>
                  <span className="text-base font-black px-4">{helpersNeeded}</span>
                  <button
                    type="button"
                    onClick={() => setHelpersNeeded(prev => Math.min(10, prev + 1))}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 6. Contact WhatsApp Number */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>සම්බන්ධ කරගත හැකි WhatsApp දුරකථන අංකය <span className="text-rose-500">*</span>:</span>
                </label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className={`w-full p-3 bg-slate-50 dark:bg-[#041209] border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs sm:text-sm font-bold ${errors.whatsappNumber ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200 dark:border-[#143823]'}`}
                />
                {errors.whatsappNumber && (
                  <p className="text-[11px] text-rose-500 font-bold">{errors.whatsappNumber}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <Check className="w-5 h-5" />
                  <span>{editPost ? 'දැන්වීම යාවත්කාලීන කරන්න' : 'සේවා ඉල්ලීම පළකරන්න (Submit)'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default QuickServiceModal;

