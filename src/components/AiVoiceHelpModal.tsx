import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Send, 
  Trash2, 
  MapPin, 
  AlertTriangle, 
  Zap, 
  HeartHandshake, 
  X, 
  Loader2, 
  CheckCircle2, 
  Coins,
  Users,
  Plus,
  Minus
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User, RedAlertItem } from '../types';
import { uploadMediaToTelegram } from '../utils/telegramStorage';
import { resolveExactLocation } from '../utils/geoUtils';

export type AllowedVoiceCategory = 'quick_services' | 'general_help' | 'red_alert';

interface AiVoiceHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  currentLocation: LocationOption;
  lang?: Language;
  onSubmitHelpPost?: (post: any) => Promise<any> | void;
  onSubmitPost?: (post: any) => Promise<any> | void; // 👈 Support both prop names
  onSubmitRedAlert?: (alert: RedAlertItem) => Promise<any> | void;
}

export const AiVoiceHelpModal: React.FC<AiVoiceHelpModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLocation,
  lang = 'si',
  onSubmitHelpPost,
  onSubmitPost,
  onSubmitRedAlert,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  
  // Nearest City only (නගරය පමණි - නිශ්චිත ස්ථානය සඟවයි)
  const [cityName, setCityName] = useState('');

  // Mandatory Category Selection (3 Categories Only)
  const [selectedCategory, setSelectedCategory] = useState<AllowedVoiceCategory | null>(null);

  // Helpers Needed Count (සහායකයන් අවශ්‍ය ගණන තීරණය කිරීම)
  const [helpersNeeded, setHelpersNeeded] = useState<number>(1);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      resolveNearestCity();
      setAudioBlob(null);
      setAudioUrl(null);
      setSelectedCategory(null);
      setHelpersNeeded(1);
      setSubmissionSuccess(null);
      setErrorMsg(null);
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  }, [isOpen]);

  const resolveNearestCity = async () => {
    const defaultCity = (currentLocation?.nameSi || 'කොළඹ').split('(')[0].trim();
    setCityName(defaultCity);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const loc = await resolveExactLocation(pos.coords.latitude, pos.coords.longitude);
            if (loc && (loc.townSi || loc.districtSi)) {
              const cleanCity = (loc.townSi || loc.districtSi || defaultCity).split('(')[0].trim();
              setCityName(cleanCity || defaultCity);
            }
          } catch {
            setCityName(defaultCity);
          }
        },
        () => {
          setCityName(defaultCity);
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  };

  const handleStartRecording = async () => {
    setErrorMsg(null);
    setSubmissionSuccess(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('මයික්‍රෆෝනය භාවිතය ඔබගේ බ්‍රවුසරයේ නොමැත.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 120) {
            handleStopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone error:', err);
      setErrorMsg('මයික්‍රෆෝනය සක්‍රිය කිරීමට අවසර නැත. කරුණාකර අවසර ලබා දෙන්න.');
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleTogglePlayPreview = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play().then(() => setIsPlayingPreview(true)).catch(console.warn);
    }
  };

  const handleSendVoiceRequest = async () => {
    if (!audioBlob && !isRecording && audioChunksRef.current.length === 0) {
      setErrorMsg('කරුණාකර පළමුව හඬ පටිගත කරන්න.');
      return;
    }

    if (!selectedCategory) {
      setErrorMsg('කරුණාකර දැන්වීම සඳහා සේවා කාණ්ඩයක් තෝරන්න (ඉක්මන් සේවා, සාමාන්‍ය සේවා, හෝ ආපදා රතු එළිය).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSubmissionSuccess(null);

    try {
      let currentBlob = audioBlob;
      if (isRecording || (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording')) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            mediaRecorderRef.current.requestData();
          } catch {}
        }
        handleStopRecording();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (!currentBlob && audioChunksRef.current.length > 0) {
        currentBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(currentBlob);
      }

      // Convert audio to Base64
      let base64AudioUrl = audioUrl || '';
      if (currentBlob) {
        try {
          const readerPromise = new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(currentBlob!);
          });
          base64AudioUrl = await readerPromise;
        } catch (b64Err) {
          console.warn('Base64 error:', b64Err);
        }
      }

      let finalAudioUrl = base64AudioUrl || audioUrl || '';
      let telegramRec: any = undefined;

      if (currentBlob) {
        try {
          const uploadRes = await uploadMediaToTelegram({
            file: currentBlob,
            fileName: `voice_help_${Date.now()}.webm`,
            mimeType: 'audio/webm',
            mediaType: 'voice',
            senderName: currentUser?.name || 'User',
            sourceContext: 'හඬ සහය (Voice Help)',
            caption: `🎙️ Voice Note (${Math.max(1, recordingSeconds)}s) - ${cityName}`,
          });
          if (uploadRes?.url) {
            finalAudioUrl = uploadRes.url;
            telegramRec = uploadRes.record;
          }
        } catch (upErr) {
          console.warn('Media upload fallback:', upErr);
        }
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('si-LK');
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const categoryConfig: Record<AllowedVoiceCategory, { catKey: string; tag: string; label: string }> = {
        quick_services: { catKey: 'quick_services', tag: 'ඉක්මන් සේවා', label: 'ඉක්මන් සේවා' },
        general_help: { catKey: 'normal_services', tag: 'සාමාන්‍ය සේවා', label: 'සාමාන්‍ය සේවා' },
        red_alert: { catKey: 'red_alert', tag: 'ආපදා / රතු එළිය', label: 'ආපදා / රතු එළිය' },
      };

      const config = categoryConfig[selectedCategory];

      // Submit as Voice Post (Supports both onSubmitHelpPost and onSubmitPost)
      const submitFn = onSubmitHelpPost || onSubmitPost;
      if (submitFn) {
        const postData = {
          title: `🎙️ හඬ සහය (${config.label})`,
          whatHappened: 'හඬ පටය ශ්‍රවණය කර සහය වන්න.',
          whatIsNeeded: 'හඬ පණිවිඩය අසා අවශ්‍ය සහය ලබා දෙන්න.',
          conditions: 'හඬ පණිවිඩය අසා තහවුරු කරගන්න.',
          specialNotice: `🎙️ හඬ සහය දැන්වීමකි. (${dateStr} ${timeStr})`,
          transport: 'සාකච්ඡා කර තීරණය කෙරේ',
          payment: selectedCategory === 'quick_services' ? 'ගාස්තු ගෙවනු ලැබේ' : 'නොමිලේ / ස්වේච්ඡා',
          helpersNeeded: helpersNeeded,
          helpersCount: helpersNeeded,
          helpersAccepted: 0,
          feeAgreed: true,
          locationName: cityName || 'නගරය',
          distanceKm: 0,
          latitude: currentLocation?.lat || 6.9271,
          longitude: currentLocation?.lng || 79.8612,
          lat: currentLocation?.lat || 6.9271,
          lng: currentLocation?.lng || 79.8612,
          category: config.catKey,
          postType: selectedCategory === 'quick_services' ? 'quick_service' : 'help_post',
          roleType: 'need_help',
          tagName: config.tag,
          tagCategory: config.label,
          userName: currentUser?.name || 'පරිශීලක',
          userPhone: currentUser?.phone || currentUser?.whatsappNumber || '0771234567',
          userEmail: currentUser?.email || '',
          userId: currentUser?.id || currentUser?.userId,
          status: 'active' as const,
          mediaType: 'voice' as const,
          audioUrl: finalAudioUrl,
          audioDurationSec: Math.max(1, recordingSeconds),
          voiceSentDate: dateStr,
          voiceSentTime: timeStr,
          voiceSentLocation: cityName,
          isVoicePost: true,
          telegramStorage: telegramRec,
          reportsCount: 0,
          reports: [],
          isHidden: false,
        };

        const res: any = await submitFn(postData);
        if (res && res.error === 'insufficient_credits') {
          setIsSubmitting(false);
          return;
        }

        // Also if Red Alert category, trigger alert broadcaster if provided
        if (selectedCategory === 'red_alert' && onSubmitRedAlert) {
          onSubmitRedAlert({
            id: `red_${Date.now()}`,
            alertCode: `#RED-${Math.floor(1000 + Math.random() * 9000)}`,
            disasterType: 'other',
            disasterTitleSi: '🚨 හදිසි ආපදා හඬ පණිවිඩය (Voice SOS)',
            disasterTitleEn: 'Emergency Voice SOS Alert',
            disasterTitleTa: 'அவசர குரல் SOS எச்சரிக்கை',
            description: `🎙️ හඬ සහය ආපදා පණිවිඩයකි - ළඟම නගරය: ${cityName}`,
            latitude: currentLocation?.lat || 6.9271,
            longitude: currentLocation?.lng || 79.8612,
            locationName: cityName,
            incidentDate: dateStr,
            incidentTime: timeStr,
            createdAt: now.toISOString(),
            createdAtMs: Date.now(),
            reportedByUserId: currentUser?.id,
            reportedByName: currentUser?.name || 'පරිශීලක',
            reportedByPhone: currentUser?.phone || '',
            status: 'active',
            severity: 'high',
            comments: [],
            fakeReports: [],
            audioUrl: finalAudioUrl,
            audioDurationSec: Math.max(1, recordingSeconds),
            voiceSentLocation: cityName,
            isVoiceAlert: true,
          });
        }

        setSubmissionSuccess('✅ ඔබගේ හඬ සහය දැන්වීම සාර්ථකව පළකරන ලදී!');
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Submit voice error:', err);
      setIsSubmitting(false);
      setErrorMsg('දැන්වීම පළකිරීමේදී දෝෂයක් මතු විය. නැවත උත්සාහ කරන්න.');
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#06180f] border-2 border-emerald-500/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header: හඬ සහය */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <Mic className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide">
                හඬ සහය (Voice Help)
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                හඬ පටිගත කර අදාළ කාණ්ඩය සහ සහායකයන් ගණන තෝරන්න
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          
          {/* Nearest City Display (නගරය පමණි) */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/80 dark:bg-[#082216] border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-950 dark:text-emerald-200">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>ළඟම නගරය:</span>
            </span>
            <span className="font-extrabold text-slate-800 dark:text-slate-100 bg-white dark:bg-[#05130b] px-3 py-1 rounded-xl border border-emerald-100 dark:border-emerald-900">
              {cityName || 'කොළඹ'}
            </span>
          </div>

          {/* Voice Recorder Box */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-[#081e13] border-2 border-emerald-300 dark:border-emerald-800 text-center space-y-3.5 shadow-inner">
            
            <div className="relative inline-flex items-center justify-center my-1">
              {isRecording && (
                <>
                  <span className="w-24 h-24 rounded-full bg-rose-500/20 animate-ping absolute" />
                  <span className="w-20 h-20 rounded-full bg-rose-500/30 animate-pulse absolute" />
                </>
              )}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                isRecording 
                  ? 'bg-rose-600 text-white scale-105' 
                  : audioUrl 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white'
              }`}>
                <Mic className={`w-8 h-8 ${isRecording ? 'animate-bounce' : ''}`} />
              </div>
            </div>

            <div>
              <p className="text-2xl font-mono font-black text-slate-800 dark:text-zinc-100">
                {formatTimer(recordingSeconds)} <span className="text-xs font-normal text-slate-500">/ 02:00</span>
              </p>
              <p className="text-xs font-bold mt-1 text-slate-600 dark:text-emerald-300">
                {isRecording ? (
                  <span className="text-rose-600 animate-pulse">🎙️ පටිගත වෙමින් පවතී... අවශ්‍යතාවය පවසන්න</span>
                ) : audioUrl ? (
                  <span className="text-emerald-600">✅ හඬ පටිගත විය! පහතින් කාණ්ඩය හා සහායකයින් තෝරන්න</span>
                ) : (
                  <span>පහත බොත්තම ඔබා හඬ පටිගත කරන්න</span>
                )}
              </p>
            </div>

            {/* Voice Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                  <span>🎙️ Voice (කතා කරන්න)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer animate-pulse active:scale-95"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>⏹️ නවතන්න (Stop)</span>
                </button>
              )}

              {audioUrl && (
                <>
                  <audio
                    ref={audioPreviewRef}
                    src={audioUrl}
                    onEnded={() => setIsPlayingPreview(false)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleTogglePlayPreview}
                    disabled={isRecording || isSubmitting}
                    className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
                  >
                    {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    <span>{isPlayingPreview ? 'Pause' : 'Play (අසන්න)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioBlob(null);
                      setAudioUrl(null);
                      setSelectedCategory(null);
                      setHelpersNeeded(1);
                    }}
                    className="p-2.5 rounded-2xl bg-slate-200 dark:bg-emerald-950 text-rose-500 hover:bg-slate-300 cursor-pointer active:scale-95"
                    title="මකන්න"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 3 Categories Selection */}
          <div className="space-y-2 pt-1">
            <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
              <span>දැන්වීම් කාණ්ඩය තෝරන්න (අනිවාර්යයි):</span>
              <span className="text-rose-500">*</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Category 1: ඉක්මන් සේවා */}
              <button
                type="button"
                onClick={() => setSelectedCategory('quick_services')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedCategory === 'quick_services'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 shadow-md ring-2 ring-amber-400/30'
                    : 'border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#071b10]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 flex items-center gap-0.5">
                    <Coins className="w-3 h-3" /> රු. 25
                  </span>
                </div>
                <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                  ඉක්මන් සේවා
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  හදිසි / ක්ෂණික සහය
                </p>
              </button>

              {/* Category 2: සාමාන්‍ය සේවා */}
              <button
                type="button"
                onClick={() => setSelectedCategory('general_help')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedCategory === 'general_help'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 shadow-md ring-2 ring-emerald-400/30'
                    : 'border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#071b10]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <HeartHandshake className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center gap-0.5">
                    <Coins className="w-3 h-3" /> රු. 25
                  </span>
                </div>
                <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                  සාමාන්‍ය සේවා
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  පොදු ප්‍රජා උපකාර
                </p>
              </button>

              {/* Category 3: ආපදා / රතු එළිය */}
              <button
                type="button"
                onClick={() => setSelectedCategory('red_alert')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedCategory === 'red_alert'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 shadow-md ring-2 ring-rose-400/30'
                    : 'border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#071b10]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                    නොමිලේ
                  </span>
                </div>
                <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                  ආපදා / රතු එළිය
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  හදිසි ආපදා SOS
                </p>
              </button>

            </div>
          </div>

          {/* 👥 සහායකයින් අවශ්‍ය ගණන තේරීම (Helpers Needed Selector) */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-[#071b10] border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  අවශ්‍ය සහායකයින් ගණන (Helpers Needed):
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  මෙම කාර්යය සඳහා අවශ්‍ය පුද්ගලයින් සංඛ්‍යාව
                </p>
              </div>
            </div>

            {/* Counter [-] [Count] [+] */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHelpersNeeded(prev => Math.max(1, prev - 1))}
                className="w-8 h-8 rounded-xl bg-white dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer shadow-xs active:scale-95"
                title="අඩු කරන්න"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-mono font-black text-base text-emerald-700 dark:text-emerald-300 w-7 text-center">
                {helpersNeeded}
              </span>
              <button
                type="button"
                onClick={() => setHelpersNeeded(prev => Math.min(20, prev + 1))}
                className="w-8 h-8 rounded-xl bg-white dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer shadow-xs active:scale-95"
                title="වැඩි කරන්න"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Send Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSendVoiceRequest}
              disabled={(!audioBlob && audioChunksRef.current.length === 0) || !selectedCategory || isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>දැන්වීම පළවෙමින්...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>
                    {!selectedCategory 
                      ? 'පළමුව සේවා කාණ්ඩය තෝරන්න' 
                      : `දැන්වීම පළකරන්න (${selectedCategory === 'red_alert' ? 'නොමිලේ' : 'ගාස්තුව: රු. 25'})`}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Success / Error Banners */}
          {submissionSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-400 text-emerald-900 dark:text-emerald-100 text-xs sm:text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{submissionSuccess}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950 border border-rose-300 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 dark:bg-[#05140b] border-t border-slate-200 dark:border-emerald-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            🔒 ආරක්ෂිතයි: ළඟම නගරය පමණක් ප්‍රදර්ශනය වේ.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
          >
            වසන්න
          </button>
        </div>

      </div>
    </div>
  );
};

