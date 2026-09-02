import React, { useState } from 'react';
import { 
  User, 
  TagItem, 
  MarketItem, 
  MarketItemSaleType, 
  MarketDeliveryOption,
  MarketLocation 
} from '../types';
import { GroupChatMapPickerModal } from './GroupChatMapPickerModal';
import { 
  X, 
  Plus, 
  Tag, 
  Calendar, 
  Clock, 
  Check, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  MessageSquare, 
  Sparkles, 
  Truck, 
  Package, 
  RefreshCw, 
  Layers, 
  DollarSign, 
  HelpCircle 
} from 'lucide-react';

interface MarketplaceAddSellerItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: MarketItem) => void;
  currentUser: User;
  allTags: TagItem[];
  onAddNewTag?: (tag: TagItem) => void;
}

export const MarketplaceAddSellerItemModal: React.FC<MarketplaceAddSellerItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  currentUser,
  allTags,
  onAddNewTag
}) => {
  if (!isOpen) return null;

  // Form State
  const [title, setTitle] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [price, setPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState('');
  
  // Available Date
  const [availableDateType, setAvailableDateType] = useState<'today' | 'custom'>('today');
  const [customAvailableDate, setCustomAvailableDate] = useState('');

  // Sale Types (Wholesale, Retail, Exchange - Multi-selection)
  const [saleTypes, setSaleTypes] = useState<MarketItemSaleType[]>(['retail']);

  // Barter / Exchange fields
  const [barterNeeds, setBarterNeeds] = useState('');
  const [barterQuantity, setBarterQuantity] = useState('');

  // Warranty
  const [hasWarranty, setHasWarranty] = useState(false);
  const [warrantyPeriod, setWarrantyPeriod] = useState('');

  // Expiry
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryNote, setExpiryNote] = useState('');

  // Delivery / Pickup
  const [deliveryOption, setDeliveryOption] = useState<MarketDeliveryOption>('pickup');
  const [pickupLocation, setPickupLocation] = useState<MarketLocation | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  // Notes
  const [notes, setNotes] = useState('');

  // WhatsApp
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState(currentUser.phone || '');

  // Tag matching logic as user types title
  const matchingTags = allTags.filter((t) =>
    title.trim() && (t.tagName.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(t.tagName.toLowerCase()))
  );

  const toggleSaleType = (type: MarketItemSaleType) => {
    setSaleTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('කරුණාකර භාණ්ඩයේ නම ඇතුළත් කරන්න.');
      return;
    }

    if (saleTypes.length === 0) {
      alert('කරුණාකර විකුණුම් ආකාරය (තොග / සිල්ලර / හුවමාරු) තෝරන්න.');
      return;
    }

    if (saleTypes.includes('exchange') && !barterNeeds.trim()) {
      alert('හුවමාරු සඳහා අවශ්‍ය භාණ්ඩය හා ප්‍රමාණය සඳහන් කරන්න.');
      return;
    }

    // Determine final tag
    let finalTagName = selectedTag;
    if (showCustomTagInput && customTagInput.trim()) {
      finalTagName = customTagInput.trim();
      if (onAddNewTag) {
        onAddNewTag({
          id: `tag_${Date.now()}`,
          tagName: finalTagName,
          category: 'වෙළඳපොල'
        });
      }
    } else if (!finalTagName && title.trim()) {
      finalTagName = title.trim();
    }

    const newItem: MarketItem = {
      id: `mkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'seller_item',
      title: title.trim(),
      tagName: finalTagName || 'වෙළඳපොල',
      price: typeof price === 'number' ? price : undefined,
      quantity: quantity.trim() || '1 Unit',
      availableDateType,
      availableDate: availableDateType === 'custom' ? customAvailableDate : new Date().toISOString().split('T')[0],
      saleTypes,
      barterNeeds: saleTypes.includes('exchange') ? barterNeeds.trim() : undefined,
      barterQuantity: saleTypes.includes('exchange') ? barterQuantity.trim() : undefined,
      hasWarranty,
      warrantyPeriod: hasWarranty ? warrantyPeriod.trim() : undefined,
      expiryDate: hasExpiry ? expiryDate : undefined,
      expiryNote: hasExpiry ? expiryNote.trim() : undefined,
      deliveryOption,
      pickupLocation: deliveryOption === 'pickup' ? pickupLocation || undefined : undefined,
      notes: notes.trim() || undefined,
      userId: currentUser.userId || currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      showWhatsapp,
      whatsappNumber: showWhatsapp ? whatsappNumber.trim() : undefined,
      locationName: pickupLocation?.name || currentUser.nearestTown || 'කඩවත',
      distanceKm: 0.8,
      lat: pickupLocation?.lat || 6.9984,
      lng: pickupLocation?.lng || 79.9542,
      createdAt: 'මීට සුළු මොහොතකට පෙර',
      createdAtMs: Date.now()
    };

    onAddItem(newItem);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 border-2 border-emerald-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs">
                <Package className="w-5 h-5 text-emerald-100" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                  වෙළෙන්දන් සඳහා භාණ්ඩයක් එකතු කරන්න
                </h3>
                <p className="text-xs text-emerald-100 font-medium">
                  තොග, සිල්ලර හෝ හුවමාරු භාණ්ඩයක් වෙළඳපොළට එක් කරන්න
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
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* 1. භාණ්ඩයේ නම */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                * භාණ්ඩයේ නම සඳහන් කරන්න :
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="උදා: නැවුම් කීරි සම්බා සහල්, Hybrid Solar Inverter..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100"
              />
            </div>

            {/* 2. Tag System */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>* නමට අදාළ Tag එක එකතු කරන්න :</span>
                <button
                  type="button"
                  onClick={() => setShowCustomTagInput(!showCustomTagInput)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {showCustomTagInput ? 'පවතින Tags තෝරන්න' : 'නව Tag එකක් එක් කරන්න'}
                </button>
              </label>

              {showCustomTagInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    placeholder="නව Tag එක ඇතුළත් කරන්න (උදා: කෘෂිකාර්මික, ඉලෙක්ට්‍රොනික්ස්)"
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {matchingTags.length > 0 && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl">
                      <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> ගැලපෙන Tags (Matching Tags):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {matchingTags.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTag(t.tagName)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              selectedTag === t.tagName
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-zinc-700 hover:bg-emerald-100'
                            }`}
                          >
                            #{t.tagName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700/60">
                    {allTags.slice(0, 15).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTag(t.tagName)}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          selectedTag === t.tagName
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                        }`}
                      >
                        #{t.tagName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. විකුණුම් මිල & ප්‍රමාණය */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  * විකුණුම් මිල (රුපියල්) :
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="උදා: 2500"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  * ප්‍රමාණය (Quantity) :
                </label>
                <input
                  type="text"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="උදා: 50 kg, 10 Units, 5 Pcs..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100"
                />
              </div>
            </div>

            {/* 4. ලබාදිය හැකි දිනය */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                * ලබාදිය හැකි දිනය :
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAvailableDateType('today')}
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    availableDateType === 'today'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>අද සිට (Available Today)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAvailableDateType('custom')}
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    availableDateType === 'custom'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>දිනයක් තෝරන්න</span>
                </button>
              </div>

              {availableDateType === 'custom' && (
                <div className="mt-2">
                  <input
                    type="date"
                    required
                    value={customAvailableDate}
                    onChange={(e) => setCustomAvailableDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100"
                  />
                </div>
              )}
            </div>

            {/* 5. ඔබ මෙය විකුණන්නේ (තොග / සිල්ලර / හුවමාරු - Multiple selection possible) */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl">
              <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200 mb-2">
                * ඔබ මෙය විකුණන්නේ : (එකක් හෝ කිහිපයක් තෝරන්න)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'wholesale' as MarketItemSaleType, label: 'තොග (Wholesale)' },
                  { id: 'retail' as MarketItemSaleType, label: 'සිල්ලර (Retail)' },
                  { id: 'exchange' as MarketItemSaleType, label: 'හුවමාරු (Barter)' }
                ].map((st) => {
                  const isChecked = saleTypes.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleSaleType(st.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                          isChecked ? 'border-white bg-white/20' : 'border-zinc-400'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <span className="truncate">{st.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* හුවමාරු තෝරාගන්නේ නම් අමතර fields */}
              {saleTypes.includes('exchange') && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-700 space-y-2.5 animate-in fade-in duration-200">
                  <div className="text-xs font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    හුවමාරු (Barter Exchange) තොරතුරු :
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        * ඔබට මේ සඳහා අවශ්‍ය මොනවාද? :
                      </label>
                      <input
                        type="text"
                        required
                        value={barterNeeds}
                        onChange={(e) => setBarterNeeds(e.target.value)}
                        placeholder="උදා: ජෙනරේටරයක්, යකඩ පයිප්ප..."
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-900/60 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        * කොපමණ ප්‍රමාණයක්ද? :
                      </label>
                      <input
                        type="text"
                        value={barterQuantity}
                        onChange={(e) => setBarterQuantity(e.target.value)}
                        placeholder="උදා: 1 Unit / සමාන වටිනාකම"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-900/60 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. වගකීම් කාලය (Warranty) */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  * වගකීම් කාලයක් (Warranty) :
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHasWarranty(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      hasWarranty
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
                    }`}
                  >
                    තිබේ (Yes)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasWarranty(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      !hasWarranty
                        ? 'bg-zinc-700 text-white border-zinc-700'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
                    }`}
                  >
                    නැත (No)
                  </button>
                </div>
              </div>

              {hasWarranty && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-zinc-700">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    * කොපමණ කාලයක්ද යන්න සඳහන් කරන්න :
                  </label>
                  <input
                    type="text"
                    required
                    value={warrantyPeriod}
                    onChange={(e) => setWarrantyPeriod(e.target.value)}
                    placeholder="උදා: මාස 6 ක Company Warranty, වසර 2 ක්..."
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100"
                  />
                </div>
              )}
            </div>

            {/* 7. Expired Date & Note */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  කල් ඉකුත්වීමේ විස්තර (Expiry Details) :
                </label>
                <input
                  type="checkbox"
                  id="chkExpiry"
                  checked={hasExpiry}
                  onChange={(e) => setHasExpiry(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md cursor-pointer"
                />
              </div>

              {hasExpiry && (
                <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-zinc-700">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Expired Date (කල් ඉකුත්වීමේ දිනය) :
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Expired Note (කල් ඉකුත්වීම පිළිබඳ සටහන) :
                    </label>
                    <input
                      type="text"
                      value={expiryNote}
                      onChange={(e) => setExpiryNote(e.target.value)}
                      placeholder="උදා: නැවුම් ඇසුරුම, සෘජු හිරු එළියෙන් වළකින්න..."
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 8. මිලදීගත හැක්කේ (Delivery / Pickup Options) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
                * මිලදීගත හැක්කේ (Delivery / Collection Method) :
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'pickup' as MarketDeliveryOption, label: 'පැමිණ රැගෙන යන්න (Self Pickup)' },
                  { id: 'seller_deliver' as MarketDeliveryOption, label: 'මම ගෙනවිත් දෙන්නම්' },
                  { id: 'free_shipping' as MarketDeliveryOption, label: 'මම නොමිලේ එවන්නම් (Free Delivery)' },
                  { id: 'paid_shipping' as MarketDeliveryOption, label: 'මම එවන්නම් ඩිලිවරි ගාස්තු අයවේ' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDeliveryOption(opt.id)}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left border flex items-center gap-2 transition-all cursor-pointer ${
                      deliveryOption === opt.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        deliveryOption === opt.id ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-400'
                      }`}
                    >
                      {deliveryOption === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* පැමිණ රැගෙන යන්න තේරූ විට Map එක Add කිරීම */}
              {deliveryOption === 'pickup' && (
                <div className="mt-3 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate">
                        {pickupLocation ? pickupLocation.name : 'ස්ථානය තෝරාගෙන නැත'}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {pickupLocation?.address || 'පැමිණ රැගෙන යාමට ස්ථානය සිතියමෙන් ලකුණු කරන්න'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{pickupLocation ? 'ස්ථානය වෙනස් කරන්න' : 'Map එකෙන් ස්ථානය තෝරන්න'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 9. වැඩි විස්තර Note Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                වැඩි විස්තර ඇතුළත් කිරීමට සටහනක් (Note box) :
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="භාණ්ඩයේ තත්ත්වය, විශේෂ වට්ටම් හෝ ඇණවුම් කිරීමේ උපදෙස් මෙහි ලියන්න..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100"
              />
            </div>

            {/* 10. WhatsApp & Chat Option */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  සන්නිවේදනය (Chat Box / WhatsApp) :
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={showWhatsapp}
                    onChange={(e) => setShowWhatsapp(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-md cursor-pointer"
                  />
                  <span>වට්සැප් අංකය පෙන්වන්න</span>
                </label>
              </div>

              {showWhatsapp && (
                <div className="pt-2 border-t border-slate-200 dark:border-zinc-700">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    WhatsApp අංකය :
                  </label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100"
                  />
                </div>
              )}
            </div>

            {/* 11. තහවුරු කිරීමේ බොත්තම */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <Check className="w-5 h-5" />
                <span>තහවුරු කර වෙළඳපොළට එක් කරන්න (Confirm & Publish)</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Map Picker Modal */}
      <GroupChatMapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onSelectLocation={(loc) => {
          setPickupLocation({
            name: loc.name,
            address: loc.address,
            lat: loc.lat,
            lng: loc.lng,
            note: loc.note
          });
          setIsMapPickerOpen(false);
        }}
      />
    </>
  );
};
