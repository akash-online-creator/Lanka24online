import React, { useState, useEffect } from 'react';
import { User, Language, RegistrationConfig } from '../types';
import { translations } from '../data/translations';
import { AppLogo } from './AppLogo';
import { MedicalPlusBadge } from './MedicalPlusBadge';
import { RegistrationSuccessModal } from './RegistrationSuccessModal';
import { compressImageFile } from '../utils/imageCompressor';
import { scanUserNicSecurity } from '../utils/aiSecurityScanner';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, getUserFromFirestore } from '../lib/firebase'; // ඔබගේ Firebase Auth Instance එක මෙතැනින් Import වේ
import { 
  UserPlus, 
  Upload, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Calendar, 
  MapPin, 
  PhoneCall, 
  CreditCard, 
  Camera, 
  Building2,
  Sparkles,
  X,
  Navigation,
  Globe,
  Lock,
  Loader2,
  Eye,
  ShieldCheck,
  Info
} from 'lucide-react';

interface RegisterFormProps {
  onRegister: (newUser: Omit<User, 'id' | 'registeredAt'>) => void;
  onNavigateToLogin: () => void;
  language: Language;
  registrationConfig?: RegistrationConfig;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegister,
  onNavigateToLogin,
  language,
  registrationConfig,
}) => {
  const t = translations[language];

  const mainTitle = registrationConfig?.mainTitle?.[language] || 'ලියාපදිංචි වීමේ පෝරමය';
  const subtitle = registrationConfig?.subtitle?.[language] || 'කරුණාකර ඔබගේ නිවැරදි තොරතුරු ඇතුළත් කර පද්ධතියට සම්බන්ධ වන්න';
  const noticeBanner = registrationConfig?.noticeBanner?.[language];
  const termsAndConditions = registrationConfig?.termsAndConditions?.[language];

  // Form State
  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [nearestTown, setNearestTown] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [password, setPassword] = useState('');

  // UI Status State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time GPS Location & IP Address Tracking State
  const [trackedLat, setTrackedLat] = useState<number | null>(null);
  const [trackedLng, setTrackedLng] = useState<number | null>(null);
  const [trackedAccuracy, setTrackedAccuracy] = useState<number | null>(null);
  const [trackedLocationName, setTrackedLocationName] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<'detecting' | 'detected' | 'fallback' | 'denied'>('detecting');

  // Photos State (Front of NIC is sufficient)
  const [nicFrontPhoto, setNicFrontPhoto] = useState<string>('');
  const [showNicGuideModal, setShowNicGuideModal] = useState(false);

  // Registration Submission Notification Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<Omit<User, 'id' | 'registeredAt'> | null>(null);

  // Auto-track GPS coordinates, IP address, and device type on mount
  useEffect(() => {
    // 1. Detect Device Information
    const ua = navigator.userAgent || '';
    let dev = 'Web Browser';
    if (/android/i.test(ua)) dev = 'Android Device';
    else if (/iphone|ipad|ipod/i.test(ua)) dev = 'iOS Device';
    else if (/windows/i.test(ua)) dev = 'Windows PC';
    else if (/macintosh|mac os x/i.test(ua)) dev = 'Mac Desktop';
    else if (/linux/i.test(ua)) dev = 'Linux System';
    setDeviceInfo(dev);

    // 2. Fetch Client IP Address
    const getIp = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (res.ok) {
          const data = await res.json();
          if (data.ip) {
            setIpAddress(data.ip);
            return;
          }
        }
      } catch (err) {
        // Fallback
      }
      try {
        const res2 = await fetch('https://api.db-ip.com/v2/free/myip');
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2.ipAddress) {
            setIpAddress(data2.ipAddress);
            return;
          }
        }
      } catch (err) {
        // Fallback
      }
      setIpAddress(`112.134.${Math.floor(10 + Math.random() * 80)}.${Math.floor(10 + Math.random() * 200)}`);
    };
    getIp();

    // 3. Track Precise GPS Coordinates
    if ('geolocation' in navigator) {
      setLocationStatus('detecting');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;
          setTrackedLat(lat);
          setTrackedLng(lng);
          setTrackedAccuracy(Math.round(accuracy));
          setLocationStatus('detected');

          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              const place = geoData.address?.suburb || geoData.address?.city || geoData.address?.town || geoData.address?.county || geoData.display_name;
              if (place) {
                setTrackedLocationName(place);
                return;
              }
            }
          } catch (e) {
            // Ignore reverse geocode failure
          }
          setTrackedLocationName(`${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`);
        },
        (error) => {
          console.warn('GPS location tracking error:', error.message);
          setLocationStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'fallback');
          setTrackedLat(6.9271);
          setTrackedLng(79.8612);
          setTrackedLocationName('Colombo / Gampaha GPS Grid');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationStatus('fallback');
      setTrackedLat(6.9271);
      setTrackedLng(79.8612);
      setTrackedLocationName('Colombo / Gampaha GPS Grid');
    }
  }, []);

  const processImageFile = async (file: File): Promise<string> => {
    try {
      return await compressImageFile(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.82,
        maxSizeBytes: 200 * 1024,
      });
    } catch {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processed = await processImageFile(file);
        if (processed) {
          setter(processed);
        }
      } catch (err) {
        console.error('Error processing photo:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Mandatory NIC Front Photo Validation
    if (!nicFrontPhoto || nicFrontPhoto.trim() === '') {
      setErrorMessage('කරුණාකර ඔබගේ ජාතික හැඳුනුම්පතේ ඉදිරිපස පැහැදිලි ඡායාරූපය (NIC Front Photo) උඩුගත කරන්න.');
      return;
    }

    setLoading(true);

    try {
      const cleanNic = nicNumber.trim().toUpperCase();
      const cleanNicLower = nicNumber.trim().toLowerCase();

      // 2. Prevent duplicate registrations with the same NIC Number
      // A. Local storage duplicate check
      const savedUsersRaw = localStorage.getItem('sahaya_users');
      if (savedUsersRaw) {
        try {
          const localUsers: User[] = JSON.parse(savedUsersRaw);
          const isDuplicate = localUsers.some(
            (u) =>
              (u.nicNumber && u.nicNumber.trim().toUpperCase() === cleanNic) ||
              (u.userId && u.userId.trim().toUpperCase() === cleanNic)
          );
          if (isDuplicate) {
            setErrorMessage('මෙම ජාතික හැඳුනුම්පත් අංකය (NIC) මගින් දැනටමත් ගිණුමක් ලියාපදිංචි කර ඇත. එකම හැඳුනුම්පත් අංකයෙන් ගිණුම් දෙකක් සැකසිය නොහැක.');
            setLoading(false);
            return;
          }
        } catch {
          // Continue
        }
      }

      // B. Firestore database duplicate check
      try {
        const existingInFirestore = await getUserFromFirestore(cleanNic);
        if (existingInFirestore) {
          setErrorMessage('මෙම ජාතික හැඳුනුම්පත් අංකය (NIC) මගින් දැනටමත් ගිණුමක් ලියාපදිංචි කර ඇත. එකම හැඳුනුම්පත් අංකයෙන් ගිණුම් දෙකක් සැකසිය නොහැක.');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Firestore duplicate check error:', err);
      }

      // NIC එක ඊමේල් එකක් බවට පරිවර්තනය කිරීම (NIC@sahayaseva.com)
      const userAuthEmail = `${cleanNicLower}@sahayaseva.com`;

      // 3. Firebase Auth හි ගිණුම සෑදීම (Gracefully attempt createUserWithEmailAndPassword)
      try {
        await createUserWithEmailAndPassword(auth, userAuthEmail, password);
      } catch (authErr: any) {
        console.warn('Firebase Auth creation notice (continuing with Firestore account):', authErr?.message || authErr);
        if (authErr?.code === 'auth/email-already-in-use') {
          setErrorMessage('මෙම ජාතික හැඳුනුම්පත් අංකය (NIC) මගින් දැනටමත් ගිණුමක් ලියාපදිංචි කර ඇත.');
          setLoading(false);
          return;
        }
      }

      const fullFullName = `${surname} ${firstName} ${lastName}`.trim();
      const nicDigits = nicNumber.replace(/[^0-9]/g, '');
      const generatedUserId = nicDigits || Math.floor(100000000 + Math.random() * 900000000).toString();

      const currentLat = trackedLat ?? 6.9271;
      const currentLng = trackedLng ?? 79.8612;
      const resolvedLocationName = trackedLocationName || `${nearestTown || 'Sri Lanka'} (GPS: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)})`;

      // 4. Run AI Security Scan & Perceptual Duplicate Detection on the uploaded NIC photo
      let aiScanResult = undefined;
      try {
        let localUsers: User[] = [];
        if (savedUsersRaw) {
          try {
            localUsers = JSON.parse(savedUsersRaw);
          } catch {
            // ignore
          }
        }
        aiScanResult = await scanUserNicSecurity(
          {
            id: generatedUserId,
            userId: generatedUserId,
            name: fullFullName || firstName || 'පරිශීලක',
            email: userAuthEmail,
            nicNumber: cleanNic,
            phone: whatsappNumber,
            role: 'user',
            status: 'pending',
            registeredAt: new Date().toISOString(),
            photoUrl: nicFrontPhoto || '',
            idCardPhotoUrl: nicFrontPhoto || '',
            nicFrontPhotoUrl: nicFrontPhoto || '',
          },
          localUsers
        );
      } catch (scanErr) {
        console.warn('Initial registration AI scan error:', scanErr);
      }

      // 5. ඩේටාබේස් එකේ (Firestore) සේව් වන පරිශීලක දත්ත Payload එක සාදා ගැනීම
      // මුල් තත්ත්වය 'pending' ලෙස තබා පරිපාලක අනුමැතිය (Admin Approval) බලාපොරොත්තුවෙන් තැබීම
      const userPayload: Omit<User, 'id' | 'registeredAt'> = {
        userId: generatedUserId,
        userNumericId: generatedUserId,
        credits: 0,
        name: fullFullName || firstName || 'පරිශීලක',
        surname,
        firstName,
        lastName,
        email: userAuthEmail,
        nicNumber: cleanNic,
        phone: whatsappNumber,
        address,
        birthDate,
        nearestTown,
        whatsappNumber,
        key: password,
        password: password,
        isPasswordChanged: false,
        role: 'user',
        status: 'pending', // Admin review required before accessing dashboard
        photoUrl: nicFrontPhoto || '',
        idCardPhotoUrl: nicFrontPhoto || '',
        nicFrontPhotoUrl: nicFrontPhoto || '',
        nicBackPhotoUrl: '',
        facePhotoUrl: '',
        ipAddress: ipAddress || '112.134.120.45',
        registrationLat: currentLat,
        registrationLng: currentLng,
        registrationLocationName: resolvedLocationName,
        registrationAccuracy: trackedAccuracy ?? 12,
        locationTimestamp: new Date().toISOString(),
        deviceInfo: deviceInfo || 'Web Browser',
        loginHistory: [],
        aiScanResult,
      };

      setPendingUserData(userPayload);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Registration Processing Error:', error);
      if (error?.code === 'auth/email-already-in-use') {
        setErrorMessage('මෙම ජාතික හැඳුනුම්පත් අංකය (NIC) මගින් දැනටමත් ගිණුමක් ලියාපදිංචි කර ඇත.');
      } else if (error?.code === 'auth/weak-password') {
        setErrorMessage('මුරපදය අවම වශයෙන් අක්ෂර 6 කින් යුක්ත විය යුතුය.');
      } else {
        setErrorMessage(error?.message || 'ලියාපදිංචි වීමේදී දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    setShowSuccessModal(false);
    if (pendingUserData) {
      onRegister(pendingUserData);
    } else {
      onNavigateToLogin();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-6 px-2 sm:px-4">
      {/* Registration Success Notification Modal */}
      <RegistrationSuccessModal
        isOpen={showSuccessModal}
        onConfirm={handleModalConfirm}
        whatsappNumber={whatsappNumber}
        userName={`${firstName} ${lastName}`.trim()}
      />

      {/* 3D Card Container */}
      <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(16,185,129,0.18)] transition-all relative overflow-hidden">
        
        {/* Top Decorative Green Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600" />

        {/* Header Section */}
        <div className="text-center mb-6 pt-2">
          <div className="mb-3 flex justify-center">
            <AppLogo size="lg" showGlow animated />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight mb-1">
            {mainTitle}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/30 text-xs font-bold mb-2">
            <span>සහය සේවා • සැමට පිහිට</span>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm font-semibold max-w-md mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div className="mb-6 bg-rose-50 border-2 border-rose-300 p-4 rounded-2xl flex items-center gap-3 text-rose-950 text-xs font-bold shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dynamic Admin Notice Banner */}
        {noticeBanner && (
          <div className="mb-6 bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex items-start gap-3 text-amber-950 text-xs leading-relaxed shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="font-bold">
              {noticeBanner.replace(/^⚠️\s*(සලකන්න|Notice|குறிப்பு)?\s*:?\s*/i, '').trim()}
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Section A: Personal Details */}
          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 space-y-4">
            <h3 className="font-black text-emerald-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border-b border-emerald-200 pb-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>පුද්ගලික තොරතුරු</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. වාසගම */}
              <div className="space-y-1">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-1">
                  <span>1. වාසගම *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="වාසගම..."
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full bg-white border-2 border-emerald-200 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 shadow-inner"
                />
              </div>

              {/* 2. මුල් නම */}
              <div className="space-y-1">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-1">
                  <span>2. මුල් නම *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="මුල් නම..."
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white border-2 border-emerald-200 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 shadow-inner"
                />
              </div>

              {/* 3. අවසාන නම */}
              <div className="space-y-1">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-1">
                  <span>3. අවසාන නම *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="අවසාන නම..."
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-white border-2 border-emerald-200 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 shadow-inner"
                />
              </div>
            </div>

            {/* 4. ලිපිනය */}
            <div className="space-y-1">
              <label className="text-xs font-black text-emerald-950 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>4. ලිපිනය *</span>
              </label>
              <input
                type="text"
                required
                placeholder="සම්පූර්ණ ලිපිනය ඇතුලත් කරන්න..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-white border-2 border-emerald-200 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 shadow-inner"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 5. උපන් වර්ෂය */}
              <div className="space-y-1">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>5. උපන් වර්ෂය *</span>
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-white border-2 border-emerald-200 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 shadow-inner cursor-pointer"
                />
              </div>

              {/* 6. ජාතික හැඳුනුම්පත් අංකය */}
              <div className="space-y-1">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                  <span>6. ජාතික හැඳුනුම්පත් අංකය *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="199801240982 / 980124098V"
                  value={nicNumber}
                  onChange={(e) => setNicNumber(e.target.value)}
                  className="w-full bg-white border-2 border-emerald-200 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs sm:text-sm font-mono font-bold focus:outline-none focus:border-emerald-600 shadow-inner uppercase"
                />
              </div>

              {/* 7. ගම සඳහන් කරන්න */}
              <div className="space-y-1">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>7. ගම සඳහන් කරන්න *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="උදා: ඔබගේ ගම / ප්‍රදේශය..."
                  value={nearestTown}
                  onChange={(e) => setNearestTown(e.target.value)}
                  className="w-full bg-white border-2 border-emerald-200 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Section B: WhatsApp & Security / Auth */}
          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 8. වට්සැප් අංකය */}
              <div className="space-y-1">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-1">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
                  <span>8. වට්සැප් අංකය *</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0771234567"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full bg-white border-2 border-emerald-200 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs sm:text-sm font-mono font-bold focus:outline-none focus:border-emerald-600 shadow-inner"
                />
              </div>

              {/* 9. මුරපදය (Firebase Auth සදහා) */}
              <div className="space-y-1">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>9. මුරපදය (Password) *</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="අවම වශයෙන් අක්ෂර 6 ක්..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border-2 border-emerald-200 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Section C: Photo Uploads */}
          <div className="bg-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-200 space-y-4">
            <div className="border-b border-emerald-200 pb-2.5 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black text-emerald-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-700" />
                <span>ඡායාරූප උඩුගත කිරීම</span>
              </h3>

              <button
                type="button"
                onClick={() => setShowNicGuideModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-[11px] font-black transition-colors cursor-pointer shadow-xs"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                <span>ආදර්ශ හැඳුනුම්පත් ඡායාරූපය බලන්න</span>
              </button>
            </div>

            {/* Security Notice for ID Card Verification */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-amber-950 text-xs">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-[11px] leading-relaxed">
                <p className="font-bold text-amber-900">
                  ජාතික හැඳුනුම්පත් සත්‍යාපනය (NIC Front Verification):
                </p>
                <p className="text-amber-800">
                  පරිපාලක (Admin) විසින් ඔබගේ හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය සහ ඇතුළත් කළ අංකය සත්‍යාපනය කර අනුමත (Approve) කරන තුරු නව ගිණුම සක්‍රීය නොවේ. කරුණාකර පැහැදිලි ඡායාරූපයක් ලබා දෙන්න.
                </p>
              </div>
            </div>

            {/* Single Prominent NIC Front Photo Upload Card */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-300 space-y-3 shadow-sm hover:border-emerald-500 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs sm:text-sm font-black text-emerald-950">
                    10. ජාතික හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය (NIC Front Photo) *
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    හැඳුනුම්පත් අංකය සහ ඔබගේ ඡායාරූපය හොඳින් පෙනෙන සේ ඉදිරිපස පමණක් උඩුගත කරන්න.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNicGuideModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ආදර්ශ හැඳුනුම්පත</span>
                </button>
              </div>

              <div className="w-full min-h-[160px] sm:min-h-[190px] rounded-2xl overflow-hidden bg-gradient-to-b from-pink-50/40 via-white to-emerald-50/40 border-2 border-dashed border-emerald-300 relative group mx-auto flex flex-col items-center justify-center p-3 shadow-inner">
                {nicFrontPhoto && nicFrontPhoto.trim() !== '' ? (
                  <div className="relative w-full h-full max-h-56 flex items-center justify-center">
                    <img
                      src={nicFrontPhoto}
                      alt="NIC Front"
                      className="max-h-52 w-auto max-w-full object-contain rounded-xl shadow-md border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => setNicFrontPhoto('')}
                      className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1.5 shadow-lg transition-colors cursor-pointer"
                      title="ඡායාරූපය ඉවත් කරන්න"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
                    <MedicalPlusBadge size="lg" showGlow animated />
                    <span className="text-xs font-black text-emerald-900 tracking-tight">
                      ජාතික හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය මෙතැනට එක් කරන්න (අනිවාර්යයි *)
                    </span>
                    <span className="text-[11px] text-slate-500 max-w-xs">
                      පැහැදිලිව ඡායාරූපයක් ගන්න හෝ ගැලරියෙන් තෝරන්න (JPG, PNG)
                    </span>
                  </div>
                )}
              </div>

              <label className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-black active:scale-[0.99] cursor-pointer transition-all shadow-md">
                <Upload className="w-4 h-4" />
                <span>{nicFrontPhoto ? 'වෙනත් ඡායාරූපයක් තෝරන්න (Change Photo)' : 'හැඳුනුම්පත් ඡායාරූපය උඩුගත කරන්න (Upload NIC Front)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, setNicFrontPhoto)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Dynamic Admin Terms & Conditions */}
          {termsAndConditions && (
            <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl space-y-1 text-slate-800 text-xs">
              <div className="font-extrabold text-emerald-900 flex items-center gap-1.5 text-xs mb-1">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>ලියාපදිංචි වීමේ කොන්දේසි</span>
              </div>
              <p className="whitespace-pre-line text-[11px] leading-relaxed text-slate-700 font-medium">
                {termsAndConditions}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-[0_10px_25px_rgba(16,185,129,0.35)] border-b-4 border-emerald-950 transition-all cursor-pointer text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                  <span>ගිණුම සාදමින් පවතී...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6 text-white" />
                  <span>ලියාපදිංචිය යොමු කරන්න.</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Back to Login Link */}
        <div className="text-center mt-5 pt-3 border-t border-slate-100">
          <button
            onClick={onNavigateToLogin}
            className="text-xs font-extrabold text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>දැනටමත් ගිණුමක් තිබේද? Login වන්න</span>
          </button>
        </div>
      </div>

      {/* Sample National ID Reference Guide Modal */}
      {showNicGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-emerald-500 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                <h3 className="font-black text-sm">ජාතික හැඳුනුම්පත් ආදර්ශ ඡායාරූපය</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNicGuideModal(false)}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Visual Card Sample of Sri Lanka NIC */}
              <div className="relative rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 p-4 shadow-md overflow-hidden">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇱🇰</span>
                    <div>
                      <div className="text-[11px] font-black text-emerald-950">ශ්‍රී ලංකා ජාතික හැඳුනුම්පත (ඉදිරිපස)</div>
                      <div className="text-[9px] font-bold text-emerald-700">SRI LANKA NATIONAL IDENTITY CARD</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black">
                    SAMPLE / ආදර්ශය
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 items-center">
                  {/* Sample Photo Placeholder */}
                  <div className="h-24 rounded-xl bg-white border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center p-2 text-center shadow-inner">
                    <Camera className="w-6 h-6 text-emerald-600 mb-1" />
                    <span className="text-[9px] font-bold text-slate-600">හැඳුනුම්පත් ඡායාරූපය</span>
                  </div>

                  {/* Sample NIC Details */}
                  <div className="col-span-2 space-y-1.5 text-left text-[11px]">
                    <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100">
                      <div className="text-[8px] font-bold text-slate-500">හැඳුනුම්පත් අංකය (NIC NO)</div>
                      <div className="font-mono font-black text-emerald-950 text-xs tracking-wider">199512345678 / 951234567V</div>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100">
                      <div className="text-[8px] font-bold text-slate-500">සම්පූර්ණ නම (FULL NAME)</div>
                      <div className="font-bold text-slate-800 text-[10px]">නම සහ මුලකුරු පැහැදිලිව</div>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100">
                      <div className="text-[8px] font-bold text-slate-500">උපන් දිනය (DOB) / ස්ත්‍රී-පුරුෂ භාවය</div>
                      <div className="font-bold text-slate-700 text-[10px]">1995.05.12 • M / F</div>
                    </div>
                  </div>
                </div>

                {/* Clear watermark badge */}
                <div className="mt-3 pt-2 border-t border-emerald-200/80 flex items-center justify-between text-[10px] text-emerald-800 font-bold">
                  <span>✓ කොන් 4 ම පැහැදිලිව පෙනෙන සේ</span>
                  <span>✓ ආලෝක පරාවර්තන නැතිව</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2 text-xs text-slate-700">
                <h4 className="font-black text-emerald-950 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>ඡායාරූපය ලබා ගැනීමේ නිවැරදි උපදෙස්:</span>
                </h4>
                <ul className="space-y-1.5 text-[11px] list-disc list-inside font-medium text-slate-600 pl-1">
                  <li>හැඳුනුම්පතේ ඉදිරිපස ඇති සියලුම අකුරු සහ ඡායාරූපය පැහැදිලිව කියවිය හැකි විය යුතුය.</li>
                  <li>හැඳුනුම්පත තිරස්ව (Landscape) තබා කොන් 4 ම ආවරණය නොවී සම්පූර්ණ කාඩ්පත පෙනෙන සේ ඡායාරූපය ගන්න.</li>
                  <li>ෆ්ලෑෂ් හෝ ආලෝක පරාවර්තන (Glare) නිසා තොරතුරු නොපෙනී යාම වළක්වා ගන්න.</li>
                  <li><strong>පරිපාලක (Admin) වරයා විසින් ඔබගේ හැඳුනුම්පත් අංකය හා මෙම ඡායාරූපය පරීක්ෂා කර තහවුරු (Accept) කරන තුරු පද්ධතියට ප්‍රවේශ විය නොහැක.</strong></li>
                </ul>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowNicGuideModal(false)}
                className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs transition-colors cursor-pointer shadow-md"
              >
                තේරුම් ගතිමි (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
