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
  ExternalLink
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
  | 'question_yes_no'      // 1. "ඔබ මෙම සේවාව ලබාදීමට / ස්ථිරවම භාරගැනීමට සූදානම්ද?" [YES] [NO]
  | 'action_bar'            // 2. [Phone] [Map Navigation] [Chat] [Emagency] [ක්‍රියාව අවසන්]
  | 'confirm_solved'        // 3. "ඔබගේ ගැටලුව විසඳුනාද?" [ඔව්] [නැත නැත]
  | 'feedback_and_thanks';  // 4. Rating Emojis + Rs. 10 credited + Thank You Statement Card

export const QuickServiceConfirmWorkflow: React.FC<QuickServiceConfirmWorkflowProps> = ({
  post,
  isOpen,
  onClose,
  onOpenChat,
  currentUser,
  onConfirmPost,
}) => {
  const [stage, setStage] = useState<Stage>('question_yes_no');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [emagencyNotice, setEmagencyNotice] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(8);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (stage === 'action_bar' && isOpen) {
      setCountdown(8);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onClose();
            setStage('question_yes_no');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [stage, isOpen, onClose]);

  if (!isOpen || !post) return null;

  const normalizePhone = (phone?: string) => (phone ? phone.replace(/[^0-9]/g, '') : '');
  const isOwner = Boolean(
    currentUser && (
      (currentUser.userId && post.userId && (currentUser.userId === post.userId || currentUser.id === post.userId)) ||
      (currentUser.phone && post.userPhone && normalizePhone(currentUser.phone) === normalizePhone(post.userPhone)) ||
      (currentUser.name && post.userName && currentUser.name.trim().toLowerCase() === post.userName.trim().toLowerCase())
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
    if (onConfirmPost && post) {
      onConfirmPost({
        ...post,
        isConfirmed: true,
        confirmedBy: currentUser.name,
        status: 'confirmed',
      });
    }
    setStage('action_bar');
  };

  const ratings = [
    { emoji: '😡', label: 'ඉතා අප්‍රසාදයි' },
    { emoji: '🙁', label: 'අප්‍රසාදයි' },
    { emoji: '😐', label: 'සාමාන්‍යයි' },
    { emoji: '🙂', label: 'ප්‍රසාදයි' },
    { emoji: '😍', label: 'ඉතා ප්‍රසාදයි' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-gradient-to-b from-white via-emerald-50/40 to-white dark:from-[#06180f] dark:via-[#04120a] dark:to-[#06180f] border-2 border-emerald-500/50 rounded-[2rem] shadow-[0_20px_60px_rgba(0,122,75,0.25)] overflow-hidden relative p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-200/80 dark:border-emerald-900/60">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700/60 shadow-sm">
              {post.postCode}
            </span>
            <span className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-extrabold">සහය තහවුරු කිරීමේ ක්‍රියාවලිය</span>
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
                මෙම දැන්වීම ඔබ විසින් පළකරන ලද්දකි. සහය දැක්වීමට ඉදිරිපත් වූ අය අතුරින් සහායකයෙකු තෝරාගැනීමට "කැමැත්ත දැක්වූවන්" බොත්තම භාවිතා කරන්න.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
              >
                වසන්න
              </button>
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
                මෙම දැන්වීම සඳහා සහය ස්ථිර කර අවසන් බැවින් නැවත confirm කිරීමේ අවශ්‍යතාවයක් නොමැත.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
              >
                වසන්න
              </button>
            </div>
          ) : (
            <div className="py-6 space-y-6 text-center animate-fadeIn bg-white dark:bg-[#071710] p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border-2 border-emerald-500 flex items-center justify-center text-emerald-700 dark:text-emerald-300 mx-auto shadow-md">
                <CheckCircle className="w-10 h-10 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 max-w-md mx-auto">
                  ඔබ මෙම සේවාව ලබාදීමට / ස්ථිරවම භාරගැනීමට සූදානම්ද?
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
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

        {/* STAGE 4: ACTION BAR */}
        {stage === 'action_bar' && (
          <div className="space-y-4 py-4 text-center animate-fadeIn">
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl">
              <p className="text-sm sm:text-base text-emerald-900 dark:text-emerald-200 font-extrabold leading-relaxed">
                සහය අවශ්‍ය පුද්ගලයා ඔබ තෝරාගන්නාතෙක් රැඳීසිටින්න.
              </p>
            </div>
          </div>
        )}

        {/* STAGE 5: "ඔබගේ ගැටලුව විසඳුනාද?" [ඔව්] [නැත නැත] */}
        {stage === 'confirm_solved' && (
          <div className="py-6 space-y-6 text-center animate-fadeIn bg-white dark:bg-[#071710] p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-center justify-around text-xs font-mono">
              <span className="text-emerald-800 dark:text-emerald-300 font-black">{helperPhone}</span>
              <button onClick={() => onOpenChat(post)} className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline">Chat</button>
              <button onClick={handleEmagency} className="text-rose-600 dark:text-rose-400 font-bold hover:underline">Emagency</button>
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

        {/* STAGE 6: FEEDBACK EMOJIS & THANK YOU CARD */}
        {stage === 'feedback_and_thanks' && (
          <div className="space-y-6 animate-fadeIn text-center">
            
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
                සේවය අවසන් වූ පසු සහායකයාගේ ගිණුමට <strong>රු. 10 ක්</strong> ප්‍රසාද මුදලක් බැරවේ.
              </p>
            </div>

            {/* THANK YOU STATEMENT CARD */}
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-[#092217] dark:via-[#05180f] dark:to-[#092217] border-2 border-emerald-500/60 rounded-3xl p-6 shadow-xl relative overflow-hidden text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 flex items-center justify-center text-slate-950 mx-auto shadow-md">
                <Heart className="w-6 h-6 fill-slate-950" />
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
                <span>හෘදයාංගම ස්තූතිය!</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>

              <p className="text-xs text-slate-700 dark:text-emerald-200 leading-relaxed font-medium">
                "ඔබ ලබාදුන් අසමසම සහයෝගයට සහ මනුෂ්‍යත්වයට සහය සේවා පවුලෙන් හෘදයාංගම ස්තූතිය! ඔබගේ කැපවීම නිසා තවත් කෙනෙකුගේ හදිසි ගැටලුවක් සාර්ථකව විසඳුණි. ඔබ ලබාදුන් විශිෂ්ට සේවාව වෙනුවෙන් ඔබගේ ගිණුමට <strong>රු. 10.00</strong> ක ප්‍රසාද මුදලක් සාර්ථකව බැර විය."
              </p>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => {
                    setStage('question_yes_no');
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  ක්‍රියාවලිය අවසන් කරන්න (Done)
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
