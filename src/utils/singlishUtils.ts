/**
 * Singlish (Phonetic English) to Sinhala Converter and Search Enhancer
 * Converts romanized Sinhala text (e.g. "haal", "beheth", "wathura", "kama")
 * into Sinhala Unicode scripts to empower cross-language smart search.
 */

// Common direct dictionary for Sri Lankan words and colloquial spellings
const COMMON_SINGLISH_MAP: Record<string, string[]> = {
  // Food & Essentials
  haal: ['හාල්', 'සහල්'],
  hal: ['හාල්', 'සහල්'],
  sahal: ['සහල්', 'හාල්'],
  sahall: ['සහල්', 'හාල්'],
  bath: ['බත්', 'ආහාර'],
  bathkade: ['බත් කඩේ', 'ආහාර'],
  kama: ['කෑම', 'ආහාර'],
  kaama: ['කෑම', 'ආහාර'],
  aahara: ['ආහාර', 'කෑම'],
  aharam: ['ආහාර', 'කෑම'],
  elawalu: ['එළවළු', 'එළවලු'],
  elavalu: ['එළවළු', 'එළවලු'],
  palathuru: ['පලතුරු', 'පළතුරු'],
  maalu: ['මාළු', 'මසුන්'],
  malu: ['මාළු', 'මසුන්'],
  kukulmas: ['කුකුල් මස්', 'මස්'],
  mas: ['මස්', 'කුකුල් මස්'],
  pol: ['පොල්', 'පොල්තෙල්'],
  the: ['තේ', 'තේ කොළ'],
  thekola: ['තේ කොළ', 'තේ'],
  kopi: ['කෝපි'],
  kiri: ['කිරි', 'කිරිපිටි'],
  kiripiti: ['කිරිපිටි', 'කිරි'],
  seeni: ['සීනි'],
  sini: ['සීනි'],
  lunu: ['ලුණු'],
  miris: ['මිරිස්'],
  paan: ['පාන්', 'බේකරි'],
  pan: ['පාන්'],
  bakery: ['බේකරි', 'පාන්'],
  wathura: ['වතුර', 'ජලය'],
  vathura: ['වතුර', 'ජලය'],
  jalaya: ['ජලය', 'වතුර'],

  // Medicine & Health
  beheth: ['බෙහෙත්', 'ඖෂධ'],
  behet: ['බෙහෙත්', 'ඖෂධ'],
  ausadha: ['ඖෂධ', 'බෙහෙත්'],
  osadha: ['ඖෂධ', 'බෙහෙත්'],
  pharmacy: ['ෆාමසි', 'ඖෂධසැල'],
  doktar: ['දොස්තර', 'වෛද්‍ය'],
  dosthara: ['දොස්තර', 'වෛද්‍ය'],
  doctor: ['දොස්තර', 'වෛද්‍ය'],
  rohal: ['රෝහල', 'රෝහල්'],
  hospital: ['රෝහල', 'රෝහල්'],
  le: ['ලේ', 'රුධිරය'],
  blood: ['ලේ', 'රුධිරය'],
  rudhiraya: ['රුධිරය', 'ලේ'],

  // Transport & Vehicles
  vahanaya: ['වාහනය', 'වාහන'],
  wahanaya: ['වාහනය', 'වාහන'],
  wahana: ['වාහන', 'වාහනය'],
  bike: ['බයික්', 'යතුරුපැදි'],
  car: ['කාර්', 'මෝටර් රථ'],
  van: ['වෑන්', 'ප්‍රවාහන'],
  lorry: ['ලොරි', 'ට්‍රක්'],
  lori: ['ලොරි', 'ට්‍රක්'],
  threewheel: ['ත්‍රීවීල්', 'ත්‍රී රෝද රථ'],
  tuk: ['ටුක්ටුක්', 'ත්‍රීවීල්'],
  tuktuk: ['ටුක්ටුක්', 'ත්‍රීවීල්'],
  hire: ['හයර්', 'කුලී රථ'],
  taxi: ['ටැක්සි', 'හයර්'],
  driver: ['රියදුරු', 'ඩ්‍රයිවර්'],
  delivery: ['ඩිලිවරි', 'බෙදාහැරීම්'],

  // Professions & Work
  wada: ['වැඩ', 'සේවා'],
  vada: ['වැඩ', 'සේවා'],
  sewa: ['සේවා', 'සේවාවන්'],
  sevawa: ['සේවාව', 'සේවා'],
  job: ['රැකියා', 'ජොබ්'],
  rakiya: ['රැකියා', 'රැකියාවක්'],
  mason: ['මේසන්', 'පෙදරේරු'],
  pedareru: ['පෙදරේරු', 'මේසන්'],
  carpenter: ['වඩු කාර්මික', 'වඩු'],
  wadu: ['වඩු', 'වඩු කාර්මික'],
  plumber: ['ප්ලම්බර්', 'නල කාර්මික'],
  electrician: ['විදුලි කාර්මික', 'වයරින්'],
  wiring: ['වයරින්', 'විදුලි'],
  painter: ['තීන්ත', 'පේන්ටර්'],
  theentha: ['තීන්ත', 'පේන්ටර්'],
  baas: ['බාස්', 'කාර්මික'],
  bass: ['බාස්', 'කාර්මික'],

  // Housing & Real Estate
  gedara: ['ගෙදර', 'නිවස'],
  gedaraa: ['ගෙදර', 'නිවාස'],
  niwasa: ['නිවස', 'නිවාස'],
  geyak: ['ගෙයක්', 'නිවස'],
  kamara: ['කාමර', 'කාමරයක්'],
  kaamara: ['කාමර', 'කාමරයක්'],
  rent: ['කුලියට', 'කුලිය'],
  bodim: ['බෝඩිම්', 'කාමර'],
  idama: ['ඉඩම', 'ඉඩම්'],
  idam: ['ඉඩම්', 'ඉඩම'],

  // Energy & Gas
  gas: ['ගෑස්', 'ලිප් ගෑස්'],
  petrol: ['පෙට්‍රල්', 'ඉන්ධන'],
  diesel: ['ඩීසල්', 'ඉන්ධන'],
  indhana: ['ඉන්ධන', 'පෙට්‍රල්'],
  current: ['කරන්ට්', 'විදුලිය'],
  viduliya: ['විදුලිය', 'කරන්ට්'],

  // Money & Donations
  salli: ['සල්ලි', 'මුදල්'],
  mudal: ['මුදල්', 'සල්ලි'],
  aadhara: ['ආධාර', 'උදව්'],
  udaw: ['උදව්', 'උපකාර'],
  upakara: ['උපකාර', 'උදව්'],

  // Education & Tech
  poth: ['පොත්', 'පොත්පත්'],
  guru: ['ගුරු', 'ගුරුවරු'],
  panthi: ['පන්ති', 'ක්ලාස්'],
  class: ['පන්ති', 'ක්ලාස්'],
  computer: ['පරිගණක', 'කොම්පියුටර්'],
  phone: ['දුරකථන', 'ෆෝන්'],
  mobile: ['දුරකථන', 'ජංගම දුරකථන'],
};

// Character Phonetic Transliteration Rules (Rule-based Sinhala Unicode mapping)
const VOWELS: Record<string, string> = {
  aa: 'ආ',
  a: 'අ',
  ae: 'ඇ',
  aae: 'ඈ',
  ii: 'ඊ',
  i: 'ඉ',
  ee: 'ඒ',
  e: 'එ',
  uu: 'ඌ',
  u: 'උ',
  oo: 'ඕ',
  o: 'ඔ',
  au: 'ඖ',
  ai: 'ඓ',
};

const VOWEL_SIGNS: Record<string, string> = {
  aa: 'ා',
  ae: 'ැ',
  aae: 'ෑ',
  ii: 'ී',
  i: 'ි',
  ee: 'ේ',
  e: 'ෙ',
  uu: 'ූ',
  u: 'ු',
  oo: 'ෝ',
  o: 'ො',
  au: 'ෞ',
  ai: 'ෛ',
  a: '', // Inherent vowel
};

const CONSONANTS: Record<string, string> = {
  ch: 'ච',
  sh: 'ශ',
  th: 'ත',
  dh: 'ධ',
  ph: 'ෆ',
  bh: 'භ',
  kh: 'ඛ',
  gh: 'ඝ',
  jh: 'ඣ',
  nd: 'ඳ',
  ng: 'ං',
  mb: 'ඹ',
  k: 'ක',
  g: 'ග',
  t: 'ට',
  d: 'ඩ',
  n: 'න',
  p: 'ප',
  b: 'බ',
  m: 'ම',
  y: 'ය',
  r: 'ර',
  l: 'ල',
  v: 'ව',
  w: 'ව',
  s: 'ස',
  h: 'හ',
  f: 'ෆ',
  j: 'ජ',
};

/**
 * Phonetically transliterates standard Singlish text to Sinhala unicode letters.
 */
export function convertSinglishToSinhala(input: string): string {
  if (!input || !input.trim()) return '';
  const text = input.toLowerCase().trim();

  // If input already contains Sinhala unicode characters, return as is
  if (/[\u0D80-\u0DFF]/.test(text)) {
    return text;
  }

  // Check direct lookup table first
  if (COMMON_SINGLISH_MAP[text] && COMMON_SINGLISH_MAP[text].length > 0) {
    return COMMON_SINGLISH_MAP[text][0];
  }

  // Rule-based phonetic transliteration engine
  let result = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    // 1. Check double consonants (e.g. 'th', 'sh', 'ch', 'dh', 'ph', 'bh', 'kh', 'gh', 'nd', 'mb')
    let c = '';
    let cLen = 0;
    if (i + 1 < len) {
      const two = text.substring(i, i + 2);
      if (CONSONANTS[two]) {
        c = CONSONANTS[two];
        cLen = 2;
      }
    }
    if (!c && CONSONANTS[text[i]]) {
      c = CONSONANTS[text[i]];
      cLen = 1;
    }

    if (c) {
      i += cLen;
      // Now check following vowel
      let vSign = '';
      let vLen = 0;

      if (i + 2 <= len) {
        const threeV = text.substring(i, i + 3);
        if (VOWEL_SIGNS[threeV] !== undefined) {
          vSign = VOWEL_SIGNS[threeV];
          vLen = 3;
        }
      }

      if (!vLen && i + 1 <= len) {
        const twoV = text.substring(i, i + 2);
        if (VOWEL_SIGNS[twoV] !== undefined) {
          vSign = VOWEL_SIGNS[twoV];
          vLen = 2;
        }
      }

      if (!vLen && i < len) {
        const oneV = text[i];
        if (VOWEL_SIGNS[oneV] !== undefined) {
          vSign = VOWEL_SIGNS[oneV];
          vLen = 1;
        }
      }

      if (vLen > 0) {
        result += c + vSign;
        i += vLen;
      } else {
        // Hal sign (්) if no vowel follows or consonant at word end
        result += c + '්';
      }
      continue;
    }

    // 2. Standalone Vowels at word beginning or after vowels
    let vStand = '';
    let vStandLen = 0;

    if (i + 2 <= len) {
      const threeV = text.substring(i, i + 3);
      if (VOWELS[threeV]) {
        vStand = VOWELS[threeV];
        vStandLen = 3;
      }
    }

    if (!vStand && i + 1 <= len) {
      const twoV = text.substring(i, i + 2);
      if (VOWELS[twoV]) {
        vStand = VOWELS[twoV];
        vStandLen = 2;
      }
    }

    if (!vStand && VOWELS[text[i]]) {
      vStand = VOWELS[text[i]];
      vStandLen = 1;
    }

    if (vStand) {
      result += vStand;
      i += vStandLen;
      continue;
    }

    // 3. Fallback for spaces, numbers, punctuation
    result += text[i];
    i++;
  }

  return result;
}

/**
 * Returns all potential Sinhala keywords for a given search query,
 * resolving both Singlish transliteration and common Sri Lankan colloquial synonyms!
 */
export function getSinglishExpandedKeywords(query: string): string[] {
  if (!query || !query.trim()) return [];
  const qClean = query.toLowerCase().trim();

  const results = new Set<string>();
  results.add(qClean);

  // Check Common Singlish map
  if (COMMON_SINGLISH_MAP[qClean]) {
    for (const word of COMMON_SINGLISH_MAP[qClean]) {
      results.add(word);
    }
  }

  // Also check individual words if multi-word query
  const tokens = qClean.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    for (const tok of tokens) {
      if (COMMON_SINGLISH_MAP[tok]) {
        for (const w of COMMON_SINGLISH_MAP[tok]) {
          results.add(w);
        }
      }
    }
  }

  // Transliterate phonetically
  const sinhalaConverted = convertSinglishToSinhala(qClean);
  if (sinhalaConverted && sinhalaConverted !== qClean) {
    results.add(sinhalaConverted);
  }

  return Array.from(results);
}
