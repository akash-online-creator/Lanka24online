import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Phone, 
  MapPin, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  MessageCircle, 
  Tag 
} from 'lucide-react';
import { QueryDocumentSnapshot } from 'firebase/firestore';

// Types
import { HelpPost } from '../types';

// Services
import { fetchHelpPostsPaginated } from '../services/firebase';

interface PaginatedHelpPostListProps {
  onSelectPost?: (post: HelpPost) => void;
  newlyCreatedPost?: HelpPost | null; // අලුතින් පළ කළ දැන්වීමක් ඉහළටම එක් කිරීම සඳහා
}

export const PaginatedHelpPostList: React.FC<PaginatedHelpPostListProps> = ({
  onSelectPost,
  newlyCreatedPost,
}) => {
  const [posts, setPosts] = useState<HelpPost[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Infinite Scroll Trigger Target
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // 1. ආරම්භයේදී අලුත්ම දැන්වීම් 4 ලබා ගැනීම (Newest First)
  const loadInitialPosts = async () => {
    setIsLoadingInitial(true);
    setError(null);
    try {
      const result = await fetchHelpPostsPaginated(null, 4);
      setPosts(result.posts as HelpPost[]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error fetching initial posts:', err);
      setError('දැන්වීම් පූරණය කිරීමේදී දෝෂයක් ඇති විය. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setIsLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadInitialPosts();
  }, []);

  // 2. අලුතින් යම් දැන්වීමක් සාදන ලද්දේ නම් එය ස්වයංක්‍රීයව ලැයිස්තුවේ ඉහළටම එක් කිරීම
  useEffect(() => {
    if (newlyCreatedPost) {
      setPosts(prev => {
        const exists = prev.some(p => p.id === newlyCreatedPost.id);
        if (exists) return prev;
        return [newlyCreatedPost, ...prev];
      });
    }
  }, [newlyCreatedPost]);

  // 3. පහළට scroll කරන විට ඊළඟ දැන්වීම් 4 ලබා ගැනීම
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore || !lastDoc) return;

    setIsLoadingMore(true);
    try {
      const result = await fetchHelpPostsPaginated(lastDoc, 4);
      setPosts(prev => {
        // අනුපිටපත් (duplicates) වැළැක්වීම
        const existingIds = new Set(prev.map(p => p.id));
        const newUniquePosts = (result.posts as HelpPost[]).filter(p => !existingIds.has(p.id));
        return [...prev, ...newUniquePosts];
      });
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error loading more posts:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, lastDoc]);

  // 4. IntersectionObserver මගින් Scroll පහළට පැමිණි විට ස්වයංක්‍රීයව Load කිරීම
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoadingInitial) {
          loadMorePosts();
        }
      },
      { threshold: 0.2 }
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [loadMorePosts, hasMore, isLoadingMore, isLoadingInitial]);

  // 5. සෙවුම් පෙරහන (Client Filter)
  const filteredPosts = posts.filter(post => {
    const q = searchQuery.toLowerCase();
    return (
      (post.title || '').toLowerCase().includes(q) ||
      (post.description || '').toLowerCase().includes(q) ||
      (post.locationName || '').toLowerCase().includes(q) ||
      (post.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
      
      {/* 🔍 සෙවුම් තීරුව (Search Bar) */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="දැන්වීම් මාතෘකාව, ප්‍රදේශය හෝ කාණ්ඩය අනුව සොයන්න..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* ⏳ මුල් පූරණය (Initial Loading State) */}
      {isLoadingInitial && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">නවතම දැන්වීම් පූරණය වෙමින් පවතී...</p>
        </div>
      )}

      {/* ⚠️ දෝෂ තත්ත්වය (Error State) */}
      {error && !isLoadingInitial && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadInitialPosts}
            className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700"
          >
            නැවත උත්සාහ කරන්න
          </button>
        </div>
      )}

      {/* 📋 දැන්වීම් කාඩ්පත් ලැයිස්තුව (Post Cards Grid) */}
      {!isLoadingInitial && filteredPosts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <p className="text-slate-500 text-sm">දැනට දැන්වීම් කිසිවක් හමු නොවීය.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map(post => (
            <div
              key={post.id}
              onClick={() => onSelectPost && onSelectPost(post)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Header: Urgency & Category */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    post.urgency === 'urgent' || post.urgency === 'high'
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                      : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  }`}>
                    {post.urgency === 'urgent' ? '🚨 හදිසි' : 'සාමාන්‍ය'}
                  </span>

                  {post.category && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Tag className="w-3 h-3" /> {post.category}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">
                  {post.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                  {post.description}
                </p>
              </div>

              {/* Footer: Location, Date & Contact */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 truncate max-w-[180px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {post.locationName || 'ස්ථානය සඳහන් කර නැත'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.createdAt ? new Date(post.createdAt).toLocaleDateString('si-LK') : 'අද'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {post.phone && (
                    <a
                      href={`tel:${post.phone}`}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-blue-100"
                    >
                      <Phone className="w-3.5 h-3.5" /> අමතන්න
                    </a>
                  )}
                  {post.whatsapp && (
                    <a
                      href={`https://wa.me/${post.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-100"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🎯 Infinite Scroll Trigger (Sentinel Element) */}
      <div ref={observerTarget} className="py-6 flex flex-col items-center justify-center">
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>තවත් දැන්වීම් 4ක් පූරණය වෙමින් පවතී...</span>
          </div>
        )}

        {!hasMore && posts.length > 0 && !isLoadingInitial && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-4 py-2 rounded-full">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>සියලුම දැන්වීම් පූරණය විය (All posts loaded)</span>
          </div>
        )}
      </div>

    </div>
  );
};

export default PaginatedHelpPostList;
