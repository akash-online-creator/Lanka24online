import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TagItem, HelpPost, Language } from '../types';
import { searchTags, getTagIconComponent } from '../utils/tagUtils';
import { translateText } from '../utils/postTranslator';
import { Search, Tag, X, Sparkles, Filter, BookOpen } from 'lucide-react';
import {
  findSynonymSuggestionPrompt,
  getExpandedSearchKeywords,
  getStoredSearchDictionary,
} from '../data/searchDictionary';
import { SmartSearchSynonymPrompt } from './SmartSearchSynonymPrompt';

interface TagSearchBarProps {
  allTags: TagItem[];
  selectedTagFilter: TagItem | null;
  onSelectTagFilter: (tag: TagItem | null) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  totalPostsCount: number;
  filteredPostsCount: number;
  posts?: HelpPost[] | any[];
  language?: Language;
}

export const TagSearchBar: React.FC<TagSearchBarProps> = ({
  allTags = [],
  selectedTagFilter,
  onSelectTagFilter,
  searchQuery,
  onSearchQueryChange,
  totalPostsCount,
  filteredPostsCount,
  posts = [],
  language = 'si',
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dismissedSynonyms, setDismissedSynonyms] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  // Live search matching tags (with synonym expansion fallback)
  const matchingTags = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const direct = searchTags(searchQuery, Array.isArray(allTags) ? allTags : []);
    if (direct.length > 0) return direct;

    // Check expanded synonyms
    const expandedKeywords = getExpandedSearchKeywords(searchQuery);
    if (expandedKeywords.length <= 1) return [];

    const matchedSet = new Set<string>();
    const synMatches: TagItem[] = [];

    for (const kw of expandedKeywords) {
      if (kw === searchQuery.toLowerCase().trim()) continue;
      const found = searchTags(kw, Array.isArray(allTags) ? allTags : []);
      for (const t of found) {
        if (t && t.id && !matchedSet.has(t.id)) {
          matchedSet.add(t.id);
          synMatches.push(t);
        }
      }
    }
    return synMatches;
  }, [searchQuery, allTags]);

  // Determine if we should show the "ඔබ සොයන්නේ [සහල්] නේද? [ඔව්] [නැත]" prompt
  const synonymPrompt = useMemo(() => {
    const qTrim = searchQuery.trim().toLowerCase();
    if (!qTrim || qTrim.length < 2 || dismissedSynonyms.includes(qTrim)) {
      return null;
    }

    if (posts && posts.length > 0) {
      return findSynonymSuggestionPrompt(
        searchQuery,
        posts,
        (p) => `${p.tagName || ''} ${p.tagCategory || ''} ${p.whatHappened || ''} ${p.whatIsNeeded || ''} ${p.title || ''}`
      );
    }

    return findSynonymSuggestionPrompt(
      searchQuery,
      allTags,
      (t) => `${t.tagName} ${t.category}`
    );
  }, [searchQuery, posts, allTags, dismissedSynonyms]);

  // Close dropdown if user clicks outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSearchQueryChange(val);
    setIsDropdownOpen(true);

    if (!val.trim()) {
      onSelectTagFilter(null);
    }
  };

  const handleSelectTag = (tag: TagItem) => {
    onSelectTagFilter(tag);
    onSearchQueryChange(`${tag.tagName} - ${tag.category}`);
    setIsDropdownOpen(false);
  };

  const handleClear = () => {
    onSearchQueryChange('');
    onSelectTagFilter(null);
    setIsDropdownOpen(false);
  };

  const handleAcceptSuggestion = (suggestedTerm: string) => {
    onSearchQueryChange(suggestedTerm);
    setIsDropdownOpen(false);
  };

  const handleDismissSuggestion = () => {
    if (searchQuery.trim()) {
      setDismissedSynonyms((prev) => [...prev, searchQuery.trim().toLowerCase()]);
    }
  };

  return (
    <div className="w-full relative mb-4" ref={dropdownRef}>
      {/* Input & Search Bar Area */}
      <div className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={getLangText(
              '🔍 දැන්වීම් අංකය (#HELP-3728) හෝ වචන වලින් සොයන්න (e.g. #HELP-3728, haal, සහල්, beheth)...',
              '🔍 Search by Ad ID (#HELP-3728) or keywords (e.g. #HELP-3728, rice, medicine)...',
              '🔍 விளம்பர எண் (#HELP-3728) அல்லது சொற்கள் மூலம் தேடுங்கள்...'
            )}
            className="w-full bg-white text-slate-900 dark:bg-[#071d13] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-2 border-emerald-400/80 dark:border-emerald-600 rounded-2xl py-3 pl-11 pr-11 text-xs sm:text-sm font-bold shadow-md focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-emerald-500/20"
          />

          <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute left-3.5 pointer-events-none" />

          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3.5 p-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
              title={getLangText('සෙවුම ඉවත් කරන්න', 'Clear search', 'தேடலை அழிக்கவும்')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* LIVE DROPDOWN FOR MATCHING TAGS */}
        {isDropdownOpen && searchQuery.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-[#071a12] border-2 border-emerald-500 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-fadeIn">
            <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950 border-b border-emerald-200 dark:border-emerald-800/60 text-[11px] font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>{getLangText('ගැලපෙන Tags', 'Matching Tags', 'பொருந்தும் குறிச்சொற்கள்')} ({matchingTags.length}):</span>
              </span>
              <span className="text-[10px] text-slate-500">{getLangText('ක්ලික් කර තෝරන්න', 'Click to select', 'தேர்வு செய்ய கிளிக் செய்க')}</span>
            </div>

            {matchingTags.length > 0 ? (
              <div className="divide-y divide-emerald-100 dark:divide-emerald-900/40">
                {matchingTags.map((tag, tIdx) => {
                  const TagIconComp = getTagIconComponent(tag.tagName, tag.category);
                  return (
                    <button
                      key={`search_tag_${tag.id || 't'}_${tIdx}`}
                      type="button"
                      onClick={() => handleSelectTag(tag)}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 text-slate-900 dark:text-slate-100 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <TagIconComp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-emerald-900 dark:text-emerald-200 font-extrabold">
                          {translateText(tag.tagName, language)}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800/80">
                        {translateText(tag.category, language)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                {getLangText(
                  `"${searchQuery}" ලෙස වෙනම Tag එකක් හමුනොවිණි. අදාළ වචන විස්තර අතර සෙවීමට ඇතුළත් වේ.`,
                  `No specific tag for "${searchQuery}". Searching inside post details.`,
                  `"${searchQuery}" க்கான குறிச்சொல் இல்லை. பதிவுகளின் விவரங்களில் தேடப்படுகிறது.`
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Tag Active Filter Badge */}
      {selectedTagFilter && (
        <div className="flex items-center gap-2 pt-2 animate-fadeIn">
          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{getLangText('සක්‍රීය Tag එක:', 'Active Tag:', 'செயலில் உள்ள குறிச்சொல்:')}</span>
          </span>
          <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md">
            <span>🏷️ {translateText(selectedTagFilter.tagName, language)} ({translateText(selectedTagFilter.category, language)})</span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 text-slate-900 hover:text-rose-800 font-bold cursor-pointer"
              title={getLangText('ඉවත් කරන්න', 'Remove', 'நீக்கு')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* SMART SYNONYM PROMPT: "ඔබ සොයන්නේ සහල් නේද? [ඔව්] [නැත]" */}
      {synonymPrompt && (
        <SmartSearchSynonymPrompt
          prompt={synonymPrompt}
          onAcceptSuggestion={handleAcceptSuggestion}
          onDismiss={handleDismissSuggestion}
        />
      )}
    </div>
  );
};
