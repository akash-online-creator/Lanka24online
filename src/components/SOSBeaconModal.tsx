import React, { useState } from 'react';
import { X, AlertOctagon, Radio, MapPin, Send, Phone, Volume2, ShieldAlert } from 'lucide-react';

interface SOSBeaconModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
}

export const SOSBeaconModal: React.FC<SOSBeaconModalProps> = ({
  isOpen,
  onClose,
  userLocation
}) => {
  const [sosType, setSosType] = useState<'flood' | 'medical' | 'fire' | 'accident'>('flood');
  const [peopleCount, setPeopleCount] = useState('1');
  const [note, setNote] = useState('');
  const [isTriggered, setIsTriggered] = useState(false);

  if (!isOpen) return null;

  const handleActivateSOS = () => {
    setIsTriggered(true);
    setTimeout(() => {
      // simulate broadcast
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-red-600 rounded-3xl p-6 shadow-2xl shadow-red-950/80 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {!isTriggered ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-500 mx-auto shadow-lg shadow-red-900/50 animate-bounce">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white font-sinhala">
                🚨 හදිසි SOS අනතුරු ඇඟවීම (Instant Beacon)
              </h3>
              <p className="text-xs text-slate-300 font-sinhala mt-1">
                ඔබගේ වත්මන් GPS ස්ථානය සහ විස්තර කිලෝමීටර් 5 සීමාවේ සිටින ස්වේච්ඡා සාමාජිකයින්ට හා සහන කණ්ඩායම් වලට විකාශනය වේ
              </p>
            </div>

            <div className="text-left space-y-2">
              <label className="text-xs font-semibold text-slate-300 font-sinhala">
                හදිසි තත්වයේ ස්වභාවය:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'flood', label: '🌊 ගංවතුර / සිරවීම' },
                  { id: 'medical', label: '🏥 හදිසි වෛද්‍ය' },
                  { id: 'fire', label: '🔥 ගිනිගැනීම' },
                  { id: 'accident', label: '💥 රිය අනතුර' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSosType(item.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold font-sinhala transition-all ${
                      sosType === item.id 
                        ? 'bg-red-600 border-red-500 text-white shadow-md' 
                        : 'bg-slate-800/80 border-slate-700 text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-left">
              <label className="text-xs font-semibold text-slate-300 font-sinhala block mb-1">
                අමතර විස්තර / නිවස අංකය:
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="උදා: වහලය මත පුද්ගලයින් 3ක් සිරවී ඇත"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-sinhala"
              />
            </div>

            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-2xl flex items-center gap-2 text-left">
              <MapPin className="w-4 h-4 text-red-400 shrink-0" />
              <div className="text-[11px] text-slate-300 font-sinhala">
                GPS ස්ථානය: <span className="text-white font-mono">{userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'ස්ථානය ලබා ගනිමින්...'}</span>
              </div>
            </div>

            <button
              onClick={handleActivateSOS}
              className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm font-sinhala shadow-xl shadow-red-950 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Radio className="w-5 h-5 animate-pulse" />
              <span>SOS අනතුරු ඇඟවීම විකාශනය කරන්න</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-600/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto">
              <Radio className="w-8 h-8 animate-ping" />
            </div>

            <h3 className="text-lg font-bold text-white font-sinhala">
              SOS සංඥාව සාර්ථකව විකාශනය විය!
            </h3>
            <p className="text-xs text-slate-300 font-sinhala">
              ආසන්නයේ සිටින ස්වේච්ඡා සාමාජිකයින් 14 දෙනෙකුට සහ ගලවාගැනීමේ ඒකක වලට ඔබගේ GPS ස්ථානය ලැබී ඇත.
            </p>

            <div className="pt-2">
              <a
                href="tel:119"
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-sinhala flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>119 පොලිස් හදිසි අංශය අමතන්න</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
