/**
 * Smart Privacy & Security Policy Guard for Sahaya Sewa
 * Enforces privacy protection before ad confirmation.
 * Prevents disclosure of Phone Numbers, WhatsApp, Links, and Physical Locations/Addresses.
 * Detects Sinhala written numbers (එක, දෙක, තුන...), digit sequences, 
 * contextual triggers (එන්න, පැමිණෙන්න, කතාකරන්න, etc.), and location/town names.
 * Manages 3-Strike Warning & Account Blocking workflow.
 */

export interface PolicyCheckResult {
  hasViolation: boolean;
  sanitizedText: string;
  detectedTypes: ('phone' | 'link' | 'address')[];
  originalText: string;
  matchSnippets: string[];
}

export const POLICY_WARNING_MESSAGE =
  "සහය තහවුරු කිරිමට පෙර මෙලෙස ඔබගේ පෞද්ගලික තොරතුරු ලබාදිම සහය සේවා නිති මාලාවට පටහැනිවන අතර දිගින් දිගටම එලෙස කිරිමට උත්සහ කලහොත් ගිණුම අවලංගු වන බව කරුණාවෙන් දන්වා සිටිමි";

export const POLICY_BLOCKED_MESSAGE =
  "ඔබ දිගින් දිගටම සහය සේවයේ නිති උල්ලංඝනය කරඇති හෙයින් ගිණුම නැවත සක්රිය කිරිමට සහය සේවයේ ගැටලු සදහා වන බොත්තම ක්ලික් කර උදව් ලබාගන්න";

export const REDACTED_TOKEN = "[🔒 පෞද්ගලික තොරතුරු ඉවත් කරන ලදී]";

// Comprehensive Sinhala & English number words map
const NUMBER_WORD_MAP: Record<string, string> = {
  // 0
  'බිංදුව': '0', 'බින්දුව': '0', 'බිංදුවයි': '0', 'බින්දුවයි': '0', 'බිංදු': '0', 'බින්දු': '0', 'සීරෝ': '0', 'zero': '0', 'o': '0',
  // 1
  'එක': '1', 'එකයි': '1', 'එකක්': '1', 'වන්': '1', 'one': '1',
  // 2
  'දෙක': '2', 'දෙකයි': '2', 'දෙකක්': '2', 'දෙන්නෙක්': '2', 'ටූ': '2', 'two': '2',
  // 3
  'තුන': '3', 'තුනයි': '3', 'තුනක්': '3', 'ත්‍රී': '3', 'three': '3',
  // 4
  'හතර': '4', 'හතරයි': '4', 'හතරක්': '4', 'ෆෝ': '4', 'four': '4',
  // 5
  'පහ': '5', 'පහයි': '5', 'පහක්': '5', 'ෆයිව්': '5', 'five': '5',
  // 6
  'හය': '6', 'හයයි': '6', 'හයක්': '6', 'සික්ස්': '6', 'six': '6',
  // 7
  'හත': '7', 'හතයි': '7', 'හතක්': '7', 'සෙවන්': '7', 'seven': '7',
  // 8
  'අට': '8', 'අටයි': '8', 'අටක්': '8', 'එයිට්': '8', 'eight': '8',
  // 9
  'නමය': '9', 'නමයයි': '9', 'නවය': '9', 'නවයයි': '9', 'නමයක්': '9', 'නවයක්': '9', 'නයින්': '9', 'nine': '9',
  // Tens / Compounds
  'දහය': '10', 'දස': '10', 'දොළහ': '12', 'දහතුන': '13', 'දහහතර': '14', 'පහළොව': '15', 'දහසය': '16', 'දහහත': '17', 'දහඅට': '18', 'දහනවය': '19',
  'විස්ස': '20', 'විසි': '2', 'විසිඑක': '21', 'විසිදෙක': '22',
  'තිහ': '30', 'තිස්': '3', 'තිස්එක': '31', 'තිස්දෙක': '32',
  'හතලිහ': '40', 'හතළිහ': '40', 'හතලිස්': '4', 'හතළිස්': '4',
  'පනහ': '50', 'පනස්': '5',
  'හැට': '60', 'හැටපහ': '65',
  'හැත්තෑව': '70', 'හැත්තෑ': '7', 'හැත්තෑපහ': '75', 'හැත්තෑහත': '77',
  'අසූව': '80', 'අසූ': '8',
  'අනූව': '90', 'අනූ': '9', 'අනූහතර': '94',
};

// Meeting, calling, messaging, moving, visiting & location sharing triggers
const TRIGGER_KEYWORDS = [
  'එන්න', 'පැමිණෙන්න', 'පැමිනෙන්න', 'එන්නකො', 'එන්නකෝ', 'එන්ට', 'ආවොත්', 'වරෙන්', 'එනවා', 'යන්න', 'යමු', 'යන්නම්', 'එන්නම්',
  'කතාකරන්න', 'කතා කරන්න', 'කතා කරන්ඩ', 'කතා කරමු', 'කතාකරමු',
  'කෝල් කරන්න', 'කෝල් එකක්', 'කෝල් එකක් දෙන්න', 'කෝල් එකක් ගන්න', 'කෝල් කරපන්', 'කෝල්', 'call',
  'ගන්න', 'ඇමතුමක් දෙන්න', 'ඇමතුමක් ගන්න', 'ඇමතුමක්',
  'මැසේජ් කරන්න', 'මැසේජ් එකක් දාන්න', 'මැසේජ් එකක්', 'මැසේජ්', 'එස්එම්එස්', 'sms', 'msg', 'contact',
  'whatsapp', 'වට්ස්ඇප්', 'වට්සැප්', 'viber', 'telegram', 'imo',
  'ලොකේෂන්', 'location', 'ලිපිනය', 'address', 'හමුවෙමු', 'හමුවෙන්න', 'meet වෙමු', 'meet වෙන්න', 'සෙට් වෙමු',
  'ගෙදර', 'නිවස', 'කඩේ', 'office', 'තැන', 'හන්දිය', 'පාර', 'ස්ථානය'
];

// Major Sri Lankan cities, towns, suburbs & localities in Sinhala and English
const SRI_LANKAN_LOCATIONS = [
  'කොටුගොඩ', 'මිනුවන්ගොඩ', 'ගම්පහ', 'ජාඇල', 'ජා-ඇල', 'සීදූව', 'කටුනායක', 'මීගමුව', 'වත්තල', 'කඳාන', 'රාගම',
  'කිරිබත්ගොඩ', 'කඩවත', 'කැළණිය', 'මාලඹේ', 'බත්තරමුල්ල', 'නුගේගොඩ', 'මහරගම', 'කොට්ටාව', 'හෝමාගම', 'පාදුක්ක',
  'මොරටුව', 'පානදුර', 'කළුතර', 'ගාල්ල', 'මාතර', 'මහනුවර', 'කුරුණෑගල', 'රත්නපුර', 'අනුරාධපුර', 'පොළොන්නරුව',
  'බදුල්ල', 'බණ්ඩාරවෙල', 'මාතලේ', 'හලාවත', 'පුත්තලම', 'කුණ්ඩසාලේ', 'පේරාදෙණිය', 'දෙහිවල', 'ගල්කිස්ස', 'රත්මලාන',
  'වැල්ලවත්ත', 'බම්බලපිටිය', 'කොල්ලුපිටිය', 'පිටකොටුව', 'කොටුව', 'බොරැල්ල', 'මරදාන', 'දෙමටගොඩ', 'ග්‍රෑන්ඩ්පාස්',
  'ඔරුගොඩවත්ත', 'පෑලියගොඩ', 'තිඹිරිගස්යාය', 'නාරාහේන්පිට', 'රාජගිරිය', 'කොහුවල', 'පිළියන්දල', 'කැස්බෑව',
  'බොරලැස්ගමුව', 'අතුරුගිරිය', 'කඩුවෙල', 'කොස්වත්ත', 'තලවතුගොඩ', 'පන්නිපිටිය', 'මීපේ', 'හංවැල්ල', 'අවිස්සාවේල්ල',
  'නිට්ටඹුව', 'යක්කල', 'වේයන්ගොඩ', 'මීරිගම', 'දිවුලපිටිය', 'දොම්පේ', 'පූගොඩ', 'කිරිඳිවැල', 'මල්වාන', 'බියගම',
  'දෙල්ගොඩ', 'ඌරගස්මන්හන්දිය', 'අලව්ව', 'පොල්ගහවෙල', 'මාවනැල්ල', 'කෑගල්ල', 'වරකාපොළ', 'අඹේපුස්ස', 'බලංගොඩ',
  'ඇඹිලිපිටිය', 'හම්බන්තොට', 'තංගල්ල', 'අම්බලන්තොට', 'බෙලිඅත්ත', 'හබරාදුව', 'අහංගම', 'හික්කඩුව', 'අම්බලන්ගොඩ',
  'ඇල්පිටිය', 'බෙන්තොට', 'බේරුවල', 'අලුත්ගම', 'වාද්දුව', 'බණ්ඩාරගම', 'හොරණ', 'ඉංගිරිය', 'මතුගම', 'අගලවත්ත',
  'දඹුල්ල', 'සීගිරිය', 'හබරණ', 'කැකිරාව', 'මැදවච්චිය', 'තඹුත්තේගම', 'නොච්චියාගම', 'එප්පාවල', 'ගල්ගමුව', 'නිකවැරටිය',
  'කුලියාපිටිය', 'පන්නල', 'ගිරිඋල්ල', 'නාරම්මල', 'වාරියපොළ', 'මහෝ', 'ගල්ගමුව', 'හතරලියද්ද', 'කටුගස්තොට', 'අකුරණ',
  'තෙල්දෙණිය', 'දිගන', 'වත්තේගම', 'ගම්පොළ', 'නාවලපිටිය', 'නුවරඑළිය', 'හැටන්', 'තලවාකැලේ', 'බණ්ඩාරවෙල', 'ඇල්ල',
  'වැලිමඩ', 'මහියංගණය', 'මොණරාගල', 'බිබිල', 'බුත්තල', 'වැල්ලවාය', 'කතරගම', 'තිස්සමහාරාමය',
  // English common place names
  'kotugoda', 'minuwangoda', 'gampaha', 'ja-ela', 'ja ela', 'jaela', 'seeduwa', 'katunayake', 'negombo', 'wattala',
  'kandana', 'ragama', 'kiribathgoda', 'kadawatha', 'kelaniya', 'malabe', 'battaramulla', 'nugegoda', 'maharagama',
  'kottawa', 'homagama', 'moratuwa', 'panadura', 'kalutara', 'galle', 'matara', 'kandy', 'kurunegala', 'ratnapura',
  'anuradhapura', 'dehiwala', 'mount lavinia', 'ratmalana', 'wellawatte', 'bambalapitiya', 'kollupitiya', 'pettah',
  'fort', 'borella', 'maradana', 'rajagiriya', 'piliyandala', 'kesbewa', 'boralesgamuwa', 'athurugiriya', 'kaduwela',
  'nittambuwa', 'yakkala', 'veyangoda', 'mirigama', 'kegalle', 'colombo'
];

// Standard Regex Patterns for Phone Numbers
const PHONE_PATTERNS = [
  // Standard formatted: +94 77 123 4567, 077-1234567, 071 234 5678, 0112345678
  /(?:\+?94|0)\s*(?:[1-9]\d|\([1-9]\d\))[\s.-]?\d{3}[\s.-]?\d{3,4}/gi,
  // Dispersed digit sequences: 0 7 7 1 2 3 4 5 6 7 or 0.7.7...
  /\b0[\s.-]*[1-9](?:[\s.-]*\d){7,8}\b/gi,
  // Any standalone 9 to 11 digit numeric sequence
  /\b(?:\+?94|0)?[71-9]\d{7,9}\b/gi,
  // WhatsApp / Call indicators followed by numbers
  /(?:whatsapp|whtsp|watap|viber|call|tp|phn|දුරකථන|වට්සැප්|වට්ස්ඇප්|අංකය|contact|ඇමතුම්)[\s:]*[\d\s+.-]{7,15}/gi,
  // Spaced digits sequence (e.g., 0 7 7 1 2 3 4 5 6 7)
  /(?:0|\+?94)[\s,.-]+[1-9](?:[\s,.-]+\d){7,8}/gi,
];

// Regex Patterns for Links / URLs / Social links
const LINK_PATTERNS = [
  // HTTP/HTTPS URL
  /https?:\/\/[^\s]+/gi,
  // WWW prefixed
  /\bwww\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi,
  // Direct chat links (wa.me, t.me, fb.com, etc.)
  /\b(?:wa\.me|whatsapp\.com|t\.me|telegram\.me|fb\.me|facebook\.com|instagram\.com|bit\.ly|tinyurl\.com|goo\.gl)\/[^\s]+/gi,
  // Generic domain matches (e.g. site.com, example.lk)
  /\b[a-zA-Z0-9-]{2,}\.(?:com|lk|org|net|io|me|co|app|site|online|info|xyz|shop|gov|edu)(?:\/[^\s]*)?/gi,
  // Disguised link phrasing (e.g. "google dot com", "ඩොට් කොම්")
  /(?:dot\s*com|ඩොට්\s*කොම්|\[dot\]|\(dot\))/gi
];

// Regex Patterns for Physical Addresses & Exact Location disclosure
const ADDRESS_PATTERNS = [
  // House numbers + street / road in English & Sinhala
  /(?:නො|නො\.|no\.?|house\s*no\.?|ලිපිනය|address)\s*[:.-]?\s*\d+[\s\w,.-]*(?:පාර|මාවත|වීදිය|පටුමග|ලේන්|road|rd|street|st|lane|ln|mawatha|mw|avenue|ave)/gi,
  // Numbers with road suffixes: 45, Galle Road / 12/A, Kandy road
  /\b\d+(?:\/[A-Za-z0-9]+)?[\s,]+[A-Za-z0-9\s]+(?:road|rd|street|st|lane|ln|mawatha|mw|avenue|ave|drive|place|පාර|මාවත|වීදිය|පටුමග)\b/gi,
  // Landmark / home address / specific junction cues
  /(?:මගේ\s*ගෙදර|නිවස|පිහිටීම|location\s*is|living\s*at|මෙන්න\s*තැන|මෙතනට\s*එන්න|හන්දියට\s*එන්න|ළඟට\s*එන්න|ලඟට\s*එන්න)[\s:]+[A-Za-z0-9\u0D80-\u0DFF\s,.-]{3,40}/gi,
  // Direct Sinhala street/place descriptions
  /(?:නො\s*\d+|අංක\s*\d+)[\s\w\u0D80-\u0DFF,.-]+(?:පාර|මාවත|වීදිය|ගම|හන්දිය|බස්\s*නැවතුම)/gi
];

/**
 * Helper to detect and mask Sinhala written number sequences (e.g., බිංදුව හත එක දෙක තුන හතර පහ හය හත අට)
 */
function detectAndMaskSinhalaNumberWords(
  text: string,
  hasTrigger: boolean
): { text: string; detected: boolean; snippets: string[] } {
  const words = text.split(/([\s,.-]+)/);
  const minSequenceLength = hasTrigger ? 3 : 5;

  let currentSpanIndices: number[] = [];
  let currentDigits = '';
  const rangesToMask: { start: number; end: number; snippet: string }[] = [];
  const snippets: string[] = [];

  let charOffset = 0;
  const wordOffsets: { index: number; start: number; end: number; word: string }[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    wordOffsets.push({
      index: i,
      start: charOffset,
      end: charOffset + w.length,
      word: w,
    });
    charOffset += w.length;
  }

  for (let i = 0; i < words.length; i++) {
    const rawWord = words[i].trim();
    if (!rawWord) continue;

    const lower = rawWord.toLowerCase();
    const mappedDigit = NUMBER_WORD_MAP[lower] || (/^\d$/.test(rawWord) ? rawWord : null);

    if (mappedDigit !== null) {
      currentSpanIndices.push(i);
      currentDigits += mappedDigit;
    } else {
      if (currentSpanIndices.length >= minSequenceLength || currentDigits.length >= 6) {
        const firstIdx = currentSpanIndices[0];
        const lastIdx = currentSpanIndices[currentSpanIndices.length - 1];
        const start = wordOffsets[firstIdx].start;
        const end = wordOffsets[lastIdx].end;
        const snippet = text.slice(start, end);
        rangesToMask.push({ start, end, snippet });
        snippets.push(snippet);
      }
      currentSpanIndices = [];
      currentDigits = '';
    }
  }

  // Trailing check
  if (currentSpanIndices.length >= minSequenceLength || currentDigits.length >= 6) {
    const firstIdx = currentSpanIndices[0];
    const lastIdx = currentSpanIndices[currentSpanIndices.length - 1];
    const start = wordOffsets[firstIdx].start;
    const end = wordOffsets[lastIdx].end;
    const snippet = text.slice(start, end);
    rangesToMask.push({ start, end, snippet });
    snippets.push(snippet);
  }

  if (rangesToMask.length === 0) {
    return { text, detected: false, snippets: [] };
  }

  // Replace ranges in reverse order to keep indices intact
  let modifiedText = text;
  for (let i = rangesToMask.length - 1; i >= 0; i--) {
    const r = rangesToMask[i];
    modifiedText = modifiedText.slice(0, r.start) + REDACTED_TOKEN + modifiedText.slice(r.end);
  }

  return { text: modifiedText, detected: true, snippets };
}

/**
 * Helper to detect contextual triggers (e.g. එන්න, පැමිණෙන්න, කතාකරන්න) 
 * paired with locations or phone numbers.
 */
function inspectContextualTriggers(
  text: string
): { text: string; detectedPhone: boolean; detectedAddress: boolean; snippets: string[] } {
  let modifiedText = text;
  let detectedPhone = false;
  let detectedAddress = false;
  const snippets: string[] = [];

  const lower = text.toLowerCase();
  const hasTrigger = TRIGGER_KEYWORDS.some((kw) => lower.includes(kw));

  // 1. Check for Sinhala written numbers
  const sinhalaCheck = detectAndMaskSinhalaNumberWords(modifiedText, hasTrigger);
  if (sinhalaCheck.detected) {
    modifiedText = sinhalaCheck.text;
    detectedPhone = true;
    snippets.push(...sinhalaCheck.snippets);
  }

  // 2. Check for numeric contact numbers following/preceding trigger keywords
  const triggerWithNumbers = new RegExp(
    `(?:${TRIGGER_KEYWORDS.join('|')})[\\s:,.-]*([0-9\\s+.-]{4,15})`,
    'gi'
  );
  let match: RegExpExecArray | null;
  while ((match = triggerWithNumbers.exec(modifiedText)) !== null) {
    const fullMatch = match[0];
    const numPart = match[1].trim();
    if (numPart.replace(/\D/g, '').length >= 4) {
      detectedPhone = true;
      snippets.push(fullMatch);
      modifiedText = modifiedText.replace(fullMatch, `${fullMatch.replace(numPart, '')} ${REDACTED_TOKEN}`);
    }
  }

  // 3. Check for specific Location / Town Names paired with arrival/visiting/calling words
  // e.g. "කොටුගොඩට එන්න", "එන්න කොටුගොඩට", "මිනුවන්ගොඩ එන්න", "කොටුගොඩට", "කොළඹට එන්න"
  for (const loc of SRI_LANKAN_LOCATIONS) {
    // Matches: [Location](ට|කට|ලට|ගාවට|ළඟට|ලඟට|වෙත|පැත්තට|දිහාවට)? + optional words + Trigger
    // Or Trigger + optional words + [Location](ට|කට|ලට...)?
    const locPattern = new RegExp(
      `\\b(?:${loc})(?:ට|කට|ලට|ගාවට|ගාව|ළඟට|ලඟට|වෙත|පැත්තට|පැත්තේ|දිහාවට)?[\\s,.-]*(?:(?:මම|ඔබ|අපි|මෙහෙට|මෙතනට|තැනට|ඉන්නේ|ඉන්නවා|තියෙන්නේ|තියෙන්නෙ)[\\s,.-]*)*(?:${TRIGGER_KEYWORDS.join('|')})` +
      `|(?:${TRIGGER_KEYWORDS.join('|')})[\\s,.-]*(?:(?:මම|ඔබ|අපි|මෙහෙට|මෙතනට|තැනට|ඉන්නේ|ඉන්නවා|තියෙන්නේ|තියෙන්නෙ)[\\s,.-]*)*(?:${loc})(?:ට|කට|ලට|ගාවට|ගාව|ළඟට|ලඟට|වෙත|පැත්තට|පැත්තේ|දිහාවට)?\\b`,
      'gi'
    );

    const locMatches = modifiedText.match(locPattern);
    if (locMatches && locMatches.length > 0) {
      detectedAddress = true;
      locMatches.forEach((m) => {
        snippets.push(m);
        modifiedText = modifiedText.replace(m, REDACTED_TOKEN);
      });
    }
  }

  // 4. Check for General Nouns ending in '-ට', '-කට', '-ලට', '-ගාවට', '-ළඟට', '-ලඟට' attached to triggers
  // (e.g. "කොටුගොඩට එන්න", "කඩවතට එන්න", "මහරගමට එන්න", "ගෙදරට එන්න", "හන්දියට එන්න", "කඩේට එන්න")
  const generalDestinationWithTrigger = new RegExp(
    `([A-Za-z0-9\\u0D80-\\u0DFF]{2,25}(?:ට|කට|ලට|ගාවට|ගාව|ළඟට|ලඟට|වෙත|පැත්තට|දිහාවට))[\\s:,.-]*(?:${TRIGGER_KEYWORDS.join('|')})` +
    `|(?:${TRIGGER_KEYWORDS.join('|')})[\\s:,.-]*([A-Za-z0-9\\u0D80-\\u0DFF]{2,25}(?:ට|කට|ලට|ගාවට|ගාව|ළඟට|ලඟට|වෙත|පැත්තට|දිහාවට))`,
    'gi'
  );

  while ((match = generalDestinationWithTrigger.exec(modifiedText)) !== null) {
    const fullMatch = match[0];
    const placePart = (match[1] || match[2] || fullMatch).trim();
    // Exclude basic grammatical verbs (e.g., "කරන්නට", "බලන්නට")
    if (placePart.length >= 3 && !placePart.endsWith('න්නට') && !placePart.endsWith('වෙන්නට')) {
      detectedAddress = true;
      snippets.push(fullMatch);
      modifiedText = modifiedText.replace(fullMatch, REDACTED_TOKEN);
    }
  }

  return {
    text: modifiedText,
    detectedPhone,
    detectedAddress,
    snippets,
  };
}

/**
 * Intelligent detector to inspect and sanitize messages before confirmation.
 */
export function inspectAndSanitizeMessage(
  text: string,
  isConfirmed: boolean = false
): PolicyCheckResult {
  if (!text || typeof text !== 'string') {
    return {
      hasViolation: false,
      sanitizedText: '',
      detectedTypes: [],
      originalText: text,
      matchSnippets: [],
    };
  }

  // If already confirmed, privacy restrictions are lifted
  if (isConfirmed) {
    return {
      hasViolation: false,
      sanitizedText: text,
      detectedTypes: [],
      originalText: text,
      matchSnippets: [],
    };
  }

  let sanitized = text;
  const detectedTypes: ('phone' | 'link' | 'address')[] = [];
  const matchSnippets: string[] = [];

  // Step 1: Contextual Trigger & Location/Meeting Check (කොටුගොඩට එන්න, එන්න, පැමිණෙන්න, කතාකරන්න etc.)
  const contextResult = inspectContextualTriggers(sanitized);
  if (contextResult.detectedPhone) {
    if (!detectedTypes.includes('phone')) detectedTypes.push('phone');
    matchSnippets.push(...contextResult.snippets);
    sanitized = contextResult.text;
  }
  if (contextResult.detectedAddress) {
    if (!detectedTypes.includes('address')) detectedTypes.push('address');
    matchSnippets.push(...contextResult.snippets);
    sanitized = contextResult.text;
  }

  // Step 2: Check & Mask Sinhala Number Words (standalone sequence)
  const sinhalaWordCheck = detectAndMaskSinhalaNumberWords(sanitized, false);
  if (sinhalaWordCheck.detected) {
    if (!detectedTypes.includes('phone')) detectedTypes.push('phone');
    matchSnippets.push(...sinhalaWordCheck.snippets);
    sanitized = sinhalaWordCheck.text;
  }

  // Step 3: Check & Mask Standard Phone Numbers
  for (const pattern of PHONE_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches && matches.length > 0) {
      if (!detectedTypes.includes('phone')) detectedTypes.push('phone');
      matches.forEach((m) => {
        if (m.trim().length > 3) {
          matchSnippets.push(m.trim());
          sanitized = sanitized.replace(m, REDACTED_TOKEN);
        }
      });
    }
  }

  // Step 4: Check & Mask Links & Web URLs
  for (const pattern of LINK_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches && matches.length > 0) {
      if (!detectedTypes.includes('link')) detectedTypes.push('link');
      matches.forEach((m) => {
        matchSnippets.push(m.trim());
        sanitized = sanitized.replace(m, REDACTED_TOKEN);
      });
    }
  }

  // Step 5: Check & Mask Physical Addresses
  for (const pattern of ADDRESS_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches && matches.length > 0) {
      if (!detectedTypes.includes('address')) detectedTypes.push('address');
      matches.forEach((m) => {
        matchSnippets.push(m.trim());
        sanitized = sanitized.replace(m, REDACTED_TOKEN);
      });
    }
  }

  const hasViolation = detectedTypes.length > 0;

  return {
    hasViolation,
    sanitizedText: sanitized,
    detectedTypes,
    originalText: text,
    matchSnippets,
  };
}

/**
 * Storage helpers for user policy strike tracking & blocking
 */
const STRIKES_PREFIX = 'sahaya_user_policy_strikes_';
const BLOCKED_PREFIX = 'sahaya_user_policy_blocked_';

export function getCleanUserKey(identifier?: string): string {
  if (!identifier) return 'anonymous_user';
  return identifier.replace(/\D/g, '') || identifier.trim().toLowerCase();
}

export function getUserStrikes(identifier?: string): number {
  const key = getCleanUserKey(identifier);
  try {
    const saved = localStorage.getItem(`${STRIKES_PREFIX}${key}`);
    return saved ? parseInt(saved, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function isUserPolicyBlocked(identifier?: string): boolean {
  const key = getCleanUserKey(identifier);
  try {
    const blockedFlag = localStorage.getItem(`${BLOCKED_PREFIX}${key}`);
    if (blockedFlag === 'true') return true;
    const strikes = getUserStrikes(identifier);
    return strikes > 3;
  } catch {
    return false;
  }
}

export function recordPolicyViolation(
  identifier?: string
): { newStrikes: number; isBlocked: boolean; message: string } {
  const key = getCleanUserKey(identifier);
  const currentStrikes = getUserStrikes(identifier);
  const newStrikes = currentStrikes + 1;

  try {
    localStorage.setItem(`${STRIKES_PREFIX}${key}`, String(newStrikes));
    if (newStrikes > 3) {
      localStorage.setItem(`${BLOCKED_PREFIX}${key}`, 'true');
      return {
        newStrikes,
        isBlocked: true,
        message: POLICY_BLOCKED_MESSAGE,
      };
    }
  } catch (err) {
    console.warn('LocalStorage policy strike error:', err);
  }

  return {
    newStrikes,
    isBlocked: false,
    message: POLICY_WARNING_MESSAGE,
  };
}

export function clearUserPolicyStrikes(identifier?: string): void {
  const key = getCleanUserKey(identifier);
  try {
    localStorage.removeItem(`${STRIKES_PREFIX}${key}`);
    localStorage.removeItem(`${BLOCKED_PREFIX}${key}`);
  } catch (err) {
    console.warn('LocalStorage clear error:', err);
  }
}
