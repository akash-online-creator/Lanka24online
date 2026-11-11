// --- accommodationStorage.ts (PART 1) ---
// ⚠️ මෙහි කිසිදු localStorage කේතයක් අඩංගු නොවේ. සියල්ල Firebase Database එකට ගැළපෙන සේ සකසා ඇත.

import { AccommodationListing, AccommodationFilterOptions } from '../types/accommodation';  
import { db } from '../lib/firebase'; 
import { collection, addDoc, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
  
// දුර ගණනය කිරීම (Haversine Formula)  
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
  
  const R = 6371; // km  
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
  
// ඇවිදින සහ වාහන ගමන් වේලාවන් ගණනය කිරීම  
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
    tukText: `🛺 වාහනයෙන් විනාඩි ${tukMinutes}`,  
    isTuk15: distKm <= 5.5,  
    isTuk30: distKm <= 11.0,  
  };  
};
// --- accommodationStorage.ts (PART 2) ---

// Database එකෙන් සියලුම නවාතැන් දැන්වීම් ලබා ගැනීම (Fetch from Firestore)
export const getStoredAccommodations = async (): Promise<AccommodationListing[]> => {  
  if (typeof window === 'undefined') return [];  
  try {  
    // 'accommodations' කියන Firestore collection එකෙන් දත්ත ලබා ගනී
    const q = query(collection(db, 'accommodations'), orderBy('createdAtMs', 'desc'));
    const querySnapshot = await getDocs(q);
    const accommodations: AccommodationListing[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      accommodations.push({ id: docSnap.id, ...data } as AccommodationListing);
    });
    
    return accommodations;
  } catch (e) {  
    console.error('Firestore error reading accommodations:', e);  
    return [];  
  }  
};  
  
// අලුත් නවාතැන් දැන්වීමක් කෙලින්ම Database එකට Save කිරීම (Save to Firestore)
export const saveAccommodationListing = async (listing: Omit<AccommodationListing, 'id'>): Promise<AccommodationListing | null> => {  
  try {  
    // ⚠️ localStorage කේතය සම්පූර්ණයෙන්ම ඉවත් කර ඇත.
    // ඒ වෙනුවට Firebase 'addDoc' භාවිතා කර දත්ත කෙලින්ම Cloud එකට යවයි.
    const docRef = await addDoc(collection(db, 'accommodations'), {
      ...listing,
      createdAtMs: Date.now() 
    });

    const savedListing = { id: docRef.id, ...listing } as AccommodationListing;
    
    if (typeof window !== 'undefined') {
      // දත්ත අප්ඩේට් වූ බව ඇප් එකට දැනුම් දීම
      window.dispatchEvent(new CustomEvent('sahaya_accommodations_updated'));
    }

    console.log("නවාතැන් දැන්වීම සාර්ථකව ගබඩා විය!");
    return savedListing;
  } catch (e) {  
    console.error('Firestore error saving accommodation:', e);  
    return null;
  }  
};
// --- accommodationStorage.ts (PART 3) ---

// සෙවුම්, පෙරහන් (Filters) සහ දුර අනුව නවාතැන් පෙළගැස්වීම  
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
      // 1. Category Filter (බෝඩිම්, ඇනෙක්ස්, කාමර ආදී වශයෙන්)
      if (filter.category !== 'all' && item.category !== filter.category) {  
        return false;  
      }  
  
      // 2. Search Query (වචන අනුව සෙවීම)
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
          ...(item.facilities || []),  
        ]  
          .join(' ')  
          .toLowerCase();  
  
        if (!searchPool.includes(q)) {  
          return false;  
        }  
      }  
  
      // 3. Distance Filter (දුර අනුව පෙරීම)
      const dist = item.distanceKm ?? 10;  
      if (filter.distanceFilter === 'walk_15' && dist > 1.2) return false;  
      if (filter.distanceFilter === 'walk_30' && dist > 2.5) return false;  
      if (filter.distanceFilter === 'tuk_15' && dist > 5.5) return false;  
      if (filter.distanceFilter === 'tuk_30' && dist > 11.0) return false;  
      if (filter.distanceFilter === 'custom' && filter.maxDistanceKm && dist > filter.maxDistanceKm) return false;  
  
      // 4. Price Filter (මිල ගණන් අනුව)
      if (filter.minPrice && filter.minPrice > 0 && item.price < filter.minPrice) return false;  
      if (filter.maxPrice && filter.maxPrice > 0 && item.price > filter.maxPrice) return false;  
  
      // 5. Facilities (පහසුකම් අනුව)
      if (filter.selectedFacilities && filter.selectedFacilities.length > 0) {  
        const itemFacilitiesStr = (item.facilities || []).join(' ').toLowerCase();  
        const hasAllFacilities = filter.selectedFacilities.every((fac) =>  
          itemFacilitiesStr.includes(fac.toLowerCase())  
        );  
        if (!hasAllFacilities) return false;  
      }  
  
      // 6. Target Audience (ගැහැණු/පිරිමි පමණක් ද යන්න)
      if (filter.targetAudience && filter.targetAudience !== 'all') {  
        if (item.category === 'boarding' && item.boardingDetails) {  
          if (  
            item.boardingDetails.preferredGender !== 'any' &&  
            filter.targetAudience !== item.boardingDetails.preferredGender  
          ) {  
            return false;  
          }  
        }  
      }  
      
      return true;  
    });  
};
