import { BarterItem, BarterProposal, BarterCondition } from '../types';

const STORAGE_KEY_BARTER_ITEMS = 'sahaya_barter_items_data';
const STORAGE_KEY_BARTER_PROPOSALS = 'sahaya_barter_proposals_data';

export interface BarterCategoryMeta {
  key: string;
  nameSi: string;
  nameEn: string;
  icon: string;
  color: string;
}

export const BARTER_CATEGORIES: BarterCategoryMeta[] = [
  { key: 'all', nameSi: 'සියලු කාණ්ඩ', nameEn: 'All Categories', icon: '🔄', color: 'bg-emerald-500' },
  { key: 'electronics', nameSi: 'විදුලි සහ ඉලෙක්ට්‍රොනික', nameEn: 'Electronics & Gadgets', icon: '📱', color: 'bg-blue-500' },
  { key: 'agriculture', nameSi: 'ගොවිතැන්, පැළ සහ අස්වැන්න', nameEn: 'Agriculture & Plants', icon: '🌱', color: 'bg-green-500' },
  { key: 'tools', nameSi: 'කාර්මික හා ගෙවතු උපකරණ', nameEn: 'Tools & Hardware', icon: '🛠️', color: 'bg-amber-500' },
  { key: 'furniture', nameSi: 'ගෘහ භාණ්ඩ හා උපකරණ', nameEn: 'Furniture & Living', icon: '🛋️', color: 'bg-indigo-500' },
  { key: 'appliances', nameSi: 'මුළුතැන්ගෙයි උපකරණ', nameEn: 'Kitchen & Appliances', icon: '🍳', color: 'bg-rose-500' },
  { key: 'vehicles', nameSi: 'වාහන අමතර කොටස් හා බයිසිකල්', nameEn: 'Vehicles & Parts', icon: '🚲', color: 'bg-cyan-500' },
  { key: 'books', nameSi: 'පොත්පත් හා අධ්‍යාපනික ද්‍රව්‍ය', nameEn: 'Books & Stationery', icon: '📚', color: 'bg-purple-500' },
  { key: 'clothing', nameSi: 'ඇඳුම් පැළඳුම් හා පාවහන්', nameEn: 'Clothing & Wearables', icon: '👕', color: 'bg-teal-500' },
  { key: 'general', nameSi: 'වෙනත් ඕනෑම අතිරික්ත භාණ්ඩ', nameEn: 'General & Miscellaneous', icon: '📦', color: 'bg-slate-500' },
];

export const INITIAL_BARTER_ITEMS: BarterItem[] = [
  {
    id: 'swap_001',
    barterCode: '#SWAP-1082',
    userId: 'user_kamal_01',
    userNumericId: '881234567',
    userName: 'කමල් ජයවර්ධන',
    userPhone: '0771234567',
    userDistrict: 'කුරුණෑගල',
    userTown: 'නාරම්මල',
    offeringTitle: ' Singer විදුලි මහන මැෂිම (හොඳම තත්ත්වයේ ඇත)',
    offeringCategory: 'appliances',
    offeringDescription: 'වැඩකිරීමේ කිසිදු දෝෂයක් නොමැත. මෝටරය සමඟ සම්පූර්ණ කට්ටලයම ඇත. පාවිච්චි නොකරන බැවින් හුවමාරු කෙරේ.',
    condition: 'good',
    estimatedValue: 18500,
    photos: ['https://images.unsplash.com/photo-1528458900012-985bf317546f?w=600&auto=format&fit=crop&q=80'],
    wantedItem: 'Smart Phone එකක් හෝ Tablet එකක්',
    wantedCategory: 'electronics',
    wantedDescription: 'දරුවාගේ Online පන්ති සඳහා භාවිතා කළ හැකි Samsung හෝ Redmi ස්මාර්ට් දුරකථනයක් බලාපොරොත්තු වේ.',
    status: 'available',
    proposalsCount: 2,
    createdAt: '2026-09-21 10:30 AM',
    createdAtMs: Date.now() - 86400000 * 2,
  },
  {
    id: 'swap_002',
    barterCode: '#SWAP-1083',
    userId: 'user_sunil_02',
    userNumericId: '792345678',
    userName: 'සුනිල් ප්‍රේමරත්න',
    userPhone: '0719876543',
    userDistrict: 'ගම්පහ',
    userTown: 'මිනුවන්ගොඩ',
    offeringTitle: 'අතිරික්ත උසස් තත්ත්වයේ බද්ධ පොල් පැළ 30ක් සහ ගම්මිරිස් වැල් පැළ 50ක්',
    offeringCategory: 'agriculture',
    offeringDescription: 'ගෙවත්තෙන් අතිරික්ත වූ හොඳින් වැඩුණු බද්ධ පොල් පැළ සහ ගම්මිරිස් පැළ තොගයකි.',
    condition: 'brand_new',
    estimatedValue: 12000,
    photos: ['https://images.unsplash.com/photo-1592417817098-8f3d6eb22525?w=600&auto=format&fit=crop&q=80'],
    wantedItem: 'ගෙවතු තණකොළ කපන යන්ත්‍රයක් (Grass Cutter) හෝ වතුර බවුසරයක්',
    wantedCategory: 'tools',
    wantedDescription: 'ක්‍රියාකාරී තත්ත්වයේ ඇති තණකොළ කපන මැෂිමක් හෝ ගෙවතු වගා උපකරණ කට්ටලයක්.',
    status: 'available',
    proposalsCount: 1,
    createdAt: '2026-09-22 08:15 AM',
    createdAtMs: Date.now() - 86400000 * 1,
  },
  {
    id: 'swap_003',
    barterCode: '#SWAP-1084',
    userId: 'user_nimal_03',
    userNumericId: '953456789',
    userName: 'නිමල් චන්ද්‍රසිරි',
    userPhone: '0765544332',
    userDistrict: 'කොළඹ',
    userTown: 'හෝමාගම',
    offeringTitle: 'Lumala 26-inch Speed බයිසිකලය',
    offeringCategory: 'vehicles',
    offeringDescription: 'ටයර් අලුත්. ගියර් පද්ධතිය හොඳින් ක්‍රියා කරයි. දෛනික ගමන් සඳහා සුදුසුය.',
    condition: 'good',
    estimatedValue: 22000,
    photos: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80'],
    wantedItem: 'Singer විදුලි මහන මැෂිමක් හෝ ගෑස් ලිපක් (Gas Cooker Set)',
    wantedCategory: 'appliances',
    wantedDescription: 'නිවසේ ප්‍රයෝජනය සඳහා හොඳ තත්ත්වයේ මහන මැෂිමක් හෝ Double burner ගෑස් ලිපක් අවශ්‍යයි.',
    status: 'available',
    proposalsCount: 0,
    createdAt: '2026-09-22 02:40 PM',
    createdAtMs: Date.now() - 3600000 * 4,
  },
  {
    id: 'swap_004',
    barterCode: '#SWAP-1085',
    userId: 'user_rashmi_04',
    userNumericId: '994567890',
    userName: 'රශ්මි මධුෂිකා',
    userPhone: '0702233445',
    userDistrict: 'මහනුවර',
    userTown: 'පේරාදෙණිය',
    offeringTitle: 'A/L සහ O/L විද්‍යා සහ ගණිත විෂය සමගාමී පොත්පත් හා ප්‍රශ්න පත්‍ර තොගයක්',
    offeringCategory: 'books',
    offeringDescription: 'උසස් පෙළ ජීව විද්‍යා සහ භෞතික විද්‍යා පසුගිය විභාග ප්‍රශ්න පත්‍ර සහ සම්පත් පොත් 15ක් පමණ ඇත.',
    condition: 'like_new',
    estimatedValue: 9500,
    photos: ['https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80'],
    wantedItem: 'ගිටාරයක් (Acoustic Guitar) හෝ ඉලෙක්ට්‍රොනික් සංගීත භාණ්ඩයක්',
    wantedCategory: 'electronics',
    wantedDescription: 'පුහුණුවීම් සඳහා භාවිතා කළ හැකි ඇකෝස්ටික් ගිටාරයක් සමඟ මාරු කිරීමට කැමැත්තෙමි.',
    status: 'available',
    proposalsCount: 1,
    createdAt: '2026-09-22 05:00 PM',
    createdAtMs: Date.now() - 3600000 * 2,
  },
  {
    id: 'swap_005',
    barterCode: '#SWAP-1086',
    userId: 'user_anura_05',
    userNumericId: '825678901',
    userName: 'අනුර වික්‍රමසිංහ',
    userPhone: '0781122334',
    userDistrict: 'කළුතර',
    userTown: 'පානදුර',
    offeringTitle: 'Bosch Professional Hand Drill Machine & Grinder Set',
    offeringCategory: 'tools',
    offeringDescription: '100% ඔරිජිනල් Bosch ඩ්‍රිල් සහ ග්‍රයින්ඩර් කට්ටලය. බිට්ස් සහ පෙට්ටිය සහිතයි.',
    condition: 'like_new',
    estimatedValue: 24000,
    photos: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80'],
    wantedItem: 'බයිසිකලයක් (Mountain Bike / Lumala) හෝ කාර්යාල පුටුවක්',
    wantedCategory: 'vehicles',
    wantedDescription: 'වැඩිහිටි අයෙකුට පැදීමට සුදුසු පාපැදියක් සොයමි.',
    status: 'available',
    proposalsCount: 0,
    createdAt: '2026-09-22 06:20 PM',
    createdAtMs: Date.now() - 1800000,
  }
];

export const INITIAL_BARTER_PROPOSALS: BarterProposal[] = [
  {
    id: 'prop_001',
    proposalCode: '#PROP-201',
    barterItemId: 'swap_001',
    barterItemTitle: 'Singer විදුලි මහන මැෂිම (හොඳම තත්ත්වයේ ඇත)',
    targetUserId: 'user_kamal_01',
    proposerUserId: 'user_nimal_03',
    proposerName: 'නිමල් චන්ද්‍රසිරි',
    proposerPhone: '0765544332',
    proposerDistrict: 'කොළඹ',
    offeredItemTitle: 'Samsung Galaxy Tab A (8-inch)',
    offeredItemCategory: 'electronics',
    offeredItemDescription: 'Zoom පන්ති සඳහා භාවිතා කළ ටැබ් එකකි. චාජරය සමඟ ඇත. මාරු කිරීමට කැමතියි.',
    offeredCondition: 'good',
    proposerNotes: 'මට ඔබගේ මහන මැෂිම අවශ්‍යයි. මගේ ටැබ් එක ලබාදිය හැකියි. හෙට දින හමුවිය හැක.',
    status: 'pending',
    createdAt: '2026-09-22 01:15 PM',
    createdAtMs: Date.now() - 3600000 * 5,
  }
];

/**
 * Get all barter listings from storage
 */
export const getStoredBarterItems = (): BarterItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BARTER_ITEMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Error reading barter items:', err);
  }
  return INITIAL_BARTER_ITEMS;
};

/**
 * Save barter listings to storage
 */
export const saveBarterItemsToStorage = (items: BarterItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_BARTER_ITEMS, JSON.stringify(items));
  } catch (err) {
    console.warn('Error saving barter items:', err);
  }
};

/**
 * Get all proposals from storage
 */
export const getStoredBarterProposals = (): BarterProposal[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BARTER_PROPOSALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Error reading barter proposals:', err);
  }
  return INITIAL_BARTER_PROPOSALS;
};

/**
 * Save proposals to storage
 */
export const saveBarterProposalsToStorage = (proposals: BarterProposal[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_BARTER_PROPOSALS, JSON.stringify(proposals));
  } catch (err) {
    console.warn('Error saving barter proposals:', err);
  }
};

/**
 * Smart Matchmaking Algorithm
 * Evaluates semantic and keyword similarity between:
 * - What User A Offers vs What User B Wants
 * - AND What User B Offers vs What User A Wants (Direct Reciprocal Match!)
 */
export interface BarterMatchResult {
  item: BarterItem;
  matchScore: number; // 0 - 100%
  matchReason: string;
  isReciprocal: boolean; // 2-way match!
  matchedCategory: boolean;
}

export const findSmartBarterMatches = (
  myOfferingTitle: string,
  myOfferingCategory: string,
  myWantedItem: string,
  myWantedCategory?: string,
  excludeUserId?: string,
  allListings: BarterItem[] = getStoredBarterItems()
): BarterMatchResult[] => {
  const normalize = (str: string) =>
    (str || '')
      .toLowerCase()
      .replace(/[^\w\u0D80-\u0DFF\s]/g, ' ')
      .trim();

  const myOfferTokens = normalize(myOfferingTitle).split(/\s+/).filter(t => t.length > 2);
  const myWantTokens = normalize(myWantedItem).split(/\s+/).filter(t => t.length > 2);

  const results: BarterMatchResult[] = [];

  for (const item of allListings) {
    if (item.status !== 'available') continue;
    if (excludeUserId && item.userId === excludeUserId) continue;

    const targetOfferTokens = normalize(item.offeringTitle).split(/\s+/).filter(t => t.length > 2);
    const targetWantTokens = normalize(item.wantedItem).split(/\s+/).filter(t => t.length > 2);

    let score = 0;
    let reasons: string[] = [];
    let isReciprocal = false;
    let matchedCategory = false;

    // Check 1: Target offers what I want (Score up to +50)
    let wantMatchCount = 0;
    for (const wantToken of myWantTokens) {
      if (targetOfferTokens.some(t => t.includes(wantToken) || wantToken.includes(t))) {
        wantMatchCount++;
      }
    }
    if (myWantedCategory && item.offeringCategory === myWantedCategory) {
      score += 25;
      matchedCategory = true;
    }
    if (wantMatchCount > 0) {
      score += Math.min(45, wantMatchCount * 25);
      reasons.push('ඔබ සොයන භාණ්ඩය මෙම සාමාජිකයා සතුව ඇත');
    }

    // Check 2: Target wants what I offer (Reciprocal score up to +50)
    let offerMatchCount = 0;
    for (const offerToken of myOfferTokens) {
      if (targetWantTokens.some(t => t.includes(offerToken) || offerToken.includes(t))) {
        offerMatchCount++;
      }
    }
    if (item.wantedCategory && item.wantedCategory === myOfferingCategory) {
      score += 20;
    }
    if (offerMatchCount > 0) {
      score += Math.min(45, offerMatchCount * 25);
      isReciprocal = true;
      reasons.push('ඔබ සතු අතිරික්තය මොහුට අවශ්‍ය වේ (ද්විපාර්ශ්වික ගැළපීම)');
    }

    // If both match, boost score to 95-100%
    if (isReciprocal && wantMatchCount > 0) {
      score = Math.min(100, Math.max(85, score + 20));
    }

    // Value proximity bonus (fair swap indicator)
    if (score >= 30) {
      results.push({
        item,
        matchScore: Math.min(100, Math.max(35, score)),
        matchReason: reasons.join(' • ') || 'කාණ්ඩ හා විස්තර අතර ඉහළ ගැළපීමක් පවතී',
        isReciprocal,
        matchedCategory,
      });
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
};

export const getBarterConditionLabel = (condition?: BarterCondition): { labelSi: string; color: string } => {
  switch (condition) {
    case 'brand_new':
      return { labelSi: 'නවතම (Brand New)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'like_new':
      return { labelSi: 'අලුත් මෙන් (Like New)', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'good':
      return { labelSi: 'හොඳ තත්ත්වයේ (Good)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'used':
      return { labelSi: 'භාවිත කළ (Used)', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    default:
      return { labelSi: 'හොඳ තත්ත්වයේ', color: 'bg-slate-100 text-slate-800 border-slate-200' };
  }
};
