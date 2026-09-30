import React, { useState, useEffect, useRef } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  sendPasswordResetEmail, 
  updatePassword 
} from 'firebase/auth';
import { User, Issue, Language, Theme, ViewMode, Role, BlockedCredential, HelpPost, RegistrationConfig, CategoryItem, TagItem, RedAlertItem } from './types';
import { initialUsers, initialIssues, initialHelpPosts, initialRegistrationConfig, initialCategories } from './data/initialData';
import { getStoredTags, saveTagsToStorage } from './utils/tagUtils';
import { translations } from './data/translations';
import { Header } from './components/Header';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { PendingApprovalView } from './components/PendingApprovalView';
import { WrongLoginModal } from './components/WrongLoginModal';
import { IssuesHelpPage } from './components/IssuesHelpPage';
import { AdminPanel } from './components/AdminPanel';
import { UserDashboard } from './components/UserDashboard';
import { OmniAssistantChatBox } from './components/OmniAssistantChatBox';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { UpdateWhatsAppModal } from './components/UpdateWhatsAppModal';
import { GoogleAuthVerifyModal } from './components/GoogleAuthVerifyModal';
import { DevicePinSetupModal } from './components/DevicePinSetupModal';
import { getOrCreateDeviceId, getStoredDevicePin, clearDevicePin } from './utils/devicePinManager';
import { applyAppFontSize, getStoredFontSize } from './components/UserSettingsModal';
import { 
  auth,
  subscribeToHelpPosts, 
  updateHelpPostInFirestore, 
  deleteHelpPostFromFirestore, 
  seedDemoHelpPostsToFirestore,
  subscribeToUsers,
  saveUserToFirestore,
  updateUserInFirestore,
  deleteUserAccount,
  subscribeToRedAlerts,
  getUserFromFirestore,
  getAllMatchingUsersFromFirestore,
  syncUserPasswordInFirestore,
  markRedAlertAsResolved,
  cancelRedAlertByReporter,
  addReporterUpdateToRedAlert,
  saveIssueToFirestore,
  updateIssueInFirestore
} from './lib/firebase';
import { GpsActivationGate } from './components/GpsActivationGate';
import { grantWelcomeGiftCredit } from './utils/creditManager';
import { activateBackgroundWakeLock } from './utils/notificationManager';
import { 
  filterNonDeletedPosts, 
  addDeletedPostId, 
  removeDeletedPostId, 
  filterNonDeletedRedAlerts,
  filterNonDeletedUsers,
  addDeletedUserId,
  isUserPermanentlyDeleted
} from './utils/deletedPostsManager';
import { captureUserLoginLog, appendLoginHistory } from './utils/loginTracker';
import { broadcastAppNotification } from './utils/notificationManager';
import { RedAlertCreateModal } from './components/RedAlertCreateModal';
import { RedAlertProximityModal } from './components/RedAlertProximityModal';
import { RedAlertDetailModal } from './components/RedAlertDetailModal';
import { RedAlertBanner } from './components/RedAlertBanner';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { PWAInstallModal } from './components/PWAInstallModal';
import { SosLiveViewerModal } from './components/SosLiveViewerModal';
import { SosLiveTrackerModal } from './components/SosLiveTrackerModal';
import { ActiveAlertRingerBanner } from './components/ActiveAlertRingerBanner';
import { triggerPickMeAlert, stopPickMeAlert } from './utils/backgroundAlertEngine';
import { calculateDistanceKm } from './data/redAlertData';
import { deduplicateUsers } from './utils/userUtils';
import { checkIsAdmin } from './utils/postOwnerHelper';
import { ShortcutHubView } from './components/ShortcutHubView';
import { FloatingOverlayWidget } from './components/FloatingOverlayWidget';

// Custom Siren Audio file import
import sirenSoundFile from './assets/mixkit-manual-siren-fire-alert-1652.wav';

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('sahaya_lang');
    return (saved as Language) || 'si';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('sahaya_theme');
    return (saved as Theme) || 'light';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('sahaya_current_user');
      if (saved) {
        const u = JSON.parse(saved);
        // Security rule: Admin accounts MUST always re-authenticate with password/PIN on app launch
        if (u && checkIsAdmin(u)) {
          localStorage.removeItem('sahaya_current_user');
          return null;
        }
        if (u && (u.id || u.userId) && (u.status === 'approved' || u.isDemo)) {
          return u;
        }
      }
    } catch (e) {
      console.warn('Failed to restore saved user session:', e);
    }
    return null;
  });

  const [pending2FAUser, setPending2FAUser] = useState<User | null>(null);
  const [showDevicePinSetupModal, setShowDevicePinSetupModal] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const isGpsVerified = localStorage.getItem('sahaya_gps_verified') === 'true';
    const hasSavedLocation = Boolean(localStorage.getItem('sahaya_current_location'));
    
    // Check if Direct Shortcut Hub is requested via URL
    const isHubRequested = typeof window !== 'undefined' && window.location.search && (
      window.location.search.includes('app=hub') || 
      window.location.search.includes('mode=hub') || 
      window.location.search.includes('shortcut=true') ||
      window.location.search.includes('view=hub') ||
      window.location.search.includes('app=shortcut')
    );

    if (isHubRequested) {
      try {
        sessionStorage.setItem('sahaya_redirect_hub', 'true');
      } catch {}
    }

    // Check if valid normal approved user is already logged in
    const savedUserStr = localStorage.getItem('sahaya_current_user');
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        // Admin accounts must ALWAYS log in explicitly via the login page
        if (savedUser && checkIsAdmin(savedUser)) {
          return isGpsVerified && hasSavedLocation ? 'login' : 'gps_gate';
        }
        if (savedUser && savedUser.status === 'pending') {
          return 'pending';
        }
        if (savedUser && (savedUser.status === 'approved' || savedUser.isDemo)) {
          return isHubRequested ? 'shortcut_hub' : 'dashboard';
        }
      } catch {}
    }

    if (isGpsVerified && hasSavedLocation) {
      return 'login';
    }
    return 'gps_gate';
  });

  const [activeRoleView, setActiveRoleView] = useState<Role>('user');

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('sahaya_users');
      return saved ? filterNonDeletedUsers(deduplicateUsers(JSON.parse(saved))) : filterNonDeletedUsers(deduplicateUsers(initialUsers));
    } catch {
      return filterNonDeletedUsers(deduplicateUsers(initialUsers));
    }
  });

  const [issues, setIssues] = useState<Issue[]>(() => {
    const saved = localStorage.getItem('sahaya_issues');
    return saved ? JSON.parse(saved) : initialIssues;
  });

  const [helpPosts, setHelpPosts] = useState<HelpPost[]>(() => {
    const saved = localStorage.getItem('sahaya_help_posts');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return filterNonDeletedPosts(parsed);
      } catch (e) {
        return filterNonDeletedPosts(initialHelpPosts);
      }
    }
    return filterNonDeletedPosts(initialHelpPosts);
  });

  const [blockedCredentials, setBlockedCredentials] = useState<BlockedCredential[]>(() => {
    const saved = localStorage.getItem('sahaya_blocked_credentials');
    return saved ? JSON.parse(saved) : [];
  });

  const [registrationConfig, setRegistrationConfig] = useState<RegistrationConfig>(() => {
    const saved = localStorage.getItem('sahaya_registration_config');
    return saved ? JSON.parse(saved) : initialRegistrationConfig;
  });

  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    const removedCategoryIds = ['emergency', 'vehicle', 'services', 'group_work'];
    const saved = localStorage.getItem('sahaya_categories');
    if (saved) {
      try {
        let parsed: CategoryItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed = parsed.filter(
            (c) => c && typeof c === 'object' && Boolean(c.id) && !removedCategoryIds.includes(c.id)
          );
          if (parsed.length > 0) return parsed;
        }
      } catch {
        return initialCategories;
      }
    }
    return initialCategories;
  });

  const [tags, setTags] = useState<TagItem[]>(() => getStoredTags());

  const [showWrongLoginModal, setShowWrongLoginModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showUpdateWhatsAppModal, setShowUpdateWhatsAppModal] = useState(false);
  const [targetWhatsAppUserIdentifier, setTargetWhatsAppUserIdentifier] = useState<string>('');
  const [serverTime, setServerTime] = useState('');

  // SOS Live GPS Tracker Modal States
  const [isSosViewerModalOpen, setIsSosViewerModalOpen] = useState(false);
  const [sosViewerSessionId, setSosViewerSessionId] = useState<string>('');
  const [isSosTrackerModalOpen, setIsSosTrackerModalOpen] = useState(false);

  // Auto-open WhatsApp update modal or SOS Live Viewer if requested via URL param
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 1. WhatsApp update param check
        const waParam = urlParams.get('update_whatsapp') || urlParams.get('whatsapp_update') || urlParams.get('wa_update');
        if (waParam) {
          setTargetWhatsAppUserIdentifier(waParam.trim());
          setShowUpdateWhatsAppModal(true);
        }

        // 2. SOS Live GPS Tracking session link check
        const sosParam = urlParams.get('sos_session') || urlParams.get('sos') || urlParams.get('live_sos');
        if (sosParam) {
          setSosViewerSessionId(sosParam.trim());
          setIsSosViewerModalOpen(true);
        }
      }
    } catch (e) {
      console.warn('URL param parse notice:', e);
    }
  }, []);

  // 🚨 24/7 Keep-Alive Wake Lock initialization (prevents app & screen sleep for emergency notifications)
  useEffect(() => {
    activateBackgroundWakeLock().catch(() => {});

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        activateBackgroundWakeLock().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 🔄 20-Second Auto-Sync Engine (Login වූ පසු Logout නොවී සියලුම සේවාවන් තත්පර 20න් 20ට Auto-Sync කර යාවත්කාලීන කිරීම)
  useEffect(() => {
    if (!currentUser) return;

    // Save session continuously
    try {
      localStorage.setItem('sahaya_current_user', JSON.stringify(currentUser));
    } catch {}

    const syncInterval = setInterval(() => {
      try {
        // 1. Sync tags
        const latestTags = getStoredTags();
        setTags(latestTags);

        // 2. Dispatch global event for child components (Marketplace, Services, Blood Bank, Group Works)
        window.dispatchEvent(new CustomEvent('sahaya_sync_all_services', {
          detail: { timestamp: Date.now() }
        }));

        // 3. Keep current user state synchronized with latest user records
        setUsers((currentUsers) => {
          const matched = (currentUsers || []).find(
            (u) =>
              u &&
              (u.id === currentUser.id ||
                u.userId === currentUser.userId ||
                (u.nicNumber && currentUser.nicNumber && u.nicNumber === currentUser.nicNumber))
          );
          if (matched && (matched.credits !== currentUser.credits || matched.status !== currentUser.status || matched.name !== currentUser.name)) {
            setCurrentUser(matched);
            try {
              localStorage.setItem('sahaya_current_user', JSON.stringify(matched));
            } catch {}
          }
          return currentUsers;
        });
      } catch (err) {
        console.warn('Auto-sync cycle notice:', err);
      }
    }, 20000); // exactly 20 seconds

    return () => clearInterval(syncInterval);
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = subscribeToUsers((remoteUsers) => {
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(() => {
          const filtered = filterNonDeletedUsers(remoteUsers);
          const hasAdmin = filtered.some(
            (u) => u && checkIsAdmin(u)
          );
          if (!hasAdmin && initialUsers[0] && !isUserPermanentlyDeleted(initialUsers[0])) {
            return filterNonDeletedUsers(deduplicateUsers([initialUsers[0], ...filtered]));
          }
          return filtered;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const knownHelpPostIdsRef = useRef<Set<string>>(new Set());
  const isInitialHelpPostsLoadRef = useRef<boolean>(true);

  // Real-time synchronization of Help Posts from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToHelpPosts((remotePosts) => {
      if (Array.isArray(remotePosts)) {
        const cleanedRemote = filterNonDeletedPosts(remotePosts as HelpPost[]);
        
        if (isInitialHelpPostsLoadRef.current) {
          cleanedRemote.forEach((p) => {
            if (p && p.id) knownHelpPostIdsRef.current.add(p.id);
          });
          isInitialHelpPostsLoadRef.current = false;
        } else {
          const brandNewPosts = cleanedRemote.filter((p) => p && p.id && !knownHelpPostIdsRef.current.has(p.id));
          if (brandNewPosts.length > 0) {
            window.dispatchEvent(new CustomEvent('sahaya_new_post_published', { detail: { post: brandNewPosts[0] } }));
          }
          brandNewPosts.forEach((newPost) => {
            knownHelpPostIdsRef.current.add(newPost.id);
            const isQuick = newPost.category === 'quick_services' || newPost.category === 'quick' || newPost.tagCategory === 'ඉක්මන් සේවා';
            if (isQuick) {
              triggerPickMeAlert({
                kind: 'quick_service',
                title: '⚡ නව ඉක්මන් සේවා ඇමතුමක් (Quick Service)!',
                message: newPost.whatHappened || newPost.whatIsNeeded || 'නව ඉක්මන් සේවාවක් ඉල්ලා ඇත.',
                locationName: (newPost as any).district || (newPost as any).locationName || (newPost as any).location?.nameSi,
                targetModal: 'quick_service',
                targetPostId: newPost.id,
              });
            }
          });
        }

        setHelpPosts(cleanedRemote);
      }
    });
    return () => unsubscribe();
  }, []);

  const [redAlerts, setRedAlerts] = useState<RedAlertItem[]>(() => {
    try {
      const saved = localStorage.getItem('sahaya_red_alerts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return filterNonDeletedRedAlerts(parsed);
      }
    } catch {}
    return [];
  });

  const [isCreateRedAlertOpen, setIsCreateRedAlertOpen] = useState(false);
  const [selectedDetailAlert, setSelectedDetailAlert] = useState<RedAlertItem | null>(null);
  const [proximityAlertInfo, setProximityAlertInfo] = useState<{ alert: RedAlertItem; distanceKm: number } | null>(null);
  const [dismissedProximityAlertIds, setDismissedProximityAlertIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sahaya_dismissed_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [myCreatedAlertIds, setMyCreatedAlertIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sahaya_my_created_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isFloatingOverlayDismissed, setIsFloatingOverlayDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sahaya_hide_floating_overlay') === 'true';
    } catch {
      return false;
    }
  });

  const sirenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlayedAlertIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const knownAlertIdsRef = useRef<Set<string>>(new Set());
  const isInitialAlertsLoadRef = useRef<boolean>(true);
  const previousRedAlertsRef = useRef<RedAlertItem[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToRedAlerts((remoteAlerts) => {
      const newAlerts = filterNonDeletedRedAlerts(remoteAlerts || []);
      
      if (isInitialAlertsLoadRef.current) {
        newAlerts.forEach((a) => {
          if (a && a.id) knownAlertIdsRef.current.add(a.id);
        });
        isInitialAlertsLoadRef.current = false;
      } else {
        const brandNewAlerts = newAlerts.filter((a) => a && a.id && !knownAlertIdsRef.current.has(a.id) && a.status === 'active');
        
        brandNewAlerts.forEach((latestAlert) => {
          knownAlertIdsRef.current.add(latestAlert.id);

          // 🚨 PickMe-style background audio ringtone + push notification
          triggerPickMeAlert({
            kind: 'red_alert',
            title: latestAlert.disasterTitleSi || '🚨 හදිසි ආපදා අනතුරු ඇඟවීමක් (Red Alert)!',
            message: latestAlert.description || 'නව හදිසි අනතුරක් වාර්තා වී ඇත.',
            locationName: latestAlert.locationName || (latestAlert as any).district || (latestAlert as any).districtName,
            targetModal: 'red_alert',
            targetPostId: latestAlert.id,
          });

          setSelectedDetailAlert(latestAlert);
        });

        if (previousRedAlertsRef.current.length > 0) {
          previousRedAlertsRef.current.forEach((prevAlert) => {
            if (!prevAlert || !prevAlert.id) return;
            const updatedAlert = newAlerts.find((a) => a && a.id === prevAlert.id);

            if (prevAlert.status === 'active' && updatedAlert?.status === 'resolved') {
              const msg = updatedAlert.statusChangeMessage || "✅ දැනුම්දීම පලකළ තැනැත්තා විසින් මෙම ආපදාව විසඳුණු බව සටහන් කළේය.";
              setToastMessage(msg);
              setTimeout(() => setToastMessage(null), 6000);
            }

            else if (prevAlert.status === 'active' && updatedAlert?.status === 'cancelled') {
              const msg = updatedAlert.statusChangeMessage || "ℹ️ දැනුම්දීම පලකළ තැනැත්තා විසින් මෙම ආපදා නිවේදනය ඉවත් කරගන්නා ලදී.";
              setToastMessage(msg);
              setTimeout(() => setToastMessage(null), 6000);
            }

            else if (
              updatedAlert &&
              updatedAlert.status === 'active' &&
              updatedAlert.latestReporterUpdate &&
              updatedAlert.latestReporterUpdate.createdAt !== prevAlert.latestReporterUpdate?.createdAt
            ) {
              const msg = updatedAlert.latestReporterUpdate.notificationText || `💬 වාර්තාකරුගෙන් අලුත් යාවත්කාලීන කිරීමක්: ${updatedAlert.latestReporterUpdate.text}`;
              setToastMessage(msg);
              setTimeout(() => setToastMessage(null), 6000);
            }
          });
        }
      }

      previousRedAlertsRef.current = newAlerts;
      setRedAlerts(newAlerts);
    });
    return () => unsubscribe();
  }, []);

  // Global Notification & Service Worker message router
  useEffect(() => {
    const handleNotifClick = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      stopPickMeAlert();
      if (detail.targetModal === 'red_alert' && detail.targetPostId) {
        const matched = redAlerts.find((a) => a.id === detail.targetPostId);
        if (matched) setSelectedDetailAlert(matched);
      }
    };

    window.addEventListener('sahaya_notification_clicked', handleNotifClick);
    return () => {
      window.removeEventListener('sahaya_notification_clicked', handleNotifClick);
    };
  }, [redAlerts]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation access fallback:', err.message);
          setUserCoords((prev) => prev || { lat: 6.9972, lng: 79.9535 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );

      return () => {
        navigator.geolocation.clearWatch(geoWatchId);
      };
    } else {
      setUserCoords({ lat: 6.9972, lng: 79.9535 });
    }
  }, []);

  useEffect(() => {
    if (!userCoords || redAlerts.length === 0) {
      if ((window as any).emergencySiren) {
        (window as any).emergencySiren.pause();
        (window as any).emergencySiren.currentTime = 0;
        (window as any).emergencySiren = null;
      }
      if (sirenTimerRef.current) clearTimeout(sirenTimerRef.current);
      setProximityAlertInfo(null);
      return;
    }

    const nearAlert = redAlerts.find((alert) => {
      if (!alert || !alert.id) return false;
      if (alert.status !== 'active') return false;
      if (alert.isFlaggedFake) return false;
      if (typeof alert.latitude !== 'number' || typeof alert.longitude !== 'number') return false;
      if (typeof userCoords?.lat !== 'number' || typeof userCoords?.lng !== 'number') return false;

      if (dismissedProximityAlertIds.includes(alert.id)) return false;

      const isCreatedByMe = 
        (currentUser && (alert.reportedByUserId === currentUser?.id || alert.reportedByUserId === currentUser?.userId)) ||
        myCreatedAlertIds.includes(alert.id);
      if (isCreatedByMe) return false;

      const dist = calculateDistanceKm(
        userCoords.lat,
        userCoords.lng,
        alert.latitude,
        alert.longitude
      );
      // 🚨 Proximity alert radius increased to 5.0 km
      return dist <= 5.0;
    });

    if (nearAlert) {
      const dist = calculateDistanceKm(
        userCoords.lat,
        userCoords.lng,
        nearAlert.latitude,
        nearAlert.longitude
      );

      setProximityAlertInfo({ alert: nearAlert, distanceKm: dist });

      if (!(window as any).emergencySiren || lastPlayedAlertIdRef.current !== nearAlert.id) {
        if ((window as any).emergencySiren) {
          (window as any).emergencySiren.pause();
          (window as any).emergencySiren.currentTime = 0;
        }
        if (sirenTimerRef.current) clearTimeout(sirenTimerRef.current);

        localStorage.removeItem('sahaya_custom_siren_url');
        localStorage.removeItem('sahaya_siren_tone');

        const siren = new Audio(sirenSoundFile);
        siren.loop = true;
        siren.play().catch((e) => console.log('Audio Play Blocked by browser:', e));
        (window as any).emergencySiren = siren;
        lastPlayedAlertIdRef.current = nearAlert.id;

        sirenTimerRef.current = setTimeout(() => {
          if ((window as any).emergencySiren) {
            (window as any).emergencySiren.pause();
            (window as any).emergencySiren.currentTime = 0;
            (window as any).emergencySiren = null;
          }
        }, 60000);
      }
    } else {
      if ((window as any).emergencySiren) {
        (window as any).emergencySiren.pause();
        (window as any).emergencySiren.currentTime = 0;
        (window as any).emergencySiren = null;
      }
      if (sirenTimerRef.current) clearTimeout(sirenTimerRef.current);
      setProximityAlertInfo(null);
    }
  }, [redAlerts, userCoords, dismissedProximityAlertIds, myCreatedAlertIds, currentUser]);

  useEffect(() => {
    localStorage.setItem('sahaya_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.removeItem('sahaya_current_user');
    localStorage.removeItem('sahaya_view_mode');
  }, []);

  useEffect(() => {
    localStorage.setItem('sahaya_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sahaya_users', JSON.stringify(filterNonDeletedUsers(users)));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('sahaya_issues', JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem('sahaya_help_posts', JSON.stringify(filterNonDeletedPosts(helpPosts)));
  }, [helpPosts]);

  useEffect(() => {
    localStorage.setItem('sahaya_red_alerts', JSON.stringify(filterNonDeletedRedAlerts(redAlerts)));
  }, [redAlerts]);

  useEffect(() => {
    localStorage.setItem('sahaya_blocked_credentials', JSON.stringify(blockedCredentials));
  }, [blockedCredentials]);

  useEffect(() => {
    localStorage.setItem('sahaya_registration_config', JSON.stringify(registrationConfig));
  }, [registrationConfig]);

  useEffect(() => {
    localStorage.setItem('sahaya_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    saveTagsToStorage(tags);
  }, [tags]);

  useEffect(() => {
    applyAppFontSize(getStoredFontSize());
    const updateTime = () => {
      const now = new Date();
      setServerTime(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isCredentialBlocked = (checkStr: string): boolean => {
    if (!checkStr) return false;
    const cleanStr = checkStr.trim().toLowerCase();
    return blockedCredentials.some(
      (bc) =>
        (bc.phone && bc.phone.trim().toLowerCase() === cleanStr) ||
        (bc.nicNumber && bc.nicNumber.trim().toLowerCase() === cleanStr) ||
        (bc.email && bc.email.trim().toLowerCase() === cleanStr) ||
        (bc.ipAddress && bc.ipAddress.trim().toLowerCase() === cleanStr) ||
        (bc.userId && bc.userId.trim().toLowerCase() === cleanStr)
    );
  };

  const handleUserDemoLogin = () => {
    const demoUser: User = {
      id: 'demo-user-guest',
      userId: 'DEMO-GUEST',
      name: 'නරඹන්නා (Demo User)',
      email: 'guest@sahayasewa.lk',
      nicNumber: '000000000V',
      phone: '0700000000',
      role: 'user',
      status: 'approved',
      registeredAt: new Date().toISOString(),
      key: 'demo',
      isDemo: true,
    };
    setCurrentUser(demoUser);
    setActiveRoleView('user');
    setViewMode('dashboard');
  };

  // ✅ 1. NIC + Password මගින් Firebase Auth හරහා ආරක්ෂිතව ලොග් වීම
  const handleLogin = async (userIdInput: string, keyInput: string) => {
    try {
      console.log("--- Login Attempt Started ---");
      const cleanInput = (userIdInput || "").trim().toLowerCase();
      const cleanInputUpper = (userIdInput || "").trim().toUpperCase();
      const submittedPassword = (keyInput || "").trim();

      if (cleanInput === 'demo_user' || cleanInput === 'demo') {
        handleUserDemoLogin();
        return;
      }

      // Admin විශේෂ ලොග් වීම
      if (
        (userIdInput.toUpperCase() === '970181547V' && submittedPassword === '1691@@Devhas') ||
        (userIdInput === 'admin' && submittedPassword === 'admin123')
      ) {
        const adminUser = users.find((u) => u && (u.userId === '970181547V' || checkIsAdmin(u))) || initialUsers[0];
        setCurrentUser(adminUser);
        setActiveRoleView('admin');
        setViewMode('admin');
        return;
      }

      if (isCredentialBlocked(cleanInput)) {
        alert('⛔ අවධානයයි: ඔබගේ ගිණුම හෝ හැඳුනුම්පත පරිපාලක (Admin) විසින් අවහිර කර ඇත.');
        return;
      }

      // Local state එකෙන් පරිශීලකයා කලින්ම සොයා ගැනීම (Fast-Path)
      const numericInput = cleanInput.replace(/[^0-9]/g, '');
      const localMatchedUser = (users || []).find(
        (u) =>
          u && (
            (u.userId && (u.userId.toLowerCase() === cleanInput || u.userId.toUpperCase() === cleanInputUpper)) ||
            (u.nicNumber && (u.nicNumber.toLowerCase() === cleanInput || u.nicNumber.toUpperCase() === cleanInputUpper)) ||
            (numericInput && (u.userNumericId === numericInput || (u.nicNumber && u.nicNumber.replace(/[^0-9]/g, '') === numericInput))) ||
            (u.phone && u.phone.toLowerCase() === cleanInput)
          )
      );

      // NIC අංකය ඊමේල් format එකකට හරවා Firebase Auth එකෙන් පරික්ෂා කිරීම
      const formattedEmail = `${cleanInput}@app.com`;
      let authUser: any = null;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, formattedEmail, submittedPassword);
        authUser = userCredential?.user || null;
      } catch (authError: any) {
        console.warn("Firebase Auth Login check notice:", authError?.message || authError);
      }

      // Firestore එකෙන් තත්පර 2.5ක timeout එකක් සහිතව පරිශීලකයා ලබා ගැනීම (UI Freeze වීම වැළැක්වීමට)
      let foundUser: any = null;
      try {
        const firestorePromise = getUserFromFirestore(cleanInput);
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2500));
        foundUser = await Promise.race([firestorePromise, timeoutPromise]);
      } catch (e) {
        console.warn("Firestore user fetch skipped/failed:", e);
      }

      if (!foundUser) {
        foundUser = localMatchedUser;
      } else if (localMatchedUser) {
        // If local user has updated password more recently, preserve it
        const isLocalNewer = new Date(localMatchedUser.updatedAt || 0) >= new Date(foundUser.updatedAt || 0);
        if (isLocalNewer && localMatchedUser.key) {
          foundUser.key = localMatchedUser.key;
          foundUser.password = localMatchedUser.password || localMatchedUser.key;
          foundUser.securityCode = localMatchedUser.securityCode || localMatchedUser.key;
          foundUser.isPasswordChanged = localMatchedUser.isPasswordChanged ?? true;
          foundUser.isTemporaryPassword = localMatchedUser.isTemporaryPassword ?? false;
        }
      }

      if (!foundUser) {
        try {
          const resp = await fetch(`/api/user/lookup?q=${encodeURIComponent(cleanInputUpper)}`);
          if (resp.ok) {
            const data = await resp.json();
            if (data?.user) {
              foundUser = data.user;
            }
          }
        } catch {}
      }

      if (!foundUser) {
        try {
          const raw = localStorage.getItem('sahaya_users');
          if (raw) {
            const parsed: User[] = JSON.parse(raw);
            const foundInStorage = (parsed || []).find(
              (u) =>
                u && (
                  (u.userId && (u.userId.toLowerCase() === cleanInput || u.userId.toUpperCase() === cleanInputUpper)) ||
                  (u.nicNumber && (u.nicNumber.toLowerCase() === cleanInput || u.nicNumber.toUpperCase() === cleanInputUpper)) ||
                  (numericInput && (u.userNumericId === numericInput || (u.nicNumber && u.nicNumber.replace(/[^0-9]/g, '') === numericInput))) ||
                  (u.phone && u.phone.toLowerCase() === cleanInput)
                )
            );
            if (foundInStorage) {
              foundUser = foundInStorage;
            }
          }
        } catch {}
      }

      if (!foundUser && authUser) {
        foundUser = {
          id: authUser.uid,
          userId: cleanInput.toUpperCase(),
          name: authUser.displayName || cleanInput.toUpperCase(),
          email: authUser.email || formattedEmail,
          nicNumber: cleanInput.toUpperCase(),
          phone: '',
          role: 'user',
          status: 'approved',
          registeredAt: new Date().toISOString(),
        };
      }

      if (!foundUser) {
        setShowWrongLoginModal(true);
        return;
      }

      // Ensure standard default status and role
      foundUser = {
        ...foundUser,
        status: foundUser.status || 'approved',
        role: foundUser.role || 'user',
      };

      // AuthUser හරහා ලොග් නොවූයේ නම් (හෝ Auth provider disabled නම්) Firestore / Local දත්ත මගින් මුරපදය පරීක්ෂා කිරීම
      if (!authUser) {
        const userKey = (foundUser.key || '').trim();
        const userPass = ((foundUser as any).password || '').trim();
        const userTemp = (foundUser.tempCode || '').trim();
        const userSec = (foundUser.securityCode || '').trim();
        const userTempPw = ((foundUser as any).tempPassword || '').trim();

        const matchingLocalUsers = (users || []).filter(
          (u) =>
            u && (
              (u.userId && (u.userId.toLowerCase() === cleanInput || u.userId.toUpperCase() === cleanInputUpper)) ||
              (u.nicNumber && (u.nicNumber.toLowerCase() === cleanInput || u.nicNumber.toUpperCase() === cleanInputUpper)) ||
              (numericInput && (u.userNumericId === numericInput || (u.nicNumber && u.nicNumber.replace(/[^0-9]/g, '') === numericInput))) ||
              (u.phone && u.phone.toLowerCase() === cleanInput)
            )
        );

        const isPasswordCorrect =
          (userKey && userKey === submittedPassword) ||
          (userPass && userPass === submittedPassword) ||
          (userTemp && userTemp === submittedPassword) ||
          (userSec && userSec === submittedPassword) ||
          (userTempPw && userTempPw === submittedPassword) ||
          (localMatchedUser && (
            (localMatchedUser.key && localMatchedUser.key.trim() === submittedPassword) ||
            ((localMatchedUser as any).password && (localMatchedUser as any).password.trim() === submittedPassword) ||
            (localMatchedUser.securityCode && localMatchedUser.securityCode.trim() === submittedPassword)
          )) ||
          matchingLocalUsers.some(
            (u) =>
              (u.key && u.key.trim() === submittedPassword) ||
              ((u as any).password && (u as any).password.trim() === submittedPassword) ||
              (u.tempCode && u.tempCode.trim() === submittedPassword) ||
              (u.securityCode && u.securityCode.trim() === submittedPassword) ||
              ((u as any).tempPassword && (u as any).tempPassword.trim() === submittedPassword)
          );

        if (!isPasswordCorrect) {
          setShowWrongLoginModal(true);
          return;
        }
      }

      if (foundUser.status === 'blocked' || (foundUser as any).isBlocked) {
        alert(`⛔ අවධානයයි: පරිපාලක විසින් ඔබගේ ගිණුම අවහිර කර ඇත.\nහේතුව: ${foundUser.blockedReason || 'නීති රීති උල්ලංඝනය කිරීම'}`);
        return;
      }

      // Non-blocking Login Audit Log (background update without freezing login UI)
      const userToLog = { ...foundUser };
      (async () => {
        try {
          let gpsCoords: { lat: number; lng: number } | undefined;
          const savedLat = localStorage.getItem('sahaya_current_lat');
          const savedLng = localStorage.getItem('sahaya_current_lng');
          if (savedLat && savedLng) {
            gpsCoords = { lat: parseFloat(savedLat), lng: parseFloat(savedLng) };
          }
          const loginLog = await captureUserLoginLog(gpsCoords);
          const updatedHistory = appendLoginHistory(userToLog.loginHistory, loginLog, 20);
          if (userToLog.id) {
            updateUserInFirestore(userToLog.id, {
              loginHistory: updatedHistory,
              ipAddress: loginLog.ipAddress,
              lastLoginAt: loginLog.timestamp,
            }).catch((err) => console.warn("Login history persistence warning:", err));
          }
        } catch (logErr) {
          console.warn("Login history recording error:", logErr);
        }
      })();

      console.log("Login Successful! Setting User State...");
      
      // If user has 2FA enabled, prompt for TOTP verification code before finalizing login
      if (foundUser.twoFactorEnabled === true && foundUser.twoFactorSecret) {
        setPending2FAUser(foundUser);
        return;
      }

      completeSuccessfulLogin(foundUser);

    } catch (error) {
      console.error("Login verification failed with an exception:", error);
      alert("අන්තර්ජාල සම්බන්ධතා දෝෂයක්. කරුණාකර නැවත උත්සාහ කරන්න.");
    }
  };

  const completeSuccessfulLogin = (authenticatedUser: User) => {
    const userRole = (authenticatedUser.role as string) || 'user';
    const userStatus = authenticatedUser.status || 'approved';

    const normalizedUser: User = {
      ...authenticatedUser,
      role: userRole as any,
      status: userStatus as any,
    };

    setCurrentUser(normalizedUser);
    setUsers((prev) => {
      const exists = (prev || []).some(
        (u) => u && (u.id === normalizedUser.id || (u.nicNumber && normalizedUser.nicNumber && u.nicNumber === normalizedUser.nicNumber))
      );
      const nextUsers = deduplicateUsers(
        exists
          ? (prev || []).map((u) =>
              u && (u.id === normalizedUser.id || (u.nicNumber && normalizedUser.nicNumber && u.nicNumber === normalizedUser.nicNumber))
                ? { ...u, ...normalizedUser }
                : u
            )
          : [normalizedUser, ...(prev || [])]
      );

      try {
        localStorage.setItem('sahaya_users', JSON.stringify(nextUsers));
        localStorage.setItem('sahaya_current_user', JSON.stringify(normalizedUser));
      } catch {}
      return nextUsers;
    });

    if (checkIsAdmin(normalizedUser)) {
      setActiveRoleView('admin');
      setViewMode('admin');
    } else if (userStatus === 'pending') {
      setViewMode('pending');
    } else if (userStatus === 'rejected') {
      setShowWrongLoginModal(true);
    } else {
      setViewMode('dashboard');
      // මුල්වරට ලියාපදිංචි වූ පරිශීලකයන්ට නොව, පරිපාලක Reset කළ තාවකාලික මුරපද සහිත පරිශීලකයන්ට පමණක් Change Password පෙන්වයි
      const needsPasswordChange =
        !checkIsAdmin(normalizedUser) &&
        normalizedUser.isTemporaryPassword === true;
      if (needsPasswordChange) {
        setShowChangePasswordModal(true);
      } else if (!checkIsAdmin(normalizedUser) && !normalizedUser.isDemo && userStatus === 'approved') {
        // Device Quick PIN Setup Prompt
        const currentDeviceId = getOrCreateDeviceId();
        const storedPin = getStoredDevicePin();
        const userIdentifier = normalizedUser.id || normalizedUser.userId || normalizedUser.nicNumber;

        // If user logged in from this new device, update activeDeviceId in remote profile
        if (normalizedUser.id && normalizedUser.activeDeviceId && normalizedUser.activeDeviceId !== currentDeviceId) {
          updateUserInFirestore(normalizedUser.id, {
            activeDeviceId: currentDeviceId,
            deviceSessionToken: `token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            devicePinUpdatedAt: new Date().toISOString(),
          }).catch((e) => console.warn('Active device update notice:', e));
        }

        // If this device doesn't have a 4-digit PIN setup for this user yet, prompt
        if (!storedPin || storedPin.userId !== userIdentifier) {
          setTimeout(() => {
            setShowDevicePinSetupModal(true);
          }, 1200);
        }
      }
    }
  };

  // ✅ 2. අලුත් පරිශීලකයන් ලියාපදිංචි කිරීම (Firebase Auth + Firestore)
  const handleRegister = async (newUser: Omit<User, 'id' | 'registeredAt'>) => {
    const rawPassword = (newUser.key || (newUser as any).password || "").trim();
    if (!rawPassword) {
      alert('⛔ දෝෂයකි: ගිණුමක් සෑදීම සඳහා මුරපදයක් ඇතුළත් කිරීම අනිවාර්ය වේ.');
      return;
    }

    const isBlocked =
      isCredentialBlocked(newUser.phone) ||
      isCredentialBlocked(newUser.nicNumber) ||
      isCredentialBlocked(newUser.email) ||
      isCredentialBlocked(newUser.ipAddress || '') ||
      (users || []).some(
        (u) =>
          u &&
          u.status === 'blocked' &&
          (u.phone === newUser.phone ||
            u.nicNumber === newUser.nicNumber ||
            u.email === newUser.email)
      );

    if (isBlocked) {
      alert('⛔ අවධානයයි: ඔබගේ දුරකථන අංකය, ජා.හැ. අංකය, Gmail ලිපිනය හෝ IP ලිපිනය අවහිර කර ඇත.');
      return;
    }

    const cleanNic = (newUser.nicNumber || newUser.userId || "").trim().toLowerCase();
    const formattedEmail = `${cleanNic}@app.com`;

    try {
      let uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // 1. Firebase Auth හි පරිශීලක ගිණුම සෑදීමට උත්සාහ කිරීම (Graceful)
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, formattedEmail, rawPassword);
        if (userCredential?.user?.uid) {
          uid = userCredential.user.uid;
        }
      } catch (authErr: any) {
        console.warn("Firebase Auth Register notice (continuing with Firestore user):", authErr?.message || authErr);
      }

      // 2. පාස්වර්ඩ් එකත් සමග අනිත් දත්ත Firestore හි සේව් කිරීම
      const createdUser: User = {
        ...newUser,
        id: uid,
        userId: newUser.userId || cleanNic.toUpperCase(),
        nicNumber: (newUser.nicNumber || cleanNic).toUpperCase(),
        key: rawPassword,
        password: rawPassword,
        isPasswordChanged: true,
        isTemporaryPassword: false,
        ipAddress: newUser.ipAddress || `192.168.1.${Math.floor(100 + Math.random() * 150)}`,
        registeredAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };

      setUsers((prev) => {
        const next = deduplicateUsers([createdUser, ...(prev || [])]);
        try {
          localStorage.setItem('sahaya_users', JSON.stringify(next));
        } catch {}
        return next;
      });

      // Background Firestore save with 3s timeout
      saveUserToFirestore(createdUser).catch((err) => {
        console.warn('saveUserToFirestore background notice:', err);
      });

      setCurrentUser(null);
      setViewMode('login');
    } catch (error: any) {
      console.error("Registration error:", error);
      alert(`⛔ ලියාපදිංචි වීම අසාර්ථක විය: ${error.message || 'නැවත උත්සාහ කරන්න.'}`);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('sahaya_current_user');
      sessionStorage.removeItem('sahaya_current_user');
    } catch {}
    setCurrentUser(null);
    setActiveRoleView('user');
    setViewMode('login');
  };

  const handleApproveUser = (targetUserId: string) => {
    const targetUser = (users || []).find((u) => u && (u.id === targetUserId || u.userId === targetUserId));
    if (targetUser && targetUser.id) {
      const isGift = !targetUser.welcomeGiftCredited;
      if (isGift) {
        grantWelcomeGiftCredit(targetUser);
      }
      const updatedFields: Partial<User> = {
        status: 'approved',
        ...(isGift ? { credits: (targetUser.credits ?? 0) + 100, welcomeGiftCredited: true } : {})
      };
      updateUserInFirestore(targetUser.id, updatedFields).catch((err) => console.warn(err));
    }

    setUsers((prev) =>
      (prev || []).map((u) => {
        if (!u) return u;
        if (u.id === targetUserId || u.userId === targetUserId) {
          if (!u.welcomeGiftCredited) {
            grantWelcomeGiftCredit(u);
            return {
              ...u,
              status: 'approved',
              credits: (u.credits ?? 0) + 100,
              welcomeGiftCredited: true,
            };
          }
          return { ...u, status: 'approved' };
        }
        return u;
      })
    );
  };

  const handleRejectUser = (targetUserId: string, reason?: string) => {
    const targetUser = (users || []).find((u) => u && (u.id === targetUserId || u.userId === targetUserId));
    if (targetUser && targetUser.id) {
      updateUserInFirestore(targetUser.id, { status: 'rejected', rejectionReason: reason }).catch((err) => console.warn(err));
    }

    setUsers((prev) =>
      (prev || []).map((u) =>
        u && (u.id === targetUserId || u.userId === targetUserId)
          ? { ...u, status: 'rejected', rejectionReason: reason }
          : u
      )
    );
  };

  // ✅ පරිශීලක ගිණුමක් සම්පූර්ණයෙන්ම ඉවත් කිරීම (Delete User from state, storage, and Firestore)
  const handleDeleteUser = async (targetUserId: string) => {
    const targetUser = (users || []).find(
      (u) => u && (u.id === targetUserId || u.userId === targetUserId || u.nicNumber === targetUserId)
    );

    // 1. ස්ථිරවම Deleted ලැයිස්තුවට එක් කිරීම (never reappear)
    addDeletedUserId(targetUserId);
    if (targetUser) {
      if (targetUser.id) addDeletedUserId(targetUser.id);
      if (targetUser.userId) addDeletedUserId(targetUser.userId);
      if (targetUser.nicNumber) addDeletedUserId(targetUser.nicNumber);
    }

    // 2. React State එකෙන් ඉවත් කිරීම
    setUsers((prev) =>
      filterNonDeletedUsers(
        (prev || []).filter(
          (u) => u && u.id !== targetUserId && u.userId !== targetUserId && u.nicNumber !== targetUserId
        )
      )
    );

    // 3. Local Storage එකෙන් ඉවත් කිරීම
    try {
      const saved = localStorage.getItem('sahaya_users');
      if (saved) {
        const parsed: User[] = JSON.parse(saved);
        const filtered = filterNonDeletedUsers(
          (parsed || []).filter(
            (u) => u && u.id !== targetUserId && u.userId !== targetUserId && u.nicNumber !== targetUserId
          )
        );
        localStorage.setItem('sahaya_users', JSON.stringify(filtered));
      }
    } catch (err) {
      console.warn('Delete user localStorage error:', err);
    }

    // 4. Firestore දත්ත ගබඩාවෙන් ඉවත් කිරීම
    try {
      await deleteUserAccount(targetUser || targetUserId, true);
    } catch (err) {
      console.warn('Delete user Firestore error:', err);
    }
  };

  // ✅ පරිශීලක දත්ත Firestore හා Auth හි යාවත්කාලීන කිරීම (Safe user data & password persistence)
  const handleUpdateUser = async (updatedUser: User) => {
    try {
      // 1. Immediately update local state & localStorage
      setUsers((prev) => {
        const nextUsers = deduplicateUsers(
          (prev || []).map((u) => {
            if (!u) return u;
            const isMatch =
              (updatedUser?.id && u.id === updatedUser.id) ||
              (u.nicNumber && updatedUser?.nicNumber && u.nicNumber.toLowerCase() === updatedUser.nicNumber.toLowerCase()) ||
              (u.userId && updatedUser?.userId && u.userId.toLowerCase() === updatedUser.userId.toLowerCase()) ||
              (updatedUser?.userNumericId && u.userNumericId === updatedUser.userNumericId);
            return isMatch ? { ...u, ...updatedUser } : u;
          })
        );
        try {
          localStorage.setItem('sahaya_users', JSON.stringify(nextUsers));
        } catch {}
        return nextUsers;
      });

      const isCurrentMatch =
        currentUser &&
        ((updatedUser?.id && currentUser.id && currentUser.id === updatedUser.id) ||
          (currentUser.nicNumber && updatedUser?.nicNumber && currentUser.nicNumber.toLowerCase() === updatedUser.nicNumber.toLowerCase()) ||
          (currentUser.userId && updatedUser?.userId && currentUser.userId.toLowerCase() === updatedUser.userId.toLowerCase()) ||
          (updatedUser?.userNumericId && currentUser.userNumericId && currentUser.userNumericId === updatedUser.userNumericId));

      if (isCurrentMatch && updatedUser) {
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem('sahaya_current_user', JSON.stringify(updatedUser));
        } catch {}
      }

      if (!updatedUser) return;

      // 2. If password/securityCode was changed in UserSettingsModal, sync to Firestore and Auth
      const activePassword = (updatedUser.key || (updatedUser as any).password || updatedUser.securityCode || '').trim();
      if (activePassword) {
        await syncUserPasswordInFirestore(updatedUser, activePassword);

        // Sync to Firebase Auth in background
        (async () => {
          try {
            const activeAuth = auth.currentUser;
            if (activeAuth) {
              await updatePassword(activeAuth, activePassword);
            } else {
              const cleanNic = (updatedUser.nicNumber || updatedUser.userId || '').trim().toLowerCase();
              if (cleanNic) {
                const formattedEmail = `${cleanNic}@app.com`;
                try {
                  const userCred = await signInWithEmailAndPassword(auth, formattedEmail, activePassword);
                  if (userCred.user) {
                    await updatePassword(userCred.user, activePassword);
                  }
                } catch {
                  try {
                    await createUserWithEmailAndPassword(auth, formattedEmail, activePassword);
                  } catch {}
                }
              }
            }
          } catch (pwErr) {
            console.warn("Auth password update notice:", pwErr);
          }
        })();

        // Sync to backend server
        fetch('/api/user/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: updatedUser.id || updatedUser.userId || '',
            nicNumber: updatedUser.nicNumber || updatedUser.userId,
            newPassword: activePassword,
          }),
        }).catch((e) => console.warn('Server password update notify error:', e));
      }

      // 3. Save profile document to Firestore
      if (updatedUser.id) {
        await updateUserInFirestore(updatedUser.id, updatedUser);
      }

      console.log("✅ පරිශීලක දත්ත ගබඩාවේ සාර්ථකව සේව් විය!");
    } catch (err) {
      console.error("⛔ Save වීමේ දෝෂයක්:", err);
    }
  };

  // ✅ 4.1. නව මුරපදයක් සේව් කිරීම (Firebase Auth + Firestore Level එකෙන්)
  const handleSaveNewPassword = async (newPassword: string, tempPassword?: string) => {
    if (!currentUser) return;
    const cleanPass = (newPassword || '').trim();
    if (!cleanPass) {
      alert('නව මුරපදය හිස් ව තිබිය නොහැක.');
      return;
    }

    try {
      const cleanNic = (currentUser.nicNumber || currentUser.userId || '').trim().toLowerCase();
      const formattedEmail = `${cleanNic}@app.com`;

      const updatedUser: User = {
        ...currentUser,
        status: currentUser.status || 'approved',
        role: currentUser.role || 'user',
        isPasswordChanged: true,
        isTemporaryPassword: false,
        tempCode: '',
        securityCode: cleanPass,
        tempPassword: '',
        key: cleanPass,
        password: cleanPass,
        updatedAt: new Date().toISOString(),
      };

      // 1. Instant Local State & Cache Update (UI renders immediately)
      setCurrentUser(updatedUser);
      setUsers((prev) => {
        const nextUsers = deduplicateUsers(
          (prev || []).map((u) => {
            if (!u) return u;
            const isMatch =
              (updatedUser?.id && u.id === updatedUser.id) ||
              (u.nicNumber && updatedUser?.nicNumber && u.nicNumber.toLowerCase() === (updatedUser.nicNumber || '').toLowerCase()) ||
              (u.userId && updatedUser?.userId && u.userId.toLowerCase() === (updatedUser.userId || '').toLowerCase()) ||
              (updatedUser?.userNumericId && u.userNumericId === updatedUser.userNumericId);
            return isMatch ? { ...u, ...updatedUser } : u;
          })
        );
        try {
          localStorage.setItem('sahaya_users', JSON.stringify(nextUsers));
          localStorage.setItem('sahaya_current_user', JSON.stringify(updatedUser));
        } catch {}
        return nextUsers;
      });

      setShowChangePasswordModal(false);

      // 2. Parallel Sync to Firestore (Fast direct doc writes)
      await syncUserPasswordInFirestore(updatedUser, cleanPass);

      // 3. Sync to Firebase Auth in background/non-blocking
      (async () => {
        try {
          const activeUser = auth.currentUser;
          if (activeUser) {
            await updatePassword(activeUser, cleanPass);
          } else {
            const tempToTry = tempPassword || currentUser.key || currentUser.securityCode || (currentUser as any).tempPassword;
            if (tempToTry) {
              try {
                const userCred = await signInWithEmailAndPassword(auth, formattedEmail, tempToTry);
                if (userCred.user) {
                  await updatePassword(userCred.user, cleanPass);
                }
              } catch {
                // If sign in with temp failed, try creating user or updating with new password
                try {
                  await createUserWithEmailAndPassword(auth, formattedEmail, cleanPass);
                } catch {}
              }
            } else {
              try {
                await createUserWithEmailAndPassword(auth, formattedEmail, cleanPass);
              } catch {}
            }
          }
        } catch (pwErr) {
          console.warn("Auth password sync notice:", pwErr);
        }
      })();

      // 4. Sync to Backend Server Cache
      fetch('/api/user/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: updatedUser.id,
          nicNumber: updatedUser.nicNumber || updatedUser.userId,
          newPassword: cleanPass,
        }),
      }).catch((e) => console.warn('Server password update notify error:', e));

      return true;
    } catch (err: any) {
      console.error("මුරපදය වෙනස් කිරීමේ දෝෂයක්:", err);
      alert(`මුරපදය වෙනස් කිරීම අසාර්ථක විය: ${err.message || 'නැවත උත්සාහ කරන්න.'}`);
      throw err;
    }
  };

  // ✅ 4.2. ඇඩ්මින් පැනල් එකෙන් Password Reset Link එකක් යැවීම
  const handleResetUserPasswordByAdmin = async (nicNumber: string) => {
    try {
      const formattedEmail = `${nicNumber.trim().toLowerCase()}@app.com`;
      await sendPasswordResetEmail(auth, formattedEmail);
      alert(`මුරපදය නැවත සැකසීමේ උපදෙස් ${formattedEmail} වෙත යවන ලදී.`);
    } catch (error: any) {
      console.error("Password reset error:", error);
      alert(`මුරපදය Reset කිරීම අසාර්ථක විය: ${error.message}`);
    }
  };

  // ✅ 3. Red Alert පලකිරීමේදී පරිශීලකයාගේ ලොගින් මුරපදය පරීක්ෂා කිරීමේ ෆන්ක්ෂන් එක
  const handleVerifyPasswordBeforeRedAlert = async (passwordInput: string): Promise<boolean> => {
    const entered = (passwordInput || '').trim();
    if (!entered) return false;

    // 1. First check against currentUser in session state
    if (currentUser) {
      const userKey = (currentUser.key || '').trim();
      const userPass = ((currentUser as any).password || '').trim();
      const userSec = (currentUser.securityCode || '').trim();
      const userTemp = (currentUser.tempCode || (currentUser as any).tempPassword || '').trim();

      if (
        (userKey && userKey === entered) ||
        (userPass && userPass === entered) ||
        (userSec && userSec === entered) ||
        (userTemp && userTemp === entered)
      ) {
        return true;
      }
    }

    // 2. Check against users list and localStorage
    try {
      const savedUsersStr = typeof window !== 'undefined' ? localStorage.getItem('sahaya_users') : null;
      const allKnownUsers: User[] = [
        ...users,
        ...(savedUsersStr ? JSON.parse(savedUsersStr || '[]') : []),
      ];

      if (currentUser) {
        const matchInUsers = allKnownUsers.find(
          (u) =>
            u &&
            ((currentUser.id && u.id && u.id === currentUser.id) ||
              (u.nicNumber && currentUser.nicNumber && u.nicNumber.toLowerCase() === currentUser.nicNumber.toLowerCase()) ||
              (u.userId && currentUser.userId && u.userId.toLowerCase() === currentUser.userId.toLowerCase()))
        );
        if (matchInUsers) {
          const uKey = (matchInUsers.key || '').trim();
          const uPass = ((matchInUsers as any).password || '').trim();
          const uSec = (matchInUsers.securityCode || '').trim();
          const uTemp = (matchInUsers.tempCode || (matchInUsers as any).tempPassword || '').trim();
          if (
            (uKey && uKey === entered) ||
            (uPass && uPass === entered) ||
            (uSec && uSec === entered) ||
            (uTemp && uTemp === entered)
          ) {
            return true;
          }
        }
      }
    } catch {}

    // 3. Try Firebase Auth (re-authentication or sign-in)
    const currentUserAuth = auth.currentUser;
    if (currentUserAuth && currentUserAuth.email) {
      try {
        const credential = EmailAuthProvider.credential(currentUserAuth.email, entered);
        await reauthenticateWithCredential(currentUserAuth, credential);
        return true;
      } catch (authErr) {
        // Continue to Firestore check
      }
    } else if (currentUser && (currentUser.nicNumber || currentUser.userId)) {
      try {
        const cleanNic = (currentUser.nicNumber || currentUser.userId || '').trim().toLowerCase();
        const formattedEmail = `${cleanNic}@app.com`;
        await signInWithEmailAndPassword(auth, formattedEmail, entered);
        return true;
      } catch (authErr) {
        // Continue to Firestore check
      }
    }

    // 4. Try Firestore user lookup
    if (currentUser && (currentUser.nicNumber || currentUser.userId || currentUser.id)) {
      try {
        const identifier = currentUser.nicNumber || currentUser.userId || currentUser.id;
        const dbUser = await getUserFromFirestore(identifier);
        if (dbUser) {
          const dbKey = (dbUser.key || (dbUser as any).password || dbUser.securityCode || dbUser.tempCode || '').trim();
          if (dbKey && dbKey === entered) {
            return true;
          }
        }
      } catch (e) {}
    }

    return false;
  };

  const handleBlockUser = (targetUserId: string, reason: string) => {
    const userToBlock = users.find((u) => u && (u.id === targetUserId || u.userId === targetUserId));
    if (!userToBlock || !userToBlock.id) return;

    const blockedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    updateUserInFirestore(userToBlock.id, {
      status: 'blocked',
      blockedReason: reason,
      blockedAt,
    }).catch((err) => console.warn(err));

    setUsers((prev) =>
      (prev || []).map((u) =>
        u && (u.id === targetUserId || u.userId === targetUserId)
          ? {
              ...u,
              status: 'blocked',
              blockedReason: reason,
              blockedAt,
            }
          : u
      )
    );

    const newBlockedCred: BlockedCredential = {
      id: `block_${Date.now()}`,
      userId: userToBlock.userId || userToBlock.id,
      userName: userToBlock.name,
      phone: userToBlock.phone,
      nicNumber: userToBlock.nicNumber,
      email: userToBlock.email,
      ipAddress: userToBlock.ipAddress || '192.168.1.102',
      blockedAt,
      reason,
    };

    setBlockedCredentials((prev) => [newBlockedCred, ...(prev || [])]);
  };

  const handleUnblockCredential = (credentialId: string) => {
    const cred = (blockedCredentials || []).find((c) => c && c.id === credentialId);
    setBlockedCredentials((prev) => (prev || []).filter((c) => c && c.id !== credentialId));

    if (cred && cred.userId) {
      const userToUnblock = (users || []).find((u) => u && (u.userId === cred.userId || u.id === cred.userId));
      if (userToUnblock && userToUnblock.id) {
        updateUserInFirestore(userToUnblock.id, { status: 'approved' }).catch((err) => console.warn(err));
      }
      setUsers((prev) =>
        (prev || []).map((u) => (u && (u.userId === cred.userId || u.id === cred.userId) ? { ...u, status: 'approved' } : u))
      );
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!postId) return;
    addDeletedPostId(postId);
    const deletedPayload: Partial<HelpPost> = {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: currentUser ? `Admin (${currentUser.name})` : 'Admin',
      status: 'deleted',
    };

    setHelpPosts((prev) => {
      const updated = (prev || []).filter((p) => p && p.id !== postId);
      try {
        localStorage.setItem('sahaya_help_posts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      if (postId) {
        await updateHelpPostInFirestore(postId, deletedPayload).catch(() => {});
        await deleteHelpPostFromFirestore(postId).catch(() => {});
      }
    } catch (err) {
      console.warn('handleDeletePost notice:', err);
    }
  };

  const handlePermanentDeletePost = async (postId: string) => {
    if (postId) addDeletedPostId(postId);
    const updated = (helpPosts || []).filter((p) => p && p.id !== postId);
    setHelpPosts(updated);
    try {
      localStorage.setItem('sahaya_help_posts', JSON.stringify(updated));
      if (postId) {
        await deleteHelpPostFromFirestore(postId);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleRestorePost = async (postId: string) => {
    if (postId) removeDeletedPostId(postId);
    const restorePayload: Partial<HelpPost> = {
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
      status: 'active',
    };

    setHelpPosts((prev) =>
      (prev || []).map((p) => (p && p.id === postId ? { ...p, isDeleted: false, deletedAt: undefined, deletedBy: undefined, status: 'active' } : p))
    );

    try {
      if (postId) {
        await updateHelpPostInFirestore(postId, restorePayload);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleUpdatePost = async (updatedPost: HelpPost) => {
    if (!updatedPost || !updatedPost.id) return;
    setHelpPosts((prev) => (prev || []).map((p) => (p && p.id === updatedPost.id ? updatedPost : p)));
    try {
      await updateHelpPostInFirestore(updatedPost.id, updatedPost);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleSubmitIssue = async (
    newIssueData: Omit<Issue, 'id' | 'issueCode' | 'createdAt' | 'status'>
  ) => {
    const createdIssue: Issue = {
      ...newIssueData,
      id: `iss_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      issueCode: `#ISSUE-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'pending',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setIssues((prev) => {
      const updated = [createdIssue, ...(prev || [])];
      localStorage.setItem('sahaya_issues', JSON.stringify(updated));
      return updated;
    });

    try {
      await saveIssueToFirestore(createdIssue);
    } catch (err) {
      console.warn("saveIssueToFirestore notice:", err);
    }
  };

  const handleReplyIssue = (
    issueId: string, 
    reply: string, 
    resolve: boolean,
    replyChannel?: 'inbox' | 'sms' | 'whatsapp'
  ) => {
    setIssues((prev) => {
      const updatedList = (prev || []).map((iss) => {
        if (iss && iss.id === issueId) {
          const channel = replyChannel || iss.targetChannel || (iss.isRegisteredUser ? 'inbox' : 'sms');
          const updatedIss: Issue = {
            ...iss,
            adminReply: reply,
            status: resolve ? 'resolved' : 'in_progress',
            replyChannel: channel,
            updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };

          // Save updates to Firestore
          updateIssueInFirestore(issueId, {
            adminReply: reply,
            status: resolve ? 'resolved' : 'in_progress',
            replyChannel: channel,
            updatedAt: new Date().toISOString(),
          }).catch((err) => console.warn("updateIssueInFirestore notice:", err));

          // Trigger In-App Notification if user is registered / has known account
          if (iss.isRegisteredUser || iss.userId || iss.nicNumber) {
            broadcastAppNotification({
              type: 'issue_reply',
              title: '💬 පරිපාලක පිළිතුරක් (Admin Reply)',
              message: `ඔබගේ ගැටලුව (${iss.issueCode}) සඳහා පිළිතුර: ${reply.slice(0, 80)}`,
              badgeText: iss.issueCode,
              targetModal: 'detail',
            });
          }

          return updatedIss;
        }
        return iss;
      });

      localStorage.setItem('sahaya_issues', JSON.stringify(updatedList));
      return updatedList;
    });
  };

  const handleSeedDemoData = async () => {
    setUsers(initialUsers);
    setIssues(initialIssues);
    setBlockedCredentials([]);
    try {
      await seedDemoHelpPostsToFirestore();
    } catch (e) {
      console.warn(e);
    }
    alert('දර්ශන පරීක්ෂණ දත්ත සාර්ථකව ප්‍රතිස්ථාපනය කෙරිණි!');
  };

  const handleNavigate = (targetView: ViewMode) => {
    if (targetView === 'admin') {
      if (!checkIsAdmin(currentUser)) {
        alert('⛔ පරිපාලක ප්‍රකාරයට පිවිසීමට පරිපාලක අවසර (Admin privileges) අවශ්‍ය වේ.');
        if (currentUser && currentUser.status === 'approved') {
          setViewMode('dashboard');
        } else {
          setViewMode('login');
        }
        return;
      }
      setActiveRoleView('admin');
      setViewMode('admin');
      return;
    }
    if (targetView === 'dashboard') {
      setActiveRoleView('user');
      setViewMode('dashboard');
      return;
    }
    setViewMode(targetView);
  };

  const t = translations[language];

  return (
    <div
      className={`min-h-screen w-full font-sans flex flex-col justify-between ${
        viewMode === 'login' ? 'p-2 sm:p-4' : 'p-4 sm:p-8'
      } relative overflow-x-hidden transition-colors ${
        theme === 'dark'
          ? 'bg-[#05120a] text-slate-100'
          : 'bg-[#f2f7f4] text-slate-900'
      }`}
    >
      <div className="fixed top-[-120px] left-[-120px] w-[350px] h-[350px] bg-radial from-emerald-500/10 to-transparent rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-120px] right-[-120px] w-[350px] h-[350px] bg-radial from-teal-500/10 to-transparent rounded-full pointer-events-none -z-10" />

      {/* 🚨 PickMe-Style Active Alert Audio & Ringer Floating Top Banner */}
      <ActiveAlertRingerBanner
        language={language}
        onOpenModal={(modal, targetId) => {
          stopPickMeAlert();
          if (modal === 'red_alert') {
            const matched = targetId ? redAlerts.find((a) => a.id === targetId) : null;
            if (matched) {
              setSelectedDetailAlert(matched);
            } else if (redAlerts.length > 0) {
              setSelectedDetailAlert(redAlerts[0]);
            } else {
              setIsCreateRedAlertOpen(true);
            }
          } else if (modal === 'blood' || modal === 'quick_service') {
            if (viewMode !== 'dashboard' && currentUser && currentUser.status === 'approved') {
              setViewMode('dashboard');
            }
          }
        }}
      />

      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-11/12 max-w-xl bg-slate-900 text-white border-2 border-emerald-500 p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-bounce">
          <p className="text-xs sm:text-sm font-bold leading-relaxed">{toastMessage}</p>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-3 text-slate-400 hover:text-white font-bold text-base cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {viewMode !== 'login' && viewMode !== 'gps_gate' && viewMode !== 'dashboard' && (
        <Header
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
          currentUser={currentUser}
          activeRoleView={activeRoleView}
          setActiveRoleView={setActiveRoleView}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {viewMode !== 'login' && viewMode !== 'gps_gate' && (
        <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 z-20 space-y-2 mb-2">
          <NotificationPermissionBanner language={language} variant="banner" />
          <RedAlertBanner
            alerts={redAlerts}
            currentUser={currentUser}
            onOpenAlertDetail={(a) => setSelectedDetailAlert(a)}
            onOpenCreate={() => setIsCreateRedAlertOpen(true)}
          />
        </div>
      )}

      <main className="flex-1 flex flex-col justify-center items-center z-10 my-2 w-full">
        {viewMode === 'gps_gate' && (
          <GpsActivationGate
            onProceedToLogin={() => setViewMode('login')}
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}

        {viewMode === 'login' && (
          <LoginForm
            onLogin={handleLogin}
            onUserDemoLogin={handleUserDemoLogin}
            onNavigateToRegister={() => setViewMode('register')}
            onNavigateToIssues={() => setViewMode('issues_help')}
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
            showDemoUserLogin={registrationConfig?.showDemoUserLogin !== false}
            users={users}
            onSuccessfulPinLogin={completeSuccessfulLogin}
          />
        )}

        {viewMode === 'register' && (
          <RegisterForm
            onRegister={handleRegister}
            onNavigateToLogin={() => setViewMode('login')}
            registrationConfig={registrationConfig}
            language={language}
          />
        )}

        {viewMode === 'pending' && currentUser && (
          <PendingApprovalView
            user={currentUser}
            language={language}
            onRefreshStatus={() => {
              const latestUser = users.find((u) => u && (u.id === currentUser?.id || u.userId === currentUser?.userId || u.nicNumber === currentUser?.nicNumber));
              if (latestUser) {
                setCurrentUser(latestUser);
                if (latestUser.status === 'approved') {
                  setViewMode('dashboard');
                } else if (latestUser.status === 'blocked') {
                  alert(`ගිණුම අවහිර කර ඇත.`);
                  handleLogout();
                } else {
                  alert('අනුමැතිය සඳහා පොරොත්තුවෙන් පවතී.');
                }
              }
            }}
            onNavigateToIssues={() => setViewMode('issues_help')}
            onBackToLogin={handleLogout}
          />
        )}

        {viewMode === 'issues_help' && (
          <IssuesHelpPage
            issues={issues}
            users={users}
            currentUser={currentUser}
            onSubmitIssue={handleSubmitIssue}
            onBackToLogin={() => {
              if (currentUser && currentUser.status === 'approved') {
                setViewMode('dashboard');
              } else {
                setViewMode('login');
              }
            }}
            language={language}
          />
        )}

        {viewMode === 'admin' && checkIsAdmin(currentUser) && (
          <AdminPanel
            users={users}
            issues={issues}
            helpPosts={helpPosts}
            blockedCredentials={blockedCredentials}
            registrationConfig={registrationConfig}
            onUpdateRegistrationConfig={setRegistrationConfig}
            categories={categories}
            onUpdateCategories={setCategories}
            tags={tags}
            onUpdateTags={setTags}
            onApproveUser={handleApproveUser}
            onRejectUser={handleRejectUser}
            onDeleteUser={handleDeleteUser}
            onUpdateUser={handleUpdateUser}
            onBlockUser={handleBlockUser}
            onUnblockCredential={handleUnblockCredential}
            onDeletePost={handleDeletePost}
            onPermanentDeletePost={handlePermanentDeletePost}
            onRestorePost={handleRestorePost}
            onUpdatePost={handleUpdatePost}
            onRestoreAllPosts={(restored) => {
              setHelpPosts((prev) => {
                const map = new Map((prev || []).filter((p) => p && p.id).map((p) => [p.id, p]));
                (restored || []).filter((p) => p && p.id).forEach((p) => map.set(p.id, p));
                return Array.from(map.values());
              });
            }}
            onReplyIssue={handleReplyIssue}
            onSeedDemoData={handleSeedDemoData}
            language={language}
            redAlerts={redAlerts}
            onViewRedAlertDetail={(a) => setSelectedDetailAlert(a)}
            onResetUserPassword={handleResetUserPasswordByAdmin}
            onNavigate={handleNavigate}
            onSwitchToUserMode={() => handleNavigate('dashboard')}
          />
        )}

        {viewMode === 'dashboard' && currentUser && (
          <UserDashboard
            user={currentUser}
            onNavigateToIssues={() => setViewMode('issues_help')}
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
            categories={categories}
            helpPosts={helpPosts}
            onDeletePost={handleDeletePost}
            onPermanentDeletePost={handlePermanentDeletePost}
            onUpdatePost={handleUpdatePost}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            activeRoleView={activeRoleView}
            setActiveRoleView={setActiveRoleView}
            onNavigate={handleNavigate}
            onOpenRedAlert={() => setIsCreateRedAlertOpen(true)}
            activeRedAlertsCount={(redAlerts || []).filter((a) => a && a.status === 'active' && !a.isFlaggedFake).length}
            redAlerts={redAlerts}
            onViewRedAlertDetail={(a) => setSelectedDetailAlert(a)}
          />
        )}

        {/* Fallback View: If user is required but not authenticated, or unhandled view mode, show LoginForm / GpsActivationGate */}
        {((viewMode === 'dashboard' || viewMode === 'admin' || viewMode === 'pending') && !currentUser) && (
          <LoginForm
            onLogin={handleLogin}
            onUserDemoLogin={handleUserDemoLogin}
            onNavigateToRegister={() => setViewMode('register')}
            onNavigateToIssues={() => setViewMode('issues_help')}
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
            showDemoUserLogin={registrationConfig?.showDemoUserLogin !== false}
            users={users}
            onSuccessfulPinLogin={completeSuccessfulLogin}
          />
        )}

        {viewMode === 'admin' && currentUser && !checkIsAdmin(currentUser) && (
          <UserDashboard
            user={currentUser}
            onNavigateToIssues={() => setViewMode('issues_help')}
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
            categories={categories}
            helpPosts={helpPosts}
            onDeletePost={handleDeletePost}
            onPermanentDeletePost={handlePermanentDeletePost}
            onUpdatePost={handleUpdatePost}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            activeRoleView={activeRoleView}
            setActiveRoleView={setActiveRoleView}
            onNavigate={handleNavigate}
            onOpenRedAlert={() => setIsCreateRedAlertOpen(true)}
            activeRedAlertsCount={(redAlerts || []).filter((a) => a && a.status === 'active' && !a.isFlaggedFake).length}
            redAlerts={redAlerts}
            onViewRedAlertDetail={(a) => setSelectedDetailAlert(a)}
          />
        )}
      </main>

      <RedAlertCreateModal
        isOpen={isCreateRedAlertOpen}
        onClose={() => setIsCreateRedAlertOpen(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        onAlertCreated={(newAlert) => {
          if (newAlert?.id) {
            setMyCreatedAlertIds((prev) => {
              const next = Array.from(new Set([...prev, newAlert.id]));
              try {
                localStorage.setItem('sahaya_my_created_alerts', JSON.stringify(next));
              } catch (e) {}
              return next;
            });
            setDismissedProximityAlertIds((prev) => {
              const next = Array.from(new Set([...prev, newAlert.id]));
              try {
                localStorage.setItem('sahaya_dismissed_alerts', JSON.stringify(next));
              } catch (e) {}
              return next;
            });
          }
        }}
      />

      <RedAlertProximityModal
        isOpen={Boolean(proximityAlertInfo)}
        alert={proximityAlertInfo?.alert || null}
        distanceKm={proximityAlertInfo?.distanceKm || 0}
        onClose={() => {
          if ((window as any).emergencySiren) {
            (window as any).emergencySiren.pause();
            (window as any).emergencySiren.currentTime = 0;
            (window as any).emergencySiren = null;
          }
          if (sirenTimerRef.current) clearTimeout(sirenTimerRef.current);

          if (proximityAlertInfo?.alert?.id) {
            setDismissedProximityAlertIds((prev) => {
              const next = Array.from(new Set([...prev, proximityAlertInfo.alert.id]));
              try {
                localStorage.setItem('sahaya_dismissed_alerts', JSON.stringify(next));
              } catch (e) {}
              return next;
            });
          }
          setProximityAlertInfo(null);
        }}
        currentUser={currentUser}
      />

      <RedAlertDetailModal
        isOpen={Boolean(selectedDetailAlert)}
        alert={selectedDetailAlert}
        onClose={() => setSelectedDetailAlert(null)}
        currentUser={currentUser}
        onAlertUpdated={(updatedAlert) => {
          if (updatedAlert && updatedAlert.id) {
            setRedAlerts((prev) =>
              (prev || []).map((a) => (a && a.id === updatedAlert.id ? updatedAlert : a))
            );
            if (selectedDetailAlert?.id === updatedAlert.id) {
              setSelectedDetailAlert(updatedAlert);
            }
          }
        }}
        onAlertDeleted={(alertId) => {
          if (alertId) {
            setRedAlerts((prev) => (prev || []).filter((a) => a && a.id !== alertId));
            setSelectedDetailAlert(null);
          }
        }}
      />

      <WrongLoginModal
        isOpen={showWrongLoginModal}
        onRetry={() => setShowWrongLoginModal(false)}
        language={language}
      />

      {/* 2FA TOTP Google Authenticator Verification Modal during Login */}
      {pending2FAUser && pending2FAUser.twoFactorSecret && (
        <GoogleAuthVerifyModal
          isOpen={Boolean(pending2FAUser)}
          onClose={() => setPending2FAUser(null)}
          onVerifySuccess={() => {
            const userToAuth = pending2FAUser;
            setPending2FAUser(null);
            completeSuccessfulLogin(userToAuth);
          }}
          secretBase32={pending2FAUser.twoFactorSecret}
          userName={pending2FAUser.name || pending2FAUser.nicNumber}
          language={language}
        />
      )}

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSavePassword={handleSaveNewPassword}
        userName={currentUser?.name}
        nicNumber={currentUser?.nicNumber}
        currentTempPassword={currentUser?.tempPassword || currentUser?.tempCode || currentUser?.securityCode || currentUser?.key}
      />

      <UpdateWhatsAppModal
        isOpen={showUpdateWhatsAppModal}
        onClose={() => setShowUpdateWhatsAppModal(false)}
        targetUserIdentifier={targetWhatsAppUserIdentifier}
        currentUser={currentUser}
        users={users}
        language={language}
        onSuccess={(updatedUser) => {
          if (currentUser && updatedUser && ((currentUser.id && currentUser.id === updatedUser.id) || (currentUser.nicNumber && currentUser.nicNumber === updatedUser.nicNumber))) {
            setCurrentUser((prev) => prev ? { ...prev, ...updatedUser } : null);
          }
          setUsers((prev) => (prev || []).map((u) => (u && updatedUser && ((u.id && u.id === updatedUser.id) || (u.nicNumber && u.nicNumber === updatedUser.nicNumber)) ? { ...u, ...updatedUser } : u)));
        }}
      />

      {/* Device-Specific 4-Digit Quick PIN Setup Modal */}
      {showDevicePinSetupModal && currentUser && (
        <DevicePinSetupModal
          isOpen={showDevicePinSetupModal}
          onClose={() => setShowDevicePinSetupModal(false)}
          currentUser={currentUser}
          language={language}
          onPinConfigured={(updatedUser) => {
            setCurrentUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
            setUsers((prev) =>
              (prev || []).map((u) =>
                u && (u.id === updatedUser.id || (u.nicNumber && updatedUser.nicNumber && u.nicNumber === updatedUser.nicNumber))
                  ? { ...u, ...updatedUser }
                  : u
              )
            );
          }}
        />
      )}

      {/* 🚨 SOS Live GPS Tracker Recipient Viewer Modal (Opened directly from shared links) */}
      <SosLiveViewerModal
        isOpen={isSosViewerModalOpen}
        onClose={() => {
          setIsSosViewerModalOpen(false);
          setSosViewerSessionId('');
          // Clear query param cleanly without reloading
          if (typeof window !== 'undefined' && window.history?.replaceState) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, '', cleanUrl);
          }
        }}
        sessionId={sosViewerSessionId}
        viewerLocation={userCoords ? { id: 'viewer_loc', nameSi: 'ඔබේ ස්ථානය', nameEn: 'Your Location', nameTa: 'உங்கள் இடம்', lat: userCoords.lat, lng: userCoords.lng } : undefined}
        language={language}
      />

      {/* 🚨 Global SOS Tracker Trigger Modal */}
      {isSosTrackerModalOpen && (
        <SosLiveTrackerModal
          isOpen={isSosTrackerModalOpen}
          onClose={() => setIsSosTrackerModalOpen(false)}
          currentUser={currentUser || {
            id: 'guest_sos',
            userId: 'guest_sos',
            name: 'හදිසි ආපදා පරිශීලක (SOS User)',
            email: 'sos@sahaya.lk',
            phone: '',
            nicNumber: '000000000',
            role: 'user',
            status: 'approved',
            registeredAt: new Date().toISOString()
          }}
          currentLocation={userCoords ? { id: 'cur_loc', nameSi: 'වත්මන් ස්ථානය', nameEn: 'Current Location', nameTa: 'தற்போதைய இடம்', lat: userCoords.lat, lng: userCoords.lng } : undefined}
          language={language}
        />
      )}

      {viewMode !== 'dashboard' && (
        <OmniAssistantChatBox
          currentLanguage={language}
          onLanguageChange={setLanguage}
          mode={viewMode === 'login' || viewMode === 'register' || viewMode === 'gps_gate' ? 'auth' : 'full'}
          onSwitchToRegister={() => setViewMode('register')}
          onSwitchToLogin={() => setViewMode('login')}
          onOpenIssuesHelp={() => setViewMode('issues_help')}
          onDemoLogin={handleUserDemoLogin}
          onOpenEmergencyDirectory={() => setViewMode('issues_help')}
        />
      )}

      {/* 🚨 24/7 Draggable Floating Overlay SOS & Red Alert Control Bubble */}
      {currentUser && 
       viewMode !== 'pending' && 
       viewMode !== 'gps_gate' && 
       (!isFloatingOverlayDismissed || (proximityAlertInfo && proximityAlertInfo.distanceKm <= 5)) && (
        <FloatingOverlayWidget
          onOpenCreateRedAlert={() => setIsCreateRedAlertOpen(true)}
          onOpenSosTracker={() => setIsSosTrackerModalOpen(true)}
          onOpenActiveHazards={() => {
            if (redAlerts.length > 0) {
              setSelectedDetailAlert(redAlerts[0]);
            } else {
              setIsCreateRedAlertOpen(true);
            }
          }}
          onDismiss={() => {
            setIsFloatingOverlayDismissed(true);
            try {
              localStorage.setItem('sahaya_hide_floating_overlay', 'true');
            } catch {}
          }}
          activeHazardsCount={redAlerts.filter((a) => a && a.status === 'active').length}
          userCoords={userCoords}
          nearestHazardDistanceKm={proximityAlertInfo?.distanceKm ?? null}
          language={language}
        />
      )}
    </div>
  );
}
