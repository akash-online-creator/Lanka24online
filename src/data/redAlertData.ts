import { RedAlertDisasterType } from '../types';

export interface DisasterTypeConfig {
  id: RedAlertDisasterType;
  titleSi: string;
  titleEn: string;
  titleTa: string;
  icon: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
}

export const DISASTER_TYPES: DisasterTypeConfig[] = [
  {
    id: 'fire',
    titleSi: 'ගින්නක් (Fire)',
    titleEn: 'Fire Outbreak',
    titleTa: 'தீ விபத்து',
    icon: '🔥',
    colorClass: 'text-orange-600 dark:text-orange-400',
    borderClass: 'border-orange-500',
    bgClass: 'bg-orange-500/15',
  },
  {
    id: 'flood',
    titleSi: 'ජල ගැල්මක් (Flood)',
    titleEn: 'Flood / Flash Flood',
    titleTa: 'வெள்ளம்',
    icon: '🌊',
    colorClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-500',
    bgClass: 'bg-blue-500/15',
  },
  {
    id: 'landslide',
    titleSi: 'නායයාමක් (Landslide)',
    titleEn: 'Landslide',
    titleTa: 'நிலச்சரிவு',
    icon: '🪨',
    colorClass: 'text-amber-700 dark:text-amber-500',
    borderClass: 'border-amber-600',
    bgClass: 'bg-amber-600/15',
  },
  {
    id: 'mountain_collapse',
    titleSi: 'කඳු / පස් කඩා වැටීමක් (Rockfall / Collapse)',
    titleEn: 'Mountain / Rock Collapse',
    titleTa: 'மலை சரிவு',
    icon: '⛰️',
    colorClass: 'text-stone-700 dark:text-stone-400',
    borderClass: 'border-stone-600',
    bgClass: 'bg-stone-600/15',
  },
  {
    id: 'sinkhole',
    titleSi: 'ගිලාබැසීමක් (Sinkhole / Subsidence)',
    titleEn: 'Ground Subsidence / Sinkhole',
    titleTa: 'நிலம் உள்வாங்கல்',
    icon: '🕳️',
    colorClass: 'text-zinc-700 dark:text-zinc-400',
    borderClass: 'border-zinc-600',
    bgClass: 'bg-zinc-600/15',
  },
  {
    id: 'gale_wind',
    titleSi: 'තද සුළං (Severe Wind / Gale)',
    titleEn: 'Gale / Severe Storm Wind',
    titleTa: 'கடும் காற்று',
    icon: '🌪️',
    colorClass: 'text-teal-600 dark:text-teal-400',
    borderClass: 'border-teal-500',
    bgClass: 'bg-teal-500/15',
  },
  {
    id: 'tsunami',
    titleSi: 'සුනාමි (Tsunami Alert)',
    titleEn: 'Tsunami Wave Threat',
    titleTa: 'சுனாமி',
    icon: '🌊⚠️',
    colorClass: 'text-cyan-700 dark:text-cyan-400',
    borderClass: 'border-cyan-600',
    bgClass: 'bg-cyan-600/15',
  },
  {
    id: 'earthquake',
    titleSi: 'භූමි කම්පාවක් (Earthquake)',
    titleEn: 'Earthquake Tremor',
    titleTa: 'நிலநடுக்கம்',
    icon: '🌋',
    colorClass: 'text-rose-700 dark:text-rose-400',
    borderClass: 'border-rose-600',
    bgClass: 'bg-rose-600/15',
  },
  {
    id: 'other',
    titleSi: 'වෙනත් ආපදාවක් (Other Disaster)',
    titleEn: 'Other Emergency Disaster',
    titleTa: 'மற்றொரு பேரழிவு',
    icon: '🚨',
    colorClass: 'text-red-600 dark:text-red-400',
    borderClass: 'border-red-500',
    bgClass: 'bg-red-500/15',
  },
];

export function getDisasterConfig(type: RedAlertDisasterType): DisasterTypeConfig {
  return DISASTER_TYPES.find((d) => d.id === type) || DISASTER_TYPES[DISASTER_TYPES.length - 1];
}

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in kilometers.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

