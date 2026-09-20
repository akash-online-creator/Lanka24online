import React, { useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  ExternalLink, 
  Globe, 
  Video, 
  Film, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Cloud, 
  Music, 
  Download,
  RotateCcw
} from 'lucide-react';
import { TelegramMediaRecord } from '../types';

interface EmbeddedMediaViewerProps {
  url?: string;
  className?: string;
  compact?: boolean;
  mediaType?: 'video' | 'audio' | 'voice' | 'image' | 'auto';
  telegramRecord?: TelegramMediaRecord;
  title?: string;
  onImageClick?: (url: string) => void;
}

export const EmbeddedMediaViewer: React.FC<EmbeddedMediaViewerProps> = ({
  url,
  className = '',
  compact = false,
  mediaType = 'auto',
  telegramRecord,
  title,
  onImageClick,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!url || typeof url !== 'string' || !url.trim()) {
    return null;
  }

  const cleanUrl = url.trim();
  const isTelegramProxy = cleanUrl.includes('/api/telegram/file/') || cleanUrl.startsWith('data:video/') || cleanUrl.startsWith('data:audio/');
  const isVideoFile = mediaType === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(cleanUrl) || cleanUrl.startsWith('data:video/') || (isTelegramProxy && (telegramRecord?.fileType === 'video' || cleanUrl.includes('video')));
  const isAudioFile = mediaType === 'audio' || mediaType === 'voice' || /\.(mp3|wav|ogg|m4a|aac|opus)(\?.*)?$/i.test(cleanUrl) || cleanUrl.startsWith('data:audio/') || (isTelegramProxy && (telegramRecord?.fileType === 'voice' || telegramRecord?.fileType === 'audio'));
  const isImageFile = mediaType === 'image' || /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(cleanUrl) || cleanUrl.startsWith('data:image/') || (isTelegramProxy && telegramRecord?.fileType === 'image');

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.warn(e));
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (!duration && videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullScreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.warn);
    } else {
      videoRef.current.requestFullscreen().catch(console.warn);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. Telegram / Direct Video File Player with high-fidelity custom in-app viewer
  if (isVideoFile) {
    return (
      <div 
        className={`relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-black shadow-lg group ${className}`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <video
          ref={videoRef}
          src={cleanUrl}
          playsInline
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
          onEnded={() => setIsPlaying(false)}
          className="w-full max-h-96 object-contain bg-black cursor-pointer"
          onClick={togglePlay}
        >
          Your browser does not support video playback.
        </video>

        {/* Telegram Cloud Storage Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-sky-400/50 text-sky-200 px-2.5 py-1 rounded-xl text-[10px] font-bold shadow-md pointer-events-none z-10">
          <Cloud className="w-3 h-3 text-sky-400 animate-pulse" />
          <span>Telegram Cloud Video</span>
          {telegramRecord?.fileSize && (
            <span className="text-slate-400 font-mono text-[9px]">
              ({(telegramRecord.fileSize / (1024 * 1024)).toFixed(1)} MB)
            </span>
          )}
        </div>

        {/* Center Play Overlay Button if Paused */}
        {!isPlaying && (
          <div 
            onClick={togglePlay}
            className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer transition-opacity"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 border-2 border-white/40">
              <Play className="w-7 h-7 fill-current ml-1" />
            </div>
          </div>
        )}

        {/* Floating Custom Video Control Bar */}
        <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 flex flex-col gap-1.5 transition-opacity duration-200 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          {/* Progress / Seek bar */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>

              <span className="text-[11px] font-mono text-slate-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullScreen}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                title="Full Screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Audio & Voice Note Player
  if (isAudioFile) {
    return (
      <div className={`rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 p-3 shadow-md space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Music className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="block font-black text-white">{title || 'හඬ පණිවිඩය (Voice Note)'}</span>
              <span className="text-[10px] text-sky-300 flex items-center gap-1 font-mono">
                <Cloud className="w-2.5 h-2.5" />
                <span>Telegram Cloud Stored</span>
              </span>
            </div>
          </div>
          <audio controls src={cleanUrl} className="h-8 max-w-[180px] sm:max-w-xs" />
        </div>
      </div>
    );
  }

  // 3. Image File Lightbox Trigger
  if (isImageFile) {
    return (
      <div 
        className={`relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-slate-900 cursor-pointer group shadow-md ${className}`}
        onClick={() => onImageClick && onImageClick(cleanUrl)}
      >
        <img
          src={cleanUrl}
          alt={title || 'Media Image'}
          className="w-full max-h-80 object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-xs text-sky-200 border border-sky-400/40 px-2 py-0.5 rounded-lg text-[10px] font-bold">
          <Cloud className="w-3 h-3 text-sky-400" />
          <span>Telegram Photo</span>
        </div>
        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
      </div>
    );
  }

  // 4. YouTube detection
  const ytMatch = cleanUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;

    if (!isPlaying && compact) {
      return (
        <div className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-emerald-500/30 group cursor-pointer ${className}`} onClick={() => setIsPlaying(true)}>
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="YouTube Video Thumbnail"
            className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-rose-600 group-hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
              <Play className="w-6 h-6 fill-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white font-bold bg-black/60 px-2 py-1 rounded-lg backdrop-blur-xs">
            <span className="flex items-center gap-1">
              <Film className="w-3.5 h-3.5 text-rose-400" />
              <span>YouTube Video (Play)</span>
            </span>
            <span className="text-emerald-300 font-mono">Watch here ▶</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`rounded-2xl overflow-hidden border border-emerald-500/40 bg-black aspect-video shadow-md ${className}`}>
        <iframe
          src={embedUrl}
          title="YouTube Video Player"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  // 5. Facebook Video Detection
  const isFbVideo = /facebook\.com|fb\.watch/i.test(cleanUrl);
  if (isFbVideo) {
    const encodedFbUrl = encodeURIComponent(cleanUrl);
    const fbEmbedUrl = `https://www.facebook.com/plugins/video.php?href=${encodedFbUrl}&show_text=0&width=500`;

    return (
      <div className={`rounded-2xl overflow-hidden border border-blue-500/40 bg-slate-950 p-2 shadow-md space-y-2 ${className}`}>
        <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-bold text-blue-300">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[10px]">f</span>
            <span>Facebook Video Player</span>
          </span>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-400 hover:text-blue-200 flex items-center gap-1 underline text-[10px]"
          >
            <span>Facebook එකෙන් බලන්න</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        
        <div className="relative rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center">
          <iframe
            src={fbEmbedUrl}
            title="Facebook Video Player"
            className="w-full h-full border-0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // 6. Telegram Channel Link
  const isTelegram = /t\.me\//i.test(cleanUrl);
  if (isTelegram) {
    return (
      <div className={`rounded-2xl overflow-hidden border border-sky-500/40 bg-gradient-to-r from-sky-950/80 via-slate-950 to-sky-950/80 p-3 shadow-md space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-[11px] font-bold text-sky-300">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center font-black text-xs">✈</span>
            <span>Telegram Channel / Video Link</span>
          </span>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-xs transition-transform active:scale-95"
          >
            <span>Telegram එකෙන් විවෘත කරන්න</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <p className="text-[11px] text-sky-100 font-mono break-all bg-black/40 p-2 rounded-xl border border-sky-800/40">
          {cleanUrl}
        </p>
      </div>
    );
  }

  // 7. Standard Web Link Preview Card
  return (
    <div className={`rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 flex items-center justify-between gap-2 text-xs shadow-xs ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-300 dark:border-emerald-700/60">
          <Globe className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
            අමුණන ලද වෙබ් / වීඩියෝ ලින්ක් එක
          </span>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono truncate block">
            {cleanUrl}
          </span>
        </div>
      </div>
      <a
        href={cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] flex items-center gap-1 shrink-0 shadow-xs active:scale-95 transition-transform"
      >
        <span>විවෘත කරන්න</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
};

