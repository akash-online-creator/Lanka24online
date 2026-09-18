// ==============================================================
// 🚨 RED ALERTS (රතු එළිය) FIRESTORE OPERATIONS
// ==============================================================
const RED_ALERTS_COLLECTION = 'red_alerts';

function mapDocToRedAlert(docSnap: DocumentData | QueryDocumentSnapshot<DocumentData>): RedAlertItem {
  const data = docSnap.data ? docSnap.data() : docSnap;
  const id = docSnap.id || data.id || `alert_${Date.now()}`;
  return {
    id,
    alertCode: data.alertCode || `#RED-${id.substring(0, 4)}`,
    disasterType: data.disasterType || 'other',
    customDisasterTitle: data.customDisasterTitle || '',
    disasterTitleSi: data.disasterTitleSi || 'හදිසි ආපදාව',
    disasterTitleEn: data.disasterTitleEn || 'Emergency Disaster',
    disasterTitleTa: data.disasterTitleTa || 'அவசர பேரழிவு',
    description: data.description || '',
    latitude: typeof data.latitude === 'number' ? data.latitude : 6.9271,
    longitude: typeof data.longitude === 'number' ? data.longitude : 79.8612,
    locationName: data.locationName || 'නොදන්නා ස්ථානය',
    locationAccuracyMeters: data.locationAccuracyMeters || 10,
    incidentDate: data.incidentDate || new Date().toISOString().split('T')[0],
    incidentTime: data.incidentTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: data.createdAt || new Date().toISOString(),
    createdAtMs: typeof data.createdAtMs === 'number' ? data.createdAtMs : Date.now(),
    reportedByUserId: data.reportedByUserId || '',
    reportedByName: data.reportedByName || 'හදිසි දැනුම්දෙන්නා',
    reportedByPhone: data.reportedByPhone || '',
    status: data.status || 'active',
    severity: data.severity || 'critical',
    comments: Array.isArray(data.comments) ? data.comments : [],
    fakeReports: Array.isArray(data.fakeReports) ? data.fakeReports : [],
    isFlaggedFake: Boolean(data.isFlaggedFake),
    adminActionNote: data.adminActionNote || '',
  };
}

// Local Storage වෙතින් දැනට පවතින සියලුම Red Alerts ලබා ගැනීමේ ශ්‍රිතය
function getLocalRedAlerts(): RedAlertItem[] {
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('sahaya_red_alerts');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

/**
 * Real-time listener for Red Alerts (With Local Cache Fallback & Instant Sync)
 */
export function subscribeToRedAlerts(callback: (alerts: RedAlertItem[]) => void): () => void {
  const colRef = collection(db, RED_ALERTS_COLLECTION);
  const q = query(colRef, orderBy('createdAtMs', 'desc'), limit(50));

  const handleLocalEmit = () => {
    const localItems = getLocalRedAlerts();
    if (localItems.length > 0) {
      callback(localItems);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('sahaya_red_alerts_changed', handleLocalEmit);
  }

  const unsubscribeFirestore = onSnapshot(
    q,
    (snapshot) => {
      const remoteAlerts = snapshot.docs.map((docSnap) => mapDocToRedAlert(docSnap));
      const localAlerts = getLocalRedAlerts();

      const mergedMap = new Map<string, RedAlertItem>();
      localAlerts.forEach((item) => mergedMap.set(item.id, item));
      remoteAlerts.forEach((item) => mergedMap.set(item.id, item));

      const finalAlerts = Array.from(mergedMap.values()).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      );

      try {
        localStorage.setItem('sahaya_red_alerts', JSON.stringify(finalAlerts));
      } catch {}

      callback(finalAlerts);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, RED_ALERTS_COLLECTION);
      
      const localAlerts = getLocalRedAlerts();
      if (localAlerts.length > 0) {
        callback(localAlerts);
        return;
      }

      const defaultAlerts: RedAlertItem[] = [
        {
          id: 'default_emergency_alert_1',
          alertCode: '#RED-1024',
          disasterType: 'flood',
          disasterTitleSi: 'අධික වැසි සහ ගංවතුර අවදානම',
          disasterTitleEn: 'Heavy Rains & Flood Warning',
          disasterTitleTa: 'கனமழை மற்றும் வெள்ள எச்சரிக்கை',
          description: 'කැලණි ගං ද්‍රෝණියේ ජල මට්ටම ඉහළ යමින් පවතී. පහත් බිම්වල වෙසෙන ජනතාව ආරක්ෂිත ස්ථාන වෙත යොමු වන්න.',
          latitude: 6.9271,
          longitude: 79.8612,
          locationName: 'කොළඹ / කැලණි ගං ඉඩකඩ',
          locationAccuracyMeters: 10,
          incidentDate: new Date().toISOString().split('T')[0],
          incidentTime: '08:30 AM',
          createdAt: new Date().toISOString(),
          createdAtMs: Date.now(),
          reportedByUserId: 'admin_sys',
          reportedByName: 'ආපදා කළමනාකරණ මධ්‍යස්ථානය (DMC)',
          reportedByPhone: '117',
          status: 'active',
          severity: 'critical',
          comments: [],
          fakeReports: [],
          isFlaggedFake: false,
          adminActionNote: 'පද්ධති ස්වයංක්‍රීය හදිසි අනතුරු ඇඟවීමයි.'
        }
      ];
      callback(defaultAlerts);
    }
  );

  return () => {
    unsubscribeFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener('sahaya_red_alerts_changed', handleLocalEmit);
    }
  };
}

/**
 * Creates a new Red Alert in Firestore and instantly updates Local State
 */
export async function createRedAlertInFirestore(
  alertData: Omit<RedAlertItem, 'id'>
): Promise<string> {
  const tempId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const newAlertItem: RedAlertItem = {
    ...alertData,
    id: tempId,
  };

  try {
    const existing = getLocalRedAlerts();
    const updated = [newAlertItem, ...existing.filter((a) => a.id !== tempId)];
    localStorage.setItem('sahaya_red_alerts', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sahaya_red_alerts_changed'));
    }
  } catch {}

  try {
    const colRef = collection(db, RED_ALERTS_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...alertData,
      createdAtServer: serverTimestamp(),
    });

    try {
      const existing = getLocalRedAlerts();
      const updated = existing.map((a) => (a.id === tempId ? { ...a, id: docRef.id } : a));
      localStorage.setItem('sahaya_red_alerts', JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sahaya_red_alerts_changed'));
      }
    } catch {}

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, RED_ALERTS_COLLECTION);
    return tempId;
  }
}

/**
 * Updates status (active / resolved / cancelled) of a Red Alert
 */
export async function updateRedAlertStatus(
  alertId: string,
  status: 'active' | 'resolved' | 'cancelled',
  note?: string
): Promise<void> {
  try {
    const existing = getLocalRedAlerts();
    const updated = existing.map((a) =>
      a.id === alertId ? { ...a, status, adminActionNote: note !== undefined ? note : a.adminActionNote } : a
    );
    localStorage.setItem('sahaya_red_alerts', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sahaya_red_alerts_changed'));
    }

    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    await updateDoc(docRef, {
      status,
      ...(note !== undefined ? { adminActionNote: note } : {}),
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Failed to update Red Alert status:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

/**
 * Deletes a Red Alert permanently from Firestore and Local Storage
 */
export async function deleteRedAlertInFirestore(alertId: string): Promise<void> {
  try {
    const existing = getLocalRedAlerts();
    const updated = existing.filter((a) => a.id !== alertId);
    localStorage.setItem('sahaya_red_alerts', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sahaya_red_alerts_changed'));
    }

    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Failed to delete Red Alert:', error);
    handleFirestoreError(error, OperationType.DELETE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

/**
 * Adds comment to Red Alert
 */
export async function addCommentToRedAlert(
  alertId: string,
  comment: { authorName: string; text: string; createdAt?: string }
): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    await updateDoc(docRef, {
      comments: arrayUnion({
        ...comment,
        createdAt: comment.createdAt || new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.warn('Failed to add comment:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

/**
 * Flags a Red Alert as fake
 */
export async function flagRedAlertAsFake(
  alertId: string,
  reporterInfo: { userId?: string; name?: string; reason?: string }
): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    await updateDoc(docRef, {
      isFlaggedFake: true,
      fakeReports: arrayUnion({
        ...reporterInfo,
        reportedAt: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.warn('Failed to flag fake report:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

// ==============================================================
// 🔊 SYSTEM SETTINGS & SIREN TONE FIRESTORE SYNC
// ==============================================================
export const SYSTEM_SETTINGS_COLLECTION = 'system_settings';
export const SIREN_CONFIG_DOC = 'siren_config';

export interface SirenSettingsData {
  audioUrl?: string | null;
  fileName: string;
  presetType?: string;
  updatedAt?: string;
  updatedAtMs?: number;
  updatedBy?: string;
}

/**
 * Saves siren configuration permanently in Firestore cloud database
 */
export async function saveSirenSettingsToFirestore(
  settings: {
    audioUrl?: string | null;
    fileName: string;
    presetType?: string;
    updatedBy?: string;
  }
): Promise<void> {
  try {
    const settingRef = doc(db, SYSTEM_SETTINGS_COLLECTION, SIREN_CONFIG_DOC);
    await setDoc(
      settingRef,
      {
        audioUrl: settings.audioUrl || null,
        fileName: settings.fileName || 'Air Raid Siren (Preset)',
        presetType: settings.presetType || '',
        updatedBy: settings.updatedBy || 'Admin',
        updatedAt: new Date().toISOString(),
        updatedAtMs: Date.now(),
        updatedAtServer: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Failed to save siren settings to Firestore:', error);
    handleFirestoreError(error, OperationType.WRITE, `${SYSTEM_SETTINGS_COLLECTION}/${SIREN_CONFIG_DOC}`);
  }
}

/**
 * Real-time listener for global siren configuration across all devices and sessions
 */
export function subscribeToSirenSettings(
  callback: (settings: { audioUrl: string | null; fileName: string; presetType: string }) => void
): () => void {
  try {
    const settingRef = doc(db, SYSTEM_SETTINGS_COLLECTION, SIREN_CONFIG_DOC);
    return onSnapshot(
      settingRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          callback({
            audioUrl: data.audioUrl || null,
            fileName: data.fileName || 'Air Raid Siren (Preset)',
            presetType: data.presetType || '',
          });
        }
      },
      (error) => {
        console.warn('Siren settings listener warning:', error);
      }
    );
  } catch (err) {
    console.warn('subscribeToSirenSettings error:', err);
    return () => {};
  }
}

/**
 * One-time fetch for siren configuration
 */
export async function fetchSirenSettingsFromFirestore(): Promise<{
  audioUrl: string | null;
  fileName: string;
  presetType: string;
} | null> {
  try {
    const settingRef = doc(db, SYSTEM_SETTINGS_COLLECTION, SIREN_CONFIG_DOC);
    const snap = await getDoc(settingRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        audioUrl: data.audioUrl || null,
        fileName: data.fileName || 'Air Raid Siren (Preset)',
        presetType: data.presetType || '',
      };
    }
  } catch (err) {
    console.warn('fetchSirenSettings error:', err);
  }
  return null;
}
// ==============================================================
// 📦 BACKUP & USER PROFILE FIRESTORE OPERATIONS
// ==============================================================

/**
 * Fetches all posts/data from Firestore for PDF & Backup generation
 */
export async function fetchAllPostsBackupData(): Promise<any[]> {
  try {
    const colRef = collection(db, 'posts');
    const snap = await getDocs(colRef);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.warn('fetchAllPostsBackupData error:', err);
    return [];
  }
}

/**
 * Restores posts backup data back into Firestore
 */
export async function restorePostsBackupData(postsData: any[]): Promise<void> {
  try {
    if (!Array.isArray(postsData)) return;
    for (const item of postsData) {
      if (item && item.id) {
        const docRef = doc(db, 'posts', item.id);
        const { id, ...dataToSave } = item;
        await setDoc(docRef, dataToSave, { merge: true });
      }
    }
  } catch (err) {
    console.warn('restorePostsBackupData error:', err);
  }
}

/**
 * Syncs user profile data to Firestore database
 */
export async function syncUserProfileToFirestore(userId: string, profileData: any): Promise<void> {
  try {
    if (!userId) return;
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, {
      ...profileData,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('syncUserProfileToFirestore error:', err);
  }
}
// ==============================================================
// 🆘 HELP POSTS & CHAT FIRESTORE OPERATIONS
// ==============================================================

/**
 * Updates a help request/post status or details in Firestore
 */
export async function updateHelpPostInFirestore(
  postId: string,
  updateData: Record<string, any>
): Promise<void> {
  try {
    const docRef = doc(db, 'posts', postId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Failed to update help post:', error);
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
  }
}

/**
 * Sends a chat message for a post in Firestore
 */
export async function sendChatMessageToFirestore(
  postId: string,
  messageData: {
    senderId: string;
    senderName: string;
    text: string;
    createdAt?: string;
  }
): Promise<void> {
  try {
    const chatColRef = collection(db, 'posts', postId, 'messages');
    await addDoc(chatColRef, {
      ...messageData,
      createdAt: messageData.createdAt || new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Failed to send chat message:', error);
    handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/messages`);
  }
}
// ==============================================================
// 💬 REAL-TIME CHAT MESSAGES LISTENER
// ==============================================================

/**
 * Subscribes to real-time chat messages for a specific post
 */
export function subscribeToChatMessages(
  postId: string,
  callback: (messages: any[]) => void
): () => void {
  try {
    const chatColRef = collection(db, 'posts', postId, 'messages');
    const q = query(chatColRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(messages);
      },
      (error) => {
        console.warn('Chat messages listener error:', error);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('subscribeToChatMessages setup error:', err);
    return () => {};
  }
}
