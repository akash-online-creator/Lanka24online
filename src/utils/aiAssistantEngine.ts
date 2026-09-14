import { Language } from '../types';

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

    if (res.ok) {
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
export async function askAssistant(
  userQuery: string,
  userLang: Language,
  history: Array<{ role: 'user' | 'model'; text: string }> = [],
  mode: 'auth' | 'full' = 'full'
): Promise<{ text: string; actions?: AssistantAction[]; quickChips?: string[] }> {
  const clean = userQuery.trim();
  const lower = clean.toLowerCase();

  // If in Auth Mode (Login / Registration / Pending / Issues Screen), strictly provide login/reg guidance
  if (mode === 'auth') {
    return resolveAuthKnowledge(clean, lower, userLang);
  }

  // 1. First try server-side Gemini 3.8 Flash
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: clean,
        language: userLang,
        conversationHistory: history,
        mode: mode,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reply && !data.fallback) {
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

  // 2. High-Fidelity Local Knowledge Engine (covers all 8 app sectors natively in SI, EN, TA)
  return resolveLocalKnowledge(clean, lower, userLang);
}

/**
 * Dedicated Knowledge Engine for Login & Registration Support only (Hides all post/feed information)
 */
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

  // 2. How to register / Registration help
  if (lower.includes('ලියාපදිංචි') || lower.includes('register') || lower.includes('ගිණුමක්') || lower.includes('signup') || lower.includes('sign up') || lower.includes('பதிவு')) {
    if (lang === 'en') {
      return {
        text: '📝 **How to Register a New Account**:\n1. Click the **Register** button.\n2. Enter your Name, User ID (unique username), WhatsApp Phone Number, and District.\n3. Take or upload your Face Photo, NIC Front Photo, and NIC Back Photo clearly.\n4. Set a secure password and submit.\n5. Once verified by our administrators for safety, your account will be activated!',
        actions: [
          { type: 'switch_to_register', label: '📝 Open Registration Form' },
          { type: 'open_issues_help', label: '❓ Help & Support' },
        ],
        quickChips: ['How to take NIC photos?', 'How long does approval take?', 'Password requirements'],
      };
    } else if (lang === 'ta') {
      return {
        text: '📝 **புதிய கணக்கை எவ்வாறு பதிவு செய்வது**:\n1. **பதிவு செய்க** பொத்தானைக் கிளிக் செய்யவும்.\n2. பெயர், பயனர் ஐடி, வாட்ஸ்அப் எண் மற்றும் மாவட்டத்தை உள்ளிடவும்.\n3. உங்கள் முகம், அடையாள அட்டையின் முன்பக்கம் மற்றும் பின்பக்கம் புகைப்படங்களை தெளிவாகப் பதிவேற்றவும்.\n4. கடவுச்சொல்லை அமைத்து சமர்ப்பிக்கவும். நிர்வாகி அனுமதித்தவுடன் கணக்கு செயல்படும்.',
        actions: [
          { type: 'switch_to_register', label: '📝 பதிவு படிவத்தைத் திறக்கவும்' },
          { type: 'open_issues_help', label: '❓ உதவி கோரிக்கை' },
        ],
        quickChips: ['NIC புகைப்படம் எப்படி எடுப்பது?', 'அனுமதி நேரம் எவ்வளவு?'],
      };
    } else {
      return {
        text: '📝 **නව ගිණුමක් ලියාපදිංචි කරගන්නේ කෙසේද?**:\n1. **ලියාපදිංචි වන්න** බොත්තම ඔබන්න.\n2. ඔබගේ නම, කැමති පරිශීලක නාමය (User ID), WhatsApp දුරකථන අංකය, ලිපිනය, දිස්ත්‍රික්කය සහ පොලිස් බලප්‍රදේශය ඇතුළත් කරන්න.\n3. ඔබගේ මුහුණේ ඡායාරූපය, ජාතික හැඳුනුම්පතේ (NIC) ඉදිරිපස සහ පසුපස ඡායාරූප පැහැදිලිව ලබාගන්න.\n4. ආරක්ෂිත මුරපදයක් ඇතුළත් කර Submit කරන්න. පරිපාලක අනුමැතියෙන් පසු ගිණුම සක්‍රිය වේ.',
        actions: [
          { type: 'switch_to_register', label: '📝 ලියාපදිංචි පෝරමයට යන්න' },
          { type: 'open_issues_help', label: '❓ ගැටලු සහ උපකාර' },
        ],
        quickChips: ['NIC ඡායාරූප ගන්නේ කොහොමද?', 'ගිණුම අනුමත වීමට කොපමණ වේලාවක් ගතවේද?', 'මුරපද රීති මොනවාද?'],
      };
    }
  }

  // 3. Taking NIC / Face Photos
  if (lower.includes('nic') || lower.includes('හැඳුනුම්පත') || lower.includes('photo') || lower.includes('ඡායාරූප') || lower.includes('කාඩ්පත') || lower.includes('புகைப்படம்')) {
    if (lang === 'en') {
      return {
        text: '🆔 **Guidance for NIC & Face Photos**:\n• **Face Photo**: Ensure good lighting with your entire face clearly visible directly into the camera.\n• **NIC Front & Back**: Place your ID on a flat dark surface. Ensure all text and numbers are sharp and free from light reflections or blur.\n• Both original and new smart NICs are accepted.',
        actions: [
          { type: 'switch_to_register', label: '📝 Go to Registration' },
        ],
        quickChips: ['Is my data safe?', 'Can I register without NIC?'],
      };
    } else if (lang === 'ta') {
      return {
        text: '🆔 **அடையாள அட்டை (NIC) மற்றும் புகைப்பட வழிகாட்டல்**:\n• **முகப் புகைப்படம்**: நல்ல வெளிச்சத்தில் உங்கள் முகம் தெளிவாகத் தெரிய வேண்டும்.\n• **அடையாள அட்டை**: எண்களும் எழுத்துக்களும் தெளிவாகத் தெரியும்படி நிழல் விழாமல் புகைப்படம் எடுக்கவும்.',
        actions: [
          { type: 'switch_to_register', label: '📝 பதிவுக்குச் செல்லவும்' },
        ],
        quickChips: ['எனது தகவல் பாதுகாப்பானதா?'],
      };
    } else {
      return {
        text: '🆔 **හැඳුනුම්පත් (NIC) සහ මුහුණේ ඡායාරූප ගැනීමේ උපදෙස්**:\n• **මුහුණේ ඡායාරූපය**: හොඳ ආලෝකයක් ඇති ස්ථානයක කෙළින්ම කැමරාව දෙස බලා මුහුණ පැහැදිලිව පෙනෙන සේ ගන්න.\n• **NIC ඉදිරිපස සහ පසුපස**: හැඳුනුම්පත තලයක තබා අකුරු, අංක සහ ඡායාරූපය නොසෙල්වී, ආලෝකය පරාවර්තනය නොවී පැහැදිලිව ලබාගන්න.\n• පැරණි හෝ නව ස්මාර්ට් හැඳුනුම්පත් දෙකම පිළිගැනේ.',
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

  const isBlood = lower.includes('ලේ') || lower.includes('blood') || lower.includes('இரத்தம்') || lower.includes('donor');
  const isQuick = lower.includes('කාර්මික') || lower.includes('electric') || lower.includes('plumb') || lower.includes('quick') || lower.includes('repair') || lower.includes('පැච්') || lower.includes('බාස්');
  const isFind = lower.includes('නැති') || lower.includes('lost') || lower.includes('found') || lower.includes('සොයා') || lower.includes('தொலைந்த') || lower.includes('wallet') || lower.includes('nic');
  const isFromYou = lower.includes('දීමන') || lower.includes('donate') || lower.includes('give') || lower.includes('නොමිලේ') || lower.includes('தானம்') || lower.includes('පොත්');
  const isGroup = lower.includes('ශ්‍රමදාන') || lower.includes('group') || lower.includes('කණ්ඩායම්') || lower.includes('சிரமதானம்');
  const isMarket = lower.includes('මිල') || lower.includes('price') || lower.includes('market') || lower.includes('හාල්') || lower.includes('සීනි') || lower.includes('விலை');
  const isWallet = lower.includes('credit') || lower.includes('wallet') || lower.includes('ණය') || lower.includes('මුදල්') || lower.includes('ශේෂ');

  if (isBlood) {
    actions.push({
      type: 'open_blood',
      label: lang === 'en' ? '🩸 Open Blood & Disaster Hub' : lang === 'ta' ? '🩸 இரத்த தான மையத்தைத் திறக்கவும்' : '🩸 හදිසි ලේ කේන්ද්‍රය විවෘත කරන්න',
    });
    chips.push(lang === 'en' ? 'Find Donors' : lang === 'ta' ? 'தானம் செய்பவர்களைத் தேடுங்கள்' : 'ලේ පරිත්‍යාගශීලීන් සොයන්න');
  }

  if (isQuick) {
    actions.push({
      type: 'open_quick',
      label: lang === 'en' ? '⚡ Open Quick Services' : lang === 'ta' ? '⚡ விரைவு சேவைகளைத் திறக்கவும்' : '⚡ ඉක්මන් සේවා විවෘත කරන්න',
    });
    chips.push(lang === 'en' ? 'Post Quick Service Ad' : lang === 'ta' ? 'விரைவு விளம்பரம் இடுக' : 'ඉක්මන් සේවා දැන්වීමක් පළකරන්න');
  }

  if (isFind) {
    actions.push({
      type: 'open_find',
      label: lang === 'en' ? '🔍 Open Find For Me' : lang === 'ta' ? '🔍 எனக்காகத் தேடுங்கள்' : '🔍 සොයාදෙන්න විවෘත කරන්න',
    });
  }

  if (isFromYou) {
    actions.push({
      type: 'open_from_you',
      label: lang === 'en' ? '🎁 Open From Me To You' : lang === 'ta' ? '🎁 என்னிடமிருந்து உங்களுக்கு' : '🎁 මගෙන් ඔබට (නොමිලේ දීමනා)',
    });
  }

  if (isMarket) {
    actions.push({
      type: 'open_market',
      label: lang === 'en' ? '🛒 Check Lowest Prices' : lang === 'ta' ? '🛒 குறைந்த விலையை சரிபார்க்கவும்' : '🛒 අඩුම මිල ගණන් පරීක්ෂා කරන්න',
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
  // Blood & Disaster
  if (lower.includes('ලේ') || lower.includes('blood') || lower.includes('இரத்தம்') || lower.includes('ආපදා') || lower.includes('disaster')) {
    if (lang === 'en') {
      return {
        text: '🩸 **Emergency Blood & Disaster Relief Center**:\nYou can instantly post emergency blood requirements (e.g. A+, B+, O+, AB+, Platelets) or report urgent disaster needs (floods, landslides, storms). Our radar alert immediately notifies registered volunteer donors within the locality.',
        actions: [
          { type: 'open_blood', label: '🩸 Open Blood & Disaster Hub' },
          { type: 'open_directory', label: '📞 Emergency Helplines (1990/119)' },
        ],
        quickChips: ['Need O+ Blood', 'Register as Donor', 'Flood Relief Request'],
      };
    } else if (lang === 'ta') {
      return {
        text: '🩸 **அவசர இரத்த தானம் மற்றும் பேரழிவு நிவாரண மையம்**:\nஅவசர இரத்தத் தேவைகள் அல்லது வெள்ளம்/மழை பேரழிவு நிவாரணத் தேவைகளை நீங்கள் உடனடியாகப் பதிவு செய்யலாம். அருகிலுள்ள தன்னார்வ இரத்த தானம் செய்பவர்களுக்கு உடனடியாக தகவல் தெரிவிக்கப்படும்.',
        actions: [
          { type: 'open_blood', label: '🩸 இரத்த தான மையத்தைத் திறக்கவும்' },
          { type: 'open_directory', label: '📞 அவசர எண்கள் (1990/119)' },
        ],
        quickChips: ['O+ இரத்தம் தேவை', 'தானம் செய்பவராகப் பதிவு செய்க'],
      };
    } else {
      return {
        text: '🩸 **හදිසි රුධිර සහ ආපදා සහන කේන්ද්‍රය**:\nහදිසි ලේ අවශ්‍යතාවක් (A+, B+, O+, AB+, පට්ටිකා ආදිය) හෝ ගංවතුර/නායයෑම් ආපදා සහන ඉල්ලීමක් පළකිරීමට පහත බොත්තම ඔබන්න. ඔබගේ ප්‍රදේශයේ සිටින ලියාපදිංචි ස්වේච්ඡා ලේ පරිත්‍යාගශීලීන්ට ක්ෂණිකව Alert එකක් නිකුත් කෙරේ.',
        actions: [
          { type: 'open_blood', label: '🩸 හදිසි ලේ කේන්ද්‍රය විවෘත කරන්න' },
          { type: 'open_directory', label: '📞 නොබැඳි හදිසි අංක (1990/119)' },
        ],
        quickChips: ['O+ ලේ අවශ්‍යයි', 'ලේ දන් දෙන්නෙක් ලෙස ලියාපදිංචි වන්න', 'ගංවතුර ආධාර ඉල්ලීම'],
      };
    }
  }

  // Quick Services
  if (lower.includes('කාර්මික') || lower.includes('electric') || lower.includes('plumb') || lower.includes('mechanic') || lower.includes('ඉක්මන්') || lower.includes('quick') || lower.includes('repair')) {
    if (lang === 'en') {
      return {
        text: '⚡ **24/7 Quick Services**:\nFind verified electricians, plumbers, vehicle mechanics, AC technicians, and builders within 15km of your location. You can post an urgent request and receive immediate direct contact and confirmation.',
        actions: [
          { type: 'open_quick', label: '⚡ Post Quick Service Request' },
        ],
        quickChips: ['Electrician (විදුලි)', 'Plumber (නල)', 'Vehicle Breakdown (මෝටර් රථ)'],
      };
    } else if (lang === 'ta') {
      return {
        text: '⚡ **24/7 விரைவு சேவைகள்**:\nமின்சார வல்லுநர்கள், குழாய் பழுதுபார்ப்பவர்கள், வாகன மெக்கானிக் போன்ற சேவைகளை 15 கி.மீ எல்லைக்குள் உடனடியாகப் பெறலாம்.',
        actions: [
          { type: 'open_quick', label: '⚡ விரைவு சேவை கோரிக்கையை இடுக' },
        ],
        quickChips: ['மின்சார வல்லுநர்', 'குழாய் பழுதுபார்ப்பவர்', 'வாகன மெக்கானிக்'],
      };
    } else {
      return {
        text: '⚡ **පැය 24 පුරා ක්‍රියාත්මක ඉක්මන් සේවා**:\nඔබගේ ප්‍රදේශයෙන් (15km ඇතුළත) විදුලි කාර්මිකයන්, ජල නල කාර්මිකයන්, වාහන කාර්මිකයන් හෝ මේසන්වරුන් ක්ෂණිකව සොයාගැනීමට හෝ ඔබගේ අවශ්‍යතාවය දැන්වීමක් ලෙස පළකිරීමට හැකිය.',
        actions: [
          { type: 'open_quick', label: '⚡ ඉක්මන් සේවා දැන්වීමක් පළකරන්න' },
        ],
        quickChips: ['විදුලි කාර්මිකයෙක් අවශ්‍යයි', 'නල කාර්මිකයෙක් අවශ්‍යයි', 'වාහන කාර්මිකයෙක්'],
      };
    }
  }

  // Find For Me
  if (lower.includes('නැති') || lower.includes('lost') || lower.includes('found') || lower.includes('සොයා') || lower.includes('தொலைந்த') || lower.includes('wallet') || lower.includes('nic')) {
    if (lang === 'en') {
      return {
        text: '🔍 **Find For Me (Lost & Found)**:\nLost your wallet, National Identity Card (NIC), driving license, pet, or valuable goods? Post details with photo and optional reward to broadcast nationwide.',
        actions: [{ type: 'open_find', label: '🔍 Open Find For Me Modal' }],
        quickChips: ['Lost Wallet / NIC', 'Lost Pet / Dog', 'Report Found Item'],
      };
    } else if (lang === 'ta') {
      return {
        text: '🔍 **எனக்காகத் தேடுங்கள் (தொலைந்த பொருட்கள்)**:\nஅடையாள அட்டை, பணப்பை அல்லது ஆவணங்கள் தொலைந்துவிட்டால் முழு நாட்டிற்கும் தெரியப்படுத்த விளம்பரம் இடுங்கள்.',
        actions: [{ type: 'open_find', label: '🔍 எனக்காகத் தேடுங்கள்' }],
        quickChips: ['தொலைந்த பணப்பை', 'தொலைந்த அடையாள அட்டை'],
      };
    } else {
      return {
        text: '🔍 **සොයාදෙන්න (නැතිවූ හෝ සොයන දේ)**:\nඔබගේ මුදල් පසුම්බිය, ජාතික හැඳුනුම්පත (NIC), රියදුරු බලපත්‍රය, සුරතල් සතෙකු හෝ වෙනත් වටිනා භාණ්ඩයක් නැතිවී ඇත්නම් හෝ සොයාගැනීමට අවශ්‍ය නම් මෙහි පළකරන්න. අවශ්‍ය නම් ත්‍යාග මුදලක්ද (Reward) සඳහන් කළ හැක.',
        actions: [{ type: 'open_find', label: '🔍 සොයාදෙන්න පිටුව විවෘත කරන්න' }],
        quickChips: ['මුදල් පසුම්බිය / NIC නැතිවුණා', 'සුරතල් සතෙක් නැතිවුණා', 'හමුවූ දෙයක් ගැන දැන්වීමක්'],
      };
    }
  }

  // From Me To You
  if (lower.includes('දීමන') || lower.includes('donate') || lower.includes('give') || lower.includes('නොමිලේ') || lower.includes('தானம்') || lower.includes('පරිත්‍යාග')) {
    if (lang === 'en') {
      return {
        text: '🎁 **From Me To You (Free Donations & Giveaways)**:\nDonate school books, clothes, furniture, wheelchairs, or goods to deserving people in the community completely free of charge.',
        actions: [{ type: 'open_from_you', label: '🎁 Post Free Donation' }],
        quickChips: ['Donate Books', 'Donate Wheelchair / Medicine', 'Free Giveaway'],
      };
    } else if (lang === 'ta') {
      return {
        text: '🎁 **என்னிடமிருந்து உங்களுக்கு (இலவச தானம்)**:\nபுத்தகங்கள், உடைகள் அல்லது வீட்டுப் பொருட்களை தேவையானோருக்கு இலவசமாக வழங்கலாம்.',
        actions: [{ type: 'open_from_you', label: '🎁 இலவச தானத்தை இடுக' }],
        quickChips: ['புத்தகங்கள் தானம்', 'உடைகள் தானம்'],
      };
    } else {
      return {
        text: '🎁 **මගෙන් ඔබට (නොමිලේ දීමනා සහ පරිත්‍යාග)**:\nඔබ ළඟ ඇති අමතර පොත්පත්, ඇඳුම් පැළඳුම්, ගෘහ උපකරණ හෝ රෝද පුටු වැනි ආධාර උපකරණ අවශ්‍යතා ඇති අයට නොමිලේ පරිත්‍යාග කිරීමට හෝ හුවමාරු කරගැනීමට මෙහි පළකරන්න.',
        actions: [{ type: 'open_from_you', label: '🎁 නොමිලේ දීමනාවක් පළකරන්න' }],
        quickChips: ['පොත්පත් පරිත්‍යාගයක්', 'රෝද පුටුවක් පරිත්‍යාගයක්', 'නොමිලේ බෙදාදීමක්'],
      };
    }
  }

  // Marketplace & Lowest Prices
  if (lower.includes('මිල') || lower.includes('price') || lower.includes('market') || lower.includes('හාල්') || lower.includes('සීනි') || lower.includes('වෙළඳපල')) {
    if (lang === 'en') {
      return {
        text: '🛒 **Marketplace & Daily Lowest Commodity Prices**:\nCompare prices for Rice, Sugar, Dhal, Cement, Milk Powder, Vegetables, and Gas from verified shops across Sri Lanka. Find who sells at the lowest prices near you!',
        actions: [{ type: 'open_market', label: '🛒 Check Today\'s Lowest Prices' }],
        quickChips: ['Keeri Samba Rice Price', 'Cement Bag Price', 'Sugar & Dhal Rates'],
      };
    } else if (lang === 'ta') {
      return {
        text: '🛒 **சந்தை மற்றும் குறைந்தபட்ச விலைகள்**:\nஅரிசி, பருப்பு, சர்க்கரை, சிமெண்ட் போன்றவற்றின் இன்றைய குறைந்தபட்ச விலைகளை சரிபார்க்கவும்.',
        actions: [{ type: 'open_market', label: '🛒 குறைந்த விலையை சரிபார்க்கவும்' }],
        quickChips: ['அரிசி விலை', 'சிமெண்ட் விலை'],
      };
    } else {
      return {
        text: '🛒 **වෙළඳපල සහ දවසේ අඩුම මිල ගණන්**:\nකීරි සම්බා, නාඩු සහල්, පරිප්පු, සීනි, සිමෙන්ති, ගෑස් සහ එළවළු සඳහා දිවයින පුරා වෙළඳසැල්වල අඩුම මිල ගණන් පරීක්ෂා කර බලා අඩුම මිලට භාණ්ඩ ලබාගන්න.',
        actions: [{ type: 'open_market', label: '🛒 අද දවසේ අඩුම මිල ගණන් බලන්න' }],
        quickChips: ['කීරි සම්බා සහල් මිල', 'සිමෙන්ති කොට්ටයක මිල', 'සීනි සහ පරිප්පු මිල'],
      };
    }
  }

  // Wallet & Credits
  if (lower.includes('credit') || lower.includes('wallet') || lower.includes('ණය') || lower.includes('මුදල්') || lower.includes('ශේෂ')) {
    if (lang === 'en') {
      return {
        text: '💳 **User Credit Wallet**:\nYou receive 100 free Welcome Credits on registration! Each help post or quick service post utilizes credits based on category. You can easily top up your wallet via bank deposit slips or online cards.',
        actions: [{ type: 'open_wallet', label: '💳 View Wallet & Add Credits' }],
        quickChips: ['How to deposit?', 'What are the posting fees?'],
      };
    } else if (lang === 'ta') {
      return {
        text: '💳 **பயனர் பணப்பை (Wallet & Credits)**:\nபதிவு செய்தவுடன் 100 இலவச வரவுகள் வழங்கப்படும். விளம்பரங்களை இட வரவுகள் தேவைப்படும். வங்கி ரசீது மூலம் வரவுகளைச் சேர்க்கலாம்.',
        actions: [{ type: 'open_wallet', label: '💳 பணப்பையைத் திறக்கவும்' }],
        quickChips: ['வரவுகளைச் சேர்ப்பது எப்படி?'],
      };
    } else {
      return {
        text: '💳 **පරිශීලක Credit Wallet සහ ගිණුම් ශේෂය**:\nලියාපදිංචි වූ වහාම ඔබට නොමිලේ Credits 100 ක පිළිගැනීමේ තෑග්ගක් ලැබේ! දැන්වීම් පළකිරීමේදී කාණ්ඩය අනුව කුඩා Credit මුදලක් අඩු වේ. බැංකු තැන්පතු රිසිට්පතක් upload කර පහසුවෙන්ම Wallet එක Reload කරගත හැක.',
        actions: [{ type: 'open_wallet', label: '💳 Wallet එක විවෘත කර ශේෂය බලන්න' }],
        quickChips: ['ණය මුදල් තැන්පත් කරන්නේ කෙසේද?', 'දැන්වීම් ගාස්තු විස්තර'],
      };
    }
  }

  // General Welcome & Assistance
  if (lang === 'en') {
    return {
      text: '👋 Hello! I am **Sahaya AI Assistant**.\nI support all features across **Sinhala, English, and Tamil**:\n• 🩸 Emergency Blood & Disaster Relief\n• ⚡ 24/7 Quick Services (Electricians, Plumbers, Mechanics)\n• 🔍 Find For Me (Lost & Found)\n• 🎁 From Me To You (Free Donations)\n• 🛒 Daily Lowest Market Prices\n• 🌐 Instant Auto-Translator\n\nHow can I help you today?',
      actions: [
        { type: 'open_blood', label: '🩸 Blood & Disaster' },
        { type: 'open_quick', label: '⚡ Quick Services' },
        { type: 'open_market', label: '🛒 Market Prices' },
      ],
      quickChips: ['Find an Electrician', 'Need Urgent Blood', 'Translate a Message', 'Check Wallet Balance'],
    };
  } else if (lang === 'ta') {
    return {
      text: '👋 வணக்கம்! நான் **சகாய AI உதவியாளர்**.\nசிங்களம், ஆங்கிலம் மற்றும் தமிழ் ஆகிய மூன்று மொழிகளிலும் அனைத்து சேவைகளுக்கும் நான் உங்களுக்கு உதவுகிறேன்:\n• 🩸 அவசர இரத்தம் மற்றும் பேரழிவு நிவாரணம்\n• ⚡ 24/7 விரைவு சேவைகள்\n• 🔍 தொலைந்த பொருட்களைக் கண்டறிதல்\n• 🎁 இலவச தானங்கள்\n• 🛒 அன்றாட குறைந்தபட்ச விலைகள்\n• 🌐 உடனடி மொழிபெயர்ப்பாளர்\n\nஇன்று உங்களுக்கு எவ்வாறு உதவ முடியும்?',
      actions: [
        { type: 'open_blood', label: '🩸 இரத்த தானம்' },
        { type: 'open_quick', label: '⚡ விரைவு சேவைகள்' },
      ],
      quickChips: ['இரத்தம் தேவை', 'மின்சார வல்லுநர் தேவை', 'விலை விபரம்'],
    };
  } else {
    return {
      text: '👋 ආයුබෝවන්! මම ඔබගේ **සහය මිතුරා (Sahaya AI Assistant)**.\nසිංහල, ඉංග්‍රීසි සහ දෙමළ භාෂා ත්‍රිත්වයෙන්ම පද්ධතියේ සියලුම අංශයන් සඳහා මට ඔබට මඟපෙන්විය හැක:\n• 🩸 හදිසි ලේ සහ ආපදා සහන\n• ⚡ 24/7 ඉක්මන් සේවා (විදුලි, නල, වාහන කාර්මිකයන්)\n• 🔍 නැතිවූ දේ සොයාගැනීම (Find For Me)\n• 🎁 නොමිලේ දීමනා සහ පරිත්‍යාග (From Me To You)\n• 🛒 දවසේ වෙළඳපල අඩුම මිල ගණන්\n• 🌐 ක්ෂණික භාෂා ත්‍රිත්ව පරිවර්තනය\n\nඔබට අවශ්‍ය සහය කුමක්ද?',
      actions: [
        { type: 'open_blood', label: '🩸 හදිසි ලේ කේන්ද්‍රය' },
        { type: 'open_quick', label: '⚡ ඉක්මන් සේවා' },
        { type: 'open_market', label: '🛒 වෙළඳපල මිල ගණන්' },
      ],
      quickChips: ['විදුලි කාර්මිකයෙක් සොයන්න', 'හදිසි ලේ අවශ්‍යයි', 'පණිවිඩයක් පරිවර්තනය කරන්න', 'Wallet ශේෂය බලන්න'],
    };
  }
}
