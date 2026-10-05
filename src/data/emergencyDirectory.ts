import { EmergencyServiceContact } from '../types';

export const SRI_LANKA_EMERGENCY_CONTACTS: EmergencyServiceContact[] = [
  // National Emergency Services
  {
    id: 'emg_1990',
    serviceNameSi: '1990 සුවසැරිය නොමිලේ ගිලන්රථ සේවාව',
    serviceNameEn: '1990 Suwa Seriya Free Ambulance Service',
    category: 'ambulance',
    phone: '1990',
    isNational: true,
    descriptionSi: 'හදිසි අනතුරු හා රෝගී තත්ත්වයන් සඳහා දිවයින පුරා නොමිලේ පැය 24 පුරා ක්‍රියාත්මක වේ.',
  },
  {
    id: 'emg_119',
    serviceNameSi: '119 පොලිස් හදිසි ඇමතුම් අංශය',
    serviceNameEn: '119 Police Emergency Hotline',
    category: 'police',
    phone: '119',
    altPhone: '0112433333',
    isNational: true,
    descriptionSi: 'හදිසි අපරාධ, අනතුරු සහ සාමය කඩවීම් පිළිබඳ දැනුම්දීමට.',
  },
  {
    id: 'emg_110',
    serviceNameSi: '110 ගිනි නිවීම් හා ගලවා ගැනීමේ සේවාව',
    serviceNameEn: '110 Fire & Rescue Service',
    category: 'fire',
    phone: '110',
    altPhone: '0112422222',
    isNational: true,
    descriptionSi: 'ගිනි ගැනීම්, හදිසි ගලවා ගැනීම් හා ජීවිතාරක්ෂක මෙහෙයුම්.',
  },
  {
    id: 'emg_117',
    serviceNameSi: '117 ආපදා කළමනාකරණ මධ්‍යස්ථානය (DMC)',
    serviceNameEn: '117 Disaster Management Centre Hotline',
    category: 'disaster',
    phone: '117',
    altPhone: '0112136136',
    isNational: true,
    descriptionSi: 'ගංවතුර, නායයෑම්, සුළිසුළං සහ ස්වභාවික ආපදා තොරතුරු හා සහන සේවා.',
  },
  {
    id: 'emg_1938',
    serviceNameSi: '1938 කාන්තා හා ළමා හදිසි උපකාරක සේවාව',
    serviceNameEn: '1938 Women & Child Emergency Helpline',
    category: 'helpline',
    phone: '1938',
    isNational: true,
    descriptionSi: 'කාන්තා හා ළමා හිංසනය වැළැක්වීම සහ ආරක්ෂාව සඳහා.',
  },
  {
    id: 'emg_1929',
    serviceNameSi: '1929 ජාතික ළමා ආරක්ෂක අධිකාරිය (Childline)',
    serviceNameEn: '1929 Childline National Helpline',
    category: 'helpline',
    phone: '1929',
    isNational: true,
    descriptionSi: 'ළමා අපයෝජන හා හදිසි ළමා උපකාර සඳහා.',
  },
  {
    id: 'emg_1919',
    serviceNameSi: '1919 රජයේ තොරතුරු කේන්ද්‍රය (GIC)',
    serviceNameEn: '1919 Government Information Centre',
    category: 'helpline',
    phone: '1919',
    isNational: true,
    descriptionSi: 'සියලුම රාජ්‍ය සේවා, ආයතන හා ලියකියවිලි පිළිබඳ ක්ෂණික තොරතුරු.',
  },
  {
    id: 'emg_1926',
    serviceNameSi: '1926 මානසික සුවතා උපකාරක සේවාව (NIMH)',
    serviceNameEn: '1926 Mental Health Support Helpline',
    category: 'helpline',
    phone: '1926',
    isNational: true,
    descriptionSi: 'මානසික පීඩනය, ආතතිය හා ජීවිතයට උපකාර අවශ්‍ය අවස්ථාවල නොමිලේ උපදේශනය.',
  },
  {
    id: 'emg_1989',
    serviceNameSi: '1989 ශ්‍රී ලංකා රතු කුරුස සංගමය (Red Cross)',
    serviceNameEn: '1989 Sri Lanka Red Cross Society',
    category: 'disaster',
    phone: '1989',
    altPhone: '0112691095',
    isNational: true,
    descriptionSi: 'හදිසි ප්‍රථමාධාර සහ ආපදා ආධාර සහන සේවා.',
  },
  {
    id: 'emg_1987',
    serviceNameSi: '1987 ජාතික ජල සම්පාදන හදිසි සේවාව',
    serviceNameEn: '1987 Water Supply Emergency Hotline',
    category: 'utilities',
    phone: '1987',
    isNational: true,
    descriptionSi: 'හදිසි ජල නල බිඳවැටීම් හා පානීය ජල ගැටලු දැනුම්දීම.',
  },
  {
    id: 'emg_1987_ceb',
    serviceNameSi: '1987 ලංකා විදුලිබල මණ්ඩලය (CEB Hotline)',
    serviceNameEn: '1987 Ceylon Electricity Board Hotline',
    category: 'utilities',
    phone: '1987',
    altPhone: '0112448987',
    isNational: true,
    descriptionSi: 'හදිසි විදුලි බිඳවැටීම් සහ අනතුරුදායක විදුලි රැහැන් දැනුම්දීම.',
  },
  {
    id: 'emg_1912',
    serviceNameSi: '1912 සංචාරක පොලිස් හා උපකාරක සේවාව',
    serviceNameEn: '1912 Tourist Police & Information',
    category: 'police',
    phone: '1912',
    isNational: true,
    descriptionSi: 'දේශීය හා විදේශීය සංචාරකයින් සඳහා හදිසි ආරක්ෂාව හා තොරතුරු.',
  },

  // District Hospitals & Police
  {
    id: 'hosp_colombo_nhsl',
    serviceNameSi: 'කොළඹ ජාතික රෝහල (NHSL Colombo)',
    serviceNameEn: 'National Hospital of Sri Lanka, Colombo',
    category: 'hospital',
    phone: '0112691111',
    district: 'කොළඹ',
    address: 'Regent Street, Colombo 08',
    isNational: false,
    descriptionSi: 'දිවයිනේ ප්‍රධානතම හදිසි අනතුරු ප්‍රතිකාර ඒකකය (Trauma Unit).',
  },
  {
    id: 'hosp_gampaha',
    serviceNameSi: 'ගම්පහ දිස්ත්‍රික් මහා රෝහල',
    serviceNameEn: 'Gampaha District General Hospital',
    category: 'hospital',
    phone: '0332222261',
    district: 'ගම්පහ',
    address: 'Hospital Road, Gampaha',
    isNational: false,
    descriptionSi: 'ගම්පහ දිස්ත්‍රික්කයේ ප්‍රධාන හදිසි ප්‍රතිකාර රෝහල.',
  },
  {
    id: 'hosp_kandy',
    serviceNameSi: 'මහනුවර ජාතික රෝහල (Kandy)',
    serviceNameEn: 'National Hospital, Kandy',
    category: 'hospital',
    phone: '0812233337',
    district: 'මහනුවර',
    address: 'William Gopallawa Mawatha, Kandy',
    isNational: false,
    descriptionSi: 'මධ්‍යම පළාතේ ප්‍රධානතම ජාතික රෝහල හා අනතුරු ඒකකය.',
  },
  {
    id: 'hosp_galle_karapitiya',
    serviceNameSi: 'කරාපිටිය ශික්ෂණ රෝහල (ගාල්ල)',
    serviceNameEn: 'Teaching Hospital Karapitiya, Galle',
    category: 'hospital',
    phone: '0912232250',
    district: 'ගාල්ල',
    address: 'Karapitiya, Galle',
    isNational: false,
    descriptionSi: 'දකුණු පළාතේ ප්‍රධානතම ශික්ෂණ රෝහල හා විශේෂඥ ප්‍රතිකාර මධ්‍යස්ථානය.',
  },
  {
    id: 'hosp_kurunegala',
    serviceNameSi: 'කුරුණෑගල ශික්ෂණ රෝහල',
    serviceNameEn: 'Teaching Hospital Kurunegala',
    category: 'hospital',
    phone: '0372222261',
    district: 'කුරුණෑගල',
    address: 'Hospital Road, Kurunegala',
    isNational: false,
    descriptionSi: 'වයඹ පළාතේ ප්‍රධාන ශික්ෂණ රෝහල.',
  },
  {
    id: 'hosp_anuradhapura',
    serviceNameSi: 'අනුරාධපුර ශික්ෂණ රෝහල',
    serviceNameEn: 'Teaching Hospital Anuradhapura',
    category: 'hospital',
    phone: '0252222261',
    district: 'අනුරාධපුර',
    address: 'Maithripala Senanayake Mawatha, Anuradhapura',
    isNational: false,
    descriptionSi: 'උතුරු මැද පළාතේ ප්‍රධානතම ශික්ෂණ රෝහල.',
  },
  {
    id: 'hosp_ratnapura',
    serviceNameSi: 'රත්නපුර ශික්ෂණ රෝහල',
    serviceNameEn: 'Teaching Hospital Ratnapura',
    category: 'hospital',
    phone: '0452222261',
    district: 'රත්නපුර',
    address: 'Hospital Road, Ratnapura',
    isNational: false,
    descriptionSi: 'සබරගමුව පළාතේ ප්‍රධාන රෝහල.',
  },
  {
    id: 'hosp_badulla',
    serviceNameSi: 'බදුල්ල පළාත් මහ රෝහල',
    serviceNameEn: 'Provincial General Hospital Badulla',
    category: 'hospital',
    phone: '0552222261',
    district: 'බදුල්ල',
    address: 'Hospital Road, Badulla',
    isNational: false,
    descriptionSi: 'ඌව පළාතේ ප්‍රධාන රෝහල.',
  },
  {
    id: 'hosp_kalutara',
    serviceNameSi: 'නාගොඩ මහ රෝහල (කළුතර)',
    serviceNameEn: 'Nagoda District General Hospital, Kalutara',
    category: 'hospital',
    phone: '0342222261',
    district: 'කළුතර',
    address: 'Nagoda, Kalutara',
    isNational: false,
    descriptionSi: 'කළුතර දිස්ත්‍රික්කයේ ප්‍රධාන රෝහල.',
  },
  {
    id: 'hosp_matara',
    serviceNameSi: 'මාතර දිස්ත්‍රික් මහ රෝහල',
    serviceNameEn: 'District General Hospital Matara',
    category: 'hospital',
    phone: '0412222261',
    district: 'මාතර',
    address: 'Hospital Road, Matara',
    isNational: false,
    descriptionSi: 'මාතර දිස්ත්‍රික් ප්‍රධාන රෝහල.',
  },
];

const CUSTOM_EMERGENCY_STORAGE_KEY = 'sahaya_custom_emergency_contacts_v2';
const DEFAULT_OVERRIDES_STORAGE_KEY = 'sahaya_default_emergency_overrides_v2';
const ADMIN_EMERGENCY_ALERTS_KEY = 'sahaya_emergency_admin_alerts_v2';

export interface EmergencyAdminAlert {
  id: string;
  contactId: string;
  serviceName: string;
  phone: string;
  reportedCount: number;
  reportedAt: string;
  reportedUsers: Array<{ name: string; phone?: string; reason?: string }>;
  isResolved: boolean;
}

const getStoredCustomContacts = (): EmergencyServiceContact[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_EMERGENCY_STORAGE_KEY);
    if (!raw) {
      // Migrate from v1 if exists
      const v1 = localStorage.getItem('sahaya_custom_emergency_contacts_v1');
      if (v1) {
        const parsed = JSON.parse(v1);
        if (Array.isArray(parsed)) {
          localStorage.setItem(CUSTOM_EMERGENCY_STORAGE_KEY, JSON.stringify(parsed));
          return parsed;
        }
      }
      return [];
    }
    const customList: EmergencyServiceContact[] = JSON.parse(raw);
    return Array.isArray(customList) ? customList : [];
  } catch (err) {
    console.error('Failed to load custom emergency contacts:', err);
    return [];
  }
};

const getDefaultOverrides = (): Record<string, Partial<EmergencyServiceContact>> => {
  try {
    const raw = localStorage.getItem(DEFAULT_OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
};

const saveDefaultOverrides = (overrides: Record<string, Partial<EmergencyServiceContact>>) => {
  try {
    localStorage.setItem(DEFAULT_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch (err) {
    console.error('Failed to save default overrides:', err);
  }
};

/**
 * Get all emergency contacts for public / user directory.
 * Filters out contacts that have been deactivated (e.g. received 3 invalid reports).
 */
export const getStoredEmergencyContacts = (includeDeactivated: boolean = false): EmergencyServiceContact[] => {
  try {
    const customList = getStoredCustomContacts();
    const overrides = getDefaultOverrides() || {};

    const mergedDefaults: EmergencyServiceContact[] = (SRI_LANKA_EMERGENCY_CONTACTS || []).map((c) => {
      if (c && c.id && overrides[c.id]) {
        return { ...c, ...overrides[c.id] };
      }
      return c;
    });

    const combined = [...(customList || []).filter((c) => Boolean(c && c.id)), ...mergedDefaults];

    if (includeDeactivated) {
      return combined;
    }

    // Hide deactivated numbers from public view
    return combined.filter((c) => c && !c.isInactiveDeactivated);
  } catch (err) {
    console.error('Failed to load emergency contacts:', err);
    return SRI_LANKA_EMERGENCY_CONTACTS;
  }
};

/**
 * Get all emergency contacts for the Admin Panel.
 */
export const getAllEmergencyContactsForAdmin = (): EmergencyServiceContact[] => {
  return getStoredEmergencyContacts(true);
};

/**
 * Save / Update a custom emergency contact.
 */
export const saveCustomEmergencyContact = (contact: EmergencyServiceContact): EmergencyServiceContact[] => {
  try {
    const existing = (getStoredCustomContacts() || []).filter((c) => Boolean(c && c.id));
    const index = existing.findIndex((c) => c && c.id === contact.id);
    let updated: EmergencyServiceContact[];
    if (index >= 0) {
      updated = existing.map((c) => (c && c.id === contact.id ? contact : c));
    } else {
      updated = [contact, ...existing];
    }
    
    localStorage.setItem(CUSTOM_EMERGENCY_STORAGE_KEY, JSON.stringify(updated));
    return getStoredEmergencyContacts(false);
  } catch (err) {
    console.error('Failed to save custom emergency contact:', err);
    return getStoredEmergencyContacts(false);
  }
};

/**
 * Delete a custom emergency contact or deactivate default contact.
 */
export const deleteCustomEmergencyContact = (id: string): EmergencyServiceContact[] => {
  try {
    const customList = (getStoredCustomContacts() || []).filter((c) => Boolean(c && c.id));
    const isCustom = customList.some((c) => c && c.id === id);

    if (isCustom) {
      const updated = customList.filter((c) => c && c.id !== id);
      localStorage.setItem(CUSTOM_EMERGENCY_STORAGE_KEY, JSON.stringify(updated));
    } else {
      // Is default contact: override as deactivated/removed
      const overrides = getDefaultOverrides() || {};
      overrides[id] = {
        ...overrides[id],
        isInactiveDeactivated: true,
        adminStatus: 'removed',
        deactivatedAt: new Date().toISOString(),
      };
      saveDefaultOverrides(overrides);
    }

    return getStoredEmergencyContacts(false);
  } catch (err) {
    console.error('Failed to delete emergency contact:', err);
    return getStoredEmergencyContacts(false);
  }
};

/**
 * Report an Emergency Contact as Inactive / Incorrect (නිවැරදි නොවේ / ක්‍රියා විරහිතයි).
 * When 3 users confirm/report this number, it is automatically deactivated and alerted to Admin.
 */
export const reportEmergencyContactInactive = (
  contactId: string,
  user?: { id?: string; name?: string; phone?: string } | null,
  reason?: string
): {
  success: boolean;
  message: string;
  isNowDeactivated: boolean;
  totalReports: number;
  contact?: EmergencyServiceContact;
} => {
  try {
    const allContacts = getAllEmergencyContactsForAdmin();
    const contact = (allContacts || []).find((c) => c && c.id === contactId);

    if (!contact) {
      return {
        success: false,
        message: 'හදිසි සේවා අංකය හමු නොවීය.',
        isNowDeactivated: false,
        totalReports: 0,
      };
    }

    const currentReportUserIds = contact.reportedInactiveUserIds || [];
    const userId = user?.id || 'guest_user';

    // Check if user already reported
    if (userId && currentReportUserIds.includes(userId)) {
      return {
        success: false,
        message: 'ඔබ දැනටමත් මෙම අංකය ක්‍රියා විරහිත බවට වාර්තා කර ඇත.',
        isNowDeactivated: !!contact.isInactiveDeactivated,
        totalReports: contact.reportedInactiveCount || currentReportUserIds.length,
        contact,
      };
    }

    const updatedUserIds = [...currentReportUserIds, userId];
    const newReportCount = (contact.reportedInactiveCount || 0) + 1;
    const nowIso = new Date().toISOString();
    const nowReadable = nowIso.replace('T', ' ').slice(0, 16);

    const newReportDetail = {
      userId: userId,
      userName: user?.name || 'පරිශීලක',
      userPhone: user?.phone || '',
      reportedAt: nowReadable,
      reportedAtMs: Date.now(),
      reason: reason || 'දුරකථන අංකය ක්‍රියා විරහිතයි / වැරදියි',
    };

    const updatedDetails = [...(contact.reportedInactiveDetails || []), newReportDetail];

    const isNowDeactivated = newReportCount >= 3;

    const updatedContact: EmergencyServiceContact = {
      ...contact,
      reportedInactiveCount: newReportCount,
      reportedInactiveUserIds: updatedUserIds,
      reportedInactiveDetails: updatedDetails,
      isInactiveDeactivated: isNowDeactivated || contact.isInactiveDeactivated,
      deactivatedAt: isNowDeactivated ? nowIso : contact.deactivatedAt,
      adminStatus: isNowDeactivated ? 'flagged' : (contact.adminStatus || 'active'),
    };

    // Save to custom or default overrides
    const customList = (getStoredCustomContacts() || []).filter((c) => Boolean(c && c.id));
    const isCustom = customList.some((c) => c && c.id === contactId);

    if (isCustom) {
      const newCustomList = customList.map((c) => (c && c.id === contactId ? updatedContact : c));
      localStorage.setItem(CUSTOM_EMERGENCY_STORAGE_KEY, JSON.stringify(newCustomList));
    } else {
      const overrides = getDefaultOverrides() || {};
      overrides[contactId] = {
        reportedInactiveCount: newReportCount,
        reportedInactiveUserIds: updatedUserIds,
        reportedInactiveDetails: updatedDetails,
        isInactiveDeactivated: isNowDeactivated || overrides[contactId]?.isInactiveDeactivated,
        deactivatedAt: isNowDeactivated ? nowIso : overrides[contactId]?.deactivatedAt,
        adminStatus: isNowDeactivated ? 'flagged' : (overrides[contactId]?.adminStatus || 'active'),
      };
      saveDefaultOverrides(overrides);
    }

    // If reached 3 reports, create an admin alert record
    if (isNowDeactivated) {
      createEmergencyAdminAlert(updatedContact);
    }

    const msg = isNowDeactivated
      ? `⚠️ පරිශීලකයින් 3 දෙනෙකු විසින් මෙම අංකය ක්‍රියා විරහිත බව සනාථ කර ඇති බැවින්, එය නාමාවලියෙන් ඉවත් කර පරිපාලක (Admin) වෙත දැනුවත් කරන ලදී.`
      : `✅ ස්තූතියි! අංකය ක්‍රියා විරහිත බවට ඔබගේ වාර්තාව සටහන් කරගන්නා ලදී. (වත්මන් වාර්තා: ${newReportCount}/3)`;

    return {
      success: true,
      message: msg,
      isNowDeactivated,
      totalReports: newReportCount,
      contact: updatedContact,
    };
  } catch (err) {
    console.error('Failed to report emergency contact:', err);
    return {
      success: false,
      message: 'වාර්තා කිරීමේදී දෝෂයක් ඇතිවිය.',
      isNowDeactivated: false,
      totalReports: 0,
    };
  }
};

/**
 * Log Admin Alert for 3+ inactive reports
 */
export const createEmergencyAdminAlert = (contact: EmergencyServiceContact) => {
  try {
    const raw = localStorage.getItem(ADMIN_EMERGENCY_ALERTS_KEY);
    const existing: EmergencyAdminAlert[] = raw ? JSON.parse(raw) : [];

    const alertItem: EmergencyAdminAlert = {
      id: `alert_${contact.id}_${Date.now()}`,
      contactId: contact.id,
      serviceName: contact.serviceNameSi,
      phone: contact.phone,
      reportedCount: contact.reportedInactiveCount || 3,
      reportedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      reportedUsers: (contact.reportedInactiveDetails || []).map((d) => ({
        name: d.userName,
        phone: d.userPhone,
        reason: d.reason,
      })),
      isResolved: false,
    };

    const filtered = existing.filter((a) => a.contactId !== contact.id);
    localStorage.setItem(ADMIN_EMERGENCY_ALERTS_KEY, JSON.stringify([alertItem, ...filtered]));
  } catch (err) {
    console.warn('Failed to save emergency admin alert:', err);
  }
};

export const getEmergencyAdminAlerts = (): EmergencyAdminAlert[] => {
  try {
    const raw = localStorage.getItem(ADMIN_EMERGENCY_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
};

/**
 * Admin action: Reactivate / Verify a contact and clear inactive reports.
 */
export const adminReactivateEmergencyContact = (contactId: string): EmergencyServiceContact[] => {
  try {
    const customList = (getStoredCustomContacts() || []).filter((c) => Boolean(c && c.id));
    const isCustom = customList.some((c) => c && c.id === contactId);

    if (isCustom) {
      const updated = customList.map((c) => {
        if (c && c.id === contactId) {
          return {
            ...c,
            isInactiveDeactivated: false,
            adminStatus: 'verified' as const,
            reportedInactiveCount: 0,
            reportedInactiveUserIds: [],
            reportedInactiveDetails: [],
            adminReviewedAt: new Date().toISOString(),
          };
        }
        return c;
      });
      localStorage.setItem(CUSTOM_EMERGENCY_STORAGE_KEY, JSON.stringify(updated));
    } else {
      const overrides = getDefaultOverrides() || {};
      overrides[contactId] = {
        ...overrides[contactId],
        isInactiveDeactivated: false,
        adminStatus: 'verified',
        reportedInactiveCount: 0,
        reportedInactiveUserIds: [],
        reportedInactiveDetails: [],
        adminReviewedAt: new Date().toISOString(),
      };
      saveDefaultOverrides(overrides);
    }

    return getStoredEmergencyContacts(false);
  } catch (err) {
    console.error('Failed to reactivate emergency contact:', err);
    return getStoredEmergencyContacts(false);
  }
};

/**
 * Admin action: Mark an emergency alert as resolved.
 */
export const markEmergencyAdminAlertResolved = (alertId: string) => {
  try {
    const raw = localStorage.getItem(ADMIN_EMERGENCY_ALERTS_KEY);
    if (!raw) return;
    const list: EmergencyAdminAlert[] = JSON.parse(raw);
    const updated = (list || []).map((a) => (a && a.id === alertId ? { ...a, isResolved: true } : a));
    localStorage.setItem(ADMIN_EMERGENCY_ALERTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to resolve alert:', err);
  }
};

