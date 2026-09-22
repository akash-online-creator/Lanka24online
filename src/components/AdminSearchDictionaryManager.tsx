import React, { useState, useMemo } from 'react';
import { SearchSynonymGroup, Language } from '../types';
import {
  getStoredSearchDictionary,
  addCustomSynonymGroup,
  updateSynonymGroup,
  deleteSynonymGroup,
  resetSearchDictionaryToDefault,
} from '../data/searchDictionary';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  CheckCircle,
  RotateCcw,
  Tag,
  Filter,
  Layers,
  HelpCircle,
  X,
  Save,
  Check
} from 'lucide-react';

interface AdminSearchDictionaryManagerProps {
  language?: Language;
}

export const AdminSearchDictionaryManager: React.FC<AdminSearchDictionaryManagerProps> = () => {
  const [dictionary, setDictionary] = useState<SearchSynonymGroup[]>(() => getStoredSearchDictionary());
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [filterLearnedOnly, setFilterLearnedOnly] = useState(false);

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SearchSynonymGroup | null>(null);
  
  // Form fields
  const [formCanonical, setFormCanonical] = useState('');
  const [formCategory, setFormCategory] = useState('ආහාර');
  const [formTermsInput, setFormTermsInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Reload dictionary from storage
  const reloadData = () => {
    setDictionary(getStoredSearchDictionary());
  };

  // Summary statistics
  const stats = useMemo(() => {
    const totalGroups = dictionary.length;
    let totalTermsCount = 0;
    let learnedCount = 0;
    let totalConfirmations = 0;

    dictionary.forEach((g) => {
      totalTermsCount += g.terms.length;
      if (g.isLearned) learnedCount++;
      totalConfirmations += g.confirmedCount || 0;
    });

    return { totalGroups, totalTermsCount, learnedCount, totalConfirmations };
  }, [dictionary]);

  // Unique categories list
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    dictionary.forEach((g) => {
      if (g.category) cats.add(g.category);
    });
    return Array.from(cats);
  }, [dictionary]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return dictionary.filter((g) => {
      // Category filter
      if (selectedCategoryFilter !== 'all' && g.category !== selectedCategoryFilter) {
        return false;
      }
      // Learned only filter
      if (filterLearnedOnly && !g.isLearned) {
        return false;
      }
      // Text query
      if (q) {
        const canonicalMatch = (g.canonical || '').toLowerCase().includes(q);
        const termMatch = (g.terms || []).some((t) => (t || '').toLowerCase().includes(q));
        const catMatch = (g.category || '').toLowerCase().includes(q);
        if (!canonicalMatch && !termMatch && !catMatch) return false;
      }
      return true;
    });
  }, [dictionary, searchFilter, selectedCategoryFilter, filterLearnedOnly]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingGroup(null);
    setFormCanonical('');
    setFormCategory('ආහාර');
    setFormTermsInput('');
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (group: SearchSynonymGroup) => {
    setEditingGroup(group);
    setFormCanonical(group.canonical);
    setFormCategory(group.category || 'සාමාන්‍ය');
    setFormTermsInput(group.terms.join(', '));
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Save / Update Handler
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCanonical.trim()) {
      setFormError('ප්‍රධාන (Canonical) නම ඇතුළත් කිරීම අනිවාර්ය වේ.');
      return;
    }

    const rawTerms = formTermsInput
      .split(/[,|\n]/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (rawTerms.length === 0) {
      setFormError('අවම වශයෙන් එක් අදේශිත නමක් හෝ ඇතුළත් කරන්න.');
      return;
    }

    if (editingGroup) {
      // Update
      updateSynonymGroup(editingGroup.id, formCanonical, rawTerms, formCategory);
      showToast(`"${formCanonical}" අදේශිත කාණ්ඩය සාර්ථකව යාවත්කාලීන විය!`);
    } else {
      // Create new
      addCustomSynonymGroup(formCanonical, rawTerms, formCategory);
      showToast(`නව අදේශිත කාණ්ඩය "${formCanonical}" සාර්ථකව එකතු විය!`);
    }

    reloadData();
    setIsEditModalOpen(false);
  };

  // Delete Handler
  const handleDelete = (id: string, name: string) => {
    deleteSynonymGroup(id);
    reloadData();
    showToast(`"${name}" ඩික්ෂනරියෙන් ඉවත් කරන ලදී.`);
  };

  // Reset to Defaults Handler
  const handleResetDefaults = () => {
    resetSearchDictionaryToDefault();
    reloadData();
    showToast('ඩික්ෂනරිය සාර්ථකව පෙරනිමි තත්වයට පත්කරන ලදී.');
  };

  // Inline Quick Add Term
  const [quickAddInputs, setQuickAddInputs] = useState<Record<string, string>>({});

  const handleQuickAddTerm = (groupId: string, groupCanonical: string, existingTerms: string[], category?: string) => {
    const val = (quickAddInputs[groupId] || '').trim();
    if (!val) return;

    const newTerms = Array.from(new Set([...existingTerms, val]));
    updateSynonymGroup(groupId, groupCanonical, newTerms, category);
    reloadData();
    setQuickAddInputs((prev) => ({ ...prev, [groupId]: '' }));
    showToast(`"${val}" වචනය "${groupCanonical}" වෙත එකතු විය!`);
  };

  return (
    <div className="w-full space-y-6 animate-fadeIn text-slate-900 dark:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-2 animate-bounce border border-emerald-400">
          <CheckCircle className="w-5 h-5 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner with Stats */}
      <div className="bg-gradient-to-br from-teal-900 via-emerald-900 to-slate-950 p-5 sm:p-6 rounded-3xl border-2 border-emerald-500/40 shadow-xl text-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl text-emerald-300">
                <BookOpen className="w-6 h-6" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                <span>ඩික්ෂනරි පාලක පුවරුව</span>
                <span className="text-xs bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full">
                  Admin Tool
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-emerald-200 font-medium">
              පද්ධතියේ සියලුම අදේශිත නම් (Synonyms), Singlish වචන සහ පරිශීලකයින්ගෙන් ස්වයංක්‍රීයව ඉගෙනගත් වචන කළමනාකරණය කරන්න.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>නව වචන කාණ්ඩයක් එක්කරන්න</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="පෙරනිමි තත්වයට පත්කරන්න"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-xs p-3 rounded-2xl border border-emerald-400/20">
            <div className="text-[11px] text-emerald-200 font-bold">මුළු වචන කාණ්ඩ</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5 font-mono">{stats.totalGroups}</div>
          </div>

          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-xs p-3 rounded-2xl border border-emerald-400/20">
            <div className="text-[11px] text-emerald-200 font-bold">සමස්ත අදේශිත නම් (Aliases)</div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5 font-mono">{stats.totalTermsCount}</div>
          </div>

          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-xs p-3 rounded-2xl border border-emerald-400/20">
            <div className="text-[11px] text-emerald-200 font-bold">ඉගෙනගත් වචන (Learned)</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5 font-mono">{stats.learnedCount}</div>
          </div>

          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-xs p-3 rounded-2xl border border-emerald-400/20">
            <div className="text-[11px] text-emerald-200 font-bold">සනාථ කළ වාර (Confirmations)</div>
            <div className="text-xl sm:text-2xl font-black text-teal-300 mt-0.5 font-mono">{stats.totalConfirmations}</div>
          </div>
        </div>
      </div>

      {/* 2. Search & Category Filters Bar */}
      <div className="bg-white dark:bg-[#07130c] p-4 rounded-3xl border border-slate-200 dark:border-[#132a1d] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* Search inside dictionary */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="ඩික්ෂනරියේ ඕනෑම වචනයක්, ප්‍රධාන නමක් හෝ Singlish සොයන්න (e.g. සහල්, haal, බෙහෙත්)..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-[#0c1a12] border border-slate-200 dark:border-[#173222] rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-3.5 top-3 p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter by Category */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-emerald-600 shrink-0" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2.5 bg-slate-50 dark:bg-[#0c1a12] border border-slate-200 dark:border-[#173222] rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">සියලුම කාණ්ඩ ({availableCategories.length})</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Learned only toggle */}
            <button
              type="button"
              onClick={() => setFilterLearnedOnly((prev) => !prev)}
              className={`px-3 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                filterLearnedOnly
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-100 dark:bg-[#12281b] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>ස්වයංක්‍රීයව ඉගෙනගත් ({stats.learnedCount})</span>
            </button>
          </div>

        </div>

        {/* Quick Help Tip */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0c1a12] p-2.5 rounded-2xl border border-slate-200 dark:border-[#173222]">
          <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            පරිශීලකයින් 'ඔව්' ක්ලික් කර සනාථ කරන ඕනෑම නව වචනයක් ස්වයංක්‍රීයව මෙහි <strong className="text-amber-500">"ඉගෙනගත්" (Learned)</strong> ලාංඡනය සහිතව සටහන් වේ.
          </span>
        </div>
      </div>

      {/* 3. Dictionary Groups Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>අදේශිත වචන ලැයිස්තුව ({filteredGroups.length} කාණ්ඩ හමුවිණි)</span>
          </h3>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#07130c] border border-slate-200 dark:border-[#132a1d] rounded-3xl p-6 text-slate-500">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="font-bold text-sm">සෙවුමට ගැලපෙන වචන කාණ්ඩ හමුනොවිණි.</p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer hover:bg-emerald-700"
            >
              + අලුතින් එකතු කරන්න
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGroups.map((group, gIdx) => {
              return (
                <div
                  key={`dict_grp_${group.id || 'grp'}_${gIdx}`}
                  className={`bg-white dark:bg-[#07130c] border-2 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5 transition-all hover:shadow-md ${
                    group.isLearned
                      ? 'border-amber-400/70 dark:border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-transparent'
                      : 'border-slate-200 dark:border-[#132a1d]'
                  }`}
                >
                  {/* Card Top: Canonical, Category & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-wide">
                          {group.canonical}
                        </span>
                        
                        {group.category && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            🏷️ {group.category}
                          </span>
                        )}

                        {group.isLearned && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs">
                            <Sparkles className="w-3 h-3" />
                            <span>ඉගෙනගත් වචන</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        සනාථ කිරීම්: <strong className="text-emerald-600 font-bold">{group.confirmedCount || 0} වතාවක්</strong>
                      </div>
                    </div>

                    {/* Edit & Delete Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(group)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-[#12281b] hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                        title="සංස්කරණය කරන්න"
                      >
                        <Edit3 className="w-4 h-4 text-emerald-600" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(group.id, group.canonical)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-[#12281b] hover:bg-rose-100 dark:hover:bg-rose-900/60 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                        title="ඉවත් කරන්න"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </div>
                  </div>

                  {/* Synonym Terms Tags List */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      අදේශිත නම් / Synonyms ({group.terms.length}):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.terms.map((term, tIdx) => (
                        <span
                          key={tIdx}
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                            term === group.canonical
                              ? 'bg-emerald-600 text-white border-emerald-600 font-black'
                              : 'bg-slate-100 dark:bg-[#0c1a12] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-[#173222]'
                          }`}
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Inline Quick Add Term Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-[#132a1d] flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder={`"${group.canonical}" වෙත තවත් වචනයක් එකතු කරන්න...`}
                      value={quickAddInputs[group.id] || ''}
                      onChange={(e) => setQuickAddInputs((prev) => ({ ...prev, [group.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAddTerm(group.id, group.canonical, group.terms, group.category);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-[#0c1a12] border border-slate-200 dark:border-[#173222] rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuickAddTerm(group.id, group.canonical, group.terms, group.category)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>එක්කරන්න</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Modal: Add / Edit Synonym Group */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#07130c] border-2 border-emerald-500 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-white/20 rounded-xl">
                  <BookOpen className="w-5 h-5 text-emerald-200" />
                </span>
                <h3 className="font-black text-sm sm:text-base">
                  {editingGroup ? 'අදේශිත වචන කාණ්ඩය සංස්කරණය' : 'නව අදේශිත වචන කාණ්ඩයක් එක්කිරීම'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-5 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-2xl">
                  ⚠️ {formError}
                </div>
              )}

              {/* Canonical (Primary) Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  ප්‍රධාන නම (Canonical Word) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formCanonical}
                  onChange={(e) => setFormCanonical(e.target.value)}
                  placeholder="e.g. සහල්, ඖෂධ, ප්‍රවාහන, මේසන්..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0c1a12] border border-slate-300 dark:border-[#173222] rounded-2xl text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <span className="text-[10px] text-slate-500">
                  සෙවුමේදී පරිශීලකයාට ප්‍රශ්නයක් ලෙස යෝජනා කරන සම්මත නම.
                </span>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  කාණ්ඩය (Category)
                </label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g. ආහාර, සෞඛ්‍ය, ප්‍රවාහන, සේවා, නිවාස..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0c1a12] border border-slate-300 dark:border-[#173222] rounded-2xl text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Terms / Aliases List */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  අදේශිත නම් / ව්‍යවහාරික නම් / Singlish (කොමාවලින් වෙන්කරන්න) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formTermsInput}
                  onChange={(e) => setFormTermsInput(e.target.value)}
                  placeholder="e.g. හාල්, සහල්, rice, haal, sahal, කැකුළු, නාඩු, සම්බා"
                  className="w-full p-3.5 bg-slate-50 dark:bg-[#0c1a12] border border-slate-300 dark:border-[#173222] rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <span className="text-[10px] text-slate-500">
                  පරිශීලකයා මෙම ඕනෑම වචනයක් සෙවූ විට ප්‍රධාන නම යෝජනා කරනු ලැබේ.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-[#132a1d]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#12281b] cursor-pointer"
                >
                  අවලංගු කරන්න
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>සුරකින්න (Save Group)</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
