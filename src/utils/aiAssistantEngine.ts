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
  // 1. FORM FILLING GUIDANCE (පෝරම පුරවන ආකාරය - පියවරෙන් පියවර)
  // -------------------------------------------------------------
  const isFormFillingQuery =
    lower.includes('පෝරම') ||
    lower.includes('form') ||
    lower.includes('පුරව') ||
    lower.includes('fill') ||
    lower.includes('ලියන්නේ කොහොමද') ||
    lower.includes('ලියාපදිංචි කරන්නේ') ||
    lower.includes('படிவம்');

  // 1.0 Aid Ledger / Relief Center Registration & Delivery Forms (ආධාර ලෙජරය සහ ස්ථාන ලියාපදිංචිය)
  if (isFormFillingQuery && (lower.includes('ස්ථාන') || lower.includes('center') || lower.includes('ලෙජර') || lower.includes('ledger') || lower.includes('ආධාර සටහන්') || lower.includes('aid') || lower.includes('බෙදාහැරීම'))) {
    if (lang === 'en') {
      return {
        text: `🏢 **How to Register a Center & Log Aid on the Transparent Aid Ledger (Step-by-Step)**:

1. **🏢 Center Registration Form (ස්ථානයක් ලියාපදිංචි කිරීම)**:
   • **Center Name & Type**: Enter the location (e.g. *"Vidyaloka Maha Vidyalaya Relief Camp"*, *"St. Mary's Community Hall"*).
   • **6-Digit Security PIN (අංක 6ක රහස් PIN අංකය)**: Choose a secure 6-digit PIN known only to the center head/Gramasewaka. This is required later to confirm incoming deliveries.
   • **Location**: Choose District, DS Division, GPS location, and sheltered people/family count.
   • **Contact Person**: Verified mobile number of the responsible officer.

2. **🚚 Aid Delivery Logging Form (ආධාර සටහන් කිරීම)**:
   • Select the verified Center ID from the list.
   • Choose Category (Dry Rations, Drinking Water, Cooked Meals, Medicine, Clothes).
   • Enter Quantity & Unit (packs, kg, liters, boxes), Donor Name, and Vehicle Number.
   • Upload 1-2 handover photos as proof.

3. **📥 Aid Recipient Confirmation (ආධාර ලැබීම තහවුරු කිරීම)**:
   • Center officials enter their 6-digit secret PIN to verify and lock the record permanently on the immutable public ledger.`,
        actions: [
          { type: 'open_blood', label: '📊 Open Aid & Disaster Ledger' },
        ],
        quickChips: ['How does 6-digit PIN work?', 'How to confirm aid received?', 'Is the Aid Ledger public?'],
      };
    } else {
      return {
        text: `🏢 **ආධාර සහ සම්පත් විනිවිදභාවයේ ලෙජරයේ පෝරම පුරවන ආකාරය (පියවරෙන් පියවර)**:

1. **🏢 ස්ථානයක් ලියාපදිංචි කිරීමේ පෝරමය (Register Relief Center)**:
   • **ස්ථානයේ නම සහ වර්ගය**: පාසල, පන්සල, පල්ලිය, ප්‍රජා ශාලාව හෝ සහන කඳවුරේ නම ඇතුළත් කරන්න (උදා: *"විද්‍යාලෝක මහා විද්‍යාලයීය සහන කඳවුර"*).
   • **අංක 6ක රහස් PIN අංකය**: ස්ථාන භාරකරුට/ග්‍රාම නිලධාරීට පමණක් හිමි රහස් අංක 6ක් සකසන්න. ආධාර ලැබීම තහවුරු කිරීමට මෙය අත්‍යවශ්‍ය වේ.
   • **ස්ථාන විස්තර**: දිස්ත්‍රික්කය, ප්‍රාදේශීය ලේකම් කොට්ඨාසය, GPS පිහිටීම සහ රැඳී සිටින පවුල්/පුද්ගල ගණන සඳහන් කරන්න.
   • **භාරකරුගේ දුරකථන අංකය**: සත්‍යාපිත දුරකථන අංකයක් ඇතුළත් කරන්න.

2. **🚚 ආධාර ලබාදුන් පසු සටහන් කිරීමේ පෝරමය (Log Delivery)**:
   • ලැයිස්තුවෙන් අදාළ ස්ථානය (Center ID) තෝරන්න.
   • කාණ්ඩය තෝරන්න (වියලි ආහාර, පානීය ජලය, පිසූ ආහාර, බෙහෙත්, ඇඳුම්).
   • ප්‍රමාණය සහ ඒකකය (පැකට්, කිලෝ, ලීටර්, පෙට්ටි), පරිත්‍යාගකරුගේ නම සහ ප්‍රවාහන රථ අංකය ඇතුළත් කරන්න.
   • භාරදුන් අවස්ථාවේ ඡායාරූප 1-2ක් සාක්ෂි ලෙස එක්කරන්න.

3. **📥 ආධාර ලැබීම තහවුරු කිරීම (Recipient Confirmation)**:
   • ස්ථාන භාරකරු විසින් අංක 6ක රහස් PIN අංකය ඇතුළත් කර භාණ්ඩ නිවැරදිව ලැබුණු බව තහවුරු කරයි. ඉන්පසු එම සටහන පොදු ලෙජරයේ ස්ථිරව සටහන් වේ.`,
        actions: [
          { type: 'open_blood', label: '📊 විනිවිදභාවයේ ලෙජරය විවෘත කරන්න' },
        ],
        quickChips: ['අංක 6ක PIN එක ක්‍රියාකරන්නේ කොහොමද?', 'ආධාර ලැබීම තහවුරු කරන්නේ කෙසේද?', 'පොදු ලෙජරය යනු කුමක්ද?'],
      };
    }
  }

  // 1.1 Help Post Request Form (උපකාර ඉල්ලුම් පෝරමය)
  if (isFormFillingQuery && (lower.includes('උපකාර') || lower.includes('help') || lower.includes('දැන්වීම') || lower.includes('post') || lower.includes('request'))) {
    if (lang === 'en') {
      return {
        text: `📝 **How to Fill the Community Help Request Form (Step-by-Step)**:

1. **Title (මාතෘකාව)**:
   • Write a short, clear headline. (e.g. *"Urgent electric circuit breakdown in home - need electrician"*).
2. **Category (කාණ්ඩය)**:
   • Select the category matching your need: Electricity, Plumbing, Medical, Transport, Education, Masonry, etc.
3. **Description (සම්පූර්ණ විස්තරය)**:
   • Explain the exact issue in 2-3 sentences. Mention when you need the help, what tools are required, and whether it is paid assistance or volunteer help.
4. **Location & District (දිස්ත්‍රික්කය සහ පොලිස් බලප්‍රදේශය)**:
   • Choose your District (e.g. Colombo, Kandy, Galle) and local Police Division so nearby community members can find it quickly.
5. **Contact Channel (සම්බන්ධතා ක්‍රමය)**:
   • Enable WhatsApp or In-App Chat so helpers can message you directly.
6. **Upload Photos (ඡායාරූප)**:
   • Attach 1-3 clear photos showing the problem or requirement.
7. **Submit & Offers**:
   • Click **Publish Post**. Registered helpers will send you offers which appear in your notifications!`,
        actions: [
          { type: 'open_help_post', label: '📝 Open Help Post Form' },
          { type: 'open_wallet', label: '💳 Check Wallet Balance' },
        ],
        quickChips: ['How do helpers contact me?', 'How to accept an offer?', 'Is there a posting fee?'],
      };
    } else if (lang === 'ta') {
      return {
        text: `📝 **உதவி கோரிக்கை படிவத்தை நிரப்புவது எப்படி (படிபடியாக)**:

1. **தலைப்பு (Title)**: தேவையான உதவியை சுருக்கமாக எழுதவும் (உதா: *"வீட்டு மின்சார பழுது - மின்சார வல்லுநர் தேவை"*).
2. **பிரிவு (Category)**: மின்சாரம், குழாய், மருத்துவம் அல்லது போக்குவரத்து போன்ற பொருத்தமான பிரிவைத் தேர்ந்தெடுக்கவும்.
3. **முழு விபரம் (Description)**: சிக்கல், தேவைப்படும் நேரம் மற்றும் கட்டணம் பற்றி தெளிவாக விவரிக்கவும்.
4. **மாவட்டம் & பகுதி (Location)**: உங்கள் மாவட்டம் மற்றும் பொலிஸ் பிரிவைத் தேர்ந்தெடுக்கவும்.
5. **புகைப்படங்கள் (Photos)**: பிரச்சனையைக் காட்டும் 1-3 படங்களைப் பதிவேற்றவும்.
6. **சமர்ப்பித்தல்**: **விளம்பரத்தை இடுக** பொத்தானைக் கிளிக் செய்யவும்.`,
        actions: [
          { type: 'open_help_post', label: '📝 உதவி படிவத்தைத் திறக்கவும்' },
        ],
        quickChips: ['உதவியாளர்கள் எவ்வாறு தொடர்புகொள்வார்கள்?', 'பதிவுக் கட்டணம் உள்ளதா?'],
      };
    } else {
      return {
        text: `📝 **ප්‍රජා උපකාර ඉල්ලුම් පෝරමය නිවැරදිව පුරවන ආකාරය (පියවරෙන් පියවර)**:

1. **මාතෘකාව (Title)**:
   • ඔබගේ අවශ්‍යතාව කෙටියෙන් සහ පැහැදිලිව ලියන්න. (උදා: *"නිවසේ විදුලි පද්ධතියේ හදිසි කාන්දුවක් - විදුලි කාර්මිකයෙකු අවශ්‍යයි"*).
2. **කාණ්ඩය (Category)**:
   • අවශ්‍යතාවයට අදාළ අංශය තෝරන්න (විදුලි, නල, වෛද්‍ය, ප්‍රවාහන, මේසන්, අධ්‍යාපනික ආදිය).
3. **සම්පූර්ණ විස්තරය (Description)**:
   • ගැටලුව කුමක්ද, අවශ්‍ය දිනය/වේලාව, සහ ඔබ ගෙවීමට බලාපොරොත්තු වන මුදල හෝ ස්වේච්ඡා සහයක්ද යන්න පැහැදිලිව විස්තර කරන්න.
4. **දිස්ත්‍රික්කය සහ පොලිස් වසම (Location)**:
   • ඔබගේ දිස්ත්‍රික්කය සහ ළඟම පොලිස් බලප්‍රදේශය තෝරන්න. එවිට ළඟම සිටින අයට පණිවිඩය ක්ෂණිකව ලැබේ.
5. **සම්බන්ධතා ක්‍රමය (Contact)**:
   • WhatsApp හෝ In-App Chat ක්‍රමය සක්‍රියව තබන්න.
6. **ඡායාරූප (Photos)**:
   • ගැටලුව හෝ අවශ්‍යතාව පැහැදිලිව පෙනෙන ඡායාරූප 1-3ක් ඇතුළත් කරන්න.
7. **පළකිරීම (Submit)**:
   • **දැන්වීම පළකරන්න** බොත්තම ඔබන්න. උදවු කිරීමට කැමති අයගෙන් ලැබෙන Help Offers ඔබගේ Notification වලට ක්ෂණිකව ලැබේ!`,
        actions: [
          { type: 'open_help_post', label: '📝 උපකාර ඉල්ලුම් පෝරමය විවෘත කරන්න' },
          { type: 'open_wallet', label: '💳 Wallet එක සහ Credits පරීක්ෂා කරන්න' },
        ],
        quickChips: ['උදවුකරුවන් මාව සම්බන්ධ කරගන්නේ කෙසේද?', 'Offer එකක් පිළිගන්නේ කෙසේද?', 'දැන්වීම් ගාස්තු විස්තර'],
      };
    }
  }

  // 1.2 Blood & Disaster Request Form (ලේ සහ ආපදා ඉල්ලුම් පෝරමය)
  if (isFormFillingQuery && (lower.includes('ලේ') || lower.includes('blood') || lower.includes('donor') || lower.includes('இரத்தம்') || lower.includes('ආපදා'))) {
    if (lang === 'en') {
      return {
        text: `🩸 **How to Fill the Urgent Blood & Disaster Request Form**:

1. **Patient / Recipient Name**: Enter the patient's full name.
2. **Blood Group (රුධිර කාණ්ඩය)**: Select the exact blood type required (A+, A-, B+, B-, O+, O-, AB+, AB-, or Platelets/පට්ටිකා).
3. **Hospital & Blood Bank (රෝහල)**: Enter the hospital name (e.g. National Hospital Colombo, Karapitiya, Kandy).
4. **Required Units (ඒකක ගණන)**: Mention how many units/pints are required.
5. **Urgency Timeline**: Select *Immediate (පැය කිහිපයක් ඇතුළත)* or *Within Today (අද දින තුළ)*.
6. **Contact Person & Phone**: Enter the verified phone number of the patient's guardian/doctor.
7. **Submission**: Click **Broadcast Blood Alert**. Registered volunteer donors of that specific blood group within the district will receive an immediate notification!`,
        actions: [
          { type: 'open_blood', label: '🩸 Open Blood & Disaster Hub' },
          { type: 'open_directory', label: '📞 National Blood Bank Hotline' },
        ],
        quickChips: ['How does Blood Radar work?', 'Register as a Blood Donor', 'National Blood Bank Phone'],
      };
    } else {
      return {
        text: `🩸 **හදිසි රුධිර සහ ආපදා ඉල්ලුම් පෝරමය පුරවන ආකාරය (පියවරෙන් පියවර)**:

1. **රෝගියාගේ නම (Patient Name)**: රෝගියාගේ සම්පූර්ණ නම ඇතුළත් කරන්න.
2. **අවශ්‍ය රුධිර කාණ්ඩය (Blood Group)**: නිවැරදි කාණ්ඩය තෝරන්න (A+, A-, B+, B-, O+, O-, AB+, AB- හෝ Platelets/පට්ටිකා).
3. **රෝහල සහ ලේ බැංකුව (Hospital)**: රෝගියා ප්‍රතිකාර ලබන රෝහලේ නම (උදා: ජාතික රෝහල කොළඹ, කරාපිටිය, මහනුවර).
4. **අවශ්‍ය ඒකක ගණන (Units Needed)**: අවශ්‍ය රුධිර බෝතල්/ඒකක ගණන සඳහන් කරන්න.
5. **හදිසි මට්ටම (Urgency)**: *ක්ෂණිකව (පැය කිහිපයක් ඇතුළත)* හෝ *අද දින තුළ* යන්න තෝරන්න.
6. **භාරකරුගේ දුරකථන අංකය (Contact Phone)**: රෝගියාගේ ළඟම ඥාතියෙකුගේ සක්‍රිය දුරකථන අංකය ලබාදෙන්න.
7. **නිකුත් කිරීම (Broadcast)**: **Alert එක නිකුත් කරන්න** බොත්තම ඔබන්න. එම දිස්ත්‍රික්කයේ සිටින අදාළ රුධිර කාණ්ඩයේ ලියාපදිංචි ස්වේච්ඡා දායකයන්ට ක්ෂණිකව දැනුම්දීමක් (Radar Alert) යයි!`,
        actions: [
          { type: 'open_blood', label: '🩸 හදිසි ලේ කේන්ද්‍රය විවෘත කරන්න' },
          { type: 'open_directory', label: '📞 ලේ බැංකු සහ හදිසි අංක (1990/119)' },
        ],
        quickChips: ['ලේ පරිත්‍යාග රේඩාර් ක්‍රියාකරන්නේ කොහොමද?', 'ලේ දන් දෙන්නෙක් ලෙස ලියාපදිංචි වන්නේ කෙසේද?'],
      };
    }
  }

  // 1.3 Quick Services Request Form (ඉක්මන් සේවා පෝරමය)
  if (isFormFillingQuery && (lower.includes('කාර්මික') || lower.includes('quick') || lower.includes('electric') || lower.includes('plumb') || lower.includes('සේවා'))) {
    if (lang === 'en') {
      return {
        text: `⚡ **How to Fill the 24/7 Quick Service Request Form**:

1. **Service Type**: Select the trade required (Electrician, Plumber, Vehicle Breakdown Mechanic, AC Repair, Mason).
2. **Issue Summary**: Briefly explain what broke down (e.g. *"Main water pipe burst under kitchen sink"*).
3. **Urgency**: Select *Urgent Breakdown (Now)* or *Today*.
4. **Address / 15km Radar**: Confirm your current location so verified artisans within 15km can respond immediately.
5. **Direct Call / WhatsApp**: Choose whether artisans should call you directly on mobile or send a quote via chat.`,
        actions: [
          { type: 'open_quick', label: '⚡ Post Quick Service Request' },
        ],
        quickChips: ['How are artisans verified?', 'What are typical charges?'],
      };
    } else {
      return {
        text: `⚡ **24/7 ඉක්මන් කාර්මික සේවා පෝරමය පුරවන ආකාරය**:

1. **සේවා ක්ෂේත්‍රය (Service Category)**: ඔබට අවශ්‍ය කාර්මිකයා තෝරන්න (විදුලි, නල, වාහන කාර්මික, AC අලුත්වැඩියා, මේසන්).
2. **ගැටලුව කෙටියෙන් (Issue Summary)**: අලුත්වැඩියා කළයුතු දේ සඳහන් කරන්න (උදා: *"ප්‍රධාන ජල නලය පුපුරා ජලය ගලා යයි"*).
3. **හදිසි මට්ටම (Urgency)**: *ක්ෂණිකව (දැන්ම)* හෝ *අද දින තුළ* යන්න තෝරන්න.
4. **ස්ථානය (Location - 15km)**: ඔබගේ නිවසේ/ස්ථානයේ ලිපිනය තහවුරු කරන්න. එවිට 15km රේඩාර් සීමාව තුළ සිටින කාර්මිකයන්ට පණිවිඩය යයි.
5. **සම්බන්ධවීම (Contact Method)**: දුරකථන ඇමතුමකින්ද WhatsApp මඟින්ද සම්බන්ධ විය යුත්තේ යන්න තෝරා Submit කරන්න.`,
        actions: [
          { type: 'open_quick', label: '⚡ ඉක්මන් සේවා පෝරමය විවෘත කරන්න' },
        ],
        quickChips: ['කාර්මිකයන්ගේ සත්‍යාපනය පරීක්ෂා කරන්නේ කොහොමද?', 'ගාස්තු තීරණය වන්නේ කෙසේද?'],
      };
    }
  }

  // 1.4 Find For Me / Lost Item Form (සොයාදෙන්න පෝරමය)
  if (isFormFillingQuery && (lower.includes('නැති') || lower.includes('lost') || lower.includes('found') || lower.includes('සොයා') || lower.includes('find'))) {
    return {
      text: `🔍 **නැතිවූ හෝ සොයන දේ (Find For Me) පෝරමය පුරවන ආකාරය**:

1. **නැතිවූ භාණ්ඩයේ වර්ගය (Item Category)**: ජාතික හැඳුනුම්පත (NIC), රියදුරු බලපත්‍රය, මුදල් පසුම්බිය, සුරතල් සතෙකු හෝ වෙනත් ලියකියවිලි.
2. **මාතෘකාව (Title)**: භාණ්ඩයේ නම සහ හඳුනාගැනීමේ විස්තර (උදා: *"කළු පැහැති Leather Wallet එකක් - NIC සහ ATM කාඩ්පත් සමඟ"*).
3. **නැතිවූ ස්ථානය සහ දිනය (Lost Location & Date)**: අවසන් වරට තිබූ ස්ථානය, බස් රථ අංකය, හෝ නගරය.
4. **ත්‍යාග මුදලක් (Optional Reward)**: සොයාදෙන කෙනෙකුට ලබාදෙන ත්‍යාග මුදලක් ඇත්නම් සඳහන් කරන්න (උදා: රු. 2,000/=).
5. **ඡායාරූපය (Photo)**: භාණ්ඩයේ හෝ සුරතලාගේ පැහැදිලි ඡායාරූපයක් ඇතුළත් කරන්න.
6. **Submit**: දැන්වීම පළවූ පසු මුළු දිවයිනටම විකාශය වන අතර යමෙකුට හමුවූ විට ඔබට ක්ෂණිකව පණිවිඩයක් එවනු ඇත.`,
      actions: [{ type: 'open_find', label: '🔍 සොයාදෙන්න පෝරමය විවෘත කරන්න' }],
      quickChips: ['හැඳුනුම්පතක් නැතිවූ විට කළයුතු දේ', 'ත්‍යාග මුදල් ගෙවන්නේ කෙසේද?'],
    };
  }

  // 1.5 From Me To You / Free Donation Form (නොමිලේ පරිත්‍යාග පෝරමය)
  if (isFormFillingQuery && (lower.includes('දීමන') || lower.includes('donate') || lower.includes('නොමිලේ') || lower.includes('from me') || lower.includes('පරිත්‍යාග'))) {
    return {
      text: `🎁 **නොමිලේ දීමනා සහ පරිත්‍යාග (From Me To You) පෝරමය පුරවන ආකාරය**:

1. **දීමනා භාණ්ඩයේ නම (Item Name)**: පරිත්‍යාග කරන ද්‍රව්‍ය (උදා: *"10-11 ශ්‍රේණි පෙළපොත් කට්ටලය"*, *"පාවිච්චි කළ රෝද පුටුවක්"*).
2. **භාණ්ඩයේ තත්ත්වය (Condition)**: *ඉතා හොඳ තත්ත්වයේ (Good)*, *සුළු වශයෙන් පාවිච්චි කළ (Used)*.
3. **ලබාගැනීමේ ක්‍රමය (Pickup/Delivery)**: ඔබගේ නිවසින් පැමිණ රැගෙන යා යුතුද, නැතහොත් තැපැල්/කුරියර් මඟින් යැවිය හැකිද යන්න සඳහන් කරන්න.
4. **ඡායාරූපය (Photo)**: භාණ්ඩයේ සත්‍ය ඡායාරූපයක් එක්කරන්න.
5. **පළකිරීම**: අවශ්‍යතාව ඇති කෙනෙකු ඔබ හා සම්බන්ධ වී එය ලබාගනු ඇත. කිසිදු මුදලක් අය නොකෙරේ.`,
      actions: [{ type: 'open_from_you', label: '🎁 නොමිලේ දීමනා පෝරමය විවෘත කරන්න' }],
      quickChips: ['පොත්පත් පරිත්‍යාගයක්', 'ආධාර උපකරණ පරිත්‍යාගයක්'],
    };
  }

  // 1.6 General Form Filling Guide (පොදුවේ සියලු පෝරම පිළිබඳ මඟපෙන්වීම)
  if (isFormFillingQuery) {
    return {
      text: `📝 **සහය සේවා පද්ධතියේ පෝරම සහ ලේඛන පුරවන ආකාරය පිළිබඳ සම්පූර්ණ මඟපෙන්වීම**:

ඔබට අවශ්‍ය පෝරමය පහතින් තෝරන්න. එක් එක් පෝරමය සඳහා පියවරෙන් පියවර උපදෙස් ලබාදීමට මම සූදානම්:

1. **📝 ප්‍රජා උපකාර ඉල්ලුම් පෝරමය (Community Help Request)**: නිවසේ අලුත්වැඩියා, වෛද්‍ය ආධාර, ප්‍රවාහන උදවු ආදිය සඳහා.
2. **🩸 හදිසි රුධිර & ආපදා සහන පෝරමය (Blood & Disaster Request)**: ලේ අවශ්‍යතා සහ ආපදා ආධාර සඳහා.
3. **⚡ 24/7 ඉක්මන් කාර්මික සේවා පෝරමය (Quick Services)**: විදුලි, නල, වාහන කාර්මිකයන් 15km දුරින් ගෙන්වා ගැනීමට.
4. **🔍 සොයාදෙන්න / නැතිවූ දේ පෝරමය (Find For Me / Lost & Found)**: NIC, Wallet, සුරතල් සතුන් සෙවීමට.
5. **🎁 මගෙන් ඔබට නොමිලේ දීමනා පෝරමය (From Me To You)**: පොත්, ඇඳුම්, උපකරණ පරිත්‍යාග කිරීමට.
6. **🛒 වෙළඳපල භාණ්ඩ / සාප්පු පෝරමය (Marketplace)**: අඩුම මිලට භාණ්ඩ විකිණීමට හෝ සාප්පුවක් ලියාපදිංචි කිරීමට.
7. **🚨 හදිසි රතු නිවේදන පෝරමය (Red Alert Hazard Report)**: ගංවතුර, ගිනිගැනීම් ආපදා සයිරන් නිකුත් කිරීමට.`,
      actions: [
        { type: 'open_help_post', label: '📝 උපකාර ඉල්ලුම් පෝරමය' },
        { type: 'open_blood', label: '🩸 ලේ & ආපදා පෝරමය' },
        { type: 'open_quick', label: '⚡ ඉක්මන් සේවා පෝරමය' },
        { type: 'open_find', label: '🔍 සොයාදෙන්න පෝරමය' },
      ],
      quickChips: [
        'උපකාර පෝරමය පුරවන්නේ කොහොමද?',
        'ලේ ඉල්ලුම් පෝරමය පුරවන්නේ කොහොමද?',
        'ඉක්මන් සේවා පෝරමය පුරවන්නේ කොහොමද?',
        'නැතිවූ දේ පෝරමය පුරවන්නේ කොහොමද?',
      ],
    };
  }

  // -------------------------------------------------------------
  // 2. HOW TO CONNECT & COMMUNICATE (සම්බන්ධ වන්නේ කෙසේද?)
  // -------------------------------------------------------------
  const isConnectQuery =
    lower.includes('සම්බන්ධ') ||
    lower.includes('connect') ||
    lower.includes('contact') ||
    lower.includes('කතා කරන්නේ') ||
    lower.includes('පණිවිඩ යවන්නේ') ||
    lower.includes('chat') ||
    lower.includes('தொடர்பு');

  if (isConnectQuery) {
    if (lang === 'en') {
      return {
        text: `🤝 **How to Connect with Services & Community Members**:

1. **💬 In-App Private Chat**:
   • Click the **Message / Chat icon** on any Help Post, Service Provider, or Shop profile to start an encrypted, secure direct chat.
2. **📞 Direct WhatsApp & Phone Call**:
   • Verified posts include a direct WhatsApp call/chat button for instant contact.
3. **🚨 Emergency Radar & Sirens**:
   • Red Alerts automatically broadcast proximity sirens to all active users within 2km.
4. **📍 GPS & Police Division Location Match**:
   • The system matches you with helpers and artisans located closest to your verified District & Police Division.
5. **📞 24/7 National Emergency Helplines**:
   • Police (119), Suwa Seriya Ambulance (1990), Disaster Management (117). Available offline.`,
        actions: [
          { type: 'open_directory', label: '📞 Emergency Helplines (1990/119)' },
          { type: 'open_quick', label: '⚡ Quick Services' },
        ],
        quickChips: ['How to start in-app chat?', 'How to find helpers near me?'],
      };
    } else {
      return {
        text: `🤝 **සේවාවන් සහ ප්‍රජා සාමාජිකයන් සමඟ සම්බන්ධ වන්නේ කෙසේද?**:

1. **💬 පද්ධතිය තුළ පෞද්ගලික චැට් (In-App Direct Chat)**:
   • ඕනෑම උපකාර දැන්වීමක, කාර්මිකයෙකුගේ හෝ සාප්පුවක ඇති **Message (පණිවිඩ)** බොත්තම එබූ විට පෞද්ගලිකව කතාබස් කළ හැකි ආරක්ෂිත Chat එකක් විවෘත වේ.
2. **📞 සෘජු WhatsApp සහ දුරකථන ඇමතුම්**:
   • සත්‍යාපිත සාමාජිකයන්ගේ දැන්වීම්වල ඇති WhatsApp හෝ Call බොත්තමෙන් කෙළින්ම දුරකථනයෙන් සම්බන්ධ විය හැක.
3. **🚨 හදිසි රතු නිවේදන සයිරන් (Proximity Radar)**:
   • ඔබ සිටින ස්ථානයේ සිට 2km ඇතුළත හදිසි ආපදාවක් වාර්තා වූ විට ඔබගේ දුරකථනයේ හදිසි අනතුරු ඇඟවීමේ සයිරන් ශබ්දයක් වාදනය වේ.
4. **📍 GPS සහ දිස්ත්‍රික්ක ස්ථාන ගැලපීම**:
   • ඔබගේ දිස්ත්‍රික්කය සහ පොලිස් බලප්‍රදේශය අනුව ළඟම සිටින කාර්මිකයන් සහ උදවුකරුවන් පද්ධතිය විසින් ස්වයංක්‍රීයව පෙන්වයි.
5. **📞 ජාතික නොබැඳි හදිසි දුරකථන අංක**:
   • පොලිස් හදිසි ඇමතුම් (119), සුවසැරිය ගිලන්රථ (1990), ආපදා කළමනාකරණ (117) ඕනෑම වේලාවක නොමිලේ අමතන්න.`,
        actions: [
          { type: 'open_directory', label: '📞 හදිසි දුරකථන අංක නාමාවලිය' },
          { type: 'open_quick', label: '⚡ ළඟම සිටින කාර්මිකයන් බලන්න' },
        ],
        quickChips: ['චැට් කරන්නේ කොහොමද?', '15km රේඩාර් ක්‍රියාකරන්නේ කොහොමද?', 'හදිසි ඇමතුම් අංක'],
      };
    }
  }

  // -------------------------------------------------------------
  // 3. HOW IT WORKS / WORKFLOW BREAKDOWNS (ක්‍රියාකරන්නේ කෙසේද?)
  // -------------------------------------------------------------
  const isHowItWorksQuery =
    lower.includes('ක්‍රියා') ||
    lower.includes('වැඩ කරන්නේ') ||
    lower.includes('how it work') ||
    lower.includes('workflow') ||
    lower.includes('process') ||
    lower.includes('இயங்குகிறது');

  if (isHowItWorksQuery) {
    if (lang === 'en') {
      return {
        text: `🔄 **How the Sahaya Seva Platform Works (Core System Workflows)**:

1. **Community Help Request Lifecycle**:
   • **Post Request** ➔ **Locality Broadcast** (Firestore) ➔ **Helpers submit Offers** ➔ **You Accept Offer** ➔ **Task Done & Bill Settled**.
2. **Emergency Blood Donor Radar**:
   • **Blood Request Created** ➔ **Instant District Radar matches blood type** ➔ **Donors alerted** ➔ **Direct hospital coordinate**.
3. **24/7 Quick Services (15km Distance Matrix)**:
   • **Urgent Issue Posted** ➔ **Verified Artisans within 15km notified** ➔ **Direct Call / Chat** ➔ **On-site Fix**.
4. **Marketplace Lowest Prices & Price Gaps**:
   • Suppliers list daily prices ➔ System calculates lowest price & savings gap ➔ Buyers purchase at verified cheapest rates.
5. **User Trust Score & Badges**:
   • Every user profile has Trust Scores based on verified NIC, successful help completed, and authentic reviews.`,
        actions: [
          { type: 'open_help_post', label: '📝 Post a Help Request' },
          { type: 'open_market', label: '🛒 View Lowest Market Prices' },
          { type: 'open_blood', label: '🩸 Blood & Disaster Hub' },
        ],
        quickChips: ['How does Blood Radar work?', 'How does 15km quick service work?', 'How do Trust Scores work?'],
      };
    } else {
      return {
        text: `🔄 **සහය සේවා පද්ධතිය ක්‍රියාත්මක වන ආකාරය (සම්පූර්ණ ක්‍රියාවලිය)**:

1. **ප්‍රජා උපකාර දැන්වීම් ක්‍රියාවලිය (Help Request Lifecycle)**:
   • **ඔබ ඉල්ලීමක් පළකරයි** ➔ **ප්‍රදේශයේ අයට විකාශය වේ** ➔ **උදවුකරුවන් Offers එවයි** ➔ **ඔබ සුදුසු කෙනා තෝරාගනී** ➔ **කාර්යය අවසන් කර තහවුරු කරයි**.
2. **හදිසි ලේ පරිත්‍යාග රේඩාර් ක්‍රියාවලිය (Blood Radar)**:
   • **ලේ ඉල්ලීමක් නිකුත් කරයි** ➔ **අදාළ දිස්ත්‍රික්කයේ ගැලපෙන ලේ වර්ගයේ පරිත්‍යාගශීලීන්ට ක්ෂණික Alert එකක් යයි** ➔ **රෝහලේදී ලේ දන් දෙයි**.
3. **ඉක්මන් කාර්මික සේවා (15km Quick Services)**:
   • **කාර්මික අවශ්‍යතාව පළකරයි** ➔ **15km ඇතුළත සිටින සත්‍යාපිත කාර්මිකයන්ට පණිවිඩය යයි** ➔ **කෙළින්ම කතාබස් කර පැමිණේ**.
4. **වෙළඳපල අඩුම මිල දර්ශකය (Marketplace Price Gaps)**:
   • වෙළෙන්දන් භාණ්ඩ මිල ඇතුළත් කරයි ➔ පද්ධතිය අඩුම මිල සහ ඉතිරි කරගත හැකි ලාභ ප්‍රතිශතය (Price Gap) සසඳා පෙන්වයි.
5. **විශ්වාසනීය ලකුණු (Trust Score & Badges)**:
   • NIC සත්‍යාපනය, ලබාදුන් සාර්ථක සහය සහ පරිශීලක ඇගයීම් මත සෑම සාමාජිකයෙකුටම Trust Score එකක් හිමිවේ.`,
        actions: [
          { type: 'open_help_post', label: '📝 උපකාර ඉල්ලුම් පෝරමය' },
          { type: 'open_market', label: '🛒 අඩුම මිල ගණන් සහ මිල පරතරය' },
          { type: 'open_blood', label: '🩸 හදිසි ලේ කේන්ද්‍රය' },
        ],
        quickChips: [
          'ලේ පරිත්‍යාග රේඩාර් ක්‍රියාකරන්නේ කොහොමද?',
          'ඉක්මන් සේවා ක්‍රියාකරන්නේ කොහොමද?',
          'පෝරම පුරවන්නේ කොහොමද?',
        ],
      };
    }
  }

  // -------------------------------------------------------------
  // 4. SECTOR-SPECIFIC DETAILED RESPONSES
  // -------------------------------------------------------------

  // Blood & Disaster
  if (lower.includes('ලේ') || lower.includes('blood') || lower.includes('இரத்தம்') || lower.includes('ආපදා') || lower.includes('disaster')) {
    return {
      text: `🩸 **හදිසි රුධිර සහ ආපදා සහන කේන්ද්‍රය (Blood & Disaster Hub)**:

• **සම්බන්ධ වන ආකාරය**: හදිසි ලේ අවශ්‍යතාවක් ඇතිවිට පෝරමය පුරවා Submit කරන්න. දිස්ත්‍රික්කයේ සිටින ගැලපෙන ලේ වර්ගය ඇති ස්වේච්ඡා දායකයන්ට ක්ෂණිකව Alert එකක් යයි.
• **ලේ පරිත්‍යාගශීලියෙකු ලෙස ලියාපදිංචි වීම**: 'ලේ පරිත්‍යාගශීලියෙකු වන්න' බොත්තම ඔබා ඔබගේ ලේ වර්ගය සහ දිස්ත්‍රික්කය ඇතුළත් කරන්න.
• **පෝරමය පිරවීමට**: රෝගියාගේ නම, රුධිර වර්ගය (A+, B+, O+, AB+, Platelets), රෝහල, අවශ්‍ය ඒකක ගණන සහ දුරකථන අංකය ඇතුළත් කරන්න.`,
      actions: [
        { type: 'open_blood', label: '🩸 හදිසි ලේ කේන්ද්‍රය විවෘත කරන්න' },
        { type: 'open_directory', label: '📞 නොබැඳි හදිසි අංක (1990/119)' },
      ],
      quickChips: ['ලේ ඉල්ලුම් පෝරමය පුරවන හැටි', 'O+ ලේ අවශ්‍යයි', 'ලේ දන් දෙන්නෙක් ලෙස ලියාපදිංචි වන්න'],
    };
  }

  // Quick Services
  if (lower.includes('කාර්මික') || lower.includes('electric') || lower.includes('plumb') || lower.includes('mechanic') || lower.includes('ඉක්මන්') || lower.includes('quick') || lower.includes('repair')) {
    return {
      text: `⚡ **පැය 24 පුරා ක්‍රියාත්මක ඉක්මන් කාර්මික සේවා (24/7 Quick Services)**:

• **සම්බන්ධ වන ආකාරය**: ඔබගේ ප්‍රදේශයේ සිටින (15km රේඩාර් සීමාවේ) විදුලි, නල, වාහන කාර්මිකයන් හෝ මේසන්වරුන් කෙළින්ම දුරකථනයෙන් හෝ චැට් මඟින් සම්බන්ධ කරගන්න.
• **ක්‍රියාකරන ආකාරය**: ඔබගේ හදිසි ගැටලුව පළකළ විට ළඟම සිටින සත්‍යාපිත කාර්මිකයන් වෙත ක්ෂණික Notification එකක් යයි. ඔවුන් ඔබව කෙළින්ම අමතයි.
• **පෝරමය පිරවීමට**: සේවා වර්ගය තෝරා, ගැටලුව විස්තර කර, ලිපිනය තහවුරු කරන්න.`,
      actions: [
        { type: 'open_quick', label: '⚡ ඉක්මන් සේවා පෝරමය විවෘත කරන්න' },
      ],
      quickChips: ['ඉක්මන් සේවා පෝරමය පුරවන හැටි', 'විදුලි කාර්මිකයෙක් අවශ්‍යයි', 'නල කාර්මිකයෙක් අවශ්‍යයි'],
    };
  }

  // Find For Me
  if (lower.includes('නැති') || lower.includes('lost') || lower.includes('found') || lower.includes('සොයා') || lower.includes('தொலைந்த') || lower.includes('wallet') || lower.includes('nic')) {
    return {
      text: `🔍 **සොයාදෙන්න - නැතිවූ හෝ සොයන දේ (Find For Me)**:

• **සම්බන්ධ වන ආකාරය**: නැතිවූ මුදල් පසුම්බිය, ජාතික හැඳුනුම්පත (NIC), රියදුරු බලපත්‍රය, සුරතල් සතුන් හෝ ලියකියවිලි ගැන ඡායාරූප සමඟ දැන්වීමක් පළකරන්න.
• **ක්‍රියාකරන ආකාරය**: දැන්වීම දිවයින පුරා සිටින පරිශීලකයන්ට විකාශය වේ. යමෙකුට එම භාණ්ඩය හමුවුවහොත් ඔවුන් ඔබට පද්ධතිය හරහා පණිවිඩයක් එවනු ඇත.
• **පෝරමය පිරවීමට**: භාණ්ඩයේ වර්ගය, නැතිවූ ස්ථානය/දිනය, ඡායාරූපය සහ කැමති නම් ත්‍යාග මුදලක් (Reward) සඳහන් කරන්න.`,
      actions: [{ type: 'open_find', label: '🔍 සොයාදෙන්න පෝරමය විවෘත කරන්න' }],
      quickChips: ['නැතිවූ දේ පෝරමය පුරවන හැටි', 'මුදල් පසුම්බිය / NIC නැතිවුණා', 'සුරතල් සතෙක් නැතිවුණා'],
    };
  }

  // From Me To You
  if (lower.includes('දීමන') || lower.includes('donate') || lower.includes('give') || lower.includes('නොමිලේ') || lower.includes('தானம்') || lower.includes('පරිත්‍යාග')) {
    return {
      text: `🎁 **මගෙන් ඔබට - නොමිලේ දීමනා සහ පරිත්‍යාග (From Me To You)**:

• **සම්බන්ධ වන ආකාරය**: ඔබ සතුව ඇති අමතර පාසල් පොත්පත්, ඇඳුම්, ගෘහ උපකරණ හෝ ආධාර උපකරණ (රෝද පුටු, කිහිලි කරු) අවශ්‍යතා ඇති අයට නොමිලේ පරිත්‍යාග කිරීමට මෙහි පළකරන්න.
• **ක්‍රියාකරන ආකාරය**: අවශ්‍යතාව ඇති කෙනෙකු ඔබ හා පෞද්ගලිකව චැට් මඟින් සම්බන්ධ වී එය ලබාගැනීමට කටයුතු සම්පාදනය කරනු ඇත.`,
      actions: [{ type: 'open_from_you', label: '🎁 නොමිලේ දීමනා පෝරමය විවෘත කරන්න' }],
      quickChips: ['නොමිලේ දීමනා පෝරමය පුරවන හැටි', 'පොත්පත් පරිත්‍යාගයක්', 'රෝද පුටුවක් පරිත්‍යාගයක්'],
    };
  }

  // Marketplace & Lowest Prices
  if (lower.includes('මිල') || lower.includes('price') || lower.includes('market') || lower.includes('හාල්') || lower.includes('සීනි') || lower.includes('වෙළඳපල') || lower.includes('අඩුම') || lower.includes('පරතර')) {
    return {
      text: `🛒 **වෙළඳපල අඩුම මිල ගණන් සහ මිල පරතරය සංසන්දනය**:

• **ක්‍රියාකරන ආකාරය**: සෑම භාණ්ඩයකම වෙළෙන්දන් අතර ඇති අවම මිල, උපරිම මිල සහ ඉතිරි කරගත හැකි ලාභ පරතරය (Price Gap) පද්ධතිය මඟින් ස්වයංක්‍රීයව සසඳා පෙන්වයි.
• **සම්බන්ධ වන ආකාරය**: අඩුම මිලට භාණ්ඩ ලබාදෙන වෙළෙන්දාගේ නම, දුරකථන අංකය සහ සාප්පු ලිපිනය පරීක්ෂා කර සෘජුවම මිලදී ගන්න.`,
      actions: [{ type: 'open_market', label: '🛒 අඩුම මිල ගණන් සහ මිල පරතරය බලන්න' }],
      quickChips: ['වෙළඳපල ක්‍රියාකරන්නේ කොහොමද?', 'කීරි සම්බා සහල් මිල', 'පොල්තෙල් මිල සංසන්දනය'],
    };
  }

  // Wallet & Credits
  if (lower.includes('credit') || lower.includes('limit') || lower.includes('wallet') || lower.includes('ණය') || lower.includes('මුදල්') || lower.includes('ශේෂ') || lower.includes('සීමා')) {
    return {
      text: `💳 **සහය මිතුරා සහ Wallet Credits විස්තර**:

• **සහය මිතුරා (AI Assistant)**: භාවිතා කිරීමට කිසිදු සීමාවක් (No Limit) හෝ කිසිදු Credit මුදලක් වැය නොවේ (100% සම්පූර්ණයෙන්ම නොමිලේ).
• **Wallet Credits වැය වන ආකාරය**: ඔබ පද්ධතිය තුළ වාණිජ හෝ ප්‍රවර්ධන දැන්වීම් පළකරන විට පමණක් Wallet එකෙන් සුළු මුදලක් වැය වේ.
• **Credits ලබාගැනීම**: නව ලියාපදිංචියේදී නොමිලේ Welcome Credits හිමිවන අතර Wallet එකෙන් Top-up කළ හැක.`,
      actions: [{ type: 'open_wallet', label: '💳 Wallet එක විවෘත කර ශේෂය බලන්න' }],
      quickChips: ['පෝරම පුරවන්නේ කොහොමද?', 'ණය මුදල් තැන්පත් කරන්නේ කෙසේද?'],
    };
  }

  // -------------------------------------------------------------
  // 5. IN-APP TROUBLESHOOTING & ISSUE RESOLUTION (ගැටලු විසඳා ගැනීම)
  // -------------------------------------------------------------
  const isTroubleQuery =
    lower.includes('ගැටලු') ||
    lower.includes('problem') ||
    lower.includes('issue') ||
    lower.includes('error') ||
    lower.includes('බැහැ') ||
    lower.includes('නොහැක') ||
    lower.includes('වැඩ කරන්නේ නැහැ') ||
    lower.includes('gps') ||
    lower.includes('ස්ථානය') ||
    lower.includes('upload') ||
    lower.includes('photo') ||
    lower.includes('චැට්') ||
    lower.includes('මුරපද') ||
    lower.includes('password') ||
    lower.includes('ප්‍රශ්න');

  if (isTroubleQuery) {
    if (lower.includes('gps') || lower.includes('ස්ථාන') || lower.includes('location')) {
      return {
        text: `📍 **GPS සහ ස්ථානය හඳුනාගැනීමේ ගැටලුව විසඳා ගැනීම (Troubleshooting)**:

1. **ස්ථාන අවසරය (Location Permission)**: ඔබගේ Browser එකේ (Chrome/Safari) URL තීරුවේ ඇති අගුලේ සලකුණ (Lock icon) ඔබා **Location: Allow** කර Reload කරන්න.
2. **Device GPS සක්‍රිය කිරීම**: ඔබගේ දුරකථනයේ හෝ පරිගණකයේ Location / GPS සක්‍රිය කර ඇත්දැයි බලන්න.
3. **ස්වයංක්‍රීයව වෙනුවට අතින් තේරීම**: GPS සංඥා දුර්වල නම්, ඉහළ ඇති Location තීරුවෙන් ඔබගේ **දිස්ත්‍රික්කය සහ පොලිස් බලප්‍රදේශය** සෘජුවම තෝරාගත හැක.`,
        actions: [
          { type: 'open_issues_help', label: '❓ තාක්ෂණික ගැටලු වාර්තා කරන්න' },
        ],
        quickChips: ['GPS හරිගස්සන්නේ කොහොමද?', 'පෝරම පුරවන්නේ කොහොමද?', 'පරිපාලකට පණිවිඩයක් යවන්න'],
      };
    }

    if (lower.includes('photo') || lower.includes('upload') || lower.includes('ඡායාරූප')) {
      return {
        text: `📷 **ඡායාරූප Upload වීමේ ගැටලු විසඳා ගැනීම**:

1. **කැමරා අවසර (Camera Permission)**: Browser එකෙන් කැමරාව සහ Gallery සඳහා අවසර (Allow) ලබාදී ඇත්දැයි පරීක්ෂා කරන්න.
2. **ස්වයංක්‍රීය සම්පීඩනය (Auto Compress)**: අපගේ පද්ධතිය ඡායාරූප ස්වයංක්‍රීයව සුළු ප්‍රමාණයකට සම්පීඩනය (Compress) කරයි. ඔබගේ අන්තර්ජාලය දුර්වල අවස්ථාවකදී තත්පර කිහිපයක් රැඳී සිටින්න.
3. **ආලෝකය සහ ගුණාත්මකභාවය**: ඡායාරූපය නොසෙල්වී, පැහැදිලි ආලෝකයකින් ලබාගන්න.`,
        actions: [{ type: 'open_help_post', label: '📝 උපකාර ඉල්ලුම් පෝරමය' }],
        quickChips: ['NIC ඡායාරූප ගන්නේ කොහොමද?', 'පෝරම පුරවන්නේ කොහොමද?'],
      };
    }

    if (lower.includes('credit') || lower.includes('ණය') || lower.includes('ශේෂ')) {
      return {
        text: `💳 **Wallet Credits සහ ශේෂ ගැටලු විසඳා ගැනීම**:

1. **නොමිලේ සේවාවන්**: **සහය මිතුරා (AI Assistant)**, හදිසි ලේ ඉල්ලීම් සහ ආපදා සයිරන් සඳහා කිසිදු Credit මුදලක් වැය නොවේ (100% නොමිලේ).
2. **Credits ඉපයීම**: අන් අයට උදවු කිරීමෙන් සහ ප්‍රජා සේවාවන් සම්පූර්ණ කිරීමෙන් නොමිලේ Credits උපයාගත හැක.
3. **Top-Up කිරීම**: අවශ්‍ය නම් Wallet Modal එකෙන් Credits ලබාගැනීමට ඉල්ලුම් කළ හැක.`,
        actions: [{ type: 'open_wallet', label: '💳 Wallet ශේෂය පරීක්ෂා කරන්න' }],
        quickChips: ['Credits උපයන්නේ කොහොමද?', 'Wallet ශේෂය බලන්න'],
      };
    }

    // General Troubleshooting Guide
    return {
      text: `🛠️ **ඇප් එකේ ගැටලු විසඳාගැනීමේ මඟපෙන්වීම (Troubleshooting Hub)**:

ඔබ මුහුණදෙන ගැටලුව තෝරන්න. එය විසඳාගන්නා ආකාරය පියවරෙන් පියවර කියාදීමට මම සූදානම්:

1. **📍 GPS සහ ස්ථාන අවසර ගැටලු**: Location සක්‍රිය කිරීම සහ දිස්ත්‍රික්කය අතින් තේරීම.
2. **📷 ඡායාරූප Upload ගැටලු**: පැහැදිලි ඡායාරූප ගැනීම සහ Camera permissions.
3. **🔑 Login සහ මුරපද ගැටලු**: තාවකාලික මුරපදය ස්ථිර මුරපදයක් බවට පත්කිරීම.
4. **📢 දැන්වීම් වලට ප්‍රතිචාර නොලැබීම**: මාතෘකාව, විස්තරය සහ ඡායාරූප නිවැරදි කර Boost කිරීම.
5. **❓ පරිපාලක සහය ලබාගැනීම**: තාක්ෂණික සහය සඳහා Issues Help Desk වෙත පණිවිඩයක් යැවීම.`,
      actions: [
        { type: 'open_issues_help', label: '❓ ගැටලු & තාක්ෂණික උපකාර' },
        { type: 'open_help_post', label: '📝 උපකාර ඉල්ලුම් පෝරමය' },
      ],
      quickChips: [
        'GPS ගැටලුවක් විසඳන්නේ කොහොමද?',
        'ඡායාරූප Upload වෙන්නේ නැහැ',
        'මුරපදය මාරු කරන්නේ කොහොමද?',
        'පෝරම පුරවන්නේ කොහොමද?',
      ],
    };
  }

  // General Welcome & Guidance
  if (lang === 'en') {
    return {
      text: `👋 Hello! I am **Sahaya Mithura (සහය මිතුරා)** — your personal guide and step-by-step instructor.

I am here to teach and guide you on:
• 📝 **How to Fill Forms**: Step-by-step field guides for Help Requests, Blood Bank, Quick Services & Lost Items.
• 🤝 **How to Connect**: In-app private chat, direct WhatsApp calls, and emergency sirens.
• 🔄 **How Services Work**: Complete workflows from posting to offer matching and task completion.
• 🩸 **Emergency Blood & Disaster Hub**: Radar matching for urgent blood donors.
• ⚡ **24/7 Quick Services**: Electricians, Plumbers, Mechanics within 15km.
• 🛒 **Marketplace Price Gaps**: Finding the lowest daily commodity prices.

What would you like me to guide you through today?`,
      actions: [
        { type: 'open_help_post', label: '📝 Post a Help Request' },
        { type: 'open_quick', label: '⚡ Quick Services' },
        { type: 'open_market', label: '🛒 Lowest Prices' },
        { type: 'open_blood', label: '🩸 Blood & Disaster' },
      ],
      quickChips: [
        'How to fill Help Request Form?',
        'How do I connect with helpers?',
        'How does Blood Radar work?',
        'Check Lowest Market Prices',
      ],
    };
  } else if (lang === 'ta') {
    return {
      text: `👋 வணக்கம்! நான் **சகாய மித்துரா (Sahaya Mithura)** — உங்கள் தனிப்பட்ட வழிகாட்டி மற்றும் பயிற்றுவிப்பாளர்.

நான் உங்களுக்கு உதவ தயாராக உள்ளேன்:
• 📝 **படிவங்களை நிரப்புவது எப்படி**: உதவி கோரிக்கைகள், இரத்த தானம், விரைவு சேவைகள் படிவ வழிகாட்டல்கள்.
• 🤝 **தொடர்புகொள்வது எப்படி**: நேரடி அரட்டை (In-App Chat), வாட்ஸ்அப் அழைப்புகள் மற்றும் அவசர எச்சரிக்கைகள்.
• 🔄 **சேவைகள் எவ்வாறு இயங்குகின்றன**: கோரிக்கை முதல் உதவி முடிவடையும் வரையிலான முழுமையான வழிமுறை.
• 🩸 **அவசர இரத்தம் மற்றும் பேரழிவு நிவாரணம்**.
• ⚡ **24/7 விரைவு சேவைகள்** (மின்சாரம், குழாய், மெக்கானிக்).
• 🛒 **குறைந்தபட்ச சந்தை விலைகள் ஒப்பீடு**.

இன்று உங்களுக்கு என்ன வழிகாட்டல் தேவை?`,
      actions: [
        { type: 'open_help_post', label: '📝 உதவி படிவத்தைத் திறக்கவும்' },
        { type: 'open_quick', label: '⚡ விரைவு சேவைகள்' },
        { type: 'open_market', label: '🛒 சந்தை விலைகள்' },
        { type: 'open_blood', label: '🩸 இரத்த தானம்' },
      ],
      quickChips: [
        'படிவம் நிரப்புவது எப்படி?',
        'தொடர்புகொள்வது எப்படி?',
        'இரத்த தானம் எவ்வாறு இயங்குகிறது?',
        'சந்தை விலைகள்',
      ],
    };
  } else {
    return {
      text: `👋 ආයුබෝවන්! මම ඔබගේ **සහය මිතුරා (Sahaya Mithura)** — පද්ධතියේ නිල මඟපෙන්වන්නා සහ උපදේශකයා.

පද්ධතියේ සේවාවන් සමඟ **සම්බන්ධ වන්නේ කෙසේද**, **ක්‍රියාකරන්නේ කෙසේද** සහ **පෝරම පුරවන්නේ කෙසේද** යන්න නිවැරදිව කියාදීමට මම සූදානම්:

• 📝 **පෝරම සහ ලේඛන පුරවන ආකාරය**: උපකාර ඉල්ලීම්, හදිසි ලේ, ඉක්මන් සේවා, නැතිවූ දේ පෝරම පියවරෙන් පියවර පිරවීම.
• 🤝 **සම්බන්ධ වන ආකාරය**: In-App Chat, සෘජු WhatsApp ඇමතුම්, සහ හදිසි සයිරන් මඟින් සම්බන්ධවීම.
• 🔄 **ක්‍රියාකරන ආකාරය**: දැන්වීමක් පළකිරීමේ සිට උදවු ලැබීම, සත්‍යාපනය සහ ගෙවීම් දක්වා සම්පූර්ණ ක්‍රියාවලිය.
• 🩸 **හදිසි රුධිර & ආපදා සහන**: ගැලපෙන ලේ වර්ගයේ පරිත්‍යාගශීලීන් රේඩාර් මඟින් සම්බන්ධ කිරීම.
• ⚡ **24/7 ඉක්මන් කාර්මික සේවා**: 15km සීමාවේ විදුලි, නල, වාහන කාර්මිකයන්.
• 🛒 **වෙළඳපල අඩුම මිල දර්ශකය**: දවසේ අඩුම මිල සහ ඉතිරි කරගත හැකි ලාභ පරතරය සංසන්දනය.

ඔබට අද මගෙන් අවශ්‍ය මඟපෙන්වීම කුමක්ද?`,
      actions: [
        { type: 'open_help_post', label: '📝 උපකාර ඉල්ලුම් පෝරමය' },
        { type: 'open_quick', label: '⚡ ඉක්මන් සේවා' },
        { type: 'open_market', label: '🛒 අඩුම මිල ගණන්' },
        { type: 'open_blood', label: '🩸 හදිසි ලේ කේන්ද්‍රය' },
      ],
      quickChips: [
        'පෝරම පුරවන්නේ කොහොමද?',
        'සම්බන්ධ වන්නේ කොහොමද?',
        'ක්‍රියාකරන්නේ කොහොමද?',
        'ලේ ඉල්ලුම් පෝරමය පුරවන හැටි',
      ],
    };
  }
}
