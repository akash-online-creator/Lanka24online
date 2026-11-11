import { HelpPost, User, RedAlertItem, Issue } from "../types";
import { filterNonDeletedPosts, filterNonDeletedUsers, filterNonDeletedRedAlerts } from "./deletedPostsManager";

// Safe in-memory and LocalStorage wrapper for restrictive WebViews and browsers
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn("LocalStorage read restricted, falling back to memory:", e);
    }
    return memoryStorage[key] || null;
  },
  setItem: (key: string, value: string): void => {
    memoryStorage[key] = value;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn("LocalStorage write restricted, saved to memory:", e);
    }
  },
  removeItem: (key: string): void => {
    delete memoryStorage[key];
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn("LocalStorage remove restricted:", e);
    }
  }
};

// ==========================================
// 📦 Persistent Local Storage for Help Posts (දැන්වීම්)
// ==========================================
export const HELP_POSTS_STORAGE_KEY = "sahaya_help_posts_cache_v2";

export function getStoredHelpPosts(): HelpPost[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(HELP_POSTS_STORAGE_KEY) || localStorage.getItem("sahaya_help_posts");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return filterNonDeletedPosts(parsed);
  } catch (err) {
    console.debug("Error reading stored help posts:", err);
    return [];
  }
}

export function saveHelpPostsToStorage(posts: HelpPost[]): void {
  try {
    if (typeof localStorage === "undefined" || !Array.isArray(posts)) return;
    const clean = filterNonDeletedPosts(posts);
    localStorage.setItem(HELP_POSTS_STORAGE_KEY, JSON.stringify(clean));
    localStorage.setItem("sahaya_help_posts", JSON.stringify(clean));
  } catch (err) {
    console.debug("Error saving help posts to storage:", err);
  }
}

// ==========================================
// 👤 Persistent Local Storage for Users (පරිශීලකයින්)
// ==========================================
export const USERS_STORAGE_KEY = "sahaya_users_cache_v2";

export function getStoredUsers(): User[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return filterNonDeletedUsers(parsed);
  } catch {
    return [];
  }
}

export function saveUsersToStorage(users: User[]): void {
  try {
    if (typeof localStorage === "undefined" || !Array.isArray(users)) return;
    const clean = filterNonDeletedUsers(users).map((u) => {
      if (!u) return u;
      const safeCopy: any = { ...u };
      delete safeCopy.password;
      delete safeCopy.key;
      delete safeCopy.tempPassword;
      delete safeCopy.temporaryPassword;
      delete safeCopy.securityCode;
      delete safeCopy.tempCode;
      delete safeCopy.nicFrontPhotoUrl;
      delete safeCopy.nicBackPhotoUrl;
      delete safeCopy.idCardPhotoUrl;
      return safeCopy as User;
    });
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(clean));
  } catch {}
}

// ==========================================
// 🚨 Persistent Local Storage for Red Alerts (රතු එළිය)
// ==========================================
export const RED_ALERTS_STORAGE_KEY = "sahaya_red_alerts_cache_v2";

export function getStoredRedAlerts(): RedAlertItem[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(RED_ALERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return filterNonDeletedRedAlerts(parsed);
  } catch {
    return [];
  }
}

export function saveRedAlertsToStorage(alerts: RedAlertItem[]): void {
  try {
    if (typeof localStorage === "undefined" || !Array.isArray(alerts)) return;
    const clean = filterNonDeletedRedAlerts(alerts);
    localStorage.setItem(RED_ALERTS_STORAGE_KEY, JSON.stringify(clean));
  } catch {}
}

// ==========================================
// 📝 Persistent Local Storage for Issues / Feedback (ගැටලු හා ප්‍රතිචාර)
// ==========================================
export const ISSUES_STORAGE_KEY = "sahaya_issues_cache_v2";

export function getStoredIssues(): Issue[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(ISSUES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIssuesToStorage(issues: Issue[]): void {
  try {
    if (typeof localStorage === "undefined" || !Array.isArray(issues)) return;
    localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(issues));
  } catch {}
}
