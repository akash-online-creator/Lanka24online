// 🌟 Unified Service Workflow & Reputation Manager for Sahaya Sewa
// Supports Quick Services (ඉක්මන් සේවා) & Normal Services (සාමාන්‍ය සේවා)
// Handles: Start PIN, Travel Fee (Rs. 100/km), Multi-Helper Bidding, Bill Dispatch, 6-Tier Ratings & Masked NIC Leaderboard

import { HelpPost, User, HelperApplicant, ServiceReview, RatingTier, ServiceBill } from '../types';
import { updateHelpPostInFirestore, updateUserInFirestore } from '../lib/firebase';
import { triggerPickMeAlert } from './backgroundAlertEngine';
import { broadcastAppNotification } from './notificationManager';

// 1. Mask Sri Lankan NIC (Show first 5 digits + Mask rest with X)
export function maskNicNumber(nic?: string): string {
  if (!nic) return 'XXXXX';
  const clean = nic.trim().toUpperCase();
  if (clean.length <= 5) return clean;
  const suffix = clean.endsWith('V') || clean.endsWith('X') ? clean.slice(-1) : 'X';
  const maskedCount = Math.max(1, clean.length - 5 - (suffix !== 'X' ? 1 : 0));
  return clean.slice(0, 5) + 'X'.repeat(maskedCount) + (suffix !== 'X' ? suffix : '');
}

// 2. Generate Random 4-digit Secure Start PIN
export function generateStartPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// 3. Platform App Fee Auto-Calculation (Rs. 0 for Free services, standard Rs. 50 for paid)
export function calculatePlatformFee(paymentText?: string): number {
  if (!paymentText) return 0;
  const text = paymentText.toLowerCase().trim();
  if (text.includes('නොමිලේ') || text.includes('free') || text.includes('0')) {
    return 0;
  }
  return 50; // Standard nominal platform fee in LKR
}

// 4. Calculate Distance-Based Travel Fee (Rs. 100 per km for motorcycle route)
export function calculateTravelFee(distanceKm: number, transportOption?: string): number {
  if (!transportOption) return 0;
  const lower = transportOption.toLowerCase();
  const helperMustTravel = 
    lower.includes('ඔබ පැමිණිය') || 
    lower.includes('you should arrive') || 
    lower.includes('පැමිණෙන්න') ||
    lower.includes('arrive');

  if (!helperMustTravel) return 0;
  const safeDist = Math.max(0, distanceKm || 0);
  return Math.round(safeDist * 100);
}

// 5. Rating Tier Points Configuration
export const RATING_TIER_CONFIG: Record<RatingTier, { labelSi: string; labelEn: string; emoji: string; basePoints: number; isNegative: boolean }> = {
  excellent: { labelSi: 'විශිෂ්ටයි', labelEn: 'Excellent', emoji: '🌟', basePoints: 0.25, isNegative: false },
  very_good: { labelSi: 'ඉතා හොඳයි', labelEn: 'Very Good', emoji: '✨', basePoints: 0.20, isNegative: false },
  good: { labelSi: 'හොඳයි', labelEn: 'Good', emoji: '👍', basePoints: 0.15, isNegative: false },
  average: { labelSi: 'සාමාන්‍යයි', labelEn: 'Average', emoji: '😐', basePoints: 0.05, isNegative: false },
  bad: { labelSi: 'නරකයි', labelEn: 'Bad', emoji: '👎', basePoints: -0.15, isNegative: true },
  very_bad: { labelSi: 'ඉතා නරකයි', labelEn: 'Very Bad', emoji: '⚠️', basePoints: -0.30, isNegative: true },
};

// 6. Helper: Apply to a Help Post (Helper clicks "මම සහය වෙන්නම්")
export async function applyToHelpPost(params: {
  post: HelpPost;
  helperUser: User;
  distanceKm?: number;
}): Promise<HelpPost> {
  const { post, helperUser, distanceKm = 0 } = params;
  const applicantId = `app_${helperUser.userId || helperUser.id || Date.now()}`;

  const newApplicant: HelperApplicant = {
    id: applicantId,
    helperId: helperUser.userId || helperUser.id,
    helperName: helperUser.name,
    helperPhone: helperUser.phone || helperUser.whatsappNumber || '',
    helperNicMasked: maskNicNumber(helperUser.nicNumber || helperUser.nic),
    helperRating: helperUser.ratingScore || 1.10,
    helperReviewsCount: helperUser.totalReviewsCount || 0,
    appliedAt: new Date().toISOString(),
    distanceKm: distanceKm,
    status: 'pending',
  };

  const existingApplicants = post.applicants || [];
  const alreadyApplied = existingApplicants.some(a => a.helperId === newApplicant.helperId);
  const updatedApplicants = alreadyApplied
    ? existingApplicants.map(a => a.helperId === newApplicant.helperId ? newApplicant : a)
    : [...existingApplicants, newApplicant];

  const updatedPost: HelpPost = {
    ...post,
    applicants: updatedApplicants,
  };

  try {
    triggerPickMeAlert({
      kind: 'quick_service',
      title: '🔔 සහය සේවා අයදුම්පතක්!',
      message: `${helperUser.name} (${maskNicNumber(helperUser.nicNumber || helperUser.nic)}) ඔබගේ #${post.postCode} දැන්වීමට සහය දැක්වීමට ඉදිරිපත් වී ඇත.`,
      locationName: post.locationName,
      targetModal: 'quick_service',
      targetPostId: post.id,
    });

    broadcastAppNotification({
      title: '🔔 නව සහායක අයදුම්පතක්!',
      message: `${helperUser.name} (${newApplicant.helperRating?.toFixed(2)} ⭐) ඔබගේ සේවාවට ඉදිරිපත් වී ඇත. තෝරාගැනීමට ක්ලික් කරන්න.`,
      type: 'general',
      targetModal: 'quick_service',
      targetPostId: post.id,
    });
  } catch {}

  try {
    await updateHelpPostInFirestore(post.id, {
      applicants: updatedApplicants,
    });
  } catch (e) {
    console.error('Failed to update applicants in Firestore:', e);
  }

  return updatedPost;
}

// 7. Seeker: Select & Accept a Helper from Applicants Pool
export async function selectHelperApplicant(params: {
  post: HelpPost;
  applicant: HelperApplicant;
}): Promise<HelpPost> {
  const { post, applicant } = params;
  const currentSelected = post.selectedHelpers || [];
  const needed = post.helpersNeeded || 1;

  const isAlreadySelected = currentSelected.some(h => h.helperId === applicant.helperId);
  const updatedSelected = isAlreadySelected ? currentSelected : [...currentSelected, { ...applicant, status: 'accepted' as const }];
  
  const updatedApplicants = (post.applicants || []).map(a => 
    a.helperId === applicant.helperId ? { ...a, status: 'accepted' as const } : a
  );

  const isFullyStaffed = updatedSelected.length >= needed;

  const updatedPost: HelpPost = {
    ...post,
    applicants: updatedApplicants,
    selectedHelpers: updatedSelected,
    helpersAccepted: updatedSelected.length,
    isConfirmed: isFullyStaffed,
    confirmedBy: updatedSelected.map(h => h.helperName).join(', '),
    confirmedHelperName: applicant.helperName,
    confirmedHelperPhone: applicant.helperPhone,
    confirmedAt: new Date().toISOString(),
    status: isFullyStaffed ? 'confirmed' : 'active',
    serviceStage: isFullyStaffed ? 'accepted' : 'open',
  };

  try {
    await updateHelpPostInFirestore(post.id, {
      applicants: updatedApplicants,
      selectedHelpers: updatedSelected,
      helpersAccepted: updatedSelected.length,
      isConfirmed: isFullyStaffed,
      confirmedBy: updatedPost.confirmedBy,
      confirmedHelperName: updatedPost.confirmedHelperName,
      confirmedHelperPhone: updatedPost.confirmedHelperPhone,
      confirmedAt: updatedPost.confirmedAt,
      status: updatedPost.status,
      serviceStage: updatedPost.serviceStage,
    });
  } catch (e) {
    console.error('Failed to select helper in Firestore:', e);
  }

  return updatedPost;
}

// 8. Start Job Verification with Start PIN
export async function verifyAndStartJobWithPin(params: {
  post: HelpPost;
  enteredPin: string;
}): Promise<{ success: boolean; error?: string; updatedPost?: HelpPost }> {
  const { post, enteredPin } = params;
  const expectedPin = post.startPin || post.completionPin || '1234';

  if (enteredPin.trim() !== expectedPin.trim()) {
    return { success: false, error: 'ඇතුළත් කළ Start PIN අංකය වැරදියි. කරුණාකර සේවාදායකයාගෙන් ලැබුණු අංක 4ක PIN එක පරීක්ෂා කරන්න.' };
  }

  const updatedPost: HelpPost = {
    ...post,
    serviceStage: 'in_progress',
    startedAt: new Date().toISOString(),
  };

  try {
    await updateHelpPostInFirestore(post.id, {
      serviceStage: 'in_progress',
      startedAt: updatedPost.startedAt,
    });
  } catch (e) {
    console.error('Failed to update job start in Firestore:', e);
  }

  return { success: true, updatedPost };
}

// 9. Helper: Submit Final Bill
export async function submitServiceBill(params: {
  post: HelpPost;
  laborFee: number;
  travelFee: number;
  materialCost: number;
  materialNotes?: string;
  helperUser: User;
}): Promise<HelpPost> {
  const { post, laborFee, travelFee, materialCost, materialNotes, helperUser } = params;
  const totalAmount = laborFee + travelFee + materialCost;

  const bill: ServiceBill = {
    items: [
      { id: 'item_labor', title: 'කතා කරගත් මූලික සේවා ගාස්තුව', amount: laborFee },
      ...(travelFee > 0 ? [{ id: 'item_travel', title: `ගමන් වියදම් දීමනාව (කි.මී. ${(travelFee / 100).toFixed(1)} × රු. 100)`, amount: travelFee, isTravelFee: true }] : []),
      ...(materialCost > 0 ? [{ id: 'item_material', title: `අමතර කොටස් / බඩු වියදම් (${materialNotes || 'ද්‍රව්‍ය ගාස්තු'})`, amount: materialCost }] : []),
    ],
    travelDistanceKm: travelFee / 100,
    travelRatePerKm: 100,
    travelFee: travelFee,
    totalAmount: totalAmount,
    actionsSummary: materialNotes,
    createdAt: new Date().toISOString(),
    createdBy: helperUser.name,
  };

  const updatedPost: HelpPost = {
    ...post,
    serviceBill: bill,
    serviceStage: 'bill_submitted',
    billSubmittedAt: new Date().toISOString(),
  };

  try {
    await updateHelpPostInFirestore(post.id, {
      serviceBill: bill,
      serviceStage: 'bill_submitted',
      billSubmittedAt: updatedPost.billSubmittedAt,
    });

    broadcastAppNotification({
      title: '🧾 සේවා බිල්පත ඉදිරිපත් කර ඇත!',
      message: `${helperUser.name} විසින් #${post.postCode} සඳහා බිල්පත (රු. ${totalAmount.toLocaleString()}) ඉදිරිපත් කර ඇත. පරීක්ෂා කර තහවුරු කරන්න.`,
      type: 'general',
      targetModal: 'quick_service',
      targetPostId: post.id,
    });
  } catch (e) {
    console.error('Failed to submit bill in Firestore:', e);
  }

  return updatedPost;
}

// 10. Seeker: Reject Bill ("තවම අවසන් නැත")
export async function rejectServiceBill(params: {
  post: HelpPost;
  reason: string;
}): Promise<HelpPost> {
  const { post, reason } = params;
  const updatedPost: HelpPost = {
    ...post,
    serviceStage: 'in_progress',
    billRejectedReason: reason,
  };

  try {
    await updateHelpPostInFirestore(post.id, {
      serviceStage: 'in_progress',
      billRejectedReason: reason,
    });
  } catch (e) {
    console.error('Failed to reject bill in Firestore:', e);
  }

  return updatedPost;
}

// 11. Seeker: Confirm Completion & Submit Rating / Review ("ස්ථිරයි")
export async function confirmServiceCompletionAndReview(params: {
  post: HelpPost;
  ratingTier: RatingTier;
  reviewComment?: string;
  reviewerUser: User;
  helperUser?: User;
}): Promise<HelpPost> {
  const { post, ratingTier, reviewComment, reviewerUser, helperUser } = params;
  const isRedAlert = post.category === 'red_alert' || post.priorityLevel === 'emergency';
  const tierConfig = RATING_TIER_CONFIG[ratingTier];
  
  const multiplier = isRedAlert ? 2.0 : 1.0;
  const pointsAdded = Math.round(tierConfig.basePoints * multiplier * 100) / 100;

  const targetHelperId = post.selectedHelpers?.[0]?.helperId || post.confirmedHelperId || 'helper';
  const targetHelperName = post.selectedHelpers?.[0]?.helperName || post.confirmedHelperName || 'සහායක';

  const newReview: ServiceReview = {
    id: `rev_${Date.now()}`,
    postId: post.id,
    postCode: post.postCode,
    reviewerId: reviewerUser.userId || reviewerUser.id,
    reviewerName: reviewerUser.name,
    helperId: targetHelperId,
    helperName: targetHelperName,
    helperNicMasked: post.selectedHelpers?.[0]?.helperNicMasked || 'XXXXX',
    ratingTier: ratingTier,
    ratingPointsAdded: pointsAdded,
    comment: reviewComment?.trim(),
    createdAt: new Date().toISOString(),
    isRedAlert: isRedAlert,
  };

  const updatedReviews = [...(post.serviceReviews || []), newReview];

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
    await updateHelpPostInFirestore(post.id, {
      serviceStage: 'completed',
      status: 'completed',
      isCompleted: true,
      completedAt: updatedPost.completedAt,
      completedBy: updatedPost.completedBy,
      serviceReviews: updatedReviews,
    });
  } catch (e) {
    console.error('Failed to complete post in Firestore:', e);
  }

  if (targetHelperId && targetHelperId !== 'helper') {
    try {
      const currentScore = helperUser?.ratingScore || 1.10;
      const newScore = Math.max(0, Math.round((currentScore + pointsAdded) * 100) / 100);
      const newCompletedCount = (helperUser?.totalCompletedJobs || 0) + 1;
      const newReviewsCount = (helperUser?.totalReviewsCount || 0) + 1;

      const isSuspended = newScore <= 0.30;

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

// 12. Seeker: Cancel & Re-open Post (Helper No-Show Handling)
export async function cancelAndReopenPost(params: {
  post: HelpPost;
  reason: string;
}): Promise<HelpPost> {
  const { post, reason } = params;
  
  const updatedApplicants = (post.applicants || []).map(a => 
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
  } catch (e) {
    console.error('Failed to cancel and reopen post in Firestore:', e);
  }

  return updatedPost;
}
