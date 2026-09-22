import React, { useState, useEffect } from 'react';
import { 
  User, 
  TagItem, 
  MarketShop, 
  ShopInventoryItem, 
  WeekSchedule, 
  DaySchedule,
  MarketLocation 
} from '../types';
import { GroupChatMapPickerModal } from './GroupChatMapPickerModal';
import { 
  X, 
  Plus, 
  Trash2, 
  Store, 
  Building2, 
  Globe, 
  MapPin, 
  Clock, 
  Calendar, 
  Check, 
  DollarSign, 
  Layers, 
  Tag, 
  Mail, 
  Link as LinkIcon, 
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';

interface MarketplaceAddShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveShop: (shop: MarketShop) => void;
  currentUser: User;
  allTags: TagItem[];
  editShop?: MarketShop | null;
  defaultType?: 'shop' | 'business';
}

const defaultSchedule: WeekSchedule = {
  monday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  tuesday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  wednesday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  thursday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  friday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  saturday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
  sunday: { isOpen: false, openTime: '09:00', closeTime: '14:00' }
};

export const MarketplaceAddShopModal: React.FC<MarketplaceAddShopModalProps> = ({
  isOpen,
  onClose,
  onSaveShop,
  currentUser,
  allTags,
  editShop,
  defaultType = 'shop'
}) => {
  const targetType = editShop ? editShop.type : defaultType;
  const isShop = targetType === 'shop';

  const [mode, setMode] = useState<'shop' | 'online'>(editShop?.mode || 'shop');
  const [name, setName] = useState(editShop?.name || '');
  const [location, setLocation] = useState<MarketLocation | null>(editShop?.location || null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  // Schedule Presets & Days
  const [schedulePreset, setSchedulePreset] = useState<
    'everyday' | 'weekdays_only' | 'no_poya' | 'no_holidays' | 'custom'
  >(editShop?.schedulePreset || 'everyday');
  const [schedule, setSchedule] = useState<WeekSchedule>(editShop?.schedule || defaultSchedule);

  // Inventory items
  const [inventory, setInventory] = useState<ShopInventoryItem[]>(
    editShop?.inventory && editShop.inventory.length > 0
      ? editShop.inventory
      : [
          {
            id: `inv_${Date.now()}_1`,
            name: '',
            quantity: '1 Unit',
            price: 0,
            saleType: 'retail'
          }
        ]
  );

  // Category Tag
  const [categoryTag, setCategoryTag] = useState(editShop?.categoryTag || (allTags[0]?.tagName || 'වෙළඳපොල'));

  // Social & Web Links
  const [email, setEmail] = useState(editShop?.email || '');
  const [websiteUrl, setWebsiteUrl] = useState(editShop?.websiteUrl || '');
  const [facebookUrl, setFacebookUrl] = useState(editShop?.facebookUrl || '');
  const [tiktokUrl, setTiktokUrl] = useState(editShop?.tiktokUrl || '');
  const [youtubeUrl, setYoutubeUrl] = useState(editShop?.youtubeUrl || '');

  // Contact & Privacy
  const [revealContactConsent, setRevealContactConsent] = useState(editShop?.revealContactConsent ?? true);
  const [showWhatsapp, setShowWhatsapp] = useState(editShop?.showWhatsapp ?? true);
  const [whatsappNumber, setWhatsappNumber] = useState(editShop?.whatsappNumber || currentUser.phone || '');

  // Handle schedule presets
  const handleApplyPreset = (preset: 'everyday' | 'weekdays_only' | 'no_poya' | 'no_holidays') => {
    setSchedulePreset(preset);
    if (preset === 'everyday') {
      setSchedule({
        monday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
        tuesday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
        wednesday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
        thursday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
        friday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
        saturday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
        sunday: { isOpen: true, openTime: '09:00', closeTime: '17:00' }
      });
    } else if (preset === 'weekdays_only') {
      setSchedule({
        monday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
        tuesday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
        wednesday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
        thursday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
        friday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
        saturday: { isOpen: false, openTime: '08:30', closeTime: '13:00' },
        sunday: { isOpen: false, openTime: '08:30', closeTime: '13:00' }
      });
    } else {
      setSchedule(defaultSchedule);
    }
  };

  const handleUpdateDay = (
    dayKey: keyof WeekSchedule,
    updates: Partial<DaySchedule>
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        ...updates
      }
    }));
  };

  // Inventory rows handlers
  const handleAddInventoryRow = () => {
    setInventory((prev) => [
      ...prev,
      {
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        name: '',
        quantity: '1 Unit',
        price: 0,
        saleType: 'retail'
      }
    ]);
  };

  const handleUpdateInventoryRow = (
    id: string,
    field: keyof ShopInventoryItem,
    value: any
  ) => {
    setInventory((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleRemoveInventoryRow = (id: string) => {
    if (inventory.length === 1) return;
    setInventory((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert(`කරුණාකර ${isShop ? 'අලෙවිසැලේ' : 'ව්‍යාපාරයේ'} නම ඇතුළත් කරන්න.`);
      return;
    }

    const cleanedInventory = inventory.filter((item) => item.name.trim().length > 0);

    const savedShop: MarketShop = {
      id: editShop ? editShop.id : `mkt_${targetType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: targetType,
      mode: isShop ? mode : 'shop',
      name: name.trim(),
      location: location || undefined,
      schedulePreset,
      schedule,
      inventory: cleanedInventory.length > 0 ? cleanedInventory : inventory,
      categoryTag,
      email: email.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      facebookUrl: facebookUrl.trim() || undefined,
      tiktokUrl: tiktokUrl.trim() || undefined,
      youtubeUrl: youtubeUrl.trim() || undefined,
      showWhatsapp,
      whatsappNumber: showWhatsapp ? whatsappNumber.trim() : undefined,
      chatEnabled: true,
      revealContactConsent,
      userId: currentUser.userId || currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      createdAt: editShop ? editShop.createdAt : new Date().toLocaleDateString('si-LK'),
      createdAtMs: editShop ? editShop.createdAtMs : Date.now()
    };

    onSaveShop(savedShop);
    onClose();
  };

  const dayLabels: { key: keyof WeekSchedule; labelSi: string }[] = [
    { key: 'monday', labelSi: 'සඳුදා' },
    { key: 'tuesday', labelSi: 'අඟහරුවාදා' },
    { key: 'wednesday', labelSi: 'බදාදා' },
    { key: 'thursday', labelSi: 'බ්‍රහස්පතින්දා' },
    { key: 'friday', labelSi: 'සිකුරාදා' },
    { key: 'saturday', labelSi: 'සෙනසුරාදා' },
    { key: 'sunday', labelSi: 'ඉරිදා' }
  ];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 border-2 border-emerald-500/40 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs">
                {isShop ? <Store className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                  {editShop
                    ? `${isShop ? 'අලෙවිසැල' : 'ව්‍යාපාරික ස්ථානය'} සංස්කරණය කරන්න`
                    : `නව ${isShop ? 'අලෙවිසැලක්' : 'ව්‍යාපාරික ස්ථානයක්'} එකතු කරන්න`}
                </h3>
                <p className="text-xs text-emerald-100 font-medium">
                  විස්තර, භාණ්ඩ ලැයිස්තුව හා විවෘත වේලාවන් සටහන් කරන්න
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
            {/* 1. අලෙවිසැල පවත්වන්නේ: Shop / Online (for shops) */}
            {isShop && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  * අලෙවිසැල පවත්වන්නේ (Shop Mode) :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('shop')}
                    className={`p-3 rounded-2xl text-xs font-extrabold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      mode === 'shop'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>භෞතික වෙළඳසැලක් (Shop / Store)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('online')}
                    className={`p-3 rounded-2xl text-xs font-extrabold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      mode === 'online'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-teal-600" />
                    <span>අන්තර්ජාලය හරහා (Online Store)</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. නම */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                * {isShop ? 'අලෙවිසැලේ' : 'ව්‍යාපාරයේ'} නම (Name) :
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isShop ? 'උදා: ලංකා ඉලෙක්ට්‍රොනික්ස් & හෝම් ඇප්ලයන්ස්...' : 'උදා: රෝයල් මොටර්ස් සේවා මධ්‍යස්ථානය...'}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100"
              />
            </div>

            {/* 3. ස්ථානය (Optional Location with Map Picker) */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  {isShop ? 'අලෙවිසැල' : 'ව්‍යාපාරය'} තිබෙන ස්ථානය (Location) :
                </label>
                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  <span>{location ? 'ස්ථානය වෙනස් කරන්න' : 'Map එකෙන් තෝරන්න'}</span>
                </button>
              </div>

              {location ? (
                <div className="p-2.5 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-900/60 rounded-xl flex items-center justify-between">
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                      {location.name}
                    </div>
                    {location.address && (
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {location.address}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocation(null)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold ml-2 cursor-pointer"
                  >
                    ඉවත් කරන්න
                  </button>
                </div>
              ) : (
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  භෞතික ලිපිනයක් සිතියමේ සටහන් කිරීම පාරිභෝගිකයින්ට ඔබව පහසුවෙන් සොයාගැනීමට උපකාරී වේ.
                </div>
              )}
            </div>

            {/* 4. විවෘතව ඇති වේලාව (Opening Hours) */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  විවෘතව ඇති වේලාව (Opening Schedule) :
                </label>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'everyday' as const, label: 'සෑම දිනකම (Every day)' },
                  { id: 'weekdays_only' as const, label: 'සති අන්තයේ හැර (Weekdays)' },
                  { id: 'no_poya' as const, label: 'පෝය හැර' },
                  { id: 'no_holidays' as const, label: 'රජයේ නිවාඩු හැර' }
                ].map((p, pIdx) => (
                  <button
                    key={`sched_preset_${p.id}_${pIdx}`}
                    type="button"
                    onClick={() => handleApplyPreset(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      schedulePreset === p.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Day-by-Day Detailed Rows */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-zinc-700">
                {dayLabels.map(({ key, labelSi }) => {
                  const dayData = schedule[key];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 text-xs"
                    >
                      <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
                        <input
                          type="checkbox"
                          checked={dayData.isOpen}
                          onChange={(e) => handleUpdateDay(key, { isOpen: e.target.checked })}
                          className="w-3.5 h-3.5 text-emerald-600 rounded-md cursor-pointer"
                        />
                        <span className={`font-bold ${dayData.isOpen ? 'text-slate-800 dark:text-zinc-100' : 'text-zinc-400 line-through'}`}>
                          {labelSi} :
                        </span>
                      </div>

                      {dayData.isOpen ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="time"
                            value={dayData.openTime}
                            onChange={(e) => handleUpdateDay(key, { openTime: e.target.value })}
                            className="px-2 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium dark:text-zinc-100"
                          />
                          <span className="text-zinc-400 font-bold">සිට</span>
                          <input
                            type="time"
                            value={dayData.closeTime}
                            onChange={(e) => handleUpdateDay(key, { closeTime: e.target.value })}
                            className="px-2 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium dark:text-zinc-100"
                          />
                          <span className="text-zinc-400 font-bold">දක්වා</span>
                        </div>
                      ) : (
                        <span className="text-xs text-rose-500 font-bold">වසා ඇත (Closed)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. ඔබ ළඟ තිබෙන්නේ මොනවාද? (Inventory / Services List with `+` Button) */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  * ඔබ ළඟ තිබෙන්නේ මොනවාද? (භාණ්ඩ / සේවා ලැයිස්තුව) :
                </label>
                <button
                  type="button"
                  onClick={handleAddInventoryRow}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>තව එකතු කරන්න (+)</span>
                </button>
              </div>

              {/* Dynamic rows: [භාණ්ඩයේ නම] [ප්‍රමාණය] [මිල] [තොග/සිල්ලර] */}
              <div className="space-y-2">
                {inventory.map((row, idx) => (
                  <div
                    key={`inv_row_${row.id || 'r'}_${idx}`}
                    className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2"
                  >
                    <div className="flex-1 min-w-[130px]">
                      <input
                        type="text"
                        required
                        value={row.name}
                        onChange={(e) => handleUpdateInventoryRow(row.id, 'name', e.target.value)}
                        placeholder="භාණ්ඩයේ / සේවාවේ නම"
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="w-full sm:w-24 shrink-0">
                      <input
                        type="text"
                        value={row.quantity}
                        onChange={(e) => handleUpdateInventoryRow(row.id, 'quantity', e.target.value)}
                        placeholder="ප්‍රමාණය"
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="w-full sm:w-28 shrink-0 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-bold">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={row.price || ''}
                        onChange={(e) => handleUpdateInventoryRow(row.id, 'price', Number(e.target.value))}
                        placeholder="මිල"
                        className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="w-full sm:w-28 shrink-0">
                      <select
                        value={row.saleType}
                        onChange={(e) => handleUpdateInventoryRow(row.id, 'saleType', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="retail">සිල්ලර</option>
                        <option value="wholesale">තොග</option>
                        <option value="both">දෙකම</option>
                      </select>
                    </div>

                    {inventory.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInventoryRow(row.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer self-center"
                        title="ඉවත් කරන්න"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 6. ඔබගේ අලෙවිසැල අයත් අංශය (Category Tag) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                * අයත් අංශය / කාණ්ඩය (Category Tag) :
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700">
                {allTags.map((t, tIdx) => (
                  <button
                    key={`shop_tag_${t.id || 't'}_${tIdx}`}
                    type="button"
                    onClick={() => setCategoryTag(t.tagName)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      categoryTag === t.tagName
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                    }`}
                  >
                    #{t.tagName}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. සමාජ මාධ්‍ය සහ වෙබ් ලින්ක් (Social & Web Links) */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-2.5">
              <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-emerald-600" />
                සම්බන්ධතා සහ වෙබ් ලින්ක්ස් (Social Media & Web Links) :
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Email ලිපිනය :
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@myshop.lk"
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Website Link :
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://myshop.lk"
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Facebook Link :
                  </label>
                  <input
                    type="url"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/mybusiness"
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    TikTok Link :
                  </label>
                  <input
                    type="url"
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
                    placeholder="https://tiktok.com/@mybusiness"
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs dark:text-zinc-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    YouTube Link :
                  </label>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/@mybusiness"
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* 8. WhatsApp & Chat Box + Phone Privacy */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-3">
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
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100"
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
                    className="w-4 h-4 mt-0.5 text-emerald-600 rounded-md cursor-pointer shrink-0"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-zinc-200 block">
                      දුරකථන අංකය ප්‍රසිද්ධියේ පෙන්වීමට අවසර දෙමි (Reveal Phone Number)
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight block mt-0.5">
                      (මෙය සලකුණු නොකළහොත්, දුරකථන අංකය ආරක්ෂිතව තබාගන්නා අතර ගනුදෙනුකරුවන්ට In-App Chat මඟින් ඔබෙන් අංකය විමසීමට සිදුවේ)
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* 9. තහවුරු කිරීමේ බොත්තම */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <Check className="w-5 h-5" />
                <span>{editShop ? 'වෙනස්කම් සුරකින්න (Save Changes)' : 'තහවුරු කර ඇතුළත් කරන්න (Confirm & Save)'}</span>
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
          setLocation({
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
