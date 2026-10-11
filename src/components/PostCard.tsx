import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Send, 
  Trash2, 
  MapPin, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  Zap, 
  HeartHandshake, 
  X, 
  Loader2, 
  CheckCircle2, 
  RefreshCw,
  Globe,
  Radio,
  Coins
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
  onSubmitHelpPost?: (post: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>) => Promise<any> | void;
  onSubmitRedAlert?: (alert: RedAlertItem) => Promise<any> | void;
}

export const AiVoiceHelpModal: React.FC<AiVoiceHelpModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLocation,
  lang = 'si',
  onSubmitHelpPost,
  onSubmitRedAlert,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<'si' | 'ta' | 'en'>('si');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // Real-time Date, Time & GPS Location stamps
  const [currentDateString, setCurrentDateString] = useState('');
  const [currentTimeString, setCurrentTimeString] = useState('');
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  // Mandatory Category Selection (Quick Services, Normal Services, Red Alert only)
  const [selectedCategory, setSelectedCategory] = useState<AllowedVoiceCategory | null>(null);

  // Submission states
  const [isProcessingSubmit, setIsProcessingSubmit] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any | null>(null);

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      updateLiveLocationAndDateTime();
      setTranscript('');
      setInterimTranscript('');
      setAudioBlob(null);
      setAudioUrl(null);
      setSelectedCategory(null);
      setSubmissionSuccess(null);
      setErrorMsg(null);
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  }, [isOpen]);

  const updateLiveLocationAndDateTime = async () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('si-LK', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    
    setCurrentDateString(dateStr);
    setCurrentTimeString(timeStr);

    if (currentLocation?.nameSi) {
      setLocationName(currentLocation.nameSi);
      setCoords({ lat: currentLocation.lat || 6.9271, lng: currentLocation.lng || 79.8612 });
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsResolvingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });

          try {
            const loc = await resolveExactLocation(lat, lng);
            if (loc && (loc.townSi || loc.districtSi)) {
              // ළඟම නගරය පමණක් ලබාගැනීම (නිශ්චිත ස්ථානය සඟවයි)
              const cityOnly = (loc.townSi || loc.districtSi || currentLocation?.nameSi || '').split('(')[0].trim();
              setLocationName(cityOnly || 'ළඟම නගරය');
            } else {
              const cityOnly = (currentLocation?.nameSi || 'කොළඹ').split('(')[0].trim();
              setLocationName(cityOnly);
            }
          } catch {
            const cityOnly = (currentLocation?.nameSi || 'නගරය').split('(')[0].trim();
            setLocationName(cityOnly);
          } finally {
            setIsResolvingLocation(false);
          }
        },
        () => {
          setIsResolvingLocation(false);
          setLocationName(currentLocation?.nameSi || 'කොළඹ (Colombo)');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Setup Web Speech Recognition for fallback transcript
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      const langCodes: Record<'si' | 'ta' | 'en', string> = {
        si: 'si-LK',
        ta: 'ta-LK',
        en: 'en-US',
      };
      recognition.lang = langCodes[selectedLanguage] || 'si-LK';

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + ' ';
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }

        if (finalStr) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${finalStr.trim()}` : finalStr.trim()));
        }
        setInterimTranscript(interimStr);
      };

      recognition.onerror = () => {};
      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition warning:', err);
    }
  };

  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
  };

  // START VOICE RECORDING
  const handleStartRecording = async () => {
    setErrorMsg(null);
    setSubmissionSuccess(null);
    updateLiveLocationAndDateTime();

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

      startSpeechRecognition();
    } catch (err: any) {
      console.warn('Microphone access notice:', err?.name || err?.message || err);
      setErrorMsg('මයික්‍රෆෝනය සක්‍රිය කිරීම සඳහා අවසර ලබා දී නොමැත. කරුණාකර Browser Settings පරීක්ෂා කරන්න.');
    }
  };

  // STOP RECORDING
  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopSpeechRecognition();
  };

  // PLAY / PAUSE PREVIEW
  const handleTogglePlayPreview = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play().then(() => setIsPlayingPreview(true)).catch(console.warn);
    }
  };

  // SEND VOICE REQUEST WITH MANDATORY CATEGORY SELECTION
  const handleSendVoiceRequest = async () => {
    if (!audioBlob && !transcript.trim() && !isRecording && audioChunksRef.current.length === 0) {
      setErrorMsg('කරුණාකර හඬ පණිවිඩයක් පටිගත කරන්න.');
      return;
    }

    if (!selectedCategory) {
      setErrorMsg('කරුණාකර දැන්වීම පළකිරීම සඳහා පහතින් සේවා කාණ්ඩයක් තෝරන්න (ඉක්මන් සේවා, සාමාන්‍ය සේවා, හෝ ආපදා රතු එළිය).');
      return;
    }

    setIsProcessingSubmit(true);
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

      // Convert audioBlob to Base64 data URL
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
          console.warn('Base64 conversion notice:', b64Err);
        }
      }

      let finalAudioUrl = base64AudioUrl || audioUrl || '';
      let telegramRec: any = undefined;

      if (currentBlob) {
        try {
          const uploadRes = await uploadMediaToTelegram({
            file: currentBlob,
            fileName: `voice_sos_${Date.now()}.webm`,
            mimeType: 'audio/webm',
            mediaType: 'voice',
            senderName: currentUser?.name || 'Voice User',
            sourceContext: 'හඬ සහය (Voice Help)',
            caption: `🎙️ Voice Note (${Math.max(1, recordingSeconds)}s) - ${locationName}`,
          });
          if (uploadRes?.url) {
            finalAudioUrl = uploadRes.url;
            telegramRec = uploadRes.record;
          }
        } catch (upErr) {
          console.warn('Media upload notice, fallback to local URL:', upErr);
        }
      }

      const categoryLabels: Record<AllowedVoiceCategory, { si: string; en: string; ta: string; tag: string }> = {
        quick_services: { si: 'ඉක්මන් සේවා', en: 'Quick Services', ta: 'விரைவு சேவைகள்', tag: 'ඉක්මන් සේවා' },
        general_help: { si: 'සාමාන්‍ය සේවා', en: 'Normal Services', ta: 'பொது சேவைகள்', tag: 'සාමාන්‍ය සේවා' },
        red_alert: { si: 'ආපදා / රතු එළිය', en: 'Disaster Red Alert', ta: 'சிவப்பு எச்சரிக்கை', tag: 'රතු එළිය' },
      };

      const chosenMeta = categoryLabels[selectedCategory];

      if (selectedCategory === 'red_alert' && onSubmitRedAlert) {
        const redAlertItem: RedAlertItem = {
          id: `red_${Date.now()}`,
          alertCode: `#RED-${Math.floor(1000 + Math.random() * 9000)}`,
          disasterType: 'other',
          disasterTitleSi: '🚨 හදිසි ආපදා හඬ පණිවිඩය (Voice SOS)',
          disasterTitleEn: 'Emergency Voice SOS Alert',
          disasterTitleTa: 'அவசர குரல் SOS எச்சரிக்கை',
          description: `🎙️ හඬ සහය මඟින් යොමු කළ පණිවිඩයකි. (යැවූ දිනය: ${currentDateString}, වේලාව: ${currentTimeString}, ස්ථානය: ${locationName})`,
          latitude: coords?.lat || currentLocation?.lat || 6.9271,
          longitude: coords?.lng || currentLocation?.lng || 79.8612,
          locationName: locationName,
          incidentDate: currentDateString,
          incidentTime: currentTimeString,
          createdAt: new Date().toISOString(),
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
          voiceSentDate: currentDateString,
          voiceSentTime: currentTimeString,
          voiceSentLocation: locationName,
          voiceCoordinates: coords || undefined,
          isVoiceAlert: true,
        };
        await onSubmitRedAlert(redAlertItem);
        setSubmissionSuccess('🚨 හදිසි ආපදා / රතු එළිය (Voice SOS) සාර්ථකව පළකරන ලදී!');
      } else if (onSubmitHelpPost) {
        const basePostMetadata = {
          title: `🎙️ හඬ සහය (${chosenMeta.si})`,
          whatHappened: 'හඬ පටය ශ්‍රවණය කර සහය වන්න.',
          whatIsNeeded: 'හඬ පණිවිඩය අසා අවශ්‍ය සහය ලබා දෙන්න.',
          conditions: 'හඬ පණිවිඩය අසා තොරතුරු තහවුරු කරගන්න.',
          specialNotice: `🎙️ හඬ සහය දැන්වීමකි. (යැවූ වේලාව: ${currentTimeString}, දිනය: ${currentDateString}, ස්ථානය: ${locationName})`,
          transport: 'සාකච්ඡා කර තීරණය කරනු ලැබේ',
          payment: selectedCategory === 'quick_services' ? 'ගාස්තු ගෙවනු ලැබේ' : 'නොමිලේ / ස්වේච්ඡා',
          helpersNeeded: 1,
          helpersAccepted: 0,
          feeAgreed: true,
          locationName: locationName || currentLocation?.nameSi || 'ශ්‍රී ලංකාව',
          distanceKm: 0,
          lat: coords?.lat || currentLocation?.lat || 6.9271,
          lng: coords?.lng || currentLocation?.lng || 79.8612,
          category: selectedCategory,
          tagName: chosenMeta.tag,
          tagCategory: chosenMeta.si,
          userName: currentUser?.name || 'පරිශීලක',
          userPhone: currentUser?.phone || currentUser?.whatsappNumber || '0771234567',
          userEmail: currentUser?.email || '',
          userId: currentUser?.id || currentUser?.userId,
          status: 'active' as const,
          mediaType: 'voice' as const,
          audioUrl: finalAudioUrl,
          audioDurationSec: Math.max(1, recordingSeconds),
          voiceSentDate: currentDateString,
          voiceSentTime: currentTimeString,
          voiceSentLocation: locationName,
          voiceCoordinates: coords || undefined,
          isVoicePost: true,
          voiceLanguage: selectedLanguage,
          telegramStorage: telegramRec,
          reportsCount: 0,
          reports: [],
          isHidden: false,
        };

        const res: any = await onSubmitHelpPost(basePostMetadata);
        if (res && res.error === 'insufficient_credits') {
          setIsProcessingSubmit(false);
          return;
        }
        setSubmissionSuccess('✅ ඔබගේ හඬ සහය දැන්වීම සාර්ථකව පළකරන ලදී!');
      }

      setTimeout(() => {
        setIsProcessingSubmit(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Send voice request error:', err);
      setIsProcessingSubmit(false);
      setErrorMsg('හඬ පණිවිඩය යැවීමේදී දෝෂයක් ඇතිවිය. කරුණාකර නැවත උත්සාහ කරන්න.');
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
      <div className="relative w-full max-w-xl bg-white dark:bg-[#06180f] border-2 border-emerald-500/80 dark:border-emerald-600/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <Mic className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-1.5">
                <span>හඬ සහය (Voice Help)</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-100 font-medium">
                හඬ පටිගත කර අදාළ කාණ්ඩය තෝරා ක්ෂණිකව දැන්වීම පළකරන්න
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* 1. Language Selector Tabs */}
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-[#092215] border border-slate-200 dark:border-emerald-900/60">
            <span className="text-xs font-bold text-slate-600 dark:text-emerald-300 flex items-center gap-1 pl-2">
              <Globe className="w-3.5 h-3.5" />
              <span>භාෂාව (Language):</span>
            </span>
            <div className="flex items-center gap-1">
              {(['si', 'ta', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setSelectedLanguage(l)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    selectedLanguage === l
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-emerald-900/40'
                  }`}
                >
                  {l === 'si' ? 'සිංහල' : l === 'ta' ? 'தமிழ்' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Live Metadata Stamped Banner (Date, Time, Location) */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-[#082216] border border-emerald-200 dark:border-emerald-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-950 dark:text-emerald-200">
              <span className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                <span>යවන අවස්ථාවේ තොරතුරු:</span>
              </span>
              <button
                type="button"
                onClick={updateLiveLocationAndDateTime}
                className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>යාවත්කාලීන කරන්න</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-1.5 bg-white dark:bg-[#05130b] p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-mono">{currentDateString || 'අද'}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-[#05130b] p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="font-mono">{currentTimeString || 'දැන්'}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-[#05130b] p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="truncate" title={locationName}>නගරය: 
                  {isResolvingLocation ? 'ස්ථානය සොයමින්...' : locationName || 'ශ්‍රී ලංකාව'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Central Voice Recorder Box */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-50 to-emerald-50/50 dark:from-[#081e13] dark:to-[#05130b] border-2 border-emerald-300 dark:border-emerald-800/80 text-center space-y-4 shadow-inner">
            
            {/* Visual Waveform / Pulsing Ring */}
            <div className="relative inline-flex items-center justify-center my-2">
              {isRecording && (
                <>
                  <span className="w-28 h-28 rounded-full bg-rose-500/20 animate-ping absolute" />
                  <span className="w-24 h-24 rounded-full bg-rose-500/30 animate-pulse absolute" />
                </>
              )}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                isRecording 
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white scale-105' 
                  : audioUrl 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' 
                  : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white'
              }`}>
                <Mic className={`w-10 h-10 ${isRecording ? 'animate-bounce' : ''}`} />
              </div>
            </div>

            {/* Timer & Status */}
            <div>
              <p className="text-2xl font-mono font-black text-slate-800 dark:text-zinc-100">
                {formatTimer(recordingSeconds)} <span className="text-xs font-normal text-slate-500">/ 02:00</span>
              </p>
              <p className="text-xs font-bold mt-1 text-slate-600 dark:text-emerald-300">
                {isRecording ? (
                  <span className="text-rose-600 dark:text-rose-400 animate-pulse">
                    🎙️ හඬ පටිගත වෙමින් පවතී... අවශ්‍යතාවය පැහැදිලිව පවසන්න.
                  </span>
                ) : audioUrl ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ✅ හඬ පණිවිඩය සූදානම්! කරුණාකර පහතින් සේවා කාණ්ඩය තෝරන්න.
                  </span>
                ) : (
                  <span>පහත බොත්තම ඔබා ඔබගේ හඬ පටිගත කරන්න</span>
                )}
              </p>
            </div>

            {/* Voice Control Buttons (Record / Stop / Play) */}
            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isProcessingSubmit}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer transition-all disabled:opacity-50"
                  title="හඬ පටිගත කරන්න"
                >
                  <Mic className="w-4 h-4" />
                  <span>🎙️ Voice (කතා කරන්න)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 cursor-pointer animate-pulse"
                  title="පටිගත කිරීම නවතන්න"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>⏹️ නවතන්න (Stop)</span>
                </button>
              )}

              {/* Play / Preview Audio */}
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
                    disabled={isRecording || isProcessingSubmit}
                    className="px-4 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-sky-600/30 active:scale-95 cursor-pointer transition-all"
                    title="පටිගත කළ හඬ අසා බලන්න"
                  >
                    {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    <span>{isPlayingPreview ? '⏸️ Pause' : '▶️ Play (අසන්න)'}</span>
                  </button>
                </>
              )}

              {/* Reset/Trash */}
              {(audioUrl || transcript) && !isRecording && (
                <button
                  type="button"
                  onClick={() => {
                    setAudioBlob(null);
                    setAudioUrl(null);
                    setTranscript('');
                    setInterimTranscript('');
                    setSelectedCategory(null);
                  }}
                  className="p-3 rounded-2xl bg-slate-200 dark:bg-emerald-950/80 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs active:scale-95 cursor-pointer"
                  title="මකන්න (Clear)"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </button>
              )}
            </div>
          </div>

          {/* 4. MANDATORY CATEGORY SELECTION BUTTONS (ONLY 3 ALLOWED CATEGORIES) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>දැන්වීම පළකළ යුතු සේවා කාණ්ඩය තෝරන්න (අනිවාර්යයි):</span>
                <span className="text-rose-500 font-bold">*</span>
              </h3>
              {selectedCategory && (
                <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                  ✓ තෝරා ඇත
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Category 1: ඉක්මන් සේවා */}
              <button
                type="button"
                onClick={() => setSelectedCategory('quick_services')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedCategory === 'quick_services'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 shadow-md ring-2 ring-amber-400/30'
                    : 'border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#071b10] hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex items-center gap-0.5">
                    <Coins className="w-3 h-3" /> රු. 25
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                    ඉක්මන් සේවා
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    හදිසි කාර්මික / ක්ෂණික සහය
                  </p>
                </div>
              </button>

              {/* Category 2: සාමාන්‍ය සේවා */}
              <button
                type="button"
                onClick={() => setSelectedCategory('general_help')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedCategory === 'general_help'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 shadow-md ring-2 ring-emerald-400/30'
                    : 'border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#071b10] hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center gap-0.5">
                    <Coins className="w-3 h-3" /> රු. 25
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                    සාමාන්‍ය සේවා
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ප්‍රජා සහය හා පොදු උපකාර
                  </p>
                </div>
              </button>

              {/* Category 3: ආපදා / රතු එළිය */}
              <button
                type="button"
                onClick={() => setSelectedCategory('red_alert')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedCategory === 'red_alert'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 shadow-md ring-2 ring-rose-400/30'
                    : 'border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#071b10] hover:border-rose-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                    නොමිලේ (Free)
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                    ආපදා / රතු එළිය
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    හදිසි අනතුරු / ගංවතුර / ගිනි SOS
                  </p>
                </div>
              </button>

            </div>
          </div>

          {/* 5. SENT BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSendVoiceRequest}
              disabled={
                (!isRecording && !audioBlob && !transcript.trim() && audioChunksRef.current.length === 0) || 
                !selectedCategory || 
                isProcessingSubmit
              }
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-700/30 active:scale-[0.98] cursor-pointer transition-all"
              title="දැන්වීම පළකරන්න"
            >
              {isProcessingSubmit ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>දැන්වීම පළවෙමින් පවතී...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>
                    {!selectedCategory 
                      ? 'පළමුව සේවා කාණ්ඩය තෝරන්න (Select Category)' 
                      : `දැන්වීම පළකරන්න (${selectedCategory === 'red_alert' ? 'නොමිලේ' : 'ගාස්තුව: රු. 25'})`}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Success Banner */}
          {submissionSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/90 border border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-md animate-bounce">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{submissionSuccess}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-md">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 dark:bg-[#05140b] border-t border-slate-200 dark:border-emerald-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            🔒 ආරක්ෂිතයි: හඬ පණිවිඩය සහ කාණ්ඩය පමණක් ප්‍රජාවට පෙන්වයි.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer active:scale-95"
          >
            වසන්න (Close)
          </button>
        </div>

      </div>
    </div>
  );
};
