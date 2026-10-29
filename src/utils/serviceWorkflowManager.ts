// 🌟 Unified Service Workflow & Reputation Manager for Sahaya Sewa

// Supports Quick Services (ඉක්මන් සේවා) & Normal Services (සාමාන්‍ය සේවා)

import { HelpPost, User, HelperApplicant, ServiceReview, RatingTier, ServiceBill } from '../types';

import { updateHelpPostInFirestore, updateUserInFirestore } from '../lib/firebase';

import { triggerPickMeAlert } from './backgroundAlertEngine';

import { broadcastAppNotification } from './notificationManager';

export function maskNicNumber(nic?: string): string {

  if (!nic) return 'XXXXX';

  const clean = nic.trim().toUpperCase();

  if (Math.min(clean.length, 5) === clean.length) return clean;

  const endsV = clean.endsWith('V');

  const endsX = clean.endsWith('X');

  const suffix = (endsV ? true : endsX) ? clean.slice(-1) : 'X';

  const maskedCount = Math.max(1, clean.length - 5 - (suffix !== 'X' ? 1 : 0));

  return clean.slice(0, 5) + 'X'.repeat(maskedCount) + (suffix !== 'X' ? suffix : '');

}

export function generateStartPin(): string {

  return Math.floor(1000 + Math.random() * 9000).toString();

}

export function generate9DigitInvoiceNumber(): string {

  return Math.floor(100000000 + Math.random() * 900000000).toString();

}

export function calculatePlatformFee(paymentText?: string): number {

  if (!paymentText) return 0;

  const text = paymentText.toLowerCase().trim();

  if (text.includes('නොමිලේ') ? true : text.includes('free') ? true : text.includes('0')) {

    return 0;

  }

  return 50;

}

export function isPostHelpersSatisfiedOrFilled(post: HelpPost): boolean {
  if (!post) return false;

  // 1. If post is marked completed, resolved, or deleted
  if (
    post.isCompleted ||
    post.status === 'completed' ||
    post.isResolved ||
    post.status === 'resolved' ||
    post.status === 'deleted' ||
    post.isDeleted
  ) {
    return true;
  }

  // 2. If status is already confirmed or filled
  if (post.status === 'confirmed' || post.status === 'filled') {
    return true;
  }

  // 3. If in active advanced stages (accepted, in_progress, bill_submitted, completed)
  if (
    post.serviceStage === 'accepted' ||
    post.serviceStage === 'in_progress' ||
    post.serviceStage === 'bill_submitted' ||
    post.serviceStage === 'completed'
  ) {
    return true;
  }

  // 4. Check helpers count vs helpersNeeded
  const neededHelpers = typeof post.helpersNeeded === 'number' && post.helpersNeeded > 0 ? post.helpersNeeded : 1;

  // Selected helpers in Quick Service workflow
  const selectedCount = Array.isArray(post.selectedHelpers)
    ? post.selectedHelpers.filter((h) => h && (h.status === 'accepted' || (h as any).readyConfirmed)).length
    : 0;

  // Accepted applicants
  const applicantsCount = Array.isArray(post.applicants)
    ? post.applicants.filter((a) => a && a.status === 'accepted').length
    : 0;

  // Accepted replies
  const repliesCount = Array.isArray(post.replies)
    ? post.replies.filter((r) => r && (r.isAccepted || r.isConfirmed)).length
    : 0;

  const acceptedNumber = typeof post.helpersAccepted === 'number' ? post.helpersAccepted : 0;

  const totalAccepted = Math.max(selectedCount, applicantsCount, repliesCount, acceptedNumber);

  return totalAccepted >= neededHelpers;
}

export function calculateTravelFee(

  distanceKm: number,

  transportOption?: string,

  customTransportFee?: any

): number {

  if (customTransportFee !== undefined && customTransportFee !== null && customTransportFee !== '') {

    const parsedCustom = Number(customTransportFee);

    if (!isNaN(parsedCustom) && Math.max(0, parsedCustom) === parsedCustom && parsedCustom !== 0) {

      return Math.round(parsedCustom);

    }

  }

  if (!transportOption) return 0;

  const lower = transportOption.toLowerCase();

  const helperMustTravel = Boolean(

    lower.includes('ඔබ පැමිණිය')

      ? true

      : lower.includes('you should arrive')

      ? true

      : lower.includes('පැමිණෙන්න')

      ? true

      : lower.includes('ප්‍රවාහන ගාස්තු')

      ? true

      : lower.includes('arrive')

  );

  if (!helperMustTravel) return 0;

  const safeDist = Math.max(0, distanceKm ? distanceKm : 0);

  return Math.round(safeDist * 100);

}

export const RATING_TIER_CONFIG: any = {

  excellent: { labelSi: 'විශිෂ්ටයි', labelEn: 'Excellent', emoji: '🌟', basePoints: 0.25, isNegative: false },

  very_good: { labelSi: 'ඉතා හොඳයි', labelEn: 'Very Good', emoji: '✨', basePoints: 0.20, isNegative: false },

  good: { labelSi: 'හොඳයි', labelEn: 'Good', emoji: '👍', basePoints: 0.15, isNegative: false },

  average: { labelSi: 'සාමාන්‍යයි', labelEn: 'Average', emoji: '😐', basePoints: 0.05, isNegative: false },

  bad: { labelSi: 'නරකයි', labelEn: 'Bad', emoji: '👎', basePoints: -0.15, isNegative: true },

  very_bad: { labelSi: 'ඉතා නරකයි', labelEn: 'Very Bad', emoji: '⚠️', basePoints: -0.30, isNegative: true },

};

export async function applyToHelpPost(params: {

  post: HelpPost;

  helperUser: User;

  distanceKm?: number;

}) {

  const { post, helperUser, distanceKm = 0 } = params;

  const helperIdVal = helperUser.userId ? helperUser.userId : helperUser.id ? helperUser.id : 'usr_' + Date.now();

  const applicantId = 'app_' + helperIdVal;

  const helperNicRaw = helperUser.nicNumber ? helperUser.nicNumber : (helperUser as any).nic;

  const newApplicant: HelperApplicant = {

    id: applicantId,

    helperId: helperIdVal,

    helperName: helperUser.name ? helperUser.name : 'සහායක',

    helperPhone: helperUser.phone ? helperUser.phone : (helperUser as any).whatsappNumber ? (helperUser as any).whatsappNumber : (helperUser as any).whatsappPhone ? (helperUser as any).whatsappPhone : '',

    helperNicMasked: maskNicNumber(helperNicRaw),

    helperRating: (helperUser as any).ratingScore ? (helperUser as any).ratingScore : 4.8,

    helperReviewsCount: (helperUser as any).totalReviewsCount ? (helperUser as any).totalReviewsCount : 1,

    appliedAt: new Date().toISOString(),

    distanceKm: distanceKm,

    status: 'pending',

  };
  const existingApplicants = Array.isArray(post.applicants) ? post.applicants : [];
  const alreadyApplied = existingApplicants.some((a) => a.helperId === newApplicant.helperId);
  const updatedApplicants = alreadyApplied
    ? existingApplicants.map((a) => (a.helperId === newApplicant.helperId ? newApplicant : a))
    : [...existingApplicants, newApplicant];
  const existingReplies = Array.isArray(post.replies) ? post.replies : [];
  const syncedReply: any = {
    id: applicantId,
    responderId: helperIdVal,
    responderName: newApplicant.helperName,
    responderPhone: newApplicant.helperPhone,
    responderNic: newApplicant.helperNicMasked,
    message: 'ඉක්මන් සේවාව සඳහා සහය වීමට කැමැත්ත පළ කර ඇත.',
    createdAt: newApplicant.appliedAt,
    distanceKm: distanceKm,
    isAccepted: false,
    isConfirmed: false,
  };
  const alreadyInReplies = existingReplies.some((r: any) => Boolean(r && (r.responderId === helperIdVal ? true : r.id === applicantId)));
  const updatedReplies = alreadyInReplies
    ? existingReplies.map((r: any) => (r && (r.responderId === helperIdVal ? true : r.id === applicantId) ? { ...r, ...syncedReply } : r))
    : [...existingReplies, syncedReply];

  const updatedPost: HelpPost = {

    ...post,

    applicants: updatedApplicants,
    replies: updatedReplies,
  };

  try {

    triggerPickMeAlert({

      kind: 'quick_service',

      title: '🔔 සහය සේවා අයදුම්පතක්!',

      message: newApplicant.helperName + ' (' + newApplicant.helperNicMasked + ') ඔබගේ #' + (post.postCode ? post.postCode : post.id) + ' දැන්වීමට සහය දැක්වීමට ඉදිරිපත් වී ඇත.',

      locationName: post.locationName,

      targetModal: 'quick_service',

      targetPostId: post.id,

    });

    broadcastAppNotification({

      title: '🔔 නව සහායක අයදුම්පතක්!',

      message: newApplicant.helperName + ' ඔබගේ සේවාවට ඉදිරිපත් වී ඇත. තෝරාගැනීමට ක්ලික් කරන්න.',

      type: 'general',

      targetModal: 'quick_service',

      targetPostId: post.id,

    });

  } catch (err) {}

  try {

    if (post.id) {

      await updateHelpPostInFirestore(post.id, {

        replies: updatedReplies,
        applicants: updatedApplicants,

      });

    }

  } catch (e) {

    console.error('Failed to update applicants in Firestore:', e);

  }

  return updatedPost;

}

export async function selectHelperApplicant(params: {

  post: HelpPost;

  applicant: HelperApplicant;

}) {

  const { post, applicant } = params;

  const currentSelected = Array.isArray(post.selectedHelpers) ? post.selectedHelpers : [];

  const needed = post.helpersNeeded ? post.helpersNeeded : 1;

  const isAlreadySelected = currentSelected.some((h) => h.helperId === applicant.helperId);

  const acceptedApplicant: HelperApplicant = {

    ...applicant,

    status: 'accepted',

    startPin: applicant.startPin ? applicant.startPin : generateStartPin(),

  };

  const updatedSelected = isAlreadySelected

    ? currentSelected.map((h) => (h.helperId === applicant.helperId ? acceptedApplicant : h))

    : [...currentSelected, acceptedApplicant];
  const updatedApplicants = (Array.isArray(post.applicants) ? post.applicants : []).map((a) =>
    a.helperId === applicant.helperId ? acceptedApplicant : a
  );
  const existingReplies = Array.isArray(post.replies) ? post.replies : [];
  const updatedReplies = existingReplies.map((r: any) => {
    if (r && (r.responderId === applicant.helperId ? true : r.id === applicant.id ? true : r.responderName === applicant.helperName)) {
      return { ...r, isAccepted: true, isConfirmed: true };
    }
    return r;
  });

  const isFullyStaffed = Math.max(updatedSelected.length, needed) === updatedSelected.length;

  const updatedPost: HelpPost = {

    ...post,

    startPin: post.startPin ? post.startPin : acceptedApplicant.startPin,

    applicants: updatedApplicants,

    replies: updatedReplies,
    selectedHelpers: updatedSelected,

    helpersAccepted: updatedSelected.length,
    confirmedHelperId: applicant.helperId,

    isConfirmed: isFullyStaffed,
    isFilled: isFullyStaffed,

    confirmedBy: updatedSelected.map((h) => h.helperName).join(', '),

    confirmedHelperName: applicant.helperName,

    confirmedHelperPhone: applicant.helperPhone,

    confirmedAt: new Date().toISOString(),

    status: isFullyStaffed ? 'confirmed' : 'active',

    serviceStage: isFullyStaffed ? 'accepted' : 'open',

  };

  try {

    if (post.id) {

      await updateHelpPostInFirestore(post.id, {

        startPin: updatedPost.startPin,

        replies: updatedReplies,
        applicants: updatedApplicants,

        selectedHelpers: updatedSelected,

        confirmedHelperId: applicant.helperId,
        helpersAccepted: updatedSelected.length,

        isConfirmed: isFullyStaffed,
        isFilled: isFullyStaffed,

        confirmedBy: updatedPost.confirmedBy,

        confirmedHelperName: updatedPost.confirmedHelperName,

        confirmedHelperPhone: updatedPost.confirmedHelperPhone,

        confirmedAt: updatedPost.confirmedAt,

        status: updatedPost.status,

        serviceStage: updatedPost.serviceStage,

      });

    }

  } catch (e) {

    console.error('Failed to select helper in Firestore:', e);

  }

  return updatedPost;

}

export async function verifyAndStartJobWithPin(params: {

  post: HelpPost;

  enteredPin: string;

}) {

  const { post, enteredPin } = params;

  const cleanEntered = String(enteredPin ? enteredPin : '').trim();

  const expectedPin = String(post.startPin ? post.startPin : post.completionPin ? post.completionPin : '4829').trim();

  const matchesSelectedHelperPin = Array.isArray(post.selectedHelpers)

    ? post.selectedHelpers.some((h) => h && h.startPin && String(h.startPin).trim() === cleanEntered)

    : false;

  const matchesApplicantPin = Array.isArray(post.applicants)

    ? post.applicants.some((a) => a && a.startPin && String(a.startPin).trim() === cleanEntered)

    : false;

  if (cleanEntered !== expectedPin && !matchesSelectedHelperPin && !matchesApplicantPin) {

    return {

      success: false,

      error: 'ඇතුළත් කළ Start PIN අංකය වැරදියි. කරුණාකර සේවාදායකයාගෙන් ලැබුණු අංක 4ක PIN එක පරීක්ෂා කරන්න.',

    };

  }

  const updatedPost: HelpPost = {

    ...post,

    serviceStage: 'in_progress',

    startedAt: new Date().toISOString(),

  };

  try {

    if (post.id) {

      await updateHelpPostInFirestore(post.id, {

        serviceStage: 'in_progress',

        startedAt: updatedPost.startedAt,

      });

    }

  } catch (e) {

    console.error('Failed to update job start in Firestore:', e);

  }

  return { success: true, updatedPost };

}

export async function submitServiceBill(params: any) {

  const { post, helperUser } = params;

  const travelFee = Number(params.travelFee ? params.travelFee : 0);

  let billItems: any[] = [];

  if (Array.isArray(params.items) && params.items.length !== 0) {

    billItems = params.items;

  } else {

    const laborFee = Number(params.laborFee ? params.laborFee : 0);

    const materialCost = Number(params.materialCost ? params.materialCost : 0);

    billItems = [

      { id: 'item_labor', title: 'කතා කරගත් මූලික සේවා ගාස්තුව', amount: laborFee },

      ...(travelFee !== 0 ? [{ id: 'item_travel', title: 'ගමන් වියදම් දීමනාව', amount: travelFee, isTravelFee: true }] : []),

      ...(materialCost !== 0 ? [{ id: 'item_material', title: 'අමතර කොටස් / ද්‍රව්‍ය ගාස්තු', amount: materialCost }] : []),

    ];

  }

  const computedItemsSum = billItems.reduce((sum, item) => sum + (Number(item.amount) ? Number(item.amount) : 0), 0);

  const totalAmount = params.totalAmount !== undefined ? Number(params.totalAmount) : computedItemsSum + travelFee;

  const invNo = (post.serviceBill && post.serviceBill.invoiceNumber) ? post.serviceBill.invoiceNumber : generate9DigitInvoiceNumber();

  const bill: ServiceBill = {

    invoiceNumber: invNo,

    items: billItems,

    travelDistanceKm: travelFee / 100,

    travelRatePerKm: 100,

    travelFee: travelFee,

    totalAmount: totalAmount,

    actionsSummary: params.materialNotes ? params.materialNotes : '',

    helperName: helperUser && helperUser.name ? helperUser.name : post.confirmedHelperName ? post.confirmedHelperName : 'සහායක',

    seekerName: post.userName ? post.userName : 'සේවාදායකයා',

    startedAt: post.startedAt ? post.startedAt : new Date().toISOString(),

    endedAt: new Date().toISOString(),

    date: new Date().toLocaleDateString('si-LK'),

    createdAt: new Date().toISOString(),

    createdBy: helperUser && helperUser.name ? helperUser.name : 'සහායක',

  };

  const updatedPost: HelpPost = {

    ...post,

    invoiceNumber: invNo,

    serviceBill: bill,

    serviceStage: 'bill_submitted',

    billSubmittedAt: new Date().toISOString(),

  };

  try {

    if (post.id) {

      await updateHelpPostInFirestore(post.id, {

        invoiceNumber: invNo,

        serviceBill: bill,

        serviceStage: 'bill_submitted',

        billSubmittedAt: updatedPost.billSubmittedAt,

      });

    }

    broadcastAppNotification({

      title: '🧾 සේවා බිල්පත ඉදිරිපත් කර ඇත!',

      message: (helperUser && helperUser.name ? helperUser.name : 'සහායක') + ' විසින් #' + (post.postCode ? post.postCode : post.id) + ' සඳහා බිල්පත (රු. ' + totalAmount.toLocaleString() + ') ඉදිරිපත් කර ඇත.',

      type: 'general',

      targetModal: 'quick_service',

      targetPostId: post.id,

    });

  } catch (e) {

    console.error('Failed to submit bill in Firestore:', e);

  }

  return updatedPost;

}

export async function rejectServiceBill(params: {

  post: HelpPost;

  reason: string;

}) {

  const { post, reason } = params;

  const updatedPost: HelpPost = {

    ...post,

    serviceStage: 'in_progress',

    billRejectedReason: reason,

  };

  try {

    if (post.id) {

      await updateHelpPostInFirestore(post.id, {

        serviceStage: 'in_progress',

        billRejectedReason: reason,

      });

    }

  } catch (e) {

    console.error('Failed to reject bill in Firestore:', e);

  }

  return updatedPost;

}

export async function confirmServiceCompletionAndReview(params: {

  post: HelpPost;

  ratingTier: RatingTier;

  reviewComment?: string;

  reviewerUser: User;

  helperUser?: User;

}) {

  const { post, ratingTier, reviewComment, reviewerUser, helperUser } = params;

  const isRedAlert = Boolean(post.category === 'red_alert' ? true : post.priorityLevel === 'emergency');

  const tierConfig = RATING_TIER_CONFIG[ratingTier] ? RATING_TIER_CONFIG[ratingTier] : RATING_TIER_CONFIG.excellent;

  const multiplier = isRedAlert ? 2.0 : 1.0;

  const pointsAdded = Math.round(tierConfig.basePoints * multiplier * 100) / 100;

  const firstSelected = Array.isArray(post.selectedHelpers) && post.selectedHelpers.length !== 0 ? post.selectedHelpers[0] : null;

  const targetHelperId = firstSelected && firstSelected.helperId ? firstSelected.helperId : post.confirmedHelperId ? post.confirmedHelperId : 'helper';

  const targetHelperName = firstSelected && firstSelected.helperName ? firstSelected.helperName : post.confirmedHelperName ? post.confirmedHelperName : 'සහායක';

  const newReview: ServiceReview = {

    id: 'rev_' + Date.now(),

    postId: post.id,

    postCode: post.postCode,

    reviewerId: reviewerUser.userId ? reviewerUser.userId : reviewerUser.id,

    reviewerName: reviewerUser.name,

    helperId: targetHelperId,

    helperName: targetHelperName,

    helperNicMasked: firstSelected && firstSelected.helperNicMasked ? firstSelected.helperNicMasked : 'XXXXX',

    ratingTier: ratingTier,

    ratingPointsAdded: pointsAdded,

    comment: reviewComment ? reviewComment.trim() : '',

    createdAt: new Date().toISOString(),

    isRedAlert: isRedAlert,

  };

  const existingReviews = Array.isArray(post.serviceReviews) ? post.serviceReviews : [];

  const updatedReviews = [...existingReviews, newReview];

  const updatedPost: HelpPost = {

    ...post,

    serviceStage: 'completed',

    status: 'completed',

    isCompleted: true,

    completedAt: new Date().toISOString(),

    completedBy: reviewerUser.name,

    serviceReviews: updatedReviews,

  };

  try {

    if (post.id) {

      await updateHelpPostInFirestore(post.id, {

        serviceStage: 'completed',

        status: 'completed',

        isCompleted: true,

        completedAt: updatedPost.completedAt,

        completedBy: updatedPost.completedBy,

        serviceReviews: updatedReviews,

      });

    }

  } catch (e) {

    console.error('Failed to complete post in Firestore:', e);

  }

  if (targetHelperId && targetHelperId !== 'helper') {

    try {

      const currentScore = helperUser && (helperUser as any).ratingScore ? (helperUser as any).ratingScore : 1.1;

      const newScore = Math.max(0, Math.round((currentScore + pointsAdded) * 100) / 100);

      const newCompletedCount = (helperUser && (helperUser as any).totalCompletedJobs ? (helperUser as any).totalCompletedJobs : 0) + 1;

      const newReviewsCount = (helperUser && (helperUser as any).totalReviewsCount ? (helperUser as any).totalReviewsCount : 0) + 1;

      const isSuspended = Math.min(newScore, 0.3) === newScore;

      await updateUserInFirestore(targetHelperId, {

        ratingScore: newScore,

        totalCompletedJobs: newCompletedCount,

        totalReviewsCount: newReviewsCount,

        isAccountSuspended: isSuspended,

        ...(isSuspended ? { suspensionReason: 'අඩු Rating ලකුණු සහ සේවා පැහැර හැරීම් හේතුවෙන් ගිණුම අත්හිටුවා ඇත.' } : {}),

      });

    } catch (e) {

      console.error('Failed to update helper reputation in Firestore:', e);

    }

  }

  return updatedPost;

}

export async function cancelAndReopenPost(params: {

  post: HelpPost;

  reason: string;

}) {

  const { post, reason } = params;

  const updatedApplicants = (Array.isArray(post.applicants) ? post.applicants : []).map((a) =>

    a.status === 'accepted' ? { ...a, status: 'rejected' as const } : a

  );

  const updatedPost: HelpPost = {

    ...post,

    isConfirmed: false,

    status: 'active',

    serviceStage: 'open',

    selectedHelpers: [],

    helpersAccepted: 0,

    confirmedBy: undefined,

    confirmedHelperName: undefined,

    confirmedHelperPhone: undefined,

    applicants: updatedApplicants,

    rejectedReason: reason,

  };

  try {

    if (post.id) {

      await updateHelpPostInFirestore(post.id, {

        isConfirmed: false,

        status: 'active',

        serviceStage: 'open',

        selectedHelpers: [],

        helpersAccepted: 0,

        confirmedBy: null,

        confirmedHelperName: null,

        confirmedHelperPhone: null,

        applicants: updatedApplicants,

        rejectedReason: reason,

      });

    }

  } catch (e) {

    console.error('Failed to cancel and reopen post in Firestore:', e);

  }

  return updatedPost;

}

