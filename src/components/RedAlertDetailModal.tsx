import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  Calendar, 
  MessageSquare, 
  Flag, 
  Send, 
  Share2, 
  Phone, 
  User as UserIcon, 
  ShieldAlert,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { RedAlertItem, RedAlertComment, RedAlertFakeReport, User, LocationOption } from '../types';
import { getDisasterConfig } from '../data/redAlertData';
import { calculateDistanceKm } from '../utils/geoUtils';
import { addCommentToRedAlert, reportRedAlertAsFake, updateRedAlertStatus, deleteRedAlertInFirestore } from '../lib/firebase';
import { startEmergencySiren, stopEmergencySiren, unlockAudio } from '../utils/sirenAudio';
import { Volume2, VolumeX } from 'lucide-react';

interface RedAlertDetailModalProps {
  alert: RedAlertItem | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  currentLocation?: LocationOption;
}

export const RedAlertDetailModal: React.FC<RedAlertDetailModalProps> = ({
  alert,
  isOpen,
  onClose,
  currentUser,
  currentLocation,
}) => {
  const [isPlayingSiren, setIsPlayingSiren] = useState(false);
  const [localComments, setLocalComments] = useState<RedAlertComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commenterName, setCommenterName] = useState(currentUser?.name || '');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Stop siren on unmount or modal close
  useEffect(() => {
    return () => {
      stopEmergencySiren();
    };
  }, []);

  const handleToggleSiren = () => {
    unlockAudio();
    if (isPlayingSiren) {
      stopEmergencySiren();
      setIsPlayingSiren(false);
    } else {
      startEmergencySiren();
      setIsPlayingSiren(true);
    }
  };

  const handleClose = () => {
    stopEmergencySiren();
    setIsPlayingSiren(false);
    onClose();
  };

  // Fake reporting state
  const [showFakeReportModal, setShowFakeReportModal] = useState(false);
  const [fakeReason, setFakeReason] = useState('බොරුවක් / අසත්‍ය පුවතක් (Fake news)');
  const [fakeNotes, setFakeNotes] = useState('');
  const [isReportingFake, setIsReportingFake] = useState(false);
  const [fakeReportedSuccess, setFakeReportedSuccess] = useState(false);

  // Copy share alert
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    if (alert) {
      setLocalComments(alert.comments || []);
    }
  }, [alert]);

  if (!isOpen || !alert) return null;

  const isReporter = currentUser && alert && (
    alert.reportedByUserId === currentUser.id ||
    alert.reportedByPhone === currentUser.phone ||
    alert.reportedByName === currentUser.name ||
    currentUser.role === 'admin'
  );

  const handleResolveAlert = async () => {
    if (!alert) return;
    if (window.confirm('මෙම හදිසි ආපදා තත්ත්වය විසඳී ඇති බැවින් එය ඉවත් කිරීමට හෝ විසඳුණි (Resolved) ලෙස සලකුණු කිරීමට අවශ්‍ය බව ස්ථිරද?')) {
      try {
        await updateRedAlertStatus(alert.id, 'resolved');
        alert.status = 'resolved';
        onClose();
      } catch (err) {
        console.error('Error resolving alert:', err);
      }
    }
  };

  const handleDeleteAlert = async () => {
    if (!alert) return;
    if (window.confirm('මෙම හදිසි අනතුරු ඇඟවීම සම්පූර්ණයෙන්ම මකා දැමීමට අවශ්‍ය බව ස්ථිරද?')) {
      try {
        await deleteRedAlertInFirestore(alert.id);
        onClose();
      } catch (err) {
        console.error('Error deleting alert:', err);
      }
    }
  };

  const config = getDisasterConfig(alert.disasterType);

  let distanceKm = 0;
  if (currentLocation && alert.latitude && alert.longitude) {
    distanceKm = calculateDistanceKm(currentLocation.lat, currentLocation.lng, alert.latitude, alert.longitude);
  }

  const distanceDisplay = distanceKm < 1 
    ? `මීටර් ${Math.round(distanceKm * 1000)}` 
    : `කි.මී. ${distanceKm.toFixed(1)}`;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert || !commentText.trim()) return;

    setIsSubmittingComment(true);
    const newComment: RedAlertComment = {
      id: `comm_${Date.now()}`,
      userId: currentUser?.userId || currentUser?.id || '',
      userName: commenterName.trim() || 'ප්‍රදේශවාසියෙක්',
      userPhone: currentUser?.phone || '',
      comment: commentText.trim(),
      createdAt: new Date().toISOString(),
      createdAtDisplay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      await addCommentToRedAlert(alert.id, newComment);
      setLocalComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReportFake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert) return;

    setIsReportingFake(true);
    const report: RedAlertFakeReport = {
      id: `rep_${Date.now()}`,
      userId: currentUser?.userId || currentUser?.id || '',
      userName: currentUser?.name || 'පරිශීලක',
      userPhone: currentUser?.phone || '',
      reason: fakeReason,
      additionalNotes: fakeNotes.trim(),
      reportedAt: new Date().toISOString(),
    };

    try {
      await reportRedAlertAsFake(alert.id, report);
      setFakeReportedSuccess(true);
      setTimeout(() => {
        setShowFakeReportModal(false);
        setFakeReportedSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error reporting fake alert:', err);
      alert('වාර්තා කිරීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setIsReportingFake(false);
    }
  };

  const handleShare = () => {
    const text = `🚨 [රතු එළිය - හදිසි ආපදා දැනුම්දීම]\nආපදාව: ${alert.disasterTitleSi}\nස්ථානය: ${alert.locationName}\nදිනය/වේලාව: ${alert.incidentDate} ${alert.incidentTime}\nවිස්තර: ${alert.description || 'විස්තර සටහන් කර නොමැත'}\n\nසහය සේවා (Sahaya Sewa) ඇප් එක හරහා බලන්න.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0c1812] border-2 border-red-500 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.35)] overflow-hidden my-auto">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-4 sm:p-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-red-600 font-black flex items-center justify-center text-xl shadow-md">
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono">
                  {alert.alertCode}
                </span>
                {alert.status === 'false_alarm' ? (
                  <span className="bg-yellow-400 text-slate-900 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                    අසත්‍ය පුවතකි (Hoax)
                  </span>
                ) : alert.status === 'resolved' ? (
                  <span className="bg-emerald-400 text-slate-900 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                    නිරාකරණය විය
                  </span>
                ) : (
                  <span className="bg-red-500/80 text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase animate-pulse">
                    ක්‍රියාකාරී ආපදාවකි
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-white pt-0.5">
                {alert.disasterTitleSi}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSiren}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isPlayingSiren
                  ? 'bg-amber-300 text-slate-950 border-2 border-amber-500 animate-pulse'
                  : 'bg-black/30 hover:bg-black/50 text-white border border-white/20'
              }`}
              title={isPlayingSiren ? 'Siren හඬ නවත්වන්න' : 'Siren හඬ වාදනය කරන්න'}
            >
              {isPlayingSiren ? (
                <>
                  <Volume2 className="w-4 h-4 text-red-600 animate-bounce" />
                  <span>Siren නවත්වන්න</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-yellow-300" />
                  <span>Siren අසන්න</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-all cursor-pointer"
              title="Share alert text"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {copiedShare && (
          <div className="bg-emerald-500 text-white text-xs font-bold py-1 px-4 text-center">
            ✅ ආපදා තොරතුරු Clipboard එකට පිටපත් විය!
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          
          {/* Interactive Siren Alarm Audio Card */}
          <div className="p-3 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-lg font-black shrink-0">
                🚨
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  කි.මී. 2 අවට සක්‍රීය වන Siren නාදය (Emergency Siren Alarm)
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  මෙම ආපදාව ආසන්නයේ සිටින අයට නාද වන හදිසි අනතුරු ඇඟවීමේ Siren ශබ්දය
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSiren}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-95 ${
                isPlayingSiren
                  ? 'bg-red-600 text-white animate-pulse border-2 border-red-400'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-2 border-amber-600'
              }`}
            >
              {isPlayingSiren ? (
                <>
                  <Volume2 className="w-4 h-4 text-white animate-bounce" />
                  <span>Siren නවත්වන්න (Stop)</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-slate-950" />
                  <span>Siren නාදය වාදනය කරන්න (Play Siren)</span>
                </>
              )}
            </button>
          </div>

          {/* Main Incident Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-500 dark:text-slate-400">ස්ථානය:</span>
                  <p className="font-black text-slate-900 dark:text-white text-sm">{alert.locationName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">📍 Lat: {alert.latitude.toFixed(4)}, Lng: {alert.longitude.toFixed(4)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-500 dark:text-slate-400">දිනය සහ වේලාව:</span>
                  <p className="font-black text-slate-900 dark:text-white text-sm">{alert.incidentDate} - {alert.incidentTime}</p>
                  {distanceKm > 0 && (
                    <p className="text-[11px] font-bold text-red-600 dark:text-red-400">
                      ඔබට ඇති දුර: {distanceDisplay}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {alert.description && (
              <div className="p-3.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200/80 dark:border-white/10 text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400 block mb-1">වැඩි විස්තර:</span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
                  {alert.description}
                </p>
              </div>
            )}

            {/* Reporter details */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                <span>දැනුම්දුන්නේ: <strong className="text-slate-700 dark:text-slate-300">{alert.reportedByName}</strong></span>
              </div>
              {alert.reportedByPhone && (
                <a
                  href={`tel:${alert.reportedByPhone}`}
                  className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{alert.reportedByPhone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Reporter Controls (If current user is the reporter or admin) */}
          {isReporter && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  🛡️ ඔබ මෙම ආපදාව වාර්තා කළ පුද්ගලයායි (Reporter Management)
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">පැයෙන් පැයට තවමත් පවතීදැයි පරීක්ෂා කෙරේ</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                මෙම ආපදා තත්ත්වය දැන් අවසන් වී ඇත්නම් හෝ ඉවත් කිරීමට අවශ්‍ය නම් පහත බොත්තම් භාවිතා කරන්න.
              </p>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={handleResolveAlert}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>අනතුර විසඳුණි (Resolve Alert)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAlert}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>අනතුර ඉවත් කරන්න (Delete Alert)</span>
                </button>
              </div>
            </div>
          )}

          {/* Fake Alert Warning / Action */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs">
            <span className="text-rose-700 dark:text-rose-400 font-medium">
              මෙම ආපදාව පිළිබඳ සාවද්‍ය තොරතුරක් ද?
            </span>
            <button
              type="button"
              onClick={() => setShowFakeReportModal(true)}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
            >
              <Flag className="w-3 h-3" />
              <span>Admin ට වාර්තා කරන්න</span>
            </button>
          </div>

          {/* Fake Report Input Modal */}
          {showFakeReportModal && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500/60 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>අසත්‍ය තොරතුරක් ලෙස Admin වෙත වාර්තා කරන්න</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowFakeReportModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {fakeReportedSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center">
                  ✅ ස්තූතියි! මෙම වාර්තාව පරිපාලක (Admin) වෙත යොමු කරන ලදි.
                </div>
              ) : (
                <form onSubmit={handleReportFake} className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      හේතුව තෝරන්න:
                    </label>
                    <select
                      value={fakeReason}
                      onChange={(e) => setFakeReason(e.target.value)}
                      className="w-full p-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-bold"
                    >
                      <option value="බොරුවක් / අසත්‍ය පුවතක් (Fake news)">බොරුවක් / අසත්‍ය පුවතක් (Fake news)</option>
                      <option value="පැරණි සිදුවීමක් (Outdated incident)">පැරණි සිදුවීමක් (Outdated incident)</option>
                      <option value="නොමඟ යවන සුළුයි (Misleading / Exaggerated)">නොමඟ යවන සුළුයි (Misleading / Exaggerated)</option>
                      <option value="වැරදි ස්ථානයක් (Wrong location)">වැරදි ස්ථානයක් (Wrong location)</option>
                      <option value="වෙනත් කරුණක් (Other reason)">වෙනත් කරුණක් (Other reason)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      වැඩිදුර පැහැදිලි කිරීම (අවශ්‍ය නම්):
                    </label>
                    <input
                      type="text"
                      value={fakeNotes}
                      onChange={(e) => setFakeNotes(e.target.value)}
                      placeholder="මෙය බොරුවක් බව ඔබ දන්නේ කෙසේද?..."
                      className="w-full p-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isReportingFake}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>වාර්තාව Admin වෙත Submit කරන්න</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Comments Feed Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>සිදුවීම පිළිබඳ යාවත්කාලීන අදහස් සහ තොරතුරු ({localComments.length})</span>
            </h4>

            {/* Comments List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {localComments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center">
                  තවම අදහස් පළවී නොමැත. සිදුවීම පිළිබඳ තොරතුරක් ඇත්නම් පහතින් සටහන් කරන්න.
                </p>
              ) : (
                localComments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <strong className="text-slate-800 dark:text-slate-200 font-bold">{c.userName}</strong>
                      <span>{c.createdAtDisplay}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input Form */}
            <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="වත්මන් තත්ත්වය පිළිබඳ අදහසක් හෝ තොරතුරක් සටහන් කරන්න..."
                className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                required
              />
              <button
                type="submit"
                disabled={isSubmittingComment}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>යවන්න</span>
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
