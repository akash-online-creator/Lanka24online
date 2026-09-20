import React, { useState, useEffect } from 'react';
import { User, Language, RegistrationConfig } from '../types';
import { translations } from '../data/translations';
import { AppLogo } from './AppLogo';
import { MedicalPlusBadge } from './MedicalPlusBadge';
import { RegistrationSuccessModal } from './RegistrationSuccessModal';
import { compressImageFile } from '../utils/imageCompressor';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; // ඔබගේ Firebase Auth Instance එක මෙතැනින් Import වේ
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
  Loader2
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

  // Photos State
  const [nicFrontPhoto, setNicFrontPhoto] = useState<string>('');
  const [nicBackPhoto, setNicBackPhoto] = useState<string>('');
  const [facePhoto, setFacePhoto] = useState<string>('');

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
    setLoading(true);

    try {
      const cleanNic = nicNumber.trim().toLowerCase();
      // NIC එක ඊමේල් එකක් බවට පරිවර්තනය කිරීම (NIC@sahayaseva.com)
      const userAuthEmail = `${cleanNic}@sahayaseva.com`;

      // 1. Firebase Auth හි ගිණුම සෑදීම (createUserWithEmailAndPassword)
      await createUserWithEmailAndPassword(auth, userAuthEmail, password);

      const fullFullName = `${surname} ${firstName} ${lastName}`.trim();
      const nicDigits = nicNumber.replace(/[^0-9]/g, '');
      const generatedUserId = nicDigits || Math.floor(100000000 + Math.random() * 900000000).toString();

      const currentLat = trackedLat ?? 6.9271;
      const currentLng = trackedLng ?? 79.8612;
      const resolvedLocationName = trackedLocationName || `${nearestTown || 'Sri Lanka'} (GPS: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)})`;

      // 2. ඩේටාබේස් එකේ (Firestore) සේව් වන පරිශීලක දත්ත Payload එක සාදා ගැනීම
      // මෙහි password / key / securityCode / tempCode සම්පූර්ණයෙන්ම ඉවත් කර ඇත.
      const userPayload: Omit<User, 'id' | 'registeredAt'> = {
        userId: generatedUserId,
        userNumericId: generatedUserId,
        credits: 0,
        name: fullFullName || firstName || 'පරිශීලක',
        surname,
        firstName,
        lastName,
        email: userAuthEmail,
        nicNumber,
        phone: whatsappNumber,
        address,
        birthDate,
        nearestTown,
        whatsappNumber,
        isPasswordChanged: false,
        role: 'user',
        status: 'pending',
        photoUrl: facePhoto || '',
        idCardPhotoUrl: nicFrontPhoto || '',
        nicFrontPhotoUrl: nicFrontPhoto || '',
        nicBackPhotoUrl: nicBackPhoto || '',
        facePhotoUrl: facePhoto || '',
        ipAddress: ipAddress || '112.134.120.45',
        registrationLat: currentLat,
        registrationLng: currentLng,
        registrationLocationName: resolvedLocationName,
        registrationAccuracy: trackedAccuracy ?? 12,
        locationTimestamp: new Date().toISOString(),
        deviceInfo: deviceInfo || 'Web Browser',
      };

      setPendingUserData(userPayload);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Firebase Auth / Registration Error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage('මෙම ජාතික හැඳුනුම්පත් අංකය (NIC) මගින් ஏற்கனவே ගිණුමක් සාදා ඇත.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage('මුරපදය අවම වශයෙන් අක්ෂර 6 කින් යුක්ත විය යුතුය.');
      } else {
        setErrorMessage(error.message || 'ලියාපදිංචි වීමේදී දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.');
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
            <div className="border-b border-emerald-200 pb-2.5">
              <h3 className="font-black text-emerald-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-700" />
                <span>ඡායාරූප උඩුගත කිරීම</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* 10. ජාතික හැඳුනුම්පත ඉදිරිපස ඡායාරූපය */}
              <div className="bg-white p-3.5 rounded-2xl border-2 border-emerald-200 space-y-2.5 text-center shadow-sm flex flex-col justify-between hover:border-emerald-400 transition-colors">
                <div>
                  <label className="block text-[11px] font-black text-emerald-950 mb-2">
                    10. ජාතික හැඳුනුම්පත ඉදිරිපස *
                  </label>
                  
                  <div className="w-full h-28 rounded-2xl overflow-hidden bg-gradient-to-b from-pink-50/50 via-white to-emerald-50/50 border-2 border-dashed border-pink-300/80 relative group mx-auto flex flex-col items-center justify-center p-2 shadow-inner">
                    {nicFrontPhoto && nicFrontPhoto.trim() !== '' ? (
                      <div className="relative w-full h-full">
                        <img
                          src={nicFrontPhoto}
                          alt="NIC Front"
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setNicFrontPhoto('')}
                          className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-md transition-colors"
                          title="ඉවත් කරන්න"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                        <MedicalPlusBadge size="md" showGlow animated />
                        <span className="text-[10px] font-black text-pink-700 tracking-tight">
                          ඉදිරිපස ඡායාරූපය
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <label className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-emerald-700 text-white text-xs font-black hover:bg-emerald-800 active:scale-95 cursor-pointer transition-all shadow-md">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{nicFrontPhoto ? 'වෙනස් කරන්න' : 'ඡායාරූපය තෝරන්න'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, setNicFrontPhoto)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 11. ජාතික හැඳුනුම්පත පිටුපස ඡායාරූපය */}
              <div className="bg-white p-3.5 rounded-2xl border-2 border-emerald-200 space-y-2.5 text-center shadow-sm flex flex-col justify-between hover:border-emerald-400 transition-colors">
                <div>
                  <label className="block text-[11px] font-black text-emerald-950 mb-2">
                    11. ජාතික හැඳුනුම්පත පිටුපස *
                  </label>
                  
                  <div className="w-full h-28 rounded-2xl overflow-hidden bg-gradient-to-b from-pink-50/50 via-white to-emerald-50/50 border-2 border-dashed border-pink-300/80 relative group mx-auto flex flex-col items-center justify-center p-2 shadow-inner">
                    {nicBackPhoto && nicBackPhoto.trim() !== '' ? (
                      <div className="relative w-full h-full">
                        <img
                          src={nicBackPhoto}
                          alt="NIC Back"
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setNicBackPhoto('')}
                          className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-md transition-colors"
                          title="ඉවත් කරන්න"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                        <MedicalPlusBadge size="md" showGlow animated />
                        <span className="text-[10px] font-black text-pink-700 tracking-tight">
                          පිටුපස ඡායාරූපය
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <label className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-emerald-700 text-white text-xs font-black hover:bg-emerald-800 active:scale-95 cursor-pointer transition-all shadow-md">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{nicBackPhoto ? 'වෙනස් කරන්න' : 'ඡායාරූපය තෝරන්න'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, setNicBackPhoto)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 12. ඔබගේ පැහැදිලි ඡායාරූපයක් */}
              <div className="bg-white p-3.5 rounded-2xl border-2 border-emerald-200 space-y-2.5 text-center shadow-sm flex flex-col justify-between hover:border-emerald-400 transition-colors">
                <div>
                  <label className="block text-[11px] font-black text-emerald-950 mb-2">
                    12. ඔබගේ පැහැදිලි ඡායාරූපයක් *
                  </label>
                  
                  <div className="w-full h-28 rounded-2xl overflow-hidden bg-gradient-to-b from-pink-50/50 via-white to-emerald-50/50 border-2 border-dashed border-pink-300/80 relative group mx-auto flex flex-col items-center justify-center p-2 shadow-inner">
                    {facePhoto && facePhoto.trim() !== '' ? (
                      <div className="relative w-full h-full">
                        <img
                          src={facePhoto}
                          alt="User Photo"
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setFacePhoto('')}
                          className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-md transition-colors"
                          title="ඉවත් කරන්න"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                        <MedicalPlusBadge size="md" showGlow animated />
                        <span className="text-[10px] font-black text-pink-700 tracking-tight">
                          පැතිකඩ ඡායාරූපය
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <label className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-emerald-700 text-white text-xs font-black hover:bg-emerald-800 active:scale-95 cursor-pointer transition-all shadow-md">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{facePhoto ? 'වෙනස් කරන්න' : 'ඡායාරූපය තෝරන්න'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, setFacePhoto)}
                    className="hidden"
                  />
                </label>
              </div>
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
    </div>
  );
};
