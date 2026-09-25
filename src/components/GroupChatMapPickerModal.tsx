import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
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
  LocateFixed
} from 'lucide-react';
import { GroupMessageLocation } from '../types';
import { resolveExactLocation, searchSriLankanPlacesAndRoads, PlaceSearchResult, SRI_LANKA_CURATED_PLACES } from '../utils/geoUtils';

interface GroupChatMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLocation?: (loc: GroupMessageLocation) => void;
  onSelectLocation?: (loc: GroupMessageLocation) => void;
  initialLat?: number;
  initialLng?: number;
}

export const GroupChatMapPickerModal: React.FC<GroupChatMapPickerModalProps> = ({
  isOpen,
  onClose,
  onSendLocation,
  onSelectLocation,
  initialLat = 6.9553, // Kelaniya / Colombo default
  initialLng = 79.9153,
}) => {
  const handleLocationEmit = onSendLocation || onSelectLocation || (() => {});
  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [placeName, setPlaceName] = useState<string>('කැලණිය රජමහා විහාරය අසල');
  const [placeAddress, setPlaceAddress] = useState<string>('කැලණිය, බස්නාහිර පළාත');
  const [note, setNote] = useState<string>('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>(SRI_LANKA_CURATED_PLACES.slice(0, 8));
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Map layer (OSM standard, HOT, satellite)
  const [mapLayer, setMapLayer] = useState<'osm' | 'hot' | 'satellite'>('osm');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Leaflet refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Reverse geocode lat/lng
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

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Fix default leaflet icons
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

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
    });

    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let subdomains: string[] | string = 'abc';

    if (mapLayer === 'hot') {
      tileUrl = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
    } else if (mapLayer === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      subdomains = [];
    }

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Custom glowing marker
    const customIcon = L.divIcon({
      className: 'custom-chat-pin',
      html: `
        <div style="position: relative; width: 36px; height: 36px; transform: translate(-50%, -100%);">
          <div style="position: absolute; inset: 0; background: #4f46e5; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 8px 16px rgba(79, 70, 229, 0.4); border: 2.5px solid white;"></div>
          <div style="position: absolute; top: 7px; left: 7px; width: 12px; height: 12px; background: white; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
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
      reverseGeocode(newLat, newLng);
    });

    markerRef.current = marker;

    // Click map to reposition
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newLat = Number(e.latlng.lat.toFixed(6));
      const newLng = Number(e.latlng.lng.toFixed(6));
      setLat(newLat);
      setLng(newLng);
      marker.setLatLng([newLat, newLng]);
      map.panTo([newLat, newLng], { animate: true });
      reverseGeocode(newLat, newLng);
    });

    mapInstanceRef.current = map;

    // Resize invalidate after modal animation
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, mapLayer]);

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
  };

  // Use Current GPS Location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('ඔබගේ බ්‍රවුසරය GPS සහය නොදක්වයි.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const myLat = Number(pos.coords.latitude.toFixed(6));
        const myLng = Number(pos.coords.longitude.toFixed(6));
        setLat(myLat);
        setLng(myLng);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([myLat, myLng], 17, { animate: true });
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([myLat, myLng]);
        }
        reverseGeocode(myLat, myLng);
      },
      (err) => {
        setIsLocating(false);
        setGpsError('GPS ස්ථානය ලබා ගැනීමට අවසර නොලැබිණි. කරුණාකර සිතියම මත ස්ථානය තෝරන්න.');
        console.warn('GPS error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };
  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  // Handle Send
  const handleSend = () => {
    if (!placeName.trim()) {
      alert('කරුණාකර ස්ථානයේ නම හෝ විස්තරයක් ඇතුළත් කරන්න.');
      return;
    }

    handleLocationEmit({
      name: placeName.trim(),
      address: placeAddress.trim(),
      lat,
      lng,
      note: note.trim() || undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl border-2 border-indigo-500 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">
                ස්ථානය තෝරා සංවාදයට එක්කරන්න (Share Location on Map)
              </h3>
              <p className="text-[11px] text-indigo-100 font-medium">
                සිතියම මත ස්ථානය Pin කරන්න හෝ නගරය/ප්‍රදේශය Search කරන්න
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="වසන්න"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & GPS Tool Bar */}
        <div className="p-3 bg-indigo-50/70 dark:bg-zinc-800/80 border-b border-indigo-100 dark:border-zinc-700 flex flex-col sm:flex-row gap-2 shrink-0 relative">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-indigo-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) setIsDropdownOpen(true);
              }}
              placeholder="ශ්‍රී ලංකාවේ නගරයක්, පාරක් හෝ ස්ථානයක් සොයන්න..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-indigo-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-xs font-bold outline-none focus:border-indigo-600 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsDropdownOpen(false);
                }}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 text-xs"
              >
                ✕
              </button>
            )}

            {/* Suggestions Dropdown */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border-2 border-indigo-500 rounded-2xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                {searchResults.map((res, i) => (
                  <button
                    key={`${res.id || res.titleEn}_${i}`}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-zinc-800 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-xs text-slate-800 dark:text-zinc-100 truncate">
                          {res.titleSi || res.titleEn}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          {res.townSi || res.townEn}, {res.districtSi || ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                      {res.lat.toFixed(3)}, {res.lng.toFixed(3)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Use GPS Button */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
            <span>{isLocating ? 'GPS සෙවුම...' : 'මගේ Live GPS'}</span>
          </button>

          {/* Layer switcher */}
          <div className="flex rounded-xl border border-indigo-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setMapLayer('osm')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                mapLayer === 'osm' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Street
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('satellite')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                mapLayer === 'satellite' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Satellite
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

        {/* Interactive Map Area */}
        <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] bg-slate-100 dark:bg-zinc-950">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Map Floating Tools */}
          <div className="absolute right-3 top-3 z-[400] flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 shadow-md border border-zinc-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 shadow-md border border-zinc-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Coordinates Badge */}
          <div className="absolute left-3 bottom-3 z-[400] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs px-2.5 py-1 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-700 font-mono text-[10px] font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-indigo-600" />
            <span>{lat.toFixed(5)}° N, {lng.toFixed(5)}° E</span>
            {isGeocoding && <Loader2 className="w-3 h-3 animate-spin text-indigo-500 ml-1" />}
          </div>

          {/* Pin Instruction Banner */}
          <div className="absolute top-3 left-3 z-[400] bg-indigo-900/85 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl shadow-lg text-[10px] font-bold flex items-center gap-1.5 pointer-events-none">
            <span>📍 සිතියම මත Click කර හෝ Pin එක අදින්න (Drag Pin)</span>
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
                placeholder="උදා: කැලණිය රජමහා විහාරය අසල"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold outline-none focus:border-indigo-600"
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
                placeholder="උදා: උදෑසන 8:30ට මෙතැනට රැස්වන්න"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-xs transition-colors cursor-pointer"
            >
              අවලංගු කරන්න
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>ස්ථානය සංවාදයට යවන්න (Send Location)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
