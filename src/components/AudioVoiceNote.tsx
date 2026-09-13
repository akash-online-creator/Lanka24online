import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send, Volume2, AlertCircle } from 'lucide-react';

interface AudioVoiceRecorderProps {
  onSendAudio: (audioBase64: string, durationSec: number) => void;
  onCancel: () => void;
  maxDurationSec?: number;
}

export const AudioVoiceRecorder: React.FC<AudioVoiceRecorderProps> = ({
  onSendAudio,
  onCancel,
  maxDurationSec = 60,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Start recording on mount
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startRecordingSession = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setPermissionError('ඔබගේ බ්‍රවුසරය හඬ පටිගත කිරීම (Voice Recording) සඳහා සහය නොදක්වයි.');
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        };

        mediaRecorder.start(200);
        setIsRecording(true);

        timerRef.current = window.setInterval(() => {
          setElapsedSec((prev) => {
            if (prev + 1 >= maxDurationSec) {
              stopRecording();
              return maxDurationSec;
            }
            return prev + 1;
          });
        }, 1000);
      } catch (err: any) {
        console.warn('Microphone access denied or error:', err);
        setPermissionError('මයික්‍රෆෝනය භාවිතය සඳහා අවසර ලබා දී නොමැත. කරුණාකර Browser Settings හි Microphone Allow කරන්න.');
      }
    };

    startRecordingSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [maxDurationSec]);

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSend = () => {
    if (!audioBlob) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      onSendAudio(base64Audio, Math.max(1, elapsedSec));
    };
    reader.readAsDataURL(audioBlob);
  };

  const togglePreview = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (permissionError) {
    return (
      <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-200 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{permissionError}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-white rounded-lg font-bold text-[11px]"
        >
          වසන්න (Cancel)
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-2.5 bg-gradient-to-r from-emerald-100/90 to-teal-100/90 dark:from-[#061e13] dark:to-[#082a1b] border-2 border-emerald-400 dark:border-emerald-600 rounded-2xl shadow-md animate-fadeIn">
      <div className="flex items-center gap-2">
        {isRecording ? (
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute" />
            <span className="w-3 h-3 rounded-full bg-rose-600 relative" />
          </div>
        ) : (
          <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        )}

        <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-100">
          {formatTimer(elapsedSec)} / {formatTimer(maxDurationSec)}
        </span>

        {isRecording && (
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold animate-pulse">
            🎙️ පටිගත වෙමින් පවතී...
          </span>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1.5">
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1 shadow-sm active:scale-95"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>නවතන්න (Stop)</span>
          </button>
        ) : (
          <>
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
                  onClick={togglePreview}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm active:scale-95"
                  title="අසා බලන්න"
                >
                  {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleSend}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1 shadow-md active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>යවන්න (Send Voice)</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-xl bg-slate-200 dark:bg-emerald-950/80 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs active:scale-95"
          title="අවලංගු කරන්න"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
        </button>
      </div>
    </div>
  );
};

interface AudioVoicePlayerProps {
  audioUrl: string;
  durationSec?: number;
  isMe?: boolean;
}

export const AudioVoicePlayer: React.FC<AudioVoicePlayerProps> = ({
  audioUrl,
  durationSec = 5,
  isMe = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const formatSec = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = durationSec > 0 ? (currentTime / durationSec) * 100 : 0;

  return (
    <div className={`flex items-center gap-2.5 p-2 rounded-xl min-w-[200px] max-w-xs ${
      isMe ? 'bg-emerald-700/60 text-white' : 'bg-emerald-50 dark:bg-[#0b2418] text-slate-800 dark:text-slate-100 border border-emerald-200/80 dark:border-emerald-800/60'
    }`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        className="hidden"
      />

      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all cursor-pointer ${
          isMe ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold opacity-80">
          <span>{formatSec(currentTime)}</span>
          <span>{formatSec(durationSec)}</span>
        </div>
        {/* Progress Bar / Waveform Simulator */}
        <div className="h-1.5 bg-black/20 dark:bg-white/20 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${isMe ? 'bg-white' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>

      <span className="text-xs">🎙️</span>
    </div>
  );
};
