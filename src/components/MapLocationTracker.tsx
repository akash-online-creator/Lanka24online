import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
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
  Milestone, 
  Building2, 
  Home, 
  Edit3, 
  Search, 
  Layers, 
  Map as MapIcon, 
  ChevronRight, 
  CheckCircle2, 
  Sliders, 
  MapPinCheck,
  Bookmark,
  History,
  Trash2,
  PowerOff,
  LocateFixed,
  Move,
  Eye,
  Hand
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
  currentLocation?: LocationOption;
  initialLocation?: LocationOption;
  initialLat?: number;
  initialLng?: number;
  availableLocations?: LocationOption[];
  onSaveLocation?: (loc: LocationOption) => void;
  onSelectLocation?: (loc: LocationOption) => void;
  onLocationSelected?: (lat: number, lng: number, locName?: string) => void;
  lang?: Language;
  language?: Language;
  theme?: Theme;
  initialMode?: 'manual_search' | 'auto_gps';
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

type ModeTab = 'map_pan' | 'search' | 'manual' | 'roads' | 'saved' | 'gps';
type MapLayerType = 'osm' | 'hot' | 'satellite';

export const MapLocationTracker: React.FC<MapLocationTrackerProps> = ({
  isOpen,
  onClose,
  currentLocation,
  initialLocation,
  initialLat,
  initialLng,
  availableLocations = [],
  onSaveLocation,
  onSelectLocation,
  onLocationSelected,
  lang,
  language,
  theme = 'light',
  initialMode = 'manual_search',
}) => {
  const activeLang = lang || language || 'si';
  const effectiveLocation = currentLocation || initialLocation;
  const initialCenterLat = initialLat || effectiveLocation?.lat || 7.1712;
  const initialCenterLng = initialLng || effectiveLocation?.lng || 79.8978;

  // Pin Coordinates (Exact center of map)
  const [pinLat, setPinLat] = useState<number>(initialCenterLat);
  const [pinLng, setPinLng] = useState<number>(initialCenterLng);
  
  // Real-time live coordinates while actively dragging
  const [livePinLat, setLivePinLat] = useState<number>(initialCenterLat);
  const [livePinLng, setLivePinLng] = useState<number>(initialCenterLng);
  const [isDraggingMap, setIsDraggingMap] = useState<boolean>(false);

  // Active Alternative Mode Tab (Defaults to map_pan for direct drag-nudge experience)
  const [activeTab, setActiveTab] = useState<ModeTab>('map_pan');

  // Map Layer Selection
  const [mapLayer, setMapLayer] = useState<MapLayerType>('osm');

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>(SRI_LANKA_CURATED_PLACES.slice(0, 10));
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Manual 3-field custom inputs (Village, Road, Town)
  const [customVillageSi, setCustomVillageSi] = useState<string>('කෝවින්න');
  const [customRoadSi, setCustomRoadSi] = useState<string>('ගංගාරාම පාර');
  const [customTownSi, setCustomTownSi] = useState<string>('කටුනායක');

  // GPS Telemetry & Control (Explicitly auto-stopped when in manual mode)
  const [isAutoGpsStopped, setIsAutoGpsStopped] = useState<boolean>(true);
  const [gps, setGps] = useState<GPSStatus>({
    tracking: false,
    locked: false,
    error: null,
    lat: initialCenterLat,
    lng: initialCenterLng,
    accuracy: null,
    altitude: null,
    speed: null,
    heading: null,
    timestamp: null,
  });

  // Saved / Favorite locations in localStorage
  const [savedLocationsList, setSavedLocationsList] = useState<LocationOption[]>(() => {
    const saved = localStorage.getItem('sahaya_saved_locations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { /* ignore */ }
    }
    return [
      {
        id: 'saved_1',
        nameSi: 'කෝවින්න, ගංගාරාම පාර, කටුනායක',
        nameEn: 'Kovinna, Gangarama Road, Katunayake',
        nameTa: 'Kovinna, Gangarama Road, Katunayake',
        lat: 7.1712,
        lng: 79.8978,
      },
      {
        id: 'saved_2',
        nameSi: 'කටුනායක, අවිරිවත්ත පාර, කටුනායක',
        nameEn: 'Katunayake, Awariwatta Road, Katunayake',
        nameTa: 'Katunayake, Awariwatta Road, Katunayake',
        lat: 7.1650,
        lng: 79.8850,
      },
      {
        id: 'saved_3',
        nameSi: 'කොල්ලුපිටිය, ගාලු පාර, කොළඹ',
        nameEn: 'Kollupitiya, Galle Road, Colombo',
        nameTa: 'Kollupitiya, Galle Road, Colombo',
        lat: 6.9000,
        lng: 79.8550,
      }
    ];
  });

  // Map Controls & Geocoding State
  const [zoom, setZoom] = useState<number>(17);
  const [isCopied, setIsCopied] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [resolvedGeo, setResolvedGeo] = useState<GeoResolvedLocation | null>(null);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Leaflet references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const bestAccuracyRef = useRef<number>(99999);
  const searchDebounceRef = useRef<any>(null);

  // Address resolution for coordinates
  const lookupAddress = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const geo = await resolveExactLocation(lat, lng);
      setResolvedGeo(geo);
      if (geo.villageSi) setCustomVillageSi(geo.villageSi);
      if (geo.roadSi) setCustomRoadSi(geo.roadSi);
      if (geo.townSi) setCustomTownSi(geo.townSi);
    } catch (err) {
      console.error('Failed to resolve address:', err);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // STOP Auto GPS Tracking immediately
  const stopLiveGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsAutoGpsStopped(true);
    setGps((prev) => ({ ...prev, tracking: false }));
    setStatusNotification('🛑 Auto GPS සෙවුම නතර කර ඇත. Manual සිතියම් සෙවුම සක්‍රීයයි.');
    setTimeout(() => setStatusNotification(null), 3500);
  }, []);

  // Pan Leaflet map to given lat/lng smoothly
  const panMapTo = useCallback((lat: number, lng: number, targetZoom?: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], targetZoom ?? mapInstanceRef.current.getZoom(), {
        animate: true,
      });
    }
    setPinLat(lat);
    setPinLng(lng);
    setLivePinLat(lat);
    setLivePinLng(lng);
  }, []);

  // Initialize and manage Interactive Draggable Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Destroy any existing map instance on re-init
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const startLat = pinLat || effectiveLocation?.lat || 7.1712;
    const startLng = pinLng || effectiveLocation?.lng || 79.8978;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Tile URLs based on selected mapLayer
    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let subdomains = ['a', 'b', 'c'];

    if (mapLayer === 'hot') {
      tileUrl = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
    } else if (mapLayer === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      subdomains = [];
    }

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Real-time Map Dragging & Pan Handlers
    map.on('movestart', () => {
      stopLiveGpsTracking();
      setIsDraggingMap(true);
    });

    map.on('move', () => {
      const center = map.getCenter();
      setLivePinLat(center.lat);
      setLivePinLng(center.lng);
    });

    map.on('moveend', () => {
      setIsDraggingMap(false);
      const center = map.getCenter();
      const newLat = Number(center.lat.toFixed(6));
      const newLng = Number(center.lng.toFixed(6));
      setPinLat(newLat);
      setPinLng(newLng);
      setLivePinLat(newLat);
      setLivePinLng(newLng);
      lookupAddress(newLat, newLng);
    });

    map.on('zoomend', () => {
      setZoom(map.getZoom());
    });

    // Click anywhere on map to pan and place pin instantly
    map.on('click', (e: L.LeafletMouseEvent) => {
      stopLiveGpsTracking();
      map.panTo(e.latlng, { animate: true });
    });

    mapInstanceRef.current = map;

    // Invalidate size once rendered inside modal
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, mapLayer, stopLiveGpsTracking, lookupAddress]);

  // Start Live GPS Tracking (Explicit user request only)
  const startLiveGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGps((prev) => ({
        ...prev,
        tracking: false,
        error: 'ඔබගේ උපාංගයේ GPS Geolocation සහාය නොදක්වයි (Device does not support GPS)',
      }));
      return;
    }

    setIsAutoGpsStopped(false);
    setGps((prev) => ({ ...prev, tracking: true, error: null }));
    setIsGeocoding(true);
    bestAccuracyRef.current = 99999;
    setStatusNotification('⚡ සජීවී GPS Auto සෙවුම සක්‍රීය කරන ලදී...');

    const onPositionUpdate = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, altitude, speed, heading } = pos.coords;
      const roundedAcc = Math.round(accuracy);
      
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

      if (roundedAcc <= bestAccuracyRef.current || bestAccuracyRef.current === 99999) {
        bestAccuracyRef.current = roundedAcc;
        panMapTo(latitude, longitude);
        lookupAddress(latitude, longitude);
      }
    };

    const onError = (err: GeolocationPositionError) => {
      let errMsg = 'GPS ස්ථානය ලබාගත නොහැකි විය.';
      if (err.code === err.PERMISSION_DENIED) {
        errMsg = 'GPS අවසරය ලබාදී නැත (Location permission denied).';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        errMsg = 'චන්ද්‍රිකා සංඥා දුර්වලයි (GPS position unavailable).';
      } else if (err.code === err.TIMEOUT) {
        errMsg = 'GPS සම්බන්ධතාවය ප්‍රමාදයි (Timeout).';
      }

      setGps((prev) => ({
        ...prev,
        tracking: false,
        error: errMsg,
      }));
      setIsGeocoding(false);
    };

    navigator.geolocation.getCurrentPosition(onPositionUpdate, onError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(onPositionUpdate, onError, {
      enableHighAccuracy: true,
      timeout: 25000,
      maximumAge: 500,
    });
  }, [lookupAddress, panMapTo]);

  // When modal opens: Stop auto GPS tracking immediately and set to manual mode
  useEffect(() => {
    if (isOpen) {
      stopLiveGpsTracking();
      // Initialize with current location coordinates
      if (effectiveLocation?.lat && effectiveLocation?.lng) {
        setPinLat(effectiveLocation.lat);
        setPinLng(effectiveLocation.lng);
        setLivePinLat(effectiveLocation.lat);
        setLivePinLng(effectiveLocation.lng);
        lookupAddress(effectiveLocation.lat, effectiveLocation.lng);
      }
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
  }, [isOpen, stopLiveGpsTracking, lookupAddress, effectiveLocation?.lat, effectiveLocation?.lng]);

  // Search input handler with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!isAutoGpsStopped) {
      stopLiveGpsTracking();
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchSriLankanPlacesAndRoads(query);
        setSearchResults(results || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);
  };

  // Select place from manual search results
  const handleSelectPlace = (place: PlaceSearchResult, autoSave = false) => {
    stopLiveGpsTracking();
    panMapTo(place.lat, place.lng, 17);
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

    if (autoSave) {
      saveLocationDirectly(
        place.shortDisplaySi,
        place.shortDisplayEn,
        place.shortDisplayEn,
        place.lat,
        place.lng
      );
    } else {
      setStatusNotification(`📍 "${place.titleSi}" තෝරාගන්නා ලදී. සිතියම එහා මෙහා කර (Drag) වඩාත් නිවැරදි කරගත හැක.`);
    }
  };

  // Copy GPS Coordinates
  const handleCopyCoords = () => {
    const text = `${pinLat.toFixed(6)}, ${pinLng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Direct Helper to save location object and persist to localStorage
  const saveLocationDirectly = (
    nameSi: string,
    nameEn: string,
    nameTa: string,
    lat: number,
    lng: number,
    isAutoGps: boolean = false
  ) => {
    const finalLoc: LocationOption = {
      id: isAutoGps ? `loc_gps_${Date.now()}` : `loc_manual_${Date.now()}`,
      nameSi,
      nameEn,
      nameTa,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    };

    // Save to localStorage
    localStorage.setItem('sahaya_current_location', JSON.stringify(finalLoc));
    localStorage.setItem('sahaya_manual_location_locked', isAutoGps ? 'false' : 'true');
    localStorage.setItem('sahaya_location_mode', isAutoGps ? 'auto' : 'manual');
    window.dispatchEvent(
      new CustomEvent('sahaya_location_mode_changed', { 
        detail: { mode: isAutoGps ? 'auto' : 'manual' } 
      })
    );

    // Add to saved locations history
    setSavedLocationsList((prev) => {
      const filtered = (prev || []).filter((item) => item.nameSi !== finalLoc.nameSi);
      const updated = [finalLoc, ...filtered].slice(0, 10);
      localStorage.setItem('sahaya_saved_locations', JSON.stringify(updated));
      return updated;
    });

    if (typeof onSaveLocation === 'function') {
      onSaveLocation(finalLoc);
    }
    if (typeof onSelectLocation === 'function') {
      onSelectLocation(finalLoc);
    }
    if (typeof onLocationSelected === 'function') {
      onLocationSelected(finalLoc.lat, finalLoc.lng, finalLoc.nameSi);
    }
    onClose();
  };

  // 1-Click Instant Save Location in exact [Village, Road, Town] order
  const handleSaveLocation = () => {
    const isGpsMode = activeTab === 'gps' || (!isAutoGpsStopped && gps.locked);
    
    const formattedRoad = customRoadSi
      ? customRoadSi.includes('පාර') || customRoadSi.includes('මාවත') || customRoadSi.includes('වීදිය')
        ? customRoadSi
        : `${customRoadSi} පාර`
      : resolvedGeo?.roadSi || 'ගංගාරාම පාර';

    const finalVillage = customVillageSi || resolvedGeo?.villageSi || 'කෝවින්න';
    const finalTown = customTownSi || resolvedGeo?.townSi || 'කටුනායක';

    const shortSi = formatOrderedLocation(finalVillage, formattedRoad, finalTown);
    const shortEn = formatOrderedLocation(
      resolvedGeo?.villageEn || 'Kovinna',
      resolvedGeo?.roadEn || 'Gangarama Road',
      resolvedGeo?.townEn || 'Katunayake'
    );

    saveLocationDirectly(shortSi, shortEn, shortEn, pinLat, pinLng, isGpsMode);
  };

  // Explicit 1-Click Apply Live Auto GPS from GPS Tab
  const handleApplyLiveGps = async () => {
    const targetLat = gps.lat || pinLat;
    const targetLng = gps.lng || pinLng;

    setIsGeocoding(true);
    try {
      const geo = await resolveExactLocation(targetLat, targetLng);
      saveLocationDirectly(
        geo.shortDisplaySi,
        geo.shortDisplayEn,
        geo.shortDisplayEn,
        targetLat,
        targetLng,
        true
      );
    } catch {
      const formattedRoad = customRoadSi || 'ගංගාරාම පාර';
      const finalVillage = customVillageSi || 'කෝවින්න';
      const finalTown = customTownSi || 'කටුනායක';
      const shortSi = formatOrderedLocation(finalVillage, formattedRoad, finalTown);
      saveLocationDirectly(shortSi, shortSi, shortSi, targetLat, targetLng, true);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Delete saved location from history
  const handleDeleteSavedLocation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedLocationsList((prev) => {
      const updated = (prev || []).filter((item) => item.id !== id);
      localStorage.setItem('sahaya_saved_locations', JSON.stringify(updated));
      return updated;
    });
  };

  if (!isOpen) return null;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${pinLat},${pinLng}`;

  return (
    <div 
      id="map-location-tracker-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="bg-white dark:bg-[#0b1b11] border-2 border-emerald-600/40 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Bar with Manual Search Status */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#004d2f] via-[#006e43] to-[#004d2f] text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shadow-inner">
              <Move className="w-5 h-5 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-wide">
                  සිතියම මත ස්ථානය තෝරාගැනීම (Drag & Pan Location Map)
                </h3>
                <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <PowerOff className="w-3 h-3" />
                  <span>Auto GPS Off (Manual Map Mode)</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-100/90 font-medium">
                සිතියම එහා මෙහා කර (Drag & Pan) නිවැරදි ස්ථානයට Pin එක තබන්න
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

        {/* Status Notification Toast */}
        {statusNotification && (
          <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              {statusNotification}
            </span>
            <button onClick={() => setStatusNotification(null)} className="text-xs opacity-75 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Modal Body Container with Scroll */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">

          {/* ACTIVE SELECTED LOCATION BANNER (1. Village, 2. Road, 3. Town) */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-amber-500/10 border-2 border-emerald-500/50 rounded-2xl p-3.5 sm:p-4 shadow-md space-y-3">
            
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                  <MapPinCheck className="w-3.5 h-3.5" />
                  <span>තෝරාගත් ස්ථානය (Selected Location)</span>
                </span>
                {isGeocoding && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>ලිපිනය හඳුනාගනිමින්...</span>
                  </span>
                )}
                {isDraggingMap && (
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 animate-pulse">
                    <Hand className="w-3 h-3" />
                    <span>සිතියම ගෙනියමින් (Dragging)...</span>
                  </span>
                )}
              </div>

              {/* Coordinates & Copy */}
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-mono font-bold bg-slate-900/10 dark:bg-slate-900/60 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                  📍 {livePinLat.toFixed(5)}, {livePinLng.toFixed(5)}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="text-[10px] px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-all cursor-pointer"
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
                  <Home className="w-3 h-3" />
                  <span>1. ගම / ප්‍රදේශය (Village)</span>
                </div>
                <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 break-words">
                  {customVillageSi || resolvedGeo?.villageSi || 'කෝවින්න'}
                </div>
              </div>

              {/* 2. ROAD */}
              <div className="bg-white/90 dark:bg-slate-900/90 border-2 border-amber-500/50 rounded-xl p-2.5 sm:p-3 shadow-sm">
                <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase">
                  <Milestone className="w-3 h-3" />
                  <span>2. මාර්ගය (Road Name)</span>
                </div>
                <div className="text-sm sm:text-base font-black text-amber-900 dark:text-amber-300 mt-0.5 break-words">
                  {customRoadSi || resolvedGeo?.roadSi || 'ගංගාරාම පාර'}
                </div>
              </div>

              {/* 3. TOWN */}
              <div className="bg-white/90 dark:bg-slate-900/90 border-2 border-blue-500/40 rounded-xl p-2.5 sm:p-3 shadow-sm">
                <div className="flex items-center gap-1 text-[10px] text-blue-700 dark:text-blue-400 font-bold uppercase">
                  <Building2 className="w-3 h-3" />
                  <span>3. නගරය (Town / City)</span>
                </div>
                <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 break-words">
                  {customTownSi || resolvedGeo?.townSi || 'කටුනායක'}
                </div>
              </div>

            </div>

            {/* Quick 1-Click Save Location Button inside Banner */}
            <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                💡 සිතියම Drag කර ඕනෑම තැනක නවත්වන්න — ලිපිනය සජීවීව වෙනස් වේ.
              </span>
              <button
                type="button"
                onClick={handleSaveLocation}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border border-emerald-400/40"
              >
                <Check className="w-4 h-4" />
                <span>⚡ මෙම ස්ථානය සුරකින්න (Save This Location)</span>
              </button>
            </div>

          </div>

          {/* MAIN INTERACTIVE DRAGGABLE MAP (FULL SCREEN DRAG & PAN) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                <Move className="w-4 h-4 text-emerald-600" />
                <span>සජීවී අන්තර්ක්‍රියාකාරී සිතියම (Interactive Map — Drag to Move Pin)</span>
              </div>

              {/* Map Layer Switcher & Help */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase hidden sm:inline">Layer:</span>
                <button
                  type="button"
                  onClick={() => setMapLayer('osm')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    mapLayer === 'osm'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer('hot')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    mapLayer === 'hot'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  Roads/Detailed
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer('satellite')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    mapLayer === 'satellite'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  Satellite
                </button>
              </div>
            </div>

            {/* Interactive Map Surface Container */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-xl bg-slate-900 h-[300px] sm:h-[350px] flex flex-col group cursor-grab active:cursor-grabbing select-none">
              
              {/* Leaflet DOM Mounting Container */}
              <div 
                ref={mapContainerRef} 
                className="w-full h-full z-0" 
              />

              {/* OVERLAID STATIONARY CENTER PIN & CROSSHAIR RETICLE (UBER / GOOGLE MAPS STYLE) */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                <div className="relative flex flex-col items-center justify-center">
                  
                  {/* Floating Live Tooltip Above Center Pin */}
                  <div className={`absolute -top-14 transition-all duration-200 transform ${
                    isDraggingMap ? 'scale-105 -translate-y-2' : 'scale-100 translate-y-0'
                  }`}>
                    <div className="bg-slate-950/90 text-white border-2 border-emerald-400 text-[11px] font-black px-3.5 py-1.5 rounded-2xl shadow-2xl whitespace-nowrap flex items-center gap-2 backdrop-blur-md">
                      {isDraggingMap ? (
                        <>
                          <Hand className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                          <span className="text-amber-300">ස්ථානය සකසමින්... (Drag & Pan)</span>
                        </>
                      ) : (
                        <>
                          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                          <span>{customRoadSi || resolvedGeo?.roadSi || 'ගංගාරාම පාර'}</span>
                        </>
                      )}
                      <span className="text-[10px] text-emerald-300/80 font-mono">
                        ({livePinLat.toFixed(4)}, {livePinLng.toFixed(4)})
                      </span>
                    </div>
                  </div>

                  {/* High Precision Pin Icon (Lifts slightly while dragging) */}
                  <div className={`transition-transform duration-200 ease-out transform ${
                    isDraggingMap ? '-translate-y-4 scale-110' : 'translate-y-0 scale-100'
                  }`}>
                    <div className="relative">
                      {/* Outer Pin Body */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 border-2 border-white shadow-2xl flex items-center justify-center text-white">
                        <MapPin className="w-6 h-6 fill-white stroke-emerald-950" />
                      </div>
                      {/* Pin Needle Tip */}
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-emerald-600 mx-auto -mt-0.5"></div>
                    </div>
                  </div>

                  {/* Ground Target Crosshair Point & Precision Reticle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-3 flex items-center justify-center">
                    {/* Pulsing ground ring */}
                    <div className={`w-8 h-8 rounded-full border-2 border-emerald-400/80 transition-all ${
                      isDraggingMap ? 'scale-125 bg-amber-400/20 border-amber-400' : 'scale-100 bg-emerald-500/20 animate-ping'
                    }`}></div>
                    
                    {/* Reticle Target Crosshair Lines */}
                    <div className="absolute w-6 h-[1.5px] bg-emerald-500"></div>
                    <div className="absolute h-6 w-[1.5px] bg-emerald-500"></div>
                    
                    {/* Exact Sub-meter Ground Center Dot */}
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-emerald-600 border border-white shadow-md"></div>
                  </div>

                </div>
              </div>

              {/* Instruction pill bottom center overlay */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="bg-slate-950/80 text-white text-[10px] sm:text-xs font-bold px-3.5 py-1 rounded-full border border-slate-700/80 shadow-lg backdrop-blur-sm flex items-center gap-1.5">
                  <Hand className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>සිතියම එහා මෙහා කර (Drag & Pan) හරියටම තැන සකසන්න</span>
                </div>
              </div>

              {/* Map Floating Control Buttons (Zoom / Center / Layers) */}
              <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
                <button
                  type="button"
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.zoomIn();
                    }
                  }}
                  className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer backdrop-blur-md"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.zoomOut();
                    }
                  }}
                  className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer backdrop-blur-md"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('gps');
                    startLiveGpsTracking();
                  }}
                  className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer"
                  title="සජීවී GPS ස්ථානයට Map එක Center කරන්න"
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
                  <span>Google Maps</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>

              {/* Telemetry coordinate display */}
              <div className="absolute bottom-3 right-3 z-20 hidden sm:flex items-center gap-2 bg-slate-950/90 border border-slate-800 text-[10px] text-slate-300 px-3 py-1.5 rounded-xl backdrop-blur-md font-mono">
                <Compass className="w-3 h-3 text-emerald-400" />
                <span>{isAutoGpsStopped ? '🛑 Manual Mode' : `Acc: ±${gps.accuracy ?? 10}m`}</span>
                <span>•</span>
                <span>📍 {pinLat.toFixed(4)}, {pinLng.toFixed(4)}</span>
              </div>

            </div>
          </div>

          {/* MODE TABS BAR (EXPLORE & FINE TUNE) */}
          <div className="bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-center">
              
              <button
                type="button"
                onClick={() => {
                  stopLiveGpsTracking();
                  setActiveTab('map_pan');
                }}
                className={`py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'map_pan'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>🗺️ සිතියම (Drag Map)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopLiveGpsTracking();
                  setActiveTab('search');
                }}
                className={`py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'search'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>🔍 සෙවුම (Search)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopLiveGpsTracking();
                  setActiveTab('manual');
                }}
                className={`py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>✍️ අතින් ලිවීම</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopLiveGpsTracking();
                  setActiveTab('roads');
                }}
                className={`py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'roads'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Milestone className="w-3.5 h-3.5" />
                <span>🛣️ මාර්ග (Roads)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopLiveGpsTracking();
                  setActiveTab('saved');
                }}
                className={`py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'saved'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>⭐ සුරකින ලද ({savedLocationsList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('gps');
                  startLiveGpsTracking();
                }}
                className={`py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'gps'
                    ? 'bg-red-600 text-white shadow-md animate-pulse'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>⚡ Auto GPS</span>
              </button>

            </div>
          </div>

          {/* TAB 1: MAP DRAG INSTRUCTIONS & FAST ACTION */}
          {activeTab === 'map_pan' && (
            <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Move className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                      🗺️ සිතියම නිදහසේ එහා මෙහා කර ස්ථානය සකසන්න (Drag Map to Nudge Pin)
                    </h4>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      ඕනෑම දිශාවකට සිතියම අදින්න. නැවතුණු තැන ලිපිනය ස්වයංක්‍රීයව හඳුනාගනී.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
                  🎯 Sub-meter Precision
                </div>
              </div>

              {/* Quick Jump Shortcuts for Areas */}
              <div className="pt-1">
                <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 block mb-1">
                  ⚡ ප්‍රධාන ප්‍රදේශ වලට සිතියම ගෙන යන්න (Quick Jump):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'කෝවින්න (ගංගාරාම පාර)', lat: 7.1712, lng: 79.8978 },
                    { name: 'කටුනායක හන්දිය', lat: 7.1650, lng: 79.8850 },
                    { name: 'අවිරිවත්ත', lat: 7.1680, lng: 79.8880 },
                    { name: 'කලහපිටිය', lat: 7.1730, lng: 79.9030 },
                    { name: 'මීගමුව නගරය', lat: 7.2088, lng: 79.8358 },
                    { name: 'කොළඹ කොටුව', lat: 6.9355, lng: 79.8487 },
                    { name: 'කොල්ලුපිටිය', lat: 6.9000, lng: 79.8550 },
                    { name: 'මහනුවර', lat: 7.2906, lng: 80.6337 },
                    { name: 'ගම්පහ', lat: 7.0840, lng: 79.9940 },
                  ].map((loc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        stopLiveGpsTracking();
                        panMapTo(loc.lat, loc.lng, 17);
                        lookupAddress(loc.lat, loc.lng);
                      }}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>{loc.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL SEARCH */}
          {activeTab === 'search' && (
            <div className="bg-teal-500/10 border-2 border-teal-500/40 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-teal-950 dark:text-teal-200">
                      🔍 ස්ථානයක්, නගරයක්, පාරක් හෝ හන්දියක් සොයන්න (Search Place & Road)
                    </h4>
                    <p className="text-[11px] text-teal-800 dark:text-teal-300">
                      ඕනෑම නමක් ටයිප් කර සිතියමේ එම ස්ථානයට ගමන් කරන්න:
                    </p>
                  </div>
                </div>
              </div>

              {/* Search Bar Input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="ස්ථානය හෝ පාර සොයන්න (උදා: ගංගාරාම පාර, කෝවින්න, කටුනායක, මීගමුව, කොළඹ, නුවර)..."
                  className="w-full pl-10 pr-24 py-3 text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 border-2 border-teal-500/60 focus:border-teal-500 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 shadow-inner"
                  autoFocus
                />
                <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 absolute left-3.5 top-3.5 pointer-events-none" />
                {isSearching ? (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  </div>
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults(SRI_LANKA_CURATED_PLACES.slice(0, 10));
                    }}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    මකන්න ✕
                  </button>
                ) : null}
              </div>

              {/* Search Results List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {searchResults.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                    සොයන ස්ථානය හමුනොවී නම් "✍️ අතින් ලිවීම" ටැබ් එකෙන් ගම, පාර සහ නගරය සෘජුවම ඇතුළත් කළ හැක.
                  </div>
                ) : (
                  searchResults.map((res) => {
                    const isSelected = customRoadSi === res.roadSi && customVillageSi === res.villageSi;
                    return (
                      <div
                        key={res.id}
                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-700 shadow-md'
                            : 'bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectPlace(res, false)}
                          className="flex-1 text-left flex items-center gap-2.5 cursor-pointer"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-teal-700 text-white' : 'bg-teal-500/10 text-teal-600'
                          }`}>
                            <Milestone className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                              <span>{res.titleSi}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                isSelected ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                {res.category}
                              </span>
                            </div>
                            <div className={`text-[10px] truncate ${isSelected ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                              📍 {res.shortDisplaySi} • <span className="font-mono">{res.lat.toFixed(4)}, {res.lng.toFixed(4)}</span>
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectPlace(res, true)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                              isSelected
                                ? 'bg-white text-teal-800 hover:bg-teal-50'
                                : 'bg-teal-600 hover:bg-teal-500 text-white'
                            }`}
                            title="මෙම ස්ථානය තෝරා වහාම සුරකින්න"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>තෝරා සුරකින්න</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL 3-FIELD ENTRY */}
          {activeTab === 'manual' && (
            <div className="bg-purple-500/10 border-2 border-purple-500/40 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-purple-950 dark:text-purple-200">
                      ✍️ අතින් ලිවීම (Manual 3-Part Custom Address Entry)
                    </h4>
                    <p className="text-[11px] text-purple-800 dark:text-purple-300">
                      ගම, මාර්ගය සහ නගරය ඔබට අවශ්‍ය ඕනෑම නමකින් සෘජුවම ඇතුළත් කර සුරකින්න:
                    </p>
                  </div>
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
                    onChange={(e) => {
                      stopLiveGpsTracking();
                      setCustomVillageSi(e.target.value);
                    }}
                    placeholder="උදා: කෝවින්න, කොල්ලුපිටිය..."
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border-2 border-purple-400 focus:border-purple-600 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase block mb-1">
                    2. මාර්ගයේ නම (Road)
                  </label>
                  <input
                    type="text"
                    value={customRoadSi}
                    onChange={(e) => {
                      stopLiveGpsTracking();
                      setCustomRoadSi(e.target.value);
                    }}
                    placeholder="උදා: ගංගාරාම පාර, ගාලු පාර..."
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border-2 border-amber-500 focus:border-amber-600 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase block mb-1">
                    3. නගරය (Town / City)
                  </label>
                  <input
                    type="text"
                    value={customTownSi}
                    onChange={(e) => {
                      stopLiveGpsTracking();
                      setCustomTownSi(e.target.value);
                    }}
                    placeholder="උදා: කටුනායක, කොළඹ, මීගමුව..."
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border-2 border-blue-400 focus:border-blue-600 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveLocation}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>මෙම අතින් ලියූ ලිපිනය සුරකින්න (Save Custom Location)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: ROAD SUGGESTIONS */}
          {activeTab === 'roads' && (
            <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                    <Milestone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-950 dark:text-amber-200">
                      🛣️ ප්‍රධාන මාර්ග ලැයිස්තුව (Road Chips)
                    </h4>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      ක්ලික් කර මාර්ගය තෝරන්න (සිතියම එම මාර්ගයට ගමන් කරයි):
                    </p>
                  </div>
                </div>
              </div>

              {/* Group 1: Kovinna Roads */}
              <div>
                <span className="text-[11px] font-black text-amber-900 dark:text-amber-300 block mb-1.5">
                  📍 කෝවින්න සහ කටුනායක ප්‍රධාන මාර්ග:
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
                    { si: 'අවිරිවත්ත පාර', en: 'Awariwatta Road', lat: 7.1650, lng: 79.8850 },
                    { si: 'ගුවන්තොටුපල පාර', en: 'Airport Road', lat: 7.1700, lng: 79.8900 },
                    { si: 'දුම්රියපොළ පාර', en: 'Station Road', lat: 7.1620, lng: 79.8820 },
                    { si: 'කොළඹ - මීගමුව ප්‍රධාන පාර', en: 'Colombo - Negombo Main Road', lat: 7.1610, lng: 79.8780 },
                  ].map((r, idx) => {
                    const isSelected = customRoadSi === r.si;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          stopLiveGpsTracking();
                          setCustomRoadSi(r.si);
                          panMapTo(r.lat, r.lng, 17);
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
            </div>
          )}

          {/* TAB 5: SAVED LOCATIONS */}
          {activeTab === 'saved' && (
            <div className="bg-blue-500/10 border-2 border-blue-500/40 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Bookmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-blue-950 dark:text-blue-200">
                      ⭐ මෑතකදී සුරකින ලද ස්ථාන (Saved Location History)
                    </h4>
                    <p className="text-[11px] text-blue-800 dark:text-blue-300">
                      පෙර සුරකින ලද ස්ථාන පහසුවෙන් තෝරාගන්න:
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {savedLocationsList.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                    තවමත් සුරකින ලද ස්ථාන නොමැත.
                  </div>
                ) : (
                  savedLocationsList.map((loc) => (
                    <div
                      key={loc.id}
                      onClick={() => {
                        stopLiveGpsTracking();
                        if (loc.lat && loc.lng) {
                          panMapTo(loc.lat, loc.lng, 17);
                          lookupAddress(loc.lat, loc.lng);
                        }
                      }}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2 hover:border-blue-500 cursor-pointer transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {loc.nameSi}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            📍 {loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSaveLocation(loc);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                        >
                          භාවිතා කරන්න
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedLocation(loc.id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="මකන්න"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: AUTO GPS */}
          {activeTab === 'gps' && (
            <div className="bg-red-500/10 border-2 border-red-500/40 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center">
                    <Crosshair className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-red-950 dark:text-red-200">
                      ⚡ සජීවී GPS Auto සෙවුම් පද්ධතිය (Live Device GPS Tracking)
                    </h4>
                    <p className="text-[11px] text-red-800 dark:text-red-300">
                      උපාංගයේ සජීවී චන්ද්‍රිකා GPS සංඥාව හරහා ස්වයංක්‍රීයව ස්ථානය ලබාගනී:
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={stopLiveGpsTracking}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <PowerOff className="w-3.5 h-3.5 text-red-400" />
                  <span>GPS නතර කරන්න</span>
                </button>
              </div>

              {gps.error ? (
                <div className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-300 text-red-700 dark:text-red-300 text-xs rounded-xl">
                  ⚠️ {gps.error}
                </div>
              ) : (
                <div className="p-3 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">GPS නිරවද්‍යතාව:</span>
                    <span className="font-mono font-bold text-emerald-600">±{gps.accuracy ?? 10} m</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">GPS වේගය:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{gps.speed ?? 0} km/h</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">අවසන් වේලාව:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{gps.timestamp || 'සජීවී'}</span>
                  </div>
                </div>
              )}

              {/* Instant Apply Auto GPS Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleApplyLiveGps}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-emerald-600 to-teal-700 hover:from-red-500 hover:to-teal-600 text-white text-xs sm:text-sm font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border border-emerald-300/40 animate-pulse"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>⚡ Auto GPS සක්‍රීය කර සජීවී ස්ථානය යොදන්න (Use Live Auto GPS)</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-100 dark:bg-[#07130c] border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Info className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>සිතියම මත ඔබ පිහිටවූ ස්ථානය සහය සේවා සඳහා නිවැරදිව සුරැකේ.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              වසන්න (Close)
            </button>

            <button
              onClick={handleSaveLocation}
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
