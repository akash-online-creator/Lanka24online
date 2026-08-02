import React, { useState } from 'react';
import { Issue, Language } from '../types';
import { translations } from '../data/translations';
import { Card3D } from './Card3D';
import { HelpCircle, Send, CheckCircle2, MessageSquare, Clock, ArrowLeft, Paperclip, AlertCircle } from 'lucide-react';

interface IssuesHelpPageProps {
  issues: Issue[];
  onSubmitIssue: (newIssue: Omit<Issue, 'id' | 'issueCode' | 'createdAt' | 'status'>) => void;
  onBackToLogin: () => void;
  language: Language;
}

export const IssuesHelpPage: React.FC<IssuesHelpPageProps> = ({
  issues,
  onSubmitIssue,
  onBackToLogin,
  language,
}) => {
  const t = translations[language];

  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [category, setCategory] = useState(t.catLogin);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !userName.trim() || !userPhone.trim()) return;

    onSubmitIssue({
      userName,
      userPhone,
      userEmail,
      nicNumber,
      category,
      title: title || category,
      description,
      attachmentUrl,
    });

    const code = `#ISSUE-${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmittedCode(code);
    
    // Reset inputs
    setTitle('');
    setDescription('');
    setAttachmentUrl('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
        <button
          onClick={onBackToLogin}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 px-3 py-2 rounded-xl border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>{t.backToLogin}</span>
        </button>

        <div className="text-right">
          <h2 className="text-lg font-bold text-slate-100 flex items-center justify-end gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <span>{t.issuesTitle}</span>
          </h2>
          <p className="text-[11px] text-slate-400">{t.issuesSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Issue Submission Form (Page 1.2 Form) */}
        <div className="lg:col-span-7">
          <Card3D glowColor="rgba(6, 182, 212, 0.2)">
            <div className="mb-6">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Page 1.2 • Issue Support Form
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 mb-1">
                {t.issuesFormTitle}
              </h3>
              <p className="text-slate-400 text-xs">
                ඔබේ ගැටලුව මෙහි සඳහන් කර යොමු කරන්න. පරිපාලක (Admin) විසඳුම් ලබා දෙනු ඇත.
              </p>
            </div>

            {submittedCode && (
              <div className="mb-6 p-4 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 text-xs space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                  <span>{t.issueSubmittedSuccess}</span>
                </div>
                <p>
                  {t.issueRefCode}: <span className="font-mono font-bold text-white bg-cyan-900/60 px-2.5 py-1 rounded-lg border border-cyan-400/30">{submittedCode}</span>
                </p>
                <p className="text-[11px] text-slate-300">
                  ඔබගේ ගැටලුව පරිපාලක පැනලයට (Admin Panel) යොමු කෙරිණි.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    {t.yourName} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ඔබේ නම"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/70"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    {t.contactNo} *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0771234567"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/70 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    {t.emailOptional}
                  </label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/70 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    {t.issueCategory}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/70"
                  >
                    <option value={t.catLogin}>{t.catLogin}</option>
                    <option value={t.catPending}>{t.catPending}</option>
                    <option value={t.catTechnical}>{t.catTechnical}</option>
                    <option value={t.catAccount}>{t.catAccount}</option>
                    <option value={t.catOther}>{t.catOther}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                  {t.issueTitleLabel}
                </label>
                <input
                  type="text"
                  placeholder="ගැටලුවේ කෙටි මාතෘකාව..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/70"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                  {t.issueDescLabel} *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="ඔබට ඇති ගැටලුව පැහැදිලිව විස්තර කරන්න..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/70 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.attachProof}</span>
                </label>
                <input
                  type="text"
                  placeholder="Image URL or screenshot link (Optional)"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-slate-300 text-xs focus:outline-none focus:border-cyan-500/70 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_20px_rgba(6,182,212,0.35)] border-b-4 border-cyan-800 transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2 cursor-pointer text-base mt-2"
              >
                <Send className="w-4 h-4" />
                <span>{t.submitIssueBtn}</span>
              </button>
            </form>
          </Card3D>
        </div>

        {/* History / Status of Submitted Issues */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 shadow-xl backdrop-blur-md">
            <h4 className="text-base font-bold text-white mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>{t.issuesListTitle}</span>
              </span>
              <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-full text-cyan-400 font-mono">
                {issues.length} Issues
              </span>
            </h4>

            {issues.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                {t.noIssuesFound}
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="bg-slate-800/60 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-4 transition-all"
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                        {issue.issueCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          issue.status === 'resolved'
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : issue.status === 'in_progress'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        }`}
                      >
                        {issue.status === 'resolved'
                          ? t.resolvedStatus
                          : issue.status === 'in_progress'
                          ? t.inProgressStatus
                          : t.pendingStatus}
                      </span>
                    </div>

                    <h5 className="font-bold text-slate-100 text-sm mb-1">
                      {issue.title}
                    </h5>
                    <p className="text-xs text-slate-300 line-clamp-2 mb-2 leading-relaxed">
                      {issue.description}
                    </p>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-white/5 font-mono">
                      <span>{issue.userName} • {issue.userPhone}</span>
                      <span>{issue.createdAt}</span>
                    </div>

                    {/* Admin reply if available */}
                    {issue.adminReply && (
                      <div className="mt-3 bg-cyan-950/40 border border-cyan-500/30 p-3 rounded-xl text-xs space-y-1">
                        <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Admin Reply (පරිපාලක පිළිතුර):</span>
                        </div>
                        <p className="text-slate-200 text-xs italic">
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
    </div>
  );
};
