import { Language, LocationOption, VerifiedAiKnowledgeItem } from '../types';
import { subscribeToVerifiedAiKnowledge, savePendingAiQuery } from '../lib/firebase';
import { searchSriLankanPlacesAndRoads, calculateRoadDistanceKm } from './geoUtils';

export interface AssistantAction {
  type:
    | 'open_blood'
    | 'open_quick'
    | 'open_find'
    | 'open_from_you'
    | 'open_group'
    | 'open_market'
    | 'open_wallet'
    | 'open_directory'
    | 'post_help'
    | 'open_help_post'
    | 'open_red_alert_create'
    | 'open_pro_services'
    | 'contact_support'
    | 'switch_to_register'
    | 'switch_to_login'
    | 'open_issues_help'
    | 'demo_login';
  label: string;
  icon?: string;
}

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  detectedLang?: 'si' | 'en' | 'ta';
  translations?: {
    si?: string;
    en?: string;
    ta?: string;
  };
  activeViewLang?: 'si' | 'en' | 'ta';
  timestamp: string;
  actions?: AssistantAction[];
  quickChips?: string[];
}

export function detectLanguage(text: string): 'si' | 'en' | 'ta' {
  if (/[\u0D80-\u0DFF]/.test(text)) return 'si';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  return 'en';
}

// Built-in offline phrase dictionary for ultra-fast translations and fallback
const DICTIONARY_MAP: Record<string, { si: string; en: string; ta: string }> = {
  blood: { si: 'ලේ / රුධිරය', en: 'Blood', ta: 'இரத்தம்' },
  donor: { si: 'ලේ පරිත්‍යාගශීලී', en: 'Blood Donor', ta: 'இரத்த தானம் செய்பவர்' },
  disaster: { si: 'ආපදා සහන', en: 'Disaster Relief', ta: 'பேரழிவு நிவாரணம்' },
  flood: { si: 'ගංවතුර ආධාර', en: 'Flood Relief', ta: 'வெள்ள நிவாரணம்' },
  mechanic: { si: 'මෝටර් කාර්මික', en: 'Mechanic', ta: 'வாகன மெக்கானிக்' },
  electrician: { si: 'විදුලි කාර්මික', en: 'Electrician', ta: 'மின்சார வல்லுநர்' },
  plumber: { si: 'නල / බට කාර්මික', en: 'Plumber', ta: 'குழாய் பழுதுபார்ப்பவர்' },
  mason: { si: 'මේසන් බාස්', en: 'Mason Builder', ta: 'கொத்தனார்' },
  lost: { si: 'නැතිවූ දේ', en: 'Lost Item', ta: 'தொலைந்த பொருள்' },
  found: { si: 'හමුවූ දේ', en: 'Found Item', ta: 'கண்டெடுக்கப்பட்ட பொருள்' },
  wallet: { si: 'පසුම්බිය / ක්‍රෙඩිට්', en: 'Wallet / Credits', ta: 'பணப்பை / வரவு' },
  donation: { si: 'පරිත්‍යාග', en: 'Donation', ta: 'தானம்' },
  free: { si: 'නොමිලේ', en: 'Free', ta: 'இலவசம்' },
  market: { si: 'වෙළඳපල මිල', en: 'Marketplace Price', ta: 'சந்தை விலை' },
  help: { si: 'සහය / උපකාර', en: 'Help & Support', ta: 'உதவி' },
  emergency: { si: 'හදිසි සේවා', en: 'Emergency Services', ta: 'அவசர சேவைகள்' },
  rice: { si: 'සහල් / හාල්', en: 'Rice', ta: 'அரிசி' },
  sugar: { si: 'සීනි', en: 'Sugar', ta: 'சர்க்கரை' },
  gas: { si: 'ගෑස් සිලින්ඩර', en: 'LP Gas', ta: 'எரிவாயு' },
};

/**
 * Call server-side translation API with Gemini 3.8 Flash, or graceful local fallback
 */
export async function translateText(
  text: string,
  targetLang: 'si' | 'en' | 'ta',
  sourceLang?: 'si' | 'en' | 'ta'
): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';

  const detected = sourceLang || detectLanguage(clean);
  if (detected === targetLang) return clean;

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: clean,
        targetLanguage: targetLang,
        sourceLanguage: detected,
      }),
    });

    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.translatedText && !data.fallback) {
        return data.translatedText;
      }
    }
  } catch {
    // Network or server offline, fall through to local fallback
  }

  // Local fallback translation logic
  const lower = clean.toLowerCase();
  for (const [key, trans] of Object.entries(DICTIONARY_MAP)) {
    if (lower.includes(key) || lower.includes(trans.si) || lower.includes(trans.ta)) {
      return `[${trans[targetLang]}] ${clean}`;
    }
  }

  if (targetLang === 'si') {
    return `(පරිවර්තනය): ${clean}`;
  } else if (targetLang === 'ta') {
    return `(மொழிபெயர்ப்பு): ${clean}`;
  } else {
    return `(Translated): ${clean}`;
  }
}

/**
 * Intelligent response generator covering all Sahaya Seva sectors with action buttons,
 * with dedicated support-only mode for Login & Registration screens.
 */

// -------------------------------------------------------------
// 🧠 0. ACTIVE VERIFIED KNOWLEDGE CACHE & SMART LOCATION ENGINE
// -------------------------------------------------------------
let cachedVerifiedKnowledge: VerifiedAiKnowledgeItem[] = [];
let isKnowledgeSubscribed = false;

export function initAiKnowledgeCache(): void {
  if (isKnowledgeSubscribed) return;
  isKnowledgeSubscribed = true;
  try {
    subscribeToVerifiedAiKnowledge((items) => {
      cachedVerifiedKnowledge = items || [];
    });
  } catch (e) {
    console.warn('AI Knowledge cache subscription notice:', e);
  }
}

/**
 * Smart Location & Real-World Road Distance Resolver (100% Free & Local)
 * Automatically detects inquiries about places, distances, directions, and travel times.
 */
export async function resolveLocationAndDistanceQuery(
  cleanQuery: string,
  lowerQuery: string,
  userLocation?: { lat: number; lng: number; nameSi?: string; districtSi?: string } | LocationOption,
  lang: Language = 'si'
): Promise<{ text: string; actions?: AssistantAction[]; quickChips?: string[] } | null> {
  const isLocationOrDistanceQuery =
    lowerQuery.includes('කොහෙද') ||
    lowerQuery.includes('කොහේද') ||
    lowerQuery.includes('තියෙන්නේ') ||
    lowerQuery.includes('තියෙන්නෙ') ||
    lowerQuery.includes('යන්නේ') ||
    lowerQuery.includes('යන්නෙ') ||
    lowerQuery.includes('දුර') ||
    lowerQuery.includes('කොච්චර') ||
    lowerQuery.includes('පාර') ||
    lowerQuery.includes('මාර්ගය') ||
    lowerQuery.includes('ස්ථානය') ||
    lowerQuery.includes('පිහිටීම') ||
    lowerQuery.includes('where is') ||
    lowerQuery.includes('how far') ||
    lowerQuery.includes('how to go') ||
    lowerQuery.includes('route') ||
    lowerQuery.includes('distance') ||
    lowerQuery.includes('direction') ||
    lowerQuery.includes('எங்கே') ||
    lowerQuery.includes('தூரம்') ||
    lowerQuery.includes('செல்வது எப்படி');

  if (!isLocationOrDistanceQuery) return null;

  // 1. Remove punctuation
  let norm = cleanQuery.replace(/[?.,!:-]/g, ' ');

  // 2. Comprehensive noise removal for Sri Lankan conversational queries
  const removePhrases = [
    'මම ඉන්න තැන ඉදන්', 'මම ඉන්න තැන ඉඳන්', 'මං ඉන්න තැන ඉදන්', 'මං ඉන්න තැන ඉඳන්',
    'අපි ඉන්න තැන ඉදන්', 'අපි ඉන්න තැන ඉඳන්', 'මගේ තැන ඉඳන්', 'මගේ තැන ඉදන්',
    'මෙතන ඉදන්', 'මෙතන ඉඳන්', 'මෙතැන ඉදන්', 'මෙතැන ඉඳන්', 'මෙතන සිට', 'මෙතැන සිට',
    'from my location', 'from here',
    'කොච්චර දුරයිද', 'කොච්චර දුරද', 'කොච්චර දුර', 'දුර කොච්චරද', 'දුර කීයද', 'දුර කීයක්ද', 'දුර ප්‍රමාණය',
    'යන්නේ කොහොමද', 'යන්නෙ කොහොමද', 'යන්නේ කොහොම', 'යන්නෙ කොහොම', 'යන්න පාර', 'යන්න විදිය', 'යන විදිය',
    'තියෙන්නේ කොහෙද', 'තියෙන්නෙ කොහෙද', 'තියෙන්නේ කොහේද', 'තියෙන්නෙ කොහේද',
    'කොහෙද තියෙන්නේ', 'කොහෙද තියෙන්නෙ', 'කොහේද තියෙන්නේ', 'කොහේද තියෙන්නෙ',
    'පාර කියන්න', 'පාර මොකක්ද', 'පාර කොහොමද',
    'how far is it', 'how far', 'distance to', 'what is the distance', 'where is', 'route to',
    'how to go to', 'how to go', 'direction to', 'located at', 'location of',
    'எவ்வளவு தூரம்', 'எப்படி போவது', 'எங்கே உள்ளது', 'எங்கே',
    'ඉදන්', 'ඉඳන්', 'සිට', 'දුරයිද', 'දුරද', 'දුර', 'කොහෙද', 'කොහේද', 'කොච්චරද', 'කීයද'
  ];

  // Remove longer phrases first to preserve short tokens
  for (const phrase of removePhrases.sort((a, b) => b.length - a.length)) {
    norm = norm.replace(new RegExp(phrase, 'gi'), ' ');
  }

  const tokens = norm.split(/\s+/).map(t => t.trim()).filter(t => t.length > 0);
  if (!tokens || tokens.length === 0) return null;

  let placeNameCandidate = tokens.join(' ').trim();

  // Strip trailing dative 'ට' (e.g. 'කොළඹට' -> 'කොළඹ', 'නුවරට' -> 'නුවර')
  if (placeNameCandidate.endsWith('ට') && placeNameCandidate.length > 2) {
    placeNameCandidate = placeNameCandidate.slice(0, -1).trim();
  }
  if (placeNameCandidate.toLowerCase().startsWith('to ')) {
    placeNameCandidate = placeNameCandidate.slice(3).trim();
  }

  if (!placeNameCandidate || placeNameCandidate.length < 2) {
    return null;
  }

  try {
    const searchResults = await searchSriLankanPlacesAndRoads(placeNameCandidate);
    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    const targetPlace = searchResults[0];
    const defaultOrigin = { lat: 7.0786, lng: 79.8913, name: 'ජා-ඇල' }; // Default Sri Lanka active user center
    const originLat = userLocation?.lat || defaultOrigin.lat;
    const originLng = userLocation?.lng || defaultOrigin.lng;
    const originName = userLocation?.nameSi || (userLocation as any)?.districtSi || defaultOrigin.name;

    const roadDistanceKm = calculateRoadDistanceKm(originLat, originLng, targetPlace.lat, targetPlace.lng);
    const estMinutes = Math.max(2, Math.round((roadDistanceKm / 38) * 60)); // Avg 38 km/h real-world speed
    const hours = Math.floor(estMinutes / 60);
    const mins = estMinutes % 60;
    const timeFormatted = hours > 0 ? `${hours} පැය ${mins} මිනිත්තු` : `${mins} මිනිත්තු`;

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${targetPlace.lat},${targetPlace.lng}`;

    if (lang === 'en') {
      const isAlreadyThere = roadDistanceKm < 1.5;
      return {
        text: `📍 **${targetPlace.titleEn || targetPlace.titleSi}** (${targetPlace.townEn || targetPlace.districtEn || 'Sri Lanka'})

${
  isAlreadyThere
    ? `📍 **You are currently in/near this location** (less than 1.5 km away).`
    : `🛣️ **Road Distance from ${originName}**: **${roadDistanceKm.toFixed(1)} km**\n⏱️ **Estimated Travel Time**: **approx. ${timeFormatted}** (via motor vehicle/taxi)`
}
📌 **Location Details**: ${targetPlace.roadEn || targetPlace.townEn || ''}, ${targetPlace.districtEn || 'Western Province'}

🗺️ [View Live Route & Directions on Google Maps](${mapsUrl})`,
        actions: [
          { type: 'open_quick', label: '🚗 Quick Transport & Drivers' },
          { type: 'open_directory', label: '📞 Emergency Roadside Help' },
        ],
        quickChips: ['Nearby fuel stations', 'Calculate travel fare', 'Emergency Contacts'],
      };
    } else if (lang === 'ta') {
      const isAlreadyThere = roadDistanceKm < 1.5;
      return {
        text: `📍 **${targetPlace.titleSi || targetPlace.titleEn}** (${targetPlace.townEn || 'இலங்கை'})

${
  isAlreadyThere
    ? `📍 **நீங்கள் தற்போது இந்த இடத்தின் அருகில் உள்ளீர்கள்** (1.5 கி.மீ க்கும் குறைவான தூரம்).`
    : `🛣️ **${originName} இலிருந்து சாலை தூரம்**: **${roadDistanceKm.toFixed(1)} கி.மீ**\n⏱️ **பயண நேரம்**: **சுமார் ${timeFormatted}**`
}
📌 **அமைவிடம்**: ${targetPlace.townEn || ''}, ${targetPlace.districtEn || ''}

🗺️ [கூகிள் வரைபடத்தில் வழියைக் காண்க (Google Maps)](${mapsUrl})`,
        actions: [
          { type: 'open_quick', label: '🚗 விரைவு போக்குவரத்து' },
          { type: 'open_directory', label: '📞 அவசர உதவி' },
        ],
        quickChips: ['எரிபொருள் நிலையங்கள்', 'பயணக் கட்டணம்'],
      };
    } else {
      const isAlreadyThere = roadDistanceKm < 1.5;
      return {
        text: `📍 **${targetPlace.titleSi || targetPlace.titleEn}** (${targetPlace.shortDisplaySi || targetPlace.townSi || targetPlace.districtSi || 'ශ්‍රී ලංකාව'})

${
  isAlreadyThere
    ? `📍 **ඔබ මේ වන විට සිටින්නේද මෙම ස්ථානය ආසන්නයේමය** (කි.මී. 1.5 ට අඩු දුරක්).`
    : `🛣️ **${originName} සිට සැබෑ මාර්ග දුර**: **කි.මී. ${roadDistanceKm.toFixed(1)}**\n⏱️ **ආසන්න ගමන් කාලය**: **${timeFormatted} පමණ** (සාමාන්‍ය රථවාහන වේගය අනුව)`
}
📌 **පිහිටීම**: ${targetPlace.roadSi || targetPlace.villageSi || targetPlace.townSi || ''}, ${targetPlace.districtSi || 'බස්නාහිර පළාත'}

🗺️ [Google Maps ඔස්සේ සජීවී මාර්ගය (Directions) බලන්න](${mapsUrl})`,
        actions: [
          { type: 'open_quick', label: '🚗 ප්‍රවාහන / රියදුරු සේවා' },
          { type: 'open_directory', label: '📞 හදිසි ඇමතුම් සේවා' },
        ],
        quickChips: ['ළඟම ඉන්ධන පිරවුම්හල්', 'ප්‍රවාහන ගාස්තුව ගණනය කිරීම', 'හදිසි ඇමතුම්'],
      };
    }
  } catch (err) {
    console.warn('Location resolver notice:', err);
    return null;
  }
}

export function matchVerifiedKnowledge(
  cleanQuery: string,
  lowerQuery: string,
  lang: Language = 'si'
): { text: string; actions?: AssistantAction[]; quickChips?: string[] } | null {
  if (!cachedVerifiedKnowledge || cachedVerifiedKnowledge.length === 0) return null;

  const queryWords = lowerQuery
    .replace(/[?.,!:-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  for (const item of cachedVerifiedKnowledge) {
    const itemQuestionLower = (item.question || '').toLowerCase();
    
    // 1. Direct question match
    if (lowerQuery.includes(itemQuestionLower) || itemQuestionLower.includes(lowerQuery)) {
      const actionsObj = resolveActionsFromText(item.answer, lang);
      return {
        text: item.answer,
        actions: actionsObj.actions,
        quickChips: item.keywords && item.keywords.length > 0 ? item.keywords.slice(0, 4) : actionsObj.chips,
      };
    }

    // 2. Keyword tag match
    if (Array.isArray(item.keywords)) {
      for (const kw of item.keywords) {
        const cleanKw = (kw || '').trim().toLowerCase();
        if (cleanKw && cleanKw.length > 2 && lowerQuery.includes(cleanKw)) {
          const actionsObj = resolveActionsFromText(item.answer, lang);
          return {
            text: item.answer,
            actions: actionsObj.actions,
            quickChips: item.keywords.slice(0, 4),
          };
        }
      }
    }

    // 3. Word Token Overlap Match (Fuzzy semantic token overlap)
    if (queryWords.length > 0) {
      let matchCount = 0;
      for (const w of queryWords) {
        if (itemQuestionLower.includes(w) || (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(w)))) {
          matchCount++;
        }
      }
      if (matchCount >= Math.min(2, queryWords.length)) {
        const actionsObj = resolveActionsFromText(item.answer, lang);
        return {
          text: item.answer,
          actions: actionsObj.actions,
          quickChips: item.keywords && item.keywords.length > 0 ? item.keywords.slice(0, 4) : actionsObj.chips,
        };
      }
    }
  }

  return null;
}
export async function askAssistant(
  userQuery: string,
  userLang: Language,
  history: Array<{ role: 'user' | 'model'; text: string }> = [],
  mode: 'auth' | 'full' = 'full',
  currentLocation?: LocationOption | { lat: number; lng: number; nameSi?: string; districtSi?: string }
): Promise<{ text: string; actions?: AssistantAction[]; quickChips?: string[] }> {
  const clean = userQuery.trim();
  const lower = clean.toLowerCase();

  // Initialize background cache for admin-verified Q&A
  initAiKnowledgeCache();

  // If in Auth Mode (Login / Registration / Pending / Issues Screen), strictly provide login/reg guidance
  if (mode === 'auth') {
    return resolveAuthKnowledge(clean, lower, userLang);
  }

  // 1. Check Smart Location & Real-World Road Distance Resolver (100% Free & Instant)
  try {
    const locationAnswer = await resolveLocationAndDistanceQuery(clean, lower, currentLocation, userLang);
    if (locationAnswer) {
      return locationAnswer;
    }
  } catch (err) {
    console.warn('Location query resolution error:', err);
  }

  // 2. Check Admin-Verified Knowledge Base (Approved Answers - Instant & 0 Cost)
  try {
    const verifiedAnswer = matchVerifiedKnowledge(clean, lower, userLang);
    if (verifiedAnswer) {
      return verifiedAnswer;
    }
  } catch (err) {
    console.warn('Verified knowledge match error:', err);
  }

  // 3. Query Server-side Gemini AI Model Cascade
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: clean,
        language: userLang,
        conversationHistory: history,
        mode: mode,
        locationContext: (currentLocation as any)?.nameSi || (currentLocation as any)?.districtSi || '',
      }),
    });

    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.reply && !data.fallback) {
        // Automatically submit novel question & Gemini answer to Admin Panel for review
        savePendingAiQuery({
          question: clean,
          answer: data.reply,
          detectedLang: userLang,
          locationContext: (currentLocation as any)?.nameSi || (currentLocation as any)?.districtSi || '',
        }).catch((e) => console.warn('Auto-log pending AI query notice:', e));

        // Extract relevant action buttons based on content
        const extractedActions = resolveActionsFromText(clean, userLang);
        return {
          text: data.reply,
          actions: extractedActions.actions,
          quickChips: extractedActions.chips,
        };
      }
    }
  } catch {
    // Network or server offline, gracefully use local knowledge engine
  }

  // 4. High-Fidelity Local Knowledge Engine (covers all 8 app sectors natively in SI, EN, TA)
  return resolveLocalKnowledge(clean, lower, userLang);
}

function resolveAuthKnowledge(
  query: string,
  lower: string,
  lang: Language
): { text: string; actions: AssistantAction[]; quickChips: string[] } {
  // 1. Inquiries about ads, marketplace, blood, quick services while on login page
  const isAskingAboutPostsOrMarket = 
    lower.includes('දැන්වීම') || lower.includes('පළකර') || lower.includes('ad') || lower.includes('post') ||
    lower.includes('ලේ') || lower.includes('blood') || lower.includes('කාර්මික') || lower.includes('electric') ||
    lower.includes('මිල') || lower.includes('price') || lower.includes('market') || lower.includes('donate');

  if (isAskingAboutPostsOrMarket) {
    if (lang === 'en') {
      return {
        text: '🔒 **You are currently on the Login & Registration Page**.\nTo view live ads, browse market prices, or request quick services & blood assistance, please log in to your account or register a new account first.',
        actions: [
          { type: 'switch_to_login', label: '🔑 Sign In to Account' },
          { type: 'switch_to_register', label: '📝 Create New Account' },
          { type: 'demo_login', label: '👤 Visitor Demo Access' },
        ],
        quickChips: ['How to register?', 'I cannot log in', 'Forgot my password'],
      };
    } else if (lang === 'ta') {
      return {
        text: '🔒 **நீங்கள் தற்போது உள்நுழைவு/பதிவுப் பக்கத்தில் உள்ளீர்கள்**.\nவிளம்பரங்களைப் பார்க்க, சந்தை விலைகளை அறிய அல்லது சேவைகளைப் பெற, முதலில் உங்கள் கணக்கில் உள்நுழையவும் அல்லது புதிய கணக்கைப் பதிவு செய்யவும்.',
        actions: [
          { type: 'switch_to_login', label: '🔑 கணக்கில் உள்நுழைக' },
          { type: 'switch_to_register', label: '📝 புதிய கணக்கை உருவாக்கவும்' },
          { type: 'demo_login', label: '👤 பார்வையாளர் அணுகல்' },
        ],
        quickChips: ['பதிவு செய்வது எப்படி?', 'உள்நுழைய முடியவில்லை'],
      };
    } else {
      return {
        text: '🔒 **ඔබ තවමත් පිවිසුම් (Login) පිටුවේ සිටී**.\nදැන්වීම් පළකිරීම, ප්‍රජා සේවා ලබාගැනීම, වෙළඳපල අඩුම මිල ගණන් බැලීම සහ හදිසි ලේ ආධාර ලබාගැනීමට කරුණාකර පළමුව ඔබගේ ගිණුමට Login වන්න හෝ නව ගිණුමක් ලියාපදිංචි කරගන්න.',
        actions: [
          { type: 'switch_to_login', label: '🔑 ගිණුමට Login වන්න' },
          { type: 'switch_to_register', label: '📝 නව ගිණුමක් සාදන්න' },
          { type: 'demo_login', label: '👤 නරඹන්නා ලෙස පිවිසෙන්න' },
        ],
        quickChips: ['ලියාපදිංචි වන්නේ කෙසේද?', 'Login වෙන්න බැහැ', 'මුරපදය අමතක වුණා'],
      };
    }
  }

  // 2. Data Safety & Privacy inquiries in Auth Mode (තොරතුරු ආරක්ෂිතද / Privacy)
  const isSafetyQuery =
    lower.includes('ආරක්ෂිත') ||
    lower.includes('ආරක්ෂා') ||
    lower.includes('safe') ||
    lower.includes('security') ||
    lower.includes('privacy') ||
    lower.includes('රහස්‍ය') ||
    lower.includes('දත්ත') ||
    lower.includes('data') ||
    lower.includes('பாதுகாப்ப');

  if (isSafetyQuery) {
    if (lang === 'en') {
      return {
        text: `🔒 **Is your data and information safe on Sahaya Sewa?**

**Yes, 100%!** All your personal data, identity documents, and interactions are strictly secured:

1. 🔒 **NIC & Profile Privacy**: Your National Identity Card (NIC) photo and private details are **never published publicly**. They are exclusively accessible to verified system administrators solely for identity authentication and anti-fraud verification.
2. 🛡️ **Cloud Encryption (SSL/TLS)**: All data transmissions and stored records are secured using enterprise 256-bit SSL encryption and protected by Firestore Security Rules.
3. 🚫 **No Third-Party Sharing**: We never sell, share, or disclose your phone numbers, addresses, or photos to any advertisers or third-party entities.
4. 🤝 **Trusted Community**: Identity verification ensures real, authentic community members for mutual aid and safety.`,
        actions: [
          { type: 'switch_to_register', label: '📝 Create Secure Account' },
          { type: 'switch_to_login', label: '🔑 Sign In' },
        ],
        quickChips: ['How to register?', 'What photos are needed?'],
      };
    } else if (lang === 'ta') {
      return {
        text: `🔒 **சகாய சேவா தளத்தில் உங்கள் தகவல்கள் பாதுகாப்பானதா?**

**ஆம், 100% பாதுகாப்பானது!**

1. 🔒 **அடையாள அட்டை ரகசியம்**: உங்கள் அடையாள அட்டை (NIC) மற்றும் தனிப்பட்ட விவரங்கள் பொதுமக்களுக்குக் காட்டப்படாது. கணக்குச் சரிபார்ப்புக்கு மட்டுமே நிர்வாகிகளால் பயன்படுத்தப்படும்.
2. 🛡️ **குறியாக்கம் (Encryption)**: அனைத்து தகவல்களும் உயர் மட்ட SSL பாதுகாப்புடன் சேமிக்கப்படுகின்றன.
3. 🚫 **மூன்றாம் தரப்பினருக்கு வழங்கப்படாது**: உங்கள் தொலைபேசி எண் அல்லது விவரங்கள் யாருக்கும் விற்கப்படவோ பகிரப்படவோ மாட்டாது.`,
        actions: [
          { type: 'switch_to_register', label: '📝 பாதுகாப்பான கணக்கை உருவாக்கவும்' },
          { type: 'switch_to_login', label: '🔑 உள்நுழைக' },
        ],
        quickChips: ['பதிவு செய்வது எப்படி?', 'என்ன ஆவணங்கள் தேவை?'],
      };
    } else {
      return {
        text: `🔒 **සහය සේවා පද්ධතිය තුළ ඔබගේ තොරතුරු ආරක්ෂිතද?**

**ඔව්, 100% ක්ම සුරක්ෂිතයි!** ඔබගේ දත්ත සහ පුද්ගලික තොරතුරු පද්ධතිය තුළ ඉහළම ආරක්ෂාවක් සහිතව (Highly Secure & Encrypted) පවත්වාගෙන යනු ලැබේ:

1. 🔒 **හැඳුනුම්පත් (NIC) සහ තොරතුරු රහස්‍යභාවය**: ඔබ ලබාදෙන ජාතික හැඳුනුම්පත් (NIC) ඡායාරූප හෝ පුද්ගලික රහස්‍ය තොරතුරු **කිසිදු සාමාන්‍ය පරිශීලකයෙකුට හෝ ප්‍රසිද්ධියට පත් නොවේ**. ඒවා පරිශීලනය කරන්නේ ගිණුම සත්‍යාපනය (Verification) සඳහා බලයලත් Admin වරුන් විසින් පමණි.
2. 🛡️ **Cloud Encryption & Security Rules**: සියලුම දත්ත Cloud Firestore සහ ආරක්ෂිත සේවාදායකයන් තුළ SSL/TLS 256-bit Encryption මඟින් සංකේතනය කර ඇත. අනවසර ප්‍රවේශයන් සම්පූර්ණයෙන්ම වළක්වා ඇත.
3. 🚫 **තෙවන පාර්ශ්වයන්ට ලබා නොදීම (No Third-Party Sharing)**: ඔබගේ දුරකථන අංක, ලිපිනයන් හෝ දත්ත කිසිදු වෙළඳ දැන්වීම්කරුවෙකුට හෝ තෙවන පාර්ශ්වයකට කිසිසේත්ම විකුණන්නේ හෝ ලබා දෙන්නේ නැත.
4. 🤝 **ව්‍යාජ ගිණුම්වලින් තොර සත්‍යාපිත සමාජයක්**: ප්‍රජා උපකාර, ආධාර බෙදාහැරීම් සහ ලේ පරිත්‍යාග විශ්වාසනීයව සිදු කිරීමට පමණක් මෙම සත්‍යාපනය ක්‍රියාත්මක වේ.`,
        actions: [
          { type: 'switch_to_register', label: '📝 සුරක්ෂිතව ලියාපදිංචි වන්න' },
          { type: 'switch_to_login', label: '🔑 Login වන්න' },
        ],
        quickChips: ['ලියාපදිංචි වන්නේ කෙසේද?', 'අවශ්‍ය ඡායාරූප මොනවාද?', 'Login ගැටලුවක්'],
      };
    }
  }

  // 3. How to register / Registration help (Strictly 2 photos: Face photo + NIC front photo only)
  if (lower.includes('ලියාපදිංචි') || lower.includes('register') || lower.includes('ගිණුමක්') || lower.includes('signup') || lower.includes('sign up') || lower.includes('பதிவு')) {
    if (lang === 'en') {
      return {
        text: `📝 **How to Register a New Account (Step-by-Step)**:

1. Click the **Register** button on the screen.
2. Enter your Name, unique User ID, WhatsApp Phone Number, Address, District, and Police Division.
3. **Upload only 2 photos**:
   • 📸 **Clear Face Photo** (Profile Selfie).
   • 🆔 **NIC Front Photo ONLY** (National Identity Card Front).
   *(NIC back photo or other documents are NOT required).*
4. Set a secure password and submit.
5. Once verified by our administrators for safety, your account will be activated!`,
        actions: [
          { type: 'switch_to_register', label: '📝 Open Registration Form' },
          { type: 'open_issues_help', label: '❓ Help & Support' },
        ],
        quickChips: ['How to take NIC front photo?', 'Is my data safe?', 'Password requirements'],
      };
    } else if (lang === 'ta') {
      return {
        text: `📝 **புதிய கணக்கை எவ்வாறு பதிவு செய்வது (படிபடியாக)**:

1. **பதிவு செய்க** பொத்தானைக் கிளிக் செய்யவும்.
2. பெயர், பயனர் ஐடி, வாட்ஸ்அப் எண், முகவரி, மாவட்டம் ஆகியவற்றை உள்ளிடவும்.
3. **2 புகைப்படங்கள் மட்டுமே தேவை**:
   • 📸 **தெளிவான முகப் புகைப்படம்** (Selfie).
   • 🆔 **அடையாள அட்டையின் முன்பக்க புகைப்படம் மட்டுமே (NIC Front Only)**.
   *(பின்பக்க புகைப்படம் தேவையில்லை).*
4. கடவுச்சொல்லை அமைத்து சமர்ப்பிக்கவும். நிர்வாகி அனுமதித்தவுடன் கணக்கு செயல்படும்.`,
        actions: [
          { type: 'switch_to_register', label: '📝 பதிவு படிவத்தைத் திறக்கவும்' },
          { type: 'open_issues_help', label: '❓ உதவி கோரிக்கை' },
        ],
        quickChips: ['NIC புகைப்படம் எப்படி எடுப்பது?', 'தகவல் பாதுகாப்பானதா?'],
      };
    } else {
      return {
        text: `📝 **නව ගිණුමක් ලියාපදිංචි කරගන්නේ කෙසේද? (පියවරෙන් පියවර)**:

1. **ලියාපදිංචි වන්න** බොත්තම ඔබන්න.
2. ඔබගේ නම, කැමති පරිශීලක නාමය (User ID), WhatsApp දුරකථන අංකය, ලිපිනය, දිස්ත්‍රික්කය සහ පොලිස් බලප්‍රදේශය ඇතුළත් කරන්න.
3. **ලබාගත යුත්තේ ඡායාරූප 2ක් පමණි**:
   • 📸 **පැහැදිලි මුහුණේ ඡායාරූපයක් (Face Photo / Selfie)**.
   • 🆔 **ජාතික හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය පමණි (NIC Front Photo Only)**.
   *(හැඳුනුම්පතේ පිටුපස (Back) ඡායාරූප හෝ වෙනත් ලිපි ලේඛන අවශ්‍ය නොවේ).*
4. ආරක්ෂිත මුරපදයක් ඇතුළත් කර Submit කරන්න. පරිපාලක අනුමැතියෙන් පසු ගිණුම සක්‍රිය වේ.`,
        actions: [
          { type: 'switch_to_register', label: '📝 ලියාපදිංචි පෝරමයට යන්න' },
          { type: 'open_issues_help', label: '❓ ගැටලු සහ උපකාර' },
        ],
        quickChips: ['NIC ඉදිරිපස ඡායාරූප ගන්නේ කොහොමද?', 'තොරතුරු ආරක්ෂිතද?', 'මුරපද රීති මොනවාද?'],
      };
    }
  }

  // 4. Taking NIC Front / Face Photos
  if (lower.includes('nic') || lower.includes('හැඳුනුම්පත') || lower.includes('photo') || lower.includes('ඡායාරූප') || lower.includes('කාඩ්පත') || lower.includes('புகைப்படம்')) {
    if (lang === 'en') {
      return {
        text: `🆔 **Guidance for Photo Uploads in Registration**:

• 📸 **Face Photo**: Ensure good lighting with your face clearly visible directly into the camera.
• 🆔 **NIC Front Photo ONLY**: Place your National Identity Card on a flat surface and capture the **front side only** clearly. Ensure text and numbers are readable.
• *Note: NIC back side is NOT required.*`,
        actions: [
          { type: 'switch_to_register', label: '📝 Go to Registration' },
        ],
        quickChips: ['Is my data safe?', 'Can I register without NIC?'],
      };
    } else if (lang === 'ta') {
      return {
        text: `🆔 **அடையாள அட்டை (NIC Front) மற்றும் புகைப்பட வழிகாட்டல்**:

• 📸 **முகப் புகைப்படம்**: நல்ல வெளிச்சத்தில் உங்கள் முகம் தெளிவாகத் தெரிய வேண்டும்.
• 🆔 **அடையாள அட்டையின் முன்பக்கம் மட்டுமே**: முன்பக்கத்தை மட்டும் நிழல் விழாமல் தெளிவாகப் புகைப்படம் எடுக்கவும். (பின்பக்கம் தேவையில்லை).`,
        actions: [
          { type: 'switch_to_register', label: '📝 பதிவுக்குச் செல்லவும்' },
        ],
        quickChips: ['எனது தகவல் பாதுகாப்பானதா?'],
      };
    } else {
      return {
        text: `🆔 **හැඳුනුම්පත් (NIC Front) සහ මුහුණේ ඡායාරූප ගැනීමේ උපදෙස්**:

• 📸 **මුහුණේ ඡායාරූපය**: හොඳ ආලෝකයක් ඇති ස්ථානයක කෙළින්ම කැමරාව දෙස බලා මුහුණ පැහැදිලිව පෙනෙන සේ ගන්න.
• 🆔 **ජාතික හැඳුනුම්පතේ ඉදිරිපස පමණි (NIC Front Photo Only)**: හැඳුනුම්පත තලයක තබා ඉදිරිපස අකුරු, අංක සහ ඡායාරූපය ආලෝකය පරාවර්තනය නොවී පැහැදිලිව ලබාගන්න.
• *සැ.යු: හැඳුනුම්පතේ පසුපස (Back) ඡායාරූප අවශ්‍ය නොවේ.*`,
        actions: [
          { type: 'switch_to_register', label: '📝 ලියාපදිංචි වීමට යන්න' },
        ],
        quickChips: ['තොරතුරු ආරක්ෂිතද?', 'ලියාපදිංචි පෝරමය'],
      };
    }
  }

  // 4. Login Issues / Password Forgotten / Account approval
  if (lower.includes('login') || lower.includes('බැහැ') || lower.includes('මුරපද') || lower.includes('password') || lower.includes('අමතක') || lower.includes('අනුමත') || lower.includes('approve') || lower.includes('உள்நுழைய')) {
    if (lang === 'en') {
      return {
        text: '🔑 **Login & Password Support**:\n• **Login Identifier**: You can log in using either your **User ID** or your **WhatsApp Phone Number** along with your password.\n• **Pending Approval**: New registrations undergo brief safety verification before activation.\n• **Forgot Password or Locked**: Click **Issues & Help** at the bottom of the login card to send a direct message to system administrators.',
        actions: [
          { type: 'switch_to_login', label: '🔑 Login Page' },
          { type: 'open_issues_help', label: '❓ Report Login Issue' },
          { type: 'demo_login', label: '👤 Try User Demo' },
        ],
        quickChips: ['Report a Login Issue', 'Try User Demo', 'How to Register?'],
      };
    } else if (lang === 'ta') {
      return {
        text: '🔑 **உள்நுழைவு மற்றும் கடவுச்சொல் உதவி**:\n• உங்கள் **பயனர் ஐடி** அல்லது **வாட்ஸ்அப் எண்** மற்றும் கடவுச்சொல்லைப் பயன்படுத்தி உள்நுழையலாம்.\n• சிக்கல்கள் இருந்தால், உள்நுழைவுப் பக்கத்தில் உள்ள **உதவி மற்றும் சிக்கல்கள்** பொத்தானைக் கிளிக் செய்யவும்.',
        actions: [
          { type: 'switch_to_login', label: '🔑 உள்நுழைவு பக்கம்' },
          { type: 'open_issues_help', label: '❓ சிக்கலைத் தெரிவிக்கவும்' },
        ],
        quickChips: ['சிக்கலைத் தெரிவிக்கவும்', 'பதிவு செய்வது எப்படி?'],
      };
    } else {
      return {
        text: '🔑 **Login වීමේ ගැටලු සහ මුරපද සහය**:\n• **Login වීමට**: ඔබගේ **User ID** එක හෝ **WhatsApp දුරකථන අංකය** සමඟ ඔබ ලබාදුන් මුරපදය ඇතුළත් කරන්න.\n• **ගිණුම අනුමත වීම (Pending Approval)**: ප්‍රජාවේ ආරක්ෂාව තහවුරු කිරීමට පරිපාලක විසින් විස්තර සත්‍යාපනය කරනු ලැබේ.\n• **මුරපදය අමතක නම් හෝ ගැටලුවක් ඇත්නම්**: Login පිටුවේ පහළ ඇති **ගැටලු & උපකාර (Issues & Help)** බොත්තම ඔබා පණිවිඩයක් එවන්න. පරිපාලක කණ්ඩායම ඔබට සහය වනු ඇත.',
        actions: [
          { type: 'switch_to_login', label: '🔑 Login පිටුවට' },
          { type: 'open_issues_help', label: '❓ ගැටලු & උපකාර පණිවිඩයක් යවන්න' },
          { type: 'demo_login', label: '👤 නරඹන්නා ලෙස පිවිසෙන්න' },
        ],
        quickChips: ['ගැටලුවක් වාර්තා කරන්න', 'නරඹන්නා ලෙස පිවිසෙන්න (Demo)', 'නව ලියාපදිංචිය'],
      };
    }
  }

  // Default Auth Welcome
  if (lang === 'en') {
    return {
      text: '👋 Hello! I am your **Login & Registration Support Assistant**.\nI am here to guide you through getting started:\n• 📝 How to Register a New Account\n• 🆔 Taking clear NIC and Face Photos\n• 🔑 Resolving Login and Password Issues\n• ⏳ Checking Account Approval Status\n\nHow may I help you today?',
      actions: [
        { type: 'switch_to_login', label: '🔑 Sign In' },
        { type: 'switch_to_register', label: '📝 Register' },
        { type: 'open_issues_help', label: '❓ Help & Support' },
      ],
      quickChips: ['How to register?', 'Cannot log in', 'NIC photo upload help', 'Try User Demo'],
    };
  } else if (lang === 'ta') {
    return {
      text: '👋 வணக்கம்! நான் உங்கள் **உள்நுழைவு மற்றும் பதிவு உதவி வழிகாட்டி**.\nஉங்களுக்குத் தேவையான உதவிகளை நான் வழங்குகிறேன்:\n• 📝 புதிய கணக்கை உருவாக்குவது எப்படி\n• 🆔 அடையாள அட்டை புகைப்பட வழிகாட்டல்\n• 🔑 உள்நுழைவு சிக்கல்கள்\n\nஉங்களுக்கு என்ன உதவி தேவை?',
      actions: [
        { type: 'switch_to_login', label: '🔑 உள்நுழைக' },
        { type: 'switch_to_register', label: '📝 பதிவு செய்க' },
      ],
      quickChips: ['பதிவு செய்வது எப்படி?', 'உள்நுழைய முடியவில்லை'],
    };
  } else {
    return {
      text: '👋 ආයුබෝවන්! මම ඔබගේ **පිවිසුම් සහ ලියාපදිංචි සහය මිතුරා (Login & Registration Support)**.\nපද්ධතියට සාදරයෙන් පිළිගනිමු. පිවිසීමට අදාළ ඕනෑම සහයක් ලබාදීමට මම සූදානම්:\n• 📝 නව ගිණුමක් ලියාපදිංචි කරගැනීම\n• 🆔 හැඳුනුම්පත් (NIC) සහ මුහුණේ ඡායාරූප නිවැරදිව ගැනීම\n• 🔑 Login වීමේ ගැටලු සහ මුරපද සහය\n• ⏳ ගිණුම් අනුමැතිය සහ සත්‍යාපනය\n\nඔබට අවශ්‍ය උපකාරය කුමක්ද?',
      actions: [
        { type: 'switch_to_login', label: '🔑 Login පිටුව' },
        { type: 'switch_to_register', label: '📝 නව ලියාපදිංචිය' },
        { type: 'open_issues_help', label: '❓ ගැටලු & උපකාර' },
      ],
      quickChips: ['නව ගිණුමක් හදන්නේ කොහොමද?', 'Login වෙන්න බැහැ', 'NIC ඡායාරූප ගන්නේ කොහොමද?', 'නරඹන්නා ලෙස පිවිසෙන්න (Demo)'],
    };
  }
}

function resolveActionsFromText(
  query: string,
  lang: Language
): { actions: AssistantAction[]; chips: string[] } {
  const lower = query.toLowerCase();
  const actions: AssistantAction[] = [];
  const chips: string[] = [];

  const isForm = lower.includes('පෝරම') || lower.includes('form') || lower.includes('පුරව') || lower.includes('fill') || lower.includes('படிவம்');
  const isBlood = lower.includes('ලේ') || lower.includes('blood') || lower.includes('இரத்தம்') || lower.includes('donor');
  const isQuick = lower.includes('කාර්මික') || lower.includes('electric') || lower.includes('plumb') || lower.includes('quick') || lower.includes('repair') || lower.includes('පැච්') || lower.includes('බාස්');
  const isFind = lower.includes('නැති') || lower.includes('lost') || lower.includes('found') || lower.includes('සොයා') || lower.includes('தொலைந்த') || lower.includes('wallet') || lower.includes('nic');
  const isFromYou = lower.includes('දීමන') || lower.includes('donate') || lower.includes('give') || lower.includes('නොමිලේ') || lower.includes('தானம்') || lower.includes('පොත්');
  const isGroup = lower.includes('ශ්‍රමදාන') || lower.includes('group') || lower.includes('කණ්ඩායම්') || lower.includes('சிரமதானம்');
  const isMarket = lower.includes('මිල') || lower.includes('price') || lower.includes('market') || lower.includes('හාල්') || lower.includes('සීනි') || lower.includes('விலை');
  const isWallet = lower.includes('credit') || lower.includes('wallet') || lower.includes('ණය') || lower.includes('මුදල්') || lower.includes('ශේෂ');
  const isHelpPost = lower.includes('උපකාර') || lower.includes('ඉල්ලුම්') || lower.includes('help post') || lower.includes('දැන්වීම');
  const isRedAlert = lower.includes('රතු නිවේදන') || lower.includes('red alert') || lower.includes('ආපදා');

  if (isHelpPost || isForm) {
    actions.push({
      type: 'open_help_post',
      label: lang === 'en' ? '📝 Open Help Post Form' : lang === 'ta' ? '📝 உதவி படிவத்தைத் திறக்கவும்' : '📝 උපකාර ඉල්ලුම් පෝරමය විවෘත කරන්න',
    });
  }

  if (isBlood) {
    actions.push({
      type: 'open_blood',
      label: lang === 'en' ? '🩸 Open Blood & Disaster Hub' : lang === 'ta' ? '🩸 இரத்த தான மையத்தைத் திறக்கவும்' : '🩸 හදිසි ලේ කේන්ද්‍රය විවෘත කරන්න',
    });
    chips.push(lang === 'en' ? 'How to fill Blood Request Form?' : lang === 'ta' ? 'இரத்தக் கோரிக்கை படிவம் நிரப்புவது எப்படி?' : 'ලේ ඉල්ලුම් පෝරමය පුරවන හැටි');
  }

  if (isQuick) {
    actions.push({
      type: 'open_quick',
      label: lang === 'en' ? '⚡ Open Quick Services' : lang === 'ta' ? '⚡ விரைவு சேவைகளைத் திறக்கவும்' : '⚡ ඉක්මන් සේවා විවෘත කරන්න',
    });
    chips.push(lang === 'en' ? 'How to fill Quick Service Form?' : lang === 'ta' ? 'விரைவு சேவை படிவம் நிரப்புவது எப்படி?' : 'ඉක්මන් සේවා පෝරමය පුරවන හැටි');
  }

  if (isFind) {
    actions.push({
      type: 'open_find',
      label: lang === 'en' ? '🔍 Open Find For Me' : lang === 'ta' ? '🔍 எனக்காகத் தேடுங்கள்' : '🔍 සොයාදෙන්න විවෘත කරන්න',
    });
    chips.push(lang === 'en' ? 'How to fill Lost Item Form?' : lang === 'ta' ? 'தொலைந்த பொருள் படிவம் நிரப்புவது எப்படி?' : 'නැතිවූ දේ පෝරමය පුරවන හැටි');
  }

  if (isFromYou) {
    actions.push({
      type: 'open_from_you',
      label: lang === 'en' ? '🎁 Open From Me To You' : lang === 'ta' ? '🎁 என்னிடமிருந்து உங்களுக்கு' : '🎁 මගෙන් ඔබට (නොමිලේ දීමනා)',
    });
    chips.push(lang === 'en' ? 'How to fill Donation Form?' : lang === 'ta' ? 'தான படிவம் நிரப்புவது எப்படி?' : 'නොමිලේ පරිත්‍යාග පෝරමය පුරවන හැටි');
  }

  if (isGroup) {
    actions.push({
      type: 'open_group',
      label: lang === 'en' ? '🤝 Open Shramadana Hub' : lang === 'ta' ? '🤝 சிரமதான மையத்தைத் திறக்கவும்' : '🤝 ශ්‍රමදාන / කණ්ඩායම් වැඩ',
    });
  }

  if (isMarket) {
    actions.push({
      type: 'open_market',
      label: lang === 'en' ? '🛒 Check Lowest Prices' : lang === 'ta' ? '🛒 குறைந்த விலையை சரிபார்க்கவும்' : '🛒 අඩුම මිල ගණන් පරීක්ෂා කරන්න',
    });
    chips.push(lang === 'en' ? 'How does Marketplace work?' : lang === 'ta' ? 'சந்தை எவ்வாறு இயங்குகிறது?' : 'වෙළඳපල ක්‍රියාකරන්නේ කොහොමද?');
  }

  if (isRedAlert) {
    actions.push({
      type: 'open_red_alert_create',
      label: lang === 'en' ? '🚨 Create Red Alert' : lang === 'ta' ? '🚨 அவசர எச்சரிக்கை விடுக்க' : '🚨 රතු නිවේදනයක් නිකුත් කරන්න',
    });
  }

  if (isWallet) {
    actions.push({
      type: 'open_wallet',
      label: lang === 'en' ? '💳 Open User Wallet' : lang === 'ta' ? '💳 பணப்பையைத் திறக்கவும்' : '💳 මගේ Wallet එක විවෘත කරන්න',
    });
  }

  return { actions, chips };
}

function resolveLocalKnowledge(
  query: string,
  lower: string,
  lang: Language
): { text: string; actions: AssistantAction[]; quickChips: string[] } {
  // -------------------------------------------------------------
  // 1. APP PURPOSE & WHAT DOES THIS APP DO (මේ ඇප් එකෙන් වෙන්නේ කුමක්ද / ඇප් එක ගැන)
  // -------------------------------------------------------------
  const isAppPurposeQuery =
    lower.includes('වෙන්නේ කුමක්ද') ||
    lower.includes('කරන්නේ කුමක්ද') ||
    lower.includes('වෙන්නෙ මොකක්ද') ||
    lower.includes('කරන්නෙ මොකක්ද') ||
    lower.includes('මොකක්ද මේ ඇප්') ||
    lower.includes('මොකක්ද මේක') ||
    lower.includes('මේ ඇප් එක ගැන') ||
    lower.includes('ඇප් එක ගැන') ||
    lower.includes('වෙන්නේ මොනවාද') ||
    lower.includes('තියෙන්නේ මොනවාද') ||
    lower.includes('කරන්න පුළුවන් මොනවද') ||
    lower.includes('ඇප් එක මොකටද') ||
    lower.includes('සහය සේවා කියන්නේ') ||
    lower.includes('ඇප් එකේ විස්තර') ||
    lower.includes('what is this app') ||
    lower.includes('what does this app do') ||
    lower.includes('about this app') ||
    lower.includes('about sahaya sewa') ||
    lower.includes('purpose of this app') ||
    lower.includes('செயலி என்ன செய்கிறது');

  if (isAppPurposeQuery) {
    if (lang === 'en') {
      return {
        text: `🌟 **Welcome to Sahaya Sewa (සහය සේවා)!**
Sri Lanka's premier community mutual aid, emergency response, and verified services network.

Here is what you can do through this app:
1. 🩸 **Emergency Blood Radar**: Match with verified blood donors across your district in real time.
2. ⚡ **24/7 Quick Artisan Services**: Connect with electricians, plumbers, and mechanics within a 15km radar.
3. 🚨 **5km Red Alert Sirens**: Instant community alerts for floods, accidents, and sudden hazards.
4. 📦 **Transparent Aid Ledger**: Track flood/disaster relief donations with 6-digit security PINs to eliminate fraud.
5. 🔍 **Find For Me (Lost & Found)**: Community search network for lost national ID cards, driving licenses, and pets.
6. 🎁 **From Me To You Free Gifts**: Give away books, clothes, and medical equipment with zero monetary exchange.
7. 🛒 **Lowest Market Prices Index**: Compare daily grocery and vegetable price gaps across local shops.
8. 🤝 **Group Work & Shramadana**: Organize neighborhood cleanups and community volunteering projects.`,
        actions: [
          { type: 'open_help_post', label: '📝 Post a Help Request' },
          { type: 'open_quick', label: '⚡ 24/7 Quick Services' },
          { type: 'open_blood', label: '🩸 Blood & Disaster Radar' },
          { type: 'open_market', label: '🛒 Lowest Market Prices' },
        ],
        quickChips: [
          'How to post a request?',
          'How does Blood Radar work?',
          'How are helpers verified?',
          'Check Market Prices',
        ],
      };
    } else if (lang === 'ta') {
      return {
        text: `🌟 **சகாய சேவா (Sahaya Sewa) தளத்திற்கு வரவேற்கிறோம்!**
இலங்கையின் முதன்மை பரஸ்பர உதவி மற்றும் அவசர சேவை வலையமைப்பு.

இந்த செயலியின் மூலம் நீங்கள் செய்யக்கூடியவை:
1. 🩸 **அவசர இரத்த தானம்**: உங்கள் மாவட்டத்தில் உள்ள இரத்தக் கொடையாளர்களை உடனுக்குடன் கண்டறியலாம்.
2. ⚡ **24/7 விரைவு சேவைகள்**: 15 கி.மீ சுற்றளவில் உள்ள எலக்ட்ரீஷியன், பிளம்பர் போன்ற கைவினைஞர்களை இணைத்தல்.
3. 🚨 **5 கி.மீ அவசர எச்சரிக்கைகள்**: இயற்கை அனர்த்தங்கள், விபத்துக்கள் குறித்த அவசர எச்சரிக்கைகள்.
4. 📦 **வெளிப்படையான நிவாரண லெட்ஜர்**: நிவாரணப் பொருட்களை ஏமாற்றுதலின்றி விநியோகிக்கும் முறைமை.
5. 🔍 **தொலைந்தவை தேடல்**: அடையாள அட்டை, ஓட்டுநர் உரிமம் போன்றவற்றைத் தேடும் தளம்.
6. 🎁 **இலவச அன்பளிப்புகள்**: புத்தகங்கள், உபகரணங்களை இலவசமாகப் பகிர்தல்.
7. 🛒 **குறைந்தபட்ச சந்தை விலைகள்**: அத்தியாவசியப் பொருட்களின் குறைந்தபட்ச விலைகளை ஒப்பிடுதல்.`,
        actions: [
          { type: 'open_help_post', label: '📝 உதவி கோரிக்கையை இடுக' },
          { type: 'open_quick', label: '⚡ விரைவு சேவைகள்' },
          { type: 'open_blood', label: '🩸 இரத்த தானம்' },
        ],
        quickChips: ['உதவி கோருவது எப்படி?', 'இரத்த தானம் எவ்வாறு இயங்குகிறது?'],
      };
    } else {
      return {
        text: `🌟 **සහය සේවා (Sahaya Sewa) යනු ශ්‍රී ලාංකික අපේම ප්‍රජා සත්කාරක සහ හදිසි සේවා ජාලයයි!**

මෙම ඇප් එක හරහා ඔබට පහත ප්‍රධාන සේවාවන් 8 සම්පූර්ණයෙන්ම ලබාගත හැක:

1. 🩸 **හදිසි ලේ බැංකු රේඩාර් (Emergency Blood Radar)**:
   රෝගීන්ට අවශ්‍ය ලේ වර්ගයට අදාළ ඔබගේ දිස්ත්‍රික්කයේ සිටින සත්‍යාපිත ලේ පරිත්‍යාගශීලීන් රේඩාර් මඟින් ක්ෂණිකව සම්බන්ධ කරගැනීම.
2. ⚡ **24/7 ක්ෂණික කාර්මික සේවා (Quick Services)**:
   කි.මී. 15 සීමාවේ සිටින විදුලි, නල, වාහන කාර්මිකයන් නිවසටම ගෙන්වා ගැනීම සහ සාධාරණ බිල්පත් ගෙවීම.
3. 🚨 **කි.මී. 5 රතු නිවේදන (Red Alert Hazard Sirens)**:
   ගංවතුර, නායයෑම්, හදිසි අනතුරු පිළිබඳව අවට කි.මී. 5ක අසල්වැසියන්ට ක්ෂණික සයිරන් අනතුරු ඇඟවීම් නිකුත් කිරීම.
4. 📦 **විනිවිදභාවයේ ආධාර ලෙජරය (Transparent Aid Ledger)**:
   ආපදා සහන කඳවුරු සහ පවුල් වෙත ආධාර බෙදාදීම අංක 6ක රහස් PIN එකකින් සත්‍යාපනය කර වංචාවලින් තොරව ප්‍රසිද්ධ ලෙජරයක සටහන් කිරීම.
5. 🔍 **සොයාදෙන්න (Lost & Found)**:
   නැතිවූ ජාතික හැඳුනුම්පත්, රියදුරු බලපත්‍ර, සුරතල් සතුන් හෝ ලියකියවිලි ප්‍රජාව සමඟ එක්ව සොයාගැනීම.
6. 🎁 **මා වෙතින් ඔබට නොමිලේ දීමනා (From Me To You Free Gifts)**:
   පොත්පත්, ඇඳුම්, රෝද පුටු වැනි දෑ අවශ්‍යතා සහිත අයට මුදල් අය කිරීමකින් තොරව 100% නොමිලේ පරිත්‍යාග කිරීම.
7. 🛒 **වෙළඳපල අඩුම මිල දර්ශකය (Lowest Market Prices)**:
   අත්‍යවශ්‍ය භාණ්ඩ හා එළවළු සඳහා නගරයේ සාප්පු වල අඩුම මිල ගණන් සහ ඉතිරි කරගත හැකි ලාභ පරතරය සංසන්දනය.
8. 🤝 **ශ්‍රමදාන සහ කණ්ඩායම් වැඩ (Group Work)**:
   ප්‍රදේශයේ පන්සල්, පාසල් හෝ ගම්මාන ශ්‍රමදාන කටයුතු සංවිධානය කර ස්වේච්ඡා සහායකයින් එක්රැස් කිරීම.`,
        actions: [
          { type: 'open_help_post', label: '📝 උපකාර ඉල්ලුම් පෝරමය' },
          { type: 'open_quick', label: '⚡ 24/7 ක්ෂණික කාර්මික සේවා' },
          { type: 'open_blood', label: '🩸 හදිසි ලේ & ආපදා රේඩාර්' },
          { type: 'open_market', label: '🛒 වෙළඳපල අඩුම මිල ගණන්' },
        ],
        quickChips: [
          'පෝරම පුරවන්නේ කොහොමද?',
          'ලේ ඉල්ලුම් කරන්නේ කොහොමද?',
          'කාර්මික සේවා ලබාගන්නේ කොහොමද?',
          'තොරතුරු ආරක්ෂිතද?',
        ],
      };
    }
  }

  // -------------------------------------------------------------
  // 2. EMERGENCY BLOOD INQUIRIES (හදිසි ලේ බැංකු රේඩාර්)
  // -------------------------------------------------------------
  const isBloodQuery =
    lower.includes('ලේ') ||
    lower.includes('රුධිර') ||
    lower.includes('blood') ||
    lower.includes('පට්ටිකා') ||
    lower.includes('platelet') ||
    lower.includes('இரத்தம்');

  if (isBloodQuery) {
    if (lang === 'en') {
      return {
        text: `🩸 **Emergency Blood Assistance Radar**
Our real-time radar immediately alerts registered, verified blood donors of the requested blood group (A+, A-, B+, B-, O+, O-, AB+, Platelets) in your district.

**How to Request Blood**:
1. Click **"Request Blood"** below.
2. Select Patient Name, Required Blood Group, and Hospital.
3. Submit to broadcast an instant emergency notification to matching donors.`,
        actions: [
          { type: 'open_blood', label: '🩸 Open Blood Request Form' },
          { type: 'open_directory', label: '📞 National Blood Bank (011-2698891)' },
        ],
        quickChips: ['Who can donate blood?', 'Check donor radar', 'Emergency ambulance 1990'],
      };
    } else {
      return {
        text: `🩸 **හදිසි ලේ බැංකු රේඩාර් සහ පරිත්‍යාගශීලීන් (Emergency Blood Hub)**

රෝගියෙකුට හදිසියේ ලේ (Blood) හෝ පට්ටිකා (Platelets) අවශ්‍ය වූ විට අපගේ රේඩාර් පද්ධතිය ක්‍රියාත්මක වන්නේ මෙසේය:

1. **ඉල්ලීමක් පළකිරීම**: පහත **"හදිසි ලේ ඉල්ලුම් පෝරමය"** බොත්තම ඔබා රෝගියාගේ නම, රෝහල, සහ අවශ්‍ය ලේ වර්ගය (A+, A-, B+, B-, O+, O-, AB+) ඇතුළත් කරන්න.
2. **ක්ෂණික රේඩාර් දැනුම්දීම**: ඉල්ලුම පළකළ සැනින් ඔබගේ දිස්ත්‍රික්කයේ සිටින එම ලේ වර්ගය සහිත සියලුම සත්‍යාපිත පරිත්‍යාගශීලීන්ගේ දුරකථන වලට හදිසි Push Notification එකක් නිකුත් වේ.
3. **සෘජු සම්බන්ධීකරණය**: පරිත්‍යාගශීලීන් ඔබට In-App Chat හෝ සෘජු WhatsApp හරහා සම්බන්ධ වී රෝහල වෙත පැමිණෙනු ඇත.`,
        actions: [
          { type: 'open_blood', label: '🩸 හදිසි ලේ ඉල්ලුම් පෝරමය' },
          { type: 'open_directory', label: '📞 ජාතික රුධිර පාරවිලයන සේවය (011-2698891)' },
        ],
        quickChips: ['ලේ දිය හැක්කේ කාටද?', 'රේඩාර් ක්‍රියාකරන්නේ කොහොමද?', 'සුවසැරිය ගිලන් රථ (1990)'],
      };
    }
  }

  // -------------------------------------------------------------
  // 3. QUICK ARTISAN SERVICES (ක්ෂණික කාර්මික සේවා)
  // -------------------------------------------------------------
  const isQuickServiceQuery =
    lower.includes('කාර්මික') ||
    lower.includes('විදුලි') ||
    lower.includes('නල') ||
    lower.includes('ප්ලම්බර්') ||
    lower.includes('වයරිං') ||
    lower.includes('electrician') ||
    lower.includes('plumber') ||
    lower.includes('mechanic') ||
    lower.includes('quick service') ||
    lower.includes('ක්ෂණික සේවා') ||
    lower.includes('ඉක්මන් සේවා');

  if (isQuickServiceQuery) {
    return {
      text: `⚡ **24/7 ක්ෂණික කාර්මික සේවා (24/7 Quick Artisan Services)**

නිවසේ හෝ ආයතනයේ හදිසි කාර්මික දෝෂ (විදුලි කාර්මික, නල කාර්මික, වාහන කාර්මික, පෙදරේරු) විසඳාගැනීමට:

1. පහත **"ක්ෂණික සේවා පෝරමය"** ඔබා සිදුවී ඇති දෝෂය සහ ඔබ සිටින ස්ථානය තෝරන්න.
2. ඔබගේ ස්ථානයේ සිට **කි.මී. 15 සීමාවේ** සිටින සත්‍යාපිත කාර්මික ශිල්පීන්ට වහාම දැනුම්දීම ලැබී ඔවුන්ගේ මිල ගණන් සහ පැමිණෙන වේලාවන් ඔබට ලැබෙනු ඇත.
3. කාර්මිකයා පැමිණි පසු **අංක 4ක Start PIN** එක ලබා දී වැඩ ආරම්භ කර, අවසානයේ නිල ඩිජිටල් ඉන්වොයිසිය මඟින් ගෙවීම් සම්පූර්ණ කළ හැක.`,
      actions: [
        { type: 'open_quick', label: '⚡ ක්ෂණික සේවා ඉල්ලුම් කරන්න' },
        { type: 'open_pro_services', label: '👷 ලියාපදිංචි වෘත්තිකයන් බලන්න' },
      ],
      quickChips: ['විදුලි කාර්මිකයෙකු අවශ්‍යයි', 'නල කාර්මිකයෙකු අවශ්‍යයි', 'ගමන් ගාස්තු ගණනය කිරීම'],
    };
  }

  // -------------------------------------------------------------
  // 4. RED ALERT & DISASTER RADAR (රතු නිවේදන සහ ආපදා)
  // -------------------------------------------------------------
  const isRedAlertQuery =
    lower.includes('රතු නිවේදන') ||
    lower.includes('රතු නිවේදනය') ||
    lower.includes('red alert') ||
    lower.includes('ආපදා') ||
    lower.includes('ගංවතුර') ||
    lower.includes('නාය') ||
    lower.includes('disaster') ||
    lower.includes('අනතුරු') ||
    lower.includes('සයිරන්');

  if (isRedAlertQuery) {
    return {
      text: `🚨 **කි.මී. 5 රතු නිවේදන පද්ධතිය (Red Alert Hazard Radar)**

ගංවතුර, නායයෑම්, ගින්නක් හෝ හදිසි මාර්ග අවහිරයක් දුටු විට:
• **තත්පර 10කින් අනතුරු ඇඟවීම**: ඔබ අනතුර පළකළ සැනින් අවට **කි.මී. 5 සීමාවේ** සිටින සියලුම පරිශීලකයින්ගේ දුරකථන වලට හඬ නඟන සයිරන් අනතුරු ඇඟවීමක් නිකුත් වේ.
• **සජීවී සිතියම**: අනතුර පිහිටි නිශ්චිත GPS ස්ථානය සහ විකල්ප ආරක්ෂිත මාර්ග සිතියමෙහි රතු පැහැයෙන් දිස්වේ.`,
      actions: [
        { type: 'open_red_alert_create', label: '🚨 හදිසි රතු නිවේදනයක් නිකුත් කරන්න' },
        { type: 'open_directory', label: '📞 ආපදා කළමනාකරණ මධ්‍යස්ථානය (117)' },
      ],
      quickChips: ['ළඟම රතු නිවේදන පරීක්ෂා කරන්න', 'ආරක්ෂිත උපදෙස්', 'හදිසි ඇමතුම්'],
    };
  }

  // -------------------------------------------------------------
  // 5. TRANSPARENT AID LEDGER (ආධාර ලෙජරය)
  // -------------------------------------------------------------
  const isAidLedgerQuery =
    lower.includes('ආධාර') ||
    lower.includes('ලෙජරය') ||
    lower.includes('aid ledger') ||
    lower.includes('කඳවුරු') ||
    lower.includes('සහන');

  if (isAidLedgerQuery) {
    return {
      text: `📦 **විනිවිදභාවයේ ආධාර ලෙජරය (Transparent Aid Ledger)**

ආපදා සහන බෙදාහැරීමේදී එකම කඳවුරකට හෝ පවුලකට ආධාර ගොඩගැසීම වැළැක්වීමට සහ විනිවිදභාවය තහවුරු කිරීමට:
1. **කඳවුරු/ස්ථාන ලියාපදිංචිය**: පාසලක් හෝ පන්සලක් ලියාපදිංචි කර අංක 6ක රහස් ආරක්ෂක PIN එකක් ලබාදේ.
2. **ආධාර ලැබීම සටහන් කිරීම**: පරිත්‍යාගශීලීන් ගෙනා ආහාර, ජලය, බෙහෙත් ප්‍රමාණය සටහන් කර භාරකරුගේ PIN එකෙන් තහවුරු කරයි.
3. **ප්‍රසිද්ධ ලෙජරය**: සියලුම තොරතුරු කාටත් පෙනෙන පරිදි ප්‍රසිද්ධ ලෙජරයේ සටහන් වන බැවින් ආධාර වංචා සම්පූර්ණයෙන්ම වැළකේ.`,
      actions: [
        { type: 'open_help_post', label: '📦 ආධාර ලෙජරය විවෘත කරන්න' },
      ],
      quickChips: ['කඳවුරක් ලියාපදිංචි කරන්නේ කෙසේද?', 'ආධාර ලැබීම තහවුරු කරන්නේ කෙසේද?'],
    };
  }

  // -------------------------------------------------------------
  // 6. MARKETPLACE & LOWEST PRICES (වෙළඳපල අඩුම මිල ගණන්)
  // -------------------------------------------------------------
  const isMarketplaceQuery =
    lower.includes('වෙළඳපල') ||
    lower.includes('අඩුම මිල') ||
    lower.includes('මිල') ||
    lower.includes('market') ||
    lower.includes('බඩු මිල') ||
    lower.includes('සාප්පු') ||
    lower.includes('lowest price') ||
    lower.includes('price');

  if (isMarketplaceQuery) {
    return {
      text: `🛒 **වෙළඳපල අඩුම මිල දර්ශකය (Lowest Market Prices & Price Gap)**

දෛනික අත්‍යවශ්‍ය භාණ්ඩ (සහල්, සීනි, එළවළු, ගෑස්) සඳහා නගරයේ අඩුම මිල ඇති වෙළඳසැල් සොයාගැනීමට:
• දවසේ සාමාන්‍ය වෙළඳපල මිලට වඩා රුපියල් 50-200 දක්වා අඩුවෙන් විකුණන ප්‍රදේශයේ සාප්පු සහ ඒවායේ ලිපිනයන් මෙහි සටහන් වේ.
• ඔබට ඉතිරි කරගත හැකි ලාභ පරතරය (Savings Gap) සජීවීව පෙන්වයි.`,
      actions: [
        { type: 'open_market', label: '🛒 අඩුම මිල ගණන් පරීක්ෂා කරන්න' },
      ],
      quickChips: ['සහල් අඩුම මිල කොහෙද?', 'එළවළු මිල ගණන්', 'සාප්පුවක් ලියාපදිංචි කිරීම'],
    };
  }

  // -------------------------------------------------------------
  // 7. LOST AND FOUND (සොයාදෙන්න)
  // -------------------------------------------------------------
  const isLostFoundQuery =
    lower.includes('සොයාදෙන්න') ||
    lower.includes('නැතිවූ') ||
    lower.includes('නැතිවුණ') ||
    lower.includes('lost') ||
    lower.includes('found');

  if (isLostFoundQuery) {
    return {
      text: `🔍 **සොයාදෙන්න (Find For Me / Lost & Found)**

ඔබගේ ජාතික හැඳුනුම්පත (NIC), රියදුරු බලපත්‍රය, මුදල් පසුම්බිය හෝ සුරතල් සතෙකු නැතිවූ විට:
1. නැතිවූ ද්‍රව්‍යයේ ඡායාරූපයක් සහ නැතිවූ ප්‍රදේශය සඳහන් කර දැන්වීමක් පළකරන්න.
2. අවශ්‍ය නම් සොයාදෙන්නා සඳහා ත්‍යාග මුදලක් (Reward) ද නියම කළ හැක.
3. ප්‍රජාවේ අයෙකුට එය හමුවූ විට In-App Chat හරහා ඔබට දැනුම් දෙනු ඇත.`,
      actions: [
        { type: 'open_find', label: '🔍 සොයාදෙන්න දැන්වීමක් පළකරන්න' },
      ],
      quickChips: ['හැඳුනුම්පත නැතිවුණා', 'බලපත්‍රය නැතිවුණා', 'සුරතල් සතෙකු නැතිවුණා'],
    };
  }

  // -------------------------------------------------------------
  // 8. FREE DONATIONS (මා වෙතින් ඔබට නොමිලේ දීමනා)
  // -------------------------------------------------------------
  const isDonationQuery =
    lower.includes('නොමිලේ') ||
    lower.includes('දීමනා') ||
    lower.includes('පරිත්‍යාග') ||
    lower.includes('donation') ||
    lower.includes('free') ||
    lower.includes('from me to you');

  if (isDonationQuery) {
    return {
      text: `🎁 **මා වෙතින් ඔබට (From Me To You Free Donations)**

ඔබ සතුව ඇති පාවිච්චි කළ හැකි අමතර පොත්පත්, පාසල් උපකරණ, රෝද පුටු හෝ ඇඳුම් පැළඳුම් අවශ්‍යතා ඇති අයෙකුට 100% නොමිලේ පරිත්‍යාග කිරීමට:
• කිසිදු මුදල් අය කිරීමක් නොමැතිව පරිත්‍යාගයක් ලෙස පළකරන්න.
• අවශ්‍ය අයදුම්කරුට එය රැගෙන යාමට අවස්ථාව සලසා දෙන්න.`,
      actions: [
        { type: 'open_from_you', label: '🎁 නොමිලේ දීමනාවක් පළකරන්න' },
      ],
      quickChips: ['පාසල් පොත් පරිත්‍යාගය', 'රෝද පුටු / වෛද්‍ය උපකරණ'],
    };
  }

  // -------------------------------------------------------------
  // 9. DATA PRIVACY & INFORMATION SECURITY (දත්ත ආරක්ෂාව)
  // -------------------------------------------------------------
  const isSafetyQuery =
    lower.includes('ආරක්ෂිත') ||
    lower.includes('ආරක්ෂා') ||
    lower.includes('safe') ||
    lower.includes('security') ||
    lower.includes('privacy') ||
    lower.includes('රහස්‍ය') ||
    lower.includes('දත්ත') ||
    lower.includes('data');

  if (isSafetyQuery) {
    return {
      text: `🔒 **සහය සේවා පද්ධතිය තුළ ඔබගේ තොරතුරු 100% ආරක්ෂිතයි!**

1. 🔒 **තොරතුරු රහස්‍යභාවය**: ඔබගේ ජාතික හැඳුනුම්පත් (NIC) ඡායාරූපය සාමාන්‍ය පරිශීලකයන්ට කිසිසේත්ම නොපෙනේ. ඒවා භාවිතා කරන්නේ ගිණුම සත්‍යාපනය සඳහා ඇඩ්මින්වරුන් පමණි.
2. 🛡️ **Cloud Encryption**: සියලුම දත්ත Cloud Firestore තුළ SSL/TLS Encryption මඟින් සුරක්ෂිතව තබා ඇත.
3. 🚫 **තෙවන පාර්ශ්වයන්ට ලබා නොදේ**: ඔබගේ දුරකථන අංක කිසිදු වෙළඳ දැන්වීම්කරුවෙකුට විකුණන්නේ හෝ ලබා දෙන්නේ නැත.`,
      actions: [
        { type: 'open_help_post', label: '📝 උපකාර ඉල්ලුම් පෝරමය' },
        { type: 'open_quick', label: '⚡ ක්ෂණික සේවා' },
      ],
      quickChips: ['හැඳුනුම්පත් ඡායාරූප අවශ්‍ය ඇයි?', 'ගිණුම් සත්‍යාපනය කරන්නේ කෙසේද?'],
    };
  }

  // -------------------------------------------------------------
  // 10. FORM FILLING GUIDANCE (පෝරම පුරවන ආකාරය)
  // -------------------------------------------------------------
  const isFormFillingQuery =
    lower.includes('පෝරම') ||
    lower.includes('පුරවන්නේ') ||
    lower.includes('form') ||
    lower.includes('ලේඛන');

  if (isFormFillingQuery) {
    return {
      text: `📝 **පෝරම නිවැරදිව පිරවීමට පියවරෙන් පියවර මඟපෙන්වීම**:

1. **උපකාර ඉල්ලුම් පෝරමය (Community Help Form)**:
   - මාතෘකාව: ගැටලුව කෙටියෙන් ලියන්න.
   - කාණ්ඩය: විදුලි, නල, වෛද්‍ය, ප්‍රවාහන ආදී සුදුසු කාණ්ඩය තෝරන්න.
   - ගෙවීම්: ස්වේච්ඡා (නොමිලේ) ද ගෙවීම් සහිත ද යන්න සඳහන් කරන්න.
   - ස්ථානය: ඔබගේ දිස්ත්‍රික්කය සහ පොලිස් වසම තෝරන්න.
2. **ක්ෂණික සේවා පෝරමය (Quick Services)**:
   - සිදුවී ඇති දෝෂය සහ අවශ්‍ය කාර්මිකයා තෝරන්න.
3. **හදිසි ලේ ඉල්ලුම් පෝරමය**:
   - රෝගියාගේ නම, රෝහල සහ ලේ වර්ගය තෝරන්න.`,
      actions: [
        { type: 'open_help_post', label: '📝 උපකාර ඉල්ලුම් පෝරමය' },
        { type: 'open_blood', label: '🩸 ලේ ඉල්ලුම් පෝරමය' },
      ],
      quickChips: ['ඡායාරූප Upload කරන්නේ කෙසේද?', 'Start PIN එක යනු කුමක්ද?'],
    };
  }

  // -------------------------------------------------------------
  // Default Comprehensive App Guidance
  // -------------------------------------------------------------
  if (lang === 'en') {
    return {
      text: `👋 Hello! I am **Sahaya Mithura (සහය මිතුරා)** — your official guide for the Sahaya Sewa platform.

I am here to guide you on any service or feature:
• 🩸 **Emergency Blood Radar**: Instant matching for urgent blood donors.
• ⚡ **24/7 Quick Services**: Connect with nearby verified electricians, plumbers, and mechanics.
• 🚨 **5km Red Alert Sirens**: Instant disaster alerts and live GPS maps.
• 🛒 **Lowest Market Prices**: Compare grocery prices across local shops.
• 📝 **Form Guides**: How to post requests, register relief centers, and verify help.

What would you like assistance with today?`,
      actions: [
        { type: 'open_help_post', label: '📝 Post a Help Request' },
        { type: 'open_quick', label: '⚡ Quick Services' },
        { type: 'open_blood', label: '🩸 Blood Radar' },
        { type: 'open_market', label: '🛒 Lowest Prices' },
      ],
      quickChips: [
        'What does this app do?',
        'How to fill forms?',
        'How does Blood Radar work?',
        'Check Lowest Market Prices',
      ],
    };
  } else {
    return {
      text: `👋 ආයුබෝවන්! මම ඔබගේ **සහය මිතුරා (Sahaya Mithura)** — පද්ධතියේ නිල මඟපෙන්වන්නා සහ උපදේශකයා.

පද්ධතියේ සේවාවන් පිළිබඳව ඔබ කැමති ඕනෑම දෙයක් මාගෙන් විමසිය හැක:
• 🌟 **"මේ ඇප් එකෙන් වෙන්නේ කුමක්ද?"** — ඇප් එකේ ප්‍රධාන සේවාවන් 8 පිළිබඳ සම්පූර්ණ විස්තරය.
• 🩸 **"ලේ ඕනෙ වුණොත් මොකද කරන්නේ?"** — දිස්ත්‍රික්කයේ ලේ පරිත්‍යාගශීලීන් සම්බන්ධ කරගැනීම.
• ⚡ **"කාර්මිකයෙක් හොයාගන්නේ කොහොමද?"** — කි.මී. 15 සීමාවේ විදුලි, නල, වාහන කාර්මික සේවා.
• 🚨 **"රතු නිවේදන කියන්නේ මොනවාද?"** — හදිසි අනතුරු සහ ගංවතුර පිළිබඳ කි.මී. 5 සයිරන් අනතුරු ඇඟවීම්.
• 📍 **"කොළඹට / නුවරට දුර කොච්චරද?"** — ඔබ සිටින තැන සිට සැබෑ මාර්ග දුර සහ Google Maps මාර්ගය.

ඔබට අවශ්‍ය සහය කුමක්ද?`,
      actions: [
        { type: 'open_help_post', label: '📝 උපකාර ඉල්ලුම් පෝරමය' },
        { type: 'open_quick', label: '⚡ ක්ෂණික කාර්මික සේවා' },
        { type: 'open_blood', label: '🩸 හදිසි ලේ & ආපදා' },
        { type: 'open_market', label: '🛒 වෙළඳපල අඩුම මිල ගණන්' },
      ],
      quickChips: [
        'මේ ඇප් එකෙන් වෙන්නේ කුමක්ද?',
        'ලේ ඉල්ලුම් කරන්නේ කොහොමද?',
        'කාර්මික සේවා ලබාගන්නේ කොහොමද?',
        'තොරතුරු ආරක්ෂිතද?',
      ],
    };
  }
}
