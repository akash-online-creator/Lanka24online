import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send, Volume2, AlertCircle, Cloud, Loader2 } from 'lucide-react';
import { uploadMediaToTelegram } from '../utils/telegramStorage';
import { TelegramMediaRecord } from '../types';

interface AudioVoiceRecorderProps {
  onSendAudio: (audioUrl: string, durationSec: number, telegramRecord?: TelegramMediaRecord) => void;
  onCancel: () => void;
  maxDurationSec?: number;
  senderName?: string;
  sourceContext?: string;
}

// Helper to determine supported audio MIME type across all mobile and desktop browsers
function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    ''
  ];
  for (const t of candidateTypes) {
    if (!t) return '';
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}

// Helper to convert Blob to Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert audio to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const AudioVoiceRecorder: React.FC<AudioVoiceRecorderProps> = ({
  onSendAudio,
  onCancel,
  maxDurationSec = 60,
  senderName = 'User',
  sourceContext = 'Audio Message',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const mimeTypeRef = useRef<string>('');

  // Start recording on mount
  useEffect(() => {
    let isCancelled = false;

    const startRecordingSession = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setPermissionError('ඔබගේ බ්‍රවුසරය හඬ පටිගත කිරීම (Voice Recording) සඳහා සහය නොදක්වයි.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const mime = getSupportedAudioMimeType();
        mimeTypeRef.current = mime;

        const options: MediaRecorderOptions = mime ? { mimeType: mime } : {};
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const actualMime = mimeTypeRef.current || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: actualMime });
          setAudioBlob(blob);
          try {
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
          } catch (e) {
            console.warn('URL.createObjectURL notice:', e);
          }
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
      isCancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [maxDurationSec]);

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  const handleSend = async () => {
    if (isUploading) return;
    setIsUploading(true);

    try {
      let finalBlob = audioBlob;

      // If still actively recording, stop and capture current chunks
      if (isRecording || (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording')) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (mediaRecorderRef.current) {
          try {
            mediaRecorderRef.current.requestData();
            mediaRecorderRef.current.stop();
          } catch {}
        }
        // Small delay to let ondataavailable finish pushing chunks
        await new Promise((r) => setTimeout(r, 200));
        const actualMime = mimeTypeRef.current || 'audio/webm';
        finalBlob = new Blob(audioChunksRef.current, { type: actualMime });
        setAudioBlob(finalBlob);
      }

      if (!finalBlob || finalBlob.size === 0) {
        if (audioChunksRef.current.length > 0) {
          finalBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current || 'audio/webm' });
        }
      }

      if (!finalBlob) {
        console.warn('No audio data recorded');
        setIsUploading(false);
        return;
      }

      // Convert to Base64 as guarantee of portability
      const base64Data = await blobToBase64(finalBlob);
      const duration = Math.max(1, elapsedSec);

      // Attempt cloud/telegram storage upload
      let finalUrl = base64Data;
      let tgRecord: TelegramMediaRecord | undefined = undefined;

      try {
        const uploadRes = await uploadMediaToTelegram({
          file: finalBlob,
          fileBase64: base64Data,
          fileName: `voice_note_${Date.now()}.${mimeTypeRef.current.includes('mp4') ? 'mp4' : 'webm'}`,
          mimeType: mimeTypeRef.current || 'audio/webm',
          mediaType: 'voice',
          senderName,
          sourceContext,
          caption: `Voice Note (${duration}s)`,
        });

        if (uploadRes && uploadRes.url) {
          finalUrl = uploadRes.url;
          tgRecord = uploadRes.record;
        }
      } catch (uploadErr) {
        console.warn('Upload proxy warning, using persistent Base64 audio:', uploadErr);
      }

      // Stop all tracks cleanly
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      onSendAudio(finalUrl, duration, tgRecord);
    } catch (err) {
      console.error('Failed to process and send audio:', err);
      // Last fallback
      if (audioChunksRef.current.length > 0) {
        try {
          const fallbackBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const b64 = await blobToBase64(fallbackBlob);
          onSendAudio(b64, Math.max(1, elapsedSec));
        } catch (fbErr) {
          console.error('Audio fallback also failed:', fbErr);
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const togglePreview = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play()
        .then(() => setIsPlayingPreview(true))
        .catch(console.warn);
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
          className="px-3 py-1 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-white rounded-lg font-bold text-[11px] cursor-pointer"
        >
          වසන්න (Cancel)
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-2.5 bg-gradient-to-r from-emerald-100/90 to-teal-100/90 dark:from-[#061e13] dark:to-[#082a1b] border-2 border-emerald-400 dark:border-emerald-600 rounded-2xl shadow-md animate-fadeIn w-full">
      <div className="flex items-center gap-2 min-w-0">
        {isRecording ? (
          <div className="relative flex items-center justify-center shrink-0">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute" />
            <span className="w-3 h-3 rounded-full bg-rose-600 relative" />
          </div>
        ) : (
          <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}

        <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-100 shrink-0">
          {formatTimer(elapsedSec)} / {formatTimer(maxDurationSec)}
        </span>

        {isRecording ? (
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold animate-pulse truncate">
            🎙️ පටිගත වෙමින් පවතී...
          </span>
        ) : (
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1 truncate">
            <Cloud className="w-3 h-3 text-sky-500 shrink-0" />
            <span>හඬ පණිවිඩය සූදානම්</span>
          </span>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isRecording ? (
          <>
            <button
              type="button"
              onClick={stopRecording}
              className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center gap-1 active:scale-95 cursor-pointer"
              title="පටිගත කිරීම නවත්වන්න"
            >
              <Square className="w-3.5 h-3.5 fill-current text-rose-500" />
              <span className="hidden sm:inline">නවතන්න</span>
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={handleSend}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>යවමින්...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>යවන්න</span>
                </>
              )}
            </button>
          </>
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
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm active:scale-95 cursor-pointer"
                  title="අසා බලන්න"
                >
                  {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              </>
            )}

            <button
              type="button"
              disabled={isUploading}
              onClick={handleSend}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>සුරකිමින්...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>යවන්න (Send Voice)</span>
                </>
              )}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onCancel}
          disabled={isUploading}
          className="p-2 rounded-xl bg-slate-200 dark:bg-emerald-950/80 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs active:scale-95 cursor-pointer disabled:opacity-40"
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
  lang?: any;
  language?: any;
}

export const AudioVoicePlayer: React.FC<AudioVoicePlayerProps> = ({
  audioUrl,
  durationSec = 5,
  isMe = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(durationSec);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback error:', err);
          setIsPlaying(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const formatSec = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const effectiveDuration = audioDuration > 0 ? audioDuration : (durationSec > 0 ? durationSec : 5);
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-2xl min-w-[210px] max-w-xs shadow-xs ${
      isMe 
        ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white' 
        : 'bg-emerald-50 dark:bg-[#0b2418] text-slate-800 dark:text-slate-100 border border-emerald-200/80 dark:border-emerald-800/60'
    }`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={(e) => {
          console.warn('Audio tag playback error:', e);
          setIsPlaying(false);
        }}
        className="hidden"
      />

      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all cursor-pointer ${
          isMe ? 'bg-white text-emerald-700 hover:bg-emerald-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
        title={isPlaying ? 'Pause' : 'Play Voice Note'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold opacity-85">
          <span>{formatSec(currentTime)}</span>
          <span className="flex items-center gap-0.5">
            <Cloud className="w-2.5 h-2.5 text-sky-400" />
            <span>{formatSec(effectiveDuration)}</span>
          </span>
        </div>
        {/* Progress Bar */}
        <div 
          onClick={(e) => {
            if (!audioRef.current || !effectiveDuration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            const targetTime = clickPos * effectiveDuration;
            audioRef.current.currentTime = targetTime;
            setCurrentTime(targetTime);
          }}
          className="h-2 bg-black/20 dark:bg-white/20 rounded-full overflow-hidden cursor-pointer"
        >
          <div
            className={`h-full transition-all duration-100 ${isMe ? 'bg-white' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>

      <span className="text-xs shrink-0" title="Voice Note">🎙️</span>
    </div>
  );
};
