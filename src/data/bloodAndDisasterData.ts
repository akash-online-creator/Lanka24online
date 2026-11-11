import { BloodDonationRequest, VolunteerDonor, DisasterReliefItem } from '../types';
import { 
  filterNonDeletedBloodRequests, 
  filterNonDeletedDisasterItems, 
  filterNonDeletedDonors,
  addDeletedBloodId,
  addDeletedDisasterId,
  addDeletedPostId,
  isPostPermanentlyDeleted,
  isBloodPermanentlyDeleted,
  isDisasterPermanentlyDeleted,
} from '../utils/deletedPostsManager';
import {
  subscribeToBloodRequestsFromFirestore,
  subscribeToVolunteerDonorsFromFirestore,
  subscribeToDisasterReliefFromFirestore,
  deleteBloodRequestFromFirestore,
  deleteDisasterReliefFromFirestore,
  updateHelpPostInFirestore,
  deleteHelpPostFromFirestore,
} from '../lib/firebase';

// 🩸 හදිසි ලේ අවශ්‍යතා ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල දත්ත ඉවත් කර ඇත)
export const INITIAL_BLOOD_REQUESTS: BloodDonationRequest[] = [];

// 💗 ස්වේච්ඡා ලේ පරිත්‍යාගශීලීන් ලැයිස්තුව ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල දත්ත ඉවත් කර ඇත)
export const INITIAL_VOLUNTEER_DONORS: VolunteerDonor[] = [];

// 📦 ආපදා සහන අවශ්‍යතා ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල දත්ත ඉවත් කර ඇත)
export const INITIAL_DISASTER_RELIEF_ITEMS: DisasterReliefItem[] = [];

const sortByNewest = <T extends { createdAtMs?: number }>(list: T[]): T[] => {
  return [...list].sort((a, b) => Number(b?.createdAtMs || 0) - Number(a?.createdAtMs || 0));
};

const emitBloodDisasterUpdated = () => {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('sahaya_blood_disaster_updated'));
    } catch {}
  }
};

// Real-time Firestore Cloud Sync Listeners
if (typeof window !== 'undefined') {
  try {
    subscribeToBloodRequestsFromFirestore((remoteReqs) => {
      if (!Array.isArray(remoteReqs)) return;
      const map = new Map<string, BloodDonationRequest>();
      getStoredBloodRequests().forEach((r) => {
        if (r && r.id && !isBloodPermanentlyDeleted(r.id) && !isPostPermanentlyDeleted(r.id)) {
          map.set(String(r.id), r);
        }
      });
      remoteReqs.forEach((r: any) => {
        if (r && r.id && !isBloodPermanentlyDeleted(r.id) && !isPostPermanentlyDeleted(r.id)) {
          map.set(String(r.id), r as BloodDonationRequest);
        }
      });
      const merged = sortByNewest(
        filterNonDeletedBloodRequests(Array.from(map.values())).filter(
          (r) => r && r.id && !isPostPermanentlyDeleted(r.id)
        )
      );
      try {
        localStorage.setItem('sahaya_blood_requests', JSON.stringify(merged));
        emitBloodDisasterUpdated();
      } catch {}
    });

    subscribeToVolunteerDonorsFromFirestore((remoteDonors) => {
      if (!Array.isArray(remoteDonors)) return;
      const map = new Map<string, VolunteerDonor>();
      getStoredVolunteerDonors().forEach((d) => {
        if (d && d.id) map.set(String(d.id), d);
      });
      remoteDonors.forEach((d: any) => {
        if (d && d.id) map.set(String(d.id), d as VolunteerDonor);
      });
      const merged = filterNonDeletedDonors(Array.from(map.values()));
      try {
        localStorage.setItem('sahaya_volunteer_donors', JSON.stringify(merged));
        emitBloodDisasterUpdated();
      } catch {}
    });

    subscribeToDisasterReliefFromFirestore((remoteRelief) => {
      if (!Array.isArray(remoteRelief)) return;
      const map = new Map<string, DisasterReliefItem>();
      getStoredDisasterReliefItems().forEach((r) => {
        if (r && r.id && !isDisasterPermanentlyDeleted(r.id) && !isPostPermanentlyDeleted(r.id)) {
          map.set(String(r.id), r);
        }
      });
      remoteRelief.forEach((r: any) => {
        if (r && r.id && !isDisasterPermanentlyDeleted(r.id) && !isPostPermanentlyDeleted(r.id)) {
          map.set(String(r.id), r as DisasterReliefItem);
        }
      });
      const merged = sortByNewest(
        filterNonDeletedDisasterItems(Array.from(map.values())).filter(
          (r) => r && r.id && !isPostPermanentlyDeleted(r.id)
        )
      );
      try {
        localStorage.setItem('sahaya_disaster_relief', JSON.stringify(merged));
        emitBloodDisasterUpdated();
      } catch {}
    });
  } catch {}
}

export const getStoredBloodRequests = (): BloodDonationRequest[] => {
  const saved = localStorage.getItem('sahaya_blood_requests');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return sortByNewest(
          filterNonDeletedBloodRequests(
            parsed.filter(
              (b: BloodDonationRequest) =>
                Boolean(b && b.id && !isBloodPermanentlyDeleted(b.id) && !isPostPermanentlyDeleted(b.id))
            )
          )
        );
      }
    } catch (e) { /* ignore */ }
  }
  return [];
};

export const saveBloodRequestsToStorage = (requests: BloodDonationRequest[]) => {
  const cleaned = sortByNewest(
    filterNonDeletedBloodRequests(requests).filter(
      (b) => b && b.id && !isBloodPermanentlyDeleted(b.id) && !isPostPermanentlyDeleted(b.id)
    )
  );
  localStorage.setItem('sahaya_blood_requests', JSON.stringify(cleaned));
  emitBloodDisasterUpdated();
};

export const getStoredVolunteerDonors = (): VolunteerDonor[] => {
  const saved = localStorage.getItem('sahaya_volunteer_donors');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return filterNonDeletedDonors(parsed.filter((d: VolunteerDonor) => Boolean(d && d.id)));
      }
    } catch (e) { /* ignore */ }
  }
  return [];
};

export const saveVolunteerDonorsToStorage = (donors: VolunteerDonor[]) => {
  const cleaned = filterNonDeletedDonors(donors);
  localStorage.setItem('sahaya_volunteer_donors', JSON.stringify(cleaned));
  emitBloodDisasterUpdated();
};

export const getStoredDisasterReliefItems = (): DisasterReliefItem[] => {
  const saved = localStorage.getItem('sahaya_disaster_relief');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return sortByNewest(
          filterNonDeletedDisasterItems(
            parsed.filter(
              (r: DisasterReliefItem) =>
                Boolean(r && r.id && !isDisasterPermanentlyDeleted(r.id) && !isPostPermanentlyDeleted(r.id))
            )
          )
        );
      }
    } catch (e) { /* ignore */ }
  }
  return [];
};

export const saveDisasterReliefItemsToStorage = (items: DisasterReliefItem[]) => {
  const cleaned = sortByNewest(
    filterNonDeletedDisasterItems(items).filter(
      (r) => r && r.id && !isDisasterPermanentlyDeleted(r.id) && !isPostPermanentlyDeleted(r.id)
    )
  );
  localStorage.setItem('sahaya_disaster_relief', JSON.stringify(cleaned));
  emitBloodDisasterUpdated();
};

export const purgeDisasterReliefEverywhere = (
  targetId: string,
  titleHint?: string,
  postCodeHint?: string
): DisasterReliefItem[] => {
  const idsToPurge = new Set<string>();
  if (targetId) idsToPurge.add(String(targetId));

  const currentDisaster = getStoredDisasterReliefItems();
  const matchedItem = currentDisaster.find(
    (d) =>
      d &&
      (String(d.id) === String(targetId) ||
        (postCodeHint && String((d as any).postCode || `#EMG-${String(d.id).slice(-4)}`) === String(postCodeHint)))
  );
  const cleanTitle = (matchedItem?.title || titleHint || '')
    .replace(/^📦\s*(හදිසි ආපදා සහන ඉල්ලීමක්:|හදිසි ආපදා සහනාධාර අවශ්‍යතාවය:)?\s*/i, '')
    .split(':')[0]
    .trim()
    .toLowerCase();

  currentDisaster.forEach((d) => {
    if (!d || !d.id) return;
    const dCode = String((d as any).postCode || `#EMG-${String(d.id).slice(-4)}`);
    const dTitle = String(d.title || '').trim().toLowerCase();
    if (
      String(d.id) === String(targetId) ||
      (postCodeHint && dCode === String(postCodeHint)) ||
      (cleanTitle && cleanTitle.length >= 3 && dTitle && (dTitle === cleanTitle || cleanTitle.includes(dTitle)))
    ) {
      idsToPurge.add(String(d.id));
    }
  });

  try {
    const rawPosts = localStorage.getItem('sahaya_help_posts');
    const parsedPosts = rawPosts ? JSON.parse(rawPosts) : [];
    if (Array.isArray(parsedPosts)) {
      parsedPosts.forEach((p: any) => {
        if (!p || !p.id) return;
        const pCode = String(p.postCode || '');
        const pText = `${p.title || ''} ${p.whatHappened || ''} ${p.whatIsNeeded || ''}`.toLowerCase();
        const isDisasterPost =
          p.postType === 'disaster_relief' ||
          p.serviceType === 'disaster_relief' ||
          pCode.startsWith('#EMG-') ||
          (p.tagName && String(p.tagName).includes('ආපදා සහන'));
        if (
          String(p.id) === String(targetId) ||
          (postCodeHint && pCode === String(postCodeHint)) ||
          (isDisasterPost && cleanTitle && cleanTitle.length >= 3 && pText.includes(cleanTitle))
        ) {
          idsToPurge.add(String(p.id));
        }
      });
      const remainingPosts = parsedPosts.filter((p: any) => p && !idsToPurge.has(String(p.id)));
      localStorage.setItem('sahaya_help_posts', JSON.stringify(remainingPosts));
    }
  } catch {}

  idsToPurge.forEach((pid) => {
    addDeletedDisasterId(pid);
    addDeletedPostId(pid);
    deleteDisasterReliefFromFirestore(pid).catch(() => {});
    updateHelpPostInFirestore(pid, {
      isDeleted: true,
      status: 'deleted',
      deletedAt: new Date().toISOString(),
    }).catch(() => {});
    deleteHelpPostFromFirestore(pid).catch(() => {});
  });

  const remainingDisaster = currentDisaster.filter((d) => d && !idsToPurge.has(String(d.id)));
  saveDisasterReliefItemsToStorage(remainingDisaster);

  try {
    window.dispatchEvent(new Event('sahaya_post_deleted'));
    window.dispatchEvent(new CustomEvent('sahaya_blood_disaster_updated'));
    window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
  } catch {}

  return remainingDisaster;
};

export const purgeBloodRequestEverywhere = (
  targetId: string,
  postCodeHint?: string,
  patientNameHint?: string
): BloodDonationRequest[] => {
  const idsToPurge = new Set<string>();
  if (targetId) idsToPurge.add(String(targetId));

  const currentBlood = getStoredBloodRequests();
  const matchedReq = currentBlood.find(
    (b) =>
      b &&
      (String(b.id) === String(targetId) ||
        (postCodeHint && String(b.postCode || '') === String(postCodeHint)))
  );
  const effectiveCode = matchedReq?.postCode || postCodeHint || '';
  const cleanPatient = (matchedReq?.patientName || patientNameHint || '').trim().toLowerCase();

  currentBlood.forEach((b) => {
    if (!b || !b.id) return;
    if (
      String(b.id) === String(targetId) ||
      (effectiveCode && String(b.postCode || '') === String(effectiveCode)) ||
      (cleanPatient && cleanPatient.length >= 3 && String(b.patientName || '').trim().toLowerCase() === cleanPatient)
    ) {
      idsToPurge.add(String(b.id));
    }
  });

  try {
    const rawPosts = localStorage.getItem('sahaya_help_posts');
    const parsedPosts = rawPosts ? JSON.parse(rawPosts) : [];
    if (Array.isArray(parsedPosts)) {
      parsedPosts.forEach((p: any) => {
        if (!p || !p.id) return;
        const pCode = String(p.postCode || '');
        const pText = `${p.title || ''} ${p.whatHappened || ''} ${p.whatIsNeeded || ''}`.toLowerCase();
        if (
          String(p.id) === String(targetId) ||
          (effectiveCode && pCode === String(effectiveCode)) ||
          (pCode.startsWith('#BLD-') && cleanPatient && cleanPatient.length >= 3 && pText.includes(cleanPatient))
        ) {
          idsToPurge.add(String(p.id));
        }
      });
      const remainingPosts = parsedPosts.filter((p: any) => p && !idsToPurge.has(String(p.id)));
      localStorage.setItem('sahaya_help_posts', JSON.stringify(remainingPosts));
    }
  } catch {}

  idsToPurge.forEach((pid) => {
    addDeletedBloodId(pid);
    addDeletedPostId(pid);
    deleteBloodRequestFromFirestore(pid).catch(() => {});
    updateHelpPostInFirestore(pid, {
      isDeleted: true,
      status: 'deleted',
      deletedAt: new Date().toISOString(),
    }).catch(() => {});
    deleteHelpPostFromFirestore(pid).catch(() => {});
  });

  const remainingBlood = currentBlood.filter((b) => b && !idsToPurge.has(String(b.id)));
  saveBloodRequestsToStorage(remainingBlood);

  try {
    window.dispatchEvent(new Event('sahaya_post_deleted'));
    window.dispatchEvent(new CustomEvent('sahaya_blood_disaster_updated'));
    window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
  } catch {}

  return remainingBlood;
};

export const getStoredSupportedBloodIds = (): string[] => {
  try {
    const saved = localStorage.getItem('sahaya_user_supported_blood_ids');
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return [];
};

export const saveSupportedBloodIdsToStorage = (ids: string[]) => {
  localStorage.setItem('sahaya_user_supported_blood_ids', JSON.stringify(ids));
};

export const getStoredSupportedDisasterIds = (): string[] => {
  try {
    const saved = localStorage.getItem('sahaya_user_supported_disaster_ids');
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return [];
};

export const saveSupportedDisasterIdsToStorage = (ids: string[]) => {
  localStorage.setItem('sahaya_user_supported_disaster_ids', JSON.stringify(ids));
};
