import React, { useState, useMemo } from 'react';
import { MarketItem } from '../types';
import { 
  X, 
  Flame, 
  TrendingDown, 
  ArrowLeft, 
  Store, 
  Phone, 
  MessageSquare, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  Truck, 
  Sparkles, 
  Tag, 
  ChevronRight, 
  CheckCircle2, 
  Layers,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react';

interface MarketplaceLowestPricesModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MarketItem[];
  initialSelectedItem?: MarketItem | null;
  onOpenMap?: (loc: { lat: number; lng: number; name: string; address?: string; note?: string }) => void;
}

export const MarketplaceLowestPricesModal: React.FC<MarketplaceLowestPricesModalProps> = ({
  isOpen,
  onClose,
  items,
  initialSelectedItem = null,
  onOpenMap
}) => {
  // Selected item / category for "වැඩි විස්තර" view
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  // Set initial selected item when opened if provided
  React.useEffect(() => {
    if (initialSelectedItem) {
      setSelectedGroupKey(initialSelectedItem.tagName || initialSelectedItem.title);
    } else {
      setSelectedGroupKey(null);
    }
  }, [initialSelectedItem, isOpen]);

  // Group all priced seller items by product name / tag and calculate lowest price, highest price, price gap, and percentage savings
  const groupedLowestPriceItems = useMemo(() => {
    const sellerItems = items.filter(
      (it) => it.type === 'seller_item' && typeof it.price === 'number' && it.price > 0
    );

    // Grouping map
    const groups: {
      [key: string]: {
        groupKey: string;
        title: string;
        tagName: string;
        tagCategory: string;
        lowestPrice: number;
        highestPrice: number;
        priceGap: number;
        savingsPercent: number;
        lowestPriceItem: MarketItem;
        highestPriceItem: MarketItem;
        allSellersCount: number;
        sellers: MarketItem[];
      };
    } = {};

    sellerItems.forEach((item) => {
      // Group by canonical product title or tag
      const key = (item.title || item.tagName || '').trim().toLowerCase();
      if (!key) return;
      if (!groups[key]) {
        groups[key] = {
          groupKey: key,
          title: item.title || item.tagName || '',
          tagName: item.tagName || '',
          tagCategory: item.tagCategory || '',
          lowestPrice: item.price!,
          highestPrice: item.price!,
          priceGap: 0,
          savingsPercent: 0,
          lowestPriceItem: item,
          highestPriceItem: item,
          allSellersCount: 1,
          sellers: [item]
        };
      } else {
        groups[key].allSellersCount += 1;
        groups[key].sellers.push(item);
        if (item.price! < groups[key].lowestPrice) {
          groups[key].lowestPrice = item.price!;
          groups[key].lowestPriceItem = item;
        }
        if (item.price! > groups[key].highestPrice) {
          groups[key].highestPrice = item.price!;
          groups[key].highestPriceItem = item;
        }
      }
    });

    // Calculate priceGap and savingsPercent for all groups
    Object.values(groups).forEach((g) => {
      g.priceGap = Math.max(0, g.highestPrice - g.lowestPrice);
      g.savingsPercent = g.highestPrice > 0 ? Math.round((g.priceGap / g.highestPrice) * 100) : 0;
    });

    return Object.values(groups).sort((a, b) => a.lowestPrice - b.lowestPrice);
  }, [items]);

  // If a group is selected for "වැඩි විස්තර", get all its items sorted from lowest to highest price
  const selectedGroupDetails = useMemo(() => {
    if (!selectedGroupKey) return null;
    const cleanKey = selectedGroupKey.trim().toLowerCase();

    // Find in grouped items by groupKey or tagName
    const match = groupedLowestPriceItems.find(
      (g) =>
        (g.groupKey && g.groupKey.toLowerCase() === cleanKey) ||
        (g.title && g.title.toLowerCase().includes(cleanKey)) ||
        (g.tagName && g.tagName.toLowerCase() === cleanKey)
    );

    if (match) {
      // Return sellers sorted from lowest price to highest price
      const sortedSellers = [...match.sellers].sort(
        (a, b) => (a.price || 0) - (b.price || 0)
      );
      const lowestP = sortedSellers[0]?.price || match.lowestPrice;
      const highestP = sortedSellers[sortedSellers.length - 1]?.price || match.highestPrice;
      const gap = Math.max(0, highestP - lowestP);
      const savingsPct = highestP > 0 ? Math.round((gap / highestP) * 100) : 0;

      return {
        title: match.title,
        tagName: match.tagName,
        sellers: sortedSellers,
        lowestPrice: lowestP,
        highestPrice: highestP,
        priceGap: gap,
        savingsPercent: savingsPct,
      };
    }

    // Fallback: search all seller items matching the key
    const matchingItems = items
      .filter(
        (it) =>
          it.type === 'seller_item' &&
          typeof it.price === 'number' &&
          (((it.title || '').toLowerCase().includes(cleanKey)) ||
            ((it.tagName || '').toLowerCase() === cleanKey))
      )
      .sort((a, b) => (a.price || 0) - (b.price || 0));

    if (matchingItems.length > 0) {
      const lowestP = matchingItems[0].price || 0;
      const highestP = matchingItems[matchingItems.length - 1]?.price || lowestP;
      const gap = Math.max(0, highestP - lowestP);
      const savingsPct = highestP > 0 ? Math.round((gap / highestP) * 100) : 0;

      return {
        title: matchingItems[0].title,
        tagName: matchingItems[0].tagName,
        sellers: matchingItems,
        lowestPrice: lowestP,
        highestPrice: highestP,
        priceGap: gap,
        savingsPercent: savingsPct,
      };
    }

    return null;
  }, [selectedGroupKey, groupedLowestPriceItems, items]);

  const handleOpenWhatsApp = (phone: string, title: string, vendorName: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const internationalPhone = cleanPhone.startsWith('0')
      ? `94${cleanPhone.substring(1)}`
      : cleanPhone;
    const msg = encodeURIComponent(
      `ආයුබෝවන් ${vendorName}, මම සහය (Sahaya) වෙළඳපොළේ ඔබගේ "${title}" දැන්වීම සම්බන්ධයෙන් විමසමි.`
    );
    window.open(`https://wa.me/${internationalPhone}?text=${msg}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border-2 border-emerald-500/40 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-amber-600 via-emerald-700 to-teal-800 text-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md shrink-0">
              <Flame className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-amber-950 uppercase tracking-wider">
                  අවම විකුණුම් මිල ගනුදෙනු
                </span>
                <span className="text-xs text-emerald-100 font-bold hidden sm:inline">
                  (Lowest Price Deals)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black leading-snug">
                {selectedGroupDetails
                  ? `${selectedGroupDetails.title} - වෙළෙන්දන්ගේ මිල ගණන්`
                  : 'වෙළඳපොළේ අවම මිලැති භාණ්ඩ ලැයිස්තුව'}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 dark:text-zinc-100">
          {/* ========================================================================= */}
          {/* VIEW 1: LOWEST PRICES OVERVIEW LIST (භාණ්ඩයේ නම, අවම මිල සහ වැඩි විස්තර) */}
          {/* ========================================================================= */}
          {!selectedGroupDetails ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>වෙළඳපොළේ සක්‍රීය භාණ්ඩ වර්ග {groupedLowestPriceItems.length} ක අවම මිල ගණන්</span>
                </div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  අඩුම මිලේ සිට ඉහළට
                </span>
              </div>

              {groupedLowestPriceItems.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-sm">
                  මිල ගණන් සහිත භාණ්ඩ කිසිවක් හමු නොවීය.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {groupedLowestPriceItems.map((group) => (
                    <div
                      key={group.groupKey}
                      className="p-3.5 sm:p-4 bg-slate-50 dark:bg-zinc-800/70 hover:bg-white dark:hover:bg-zinc-800 rounded-2xl border-2 border-slate-200/80 dark:border-zinc-700/80 hover:border-emerald-500/50 transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      {/* Left: Product Name, Category & Price Gap Badge */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            #{group.tagName}
                          </span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            වෙළෙන්දන් {group.allSellersCount} ක්
                          </span>
                          {group.priceGap > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                              <span>මිල පරතරය: රු. {group.priceGap.toLocaleString()}</span>
                              <span className="bg-amber-500 text-white text-[9px] px-1 rounded-sm font-bold">-{group.savingsPercent}% ලාභයක්</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                              තනි මිල ගණනක්
                            </span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-zinc-100">
                          {group.title}
                        </h3>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>
                            ලබාගත හැකි ප්‍රමාණය: <span className="font-bold text-slate-700 dark:text-zinc-300">{group.lowestPriceItem.quantity}</span>
                          </span>
                          {group.highestPrice > group.lowestPrice && (
                            <span className="text-slate-600 dark:text-zinc-400">
                              මිල පරාසය: <span className="line-through text-zinc-400">රු. {group.highestPrice.toLocaleString()}</span> සිට <span className="font-black text-emerald-600 dark:text-emerald-400">රු. {group.lowestPrice.toLocaleString()}</span> දක්වා
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Lowest Price & "වැඩි විස්තර" (More Details) Button */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-zinc-700">
                        <div className="text-left sm:text-right">
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-extrabold uppercase">
                            අවම විකුණුම් මිල
                          </div>
                          <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                            රු. {group.lowestPrice.toLocaleString()}
                          </div>
                        </div>

                        {/* Explicit "වැඩි විස්තර" button in front of every price */}
                        <button
                          type="button"
                          onClick={() => setSelectedGroupKey(group.groupKey)}
                          className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 shrink-0"
                        >
                          <span>වැඩි විස්තර</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW 2: DETAILS SORTED FROM LOWEST TO HIGHEST PRICE WITH VENDOR NAMES     */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Back Button & Header */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedGroupKey(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>සියලු අවම මිලැති භාණ්ඩ වෙත (Back)</span>
                </button>

                <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>අවම මිලේ සිට ඉහළට ({selectedGroupDetails.sellers.length} Vendors)</span>
                </div>
              </div>

              {/* Product Title Banner */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">
                    තෝරාගත් භාණ්ඩ වර්ගය
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-zinc-100">
                    {selectedGroupDetails.title}
                  </h3>
                  {selectedGroupDetails.priceGap > 0 && (
                    <div className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                      උපරිම සහ අවම අතර මිල පරතරය: රු. {selectedGroupDetails.priceGap.toLocaleString()} (-{selectedGroupDetails.savingsPercent}% ඉතිරියක්)
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                    ආරම්භක අවම මිල
                  </div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    රු. {selectedGroupDetails.lowestPrice.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Vendors List Sorted From Lowest Price to Highest Price */}
              <div className="space-y-3">
                {selectedGroupDetails.sellers.map((seller, index) => {
                  const isLowestPrice = index === 0;

                  return (
                    <div
                      key={seller.id}
                      className={`p-4 rounded-2xl border-2 transition-all shadow-xs space-y-3 ${
                        isLowestPrice
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500/80 shadow-md'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      {/* Top Row: Rank Badge + Vendor Name + Price */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              isLowestPrice
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                            }`}
                          >
                            {index + 1}
                          </span>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-400 font-bold">වෙළෙන්දා :</span>
                              <span className="text-sm font-black text-slate-900 dark:text-zinc-100">
                                {seller.userName}
                              </span>
                              {isLowestPrice && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  අවම මිල
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-600" />
                              <span>{seller.locationName} • ~{seller.distanceKm || 1.2} km</span>
                            </div>
                          </div>
                        </div>

                        {/* Price & Quantity */}
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                            රු. {seller.price?.toLocaleString()}
                          </div>
                          {!isLowestPrice && typeof seller.price === 'number' && (
                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              +රු. {(seller.price - selectedGroupDetails.lowestPrice).toLocaleString()} වැඩිපුර
                            </div>
                          )}
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-bold">
                            ප්‍රමාණය: {seller.quantity}
                          </div>
                        </div>
                      </div>

                      {/* Middle Attributes: Sale Types, Warranty, Delivery */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl">
                        <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-semibold">
                          <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>ආකාරය: </span>
                          <span className="font-bold">
                            {seller.saleTypes.map((t) => (t === 'wholesale' ? 'තොග' : t === 'retail' ? 'සිල්ලර' : 'හුවමාරු')).join(', ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-semibold">
                          <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>ලබාදීම: </span>
                          <span className="font-bold">
                            {seller.deliveryOption === 'pickup'
                              ? 'පැමිණ රැගෙන යන්න'
                              : seller.deliveryOption === 'seller_deliver'
                              ? 'ගෙනවිත් දෙනු ඇත'
                              : seller.deliveryOption === 'free_shipping'
                              ? 'නොමිලේ ප්‍රවාහනය'
                              : 'ඩිලිවරි ගාස්තු අයවේ'}
                          </span>
                        </div>

                        {seller.hasWarranty && seller.warrantyPeriod && (
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>{seller.warrantyPeriod}</span>
                          </div>
                        )}

                        {seller.expiryDate && (
                          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>කල් ඉකුත්වීම: {seller.expiryDate}</span>
                          </div>
                        )}
                      </div>

                      {seller.notes && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                          "{seller.notes}"
                        </p>
                      )}

                      {/* Bottom Action Buttons: WhatsApp, Call, Map */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                        <div>
                          {seller.pickupLocation && onOpenMap && (
                            <button
                              type="button"
                              onClick={() => onOpenMap(seller.pickupLocation!)}
                              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>ස්ථානය බලන්න</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {seller.showWhatsapp && seller.whatsappNumber && (
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(seller.whatsappNumber!, seller.title, seller.userName)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          )}

                          {seller.userPhone && (
                            <a
                              href={`tel:${seller.userPhone}`}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
