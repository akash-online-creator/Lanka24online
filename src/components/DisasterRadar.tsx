import React, { useState, useEffect } from 'react';
import { 
  Radar, 
  ShieldAlert, 
  MapPin, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Radio, 
  Zap, 
  Activity,
  CheckCircle2,
  AlertOctagon,
  BatteryCharging
} from 'lucide-react';

interface DisasterRadarProps {
  userLocation: { lat: number; lng: number } | null;
  onSimulateRedAlert?: () => void;
}

export const DisasterRadar: React.FC<DisasterRadarProps> = ({ userLocation }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  const [nearbyAlertsCount, setNearbyAlertsCount] = useState(2);
  const [lastScanTime, setLastScanTime] = useState<string>('මීට මොහොතකට පෙර');
  const [isSirenActive, setIsSirenActive] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseCount(prev => (prev + 1) % 100);
      const now = new Date();
      setLastScanTime(now.toLocaleTimeString('si-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 15000); // 15-second background radar interval matching mobile foreground service
    return () => clearInterval(interval);
  }, []);

  const triggerSirenTest = () => {
    setIsSirenActive(true);
    // Web Audio API Synth Siren Sound
    try {
      if (!isMuted && typeof window !== 'undefined') {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.4);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.2);
      }
    } catch (e) {
      console.log('Audio contextual note:', e);
    }
    setTimeout(() => setIsSirenActive(false), 3000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      
      {/* Background Subtle Radar Grid */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 relative z-10 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Radar className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white font-sinhala leading-tight">
                24/7 GPS ආරක්ෂක Radar පද්ධතිය
              </h3>
              <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold rounded-md font-mono">
                LIVE 24/7
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sinhala mt-0.5">
              කිලෝමීටර් 5 සීමාව තුළ සියලුම හදිසි අනතුරු ඇඟවීම් තත්පර 15කට වරක් ස්වයංක්‍රීයව නිරීක්ෂණය වේ
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isMuted 
                ? 'bg-slate-800 border-slate-700 text-slate-400' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
            title={isMuted ? 'ශබ්දය සක්‍රීය කරන්න' : 'නිහඬ කරන්න'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="font-sinhala text-[11px]">{isMuted ? 'නිහඬයි' : 'ශබ්දය On'}</span>
          </button>

          <button
            onClick={triggerSirenTest}
            className={`px-3 py-2 rounded-xl text-xs font-bold font-sinhala transition-all flex items-center gap-1.5 shadow-md ${
              isSirenActive
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/30'
            }`}
          >
            <AlertOctagon className="w-4 h-4 text-red-400" />
            <span>Siren පරීක්ෂාව</span>
          </button>
        </div>
      </div>

      {/* Radar Visual Display & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center relative z-10">
        
        {/* Radar Circular Visual */}
        <div className="md:col-span-5 flex justify-center py-2">
          <div className="relative w-56 h-56 rounded-full border-2 border-red-500/40 bg-slate-950 flex items-center justify-center shadow-inner overflow-hidden">
            {/* Concentric distance rings */}
            <div className="absolute w-44 h-44 rounded-full border border-red-500/20" />
            <div className="absolute w-32 h-32 rounded-full border border-red-500/30" />
            <div className="absolute w-16 h-16 rounded-full border border-red-500/40" />

            {/* Sweep Line */}
            <div 
              className="absolute inset-0 bg-gradient-to-tr from-red-500/20 via-transparent to-transparent rounded-full animate-spin"
              style={{ animationDuration: '4s' }}
            />

            {/* Center GPS Dot */}
            <div className="relative z-10 w-5 h-5 rounded-full bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            </div>

            {/* Simulated Nearby Blips */}
            <div className="absolute top-12 right-14 w-3.5 h-3.5 rounded-full bg-red-500 border border-white animate-ping" />
            <div className="absolute bottom-14 left-16 w-3 h-3 rounded-full bg-amber-400 border border-white" />

            {/* Range markers */}
            <span className="absolute bottom-1 right-2 text-[9px] font-mono text-red-400/80 font-bold">5 KM RADAR</span>
            <span className="absolute top-1 left-2 text-[9px] font-mono text-emerald-400/80 font-bold">GPS AUTO-SYNC</span>
          </div>
        </div>

        {/* Foreground Service 24/7 Status Cards */}
        <div className="md:col-span-7 space-y-3">
          
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-sinhala">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>වත්මන් පිහිටීම</span>
              </div>
              <div className="text-sm font-bold text-white font-sinhala mt-1">
                {userLocation ? `${userLocation.lat.toFixed(4)}° N, ${userLocation.lng.toFixed(4)}° E` : 'කොළඹ / බස්නාහිර (GPS)'}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">± 4.8m නිරවද්‍යතාවය</div>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-sinhala">
                <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
                <span>බැටරි ප්‍රශස්තිකරණය</span>
              </div>
              <div className="text-sm font-bold text-emerald-400 font-sinhala mt-1">
                Exempted (24/7 Active)
              </div>
              <div className="text-[10px] text-slate-400 font-sinhala mt-0.5">Doze Mode මගින් නතර නොවේ</div>
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-r from-red-950/40 via-slate-950 to-slate-950 border border-red-900/40 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-bold text-white font-sinhala">
                  කිලෝමීටර් 5 සීමාවේ ක්‍රියාකාරී ඇඟවීම් ({nearbyAlertsCount})
                </div>
                <div className="text-[11px] text-slate-400 font-sinhala">
                  අවසන් ස්කෑන් කිරීම: <span className="font-mono text-slate-300">{lastScanTime}</span>
                </div>
              </div>
            </div>

            <span className="px-3 py-1 bg-red-600/20 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold font-mono">
              2 Active
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
