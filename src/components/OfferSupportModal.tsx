import React, { useState, useEffect } from 'react';
import { Send, Phone, CheckCircle2, ShieldCheck, Droplet, MapPin, Navigation, FileText, Eye, AlertTriangle } from 'lucide-react';
import {
  HelpPost,
  Language,
  LocationOption,
  User,
  PostReply,
  BLOOD_COMPATIBILITY_MATRIX,
  checkBloodCompatibility,
  PRE_DONATION_GUIDELINES,
} from '../types';
import { inspectAndSanitizeMessage, getUserStrikes, recordPolicyViolation, isUserPolicyBlocked } from '../utils/policyGuard';
import { PolicyViolationModal } from './PolicyViolationModal';
import { BloodRouteMap } from './BloodLocationMapModal';
import { updateHelpPostInFirestore } from '../lib/firebase';

export interface OfferSupportModalProps {
  post?: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSendReply?: (postId: string, responderName: string, responderPhone: string, message: string) => void;
  onUpdatePost?: (updatedPost: HelpPost) => void;
  onOpenChat?: (post: HelpPost) => void;
  lang?: Language;
  language?: Language;
  currentUser?: User;
  currentLocation?: LocationOption;
  onNavigateToIssues?: () => void;
}

export const OfferSupportModal: React.FC<OfferSupportModalProps> = ({
  post,
  isOpen,
  onClose,
  onSendReply,
  onUpdatePost,
  currentUser = null,
  onNavigateToIssues,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Blood Donation 3-Stage Flow:
  // 'questions' -> 01. රුධිර ගැලපුම සහ සුදුසුකම් ප්‍රශ්නාවලිය
  // 'guidelines' -> 02. රෝහලට යනතුරු පිළිපැදිය යුතු උපදෙස් + "තේරුම් ගත්තෙමි" බොත්තම
  // 'patient_details' -> 02B. රෝගියාගේ නම, වාට්ටු අංකය, විස්තර ගොනුවේ අංකය/ඡායාරූපය සහ Drop Location
  const [bloodStage, setBloodStage] = useState<'questions' | 'awaiting_selection' | 'guidelines' | 'patient_details'>('questions');
  const [viewingSlipPhoto, setViewingSlipPhoto] = useState<string | null>(null);

  const pCodeStr = String(post?.postCode || '').toUpperCase();
  const isBloodPost = Boolean(
    post &&
      post.postType !== ('blood_donation_honor' as any) &&
      (post.postType === 'blood_request' ||
        post.serviceType === 'blood_donation' ||
        pCodeStr.startsWith('#BLD-') ||
        post.category === 'blood_disaster' ||
        (post.tagName && String(post.tagName).includes('ලේ අවශ්‍යතාවය')))
  );

  // Parse patient blood details from post
  const rawNeededStr = String(post?.whatIsNeeded || '');
  const parseBulletField = (label: string): string => {
    const regex = new RegExp(`${label}\\s*:\\s*([^•\\n]+)`, 'i');
    const match = rawNeededStr.match(regex);
    return match && match[1] ? match[1].trim() : '';
  };

  const bgMatch = (post?.bloodGroup || post?.title || post?.headline || post?.tagName || rawNeededStr).match(/(AB|A|B|O)[+-]/i);
  const patientBloodGroup = String(
    post?.bloodGroup || parseBulletField('ලේ වර්ගය') || (bgMatch ? bgMatch[0].toUpperCase() : 'O+')
  ).trim().toUpperCase();

  // Check if current user is already selected/confirmed by the poster
  const existingMyReply = (post?.replies || []).find((r) => {
    const uid = currentUser?.id || currentUser?.userId;
    const uphone = currentUser?.phone || currentUser?.whatsappPhone;
    return (
      (uid && (r.responderId === uid || r.userId === uid)) ||
      (uphone && r.responderPhone && r.responderPhone.replace(/\D/g, '') === uphone.replace(/\D/g, ''))
    );
  });
  const isSelectedByPoster = Boolean(
    existingMyReply && (existingMyReply.isConfirmed || existingMyReply.isAccepted)
  );

  // 03. ඔහුගේ නිවැරදි රුධිර වර්ගය අසා එය රෝගියාට ගැළපෙනවාද යන්න system එකෙන් auto පරීක්ෂා කිරීම
  const [donorGroup, setDonorGroup] = useState<string>(() => {
    return (currentUser as any)?.bloodGroup || '';
  });
  const [qAgeWeightOk, setQAgeWeightOk] = useState<'yes' | 'no' | null>(null);
  const [qIntervalOk, setQIntervalOk] = useState<'first_time' | 'more_than_4_months' | 'recent' | ''>('');
  const [qHealthOk, setQHealthOk] = useState<'yes' | 'no' | null>(null);

  const hasSelectedBloodGroup = Boolean(donorGroup && donorGroup.trim());
  const isCompatible =
    !isBloodPost || !patientBloodGroup
      ? true
      : hasSelectedBloodGroup
      ? checkBloodCompatibility(donorGroup, patientBloodGroup)
      : false;
  const isIntervalValid = !isBloodPost || (qIntervalOk !== '' && qIntervalOk !== 'recent');
  const allQuestionsAnswered =
    hasSelectedBloodGroup &&
    qAgeWeightOk !== null &&
    qIntervalOk !== '' &&
    qHealthOk !== null;

  // 04. අවශ්‍ය තොරතුරු ලබාදීමෙන් පසු ඔහු සුදුසුද නුසුදුසුද යන්න තීරණය කරන්නේ ඇප් එක මගින්ය
  const isTestPassed =
    !isBloodPost ||
    (allQuestionsAnswered &&
      isCompatible &&
      qAgeWeightOk === 'yes' &&
      isIntervalValid &&
      qHealthOk === 'yes');

  const ineligibilityReasons: string[] = [];
  if (isBloodPost && hasSelectedBloodGroup && !isCompatible) {
    ineligibilityReasons.push(
      `ඔබගේ (${donorGroup}) රුධිර වර්ගය රෝගියාට අවශ්‍ය (${patientBloodGroup}) රුධිර වර්ගයට නොගැළපේ.`
    );
  }
  if (isBloodPost && qAgeWeightOk === 'no') {
    ineligibilityReasons.push('වයස අවුරුදු 18 - 60 අතර සහ ශරීර බර 50kg ට වැඩි විය යුතුය.');
  }
  if (isBloodPost && qIntervalOk === 'recent') {
    ineligibilityReasons.push('අවසන් වරට ලේ පරිත්‍යාග කර අවම වශයෙන් මාස 4ක කාලයක් ගතවී තිබිය යුතුය.');
  }
  if (isBloodPost && qHealthOk === 'no') {
    ineligibilityReasons.push('පසුගිය දින 7 තුළ උණ/සෙම්ප්‍රතිශ්‍යාව/ප්‍රතිජීවක ඖෂධ හෝ පැය 24 තුළ මත්පැන් භාවිතයෙන් තොරව නීරෝගීව සිටිය යුතුය.');
  }

  useEffect(() => {
    if (isOpen) {
      const defaultName = currentUser?.name ? currentUser.name : '';
      const defaultPhone = currentUser?.whatsappPhone
        ? currentUser.whatsappPhone
        : currentUser?.phone
        ? currentUser.phone
        : '';
      setName(defaultName);
      setPhone(defaultPhone);
      const initBg = (currentUser as any)?.bloodGroup || '';
      setDonorGroup(initBg);
      setQAgeWeightOk(null);
      setQIntervalOk('');
      setQHealthOk(null);
      if (isSelectedByPoster) {
        setBloodStage(
          existingMyReply?.guidelinesAccepted || existingMyReply?.step3GuidelinesAccepted
            ? 'patient_details'
            : 'guidelines'
        );
      } else {
        setBloodStage('questions');
      }
      setMsg(
        isBloodPost
          ? `මම ${patientBloodGroup} රෝගියා වෙනුවෙන් නොමිලේ ලේ පරිත්‍යාග කිරීමට සූදානම්.`
          : 'මම මෙම කටයුත්ත සඳහා සහය වීමට සූදානම්.'
      );
      setSubmitted(false);
      setShowPolicyModal(false);
    }
  }, [isOpen, currentUser, isBloodPost, post?.id, patientBloodGroup, isSelectedByPoster]);

  const userKey = phone ? phone : name ? name : 'helper_user';
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyStrikes, setPolicyStrikes] = useState(() => getUserStrikes(userKey));
  const [isBlocked, setIsBlocked] = useState(() => isUserPolicyBlocked(userKey));
  const [detectedTypes, setDetectedTypes] = useState([]);

  if (!isOpen || !post) return null;

  const isConfirmed = Boolean(post.isConfirmed || isBloodPost);

  // Extract poster's patient/hospital/ward/slip/drop-location details
  const hospitalFromTitle = (post.title || '').includes(':') ? (post.title || '').split(':').slice(1).join(':').trim() : '';
  const hospitalName =
    (post as any).hospitalName ||
    parseBulletField('රෝහල') ||
    hospitalFromTitle ||
    post.locationName ||
    post.city ||
    'රෝහල';
  const patientName =
    (post as any).patientName ||
    parseBulletField('රෝගී නම') ||
    post.contactPersonName ||
    post.userName ||
    'රෝගියා';
  const wardNumber =
    (post as any).wardNumber ||
    parseBulletField('වාට්ටු අංකය') ||
    parseBulletField('වාට්ටුව') ||
    (post as any).additionalNotes ||
    'රුධිර බැංකුව / වාට්ටුව විමසන්න';
  const requestSlipNumber =
    (post as any).requestSlipNumber ||
    parseBulletField('ගොනු අංකය') ||
    parseBulletField('පත්‍රිකා අංකය') ||
    post.postCode ||
    'රුධිර බැංකුව වෙත යොමුවන්න';
  const requestSlipPhotoUrl =
    (post as any).requestSlipPhotoUrl ||
    post.imageUrl ||
    (post as any).photoUrl ||
    (post as any).image ||
    '';
  const dropLocationUrl = (post as any).dropLocationUrl || post.externalLink || '';
  const pinLat =
    typeof (post as any).hospitalPinLat === 'number'
      ? (post as any).hospitalPinLat
      : typeof post.latitude === 'number'
      ? post.latitude
      : typeof (post as any).lat === 'number'
      ? (post as any).lat
      : null;
  const pinLng =
    typeof (post as any).hospitalPinLng === 'number'
      ? (post as any).hospitalPinLng
      : typeof post.longitude === 'number'
      ? post.longitude
      : typeof (post as any).lng === 'number'
      ? (post as any).lng
      : null;
  const districtName = post.district || parseBulletField('දිස්ත්‍රික්කය') || '';
  const mapDestQuery =
    pinLat !== null && pinLng !== null
      ? `${pinLat},${pinLng}`
      : `${hospitalName}${districtName && !hospitalName.includes(districtName) ? `, ${districtName}` : ''}, Sri Lanka`;
  const googleMapsNavUrl =
    dropLocationUrl && /^https?:\/\//i.test(dropLocationUrl)
      ? dropLocationUrl
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapDestQuery)}&travelmode=driving`;
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapDestQuery)}&z=15&output=embed`;
  const posterPhone = post.contactNumber || post.userPhone || (post as any).contactPhone || '';
  const posterName = post.contactPersonName || post.userName || 'දැන්වීම්කරු';

  const saveDonorOfferToSystem = async (guidelinesAcceptedFlag: boolean) => {
    const finalMsg =
      msg.trim() ||
      `මම (${donorGroup}) රෝගියා වෙනුවෙන් නොමිලේ ලේ පරිත්‍යාග කිරීමට සුදුසුකම් තහවුරු කර ඉදිරිපත් වෙමි.`;

    if (onSendReply) {
      onSendReply(post.id, name.trim(), phone.trim(), finalMsg);
    }

    const nowMs = Date.now();
    const helperUid = currentUser?.id ? currentUser.id : currentUser?.userId ? currentUser.userId : 'helper_user';

    const newReply: PostReply = {
      id: `rep_${nowMs}_${Math.random().toString(36).substring(2, 6)}`,
      responderId: helperUid,
      responderName: name.trim(),
      responderPhone: phone.trim(),
      message: finalMsg,
      createdAt: new Date().toLocaleString('si-LK'),
      createdAtMs: nowMs,
      workflowStep: 2,
      ...(isBloodPost
        ? {
            donorBloodGroup: donorGroup,
            guidelinesAccepted: guidelinesAcceptedFlag,
            step3GuidelinesAccepted: guidelinesAcceptedFlag,
            eligibilityReport: {
              passed: isTestPassed,
              donorBloodGroup: donorGroup,
              patientBloodGroup: patientBloodGroup || 'O+',
              isCompatible,
              lastDonatedStatus: qIntervalOk,
              weightOk: qAgeWeightOk === 'yes',
              healthOk: qHealthOk === 'yes',
              completedAt: new Date().toISOString(),
              summary: `${donorGroup} ගැළපේ • වයස 18-60 / බර >50kg • අවසන් ලේ දීම: ${
                qIntervalOk === 'first_time' ? 'ප්‍රථම වර' : 'මාස 4+ පෙර'
              } • නීරෝගී තත්ත්වය තහවුරුයි`,
            },
          }
        : {}),
    } as any;

    const existingReplies = Array.isArray(post.replies) ? post.replies : [];
    const myNormPhone = phone.trim().replace(/\D/g, '');
    const myNormName = name.trim().toLowerCase();
    const filteredExisting = existingReplies.filter((r: any) => {
      if (!r) return false;
      if (r.responderId && helperUid !== 'helper_user' && String(r.responderId) === String(helperUid)) return false;
      const rPh = String(r.responderPhone || '').replace(/\D/g, '');
      if (rPh.length >= 9 && myNormPhone.length >= 9 && rPh.slice(-9) === myNormPhone.slice(-9)) return false;
      const rNm = String(r.responderName || '').trim().toLowerCase();
      if (rNm && myNormName && rNm === myNormName) return false;
      return true;
    });
    const updatedReplies = [...filteredExisting, newReply];

    const updatedPost: HelpPost = {
      ...post,
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
      helpersCount: updatedReplies.length,
      lastStepUpdatedAtMs: nowMs,
      lastStepByRole: 'helper',
      ...(isBloodPost
        ? {
            bloodWorkflowStep: 2,
            guidelinesAccepted: guidelinesAcceptedFlag,
          }
        : {}),
    } as any;

    if (onUpdatePost) {
      onUpdatePost(updatedPost);
    }

    if (isBloodPost) {
      try {
        const rawBlood = localStorage.getItem('sahaya_blood_requests');
        if (rawBlood) {
          const parsed = JSON.parse(rawBlood);
          if (Array.isArray(parsed)) {
            const nextBlood = parsed.map((b: any) => {
              if (b && (String(b.id) === String(post.id) || (b.postCode && b.postCode === post.postCode))) {
                return { ...b, replies: updatedReplies, supportedCount: updatedReplies.length };
              }
              return b;
            });
            localStorage.setItem('sahaya_blood_requests', JSON.stringify(nextBlood));
          }
        }
        const rawSup = localStorage.getItem('sahaya_supported_blood_ids');
        const supList = rawSup ? JSON.parse(rawSup) : [];
        if (Array.isArray(supList) && !supList.includes(post.id)) {
          localStorage.setItem('sahaya_supported_blood_ids', JSON.stringify([...supList, post.id]));
        }
        if (guidelinesAcceptedFlag) {
          localStorage.setItem(`sahaya_blood_guidelines_ack_${post.id}`, 'true');
        }
        window.dispatchEvent(new CustomEvent('sahaya_blood_disaster_updated'));
      } catch {}
    }

    try {
      await updateHelpPostInFirestore(post.id, {
        postCode: post.postCode,
        postType: post.postType,
        replies: updatedReplies,
        repliesCount: updatedReplies.length,
        helpersCount: updatedPost.helpersCount,
        lastStepUpdatedAtMs: nowMs,
        lastStepByRole: 'helper',
        ...(isBloodPost ? { bloodWorkflowStep: 2, guidelinesAccepted: guidelinesAcceptedFlag } : {}),
      } as any);
    } catch (_) {}
  };

  // Step 1 -> Step 2 handler for Blood Post
  const handleProceedToGuidelines = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('කරුණාකර ඔබගේ නම සහ දුරකථන අංකය ඇතුළත් කරන්න.');
      return;
    }
    if (!isTestPassed) {
      alert('ලේ පරිත්‍යාග කිරීමට නම් ඔබගේ රුධිර වර්ගය ගැළපිය යුතු අතර සියලුම සුදුසුකම් ප්‍රශ්න සඳහා සුදුසුකම් සපුරා තිබිය යුතුය.');
      return;
    }
    setBloodStage('guidelines');
  };

  // Step 2 -> Step 3 ("තේරුම් ගත්තෙමි" button click)
  const handleAcknowledgeGuidelines = async () => {
    await saveDonorOfferToSystem(true);
    setBloodStage('patient_details');
  };

  // Non-blood standard submit
  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !msg.trim() || !post.id) return;

    if (isUserPolicyBlocked(userKey)) {
      setIsBlocked(true);
      setShowPolicyModal(true);
      return;
    }

    let finalMsg = msg.trim();
    const policyResult = inspectAndSanitizeMessage(finalMsg, isConfirmed);
    if (policyResult.hasViolation) {
      finalMsg = policyResult.sanitizedText;
      const record = recordPolicyViolation(userKey);
      setPolicyStrikes(record.newStrikes);
      setIsBlocked(record.isBlocked);
      setDetectedTypes(policyResult.detectedTypes);
      setShowPolicyModal(true);
    }

    await saveDonorOfferToSystem(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 600);
  };

  const compatibleGroupsList = BLOOD_COMPATIBILITY_MATRIX[patientBloodGroup] || [patientBloodGroup];

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
        <div
          className={`w-full ${isBloodPost ? 'max-w-lg' : 'max-w-md'} bg-white dark:bg-[#071710] border-2 ${
            isBloodPost ? 'border-rose-500' : 'border-emerald-500'
          } rounded-3xl shadow-2xl p-4 sm:p-5 space-y-4 max-h-[92vh] flex flex-col overflow-hidden`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black shadow-sm ${
                  isBloodPost ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
              >
                {isBloodPost ? <Droplet className="w-5 h-5 fill-current" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {isBloodPost
                    ? bloodStage === 'questions'
                      ? '🩸 පියවර 01: රුධිර ගැලපුම තහවුරු කිරීම'
                      : bloodStage === 'guidelines'
                      ? '📋 පියවර 02: රෝහලට යනතුරු පිළිපැදිය යුතු උපදෙස්'
                      : '🏥 පියවර 03: රෝගියාගේ සහ රෝහලේ විස්තර'
                    : '🤝 සහය ලබාදීමට ඉදිරිපත් වන්නවාද?'}
                </h3>
                {isBloodPost && (
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    නොමිලේ සිදුකරන උතුම් ජීවිතාරක්ෂක රුධිර පරිත්‍යාග සත්කාරය
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 space-y-3.5 pr-1">
            {isBloodPost ? (
              <>
                {/* STAGE 1: BLOOD COMPATIBILITY & ELIGIBILITY QUESTIONS */}
                {bloodStage === 'questions' && (
                  <form onSubmit={handleProceedToGuidelines} className="space-y-3.5 text-xs">
                    {/* Required Blood Group Banner */}
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 block">
                          රෝගියාට හදිසියේ අවශ්‍ය රුධිර වර්ගය:
                        </span>
                        <span className="text-base font-black text-rose-900 dark:text-white">
                          🩸 {patientBloodGroup} රුධිරය
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                          ගැළපෙන රුධිර වර්ග:
                        </span>
                        <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-300">
                          {compatibleGroupsList.join(' , ')}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0b1f15] border border-slate-200 dark:border-emerald-900/60 space-y-3">
                      <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white text-xs border-b border-slate-200 dark:border-slate-800 pb-2">
                        <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>ලේ පරිත්‍යාග කිරීමට පෙර පහත ප්‍රශ්නවලට පිළිතුරු ලබාදී ඔබගේ ලේ ගැළපෙන බව තහවුරු කරන්න:</span>
                      </div>

                      {/* Question 1: Select Donor Blood Group */}
                      <div className="space-y-1.5">
                        <label className="block font-black text-slate-800 dark:text-slate-200">
                          ප්‍රශ්නය 01: ඔබගේ රුධිර වර්ගය (Blood Group) කුමක්ද? *
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => {
                            const selected = donorGroup === bg;
                            const compat = checkBloodCompatibility(bg, patientBloodGroup);
                            return (
                              <button
                                key={bg}
                                type="button"
                                onClick={() => setDonorGroup(bg)}
                                className={`py-2 px-2 rounded-xl font-mono font-black text-xs border transition-all cursor-pointer ${
                                  selected
                                    ? compat
                                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md scale-105'
                                      : 'bg-red-600 text-white border-red-500 shadow-md scale-105'
                                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-rose-400'
                                }`}
                              >
                                {bg}
                              </button>
                            );
                          })}
                        </div>
                        {isCompatible ? (
                          <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded-xl border border-emerald-300 dark:border-emerald-800">
                            ✅ ඔබගේ ({donorGroup}) රුධිර වර්ගය රෝගියාගේ ({patientBloodGroup}) රුධිර අවශ්‍යතාවයට ගැළපේ!
                          </p>
                        ) : (
                          <p className="text-[11px] font-black text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 p-2 rounded-xl border border-red-300 dark:border-red-800">
                            ❌ ඔබගේ ({donorGroup}) රුධිර වර්ගය රෝගියාගේ ({patientBloodGroup}) රුධිර වර්ගයට නොගැළපේ. ({patientBloodGroup} සඳහා ලබාදිය හැක්කේ {compatibleGroupsList.join(', ')} පමණි)
                          </p>
                        )}
                      </div>

                      {/* Question 2: Confirm Blood Match */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block font-black text-slate-800 dark:text-slate-200">
                          ප්‍රශ්නය 02: රෝගියාට අවශ්‍ය ({patientBloodGroup}) රුධිර වර්ගය සඳහා ඔබගේ රුධිරය ගැළපෙන බව ඔබ තහවුරු කරනවාද? *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setQBloodMatchConfirmed('yes')}
                            className={`py-2 px-3 rounded-xl font-black text-xs border cursor-pointer ${
                              qBloodMatchConfirmed === 'yes'
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            ✅ ඔව්, මගේ ලේ ගැළපේ
                          </button>
                          <button
                            type="button"
                            onClick={() => setQBloodMatchConfirmed('no')}
                            className={`py-2 px-3 rounded-xl font-black text-xs border cursor-pointer ${
                              qBloodMatchConfirmed === 'no'
                                ? 'bg-red-600 text-white border-red-500'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            ❌ නැත, නොගැළපේ
                          </button>
                        </div>
                      </div>

                      {/* Question 3: Age 18-60 & Weight > 50kg */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block font-black text-slate-800 dark:text-slate-200">
                          ප්‍රශ්නය 03: ඔබගේ වයස අවුරුදු 18 - 60 අතර සහ ශරීර බර කිලෝග්‍රෑම් 50 (50kg) ට වැඩිද? *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setQAgeWeightOk('yes')}
                            className={`py-2 px-3 rounded-xl font-black text-xs border cursor-pointer ${
                              qAgeWeightOk === 'yes'
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            ✅ ඔව් (50kg+ / වයස 18-60)
                          </button>
                          <button
                            type="button"
                            onClick={() => setQAgeWeightOk('no')}
                            className={`py-2 px-3 rounded-xl font-black text-xs border cursor-pointer ${
                              qAgeWeightOk === 'no'
                                ? 'bg-red-600 text-white border-red-500'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            ❌ නැත
                          </button>
                        </div>
                      </div>

                      {/* Question 4: Last Donation Interval */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block font-black text-slate-800 dark:text-slate-200">
                          ප්‍රශ්නය 04: ඔබ අවසන් වරට ලේ පරිත්‍යාග කර මාස 4කට වඩා වැඩි කාලයක් ගතවී ඇත්ද? *
                        </label>
                        <select
                          value={qIntervalOk}
                          onChange={(e) => setQIntervalOk(e.target.value as any)}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-900 dark:text-white"
                        >
                          <option value="more_than_4_months">✅ ඔව්, මාස 4කට පෙර හෝ ඊට වැඩි කාලයක් ගතවී ඇත</option>
                          <option value="first_time">✅ මම ප්‍රථම වතාවට ලේ පරිත්‍යාග කරමි</option>
                          <option value="recent">❌ නැත, පසුගිය මාස 4 ඇතුළත ලේ දී ඇත (නුසුදුසුයි)</option>
                        </select>
                        {qIntervalOk === 'recent' && (
                          <p className="text-[11px] font-bold text-red-600">
                            ❌ නැවත ලේ පරිත්‍යාග කිරීමට අවම වශයෙන් මාස 4ක පරතරයක් තිබිය යුතුය.
                          </p>
                        )}
                      </div>

                      {/* Question 5: Current Health Status */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block font-black text-slate-800 dark:text-slate-200">
                          ප්‍රශ්නය 05: පසුගිය දින 7 තුළ උණ, සෙම්ප්‍රතිශ්‍යාව හෝ ප්‍රතිජීවක ඖෂධ ගැනීමක් නොමැතිව නීරෝගීව සිටිනවාද? *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setQHealthOk('yes')}
                            className={`py-2 px-3 rounded-xl font-black text-xs border cursor-pointer ${
                              qHealthOk === 'yes'
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            ✅ ඔව්, නීරෝගීව සිටිමි
                          </button>
                          <button
                            type="button"
                            onClick={() => setQHealthOk('no')}
                            className={`py-2 px-3 rounded-xl font-black text-xs border cursor-pointer ${
                              qHealthOk === 'no'
                                ? 'bg-red-600 text-white border-red-500'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            ❌ නැත
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Donor Name & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          ඔබගේ නම (පරිත්‍යාගශීලියාගේ නම) *
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="ඔබගේ සම්පූර්ණ නම"
                          className="w-full bg-slate-50 dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-white text-xs sm:text-sm font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          දුරකථන අංකය *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="07xxxxxxxx"
                          className="w-full bg-slate-50 dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-white text-xs sm:text-sm font-mono font-bold focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Eligibility Summary Banner */}
                    {isTestPassed ? (
                      <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400 text-emerald-900 dark:text-emerald-200 font-black text-center text-xs">
                        ✅ ඔබගේ ලේ ගැළපෙන අතර ලේ ලබාදීමට සුදුසු අයෙකු බව තහවුරු විය!
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-400 text-red-800 dark:text-red-200 font-bold text-center text-xs flex items-center justify-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>ලේ ගැලපුම හෝ සෞඛ්‍ය සුදුසුකම් සපුරා නොමැති බැවින් ඉදිරියට යා නොහැක.</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold cursor-pointer"
                      >
                        අවලංගු කරන්න
                      </button>
                      <button
                        type="submit"
                        disabled={!isTestPassed}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-md cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ලේ ගැළපීම තහවුරු කර උපදෙස් බලන්න →</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* STAGE 2: PRE-DONATION INSTRUCTIONS + "තේරුම් ගත්තෙමි" BUTTON */}
                {bloodStage === 'guidelines' && (
                  <div className="space-y-4 text-xs animate-fadeIn">
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-black flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>
                        ඔබ ({donorGroup}) ලේ ලබාදීමට සුදුසු අයෙකු බව තහවුරු විය! රෝහලට හෝ ලේ ලබාදීමේ ස්ථානයට යනතුරු පහත උපදෙස් පිළිපදින්න.
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-sky-50/90 dark:bg-sky-950/40 border-2 border-sky-300 dark:border-sky-800 space-y-3">
                      <h4 className="font-black text-sm text-sky-900 dark:text-sky-200 flex items-center gap-2 border-b border-sky-200 dark:border-sky-800 pb-2">
                        <span>📋 ලේ ලබාදීමේ ස්ථානයට හෝ රෝහලට යනතුරු පිළිපැදිය යුතු උපදෙස්</span>
                      </h4>
                      <div className="space-y-2.5">
                        {PRE_DONATION_GUIDELINES.map((g) => (
                          <div
                            key={g.step}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-sky-200/80 dark:border-slate-800 flex items-start gap-2.5"
                          >
                            <span className="text-lg leading-none shrink-0 mt-0.5">{g.icon}</span>
                            <div>
                              <span className="font-black text-slate-900 dark:text-white block">
                                {g.step}. {g.title}
                              </span>
                              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">
                                {g.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-200 text-center">
                      ඉහත උපදෙස් කියවා පහත <strong>"තේරුම් ගත්තෙමි"</strong> බොත්තම ක්ලික් කළ පසු රෝගියාගේ නම, වාට්ටු අංකය, ලේ ලබාදීමට අදාල විස්තර ගොනුවේ අංකය/ඡායාරූපය සහ අදාල ස්ථානයේ Drop ලොකේෂන් එක ඔබට පෙන්වනු ලැබේ.
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setBloodStage('questions')}
                        className="px-4 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                      >
                        ← ආපසු
                      </button>
                      <button
                        type="button"
                        onClick={handleAcknowledgeGuidelines}
                        className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>✅ තේරුම් ගත්තෙමි</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STAGE 3: REVEALED PATIENT NAME, WARD NO, FILE NO/PHOTO & DROP LOCATION */}
                {bloodStage === 'patient_details' && (
                  <div className="space-y-3.5 text-xs animate-fadeIn">
                    <div className="p-3 rounded-2xl bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>
                        ස්තූතියි! ඔබගේ ඉදිරිපත් වීම දැන්වීම්කරු වෙත යොමු කරන ලදී. රෝගියාගේ සහ ලේ ලබාදීමේ ස්ථානයේ සම්පූර්ණ විස්තර පහතින් බලන්න:
                      </span>
                    </div>

                    {/* 4 Mandatory Poster Details Card */}
                    <div className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-800 pb-2">
                        <span className="font-black text-sm text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                          <Droplet className="w-4 h-4 fill-current text-rose-600" />
                          <span>දැන්වීම් පළකරන්නා ලබාදුන් රෝගියාගේ නිල තොරතුරු</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[11px]">
                          {patientBloodGroup} රුධිරය
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* 1. Patient Name */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 block">01. 👤 රෝගියාගේ නම:</span>
                          <span className="font-black text-slate-900 dark:text-white text-sm mt-0.5 block">
                            {patientName}
                          </span>
                        </div>

                        {/* 2. Ward Number */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 block">02. 🚪 වාට්ටු අංකය:</span>
                          <span className="font-black text-rose-700 dark:text-rose-300 text-sm mt-0.5 block">
                            {wardNumber}
                          </span>
                        </div>

                        {/* 3. File / Slip Number or Photo */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-slate-800 sm:col-span-2 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 block">
                                03. 📄 ලේ ලබාදීමට අදාල විස්තර ගොනුවේ අංකය / පත්‍රිකාව:
                              </span>
                              <span className="font-mono font-black text-slate-900 dark:text-white text-sm mt-0.5 block">
                                {requestSlipNumber}
                              </span>
                            </div>
                            {requestSlipPhotoUrl && (
                              <button
                                type="button"
                                onClick={() => setViewingSlipPhoto(requestSlipPhotoUrl)}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>ගොනුවේ ඡායාරූපය විශාල කර බලන්න</span>
                              </button>
                            )}
                          </div>
                          {requestSlipPhotoUrl && (
                            <div
                              onClick={() => setViewingSlipPhoto(requestSlipPhotoUrl)}
                              className="w-full max-h-44 rounded-xl overflow-hidden border border-rose-300 dark:border-rose-800 bg-black cursor-pointer"
                            >
                              <img
                                src={requestSlipPhotoUrl}
                                alt="ලේ ලබාදීමේ විස්තර ගොනුව"
                                className="w-full max-h-44 object-contain mx-auto"
                              />
                            </div>
                          )}
                        </div>

                        {/* 4. Drop Location & Hospital */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-slate-800 sm:col-span-2 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 block">
                                04. 📍 අදාල ස්ථානයේ Drop ලොකේෂන් එක (රෝහල / ස්ථානය):
                              </span>
                              <span className="font-black text-slate-900 dark:text-white text-sm mt-0.5 block">
                                🏥 {hospitalName} {districtName ? `(${districtName})` : ''}
                              </span>
                            </div>
                            {posterPhone && (
                              <a
                                href={`tel:${posterPhone}`}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>{posterName}: {posterPhone}</span>
                              </a>
                            )}
                          </div>

                          <div className="w-full h-40 rounded-xl overflow-hidden border border-emerald-500/50 bg-slate-900">
                            <iframe
                              title="Hospital Drop Location Map"
                              src={googleMapsEmbedUrl}
                              className="w-full h-full border-0"
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                            />
                          </div>

                          <a
                            href={googleMapsNavUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2"
                          >
                            <Navigation className="w-4 h-4" />
                            <span>🗺️ අදාල ස්ථානයේ Drop ලොකේෂන් එක වෙත යන්න (Google Maps)</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer"
                    >
                      හරි, විස්තර ලබාගත්තෙමි (OK)
                    </button>
                  </div>
                )}
              </>
            ) : submitted ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <p className="text-sm font-black text-slate-900 dark:text-white">දැන්වීම්කරු වෙත දැනුම් දෙන ලදී!</p>
              </div>
            ) : (
              /* Non-Blood Standard Support Form */
              <form onSubmit={handleStandardSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ඔබේ නම *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-white text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">දුරකථන අංකය *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-white text-sm font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">කෙටි පණිවිඩය *</label>
                  <input
                    type="text"
                    required
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-white text-sm focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold cursor-pointer"
                  >
                    අවලංගු කරන්න
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ඔව්, ඉදිරිපත් වන්න</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Slip Photo Fullscreen Preview */}
      {viewingSlipPhoto && (
        <div
          className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setViewingSlipPhoto(null)}
        >
          <div className="max-w-md w-full bg-slate-900 p-3 rounded-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setViewingSlipPhoto(null)}
              className="absolute top-3 right-3 bg-red-600 text-white rounded-full w-7 h-7 font-bold flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
            <img src={viewingSlipPhoto} alt="Slip" className="w-full max-h-[75vh] object-contain rounded-xl" />
            <p className="text-center text-xs text-white font-bold mt-2">
              📄 ලේ ලබාදීමට අදාල විස්තර ගොනුවේ ඡායාරූපය
            </p>
          </div>
        </div>
      )}

      <PolicyViolationModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        strikes={policyStrikes}
        isBlocked={isBlocked}
        onNavigateToIssues={onNavigateToIssues}
        detectedTypes={detectedTypes}
      />
    </>
  );
};
