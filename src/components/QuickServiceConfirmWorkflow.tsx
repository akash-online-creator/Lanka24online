import React, { useState } from 'react';
import { 
  Phone, 
  MapPin, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Heart, 
  Sparkles,
  Award,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { HelpPost, User as UserType } from '../types';
import { Card3D } from './Card3D';

interface QuickServiceConfirmWorkflowProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (post: HelpPost) => void;
  currentUser: UserType;
}

type Stage = 
  | 'question_yes_no'      // 1. "ගැටලුව මම සකසා දුන්නාම තැබීම." [YES] [NO]
  | 'waiting_seeker'        // 2. "සහය ඉල්ලූ මිතුරා ඔබට පිළිතුරක් ලබාදෙනතෙක්..."
  | 'seeker_choice'         // 3. [Profile View] [කැමතියි] [කැමති නැත]
  | 'profile_view'          // 3b. Shows Helper Profile Modal
  | 'action_bar'            // 4. [0771234567] [Map Navigation] [Chat] [Emagency] [ක්‍රියාව අවසන්]
  | 'confirm_solved'        // 5. "ඔබගේ ගැටලුව විසඳුනාද?" [ඔව්] [නැත නැත]
  | 'feedback_and_thanks';  // 6. Rating Emojis + Rs. 10 credited + Thank You Statement Card

export const QuickServiceConfirmWorkflow: React.FC<QuickServiceConfirmWorkflowProps> = ({
  post,
  isOpen,
  onClose,
  onOpenChat,
  currentUser,
}) => {
  const [stage, setStage] = useState<Stage>('question_yes_no');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [emagencyNotice, setEmagencyNotice] = useState<string | null>(null);

  if (!isOpen || !post) return null;

  const helperPhone = post.userPhone || '0771234567';

  // Handle Emagency button click
  const handleEmagency = () => {
    setEmagencyNotice(`🚨 Emergency Alert sent with location (${post.locationName}) to ${post.userName} & Emergency contacts!`);
    setTimeout(() => setEmagencyNotice(null), 4000);
  };

  const ratings = [
    { emoji: '😡', label: 'ඉතා අප්‍රසාදයි' },
    { emoji: '🙁', label: 'අප්‍රසාදයි' },
    { emoji: '😐', label: 'සාමාන්‍යයි' },
    { emoji: '🙂', label: 'ප්‍රසාදයි' },
    { emoji: '😍', label: 'ඉතා ප්‍රසාදයි' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-emerald-500/50 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden relative p-6 max-h-[90vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-slate-800 text-emerald-400 px-3 py-1 rounded-xl border border-slate-700">
              {post.postCode}
            </span>
            <span className="text-xs text-slate-300 font-semibold">සහය තහවුරු කිරීමේ ක්‍රියාවලිය</span>
          </div>
          <button
            onClick={() => {
              setStage('question_yes_no');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Emergency Alert Toast */}
        {emagencyNotice && (
          <div className="mb-4 p-3 bg-rose-950 border border-rose-500/50 text-rose-200 text-xs rounded-xl flex items-center gap-2 animate-bounce">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{emagencyNotice}</span>
          </div>
        )}

        {/* STAGE 1: "ගැටලුව මම සකසා දුන්නාම තැබීම." [YES] [NO] */}
        {stage === 'question_yes_no' && (
          <div className="py-6 space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto shadow-lg">
              <CheckCircle className="w-10 h-10 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">
                ගැටලුව මම සකසා දුන්නාම තැබීම.
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                ඔබ මෙම සේවාව ලබාදීමට / ස්ථිරවම භාරගැනීමට සූදානම්ද?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
              <button
                onClick={() => setStage('seeker_choice')}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-950 active:scale-95 transition-all"
              >
                YES (ඔව්)
              </button>

              <button
                onClick={() => {
                  setStage('question_yes_no');
                  onClose();
                }}
                className="py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-sm border border-slate-700 active:scale-95 transition-all"
              >
                NO (නැත)
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: SEEKER CHOICE: [Profile View] [කැමතියි] [කැමති නැත] */}
        {(stage === 'seeker_choice' || stage === 'waiting_seeker') && (
          <div className="space-y-5 animate-fadeIn">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-300 space-y-2">
              <p className="text-emerald-400 font-bold text-sm">
                සහය ඉල්ලූ මිතුරා ඔබට පිළිතුරක් ලබාදෙනතෙක් රැඳී සිටින්න.
              </p>
              <p className="text-slate-400 leading-relaxed">
                "සහය ඉල්ලූ මිතුරා ඔබව කැමැත්තෙන් සිටින පුද්ගලයෙක් නම් පහත අංකයට ඇමතීමට හැකියි. ඔබ ඔහුගෙන් සහය ගැනීමට කැමතිද?"
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setStage('profile_view')}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile View</span>
              </button>

              <button
                onClick={() => setStage('action_bar')}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold flex items-center justify-center gap-1 active:scale-95 shadow-md"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>කැමතියි</span>
              </button>

              <button
                onClick={() => {
                  setStage('question_yes_no');
                  onClose();
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>කැමති නැත</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3b: PROFILE VIEW MODAL */}
        {stage === 'profile_view' && (
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold text-xl">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{currentUser.name}</h4>
                <p className="text-xs text-emerald-400 font-mono">සහායක ශ්‍රේණිය: ★ 4.9/5 (සහාය වාර 14)</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-1 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <p><strong>දුරකථනය:</strong> {currentUser.phone}</p>
              <p><strong>විශේෂ හැකියාවන්:</strong> වාහන කාර්මික, තාක්ෂණික සහ සහන සේවා</p>
              <p><strong>ප්‍රතිචාර:</strong> "ඉතාමත් ඉක්මන් සහ විශ්වාසවන්ත සහායක් ලබා දුන්නා!"</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setStage('seeker_choice')}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl font-bold"
              >
                ආපසු
              </button>
              <button
                onClick={() => setStage('action_bar')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
              >
                සහාය පිළිගන්න (කැමතියි)
              </button>
            </div>
          </div>
        )}

        {/* STAGE 4: ACTION BAR */}
        {stage === 'action_bar' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-[11px] text-emerald-200 leading-relaxed">
              ඔබ සහය දීමට බලාපොරොත්තුවෙන් සිටින පුද්ගලයාගේ අතැති තොරතුරක් පහත දැක්වීමට කැමැත්තෙන්ම වන්න. සහය දැක්වීමට කැමති පලවන පරිශීලකයන්. එසේ නොවේ නම් සියලුම ඔවුන්ගේ අංකයන්ට රු 50 ක ගාස්තුව ඔබගෙන් අයකරගනිමින් සිදුවන බව කරුණාවෙන් සලකන්න.
            </div>

            {/* Exact Action Bar layout specified in PDF */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                සහය ඉල්ලන්නාගේ තොරතුරු &amp; ක්‍රියාකාරකම්
              </span>

              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* 1. Phone dialer */}
                <a
                  href={`tel:${helperPhone}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 font-mono text-xs rounded-xl font-bold transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{helperPhone}</span>
                </a>

                {/* 2. Map Navigation */}
                <a
                  href={`https://maps.google.com/?q=${post.lat || 7.0016},${post.lng || 79.9500}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-300 text-xs rounded-xl font-bold transition-all"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Map Navigation</span>
                  <ExternalLink className="w-3 h-3 text-cyan-400" />
                </a>

                {/* 3. Chat */}
                <button
                  onClick={() => onOpenChat(post)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 text-xs rounded-xl font-bold transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>

                {/* 4. Emagency */}
                <button
                  onClick={handleEmagency}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/50 text-rose-300 text-xs rounded-xl font-bold transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Emagency</span>
                </button>
              </div>

              {/* 5. ක්‍රියාව අවසන් Button */}
              <button
                onClick={() => setStage('confirm_solved')}
                className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>ක්‍රියාව අවසන් (End Action)</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 5: "ඔබගේ ගැටලුව විසඳුනාද?" [ඔව්] [නැත නැත] */}
        {stage === 'confirm_solved' && (
          <div className="py-6 space-y-6 text-center animate-fadeIn">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-around text-xs font-mono text-slate-300">
              <span className="text-emerald-400 font-bold">{helperPhone}</span>
              <button onClick={() => onOpenChat(post)} className="text-cyan-400 hover:underline">Chat</button>
              <button onClick={handleEmagency} className="text-rose-400 hover:underline">Emagency</button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">
                ඔබගේ ගැටලුව විසඳුනාද?
              </h3>
              <p className="text-xs text-slate-400">
                සහායකයා විසින් ඔබගේ ප්‍රශ්නය සාර්ථකව විසඳා දුන්නේද?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
              <button
                onClick={() => setStage('feedback_and_thanks')}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-950 active:scale-95 transition-all"
              >
                ඔව් (Yes)
              </button>

              <button
                onClick={() => setStage('action_bar')}
                className="py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-sm border border-slate-700 active:scale-95 transition-all"
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
            <div className="space-y-3">
              <h4 className="text-base font-bold text-white">
                ඔහුගේ සේවය ගැන ඔබට දැනෙන්නේ කෙසේද?
              </h4>

              <div className="flex items-center justify-center gap-3">
                {ratings.map((r, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedRating(idx)}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                      selectedRating === idx
                        ? 'bg-emerald-500/20 border-emerald-500 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="text-[10px] text-slate-300 font-semibold">{r.label}</span>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-emerald-300 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
                පහත අංකවලට ප්‍රසාදය වෙනුවෙන් සහය ඉල්ලූ පුද්ගලයා ඉහත පරිදි feedback එකක් ලබාදිය හැකි අතර සේවය අවසන් වූ පසු සේවය දුන් පුද්ගලයාගේ ගිණුමට <strong>රු. 10 ක්</strong> බැරවේ.
              </p>
            </div>

            {/* THANK YOU STATEMENT CARD - Exact requirement from PDF */}
            <Card3D className="bg-gradient-to-tr from-emerald-950 via-slate-900 to-teal-950 border-2 border-emerald-500/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 flex items-center justify-center text-slate-950 mx-auto shadow-lg">
                <Heart className="w-6 h-6 fill-slate-950" />
              </div>

              <h3 className="text-lg font-extrabold text-white flex items-center justify-center gap-2">
                <span>හෘදයාංගම ස්තූතිය!</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>

              <p className="text-xs text-emerald-200 leading-relaxed font-medium">
                "ඔබ ලබාදුන් අසමසම සහයෝගයට සහ මනුෂ්‍යත්වයට සහය සේවා පවුලෙන් හෘදයාංගම ස්තූතිය! ඔබගේ කැපවීම නිසා තවත් කෙනෙකුගේ හදිසි ගැටලුවක් සාර්ථකව විසඳුණි. ඔබ ලබාදුන් විශිෂ්ට සේවාව වෙනුවෙන් ඔබගේ ගිණුමට <strong>රු. 10.00</strong> ක ප්‍රසාද මුදලක් සාර්ථකව බැර විය."
              </p>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => {
                    setStage('question_yes_no');
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg active:scale-95"
                >
                  ක්‍රියාවලිය අවසන් කරන්න (Done)
                </button>
              </div>
            </Card3D>

          </div>
        )}

      </div>
    </div>
  );
};
