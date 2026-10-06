import React, { useState } from 'react';
import { 
  Radio, 
  Flame, 
  Waves, 
  Wind, 
  AlertTriangle, 
  ShieldAlert, 
  X, 
  BatteryWarning, 
  CheckCircle2,
  FileEdit,
  Loader2
} from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { createRedAlertInFirestore } from '../lib/firebase';
import { resolveExactLocation } from '../utils/geoUtils';
import { startEmergencySiren } from '../utils/sirenAudio';
import { triggerBrowserNotification } from '../utils/notificationManager';
import { RedAlertDisasterType, LocationOption } from '../types';

interface RedAlertFloatingTriggerProps {
  userId: string;
  userName?: string;
  currentLocation?: LocationOption;
  activeCount?: number;
  onOpenActiveList?: () => void;
  onOpenSosTracker?: () => void;
  onOpenCreateModal?: () => void;
  onRequestIgnoreBattery?: () => void;
}

export const RedAlertFloatingTrigger: React.FC<RedAlertFloatingTriggerProps> = ({
  userId,
  userName = 'වාර්තාකරු',
  currentLocation,
  activeCount = 0,
  onOpenActiveList,
  onOpenSosTracker,
  onOpenCreateModal,
  onRequestIgnoreBattery,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<{ key: RedAlertDisasterType; label: string; en: string }>({
    key: 'fire',
    label: 'හදිසි ගින්නක් (Fire)',
    en: 'Fire Emergency'
  });
  const [description, setDescription] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  // 1. හදිසි ආපදා වාර්තාවක් ක්ෂණිකව Firestore වෙත යැවීම
  const handleTriggerAlert = async () => {
    try {
      setLoading(true);
      setBroadcastStatus(null);

      let latitude = currentLocation?.lat || 6.9271;
      let longitude = currentLocation?.lng || 79.8612;
      let locName = currentLocation?.nameSi || 'ශ්‍රී ලංකාව';

      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000,
        });
        if (position?.coords) {
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        }
      } catch {
        if (navigator.geolocation) {
          try {
            await new Promise<void>((res) => {
              navigator.geolocation.getCurrentPosition(
                (p) => {
                  latitude = p.coords.latitude;
                  longitude = p.coords.longitude;
                  res();
                },
                () => res(),
                { enableHighAccuracy: true, timeout: 5000 }
              );
            });
          } catch {}
        }
      }

      try {
        const resolved = await resolveExactLocation(latitude, longitude);
        if (resolved?.shortDisplaySi) {
          locName = resolved.shortDisplaySi;
        }
      } catch {}

      const now = new Date();
      const newAlertId = await createRedAlertInFirestore({
        alertCode: `#RED-${Math.floor(1000 + Math.random() * 9000)}`,
        disasterType: selectedType.key,
        customDisasterTitle: selectedType.label,
        disasterTitleSi: selectedType.label,
        disasterTitleEn: selectedType.en,
        disasterTitleTa: selectedType.label,
        description: description || '🚨 ක්ෂණික රතු එළිය අනතුරු ඇඟවීමකි. ප්‍රවේසම් වන්න, ආරක්ෂිත ස්ථාන කරා යොමුවන්න.',
        latitude,
        longitude,
        locationName: locName,
        locationAccuracyMeters: 15,
        incidentDate: now.toISOString().split('T')[0],
        incidentTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString(),
        createdAtMs: Date.now(),
        reportedByUserId: userId,
        reportedByName: userName || 'හදිසි දැනුම්දෙන්නා',
        reportedByPhone: '',
        status: 'active',
        severity: 'critical',
        comments: [],
        fakeReports: [],
        isFlaggedFake: false,
      });

      // Start audio alert
      startEmergencySiren();

      triggerBrowserNotification({
        id: `alert-${Date.now()}`,
        type: 'emergency_blood',
        title: `🚨 රතු එළිය අනතුරු ඇඟවීම: ${selectedType.label}`,
        message: `${locName} ප්‍රදේශයේ අනතුරු ඇඟවීමක් නිකුත් කෙරිණි.`,
        timestamp: now.toISOString(),
        isRead: false,
        badgeText: 'SOS',
      });

      setBroadcastStatus(`සාර්ථකයි! කි.මී. 5 ඇතුළත සියලු පරිශීලකයින්ට සහ පද්ධතියට සයිරන් අනතුරු ඇඟවීම නිකුත් කරන ලදී.`);
      setTimeout(() => {
        setIsModalOpen(false);
        setBroadcastStatus(null);
        setDescription('');
      }, 3000);
    } catch (error) {
      console.error('Trigger Alert Error:', error);
      alert('අනතුරු ඇඟවීම යැවීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <aside
        aria-label="හදිසි ආපදා ක්‍රියාකාරී බොත්තම්"
        className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2"
      >
        {/* SOS Live GPS Tracker */}
        {onOpenSosTracker && (
          <button
            type="button"
            onClick={onOpenSosTracker}
            className="flex items-center gap-1.5 px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-xs shadow-lg border border-red-300 hover:shadow-red-500/40 active:scale-95 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            title="SOS Live GPS Tracker"
            aria-label="SOS Live GPS Tracker"
          >
            <Radio className="w-3.5 h-3.5 text-white animate-pulse" aria-hidden="true" />
            <span className="font-mono font-black">SOS LIVE</span>
          </button>
        )}

        {/* ක්‍රියාකාරී ආපදා සංඛ්‍යාව පෙන්වන බොත්තම */}
        {activeCount > 0 && onOpenActiveList && (
          <button
            type="button"
            onClick={onOpenActiveList}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/80 hover:bg-black text-white text-xs font-black border border-red-500/50 shadow-lg backdrop-blur-md cursor-pointer active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            aria-label={`ක්‍රියාකාරී ආපදා: ${activeCount} ක් පවතී`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" aria-hidden="true" />
            <span>ක්‍රියාකාරී ආපදා ({activeCount})</span>
          </button>
        )}

        {/* ප්‍රධාන 1-Tap රතු එළිය Trigger බොත්තම */}
        <button
          type="button"
          onClick={() => {
            if (onOpenCreateModal) {
              onOpenCreateModal();
            } else {
              setIsModalOpen(true);
            }
          }}
          className="group relative flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-black text-xs sm:text-sm tracking-wide shadow-[0_0_30px_rgba(239,68,68,0.7)] hover:shadow-[0_0_40px_rgba(239,68,68,0.9)] hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          title="රතු එළිය - හදිසි ආපදා ක්ෂණිකව දැනුම්දෙන්න"
          aria-label="රතු එළිය - හදිසි ආපදා ක්ෂණිකව දැනුම්දෙන්න"
        >
          {/* Animated Pulsing Rings */}
          <span className="absolute -inset-1 rounded-full bg-red-500/40 animate-ping pointer-events-none" aria-hidden="true" />
          <span className="absolute -inset-2 rounded-full bg-rose-500/20 animate-pulse pointer-events-none" aria-hidden="true" />

          <span className="relative flex items-center justify-center text-lg sm:text-xl" role="img" aria-label="Siren icon">
            🚨
          </span>
          <div className="flex flex-col items-start leading-none relative z-10">
            <span className="font-black drop-shadow-sm">රතු එළිය</span>
            <span className="text-[9px] text-red-100 font-bold uppercase tracking-wider">
              RED ALERT
            </span>
          </div>

          {activeCount > 0 && (
            <span 
              className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-red-700 text-[10px] font-black shadow-sm"
              aria-hidden="true"
            >
              {activeCount}
            </span>
          )}
        </button>
      </aside>

      {/* හදිසි අනතුරු ඇඟවීමේ ක්‍රියාකාරී පැනලය (Modal) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border-2 border-red-600 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-[0_0_50px_rgba(220,38,38,0.3)] relative text-white">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900 border border-zinc-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* මාතෘකාව */}
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <div className="p-2.5 rounded-2xl bg-red-950/80 border border-red-600/40">
                <ShieldAlert className="w-7 h-7 text-red-500 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-lg text-white">රතු එළිය - අනතුරු ඇඟවීම</h3>
                <p className="text-xs text-red-300/80">කි.මී. 5 වපසරියක සිටින සියලුම දෙනාට සයිරන් නාද වේ</p>
              </div>
            </div>

            {/* Battery Optimization Notification Suggestion */}
            {onRequestIgnoreBattery && (
              <div className="mb-4 p-2.5 rounded-xl bg-amber-950/40 border border-amber-600/30 flex items-center justify-between text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <BatteryWarning className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>බැටරි සීමා ඉවත් කර Background Alert තහවුරු කරන්න.</span>
                </div>
                <button
                  type="button"
                  onClick={onRequestIgnoreBattery}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-black font-black rounded text-[10px] shrink-0 transition-colors"
                >
                  සකසන්න
                </button>
              </div>
            )}

            {broadcastStatus ? (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-bounce" />
                <p className="text-sm font-bold text-emerald-400">{broadcastStatus}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-300 font-bold mb-2 block">
                    ආපදා වර්ගය තෝරන්න:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'fire' as RedAlertDisasterType, label: 'හදිසි ගින්නක් (Fire)', en: 'Fire Emergency', icon: Flame },
                      { key: 'flood' as RedAlertDisasterType, label: 'ජලගැලීම (Flood)', en: 'Flood Emergency', icon: Waves },
                      { key: 'storm' as RedAlertDisasterType, label: 'සුළි සුළඟ (Storm)', en: 'Storm Alert', icon: Wind },
                      { key: 'other' as RedAlertDisasterType, label: 'වෙනත් අනතුරක්', en: 'Other Emergency', icon: AlertTriangle },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setSelectedType({ key: item.key, label: item.label, en: item.en })}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                          selectedType.key === item.key
                            ? 'border-red-500 bg-red-950/80 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <item.icon className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-300 font-bold mb-1 block">
                    කෙටි විස්තරය (විකල්ප):
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="උදා: ගංවතුර මට්ටම ඉහළ යමින් පවතී, ප්‍රධාන පාර අවහිරයි..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleTriggerAlert}
                    className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wide hover:shadow-[0_0_25px_rgba(239,68,68,0.8)] active:scale-98 transition-all disabled:opacity-50 cursor-pointer text-white flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>සම්බන්ධ වෙමින් පවතී...</span>
                      </>
                    ) : (
                      <span>🚨 සයිරන් අනතුරු ඇඟවීම වහාම නිකුත් කරන්න</span>
                    )}
                  </button>

                  {onOpenCreateModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        onOpenCreateModal();
                      }}
                      className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-red-400" />
                      <span>සවිස්තරාත්මක වාර්තාවක් / හඬ පණිවිඩයක් සමඟ පළකරන්න</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

