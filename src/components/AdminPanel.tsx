import React, { useState } from 'react';
import { User, Issue, Language } from '../types';
import { translations } from '../data/translations';
import { Shield, CheckCircle2, XCircle, Clock, AlertCircle, MessageSquare, Search, Sparkles, UserCheck, RefreshCw, Eye } from 'lucide-react';

interface AdminPanelProps {
  users: User[];
  issues: Issue[];
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string, reason?: string) => void;
  onReplyIssue: (issueId: string, reply: string, resolve: boolean) => void;
  onSeedDemoData: () => void;
  language: Language;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  users,
  issues,
  onApproveUser,
  onRejectUser,
  onReplyIssue,
  onSeedDemoData,
  language,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'pending' | 'issues' | 'all_users'>('pending');
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status === 'approved');
  const pendingIssues = issues.filter((i) => i.status !== 'resolved');

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.nicNumber.includes(searchQuery)
  );

  const handleReplyChange = (issueId: string, val: string) => {
    setReplyTextMap((prev) => ({ ...prev, [issueId]: val }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 space-y-6">
      {/* Top Banner Stats */}
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>{t.adminDashboard}</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase font-mono">
                  LIVE CONTROLLER
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Piyawara 1.1 (Admin Approval) & Piyawara 1.3 (Issues Desk Management)
              </p>
            </div>
          </div>

          <button
            onClick={onSeedDemoData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/30 text-purple-200 border border-purple-500/40 hover:bg-purple-600/50 transition-all text-xs font-bold cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>{t.quickSeedData}</span>
          </button>
        </div>

        {/* Quick Numbers Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/60 border border-amber-500/30 p-4 rounded-2xl relative overflow-hidden group">
            <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold mb-1">
              Pending Approvals (අනුමැති)
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {pendingUsers.length}
            </div>
            <p className="text-[10px] text-amber-300/80 mt-1">
              {pendingUsers.length > 0 ? ' requires review' : ' All caught up'}
            </p>
          </div>

          <div className="bg-slate-800/60 border border-cyan-500/30 p-4 rounded-2xl">
            <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-1">
              Open Issues (ගැටලු)
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {pendingIssues.length}
            </div>
            <p className="text-[10px] text-cyan-300/80 mt-1">Page 1.2 tickets</p>
          </div>

          <div className="bg-slate-800/60 border border-green-500/30 p-4 rounded-2xl">
            <div className="text-[10px] uppercase tracking-wider text-green-400 font-bold mb-1">
              Approved Users
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {approvedUsers.length}
            </div>
            <p className="text-[10px] text-green-300/80 mt-1">Active access</p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-2xl">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              Total Users
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {users.length}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Registered database</p>
          </div>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs sm:text-sm rounded-t-2xl border-t border-x transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-slate-900 border-amber-500/50 text-amber-400 shadow-lg'
              : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t.pendingApprovalsTab}</span>
          {pendingUsers.length > 0 && (
            <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs sm:text-sm rounded-t-2xl border-t border-x transition-all cursor-pointer ${
            activeTab === 'issues'
              ? 'bg-slate-900 border-cyan-500/50 text-cyan-400 shadow-lg'
              : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t.reportedIssuesTab}</span>
          {pendingIssues.length > 0 && (
            <span className="bg-cyan-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">
              {pendingIssues.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('all_users')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs sm:text-sm rounded-t-2xl border-t border-x transition-all cursor-pointer ${
            activeTab === 'all_users'
              ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-lg'
              : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{t.allUsersTab}</span>
        </button>
      </div>

      {/* Tab 1: Pending Approvals (Piyawara 1.1 Admin Logic) */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between">
            <p className="text-xs text-amber-300 font-medium">
              💡 <strong>පියවර 1.1 (Admin Approval Logic):</strong> පරිශීලකයින් ලියාපදිංචි වූ පසු ඔවුන්ගේ ඡායාරූපය සහ විස්තර බලා <strong>"Accept"</strong> කළ පසු පමණක් ඔවුන්ට ලොග් වීමට ඉඩ ලැබෙනු ඇත.
            </p>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-12 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold text-white mb-1">
                අනුමැතිය සඳහා පොරොත්තු ගිණුම් නැත
              </h3>
              <p className="text-xs text-slate-400">
                සියලු පරිශීලකයින් අනුමත කර (Accept) ඇත.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-slate-900/90 border border-amber-500/40 rounded-3xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md space-y-4"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex gap-3">
                      {/* User Image Preview with Zoom icon */}
                      <div
                        onClick={() => setSelectedPhotoModal(user.photoUrl || null)}
                        className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-lg bg-slate-800 flex-shrink-0 cursor-pointer relative group"
                        title="Click to expand photo"
                      >
                        {user.photoUrl ? (
                          <img
                            src={user.photoUrl}
                            alt={user.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xl">
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-base">
                          {user.name}
                        </h4>
                        <p className="text-xs font-mono text-amber-300">
                          ID: {user.userId}
                        </p>
                        <p className="text-xs font-mono text-slate-400">
                          NIC: {user.nicNumber}
                        </p>
                      </div>
                    </div>

                    <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                      PENDING
                    </span>
                  </div>

                  {/* User Details Box */}
                  <div className="bg-slate-800/60 p-3 rounded-2xl text-xs space-y-1.5 border border-white/5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">දුරකථනය:</span>
                      <span className="text-slate-200 font-semibold">{user.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ලිපිනය:</span>
                      <span className="text-slate-200">{user.address || 'සපයා නැත'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ලියාපදිංචි වේලාව:</span>
                      <span className="text-slate-400">{user.registeredAt}</span>
                    </div>
                  </div>

                  {/* Admin 3D Action Buttons: ACCEPT & REJECT */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => onApproveUser(user.id)}
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-[0_8px_15px_rgba(22,163,74,0.3)] border-b-4 border-green-800 transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.acceptBtn}</span>
                    </button>

                    <button
                      onClick={() => {
                        const reason = prompt('ප්‍රතික්ෂේප කිරීමට හේතුව (Optional):');
                        onRejectUser(user.id, reason || undefined);
                      }}
                      className="w-full bg-red-600/80 hover:bg-red-500 text-white font-bold py-3 rounded-xl shadow-[0_8px_15px_rgba(220,38,38,0.3)] border-b-4 border-red-900 transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{t.rejectBtn}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: User Reported Issues (Piyawara 1.3 Page 1.2 Management) */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-2xl flex items-center justify-between">
            <p className="text-xs text-cyan-300 font-medium">
              💡 <strong>පියවර 1.3 (Page 1.2 Issues Desk):</strong> පරිශීලකයින් "ඔබගේ ගැටලුව කුමක්ද?" ෆෝම් එකෙන් යොමු කළ සියලු ගැටලු මෙහි ලැබෙනු ඇත.
            </p>
          </div>

          {issues.length === 0 ? (
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-12 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-cyan-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold text-white mb-1">
                ගැටලු කිසිවක් වාර්තා වී නැත
              </h3>
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 shadow-xl space-y-4 backdrop-blur-md"
                >
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                          {issue.issueCode}
                        </span>
                        <span className="text-xs font-bold text-amber-400">
                          {issue.category}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white">
                        {issue.title}
                      </h4>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${
                        issue.status === 'resolved'
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      }`}
                    >
                      {issue.status === 'resolved' ? t.resolvedStatus : t.pendingStatus}
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5">
                    "{issue.description}"
                  </p>

                  <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 bg-slate-800/50 p-3 rounded-xl border border-white/5 font-mono">
                    <span>පරිශීලක: <strong>{issue.userName}</strong> ({issue.userPhone})</span>
                    <span>දිනය: {issue.createdAt}</span>
                  </div>

                  {/* Admin Reply & Action Box */}
                  <div className="bg-slate-800/80 p-4 rounded-2xl border border-white/10 space-y-3">
                    <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                      {t.replyToIssue} (User Notification)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="පරිශීලකයාට යැවීමට පිළිතුරක් ඇතුලත් කරන්න..."
                      value={replyTextMap[issue.id] ?? issue.adminReply ?? ''}
                      onChange={(e) => handleReplyChange(issue.id, e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-slate-100 text-xs focus:outline-none focus:border-cyan-500/70"
                    />

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          const reply = replyTextMap[issue.id] || 'ඔබගේ ගැටලුව සම්බන්ධයෙන් ක්‍රියාකරමින් පවතී.';
                          onReplyIssue(issue.id, reply, false);
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs border border-white/10 transition-all cursor-pointer"
                      >
                        {t.sendReplyBtn}
                      </button>

                      <button
                        onClick={() => {
                          const reply = replyTextMap[issue.id] || 'ඔබගේ ගැටලුව විසඳන ලදී.';
                          onReplyIssue(issue.id, reply, true);
                        }}
                        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md border-b-2 border-cyan-800 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t.markResolved}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: All Registered Users */}
      {activeTab === 'all_users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/10">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              placeholder="Search by Name, User ID or NIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-slate-100 text-xs focus:outline-none"
            />
          </div>

          <div className="bg-slate-900/90 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">User ID</th>
                    <th className="p-4">NIC</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <img
                          src={u.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                          alt={u.name}
                          className="w-8 h-8 rounded-lg object-cover border border-white/20"
                        />
                        <span>{u.name}</span>
                      </td>
                      <td className="p-4 font-mono font-semibold text-cyan-400">{u.userId}</td>
                      <td className="p-4 font-mono">{u.nicNumber}</td>
                      <td className="p-4 font-mono">{u.phone}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.status === 'approved'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : u.status === 'rejected'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {u.status === 'pending' ? (
                          <button
                            onClick={() => onApproveUser(u.id)}
                            className="px-3 py-1 rounded-lg bg-green-600 text-white font-bold text-[11px] hover:bg-green-500"
                          >
                            Accept
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">No action needed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal Preview */}
      {selectedPhotoModal && (
        <div
          onClick={() => setSelectedPhotoModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-md w-full bg-slate-900 border border-white/20 rounded-3xl p-4 shadow-2xl space-y-3">
            <img
              src={selectedPhotoModal}
              alt="Enlarged User ID Photo"
              className="w-full h-80 object-cover rounded-2xl"
            />
            <p className="text-center text-xs text-slate-400 font-mono">
              Click anywhere to close preview
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
