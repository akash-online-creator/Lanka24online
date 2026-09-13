import { BloodDonationRequest, VolunteerDonor, DisasterReliefItem } from '../types';
import { 
  filterNonDeletedBloodRequests, 
  filterNonDeletedDisasterItems, 
  filterNonDeletedDonors 
} from '../utils/deletedPostsManager';

export const INITIAL_BLOOD_REQUESTS: BloodDonationRequest[] = [
  {
    id: 'bld_1',
    postCode: '#BLD-101',
    patientName: 'සුනිල් ප්‍රනාන්දු',
    bloodGroup: 'O+',
    unitsNeeded: 2,
    hospitalName: 'රාගම ශික්ෂණ රෝහල (Ragama)',
    district: 'ගම්පහ',
    urgency: 'urgent',
    neededDate: 'අද දින (Today)',
    contactName: 'නදීෂා ප්‍රනාන්දු',
    contactPhone: '0771234567',
    additionalNotes: 'හදිසි ශල්‍යකර්මයක් සඳහා කඩිනමින් O+ ලේ පයින්ට් 2ක් අවශ්‍ය වේ.',
    status: 'active',
    createdAt: 'මීට පැය 2කට පෙර',
    createdAtMs: Date.now() - 2 * 60 * 60 * 1000,
    supportedCount: 4,
  },
  {
    id: 'bld_2',
    postCode: '#BLD-102',
    patientName: 'කමලා විජේසිංහ',
    bloodGroup: 'B-',
    unitsNeeded: 1,
    hospitalName: 'කොළඹ ජාතික රෝහල (NHSL)',
    district: 'කොළඹ',
    urgency: 'urgent',
    neededDate: 'හෙට උදෑසන (Tomorrow)',
    contactName: 'දිනේෂ් විජේසිංහ',
    contactPhone: '0719876543',
    additionalNotes: 'දුර්ලභ B- ලේ අවශ්‍යතාවයකි.',
    status: 'active',
    createdAt: 'මීට පැය 5කට පෙර',
    createdAtMs: Date.now() - 5 * 60 * 60 * 1000,
    supportedCount: 2,
  },
  {
    id: 'bld_3',
    postCode: '#BLD-103',
    patientName: 'රසිකා පෙරේරා',
    bloodGroup: 'A+',
    unitsNeeded: 3,
    hospitalName: 'මහනුවර ජාතික රෝහල',
    district: 'මහනුවර',
    urgency: 'within_24h',
    neededDate: 'හෙට දින',
    contactName: 'සමන් පෙරේරා',
    contactPhone: '0755551234',
    additionalNotes: 'ප්ලේට්ලට් (Platelets) සඳහා A+ පරිත්‍යාගශීලීන් අවශ්‍යයි.',
    status: 'active',
    createdAt: 'ඊයේ',
    createdAtMs: Date.now() - 24 * 60 * 60 * 1000,
    supportedCount: 5,
  },
];

export const INITIAL_VOLUNTEER_DONORS: VolunteerDonor[] = [
  {
    id: 'donor_1',
    name: 'කසුන් ජයලත්',
    phone: '0772223344',
    bloodGroup: 'O+',
    district: 'ගම්පහ',
    lastDonatedDate: '2026-03-10',
    isAvailable: true,
    registeredAt: '2026-06-01',
  },
  {
    id: 'donor_2',
    name: 'මහේෂ් කුමාර',
    phone: '0714445566',
    bloodGroup: 'A+',
    district: 'කොළඹ',
    lastDonatedDate: '2026-02-15',
    isAvailable: true,
    registeredAt: '2026-05-20',
  },
  {
    id: 'donor_3',
    name: 'ඉරෝෂිණී සිල්වා',
    phone: '0768889900',
    bloodGroup: 'AB+',
    district: 'කළුතර',
    lastDonatedDate: '2026-04-05',
    isAvailable: true,
    registeredAt: '2026-07-10',
  },
  {
    id: 'donor_4',
    name: 'චතුරංග බණ්ඩාර',
    phone: '0781112233',
    bloodGroup: 'B+',
    district: 'මහනුවර',
    lastDonatedDate: '2026-01-20',
    isAvailable: true,
    registeredAt: '2026-04-12',
  },
];

export const INITIAL_DISASTER_RELIEF_ITEMS: DisasterReliefItem[] = [
  {
    id: 'rel_1',
    title: 'කැලණි ගංවතුරින් විපතට පත්වූවන්ට පිසූ ආහාර',
    type: 'meals',
    locationName: 'කඩවත / කැළණිය ප්‍රදේශය',
    district: 'ගම්පහ',
    description: 'ගංවතුර අවදානම් සහිත ප්‍රදේශවල පවුල් 50ක් සඳහා උදෑසන හා දිවා ආහාර පැකට් 150ක් අවශ්‍ය වේ.',
    urgency: 'high',
    contactPerson: 'කැලණිය ප්‍රජා සහන කමිටුව',
    contactPhone: '0112911222',
    status: 'collecting',
    targetQuantity: 'ආහාර පැකට් 150',
    collectedQuantity: 'ආහාර පැකට් 90',
    createdAt: 'මීට පැය 3කට පෙර',
    createdAtMs: Date.now() - 3 * 60 * 60 * 1000,
    supportedCount: 6,
  },
  {
    id: 'rel_2',
    title: 'වියළි සලාක මලු හා පානීය ජල බෝතල්',
    type: 'dry_rations',
    locationName: 'බුලත්සිංහල නායයෑම් ආපදා කඳවුර',
    district: 'කළුතර',
    description: 'සහල්, පරිප්පු, සීනි, ටින් මාළු, බිස්කට් සහ ලීටර් 5 ජල බෝතල් කඩිනමින් අවශ්‍යයි.',
    urgency: 'high',
    contactPerson: 'සුසන්ත පෙරේරා (ග්‍රාම නිලධාරී)',
    contactPhone: '0342244555',
    status: 'needed',
    targetQuantity: 'සලාක මලු 80',
    collectedQuantity: 'සලාක මලු 35',
    createdAt: 'ඊයේ',
    createdAtMs: Date.now() - 20 * 60 * 60 * 1000,
    supportedCount: 3,
  },
  {
    id: 'rel_3',
    title: 'ළමා ඇඳුම් හා උණුසුම් රෙදිපිළි (Blankets)',
    type: 'clothing_blankets',
    locationName: 'කොත්මලේ තාවකාලික කඳවුර',
    district: 'නුවරඑළිය',
    description: 'ශීතලෙන් පීඩා විඳින කුඩා දරුවන් 40ක් සඳහා උණුසුම් ඇඳුම් සහ පොරෝන.',
    urgency: 'medium',
    contactPerson: 'සමිඳු වීරක්කොඩි',
    contactPhone: '0522233445',
    status: 'collecting',
    targetQuantity: 'පොරෝන 60',
    collectedQuantity: 'පොරෝන 45',
    createdAt: 'දින 2කට පෙර',
    createdAtMs: Date.now() - 48 * 60 * 60 * 1000,
    supportedCount: 4,
  },
];

export const getStoredBloodRequests = (): BloodDonationRequest[] => {
  const saved = localStorage.getItem('sahaya_blood_requests');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return filterNonDeletedBloodRequests(parsed);
    } catch (e) { /* ignore */ }
  }
  return filterNonDeletedBloodRequests(INITIAL_BLOOD_REQUESTS);
};

export const saveBloodRequestsToStorage = (requests: BloodDonationRequest[]) => {
  localStorage.setItem('sahaya_blood_requests', JSON.stringify(requests));
};

export const getStoredVolunteerDonors = (): VolunteerDonor[] => {
  const saved = localStorage.getItem('sahaya_volunteer_donors');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return filterNonDeletedDonors(parsed);
    } catch (e) { /* ignore */ }
  }
  return filterNonDeletedDonors(INITIAL_VOLUNTEER_DONORS);
};

export const saveVolunteerDonorsToStorage = (donors: VolunteerDonor[]) => {
  localStorage.setItem('sahaya_volunteer_donors', JSON.stringify(donors));
};

export const getStoredDisasterReliefItems = (): DisasterReliefItem[] => {
  const saved = localStorage.getItem('sahaya_disaster_relief');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return filterNonDeletedDisasterItems(parsed);
    } catch (e) { /* ignore */ }
  }
  return filterNonDeletedDisasterItems(INITIAL_DISASTER_RELIEF_ITEMS);
};

export const saveDisasterReliefItemsToStorage = (items: DisasterReliefItem[]) => {
  localStorage.setItem('sahaya_disaster_relief', JSON.stringify(items));
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
