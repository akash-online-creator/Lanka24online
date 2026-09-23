import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Send, 
  Sparkles, 
  MapPin, 
  Clock, 
  Calendar, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Globe 
} from 'lucide-react';
import { LocationOption, Language } from '../types';
import { uploadMediaToTelegram } from '../utils/telegramStorage';
import { resolveExactLocation } from '../utils/geoUtils';

interface AiVoiceInlineBarProps {
  currentLocation?: LocationOption;
  lang?: Language;
  titlePrompt?: string;
  onVoiceCaptured: (data: {
    audioUrl: string;
    durationSec: number;
    transcript: string;
    date: string;
    time: string;
    location: string;
    coords?: { lat: number; lng: number };
    parsedFields?: any;
  }) => void;
}

export const AiVoiceInlineBar: React.FC<AiVoiceInlineBarProps> = ({
  currentLocation,
  lang = 'si',
  titlePrompt = 'AI හඬ සහය (Voice Input): සිංහලෙන් හෝ ඉංග්‍රීසියෙන් කතා කරන්න',
  onVoiceCaptured,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<'si' | 'ta' | 'en'>('si');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  // Time & Location
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [locName, setLocName] = useState(currentLocation?.nameSi || 'ශ්‍රී ලංකාව');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any | null>(null);

  const refreshTimeAndLocation = () => {
    const now = new Date();
    setDateStr(now.toLocaleDateString('si-LK', { year: 'numeric', month: '2-digit', day: '2-digit' }));
    setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));

    if (currentLocation?.lat && currentLocation?.lng) {
      setCoords({ lat: currentLocation.lat, lng: currentLocation.lng });
      setLocName(currentLocation.nameSi || 'ස්ථානය');
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });
          try {
            const loc = await resolveExactLocation(lat, lng);
            if (loc) {
              setLocName(`${loc.townSi || loc.villageSi || loc.shortDisplaySi || ''} (${loc.districtSi || ''})`.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          } catch {}
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  };

  useEffect(() => {
    refreshTimeAndLocation();
  }, [currentLocation]);

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

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition start error:', e);
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

  // 1. VOICE (Mic Record)
  const handleStartRecording = async () => {
    refreshTimeAndLocation();
    setSuccessNotice(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
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
      alert('මයික්‍රෆෝනය සක්‍රිය කළ නොහැකි විය. කරුණාකර අවසර (Microphone Permission) ලබා දෙන්න හෝ කෙලින්ම සටහන ලියා යොමු කරන්න.');
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
    stopSpeechRecognition();
  };

  // 2. PLAY (Preview Audio)
  const handleTogglePlay = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play().then(() => setIsPlayingPreview(true)).catch(console.warn);
    }
  };

  // 3. SENT (Submit & Auto-fill)
  const handleSendVoice = async () => {
    if (!audioBlob && !transcript.trim()) return;
    if (isRecording) handleStopRecording();

    setIsProcessing(true);
    let finalAudioUrl = audioUrl || '';

    if (audioBlob) {
      try {
        const uploadRes = await uploadMediaToTelegram({
          file: audioBlob,
          fileName: `voice_note_${Date.now()}.webm`,
          mimeType: 'audio/webm',
          mediaType: 'voice',
          senderName: 'User Voice Input',
          sourceContext: 'Inline Voice Help Bar',
          caption: `🎙️ Voice Note (${recordingSeconds}s) - ${locName}`,
        });
        if (uploadRes?.url) {
          finalAudioUrl = uploadRes.url;
        }
      } catch (err) {
        console.warn('Voice upload notice:', err);
      }
    }

    const fullTranscript = transcript.trim() || interimTranscript.trim();

    // Call AI Voice Parser
    let parsedFields: any = null;
    try {
      const response = await fetch('/api/ai/voice-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: fullTranscript,
          language: selectedLanguage,
          locationContext: { name: locName, lat: coords?.lat, lng: coords?.lng, date: dateStr, time: timeStr },
        }),
      });
      const resJson = await response.json();
      if (resJson?.data) {
        parsedFields = resJson.data;
      }
    } catch {}

    onVoiceCaptured({
      audioUrl: finalAudioUrl,
      durationSec: Math.max(1, recordingSeconds),
      transcript: fullTranscript,
      date: dateStr,
      time: timeStr,
      location: locName,
      coords: coords || undefined,
      parsedFields,
    });

    setIsProcessing(false);
    setSuccessNotice(true);
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-900/10 via-teal-900/10 to-emerald-900/10 dark:from-[#092216] dark:via-[#0b281b] dark:to-[#092216] border-2 border-emerald-500/50 dark:border-emerald-600/60 shadow-xs space-y-3">
      
      {/* Header & Language */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-black text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
          <span>{titlePrompt}</span>
        </span>

        <div className="flex items-center gap-1">
          {(['si', 'ta', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setSelectedLanguage(l)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedLanguage === l
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-emerald-950/60 hover:bg-emerald-100'
              }`}
            >
              {l === 'si' ? 'සිං' : l === 'ta' ? 'தமிழ்' : 'Eng'}
            </button>
          ))}
        </div>
      </div>

      {/* Auto Stamped Location & Time */}
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-600 dark:text-emerald-300/80 bg-white/60 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 flex-wrap">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
          <span className="font-mono">{dateStr || 'අද'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-teal-600 shrink-0" />
          <span className="font-mono">{timeStr || 'දැන්'}</span>
        </div>
        <div className="flex items-center gap-1 truncate max-w-[180px]">
          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
          <span className="truncate">{locName}</span>
        </div>
      </div>

      {/* 3 Buttons: Voice, Play, Sent */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 1. Voice Button */}
        {!isRecording ? (
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={isProcessing}
            className="flex-1 min-w-[110px] py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
            title="හඬ පටිගත කරන්න"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>🎙️ Voice</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopRecording}
            className="flex-1 min-w-[110px] py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer animate-pulse"
            title="නවත්වන්න"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>⏹️ නවතන්න ({recordingSeconds}s)</span>
          </button>
        )}

        {/* 2. Play Button */}
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
              onClick={handleTogglePlay}
              disabled={isRecording || isProcessing}
              className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95"
              title="අසා බලන්න"
            >
              {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>▶️ Play</span>
            </button>
          </>
        )}

        {/* 3. Sent Button */}
        <button
          type="button"
          onClick={handleSendVoice}
          disabled={(!audioBlob && !transcript.trim()) || isProcessing}
          className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:cursor-not-allowed"
          title="තොරතුරු සමඟ ඇතුළත් කරන්න"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI සකසමින්...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>🚀 Sent (යවන්න)</span>
            </>
          )}
        </button>

        {(audioUrl || transcript) && !isRecording && (
          <button
            type="button"
            onClick={() => {
              setAudioBlob(null);
              setAudioUrl(null);
              setTranscript('');
              setInterimTranscript('');
              setSuccessNotice(false);
            }}
            className="p-2 rounded-xl bg-slate-200 dark:bg-emerald-950 text-slate-600 dark:text-slate-300 hover:bg-slate-300 cursor-pointer text-xs"
            title="ඉවත් කරන්න"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          </button>
        )}
      </div>

      {/* Live transcript snippet */}
      {(transcript || interimTranscript) && (
        <div className="p-2 bg-white/80 dark:bg-emerald-950/60 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">පෙළ: </span>
          {transcript} <span className="text-slate-400 italic">{interimTranscript}</span>
        </div>
      )}

      {/* Success notice */}
      {successNotice && (
        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-[11px] font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>✅ හඬ පණිවිඩය, දිනය, වේලාව සහ ස්ථානය සාර්ථකව සම්බන්ධ කරන ලදී!</span>
        </div>
      )}

    </div>
  );
};
