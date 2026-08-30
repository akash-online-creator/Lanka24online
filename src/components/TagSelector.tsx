import React, { useState } from 'react';
import { TagItem } from '../types';
import { addTagToStorage, findSimilarTags, getTagIconComponent, getStoredTags } from '../utils/tagUtils';
import { Tag, Plus, Check, AlertTriangle, Sparkles, X, Search } from 'lucide-react';

interface TagSelectorProps {
  selectedTag: TagItem | null;
  onSelectTag: (tag: TagItem | null) => void;
  allTags?: TagItem[];
  tags?: TagItem[];
  onTagCreated?: (newTag: TagItem) => void;
  onAddNewTag?: (newTag: TagItem) => void;
  errorMsg?: string;
  lang?: string;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTag,
  onSelectTag,
  allTags,
  tags,
  onTagCreated,
  onAddNewTag,
  errorMsg,
}) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [createError, setCreateError] = useState('');

  const safeTags = (Array.isArray(allTags) && allTags.length > 0)
    ? allTags
    : ((Array.isArray(tags) && tags.length > 0) ? tags : getStoredTags());

  // Find similar tags as user types new tag details
  const similarTags = findSimilarTags(newTagName, newCategory, safeTags);

  // Filter existing tags for picker
  const filteredTags = tagSearch.trim()
    ? safeTags.filter(
        (t) =>
          t &&
          ((t.tagName || '').toLowerCase().includes(tagSearch.toLowerCase()) ||
          (t.category || '').toLowerCase().includes(tagSearch.toLowerCase()))
      )
    : safeTags;

  const handleSaveNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || !newCategory.trim()) {
      setCreateError('කරුණාකර Tag Name (උදා: Food) සහ Category (උදා: කෑම) දෙකම ඇතුළත් කරන්න.');
      return;
    }

    const result = addTagToStorage(newTagName.trim(), newCategory.trim());
    if (onTagCreated) onTagCreated(result.tag);
    if (onAddNewTag) onAddNewTag(result.tag);
    onSelectTag(result.tag);
    
    // Reset state
    setNewTagName('');
    setNewCategory('');
    setCreateError('');
    setIsCreatingNew(false);
  };

  return (
    <div className="space-y-3 bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white dark:from-[#061c12] dark:via-[#04140d] dark:to-[#061c12] p-4 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700/60 shadow-sm">
      
      {/* Label and Selected Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>අදාළ Tag එක තෝරන්න (Select Tag) *</span>
        </label>

        {selectedTag && (
          <span className="text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <span>✓ {selectedTag.tagName} ({selectedTag.category})</span>
            <button
              type="button"
              onClick={() => onSelectTag(null)}
              className="ml-1 hover:text-rose-200"
              title="ඉවත් කරන්න"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
        වෙනත් අය ලබාදුන් Tag පහතින් තෝරන්න. ඔබට අවශ්‍ය Tag එක නොමැතිනම් <strong>"+ New Tag"</strong> ක්ලික් කරන්න.
      </p>

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-bold flex items-center gap-1.5 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Existing Tags Chips List */}
      {!isCreatingNew && (
        <div className="space-y-2.5">
          {/* Quick search input if there are more than 5 tags */}
          {(allTags || []).length > 5 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Tag / Category සොයන්න..."
                className="w-full bg-white dark:bg-[#071a12] border border-emerald-200 dark:border-emerald-800/60 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
            {filteredTags.map((tag) => {
              const isSelected = selectedTag?.id === tag.id;
              const TagIconComp = getTagIconComponent(tag.tagName, tag.category);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onSelectTag(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md scale-105 ring-2 ring-emerald-400'
                      : 'bg-white dark:bg-[#071a12] text-slate-800 dark:text-slate-200 border border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/40 shadow-sm'
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <TagIconComp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  <span>{tag.tagName}</span>
                  <span className={`text-[10px] font-normal px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-emerald-800/60 text-emerald-100' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  }`}>
                    {tag.category}
                  </span>
                </button>
              );
            })}

            {/* "+ New Tag" button */}
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white shadow-sm flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Tag</span>
            </button>
          </div>
        </div>
      )}

      {/* NEW TAG CREATION MODAL / PANEL */}
      {isCreatingNew && (
        <div className="p-3.5 bg-white dark:bg-[#081f15] border-2 border-amber-400 dark:border-amber-500/70 rounded-2xl space-y-3 animate-fadeIn shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-emerald-900/60">
            <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>අලුත් Tag එකක් ඇතුළත් කිරීම (+ New Tag)</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(false);
                setCreateError('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold"
            >
              ✕ අවලංගුයි
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tag Name (උදා: Food) *
              </label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => {
                  setNewTagName(e.target.value);
                  setCreateError('');
                }}
                placeholder="උදා: Food, Medical, Towing"
                className="w-full bg-emerald-50/50 dark:bg-[#05180f] border border-emerald-300 dark:border-emerald-800 rounded-xl py-1.5 px-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category / කාණ්ඩය (උදා: කෑම) *
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setCreateError('');
                }}
                placeholder="උදා: කෑම, වෛද්‍ය, ප්‍රවාහන"
                className="w-full bg-emerald-50/50 dark:bg-[#05180f] border border-emerald-300 dark:border-emerald-800 rounded-xl py-1.5 px-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>
          </div>

          {/* SIMILAR TAGS WARNING / SUGGESTIONS LIST (Requirement 04) */}
          {(similarTags || []).length > 0 && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 rounded-xl space-y-1.5 animate-fadeIn">
              <span className="text-[11px] font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>දැනටමත් පවතින සමාන Tag ඇත! (එකක් තෝරාගත හැක)</span>
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {similarTags.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      onSelectTag(st);
                      setIsCreatingNew(false);
                      setNewTagName('');
                      setNewCategory('');
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-[#0a2318] text-amber-900 dark:text-amber-200 border border-amber-400 hover:bg-amber-100 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <span>✓ {st.tagName} ({st.category})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {createError && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">{createError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
            >
              ආපසු
            </button>
            <button
              type="button"
              onClick={handleSaveNewTag}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>ලබාදී තෝරන්න (Save Tag)</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
