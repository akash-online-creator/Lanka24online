import { triggerSupportOfferAlert } from '../utils/supportBellRingtone';
import React, { useState, useEffect } from 'react';

import { Send, Phone, MessageSquare, CheckCircle2, MapPin, Compass, Clock, ShieldAlert } from 'lucide-react';

import { HelpPost, Language, LocationOption, User, PostReply } from '../types';

import { translations } from '../data/translations';

import { calculateMotorcycleRoadDistance } from '../utils/geoUtils';

import { inspectAndSanitizeMessage, getUserStrikes, recordPolicyViolation, isUserPolicyBlocked } from '../utils/policyGuard';

import { PolicyViolationModal } from './PolicyViolationModal';

import { translateName } from '../utils/postTranslator';

import { updateHelpPostInFirestore, sendChatMessageToFirestore } from '../lib/firebase';

const h = React.createElement;

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
  onOpenChat,
  lang,
  language = 'si',
  currentUser = null,
  currentLocation,
  onNavigateToIssues
}) => {
  const activeLang: Language = lang ? lang : language ? language : 'si';
  const rawTranslations: any = translations;
  const t = rawTranslations[activeLang] ? rawTranslations[activeLang] : rawTranslations.si;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const pCodeStr = String(post?.postCode || '').toUpperCase();
  const isBloodPost = Boolean(
    post && (
      post.postType === 'blood_request' ||
      post.serviceType === 'blood_donation' ||
      pCodeStr.startsWith('#BLD-') ||
      post.category === 'blood_disaster' ||
      (post.tagName && String(post.tagName).includes('ලේ'))
    )
  );

  useEffect(() => {
    if (isOpen) {
      const defaultName = currentUser?.name ? currentUser.name : '';
      const defaultPhone = currentUser?.whatsappPhone ? currentUser.whatsappPhone : currentUser?.phone ? currentUser.phone : '';
      setName(defaultName);
      setPhone(defaultPhone);
      setMsg(
        isBloodPost
          ? `🩸 මම ${(post as any)?.bloodGroup ? (post as any).bloodGroup + ' ' : ''}ලේ පරිත්‍යාග කිරීමට සූදානම්. කරුණාකර රෝහලට පැමිණිය යුතු වේලාව සහ වාට්ටු විස්තර දන්වන්න.`
          : ''
      );
      setSubmitted(false);
      setShowPolicyModal(false);
    }
  }, [isOpen, currentUser, isBloodPost, post?.id]);

  const userKey = phone ? phone : name ? name : 'helper_user';
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyStrikes, setPolicyStrikes] = useState(() => getUserStrikes(userKey));
  const [isBlocked, setIsBlocked] = useState(() => isUserPolicyBlocked(userKey));
  const [detectedTypes, setDetectedTypes] = useState([]);

  if (!isOpen) return null;
  if (!post) return null;

  const isConfirmed = Boolean(post.isConfirmed || isBloodPost);
  const viewerLat = currentLocation?.lat ? currentLocation.lat : 7.1710;
  const viewerLng = currentLocation?.lng ? currentLocation.lng : 79.8986;
  const viewerLocName = currentLocation?.nameSi ? currentLocation.nameSi : 'ඔබ සිටින ස්ථානය (නරඹන්නා)';
  const postLat = post.lat ? post.lat : 7.1710;
  const postLng = post.lng ? post.lng : 79.8986;
  const postLocName = post.locationName ? post.locationName : 'දැන්වීම පළකළ ස්ථානය';
  const motorcycleRoute = calculateMotorcycleRoadDistance(postLat, postLng, viewerLat, viewerLng, postLocName, viewerLocName, activeLang);

  const posterDisplayName = (post as any).contactPersonName || post.userName || 'දැන්වීම්කරු';
  const posterDisplayPhone = (post as any).contactNumber || post.userPhone || post.contactPhone || '';

  const bloodQuickPresets = [
    `🩸 මම ${(post as any)?.bloodGroup ? (post as any).bloodGroup + ' ' : ''}ලේ පරිත්‍යාග කිරීමට සූදානම්. රෝහලට පැමිණිය හැක.`,
    '🏥 මම දැනට රෝහල අසල සිටින්නේ. ඉක්මනින් පැමිණ ලේ ලබාදිය හැක.',
    '📞 කරුණාකර රෝගියාගේ වාට්ටු අංකය සහ පැමිණිය යුතු වේලාව දන්වන්න.',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!msg.trim()) return;

    if (!isBloodPost && isUserPolicyBlocked(userKey)) {
      setIsBlocked(true);
      setShowPolicyModal(true);
      return;
    }

    let finalMsg = msg.trim();
    if (!isBloodPost) {
      const policyResult = inspectAndSanitizeMessage(finalMsg, isConfirmed);
      if (policyResult.hasViolation) {
        finalMsg = policyResult.sanitizedText;
        const record = recordPolicyViolation(userKey);
        setPolicyStrikes(record.newStrikes);
        setIsBlocked(record.isBlocked);
        setDetectedTypes(policyResult.detectedTypes);
        setShowPolicyModal(true);
      }
    }

    if (!post.id) return;

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
    } as any;

    const existingReplies = Array.isArray(post.replies) ? post.replies : [];
    const filteredExisting = existingReplies.filter((r: any) => {
      if (!r) return false;
      if (r.responderId && helperUid !== 'helper_user' && String(r.responderId) === String(helperUid)) return false;
      const rPh = (r.responderPhone || '').replace(/\D/g, '');
      const myPh = phone.trim().replace(/\D/g, '');
      if (rPh.length >= 9 && myPh.length >= 9 && rPh.slice(-9) === myPh.slice(-9)) return false;
      return true;
    });
    const updatedReplies = [...filteredExisting, newReply];

    const updatedPost: HelpPost = {
      ...post,
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
      helpersCount: updatedReplies.length,
      ...(isBloodPost ? { bloodWorkflowStep: Math.max(Number((post as any).bloodWorkflowStep || 1), 2) } : {}),
    } as any;

    if (onUpdatePost) {
      onUpdatePost(updatedPost);
    }

    // Sync blood request supported count in local storage if blood post
    if (isBloodPost) {
      try {
        const rawBlood = localStorage.getItem('sahaya_blood_requests');
        if (rawBlood) {
          const parsed = JSON.parse(rawBlood);
          if (Array.isArray(parsed)) {
            const nextBlood = parsed.map((b: any) => {
              if (b && (String(b.id) === String(post.id) || (b.postCode && b.postCode === post.postCode))) {
                return { ...b, supportedCount: updatedReplies.length };
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
        window.dispatchEvent(new CustomEvent('sahaya_blood_disaster_updated'));
      } catch {}
    }

    try {
      await updateHelpPostInFirestore(post.id, {
        replies: updatedReplies,
        repliesCount: updatedReplies.length,
        helpersCount: updatedPost.helpersCount,
        ...(isBloodPost ? { bloodWorkflowStep: Math.max(Number((post as any).bloodWorkflowStep || 1), 2) } : {}),
      } as any);
    } catch (_) {}

    const step1ChatText = isBloodPost
      ? `🩸 [පියවර 1/4 - ලේ පරිත්‍යාගය සඳහා ඉදිරිපත් වීම]\n👤 පරිත්‍යාගශීලියා (සහයක): ${name.trim()}\n📞 දුරකථන: ${phone.trim()}\n💬 පණිවිඩය: ${finalMsg}`
      : finalMsg;

    try {
      await sendChatMessageToFirestore(post.id, {
        id: `msg_${nowMs}`,
        postId: post.id,
        senderId: helperUid,
        senderName: name.trim(),
        senderPhone: phone.trim(),
        senderRole: 'helper',
        recipientName: posterDisplayName,
        recipientPhone: posterDisplayPhone,
        recipientId: post.userId || post.authorId || '',
        text: step1ChatText,
        message: step1ChatText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAt: new Date().toISOString(),
        createdAtIso: new Date().toISOString(),
        createdAtMs: nowMs,
      });
    } catch (_) {}

    // Note: Do NOT ring the continuous support bell locally on the helper's own device.
    // The poster's device automatically detects the new reply via real-time Firestore sync in UserDashboard and rings only for the poster.

    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
      setMsg('');
      onClose();
    }, 800);
  };

  return h(
    React.Fragment,
    null,
    h(
      'div',
      { className: 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/70 backdrop-blur-md animate-fadeIn overflow-y-auto' },
      h(
        'div',
        { className: 'w-full max-w-lg bg-gradient-to-b from-white via-emerald-50/40 to-white dark:from-[#06180f] dark:via-[#04120a] dark:to-[#06180f] border-2 ' + (isBloodPost ? 'border-rose-500/70 ' : 'border-emerald-500/50 ') + 'rounded-[2rem] shadow-[0_20px_60px_rgba(0,122,75,0.25)] overflow-hidden relative p-5 sm:p-6 my-4' },
        h(
          'div',
          { className: 'flex items-center justify-between pb-3.5 mb-4 border-b border-emerald-200/80 dark:border-emerald-900/60' },
          h(
            'div',
            null,
            h(
              'h3',
              { className: 'text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2' },
              h(MessageSquare, { className: 'w-5 h-5 ' + (isBloodPost ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400') }),
              h('span', null, isBloodPost ? '🩸 ලේ පරිත්‍යාගය සඳහා ඉදිරිපත් වීම (පියවර 1/4)' : (t?.replyModalTitle ? t.replyModalTitle : 'සහය ලබාදීමට ඉදිරිපත් වන්න'))
            ),
            h(
              'p',
              { className: 'text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5' },
              'දැන්වීම් අංකය: ',
              h('strong', { className: 'text-emerald-700 dark:text-emerald-300 font-mono' }, post.postCode ? post.postCode : '#HELP'),
              ` • දැන්වීම්කරු: ${translateName(posterDisplayName, activeLang)}`
            )
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: onClose,
              className: 'w-8 h-8 rounded-full bg-emerald-100/80 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-center font-bold transition-all cursor-pointer',
            },
            '✕'
          )
        ),
        isBloodPost
          ? h(
              'div',
              { className: 'mb-3.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 space-y-2 text-xs' },
              h(
                'div',
                { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('span', { className: 'font-black text-rose-800 dark:text-rose-200' }, '🏥 දැන්වීම්කරු: ' + posterDisplayName),
                posterDisplayPhone
                  ? h('span', { className: 'font-mono font-black text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-emerald-300' }, '📞 ' + posterDisplayPhone)
                  : null
              ),
              h(
                'div',
                { className: 'text-[11px] text-slate-700 dark:text-slate-300 font-bold' },
                '🩸 ඔබගේ භූමිකාව: සහයක / ලේ පරිත්‍යාගශීලියා (Donor)'
              ),
              h(
                'div',
                { className: 'grid grid-cols-4 gap-1 pt-1 text-[10px] font-black text-center' },
                h('div', { className: 'p-1.5 rounded-lg bg-rose-600 text-white' }, '1. ඉදිරිපත් වීම'),
                h('div', { className: 'p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400' }, '2. තෝරාගැනීම'),
                h('div', { className: 'p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400' }, '3. රෝහලට යාම'),
                h('div', { className: 'p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400' }, '4. අවසන් කිරීම')
              )
            )
          : !isConfirmed
          ? h(
              'div',
              { className: 'mb-3 p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2' },
              h(ShieldAlert, { className: 'w-4 h-4 text-amber-600 shrink-0 mt-0.5' }),
              h('p', { className: 'leading-snug text-[11px]' }, h('strong', null, 'ආරක්ෂණ නීතිය: '), 'සහය CONFIRM කරන තුරු පෞද්ගලික ලිපිනයන්, දුරකථන අංක හෝ ලින්ක් හුවමාරු කිරීම තහනම්ය.')
            )
          : null,
        submitted
          ? h(
              'div',
              { className: 'py-8 text-center flex flex-col items-center justify-center space-y-3 animate-fadeIn' },
              h(CheckCircle2, { className: 'w-16 h-16 text-emerald-600 dark:text-emerald-400 animate-bounce' }),
              h('h4', { className: 'text-lg font-bold text-slate-900 dark:text-slate-100' }, 'ඔබගේ සහය ඉල්ලීම සාර්ථකව යොමු විය!'),
              h('p', { className: 'text-xs text-slate-600 dark:text-slate-400' }, 'දැන්වීම්කරු සමඟ සෘජු පණිවිඩ හුවමාරුව (Chat) දැන් විවෘත වේ...')
            )
          : h(
              'form',
              {
                onSubmit: handleSubmit,
                className: 'space-y-3.5',
              },
              h(
                'div',
                { className: 'p-3 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white dark:from-[#092217] dark:via-[#05180f] dark:to-[#092217] border border-emerald-500/50 rounded-2xl space-y-1.5 text-xs shadow-xs' },
                h(
                  'div',
                  { className: 'flex items-center justify-between' },
                  h('span', { className: 'font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5' }, h('span', null, '🏍️'), h('span', null, `මාර්ග දුර: ${motorcycleRoute.formattedRoadDistance}`)),
                  h('span', { className: 'font-mono font-black text-white bg-emerald-600 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[11px]' }, h(Clock, { className: 'w-3 h-3' }), h('span', null, `~${motorcycleRoute.formattedTime}`))
                ),
                h(
                  'div',
                  { className: 'flex items-center justify-between text-[10px] text-slate-700 dark:text-slate-300 pt-1 border-t border-emerald-200 dark:border-emerald-800/60 font-semibold' },
                  h('span', { className: 'truncate max-w-[48%] flex items-center gap-1 text-emerald-700 dark:text-emerald-300' }, h(Compass, { className: 'w-3 h-3 shrink-0' }), h('span', null, viewerLocName)),
                  h('span', null, '➔'),
                  h('span', { className: 'truncate max-w-[48%] flex items-center gap-1 text-rose-600 dark:text-rose-400' }, h(MapPin, { className: 'w-3 h-3 shrink-0' }), h('span', null, postLocName))
                )
              ),
              h(
                'div',
                { className: 'bg-emerald-50/60 dark:bg-[#071a12] p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1' },
                h('span', { className: 'text-emerald-800 dark:text-emerald-300 block font-black' }, '📌 ඉල්ලීමේ විස්තරය:'),
                h('p', { className: 'text-slate-900 dark:text-slate-100 font-bold' }, post.headline || post.title || post.whatHappened),
                post.whatIsNeeded && post.whatIsNeeded !== (post.headline || post.title)
                  ? h('p', { className: 'text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed' }, post.whatIsNeeded)
                  : null
              ),
              h(
                'div',
                { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                h(
                  'div',
                  null,
                  h('label', { className: 'block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1' }, isBloodPost ? 'පරිත්‍යාගශීලියාගේ නම (ඔබගේ නම) *' : 'ඔබේ නම *'),
                  h('input', {
                    type: 'text',
                    required: true,
                    value: name,
                    onChange: (e: any) => setName(e.target.value),
                    placeholder: 'උදා: කමල් ප්‍රනාන්දු',
                    className: 'w-full bg-white dark:bg-[#071a12] border border-emerald-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-slate-100 text-sm focus:border-emerald-500 focus:outline-none shadow-xs',
                  })
                ),
                h(
                  'div',
                  null,
                  h('label', { className: 'block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1' }, h(Phone, { className: 'w-3 h-3 text-emerald-600 dark:text-emerald-400' }), h('span', null, 'දුරකථන / WhatsApp අංකය *')),
                  h('input', {
                    type: 'tel',
                    required: true,
                    value: phone,
                    onChange: (e: any) => setPhone(e.target.value),
                    placeholder: '0712233445',
                    className: 'w-full bg-white dark:bg-[#071a12] border border-emerald-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-slate-100 text-sm focus:border-emerald-500 focus:outline-none font-mono shadow-xs',
                  })
                )
              ),
              isBloodPost
                ? h(
                    'div',
                    { className: 'space-y-1.5' },
                    h('span', { className: 'block text-[11px] font-black text-rose-700 dark:text-rose-300' }, '⚡ ක්ෂණික පණිවිඩයක් තෝරන්න (1-Tap):'),
                    h(
                      'div',
                      { className: 'flex flex-col gap-1.5' },
                      bloodQuickPresets.map((preset, idx) =>
                        h(
                          'button',
                          {
                            key: idx,
                            type: 'button',
                            onClick: () => setMsg(preset),
                            className: 'text-left text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ' + (msg === preset ? 'bg-rose-600 text-white border-rose-600' : 'bg-rose-50/70 dark:bg-rose-950/40 text-slate-800 dark:text-slate-200 border-rose-200 dark:border-rose-800 hover:bg-rose-100'),
                          },
                          preset
                        )
                      )
                    )
                  )
                : null,
              h(
                'div',
                null,
                h('label', { className: 'block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1' }, isBloodPost ? 'දැන්වීම්කරු වෙත යවන පණිවිඩය *' : `${t?.yourMsgLabel ? t.yourMsgLabel : 'ඔබගේ පණිවිඩය'} (ඔබට උපකාර කළ හැකි ආකාරය) *`),
                h('textarea', {
                  required: true,
                  rows: 3,
                  value: msg,
                  onChange: (e: any) => setMsg(e.target.value),
                  placeholder: isBloodPost ? 'උදා: මම O+ ලේ ලබාදීමට සූදානම්. පැමිණිය යුතු වේලාව දන්වන්න.' : 'උදා: මම කඩවත ළඟ ඉන්නේ. විනාඩි 10කින් පැමිණ සහාය විය හැක.',
                  className: 'w-full bg-white dark:bg-[#071a12] border border-emerald-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-slate-100 text-sm focus:border-emerald-500 focus:outline-none shadow-xs',
                })
              ),
              h(
                'div',
                { className: 'flex items-center justify-end gap-3 pt-3 border-t border-emerald-200 dark:border-emerald-900/60' },
                h(
                  'button',
                  {
                    type: 'button',
                    onClick: onClose,
                    className: 'px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold cursor-pointer',
                  },
                  t?.cancelBtn ? t.cancelBtn : 'අවලංගු කරන්න'
                ),
                h(
                  'button',
                  {
                    type: 'submit',
                    className: 'flex items-center gap-1.5 px-5 py-2.5 ' + (isBloodPost ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 ' : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 ') + 'text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer',
                  },
                  h(Send, { className: 'w-3.5 h-3.5' }),
                  h('span', null, isBloodPost ? '🩸 සහය තහවුරු කර පණිවිඩය යවන්න' : 'පිළිතුර යවන්න')
                )
              )
            )
      )
    ),
    h(PolicyViolationModal, {
      isOpen: showPolicyModal,
      onClose: () => setShowPolicyModal(false),
      strikes: policyStrikes,
      isBlocked: isBlocked,
      onNavigateToIssues: onNavigateToIssues,
      detectedTypes: detectedTypes,
    })
  );
};

