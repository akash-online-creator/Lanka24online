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
  Layers,
  Pencil
} from 'lucide-react';
import { User, LocationOption, Language } from '../types';
import { calculateDistanceKm, calculateRoadDistanceKm, resolveExactLocation } from '../utils/geoUtils';
import { checkIsAdmin } from '../utils/postOwnerHelper';
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
  serverTimestamp,
  updateDoc
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
  onSelectSavedLocation?: (loc: any) => void;
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
  // Effective active user (from props or localStorage session)
  const activeUser = currentUser || (() => {
    try {
      const saved = localStorage.getItem('sahaya_sewa_session_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const currentUserId = activeUser?.id || activeUser?.userId || 'usr_guest';
  const currentUserName = activeUser?.name || 'පරිශීලක';

  // Robust Admin check
  const isAdmin = Boolean(
    activeUser?.role === 'admin' ||
    activeUser?.role === 'super_admin' ||
    (activeUser as any)?.isAdmin === true ||
    (activeUser as any)?.isSuperAdmin === true ||
    (activeUser as any)?.userId?.toString().toLowerCase().includes('admin') ||
    activeUser?.id === 'usr_admin' ||
    activeUser?.id === 'admin' ||
    (activeUser as any)?.nic === '970181547V' ||
    (activeUser as any)?.nicNumber === '970181547V' ||
    checkIsAdmin(activeUser)
  );

  // Form State
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
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

  // Helper: Detect active GPS location with Meter-Level Precision
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

  // Pre-load GPS & Real-time Sync Firestore on Open
  useEffect(() => {
    if (isOpen) {
      handleDetectGps();
      setShowAddForm(false);
      setPlaceName('');
      setDescription('');
      setIsPublic(true);
      setSaveSuccessMsg(null);

      // Real-time sync with Firebase Cloud Firestore
      try {
        const q = query(collection(db, 'saved_places'), orderBy('createdAtMs', 'desc'));
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const firestorePlaces: SavedPlaceItem[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const placeIsPublic = data.isPublic !== false;
              const isMyPlace = data.userId === currentUserId;

              // Include public places for everyone, or private places for creator/admin
              if (placeIsPublic || isMyPlace || isAdmin) {
                firestorePlaces.push({
                  id: docSnap.id,
                  name: data.name || '',
                  description: data.description || '',
                  lat: data.lat || 0,
                  lng: data.lng || 0,
                  accuracyMeters: data.accuracyMeters,
                  isPublic: placeIsPublic,
                  userId: data.userId || '',
                  userName: data.userName || 'ප්‍රජා සාමාජිකයෙක්',
                  userPhone: data.userPhone,
                  createdAt: data.createdAt,
                  createdAtMs: data.createdAtMs || Date.now(),
                });
              }
            });

            // Merge with default community places
            const idSet = new Set(firestorePlaces.map((p) => p.id));
            const merged = [
              ...firestorePlaces,
              ...DEFAULT_COMMUNITY_PLACES.filter((p) => !idSet.has(p.id)),
            ];

            setPlaces(merged);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
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
  }, [isOpen, currentUserId, isAdmin]);

  // Edit Place Handlers
  const handleStartEditPlace = (place: SavedPlaceItem) => {
    setEditingPlaceId(place.id);
    setPlaceName(place.name);
    setDescription(place.description || '');
    setIsPublic(place.isPublic);
    setCurrentCoords({ lat: place.lat, lng: place.lng });
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setEditingPlaceId(null);
    setPlaceName('');
    setDescription('');
    setShowAddForm(false);
  };

  // Save New or Modified Place Handler with Auto-Refresh
  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) {
      alert(getLang('කරුණාකර ස්ථානයේ නම ඇතුළත් කරන්න.', 'Please enter the place name.', 'தயவுசெய்து இடத்தின் பெயரை உள்ளிடவும்.'));
      return;
    }

    setIsSubmitting(true);

    const placeData = {
      name: placeName.trim(),
      description: description.trim(),
      lat: currentCoords.lat,
      lng: currentCoords.lng,
      accuracyMeters: gpsAccuracy || null,
      isPublic: isPublic,
      userId: currentUserId,
      userName: currentUserName,
      userPhone: currentUser?.phone || (currentUser as any)?.whatsappNumber || '',
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
    };

    try {
      if (editingPlaceId) {
        // Update existing place in Firestore
        await updateDoc(doc(db, 'saved_places', editingPlaceId), {
          ...placeData,
          updatedAt: serverTimestamp(),
        });

        const updatedList = places.map((p) => {
          if (p.id === editingPlaceId) {
            return {
              ...p,
              ...placeData,
              accuracyMeters: gpsAccuracy || p.accuracyMeters,
            };
          }
          return p;
        });
        setPlaces(updatedList);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
        } catch {}
      } else {
        // Add new place to Firestore
        const docRef = await addDoc(collection(db, 'saved_places'), {
          ...placeData,
          serverTimestamp: serverTimestamp(),
        });

        const newPlaceItem: SavedPlaceItem = {
          id: docRef.id,
          ...placeData,
          accuracyMeters: gpsAccuracy || undefined,
        };

        const updatedList = [newPlaceItem, ...places.filter((p) => p.id !== newPlaceItem.id)];
        setPlaces(updatedList);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
        } catch {}
      }

      // Reset Form & Refresh View Tab
      setEditingPlaceId(null);
      setPlaceName('');
      setDescription('');
      setShowAddForm(false);
      setActiveTab('all');

      setSaveSuccessMsg(
        isPublic
          ? getLang('✅ ස්ථානය ප්‍රජාවට පොදුවේ සාර්ථකව සුරකින ලදී!', '✅ Public location saved successfully!', '✅ பொது இடம் வெற்றிகரமாக சேமிக்கப்பட்டது!')
          : getLang('✅ ස්ථානය පෞද්ගලිකව සාර්ථකව සුරකින ලදී!', '✅ Private location saved successfully!', '✅ தனிப்பட்ட இடம் வெற்றிகரமாக சேமிக்கப்பட்டது!')
      );
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Error saving place to Firestore:', err);
      alert(getLang('ස්ථානය සුරැකීමේදී දෝෂයක් සිදු විය.', 'Failed to save place.', 'இடத்தைச் சேமிப்பதில் பிழை ஏற்பட்டது.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Place Handler
  const handleDeletePlace = async (placeId: string) => {
    if (!window.confirm(getLang('ඔබට මෙම ස්ථානය ඉවත් කිරීමට අවශ්‍යද?', 'Are you sure you want to delete this place?', 'இந்த இடத்தை நீக்க வேண்டுமா?'))) {
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

  // Filtered Places list calculation
  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      // Search filter
      const matchesSearch =
        searchQuery.trim() === '' ||
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (place.description && place.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Tab filter
      if (activeTab === 'my') {
        return place.userId === currentUserId;
      }
      if (activeTab === 'public') {
        return place.isPublic;
      }
      return true;
    });
  }, [places, activeTab, searchQuery, currentUserId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {getLang('සුරැකි ස්ථාන', 'Saved Places', 'சேமிக்கப்பட்ட இடங்கள்')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {getLang('ඔබගේ සහ ප්‍රජාවේ සුරැකි ස්ථාන කළමනාකරණය', 'Manage your saved and community locations', 'உங்கள் மற்றும் சமூகத்தின் சேமிக்கப்பட்ட இடங்களை நிர்வகிக்கவும்')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-sm rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 animate-slide-down">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Action Header & Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {getLang('සියල්ල', 'All Places', 'அனைத்தும்')} ({places.length})
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'my'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {getLang('මගේ ස්ථාන', 'My Places', 'என் இடங்கள்')}
              </button>
              <button
                onClick={() => setActiveTab('public')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'public'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {getLang('පොදු ස්ථාන', 'Public', 'பொது')}
              </button>
            </div>

            {!showAddForm && (
              <button
                onClick={() => {
                  setEditingPlaceId(null);
                  setPlaceName('');
                  setDescription('');
                  setIsPublic(true);
                  setShowAddForm(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{getLang('අලුත් ස්ථානයක් එකතු කරන්න', 'Add New Place', 'புதிய இடத்தை சேர்க்க')}</span>
              </button>
            )}
          </div>

          {/* Add / Edit Form */}
          {showAddForm && (
            <form onSubmit={handleSavePlace} className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  {editingPlaceId
                    ? getLang('ස්ථානය සංස්කරණය කරන්න', 'Edit Place', 'இடத்தை திருத்து')
                    : getLang('වත්මන් ස්ථානය සුරකින්න', 'Save Current Location', 'தற்போதைய இருப்பிடத்தை சேமி')}
                </h3>
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={isLocating}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{getLang('GPS නැවත ලබාගන්න', 'Refresh GPS', 'GPS ஐ புதுப்பிக்கவும்')}</span>
                </button>
              </div>

              {/* Current Coords Display */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <div>
                  <span className="font-semibold">{getLang('ඛණ්ඩාංක:', 'Coordinates:', 'ஆயத்தொலைவுகள்:')}</span> {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
                  {gpsAccuracy && <span className="ml-2 text-slate-400">(±{Math.round(gpsAccuracy)}m)</span>}
                </div>
                {resolvedAddress && <span className="text-emerald-600 font-medium truncate max-w-[200px]">{resolvedAddress}</span>}
              </div>

              {/* Place Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {getLang('ස්ථානයේ නම', 'Place Name', 'இடத்தின் பெயர்')} *
                </label>
                <input
                  type="text"
                  required
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder={getLang('උදා: නිවස, කාර්යාලය, ජා-ඇල නගරය', 'e.g. Home, Office, Ja-Ela Town', 'எ.கா. வீடு, அலுவலகம்')}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {getLang('විස්තරය (විකල්ප)', 'Description (Optional)', 'விளக்கம் (விருப்பத்தேர்வு)')}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={getLang('විස්තරයක් හෝ සලකුණක් ඇතුළත් කරන්න...', 'Add details or landmark reference...', 'விவரங்களைச் சேர்க்கவும்...')}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Public vs Private Selection */}
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {isPublic ? (
                    <Globe className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-600" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {isPublic
                        ? getLang('පොදු ස්ථානයක් ලෙස පලකරන්න (Public)', 'Publish as Public Location', 'பொது இடமாக வெளியிடு')
                        : getLang('පෞද්ගලික ස්ථානයක් (Private)', 'Save as Private Location', 'தனிப்பட்ட இடமாக சேமி')}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {isPublic
                        ? getLang('අන් සියලු දෙනාටම පෙනෙන සේ ප්‍රජා සිතියමට එකතු වේ', 'Visible to everyone on community map', 'அனைவருக்கும் சமூக வரைபடத்தில் காணப்படும்')
                        : getLang('ඔබට පමණක් පෙනෙන සේ සුරැකේ', 'Visible only to you', 'உங்களுக்கு மட்டுமே காணப்படும்')}
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  {getLang('අවලංගු කරන්න', 'Cancel', 'ரத்து செய்')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{getLang('සුරකින්න (Save)', 'Save Place', 'சேமிக்கவும்')}</span>
                </button>
              </div>
            </form>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getLang('ස්ථාන සොයන්න...', 'Search places...', 'இடங்களைத் தேடுங்கள்...')}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Places List */}
          <div className="space-y-3">
            {filteredPlaces.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                {getLang('කිසිදු ස්ථානයක් හමු නොවීය', 'No places found', 'இடங்கள் எதுவும் கிடைக்கவில்லை')}
              </div>
            ) : (
              filteredPlaces.map((place) => (
                <div
                  key={place.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-start justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{place.name}</span>
                      {place.isPublic ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <Globe className="w-3 h-3" /> Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      )}
                    </div>

                    {place.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{place.description}</p>
                    )}

                    <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                      <span>👤 {place.userName}</span>
                      <span>📍 {place.lat.toFixed(4)}, {place.lng.toFixed(4)}</span>
                    </div>
                  </div>

                  {/* Place Actions */}
                  <div className="flex items-center gap-1">
                    {(place.userId === currentUserId || isAdmin) && (
                      <>
                        <button
                          onClick={() => handleStartEditPlace(place)}
                          className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlace(place.id)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
          >
            {getLang('වහන්න', 'Close', 'மூடு')}
          </button>
        </div>

      </div>
    </div>
  );
};
