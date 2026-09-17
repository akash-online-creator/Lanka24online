import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import { HelpPost, Language, LocationOption, TagItem } from '../types';
import { translations } from '../data/translations';
import { TagSelector } from './TagSelector';
import { getStoredTags } from '../utils/tagUtils';
import { getPostRateLimitStatus, recordPostSubmission } from '../utils/rateLimiter';

interface HelpPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPost: (post: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>) => void;
  currentLocation: LocationOption;
  lang: Language;
}

export const HelpPostModal: React.FC<HelpPostModalProps> = ({
  isOpen,
  onClose,
  onSubmitPost,
  currentLocation,
  lang,
}) => {
  const t = translations[lang];

  // Form State
  const [step, setStep] = useState<1 | 2>(1); // 1 = Details, 2 = OTP Verification
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [whatIsNeeded, setWhatIsNeeded] = useState('');
  const [conditions, setConditions] = useState('');
  const [transport, setTransport] = useState('');
  const [payment, setPayment] = useState('');
  const [externalLink, setExternalLink] = useState('');

  // Tag State
  const [allTags, setAllTags] = useState<TagItem[]>(() => getStoredTags());
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);
  const [tagError, setTagError] = useState('');

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setUserName('');
      setUserPhone('');
      setWhatHappened('');
      setWhatIsNeeded('');
      setConditions('');
      setTransport('');
      setPayment('');
      setExternalLink('');
      setSelectedTag(null);
      setTagError('');
      setOtpSent(false);
      setEnteredOtp('');
      setOtpError(false);
      setIsSuccess(false);
      setAllTags(getStoredTags());
    }
  }, [isOpen]);

  const [rateLimitError, setRateLimitError] = useState('');

  if (!isOpen) return null;

  const handleNextToOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setRateLimitError('');

    // Check 30s rate limit
    const rateStatus = getPostRateLimitStatus(userPhone.trim() || 'user');
    if (rateStatus.isCoolingDown) {
      setRateLimitError(`⏱️ ${rateStatus.messageSi}`);
      return;
    }

    if (!selectedTag) {
      setTagError('කරුණාකර දැන්වීම සඳහා Tag එකක් තෝරන්න (අනිවාර්යයි *).');
      return;
    }
    setTagError('');
    if (!userName.trim() || !userPhone.trim() || !whatHappened.trim() || !whatIsNeeded.trim()) {
      alert('කරුණාකර සියලු අත්‍යවශ්‍ය තොරතුරු පූරණය කරන්න.');
      return;
    }
    setStep(2);
    setOtpSent(true);
  };

  const handleVerifyOtpAndSubmit = () => {
    // Demo OTP is 1234
    if (enteredOtp !== '1234') {
      setOtpError(true);
      return;
    }
    setOtpError(false);

    // Record submission for 30s cooldown
    recordPostSubmission(userPhone.trim() || 'user');

    // Create Post object
    onSubmitPost({
      userName: userName.trim(),
      userPhone: userPhone.trim(),
      whatHappened: whatHappened.trim(),
      whatIsNeeded: whatIsNeeded.trim(),
      conditions: conditions.trim() || 'විශේෂ කොන්දේසි නොමැත.',
      transport: transport.trim(),
      payment: payment.trim(),
      externalLink: externalLink.trim(),
      locationName: `${currentLocation.nameSi} (${currentLocation.nameEn})`,
      distanceKm: 0.5, // Posted from current location
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      verifiedOtp: true,
      tagName: selectedTag?.tagName,
      tagCategory: selectedTag?.category,
      tagId: selectedTag?.id,
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setStep(1);
      setEnteredOtp('');
      setWhatHappened('');
      setWhatIsNeeded('');
      setConditions('');
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-emerald-950 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {t.createNewPostTitle}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                ස්ථානය: <strong className="text-slate-200">{currentLocation.nameSi} ({currentLocation.nameEn})</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-around text-xs font-semibold">
          <span className={`flex items-center gap-1.5 ${step === 1 ? 'text-rose-400' : 'text-emerald-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 1 ? 'bg-rose-500/20 text-rose-400 border border-rose-500' : 'bg-emerald-500 text-slate-950'}`}>
              1
            </span>
            {t.stepDetails}
          </span>
          <span className="text-slate-600">➔</span>
          <span className={`flex items-center gap-1.5 ${step === 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
              2
            </span>
            {t.stepOtp}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">

          {isSuccess ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-3 animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-white">{t.postSuccessTitle}</h4>
              <p className="text-sm text-slate-300 max-w-md">{t.postSuccessDesc}</p>
            </div>
          ) : step === 1 ? (
            /* STEP 1: Details Form */
            <form id="help-post-form" onSubmit={handleNextToOtp} className="space-y-4">
              {rateLimitError && (
                <div className="p-3.5 bg-amber-500/20 border border-amber-500/50 rounded-2xl text-amber-200 text-xs font-bold flex items-center gap-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{rateLimitError}</span>
                </div>
              )}
              
              {/* User Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    {t.yourName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="උදා: සුනිල් ශාන්ත"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-100 text-sm focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" /> WhatsApp අංකය *
                  </label>
                  <input
                    type="tel"
                    required
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="0771234567"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* 📌 සිදුවී ඇති දේ (What Happened) */}
              <div>
                <label className="block text-xs font-bold text-rose-400 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> 📌 සිදුවී ඇති දේ (What Happened) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={whatHappened}
                  onChange={(e) => setWhatHappened(e.target.value)}
                  placeholder="උදා: මගේ බයික් එකේ චේන් එක පැනලා කඩවත නගරය ආසන්නයේ නතර වුණා."
                  className="w-full bg-slate-950 border border-rose-500/30 rounded-xl py-2.5 px-3.5 text-slate-100 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* 🛠️ වියයුතු දේ (What is Needed) */}
              <div>
                <label className="block text-xs font-bold text-cyan-400 mb-1 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5" /> 🛠️ වියයුතු දේ (What is Needed) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={whatIsNeeded}
                  onChange={(e) => setWhatIsNeeded(e.target.value)}
                  placeholder="උදා: බයික් එක ළඟම ගරාජයට රැගෙන යාමට හෝ හදා ගැනීමට සහායකයෙක් අවශ්‍යයි."
                  className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl py-2.5 px-3.5 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Tag Selector Component */}
              <TagSelector
                selectedTag={selectedTag}
                onSelectTag={(tag) => {
                  setSelectedTag(tag);
                  if (tag) setTagError('');
                }}
                allTags={allTags}
                onTagCreated={(newTag) => setAllTags((prev) => [newTag, ...prev])}
                errorMsg={tagError}
              />

              {/* 📜 කොන්දේසි (Conditions) */}
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> 📜 කොන්දේසි (Conditions)
                </label>
                <input
                  type="text"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="උදා: මෙවලම් (Spanners) ඇත්නම් රැගෙන එන්න."
                  className="w-full bg-slate-950 border border-amber-500/30 rounded-xl py-2 px-3 text-slate-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Transport & Payment Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 🚗 ගමනාගමනය */}
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1">
                    <Car className="w-3.5 h-3.5" /> 🚗 ගමනාගමනය (Transport)
                  </label>
                  <input
                    type="text"
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    placeholder="උදා: ත්‍රිරෝද රථයක් / සහායකගේ වාහනය"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* 💰 ගෙවීම් */}
                <div>
                  <label className="block text-xs font-bold text-emerald-300 mb-1 flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5" /> 💰 ගෙවීම් (Payment/Reward)
                  </label>
                  <input
                    type="text"
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                    placeholder="උදා: රු. 2,500/= හෝ නොමිලේ"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 🔗 වීඩියෝ / සමාජ මාධ්‍ය / වෙබ් ලින්ක් (External Link / Video) */}
              <div>
                <label className="block text-xs font-bold text-sky-400 mb-1 flex items-center gap-1">
                  <span>🔗 වීඩියෝ හෝ වෙබ් ලින්ක් (Facebook / Telegram / YouTube / Link - Optional)</span>
                </label>
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://facebook.com/... හෝ https://t.me/... හෝ https://youtube.com/..."
                  className="w-full bg-slate-950 border border-sky-500/30 rounded-xl py-2 px-3 text-slate-100 text-sm focus:border-sky-500 focus:outline-none placeholder-slate-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Facebook, Telegram, හෝ YouTube වීඩියෝ ලින්ක් ඇතුළත් කළහොත් ඇප් එක තුළදීම ප්ලේ කර බැලිය හැක.
                </p>
              </div>

            </form>
          ) : (
            /* STEP 2: OTP Phone Verification */
            <div className="py-4 space-y-5 animate-fadeIn">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/50 mx-auto flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white">දුරකථන අංකය තහවුරු කිරීම</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  {userPhone} අංකයට යවන ලද අංක 4කින් යුත් OTP සංකේතය ඇතුළත් කරන්න.
                </p>
                <div className="inline-block bg-slate-800 border border-slate-700 text-amber-300 text-xs px-3 py-1 rounded-full font-mono">
                  🔑 Demo OTP Code: <strong className="text-white">1234</strong>
                </div>
              </div>

              {/* OTP Input Fields */}
              <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                {['1', '2', '3', '4'].map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={enteredOtp[idx] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const current = enteredOtp.split('');
                      current[idx] = val;
                      setEnteredOtp(current.join('').slice(0, 4));
                    }}
                    className="w-12 h-12 text-center text-xl font-bold bg-slate-950 border border-emerald-500/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-center text-xs text-rose-400 font-bold animate-shake">
                  ❌ වැරදි OTP අංකයකි. කරුණාකර Demo OTP (1234) ඇතුළත් කරන්න.
                </p>
              )}

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <p className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Lock className="w-3.5 h-3.5" /> 100% Verified Posting System
                </p>
                <p>දුරකථන අංකය තහවුරු කිරීමෙන් ව්‍යාජ පෝස්ට් පළවීම වළක්වයි.</p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        {!isSuccess && (
          <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> ආපසු
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                {t.cancelBtn}
              </button>
            )}

            {step === 1 ? (
              <button
                type="submit"
                form="help-post-form"
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-rose-950 transition-all active:scale-95"
              >
                <span>ඊළඟ පියවර (OTP)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleVerifyOtpAndSubmit}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950 transition-all active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t.verifyAndPostBtn}</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
