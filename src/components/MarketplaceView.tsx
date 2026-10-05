import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  TagItem, 
  Language, 
  MarketItem, 
  MarketShop, 
  MarketSection, 
  MarketSellerSubTab, 
  MarketLocation 
} from '../types';
import { 
  getStoredMarketItems, 
  saveMarketItemsToStorage, 
  getStoredMarketShops, 
  saveMarketShopsToStorage 
} from '../data/marketplaceData';
import { 
  subscribeToMarketplaceItems, 
  addMarketplaceItemToFirestore, 
  deleteMarketplaceItemFromFirestore,
  deleteMarketplaceShopFromFirestore
} from '../lib/firebase';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { addDeletedMarketplaceId, addDeletedMarketShopId } from '../utils/deletedPostsManager';
import { validate100mGeoFencePermission } from '../utils/geoFenceValidator';
import { getEntitySerialNumber } from '../utils/entitySerialNumberHelper';
import { MarketplaceNewsTicker } from './MarketplaceNewsTicker';
import { MarketplaceAddSellerItemModal } from './MarketplaceAddSellerItemModal';
import { MarketplaceAddBuyerRequestModal } from './MarketplaceAddBuyerRequestModal';
import { MarketplaceAddShopModal } from './MarketplaceAddShopModal';
import { MarketShopPreviewModal } from './MarketShopPreviewModal';
import { MarketplaceLowestPricesModal } from './MarketplaceLowestPricesModal';
import { MarketplaceGuideModal } from './MarketplaceGuideModal';
import { GroupChatMapViewerModal } from './GroupChatMapViewerModal';
import { getVillageOrTownDisplay } from '../utils/geoUtils';
import { findSynonymSuggestionPrompt, getExpandedSearchKeywords } from '../data/searchDictionary';
import { SmartSearchSynonymPrompt } from './SmartSearchSynonymPrompt';
import { DemoRegistrationPromptModal } from './DemoRegistrationPromptModal';
import { 
  Search, 
  Store, 
  Users, 
  Building2, 
  ShoppingCart, 
  Plus, 
  Filter, 
  ArrowLeft, 
  Tag, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  Truck, 
  Package, 
  Eye, 
  Edit3, 
  Trash2, 
  Check, 
  Layers, 
  SlidersHorizontal, 
  Sparkles, 
  Globe, 
  ArrowUpDown, 
  Share2, 
  Clock,
  HelpCircle,
  Lightbulb,
  Lock
} from 'lucide-react';

interface MarketplaceViewProps {
  currentUser: User;
  language: Language;
  allTags: TagItem[];
  currentLocationName?: string;
  onBackToBoard: () => void;
  onAddNewTag?: (tag: TagItem) => void;
  onStartDirectChat?: (targetUserId: string, targetUserName: string, targetPhone: string) => void;
  onRequireRegistration?: () => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  currentUser,
  language,
  allTags,
  currentLocationName = 'කඩවත',
  onBackToBoard,
  onAddNewTag,
  onStartDirectChat,
  onRequireRegistration
}) => {
  // 1. Data States
  const [items, setItems] = useState<MarketItem[]>(() => getStoredMarketItems());
  const [shops, setShops] = useState<MarketShop[]>(() => getStoredMarketShops());

  // 2. Navigation State: 4 main sections
  // 01. Search Bar -> 02. වෙළෙන්දන්, ගැණුම්කරුවන්, අලෙවිසැල්, වියාපාරික ස්ථාන
  const [activeSection, setActiveSection] = useState<MarketSection>('sellers');
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedSynonyms, setDismissedSynonyms] = useState<string[]>([]);

  // Smart Synonym Suggestion Prompt for Marketplace
  const marketplaceSynonymPrompt = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2 || dismissedSynonyms.includes(q)) return null;

    return findSynonymSuggestionPrompt<MarketItem>(
      searchQuery,
      items,
      (it: MarketItem) => `${it.title} ${it.tagName} ${it.userName} ${it.barterNeeds || ''}`
    );
  }, [searchQuery, items, dismissedSynonyms]);

  // 3. Section 1 (වෙළෙන්දන්) Sub-tabs: තොග | සිල්ලර | හුවමාරු | සියල්ල
  const [sellerSubTab, setSellerSubTab] = useState<MarketSellerSubTab>('all');

  // 4. Section 3 (අලෙවිසැල්) State: "මගේ අලෙවිසැල" Filter
  const [myShopsOnly, setMyShopsOnly] = useState(false);

  // 5. Filters
  const [distanceFilterKm, setDistanceFilterKm] = useState<number>(50); // 5km, 10km, 25km, 50km, 100+ km
  const [selectedCategoryTag, setSelectedCategoryTag] = useState<string>('all');
  const [priceSortOrder, setPriceSortOrder] = useState<'default' | 'lowest' | 'highest'>('default');
  const [showFilterBar, setShowFilterBar] = useState(false);

  // 6. Modals
  const [isAddSellerModalOpen, setIsAddSellerModalOpen] = useState(false);
  const [isAddBuyerModalOpen, setIsAddBuyerModalOpen] = useState(false);
  const [isAddShopModalOpen, setIsAddShopModalOpen] = useState(false);
  const [shopModalType, setShopModalType] = useState<'shop' | 'business'>('shop');
  const [editingShop, setEditingShop] = useState<MarketShop | null>(null);

  const [isLowestPricesModalOpen, setIsLowestPricesModalOpen] = useState(false);
  const [selectedLowestPriceItem, setSelectedLowestPriceItem] = useState<MarketItem | null>(null);

  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideModalInitialSection, setGuideModalInitialSection] = useState<MarketSection>('sellers');

  const [previewingShop, setPreviewingShop] = useState<MarketShop | null>(null);
  const [shopToDelete, setShopToDelete] = useState<MarketShop | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MarketItem | null>(null);
  const [showDemoRegisterPrompt, setShowDemoRegisterPrompt] = useState(false);

  const isDemo = Boolean(currentUser?.isDemo);

  const handleGatedAction = (action: () => void) => {
    if (isDemo) {
      setShowDemoRegisterPrompt(true);
      return;
    }
    action();
  };

  const isAdmin = checkIsAdmin(currentUser);

  const canDeleteItem = (item: MarketItem) => {
    if (isAdmin) return true;
    if (!currentUser || currentUser.isDemo) return false;
    if (item.userId && (item.userId === currentUser.userId || item.userId === currentUser.id)) return true;
    if (item.userPhone && currentUser.phone && item.userPhone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '')) return true;
    return false;
  };

  const canDeleteShop = (shop: MarketShop) => {
    if (isAdmin) return true;
    if (!currentUser || currentUser.isDemo) return false;
    if (shop.userId && (shop.userId === currentUser.userId || shop.userId === currentUser.id)) return true;
    if (shop.userPhone && currentUser.phone && shop.userPhone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '')) return true;
    return false;
  };

  // Map Location Viewer Modal
  const [viewingLocation, setViewingLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
    address?: string;
    note?: string;
  } | null>(null);

  // Real-time Firestore sync for marketplace items with fallback to local state
  useEffect(() => {
    const unsubscribe = subscribeToMarketplaceItems((remoteItems) => {
      if (remoteItems && remoteItems.length > 0) {
        setItems(remoteItems);
      }
    });
    return () => unsubscribe();
  }, []);

  // Synchronize to localStorage backup
  useEffect(() => {
    saveMarketItemsToStorage(items);
  }, [items]);

  useEffect(() => {
    saveMarketShopsToStorage(shops);
  }, [shops]);

  const checkContactPermission = (userId?: string, phone?: string, consent?: boolean) => {
    if (currentUser?.role === 'admin') return true;
    const isOwner = Boolean(
      currentUser && (
        (userId && ((currentUser.userId && currentUser.userId === userId) || (currentUser.id && currentUser.id === userId))) ||
        (phone && currentUser.phone && phone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, ''))
      )
    );
    if (isOwner) return true;
    return consent !== false;
  };

  // Handlers for Items
  const handleAddSellerItem = (item: MarketItem) => {
    setItems((prev) => [item, ...prev]);
    addMarketplaceItemToFirestore(item).catch((err) => {
      console.warn('Sync seller item to cloud notice:', err);
    });
  };

  const handleAddBuyerRequest = (req: MarketItem) => {
    setItems((prev) => [req, ...prev]);
    addMarketplaceItemToFirestore(req).catch((err) => {
      console.warn('Sync buyer request to cloud notice:', err);
    });
  };

  // Handlers for Shops / Businesses
  const handleSaveShop = (savedShop: MarketShop) => {
    if (!savedShop || !savedShop.id) return;
    setShops((prev) => {
      const list = prev || [];
      const exists = list.some((s) => s && s.id === savedShop.id);
      if (exists) {
        return list.map((s) => (s && s.id === savedShop.id ? savedShop : s));
      } else {
        return [savedShop, ...list];
      }
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!itemId) return;
    setItems((prev) => {
      const updated = (prev || []).filter((i) => i && i.id !== itemId);
      saveMarketItemsToStorage(updated);
      return updated;
    });
    addDeletedMarketplaceId(itemId);
    deleteMarketplaceItemFromFirestore(itemId).catch((err) => {
      console.warn('Firestore marketplace item delete notice:', err);
    });
    setItemToDelete(null);
  };

  const handleDeleteShop = (shopId: string) => {
    if (!shopId) return;

    const targetShop = shops.find((s) => s && s.id === shopId);
    const uPhone = (currentUser?.phone || currentUser?.whatsappNumber || '').replace(/\D/g, '');
    const sPhone = (targetShop?.userPhone || targetShop?.whatsappNumber || '').replace(/\D/g, '');
    const isRegOwner = Boolean(
      currentUser && targetShop && (
        (currentUser.userId && (targetShop.userId === currentUser.userId || targetShop.userId === currentUser.id)) ||
        (currentUser.id && (targetShop.userId === currentUser.id || targetShop.userId === currentUser.userId)) ||
        (uPhone && sPhone && uPhone === sPhone)
      )
    );

    const geoCheck = validate100mGeoFencePermission(
      targetShop?.location?.lat,
      targetShop?.location?.lng,
      (currentUser as any)?.registrationLat || (currentUser as any)?.lat || 7.1710,
      (currentUser as any)?.registrationLng || (currentUser as any)?.lng || 79.8986,
      isAdmin,
      isRegOwner
    );

    if (!geoCheck.allowed) {
      alert(language === 'en' ? geoCheck.messageEn : language === 'ta' ? geoCheck.messageTa : geoCheck.messageSi);
      setShopToDelete(null);
      return;
    }

    setShops((prev) => {
      const updated = (prev || []).filter((s) => s && s.id !== shopId);
      saveMarketShopsToStorage(updated);
      return updated;
    });
    addDeletedMarketShopId(shopId);
    deleteMarketplaceShopFromFirestore(shopId).catch((err) => {
      console.warn('Firestore marketplace shop delete notice:', err);
    });
    setShopToDelete(null);
  };

  // WhatsApp click handler
  const handleOpenWhatsApp = (phone: string, title: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const internationalPhone = cleanPhone.startsWith('0')
      ? `94${cleanPhone.substring(1)}`
      : cleanPhone;
    const msg = encodeURIComponent(
      `ආයුබෝවන්, මම සහය (Sahaya) වෙළඳපොළ හරහා "${title}" සම්බන්ධයෙන් විමසමි.`
    );
    window.open(`https://wa.me/${internationalPhone}?text=${msg}`, '_blank');
  };

  // Filtered Seller Items
  const filteredSellerItems = useMemo(() => {
    return items
      .filter((item) => item.type === 'seller_item')
      .filter((item) => {
        // Search query with expanded synonym keywords
        if (searchQuery.trim()) {
          const keywords = getExpandedSearchKeywords(searchQuery);
          const itemText = `${item.title || ''} ${item.tagName || ''} ${item.userName || ''} ${item.barterNeeds || ''}`.toLowerCase();
          const matches = keywords.some((kw) => itemText.includes(kw));
          if (!matches) return false;
        }

        // Sub tab: wholesale, retail, exchange
        if (sellerSubTab !== 'all') {
          if (!item.saleTypes || !item.saleTypes.includes(sellerSubTab)) return false;
        }

        // Category Tag
        if (selectedCategoryTag !== 'all') {
          if (item.tagName !== selectedCategoryTag) return false;
        }

        // Distance
        if (item.distanceKm && item.distanceKm > distanceFilterKm) return false;

        return true;
      })
      .sort((a, b) => {
        if (priceSortOrder === 'lowest') {
          return (a.price || 0) - (b.price || 0);
        } else if (priceSortOrder === 'highest') {
          return (b.price || 0) - (a.price || 0);
        }
        return b.createdAtMs - a.createdAtMs;
      });
  }, [items, searchQuery, sellerSubTab, selectedCategoryTag, distanceFilterKm, priceSortOrder]);

  // Filtered Buyer Requests
  const filteredBuyerRequests = useMemo(() => {
    return items
      .filter((item) => item.type === 'buyer_request')
      .filter((item) => {
        if (searchQuery.trim()) {
          const keywords = getExpandedSearchKeywords(searchQuery);
          const itemText = `${item.title || ''} ${item.tagName || ''} ${item.userName || ''}`.toLowerCase();
          const matches = keywords.some((kw) => itemText.includes(kw));
          if (!matches) return false;
        }
        if (selectedCategoryTag !== 'all' && item.tagName !== selectedCategoryTag) return false;
        return true;
      })
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [items, searchQuery, selectedCategoryTag]);

  // Filtered Shops
  const filteredShops = useMemo(() => {
    const curId = currentUser?.id;
    const curUserId = currentUser?.userId;
    return (shops || [])
      .filter((s) => s && s.type === 'shop')
      .filter((s) => {
        if (myShopsOnly) {
          if (!curId && !curUserId) return false;
          if (s.userId !== curId && s.userId !== curUserId) {
            return false;
          }
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = (s.name || '').toLowerCase().includes(q);
          const matchesTag = (s.categoryTag || '').toLowerCase().includes(q);
          const matchesInv = (s.inventory || []).some((inv) => (inv?.name || '').toLowerCase().includes(q));
          if (!matchesName && !matchesTag && !matchesInv) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [shops, myShopsOnly, searchQuery, currentUser]);

  // Filtered Businesses
  const filteredBusinesses = useMemo(() => {
    return (shops || [])
      .filter((s) => s && s.type === 'business')
      .filter((s) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = (s.name || '').toLowerCase().includes(q);
          const matchesTag = (s.categoryTag || '').toLowerCase().includes(q);
          const matchesInv = (s.inventory || []).some((inv) => (inv?.name || '').toLowerCase().includes(q));
          if (!matchesName && !matchesTag && !matchesInv) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [shops, searchQuery]);

  // Current user's saved shops
  const mySavedShops = useMemo(() => {
    const curId = currentUser?.id;
    const curUserId = currentUser?.userId;
    if (!curId && !curUserId) return [];
    return (shops || []).filter(
      (s) => s && s.type === 'shop' && ((curId && s.userId === curId) || (curUserId && s.userId === curUserId))
    );
  }, [shops, currentUser]);

  // Current user's saved businesses
  const mySavedBusinesses = useMemo(() => {
    const curId = currentUser?.id;
    const curUserId = currentUser?.userId;
    if (!curId && !curUserId) return [];
    return (shops || []).filter(
      (s) => s && s.type === 'business' && ((curId && s.userId === curId) || (curUserId && s.userId === curUserId))
    );
  }, [shops, currentUser]);

  return (
    <div className="w-full space-y-4 sm:space-y-5 animate-in fade-in duration-300">
      {/* 00. Top Bar (Back Button + Marketplace Title) */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToBoard}
            className="p-2 sm:p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">සහය පුවරුවට</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-200" />
              <h1 className="text-lg sm:text-2xl font-black tracking-tight">
                සහය වෙළඳපොළ (Marketplace)
              </h1>
            </div>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">
              තොග, සිල්ලර, හුවමාරු භාණ්ඩ, අලෙවිසැල් හා ව්‍යාපාරික සේවා
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Guide & Examples Button in Top Header */}
          <button
            type="button"
            onClick={() => {
              setGuideModalInitialSection(activeSection);
              setIsGuideModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-2 border-2 border-amber-300"
            title="භාවිතා කරන ආකාරය හා උදාහරණ (Guide & Examples)"
          >
            <HelpCircle className="w-4 h-4 text-amber-950 shrink-0 animate-bounce" />
            <span>💡 පිටුව ක්‍රියාත්මක වන ආකාරය (උදාහරණ)</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-2xl backdrop-blur-xs border border-white/20">
            <MapPin className="w-3.5 h-3.5 text-emerald-200" />
            <span>ස්ථානය : {currentLocationName}</span>
          </div>
        </div>
      </div>

      {/* 01. Search Bar at the Top (ඉහළින් Search Bar එකක්) */}
      <div className="relative space-y-2">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="භාණ්ඩ, වෙළෙන්දන්, අලෙවිසැල් හෝ ව්‍යාපාර සොයන්න (Search Marketplace)..."
            className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-zinc-900 border-2 border-emerald-500/40 rounded-2xl text-sm font-semibold text-slate-800 dark:text-zinc-100 placeholder-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-4 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Smart Synonym Suggestion Prompt: "ඔබ සොයන්නේ සහල් නේද? [ඔව්] [නැත]" */}
        {marketplaceSynonymPrompt && (
          <SmartSearchSynonymPrompt
            prompt={marketplaceSynonymPrompt}
            onAcceptSuggestion={(suggested) => setSearchQuery(suggested)}
            onDismiss={() => {
              if (searchQuery.trim()) {
                setDismissedSynonyms((prev) => [...prev, searchQuery.trim().toLowerCase()]);
              }
            }}
          />
        )}
      </div>

      {/* 02. Search bar එකෙන් පසු ප්‍රධාන බොත්තම් හතර:
          1. වෙළෙන්දන් (Vendors / Sellers)
          2. ගැණුම්කරුවන් (Buyers)
          3. අලෙවිසැල් (Shops)
          4. වියාපාරික ස්ථාන (Business Places) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          {
            id: 'sellers' as MarketSection,
            labelSi: 'වෙළෙන්දන්',
            labelEn: 'Sellers',
            icon: Store,
            count: items.filter((i) => i.type === 'seller_item').length,
            color: 'from-emerald-600 to-teal-700'
          },
          {
            id: 'buyers' as MarketSection,
            labelSi: 'ගැණුම්කරුවන්',
            labelEn: 'Buyers',
            icon: ShoppingCart,
            count: items.filter((i) => i.type === 'buyer_request').length,
            color: 'from-indigo-600 to-violet-700'
          },
          {
            id: 'shops' as MarketSection,
            labelSi: 'අලෙවිසැල්',
            labelEn: 'Shops & Stores',
            icon: Store,
            count: shops.filter((s) => s.type === 'shop').length,
            color: 'from-teal-600 to-cyan-700'
          },
          {
            id: 'businesses' as MarketSection,
            labelSi: 'ව්‍යාපාරික ස්ථාන',
            labelEn: 'Business Places',
            icon: Building2,
            count: shops.filter((s) => s.type === 'business').length,
            color: 'from-amber-600 to-orange-700'
          }
        ].map((sec, sIdx) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={`market_sec_${sec.id}_${sIdx}`}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer border-2 shadow-xs active:scale-95 ${
                isActive
                  ? `bg-gradient-to-r ${sec.color} text-white border-white/40 shadow-lg scale-[1.02]`
                  : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200/90 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-1.5 transition-colors ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-black text-xs sm:text-sm leading-tight">
                {sec.labelSi}
              </span>
              <span className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-white/80' : 'text-zinc-400'}`}>
                {sec.count} ක් සක්‍රීයයි
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: වෙළෙන්දන් (Vendors / Sellers) */}
      {/* ========================================================================= */}
      {activeSection === 'sellers' && (
        <div className="space-y-4">
          {/* Section 1 Guide Callout */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-zinc-900 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
              <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black shadow-xs">
                💡
              </span>
              <div>
                <span className="font-extrabold">වෙළෙන්දන් අංශය ක්‍රියාත්මක වන ආකාරය: </span>
                <span className="text-zinc-600 dark:text-zinc-300">තොග, සිල්ලර හා හුවමාරු භාණ්ඩ පළකරමින් අවම මිලට ගැණුම්කරුවන් සොයාගන්න.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setGuideModalInitialSection('sellers');
                setIsGuideModalOpen(true);
              }}
              className="text-xs font-black text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 flex items-center gap-1 cursor-pointer underline shrink-0"
            >
              <span>උදාහරණ සහිත මාර්ගෝපදේශය බලන්න →</span>
            </button>
          </div>

          {/* Sub-menu: තොග | සිල්ලර | නොමිලේ දෙන දෑ | හුවමාරු (Wholesale / Retail / Free Giveaways / Barter Exchange) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-x-auto">
              {[
                { id: 'all' as MarketSellerSubTab, label: '📦 සියල්ල (All)' },
                { id: 'wholesale' as MarketSellerSubTab, label: '🏭 තොග (Wholesale)' },
                { id: 'retail' as MarketSellerSubTab, label: '🛍️ සිල්ලර (Retail)' },
                { id: 'free_giveaway' as MarketSellerSubTab, label: '🎁 නොමිලේ දෙන දෑ (Free Sharing)' },
                { id: 'exchange' as MarketSellerSubTab, label: '🔄 හුවමාරු (Exchange)' }
              ].map((st, stIdx) => (
                <button
                  key={`sub_tab_${st.id}_${stIdx}`}
                  type="button"
                  onClick={() => setSellerSubTab(st.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    sellerSubTab === st.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Action buttons: Guide Button + Add Item Button */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGuideModalInitialSection('sellers');
                  setIsGuideModalOpen(true);
                }}
                className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0 shadow-xs"
                title="වෙළෙන්දන් අංශය භාවිතා කරන ආකාරය හා උදාහරණ"
              >
                <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>භාවිතා කරන ආකාරය</span>
              </button>

              <button
                type="button"
                onClick={() => handleGatedAction(() => setIsAddSellerModalOpen(true))}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>භාණ්ඩයක් එකතු කරන්න (Add Item)</span>
              </button>
            </div>
          </div>

          {/* Animated News Box (අවම මිල පෙන්වන News Box එකක් - අකුරු ඉහළට animation වේ) */}
          <MarketplaceNewsTicker
            items={items}
            onOpenLowestPrices={(it) => {
              setSelectedLowestPriceItem(it || null);
              setIsLowestPricesModalOpen(true);
            }}
            onSelectItem={(selectedIt) => {
              setSearchQuery(selectedIt.title);
            }}
          />

          {/* Filter Bar Button & Controls (Distance, Category, Price) */}
          <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-300">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <span>පෙරහන් (Filters) :</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Distance Filter */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-500 font-bold hidden sm:inline">දුර:</span>
                  <select
                    value={distanceFilterKm}
                    onChange={(e) => setDistanceFilterKm(Number(e.target.value))}
                    className="px-2.5 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value={5}>5 km ඇතුළත</option>
                    <option value={10}>10 km ඇතුළත</option>
                    <option value={25}>25 km ඇතුළත</option>
                    <option value={50}>50 km ඇතුළත</option>
                    <option value={999}>දිවයිනපුරා (All)</option>
                  </select>
                </div>

                {/* Price Sort Order */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-500 font-bold hidden sm:inline">මිල:</span>
                  <select
                    value={priceSortOrder}
                    onChange={(e) => setPriceSortOrder(e.target.value as any)}
                    className="px-2.5 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="default">නවතම පළමුව (Latest)</option>
                    <option value="lowest">අඩුම මිල මුලින් (Lowest Price)</option>
                    <option value="highest">වැඩිම මිල මුලින් (Highest Price)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tag Quick Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategoryTag('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  selectedCategoryTag === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                }`}
              >
                සියලු Tags
              </button>
              {allTags.slice(0, 10).map((t, tIdx) => (
                <button
                  key={`mkt_tag_${t.id || 't'}_${tIdx}`}
                  type="button"
                  onClick={() => setSelectedCategoryTag(t.tagName)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    selectedCategoryTag === t.tagName
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                  }`}
                >
                  #{t.tagName}
                </button>
              ))}
            </div>
          </div>

          {/* Seller Items Feed */}
          {filteredSellerItems.length === 0 ? (
            <div className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 text-center space-y-3 shadow-xs">
              <Package className="w-10 h-10 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">
                ගැලපෙන භාණ්ඩ හමු නොවීය
              </h3>
              <p className="text-xs text-zinc-500">
                පෙරහන් වෙනස් කරන්න හෝ නව භාණ්ඩයක් වෙළඳපොළට එක් කරන්න.
              </p>
              <button
                type="button"
                onClick={() => setIsAddSellerModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                භාණ්ඩයක් එකතු කරන්න
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSellerItems.map((item, itmIdx) => (
                <div
                  key={`seller_item_${item.id || 'itm'}_${itmIdx}`}
                  className="bg-white dark:bg-zinc-900 border-2 border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm hover:border-emerald-500/60 dark:hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3.5"
                >
                  {/* Top Badges & Title */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                          #{item.tagName}
                        </span>
                        {item.saleTypes.map((st) => (
                          <span
                            key={st}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              st === 'wholesale'
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                : st === 'retail'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : st === 'free_giveaway'
                                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-extrabold'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {st === 'wholesale'
                              ? '🏭 තොග'
                              : st === 'retail'
                              ? '🛍️ සිල්ලර'
                              : st === 'free_giveaway'
                              ? '🎁 නොමිලේ (Free)'
                              : '🔄 හුවමාරු'}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {item.createdAt}
                        </span>
                        {canDeleteItem(item) && (
                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title={isAdmin ? "පරිපාලක ලෙස දැන්වීම ඉවත් කරන්න (Admin Delete)" : "දැන්වීම ඉවත් කරන්න (Delete)"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-zinc-100 leading-snug">
                      {item.title}
                    </h3>

                    {/* Price & Quantity Banner */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-zinc-800/80 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">
                          විකුණුම් මිල
                        </div>
                        <div className={`text-base sm:text-lg font-black ${item.saleTypes.includes('free_giveaway') || item.price === 0 ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {item.saleTypes.includes('free_giveaway') || item.price === 0
                            ? '🎁 නොමිලේ (Free Sharing)'
                            : item.price
                            ? `රු. ${item.price.toLocaleString()}`
                            : 'හුවමාරුව සඳහා පමණි'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">
                          ප්‍රමාණය
                        </div>
                        <div className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-zinc-200">
                          {item.quantity}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Attributes: Barter, Warranty, Expiry, Delivery */}
                  <div className="space-y-2 text-xs">
                    {/* Barter Needs */}
                    {item.barterNeeds && (
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-900 dark:text-amber-200">
                        <span className="font-bold">🔄 හුවමාරුවට අවශ්‍ය : </span>
                        <span>{item.barterNeeds}</span>
                        {item.barterQuantity && (
                          <span className="font-bold ml-1">({item.barterQuantity})</span>
                        )}
                      </div>
                    )}

                    {/* Warranty & Expiry */}
                    <div className="flex flex-wrap gap-2">
                      {item.hasWarranty && item.warrantyPeriod && (
                        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl font-bold">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.warrantyPeriod}</span>
                        </div>
                      )}

                      {item.expiryDate && (
                        <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl font-bold">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>කල් ඉකුත්වීම: {item.expiryDate}</span>
                        </div>
                      )}
                    </div>

                    {/* Delivery / Pickup method */}
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 pt-1">
                      <div className="flex items-center gap-1 font-semibold">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {item.deliveryOption === 'pickup'
                            ? 'පැමිණ රැගෙන යන්න (Self Pickup)'
                            : item.deliveryOption === 'seller_deliver'
                            ? 'විකුණුම්කරු ගෙනවිත් දෙනු ඇත'
                            : item.deliveryOption === 'free_shipping'
                            ? 'නොමිලේ ප්‍රවාහනය (Free Delivery)'
                            : 'ඩිලිවරි ගාස්තු අයවේ'}
                        </span>
                      </div>

                      {item.pickupLocation && (
                        <button
                          type="button"
                          onClick={() => handleGatedAction(() => setViewingLocation(item.pickupLocation!))}
                          className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>Map බලන්න</span>
                        </button>
                      )}
                    </div>

                    {/* Notes */}
                    {item.notes && (
                      <p className="text-zinc-600 dark:text-zinc-400 italic bg-slate-50 dark:bg-zinc-800/40 p-2 rounded-xl">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  {/* Seller Info & Contact Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 truncate">
                        {item.userName}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {getVillageOrTownDisplay(item.locationName)} • දුර ~{item.distanceKm || 1.2} km
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDemo ? (
                        <button
                          type="button"
                          onClick={() => setShowDemoRegisterPrompt(true)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-black hover:bg-emerald-100 cursor-pointer active:scale-95 transition-all shadow-xs"
                          title="වැඩි විස්තර සහ සබඳතා බැලීමට ලියාපදිංචි වන්න"
                        >
                          <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>🔒 විස්තර බලන්න</span>
                        </button>
                      ) : checkContactPermission(item.userId, item.userPhone, item.revealContactConsent) ? (
                        <>
                          {item.showWhatsapp && item.whatsappNumber && (
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(item.whatsappNumber!, item.title)}
                              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                              title="WhatsApp පණිවිඩයක් එවන්න"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                          )}

                          {item.userPhone && (
                            <a
                              href={`tel:${item.userPhone}`}
                              className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                              title="ඇමතුමක් ගන්න"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Call</span>
                            </a>
                          )}
                        </>
                      ) : (
                        <div
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold"
                          title="දැන්වීම්කරු දුරකථන අංකය ප්‍රදර්ශනය කිරීම අක්‍රිය කර ඇත"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>🔒 ආරක්ෂිතයි</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: ගැණුම්කරුවන් (Buyers) */}
      {/* ========================================================================= */}
      {activeSection === 'buyers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-zinc-200">
                ගැණුම්කරුවන්ගේ ඉල්ලීම් (Buyer Requests)
              </h2>
              <p className="text-xs text-zinc-500">
                පාරිභෝගිකයින් සොයන භාණ්ඩ සපයා අලෙවිය සිදුකරන්න
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGuideModalInitialSection('buyers');
                  setIsGuideModalOpen(true);
                }}
                className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0 shadow-xs"
                title="ගැණුම්කරුවන් අංශය භාවිතා කරන ආකාරය හා උදාහරණ"
              >
                <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>භාවිතා කරන ආකාරය</span>
              </button>

              <button
                type="button"
                onClick={() => handleGatedAction(() => setIsAddBuyerModalOpen(true))}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>ඉල්ලීමක් එකතු කරන්න</span>
              </button>
            </div>
          </div>

          {/* Section 2 Guide Callout */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/5 dark:from-indigo-950/40 dark:via-violet-950/30 dark:to-zinc-900 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
              <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-black shadow-xs">
                💡
              </span>
              <div>
                <span className="font-extrabold">ගැණුම්කරුවන් අංශය ක්‍රියාත්මක වන ආකාරය: </span>
                <span className="text-zinc-600 dark:text-zinc-300">ඔබට අවශ්‍ය ඕනෑම භාණ්ඩයක් ඉල්ලුම් කර අවට වෙළෙන්දන්ගෙන් මිල ගණන් ලබාගන්න.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setGuideModalInitialSection('buyers');
                setIsGuideModalOpen(true);
              }}
              className="text-xs font-black text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 flex items-center gap-1 cursor-pointer underline shrink-0"
            >
              <span>උදාහරණ සහිත මාර්ගෝපදේශය බලන්න →</span>
            </button>
          </div>

          {/* Buyer Requests Cards */}
          {filteredBuyerRequests.length === 0 ? (
            <div className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 text-center space-y-3 shadow-xs">
              <ShoppingCart className="w-10 h-10 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">
                ගැණුම්කරු ඉල්ලීම් හමු නොවීය
              </h3>
              <p className="text-xs text-zinc-500">
                ඔබට අවශ්‍ය භාණ්ඩයක් ඇත්නම් ඉල්ලීමක් පළකර සැපයුම්කරුවන් සම්බන්ධ කරගන්න.
              </p>
              <button
                type="button"
                onClick={() => setIsAddBuyerModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ඉල්ලීමක් එකතු කරන්න
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredBuyerRequests.map((req, rIdx) => (
                <div
                  key={`buyer_req_${req.id || 'r'}_${rIdx}`}
                  className="bg-white dark:bg-zinc-900 border-2 border-indigo-500/20 rounded-3xl p-4 sm:p-5 shadow-sm hover:border-indigo-500/60 transition-all flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60">
                        #{req.tagName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {req.createdAt}
                        </span>
                        {canDeleteItem(req) && (
                          <button
                            type="button"
                            onClick={() => setItemToDelete(req)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title={isAdmin ? "පරිපාලක ලෙස ඉල්ලීම ඉවත් කරන්න (Admin Delete)" : "ඉල්ලීම ඉවත් කරන්න (Delete)"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wide">
                      අවශ්‍ය භාණ්ඩය :
                    </div>
                    <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-zinc-100 leading-snug">
                      {req.title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl">
                      <div>
                        <span className="text-zinc-400 font-bold">අවශ්‍ය ප්‍රමාණය: </span>
                        <span className="font-extrabold text-slate-800 dark:text-zinc-200">
                          {req.quantity}
                        </span>
                      </div>
                      <div className="border-l border-slate-200 dark:border-zinc-700 pl-3">
                        <span className="text-zinc-400 font-bold">දිනය: </span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                          {req.availableDateType === 'today' ? 'අදම අවශ්‍යයි' : req.availableDate}
                        </span>
                      </div>
                    </div>

                    {req.notes && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-indigo-50/40 dark:bg-indigo-950/20 p-2 rounded-xl italic">
                        "{req.notes}"
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 truncate">
                        {req.userName}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {getVillageOrTownDisplay(req.locationName)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDemo ? (
                        <button
                          type="button"
                          onClick={() => setShowDemoRegisterPrompt(true)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs font-black hover:bg-indigo-100 cursor-pointer active:scale-95 transition-all shadow-xs"
                          title="වැඩි විස්තර සහ සබඳතා බැලීමට ලියාපදිංචි වන්න"
                        >
                          <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>🔒 විස්තර බලන්න</span>
                        </button>
                      ) : checkContactPermission(req.userId, req.userPhone, req.revealContactConsent) ? (
                        <>
                          {req.showWhatsapp && req.whatsappNumber && (
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(req.whatsappNumber!, req.title)}
                              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                              title="WhatsApp පණිවිඩයක් එවන්න"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                          )}

                          {req.userPhone && (
                            <a
                              href={`tel:${req.userPhone}`}
                              className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                              title="ඇමතුමක් ගන්න"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Call</span>
                            </a>
                          )}
                        </>
                      ) : (
                        <div
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold"
                          title="දැන්වීම්කරු දුරකථන අංකය ප්‍රදර්ශනය කිරීම අක්‍රිය කර ඇත"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>🔒 ආරක්ෂිතයි</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: අලෙවිසැල් (Shops / Stores) */}
      {/* ========================================================================= */}
      {activeSection === 'shops' && (
        <div className="space-y-4">
          {/* Top Actions: "මගේ අලෙවිසැල" Filter + "අලුත් අලෙවිසැලක් එකතු කරන්න" */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => setMyShopsOnly(!myShopsOnly)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold border-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                myShopsOnly
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                  : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>මගේ අලෙවිසැල ({mySavedShops.length})</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGuideModalInitialSection('shops');
                  setIsGuideModalOpen(true);
                }}
                className="px-3.5 py-2.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0 shadow-xs"
                title="අලෙවිසැල් අංශය භාවිතා කරන ආකාරය හා උදාහරණ"
              >
                <HelpCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>භාවිතා කරන ආකාරය</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleGatedAction(() => {
                    setEditingShop(null);
                    setShopModalType('shop');
                    setIsAddShopModalOpen(true);
                  });
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>අලුත් අලෙවිසැලක් එකතු කරන්න</span>
              </button>
            </div>
          </div>

          {/* Section 3 Guide Callout */}
          <div className="p-3.5 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/5 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-zinc-900 border border-teal-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 text-xs text-teal-900 dark:text-teal-200">
              <span className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 font-black shadow-xs">
                💡
              </span>
              <div>
                <span className="font-extrabold">අලෙවිසැල් අංශය ක්‍රියාත්මක වන ආකාරය: </span>
                <span className="text-zinc-600 dark:text-zinc-300">ඔබගේ භෞතික හෝ Online සාප්පුවේ භාණ්ඩ නාමාවලියක් සකසා පාරිභෝගිකයින්ට පෙන්වන්න.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setGuideModalInitialSection('shops');
                setIsGuideModalOpen(true);
              }}
              className="text-xs font-black text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 flex items-center gap-1 cursor-pointer underline shrink-0"
            >
              <span>උදාහරණ සහිත මාර්ගෝපදේශය බලන්න →</span>
            </button>
          </div>

          {/* කලින් ඇතුළත් කළ අලෙවිසැල් (Saved Shops with Preview | Edit | Delete) */}
          {mySavedShops.length > 0 && (
            <div className="bg-teal-50/60 dark:bg-teal-950/20 border-2 border-teal-500/30 rounded-3xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-teal-900 dark:text-teal-200">
                <Store className="w-4 h-4 text-teal-600" />
                <span>ඔබ ඇතුළත් කළ අලෙවිසැල් (Your Registered Shops) :</span>
              </div>

              <div className="space-y-2">
                {mySavedShops.map((shop, sIdx) => (
                  <div
                    key={`my_shop_${shop.id || 's'}_${sIdx}`}
                    className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-teal-200/80 dark:border-teal-900/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-zinc-100 truncate">
                          {shop.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                          {shop.mode === 'online' ? 'Online' : 'Shop'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        #{shop.categoryTag} • භාණ්ඩ {shop.inventory.length} ක්
                      </div>
                    </div>

                    {/* 3 Buttons: Preview | Edit | Delete */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setPreviewingShop(shop)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-600" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingShop(shop);
                          setShopModalType('shop');
                          setIsAddShopModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-teal-200 dark:border-teal-800"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShopToDelete(shop)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-rose-200 dark:border-rose-900"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Public Shops Directory */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-teal-600" />
              සියලු අලෙවිසැල් නාමාවලිය ({filteredShops.length}) :
            </h3>

            {filteredShops.length === 0 ? (
              <div className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 text-center space-y-3 shadow-xs">
                <Store className="w-10 h-10 text-zinc-400 mx-auto" />
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">
                  අලෙවිසැල් හමු නොවීය
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredShops.map((shop, sIdx) => (
                  <div
                    key={`shop_${shop.id || 's'}_${sIdx}`}
                    className="bg-white dark:bg-zinc-900 border-2 border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm hover:border-teal-500/60 transition-all flex flex-col justify-between space-y-3.5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/60">
                          {shop.mode === 'online' ? '🌐 Online Shop' : '🏪 Physical Store'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-black text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded-md border border-teal-300 dark:border-teal-800">
                            @{getEntitySerialNumber(shop, 'shop')}
                          </span>
                          <span className="text-[11px] font-bold text-zinc-400">
                            #{shop.categoryTag}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-zinc-100 leading-snug">
                        {shop.name}
                      </h3>

                      {shop.location && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">{getVillageOrTownDisplay(shop.location.name)}</span>
                        </div>
                      )}

                      {/* Items Preview */}
                      <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl space-y-1">
                        <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                          ප්‍රධාන භාණ්ඩ ({shop.inventory.length}) :
                        </div>
                        <div className="space-y-1">
                          {shop.inventory.slice(0, 2).map((inv, invIdx) => (
                            <div
                              key={`shop_inv_${shop.id}_${inv.id || 'i'}_${invIdx}`}
                              className="flex items-center justify-between text-xs font-semibold"
                            >
                              <span className="truncate text-slate-800 dark:text-zinc-200">
                                • {inv.name}
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 ml-2">
                                රු. {inv.price.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleGatedAction(() => setPreviewingShop(shop))}
                          className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-teal-200 dark:border-teal-900"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>විස්තර (Preview)</span>
                        </button>
                        {canDeleteShop(shop) && (
                          <button
                            type="button"
                            onClick={() => setShopToDelete(shop)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-200 dark:border-rose-900"
                            title={isAdmin ? "පරිපාලක ලෙස වෙළඳසැල ඉවත් කරන්න (Admin Delete)" : "වෙළඳසැල ඉවත් කරන්න (Delete)"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isDemo ? (
                          <button
                            type="button"
                            onClick={() => setShowDemoRegisterPrompt(true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-black hover:bg-teal-100 cursor-pointer active:scale-95 transition-all shadow-xs"
                            title="වැඩි විස්තර සහ සබඳතා බැලීමට ලියාපදිංචි වන්න"
                          >
                            <Lock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>🔒 විස්තර බලන්න</span>
                          </button>
                        ) : checkContactPermission(shop.userId, shop.userPhone, shop.revealContactConsent) ? (
                          <>
                            {shop.showWhatsapp && shop.whatsappNumber && (
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsApp(shop.whatsappNumber!, shop.name)}
                                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                title="WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {shop.userPhone && (
                              <a
                                href={`tel:${shop.userPhone}`}
                                className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                title="Call"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </>
                        ) : (
                          <div
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold"
                            title="දුරකථන අංකය ආරක්ෂිතයි"
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>🔒 ආරක්ෂිතයි</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: ව්‍යාපාරික ස්ථාන (Business Places) */}
      {/* ========================================================================= */}
      {activeSection === 'businesses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-zinc-200">
                ව්‍යාපාරික ස්ථාන සහ සේවා මධ්‍යස්ථාන (Business Places)
              </h2>
              <p className="text-xs text-zinc-500">
                ගරාජ්, සේවා මධ්‍යස්ථාන, කර්මාන්තශාලා හා ව්‍යාපාරික ආයතන
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGuideModalInitialSection('businesses');
                  setIsGuideModalOpen(true);
                }}
                className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0 shadow-xs"
                title="ව්‍යාපාරික ස්ථාන අංශය භාවිතා කරන ආකාරය හා උදාහරණ"
              >
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>භාවිතා කරන ආකාරය</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleGatedAction(() => {
                    setEditingShop(null);
                    setShopModalType('business');
                    setIsAddShopModalOpen(true);
                  });
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>නව ව්‍යාපාරයක් එකතු කරන්න</span>
              </button>
            </div>
          </div>

          {/* Section 4 Guide Callout */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-zinc-900 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <span className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 font-black shadow-xs">
                💡
              </span>
              <div>
                <span className="font-extrabold">ව්‍යාපාරික ස්ථාන අංශය ක්‍රියාත්මක වන ආකාරය: </span>
                <span className="text-zinc-600 dark:text-zinc-300">සේවා මධ්‍යස්ථාන, ගරාජ්, උපකාරක පන්ති හා කර්මාන්තශාලා ලියාපදිංචි කර සේවා ගාස්තු පෙන්වන්න.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setGuideModalInitialSection('businesses');
                setIsGuideModalOpen(true);
              }}
              className="text-xs font-black text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 flex items-center gap-1 cursor-pointer underline shrink-0"
            >
              <span>උදාහරණ සහිත මාර්ගෝපදේශය බලන්න →</span>
            </button>
          </div>

          {/* Saved Businesses with Preview | Edit | Delete */}
          {mySavedBusinesses.length > 0 && (
            <div className="bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-500/30 rounded-3xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-200">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>ඔබ ඇතුළත් කළ ව්‍යාපාරික ස්ථාන (Your Registered Businesses) :</span>
              </div>

              <div className="space-y-2">
                {mySavedBusinesses.map((biz, bIdx) => (
                  <div
                    key={`my_biz_${biz.id || 'b'}_${bIdx}`}
                    className="p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-zinc-100 truncate">
                        {biz.name}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        #{biz.categoryTag} • සේවා {biz.inventory.length} ක්
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setPreviewingShop(biz)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-600" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingShop(biz);
                          setShopModalType('business');
                          setIsAddShopModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-amber-200 dark:border-amber-800"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShopToDelete(biz)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-rose-200 dark:border-rose-900"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Businesses Directory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredBusinesses.map((biz, bIdx) => (
              <div
                key={`biz_${biz.id || 'b'}_${bIdx}`}
                className="bg-white dark:bg-zinc-900 border-2 border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm hover:border-amber-500/60 transition-all flex flex-col justify-between space-y-3.5"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                      🏢 Business Place
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                        @{getEntitySerialNumber(biz, 'business')}
                      </span>
                      <span className="text-[11px] font-bold text-zinc-400">
                        #{biz.categoryTag}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-zinc-100 leading-snug">
                    {biz.name}
                  </h3>

                  {biz.location && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{getVillageOrTownDisplay(biz.location.name)}</span>
                    </div>
                  )}

                  <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                      සේවාවන් හා නිෂ්පාදන ({biz.inventory.length}) :
                    </div>
                    <div className="space-y-1">
                      {biz.inventory.slice(0, 2).map((inv, invIdx) => (
                        <div
                          key={`biz_inv_${biz.id}_${inv.id || 'i'}_${invIdx}`}
                          className="flex items-center justify-between text-xs font-semibold"
                        >
                          <span className="truncate text-slate-800 dark:text-zinc-200">
                            • {inv.name}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 ml-2">
                            රු. {inv.price.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewingShop(biz)}
                      className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-amber-200 dark:border-amber-900"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>විස්තර (Preview)</span>
                    </button>
                    {canDeleteShop(biz) && (
                      <button
                        type="button"
                        onClick={() => setShopToDelete(biz)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-200 dark:border-rose-900"
                        title={isAdmin ? "පරිපාලක ලෙස ව්‍යාපාරය ඉවත් කරන්න (Admin Delete)" : "ව්‍යාපාරය ඉවත් කරන්න (Delete)"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {checkContactPermission(biz.userId, biz.userPhone, biz.revealContactConsent) ? (
                      <>
                        {biz.showWhatsapp && biz.whatsappNumber && (
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(biz.whatsappNumber!, biz.name)}
                            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                            title="WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {biz.userPhone && (
                          <a
                            href={`tel:${biz.userPhone}`}
                            className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                            title="Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </>
                    ) : (
                      <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold"
                        title="දුරකථන අංකය ආරක්ෂිතයි"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>🔒 ආරක්ෂිතයි</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Add Seller Item Modal */}
      <MarketplaceAddSellerItemModal
        isOpen={isAddSellerModalOpen}
        onClose={() => setIsAddSellerModalOpen(false)}
        onAddItem={handleAddSellerItem}
        currentUser={currentUser}
        allTags={allTags}
        onAddNewTag={onAddNewTag}
      />

      {/* 2. Add Buyer Request Modal */}
      <MarketplaceAddBuyerRequestModal
        isOpen={isAddBuyerModalOpen}
        onClose={() => setIsAddBuyerModalOpen(false)}
        onAddRequest={handleAddBuyerRequest}
        currentUser={currentUser}
        allTags={allTags}
        existingSellerItems={items}
        onAddNewTag={onAddNewTag}
      />

      {/* 3. Add / Edit Shop & Business Modal */}
      <MarketplaceAddShopModal
        isOpen={isAddShopModalOpen}
        onClose={() => {
          setIsAddShopModalOpen(false);
          setEditingShop(null);
        }}
        onSaveShop={handleSaveShop}
        currentUser={currentUser}
        allTags={allTags}
        editShop={editingShop}
        defaultType={shopModalType}
      />

      {/* 4. Shop / Business Preview Modal */}
      <MarketShopPreviewModal
        isOpen={!!previewingShop}
        onClose={() => setPreviewingShop(null)}
        shop={previewingShop}
        currentUser={currentUser}
      />

      {/* 5. Delete Shop Confirmation Modal */}
      {shopToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border-2 border-rose-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-zinc-100">
              ස්ථිර ලෙසම ඉවත් කරනවාද?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              "{shopToDelete.name}" {shopToDelete.type === 'shop' ? 'වෙළඳසැල' : 'ව්‍යාපාරය'} වෙළඳපොළ පද්ධතියෙන් ස්ථිරවම ඉවත් කරනු ලැබේ.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShopToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                අවලංගු කරන්න (Cancel)
              </button>
              <button
                type="button"
                onClick={() => handleDeleteShop(shopToDelete.id)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md shadow-rose-600/20"
              >
                ඔව්, ඉවත් කරන්න (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.5 Delete Marketplace Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border-2 border-rose-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-zinc-100">
              දැන්වීම ස්ථිර ලෙසම ඉවත් කරනවාද?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              "{itemToDelete.title}" {itemToDelete.type === 'seller_item' ? 'විකුණුම් දැන්වීම' : 'ගැණුම්කරු ඉල්ලීම'} පද්ධතියෙන් ස්ථිරවම ඉවත් කරනු ඇත.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                අවලංගු කරන්න (Cancel)
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(itemToDelete.id)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md shadow-rose-600/20"
              >
                ඔව්, ඉවත් කරන්න (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Map Viewer Modal */}
      {viewingLocation && (
        <GroupChatMapViewerModal
          isOpen={!!viewingLocation}
          onClose={() => setViewingLocation(null)}
          location={{
            name: viewingLocation.name,
            address: viewingLocation.address,
            lat: viewingLocation.lat,
            lng: viewingLocation.lng,
            note: viewingLocation.note
          }}
        />
      )}

      {/* 7. Lowest Prices & Price Comparison Modal */}
      <MarketplaceLowestPricesModal
        isOpen={isLowestPricesModalOpen}
        onClose={() => {
          setIsLowestPricesModalOpen(false);
          setSelectedLowestPriceItem(null);
        }}
        items={items}
        initialSelectedItem={selectedLowestPriceItem}
        onOpenMap={(loc) => setViewingLocation(loc)}
      />

      {/* 8. Marketplace Section-by-Section User Guide & Examples Modal */}
      <MarketplaceGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        initialSection={guideModalInitialSection}
        onNavigateSection={(sec) => setActiveSection(sec)}
      />

      {/* 9. Demo Registration Gate Modal */}
      <DemoRegistrationPromptModal
        isOpen={showDemoRegisterPrompt}
        onClose={() => setShowDemoRegisterPrompt(false)}
        language={language}
        onRegister={() => {
          setShowDemoRegisterPrompt(false);
          if (onRequireRegistration) {
            onRequireRegistration();
          }
        }}
      />
    </div>
  );
};
