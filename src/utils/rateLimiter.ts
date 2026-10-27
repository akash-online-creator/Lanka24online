/**
 * Client & Session Post Creation Rate Limiter
 * Enforces a 30-second cooldown between new post submissions to prevent spam,
 * reduce server write pressure, and ensure system stability.
 */

const COOLDOWN_DURATION_MS = 30 * 1000; // 30 seconds
const STORAGE_PREFIX = 'sahaya_rate_limit_post_';

export interface RateLimitStatus {
  isCoolingDown: boolean;
  remainingSeconds: number;
  messageSi: string;
  messageEn: string;
}

export function getPostRateLimitStatus(userKey: string = 'global'): RateLimitStatus {
  if (typeof window === 'undefined') {
    return {
      isCoolingDown: false,
      remainingSeconds: 0,
      messageSi: '',
      messageEn: '',
    };
  }

  const key = `${STORAGE_PREFIX}${userKey || 'guest'}`;
  const lastPostTimeStr = localStorage.getItem(key);

  if (!lastPostTimeStr) {
    return {
      isCoolingDown: false,
      remainingSeconds: 0,
      messageSi: '',
      messageEn: '',
    };
  }

  const lastPostTime = parseInt(lastPostTimeStr, 10);
  const now = Date.now();
  const elapsed = now - lastPostTime;

  if (elapsed < COOLDOWN_DURATION_MS) {
    const remainingMs = COOLDOWN_DURATION_MS - elapsed;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    return {
      isCoolingDown: true,
      remainingSeconds,
      messageSi: `කරුණාකර ඊළඟ දැන්වීම පළ කිරීමට තත්පර ${remainingSeconds} ක් රැඳී සිටින්න.`,
      messageEn: `Please wait ${remainingSeconds}s before publishing your next post.`,
    };
  }

  return {
    isCoolingDown: false,
    remainingSeconds: 0,
    messageSi: '',
    messageEn: '',
  };
}

export function recordPostSubmission(userKey: string = 'global'): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_PREFIX}${userKey || 'guest'}`;
  localStorage.setItem(key, Date.now().toString());
}
