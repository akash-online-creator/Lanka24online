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
  syncUserPasswordInFirestore,
  markRedAlertAsResolved,
  cancelRedAlertByReporter,
  addReporterUpdateToRedAlert
} from './lib/firebase';
import { GpsActivationGate } from './components/GpsActivationGate';
import { grantWelcomeGiftCredit } from './utils/creditManager';
import { filterNonDeletedPosts, addDeletedPostId, removeDeletedPostId } from './utils/deletedPostsManager';
import { captureUserLoginLog, appendLoginHistory } from './utils/loginTracker';
import { RedAlertCreateModal } from './components/RedAlertCreateModal';
import { RedAlertProximityModal } from './components/RedAlertProximityModal';
import { RedAlertDetailModal } from './components/RedAlertDetailModal';
import { RedAlertBanner } from './components/RedAlertBanner';
import { calculateDistanceKm } from './data/redAlertData';

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
    return null;
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const isGpsVerified = localStorage.getItem('sahaya_gps_verified') === 'true';
    const hasSavedLocation = Boolean(localStorage.getItem('sahaya_current_location'));
    if (isGpsVerified && hasSavedLocation) {
      return 'login';
    }
    return 'gps_gate';
  });

  const [activeRoleView, setActiveRoleView] = useState<Role>(() => {
    return 'user';
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('sahaya_users');
    return saved ? JSON.parse(saved) : initialUsers;
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

  // Auto-open WhatsApp update modal if requested via URL param (from SMS link)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const waParam = urlParams.get('update_whatsapp') || urlParams.get('whatsapp_update') || urlParams.get('wa_update');
        if (waParam) {
          setTargetWhatsAppUserIdentifier(waParam.trim());
          setShowUpdateWhatsAppModal(true);
        }
      }
    } catch (e) {
      console.warn('URL param parse notice:', e);
    }
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToHelpPosts((remotePosts) => {
      setHelpPosts(remotePosts || []);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToUsers((remoteUsers) => {
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers((prev) => {
          const hasAdmin = remoteUsers.some(
            (u) => u.userId === '970181547V' || u.role === 'admin'
          );
          if (!hasAdmin && initialUsers[0]) {
            return [initialUsers[0], ...remoteUsers];
          }
          return remoteUsers;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const [redAlerts, setRedAlerts] = useState<RedAlertItem[]>(() => {
    try {
      const saved = localStorage.getItem('sahaya_red_alerts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
      const newAlerts = remoteAlerts || [];
      
      if (isInitialAlertsLoadRef.current) {
        newAlerts.forEach((a) => {
          if (a && a.id) knownAlertIdsRef.current.add(a.id);
        });
        isInitialAlertsLoadRef.current = false;
      } else {
        const brandNewAlerts = newAlerts.filter((a) => a && a.id && !knownAlertIdsRef.current.has(a.id) && a.status === 'active');
        
        brandNewAlerts.forEach((latestAlert) => {
          knownAlertIdsRef.current.add(latestAlert.id);

          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              try {
                new Notification('🚨 හදිසි ආපදා අනතුරු ඇඟවීමක් (Red Alert)!', {
                  body: latestAlert.disasterTitleSi || latestAlert.description || 'නව හදිසි අනතුරක් වාර්තා වී ඇත.',
                  tag: latestAlert.id,
                });
              } catch (e) {
                console.warn('Notification trigger error:', e);
              }
            } else if (Notification.permission === 'default') {
              Notification.requestPermission().then((perm) => {
                if (perm === 'granted') {
                  new Notification('🚨 හදිසි ආපදා අනතුරු ඇඟවීමක් (Red Alert)!', {
                    body: latestAlert.disasterTitleSi || latestAlert.description || 'නව හදිසි අනතුරක් වාර්තා වී ඇත.',
                    tag: latestAlert.id,
                  });
                }
              }).catch(() => {});
            }
          }

          setSelectedDetailAlert(latestAlert);
        });

        if (previousRedAlertsRef.current.length > 0) {
          previousRedAlertsRef.current.forEach((prevAlert) => {
            const updatedAlert = newAlerts.find((a) => a.id === prevAlert.id);

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
      if (alert.status !== 'active') return false;
      if (alert.isFlaggedFake) return false;
      if (typeof alert.latitude !== 'number' || typeof alert.longitude !== 'number') return false;
      if (typeof userCoords?.lat !== 'number' || typeof userCoords?.lng !== 'number') return false;

      if (dismissedProximityAlertIds.includes(alert.id)) return false;

      const isCreatedByMe = 
        (currentUser && (alert.reportedByUserId === currentUser.id || alert.reportedByUserId === currentUser.userId)) ||
        myCreatedAlertIds.includes(alert.id);
      if (isCreatedByMe) return false;

      const dist = calculateDistanceKm(
        userCoords.lat,
        userCoords.lng,
        alert.latitude,
        alert.longitude
      );
      return dist <= 2.0;
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
    localStorage.setItem('sahaya_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('sahaya_issues', JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem('sahaya_help_posts', JSON.stringify(helpPosts));
  }, [helpPosts]);

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
        const adminUser = users.find((u) => u.userId === '970181547V' || u.role === 'admin') || initialUsers[0];
        setCurrentUser(adminUser);
        setActiveRoleView('admin');
        setViewMode('admin');
        return;
      }

      if (isCredentialBlocked(cleanInput)) {
        alert('⛔ අවධානයයි: ඔබගේ ගිණුම හෝ හැඳුනුම්පත පරිපාලක (Admin) විසින් අවහිර කර ඇත.');
        return;
      }

      // NIC අංකය ඊමේල් format එකකට හරවා Firebase Auth එකෙන් පරික්ෂා කිරීම
      const formattedEmail = `${cleanInput}@app.com`;
      let authUser: any = null;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, formattedEmail, submittedPassword);
        authUser = userCredential?.user || null;
      } catch (authError: any) {
        console.warn("Firebase Auth Login check notice:", authError?.message || authError);
      }

      // Firestore / Local state මගින් පරිශීලකයා පරීක්ෂා කිරීම
      let foundUser = await getUserFromFirestore(cleanInput);

      if (!foundUser) {
        foundUser = users.find(
          (u) =>
            (u.userId && u.userId.toLowerCase() === cleanInput) ||
            (u.nicNumber && u.nicNumber.toLowerCase() === cleanInput) ||
            (u.phone && u.phone.toLowerCase() === cleanInput)
        );
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

      // AuthUser හරහා ලොග් නොවූයේ නම් (හෝ Auth provider disabled නම්) Firestore / Local දත්ත මගින් මුරපදය පරීක්ෂා කිරීම
      if (!authUser) {
        const userKey = (foundUser.key || '').trim();
        const userPass = ((foundUser as any).password || '').trim();
        const userTemp = (foundUser.tempCode || '').trim();
        const userSec = (foundUser.securityCode || '').trim();
        const userTempPw = ((foundUser as any).tempPassword || '').trim();

        const isPasswordCorrect =
          (userKey && userKey === submittedPassword) ||
          (userPass && userPass === submittedPassword) ||
          (userTemp && userTemp === submittedPassword) ||
          (userSec && userSec === submittedPassword) ||
          (userTempPw && userTempPw === submittedPassword);

        if (!isPasswordCorrect) {
          setShowWrongLoginModal(true);
          return;
        }
      }

      if (foundUser.status === 'blocked' || (foundUser as any).isBlocked) {
        alert(`⛔ අවධානයයි: පරිපාලක විසින් ඔබගේ ගිණුම අවහිර කර ඇත.\nහේතුව: ${foundUser.blockedReason || 'නීති රීති උල්ලංඝනය කිරීම'}`);
        return;
      }

      // Record Login Audit Log (IP, GPS / Location, Device Info, Timestamp)
      try {
        let gpsCoords: { lat: number; lng: number } | undefined;
        const savedLat = localStorage.getItem('sahaya_current_lat');
        const savedLng = localStorage.getItem('sahaya_current_lng');
        if (savedLat && savedLng) {
          gpsCoords = { lat: parseFloat(savedLat), lng: parseFloat(savedLng) };
        }
        const loginLog = await captureUserLoginLog(gpsCoords);
        const updatedHistory = appendLoginHistory(foundUser.loginHistory, loginLog, 20);
        foundUser = {
          ...foundUser,
          loginHistory: updatedHistory,
          ipAddress: loginLog.ipAddress,
          lastLoginAt: loginLog.timestamp,
        };
        // Update user state in Firestore asynchronously
        if (foundUser.id) {
          updateUserInFirestore(foundUser.id, {
            loginHistory: updatedHistory,
            ipAddress: loginLog.ipAddress,
            lastLoginAt: loginLog.timestamp,
          }).catch((err) => console.warn("Login history persistence warning:", err));
        }
      } catch (logErr) {
        console.warn("Login history recording error:", logErr);
      }

      console.log("Login Successful! Setting User State...");
      setCurrentUser(foundUser);
      setUsers((prev) => (prev || []).map((u) => (u.id === foundUser!.id ? foundUser! : u)));

      if (foundUser.role === 'admin') {
        setActiveRoleView('admin');
        setViewMode('admin');
      } else if (foundUser.status === 'pending') {
        setViewMode('pending');
      } else if (foundUser.status === 'approved') {
        setViewMode('dashboard');
        // මුල්වරට ලියාපදිංචි වූ පරිශීලකයන්ට නොව, පරිපාලක Reset කළ තාවකාලික මුරපද සහිත පරිශීලකයන්ට පමණක් Change Password පෙන්වයි
        const needsPasswordChange =
          foundUser.role !== 'admin' &&
          foundUser.isTemporaryPassword === true;
        if (needsPasswordChange) {
          setShowChangePasswordModal(true);
        }
      } else if (foundUser.status === 'rejected') {
        setShowWrongLoginModal(true);
      }

    } catch (error) {
      console.error("Login verification failed with an exception:", error);
      alert("අන්තර්ජාල සම්බන්ධතා දෝෂයක්. කරුණාකර නැවත උත්සාහ කරන්න.");
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
      users.some(
        (u) =>
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

      setUsers((prev) => [createdUser, ...prev]);
      await saveUserToFirestore(createdUser);
      setCurrentUser(null);
      setViewMode('login');
      alert('ලියාපදිංචි වීම සාර්ථකයි! දැන් ඔබගේ NIC අංකය සහ මුරපදය යොදා ලොග් වෙන්න.');
    } catch (error: any) {
      console.error("Registration error:", error);
      alert(`⛔ ලියාපදිංචි වීම අසාර්ථක විය: ${error.message || 'නැවත උත්සාහ කරන්න.'}`);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveRoleView('user');
    setViewMode('login');
  };

  const handleApproveUser = (targetUserId: string) => {
    const targetUser = (users || []).find((u) => u.id === targetUserId || u.userId === targetUserId);
    if (targetUser) {
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
    const targetUser = (users || []).find((u) => u.id === targetUserId || u.userId === targetUserId);
    if (targetUser) {
      updateUserInFirestore(targetUser.id, { status: 'rejected', rejectionReason: reason }).catch((err) => console.warn(err));
    }

    setUsers((prev) =>
      (prev || []).map((u) =>
        u.id === targetUserId
          ? { ...u, status: 'rejected', rejectionReason: reason }
          : u
      )
    );
  };

  // ✅ පරිශීලක ගිණුමක් සම්පූර්ණයෙන්ම ඉවත් කිරීම (Delete User from state, storage, and Firestore)
  const handleDeleteUser = async (targetUserId: string) => {
    const targetUser = (users || []).find(
      (u) => u.id === targetUserId || u.userId === targetUserId || u.nicNumber === targetUserId
    );

    // 1. React State එකෙන් ඉවත් කිරීම
    setUsers((prev) =>
      (prev || []).filter(
        (u) => u.id !== targetUserId && u.userId !== targetUserId && u.nicNumber !== targetUserId
      )
    );

    // 2. Local Storage එකෙන් ඉවත් කිරීම
    try {
      const saved = localStorage.getItem('sahaya_users');
      if (saved) {
        const parsed: User[] = JSON.parse(saved);
        const filtered = parsed.filter(
          (u) => u.id !== targetUserId && u.userId !== targetUserId && u.nicNumber !== targetUserId
        );
        localStorage.setItem('sahaya_users', JSON.stringify(filtered));
      }
    } catch (err) {
      console.warn('Delete user localStorage error:', err);
    }

    // 3. Firestore දත්ත ගබඩාවෙන් ඉවත් කිරීම
    try {
      await deleteUserAccount(targetUser || targetUserId, true);
    } catch (err) {
      console.warn('Delete user Firestore error:', err);
    }
  };

  // ✅ පරිශීලක දත්ත Firestore හි යාවත්කාලීන කිරීම (Safe user data persistence)
  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const { key, password, ...safeUserData } = updatedUser as any;
      await updateUserInFirestore(updatedUser.id, safeUserData);
      
      setUsers((prev) => (prev || []).map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      
      if (currentUser && currentUser.id === updatedUser.id) {
        setCurrentUser(updatedUser);
      }
      
      console.log("✅ පරිශීලක දත්ත ගබඩාවේ සාර්ථකව සේව් විය!");
    } catch (err) {
      console.error("⛔ Save වීමේ දෝෂයක්:", err);
      alert("අන්තර්ජාල දෝෂයක් නිසා තොරතුරු දත්ත ගබඩාවට සේව් නොවීය.");
    }
  };

  // ✅ 4.1. නව මුරපදයක් සේව් කිරීම (Firebase Auth + Firestore Level එකෙන්)
  const handleSaveNewPassword = async (newPassword: string) => {
    if (!currentUser) return;
    const cleanPass = (newPassword || '').trim();
    if (!cleanPass) {
      alert('නව මුරපදය හිස් ව තිබිය නොහැක.');
      return;
    }

    try {
      const activeUser = auth.currentUser;
      if (activeUser) {
        try {
          await updatePassword(activeUser, cleanPass);
        } catch (pwErr) {
          console.warn("Auth updatePassword notice:", pwErr);
        }
      } else {
        const cleanNic = (currentUser.nicNumber || currentUser.userId || '').trim().toLowerCase();
        const formattedEmail = `${cleanNic}@app.com`;
        try {
          await createUserWithEmailAndPassword(auth, formattedEmail, cleanPass);
        } catch {
          // Backend or Firestore fallback
        }
      }

      const updatedUser: User = {
        ...currentUser,
        isPasswordChanged: true,
        isTemporaryPassword: false,
        tempCode: undefined,
        securityCode: undefined,
        tempPassword: undefined,
        key: cleanPass,
        password: cleanPass,
      };

      await syncUserPasswordInFirestore(currentUser, cleanPass);

      setCurrentUser(updatedUser);
      setUsers((prev) => (prev || []).map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      setShowChangePasswordModal(false);
      alert("ඔබගේ මුරපදය සාර්ථකව යාවත්කාලීන කරන ලදී!");
    } catch (err: any) {
      console.warn("මුරපදය වෙනස් කිරීමේ දෝෂයක්:", err);
      alert(`මුරපදය වෙනස් කිරීම අසාර්ථක විය: ${err.message || 'නැවත ලොග් වී උත්සාහ කරන්න.'}`);
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

  // ✅ 3. Red Alert පලකිරීමේදී මුරපදය පරීක්ෂා කිරීමේ ෆන්ක්ෂන් එක
  const handleVerifyPasswordBeforeRedAlert = async (passwordInput: string): Promise<boolean> => {
    const currentUserAuth = auth.currentUser;
    if (!currentUserAuth || !currentUserAuth.email) {
      if (currentUser && currentUser.nicNumber) {
        try {
          const formattedEmail = `${currentUser.nicNumber.trim().toLowerCase()}@app.com`;
          await signInWithEmailAndPassword(auth, formattedEmail, passwordInput);
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    }

    try {
      const credential = EmailAuthProvider.credential(currentUserAuth.email, passwordInput);
      await reauthenticateWithCredential(currentUserAuth, credential);
      return true;
    } catch (error) {
      console.error("Red Alert Password verification failed:", error);
      return false;
    }
  };

  const handleBlockUser = (targetUserId: string, reason: string) => {
    const userToBlock = users.find((u) => u.id === targetUserId);
    if (!userToBlock) return;

    const blockedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    updateUserInFirestore(userToBlock.id, {
      status: 'blocked',
      blockedReason: reason,
      blockedAt,
    }).catch((err) => console.warn(err));

    setUsers((prev) =>
      (prev || []).map((u) =>
        u.id === targetUserId
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
      userId: userToBlock.userId,
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
    const cred = (blockedCredentials || []).find((c) => c.id === credentialId);
    setBlockedCredentials((prev) => (prev || []).filter((c) => c.id !== credentialId));

    if (cred && cred.userId) {
      const userToUnblock = (users || []).find((u) => u.userId === cred.userId);
      if (userToUnblock) {
        updateUserInFirestore(userToUnblock.id, { status: 'approved' }).catch((err) => console.warn(err));
      }
      setUsers((prev) =>
        (prev || []).map((u) => (u.userId === cred.userId ? { ...u, status: 'approved' } : u))
      );
    }
  };

  const handleDeletePost = async (postId: string) => {
    addDeletedPostId(postId);
    const deletedPayload: Partial<HelpPost> = {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: currentUser ? `Admin (${currentUser.name})` : 'Admin',
      status: 'deleted',
    };

    setHelpPosts((prev) => {
      const updated = (prev || []).filter((p) => p.id !== postId);
      try {
        localStorage.setItem('sahaya_help_posts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await updateHelpPostInFirestore(postId, deletedPayload);
    } catch (err) {
      console.warn(err);
    }
  };

  const handlePermanentDeletePost = async (postId: string) => {
    addDeletedPostId(postId);
    const updated = (helpPosts || []).filter((p) => p.id !== postId);
    setHelpPosts(updated);
    try {
      localStorage.setItem('sahaya_help_posts', JSON.stringify(updated));
      await deleteHelpPostFromFirestore(postId);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleRestorePost = async (postId: string) => {
    removeDeletedPostId(postId);
    const restorePayload: Partial<HelpPost> = {
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
      status: 'active',
    };

    setHelpPosts((prev) =>
      (prev || []).map((p) => (p.id === postId ? { ...p, isDeleted: false, deletedAt: undefined, deletedBy: undefined, status: 'active' } : p))
    );

    try {
      await updateHelpPostInFirestore(postId, restorePayload);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleUpdatePost = async (updatedPost: HelpPost) => {
    setHelpPosts((prev) => (prev || []).map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    try {
      await updateHelpPostInFirestore(updatedPost.id, updatedPost);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleSubmitIssue = (
    newIssueData: Omit<Issue, 'id' | 'issueCode' | 'createdAt' | 'status'>
  ) => {
    const createdIssue: Issue = {
      ...newIssueData,
      id: `iss_${Date.now()}`,
      issueCode: `#ISSUE-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'pending',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setIssues((prev) => [createdIssue, ...(prev || [])]);
  };

  const handleReplyIssue = (issueId: string, reply: string, resolve: boolean) => {
    setIssues((prev) =>
      (prev || []).map((iss) =>
        iss.id === issueId
          ? {
              ...iss,
              adminReply: reply,
              status: resolve ? 'resolved' : 'in_progress',
              updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            }
          : iss
      )
    );
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
    if (targetView === 'admin' && currentUser?.role !== 'admin') {
      if (currentUser && currentUser.status === 'approved') {
        setViewMode('dashboard');
      } else {
        setViewMode('login');
      }
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
      <div className="absolute top-[-120px] left-[-120px] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-120px] right-[-120px] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

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
        <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 z-20">
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
              const latestUser = users.find((u) => u.id === currentUser.id);
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

        {viewMode === 'admin' && currentUser?.role === 'admin' && (
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
                const map = new Map((prev || []).map((p) => [p.id, p]));
                (restored || []).forEach((p) => map.set(p.id, p));
                return Array.from(map.values());
              });
            }}
            onReplyIssue={handleReplyIssue}
            onSeedDemoData={handleSeedDemoData}
            language={language}
            redAlerts={redAlerts}
            onViewRedAlertDetail={(a) => setSelectedDetailAlert(a)}
            onResetUserPassword={handleResetUserPasswordByAdmin}
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
            activeRedAlertsCount={redAlerts.filter((a) => a.status === 'active' && !a.isFlaggedFake).length}
            redAlerts={redAlerts}
            onViewRedAlertDetail={(a) => setSelectedDetailAlert(a)}
          />
        )}
      </main>

      <RedAlertCreateModal
        isOpen={isCreateRedAlertOpen}
        onClose={() => setIsCreateRedAlertOpen(false)}
        currentUser={currentUser}
        onVerifyPassword={handleVerifyPasswordBeforeRedAlert}
        onAlertCreated={(newAlert) => {
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

          if (proximityAlertInfo) {
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
      />

      <WrongLoginModal
        isOpen={showWrongLoginModal}
        onRetry={() => setShowWrongLoginModal(false)}
        language={language}
      />

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
          if (currentUser && (currentUser.id === updatedUser.id || currentUser.nicNumber === updatedUser.nicNumber)) {
            setCurrentUser((prev) => prev ? { ...prev, ...updatedUser } : null);
          }
          setUsers((prev) => prev.map((u) => (u.id === updatedUser.id || u.nicNumber === updatedUser.nicNumber ? { ...u, ...updatedUser } : u)));
        }}
      />

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
    </div>
  );
}
