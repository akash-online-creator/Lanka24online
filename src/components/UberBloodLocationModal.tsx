import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Search,
  ZoomIn,
  ZoomOut,
  X,
  Loader2,
  CheckCircle2,
  LocateFixed,
  Car,
  Clock,
  Route,
  ExternalLink,
} from 'lucide-react';
import {
  resolveExactLocation,
  searchSriLankanPlacesAndRoads,
  PlaceSearchResult,
  SRI_LANKA_CURATED_PLACES,
} from '../utils/geoUtils';
import { getHighAccuracyLocation } from '../utils/highAccuracyGps';
import { calculateDistanceKm } from '../utils/bloodEligibilityUtils';

export interface UberPickedLocation {
  lat: number;
  lng: number;
  placeName: string;
  address: string;
  dropLocationUrl: string;
}

interface UberBloodLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLocation: (loc: UberPickedLocation) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  initialHospitalName?: string;
}

export const UberBloodLocationModal: React.FC<UberBloodLocationModalProps> = ({
  isOpen,
  onClose,
  onConfirmLocation,
  initialLat,
  initialLng,
  initialHospitalName = '',
}) => {
  const [lat, setLat] = useState<number>(initialLat || 6.9186); // Default Colombo National Hospital area
  const [lng, setLng] = useState<number>(initialLng || 79.8688);
  const [placeName, setPlaceName] = useState<string>(
    initialHospitalName || 'කොළඹ ජාතික රෝහල අසල'
  );
  const [placeAddress, setPlaceAddress] = useState<string>('කොළඹ, බස්නාහිර පළාත');
  const [isDraggingMap, setIsDraggingMap] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [mapLayer, setMapLayer] = useState<'street' | 'satellite'>('street');

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>(
    SRI_LANKA_CURATED_PLACES.slice(0, 6)
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const reverseGeocode = useCallback(async (targetLat: number, targetLng: number) => {
    setIsGeocoding(true);
    try {
      const resolved = await resolveExactLocation(targetLat, targetLng);
      const roadOrVillage =
        resolved.roadSi || resolved.villageSi || resolved.townSi || 'තෝරාගත් රෝහල් ස්ථානය';
      const formattedAddr =
        resolved.fullFormattedSi || `${resolved.townSi || ''}, ${resolved.districtSi || ''}`;
      setPlaceName(roadOrVillage);
      setPlaceAddress(formattedAddr);
    } catch {
      setPlaceName(`GPS (${targetLat.toFixed(4)}, ${targetLng.toFixed(4)})`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const handleUseCurrentGps = useCallback(async () => {
    setIsLocating(true);
    try {
      const fix = await getHighAccuracyLocation(9000);
      setLat(fix.lat);
      setLng(fix.lng);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([fix.lat, fix.lng], 17, { animate: true });
      }
      reverseGeocode(fix.lat, fix.lng);
    } catch {
      // keep current position
    } finally {
      setIsLocating(false);
    }
  }, [reverseGeocode]);

  // Initialize Uber-style Center-Pin Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const startLat = initialLat || lat || 6.9186;
    const startLng = initialLng || lng || 79.8688;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 16,
      zoomControl: false,
    });

    const tileUrl =
      mapLayer === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    map.on('movestart', () => {
      setIsDraggingMap(true);
    });

    map.on('moveend', () => {
      setIsDraggingMap(false);
      const center = map.getCenter();
      const newLat = Number(center.lat.toFixed(6));
      const newLng = Number(center.lng.toFixed(6));
      setLat(newLat);
      setLng(newLng);
      reverseGeocode(newLat, newLng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const newLat = Number(e.latlng.lat.toFixed(6));
      const newLng = Number(e.latlng.lng.toFixed(6));
      map.panTo([newLat, newLng], { animate: true });
    });

    mapInstanceRef.current = map;

    const invalidate = () => map.invalidateSize({ animate: false });
    const t1 = setTimeout(invalidate, 100);
    const t2 = setTimeout(invalidate, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isOpen, mapLayer]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults(SRI_LANKA_CURATED_PLACES.slice(0, 6));
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    setShowDropdown(true);
    try {
      const localRes = await searchSriLankanPlacesAndRoads(q);
      if (localRes && localRes.length > 0) {
        setSearchResults(localRes.slice(0, 8));
      } else {
        // Fallback Nominatim search for hospitals/places in Sri Lanka
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=lk&q=${encodeURIComponent(
            q
          )}&limit=6`
        );
        const data = await resp.json();
        if (Array.isArray(data)) {
          setSearchResults(
            data.map((d: any) => ({
              titleSi: d.display_name.split(',')[0],
              titleEn: d.display_name.split(',')[0],
              shortDisplaySi: d.display_name,
              lat: parseFloat(d.lat),
              lng: parseFloat(d.lon),
              townSi: d.display_name.split(',')[1]?.trim() || '',
              districtSi: 'ශ්‍රී ලංකාව',
            })) as any
          );
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = (item: PlaceSearchResult) => {
    setLat(item.lat);
    setLng(item.lng);
    const title = item.titleSi || item.titleEn || item.roadSi || item.townSi || 'රෝහල';
    setPlaceName(title);
    setPlaceAddress(item.shortDisplaySi || `${item.townSi || ''}, ${item.districtSi || ''}`);
    setShowDropdown(false);
    setSearchQuery(title);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([item.lat, item.lng], 17, { animate: true });
    }
  };

  const handleConfirm = () => {
    const dropLocationUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    onConfirmLocation({
      lat,
      lng,
      placeName: placeName || initialHospitalName || 'රෝහල',
      address: placeAddress,
      dropLocationUrl,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-950 text-white rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl flex flex-col h-[86vh] max-h-[720px]">
        {/* Uber Top Header & Search Bar */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 space-y-2.5 relative z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center font-black text-white shadow-md">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white">
                  🚕 Uber ක්‍රමයට ලේ දන්දෙන ස්ථානය (Drop-Off) තෝරන්න
                </h3>
                <p className="text-[10px] text-slate-400">
                  සිතියම එහා මෙහා ගෙන ගොස් මැද ඇති Pin එක රෝහල මතට තබන්න හෝ ඉහළින් සොයන්න
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Uber Search Input */}
          <div className="relative">
            <div className="flex items-center bg-slate-900 border-2 border-slate-700 focus-within:border-emerald-500 rounded-2xl px-3 py-2 gap-2">
              <div className="w-2.5 h-2.5 rounded-xs bg-rose-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder="රෝහලේ නම හෝ නගරය සොයන්න (උදා: ජාතික රෝහල, කළුබෝවිල, මහනුවර)..."
                className="w-full bg-transparent text-white text-xs sm:text-sm font-bold focus:outline-none placeholder:text-slate-500"
              />
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
              ) : (
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-52 overflow-y-auto z-50 divide-y divide-slate-800">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPlace(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate">
                        {item.titleSi || item.titleEn || item.roadSi || item.townSi}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.shortDisplaySi || `${item.townSi || ''}, ${item.districtSi || ''}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Map Container with Fixed Center Uber Pin */}
        <div className="relative flex-1 bg-slate-900 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Fixed Center Uber Drop-Off Pin */}
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div
              className={`flex flex-col items-center transition-transform duration-200 -mt-9 ${
                isDraggingMap ? '-translate-y-3 scale-110' : 'translate-y-0 scale-100'
              }`}
            >
              <div className="px-2.5 py-1 rounded-full bg-slate-950 text-white text-[10px] font-black shadow-lg border border-rose-500 whitespace-nowrap mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>🏥 DROP-OFF ස්ථානය</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-rose-600 border-3 border-white shadow-xl flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
              </div>
              <div className="w-1 h-3 bg-slate-950" />
              <div
                className={` rounded-full bg-black/50 transition-all ${
                  isDraggingMap ? 'w-4 h-1.5 blur-[1px]' : 'w-2.5 h-1'
                }`}
              />
            </div>
          </div>

          {/* Floating Map Controls */}
          <div className="absolute right-3 bottom-4 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleUseCurrentGps}
              className="px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-emerald-400 border border-slate-700 shadow-lg flex items-center gap-1.5 text-xs font-black cursor-pointer"
              title="මා සිටින ස්ථානය (Live GPS)"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LocateFixed className="w-4 h-4" />
              )}
              <span>GPS</span>
            </button>
            <button
              type="button"
              onClick={() => setMapLayer((prev) => (prev === 'street' ? 'satellite' : 'street'))}
              className="px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-white border border-slate-700 shadow-lg text-[11px] font-black cursor-pointer"
            >
              {mapLayer === 'street' ? '🛰️ චන්ද්‍රිකා' : '🗺️ සිතියම'}
            </button>
            <div className="flex flex-col rounded-xl overflow-hidden border border-slate-700 bg-slate-950/90 shadow-lg">
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="p-2 hover:bg-slate-800 text-white flex items-center justify-center cursor-pointer border-b border-slate-800"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="p-2 hover:bg-slate-800 text-white flex items-center justify-center cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Uber Bottom Sheet Confirmation */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3 z-30">
          <div className="flex items-start gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-5 h-5 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                තෝරාගත් රෝහල / Drop-Off ස්ථානය
              </span>
              <div className="text-xs sm:text-sm font-black text-white truncate">
                {isGeocoding ? 'ස්ථානය සොයමින් පවතී...' : placeName}
              </div>
              <div className="text-[11px] text-slate-400 truncate">{placeAddress}</div>
              <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>🚕 මෙම Drop-Off ස්ථානය තහවුරු කරන්න (Confirm Drop Location)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Uber Taxi-Style Live Route Map (Pickup -> Hospital Drop-Off)
// ============================================================================
interface UberBloodRouteMapProps {
  hospitalName: string;
  district?: string;
  destLat?: number | null;
  destLng?: number | null;
  donorLat?: number | null;
  donorLng?: number | null;
  googleMapsNavUrl: string;
}

export const UberBloodRouteMap: React.FC<UberBloodRouteMapProps> = ({
  hospitalName,
  district,
  destLat,
  destLng,
  donorLat: propDonorLat,
  donorLng: propDonorLng,
  googleMapsNavUrl,
}) => {
  const [myLat, setMyLat] = useState<number | null>(propDonorLat || null);
  const [myLng, setMyLng] = useState<number | null>(propDonorLng || null);
  const [targetLat, setTargetLat] = useState<number>(destLat || 6.9186);
  const [targetLng, setTargetLng] = useState<number>(destLng || 79.8688);
  const [locatingGps, setLocatingGps] = useState<boolean>(false);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  // Resolve hospital coordinates if not explicitly pinned
  useEffect(() => {
    if (destLat && destLng) {
      setTargetLat(destLat);
      setTargetLng(destLng);
      return;
    }
    const q = `${hospitalName || ''} ${district || ''} Sri Lanka`.trim();
    if (!q) return;
    let cancelled = false;
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=lk&q=${encodeURIComponent(
        q
      )}&limit=1`
    )
      .then((r) => r.json())
      .then((arr) => {
        if (!cancelled && Array.isArray(arr) && arr[0]?.lat && arr[0]?.lon) {
          setTargetLat(parseFloat(arr[0].lat));
          setTargetLng(parseFloat(arr[0].lon));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [destLat, destLng, hospitalName, district]);

  const acquireDonorGps = useCallback(async () => {
    setLocatingGps(true);
    try {
      const fix = await getHighAccuracyLocation(8000);
      setMyLat(fix.lat);
      setMyLng(fix.lng);
    } catch {
      // ignore if GPS denied
    } finally {
      setLocatingGps(false);
    }
  }, []);

  useEffect(() => {
    if (!myLat || !myLng) {
      acquireDonorGps();
    }
  }, [acquireDonorGps, myLat, myLng]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = L.map(mapRef.current, {
      center: [targetLat, targetLng],
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // Hospital Drop-off Marker (Red Uber Square Pin)
    const dropIcon = L.divIcon({
      className: 'uber-drop-pin',
      html: `<div style="display:flex;flex-direction:column;align-items:center;">
        <div style="background:#e11d48;color:white;font-weight:900;font-size:10px;padding:2px 8px;border-radius:999px;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.35);white-space:nowrap;">🏥 රෝහල (Drop-Off)</div>
        <div style="width:16px;height:16px;background:#e11d48;border:3px solid white;border-radius:4px;box-shadow:0 4px 10px rgba(0,0,0,0.4);margin-top:2px;"></div>
      </div>`,
      iconSize: [120, 44],
      iconAnchor: [60, 40],
    });
    L.marker([targetLat, targetLng], { icon: dropIcon }).addTo(map);

    if (myLat && myLng) {
      // Donor Pickup Marker (Green Uber Circle Pin)
      const pickupIcon = L.divIcon({
        className: 'uber-pickup-pin',
        html: `<div style="display:flex;flex-direction:column;align-items:center;">
          <div style="background:#059669;color:white;font-weight:900;font-size:10px;padding:2px 8px;border-radius:999px;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.35);white-space:nowrap;">🟢 ඔබ සිටින ස්ථානය</div>
          <div style="width:16px;height:16px;background:#10b981;border:3px solid white;border-radius:999px;box-shadow:0 4px 10px rgba(0,0,0,0.4);margin-top:2px;"></div>
        </div>`,
        iconSize: [120, 44],
        iconAnchor: [60, 40],
      });
      L.marker([myLat, myLng], { icon: pickupIcon }).addTo(map);

      // Uber Route Polyline
      const routeLine = L.polyline(
        [
          [myLat, myLng],
          [targetLat, targetLng],
        ],
        {
          color: '#0f172a',
          weight: 5,
          opacity: 0.85,
          dashArray: '8, 6',
        }
      ).addTo(map);

      map.fitBounds(routeLine.getBounds(), { padding: [36, 36], maxZoom: 16 });
    } else {
      map.setView([targetLat, targetLng], 15);
    }

    leafletMapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => {
      clearTimeout(t);
      map.remove();
      leafletMapRef.current = null;
    };
  }, [targetLat, targetLng, myLat, myLng]);

  const distanceKm =
    myLat && myLng ? calculateDistanceKm(myLat, myLng, targetLat, targetLng) : null;
  const etaMins = distanceKm ? Math.max(3, Math.round((distanceKm / 32) * 60)) : null;

  const finalNavUrl =
    myLat && myLng
      ? `https://www.google.com/maps/dir/?api=1&origin=${myLat},${myLng}&destination=${targetLat},${targetLng}&travelmode=driving`
      : googleMapsNavUrl ||
        `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}&travelmode=driving`;

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-950 text-white shadow-lg space-y-0">
      {/* Uber Trip Top Bar */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
            <Route className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-black text-white flex items-center gap-1.5">
              <span>🚕 Uber Route මඟ පෙන්වීම</span>
              {distanceKm !== null && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                  {distanceKm} km
                </span>
              )}
              {etaMins !== null && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> ~{etaMins} min
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              🟢 ඔබ සිටින ස්ථානයේ සිට → 🔴 {hospitalName} {district ? `(${district})` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={acquireDonorGps}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-black flex items-center gap-1 cursor-pointer"
        >
          {locatingGps ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LocateFixed className="w-3.5 h-3.5" />
          )}
          <span>මාගේ GPS</span>
        </button>
      </div>

      {/* Interactive Leaflet Route Map */}
      <div className="relative w-full h-48 bg-slate-900">
        <div ref={mapRef} className="w-full h-full z-10" />
      </div>

      {/* Bottom Action Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <a
          href={finalNavUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Navigation className="w-4 h-4" />
          <span>🚕 Drop Location එක වෙත ගමන ආරම්භ කරන්න (Start Navigation)</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>
      </div>
    </div>
  );
};
