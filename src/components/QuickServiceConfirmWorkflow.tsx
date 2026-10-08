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
  Clock,
  Car,
  Wrench,
  ThumbsUp,
  ThumbsDown,
  Star,
  RotateCcw
} from 'lucide-react';
import { HelpPost, User as UserType, RatingTier, ServiceBill } from '../types';
import { 
  verifyAndStartJobWithPin, 
  submitServiceBill, 
  rejectServiceBill, 
  confirmServiceCompletionAndReview, 
  calculateTravelFee,
  RATING_TIER_CONFIG,
  maskNicNumber
} from '../utils/serviceWorkflowManager';

interface QuickServiceConfirmWorkflowProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (post: HelpPost) => void;
  currentUser: UserType;
  onConfirmPost?: (post: HelpPost) => void;
}

type Stage = 
  | 'start_pin_verification'  // 1. Helper enters 4-digit Start PIN upon arrival
  | 'job_in_progress'         // 2. Active Service in Progress
  | 'helper_submit_bill'      // 3. Helper prepares and submits bill (Travel km*100 + Material cost)
  | 'seeker_review_bill'      // 4. Seeker reviews: [ස්ථිරයි] vs [තවම අවසන් නැත]
  | 'feedback_and_rating'     // 5. 6-Tier Rating Buttons + Review Comment Box
  | 'receipt_view';           // 6. Official Digital Settlement Receipt

export const QuickServiceConfirmWorkflow: React.FC<QuickServiceConfirmWorkflowProps> = ({
  post,
  isOpen,
  onClose,
  onOpenChat,
  currentUser,
  onConfirmPost,
}) => {
  const [activePost, setActivePost] = useState<HelpPost | null>(post);
  const [stage, setStage] = useState<Stage>('start_pin_verification');
  
  // Inputs
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isCopiedPin, setIsCopiedPin] = useState<boolean>(false);
  const [emagencyNotice, setEmagencyNotice] = useState<string | null>(null);

  // Bill builder states
  const [laborFee, setLaborFee] = useState<number>(1500);
  const [materialCost, setMaterialCost] = useState<number>(0);
  const [materialNotes, setMaterialNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectBox, setShowRejectBox] = useState<boolean>(false);

  // Rating & Review states
  const [selectedTier, setSelectedTier] = useState<RatingTier>('excellent');
  const [reviewComment, setReviewComment] = useState<string>('');

  useEffect(() => {
    if (post) {
      setActivePost(post);

      if (post.payment) {
        const match = post.payment.match(/\d[\d,.]*/);
        if (match) {
          const num = parseFloat(match[0].replace(/,/g, ''));
          setLaborFee(isNaN(num) ? 1500 : num);
        }
      }

      if (post.status === 'completed' || post.serviceStage === 'completed') {
        setStage('receipt_view');
      } else if (post.serviceStage === 'bill_submitted') {
        setStage('seeker_review_bill');
      } else if (post.serviceStage === 'in_progress') {
        setStage('job_in_progress');
      } else {
        setStage('start_pin_verification');
      }
    }
  }, [post]);

  if (!isOpen || !activePost) return null;

  const normalizePhone = (phone?: string) => (phone ? phone.replace(/[^0-9]/g, '') : '');
  const isOwner = Boolean(
    currentUser && (
      (currentUser.userId && activePost.userId && (currentUser.userId === activePost.userId || (currentUser.id && currentUser.id === activePost.userId))) ||
      (currentUser.id && activePost.userId && currentUser.id === activePost.userId) ||
      (currentUser.phone && activePost.userPhone && normalizePhone(currentUser.phone) === normalizePhone(activePost.userPhone)) ||
      (currentUser.name && activePost.userName && currentUser.name.trim().toLowerCase() === activePost.userName.trim().toLowerCase())
    )
  );

  const startPin = activePost.startPin || activePost.completionPin || '4829';
  const helperPhone = activePost.confirmedHelperPhone || activePost.userPhone || '0771234567';
  const travelFee = calculateTravelFee(activePost.distanceKm || 3.0, activePost.transport);
  const totalCalculatedBill = laborFee + travelFee + materialCost;

  const handleEmagency = () => {
    setEmagencyNotice(`🚨 Emergency Alert sent with location (${activePost.locationName}) to ${activePost.userName} & Emergency contacts!`);
    setTimeout(() => setEmagencyNotice(null), 4000);
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(startPin);
    setIsCopiedPin(true);
    setTimeout(() => setIsCopiedPin(false), 2000);
  };

  const handleStartJob = async () => {
    const res = await verifyAndStartJobWithPin({
      post: activePost,
      enteredPin,
    });

    if (res.success && res.updatedPost) {
      setActivePost(res.updatedPost);
      if (onConfirmPost) onConfirmPost(res.updatedPost);
      setPinError('');
      setStage('job_in_progress');
    } else {
      setPinError(res.error || 'වැරදි PIN අංකයකි.');
    }
  };

  const handleSubmitBill = async () => {
    const updated = await submitServiceBill({
      post: activePost,
      laborFee,
      travelFee,
      materialCost,
      materialNotes,
      helperUser: currentUser,
    });
    setActivePost(updated);
    if (onConfirmPost) onConfirmPost(updated);
    setStage('seeker_review_bill');
  };

  const handleRejectBill = async () => {
    const updated = await rejectServiceBill({
      post: activePost,
      reason: rejectionReason || 'වැඩේ තවම නිමවී නොමැත.',
    });
    setActivePost(updated);
    if (onConfirmPost) onConfirmPost(updated);
    setShowRejectBox(false);
    setStage('job_in_progress');
  };

  const handleApproveBill = () => {
    setStage('feedback_and_rating');
  };

  const handleSubmitReviewAndComplete = async () => {
    const updated = await confirmServiceCompletionAndReview({
      post: activePost,
      ratingTier: selectedTier,
      reviewComment,
      reviewerUser: currentUser,
    });
    setActivePost(updated);
    if (onConfirmPost) onConfirmPost(updated);
    setStage('receipt_view');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-gradient-to-b from-white via-emerald-50/30 to-white dark:from-[#06180f] dark:via-[#04120a] dark:to-[#06180f] border-2 border-emerald-500/60 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,122,75,0.35)] overflow-hidden relative p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-200/80 dark:border-emerald-900/60">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700/60 shadow-sm">
              {activePost.postCode}
            </span>
            <span className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-extrabold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>ආරක්ෂිත සේවා ගනුදෙනු පද්ධතිය</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-100/80 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 flex items-center justify-center font-bold transition-all cursor-pointer"
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

        {/* STAGE 1: START PIN VERIFICATION */}
        {stage === 'start_pin_verification' && (
          isOwner ? (
            <div className="py-4 space-y-4 text-center animate-fadeIn bg-white dark:bg-[#071710] p-6 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                සේවාව ආරම්භ කිරීමේ රහස් Start PIN අංකය
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                සහායකයා ඔබගේ ස්ථානයට පැමිණි පසු වැඩේ ආරම්භ කිරීමට (Start Job) මෙම අංක 4ක Start PIN එක ඔහුට ලබාදෙන්න.
              </p>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 rounded-2xl text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-black font-mono tracking-widest bg-white dark:bg-slate-900 px-5 py-2 rounded-xl border border-emerald-400 text-emerald-700 dark:text-emerald-300 shadow-inner">
                    {startPin}
                  </span>
                  <button
                    onClick={handleCopyPin}
                    className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 cursor-pointer shadow-xs active:scale-95"
                    title="PIN එක පිටපත් කරන්න"
                  >
                    {isCopiedPin ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 block">
                  සහායකයා පැමිණ මෙම PIN අංකය ඇතුළත් කළ පසු සේවාව ආරම්භ වේ.
                </span>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => setStage('job_in_progress')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  සේවාව ක්‍රියාත්මක තිරය බලන්න
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  වසන්න
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4 text-center animate-fadeIn bg-white dark:bg-[#071710] p-6 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 mx-auto">
                <KeyIcon className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                සේවාව ආරම්භ කිරීමට Start PIN එක ඇතුළත් කරන්න
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                ඔබ දැන්වීම්කරුගේ ස්ථානයට පැමිණි පසු වැඩේ ආරම්භ කිරීමට දැන්වීම්කරුගේ තිරයේ ඇති අංක 4ක Start PIN එක ඉල්ලා මෙහි ඇතුළත් කරන්න.
              </p>

              <div className="space-y-2 max-w-xs mx-auto">
                <input
                  type="text"
                  maxLength={4}
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Start PIN (e.g. 4829)"
                  className="w-full text-center tracking-widest font-mono text-2xl font-black px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-emerald-400 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 shadow-inner"
                />
                {pinError && (
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    {pinError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto pt-2">
                <button
                  onClick={handleStartJob}
                  className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white rounded-2xl font-black text-xs shadow-md active:scale-95 cursor-pointer"
                >
                  🚀 වැඩේ ආරම්භ කරන්න (Start Job)
                </button>
                <button
                  onClick={onClose}
                  className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  පසුව
                </button>
              </div>
            </div>
          )
        )}

        {/* STAGE 2: JOB IN PROGRESS */}
        {stage === 'job_in_progress' && (
          <div className="space-y-4 py-3 text-center animate-fadeIn">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl space-y-2">
              <span className="text-xs bg-emerald-600 text-white font-black px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                සේවාව ක්‍රියාත්මකයි (Job In Progress)
              </span>
              <p className="text-sm text-emerald-950 dark:text-emerald-200 font-extrabold leading-relaxed">
                සේවාව මේ වන විට සිදුකෙරෙමින් පවතී.
              </p>
              {activePost.startedAt && (
                <span className="text-[11px] text-slate-500 font-mono block">
                  ආරම්භ කළ වේලාව: {new Date(activePost.startedAt).toLocaleTimeString('si-LK')}
                </span>
              )}
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
                onClick={() => onOpenChat(activePost)}
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
                <span>Emergency SOS</span>
              </button>
            </div>

            {/* Finish Job Trigger */}
            <div className="p-4 bg-white dark:bg-[#071710] border-2 border-emerald-400 rounded-2xl shadow-sm text-left space-y-2.5">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>සේවය නිමවූ පසු බිල්පත ඉදිරිපත් කිරීම</span>
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                වැඩේ අවසන් වූ පසු සහායකයා විසින් දුර සහ අමතර වියදම් ඇතුළත් කර බිල්පත ඉදිරිපත් කළ යුතුය.
              </p>
              <button
                onClick={() => setStage('helper_submit_bill')}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Receipt className="w-4 h-4" />
                <span>🏁 වැඩේ අවසන් - බිල්පත ඉදිරිපත් කරන්න (Submit Final Bill)</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: HELPER SUBMITS BILL */}
        {stage === 'helper_submit_bill' && (
          <div className="space-y-4 py-2 animate-fadeIn">
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                අවසන් සේවා බිල්පත සකස් කිරීම
              </h3>
              <p className="text-xs text-slate-500">
                පැමිණි දුර සහ සේවාවට යෙදූ අමතර බඩුබාහිරාදි වියදම් ඇතුළත් කරන්න.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-[#071911] border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">කතා කරගත් මූලික සේවා ගාස්තුව:</span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                  රු. {laborFee.toLocaleString()}.00
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">ගමන් වියදම් දීමනාව:</span>
                  <span className="text-[10px] text-slate-500">මෝටර් සයිකල් දුර ~{(travelFee / 100).toFixed(1)} km × රු. 100</span>
                </div>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                  + රු. {travelFee.toLocaleString()}.00
                </span>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  අමතර බඩුබාහිරාදි වියදම් (Material & Parts Cost):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={materialCost || ''}
                    onChange={(e) => setMaterialCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="රු. 0.00"
                    className="col-span-1 p-2 bg-slate-50 dark:bg-slate-900 border border-emerald-300 rounded-xl font-mono text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={materialNotes}
                    onChange={(e) => setMaterialNotes(e.target.value)}
                    placeholder="විස්තරය (උදා: වයර් සහ ස්විච්)"
                    className="col-span-2 p-2 bg-slate-50 dark:bg-slate-900 border border-emerald-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="border-t-2 border-emerald-500 pt-2 flex items-center justify-between text-sm font-black text-slate-900 dark:text-white">
                <span>මුළු එකතුව (Total Bill):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                  රු. {totalCalculatedBill.toLocaleString()}.00
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleSubmitBill}
                className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white rounded-2xl font-black text-xs shadow-md active:scale-95 cursor-pointer"
              >
                බිල්පත යවන්න (Submit Bill)
              </button>
              <button
                onClick={() => setStage('job_in_progress')}
                className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs"
              >
                පසුපසට
              </button>
            </div>
          </div>
        )}

        {/* STAGE 4: SEEKER REVIEWS BILL */}
        {stage === 'seeker_review_bill' && (
          <div className="space-y-4 py-2 animate-fadeIn text-center">
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                ඉදිරිපත් කළ සේවා බිල්පත පරීක්ෂා කිරීම
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                සහායකයා විසින් සේවාව අවසන් කර පහත බිල්පත ඉදිරිපත් කර ඇත.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-[#071911] border-2 border-emerald-400 rounded-2xl space-y-2.5 text-xs text-left">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>සේවා ගාස්තුව:</span>
                <span className="font-mono font-bold">රු. {laborFee.toLocaleString()}.00</span>
              </div>

              {travelFee > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>ගමන් වියදම් දීමනාව (කි.මී. {(travelFee/100).toFixed(1)} × රු. 100):</span>
                  <span className="font-mono font-bold">+ රු. {travelFee.toLocaleString()}.00</span>
                </div>
              )}

              {materialCost > 0 && (
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>අමතර බඩුබාහිරාදි ({materialNotes || 'ද්‍රව්‍ය'}):</span>
                  <span className="font-mono font-bold">+ රු. {materialCost.toLocaleString()}.00</span>
                </div>
              )}

              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                <span>ප්‍රසාද වට්ටම (Signup Bonus):</span>
                <span className="font-mono font-bold">- රු. 100.00</span>
              </div>

              <div className="border-t-2 border-emerald-500 pt-2 flex justify-between text-sm font-black text-slate-900 dark:text-white">
                <span>අතට ගෙවිය යුතු මුදල (Net Payable):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                  රු. {Math.max(0, totalCalculatedBill - 100).toLocaleString()}.00
                </span>
              </div>
            </div>

            {showRejectBox ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 rounded-xl space-y-2 text-left">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  වැඩේ තවම අවසන් නොවීමට හේතුව සඳහන් කරන්න:
                </span>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="උදා: තවම අලුත්වැඩියාව සම්පූර්ණ නැත / නැවත පරීක්ෂා කළ යුතුය..."
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 rounded-lg text-xs"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleRejectBill}
                    className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    නොවිසඳුනු බව තහවුරු කරන්න
                  </button>
                  <button
                    onClick={() => setShowRejectBox(false)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-800 text-xs rounded-lg cursor-pointer"
                  >
                    අවලංගු කරන්න
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleApproveBill}
                  className="py-3 px-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 text-white rounded-2xl font-black text-xs shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>✅ ස්ථිරයි - ගෙවීම සහතික කරන්න</span>
                </button>

                <button
                  onClick={() => setShowRejectBox(true)}
                  className="py-3 px-4 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border-2 border-rose-300 dark:border-rose-800 rounded-2xl font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>❌ තවම අවසන් නැත</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STAGE 5: 6-TIER RATINGS & REVIEW COMMENT */}
        {stage === 'feedback_and_rating' && (
          <div className="space-y-4 py-2 animate-fadeIn text-center">
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                සහායකයාගේ සේවය ඇගයීම (Rate Service)
              </h3>
              <p className="text-xs text-slate-500">
                ඔබ ලබාදෙන Rating එක සහායකයාගේ Leaderboard ශ්‍රේණියට සහ NIC ගිණුමට එකතු වේ.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {(Object.keys(RATING_TIER_CONFIG) as RatingTier[]).map((tierKey) => {
                const conf = RATING_TIER_CONFIG[tierKey];
                const isSelected = selectedTier === tierKey;
                return (
                  <button
                    key={tierKey}
                    type="button"
                    onClick={() => setSelectedTier(tierKey)}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 scale-105 shadow-md'
                        : 'bg-white dark:bg-[#071911] border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-2xl">{conf.emoji}</span>
                    <span className="text-[11px] font-extrabold text-slate-900 dark:text-white">{conf.labelSi}</span>
                    <span className={`text-[9px] font-mono font-bold ${conf.isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {conf.basePoints > 0 ? `+${conf.basePoints}` : conf.basePoints} Pts
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-left space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                සහායකයා පිළිබඳ ඔබගේ අදහස / විචාරය (Review Comment):
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="සහායකයාගේ කාර්යක්ෂමතාව, හැසිරීම සහ සේවාවේ ගුණාත්මකභාවය පිළිබඳ සටහන් කරන්න..."
                className="w-full p-3 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs focus:outline-none focus:border-emerald-600"
                rows={3}
              />
            </div>

            <button
              onClick={handleSubmitReviewAndComplete}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 text-white font-black text-xs rounded-2xl shadow-md cursor-pointer active:scale-95"
            >
              සම්පූර්ණ කර ලදුපත ලබාගන්න (Complete & View Receipt)
            </button>
          </div>
        )}

        {/* STAGE 6: OFFICIAL DIGITAL SETTLEMENT RECEIPT */}
        {stage === 'receipt_view' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white dark:bg-[#071911] border-2 border-emerald-500/70 rounded-3xl p-5 shadow-2xl space-y-4">
              
              <div className="text-center pb-3 border-b border-dashed border-emerald-300 dark:border-emerald-800">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-1.5 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  නිල සේවා ගනුදෙනු ලදුපත (Official Settlement Receipt)
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  TXN: #TXN-{activePost.id?.slice(0, 8).toUpperCase() || '7A9B3C2D'} • {new Date().toLocaleDateString('si-LK')}
                </p>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span>දැන්වීම් අංකය (Post Code):</span>
                  <span className="font-bold text-slate-900 dark:text-white">{activePost.postCode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span>දැන්වීම්කරු (Seeker):</span>
                  <span className="font-bold text-slate-900 dark:text-white">{activePost.userName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span>සහායකයා (Helper):</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">{activePost.confirmedBy || 'සහායක'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span>සේවා ගාස්තුව:</span>
                  <span className="font-bold">රු. {laborFee.toLocaleString()}.00</span>
                </div>
                {travelFee > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-emerald-700 dark:text-emerald-400">
                    <span>ප්‍රවාහන දීමනාව (කි.මී. {(travelFee/100).toFixed(1)} × රු. 100):</span>
                    <span className="font-bold">+ රු. {travelFee.toLocaleString()}.00</span>
                  </div>
                )}
                {materialCost > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <span>අමතර බඩු වියදම්:</span>
                    <span className="font-bold">+ රු. {materialCost.toLocaleString()}.00</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-emerald-700 dark:text-emerald-400">
                  <span>ප්‍රසාද දීමනා වට්ටම (Signup Bonus):</span>
                  <span className="font-bold">- රු. 100.00</span>
                </div>
                <div className="flex justify-between py-1.5 border-b-2 border-emerald-500 text-sm font-black text-slate-900 dark:text-white">
                  <span>අතට ගෙවූ ශුද්ධ මුදල (Net Settled):</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    රු. {Math.max(0, totalCalculatedBill - 100).toLocaleString()}.00
                  </span>
                </div>
              </div>

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

            <div className="flex justify-center">
              <button
                onClick={onClose}
                className="px-8 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
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

function KeyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}
