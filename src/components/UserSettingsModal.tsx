import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Type,
  Check,
  Lock,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Sparkles,
  Sliders,
  Settings,
  AlertCircle,
  Image as ImageIcon,
  Zap,
  WifiOff,
  Gauge,
  Layers,
  FileText
} from 'lucide-react';
import { User, Language } from '../types';
import { syncUserProfileToFirestore } from '../lib/firebase';
import { useDataSaver } from '../utils/dataSaver';

export type FontSizeKey = 'small' | 'normal' | 'medium' | 'large' | 'extra_large';
export type SettingsTabKey = 'profile' | 'font_size' | 'data_saver';

export interface FontSizeOption {
  key: FontSizeKey;
  labelSi: string;
  labelEn: string;
  labelTa: string;
  px: number;
  scale: string;
  descSi: string;
  descEn: string;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  {
    key: 'small',
    labelSi: 'කුඩා (Small)',
    labelEn: 'Small',
    labelTa: 'சிறியது',
    px: 14,
    scale: '87.5%',
    descSi: 'වැඩි තොරතුරු ප්‍රමාණයක් එකවර බැලීමට',
    descEn: 'Compact view to see more content'
  },
  {
    key: 'normal',
    labelSi: 'සාමාන්‍ය (Normal - පෙරනිමි)',
    labelEn: 'Normal (Default)',
    labelTa: 'வழக்கமானது',
    px: 16,
    scale: '100%',
    descSi: 'පෙරනිමි සම්මත අකුරු ප්‍රමාණය',
    descEn: 'Standard default readable size'
  },
  {
    key: 'medium',
    labelSi: 'මධ්‍යම (Medium)',
    labelEn: 'Medium',
    labelTa: 'நடுத்தர',
    px: 18,
    scale: '112.5%',
    descSi: 'පැහැදිලිව පහසුවෙන් කියවීමට',
    descEn: 'Enhanced readability for comfortable reading'
  },
  {
    key: 'large',
    labelSi: 'විශාල (Large)',
    labelEn: 'Large',
    labelTa: 'பெரியது',
    px: 20,
    scale: '125%',
    descSi: 'පහසු දෘශ්‍යතාව සඳහා විශාල කළ අකුරු',
    descEn: 'Large and clear text for high visibility'
  },
  {
    key: 'extra_large',
    labelSi: 'ඉතා විශාල (Extra Large)',
    labelEn: 'Extra Large',
    labelTa: 'மிகப் பெரியது',
    px: 22,
    scale: '137.5%',
    descSi: 'වැඩිහිටියන්ට හා පහසු කියවීමට උපරිම විශාලත්වය',
    descEn: 'Maximum size for senior-friendly readability'
  }
];

export const applyAppFontSize = (sizeKey: FontSizeKey) => {
  const option = FONT_SIZE_OPTIONS.find((opt) => opt.key === sizeKey) || FONT_SIZE_OPTIONS[1];
  document.documentElement.style.fontSize = `${option.px}px`;
  localStorage.setItem('sahaya_font_size', sizeKey);
};

export const getStoredFontSize = (): FontSizeKey => {
  const saved = localStorage.getItem('sahaya_font_size') as FontSizeKey | null;
  if (saved && FONT_SIZE_OPTIONS.some((o) => o.key === saved)) {
    return saved;
  }
  return 'normal';
};

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateUser?: (updatedUser: User) => void;
  language?: Language;
  initialTab?: SettingsTabKey;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80'
];

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  language = 'si',
  initialTab = 'profile'
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(initialTab);
  const [isDataSaver, toggleDataSaver] = useDataSaver();

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [email, setEmail] = useState(user?.email || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || AVATAR_PRESETS[0]);
  const [customPhotoInput, setCustomPhotoInput] = useState('');
  
  // Password States
  const [changePassword, setChangePassword] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Font Size State
  const [currentFontSize, setCurrentFontSize] = useState<FontSizeKey>(() => getStoredFontSize());
  
  // Feedback
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(user?.name || '');
      setPhone(user?.phone || '');
      setAddress(user?.address || '');
      setEmail(user?.email || '');
      setPhotoUrl(user?.photoUrl || AVATAR_PRESETS[0]);
      setChangePassword(false);
      setNewKey('');
      setConfirmKey('');
      setSaveSuccessMsg(null);
      setErrorMsg(null);
      setActiveTab(initialTab);
      setCurrentFontSize(getStoredFontSize());
    }
  }, [isOpen, user, initialTab]);

  if (!isOpen) return null;

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  const handleFontSizeChange = (sizeKey: FontSizeKey) => {
    setCurrentFontSize(sizeKey);
    applyAppFontSize(sizeKey);
    setSaveSuccessMsg(
      language === 'en'
        ? 'Font size applied across the application!'
        : 'අකුරු ප්‍රමාණය මුළු පද්ධතියටම සාර්ථකව යොදන ලදී!'
    );
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleResetFontSize = () => {
    handleFontSizeChange('normal');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg(getLang('කරුණාකර ඔබගේ නම ඇතුළත් කරන්න.', 'Please enter your name.', 'உங்கள் பெயரை உள்ளிடவும்.'));
      return;
    }

    if (!phone.trim()) {
      setErrorMsg(getLang('කරුණාකර දුරකථන අංකය ඇතුළත් කරන්න.', 'Please enter your phone number.', 'தொலைபேசி எண்ணை உள்ளிடவும்.'));
      return;
    }

    if (changePassword) {
      if (!newKey || newKey.length < 4) {
        setErrorMsg(getLang('නව මුරපදය සඳහා අවම වශයෙන් අක්ෂර 4ක් ඇතුළත් කරන්න.', 'New password must have at least 4 characters.', 'கடவுச்சொல் குறைந்தது 4 எழுத்துக்கள் கொண்டிருக்க வேண்டும்.'));
        return;
      }
      if (newKey !== confirmKey) {
        setErrorMsg(getLang('මුරපද දෙක නොගැලපේ.', 'Passwords do not match.', 'கடவுச்சொற்கள் பொருந்தவில்லை.'));
        return;
      }
    }

    const updatedUser: User = {
      ...user,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      email: email.trim(),
      photoUrl: photoUrl || user.photoUrl,
      ...(changePassword && newKey
        ? {
            key: newKey,
            securityCode: newKey,
            isPasswordChanged: true
          }
        : {})
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    // Update Local Storage & Sync to Cloud Firestore
    localStorage.setItem('sahaya_current_user', JSON.stringify(updatedUser));
    syncUserProfileToFirestore(updatedUser).catch((err) => {
      console.warn('Sync profile to Firestore notice:', err);
    });

    const savedUsers = localStorage.getItem('sahaya_users');
    if (savedUsers) {
      try {
        const usersList: User[] = JSON.parse(savedUsers);
        const newUsersList = usersList.map((u) => (u.id === updatedUser.id ? updatedUser : u));
        localStorage.setItem('sahaya_users', JSON.stringify(newUsersList));
      } catch (err) {
        console.warn('User list update notice:', err);
      }
    }

    setSaveSuccessMsg(
      getLang(
        '✅ ඔබගේ පැතිකඩ සැකසුම් සාර්ථකව සුරැකිණි!',
        '✅ Profile settings saved successfully!',
        '✅ சுயவிவர அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன!'
      )
    );

    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4000);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-[#07170e] border-2 border-emerald-500/40 dark:border-emerald-700/60 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-emerald-800 via-teal-900 to-[#022818] text-white shrink-0 border-b border-emerald-700/50">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-2xl bg-black/30 hover:bg-black/50 text-white transition-all cursor-pointer shadow-sm active:scale-95"
            title="වසන්න (Close)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 pr-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 flex items-center justify-center shadow-lg shrink-0">
              <Settings className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 uppercase tracking-wider shadow-xs">
                  {getLang('පද්ධති සැකසුම්', 'System Settings', 'அமைப்புகள்')}
                </span>
                <span className="text-xs text-emerald-200 font-bold hidden sm:inline">
                  • {user?.name || 'පරිශීලක'}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight">
                {getLang('සැකසුම් (Settings)', 'Settings', 'அமைப்புகள்')}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-0.5">
                {getLang(
                  'පැතිකඩ විස්තර සහ අකුරු ප්‍රමාණය (Font Size) පහසුවෙන් කළමනාකරණය කරන්න',
                  'Manage your profile details and app font size easily',
                  'சுயவிவர விவரங்கள் மற்றும் எழுத்துரு அளவை எளிதாக நிர்வகிக்கவும்'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Top Tabs Switcher */}
        <div className="flex items-center p-2 bg-slate-100 dark:bg-[#0b2216] border-b border-slate-200 dark:border-[#143d28] shrink-0 gap-1.5 sm:gap-2">
          {/* Tab 1: Profile Setting */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2 sm:px-4 rounded-2xl text-[11px] sm:text-xs md:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md scale-[1.01]'
                : 'text-slate-700 dark:text-emerald-300 hover:bg-white/80 dark:hover:bg-emerald-950/60'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{getLang('👤 Profile', '👤 Profile', '👤 சுயவிவரம்')}</span>
          </button>

          {/* Tab 2: Font Size */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('font_size');
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2 sm:px-4 rounded-2xl text-[11px] sm:text-xs md:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'font_size'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md scale-[1.01]'
                : 'text-slate-700 dark:text-emerald-300 hover:bg-white/80 dark:hover:bg-emerald-950/60'
            }`}
          >
            <Type className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{getLang('🔤 Font Size', '🔤 Font Size', '🔤 எழுத்துரு')}</span>
          </button>

          {/* Tab 3: Data Saver */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('data_saver');
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2 sm:px-4 rounded-2xl text-[11px] sm:text-xs md:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'data_saver'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md scale-[1.01]'
                : 'text-slate-700 dark:text-emerald-300 hover:bg-white/80 dark:hover:bg-emerald-950/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-amber-300" />
            <span className="truncate">{getLang('⚡ Data Saver', '⚡ Data Saver', '⚡ டேட்டா சேவர்')}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-zinc-200 flex-1">
          {/* Toast Notification Alert */}
          {saveSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-400 text-emerald-950 dark:text-emerald-200 text-xs sm:text-sm font-black flex items-center gap-2.5 animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-100 dark:bg-rose-950/80 border-2 border-rose-400 text-rose-950 dark:text-rose-200 text-xs sm:text-sm font-black flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PROFILE SETTING */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Selection Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0e271a] border border-slate-200 dark:border-[#1a4730] space-y-3">
                <div className="text-xs font-black text-slate-700 dark:text-emerald-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>{getLang('පැතිකඩ ඡායාරූපය (Profile Avatar):', 'Profile Avatar Photo:', 'சுயவிவரப் படம்:')}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {isDataSaver ? (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-amber-950 flex items-center justify-center font-black text-xl shadow-md border-2 border-amber-400">
                      {name ? name.charAt(0).toUpperCase() : '👤'}
                    </div>
                  ) : (
                    <img
                      src={photoUrl || AVATAR_PRESETS[0]}
                      alt="Current Avatar"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-md ring-2 ring-emerald-400/30"
                    />
                  )}
                  <div className="flex-1 min-w-[200px] space-y-2">
                    {isDataSaver && (
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{getLang('Data Saver සක්‍රීයයි - Text අකුරු පමණක් පූරණය වේ', 'Data Saver Active - Pure text mode', 'டேட்டா சேவர் செயலில் உள்ளது')}</span>
                      </div>
                    )}
                    <div className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                      {getLang('පෙරනිමි පින්තූර වලින් තෝරන්න:', 'Pick from presets:', 'முன்னமைக்கப்பட்டவை:')}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {AVATAR_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPhotoUrl(preset)}
                          className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-transform cursor-pointer hover:scale-110 ${
                            photoUrl === preset ? 'border-emerald-500 ring-2 ring-emerald-400 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img 
                            src={preset} 
                            alt={`preset-${idx}`} 
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Custom Photo URL Input */}
                <div className="pt-2 border-t border-slate-200 dark:border-[#1a4730]/60">
                  <input
                    type="url"
                    value={customPhotoInput}
                    onChange={(e) => {
                      setCustomPhotoInput(e.target.value);
                      if (e.target.value.startsWith('http')) {
                        setPhotoUrl(e.target.value);
                      }
                    }}
                    placeholder={getLang('හෝ ඡායාරූප Image Link (URL) එකක් ඇතුළත් කරන්න...', 'Or enter custom image URL...', 'அல்லது பட URL ஐ உள்ளிடவும்...')}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#07190f] border border-slate-200 dark:border-[#1a4730] text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* User Read-only Credentials Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold">NIC Number (ජා.හැ. අංකය):</div>
                    <div className="font-mono font-black text-emerald-950 dark:text-emerald-200">{user?.nicNumber || user?.userId || 'N/A'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold">User Status (තත්ත්වය):</div>
                    <div className="font-black text-emerald-700 dark:text-emerald-300 uppercase">{user?.status || 'APPROVED'}</div>
                  </div>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-emerald-300 mb-1">
                    {getLang('සම්පූර්ණ නම (Full Name):', 'Full Name:', 'முழு பெயர்:')}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#07190f] border border-slate-200 dark:border-[#1a4730] text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-zinc-100"
                  />
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-emerald-300 mb-1">
                      {getLang('දුරකථන අංකය (Phone Number):', 'Phone Number:', 'தொலைபேசி எண்:')}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#07190f] border border-slate-200 dark:border-[#1a4730] text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-emerald-300 mb-1">
                      {getLang('විද්‍යුත් තැපෑල (Email - Optional):', 'Email (Optional):', 'மின்னஞ்சல்:')}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#07190f] border border-slate-200 dark:border-[#1a4730] text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-emerald-300 mb-1">
                    {getLang('පදිංචි ලිපිනය / නගරය (Address / City):', 'Home Address / City:', 'முகவரி / நகரம்:')}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#07190f] border border-slate-200 dark:border-[#1a4730] text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                {/* Password Change Toggle */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setChangePassword(!changePassword)}
                    className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {changePassword
                        ? getLang('මුරපදය වෙනස් කිරීම අවලංගු කරන්න', 'Cancel Password Change', 'கடவுச்சொல் மாற்றத்தை ரத்துசெய்')
                        : getLang('🔐 මුරපදය (Password / PIN) වෙනස් කිරීමට අවශ්‍යද?', '🔐 Change Password / PIN?', '🔐 கடவுச்சொல்லை மாற்ற வேண்டுமா?')}
                    </span>
                  </button>
                </div>

                {/* Password Change Subform */}
                {changePassword && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-950 dark:text-amber-200 mb-1">
                          {getLang('නව මුරපදය (New Key):', 'New Password / Key:', 'புதிய கடவுச்சொல்:')}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            className="w-full px-3 py-2 pr-9 rounded-xl bg-white dark:bg-[#07190f] border border-amber-300 dark:border-amber-700 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-zinc-100"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-amber-950 dark:text-amber-200 mb-1">
                          {getLang('මුරපදය තහවුරු කරන්න:', 'Confirm New Password:', 'உறுதிப்படுத்தவும்:')}
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmKey}
                          onChange={(e) => setConfirmKey(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#07190f] border border-amber-300 dark:border-amber-700 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-zinc-100"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0e271a] text-slate-700 dark:text-zinc-300 text-xs font-bold cursor-pointer transition-all"
                >
                  {getLang('අවලංගු කරන්න', 'Cancel', 'ரத்துசெய்')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{getLang('වෙනස්කම් සුරකින්න', 'Save Profile Settings', 'சேமிக்கவும்')}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: FONT SIZE (අකුරු ප්‍රමාණය) */}
          {activeTab === 'font_size' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Info Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-2 mb-1">
                  <Type className="w-5 h-5 text-emerald-600" />
                  <span>{getLang('අකුරු ප්‍රමාණය සකසන්න (Adjust App Font Size)', 'Adjust Font Size', 'எழுத்துரு அளவை சரிசெய்க')}</span>
                </h3>
                <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                  {getLang(
                    'ඔබට පහසු පරිදි මුළු පද්ධතියේම අකුරු ප්‍රමාණය ක්ෂණිකව විශාල හෝ කුඩා කරගන්න. මෙම සැකසුම ස්වයංක්‍රීයව ඔබගේ උපාංගයේ සුරැකේ.',
                    'Scale the font size across the entire application instantly. Your choice will be saved automatically.',
                    'முழு பயன்பாட்டிற்கும் எழுத்துரு அளவை உடனடியாக சரிசெய்யவும்.'
                  )}
                </p>
              </div>

              {/* Font Size Options List */}
              <div className="space-y-2.5">
                {FONT_SIZE_OPTIONS.map((option) => {
                  const isSelected = currentFontSize === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleFontSizeChange(option.key)}
                      className={`w-full p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex items-center justify-between gap-3 group ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border-emerald-500 dark:border-emerald-400 shadow-md ring-2 ring-emerald-400/20 scale-[1.01]'
                          : 'bg-white dark:bg-[#0c2419] border-slate-200 dark:border-[#143d28] hover:border-emerald-300 dark:hover:border-emerald-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-emerald-950/60 text-slate-700 dark:text-emerald-300 group-hover:bg-emerald-100'
                          }`}
                        >
                          <span style={{ fontSize: `${option.px - 2}px` }}>A</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                            <span>{language === 'en' ? option.labelEn : language === 'ta' ? option.labelTa : option.labelSi}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-[#153a25] text-slate-600 dark:text-emerald-300">
                              {option.scale} ({option.px}px)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                            {language === 'en' ? option.descEn : option.descSi}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-zinc-600 group-hover:border-emerald-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Real-time Dynamic Preview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-[#143d28] space-y-2">
                <div className="text-xs font-black text-slate-500 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{getLang('සජීවී පෙරදසුන (Live Preview):', 'Live Preview:', 'நேரலை முன்னோட்டம்:')}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-300">
                    {FONT_SIZE_OPTIONS.find((o) => o.key === currentFontSize)?.scale}
                  </span>
                </div>
                
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#07170e] border border-slate-200 dark:border-[#1a4730] space-y-1.5 shadow-xs">
                  <div className="font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>සහය සේවා - ජනතා උපකාර පද්ධතිය</span>
                  </div>
                  <p className="text-slate-600 dark:text-zinc-300 leading-relaxed">
                    මෙම තිරය මඟින් තෝරාගත් අකුරු ප්‍රමාණය මුළු යෙදුම පුරාම නිවැරදිව දිස්වන ආකාරය පරීක්ෂා කළ හැක.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold">
                      බොත්තම (Sample Button)
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-mono font-bold">
                      Tag Preview
                    </span>
                  </div>
                </div>
              </div>

              {/* Reset to Default Button */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetFontSize}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0e271a] text-slate-700 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{getLang('පෙරනිමි තත්ත්වයට (Reset to Normal)', 'Reset to Default', 'வழக்கமான நிலைக்கு மீட்டமை')}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {getLang('සම්පූර්ණයි (Done)', 'Done', 'முடிந்தது')}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DATA SAVER (දත්ත ඉතිරි කිරීමේ මාදිලිය) */}
          {activeTab === 'data_saver' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Header Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border-2 border-amber-400/60 dark:border-amber-500/40 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-amber-950 uppercase tracking-wider">
                      <Zap className="w-3 h-3 fill-current" />
                      <span>{getLang('අඩුම Data පරිභෝජනය', 'Ultra Data Saving', 'குறைந்த தரவு')}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-amber-200">
                      {getLang('⚡ Data Saver (දත්ත ඉතිරි කිරීමේ පද්ධතිය)', '⚡ Data Saver Mode', '⚡ டேட்டா சேவர் பயன்முறை')}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed max-w-xl">
                      {getLang(
                        'මෙම සැකසුම ක්‍රියාත්මක කළ පසු පද්ධතියේ කිසිදු පින්තූරයක් භාගත නොකර, Text වලින් පමණක් ක්‍රියාත්මක වන බැවින් ඉතා අඩු දත්ත (Mobile Data) ප්‍රමාණයකින් ඕනෑම දුරකථනයක ඉතා සුමටව (Lag-Free Smoothly) ක්‍රියා කරයි.',
                        'When turned ON, all images are blocked to save your mobile data. The app runs in ultra-smooth text-only mode.',
                        'இயக்கப்பட்டதும், மொபைல் டேட்டாவை சேமிக்க அனைத்து படங்களும் மறைக்கப்படும்.'
                      )}
                    </p>
                  </div>
                </div>

                {/* Big Interactive Toggle Switch */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#07170e] border border-amber-300 dark:border-amber-700/60 flex items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all shrink-0 ${
                        isDataSaver
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                      }`}
                    >
                      <Zap className={`w-6 h-6 ${isDataSaver ? 'fill-current animate-pulse' : ''}`} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>{getLang('Data Saver තත්ත්වය:', 'Data Saver Status:', 'டேட்டா சேவர் நிலை:')}</span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                            isDataSaver
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-400'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                          }`}
                        >
                          {isDataSaver
                            ? getLang('ක්‍රියාත්මකයි (ON - Text Mode)', 'ACTIVE (ON - Text Mode)', 'செயலில் (ON)')
                            : getLang('අක්‍රියයි (OFF - Regular Images)', 'OFF (Full Images)', 'முடக்கப்பட்டது (OFF)')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        {isDataSaver
                          ? getLang('සියලු පින්තූර අක්‍රියයි • Text පමණක් පූරණය වේ', 'All images blocked • Pure text mode', 'படங்கள் மறைக்கப்பட்டுள்ளன')
                          : getLang('සාමාන්‍ය ආකාරයට සියලු පින්තූර පෙන්වයි', 'All images and avatars are displayed', 'அனைத்து படங்களும் காட்டப்படும்')}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !isDataSaver;
                      toggleDataSaver(nextVal);
                      setSaveSuccessMsg(
                        nextVal
                          ? getLang(
                              '⚡ Data Saver සක්‍රීය කරන ලදී! සියලු පින්තූර සඟවා Text-only මාදිලිය යෙදිනි.',
                              '⚡ Data Saver enabled! Running in fast text-only mode.',
                              '⚡ டேட்டா சேவர் இயக்கப்பட்டது!'
                            )
                          : getLang(
                              '✨ Data Saver අක්‍රිය කරන ලදී. සාමාන්‍ය පරිදි පින්තූර පෙන්වනු ඇත.',
                              '✨ Data Saver disabled. Standard images enabled.',
                              '✨ டேட்டா சேவர் முடக்கப்பட்டது.'
                            )
                      );
                      setTimeout(() => setSaveSuccessMsg(null), 3000);
                    }}
                    className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                      isDataSaver ? 'bg-amber-500' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px] font-black ${
                        isDataSaver ? 'translate-x-8 text-amber-600' : 'translate-x-0 text-slate-400'
                      }`}
                    >
                      {isDataSaver ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 3 Main Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-[#143d28] space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                    <WifiOff className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-black text-slate-900 dark:text-zinc-100">
                    {getLang('දත්ත 90% කින් ඉතිරි කිරීම', '90% Data Savings', '90% தரவு சேமிப்பு')}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug">
                    {getLang('ඡායාරූප භාගත නොවන බැවින් අඩු Data පැකේජ සඳහා උපරිමයි.', 'Zero image downloads means massive MB/GB savings.', 'மெகாபைட் தரவு சேமிக்கப்படும்.')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-[#143d28] space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-black text-slate-900 dark:text-zinc-100">
                    {getLang('Smooth & Zero Lag', 'Ultra Smooth & Fast', 'மிக வேகமானது')}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug">
                    {getLang('ඕනෑම සාමාන්‍ය දුරකථනයක කිසිදු හිරවීමක් (Lag) නැතිව ක්‍රියා කරයි.', 'Prevents browser freezing on budget smartphones.', 'பயன்பாடு மிக எளிதாக இயங்கும்.')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-[#143d28] space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-black text-slate-900 dark:text-zinc-100">
                    {getLang('පැහැදිලි Text අවධානය', 'Clean Text Focus', 'உரை மட்டும்')}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug">
                    {getLang('දුරකථන අංක, ලිපින සහ මිල ගණන් පැහැදිලිව ඉක්මනින් කියවන්න.', 'High-contrast text prioritizing immediate phone & contact info.', 'தொடர்பு எண்கள் தெளிவாகத் தெரியும்.')}
                  </p>
                </div>
              </div>

              {/* Sample Live Card View */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-[#143d28] space-y-2">
                <div className="text-xs font-black text-slate-600 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{getLang('Data Saver ආදර්ශන පෙරදසුන (Card Preview):', 'Live Card Preview:', 'முன்னோட்டம்:')}</span>
                  <span className="font-mono text-xs text-amber-600 dark:text-amber-400">
                    {isDataSaver ? '⚡ Text-Only Mode Active' : '🖼️ Regular Image Mode'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#07170e] border border-slate-200 dark:border-[#1a4730] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-amber-950 font-black flex items-center justify-center text-xs">
                        {isDataSaver ? '⚡' : '👤'}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-zinc-100">නිමල් ප්‍රනාන්දු (කඩවත)</div>
                        <div className="text-[10px] text-slate-500">විනාඩි 5කට පෙර</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-black">
                      #POST-4581
                    </span>
                  </div>

                  {isDataSaver ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-dashed border-amber-300 dark:border-amber-700/60 text-center text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>[📷 ඡායාරූපය: Data Saver මඟින් දත්ත ඉතිරි කිරීම සඳහා සඟවා ඇත]</span>
                    </div>
                  ) : (
                    <div className="h-20 rounded-xl bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-950/60 dark:to-teal-950/60 border border-slate-200 dark:border-emerald-800/40 flex items-center justify-center text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      🖼️ [සාමාන්‍ය පින්තූරය / Sample Post Photo]
                    </div>
                  )}

                  <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    වියයුතු දේ: විදුලි පංකාවක් අලුත්වැඩියා කරගැනීමට අවශ්‍යයි (රු. 1,500).
                  </div>
                </div>
              </div>

              {/* Close / Done Button */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-black shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {getLang('සම්පූර්ණයි (Done)', 'Done', 'முடிந்தது')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
