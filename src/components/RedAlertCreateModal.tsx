import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Calendar, 
  Navigation, 
  Loader2, 
  CheckCircle2, 
  FileText,
  User as UserIcon,
  Phone,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { RedAlertDisasterType, RedAlertItem, User, LocationOption } from '../types';
import { DISASTER_TYPES, getDisasterConfig } from '../data/redAlertData';
import { resolveExactLocation } from '../utils/geoUtils';
import { auth, createRedAlertInFirestore } from '../lib/firebase';

interface RedAlertCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  currentLocation?: LocationOption;
  onAlertCreated?: (newAlert: RedAlertItem) => void;
}

export const RedAlertCreateModal: React.FC<RedAlertCreateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLocation,
  onAlertCreated,
}) => {
  const [selectedDisaster, setSelectedDisaster] = useState<RedAlertDisasterType>('fire');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Location & GPS State
  const [isScanningGps, setIsScanningGps] = useState(false);
  const [latitude, setLatitude] = useState<number>(currentLocation?.lat || 6.9271);
  const [longitude, setLongitude] = useState<number>(currentLocation?.lng || 79.8612);
  const [locationName, setLocationName] = useState<string>(currentLocation?.nameSi || 'ස්ථානය ස්කෑන් වෙමින් පවතී...');
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>(undefined);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Time & Date
  const [incidentDate, setIncidentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState<string>(() => 
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  );

  // Reporter
  const [reporterName, setReporterName] = useState<string>(currentUser?.name || '');
  const [reporterPhone, setReporterPhone] = useState<string>(currentUser?.phone || currentUser?.whatsappNumber || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 🔒 Security Password Popup State
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Auto scan GPS when modal opens
  useEffect(() => {
    if (isOpen) {
      scanGpsLocation();
      setIncidentDate(new Date().toISOString().split('T')[0]);
      setIncidentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      setSubmitSuccess(false);
      setIsSubmitting(false);
      setShowPasswordPopup(false);
      setEnteredPassword('');
      setPasswordError(null);
    }
  }, [isOpen]);

  const scanGpsLocation = () => {
    setIsScanningGps(true);
    setGpsError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setIsScanningGps(false);
      setGpsError('GPS පහසුකම ඔබගේ බ්‍රවුසරයේ නොමැත. කරුණාකර ස්ථානය අතින් සටහන් කරන්න.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);

        setLatitude(lat);
        setLongitude(lng);
        setAccuracyMeters(acc);

        try {
          const resolved = await resolveExactLocation(lat, lng);
          if (resolved) {
            setLocationName(resolved.shortDisplaySi || resolved.townSi || resolved.villageSi || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          } else {
            setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)} (GPS)`);
          }
        } catch {
          setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)} (GPS)`);
        } finally {
          setIsScanningGps(false);
        }
      },
      (_err) => {
        setIsScanningGps(false);
        setGpsError('GPS ස්ථානය ලබාගත නොහැකි විය. ස්ථාන නාමය අතින් ඇතුළත් කරන්න.');
        if (currentLocation?.nameSi) {
          setLocationName(currentLocation.nameSi);
          setLatitude(currentLocation?.lat || 6.9271);
          setLongitude(currentLocation?.lng || 79.8612);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleOpenPasswordGate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!locationName.trim()) {
      alert('කරුණාකර ආපදාව සිදුවූ ස්ථානය ඇතුළත් කරන්න.');
      return;
    }

    if (selectedDisaster === 'other' && !customTitle.trim()) {
      alert('කරුණාකර වෙනත් ආපදාවේ නම ඇතුළත් කරන්න.');
      return;
    }

    setPasswordError(null);
    setEnteredPassword('');
    setShowPasswordPopup(true);
  };

  // 🔒 Firebase Auth Re-authentication සමග නිවැරදි කළ මුරපද තහවුරු කිරීමේ ක්‍රියාවලිය
  const handleFinalConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!enteredPassword.trim()) {
      setPasswordError('⚠️ කරුණාකර ඔබගේ මුරපදය ඇතුළත් කරන්න.');
      return;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) {
      setPasswordError('⚠️ පරිශීලකයා පද්ධතියට ලොග් වී නොමැත. කරුණාකර නැවත ලොග් වන්න.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Firebase Auth හි reauthenticateWithCredential මගින් සැබෑ මුරපදය පරීක්ෂා කිරීම
      const credential = EmailAuthProvider.credential(firebaseUser.email, enteredPassword);
      await reauthenticateWithCredential(firebaseUser, credential);

      // 2. මුරපදය නිවැරදි නම් Dialog Box එක වසා දැමීම
      setShowPasswordPopup(false);

      const config = getDisasterConfig(selectedDisaster);
      const titleSi = selectedDisaster === 'other' ? customTitle.trim() : config.titleSi;
      const titleEn = selectedDisaster === 'other' ? customTitle.trim() : config.titleEn;
      const titleTa = selectedDisaster === 'other' ? customTitle.trim() : config.titleTa;

      const alertCode = `#RED-${Math.floor(1000 + Math.random() * 9000)}`;

      const newAlertData: Omit<RedAlertItem, 'id'> = {
        alertCode,
        disasterType: selectedDisaster,
        disasterTitleSi: titleSi,
        disasterTitleEn: titleEn,
        disasterTitleTa: titleTa,
        description: description.trim(),
        latitude,
        longitude,
        locationName: locationName.trim(),
        incidentDate,
        incidentTime,
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
        reportedByUserId: currentUser?.userId || currentUser?.id || firebaseUser.uid || '',
        reportedByName: reporterName.trim() || 'හදිසි සාමාජිකයෙක්',
        reportedByPhone: reporterPhone.trim(),
        status: 'active',
        severity: 'critical',
        comments: [],
        fakeReports: [],
        isFlaggedFake: false,

        ...(selectedDisaster === 'other' && customTitle.trim() ? { customDisasterTitle: customTitle.trim() } : {}),
        ...(accuracyMeters !== undefined ? { locationAccuracyMeters: accuracyMeters } : {}),
      };

      // 3. Firestore එකට Red Alert එක පළ කිරීම
      const docId = await createRedAlertInFirestore(newAlertData);

      const createdItem: RedAlertItem = {
        ...newAlertData,
        id: docId,
      };

      setSubmitSuccess(true);
      if (onAlertCreated) {
        onAlertCreated(createdItem);
      }

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Re-authentication / Submission Error:', err);

      // මුරපදය වැරදි නම් හෝ Firebase Auth Error එකක් ආවොත් ආරක්ෂිත Error Message එකක් පෙන්වීම
      if (
        err?.code === 'auth/wrong-password' || 
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/user-mismatch'
      ) {
        setPasswordError('⚠️ ඇතුළත් කළ මුරපදය (Password) වැරදියි. කරුණාකර ඔබගේ සැබෑ ගිණුම් මුරපදය නිවැරදිව ඇතුළත් කරන්න.');
      } else {
        setPasswordError('⚠️ තහවුරු කිරීමේදී දෝෂයක් සිදුවිය: ' + (err.message || 'නැවත උත්සාහ කරන්න.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0c1812] border-2 border-red-500 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.4)] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-3.5 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="w-8 h-8 rounded-full bg-white/40 animate-ping absolute" />
              <div className="w-8 h-8 rounded-full bg-white text-red-600 font-black flex items-center justify-center text-lg shadow-md relative z-10">
                🚨
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black tracking-wide flex items-center gap-2 truncate">
                <span>රතු එළිය (Red Alert)</span>
                <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono shrink-0">
                  හදිසි ආපදා
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-red-100 font-medium truncate">
                ස්ථානයේ සිට කි.මී. 2 ක් ඇතුළත සියලු දෙනාට Siren ශබ්දය සමග ක්ෂණිකව අනතුරු අඟවයි
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
            title="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {submitSuccess ? (
          <div className="p-8 text-center space-y-4 overflow-y-auto flex-1 flex flex-col justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                ආපදා දැනුම්දීම සාර්ථකව විකාශය විය!
              </h3>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">
                🚨 කි.මී. 2 ක් ඇතුළත සිටින සියලු දෙනාගේ දුරකථනවලට Siren නලා හඬ සමග අනතුරු ඇඟවීම යවන ලදි.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleOpenPasswordGate} className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
            
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-red-600 dark:text-red-400 flex items-center gap-1.5 tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>1. ආපදා වර්ගය තෝරන්න (Select Hazard)</span>
                <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {DISASTER_TYPES.map((type, tIdx) => {
                  const isSelected = selectedDisaster === type.id;
                  return (
                    <button
                      key={`disaster_type_${type.id}_${tIdx}`}
                      type="button"
                      onClick={() => setSelectedDisaster(type.id)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 active:scale-95 ${
                        isSelected
                          ? 'border-red-500 bg-red-500/15 shadow-md ring-2 ring-red-500/40'
                          : 'border-slate-200 dark:border-white/10 hover:border-red-300 dark:hover:border-red-900/60 bg-slate-50 dark:bg-white/5'
                      }`}
                    >
                      <div className="text-2xl">{type.icon}</div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100 leading-tight">
                          {type.titleSi.split('(')[0]}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {type.titleEn}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDisaster === 'other' && (
                <div className="pt-2 animate-fadeIn">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="ආපදාවේ නම සටහන් කරන්න..."
                    className="w-full p-3 rounded-xl border-2 border-red-400 dark:border-red-600 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 p-3.5 rounded-2xl bg-red-500/10 border border-red-400/40">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-red-700 dark:text-red-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-600" />
                  <span>2. ආපදා ස්ථානය (GPS මගින් Auto Scan විය)</span>
                  <span className="text-red-500">*</span>
                </label>

                <button
                  type="button"
                  onClick={scanGpsLocation}
                  disabled={isScanningGps}
                  className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  {isScanningGps ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>ස්කෑන් වෙමින්...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3 h-3" />
                      <span>නැවත ස්කෑන් කරන්න</span>
                    </>
                  )}
                </button>
              </div>

              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="ගම / නගරය / පාර ඇතුළත් කරන්න..."
                className="w-full p-2.5 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-black/50 text-slate-900 dark:text-white font-bold text-xs"
                required
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                <span className="bg-white/80 dark:bg-black/40 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                  📍 Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
                </span>
                {accuracyMeters !== undefined && (
                  <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    🎯 නිරවද්‍යතාව: මීටර් {accuracyMeters}
                  </span>
                )}
              </div>

              {gpsError && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  ⚠️ {gpsError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>දිනය (Date)</span>
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-slate-900 dark:text-white text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>වේලාව (Time)</span>
                </label>
                <input
                  type="text"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  placeholder="10:30 AM"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-slate-900 dark:text-white text-xs font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>වැඩි විස්තර (අවශ්‍ය නම්)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="සිදුවීම පිළිබඳ වැඩි විස්තර මෙහි ලියන්න..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>දැනුම්දෙන්නාගේ නම</span>
                </span>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="ඔබගේ නම..."
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>දුරකථන අංකය</span>
                </span>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="07xxxxxxxx"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-red-800 active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-400/40"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>විකාශය වෙමින් පවතී...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🚨</span>
                    <span>රතු එළිය Submit කරන්න (කි.මී. 2 තුළ Siren දැනුම්දෙන්න)</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>

      {/* 🔒 Password Gate Popup Modal */}
      {showPasswordPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0f1d18] border-2 border-red-500 rounded-3xl shadow-[0_0_60px_rgba(239,68,68,0.6)] p-5 sm:p-6 space-y-4 my-auto">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-red-600 animate-pulse" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ආරක්ෂිත තහවුරු කිරීම (Security Check)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordPopup(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-200 bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl">
              <p className="font-black text-emerald-600 dark:text-emerald-400 text-center text-xs">
                මෙය සියලු සත්වයන්ගේ ජිවිතය රෑකිමට ඔබට ලැබෙන වටිනා අවස්ථාවකි.
              </p>
              <p className="font-bold text-slate-800 dark:text-slate-100 pt-1">
                ⚠️ <strong className="text-red-600 dark:text-red-400">අවධානයයි:</strong> කුඩා ලමුන් හා අසත්‍ය අපදා පලකිරිම් වැළැක්වීමට මුරපදයක් පහතින් යොදා ඇත. ඔබගේ මුරපදය ඇතුළත් කර ආපදාව දැනුම් දෙන්න.
              </p>
            </div>

            <form onSubmit={handleFinalConfirmSubmit} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-red-500" />
                  <span>ඔබගේ ගිණුමේ මුරපදය (Password) ඇතුළත් කරන්න:</span>
                </label>
                <input
                  type="password"
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  placeholder="Password ඇතුළත් කරන්න..."
                  className="w-full p-3 rounded-xl border-2 border-red-400 dark:border-red-600 bg-white dark:bg-black/50 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-red-500"
                  autoFocus
                  disabled={isSubmitting}
                  required
                />
              </div>

              {passwordError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2 rounded-lg">
                  {passwordError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordPopup(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-xs shadow-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>තහවුරු වෙමින්...</span>
                    </>
                  ) : (
                    <span>🚨 තහවුරු කර යවන්න</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
