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

// 🔄 භාණ්ඩ හුවමාරු ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල භාණ්ඩ ඉවත් කර ඇත)
export const INITIAL_BARTER_ITEMS: BarterItem[] = [];

// 🤝 හුවමාරු යෝජනා ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල යෝජනා ඉවත් කර ඇත)
export const INITIAL_BARTER_PROPOSALS: BarterProposal[] = [];

/**
 * Get all barter listings from storage
 */
export const getStoredBarterItems = (): BarterItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BARTER_ITEMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // පෙර තිබූ sample mock items (swap_) ස්වයංක්‍රීයව පෙරීම
        return parsed.filter((item: BarterItem) => item && !item.id?.startsWith('swap_'));
      }
    }
  } catch (err) {
    console.warn('Error reading barter items:', err);
  }
  return [];
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
      if (Array.isArray(parsed)) {
        // පෙර තිබූ sample mock proposals (prop_) ස්වයංක්‍රීයව පෙරීම
        return parsed.filter((prop: BarterProposal) => prop && !prop.id?.startsWith('prop_'));
      }
    }
  } catch (err) {
    console.warn('Error reading barter proposals:', err);
  }
  return [];
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
      .replace(/[^\w඀-෿\s]/g, ' ')
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
      reasons.push('ඔබ සතු අතිරික්තය මොහුට අවශ්ය වේ (ද්විපාර්ශ්වික ගැළපීම)');
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

