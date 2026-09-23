import { collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, OnlinePresenceUser } from '../types';

const STORAGE_KEY_SESSION_ID = 'sahaya_presence_session_id';
const STORAGE_KEY_LOCAL_ONLINE = 'sahaya_local_online_users';

export const getOrCreateSessionId = (): string => {
  let sId = sessionStorage.getItem(STORAGE_KEY_SESSION_ID);
  if (!sId) {
    sId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(STORAGE_KEY_SESSION_ID, sId);
  }
  return sId;
};

const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return '📱 Mobile';
  if (/tablet|ipad/i.test(ua)) return '📱 Tablet';
  return '💻 Desktop';
};

let heartbeatIntervalId: any = null;

/**
 * Start presence heartbeat for current user
 */
export const startPresenceHeartbeat = (
  user: User | null,
  currentView: string = 'dashboard',
  currentDistrict: string = 'සියලු දිස්ත්‍රික්ක'
): void => {
  const sessionId = getOrCreateSessionId();

  const ping = async () => {
    const presenceData: OnlinePresenceUser = {
      sessionId,
      userId: user?.id || user?.userId || `guest_${sessionId.slice(-6)}`,
      userName: user?.name || (user?.isDemo ? 'නරඹන්නා (Guest User)' : 'ආගන්තුක පරිශීලක (Visitor)'),
      userPhone: user?.phone || '',
      userRole: user?.role === 'admin' ? 'admin' : (user ? 'user' : 'guest'),
      district: user?.district || currentDistrict || 'බස්නාහිර',
      currentView: currentView || 'dashboard',
      device: getDeviceType(),
      lastPing: Date.now(),
      isOnline: true,
      joinedAt: parseInt(sessionStorage.getItem('sahaya_sess_joined') || `${Date.now()}`, 10),
    };

    if (!sessionStorage.getItem('sahaya_sess_joined')) {
      sessionStorage.setItem('sahaya_sess_joined', `${Date.now()}`);
    }

    // 1. Save to Local Storage broadcast
    try {
      const localMapStr = localStorage.getItem(STORAGE_KEY_LOCAL_ONLINE);
      const localMap: Record<string, OnlinePresenceUser> = localMapStr ? JSON.parse(localMapStr) : {};
      localMap[sessionId] = presenceData;
      
      // Clean up stale in localMap
      const now = Date.now();
      Object.keys(localMap).forEach(key => {
        if (now - localMap[key].lastPing > 45000) {
          delete localMap[key];
        }
      });
      localStorage.setItem(STORAGE_KEY_LOCAL_ONLINE, JSON.stringify(localMap));
    } catch {
      // Ignore
    }

    // 2. Push to Firestore
    try {
      const docRef = doc(db, 'online_users', sessionId);
      await setDoc(docRef, presenceData, { merge: true });
    } catch {
      // Local fallback in case of offline or Firestore permission notice
    }
  };

  // Immediate ping
  ping();

  // Clean existing interval
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
  }

  // Ping every 20 seconds
  heartbeatIntervalId = setInterval(ping, 20000);

  // Before unload cleanup
  const handleUnload = () => {
    try {
      const docRef = doc(db, 'online_users', sessionId);
      deleteDoc(docRef).catch(() => {});
    } catch {
      // Ignore
    }
  };
  window.addEventListener('beforeunload', handleUnload);
};

/**
 * Stop presence heartbeat
 */
export const stopPresenceHeartbeat = (): void => {
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }
};

export interface PresenceSummaryStats {
  totalOnline: number;
  registeredUsersCount: number;
  guestsCount: number;
  adminsCount: number;
  activeUsers: OnlinePresenceUser[];
  districtCounts: Record<string, number>;
  pageCounts: Record<string, number>;
}

/**
 * Subscribe to real-time online presence for Admin Dashboard
 */
export const subscribeToOnlinePresence = (
  callback: (stats: PresenceSummaryStats) => void
): (() => void) => {
  const parseOnlineUsers = (usersList: OnlinePresenceUser[]) => {
    const now = Date.now();
    // Only users active within the last 45 seconds are truly online
    const activeUsers = usersList.filter(u => u && u.lastPing && (now - u.lastPing < 45000));

    let registeredUsersCount = 0;
    let guestsCount = 0;
    let adminsCount = 0;
    const districtCounts: Record<string, number> = {};
    const pageCounts: Record<string, number> = {};

    activeUsers.forEach(u => {
      if (u.userRole === 'admin') adminsCount++;
      else if (u.userRole === 'user') registeredUsersCount++;
      else guestsCount++;

      const dist = u.district || 'වෙනත්';
      districtCounts[dist] = (districtCounts[dist] || 0) + 1;

      const page = u.currentView || 'මුල් පිටුව';
      pageCounts[page] = (pageCounts[page] || 0) + 1;
    });

    callback({
      totalOnline: activeUsers.length,
      registeredUsersCount,
      guestsCount,
      adminsCount,
      activeUsers: activeUsers.sort((a, b) => b.lastPing - a.lastPing),
      districtCounts,
      pageCounts,
    });
  };

  try {
    const colRef = collection(db, 'online_users');
    const unsubscribeFirestore = onSnapshot(
      colRef,
      (snapshot) => {
        const users: OnlinePresenceUser[] = snapshot.docs.map(d => ({
          sessionId: d.id,
          ...d.data(),
        } as OnlinePresenceUser));
        
        if (users.length > 0) {
          parseOnlineUsers(users);
        } else {
          // Fallback to local
          fallbackToLocalStorage();
        }
      },
      () => {
        fallbackToLocalStorage();
      }
    );

    const fallbackToLocalStorage = () => {
      try {
        const localMapStr = localStorage.getItem(STORAGE_KEY_LOCAL_ONLINE);
        if (localMapStr) {
          const map: Record<string, OnlinePresenceUser> = JSON.parse(localMapStr);
          parseOnlineUsers(Object.values(map));
        }
      } catch {
        // Default empty stats
        callback({
          totalOnline: 1,
          registeredUsersCount: 1,
          guestsCount: 0,
          adminsCount: 0,
          activeUsers: [],
          districtCounts: {},
          pageCounts: {},
        });
      }
    };

    // Also listen to window storage event for multi-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_LOCAL_ONLINE && e.newValue) {
        try {
          const map: Record<string, OnlinePresenceUser> = JSON.parse(e.newValue);
          parseOnlineUsers(Object.values(map));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // Initial check
    fallbackToLocalStorage();

    return () => {
      unsubscribeFirestore();
      window.removeEventListener('storage', handleStorage);
    };
  } catch {
    return () => {};
  }
};
