import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User, CategoryItem, TagItem } from '../types';
import { translations } from '../data/translations';
import { TagSelector } from './TagSelector';
import { getStoredTags } from '../utils/tagUtils';
import { AiVoiceInlineBar } from './AiVoiceInlineBar';

interface QuickServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPost: (post: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>) => void;
  currentLocation: LocationOption;
  currentUser: User;
  lang: Language;
  categoryTitle?: string;
  selectedCategoryObj?: CategoryItem | null;
  editPost?: HelpPost | null;
  onUpdatePost?: (updatedPost: HelpPost) => void;
}

export const QuickServiceModal: React.FC<QuickServiceModalProps> = ({
  isOpen,
  onClose,
  onSubmitPost,
  currentLocation,
  currentUser,
  lang,
  categoryTitle,
  selectedCategoryObj,
  editPost,
  onUpdatePost,
}) => {
  const t = translations[lang];

  // 1. ගැටලුව කුමක්ද? *
  const [whatHappened, setWhatHappened] = useState('');
  
  // 2. ඔබ බලාපොරොත්තු වන්නේ කුමක්ද? *
  const [whatIsNeeded, setWhatIsNeeded] = useState('');
  
  // 3. විශේෂ දැනුවත් කිරිමක් ඇත්නම් ඇතුලත් කරන්න.
  const [specialNotice, setSpecialNotice] = useState('');
  
  // 4. කොන්දේසි ඇත්නම් පවසන්න. (Conditions)
  const [conditions, setConditions] = useState('');
  
  // 5. ගමනාගමනය සිදුවන්නේ කෙසෙද? (පහල අවස්ථාවලින් එකක් තෙරිමට අවසර දෙන්න.)
  const transportOptions = [
    'ඔබ පැමිණිය යුතුයි',
    'මා පැමිණෙන්නම්',
    'ඔබ එවන්න',
    'මම ගෙනැවිත්දෙන්නම්',
    'මම එවන්නම්'
  ];
  const [transport, setTransport] = useState<string>('ඔබ පැමිණිය යුතුයි');

  // 6. ගෙවීම් ක්‍රමය (Payment Method)
  const [paymentType, setPaymentType] = useState<'agree' | 'custom'>('agree');
  const [customPaymentAmount, setCustomPaymentAmount] = useState('');

  // 7. උදව් අවශ්‍ය පුද්ගලයන් සංඛ්‍යාව (- ___ +)
  const [helpersNeeded, setHelpersNeeded] = useState<number>(1);

  // Verification 02: ඇප් ගාස්තු ලෙස රු. 50 ක් අයවේ. ගාස්තුව අය කරගන්නද? -> 'හරි'
  const [isFeeConfirmed, setIsFeeConfirmed] = useState<boolean>(false);

  // Verification 03: ඔබ ලබා දී ඇති මෙම වට්සැප් අංකය වැඩද? -> 'ඔව්'
  const userWhatsAppNumber = currentUser?.whatsappNumber || currentUser?.phone || '';
  const [whatsappNumber, setWhatsappNumber] = useState<string>(userWhatsAppNumber);
  const [isWhatsAppConfirmed, setIsWhatsAppConfirmed] = useState<boolean>(false);

  // Tags State
  const [allTags, setAllTags] = useState<TagItem[]>(() => getStoredTags());
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);

  // 🎙️ Voice Data state
  const [voiceData, setVoiceData] = useState<{
    audioUrl?: string;
    durationSec?: number;
    transcript?: string;
    date?: string;
    time?: string;
    location?: string;
    coords?: { lat: number; lng: number };
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const tags = getStoredTags();
      setAllTags(tags);

      if (editPost) {
        setWhatHappened(editPost.whatHappened || '');
        setWhatIsNeeded(editPost.whatIsNeeded || '');
        setSpecialNotice(editPost.specialNotice || '');
        setConditions(editPost.conditions || '');
        setTransport(editPost.transport || 'ඔබ පැමිණිය යුතුයි');

        if (editPost.payment && (editPost.payment.includes('රු.') || editPost.payment.includes('ගෙවිය හැක'))) {
          setPaymentType('custom');
          const extractedNum = editPost.payment.replace(/\D/g, '');
          setCustomPaymentAmount(extractedNum || '');
        } else {
          setPaymentType('agree');
          setCustomPaymentAmount('');
        }

        setHelpersNeeded(editPost.helpersNeeded || editPost.helpersCount || 1);
        setWhatsappNumber(editPost.userPhone || currentUser?.whatsappNumber || currentUser?.phone || '');
        setIsFeeConfirmed(true);
        setIsWhatsAppConfirmed(true);

        if (editPost.tagName) {
          const found = tags.find(t => t.tagName === editPost.tagName) || {
            id: editPost.tagId || 'tag_curr',
            tagName: editPost.tagName,
            category: editPost.tagCategory || '',
          };
          setSelectedTag(found);
        } else {
          setSelectedTag(null);
        }
      } else {
        // Clear all fields completely for new posts
        setWhatHappened('');
        setWhatIsNeeded('');
        setSpecialNotice('');
        setConditions('');
        setTransport('ඔබ පැමිණිය යුතුයි');
        setPaymentType('agree');
        setCustomPaymentAmount('');
        setHelpersNeeded(1);
        setWhatsappNumber(currentUser?.whatsappNumber || currentUser?.phone || '');
        setIsFeeConfirmed(false);
        setIsWhatsAppConfirmed(false);
        setSelectedTag(null);
        setErrors({});
        setHasAttemptedSubmit(false);
      }
    }
  }, [isOpen, editPost, currentUser]);

  // Validation errors map
  const [errors, setErrors] = useState<{
    whatHappened?: string;
    whatIsNeeded?: string;
    selectedTag?: string;
    customPayment?: string;
    feeConfirm?: string;
    whatsappConfirm?: string;
  }>({});

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: {
      whatHappened?: string;
      whatIsNeeded?: string;
      selectedTag?: string;
      customPayment?: string;
      feeConfirm?: string;
      whatsappConfirm?: string;
    } = {};

    // 01. අනිවාර්ය කරුණු ඇතුලත් කිරීම
    if (!whatHappened.trim()) {
      newErrors.whatHappened = '1. කරුණාකර ගැටලුව කුමක්දැයි ඇතුළත් කරන්න. (අනිවාර්යයි *)';
    }
    if (!whatIsNeeded.trim()) {
      newErrors.whatIsNeeded = '2. කරුණාකර ඔබ බලාපොරොත්තු වන දෙය ඇතුළත් කරන්න. (අනිවාර්යයි *)';
    }
    if (!selectedTag) {
      newErrors.selectedTag = 'කරුණාකර දැන්වීම පහසුවෙන් සෙවීමට Tag එකක් තෝරන්න. (අනිවාර්යයි *)';
    }
    if (paymentType === 'custom' && (!customPaymentAmount.trim() || Number(customPaymentAmount) <= 0)) {
      newErrors.customPayment = 'කරුණාකර ඔබට ගෙවිය හැකි වලංගු මුදලක් ඇතුළත් කරන්න.';
    }

    // 02. ඇප් ගාස්තු ලෙස රු. 50 ක් අයවේ. ගාස්තුව අය කරගන්නද? -> 'හරි'
    if (!isFeeConfirmed) {
      newErrors.feeConfirm = 'කරුණාකර රු. 50 ඇප් ගාස්තුව අයකරගැනීම සඳහා "හරි" බොත්තම ක්ලික් කරන්න.';
    }

    // 03. ඔබ ලබා දී ඇති මෙම වට්සැප් අංකය වැඩද? -> 'ඔව්'
    if (!isWhatsAppConfirmed) {
      newErrors.whatsappConfirm = 'කරුණාකර ඔබගේ වට්සැප් අංකය වැඩ කරන බව තහවුරු කිරීමට "ඔව්" බොත්තම ක්ලික් කරන්න.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    const isValid = validateForm();
    if (!isValid) {
      // Scroll to top of modal or show highlighted notice
      return;
    }

    const paymentText = paymentType === 'agree'
      ? 'ඔබගේ ගාස්තුවට මම එකඟ වෙමි (I agree to your fee)'
      : `මට ගෙවිය හැක: රු. ${customPaymentAmount}/=`;

    // Combine special notice & conditions
    let combinedConditions = conditions.trim();
    if (specialNotice.trim()) {
      combinedConditions = combinedConditions 
        ? `විශේෂ දැනුවත් කිරීම: ${specialNotice.trim()}\nකොන්දේසි: ${combinedConditions}`
        : `විශේෂ දැනුවත් කිරීම: ${specialNotice.trim()}`;
    }

    if (editPost) {
      const updatedPost: HelpPost = {
        ...editPost,
        userName: currentUser.name || editPost.userName || 'පරිශීලක',
        userPhone: whatsappNumber.trim() || editPost.userPhone,
        whatHappened: whatHappened.trim(),
        whatIsNeeded: whatIsNeeded.trim(),
        conditions: conditions.trim() || 'පළපුරුදු කාර්මික ශිල්පින් විමසන්න.',
        specialNotice: specialNotice.trim() || 'අද දවස තුල',
        transport: transport,
        payment: paymentText,
        helpersNeeded: helpersNeeded,
        helpersCount: helpersNeeded,
        tagName: selectedTag?.tagName || editPost.tagName,
        tagCategory: selectedTag?.category || editPost.tagCategory,
        tagId: selectedTag?.id || editPost.tagId,
      };

      if (onUpdatePost) {
        onUpdatePost(updatedPost);
      }
      setHasAttemptedSubmit(false);
      setErrors({});
      onClose();
      return;
    }

    onSubmitPost({
      userName: currentUser?.name || 'පරිශීලක',
      userPhone: whatsappNumber.trim() || userWhatsAppNumber,
      userId: currentUser?.userId || currentUser?.id || '',
      whatHappened: whatHappened.trim(),
      whatIsNeeded: whatIsNeeded.trim(),
      conditions: conditions.trim() || 'විශේෂ කොන්දේසි නොමැත.',
      specialNotice: specialNotice.trim(),
      transport: transport,
      payment: paymentText,
      helpersNeeded: helpersNeeded,
      helpersAccepted: 0,
      feeAgreed: true,
      locationName: voiceData?.location || (currentLocation?.nameSi ? `${currentLocation.nameSi} (${currentLocation.nameEn || ''})` : 'කෝවින්න, කටුනායක'),
      distanceKm: 0.8, // Immediate local radius
      lat: voiceData?.coords?.lat || currentLocation?.lat || 7.1712,
      lng: voiceData?.coords?.lng || currentLocation?.lng || 79.8978,
      verifiedOtp: true,
      category: selectedCategoryObj?.id || 'quick_services',
      tagName: selectedTag?.tagName,
      tagCategory: selectedTag?.category,
      tagId: selectedTag?.id,
      audioUrl: voiceData?.audioUrl || editPost?.audioUrl,
      audioDurationSec: voiceData?.durationSec || editPost?.audioDurationSec,
      voiceSentDate: voiceData?.date || editPost?.voiceSentDate,
      voiceSentTime: voiceData?.time || editPost?.voiceSentTime,
      voiceSentLocation: voiceData?.location || editPost?.voiceSentLocation,
      voiceCoordinates: voiceData?.coords || editPost?.voiceCoordinates,
      isVoicePost: Boolean(voiceData?.audioUrl || editPost?.isVoicePost),
      voiceTranscript: voiceData?.transcript || editPost?.voiceTranscript,
    });

    // Reset and close
    setHasAttemptedSubmit(false);
    setErrors({});
    onClose();
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div 
      id="quick-service-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-[#07150e] border-2 border-emerald-500/80 dark:border-emerald-600/60 rounded-3xl shadow-[0_20px_60px_rgba(0,122,75,0.3)] overflow-hidden relative my-6 flex flex-col text-slate-900 dark:text-slate-100 max-h-[92vh]">
        
        {/* Top Accent Gradient Bar */}
        <div className="h-2.5 bg-gradient-to-r from-[#007a4b] via-emerald-400 to-teal-500" />

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white dark:from-[#0b2417] dark:via-[#091b12] dark:to-[#07150e] px-5 sm:px-7 py-4 border-b border-emerald-200/80 dark:border-[#163a25] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#007a4b] text-white flex items-center justify-center font-black shadow-md shadow-emerald-700/30 shrink-0">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug flex items-center gap-2">
                <span>{editPost ? 'දැන්වීම සංස්කරණය (Edit Post)' : (categoryTitle ? `${categoryTitle} ඉල්ලීම` : 'ඉක්මන් සේවා (Quick Services) ඉල්ලීම')}</span>
                {editPost && (
                  <span className="text-xs font-mono bg-emerald-900/80 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-lg">
                    #{editPost.postCode}
                  </span>
                )}
              </h3>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                {editPost ? 'ඔබ ඇතුළත් කළ තොරතුරු යාවත්කාලීන කර සුරකින්න.' : 'ඉක්මනින්, උපකාරයක් ලබාගැනිමට - වැදගත් තොරතුරු පුරවා ඉල්ලීම් පල කරන්න.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-[#163322] hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center font-black text-base transition-all cursor-pointer shadow-sm active:scale-90 shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5 text-left text-sm">
          
          {/* 🎙️ AI Voice Inline Recorder Bar */}
          <AiVoiceInlineBar
            currentLocation={currentLocation}
            lang={lang}
            titlePrompt="🎙️ ඉක්මන් සේවා AI හඬ සහය (Voice Input):"
            onVoiceCaptured={(data) => {
              setVoiceData(data);
              if (data.parsedFields?.whatHappened) {
                setWhatHappened(data.parsedFields.whatHappened);
              } else if (data.transcript) {
                setWhatHappened(data.transcript);
              }
              if (data.parsedFields?.whatIsNeeded) {
                setWhatIsNeeded(data.parsedFields.whatIsNeeded);
              } else if (!whatIsNeeded) {
                setWhatIsNeeded('ක්ෂණික කාර්මික/සේවා සහයක් අවශ්‍යයි');
              }
              if (data.parsedFields?.payment && data.parsedFields.payment.includes('රු.')) {
                setPaymentType('custom');
                setCustomPaymentAmount(data.parsedFields.payment.replace(/\D/g, ''));
              }
            }}
          />

          {/* Top Error Alert Summary if Validation Fails */}
          {hasAttemptedSubmit && errorCount > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-700 rounded-2xl p-4 text-rose-900 dark:text-rose-200 animate-shake shadow-md">
              <div className="flex items-center gap-2 font-extrabold text-sm mb-2 text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>කරුණාකර පහත අඩුපාඩු නිවැරදි කර නැවත Submit කරන්න:</span>
              </div>
              <ul className="list-disc list-inside text-xs font-semibold space-y-1 pl-1">
                {errors.whatHappened && <li>{errors.whatHappened}</li>}
                {errors.whatIsNeeded && <li>{errors.whatIsNeeded}</li>}
                {errors.customPayment && <li>{errors.customPayment}</li>}
                {errors.feeConfirm && <li>{errors.feeConfirm}</li>}
                {errors.whatsappConfirm && <li>{errors.whatsappConfirm}</li>}
              </ul>
            </div>
          )}

          {/* 1. ගැටලුව කුමක්ද? * */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-700 dark:text-emerald-400 font-black">1.</span>
                <span>ගැටලුව කුමක්ද?</span>
                <span className="text-rose-600 dark:text-rose-400 font-black text-base">*</span>
              </span>
              {errors.whatHappened && (
                <span className="text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> අනිවාර්යයි
                </span>
              )}
            </label>
            <input
              type="text"
              required
              value={whatHappened}
              onChange={(e) => {
                setWhatHappened(e.target.value);
                if (errors.whatHappened) setErrors(prev => ({ ...prev, whatHappened: undefined }));
              }}
              placeholder="උදා: මගේ බයික් එක කැඩිලා / ජල නළ කාන්දුවක් / විදුලි ගැටලුවක්"
              className={`w-full bg-slate-50 dark:bg-[#0c1f15] border-2 rounded-2xl py-3 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none transition-all shadow-inner ${
                errors.whatHappened 
                  ? 'border-rose-500 ring-2 ring-rose-300 dark:ring-rose-900/60 bg-rose-50/50' 
                  : 'border-slate-300 dark:border-[#1d422d] focus:border-[#007a4b] dark:focus:border-emerald-500'
              }`}
            />
            {errors.whatHappened && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 pt-0.5">
                {errors.whatHappened}
              </p>
            )}
          </div>

          {/* 2. ඔබ බලාපොරොත්තු වන්නේ කුමක්ද? * */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-700 dark:text-emerald-400 font-black">2.</span>
                <span>ඔබ බලාපොරොත්තු වන්නේ කුමක්ද?</span>
                <span className="text-rose-600 dark:text-rose-400 font-black text-base">*</span>
              </span>
              {errors.whatIsNeeded && (
                <span className="text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> අනිවාර්යයි
                </span>
              )}
            </label>
            <input
              type="text"
              required
              value={whatIsNeeded}
              onChange={(e) => {
                setWhatIsNeeded(e.target.value);
                if (errors.whatIsNeeded) setErrors(prev => ({ ...prev, whatIsNeeded: undefined }));
              }}
              placeholder="උදා: බයික් එක රෙපයාර් කර ගැනීමට සහායක් / අලුත්වැඩියා කාර්මිකයෙකු"
              className={`w-full bg-slate-50 dark:bg-[#0c1f15] border-2 rounded-2xl py-3 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none transition-all shadow-inner ${
                errors.whatIsNeeded 
                  ? 'border-rose-500 ring-2 ring-rose-300 dark:ring-rose-900/60 bg-rose-50/50' 
                  : 'border-slate-300 dark:border-[#1d422d] focus:border-[#007a4b] dark:focus:border-emerald-500'
              }`}
            />
            {errors.whatIsNeeded && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 pt-0.5">
                {errors.whatIsNeeded}
              </p>
            )}
          </div>

          {/* TAG SELECTION SYSTEM (Requirement 01, 02, 03, 04) */}
          <TagSelector
            selectedTag={selectedTag}
            onSelectTag={(tag) => {
              setSelectedTag(tag);
              if (errors.selectedTag) setErrors((prev) => ({ ...prev, selectedTag: undefined }));
            }}
            allTags={allTags}
            onTagCreated={(newTag) => {
              setAllTags((prev) => [newTag, ...prev]);
            }}
            errorMsg={errors.selectedTag}
          />

          {/* 3. විශේෂ දැනුවත් කිරිමක් ඇත්නම් ඇතුලත් කරන්න. */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span className="text-emerald-700 dark:text-emerald-400 font-black">3.</span>
              <span>විශේෂ දැනුවත් කිරිමක් ඇත්නම් ඇතුලත් කරන්න.</span>
            </label>
            <textarea
              rows={2}
              value={specialNotice}
              onChange={(e) => setSpecialNotice(e.target.value)}
              placeholder="උදා: සවස 4.00 ට පෙර පැමිණිය හැකිනම් වඩාත් පහසුයි..."
              className="w-full bg-slate-50 dark:bg-[#0c1f15] border-2 border-slate-300 dark:border-[#1d422d] focus:border-[#007a4b] dark:focus:border-emerald-500 rounded-2xl py-2.5 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* 4. කොන්දේසි ඇත්නම් පවසන්න. (Conditions) */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span className="text-emerald-700 dark:text-emerald-400 font-black">4.</span>
              <span>කොන්දේසි ඇත්නම් පවසන්න. (Conditions)</span>
            </label>
            <textarea
              rows={2}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="උදා: පළපුරුදු කාර්මික ශිල්පීන් පමණක් සම්බන්ධ වන්න. අවශ්‍ය Tools රැගෙන එන්න."
              className="w-full bg-slate-50 dark:bg-[#0c1f15] border-2 border-slate-300 dark:border-[#1d422d] focus:border-[#007a4b] dark:focus:border-emerald-500 rounded-2xl py-2.5 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* 5. ගමනාගමනය සිදුවන්නේ කෙසෙද? (පහල අවස්ථාවලින් එකක් තෙරිමට අවසර දෙන්න.) */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span className="text-emerald-700 dark:text-emerald-400 font-black">5.</span>
              <span>ගමනාගමනය සිදුවන්නේ කෙසෙද? <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">(පහල අවස්ථාවලින් එකක් තෝරන්න)</span></span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-[#0a1a12] p-3 rounded-2xl border border-slate-200 dark:border-[#163824]">
              {transportOptions.map((opt) => {
                const isSelected = transport === opt;
                return (
                  <label
                    key={opt}
                    onClick={() => setTransport(opt)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs sm:text-sm font-bold cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-100 dark:bg-[#133722] border-emerald-500 dark:border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm'
                        : 'bg-white dark:bg-[#0c2217] border-slate-200 dark:border-[#1b3d29] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#122e20]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transport_choice"
                      checked={isSelected}
                      onChange={() => setTransport(opt)}
                      className="accent-emerald-600 w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 6. ගෙවීම් ක්‍රමය (Payment Method) */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="text-emerald-700 dark:text-emerald-400 font-black">6.</span>
                <span>ගෙවීම් ක්‍රමය (Payment Method)</span>
              </label>
              <p className="text-[11px] font-medium text-slate-500 dark:text-emerald-300/80">
                (ඇප් ගාස්තුවට අමතරව සේවය වෙනුවෙන් ගෙවන මුදල මෙහි සදහන් කරන්න.)
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-[#0a1a12] p-3.5 rounded-2xl border border-slate-200 dark:border-[#163824] space-y-3">
              {/* Option 1: Agree */}
              <label 
                onClick={() => setPaymentType('agree')}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  paymentType === 'agree'
                    ? 'bg-emerald-100 dark:bg-[#133722] border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold'
                    : 'bg-white dark:bg-[#0c2217] border-slate-200 dark:border-[#1b3d29] text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment_choice"
                  checked={paymentType === 'agree'}
                  onChange={() => setPaymentType('agree')}
                  className="accent-emerald-600 w-4 h-4"
                />
                <span className="text-xs sm:text-sm font-bold">
                  [x] ඔබගේ ගාස්තුවට මම එකඟ වෙමි (I agree to your fee)
                </span>
              </label>

              {/* Option 2: Custom Amount */}
              <div 
                onClick={() => setPaymentType('custom')}
                className={`flex flex-wrap items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  paymentType === 'custom'
                    ? 'bg-emerald-100 dark:bg-[#133722] border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold'
                    : 'bg-white dark:bg-[#0c2217] border-slate-200 dark:border-[#1b3d29] text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment_choice"
                    checked={paymentType === 'custom'}
                    onChange={() => setPaymentType('custom')}
                    className="accent-emerald-600 w-4 h-4"
                  />
                  <span className="text-xs sm:text-sm font-bold">මට ගෙවිය හැක: රු.</span>
                </div>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={customPaymentAmount}
                  disabled={paymentType !== 'custom'}
                  onChange={(e) => {
                    setCustomPaymentAmount(e.target.value);
                    if (errors.customPayment) setErrors(prev => ({ ...prev, customPayment: undefined }));
                  }}
                  placeholder="1500"
                  className="w-32 bg-white dark:bg-[#07130c] border border-slate-300 dark:border-[#1b3d29] rounded-xl px-3 py-1 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            {errors.customPayment && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{errors.customPayment}</p>
            )}
          </div>

          {/* 7. උදව් අවශ්‍ය පුද්ගලයන් සංඛ්‍යාව (- ___ +) */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span className="text-emerald-700 dark:text-emerald-400 font-black">7.</span>
              <span>උදව් අවශ්‍ය පුද්ගලයන් සංඛ්‍යාව</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-50 dark:bg-[#0a1a12] border-2 border-slate-300 dark:border-[#163824] rounded-2xl p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => setHelpersNeeded((prev) => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-[#0e271a] hover:bg-slate-200 dark:hover:bg-[#163c28] text-slate-800 dark:text-white flex items-center justify-center font-black transition-all shadow-sm active:scale-90 cursor-pointer"
                  title="Decrease"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-16 text-center font-mono text-lg font-black text-slate-900 dark:text-white">
                  {helpersNeeded}
                </div>
                <button
                  type="button"
                  onClick={() => setHelpersNeeded((prev) => Math.min(20, prev + 1))}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-[#0e271a] hover:bg-slate-200 dark:hover:bg-[#163c28] text-slate-800 dark:text-white flex items-center justify-center font-black transition-all shadow-sm active:scale-90 cursor-pointer"
                  title="Increase"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                (උදව් කිරීමට අවශ්‍ය සහයකයින් ගණන)
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-[#163824] my-2" />

          {/* VERIFICATION SECTION 02: ඇප් ගාස්තු ලෙස රු. 50 ක් අයවේ. ගාස්තුව අය කරගන්නද? -> 'හරි' */}
          <div 
            className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${
              errors.feeConfirm 
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 shadow-md ring-2 ring-rose-200 dark:ring-rose-900/40' 
                : isFeeConfirmed
                ? 'bg-emerald-50 dark:bg-[#0c2417] border-emerald-500 shadow-sm'
                : 'bg-amber-50/70 dark:bg-[#171d12] border-amber-300 dark:border-[#383a1a]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-200 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                  ගාස්තු තහවුරු කිරීම (02)
                </span>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  ඇප් ගාස්තු ලෙස රු. 50 ක් අයවේ. ගාස්තුව අය කරගන්නද?
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsFeeConfirmed(!isFeeConfirmed);
                  if (errors.feeConfirm) setErrors(prev => ({ ...prev, feeConfirm: undefined }));
                }}
                className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 shrink-0 ${
                  isFeeConfirmed
                    ? 'bg-[#007a4b] hover:bg-[#006e43] text-white ring-2 ring-emerald-300 dark:ring-emerald-600'
                    : 'bg-slate-200 dark:bg-[#1c3827] hover:bg-emerald-600 hover:text-white text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-[#2b543c]'
                }`}
              >
                {isFeeConfirmed ? <Check className="w-4 h-4 text-white stroke-[3]" /> : null}
                <span>{isFeeConfirmed ? '✓ හරි (තහවුරුයි)' : 'හරි'}</span>
              </button>
            </div>

            {errors.feeConfirm && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.feeConfirm}</span>
              </p>
            )}
          </div>

          {/* VERIFICATION SECTION 03: ඔබ ලබා දී ඇති මෙම වට්සැප් අංකය වැඩද? -> 'ඔව්' */}
          <div 
            className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${
              errors.whatsappConfirm 
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 shadow-md ring-2 ring-rose-200 dark:ring-rose-900/40' 
                : isWhatsAppConfirmed
                ? 'bg-emerald-50 dark:bg-[#0c2417] border-emerald-500 shadow-sm'
                : 'bg-teal-50/70 dark:bg-[#0c1f1b] border-teal-300 dark:border-[#1a3d34]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-200 dark:bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-300 dark:border-teal-800">
                  වට්සැප් තහවුරු කිරීම (03)
                </span>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  ඔබ ලබා දී ඇති මෙම වට්සැප් අංකය වැඩද?
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">අංකය:</span>
                  <span className="font-mono text-sm sm:text-base font-black text-[#007a4b] dark:text-emerald-300 bg-white dark:bg-[#07150e] px-3 py-1 rounded-xl border border-emerald-300 dark:border-[#1b442d] shadow-inner">
                    {whatsappNumber}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsWhatsAppConfirmed(!isWhatsAppConfirmed);
                  if (errors.whatsappConfirm) setErrors(prev => ({ ...prev, whatsappConfirm: undefined }));
                }}
                className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 shrink-0 ${
                  isWhatsAppConfirmed
                    ? 'bg-[#007a4b] hover:bg-[#006e43] text-white ring-2 ring-emerald-300 dark:ring-emerald-600'
                    : 'bg-slate-200 dark:bg-[#1c3827] hover:bg-emerald-600 hover:text-white text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-[#2b543c]'
                }`}
              >
                {isWhatsAppConfirmed ? <Check className="w-4 h-4 text-white stroke-[3]" /> : null}
                <span>{isWhatsAppConfirmed ? '✓ ඔව් (තහවුරුයි)' : 'ඔව්'}</span>
              </button>
            </div>

            {errors.whatsappConfirm && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.whatsappConfirm}</span>
              </p>
            )}
          </div>

          {/* 🛡️ Trust & Insurance Platform Guarantee Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-[#07291a] to-slate-950 border border-emerald-500/40 text-white space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-extrabold text-amber-300">
                🛡️ සහය සේවා පාරිභෝගික ආරක්ෂණ වගකීම (Platform Guarantee)
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/90 leading-snug">
              ඇප් එකෙන් බාහිරව කරන සෘජු ගනුදෙනු සඳහා වේදිකාවේ කිසිදු වගකීමක් නොමැත. ඇප් එක හරහා සම්බන්ධ වන ගනුදෙනුවලට පමණක් ගුණාත්මක සහතිකය සහ මැදිහත්වීම ලැබේ.
            </p>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-[#00a86b] hover:bg-[#00925c] active:bg-[#007a4b] text-white font-black text-base shadow-[0_10px_25px_rgba(0,168,107,0.35)] border-b-4 border-[#006e43] transition-all flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5 active:border-b-0"
            >
              <span>{editPost ? 'වෙනස්කම් සුරකින්න (Save Changes)' : 'SUBMIT (පළ කරන්න)'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-2">
              සියලු අනිවාර්ය කරුණු, රු. 50 ගාස්තුව සඳහා <strong>'හරි'</strong> සහ වට්සැප් සඳහා <strong>'ඔව්'</strong> තහවුරු කළ විට පමණක් දැන්වීම පළ වේ.
            </p>
          </div>

        </form>
      </div>
    </div>
  );
};


