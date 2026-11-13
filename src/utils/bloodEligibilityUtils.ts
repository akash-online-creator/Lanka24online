import { HelpPost } from "../types";

export interface BloodEligibilityReport {
  passed: boolean;
  donorBloodGroup: string;
  patientBloodGroup: string;
  isCompatible: boolean;
  lastDonatedStatus: "first_time" | "more_than_4_months" | "recent";
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

// ශ්‍රී ලංකා ජාතික රුධිර පාරවිලයන සේවා සම්මත රුධිර ගැලපුම් වගුව
export const BLOOD_COMPATIBILITY_MATRIX: Record<string, string[]> = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], // Universal Recipient
  "AB-": ["AB-", "A-", "B-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"], // Universal Donor
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
    title: "හොඳින් ජලය පානය කරන්න",
    desc: "ලේ ලබාදීමේ ස්ථානයට හෝ රෝහලට යාමට පෙර ජලය අවම වීදුරු 3-4ක් වත් පානය කර ශරීරය හොඳින් සජලනය (Hydrated) කර තබාගන්න.",
    icon: "💧",
  },
  {
    step: 2,
    title: "පෝෂ්‍යදායී සැහැල්ලු ආහාරයක් ගන්න",
    desc: "රුධිර පරිත්‍යාගයට පැය 2-3කට පෙර කිසිවිටෙකත් හිස්බඩ නොසිට සැහැල්ලු පෝෂ්‍යදායී ආහාරයක් ගන්න (අධික තෙල් සහිත ආහාරවලින් වළකින්න).",
    icon: "🥗",
  },
  {
    step: 3,
    title: "මධ්‍යසාර හා දුම්පානයෙන් වළකින්න",
    desc: "පසුගිය පැය 24 තුළ මධ්‍යසාර හෝ දුම්පානයෙන් මුළුමනින්ම වැළකී සිටිය යුතු අතර ප්‍රමාණවත් විවේකයක් ලබාගෙන පැමිණෙන්න.",
    icon: "🚫",
  },
  {
    step: 4,
    title: "ජාතික හැඳුනුම්පත (NIC) රැගෙන යන්න",
    desc: "ඔබගේ ජාතික හැඳුනුම්පත (NIC), රියදුරු බලපත්‍රය හෝ වලංගු හැඳුනුම් ලියවිල්ලක් රෝහලේ රුධිර බැංකුවට ඉදිරිපත් කිරීමට අනිවාර්යයෙන් රැගෙන යන්න.",
    icon: "🪪",
  },
  {
    step: 5,
    title: "රෝහලේ රුධිර බැංකුව වෙත විස්තර ඉදිරිපත් කරන්න",
    desc: "තේරුම් ගත්තෙමි බොත්තම එබූ පසු ලැබෙන රෝගියාගේ නම, වාට්ටු අංකය සහ ලේ ලබාදීමේ විස්තර ගොනුවේ අංකය හෝ ඡායාරූපය රුධිර බැංකුව වෙත ඉදිරිපත් කරන්න.",
    icon: "🏥",
  },
];

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

// 04. අවසානයේ සාමාන්‍ය සේවා හරහා නොමිලේ ලේ පරිත්‍යාග කළ තැනැත්තාට ස්තූති කරමින් නම සහ ස්ථානය සඳහන් කර දීර්ඝායුෂ ප්‍රාර්ථනා කිරීම
export function createBloodDonationHonorPost(
  donorNameOrParams:
    | string
    | {
        donorName: string;
        donorId?: string;
        bloodGroup?: string;
        hospitalName?: string;
        location?: string;
        posterName?: string;
        posterId?: string;
        originalPostCode?: string;
      },
  hospitalNameArg?: string,
  districtArg?: string
): HelpPost {
  const isObj = typeof donorNameOrParams === 'object' && donorNameOrParams !== null;
  const cleanDonor = (
    (isObj ? donorNameOrParams.donorName : donorNameOrParams) || 'උතුම් පරිත්‍යාගශීලියා'
  ).trim();
  const cleanHosp = (
    (isObj ? donorNameOrParams.hospitalName || donorNameOrParams.location : hospitalNameArg) ||
    'රෝහල'
  ).trim();
  const district = isObj ? donorNameOrParams.location : districtArg;
  const cleanDist =
    district && !cleanHosp.includes(district) ? ` (${district})` : '';
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const postCode = `#SRV-${Math.floor(1000 + Math.random() * 9000)}`;

  const title = `🙏 නොමිලේ උතුම් ලේ පරිත්‍යාගයක් සිදුකළ ${cleanDonor} වෙත හදපිරි ස්තූතිය සහ දීර්ඝායුෂ ප්‍රාර්ථනාව! 🩸❤️`;
  const body =
    `🩸 උතුම් මිනිස් ජීවිතයක් බේරාගැනීම වෙනුවෙන් නොමිලේ ලේ පරිත්‍යාග කළ පින්වත් පරිත්‍යාගශීලියාට අපගේ හදපිරි ගෞරවය සහ ස්තූතිය පුද කර සිටිමු! 🙏\n\n` +
    `👤 ලේ පරිත්‍යාග කළ පුද්ගලයාගේ නම: ${cleanDonor}\n` +
    `🏥 ලේ පරිත්‍යාග කළ ස්ථානය / රෝහල: ${cleanHosp}${cleanDist}\n` +
    `💝 සේවා වර්ගය: සාමාන්‍ය සේවා (නොමිලේ සිදුකළ උතුම් පරිත්‍යාගයකි)\n\n` +
    `🌟 මෙම උතුම් රුධිර පරිත්‍යාග පුණ්‍යකර්මයේ බලයෙන් "${cleanDonor}" මහත්මා / මහත්මියට නිදුක් නීරෝගී සුවය, සතුට, සැනසීම සහ දීර්ඝායුෂ ලැබේවායි අපි හදවතින්ම ප්‍රාර්ථනා කරමු! 🙏🌸`;

  return {
    id: `honor_bld_${nowMs}`,
    postCode,
    title,
    headline: title,
    description: body,
    whatHappened: body,
    content: body,
    whatIsNeeded: `ලේ පරිත්‍යාග කළ පුද්ගලයා: ${cleanDonor} • ලේ පරිත්‍යාග කළ ස්ථානය: ${cleanHosp}${cleanDist} • දීර්ඝායුෂ ප්‍රාර්ථනා කරමු! 🙏`,
    category: 'සාමාන්‍ය සේවා',
    postType: 'blood_donation_honor' as any,
    serviceType: 'general_service' as any,
    tagName: 'සෞඛ්‍ය හා සත්කාර',
    tagCategory: 'සාමාන්‍ය සේවා',
    location: `${cleanHosp}${cleanDist}`,
    locationName: `${cleanHosp}${cleanDist}`,
    district: district || 'ශ්‍රී ලංකා',
    date: 'මේ දැන්',
    createdAt: nowMs,
    createdAtIso: nowIso,
    createdAtMs: nowMs,
    posterId: (isObj && donorNameOrParams.posterId) || 'system_honor',
    posterName: 'සහය සේවා ප්‍රණාම පුවරුව (නොමිලේ)',
    userName: 'සහය සේවා ප්‍රණාම පුවරුව (නොමිලේ)',
    payment: 'නොමිලේ (රු. 0.00)',
    isPinnedEmergency: false,
    priorityLevel: 'normal',
    isResolved: false,
    likesCount: 1,
    replies: [],
    status: 'active',
  } as any;
}
