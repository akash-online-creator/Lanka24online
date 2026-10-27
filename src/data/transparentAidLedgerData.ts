import { AidRecipientCenter, AidDeliveryRecord, AidCommunityBroadcastPost, AidCategory, AidCenterType, BroadcastScope } from '../types';
import { addAppNotification } from '../utils/notificationManager';

export const AID_CATEGORIES: any = [{
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

export const AID_CENTER_TYPES: any = [{
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

export const BROADCAST_SCOPES: any = [{
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

const DUMMY_CENTER_IDS = ['center_1', 'center_2', 'center_3'];
const DUMMY_CENTER_CODES = ['712845', '593812', '384910'];
const DUMMY_DELIVERY_IDS = ['deliv_1', 'deliv_2', 'deliv_3', 'deliv_4'];
const DUMMY_BROADCAST_IDS = ['post_1', 'post_2', 'post_3'];

export const getStoredAidCenters = (): AidRecipientCenter[] => {
try {
const saved = localStorage.getItem(AID_CENTERS_KEY);
if (saved) {
const parsed = JSON.parse(saved);
if (Array.isArray(parsed)) {
return parsed.filter((c: any) => c && !DUMMY_CENTER_IDS.includes(c.id) && !DUMMY_CENTER_CODES.includes(c.centerCode));
}
}
} catch (e) {
console.error('Error reading aid centers from localStorage:', e);
}
return [];
};

export const saveAidCentersToStorage = (centers: any) => {
try {
const cleaned = (centers ? centers : []).filter((c: any) => c && !DUMMY_CENTER_IDS.includes(c.id) && !DUMMY_CENTER_CODES.includes(c.centerCode));
localStorage.setItem(AID_CENTERS_KEY, JSON.stringify(cleaned));
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
return parsed.filter((d: any) => d && !DUMMY_DELIVERY_IDS.includes(d.id) && !DUMMY_CENTER_CODES.includes(d.centerCode));
}
}
} catch (e) {
console.error('Error reading aid deliveries from localStorage:', e);
}
return [];
};

export const saveAidDeliveriesToStorage = (deliveries: any) => {
try {
const cleaned = (deliveries ? deliveries : []).filter((d: any) => d && !DUMMY_DELIVERY_IDS.includes(d.id) && !DUMMY_CENTER_CODES.includes(d.centerCode));
localStorage.setItem(AID_DELIVERIES_KEY, JSON.stringify(cleaned));
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
return parsed.filter((b: any) => b && !DUMMY_BROADCAST_IDS.includes(b.id));
}
}
} catch (e) {
console.error('Error reading broadcasts from localStorage:', e);
}
return [];
};

export const saveCommunityBroadcastsToStorage = (broadcasts: any) => {
try {
const cleaned = (broadcasts ? broadcasts : []).filter((b: any) => b && !DUMMY_BROADCAST_IDS.includes(b.id));
localStorage.setItem(AID_BROADCASTS_KEY, JSON.stringify(cleaned));
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
type: 'general',
title: '📦 නව ආධාර ලැබීමක් සටහන් විය! (අංක ' + center.centerCode + ')',
message: record.donorName + ' විසින් ' + record.quantity + ' (' + record.categoryTitleSi + ') ඔබගේ මධ්‍යස්ථානය වෙත ලබාදුන් බව සටහන් කර ඇත. කරුණාකර තහවුරු කරන්න.',
locationName: center.town,
badgeText: 'ආධාර තහවුරු',
targetModal: 'blood'
});
};
