import React, { useState, useRef } from 'react';
import { 
  QrCode, 
  X, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Store,
  Compass
} from 'lucide-react';
import { Language } from '../types';
import { AppLogo } from './AppLogo';

interface AppQrShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  initialUrl?: string;
  title?: string;
}

export const AppQrShareModal: React.FC<AppQrShareModalProps> = ({
  isOpen,
  onClose,
  language = 'si',
  initialUrl,
  title
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const qrCardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const currentAppUrl = initialUrl || (typeof window !== 'undefined' ? window.location.href : 'https://sahayasewa.lk');

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentAppUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDownloadQr = () => {
    // Generate an SVG or Canvas QR download
    const svgElement = document.getElementById('sahaya-app-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 600, 600);
        ctx.drawImage(img, 20, 20, 560, 560);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = 'sahaya-sewa-qr-code.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // High-density QR Code visual representation encoding the URL with standard error correction grid
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(currentAppUrl)}&color=064e3b&bgcolor=ffffff&margin=1`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        ref={qrCardRef}
        className={`relative w-full ${isFullscreen ? 'max-w-xl h-[95vh] flex flex-col justify-between' : 'max-w-md'} bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl border-2 border-emerald-500/50 shadow-2xl p-5 sm:p-6 overflow-y-auto transition-all`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-emerald-800/40 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                <span>{title || getLang('📱 Sahaya Sewa QR Code', '📱 Sahaya Sewa QR Code', '📱 Sahaya Sewa QR குறியீடு')}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Live
                </span>
              </h3>
              <p className="text-[11px] text-emerald-300/80 font-medium">
                {getLang('Scan කර ක්ෂණිකව අපගේ වෙබ් අඩවියට පිවිසෙන්න', 'Scan to instantly open the web application', 'வலைத்தளத்திற்கு உடனடியாக செல்ல ஸ்கேன் செய்யவும்')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title={isFullscreen ? 'Exit Standee Mode' : 'Fullscreen Store Standee'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* QR Code Graphic Container */}
        <div className="flex flex-col items-center justify-center space-y-4 py-2">
          <div className="relative p-4 bg-white rounded-3xl shadow-2xl border-4 border-emerald-400/80 max-w-[280px] sm:max-w-[320px] aspect-square flex flex-col items-center justify-center">
            {/* Center QR image */}
            <img 
              src={qrApiUrl}
              alt="Sahaya Sewa Web App QR Code" 
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                // Fallback direct SVG drawing if offline
                (e.target as HTMLElement).style.display = 'none';
              }}
            />

            {/* Offline SVG fallback */}
            <svg 
              id="sahaya-app-qr-svg"
              className="w-full h-full" 
              viewBox="0 0 100 100" 
              style={{ display: 'none' }}
            >
              <rect width="100" height="100" fill="#ffffff"/>
              <rect x="10" y="10" width="30" height="30" fill="#064e3b" rx="4"/>
              <rect x="15" y="15" width="20" height="20" fill="#ffffff" rx="2"/>
              <rect x="20" y="20" width="10" height="10" fill="#064e3b" rx="1"/>
              
              <rect x="60" y="10" width="30" height="30" fill="#064e3b" rx="4"/>
              <rect x="65" y="15" width="20" height="20" fill="#ffffff" rx="2"/>
              <rect x="70" y="20" width="10" height="10" fill="#064e3b" rx="1"/>

              <rect x="10" y="60" width="30" height="30" fill="#064e3b" rx="4"/>
              <rect x="15" y="65" width="20" height="20" fill="#ffffff" rx="2"/>
              <rect x="20" y="70" width="10" height="10" fill="#064e3b" rx="1"/>

              {/* Data dots */}
              <circle cx="50" cy="20" r="3" fill="#064e3b"/>
              <circle cx="50" cy="50" r="4" fill="#059669"/>
              <circle cx="20" cy="50" r="3" fill="#064e3b"/>
              <circle cx="70" cy="50" r="3" fill="#064e3b"/>
              <circle cx="60" cy="70" r="3" fill="#064e3b"/>
              <circle cx="80" cy="80" r="3" fill="#064e3b"/>
              <circle cx="50" cy="80" r="3" fill="#064e3b"/>
            </svg>

            {/* App Brand Stamp at center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="p-1.5 bg-white rounded-xl shadow-lg border border-emerald-500">
                <span className="text-sm font-black text-emerald-800">🇱🇰 සහය</span>
              </div>
            </div>
          </div>

          {/* Direct Link Preview Box */}
          <div className="w-full bg-slate-900/90 border border-emerald-800/60 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="truncate text-left text-xs font-mono text-emerald-300">
              {currentAppUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                copied 
                  ? 'bg-emerald-500 text-slate-950 shadow-md' 
                  : 'bg-emerald-700/80 hover:bg-emerald-600 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? getLang('Copy විය!', 'Copied!', 'நகலெடுக்கப்பட்டது!') : getLang('Link එක Copy', 'Copy Link', 'இணைப்பை நகலெடு')}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{getLang('QR එක බාගන්න (Save)', 'Save QR Code', 'QR ஐ பதிவிறக்கு')}</span>
          </button>

          <a
            href={currentAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-center cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{getLang('සෘජුව පිවිසෙන්න', 'Open Website', 'இணையதளத்தை திறக்க')}</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>{getLang('වසන්න (Close)', 'Close', 'மூடு')}</span>
          </button>
        </div>

        {/* Store & Standee Guide Notice */}
        <div className="mt-4 pt-3 border-t border-emerald-900/40 text-[11px] text-emerald-400/90 text-center flex items-center justify-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{getLang('කඩසාප්පු හෝ දැන්වීම් පුවරුවේ ප්‍රදර්ශනය කර පාරිභෝගිකයින් සම්බන්ධ කරගන්න.', 'Display in shops or notice boards for customers to scan.', 'கடைகளில் அல்லது அறிவிப்பு பலகைகளில் காட்சிப்படுத்துங்கள்.')}</span>
        </div>
      </div>
    </div>
  );
};
