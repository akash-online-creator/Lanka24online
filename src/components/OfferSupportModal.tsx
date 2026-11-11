import React, { useState, useEffect } from 'react';
import { Send, Phone, CheckCircle2 } from 'lucide-react';
import { HelpPost, Language, LocationOption, User, PostReply } from '../types';
import { inspectAndSanitizeMessage, getUserStrikes, recordPolicyViolation, isUserPolicyBlocked } from '../utils/policyGuard';
import { PolicyViolationModal } from './PolicyViolationModal';
import { updateHelpPostInFirestore } from '../lib/firebase';

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
  currentUser = null,
  onNavigateToIssues,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const pCodeStr = String(post?.postCode || '').toUpperCase();
  const isBloodPost = Boolean(
    post &&
      (post.postType === 'blood_request' ||
        post.serviceType === 'blood_donation' ||
        pCodeStr.startsWith('#BLD-') ||
        post.category === 'blood_disaster' ||
        (post.tagName && String(post.tagName).includes('ලේ')))
  );

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
      setMsg(
        isBloodPost
          ? `මම ${(post as any)?.bloodGroup ? (post as any).bloodGroup + ' ' : ''}ලේ ලබාදීමට සූදානම්.`
          : 'මම මෙම කටයුත්ත සඳහා සහය වීමට සූදානම්.'
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

  if (!isOpen || !post) return null;

  const isConfirmed = Boolean(post.isConfirmed || isBloodPost);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !msg.trim() || !post.id) return;

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
      ...(isBloodPost ? { workflowStep: 2 } : {}),
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
      ...(isBloodPost
        ? {
            bloodWorkflowStep: 2,
            lastStepUpdatedAtMs: nowMs,
            lastStepByRole: 'helper',
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
        ...(isBloodPost
          ? {
              bloodWorkflowStep: 2,
              lastStepUpdatedAtMs: nowMs,
              lastStepByRole: 'helper',
            }
          : {}),
      } as any);
    } catch (_) {}

    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 600);
  };

  return h(
    React.Fragment,
    null,
    h(
      'div',
      { className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn' },
      h(
        'div',
        {
          className:
            'w-full max-w-md bg-white dark:bg-[#071710] border-2 ' +
            (isBloodPost ? 'border-rose-500 ' : 'border-emerald-500 ') +
            'rounded-3xl shadow-2xl p-5 space-y-4',
        },
        h(
          'div',
          { className: 'flex items-center justify-between' },
          h(
            'h3',
            { className: 'text-base font-black text-slate-900 dark:text-white' },
            isBloodPost ? '🩸 ලේ ලබාදීමට ඉදිරිපත් වන්නවාද?' : '🤝 සහය ලබාදීමට ඉදිරිපත් වන්නවාද?'
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: onClose,
              className: 'w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold cursor-pointer',
            },
            '✕'
          )
        ),
        submitted
          ? h(
              'div',
              { className: 'py-6 text-center space-y-2' },
              h(CheckCircle2, { className: 'w-12 h-12 text-emerald-600 mx-auto' }),
              h('p', { className: 'text-sm font-black text-slate-900 dark:text-white' }, 'දැන්වීම්කරු වෙත දැනුම් දෙන ලදී!')
            )
          : h(
              'form',
              { onSubmit: handleSubmit, className: 'space-y-3' },
              h(
                'div',
                { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' },
                h(
                  'div',
                  null,
                  h('label', { className: 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1' }, 'ඔබේ නම *'),
                  h('input', {
                    type: 'text',
                    required: true,
                    value: name,
                    onChange: (e: any) => setName(e.target.value),
                    className: 'w-full bg-slate-50 dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-white text-sm font-bold focus:outline-none',
                  })
                ),
                h(
                  'div',
                  null,
                  h('label', { className: 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1' }, 'දුරකථන අංකය *'),
                  h('input', {
                    type: 'tel',
                    required: true,
                    value: phone,
                    onChange: (e: any) => setPhone(e.target.value),
                    className: 'w-full bg-slate-50 dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-white text-sm font-mono font-bold focus:outline-none',
                  })
                )
              ),
              h(
                'div',
                null,
                h('label', { className: 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1' }, 'කෙටි පණිවිඩය *'),
                h('input', {
                  type: 'text',
                  required: true,
                  value: msg,
                  onChange: (e: any) => setMsg(e.target.value),
                  className: 'w-full bg-slate-50 dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-800 rounded-xl py-2 px-3 text-slate-900 dark:text-white text-sm focus:outline-none',
                })
              ),
              h(
                'div',
                { className: 'flex items-center justify-end gap-2 pt-2' },
                h(
                  'button',
                  {
                    type: 'button',
                    onClick: onClose,
                    className: 'px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold cursor-pointer',
                  },
                  'අවලංගු කරන්න'
                ),
                h(
                  'button',
                  {
                    type: 'submit',
                    className:
                      'flex items-center gap-1.5 px-5 py-2.5 ' +
                      (isBloodPost ? 'bg-rose-600 hover:bg-rose-700 ' : 'bg-emerald-600 hover:bg-emerald-700 ') +
                      'text-white font-black text-xs sm:text-sm rounded-xl shadow-md cursor-pointer',
                  },
                  h(Send, { className: 'w-3.5 h-3.5' }),
                  h('span', null, 'ඔව්, ඉදිරිපත් වන්න')
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
