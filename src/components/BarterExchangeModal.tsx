import React, { useState, useEffect } from 'react';
import { 
  BarterItem, 
  BarterProposal, 
  BarterCondition, 
  User, 
  Language,
  LocationOption
} from '../types';
import { 
  BARTER_CATEGORIES, 
  getStoredBarterItems, 
  saveBarterItemsToStorage, 
  getStoredBarterProposals, 
  saveBarterProposalsToStorage, 
  findSmartBarterMatches, 
  getBarterConditionLabel,
  BarterMatchResult
} from '../data/barterExchangeData';
import { compressImageFile } from '../utils/imageCompressor';
import { extractNumericId, getUserCreditBalance, deductPostingFee } from '../utils/creditManager';
import { 
  Repeat, 
  Sparkles, 
  PlusCircle, 
  Inbox, 
  Search, 
  Filter, 
  Camera, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  MessageSquare, 
  Tag, 
  MapPin, 
  Calendar, 
  Layers, 
  ArrowRightLeft, 
  Send, 
  Check, 
  Ban, 
  RefreshCw,
  Coins,
  ShieldCheck,
  Package,
  Award,
  Share2
} from 'lucide-react';

interface BarterExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  currentUser?: User;
  currentLocation?: LocationOption;
  language?: Language;
  onOpenQrPayForBarter?: (recipient: { userId: string; name: string; phone?: string; fixedAmount?: number }) => void;
}

export const BarterExchangeModal: React.FC<BarterExchangeModalProps> = ({
  isOpen,
  onClose,
  user: propUser,
  currentUser,
  currentLocation,
  language = 'si',
  onOpenQrPayForBarter,
}) => {
  const user = (currentUser || propUser)!;
  const [activeTab, setActiveTab] = useState<'browse' | 'smart_match' | 'create' | 'my_swaps'>('browse');

  // Listings & Proposals Data
  const [items, setItems] = useState<BarterItem[]>(() => getStoredBarterItems());
  const [proposals, setProposals] = useState<BarterProposal[]>(() => getStoredBarterProposals());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  // New Listing Form States
  const [offeringTitle, setOfferingTitle] = useState('');
  const [offeringCategory, setOfferingCategory] = useState('general');
  const [offeringDescription, setOfferingDescription] = useState('');
  const [condition, setCondition] = useState<BarterCondition>('good');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [wantedItem, setWantedItem] = useState('');
  const [wantedCategory, setWantedCategory] = useState('general');
  const [wantedDescription, setWantedDescription] = useState('');
  const [userTown, setUserTown] = useState('');
  const [userDistrict, setUserDistrict] = useState(user?.district || 'කොළඹ');

  // Smart Matchmaker States
  const [selectedMyItemForMatch, setSelectedMyItemForMatch] = useState<string>('');
  const [customMatchOffer, setCustomMatchOffer] = useState('');
  const [customMatchOfferCat, setCustomMatchOfferCat] = useState('general');
  const [customMatchWant, setCustomMatchWant] = useState('');
  const [customMatchWantCat, setCustomMatchWantCat] = useState('general');
  const [smartMatchResults, setSmartMatchResults] = useState<BarterMatchResult[]>([]);

  // Propose Swap Modal State
  const [proposingTargetItem, setProposingTargetItem] = useState<BarterItem | null>(null);
  const [selectedMyItemToOffer, setSelectedMyItemToOffer] = useState<string>('custom');
  const [proposalOfferTitle, setProposalOfferTitle] = useState('');
  const [proposalOfferDesc, setProposalOfferDesc] = useState('');
  const [proposalOfferPhotos, setProposalOfferPhotos] = useState<string[]>([]);
  const [proposalNotes, setProposalNotes] = useState('');

  // Notifications & Modals
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync with storage
  useEffect(() => {
    if (isOpen) {
      setItems(getStoredBarterItems());
      setProposals(getStoredBarterProposals());
      setSuccessToast(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Run Smart Matchmaker when inputs change
  useEffect(() => {
    let offer = customMatchOffer;
    let offerCat = customMatchOfferCat;
    let want = customMatchWant;
    let wantCat = customMatchWantCat;

    if (selectedMyItemForMatch) {
      const myItem = (items || []).find(i => i && i.id === selectedMyItemForMatch);
      if (myItem) {
        offer = myItem.offeringTitle;
        offerCat = myItem.offeringCategory;
        want = myItem.wantedItem;
        wantCat = myItem.wantedCategory || 'general';
      }
    }

    if (offer.trim() || want.trim()) {
      const results = findSmartBarterMatches(
        offer,
        offerCat,
        want,
        wantCat,
        user?.id || user?.userId || '',
        items
      );
      setSmartMatchResults(results);
    } else {
      setSmartMatchResults([]);
    }
  }, [selectedMyItemForMatch, customMatchOffer, customMatchOfferCat, customMatchWant, customMatchWantCat, items, user]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Image Upload handler for new listing
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, { maxWidth: 800, quality: 0.75 });
      setPhotos(prev => [...prev, compressed].slice(0, 4));
    } catch {
      setErrorMessage('පින්තූරය ඇතුළත් කිරීමට නොහැකි විය.');
    }
  };

  // Image upload for proposal
  const handleProposalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, { maxWidth: 800, quality: 0.75 });
      setProposalOfferPhotos(prev => [...prev, compressed].slice(0, 2));
    } catch {
      setErrorMessage('පින්තූරය ඇතුළත් කිරීමට නොහැකි විය.');
    }
  };

  // Create Barter Listing
  const handleCreateBarterListing = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!offeringTitle.trim() || !wantedItem.trim()) {
      setErrorMessage('කරුණාකර ඔබ සතු භාණ්ඩය සහ ඒ වෙනුවට අවශ්‍ය භාණ්ඩය යන දෙකම ඇතුළත් කරන්න.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Deduct minimal posting fee (Rs. 25) or free
      const feeResult = deductPostingFee(user, 'exchange', undefined, `භාණ්ඩ හුවමාරු දැන්වීම - ${offeringTitle}`);
      if (!feeResult.success && user.status === 'approved' && !user.isDemo) {
        setErrorMessage(feeResult.error || 'දැන්වීම පළකිරීම සඳහා Wallet ශේෂය ප්‍රමාණවත් නොවේ.');
        setIsSubmitting(false);
        return;
      }

      const newItem: BarterItem = {
        id: `swap_${Date.now()}`,
        barterCode: `#SWAP-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: user?.id || user?.userId || 'usr_me',
        userNumericId: extractNumericId(user?.nicNumber || user?.userId || '000000000'),
        userName: user?.name || 'පරිශීලක',
        userPhone: user?.phone || '',
        userNic: user?.nicNumber,
        userDistrict: userDistrict || user?.district || 'කොළඹ',
        userTown: userTown || user?.district || '',
        offeringTitle: offeringTitle.trim(),
        offeringCategory,
        offeringDescription: offeringDescription.trim(),
        condition,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
        photos: photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1528458900012-985bf317546f?w=600&auto=format&fit=crop&q=80'],
        wantedItem: wantedItem.trim(),
        wantedCategory,
        wantedDescription: wantedDescription.trim(),
        status: 'available',
        proposalsCount: 0,
        createdAt: new Date().toLocaleString('si-LK'),
        createdAtMs: Date.now(),
      };

      const updated = [newItem, ...items];
      setItems(updated);
      saveBarterItemsToStorage(updated);

      // Reset
      setOfferingTitle('');
      setOfferingDescription('');
      setWantedItem('');
      setWantedDescription('');
      setPhotos([]);
      setEstimatedValue('');
      setActiveTab('browse');
      showToast('🎉 ඔබගේ භාණ්ඩ හුවමාරු දැන්වීම සාර්ථකව පළ කරන ලදි!');
    } catch (err: any) {
      setErrorMessage(err.message || 'දැන්වීම පළකිරීමේදී දෝෂයක් සිදුවිය.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Proposal to an existing barter item
  const handleSendProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposingTargetItem) return;

    if (!proposalOfferTitle.trim()) {
      setErrorMessage('කරුණාකර ඔබ හුවමාරු කිරීමට ලබාදෙන භාණ්ඩය නම් කරන්න.');
      return;
    }

    const newProposal: BarterProposal = {
      id: `prop_${Date.now()}`,
      proposalCode: `#PROP-${Math.floor(100 + Math.random() * 900)}`,
      barterItemId: proposingTargetItem.id,
      barterItemTitle: proposingTargetItem.offeringTitle,
      targetUserId: proposingTargetItem.userId,
      proposerUserId: user?.id || user?.userId || 'usr_me',
      proposerName: user?.name || 'පරිශීලක',
      proposerPhone: user?.phone || '',
      proposerDistrict: user?.district || 'කොළඹ',
      offeredItemTitle: proposalOfferTitle.trim(),
      offeredItemCategory: 'general',
      offeredItemDescription: proposalOfferDesc.trim(),
      offeredPhotos: proposalOfferPhotos,
      proposerNotes: proposalNotes.trim(),
      status: 'pending',
      createdAt: new Date().toLocaleString('si-LK'),
      createdAtMs: Date.now(),
    };

    // Update item proposals count
    const updatedItems = items.map(it => {
      if (it.id === proposingTargetItem.id) {
        return { ...it, proposalsCount: (it.proposalsCount || 0) + 1 };
      }
      return it;
    });
    setItems(updatedItems);
    saveBarterItemsToStorage(updatedItems);

    const updatedProps = [newProposal, ...proposals];
    setProposals(updatedProps);
    saveBarterProposalsToStorage(updatedProps);

    setProposingTargetItem(null);
    setProposalOfferTitle('');
    setProposalOfferDesc('');
    setProposalOfferPhotos([]);
    setProposalNotes('');
    showToast(`📩 ${proposingTargetItem.userName} වෙත හුවමාරු යෝජනාව සාර්ථකව යවන ලදි!`);
  };

  // Accept Proposal
  const handleAcceptProposal = (proposal: BarterProposal) => {
    const updated = proposals.map(p => {
      if (p.id === proposal.id) {
        return { ...p, status: 'accepted' as const, respondedAt: new Date().toLocaleString('si-LK') };
      }
      return p;
    });
    setProposals(updated);
    saveBarterProposalsToStorage(updated);

    // Mark item as reserved/completed
    const updatedItems = items.map(it => {
      if (it.id === proposal.barterItemId) {
        return {
          ...it,
          status: 'completed' as const,
          completedWithUserId: proposal.proposerUserId,
          completedAt: new Date().toLocaleString('si-LK'),
        };
      }
      return it;
    });
    setItems(updatedItems);
    saveBarterItemsToStorage(updatedItems);

    showToast('🤝 හුවමාරු යෝජනාව සාර්ථකව පිළිගන්නා ලදි! ඔබට දැන් අනෙක් පාර්ශවය අමතා භාණ්ඩ හුවමාරු කරගත හැක.');
  };

  // Decline Proposal
  const handleDeclineProposal = (proposalId: string) => {
    const updated = proposals.map(p => {
      if (p.id === proposalId) {
        return { ...p, status: 'declined' as const, respondedAt: new Date().toLocaleString('si-LK') };
      }
      return p;
    });
    setProposals(updated);
    saveBarterProposalsToStorage(updated);
    showToast('හුවමාරු යෝජනාව ප්‍රතික්ෂේප කරන ලදි.');
  };

  // Filtered browse items
  const filteredItems = items.filter(it => {
    if (selectedCategory !== 'all' && it.offeringCategory !== selectedCategory) return false;
    if (selectedDistrict !== 'all' && it.userDistrict !== selectedDistrict) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOffer = it.offeringTitle.toLowerCase().includes(q) || it.offeringDescription.toLowerCase().includes(q);
      const matchWant = it.wantedItem.toLowerCase().includes(q) || (it.wantedDescription && it.wantedDescription.toLowerCase().includes(q));
      const matchLoc = it.userDistrict?.toLowerCase().includes(q) || it.userTown?.toLowerCase().includes(q);
      return matchOffer || matchWant || matchLoc;
    }
    return true;
  });

  const myUserId = user?.id || user?.userId || '';
  const myBarterListings = myUserId ? items.filter(it => it && it.userId === myUserId) : [];
  const myReceivedProposals = myUserId ? proposals.filter(p => p && p.targetUserId === myUserId) : [];
  const mySentProposals = myUserId ? proposals.filter(p => p && p.proposerUserId === myUserId) : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-[#07170e] border-2 border-emerald-500/40 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl transition-all relative max-h-[94vh] flex flex-col">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-md shrink-0">
              <ArrowRightLeft className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  භාණ්ඩ හුවමාරු මධ්‍යස්ථානය (Barter & Exchange Hub)
                </h2>
                <span className="bg-amber-400/20 text-amber-200 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Cashless Swaps
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 font-medium">
                මුදල් නොමැතිව අතිරික්ත භාණ්ඩ හුවමාරුව සහ Smart Matchmaking පද්ධතිය
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="වසන්න"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-[#163a25] bg-slate-50 dark:bg-[#040e09] px-3 pt-2 gap-1.5 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'browse'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#07170e] rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>සියලු හුවමාරු ({items.filter(i => i.status === 'available').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('smart_match')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'smart_match'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#07170e] rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>✨ Smart Matchmaking (ගැළපීම්)</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'create'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#07170e] rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>+ නව හුවමාරුවක් එක්කරන්න</span>
          </button>

          <button
            onClick={() => setActiveTab('my_swaps')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer shrink-0 relative ${
              activeTab === 'my_swaps'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#07170e] rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>මගේ හුවමාරු & යෝජනා</span>
            {myReceivedProposals.filter(p => p.status === 'pending').length > 0 && (
              <span className="w-5 h-5 bg-amber-500 text-amber-950 font-black text-[10px] rounded-full flex items-center justify-center animate-bounce">
                {myReceivedProposals.filter(p => p.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-500 text-white text-xs font-black px-4 py-2.5 flex items-center justify-between shadow-md shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="p-1 hover:bg-emerald-600 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          
          {/* ======================================================== */}
          {/* TAB 1: BROWSE ALL BARTER LISTINGS */}
          {/* ======================================================== */}
          {activeTab === 'browse' && (
            <div className="space-y-4">
              
              {/* Search & Category Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ඔබට අවශ්‍ය හෝ සතු භාණ්ඩය, නගරය සොයන්න..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0c2216] border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-[#0c2216] border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
                >
                  {BARTER_CATEGORIES.map(cat => (
                    <option key={cat.key} value={cat.key}>
                      {cat.icon} {cat.nameSi}
                    </option>
                  ))}
                </select>
              </div>

              {/* Listings Grid */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-[#0b1f14] rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-6 space-y-3">
                  <Package className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    කිසිදු හුවමාරු දැන්වීමක් හමුනොවීය.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all"
                  >
                    + ඔබ සතු අතිරික්තයක් පළකරන්න
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredItems.map(item => {
                    const cond = getBarterConditionLabel(item.condition);
                    const isMyItem = Boolean(myUserId && item.userId === myUserId);

                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-[#0a1e13] border-2 border-slate-200 dark:border-emerald-900/60 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative group"
                      >
                        {/* Top Meta */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                              {item.barterCode}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${cond.color}`}>
                              {cond.labelSi}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            {item.userDistrict || 'ශ්‍රී ලංකා'}
                          </span>
                        </div>

                        {/* Middle Content (Offer & Want) */}
                        <div className="space-y-2.5">
                          {/* Offering Box */}
                          <div className="flex gap-3 items-start">
                            {item.photos && item.photos[0] && (
                              <img
                                src={item.photos[0]}
                                alt={item.offeringTitle}
                                className="w-20 h-20 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-400 block">
                                📦 මා සතු අතිරික්තය:
                              </span>
                              <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-tight">
                                {item.offeringTitle}
                              </h4>
                              {item.estimatedValue && (
                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
                                  ඇස්තමේන්තු වටිනාකම: රු. {item.estimatedValue.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Wanted In Exchange Box */}
                          <div className="bg-emerald-50 dark:bg-[#112d1c] border border-emerald-300 dark:border-emerald-800 rounded-2xl p-3 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 dark:text-emerald-200">
                              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>🔄 හුවමාරුවට අවශ්‍ය භාණ්ඩය:</span>
                            </div>
                            <p className="text-xs font-extrabold text-emerald-950 dark:text-white pl-5">
                              {item.wantedItem}
                            </p>
                            {item.wantedDescription && (
                              <p className="text-[11px] text-emerald-800 dark:text-emerald-300/80 pl-5">
                                {item.wantedDescription}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Owner & Action Bottom Bar */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {item.userName.charAt(0)}
                            </div>
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">
                              {item.userName}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.userPhone && (
                              <a
                                href={`https://wa.me/${item.userPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`ආයුබෝවන් ${item.userName}, මම සහය සේවා Barter Hub හි ඔබගේ "${item.offeringTitle}" හුවමාරු දැන්වීම (${item.barterCode}) දුටුවෙමි.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#128C7E] dark:text-[#25D366] transition-all"
                                title="WhatsApp අමතන්න"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </a>
                            )}

                            {!isMyItem ? (
                              <button
                                onClick={() => {
                                  setProposingTargetItem(item);
                                  setProposalOfferTitle('');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>හුවමාරු යෝජනාවක්</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                ඔබගේ දැන්වීමකි
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: SMART MATCHMAKING (ස්මාර්ට් ගැළපීම්) */}
          {/* ======================================================== */}
          {activeTab === 'smart_match' && (
            <div className="space-y-5">
              
              {/* Top Banner explaining Smart Matchmaking */}
              <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-700 rounded-3xl p-4 sm:p-5 text-white shadow-md space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-200 animate-spin" />
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    Smart Barter Matchmaker Engine
                  </h3>
                </div>
                <p className="text-xs text-amber-100 leading-relaxed font-medium">
                  පද්ධතිය ස්වයංක්‍රීයව ඔබ සතු අතිරික්ත භාණ්ඩය සහ අනෙක් සාමාජිකයින් සොයන දේත්, අනෙක් සාමාජිකයින් සතු භාණ්ඩ සහ ඔබට අවශ්‍ය දේත් අතර ද්විපාර්ශ්වික (2-Way Reciprocal) හා තනි ගැළපීම් ක්ෂණිකව ගණනය කරයි.
                </p>
              </div>

              {/* Matchmaker Input Box */}
              <div className="bg-slate-50 dark:bg-[#0a1e13] border border-slate-200 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    🎯 ගැළපීම් සෙවීම සඳහා විස්තර තෝරන්න:
                  </h4>
                  {myBarterListings.length > 0 && (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                      මගේ දැන්වීම් වලින් තෝරන්න ⬇️
                    </span>
                  )}
                </div>

                {myBarterListings.length > 0 && (
                  <div>
                    <select
                      value={selectedMyItemForMatch}
                      onChange={(e) => {
                        setSelectedMyItemForMatch(e.target.value);
                      }}
                      className="w-full px-3 py-2.5 bg-white dark:bg-[#07170e] border-2 border-emerald-500/60 rounded-2xl text-xs font-bold focus:outline-none"
                    >
                      <option value="">-- මගේ දැන්වීමක් තෝරා Smart Match බලන්න --</option>
                      {myBarterListings.map(it => (
                        <option key={it.id} value={it.id}>
                          {it.barterCode} : {it.offeringTitle} ➔ (අවශ්‍ය: {it.wantedItem})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!selectedMyItemForMatch && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                        📦 මා සතු අතිරික්ත භාණ්ඩය (Offering):
                      </label>
                      <input
                        type="text"
                        placeholder="උදා: මහන මැෂිම, පොල් පැළ, බයිසිකලය..."
                        value={customMatchOffer}
                        onChange={(e) => setCustomMatchOffer(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                        🔄 ඒ වෙනුවට මට අවශ්‍ය භාණ්ඩය (Wanted):
                      </label>
                      <input
                        type="text"
                        placeholder="උදා: ස්මාර්ට් දුරකථනයක්, ගෑස් ලිපක්..."
                        value={customMatchWant}
                        onChange={(e) => setCustomMatchWant(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Match Results Display */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>හමුවූ Smart Matches ({smartMatchResults.length})</span>
                  </h4>
                </div>

                {smartMatchResults.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-[#0b1f14] rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs font-bold text-slate-500">
                      ඉහත කොටුව තුළ ඔබ සතු සහ ඔබට අවශ්‍ය දේ ඇතුළත් කළ විට ගැළපෙන ප්‍රජා දැන්වීම් මෙහි දිස්වේ.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {smartMatchResults.map(({ item, matchScore, matchReason, isReciprocal }) => (
                      <div
                        key={item.id}
                        className={`rounded-3xl p-4 border-2 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                          isReciprocal
                            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 dark:from-[#0f2c1c] dark:to-[#173022] border-emerald-500 shadow-md'
                            : 'bg-white dark:bg-[#0a1e13] border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex gap-3 items-start flex-1 min-w-0">
                          {item.photos && item.photos[0] && (
                            <img
                              src={item.photos[0]}
                              alt={item.offeringTitle}
                              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          )}
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                matchScore >= 80 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-amber-950'
                              }`}>
                                ✨ {matchScore}% ගැළපීමක්!
                              </span>
                              {isReciprocal && (
                                <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                  🤝 2-Way Direct Swap Match
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                              {item.offeringTitle}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              🔄 ඔහුට අවශ්‍ය: <strong className="text-emerald-700 dark:text-emerald-400">{item.wantedItem}</strong>
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium">
                              💡 හේතුව: {matchReason}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <button
                            onClick={() => {
                              setProposingTargetItem(item);
                              setProposalOfferTitle(customMatchOffer || offeringTitle || '');
                            }}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>ක්ෂණික හුවමාරු ඉල්ලීමක්</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: CREATE NEW BARTER LISTING */}
          {/* ======================================================== */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateBarterListing} className="space-y-5">
              
              {/* Error Box */}
              {errorMessage && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl p-3 text-xs text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Section 1: What I Offer */}
              <div className="bg-slate-50 dark:bg-[#0a1e13] border border-slate-200 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-sm">
                  <Package className="w-5 h-5" />
                  <span>1. මා සතු අතිරික්ත භාණ්ඩය පිළිබඳ විස්තර (What You Offer):</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      භාණ්ඩයේ නම / මාතෘකාව *
                    </label>
                    <input
                      type="text"
                      placeholder="උදා: Singer විදුලි මහන මැෂිම, බද්ධ පොල් පැළ 20ක්..."
                      value={offeringTitle}
                      onChange={(e) => setOfferingTitle(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        කාණ්ඩය
                      </label>
                      <select
                        value={offeringCategory}
                        onChange={(e) => setOfferingCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                      >
                        {BARTER_CATEGORIES.filter(c => c.key !== 'all').map(c => (
                          <option key={c.key} value={c.key}>{c.icon} {c.nameSi}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        තත්ත්වය (Condition)
                      </label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value as BarterCondition)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                      >
                        <option value="brand_new">නවතම (Brand New)</option>
                        <option value="like_new">අලුත් මෙන් (Like New)</option>
                        <option value="good">හොඳ තත්ත්වයේ (Good)</option>
                        <option value="used">භාවිත කළ (Used)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        ඇස්තමේන්තු වටිනාකම (රු.)
                      </label>
                      <input
                        type="number"
                        placeholder="උදා: 15000"
                        value={estimatedValue}
                        onChange={(e) => setEstimatedValue(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      විස්තරය (Description)
                    </label>
                    <textarea
                      placeholder="භාණ්ඩයේ විශේෂාංග, භාවිත කළ කාලය, ක්‍රියාකාරීත්වය ආදිය..."
                      value={offeringDescription}
                      onChange={(e) => setOfferingDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-2 bg-white dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Photos */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      භාණ්ඩයේ ඡායාරූප (උපරිම 4ක්):
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {photos.map((p, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300">
                          <img src={p} alt="upload" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {photos.length < 4 && (
                        <label className="w-16 h-16 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer transition-all">
                          <Camera className="w-5 h-5" />
                          <span className="text-[9px] font-bold mt-0.5">+ Photo</span>
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: What I Want in Return */}
              <div className="bg-emerald-50/60 dark:bg-[#0d2a1b] border border-emerald-300 dark:border-emerald-800 rounded-3xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-black text-sm">
                  <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                  <span>2. ඒ වෙනුවට මට අවශ්‍ය භාණ්ඩය (What You Want in Exchange):</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      අවශ්‍ය භාණ්ඩයේ නම *
                    </label>
                    <input
                      type="text"
                      placeholder="උදා: ස්මාර්ට් ජංගම දුරකථනයක් හෝ ටැබ් එකක්..."
                      value={wantedItem}
                      onChange={(e) => setWantedItem(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#07170e] border border-emerald-400 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        අවශ්‍ය භාණ්ඩයේ කාණ්ඩය
                      </label>
                      <select
                        value={wantedCategory}
                        onChange={(e) => setWantedCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                      >
                        {BARTER_CATEGORIES.filter(c => c.key !== 'all').map(c => (
                          <option key={c.key} value={c.key}>{c.icon} {c.nameSi}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        ඔබගේ දිස්ත්‍රික්කය
                      </label>
                      <input
                        type="text"
                        value={userDistrict}
                        onChange={(e) => setUserDistrict(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Repeat className="w-4 h-4" />
                    <span>හුවමාරු දැන්වීම පළකරන්න (Publish Barter Listing)</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 4: MY SWAPS & PROPOSALS */}
          {/* ======================================================== */}
          {activeTab === 'my_swaps' && (
            <div className="space-y-6">
              
              {/* Received Proposals Box */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ඔබගේ දැන්වීම් සඳහා ලැබුණු හුවමාරු යෝජනා ({myReceivedProposals.length})
                  </h3>
                </div>

                {myReceivedProposals.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 dark:bg-[#0b1f14] p-4 rounded-2xl">
                    තවමත් කිසිදු හුවමාරු යෝජනාවක් ලැබී නොමැත.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myReceivedProposals.map(prop => (
                      <div
                        key={prop.id}
                        className="bg-white dark:bg-[#0a1e13] border-2 border-emerald-500/40 rounded-3xl p-4 shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-slate-500">
                            {prop.proposalCode} • අදාළ දැන්වීම: <strong>{prop.barterItemTitle}</strong>
                          </span>
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            prop.status === 'accepted'
                              ? 'bg-emerald-500 text-white'
                              : prop.status === 'declined'
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-400 text-amber-950 animate-pulse'
                          }`}>
                            {prop.status === 'accepted' ? 'පිළිගන්නා ලදි' : prop.status === 'declined' ? 'ප්‍රතික්ෂේපිතයි' : 'තීරණය බලාපොරොත්තුවෙන්'}
                          </span>
                        </div>

                        <div className="bg-slate-50 dark:bg-[#0f2a1b] p-3 rounded-2xl space-y-1 text-xs">
                          <p className="font-extrabold text-slate-900 dark:text-white">
                            👤 {prop.proposerName} විසින් ලබාදීමට යෝජනා කරන භාණ්ඩය:
                          </p>
                          <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 pl-4">
                            📦 {prop.offeredItemTitle}
                          </p>
                          {prop.offeredItemDescription && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 pl-4">
                              {prop.offeredItemDescription}
                            </p>
                          )}
                          {prop.proposerNotes && (
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 pl-4 font-medium italic">
                              💬 පණිවිඩය: "{prop.proposerNotes}"
                            </p>
                          )}
                        </div>

                        {/* Actions for proposal */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            {prop.proposerPhone && (
                              <a
                                href={`https://wa.me/${prop.proposerPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-[#25D366] text-slate-950 font-black text-xs flex items-center gap-1"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>{prop.proposerPhone}</span>
                              </a>
                            )}
                          </div>

                          {prop.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeclineProposal(prop.id)}
                                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-700 rounded-xl text-xs font-bold transition-all"
                              >
                                ප්‍රතික්ෂේප කරන්න
                              </button>
                              <button
                                onClick={() => handleAcceptProposal(prop)}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>පිළිගන්න (Accept Swap)</span>
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* My Posted Listings Box */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  මා විසින් පළකළ හුවමාරු දැන්වීම් ({myBarterListings.length})
                </h3>
                {myBarterListings.map(it => (
                  <div key={it.id} className="bg-slate-50 dark:bg-[#0a1e13] p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-400">{it.barterCode}</span>
                      <h4 className="font-black text-slate-900 dark:text-white">{it.offeringTitle}</h4>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">අවශ්‍ය: {it.wantedItem}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      it.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {it.status === 'completed' ? 'හුවමාරුව අවසන්' : 'සක්‍රියයි'}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Propose Swap Modal Popup */}
      {proposingTargetItem && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white dark:bg-[#0a1e13] border-2 border-emerald-500 rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  හුවමාරු යෝජනාවක් යවන්න (Propose Swap)
                </h3>
              </div>
              <button onClick={() => setProposingTargetItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 dark:bg-[#0f2c1c] p-3 rounded-2xl text-xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">ඔබ ඉල්ලුම් කරන භාණ්ඩය:</span>
              <p className="font-black text-slate-900 dark:text-white">{proposingTargetItem.offeringTitle}</p>
              <p className="text-slate-600 dark:text-slate-300">හිමිකරු: {proposingTargetItem.userName} • {proposingTargetItem.userDistrict}</p>
            </div>

            <form onSubmit={handleSendProposal} className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                  ඔබ ඒ වෙනුවට ලබාදෙන භාණ්ඩයේ නම *
                </label>
                <input
                  type="text"
                  placeholder="උදා: Samsung Galaxy Tab A හෝ Mountain Bike..."
                  value={proposalOfferTitle}
                  onChange={(e) => setProposalOfferTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#07170e] border border-emerald-400 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                  භාණ්ඩයේ විස්තරය හා තත්ත්වය:
                </label>
                <textarea
                  placeholder="භාණ්ඩයේ ක්‍රියාකාරීත්වය, විශේෂාංග..."
                  value={proposalOfferDesc}
                  onChange={(e) => setProposalOfferDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                  අමතර පණිවිඩයක් / හමුවිය හැකි වේලාව:
                </label>
                <input
                  type="text"
                  placeholder="උදා: හෙට දින කොළඹදී හමුවී මාරු කරගත හැක..."
                  value={proposalNotes}
                  onChange={(e) => setProposalNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProposingTargetItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-extrabold text-xs"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>යෝජනාව යවන්න</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
