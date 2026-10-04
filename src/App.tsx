import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  UserPlus, 
  Radio, 
  Phone, 
  MapPin, 
  ListFilter, 
  PlusCircle, 
  AlertOctagon, 
  HeartHandshake, 
  CheckCircle2, 
  HelpCircle,
  Menu,
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { DisasterRadar } from './components/DisasterRadar';
import { LiveBulletin } from './components/LiveBulletin';
import { EmergencyDirectory } from './components/EmergencyDirectory';
import { MeshBeaconNetwork } from './components/MeshBeaconNetwork';
import { RegistrationModal } from './components/RegistrationModal';
import { CreateBulletinModal } from './components/CreateBulletinModal';
import { SOSBeaconModal } from './components/SOSBeaconModal';
import { BulletinPost, UserRegistration } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'bulletin' | 'radar' | 'mesh' | 'directory'>('all');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isCreateBulletinOpen, setIsCreateBulletinOpen] = useState(false);
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<UserRegistration | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initial Sample Bulletins
  const [bulletinPosts, setBulletinPosts] = useState<BulletinPost[]>([
    {
      id: 'post_1',
      title: 'කඩුවෙල වැලිවිට ප්‍රදේශයේ නිවාස 4ක් ජලයෙන් යටවී ඇත - බෝට්ටු සහය අවශ්‍යයි',
      category: 'flood',
      severity: 'critical',
      description: 'කැලණි ගඟ පිටාර ගැලීම හේතුවෙන් වැඩිහිටියන් දෙදෙනෙකු සහ දරුවෙකු ඇතුළු පවුල් දෙකක් සිරවී ඇත. කඩිනම් බෝට්ටු සහය හෝ ප්‍රවාහන ආධාර අවශ්‍යයි.',
      location: 'වැලිවිට පාලම අසල, කඩුවෙල',
      district: 'Colombo',
      contactName: 'සමන් ජයවර්ධන',
      contactPhone: '0773456789',
      createdAt: Date.now() - 1000 * 60 * 15,
      verified: true,
      resolved: false,
      distanceKm: 3.2
    },
    {
      id: 'post_2',
      title: 'ජාතික රෝහල සඳහා O-Negative (O-) රුධිර පරිත්‍යාගශීලීන් අවශ්‍යයි',
      category: 'blood',
      severity: 'high',
      description: 'හදිසි ශල්‍යකර්මයක් සඳහා O-Negative රුධිර කාණ්ඩයේ පරිත්‍යාගශීලීන් දෙදෙනෙකුගේ හදිසි අවශ්‍යතාවයක් පවතී.',
      location: 'කොළඹ ජාතික රෝහල, රුධිර බැංකුව',
      district: 'Colombo',
      contactName: 'වෛද්‍ය නිලධාරී - රුධිර බැංකුව',
      contactPhone: '0112691111',
      createdAt: Date.now() - 1000 * 60 * 45,
      verified: true,
      resolved: false,
      distanceKm: 4.8
    },
    {
      id: 'post_3',
      title: 'නායයෑම් අවදානම හේතුවෙන් අවතැන් වූ පවුල් 20ක් සඳහා වියළි සලාක අවශ්‍යයි',
      category: 'food',
      severity: 'high',
      description: 'ගම්පොළ ප්‍රදේශයේ අවතැන් කඳවුරක සිටින පවුල් 20ක් සඳහා සහල්, පරිප්පු, සීනි සහ ළමා කිරිපිටි අවශ්‍ය වේ.',
      location: 'ගම්පොළ ප්‍රජා ශාලාව',
      district: 'Kandy',
      contactName: 'කේ. ආර්. බණ්ඩාර',
      contactPhone: '0714567890',
      createdAt: Date.now() - 1000 * 60 * 120,
      verified: true,
      resolved: false,
      distanceKm: 85.0
    },
    {
      id: 'post_4',
      title: 'හදිසි ඉන්සියුලින් සහ රුධිර පීඩන ඖෂධ අවශ්‍යතාවයක්',
      category: 'medical',
      severity: 'critical',
      description: 'අවුරුදු 68ක දියවැඩියා රෝගියෙකුට අවශ්‍ය මික්ස්ටාර්ඩ් ඉන්සියුලින් මාත්‍රාව ගංවතුර නිසා අහිමිව ඇත. ළඟම සිටින අයෙකුගෙන් සහය පතමු.',
      location: 'කොලොන්නාව, සාලමුල්ල',
      district: 'Colombo',
      contactName: 'දිනේෂ් රණසිංහ',
      contactPhone: '0751234567',
      createdAt: Date.now() - 1000 * 60 * 30,
      verified: true,
      resolved: false,
      distanceKm: 2.1
    }
  ]);

  // Fetch Browser GPS Geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.log('Location default fallback:', err.message);
          setUserLocation({ lat: 6.9271, lng: 79.8612 }); // Colombo coords
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleRegistrationSuccess = (user: UserRegistration) => {
    setRegisteredUser(user);
    setToastMessage(`🎉 සාදරයෙන් පිළිගනිමු ${user.fullName}! ඔබ සහය සේවා ස්වේච්ඡා ජාලය සමග සාර්ථකව ලියාපදිංචි විය.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleCreateBulletin = (newPostData: Omit<BulletinPost, 'id' | 'createdAt' | 'verified' | 'resolved'>) => {
    const newPost: BulletinPost = {
      ...newPostData,
      id: 'post_' + Date.now(),
      createdAt: Date.now(),
      verified: true,
      resolved: false,
      distanceKm: 1.5
    };
    setBulletinPosts(prev => [newPost, ...prev]);
    setToastMessage('✅ ඔබගේ දැන්වීම සාර්ථකව පළ කරන ලදී.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 sm:pb-8">
      
      {/* Top Bar Header adhering to Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        
        {/* Zone 1: Single Brand Wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-md shadow-red-950/60">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white font-sinhala leading-tight">
              සහය සේවා
            </h1>
            <span className="text-[10px] font-medium text-slate-400 font-sans tracking-wide">
              SAHAYA SEVA 24/7
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-sinhala transition-colors ${
              activeTab === 'all' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            🌟 සියල්ල (All)
          </button>
          <button
            onClick={() => setActiveTab('mesh')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-sinhala transition-colors ${
              activeTab === 'mesh' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            📡 Mesh අනතුරු ජාලය (Find Hub)
          </button>
          <button
            onClick={() => setActiveTab('bulletin')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-sinhala transition-colors ${
              activeTab === 'bulletin' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            📢 ආපදා පුවරුව
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-sinhala transition-colors ${
              activeTab === 'radar' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            🛰️ 24/7 Radar
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-sinhala transition-colors ${
              activeTab === 'directory' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            ☎️ 119/1990
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSOSOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs font-sinhala shadow-lg shadow-red-950 flex items-center gap-1.5 animate-pulse"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>SOS හදිසි</span>
          </button>

          <button
            onClick={() => setIsRegistrationOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-xs font-sinhala flex items-center gap-1.5 transition-all shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">
              {registeredUser ? `✅ ${registeredUser.fullName.split(' ')[0]}` : 'ලියාපදිංචි වන්න'}
            </span>
            <span className="sm:hidden">ලියාපදිංචිය</span>
          </button>
        </div>

      </header>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-sinhala text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-7">
        
        {/* Top Hero Banner & Emergency Stats */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-900 border border-red-900/30 p-6 sm:p-8 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-bold font-sinhala">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>සහය සේවා 24/7 ජාතික හදිසි හා ප්‍රජා සහන ජාලය</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-sinhala leading-tight">
              ආපදාවකදී සැමට පිහිට වන <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-300">
                ක්ෂණික සහන හා ස්වේච්ඡා මෙහෙයුම් වේදිකාව
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 font-sinhala leading-relaxed">
              ඔබගේ ප්‍රදේශයේ ගංවතුර, නායයෑම්, රුධිර අවශ්‍යතා සහ හදිසි වෛද්‍ය සහන සෘජුවම සම්බන්ධ කරගන්න. 
              24/7 පසුබිම් GPS රේඩාර් තාක්ෂණයෙන් ආසන්නයේ සිටින ස්වේච්ඡා සාමාජිකයින් ක්ෂණිකව දැනුවත් වේ.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsRegistrationOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold font-sinhala shadow-lg shadow-red-950 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>ස්වේච්ඡා සාමාජිකයෙකු ලෙස ලියාපදිංචි වන්න</span>
              </button>

              <button
                onClick={() => setIsCreateBulletinOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold font-sinhala flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>ආධාර ඉල්ලීමක් පළ කරන්න</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Sections Based on Active Tab */}
        {(activeTab === 'all' || activeTab === 'mesh') && (
          <MeshBeaconNetwork />
        )}

        {(activeTab === 'all' || activeTab === 'radar') && (
          <DisasterRadar userLocation={userLocation} />
        )}

        {(activeTab === 'all' || activeTab === 'bulletin') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white font-sinhala">
                  සජීවී ආපදා හා සහන දැන්වීම් පුවරුව (Live Bulletin)
                </h3>
                <p className="text-xs text-slate-400 font-sinhala">
                  තොරතුරු ලබා ගැනීමට සහ දුරකථන අංක බැලීමට කාඩ්පත මත ක්ලික් කරන්න (3D Flip View)
                </p>
              </div>
            </div>

            <LiveBulletin
              posts={bulletinPosts}
              onOpenCreateModal={() => setIsCreateBulletinOpen(true)}
              onOpenRegistration={() => setIsRegistrationOpen(true)}
            />
          </section>
        )}

        {(activeTab === 'all' || activeTab === 'directory') && (
          <EmergencyDirectory />
        )}

      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 items-center h-16 px-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex flex-col items-center justify-center py-1 ${activeTab === 'all' ? 'text-red-500 font-bold' : 'text-slate-400'}`}
        >
          <ListFilter className="w-4 h-4" />
          <span className="text-[9px] font-sinhala mt-0.5">ප්‍රධාන</span>
        </button>

        <button
          onClick={() => setActiveTab('mesh')}
          className={`flex flex-col items-center justify-center py-1 ${activeTab === 'mesh' ? 'text-red-500 font-bold' : 'text-slate-400'}`}
        >
          <Radio className="w-4 h-4" />
          <span className="text-[9px] font-sinhala mt-0.5">Mesh ජාලය</span>
        </button>

        <button
          onClick={() => setIsSOSOpen(true)}
          className="flex flex-col items-center justify-center py-1 text-red-400"
        >
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <span className="text-[8px] font-sinhala font-bold text-red-400 mt-0.5">SOS</span>
        </button>

        <button
          onClick={() => setActiveTab('radar')}
          className={`flex flex-col items-center justify-center py-1 ${activeTab === 'radar' ? 'text-red-500 font-bold' : 'text-slate-400'}`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[9px] font-sinhala mt-0.5">Radar</span>
        </button>

        <button
          onClick={() => setIsRegistrationOpen(true)}
          className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-white"
        >
          <UserPlus className="w-4 h-4" />
          <span className="text-[9px] font-sinhala mt-0.5">ලියාපදිංචිය</span>
        </button>
      </div>

      {/* Modals */}
      <RegistrationModal
        isOpen={isRegistrationOpen}
        onClose={() => setIsRegistrationOpen(false)}
        onSuccess={handleRegistrationSuccess}
      />

      <CreateBulletinModal
        isOpen={isCreateBulletinOpen}
        onClose={() => setIsCreateBulletinOpen(false)}
        onSubmit={handleCreateBulletin}
      />

      <SOSBeaconModal
        isOpen={isSOSOpen}
        onClose={() => setIsSOSOpen(false)}
        userLocation={userLocation}
      />

    </div>
  );
};
