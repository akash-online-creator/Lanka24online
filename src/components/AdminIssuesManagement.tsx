import React, { useState, useMemo } from 'react';
import { 
  Issue, 
  User, 
  Language, 
  IssueStatus 
} from '../types';
import { 
  HelpCircle, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  User as UserIcon, 
  ExternalLink, 
  Image as ImageIcon, 
  Maximize2, 
  X, 
  ShieldCheck, 
  MessageCircle, 
  Smartphone, 
  Inbox, 
  Sparkles, 
  Check, 
  Copy,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';

interface AdminIssuesManagementProps {
  issues: Issue[];
  users: User[];
  onReplyIssue: (issueId: string, replyText: string, markResolved?: boolean, replyChannel?: 'inbox' | 'sms' | 'whatsapp') => Promise<void> | void;
  onUpdateIssueStatus?: (issueId: string, status: IssueStatus) => Promise<void> | void;
  language: Language;
}

const QUICK_REPLY_TEMPLATES = [
  {
    title: 'ගැටලුව විසඳන ලදී (Resolved)',
    text: 'ඔබ වාර්තා කළ තාක්ෂණික ගැටලුව අපගේ පද්ධති පරිපාලක විසින් සාර්ථකව නිරාකරණය කරන ලදී. නැවත උත්සාහ කරන්න. ස්තූතියි! - සහය සේවා පාලක මණ්ඩලය',
  },
  {
    title: 'ගිණුම අනුමත කරන ලදී (Approved)',
    text: 'ඔබගේ ගිණුම් තොරතුරු පරීක්ෂා කර සාර්ථකව අනුමත කරන ලදී. දැන් ඔබට ඔබගේ NIC අංකය සහ මුරපදය මගින් ඇප් එකට පිවිසිය හැක.',
  },
  {
    title: 'හැඳුනුම්පත නැවත එවන්න (Re-upload NIC)',
    text: 'ඔබගේ ලියාපදිංචිය සඳහා පැහැදිලි ජාතික හැඳුනුම්පත් (NIC) ඡායාරූපයක් අවශ්‍ය වේ. කරුණාකර නැවත පැහැදිලි ඡායාරූපයක් සහිතව ලියාපදිංචි වන්න.',
  },
  {
    title: 'මුරපදය යාවත්කාලීන කිරීම (Password Reset)',
    text: 'ඔබගේ මුරපද ගැටලුව සම්බන්ධයෙන් විමර්ශනය කරන ලදී. කරුණාකර ඔබගේ තාවකාලික මුරපදය මගින් පිවිස නව මුරපදයක් ලබාදෙන්න.',
  },
  {
    title: 'වැඩිදුර විස්තර අවශ්‍යයි (Need Info)',
    text: 'ඔබගේ ගැටලුව නිරාකරණය කිරීම සඳහා තවත් විස්තර අවශ්‍ය වේ. කරුණාකර අපගේ නිල දුරකථන අංකය අමතන්න හෝ මෙම පණිවිඩයට පිළිතුරු එවන්න.',
  },
];

export const AdminIssuesManagement: React.FC<AdminIssuesManagementProps> = ({
  issues = [],
  users = [],
  onReplyIssue,
  onUpdateIssueStatus,
  language,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IssueStatus>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [replyText, setReplyText] = useState('');
  const [markAsResolved, setMarkAsResolved] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<'inbox' | 'sms' | 'whatsapp'>('inbox');
  const [isSending, setIsSending] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Match registered user by phone or nic
  const checkIsRegistered = (issue: Issue) => {
    if (issue.isRegisteredUser !== undefined) return issue.isRegisteredUser;
    if (issue.userId) return true;
    const phoneDigits = (issue.userPhone || '').replace(/[^0-9]/g, '');
    if (phoneDigits.length >= 9) {
      return users.some((u) => {
        const uPhoneDigits = (u.phone || '').replace(/[^0-9]/g, '');
        return uPhoneDigits.endsWith(phoneDigits.slice(-9)) || phoneDigits.endsWith(uPhoneDigits.slice(-9));
      });
    }
    if (issue.nicNumber) {
      return users.some((u) => u.nicNumber && u.nicNumber.toLowerCase() === issue.nicNumber?.toLowerCase().trim());
    }
    return false;
  };

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Search matching
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (issue.issueCode && issue.issueCode.toLowerCase().includes(q)) ||
        (issue.userName && issue.userName.toLowerCase().includes(q)) ||
        (issue.userPhone && issue.userPhone.includes(q)) ||
        (issue.userEmail && issue.userEmail.toLowerCase().includes(q)) ||
        (issue.title && issue.title.toLowerCase().includes(q)) ||
        (issue.description && issue.description.toLowerCase().includes(q)) ||
        (issue.category && issue.category.toLowerCase().includes(q));

      // Status filtering
      const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;

      // User type filtering
      const isReg = checkIsRegistered(issue);
      const matchesUserType =
        userTypeFilter === 'all' ||
        (userTypeFilter === 'registered' && isReg) ||
        (userTypeFilter === 'unregistered' && !isReg);

      return matchesSearch && matchesStatus && matchesUserType;
    });
  }, [issues, users, searchQuery, statusFilter, userTypeFilter]);

  const stats = useMemo(() => {
    const total = issues.length;
    const pending = issues.filter((i) => i.status === 'pending').length;
    const inProgress = issues.filter((i) => i.status === 'in_progress').length;
    const resolved = issues.filter((i) => i.status === 'resolved').length;
    const registeredCount = issues.filter((i) => checkIsRegistered(i)).length;
    const unregisteredCount = total - registeredCount;
    return { total, pending, inProgress, resolved, registeredCount, unregisteredCount };
  }, [issues, users]);

  const handleOpenReply = (issue: Issue) => {
    setSelectedIssue(issue);
    setReplyText(issue.adminReply || '');
    setMarkAsResolved(issue.status !== 'resolved');
    const isReg = checkIsRegistered(issue);
    setSelectedChannel(isReg ? 'inbox' : 'sms');
  };

  const handleSendReply = async () => {
    if (!selectedIssue || !replyText.trim()) return;

    setIsSending(true);
    try {
      const isReg = checkIsRegistered(selectedIssue);
      const chosenChannel = selectedChannel;

      // 1. Trigger reply handler in App / Firebase
      await onReplyIssue(
        selectedIssue.id,
        replyText.trim(),
        markAsResolved,
        chosenChannel
      );

      // 2. If SMS channel was chosen or non-registered, prepare SMS intent
      if (chosenChannel === 'sms') {
        const cleanPhone = selectedIssue.userPhone.replace(/[^0-9+]/g, '');
        const smsBody = encodeURIComponent(`[සහය සේවා - ${selectedIssue.issueCode || 'Helpdesk'}]\n${replyText.trim()}`);
        // Create an invisible SMS link or copyable notification
        window.open(`sms:${cleanPhone}?body=${smsBody}`, '_blank');
      } else if (chosenChannel === 'whatsapp') {
        let cleanPhone = selectedIssue.userPhone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '94' + cleanPhone.slice(1);
        }
        const waBody = encodeURIComponent(
          `*සහය සේවා (Sahaya Sewa) - ගැටලු නිරාකරණය*\n\nගැටලු අංකය: *${selectedIssue.issueCode || ''}*\n\n${replyText.trim()}\n\n_ස්තූතියි!_`
        );
        window.open(`https://wa.me/${cleanPhone}?text=${waBody}`, '_blank');
      }

      setActionSuccessMessage(
        isReg && chosenChannel === 'inbox'
          ? `✅ සාමාජිකයාගේ Inbox වෙත පිළිතුර සාර්ථකව යොමු කරන ලදී!`
          : chosenChannel === 'sms'
          ? `📱 SMS පණිවිඩය සකස් කර යවන ලදී!`
          : `💬 WhatsApp පණිවිඩය සකස් කරන ලදී!`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);

      setSelectedIssue(null);
      setReplyText('');
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('පිළිතුර යැවීමේදී දෝෂයක් සිදු විය.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats Overview */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-600/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <MessageSquare className="w-5 h-5 text-emerald-300" />
              </span>
              <span>වාර්තා වූ ගැටලු සහ පිළිතුරු පාලක පුවරුව</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium mt-1">
              පරිශීලකයන් එවන ගැටලු පරීක්ෂා කිරීම, ලියාපදිංචි සාමාජිකයන්ට <strong>Inbox</strong> හරහා සහ ලියාපදිංචි නොවූ අයට <strong>SMS / WhatsApp</strong> හරහා පිළිතුරු යැවීම.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-black">
            <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>පොරොත්තු: {stats.pending}</span>
            </span>
            <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>විසඳූ: {stats.resolved}</span>
            </span>
            <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/30">
              මුළු ගැටලු: {stats.total}
            </span>
          </div>
        </div>

        {/* Quick Filter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 border-white shadow-lg font-black'
                : 'bg-emerald-950/40 text-emerald-100 border-emerald-700/50 hover:bg-emerald-900/60'
            }`}
          >
            <p className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">සියලුම ගැටලු</p>
            <p className="text-lg font-black">{stats.total}</p>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg font-black'
                : 'bg-emerald-950/40 text-amber-300 border-emerald-700/50 hover:bg-emerald-900/60'
            }`}
          >
            <p className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">විසඳීමට ඇති (Pending)</p>
            <p className="text-lg font-black">{stats.pending}</p>
          </button>

          <button
            onClick={() => setUserTypeFilter(userTypeFilter === 'registered' ? 'all' : 'registered')}
            className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
              userTypeFilter === 'registered'
                ? 'bg-teal-300 text-slate-950 border-teal-200 shadow-lg font-black'
                : 'bg-emerald-950/40 text-teal-200 border-emerald-700/50 hover:bg-emerald-900/60'
            }`}
          >
            <p className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">සාමාජිකයන් (Inbox)</p>
            <p className="text-lg font-black">{stats.registeredCount}</p>
          </button>

          <button
            onClick={() => setUserTypeFilter(userTypeFilter === 'unregistered' ? 'all' : 'unregistered')}
            className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
              userTypeFilter === 'unregistered'
                ? 'bg-sky-300 text-slate-950 border-sky-200 shadow-lg font-black'
                : 'bg-emerald-950/40 text-sky-200 border-emerald-700/50 hover:bg-emerald-900/60'
            }`}
          >
            <p className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">අමුත්තන් (SMS)</p>
            <p className="text-lg font-black">{stats.unregisteredCount}</p>
          </button>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950 border-2 border-emerald-500 rounded-2xl text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-black flex items-center justify-between shadow-md animate-fadeIn">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </span>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#081a11] p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] bg-slate-50 dark:bg-[#0f2d1e] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-emerald-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="නම, Issue Code, දුරකථන අංකය හෝ විස්තරයෙන් සොයන්න..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-semibold focus:outline-none bg-transparent text-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-slate-600 dark:text-zinc-300">තත්ත්වය:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="font-bold bg-white dark:bg-[#0f2d1e] text-slate-800 dark:text-white border border-slate-300 dark:border-emerald-800 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">සියල්ල (All Status)</option>
              <option value="pending">පොරොත්තු (Pending)</option>
              <option value="in_progress">විමර්ශනය වෙමින් (In Progress)</option>
              <option value="resolved">විසඳූ (Resolved)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600 dark:text-zinc-300">පරිශීලක වර්ගය:</span>
            <select
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value as any)}
              className="font-bold bg-white dark:bg-[#0f2d1e] text-slate-800 dark:text-white border border-slate-300 dark:border-emerald-800 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">සියලුම වර්ග (All)</option>
              <option value="registered">ලියාපදිංචි සාමාජිකයන් (Inbox)</option>
              <option value="unregistered">ලියාපදිංචි නොවූ අමුත්තන් (SMS)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Issues Grid / Cards */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white dark:bg-[#081a11] rounded-3xl border-2 border-emerald-200 dark:border-emerald-800 p-12 text-center text-slate-500 dark:text-zinc-400">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-[#0f2d1e] flex items-center justify-center mx-auto mb-3 text-emerald-600 dark:text-emerald-400">
            <HelpCircle className="w-8 h-8" />
          </div>
          <p className="text-base font-black text-slate-800 dark:text-white">ගැටලු කිසිවක් හමු නොවීය</p>
          <p className="text-xs font-semibold mt-1">තෝරාගත් පෙරහන් හෝ සෙවුම් පද වලට අදාළ වාර්තා නොමැත.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredIssues.map((issue) => {
            const isReg = checkIsRegistered(issue);
            const isResolved = issue.status === 'resolved';
            const isPending = issue.status === 'pending';

            return (
              <div
                key={issue.id}
                className={`bg-white dark:bg-[#081a11] rounded-3xl border-2 transition-all p-5 shadow-md flex flex-col justify-between ${
                  isPending
                    ? 'border-amber-400 dark:border-amber-600/80 shadow-amber-500/5'
                    : isResolved
                    ? 'border-emerald-400/80 dark:border-emerald-700/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-emerald-950">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs px-2.5 py-1 rounded-xl bg-slate-900 text-emerald-300 dark:bg-black dark:text-emerald-400 border border-slate-700 shadow-sm">
                        {issue.issueCode || `#ISSUE-${issue.id.slice(-4)}`}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {issue.category}
                      </span>
                    </div>

                    {/* Delivery Method Badge */}
                    <div className="flex items-center gap-1">
                      {isReg ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-800" title="ලියාපදිංචි සාමාජිකයෙක් - පිළිතුර Inbox වෙත යැවේ">
                          <Inbox className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          <span>Inbox Member</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800" title="ලියාපදිංචි නොවූ අමුත්තෙක් - පිළිතුර SMS මගින් යැවේ">
                          <Smartphone className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                          <span>SMS Guest</span>
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isPending
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                            : isResolved
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {isPending ? '⏳ පොරොත්තු' : isResolved ? '✅ විසඳූ' : '⚙️ ක්‍රියාත්මක'}
                      </span>
                    </div>
                  </div>

                  {/* User Contact Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3 text-xs bg-slate-50 dark:bg-[#0d261a] p-3 rounded-2xl border border-slate-100 dark:border-emerald-900/50">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">නම (Sender)</p>
                      <p className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1 truncate">
                        <UserIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{issue.userName || 'නොදනී'}</span>
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">දුරකථන අංකය</p>
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{issue.userPhone}</span>
                        </p>
                        <button
                          onClick={() => handleCopy(issue.userPhone, `phone-${issue.id}`)}
                          className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-0.5"
                          title="දුරකථන අංකය Copy කරන්න"
                        >
                          {copiedId === `phone-${issue.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {issue.userEmail && (
                      <div className="col-span-full">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">විද්‍යුත් තැපෑල</p>
                        <p className="font-mono text-slate-800 dark:text-zinc-300 flex items-center gap-1 truncate">
                          <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{issue.userEmail}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Issue Description */}
                  <div className="space-y-1 mb-3">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{issue.title}</h4>
                    <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed bg-emerald-50/30 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 whitespace-pre-line">
                      {issue.description}
                    </p>
                  </div>

                  {/* Attached Image Thumbnail (if any) */}
                  {issue.attachmentUrl && (
                    <div className="mb-3">
                      <div
                        onClick={() => setPreviewImage(issue.attachmentUrl!)}
                        className="inline-flex items-center gap-2 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer border border-slate-300 dark:border-slate-700 transition-all text-xs font-bold text-slate-800 dark:text-zinc-200"
                        title="ඡායාරූප සාක්ෂිය විශාල කර බලන්න"
                      >
                        <img
                          src={issue.attachmentUrl}
                          alt="Proof"
                          className="w-8 h-8 rounded-lg object-cover border border-emerald-500"
                        />
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>සාක්ෂි ඡායාරූපය බලන්න</span>
                          <Maximize2 className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Prior Admin Reply Card (if already answered) */}
                  {issue.adminReply && (
                    <div className="mb-3 p-3 rounded-2xl bg-emerald-50 dark:bg-[#072415] border-2 border-emerald-400 dark:border-emerald-600/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-black text-emerald-900 dark:text-emerald-300 pb-1 border-b border-emerald-200 dark:border-emerald-800">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>පරිපාලක පිළිතුර (Admin Reply)</span>
                        </span>
                        {issue.replyChannel && (
                          <span className="text-[10px] uppercase bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded-md font-bold">
                            via {issue.replyChannel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 dark:text-zinc-200 font-medium whitespace-pre-line pt-1">
                        {issue.adminReply}
                      </p>
                      {issue.adminRepliedAt && (
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 text-right font-mono">
                          {new Date(issue.adminRepliedAt).toLocaleString('si-LK')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-emerald-950 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(issue.createdAt).toLocaleDateString('si-LK')}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Status quick toggle */}
                    {onUpdateIssueStatus && (
                      <select
                        value={issue.status}
                        onChange={(e) => onUpdateIssueStatus(issue.id, e.target.value as IssueStatus)}
                        className="text-[11px] font-bold bg-slate-100 dark:bg-[#0d261a] border border-slate-300 dark:border-emerald-800 rounded-xl px-2 py-1.5 focus:outline-none cursor-pointer text-slate-800 dark:text-zinc-200"
                      >
                        <option value="pending">පොරොත්තු</option>
                        <option value="in_progress">ක්‍රියාත්මක</option>
                        <option value="resolved">විසඳූ</option>
                      </select>
                    )}

                    {/* Quick Reply Button */}
                    <button
                      onClick={() => handleOpenReply(issue)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{issue.adminReply ? 'නැවත පිළිතුරු දෙන්න' : 'පිළිතුරක් යවන්න'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal / Drawer */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-[#07190f] border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,122,75,0.3)] max-h-[92vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/60">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    ගැටලුවට පිළිතුරක් යැවීම
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                    {selectedIssue.issueCode} • {selectedIssue.userName} ({selectedIssue.userPhone})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedIssue(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#162e20] text-slate-500 hover:text-slate-800 dark:text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Delivery Channel Notification */}
            {checkIsRegistered(selectedIssue) ? (
              <div className="p-3.5 bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-700 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-black text-teal-950 dark:text-teal-200">
                  <Inbox className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>✅ ලියාපදිංචි සාමාජිකයෙකි (Registered Member)</span>
                </div>
                <p className="text-slate-700 dark:text-teal-100">
                  මෙම පරිශීලකයා සහය සේවා ලියාපදිංචි සාමාජිකයෙකු බැවින් පිළිතුර ඔහුගේ <strong>Inbox (පණිවිඩ හුවමාරුව)</strong> වෙත සෘජුවම යැවේ. අවශ්‍ය නම් WhatsApp හරහාද යැවිය හැක.
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-sky-50 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-700 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-black text-sky-950 dark:text-sky-200">
                  <Smartphone className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>📱 ලියාපදිංචි නොවූ අමුත්තෙකි (Guest / Non-registered)</span>
                </div>
                <p className="text-slate-700 dark:text-sky-100">
                  මෙම පරිශීලකයා මෙතෙක් ලියාපදිංචි වී නොමැති බැවින් පිළිතුර ඔහුගේ දුරකථන අංකයට (<strong>{selectedIssue.userPhone}</strong>) සෘජු <strong>SMS පණිවිඩයක්</strong> හෝ <strong>WhatsApp</strong> හරහා යවනු ලැබේ.
                </p>
              </div>
            )}

            {/* Channel Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                පිළිතුර යැවිය යුතු මාර්ගය (Delivery Channel):
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedChannel('inbox')}
                  className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    selectedChannel === 'inbox'
                      ? 'bg-teal-600 text-white border-teal-700 shadow-md'
                      : 'bg-slate-100 dark:bg-[#0f2d1e] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-emerald-800'
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Inbox (ඇප් එක තුළ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel('sms')}
                  className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    selectedChannel === 'sms'
                      ? 'bg-sky-600 text-white border-sky-700 shadow-md'
                      : 'bg-slate-100 dark:bg-[#0f2d1e] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-emerald-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Direct SMS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel('whatsapp')}
                  className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    selectedChannel === 'whatsapp'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                      : 'bg-slate-100 dark:bg-[#0f2d1e] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-emerald-800'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Quick Template Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>ක්ෂණික පිළිතුරු ආකෘති (Quick Templates):</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REPLY_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(tmpl.text)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-100 dark:bg-[#0f2d1e] dark:hover:bg-emerald-950 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-emerald-800 transition-all cursor-pointer active:scale-95"
                  >
                    + {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Reply Text Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center justify-between">
                <span>පරිපාලක පිළිතුර (Reply Message):</span>
                <span className="text-[11px] text-slate-400 font-mono">{replyText.length} අකුරු</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="පරිශීලකයා වෙත යැවිය යුතු පිළිතුර මෙහි සටහන් කරන්න..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0d261a] border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-[#07190f] shadow-inner resize-none"
              />
            </div>

            {/* Mark as Resolved Option */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0d261a] border border-slate-200 dark:border-emerald-900 cursor-pointer">
              <input
                type="checkbox"
                checked={markAsResolved}
                onChange={(e) => setMarkAsResolved(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                මෙම පිළිතුරෙන් පසු ගැටලුව 'විසඳූ' (Mark as Resolved) ලෙස සලකුණු කරන්න
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-emerald-950">
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 font-bold text-xs cursor-pointer"
              >
                අවලංගු කරන්න
              </button>

              <button
                type="button"
                disabled={isSending || !replyText.trim()}
                onClick={handleSendReply}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-emerald-700/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'යවමින් පවතී...' : 'පිළිතුර යවා සුරකින්න'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Proof Full View"
              className="max-h-[82vh] w-auto mx-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
