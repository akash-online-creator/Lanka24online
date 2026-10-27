import { BloodDonationRequest, VolunteerDonor, DisasterReliefItem } from '../types';
import { 
  filterNonDeletedBloodRequests, 
  filterNonDeletedDisasterItems, 
  filterNonDeletedDonors 
} from '../utils/deletedPostsManager';
import {
  subscribeToBloodRequestsFromFirestore,
  subscribeToVolunteerDonorsFromFirestore,
  subscribeToDisasterReliefFromFirestore,
  saveBloodRequestToFirestore,
  saveVolunteerDonorToFirestore,
  saveDisasterReliefToFirestore,
} from '../lib/firebase';

// 🩸 හදිසි ලේ අවශ්‍යතා ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල දත්ත ඉවත් කර ඇත)
export const INITIAL_BLOOD_REQUESTS: BloodDonationRequest[] = [];

// 💗 ස්වේච්ඡා ලේ පරිත්‍යාගශීලීන් ලැයිස්තුව ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල දත්ත ඉවත් කර ඇත)
export const INITIAL_VOLUNTEER_DONORS: VolunteerDonor[] = [];

// 📦 ආපදා සහන අවශ්‍යතා ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල දත්ත ඉවත් කර ඇත)
export const INITIAL_DISASTER_RELIEF_ITEMS: DisasterReliefItem[] = [];

// Real-time Firestore Cloud Sync Listeners
if (typeof window !== 'undefined') {
  try {
    subscribeToBloodRequestsFromFirestore((remoteReqs) => {
      if (!Array.isArray(remoteReqs)) return;
      const map = new Map<string, BloodDonationRequest>();
      getStoredBloodRequests().forEach((r) => {
        if (r && r.id && !r.id.startsWith('bld_')) map.set(r.id, r);
      });
      remoteReqs.forEach((r: any) => {
        if (r && r.id && !String(r.id).startsWith('bld_')) map.set(r.id, r as BloodDonationRequest);
      });
      const merged = filterNonDeletedBloodRequests(Array.from(map.values()));
      try {
        localStorage.setItem('sahaya_blood_requests', JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('sahaya_blood_disaster_updated'));
      } catch {}
    });

    subscribeToVolunteerDonorsFromFirestore((remoteDonors) => {
      if (!Array.isArray(remoteDonors)) return;
      const map = new Map<string, VolunteerDonor>();
      getStoredVolunteerDonors().forEach((d) => {
        if (d && d.id && !d.id.startsWith('donor_')) map.set(d.id, d);
      });
      remoteDonors.forEach((d: any) => {
        if (d && d.id && !String(d.id).startsWith('donor_')) map.set(d.id, d as VolunteerDonor);
      });
      const merged = filterNonDeletedDonors(Array.from(map.values()));
      try {
        localStorage.setItem('sahaya_volunteer_donors', JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('sahaya_blood_disaster_updated'));
      } catch {}
    });

    subscribeToDisasterReliefFromFirestore((remoteRelief) => {
      if (!Array.isArray(remoteRelief)) return;
      const map = new Map<string, DisasterReliefItem>();
      getStoredDisasterReliefItems().forEach((r) => {
        if (r && r.id && !r.id.startsWith('rel_')) map.set(r.id, r);
      });
      remoteRelief.forEach((r: any) => {
        if (r && r.id && !String(r.id).startsWith('rel_')) map.set(r.id, r as DisasterReliefItem);
      });
      const merged = filterNonDeletedDisasterItems(Array.from(map.values()));
      try {
        localStorage.setItem('sahaya_disaster_relief', JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('sahaya_blood_disaster_updated'));
      } catch {}
    });
  } catch {}
}

export const getStoredBloodRequests = (): BloodDonationRequest[] => {
  const saved = localStorage.getItem('sahaya_blood_requests');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return filterNonDeletedBloodRequests(
          parsed.filter((b: BloodDonationRequest) => b && !b.id?.startsWith('bld_'))
        );
      }
    } catch (e) { /* ignore */ }
  }
  return [];
};

export const saveBloodRequestsToStorage = (requests: BloodDonationRequest[]) => {
  const cleaned = filterNonDeletedBloodRequests(requests);
  localStorage.setItem('sahaya_blood_requests', JSON.stringify(cleaned));
  cleaned.forEach((req) => {
    saveBloodRequestToFirestore(req).catch(() => {});
  });
};

export const getStoredVolunteerDonors = (): VolunteerDonor[] => {
  const saved = localStorage.getItem('sahaya_volunteer_donors');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return filterNonDeletedDonors(
          parsed.filter((d: VolunteerDonor) => d && !d.id?.startsWith('donor_'))
        );
      }
    } catch (e) { /* ignore */ }
  }
  return [];
};

export const saveVolunteerDonorsToStorage = (donors: VolunteerDonor[]) => {
  const cleaned = filterNonDeletedDonors(donors);
  localStorage.setItem('sahaya_volunteer_donors', JSON.stringify(cleaned));
  cleaned.forEach((donor) => {
    saveVolunteerDonorToFirestore(donor).catch(() => {});
  });
};

export const getStoredDisasterReliefItems = (): DisasterReliefItem[] => {
  const saved = localStorage.getItem('sahaya_disaster_relief');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return filterNonDeletedDisasterItems(
          parsed.filter((r: DisasterReliefItem) => r && !r.id?.startsWith('rel_'))
        );
      }
    } catch (e) { /* ignore */ }
  }
  return [];
};

export const saveDisasterReliefItemsToStorage = (items: DisasterReliefItem[]) => {
  const cleaned = filterNonDeletedDisasterItems(items);
  localStorage.setItem('sahaya_disaster_relief', JSON.stringify(cleaned));
  cleaned.forEach((item) => {
    saveDisasterReliefToFirestore(item).catch(() => {});
  });
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
