import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TagItem, HelpPost, Language, MarketShop, ProfessionalService, User } from '../types';
import { searchTags, getTagIconComponent } from '../utils/tagUtils';
import { translateText } from '../utils/postTranslator';
import { 
  Search, 
  Tag, 
  X, 
  Sparkles, 
  Filter, 
  AtSign, 
  Briefcase, 
  Store, 
  Building2, 
  User as UserIcon, 
  FileText,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import {
  findSynonymSuggestionPrompt,
  getExpandedSearchKeywords,
} from '../data/searchDictionary';
import { SmartSearchSynonymPrompt } from './SmartSearchSynonymPrompt';
import { 
  searchUniversalEntitiesByAtQuery, 
  UniversalEntityMatch,
  parseAtQuery
} from '../utils/entitySerialNumberHelper';

interface TagSearchBarProps {
  allTags: TagItem[];
  selectedTagFilter: TagItem | null;
  onSelectTagFilter: (tag: TagItem | null) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  totalPostsCount: number;
  filteredPostsCount: number;
  posts?: HelpPost[] | any[];
  shops?: MarketShop[];
  professionals?: ProfessionalService[];
  users?: User[];
  onSelectEntityMatch?: (match: UniversalEntityMatch) => void;
  language?: Language;
  onOpenAccommodation?: () => void;
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
  shops = [],
  professionals = [],
  users = [],
  onSelectEntityMatch,
  language = 'si',
  onOpenAccommodation,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dismissedSynonyms, setDismissedSynonyms] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  // Check if query is an @ search or serial query (e.g., @555, @3728, 555)
  const isAtQuery = useMemo(() => {
    return searchQuery.trim().startsWith('@') || /^\d{2,6}$/.test(searchQuery.trim());
  }, [searchQuery]);

  // Universal Entity Matches for @ serial numbers (Posts, Businesses, Shops, Users, Professionals)
  const universalMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchUniversalEntitiesByAtQuery(searchQuery, {
      posts,
      shops,
      professionals,
      users,
    });
  }, [searchQuery, posts, shops, professionals, users]);

  // Live search matching tags (with synonym expansion fallback)
  const matchingTags = useMemo(() => {
    if (!searchQuery.trim() || isAtQuery) return [];
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
  }, [searchQuery, allTags, isAtQuery]);

  // Determine if we should show the "ඔබ සොයන්නේ [සහල්] නේද? [ඔව්] [නැත]" prompt
  const synonymPrompt = useMemo(() => {
    if (isAtQuery) return null;
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
  }, [searchQuery, posts, allTags, dismissedSynonyms, isAtQuery]);

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

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'post':
        return FileText;
      case 'business':
        return Building2;
      case 'shop':
        return Store;
      case 'professional':
        return Briefcase;
      case 'user':
        return UserIcon;
      default:
        return AtSign;
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
              '🔍 අංකයෙන් (@555, #HELP-3728) හෝ වචන වලින් සොයන්න (e.g. @555, සහල්, haal, beheth)...',
              '🔍 Search by Serial (@555, #HELP-3728) or keywords (e.g. @555, rice, medicine)...',
              '🔍 எண் (@555) அல்லது சொற்கள் மூலம் தேடுங்கள்...'
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

        {/* Quick Clickable Hashtags under Search Bar */}
        <div className="flex items-center gap-2 pt-2 px-1 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (onOpenAccommodation) {
                onOpenAccommodation();
              } else {
                onSearchQueryChange('#නවාතැන');
              }
            }}
            className="group px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/30 hover:from-emerald-500/30 hover:to-teal-500/40 border-2 border-emerald-500/70 hover:border-emerald-500 text-emerald-950 dark:text-emerald-200 text-xs font-black flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <span className="text-amber-500 text-sm">🏡</span>
            <span className="font-mono text-emerald-800 dark:text-emerald-300">#නවාතැන</span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hidden sm:inline">
              (කුලී නිවාස, බෝඩින්, හොටල්)
            </span>
          </button>
        </div>

        {/* LIVE DROPDOWN: Matching @ Entities or Tags */}
        {isDropdownOpen && searchQuery.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-[#071a12] border-2 border-emerald-500 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto animate-fadeIn">
            
            {/* 1. UNIVERSAL @ SERIAL MATCHES (Posts, Businesses, Shops, Users, Professionals) */}
            {universalMatches.length > 0 && (
              <div className="border-b border-emerald-200 dark:border-emerald-800">
                <div className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[11px] font-black flex items-center justify-between shadow-xs">
                  <span className="flex items-center gap-1.5">
                    <AtSign className="w-4 h-4" />
                    <span>{getLangText('අංක ගැලපීම් (@ Serial Matches)', '@ Serial Matches', '@ எண் பொருத்தங்கள்')} ({universalMatches.length}):</span>
                  </span>
                  <span className="text-[10px] bg-slate-950 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                    {searchQuery.startsWith('@') ? searchQuery : `@${searchQuery}`}
                  </span>
                </div>

                <div className="divide-y divide-emerald-100 dark:divide-emerald-900/40">
                  {universalMatches.slice(0, 8).map((match, mIdx) => {
                    const IconComp = getEntityIcon(match.entityType);
                    return (
                      <button
                        key={`univ_match_${match.entityType}_${match.serialNumber}_${mIdx}`}
                        type="button"
                        onClick={() => {
                          if (onSelectEntityMatch) {
                            onSelectEntityMatch(match);
                          } else {
                            onSearchQueryChange(match.atTag);
                          }
                          setIsDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-emerald-50 dark:hover:bg-[#0e3524] transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                            <IconComp className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700">
                                {match.atTag}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {match.entityTypeNameSi}
                              </span>
                            </div>

                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                              {match.title}
                            </p>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {match.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-black group-hover:translate-x-1 transition-transform">
                          <span className="hidden sm:inline">{getLangText('විවෘත කරන්න', 'Open', 'திற')}</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. MATCHING TAGS (Keywords) */}
            {!isAtQuery && (
              <>
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
                ) : universalMatches.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {getLangText(
                      `"${searchQuery}" සඳහා සෘජු Tag එකක් හෝ @ අංකයක් හමුනොවිණි. දැන්වීම් විස්තර අතර සෙවීම ක්‍රියාත්මකයි.`,
                      `No direct tag or @ serial found for "${searchQuery}". Searching within content.`,
                      `"${searchQuery}" க்கான குறிச்சொல் அல்லது @ எண் இல்லை. பதிவுகளின் விவரங்களில் தேடப்படுகிறது.`
                    )}
                  </div>
                ) : null}
              </>
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
