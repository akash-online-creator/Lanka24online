/**
 * ⚡ Local & Offline Knowledge Base Resolver
 * Used as an offline/fallback resolver when the Gemini AI server is unreachable,
 * or for specific troubleshooting workflows.
 */

export interface LocalKnowledgeMatch {
  matched: boolean;
  category: 'gps' | 'password' | 'approval' | 'nic' | 'credits' | 'general';
  titleSi: string;
  summarySi: string;
  detailedSteps: string[];
  actionType?: 'open_gps_modal' | 'open_password_reset' | 'open_issues' | 'none';
  actionLabelSi?: string;
}

const KNOWLEDGE_ENTRIES: Array<{
  category: LocalKnowledgeMatch['category'];
  keywords: string[];
  titleSi: string;
  summarySi: string;
  detailedSteps: string[];
  actionType?: LocalKnowledgeMatch['actionType'];
  actionLabelSi?: string;
}> = [
  {
    category: 'gps',
    keywords: [
      'gps වැඩ නැහැ',
      'location වැඩ නැහැ',
      'ස්ථානය පෙන්වන්නේ නැහැ',
      'gps on කරන්නේ',
      'location permission',
    ],
    titleSi: '📍 GPS සහ ස්ථාන සේවාව (Location) සක්‍රිය කරගැනීමේ මඟපෙන්වීම',
    summarySi:
      'ඔබට ආසන්නතම හදිසි උපකාර, රතු නිවේදන (Red Alerts) සහ කාර්මික සේවාවන් නිවැරදිව පෙන්වීමට දුරකථනයේ Location (GPS) සක්‍රිය කර තිබීම වැදගත් වේ.',
    detailedSteps: [
      'දුරකථනයේ ඉහළ තීරුව (Notification Bar) පහළට ඇද "Location / GPS" බොත්තම ON කරන්න.',
      'Browser එකේ ඉහළ වම් කෙළවරේ ඇති Lock (🔒) අයිකනය ඔබා "Location -> Allow" ලබා දෙන්න.',
      'ඉහළ Location Bar එක මත ඔබා ඔබට කැමති දිස්ත්‍රික්කයක් හෝ නගරයක් අතින් (Manually) වුවද තෝරාගත හැක.',
    ],
    actionType: 'open_gps_modal',
    actionLabelSi: '📍 හදිසි ඇමතුම් සහ ස්ථාන සහාය',
  },
  {
    category: 'password',
    keywords: [
      'මුරපදය අමතකයි',
      'password අමතකයි',
      'forgot password',
      'reset password',
      'ලොග් වෙන්න බෑ',
      'login වෙන්න බැහැ',
    ],
    titleSi: '🔐 මුරපදය (Password) අමතක වූ විට නැවත ලබාගන්නා ආකාරය',
    summarySi:
      'ඔබගේ මුරපදය අමතක වී ඇත්නම් හෝ ගිණුමට පිවිසීමට නොහැකි නම් පහත පියවර අනුගමනය කරන්න:',
    detailedSteps: [
      'Login පිටුවේ පහළින් ඇති "මුරපදය අමතකද? (Forgot Password)" හෝ "ගැටලු & උපකාර" බොත්තම ඔබන්න.',
      'ඔබගේ ජාතික හැඳුනුම්පත් අංකය (NIC) සහ ලියාපදිංචි දුරකථන අංකය ඇතුළත් කර මුරපද යාවත්කාලීන ඉල්ලීම යොමු කරන්න.',
      'පරිපාලක මණ්ඩලය විසින් ඔබගේ ඉල්ලීම පරීක්ෂා කර තාවකාලික මුරපදයක් ලබා දෙනු ඇත.',
    ],
    actionType: 'open_password_reset',
    actionLabelSi: '🔑 මුරපද සහාය ලබාගන්න',
  },
  {
    category: 'approval',
    keywords: [
      'ගිණුම අනුමත',
      'pending approval',
      'තවම අනුමත නැහැ',
      'account approve',
    ],
    titleSi: '⏳ ගිණුම අනුමත වීම (Account Verification & Approval)',
    summarySi:
      'ප්‍රජාවගේ ආරක්ෂාව තහවුරු කිරීම සඳහා සෑම නව ගිණුමක්ම පරිපාලක මණ්ඩලය විසින් පරීක්ෂා කර අනුමත කරනු ලැබේ.',
    detailedSteps: [
      'හැඳුනුම්පතේ (NIC) දෙපස සහ ඔබගේ මුහුණේ ඡායාරූපය පැහැදිලිව ඇතුළත් කර ඇත්නම් ගිණුම ඉක්මනින් අනුමත වේ.',
      'ගිණුම අනුමත වන තෙක් ඔබට "නරඹන්නා ලෙස පිවිසෙන්න (Demo Mode)" හරහා ඇප් එකේ සේවාවන් පරීක්ෂා කළ හැක.',
      'පැය 24කට වඩා ප්‍රමාද වී ඇත්නම් "ගැටලු & උපකාර" පිටුව හරහා පරිපාලක දැනුවත් කරන්න.',
    ],
    actionType: 'open_issues',
    actionLabelSi: '🛠️ පරිපාලක සහාය (Issues & Help)',
  },
];

export function resolveLocalKnowledge(query: string): LocalKnowledgeMatch | null {
  if (!query || !query.trim()) return null;
  const normalized = query.toLowerCase().trim();

  for (const entry of KNOWLEDGE_ENTRIES) {
    const isHit = entry.keywords.some((kw) => normalized.includes(kw.toLowerCase()));
    if (isHit) {
      return {
        matched: true,
        category: entry.category,
        titleSi: entry.titleSi,
        summarySi: entry.summarySi,
        detailedSteps: entry.detailedSteps,
        actionType: entry.actionType || 'none',
        actionLabelSi: entry.actionLabelSi,
      };
    }
  }

  return null;
}
