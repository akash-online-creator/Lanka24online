import { isAuthorBlocked } from "../utils/blockedCredentialsManager";
import React, { useState, useEffect, useRef } from 'react';
import { User, Language, Theme } from '../types';
import { translations } from '../data/translations';
import {
  SRI_LANKA_DISTRICTS,
  SRI_LANKA_POLICE_DIVISIONS
} from '../data/sriLankaGeoData';
import { compressImageFile, compressImageBase64 } from '../utils/imageCompressor';
import { notifyAdminViaTelegramOnRegistration } from '../lib/firebase';
import { hashUserPassword } from '../utils/userUtils';
import {
  User as UserIcon,
  CreditCard,
  Phone,
  MapPin,
  Lock,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  FileText,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  HelpCircle,
  Camera,
  Trash2
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { MedicalPlusBadge } from './MedicalPlusBadge';
import { FontSizeController } from './FontSizeController';
import { NicSpecimenCard } from './NicSpecimenCard';

// කොන්දේසි සහ රීති
const getSystemTermsAndConditions = async (): Promise<string> =>
  '1. ඔබගේ තොරතුරු නිවැරදි ලෙස ඇතුළත් කරන්න.\n2. පද්ධතියට ඔබ පිවිසෙන විට IP, NIC, දුරකථන සහ Gmail මගින් හඳුනාගැනීම සිදු කෙරේ.\n3. අනවශ්‍ය ලෙස ගිණුම් සෑදීමෙන් වළකින්න.';

// 🛡️ Sri Lankan NIC Matching & Fraud Prevention Helper (දෝෂ නිවැරදි කරන ලද)
const isNicConflict = (existingUser: Partial<User>, inputNic: string): boolean => {
  if (!existingUser || !inputNic) return false;

  const cleanInput = inputNic.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleanInput) return false;

  const exNic = String(existingUser.nicNumber || existingUser.nic || '').trim().toUpperCase().replace(/\s+/g, '');
  const exUserId = String(existingUser.userId || '').trim().toUpperCase().replace(/\s+/g, '');

  // 1. Direct String Match
  if (cleanInput === exNic || cleanInput === exUserId) {
    return true;
  }

  // 2. Cross-format Sri Lankan NIC matching (9-digit Old vs 12-digit New)
  const isInputOld = /^[0-9]{9}[VX]$/.test(cleanInput);
  const isInputNew = /^[0-9]{12}$/.test(cleanInput);
  const isExOld = /^[0-9]{9}[VX]$/.test(exNic);
  const isExNew = /^[0-9]{12}$/.test(exNic);

  if ((isInputOld && isExNew) || (isInputNew && isExOld)) {
    const oldNic = isInputOld ? cleanInput : exNic;
    const newNic = isInputNew ? cleanInput : exNic;

    const oldYear = 1900 + parseInt(oldNic.substring(0, 2), 10);
    const oldDay = parseInt(oldNic.substring(2, 5), 10);
    // නිවැරදි කරන ලද: පැරණි හැඳුනුම්පතේ අනුක්‍රමික අංක 4 (index 5 සිට 9 දක්වා)
    const oldSeq = oldNic.substring(5, 9);

    const newYear = parseInt(newNic.substring(0, 4), 10);
    const newDay = parseInt(newNic.substring(4, 7), 10);
    // නිවැරදි කරන ලද: නව හැඳුනුම්පතේ අනුක්‍රමික අංක 5 (index 7 සිට 12 දක්වා)
    const newSeq = newNic.substring(7, 12);

    if (oldYear === newYear && oldDay === newDay) {
      if (newSeq.includes(oldSeq) || newSeq.endsWith(oldSeq)) {
        return true;
      }
    }
  }

  // 3. Raw Digits Equality (if length >= 9)
  const inDigits = cleanInput.replace(/[^0-9]/g, '');
  const exDigits = exNic.replace(/[^0-9]/g, '');
  if (inDigits.length >= 9 && exDigits.length >= 9 && inDigits === exDigits) {
    return true;
  }

  return false;
};

interface RegisterFormProps {
  onRegister?: (newUser: User) => void;
  onRegisterSuccess?: (newUser: User) => void;
  onNavigateToLogin: () => void;
  onNavigateToIssues?: () => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  theme?: Theme;
  toggleTheme?: () => void;
  users?: User[];
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
  users = [],
}) => {
  const t = (translations[language] || translations.si) as any;

  // Form State Variables
  const [fullName, setFullName] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Gampaha');
  const [selectedPoliceDivision, setSelectedPoliceDivision] = useState('Katunayake');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [key, setKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Photos State (Front of NIC - Camera Only)
  const [nicFrontPhoto, setNicFrontPhoto] = useState<string>('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);


  // UI Flow & Validation State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNicGuideModal, setShowNicGuideModal] = useState(false);
  const [showPhoneHelpModal, setShowPhoneHelpModal] = useState(false);
  const [showPasswordHelpModal, setShowPasswordHelpModal] = useState(false);
  const [nicConflict, setNicConflict] = useState<User | null>(null);
  const [isPreviousRejected, setIsPreviousRejected] = useState<User | null>(null);

  // Available Police Divisions for selected District
  const availableDivisions = (SRI_LANKA_POLICE_DIVISIONS as any)[selectedDistrict] || [];

  useEffect(() => {
    if (availableDivisions.length > 0 && !availableDivisions.includes(selectedPoliceDivision)) {
      setSelectedPoliceDivision(availableDivisions[0]);
    }
  }, [selectedDistrict, availableDivisions, selectedPoliceDivision]);

  // 1. NIC Helper Validator & Gender Evaluator
  const evaluateNicInfo = (nic: string) => {
    const clean = nic.trim().toUpperCase();
    if (!clean) return null;

    let birthYear: number | null = null;
    let dayOfYear: number | null = null;
    let gender: 'male' | 'female' = 'male';

    if (/^[0-9]{9}[VX]$/.test(clean)) {
      birthYear = 1900 + parseInt(clean.substring(0, 2), 10);
      dayOfYear = parseInt(clean.substring(2, 5), 10);
    } else if (/^[0-9]{12}$/.test(clean)) {
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

  // 2. Password Strength Evaluator
  const isKeyValid = key.trim().length >= 6;

  // 3. Phone Sanitizer for Sri Lankan Numbers
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

  // 4. Image Upload & Compression Handler (ඇන්ඩ්‍රොයිඩ් ඇප් සහ වෙබ් යන දෙකෙහිම බාධාවකින් තොරව ක්‍රියාත්මක කිරීම)
  const handleImageFileChange = async (file: File) => {
    if (!file) return;

    // Android WebViews, camera captures, and Google Photos pickers often return empty MIME types ("")
    // or generic "application/octet-stream" and file names like "image:12345" without extensions.
    // We only reject if the file is explicitly a non-image type (e.g. video, audio, pdf, text).
    const isExplicitNonImage = Boolean(
      file.type &&
      !file.type.startsWith('image/') &&
      !file.type.includes('octet-stream') &&
      (file.type.startsWith('video/') ||
       file.type.startsWith('audio/') ||
       file.type.startsWith('text/') ||
       file.type === 'application/pdf')
    );

    if (isExplicitNonImage) {
      setErrorMessage('කරුණාකර වලංගු ඡායාරූපයක් (JPG, PNG හෝ WEBP) තෝරන්න.');
      return;
    }

    setIsProcessingPhoto(true);
    setErrorMessage(null);

    try {
      let resultDataUrl: string = '';

      // Try client-side compression (hardware-accelerated createImageBitmap & Canvas)
      try {
        if (typeof compressImageFile === 'function') {
          resultDataUrl = await compressImageFile(file, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.8,
            maxSizeBytes: 300 * 1024 // 300 KB safe limit for Firestore & fast loading
          });
        }
      } catch (compressionErr) {
        console.warn('Compression notice (falling back to direct reader):', compressionErr);
      }

      // If compression produced no result or failed, fall back to FileReader with base64 compression
      if (!resultDataUrl) {
        resultDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async () => {
            const raw = reader.result as string;
            if (raw && typeof compressImageBase64 === 'function') {
              try {
                const compressed = await compressImageBase64(raw, {
                  maxWidth: 1200,
                  maxHeight: 1200,
                  quality: 0.8,
                  maxSizeBytes: 300 * 1024,
                });
                resolve(compressed || raw);
                return;
              } catch {}
            }
            resolve(raw);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      }

      if (resultDataUrl) {
        setNicFrontPhoto(resultDataUrl);
      } else {
        throw new Error('ඡායාරූපය කියවීමට නොහැකි විය.');
      }
    } catch (err: any) {
      console.error('Image processing error:', err);
      // Emergency fallback: directly read file as DataURL
      try {
        const fallbackReader = new FileReader();
        fallbackReader.onload = () => {
          if (fallbackReader.result) {
            setNicFrontPhoto(fallbackReader.result as string);
            setErrorMessage(null);
          }
        };
        fallbackReader.readAsDataURL(file);
      } catch (finalErr) {
        setErrorMessage('ඡායාරූපය සැකසීමේදී දෝෂයක් ඇතිවිය. කරුණාකර වෙනත් ඡායාරූපයක් උත්සාහ කරන්න.');
      }
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFileChange(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageFileChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Realtime Live Duplicate NIC Security Checker
  useEffect(() => {
    if (!nicInfo || !nicInfo.valid) {
      setNicConflict(null);
      setIsPreviousRejected(null);
      return;
    }

    const clean = nicInfo.cleanNic;

    if (users && users.length > 0) {
      const match = users.find((u) => isNicConflict(u, clean));
      if (match) {
        if (match.status === 'rejected') {
          setIsPreviousRejected(match);
          setNicConflict(null);
        } else {
          setNicConflict(match);
          setIsPreviousRejected(null);
        }
        return;
      }
    }

    setNicConflict(null);
    setIsPreviousRejected(null);
  }, [nicNumber, users]);

  // Form Submission Handler (දෝෂ නිවැරදි කරන ලද)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation 1: NIC Front Photo
    if (!nicFrontPhoto || nicFrontPhoto.trim() === '') {
      setErrorMessage('ලියාපදිංචි වීමට පෙර ඔබගේ ජාතික හැඳුනුම්පත් ඡායාරූපය (NIC Front Photo) ඇතුළත් කිරීම අනිවාර්ය වේ.');
      window.scrollTo({ top: 200, behavior: 'smooth' });
      return;
    }

    // Validation 2: Full Name
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMessage('කරුණාකර ඔබගේ සම්පූර්ණ නම ඇතුළත් කරන්න (අඩුම තරමින් අකුරු 3ක්).');
      return;
    }

    // Validation 3: NIC Format & Duplicate Check
    if (!nicInfo || !nicInfo.valid) {
      setErrorMessage('කරුණාකර නිවැරදි ජාතික හැඳුනුම්පත් අංකය ඇතුළත් කරන්න (උදාහරණ: 970181547V හෝ 199701815470).');
      return;
    }

    const hasActiveDuplicate = Array.isArray(users)
      ? users.some((u) => Boolean(u && u.status !== 'rejected' && isNicConflict(u, nicInfo.cleanNic)))
      : false;

    // Blocked check
    const isNicBlocked = isAuthorBlocked(nicInfo.cleanNic) || (users && users.some((u) => (u.status === "blocked" || u.isBlocked) && isNicConflict(u, nicInfo.cleanNic)));
    if (isNicBlocked) {
      setErrorMessage("ඔබගේ ගිණුම ප්‍රතික්ෂේප කර අවහිර කර ඇත (Blocked). වැඩි විස්තර සඳහා පරිපාලක අමතන්න.");
      window.scrollTo({ top: 150, behavior: "smooth" });
      return;
    }

    // නිවැරදි කරන ලද: nicConflict විචල්‍ය දෝෂය ඉවත් කිරීම
    if (nicConflict || hasActiveDuplicate) {
      setErrorMessage('මෙම ජාතික හැඳුනුම්පත් අංකයෙන් (NIC) දැනටමත් ගිණුමක් පවතී. එක් අයෙකුට සාදාගත හැක්කේ එක් ගිණුමක් පමණි.');
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    // Validation 4: Phone Number
    const cleanPhone = whatsappPhone.trim();
    const isValidPhone = /^(07[0-9]{8})$/.test(cleanPhone) || /^(0[0-9]{9})$/.test(cleanPhone);
    if (!isValidPhone) {
      setErrorMessage('කරුණාකර නිවැරදි දුරකථන / WhatsApp අංකය ඇතුළත් කරන්න (උදා: 0771234567).');
      return;
    }

    // Validation 5: Address
    if (address.trim().length <= 4) {
      setErrorMessage('කරුණාකර ඔබගේ ලිපිනය නිවැරදිව සටහන් කරන්න.');
      return;
    }

    // Validation 6: Password / PIN
    if (!isKeyValid) {
      setErrorMessage('කරුණාකර අවම වශයෙන් රහස් පදයට (PIN) අකුරු 6ක් ඇතුළත් කරන්න.');
      return;
    }

    if (key !== confirmKey) {
      setErrorMessage('ඇතුළත් කළ රහස් පදයන් එකිනෙකට නොගැලපේ. කරුණාකර නැවත පරීක්ෂා කරන්න.');
      return;
    }

    setLoading(true);

    try {
      const nowStr = new Date().toISOString();
      const cleanNic = nicInfo.cleanNic;
      const hashedPassword = await hashUserPassword(key.trim());

      // නිවැරදි කරන ලද: නගරය (City) නිවැරදිව ලබා දීම
      const resolvedCity = (city && city.trim()) ? city.trim() : (selectedPoliceDivision || selectedDistrict);

      const newUser: User = {
        id: isPreviousRejected?.id ? isPreviousRejected.id : `usr_${cleanNic}_${Date.now()}`,
        userId: cleanNic,
        nicNumber: cleanNic,
        nic: cleanNic,
        name: fullName.trim(),
        phone: cleanPhone,
        whatsappPhone: cleanPhone,
        address: address.trim(),
        city: resolvedCity,
        district: selectedDistrict,
        policeDivision: selectedPoliceDivision,
        gender: nicInfo.gender ? nicInfo.gender : 'male',
        role: 'user',
        status: 'pending',
        credits: 100,
        creditBalance: 100,
        sPoints: 0,
        trustScore: 85,
        rating: 5.0,
        registeredAt: nowStr,
        createdAt: isPreviousRejected?.createdAt ? isPreviousRejected.createdAt : nowStr,
        updatedAt: nowStr,
        password: hashedPassword,
        photoUrl: nicFrontPhoto,
        nicFrontPhotoUrl: nicFrontPhoto,
        isReRegistration: Boolean(isPreviousRejected),
      } as any;

      try {
        notifyAdminViaTelegramOnRegistration({
          registrationType: 'ලියාපදිංචිය',
          identifierOrName: `${cleanNic} (${fullName.trim()})`,
          dedupeKey: `usr_${cleanNic}`
        });
      } catch (telegramErr) {
        console.warn('Telegram notification skipped:', telegramErr);
      }

      const registerCallback = onRegister ? onRegister : onRegisterSuccess;
      if (typeof registerCallback === 'function') {
        await registerCallback(newUser);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'ලියාපදිංචි වීමේදී අභ්‍යන්තර දෝෂයක් සිදුවිය.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      {/* Header, Back Button & Logo */}
      <div className="max-w-xl mx-auto mb-6 flex justify-between items-center">
        <button
          type="button"
          onClick={onNavigateToLogin}
          className="flex items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          ආපසු (ඇතුළු වීමේ පිටුවට)
        </button>
        <AppLogo size="sm" />
      </div>

      <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
          නව සාමාජිකයෙකු ලෙස ලියාපදිංචි වන්න
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
          ඔබගේ නිවැරදි තොරතුරු ඇතුළත් කර පද්ධතිය හා සම්බන්ධ වන්න
        </p>

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border-l-4 border-rose-500 text-rose-700 dark:text-rose-300 rounded text-sm flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 📷 NIC Front Photo Box - කැමරාවෙන් පමණක් ලබා ගැනීමට (Gallery රහිතව) */}
          <div className="bg-emerald-50/20 dark:bg-emerald-950/20 p-4 sm:p-5 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 space-y-3 shadow-sm hover:border-emerald-400 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200 font-bold text-sm sm:text-base">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය</span>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  අනිවාර්යයි
                </span>
              </div>
              {nicFrontPhoto && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNicFrontPhoto('');
                  }}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-medium flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ඉවත් කරන්න
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ඔබගේ ජාතික හැඳුනුම්පතේ ඉදිරිපස පැහැදිලි ඡායාරූපයක් කැමරාවෙන් ලබා ගන්න.
            </p>

            {nicFrontPhoto ? (
              /* ඡායාරූපය ලබාගත් පසු පෙන්වන Preview එක (නැවත ගැනීමට මෙතන ස්පර්ශ කරන්න) */
              <div className="relative rounded-xl overflow-hidden border-2 border-emerald-400 dark:border-emerald-600 bg-slate-900 shadow-md group cursor-pointer">
                {/* Overlay camera input so clicking the preview re-triggers camera directly */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  onChange={handleFileInputChange}
                  onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                  title="කැමරාවෙන් නැවත ලබාගන්න"
                />
                <img
                  src={nicFrontPhoto}
                  alt="NIC Front Preview"
                  className="w-full h-48 sm:h-56 object-contain bg-slate-950/80"
                />
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow backdrop-blur-xs">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>නැවත ඡායාරූපයක් ගැනීමට ස්පර්ශ කරන්න</span>
                </div>
                <div className="absolute bottom-2 right-2 bg-emerald-600 text-white text-[11px] font-semibold px-2 py-1 rounded-md flex items-center gap-1 shadow">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  සූදානම්
                </div>
              </div>
            ) : (
              /* මැද කොටුව: ක්ලික් කළ විට කෙලින්ම කැමරාව පමණක් විවෘත වේ (Gallery හෝ වෙනත් බොත්තම් නැත) */
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="relative border-2 border-dashed border-emerald-300 dark:border-emerald-600 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-2xl p-6 sm:p-8 text-center transition-all bg-emerald-50/40 dark:bg-emerald-950/30 hover:bg-emerald-50/80 flex flex-col items-center justify-center gap-3 cursor-pointer group shadow-inner"
              >
                {/* Native Camera-Only Overlay Input: Direct hardware camera capture */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  onChange={handleFileInputChange}
                  onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                  title="කැමරාවෙන් ඡායාරූපය ලබාගන්න"
                />

                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 group-hover:bg-emerald-200 group-hover:scale-105 transition-all flex items-center justify-center text-emerald-600 dark:text-emerald-300 shadow-sm mx-auto">
                  {isProcessingPhoto ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-950 dark:text-emerald-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                    {isProcessingPhoto
                      ? 'ඡායාරූපය සකසමින් පවතී...'
                      : 'කැමරාවෙන් ඡායාරූපය ගැනීමට මෙතන ස්පර්ශ කරන්න'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    (හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය කැමරාවෙන් පමණක් ලබා ගැනේ)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Full Name Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              සම්පූර්ණ නම (Full Name) *
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="උදා: කමල් පෙරේරා"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            </div>
          </div>

          {/* NIC Number Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                ජාතික හැඳුනුම්පත් අංකය (NIC Number) *
              </label>
              <button
                type="button"
                onClick={() => setShowNicGuideModal(true)}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" /> උපදෙස්
              </button>
            </div>
            <div className="relative">
              <CreditCard className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={nicNumber}
                onChange={(e) => setNicNumber(e.target.value)}
                required
                placeholder="උදා: 970181547V හෝ 199701815470"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition uppercase"
              />
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                දුරකථන / WhatsApp අංකය *
              </label>
              <button
                type="button"
                onClick={() => setShowPhoneHelpModal(true)}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" /> උපදෙස්
              </button>
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="tel"
                value={whatsappPhone}
                onChange={handlePhoneChange}
                required
                placeholder="0771234567"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            </div>
          </div>

          {/* District & Police Division Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                දිස්ත්‍රික්කය (District)
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full py-2.5 px-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
              >
                {SRI_LANKA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                පොලිස් බලප්‍රදේශය (Police Division)
              </label>
              <select
                value={selectedPoliceDivision}
                onChange={(e) => setSelectedPoliceDivision(e.target.value)}
                className="w-full py-2.5 px-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
              >
                {availableDivisions.map((p: string) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* City / Town Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              නගරය (City / Town)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="උදා: කටුනායක"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            </div>
          </div>

          {/* Address Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              ලිපිනය (Address) *
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              required
              placeholder="ඔබගේ නිවැරදි ලිපිනය"
              className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Password / PIN Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  රහස් පදය (PIN) *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswordHelpModal(true)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> උපදෙස්
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  required
                  placeholder="අවම අකුරු 6ක්"
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                රහස් පදය තහවුරු කරන්න *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmKey}
                  onChange={(e) => setConfirmKey(e.target.value)}
                  required
                  placeholder="නැවත ඇතුළත් කරන්න"
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#00a86b] hover:bg-[#00925c] active:bg-[#008050] text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {loading ? 'ලියාපදිංචි වෙමින් පවතී...' : 'නව සාමාජිකයෙකු ලෙස ලියාපදිංචි වන්න'}
          </button>
        </form>
      </div>

      {/* Helper Modals */}
      {showNicGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowNicGuideModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
              ජාතික හැඳුනුම්පත් ආකෘති මාර්ගෝපදේශය
            </h3>
            <NicSpecimenCard />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
              පැරණි ආකෘතිය: අංක 9ක් සහ V හෝ X අකුර (උදා: 970181547V)<br />
              නව ආකෘතිය: ඉලක්කම් 12කින් යුත් අංකය (උදා: 199701815470)
            </p>
          </div>
        </div>
      )}

      {showPhoneHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowPhoneHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
              දුරකථන අංක මාර්ගෝපදේශය
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              ශ්‍රී ලාංකික වලංගු ජංගම දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 0771234567, 0712345678, 0701234567 ආදිය). ජාත්‍යන්තර ආකෘතිය (+94) ස්වයංක්‍රීයව පරිවර්තනය වේ.
            </p>
          </div>
        </div>
      )}

      {showPasswordHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowPasswordHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
              රහස් පද (PIN) මාර්ගෝපදේශය
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              ඔබගේ ගිණුමේ ආරක්ෂාව සඳහා අවම වශයෙන් අක්ෂර හෝ ඉලක්කම් 6ක රහස් පදයක් භාවිතා කරන්න.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
