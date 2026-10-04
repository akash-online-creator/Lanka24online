import { 
  AidRecipientCenter, 
  AidDeliveryRecord, 
  AidCommunityBroadcastPost, 
  AidCategory, 
  AidCenterType,
  BroadcastScope 
} from '../types';
import { addAppNotification } from '../utils/notificationManager';

export const AID_CATEGORIES: { id: AidCategory; titleSi: string; titleEn: string; icon: string; color: string }[] = [
  { id: 'dry_rations', titleSi: 'වියළි ආහාර / සලාක', titleEn: 'Dry Rations', icon: '🌾', color: 'bg-amber-500' },
  { id: 'cooked_meals', titleSi: 'පිසූ ආහාර', titleEn: 'Cooked Meals', icon: '🍲', color: 'bg-orange-500' },
  { id: 'drinking_water', titleSi: 'පිරිසිදු පානීය ජලය', titleEn: 'Clean Drinking Water', icon: '💧', color: 'bg-blue-500' },
  { id: 'medicine', titleSi: 'ඖෂධ හා ප්‍රථමාධාර', titleEn: 'Medicines & First Aid', icon: '💊', color: 'bg-emerald-500' },
  { id: 'funds', titleSi: 'මුදල් ආධාර / අරමුදල්', titleEn: 'Relief Funds / Cash', icon: '💵', color: 'bg-green-600' },
  { id: 'clothing_blankets', titleSi: 'ඇඳුම් හා පොරෝන', titleEn: 'Clothes & Blankets', icon: '👕', color: 'bg-purple-500' },
  { id: 'baby_care', titleSi: 'ළදරු ආහාර හා ඩයපර්ස්', titleEn: 'Baby Care & Milk', icon: '🍼', color: 'bg-pink-500' },
  { id: 'hygiene_sanitary', titleSi: 'සනීපාරක්ෂක ද්‍රව්‍ය', titleEn: 'Hygiene & Sanitary', icon: '🧼', color: 'bg-teal-500' },
  { id: 'shelter_equipment', titleSi: 'කූඩාරම් හා උපකරණ', titleEn: 'Tents & Equipment', icon: '⛺', color: 'bg-indigo-500' },
  { id: 'other', titleSi: 'වෙනත් ආධාර', titleEn: 'Other Relief Aid', icon: '📦', color: 'bg-slate-500' },
];

export const AID_CENTER_TYPES: { id: AidCenterType; titleSi: string; titleEn: string; icon: string }[] = [
  { id: 'camp', titleSi: 'ආපදා සහන කඳවුර (Relief Camp)', titleEn: 'Relief Camp', icon: '⛺' },
  { id: 'temple_church', titleSi: 'පන්සල / පල්ලිය / ආගමික ස්ථානය', titleEn: 'Religious Center', icon: '🏛️' },
  { id: 'school', titleSi: 'පාසල් ගොඩනැගිල්ල', titleEn: 'School Center', icon: '🏫' },
  { id: 'community_center', titleSi: 'ප්‍රජා ශාලාව / සමිති ශාලාව', titleEn: 'Community Center', icon: '🏢' },
  { id: 'hospital', titleSi: 'රෝහල / සෞඛ්‍ය මධ්‍යස්ථානය', titleEn: 'Hospital Hub', icon: '🏥' },
  { id: 'family_group', titleSi: 'පීඩාවට පත් පවුල් එකමුතුවක්', titleEn: 'Displaced Family Group', icon: '👨‍👩‍👧‍👦' },
  { id: 'distribution_hub', titleSi: 'ප්‍රධාන බෙදාහැරීමේ මධ්‍යස්ථානය', titleEn: 'Main Distribution Hub', icon: '📦' },
];

export const BROADCAST_SCOPES: { id: BroadcastScope; titleSi: string; titleEn: string; icon: string }[] = [
  { id: 'village', titleSi: 'ගම (Village)', titleEn: 'Village Level', icon: '🏡' },
  { id: 'town', titleSi: 'නගරය (Town)', titleEn: 'Town Level', icon: '🏙️' },
  { id: 'district', titleSi: 'දිස්ත්‍රික්කය (District)', titleEn: 'District Level', icon: '🗺️' },
  { id: 'province', titleSi: 'පළාත (Province)', titleEn: 'Province Level', icon: '🏛️' },
  { id: 'country', titleSi: 'මුළු රටම (Country)', titleEn: 'National Level', icon: '🇱🇰' },
];

// Helper to generate a 6-digit unique code
export const generate6DigitCode = (existingCodes: string[] = []): string => {
  let code = '';
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (existingCodes.includes(code));
  return code;
};

// ==========================================
// 🏢 Initial Aid Recipient Centers (6-Digit Registered)
// ==========================================
export const INITIAL_AID_CENTERS: AidRecipientCenter[] = [
  {
    id: 'center_1',
    centerCode: '712845',
    centerName: 'කැලණිය රජමහා විහාර ආපදා සහන මධ්‍යස්ථානය',
    centerType: 'temple_church',
    coordinatorName: 'පූජ්‍ය ධම්මරතන හිමි / සමන් කුමාර',
    coordinatorPhone: '0112911333',
    coordinatorNic: '781920341V',
    village: 'කැලණිය',
    town: 'කඩවත / කැලණිය',
    district: 'ගම්පහ',
    province: 'බස්නාහිර',
    address: 'කැලණිය රජමහා විහාර පරිශ්‍රය, කැලණිය',
    peopleCount: 320,
    familiesCount: 78,
    urgentNeeds: ['dry_rations', 'drinking_water', 'baby_care', 'medicine'],
    notes: 'ගංවතුරින් විපතට පත්වූ ප්‍රදේශවාසීන් 320 දෙනෙකු නේවාසිකව රැඳී සිටිති.',
    fraudWarningAccepted: true,
    fraudWarningAcceptedAt: '2026-09-18 09:30:00',
    createdAt: '2026-09-18',
    createdAtMs: Date.now() - 4 * 24 * 60 * 60 * 1000,
    status: 'verified',
    totalDeliveriesCount: 4,
    totalEstimatedValue: 485000,
    totalItemsDeliveredSummary: 'වියළි ආහාර මලු 120, වතුර බෝතල් 400, ළදරු කිරිපිටි පැකට් 50',
  },
  {
    id: 'center_2',
    centerCode: '593812',
    centerName: 'බුලත්සිංහල මධ්‍ය මහා විද්‍යාල ආපදා කඳවුර',
    centerType: 'school',
    coordinatorName: 'සුසන්ත පෙරේරා (ග්‍රාම නිලධාරී)',
    coordinatorPhone: '0342244555',
    coordinatorNic: '821034981V',
    village: 'බුලත්සිංහල',
    town: 'බුලත්සිංහල',
    district: 'කළුතර',
    province: 'බස්නාහිර',
    address: 'මධ්‍ය මහා විද්‍යාලය, බුලත්සිංහල',
    peopleCount: 195,
    familiesCount: 45,
    urgentNeeds: ['dry_rations', 'clothing_blankets', 'hygiene_sanitary'],
    notes: 'නායයෑම් අවදානම හේතුවෙන් අවතැන් වූ පවුල් සඳහා ආරක්ෂිත කඳවුරකි.',
    fraudWarningAccepted: true,
    fraudWarningAcceptedAt: '2026-09-19 14:15:00',
    createdAt: '2026-09-19',
    createdAtMs: Date.now() - 3 * 24 * 60 * 60 * 1000,
    status: 'verified',
    totalDeliveriesCount: 3,
    totalEstimatedValue: 290000,
    totalItemsDeliveredSummary: 'උණුසුම් ඇඳුම් සහ පොරෝන 150, වියළි සලාක මලු 60',
  },
  {
    id: 'center_3',
    centerCode: '384910',
    centerName: 'රත්නපුර දෙමටගොඩ ප්‍රජා ශාලා සහන කඳවුර',
    centerType: 'community_center',
    coordinatorName: 'චමින්ද ලක්මාල්',
    coordinatorPhone: '0452223344',
    coordinatorNic: '893021943V',
    village: 'දෙමටගොඩ',
    town: 'රත්නපුර',
    district: 'රත්නපුර',
    province: 'සබරගමුව',
    address: 'ප්‍රජා සංවර්ධන මධ්‍යස්ථාන ශාලාව, දෙමටගොඩ, රත්නපුර',
    peopleCount: 140,
    familiesCount: 32,
    urgentNeeds: ['cooked_meals', 'medicine', 'drinking_water'],
    notes: 'ජල මට්ටම ඉහළ යාම නිසා ආහාර පිසීමට නොහැකිව සිටින ප්‍රජාව.',
    fraudWarningAccepted: true,
    fraudWarningAcceptedAt: '2026-09-20 11:00:00',
    createdAt: '2026-09-20',
    createdAtMs: Date.now() - 2 * 24 * 60 * 60 * 1000,
    status: 'active',
    totalDeliveriesCount: 2,
    totalEstimatedValue: 175000,
    totalItemsDeliveredSummary: 'පිසූ ආහාර පාර්සල් 250, පානීය ජල බෝතල් 300',
  },
];

// ==========================================
// 🚚 Initial Aid Delivery Records (Logged by Donors & Confirmed by Recipient)
// ==========================================
export const INITIAL_AID_DELIVERIES: AidDeliveryRecord[] = [
  {
    id: 'deliv_1',
    recordCode: '#AID-LOG-712845-01',
    centerCode: '712845',
    centerId: 'center_1',
    centerName: 'කැලණිය රජමහා විහාර ආපදා සහන මධ්‍යස්ථානය',
    centerTown: 'කැලණිය',
    centerDistrict: 'ගම්පහ',
    donorName: 'කොළඹ තරුණ ව්‍යාපාරික එකමුතුව (Rotary Club)',
    donorPhone: '0773344556',
    donorOrganization: 'Rotary Club Colombo Central',
    aidCategory: 'dry_rations',
    categoryTitleSi: 'වියළි ආහාර / සලාක',
    itemDescription: 'සහල් (කැකුළු/නාඩු) කිලෝ 500, පරිප්පු 100kg, සීනි 50kg, ටින් මාළු 120, තේ කොළ 20kg සහ බිස්කට් පැකට් 150',
    quantity: 'සලාක මලු 80 (කිලෝ 800+)',
    monetaryValueEstimate: 215000,
    photos: ['https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=600&q=80'],
    deliveryDate: '2026-09-21',
    deliveryTime: '10:30 AM',
    donorNotes: 'කඳවුරේ බාරකරු පූජ්‍ය ධම්මරතන හිමියන් සහ ග්‍රාම නිලධාරී ඉදිරියේ නිල වශයෙන් භාර දෙන ලදී.',
    status: 'confirmed_received',
    submittedAt: '2026-09-21 10:45:00',
    submittedAtMs: Date.now() - 30 * 60 * 60 * 1000,
    confirmedAt: '2026-09-21 11:15:00',
    confirmedAtMs: Date.now() - 29 * 60 * 60 * 1000,
    confirmedByRecipientName: 'පූජ්‍ය ධම්මරතන හිමි',
    recipientConfirmationNote: 'සලාක මලු 80ක් නිවැරදිව ලැබුණු බවත්, විපතට පත් පවුල් අතර බෙදාහැරීම ආරම්භ කළ බවත් සහතික කරමි.',
    isVerifiedPublic: true,
  },
  {
    id: 'deliv_2',
    recordCode: '#AID-LOG-712845-02',
    centerCode: '712845',
    centerId: 'center_1',
    centerName: 'කැලණිය රජමහා විහාර ආපදා සහන මධ්‍යස්ථානය',
    centerTown: 'කැලණිය',
    centerDistrict: 'ගම්පහ',
    donorName: 'ආචාර්ය නිමල් සේනාරත්න & පවුලේ අය',
    donorPhone: '0712233445',
    donorOrganization: 'පෞද්ගලික පරිත්‍යාගශීලීන්',
    aidCategory: 'drinking_water',
    categoryTitleSi: 'පිරිසිදු පානීය ජලය',
    itemDescription: 'ලීටර් 5 පානීය ජල බෝතල් 80ක් සහ ලීටර් 1.5 ජල බෝතල් 200ක්',
    quantity: 'ජල බෝතල් 280 (ලීටර් 700)',
    monetaryValueEstimate: 65000,
    photos: ['https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80'],
    deliveryDate: '2026-09-21',
    deliveryTime: '02:15 PM',
    donorNotes: 'පානීය ජල හිඟය සැලකිල්ලට ගෙන කඩිනමින් ලොරියකින් බෙදාහරින ලදී.',
    status: 'confirmed_received',
    submittedAt: '2026-09-21 02:30:00',
    submittedAtMs: Date.now() - 26 * 60 * 60 * 1000,
    confirmedAt: '2026-09-21 02:50:00',
    confirmedAtMs: Date.now() - 25 * 60 * 60 * 1000,
    confirmedByRecipientName: 'සමන් කුමාර (කමිටු ලේකම්)',
    recipientConfirmationNote: 'ජල බෝතල් තොගය ලැබුණු අතර කඳවුරේ ජල අවශ්‍යතාවය සම්පූර්ණ විය. ස්තූතියි.',
    isVerifiedPublic: true,
  },
  {
    id: 'deliv_3',
    recordCode: '#AID-LOG-593812-01',
    centerCode: '593812',
    centerId: 'center_2',
    centerName: 'බුලත්සිංහල මධ්‍ය මහා විද්‍යාල ආපදා කඳවුර',
    centerTown: 'බුලත්සිංහල',
    centerDistrict: 'කළුතර',
    donorName: 'මොරටුව විශ්වවිද්‍යාල ශිෂ්‍ය සුබසාධක එකමුතුව',
    donorPhone: '0789988776',
    donorOrganization: 'UoM Students Care Circle',
    aidCategory: 'clothing_blankets',
    categoryTitleSi: 'ඇඳුම් හා පොරෝන',
    itemDescription: 'ළමා හා වැඩිහිටි උණුසුම් පොරෝන 120ක්, පැදුරු 50ක් සහ නව ළමා ඇඳුම් කට්ටල 60ක්',
    quantity: 'පොරෝන 120, පැදුරු 50',
    monetaryValueEstimate: 145000,
    photos: ['https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80'],
    deliveryDate: '2026-09-22',
    deliveryTime: '09:00 AM',
    donorNotes: 'ශිෂ්‍යයින් විසින් එකතු කර ඇසුරුම් කළ සහනාධාර තොගය.',
    status: 'confirmed_received',
    submittedAt: '2026-09-22 09:20:00',
    submittedAtMs: Date.now() - 9 * 60 * 60 * 1000,
    confirmedAt: '2026-09-22 09:40:00',
    confirmedAtMs: Date.now() - 8 * 60 * 60 * 1000,
    confirmedByRecipientName: 'සුසන්ත පෙරේරා (ග්‍රාම නිලධාරී)',
    recipientConfirmationNote: 'සියලු ද්‍රව්‍ය ගණන් කර භාරගන්නා ලදී. ශීතලෙන් පීඩා විඳි දරුවන්ට හා වැඩිහිටියන්ට ලබාදෙන ලදී.',
    isVerifiedPublic: true,
  },
  {
    id: 'deliv_4',
    recordCode: '#AID-LOG-384910-01',
    centerCode: '384910',
    centerId: 'center_3',
    centerName: 'රත්නපුර දෙමටගොඩ ප්‍රජා ශාලා සහන කඳවුර',
    centerTown: 'රත්නපුර',
    centerDistrict: 'රත්නපුර',
    donorName: 'සබරගමුව හෝටල් හිමියන්ගේ සංගමය',
    donorPhone: '0751122334',
    donorOrganization: 'Sabaragamuwa Hoteliers',
    aidCategory: 'cooked_meals',
    categoryTitleSi: 'පිසූ ආහාර',
    itemDescription: 'උණුසුම් දිවා ආහාර පාර්සල් 150ක් (බත්, පරිප්පු, කුකුළු මස්, එළවළු) සහ පානීය ජලය',
    quantity: 'ආහාර පාර්සල් 150',
    monetaryValueEstimate: 75000,
    deliveryDate: '2026-09-22',
    deliveryTime: '12:30 PM',
    donorNotes: 'දිවා ආහාර වේල සඳහා නියමිත වේලාවට භාර දෙන ලදී.',
    status: 'pending_recipient_confirmation',
    submittedAt: '2026-09-22 12:45:00',
    submittedAtMs: Date.now() - 6 * 60 * 60 * 1000,
    isVerifiedPublic: false,
  },
];

// ==========================================
// 📢 Initial Community Scope Broadcast Posts
// ==========================================
export const INITIAL_COMMUNITY_BROADCASTS: AidCommunityBroadcastPost[] = [
  {
    id: 'post_1',
    postCode: '#AID-POST-501',
    broadcastScope: 'town',
    scopeName: 'කැලණිය සහ කඩවත නගරය',
    title: 'කැලණිය ගංවතුර විපතට පත් පවුල් 300ක් වෙත ආධාර බෙදාදීමේ ප්‍රගති වාර්තාව',
    organizerName: 'කැලණිය එක්සත් ප්‍රජා සංවර්ධන පදනම',
    organizerPhone: '0112911222',
    collectedSummary: 'ප්‍රජාව විසින් එකතු කරන ලද වියළි සලාක මලු 180ක්, වතුර බෝතල් 500ක්, ළදරු කිරිපිටි පැකට් 70ක් සහ රු. 350,000 ක අරමුදල්.',
    distributedSummary: 'කැලණිය රජමහා විහාර කඳවුර (අංකය: 712845) සහ මානෙල්ගම තාවකාලික කඳවුර වෙත සියලු සලාක හා ජල තොග විනිවිදභාවයෙන් භාරදී තහවුරු කරගන්නා ලදී.',
    beneficiaryCenters: ['712845 - කැලණිය රජමහා විහාරය', 'මානෙල්ගම ප්‍රජා ශාලාව'],
    photos: [
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=600&q=80'
    ],
    totalValueFormatted: 'රු. 835,000',
    createdAt: 'මීට පැය 4කට පෙර',
    createdAtMs: Date.now() - 4 * 60 * 60 * 1000,
    likesCount: 38,
    verifiedByLedger: true,
  },
  {
    id: 'post_2',
    postCode: '#AID-POST-502',
    broadcastScope: 'district',
    scopeName: 'කළුතර දිස්ත්‍රික්කය',
    title: 'බුලත්සිංහල සහ අගලවත්ත නායයෑම් අවදානම් ප්‍රදේශ වෙත පොරෝන සහ ඖෂධ බෙදාහැරීම',
    organizerName: 'කළුතර දිස්ත්‍රික් ආපදා සහන ජාලය',
    organizerPhone: '0342221199',
    collectedSummary: 'උණුසුම් පොරෝන 300ක්, පැදුරු 100ක්, ප්‍රථමාධාර ඖෂධ පෙට්ටි 40ක් සහ පානීය ජලය.',
    distributedSummary: 'බුලත්සිංහල මධ්‍ය මහා විද්‍යාල ආපදා කඳවුර (අංකය: 593812) සහ යටදොළවත්ත කඳවුර වෙත සාර්ථකව බෙදාහරින ලදී.',
    beneficiaryCenters: ['593812 - බුලත්සිංහල ම.ම.වි.', 'යටදොළවත්ත කඳවුර'],
    photos: [
      'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80'
    ],
    totalValueFormatted: 'රු. 520,000',
    createdAt: 'ඊයේ',
    createdAtMs: Date.now() - 22 * 60 * 60 * 1000,
    likesCount: 52,
    verifiedByLedger: true,
  },
  {
    id: 'post_3',
    postCode: '#AID-POST-503',
    broadcastScope: 'country',
    scopeName: 'ශ්‍රී ලංකාව (මුළු රටම)',
    title: 'දිවයින පුරා ආපදා සහන මෙහෙයුමේ සමස්ත විනිවිදභාවය සහ ලැබුණු ආධාර ලෙජර වාර්තාව',
    organizerName: 'සහය සේවා (Sahaya Sewa) ප්‍රජා සහන අරමුදල',
    organizerPhone: '0112000000',
    collectedSummary: 'දිවයිනේ විවිධ ප්‍රදේශවලින් පරිත්‍යාගශීලීන් 1,400+ දෙනෙකු විසින් ලබාදුන් සම්පූර්ණ වියළි සලාක, ඖෂධ, ජලය හා අරමුදල්.',
    distributedSummary: 'ගම්පහ, කළුතර, රත්නපුර, ගාල්ල සහ මාතර දිස්ත්‍රික්කවල ලියාපදිංචි 6-Digit ආධාර මධ්‍යස්ථාන 18ක් වෙත සෘජුවම බෙදාහරින ලදී.',
    beneficiaryCenters: ['712845', '593812', '384910', 'සහ තවත් මධ්‍යස්ථාන 15ක්'],
    photos: [
      'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=600&q=80'
    ],
    totalValueFormatted: 'රු. 4,650,000+',
    createdAt: 'දින 2කට පෙර',
    createdAtMs: Date.now() - 48 * 60 * 60 * 1000,
    likesCount: 124,
    verifiedByLedger: true,
  },
];

// ==========================================
// 💾 LocalStorage Persistence Helpers
// ==========================================

const AID_CENTERS_KEY = 'sahaya_transparent_aid_centers';
const AID_DELIVERIES_KEY = 'sahaya_transparent_aid_deliveries';
const AID_BROADCASTS_KEY = 'sahaya_transparent_aid_broadcasts';

export const getStoredAidCenters = (): AidRecipientCenter[] => {
  try {
    const saved = localStorage.getItem(AID_CENTERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading aid centers from localStorage:', e);
  }
  return INITIAL_AID_CENTERS;
};

export const saveAidCentersToStorage = (centers: AidRecipientCenter[]) => {
  try {
    localStorage.setItem(AID_CENTERS_KEY, JSON.stringify(centers));
  } catch (e) {
    console.error('Error saving aid centers to localStorage:', e);
  }
};

export const getStoredAidDeliveries = (): AidDeliveryRecord[] => {
  try {
    const saved = localStorage.getItem(AID_DELIVERIES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading aid deliveries from localStorage:', e);
  }
  return INITIAL_AID_DELIVERIES;
};

export const saveAidDeliveriesToStorage = (deliveries: AidDeliveryRecord[]) => {
  try {
    localStorage.setItem(AID_DELIVERIES_KEY, JSON.stringify(deliveries));
  } catch (e) {
    console.error('Error saving aid deliveries to localStorage:', e);
  }
};

export const getStoredCommunityBroadcasts = (): AidCommunityBroadcastPost[] => {
  try {
    const saved = localStorage.getItem(AID_BROADCASTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading broadcasts from localStorage:', e);
  }
  return INITIAL_COMMUNITY_BROADCASTS;
};

export const saveCommunityBroadcastsToStorage = (broadcasts: AidCommunityBroadcastPost[]) => {
  try {
    localStorage.setItem(AID_BROADCASTS_KEY, JSON.stringify(broadcasts));
  } catch (e) {
    console.error('Error saving broadcasts to localStorage:', e);
  }
};

// Find Center by 6-digit Code
export const findAidCenterByCode = (code: string): AidRecipientCenter | undefined => {
  const cleanCode = code.trim().replace(/\D/g, '');
  const centers = getStoredAidCenters();
  return centers.find(c => c.centerCode === cleanCode);
};

// Dispatch In-App Notification to Recipient
export const notifyRecipientOfLoggedAid = (record: AidDeliveryRecord, center: AidRecipientCenter) => {
  addAppNotification({
    type: 'general',
    title: `📦 නව ආධාර ලැබීමක් සටහන් විය! (අංක ${center.centerCode})`,
    message: `${record.donorName} විසින් ${record.quantity} (${record.categoryTitleSi}) ඔබගේ මධ්‍යස්ථානය වෙත ලබාදුන් බව සටහන් කර ඇත. කරුණාකර තහවුරු කරන්න.`,
    locationName: center.town,
    badgeText: 'ආධාර තහවුරු',
    targetModal: 'blood',
  });
};
