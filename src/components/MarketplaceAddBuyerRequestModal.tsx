import React, { useState } from 'react';
import { User, TagItem, MarketItem } from '../types';
import { 
  X, 
  Search, 
  Tag, 
  Plus, 
  Calendar, 
  Clock, 
  Check, 
  Sparkles, 
  MessageSquare, 
  ShoppingCart, 
  HelpCircle,
  TrendingUp
} from 'lucide-react';

interface MarketplaceAddBuyerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRequest: (item: MarketItem) => void;
  currentUser: User;
  allTags: TagItem[];
  existingSellerItems?: MarketItem[];
  onAddNewTag?: (tag: TagItem) => void;
}

export const MarketplaceAddBuyerRequestModal: React.FC<MarketplaceAddBuyerRequestModalProps> = ({
  isOpen,
  onClose,
  onAddRequest,
  currentUser,
  allTags,
  existingSellerItems = [],
  onAddNewTag
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [quantity, setQuantity] = useState('');
  const [dateType, setDateType] = useState<'today' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [notes, setNotes] = useState('');
  const [revealContactConsent, setRevealContactConsent] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState(currentUser.phone || '');

  // Live real-time matching of tags as user types
  const queryLower = searchQuery.trim().toLowerCase();
  const matchingTags = allTags.filter((t) =>
    queryLower && ((t?.tagName || '').toLowerCase().includes(queryLower) || queryLower.includes((t?.tagName || '').toLowerCase()))
  );

  // Live matching of existing available seller items
  const matchingSellerItems = existingSellerItems.filter((it) =>
    queryLower && ((it?.title || '').toLowerCase().includes(queryLower) || (it?.tagName || '').toLowerCase().includes(queryLower))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      alert('කරුණාකර ඔබ සොයන්නේ කුමක්දැයි සඳහන් කරන්න.');
      return;
    }

    let finalTagName = selectedTag;
    if (!finalTagName) {
      finalTagName = searchQuery.trim();
      if (onAddNewTag) {
        onAddNewTag({
          id: `tag_${Date.now()}`,
          tagName: finalTagName,
          category: 'ගැණුම්කරුවන්'
        });
      }
    }

    const newRequest: MarketItem = {
      id: `mkt_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'buyer_request',
      title: searchQuery.trim(),
      tagName: finalTagName,
      quantity: quantity.trim() || '1 Unit',
      availableDateType: dateType,
      availableDate: dateType === 'custom' ? customDate : new Date().toISOString().split('T')[0],
      saleTypes: ['retail'],
      hasWarranty: false,
      deliveryOption: 'pickup',
      notes: notes.trim() || undefined,
      userId: currentUser?.userId || currentUser?.id || 'guest',
      userName: currentUser?.name || 'පරිශීලක',
      userPhone: currentUser?.phone || '',
      showWhatsapp,
      whatsappNumber: showWhatsapp ? whatsappNumber.trim() : undefined,
      revealContactConsent,
      locationName: currentUser?.nearestTown || 'කඩවත',
      distanceKm: 0.5,
      createdAt: 'මීට සුළු මොහොතකට පෙර',
      createdAtMs: Date.now()
    };

    onAddRequest(newRequest);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border-2 border-indigo-500/40 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs">
              <ShoppingCart className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                ගැණුම්කරු ඉල්ලීමක් එකතු කරන්න
              </h3>
              <p className="text-xs text-indigo-100 font-medium">
                ඔබට අවශ්‍ය භාණ්ඩය වෙළෙන්දන්ට සහ සැපයුම්කරුවන්ට දන්වන්න
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* 1. ඔබ සොයන්නේ කුමක්ද? + Live Tag Matching */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              * ඔබ සොයන්නේ කුමක්ද? (What are you looking for?) :
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="අකුරක් හෝ වචනයක් ටයිප් කර සොයන්න (උදා: කීරි සම්බා, ජෙනරේටර්)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-zinc-100"
              />
            </div>

            {/* Matching Tags Suggestion Box */}
            {queryLower && (
              <div className="mt-2.5 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl space-y-2 animate-in fade-in duration-200">
                <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    ගැලපෙන Tag පද්ධතිය (Smart Tag Match) :
                  </span>
                  {matchingTags.length === 0 && (
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
                      නව Tag එකක් ලෙස සුරැකේ
                    </span>
                  )}
                </div>

                {matchingTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {matchingTags.map((t, tIdx) => (
                      <button
                        key={`buyer_tag_${t.id || 't'}_${tIdx}`}
                        type="button"
                        onClick={() => {
                          setSelectedTag(t.tagName);
                          setSearchQuery(t.tagName);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedTag === t.tagName
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-zinc-700 hover:bg-indigo-100'
                        }`}
                      >
                        #{t.tagName}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <span>"{searchQuery}" නමින් නව Tag එකක් සාදා ඉල්ලීමට එක්වනු ඇත.</span>
                  </div>
                )}

                {/* Show if any seller already has matching items */}
                {matchingSellerItems.length > 0 && (
                  <div className="pt-2 border-t border-indigo-200/80 dark:border-indigo-900/60">
                    <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      වෙළඳපොළේ දැනට ඇති ගැලපෙන භාණ්ඩ ({matchingSellerItems.length}) :
                    </div>
                    <div className="space-y-1">
                      {matchingSellerItems.slice(0, 2).map((it, itIdx) => (
                        <div
                          key={`seller_item_${it.id || 'it'}_${itIdx}`}
                          className="flex items-center justify-between text-xs bg-white dark:bg-zinc-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700"
                        >
                          <span className="font-bold text-slate-800 dark:text-zinc-200 truncate">
                            {it.title}
                          </span>
                          <span className="font-extrabold text-emerald-600 shrink-0 ml-2">
                            රු. {it.price?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. කොපමණ ප්‍රමාණයක්ද */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              * කොපමණ ප්‍රමාණයක් අවශ්‍යද? (Quantity Required) :
            </label>
            <input
              type="text"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="උදා: 100 kg, 2 Units, 500 Pcs..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-zinc-100"
            />
          </div>

          {/* 3. අවශ්‍ය දිනය */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              * අවශ්‍ය දිනය :
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDateType('today')}
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  dateType === 'today'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>අදම අවශ්‍යයි (Urgent / Today)</span>
              </button>

              <button
                type="button"
                onClick={() => setDateType('custom')}
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  dateType === 'custom'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>දිනයක් ඇතුළත් කරන්න</span>
              </button>
            </div>

            {dateType === 'custom' && (
              <div className="mt-2">
                <input
                  type="date"
                  required
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-zinc-100"
                />
              </div>
            )}
          </div>

          {/* 4. වැඩි විස්තර Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              වැඩි විස්තර ඇතුළත් කිරීමට සටහනක් (Note box) :
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="අවශ්‍ය තත්ත්වය, බලාපොරොත්තු වන මිල පරාසය හෝ වෙනත් අවශ්‍යතා..."
              className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-zinc-100"
            />
          </div>

          {/* 5. Chat Box / WhatsApp & Privacy Consent */}
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                සන්නිවේදනය (Chat Box / WhatsApp) :
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={showWhatsapp}
                  onChange={(e) => setShowWhatsapp(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md cursor-pointer"
                />
                <span>වට්සැප් අංකය පෙන්වන්න</span>
              </label>
            </div>

            {showWhatsapp && (
              <div className="pt-2 border-t border-slate-200 dark:border-zinc-700">
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-zinc-100"
                />
              </div>
            )}

            {/* Privacy protection: Allow phone number to be shown */}
            <div className="pt-2.5 border-t border-slate-200 dark:border-zinc-700">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={revealContactConsent}
                  onChange={(e) => setRevealContactConsent(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-indigo-600 rounded-md cursor-pointer shrink-0"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-zinc-200 block">
                    දුරකථන අංකය ප්‍රසිද්ධියේ පෙන්වීමට අවසර දෙමි (Reveal Phone Number)
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight block mt-0.5">
                    (මෙය සලකුණු නොකළහොත්, දුරකථන අංකය ආරක්ෂිතව තබාගන්නා අතර සැපයුම්කරුවන්ට In-App Chat මඟින් ඔබෙන් අංකය විමසීමට සිදුවේ)
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 6. තහවුරු කිරීමේ බොත්තම */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <Check className="w-5 h-5" />
              <span>ඉල්ලීම තහවුරු කරන්න (Submit Buyer Request)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
