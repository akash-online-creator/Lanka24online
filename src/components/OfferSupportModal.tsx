import React, { useState, useEffect } from 'react';
import { Send, Phone, MessageSquare, ExternalLink, CheckCircle2, MapPin, Compass, Clock, Lock, ShieldAlert } from 'lucide-react';
import { HelpPost, Language, LocationOption } from '../types';
import { translations } from '../data/translations';
import { calculateMotorcycleRoadDistance } from '../utils/geoUtils';
import { 
  inspectAndSanitizeMessage, 
  getUserStrikes, 
  recordPolicyViolation, 
  isUserPolicyBlocked 
} from '../utils/policyGuard';
import { PolicyViolationModal } from './PolicyViolationModal';
import { translateName } from '../utils/postTranslator';

interface OfferSupportModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSendReply: (postId: string, responderName: string, responderPhone: string, message: string) => void;
  lang: Language;
  currentLocation?: LocationOption;
  onNavigateToIssues?: () => void;
}

export const OfferSupportModal: React.FC<OfferSupportModalProps> = ({
  post,
  isOpen,
  onClose,
  onSendReply,
  lang,
  currentLocation,
  onNavigateToIssues,
}) => {
  const t = translations[lang];
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setMsg('');
      setSubmitted(false);
      setShowPolicyModal(false);
    }
  }, [isOpen]);

  // Policy Modal state
  const userKey = phone || name || 'helper_user';
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyStrikes, setPolicyStrikes] = useState<number>(() => getUserStrikes(userKey));
  const [isBlocked, setIsBlocked] = useState<boolean>(() => isUserPolicyBlocked(userKey));
  const [detectedTypes, setDetectedTypes] = useState<('phone' | 'link' | 'address')[]>([]);

  if (!isOpen || !post) return null;

  const isConfirmed = Boolean(post.isConfirmed);

  // Calculate Motorcycle Road Distance
  const viewerLat = currentLocation?.lat || 7.1710;
  const viewerLng = currentLocation?.lng || 79.8986;
  const viewerLocName = currentLocation?.nameSi || 'ඔබ සිටින ස්ථානය (නරඹන්නා)';

  const postLat = post.lat || 7.1710;
  const postLng = post.lng || 79.8986;
  const postLocName = post.locationName || 'දැන්වීම පළකළ ස්ථානය';

  const motorcycleRoute = calculateMotorcycleRoadDistance(
    postLat,
    postLng,
    viewerLat,
    viewerLng,
    postLocName,
    viewerLocName,
    lang
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !msg.trim()) return;

    if (isUserPolicyBlocked(userKey)) {
      setIsBlocked(true);
      setShowPolicyModal(true);
      return;
    }

    let finalMsg = msg.trim();
    const policyResult = inspectAndSanitizeMessage(finalMsg, isConfirmed);

    if (policyResult.hasViolation) {
      finalMsg = policyResult.sanitizedText;
      const record = recordPolicyViolation(userKey);
      setPolicyStrikes(record.newStrikes);
      setIsBlocked(record.isBlocked);
      setDetectedTypes(policyResult.detectedTypes);
      setShowPolicyModal(true);
    }

    onSendReply(post.id, name.trim(), phone.trim(), finalMsg);
    setSubmitted(true);

    if (isConfirmed) {
      // Formatted WhatsApp redirect only when confirmed
      const formattedPhone = post.userPhone.replace(/^0/, '94');
      const text = encodeURIComponent(
        `හලෝ ${post.userName}, මම සහය සේවා (Sahaya Seva) ඇප් එකෙන් ඔබේ ඉල්ලීම (${post.postCode}) දැක්කා.\nනම: ${name}\nදුරකථනය: ${phone}\nපණිවිඩය: ${finalMsg}`
      );

      setTimeout(() => {
        window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
        setSubmitted(false);
        setName('');
        setMsg('');
        onClose();
      }, 1200);
    } else {
      setTimeout(() => {
        setSubmitted(false);
        setName('');
        setMsg('');
        onClose();
      }, 1500);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
        <div className="w-full max-w-lg bg-gradient-to-b from-white via-emerald-50/40 to-white dark:from-[#06180f] dark:via-[#04120a] dark:to-[#06180f] border-2 border-emerald-500/50 rounded-[2rem] shadow-[0_20px_60px_rgba(0,122,75,0.25)] overflow-hidden relative p-5 sm:p-6 my-4">
          
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-emerald-200/80 dark:border-emerald-900/60">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                {t.replyModalTitle}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                ඉල්ලීම් අංකය: <strong className="text-emerald-700 dark:text-emerald-300 font-mono">{post.postCode}</strong> ({translateName(post.userName, lang)})
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-emerald-100/80 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 hover:text-emerald-900 dark:hover:text-emerald-100 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-center font-bold transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>

          {!isConfirmed && (
            <div className="mb-3 p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-snug text-[11px]">
                <strong>ආරක්ෂණ නීතිය:</strong> සහය CONFIRM කරන තුරු පෞද්ගලික ලිපිනයන්, දුරකථන අංක හෝ ලින්ක් හුවමාරු කිරීම තහනම්ය.
              </p>
            </div>
          )}

          {submitted ? (
            <div className="py-8 text-center flex flex-col items-center justify-center space-y-3 animate-fadeIn">
              <CheckCircle2 className="w-16 h-16 text-emerald-600 dark:text-emerald-400 animate-bounce" />
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.sendReplySuccess}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isConfirmed ? 'WhatsApp යෙදුම වෙත රීඩිරෙක්ට් වෙමින් පවතී...' : 'පණිවිඩය සාර්ථකව යොමු විය. Chat තුළින් සංවාදය පවත්වා ගත හැක.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Motorcycle Road Distance Box */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white dark:from-[#092217] dark:via-[#05180f] dark:to-[#092217] border-2 border-emerald-500/50 dark:border-emerald-600/50 rounded-2xl space-y-2 text-xs shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <span>🏍️</span>
                    <span>මෝටර් සයිකල් මාර්ග දුර: {motorcycleRoute.formattedRoadDistance}</span>
                  </span>
                  <span className="font-mono font-black text-white bg-emerald-600 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[11px] shadow-sm">
                    <Clock className="w-3 h-3" />
                    <span>~{motorcycleRoute.formattedTime}</span>
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-slate-700 dark:text-slate-300 pt-1.5 border-t border-emerald-200 dark:border-emerald-800/60 font-semibold">
                  <span className="truncate max-w-[48%] flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <Compass className="w-3 h-3 shrink-0" /> {viewerLocName}
                  </span>
                  <span>➔</span>
                  <span className="truncate max-w-[48%] flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <MapPin className="w-3 h-3 shrink-0" /> {postLocName}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50/60 dark:bg-[#071a12] p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs">
                <span className="text-emerald-800 dark:text-emerald-300 block mb-1 font-black">📌 ඉල්ලීමේ සාරාංශය:</span>
                <p className="text-slate-900 dark:text-slate-100 font-bold line-clamp-2">{post.whatHappened}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">ඔබේ නම *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="උදා: කමල් ප්‍රනාන්දු"
                  className="w-full bg-white dark:bg-[#071a12] border border-emerald-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-slate-100 text-sm focus:border-emerald-500 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> ඔබගේ දුරකථන / WhatsApp අංකය *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712233445"
                  className="w-full bg-white dark:bg-[#071a12] border border-emerald-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-slate-100 text-sm focus:border-emerald-500 focus:outline-none font-mono shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {t.yourMsgLabel} (ඔබට උපකාර කළ හැකි ආකාරය) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="උදා: මම කඩවත ළඟ ඉන්නේ. විනාඩි 10කින් පැමිණ සහාය විය හැක."
                  className="w-full bg-white dark:bg-[#071a12] border border-emerald-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-slate-100 text-sm focus:border-emerald-500 focus:outline-none shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-emerald-200 dark:border-emerald-900/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold cursor-pointer"
                >
                  {t.cancelBtn}
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>පිළිතුර යවන්න</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      <PolicyViolationModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        strikes={policyStrikes}
        isBlocked={isBlocked}
        onNavigateToIssues={onNavigateToIssues}
        detectedTypes={detectedTypes}
      />
    </>
  );
};
