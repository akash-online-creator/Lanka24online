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
import { broadcastPushNotification } from '../utils/fcmNotificationService';
import { generateStartPin, calculatePlatformFee } from '../utils/serviceWorkflowManager';

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

  // Selected Category (Defaults to Quick Services or Normal Services)
  const [selectedCategoryObj, setSelectedCategoryObj] = useState<CategoryItem | null>(() => {
    return categories.find(c => c.id === 'quick_services') || categories[0] || null;
  });

  // Selected Tag
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);

  // Form Fields State
  const [whatHappened, setWhatHappened] = useState('');
  const [whatIsNeeded, setWhatIsNeeded] = useState('');
  const [conditions, setConditions] = useState('');
  const [specialNotice, setSpecialNotice] = useState('');
  const [transport, setTransport] = useState('ඔබ පැමිණිය යුතුයි');
  const [paymentType, setPaymentType] = useState<'agree' | 'custom'>('agree');
  const [customPaymentAmount, setCustomPaymentAmount] = useState('1500');
  const [helpersNeeded, setHelpersNeeded] = useState<number>(1);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [voiceData, setVoiceData] = useState<any>(null);

  // Validation Error States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Prefill phone from logged-in user profile
  const userWhatsAppNumber = currentUser?.whatsappNumber || currentUser?.phone || '';

  useEffect(() => {
    if (currentUser && !whatsappNumber) {
      setWhatsappNumber(userWhatsAppNumber);
    }
  }, [currentUser, userWhatsAppNumber]);

  // Handle Edit Post prefill
  useEffect(() => {
    if (editPost && isOpen) {
      setWhatHappened(editPost.whatHappened || '');
      setWhatIsNeeded(editPost.whatIsNeeded || '');
      setConditions(editPost.conditions || '');
      setSpecialNotice(editPost.specialNotice || '');
      setTransport(editPost.transport || 'ඔබ පැමිණිය යුතුයි');
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
    } else if (!editPost && isOpen) {
      // Reset form
      setWhatHappened('');
      setWhatIsNeeded('');
      setConditions('');
      setSpecialNotice('');
      setTransport('ඔබ පැමිණිය යුතුයි');
      setPaymentType('agree');
      setCustomPaymentAmount('1500');
      setHelpersNeeded(1);
      setWhatsappNumber(userWhatsAppNumber);
      setSelectedTag(null);
      setVoiceData(null);
      setErrors({});
      setHasAttemptedSubmit(false);
    }
  }, [editPost, isOpen, userWhatsAppNumber]);

  if (!isOpen) return null;

  // Validation function
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

    if (paymentType === 'custom' && (!customPaymentAmount.trim() || Number(customPaymentAmount) <= 0)) {
      newErrors.customPayment = 'කරුණාකර වලංගු මුදලක් ඇතුළත් කරන්න.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper count increment / decrement
  const handleHelperChange = (delta: number) => {
    setHelpersNeeded(prev => {
      const next = prev + delta;
      return next >= 1 ? next : 1;
    });
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    if (!validate()) {
      return;
    }

    const paymentText = paymentType === 'agree'
      ? 'ඔබගේ ගාස්තුවට මම එකඟ වෙමි (I agree to your fee)'
      : `මට ගෙවිය හැක: රු. ${Number(customPaymentAmount).toLocaleString()}`;

    if (editPost && onUpdatePost) {
      const updatedPost: HelpPost = {
        ...editPost,
        whatHappened: whatHappened.trim(),
        whatIsNeeded: whatIsNeeded.trim(),
        conditions: conditions.trim() || 'විශේෂ කොන්දේසි නොමැත.',
        specialNotice: specialNotice.trim(),
        transport: transport,
        payment: paymentText,
        helpersNeeded: helpersNeeded,
        helpersCount: helpersNeeded,
        userPhone: whatsappNumber.trim() || userWhatsAppNumber,
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

    const resolvedLocation = voiceData?.location || (currentLocation?.nameSi ? `${currentLocation.nameSi} (${currentLocation.nameEn || ''})` : 'කෝවින්න, කටුනායක');
    const autoPlatformFee = calculatePlatformFee(paymentText);
    const newStartPin = generateStartPin();

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
      category: selectedCategoryObj?.id || 'quick_services',
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
      title: '⚡ නව ඉක්මන් සේවා දැන්වීමක්!',
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
                <span>{editPost ? 'සේවා දැන්වීම සංස්කරණය' : 'ඉක්මන් සේවා ඉල්ලීමක් පළකරන්න'}</span>
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium">
                අවට සිටින සහායකයින් සමඟ සම්බන්ධ වී කඩිනම් සේවාවක් ලබාගන්න
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5 text-left text-sm">
          
          {/* 1. සේවා කාණ්ඩය (Category) */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>සේවා කාණ්ඩය (Category):</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const quickCat = categories.find(c => c.id === 'quick_services') || null;
                  setSelectedCategoryObj(quickCat);
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedCategoryObj?.id === 'quick_services'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>ඉක්මන් සේවා (Quick)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const normalCat = categories.find(c => c.id === 'normal_services') || null;
                  setSelectedCategoryObj(normalCat);
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedCategoryObj?.id === 'normal_services'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>සාමාන්‍ය සේවා (Normal)</span>
              </button>
            </div>
          </div>

          {/* 2. Tag තේරීම */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
              <span>අදාළ Tag එක තෝරන්න (විකල්ප):</span>
            </label>
            <TagSelector
              selectedTag={selectedTag}
              onSelectTag={setSelectedTag}
              lang={lang}
            />
          </div>

          {/* 3. සිදුවී ඇති දේ (What Happened) */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span>සිදුවී ඇති දේ (What Happened) <span className="text-rose-500">*</span>:</span>
            </label>
            <textarea
              rows={3}
              value={whatHappened}
              onChange={(e) => {
                setWhatHappened(e.target.value);
                if (errors.whatHappened) setErrors(prev => ({ ...prev, whatHappened: undefined }));
              }}
              placeholder="උදා: මෝටර් සයිකලයේ ටයර් එක පැන්චර් වී ඇත / වතුර බටයක් කැඩී වතුර කාන්දු වේ..."
              className={`w-full p-3 rounded-2xl border bg-slate-50 dark:bg-[#07130c] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.whatHappened ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 dark:border-[#1b3d29]'
              }`}
            />
            {errors.whatHappened && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{errors.whatHappened}</p>
            )}
          </div>

          {/* 4. වියයුතු දේ (What is Needed) */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>වියයුතු දේ (What is Needed) <span className="text-rose-500">*</span>:</span>
            </label>
            <textarea
              rows={2}
              value={whatIsNeeded}
              onChange={(e) => {
                setWhatIsNeeded(e.target.value);
                if (errors.whatIsNeeded) setErrors(prev => ({ ...prev, whatIsNeeded: undefined }));
              }}
              placeholder="උදා: පැන්චරය දමා දීමට කාර්මිකයෙකු අවශ්‍යයි / ජලනල කාර්මිකයෙකු අවශ්‍යයි..."
              className={`w-full p-3 rounded-2xl border bg-slate-50 dark:bg-[#07130c] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.whatIsNeeded ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 dark:border-[#1b3d29]'
              }`}
            />
            {errors.whatIsNeeded && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{errors.whatIsNeeded}</p>
            )}
          </div>

          {/* 5. ගමනාගමනය (Transport) */}
          <div className="space-y-2">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
              <Car className="w-4 h-4 text-emerald-600" />
              <span>ගමනාගමනය (Transport):</span>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'ඔබ පැමිණිය යුතුයි', label: 'ඔබ පැමිණිය යුතුයි (You arrive)' },
                { id: 'මා පැමිණෙන්නම්', label: 'මා පැමිණෙන්නම් (I will come)' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setTransport(opt.id)}
                  className={`p-2.5 rounded-xl border font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                    transport === opt.id
                      ? 'bg-emerald-100 dark:bg-[#133722] border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-xs'
                      : 'bg-slate-50 dark:bg-[#0a1a12] border-slate-200 dark:border-[#163824] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{opt.label}</span>
                  {transport === opt.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              ))}
            </div>
            {transport === 'ඔබ පැමිණිය යුතුයි' && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                💡 සහායකයා පැමිණෙන දුර සඳහා කි.මී. 1 ට රු. 100 ක ප්‍රවාහන දීමනාවක් ස්වයංක්‍රීයව බිල්පතට එක්වේ.
              </p>
            )}
          </div>

          {/* 6. ගෙවීම් (Payment) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>ගෙවීම් (Payment / Fee):</span>
              </label>
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

            {/* Platform Fee Auto-Deduction Notice */}
            <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-300/80 dark:border-emerald-800/60 flex items-center justify-between text-[11px]">
              <span className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                <span>ඇප් ගාස්තුව (Platform Fee):</span>
              </span>
              <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                {paymentType === 'custom' && Number(customPaymentAmount) === 0 ? 'රු. 0.00 (නොමිලේ සේවා)' : 'රු. 50.00 (ගනුදෙනුව සාර්ථක වූ පසු)'}
              </span>
            </div>
            {errors.customPayment && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{errors.customPayment}</p>
            )}
          </div>

          {/* 7. උදව් අවශ්‍ය පුද්ගලයන් සංඛ්‍යාව (- ___ +) */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>අවශ්‍ය සහායකයින් ගණන (Helpers Needed):</span>
            </label>
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-[#0a1a12] p-2.5 rounded-2xl border border-slate-200 dark:border-[#163824] w-fit">
              <button
                type="button"
                onClick={() => handleHelperChange(-1)}
                className="w-8 h-8 rounded-xl bg-white dark:bg-[#0c2217] border border-slate-300 dark:border-[#1b3d29] flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer shadow-xs active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-mono font-black text-base text-emerald-700 dark:text-emerald-300 w-6 text-center">
                {helpersNeeded}
              </span>
              <button
                type="button"
                onClick={() => handleHelperChange(1)}
                className="w-8 h-8 rounded-xl bg-white dark:bg-[#0c2217] border border-slate-300 dark:border-[#1b3d29] flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500 font-medium pl-1">පුද්ගලයින්</span>
            </div>
          </div>

          {/* 8. WhatsApp අංකය */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>ඔබගේ WhatsApp අංකය <span className="text-rose-500">*</span>:</span>
            </label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => {
                setWhatsappNumber(e.target.value);
                if (errors.whatsappNumber) setErrors(prev => ({ ...prev, whatsappNumber: undefined }));
              }}
              placeholder="0771234567"
              className={`w-full p-3 rounded-2xl border bg-slate-50 dark:bg-[#07130c] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm ${
                errors.whatsappNumber ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 dark:border-[#1b3d29]'
              }`}
            />
            {errors.whatsappNumber && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{errors.whatsappNumber}</p>
            )}
          </div>

          {/* 9. කොන්දේසි (Conditions) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 text-xs">
              <span>කොන්දේසි (විකල්ප):</span>
            </label>
            <input
              type="text"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="උදා: වැඩය සාර්ථක වූ පසු පමණක් ගෙවීම් කරනු ලැබේ..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#1b3d29] bg-slate-50 dark:bg-[#07130c] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 10. විශේෂ දැනුවත් කිරීම */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 text-xs">
              <span>විශේෂ දැනුවත් කිරීම (විකල්ප):</span>
            </label>
            <input
              type="text"
              value={specialNotice}
              onChange={(e) => setSpecialNotice(e.target.value)}
              placeholder="උදා: සුනඛයෙකු බැඳ ඇත / ගේට්ටුව වසා ඇත..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#1b3d29] bg-slate-50 dark:bg-[#07130c] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-[0_4px_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            >
              <span>{editPost ? 'යාවත්කාලීන කරන්න' : 'දැන්වීම පළකරන්න'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
