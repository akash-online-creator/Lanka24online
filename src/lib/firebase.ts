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

  // Local Storage වෙනස්වීම් සඳහා Listener එකක් එක් කිරීම
  if (typeof window !== 'undefined') {
    window.addEventListener('sahaya_red_alerts_changed', handleLocalEmit);
  }

  const unsubscribeFirestore = onSnapshot(
    q,
    (snapshot) => {
      const remoteAlerts = snapshot.docs.map((docSnap) => mapDocToRedAlert(docSnap));
      const localAlerts = getLocalRedAlerts();

      // Remote දත්ත සහ Local Storage හි ඇති අලුත්ම දත්ත Merge කිරීම
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

      // Default emergency sample alert if completely empty
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

  // 1. ක්ෂණිකව Local Storage එකට එකතු කිරීම (එවිට Submit කළ හැටියේම UI එකට පෙන්නුම් කරයි)
  try {
    const existing = getLocalRedAlerts();
    const updated = [newAlertItem, ...existing.filter((a) => a.id !== tempId)];
    localStorage.setItem('sahaya_red_alerts', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sahaya_red_alerts_changed'));
    }
  } catch {}

  // 2. Cloud Firestore වෙත යැවීම
  try {
    const colRef = collection(db, RED_ALERTS_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...alertData,
      createdAtServer: serverTimestamp(),
    });

    // Firestore එකෙන් ලැබෙන සැබෑ Document ID එකෙන් Local Storage යාවත්කාලීන කිරීම
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
