import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AccommodationListing } from '../types/accommodation';
import { getTravelEstimate } from '../utils/accommodationStorage';

interface AccommodationMapProps {
  items: AccommodationListing[];
  userLat?: number;
  userLng?: number;
  onSelectListing: (listing: AccommodationListing) => void;
}

export const AccommodationMap: React.FC<AccommodationMapProps> = ({
  items,
  userLat = 7.0786,
  userLng = 79.8913,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const centerLat = typeof userLat === 'number' ? userLat : (items[0]?.location.lat ?? 6.9271);
    const centerLng = typeof userLng === 'number' ? userLng : (items[0]?.location.lng ?? 79.8612);

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | Sahaya Sewa',
    }).addTo(map);

    if (typeof userLat === 'number' && typeof userLng === 'number') {
      const userIcon = L.divIcon({
        className: 'user-radar-pin',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(59, 130, 246, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background: #2563eb; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([userLat, userLng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; font-weight: bold; color: #1e3a8a; text-align: center;">
            📍 ඔබ සිටින ස්ථානය (Your Location)
          </div>
        `);
    }

    const bounds = L.latLngBounds([]);
    if (typeof userLat === 'number' && typeof userLng === 'number') {
      bounds.extend([userLat, userLng]);
    }

    items.forEach((item) => {
      if (!item.location.lat || !item.location.lng) return;

      bounds.extend([item.location.lat, item.location.lng]);

      const travel = getTravelEstimate(item.distanceKm ?? 5);

      let pinColor = '#059669';
      let pinEmoji = '🏡';
      let categoryName = 'කුලී නිවාස';

      if (item.category === 'boarding') {
        pinColor = '#2563eb';
        pinEmoji = '👥';
        categoryName = 'බෝඩින් / ඇනෙක්ස්';
      } else if (item.category === 'hotel') {
        pinColor = '#9333ea';
        pinEmoji = '🏨';
        categoryName = 'හෝටල් Room';
      }

      const customIcon = L.divIcon({
        className: 'accommodation-map-pin',
        html: `
          <div style="position: relative; width: 38px; height: 46px; cursor: pointer; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 36px; height: 36px; border-radius: 50% 50% 50% 0; background: ${pinColor}; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35); border: 2.5px solid white;">
              <span style="transform: rotate(45deg); font-size: 15px;">${pinEmoji}</span>
            </div>
          </div>
        `,
        iconSize: [38, 46],
        iconAnchor: [19, 44],
      });

      const firstPhotoUrl = item.photos?.[0]?.url || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=300&h=400&q=80';
      const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${item.location.lat},${item.location.lng}`;

      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 210px; max-width: 250px; padding: 2px;">
          <div style="position: relative; width: 100%; height: 110px; border-radius: 12px; overflow: hidden; margin-bottom: 8px;">
            <img src="${firstPhotoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
            <div style="position: absolute; top: 6px; left: 6px; background: ${pinColor}; color: white; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 20px;">
              ${categoryName}
            </div>
            <div style="position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.75); color: #fbbf24; font-size: 12px; font-weight: 900; padding: 2px 6px; border-radius: 6px;">
              රු. ${item.price.toLocaleString()}
            </div>
          </div>
          <strong style="font-size: 12px; color: #0f172a; display: block; line-height: 1.3; margin-bottom: 4px;">
            ${item.title}
          </strong>
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            📍 ${item.location.city} (${travel.distanceText})
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 10px; font-weight: bold; padding: 4px 6px; border-radius: 6px; margin-bottom: 8px;">
            ${travel.walkingText} • ${travel.tukText}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <a href="tel:${item.ownerPhone}" style="background: #059669; color: white; text-align: center; padding: 6px 4px; border-radius: 8px; font-size: 11px; font-weight: bold; text-decoration: none;">
              📞 Call
            </a>
            <a href="${navUrl}" target="_blank" rel="noopener noreferrer" style="background: #2563eb; color: white; text-align: center; padding: 6px 4px; border-radius: 8px; font-size: 11px; font-weight: bold; text-decoration: none;">
              🧭 Navigate
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([item.location.lat, item.location.lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(popupHtml);
    });

    if (items.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }

    mapInstanceRef.current = map;

    const t = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(t);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [items, userLat, userLng]);

  return (
    <div className="relative w-full h-[550px] rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-xl bg-slate-100 dark:bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      <div className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-[#071910]/95 backdrop-blur-md p-2.5 rounded-2xl shadow-lg border border-emerald-500/40 text-[11px] font-bold space-y-1.5">
        <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
          <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
          <span>🏡 කුලී නිවාස</span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
          <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
          <span>👥 බෝඩින් / ඇනෙක්ස්</span>
        </div>
        <div className="flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
          <span className="w-3 h-3 rounded-full bg-purple-600 shrink-0" />
          <span>🏨 හොටල් Room</span>
        </div>
      </div>
    </div>
  );
};
