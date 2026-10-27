import React, { useState, useEffect, useMemo } from 'react';
import { Language, User, PendingAiQuery, VerifiedAiKnowledgeItem } from '../types';
import {
  subscribeToPendingAiQueries,
  subscribeToVerifiedAiKnowledge,
  approveAiQuery,
  rejectPendingAiQuery,
  saveVerifiedAiKnowledgeItem,
  deleteVerifiedAiKnowledgeItem,
} from '../lib/firebase';
import {
  Sparkles,
  CheckCircle2,
  Edit3,
  Trash2,
  Plus,
  Search,
  Brain,
  Clock,
  MapPin,
  Tag,
  Languages,
  X,
  AlertCircle,
  HelpCircle,
  Save,
  Check,
} from 'lucide-react';

interface AdminAiKnowledgeManagementProps {
  language?: Language;
  currentUser?: User | null;
}

export const AdminAiKnowledgeManagement: React.FC<AdminAiKnowledgeManagementProps> = ({
  language = 'si',
  currentUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'verified'>('pending');
  const [pendingQueries, setPendingQueries] = useState<PendingAiQuery[]>([]);
  const [verifiedItems, setVerifiedItems] = useState<VerifiedAiKnowledgeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Edit / Add Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formLang, setFormLang] = useState<'si' | 'en' | 'ta'>('si');

  const showNotice = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Real-time Subscriptions
  useEffect(() => {
    const unsubPending = subscribeToPendingAiQueries((queries) => {
      setPendingQueries(queries || []);
    });
    const unsubVerified = subscribeToVerifiedAiKnowledge((items) => {
      setVerifiedItems(items || []);
    });

    return () => {
      unsubPending();
      unsubVerified();
    };
  }, []);

  // Filtered Verified Items
  const filteredVerified = useMemo(() => {
    if (!searchQuery.trim()) return verifiedItems;
    const q = searchQuery.toLowerCase().trim();
    return verifiedItems.filter(
      (item) =>
        (item.question && item.question.toLowerCase().includes(q)) ||
        (item.answer && item.answer.toLowerCase().includes(q)) ||
        (item.keywords && item.keywords.some((k: string) => k.toLowerCase().includes(q))) ||
        (item.category && item.category.toLowerCase().includes(q))
    );
  }, [verifiedItems, searchQuery]);

  // Handle Quick Approve
  const handleQuickApprove = async (queryItem: PendingAiQuery) => {
    try {
      // Auto-extract keywords from question
      const autoKeywords = queryItem.question
        .replace(/[?.,!:-]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 2);

      await approveAiQuery(queryItem.id, {
        question: queryItem.question,
        answer: queryItem.answer || '',
        keywords: autoKeywords,
        category: 'general',
        lang: queryItem.detectedLang || 'si',
        approvedBy: currentUser?.name || 'ADMIN',
      });
      showNotice('✅ ප්‍රශ්නය සහ පිළිතුර ස්ථිර දැනුම් ගබඩාවට සාර්ථකව අනුමත කර සුරකින ලදී!');
    } catch (e: any) {
      showNotice('❌ අනුමත කිරීම අසාර්ථක විය: ' + (e?.message || e));
    }
  };

  // Handle Reject
  const handleReject = async (pendingId: string) => {
    if (!window.confirm('මෙම ප්‍රශ්නය ප්‍රතික්ෂේප කර ඉවත් කිරීමට ඔබට සහතිකද?')) return;
    try {
      await rejectPendingAiQuery(pendingId);
      showNotice('🗑️ ප්‍රශ්නය ඉවත් කරන ලදී.');
    } catch (e: any) {
      showNotice('❌ ඉවත් කිරීම අසාර්ථක විය: ' + (e?.message || e));
    }
  };

  // Handle Delete Verified
  const handleDeleteVerified = async (id: string) => {
    if (!window.confirm('මෙම දැනුම් සටහන ස්ථිරවම මකා දැමීමට ඔබට සහතිකද?')) return;
    try {
      await deleteVerifiedAiKnowledgeItem(id);
      showNotice('🗑️ දැනුම් සටහන මකා දමන ලදී.');
    } catch (e: any) {
      showNotice('❌ මකා දැමීම අසාර්ථක විය: ' + (e?.message || e));
    }
  };

  // Open Edit for Pending Query
  const openEditPending = (item: PendingAiQuery) => {
    setEditingPendingId(item.id);
    setEditingKnowledgeId(null);
    setFormQuestion(item.question);
    setFormAnswer(item.answer || '');
    setFormKeywords(
      item.question
        .replace(/[?.,!:-]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 2)
        .join(', ')
    );
    setFormCategory('general');
    setFormLang(item.detectedLang || 'si');
    setIsEditModalOpen(true);
  };

  // Open Edit for Verified Item
  const openEditVerified = (item: VerifiedAiKnowledgeItem) => {
    setEditingKnowledgeId(item.id);
    setEditingPendingId(null);
    setFormQuestion(item.question);
    setFormAnswer(item.answer);
    setFormKeywords((item.keywords || []).join(', '));
    setFormCategory(item.category || 'general');
    setFormLang(item.lang || 'si');
    setIsEditModalOpen(true);
  };

  // Open Add New Verified Item
  const openAddNew = () => {
    setEditingKnowledgeId(null);
    setEditingPendingId(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormKeywords('');
    setFormCategory('general');
    setFormLang('si');
    setIsEditModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModalForm = async () => {
    if (!formQuestion.trim() || !formAnswer.trim()) {
      alert('කරුණාකර ප්‍රශ්නය සහ පිළිතුර ඇතුළත් කරන්න.');
      return;
    }

    const kwArray = formKeywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    try {
      if (editingPendingId) {
        // Approve pending with modified edits
        await approveAiQuery(editingPendingId, {
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          keywords: kwArray,
          category: formCategory,
          lang: formLang,
          approvedBy: currentUser?.name || 'ADMIN',
        });
        showNotice('✅ සංස්කරණය කරන ලද ප්‍රශ්නය සාර්ථකව අනුමත කර සුරකින ලදී!');
      } else if (editingKnowledgeId) {
        // Update existing verified item
        await saveVerifiedAiKnowledgeItem({
          id: editingKnowledgeId,
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          keywords: kwArray,
          category: formCategory,
          lang: formLang,
          approvedBy: currentUser?.name || 'ADMIN',
        });
        showNotice('✅ ස්ථිර දැනුම් සටහන යාවත්කාලීන කරන ලදී!');
      } else {
        // Create brand new item
        await saveVerifiedAiKnowledgeItem({
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          keywords: kwArray,
          category: formCategory,
          lang: formLang,
          approvedBy: currentUser?.name || 'ADMIN',
        });
        showNotice('✅ නව ප්‍රශ්නයක් සහ පිළිතුරක් සාර්ථකව එකතු කරන ලදී!');
      }
      setIsEditModalOpen(false);
    } catch (e: any) {
      showNotice('❌ සුරැකීම අසාර්ථක විය: ' + (e?.message || e));
    }
  };

  return (
    <div className="bg-white dark:bg-[#0a1a11] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-[#173a26] shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#173a26]/60">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-md">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-emerald-300">
              AI සහායක දැනුම් කේන්ද්‍රය (Knowledge Base)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-emerald-500 font-medium">
              පරිශීලකයින් අසන නව ප්‍රශ්න සත්‍යාපනය කිරීම සහ ස්ථිර දැනුම් ගබඩාව කළමනාකරණය
            </p>
          </div>
        </div>

        {/* Action Button: Add New Q&A */}
        <button
          onClick={openAddNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>අලුත් Q&A එකතු කරන්න</span>
        </button>
      </div>

      {/* Notification Banner */}
      {notificationMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-sm font-bold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#173a26]">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-all ${
            activeSubTab === 'pending'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>අනුමැතිය අපේක්ෂිත ප්‍රශ්න</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black">
            {pendingQueries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('verified')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-all ${
            activeSubTab === 'verified'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>ස්ථිර දැනුම් ගබඩාව (Verified)</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black">
            {verifiedItems.length}
          </span>
        </button>
      </div>

      {/* SUB-TAB 1: PENDING AI QUERIES */}
      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl text-xs sm:text-sm text-amber-900 dark:text-amber-300 font-medium">
            💡 <strong>ක්‍රියාකාරීත්වය:</strong> පරිශීලකයින් විසින් අසන ලද සහ Gemini AI මඟින් පිළිතුරු දුන් නව ප්‍රශ්න මෙහි ලැයිස්තුගත වේ. පිළිතුර නිවැරදි නම් <strong>'තහවුරු කර සුරකින්න'</strong> ඔබන්න. ප්‍රශ්නය හෝ පිළිතුර වෙනස් කිරීමට අවශ්‍ය නම් <strong>'සංස්කරණය කර සුරකින්න'</strong> ඔබන්න. එවිට අනාගතයේදී එම ප්‍රශ්නය අසන ඕනෑම කෙනෙකුට ස්ථිර පිළිතුර නොමිලේ ක්ෂණිකව ලැබේ!
          </div>

          {pendingQueries.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-bold text-sm">
              ✨ අනුමැතිය සඳහා දැනට නව ප්‍රශ්න කිසිවක් නොමැත. සියලුම ප්‍රශ්න සත්‍යාපනය කර ඇත!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingQueries.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 bg-slate-50 dark:bg-[#0c1f15] border border-slate-200/80 dark:border-[#173a26] rounded-2xl space-y-3 hover:border-emerald-500/50 transition-all shadow-sm"
                >
                  {/* Top Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-emerald-600 font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 uppercase font-black">
                        {item.detectedLang || 'si'}
                      </span>
                      {item.locationContext && (
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          {item.locationContext}
                        </span>
                      )}
                    </div>
                    <span>{item.askedAt ? new Date(item.askedAt).toLocaleString('si-LK') : 'මෑතකදී'}</span>
                  </div>

                  {/* Question */}
                  <div>
                    <span className="text-xs font-black uppercase text-slate-400 dark:text-emerald-500 tracking-wider">
                      පරිශීලකයා ඇසූ ප්‍රශ්නය:
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      "{item.question}"
                    </h3>
                  </div>

                  {/* Gemini Answer */}
                  <div className="p-3.5 bg-white dark:bg-[#0a1710] rounded-xl border border-slate-200/60 dark:border-[#173a26]/80 text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gemini AI ලබා දුන් පිළිතුර:</span>
                    </div>
                    {item.answer}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-[#173a26]/50">
                    <button
                      onClick={() => handleReject(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ප්‍රතික්ෂේප කර ඉවත් කරන්න</span>
                    </button>

                    <button
                      onClick={() => openEditPending(item)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 rounded-xl transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>සංස්කරණය කර සුරකින්න</span>
                    </button>

                    <button
                      onClick={() => handleQuickApprove(item)}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>තහවුරු කර සුරකින්න (Approve)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: VERIFIED KNOWLEDGE BASE */}
      {activeSubTab === 'verified' && (
        <div className="space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ස්ථිර දැනුම් ගබඩාවේ ප්‍රශ්න, පිළිතුරු හෝ Keywords සොයන්න..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0c1f15] border border-slate-200 dark:border-[#173a26] rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {filteredVerified.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-bold text-sm">
              {searchQuery ? 'සෙවුමට ගැළපෙන ප්‍රශ්න කිසිවක් හමු නොවීය.' : 'තවමත් ස්ථිර ප්‍රශ්න කිසිවක් ගබඩා කර නොමැත.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredVerified.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 bg-slate-50 dark:bg-[#0c1f15] border border-slate-200/80 dark:border-[#173a26] rounded-2xl space-y-3 hover:border-emerald-500/50 transition-all shadow-sm"
                >
                  {/* Top Category & Language */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase">
                        {item.lang || 'si'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                        {item.category || 'General'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditVerified(item)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="සංස්කරණය කරන්න"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVerified(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                        title="මකා දමන්න"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question */}
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {item.question}
                  </h3>

                  {/* Answer */}
                  <div className="p-3.5 bg-white dark:bg-[#0a1710] rounded-xl border border-slate-200/60 dark:border-[#173a26]/80 text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {item.answer}
                  </div>

                  {/* Keywords Tags */}
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Tag className="w-3 h-3 text-slate-400" />
                      {item.keywords.map((kw: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT / ADD MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0b1d12] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-[#173a26] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#173a26]">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {editingPendingId
                  ? 'ප්‍රශ්නය සහ පිළිතුර සංස්කරණය කර අනුමත කරන්න'
                  : editingKnowledgeId
                  ? 'දැනුම් සටහන සංස්කරණය කරන්න'
                  : 'අලුත් ප්‍රශ්නයක් සහ පිළිතුරක් එකතු කරන්න'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-600 dark:text-emerald-400">
                ප්‍රශ්නය (Question / Pattern):
              </label>
              <input
                type="text"
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="උදා: කොළඹ කොටුව පිහිටීම සහ යන මාර්ගය..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#08150d] border border-slate-200 dark:border-[#173a26] rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Answer Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-600 dark:text-emerald-400">
                නිවැරදි පිළිතුර (Verified Answer in Markdown):
              </label>
              <textarea
                rows={6}
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="පරිශීලකයාට පෙන්විය යුතු නිවැරදි, පැහැදිලි පිළිතුර..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#08150d] border border-slate-200 dark:border-[#173a26] rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 whitespace-pre-wrap leading-relaxed"
              />
            </div>

            {/* Keywords / Synonyms Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-600 dark:text-emerald-400 flex items-center justify-between">
                <span>සමාන වචන / සෙවුම් පද (Search Keywords & Synonyms - කොමා වලින් වෙන් කරන්න):</span>
              </label>
              <input
                type="text"
                value={formKeywords}
                onChange={(e) => setFormKeywords(e.target.value)}
                placeholder="උදා: කොළඹ, කොටුව, යන්නේ කොහොමද, colombo fort, route"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#08150d] border border-slate-200 dark:border-[#173a26] rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                මිනිසුන් මෙම ප්‍රශ්නය විවිධ අයුරින් අසන වචන (උදා: "කොළඹ කොටුව", "කොළඹට යන්නේ කොහොමද") මෙහි ඇතුළත් කරන්න.
              </p>
            </div>

            {/* Language & Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-600 dark:text-emerald-400">
                  භාෂාව (Language):
                </label>
                <select
                  value={formLang}
                  onChange={(e) => setFormLang(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#08150d] border border-slate-200 dark:border-[#173a26] rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="si">සිංහල (Sinhala)</option>
                  <option value="en">English</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-600 dark:text-emerald-400">
                  වර්ගය (Category):
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#08150d] border border-slate-200 dark:border-[#173a26] rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="general">සාමාන්‍ය (General)</option>
                  <option value="forms">පෝරම පිරවීම (Form Guides)</option>
                  <option value="location">ස්ථාන සහ මාර්ග (Location & Roads)</option>
                  <option value="blood">ලේ බැංකුව (Blood Bank)</option>
                  <option value="services">කාර්මික සේවා (Quick Services)</option>
                  <option value="ledger">ආධාර ලෙජරය (Aid Ledger)</option>
                  <option value="emergency">හදිසි ආපදා (Emergency & Red Alert)</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#173a26]">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                අවලංගු කරන්න
              </button>

              <button
                type="button"
                onClick={handleSaveModalForm}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>ස්ථිරව සුරකින්න</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
