import React, { useState, useEffect } from 'react';

import { HelpPost, TagItem, Language, LocationOption } from '../types';

import { TagSelector } from './TagSelector';

import { getStoredTags } from '../utils/tagUtils';

import { Edit3, AlertTriangle, X, Save } from 'lucide-react';

const h = React.createElement;

export interface EditHelpPostModalProps {

  post: HelpPost;

  isOpen: boolean;

  onClose: () => void;

  onSave: (updatedPost: HelpPost) => void;

  currentLocation?: LocationOption;

  availableLocations?: LocationOption[];

  lang?: Language;

  language?: Language;

}

export const EditHelpPostModal = ({

  post,

  isOpen,

  onClose,

  onSave

}) => {

  const [headline, setHeadline] = useState('');

  const [whatHappened, setWhatHappened] = useState('');

  const [whatIsNeeded, setWhatIsNeeded] = useState('');

  const [conditions, setConditions] = useState('');

  const [specialNotice, setSpecialNotice] = useState('');

  const [transport, setTransport] = useState('');

  const [payment, setPayment] = useState('');

  const [externalLink, setExternalLink] = useState('');

  const [helpersNeeded, setHelpersNeeded] = useState(1);

  const [showComments, setShowComments] = useState(true);

  const [allTags, setAllTags] = useState(() => getStoredTags());

  const [selectedTag, setSelectedTag] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {

    if (post && isOpen) {

      const initHeadline = (post as any).headline ? (post as any).headline : post.title ? post.title : '';

      setHeadline(initHeadline);

      setWhatHappened(post.whatHappened ? post.whatHappened : initHeadline);

      setWhatIsNeeded(post.whatIsNeeded ? post.whatIsNeeded : post.whatHappened ? post.whatHappened : initHeadline);

      setConditions(post.conditions ? post.conditions : '');

      setSpecialNotice(post.specialNotice ? post.specialNotice : '');

      setTransport(post.transport ? post.transport : '');

      setPayment(post.payment ? post.payment : '');

      setExternalLink(post.externalLink ? post.externalLink : post.videoUrl ? post.videoUrl : '');

      setHelpersNeeded(post.helpersNeeded ? post.helpersNeeded : post.helpersCount ? post.helpersCount : 1);

      setShowComments((post as any).showComments !== false);

      setAllTags(getStoredTags());

      if (post.tagName) {

        setSelectedTag({

          id: post.tagId ? post.tagId : 'tag_curr',

          tagName: post.tagName,

          category: post.tagCategory ? post.tagCategory : ''

        });

      } else {

        setSelectedTag(null);

      }

      setErrorMsg('');

    }

  }, [post, isOpen]);

  if (!isOpen) return null;

  if (!post) return null;

  const isConfirmed = Boolean(post.isConfirmed ? true : post.status === 'confirmed' ? true : post.helpersAccepted && post.helpersAccepted >= 1);

  const handleFormSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    if (isConfirmed) {

      setErrorMsg('මෙම දැන්වීම සාර්ථකව තහවුරු කර ඇති බැවින් විස්තර වෙනස් කිරීමට නොහැක.');

      return;

    }

    const finalDesc = whatHappened.trim() ? whatHappened.trim() : headline.trim();

    if (!finalDesc) {

      setErrorMsg('කරුණාකර දැන්වීමේ විස්තරය (සිදුවී ඇති දේ හෝ හෙඩ්ලයින් එක) ඇතුළත් කරන්න.');

      return;

    }

    const finalNeeded = whatIsNeeded.trim() ? whatIsNeeded.trim() : finalDesc;

    const finalHeadline = headline.trim() ? headline.trim() : finalDesc.slice(0, 60);

    const updatedPost: HelpPost = ({

      ...post,

      title: finalHeadline,

      headline: finalHeadline,

      whatHappened: finalDesc,

      whatIsNeeded: finalNeeded,

      conditions: conditions.trim() ? conditions.trim() : 'විශේෂ කොන්දේසි නොමැත.',

      specialNotice: specialNotice.trim(),

      transport: transport.trim() ? transport.trim() : 'අදාළ නොවේ',

      payment: payment.trim() ? payment.trim() : 'නොමිලේ / සාකච්ඡා කළ හැක',

      externalLink: externalLink.trim(),

      videoUrl: post.videoUrl ? post.videoUrl : externalLink.trim(),

      helpersNeeded: helpersNeeded,

      helpersCount: helpersNeeded,

      showComments: showComments,

      tagName: selectedTag?.tagName ? selectedTag.tagName : post.tagName,

      tagCategory: selectedTag?.category ? selectedTag.category : post.tagCategory,

      tagId: selectedTag?.id ? selectedTag.id : post.tagId

    } as any);

    onSave(updatedPost);

    onClose();

  };

  return h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn' }, h('div', { className: 'w-full max-w-2xl bg-white dark:bg-[#071710] border-2 border-emerald-500/60 rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col' }, /* Modal Header */

  h('div', { className: 'bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-emerald-500/40 shrink-0' }, h('div', { className: 'flex items-center gap-2.5' }, h('span', { className: 'p-2 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-300' }, h(Edit3, { className: 'w-5 h-5' })), h('div', null, h('h3', { className: 'text-base sm:text-lg font-black flex items-center gap-2' }, h('span', null, 'දැන්වීම් විස්තර සංස්කරණය (Edit Post)'), h('span', { className: 'text-xs font-mono bg-emerald-900/80 border border-emerald-400/40 px-2 py-0.5 rounded-lg text-emerald-300 font-bold' }, post.postCode ? post.postCode : '#HELP')), h('p', { className: 'text-xs text-emerald-200 font-medium' }, 'ඔබ ඇතුළත් කළ තොරතුරු යාවත්කාලීන කරන්න.'))), h('button', {

    type: 'button',

    onClick: onClose,

    className: 'w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-rose-600 text-white flex items-center justify-center font-bold transition-all cursor-pointer'

  }, h(X, { className: 'w-4 h-4' }))), /* Form Body */

  h('div', { className: 'p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-900 dark:text-slate-100' }, isConfirmed ? h('div', { className: 'p-4 bg-amber-50 dark:bg-amber-950/80 border-2 border-amber-400 rounded-2xl space-y-2 animate-fadeIn' }, h('div', { className: 'flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm' }, h(AlertTriangle, { className: 'w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0' }), h('span', null, 'දැන්වීම වෙනස් කිරීමට නොහැක! (Already Confirmed)')), h('p', { className: 'text-xs text-amber-800 dark:text-amber-300 font-bold leading-relaxed' }, 'මෙම දැන්වීම යම් අයෙකු විසින් තහවුරු කර ඇති බැවින් (Confirmed/Solved) ඇතුළත් කළ කරුණු වෙනස් කිරීමට නොහැකි වන පරිදි අක්‍රිය කර ඇත.')) : h('form', {

    id: 'editPostForm',

    onSubmit: handleFormSubmit,

    className: 'space-y-4'

  }, errorMsg ? h('div', { className: 'p-3 bg-rose-50 dark:bg-rose-950 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-bold flex items-center gap-2' }, h(AlertTriangle, { className: 'w-4 h-4 text-rose-600 shrink-0' }), h('span', null, errorMsg)) : null, /* 0. Headline / Title */

  h('div', { className: 'space-y-1' }, h('label', { className: 'block text-xs font-black text-slate-800 dark:text-slate-200' }, 'හෙඩ්ලයින් එක / මාතෘකාව (Headline / Title):'), h('input', {

    type: 'text',

    value: headline,

    onChange: (e: any) => setHeadline(e.target.value),

    placeholder: 'දැන්වීමේ ප්‍රධාන මාතෘකාව...',

    className: 'w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500'

  })), /* 1. What Happened */

  h('div', { className: 'space-y-1' }, h('label', { className: 'block text-xs font-black text-slate-800 dark:text-slate-200' }, '1. සිදුවී ඇති දේ / විස්තරය (What Happened / Description) *'), h('textarea', {

    rows: 3,

    value: whatHappened,

    onChange: (e: any) => setWhatHappened(e.target.value),

    required: true,

    className: 'w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500'

  })), /* 2. What is Needed */

  h('div', { className: 'space-y-1' }, h('label', { className: 'block text-xs font-black text-slate-800 dark:text-slate-200' }, '2. වියයුතු දේ (What is Needed)'), h('textarea', {

    rows: 2,

    value: whatIsNeeded,

    onChange: (e: any) => setWhatIsNeeded(e.target.value),

    className: 'w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500'

  })), /* Tag Selector */

  h((TagSelector as any), {

    selectedTag: selectedTag,

    onSelectTag: (tag: TagItem) => setSelectedTag(tag),

    allTags: allTags,

    tags: allTags,

    onTagCreated: (newTag: TagItem) => setAllTags(prev => [newTag, ...prev])

  }), /* 3. Conditions */

  h('div', { className: 'space-y-1' }, h('label', { className: 'block text-xs font-black text-slate-800 dark:text-slate-200' }, '3. කොන්දේසි (Conditions)'), h('input', {

    type: 'text',

    value: conditions,

    onChange: (e: any) => setConditions(e.target.value),

    className: 'w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500'

  })), /* 4. Special Notice */

  h('div', { className: 'space-y-1' }, h('label', { className: 'block text-xs font-black text-slate-800 dark:text-slate-200' }, '4. විශේෂ දැනුවත් කිරීම (Special Notice)'), h('input', {

    type: 'text',

    value: specialNotice,

    onChange: (e: any) => setSpecialNotice(e.target.value),

    className: 'w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500'

  })), h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' }, h('div', { className: 'space-y-1' }, h('label', { className: 'block text-xs font-black text-slate-800 dark:text-slate-200' }, '5. ගමනාගමනය (Transport)'), h('input', {

    type: 'text',

    value: transport,

    onChange: (e: any) => setTransport(e.target.value),

    className: 'w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500'

  })), h('div', { className: 'space-y-1' }, h('label', { className: 'block text-xs font-black text-slate-800 dark:text-slate-200' }, '6. ගෙවීම් (Payment)'), h('input', {

    type: 'text',

    value: payment,

    onChange: (e: any) => setPayment(e.target.value),

    className: 'w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500'

  }))), /* 7. Helpers Needed & Comments Toggle */

  h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3 items-center' }, h('div', { className: 'space-y-1' }, h('label', { className: 'block text-xs font-black text-slate-800 dark:text-slate-200' }, '7. අවශ්‍ය සහායකයින් ගණන (Helpers Needed)'), h('input', {

    type: 'number',

    min: 1,

    max: 20,

    value: helpersNeeded,

    onChange: (e: any) => setHelpersNeeded(Number(e.target.value) ? Number(e.target.value) : 1),

    className: 'w-full bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500'

  })), h('label', { className: 'flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/50 dark:bg-[#04140d] border border-emerald-300 dark:border-emerald-800 cursor-pointer mt-4 sm:mt-5' }, h('input', {

    type: 'checkbox',

    checked: showComments,

    onChange: (e: any) => setShowComments(e.target.checked),

    className: 'w-4 h-4 text-emerald-600 rounded-md'

  }), h('span', { className: 'text-xs font-black text-slate-800 dark:text-slate-200' }, 'Comment අන් අයට පෙන්වන්න'))), /* 8. External Link */

  h('div', { className: 'space-y-1' }, h('label', { className: 'block text-xs font-black text-sky-700 dark:text-sky-300' }, '8. වීඩියෝ හෝ වෙබ් ලින්ක් (Facebook / Telegram / YouTube / Link - Optional)'), h('input', {

    type: 'url',

    value: externalLink,

    onChange: (e: any) => setExternalLink(e.target.value),

    placeholder: 'https://facebook.com/... හෝ https://youtube.com/...',

    className: 'w-full bg-emerald-50/50 dark:bg-[#04140d] border border-sky-300 dark:border-sky-800 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500'

  })))), /* Modal Footer */

  h('div', { className: 'p-4 bg-emerald-50 dark:bg-[#05170f] border-t border-emerald-200 dark:border-emerald-800/80 flex items-center justify-end gap-3 shrink-0' }, h('button', {

    type: 'button',

    onClick: onClose,

    className: 'px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-300 cursor-pointer'

  }, 'අවලංගුයි'), !isConfirmed ? h('button', {

    type: 'submit',

    form: 'editPostForm',

    className: 'px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95'

  }, h(Save, { className: 'w-4 h-4' }), h('span', null, 'ලබාදුන් වෙනස්කම් සුරකින්න (Save Changes)')) : null)));

};

