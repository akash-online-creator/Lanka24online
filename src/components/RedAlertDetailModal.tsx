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
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Loader2,
  Sparkles,
  Calendar,
  Navigation
} from 'lucide-react';
import { RedAlertItem, RedAlertComment, RedAlertFakeReport, User, LocationOption } from '../types';
import { getDisasterConfig } from '../data/redAlertData';
import { calculateDistanceKm } from '../utils/geoUtils';
import { AudioVoicePlayer } from './AudioVoiceNote';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { 
  addCommentToRedAlert, 
  reportRedAlertAsFake, 
  deleteRedAlertInFirestore,
  markRedAlertAsResolved,
  cancelRedAlertByReporter,
  addReporterUpdateToRedAlert
} from '../lib/firebase';
import { broadcastRedAlertResolvedNotification } from '../utils/notificationManager';

interface RedAlertDetailModalProps {
  alert: RedAlertItem | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  currentLocation?: LocationOption;
  onAlertUpdated?: (updatedAlert: RedAlertItem) => void;
  onAlertDeleted?: (alertId: string) => void;
}

export const RedAlertDetailModal: React.FC<RedAlertDetailModalProps> = ({
  alert,
  isOpen,
  onClose,
  currentUser,
  currentLocation,
  onAlertUpdated,
  onAlertDeleted,
}) => {
  const [localComments, setLocalComments] = useState<RedAlertComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [reporterUpdateText, setReporterUpdateText] = useState('');
  const [showReporterUpdateInput, setShowReporterUpdateInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commenterName, setCommenterName] = useState(currentUser?.name || '');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // In-app තහවුරු කිරීමේ Panels
  const [confirmDialog, setConfirmDialog] = useState<'resolve' | 'cancel_delete' | null>(null);
  const [selectedResolveReason, setSelectedResolveReason] = useState('ආපදා තත්ත්වය සාර්ථකව පාලනය කර සාමාන්‍ය තත්ත්වයට පත් කරන ලදී.');
  const [customResolveReason, setCustomResolveReason] = useState('');
  const [selectedCancelReason, setSelectedCancelReason] = useState('ආපදා අවදානම පහව ගොස් ඇති බැවින් නිවේදනය ඉවත් කරන ලදී.');
  const [customCancelReason, setCustomCancelReason] = useState('');

  // Fake report controls
  const [showFakeReportModal, setShowFakeReportModal] = useState(false);
  const [fakeReason, setFakeReason] = useState('බොරුවක් / අසත්‍ය පුවතක් (Fake news)');
  const [fakeNotes, setFakeNotes] = useState('');
  const [isReportingFake, setIsReportingFake] = useState(false);
  const [fakeReportedSuccess, setFakeReportedSuccess] = useState(false);

  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    if (alert) {
      setLocalComments((alert.comments as RedAlertComment[]) || []);
      setConfirmDialog(null);
      setShowReporterUpdateInput(false);
      setActionSuccessMsg(null);
    }
  }, [alert]);

  useEffect(() => {
    if (currentUser?.name) {
      setCommenterName(currentUser.name);
    }
  }, [currentUser]);

  if (!isOpen || !alert) return null;

  const isAdmin = checkIsAdmin(currentUser);

  // Browser එකෙන් නිර්මාණය කළ එකක්ද යන්න පරීක්ෂා කිරීම
  let isCreatedByThisBrowser = false;
  try {
    const myAlerts = JSON.parse(localStorage.getItem('sahaya_my_created_alerts') || '[]');
    if (Array.isArray(myAlerts) && alert?.id && myAlerts.includes(alert.id)) {
      isCreatedByThisBrowser = true;
    }
  } catch {
    // LocalStorage fallback
  }

  const isAuthorOfAlert = Boolean(
    isCreatedByThisBrowser ||
    (currentUser && alert && (
      (alert.reportedByUserId && typeof alert.reportedByUserId === 'string' && (
        (currentUser.id && alert.reportedByUserId === currentUser.id) ||
        (currentUser.userId && typeof currentUser.userId === 'string' && alert.reportedByUserId.toLowerCase() === currentUser.userId.toLowerCase()) ||
        (currentUser.nicNumber && typeof currentUser.nicNumber === 'string' && alert.reportedByUserId.toLowerCase() === currentUser.nicNumber.toLowerCase()) ||
        (currentUser.userNumericId && alert.reportedByUserId === currentUser.userNumericId)
      )) ||
      (alert.reportedByPhone && currentUser.phone && alert.reportedByPhone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '')) ||
      (alert.reportedByName && currentUser.name && typeof alert.reportedByName === 'string' && typeof currentUser.name === 'string' && alert.reportedByName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    ))
  );

  const canManageAlert = isAuthorOfAlert || isAdmin;

  // 1. ආපදාව විසඳුනා (Mark as Resolved) - දේශීය දැනුම්දීම පමණක් විකාශනය වේ
  const handleConfirmResolveAlert = async () => {
    if (!alert?.id) return;
    setIsSubmitting(true);
    const finalReason = selectedResolveReason === 'custom' ? customResolveReason.trim() : selectedResolveReason;
    const resolvedTimeFormatted = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date().toLocaleDateString('si-LK')})`;
    const actorName = currentUser?.name || alert.reportedByName || (isAdmin ? 'පරිපාලක (Admin)' : 'වාර්තාකරු');

    try {
      await markRedAlertAsResolved(alert.id, finalReason);
      
      const updatedItem: RedAlertItem = {
        ...alert,
        status: 'resolved',
        statusChangeMessage: `✅ ආපදාව විසඳුනු බව සටහන් කළේය: ${finalReason}`,
        resolvedAt: new Date().toISOString(),
        adminActionNote: finalReason,
      };

      // දේශීය Notification විකාශනය (Local In-App Notification Manager)
      broadcastRedAlertResolvedNotification({
        alertId: alert.id,
        alertCode: alert.alertCode,
        disasterTitle: alert.disasterTitleSi || alert.disasterTitleEn || 'හදිසි ආපදා අවදානම',
        locationName: alert.locationName || 'ශ්‍රී ලංකාව',
        resolvedTime: resolvedTimeFormatted,
        resolvedReason: finalReason,
        resolvedBy: actorName,
      });

      onAlertUpdated?.(updatedItem);
      setActionSuccessMsg('✅ ආපදාව විසඳුණි (Resolved) ලෙස සටහන් විය!');
      setConfirmDialog(null);

      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Error resolving alert:', err);
      setActionSuccessMsg('⚠️ තත්ත්වය වෙනස් කිරීමට නොහැකි විය.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. අනතුර ඉවත් කරන්න (Cancel / Delete) - දේශීය දැනුම්දීම පමණක් විකාශනය වේ
  const handleConfirmCancelAlert = async () => {
    if (!alert?.id) return;
    setIsSubmitting(true);
    const finalReason = selectedCancelReason === 'custom' ? customCancelReason.trim() : selectedCancelReason;
    const resolvedTimeFormatted = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date().toLocaleDateString('si-LK')})`;
    const actorName = currentUser?.name || alert.reportedByName || (isAdmin ? 'පරිපාලක (Admin)' : 'වාර්තාකරු');

    try {
      await cancelRedAlertByReporter(alert.id, finalReason);
      
      const updatedItem: RedAlertItem = {
        ...alert,
        status: 'cancelled',
        statusChangeMessage: `ℹ️ ආපදා නිවේදනය ඉවත් කරගන්නා ලදී: ${finalReason}`,
        cancelledAt: new Date().toISOString(),
        adminActionNote: finalReason,
      };

      // දේශීය Notification විකාශනය (Local In-App Notification Manager)
      broadcastRedAlertResolvedNotification({
        alertId: alert.id,
        alertCode: alert.alertCode,
        disasterTitle: alert.disasterTitleSi || alert.disasterTitleEn || 'හදිසි ආපදා අවදානම',
        locationName: alert.locationName || 'ශ්‍රී ලංකාව',
        resolvedTime: resolvedTimeFormatted,
        resolvedReason: finalReason,
        resolvedBy: actorName,
      });

      onAlertUpdated?.(updatedItem);
      onAlertDeleted?.(alert.id);
      setActionSuccessMsg('🗑️ ආපදා නිවේදනය පද්ධතියෙන් ඉවත් කරන ලදී.');
      setConfirmDialog(null);

      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Error cancelling alert:', err);
      try {
        await deleteRedAlertInFirestore(alert.id);
        onAlertDeleted?.(alert.id);
        onClose();
      } catch (e) {
        setActionSuccessMsg('⚠️ ඉවත් කිරීමට නොහැකි විය.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. වාර්තාකරුගේ Live Update එකක් එක් කිරීම
  const handleSendReporterUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert?.id || !reporterUpdateText.trim()) return;

    setIsSubmitting(true);
    const text = reporterUpdateText.trim();
    const reporterDispName = currentUser?.name || alert.reportedByName || 'වාර්තාකරු';

    try {
      await addReporterUpdateToRedAlert(alert.id, text, {
        reporterId: currentUser?.userId || currentUser?.id || '',
        reporterName: reporterDispName,
      });

      const newCommentObj: RedAlertComment = {
        id: `comm_${Date.now()}`,
        userId: currentUser?.userId || currentUser?.id || '',
        userName: `${reporterDispName} (වාර්තාකරු)`,
        authorName: `${reporterDispName} (වාර්තාකරු)`,
        userPhone: currentUser?.phone || '',
        comment: text,
        text: text,
        createdAt: new Date().toISOString(),
        createdAtDisplay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isReporterUpdate: true,
      };

      const updatedComments = [...localComments, newCommentObj];
      setLocalComments(updatedComments);
      setReporterUpdateText('');
      setShowReporterUpdateInput(false);

      setActionSuccessMsg('💬 වාර්තාකරුගේ යාවත්කාලීන කිරීම සාර්ථකව පළවිය!');

      onAlertUpdated?.({
        ...alert,
        comments: updatedComments,
        latestReporterUpdate: {
          text,
          createdAt: new Date().toISOString(),
          reporterName: reporterDispName,
          notificationText: `💬 වාර්තාකරුගෙන් අලුත් යාවත්කාලීන කිරීමක්: ${text}`,
        },
      });

      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error sending reporter update:', err);
      setActionSuccessMsg('⚠️ යාවත්කාලීන කිරීමට නොහැකි විය.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // සාමාන්‍ය අදහස් (Comments) එක් කිරීම
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert?.id || !commentText.trim()) return;

    setIsSubmitting(true);
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
      setActionSuccessMsg('⚠️ අදහස එක් කිරීමට නොහැකි විය.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fake Alert වාර්තා කිරීම
  const handleReportFake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert?.id) return;

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
      setActionSuccessMsg('⚠️ වාර්තා කිරීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setIsReportingFake(false);
    }
  };

  const handleShare = () => {
    const text = `🚨 [රතුවෙලිය - හදිසි ආපදා අනතුරු ඇඟවීම]\nආපදාව: ${alert.disasterTitleSi}\nස්ථානය: ${alert.locationName}\nදිනය/වේලාව: ${alert.incidentDate} ${alert.incidentTime}\n\nසහාය සේවා (Sahaya Sewa) ඇප් එක හරහා සජීවීව බලන්න.`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0c1812] border-2 border-red-500 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.35)] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header Ribbon */}
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
              {canManageAlert && (
                <button
                  type="button"
                  onClick={() => setConfirmDialog('cancel_delete')}
                  disabled={isSubmitting}
                  className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-white border border-red-400/40 transition-all cursor-pointer"
                  title={isAdmin ? "පරිපාලක ලෙස ආපදාව ඉවත් කරන්න" : "ආපදාව ඉවත් කරන්න"}
                >
                  <Trash2 className="w-4 h-4 text-red-200" />
                </button>
              )}
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
                onClick={onClose}
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

        {actionSuccessMsg && (
          <div className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center shrink-0 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 space-y-4 overflow-y-auto flex-1 flex flex-col">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="w-full">
                  <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">ස්ථානය:</span>
                  <p className="font-black text-slate-900 dark:text-white text-sm sm:text-base">{alert.locationName}</p>
                  {alert.latitude && alert.longitude && (
                    <p className="text-[11px] sm:text-xs text-slate-400 font-mono mt-0.5">📍 Lat: {alert.latitude.toFixed(4)}, Lng: {alert.longitude.toFixed(4)}</p>
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

            {/* Google Maps Directions */}
            <div className="pt-1">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${alert.latitude && alert.longitude ? `${alert.latitude},${alert.longitude}` : encodeURIComponent(alert.locationName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-white animate-pulse shrink-0" />
                <span>🗺️ Google Maps Navigation (ස්ථානයට මඟ පෙන්වන්න)</span>
              </a>
            </div>

            {/* Voice SOS Note */}
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
              <div className="p-4 mt-2 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border-2 border-amber-500/40 dark:border-amber-600/40 text-xs sm:text-sm shadow-sm space-y-1.5">
                <span className="font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>හදිසි පණිවිඩය / විස්තරය (Emergency Note):</span>
                </span>
                <p className="text-slate-900 dark:text-slate-100 leading-relaxed font-bold whitespace-pre-wrap break-words text-xs sm:text-sm pl-0.5">
                  {alert.description}
                </p>
              </div>
            )}

            {/* Reporter Contact Info - Admin Only */}
            {isAdmin && (alert.reportedByName || alert.reportedByPhone) && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-800 text-xs">
                <div className="min-w-0">
                  <span className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-purple-600" />
                    <span>වාර්තාකරුගේ තොරතුරු (Admin Only):</span>
                  </span>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    {alert.reportedByName && <span className="font-bold mr-2">නම: {alert.reportedByName}</span>}
                    {alert.reportedByPhone && <span>දුරකථන: {alert.reportedByPhone}</span>}
                  </div>
                </div>
                {alert.reportedByPhone && (
                  <a href={`tel:${alert.reportedByPhone}`} className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-bold shadow-xs active:scale-95 transition-all shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                    <span>අමතන්න</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Action Panels */}
          {canManageAlert && alert.status === 'active' && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-700/60 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-300">
                  🛠️ {isAdmin ? 'පරිපාලක පාලන පුවරුව (Admin Actions):' : 'ඔබ මෙම ආපදාව වාර්තා කළ පුද්ගලයායි (Reporter Actions):'}
                </span>
              </div>

              {/* Confirmation Card: Resolve */}
              {confirmDialog === 'resolve' && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/90 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-emerald-900 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>මෙම ආපදා තත්ත්වය විසඳී ඇති බව සටහන් කරන්න ද?</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium">
                    මෙමගින් පද්ධතියේ දේශීය Notification වලට <strong>අවදානම කුමක්ද, ඉවත් කළ වේලාව සහ හේතුව</strong> සටහන් කර යවනු ලැබේ.
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-black text-emerald-900 dark:text-emerald-200">
                      💡 ආපදාව ඉවත් කළ හේතුව තෝරන්න (Reason):
                    </label>
                    <select
                      value={selectedResolveReason}
                      onChange={(e) => setSelectedResolveReason(e.target.value)}
                      className="w-full p-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 text-slate-900 dark:text-slate-100"
                    >
                      <option value="ආපදා තත්ත්වය සාර්ථකව පාලනය කර සාමාන්‍ය තත්ත්වයට පත් කරන ලදී.">ආපදා තත්ත්වය සාර්ථකව පාලනය කර සාමාන්‍ය තත්ත්වයට පත් කරන ලදී.</option>
                      <option value="මාර්ගය සහ ගමනාගමනය යථා තත්ත්වයට පත් විය.">මාර්ගය සහ ගමනාගමනය යථා තත්ත්වයට පත් විය.</option>
                      <option value="හදිසි අලුත්වැඩියාව සාර්ථකව නිම කරන ලදී.">හදිසි අලුත්වැඩියාව සාර්ථකව නිම කරන ලදී.</option>
                      <option value="ජල ගැලීම / ගංවතුර බැසගොස් අවදානම පහව ගියේය.">ජල ගැලීම / ගංවතුර බැසගොස් අවදානම පහව ගියේය.</option>
                      <option value="custom">වෙනත් හේතුවක් සටහන් කරන්න...</option>
                    </select>

                    {selectedResolveReason === 'custom' && (
                      <input
                        type="text"
                        placeholder="ඉවත් කළ නිශ්චිත හේතුව මෙහි ලියන්න..."
                        value={customResolveReason}
                        onChange={(e) => setCustomResolveReason(e.target.value)}
                        className="w-full p-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 text-slate-900 dark:text-slate-100 mt-1"
                      />
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmDialog(null)}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
                    >
                      අවලංගු කරන්න
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmResolveAlert}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>ඔව්, විසඳුණු බව දැනුම්දෙන්න</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Confirmation Card: Cancel / Delete */}
              {confirmDialog === 'cancel_delete' && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/90 border-2 border-rose-500 text-rose-950 dark:text-rose-100 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-rose-900 dark:text-rose-300">
                    <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>මෙම හදිසි අනතුරු ඇඟවීම ඉවත් කිරීමට අවශ්‍ය බව ස්ථිරද?</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium">
                    මෙමගින් ආපදා අනතුරු ඇඟවීම පද්ධතියෙන් ඉවත් කර දේශීය Notification මඟින් තොරතුරු යවනු ලැබේ.
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-black text-rose-900 dark:text-rose-200">
                      💡 අනතුර ඉවත් කළ හේතුව තෝරන්න (Reason):
                    </label>
                    <select
                      value={selectedCancelReason}
                      onChange={(e) => setSelectedCancelReason(e.target.value)}
                      className="w-full p-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-rose-400 text-slate-900 dark:text-slate-100"
                    >
                      <option value="ආපදා අවදානම පහව ගොස් ඇති බැවින් නිවේදනය ඉවත් කරන ලදී.">ආපදා අවදානම පහව ගොස් ඇති බැවින් නිවේදනය ඉවත් කරන ලදී.</option>
                      <option value="අසත්‍ය හෝ අත්වැරදීමකින් දැමූ නිවේදනයක් බැවින් ඉවත් කරන ලදී.">අසත්‍ය හෝ අත්වැරදීමකින් දැමූ නිවේදනයක් බැවින් ඉවත් කරන ලදී.</option>
                      <option value="හදිසි සහන සේවා මඟින් තත්ත්වය පාලනය කරන ලදී.">හදිසි සහන සේවා මඟින් තත්ත්වය පාලනය කරන ලදී.</option>
                      <option value="custom">වෙනත් හේතුවක් සටහන් කරන්න...</option>
                    </select>

                    {selectedCancelReason === 'custom' && (
                      <input
                        type="text"
                        placeholder="ඉවත් කළ නිශ්චිත හේතුව මෙහි ලියන්න..."
                        value={customCancelReason}
                        onChange={(e) => setCustomCancelReason(e.target.value)}
                        className="w-full p-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-rose-400 text-slate-900 dark:text-slate-100 mt-1"
                      />
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmDialog(null)}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
                    >
                      අවලංගු කරන්න
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCancelAlert}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      <span>ඔව්, අනතුර ඉවත් කරන්න</span>
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                මෙම ආපදා නිවේදනය සඳහා පහත පියවර ගන්න:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDialog('resolve');
                    setShowReporterUpdateInput(false);
                  }}
                  disabled={isSubmitting}
                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>01. ආපදාව විසඳුනා</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConfirmDialog('cancel_delete');
                    setShowReporterUpdateInput(false);
                  }}
                  disabled={isSubmitting}
                  className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>02. අනතුර ඉවත් කරන්න</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowReporterUpdateInput(!showReporterUpdateInput);
                    setConfirmDialog(null);
                  }}
                  disabled={isSubmitting}
                  className="py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>03. තව අදහසක් දක්වන්න</span>
                </button>
              </div>

              {/* Option 03: Live update box */}
              {showReporterUpdateInput && (
                <form onSubmit={handleSendReporterUpdate} className="pt-3 space-y-2 border-t border-amber-300 dark:border-amber-800/60">
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
                      autoFocus
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !reporterUpdateText.trim()}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>යවන්න</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Fake Alert Warning (Non-authors) */}
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

          {/* Fake Report Modal Panel */}
          {showFakeReportModal && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500/60 space-y-3">
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

          {/* Comments Feed */}
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
                localComments.map((c) => {
                  const isReporterComment = c.userName?.includes('වාර්තාකරු') || c.isReporterUpdate;
                  return (
                    <div
                      key={c.id || `${c.userId}-${c.createdAt}`}
                      className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                        isReporterComment
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
                          : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/5 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] border-b border-slate-100 dark:border-white/5 pb-1">
                        <strong className="font-bold flex items-center gap-1">
                          {isReporterComment ? `📢 ${c.userName}` : c.userName}
                        </strong>
                        <span className="text-slate-400 font-mono">{c.createdAtDisplay || ''}</span>
                      </div>
                      <p className="font-medium leading-relaxed pt-1">{c.comment || c.text}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Post Comment Input */}
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
