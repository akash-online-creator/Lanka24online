import React, { useState, useEffect } from 'react';
import { User, Language, LocationOption, HelpPost, Theme } from '../types';
import { translations } from '../data/translations';
import { initialLocations, initialHelpPosts } from '../data/initialData';
import { LocationBar } from './LocationBar';
import { GlowingNeedHelpBtn } from './GlowingNeedHelpBtn';
import { PostCard } from './PostCard';
import { HelpPostModal } from './HelpPostModal';
import { OfferSupportModal } from './OfferSupportModal';
import { QuickServiceModal } from './QuickServiceModal';
import { QuickServiceDetailModal } from './QuickServiceDetailModal';
import { QuickServiceChatModal } from './QuickServiceChatModal';
import { QuickServiceConfirmWorkflow } from './QuickServiceConfirmWorkflow';
import { CategorySelectionModal } from './CategorySelectionModal';
import { CategoryGrid } from './CategoryGrid';
import { 
  subscribeToHelpPosts, 
  addHelpPostToFirestore, 
  addReplyToFirestore 
} from '../lib/firebase';
import { 
  ShieldCheck, 
  HelpCircle, 
  Search, 
  Sparkles, 
  MapPin, 
  Globe, 
  PhoneCall, 
  HeartHandshake, 
  Wrench, 
  FileCheck2, 
  MessageCircle,
  Plus,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface UserDashboardProps {
  user: User;
  onNavigateToIssues: () => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  theme?: Theme;
  toggleTheme?: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  onNavigateToIssues,
  language,
  setLanguage,
  theme,
  toggleTheme,
}) => {
  const t = translations[language];

  // Active Location State (Defaults to Kadawatha)
  const [currentLocation, setCurrentLocation] = useState<LocationOption>(() => {
    const saved = localStorage.getItem('sahaya_current_location');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return initialLocations[0]; // Kadawatha
  });

  // Help Posts Feed State (Synced with Firestore Database)
  const [helpPosts, setHelpPosts] = useState<HelpPost[]>(() => {
    const saved = localStorage.getItem('sahaya_help_posts');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return initialHelpPosts;
  });

  // Real-time Firestore subscription
  useEffect(() => {
    const unsubscribe = subscribeToHelpPosts((remotePosts) => {
      if (remotePosts && remotePosts.length > 0) {
        setHelpPosts(remotePosts);
      }
    });
    return () => unsubscribe();
  }, []);

  // Active Feed Tab: 'local' (<15km) vs 'all_sl' (>15km or all)
  const [feedDistanceTab, setFeedDistanceTab] = useState<'local' | 'all_sl'>('local');
  const [boardCategoryFilter, setBoardCategoryFilter] = useState<string>('services');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState<string>('ඉක්මන් සේවා');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
  
  // Detail, Chat and Confirm Modals from PDF plan:
  const [selectedPostForDetail, setSelectedPostForDetail] = useState<HelpPost | null>(null);
  const [selectedPostForChat, setSelectedPostForChat] = useState<HelpPost | null>(null);
  const [selectedPostForConfirm, setSelectedPostForConfirm] = useState<HelpPost | null>(null);
  const [selectedPostToReply, setSelectedPostToReply] = useState<HelpPost | null>(null);

  // Service Request Modal State
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Persist storage
  useEffect(() => {
    localStorage.setItem('sahaya_current_location', JSON.stringify(currentLocation));
  }, [currentLocation]);

  useEffect(() => {
    localStorage.setItem('sahaya_help_posts', JSON.stringify(helpPosts));
  }, [helpPosts]);

  // Recalculate distance from current active location
  const getPostDistance = (post: HelpPost) => {
    if (!post.lat || !post.lng || !currentLocation.lat || !currentLocation.lng) {
      return post.distanceKm || 20;
    }
    const R = 6371; // km
    const dLat = (post.lat - currentLocation.lat) * Math.PI / 180;
    const dLng = (post.lng - currentLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(currentLocation.lat * Math.PI / 180) * Math.cos(post.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d === 0 ? 0.8 : d;
  };

  // Category & Distance Filtering Logic
  const filteredPosts = helpPosts.filter((post) => {
    const dist = getPostDistance(post);
    const matchesDistance = feedDistanceTab === 'local' ? dist <= 15 : true;

    let matchesCategory = true;
    if (boardCategoryFilter) {
      if (boardCategoryFilter === 'by_distance') {
        matchesCategory = dist <= 15;
      } else if (boardCategoryFilter === 'islandwide') {
        matchesCategory = true;
      } else {
        matchesCategory = post.category === boardCategoryFilter;
      }
    }

    const query = searchQuery.toLowerCase();
    const matchesQuery = !query || 
      post.whatHappened.toLowerCase().includes(query) ||
      post.whatIsNeeded.toLowerCase().includes(query) ||
      post.userName.toLowerCase().includes(query) ||
      post.locationName.toLowerCase().includes(query) ||
      post.postCode.toLowerCase().includes(query);

    return matchesDistance && matchesCategory && matchesQuery;
  });

  // Handler for adding new help request post (Step 3.1 & Quick Services)
  const handleCreatePost = async (
    newPostData: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>
  ) => {
    const categoryToSave = newPostData.category || boardCategoryFilter || 'quick_services';
    const postToSave = {
      ...newPostData,
      category: categoryToSave,
    };

    try {
      await addHelpPostToFirestore(postToSave);
    } catch (e) {
      console.error('Failed to add post to Firestore, updating local state as fallback', e);
      const newPost: HelpPost = {
        ...postToSave,
        id: `post_${Date.now()}`,
        postCode: `#HELP-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: 'මීට සුළු මොහොතකට පෙර',
        repliesCount: 0,
        helpersCount: 1,
        replies: [],
      };
      setHelpPosts((prev) => [newPost, ...prev]);
    }
  };

  // Handler for adding reply/offering support
  const handleSendReply = async (
    postId: string,
    responderName: string,
    responderPhone: string,
    message: string
  ) => {
    const targetPost = helpPosts.find((p) => p.id === postId);
    const newReply = {
      id: `rep_${Date.now()}`,
      responderName,
      responderPhone,
      message,
      createdAt: 'මීට සුළු මොහොතකට පෙර',
      whatsappSent: true,
    };

    if (targetPost) {
      try {
        await addReplyToFirestore(postId, newReply, targetPost.replies || []);
      } catch (e) {
        console.error('Failed to save reply to Firestore, updating local state', e);
      }
    }

    setHelpPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            repliesCount: (post.repliesCount || 0) + 1,
            helpersCount: (post.helpersCount || 0) + 1,
            replies: [newReply, ...(post.replies || [])],
          };
        }
        return post;
      })
    );
  };

  const services = [
    {
      id: 'emergency',
      title: t.emergencyService,
      desc: 'හදිසි ආපදා හෝ හදිසි අවස්ථාවලදී සෘජු සහය ලබාගැනීම.',
      icon: PhoneCall,
      color: 'from-red-500 to-rose-600',
      badge: '24/7 Priority',
    },
    {
      id: 'financial',
      title: t.financialService,
      desc: 'සුභසාධන දීමනා, ආධාර සහ සහන සේවා සඳහා ඉල්ලුම් කිරීම.',
      icon: HeartHandshake,
      color: 'from-amber-500 to-orange-600',
      badge: 'Welfare',
    },
    {
      id: 'tech',
      title: t.techSupportService,
      desc: 'පද්ධති භාවිතය, ගිණුම් තාක්ෂණික දෝෂ සඳහා උපකාර.',
      icon: Wrench,
      color: 'from-blue-500 to-cyan-600',
      badge: 'Technical',
    },
    {
      id: 'doc',
      title: t.docVerificationService,
      desc: 'හැඳුනුම්පත් සහ අනෙකුත් ලේඛන පරිපාලක සහතික කිරීම්.',
      icon: FileCheck2,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Verification',
    },
    {
      id: 'chat',
      title: t.directChatService,
      desc: 'සහය සේවා නිලධාරියෙකු සමඟ සෘජුව සංවාදයේ යෙදෙන්න.',
      icon: MessageCircle,
      color: 'from-purple-500 to-indigo-600',
      badge: 'Direct Support',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto py-4 space-y-8 animate-fadeIn">
      
      {/* Node 1 in PDF: උදව් ඉල්ලන්න - ක්ෂණික සේවා (Quick Services Banner Button) */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg">
            <Zap className="w-6 h-6 fill-slate-950" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <span>උදව් ඉල්ලන්න</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                ක්ෂණික සේවා
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              (ක්ෂණික සේවා ක්ලික් කළ පසු ඉක්මන්, උපකාර ලබාගැනීමේ පෝස්ටයක් නිර්මාණය කළ හැක)
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-white" />
          <span>ක්ෂණික සේවා ඉල්ලීම (Quick Request)</span>
        </button>
      </div>

      {/* 1. Welcome User Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-lg bg-slate-800 flex-shrink-0">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-slate-300 text-2xl">
                {user.name.charAt(0)}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>VERIFIED USER</span>
              </span>
              <span className="text-xs font-mono text-cyan-400">ID: {user.userId}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              {t.welcomeUser}, {user.name}!
            </h2>
          </div>
        </div>

        <button
          onClick={onNavigateToIssues}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all font-bold text-xs cursor-pointer shadow-md"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>{t.issuesHelpBtn}</span>
        </button>
      </div>

      {/* 2. Step 2.1: Location Button Component */}
      <LocationBar
        currentLocation={currentLocation}
        availableLocations={initialLocations}
        onSelectLocation={setCurrentLocation}
        lang={language}
      />

      {/* 3. Step 2.2: Central Glowing "I Need Help" Button */}
      <GlowingNeedHelpBtn
        onClick={() => setIsCategoryModalOpen(true)}
        lang={language}
      />

      {/* 4. Bulletin Board Section (උපකාරක දැන්වීම්) with Category Grid */}
      <div className="bg-white/90 dark:bg-[#07130c]/90 border border-slate-200/80 dark:border-[#132a1d] rounded-[2.2rem] p-5 sm:p-7 shadow-xl space-y-5 backdrop-blur-md">
        
        {/* Board Header: Title & LIVE Badge */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {language === 'en' ? 'Help Notices' : language === 'ta' ? 'உதவி அறிவிப்புகள்' : 'උපකාරක දැන්වීම්'}
          </h2>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#dff7eb] dark:bg-[#123120] border border-[#a1ebd0] dark:border-[#1c402b] text-[#00a86b] dark:text-[#00c880] text-xs font-extrabold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-ping" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Top Notice Card Box */}
        <div className="w-full min-h-[50px] rounded-2xl bg-[#faf5ef] dark:bg-[#121c16] border border-[#f5e6d3] dark:border-[#223629] p-3.5 flex items-center justify-between text-xs sm:text-sm text-slate-700 dark:text-[#8ba294]">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="font-medium">
              {language === 'en' 
                ? 'Select a category below to explore or post requests.' 
                : language === 'ta' 
                ? 'வேண்டுகோள்களைக் காண அல்லது இடுகையிட வகையைத் தேர்ந்தெடுக்கவும்.' 
                : 'පහතින් සේවා වර්ගයක් තෝරා දැන්වීම් බලන්න හෝ අලුතින් එක් කරන්න.'}
            </span>
          </div>
        </div>

        {/* Category Grid Component */}
        <CategoryGrid
          selectedCategory={boardCategoryFilter}
          onSelectCategory={(catKey, catTitle) => {
            setBoardCategoryFilter(catKey);
            setSelectedCategoryTitle(catTitle);
            if (catKey === 'by_distance') {
              setFeedDistanceTab('local');
            } else if (catKey === 'islandwide') {
              setFeedDistanceTab('all_sl');
            }
          }}
          language={language}
        />
      </div>

      {/* 5. Step 2.3 & 3.2: Home Feed & Distance Filtering */}
      <div className="space-y-6 pt-2">
        
        {/* Feed Header and Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-xl font-bold text-white">{t.feedTitle}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">{t.feedSub}</p>
          </div>

          {/* Distance Tabs: <15 km vs >15 km (All Sri Lanka) */}
          <div className="flex items-center p-1.5 bg-slate-950 border border-slate-800 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setFeedDistanceTab('local')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                feedDistanceTab === 'local'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{t.tabMyArea}</span>
            </button>

            <button
              onClick={() => setFeedDistanceTab('all_sl')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                feedDistanceTab === 'all_sl'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t.tabAllSriLanka}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="දැන්වීම් සෙවීම (උදා: බයික්, බල්ලා, බෙහෙත්, කඩවත...)"
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-all shadow-inner"
          />
        </div>

        {/* Feed Posts List */}
        {filteredPosts.length === 0 ? (
          <div className="w-full bg-white/80 dark:bg-[#07130c]/80 border border-slate-200/80 dark:border-[#132a1d] rounded-[1.8rem] p-8 text-center space-y-3 shadow-sm">
            <p className="text-sm sm:text-base font-bold text-slate-600 dark:text-[#8ba294]">
              {language === 'en' ? 'No posts published yet' : language === 'ta' ? 'இன்னும் இடுகைகள் எதுவும் வெளியிடப்படவில்லை' : 'තවම පල කළ දැන්වීම් නොමැත'}
            </p>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[#00a86b] hover:bg-[#008f5a] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'en' ? 'Publish Request' : language === 'ta' ? 'கோரிக்கையை வெளியிடு' : 'දැන්වීමක් පල කරන්න'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredPosts.map((post) => (
              <div 
                key={post.id}
                onClick={() => setSelectedPostForDetail(post)}
                className="cursor-pointer"
              >
                <PostCard
                  post={{
                    ...post,
                    distanceKm: getPostDistance(post),
                  }}
                  lang={language}
                  onOfferSupport={(p) => setSelectedPostForDetail(p)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Services Grid Section */}
      <div className="space-y-4 pt-6 border-t border-slate-800">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span>{t.servicesTitle}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((srv) => {
            const Icon = srv.icon;
            return (
              <div
                key={srv.id}
                onClick={() => setSelectedService(srv.title)}
                className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-5 shadow-xl transition-all hover:-translate-y-1 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${srv.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
                      {srv.badge}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white mb-1.5 group-hover:text-emerald-400 transition-colors">
                    {srv.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {srv.desc}
                  </p>
                </div>

                <button className="w-full bg-slate-950 group-hover:bg-emerald-600 text-slate-300 group-hover:text-white font-bold py-2 rounded-xl border border-slate-800 transition-all text-xs flex items-center justify-center gap-2">
                  <span>{t.requestServiceBtn}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODALS implementation matching PDF flow */}
      
      {/* 0. Category Selection Modal (Step 2.1 - 2.2) */}
      <CategorySelectionModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSelectCategory={(catKey, catTitle) => {
          setSelectedCategoryTitle(catTitle);
          setIsCategoryModalOpen(false);
          setIsQuickServiceModalOpen(true);
        }}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* 1. Quick Services Request Form Modal (Node 2) */}
      <QuickServiceModal
        isOpen={isQuickServiceModalOpen}
        onClose={() => setIsQuickServiceModalOpen(false)}
        onSubmitPost={handleCreatePost}
        currentLocation={currentLocation}
        currentUser={user}
        lang={language}
        categoryTitle={selectedCategoryTitle}
      />

      {/* 2. Quick Services Detail Modal (Node 4) */}
      <QuickServiceDetailModal
        post={selectedPostForDetail}
        isOpen={!!selectedPostForDetail}
        onClose={() => setSelectedPostForDetail(null)}
        onOpenChat={(p) => {
          setSelectedPostForDetail(null);
          setSelectedPostForChat(p);
        }}
        onOpenConfirm={(p) => {
          setSelectedPostForDetail(null);
          setSelectedPostForConfirm(p);
        }}
        lang={language}
      />

      {/* 3. Quick Services Chat Modal (Node 5) */}
      <QuickServiceChatModal
        post={selectedPostForChat}
        isOpen={!!selectedPostForChat}
        onClose={() => setSelectedPostForChat(null)}
        currentUser={user}
      />

      {/* 4. Quick Services Confirm Workflow (Node 5) */}
      <QuickServiceConfirmWorkflow
        post={selectedPostForConfirm}
        isOpen={!!selectedPostForConfirm}
        onClose={() => setSelectedPostForConfirm(null)}
        onOpenChat={(p) => {
          setSelectedPostForConfirm(null);
          setSelectedPostForChat(p);
        }}
        currentUser={user}
      />

      {/* Legacy Fallback Support Modal */}
      <OfferSupportModal
        post={selectedPostToReply}
        isOpen={!!selectedPostToReply}
        onClose={() => setSelectedPostToReply(null)}
        onSendReply={handleSendReply}
        lang={language}
      />

      {/* Service Request Dialog Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2">{selectedService}</h3>
            <p className="text-xs text-slate-400 mb-4">
              මෙම සේවාව ලබා ගැනීමට පහත පණිවිඩයක් තබා පරිපාලක වෙත යොමු කරන්න.
            </p>

            {requestSubmitted ? (
              <div className="py-6 text-center text-emerald-400 font-bold text-sm">
                ✅ සේවා ඉල්ලීම සාර්ථකව යොමු කෙරිණි!
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  rows={3}
                  placeholder="ඔබට අවශ්‍ය සහය පිළිබඳ සටහනක් ඇතුළත් කරන්න..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setSelectedService(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                  >
                    {t.cancelBtn}
                  </button>
                  <button
                    onClick={() => {
                      setRequestSubmitted(true);
                      setTimeout(() => {
                        setRequestSubmitted(false);
                        setSelectedService(null);
                      }, 1800);
                    }}
                    className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl"
                  >
                    {t.submitIssueBtn}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

