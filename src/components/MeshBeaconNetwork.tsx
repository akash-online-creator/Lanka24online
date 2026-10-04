import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Bluetooth, 
  Wifi, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  PhoneCall, 
  Activity, 
  Users, 
  MapPin, 
  CheckCircle2, 
  Flame, 
  HeartPulse, 
  Car, 
  Waves,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Share2
} from 'lucide-react';

interface ResponderNode {
  id: string;
  name: string;
  role: string;
  distance: string;
  signalType: 'BLE Mesh' | 'GPS Direct' | 'Wi-Fi P2P';
  status: 'idle' | 'notified' | 'responding' | 'arrived';
  etaMinutes: number;
  avatarBg: string;
}

export const MeshBeaconNetwork: React.FC = () => {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastType, setBroadcastType] = useState<'accident' | 'cardiac' | 'flood' | 'fire'>('accident');
  const [broadcastStep, setBroadcastStep] = useState(0);
  const [networkHops, setNetworkHops] = useState(0);
  const [acknowledgedCount, setAcknowledgedCount] = useState(0);

  const [responders, setResponders] = useState<ResponderNode[]>([
    {
      id: 'resp_1',
      name: 'කසුන් පෙරේරා (CPR පුහුණු)',
      role: 'ප්‍රථමාධාර ස්වේච්ඡා සාමාජික',
      distance: '180m',
      signalType: 'BLE Mesh',
      status: 'idle',
      etaMinutes: 2,
      avatarBg: 'from-emerald-500 to-teal-700'
    },
    {
      id: 'resp_2',
      name: '1990 සුවසැරිය (Ambulance 04)',
      role: 'හදිසි ගිලන්රථ සේවය',
      distance: '1.4km',
      signalType: 'GPS Direct',
      status: 'idle',
      etaMinutes: 6,
      avatarBg: 'from-blue-600 to-indigo-800'
    },
    {
      id: 'resp_3',
      name: 'වෛද්‍ය නිමල් සේනානායක',
      role: 'ළඟම සිටින වෛද්‍ය නිලධාරී',
      distance: '650m',
      signalType: 'Wi-Fi P2P',
      status: 'idle',
      etaMinutes: 4,
      avatarBg: 'from-purple-600 to-pink-700'
    },
    {
      id: 'resp_4',
      name: 'ස්වේච්ඡා ගලවාගැනීමේ කණ්ඩායම (කඩුවෙල)',
      role: 'ආපදා සහන බළකාය',
      distance: '2.1km',
      signalType: 'BLE Mesh',
      status: 'idle',
      etaMinutes: 8,
      avatarBg: 'from-amber-500 to-orange-700'
    }
  ]);

  // Handle broadcast simulation steps
  const triggerBroadcast = (type: 'accident' | 'cardiac' | 'flood' | 'fire') => {
    setBroadcastType(type);
    setIsBroadcasting(true);
    setBroadcastStep(1);
    setNetworkHops(1);
    setAcknowledgedCount(0);

    // Reset responders
    setResponders(prev => prev.map(r => ({ ...r, status: 'idle' })));

    // Step 1: BLE Signal sends out to immediate 200m
    setTimeout(() => {
      setBroadcastStep(2);
      setNetworkHops(2);
      setResponders(prev => prev.map((r, i) => i === 0 ? { ...r, status: 'notified' } : r));
      setAcknowledgedCount(1);
    }, 1200);

    // Step 2: Mesh relays to next nodes & doctors
    setTimeout(() => {
      setBroadcastStep(3);
      setNetworkHops(4);
      setResponders(prev => prev.map((r, i) => (i === 0 || i === 2) ? { ...r, status: 'responding' } : (i === 1 ? { ...r, status: 'notified' } : r)));
      setAcknowledgedCount(3);
    }, 2600);

    // Step 3: Full 1990 and rescue dispatch locked in
    setTimeout(() => {
      setBroadcastStep(4);
      setNetworkHops(8);
      setResponders(prev => prev.map(r => ({ ...r, status: 'responding' })));
      setAcknowledgedCount(4);
    }, 4200);
  };

  const resetBroadcast = () => {
    setIsBroadcasting(false);
    setBroadcastStep(0);
    setNetworkHops(0);
    setAcknowledgedCount(0);
    setResponders(prev => prev.map(r => ({ ...r, status: 'idle' })));
  };

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-7 shadow-2xl space-y-6">
      
      {/* Header & Concept intro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold font-sinhala">
            <Bluetooth className="w-3.5 h-3.5 animate-pulse text-blue-400" />
            <span>Google Find Hub / BLE Mesh තාක්ෂණික විසඳුම</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white font-sinhala flex items-center gap-2">
            <span>සමීපස්ථ දැල් ජාල අනතුරු හා ඉක්මන් සේවා හුවමාරුව</span>
            <span className="text-xs font-normal text-amber-400 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              Mesh Beacon Relay
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 font-sinhala leading-relaxed">
            Google Find My Device ජාලය මෙන්, සිග්නල් නොමැති (Offline) අවස්ථාවකදී පවා ආසන්න දුරකථන හරහා 
            අනතුරු හා හදිසි ආධාර සංඥා (Mesh Beaconing) ස්වයංක්‍රීයව සම්ප්‍රේෂණය කිරීමේ ක්‍රමවේදය.
          </p>
        </div>

        {/* Live System Specs */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 shrink-0">
          <div className="text-center">
            <span className="text-[10px] text-slate-500 block font-sinhala">සම්ප්‍රේෂණ ක්‍රමය</span>
            <span className="text-xs font-bold text-blue-400 flex items-center justify-center gap-1">
              <Radio className="w-3 h-3 text-blue-400" /> BLE + Wi-Fi Direct
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div className="text-center">
            <span className="text-[10px] text-slate-500 block font-sinhala">ප්‍රතිචාර කාලය</span>
            <span className="text-xs font-bold text-emerald-400">&lt; 3 තත්පර</span>
          </div>
        </div>
      </div>

      {/* 4 Core Technology Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-all">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Bluetooth className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white font-sinhala">1. නොබැඳි BLE Beacon</h4>
          <p className="text-[11px] text-slate-400 font-sinhala leading-relaxed">
            දුරකථන කුලුනු හෝ Internet නැතත්, 100m-300m දුර ඇති දුරකථන වලට Background Beacon යවයි.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-all">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white font-sinhala">2. Peer-to-Peer Multi-Hop</h4>
          <p className="text-[11px] text-slate-400 font-sinhala leading-relaxed">
            එක් දුරකථනයකින් තවෙකකට සංඥාව දාමයක් ලෙස (Mesh Relay) ගමන් කර කිලෝමීටර් ගණනක් ආවරණය කරයි.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-all">
          <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white font-sinhala">3. හදිසි අනතුරු සයිරන්</h4>
          <p className="text-[11px] text-slate-400 font-sinhala leading-relaxed">
            ලියාපදිංචි ප්‍රථමාධාරකරුවන් සහ 1990 රියදුරන්ගේ දුරකථන Silent කර තිබුණද හදිසි ඇඟවීම් නාද කරයි.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-all">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white font-sinhala">4. සංකේතනය සහ ආරක්ෂාව</h4>
          <p className="text-[11px] text-slate-400 font-sinhala leading-relaxed">
            තහවුරු කළ NIC ලියාපදිංචිය සහිත සාමාජිකයින්ට පමණක් රෝගියාගේ GPS හා සෞඛ්‍ය තොරතුරු විවෘත වේ.
          </p>
        </div>
      </div>

      {/* Interactive Simulation Dashboard */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-blue-900/40 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-white font-sinhala flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>සජීවී ආදර්ශනය (Live Mesh Emergency Broadcast Simulator)</span>
            </h4>
            <p className="text-xs text-slate-400 font-sinhala">
              පහතින් හදිසි අවස්ථාවක් තෝරා ක්ෂණික සමීපස්ථ දැල් සම්ප්‍රේෂණය ක්‍රියාත්මක කර බලන්න:
            </p>
          </div>

          {isBroadcasting && (
            <button
              onClick={resetBroadcast}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-sinhala flex items-center gap-1.5 self-start sm:self-auto border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>නැවත සකසන්න (Reset)</span>
            </button>
          )}
        </div>

        {/* Emergency Trigger Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => triggerBroadcast('accident')}
            className={`p-3 rounded-xl border text-left transition-all font-sinhala flex flex-col gap-1.5 ${
              isBroadcasting && broadcastType === 'accident'
                ? 'bg-red-600/30 border-red-500 text-white shadow-lg shadow-red-950/50'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <Car className="w-5 h-5 text-red-400" />
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 font-sans font-bold">119 / 1990</span>
            </div>
            <span className="text-xs font-bold">🚗 මාර්ග අනතුරක්</span>
            <span className="text-[10px] text-slate-400">වාහන අනතුරු / ක්ෂණික CPR</span>
          </button>

          <button
            onClick={() => triggerBroadcast('cardiac')}
            className={`p-3 rounded-xl border text-left transition-all font-sinhala flex flex-col gap-1.5 ${
              isBroadcasting && broadcastType === 'cardiac'
                ? 'bg-rose-600/30 border-rose-500 text-white shadow-lg shadow-rose-950/50'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <HeartPulse className="w-5 h-5 text-rose-400" />
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-sans font-bold">CPR / AED</span>
            </div>
            <span className="text-xs font-bold">❤️ හදිසි හෘදයාබාධයක්</span>
            <span className="text-[10px] text-slate-400">CPR පළමු සහන සේවකයින්</span>
          </button>

          <button
            onClick={() => triggerBroadcast('flood')}
            className={`p-3 rounded-xl border text-left transition-all font-sinhala flex flex-col gap-1.5 ${
              isBroadcasting && broadcastType === 'flood'
                ? 'bg-cyan-600/30 border-cyan-500 text-white shadow-lg shadow-cyan-950/50'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <Waves className="w-5 h-5 text-cyan-400" />
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-sans font-bold">Rescue</span>
            </div>
            <span className="text-xs font-bold">🌊 ගංවතුරින් සිරවීම</span>
            <span className="text-[10px] text-slate-400">බෝට්ටු සහන හා ගලවාගැනීම්</span>
          </button>

          <button
            onClick={() => triggerBroadcast('fire')}
            className={`p-3 rounded-xl border text-left transition-all font-sinhala flex flex-col gap-1.5 ${
              isBroadcasting && broadcastType === 'fire'
                ? 'bg-amber-600/30 border-amber-500 text-white shadow-lg shadow-amber-950/50'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <Flame className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-sans font-bold">110 Fire</span>
            </div>
            <span className="text-xs font-bold">🔥 හදිසි ගිනිගැනීමක්</span>
            <span className="text-[10px] text-slate-400">ගිනි නිවන හා ප්‍රදේශවාසීන්</span>
          </button>
        </div>

        {/* Live Ripple & Hop Visualizer */}
        {isBroadcasting && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-sinhala">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-400 animate-spin" />
                  <span>සජීවී දැල් තරංග ප්‍රසාරණය (Mesh Signal Ripple):</span>
                </span>
                <span className="font-bold text-amber-400">
                  {broadcastStep === 1 && '1. නොබැඳි BLE Beacon විකාශනය...'}
                  {broadcastStep === 2 && '2. 180m දුරින් පළමු දුරකථනය සම්බන්ධ විය'}
                  {broadcastStep === 3 && '3. Mesh Relay මඟින් වෛද්‍යවරුන් හා 1990 වෙත'}
                  {broadcastStep >= 4 && '4. පූර්ණ සහන ජාලය ක්ෂණිකව සක්‍රීයයි!'}
                </span>
              </div>

              {/* Progress visual bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 transition-all duration-700"
                  style={{ width: `${(broadcastStep / 4) * 100}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block font-sinhala">සම්බන්ධිත Relay Hops</span>
                  <span className="text-base font-black text-blue-400">{networkHops} Nodes</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block font-sinhala">ප්‍රතිචාර දැක්වූවන්</span>
                  <span className="text-base font-black text-emerald-400">{acknowledgedCount} / 4</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block font-sinhala">ආවරණ දුර (Radius)</span>
                  <span className="text-base font-black text-amber-400">2.5 km</span>
                </div>
              </div>
            </div>

            {/* List of Detected & Dispatched Nearby Responders */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-300 font-sinhala flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>ආසන්නයේ ප්‍රතිචාර දක්වන ස්වේච්ඡා හා හදිසි සේවා ඒකක:</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {responders.map((resp) => (
                  <div 
                    key={resp.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      resp.status === 'responding' 
                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm'
                        : resp.status === 'notified'
                        ? 'bg-blue-950/30 border-blue-500/40'
                        : 'bg-slate-950/60 border-slate-800/80 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${resp.avatarBg} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md`}>
                        {resp.name.charAt(0)}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white font-sinhala">{resp.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-sans">
                            {resp.signalType}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block font-sinhala">{resp.role}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="text-blue-400 font-bold">📍 {resp.distance} ඈතින්</span>
                          <span>•</span>
                          <span className="text-amber-300">⏱️ පැමිණීමේ කාලය: විනාඩි {resp.etaMinutes}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {resp.status === 'responding' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 font-sinhala animate-pulse">
                          <CheckCircle2 className="w-3 h-3" /> පැමිණෙමින්
                        </span>
                      )}
                      {resp.status === 'notified' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 px-2 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 font-sinhala">
                          <Activity className="w-3 h-3" /> දැනුවත් විය
                        </span>
                      )}
                      {resp.status === 'idle' && (
                        <span className="text-[10px] text-slate-500 font-sinhala">
                          සම්බන්ධ වෙමින්...
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Practical Use-Case Applications for Sri Lanka */}
      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-bold text-white font-sinhala flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>මෙම ක්‍රමය අපගේ ඇප් එකට යෙදිය හැකි ප්‍රධාන ක්ෂේත්‍ර (Key Use Cases):</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs font-sinhala">
              <Car className="w-4 h-4" />
              <span>1. මාර්ග අනතුරු (Road Accidents)</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sinhala leading-relaxed">
              අධිවේගී මාර්ගයේ හෝ දුරබැහැර ප්‍රදේශයක අනතුරක් වූ විට, තත්පර කිහිපයක් තුළ ආසන්නයේ ගමන් කරන වෛද්‍යවරුන්ට, 1990 සුවසැරියට හා පොලිසියට GPS ස්ථානය සමග ක්ෂණික විකාශනය වීම.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs font-sinhala">
              <HeartPulse className="w-4 h-4" />
              <span>2. හදිසි රුධිර හා CPR අවශ්‍යතා</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sinhala leading-relaxed">
              දුර්ලභ ලේ වර්ගයක් (O-, AB-) හෝ හදිසි CPR අවශ්‍ය වූ විට, රෝහල වටා 3km දුරින් සිටින ලියාපදිංචි පරිත්‍යාගශීලීන්ගේ දුරකථන වලට ප්‍රමුඛතා දැනුම්දීමක් (Priority Alert) යැවීම.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs font-sinhala">
              <Waves className="w-4 h-4" />
              <span>3. ගංවතුර/නායයෑම් ආපදා (Offline SOS)</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sinhala leading-relaxed">
              විදුලිබලය හා සන්නිවේදන කුලුනු බිඳවැටුණු විටත්, දුරකථනයෙන් දුරකථනයට පනින Bluetooth Mesh මඟින් සිරවී සිටින පුද්ගලයින් සිටින ස්ථානය ගලවාගැනීමේ බෝට්ටු වෙත සම්ප්‍රේෂණය කිරීම.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
