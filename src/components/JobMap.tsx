import React, { useEffect, useRef } from 'react';
import { JobListing } from '../types/job';
import { calculateDistanceKm, formatProximityDisplay } from '../utils/jobStorage';

interface JobMapProps {
  jobs: JobListing[];
  userLat?: number;
  userLng?: number;
  onSelectJob: (job: JobListing) => void;
  selectedJobId?: string | null;
}

export const JobMap: React.FC<JobMapProps> = ({
  jobs,
  userLat = 7.1802,
  userLng = 79.8841,
  onSelectJob,
  selectedJobId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap((window as any).L);
      document.body.appendChild(script);
      return;
    }

    initMap(L);

    function initMap(Leaflet: any) {
      if (!Leaflet || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const centerLat = userLat || jobs[0]?.lat || 7.1802;
        const centerLng = userLng || jobs[0]?.lng || 79.8841;

        const map = Leaflet.map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: 12,
          zoomControl: true,
        });

        Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear previous markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Add User Location Marker
      if (userLat && userLng) {
        const userIcon = Leaflet.divIcon({
          className: 'user-pin-custom',
          html: `<div style="background-color: #2563eb; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(37,99,235,0.8);"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        const userMarker = Leaflet.marker([userLat, userLng], { icon: userIcon })
          .addTo(map)
          .bindPopup('<b>ඔබගේ වත්මන් ස්ථානය (Your Location)</b>');
        markersRef.current.push(userMarker);
      }

      // Add Job Markers
      jobs.forEach((job) => {
        if (!job.lat || !job.lng) return;

        const distKm = userLat && userLng ? calculateDistanceKm(userLat, userLng, job.lat, job.lng) : null;
        const prox = distKm !== null ? formatProximityDisplay(distKm) : null;

        const isSelected = selectedJobId === job.id;
        const pinColor = isSelected ? '#f59e0b' : '#059669';

        const customIcon = Leaflet.divIcon({
          className: 'job-pin-custom',
          html: `
            <div style="background-color: ${pinColor}; color: white; width: 34px; height: 34px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'}; transition: transform 0.2s;">
              💼
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
        });

        const popupContent = document.createElement('div');
        popupContent.style.minWidth = '200px';
        popupContent.style.fontFamily = 'inherit';
        popupContent.innerHTML = `
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${job.title}</div>
          <div style="font-size: 11px; font-weight: 700; color: #059669; margin-bottom: 4px;">🏢 ${job.companyName}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">📍 ${job.city || job.district || job.address || 'ශ්‍රී ලංකාව'}</div>
          ${prox ? `<div style="font-size: 11px; font-weight: 800; color: #d97706; margin-bottom: 8px;">🚀 ඔබගේ සිට ${prox.distanceStr} (${prox.isWalkable ? `මිනිත්තු ${prox.walkMinutes} ඇවිදින දුරින්` : `මිනිත්තු ${prox.tuktukMinutes} ත්‍රීවීල් දුරින්`})</div>` : ''}
          <button id="map_btn_${job.id}" style="width: 100%; background-color: #059669; color: white; font-weight: 800; font-size: 11px; padding: 6px 12px; border-radius: 8px; border: none; cursor: pointer;">
            විස්තර බලන්න & අමතන්න
          </button>
        `;

        const marker = Leaflet.marker([job.lat, job.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`map_btn_${job.id}`);
          if (btn) {
            btn.onclick = () => onSelectJob(job);
          }
        });

        markersRef.current.push(marker);
      });
    }
  }, [jobs, userLat, userLng, selectedJobId]);

  return (
    <div className="w-full h-[520px] rounded-3xl overflow-hidden border-2 border-slate-300 dark:border-[#132d20] shadow-xl relative z-10">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Map Legend Overlay */}
      <div className="absolute top-3 right-3 z-[400] bg-white/95 dark:bg-[#07190f]/95 p-3 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 text-[11px] font-bold space-y-1.5 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-600 border border-white"></span>
          <span>ඔබ සිටින ස්ථානය</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-emerald-600 border border-white"></span>
          <span>රැකියා ස්ථාන ({jobs.length})</span>
        </div>
      </div>
    </div>
  );
};
