import { BloodDonationRequest, VolunteerDonor, DisasterReliefItem } from '../types';
import { 
  filterNonDeletedBloodRequests, 
  filterNonDeletedDisasterItems, 
  filterNonDeletedDonors 
} from '../utils/deletedPostsManager';

// 🩸 හදිසි ලේ අවශ්‍යතා ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල දත්ත ඉවත් කර ඇත)
export const INITIAL_BLOOD_REQUESTS: BloodDonationRequest[] = [];

// 💗 ස්වේච්ඡා ලේ පරිත්‍යාගශීලීන් ලැයිස්තුව ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල දත්ත ඉවත් කර ඇත)
export const INITIAL_VOLUNTEER_DONORS: VolunteerDonor[] = [];

// 📦 ආපදා සහන අවශ්‍යතා ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල දත්ත ඉවත් කර ඇත)
export const INITIAL_DISASTER_RELIEF_ITEMS: DisasterReliefItem[] = [];

export const getStoredBloodRequests = (): BloodDonationRequest[] => {
  const saved = localStorage.getItem('sahaya_blood_requests');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return filterNonDeletedBloodRequests(parsed);
      }
    } catch (e) { /* ignore */ }
  }
  return [];
};

export const saveBloodRequestsToStorage = (requests: BloodDonationRequest[]) => {
  localStorage.setItem('sahaya_blood_requests', JSON.stringify(filterNonDeletedBloodRequests(requests)));
};

export const getStoredVolunteerDonors = (): VolunteerDonor[] => {
  const saved = localStorage.getItem('sahaya_volunteer_donors');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return filterNonDeletedDonors(parsed);
      }
    } catch (e) { /* ignore */ }
  }
  return [];
};

export const saveVolunteerDonorsToStorage = (donors: VolunteerDonor[]) => {
  localStorage.setItem('sahaya_volunteer_donors', JSON.stringify(filterNonDeletedDonors(donors)));
};

export const getStoredDisasterReliefItems = (): DisasterReliefItem[] => {
  const saved = localStorage.getItem('sahaya_disaster_relief');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return filterNonDeletedDisasterItems(parsed);
      }
    } catch (e) { /* ignore */ }
  }
  return [];
};

export const saveDisasterReliefItemsToStorage = (items: DisasterReliefItem[]) => {
  localStorage.setItem('sahaya_disaster_relief', JSON.stringify(filterNonDeletedDisasterItems(items)));
};

export const getStoredSupportedBloodIds = (): string[] => {
  try {
    const saved = localStorage.getItem('sahaya_user_supported_blood_ids');
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return [];
};

export const saveSupportedBloodIdsToStorage = (ids: string[]) => {
  localStorage.setItem('sahaya_user_supported_blood_ids', JSON.stringify(ids));
};

export const getStoredSupportedDisasterIds = (): string[] => {
  try {
    const saved = localStorage.getItem('sahaya_user_supported_disaster_ids');
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return [];
};

export const saveSupportedDisasterIdsToStorage = (ids: string[]) => {
  localStorage.setItem('sahaya_user_supported_disaster_ids', JSON.stringify(ids));
};

