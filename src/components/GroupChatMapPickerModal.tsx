import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Crosshair,
  Search,
  ZoomIn,
  ZoomOut,
  Layers,
  Send,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LocateFixed,
  Globe,
  Compass,
  RefreshCw
} from 'lucide-react';
import { GroupMessageLocation } from '../types';
import { resolveExactLocation, searchSriLankanPlacesAndRoads, PlaceSearchResult, SRI_LANKA_CURATED_PLACES } from '../utils/geoUtils';
import { getHighAccuracyLocation } from '../utils/highAccuracyGps';

interface GroupChatMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLocation?: (loc: GroupMessageLocation) => void;
  onSelectLocation?: (loc: GroupMessageLocation) => void;
  initialLat?: number;
  initialLng?: number;
}

// 100% නොමිලේ ක්‍රියාත්මක වන විශ්වාසදායක Map Tile Providers
const MAP_THEMES = {
  voyager: {
    name: 'Street (නවීන)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    name: 'Satellite (චන්ද්‍රිකා)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labelUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    subdomains: [],
    maxZoom: 19,
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
  },
  dark: {
    name: 'Dark (රාත්‍රී)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  humanitarian: {
    name: 'Emergency (ආපදා)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors, Humanitarian Team',
  }
};

export const GroupChatMapPickerModal: React.FC<GroupChatMapPickerModalProps> = ({
  isOpen,
  onClose,
  onSendLocation,
  onSelectLocation,
  initialLat = 7.0786, // Ja-Ela / Western Province center
  initialLng = 79.8913,
}) => {
  const handleLocationEmit = onSendLocation || onSelectLocation || (() => {});
  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [placeName, setPlaceName] = useState<string>('ජා-ඇල නගර සභාව අසල');
  const [placeAddress, setPlaceAddress] = useState<string>('ජා-ඇල, බස්නාහිර පළාත');
  const [note, setNote] = useState<string>('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>(SRI_LANKA_CURATED_PLACES.slice(0, 8));
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Map Themes
  const [mapTheme, setMapTheme] = useState<'voyager' | 'satellite' | 'dark' | 'humanitarian'>('voyager');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Leaflet refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const labelTileLayerRef = useRef<L.TileLayer | null>(null);

  // High Precision Reverse Geocode lat/lng
  const reverseGeocode = useCallback(async (targetLat: number, targetLng: number) => {
    setIsGeocoding(true);
    try {
      const geo = await resolveExactLocation(targetLat, targetLng);
      if (geo) {
        const fullDisplay = geo.shortDisplaySi || `${geo.villageSi || ''}, ${geo.roadSi || ''}, ${geo.townSi || ''}`.replace(/^,\s*|,\s*$/g, '');
        if (fullDisplay && fullDisplay.trim()) {
          setPlaceName(fullDisplay);
        }
        setPlaceAddress(geo.fullAddressSi || `${geo.townSi || 'ශ්‍රී ලංකාව'}, ${geo.districtSi || ''}`);
      }
    } catch (err) {
      console.error('Error reverse geocoding:', err);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Update Accuracy Circle Helper
  const updateAccuracyCircle = (targetLat: number, targetLng: number, radiusMeters: number | null) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (accuracyCircleRef.current) {
      map.removeLayer(accuracyCircleRef.current);
      accuracyCircleRef.current = null;
    }

    if (radiusMeters && radiusMeters > 0) {
      const circle = L.circle([targetLat, targetLng], {
        radius: Math.min(radiusMeters, 500),
        color: '#3b82f6',
        fillColor: '#60a5fa',
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: '4, 4',
      }).addTo(map);
      accuracyCircleRef.current = circle;
    }
  };

  // High-Accuracy GPS Lock
  const handleAcquireHighAccuracyGps = useCallback(async () => {
    setIsLocating(true);
    setGpsError(null);
    try {
      const fix = await getHighAccuracyLocation(10000);
      setLat(fix.lat);
      setLng(fix.lng);
      setAccuracyMeters(fix.accuracyMeters);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([fix.lat, fix.lng], 17, { animate: true });
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([fix.lat, fix.lng]);
      }
      updateAccuracyCircle(fix.lat, fix.lng, fix.accuracyMeters);
      reverseGeocode(fix.lat, fix.lng);
    } catch (err) {
      setGpsError('ස්වයංක්‍රීය GPS ලබාගත නොහැකි විය. සිතියම මත අවශ්‍ය තැන Click කරන්න.');
    } finally {
      setIsLocating(false);
    }
  }, [reverseGeocode]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Fix default Leaflet icon paths
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Create Map Instance with bounds
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    const activeConfig = MAP_THEMES[mapTheme];
    const baseLayer = L.tileLayer(activeConfig.url, {
      maxZoom: activeConfig.maxZoom,
      subdomains: activeConfig.subdomains as any,
      attribution: activeConfig.attribution,
    }).addTo(map);
    baseTileLayerRef.current = baseLayer;

    // Optional Satellite Street Label Overlay
    if (mapTheme === 'satellite' && (activeConfig as any).labelUrl) {
      const labelLayer = L.tileLayer((activeConfig as any).labelUrl, {
        maxZoom: 19,
        zIndex: 10,
      }).addTo(map);
      labelTileLayerRef.current = labelLayer;
    }

    // Creative Glowing Modern SVG Marker
    const modernMarkerHtml = `
      <div style="position: relative; width: 44px; height: 44px; display: flex; items-center; justify-content: center; pointer-events: none;">
        <div style="position: absolute; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); transform: rotate(-45deg); box-shadow: 0 10px 25px rgba(79, 70, 229, 0.6); border: 2.5px solid white;"></div>
        <div style="position: absolute; top: 11px; left: 15px; width: 14px; height: 14px; background: white; border-radius: 50%; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);"></div>
        <div style="position: absolute; bottom: 2px; width: 10px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(1.5px);"></div>
      </div>
    `;

    const customIcon = L.divIcon({
      className: 'modern-pulsing-pin',
      html: modernMarkerHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 42],
    });

    const marker = L.marker([lat, lng], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const newLat = Number(pos.lat.toFixed(6));
      const newLng = Number(pos.lng.toFixed(6));
      setLat(newLat);
      setLng(newLng);
      updateAccuracyCircle(newLat, newLng, accuracyMeters);
      reverseGeocode(newLat, newLng);
    });

    markerRef.current = marker;

    // Click map to reposition marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newLat = Number(e.latlng.lat.toFixed(6));
      const newLng = Number(e.latlng.lng.toFixed(6));
      setLat(newLat);
      setLng(newLng);
      marker.setLatLng([newLat, newLng]);
      updateAccuracyCircle(newLat, newLng, accuracyMeters);
      map.panTo([newLat, newLng], { animate: true });
      reverseGeocode(newLat, newLng);
    });

    mapInstanceRef.current = map;

    // Invalidating map size to ensure all tiles render properly upon modal open
    const runInvalidate = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ animate: false });
      }
    };

    requestAnimationFrame(runInvalidate);
    const t1 = setTimeout(runInvalidate, 100);
    const t2 = setTimeout(runInvalidate, 300);
    const t3 = setTimeout(runInvalidate, 600);

    const resizeObserver = new ResizeObserver(() => {
      runInvalidate();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, mapTheme]);

  // Initial High Accuracy GPS on first open
  useEffect(() => {
    if (isOpen) {
      handleAcquireHighAccuracyGps();
    }
  }, [isOpen, handleAcquireHighAccuracyGps]);

  // Handle Search Places
  const handleSearchInput = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults(SRI_LANKA_CURATED_PLACES.slice(0, 8));
      setIsDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    setIsDropdownOpen(true);
    try {
      const results = await searchSriLankanPlacesAndRoads(q);
      setSearchResults(results.slice(0, 10));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  // Select search result
  const handleSelectSearchResult = (item: PlaceSearchResult) => {
    setLat(item.lat);
    setLng(item.lng);
    setPlaceName(item.titleSi || item.titleEn || item.roadSi || item.townSi);
    setPlaceAddress(item.shortDisplaySi || `${item.townSi || ''}, ${item.districtSi || ''}`);
    setIsDropdownOpen(false);
    setSearchQuery('');

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([item.lat, item.lng], 16, { animate: true });
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([item.lat, item.lng]);
    }
    updateAccuracyCircle(item.lat, item.lng, null);
  };

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Send Location
  const handleSend = () => {
    if (!placeName.trim()) {
      alert('කරුණාකර ස්ථානයේ නම හෝ විස්තරයක් ඇතුළත් කරන්න.');
      return;
    }

    const locPayload: GroupMessageLocation = {
      name: placeName.trim(),
      address: placeAddress.trim(),
      lat,
      lng,
      note: note.trim() || undefined,
    };

    handleLocationEmit(locPayload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      {/* Scoped CSS for Leaflet elements */}
      <style>{`
        .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          background: #f1f5f9;
        }
        .modern-pulsing-pin {
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
          transition: transform 0.15s ease-out;
        }
      `}</style>

      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 rounded-3xl shadow-2xl border-2 border-indigo-500/40 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <MapPin className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight">
                📍 සිතියම මත ස්ථානය තෝරන්න (Modern GPS Map)
              </h2>
              <p className="text-[11px] text-indigo-100 font-medium">
                මීටරයෙන් මීටරය නිවැරදි ඉහළ නිරවද්‍යතා චන්ද්‍රිකා GPS පද්ධතිය
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

        {/* Top Controls: Search & Layer Switcher */}
        <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Search Box with Autocomplete */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="නගරය, ගම, හෝ පාර නමින් සොයන්න..."
              className="w-full bg-white dark:bg-zinc-800 pl-9 pr-8 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {isSearching && (
              <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            )}

            {/* Dropdown Results */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-xl z-[1000] max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50 dark:hover:bg-zinc-800/80 transition-colors flex items-center gap-2.5 cursor-pointer text-xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-zinc-100 block">
                        {item.titleSi || item.roadSi || item.townSi}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                        {item.shortDisplaySi || `${item.townSi || ''}, ${item.districtSi || ''}`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map Layer Switcher: Street / Satellite / Dark */}
          <div className="flex rounded-xl border border-indigo-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5 shrink-0 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMapTheme('voyager')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                mapTheme === 'voyager' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              🗺️ වීදි (Street)
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('satellite')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                mapTheme === 'satellite' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              🛰️ චන්ද්‍රිකා (Satellite)
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('dark')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                mapTheme === 'dark' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              🌙 Dark
            </button>
          </div>
        </div>

        {/* GPS Error Notification */}
        {gpsError && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5 shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Interactive Map Area (Strictly Bounded Container with explicit height) */}
        <div className="relative w-full h-[320px] sm:h-[400px] overflow-hidden bg-slate-100 dark:bg-zinc-950">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

          {/* Floating Tool: Snap to High Precision GPS */}
          <button
            type="button"
            disabled={isLocating}
            onClick={handleAcquireHighAccuracyGps}
            className="absolute left-3 top-3 z-[400] px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-lg border-2 border-indigo-500 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <LocateFixed className={`w-4 h-4 text-indigo-600 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'GPS ලබාගනිමින්...' : '🎯 මගේ ස්ථානයට යන්න (Snap GPS)'}</span>
          </button>

          {/* Floating Zoom Buttons */}
          <div className="absolute right-3 top-3 z-[400] flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-9 h-9 rounded-2xl bg-white/95 dark:bg-zinc-900/95 shadow-md border border-zinc-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer active:scale-95"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-9 h-9 rounded-2xl bg-white/95 dark:bg-zinc-900/95 shadow-md border border-zinc-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer active:scale-95"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Floating Coordinates & Accuracy Badge */}
          <div className="absolute left-3 bottom-3 z-[400] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700 font-mono text-[10px] font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-indigo-600" />
            <span>{lat.toFixed(5)}° N, {lng.toFixed(5)}° E</span>
            {accuracyMeters && (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                ±{accuracyMeters}m
              </span>
            )}
            {isGeocoding && <Loader2 className="w-3 h-3 animate-spin text-indigo-500 ml-1" />}
          </div>
        </div>

        {/* Footer: Details & Send Button */}
        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Place Name / Title */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                ස්ථානයේ නම (Location Title) *
              </label>
              <input
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="උදා: කැලණිය රජමහා විහාරය අසල, ජා-ඇල නගරය..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Note / Instruction */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                අමතර සටහනක් (Note / Details)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="උදා: උදෑසන 8:30ට මෙතැනට රැස්වන්න, ගේට්ටුව අසල..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-xs transition-colors cursor-pointer"
            >
              අවලංගු කරන්න
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>ස්ථානය තහවුරු කරන්න (Confirm Location)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
