import React from 'react';
import { MarketShop, WeekSchedule, User } from '../types';
import { getVillageOrTownDisplay } from '../utils/geoUtils';
import { 
  X, 
  Store, 
  Building2, 
  Globe, 
  MapPin, 
  Clock, 
  Phone, 
  MessageSquare, 
  Mail, 
  ExternalLink, 
  CheckCircle2, 
  Layers, 
  Tag, 
  Navigation,
  Calendar,
  Lock
} from 'lucide-react';

interface MarketShopPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: MarketShop | null;
  currentUser?: User;
  onOpenChat?: (shop: MarketShop) => void;
}

export const MarketShopPreviewModal: React.FC<MarketShopPreviewModalProps> = ({
  isOpen,
  onClose,
  shop,
  currentUser,
  onOpenChat
}) => {
  if (!isOpen || !shop) return null;

  const isShop = shop.type === 'shop';

  const isOwner = currentUser && (
    (currentUser.userId && shop.userId && (currentUser.userId === shop.userId || currentUser.id === shop.userId)) ||
    (currentUser.phone && shop.userPhone && currentUser.phone.replace(/\D/g, '') === shop.userPhone.replace(/\D/g, ''))
  );
  const isAdmin = currentUser?.role === 'admin';
  const hasContactPermission = isOwner || isAdmin || shop.revealContactConsent !== false;

  const dayLabels: { key: keyof WeekSchedule; labelSi: string }[] = [
    { key: 'monday', labelSi: 'සඳුදා (Mon)' },
    { key: 'tuesday', labelSi: 'අඟහරුවාදා (Tue)' },
    { key: 'wednesday', labelSi: 'බදාදා (Wed)' },
    { key: 'thursday', labelSi: 'බ්‍රහස්පතින්දා (Thu)' },
    { key: 'friday', labelSi: 'සිකුරාදා (Fri)' },
    { key: 'saturday', labelSi: 'සෙනසුරාදා (Sat)' },
    { key: 'sunday', labelSi: 'ඉරිදා (Sun)' }
  ];

  const handleOpenWhatsApp = () => {
    if (!shop.whatsappNumber) return;
    const cleanPhone = shop.whatsappNumber.replace(/[^0-9]/g, '');
    const internationalPhone = cleanPhone.startsWith('0')
      ? `94${cleanPhone.substring(1)}`
      : cleanPhone;
    const msg = encodeURIComponent(
      `ආයුබෝවන්, මම සහය (Sahaya) යෙදුම හරහා ඔබගේ "${shop.name}" සම්බන්ධ කරගනිමි.`
    );
    window.open(`https://wa.me/${internationalPhone}?text=${msg}`, '_blank');
  };

  const handleOpenGoogleMaps = () => {
    if (!shop.location) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${shop.location.lat},${shop.location.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border-2 border-emerald-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Banner Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md shrink-0">
              {isShop ? <Store className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
            </div>
            <div className="min-w-0 pr-8">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-white/20 backdrop-blur-xs text-white border border-white/20 uppercase tracking-wider">
                  {isShop ? (shop.mode === 'online' ? '🌐 Online Store' : '🏪 Shop / Store') : '🏢 Business Place'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-950/40 text-emerald-200 border border-emerald-400/30">
                  #{shop.categoryTag}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black leading-snug break-words">
                {shop.name}
              </h2>
              <p className="text-xs text-emerald-100 mt-1 flex items-center gap-1.5">
                <span>හිමිකරු :</span>
                <span className="font-bold">{shop.userName}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-800 dark:text-zinc-100">
          {/* Quick Action Buttons (Call, WhatsApp, Maps) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {hasContactPermission ? (
              <>
                {shop.showWhatsapp && shop.whatsappNumber && (
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp කරන්න</span>
                  </button>
                )}

                {shop.userPhone && (
                  <a
                    href={`tel:${shop.userPhone}`}
                    className="p-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer text-center"
                  >
                    <Phone className="w-4 h-4" />
                    <span>අමතන්න (Call)</span>
                  </a>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => onOpenChat && onOpenChat(shop)}
                className="col-span-2 p-2.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-600" />
                <span>🔒 අංකය විමසන්න (In-App Chat)</span>
              </button>
            )}

            {shop.location && (
              <button
                type="button"
                onClick={handleOpenGoogleMaps}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                <span>දිශාව (Maps)</span>
              </button>
            )}
          </div>

          {/* Location details */}
          {shop.location && (
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/80 rounded-2xl border border-slate-200 dark:border-zinc-700 flex items-start gap-2.5">
              <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                  {getVillageOrTownDisplay(shop.location.name)}
                </div>
                {shop.location.address && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {getVillageOrTownDisplay(shop.location.address)}
                  </div>
                )}
                {shop.location.note && (
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded-lg">
                    ℹ️ {shop.location.note}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inventory Table (භාණ්ඩ හා සේවා ලැයිස්තුව) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                ලබාගත හැකි භාණ්ඩ හා මිල ගණන් ({shop.inventory.length}) :
              </h3>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold border-b border-slate-200 dark:border-zinc-700">
                    <th className="p-2.5">භාණ්ඩය / සේවාව</th>
                    <th className="p-2.5 text-center">ප්‍රමාණය</th>
                    <th className="p-2.5 text-right">මිල</th>
                    <th className="p-2.5 text-center">ආකාරය</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {shop.inventory.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                      <td className="p-2.5 font-bold text-slate-900 dark:text-zinc-100">
                        {inv.name}
                      </td>
                      <td className="p-2.5 text-center text-zinc-600 dark:text-zinc-400">
                        {inv.quantity}
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        රු. {inv.price.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                          {inv.saleType === 'wholesale' ? 'තොග' : inv.saleType === 'retail' ? 'සිල්ලර' : 'තොග / සිල්ලර'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Opening Schedule */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              විවෘත වේලාවන් (Operating Hours) :
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-700">
              {dayLabels.map(({ key, labelSi }) => {
                const d = shop.schedule[key];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800"
                  >
                    <span className="font-semibold text-slate-700 dark:text-zinc-300">
                      {labelSi}
                    </span>
                    {d?.isOpen ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {d.openTime} - {d.closeTime}
                      </span>
                    ) : (
                      <span className="font-bold text-rose-500 text-[11px]">වසා ඇත</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Links & Socials */}
          {(shop.websiteUrl || shop.facebookUrl || shop.tiktokUrl || shop.youtubeUrl || shop.email) && (
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-emerald-600" />
                වෙබ් හා සමාජ මාධ්‍ය සබැඳි :
              </h3>
              <div className="flex flex-wrap gap-2">
                {shop.email && (
                  <a
                    href={`mailto:${shop.email}`}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{shop.email}</span>
                  </a>
                )}
                {shop.websiteUrl && (
                  <a
                    href={shop.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Website</span>
                  </a>
                )}
                {shop.facebookUrl && (
                  <a
                    href={shop.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span>Facebook</span>
                  </a>
                )}
                {shop.tiktokUrl && (
                  <a
                    href={shop.tiktokUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span>TikTok</span>
                  </a>
                )}
                {shop.youtubeUrl && (
                  <a
                    href={shop.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span>YouTube</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
