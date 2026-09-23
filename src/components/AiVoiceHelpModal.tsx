import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Send, 
  Trash2, 
  Sparkles, 
  MapPin, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  Zap, 
  Search, 
  Users, 
  HeartHandshake, 
  X, 
  Loader2, 
  CheckCircle2, 
  Volume2, 
  RefreshCw,
  Globe,
  Radio
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User, RedAlertItem, GroupItem } from '../types';
import { uploadMediaToTelegram } from '../utils/telegramStorage';
import { resolveExactLocation } from '../utils/geoUtils';
import { AudioVoicePlayer } from './AudioVoiceNote';

interface AiVoiceHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  currentLocation: LocationOption;
  lang: Language;
  onSubmitHelpPost?: (post: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>) => Promise<any> | void;
  onSubmitRedAlert?: (alert: RedAlertItem) => Promise<any> | void;
  onSubmitGroup?: (group: GroupItem) => Promise<any> | void;
  onOpenQuickServicePrefilled?: (data: any) => void;
  onOpenFindForMePrefilled?: (data: any) => void;
  onOpenRedAlertPrefilled?: (data: any) => void;
  onOpenGroupWorkPrefilled?: (data: any) => void;
}

export const AiVoiceHelpModal: React.FC<AiVoiceHelpModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLocation,
  lang,
  onSubmitHelpPost,
  onSubmitRedAlert,
  onSubmitGroup,
  onOpenQuickServicePrefilled,
  onOpenFindForMePrefilled,
  onOpenRedAlertPrefilled,
  onOpenGroupWorkPrefilled,
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

  // AI Analysis & Submission states
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any | null>(null);

  // Initialize time and location
  useEffect(() => {
    if (isOpen) {
      updateLiveLocationAndDateTime();
      setTranscript('');
      setInterimTranscript('');
      setAudioBlob(null);
      setAudioUrl(null);
      setAiAnalysisResult(null);
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
            if (loc) {
              const fullLocName = `${loc.townSi || loc.villageSi || loc.shortDisplaySi || ''} (${loc.districtSi || ''})`.trim();
              setLocationName(fullLocName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            } else {
              setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)} (GPS)`);
            }
          } catch {
            setLocationName(currentLocation?.nameSi || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
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

  // Setup Web Speech Recognition
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech Recognition not supported in this browser.');
      return;
    }

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

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition warning:', e.error);
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
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

  // 1. START VOICE RECORDING (Voice Button)
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

      // Start duration counter
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
      console.error('Mic access error:', err);
      setErrorMsg('මයික්‍රෆෝනය භාවිතය සඳහා අවසර ලබා දී නොමැත. කරුණාකර Browser Settings හි Microphone Allow කරන්න.');
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

  // 2. PLAY / PAUSE PREVIEW (Play Button)
  const handleTogglePlayPreview = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play().then(() => setIsPlayingPreview(true)).catch(console.warn);
    }
  };

  // 3. SENT BUTTON (Send / Submit Voice Request with Date, Time & Location)
  const handleSendVoiceRequest = async () => {
    if (!audioBlob && !transcript.trim()) {
      setErrorMsg('කරුණාකර හඬ පණිවිඩයක් පටිගත කරන්න හෝ අවශ්‍යතාවය පවසන්න.');
      return;
    }

    if (isRecording) {
      handleStopRecording();
    }

    setIsProcessingAi(true);
    setErrorMsg(null);
    setSubmissionSuccess(null);

    try {
      // 1. Upload audio to Telegram Cloud Vault or generate Data URL
      let finalAudioUrl = audioUrl || '';
      let telegramRec: any = undefined;

      if (audioBlob) {
        try {
          const uploadRes = await uploadMediaToTelegram({
            file: audioBlob,
            fileName: `voice_sos_${Date.now()}.webm`,
            mimeType: 'audio/webm',
            mediaType: 'voice',
            senderName: currentUser?.name || 'Voice User',
            sourceContext: 'AI Voice SOS & Help Request',
            caption: `🎙️ Voice Note (${recordingSeconds}s) - ${locationName}`,
          });
          if (uploadRes?.url) {
            finalAudioUrl = uploadRes.url;
            telegramRec = uploadRes.record;
          }
        } catch (upErr) {
          console.warn('Telegram upload notice, fallback to local URL:', upErr);
        }
      }

      // 2. Call AI Voice Parser Endpoint
      const fullTextToAnalyze = transcript.trim() || interimTranscript.trim() || 'හදිසි සහයක් අවශ්‍යයි (Voice SOS)';
      
      let parsedData: any = null;
      try {
        const response = await fetch('/api/ai/voice-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: fullTextToAnalyze,
            language: selectedLanguage,
            locationContext: {
              name: locationName,
              lat: coords?.lat,
              lng: coords?.lng,
              date: currentDateString,
              time: currentTimeString,
            },
          }),
        });
        const resJson = await response.json();
        if (resJson?.data) {
          parsedData = resJson.data;
        }
      } catch (aiErr) {
        console.warn('AI Voice Parse API warning:', aiErr);
      }

      // Default fallback if parsing did not yield data
      if (!parsedData) {
        parsedData = {
          serviceType: 'quick_service',
          titleSi: fullTextToAnalyze.slice(0, 50),
          whatHappened: fullTextToAnalyze,
          whatIsNeeded: 'ක්ෂණික හඬ සහයක් අවශ්‍යයි',
          urgency: 'high',
          suggestedCategory: 'ක්ෂණික උපකාර',
          payment: 'නොමිලේ',
          helpersNeeded: 1,
        };
      }

      setAiAnalysisResult(parsedData);

      // Common Post metadata with exact Date, Time, and Location
      const basePostMetadata = {
        title: parsedData.titleSi || fullTextToAnalyze.slice(0, 60),
        whatHappened: parsedData.whatHappened || fullTextToAnalyze,
        whatIsNeeded: parsedData.whatIsNeeded || 'හඬ පණිවිඩය අසා සහය වන්න',
        conditions: 'හඬ පණිවිඩය අසා තොරතුරු තහවුරු කරගන්න.',
        specialNotice: `🎙️ AI හඬ ආධාර ඉල්ලීමකි. (යැවූ වේලාව: ${currentTimeString}, දිනය: ${currentDateString}, ස්ථානය: ${locationName})`,
        transport: 'ඔබ පැමිණිය යුතුයි',
        payment: parsedData.payment || 'නොමිලේ',
        helpersNeeded: parsedData.helpersNeeded || 1,
        helpersAccepted: 0,
        feeAgreed: true,
        locationName: locationName || currentLocation?.nameSi || 'ශ්‍රී ලංකාව',
        distanceKm: 0,
        lat: coords?.lat || currentLocation?.lat || 6.9271,
        lng: coords?.lng || currentLocation?.lng || 79.8612,
        category: parsedData.suggestedCategory || 'ක්ෂණික සේවා',
        tagName: parsedData.suggestedCategory || 'හඬ සහය',
        tagCategory: 'හදිසි උපකාර',
        userName: currentUser?.name || 'පරිශීලක',
        userPhone: currentUser?.phone || currentUser?.whatsappNumber || '0771234567',
        userEmail: currentUser?.email || '',
        userId: currentUser?.id || currentUser?.userId,
        status: 'active' as const,
        audioUrl: finalAudioUrl,
        audioDurationSec: Math.max(1, recordingSeconds),
        voiceSentDate: currentDateString,
        voiceSentTime: currentTimeString,
        voiceSentLocation: locationName,
        voiceCoordinates: coords || undefined,
        isVoicePost: true,
        voiceTranscript: fullTextToAnalyze,
        voiceLanguage: selectedLanguage,
        telegramStorage: telegramRec,
      };

      // Direct Routing / Execution based on classified service
      if (parsedData.serviceType === 'red_alert' && onSubmitRedAlert) {
        const redAlertItem: RedAlertItem = {
          id: `red_${Date.now()}`,
          alertCode: `#RED-${Math.floor(1000 + Math.random() * 9000)}`,
          disasterType: parsedData.disasterType || 'other',
          disasterTitleSi: parsedData.titleSi || '🚨 හදිසි ආපදා අනතුරු ඇඟවීම (Voice SOS)',
          disasterTitleEn: parsedData.titleEn || 'Emergency SOS Voice Alert',
          disasterTitleTa: parsedData.titleTa || 'அவசர SOS குரல் எச்சரிக்கை',
          description: `${fullTextToAnalyze}\n\n🎙️ [හඬ පණිවිඩය යැවූ දිනය: ${currentDateString}, වේලාව: ${currentTimeString}, ස්ථානය: ${locationName}]`,
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
          severity: parsedData.urgency === 'critical' ? 'critical' : 'high',
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
        setSubmissionSuccess('🚨 හදිසි රතු එළිය (Red Alert SOS) සාර්ථකව පලකරන ලදී!');
      } else if (onSubmitHelpPost) {
        await onSubmitHelpPost(basePostMetadata);
        setSubmissionSuccess('✅ ඔබගේ AI හඬ ආධාර ඉල්ලීම (Voice Request) දිනය, වේලාව සහ ස්ථානය සමඟ සාර්ථකව පලකරන ලදී!');
      }

      setTimeout(() => {
        setIsProcessingAi(false);
      }, 1500);
    } catch (err: any) {
      console.error('Send voice request error:', err);
      setIsProcessingAi(false);
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
                <span>AI හඬ සහය (Voice SOS & Help Requests)</span>
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-100 font-medium">
                සිංහල, දෙමළ හෝ ඉංග්‍රීසියෙන් කතා කර ක්ෂණිකව සහය ලබාගන්න
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
                <span>යවන අවස්ථාවේ තොරතුරු (Auto-stamped on post):</span>
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
                <span className="truncate" title={locationName}>
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
                    ✅ හඬ පණිවිඩය සූදානම්! ඔබට එය අසා බලා (Play) හෝ යැවිය (Sent) හැක.
                  </span>
                ) : (
                  <span>පහත 'Voice බොත්තම' ඔබා ඔබගේ හදිසි ආධාර ඉල්ලීම හෝ ස්වේච්ඡා දායකත්වය පවසන්න</span>
                )}
              </p>
            </div>

            {/* 4. THE 3 MANDATORY BUTTONS (Voice, Play, Sent) */}
            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              
              {/* BUTTON 1: VOICE (Record / Stop) */}
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isProcessingAi}
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

              {/* BUTTON 2: PLAY (Preview Audio) */}
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
                    disabled={isRecording || isProcessingAi}
                    className="px-4 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-sky-600/30 active:scale-95 cursor-pointer transition-all"
                    title="පටිගත කළ හඬ අසා බලන්න"
                  >
                    {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    <span>{isPlayingPreview ? '⏸️ Pause' : '▶️ Play (අසන්න)'}</span>
                  </button>
                </>
              )}

              {/* BUTTON 3: SENT (Submit Voice Request with Date, Time, Location) */}
              <button
                type="button"
                onClick={handleSendVoiceRequest}
                disabled={(!audioBlob && !transcript.trim()) || isProcessingAi}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-700 hover:from-amber-600 hover:to-emerald-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-emerald-700/30 active:scale-95 cursor-pointer transition-all disabled:cursor-not-allowed"
                title="දිනය, වේලාව, ස්ථානය සමඟ පලකරන්න"
              >
                {isProcessingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI සකසමින්...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>🚀 Sent (යවන්න)</span>
                  </>
                )}
              </button>

              {/* Reset/Trash */}
              {(audioUrl || transcript) && !isRecording && (
                <button
                  type="button"
                  onClick={() => {
                    setAudioBlob(null);
                    setAudioUrl(null);
                    setTranscript('');
                    setInterimTranscript('');
                    setAiAnalysisResult(null);
                  }}
                  className="p-3 rounded-2xl bg-slate-200 dark:bg-emerald-950/80 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs active:scale-95 cursor-pointer"
                  title="මකන්න (Clear)"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </button>
              )}
            </div>

          </div>

          {/* 5. Live Spoken Transcription Display */}
          {(transcript || interimTranscript) && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071b10] border border-slate-200 dark:border-emerald-900/60 space-y-1.5">
              <span className="text-[11px] font-black text-slate-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                <span>හඳුනාගත් පෙළ (Live Speech Transcript):</span>
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed bg-white dark:bg-[#05140b] p-3 rounded-xl border border-slate-200/80 dark:border-emerald-900/40">
                {transcript} <span className="text-slate-400 italic">{interimTranscript}</span>
              </p>
            </div>
          )}

          {/* 6. Success Banner */}
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

          {/* Supported Services Shortcut Preview */}
          <div className="pt-2 border-t border-slate-200 dark:border-emerald-900/60">
            <p className="text-[11px] font-bold text-slate-500 dark:text-emerald-400 mb-2">
              🌟 හඬ මඟින් ස්වයංක්‍රීයව වර්ගීකරණය වන සේවාවන්:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                <Zap className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <span className="text-[11px] font-black text-amber-900 dark:text-amber-200 block">ඉක්මන් සේවා</span>
                <span className="text-[9px] text-slate-500">කාර්මික / අලුත්වැඩියා</span>
              </div>

              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-center">
                <Search className="w-4 h-4 text-sky-600 mx-auto mb-1" />
                <span className="text-[11px] font-black text-sky-900 dark:text-sky-200 block">සොයාදෙන්න</span>
                <span className="text-[9px] text-slate-500">නැතිවූ / සෙවීම්</span>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                <AlertTriangle className="w-4 h-4 text-rose-600 mx-auto mb-1" />
                <span className="text-[11px] font-black text-rose-900 dark:text-rose-200 block">රතු එළි (SOS)</span>
                <span className="text-[9px] text-slate-500">හදිසි ආපදා / ගිනි / ජල</span>
              </div>

              <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-center">
                <Users className="w-4 h-4 text-teal-600 mx-auto mb-1" />
                <span className="text-[11px] font-black text-teal-900 dark:text-teal-200 block">කණ්ඩායම් වැඩ</span>
                <span className="text-[9px] text-slate-500">ශ්‍රමදාන / ස්වේච්ඡා</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 dark:bg-[#05140b] border-t border-slate-200 dark:border-emerald-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            🔒 ආරක්ෂිතයි: හඬ පණිවිඩය සමඟ දිනය, වේලාව හා ස්ථානය පමණක් ප්‍රජාවට පෙන්වයි.
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
