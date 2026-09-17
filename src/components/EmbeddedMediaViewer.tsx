import React, { useState } from 'react';
import { Play, ExternalLink, Globe, Video, Film, Eye, Maximize2, Sparkles } from 'lucide-react';

interface EmbeddedMediaViewerProps {
  url?: string;
  className?: string;
  compact?: boolean;
}

export const EmbeddedMediaViewer: React.FC<EmbeddedMediaViewerProps> = ({
  url,
  className = '',
  compact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!url || typeof url !== 'string' || !url.trim()) {
    return null;
  }

  const cleanUrl = url.trim();

  // 1. YouTube detection
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

  // 2. Facebook Video Detection
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

  // 3. Telegram Post / Video detection
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

  // 4. Direct Video file detection (.mp4, .webm, .ogg)
  const isDirectVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(cleanUrl);
  if (isDirectVideo) {
    return (
      <div className={`rounded-2xl overflow-hidden border border-emerald-500/40 bg-black shadow-md ${className}`}>
        <video
          src={cleanUrl}
          controls
          playsInline
          className="w-full max-h-80 object-contain rounded-2xl bg-black"
        >
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // 5. Standard Web Link Preview Card
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
