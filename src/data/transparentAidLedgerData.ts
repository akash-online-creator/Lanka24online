import { AidRecipientCenter, AidDeliveryRecord, AidCommunityBroadcastPost, AidCategory, AidCenterType, BroadcastScope } from '../types';
import { addAppNotification } from '../utils/notificationManager';
import {
  subscribeToAidCentersFromFirestore,
  subscribeToAidDeliveriesFromFirestore,
  subscribeToAidBroadcastsFromFirestore,
} from '../lib/firebase';

export const AID_CATEGORIES: any[] = [{
id: 'dry_rations',
titleSi: 'වියළි ආහාර / සලාක',
titleEn: 'Dry Rations',
icon: '🌾',
color: 'bg-amber-500'
}, {
id: 'cooked_meals',
titleSi: 'පිසූ ආහාර',
titleEn: 'Cooked Meals',
icon: '🍲',
color: 'bg-orange-500'
}, {
id: 'drinking_water',
titleSi: 'පිරිසිදු පානීය ජලය',
titleEn: 'Clean Drinking Water',
icon: '💧',
color: 'bg-blue-500'
}, {
id: 'medicine',
titleSi: 'ඖෂධ හා ප්‍රථමාධාර',
titleEn: 'Medicines & First Aid',
icon: '💊',
color: 'bg-emerald-500'
}, {
id: 'funds',
titleSi: 'මුදල් ආධාර / අරමුදල්',
titleEn: 'Relief Funds / Cash',
icon: '💵',
color: 'bg-green-600'
}, {
id: 'clothing_blankets',
titleSi: 'ඇඳුම් හා පොරෝන',
titleEn: 'Clothes & Blankets',
icon: '👕',
color: 'bg-purple-500'
}, {
id: 'baby_care',
titleSi: 'ළදරු ආහාර හා ඩයපර්ස්',
titleEn: 'Baby Care & Milk',
icon: '🍼',
color: 'bg-pink-500'
}, {
id: 'hygiene_sanitary',
titleSi: 'සනීපාරක්ෂක ද්‍රව්‍ය',
titleEn: 'Hygiene & Sanitary',
icon: '🧼',
color: 'bg-teal-500'
}, {
id: 'shelter_equipment',
titleSi: 'කූඩාරම් හා උපකරණ',
titleEn: 'Tents & Equipment',
icon: '⛺',
color: 'bg-indigo-500'
}, {
id: 'other',
titleSi: 'වෙනත් ආධාර',
titleEn: 'Other Relief Aid',
icon: '📦',
color: 'bg-slate-500'
}];

export const AID_CENTER_TYPES: any[] = [{
id: 'camp',
titleSi: 'ආපදා සහන කඳවුර (Relief Camp)',
titleEn: 'Relief Camp',
icon: '⛺'
}, {
id: 'temple_church',
titleSi: 'පන්සල / පල්ලිය / ආගමික ස්ථානය',
titleEn: 'Religious Center',
icon: '🏛️'
}, {
id: 'school',
titleSi: 'පාසල් ගොඩනැගිල්ල',
titleEn: 'School Center',
icon: '🏫'
}, {
id: 'community_center',
titleSi: 'ප්‍රජා ශාලාව / සමිති ශාලාව',
titleEn: 'Community Center',
icon: '🏢'
}, {
id: 'hospital',
titleSi: 'රෝහල / සෞඛ්‍ය මධ්‍යස්ථානය',
titleEn: 'Hospital Hub',
icon: '🏥'
}, {
id: 'family_group',
titleSi: 'පීඩාවට පත් පවුල් එකමුතුවක්',
titleEn: 'Displaced Family Group',
icon: '👨‍👩‍👧‍👦'
}, {
id: 'distribution_hub',
titleSi: 'ප්‍රධාන බෙදාහැරීමේ මධ්‍යස්ථානය',
titleEn: 'Main Distribution Hub',
icon: '📦'
}];

export const BROADCAST_SCOPES: any[] = [{
id: 'village',
titleSi: 'ගම (Village)',
titleEn: 'Village Level',
icon: '🏡'
}, {
id: 'town',
titleSi: 'නගරය (Town)',
titleEn: 'Town Level',
icon: '🏙️'
}, {
id: 'district',
titleSi: 'දිස්ත්‍රික්කය (District)',
titleEn: 'District Level',
icon: '🗺️'
}, {
id: 'province',
titleSi: 'පළාත (Province)',
titleEn: 'Province Level',
icon: '🏛️'
}, {
id: 'country',
titleSi: 'මුළු රටම (Country)',
titleEn: 'National Level',
icon: '🇱🇰'
}];

export const generate6DigitCode = (existingCodes: any = []): string => {
let code = '';
do {
code = Math.floor(100000 + Math.random() * 900000).toString();
} while (existingCodes.includes(code));
return code;
};

export const INITIAL_AID_CENTERS: any = [];
export const INITIAL_AID_DELIVERIES: any = [];
export const INITIAL_COMMUNITY_BROADCASTS: any = [];

const AID_CENTERS_KEY = 'sahaya_transparent_aid_centers';
const AID_DELIVERIES_KEY = 'sahaya_transparent_aid_deliveries';
const AID_BROADCASTS_KEY = 'sahaya_transparent_aid_broadcasts';

const DELETED_AID_CENTER_IDS_KEY = 'sahaya_deleted_aid_center_ids';
const DELETED_AID_DELIVERY_IDS_KEY = 'sahaya_deleted_aid_delivery_ids';
const DELETED_AID_BROADCAST_IDS_KEY = 'sahaya_deleted_aid_broadcast_ids';

const DUMMY_CENTER_IDS = ['center_1', 'center_2', 'center_3'];
const DUMMY_CENTER_CODES = ['712845', '593812', '384910'];
const DUMMY_DELIVERY_IDS = ['deliv_1', 'deliv_2', 'deliv_3', 'deliv_4'];
const DUMMY_BROADCAST_IDS = ['post_1', 'post_2', 'post_3'];

const readDeletedSet = (key: string): Set<string> => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    }
  } catch {}
  return new Set();
};

const appendDeletedId = (key: string, id: string) => {
  if (!id) return;
  try {
    const set = readDeletedSet(key);
    set.add(String(id));
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
};

export const addDeletedAidCenterId = (id: string) => appendDeletedId(DELETED_AID_CENTER_IDS_KEY, id);
export const addDeletedAidDeliveryId = (id: string) => appendDeletedId(DELETED_AID_DELIVERY_IDS_KEY, id);
export const addDeletedAidBroadcastId = (id: string) => appendDeletedId(DELETED_AID_BROADCAST_IDS_KEY, id);

const emitAidLedgerUpdated = () => {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('sahaya_aid_ledger_updated'));
    } catch {}
  }
};

export const filterValidAidCenters = (centers: any[]): AidRecipientCenter[] => {
  const deleted = readDeletedSet(DELETED_AID_CENTER_IDS_KEY);
  return (Array.isArray(centers) ? centers : [])
    .filter(
      (c: any) =>
        c &&
        c.id &&
        !deleted.has(String(c.id)) &&
        !DUMMY_CENTER_IDS.includes(String(c.id)) &&
        !DUMMY_CENTER_CODES.includes(String(c.centerCode))
    )
    .sort((a: any, b: any) => Number(b?.createdAtMs || 0) - Number(a?.createdAtMs || 0));
};

export const filterValidAidDeliveries = (deliveries: any[]): AidDeliveryRecord[] => {
  const deleted = readDeletedSet(DELETED_AID_DELIVERY_IDS_KEY);
  return (Array.isArray(deliveries) ? deliveries : [])
    .filter(
      (d: any) =>
        d &&
        d.id &&
        !deleted.has(String(d.id)) &&
        !DUMMY_DELIVERY_IDS.includes(String(d.id)) &&
        !DUMMY_CENTER_CODES.includes(String(d.centerCode))
    )
    .sort((a: any, b: any) => Number(b?.submittedAtMs || b?.createdAtMs || 0) - Number(a?.submittedAtMs || a?.createdAtMs || 0));
};

export const filterValidAidBroadcasts = (broadcasts: any[]): AidCommunityBroadcastPost[] => {
  const deleted = readDeletedSet(DELETED_AID_BROADCAST_IDS_KEY);
  return (Array.isArray(broadcasts) ? broadcasts : [])
    .filter(
      (b: any) =>
        b &&
        b.id &&
        !deleted.has(String(b.id)) &&
        !DUMMY_BROADCAST_IDS.includes(String(b.id))
    )
    .sort((a: any, b: any) => Number(b?.createdAtMs || 0) - Number(a?.createdAtMs || 0));
};

// Background Firestore Cloud Sync so Aid Centers, Deliveries & Broadcasts stay warm in localStorage even before modal opens
if (typeof window !== 'undefined') {
  try {
    subscribeToAidCentersFromFirestore((remoteCenters) => {
      if (!Array.isArray(remoteCenters)) return;
      const map = new Map<string, AidRecipientCenter>();
      getStoredAidCenters().forEach((c) => {
        if (c && c.id) map.set(String(c.id), c);
      });
      remoteCenters.forEach((c: any) => {
        if (c && c.id) map.set(String(c.id), c as AidRecipientCenter);
      });
      const merged = filterValidAidCenters(Array.from(map.values()));
      try {
        localStorage.setItem(AID_CENTERS_KEY, JSON.stringify(merged));
        emitAidLedgerUpdated();
      } catch {}
    });

    subscribeToAidDeliveriesFromFirestore((remoteDeliveries) => {
      if (!Array.isArray(remoteDeliveries)) return;
      const map = new Map<string, AidDeliveryRecord>();
      getStoredAidDeliveries().forEach((d) => {
        if (d && d.id) map.set(String(d.id), d);
      });
      remoteDeliveries.forEach((d: any) => {
        if (d && d.id) map.set(String(d.id), d as AidDeliveryRecord);
      });
      const merged = filterValidAidDeliveries(Array.from(map.values()));
      try {
        localStorage.setItem(AID_DELIVERIES_KEY, JSON.stringify(merged));
        emitAidLedgerUpdated();
      } catch {}
    });

    subscribeToAidBroadcastsFromFirestore((remoteBroadcasts) => {
      if (!Array.isArray(remoteBroadcasts)) return;
      const map = new Map<string, AidCommunityBroadcastPost>();
      getStoredCommunityBroadcasts().forEach((b) => {
        if (b && b.id) map.set(String(b.id), b);
      });
      remoteBroadcasts.forEach((b: any) => {
        if (b && b.id) map.set(String(b.id), b as AidCommunityBroadcastPost);
      });
      const merged = filterValidAidBroadcasts(Array.from(map.values()));
      try {
        localStorage.setItem(AID_BROADCASTS_KEY, JSON.stringify(merged));
        emitAidLedgerUpdated();
      } catch {}
    });
  } catch {}
}

export const getStoredAidCenters = (): AidRecipientCenter[] => {
  try {
    const saved = localStorage.getItem(AID_CENTERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return filterValidAidCenters(parsed);
      }
    }
  } catch (e) {
    console.error('Error reading aid centers from localStorage:', e);
  }
  return [];
};

export const saveAidCentersToStorage = (centers: any) => {
  try {
    const cleaned = filterValidAidCenters(centers ? centers : []);
    localStorage.setItem(AID_CENTERS_KEY, JSON.stringify(cleaned));
    emitAidLedgerUpdated();
  } catch (e) {
    console.error('Error saving aid centers to localStorage:', e);
  }
};

export const getStoredAidDeliveries = (): AidDeliveryRecord[] => {
  try {
    const saved = localStorage.getItem(AID_DELIVERIES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return filterValidAidDeliveries(parsed);
      }
    }
  } catch (e) {
    console.error('Error reading aid deliveries from localStorage:', e);
  }
  return [];
};

export const saveAidDeliveriesToStorage = (deliveries: any) => {
  try {
    const cleaned = filterValidAidDeliveries(deliveries ? deliveries : []);
    localStorage.setItem(AID_DELIVERIES_KEY, JSON.stringify(cleaned));
    emitAidLedgerUpdated();
  } catch (e) {
    console.error('Error saving aid deliveries to localStorage:', e);
  }
};

export const getStoredCommunityBroadcasts = (): AidCommunityBroadcastPost[] => {
  try {
    const saved = localStorage.getItem(AID_BROADCASTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return filterValidAidBroadcasts(parsed);
      }
    }
  } catch (e) {
    console.error('Error reading broadcasts from localStorage:', e);
  }
  return [];
};

export const saveCommunityBroadcastsToStorage = (broadcasts: any) => {
  try {
    const cleaned = filterValidAidBroadcasts(broadcasts ? broadcasts : []);
    localStorage.setItem(AID_BROADCASTS_KEY, JSON.stringify(cleaned));
    emitAidLedgerUpdated();
  } catch (e) {
    console.error('Error saving broadcasts to localStorage:', e);
  }
};

export const findAidCenterByCode = (code: string): any => {
  const cleanCode = code.trim().replace(/\D/g, '');
  const centers = getStoredAidCenters();
  return centers.find(c => c.centerCode === cleanCode);
};

export const notifyRecipientOfLoggedAid = (record: any, center: any) => {
  addAppNotification({
    type: 'aid_ledger',
    title: '📦 නව ආධාර ලැබීමක් සටහන් විය! (අංක ' + center.centerCode + ')',
    message: record.donorName + ' විසින් ' + record.quantity + ' (' + record.categoryTitleSi + ') ඔබගේ මධ්‍යස්ථානය වෙත ලබාදුන් බව සටහන් කර ඇත. කරුණාකර තහවුරු කරන්න.',
    locationName: center.town,
    badgeText: 'ආධාර තහවුරු',
    targetModal: 'aid_ledger'
  });
};
