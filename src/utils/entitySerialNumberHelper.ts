import { HelpPost, User, ProfessionalService, MarketShop } from '../types';

export type EntityType = 'post' | 'shop' | 'business' | 'user' | 'professional';

export interface UniversalEntityMatch {
  entityType: EntityType;
  entityTypeNameSi: string;
  entityTypeNameEn: string;
  entityTypeNameTa: string;
  serialNumber: string; // e.g. "555" or "3728"
  atTag: string; // e.g. "@555"
  title: string;
  subtitle: string;
  locationName?: string;
  phone?: string;
  photoUrl?: string;
  originalItem: any;
}

/**
 * Deterministically extracts or generates a unique 3-5 digit serial number for an entity.
 */
export function getEntitySerialNumber(item: any, type: EntityType): string {
  if (!item) return '000';

  // 1. If entity explicitly has serialNumber or refNumber or userNumericId
  if (item.serialNumber) return String(item.serialNumber).replace(/\D/g, '') || '101';
  if (item.userNumericId) return String(item.userNumericId).replace(/\D/g, '') || '101';

  // 2. HelpPost: extract from postCode (e.g., #HELP-3728 -> 3728, #POST-555 -> 555)
  if (type === 'post') {
    if (item.postCode) {
      const digits = item.postCode.replace(/\D/g, '');
      if (digits.length >= 2) return digits;
    }
  }

  // 3. User: extract from NIC or phone or ID
  if (type === 'user') {
    if (item.nicNumber) {
      const digits = item.nicNumber.replace(/\D/g, '');
      if (digits.length >= 3) return digits.slice(-4);
    }
  }

  // 4. Shop / Business: extract digits from ID if present (e.g. shop_555 -> 555)
  if (type === 'shop' || type === 'business') {
    if (item.id) {
      const digits = item.id.replace(/\D/g, '');
      if (digits.length >= 2) return digits.slice(-4);
    }
  }

  // 5. Professional: extract digits from ID or phone
  if (type === 'professional') {
    if (item.id) {
      const digits = item.id.replace(/\D/g, '');
      if (digits.length >= 2) return digits.slice(-4);
    }
    if (item.providerPhone) {
      const digits = item.providerPhone.replace(/\D/g, '');
      if (digits.length >= 3) return digits.slice(-3);
    }
  }

  // 6. Deterministic fallback hash from ID string (100 to 9999)
  const str = String(item.id || item.name || item.title || 'item');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const num = (positive % 9000) + 1000; // 4 digits 1000 - 9999
  return String(num);
}

/**
 * Checks if search query contains an '@' search format (e.g., "@555", "@ 555", "@HELP", "@post", "@shop").
 */
export function parseAtQuery(query: string): { isAtSearch: boolean; targetNumber: string; rawTerm: string } {
  const trimmed = query.trim();
  if (!trimmed.startsWith('@')) {
    // Also check if pure 3+ digit number entered
    if (/^\d{2,6}$/.test(trimmed)) {
      return {
        isAtSearch: true,
        targetNumber: trimmed,
        rawTerm: trimmed,
      };
    }
    return { isAtSearch: false, targetNumber: '', rawTerm: trimmed };
  }

  const afterAt = trimmed.slice(1).trim();
  const digits = afterAt.replace(/\D/g, '');

  return {
    isAtSearch: true,
    targetNumber: digits || afterAt,
    rawTerm: afterAt,
  };
}

/**
 * Searches all collections (posts, shops, businesses, users, professionals)
 * for items matching the `@` search query or serial number (උදා: @555).
 */
export function searchUniversalEntitiesByAtQuery(
  query: string,
  data: {
    posts?: HelpPost[];
    shops?: MarketShop[];
    users?: User[];
    professionals?: ProfessionalService[];
  }
): UniversalEntityMatch[] {
  const parsed = parseAtQuery(query);
  if (!parsed.isAtSearch && !query.includes('@')) {
    return [];
  }

  const matches: UniversalEntityMatch[] = [];
  const searchDigits = parsed.targetNumber.toLowerCase();
  const rawTerm = parsed.rawTerm.toLowerCase();

  // 1. Search Help Posts
  if (data.posts && Array.isArray(data.posts)) {
    data.posts.forEach((post) => {
      if (!post || post.isDeleted) return;
      const serial = getEntitySerialNumber(post, 'post');
      const postCodeClean = (post.postCode || '').toLowerCase();

      const isMatch =
        (searchDigits && serial.includes(searchDigits)) ||
        (rawTerm && postCodeClean.includes(rawTerm)) ||
        (rawTerm && (post.whatHappened || '').toLowerCase().includes(rawTerm));

      if (isMatch) {
        matches.push({
          entityType: 'post',
          entityTypeNameSi: 'දැන්වීම (Help Post)',
          entityTypeNameEn: 'Help Post',
          entityTypeNameTa: 'உதவி பதிவு',
          serialNumber: serial,
          atTag: `@${serial}`,
          title: post.whatHappened || post.whatIsNeeded || 'ප්‍රජා දැන්වීම',
          subtitle: `${post.postCode || ''} • ${post.userName} (${post.locationName || 'ස්ථානය'})`,
          locationName: post.locationName,
          phone: post.userPhone,
          photoUrl: post.imageUrl || post.userPhotoUrl,
          originalItem: post,
        });
      }
    });
  }

  // 2. Search Shops & Businesses
  if (data.shops && Array.isArray(data.shops)) {
    data.shops.forEach((shop) => {
      if (!shop) return;
      const isBusiness = shop.type === 'business';
      const typeKey: EntityType = isBusiness ? 'business' : 'shop';
      const serial = getEntitySerialNumber(shop, typeKey);
      const nameClean = (shop.name || shop.userName || '').toLowerCase();
      const phoneClean = (shop.userPhone || '').toLowerCase();

      const isMatch =
        (searchDigits && (serial.includes(searchDigits) || phoneClean.includes(searchDigits))) ||
        (rawTerm && nameClean.includes(rawTerm));

      if (isMatch) {
        matches.push({
          entityType: typeKey,
          entityTypeNameSi: isBusiness ? 'ව්‍යාපාරය (Business)' : 'අලෙවිසැල (Shop / Store)',
          entityTypeNameEn: isBusiness ? 'Business' : 'Retail Shop',
          entityTypeNameTa: isBusiness ? 'வணிகம்' : 'கடை',
          serialNumber: serial,
          atTag: `@${serial}`,
          title: shop?.name || (isBusiness ? 'ව්‍යාපාරික ආයතනය' : 'අලෙවිසැල'),
          subtitle: `${shop.categoryTag || ''} • ${shop.userName} (${shop.location?.name || ''})`,
          locationName: shop.location?.name,
          phone: shop.userPhone,
          originalItem: shop,
        });
      }
    });
  }

  // 3. Search Professional Service Providers
  if (data.professionals && Array.isArray(data.professionals)) {
    data.professionals.forEach((prof) => {
      if (!prof) return;
      const serial = getEntitySerialNumber(prof, 'professional');
      const nameClean = (prof.providerName || '').toLowerCase();
      const titleClean = (prof.serviceTitle || '').toLowerCase();
      const phoneClean = (prof.providerPhone || '').toLowerCase();

      const isMatch =
        (searchDigits && (serial.includes(searchDigits) || phoneClean.includes(searchDigits))) ||
        (rawTerm && (nameClean.includes(rawTerm) || titleClean.includes(rawTerm)));

      if (isMatch) {
        matches.push({
          entityType: 'professional',
          entityTypeNameSi: 'වෘත්තීය සේවක (Professional)',
          entityTypeNameEn: 'Professional Service',
          entityTypeNameTa: 'தொழில்முறை சேவை',
          serialNumber: serial,
          atTag: `@${serial}`,
          title: prof.serviceTitle || prof.providerName,
          subtitle: `${prof.providerName} • ${prof.categoryName || ''} (${prof.locationName || ''})`,
          locationName: prof.locationName,
          phone: prof.providerPhone,
          photoUrl: prof.providerPhotoUrl,
          originalItem: prof,
        });
      }
    });
  }

  // 4. Search Users
  if (data.users && Array.isArray(data.users)) {
    data.users.forEach((user) => {
      if (!user) return;
      const serial = getEntitySerialNumber(user, 'user');
      const nameClean = (user?.name || '').toLowerCase();
      const nicClean = (user.nicNumber || '').toLowerCase();
      const phoneClean = (user.phone || '').toLowerCase();

      const isMatch =
        (searchDigits && (serial.includes(searchDigits) || nicClean.includes(searchDigits) || phoneClean.includes(searchDigits))) ||
        (rawTerm && nameClean.includes(rawTerm));

      if (isMatch) {
        matches.push({
          entityType: 'user',
          entityTypeNameSi: 'පරිශීලක (User Account)',
          entityTypeNameEn: 'User Profile',
          entityTypeNameTa: 'பயனர் கணக்கு',
          serialNumber: serial,
          atTag: `@${serial}`,
          title: user?.name || 'පරිශීලක',
          subtitle: `NIC: ${user.nicNumber ? `${user.nicNumber.slice(0, 5)}****` : '***'} • ${user.nearestTown || user.district || 'ශ්‍රී ලංකාව'}`,
          locationName: user.nearestTown || user.district,
          phone: user.phone,
          photoUrl: user.photoUrl,
          originalItem: user,
        });
      }
    });
  }

  return matches;
}
