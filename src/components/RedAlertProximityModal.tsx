import React, { useState, useEffect } from 'react';
import { 
  X, 
  Volume2, 
  VolumeX, 
  MapPin, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  MessageSquare, 
  Flag, 
  Send, 
  CheckCircle2, 
  Share2, 
  Navigation,
  Phone,
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';
import { RedAlertItem, RedAlertComment, RedAlertFakeReport, User } from '../types';
import { getDisasterConfig } from '../data/redAlertData';
import { 
  startEmergencySiren, 
  stopEmergencySiren, 
  unlockAudio, 
  isEmergencySirenPlaying,
  setCustomSirenAudio,
  getSirenVolume,
  setSirenVolume,
  isDeviceSirenMuted,
  setDeviceSirenMuted,
  subscribeToLocalSirenChanges
} from '../utils/sirenAudio';
import { addCommentToRedAlert, reportRedAlertAsFake } from '../lib/firebase';

interface RedAlertProximityModalProps {
  alert: RedAlertItem | null;
  distanceKm: number;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
}

export const RedAlertProximityModal: React.FC<RedAlertProximityModalProps> = ({
  alert,
  distanceKm,
  isOpen,
  onClose,
  currentUser,
}) => {
  const [isPlayingSiren, setIsPlayingSiren] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [deviceMuted, setLocalDeviceMuted] = useState<boolean>(() => isDeviceSirenMuted());
  const [currentVolume, setCurrentVolume] = useState<number>(() => getSirenVolume());
  const [showVolumeControl, setShowVolumeControl] = useState(false);

  useEffect(() => {
    const unsub = subscribeToLocalSirenChanges(() => {
      setLocalDeviceMuted(isDeviceSirenMuted());
      setCurrentVolume(getSirenVolume());
    });
    return () => unsub();
  }, []);
  const [showCommentSection, setShowCommentSection] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commenterName, setCommenterName] = useState(currentUser?.name || '');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Fake Report Modal State
  const [showFakeReportModal, setShowFakeReportModal] = useState(false);
  const [fakeReason, setFakeReason] = useState('බොරුවක් / අසත්‍ය පුවතක් (Fake news)');
  const [fakeNotes, setFakeNotes] = useState('');
  const [isReportingFake, setIsReportingFake] = useState(false);
  const [fakeReportedSuccess, setFakeReportedSuccess] = useState(false);

  // Local comments state for immediate optimistic UI update
  const [localComments, setLocalComments] = useState<RedAlertComment[]>([]);

  useEffect(() => {
    if (alert) {
      setLocalComments(alert.comments || []);
    }
  }, [alert]);

  // Attempt automatic siren start, and listen for user interaction if browser blocked autoplay
  useEffect(() => {
    if (isOpen && alert) {
      unlockAudio();
      startEmergencySiren();
      setIsPlayingSiren(true);
    }

    return () => {
      stopEmergencySiren();
      setIsPlayingSiren(false);
    };
  }, [isOpen, alert]);

  // 37-second auto-silent timer for device siren
  useEffect(() => {
    let timer: any = null;
    if (isOpen && isPlayingSiren) {
      timer = setTimeout(() => {
        stopEmergencySiren();
        setIsPlayingSiren(false);
      }, 37000); // 37 seconds auto-silent
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, isPlayingSiren]);

  // Handle explicit play/stop toggle with gesture unlock
  const handleToggleSiren = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setUserInteracted(true);
    unlockAudio();

    if (isPlayingSiren) {
      stopEmergencySiren();
      setIsPlayingSiren(false);
    } else {
      startEmergencySiren();
      setIsPlayingSiren(true);
    }
  };

  const handleModalClick = () => {
    // If the browser blocked autoplay, tapping anywhere on the modal will unlock audio & play
    if (!isPlayingSiren && !userInteracted) {
      unlockAudio();
      startEmergencySiren();
      setIsPlayingSiren(true);
      setUserInteracted(true);
    }
  };

  const handleClose = () => {
    stopEmergencySiren();
    setIsPlayingSiren(false);
    onClose();
  };

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
      console.error('Error adding comment to Red Alert:', err);
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

  if (!isOpen || !alert) return null;

  const config = getDisasterConfig(alert.disasterType);
  const distanceDisplay = distanceKm < 1 
    ? `මීටර් ${Math.round(distanceKm * 1000)}` 
    : `කි.මී. ${distanceKm.toFixed(2)}`;

  return (
    <div 
      onClick={handleModalClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0c1812] border-4 border-red-600 rounded-3xl shadow-[0_0_80px_rgba(239,68,68,0.7)] overflow-hidden my-auto animate-pulse-glow">
        
        {/* Animated Emergency Beacon Banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-4 text-white flex items-center justify-between shadow-lg relative overflow-hidden">
          {/* Beacon light sweep effect */}
          <div className="absolute inset-0 bg-white/15 translate-x-[-100%] animate-[shimmer_2s_infinite]" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="relative flex items-center justify-center">
              <span className="w-10 h-10 rounded-full bg-white/40 animate-ping absolute" />
              <div className="w-10 h-10 rounded-full bg-white text-red-600 font-black flex items-center justify-center text-xl shadow-lg relative z-10">
                🚨
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-black/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-yellow-300 border border-yellow-300/40">
                  ⚠️ හදිසි අනතුරු ඇඟවීම (රතු එළිය)
                </span>
                <span className="font-mono text-xs text-white/90">
                  {alert.alertCode}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-white drop-shadow-sm pt-0.5">
                ඔබ සිටින්නේ ආපදා ස්ථානයේ සිට {distanceDisplay} ක් ඇතුළතයි!
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {/* Quick Silent on this device Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const nextMute = !deviceMuted;
                setLocalDeviceMuted(nextMute);
                setDeviceSirenMuted(nextMute);
                if (nextMute && isPlayingSiren) {
                  stopEmergencySiren();
                  setIsPlayingSiren(false);
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1 text-[11px] font-black transition-all cursor-pointer shadow-md ${
                deviceMuted
                  ? 'bg-rose-950/80 text-rose-200 border-rose-400 hover:bg-rose-900'
                  : 'bg-black/40 hover:bg-black/60 text-white border-white/30'
              }`}
              title={deviceMuted ? 'මගේ දුරකථනයේ Silent ඉවත් කරන්න' : 'මගේ දුරකථනයේ පමණක් Silent කරන්න'}
            >
              {deviceMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span>🔕 Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>🔊 {Math.round(currentVolume * 100)}%</span>
                </>
              )}
            </button>

            {/* Audio Play/Stop Button with immediate click unlock */}
            <button
              type="button"
              onClick={handleToggleSiren}
              className={`px-3 py-2 rounded-xl border-2 flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-md ${
                isPlayingSiren
                  ? 'bg-amber-300 hover:bg-amber-400 text-slate-950 border-amber-500 animate-pulse'
                  : 'bg-black/40 hover:bg-black/60 text-white border-white/30'
              }`}
              title={isPlayingSiren ? 'Siren හඬ නවත්වන්න' : 'Siren හඬ ක්‍රියාත්මක කරන්න'}
            >
              {isPlayingSiren ? (
                <>
                  <Volume2 className="w-4 h-4 text-red-600 animate-bounce" />
                  <span className="hidden sm:inline">Siren නවත්වන්න</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-yellow-300" />
                  <span className="hidden sm:inline">Siren වාදනය</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Device Volume & Mute Bar in Proximity Modal */}
        <div className="bg-slate-900 border-b border-slate-800 p-2.5 px-4 flex items-center justify-between gap-3 text-xs text-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextMute = !deviceMuted;
                setLocalDeviceMuted(nextMute);
                setDeviceSirenMuted(nextMute);
                if (nextMute && isPlayingSiren) {
                  stopEmergencySiren();
                  setIsPlayingSiren(false);
                }
              }}
              className={`px-2.5 py-1 rounded-lg font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                deviceMuted
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {deviceMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{deviceMuted ? '🔕 මගේ දුරකථනයේ Silent කර ඇත' : '🔊 මගේ දුරකථනයේ Silent කරන්න'}</span>
            </button>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              (මෙය ඔබගේ දුරකථනයට පමණක් බලපායි)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Volume:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={currentVolume}
              disabled={deviceMuted}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentVolume(val);
                setSirenVolume(val);
              }}
              className="w-20 sm:w-28 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-40"
            />
            <span className="font-mono text-xs font-black text-red-400 w-9 text-right">
              {Math.round(currentVolume * 100)}%
            </span>
          </div>
        </div>

        {/* Autoplay Unlock Interactive Bar if Siren is not playing yet */}
        {!isPlayingSiren && !deviceMuted && (
          <div 
            onClick={handleToggleSiren}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs py-2 px-4 flex items-center justify-between cursor-pointer border-b-2 border-amber-500 shadow-inner transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base animate-bounce">🔊</span>
              <span>Siren ශබ්දය ඇසීමට මෙතන ක්ලික් කරන්න (Click to sound alarm)</span>
            </div>
            <span className="bg-slate-950 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Play Siren
            </span>
          </div>
        )}

        {/* Modal Main Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Custom User Audio Uploader Box */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎵</span>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">ඔබේම Siren ශබ්ද ගොනුවක් (MP3/WAV) ගබඩා කර භාවිතා කරන්න</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">ඔබ උඩුගත කරන ශබ්දය බ්‍රවුසරයේ සුරැකී ඉදිරියට නාදය ලෙස වාදනය වේ.</p>
              </div>
            </div>
            <label className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl cursor-pointer transition-all shadow-sm text-xs flex items-center gap-1.5 whitespace-nowrap">
              <span>📁 Audio File තෝරන්න</span>
              <input 
                type="file" 
                accept="audio/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (uploadEvent) => {
                      const dataUri = uploadEvent.target?.result as string;
                      if (dataUri) {
                        setCustomSirenAudio(dataUri);
                        alert('ඔබේ Siren ශබ්ද ගොනුව සාර්ථකව ගබඩා කරන ලදී! දැන් Siren නාදය වාදනය වේ.');
                        startEmergencySiren();
                        setIsPlayingSiren(true);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>

          {/* Proximity Warning Alert Callout */}
          <div className="p-3.5 rounded-2xl bg-red-500/15 border-2 border-red-500/40 flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div className="space-y-0.5">
              <h3 className="text-xs sm:text-sm font-black text-red-700 dark:text-red-400">
                අවධානය යොමු කරන්න: ඔබ මෙම ආපදාව සිදුවූ ස්ථානයේ සිට කි.මී. 2 සීමාව තුළ සිටී!
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                ආරක්ෂිත පියවර අනුගමනය කරන්න. ඔබ අවට සිටින පිරිස් දැනුවත් කරන්න. හදිසි ගලවාගැනීම් අවශ්‍ය නම් වහාම 119, 110 හෝ 117 ආපදා අංක අමතන්න.
              </p>
            </div>
          </div>

          {/* Disaster Type & Details Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">{config.icon}</span>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">ආපදා වර්ගය</span>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {alert.disasterTitleSi}
                  </h4>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">ඔබට ඇති දුර</span>
                <div className="text-base font-black text-red-600 dark:text-red-400">
                  {distanceDisplay}
                </div>
              </div>
            </div>

            {/* Location & Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-500 dark:text-slate-400">ස්ථානය:</span>
                  <p className="font-black text-slate-800 dark:text-slate-200">{alert.locationName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">📍 {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-500 dark:text-slate-400">දිනය සහ වේලාව:</span>
                  <p className="font-black text-slate-800 dark:text-slate-200">{alert.incidentDate} - {alert.incidentTime}</p>
                </div>
              </div>
            </div>

            {/* Description if available */}
            {alert.description && (
              <div className="p-3 rounded-xl bg-white dark:bg-black/30 border border-slate-200/80 dark:border-white/10 text-xs">
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

          {/* Action Bar: Comments & Fake Report */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowCommentSection(!showCommentSection)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>සිදුවීම පිළිබඳ යාවත්කාලීන තොරතුරු ({localComments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFakeReportModal(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Flag className="w-4 h-4 text-rose-600" />
              <span>අසත්‍යයක් නම් Admin ට වාර්තා කරන්න</span>
            </button>
          </div>

          {/* Comments Feed Section */}
          {showCommentSection && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3 animate-fadeIn">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                <span>ප්‍රදේශවාසීන්ගේ යාවත්කාලීන කිරීම් (Live Updates)</span>
              </h4>

              {/* Comments List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {localComments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    තවම අදහස් පළවී නොමැත. සිදුවීම පිළිබඳ නවතම තොරතුරක් ඇත්නම් සටහන් කරන්න.
                  </p>
                ) : (
                  localComments.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200 font-bold">{c.userName}</strong>
                        <span>{c.createdAtDisplay}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">{c.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="වත්මන් තත්ත්වය ගැන සටහන් කරන්න (උදා: ගිනි නිවන රථ පැමිණියා)..."
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
          )}

          {/* Fake Report Sub-Modal */}
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

          {/* Dismiss & Mute Bottom Action */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-black text-xs transition-all cursor-pointer"
            >
              තේරුම් ගතිමි (Dismiss)
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
