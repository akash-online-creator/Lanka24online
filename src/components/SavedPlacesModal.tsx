import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Globe,
  Lock,
  Share2,
  Trash2,
  ExternalLink,
  Plus,
  Compass,
  CheckCircle2,
  Search,
  RefreshCw,
  Info,
  Shield,
  Layers
} from 'lucide-react';
import { User, LocationOption, Language } from '../types';
import { calculateDistanceKm, resolveExactLocation } from '../utils/geoUtils';
import { getHighAccuracyLocation } from '../utils/highAccuracyGps';
import { db } from '../lib/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

export interface SavedPlaceItem {
  id: string;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  isPublic: boolean;
  userId: string;
  userName: string;
  userPhone?: string;
  createdAt?: string;
  createdAtMs: number;
}

interface SavedPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  currentLocation?: LocationOption;
  language?: Language;
}

const LOCAL_STORAGE_KEY = 'sahaya_saved_places_v1';

// Default starter community public landmarks (Sri Lanka)
const DEFAULT_COMMUNITY_PLACES: SavedPlaceItem[] = [
  {
    id: 'plc_ja_ela_town',
    name: 'ජා-ඇල නගර සභාව හා පොදු බස් නැවතුම',
    description: 'ජා-ඇල නගර මධ්‍යය, ප්‍රධාන බස් නැවතුම්පොළ සහ පොදු පහසුකම් කලාපය',
    lat: 7.0786,
    lng: 79.8913,
    isPublic: true,
    userId: 'system_admin',
    userName: 'සහය සේවා ප්‍රජා සිතියම',
    createdAtMs: 1710000000000,
  },
  {
    id: 'plc_ja_ela_station',
    name: 'ජා-ඇල දුම්රිය ස්ථානය',
    description: 'පුත්තලම මාර්ගයේ ප්‍රධාන දුම්රිය නැවතුම',
    lat: 7.0765,
    lng: 79.8932,
    isPublic: true,
    userId: 'system_admin',
    userName: 'සහය සේවා ප්‍රජා සිතියම',
    createdAtMs: 1710000000000,
  },
  {
    id: 'plc_ragama_hospital',
    name: 'රාගම ශික්ෂණ රෝහල',
    description: 'හදිසි ප්‍රතිකාර ඒකකය හා ප්‍රධාන රෝහල් සංකීර්ණය',
    lat: 7.0270,
    lng: 79.9215,
    isPublic: true,
    userId: 'system_admin',
    userName: 'සහය සේවා සෞඛ්‍ය ඒකකය',
    createdAtMs: 1710000000000,
  },
  {
    id: 'plc_katunayake_airport',
    name: 'කටුනායක ගුවන් තොටුපළ මංසන්ධිය',
    description: 'අධිවේගී පිවිසුම හා ගුවන් තොටුපළ වටරවුම',
    lat: 7.1802,
    lng: 79.8841,
    isPublic: true,
    userId: 'system_admin',
    userName: 'සහය සේවා ප්‍රජා සිතියම',
    createdAtMs: 1710000000000,
  },
  {
    id: 'plc_colombo_fort',
    name: 'කොළඹ කොටුව මධ්‍යම දුම්රිය ස්ථානය',
    description: 'ශ්‍රී ලංකාවේ ප්‍රධාන මධ්‍යම ප්‍රවාහන හුවමාරු කේන්ද්‍රස්ථානය',
    lat: 6.9344,
    lng: 79.8504,
    isPublic: true,
    userId: 'system_admin',
    userName: 'සහය සේවා ප්‍රජා සිතියම',
    createdAtMs: 1710000000000,
  }
];

export const SavedPlacesModal: React.FC<SavedPlacesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLocation,
  language = 'si',
}) => {
  const currentUserId = currentUser?.id || currentUser?.userId || 'usr_guest';
  const currentUserName = currentUser?.name || 'පරිශීලක';

  // Form State
  const [placeName, setPlaceName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true); // true = Public, false = Private
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // GPS State
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: currentLocation?.lat || 7.0786,
    lng: currentLocation?.lng || 79.8913,
  });
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>(currentLocation?.nameSi || '');

  // Places List & Filter State
  const [places, setPlaces] = useState<SavedPlaceItem[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_COMMUNITY_PLACES;
  });

  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'public'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [sharedToast, setSharedToast] = useState<string | null>(null);

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  // Helper: Detect active GPS location with Meter-Level Precision (No Stale Caching)
  const handleDetectGps = async () => {
    setIsLocating(true);
    try {
      const fix = await getHighAccuracyLocation(10000);
      setCurrentCoords({ lat: fix.lat, lng: fix.lng });
      setGpsAccuracy(fix.accuracyMeters);

      try {
        const resolved = await resolveExactLocation(fix.lat, fix.lng);
        if (resolved?.shortDisplaySi) {
          setResolvedAddress(resolved.shortDisplaySi);
        }
      } catch {}
    } catch (e) {
      console.debug('High accuracy GPS fetch notice:', e);
    } finally {
      setIsLocating(false);
    }
  };

  // Pre-load GPS & Sync Firestore on Open
  useEffect(() => {
    if (isOpen) {
      handleDetectGps();
      setShowAddForm(false);
      setPlaceName('');
      setDescription('');
      setIsPublic(true);
      setSaveSuccessMsg(null);

      // 🔄 Real-time sync with Firebase Cloud Firestore
      try {
        const q = query(collection(db, 'saved_places'), orderBy('createdAtMs', 'desc'));
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const firestorePlaces: SavedPlaceItem[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              firestorePlaces.push({
                id: docSnap.id,
                name: data.name || '',
                description: data.description || '',
                lat: data.lat || 0,
                lng: data.lng || 0,
                accuracyMeters: data.accuracyMeters,
                isPublic: data.isPublic !== false,
                userId: data.userId || '',
                userName: data.userName || 'ප්‍රජා සාමාජිකයෙක්',
                userPhone: data.userPhone,
                createdAt: data.createdAt,
                createdAtMs: data.createdAtMs || Date.now(),
              });
            });

            if (firestorePlaces.length > 0) {
              setPlaces((prev) => {
                // Merge default and firestore places
                const idSet = new Set(firestorePlaces.map((p) => p.id));
                const merged = [
                  ...firestorePlaces,
                  ...DEFAULT_COMMUNITY_PLACES.filter((p) => !idSet.has(p.id)),
                ];
                try {
                  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
          },
          (err) => {
            console.debug('Firestore saved_places subscription notice:', err);
          }
        );

        return () => unsubscribe();
      } catch (e) {
        console.debug('Firestore initialization note:', e);
      }
    }
  }, [isOpen]);

  // Save New Place Handler
  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) {
      alert(getLang('කරුණාකර ස්ථානයේ නම ඇතුළත් කරන්න.', 'Please enter the place name.', 'தயவுசெய்து இடத்தின் பெயரை உள்ளிடவும்.'));
      return;
    }

    setIsSubmitting(true);
    const newPlace: SavedPlaceItem = {
      id: `plc_${Date.now()}`,
      name: placeName.trim(),
      description: description.trim(),
      lat: currentCoords.lat,
      lng: currentCoords.lng,
      accuracyMeters: gpsAccuracy || undefined,
      isPublic,
      userId: currentUserId,
      userName: currentUserName,
      userPhone: currentUser?.phone || currentUser?.whatsappNumber,
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
    };

    try {
      // 1. Save to local storage first (instant responsiveness)
      const updatedList = [newPlace, ...places.filter((p) => p.id !== newPlace.id)];
      setPlaces(updatedList);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      } catch {}

      // 2. Sync to Firebase Cloud Firestore if online
      try {
        await addDoc(collection(db, 'saved_places'), {
          ...newPlace,
          serverTimestamp: serverTimestamp(),
        });
      } catch (err) {
        console.debug('Firestore addDoc fallback notice:', err);
      }

      setPlaceName('');
      setDescription('');
      setShowAddForm(false);
      setSaveSuccessMsg(
        isPublic
          ? getLang('✅ ස්ථානය ප්‍රජාවට පොදුවේ සාර්ථකව සුරකින ලදී!', '✅ Public location saved successfully!', '✅ பொது இடம் வெற்றிகரமாக சேமிக்கப்பட்டது!')
          : getLang('🔒 ස්ථානය ඔබගේ පුද්ගලික ගිණුමට සාර්ථකව සුරකින ලදී!', '🔒 Private location saved successfully!', '🔒 தனிப்பட்ட இடம் வெற்றிகரமாக சேமிக்கப்பட்டது!')
      );

      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch {
      alert(getLang('ස්ථානය සුරැකීමට නොහැකි විය. නැවත උත්සාහ කරන්න.', 'Failed to save location. Please try again.', 'இடத்தை சேமிக்க முடியவில்லை.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Place Handler
  const handleDeletePlace = async (placeId: string) => {
    if (!window.confirm(getLang('මෙම ස්ථානය ඉවත් කිරීමට ඔබට සහතිකද?', 'Are you sure you want to delete this place?', 'இந்த இடத்தை நீக்க விரும்புகிறீர்களா?'))) {
      return;
    }

    const updated = places.filter((p) => p.id !== placeId);
    setPlaces(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    try {
      await deleteDoc(doc(db, 'saved_places', placeId));
    } catch (e) {
      console.debug('Firestore delete notice:', e);
    }
  };

  // Share Place Handler
  const handleSharePlace = async (place: SavedPlaceItem, distanceFormatted: string) => {
    const isOwner = place.userId === currentUserId || place.userId === 'system_admin';
    if (!place.isPublic && !isOwner) {
      alert(getLang('මෙය පෞද්ගලික ස්ථානයක් බැවින් බෙදාහදා ගැනීමට නොහැක.', 'This is a private location and cannot be shared.', 'இது ஒரு தனிப்பட்ட இடம்.'));
      return;
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
    const shareText = `📍 සහය සේවා - සුරකින ලද ස්ථානය:\n📌 ${place.name}\n${place.description ? `📝 ${place.description}\n` : ''}📏 දුර: ඔබ සිටින තැන සිට ${distanceFormatted}\n🗺️ Google Maps මාර්ගය: ${mapsUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `📍 ${place.name} - සහය සේවා`,
          text: shareText,
          url: mapsUrl,
        });
        return;
      } catch {}
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setSharedToast(getLang('📋 ස්ථානයේ තොරතුරු සහ Link එක Copy විය!', '📋 Place details & link copied!', '📋 இணைப்பு நகலெடுக்கப்பட்டது!'));
      setTimeout(() => setSharedToast(null), 3000);
    } catch {
      window.open(mapsUrl, '_blank');
    }
  };

  // Format Distance Helper (Meters vs Kilometers)
  const formatDistance = (distKm: number): string => {
    if (distKm < 1.0) {
      const meters = Math.round(distKm * 1000);
      return `${meters}m (${getLang(`මීටර් ${meters}ක්`, `${meters} meters`, `${meters} மீட்டர்`)})`;
    }
    const km = distKm.toFixed(1);
    return `${km} km (${getLang(`කි.මී. ${km}ක්`, `${km} km`, `${km} கி.மீ`)})`;
  };

  // Compute & Sort Places by Exact Distance from Current GPS Coordinates
  const sortedAndFilteredPlaces = useMemo(() => {
    return places
      .map((place) => {
        const distKm = calculateDistanceKm(
          currentCoords.lat,
          currentCoords.lng,
          place.lat,
          place.lng
        );
        return {
          ...place,
          distanceKm: distKm,
          distanceFormatted: formatDistance(distKm),
        };
      })
      .filter((place) => {
        // Privacy filter: Private places only visible to their creator
        const isOwner = place.userId === currentUserId;
        if (!place.isPublic && !isOwner) {
          return false;
        }

        // Tab filter
        if (activeTab === 'my') {
          return isOwner;
        }
        if (activeTab === 'public') {
          return place.isPublic;
        }

        return true;
      })
      .filter((place) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          place.name.toLowerCase().includes(q) ||
          (place.description && place.description.toLowerCase().includes(q)) ||
          place.userName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.distanceKm - b.distanceKm); // Closest first!
  }, [places, currentCoords, currentUserId, activeTab, searchQuery, language]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#07170e] text-slate-900 dark:text-zinc-100 rounded-3xl shadow-2xl border-2 border-emerald-500/40 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <MapPin className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {getLang('📍 ස්ථානය සුරකින්න සහ ප්‍රජා ස්ථාන', 'Save Location & Community Places', 'இடங்களை சேமிக்கவும்')}
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium">
                {getLang(
                  'ස්ථාන සුරකින්න • ඔබ සිටින තැන සිට ඇති දුර අනුව නැරඹීම',
                  'Save spots & browse by live GPS proximity',
                  'நேரடி ஜிபிஎஸ் தூரத்தின்படி இடங்களை சேமித்து பார்க்கவும்'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live GPS Status Bar */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/40 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-emerald-900 dark:text-emerald-200">
              {resolvedAddress ? `📍 ${resolvedAddress}` : `GPS: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}`}
            </span>
            {gpsAccuracy && (
              <span className="px-1.5 py-0.5 rounded-md bg-white dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono border border-emerald-300 dark:border-emerald-700">
                ±{gpsAccuracy}m
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={isLocating}
            onClick={handleDetectGps}
            className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold hover:underline cursor-pointer disabled:opacity-50 text-[11px]"
          >
            <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? getLang('GPS සොයමින්...', 'Locating...', 'ஜிபிஎஸ்...') : getLang('GPS Refresh', 'Refresh GPS', 'புதுப்பிக்கவும்')}</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="mx-4 mt-3 p-3 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 text-emerald-800 dark:text-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Shared Link Copied Toast */}
        {sharedToast && (
          <div className="mx-4 mt-3 p-3 bg-blue-100 dark:bg-blue-950/80 border border-blue-400 text-blue-800 dark:text-blue-200 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
            <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{sharedToast}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Action Header: Toggle Add Form */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl border border-slate-200 dark:border-zinc-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                {getLang('සියල්ල (දුර අනුව)', 'All (By Proximity)', 'அனைத்தும்')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('my')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'my'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                {getLang('🔒 මගේ ස්ථාන', 'My Places', 'என் இடங்கள்')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('public')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'public'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                {getLang('🌐 ප්‍රජා ස්ථාන', 'Public Community', 'பொது')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
            >
              {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{showAddForm ? getLang('වසන්න', 'Close', 'மூடு') : getLang('📍 නව ස්ථානයක් සුරකින්න', 'Save This Spot', 'இடத்தை சேமி')}</span>
            </button>
          </div>

          {/* Add New Location Accordion Form */}
          {showAddForm && (
            <form
              onSubmit={handleSavePlace}
              className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-emerald-950/20 border-2 border-emerald-400/60 space-y-4 animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800/40 pb-2">
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  {getLang('වත්මන් GPS ස්ථානය සුරැකීම', 'Save Current GPS Location', 'தற்போதைய ஜிபிஎஸ் இருப்பிடத்தை சேமிக்கவும்')}
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Lat: {currentCoords.lat.toFixed(4)} • Lng: {currentCoords.lng.toFixed(4)}
                </span>
              </div>

              {/* Input 1: Place Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                  {getLang('ස්ථානයේ නම (Place Name) *', 'Place Name *', 'இடத்தின் பெயர் *')}
                </label>
                <input
                  type="text"
                  required
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder={getLang(
                    'උදා: මගේ නිවස, ජා-ඇල සතිපොළ අසල, ව්‍යාපාරික ස්ථානය...',
                    'e.g. My Home, Near Ja-Ela Market, Workshop...',
                    'எ.கா: என் வீடு, சந்தை அருகில்...'
                  )}
                  className="w-full bg-white dark:bg-zinc-800 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Input 2: Description (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                  {getLang('විස්තරය / සලකුණු (Landmark / Note) - විකල්පයි', 'Landmark / Note (Optional)', 'விளக்கம் / குறிப்பு (விருப்பமானது)')}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={getLang(
                    'පහසුවෙන් සොයාගැනීමට සලකුණක් හෝ අමතර විස්තරයක්...',
                    'Helpful landmark or description...',
                    'குறிப்பு...'
                  )}
                  className="w-full bg-white dark:bg-zinc-800 px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Input 3: Privacy & Visibility Toggle */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                  {getLang('ප්‍රවේශ සීමාව සහ දෘශ්‍යතාව (Visibility) *', 'Visibility & Privacy *', 'பார்வை மற்றும் தனியுரிமை *')}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option A: Public */}
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      isPublic
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 shadow-sm'
                        : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isPublic ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        {getLang('🌐 ප්‍රජාවට පොදුයි (Public)', 'Public (Everyone)', 'பொதுவானது')}
                      </span>
                      <p className="text-[10px] text-slate-600 dark:text-zinc-400 mt-0.5 leading-snug">
                        {getLang(
                          'අනෙක් සියලු සාමාජිකයින්ට ඔවුන් ඉන්න තැන සිට ඇති දුර අනුව පෙනේ. ඕනෑම කෙනෙකුට Share කළ හැක.',
                          'Visible to everyone sorted by proximity. Shareable by anyone.',
                          'அனைவருக்கும் தெரியும்.'
                        )}
                      </p>
                    </div>
                  </button>

                  {/* Option B: Private */}
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      !isPublic
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 shadow-sm'
                        : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${!isPublic ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        {getLang('🔒 පෞද්ගලිකයි (Private)', 'Private (Only Me)', 'தனிப்பட்டது')}
                      </span>
                      <p className="text-[10px] text-slate-600 dark:text-zinc-400 mt-0.5 leading-snug">
                        {getLang(
                          'ඔබට පමණක් පෙනේ. ඔබගේ ගිණුමට පමණක් සුරැකේ. ඔබ කැමති නම් ඔබට පමණක් Share කළ හැක.',
                          'Only visible to you. Kept private in your account.',
                          'உங்களுக்கு மட்டுமே தெரியும்.'
                        )}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  {getLang('අවලංගු කරන්න', 'Cancel', 'ரத்து')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? getLang('සුරකිමින්...', 'Saving...', 'சேமிக்கிறது...') : getLang('💾 ස්ථානය සුරකින්න', 'Save Spot Now', 'சேமிக்கவும்')}</span>
                </button>
              </div>
            </form>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getLang(
                'ස්ථාන නාමයෙන් හෝ විස්තරයෙන් සොයන්න...',
                'Search saved places by name or landmark...',
                'இடங்களைத் தேடுங்கள்...'
              )}
              className="w-full bg-slate-50 dark:bg-zinc-800/60 pl-10 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Places List - Sorted by Proximity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-zinc-400 px-1">
              <span>
                {getLang(
                  `ස්ථාන ${sortedAndFilteredPlaces.length} ක් හමුවිය (ළඟම ඇති ස්ථානයේ සිට පිළිවෙළට)`,
                  `Showing ${sortedAndFilteredPlaces.length} places (Sorted nearest to farthest)`,
                  `${sortedAndFilteredPlaces.length} இடங்கள்`
                )}
              </span>
            </div>

            {sortedAndFilteredPlaces.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-3xl bg-slate-50 dark:bg-zinc-800/40 border border-dashed border-slate-200 dark:border-zinc-700 space-y-2">
                <MapPin className="w-8 h-8 text-slate-400 mx-auto opacity-40" />
                <p className="text-xs font-bold text-slate-600 dark:text-zinc-400">
                  {getLang('කිසිදු සුරකින ලද ස්ථානයක් හමු නොවීය.', 'No saved places found in this view.', 'சேமிக்கப்பட்ட இடங்கள் எதுவும் இல்லை.')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-500">
                  {getLang(
                    'ඉහත "📍 නව ස්ථානයක් සුරකින්න" ඔබා ඔබ සිටින ස්ථානය සටහන් කරන්න.',
                    'Tap "Save This Spot" above to record your current location.',
                    'புதிய இடத்தை சேமிக்க மேலே கிளிக் செய்யவும்.'
                  )}
                </p>
              </div>
            ) : (
              sortedAndFilteredPlaces.map((place) => {
                const isOwner = place.userId === currentUserId;
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

                return (
                  <div
                    key={place.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#07170e] border-2 border-slate-200/80 dark:border-zinc-800 hover:border-emerald-400/60 dark:hover:border-emerald-600 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Left: Place Info & Distance Badge */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <Navigation className="w-2.5 h-2.5 rotate-45 text-emerald-600 fill-current" />
                          <span>{place.distanceFormatted}</span>
                        </span>

                        {place.isPublic ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Globe className="w-2.5 h-2.5" />
                            <span>{getLang('ප්‍රජාවට පොදුයි', 'Public', 'பொது')}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Lock className="w-2.5 h-2.5" />
                            <span>{getLang('පෞද්ගලිකයි', 'Private', 'தனிப்பட்டது')}</span>
                          </span>
                        )}

                        {isOwner && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            {getLang('මගේ සටහනක්', 'My Entry', 'என் பதிவு')}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-slate-900 dark:text-zinc-100 truncate">
                        {place.name}
                      </h4>

                      {place.description && (
                        <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {place.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                        <span>Lat: {place.lat.toFixed(4)}, Lng: {place.lng.toFixed(4)}</span>
                        {place.userName && (
                          <span>• {place.userName}</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions (Directions, Share, Delete) */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      
                      {/* 1. Navigate via Google Maps */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                        title={getLang('Google Maps හරහා මාර්ගය සොයන්න', 'Directions via Google Maps', 'வழிசெலுத்தல்')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{getLang('මාර්ගය', 'Route', 'வழி')}</span>
                      </a>

                      {/* 2. Share Place */}
                      <button
                        type="button"
                        onClick={() => handleSharePlace(place, place.distanceFormatted)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-bold border border-slate-300 dark:border-zinc-700 transition-all active:scale-95 cursor-pointer"
                        title={getLang('ස්ථානය බෙදාගන්න (Share)', 'Share Location', 'பகிர்')}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{getLang('Share', 'Share', 'பகிர்')}</span>
                      </button>

                      {/* 3. Delete Place (Only if owner) */}
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDeletePlace(place.id)}
                          className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 border border-rose-200 dark:border-rose-900 flex items-center justify-center transition-all cursor-pointer"
                          title={getLang('ඉවත් කරන්න', 'Delete', 'நீக்கு')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-100 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {getLang(
                'ස්ථාන සුරැකීමේදී ඔබගේ දුරකථනයේ Auto GPS ඛණ්ඩාංක සෘජුවම භාවිත කෙරේ.',
                'Auto GPS coordinates are recorded directly on save.',
                'தானியங்கி ஜிபிஎஸ் ஒருங்கிணைப்புகள் பயன்படுத்தப்படுகின்றன.'
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 text-slate-800 dark:text-zinc-200 font-bold text-xs cursor-pointer"
          >
            {getLang('වසන්න', 'Close', 'மூடு')}
          </button>
        </div>

      </div>
    </div>
  );
};
