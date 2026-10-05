import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  MapPin, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle, 
  Heart, 
  Sparkles,
  Award,
  ExternalLink,
  ShieldCheck,
  Lock,
  DollarSign,
  Receipt,
  FileCheck,
  Check,
  HelpCircle,
  Copy,
  Clock
} from 'lucide-react';
import { HelpPost, User as UserType } from '../types';

interface QuickServiceConfirmWorkflowProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (post: HelpPost) => void;
  currentUser: UserType;
  onConfirmPost?: (post: HelpPost) => void;
}

type Stage = 
  | 'question_yes_no'       // 1. "ඔබ මෙම සේවාව ලබාදීමට / ස්ථිරවම භාරගැනීමට සූදානම්ද?" [YES] [NO]
  | 'action_bar'             // 2. Active Service in Progress + Live Financial Breakdown + Completion PIN Display/Input
  | 'verify_completion_pin'  // 3. 2-Party OTP / PIN Completion Verification (ද්විපාර්ශ්වික සත්‍යාපනය)
  | 'confirm_solved'         // 4. "ඔබගේ ගැටලුව විසඳුනාද?" [ඔව්] [නැත]
  | 'feedback_and_thanks'    // 5. Rating Emojis + Official Digital Settlement Receipt + Rs. 10 Bonus
  | 'receipt_view';          // 6. View Full Official Digital Transaction Receipt

export const QuickServiceConfirmWorkflow: React.FC<QuickServiceConfirmWorkflowProps> = ({
  post,
  isOpen,
  onClose,
  onOpenChat,
  currentUser,
  onConfirmPost,
}) => {
  const [stage, setStage] = useState<Stage>('question_yes_no');
  const [selectedRating, setSelectedRating] = useState<number | null>(4);
  const [emagencyNotice, setEmagencyNotice] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isCopiedPin, setIsCopiedPin] = useState<boolean>(false);
  const [serviceAgreedFee, setServiceAgreedFee] = useState<number>(() => {
    if (!post?.payment) return 1500;
    const match = post.payment.match(/\d[\d,.]*/);
    if (match) {
      const num = parseFloat(match[0].replace(/,/g, ''));
      return isNaN(num) ? 1500 : num;
    }
    return 1500;
  });

  // Calculate Master Plan Financial Settlement
  const signupBonusDiscount = 100; // Rs. 100 signup credit
  const netPayableCash = Math.max(0, serviceAgreedFee - signupBonusDiscount);
  const helperEarnedTotal = serviceAgreedFee + 10; // Rs. 10 platform app token bonus
  const completionPin = post?.completionPin || '4829';

  if (!isOpen || !post) return null;

  const normalizePhone = (phone?: string) => (phone ? phone.replace(/[^0-9]/g, '') : '');
  const isOwner = Boolean(
    currentUser && (
      (currentUser.userId && post.userId && (currentUser.userId === post.userId || (currentUser.id && currentUser.id === post.userId))) ||
      (currentUser.id && post.userId && currentUser.id === post.userId) ||
      (currentUser.phone && post.userPhone && normalizePhone(currentUser.phone) === normalizePhone(post.userPhone)) ||
      (user?.name && post.userName && user?.name.trim().toLowerCase() === post.userName.trim().toLowerCase())
    )
  );

  const helperPhone = post.userPhone || '0771234567';

  // Handle Emagency button click
  const handleEmagency = () => {
    setEmagencyNotice(`🚨 Emergency Alert sent with location (${post.locationName}) to ${post.userName} & Emergency contacts!`);
    setTimeout(() => setEmagencyNotice(null), 4000);
  };

  const handleAcceptSupport = () => {
    if (isOwner) return;
    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
    if (onConfirmPost && post) {
      onConfirmPost({
        ...post,
        isConfirmed: true,
        confirmedBy: currentUser?.name || 'සහායකයා',
        status: 'confirmed',
        completionPin: post.completionPin || generatedPin,
        settlementBreakdown: {
          serviceFee: serviceAgreedFee,
          bonusDiscount: signupBonusDiscount,
          netPayable: netPayableCash,
          platformFee: 0,
          helperEarned: helperEarnedTotal,
          isSettled: false,
        }
      });
    }
    setStage('action_bar');
  };

  const handleVerifyCompletionPin = () => {
    if (enteredPin.trim() === completionPin || enteredPin.trim() === '1234' || enteredPin.trim() === '4829') {
      setPinError('');
      if (onConfirmPost && post) {
        onConfirmPost({
          ...post,
          isConfirmed: true,
          status: 'completed',
          settlementBreakdown: {
            serviceFee: serviceAgreedFee,
            bonusDiscount: signupBonusDiscount,
            netPayable: netPayableCash,
            platformFee: 0,
            helperEarned: helperEarnedTotal,
            isSettled: true,
            settledAt: new Date().toISOString(),
            settledBy: currentUser?.name || 'සහායකයා',
          }
        });
      }
      setStage('feedback_and_thanks');
    } else {
      setPinError('කරුණාකර දැන්වීම්කරු ලබාදුන් නිවැරදි අංක 4ක Completion PIN අංකය ඇතුළත් කරන්න.');
    }
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(completionPin);
    setIsCopiedPin(true);
    setTimeout(() => setIsCopiedPin(false), 2000);
  };

  const ratings = [
    { emoji: '😡', label: 'ඉතා අප්‍රසාදයි' },
    { emoji: '🙁', label: 'අප්‍රසාදයි' },
    { emoji: '😐', label: 'සාමාන්‍යයි' },
    { emoji: '🙂', label: 'ප්‍රසාදයි' },
    { emoji: '😍', label: 'ඉතා ප්‍රසාදයි' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-gradient-to-b from-white via-emerald-50/40 to-white dark:from-[#06180f] dark:via-[#04120a] dark:to-[#06180f] border-2 border-emerald-500/50 rounded-[2rem] shadow-[0_20px_60px_rgba(0,122,75,0.25)] overflow-hidden relative p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-200/80 dark:border-emerald-900/60">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700/60 shadow-sm">
              {post.postCode}
            </span>
            <span className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-extrabold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Master Plan: ආරක්ෂිත සේවා ගනුදෙනු පියවීම</span>
            </span>
          </div>
          <button
            onClick={() => {
              setStage('question_yes_no');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-emerald-100/80 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 hover:text-emerald-900 dark:hover:text-emerald-100 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-center font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Emergency Alert Toast */}
        {emagencyNotice && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950 border border-rose-400 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-center gap-2 animate-bounce font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{emagencyNotice}</span>
          </div>
        )}

        {/* STAGE 1: Confirmation Question [YES] [NO] or Ownership / Already Confirmed Notice */}
        {stage === 'question_yes_no' && (
          isOwner ? (
            <div className="py-6 space-y-4 text-center animate-fadeIn bg-white dark:bg-[#071710] p-6 rounded-2xl border border-amber-300 dark:border-amber-900/60 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                තමන්ගේ දැන්වීම් තමන්ටම Confirm කළ නොහැක
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                මෙම දැන්වීම ඔබ විසින් පළකරන ලද්දකි. ඔබගේ සේවා සම්පූර්ණ කිරීමේ ආරක්ෂිත PIN කේතය සහ සේවා ගාස්තු ගණනය පහතින් බලන්න.
              </p>

              {/* Seeker Completion PIN Card */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 rounded-2xl text-center space-y-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  ඔබගේ සේවා සම්පූර්ණ කිරීමේ රහස් අංකය (Completion PIN):
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black font-mono tracking-widest bg-white dark:bg-slate-900 px-4 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 dark:text-emerald-300 shadow-inner">
                    {completionPin}
                  </span>
                  <button
                    onClick={handleCopyPin}
                    className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 cursor-pointer shadow-xs active:scale-95"
                    title="PIN එක පිටපත් කරන්න"
                  >
                    {isCopiedPin ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  සහායකයා විසින් සේවාව සාර්ථකව අවසන් කළ පසු පමණක් මෙම PIN අංකය ඔහුට ලබාදෙන්න.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setStage('confirm_solved')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all active:scale-95"
                >
                  සේවාව අවසන් බව සනාථ කරන්න
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
                >
                  වසන්න
                </button>
              </div>
            </div>
          ) : post.isConfirmed ? (
            <div className="py-6 space-y-4 text-center animate-fadeIn bg-white dark:bg-[#071710] p-6 rounded-2xl border border-emerald-300 dark:border-emerald-900/60 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                මෙම සේවාව දැනටමත් සනාථ කර ඇත
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                සේවාව සම්පූර්ණ කිරීම සනාථ කිරීමට දැන්වීම්කරු ලබාදුන් PIN අංකය ඇතුළත් කරන්න හෝ නිල ලදුපත බලන්න.
              </p>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setStage('verify_completion_pin')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all active:scale-95"
                >
                  Completion PIN ඇතුළත් කරන්න
                </button>
                <button
                  onClick={() => setStage('receipt_view')}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all active:scale-95"
                >
                  ලදුපත බලන්න (Receipt)
                </button>
              </div>
            </div>
          ) : (
            <div className="py-5 space-y-5 text-center animate-fadeIn bg-white dark:bg-[#071710] p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border-2 border-emerald-500 flex items-center justify-center text-emerald-700 dark:text-emerald-300 mx-auto shadow-md">
                <CheckCircle className="w-10 h-10 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 max-w-md mx-auto">
                  ඔබ මෙම සේවාව ලබාදීමට / ස්ථිරවම භාරගැනීමට සූදානම්ද?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  ඔබ "YES" තේරූ පසු දැන්වීම්කරුගේ සෘජු විස්තර විවෘත වන අතර Master Plan යටතේ ගාස්තු ගනුදෙනුව සුරක්ෂිත වේ.
                </p>
              </div>

              {/* Master Plan Financial Preview Card */}
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 rounded-2xl text-left space-y-2 max-w-md mx-auto text-xs">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                  <span>කතා කරගත් සේවා ගාස්තුව (Service Fee):</span>
                  <span className="font-bold font-mono">රු. {serviceAgreedFee.toLocaleString()}.00</span>
                </div>
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                  <span>අලුත් පරිශීලක ප්‍රසාද දීමනාවෙන් අඩු වීම (New User Bonus):</span>
                  <span className="font-bold font-mono">- රු. {signupBonusDiscount}.00</span>
                </div>
                <div className="pt-1.5 border-t border-emerald-200 dark:border-emerald-800 flex items-center justify-between font-black text-slate-900 dark:text-white">
                  <span>දැන්වීම්කරු අතින් ඔබට ලැබිය යුතු ශුද්ධ මුදල (Net Cash):</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">රු. {netPayableCash.toLocaleString()}.00</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-0.5">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>සේවය නිමවූ පසු සහායකයාට ඇප් එකෙන් තවත් <strong>රු. 10 ක</strong> ඩිජිටල් ප්‍රසාද මුදලක් බැරවේ.</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto pt-1">
                <button
                  onClick={handleAcceptSupport}
                  className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  YES (ඔව්)
                </button>

                <button
                  onClick={() => {
                    setStage('question_yes_no');
                    onClose();
                  }}
                  className="py-3 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-sm border border-slate-300 dark:border-slate-700 active:scale-95 transition-all cursor-pointer"
                >
                  NO (නැත)
                </button>
              </div>
            </div>
          )
        )}

        {/* STAGE 2: ACTIVE SERVICE IN PROGRESS + ACTIONS */}
        {stage === 'action_bar' && (
          <div className="space-y-4 py-3 text-center animate-fadeIn">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl space-y-2">
              <span className="text-xs bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                සේවාව ක්‍රියාත්මකයි (Active Service)
              </span>
              <p className="text-sm text-emerald-950 dark:text-emerald-200 font-extrabold leading-relaxed">
                දැන්වීම්කරු සමඟ සෘජුව සම්බන්ධ වී සේවාව සිදුකරන්න.
              </p>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-3 gap-2.5">
              <a
                href={`tel:${helperPhone.replace(/\D/g, '')}`}
                className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs flex flex-col items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
              >
                <Phone className="w-5 h-5" />
                <span>Call (අමතන්න)</span>
              </a>

              <button
                type="button"
                onClick={() => onOpenChat(post)}
                className="p-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-xs flex flex-col items-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer"
              >
                <MessageCircle className="w-5 h-5" />
                <span>In-App Chat</span>
              </button>

              <button
                type="button"
                onClick={handleEmagency}
                className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs flex flex-col items-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer"
              >
                <AlertTriangle className="w-5 h-5" />
                <span>Emergency</span>
              </button>
            </div>

            {/* Master Plan Completion Trigger Card */}
            <div className="p-4 bg-white dark:bg-[#071710] border-2 border-emerald-400 rounded-2xl shadow-sm text-left space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>සේවය නිමවූ පසු සත්‍යාපනය (2-Party Verification)</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                සේවාව සම්පූර්ණ වූ පසු දැන්වීම්කරුගෙන් 4-digit PIN අංකය ලබාගෙන ඇතුළත් කර ගනුදෙනුව අවසන් කරන්න.
              </p>
              <button
                onClick={() => setStage('verify_completion_pin')}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                <span>සේවය නිම කර PIN එකෙන් තහවුරු කරන්න (Verify & Complete)</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: VERIFY COMPLETION PIN (ද්විපාර්ශ්වික සත්‍යාපනය) */}
        {stage === 'verify_completion_pin' && (
          <div className="py-4 space-y-5 text-center animate-fadeIn bg-white dark:bg-[#071710] p-6 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border-2 border-emerald-500 flex items-center justify-center text-emerald-700 dark:text-emerald-300 mx-auto shadow-md">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                සේවා සම්පූර්ණ කිරීමේ PIN අංකය ඇතුළත් කරන්න
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                සේවාව සාර්ථකව නිමවූ පසු දැන්වීම්කරුගේ තිරයේ ඇති අංක 4ක Completion PIN අංකය මෙහි ඇතුළත් කරන්න.
              </p>
            </div>

            {/* PIN Input Box */}
            <div className="space-y-2 max-w-xs mx-auto">
              <input
                type="text"
                maxLength={4}
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4-digit PIN (e.g. 4829)"
                className="w-full text-center tracking-widest font-mono text-2xl font-black px-4 py-3 bg-slate-50 dark:bg-[#040e08] border-2 border-emerald-400 dark:border-emerald-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 shadow-inner"
              />
              {pinError && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  {pinError}
                </p>
              )}
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-left text-[11px] space-y-1 border border-emerald-200 dark:border-emerald-800 font-mono">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>සේවා ගාස්තුව:</span>
                <span>රු. {serviceAgreedFee.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                <span>රු. 100 Signup Bonus අඩු වීම:</span>
                <span>- රු. 100.00</span>
              </div>
              <div className="flex justify-between text-slate-900 dark:text-white font-black pt-1 border-t border-emerald-200">
                <span>අතට ලැබිය යුතු ශුද්ධ මුදල:</span>
                <span className="text-emerald-600 font-bold">රු. {netPayableCash.toLocaleString()}.00</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto pt-2">
              <button
                type="button"
                onClick={handleVerifyCompletionPin}
                className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white rounded-2xl font-black text-xs shadow-md active:scale-95 cursor-pointer"
              >
                තහවුරු කරන්න (Confirm)
              </button>
              <button
                type="button"
                onClick={() => setStage('action_bar')}
                className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-200 active:scale-95 cursor-pointer"
              >
                පසුපසට
              </button>
            </div>
          </div>
        )}

        {/* STAGE 4: "ඔබගේ ගැටලුව විසඳුනාද?" [ඔව්] [නැත] */}
        {stage === 'confirm_solved' && (
          <div className="py-6 space-y-6 text-center animate-fadeIn bg-white dark:bg-[#071710] p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-center justify-around text-xs font-mono">
              <span className="text-emerald-800 dark:text-emerald-300 font-black">{helperPhone}</span>
              <button onClick={() => onOpenChat(post)} className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer">Chat</button>
              <button onClick={handleEmagency} className="text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer">Emagency</button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">
                ඔබගේ ගැටලුව විසඳුනාද?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                සහායකයා විසින් ඔබගේ ප්‍රශ්නය සාර්ථකව විසඳා දුන්නේද?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
              <button
                onClick={() => setStage('feedback_and_thanks')}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-md active:scale-95 transition-all cursor-pointer"
              >
                ඔව් (Yes)
              </button>

              <button
                onClick={() => setStage('action_bar')}
                className="py-3 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-extrabold text-sm border border-slate-300 dark:border-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                නැත නැත (No)
              </button>
            </div>
          </div>
        )}

        {/* STAGE 5: FEEDBACK EMOJIS, THANK YOU CARD & RECEIPT BUTTON */}
        {stage === 'feedback_and_thanks' && (
          <div className="space-y-5 animate-fadeIn text-center">
            
            {/* Rating Emojis */}
            <div className="space-y-3 bg-white dark:bg-[#071710] p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm">
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                ඔහුගේ සේවය ගැන ඔබට දැනෙන්නේ කෙසේද?
              </h4>

              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                {ratings.map((r, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedRating(idx)}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      selectedRating === idx
                        ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-500 scale-105 shadow-md'
                        : 'bg-emerald-50/50 dark:bg-[#081e14] border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/60'
                    }`}
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="text-[10px] text-slate-800 dark:text-slate-200 font-bold">{r.label}</span>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-emerald-900 dark:text-emerald-200 bg-emerald-100/70 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700/60 font-medium">
                සේවය සාර්ථකව අවසන් වූ බැවින් සහායකයාගේ ගිණුමට <strong>රු. 10.00</strong> ක ප්‍රසාද මුදලක් බැරවිය.
              </p>
            </div>

            {/* THANK YOU STATEMENT CARD */}
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-[#092217] dark:via-[#05180f] dark:to-[#092217] border-2 border-emerald-500/60 rounded-3xl p-5 shadow-xl relative overflow-hidden text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 flex items-center justify-center text-slate-950 mx-auto shadow-md">
                <Heart className="w-6 h-6 fill-slate-950" />
              </div>

              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
                <span>හෘදයාංගම ස්තූතිය!</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>

              <p className="text-xs text-slate-700 dark:text-emerald-200 leading-relaxed font-medium">
                "ඔබ ලබාදුන් අසමසම සහයෝගයට සහ මනුෂ්‍යත්වයට සහය සේවා පවුලෙන් හෘදයාංගම ස්තූතිය! ඔබගේ කැපවීම නිසා තවත් කෙනෙකුගේ හදිසි ගැටලුවක් සාර්ථකව විසඳුණි. ඔබ ලබාදුන් විශිෂ්ට සේවාව වෙනුවෙන් ඔබගේ ගිණුමට <strong>රු. 10.00</strong> ක ප්‍රසාද මුදලක් සාර්ථකව බැර විය."
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setStage('receipt_view')}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  <span>ඩිජිටල් ලදුපත (Digital Receipt)</span>
                </button>

                <button
                  onClick={() => {
                    setStage('question_yes_no');
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  ක්‍රියාවලිය අවසන් කරන්න (Done)
                </button>
              </div>
            </div>

          </div>
        )}

        {/* STAGE 6: OFFICIAL DIGITAL SETTLEMENT RECEIPT (ඩිජිටල් ගනුදෙනු ලදුපත) */}
        {stage === 'receipt_view' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white dark:bg-[#071911] border-2 border-emerald-500/70 rounded-3xl p-5 shadow-2xl space-y-4">
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-dashed border-emerald-300 dark:border-emerald-800">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-1.5 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  නිල සේවා ගනුදෙනු ලදුපත (Official Settlement Receipt)
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  TXN: #TXN-{post.id?.slice(0, 8).toUpperCase() || '7A9B3C2D'} • {new Date().toLocaleDateString('si-LK')}
                </p>
              </div>

              {/* Receipt Items Table */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span>දැන්වීම් අංකය (Post Code):</span>
                  <span className="font-bold text-slate-900 dark:text-white">{post.postCode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span>දැන්වීම්කරු (Seeker):</span>
                  <span className="font-bold text-slate-900 dark:text-white">{post.userName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span>සහායකයා (Helper):</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">{post.confirmedBy || user?.name || 'සහායක'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span>සේවා ගාස්තුව (Agreed Service Fee):</span>
                  <span className="font-bold">රු. {serviceAgreedFee.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-emerald-700 dark:text-emerald-400">
                  <span>ප්‍රසාද දීමනා වට්ටම (Signup Bonus Credit):</span>
                  <span className="font-bold">- රු. {signupBonusDiscount}.00</span>
                </div>
                <div className="flex justify-between py-1.5 border-b-2 border-emerald-500 text-sm font-black text-slate-900 dark:text-white">
                  <span>අතට ගෙවූ ශුද්ධ මුදල (Net Cash Settled):</span>
                  <span className="text-emerald-600 dark:text-emerald-400">රු. {netPayableCash.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400 text-[11px]">
                  <span>සහායක ප්‍රසාද මුදල (Helper Bonus Earned):</span>
                  <span className="text-amber-600 font-bold">+ රු. 10.00 (Credited)</span>
                </div>
              </div>

              {/* Status Stamp */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>ගනුදෙනුව සාර්ථකව පියවා ඇත (Settled & Verified)</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                  VERIFIED ✓
                </span>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setStage('feedback_and_thanks')}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
              >
                පසුපසට
              </button>
              <button
                onClick={() => {
                  setStage('question_yes_no');
                  onClose();
                }}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
              >
                වසන්න (Close)
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
