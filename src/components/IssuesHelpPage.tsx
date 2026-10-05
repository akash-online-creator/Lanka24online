import React, { useState, useRef, useEffect } from 'react';
import { Issue, Language, User } from '../types';
import { translations } from '../data/translations';
import { 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  Clock, 
  ArrowLeft, 
  Paperclip, 
  UploadCloud, 
  X, 
  Image as ImageIcon, 
  Maximize2, 
  ShieldAlert,
  Sparkles,
  Lock,
  Inbox,
  Smartphone,
  MessageCircle,
  ShieldCheck
} from 'lucide-react';

interface IssuesHelpPageProps {
  issues: Issue[];
  users?: User[];
  currentUser?: User | null;
  onSubmitIssue: (newIssue: Omit<Issue, 'id' | 'issueCode' | 'createdAt' | 'status'>) => void;
  onBackToLogin: () => void;
  language: Language;
}

export const IssuesHelpPage: React.FC<IssuesHelpPageProps> = ({
  issues = [],
  users = [],
  currentUser = null,
  onSubmitIssue,
  onBackToLogin,
  language,
}) => {
  const t = translations[language];

  const [userName, setUserName] = useState(currentUser?.name || '');
  const [userPhone, setUserPhone] = useState(currentUser?.phone || '');
  const [userEmail, setUserEmail] = useState(currentUser?.email || '');
  const [nicNumber, setNicNumber] = useState(currentUser?.nicNumber || '');
  const [category, setCategory] = useState(t.catLogin);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [submittedChannel, setSubmittedChannel] = useState<'inbox' | 'sms' | 'whatsapp'>('sms');
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Sync if currentUser arrives late
  useEffect(() => {
    if (currentUser) {
      if (!userName) setUserName(user?.name || '');
      if (!userPhone) setUserPhone(currentUser.phone || '');
      if (!userEmail) setUserEmail(currentUser.email || '');
      if (!nicNumber) setNicNumber(currentUser.nicNumber || '');
    }
  }, [currentUser]);

  // Check if current phone/user is registered in the system
  const isRegistered = Boolean(
    currentUser ||
    (userPhone.trim().length >= 9 && (users || []).some(u => {
      if (!u) return false;
      const uDigits = (u.phone || '').replace(/[^0-9]/g, '');
      const inDigits = userPhone.replace(/[^0-9]/g, '');
      return (uDigits.length >= 9 && inDigits.length >= 9 && (uDigits.endsWith(inDigits.slice(-9)) || inDigits.endsWith(uDigits.slice(-9)))) ||
             (nicNumber && u.nicNumber && u.nicNumber.toLowerCase().trim() === nicNumber.toLowerCase().trim());
    }))
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress image file to lightweight Base64 Data URL
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('කරුණාකර වලංගු පින්තූර ගොනුවක් (PNG, JPG, WebP) තෝරන්න.');
      return;
    }

    setIsUploading(true);
    setAttachedFileName(file.name);
    setAttachedFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1000;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAttachmentUrl(compressedDataUrl);
        } else {
          setAttachmentUrl(event.target?.result as string);
        }
        setIsUploading(false);
      };
      img.onerror = () => {
        setAttachmentUrl(event.target?.result as string);
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setAttachmentUrl('');
    setAttachedFileName('');
    setAttachedFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !userName.trim() || !userPhone.trim()) return;

    // If category is "other", use typed title or fallback; otherwise title is category
    const isOtherCategory = category === t.catOther;
    const finalTitle = isOtherCategory ? (title.trim() || t.catOther) : category;

    const channel: 'inbox' | 'sms' = isRegistered ? 'inbox' : 'sms';
    setSubmittedChannel(channel);

    onSubmitIssue({
      userName: userName.trim(),
      userPhone: userPhone.trim(),
      userEmail: userEmail.trim(),
      nicNumber: nicNumber.trim(),
      category,
      title: finalTitle,
      description: description.trim(),
      attachmentUrl,
      isRegisteredUser: isRegistered,
      targetChannel: channel,
    });

    const code = `#ISSUE-${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmittedCode(code);
    
    // Reset form
    setTitle('');
    setDescription('');
    setAttachmentUrl('');
    setAttachedFileName('');
    setAttachedFileSize('');
  };

  const isOtherCategorySelected = category === t.catOther;

  return (
    <div className="w-full max-w-5xl mx-auto py-4 px-2 sm:px-4 space-y-6">
      {/* 3D Green & White Page Header */}
      <div className="bg-white/95 dark:bg-[#072013]/90 p-4 sm:p-5 rounded-[2rem] border-2 border-emerald-500/80 shadow-[0_15px_35px_rgba(16,185,129,0.18)] backdrop-blur-xl flex flex-wrap justify-between items-center gap-4 transition-all">
        <button
          onClick={onBackToLogin}
          className="flex items-center gap-2 text-xs font-black text-white bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 px-4 py-2.5 rounded-2xl shadow-[0_6px_14px_rgba(5,150,105,0.3)] border-b-2 border-emerald-900 active:translate-y-0.5 active:border-b-0 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-200" />
          <span>{t.backToLogin}</span>
        </button>

        <div className="text-right">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center justify-end gap-2">
            <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </span>
            <span className="text-emerald-900 dark:text-emerald-300 font-extrabold">{t.issuesTitle}</span>
          </h2>
          <p className="text-xs text-emerald-800 dark:text-emerald-200 font-semibold">{t.issuesSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: 3D ISSUE SUBMISSION FORM (GREEN & WHITE THEME)               */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-[#061c11] border-2 border-emerald-500 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_25px_60px_rgba(16,185,129,0.2)] relative overflow-hidden transition-all">
            
            {/* Top Badge & Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider bg-emerald-100 dark:bg-emerald-950/80 px-3.5 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-700/60 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Page 1.2 • Issue Support Form</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-3 mb-1.5 tracking-tight">
                {t.issuesFormTitle}
              </h3>
              <p className="text-slate-600 dark:text-emerald-200/80 text-xs sm:text-sm font-medium leading-relaxed">
                ඔබේ ගැටලුව මෙහි සඳහන් කර යොමු කරන්න. පරිපාලක (Admin) කණ්ඩායම විසින් විසඳුම් ලබා දෙනු ඇත.
              </p>
            </div>

            {/* Submission Success Alert Banner */}
            {submittedCode && (
              <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-emerald-50 dark:bg-[#082819] border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 text-xs space-y-3 shadow-[0_12px_30px_rgba(16,185,129,0.25)] animate-fadeIn">
                <div className="flex items-center gap-2 font-black text-sm text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{t.issueSubmittedSuccess}</span>
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  {t.issueRefCode}: <span className="font-mono font-black text-white bg-emerald-700 px-3 py-1 rounded-xl shadow-sm border border-emerald-500">{submittedCode}</span>
                </p>
                <div className="p-3 bg-white dark:bg-[#05180f] rounded-2xl border border-emerald-200 dark:border-emerald-800">
                  <p className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                    {submittedChannel === 'inbox' ? (
                      <>
                        <Inbox className="w-4 h-4 text-teal-600" />
                        <span>පිළිතුර ලැබෙන ආකාරය: සහය සේවා Inbox & WhatsApp</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 text-sky-600" />
                        <span>පිළිතුර ලැබෙන ආකාරය: සෘජු SMS පණිවිඩයක් (Direct SMS)</span>
                      </>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {submittedChannel === 'inbox'
                      ? 'ඔබ සහය සේවා ලියාපදිංචි සාමාජිකයෙකු බැවින්, පරිපාලකගේ පිළිතුර ඔබගේ ඇප් එකේ Inbox (පණිවිඩ හුවමාරුව) වෙත ලැබෙනු ඇත.'
                      : `ඔබ ඇතුළත් කළ දුරකථන අංකය (${userPhone || 'ඔබගේ අංකය'}) වෙත පරිපාලකගේ පිළිතුර සෘජු SMS පණිවිඩයක් ලෙස ලැබෙනු ඇත.`}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1">
                    <span>{t.yourName}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ඔබේ සම්පූර්ණ නම"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-emerald-50/40 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800/80 rounded-2xl py-3 px-4 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-[#082215] shadow-inner transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1">
                    <span>{t.contactNo}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="07xxxxxxxx (WhatsApp)"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      className="w-full bg-emerald-50/40 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800/80 rounded-2xl py-3 px-4 text-slate-900 dark:text-white text-sm font-bold font-mono focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-[#082215] shadow-inner transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email & Issue Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-emerald-200 uppercase tracking-wider">
                    {t.emailOptional}
                  </label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-emerald-50/40 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800/80 rounded-2xl py-3 px-4 text-slate-900 dark:text-white text-sm font-medium font-mono focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-[#082215] shadow-inner transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1">
                    <span>{t.issueCategory}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-emerald-50/50 dark:bg-emerald-950/50 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl py-3 px-4 text-slate-900 dark:text-white text-sm font-extrabold focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-[#082215] shadow-inner transition-all cursor-pointer"
                  >
                    <option value={t.catLogin} className="text-slate-900 bg-white dark:bg-slate-900">{t.catLogin}</option>
                    <option value={t.catBlocked} className="text-slate-900 bg-white dark:bg-slate-900">{t.catBlocked}</option>
                    <option value={t.catPending} className="text-slate-900 bg-white dark:bg-slate-900">{t.catPending}</option>
                    <option value={t.catTechnical} className="text-slate-900 bg-white dark:bg-slate-900">{t.catTechnical}</option>
                    <option value={t.catAccount} className="text-slate-900 bg-white dark:bg-slate-900">{t.catAccount}</option>
                    <option value={t.catOther} className="text-slate-900 bg-white dark:bg-slate-900">{t.catOther}</option>
                  </select>
                </div>
              </div>

              {/* Requirement 04: Show Subject / Title ONLY when 'වෙනත් ගැටලු' is selected */}
              {isOtherCategorySelected && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1">
                    <span>{t.issueTitleLabel}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isOtherCategorySelected}
                    placeholder="ඔබගේ වෙනත් ගැටලුවේ කෙටි මාතෘකාව ඇතුළත් කරන්න..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-emerald-50/40 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl py-3 px-4 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-[#082215] shadow-inner transition-all"
                  />
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1">
                  <span>{t.issueDescLabel}</span>
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="ඔබට ඇති ගැටලුව පිළිබඳ සියලු විස්තර පැහැදිලිව මෙහි සටහන් කරන්න..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-emerald-50/40 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800/80 rounded-2xl py-3 px-4 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-[#082215] shadow-inner resize-none transition-all"
                />
              </div>

              {/* Requirement 05: Interactive Image Upload Zone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-emerald-200 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.attachProof}</span>
                  </span>
                  {attachmentUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>ඉවත් කරන්න</span>
                    </button>
                  )}
                </label>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {/* Upload Zone / Drop area */}
                {!attachmentUrl ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-100/60 dark:bg-emerald-950/60 scale-[1.01]'
                        : 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 hover:border-emerald-500'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                          {isUploading ? 'පින්තූරය සකසමින් පවතී...' : 'ගැටලුවේ ScreenShot හෝ ඡායාරූපය මෙතැනට Drag කරන්න / Click කර තෝරන්න'}
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold mt-0.5">
                          (PNG, JPG, WebP සහාය දක්වයි)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Attached Image Preview Card */
                  <div className="p-3 bg-emerald-50 dark:bg-[#092819] border-2 border-emerald-400/80 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div 
                        onClick={() => setPreviewImageModal(attachmentUrl)}
                        className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-emerald-400 cursor-pointer group"
                        title="විශාල කර බලන්න"
                      >
                        <img
                          src={attachmentUrl}
                          alt="Issue Attachment"
                          className="w-full h-full object-cover group-hover:scale-110 transition-all"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <Maximize2 className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {attachedFileName || 'ඡායාරූපය එක් කරන ලදී'}
                        </p>
                        {attachedFileSize && (
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                            {attachedFileSize}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => setPreviewImageModal(attachmentUrl)}
                          className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>පින්තූරය පෙරදසුන</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center font-bold text-xs transition-all cursor-pointer shrink-0 border border-rose-300 dark:border-rose-800"
                      title="ඉවත් කරන්න"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Delivery Channel Notice Box Before Submitting */}
              <div className={`p-4 rounded-2xl border-2 transition-all ${
                isRegistered
                  ? 'bg-teal-50/80 dark:bg-[#07291a] border-teal-400 dark:border-teal-700 text-teal-950 dark:text-teal-100'
                  : 'bg-sky-50/80 dark:bg-[#07202d] border-sky-400 dark:border-sky-700 text-sky-950 dark:text-sky-100'
              }`}>
                <div className="flex items-start gap-2.5">
                  {isRegistered ? (
                    <Inbox className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  ) : (
                    <Smartphone className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold flex items-center gap-1.5">
                      <span>{isRegistered ? '✅ ලියාපදිංචි සාමාජික ගිණුමකි (Registered Account)' : '📱 ලියාපදිංචි නොවූ අමුත්තෙකි (Guest / Non-registered)'}</span>
                    </p>
                    <p className="font-medium text-slate-700 dark:text-zinc-200 leading-relaxed text-[11px]">
                      {isRegistered
                        ? 'පරිපාලකගේ පිළිතුර ඔබගේ සහය සේවා Inbox (පණිවිඩ හුවමාරුව) වෙත සහ WhatsApp හරහා සෘජුවම ලැබෙනු ඇත.'
                        : 'පරිපාලකගේ පිළිතුර ඔබ ලබාදුන් දුරකථන අංකයට සෘජු SMS පණිවිඩයක් (Direct SMS) ලෙස ලැබෙනු ඇත.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3D Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 rounded-2xl shadow-[0_12px_28px_rgba(16,185,129,0.38)] border-b-4 border-emerald-800 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-2.5 cursor-pointer text-base mt-2"
              >
                <Send className="w-5 h-5 text-emerald-100" />
                <span>{t.submitIssueBtn}</span>
              </button>
            </form>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: SUBMITTED ISSUES HISTORY (3D GREEN & WHITE)                 */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#071e13] border-2 border-emerald-500/80 rounded-[2.5rem] p-5 sm:p-6 shadow-[0_20px_50px_rgba(16,185,129,0.18)]">
            <h4 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center justify-between pb-3 border-b border-emerald-100 dark:border-emerald-900/60">
              <span className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <span>{t.issuesListTitle}</span>
              </span>
              <span className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-full font-mono font-bold shadow-sm">
                {(issues || []).length} Issues
              </span>
            </h4>

            {(issues || []).length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-600 dark:text-emerald-200">
                  {t.noIssuesFound}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-emerald-400/80">
                  ඔබ යොමු කරන ගැටලු සහ පරිපාලක පිළිතුරු මෙහි දිස්වනු ඇත.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {(issues || []).map((issue, idx) => (
                  <div
                    key={`issue_${issue.id || 'iss'}_${idx}`}
                    className="bg-emerald-50/40 dark:bg-[#082517] border-2 border-emerald-200 dark:border-emerald-800/80 hover:border-emerald-500 rounded-2xl p-4 transition-all shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-mono text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700">
                        {issue.issueCode}
                      </span>
                      <span
                        className={`text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider ${
                          issue.status === 'resolved'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : issue.status === 'in_progress'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-yellow-400 text-yellow-950 font-black shadow-sm'
                        }`}
                      >
                        {issue.status === 'resolved'
                          ? t.resolvedStatus
                          : issue.status === 'in_progress'
                          ? t.inProgressStatus
                          : t.pendingStatus}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                        [{issue.category}]
                      </span>
                      <h5 className="font-black text-slate-900 dark:text-white text-sm">
                        {issue.title}
                      </h5>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium bg-white dark:bg-black/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                      {issue.description}
                    </p>

                    {/* Attached Image Thumbnail if exists */}
                    {issue.attachmentUrl && (
                      <div 
                        onClick={() => setPreviewImageModal(issue.attachmentUrl || null)}
                        className="flex items-center gap-2 p-2 bg-emerald-100/60 dark:bg-emerald-950/60 rounded-xl border border-emerald-300 dark:border-emerald-700/60 cursor-pointer hover:bg-emerald-100 transition-all w-fit"
                      >
                        <img 
                          src={issue.attachmentUrl} 
                          alt="Issue Attachment" 
                          className="w-10 h-10 rounded-lg object-cover border border-emerald-400"
                        />
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>අමුණන ලද පින්තූරය</span>
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-emerald-300/80 pt-2 border-t border-emerald-100 dark:border-emerald-900/60 font-mono font-semibold">
                      <span>{issue.userName} • {issue.userPhone}</span>
                      <span>{issue.createdAt}</span>
                    </div>

                    {/* Admin reply if available */}
                    {issue.adminReply && (
                      <div className="bg-emerald-600/15 border-2 border-emerald-500 p-3.5 rounded-xl text-xs space-y-1 shadow-sm">
                        <div className="text-emerald-800 dark:text-emerald-300 font-black flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Admin Reply (පරිපාලක පිළිතුර):</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-100 text-xs font-semibold leading-relaxed">
                          "{issue.adminReply}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FULL IMAGE ZOOM PREVIEW MODAL                                             */}
      {/* ========================================================================= */}
      {previewImageModal && (
        <div 
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-3xl max-h-[85vh] bg-slate-900 border-2 border-emerald-500 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-3 bg-slate-950 text-white flex justify-between items-center border-b border-white/10">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                <span>පින්තූර පෙරදසුන (Image Preview)</span>
              </span>
              <button
                onClick={() => setPreviewImageModal(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-rose-600 text-white flex items-center justify-center font-bold text-xs transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center bg-black">
              <img
                src={previewImageModal}
                alt="Enlarged Attachment"
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
