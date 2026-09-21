// High precision Sri Lanka localities database & Reverse Geocoding Utility
// Order strictly mandated by user: 1. Village Name (ගමේ නම), 2. Road Name (මාර්ගයේ නම), 3. Town / City (නගරය)

import { LocationOption } from '../types';

export interface GeoResolvedLocation {
  village: string;
  villageSi: string;
  villageEn: string;
  road: string;
  roadSi: string;
  roadEn: string;
  town: string;
  townSi: string;
  townEn: string;
  district: string;
  districtSi: string;
  districtEn: string;
  province: string;
  fullAddressSi: string;
  fullAddressEn: string;
  shortDisplaySi: string; // "ගමේ නම, මාර්ගයේ නම, නගරය"
  shortDisplayEn: string; // "Village, Road, Town"
  lat: number;
  lng: number;
  accuracy?: number;
}

// Comprehensive Sinhala Translation Dictionary for Sri Lankan Localities & Places
export const SRI_LANKA_TRANSLATIONS: Record<string, string> = {
  // Katunayake, Kovinna, Negombo & Airport Area
  'kovinna': 'කෝවින්න',
  'gangarama': 'ගංගාරාම',
  'gangarama road': 'ගංගාරාම පාර',
  'gangarama mawatha': 'ගංගාරාම මාවත',
  'sri gangarama': 'ශ්‍රී ගංගාරාම',
  'sri gangarama road': 'ශ්‍රී ගංගාරාම පාර',
  'sri gangarama mawatha': 'ශ්‍රී ගංගාරාම මාවත',
  'kalahapitiya': 'කලහපිටිය',
  'amarakoon': 'අමරකෝන්',
  'amarakoona': 'අමරකෝන්',
  'amarakoon mawatha': 'අමරකෝන් මාවත',
  'amarakoon road': 'අමරකෝන් පාර',
  'sunandarama': 'සුනන්දාරාම',
  'sunandarama mawatha': 'සුනන්දාරාම මාවත',
  'dewala': 'දෙවොල',
  'devala': 'දෙවොල',
  'dewala road': 'දෙවොල පාර',
  'jayawardena': 'ජයවර්ධන',
  'jayawardana': 'ජයවර්ධන',
  'jayawardena mawatha': 'ජයවර්ධන මාවත',
  'bandaranayake': 'බණ්ඩාරනායක',
  'bandaranaike': 'බණ්ඩාරනායක',
  'wijerama': 'විජේරාම',
  'senanayake': 'සේනානායක',
  'averiwatta': 'අවිරිවත්ත',
  'awariwatte': 'අවිරිවත්ත',
  'awariwatta': 'අවිරිවත්ත',
  'amandoluwa': 'අමන්දොළුව',
  'katunayake': 'කටුනායක',
  'katunayaka': 'කටුනායක',
  'kotugoda': 'කොටුගොඩ',
  'seeduwa': 'සීදූව',
  'mukalangamuwa': 'මුකලන්ගමුව',
  'raddolugama': 'රද්දොළුගම',
  'kurana': 'කුරාණ',
  'kimbulapitiya': 'කිඹුලාපිටිය',
  'andiambalama': 'ඇන්ඩියම්බලම',
  'tempola': 'තෙම්පොල',
  'liyanagemulla': 'ලියනගේමුල්ල',
  'ja-ela': 'ජා-ඇල',
  'ja ela': 'ජා-ඇල',
  'kandana': 'කඳාන',
  'nagoda': 'නාගොඩ',
  'tudella': 'තුඩැල්ල',
  'kapuwatta': 'කපුවත්ත',
  'batagama': 'බටගම',
  'ragama': 'රාගම',
  'welisara': 'වැලිසර',
  'mahabage': 'මහබාගේ',
  'wattala': 'වත්තල',
  'hendala': 'හැඳල',
  'mabola': 'මාබෝල',
  'negombo': 'මීගමුව',
  'kochchikade': 'කොච්චිකඩේ',
  'dalupotha': 'දළුපොත',
  'katana': 'කටාන',
  'daluwakotuwa': 'දළුවකොටුව',
  'waikkala': 'වයික්කාල',
  'bolawatta': 'බෝලවත්ත',
  'minuwangoda': 'මිනුවන්ගොඩ',
  'divulapitiya': 'දිවුලපිටිය',
  'mirigama': 'මීරිගම',
  'veyangoda': 'වේයන්ගොඩ',
  'nittambuwa': 'නිට්ටඹුව',
  'pasyala': 'පස්යාල',
  'gampaha': 'ගම්පහ',
  'yakkala': 'යක්කල',
  'kadawatha': 'කඩවත',
  'kiribathgoda': 'කිරිබත්ගොඩ',
  'kelaniya': 'කැළණිය',
  'peliyagoda': 'පෑලියගොඩ',
  'mahara': 'මහර',
  'biyagama': 'බියගම',
  'malwana': 'මල්වාන',
  'ganemulla': 'ගණේමුල්ල',
  'udugampola': 'උඩුගම්පොළ',
  'weliweriya': 'වැලිවේරිය',
  'delgoda': 'දෙල්ගොඩ',

  // Colombo Area
  'colombo': 'කොළඹ',
  'colombo fort': 'කොළඹ කොටුව',
  'fort': 'කොටුව',
  'pettah': 'පිටකොටුව',
  'maradana': 'මරදාන',
  'kollupitiya': 'කොල්ලුපිටිය',
  'bambalapitiya': 'බම්බලපිටිය',
  'wellawatte': 'වැල්ලවත්ත',
  'cinnamon gardens': 'කුරුඳුගහ (කොළඹ 07)',
  'borella': 'බොරැල්ල',
  'dematagoda': 'දෙමටගොඩ',
  'grandpass': 'ග්‍රෑන්ඩ්පාස්',
  'kotahena': 'කොටහේන',
  'mutwal': 'මට්ටක්කුලිය',
  'nugegoda': 'නුගේගොඩ',
  'dehiwala': 'දෙහිවල',
  'mount lavinia': 'ගල්කිස්ස',
  'ratmalana': 'රත්මලාන',
  'moratuwa': 'මොරටුව',
  'maharagama': 'මහරගම',
  'kottawa': 'කොට්ටාව',
  'pannipitiya': 'පන්නිපිටිය',
  'homagama': 'හෝමාගම',
  'godagama': 'ගොඩගම',
  'padukka': 'පාදුක්ක',
  'hanwella': 'හංවැල්ල',
  'avissawella': 'අවිස්සාවේල්ල',
  'kotte': 'කෝට්ටේ',
  'sri jayawardenepura kotte': 'ශ්‍රී ජයවර්ධනපුර කෝට්ටේ',
  'battaramulla': 'බත්තරමුල්ල',
  'rajagiriya': 'රාජගිරිය',
  'nawala': 'නාවල',
  'pelawatte': 'පැලවත්ත',
  'thalawathugoda': 'තලවතුගොඩ',
  'malabe': 'මාලබේ',
  'kaduwela': 'කඩුවෙල',
  'athurugiriya': 'අතුරුගිරිය',
  'hokandara': 'හෝකන්දර',
  'piliyandala': 'පිළියන්දල',
  'kesbewa': 'කැස්බෑව',

  // Kalutara District
  'panadura': 'පානදුර',
  'wadduwa': 'වාද්දූව',
  'kalutara': 'කළුතර',
  'beruwala': 'බේරුවල',
  'aluthgama': 'අලුත්ගම',
  'matugama': 'මතුගම',
  'bandaragama': 'බණ්ඩාරගම',
  'horana': 'හොරණ',

  // Other Major Cities & Districts
  'kandy': 'මහනුවර',
  'peradeniya': 'පේරාදෙණිය',
  'katugastota': 'කටුගස්තොට',
  'gampola': 'ගම්පොළ',
  'galle': 'ගාල්ල',
  'hikkaduwa': 'හික්කඩුව',
  'karapitiya': 'කරාපිටිය',
  'unawatuna': 'උණවටුන',
  'matara': 'මාතර',
  'weligama': 'වැලිගම',
  'akuressa': 'අකුරැස්ස',
  'tangalle': 'තංගල්ල',
  'hambantota': 'හම්බන්තොට',
  'kurunegala': 'කුරුණෑගල',
  'kuliyapitiya': 'කුලියාපිටිය',
  'chilaw': 'හලාවත',
  'marawila': 'මාරවිල',
  'wennappuwa': 'වෙන්නප්පුව',
  'puttalam': 'පුත්තලම',
  'anuradhapura': 'අනුරාධපුරය',
  'polonnaruwa': 'පොළොන්නරුව',
  'ratnapura': 'රත්නපුර',
  'kegalle': 'කෑගල්ල',
  'mawanella': 'මාවනැල්ල',
  'warakapola': 'වරකපොළ',
  'badulla': 'බදුල්ල',
  'bandarawela': 'බණ්ඩාරවෙල',
  'ella': 'ඇල්ල',
  'jaffna': 'යාපනය',
  'vavuniya': 'වවුනියාව',
  'trincomalee': 'ත්‍රිකුණාමලය',
  'batticaloa': 'මඩකලපුව',
  'ampara': 'අම්පාර',

  // Districts
  'gampaha district': 'ගම්පහ',
  'colombo district': 'කොළඹ',
  'kalutara district': 'කළුතර',
  'kandy district': 'මහනුවර',
  'galle district': 'ගාල්ල',
  'matara district': 'මාතර',
  'kurunegala district': 'කුරුණෑගල',
  'western province': 'බස්නාහිර පළාත',
  'central province': 'මධ්‍යම පළාත',
  'southern province': 'දකුණු පළාත',
  'north western province': 'වයඹ පළාත',
};

// Convert English locality name to Sinhala
export function toSinhalaName(name: string): string {
  if (!name) return '';
  const clean = name.replace(/district/gi, '').replace(/province/gi, '').trim();
  const key = clean.toLowerCase();
  if (SRI_LANKA_TRANSLATIONS[key]) {
    return SRI_LANKA_TRANSLATIONS[key];
  }
  for (const [k, v] of Object.entries(SRI_LANKA_TRANSLATIONS)) {
    if (key === k || key.startsWith(k + ' ') || key.endsWith(' ' + k)) {
      return v;
    }
  }
  return clean;
}

// Convert English road name to high-quality Sinhala
export function toSinhalaRoadName(road: string, villageHintSi?: string): string {
  if (!road || road.trim() === '') {
    if (villageHintSi) {
      return `${villageHintSi} ප්‍රධාන පාර`;
    }
    return 'ප්‍රධාන පාර';
  }

  let text = road.trim();

  // If already in Sinhala
  if (/[\u0D80-\u0DFF]/.test(text)) {
    if (!text.includes('පාර') && !text.includes('මාවත') && !text.includes('වීදිය') && !text.includes('පටුමග')) {
      return `${text} පාර`;
    }
    return text;
  }

  // Common Road Keywords mapping
  const roadReplacements: [RegExp, string][] = [
    [/\b(sri\s*)?gangarama\s*(mawatha|mw\.?|road|rd\.?)\b/gi, 'ගංගාරාම පාර'],
    [/\bgangarama\b/gi, 'ගංගාරාම පාර'],
    [/\bamarakoon\s*(mawatha|mw\.?|road|rd\.?)\b/gi, 'අමරකෝන් මාවත'],
    [/\b(sri\s*)?sunandarama\s*(mawatha|mw\.?|road|rd\.?)\b/gi, 'ශ්‍රී සුනන්දාරාම මාවත'],
    [/\bdewala\s*(road|rd\.?)\b/gi, 'දෙවොල පාර'],
    [/\bdevala\s*(road|rd\.?)\b/gi, 'දෙවොල පාර'],
    [/\bjayawardena\s*(mawatha|mw\.?|road|rd\.?)\b/gi, 'ජයවර්ධන මාවත'],
    [/\bjayawardana\s*(mawatha|mw\.?|road|rd\.?)\b/gi, 'ජයවර්ධන මාවත'],
    [/\bbandaranayake\s*(mawatha|mw\.?|road|rd\.?)\b/gi, 'බණ්ඩාරනායක මාවත'],
    [/\bwijerama\s*(mawatha|mw\.?|road|rd\.?)\b/gi, 'විජේරාම මාවත'],
    [/\bsenanayake\s*(mawatha|mw\.?|road|rd\.?)\b/gi, 'සේනානායක මාවත'],
    [/\bkovinna\s*-\s*kalahapitiya\s*road\b/gi, 'කෝවින්න - කලහපිටිය පාර'],
    [/\bkovinna\s*kalahapitiya\s*road\b/gi, 'කෝවින්න - කලහපිටිය පාර'],
    [/\bkalahapitiya\s*road\b/gi, 'කලහපිටිය පාර'],
    [/\bkovinna\s*road\b/gi, 'කෝවින්න පාර'],
    [/\bkovinna\s*(pansala|temple)\s*road\b/gi, 'කෝවින්න පන්සල පාර'],
    [/\bairport\s*road\b/gi, 'ගුවන්තොටුපල පාර'],
    [/\bcolombo\s*-\s*negombo\s*(main\s*)?road\b/gi, 'කොළඹ - මීගමුව ප්‍රධාන පාර'],
    [/\bnegombo\s*(main\s*)?road\b/gi, 'මීගමුව පාර'],
    [/\bcolombo\s*(main\s*)?road\b/gi, 'කොළඹ පාර'],
    [/\bkandy\s*(main\s*)?road\b/gi, 'නුවර පාර'],
    [/\bgalle\s*(main\s*)?road\b/gi, 'ගාලු පාර'],
    [/\bhigh\s*level\s*road\b/gi, 'හයිලෙවල් පාර'],
    [/\blow\s*level\s*road\b/gi, 'ලෝලෙවල් පාර'],
    [/\bbaseline\s*road\b/gi, 'බේස්ලයින් පාර'],
    [/\bminuwangoda\s*road\b/gi, 'මිනුවන්ගොඩ පාර'],
    [/\bkotugoda\s*road\b/gi, 'කොටුගොඩ පාර'],
    [/\bawariwatta\s*road\b/gi, 'අවිරිවත්ත පාර'],
    [/\baveriwatta\s*road\b/gi, 'අවිරිවත්ත පාර'],
    [/\bamandoluwa\s*road\b/gi, 'අමන්දොළුව පාර'],
    [/\bandiambalama\s*road\b/gi, 'ඇන්ඩියම්බලම පාර'],
    [/\braddolugama\s*road\b/gi, 'රද්දොළුගම පාර'],
    [/\bseeduwa\s*road\b/gi, 'සීදූව පාර'],
    [/\bstation\s*road\b/gi, 'දුම්රියපොළ පාර'],
    [/\btemple\s*road\b/gi, 'පන්සල පාර'],
    [/\bchurch\s*road\b/gi, 'පල්ලිය පාර'],
    [/\bhospital\s*road\b/gi, 'රෝහල පාර'],
    [/\bschool\s*lane\b/gi, 'පාසල් පටුමග'],
    [/\bschool\s*road\b/gi, 'පාසල් පාර'],
    [/\bpost\s*office\s*road\b/gi, 'තැපැල් කාර්යාල පාර'],
    [/\bmain\s*street\b/gi, 'ප්‍රධාන වීදිය'],
    [/\bsea\s*street\b/gi, 'මුහුදු වීදිය'],
    [/\bexpressway\b/gi, 'අධිවේගී මාර්ගය'],
    [/\bhighway\b/gi, 'අධිවේගී මාර්ගය'],
  ];

  for (const [pattern, replacement] of roadReplacements) {
    if (pattern.test(text)) {
      return text.replace(pattern, replacement);
    }
  }

  // Token-by-token Sinhala replacement
  let converted = text;
  for (const [k, v] of Object.entries(SRI_LANKA_TRANSLATIONS)) {
    const reg = new RegExp(`\\b${k}\\b`, 'gi');
    converted = converted.replace(reg, v);
  }

  // Replace road suffixes
  converted = converted
    .replace(/\b(road|rd\.?)\b/gi, 'පාර')
    .replace(/\b(mawatha|mw\.?|mwt)\b/gi, 'මාවත')
    .replace(/\b(lane|ln\.?)\b/gi, 'පටුමග')
    .replace(/\b(street|st\.?)\b/gi, 'වීදිය')
    .replace(/\b(avenue|ave\.?)\b/gi, 'මාවත')
    .replace(/\b(place|pl\.?)\b/gi, 'පෙදෙස')
    .replace(/\b(drive|dr\.?)\b/gi, 'මාවත')
    .replace(/\b(cross\s*road|cross\s*street)\b/gi, 'හරස් පාර')
    .replace(/\b(circular\s*road)\b/gi, 'වටරවුම් පාර')
    .replace(/\b(main\s*road)\b/gi, 'ප්‍රධාන පාර')
    .replace(/\b(old\s*road)\b/gi, 'පැරණි පාර')
    .replace(/\b(new\s*road)\b/gi, 'නව පාර')
    .replace(/\b(by\s*road)\b/gi, 'අතුරු පාර');

  // If after conversion it still doesn't end with a road suffix, add "පාර"
  if (!converted.includes('පාර') && !converted.includes('මාවත') && !converted.includes('වීදිය') && !converted.includes('පටුමග')) {
    converted = `${converted} පාර`;
  }

  return converted.replace(/\s+/g, ' ').trim();
}

// Micro-Grid Sri Lanka High Precision Localities Database with Verified Road & Village Coordinates
export interface HighPrecisionLocationEntry {
  villageSi: string;
  villageEn: string;
  roadSi: string;
  roadEn: string;
  townSi: string;
  townEn: string;
  districtSi: string;
  districtEn: string;
  province: string;
  lat: number;
  lng: number;
  radiusKm?: number;
}

export const HIGH_PRECISION_LOCALITIES: HighPrecisionLocationEntry[] = [
  // Kovinna, Kalahapitiya, Katunayake, Averiwatta Micro-Cluster
  {
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'ගංගාරාම පාර',
    roadEn: 'Gangarama Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1712,
    lng: 79.8978,
    radiusKm: 0.8,
  },
  {
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'ශ්‍රී ගංගාරාම මාවත',
    roadEn: 'Sri Gangarama Mawatha',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1715,
    lng: 79.8975,
    radiusKm: 0.8,
  },
  {
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'අමරකෝන් මාවත',
    roadEn: 'Amarakoon Mawatha',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1698,
    lng: 79.8990,
    radiusKm: 0.8,
  },
  {
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'ශ්‍රී සුනන්දාරාම මාවත',
    roadEn: 'Sri Sunandarama Mawatha',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1724,
    lng: 79.8962,
    radiusKm: 0.8,
  },
  {
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'දෙවොල පාර',
    roadEn: 'Dewala Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1685,
    lng: 79.8972,
    radiusKm: 0.8,
  },
  {
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'කෝවින්න පන්සල පාර',
    roadEn: 'Kovinna Temple Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1722,
    lng: 79.8960,
    radiusKm: 0.8,
  },
  {
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'කෝවින්න - කලහපිටිය පාර',
    roadEn: 'Kovinna - Kalahapitiya Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1718,
    lng: 79.9005,
    radiusKm: 0.8,
  },
  {
    villageSi: 'කලහපිටිය',
    villageEn: 'Kalahapitiya',
    roadSi: 'කලහපිටිය පාර',
    roadEn: 'Kalahapitiya Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1730,
    lng: 79.9030,
    radiusKm: 1.0,
  },
  {
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'ජයවර්ධන මාවත',
    roadEn: 'Jayawardena Mawatha',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1670,
    lng: 79.8940,
    radiusKm: 0.9,
  },
  {
    villageSi: 'අවිරිවත්ත',
    villageEn: 'Awariwatta',
    roadSi: 'අවිරිවත්ත පාර',
    roadEn: 'Awariwatta Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1650,
    lng: 79.8850,
    radiusKm: 1.5,
  },
  {
    villageSi: 'කටුනායක',
    villageEn: 'Katunayake',
    roadSi: 'ගුවන්තොටුපල පාර',
    roadEn: 'Airport Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1700,
    lng: 79.8900,
    radiusKm: 1.5,
  },
  {
    villageSi: 'කටුනායක',
    villageEn: 'Katunayake',
    roadSi: 'දුම්රියපොළ පාර',
    roadEn: 'Station Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1620,
    lng: 79.8820,
    radiusKm: 1.2,
  },
  {
    villageSi: 'කටුනායක',
    villageEn: 'Katunayake',
    roadSi: 'කොළඹ - මීගමුව ප්‍රධාන පාර',
    roadEn: 'Colombo - Negombo Main Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1610,
    lng: 79.8780,
    radiusKm: 2.0,
  },
  {
    villageSi: 'අමන්දොළුව',
    villageEn: 'Amandoluwa',
    roadSi: 'අමන්දොළුව පාර',
    roadEn: 'Amandoluwa Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1610,
    lng: 79.8930,
    radiusKm: 1.2,
  },
  {
    villageSi: 'තෙම්පොල',
    villageEn: 'Tempola',
    roadSi: 'තෙම්පොල පාර',
    roadEn: 'Tempola Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1580,
    lng: 79.9050,
    radiusKm: 1.2,
  },
  {
    villageSi: 'ඇන්ඩියම්බලම',
    villageEn: 'Andiambalama',
    roadSi: 'මිනුවන්ගොඩ පාර',
    roadEn: 'Minuwangoda Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1550,
    lng: 79.9150,
    radiusKm: 1.8,
  },
  {
    villageSi: 'කොටුගොඩ',
    villageEn: 'Kotugoda',
    roadSi: 'කොටුගොඩ - සීදූව පාර',
    roadEn: 'Kotugoda - Seeduwa Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1478,
    lng: 79.9290,
    radiusKm: 2.0,
  },

  // Seeduwa, Raddolugama & Ja-Ela Area
  {
    villageSi: 'මුකලන්ගමුව',
    villageEn: 'Mukalangamuwa',
    roadSi: 'දුම්රියපොළ පාර',
    roadEn: 'Station Road',
    townSi: 'සීදූව',
    townEn: 'Seeduwa',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1350,
    lng: 79.8810,
    radiusKm: 1.2,
  },
  {
    villageSi: 'සීදූව',
    villageEn: 'Seeduwa',
    roadSi: 'කොළඹ - මීගමුව ප්‍රධාන පාර',
    roadEn: 'Colombo - Negombo Main Road',
    townSi: 'සීදූව',
    townEn: 'Seeduwa',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1264,
    lng: 79.8833,
    radiusKm: 1.5,
  },
  {
    villageSi: 'රද්දොළුගම',
    villageEn: 'Raddolugama',
    roadSi: 'රද්දොළුගම ප්‍රධාන මාවත',
    roadEn: 'Raddolugama Main Avenue',
    townSi: 'සීදූව',
    townEn: 'Seeduwa',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1300,
    lng: 79.9100,
    radiusKm: 1.8,
  },
  {
    villageSi: 'ලියනගේමුල්ල',
    villageEn: 'Liyanagemulla',
    roadSi: 'කොළඹ පාර',
    roadEn: 'Colombo Road',
    townSi: 'සීදූව',
    townEn: 'Seeduwa',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1420,
    lng: 79.8820,
    radiusKm: 1.2,
  },
  {
    villageSi: 'කුරාණ',
    villageEn: 'Kurana',
    roadSi: 'කොළඹ - මීගමුව පාර',
    roadEn: 'Colombo - Negombo Road',
    townSi: 'මීගමුව',
    townEn: 'Negombo',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1850,
    lng: 79.8720,
    radiusKm: 1.5,
  },
  {
    villageSi: 'කිඹුලාපිටිය',
    villageEn: 'Kimbulapitiya',
    roadSi: 'මීගමුව - දිවුලපිටිය පාර',
    roadEn: 'Negombo - Divulapitiya Road',
    townSi: 'මීගමුව',
    townEn: 'Negombo',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.2100,
    lng: 79.9100,
    radiusKm: 2.0,
  },
  {
    villageSi: 'මීගමුව',
    villageEn: 'Negombo',
    roadSi: 'ප්‍රධාන වීදිය',
    roadEn: 'Main Street',
    townSi: 'මීගමුව',
    townEn: 'Negombo',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.2008,
    lng: 79.8736,
    radiusKm: 2.5,
  },
  {
    villageSi: 'ජා-ඇල',
    villageEn: 'Ja-Ela',
    roadSi: 'මීගමුව පාර',
    roadEn: 'Negombo Road',
    townSi: 'ජා-ඇල',
    townEn: 'Ja-Ela',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.0744,
    lng: 79.8917,
    radiusKm: 2.0,
  },
  {
    villageSi: 'තුඩැල්ල',
    villageEn: 'Tudella',
    roadSi: 'පැරණි මීගමුව පාර',
    roadEn: 'Old Negombo Road',
    townSi: 'ජා-ඇල',
    townEn: 'Ja-Ela',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.0850,
    lng: 79.8880,
    radiusKm: 1.2,
  },
  {
    villageSi: 'කපුවත්ත',
    villageEn: 'Kapuwatta',
    roadSi: 'දුම්රියපොළ පාර',
    roadEn: 'Station Road',
    townSi: 'ජා-ඇල',
    townEn: 'Ja-Ela',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.0650,
    lng: 79.8910,
    radiusKm: 1.2,
  },
  {
    villageSi: 'බටගම',
    villageEn: 'Batagama',
    roadSi: 'බටගම පාර',
    roadEn: 'Batagama Road',
    townSi: 'ජා-ඇල',
    townEn: 'Ja-Ela',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.0620,
    lng: 79.9050,
    radiusKm: 1.5,
  },
  {
    villageSi: 'කඳාන',
    villageEn: 'Kandana',
    roadSi: 'මීගමුව පාර',
    roadEn: 'Negombo Road',
    townSi: 'කඳාන',
    townEn: 'Kandana',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.0478,
    lng: 79.8953,
    radiusKm: 2.0,
  },
  {
    villageSi: 'රාගම',
    villageEn: 'Ragama',
    roadSi: 'රෝහල පාර',
    roadEn: 'Hospital Road',
    townSi: 'රාගම',
    townEn: 'Ragama',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.0286,
    lng: 79.9214,
    radiusKm: 2.0,
  },
  {
    villageSi: 'මහබාගේ',
    villageEn: 'Mahabage',
    roadSi: 'මීගමුව පාර',
    roadEn: 'Negombo Road',
    townSi: 'වත්තල',
    townEn: 'Wattala',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.0050,
    lng: 79.8890,
    radiusKm: 1.5,
  },
  {
    villageSi: 'වත්තල',
    villageEn: 'Wattala',
    roadSi: 'මීගමුව පාර',
    roadEn: 'Negombo Road',
    townSi: 'වත්තල',
    townEn: 'Wattala',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 6.9897,
    lng: 79.8919,
    radiusKm: 2.5,
  },

  // Kadawatha, Kiribathgoda, Kelaniya, Gampaha
  {
    villageSi: 'කඩවත',
    villageEn: 'Kadawatha',
    roadSi: 'නුවර පාර',
    roadEn: 'Kandy Road',
    townSi: 'කඩවත',
    townEn: 'Kadawatha',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.0016,
    lng: 79.9500,
    radiusKm: 2.5,
  },
  {
    villageSi: 'කිරිබත්ගොඩ',
    villageEn: 'Kiribathgoda',
    roadSi: 'නුවර පාර',
    roadEn: 'Kandy Road',
    townSi: 'කිරිබත්ගොඩ',
    townEn: 'Kiribathgoda',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 6.9800,
    lng: 79.9300,
    radiusKm: 2.0,
  },
  {
    villageSi: 'කැළණිය',
    villageEn: 'Kelaniya',
    roadSi: 'බියගම පාර',
    roadEn: 'Biyagama Road',
    townSi: 'කැළණිය',
    townEn: 'Kelaniya',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 6.9550,
    lng: 79.9220,
    radiusKm: 2.0,
  },
  {
    villageSi: 'මහර',
    villageEn: 'Mahara',
    roadSi: 'නුවර පාර',
    roadEn: 'Kandy Road',
    townSi: 'කඩවත',
    townEn: 'Kadawatha',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.0120,
    lng: 79.9380,
    radiusKm: 1.5,
  },
  {
    villageSi: 'ගම්පහ',
    villageEn: 'Gampaha',
    roadSi: 'මිරිස්වත්ත පාර',
    roadEn: 'Miriswatta Road',
    townSi: 'ගම්පහ',
    townEn: 'Gampaha',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.0917,
    lng: 79.9997,
    radiusKm: 3.0,
  },
  {
    villageSi: 'යක්කල',
    villageEn: 'Yakkala',
    roadSi: 'නුවර පාර',
    roadEn: 'Kandy Road',
    townSi: 'ගම්පහ',
    townEn: 'Gampaha',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.0860,
    lng: 80.0310,
    radiusKm: 2.0,
  },
  {
    villageSi: 'නිට්ටඹුව',
    villageEn: 'Nittambuwa',
    roadSi: 'කොළඹ - නුවර ප්‍රධාන පාර',
    roadEn: 'Colombo - Kandy Main Road',
    townSi: 'නිට්ටඹුව',
    townEn: 'Nittambuwa',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1444,
    lng: 80.1031,
    radiusKm: 2.5,
  },
  {
    villageSi: 'මිනුවන්ගොඩ',
    villageEn: 'Minuwangoda',
    roadSi: 'කටුනායක පාර',
    roadEn: 'Katunayake Road',
    townSi: 'මිනුවන්ගොඩ',
    townEn: 'Minuwangoda',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    province: 'බස්නාහිර පළාත',
    lat: 7.1683,
    lng: 79.9536,
    radiusKm: 2.5,
  },

  // Colombo
  {
    villageSi: 'කොටුව',
    villageEn: 'Fort',
    roadSi: 'යෝක් වීදිය',
    roadEn: 'York Street',
    townSi: 'කොළඹ',
    townEn: 'Colombo',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    province: 'බස්නාහිර පළාත',
    lat: 6.9344,
    lng: 79.8428,
    radiusKm: 2.0,
  },
  {
    villageSi: 'කොල්ලුපිටිය',
    villageEn: 'Kollupitiya',
    roadSi: 'ගාලු පාර',
    roadEn: 'Galle Road',
    townSi: 'කොළඹ',
    townEn: 'Colombo',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    province: 'බස්නාහිර පළාත',
    lat: 6.9128,
    lng: 79.8507,
    radiusKm: 1.5,
  },
  {
    villageSi: 'බම්බලපිටිය',
    villageEn: 'Bambalapitiya',
    roadSi: 'ගාලු පාර',
    roadEn: 'Galle Road',
    townSi: 'කොළඹ',
    townEn: 'Colombo',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    province: 'බස්නාහිර පළාත',
    lat: 6.8906,
    lng: 79.8567,
    radiusKm: 1.5,
  },
  {
    villageSi: 'කුරුඳුගහ (කොළඹ 07)',
    villageEn: 'Cinnamon Gardens',
    roadSi: 'හෝටන් පෙදෙස',
    roadEn: 'Horton Place',
    townSi: 'කොළඹ',
    townEn: 'Colombo',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    province: 'බස්නාහිර පළාත',
    lat: 6.9061,
    lng: 79.8708,
    radiusKm: 1.5,
  },
  {
    villageSi: 'බොරැල්ල',
    villageEn: 'Borella',
    roadSi: 'කොටා පාර',
    roadEn: 'Cotta Road',
    townSi: 'කොළඹ',
    townEn: 'Colombo',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    province: 'බස්නාහිර පළාත',
    lat: 6.9147,
    lng: 79.8778,
    radiusKm: 1.5,
  },
  {
    villageSi: 'නුගේගොඩ',
    villageEn: 'Nugegoda',
    roadSi: 'හයිලෙවල් පාර',
    roadEn: 'High Level Road',
    townSi: 'නුගේගොඩ',
    townEn: 'Nugegoda',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    province: 'බස්නාහිර පළාත',
    lat: 6.8649,
    lng: 79.8997,
    radiusKm: 2.0,
  },
  {
    villageSi: 'දෙහිවල',
    villageEn: 'Dehiwala',
    roadSi: 'ගාලු පාර',
    roadEn: 'Galle Road',
    townSi: 'දෙහිවල',
    townEn: 'Dehiwala',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    province: 'බස්නාහිර පළාත',
    lat: 6.8511,
    lng: 79.8653,
    radiusKm: 2.0,
  },
  {
    villageSi: 'මොරටුව',
    villageEn: 'Moratuwa',
    roadSi: 'ගාලු පාර',
    roadEn: 'Galle Road',
    townSi: 'මොරටුව',
    townEn: 'Moratuwa',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    province: 'බස්නාහිර පළාත',
    lat: 6.7730,
    lng: 79.8816,
    radiusKm: 2.5,
  },
  {
    villageSi: 'මහරගම',
    villageEn: 'Maharagama',
    roadSi: 'හයිලෙවල් පාර',
    roadEn: 'High Level Road',
    townSi: 'මහරගම',
    townEn: 'Maharagama',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    province: 'බස්නාහිර පළාත',
    lat: 6.8480,
    lng: 79.9265,
    radiusKm: 2.0,
  },

  // Outstations
  {
    villageSi: 'පානදුර',
    villageEn: 'Panadura',
    roadSi: 'ගාලු පාර',
    roadEn: 'Galle Road',
    townSi: 'පානදුර',
    townEn: 'Panadura',
    districtSi: 'කළුතර',
    districtEn: 'Kalutara',
    province: 'බස්නාහිර පළාත',
    lat: 6.7130,
    lng: 79.9074,
    radiusKm: 2.5,
  },
  {
    villageSi: 'කළුතර',
    villageEn: 'Kalutara',
    roadSi: 'ගාලු පාර',
    roadEn: 'Galle Road',
    townSi: 'කළුතර',
    townEn: 'Kalutara',
    districtSi: 'කළුතර',
    districtEn: 'Kalutara',
    province: 'බස්නාහිර පළාත',
    lat: 6.5854,
    lng: 79.9607,
    radiusKm: 3.0,
  },
  {
    villageSi: 'මහනුවර',
    villageEn: 'Kandy',
    roadSi: 'දළදා වීදිය',
    roadEn: 'Dalada Veediya',
    townSi: 'මහනුවර',
    townEn: 'Kandy',
    districtSi: 'මහනුවර',
    districtEn: 'Kandy',
    province: 'මධ්‍යම පළාත',
    lat: 7.2906,
    lng: 80.6337,
    radiusKm: 3.0,
  },
  {
    villageSi: 'ගාල්ල කොටුව',
    villageEn: 'Galle Fort',
    roadSi: 'රෑම්පාට් වීදිය',
    roadEn: 'Rampart Street',
    townSi: 'ගාල්ල',
    townEn: 'Galle',
    districtSi: 'ගාල්ල',
    districtEn: 'Galle',
    province: 'දකුණු පළාත',
    lat: 6.0535,
    lng: 80.2210,
    radiusKm: 3.0,
  },
  {
    villageSi: 'මාතර',
    villageEn: 'Matara',
    roadSi: 'අනගාරික ධර්මපාල මාවත',
    roadEn: 'Anagarika Dharmapala Mawatha',
    townSi: 'මාතර',
    townEn: 'Matara',
    districtSi: 'මාතර',
    districtEn: 'Matara',
    province: 'දකුණු පළාත',
    lat: 5.9549,
    lng: 80.5550,
    radiusKm: 3.0,
  },
  {
    villageSi: 'කුරුණෑගල',
    villageEn: 'Kurunegala',
    roadSi: 'කොළඹ පාර',
    roadEn: 'Colombo Road',
    townSi: 'කුරුණෑගල',
    townEn: 'Kurunegala',
    districtSi: 'කුරුණෑගල',
    districtEn: 'Kurunegala',
    province: 'වයඹ පළාත',
    lat: 7.4863,
    lng: 80.3623,
    radiusKm: 3.0,
  },
];

// Calculate Haversine Distance in Kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

// Find closest high-precision locality in database
export function findClosestLocality(lat: number, lng: number) {
  let best = HIGH_PRECISION_LOCALITIES[0];
  let minDistance = Number.MAX_VALUE;

  for (const loc of HIGH_PRECISION_LOCALITIES) {
    const dist = calculateDistanceKm(lat, lng, loc.lat, loc.lng);
    if (dist < minDistance) {
      minDistance = dist;
      best = loc;
    }
  }

  return { locality: best, distanceKm: minDistance };
}

/**
 * Format string strictly in the order requested by user:
 * 1. Village Name (ගමේ නම)
 * 2. Road Name (මාර්ගයේ නම)
 * 3. Town / City (නගරය)
 * 
 * Format: `${village}, ${road}, ${town}`
 */
export function formatOrderedLocation(village: string, road: string, town: string): string {
  const parts: string[] = [];

  const cleanVillage = (village || '').trim();
  const cleanRoad = (road || '').trim();
  const cleanTown = (town || '').trim();

  if (cleanVillage) parts.push(cleanVillage);
  
  if (cleanRoad && cleanRoad !== cleanVillage && cleanRoad !== cleanTown) {
    parts.push(cleanRoad);
  }
  
  if (cleanTown && cleanTown !== cleanVillage) {
    parts.push(cleanTown);
  } else if (!cleanTown && cleanVillage) {
    // If town is same or empty, ensure at least 2 components
  }

  return parts.join(', ');
}

/**
 * Truncate/extract only the village or town from any address or location name.
 * Used across ads to only display the village or town (ගම හෝ ටවුන් එක පමණක් සදහන් කරන්න).
 * Example: "කෝවින්න, ගංගාරාම පාර, කටුනායක" -> "කෝවින්න, කටුනායක"
 * Example: "නො. 45/A, මල්වත්ත පාර, නුගේගොඩ" -> "නුගේගොඩ"
 * Example: "ගාලු පාර, පානදුර" -> "පානදුර"
 */
export function getVillageOrTownDisplay(locationStr?: string): string {
  if (!locationStr || locationStr.trim() === '') return 'ස්ථානය තහවුරු කර ඇත';
  
  const clean = locationStr.trim();
  
  // Helper to check if a segment is a house/building number
  const isHouseNumber = (s: string) => {
    const t = s.trim();
    return /^(no\.?|නො\.?|#)\s*\d+/i.test(t) || 
           /^\d+[\dA-Za-z\/\-\s]*$/.test(t) || 
           /^\d+\/\w+/i.test(t);
  };

  // Helper to check if a segment is a road, street, highway, etc.
  const isRoadOrStreet = (s: string) => {
    const t = s.trim();
    return /(\b|\s|^)(පාර|මාවත|වීදිය|පටුමග|road|rd\.?|street|st\.?|mawatha|mwt\.?|lane|ave|avenue|drive|highway)(\b|\s|$)/i.test(t);
  };
  
  // If it's split by comma or dash: [Village, Road, Town]
  const rawParts = clean.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
  
  if (rawParts.length > 1) {
    // Filter out parts that are house numbers or road names
    const filteredParts = rawParts.filter((p) => !isHouseNumber(p) && !isRoadOrStreet(p));
    
    if (filteredParts.length >= 2) {
      const village = filteredParts[0];
      const town = filteredParts[filteredParts.length - 1];
      if (village === town) return village;
      return `${village}, ${town}`;
    } else if (filteredParts.length === 1) {
      return filteredParts[0];
    }
    
    // If all parts were filtered out (e.g. only road provided), take non-house number parts
    const nonHouseParts = rawParts.filter((p) => !isHouseNumber(p));
    if (nonHouseParts.length > 0) {
      return nonHouseParts[nonHouseParts.length - 1];
    }
    return rawParts[0];
  }
  
  // Single string without commas: check if it contains road names or house numbers
  let singleStr = clean;
  // Remove leading house numbers like "No 12, " or "නො 15/A "
  singleStr = singleStr.replace(/^(no\.?|නො\.?|#)?\s*\d+[\dA-Za-z\/\-\s]*,?\s*/i, '').trim();
  
  return singleStr || clean;
}

// Master Reverse Geocoding Function with Exact [Village, Road, Town] Resolution
export async function resolveExactLocation(lat: number, lng: number): Promise<GeoResolvedLocation> {
  const { locality: closest, distanceKm } = findClosestLocality(lat, lng);

  let rawVillage = '';
  let rawRoad = '';
  let rawTown = '';
  let rawDistrict = '';
  let rawState = '';

  // 1. Primary: Try OpenStreetMap Nominatim with zoom=18 & full addressdetails
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1&namedetails=1`,
      { 
        headers: { 'Accept-Language': 'si,en' },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      rawVillage = addr.village || addr.hamlet || addr.neighbourhood || addr.suburb || addr.residential || addr.quarter || addr.allotments || '';
      rawRoad = addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.highway || '';
      rawTown = addr.town || addr.city || addr.suburb || addr.municipality || '';
      rawDistrict = addr.state_district || addr.county || addr.district || '';
      rawState = addr.state || '';
    }
  } catch (err) {
    // Nominatim timeout or network error, proceed to fallback APIs
  }

  // 2. Secondary: If rawRoad is missing, query Overpass API to find named street/highway within 150m radius
  if (!rawRoad) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const opRes = await fetch(
        `https://overpass-api.de/api/interpreter?data=[out:json][timeout:3];way(around:150,${lat},${lng})["highway"]["name"];out tags 5;`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (opRes.ok) {
        const opData = await opRes.json();
        if (opData.elements && opData.elements.length > 0) {
          const el = opData.elements.find((e: any) => e.tags?.name || e.tags?.['name:en'] || e.tags?.['name:si']);
          if (el?.tags) {
            rawRoad = el.tags['name:si'] || el.tags.name || el.tags['name:en'] || '';
          }
        }
      }
    } catch (e) {
      // Ignore Overpass error
    }
  }

  // 3. Tertiary: If road or village missing, query Photon Reverse Geocoder
  if (!rawRoad || !rawVillage) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const pRes = await fetch(
        `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (pRes.ok) {
        const pData = await pRes.json();
        const feat = pData.features?.[0]?.properties;
        if (feat) {
          if (!rawRoad && feat.street) rawRoad = feat.street;
          if (!rawRoad && feat.name && feat.osm_key === 'highway') rawRoad = feat.name;
          if (!rawVillage && (feat.locality || feat.district || feat.suburb)) {
            rawVillage = feat.locality || feat.suburb || feat.district;
          }
          if (!rawTown && feat.city) rawTown = feat.city;
        }
      }
    } catch (e) {
      // Ignore Photon error
    }
  }

  // 4. Quaternary: If still missing, query BigDataCloud Reverse Geocoder
  if (!rawRoad || !rawVillage) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (bdcRes.ok) {
        const bdc = await bdcRes.json();
        if (!rawRoad && bdc.localityInfo?.informative) {
          const roadObj = bdc.localityInfo.informative.find((i: any) => i.description?.includes('road') || i.description?.includes('street') || i.order >= 9);
          if (roadObj?.name) rawRoad = roadObj.name;
        }
        if (!rawVillage && bdc.locality) {
          rawVillage = bdc.locality;
        }
        if (!rawTown && bdc.city) {
          rawTown = bdc.city;
        }
      }
    } catch (e) {
      // Ignore fallback error
    }
  }

  // Determine components
  let villageSi = '';
  let villageEn = '';
  let roadSi = '';
  let roadEn = '';
  let townSi = '';
  let townEn = '';
  let districtSi = '';
  let districtEn = '';

  // Kovinna coordinate zone detection
  const isKovinnaArea = (lat >= 7.165 && lat <= 7.178 && lng >= 79.892 && lng <= 79.908);

  if (isKovinnaArea) {
    villageSi = 'කෝවින්න';
    villageEn = 'Kovinna';
    townSi = 'කටුනායක';
    townEn = 'Katunayake';
    districtSi = 'ගම්පහ';
    districtEn = 'Gampaha';

    if (rawRoad) {
      roadEn = rawRoad;
      roadSi = toSinhalaRoadName(rawRoad, 'කෝවින්න');
    } else {
      roadEn = closest.roadEn || 'Gangarama Road';
      roadSi = closest.roadSi || 'ගංගාරාම පාර';
    }
  } else if (rawVillage) {
    villageEn = rawVillage;
    villageSi = toSinhalaName(rawVillage);

    if (rawRoad) {
      roadEn = rawRoad;
      roadSi = toSinhalaRoadName(rawRoad, villageSi);
    } else if (distanceKm < 2.0 && closest.roadSi) {
      roadEn = closest.roadEn;
      roadSi = closest.roadSi;
    } else {
      roadEn = `${villageEn} Road`;
      roadSi = `${villageSi} පාර`;
    }

    townEn = rawTown || closest.townEn;
    townSi = toSinhalaName(townEn) || closest.townSi;
    districtEn = rawDistrict.replace(/district/i, '').trim() || closest.districtEn;
    districtSi = toSinhalaName(districtEn) || closest.districtSi;
  } else if (distanceKm < 3.5) {
    // Highly accurate local Sri Lankan database match
    villageSi = closest.villageSi;
    villageEn = closest.villageEn;
    
    if (rawRoad) {
      roadEn = rawRoad;
      roadSi = toSinhalaRoadName(rawRoad, villageSi);
    } else {
      roadSi = closest.roadSi;
      roadEn = closest.roadEn;
    }

    townSi = closest.townSi;
    townEn = closest.townEn;
    districtSi = closest.districtSi;
    districtEn = closest.districtEn;
  } else {
    villageEn = rawTown || closest.villageEn;
    villageSi = toSinhalaName(villageEn) || closest.villageSi;
    roadEn = rawRoad || `${villageEn} Road`;
    roadSi = toSinhalaRoadName(roadEn, villageSi);
    townEn = closest.townEn;
    townSi = closest.townSi;
    districtEn = closest.districtEn;
    districtSi = closest.districtSi;
  }

  // Ensure road name always has proper suffix
  if (roadSi && !roadSi.includes('පාර') && !roadSi.includes('මාවත') && !roadSi.includes('වීදිය') && !roadSi.includes('පටුමග')) {
    roadSi = `${roadSi} පාර`;
  }
  if (roadEn && !roadEn.toLowerCase().includes('road') && !roadEn.toLowerCase().includes('street') && !roadEn.toLowerCase().includes('mawatha') && !roadEn.toLowerCase().includes('lane') && !roadEn.toLowerCase().includes('avenue')) {
    roadEn = `${roadEn} Road`;
  }

  // Strictly construct strings in the user requested order:
  // 1. ගමේ නම (Village Name), 2. මාර්ගයේ නම (Road Name), 3. නගරය (Town / City)
  const shortDisplaySi = formatOrderedLocation(villageSi, roadSi, townSi);
  const shortDisplayEn = formatOrderedLocation(villageEn, roadEn, townEn);

  const fullAddressSi = `${shortDisplaySi}, ${districtSi} දිස්ත්‍රික්කය`;
  const fullAddressEn = `${shortDisplayEn}, ${districtEn} District, Sri Lanka`;

  return {
    village: villageEn,
    villageSi,
    villageEn,
    road: roadEn,
    roadSi,
    roadEn,
    town: townEn,
    townSi,
    townEn,
    district: districtEn,
    districtSi,
    districtEn,
    province: rawState || closest.province,
    fullAddressSi,
    fullAddressEn,
    shortDisplaySi,
    shortDisplayEn,
    lat,
    lng,
  };
}

/**
 * Get popular road suggestions for a given village/town in Sri Lanka
 */
export function getSuggestedRoadsForLocation(villageSi: string, townSi: string): { si: string; en: string }[] {
  const v = (villageSi || '').toLowerCase();
  const t = (townSi || '').toLowerCase();

  // Katunayake / Kovinna / Averiwatta / Seeduwa area
  if (v.includes('කෝවින්න') || v.includes('kovinna') || t.includes('කටුනායක') || t.includes('katunayake') || v.includes('කලහපිටිය')) {
    return [
      { si: 'ගංගාරාම පාර', en: 'Gangarama Road' },
      { si: 'ශ්‍රී ගංගාරාම මාවත', en: 'Sri Gangarama Mawatha' },
      { si: 'අමරකෝන් මාවත', en: 'Amarakoon Mawatha' },
      { si: 'කෝවින්න - කලහපිටිය පාර', en: 'Kovinna - Kalahapitiya Road' },
      { si: 'කලහපිටිය පාර', en: 'Kalahapitiya Road' },
      { si: 'අවිරිවත්ත පාර', en: 'Awariwatta Road' },
      { si: 'කෝවින්න පන්සල පාර', en: 'Kovinna Temple Road' },
      { si: 'ශ්‍රී සුනන්දාරාම මාවත', en: 'Sri Sunandarama Mawatha' },
      { si: 'දෙවොල පාර', en: 'Dewala Road' },
      { si: 'ගුවන්තොටුපල පාර', en: 'Airport Road' },
      { si: 'කොළඹ - මීගමුව ප්‍රධාන පාර', en: 'Colombo - Negombo Main Road' },
      { si: 'ජයවර්ධන මාවත', en: 'Jayawardena Mawatha' },
      { si: 'දුම්රියපොළ පාර', en: 'Station Road' },
      { si: 'රද්දොළුගම පාර', en: 'Raddolugama Road' },
      { si: 'කෝවින්න පාර', en: 'Kovinna Road' },
      { si: 'මිනුවන්ගොඩ පාර', en: 'Minuwangoda Road' },
      { si: 'ඇන්ඩියම්බලම පාර', en: 'Andiambalama Road' },
      { si: 'කොටුගොඩ පාර', en: 'Kotugoda Road' },
      { si: 'අමන්දොළුව පාර', en: 'Amandoluwa Road' },
      { si: 'තෙම්පොල පාර', en: 'Tempola Road' },
    ];
  }

  // Kadawatha / Kiribathgoda
  if (v.includes('කඩවත') || t.includes('කඩවත') || v.includes('කිරිබත්ගොඩ') || t.includes('කිරිබත්ගොඩ')) {
    return [
      { si: 'නුවර පාර', en: 'Kandy Road' },
      { si: 'ගණේමුල්ල පාර', en: 'Ganemulla Road' },
      { si: 'රාගම පාර', en: 'Ragama Road' },
      { si: 'මහර පාර', en: 'Mahara Road' },
      { si: 'බියගම පාර', en: 'Biyagama Road' },
      { si: 'ස්ටේෂන් පාර', en: 'Station Road' },
      { si: 'පන්සල පාර', en: 'Temple Road' },
    ];
  }

  // Gampaha
  if (v.includes('ගම්පහ') || t.includes('ගම්පහ') || v.includes('යක්කල')) {
    return [
      { si: 'මිරිස්වත්ත පාර', en: 'Miriswatta Road' },
      { si: 'නුවර පාර', en: 'Kandy Road' },
      { si: 'ජා-ඇල පාර', en: 'Ja-Ela Road' },
      { si: 'මිනුවන්ගොඩ පාර', en: 'Minuwangoda Road' },
      { si: 'ස්ටේෂන් පාර', en: 'Station Road' },
      { si: 'රෝහල පාර', en: 'Hospital Road' },
    ];
  }

  // Colombo
  if (v.includes('කොළඹ') || t.includes('කොළඹ')) {
    return [
      { si: 'ගාලු පාර', en: 'Galle Road' },
      { si: 'හයිලෙවල් පාර', en: 'High Level Road' },
      { si: 'බේස්ලයින් පාර', en: 'Baseline Road' },
      { si: 'හෝටන් පෙදෙස', en: 'Horton Place' },
      { si: 'කොටා පාර', en: 'Cotta Road' },
      { si: 'යෝක් වීදිය', en: 'York Street' },
      { si: 'මහා විද්‍යාල මාවත', en: 'Grandpass Road' },
    ];
  }

  // General Sri Lanka Roads
  return [
    { si: `${villageSi ? villageSi + ' ' : ''}ප්‍රධාන පාර`, en: 'Main Road' },
    { si: 'දුම්රියපොළ පාර', en: 'Station Road' },
    { si: 'පන්සල පාර', en: 'Temple Road' },
    { si: 'පල්ලිය පාර', en: 'Church Road' },
    { si: 'රෝහල පාර', en: 'Hospital Road' },
    { si: 'පාසල් පාර', en: 'School Road' },
    { si: 'තැපැල් කාර්යාල පාර', en: 'Post Office Road' },
  ];
}

/**
 * Update Location with a custom or selected road name,
 * preserving strict order: [1. Village, 2. Road, 3. Town]
 */
export function updateLocationWithRoad(
  current: GeoResolvedLocation,
  newRoadSi: string,
  newRoadEn?: string
): GeoResolvedLocation {
  let cleanRoadSi = (newRoadSi || '').trim();
  if (cleanRoadSi && !cleanRoadSi.includes('පාර') && !cleanRoadSi.includes('මාවත') && !cleanRoadSi.includes('වීදිය') && !cleanRoadSi.includes('පටුමග')) {
    cleanRoadSi = `${cleanRoadSi} පාර`;
  }

  let cleanRoadEn = (newRoadEn || '').trim();
  if (!cleanRoadEn && cleanRoadSi) {
    cleanRoadEn = cleanRoadSi
      .replace(/පාර/g, 'Road')
      .replace(/මාවත/g, 'Mawatha')
      .replace(/වීදිය/g, 'Street')
      .replace(/පටුමග/g, 'Lane');
  }

  const shortDisplaySi = formatOrderedLocation(current.villageSi, cleanRoadSi, current.townSi);
  const shortDisplayEn = formatOrderedLocation(current.villageEn, cleanRoadEn, current.townEn);

  return {
    ...current,
    road: cleanRoadEn || current.road,
    roadSi: cleanRoadSi || current.roadSi,
    roadEn: cleanRoadEn || current.roadEn,
    shortDisplaySi,
    shortDisplayEn,
    fullAddressSi: `${shortDisplaySi}, ${current.districtSi} දිස්ත්‍රික්කය`,
    fullAddressEn: `${shortDisplayEn}, ${current.districtEn} District, Sri Lanka`,
  };
}

// Convert GeoResolvedLocation to LocationOption
export function toLocationOption(resolved: GeoResolvedLocation): LocationOption {
  return {
    id: `loc_gps_${Date.now()}`,
    nameSi: resolved.shortDisplaySi, // "ගමේ නම, මාර්ගයේ නම, නගරය"
    nameEn: resolved.shortDisplayEn, // "Village, Road, Town"
    nameTa: resolved.shortDisplayEn,
    lat: Number(resolved.lat.toFixed(6)),
    lng: Number(resolved.lng.toFixed(6)),
  };
}

export interface PlaceSearchResult {
  id: string;
  titleSi: string;
  titleEn: string;
  category: 'road' | 'temple' | 'junction' | 'town' | 'village' | 'landmark';
  villageSi: string;
  villageEn: string;
  roadSi: string;
  roadEn: string;
  townSi: string;
  townEn: string;
  districtSi: string;
  districtEn: string;
  lat: number;
  lng: number;
  shortDisplaySi: string;
  shortDisplayEn: string;
}

export const SRI_LANKA_CURATED_PLACES: PlaceSearchResult[] = [
  // Kovinna, Katunayake & Kalahapitiya Detailed Roads & Landmarks
  {
    id: 'kovinna_gangarama_rd',
    titleSi: 'ගංගාරාම පාර',
    titleEn: 'Gangarama Road, Kovinna',
    category: 'road',
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'ගංගාරාම පාර',
    roadEn: 'Gangarama Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1712,
    lng: 79.8978,
    shortDisplaySi: 'කෝවින්න, ගංගාරාම පාර, කටුනායක',
    shortDisplayEn: 'Kovinna, Gangarama Road, Katunayake',
  },
  {
    id: 'kovinna_sri_gangarama_mw',
    titleSi: 'ශ්‍රී ගංගාරාම මාවත',
    titleEn: 'Sri Gangarama Mawatha, Kovinna',
    category: 'road',
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'ශ්‍රී ගංගාරාම මාවත',
    roadEn: 'Sri Gangarama Mawatha',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1715,
    lng: 79.8975,
    shortDisplaySi: 'කෝවින්න, ශ්‍රී ගංගාරාම මාවත, කටුනායක',
    shortDisplayEn: 'Kovinna, Sri Gangarama Mawatha, Katunayake',
  },
  {
    id: 'kovinna_amarakoon_mw',
    titleSi: 'අමරකෝන් මාවත',
    titleEn: 'Amarakoon Mawatha, Kovinna',
    category: 'road',
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'අමරකෝන් මාවත',
    roadEn: 'Amarakoon Mawatha',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1698,
    lng: 79.8990,
    shortDisplaySi: 'කෝවින්න, අමරකෝන් මාවත, කටුනායක',
    shortDisplayEn: 'Kovinna, Amarakoon Mawatha, Katunayake',
  },
  {
    id: 'kovinna_sunandarama_mw',
    titleSi: 'ශ්‍රී සුනන්දාරාම මාවත / විහාරය',
    titleEn: 'Sri Sunandarama Temple & Mawatha, Kovinna',
    category: 'temple',
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'ශ්‍රී සුනන්දාරාම මාවත',
    roadEn: 'Sri Sunandarama Mawatha',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1724,
    lng: 79.8962,
    shortDisplaySi: 'කෝවින්න, ශ්‍රී සුනන්දාරාම මාවත, කටුනායක',
    shortDisplayEn: 'Kovinna, Sri Sunandarama Mawatha, Katunayake',
  },
  {
    id: 'kovinna_kalahapitiya_rd',
    titleSi: 'කෝවින්න - කලහපිටිය පාර',
    titleEn: 'Kovinna - Kalahapitiya Road',
    category: 'road',
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'කෝවින්න - කලහපිටිය පාර',
    roadEn: 'Kovinna - Kalahapitiya Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1718,
    lng: 79.9005,
    shortDisplaySi: 'කෝවින්න, කෝවින්න - කලහපිටිය පාර, කටුනායක',
    shortDisplayEn: 'Kovinna, Kovinna - Kalahapitiya Road, Katunayake',
  },
  {
    id: 'kovinna_dewala_rd',
    titleSi: 'දෙවොල පාර',
    titleEn: 'Dewala Road, Kovinna',
    category: 'road',
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'දෙවොල පාර',
    roadEn: 'Dewala Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1685,
    lng: 79.8972,
    shortDisplaySi: 'කෝවින්න, දෙවොල පාර, කටුනායක',
    shortDisplayEn: 'Kovinna, Dewala Road, Katunayake',
  },
  {
    id: 'kovinna_temple_rd',
    titleSi: 'කෝවින්න පන්සල පාර',
    titleEn: 'Kovinna Temple Road',
    category: 'temple',
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'කෝවින්න පන්සල පාර',
    roadEn: 'Kovinna Temple Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1722,
    lng: 79.8960,
    shortDisplaySi: 'කෝවින්න, කෝවින්න පන්සල පාර, කටුනායක',
    shortDisplayEn: 'Kovinna, Kovinna Temple Road, Katunayake',
  },
  {
    id: 'kalahapitiya_rd',
    titleSi: 'කලහපිටිය පාර',
    titleEn: 'Kalahapitiya Road, Katunayake',
    category: 'road',
    villageSi: 'කලහපිටිය',
    villageEn: 'Kalahapitiya',
    roadSi: 'කලහපිටිය පාර',
    roadEn: 'Kalahapitiya Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1730,
    lng: 79.9030,
    shortDisplaySi: 'කලහපිටිය, කලහපිටිය පාර, කටුනායක',
    shortDisplayEn: 'Kalahapitiya, Kalahapitiya Road, Katunayake',
  },
  {
    id: 'kovinna_jayawardena_mw',
    titleSi: 'ජයවර්ධන මාවත',
    titleEn: 'Jayawardena Mawatha, Kovinna',
    category: 'road',
    villageSi: 'කෝවින්න',
    villageEn: 'Kovinna',
    roadSi: 'ජයවර්ධන මාවත',
    roadEn: 'Jayawardena Mawatha',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1670,
    lng: 79.8940,
    shortDisplaySi: 'කෝවින්න, ජයවර්ධන මාවත, කටුනායක',
    shortDisplayEn: 'Kovinna, Jayawardena Mawatha, Katunayake',
  },
  {
    id: 'katunayake_awariwatta_rd',
    titleSi: 'අවිරිවත්ත පාර',
    titleEn: 'Awariwatta Road, Katunayake',
    category: 'road',
    villageSi: 'අවිරිවත්ත',
    villageEn: 'Awariwatta',
    roadSi: 'අවිරිවත්ත පාර',
    roadEn: 'Awariwatta Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1650,
    lng: 79.8850,
    shortDisplaySi: 'අවිරිවත්ත, අවිරිවත්ත පාර, කටුනායක',
    shortDisplayEn: 'Awariwatta, Awariwatta Road, Katunayake',
  },
  {
    id: 'katunayake_airport_rd',
    titleSi: 'ගුවන්තොටුපල පාර',
    titleEn: 'Airport Road, Katunayake',
    category: 'road',
    villageSi: 'කටුනායක',
    villageEn: 'Katunayake',
    roadSi: 'ගුවන්තොටුපල පාර',
    roadEn: 'Airport Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1700,
    lng: 79.8900,
    shortDisplaySi: 'කටුනායක, ගුවන්තොටුපල පාර, කටුනායක',
    shortDisplayEn: 'Katunayake, Airport Road, Katunayake',
  },
  {
    id: 'katunayake_station_rd',
    titleSi: 'දුම්රියපොළ පාර',
    titleEn: 'Station Road, Katunayake',
    category: 'junction',
    villageSi: 'කටුනායක',
    villageEn: 'Katunayake',
    roadSi: 'දුම්රියපොළ පාර',
    roadEn: 'Station Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1620,
    lng: 79.8820,
    shortDisplaySi: 'කටුනායක, දුම්රියපොළ පාර, කටුනායක',
    shortDisplayEn: 'Katunayake, Station Road, Katunayake',
  },
  {
    id: 'katunayake_colombo_negombo_rd',
    titleSi: 'කොළඹ - මීගමුව ප්‍රධාන පාර',
    titleEn: 'Colombo - Negombo Main Road, Katunayake',
    category: 'road',
    villageSi: 'කටුනායක',
    villageEn: 'Katunayake',
    roadSi: 'කොළඹ - මීගමුව ප්‍රධාන පාර',
    roadEn: 'Colombo - Negombo Main Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1610,
    lng: 79.8780,
    shortDisplaySi: 'කටුනායක, කොළඹ - මීගමුව ප්‍රධාන පාර, කටුනායක',
    shortDisplayEn: 'Katunayake, Colombo - Negombo Main Road, Katunayake',
  },
  {
    id: 'katunayake_amandoluwa_rd',
    titleSi: 'අමන්දොළුව පාර',
    titleEn: 'Amandoluwa Road, Katunayake',
    category: 'road',
    villageSi: 'අමන්දොළුව',
    villageEn: 'Amandoluwa',
    roadSi: 'අමන්දොළුව පාර',
    roadEn: 'Amandoluwa Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1610,
    lng: 79.8930,
    shortDisplaySi: 'අමන්දොළුව, අමන්දොළුව පාර, කටුනායක',
    shortDisplayEn: 'Amandoluwa, Amandoluwa Road, Katunayake',
  },
  {
    id: 'andiambalama_minuwangoda_rd',
    titleSi: 'මිනුවන්ගොඩ පාර',
    titleEn: 'Minuwangoda Road, Andiambalama',
    category: 'road',
    villageSi: 'ඇන්ඩියම්බලම',
    villageEn: 'Andiambalama',
    roadSi: 'මිනුවන්ගොඩ පාර',
    roadEn: 'Minuwangoda Road',
    townSi: 'කටුනායක',
    townEn: 'Katunayake',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.1550,
    lng: 79.9150,
    shortDisplaySi: 'ඇන්ඩියම්බලම, මිනුවන්ගොඩ පාර, කටුනායක',
    shortDisplayEn: 'Andiambalama, Minuwangoda Road, Katunayake',
  },

  // Kadawatha & Kiribathgoda Major Locations
  {
    id: 'kadawatha_kandy_rd',
    titleSi: 'නුවර පාර, කඩවත',
    titleEn: 'Kandy Road, Kadawatha',
    category: 'road',
    villageSi: 'කඩවත',
    villageEn: 'Kadawatha',
    roadSi: 'නුවර පාර',
    roadEn: 'Kandy Road',
    townSi: 'කඩවත',
    townEn: 'Kadawatha',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.0016,
    lng: 79.9500,
    shortDisplaySi: 'කඩවත, නුවර පාර, කඩවත',
    shortDisplayEn: 'Kadawatha, Kandy Road, Kadawatha',
  },
  {
    id: 'kiribathgoda_kandy_rd',
    titleSi: 'නුවර පාර, කිරිබත්ගොඩ',
    titleEn: 'Kandy Road, Kiribathgoda',
    category: 'road',
    villageSi: 'කිරිබත්ගොඩ',
    villageEn: 'Kiribathgoda',
    roadSi: 'නුවර පාර',
    roadEn: 'Kandy Road',
    townSi: 'කිරිබත්ගොඩ',
    townEn: 'Kiribathgoda',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 6.9800,
    lng: 79.9300,
    shortDisplaySi: 'කිරිබත්ගොඩ, නුවර පාර, කිරිබත්ගොඩ',
    shortDisplayEn: 'Kiribathgoda, Kandy Road, Kiribathgoda',
  },

  // Gampaha, Colombo & Other Major Locations
  {
    id: 'gampaha_miriswatta_rd',
    titleSi: 'මිරිස්වත්ත පාර, ගම්පහ',
    titleEn: 'Miriswatta Road, Gampaha',
    category: 'road',
    villageSi: 'ගම්පහ',
    villageEn: 'Gampaha',
    roadSi: 'මිරිස්වත්ත පාර',
    roadEn: 'Miriswatta Road',
    townSi: 'ගම්පහ',
    townEn: 'Gampaha',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.0917,
    lng: 79.9997,
    shortDisplaySi: 'ගම්පහ, මිරිස්වත්ත පාර, ගම්පහ',
    shortDisplayEn: 'Gampaha, Miriswatta Road, Gampaha',
  },
  {
    id: 'colombo_galle_rd',
    titleSi: 'ගාලු පාර, කොළඹ',
    titleEn: 'Galle Road, Colombo',
    category: 'road',
    villageSi: 'කොල්ලුපිටිය',
    villageEn: 'Kollupitiya',
    roadSi: 'ගාලු පාර',
    roadEn: 'Galle Road',
    townSi: 'කොළඹ',
    townEn: 'Colombo',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    lat: 6.9000,
    lng: 79.8550,
    shortDisplaySi: 'කොල්ලුපිටිය, ගාලු පාර, කොළඹ',
    shortDisplayEn: 'Kollupitiya, Galle Road, Colombo',
  },
  {
    id: 'negombo_sea_street',
    titleSi: 'මුහුදු වීදිය, මීගමුව',
    titleEn: 'Sea Street, Negombo',
    category: 'road',
    villageSi: 'මීගමුව',
    villageEn: 'Negombo',
    roadSi: 'මුහුදු වීදිය',
    roadEn: 'Sea Street',
    townSi: 'මීගමුව',
    townEn: 'Negombo',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    lat: 7.2100,
    lng: 79.8400,
    shortDisplaySi: 'මීගමුව, මුහුදු වීදිය, මීගමුව',
    shortDisplayEn: 'Negombo, Sea Street, Negombo',
  },
];

/**
 * High-Precision Search across Sri Lankan Places, Roads, and Landmarks
 * Combines Local Curated Database + Online Nominatim/Photon search
 */
export async function searchSriLankanPlacesAndRoads(query: string): Promise<PlaceSearchResult[]> {
  const cleanQ = (query || '').trim().toLowerCase();
  if (!cleanQ) {
    return SRI_LANKA_CURATED_PLACES.slice(0, 10);
  }

  // 1. Search in curated places first (instant local results)
  const localMatches = SRI_LANKA_CURATED_PLACES.filter((p) => {
    return (
      (p.titleSi || '').toLowerCase().includes(cleanQ) ||
      (p.titleEn || '').toLowerCase().includes(cleanQ) ||
      (p.roadSi || '').toLowerCase().includes(cleanQ) ||
      (p.roadEn || '').toLowerCase().includes(cleanQ) ||
      (p.villageSi || '').toLowerCase().includes(cleanQ) ||
      (p.villageEn || '').toLowerCase().includes(cleanQ) ||
      (p.townSi || '').toLowerCase().includes(cleanQ) ||
      (p.townEn || '').toLowerCase().includes(cleanQ) ||
      (p.shortDisplaySi || '').toLowerCase().includes(cleanQ) ||
      (p.shortDisplayEn || '').toLowerCase().includes(cleanQ)
    );
  });

  // If we already have strong local matches, prioritize them
  if (localMatches.length >= 4) {
    return localMatches;
  }

  // 2. Query Photon / Nominatim API for Sri Lanka geocoding fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&bbox=79.5,5.8,81.9,9.9&limit=6`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const onlineResults: PlaceSearchResult[] = (data.features || []).map((feat: any, idx: number) => {
        const props = feat.properties || {};
        const coords = feat.geometry?.coordinates || [79.8986, 7.1710];
        const lng = coords[0];
        const lat = coords[1];

        const rawVillage = props.locality || props.suburb || props.district || props.name || 'ප්‍රදේශය';
        const rawRoad = props.street || (props.osm_key === 'highway' ? props.name : '') || `${rawVillage} Road`;
        const rawTown = props.city || props.town || props.state || 'කටුනායක';

        const villageSi = toSinhalaName(rawVillage);
        const villageEn = rawVillage;
        const roadSi = toSinhalaRoadName(rawRoad, villageSi);
        const roadEn = rawRoad;
        const townSi = toSinhalaName(rawTown);
        const townEn = rawTown;

        const shortDisplaySi = formatOrderedLocation(villageSi, roadSi, townSi);
        const shortDisplayEn = formatOrderedLocation(villageEn, roadEn, townEn);

        return {
          id: `online_${idx}_${Date.now()}`,
          titleSi: `${props.name || roadSi} (${villageSi})`,
          titleEn: `${props.name || roadEn}, ${villageEn}`,
          category: (props.osm_key === 'highway' ? 'road' : 'landmark') as any,
          villageSi,
          villageEn,
          roadSi,
          roadEn,
          townSi,
          townEn,
          districtSi: 'ගම්පහ',
          districtEn: 'Gampaha',
          lat,
          lng,
          shortDisplaySi,
          shortDisplayEn,
        };
      });

      // Combine local + online results
      const combined = [...localMatches, ...onlineResults];
      return combined.slice(0, 10);
    }
  } catch (e) {
    // Ignore network error and return local matches
  }

  return localMatches;
}

export interface MotorcycleRoadTrip {
  straightDistanceKm: number;
  roadDistanceKm: number;
  travelTimeMinutes: number;
  formattedRoadDistance: string; // e.g. "1.8 km"
  formattedStraightDistance: string; // e.g. "1.4 km"
  formattedTime: string; // e.g. "~4 මිනිත්තු"
  fuelMl: number; // estimated fuel consumption in ml
  isLocal: boolean;
  postLocationText: string;
  viewerLocationText: string;
  mapsUrl: string;
}

/**
 * Accurately calculate the road travel distance and time for a motorcycle (මෝටර් සයිකලය)
 * between the post publisher location (දැන්වීම පලකල ස්ථානය) and the viewer location (දැන්වීම නරඹන්නා සිටින ස්ථානය) in Sri Lanka.
 */
export function calculateMotorcycleRoadDistance(
  postLat?: number,
  postLng?: number,
  viewerLat?: number,
  viewerLng?: number,
  postLocationName?: string,
  viewerLocationName?: string,
  lang: 'si' | 'en' | 'ta' | string = 'si'
): MotorcycleRoadTrip {
  const pLat = postLat || 7.1710;
  const pLng = postLng || 79.8986;
  const vLat = viewerLat || 7.1710;
  const vLng = viewerLng || 79.8986;

  // 1. Calculate straight line distance (Haversine)
  const straightDist = calculateDistanceKm(pLat, pLng, vLat, vLng);

  // 2. Calculate realistic motorcycle road distance with Sri Lankan road network winding factor
  let roadDistanceKm = 0;
  let avgSpeedKmH = 30; // default motorcycle speed in town/village roads

  if (straightDist < 0.05) {
    // Same neighborhood / very close road
    roadDistanceKm = 0.4;
    avgSpeedKmH = 20;
  } else if (straightDist < 1.0) {
    // Local village & by-roads: 1.32x winding factor + 0.2km entrance/turn buffer
    roadDistanceKm = Number((straightDist * 1.32 + 0.2).toFixed(1));
    avgSpeedKmH = 25;
  } else if (straightDist <= 10.0) {
    // Suburb & connecting roads: 1.28x winding factor + 0.3km
    roadDistanceKm = Number((straightDist * 1.28 + 0.3).toFixed(1));
    avgSpeedKmH = 32;
  } else if (straightDist <= 30.0) {
    // Town to town / main roads: 1.24x winding factor + 0.8km
    roadDistanceKm = Number((straightDist * 1.24 + 0.8).toFixed(1));
    avgSpeedKmH = 38;
  } else {
    // Inter-district / Highway / A-class roads: 1.20x winding factor + 1.5km
    roadDistanceKm = Number((straightDist * 1.20 + 1.5).toFixed(1));
    avgSpeedKmH = 45;
  }

  // 3. Calculate motorcycle travel time in minutes
  const travelTimeMinutes = Math.max(2, Math.round((roadDistanceKm / avgSpeedKmH) * 60));

  // 4. Estimate fuel (at ~45 km/l for standard 100cc-150cc motorcycles)
  const fuelMl = Math.max(10, Math.round((roadDistanceKm / 45) * 1000));

  // 5. Format strings
  const formattedRoadDistance = roadDistanceKm < 1 
    ? `${Math.round(roadDistanceKm * 1000)} m` 
    : `${roadDistanceKm.toFixed(1)} km`;

  const formattedStraightDistance = straightDist < 1
    ? `${Math.round(straightDist * 1000)} m`
    : `${straightDist.toFixed(1)} km`;

  let formattedTime = '';
  if (lang === 'ta') {
    formattedTime = travelTimeMinutes < 60
      ? `~${travelTimeMinutes} நிமிடங்கள்`
      : `~${Math.floor(travelTimeMinutes / 60)} மணிநேரம் ${travelTimeMinutes % 60 > 0 ? `${travelTimeMinutes % 60} நிமி.` : ''}`;
  } else if (lang === 'en') {
    formattedTime = travelTimeMinutes < 60
      ? `~${travelTimeMinutes} mins`
      : `~${Math.floor(travelTimeMinutes / 60)} hrs ${travelTimeMinutes % 60 > 0 ? `${travelTimeMinutes % 60} mins` : ''}`;
  } else {
    formattedTime = travelTimeMinutes < 60
      ? `~${travelTimeMinutes} මිනිත්තු`
      : `~${Math.floor(travelTimeMinutes / 60)} පැය ${travelTimeMinutes % 60 > 0 ? `${travelTimeMinutes % 60} මිනි.` : ''}`;
  }

  // 6. Direct Google Maps Navigation URL for Two-Wheeler / Motorcycle
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${vLat},${vLng}`)}&destination=${encodeURIComponent(`${pLat},${pLng}`)}&travelmode=two_wheeler`;

  return {
    straightDistanceKm: Number(straightDist.toFixed(1)),
    roadDistanceKm,
    travelTimeMinutes,
    formattedRoadDistance,
    formattedStraightDistance,
    formattedTime,
    fuelMl,
    isLocal: roadDistanceKm <= 15,
    postLocationText: postLocationName || 'දැන්වීම පළකළ ස්ථානය',
    viewerLocationText: viewerLocationName || 'ඔබ සිටින ස්ථානය',
    mapsUrl,
  };
}

