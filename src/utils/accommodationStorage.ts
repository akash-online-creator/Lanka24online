import { AccommodationListing, AccommodationFilterOptions } from '../types/accommodation';
import { initialAccommodations } from '../data/mockAccommodations';

const STORAGE_KEY = 'sahaya_accommodations_data_v1';

export const getStoredAccommodations = (): AccommodationListing[] => {
  if (typeof window === 'undefined') return initialAccommodations;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAccommodations));
      return initialAccommodations;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialAccommodations;
  } catch (e) {
    console.warn('LocalStorage error reading accommodations:', e);
    return initialAccommodations;
  }
};

export const saveAccommodationListing = (listing: AccommodationListing): AccommodationListing[] => {
  const current = getStoredAccommodations();
  const updated = [listing, ...current];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('LocalStorage error saving accommodation:', e);
    }
  }
  return updated;
};

export const calculateDistanceKm = (
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number
): number => {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number'
  ) {
    return 15;
  }

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d < 0.1 ? 0.1 : Math.round(d * 10) / 10;
};

export interface TravelEstimate {
  distanceText: string;
  walkingMinutes: number;
  walkingText: string;
  isWalking15: boolean;
  isWalking30: boolean;
  tukMinutes: number;
  tukText: string;
  isTuk15: boolean;
  isTuk30: boolean;
}

export const getTravelEstimate = (distKm: number): TravelEstimate => {
  const walkingMinutes = Math.max(1, Math.round(distKm * 13.5));
  const tukMinutes = Math.max(1, Math.round(distKm * 2.5));
  const distanceText =
    distKm < 1 ? `මීටර් ${Math.round(distKm * 1000)}` : `${distKm.toFixed(1)} km`;

  return {
    distanceText,
    walkingMinutes,
    walkingText: `🚶 ඇවිදින දුරින් විනාඩි ${walkingMinutes}`,
    isWalking15: distKm <= 1.2,
    isWalking30: distKm <= 2.5,
    tukMinutes,
    tukText: `🛺 ත්‍රීවීල් එකෙන් විනාඩි ${tukMinutes}`,
    isTuk15: distKm <= 5.5,
    isTuk30: distKm <= 11.0,
  };
};

export const filterAccommodations = (
  items: AccommodationListing[],
  filter: AccommodationFilterOptions,
  userLat?: number,
  userLng?: number
): AccommodationListing[] => {
  return items
    .map((item) => {
      const dist =
        typeof userLat === 'number' && typeof userLng === 'number'
          ? calculateDistanceKm(userLat, userLng, item.location.lat, item.location.lng)
          : (item.distanceKm ?? 10);
      return { ...item, distanceKm: dist };
    })
    .filter((item) => {
      if (filter.category !== 'all' && item.category !== filter.category) {
        return false;
      }

      if (filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase().trim();
        const searchPool = [
          item.title,
          item.description,
          item.location.city,
          item.location.address || '',
          item.location.nearestTown,
          item.location.nearestCampusOrSchool || '',
          item.location.district || '',
          ...item.facilities,
        ]
          .join(' ')
          .toLowerCase();

        if (!searchPool.includes(q)) {
          return false;
        }
      }

      const dist = item.distanceKm ?? 10;
      if (filter.distanceFilter === 'walk_15' && dist > 1.2) return false;
      if (filter.distanceFilter === 'walk_30' && dist > 2.5) return false;
      if (filter.distanceFilter === 'tuk_15' && dist > 5.5) return false;
      if (filter.distanceFilter === 'tuk_30' && dist > 11.0) return false;
      if (filter.distanceFilter === 'custom' && dist > filter.maxDistanceKm) return false;

      if (filter.minPrice > 0 && item.price < filter.minPrice) return false;
      if (filter.maxPrice > 0 && item.price > filter.maxPrice) return false;

      if (filter.selectedFacilities.length > 0) {
        const itemFacilitiesStr = item.facilities.join(' ').toLowerCase();
        const hasAllFacilities = filter.selectedFacilities.every((fac) =>
          itemFacilitiesStr.includes(fac.toLowerCase())
        );
        if (!hasAllFacilities) return false;
      }

      if (filter.targetAudience && filter.targetAudience !== 'all') {
        if (item.category === 'boarding' && item.boardingDetails) {
          if (
            item.boardingDetails.targetAudience !== 'any' &&
            item.boardingDetails.targetAudience !== filter.targetAudience
          ) {
            return false;
          }
        }
      }

      return true;
    })
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
};
