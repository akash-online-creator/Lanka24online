import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  MapPin, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle, 
  Heart, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Receipt, 
  FileCheck, 
  Check, 
  Copy, 
  Clock, 
  Car, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Calendar, 
  User as UserIcon,
  X
} from 'lucide-react';
import { HelpPost, User as UserType, RatingTier, BillItem, ServiceBill } from '../types';
import { 
  verifyAndStartJobWithPin, 
  submitServiceBill, 
  rejectServiceBill, 
  confirmServiceCompletionAndReview, 
  calculateTravelFee,
  generate9DigitInvoiceNumber,
  RATING_TIER_CONFIG
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
  | 'helper_submit_bill'      // 3. Helper prepares and submits bill (Dynamic Rows + Travel km*100)
  | 'seeker_review_bill'      // 4. Seeker reviews: [ස්ථිරයි] vs [තවම අවසන් නැත]
  | 'feedback_and_rating'     // 5. 6-Tier Rating Buttons + Review Comment Box
  | 'receipt_view';           // 6. Official 9-Digit Digital Settlement Invoice

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

  // Dynamic Multi-Item Bill Builder Rows: Left = Description, Right = Amount (No hardcoded 1500)
  const [billRows, setBillRows] = useState<BillItem[]>([
    { id: 'item_1', title: 'මූලික සේවා ගාස්තුව', amount: 0 }
  ]);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectBox, setShowRejectBox] = useState<boolean>(false);

  // Rating & Review states
  const [selectedTier, setSelectedTier] = useState<RatingTier>('excellent');
  const [reviewComment, setReviewComment] = useState<string>('');

  useEffect(() => {
    if (post) {
      setActivePost(post);

      if (post.serviceBill?.items && post.serviceBill.items.length > 0) {
        setBillRows(post.serviceBill.items);
      } else if (post.payment) {
        const match = post.payment.match(/\d[\d,.]*/);
        const parsedAmount = match ? parseFloat(match[0].replace(/,/g, '')) : 0;
        setBillRows([
          { id: 'item_1', title: 'මූලික සේවා ගාස්තුව', amount: isNaN(parsedAmount) ? 0 : parsedAmount }
        ]);
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
  
  const travelFee = calculateTravelFee(
    activePost.distanceKm || 3.0, 
    activePost.transport, 
    activePost.customTransportFee
  );

  const itemsTotalAmount = billRows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalCalculatedBill = itemsTotalAmount + travelFee;
  const officialInvoiceNumber = activePost.serviceBill?.invoiceNumber || activePost.invoiceNumber || '982401824';

  const handleAddBillRow = () => {
    setBillRows(prev => [
      ...prev,
      { id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, title: '', amount: 0 }
    ]);
  };

  const handleUpdateBillRow = (id: string, field: 'title' | 'amount', value: any) => {
    setBillRows(prev => prev.map(row => {
      if (row.id === id) {
        return {
          ...row,
          [field]: field === 'amount' ? Math.max(0, parseFloat(value) || 0) : value
        };
      }
      return row;
    }));
  };

  const handleRemoveBillRow = (id: string) => {
    if (billRows.length <= 1) return;
    setBillRows(prev => prev.filter(r => r.id !== id));
  };

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
      setPinError(res.error || 'ඇතුළත් කළ Start PIN අංකය වැරදියි.');
    }
  };

  const handleSubmitBill = async () => {
    const updated = await submitServiceBill({
      post: activePost,
      items: billRows,
      travelFee,
      totalAmount: totalCalculatedBill,
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
                  * මෙම රහස් අංකය පෙනෙන්නේ ඔබට පමණි. සහායකයා පැමිණි පසු පමණක් ලබාදෙන්න.
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
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                සේවාව ආරම්භ කිරීමට Start PIN එක ඇතුළත් කරන්න
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                ඔබ සේවා ස්ථානයට පැමිණි පසු වැඩේ ආරම්භ කිරීමට සේවාදායකයාගෙන් අංක 4ක Start PIN එක ඉල්ලා මෙහි ඇතුළත් කරන්න.
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
                  🚀 වැඩේ ආරම්භ කරන්න
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

        {/* STAGE 2: ACTIVE SERVICE IN PROGRESS */}
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

            {/* Helper: Bill Builder Button */}
            <div className="p-4 bg-white dark:bg-[#071710] border-2 border-emerald-400 rounded-2xl shadow-sm text-left space-y-2.5">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>සේවය නිමවූ පසු බිල්පත සකස් කිරීම</span>
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                සේවාව අවසන් වූ පසු විස්තරය සහ ගාස්තු ඇතුළත් කර අවසන් බිල්පත ඉදිරිපත් කරන්න.
              </p>
              <button
                onClick={() => setStage('helper_submit_bill')}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Receipt className="w-4 h-4" />
                <span>🧾 බිල සකසන්න (Prepare Final Bill)</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: HELPER DYNAMIC MULTI-ITEM BILL BUILDER */}
        {stage === 'helper_submit_bill' && (
          <div className="space-y-4 py-2 animate-fadeIn">
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                සේවා බිල්පත සකස් කිරීම (Bill Builder)
              </h3>
              <p className="text-xs text-slate-500">
                වම් පසින් විස්තරය හා දකුණු පසින් ගාස්තුව සටහන් කරන්න. (+) මඟින් පේළි එකතු කරන්න.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-[#071911] border-2 border-emerald-400 rounded-2xl space-y-3 text-xs">
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 font-bold text-slate-600 dark:text-slate-400 text-[11px] px-1">
                  <span className="col-span-7">විස්තරය (Description)</span>
                  <span className="col-span-4 text-right">ගාස්තුව (රු.)</span>
                  <span className="col-span-1"></span>
                </div>

                {billRows.map((row, index) => (
                  <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) => handleUpdateBillRow(row.id, 'title', e.target.value)}
                      placeholder={`අයිතමය ${index + 1} විස්තරය...`}
                      className="col-span-7 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="number"
                      min={0}
                      value={row.amount || ''}
                      onChange={(e) => handleUpdateBillRow(row.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      className="col-span-4 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-right text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                    <div className="col-span-1 flex justify-center">
                      {billRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBillRow(row.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="ඉවත් කරන්න"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddBillRow}
                  className="w-full py-2 px-3 border-2 border-dashed border-emerald-400 dark:border-emerald-700 rounded-xl text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>➕ තවත් ගාස්තුවක් එකතු කරන්න (Add Item)</span>
                </button>
              </div>

              {travelFee > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 p-2.5 rounded-xl">
                  <span className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ප්‍රවාහන දීමනාව ({activePost.transport}):</span>
                  </span>
                  <span className="font-mono font-black text-sm">
                    + රු. {travelFee.toLocaleString()}.00
                  </span>
                </div>
              )}

              <div className="border-t-2 border-emerald-500 pt-2.5 flex items-center justify-between text-sm font-black text-slate-900 dark:text-white">
                <span>සම්පූර්ණ මුළු වියදම (Total Amount):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                  රු. {totalCalculatedBill.toLocaleString()}.00
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleSubmitBill}
                className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white rounded-2xl font-black text-xs shadow-md active:scale-95 cursor-pointer"
              >
                🏁 බිල්පත ඉදිරිපත් කරන්න
              </button>
              <button
                type="button"
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
              <div className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                {billRows.map((item, idx) => (
                  <div key={item.id || idx} className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>{item.title || `අයිතමය ${idx + 1}`}:</span>
                    <span className="font-mono font-bold">රු. {(Number(item.amount) || 0).toLocaleString()}.00</span>
                  </div>
                ))}
              </div>

              {travelFee > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                  <span>ප්‍රවාහන දීමනාව:</span>
                  <span className="font-mono">+ රු. {travelFee.toLocaleString()}.00</span>
                </div>
              )}

              <div className="border-t-2 border-emerald-500 pt-2 flex justify-between text-sm font-black text-slate-900 dark:text-white">
                <span>ගෙවිය යුතු මුළු මුදල (Net Payable):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                  රු. {totalCalculatedBill.toLocaleString()}.00
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
                  placeholder="උදා: තවම වැඩේ නිමවී නැත / අඩුපාඩු පවතී..."
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 rounded-lg text-xs"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleRejectBill}
                    className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    තවම අවසන් නැති බව තහවුරු කරන්න
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
                  type="button"
                  onClick={handleApproveBill}
                  className="py-3 px-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 text-white rounded-2xl font-black text-xs shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>✅ ස්ථිරයි - ගෙවීම සහතික කරන්න</span>
                </button>

                <button
                  type="button"
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

        {/* STAGE 5: 6-TIER RATING BUTTONS & REVIEW COMMENT BOX */}
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
              සම්පූර්ණ කර නිල ඉන්වොයිසිය බලන්න (View Official Invoice)
            </button>
          </div>
        )}

        {/* STAGE 6: OFFICIAL 9-DIGIT DIGITAL SETTLEMENT INVOICE */}
        {stage === 'receipt_view' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white dark:bg-[#071911] border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
              
              {/* Header with App Name & Logo */}
              <div className="text-center pb-3 border-b-2 border-emerald-500 space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                    සහය
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-black text-slate-900 dark:text-white leading-none">
                      සහය සේවා (Sahaya Sewa)
                    </h2>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                      නිල සේවා ගනුදෙනු ඉන්වොයිසිය
                    </span>
                  </div>
                </div>

                {/* 9-Digit Invoice Number in Big Bold Font-Mono */}
                <div className="pt-1.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                    බිල්පත් අංකය (INVOICE NO)
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono tracking-widest text-emerald-700 dark:text-emerald-300">
                    #INV-{officialInvoiceNumber}
                  </span>
                </div>
              </div>

              {/* Service Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block">සහය වුණු පුද්ගලයා:</span>
                  <strong className="text-emerald-700 dark:text-emerald-300 text-xs">
                    {activePost.serviceBill?.helperName || activePost.confirmedBy || currentUser?.name || 'සහායක'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">සහය ලැබූ පුද්ගලයා:</span>
                  <strong className="text-slate-900 dark:text-white text-xs">
                    {activePost.serviceBill?.seekerName || activePost.userName}
                  </strong>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5">
                  <span className="text-slate-500 block">ආරම්භ කළ වේලාව:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {activePost.serviceBill?.startedAt ? new Date(activePost.serviceBill.startedAt).toLocaleTimeString('si-LK') : '10:00 AM'}
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5">
                  <span className="text-slate-500 block">අවසන් කළ වේලාව / දිනය:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {activePost.serviceBill?.endedAt ? new Date(activePost.serviceBill.endedAt).toLocaleTimeString('si-LK') : new Date().toLocaleTimeString('si-LK')} • {activePost.serviceBill?.date || new Date().toLocaleDateString('si-LK')}
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="space-y-2 text-xs font-mono">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-1 font-bold text-slate-500 flex justify-between">
                  <span>විස්තරය (Item Description)</span>
                  <span>ගාස්තුව (Amount)</span>
                </div>

                <div className="space-y-1.5">
                  {billRows.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between py-0.5 border-b border-dashed border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                      <span>{item.title || `අයිතමය ${idx + 1}`}</span>
                      <span className="font-bold">රු. {(Number(item.amount) || 0).toLocaleString()}.00</span>
                    </div>
                  ))}

                  {travelFee > 0 && (
                    <div className="flex justify-between py-0.5 border-b border-dashed border-slate-100 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 font-bold">
                      <span>ප්‍රවාහන දීමනාව ({activePost.transport})</span>
                      <span>+ රු. {travelFee.toLocaleString()}.00</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between py-2 border-t-2 border-emerald-500 text-sm font-black text-slate-900 dark:text-white pt-2">
                  <span>සම්පූර්ණ මුළු වියදම (TOTAL COST):</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-base">
                    රු. {totalCalculatedBill.toLocaleString()}.00
                  </span>
                </div>
              </div>

              {/* Verification Stamp */}
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>තහවුරු කළ නිල ඉන්වොයිසිය (Search bar එකෙන් පරීක්ෂා කළ හැක)</span>
                </div>
                <span className="text-[9px] font-mono bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
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
