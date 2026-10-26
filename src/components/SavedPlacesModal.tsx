
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

// Road distance approximation helper (Inlined to avoid version mismatch in geoUtils)
const calculateRoadDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const straightKm = calculateDistanceKm(lat1, lon1, lat2, lon2);
  if (straightKm < 0.05) return straightKm;
  const winding = straightKm < 5 ? 1.28 : straightKm < 20 ? 1.22 : 1.15;
  return Number((straightKm * winding).toFixed(1));
};
// High accuracy GPS location helper (Inlined to avoid external dependency)
const getHighAccuracyLocation = async (timeoutMs = 10000): Promise<{ lat: number; lng: number; accuracyMeters: number }> => {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ lat: 7.0786, lng: 79.8913, accuracyMeters: 50 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracyMeters: Math.round(pos.coords.accuracy || 10),
        });
      },
      () => {
        resolve({ lat: 7.0786, lng: 79.8913, accuracyMeters: 50 });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
};

import {
  db,
  subscribeToSavedPlacesFromFirestore,
  savePlaceToFirestore,
  deletePlaceFromFirestore
} from '../lib/firebase';

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

  const currentUserId = currentUser?.id ? currentUser.id : currentUser?.userId ? currentUser.userId : 'usr_guest';

  const currentUserName = currentUser?.name ? currentUser.name : 'පරිශීලක';

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

      // Resolve address

      const addr = await resolveExactLocation(fix.lat, fix.lng);

      setResolvedAddress(addr.nameSi || addr.nameEn || `${fix.lat.toFixed(4)}, ${fix.lng.toFixed(4)}`);

    } catch (e) {

      console.error('High accuracy GPS error:', e);

    } finally {

      setIsLocating(false);

    }

  };

  // Firestore Live Listener

  useEffect(() => {
    const unsub = subscribeToSavedPlacesFromFirestore((remotePlaces) => {
      setPlaces((prev) => {
        const map = new Map();
        DEFAULT_COMMUNITY_PLACES.forEach((p) => map.set(p.id, p));
        (prev ? prev : []).forEach((p) => {
          if (p && p.id) map.set(p.id, p);
        });
        (remotePlaces ? remotePlaces : []).forEach((p: any) => {
          if (p && p.id) map.set(p.id, p);
        });
        const merged = Array.from(map.values()).sort((a: any, b: any) => (b.createdAtMs ? b.createdAtMs : 0) - (a.createdAtMs ? a.createdAtMs : 0));
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {}
        return merged;
      });
    });
    return () => unsub();

  }, []);

  // Filtered List

  const filteredPlaces = useMemo(() => {

    return places.filter((p) => {

      // Tab filter

      if (activeTab === 'my' && p.userId !== currentUserId) return false;

      if (activeTab === 'public' && !p.isPublic) return false;

      // Privacy: Private places only visible to their creator

      if (!p.isPublic && p.userId !== currentUserId) return false;

      // Search filter

      if (searchQuery.trim()) {

        const q = searchQuery.toLowerCase().trim();

        const matchesName = p.name.toLowerCase().includes(q);

        const matchesDesc = p.description?.toLowerCase().includes(q);

        return matchesName || matchesDesc;

      }

      return true;

    });

  }, [places, activeTab, currentUserId, searchQuery]);

  // Handle Create Place

  const handleSavePlace = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!placeName.trim()) return;

    setIsSubmitting(true);

    const newPlace: SavedPlaceItem = {

      id: `plc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,

      name: placeName.trim(),

      description: description.trim() || undefined,

      lat: currentCoords.lat,

      lng: currentCoords.lng,

      accuracyMeters: gpsAccuracy || undefined,

      isPublic: isPublic,

      userId: currentUserId,

      userName: currentUserName,

      userPhone: currentUser?.phone || undefined,

      createdAt: new Date().toISOString(),

      createdAtMs: Date.now(),

    };

    try {

      // 1. Save to local storage first (instant responsiveness)

      setPlaces((prev) => {

        const updated = [newPlace, ...prev];

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

        return updated;

      });

      // 2. Save to Firestore with exact place ID so all users see it in real-time
      await savePlaceToFirestore(newPlace);

      setSaveSuccessMsg(getLang('ස්ථානය සාර්ථකව සුරකින ලදී!', 'Place saved successfully!', 'இடம் வெற்றிகரமாகச் சேமிக்கப்பட்டது!'));

      setPlaceName('');

      setDescription('');

      setShowAddForm(false);

      setTimeout(() => setSaveSuccessMsg(null), 4000);

    } catch (err) {

      console.error('Error saving place:', err);

    } finally {

      setIsSubmitting(false);

    }

  };

  // Handle Delete Place

  const handleDeletePlace = async (placeId: string) => {

    if (!window.confirm(getLang('මෙම ස්ථානය මකා දැමීමට ඔබට අවශ්‍ය බව තහවුරු කරන්නද?', 'Are you sure you want to delete this place?', 'இந்த இடத்தை நீக்க விரும்புகிறீர்களா?'))) return;

    try {

      setPlaces((prev) => {

        const updated = prev.filter((p) => p.id !== placeId);

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

        return updated;

      });

      await deletePlaceFromFirestore(placeId);

    } catch (err) {

      console.error('Error deleting place:', err);

    }

  };

  // Google Maps Direct Direction Launcher

  const handleOpenGoogleMaps = (p: SavedPlaceItem) => {

    const url = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;

    window.open(url, '_blank');

  };

  // Share Place URL

  const handleSharePlace = (p: SavedPlaceItem) => {

    const shareText = `📍 ${p.name}\n${p.description ? p.description + '\n' : ''}Google Maps: https://maps.google.com/?q=${p.lat},${p.lng}\n(සහය සේවා ප්‍රජා සිතියම - Sahaya Sewa)`;

    if (navigator.share) {

      navigator.share({ title: p.name, text: shareText }).catch(() => {});

    } else {

      navigator.clipboard.writeText(shareText);

      setSharedToast(getLang('තොරතුරු පිටපත් කරන ලදී!', 'Copied to clipboard!', 'நகலெடுக்கப்பட்டது!'));

      setTimeout(() => setSharedToast(null), 3000);

    }

  };

  if (!isOpen) return null;

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">

      <div className="w-full max-w-2xl bg-gradient-to-b from-white via-emerald-50/20 to-white dark:from-[#06180f] dark:via-[#04120a] dark:to-[#06180f] border-2 border-emerald-500/50 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,122,75,0.3)] overflow-hidden flex flex-col max-h-[92vh]">

        {/* Modal Header */}

        <div className="p-4 sm:p-5 pb-3 border-b border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between shrink-0">

          <div className="flex items-center gap-2.5">

            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md">

              <MapPin className="w-5 h-5" />

            </div>

            <div>

              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">

                <span>{getLang('සුරැකි ස්ථාන සහ ප්‍රජා සිතියම', 'Saved Places & Community Map', 'சேமிக்கப்பட்ட இடங்கள்')}</span>

              </h2>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">

                {getLang('ඔබගේ නිතර අවශ්‍ය ස්ථාන සහ ප්‍රජා සේවා කේන්ද්‍රස්ථාන', 'Personal locations & community service hubs', 'உங்கள் முக்கிய இடங்கள்')}

              </p>

            </div>

          </div>

          <button

            onClick={onClose}

            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold transition-all cursor-pointer"

          >

            <X className="w-5 h-5" />

          </button>

        </div>

        {/* Toast Alerts */}

        {saveSuccessMsg && (

          <div className="mx-4 mt-2 p-2.5 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-500 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2">

            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />

            <span>{saveSuccessMsg}</span>

          </div>

        )}

        {sharedToast && (

          <div className="mx-4 mt-2 p-2.5 bg-teal-100 dark:bg-teal-950/80 border border-teal-500 text-teal-800 dark:text-teal-200 text-xs rounded-xl flex items-center gap-2">

            <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600" />

            <span>{sharedToast}</span>

          </div>

        )}

        {/* Main Content Body */}

        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1">

          {/* Action Header: Search & Add Place Button */}

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">

            <div className="relative flex-1">

              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

              <input

                type="text"

                value={searchQuery}

                onChange={(e) => setSearchQuery(e.target.value)}

                placeholder={getLang('ස්ථාන නමකින් සොයන්න...', 'Search saved places...', 'தேடுங்கள்...')}

                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"

              />

            </div>

            <button

              onClick={() => {

                setShowAddForm(!showAddForm);

                if (!showAddForm) handleDetectGps();

              }}

              className="py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"

            >

              <Plus className="w-4 h-4" />

              <span>{showAddForm ? getLang('පෝරමය වසන්න', 'Close Form', 'படிவத்தை மூடு') : getLang('නව ස්ථානයක් එක් කරන්න', 'Add New Place', 'புதிய இடம்')}</span>

            </button>

          </div>

          {/* Add New Place Form Box */}

          {showAddForm && (

            <form onSubmit={handleSavePlace} className="p-4 bg-emerald-50/60 dark:bg-[#071911] border-2 border-emerald-500/40 rounded-3xl space-y-3 animate-fadeIn">

              <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/60 pb-2">

                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">

                  <Compass className="w-4 h-4" />

                  <span>{getLang('වත්මන් ස්ථානය සිතියමට සුරකින්න', 'Save Active GPS Location', 'இடத்தைச் சேமி')}</span>

                </span>

                <button

                  type="button"

                  onClick={handleDetectGps}

                  disabled={isLocating}

                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"

                >

                  <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />

                  <span>{isLocating ? getLang('GPS ලබාගනිමින්...', 'Locating...', 'இடம் பெறுகிறது...') : getLang('නැවත GPS සොයන්න', 'Refresh GPS', 'புதுப்பிக்க')}</span>

                </button>

              </div>

              {/* Coordinates Indicator */}

              <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-emerald-200 dark:border-emerald-900 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">

                <div className="flex items-center justify-between">

                  <span>{getLang('අක්ෂාංශ / දේශාංශ:', 'Coordinates:', 'ஆயத்தொலைவுகள்:')}</span>

                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">

                    {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}

                  </span>

                </div>

                {resolvedAddress && (

                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">

                    📍 {resolvedAddress}

                  </div>

                )}

                {gpsAccuracy && (

                  <div className="text-[10px] text-emerald-600 font-bold">

                    ⚡ {getLang(`GPS නිරවද්‍යතාවය: මීටර් ${Math.round(gpsAccuracy)} ක් ඇතුළත`, `GPS Accuracy: within ${Math.round(gpsAccuracy)}m`, `துல்லியம்: ${Math.round(gpsAccuracy)}m`)}

                  </div>

                )}

              </div>

              {/* Form Input: Name */}

              <div>

                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">

                  {getLang('ස්ථානයේ නම *', 'Place Name *', 'இடத்தின் பெயர் *')}

                </label>

                <input

                  type="text"

                  required

                  value={placeName}

                  onChange={(e) => setPlaceName(e.target.value)}

                  placeholder={getLang('උදා: මගේ නිවස, ජා-ඇල සේවා ස්ථානය, ප්‍රධාන ඩිපෝව', 'e.g., My Home, Ja-Ela Workshop, Main Depot', 'உதாரணம்: எனது வீடு')}

                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"

                />

              </div>

              {/* Form Input: Description */}

              <div>

                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">

                  {getLang('විස්තරය (විකල්ප)', 'Description (Optional)', 'விளக்கம்')}

                </label>

                <input

                  type="text"

                  value={description}

                  onChange={(e) => setDescription(e.target.value)}

                  placeholder={getLang('ස්ථානයට ළඟාවීමට විශේෂ සලකුණු හෝ මාර්ග උපදෙස්', 'Landmarks or arrival directions', 'அடையாளங்கள்')}

                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"

                />

              </div>

              {/* Form Input: Privacy Toggle */}

              <div className="flex items-center gap-3 pt-1">

                <button

                  type="button"

                  onClick={() => setIsPublic(true)}

                  className={`flex-1 py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${

                    isPublic

                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'

                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'

                  }`}

                >

                  <Globe className="w-3.5 h-3.5" />

                  <span>{getLang('ප්‍රජාවට පොදුයි (Public)', 'Public to Community', 'பொதுவானது')}</span>

                </button>

                <button

                  type="button"

                  onClick={() => setIsPublic(false)}

                  className={`flex-1 py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${

                    !isPublic

                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm'

                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'

                  }`}

                >

                  <Lock className="w-3.5 h-3.5" />

                  <span>{getLang('මට පමණයි (Private)', 'Only for Me', 'தனிப்பட்டது')}</span>

                </button>

              </div>

              {/* Submit Button */}

              <button

                type="submit"

                disabled={isSubmitting || !placeName.trim()}

                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"

              >

                {isSubmitting ? getLang('සුරකිමින් පවතී...', 'Saving...', 'சேமிக்கிறது...') : getLang('ස්ථානය සුරකින්න (Save Place)', 'Save Place to Map', 'சேமிக்கவும்')}

              </button>

            </form>

          )}

          {/* Filter Tabs: All / My Places / Community Public */}

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">

            <button

              onClick={() => setActiveTab('all')}

              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${

                activeTab === 'all'

                  ? 'bg-white dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-500/30'

                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'

              }`}

            >

              {getLang('සියල්ල', 'All Places', 'அனைத்தும்')} ({places.length})

            </button>

            <button

              onClick={() => setActiveTab('my')}

              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${

                activeTab === 'my'

                  ? 'bg-white dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-500/30'

                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'

              }`}

            >

              {getLang('මගේ ස්ථාන', 'My Places', 'எனது')}

            </button>

            <button

              onClick={() => setActiveTab('public')}

              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${

                activeTab === 'public'

                  ? 'bg-white dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-500/30'

                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'

              }`}

            >

              {getLang('ප්‍රජා සිතියම', 'Community Hubs', 'பொது')}

            </button>

          </div>

          {/* Places Cards List */}

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">

            {filteredPlaces.length === 0 ? (

              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">

                {getLang('ස්ථාන කිසිවක් හමු නොවීය.', 'No saved places found in this view.', 'இடங்கள் எதுவும் இல்லை.')}

              </div>

            ) : (

              filteredPlaces.map((p) => {

                const isMyPlace = p.userId === currentUserId;

                const distanceKm = currentLocation

                  ? calculateDistanceKm(currentLocation.lat, currentLocation.lng, p.lat, p.lng)

                  : null;

                return (

                  <div

                    key={p.id}

                    className="p-3.5 bg-white dark:bg-[#071911] border border-emerald-200/80 dark:border-emerald-900/60 hover:border-emerald-500/60 rounded-2xl shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"

                  >

                    <div className="min-w-0 space-y-1">

                      <div className="flex items-center gap-2">

                        <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm truncate">

                          {p.name}

                        </span>

                        {p.isPublic ? (

                          <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">

                            <Globe className="w-2.5 h-2.5" />

                            <span>Public</span>

                          </span>

                        ) : (

                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">

                            <Lock className="w-2.5 h-2.5" />

                            <span>Private</span>

                          </span>

                        )}

                      </div>

                      {p.description && (

                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">

                          {p.description}

                        </p>

                      )}

                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-3 pt-0.5 font-mono">

                        {distanceKm !== null && (

                          <span className="font-bold text-emerald-700 dark:text-emerald-400">

                            📏 ~{distanceKm.toFixed(1)} km දුරින්

                          </span>

                        )}

                        <span>📍 {p.lat.toFixed(4)}, {p.lng.toFixed(4)}</span>

                        {p.userName && (

                          <span className="hidden sm:inline">• {p.userName}</span>

                        )}

                      </div>

                    </div>

                    {/* Action Buttons: Navigate / Share / Delete */}

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">

                      <button

                        onClick={() => handleOpenGoogleMaps(p)}

                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"

                        title={getLang('Google Maps මඟින් මාර්ගය පෙන්වන්න', 'Open Directions in Google Maps', 'வரைபடம்')}

                      >

                        <Navigation className="w-3.5 h-3.5" />

                        <span>{getLang('මාර්ගය', 'Directions', 'வழி')}</span>

                      </button>

                      <button

                        onClick={() => handleSharePlace(p)}

                        className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"

                        title={getLang('ස්ථානය බෙදාගන්න (Share)', 'Share Place', 'பகிரவும்')}

                      >

                        <Share2 className="w-3.5 h-3.5" />

                      </button>

                      {isMyPlace && (

                        <button

                          onClick={() => handleDeletePlace(p.id)}

                          className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all cursor-pointer"

                          title={getLang('ස්ථානය මකා දමන්න', 'Delete Place', 'நீக்கு')}

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

        <div className="p-3.5 bg-slate-50 dark:bg-[#05140d] border-t border-emerald-200/80 dark:border-emerald-900/60 text-center shrink-0">

          <button

            onClick={onClose}

            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"

          >

            {getLang('වසන්න (Close)', 'Close', 'மூடு')}

          </button>

        </div>

      </div>

    </div>

  );

};

export default SavedPlacesModal;

