import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, 
  Navigation, 
  Crosshair, 
  ZoomIn, 
  ZoomOut, 
  ExternalLink, 
  Check, 
  Radio, 
  Compass, 
  Info, 
  Copy, 
  X, 
  Globe, 
  Loader2, 
  AlertTriangle, 
  Lock, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  Navigation2,
  Milestone,
  Building2,
  Home,
  Edit3,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Layers,
  Map as MapIcon,
  ChevronRight,
  CheckCircle2,
  Sliders,
  MapPinCheck
} from 'lucide-react';
import { LocationOption, Language, Theme } from '../types';
import { 
  resolveExactLocation, 
  toLocationOption, 
  GeoResolvedLocation, 
  getSuggestedRoadsForLocation, 
  updateLocationWithRoad,
  searchSriLankanPlacesAndRoads,
  PlaceSearchResult,
  SRI_LANKA_CURATED_PLACES,
  formatOrderedLocation
} from '../utils/geoUtils';

interface MapLocationTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationOption;
  availableLocations: LocationOption[];
  onSaveLocation: (loc: LocationOption) => void;
  lang: Language;
  theme?: Theme;
}

interface GPSStatus {
  tracking: boolean;
  locked: boolean;
  error: string | null;
  lat: number;
  lng: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: string | null;
}

type ModeTab = 'search' | 'roads' | 'gps' | 'nudge' | 'manual';

export const MapLocationTracker: React.FC<MapLocationTrackerProps> = ({
  isOpen,
  onClose,
  currentLocation,
  availableLocations,
  onSaveLocation,
  lang,
  theme = 'light',
}) => {
  // Pin Coordinates
  const [pinLat, setPinLat] = useState<number>(currentLocation.lat || 7.1712);
  const [pinLng, setPinLng] = useState<number>(currentLocation.lng || 79.8978);

  // Active Alternative Mode Tab
  const [activeTab, setActiveTab] = useState<ModeTab>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>(SRI_LANKA_CURATED_PLACES.slice(0, 8));
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Manual 3-field custom inputs
  const [customVillageSi, setCustomVillageSi] = useState<string>('කෝවින්න');
  const [customRoadSi, setCustomRoadSi] = useState<string>('ගංගාරාම පාර');
  const [customTownSi, setCustomTownSi] = useState<string>('කටුනායක');

  // GPS Telemetry
  const [gps, setGps] = useState<GPSStatus>({
    tracking: false,
    locked: false,
    error: null,
    lat: currentLocation.lat || 7.1712,
    lng: currentLocation.lng || 79.8978,
    accuracy: null,
    altitude: null,
    speed: null,
    heading: null,
    timestamp: null,
  });

  // Map Controls & Geocoding State
  const [zoom, setZoom] = useState<number>(17);
  const [isCopied, setIsCopied] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [resolvedGeo, setResolvedGeo] = useState<GeoResolvedLocation | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const bestAccuracyRef = useRef<number>(99999);
  const searchDebounceRef = useRef<any>(null);

  // High-precision address lookup strictly resolving [Village, Road, Town]
  const lookupAddress = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const geo = await resolveExactLocation(lat, lng);
      setResolvedGeo(geo);
      setCustomVillageSi(geo.villageSi || 'කෝවින්න');
      setCustomRoadSi(geo.roadSi || 'ගංගාරාම පාර');
      setCustomTownSi(geo.townSi || 'කටුනායක');
    } catch (err) {
      console.error('Failed to resolve address:', err);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Search input handler with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchSriLankanPlacesAndRoads(query);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);
  };

  // Select place from search or curated list
  const handleSelectPlace = (place: PlaceSearchResult) => {
    setPinLat(place.lat);
    setPinLng(place.lng);
    setCustomVillageSi(place.villageSi);
    setCustomRoadSi(place.roadSi);
    setCustomTownSi(place.townSi);

    const newGeo: GeoResolvedLocation = {
      village: place.villageEn,
      villageSi: place.villageSi,
      villageEn: place.villageEn,
      road: place.roadEn,
      roadSi: place.roadSi,
      roadEn: place.roadEn,
      town: place.townEn,
      townSi: place.townSi,
      townEn: place.townEn,
      district: place.districtEn,
      districtSi: place.districtSi,
      districtEn: place.districtEn,
      province: 'බස්නාහිර පළාත',
      fullAddressSi: `${place.shortDisplaySi}, ${place.districtSi} දිස්ත්‍රික්කය`,
      fullAddressEn: `${place.shortDisplayEn}, ${place.districtEn} District`,
      shortDisplaySi: place.shortDisplaySi,
      shortDisplayEn: place.shortDisplayEn,
      lat: place.lat,
      lng: place.lng,
    };
    setResolvedGeo(newGeo);
  };

  // Handle user selecting a suggested road chip
  const handleSelectRoadSuggestion = (suggestedRoadSi: string, suggestedRoadEn?: string) => {
    setCustomRoadSi(suggestedRoadSi);
    if (resolvedGeo) {
      const updated = updateLocationWithRoad(resolvedGeo, suggestedRoadSi, suggestedRoadEn);
      setResolvedGeo(updated);
    }
  };

  // Micro-nudge pin coordinates (North, South, East, West)
  const handleNudge = (deltaLat: number, deltaLng: number) => {
    const nextLat = Number((pinLat + deltaLat).toFixed(6));
    const nextLng = Number((pinLng + deltaLng).toFixed(6));
    setPinLat(nextLat);
    setPinLng(nextLng);
    lookupAddress(nextLat, nextLng);
  };

  // Start High-Accuracy Real-Time GPS Tracking with satellite multi-sample lock
  const startLiveGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGps((prev) => ({
        ...prev,
        tracking: false,
        error: 'ඔබගේ උපාංගයේ GPS Geolocation සහාය නොදක්වයි (Device does not support GPS)',
      }));
      return;
    }

    setGps((prev) => ({ ...prev, tracking: true, error: null }));
    setIsGeocoding(true);
    bestAccuracyRef.current = 99999;

    const onPositionUpdate = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, altitude, speed, heading } = pos.coords;
      const roundedAcc = Math.round(accuracy);
      
      // Update telemetry
      setGps({
        tracking: true,
        locked: true,
        error: null,
        lat: latitude,
        lng: longitude,
        accuracy: roundedAcc,
        altitude: altitude ? Math.round(altitude) : null,
        speed: speed ? Number((speed * 3.6).toFixed(1)) : 0,
        heading: heading || null,
        timestamp: new Date(pos.timestamp).toLocaleTimeString(),
      });

      // If accuracy is better or equal to current best, refine pin
      if (roundedAcc <= bestAccuracyRef.current || bestAccuracyRef.current === 99999) {
        bestAccuracyRef.current = roundedAcc;
        setPinLat(latitude);
        setPinLng(longitude);
        lookupAddress(latitude, longitude);
      }
    };

    const onError = (err: GeolocationPositionError) => {
      let errMsg = 'GPS ස්ථානය ලබාගත නොහැකි විය.';
      if (err.code === err.PERMISSION_DENIED) {
        errMsg = 'GPS අවසරය ලබාදී නැත (Location permission denied). Settings වලින් Location On කරන්න.';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        errMsg = 'චන්ද්‍රිකා සංඥා දුර්වලයි (GPS position unavailable).';
      } else if (err.code === err.TIMEOUT) {
        errMsg = 'GPS සම්බන්ධතාවය ප්‍රමාදයි (Timeout). නැවත උත්සාහ කරන්න.';
      }

      setGps((prev) => ({
        ...prev,
        tracking: false,
        error: errMsg,
      }));
      setIsGeocoding(false);
    };

    // Instant position fetch
    navigator.geolocation.getCurrentPosition(onPositionUpdate, onError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    // Continuous watch for maximum satellite accuracy lock
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(onPositionUpdate, onError, {
      enableHighAccuracy: true,
      timeout: 25000,
      maximumAge: 500,
    });
  }, [lookupAddress]);

  // Initial trigger on modal open
  useEffect(() => {
    if (isOpen) {
      startLiveGpsTracking();
      lookupAddress(pinLat, pinLng);
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOpen, startLiveGpsTracking, lookupAddress, pinLat, pinLng]);

  // Copy GPS Coordinates
  const handleCopyCoords = () => {
    const text = `${pinLat.toFixed(6)}, ${pinLng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // 1-Click Instant Save Location in exact [Village, Road, Town] order
  const handleOneClickSave = () => {
    if (resolvedGeo) {
      const formattedRoad = customRoadSi ? (customRoadSi.includes('පාර') || customRoadSi.includes('මාවත') || customRoadSi.includes('වීදිය') ? customRoadSi : `${customRoadSi} පාර`) : resolvedGeo.roadSi;
      const finalVillage = customVillageSi || resolvedGeo.villageSi;
      const finalTown = customTownSi || resolvedGeo.townSi;
      
      const shortSi = formatOrderedLocation(finalVillage, formattedRoad, finalTown);
      const shortEn = formatOrderedLocation(resolvedGeo.villageEn, resolvedGeo.roadEn, resolvedGeo.townEn);

      const finalLoc: LocationOption = {
        id: `loc_saved_${Date.now()}`,
        nameSi: shortSi,
        nameEn: shortEn,
        nameTa: shortEn,
        lat: Number(pinLat.toFixed(6)),
        lng: Number(pinLng.toFixed(6)),
      };

      onSaveLocation(finalLoc);
      onClose();
      return;
    }

    // Direct fallback from custom fields
    const directShortSi = formatOrderedLocation(customVillageSi || 'කෝවින්න', customRoadSi || 'ගංගාරාම පාර', customTownSi || 'කටුනායක');
    const fallbackLoc: LocationOption = {
      id: `loc_saved_${Date.now()}`,
      nameSi: directShortSi,
      nameEn: 'Kovinna, Gangarama Road, Katunayake',
      nameTa: 'Kovinna, Gangarama Road, Katunayake',
      lat: Number(pinLat.toFixed(6)),
      lng: Number(pinLng.toFixed(6)),
    };
    onSaveLocation(fallbackLoc);
    onClose();
  };

  if (!isOpen) return null;

  // Google Maps & OpenStreetMap Embed URLs
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${pinLng - 0.0055}%2C${pinLat - 0.0035}%2C${pinLng + 0.0055}%2C${pinLat + 0.0035}&layer=mapnik&marker=${pinLat}%2C${pinLng}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${pinLat},${pinLng}`;

  // Suggested Roads for current location
  const suggestedRoads = getSuggestedRoadsForLocation(
    resolvedGeo?.villageSi || customVillageSi || 'කෝවින්න', 
    resolvedGeo?.townSi || customTownSi || 'කටුනායක'
  );

  return (
    <div 
      id="map-location-tracker-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="bg-white dark:bg-[#0b1b11] border-2 border-emerald-600/40 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#004d2f] via-[#006e43] to-[#004d2f] text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shadow-inner">
              <Navigation className="w-5 h-5 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-wide">
                  සජීවී GPS සහ නිවැරදි ස්ථාන සෙවුම් පද්ධතිය
                </h3>
                <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-100/90 font-medium">
                ගම, පාර සහ නගරය නිවැරදිව තෝරාගැනීමට විකල්ප ක්‍රම (Search / Chips / Nudge / GPS)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-emerald-100 flex items-center justify-center transition-all cursor-pointer"
            title="වසන්න (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container with Scroll */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">

          {/* ACTIVE RESOLVED LOCATION DISPLAY BANNER (1. Village, 2. Road, 3. Town) */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-amber-500/10 border-2 border-emerald-500/50 rounded-2xl p-3.5 sm:p-4 shadow-md space-y-3">
            
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                  <MapPinCheck className="w-3.5 h-3.5" />
                  <span>තෝරාගත් නිවැරදි ස්ථානය (Selected Location)</span>
                </span>
                {isGeocoding && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>හඳුනාගනිමින්...</span>
                  </span>
                )}
              </div>

              {/* Coordinates & Copy */}
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-mono font-bold bg-slate-900/10 dark:bg-slate-900/60 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                  📍 {pinLat.toFixed(5)}, {pinLng.toFixed(5)}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="text-[10px] px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-all"
                  title="Copy Lat/Lng"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* 3-COLUMN STRUCTURED BADGES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              
              {/* 1. VILLAGE */}
              <div className="bg-white/90 dark:bg-slate-900/90 border-2 border-emerald-500/40 rounded-xl p-2.5 sm:p-3 shadow-sm">
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                  <Home className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. ගමේ නම (Village):</span>
                </div>
                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-emerald-200 block mt-1">
                  {customVillageSi || resolvedGeo?.villageSi || 'කෝවින්න'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                  {resolvedGeo?.villageEn || 'Kovinna'}
                </span>
              </div>

              {/* 2. ROAD NAME (HIGHLIGHTED) */}
              <div className="bg-amber-100/70 dark:bg-[#201809] border-2 border-amber-500 rounded-xl p-2.5 sm:p-3 shadow-md relative ring-2 ring-amber-400/30">
                <div className="flex items-center justify-between text-[10px] text-amber-900 dark:text-amber-300 font-black uppercase">
                  <div className="flex items-center gap-1">
                    <Milestone className="w-3.5 h-3.5 text-amber-600" />
                    <span>2. මාර්ගයේ නම (Road):</span>
                  </div>
                  <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black">
                    Active
                  </span>
                </div>
                <span className="font-black text-sm sm:text-base text-amber-950 dark:text-amber-100 block mt-1">
                  {customRoadSi || resolvedGeo?.roadSi || 'ගංගාරාම පාර'}
                </span>
                <span className="text-[10px] text-amber-800/80 dark:text-amber-400/80 block font-mono">
                  {resolvedGeo?.roadEn || 'Gangarama Road'}
                </span>
              </div>

              {/* 3. TOWN */}
              <div className="bg-white/90 dark:bg-slate-900/90 border-2 border-blue-500/40 rounded-xl p-2.5 sm:p-3 shadow-sm">
                <div className="flex items-center gap-1 text-[10px] text-blue-700 dark:text-blue-400 font-bold uppercase">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>3. නගරය (Town / City):</span>
                </div>
                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-blue-200 block mt-1">
                  {customTownSi || resolvedGeo?.townSi || 'කටුනායක'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                  {resolvedGeo?.townEn || 'Katunayake'} ({resolvedGeo?.districtSi || 'ගම්පහ'} දිස්ත්‍රික්කය)
                </span>
              </div>

            </div>

            {/* FULL FORMATTED STRING BANNER */}
            <div className="p-2.5 bg-emerald-950/80 text-emerald-100 rounded-xl text-xs sm:text-sm font-black flex items-center justify-between border border-emerald-500/40">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>ලිපිනය: {formatOrderedLocation(customVillageSi || resolvedGeo?.villageSi || 'කෝවින්න', customRoadSi || resolvedGeo?.roadSi || 'ගංගාරාම පාර', customTownSi || resolvedGeo?.townSi || 'කටුනායක')}</span>
              </span>
              <button
                onClick={handleOneClickSave}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
              >
                ⚡ Save Now
              </button>
            </div>

          </div>

          {/* ALTERNATIVE TOOLS & METHODS TABS */}
          <div className="bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              
              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'search'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>🔍 ස්ථාන සෙවුම</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('roads')}
                className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'roads'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Milestone className="w-3.5 h-3.5" />
                <span>🛣️ ආසන්න මාර්ග (Chips)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('nudge')}
                className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'nudge'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>🗺️ Pin Micro-Nudge</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>✍️ අතින් ලිවීම (Custom)</span>
              </button>

            </div>
          </div>

          {/* TAB 1: INSTANT SEARCH (RECOMMENDED ALTERNATIVE) */}
          {activeTab === 'search' && (
            <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                    🔍 පාර, පන්සල හෝ ඕනෑම ස්ථානයක නම සොයන්න (Search Road / Landmark)
                  </h4>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    උදාහරණයක් ලෙස "Gangarama" හෝ "ගංගාරාම", "අමරකෝන්", "සුනන්දාරාම", "කලහපිටිය" යනාදිය ටයිප් කරන්න:
                  </p>
                </div>
              </div>

              {/* Search Bar Input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="මාර්ගය හෝ ස්ථානය සොයන්න (උදා: ගංගාරාම පාර, අමරකෝන් මාවත, අවිරිවත්ත පාර)..."
                  className="w-full pl-10 pr-24 py-3 text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 border-2 border-emerald-500/60 focus:border-emerald-500 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-inner"
                  autoFocus
                />
                <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3.5 top-3.5 pointer-events-none" />
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  </div>
                )}
              </div>

              {/* Fast 1-Click Search Quick Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300">⚡ කෙටිමං:</span>
                {['ගංගාරාම පාර', 'ශ්‍රී ගංගාරාම මාවත', 'අමරකෝන් මාවත', 'සුනන්දාරාම මාවත', 'කලහපිටිය පාර', 'දෙවොල පාර', 'අවිරිවත්ත පාර', 'ගුවන්තොටුපල පාර'].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchQuery(chip);
                      searchSriLankanPlacesAndRoads(chip).then(setSearchResults);
                    }}
                    className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Search Results List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {searchResults.map((res) => {
                  const isSelected = customRoadSi === res.roadSi && customVillageSi === res.villageSi;
                  return (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => handleSelectPlace(res)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-[1.01]'
                          : 'bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-500/10 text-emerald-600'
                        }`}>
                          <Milestone className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                            <span>{res.titleSi}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {res.category}
                            </span>
                          </div>
                          <div className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            📍 {res.shortDisplaySi} • <span className="font-mono">{res.lat.toFixed(4)}, {res.lng.toFixed(4)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {isSelected ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-100">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>තෝරාගෙන ඇත</span>
                          </div>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ROAD SUGGESTION CHIPS */}
          {activeTab === 'roads' && (
            <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <Milestone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-950 dark:text-amber-200">
                    🛣️ කෝවින්න සහ කටුනායක ප්‍රදේශයේ ප්‍රධාන මාර්ග (Local Road Chips)
                  </h4>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    ඔබගේ මාර්ගය පහතින් තෝරන්න (එක ක්ලික් එකෙන් සජීවීව වෙනස් වේ):
                  </p>
                </div>
              </div>

              {/* Group 1: Kovinna Roads */}
              <div>
                <span className="text-[11px] font-black text-amber-900 dark:text-amber-300 block mb-1.5">
                  📍 කෝවින්න ප්‍රධාන මාර්ග & ස්ථාන:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { si: 'ගංගාරාම පාර', en: 'Gangarama Road', lat: 7.1712, lng: 79.8978 },
                    { si: 'ශ්‍රී ගංගාරාම මාවත', en: 'Sri Gangarama Mawatha', lat: 7.1715, lng: 79.8975 },
                    { si: 'අමරකෝන් මාවත', en: 'Amarakoon Mawatha', lat: 7.1698, lng: 79.8990 },
                    { si: 'ශ්‍රී සුනන්දාරාම මාවත', en: 'Sri Sunandarama Mawatha', lat: 7.1724, lng: 79.8962 },
                    { si: 'කෝවින්න - කලහපිටිය පාර', en: 'Kovinna - Kalahapitiya Road', lat: 7.1718, lng: 79.9005 },
                    { si: 'කලහපිටිය පාර', en: 'Kalahapitiya Road', lat: 7.1730, lng: 79.9030 },
                    { si: 'දෙවොල පාර', en: 'Dewala Road', lat: 7.1685, lng: 79.8972 },
                    { si: 'කෝවින්න පන්සල පාර', en: 'Kovinna Temple Road', lat: 7.1722, lng: 79.8960 },
                    { si: 'ජයවර්ධන මාවත', en: 'Jayawardena Mawatha', lat: 7.1670, lng: 79.8940 },
                  ].map((r, idx) => {
                    const isSelected = customRoadSi === r.si;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCustomRoadSi(r.si);
                          setPinLat(r.lat);
                          setPinLng(r.lng);
                          if (resolvedGeo) {
                            setResolvedGeo(updateLocationWithRoad(resolvedGeo, r.si, r.en));
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-700 shadow-md scale-105 ring-2 ring-amber-400'
                            : 'bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        <span>{r.si}</span>
                        <span className="text-[9px] opacity-70">({r.en})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: Katunayake & Surrounding */}
              <div className="pt-1">
                <span className="text-[11px] font-black text-amber-900 dark:text-amber-300 block mb-1.5">
                  ✈️ කටුනායක නගරය සහ අවට මාර්ග:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { si: 'අවිරිවත්ත පාර', en: 'Awariwatta Road', lat: 7.1650, lng: 79.8850 },
                    { si: 'ගුවන්තොටුපල පාර', en: 'Airport Road', lat: 7.1700, lng: 79.8900 },
                    { si: 'දුම්රියපොළ පාර', en: 'Station Road', lat: 7.1620, lng: 79.8820 },
                    { si: 'කොළඹ - මීගමුව ප්‍රධාන පාර', en: 'Colombo - Negombo Main Road', lat: 7.1610, lng: 79.8780 },
                    { si: 'අමන්දොළුව පාර', en: 'Amandoluwa Road', lat: 7.1610, lng: 79.8930 },
                    { si: 'මිනුවන්ගොඩ පාර', en: 'Minuwangoda Road', lat: 7.1550, lng: 79.9150 },
                    { si: 'රද්දොළුගම පාර', en: 'Raddolugama Road', lat: 7.1350, lng: 79.8860 },
                  ].map((r, idx) => {
                    const isSelected = customRoadSi === r.si;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCustomRoadSi(r.si);
                          setPinLat(r.lat);
                          setPinLng(r.lng);
                          if (resolvedGeo) {
                            setResolvedGeo(updateLocationWithRoad(resolvedGeo, r.si, r.en));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-700 shadow-md scale-105'
                            : 'bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                        <span>{r.si}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MICRO-NUDGE (FINE TUNING PIN POSITION) */}
          {activeTab === 'nudge' && (
            <div className="bg-blue-500/10 border-2 border-blue-500/40 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-blue-950 dark:text-blue-200">
                      🗺️ සිතියමේ Pin එක සකසන්න (Directional Pin Nudge)
                    </h4>
                    <p className="text-[11px] text-blue-800 dark:text-blue-300">
                      මීටර් 25ක නිරවද්‍යතාවයෙන් Pin එක ඕනෑම දිශාවකට වෙනස් කරන්න:
                    </p>
                  </div>
                </div>
              </div>

              {/* 4-Way Directional Pad */}
              <div className="flex flex-col items-center justify-center gap-2 py-2">
                <button
                  type="button"
                  onClick={() => handleNudge(0.0003, 0)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>▲ උතුරට (North +25m)</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleNudge(0, -0.0003)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>◄ බටහිරට (West)</span>
                  </button>

                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border-2 border-blue-500/60 flex items-center justify-center font-bold text-blue-800 dark:text-blue-200 text-xs shadow-inner">
                    <MapPin className="w-5 h-5 text-blue-600 animate-bounce" />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleNudge(0, 0.0003)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                  >
                    <span>► නැගෙනහිරට (East)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleNudge(-0.0003, 0)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>▼ දකුණට (South -25m)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: MANUAL 3-FIELD ENTRY */}
          {activeTab === 'manual' && (
            <div className="bg-purple-500/10 border-2 border-purple-500/40 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-purple-950 dark:text-purple-200">
                    ✍️ අතින් ලිවීම (Manual 3-Part Custom Address Entry)
                  </h4>
                  <p className="text-[11px] text-purple-800 dark:text-purple-300">
                    ගම, මාර්ගය සහ නගරය ඔබට අවශ්‍ය ඕනෑම නමකින් සෘජුවම ඇතුළත් කරන්න:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase block mb-1">
                    1. ගමේ නම (Village)
                  </label>
                  <input
                    type="text"
                    value={customVillageSi}
                    onChange={(e) => setCustomVillageSi(e.target.value)}
                    placeholder="උදා: කෝවින්න"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border-2 border-purple-400 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase block mb-1">
                    2. මාර්ගයේ නම (Road)
                  </label>
                  <input
                    type="text"
                    value={customRoadSi}
                    onChange={(e) => setCustomRoadSi(e.target.value)}
                    placeholder="උදා: ගංගාරාම පාර"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase block mb-1">
                    3. නගරය (Town / City)
                  </label>
                  <input
                    type="text"
                    value={customTownSi}
                    onChange={(e) => setCustomTownSi(e.target.value)}
                    placeholder="උදා: කටුනායක"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border-2 border-blue-400 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* INTERACTIVE LIVE MAP CONTAINER */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-800 shadow-md bg-slate-900 min-h-[250px] h-[270px] flex flex-col">
            
            {/* Live Map Iframe */}
            <iframe
              title="Live GPS Location Map"
              src={mapEmbedUrl}
              className="w-full h-full border-0"
              loading="lazy"
            />

            {/* Radar Pulse & Pin Target Marker */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-400/40 animate-ping"></div>
                <div className="absolute w-14 h-14 rounded-full bg-emerald-500/30 border border-emerald-400/60 animate-pulse"></div>
                
                {/* Pin Tooltip */}
                <div className="absolute -top-12 bg-slate-950/95 text-white border border-emerald-500/60 text-[10px] font-black px-3 py-1 rounded-xl shadow-2xl whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md">
                  <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                  <span>{customRoadSi || resolvedGeo?.roadSi || 'ගංගාරාම පාර'}</span>
                </div>

                {/* Center Pin Marker */}
                <div className="w-7 h-7 rounded-full bg-white border-2 border-emerald-600 shadow-2xl flex items-center justify-center z-10">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-inner"></div>
                </div>
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
              <button
                onClick={() => setZoom((z) => Math.min(z + 1, 19))}
                className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer backdrop-blur-md"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                onClick={() => setZoom((z) => Math.max(z - 1, 6))}
                className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer backdrop-blur-md"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={startLiveGpsTracking}
                className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer"
                title="Center on My GPS Location"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </div>

            {/* External Google Maps Button */}
            <div className="absolute bottom-3 left-3 z-20">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-950/90 hover:bg-white text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 text-xs font-bold shadow-lg flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>Google Maps App</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>

            {/* Live GPS Telemetry */}
            <div className="absolute bottom-3 right-3 z-20 hidden sm:flex items-center gap-2 bg-slate-950/90 border border-slate-800 text-[10px] text-slate-300 px-3 py-1.5 rounded-xl backdrop-blur-md font-mono">
              <Compass className="w-3 h-3 text-emerald-400" />
              <span>Acc: ±{gps.accuracy ?? 10}m</span>
              <span>•</span>
              <span>Speed: {gps.speed ?? 0} km/h</span>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-100 dark:bg-[#07130c] border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Info className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>තෝරාගත් ස්ථානය සියලුම සේවා සහ සහය සෙවුම් සඳහා සුරැකේ.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              වසන්න (Close)
            </button>

            <button
              onClick={handleOneClickSave}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-[#007a4b] to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-900/30 flex items-center gap-2 active:scale-95 transition-all cursor-pointer border border-emerald-400/40"
            >
              <Check className="w-4 h-4" />
              <span>⚡ මෙම ස්ථානය සුරකින්න (Save Location)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
