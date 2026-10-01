import { calculateDistanceKm } from './geoUtils';

export interface GeoFenceCheckResult {
  allowed: boolean;
  distanceMeters: number;
  distanceKm: number;
  reason: 'admin' | 'owner' | 'within_100m' | 'out_of_range' | 'no_gps';
  messageSi: string;
  messageEn: string;
  messageTa: string;
}

/**
 * Validates whether an action (edit or delete) on a guest/unregistered location
 * is permitted based on the 100m Geo-Fence constraint or Administrator role.
 *
 * Rule:
 * ලියාපදිංචි පරිශීලකයෙකු නොවී මෙලෙස ලියාපදිංචි කරන ස්ථානවල තොරතුරු පසුව වෙනස් කිරීම හෝ ඉවත් කිරීම
 * කළ හැක්කේ ලියාපදිංචි කළ ස්ථානයේ සිට 100mක් ඇතුළත සිටින අයෙකුට හෝ ඇඩ්මින්වරයාට පමණි.
 */
export function validate100mGeoFencePermission(
  itemLat?: number,
  itemLng?: number,
  userLat?: number,
  userLng?: number,
  isAdmin: boolean = false,
  isRegisteredOwner: boolean = false
): GeoFenceCheckResult {
  // 1. Admin Override
  if (isAdmin) {
    return {
      allowed: true,
      distanceMeters: 0,
      distanceKm: 0,
      reason: 'admin',
      messageSi: 'පරිපාලක (Admin) බලතල මඟින් වෙනස් කිරීම/ඉවත් කිරීම අනුමතයි.',
      messageEn: 'Approved by Administrator privileges.',
      messageTa: 'நிர்வாகி அனுமதியால் அனுமதிக்கப்பட்டது.',
    };
  }

  // 2. If the user is the authenticated registered owner with account credentials
  if (isRegisteredOwner) {
    return {
      allowed: true,
      distanceMeters: 0,
      distanceKm: 0,
      reason: 'owner',
      messageSi: 'ලියාපදිංචි ගිණුම් හිමිකරු ලෙස අවසර ඇත.',
      messageEn: 'Approved as registered account owner.',
      messageTa: 'பதிவுசெய்த கணக்கு உரிமையாளராக அனுமதிக்கப்பட்டது.',
    };
  }

  // 3. If item or user has no GPS coordinates
  if (itemLat === undefined || itemLng === undefined) {
    return {
      allowed: false,
      distanceMeters: 0,
      distanceKm: 0,
      reason: 'no_gps',
      messageSi: 'මෙම ස්ථානයේ GPS ඛණ්ඩාංක සටහන්ව නොමැත. වෙනස් කිරීමට ඇඩ්මින්වරයෙකු සම්බන්ධ කරගන්න.',
      messageEn: 'No GPS coordinates recorded for this location. Contact an Admin.',
      messageTa: 'இந்த இடத்திற்கான GPS ஆயத்தொலைவுகள் இல்லை. நிர்வாகியை தொடர்பு கொள்ளவும்.',
    };
  }

  if (userLat === undefined || userLng === undefined) {
    return {
      allowed: false,
      distanceMeters: 0,
      distanceKm: 0,
      reason: 'no_gps',
      messageSi: '⚠️ ඔබගේ වත්මන් GPS ස්ථානය තහවුරු කරගැනීමට නොහැකි විය. කරුණාකර GPS On කර නැවත උත්සාහ කරන්න.',
      messageEn: 'Could not verify your current GPS location. Please enable GPS.',
      messageTa: 'உங்கள் தற்போதைய GPS இருப்பிடத்தை சரிபார்க்க முடியவில்லை. தயவுசெய்து GPS ஐ இயக்கவும்.',
    };
  }

  // 4. Calculate Distance in meters
  const distKm = calculateDistanceKm(userLat, userLng, itemLat, itemLng);
  const distMeters = Math.round(distKm * 1000);

  // 100 meters threshold
  const isWithin100m = distMeters <= 100;

  if (isWithin100m) {
    return {
      allowed: true,
      distanceMeters: distMeters,
      distanceKm: distKm,
      reason: 'within_100m',
      messageSi: `✅ ඔබ මෙම ස්ථානයේ සිට මීටර් ${distMeters}ක් (100m ඇතුළත) ආසන්නයේ සිටින බැවින් වෙනස් කිරීමට/ඉවත් කිරීමට අවසර ඇත.`,
      messageEn: `Approved: You are within ${distMeters}m (<100m) of this location.`,
      messageTa: `அனுமதிக்கப்பட்டது: நீங்கள் இந்த இடத்திலிருந்து ${distMeters}m (<100m) தொலைவில் உள்ளீர்கள்.`,
    };
  }

  return {
    allowed: false,
    distanceMeters: distMeters,
    distanceKm: distKm,
    reason: 'out_of_range',
    messageSi: `⛔ අවසර නොමැත: ලියාපදිංචි නොවු ස්ථාන වෙනස් කිරීම හෝ ඉවත් කිරීම කළ හැක්කේ එම ස්ථානයේ සිට මීටර් 100ක් (100m) ඇතුළත සිටින අයෙකුට හෝ ඇඩ්මින්වරයාට පමණි. ඔබ දැනට මීටර් ${distMeters > 1000 ? `${(distMeters/1000).toFixed(1)}km` : `${distMeters}m`} දුරින් සිටී.`,
    messageEn: `Permission denied: Guest-registered places can only be modified/deleted within 100m of the physical location or by an Admin. You are currently ${distMeters > 1000 ? `${(distMeters/1000).toFixed(1)}km` : `${distMeters}m`} away.`,
    messageTa: `அனுமதி மறுக்கப்பட்டது: பதிவு செய்யப்படாத இடங்களை அந்த இடத்திலிருந்து 100 மீட்டருக்குள் இருப்பவர்கள் அல்லது நிர்வாகி மட்டுமே மாற்ற முடியும். நீங்கள் தற்போது ${distMeters}m தொலைவில் உள்ளீர்கள்.`,
  };
}
