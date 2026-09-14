export type NotificationType = 
  | 'emergency_blood' 
  | 'quick_service' 
  | 'find_for_me' 
  | 'marketplace_price' 
  | 'group_work' 
  | 'from_me_to_you' 
  | 'general';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  locationName?: string;
  badgeText?: string;
  targetPostId?: string;
  targetModal?: 'blood' | 'quick_service' | 'find_for_me' | 'marketplace' | 'group_work' | 'from_me_to_you' | 'detail';
}

const STORAGE_KEY = 'sahaya_live_notifications';
const SOUND_ENABLED_KEY = 'sahaya_notif_sound_enabled';

// Play sound using Web Audio API synthesis (No external mp3 files required)
export const playNotificationSound = (type: NotificationType = 'general') => {
  try {
    const isSoundEnabled = localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
    if (!isSoundEnabled) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    if (type === 'emergency_blood') {
      // Urgent double beep for emergency blood
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, now + 0.22);
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.4); // A6
      gain2.gain.setValueAtTime(0.35, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.48);

    } else {
      // Pleasant melodic chime for general / quick service / marketplace
      const now = ctx.currentTime;
      const notes = type === 'quick_service' ? [523.25, 659.25, 783.99] : [587.33, 880];
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.1;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.35);
      });
    }
  } catch (e) {
    console.debug('Notification sound not played:', e);
  }
};

// Request Browser Push Notification Permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

// Send Web Push / System Notification if granted
export const triggerBrowserNotification = (notif: AppNotification) => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const iconUrl = notif.type === 'emergency_blood' 
      ? '🩸' 
      : notif.type === 'quick_service' 
      ? '⚡' 
      : notif.type === 'marketplace_price' 
      ? '🏷️' 
      : '🔔';

    const systemNotif = new Notification(notif.title, {
      body: `${notif.message}${notif.locationName ? ` • ${notif.locationName}` : ''}`,
      tag: notif.id,
      badge: '/favicon.ico',
      icon: '/favicon.ico',
    });

    systemNotif.onclick = () => {
      window.focus();
      window.dispatchEvent(new CustomEvent('sahaya_notification_clicked', { detail: notif }));
      systemNotif.close();
    };
  } catch (err) {
    console.debug('Browser notification error:', err);
  }
};

// Initial Seed Notifications if empty
const getInitialSampleNotifications = (): AppNotification[] => [
  {
    id: 'notif-seed-1',
    type: 'emergency_blood',
    title: '🩸 හදිසි ලේ ඉල්ලීමක්!',
    message: 'මීගමුව මූලික රෝහල සඳහා O+ රුධිරය හදිසියේ අවශ්‍යයි.',
    locationName: 'මීගමුව',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    isRead: false,
    badgeText: 'හදිසි',
    targetModal: 'blood',
  },
  {
    id: 'notif-seed-2',
    type: 'quick_service',
    title: '⚡ නව ඉක්මන් සේවාවක්!',
    message: 'කඩවත ප්‍රදේශයේ නිවසක ජලනල හදිසි අලුත්වැඩියාවක් සඳහා කාර්මිකයෙකු අවශ්‍යයි.',
    locationName: 'කඩවත',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isRead: false,
    badgeText: 'ඉක්මන්',
    targetModal: 'quick_service',
  },
  {
    id: 'notif-seed-3',
    type: 'marketplace_price',
    title: '🏷️ වෙළඳපොල නවතම මිල ගණන්!',
    message: 'සහල්, පොල් සහ අත්‍යවශ්‍ය ද්‍රව්‍ය සඳහා අද දින අඩුම තොග සහ සිල්ලර මිල ගණන් යාවත්කාලීන විය.',
    locationName: 'පෑලියගොඩ / කොළඹ',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    isRead: true,
    badgeText: 'හොඳම මිල',
    targetModal: 'marketplace',
  },
  {
    id: 'notif-seed-4',
    type: 'find_for_me',
    title: '🔍 සොයාදෙන්න ඉල්ලීමක්!',
    message: 'නිට්ටඹුව අවටින් කුලී පදනම මත කොන්ක්‍රීට් මික්සර් යන්ත්‍රයක් සොයයි.',
    locationName: 'නිට්ටඹුව',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    isRead: true,
    badgeText: 'සොයාදෙන්න',
    targetModal: 'find_for_me',
  },
];

// Read notifications from storage
export const getStoredNotifications = (): AppNotification[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeds = getInitialSampleNotifications();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
      return seeds;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

// Save a new notification and broadcast to app
export const broadcastAppNotification = (notifData: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'> & { id?: string }) => {
  const current = getStoredNotifications();
  const newNotif: AppNotification = {
    id: notifData.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: notifData.type,
    title: notifData.title,
    message: notifData.message,
    locationName: notifData.locationName,
    badgeText: notifData.badgeText,
    targetPostId: notifData.targetPostId,
    targetModal: notifData.targetModal,
    timestamp: new Date().toISOString(),
    isRead: false,
  };

  const updated = [newNotif, ...current.filter(n => n.id !== newNotif.id)].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Play audio chime
  playNotificationSound(newNotif.type);

  // Trigger web push
  triggerBrowserNotification(newNotif);

  // Trigger local React broadcast event
  window.dispatchEvent(new CustomEvent('sahaya_new_notification', { detail: newNotif }));

  return newNotif;
};

// Mark single notification as read
export const markNotificationAsRead = (notifId: string) => {
  const current = getStoredNotifications();
  const updated = current.map(n => n.id === notifId ? { ...n, isRead: true } : n);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('sahaya_notifications_updated'));
};

// Mark all notifications as read
export const markAllNotificationsAsRead = () => {
  const current = getStoredNotifications();
  const updated = current.map(n => ({ ...n, isRead: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('sahaya_notifications_updated'));
};

// Clear all notifications
export const clearAllNotifications = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  window.dispatchEvent(new CustomEvent('sahaya_notifications_updated'));
};

// Sound setting
export const isNotificationSoundEnabled = (): boolean => {
  return localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
};

export const setNotificationSoundEnabled = (enabled: boolean) => {
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
};
