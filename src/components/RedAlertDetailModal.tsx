import React, { useState, useEffect, useRef } from 'react';

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

  Calendar,

  Navigation,

  VolumeX,

  User as UserIcon,

  EyeOff

} from 'lucide-react';

import { RedAlertItem, RedAlertComment, User, LocationOption } from '../types';

import { getDisasterConfig } from '../data/redAlertData';

import { calculateDistanceKm } from '../utils/geoUtils';

import { checkIsAdmin } from '../utils/postOwnerHelper';

import {

  addCommentToRedAlert,
  deleteRedAlertInFirestore,

  reportRedAlertAsFake,

  markRedAlertAsResolved,

  cancelRedAlertByReporter,

  addReporterUpdateToRedAlert,

  castWeightedRedAlertVoteTransaction

} from '../lib/firebase';

import { broadcastRedAlertResolvedNotification } from '../utils/notificationManager';

import { stopEmergencySiren, setEmergencySirenLock } from '../utils/sirenAudio';

import {
  calculateAlertConfidenceState,
  calculateUserVoteWeight,
  checkVoterGpsEligibility,
  getDeviceFingerprint,
} from '../utils/redAlertVoteEngine';

export interface RedAlertDetailModalProps {

  alert: RedAlertItem | null;

  isOpen: boolean;

  onClose: () => void;

  currentUser?: User | null;

  currentLocation?: LocationOption;

  onAlertUpdated?: (updatedAlert: RedAlertItem) => void;

  onAlertDeleted?: (alertId: string) => void;

}

export const RedAlertDetailModal: any = ({

  alert,

  isOpen,

  onClose,

  currentUser,

  currentLocation,

  onAlertUpdated,

  onAlertDeleted,
}: RedAlertDetailModalProps) => {

  const [localComments, setLocalComments] = useState([] as RedAlertComment[]);

  const [localFakeReports, setLocalFakeReports] = useState([] as any[]);

  const [commentText, setCommentText] = useState('');

  const [showCommentsPanel, setShowCommentsPanel] = useState(true);

  const [reporterUpdateText, setReporterUpdateText] = useState('');

  const [showReporterUpdateInput, setShowReporterUpdateInput] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [commenterName, setCommenterName] = useState(currentUser?.name || '');

  const [actionSuccessMsg, setActionSuccessMsg] = useState(null as any);

  const [sirenStoppedByMe, setSirenStoppedByMe] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null as any);

  const [selectedResolveReason, setSelectedResolveReason] = useState('ආපදා තත්ත්වය සාර්ථකව පාලනය කර සාමාන්‍ය තත්ත්වයට පත් කරන ලදී.');

  const [customResolveReason, setCustomResolveReason] = useState('');

  const [selectedCancelReason, setSelectedCancelReason] = useState('ආපදා අවදානම පහව ගොස් ඇති බැවින් නිවේදනය ඉවත් කරන ලදී.');

  const [customCancelReason, setCustomCancelReason] = useState('');

  const [showFakeReportModal, setShowFakeReportModal] = useState(false);

  const [fakeReason, setFakeReason] = useState('අසත්‍ය දැන්වීමක් / අසත්‍ය පුවතක් (Fake news)');

  const [fakeNotes, setFakeNotes] = useState('');

  const [isReportingFake, setIsReportingFake] = useState(false);

  const [fakeReportedSuccess, setFakeReportedSuccess] = useState(false);

  const [copiedShare, setCopiedShare] = useState(false);

  const [localVotesMap, setLocalVotesMap] = useState<Record<string, any>>({});
  const [isCastingVote, setIsCastingVote] = useState(false);
  const [gpsConfirmed5km, setGpsConfirmed5km] = useState(true);
  const [voteErrorMsg, setVoteErrorMsg] = useState<string | null>(null);

  const commentInputRef = useRef(null as any);

  useEffect(() => {

    if (alert) {

      setLocalComments(((alert.comments as RedAlertComment[]) || []));

      setLocalFakeReports(Array.isArray(alert.fakeReports) ? alert.fakeReports : []);

      setLocalVotesMap(alert.votesMap && typeof alert.votesMap === 'object' ? { ...alert.votesMap } : {});

      setVoteErrorMsg(null);

      setConfirmDialog(null);

      setShowReporterUpdateInput(false);

      setActionSuccessMsg(null);

      setShowCommentsPanel(true);

      try {

        const stoppedList = JSON.parse(localStorage.getItem('sahaya_siren_stopped_alerts') || '[]');
        const dismissedList = JSON.parse(localStorage.getItem('sahaya_dismissed_alerts') || '[]');
        const myAlerts = JSON.parse(localStorage.getItem('sahaya_my_created_alerts') || '[]');
        const codeVal = (alert as any).alertCode;
        const alreadyStopped =
          (Array.isArray(stoppedList) && (stoppedList.includes(alert.id) || (codeVal && stoppedList.includes(codeVal)))) ||
          (Array.isArray(dismissedList) && (dismissedList.includes(alert.id) || (codeVal && dismissedList.includes(codeVal)))) ||
          (Array.isArray(myAlerts) && (myAlerts.includes(alert.id) || (codeVal && myAlerts.includes(codeVal))));

        setSirenStoppedByMe(alreadyStopped);
        if (alreadyStopped && isOpen) {
          setEmergencySirenLock(false);
          stopEmergencySiren(true);
        }

      } catch {

        setSirenStoppedByMe(false);

      }

    }

  }, [alert, isOpen]);

  useEffect(() => {

    if (currentUser?.name) {

      setCommenterName(currentUser.name);

    }

  }, [currentUser]);

  if (!isOpen || !alert) return null;

  const isAdmin = checkIsAdmin(currentUser);

  let isCreatedByThisBrowser = false;

  try {

    const myAlerts = JSON.parse(localStorage.getItem('sahaya_my_created_alerts') || '[]');

    if (Array.isArray(myAlerts) && alert?.id && myAlerts.includes(alert.id)) {

      isCreatedByThisBrowser = true;

    }

  } catch {}

  const alertAny = alert as any;

  const isAuthorOfAlert = Boolean(

    isCreatedByThisBrowser ||

    (currentUser && alert && (

      (alert.reportedByUserId && (

        (currentUser.id && alert.reportedByUserId === currentUser.id) ||

        (currentUser.userId && alert.reportedByUserId.toLowerCase() === currentUser.userId.toLowerCase()) ||

        (currentUser.nicNumber && alert.reportedByUserId.toLowerCase() === currentUser.nicNumber.toLowerCase()) ||

        ((currentUser as any).userNumericId && alert.reportedByUserId === (currentUser as any).userNumericId)

      )) ||

      (alertAny.reportedByPhone && currentUser.phone && alertAny.reportedByPhone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '')) ||

      (alertAny.reportedByName && currentUser.name && alertAny.reportedByName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())

    ))

  );

  const canManageAlert = isAuthorOfAlert || isAdmin;

  const stopSirenForThisAlert = () => {

    try {

      setEmergencySirenLock(false);
      stopEmergencySiren(true);

    } catch (_) {}

    try {

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {

        navigator.vibrate(0);

      }

    } catch (_) {}

    try {

      if (typeof window !== 'undefined' && (window as any).SahayaNativeAlertChannel) {

        (window as any).SahayaNativeAlertChannel.postMessage('STOP_RED_ALERT');

        (window as any).SahayaNativeAlertChannel.postMessage('STOP_SIREN');

      }

    } catch (_) {}

    try {

      localStorage.setItem('sahaya_last_siren_stopped_at_ms', String(Date.now()));

    } catch (_) {}

    if (alert?.id) {

      try {

        const uid = currentUser?.userId || currentUser?.id || currentUser?.nicNumber || 'usr_guest';

        const keys = ['sahaya_siren_stopped_alerts', 'sahaya_dismissed_alerts', `sahaya_dismissed_alerts_${uid}`];

        const idsToStore = [String(alert.id)];
        if (alertAny?.alertCode) idsToStore.push(String(alertAny.alertCode));

        keys.forEach((k) => {

          const list = JSON.parse(localStorage.getItem(k) || '[]');

          if (Array.isArray(list)) {

            idsToStore.forEach((val) => {
              if (val && !list.includes(val)) {
                list.push(val);
              }
            });

            localStorage.setItem(k, JSON.stringify(list));

          }

        });

      } catch (_) {}

    }

    try {
      window.dispatchEvent(new CustomEvent('sahaya_stop_all_red_alert_sirens', {
        detail: { alertId: alert?.id, alertCode: alertAny?.alertCode }
      }));
    } catch (_) {}

    setSirenStoppedByMe(true);

    setActionSuccessMsg('🔇 සයිරන් නාදය සාර්ථකව නවත්වන ලදී.');

  };

  const handleConfirmResolveAlert = async () => {

    if (!alert?.id) return;

    setIsSubmitting(true);

    stopSirenForThisAlert();

    const finalReason = selectedResolveReason === 'custom' ? customResolveReason.trim() : selectedResolveReason;

    const nowIso = new Date().toISOString();

    const resolvedTimeFormatted = `${new Date().toLocaleDateString('si-LK')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

    const actorName = currentUser?.name || alertAny.reportedByName || (isAdmin ? 'පරිපාලක (Admin)' : 'වාර්තාකරු');

    try {

      await markRedAlertAsResolved(alert.id, finalReason);

      const updatedItem: any = {

        ...alert,

        status: 'resolved',

        statusChangeMessage: `✅ ආපදාව විසඳුනු බව සටහන් කළේය: ${finalReason}`,

        resolvedAt: nowIso,

        resolvedAtDisplay: resolvedTimeFormatted,

        resolvedReason: finalReason,

        adminActionNote: finalReason,

      };

      broadcastRedAlertResolvedNotification({

        alertId: alert.id,

        alertCode: alertAny.alertCode,

        disasterTitle: alertAny.disasterTitleSi || alertAny.disasterTitleEn || alert.title || 'හදිසි ආපදා අවදානම',

        locationName: alert.locationName || 'ශ්‍රී ලංකාව',

        resolvedTime: resolvedTimeFormatted,

        resolvedReason: finalReason,

        resolvedBy: actorName,

      });

      onAlertUpdated?.(updatedItem);

      setActionSuccessMsg(`✅ දැන්වීම විසඳුණු බවට සටහන් විය (${resolvedTimeFormatted})`);

      setConfirmDialog(null);

    } catch (err) {

      console.error('Error resolving alert:', err);

      setActionSuccessMsg('⚠️ තත්ත්වය වෙනස් කිරීමට නොහැකි විය.');

    } finally {

      setIsSubmitting(false);

    }

  };

  const handleConfirmCancelAlert = async () => {

    if (!alert?.id) return;

    setIsSubmitting(true);

    stopSirenForThisAlert();

    const finalReason = selectedCancelReason === 'custom' ? customCancelReason.trim() : selectedCancelReason;

    const nowIso = new Date().toISOString();

    const deletedTimeFormatted = `${new Date().toLocaleDateString('si-LK')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

    const actorName = currentUser?.name || alertAny.reportedByName || (isAdmin ? 'පරිපාලක (Admin)' : 'වාර්තාකරු');

    try {

      await cancelRedAlertByReporter(alert.id, finalReason);

      const updatedItem: any = {

        ...alert,

        status: 'cancelled',

        isDeleted: true,

        statusChangeMessage: `🗑️ මෙම දැන්වීම ඉවත් කරන ලදී (${deletedTimeFormatted})`,

        cancelledAt: nowIso,

        deletedAt: nowIso,

        deletedAtDisplay: deletedTimeFormatted,

        cancelledReason: finalReason,

        adminActionNote: finalReason,

      };

      broadcastRedAlertResolvedNotification({

        alertId: alert.id,

        alertCode: alertAny.alertCode,

        disasterTitle: alertAny.disasterTitleSi || alertAny.disasterTitleEn || alert.title || 'හදිසි ආපදා අවදානම',

        locationName: alert.locationName || 'ශ්‍රී ලංකාව',

        resolvedTime: deletedTimeFormatted,

        resolvedReason: finalReason,

        resolvedBy: actorName,

      });

      onAlertUpdated?.(updatedItem);

      setActionSuccessMsg(`🗑️ දැන්වීම ඉවත් කරන ලදී — දිනය සහ වේලාව: ${deletedTimeFormatted}`);

      setConfirmDialog(null);

    } catch (err) {

      console.error('Error cancelling alert:', err);

      setActionSuccessMsg('⚠️ ඉවත් කිරීමට නොහැකි විය.');

    } finally {

      setIsSubmitting(false);

    }

  };

  const handleAdminPermanentDelete = async () => {
    if (!alert?.id) return;
    setIsSubmitting(true);
    stopSirenForThisAlert();
    try {
      await deleteRedAlertInFirestore(alert.id);
      if (onAlertDeleted) {
        onAlertDeleted(alert.id);
      }
      setActionSuccessMsg('🔥 දැන්වීම සියලුම පරිශීලකයන්ට නොපෙනෙන ලෙස සදහටම (Permanently) මකා දමන ලදී!');
      setConfirmDialog(null);
      setTimeout(() => onClose(), 600);
    } catch (err) {
      console.error('Error permanently deleting alert:', err);
      setActionSuccessMsg('⚠️ සදහටම මකා දැමීමට නොහැකි විය.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReporterUpdate = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!alert?.id || !reporterUpdateText.trim()) return;

    setIsSubmitting(true);

    const text = reporterUpdateText.trim();

    const reporterDispName = currentUser?.name || alertAny.reportedByName || 'වාර්තාකරු';

    try {

      await addReporterUpdateToRedAlert(alert.id, text, {

        reporterId: currentUser?.userId || currentUser?.id || '',

        reporterName: reporterDispName,

      });

      const newCommentObj: any = {

        id: `comm_${Date.now()}`,

        userId: currentUser?.userId || currentUser?.id || '',

        userName: `${reporterDispName} (වාර්තාකරු)`,

        authorName: `${reporterDispName} (වාර්තාකරු)`,

        userPhone: currentUser?.phone || '',

        comment: text,

        text: text,

        createdAt: new Date().toISOString(),

        createdAtMs: Date.now(),

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

      } as any);

    } catch (err) {

      console.error('Error sending reporter update:', err);

      setActionSuccessMsg('⚠️ යාවත්කාලීන කිරීමට නොහැකි විය.');

    } finally {

      setIsSubmitting(false);

    }

  };

  const handleAddComment = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!alert?.id || !commentText.trim()) return;

    setIsSubmitting(true);

    const dispName = isAuthorOfAlert

      ? `${commenterName.trim() || alertAny.reportedByName || 'වාර්තාකරු'} (වාර්තාකරු)`

      : (commenterName.trim() || currentUser?.name || 'පරිශීලකයෙක්');

    const newComment: any = {

      id: `comm_${Date.now()}`,

      userId: currentUser?.userId || currentUser?.id || '',

      userName: dispName,

      userPhone: currentUser?.phone || '',

      comment: commentText.trim(),

      text: commentText.trim(),

      createdAt: new Date().toISOString(),

      createdAtMs: Date.now(),

      createdAtDisplay: `${new Date().toLocaleDateString('si-LK')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,

      isReporterUpdate: isAuthorOfAlert,

    };

    try {

      await addCommentToRedAlert(alert.id, newComment);

      const updated = [...localComments, newComment];

      setLocalComments(updated);

      setCommentText('');

      onAlertUpdated?.({

        ...alert,

        comments: updated,

        commentsCount: updated.length,

      } as any);

    } catch (err) {

      console.error('Error submitting comment:', err);

      setActionSuccessMsg('⚠️ අදහස එක් කිරීමට නොහැකි විය.');

    } finally {

      setIsSubmitting(false);

    }

  };

  const handleReportFake = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!alert?.id) return;

    setIsReportingFake(true);

    const uid = currentUser?.userId || currentUser?.id || `guest_${Date.now()}`;

    const report: any = {

      id: `rep_${Date.now()}`,

      userId: uid,

      reportedByUserId: uid,

      userName: currentUser?.name || 'පරිශීලක',

      reportedByUserName: currentUser?.name || 'පරිශීලක',

      userPhone: currentUser?.phone || '',

      reason: fakeReason,

      additionalNotes: fakeNotes.trim(),

      reportedAt: new Date().toISOString(),

    };

    try {

      await reportRedAlertAsFake(alert.id, report);

      const alreadyInList = localFakeReports.some((r: any) => r && (r.userId === uid || r.reportedByUserId === uid));

      const nextReports = alreadyInList ? localFakeReports : [...localFakeReports, report];

      const nextCount = nextReports.length;

      const isNowFake = Math.max(nextCount, 4) === nextCount;

      setLocalFakeReports(nextReports);

      setFakeReportedSuccess(true);

      const updatedAlert: any = {

        ...alert,

        fakeReports: nextReports,

        fakeReportsCount: nextCount,

        isFlaggedFake: isNowFake,

      };

      onAlertUpdated?.(updatedAlert);

      if (isNowFake) {
        stopSirenForThisAlert();
        setActionSuccessMsg('⚠️ පරිශීලකයන් 4 දෙනෙකු අසත්‍යයක් ලෙස වාර්තා කළ බැවින් මෙය අසත්‍ය ලෙස පළකරන ලද දැන්වීමක් ලෙස Highlight කරන ලදී!');
      } else {
        setActionSuccessMsg('🚩 අසත්‍යයක් ලෙස ඔබගේ ප්‍රතිචාරය සටහන් විය (' + nextCount + '/4).');
      }

      setTimeout(() => {

        setShowFakeReportModal(false);

        setFakeReportedSuccess(false);

      }, 1500);

    } catch (err) {

      console.error('Error reporting fake alert:', err);

      setActionSuccessMsg('⚠️ වාර්තා කිරීමේදී දෝෂයක් ඇතිවිය.');

    } finally {

      setIsReportingFake(false);

    }

  };

  const handleShare = () => {

    const titleStr = alertAny.disasterTitleSi || alert.title || 'හදිසි ආපදාවක්';

    const text = `🚨 [රතු එළිය - හදිසි ආපදා අනතුරු ඇඟවීම]\nආපදාව: ${titleStr}\nස්ථානය: ${alert.locationName}\nදිනය/වේලාව: ${alertAny.incidentDate || ''} ${alertAny.incidentTime || ''}\n\nසහය සේවා (Sahaya Sewa) ඇප් එක හරහා සජීවීව බලන්න.`;

    if (navigator.clipboard) {

      navigator.clipboard.writeText(text);

      setCopiedShare(true);

      setTimeout(() => setCopiedShare(false), 2500);

    }

  };

  const config = getDisasterConfig(alert.disasterType);

  const alertLat = typeof alertAny.latitude === 'number' ? alertAny.latitude : alert.lat;

  const alertLng = typeof alertAny.longitude === 'number' ? alertAny.longitude : alert.lng;

  let distanceKm = 0;

  if (currentLocation && typeof currentLocation.lat === 'number' && typeof currentLocation.lng === 'number' && typeof alertLat === 'number' && typeof alertLng === 'number') {

    distanceKm = calculateDistanceKm(currentLocation.lat, currentLocation.lng, alertLat, alertLng);

  }

  const isWithin15Km = Math.min(distanceKm, 15) === distanceKm;

  const distanceDisplay = Math.min(distanceKm, 1) === distanceKm && distanceKm !== 1

    ? `මීටර් ${Math.round(distanceKm * 1000)}`

    : `කි.මී. ${distanceKm.toFixed(1)}`;

  const alertWithLocalVotes: RedAlertItem = {
    ...alert,
    votesMap: Object.keys(localVotesMap).length > 0 ? localVotesMap : alert.votesMap,
  };

  const confidenceState = calculateAlertConfidenceState(alertWithLocalVotes);
  const currentVoterId = String(currentUser?.userId || currentUser?.id || currentUser?.nicNumber || 'guest_voter').trim();
  let localSavedVote: any = null;
  try {
    const rawSaved = localStorage.getItem('sahaya_voted_red_alerts_map');
    const savedMap = rawSaved ? JSON.parse(rawSaved) : {};
    if (alert?.id && savedMap[alert.id]) {
      localSavedVote = savedMap[alert.id];
    }
  } catch {}
  const existingUserVote =
    localVotesMap[currentVoterId] ||
    (currentUser?.id ? localVotesMap[String(currentUser.id)] : null) ||
    (currentUser?.userId ? localVotesMap[String(currentUser.userId)] : null) ||
    alert.votesMap?.[currentVoterId] ||
    (currentUser?.id ? alert.votesMap?.[String(currentUser.id)] : null) ||
    (currentUser?.userId ? alert.votesMap?.[String(currentUser.userId)] : null) ||
    (currentUser?.nicNumber ? alert.votesMap?.[String(currentUser.nicNumber)] : null) ||
    localSavedVote ||
    null;
  const voterWeightInfo = calculateUserVoteWeight(currentUser, existingUserVote?.flipCount || 0);
  const gpsEligibility = checkVoterGpsEligibility(
    alertLat,
    alertLng,
    currentLocation?.lat ?? null,
    currentLocation?.lng ?? null,
    5.0
  );

  const handleCastWeightedVote = async (voteType: 'true' | 'false') => {
    if (!alert?.id || isCastingVote) return;
    setVoteErrorMsg(null);

    if (existingUserVote) {
      setVoteErrorMsg('එක් ගිණුමකින් සත්‍ය/අසත්‍ය ලෙස ලකුණු දිය හැක්කේ එක් වරක් පමණි. ඔබ දැනටමත් ප්‍රතිචාර දක්වා ඇත.');
      return;
    }

    if (isAuthorOfAlert) {
      setVoteErrorMsg('වාර්තා කළ පුද්ගලයාට තමන්ගේම නිවේදනයට ඡන්දය දිය නොහැක.');
      return;
    }

    if (!gpsConfirmed5km) {
      setVoteErrorMsg('කරුණාකර ඔබ මෙම ස්ථානයේ සිට කි.මී. 5ක් ඇතුළත සිටින බව තහවුරු කරන්න.');
      return;
    }

    if (gpsEligibility.hasCoordinates && !gpsEligibility.isWithinRadius && !isAdmin) {
      setVoteErrorMsg(
        `GPS පරීක්ෂාව: ඡන්දය ප්‍රකාශ කළ හැක්කේ සිදුවීම සිදුවූ ස්ථානයේ සිට කි.මී. 5ක් ඇතුළත සිටින අයට පමණි (ඔබ සිටින්නේ කි.මී. ${gpsEligibility.distanceKm} දුරිනි).`
      );
      return;
    }

    setIsCastingVote(true);
    try {
      const fp = await getDeviceFingerprint();
      const result = await castWeightedRedAlertVoteTransaction({
        alertId: alert.id,
        userId: currentVoterId,
        userName: currentUser?.name || 'ප්‍රජා සාමාජික',
        userPhone: currentUser?.phone || '',
        voteType,
        baseWeight: voterWeightInfo.baseWeight,
        trustLevel: voterWeightInfo.level,
        distanceKm: gpsEligibility.distanceKm ?? distanceKm,
        deviceFingerprint: fp,
      });

      try {
        const rawSaved = localStorage.getItem('sahaya_voted_red_alerts_map');
        const savedMap = rawSaved ? JSON.parse(rawSaved) : {};
        savedMap[alert.id] = result.userVote;
        localStorage.setItem('sahaya_voted_red_alerts_map', JSON.stringify(savedMap));
      } catch {}

      const updatedVotesMap = {
        ...localVotesMap,
        [currentVoterId]: result.userVote,
      };
      setLocalVotesMap(updatedVotesMap);

      const updatedAlertObj: RedAlertItem = {
        ...alert,
        votesMap: updatedVotesMap,
        trueVotes: result.trueVotes,
        falseVotes: result.falseVotes,
        weightedTrueScore: result.weightedTrueScore,
        weightedFalseScore: result.weightedFalseScore,
        score: result.score,
        confidenceStatus: result.confidenceStatus,
        isRemovedAsFake: result.confidenceStatus === 'removed',
        isFlaggedFake: result.confidenceStatus === 'disputed' || result.confidenceStatus === 'removed',
      };

      onAlertUpdated?.(updatedAlertObj);

      if (result.confidenceStatus === 'removed') {
        stopSirenForThisAlert();
        setActionSuccessMsg('❌ ප්‍රජා ඡන්ද මගින් ලකුණු -10 සීමාවට ළඟා වූ බැවින් මෙම නිවේදනය අසත්‍ය ලෙස ඉවත් කර සංරක්ෂණය (Archive) කරන ලදී.');
      } else if (result.crossedConfirmedThreshold) {
        setActionSuccessMsg('✅ ලකුණු +10 ඉක්මවූ බැවින් රතු එළිය පූර්ණ ලෙස තහවුරු විය! සියලුම Push නාලිකා (Web Push, ntfy.sh, Telegram, RSS) වෙත නිවේදනය යොමු කරන ලදී.');
      } else if (result.crossedNearbyThreshold) {
        setActionSuccessMsg('🟢 ලකුණු +4 සීමාව පසු කළ බැවින් "බොහෝ දුරට සත්‍ය" තත්ත්වයට පත් විය!');
      } else {
        setActionSuccessMsg(
          voteType === 'true'
            ? `✅ ඔබේ "සත්‍යයි" ඡන්දය (+${result.userVote.weight} බර) සාර්ථකව සටහන් විය! (ශුද්ධ ලකුණු: ${result.score >= 0 ? '+' + result.score : result.score})`
            : `❌ ඔබේ "අසත්‍යයි" ඡන්දය (-${result.userVote.weight} බර) සාර්ථකව සටහන් විය! (ශුද්ධ ලකුණු: ${result.score >= 0 ? '+' + result.score : result.score})`
        );
      }
    } catch (err: any) {
      setVoteErrorMsg(err?.message || 'ඡන්දය සටහන් කිරීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setIsCastingVote(false);
    }
  };

  const fakeVotesCount = Math.max(confidenceState.falseVotes, localFakeReports.length, alert.fakeReportsCount || 0);

  const isFakeHighlighted = Boolean(
    confidenceState.confidenceStatus === 'removed' ||
    confidenceState.confidenceStatus === 'disputed' ||
    alertAny.isFlaggedFake ||
    alert.status === 'fake'
  );

  const isDeletedOrCancelled = Boolean(alert.status === 'cancelled' || alertAny.isDeleted);

  const isResolved = Boolean(alert.status === 'resolved');

  const formatTimestampSi = (isoOrDisplay?: string) => {

    if (!isoOrDisplay) return 'දැන්';

    if (isoOrDisplay.includes(':') && !isoOrDisplay.includes('T')) return isoOrDisplay;

    try {

      const d = new Date(isoOrDisplay);

      if (isNaN(d.getTime())) return isoOrDisplay;

      return `${d.toLocaleDateString('si-LK')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

    } catch {

      return isoOrDisplay;

    }

  };

  const deletedTimestampText = formatTimestampSi(alertAny.deletedAtDisplay || alert.cancelledAt || alertAny.deletedAt);

  const resolvedTimestampText = formatTimestampSi(alertAny.resolvedAtDisplay || alert.resolvedAt);

  const h = React.createElement;

  return h(

    'div',

    { className: 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xl overflow-y-auto' },

    h(

      'div',

      {

        className: `relative w-full max-w-2xl bg-white dark:bg-[#0c1812] border-4 ${

          isFakeHighlighted

            ? 'border-yellow-400 shadow-[0_0_60px_rgba(250,204,21,0.6)]'

            : isDeletedOrCancelled

            ? 'border-slate-500 shadow-2xl'

            : 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.35)]'

        } rounded-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col`

      },

      h(

        'div',

        {

          className: `${

            isFakeHighlighted

              ? 'bg-gradient-to-r from-amber-600 via-red-700 to-amber-700'

              : isDeletedOrCancelled

              ? 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900'

              : isResolved

              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'

              : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700'

          } p-3.5 sm:p-4 text-white shadow-md shrink-0`

        },

        h(

          'div',

          { className: 'flex items-center justify-between gap-2' },

          h(

            'div',

            { className: 'flex items-center gap-2.5 min-w-0' },

            h(

              'div',

              { className: 'w-10 h-10 rounded-2xl bg-white text-red-600 font-black flex items-center justify-center text-xl shadow-md shrink-0' },

              config.icon

            ),

            h(

              'div',

              { className: 'min-w-0' },

              h(

                'div',

                { className: 'flex items-center gap-1.5 flex-wrap' },

                h(

                  'span',

                  { className: 'bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono shrink-0' },

                  alertAny.alertCode || '#RED'

                ),

                isFakeHighlighted
                  ? h(
                      'span',
                      { className: 'bg-yellow-300 text-red-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 animate-pulse' },
                      '⚠️ මෙය අසත්‍ය ලෙස පළකරන ලද දැන්වීමකි'
                    )

                  : isDeletedOrCancelled

                  ? h(

                      'span',

                      { className: 'bg-rose-200 text-rose-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0' },

                      '🗑️ ඉවත් කරන ලදී'

                    )

                  : isResolved

                  ? h(

                      'span',

                      { className: 'bg-emerald-300 text-emerald-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0' },

                      '✅ විසඳන ලදී'

                    )

                  : h(

                      'span',

                      { className: 'bg-red-500/90 text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase animate-pulse shrink-0' },

                      '🚨 ක්‍රියාකාරී ආපදාවකි (15KM)'

                    )

              ),

              h(

                'h2',

                { className: 'text-sm sm:text-base font-black tracking-wide text-white pt-0.5 truncate' },

                alertAny.disasterTitleSi || alert.title

              )

            )

          ),

          h(

            'div',

            { className: 'flex items-center gap-1.5 shrink-0' },

            canManageAlert && !isDeletedOrCancelled

              ? h(

                  'button',

                  {

                    type: 'button',

                    onClick: () => setConfirmDialog('cancel_delete'),

                    disabled: isSubmitting,

                    className: 'p-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-white border border-red-400/40 transition-all cursor-pointer',

                    title: 'දැන්වීම ඉවත් කරන්න'

                  },

                  h(Trash2, { className: 'w-4 h-4 text-red-200' })

                )

              : null,

            h(

              'button',

              {

                type: 'button',

                onClick: handleShare,

                className: 'p-2 rounded-xl bg-black/25 hover:bg-black/40 text-white transition-all cursor-pointer',

                title: 'Share alert text'

              },

              h(Share2, { className: 'w-4 h-4' })

            ),

            h(

              'button',

              {

                type: 'button',

                onClick: onClose,

                className: 'w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/25 hover:bg-black/45 text-white flex items-center justify-center transition-all cursor-pointer',

                title: 'වසන්න'

              },

              h(X, { className: 'w-4 h-4 sm:w-5 sm:h-5' })

            )

          )

        )

      ),

      copiedShare

        ? h(

            'div',

            { className: 'bg-emerald-500 text-white text-xs font-bold py-1.5 px-4 text-center shrink-0' },

            '✅ ආපදා තොරතුරු Clipboard එකට පිටපත් විය!'

          )

        : null,

      actionSuccessMsg

        ? h(

            'div',

            { className: 'bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center shrink-0 flex items-center justify-center gap-1.5' },

            h(CheckCircle2, { className: 'w-4 h-4 shrink-0' }),

            h('span', null, actionSuccessMsg)

          )

        : null,

      h(

        'div',

        { className: 'p-3.5 sm:p-5 space-y-4 overflow-y-auto flex-1 flex flex-col' },

        isFakeHighlighted
          ? h(
              'div',
              { className: 'p-4 rounded-2xl bg-yellow-400 text-red-950 border-4 border-red-600 shadow-lg space-y-1 animate-pulse' },
              h(
                'div',
                { className: 'flex items-center gap-2 font-black text-sm sm:text-base uppercase' },
                h(AlertTriangle, { className: 'w-6 h-6 text-red-700 shrink-0' }),
                h('span', null, '⚠️ මෙය අසත්‍ය ලෙස පළකරන ලද දැන්වීමකි!')
              ),
              h(
                'p',
                { className: 'text-xs font-extrabold text-red-900' },
                'පරිශීලකයන් ' + fakeVotesCount + ' දෙනෙකු විසින් මෙම දැන්වීම අසත්‍යයක් (Fake Alert) ලෙස වාර්තා කර තහවුරු කර ඇත.'
              )

            )

          : null,

        isDeletedOrCancelled

          ? h(

              'div',

              { className: 'p-4 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-950 dark:text-rose-100 space-y-1 shadow-md' },

              h(

                'div',

                { className: 'flex items-center gap-2 font-black text-sm sm:text-base text-rose-700 dark:text-rose-300' },

                h(Trash2, { className: 'w-5 h-5 shrink-0' }),

                h('span', null, '🗑️ මෙම දැන්වීම ඉවත් කරන ලදී')

              ),

              h(

                'p',

                { className: 'text-xs font-extrabold text-rose-900 dark:text-rose-200' },

                `ඉවත් කළ දිනය සහ වේලාව: ${deletedTimestampText}`

              ),

              alert.cancelledReason

                ? h('p', { className: 'text-xs text-slate-700 dark:text-slate-300 font-semibold' }, `හේතුව: ${alert.cancelledReason}`)

                : null

            )

          : null,

        isResolved

          ? h(

              'div',

              { className: 'p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 space-y-1 shadow-md' },

              h(

                'div',

                { className: 'flex items-center gap-2 font-black text-sm sm:text-base text-emerald-700 dark:text-emerald-300' },

                h(CheckCircle2, { className: 'w-5 h-5 shrink-0' }),

                h('span', null, '✅ මෙම හදිසි ආපදා තත්ත්වය විසඳන ලදී')

              ),

              h(

                'p',

                { className: 'text-xs font-extrabold text-emerald-900 dark:text-emerald-200' },

                `විසඳූ දිනය සහ වේලාව: ${resolvedTimestampText}`

              ),

              alert.resolvedReason

                ? h('p', { className: 'text-xs text-slate-700 dark:text-slate-300 font-semibold' }, `විස්තරය: ${alert.resolvedReason}`)

                : null

            )

          : null,

        !isDeletedOrCancelled && !isResolved && isWithin15Km

          ? h(

              'div',

              {
                className: `p-3.5 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  sirenStoppedByMe
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/60'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-500/70'
                }`
              },

              h(

                'div',

                { className: 'text-xs space-y-0.5 text-center sm:text-left' },

                h(
                  'span',
                  {
                    className: `font-black block ${
                      sirenStoppedByMe ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                    }`
                  },
                  sirenStoppedByMe ? '🔇 15km හදිසි සයිරන් නාදය අක්‍රියයි' : '🔊 15km හදිසි සයිරන් කලාපය'
                ),

                h(

                  'span',

                  { className: 'text-slate-600 dark:text-slate-300 font-medium' },

                  sirenStoppedByMe

                    ? 'ඔබ මෙම දැන්වීම සඳහා සයිරන් නාදය නවත්වා ඇත.'

                    : 'ඔබගේ දුරකථනයේ සයිරන් නාදය ක්‍රියාත්මක නම් පහත බොත්තමෙන් නවත්වන්න.'

                )

              ),

              h(

                'button',

                {

                  type: 'button',

                  onClick: stopSirenForThisAlert,

                  className: `w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0 ${
                    sirenStoppedByMe
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white'
                  }`

                },

                h(sirenStoppedByMe ? CheckCircle2 : VolumeX, { className: 'w-4 h-4' }),

                h('span', null, sirenStoppedByMe ? 'සයිරන් නාදය නවත්වා ඇත (Stopped)' : 'සයිරන් එක නවත්වන්න (Stop Siren)')

              )

            )

          : null,

        h(

          'div',

          { className: 'p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4' },

          h(

            'div',

            { className: 'grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm' },

            h(

              'div',

              { className: 'flex items-start gap-3' },

              h(MapPin, { className: 'w-5 h-5 text-red-500 shrink-0 mt-0.5' }),

              h(

                'div',

                { className: 'w-full' },

                h('span', { className: 'font-bold text-slate-500 dark:text-slate-400 block mb-0.5' }, 'ස්ථානය:'),

                h('p', { className: 'font-black text-slate-900 dark:text-white text-sm sm:text-base' }, alert.locationName),

                typeof alertLat === 'number' && typeof alertLng === 'number'

                  ? h('p', { className: 'text-[11px] sm:text-xs text-slate-400 font-mono mt-0.5' }, `📍 Lat: ${alertLat.toFixed(4)}, Lng: ${alertLng.toFixed(4)}`)

                  : null

              )

            ),

            h(

              'div',

              { className: 'flex items-start gap-3' },

              h(Clock, { className: 'w-5 h-5 text-slate-500 shrink-0 mt-0.5' }),

              h(

                'div',

                null,

                h('span', { className: 'font-bold text-slate-500 dark:text-slate-400 block mb-0.5' }, 'දිනය සහ වේලාව:'),

                h('p', { className: 'font-black text-slate-900 dark:text-white text-sm sm:text-base' }, `${alertAny.incidentDate || formatTimestampSi(alert.createdAt)} - ${alertAny.incidentTime || ''}`),

                distanceKm !== 0

                  ? h(

                      'p',

                      { className: 'text-xs font-bold text-red-600 dark:text-red-400 mt-1 bg-red-100 dark:bg-red-900/30 inline-block px-2 py-0.5 rounded' },

                      `ඔබට ඇති දුර: ${distanceDisplay}`

                    )

                  : null

              )

            )

          ),

          h(

            'div',

            { className: 'pt-1' },

            h(

              'a',

              {

                href: `https://www.google.com/maps/dir/?api=1&destination=${typeof alertLat === 'number' && typeof alertLng === 'number' ? `${alertLat},${alertLng}` : encodeURIComponent(alert.locationName)}`,

                target: '_blank',

                rel: 'noopener noreferrer',

                className: 'w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer'

              },

              h(Navigation, { className: 'w-4 h-4 text-white animate-pulse shrink-0' }),

              h('span', null, '🗺️ Google Maps Navigation (ස්ථානයට මඟ පෙන්වන්න)')

            )

          ),

          alert.description

            ? h(

                'div',

                { className: 'p-4 mt-2 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border-2 border-amber-500/40 dark:border-amber-600/40 text-xs sm:text-sm shadow-sm space-y-1.5' },

                h(

                  'span',

                  { className: 'font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs sm:text-sm' },

                  h(AlertTriangle, { className: 'w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0' }),

                  h('span', null, 'හදිසි පණිවිඩය / විස්තරය (Emergency Note):')

                ),

                h(

                  'p',

                  { className: 'text-slate-900 dark:text-slate-100 leading-relaxed font-bold whitespace-pre-wrap break-words text-xs sm:text-sm pl-0.5' },

                  alert.description

                )

              )

            : null,

          alertAny.showReporterInfo && (alertAny.reportedByName || alertAny.reportedByPhone || alert.contactPhone)

            ? h(

                'div',

                { className: 'flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs' },

                h(

                  'div',

                  { className: 'min-w-0' },

                  h(

                    'span',

                    { className: 'font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5' },

                    h(UserIcon, { className: 'w-4 h-4 text-emerald-600' }),

                    h('span', null, 'වාර්තාකරුගේ තොරතුරු:')

                  ),

                  h(

                    'div',

                    { className: 'text-[11px] text-slate-700 dark:text-slate-200 mt-0.5' },

                    (alertAny.reportedByName || alert.contactName) ? h('span', { className: 'font-bold mr-2' }, `නම: ${alertAny.reportedByName || alert.contactName}`) : null,

                    (alertAny.reportedByPhone || alert.contactPhone) ? h('span', null, `දුරකථන: ${alertAny.reportedByPhone || alert.contactPhone}`) : null

                  )

                ),

                (alertAny.reportedByPhone || alert.contactPhone)

                  ? h(

                      'a',

                      {

                        href: `tel:${alertAny.reportedByPhone || alert.contactPhone}`,

                        className: 'flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold shadow-xs active:scale-95 transition-all shrink-0'

                      },

                      h(Phone, { className: 'w-3.5 h-3.5' }),

                      h('span', null, 'අමතන්න')

                    )

                  : null

              )

            : h(

                'div',

                { className: 'flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-400' },

                h(

                  'span',

                  { className: 'flex items-center gap-1.5 font-bold' },

                  h(EyeOff, { className: 'w-4 h-4 text-slate-500' }),

                  h('span', null, 'වාර්තාකරු තම නම සහ දුරකථන අංකය ප්‍රසිද්ධියේ පෙන්වීම අක්‍රීය කර ඇත.')

                )

              )

        ),

        canManageAlert

          ? h(

              'div',

              { className: 'p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-700/60 space-y-3 shadow-sm' },

              h(

                'div',

                { className: 'flex items-center gap-2' },

                h(ShieldAlert, { className: 'w-5 h-5 text-amber-600 dark:text-amber-400' }),

                h(

                  'span',

                  { className: 'text-xs sm:text-sm font-black text-amber-900 dark:text-amber-300' },

                  isAdmin ? '🛠️ පරිපාලක පාලන පුවරුව (Admin Actions):' : '🛠️ වාර්තාකරුගේ පාලන බොත්තම් (Reporter Controls):'

                )

              ),

              h(

                'div',

                { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1' },

                h(

                  'button',

                  {

                    type: 'button',

                    onClick: () => {

                      setConfirmDialog('resolve');

                      setShowReporterUpdateInput(false);

                    },

                    disabled: isSubmitting || isResolved,

                    className: 'py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer'

                  },

                  h(CheckCircle2, { className: 'w-4 h-4' }),

                  h('span', null, 'දැන්වීම විසඳුන බවට දැනුම් දෙන්න')

                ),

                h(

                  'button',

                  {

                    type: 'button',

                    onClick: () => {

                      setConfirmDialog('cancel_delete');

                      setShowReporterUpdateInput(false);

                    },

                    disabled: isSubmitting || isDeletedOrCancelled,

                    className: 'py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer'

                  },

                  h(Trash2, { className: 'w-4 h-4' }),

                  h('span', null, 'හදිසි/ආපදා දැන්වීම ඉවත් කරන්න')

                ),

                h(

                  'button',

                  {

                    type: 'button',

                    onClick: () => {

                      setShowCommentsPanel(true);

                      if (commentInputRef.current) commentInputRef.current.focus();

                    },

                    disabled: isSubmitting,

                    className: 'py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer'

                  },

                  h(MessageSquare, { className: 'w-4 h-4' }),

                  h('span', null, `අදහස් දක්වන්න (${localComments.length})`)
                )
              ),
              isAdmin
                ? h(
                    'div',
                    { className: 'pt-2 border-t border-amber-300 dark:border-amber-800/60' },
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: () => setConfirmDialog('admin_perm_delete'),
                        disabled: isSubmitting,
                        className: 'w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-700 via-rose-700 to-red-900 hover:from-red-800 hover:to-black text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg border border-red-400/50 active:scale-95 transition-all cursor-pointer'
                      },
                      h(Trash2, { className: 'w-4 h-4 text-yellow-300' }),
                      h('span', null, '🔥 සදහටම මකා දමන්න (Admin Permanent Delete - හැමෝටම නොපෙනෙන ලෙස ඉවත් කරන්න)')
                    )
                  )
                : null
            )
          : null,
        h(
          'div',
          { className: 'p-4 rounded-2xl bg-slate-900/95 text-white border-2 border-slate-700/80 space-y-3.5 shadow-xl' },
          // Header: Confidence Status & Net Weighted Score
          h(
            'div',
            { className: 'flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5' },
            h(
              'div',
              { className: 'space-y-0.5' },
              h(
                'span',
                { className: 'text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block' },
                '📊 ප්‍රජා විශ්වාස මිනුම (Confidence Bar • සමමිතික ±10)'
              ),
              h(
                'span',
                { className: `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border ${confidenceState.badgeBgClass}` },
                confidenceState.statusLabelSi
              )
            ),
            h(
              'div',
              { className: 'text-right bg-black/50 px-3 py-1.5 rounded-xl border border-slate-700' },
              h('span', { className: 'text-[10px] font-bold text-slate-400 block' }, 'ශුද්ධ ලකුණු (Score)'),
              h(
                'span',
                {
                  className: `text-base sm:text-lg font-black font-mono ${
                    confidenceState.score >= 4
                      ? 'text-emerald-400'
                      : confidenceState.score <= -4
                      ? 'text-rose-400'
                      : 'text-amber-300'
                  }`,
                },
                `${confidenceState.score > 0 ? '+' : ''}${confidenceState.score} / ±10`
              )
            )
          ),

          // 5-Zone Animated Confidence Bar
          h(
            'div',
            { className: 'space-y-1.5' },
            h(
              'div',
              { className: 'grid grid-cols-5 text-[10px] font-black text-center gap-1' },
              h('span', { className: 'bg-red-950/90 text-red-200 py-1 rounded border border-red-500/60' }, '❌ ≤-10 අසත්‍ය'),
              h('span', { className: 'bg-orange-950/80 text-orange-300 py-1 rounded border border-orange-700/50' }, '🟠 -4..-9 මතභේද'),
              h('span', { className: 'bg-yellow-950/80 text-yellow-200 py-1 rounded border border-yellow-600/50' }, '🟡 -3..+3 සැක'),
              h('span', { className: 'bg-emerald-950/80 text-emerald-300 py-1 rounded border border-emerald-600/50' }, '🟢 +4..+9 සත්‍ය'),
              h('span', { className: 'bg-emerald-900/90 text-emerald-100 py-1 rounded border border-emerald-400/70' }, '✅ ≥+10 තහවුරු')
            ),
            h(
              'div',
              { className: 'relative h-4 w-full rounded-full overflow-hidden bg-gradient-to-r from-red-600 via-orange-500 via-yellow-400 via-emerald-400 to-emerald-600 p-0.5 shadow-inner' },
              h('div', {
                className: 'absolute top-0 bottom-0 w-1 bg-white/60 left-1/2 -translate-x-1/2 z-10',
                title: '0 මධ්‍ය ලක්ෂ්‍යය',
              }),
              h('div', {
                className: 'h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.95)] transition-all duration-500',
                style: { width: `${Math.max(4, confidenceState.percentage)}%` },
              })
            ),
            h(
              'div',
              { className: 'flex items-center justify-between text-[11px] font-bold text-slate-300 pt-0.5' },
              h(
                'span',
                { className: 'text-rose-400' },
                `❌ අසත්‍ය ඡන්ද: ${confidenceState.falseVotes} (බර ලකුණු -${confidenceState.weightedFalseScore})`
              ),
              h(
                'span',
                { className: 'text-emerald-400' },
                `✅ සත්‍ය ඡන්ද: ${confidenceState.trueVotes} (බර ලකුණු +${confidenceState.weightedTrueScore})`
              )
            ),
            h('p', { className: 'text-[11px] text-slate-400 font-medium' }, confidenceState.statusSubLabelSi)
          ),

          // Voter Weight & Existing Vote Badge
          h(
            'div',
            { className: 'flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs' },
            h(
              'div',
              { className: 'flex items-center gap-2 flex-wrap' },
              h('span', { className: 'text-slate-300 font-bold' }, 'ඔබේ ඡන්ද බර:'),
              h(
                'span',
                { className: `px-2.5 py-0.5 rounded-full text-[11px] font-black border ${voterWeightInfo.badgeColor}` },
                `${voterWeightInfo.labelSi} -> ${voterWeightInfo.effectiveWeight}x`
              )
            ),
            existingUserVote
              ? h(
                  'span',
                  {
                    className: `px-2.5 py-1 rounded-lg font-black text-xs ${
                      existingUserVote.vote === 'true'
                        ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-400/50'
                        : 'bg-rose-600/30 text-rose-200 border border-rose-400/50'
                    }`,
                  },
                  existingUserVote.vote === 'true' ? 'ඔබේ ඡන්දය: සත්‍ය ✅' : 'ඔබේ ඡන්දය: අසත්‍ය ❌'
                )
              : h('span', { className: 'text-[11px] text-slate-400 font-semibold' }, 'ඔබ තවම ඡන්දය ප්‍රකාශ කර නැත')
          ),

          // 5km GPS Proximity Confirmation & Vote Buttons (Only for non-authors)
          !isAuthorOfAlert
            ? h(
                'div',
                { className: 'space-y-2.5 pt-1' },
                !existingUserVote
                  ? h(
                      'label',
                      { className: 'flex items-center gap-2 text-xs text-slate-200 font-bold cursor-pointer select-none bg-black/40 p-2.5 rounded-xl border border-slate-700/80' },
                      h('input', {
                        type: 'checkbox',
                        checked: gpsConfirmed5km,
                        onChange: (e: any) => setGpsConfirmed5km(Boolean(e.target.checked)),
                        className: 'w-4 h-4 rounded border-slate-500 text-emerald-500 focus:ring-emerald-500 cursor-pointer',
                      }),
                      h(
                        'span',
                        null,
                        `📍 ඔබ මෙම ස්ථානයේ (කි.මී. 5ක් ඇතුළත) සිටීද? — මම මෙම ස්ථානය අවට සිටින බව තහවුරු කරමි ${
                          gpsEligibility.distanceKm !== null ? `(GPS දුර: කි.මී. ${gpsEligibility.distanceKm})` : ''
                        }`
                      )
                    )
                  : null,
                voteErrorMsg
                  ? h(
                      'div',
                      { className: 'p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs font-bold' },
                      `⚠️ ${voteErrorMsg}`
                    )
                  : null,
                h(
                  'div',
                  { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' },
                  h(
                    'button',
                    {
                      type: 'button',
                      disabled: isCastingVote || Boolean(existingUserVote),
                      onClick: () => handleCastWeightedVote('true'),
                      className: `py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md border ${
                        existingUserVote?.vote === 'true'
                          ? 'bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400 cursor-not-allowed'
                          : existingUserVote
                          ? 'bg-slate-800/60 text-slate-400 border-slate-700 cursor-not-allowed opacity-60'
                          : 'bg-emerald-600/90 hover:bg-emerald-600 text-white border-emerald-400/50 cursor-pointer'
                      }`,
                    },
                    isCastingVote
                      ? h(Loader2, { className: 'w-4 h-4 animate-spin' })
                      : h(CheckCircle2, { className: 'w-4 h-4' }),
                    h(
                      'span',
                      null,
                      existingUserVote?.vote === 'true'
                        ? `✅ සත්‍යයි ලෙස ඡන්දය දී ඇත`
                        : `✅ මෙය සත්‍ය ආපදාවකි (+${voterWeightInfo.effectiveWeight})`
                    )
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      disabled: isCastingVote || Boolean(existingUserVote),
                      onClick: () => handleCastWeightedVote('false'),
                      className: `py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md border ${
                        existingUserVote?.vote === 'false'
                          ? 'bg-rose-600 text-white border-rose-300 ring-2 ring-rose-400 cursor-not-allowed'
                          : existingUserVote
                          ? 'bg-slate-800/60 text-slate-400 border-slate-700 cursor-not-allowed opacity-60'
                          : 'bg-rose-600/90 hover:bg-rose-600 text-white border-rose-400/50 cursor-pointer'
                      }`,
                    },
                    isCastingVote
                      ? h(Loader2, { className: 'w-4 h-4 animate-spin' })
                      : h(Flag, { className: 'w-4 h-4' }),
                    h(
                      'span',
                      null,
                      existingUserVote?.vote === 'false'
                        ? `❌ අසත්‍යයි ලෙස ඡන්දය දී ඇත`
                        : `❌ මෙය අසත්‍ය වාර්තාවකි (-${voterWeightInfo.effectiveWeight})`
                    )
                  )
                )
              )
            : h(
                'div',
                { className: 'p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-bold' },
                '🛡️ වාර්තාකරුගේ ආරක්ෂාව: ඔබ විසින් පළ කළ නිවේදනයට ඔබටම ඡන්දය දිය නොහැක. අවට කි.මී. 5 ඇතුළත සිටින සාමාජිකයින්ගේ ඡන්දයෙන් මෙය තහවුරු වේ.'
              ),

          // Official Sri Lanka Emergency Hotlines (119 / 110 / 117 / 1990) & Legal Disclaimer
          h(
            'div',
            { className: 'pt-2 border-t border-slate-800 space-y-2' },
            h(
              'div',
              { className: 'grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center' },
              [
                { num: '119', label: 'පොලිස් හදිසි ඇමතුම්' },
                { num: '110', label: 'ගිනි නිවීමේ සේවය' },
                { num: '117', label: 'ආපදා කළමනාකරණ' },
                { num: '1990', label: 'සුව සැරිය ගිලන්රථ' },
              ].map((em) =>
                h(
                  'a',
                  {
                    key: em.num,
                    href: `tel:${em.num}`,
                    className: 'p-2 rounded-xl bg-red-950/60 hover:bg-red-900/70 border border-red-500/40 text-white transition-all flex flex-col items-center justify-center',
                  },
                  h('span', { className: 'text-sm font-black text-red-300 font-mono' }, `📞 ${em.num}`),
                  h('span', { className: 'text-[10px] font-bold text-slate-200' }, em.label)
                )
              )
            ),
            h(
              'div',
              { className: 'p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-[11px] font-bold text-center leading-relaxed' },
              '⚠️ ප්‍රජාව විසින් වාර්තා කරන ලද, නිල නොවන අනතුරු ඇඟවීමකි — නිල රජයේ තහවුරු කිරීමක් නොවේ. හිතාමතා අසත්‍ය තොරතුරු පළකිරීම ශ්‍රී ලංකා නීතිය යටතේ දඬුවම් ලැබිය හැකි වරදකි.'
            ),
            h(
              'div',
              { className: 'flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1' },
              h('span', null, '🔔 නොමිලේ බහු-නාලිකා (Rs. 0): Web Push • ntfy.sh • Telegram • Brevo'),
              h(
                'a',
                {
                  href: '/feed.xml',
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'text-emerald-400 hover:underline font-bold',
                },
                '📡 RSS Feed (/feed.xml)'
              )
            )
          )
        ),

        showCommentsPanel

          ? h(

              'div',

              { className: 'p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-4 mt-1' },

              h(

                'h4',

                { className: 'text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between' },

                h(

                  'span',

                  { className: 'flex items-center gap-1.5' },

                  h(MessageSquare, { className: 'w-4 h-4 text-emerald-500' }),

                  h('span', null, `අදහස් සහ ප්‍රතිචාර (${localComments.length})`)

                )

              ),

              h(

                'div',

                { className: 'space-y-2.5 max-h-60 overflow-y-auto pr-1' },

                localComments.length === 0

                  ? h(

                      'p',

                      { className: 'text-xs text-slate-400 italic py-4 text-center' },

                      'තවම අදහස් ඇතුළත් කර නොමැත. පහතින් ඔබේ අදහස ඇතුළත් කරන්න.'

                    )

                  : localComments.map((c: any, idx: number) => {

                      const isReporterComment = c.userName?.includes('වාර්තාකරු') || c.isReporterUpdate;

                      return h(

                        'div',

                        {

                          key: c.id || `${c.userId}-${idx}`,

                          className: `p-3.5 rounded-xl text-xs space-y-1.5 border ${

                            isReporterComment

                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'

                              : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/5 text-slate-800 dark:text-slate-200'

                          }`

                        },

                        h(

                          'div',

                          { className: 'flex items-center justify-between text-[11px] border-b border-slate-100 dark:border-white/5 pb-1' },

                          h('strong', { className: 'font-bold flex items-center gap-1' }, isReporterComment ? `📢 ${c.userName}` : c.userName),

                          h('span', { className: 'text-slate-400 font-mono' }, c.createdAtDisplay || formatTimestampSi(c.createdAt))

                        ),

                        h('p', { className: 'font-medium leading-relaxed pt-1' }, c.comment || c.text)

                      );

                    })

              ),

              h(

                'form',

                { onSubmit: handleAddComment, className: 'flex gap-2 pt-2 border-t border-slate-200 dark:border-white/10 mt-2' },

                h('input', {

                  ref: commentInputRef,

                  type: 'text',

                  value: commentText,

                  onChange: (e: any) => setCommentText(e.target.value),

                  placeholder: 'ඔබේ අදහස මෙහි සටහන් කරන්න...',

                  className: 'flex-1 p-3 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500',

                  required: true

                }),

                h(

                  'button',

                  {

                    type: 'submit',

                    disabled: isSubmitting,

                    className: 'px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0'

                  },

                  h(Send, { className: 'w-4 h-4' }),

                  h('span', null, 'අදහස එක් කරන්න')

                )

              )

            )

          : null

      ),

      confirmDialog === 'resolve'

        ? h(

            'div',

            { className: 'absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 rounded-3xl animate-in fade-in duration-150 overflow-y-auto' },

            h(

              'div',

              { className: 'w-full max-w-lg p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 space-y-4 shadow-2xl' },

              h(

                'div',

                { className: 'flex items-center gap-2.5 font-black text-sm sm:text-base text-emerald-900 dark:text-emerald-300' },

                h(CheckCircle2, { className: 'w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0' }),

                h('span', null, 'දැන්වීම විසඳුන බවට දැනුම් දෙන්න ද?')

              ),

              h(

                'div',

                { className: 'space-y-1.5 pt-1' },

                h('label', { className: 'text-xs font-black text-emerald-900 dark:text-emerald-200 block' }, '💡 විසඳුණු ආකාරය / හේතුව:'),

                h(

                  'select',

                  {

                    value: selectedResolveReason,

                    onChange: (e: any) => setSelectedResolveReason(e.target.value),

                    className: 'w-full p-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-900 border border-emerald-400 text-slate-900 dark:text-slate-100'

                  },

                  h('option', { value: 'ආපදා තත්ත්වය සාර්ථකව පාලනය කර සාමාන්‍ය තත්ත්වයට පත් කරන ලදී.' }, 'ආපදා තත්ත්වය සාර්ථකව පාලනය කර සාමාන්‍ය තත්ත්වයට පත් කරන ලදී.'),

                  h('option', { value: 'මාර්ගය සහ ගමනාගමනය යථා තත්ත්වයට පත් විය.' }, 'මාර්ගය සහ ගමනාගමනය යථා තත්ත්වයට පත් විය.'),

                  h('option', { value: 'හදිසි අලුත්වැඩියාව සාර්ථකව නිම කරන ලදී.' }, 'හදිසි අලුත්වැඩියාව සාර්ථකව නිම කරන ලදී.'),

                  h('option', { value: 'ජල ගැලීම / ගංවතුර බැසගොස් අවදානම පහව ගියේය.' }, 'ජල ගැලීම / ගංවතුර බැසගොස් අවදානම පහව ගියේය.'),

                  h('option', { value: 'custom' }, 'වෙනත් හේතුවක් සටහන් කරන්න...')

                ),

                selectedResolveReason === 'custom'

                  ? h('input', {

                      type: 'text',

                      placeholder: 'විසඳුණු ආකාරය මෙහි ලියන්න...',

                      value: customResolveReason,

                      onChange: (e: any) => setCustomResolveReason(e.target.value),

                      className: 'w-full p-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-900 border border-emerald-400 text-slate-900 dark:text-slate-100 mt-1.5'

                    })

                  : null

              ),

              h(

                'div',

                { className: 'flex gap-2 pt-2' },

                h(

                  'button',

                  {

                    type: 'button',

                    onClick: () => setConfirmDialog(null),

                    disabled: isSubmitting,

                    className: 'flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer'

                  },

                  'අවලංගු කරන්න'

                ),

                h(

                  'button',

                  {

                    type: 'button',

                    onClick: handleConfirmResolveAlert,

                    disabled: isSubmitting,

                    className: 'flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95'

                  },

                  isSubmitting ? h(Loader2, { className: 'w-4 h-4 animate-spin' }) : h(CheckCircle2, { className: 'w-4 h-4' }),

                  h('span', null, 'ඔව්, විසඳුණු බව දැනුම්දෙන්න')

                )

              )

            )

          )

        : null,

      confirmDialog === 'cancel_delete'

        ? h(

            'div',

            { className: 'absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 rounded-3xl animate-in fade-in duration-150 overflow-y-auto' },

            h(

              'div',

              { className: 'w-full max-w-lg p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950 border-2 border-rose-500 text-rose-950 dark:text-rose-100 space-y-4 shadow-2xl' },

              h(

                'div',

                { className: 'flex items-center gap-2.5 font-black text-sm sm:text-base text-rose-900 dark:text-rose-300' },

                h(Trash2, { className: 'w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0' }),

                h('span', null, 'මෙම හදිසි/ආපදා දැන්වීම ඉවත් කිරීමට අවශ්‍යද?')

              ),

              h(

                'p',

                { className: 'text-xs text-slate-600 dark:text-slate-300 font-medium' },

                'දැන්වීම ඉවත් කළ පසු එය ඉවත් කරන ලදී ලෙස ඉවත් කළ දිනය සහ වේලාව දැන්වීමේ ප්‍රදර්ශනය කෙරේ.'

              ),

              h(

                'div',

                { className: 'space-y-1.5 pt-1' },

                h('label', { className: 'text-xs font-black text-rose-900 dark:text-rose-200 block' }, '💡 ඉවත් කළ හේතුව:'),

                h(

                  'select',

                  {

                    value: selectedCancelReason,

                    onChange: (e: any) => setSelectedCancelReason(e.target.value),

                    className: 'w-full p-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-900 border border-rose-400 text-slate-900 dark:text-slate-100'

                  },

                  h('option', { value: 'ආපදා අවදානම පහව ගොස් ඇති බැවින් නිවේදනය ඉවත් කරන ලදී.' }, 'ආපදා අවදානම පහව ගොස් ඇති බැවින් නිවේදනය ඉවත් කරන ලදී.'),

                  h('option', { value: 'අත්වැරදීමකින් පළ වූ දැන්වීමක් බැවින් ඉවත් කරන ලදී.' }, 'අත්වැරදීමකින් පළ වූ දැන්වීමක් බැවින් ඉවත් කරන ලදී.'),

                  h('option', { value: 'හදිසි සහන සේවා මඟින් තත්ත්වය පාලනය කරන ලදී.' }, 'හදිසි සහන සේවා මඟින් තත්ත්වය පාලනය කරන ලදී.'),

                  h('option', { value: 'custom' }, 'වෙනත් හේතුවක් සටහන් කරන්න...')

                ),

                selectedCancelReason === 'custom'

                  ? h('input', {

                      type: 'text',

                      placeholder: 'ඉවත් කළ හේතුව මෙහි ලියන්න...',

                      value: customCancelReason,

                      onChange: (e: any) => setCustomCancelReason(e.target.value),

                      className: 'w-full p-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-900 border border-rose-400 text-slate-900 dark:text-slate-100 mt-1.5'

                    })

                  : null

              ),

              h(

                'div',

                { className: 'flex gap-2 pt-2' },

                h(

                  'button',

                  {

                    type: 'button',

                    onClick: () => setConfirmDialog(null),

                    disabled: isSubmitting,

                    className: 'flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer'

                  },

                  'අවලංගු කරන්න'

                ),

                h(

                  'button',

                  {

                    type: 'button',

                    onClick: handleConfirmCancelAlert,

                    disabled: isSubmitting,

                    className: 'flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95'

                  },

                  isSubmitting ? h(Loader2, { className: 'w-4 h-4 animate-spin' }) : h(Trash2, { className: 'w-4 h-4' }),

                  h('span', null, 'ඔව්, දැන්වීම ඉවත් කරන්න')

                )
              ),
              isAdmin
                ? h(
                    'div',
                    { className: 'pt-2 border-t border-rose-200 dark:border-rose-900/50' },
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: handleAdminPermanentDelete,
                        disabled: isSubmitting,
                        className: 'w-full py-2.5 px-4 rounded-xl bg-red-900 hover:bg-black text-yellow-300 font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-yellow-400/40'
                      },
                      isSubmitting ? h(Loader2, { className: 'w-4 h-4 animate-spin' }) : h(Trash2, { className: 'w-4 h-4' }),
                      h('span', null, '🔥 Admin: සියලු දෙනාගෙන්ම සදහටම (Permanently) මකා දමන්න')
                    )
                  )
                : null
            )
          )
        : null,
      confirmDialog === 'admin_perm_delete'
        ? h(
            'div',
            { className: 'absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 rounded-3xl animate-in fade-in duration-150 overflow-y-auto' },
            h(
              'div',
              { className: 'w-full max-w-lg p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950 border-2 border-red-600 text-slate-900 dark:text-white space-y-4 shadow-2xl' },
              h(
                'div',
                { className: 'flex items-center gap-2.5 font-black text-sm sm:text-base text-red-600 dark:text-red-400' },
                h(Trash2, { className: 'w-6 h-6 shrink-0' }),
                h('span', null, '🔥 මෙම දැන්වීම සදහටම (Permanently) මකා දමන්න ද?')
              ),
              h(
                'p',
                { className: 'text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed' },
                'මෙමගින් මෙම දැන්වීම Cloud දත්ත ගබඩාවෙන් සහ පහළ දැන්වීම් පුවරුවෙන් සියලුම පරිශීලකයන්ට නොපෙනෙන ලෙස සදහටම ඉවත් කරනු ලැබේ.'
              ),
              h(
                'div',
                { className: 'flex gap-2 pt-2' },
                h(
                  'button',
                  {
                    type: 'button',
                    onClick: () => setConfirmDialog(null),
                    disabled: isSubmitting,
                    className: 'flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer'
                  },
                  'අවලංගු කරන්න'
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    onClick: handleAdminPermanentDelete,
                    disabled: isSubmitting,
                    className: 'flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-800 hover:from-red-700 hover:to-black text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95'
                  },
                  isSubmitting ? h(Loader2, { className: 'w-4 h-4 animate-spin' }) : h(Trash2, { className: 'w-4 h-4' }),
                  h('span', null, '🔥 ඔව්, සදහටම මකා දමන්න')
                )
              )
            )
          )
        : null,
      showFakeReportModal

        ? h(

            'div',

            { className: 'absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 rounded-3xl animate-in fade-in duration-150 overflow-y-auto' },

            h(

              'div',

              { className: 'w-full max-w-lg p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950 border-2 border-rose-500 text-rose-950 dark:text-rose-100 space-y-4 shadow-2xl' },

              h(

                'div',

                { className: 'flex items-center justify-between' },

                h(

                  'h4',

                  { className: 'text-sm font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-2' },

                  h(ShieldAlert, { className: 'w-5 h-5 text-rose-600' }),

                  h('span', null, 'දැන්වීම අසත්‍යයක් ලෙස වාර්තා කරන්න')

                ),

                h(

                  'button',

                  {

                    type: 'button',

                    onClick: () => setShowFakeReportModal(false),

                    className: 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1'

                  },

                  h(X, { className: 'w-5 h-5' })

                )

              ),

              fakeReportedSuccess

                ? h(

                    'div',

                    { className: 'p-4 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center' },

                    `✅ ඔබගේ වාර්තාව සටහන් විය! (${localFakeReports.length}/4)`

                  )

                : h(

                    'form',

                    { onSubmit: handleReportFake, className: 'space-y-3' },

                    h(

                      'div',

                      { className: 'space-y-1.5' },

                      h('label', { className: 'text-xs font-bold text-slate-700 dark:text-slate-300' }, 'හේතුව තෝරන්න:'),

                      h(

                        'select',

                        {

                          value: fakeReason,

                          onChange: (e: any) => setFakeReason(e.target.value),

                          className: 'w-full p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-bold'

                        },

                        h('option', { value: 'අසත්‍ය දැන්වීමක් / අසත්‍ය පුවතක් (Fake news)' }, 'අසත්‍ය දැන්වීමක් / අසත්‍ය පුවතක් (Fake news)'),

                        h('option', { value: 'පැරණි සිදුවීමක් (Outdated incident)' }, 'පැරණි සිදුවීමක් (Outdated incident)'),

                        h('option', { value: 'නොමඟ යවන සුළුයි (Misleading / Exaggerated)' }, 'නොමඟ යවන සුළුයි (Misleading / Exaggerated)'),

                        h('option', { value: 'වැරදි ස්ථානයක් (Wrong location)' }, 'වැරදි ස්ථානයක් (Wrong location)')

                      )

                    ),

                    h(

                      'div',

                      { className: 'space-y-1.5' },

                      h('label', { className: 'text-xs font-bold text-slate-700 dark:text-slate-300' }, 'වැඩිදුර විස්තර (අවශ්‍ය නම්):'),

                      h('input', {

                        type: 'text',

                        value: fakeNotes,

                        onChange: (e: any) => setFakeNotes(e.target.value),

                        placeholder: 'මෙය අසත්‍යයක් බව තහවුරු කරන කරුණු...',

                        className: 'w-full p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-medium'

                      })

                    ),

                    h(

                      'div',

                      { className: 'flex gap-2 pt-2' },

                      h(

                        'button',

                        {

                          type: 'button',

                          onClick: () => setShowFakeReportModal(false),

                          disabled: isReportingFake,

                          className: 'flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer'

                        },

                        'අවලංගු කරන්න'

                      ),

                      h(

                        'button',

                        {

                          type: 'submit',

                          disabled: isReportingFake,

                          className: 'flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5'

                        },

                        h(Flag, { className: 'w-4 h-4' }),

                        h('span', null, 'අසත්‍යයක් ලෙස තහවුරු කරන්න')

                      )

                    )

                  )

            )

          )

        : null

    )

  );

};

