import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Car, 
  Package, 
  Truck, 
  X, 
  CheckCircle2, 
  MapPin, 
  DollarSign, 
  Sparkles,
  FileText,
  AlertCircle
} from 'lucide-react';
import { HelpPost, ServiceBill, BillItem } from '../types';
import { SlideToConfirmButton } from './SlideToConfirmButton';

interface HelperBillModalProps {
  post: HelpPost;
  isOpen: boolean;
  onClose: () => void;
  onSubmitBillAndComplete: (post: HelpPost, bill: ServiceBill) => Promise<void>;
}

export const HelperBillModal: React.FC<HelperBillModalProps> = ({
  post,
  isOpen,
  onClose,
  onSubmitBillAndComplete,
}) => {
  if (!isOpen || !post) return null;

  // Calculate transport distance (minimum 1 KM for calculation)
  const distance = Math.max(1, Math.round((post?.distanceKm || 1) * 10) / 10);
  const ratePerKm = 50;
  const initialTravelFee = distance * ratePerKm;

  const [travelOption, setTravelOption] = useState<'came' | 'brought' | 'sent' | 'none'>('came');
  const [actionsSummary, setActionsSummary] = useState('');
  const [customItems, setCustomItems] = useState<BillItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate travel item title based on option
  const getTravelItemTitle = (opt: 'came' | 'brought' | 'sent') => {
    switch (opt) {
      case 'came':
        return `සහය දැක්වීමට පැමිණීමේ ගමනාගමන ගාස්තුව (${distance} KM × රු. ${ratePerKm})`;
      case 'brought':
        return `සහය දක්වන දේවල් ගෙන ඒමේ ප්‍රවාහන ගාස්තුව (${distance} KM × රු. ${ratePerKm})`;
      case 'sent':
        return `සහය දක්වන දේවල් එව්වේ නම් යැවීමේ ගාස්තුව (${distance} KM × රු. ${ratePerKm})`;
      default:
        return `ගමනාගමන / ප්‍රවාහන ගාස්තුව (${distance} KM × රු. ${ratePerKm})`;
    }
  };

  const travelFeeAmount = travelOption !== 'none' ? initialTravelFee : 0;

  // Build full list of items (Item 1 = Travel Fee if applicable, followed by custom items)
  const travelBillItem: BillItem | null = travelOption !== 'none' ? {
    id: 'travel-fee-item',
    title: getTravelItemTitle(travelOption),
    amount: travelFeeAmount,
    isTravelFee: true,
  } : null;

  const allBillItems: BillItem[] = travelBillItem ? [travelBillItem, ...customItems] : [...customItems];

  // Calculate total amount
  const totalAmount = allBillItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Add a new custom expense item
  const handleAddCustomItem = () => {
    const newItem: BillItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: '',
      amount: 0,
      isTravelFee: false,
    };
    setCustomItems((prev) => [...prev, newItem]);
  };

  // Update custom expense item
  const handleUpdateCustomItem = (id: string, field: 'title' | 'amount', value: string | number) => {
    setCustomItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: field === 'amount' ? (Number(value) >= 0 ? Number(value) : 0) : value,
          };
        }
        return item;
      })
    );
  };

  // Remove custom expense item
  const handleRemoveCustomItem = (id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleConfirmAndSubmit = async () => {
    setIsSubmitting(true);
    const finalBill: ServiceBill = {
      items: allBillItems,
      travelDistanceKm: distance,
      travelRatePerKm: ratePerKm,
      travelOption,
      travelFee: travelFeeAmount,
      totalAmount,
      actionsSummary: actionsSummary.trim() || 'සහය ලබාදී අවසන් කරන ලදී.',
      createdAt: new Date().toISOString(),
    };

    try {
      await onSubmitBillAndComplete(post, finalBill);
      onClose();
    } catch (err) {
      console.error('Error submitting bill:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="helper-bill-modal-overlay"
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
    >
      <div 
        id="helper-bill-modal-card"
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-emerald-500/30 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-4.5 sm:p-5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner">
              <Receipt className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 border border-emerald-400/30">
                  {post.postCode || '#HELP'}
                </span>
                <span className="text-xs text-emerald-100 font-bold flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-300" />
                  {distance} KM දුරින්
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5 leading-tight">
                සහය ගාස්තු හා බිල්පත් සටහන
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Post Info Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-bold">සහය ලබාගත් පුද්ගලයා:</span>
              <span className="font-black text-slate-800 dark:text-slate-200">{post.userName}</span>
            </div>
            <p className="font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
              "{post.whatIsNeeded || post.whatHappened}"
            </p>
          </div>

          {/* Section 1: Actions Summary */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>ලබාදුන් සහය / සිදුකළ ක්‍රියාවන් සටහන් කරන්න:</span>
            </label>
            <textarea
              value={actionsSummary}
              onChange={(e) => setActionsSummary(e.target.value)}
              placeholder="උදා: පැමිණ වාහනයේ දෝෂය සකසා පණගන්වා දෙන ලදී. / මිලදී ගත් බඩු නිවසටම ගෙනැවිත් දෙන ලදී."
              rows={2}
              className="w-full text-xs p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Section 2: Transport / Travel Choice (First Item) */}
          <div className="space-y-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>1. ගමනාගමන / ප්‍රවාහන වියදම (1KM = රු. 50):</span>
              </span>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-200/80 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                {distance} KM × රු. 50 = රු. {initialTravelFee.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTravelOption('came')}
                className={`p-2.5 rounded-xl border text-left font-bold flex flex-col gap-1 transition-all ${
                  travelOption === 'came'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Car className="w-4 h-4" />
                  {travelOption === 'came' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[11px]">සහයට ආවේ නම්</span>
              </button>

              <button
                type="button"
                onClick={() => setTravelOption('brought')}
                className={`p-2.5 rounded-xl border text-left font-bold flex flex-col gap-1 transition-all ${
                  travelOption === 'brought'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Package className="w-4 h-4" />
                  {travelOption === 'brought' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[11px]">ගෙන ආවේ නම්</span>
              </button>

              <button
                type="button"
                onClick={() => setTravelOption('sent')}
                className={`p-2.5 rounded-xl border text-left font-bold flex flex-col gap-1 transition-all ${
                  travelOption === 'sent'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Truck className="w-4 h-4" />
                  {travelOption === 'sent' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[11px]">එව්වේ නම්</span>
              </button>

              <button
                type="button"
                onClick={() => setTravelOption('none')}
                className={`p-2.5 rounded-xl border text-left font-bold flex flex-col gap-1 transition-all ${
                  travelOption === 'none'
                    ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <X className="w-4 h-4 text-amber-400" />
                  {travelOption === 'none' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[11px]">ගාස්තු නැත</span>
              </button>
            </div>
          </div>

          {/* Section 3: Itemized Bill List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>බිල්පතේ වියදම් විස්තරය (Itemized Bill):</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                අයිතම {allBillItems.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {allBillItems.map((item, index) => (
                <div key={item.id} className="space-y-1.5">
                  <div 
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                      item.isTravelFee 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>

                      {item.isTravelFee ? (
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-emerald-950 dark:text-emerald-200 truncate">
                            {item.title}
                          </p>
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            1KM = රු. 50 (ස්වයංක්‍රීය ගණනය කිරීම)
                          </span>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateCustomItem(item.id, 'title', e.target.value)}
                          placeholder="වියදමේ නම / විස්තරය (උදා: මිලදී ගත් බඩු / ඖෂධ)"
                          className="flex-1 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
                        <span className="text-[11px] font-bold text-slate-500">රු.</span>
                        {item.isTravelFee ? (
                          <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 font-mono">
                            {item.amount.toLocaleString()}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={item.amount || ''}
                            onChange={(e) => handleUpdateCustomItem(item.id, 'amount', e.target.value)}
                            placeholder="0"
                            className="w-20 text-xs font-black text-right bg-transparent text-slate-900 dark:text-white font-mono focus:outline-none"
                          />
                        )}
                      </div>

                      {!item.isTravelFee && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomItem(item.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="ඉවත් කරන්න"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Every expense item ends with a '+' button to add new expense */}
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={handleAddCustomItem}
                      className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>අලුත් වියදමක් එකතු කරන්න (+)</span>
                    </button>
                  </div>
                </div>
              ))}

              {allBillItems.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                  <p className="text-xs text-slate-500">කිසිදු වියදමක් එකතු කර නැත.</p>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>අලුත් වියදමක් එකතු කරන්න (+)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Total Summary Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4.5 rounded-2xl shadow-md border border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
              <span>මුළු අයිතම ගණන:</span>
              <span className="font-mono">{allBillItems.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
              <span>ගමනාගමන/ප්‍රවාහන ගාස්තුව ({distance} KM):</span>
              <span className="font-mono">රු. {travelFeeAmount.toLocaleString()}.00</span>
            </div>
            <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span>මුළු ගෙවිය යුතු එකතුව:</span>
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-400 font-mono">
                රු. {totalAmount.toLocaleString()}.00
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer / Confirm Slide Button */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>බිල්පත සහ සහය යවා අවසන් කරන්න:</span>
            </span>
          </div>

          <SlideToConfirmButton
            id="helper-bill-submit-slider"
            onConfirm={handleConfirmAndSubmit}
            label="බිල්පත සහ සහය යැවීමට අදින්න 👉"
            completedLabel="බිල්පත සහ සහය සාර්ථකව යවන ලදී! ✓"
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};
