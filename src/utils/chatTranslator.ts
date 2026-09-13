import { Language } from '../types';

/**
 * Robust Sinhala / Singlish / English / Tamil Real-Time Chat Translation Engine
 */

export interface ChatTranslationResult {
  originalText: string;
  detectedLang: 'si' | 'singlish' | 'en' | 'ta';
  translations: {
    si: string;
    en: string;
    ta: string;
  };
}

// 1. EXACT PHRASE DICTIONARY (Singlish, Sinhala, English, Tamil)
const CHAT_EXACT_PHRASES: Array<{
  matchers: string[];
  si: string;
  en: string;
  ta: string;
}> = [
  // Greetings & Basics
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
    matchers: ['subha udasanak', 'good morning', 'සුබ උදෑසනක්', 'காலை வணக்கம்'],
    si: 'සුබ උදෑසනක්!',
    en: 'Good morning!',
    ta: 'காலை வணக்கம்!',
  },
  {
    matchers: ['subha rathriyak', 'good night', 'සුබ රාත්‍රියක්', 'இரவு வணக்கம்'],
    si: 'සුබ රාත්‍රියක්!',
    en: 'Good night!',
    ta: 'இரவு வணக்கம்!',
  },

  // Assistance & Inquiries
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

  // On the Way & Arrival
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
      'ada enna puluwanda',
      'ada puluwanda',
      'අද එන්න පුළුවන්ද',
      'අද පුලුවන්ද',
      'இன்று வர முடியுமா',
    ],
    si: 'අද දිනයේ පැමිණීමට පුළුවන්ද?',
    en: 'Can you come today?',
    ta: 'இன்று வர முடியுமா?',
  },
  {
    matchers: [
      'dan puluwanda',
      'danma puluwanda',
      'දැන් පුළුවන්ද',
      'දැන්ම පුලුවන්ද',
      'இப்போதே முடியுமா',
    ],
    si: 'දැන්ම මේ සඳහා පුළුවන්ද?',
    en: 'Can you do this right now?',
    ta: 'இப்போதே செய்ய முடியுமா?',
  },
  {
    matchers: [
      'heta ennam',
      'heta puluwanda',
      'heta udeta ennam',
      'හෙට එන්නම්',
      'හෙට උදේට එන්නම්',
      'හෙට පුලුවන්ද',
      'நாளை வருகிறேன்',
      'நாளை முடியுமா',
    ],
    si: 'හෙට දිනයේ පැමිණෙන්නම්.',
    en: 'I will come tomorrow.',
    ta: 'நான் நாளை வருகிறேன்.',
  },

  // Pricing & Payment
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
    matchers: [
      'kamak na hari',
      'ekagatahai',
      'ganana hari',
      'mama ekagai',
      'ගාන හරි',
      'මම එකඟයි',
      'එකඟයි',
      'சரி நான் சம்மதிக்கிறேன்',
    ],
    si: 'ගාස්තුව හරි, මම එකඟයි.',
    en: 'The fee is fine, I agree with it.',
    ta: 'கட்டணம் சரி, நான் சம்மதிக்கிறேன்.',
  },
  {
    matchers: [
      'cash dennam',
      'athe mudalin dennam',
      'mudalin gewannam',
      'අතේ මුදලින් දෙන්නම්',
      'මුදලින් ගෙවන්නම්',
      'பணமாக செலுத்துகிறேன்',
    ],
    si: 'අතේ මුදලින් ගෙවන්නම්.',
    en: 'I will pay in cash on the spot.',
    ta: 'நேரில் பணமாக செலுத்துகிறேன்.',
  },

  // Confirmations & Agreement
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
  {
    matchers: [
      'welcome',
      'you are welcome',
      'karunawen piliwelath',
      'සාදරයෙන් පිළිගනිමු',
      'வரவேற்கிறோம்',
    ],
    si: 'සාදරයෙන් පිළිගනිමි!',
    en: "You're welcome!",
    ta: 'மகிழ்ச்சியுடன் வரவேற்கிறேன்!',
  },

  // Communication & Phone / WhatsApp
  {
    matchers: [
      'call ekak ganna',
      'call ekak denna',
      'call karanna',
      'ඇමතුමක් ගන්න',
      'කෝල් කරන්න',
      'කෝල් එකක් ගන්න',
      'அழைப்பு எடுக்கவும்',
    ],
    si: 'කරුණාකර ඇමතුමක් ලබාගන්න.',
    en: 'Please give me a call.',
    ta: 'தயவுசெய்து ஒரு அழைப்பு எடுக்கவும்.',
  },
  {
    matchers: [
      'phone number eka denna',
      'number eka denna',
      'දුරකථන අංකය දෙන්න',
      'නම්බර් එක දෙන්න',
      'தொலைபேசி எண் தரவும்',
    ],
    si: 'සහය තහවුරු කළ පසු දුරකථන අංකය හුවමාරු කරගත හැක.',
    en: 'Phone numbers will be revealed upon confirmation.',
    ta: 'உறுதிப்படுத்திய பின் தொலைபேசி எண் பகிரப்படும்.',
  },
  {
    matchers: [
      'confirm karanna',
      'confirm karala denna',
      'තහවුරු කරන්න',
      'කන්ෆර්ම් කරන්න',
      'உறுதிப்படுத்தவும்',
    ],
    si: 'කරුණාකර ඉහළ Confirm බොත්තම ඔබා තහවුරු කරන්න.',
    en: 'Please click the Confirm button at the top to confirm.',
    ta: 'தயவுசெய்து மேலே உள்ள Confirm பொத்தானை அழுத்தி உறுதிப்படுத்தவும்.',
  },
];

// 2. CONVERSATIONAL LEXICON FOR TOKENIZED TRANSLATION
const CHAT_WORD_MAP: Record<string, { si: string; en: string; ta: string }> = {
  // Pronouns
  mama: { si: 'මම', en: 'I', ta: 'நான்' },
  oya: { si: 'ඔබ', en: 'you', ta: 'நீங்கள்' },
  oyage: { si: 'ඔබගේ', en: 'your', ta: 'உங்கள்' },
  mage: { si: 'මගේ', en: 'my', ta: 'என்' },
  api: { si: 'අපි', en: 'we', ta: 'நாங்கள்' },
  eyala: { si: 'ඔවුන්', en: 'they', ta: 'அவர்கள்' },

  // Verbs & States
  ennam: { si: 'එන්නම්', en: 'will come', ta: 'வருவேன்' },
  enawa: { si: 'එනවා', en: 'coming', ta: 'வருகிறேன்' },
  awa: { si: 'ආවා', en: 'came / arrived', ta: 'வந்தேன்' },
  yannam: { si: 'යන්නම්', en: 'will go', ta: 'செல்வேன்' },
  yanawa: { si: 'යනවා', en: 'going', ta: 'செல்கிறேன்' },
  giya: { si: 'ගියා', en: 'went', ta: 'சென்றேன்' },
  inne: { si: 'ඉන්නේ', en: 'staying / located', ta: 'இருக்கிறேன்' },
  inawa: { si: 'ඉන්නවා', en: 'staying / available', ta: 'இருக்கிறேன்' },
  karannam: { si: 'කරන්නම්', en: 'will do', ta: 'செய்வேன்' },
  karanna: { si: 'කරන්න', en: 'to do', ta: 'செய்ய' },
  karala: { si: 'කරලා', en: 'done / after doing', ta: 'செய்து' },
  karanawa: { si: 'කරනවා', en: 'doing', ta: 'செய்கிறேன்' },
  dennam: { si: 'දෙන්නම්', en: 'will give / provide', ta: 'தருவேன்' },
  denna: { si: 'දෙන්න', en: 'please give / provide', ta: 'தாருங்கள்' },
  ewanna: { si: 'එවන්න', en: 'please send', ta: 'அனுப்பவும்' },
  ewannam: { si: 'එවන්නම්', en: 'will send', ta: 'அனுப்புவேன்' },
  balanna: { si: 'බලන්න', en: 'look / check', ta: 'பாருங்கள்' },
  kiyanna: { si: 'කියන්න', en: 'tell / let know', ta: 'சொல்லுங்கள்' },
  ahanna: { si: 'අහන්න', en: 'ask / listen', ta: 'கேளுங்கள்' },
  danna: { si: 'දන්නවා', en: 'know', ta: 'தெரியும்' },
  ganna: { si: 'ගන්න', en: 'take / get', ta: 'எடுக்க' },

  // Modals & Needs
  ona: { si: 'අවශ්‍යයි', en: 'need / want', ta: 'வேண்டும்' },
  one: { si: 'අවශ්‍යයි', en: 'need / want', ta: 'வேண்டும்' },
  puluwan: { si: 'පුළුවන්', en: 'can / able', ta: 'முடியும்' },
  puluwanda: { si: 'පුළුවන්ද?', en: 'can you?', ta: 'முடியுமா?' },
  baha: { si: 'බැහැ', en: 'cannot / unable', ta: 'முடியாது' },
  ba: { si: 'බැහැ', en: 'cannot', ta: 'முடியாது' },
  thiyenawa: { si: 'තියෙනවා', en: 'have / there is', ta: 'இருக்கிறது' },
  naha: { si: 'නැහැ', en: 'do not have / no', ta: 'இல்லை' },
  na: { si: 'නැහැ', en: 'no / not', ta: 'இல்லை' },

  // Time & Location
  ada: { si: 'අද', en: 'today', ta: 'இன்று' },
  dan: { si: 'දැන්', en: 'now', ta: 'இப்போது' },
  heta: { si: 'හෙට', en: 'tomorrow', ta: 'நாளை' },
  udeta: { si: 'උදෑසනට', en: 'in the morning', ta: 'காலையில்' },
  hawasata: { si: 'සවසට', en: 'in the evening', ta: 'மாலையில்' },
  reeta: { si: 'රාත්‍රියට', en: 'at night', ta: 'இரவில்' },
  lagai: { si: 'ළඟයි', en: 'nearby', ta: 'அருகில்' },
  lagatama: { si: 'ළඟටම', en: 'right nearby', ta: 'மிக அருகில்' },
  methana: { si: 'මෙතන', en: 'here', ta: 'இங்கே' },
  ethana: { si: 'එතන', en: 'there', ta: 'அங்கே' },
  koheda: { si: 'කොහේද', en: 'where', ta: 'எங்கே' },
  pare: { si: 'පාරේ', en: 'on the road', ta: 'வழியில்' },
  gedara: { si: 'නිවසේ', en: 'at home', ta: 'வீட்டில்' },

  // Objects & Terms
  help: { si: 'උදව්වක්', en: 'help', ta: 'உதவி' },
  udaw: { si: 'උදව්', en: 'help', ta: 'உதவி' },
  udawwak: { si: 'උදව්වක්', en: 'a help', ta: 'ஒரு உதவி' },
  meka: { si: 'මේක', en: 'this', ta: 'இது' },
  eka: { si: 'එක', en: 'that / one', ta: 'அது' },
  ganana: { si: 'ගාස්තුව / මුදල', en: 'the amount / fee', ta: 'கட்டணம்' },
  keeyada: { si: 'කීයද', en: 'how much', ta: 'எவ்வளவு' },
  welaawa: { si: 'වේලාව', en: 'time', ta: 'நேரம்' },
  time: { si: 'වේලාව', en: 'time', ta: 'நேரம்' },
  location: { si: 'ස්ථානය', en: 'location', ta: 'இடம்' },
  address: { si: 'ලිපිනය', en: 'address', ta: 'முகவரி' },
  call: { si: 'ඇමතුම', en: 'call', ta: 'அழைப்பு' },
  msg: { si: 'පණිවිඩය', en: 'message', ta: 'செய்தி' },
  message: { si: 'පණිවිඩය', en: 'message', ta: 'செய்தி' },
  hari: { si: 'හරි', en: 'okay / correct', ta: 'சரி' },
  ela: { si: 'ඉතා හොඳයි', en: 'great / cool', ta: 'சிறந்தது' },
  machan: { si: 'මිත්‍රයා', en: 'friend', ta: 'நண்பா' },
  sthuthi: { si: 'ස්තූතියි', en: 'thanks', ta: 'நன்றி' },
  thanks: { si: 'ස්තූතියි', en: 'thanks', ta: 'நன்றி' },
  thank: { si: 'ස්තූතියි', en: 'thanks', ta: 'நன்றி' },
};

// 3. REGEX PATTERNS FOR DYNAMIC PHRASES
const CHAT_REGEX_RULES: Array<{
  pattern: RegExp;
  replace: (match: string, p1: string, targetLang: Language) => string;
}> = [
  // Minute arrival: "mama winadi 10 kin ennam" / "මම විනාඩි 10 කින් එන්නම්"
  {
    pattern: /(?:mama|මම)?\s*(?:winadi|min|minutes|විනාඩි)\s*(\d+)\s*(?:kin|කින්)?\s*(?:ennam|enawa|එන්නම්|එනවා)/i,
    replace: (_, mins, targetLang) => {
      if (targetLang === 'en') return `I will arrive in about ${mins} minutes.`;
      if (targetLang === 'ta') return `நான் சுமார் ${mins} நிமிடங்களில் வருகிறேன்.`;
      return `මම විනාඩි ${mins} කින් පැමිණෙන්නම්.`;
    },
  },
  // Price offer: "Rs 2000 dennam" / "රු 2000 ක් ගෙවන්නම්"
  {
    pattern: /(?:rs\.?|lkr|රු\.?|රුපියල්)?\s*(\d+[\d,]*)\s*(?:k|ක්)?\s*(?:dennam|gewannam|දෙන්නම්|ගෙවන්නම්)/i,
    replace: (_, amt, targetLang) => {
      if (targetLang === 'en') return `I will pay Rs. ${amt}.`;
      if (targetLang === 'ta') return `நான் ரூ. ${amt} செலுத்துகிறேன்.`;
      return `මම රු. ${amt} ක් ගෙවන්නම්.`;
    },
  },
  // Time announcement: "3.30 ta ennam" / "3:30 ට එන්නම්"
  {
    pattern: /(\d{1,2}[:.]\d{2})\s*(?:ta|ට)\s*(?:ennam|enawa|එන්නම්|එනවා)/i,
    replace: (_, time, targetLang) => {
      if (targetLang === 'en') return `I will be there at ${time}.`;
      if (targetLang === 'ta') return `நான் ${time} மணிக்கு வருகிறேன்.`;
      return `මම ${time} ට පැමිණෙන්නම්.`;
    },
  },
];

/**
 * Detect script / format of text
 */
export function detectLanguageOfText(text: string): 'si' | 'singlish' | 'en' | 'ta' {
  if (!text || text.trim() === '') return 'en';
  const clean = text.trim();

  // 1. Sinhala Unicode Range: \u0D80-\u0DFF
  if (/[\u0D80-\u0DFF]/.test(clean)) {
    return 'si';
  }

  // 2. Tamil Unicode Range: \u0B80-\u0BFF
  if (/[\u0B80-\u0BFF]/.test(clean)) {
    return 'ta';
  }

  // 3. Check for Singlish keywords in Latin alphabet
  const lower = clean.toLowerCase();
  const singlishTokens = [
    'mama', 'oya', 'oyage', 'mage', 'inne', 'karanna', 'puluwan', 'puluwanda',
    'baha', 'enna', 'ennam', 'enawa', 'awa', 'giya', 'ona', 'one', 'meka', 'eka',
    'koheda', 'monawada', 'mokakda', 'hari', 'ela', 'machan', 'sthuthi', 'ganana',
    'keeyada', 'lagata', 'lagatama', 'pare', 'dan', 'heta', 'ada', 'dennam',
    'denna', 'karanawa', 'balanna', 'kiyanna', 'ewanna', 'ewannam', 'ewala',
    'danna', 'ganna', 'thiyenawa', 'naha', 'na', 'kohomada', 'udaw', 'udawwak',
    'udeta', 'hawasata', 'reeta', 'methana', 'ethana'
  ];

  const words = lower.split(/[\s,?.!;:_\-]+/).filter(Boolean);
  const singlishMatches = words.filter((w) => singlishTokens.includes(w));

  if (singlishMatches.length > 0 || (words.length <= 3 && singlishTokens.some((st) => lower.includes(st)))) {
    return 'singlish';
  }

  return 'en';
}

/**
 * Translate a chat message text into target language
 */
export function translateChatMessage(
  text: string,
  targetLang: Language,
  sourceLangHint?: Language
): { translatedText: string; detectedLang: 'si' | 'singlish' | 'en' | 'ta' } {
  if (!text || text.trim() === '') {
    return { translatedText: '', detectedLang: 'en' };
  }

  const clean = text.trim();
  const detected = detectLanguageOfText(clean);
  const normalizedSource = detected === 'singlish' ? 'si' : detected;

  // If already in target language and not Singlish, return as-is
  if (detected === targetLang) {
    return { translatedText: clean, detectedLang: detected };
  }

  const lower = clean.toLowerCase().replace(/[?!.,;:_]/g, '').trim();

  // 1. Check Exact Matchers
  for (const item of CHAT_EXACT_PHRASES) {
    if (
      item.matchers.some(
        (m) =>
          m.toLowerCase() === lower ||
          clean.toLowerCase() === m.toLowerCase() ||
          clean.includes(m)
      )
    ) {
      return {
        translatedText: item[targetLang] || item.en,
        detectedLang: detected,
      };
    }
  }

  // 2. Check Dynamic Regex Rules
  for (const rule of CHAT_REGEX_RULES) {
    if (rule.pattern.test(clean)) {
      const translated = clean.replace(rule.pattern, (m, p1) => rule.replace(m, p1, targetLang));
      return {
        translatedText: translated,
        detectedLang: detected,
      };
    }
  }

  // 3. Token-by-token Translation for Singlish / Sinhala / English
  const tokens = clean.split(/(\s+|[,.?!;:])/);
  let hasTranslatedAny = false;

  const translatedTokens = tokens.map((token) => {
    const trimmed = token.trim();
    if (!trimmed || /^[.,?!;:_]+$/.test(trimmed)) return token;

    const tokenLower = trimmed.toLowerCase();
    const mapped = CHAT_WORD_MAP[tokenLower];

    if (mapped && mapped[targetLang]) {
      hasTranslatedAny = true;
      return mapped[targetLang];
    }

    // Check Sinhala unicode keys in CHAT_WORD_MAP values
    for (const entry of Object.values(CHAT_WORD_MAP)) {
      if (entry.si === trimmed || entry.en.toLowerCase() === tokenLower || entry.ta === trimmed) {
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

  // Default fallback if unknown custom term
  return {
    translatedText: clean,
    detectedLang: detected,
  };
}

/**
 * Generate all 3 translations for a chat message
 */
export function getChatTranslations(
  text: string,
  senderLang: Language = 'si'
): { si: string; en: string; ta: string; detectedLang: string } {
  const detected = detectLanguageOfText(text);

  const siTrans = translateChatMessage(text, 'si', senderLang).translatedText;
  const enTrans = translateChatMessage(text, 'en', senderLang).translatedText;
  const taTrans = translateChatMessage(text, 'ta', senderLang).translatedText;

  return {
    si: siTrans || text,
    en: enTrans || text,
    ta: taTrans || text,
    detectedLang: detected,
  };
}

/**
 * Language flag and display badge
 */
export function getLanguageDisplayInfo(lang: Language): { name: string; nativeName: string; flag: string; badge: string } {
  switch (lang) {
    case 'en':
      return { name: 'English', nativeName: 'English', flag: '🇬🇧', badge: 'English 🇬🇧' };
    case 'ta':
      return { name: 'Tamil', nativeName: 'தமிழ்', flag: '🇱🇰', badge: 'தமிழ் 🇱🇰' };
    case 'si':
    default:
      return { name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰', badge: 'සිංහල 🇱🇰' };
  }
}
