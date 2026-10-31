import { Language } from '../types';
import { translateWithGoogle } from './googleTranslator';

export interface ChatTranslationResult {
originalText: string;
detectedLang: string;
translations: {
si: string;
en: string;
ta: string;
};
}

const STORAGE_LANG_PREFIX = 'sahaya_chat_lang_';
const GLOBAL_CHAT_LANG_KEY = 'sahaya_preferred_chat_lang';

export function getSavedUserChatLanguage(userKey?: string, fallbackLang?: Language): Language {
try {
if (userKey) {
const userSaved = localStorage.getItem(STORAGE_LANG_PREFIX + userKey);
if (userSaved === 'si' ? true : userSaved === 'en' ? true : userSaved === 'ta') {
return userSaved as Language;
}
}
const globalSaved = localStorage.getItem(GLOBAL_CHAT_LANG_KEY);
if (globalSaved === 'si' ? true : globalSaved === 'en' ? true : globalSaved === 'ta') {
return globalSaved as Language;
}
} catch (e) {}
if (fallbackLang && (fallbackLang === 'si' || fallbackLang === 'en' || fallbackLang === 'ta')) {
  return fallbackLang as Language;
}
return 'si';
}

export function saveUserChatLanguagePermanently(lang: Language, userKey?: string): void {
try {
localStorage.setItem(GLOBAL_CHAT_LANG_KEY, lang);
if (userKey) {
localStorage.setItem(STORAGE_LANG_PREFIX + userKey, lang);
}
window.dispatchEvent(new CustomEvent('sahaya_chat_lang_changed', { detail: { lang, userKey } }));
} catch (e) {}
}

const CHAT_EXACT_PHRASES = [
{
matchers: ['subha udasanak', 'suba udasanak', 'subha udesanak', 'suba udesanak', 'good morning', 'සුබ උදෑසනක්', 'සුභ උදෑසනක්', 'காலை வணக்கம்'],
si: 'සුබ උදෑසනක්',
en: 'Good Morning',
ta: 'காலை வணக்கம்',
},
{
matchers: ['subha dahawalak', 'suba dahawalak', 'good afternoon', 'සුබ දහවලක්', 'සුභ දහවලක්', 'மதிய வணக்கம்'],
si: 'සුබ දහවලක්',
en: 'Good Afternoon',
ta: 'மதிய வணக்கம்',
},
{
matchers: ['subha sandhyawak', 'suba sandhyawak', 'good evening', 'සුබ සන්ධ්‍යාවක්', 'සුභ සන්ධ්‍යාවක්', 'மாலை வணக்கம்'],
si: 'සුබ සන්ධ්‍යාවක්',
en: 'Good Evening',
ta: 'மாலை வணக்கம்',
},
{
matchers: ['subha rathriyak', 'suba rathriyak', 'good night', 'සුබ රාත්‍රියක්', 'සුභ රාත්‍රියක්', 'இரவு வணக்கம்'],
si: 'සුබ රාත්‍රියක්',
en: 'Good Night',
ta: 'இரவு வணக்கம்',
},
{
matchers: ['hello', 'hi', 'hey', 'haloo', 'halo', 'හලෝ', 'හායි', 'வணக்கம்'],
si: 'හලෝ! ඔබට ආයුබෝවන්.',
en: 'Hello! Welcome.',
ta: 'வணக்கம்! நல்வரவு.',
},
{
matchers: ['ayubowan', 'aayubowan', 'ආයුබෝවන්'],
si: 'ආයුබෝවන්!',
en: 'Greetings! (Ayubowan)',
ta: 'வணக்கம்!',
},
{
matchers: ['kohomada', 'kohomadha', 'oya kohomada', 'kohomada oya', 'කොහොමද', 'ඔබට කොහොමද', 'எப்படி இருக்கிறீர்கள்'],
si: 'කොහොමද? සුවෙන් ඉන්නවාද?',
en: 'How are you? Hope you are doing well.',
ta: 'எப்படி இருக்கிறீர்கள்? நலமாக இருக்கிறீர்களா?',
},
{
matchers: [
'mata help ekak ona',
'mata help ona',
'mata udawwak ona',
'mata udaw ona',
'mata udawwak one',
'help ekak ona',
'මට උදව්වක් ඕන',
'මට උදව්වක් අවශ්‍යයි',
'මට සහයක් අවශ්‍යයි',
'எனக்கு உதவி தேவை',
],
si: 'මට උදව්වක් / සහයක් අවශ්‍යයි.',
en: 'I need some help / assistance.',
ta: 'எனக்கு உதவி தேவைப்படுகிறது.',
},
{
matchers: [
'karanna puluwanda',
'meka karanna puluwanda',
'oyaata karanna puluwanda',
'oyata puluwanda',
'karala denna puluwanda',
'මේක කරන්න පුළුවන්ද',
'කරන්න පුලුවන්ද',
'කරලා දෙන්න පුළුවන්ද',
'இதை செய்ய முடியுமா',
],
si: 'මේක කරලා දෙන්න පුළුවන්ද?',
en: 'Can you help do this for me?',
ta: 'இதை செய்து தர முடியுமா?',
},
{
matchers: [
'mama help karannam',
'mama udaw karannam',
'mama karala dennam',
'mama karannam',
'මම කරලා දෙන්නම්',
'මම උදව් කරන්නම්',
'මම සහය දෙන්නම්',
'நான் உதவி செய்கிறேன்',
],
si: 'මම උදව් කරලා දෙන්නම්.',
en: 'I will help you do this.',
ta: 'நான் உங்களுக்கு உதவி செய்கிறேன்.',
},
{
matchers: [
'oya koheda inne',
'oyala koheda inne',
'koheda inne',
'oya inne koheda',
'location eka koheda',
'ඔබ කොහේද ඉන්නේ',
'කොහෙද ඉන්නේ',
'ඔයා ඉන්නේ කොහෙද',
'நீங்கள் எங்கே இருக்கிறீர்கள்',
],
si: 'ඔබ සිටින්නේ කොහේද?',
en: 'Where are you located right now?',
ta: 'நீங்கள் எங்கே இருக்கிறீர்கள்?',
},
{
matchers: [
'location eka ewanna',
'location ewanna',
'address eka ewanna',
'address ewanna',
'ලිපිනය එවන්න',
'ස්ථානය එවන්න',
'ලොකේෂන් එවන්න',
'முகவரியை அனுப்பவும்',
],
si: 'කරුණාකර ඔබගේ ස්ථානය හෝ ලිපිනය එවන්න.',
en: 'Please send your location or address.',
ta: 'தயவுசெய்து உங்கள் இடம் அல்லது முகவரியை அனுப்பவும்.',
},
{
matchers: [
'mama ennam',
'mama enawa',
'mama dan ennam',
'mama dan enawa',
'මම එන්නම්',
'මම දැන් එන්නම්',
'මම එනවා',
'நான் வருகிறேன்',
'நான் இப்போது வருகிறேன்',
],
si: 'මම දැන් එන්නම්.',
en: 'I will come right now.',
ta: 'நான் இப்போது வருகிறேன்.',
},
{
matchers: [
'mama pare enne',
'mama pare',
'mama on the way',
'on the way',
'මම පාරේ එන්නේ',
'මම පාරේ එනවා',
'මම එන ගමන් ඉන්නේ',
'நான் வழியில் வருகிறேன்',
],
si: 'මම පාරේ එන ගමන් ඉන්නේ.',
en: 'I am on the way right now.',
ta: 'நான் வழியில் வந்து கொண்டிருக்கிறேன்.',
},
{
matchers: [
'mama awa',
'mama lagatama awa',
'mama methana inne',
'mama lagai',
'මම ආවා',
'මම ළඟටම ආවා',
'මම මෙතන ඉන්නේ',
'நான் வந்துவிட்டேன்',
'நான் அருகில் இருக்கிறேன்',
],
si: 'මම ළඟටම ආවා / මෙතන ඉන්නේ.',
en: 'I have arrived / I am right here nearby.',
ta: 'நான் அருகில் வந்துவிட்டேன் / இங்கே இருக்கிறேன்.',
},
{
matchers: [
'keeyada ganana',
'ganana keeyada',
'price eka keeyada',
'mula keeyada',
'keeyak weida',
'cost eka keeyada',
'ගාන කීයද',
'මිල කීයද',
'ගාස්තුව කීයද',
'ගාණ කීයද',
'கட்டணம் எவ்வளவு',
'விலை எவ்வளவு',
],
si: 'මේ සඳහා ගාස්තුව හෝ මිල කීයද?',
en: 'How much is the fee or charge for this?',
ta: 'இதற்கான கட்டணம் அல்லது விலை எவ்வளவு?',
},
{
matchers: ['hari', 'ela', 'ela machan', 'ok', 'okay', 'all right', 'හරි', 'එළ', 'හොඳයි', 'சரி', 'நல்லது'],
si: 'හරි, ඉතා හොඳයි!',
en: 'Alright, perfect!',
ta: 'சரி, மிக நன்று!',
},
{
matchers: ['ow', 'yes', 'ඔව්', 'ஆம்'],
si: 'ඔව්.',
en: 'Yes.',
ta: 'ஆம்.',
},
{
matchers: ['na', 'naha', 'nehe', 'no', 'නැහැ', 'නෑ', 'இல்லை'],
si: 'නැහැ.',
en: 'No.',
ta: 'இல்லை.',
},
{
matchers: [
'sthuthiyi',
'bohoma sthuthi',
'sthuthi',
'thanks',
'thank you',
'thanks machan',
'ස්තූතියි',
'බොහොම ස්තූතියි',
'நன்றி',
'மிக்க நன்றி',
],
si: 'බොහොම ස්තූතියි ඔබට!',
en: 'Thank you very much!',
ta: 'மிக்க நன்றி!',
},
];

const CHAT_WORD_MAP: any = {
mama: { si: 'මම', en: 'I', ta: 'நான்' },
oya: { si: 'ඔබ', en: 'you', ta: 'நீங்கள்' },
oyage: { si: 'ඔබගේ', en: 'your', ta: 'உங்கள்' },
mage: { si: 'මගේ', en: 'my', ta: 'என்' },
api: { si: 'අපි', en: 'we', ta: 'நாங்கள்' },
ennam: { si: 'එන්නම්', en: 'will come', ta: 'வருவேன்' },
enawa: { si: 'එනවා', en: 'coming', ta: 'வருகிறேன்' },
awa: { si: 'ආවා', en: 'came / arrived', ta: 'வந்தேன்' },
inne: { si: 'ඉන්නේ', en: 'staying / located', ta: 'இருக்கிறேன்' },
karannam: { si: 'කරන්නම්', en: 'will do', ta: 'செய்வேன்' },
karanna: { si: 'කරන්න', en: 'to do', ta: 'செய்ய' },
dennam: { si: 'දෙන්නම්', en: 'will give', ta: 'தருவேன்' },
denna: { si: 'දෙන්න', en: 'please give', ta: 'தாருங்கள்' },
ewanna: { si: 'එවන්න', en: 'please send', ta: 'அனுப்பவும்' },
ona: { si: 'අවශ්‍යයි', en: 'need', ta: 'வேண்டும்' },
one: { si: 'අවශ්‍යයි', en: 'need', ta: 'வேண்டும்' },
puluwan: { si: 'පුළුවන්', en: 'can', ta: 'முடியும்' },
puluwanda: { si: 'පුළුවන්ද?', en: 'can you?', ta: 'முடியுமா?' },
ada: { si: 'අද', en: 'today', ta: 'இன்று' },
dan: { si: 'දැන්', en: 'now', ta: 'இப்போது' },
heta: { si: 'හෙට', en: 'tomorrow', ta: 'நாளை' },
koheda: { si: 'කොහේද', en: 'where', ta: 'எங்கே' },
help: { si: 'උදව්වක්', en: 'help', ta: 'உதவி' },
udaw: { si: 'උදව්', en: 'help', ta: 'உதவி' },
ganana: { si: 'ගාස්තුව', en: 'the fee', ta: 'கட்டணம்' },
keeyada: { si: 'කීයද', en: 'how much', ta: 'எவ்வளவு' },
hari: { si: 'හරි', en: 'okay', ta: 'சரி' },
sthuthi: { si: 'ස්තූතියි', en: 'thanks', ta: 'நன்றி' },
thanks: { si: 'ස්තූතියි', en: 'thanks', ta: 'நன்றி' },
};

export function detectLanguageOfText(text: string): string {
if (!text ? true : text.trim() === '') return 'en';
const clean = text.trim();
if (/[඀-෿]/.test(clean)) {
return 'si';
}
if (/[஀-௿]/.test(clean)) {
return 'ta';
}
const lower = clean.toLowerCase();
const singlishTokens = [
'subha', 'suba', 'udasanak', 'udesanak', 'rathriyak',
'mama', 'oya', 'oyage', 'mage', 'inne', 'karanna', 'puluwan', 'puluwanda',
'baha', 'enna', 'ennam', 'enawa', 'awa', 'giya', 'ona', 'one', 'meka', 'eka',
'koheda', 'monawada', 'mokakda', 'hari', 'ela', 'machan', 'sthuthi', 'ganana',
'keeyada', 'lagata', 'lagatama', 'pare', 'dan', 'heta', 'ada', 'dennam',
'denna', 'karanawa', 'balanna', 'kiyanna', 'ewanna', 'ewannam', 'kohomada', 'udaw'
];
const words = lower.split(/[^a-z0-9]+/).filter(Boolean);
const singlishMatches = words.filter(function(w) { return singlishTokens.includes(w); });
if (singlishMatches.length !== 0) {
return 'singlish';
}
return 'en';
}

export function translateChatMessage(
text: string,
targetLang: Language,
sourceLangHint?: Language
): { translatedText: string; detectedLang: string } {
if (!text ? true : text.trim() === '') {
return { translatedText: '', detectedLang: 'en' };
}
const clean = text.trim();
const detected = detectLanguageOfText(clean);

const lower = clean.toLowerCase().replace(/[?!.,;:_!]/g, '').trim();

for (const item of CHAT_EXACT_PHRASES) {
if (
item.matchers.some(function(m) {
return m.toLowerCase() === lower ? true : clean.toLowerCase() === m.toLowerCase();
})
) {
return {
translatedText: (item as any)[targetLang] ? (item as any)[targetLang] : item.en,
detectedLang: detected,
};
}
}

if (detected === targetLang) {
return { translatedText: clean, detectedLang: detected };
}

for (const item of CHAT_EXACT_PHRASES) {
if (item.matchers.some(function(m) { return lower.includes(m.toLowerCase()); })) {
return {
translatedText: (item as any)[targetLang] ? (item as any)[targetLang] : item.en,
detectedLang: detected,
};
}
}

const tokens = clean.split(/(\s+)/);
let hasTranslatedAny = false;

const translatedTokens = tokens.map(function(token) {
const trimmed = token.trim().replace(/[.,?!;:_]/g, '');
if (!trimmed) return token;
const tokenLower = trimmed.toLowerCase();
const mapped = CHAT_WORD_MAP[tokenLower];
if (mapped && mapped[targetLang]) {
hasTranslatedAny = true;
return mapped[targetLang];
}
for (const entry of Object.values(CHAT_WORD_MAP) as any[]) {
if (entry.si === trimmed ? true : entry.en && entry.en.toLowerCase() === tokenLower ? true : entry.ta === trimmed) {
hasTranslatedAny = true;
return entry[targetLang];
}
}
return token;
});

if (hasTranslatedAny) {
return {
translatedText: translatedTokens.join(''),
detectedLang: detected,
};
}

return {
translatedText: clean,
detectedLang: detected,
};
}

export function getChatTranslations(
text: string,
senderLang: Language = 'si'
): { si: string; en: string; ta: string; detectedLang: string } {
const detected = detectLanguageOfText(text);
const siTrans = translateChatMessage(text, 'si', senderLang).translatedText;
const enTrans = translateChatMessage(text, 'en', senderLang).translatedText;
const taTrans = translateChatMessage(text, 'ta', senderLang).translatedText;

return {
si: siTrans ? siTrans : text,
en: enTrans ? enTrans : text,
ta: taTrans ? taTrans : text,
detectedLang: detected,
};
}

export async function getChatTranslationsAsync(
text: string,
senderLang: Language = 'si'
) {
const base = getChatTranslations(text, senderLang);
const clean = text ? text.trim() : '';
if (!clean) return base;

const results = await Promise.all([
base.si !== clean ? Promise.resolve(base.si) : translateWithGoogle(clean, 'si'),
base.en !== clean ? Promise.resolve(base.en) : translateWithGoogle(clean, 'en'),
base.ta !== clean ? Promise.resolve(base.ta) : translateWithGoogle(clean, 'ta'),
]);

return {
si: results[0] ? results[0] : base.si,
en: results[1] ? results[1] : base.en,
ta: results[2] ? results[2] : base.ta,
detectedLang: base.detectedLang,
};
}

export function getLanguageDisplayInfo(lang?: string): { name: string; nativeName: string; flag: string; badge: string } {
if (lang === 'en') {
return { name: 'English', nativeName: 'English', flag: '🇬🇧', badge: 'English 🇬🇧' };
}
if (lang === 'ta') {
return { name: 'Tamil', nativeName: 'தமிழ்', flag: '🇱🇰', badge: 'தமிழ் 🇱🇰' };
}
return { name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰', badge: 'සිංහල 🇱🇰' };
}
