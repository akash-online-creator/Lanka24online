import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Flag, 
  Send, 
  Share2, 
  Phone, 
  User as UserIcon, 
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Loader2,
  Sparkles,
  Calendar
} from 'lucide-react';
import { RedAlertItem, RedAlertComment, RedAlertFakeReport, User, LocationOption } from '../types';
import { getDisasterConfig } from '../data/redAlertData';
import { calculateDistanceKm } from '../utils/geoUtils';
import { AudioVoicePlayer } from './AudioVoiceNote';
import { 
  addCommentToRedAlert, 
  reportRedAlertAsFake, 
  deleteRedAlertInFirestore,
  markRedAlertAsResolved,
  cancelRedAlertByReporter,
  addReporterUpdateToRedAlert
} from '../lib/firebase';

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
  const [localComments, setLocalComments] = useState<RedAlertComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [reporterUpdateText, setReporterUpdateText] = useState('');
  const [showReporterUpdateInput, setShowReporterUpdateInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commenterName, setCommenterName] = useState(currentUser?.name || '');

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
      setLocalComments((alert.comments as RedAlertComment[]) || []);
    }
  }, [alert]);

  if (!isOpen || !alert) return null;

  const handleClose = () => {
    onClose();
  };

  // 1. ආපදාව වාර්තා කළ පුද්ගලයාද යන්න පරීක්ෂා කිරීම
  const isAuthorOfAlert = Boolean(currentUser && alert && (
    (alert.reportedByUserId && ((currentUser.id && alert.reportedByUserId === currentUser.id) || (currentUser.userId && alert.reportedByUserId === currentUser.userId))) ||
    (alert.reportedByPhone && currentUser.phone && alert.reportedByPhone === currentUser.phone) ||
    (alert.reportedByName && currentUser.name && alert.reportedByName === currentUser.name)
  ));

  // ඔප්ෂන් 01: "ආපදාව විසඳුනා"
  const handleResolveAlert = async () => {
    if (!alert || !alert.id) return;
    if (window.confirm('මෙම හදිසි ආපදා තත්ත්වය විසඳී ඇති බැවින් එය විසඳුණි (Resolved) ලෙස සලකුණු කිරීමට අවශ්‍ය බව ස්ථිරද?')) {
      setIsSubmitting(true);
      try {
        await markRedAlertAsResolved(alert.id, 'වාර්තාකරු විසින් විසඳන ලදී');
        alert.status = 'resolved';
        onClose();
      } catch (err) {
        console.error('Error resolving alert:', err);
        alert('තත්ත්වය වෙනස් කිරීමට නොහැකි විය.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ඔප්ෂන් 02: "අනතුර ඉවත් කරන්න"
  const handleCancelOrDeleteAlert = async () => {
    if (!alert || !alert.id) return;
    if (window.confirm('මෙම හදිසි අනතුරු ඇඟවීම ඉවත් කිරීමට / මකා දැමීමට අවශ්‍ය බව ස්ථිරද?')) {
      setIsSubmitting(true);
      try {
        await cancelRedAlertByReporter(alert.id, 'වාර්තාකරු විසින් ඉවත් කරගන්නා ලදී');
        alert.status = 'cancelled';
        onClose();
      } catch (err) {
        console.error('Error cancelling alert:', err);
        try {
          await deleteRedAlertInFirestore(alert.id);
          onClose();
        } catch (e) {
          alert('ඉවත් කිරීමට නොහැකි විය.');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ඔප්ෂන් 03: "තව අදහසක් දක්වන්න / Update එකක් දාන්න"
  const handleSendReporterUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert || !alert.id || !reporterUpdateText.trim()) return;

    setIsSubmitting(true);
    const text = reporterUpdateText.trim();
    try {
      await addReporterUpdateToRedAlert(alert.id, text, {
        reporterId: currentUser?.userId || currentUser?.id || '',
        reporterName: currentUser?.name || alert.reportedByName || 'වාර්තාකරු',
      });

      const newCommentObj: RedAlertComment = {
        id: `comm_${Date.now()}`,
        userId: currentUser?.userId || currentUser?.id || '',
        userName: `${currentUser?.name || alert.reportedByName || 'වාර්තාකරු'} (වාර්තාකරු)`,
        userPhone: currentUser?.phone || '',
        comment: text,
        createdAt: new Date().toISOString(),
        createdAtDisplay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setLocalComments((prev) => [...prev, newCommentObj]);
      setReporterUpdateText('');
      setShowReporterUpdateInput(false);
    } catch (err) {
      console.error('Error sending reporter update:', err);
      alert('යාවත්කාලීන කිරීමට නොහැකි විය.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // General Comment Submit
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert || !alert.id || !commentText.trim()) return;

    setIsSubmitting(true);
    const newComment: RedAlertComment = {
      id: `comm_${Date.now()}`,
      userId: currentUser?.userId || currentUser?.id || '',
      userName: commenterName.trim() || currentUser?.name || 'ප්‍රදේශවාසියෙක්',
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
      alert('අදහස එක් කිරීමට නොහැකි විය.');
    } finally {
      setIsSubmitting(false);
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
    const text = `🚨 [රතු එළිය - හදිසි ආපදා දැනුම්දීම]\nආපදාව: ${alert.disasterTitleSi}\nස්ථානය: ${alert.locationName}\nදිනය/වේලාව: ${alert.incidentDate} ${alert.incidentTime}\n\nසහය සේවා (Sahaya Sewa) ඇප් එක හරහා බලන්න.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0c1812] border-2 border-red-500 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.35)] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Top Header Ribbon */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-3.5 sm:p-4 text-white shadow-md shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white text-red-600 font-black flex items-center justify-center text-xl shadow-md shrink-0">
                {config.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono shrink-0">
                    {alert.alertCode}
                  </span>
                  {alert.status === 'false_alarm' ? (
                    <span className="bg-yellow-400 text-slate-900 px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0">
                      අසත්‍ය පුවතකි (Hoax)
                    </span>
                  ) : alert.status === 'resolved' ? (
                    <span className="bg-emerald-400 text-slate-900 px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0">
                      නිරාකරණය විය
                    </span>
                  ) : alert.status === 'cancelled' ? (
                    <span className="bg-slate-400 text-slate-900 px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0">
                      අවලංගු කරන ලදී
                    </span>
                  ) : (
                    <span className="bg-red-500/90 text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase animate-pulse shrink-0">
                      ක්‍රියාකාරී ආපදාවකි
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-black tracking-wide text-white pt-0.5 truncate">
                  {alert.disasterTitleSi}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleShare}
                className="p-2 rounded-xl bg-black/25 hover:bg-black/40 text-white transition-all cursor-pointer"
                title="Share alert text"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/25 hover:bg-black/45 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {copiedShare && (
          <div className="bg-emerald-500 text-white text-xs font-bold py-1 px-4 text-center shrink-0">
            ✅ ආපදා තොරතුරු Clipboard එකට පිටපත් විය!
          </div>
        )}

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 space-y-4 overflow-y-auto flex-1 flex flex-col">

          {/* Main Incident Details Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">ස්ථානය:</span>
                  <p className="font-black text-slate-900 dark:text-white text-sm sm:text-base">{alert.locationName}</p>
                  {alert.latitude && alert.longitude && (
                    <p className="text-[11px] sm:text-xs text-slate-400 font-mono mt-1">📍 Lat: {alert.latitude.toFixed(4)}, Lng: {alert.longitude.toFixed(4)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">දිනය සහ වේලාව:</span>
                  <p className="font-black text-slate-900 dark:text-white text-sm sm:text-base">{alert.incidentDate} - {alert.incidentTime}</p>
                  {distanceKm > 0 && (
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1 bg-red-100 dark:bg-red-900/30 inline-block px-2 py-0.5 rounded">
                      ඔබට ඇති දුර: {distanceDisplay}
                    </p>
                  )}
                </div>
              </div>

            </div>

            {/* 🎙️ Voice SOS Audio Note & Stamped Metadata */}
            {(alert.audioUrl || alert.isVoiceAlert) && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/90 to-rose-950/90 border-2 border-red-500/70 text-white space-y-2 shadow-lg">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
                    <span>🚨 හඬ ආපදා වාර්තාව (AI Voice SOS Note)</span>
                  </span>
                  <span className="text-[10px] bg-red-600/80 text-white px-2.5 py-0.5 rounded-full font-extrabold uppercase">
                    VOICE SOS
                  </span>
                </div>

                {(alert.voiceSentDate || alert.voiceSentTime || alert.voiceSentLocation) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-2 rounded-xl bg-black/40 text-[11px] font-semibold text-rose-100 border border-red-500/30">
                    {alert.voiceSentDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="truncate">{alert.voiceSentDate}</span>
                      </div>
                    )}
                    {alert.voiceSentTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-rose-300 shrink-0" />
                        <span className="truncate">{alert.voiceSentTime}</span>
                      </div>
                    )}
                    {alert.voiceSentLocation && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="truncate">{alert.voiceSentLocation}</span>
                      </div>
                    )}
                  </div>
                )}

                {alert.audioUrl && (
                  <div className="pt-1">
                    <AudioVoicePlayer
                      audioUrl={alert.audioUrl}
                      durationSec={alert.audioDurationSec || 6}
                    />
                  </div>
                )}
              </div>
            )}

            {alert.description && (
              <div className="p-3.5 mt-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200/80 dark:border-white/10 text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400 block mb-1">වැඩි විස්තර:</span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
                  {alert.description}
                </p>
              </div>
            )}

            {/* Reported By Info */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-xs">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="text-[10px] text-slate-400 block">වාර්තා කළේ:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{alert.reportedByName || 'හදිසි සාමාජිකයෙක්'}</span>
                </div>
              </div>
              {alert.reportedByPhone && (
                <a href={`tel:${alert.reportedByPhone}`} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold shadow-xs active:scale-95 transition-all">
                  <Phone className="w-3.5 h-3.5" />
                  <span>අමතන්න</span>
                </a>
              )}
            </div>
          </div>

          {/* =========================================================================
             🎛️ 1. දැනුම්දීම පළ කළ කෙනාට (REPORTER) පෙනෙන OPTIONS 3
             ========================================================================= */}
          {isAuthorOfAlert && alert.status === 'active' && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-700/60 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-300">
                  🛠️ ඔබ මෙම ආපදාව වාර්තා කළ පුද්ගලයායි (Reporter Actions):
                </span>
              </div>

              <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                මෙම ආපදා නිවේදනය සඳහා පහත පියවර ගන්න:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {/* Option 01: විසඳුනා */}
                <button
                  type="button"
                  onClick={handleResolveAlert}
                  disabled={isSubmitting}
                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>01. ආපදාව විසඳුනා</span>
                </button>

                {/* Option 02: ඉවත් කරන්න */}
                <button
                  type="button"
                  onClick={handleCancelOrDeleteAlert}
                  disabled={isSubmitting}
                  className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>02. අනතුර ඉවත් කරන්න</span>
                </button>

                {/* Option 03: තව අදහසක් දක්වන්න */}
                <button
                  type="button"
                  onClick={() => setShowReporterUpdateInput(!showReporterUpdateInput)}
                  disabled={isSubmitting}
                  className="py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>03. තව අදහසක් දක්වන්න</span>
                </button>
              </div>

              {/* Option 03 Reporter Update Input Box */}
              {showReporterUpdateInput && (
                <form onSubmit={handleSendReporterUpdate} className="pt-3 space-y-2 border-t border-amber-300 dark:border-amber-800/60 animate-fadeIn">
                  <label className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                    💬 වාර්තාකරු ලෙස සජීවී යාවත්කාලීන කිරීමක් එකතු කරන්න:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={reporterUpdateText}
                      onChange={(e) => setReporterUpdateText(e.target.value)}
                      placeholder="උදා: ප්‍රධාන පාරේ වතුර බැස ගොස් ඇත / ගිනි නිවන රථ පැමිණියේය..."
                      className="flex-1 p-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>යවන්න</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Admin Management Controls */}
          {currentUser?.role === 'admin' && !isAuthorOfAlert && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 space-y-2">
              <span className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                🛡️ Admin Management
              </span>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={handleResolveAlert}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>අනතුර විසඳුණි (Resolve)</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelOrDeleteAlert}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>අනතුර ඉවත් කරන්න (Delete)</span>
                </button>
              </div>
            </div>
          )}

          {/* Fake Alert Warning / Action (Non-authors only) */}
          {!isAuthorOfAlert && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs">
              <span className="text-rose-700 dark:text-rose-400 font-bold">
                මෙම ආපදාව පිළිබඳ සාවද්‍ය තොරතුරක් ද?
              </span>
              <button
                type="button"
                onClick={() => setShowFakeReportModal(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Admin ට වාර්තා කරන්න</span>
              </button>
            </div>
          )}

          {/* Fake Report Input Modal */}
          {showFakeReportModal && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500/60 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>අසත්‍ය තොරතුරක් ලෙස වාර්තා කරන්න</span>
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
                <form onSubmit={handleReportFake} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      හේතුව තෝරන්න:
                    </label>
                    <select
                      value={fakeReason}
                      onChange={(e) => setFakeReason(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-bold"
                    >
                      <option value="බොරුවක් / අසත්‍ය පුවතක් (Fake news)">බොරුවක් / අසත්‍ය පුවතක් (Fake news)</option>
                      <option value="පැරණි සිදුවීමක් (Outdated incident)">පැරණි සිදුවීමක් (Outdated incident)</option>
                      <option value="නොමඟ යවන සුළුයි (Misleading / Exaggerated)">නොමඟ යවන සුළුයි (Misleading / Exaggerated)</option>
                      <option value="වැරදි ස්ථානයක් (Wrong location)">වැරදි ස්ථානයක් (Wrong location)</option>
                      <option value="වෙනත් කරුණක් (Other reason)">වෙනත් කරුණක් (Other reason)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      වැඩිදුර පැහැදිලි කිරීම (අවශ්‍ය නම්):
                    </label>
                    <input
                      type="text"
                      value={fakeNotes}
                      onChange={(e) => setFakeNotes(e.target.value)}
                      placeholder="මෙය බොරුවක් බව ඔබ දන්නේ කෙසේද?..."
                      className="w-full p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isReportingFake}
                    className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                  >
                    <Flag className="w-4 h-4" />
                    <span>වාර්තාව Admin වෙත Submit කරන්න</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Comments Feed Section (All users & Reporter) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-4 mt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span>අදහස් හා සජීවී යාවත්කාලීන කිරීම් ({localComments.length})</span>
              </span>
            </h4>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {localComments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  තවම අදහස් හෝ යාවත්කාලීන කිරීම් නොමැත. පහතින් තොරතුරු සටහන් කළ හැක.
                </p>
              ) : (
                localComments.map((c, cIdx) => {
                  const isReporterComment = c.userName?.includes('වාර්තාකරු') || c.isReporterUpdate;
                  return (
                    <div
                      key={`alert_comment_${c.id || 'c'}_${cIdx}`}
                      className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                        isReporterComment
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
                          : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/5 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] border-b border-slate-100 dark:border-white/5 pb-1">
                        <strong className="font-bold flex items-center gap-1">
                          {isReporterComment ? '📢 ' + c.userName : c.userName}
                        </strong>
                        <span className="text-slate-400 font-mono">{c.createdAtDisplay || ''}</span>
                      </div>
                      <p className="font-medium leading-relaxed pt-1">{c.comment || (c as any).text}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* General comment box */}
            <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-slate-200 dark:border-white/10 mt-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="ඔබේ අදහස සටහන් කරන්න..."
                className="flex-1 p-3 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">යවන්න</span>
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
