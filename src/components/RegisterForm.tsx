import React, { useState, useEffect, useRef } from 'react';
import { User, Language, Theme } from '../types';
import { translations } from '../data/translations';
import { 
  SRI_LANKA_DISTRICTS, 
  SRI_LANKA_POLICE_DIVISIONS 
} from '../data/sriLankaGeoData';
import { compressImageFile } from '../utils/imageCompressor';
import { 
  User as UserIcon, 
  CreditCard, 
  Phone, 
  MapPin, 
  Lock, 
  Upload, 
  CheckCircle2, 
  ArrowLeft, 
  Loader2, 
  FileText, 
  Eye, 
  EyeOff, 
  X, 
  AlertTriangle,
  HelpCircle,
  Camera
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { MedicalPlusBadge } from './MedicalPlusBadge';
import { FontSizeController } from './FontSizeController';
import { NicSpecimenCard } from './NicSpecimenCard';
// ✅ නිවැරදි කළ කේතය (පේළිය 30):
const getSystemTermsAndConditions = async (): Promise<string> => 
  '1. ව්‍යාජ විස්තර ඇතුළත් කිරීම තහනම්ය.\n2. බ්ලොක් කළ ගිණුම්වල IP, NIC, දුරකථන සහ Gmail නැවත ලියාපදිංචි විය නොහැක.\n3. සාමකාමී සහ සත්‍ය සේවාවන් සඳහා පමණක් පද්ධතිය භාවිතා කරන්න.';

interface RegisterFormProps {
  onRegister?: (newUser: User) => void;
  onRegisterSuccess?: (newUser: User) => void;
  onNavigateToLogin: () => void;
  onNavigateToIssues?: () => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  theme?: Theme;
  toggleTheme?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegister,
  onRegisterSuccess,
  onNavigateToLogin,
  onNavigateToIssues,
  language,
  setLanguage,
  theme = 'light',
  toggleTheme,
}) => {
  const t = (translations[language] || translations.si) as any;

  // 10 Key Profile State Variables
  const [fullName, setFullName] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Gampaha');
  const [selectedPoliceDivision, setSelectedPoliceDivision] = useState('Katunayake');
  const [address, setAddress] = useState('');
  const [key, setKey] = useState(''); // Password / Pin
  const [confirmKey, setConfirmKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Photos State (Front of NIC is sufficient)
  const [nicFrontPhoto, setNicFrontPhoto] = useState<string>('');

  const nicFileInputRef = useRef<HTMLInputElement | null>(null);
  const nicCameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);

  // UI Flow & Validation State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNicGuideModal, setShowNicGuideModal] = useState(false);
  const [showPhoneHelpModal, setShowPhoneHelpModal] = useState(false);
  const [showPasswordHelpModal, setShowPasswordHelpModal] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState<string>('');

  // Load Dynamic System Terms & Conditions from Firebase
  useEffect(() => {
    let isMounted = true;
    getSystemTermsAndConditions()
      .then((terms) => {
        if (isMounted && terms) {
          setTermsAndConditions(terms);
        }
      })
      .catch((err) => {
        console.warn('System terms load notice:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Update Police Divisions list when District changes
  const availableDivisions = SRI_LANKA_POLICE_DIVISIONS[selectedDistrict] || [];
  useEffect(() => {
    if (availableDivisions.length > 0 && !availableDivisions.includes(selectedPoliceDivision)) {
      setSelectedPoliceDivision(availableDivisions[0]);
    }
  }, [selectedDistrict, availableDivisions, selectedPoliceDivision]);

  // NIC Helper Validator & Gender Evaluator
  const evaluateNicInfo = (nic: string) => {
    const clean = nic.trim().toUpperCase();
    if (!clean) return null;

    let birthYear: number | null = null;
    let dayOfYear: number | null = null;
    let gender: 'male' | 'female' = 'male';

    if (/^[0-9]{9}[VX]$/.test(clean)) { birthYear = 1900 + parseInt(clean.substring(0, 2), 10); dayOfYear = parseInt(clean.substring(2, 5), 10); } else if (/^[0-9]{12}$/.test(clean)) {
      birthYear = parseInt(clean.substring(0, 4), 10);
      dayOfYear = parseInt(clean.substring(4, 7), 10);
    }

    if (dayOfYear !== null) {
      if (dayOfYear > 500) {
        gender = 'female';
        dayOfYear = dayOfYear - 500;
      }
      return { valid: true, birthYear, gender, cleanNic: clean };
    }

    return { valid: false, cleanNic: clean };
  };

  const nicInfo = evaluateNicInfo(nicNumber);

  // Password / Key Strength Evaluator (Minimum 6 Characters)
  const isKeyValid = key.trim().length >= 6;
  const doKeysMatch = key === confirmKey && key.trim() !== '';

  // Phone Sanitizer for Sri Lankan Numbers
  const sanitizePhone = (val: string) => {
    let clean = val.replace(/[^0-9+]/g, '');
    if (clean.startsWith('+94')) {
      clean = '0' + clean.substring(3);
    } else if (clean.startsWith('94') && clean.length === 11) {
      clean = '0' + clean.substring(2);
    }
    return clean;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizePhone(e.target.value);
    setWhatsappPhone(sanitized);
  };

  // Image Compressor & Light Data URL Generator
  const processImageFile = async (file: File): Promise<string> => {
    try {
      return await compressImageFile(file, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
        maxSizeMB: 0.5,
      });
    } catch {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessingPhoto(true);
        setErrorMessage(null);
        const processed = await processImageFile(file);
        setter(processed);
      } catch (err) {
        console.error('Error processing photo:', err);
        setErrorMessage('ඡායාරූපය සැකසීමේදී දෝෂයක් සිදුවිය. කරුණාකර වෙනත් ඡායාරූපයක් තෝරන්න.');
      } finally {
        setIsProcessingPhoto(false);
      }
    }
  };

  // Form Submission & Account Creation Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Mandatory NIC Front Photo Validation
    if (!nicFrontPhoto || nicFrontPhoto.trim() === '') {
      setErrorMessage('කරුණාකර ඔබගේ ජාතික හැඳුනුම්පතේ ඉදිරිපස පැහැදිලි ඡායාරූපය (NIC Front Photo) උඩුගත කරන්න.');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    // 2. Full Name Validation
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMessage('කරුණාකර ඔබගේ සම්පූර්ණ නම නිවැරදිව ඇතුළත් කරන්න (අවම වශයෙන් අකුරු 3ක්).');
      return;
    }

    // 3. NIC Number Validation
    if (!nicInfo || !nicInfo.valid) {
      setErrorMessage('කරුණාකර නිවැරදි ජාතික හැඳුනුම්පත් අංකයක් ඇතුළත් කරන්න (පැරණි: 970181547V හෝ නව: 199701815470).');
      return;
    }

    // 4. Phone Number Validation
    const cleanPhone = whatsappPhone.trim();
    if (!/^(07[0-9]{8}|01[0-9]{8}|0[0-9]{9})$/.test(cleanPhone)) {
      setErrorMessage('කරුණාකර නිවැරදි දුරකථන / WhatsApp අංකයක් ඇතුළත් කරන්න (උදා: 0771234567).');
      return;
    }

    // 5. Address Validation
    if (!address.trim() || address.trim().length < 5) {
      setErrorMessage('කරුණාකර ඔබගේ ස්ථීර ලිපිනය ඇතුළත් කරන්න.');
      return;
    }

    // 6. Security Key / Password Validation
    if (!isKeyValid) {
      setErrorMessage('මුරපදය සඳහා අවම වශයෙන් අකුරු හෝ අංක 6ක් ඇතුළත් කරන්න.');
      return;
    }

    if (key !== confirmKey) {
      setErrorMessage('තහවුරු කිරීමේ මුරපදය නොගැලපේ. කරුණාකර නැවත පරීක්ෂා කරන්න.');
      return;
    }

    setLoading(true);

    try {
      const nowStr = new Date().toISOString();
      const cleanNic = nicInfo.cleanNic;

      // Primary User Profile Model
      const newUser: User = {
        id: `usr_${Date.now()}`,
        userId: cleanNic,
        nicNumber: cleanNic,
        nic: cleanNic,
        name: fullName.trim(),
        phone: cleanPhone,
        whatsappPhone: cleanPhone,
        address: address.trim(),
        district: selectedDistrict,
        policeDivision: selectedPoliceDivision,
        gender: nicInfo.gender || 'male',
        role: 'user',
        status: 'pending',
        credits: 50, // 50 Welcome Free Credits
        trustScore: 85,
        rating: 5.0,
        completedHelpCount: 0,
        registeredAt: nowStr,
        createdAt: nowStr,
        password: key.trim(),
        key: key.trim() as any,
        temporaryPassword: '',
        isTemporaryPassword: false,
        isPasswordChanged: true,
        photoUrl: nicFrontPhoto || '',
        idCardPhotoUrl: nicFrontPhoto || '',
        nicFrontPhotoUrl: nicFrontPhoto || '',
        nicBackPhotoUrl: '',
        facePhotoUrl: '',
      };

      const registerCallback = onRegister || onRegisterSuccess;
      if (typeof registerCallback === 'function') {
        registerCallback(newUser);
      } else {
        console.warn('Neither onRegister nor onRegisterSuccess was provided');
      }
    } catch (err: any) {
      console.error('Registration processing error:', err);
      setErrorMessage(err.message || 'ලියාපදිංචි කිරීමේදී දෝෂයක් සිදුවිය. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setLoading(false);
    }
  };

  // Localized Titles
  const mainTitle = language === 'en' 
    ? 'Create New Member Account' 
    : language === 'ta' 
    ? 'புதிய உறுப்பினர் கணக்கை உருவாக்கவும்' 
    : 'නව සාමාජික ගිණුමක් සකසන්න';

  const subtitle = language === 'en'
    ? 'Provide accurate details for admin verification and identity confirmation'
    : language === 'ta'
    ? 'நிர்வாகி சரிபார்ப்புக்காக துல்லியமான தகவல்களை வழங்கவும்'
    : 'පරිපාලක අනුමැතිය සහ අනන්‍යතාව තහවුරු කිරීම සඳහා නිවැරදි තොරතුරු ඇතුළත් කරන්න';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 py-6 px-3 sm:px-6 flex flex-col justify-center items-center">
      {/* Top Bar with Language & Back to Login */}
      <div className="w-full max-w-2xl mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onNavigateToLogin}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all cursor-pointer border border-white/10 shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'en' ? 'Back to Login' : language === 'ta' ? 'உள்நுழைவுக்குத் திரும்பு' : 'ආපසු පිවිසුමට'}</span>
        </button>

        <div className="flex items-center gap-2">
          {setLanguage && (
            <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setLanguage('si')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-colors ${
                  language === 'si' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                සිං
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-colors ${
                  language === 'en' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ta')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-colors ${
                  language === 'ta' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                தமிழ்
              </button>
            </div>
          )}
          <FontSizeController language={language} />
        </div>
      </div>

      {/* Main Registration Card Container */}
      <div className="w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)] border-2 border-emerald-500/80 relative overflow-hidden">
        {/* Top Decorative Green Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600" />

        {/* Header Section */}
        <div className="text-center mb-6 pt-1">
          <div className="mb-3 flex justify-center">
            <AppLogo size="lg" showGlow animated />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight mb-1">
            {mainTitle}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold mb-2">
            <span>සහාය සේවා • සැමට පිහිට</span>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm font-semibold max-w-md mx-auto">
            {subtitle}
          </p>
        </div>
        {/* Error Alert Message */}
        {errorMessage && (
          <div className="mb-6 bg-rose-50 border-2 border-rose-300 p-4 rounded-2xl flex items-center gap-3 text-rose-900 text-xs sm:text-sm font-bold shadow-sm animate-shake">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section A: Personal & Identity Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl inline-block border border-emerald-200">
              A. මූලික තොරතුරු සහ අනන්‍යතාව
            </h3>

            {/* 1. Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-black text-slate-800">
                1. සම්පූර්ණ නම (Full Name) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="උදා: කේ. ඒ. නිමල් පෙරේරා"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 text-sm font-bold focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* 2. NIC Number & Real-time Gender/Validity Card */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs sm:text-sm font-black text-slate-800">
                  2. ජාතික හැඳුනුම්පත් අංකය (NIC Number) *
                </label>
                <button
                  type="button"
                  onClick={() => setShowNicGuideModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>හැඳුනුම්පත් උදවු</span>
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                </div>
                <input
                  type="text"
                  required
                  value={nicNumber}
                  onChange={(e) => setNicNumber(e.target.value.trim().toUpperCase())}
                  placeholder="උදා: 970181547V හෝ 199701815470"
                  maxLength={12}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 text-sm font-bold focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors tracking-wide"
                />
              </div>

              {/* NIC Validation Badge */}
              {nicNumber.trim() !== '' && (
                <div className="pt-1">
                  {nicInfo && nicInfo.valid ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        වලංගු හැඳුනුම්පතකි ({nicInfo.gender === 'female' ? 'ස්ත්‍රී' : 'පුරුෂ'}, උපන් වර්ෂය: {nicInfo.birthYear || 'නොදනී'})
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>හැඳුනුම්පත් අංකයේ ආකෘතිය වැරදියි (අංක 9ක් සමග V/X හෝ අංක 12ක් විය යුතුය)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Phone / WhatsApp Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs sm:text-sm font-black text-slate-800">
                  3. දුරකථන / WhatsApp අංකය *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPhoneHelpModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>අංක ආකෘතිය</span>
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4 text-emerald-600" />
                </div>
                <input
                  type="tel"
                  required
                  value={whatsappPhone}
                  onChange={handlePhoneChange}
                  placeholder="උදා: 0771234567"
                  maxLength={10}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 text-sm font-bold focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors tracking-wide"
                />
              </div>
            </div>
          </div>

          {/* Section B: Residential & Location Information */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl inline-block border border-emerald-200">
              B. පදිංචි ප්‍රදේශය සහ ලිපිනය
            </h3>

            {/* 4. District & Police Division Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-black text-slate-800">
                  4. දිස්ත්‍රික්කය (District) *
                </label>
                <div className="relative">
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 text-sm font-bold focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors appearance-none cursor-pointer"
                  >
                    {SRI_LANKA_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    ▼
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-black text-slate-800">
                  5. පොලිස් බලප්‍රදේශය (Police Division) *
                </label>
                <div className="relative">
                  <select
                    value={selectedPoliceDivision}
                    onChange={(e) => setSelectedPoliceDivision(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 text-sm font-bold focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors appearance-none cursor-pointer"
                  >
                    {availableDivisions.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Permanent Residential Address */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-black text-slate-800">
                6. ස්ථීර පදිංචි ලිපිනය (Address) *
              </label>
              <div className="relative">
                <div className="absolute top-3.5 left-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="නො: 123, ගංගාරාම පාර, කෝවින්න, කටුනායක"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 text-sm font-bold focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section C: Security Key & Passwords */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl inline-block border border-emerald-200">
                C. පිවිසුම් මුරපදය (Security Password)
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordHelpModal(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>මුරපද නීති</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 7. Password / Key */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-black text-slate-800">
                  7. නව මුරපදය (Password) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="අවම අකුරු 6ක්"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 text-sm font-bold focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 8. Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-black text-slate-800">
                  8. මුරපදය තහවුරු කරන්න *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmKey}
                    onChange={(e) => setConfirmKey(e.target.value)}
                    placeholder="මුරපදය නැවත ඇතුළත් කරන්න"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 text-sm font-bold focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Match Status Indicator */}
            {confirmKey && (
              <div className="pt-0.5">
                {doKeysMatch ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    මුරපද දෙකම නිවැරදිව ගැලපේ
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    මුරපද දෙක එකිනෙකට නොගැලපේ
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Section D: Photo Upload (Fixed Image Upload with Native Overlay) */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl inline-block border border-emerald-200">
              D. අනන්‍යතා ඡායාරූපය උඩුගත කිරීම
            </h3>

            {/* Single Prominent NIC Front Photo Upload Card */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-300 space-y-3 shadow-sm hover:border-emerald-500 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs sm:text-sm font-black text-emerald-950">
                    9. ජාතික හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය (NIC Front Photo) *
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    හැඳුනුම්පත් අංකය සහ හැඳුනුම්පතේ ඔබගේ ඡායාරූපය පමණක් පැහැදිලිව පෙනෙන පරිදි ඉදිරිපස ඡායාරූපය උඩුගත කරන්න.
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

              {/* Hidden Native File Inputs */}
              {/* 1. Standard Chooser (Gallery / Camera / Files) */}
              <input
                ref={nicFileInputRef}
                id="nic-front-file-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handlePhotoUpload(e, setNicFrontPhoto);
                  e.target.value = '';
                }}
                className="hidden"
              />
              {/* 2. Direct Camera Trigger */}
              <input
                ref={nicCameraInputRef}
                id="nic-camera-file-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  handlePhotoUpload(e, setNicFrontPhoto);
                  e.target.value = '';
                }}
                className="hidden"
              />

              {/* Upload Drop Zone / Button */}
              {nicFrontPhoto && nicFrontPhoto.trim() !== '' ? (
                <div className="relative w-full rounded-2xl overflow-hidden bg-slate-50 border-2 border-emerald-400 p-4 flex flex-col items-center justify-center gap-3 shadow-inner">
                  <div className="relative max-h-56 max-w-full flex items-center justify-center">
                    <img
                      src={nicFrontPhoto}
                      alt="NIC Front"
                      className="max-h-52 w-auto max-w-full object-contain rounded-xl shadow-md border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setNicFrontPhoto('');
                        if (nicFileInputRef.current) nicFileInputRef.current.value = '';
                        if (nicCameraInputRef.current) nicCameraInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-2 shadow-lg transition-colors cursor-pointer z-30"
                      title="ඡායාරූපය ඉවත් කරන්න"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
                    <button
                      type="button"
                      onClick={() => nicFileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                      <span>වෙනත් ඡායාරූපයක් තෝරන්න</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNicFrontPhoto('');
                        if (nicFileInputRef.current) nicFileInputRef.current.value = '';
                        if (nicCameraInputRef.current) nicCameraInputRef.current.value = '';
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5 text-rose-600" />
                      <span>ඡායාරූපය ඉවත් කරන්න</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => nicFileInputRef.current?.click()}
                  className="relative w-full min-h-[180px] sm:min-h-[210px] rounded-2xl overflow-hidden bg-gradient-to-b from-emerald-50/40 via-white to-emerald-50/40 border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/30 flex flex-col items-center justify-center p-4 sm:p-5 shadow-inner transition-all cursor-pointer group"
                >
                  {isProcessingPhoto ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                      <Loader2 className="w-9 h-9 text-emerald-600 animate-spin" />
                      <span className="text-xs font-bold text-emerald-950">
                        ඡායාරූපය සැකසෙමින් පවතී...
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2.5 text-center w-full">
                      <div className="p-3 bg-emerald-100 text-emerald-800 rounded-full shadow-sm group-hover:scale-105 transition-transform">
                        <Upload className="w-7 h-7 text-emerald-700 animate-bounce" />
                      </div>
                      <span className="text-sm font-black text-emerald-950 tracking-tight">
                        ජාතික හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය මෙතැනින් එක් කරන්න (අනිවාර්යයි *)
                      </span>
                      <span className="text-xs text-slate-500 max-w-sm font-medium leading-relaxed">
                        හැඳුනුම්පත් අංකය සහ හැඳුනුම්පතේ ඡායාරූපය පමණක් පැහැදිලිව පෙනෙන පරිදි ඡායාරූපය ලබාගන්න.
                      </span>

                      {/* Explicit Action Buttons */}
                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 w-full">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            nicCameraInputRef.current?.click();
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md hover:shadow transition-all active:scale-95 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>කැමරාවෙන් ඡායාරූපයක් ගන්න</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            nicFileInputRef.current?.click();
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-emerald-900 border-2 border-emerald-300 hover:border-emerald-500 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-emerald-700" />
                          <span>ගැලරියෙන් / Files තෝරන්න</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>ලියාපදිංචි වෙමින් පවතී...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>ලියාපදිංචිය යොමු කරන්න</span>
                </>
              )}
            </button>
          </div>

          {/* Footer Navigation */}
          <div className="text-center pt-2 space-y-2">
            <p className="text-xs font-bold text-slate-600">
              දැනටමත් ගිණුමක් තිබේද?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-emerald-700 hover:text-emerald-900 underline font-black cursor-pointer"
              >
                ඇතුළුවන්න (Sign In)
              </button>
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  if (typeof onNavigateToIssues === 'function') {
                    onNavigateToIssues();
                  } else {
                    onNavigateToLogin();
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-800 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>ලියාපදිංචි වීමේදී ගැටලුවක්ද? පරිපාලක සහාය ලබාගන්න</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 1. Modal: NIC Guide Sample Photo */}
      {showNicGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 border-2 border-emerald-500 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-sm font-black text-emerald-950">ආදර්ශ ජාතික හැඳුනුම්පත (Specimen)</h4>
              <button
                type="button"
                onClick={() => setShowNicGuideModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Specimen Replica Component */}
            <div className="py-1">
              <NicSpecimenCard compact={true} />
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1">
              <div className="text-xs font-black text-emerald-950 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 inline shrink-0" />
                <span>හැඳුනුම්පතේ ඉදිරිපස පමණක් උඩුගත කරන්න</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                හැඳුනුම්පත් අංකය සහ හැඳුනුම්පතේ ඡායාරූපය පමණක් පැහැදිලිව පෙනෙන පරිදි හොඳින් ආලෝකය ඇති ස්ථානයක තබා ඡායාරූපය ලබාගන්න.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNicGuideModal(false)}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
            >
              තේරුම් ගත්තා
            </button>
          </div>
        </div>
      )}

      {/* 2. Modal: Phone Number Format Help */}
      {showPhoneHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border-2 border-emerald-500 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-emerald-950">දුරකථන අංක ආකෘතිය</h4>
              <button
                type="button"
                onClick={() => setShowPhoneHelpModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-xs">
              <div className="font-bold text-emerald-950">වලංගු ආකෘති:</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-700 font-medium text-[11px]">
                <li>0771234567 (සාමාන්‍ය ජංගම අංකය)</li>
                <li>0712345678 (Mobitel)</li>
                <li>0781234567 (Hutch)</li>
                <li>0112345678 (ස්ථාවර දුරකථන)</li>
              </ul>
              <p className="text-[10px] text-slate-500 pt-1">
                * +94 හෝ හිස්තැන් ඇතුළත් කිරීම අවශ්‍ය නොවේ. පද්ධතිය විසින් එය ස්වයංක්‍රීයව සකසයි.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPhoneHelpModal(false)}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
            >
              හරි
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal: Password Policy Help */}
      {showPasswordHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border-2 border-emerald-500 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-emerald-950">මුරපද ආරක්ෂක උපදෙස්</h4>
              <button
                type="button"
                onClick={() => setShowPasswordHelpModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-xs">
              <div className="font-bold text-emerald-950">මුරපද නීති:</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-700 font-medium text-[11px]">
                <li>අවම වශයෙන් අකුරු හෝ අංක 6ක් තිබිය යුතුය.</li>
                <li>ඔබට පහසුවෙන් මතක තබාගත හැකි අංකයක් හෝ වචනයක් යොදන්න.</li>
                <li>තහවුරු කිරීමේ මුරපදය සමඟ හරියටම සමාන විය යුතුය.</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordHelpModal(false)}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
            >
              තේරුම් ගත්තා
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;

