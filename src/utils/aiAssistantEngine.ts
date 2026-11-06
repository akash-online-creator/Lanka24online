import { Language, LocationOption, VerifiedAiKnowledgeItem } from '../types';
import { subscribeToVerifiedAiKnowledge, savePendingAiQuery } from '../lib/firebase';
import { searchSriLankanPlacesAndRoads, calculateRoadDistanceKm } from './geoUtils';
import { getClientCachedAiResponse, setClientCachedAiResponse } from './semanticCache';
import { resolveLocalKnowledge as resolveRoutineLocalKnowledge } from './localKnowledgeResolver';

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

const STOP_WORDS_MATCH = new Set([
  'කොහොමද', 'කරන්නේ', 'කරන්නෙ', 'මොකක්ද', 'මොනවද', 'මොනවාද', 'මගේ', 'අපේ', 'එක', 'එකක්',
  'ඇයි', 'නැහැ', 'නෑ', 'ඕනේ', 'ඕනෙ', 'පුළුවන්ද', 'පුලුවන්ද', 'කියන්න', 'දැනගන්න', 'සහය',
  'උදව්', 'වෙන්නේ', 'වෙන්නෙ', 'තියෙන්නේ', 'ගැන', 'මට', 'අපට', 'ඔබට', 'what', 'how', 'why',
  'can', 'the', 'for', 'with', 'this', 'app', 'is', 'to', 'in', 'help', 'please',
]);

export function matchVerifiedKnowledge(
  cleanQuery: string,
  lowerQuery: string,
  lang: Language = 'si'
): { text: string; actions?: AssistantAction[]; quickChips?: string[] } | null {
  if (!cachedVerifiedKnowledge || cachedVerifiedKnowledge.length === 0) return null;

  const queryWords = lowerQuery
    .replace(/[?.,!:-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS_MATCH.has(w));

  for (const item of cachedVerifiedKnowledge) {
    const itemQuestionLower = (item.question || '').toLowerCase().trim();
    if (!itemQuestionLower) continue;

    // 1. Strict or high-similarity question match
    const minLen = Math.min(lowerQuery.length, itemQuestionLower.length);
    const maxLen = Math.max(lowerQuery.length, itemQuestionLower.length);
    if (
      lowerQuery === itemQuestionLower ||
      (minLen >= 10 &&
        minLen / maxLen >= 0.75 &&
        (lowerQuery.includes(itemQuestionLower) || itemQuestionLower.includes(lowerQuery)))
    ) {
      const actionsObj = resolveActionsFromText(cleanQuery + ' ' + item.answer, lang);
      return {
        text: item.answer,
        actions: actionsObj.actions,
        quickChips: item.keywords && item.keywords.length > 0 ? item.keywords.slice(0, 4) : actionsObj.chips,
      };
    }

    // 2. Meaningful token overlap match (requires >= 2 meaningful words and >= 75% overlap)
    const itemTokens = itemQuestionLower
      .replace(/[?.,!:-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS_MATCH.has(w));

    if (queryWords.length >= 2 && itemTokens.length >= 2) {
      let matchCount = 0;
      for (const w of queryWords) {
        if (
          itemTokens.includes(w) ||
          (item.keywords &&
            item.keywords.some((k) => {
              const ck = k.toLowerCase().trim();
              return ck.length > 2 && !STOP_WORDS_MATCH.has(ck) && ck === w;
            }))
        ) {
          matchCount++;
        }
      }
      const requiredMatches = Math.max(2, Math.ceil(Math.max(queryWords.length, itemTokens.length) * 0.75));
      if (matchCount >= requiredMatches) {
        const actionsObj = resolveActionsFromText(cleanQuery + ' ' + item.answer, lang);
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

  // 1. Check Smart Location & Real-World Road Distance Resolver (100% Free & Instant)
  if (mode === 'full') {
    try {
      const locationAnswer = await resolveLocationAndDistanceQuery(clean, lower, currentLocation, userLang);
      if (locationAnswer) {
        return locationAnswer;
      }
    } catch (err) {
      console.warn('Location query resolution error:', err);
    }
  }

  // 2. Check Admin-Verified Knowledge Base (High-confidence approved answers)
  try {
    const verifiedAnswer = matchVerifiedKnowledge(clean, lower, userLang);
    if (verifiedAnswer) {
      return verifiedAnswer;
    }
  } catch (err) {
    console.warn('Verified knowledge match error:', err);
  }

  // 2.5 Semantic Caching (Only for standalone / initial queries, never override multi-turn follow-up context)
  if (history.length <= 1) {
    const cachedAi = getClientCachedAiResponse(`v3:${mode}:${clean}`);
    if (cachedAi) {
      const extractedActions = resolveActionsFromText(clean + ' ' + cachedAi.response, userLang, mode);
      return {
        text: cachedAi.response,
        actions: extractedActions.actions,
        quickChips: extractedActions.chips,
      };
    }
  }

  // 3. Query Server-side Gemini AI Model Cascade (Primary Intelligent Brain for all Sinhala/Singlish/Tamil/English queries)
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
        if (history.length <= 1) {
          setClientCachedAiResponse(`v3:${mode}:${clean}`, data.reply);
        }

        // Automatically submit novel question & Gemini answer to Admin Panel for review
        savePendingAiQuery({
          question: clean,
          answer: data.reply,
          detectedLang: userLang,
          locationContext: (currentLocation as any)?.nameSi || (currentLocation as any)?.districtSi || '',
        }).catch((e) => console.warn('Auto-log pending AI query notice:', e));

        // Extract relevant action buttons based on both question and AI reply
        const extractedActions = resolveActionsFromText(clean + ' ' + data.reply, userLang, mode);
        return {
          text: data.reply,
          actions: extractedActions.actions,
          quickChips: extractedActions.chips,
        };
      }
    }
  } catch {
    // Network or server offline, gracefully use local knowledge engine below
  }

  // 4. Offline / Fallback Knowledge Engines
  if (mode === 'auth') {
    return resolveAuthKnowledge(clean, lower, userLang);
  }

  const routine = resolveRoutineLocalKnowledge(clean);
  if (routine && routine.matched) {
    const actions: AssistantAction[] = [];
    if (routine.actionType === 'open_gps_modal') {
      actions.push({ type: 'open_directory', label: routine.actionLabelSi || '📍 හදිසි ඇමතුම් & ස්ථාන සහාය' });
    } else if (routine.actionType === 'open_password_reset') {
      actions.push({ type: 'open_issues_help', label: routine.actionLabelSi || '🔑 මුරපද සහාය' });
    } else if (routine.actionType === 'open_issues') {
      actions.push({ type: 'open_issues_help', label: routine.actionLabelSi || '❓ ගැටලු & උපකාර' });
    }
    return {
      text: `${routine.titleSi}\n\n${routine.summarySi}\n\n` +
        routine.detailedSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n'),
      actions,
      quickChips: ['GPS ගැටලුව', 'මුරපදය අමතකයි', 'ගිණුම අනුමත කිරීම', 'පරිපාලක අමතන්න'],
    };
  }

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

1. 🔒 **NIC Privacy**: Your National Identity Card (NIC) front photo and private details are **never published publicly**. They are exclusively accessible to verified system administrators solely for identity authentication and anti-fraud verification.
2. 🛡️ **Cloud Encryption (SSL/TLS)**: All data transmissions and stored records are secured using enterprise 256-bit SSL encryption and protected by Firestore Security Rules.
3. 🚫 **No Third-Party Sharing**: We never sell, share, or disclose your phone numbers, addresses, or photos to any advertisers or third-party entities.
4. 🤝 **Trusted Community**: Identity verification ensures real, authentic community members for mutual aid and safety.`,
        actions: [
          { type: 'switch_to_register', label: '📝 Create Secure Account' },
          { type: 'switch_to_login', label: '🔑 Sign In' },
        ],
        quickChips: ['How to register?', 'What photo is needed?'],
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

1. 🔒 **හැඳුනුම්පත් (NIC) සහ තොරතුරු රහස්‍යභාවය**: ඔබ ලබාදෙන ජාතික හැඳුනුම්පතේ ඉදිරිපස (NIC Front) ඡායාරූපය හෝ පුද්ගලික රහස්‍ය තොරතුරු **කිසිදු සාමාන්‍ය පරිශීලකයෙකුට හෝ ප්‍රසිද්ධියට පත් නොවේ**. ඒවා පරිශීලනය කරන්නේ ගිණුම සත්‍යාපනය (Verification) සඳහා බලයලත් Admin වරුන් විසින් පමණි.
2. 🛡️ **Cloud Encryption & Security Rules**: සියලුම දත්ත Cloud Firestore සහ ආරක්ෂිත සේවාදායකයන් තුළ SSL/TLS 256-bit Encryption මඟින් සංකේතනය කර ඇත. අනවසර ප්‍රවේශයන් සම්පූර්ණයෙන්ම වළක්වා ඇත.
3. 🚫 **තෙවන පාර්ශ්වයන්ට ලබා නොදීම (No Third-Party Sharing)**: ඔබගේ දුරකථන අංක, ලිපිනයන් හෝ දත්ත කිසිදු වෙළඳ දැන්වීම්කරුවෙකුට හෝ තෙවන පාර්ශ්වයකට කිසිසේත්ම විකුණන්නේ හෝ ලබා දෙන්නේ නැත.
4. 🤝 **ව්‍යාජ ගිණුම්වලින් තොර සත්‍යාපිත සමාජයක්**: ප්‍රජා උපකාර, ආධාර බෙදාහැරීම් සහ ලේ පරිත්‍යාග විශ්වාසනීයව සිදු කිරීමට පමණක් මෙම සත්‍යාපනය ක්‍රියාත්මක වේ.`,
        actions: [
          { type: 'switch_to_register', label: '📝 සුරක්ෂිතව ලියාපදිංචි වන්න' },
          { type: 'switch_to_login', label: '🔑 Login වන්න' },
        ],
        quickChips: ['ලියාපදිංචි වන්නේ කෙසේද?', 'අවශ්‍ය ඡායාරූපය කුමක්ද?', 'Login ගැටලුවක්'],
      };
    }
  }

  // 3. How to register / Registration help (Strictly matches RegisterForm.tsx: ONLY 1 photo = NIC Front Photo via Camera)
  if (lower.includes('ලියාපදිංචි') || lower.includes('register') || lower.includes('ගිණුමක්') || lower.includes('signup') || lower.includes('sign up') || lower.includes('பதிவு')) {
    if (lang === 'en') {
      return {
        text: `📝 **How to Fill the New Account Registration Form (Exact Fields)**:

1. **🆔 NIC Front Photo (1 Photo ONLY)**: Capture a clear photo of the **front side of your National Identity Card** directly using the camera button. *(Face/Selfie photo or NIC back photo are NOT required).*
2. **👤 Full Name \***: Enter your full name.
3. **🔢 NIC Number \***: Enter your National Identity Card number (e.g., \`970181547V\` or \`199701815470\`).
4. **📞 Phone / WhatsApp Number \***: Enter your 10-digit mobile number (e.g., \`0771234567\`).
5. **📍 District & Police Division**: Select your District and Police Division from the dropdowns.
6. **🏙️ City / Town** & **🏠 Address \***: Enter your city and permanent address.
7. **🔑 Password (PIN) \*** & **Confirm Password \***: Enter a password (at least 6 characters) and click **Register**.`,
        actions: [
          { type: 'switch_to_register', label: '📝 Open Registration Form' },
          { type: 'open_issues_help', label: '❓ Help & Support' },
        ],
        quickChips: ['How to take NIC front photo?', 'Is my data safe?', 'Password requirements'],
      };
    } else if (lang === 'ta') {
      return {
        text: `📝 **புதிய கணக்கு பதிவு படிவத்தை நிரப்புவது எப்படி**:

1. **🆔 அடையாள அட்டையின் முன்பக்க புகைப்படம் மட்டுமே (1 Photo Only)**: கேமரா மூலம் தேசிய அடையாள அட்டையின் முன்பக்கத்தை மட்டும் புகைப்படம் எடுக்கவும். *(முகப் புகைப்படம் அல்லது பின்பக்க புகைப்படம் தேவையில்லை).*
2. **👤 முழுப் பெயர் \*** மற்றும் **🔢 அடையாள அட்டை எண் (NIC) \***.
3. **📞 தொலைபேசி / வாட்ஸ்அப் எண் \***.
4. **📍 மாவட்டம், பொலிஸ் பிரிவு, நகரம்** மற்றும் **🏠 முகவரி \***.
5. **🔑 கடவுச்சொல் (குறைந்தது 6 எழுத்துக்கள்) \*** உள்ளிட்டு பதிவு செய்யவும்.`,
        actions: [
          { type: 'switch_to_register', label: '📝 பதிவு படிவத்தைத் திறக்கவும்' },
          { type: 'open_issues_help', label: '❓ உதவி கோரிக்கை' },
        ],
        quickChips: ['NIC புகைப்படம் எப்படி எடுப்பது?', 'தகவல் பாதுகாப்பானதா?'],
      };
    } else {
      return {
        text: `📝 **නව ගිණුමක් ලියාපදිංචි කිරීමේ පෝරමය පුරවන ආකාරය (පෝරමයේ ඇති නිවැරදි ක්ෂේත්‍ර පමණි)**:

1. **🆔 හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය (1ක් පමණි) \***: කැමරා බොත්තම ඔබා ඔබගේ ජාතික හැඳුනුම්පතේ **ඉදිරිපස (NIC Front)** පැහැදිලි ඡායාරූපයක් පමණක් ලබාගන්න. *(මුහුණේ ඡායාරූපයක්/Selfie හෝ හැඳුනුම්පතේ පිටුපස ඡායාරූපයක් මෙම පෝරමයේ නැත).*
2. **👤 සම්පූර්ණ නම \***: ඔබගේ සම්පූර්ණ නම ඇතුළත් කරන්න.
3. **🔢 ජාතික හැඳුනුම්පත් අංකය (NIC) \***: ඔබගේ NIC අංකය ඇතුළත් කරන්න (උදා: \`970181547V\` හෝ \`199701815470\`).
4. **📞 දුරකථන / WhatsApp අංකය \***: ඔබගේ දුරකථන අංකය ඇතුළත් කරන්න (\`0771234567\`).
5. **📍 දිස්ත්‍රික්කය** සහ **පොලිස් බලප්‍රදේශය**: ලැයිස්තුවෙන් තෝරන්න.
6. **🏙️ නගරය (City / Town)** සහ **🏠 ලිපිනය \***: ඔබගේ නගරය සහ ස්ථිර ලිපිනය ඇතුළත් කරන්න.
7. **🔑 රහස් පදය (PIN) \*** සහ **රහස් පදය තහවුරු කරන්න \***: අවම අකුරු/ඉලක්කම් 6ක මුරපදයක් ලබා දී **"ලියාපදිංචි වන්න"** බොත්තම ඔබන්න.`,
        actions: [
          { type: 'switch_to_register', label: '📝 ලියාපදිංචි පෝරමයට යන්න' },
          { type: 'open_issues_help', label: '❓ ගැටලු සහ උපකාර' },
        ],
        quickChips: ['NIC ඉදිරිපස ඡායාරූප ගන්නේ කොහොමද?', 'තොරතුරු ආරක්ෂිතද?', 'Login වන්නේ කොහොමද?'],
      };
    }
  }

  // 4. Taking NIC Front Photo
  if (lower.includes('nic') || lower.includes('හැඳුනුම්පත') || lower.includes('photo') || lower.includes('ඡායාරූප') || lower.includes('කාඩ්පත') || lower.includes('புகைப்படம்')) {
    if (lang === 'en') {
      return {
        text: `🆔 **Guidance for NIC Front Photo in Registration**:

• 🆔 **NIC Front Photo ONLY**: Place your National Identity Card on a flat surface in good lighting and capture the **front side only** clearly using the camera. Ensure the NIC number and name are readable.
• *Note: Face/Selfie photo and NIC back side photo are NOT required in the registration form.*`,
        actions: [
          { type: 'switch_to_register', label: '📝 Go to Registration' },
        ],
        quickChips: ['Is my data safe?', 'How to register?'],
      };
    } else if (lang === 'ta') {
      return {
        text: `🆔 **அடையாள அட்டை (NIC Front) புகைப்பட வழிகாட்டல்**:

• 🆔 **அடையாள அட்டையின் முன்பக்கம் மட்டுமே**: முன்பக்கத்தை மட்டும் நிழல் விழாமல் தெளிவாக கேமரா மூலம் புகைப்படம் எடுக்கவும். (முகப் புகைப்படம் அல்லது பின்பக்கம் தேவையில்லை).`,
        actions: [
          { type: 'switch_to_register', label: '📝 பதிவுக்குச் செல்லவும்' },
        ],
        quickChips: ['எனது தகவல் பாதுகாப்பானதா?'],
      };
    } else {
      return {
        text: `🆔 **ලියාපදිංචි පෝරමයේ හැඳුනුම්පත් (NIC Front) ඡායාරූපය ගැනීමේ උපදෙස්**:

• 🆔 **ජාතික හැඳුනුම්පතේ ඉදිරිපස පමණි (NIC Front Photo Only)**: ලියාපදිංචි පෝරමයේ ඇති කැමරා බොත්තම ඔබා, හැඳුනුම්පතේ ඉදිරිපස අකුරු සහ අංක ආලෝකය පරාවර්තනය නොවී පැහැදිලිව පෙනෙන සේ ඡායාරූපය ලබාගන්න.
• *සැ.යු: මුහුණේ (Selfie) ඡායාරූපයක් හෝ හැඳුනුම්පතේ පිටුපස (Back) ඡායාරූපයක් පෝරමයට අවශ්‍ය නොවේ.*`,
        actions: [
          { type: 'switch_to_register', label: '📝 ලියාපදිංචි වීමට යන්න' },
        ],
        quickChips: ['තොරතුරු ආරක්ෂිතද?', 'ලියාපදිංචි පෝරමය පුරවන හැටි'],
      };
    }
  }

  // 5. Login Issues / Password Forgotten / Account approval
  if (lower.includes('login') || lower.includes('බැහැ') || lower.includes('මුරපද') || lower.includes('password') || lower.includes('අමතක') || lower.includes('අනුමත') || lower.includes('approve') || lower.includes('உள்நுழைய')) {
    if (lang === 'en') {
      return {
        text: '🔑 **Login & Password Support**:\n• **Login Identifier**: Enter your **NIC Number** (or registered Phone Number) along with your password.\n• **Pending Approval**: New registrations undergo brief safety verification before activation.\n• **Forgot Password or Locked**: Click **Issues & Help** at the bottom of the login card to request a password reset from administrators.',
        actions: [
          { type: 'switch_to_login', label: '🔑 Login Page' },
          { type: 'open_issues_help', label: '❓ Report Login Issue' },
          { type: 'demo_login', label: '👤 Try User Demo' },
        ],
        quickChips: ['Report a Login Issue', 'Try User Demo', 'How to Register?'],
      };
    } else if (lang === 'ta') {
      return {
        text: '🔑 **உள்நுழைவு மற்றும் கடவுச்சொல் உதவி**:\n• உங்கள் **NIC எண்** அல்லது **தொலைபேசி எண்** மற்றும் கடவுச்சொல்லைப் பயன்படுத்தி உள்நுழையலாம்.\n• சிக்கல்கள் இருந்தால், உள்நுழைவுப் பக்கத்தில் உள்ள **உதவி மற்றும் சிக்கல்கள்** பொத்தானைக் கிளிக் செய்யவும்.',
        actions: [
          { type: 'switch_to_login', label: '🔑 உள்நுழைவு பக்கம்' },
          { type: 'open_issues_help', label: '❓ சிக்கலைத் தெரிவிக்கவும்' },
        ],
        quickChips: ['சிக்கலைத் தெரிவிக்கவும்', 'பதிவு செய்வது எப்படி?'],
      };
    } else {
      return {
        text: '🔑 **Login වීමේ ගැටලු සහ මුරපද සහය**:\n• **Login වීමට**: ඔබගේ **ජාතික හැඳුනුම්පත් අංකය (NIC)** හෝ **දුරකථන අංකය** සමඟ ඔබ ලබාදුන් මුරපදය ඇතුළත් කරන්න.\n• **ගිණුම අනුමත වීම (Pending Approval)**: ප්‍රජාවේ ආරක්ෂාව තහවුරු කිරීමට පරිපාලක විසින් විස්තර සත්‍යාපනය කරනු ලැබේ.\n• **මුරපදය අමතක නම් හෝ ගැටලුවක් ඇත්නම්**: Login පිටුවේ පහළ ඇති **ගැටලු & උපකාර (Issues & Help)** බොත්තම ඔබා පණිවිඩයක් එවන්න. පරිපාලක කණ්ඩායම ඔබට සහය වනු ඇත.',
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
      text: '👋 Hello! I am your **Login & Registration Support Assistant**.\nI am here to guide you through getting started:\n• 📝 How to Fill the Registration Form\n• 🆔 Taking a clear NIC Front Photo\n• 🔑 Resolving Login and Password Issues\n• ⏳ Checking Account Approval Status\n\nHow may I help you today?',
      actions: [
        { type: 'switch_to_login', label: '🔑 Sign In' },
        { type: 'switch_to_register', label: '📝 Register' },
        { type: 'open_issues_help', label: '❓ Help & Support' },
      ],
      quickChips: ['How to register?', 'Cannot log in', 'NIC photo help', 'Try User Demo'],
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
      text: '👋 ආයුබෝවන්! මම ඔබගේ **පිවිසුම් සහ ලියාපදිංචි සහය මිතුරා (Login & Registration Support)**.\nපද්ධතියට සාදරයෙන් පිළිගනිමු. පිවිසීමට අදාළ ඕනෑම සහයක් ලබාදීමට මම සූදානම්:\n• 📝 නව ලියාපදිංචි පෝරමය නිවැරදිව පිරවීම\n• 🆔 හැඳුනුම්පතේ ඉදිරිපස (NIC Front) ඡායාරූපය නිවැරදිව ගැනීම\n• 🔑 Login වීමේ ගැටලු සහ මුරපද සහය\n• ⏳ ගිණුම් අනුමැතිය සහ සත්‍යාපනය\n\nඔබට අවශ්‍ය උපකාරය කුමක්ද?',
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
  lang: Language,
  mode: 'auth' | 'full' = 'full'
): { actions: AssistantAction[]; chips: string[] } {
  const lower = query.toLowerCase();
  const actions: AssistantAction[] = [];
  const chips: string[] = [];

  if (mode === 'auth') {
    const isReg = lower.includes('ලියාපදිංචි') || lower.includes('register') || lower.includes('ගිණුමක්') || lower.includes('nic') || lower.includes('හැඳුනුම්පත') || lower.includes('பதிவு');
    const isLogin = lower.includes('login') || lower.includes('පිවිස') || lower.includes('මුරපද') || lower.includes('password') || lower.includes('pin') || lower.includes('உள்நுழை');
    const isIssue = lower.includes('ගැටලු') || lower.includes('අමතක') || lower.includes('අනුමත') || lower.includes('බැහැ') || lower.includes('error') || lower.includes('help');

    if (isReg) {
      actions.push({
        type: 'switch_to_register',
        label: lang === 'en' ? '📝 Go to Registration' : lang === 'ta' ? '📝 பதிவு பக்கம்' : '📝 නව ලියාපදිංචිය',
      });
    }
    if (isLogin) {
      actions.push({
        type: 'switch_to_login',
        label: lang === 'en' ? '🔑 Go to Login' : lang === 'ta' ? '🔑 உள்நுழைவு பக்கம்' : '🔑 Login පිටුව',
      });
    }
    if (isIssue) {
      actions.push({
        type: 'open_issues_help',
        label: lang === 'en' ? '❓ Issues & Password Help' : lang === 'ta' ? '❓ சிக்கல்கள் & உதவி' : '❓ ගැටලු & මුරපද සහය',
      });
    }
    actions.push({
      type: 'demo_login',
      label: lang === 'en' ? '👁️ Enter Demo Mode' : lang === 'ta' ? '👁️ டெமோ பயன்முறை' : '👁️ නරඹන්නා ලෙස පිවිසෙන්න (Demo)',
    });
    chips.push(
      lang === 'en' ? 'How to register?' : 'නව ගිණුමක් හදන්නේ කොහොමද?',
      lang === 'en' ? 'Forgot password' : 'මුරපදය අමතක වුණොත්?',
      lang === 'en' ? 'How to take NIC photos?' : 'NIC ඡායාරූප ගන්නේ කොහොමද?'
    );
    return { actions: actions.slice(0, 4), chips: chips.slice(0, 4) };
  }

  const isForm = lower.includes('පෝරම') || lower.includes('form') || lower.includes('පුරව') || lower.includes('fill') || lower.includes('படிவம்');
  const isBlood = lower.includes('ලේ') || lower.includes('රුධිර') || lower.includes('blood') || lower.includes('இரத்தம்') || lower.includes('donor') || lower.includes('පට්ටිකා');
  const isQuick = lower.includes('කාර්මික') || lower.includes('electric') || lower.includes('plumb') || lower.includes('quick') || lower.includes('repair') || lower.includes('පැච්') || lower.includes('බාස්') || lower.includes('විදුලි') || lower.includes('නල');
  const isPro = lower.includes('වෘත්තීය') || lower.includes('professional') || lower.includes('artisan') || lower.includes('ශිල්පී');
  const isFind = lower.includes('නැති') || lower.includes('lost') || lower.includes('found') || lower.includes('සොයා') || lower.includes('தொலைந்த');
  const isFromYou = lower.includes('දීමන') || lower.includes('donate') || lower.includes('give') || lower.includes('නොමිලේ') || lower.includes('தானம்') || lower.includes('පරිත්‍යාග');
  const isGroup = lower.includes('ශ්‍රමදාන') || lower.includes('group') || lower.includes('කණ්ඩායම්') || lower.includes('சிரமதானம்');
  const isMarket = lower.includes('මිල') || lower.includes('price') || lower.includes('market') || lower.includes('හාල්') || lower.includes('සීනි') || lower.includes('விலை') || lower.includes('වෙළඳපල');
  const isWallet = lower.includes('credit') || lower.includes('wallet') || lower.includes('ක්‍රෙඩිට්') || lower.includes('මුදල්') || lower.includes('ශේෂ') || lower.includes('qr pay') || lower.includes('s-points');
  const isHelpPost = lower.includes('උපකාර') || lower.includes('ඉල්ලුම්') || lower.includes('help post') || lower.includes('දැන්වීම') || lower.includes('හඬ සහය') || lower.includes('voice help');
  const isRedAlert = lower.includes('රතු නිවේදන') || lower.includes('රතු එළිය') || lower.includes('red alert') || lower.includes('ආපදා') || lower.includes('ගංවතුර') || lower.includes('නාය') || lower.includes('සයිරන්');
  const isEmergencyDir = lower.includes('හදිසි ඇමතුම්') || lower.includes('1990') || lower.includes('119') || lower.includes('117') || lower.includes('hotline') || lower.includes('රෝහල්') || lower.includes('පොලිස්');
  const isIssue = lower.includes('මුරපද') || lower.includes('password') || lower.includes('ගැටලු') || lower.includes('අනුමත');

  if (isRedAlert) {
    actions.push({
      type: 'open_red_alert_create',
      label: lang === 'en' ? '🚨 Create Red Alert' : lang === 'ta' ? '🚨 அவசர எச்சரிக்கை விடுக்க' : '🚨 රතු නිවේදනයක් නිකුත් කරන්න',
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

  if (isPro) {
    actions.push({
      type: 'open_pro_services',
      label: lang === 'en' ? '👷 Verified Professionals' : lang === 'ta' ? '👷 தொழில் வல்லுநர்கள்' : '👷 ලියාපදිංචි වෘත්තිකයන් බලන්න',
    });
  }

  if (isHelpPost || isForm) {
    actions.push({
      type: 'open_help_post',
      label: lang === 'en' ? '📝 Open Help Post Form' : lang === 'ta' ? '📝 உதவி படிவத்தைத் திறக்கவும்' : '📝 උපකාර ඉල්ලුම් පෝරමය විවෘත කරන්න',
    });
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

  if (isEmergencyDir) {
    actions.push({
      type: 'open_directory',
      label: lang === 'en' ? '📞 Emergency Hotlines' : lang === 'ta' ? '📞 அவசர தொலைபேசி எண்கள்' : '📞 හදිසි ඇමතුම් නාමාවලිය',
    });
  }

  if (isWallet) {
    actions.push({
      type: 'open_wallet',
      label: lang === 'en' ? '💳 Open User Wallet' : lang === 'ta' ? '💳 பணப்பையைத் திறக்கவும்' : '💳 මගේ Wallet එක විවෘත කරන්න',
    });
  }

  if (isIssue) {
    actions.push({
      type: 'open_issues_help',
      label: lang === 'en' ? '❓ Issues & Support' : lang === 'ta' ? '❓ சிக்கல்கள் & உதவி' : '❓ ගැටලු & උපකාර පිටුව',
    });
  }

  if (chips.length === 0) {
    chips.push(
      lang === 'en' ? 'What does this app do?' : 'මේ ඇප් එකෙන් වෙන්නේ කුමක්ද?',
      lang === 'en' ? 'How does Voice Help work?' : 'හඬ සහය (Voice Help) භාවිතා කරන්නේ කොහොමද?',
      lang === 'en' ? 'How to request blood?' : 'හදිසි ලේ ඉල්ලුම් කරන්නේ කොහොමද?'
    );
  }

  return { actions: actions.slice(0, 4), chips: chips.slice(0, 4) };
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
Sri Lanka's complete community mutual aid, emergency disaster response, and verified services platform.

Here is everything you can do through this app:
1. 🩸 **Emergency Blood Radar**: Instant real-time matching with verified blood donors in your district (100% Free).
2. 🚨 **15km Red Alert Sirens & SOS Live Tracker**: Instant emergency sirens (works even with screen off!) and real-time GPS tracking for floods, landslides, and hazards (100% Free).
3. 🎙️ **Voice Help (හඬ සහය)**: Record a voice message in 1 tap to post Quick Service, General Help, or Red Alert requests without typing.
4. ⚡ **24/7 Quick Artisan Services & Verified Pros**: Connect with electricians, plumbers, mechanics, and skilled professionals within 15km.
5. 📦 **Transparent Aid Ledger**: Track disaster relief distributions with 6-digit security PINs to prevent fraud.
6. 💼 **Jobs Portal & 🏠 Accommodations**: Find or post local job vacancies and boarding/rental accommodations with interactive maps.
7. 🔄 **Barter Exchange & 🎁 Free Gifts**: Swap goods without cash (Barter) or donate books, clothes, and medical equipment 100% free (From Me To You).
8. 🔍 **Find For Me (Lost & Found)**: Recover lost NICs, licenses, wallets, and pets with community help.
9. 🛒 **Lowest Market Prices & 🤝 Shramadana**: Compare grocery price gaps across local shops and organize community teamwork projects.
10. 💳 **Wallet, QR Pay & S-Points**: Earn S-Points & Trust Badges for helping others, or pay/transfer credits via QR.`,
        actions: [
          { type: 'open_help_post', label: '📝 Post a Help Request' },
          { type: 'open_quick', label: '⚡ 24/7 Quick Services' },
          { type: 'open_blood', label: '🩸 Blood & Disaster Radar' },
          { type: 'open_market', label: '🛒 Lowest Market Prices' },
        ],
        quickChips: [
          'How does Voice Help work?',
          'How does Blood Radar work?',
          'How do Jobs & Barter work?',
          'Check Market Prices',
        ],
      };
    } else if (lang === 'ta') {
      return {
        text: `🌟 **சகாய சேவா (Sahaya Sewa) தளத்திற்கு வரவேற்கிறோம்!**
இலங்கையின் முதன்மை பரஸ்பர உதவி மற்றும் அவசர சேவை வலையமைப்பு.

இந்த செயலியின் மூலம் நீங்கள் செய்யக்கூடியவை:
1. 🩸 **அவசர இரத்த தானம்**: உங்கள் மாவட்டத்தில் உள்ள இரத்தக் கொடையாளர்களை உடனுக்குடன் கண்டறியலாம்.
2. 🚨 **15 கி.மீ அவசர எச்சரிக்கைகள் (Red Alert) & SOS**: இயற்கை அனர்த்தங்கள், விபத்துக்கள் குறித்த உடனடி சைரன் எச்சரிக்கைகள்.
3. 🎙️ **குரல் உதவி (Voice Help)**: தட்டச்சு செய்யாமல் குரல் பதிவு மூலம் உதவி கோரிக்கைகளை இடுக.
4. ⚡ **24/7 விரைவு சேவைகள்**: 15 கி.மீ சுற்றளவில் உள்ள எலக்ட்ரீஷியன், பிளம்பர் போன்ற கைவினைஞர்களை இணைத்தல்.
5. 📦 **வெளிப்படையான நிவாரண லெட்ஜர்**: நிவாரணப் பொருட்களை ஏமாற்றுதலின்றி விநியோகிக்கும் முறைமை.
6. 💼 **வேலைவாய்ப்புகள் & 🏠 தங்குமிடங்கள்**: வேலைகள் மற்றும் தங்குமிடங்களை வரைபடத்தில் தேடுதல்.
7. 🔄 **பண்டமாற்று (Barter) & 🎁 இலவச அன்பளிப்புகள்**: பணமின்றி பொருட்களை மாற்றுதல் அல்லது இலவசமாகப் பகிர்தல்.
8. 🛒 **குறைந்தபட்ச சந்தை விலைகள் & 🔍 தொலைந்தவை தேடல்**.`,
        actions: [
          { type: 'open_help_post', label: '📝 உதவி கோரிக்கையை இடுக' },
          { type: 'open_quick', label: '⚡ விரைவு சேவைகள்' },
          { type: 'open_blood', label: '🩸 இரத்த தானம்' },
        ],
        quickChips: ['உதவி கோருவது எப்படி?', 'இரத்த தானம் எவ்வாறு இயங்குகிறது?'],
      };
    } else {
      return {
        text: `🌟 **සහය සේවා (Sahaya Sewa) යනු ශ්‍රී ලාංකික අපේම සම්පූර්ණ ප්‍රජා සත්කාරක සහ හදිසි සේවා ජාලයයි!**

මෙම ඇප් එක හරහා ඔබට ලබාගත හැකි සියලුම සේවාවන් මෙන්න:

1. 🩸 **හදිසි ලේ බැංකු රේඩාර් (Emergency Blood Radar - නොමිලේ)**:
   රෝගීන්ට අවශ්‍ය ලේ වර්ගයට අදාළ ඔබගේ දිස්ත්‍රික්කයේ සිටින සත්‍යාපිත ලේ පරිත්‍යාගශීලීන් රේඩාර් මඟින් ක්ෂණිකව සම්බන්ධ කරගැනීම.
2. 🚨 **කි.මී. 15 රතු නිවේදන සහ SOS සජීවී ලුහුබැඳීම (Red Alert & SOS - නොමිලේ)**:
   ගංවතුර, නායයෑම්, හදිසි අනතුරු පිළිබඳව අවට කි.මී. 15ක අසල්වැසියන්ට (තිරය නිවී තිබියදී පවා) ක්ෂණික සයිරන් අනතුරු ඇඟවීම් නිකුත් කිරීම.
3. 🎙️ **හඬ සහය (AI Voice Help)**:
   ටයිප් කිරීමට අපහසු ඕනෑම අයෙකුට තම අවශ්‍යතාවය හඬින් පටිගත කර තත්පර කිහිපයකින් දැන්වීමක් පළකිරීමේ පහසුකම.
4. ⚡ **24/7 ක්ෂණික කාර්මික සේවා සහ වෘත්තිකයන් (Quick & Pro Services)**:
   කි.මී. 15 සීමාවේ සිටින විදුලි, නල, වාහන කාර්මිකයන් සහ ලියාපදිංචි වෘත්තිකයන් නිවසටම ගෙන්වා ගැනීම.
5. 📦 **විනිවිදභාවයේ ආධාර ලෙජරය (Transparent Aid Ledger)**:
   ආපදා සහන කඳවුරු වෙත ආධාර බෙදාදීම අංක 6ක රහස් PIN එකකින් සත්‍යාපනය කර වංචාවලින් තොරව ප්‍රසිද්ධ ලෙජරයක සටහන් කිරීම.
6. 💼 **රැකියා පියස (Jobs) සහ 🏠 නවාතැන් පහසුකම් (Accommodations)**:
   ප්‍රදේශයේ රැකියා අවස්ථා සහ බෝඩිං/නවාතැන් සිතියම ආධාරයෙන් පහසුවෙන් සොයාගැනීම.
7. 🔄 **භාණ්ඩ හුවමාරුව (Barter Exchange) සහ 🎁 මගෙන් ඔබට නොමිලේ දීමනා**:
   මුදල් නොමැතිව භාණ්ඩයකට භාණ්ඩයක් හුවමාරු කරගැනීම හෝ පොත්පත්, ඇඳුම්, රෝද පුටු 100% නොමිලේ පරිත්‍යාග කිරීම.
8. 🔍 **සොයාදෙන්න (Lost & Found)**:
   නැතිවූ ජාතික හැඳුනුම්පත්, බලපත්‍ර, සුරතල් සතුන් ප්‍රජාව සමඟ එක්ව සොයාගැනීම.
9. 🛒 **වෙළඳපල අඩුම මිල දර්ශකය සහ 🤝 ශ්‍රමදාන කණ්ඩායම් වැඩ**:
   භාණ්ඩවල අඩුම මිල ගණන් සංසන්දනය සහ ගමේ පොදු ශ්‍රමදාන සංවිධානය.
10. 💳 **Wallet, QR Pay සහ S-Points ප්‍රසාද ලකුණු**:
    අන් අයට උදව් කර S-Points සහ Trust Badges දිනාගැනීම සහ QR මඟින් ක්‍රෙඩිට් හුවමාරුව.`,
        actions: [
          { type: 'open_help_post', label: '📝 උපකාර ඉල්ලුම් පෝරමය' },
          { type: 'open_quick', label: '⚡ 24/7 ක්ෂණික කාර්මික සේවා' },
          { type: 'open_blood', label: '🩸 හදිසි ලේ & ආපදා රේඩාර්' },
          { type: 'open_market', label: '🛒 වෙළඳපල අඩුම මිල ගණන්' },
        ],
        quickChips: [
          'හඬ සහය (Voice Help) කියන්නේ මොකක්ද?',
          'ලේ ඉල්ලුම් කරන්නේ කොහොමද?',
          'රැකියා සහ නවාතැන් සොයන්නේ කොහොමද?',
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
      text: `🔍 **සොයාදෙන්න පෝරමය (Find For Me / Lost & Found)**

ඔබගේ ජාතික හැඳුනුම්පත (NIC), රියදුරු බලපත්‍රය, මුදල් පසුම්බිය හෝ සුරතල් සතෙකු නැතිවූ විට හෝ යමක් සොයාගැනීමට පෝරමයේ ඇති ක්ෂේත්‍ර:
1. **අනු-වර්ගය තෝරන්න**: \`නැතිවූ දෙයක් (Lost)\` / \`සොරාගත් දෙයක් (Stolen)\` / \`මිලදී ගැනීමට සොයන දෙයක් (Find)\` / \`හමුවූ දෙයක් (Found)\`. *(ඉහළින් ඇති **AI හඬ පිරවුම** මඟින් කතා කර ස්වයංක්‍රීයව පෝරමය පිරවීමට ද හැක).*
2. **භාණ්ඩයේ නම \*** සහ **Tag එකක් තේරීම**.
3. **නැතිවූ/සොරාගත් දෙයක් නම්**: සිදුවූ ස්ථානය, දිනය, වේලාව, හඳුනාගැනීමේ විශේෂ ලක්ෂණ/අංක, සහ **ත්‍යාග මුදලක් (Reward)** පිරිනමන්නේ නම් එහි විස්තර.
4. **මිලදී ගැනීමට සොයන දෙයක් නම්**: අපේක්ෂිත මිල, ප්‍රමාණය, අවසන් දිනය සහ බෙදාහැරීමේ ක්‍රමය.
5. **සම්බන්ධ කරගත හැකි දුරකථන අංකය, WhatsApp අංකය, ලිපිනය** සහ **වෙනත් විස්තර**.`,
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
      text: `🎁 **මගෙන් ඔබට පෝරමය (From Me To You Free Donations & Exchange)**

ඔබ සතුව ඇති පොත්පත්, පාසල් උපකරණ, රෝද පුටු, ඇඳුම් පැළඳුම් 100% නොමිලේ පරිත්‍යාග කිරීමට හෝ හුවමාරු කරගැනීමට පෝරමයේ ඇති ක්ෂේත්‍ර:
1. **අරමුණ තෝරන්න**: \`පරිත්‍යාග කිරීම (Donation)\` / \`නොමිලේ ඉවත් කිරීම (Giveaway)\` / \`භාණ්ඩ හුවමාරුව (Exchange)\`.
2. **පරිත්‍යාග හෝ ඉවත් කිරීම නම්**: ලබාදෙන දෙය, කාණ්ඩය සහ Tag එක, කා වෙනුවෙන්ද (පාසල් ළමුන් / අඩු ආදායම්ලාභී පවුල් / වැඩිහිටියන් / ආබාධිත අය), ප්‍රමාණය, ලබාගන්නා ක්‍රමය (\`ඇවිත් රැගෙන යන්න\` / \`ගෙනවිත් දෙන්නම්\` / \`එවන්නම්\`), සහ දිනය.
3. **හුවමාරුවක් (Exchange) නම්**: ඔබ ළඟ ඇති භාණ්ඩය හා ප්‍රමාණය, ඔබට අවශ්‍ය භාණ්ඩය හා ප්‍රමාණය.
4. **ස්ථානය (GPS), WhatsApp දුරකථන අංකය සහ වැඩිදුර විස්තර**.`,
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

1. 🔒 **තොරතුරු රහස්‍යභාවය**: ඔබගේ ජාතික හැඳුනුම්පතේ ඉදිරිපස (NIC Front) ඡායාරූපය සාමාන්‍ය පරිශීලකයන්ට කිසිසේත්ම නොපෙනේ. එය භාවිතා කරන්නේ ගිණුම සත්‍යාපනය සඳහා ඇඩ්මින්වරුන් පමණි.
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
  // 10. FORM FILLING GUIDANCE (පෝරම පුරවන ආකාරය - පෝරමයේ ඇති සැබෑ ක්ෂේත්‍ර පමණි)
  // -------------------------------------------------------------
  const isFormFillingQuery =
    lower.includes('පෝරම') ||
    lower.includes('පුරවන්නේ') ||
    lower.includes('පුරවන') ||
    lower.includes('form') ||
    lower.includes('ලේඛන');

  if (isFormFillingQuery) {
    return {
      text: `📝 **සහය සේවා පෝරම නිවැරදිව පිරවීම (එක් එක් පෝරමයේ ඇති සැබෑ ක්ෂේත්‍ර පමණි)**:

1. **📝 නව ගිණුමක් ලියාපදිංචි කිරීමේ පෝරමය (Registration Form)**:
   • **ඡායාරූපය (1ක් පමණි)**: කැමරාවෙන් ගන්නා **හැඳුනුම්පතේ ඉදිරිපස (NIC Front) ඡායාරූපය පමණි** *(මුහුණේ Selfie හෝ NIC පිටුපස ඡායාරූප අවශ්‍ය නොවේ)*.
   • **සම්පූර්ණ නම \***, **NIC අංකය \***, **දුරකථන / WhatsApp අංකය \***, **දිස්ත්‍රික්කය හා පොලිස් බලප්‍රදේශය**, **නගරය**, **ලිපිනය \*** සහ **රහස් පදය (අවම අකුරු 6ක්) \***.

2. **🤝 සාමාන්‍ය සේවා / උපකාර ඉල්ලුම් පෝරමය (Community Help Form - පියවර 2කි)**:
   • **පියවර 1**: **හෙඩ්ලයින් එක (Headline) \***, **විස්තරය (Text) / ඡායාරූප (Image) / මත විමසුම (Poll)** යන Tabs 3න් එකක්, **සාමාන්‍ය සේවා Tag එකක් \***, සහ බාහිර Link එකක් (අත්‍යවශ්‍ය නොවේ).
   • **පියවර 2**: පෙරදසුන බලා අවශ්‍ය නම් **නම සඟවා නිර්නාමිකව (Anonymous)** පළ කිරීම හෝ දිනයක්/වේලාවක් නියම කර (**Schedule**) පළ කිරීම. *(ගාස්තුව: රු. 25)*.

3. **⚡ ඉක්මන් සේවා පෝරමය (Quick Services Form)**:
   • **Tag එක**, **සිදුවී ඇති දේ \***, **විය යුතු දේ \***, කොන්දේසි/විශේෂ දැනුම්දීම්, **ප්‍රවාහන ක්‍රමය (විකල්ප 5න් 1ක්)**, **ගෙවීම් එකඟතාවය හෝ මුදල**, **අවශ්‍ය සහායකයින් ගණන (-/+)**, සහ **WhatsApp අංකය \***. *(ගාස්තුව: රු. 25)*.

4. **🩸 හදිසි ලේ ඉල්ලුම් පෝරමය (Blood Request Form - 100% නොමිලේ)**:
   • **රෝගියාගේ නම \***, **ලේ වර්ගය (A+, A-, B+, B-, AB+, AB-, O+, O-)**, **ඒකක ගණන**, **රෝහලේ නම \***, **දිස්ත්‍රික්කය**, **හදිසිභාවය හා දිනය**, **සම්බන්ධීකාරකගේ නම හා දුරකථන අංකය \***.

5. **🚨 රතු නිවේදන පෝරමය (Red Alert Form - 100% නොමිලේ)**:
   • **ආපදා වර්ගය** (ගංවතුර/නායයෑම්/ගින්නක් ආදිය), **විස්තරය \***, **GPS ස්ථානය**, **දැනුම් දෙන්නාගේ විස්තර පෙන්වීමේ Toggle එක**, සහ **ඉලක්කම් 4ක Device PIN තහවුරු කිරීම**.`,
      actions: [
        { type: 'open_help_post', label: '📝 උපකාර ඉල්ලුම් පෝරමය' },
        { type: 'open_quick', label: '⚡ ඉක්මන් සේවා පෝරමය' },
        { type: 'open_blood', label: '🩸 ලේ ඉල්ලුම් පෝරමය' },
      ],
      quickChips: ['සොයාදෙන්න පෝරමය පුරවන හැටි', 'මගෙන් ඔබට පෝරමය පුරවන හැටි', 'රැකියා පෝරමය පුරවන හැටි'],
    };
  }

  // -------------------------------------------------------------
  // 11. VOICE HELP (හඬ සහය - AI Voice Help)
  // -------------------------------------------------------------
  const isVoiceHelpQuery =
    lower.includes('හඬ සහය') ||
    lower.includes('හඬ පණිවිඩ') ||
    lower.includes('voice help') ||
    lower.includes('voice post') ||
    lower.includes('ටයිප් කරන්න බෑ') ||
    lower.includes('කතා කරලා');

  if (isVoiceHelpQuery) {
    return {
      text: `🎙️ **හඬ සහය (AI Voice Help - ටයිප් නොකර දැන්වීම් පළකිරීම)**

ටයිප් කිරීමට අපහසු හෝ හදිසි අවස්ථාවක සිටින ඕනෑම අයෙකුට තම හඬින් දැන්වීමක් පළ කළ හැක:
1. මුල් පිටුවේ ඇති **"🎙️ හඬ සහය (Voice Help)"** බොත්තම ඔබන්න.
2. මයික්‍රෆෝන් බොත්තම ඔබා ඔබගේ අවශ්‍යතාවය පැහැදිලිව පවසන්න (විනාඩි 2ක් දක්වා).
3. අදාළ කාණ්ඩය තෝරන්න:
   • ⚡ **ඉක්මන් සේවා** (ගාස්තුව රු. 25)
   • 🤝 **සාමාන්‍ය සේවා** (ගාස්තුව රු. 25)
   • 🚨 **ආපදා / රතු එළිය** (100% නොමිලේ)
4. අවශ්‍ය සහායකයින් ගණන තෝරා **"දැන්වීම පළකරන්න"** ඔබන්න!`,
      actions: [
        { type: 'open_help_post', label: '📝 දැන්වීම් පුවරුව වෙත යන්න' },
      ],
      quickChips: ['රතු නිවේදනයක් නිකුත් කරන්නේ කොහොමද?', 'ක්‍රෙඩිට් (Wallet) ලබාගන්නේ කොහොමද?'],
    };
  }

  // -------------------------------------------------------------
  // 12. JOBS & ACCOMMODATIONS (රැකියා පියස සහ නවාතැන් පහසුකම්)
  // -------------------------------------------------------------
  const isJobsOrStayQuery =
    lower.includes('රැකියා') ||
    lower.includes('ජොබ්') ||
    lower.includes('job') ||
    lower.includes('නවාතැන්') ||
    lower.includes('බෝඩිං') ||
    lower.includes('කාමර') ||
    lower.includes('accommodation') ||
    lower.includes('boarding');

  if (isJobsOrStayQuery) {
    return {
      text: `💼 **රැකියා පියස (Jobs Portal) සහ 🏠 නවාතැන් පහසුකම් (Accommodations)**

• **💼 රැකියා පියස**: ඔබගේ ප්‍රදේශයේ පූර්ණ කාලීන, අර්ධ කාලීන හෝ දෛනික රැකියා අවස්ථා සිතියම (Job Map) ආධාරයෙන් සොයාගැනීමට හෝ ඔබගේ ආයතනයේ ඇබෑර්තු පළකිරීමට ප්‍රධාන මෙනුවේ **"රැකියා (Jobs)"** වෙත පිවිසෙන්න.
• **🏠 නවාතැන් පහසුකම්**: බෝඩිං කාමර, නිවාස කුලියට දීම් සහ තාවකාලික නවාතැන් ගාස්තු හා සිතියම් පිහිටීම සමඟ පරීක්ෂා කිරීමට **"නවාතැන් (Accommodations)"** වෙත පිවිසෙන්න.`,
      actions: [
        { type: 'open_help_post', label: '📝 දැන්වීමක් පළකරන්න' },
      ],
      quickChips: ['භාණ්ඩ හුවමාරුව (Barter) යනු කුමක්ද?', 'වෙළඳපල අඩුම මිල ගණන්'],
    };
  }

  // -------------------------------------------------------------
  // 13. BARTER EXCHANGE (භාණ්ඩ හුවමාරුව)
  // -------------------------------------------------------------
  const isBarterQuery =
    lower.includes('හුවමාරු') ||
    lower.includes('barter') ||
    lower.includes('භාණ්ඩ හුවමාරු');

  if (isBarterQuery) {
    return {
      text: `🔄 **භාණ්ඩ හුවමාරුව (Cashless Barter Exchange)**

මුදල් භාවිතයකින් තොරව ඔබ සතුව ඇති භාණ්ඩයක් දී ඔබට අවශ්‍ය වෙනත් භාණ්ඩයක් හුවමාරු කරගැනීමට:
1. **"භාණ්ඩ හුවමාරුව (Barter Exchange)"** විවෘත කර ඔබ සතුව ඇති දෙය සහ ඒ වෙනුවට බලාපොරොත්තු වන දෙය පළකරන්න.
2. වෙනත් පරිශීලකයින් එවන හුවමාරු යෝජනා (Swap Proposals) පරීක්ෂා කර කැමති යෝජනාව පිළිගන්න.`,
      actions: [
        { type: 'open_from_you', label: '🎁 නොමිලේ දීමනා / හුවමාරු' },
      ],
      quickChips: ['මගෙන් ඔබට නොමිලේ දීමනා', 'වෙළඳපල අඩුම මිල ගණන්'],
    };
  }

  // -------------------------------------------------------------
  // 14. WALLET, CREDITS, QR PAY & S-POINTS (පසුම්බිය සහ ක්‍රෙඩිට්)
  // -------------------------------------------------------------
  const isWalletOrPointsQuery =
    lower.includes('wallet') ||
    lower.includes('credit') ||
    lower.includes('ක්‍රෙඩිට්') ||
    lower.includes('පසුම්බි') ||
    lower.includes('ගාස්තු') ||
    lower.includes('qr pay') ||
    lower.includes('s-points') ||
    lower.includes('ලකුණු');

  if (isWalletOrPointsQuery) {
    return {
      text: `💳 **Wallet ක්‍රෙඩිට්, QR Pay සහ S-Points ප්‍රසාද ලකුණු**

1. **දැන්වීම් ගාස්තු**:
   • 🚨 **රතු නිවේදන (Red Alerts) සහ 🩸 හදිසි ලේ ඉල්ලීම්**: 100% **නොමිලේ**!
   • 📝 **සාමාන්‍ය සහ ඉක්මන් සේවා දැන්වීම්**: එක් දැන්වීමක් සඳහා රු. 25 (25 Credits) පමණි.
2. **QR Pay**: ඔබගේ Wallet එකේ ඇති QR කේතය මඟින් වෙනත් පරිශීලකයෙකුට ක්ෂණිකව ක්‍රෙඩිට් යැවිය හැක.
3. **S-Points සහ Trust Badges**: අන් අයගේ දැන්වීම් වලට උදව් කිරීමෙන් ඔබට S-Points සහ විශ්වසනීයත්ව පදක්කම් (Trust Badges) හිමිවන අතර ප්‍රමුඛතා ලැයිස්තුවේ (Leaderboard) ඉහළට පැමිණිය හැක.`,
      actions: [
        { type: 'open_wallet', label: '💳 මගේ Wallet එක විවෘත කරන්න' },
      ],
      quickChips: ['ක්‍රෙඩිට් Top-up කරන්නේ කොහොමද?', 'දැන්වීමක් Boost කරන්නේ කොහොමද?'],
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
