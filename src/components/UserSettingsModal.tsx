import React, { useState, useEffect, useMemo } from 'react';
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
  Camera,
  Upload,
  Zap,
  WifiOff,
  Gauge,
  Layers,
  FileText,
  Award,
  Star,
  CheckCircle2,
  HeartHandshake,
  Clock,
  AlertTriangle,
  Volume2,
  VolumeX,
  Volume1,
  Radio,
  Play,
  Square,
  Bell,
  BellOff,
  SlidersHorizontal,
  QrCode,
  Key,
  HelpCircle,
  Copy,
  ExternalLink,
  Smartphone,
  Download,
  Globe,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { User, Language, HelpPost, PendingProfileUpdate } from '../types';
import { syncUserProfileToFirestore, syncUserPasswordInFirestore } from '../lib/firebase';
import { useDataSaver } from '../utils/dataSaver';
import { TrustBadge } from './TrustBadge';
import { calculateTrustProfile } from '../utils/trustScore';
import { GoogleAuthSetupModal } from './GoogleAuthSetupModal';
import { getStoredDevicePin, clearDevicePin } from '../utils/devicePinManager';
import { DevicePinSetupModal } from './DevicePinSetupModal';
import { PWAInstallModal } from './PWAInstallModal';
import {
  getSirenVolume,
  setSirenVolume,
  isDeviceSirenMuted,
  setDeviceSirenMuted,
  startEmergencySiren,
  stopEmergencySiren,
  unlockAudio,
  getSirenFileName,
  persistSirenSettings,
  subscribeToLocalSirenChanges
} from '../utils/sirenAudio';
import {
  isBackgroundWakeLockEnabled,
  setBackgroundWakeLockEnabled
} from '../utils/notificationManager';

export type FontSizeKey = 'small' | 'normal' | 'medium' | 'large' | 'extra_large';
export type SettingsTabKey = 'profile' | 'security_2fa' | 'font_size' | 'data_saver' | 'siren_settings';

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
    labelSi: 'පෙරනිමි කුඩා (Default - 87.5%)',
    labelEn: 'Default Compact (87.5%)',
    labelTa: 'இயல்பு சிறியது (87.5%)',
    px: 14,
    scale: '87.5%',
    descSi: 'පෙරනිමි සම්මත අකුරු ප්‍රමාණය (14px)',
    descEn: 'Default compact size (14px)'
  },
  {
    key: 'normal',
    labelSi: 'සාමාන්‍ය (Normal - 100%)',
    labelEn: 'Normal (100%)',
    labelTa: 'வழக்கமானது (100%)',
    px: 16,
    scale: '100%',
    descSi: 'සම්මත අකුරු ප්‍රමාණය (16px)',
    descEn: 'Standard size (16px)'
  },
  {
    key: 'medium',
    labelSi: 'මධ්‍යම (Medium - 112.5%)',
    labelEn: 'Medium (112.5%)',
    labelTa: 'நடுத்தர (112.5%)',
    px: 18,
    scale: '112.5%',
    descSi: 'පැහැදිලිව පහසුවෙන් කියවීමට (18px)',
    descEn: 'Enhanced readability (18px)'
  },
  {
    key: 'large',
    labelSi: 'විශාල (Large - 125%)',
    labelEn: 'Large (125%)',
    labelTa: 'பெரியது (125%)',
    px: 20,
    scale: '125%',
    descSi: 'පහසු දෘශ්‍යතාව සඳහා විශාල කළ අකුරු (20px)',
    descEn: 'Large and clear text (20px)'
  },
  {
    key: 'extra_large',
    labelSi: 'ඉතා විශාල (Extra Large - 137.5%)',
    labelEn: 'Extra Large (137.5%)',
    labelTa: 'மிகப் பெரியது (137.5%)',
    px: 22,
    scale: '137.5%',
    descSi: 'වැඩිහිටියන්ට හා පහසු කියවීමට උපරිම විශාලත්වය (22px)',
    descEn: 'Maximum size for senior-friendly readability (22px)'
  }
];

export const applyAppFontSize = (sizeKey: FontSizeKey) => {
  const option = FONT_SIZE_OPTIONS.find((opt) => opt.key === sizeKey) || FONT_SIZE_OPTIONS[0];
  document.documentElement.style.fontSize = `${option.px}px`;
  localStorage.setItem('sahaya_font_size', sizeKey);
};

export const getStoredFontSize = (): FontSizeKey => {
  const saved = localStorage.getItem('sahaya_font_size') as FontSizeKey | null;
  if (saved && FONT_SIZE_OPTIONS.some((o) => o.key === saved)) {
    return saved;
  }
  return 'small';
};

export interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  currentUser?: User | null;
  onUpdateUser?: (updatedUser: User) => void;
  language?: Language;
  initialTab?: SettingsTabKey;
  helpPosts?: HelpPost[];
  redAlerts?: any[];
  onDeletePost?: (postId: string) => void;
  onViewPost?: (post: HelpPost) => void;
  onNavigateToIssues?: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  user: propUser,
  currentUser: propCurrentUser,
  onUpdateUser,
  language = 'si',
  initialTab = 'profile',
  helpPosts = [],
  redAlerts = [],
  onDeletePost,
  onViewPost,
  onNavigateToIssues
}) => {
  const user = propCurrentUser || propUser || ({} as User);
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(initialTab);
  const [isDataSaver, toggleDataSaver] = useDataSaver();

  // User Trust Profile calculation for Profile View
  const trustProfile = useMemo(() => {
    return calculateTrustProfile(user, helpPosts);
  }, [user, helpPosts]);

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [email, setEmail] = useState(user?.email || '');
  const [photoUrl, setPhotoUrl] = useState(user?.facePhotoUrl || user?.photoUrl || '');
  const [customPhotoInput, setCustomPhotoInput] = useState('');

  // 👤 03. Profile Username State (30-day edit limitation)
  const [username, setUsername] = useState(user?.username || '');
  const lastUsernameChangedAt = user?.lastUsernameChangedAt;

  const isUsernameLocked = useMemo(() => {
    if (!lastUsernameChangedAt) return false;
    const changedTime = new Date(lastUsernameChangedAt).getTime();
    if (isNaN(changedTime)) return false;
    const daysPassed = (Date.now() - changedTime) / (1000 * 3600 * 24);
    return daysPassed < 30;
  }, [lastUsernameChangedAt]);

  const daysRemainingForUsername = useMemo(() => {
    if (!lastUsernameChangedAt) return 0;
    const changedTime = new Date(lastUsernameChangedAt).getTime();
    if (isNaN(changedTime)) return 0;
    const daysPassed = (Date.now() - changedTime) / (1000 * 3600 * 24);
    return Math.max(1, Math.ceil(30 - daysPassed));
  }, [lastUsernameChangedAt]);

  // 🔑 04. Profile Deposit Account ID (Readonly)
  const profileId = user?.accountDepositId || user?.userNumericId || user?.userId || user?.id || 'N/A';

  // 🛡️ Privacy Controls (Public / Private toggles)
  const [privacySettings, setPrivacySettings] = useState<{
    photo: 'public' | 'private';
    name: 'public' | 'private';
    username: 'public' | 'private';
    profileId: 'public' | 'private';
    myPosts: 'public' | 'private';
  }>(() => ({
    photo: user?.privacySettings?.photo || 'public',
    name: user?.privacySettings?.name || 'public',
    username: user?.privacySettings?.username || 'public',
    profileId: user?.privacySettings?.profileId || 'public',
    myPosts: user?.privacySettings?.myPosts || 'public',
  }));

  const togglePrivacy = (key: keyof typeof privacySettings) => {
    setPrivacySettings((prev) => ({
      ...prev,
      [key]: prev[key] === 'public' ? 'private' : 'public',
    }));
  };

  // 📂 05. My Posted Ads by Category State
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    red_alerts: true,
    blood_disaster: true,
    quick_services: true,
    general_services: true,
  });

  const toggleCategoryExpand = (catKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  // Filter ads created by this user
  const userMyPosts = useMemo(() => {
    if (!user) return [];
    const uId = user.id;
    const uUserId = user.userId;
    const uNic = user.nicNumber || user.nic;
    const uName = (user.name || '').toLowerCase();
    const uPhone = (user.whatsappPhone || user.phone || '').replace(/\D/g, '');

    return (helpPosts || []).filter((p) => {
      if (p.isDeleted) return false;
      if (p.userId && (p.userId === uId || p.userId === uUserId)) return true;
      if (p.actualAuthorId && (p.actualAuthorId === uId || p.actualAuthorId === uUserId)) return true;
      if (p.actualAuthorNic && uNic && p.actualAuthorNic.toUpperCase() === uNic.toUpperCase()) return true;
      if (p.userNic && uNic && p.userNic.toUpperCase() === uNic.toUpperCase()) return true;
      if (p.userName && p.userName.toLowerCase() === uName) return true;
      const pPhone = (p.userPhone || '').replace(/\D/g, '');
      if (pPhone && uPhone && pPhone.slice(-9) === uPhone.slice(-9)) return true;
      return false;
    });
  }, [user, helpPosts]);

  // Group user's posts into 4 main categories
  const redAlertPosts = useMemo(() => {
    return userMyPosts.filter(
      (p) => p.category === 'red_alerts' || p.category === 'emergency' || p.priorityLevel === 'emergency' || p.isPinnedEmergency
    );
  }, [userMyPosts]);

  const bloodDisasterPosts = useMemo(() => {
    return userMyPosts.filter(
      (p) => p.category === 'blood_disaster' || p.category === 'blood' || p.tagName?.includes('ලේ') || p.tagCategory?.includes('පරිත්‍යාග')
    );
  }, [userMyPosts]);

  const quickServicePosts = useMemo(() => {
    return userMyPosts.filter(
      (p) => p.category === 'quick_services' || p.postType === 'quick_service'
    );
  }, [userMyPosts]);

  const generalServicePosts = useMemo(() => {
    return userMyPosts.filter(
      (p) =>
        p.category !== 'red_alerts' &&
        p.category !== 'blood_disaster' &&
        p.category !== 'blood' &&
        p.category !== 'quick_services' &&
        p.postType !== 'quick_service' &&
        !p.isPinnedEmergency
    );
  }, [userMyPosts]);

  // Handle in-profile Post Deletion
  const handleDeleteMyPost = async (postId: string, postTitle: string) => {
    if (!window.confirm(`ඔබට "${postTitle || 'මෙම දැන්වීම'}" සදහටම ඉවත් කිරීමට අවශ්‍ය බව සහතිකද?`)) return;

    if (onDeletePost) {
      onDeletePost(postId);
    }
    setSaveSuccessMsg('දැන්වීම සාර්ථකව ඉවත් කරන ලදී.');
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };
  
  // Password States
  const [changePassword, setChangePassword] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Font Size State
  const [currentFontSize, setCurrentFontSize] = useState<FontSizeKey>(() => getStoredFontSize());

  // Siren & Emergency Volume Settings
  const [sirenVolume, setLocalSirenVolume] = useState<number>(() => getSirenVolume());
  const [isSirenMuted, setIsSirenMuted] = useState<boolean>(() => isDeviceSirenMuted());
  const [sirenTone, setSirenTone] = useState<string>(() => getSirenFileName());
  const [is24hWakeLockActive, setIs24hWakeLockActive] = useState<boolean>(() => isBackgroundWakeLockEnabled());

  useEffect(() => {
    const unsub = subscribeToLocalSirenChanges(() => {
      setLocalSirenVolume(getSirenVolume());
      setIsSirenMuted(isDeviceSirenMuted());
      setSirenTone(getSirenFileName());
    });
    return () => unsub();
  }, []);
  
  // Feedback
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 2FA Google Authenticator State
  const [showGoogleAuthModal, setShowGoogleAuthModal] = useState(false);
  const [showDisable2FAConfirm, setShowDisable2FAConfirm] = useState(false);

  // Device Quick PIN State
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [hasStoredDevicePin, setHasStoredDevicePin] = useState(() => !!getStoredDevicePin());

  // Siren Audio Test State
  const [isTestingSiren, setIsTestingSiren] = useState(false);

  // PWA App Install & Fullscreen Modal State
  const [showPwaInstallModal, setShowPwaInstallModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(user?.name || '');
      setPhone(user?.phone || '');
      setAddress(user?.address || '');
      setEmail(user?.email || '');
      setPhotoUrl(user?.facePhotoUrl || user?.photoUrl || '');
      setCustomPhotoInput('');
      setChangePassword(false);
      setNewKey('');
      setConfirmKey('');
      setSaveSuccessMsg(null);
      setErrorMsg(null);
      setActiveTab(initialTab);
      setCurrentFontSize(getStoredFontSize());
      setLocalSirenVolume(getSirenVolume());
      setIsSirenMuted(isDeviceSirenMuted());
      setSirenTone(getSirenFileName());
      setShowGoogleAuthModal(false);
      setShowDisable2FAConfirm(false);
      setShowPinSetupModal(false);
      setHasStoredDevicePin(!!getStoredDevicePin());
      setIsTestingSiren(false);
    } else {
      stopEmergencySiren();
      setIsTestingSiren(false);
    }
  }, [isOpen, user, initialTab]);

  if (!isOpen) return null;

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  const handleEnable2FASuccess = async (secret: string) => {
    const updatedUser: User = {
      ...user,
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorConfirmedAt: new Date().toISOString(),
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    localStorage.setItem('sahaya_current_user', JSON.stringify(updatedUser));
    const savedUsers = localStorage.getItem('sahaya_users');
    if (savedUsers) {
      try {
        const list: User[] = JSON.parse(savedUsers);
        localStorage.setItem(
          'sahaya_users',
          JSON.stringify((list || []).map((u) => (u && updatedUser && (u.id === updatedUser.id || u.userId === updatedUser.userId || (u.nicNumber && updatedUser.nicNumber && u.nicNumber === updatedUser.nicNumber)) ? updatedUser : u)))
        );
      } catch (e) {
        console.warn('Error saving local users:', e);
      }
    }

    await syncUserProfileToFirestore(updatedUser);

    setSaveSuccessMsg(
      getLang(
        '✅ Google Authenticator (2FA) සාර්ථකව සක්‍රීය කරන ලදී!',
        '✅ Google Authenticator (2FA) successfully enabled!',
        '✅ Google Authenticator (2FA) வெற்றிகரமாக செயல்படுத்தப்பட்டது!'
      )
    );
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDisable2FA = async () => {
    const updatedUser: User = {
      ...user,
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      twoFactorConfirmedAt: undefined,
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    localStorage.setItem('sahaya_current_user', JSON.stringify(updatedUser));
    const savedUsers = localStorage.getItem('sahaya_users');
    if (savedUsers) {
      try {
        const list: User[] = JSON.parse(savedUsers);
        localStorage.setItem(
          'sahaya_users',
          JSON.stringify((list || []).map((u) => (u && updatedUser && (u.id === updatedUser.id || u.userId === updatedUser.userId || (u.nicNumber && updatedUser.nicNumber && u.nicNumber === updatedUser.nicNumber)) ? updatedUser : u)))
        );
      } catch (e) {
        console.warn('Error saving local users:', e);
      }
    }

    await syncUserProfileToFirestore(updatedUser);

    setShowDisable2FAConfirm(false);
    setSaveSuccessMsg(
      getLang(
        'Google Authenticator (2FA) ආරක්ෂාව අක්‍රීය කරන ලදී.',
        'Google Authenticator (2FA) disabled.',
        'Google Authenticator (2FA) முடக்கப்பட்டது.'
      )
    );
    setTimeout(() => setSaveSuccessMsg(null), 3500);
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

  const handleCancelPendingUpdate = () => {
    const updatedUser: User = {
      ...user,
      pendingProfileUpdate: undefined
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    localStorage.setItem('sahaya_current_user', JSON.stringify(updatedUser));
    syncUserProfileToFirestore(updatedUser).catch((err) => {
      console.warn('Sync profile to Firestore notice:', err);
    });

    const savedUsers = localStorage.getItem('sahaya_users');
    if (savedUsers) {
      try {
        const usersList: User[] = JSON.parse(savedUsers);
        const newUsersList = (usersList || []).map((u) => (u && updatedUser && (u.id === updatedUser.id || u.userId === updatedUser.userId || (u.nicNumber && updatedUser.nicNumber && u.nicNumber === updatedUser.nicNumber)) ? updatedUser : u));
        localStorage.setItem('sahaya_users', JSON.stringify(newUsersList));
      } catch (err) {
        console.warn('User list update notice:', err);
      }
    }

    setName(user?.name || '');
    setAddress(user.address || '');
    setSaveSuccessMsg(
      getLang(
        'සංශෝධන ඉල්ලීම සාර්ථකව අවලංගු කරන ලදී.',
        'Profile update request cancelled successfully.',
        'சுயவிவர மாற்றக் கோரிக்கை ரத்து செய்யப்பட்டது.'
      )
    );
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();
    const trimmedEmail = email.trim();
    const cleanNewKey = newKey.trim();
    const cleanConfirmKey = confirmKey.trim();

    if (!trimmedName) {
      setErrorMsg(getLang('කරුණාකර ඔබගේ නම ඇතුළත් කරන්න.', 'Please enter your name.', 'உங்கள் பெயரை உள்ளிடவும்.'));
      return;
    }

    if (!trimmedPhone) {
      setErrorMsg(getLang('කරුණාකර දුරකථන අංකය ඇතුළත් කරන්න.', 'Please enter your phone number.', 'தொலைபேசி எண்ணை உள்ளிடவும்.'));
      return;
    }

    if (changePassword) {
      if (!cleanNewKey || cleanNewKey.length < 4) {
        setErrorMsg(getLang('නව මුරපදය සඳහා අවම වශයෙන් අක්ෂර 4ක් ඇතුළත් කරන්න.', 'New password must have at least 4 characters.', 'கடவுச்சொல் குறைந்தது 4 எழுத்துக்கள் கொண்டிருக்க வேண்டும்.'));
        return;
      }
      if (cleanNewKey !== cleanConfirmKey) {
        setErrorMsg(getLang('මුරපද දෙක නොගැලපේ.', 'Passwords do not match.', 'கடவுச்சொற்கள் பொருந்தவில்லை.'));
        return;
      }
    }

    const isNameChanged = trimmedName !== (user?.name || '');
    const isAddressChanged = trimmedAddress !== (user.address || '');

    let pendingUpdate: PendingProfileUpdate | undefined = user.pendingProfileUpdate;

    if (isNameChanged || isAddressChanged) {
      pendingUpdate = {
        status: 'pending',
        requestedAt: new Date().toLocaleString('si-LK', { hour12: true }),
        requestedAtMs: Date.now(),
        oldName: user?.name || '',
        newName: isNameChanged ? trimmedName : undefined,
        oldAddress: user.address || '',
        newAddress: isAddressChanged ? trimmedAddress : undefined,
        oldPhone: user.phone || '',
        oldEmail: user.email || ''
      };
    }

    // Check if username was modified and update lastUsernameChangedAt
    const isUsernameChanged = username.trim() !== (user?.username || '') && username.trim() !== '';

    // Name and Address must NOT be updated immediately if changed!
    const updatedUser: User = {
      ...user,
      name: user?.name || trimmedName, // Original name is strictly permanent
      username: username.trim(),
      lastUsernameChangedAt: isUsernameChanged ? new Date().toISOString() : user?.lastUsernameChangedAt,
      accountDepositId: profileId,
      privacySettings: privacySettings,
      address: isAddressChanged ? user.address : trimmedAddress,
      phone: trimmedPhone,
      email: trimmedEmail,
      photoUrl: photoUrl || user.photoUrl,
      facePhotoUrl: photoUrl || user.facePhotoUrl || user.photoUrl,
      pendingProfileUpdate: (isNameChanged || isAddressChanged) ? pendingUpdate : user.pendingProfileUpdate,
      ...(changePassword && cleanNewKey
        ? {
            key: cleanNewKey,
            securityCode: cleanNewKey,
            password: cleanNewKey,
            tempCode: '',
            tempPassword: '',
            isPasswordChanged: true,
            isTemporaryPassword: false,
            updatedAt: new Date().toISOString(),
          }
        : {})
    };

    // Update Local Storage immediately
    localStorage.setItem('sahaya_current_user', JSON.stringify(updatedUser));
    const savedUsers = localStorage.getItem('sahaya_users');
    if (savedUsers) {
      try {
        const usersList: User[] = JSON.parse(savedUsers);
        const newUsersList = (usersList || []).map((u) => {
          if (!u) return u;
          const isMatch =
            (updatedUser?.id && u.id === updatedUser.id) ||
            (u.nicNumber && updatedUser?.nicNumber && u.nicNumber.toLowerCase() === updatedUser.nicNumber.toLowerCase()) ||
            (u.userId && updatedUser?.userId && u.userId.toLowerCase() === updatedUser.userId.toLowerCase()) ||
            (updatedUser?.userNumericId && u.userNumericId === updatedUser.userNumericId);
          return isMatch ? { ...u, ...updatedUser } : u;
        });
        localStorage.setItem('sahaya_users', JSON.stringify(newUsersList));
      } catch (err) {
        console.warn('User list update notice:', err);
      }
    }

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    // Sync profile and password to Firestore & Backend
    try {
      await syncUserProfileToFirestore(updatedUser);
      if (changePassword && cleanNewKey) {
        await syncUserPasswordInFirestore(updatedUser, cleanNewKey);
        fetch('/api/user/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: updatedUser?.id || updatedUser?.userId || '',
            nicNumber: updatedUser?.nicNumber || updatedUser?.userId || '',
            newPassword: cleanNewKey,
          }),
        }).catch((e) => console.warn('Server password update notify error:', e));
      }
    } catch (syncErr) {
      console.warn('Sync to Firestore notice:', syncErr);
    }

    if (changePassword && cleanNewKey) {
      setChangePassword(false);
      setNewKey('');
      setConfirmKey('');
    }

    if (isNameChanged || isAddressChanged) {
      setSaveSuccessMsg(
        getLang(
          '⏳ ඔබගේ නම / ලිපිනය සංශෝධන ඉල්ලීම පරිපාලක (Admin) අනුමැතිය සඳහා යොමු කරන ලදී. (නව මුරපදය සාර්ථකව සුරැකිණි)',
          '⏳ Name / Address change request has been submitted for Admin approval. (New password saved successfully)',
          '⏳ பெயர் / முகவரி மாற்றக் கோரிக்கை நிர்வாகி ஒப்புதலுக்கு அனுப்பப்பட்டது. (புதிய கடவுச்சொல் சேமிக்கப்பட்டது)'
        )
      );
    } else if (changePassword && cleanNewKey) {
      setSaveSuccessMsg(
        getLang(
          '✅ නව මුරපදය සහ පැතිකඩ තොරතුරු සාර්ථකව සුරැකිණි!',
          '✅ New password and profile information saved successfully!',
          '✅ புதிய கடவுச்சொல் மற்றும் சுயவிவரத் தகவல்கள் வெற்றிகரமாக சேமிக்கப்பட்டன!'
        )
      );
    } else {
      setSaveSuccessMsg(
        getLang(
          '✅ ඔබගේ පැතිකඩ සැකසුම් සාර්ථකව සුරැකිණි!',
          '✅ Profile settings saved successfully!',
          '✅ சுயவிவர அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன!'
        )
      );
    }

    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 5000);
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

        {/* Top Tabs Switcher (Zero-overflow wrap - all buttons visible immediately) */}
        <div className="flex flex-wrap items-center p-2 bg-slate-100 dark:bg-[#0b2216] border-b border-slate-200 dark:border-[#143d28] shrink-0 gap-1.5">
          {/* Tab 1: Profile Setting */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setErrorMsg(null);
            }}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md scale-[1.01]'
                : 'text-slate-700 dark:text-emerald-300 hover:bg-white/80 dark:hover:bg-emerald-950/60'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{getLang('👤 Profile', '👤 Profile', '👤 சுயவிவரம்')}</span>
          </button>

          {/* Tab 2: Security & 2FA */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('security_2fa');
              setErrorMsg(null);
            }}
            className={`flex-1 min-w-[110px] flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'security_2fa'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-md scale-[1.01]'
                : 'text-slate-700 dark:text-emerald-300 hover:bg-white/80 dark:hover:bg-emerald-950/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span>{getLang('🔐 2FA ආරක්ෂාව', '🔐 2FA Security', '🔐 2FA பாதுகாப்பு')}</span>
            {user?.twoFactorEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            )}
          </button>

          {/* Tab 3: Font Size */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('font_size');
              setErrorMsg(null);
            }}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'font_size'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md scale-[1.01]'
                : 'text-slate-700 dark:text-emerald-300 hover:bg-white/80 dark:hover:bg-emerald-950/60'
            }`}
          >
            <Type className="w-3.5 h-3.5 shrink-0" />
            <span>{getLang('🔤 Font', '🔤 Font', '🔤 எழுத்து')}</span>
          </button>

          {/* Tab 4: Data Saver */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('data_saver');
              setErrorMsg(null);
            }}
            className={`flex-1 min-w-[105px] flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'data_saver'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md scale-[1.01]'
                : 'text-slate-700 dark:text-emerald-300 hover:bg-white/80 dark:hover:bg-emerald-950/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0 text-amber-300" />
            <span>{getLang('⚡ Data Saver', '⚡ Data Saver', '⚡ டேட்டா')}</span>
          </button>

          {/* Tab 5: Siren & Emergency Volume Settings */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('siren_settings');
              setErrorMsg(null);
            }}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'siren_settings'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md scale-[1.01]'
                : 'text-slate-700 dark:text-emerald-300 hover:bg-white/80 dark:hover:bg-emerald-950/60'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0 text-red-400" />
            <span>{getLang('🚨 සයිරන්', '🚨 Siren', '🚨 சைரன்')}</span>
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

          {/* TAB 1: PROFILE SETTING - COMPLETE USER OVERHAUL */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              
              {/* 🛡️ Header Info Notice */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <UserIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-100">
                      පරිශීලක පැතිකඩ කළමනාකරණය (Profile Dashboard)
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                      ඔබගේ පැතිකඩ තොරතුරු සහ පුද්ගලිකත්ව (Privacy) සැකසුම් මෙතැනින් පාලනය කරන්න.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shrink-0">
                  Verified Member
                </div>
              </div>

              {/* ==============================================================
                  01. PROFILE PICTURE (REPLACEABLE + PRIVACY TOGGLE)
                  ============================================================== */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">1</span>
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-slate-800 dark:text-emerald-300">පැතිකඩ ඡායාරූපය (Profile Picture):</span>
                  </div>

                  {/* Privacy Toggle: Public / Private */}
                  <button
                    type="button"
                    onClick={() => togglePrivacy('photo')}
                    className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                      privacySettings.photo === 'public'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-slate-700'
                    }`}
                    title="ප්‍රසිද්ධද පෞද්ගලිකද යන්න තෝරන්න"
                  >
                    {privacySettings.photo === 'public' ? (
                      <>
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        <span>🌐 Public (ප්‍රසිද්ධයි)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>🔒 Private (පෞද්ගලිකයි)</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <div className="relative group shrink-0">
                    {photoUrl && photoUrl.trim() !== '' ? (
                      <img
                        src={photoUrl}
                        alt="Profile"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md ring-2 ring-emerald-400/20"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-200 dark:from-emerald-950 dark:to-teal-900 border-2 border-dashed border-emerald-400 text-emerald-800 dark:text-emerald-300 flex flex-col items-center justify-center shadow-inner text-center p-1">
                        <Camera className="w-6 h-6 mb-1 opacity-70" />
                        <span className="text-[10px] font-black">ඡායාරූපයක් නැත</span>
                      </div>
                    )}

                    <label
                      htmlFor="profile-photo-replace-upload"
                      className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity text-center p-1"
                    >
                      <Camera className="w-5 h-5 text-white mb-0.5" />
                      <span className="text-[9px] font-bold">Replace</span>
                    </label>
                  </div>

                  <div className="flex-1 min-w-[200px] space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label
                        htmlFor="profile-photo-replace-upload"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-md cursor-pointer transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-white" />
                        <span>📸 ඡායාරූපය Replace කරන්න</span>
                      </label>
                      <input
                        id="profile-photo-replace-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (typeof event.target?.result === 'string') {
                                setPhotoUrl(event.target.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />

                      {photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-bold border border-rose-300 dark:border-rose-800 cursor-pointer"
                        >
                          ඉවත් කරන්න
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      කැමරාවෙන් හෝ ඔබගේ උපාංගයෙන් නව ඡායාරූපයක් ලබාගෙන Replace කළ හැක.
                    </p>
                  </div>
                </div>
              </div>

              {/* ==============================================================
                  02. PROFILE NAME (ORIGINAL NAME - PERMANENT READONLY)
                  ============================================================== */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/60 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">2</span>
                    <UserIcon className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-slate-800 dark:text-emerald-300">මූලික නම (Original Profile Name):</span>
                  </div>

                  {/* Privacy Toggle */}
                  <button
                    type="button"
                    onClick={() => togglePrivacy('name')}
                    className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                      privacySettings.name === 'public'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {privacySettings.name === 'public' ? (
                      <>
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        <span>🌐 Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>🔒 Private</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={user?.name || ''}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-200/80 dark:bg-[#05140b] border border-slate-300 dark:border-emerald-900 text-xs sm:text-sm font-black text-slate-800 dark:text-zinc-200 cursor-not-allowed outline-none select-none"
                  />
                  <div className="absolute right-3 top-2.5 text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-300 dark:border-amber-800">
                    <Lock className="w-3 h-3" />
                    <span>Original Name (වෙනස් කළ නොහැක)</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                  ජාතික හැඳුනුම්පත සත්‍යාපනය කර ඇති බැවින් මෙම මූලික නම ස්ථිරව සුරැකී පවතී.
                </p>
              </div>

              {/* ==============================================================
                  03. PROFILE USERNAME (30-DAY EDIT LIMITATION)
                  ============================================================== */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/60 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">3</span>
                    <Type className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-slate-800 dark:text-emerald-300">පරිශීලක නාමය (Profile Username):</span>
                  </div>

                  {/* Privacy Toggle */}
                  <button
                    type="button"
                    onClick={() => togglePrivacy('username')}
                    className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                      privacySettings.username === 'public'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {privacySettings.username === 'public' ? (
                      <>
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        <span>🌐 Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>🔒 Private</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    disabled={isUsernameLocked}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="උදා: @kamal_perera"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold outline-none transition-all ${
                      isUsernameLocked
                        ? 'bg-slate-200/80 dark:bg-[#05140b] border-slate-300 dark:border-emerald-900 text-slate-500 cursor-not-allowed'
                        : 'bg-white dark:bg-[#06160d] border-slate-300 dark:border-emerald-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500'
                    }`}
                  />
                  {isUsernameLocked && (
                    <div className="absolute right-3 top-2.5 text-[10px] font-black text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-md flex items-center gap-1 border border-rose-300 dark:border-rose-800">
                      <Lock className="w-3 h-3" />
                      <span>දින {daysRemainingForUsername}කින් පසු සංස්කරණය කළ හැක</span>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>අන් අයට ඔබව සොයාගැනීමට පහසු වන නමකි. <strong>එක් වරක් edit කළ පසු දින 30කට වෙනස් කළ නොහැක.</strong></span>
                  {lastUsernameChangedAt && (
                    <span className="text-[9px] text-slate-400 font-mono">
                      අවසාන වෙනස්කම: {new Date(lastUsernameChangedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* ==============================================================
                  04. PROFILE ID (ACCOUNT DEPOSIT NUMBER - READONLY)
                  ============================================================== */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/60 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">4</span>
                    <Key className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-slate-800 dark:text-emerald-300">තම ගිණුම් අංකය (Profile Account Deposit ID):</span>
                  </div>

                  {/* Privacy Toggle */}
                  <button
                    type="button"
                    onClick={() => togglePrivacy('profileId')}
                    className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                      privacySettings.profileId === 'public'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {privacySettings.profileId === 'public' ? (
                      <>
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        <span>🌐 Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>🔒 Private</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      readOnly
                      value={profileId}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-200/80 dark:bg-[#05140b] border border-slate-300 dark:border-emerald-900 text-xs sm:text-sm font-mono font-black text-emerald-950 dark:text-emerald-300 outline-none select-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (profileId) {
                        navigator.clipboard.writeText(profileId);
                        setSaveSuccessMsg('පැතිකඩ ID (Account ID) පිටපත් කරගන්නා ලදී!');
                        setTimeout(() => setSaveSuccessMsg(null), 2500);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all shrink-0"
                    title="පිටපත් කරගන්න"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy ID</span>
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                  💡 මෙය තම ගිණුම සඳහා මුදල් බැරකිරීමට (Account Deposit & Wallet Top-up) භාවිතා වන අනන්‍ය අංකයයි. (වෙනස් කළ නොහැක).
                </p>
              </div>

              {/* ==============================================================
                  05. MY POSTED ADS BY CATEGORY (VIEW & DELETE)
                  ============================================================== */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-200 dark:border-emerald-900/60">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">5</span>
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      තමා විසින් පළකළ දැන්වීම් (My Posted Ads):
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      මුළු දැන්වීම් {userMyPosts.length}
                    </span>
                  </div>

                  {/* Privacy Toggle */}
                  <button
                    type="button"
                    onClick={() => togglePrivacy('myPosts')}
                    className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                      privacySettings.myPosts === 'public'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {privacySettings.myPosts === 'public' ? (
                      <>
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        <span>🌐 Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>🔒 Private</span>
                      </>
                    )}
                  </button>
                </div>

                {userMyPosts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 dark:text-zinc-500 font-medium">
                    ඔබ විසින් තවමත් දැන්වීම් පළකර නොමැත.
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    
                    {/* Category 1: රතු එළිය (Red Alerts) */}
                    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden bg-white dark:bg-[#06160d]">
                      <button
                        type="button"
                        onClick={() => toggleCategoryExpand('red_alerts')}
                        className="w-full p-3 bg-rose-50 dark:bg-rose-950/50 flex items-center justify-between text-left font-black text-xs text-rose-950 dark:text-rose-200 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>🚨 රතු එළිය හදිසි නිවේදන (Red Alerts)</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 text-[10px]">
                            {redAlertPosts.length}
                          </span>
                        </span>
                        {expandedCategories.red_alerts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {expandedCategories.red_alerts && (
                        <div className="p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-emerald-950/60">
                          {redAlertPosts.length === 0 ? (
                            <div className="p-2 text-[11px] text-slate-400">මෙම කාණ්ඩයේ දැන්වීම් නොමැත.</div>
                          ) : (
                            redAlertPosts.map((post) => (
                              <div key={post.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs">
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-900 dark:text-white truncate">
                                    {post.headline || post.title || post.whatHappened || 'හදිසි අනතුරු ඇඟවීම'}
                                  </div>
                                  <div className="text-[10px] text-slate-400">{post.postCode} • {new Date(post.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {onViewPost && (
                                    <button
                                      type="button"
                                      onClick={() => onViewPost(post)}
                                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                      title="බලන්න"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>බලන්න</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMyPost(post.id, post.headline || post.title || '')}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                    title="ඉවත් කරන්න"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Category 2: ලේ සහ හදිසි සහන (Blood & Disaster Aid) */}
                    <div className="rounded-2xl border border-red-200 dark:border-red-900/60 overflow-hidden bg-white dark:bg-[#06160d]">
                      <button
                        type="button"
                        onClick={() => toggleCategoryExpand('blood_disaster')}
                        className="w-full p-3 bg-red-50 dark:bg-red-950/50 flex items-center justify-between text-left font-black text-xs text-red-950 dark:text-red-200 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>🩸 ලේ සහ ආපදා ආධාර (Blood & Disaster Aid)</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-200 text-[10px]">
                            {bloodDisasterPosts.length}
                          </span>
                        </span>
                        {expandedCategories.blood_disaster ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {expandedCategories.blood_disaster && (
                        <div className="p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-emerald-950/60">
                          {bloodDisasterPosts.length === 0 ? (
                            <div className="p-2 text-[11px] text-slate-400">මෙම කාණ්ඩයේ දැන්වීම් නොමැත.</div>
                          ) : (
                            bloodDisasterPosts.map((post) => (
                              <div key={post.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs">
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-900 dark:text-white truncate">
                                    {post.headline || post.title || post.whatHappened || 'ලේ පරිත්‍යාග දැන්වීම'}
                                  </div>
                                  <div className="text-[10px] text-slate-400">{post.postCode} • {new Date(post.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {onViewPost && (
                                    <button
                                      type="button"
                                      onClick={() => onViewPost(post)}
                                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>බලන්න</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMyPost(post.id, post.headline || post.title || '')}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Category 3: ඉක්මන් සේවා (Quick Services) */}
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 overflow-hidden bg-white dark:bg-[#06160d]">
                      <button
                        type="button"
                        onClick={() => toggleCategoryExpand('quick_services')}
                        className="w-full p-3 bg-amber-50 dark:bg-amber-950/50 flex items-center justify-between text-left font-black text-xs text-amber-950 dark:text-amber-200 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>⚡ ඉක්මන් සේවා (Quick Services)</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-[10px]">
                            {quickServicePosts.length}
                          </span>
                        </span>
                        {expandedCategories.quick_services ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {expandedCategories.quick_services && (
                        <div className="p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-emerald-950/60">
                          {quickServicePosts.length === 0 ? (
                            <div className="p-2 text-[11px] text-slate-400">මෙම කාණ්ඩයේ දැන්වීම් නොමැත.</div>
                          ) : (
                            quickServicePosts.map((post) => (
                              <div key={post.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs">
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-900 dark:text-white truncate">
                                    {post.headline || post.title || post.whatHappened || 'ඉක්මන් සේවා ඉල්ලීම'}
                                  </div>
                                  <div className="text-[10px] text-slate-400">{post.postCode} • {new Date(post.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {onViewPost && (
                                    <button
                                      type="button"
                                      onClick={() => onViewPost(post)}
                                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>බලන්න</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMyPost(post.id, post.headline || post.title || '')}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Category 4: සාමාන්‍ය සේවා (General Services - Text / Picture / Standard) */}
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 overflow-hidden bg-white dark:bg-[#06160d]">
                      <button
                        type="button"
                        onClick={() => toggleCategoryExpand('general_services')}
                        className="w-full p-3 bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-between text-left font-black text-xs text-emerald-950 dark:text-emerald-200 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>🛠️ සාමාන්‍ය සේවා (General Services - Text / Picture Posts)</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[10px]">
                            {generalServicePosts.length}
                          </span>
                        </span>
                        {expandedCategories.general_services ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {expandedCategories.general_services && (
                        <div className="p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-emerald-950/60">
                          {generalServicePosts.length === 0 ? (
                            <div className="p-2 text-[11px] text-slate-400">මෙම කාණ්ඩයේ දැන්වීම් නොමැත.</div>
                          ) : (
                            generalServicePosts.map((post) => (
                              <div key={post.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs">
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-900 dark:text-white truncate">
                                    {post.headline || post.title || post.whatHappened || 'සාමාන්‍ය දැන්වීම'}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {post.postType === 'text_post' ? '📝 Text Post' : post.postType === 'picture_post' ? '📸 Picture Post' : '📄 Standard'} • {new Date(post.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {onViewPost && (
                                    <button
                                      type="button"
                                      onClick={() => onViewPost(post)}
                                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>බලන්න</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMyPost(post.id, post.headline || post.title || '')}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* Password Change Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setChangePassword(!changePassword)}
                  className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {changePassword
                      ? 'මුරපදය වෙනස් කිරීම අවලංගු කරන්න'
                      : '🔐 මුරපදය (Password / PIN) වෙනස් කිරීමට අවශ්‍යද?'}
                  </span>
                </button>
              </div>

              {/* Password Change Subform */}
              {changePassword && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 dark:text-amber-200 mb-1">
                        නව මුරපදය (New Password):
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
                        මුරපදය තහවුරු කරන්න:
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

              {/* ==============================================================
                  07. BOTTOM SAVE BUTTON (සුරකින්න)
                  ============================================================== */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-emerald-900/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0e271a] text-slate-700 dark:text-zinc-300 text-xs font-bold cursor-pointer transition-all"
                >
                  අවලංගු කරන්න (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>වෙනස්කම් සුරකින්න (Save Settings)</span>
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

          {/* TAB 4: SIREN & EMERGENCY VOLUME SETTINGS (සයිරන් ශබ්ද සහ දුරකථන සැකසුම්) */}
          {activeTab === 'siren_settings' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Header Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-red-600/15 via-rose-600/10 to-transparent border-2 border-red-500/60 dark:border-red-500/40 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white uppercase tracking-wider shadow-sm">
                      <Volume2 className="w-3 h-3 fill-current" />
                      <span>{getLang('හදිසි ආපදා සයිරන් ශබ්ද පාලනය', 'Emergency Siren Sound Control', 'அவசர சைரன் கட்டுப்பாடு')}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-red-300">
                      {getLang('🚨 සයිරන් ශබ්දය සහ Silent කිරීමේ සැකසුම්', '🚨 Siren Volume & Silent Settings', '🚨 சைரன் ஒலி மற்றும் அமைதி அமைப்புகள்')}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed max-w-xl">
                      {getLang(
                        'ආපදාවක් හෝ රතු එළියක් (Red Alert) ඇති විට ඇසෙන සයිරන් නාදයේ ශබ්දය (Volume) අඩු වැඩි කිරීමට හෝ ඔබගේ දුරකථනයේ පමණක් Silent කර තබා ගැනීමට මෙම සැකසුම් භාවිතා කරන්න. මෙය ඔබගේ උපාංගයට (This Device) පමණක් බලපායි.',
                        'Adjust the emergency alert siren volume or mute it exclusively on your device. Other community members will continue to receive their standard alerts.',
                        'உங்கள் சாதனத்தில் மட்டும் அவசர சைரன் ஒலியைக் கட்டுப்படுத்த அல்லது மௌனமாக்க இந்த அமைப்புகளைப் பயன்படுத்தவும்.'
                      )}
                    </p>
                  </div>
                </div>

                {/* Device-Level Silent Toggle Box */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#07170e] border-2 border-red-300 dark:border-red-800/60 flex items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all shrink-0 ${
                        isSirenMuted
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 border border-rose-300 dark:border-rose-800'
                          : 'bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-md'
                      }`}
                    >
                      {isSirenMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6 animate-pulse" />}
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>{getLang('මගේ දුරකථනයේ Silent කිරීම:', 'Mute on My Device:', 'என் சாதனத்தில் மௌனம்:')}</span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                            isSirenMuted
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-400'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-400'
                          }`}
                        >
                          {isSirenMuted
                            ? getLang('🔕 Silent කර ඇත (Muted)', '🔕 Muted (Silent)', '🔕 மௌனமானது')
                            : getLang('🔔 ශබ්දය සක්‍රීයයි (Active)', '🔔 Sound Active', '🔔 ஒலி செயலில்')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        {isSirenMuted
                          ? getLang('අනතුරු ඇඟවීමේදී තිරය පෙන්වයි • සයිරන් නාදය නිහඬයි', 'Visual warnings pop up • Audio siren stays completely quiet', 'திரை எச்சரிக்கை வரும் • சைரன் ஒலிக்காது')
                          : getLang('අනතුරු ඇඟවීම් වලදී සයිරන් නාදය ශබ්ද නගා ඇසේ', 'Siren tone sounds at configured volume during emergencies', 'எச்சரிக்கைகளின் போது சைரன் ஒலிக்கும்')}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextMute = !isSirenMuted;
                      setIsSirenMuted(nextMute);
                      setDeviceSirenMuted(nextMute);
                      setSaveSuccessMsg(
                        nextMute
                          ? getLang(
                              '🔕 ඔබගේ දුරකථනයේ සයිරන් නාදය Silent කරන ලදී. අනතුරු ඇඟවීම් තිරයේ පමණක් දිස්වේ.',
                              '🔕 Siren muted on this device. Visual alerts will still display.',
                              '🔕 உங்கள் சாதனத்தில் சைரன் மௌனமாக்கப்பட்டது.'
                            )
                          : getLang(
                              '🔔 ඔබගේ දුරකථනයේ සයිරන් ශබ්දය සක්‍රීය කරන ලදී!',
                              '🔔 Siren sound activated on this device!',
                              '🔔 சைரன் ஒலி செயல்படுத்தப்பட்டது!'
                            )
                      );
                      setTimeout(() => setSaveSuccessMsg(null), 3000);
                    }}
                    className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                      isSirenMuted ? 'bg-rose-500' : 'bg-emerald-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px] font-black ${
                        isSirenMuted ? 'translate-x-8 text-rose-600' : 'translate-x-0 text-emerald-700'
                      }`}
                    >
                      {isSirenMuted ? 'MUTE' : 'ON'}
                    </span>
                  </button>
                </div>

                {/* 24/7 Keep-Awake / Always Active Background Service Toggle */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#07170e] border-2 border-amber-300 dark:border-amber-700/60 flex items-center justify-between gap-4 shadow-sm mt-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all shrink-0 ${
                        is24hWakeLockActive
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                      }`}
                    >
                      <Zap className={`w-6 h-6 ${is24hWakeLockActive ? 'fill-current animate-pulse' : ''}`} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>{getLang('පැය 24ම සජීවීව තබා ගැනීම (24/7 Always Active):', '24/7 Always Active Mode:', '24/7 செயலில் பயன்முறை:')}</span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                            is24hWakeLockActive
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-400'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                          }`}
                        >
                          {is24hWakeLockActive
                            ? getLang('ක්‍රියාත්මකයි (24/7 Active)', 'ACTIVE (24/7 Awake)', 'செயலில் (ON)')
                            : getLang('අක්‍රියයි (Battery Saver)', 'OFF (Battery Saver)', 'முடக்கப்பட்டது (OFF)')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        {is24hWakeLockActive
                          ? getLang('ඇප් එක Close නොවී පැය 24 පුරා සජීවීව ක්‍රියාත්මකව තබයි • ආපදා අනතුරු නාද ක්ෂණිකව ලැබේ', 'Screen wake lock active 24/7 for instant disaster alerts', 'அவசர விழிப்பூட்டல்கள் உடனடியாக கிடைக்கும்')
                          : getLang('පසුබිම් සජීවී ක්‍රියාකාරීත්වය අක්‍රියයි • බැටරි සංරක්ෂණ මාදිලිය', 'Standard mode • Battery optimization enabled', 'பேட்டரி சேமிப்பு பயன்முறை')}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !is24hWakeLockActive;
                      setIs24hWakeLockActive(nextVal);
                      setBackgroundWakeLockEnabled(nextVal);
                      setSaveSuccessMsg(
                        nextVal
                          ? getLang(
                              '⚡ පැය 24 පුරා සජීවීව තබා ගැනීම (24/7 Always Active) සක්‍රීය කරන ලදී!',
                              '⚡ 24/7 Always Active Keep-Awake mode enabled!',
                              '⚡ 24/7 பயன்முறை செயல்படுத்தப்பட்டது!'
                            )
                          : getLang(
                              '✨ පැය 24 පුරා සජීවීව තබා ගැනීම අක්‍රිය කරන ලදී (Battery Saver Enabled).',
                              '✨ 24/7 Always Active mode disabled (Battery Saver ON).',
                              '✨ 24/7 பயன்முறை முடக்கப்பட்டது.'
                            )
                      );
                      setTimeout(() => setSaveSuccessMsg(null), 3000);
                    }}
                    className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                      is24hWakeLockActive ? 'bg-amber-500' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px] font-black ${
                        is24hWakeLockActive ? 'translate-x-8 text-amber-600' : 'translate-x-0 text-slate-400'
                      }`}
                    >
                      {is24hWakeLockActive ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Volume Slider Section */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c2419] border border-slate-200 dark:border-[#143d28] space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-zinc-100">
                        {getLang('සයිරන් ශබ්ද පරිමාව (Siren Volume)', 'Siren Volume Level', 'சைரன் ஒலி அளவு')}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {getLang('අවශ්‍ය ප්‍රමාණයට Volume එක අඩු වැඩි කරන්න', 'Drag slider to set preferred alarm loudness', 'ஒலியளவை மாற்றவும்')}
                      </p>
                    </div>
                  </div>

                  {/* Big Percentage Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-black font-mono text-red-600 dark:text-red-400 px-3 py-1 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900">
                      {Math.round(sirenVolume * 100)}%
                    </span>
                  </div>
                </div>

                {/* Range Input Slider */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sirenVolume}
                    disabled={isSirenMuted}
                    onChange={(e) => {
                      const newVol = parseFloat(e.target.value);
                      setLocalSirenVolume(newVol);
                      setSirenVolume(newVol);
                    }}
                    className="w-full h-3 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-600 disabled:opacity-40"
                  />
                  
                  {/* Quick Preset Volume Buttons */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {[
                      { label: '0% (Mute)', val: 0.0, icon: '🔇' },
                      { label: '25% (Low)', val: 0.25, icon: '🔉' },
                      { label: '50% (Med)', val: 0.5, icon: '🔉' },
                      { label: '75% (High)', val: 0.75, icon: '🔊' },
                      { label: '100% (Max)', val: 1.0, icon: '📢' }
                    ].map((preset) => {
                      const isSelected = Math.abs(sirenVolume - preset.val) < 0.05;
                      return (
                        <button
                          key={preset.val}
                          type="button"
                          disabled={isSirenMuted}
                          onClick={() => {
                            setLocalSirenVolume(preset.val);
                            setSirenVolume(preset.val);
                          }}
                          className={`py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 border ${
                            isSelected
                              ? 'bg-red-600 text-white border-red-700 shadow-sm scale-[1.02]'
                              : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <span>{preset.icon}</span>
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Test Siren Audio Section */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-600/10 via-rose-600/10 to-amber-600/10 border-2 border-red-500/40 dark:border-red-500/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-left">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all shrink-0 ${
                    isTestingSiren
                      ? 'bg-red-600 text-white shadow-lg animate-bounce'
                      : 'bg-red-100 dark:bg-red-950 text-red-600 border border-red-300 dark:border-red-800'
                  }`}>
                    <Volume2 className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>{getLang('🚨 සයිරන් නාදය පරික්ෂා කිරීම', '🚨 Test Siren Sound Now', '🚨 சைரன் ஒலியை சோதிக்கவும்')}</span>
                      {isTestingSiren && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                          PLAYING
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-zinc-400">
                      {getLang(
                        'සයිරන් නාදය ඔබගේ දුරකථනයේ නිවැරදිව වාදනය වන බව තහවුරු කර ගැනීමට මෙතනින් නාද කර බලන්න.',
                        'Press button to test how the emergency fire siren sounds on this device.',
                        'இந்த சாதனத்தில் அவசர சைரன் எவ்வாறு ஒலிக்கிறது என்பதை சோதிக்கவும்.'
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isTestingSiren) {
                      stopEmergencySiren();
                      setIsTestingSiren(false);
                    } else {
                      unlockAudio();
                      startEmergencySiren();
                      setIsTestingSiren(true);
                    }
                  }}
                  className={`w-full sm:w-auto px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95 ${
                    isTestingSiren
                      ? 'bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 text-white border-2 border-red-500'
                      : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>
                    {isTestingSiren
                      ? getLang('🛑 නවත්වන්න (Stop Sound)', '🛑 Stop Sound', '🛑 நிறுத்தவும்')
                      : getLang('🔊 සයිරන් නාදය අසන්න (Play Test Siren)', '🔊 Play Test Siren', '🔊 சைரன் ஒலிக்கவும்')}
                  </span>
                </button>
              </div>

              {/* Close / Done Button */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    stopEmergencySiren();
                    setIsTestingSiren(false);
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs sm:text-sm font-black shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {getLang('සම්පූර්ණයි (Done)', 'Done', 'முடிந்தது')}
                </button>
              </div>
            </div>
          )}

          {/* TAB: 2FA & DEVICE QUICK PIN SECURITY */}
          {activeTab === 'security_2fa' && (
            <div className="space-y-5 animate-in fade-in">

              {/* 1. Device-Specific 4-Digit PIN Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-900/15 via-teal-900/10 to-amber-950/10 dark:from-emerald-950/50 dark:via-teal-950/40 dark:to-amber-950/30 border-2 border-emerald-500/40 dark:border-emerald-500/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 rounded-2xl shadow-sm">
                      <Smartphone className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>{getLang('📱 Device Quick PIN (අංක 4ක PIN)', '📱 Device Quick PIN', '📱 சாதன விரைவு PIN')}</span>
                        <span className="text-[10px] bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30 font-black px-2 py-0.5 rounded-full">
                          {getLang('මෙම Device එකට පමණි', 'This Device Only', 'இந்த சாதனம் மட்டும்')}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-zinc-300">
                        {getLang(
                          'මීළඟ වතාවේදී හැඳුනුම්පත් අංකය හා මුරපදය නැවත නැවත ඇතුළත් නොකර, ඔබ කැමති අංක 4ක PIN එකක් මඟින් ක්ෂණිකව ලොග් වන්න.',
                          'Log in instantly next time with a 4-digit PIN instead of entering full NIC and password every time.',
                          'அடுத்த முறை முழு கடவுச்சொல்லை உள்ளிடாமல் 4 இலக்க PIN மூலம் விரைவாக நுழையவும்.'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* PIN Status Badge */}
                  <div className="self-start sm:self-center">
                    {hasStoredDevicePin ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200 text-xs font-black shadow-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{getLang('PIN සක්‍රීයයි (Active)', 'PIN Active', 'PIN செயலில் உள்ளது')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 text-xs font-black">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span>{getLang('PIN සකසා නැත', 'No PIN Set', 'PIN அமைக்கப்படவில்லை')}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Device PIN Action Buttons */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPinSetupModal(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>
                      {hasStoredDevicePin
                        ? getLang('🔢 PIN අංකය වෙනස් කරන්න', 'Change 4-Digit PIN', 'PIN மாற்றவும்')
                        : getLang('✨ නව 4-Digit PIN අංකයක් සකසන්න', 'Set Up 4-Digit PIN', 'PIN அமைக்கவும்')}
                    </span>
                  </button>

                  {hasStoredDevicePin && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('මෙම Device එකෙන් PIN අංකය ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න ද?')) {
                          clearDevicePin();
                          setHasStoredDevicePin(false);
                          setSaveSuccessMsg('🗑️ මෙම Device එකෙන් PIN අංකය ඉවත් කරන ලදී.');
                          setTimeout(() => setSaveSuccessMsg(null), 3000);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <span>🗑️ PIN ඉවත් කරන්න (Remove PIN)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Google Authenticator 2FA Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-900/10 via-teal-900/10 to-slate-900/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-slate-950/40 border-2 border-emerald-500/30 dark:border-emerald-500/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/20 dark:bg-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>Google Authenticator (2FA)</span>
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                          Two-Factor Auth
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {getLang(
                          'ඔබගේ ගිණුමට ලොග් වීමේදී මුරපදයට අමතරව 6-digit ආරක්ෂක කේතයක් ලබාදීම මගින් ගිණුම උපරිම ලෙස සුරක්ෂිත කරන්න.',
                          'Protect your account by requiring a 6-digit TOTP security code when signing in.',
                          'உள்நுழையும் போது 6-இலக்க பாதுகாப்பு குறியீட்டைக் கோருவதன் மூலம் உங்கள் கணக்கைப் பாதுகாக்கவும்.'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="self-start sm:self-center">
                    {user?.twoFactorEnabled ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200 text-xs font-black shadow-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{getLang('සක්‍රීයයි (Active)', 'Active & Protected', 'செயலில் உள்ளது')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 text-xs font-black">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span>{getLang('අක්‍රීයයි (Disabled)', 'Disabled', 'முடக்கப்பட்டுள்ளது')}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 2FA Action Buttons */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                  {!user?.twoFactorEnabled ? (
                    <button
                      type="button"
                      onClick={() => setShowGoogleAuthModal(true)}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 cursor-pointer transition-all active:scale-95"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>{getLang('Google Authenticator සක්‍රීය කරන්න', 'Enable Google Authenticator (2FA)', 'Google Authenticator ஐ இயக்கு')}</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                      {!showDisable2FAConfirm ? (
                        <button
                          type="button"
                          onClick={() => setShowDisable2FAConfirm(true)}
                          className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{getLang('2FA ආරක්ෂාව අක්‍රීය කරන්න', 'Disable 2FA', '2FA முடக்கு')}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800">
                          <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                            {getLang('2FA අක්‍රීය කිරීමට විශ්වාසද?', 'Disable 2FA?', 'நிச்சயமா?')}
                          </span>
                          <button
                            type="button"
                            onClick={handleDisable2FA}
                            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-black hover:bg-rose-700 transition-colors"
                          >
                            {getLang('ඔව්, අක්‍රීය කරන්න', 'Yes, Disable', 'ஆம்')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDisable2FAConfirm(false)}
                            className="px-2 py-1 bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-bold"
                          >
                            {getLang('නැත', 'Cancel', 'இல்லை')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {user?.twoFactorConfirmedAt && (
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{getLang('සක්‍රීය කළ දිනය:', 'Enabled on:', 'இயக்கப்பட்ட தேதி:')} {new Date(user.twoFactorConfirmedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c2419] border border-slate-200 dark:border-[#143d28] space-y-3 shadow-sm">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-600" />
                  <span>{getLang('Google Authenticator භාවිතා කරන්නේ කෙසේද?', 'How to use Google Authenticator?', 'Google Authenticator ஐ எவ்வாறு பயன்படுத்துவது?')}</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">1</div>
                    <p className="font-bold text-slate-900 dark:text-zinc-200">
                      {getLang('ඇප් එක Install කරන්න', 'Install the App', 'செயலியை நிறுவவும்')}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {getLang('Google Play Store හෝ Apple App Store වෙතින් Google Authenticator බාගත කරන්න.', 'Download Google Authenticator from Play Store or App Store.', 'Google Authenticator செயலியைப் பதிவிறக்கவும்.')}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">2</div>
                    <p className="font-bold text-slate-900 dark:text-zinc-200">
                      {getLang('QR කේතය Scan කරන්න', 'Scan the QR Code', 'QR குறியீட்டை ஸ்கேன் செய்க')}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {getLang('සක්‍රීය කිරීමේ බොත්තම ක්ලික් කර දිස්වන QR Code එක හෝ Secret Key එක ඇප් එකට එක්කරන්න.', 'Click Enable and scan the QR code using your authenticator app.', 'QR குறியீட்டை ஸ்கேன் செய்யவும்.')}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">3</div>
                    <p className="font-bold text-slate-900 dark:text-zinc-200">
                      {getLang('ආරක්ෂිතව ලොග් වන්න', 'Secure Login Every Time', 'பாதுகாப்பான உள்நுழைவு')}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {getLang('ලොග් වීමේදී ඔබගේ දුරකථනයේ දිස්වන තත්පර 30න් මාරුවන 6-digit අංකය ඇතුළත් කරන්න.', 'Enter the 6-digit TOTP code from your phone whenever signing in.', 'ஒவ்வொரு முறையும் 6 இலக்கக் குறியீட்டை உள்ளிடவும்.')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
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

      {/* Google Authenticator Setup Modal */}
      {showGoogleAuthModal && (
        <GoogleAuthSetupModal
          isOpen={showGoogleAuthModal}
          onClose={() => setShowGoogleAuthModal(false)}
          onEnableSuccess={handleEnable2FASuccess}
          userLabel={user?.nicNumber || user?.phone || user?.name || 'User'}
          language={language}
        />
      )}

      {/* Device Quick PIN Setup Modal */}
      {showPinSetupModal && user && (
        <DevicePinSetupModal
          isOpen={showPinSetupModal}
          onClose={() => setShowPinSetupModal(false)}
          currentUser={user}
          language={language}
          isChangeMode={hasStoredDevicePin}
          onPinConfigured={(updatedUser) => {
            setHasStoredDevicePin(true);
            if (onUpdateUser) {
              onUpdateUser(updatedUser);
            }
            setSaveSuccessMsg('✅ Device Quick PIN අංකය සාර්ථකව යොදන ලදී!');
            setTimeout(() => setSaveSuccessMsg(null), 3500);
          }}
        />
      )}

      {/* PWA Standalone Mobile App Install & Fullscreen Modal */}
      <PWAInstallModal
        isOpen={showPwaInstallModal}
        onClose={() => setShowPwaInstallModal(false)}
        language={language}
      />
    </div>
  );
};

