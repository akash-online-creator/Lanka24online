import { MarketItem, MarketShop, WeekSchedule } from '../types';

const defaultWeekSchedule: WeekSchedule = {
  monday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  tuesday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  wednesday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  thursday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  friday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  saturday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
  sunday: { isOpen: false, openTime: '09:00', closeTime: '14:00' }
};

export const initialMarketItems: MarketItem[] = [
  {
    id: 'mkt_seller_1',
    type: 'seller_item',
    title: 'නැවුම් කීරි සම්බා සහල් (Keeri Samba Rice)',
    tagName: 'කෑම / බීම',
    tagCategory: 'ආහාර, පෝෂණ',
    price: 240,
    quantity: '500 kg',
    availableDateType: 'today',
    saleTypes: ['wholesale', 'retail'],
    hasWarranty: false,
    expiryDate: '2026-12-31',
    expiryNote: 'නැවුම් අස්වැන්න, කෘමිනාශක තොරව ඇසුරුම් කර ඇත',
    deliveryOption: 'pickup',
    pickupLocation: {
      name: 'කඩවත ප්‍රධාන සහල් තොග වෙළඳ මධ්‍යස්ථානය',
      address: 'නුවර පාර, කඩවත',
      lat: 6.9984,
      lng: 79.9542,
      note: 'උදෑසන 8:00 සිට සවස 6:00 දක්වා ලබාගත හැක'
    },
    notes: 'තොග මිලදී ගැනීම් සඳහා ප්‍රවාහන පහසුකම් සලසා දිය හැක. අවම තොග ඇණවුම 50kg.',
    userId: '970181547V',
    userName: 'සුනිල් ශාන්ත (Sunil Shantha)',
    userPhone: '0771234567',
    showWhatsapp: true,
    whatsappNumber: '0771234567',
    locationName: 'කඩවත, නුවර පාර',
    distanceKm: 1.2,
    lat: 6.9984,
    lng: 79.9542,
    createdAt: 'අද පෙ.ව. 09:30',
    createdAtMs: Date.now() - 3600 * 1000 * 3
  },
  {
    id: 'mkt_seller_2',
    type: 'seller_item',
    title: 'සූර්ය බලශක්ති ඉන්වර්ටර් (Hybrid Solar Inverter 5kW)',
    tagName: 'කාර්මික',
    tagCategory: 'Mechanical, Repair',
    price: 185000,
    quantity: '4 Units',
    availableDateType: 'today',
    saleTypes: ['retail', 'exchange'],
    barterNeeds: '3kVA Petrol Generator හෝ Lithium Battery Pack',
    barterQuantity: '1 Unit',
    hasWarranty: true,
    warrantyPeriod: 'අවුරුදු 3ක පූර්ණ වගකීමක් සහිතයි',
    deliveryOption: 'seller_deliver',
    notes: 'Brand new condition. ජර්මන් තාක්ෂණයෙන් නිපදවන ලද hybrid inverter. ස්ථාපනය කරදීමේ හැකියාවද ඇත.',
    userId: 'usr_gam_tech',
    userName: 'ගම්පහ සෝලාර් ටෙක්නොලොජිස්',
    userPhone: '0714567890',
    showWhatsapp: true,
    whatsappNumber: '0714567890',
    locationName: 'ගම්පහ, මිරිස්වත්ත',
    distanceKm: 4.8,
    lat: 7.0873,
    lng: 79.9925,
    createdAt: 'අද පෙ.ව. 10:45',
    createdAtMs: Date.now() - 3600 * 1000 * 2
  },
  {
    id: 'mkt_seller_3',
    type: 'seller_item',
    title: 'ගැල්වනයිස් වහල තහඩු (Galvanized Roofing Sheets 10ft)',
    tagName: 'Roof Repair',
    tagCategory: 'වහල හා ගෘහ නඩත්තුව',
    price: 3200,
    quantity: '120 Sheets',
    availableDateType: 'today',
    saleTypes: ['wholesale', 'retail', 'exchange'],
    barterNeeds: 'යකඩ පයිප්ප හෝ C-Channel යකඩ',
    barterQuantity: 'සමාන වටිනාකමකින් යුත්',
    hasWarranty: true,
    warrantyPeriod: 'වසර 10 ක මලකඩ නොකන වගකීම',
    deliveryOption: 'paid_shipping',
    notes: 'අවශ්‍ය ප්‍රමාණයට කපා ලබාදිය හැක. ලොරි රථ මගින් ප්‍රවාහනය කළ හැක.',
    userId: 'usr_kel_hard',
    userName: 'කැලණිය මෙටල් & හාඩ්වෙයාර්',
    userPhone: '0768901234',
    showWhatsapp: true,
    whatsappNumber: '0768901234',
    locationName: 'කැලණිය, බියගම පාර',
    distanceKm: 3.5,
    lat: 6.9553,
    lng: 79.9153,
    createdAt: 'ඊයේ ප.ව. 04:15',
    createdAtMs: Date.now() - 3600 * 1000 * 18
  },
  {
    id: 'mkt_seller_4',
    type: 'seller_item',
    title: 'නැවුම් ස්වභාවික පොල්තෙල් (Pure Virgin Coconut Oil)',
    tagName: 'කෑම / බීම',
    tagCategory: 'ආහාර, පෝෂණ',
    price: 750,
    quantity: '100 Liters',
    availableDateType: 'today',
    saleTypes: ['wholesale', 'retail'],
    hasWarranty: false,
    expiryDate: '2027-06-30',
    expiryNote: '100% ස්වභාවික, කල්තබා ගැනීමේ ද්‍රව්‍ය අඩංගු නොවේ',
    deliveryOption: 'free_shipping',
    notes: 'ලීටර් 5 ට වඩා වැඩි ඇණවුම් සඳහා දිවයින පුරා නොමිලේ ඩිලිවරි පහසුකම්.',
    userId: 'usr_coco_lanka',
    userName: 'ලංකා කොකෝනට් ප්‍රඩක්ට්ස්',
    userPhone: '0723344556',
    showWhatsapp: true,
    whatsappNumber: '0723344556',
    locationName: 'කටුනායක, මිනුවන්ගොඩ පාර',
    distanceKm: 8.5,
    lat: 7.1698,
    lng: 79.8898,
    createdAt: 'අද පෙ.ව. 08:00',
    createdAtMs: Date.now() - 3600 * 1000 * 5
  },
  {
    id: 'mkt_seller_5',
    type: 'seller_item',
    title: 'නැවුම් කීරි සම්බා සහල් (Keeri Samba Rice)',
    tagName: 'කෑම / බීම',
    tagCategory: 'ආහාර, පෝෂණ',
    price: 260,
    quantity: '200 kg',
    availableDateType: 'today',
    saleTypes: ['retail'],
    hasWarranty: false,
    expiryDate: '2026-11-30',
    deliveryOption: 'seller_deliver',
    notes: 'පිරිසිදු කර ඔප දැමූ පොළොන්නරුවේ සහල්. 5kg, 10kg ඇසුරුම්.',
    userId: 'usr_polonnaruwa_rice',
    userName: 'රාජරට සහල් අලෙවිසැල (කමල් පෙරේරා)',
    userPhone: '0718899001',
    showWhatsapp: true,
    whatsappNumber: '0718899001',
    locationName: 'කිරිබත්ගොඩ නගරය',
    distanceKm: 2.5,
    lat: 6.9784,
    lng: 79.9284,
    createdAt: 'අද පෙ.ව. 07:15',
    createdAtMs: Date.now() - 3600 * 1000 * 6
  },
  {
    id: 'mkt_seller_6',
    type: 'seller_item',
    title: 'නැවුම් කීරි සම්බා සහල් (Keeri Samba Rice)',
    tagName: 'කෑම / බීම',
    tagCategory: 'ආහාර, පෝෂණ',
    price: 285,
    quantity: '150 kg',
    availableDateType: 'today',
    saleTypes: ['retail'],
    hasWarranty: false,
    expiryDate: '2026-10-31',
    deliveryOption: 'free_shipping',
    notes: 'වාරිකව ගෙදරටම ඩිලිවරි කරනු ලැබේ.',
    userId: 'usr_city_mart',
    userName: 'සිටි මාර්ට් සුපර් සෙන්ටර් (චතුර)',
    userPhone: '0754433221',
    showWhatsapp: true,
    whatsappNumber: '0754433221',
    locationName: 'කඩවත, ඇල්දෙණිය',
    distanceKm: 0.9,
    lat: 6.9920,
    lng: 79.9490,
    createdAt: 'ඊයේ ප.ව. 06:00',
    createdAtMs: Date.now() - 3600 * 1000 * 14
  },
  {
    id: 'mkt_seller_7',
    type: 'seller_item',
    title: 'සූර්ය බලශක්ති ඉන්වර්ටර් (Hybrid Solar Inverter 5kW)',
    tagName: 'කාර්මික',
    tagCategory: 'Mechanical, Repair',
    price: 198000,
    quantity: '2 Units',
    availableDateType: 'today',
    saleTypes: ['retail'],
    hasWarranty: true,
    warrantyPeriod: 'අවුරුදු 5 ක වගකීමක් සහිතයි',
    deliveryOption: 'free_shipping',
    notes: 'Growatt සන්නාමයේ ඔරිජිනල් ඉන්වර්ටර්. නොමිලේ නිවසටම ප්‍රවාහනය සහ උපදේශනය.',
    userId: 'usr_sun_power',
    userName: 'සන් පවර් ඉංජිනේරු සේවා (මහේෂ් ප්‍රනාන්දු)',
    userPhone: '0773344112',
    showWhatsapp: true,
    whatsappNumber: '0773344112',
    locationName: 'කැලණිය, වනවාසල',
    distanceKm: 4.1,
    lat: 6.9650,
    lng: 79.9100,
    createdAt: 'අද පෙ.ව. 11:00',
    createdAtMs: Date.now() - 3600 * 1000 * 1
  },
  {
    id: 'mkt_seller_8',
    type: 'seller_item',
    title: 'නැවුම් ස්වභාවික පොල්තෙල් (Pure Virgin Coconut Oil)',
    tagName: 'කෑම / බීම',
    tagCategory: 'ආහාර, පෝෂණ',
    price: 820,
    quantity: '50 Liters',
    availableDateType: 'today',
    saleTypes: ['retail'],
    hasWarranty: false,
    expiryDate: '2027-01-01',
    deliveryOption: 'pickup',
    notes: 'ගෙදරදීම සිඳින ලද 100% ක් පිරිසිදු පොල්තෙල්. ලීටර 1 බෝතල්.',
    userId: 'usr_gam_oil',
    userName: 'ගම්බද තෙල් මෝල (සරත්)',
    userPhone: '0789900112',
    showWhatsapp: true,
    whatsappNumber: '0789900112',
    locationName: 'ගම්පහ නගරය',
    distanceKm: 5.2,
    lat: 7.0873,
    lng: 79.9925,
    createdAt: 'ඊයේ ප.ව. 01:30',
    createdAtMs: Date.now() - 3600 * 1000 * 21
  },
  {
    id: 'mkt_buyer_1',
    type: 'buyer_request',
    title: 'අඩි 20 කන්ටේනර් පෙට්ටියක් (20ft Used Storage Container)',
    tagName: 'කාර්මික',
    tagCategory: 'Mechanical, Repair',
    quantity: '1 Unit',
    availableDateType: 'today',
    saleTypes: ['retail'],
    deliveryOption: 'seller_deliver',
    notes: 'ගබඩා කාමරයක් සඳහා හොඳ තත්ත්වයේ පවතින 20ft කන්ටේනරයක් අවශ්‍යයි. ප්‍රවාහනය කරදිය හැකිනම් වඩාත් සුදුසුයි.',
    userId: 'usr_dam_01',
    userName: 'දමිත් විජේසිංහ',
    userPhone: '0779988776',
    showWhatsapp: true,
    whatsappNumber: '0779988776',
    locationName: 'කඩවත, ගණේමුල්ල පාර',
    distanceKm: 2.1,
    lat: 7.0012,
    lng: 79.9612,
    createdAt: 'අද පෙ.ව. 11:20',
    createdAtMs: Date.now() - 3600 * 1000 * 1
  },
  {
    id: 'mkt_buyer_2',
    type: 'buyer_request',
    title: 'Organic කෙසෙල් (ඇඹුල් / කෝලිකුට්ටු) තොග වශයෙන්',
    tagName: 'කෑම / බීම',
    tagCategory: 'ආහාර, පෝෂණ',
    quantity: '250 kg',
    availableDateType: 'custom',
    availableDate: '2026-09-05',
    saleTypes: ['wholesale'],
    deliveryOption: 'pickup',
    notes: 'පළතුරු අලෙවිසැලකට සතිපතා තොග වශයෙන් ලබාගත හැකි විශ්වාසවන්ත සැපයුම්කරුවෙකු අවශ්‍යයි.',
    userId: 'usr_fresh_market',
    userName: 'ෆ්‍රෙෂ් මාර්ට් අලෙවිසැල',
    userPhone: '0711122334',
    showWhatsapp: true,
    whatsappNumber: '0711122334',
    locationName: 'කැලණිය නගරය',
    distanceKm: 3.8,
    lat: 6.9553,
    lng: 79.9153,
    createdAt: 'ඊයේ ප.ව. 02:30',
    createdAtMs: Date.now() - 3600 * 1000 * 20
  }
];

export const initialMarketShops: MarketShop[] = [
  {
    id: 'mkt_shop_1',
    type: 'shop',
    mode: 'shop',
    name: 'ලංකා ඉලෙක්ට්‍රොනික්ස් & හෝම් ඇප්ලයන්ස් (Lanka Electronics)',
    location: {
      name: 'කඩවත ප්‍රධාන බස් නැවතුම ඉදිරිපිට',
      address: 'නො. 142, නුවර පාර, කඩවත',
      lat: 6.9984,
      lng: 79.9542,
      note: 'වාහන නැවැත්වීමේ පහසුකම් ඇත'
    },
    schedulePreset: 'everyday',
    schedule: {
      ...defaultWeekSchedule,
      sunday: { isOpen: true, openTime: '09:00', closeTime: '16:00' }
    },
    inventory: [
      { id: 'inv_1', name: 'LED Smart TV 32-inch', quantity: '15 Units', price: 42500, saleType: 'retail' },
      { id: 'inv_2', name: 'Rechargeable Emergency Fans', quantity: '50 Units', price: 7800, saleType: 'both' },
      { id: 'inv_3', name: 'Induction Cooker 2200W', quantity: '20 Units', price: 9500, saleType: 'retail' }
    ],
    categoryTag: 'කාර්මික',
    email: 'contact@lankaelec.lk',
    websiteUrl: 'https://lankaelec.lk',
    facebookUrl: 'https://facebook.com/lankaelectronics',
    tiktokUrl: 'https://tiktok.com/@lankaelec',
    youtubeUrl: 'https://youtube.com/@lankaelectronics',
    showWhatsapp: true,
    whatsappNumber: '0772233445',
    chatEnabled: true,
    userId: '970181547V',
    userName: 'කපිල කුමාර (Kapila Kumara)',
    userPhone: '0772233445',
    createdAt: '2026-08-25',
    createdAtMs: Date.now() - 7 * 24 * 3600 * 1000
  },
  {
    id: 'mkt_shop_2',
    type: 'shop',
    mode: 'online',
    name: 'සහන් ඇග්‍රෝ ෆාම් & නර්සරි (Sahan Agro Plants)',
    location: {
      name: 'ගම්පහ මල්වත්ත පාර',
      address: 'මල්වත්ත පාර, ගම්පහ',
      lat: 7.0873,
      lng: 79.9925,
      note: 'Online ඇණවුම් කුරියර් මගින් නිවසටම එවනු ලැබේ'
    },
    schedulePreset: 'no_poya',
    schedule: defaultWeekSchedule,
    inventory: [
      { id: 'inv_4', name: 'බද්ධ කළ පළතුරු පැළ (Hybrid Fruit Plants)', quantity: '300 Plants', price: 450, saleType: 'both' },
      { id: 'inv_5', name: 'Organic දියර පොහොර 1L (Bio Fertilizer)', quantity: '80 Bottles', price: 650, saleType: 'wholesale' },
      { id: 'inv_6', name: 'Grow Bags (16x16)', quantity: '500 Bags', price: 85, saleType: 'both' }
    ],
    categoryTag: 'පරිසර',
    email: 'sahanplants@gmail.com',
    websiteUrl: 'https://sahanagro.lk',
    facebookUrl: 'https://facebook.com/sahanagro',
    showWhatsapp: true,
    whatsappNumber: '0715566778',
    chatEnabled: true,
    userId: 'usr_sahan_agro',
    userName: 'සහන් රණසිංහ',
    userPhone: '0715566778',
    createdAt: '2026-08-28',
    createdAtMs: Date.now() - 4 * 24 * 3600 * 1000
  },
  {
    id: 'mkt_biz_1',
    type: 'business',
    mode: 'shop',
    name: 'රෝයල් මොටර්ස් වාහන සේවා මධ්‍යස්ථානය (Royal Motors Auto Care)',
    location: {
      name: 'කැලණිය පාලම අසල',
      address: 'නො. 88, නුවර පාර, පෑලියගොඩ',
      lat: 6.9553,
      lng: 79.9153,
      note: 'පූර්ණ වායු සමීකරණය කළ පාරිභෝගික විවේකාගාරය'
    },
    schedulePreset: 'weekdays_only',
    schedule: defaultWeekSchedule,
    inventory: [
      { id: 'inv_7', name: 'Full Engine Tuneup & Diagnostics', quantity: 'Service', price: 6500, saleType: 'retail' },
      { id: 'inv_8', name: 'Synthetic Engine Oil 4L (Japanese)', quantity: '40 Cans', price: 14500, saleType: 'both' },
      { id: 'inv_9', name: 'Wheel Alignment & Balancing', quantity: 'Service', price: 3500, saleType: 'retail' }
    ],
    categoryTag: 'වාහන අලුත්වැඩියාව',
    email: 'service@royalmotors.lk',
    websiteUrl: 'https://royalmotors.lk',
    facebookUrl: 'https://facebook.com/royalmotorslk',
    youtubeUrl: 'https://youtube.com/@royalmotorscare',
    showWhatsapp: true,
    whatsappNumber: '0761122334',
    chatEnabled: true,
    userId: 'usr_royal_auto',
    userName: 'නිශාන්ත ප්‍රනාන්දු',
    userPhone: '0761122334',
    createdAt: '2026-08-20',
    createdAtMs: Date.now() - 12 * 24 * 3600 * 1000
  },
  {
    id: 'mkt_biz_2',
    type: 'business',
    mode: 'shop',
    name: 'ගෝල්ඩන් ප්‍රින්ටර්ස් & ඇඩ්වර්ටයිසින් (Golden Printers & Signboards)',
    location: {
      name: 'ගම්පහ නගර සභාව අසල',
      address: 'නො. 22, ප්‍රධාන වීදිය, ගම්පහ',
      lat: 7.0873,
      lng: 79.9925,
      note: 'දිවයින පුරා කටවුට් සහ සයින්බෝඩ් සවිකර දෙනු ලැබේ'
    },
    schedulePreset: 'everyday',
    schedule: defaultWeekSchedule,
    inventory: [
      { id: 'inv_10', name: 'Digital Flex Banners (per sq.ft)', quantity: 'Custom Order', price: 110, saleType: 'both' },
      { id: 'inv_11', name: '3D Light Signboards', quantity: 'Custom Order', price: 28000, saleType: 'retail' },
      { id: 'inv_12', name: 'Visiting Cards (1000 Pcs Box)', quantity: 'Per Box', price: 3200, saleType: 'wholesale' }
    ],
    categoryTag: 'වෘත්තීය සේවා',
    email: 'info@goldenprinters.lk',
    facebookUrl: 'https://facebook.com/goldenprinters',
    showWhatsapp: true,
    whatsappNumber: '0789900112',
    chatEnabled: true,
    userId: 'usr_golden_p',
    userName: 'මහේෂ් කුලතුංග',
    userPhone: '0789900112',
    createdAt: '2026-08-22',
    createdAtMs: Date.now() - 10 * 24 * 3600 * 1000
  }
];

const MARKET_ITEMS_KEY = 'sahaya_marketplace_items';
const MARKET_SHOPS_KEY = 'sahaya_marketplace_shops';

export function getStoredMarketItems(): MarketItem[] {
  try {
    const saved = localStorage.getItem(MARKET_ITEMS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge missing initial items
        const existingIds = new Set(parsed.map((p: MarketItem) => p.id));
        const missingDefaults = initialMarketItems.filter((it) => !existingIds.has(it.id));
        if (missingDefaults.length > 0) {
          const merged = [...parsed, ...missingDefaults];
          localStorage.setItem(MARKET_ITEMS_KEY, JSON.stringify(merged));
          return merged;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading market items:', e);
  }
  localStorage.setItem(MARKET_ITEMS_KEY, JSON.stringify(initialMarketItems));
  return initialMarketItems;
}

export function saveMarketItemsToStorage(items: MarketItem[]): void {
  localStorage.setItem(MARKET_ITEMS_KEY, JSON.stringify(items));
}

export function getStoredMarketShops(): MarketShop[] {
  try {
    const saved = localStorage.getItem(MARKET_SHOPS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading market shops:', e);
  }
  localStorage.setItem(MARKET_SHOPS_KEY, JSON.stringify(initialMarketShops));
  return initialMarketShops;
}

export function saveMarketShopsToStorage(shops: MarketShop[]): void {
  localStorage.setItem(MARKET_SHOPS_KEY, JSON.stringify(shops));
}
