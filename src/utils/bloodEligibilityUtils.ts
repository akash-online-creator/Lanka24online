import { HelpPost } from '../types';

export interface BloodEligibilityReport {
  passed: boolean;
  donorBloodGroup: string;
  patientBloodGroup: string;
  isCompatible: boolean;
  lastDonatedStatus: 'first_time' | 'more_than_4_months' | 'recent';
  weightOk: boolean;
  healthOk: boolean;
  completedAt: string;
  summary: string;
  failureReason?: string;
}

export interface DonorLiveLocation {
  lat: number;
  lng: number;
  updatedAt: string;
  distanceKm?: number;
}

// Standard medical blood compatibility matrix (ශ්‍රී ලංකා ජාතික රුධිර පාරවිලයන සේවා සම්මතය)
export const BLOOD_COMPATIBILITY_MATRIX: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal Recipient
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'], // Universal Donor
};

export function checkBloodCompatibility(donorGroup: string, patientGroup: string): boolean {
  if (!donorGroup || !patientGroup) return false;
  const cleanDonor = donorGroup.trim().toUpperCase();
  const cleanPatient = patientGroup.trim().toUpperCase();
  const allowed = BLOOD_COMPATIBILITY_MATRIX[cleanPatient];
  if (!allowed) return cleanDonor === cleanPatient;
  return allowed.includes(cleanDonor);
}

export interface PreDonationGuideline {
  step: number;
  title: string;
  desc: string;
  icon: string;
}

export const PRE_DONATION_GUIDELINES: PreDonationGuideline[] = [
  {
    step: 1,
    title: 'හොඳින් ජලය පානය කරන්න',
    desc: 'රුධිර පරිත්‍යාගයට පෙර පැය කිහිපය තුළ ජලය අවම වීදුරු 3-4ක් වත් පානය කර ශරීරය හොඳින් සජලනය (Hydrated) කර තබාගන්න.',
    icon: '💧',
  },
  {
    step: 2,
    title: 'පෝෂ්‍යදායී සැහැල්ලු ආහාරයක් ගන්න',
    desc: 'පැය 2-3කට පෙර කිසිවිටෙකත් හිස්බඩ නොසිට සැහැල්ලු පෝෂ්‍යදායී ආහාරයක් හෝ කෙටි කෑමක් ගන්න (අධික තෙල් සහිත ආහාරවලින් වළකින්න).',
    icon: '🥗',
  },
  {
    step: 3,
    title: 'මධ්‍යසාර හා දුම්පානයෙන් වළකින්න',
    desc: 'පසුගිය පැය 24 තුළ මධ්‍යසාර හෝ දුම්පානයෙන් මුළුමනින්ම වැළකී සිටිය යුතු අතර හොඳ විවේකයක් ලබාගෙන පැමිණෙන්න.',
    icon: '🚫',
  },
  {
    step: 4,
    title: 'ජාතික හැඳුනුම්පත (NIC) රැගෙන යන්න',
    desc: 'ඔබගේ ජාතික හැඳුනුම්පත (NIC), රියදුරු බලපත්‍රය හෝ වලංගු හැඳුනුම් ලියවිල්ලක් රෝහලේ රුධිර බැංකුවට ඉදිරිපත් කිරීමට රැගෙන යන්න.',
    icon: '🪪',
  },
  {
    step: 5,
    title: 'රෝහලේ රුධිර බැංකුව (Blood Bank) වෙත යන්න',
    desc: 'රෝහල වෙත ගොස් රුධිර බැංකුවේ වෛද්‍ය නිලධාරීන්ට රෝගියාගේ නම, වාට්ටු අංකය සහ ලේ ඉල්ලුම් පත්‍රිකා අංකය ඉදිරිපත් කරන්න.',
    icon: '🏥',
  },
];

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function createBloodDonationHonorPost(donorName: string, hospitalName: string, district?: string): HelpPost {
  const cleanDonor = (donorName || 'පරිත්‍යාගශීලියා').trim();
  const cleanHosp = (hospitalName || 'රෝහල').trim();
  const cleanDist = district ? ` (${district})` : '';
  const nowIso = new Date().toISOString();
  const title = `🩸 උතුම් රුධිර පරිත්‍යාගයක් වෙනුවෙන් ප්‍රණාමය! 🙏`;
  const body = `❤️ ${cleanDonor} මහත්මා / මහත්මිය අද දින ${cleanHosp}${cleanDist} වෙත උතුම් ලේ පරිත්‍යාගයක් සිදුකර ජීවිතයක් බේරාගැනීමට දායක විය. එම උතුම් කර්තව්‍ය වෙනුවෙන් අපි එතුමාට / එතුමියට දීර්ඝායුෂ හා හදපිරි ස්තූතිය පළකරමු! 🩸🙏`;

  return {
    id: `honor_bld_${Date.now()}`,
    postCode: `#HON-${Math.floor(100 + Math.random() * 900)}`,
    title,
    headline: title,
    whatHappened: body,
    content: body,
    whatIsNeeded: 'උතුම් ලේ පරිත්‍යාගයක් ඇගයීම',
    category: 'emergency',
    postType: 'blood_donation_honor' as any,
    serviceType: 'blood_donation',
    tagName: '❤️ රුධිර පරිත්‍යාග ඇගයීම',
    tagCategory: 'ප්‍රණාමය',
    locationName: cleanHosp,
    district: district || 'ශ්‍රී ලංකා',
    createdAt: nowIso,
    createdAtIso: nowIso,
    userName: 'සහය සේවා රුධිර සත්කාරක අංශය',
    isPinnedEmergency: true,
    priorityLevel: 'emergency',
    likesCount: 1,
    replies: [],
    status: 'active',
  } as any;
}
