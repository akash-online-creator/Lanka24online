import { HelpPost } from '../types';

/**
 * Calculates accurate relative elapsed time from the post/message creation time to current viewing time.
 * e.g. "දැන්ම", "මීට තත්පර 15 කට පෙර", "15 seconds ago", "15 வினாடிகளுக்கு முன்"
 */
export function getAccurateElapsedTime(
  createdAt?: string, 
  createdAtMs?: number, 
  nowMs: number = Date.now(),
  lang: 'si' | 'en' | 'ta' | string = 'si'
): string {
  const targetMs = parseTimeToMs(createdAt, createdAtMs);

  if (!targetMs || isNaN(targetMs)) {
    if (lang === 'en') return 'Just now';
    if (lang === 'ta') return 'சற்று முன்';
    return createdAt || 'මීට සුළු මොහොතකට පෙර';
  }

  const diffMs = Math.max(0, nowMs - targetMs);
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (lang === 'en') {
    if (totalSeconds < 10) return 'Just now';
    if (totalSeconds < 60) return `${totalSeconds}s ago`;
    if (totalMinutes < 60) return `${totalMinutes} min${totalMinutes > 1 ? 's' : ''} ago`;
    if (totalHours < 24) {
      const remMins = totalMinutes % 60;
      return remMins === 0 
        ? `${totalHours} hr${totalHours > 1 ? 's' : ''} ago`
        : `${totalHours} hr${totalHours > 1 ? 's' : ''} ${remMins}m ago`;
    }
    const remHours = totalHours % 24;
    if (totalDays < 30) {
      return remHours === 0 
        ? `${totalDays} day${totalDays > 1 ? 's' : ''} ago`
        : `${totalDays}d ${remHours}h ago`;
    }
    const totalMonths = Math.floor(totalDays / 30);
    return `${totalMonths} month${totalMonths > 1 ? 's' : ''} ago`;
  }

  if (lang === 'ta') {
    if (totalSeconds < 10) return 'சற்று முன்';
    if (totalSeconds < 60) return `${totalSeconds} வினாடிகளுக்கு முன்`;
    if (totalMinutes < 60) return `${totalMinutes} நிமிடங்களுக்கு முன்`;
    if (totalHours < 24) {
      const remMins = totalMinutes % 60;
      return remMins === 0 
        ? `${totalHours} மணிநேரத்திற்கு முன்`
        : `${totalHours} மணி ${remMins} நிமிடங்களுக்கு முன்`;
    }
    const remHours = totalHours % 24;
    if (totalDays < 30) {
      return remHours === 0 
        ? `${totalDays} நாட்களுக்கு முன்`
        : `${totalDays} நாள் ${remHours} மணிநேரத்திற்கு முன்`;
    }
    const totalMonths = Math.floor(totalDays / 30);
    return `${totalMonths} மாதங்களுக்கு முன்`;
  }

  if (totalSeconds < 10) {
    return 'දැන්ම (මීට තත්පර කිහිපයකට පෙර)';
  }

  if (totalSeconds < 60) {
    return `මීට තත්පර ${totalSeconds} කට පෙර`;
  }

  if (totalMinutes < 60) {
    return `මීට මිනිත්තු ${totalMinutes} කට පෙර`;
  }

  if (totalHours < 24) {
    const remMins = totalMinutes % 60;
    if (remMins === 0) {
      return `මීට පැය ${totalHours} කට පෙර`;
    }
    return `මීට පැය ${totalHours} යි මිනිත්තු ${remMins} කට පෙර`;
  }

  const remHours = totalHours % 24;
  if (totalDays < 30) {
    if (remHours === 0) {
      return `මීට දින ${totalDays} කට පෙර`;
    }
    return `මීට දින ${totalDays} යි පැය ${remHours} කට පෙර`;
  }

  const totalMonths = Math.floor(totalDays / 30);
  return `මීට මාස ${totalMonths} කට පෙර`;
}

/**
 * Formats a message or thread timestamp to a clean display string (e.g., "01:25 PM", "මීට මිනිත්තු 5 කට පෙර")
 */
export function formatMessageClockTime(timestamp?: string, createdAtMs?: number): string {
  const targetMs = parseTimeToMs(timestamp, createdAtMs);
  if (!targetMs || isNaN(targetMs)) return timestamp || 'දැන්';

  const d = new Date(targetMs);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Parses timestamp strings like "01:21 PM", "12:30 AM", ISO strings, Sinhala relative phrases, or createdAtMs to milliseconds for chronological sorting
 */
export function parseTimeToMs(timestamp?: string | number, createdAtMs?: number): number {
  if (typeof timestamp === 'number' && !isNaN(timestamp) && timestamp > 0) {
    return timestamp;
  }
  if (createdAtMs && typeof createdAtMs === 'number' && !isNaN(createdAtMs) && createdAtMs > 0) {
    return createdAtMs;
  }
  if (!timestamp) return Date.now();

  const str = String(timestamp).trim();

  // If pure digits string
  if (/^\d{10,14}$/.test(str)) {
    const num = parseInt(str, 10);
    if (!isNaN(num)) return num;
  }

  // Handle ISO format or standard date strings (e.g. 2026-08-15T08:30:00Z or "2026-08-15 08:30")
  const parsed = Date.parse(str);
  if (!isNaN(parsed) && parsed > 946684800000) { // after year 2000
    return parsed;
  }

  const now = Date.now();

  // Handle Sinhala relative phrases
  if (str === 'දැන්' || str === 'දැන්ම' || str === 'මෑතකදී' || str.includes('සුළු මොහොතකට පෙර') || str.includes('just now')) {
    return now - 2000;
  }

  // "මීට තත්පර X කට පෙර" or "X seconds ago"
  const secMatch = str.match(/මීට\s*තත්පර\s*(\d+)\s*කට\s*පෙර/i) || str.match(/(\d+)\s*sec(?:ond)?s?\s*ago/i);
  if (secMatch) {
    return now - parseInt(secMatch[1], 10) * 1000;
  }

  // "මීට මිනිත්තු X කට පෙර" or "X minutes ago"
  const minMatch = str.match(/මීට\s*මිනිත්තු\s*(\d+)\s*කට\s*පෙර/i) || str.match(/(\d+)\s*min(?:ute)?s?\s*ago/i);
  if (minMatch) {
    return now - parseInt(minMatch[1], 10) * 60 * 1000;
  }

  // "මීට පැය X යි මිනිත්තු Y කට පෙර" or "මීට පැය X කට පෙර" or "X hours ago"
  const hourMatch = str.match(/මීට\s*පැය\s*(\d+)(?:\s*යි\s*මිනිත්තු\s*(\d+))?\s*කට\s*පෙර/i) || str.match(/(\d+)\s*hour?s?\s*ago/i);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    const mins = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
    return now - (hours * 3600 + mins * 60) * 1000;
  }

  // "මීට දින X යි පැය Y කට පෙර" or "මීට දින X කට පෙර" or "X days ago"
  const dayMatch = str.match(/මීට\s*දින\s*(\d+)(?:\s*යි\s*පැය\s*(\d+))?\s*කට\s*පෙර/i) || str.match(/(\d+)\s*day?s?\s*ago/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    const hours = dayMatch[2] ? parseInt(dayMatch[2], 10) : 0;
    return now - (days * 86400 + hours * 3600) * 1000;
  }

  // "ඊයේ" / "yesterday"
  if (str.includes('ඊයේ') || str.toLowerCase().includes('yesterday')) {
    return now - 86400 * 1000;
  }

  // Handle 12-hour or 24-hour clock formats: "01:40 PM", "12:30 AM", "14:20", "1:20 pm"
  const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    const meridian = timeMatch[4]?.toUpperCase();

    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;

    const d = new Date();
    d.setHours(hours, minutes, seconds, 0);

    // If calculated time is in the future compared to now by > 1 hour, assume it was yesterday
    if (d.getTime() > now + 60000) {
      d.setDate(d.getDate() - 1);
    }
    return d.getTime();
  }

  return now;
}

/**
 * Formats a given timestamp (string or epoch number) into humanized relative time
 */
export function formatRelativeTime(
  timestamp?: number | string,
  lang: 'si' | 'en' | 'ta' | string = 'si'
): string {
  if (!timestamp) {
    return lang === 'en' ? 'Just now' : lang === 'ta' ? 'சற்று முன்' : 'දැන්ම';
  }
  if (typeof timestamp === 'number') {
    return getAccurateElapsedTime(undefined, timestamp, Date.now(), lang);
  }
  return getAccurateElapsedTime(timestamp, undefined, Date.now(), lang);
}

