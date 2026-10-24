import React, { useState, useEffect } from 'react';

import { User, TagItem, MarketShop, ShopInventoryItem, WeekSchedule, DaySchedule } from '../types';

import { GroupChatMapPickerModal } from './GroupChatMapPickerModal';

import { getStoredMarketShops, saveMarketShopsToStorage } from '../data/marketplaceData';

import { addMarketShopToFirestore } from '../lib/firebase';

import { X, Plus, Trash2, Store, Building2, Globe, MapPin, Clock, Check, Layers, Link as LinkIcon, MessageSquare, User as UserIcon, Phone } from 'lucide-react';

export interface MarketplaceAddShopModalProps {

isOpen: boolean;

onClose: () => void;

onSaveShop: (shop: MarketShop) => void;

currentUser?: any;

allTags: TagItem[];

editShop?: any;

defaultType?: any;

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

export const MarketplaceAddShopModal = ({

isOpen,

onClose,

onSaveShop,

currentUser,

allTags,

editShop,

defaultType = 'shop'

}: MarketplaceAddShopModalProps) => {

const resolvedDefaultType = defaultType === 'business' ? 'business' : 'shop';

const targetType = editShop && editShop.type ? editShop.type : resolvedDefaultType;

const isShop = targetType === 'shop';

const [mode, setMode] = useState(editShop && editShop.mode ? editShop.mode : 'shop');

const [name, setName] = useState(editShop ? (editShop.name ? editShop.name : editShop.shopName ? editShop.shopName : '') : '');

const [ownerName, setOwnerName] = useState(editShop && editShop.userName ? editShop.userName : currentUser && currentUser.name ? currentUser.name : '');

const [contactPhone, setContactPhone] = useState(

editShop && editShop.userPhone

? editShop.userPhone

: currentUser && currentUser.phone

? currentUser.phone

: currentUser && currentUser.whatsappPhone

? currentUser.whatsappPhone

: ''

);

const [location, setLocation] = useState(editShop && editShop.location ? editShop.location : null);

const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

const [schedulePreset, setSchedulePreset] = useState(

editShop && editShop.schedulePreset ? editShop.schedulePreset : 'everyday'

);

const [schedule, setSchedule] = useState(

editShop && editShop.schedule ? editShop.schedule : defaultSchedule

);

const createEmptyInventoryRow = (): ShopInventoryItem => ({

id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,

name: '',

quantity: '1 Unit',

price: 0,

saleType: 'retail'

});

const [inventory, setInventory] = useState(

editShop && Array.isArray(editShop.inventory) && editShop.inventory.length >= 1

? editShop.inventory

: [createEmptyInventoryRow()]

);

const firstTagName = Array.isArray(allTags) && allTags[0] && allTags[0].tagName ? allTags[0].tagName : 'වෙළඳපොල';

const [categoryTag, setCategoryTag] = useState(

editShop && editShop.categoryTag ? editShop.categoryTag : firstTagName

);

const [email, setEmail] = useState(editShop && editShop.email ? editShop.email : '');

const [websiteUrl, setWebsiteUrl] = useState(editShop && editShop.websiteUrl ? editShop.websiteUrl : '');

const [facebookUrl, setFacebookUrl] = useState(editShop && editShop.facebookUrl ? editShop.facebookUrl : '');

const [tiktokUrl, setTiktokUrl] = useState(editShop && editShop.tiktokUrl ? editShop.tiktokUrl : '');

const [youtubeUrl, setYoutubeUrl] = useState(editShop && editShop.youtubeUrl ? editShop.youtubeUrl : '');

const [revealContactConsent, setRevealContactConsent] = useState(

editShop && typeof editShop.revealContactConsent === 'boolean' ? editShop.revealContactConsent : true

);

const [showWhatsapp, setShowWhatsapp] = useState(

editShop && typeof editShop.showWhatsapp === 'boolean' ? editShop.showWhatsapp : true

);

const [whatsappNumber, setWhatsappNumber] = useState(

editShop && editShop.whatsappNumber

? editShop.whatsappNumber

: currentUser && currentUser.whatsappPhone

? currentUser.whatsappPhone

: currentUser && currentUser.phone

? currentUser.phone

: ''

);

useEffect(() => {

if (!isOpen) return;

if (editShop) {

setMode(editShop.mode ? editShop.mode : 'shop');

setName(editShop.name ? editShop.name : editShop.shopName ? editShop.shopName : '');

setOwnerName(editShop.userName ? editShop.userName : currentUser && currentUser.name ? currentUser.name : '');

setContactPhone(

editShop.userPhone

? editShop.userPhone

: editShop.whatsappNumber

? editShop.whatsappNumber

: currentUser && currentUser.phone

? currentUser.phone

: ''

);

setLocation(editShop.location ? editShop.location : null);

setSchedulePreset(editShop.schedulePreset ? editShop.schedulePreset : 'everyday');

setSchedule(editShop.schedule ? editShop.schedule : defaultSchedule);

setInventory(

Array.isArray(editShop.inventory) && editShop.inventory.length >= 1

? editShop.inventory

: [createEmptyInventoryRow()]

);

setCategoryTag(editShop.categoryTag ? editShop.categoryTag : firstTagName);

setEmail(editShop.email ? editShop.email : '');

setWebsiteUrl(editShop.websiteUrl ? editShop.websiteUrl : '');

setFacebookUrl(editShop.facebookUrl ? editShop.facebookUrl : '');

setTiktokUrl(editShop.tiktokUrl ? editShop.tiktokUrl : '');

setYoutubeUrl(editShop.youtubeUrl ? editShop.youtubeUrl : '');

setRevealContactConsent(typeof editShop.revealContactConsent === 'boolean' ? editShop.revealContactConsent : true);

setShowWhatsapp(typeof editShop.showWhatsapp === 'boolean' ? editShop.showWhatsapp : true);

setWhatsappNumber(

editShop.whatsappNumber

? editShop.whatsappNumber

: editShop.userPhone

? editShop.userPhone

: currentUser && currentUser.phone

? currentUser.phone

: ''

);

} else {

setMode('shop');

setName('');

setOwnerName(currentUser && currentUser.name ? currentUser.name : '');

const uPhone = currentUser && currentUser.phone ? currentUser.phone : currentUser && currentUser.whatsappPhone ? currentUser.whatsappPhone : '';

setContactPhone(uPhone);

setLocation(null);

setSchedulePreset('everyday');

setSchedule(defaultSchedule);

setInventory([createEmptyInventoryRow()]);

setCategoryTag(firstTagName);

setEmail('');

setWebsiteUrl('');

setFacebookUrl('');

setTiktokUrl('');

setYoutubeUrl('');

setRevealContactConsent(true);

setShowWhatsapp(true);

setWhatsappNumber(uPhone);

}

}, [isOpen, editShop, defaultType, currentUser]);

const handleApplyPreset = (preset: any) => {

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

const handleUpdateDay = (dayKey: keyof WeekSchedule, updates: any) => {

setSchedule((prev) => ({

...prev,

[dayKey]: {

...prev[dayKey],

...updates

}

}));

};

const handleAddInventoryRow = () => {

setInventory((prev) => [...prev, createEmptyInventoryRow()]);

};

const handleUpdateInventoryRow = (id: string, field: keyof ShopInventoryItem, value: any) => {

setInventory((prev) =>

prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));

};

const handleRemoveInventoryRow = (id: string) => {

if (!(inventory.length >= 2)) return;

setInventory((prev) => prev.filter((row) => row.id !== id));

};

const handleSubmit = (e: React.FormEvent) => {

e.preventDefault();

if (!name.trim()) {

alert(`කරුණාකර ${isShop ? 'අලෙවිසැලේ' : 'ව්‍යාපාරයේ'} නම ඇතුළත් කරන්න.`);

return;

}

const cleanedInventory = inventory.filter((item) => item.name.trim().length >= 1);

const finalInventory = cleanedInventory.length >= 1 ? cleanedInventory : [

{

id: `inv_${Date.now()}_default`,

name: isShop ? 'සාමාන්‍ය භාණ්ඩ (General Items)' : 'සාමාන්‍ය සේවා (General Services)',

quantity: '1 Unit',

price: 0,

saleType: 'retail' as any

}

];

const resolvedPhone = contactPhone.trim()

? contactPhone.trim()

: whatsappNumber.trim()

? whatsappNumber.trim()

: currentUser && currentUser.phone

? currentUser.phone

: '';

const resolvedWhatsapp = whatsappNumber.trim() ? whatsappNumber.trim() : resolvedPhone;

const resolvedOwnerName = ownerName.trim()

? ownerName.trim()

: currentUser && currentUser.name

? currentUser.name

: name.trim();

const resolvedUserId = editShop && editShop.userId

? editShop.userId

: currentUser && currentUser.userId

? currentUser.userId

: currentUser && currentUser.id

? currentUser.id

: resolvedPhone

? `guest_${resolvedPhone.replace(/\D/g, '')}`

: `guest_${Date.now()}`;

const savedShop: MarketShop = {

id: editShop && editShop.id ? editShop.id : `mkt_${targetType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,

type: targetType,

mode: isShop ? mode : 'shop',

name: name.trim(),

shopName: name.trim(),

location: location ? location : undefined,

schedulePreset: schedulePreset as any,

schedule: schedule,

inventory: finalInventory,

categoryTag: categoryTag,

email: email.trim() ? email.trim() : undefined,

websiteUrl: websiteUrl.trim() ? websiteUrl.trim() : undefined,

facebookUrl: facebookUrl.trim() ? facebookUrl.trim() : undefined,

tiktokUrl: tiktokUrl.trim() ? tiktokUrl.trim() : undefined,

youtubeUrl: youtubeUrl.trim() ? youtubeUrl.trim() : undefined,

showWhatsapp: showWhatsapp,

whatsappNumber: showWhatsapp && resolvedWhatsapp ? resolvedWhatsapp : undefined,

chatEnabled: true,

revealContactConsent: revealContactConsent,

userId: resolvedUserId,

userName: resolvedOwnerName,

userPhone: resolvedPhone,

createdAt: editShop && editShop.createdAt ? editShop.createdAt : new Date().toLocaleDateString('si-LK'),

createdAtMs: editShop && editShop.createdAtMs ? editShop.createdAtMs : Date.now()

};

try {

const currentStored = getStoredMarketShops();

const updatedStored = [savedShop, ...currentStored.filter((s) => Boolean(s && s.id !== savedShop.id))];

saveMarketShopsToStorage(updatedStored);

} catch (err) {

console.warn('Local shop storage notice:', err);

}

addMarketShopToFirestore(savedShop).catch((err) => {

console.warn('Firestore shop sync notice:', err);

});

try {

window.dispatchEvent(new Event('sahaya_marketplace_updated'));

} catch {}

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

const h = React.createElement;

return h(React.Fragment,

null, h('div',

{ className: 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200' }, h('div',

{ className: 'bg-white dark:bg-zinc-900 border-2 border-emerald-500/40 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto' }, h('div',

{ className: 'px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0' }, h('div',

{ className: 'flex items-center gap-3' }, h('div',

{ className: 'w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs' },

isShop ? h(Store, { className: 'w-5 h-5' }) : h(Building2, { className: 'w-5 h-5' })), h('div',

null, h('h3',

{ className: 'font-extrabold text-base sm:text-lg leading-tight' },

editShop

? `${isShop ? 'අලෙවිසැල' : 'ව්‍යාපාරික ස්ථානය'} සංස්කරණය කරන්න`

: `නව ${isShop ? 'අලෙවිසැලක්' : 'ව්‍යාපාරික ස්ථානයක්'} එකතු කරන්න`

), h('p',

{ className: 'text-xs text-emerald-100 font-medium' },

'විස්තර, භාණ්ඩ/සේවා ලැයිස්තුව හා විවෘත වේලාවන් සටහන් කරන්න'

))), h('button',

{ type: 'button', onClick: onClose, className: 'p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer' }, h(X, { className: 'w-5 h-5' }))), h('form',

{ onSubmit: handleSubmit, className: 'p-5 overflow-y-auto space-y-5 flex-1' },

isShop

? h('div',

null, h('label',

{ className: 'block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5' },

'* අලෙවිසැල පවත්වන්නේ (Shop Mode) :'

), h('div',

{ className: 'grid grid-cols-2 gap-2' }, h('button',

{

type: 'button',

onClick: () => setMode('shop'),

className: `p-3 rounded-2xl text-xs font-extrabold border flex items-center justify-center gap-2 transition-all cursor-pointer ${

mode === 'shop'

? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'

: 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'

}`

}, h(Store, { className: 'w-4 h-4 text-emerald-600' }), h('span', null, 'භෞතික වෙළඳසැලක් (Shop / Store)')), h('button',

{

type: 'button',

onClick: () => setMode('online'),

className: `p-3 rounded-2xl text-xs font-extrabold border flex items-center justify-center gap-2 transition-all cursor-pointer ${

mode === 'online'

? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'

: 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'

}`

}, h(Globe, { className: 'w-4 h-4 text-teal-600' }), h('span', null, 'අන්තර්ජාලය හරහා (Online Store)'))))

: null, h('div',

{ className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' }, h('div',

{ className: 'sm:col-span-2' }, h('label',

{ className: 'block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5' },

`* ${isShop ? 'අලෙවිසැලේ' : 'ව්‍යාපාරයේ / ආයතනයේ'} නම (Name) :`

), h('input', {

type: 'text',

required: true,

value: name,

onChange: (e: any) => setName(e.target.value),

placeholder: isShop

? 'උදා: ලංකා ඉලෙක්ට්‍රොනික්ස් & හෝම් ඇප්ලයන්ස්...'

: 'උදා: රෝයල් මොටර්ස් සේවා මධ්‍යස්ථානය...',

className: 'w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100'

})), h('div',

null, h('label',

{ className: 'block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1' }, h(UserIcon, { className: 'w-3.5 h-3.5 text-emerald-600' }), h('span', null, 'හිමිකරුගේ / සම්බන්ධීකාරකගේ නම :')), h('input', {

type: 'text',

value: ownerName,

onChange: (e: any) => setOwnerName(e.target.value),

placeholder: 'උදා: කේ. නිමල් පෙරේරා',

className: 'w-full px-3.5 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100'

})), h('div',

null, h('label',

{ className: 'block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1' }, h(Phone, { className: 'w-3.5 h-3.5 text-emerald-600' }), h('span', null, '* ප්‍රධාන දුරකථන අංකය (Phone) :')), h('input', {

type: 'tel',

required: true,

value: contactPhone,

onChange: (e: any) => {

setContactPhone(e.target.value);

if (!whatsappNumber) setWhatsappNumber(e.target.value);

},

placeholder: '07XXXXXXXX',

className: 'w-full px-3.5 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100'

}))), h('div',

{ className: 'p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-2.5' }, h('div',

{ className: 'flex items-center justify-between' }, h('label',

{ className: 'text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5' }, h(MapPin, { className: 'w-4 h-4 text-emerald-600' }),

`${isShop ? 'අලෙවිසැල' : 'ව්‍යාපාරය'} තිබෙන ස්ථානය (Location) :`

), h('button',

{

type: 'button',

onClick: () => setIsMapPickerOpen(true),

className: 'px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1'

}, h(MapPin, { className: 'w-3 h-3' }), h('span', null, location ? 'ස්ථානය වෙනස් කරන්න' : 'Map එකෙන් තෝරන්න'))),

location

? h('div',

{ className: 'p-2.5 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-900/60 rounded-xl flex items-center justify-between' }, h('div',

{ className: 'truncate' }, h('div', { className: 'text-xs font-bold text-slate-800 dark:text-zinc-200 truncate' }, location.name),

location.address

? h('div', { className: 'text-[11px] text-zinc-500 dark:text-zinc-400 truncate' }, location.address)

: null

), h('button',

{ type: 'button', onClick: () => setLocation(null), className: 'text-red-500 hover:text-red-700 text-xs font-bold ml-2 cursor-pointer' },

'ඉවත් කරන්න'

))

: h('div',

{ className: 'text-xs text-zinc-500 dark:text-zinc-400' },

'භෞතික ලිපිනයක් සිතියමේ සටහන් කිරීම පාරිභෝගිකයින්ට ඔබව පහසුවෙන් සොයාගැනීමට උපකාරී වේ.'

)), h('div',

{ className: 'p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-3' }, h('div',

{ className: 'flex items-center justify-between' }, h('label',

{ className: 'text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5' }, h(Clock, { className: 'w-4 h-4 text-emerald-600' }),

'විවෘතව ඇති වේලාව (Opening Schedule) :'

)), h('div',

{ className: 'flex flex-wrap gap-1.5' },

[

{ id: 'everyday', label: 'සෑම දිනකම (Every day)' },

{ id: 'weekdays_only', label: 'සති අන්තයේ හැර (Weekdays)' },

{ id: 'no_poya', label: 'පෝය හැර' },

{ id: 'no_holidays', label: 'රජයේ නිවාඩු හැර' }

].map((p, pIdx) =>

h('button',

{

key: `sched_preset_${p.id}_${pIdx}`,

type: 'button',

onClick: () => handleApplyPreset(p.id),

className: `px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${

schedulePreset === p.id

? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'

: 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'

}`

},

p.label

))), h('div',

{ className: 'space-y-1.5 pt-2 border-t border-slate-200 dark:border-zinc-700' },

dayLabels.map(({ key, labelSi }) => {

const dayData = schedule[key];

return h('div',

{

key: key,

className: 'flex items-center justify-between gap-2 p-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 text-xs'

}, h('div',

{ className: 'flex items-center gap-2 w-28 sm:w-32 shrink-0' }, h('input', {

type: 'checkbox',

checked: dayData.isOpen,

onChange: (e: any) => handleUpdateDay(key, { isOpen: e.target.checked }),

className: 'w-3.5 h-3.5 text-emerald-600 rounded-md cursor-pointer'

}), h('span',

{ className: `font-bold ${dayData.isOpen ? 'text-slate-800 dark:text-zinc-100' : 'text-zinc-400 line-through'}` },

`${labelSi} :`

)),

dayData.isOpen

? h('div',

{ className: 'flex items-center gap-2 min-w-0' }, h('input', {

type: 'time',

value: dayData.openTime,

onChange: (e: any) => handleUpdateDay(key, { openTime: e.target.value }),

className: 'px-2 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium dark:text-zinc-100'

}), h('span', { className: 'text-zinc-400 font-bold' }, 'සිට'), h('input', {

type: 'time',

value: dayData.closeTime,

onChange: (e: any) => handleUpdateDay(key, { closeTime: e.target.value }),

className: 'px-2 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium dark:text-zinc-100'

}), h('span', { className: 'text-zinc-400 font-bold' }, 'දක්වා'))

: h('span', { className: 'text-xs text-rose-500 font-bold' }, 'වසා ඇත (Closed)'));

}))), h('div',

{ className: 'p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-3' }, h('div',

{ className: 'flex items-center justify-between' }, h('label',

{ className: 'text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5' }, h(Layers, { className: 'w-4 h-4 text-emerald-600' }),

'* ඔබ ළඟ තිබෙන්නේ මොනවාද? (භාණ්ඩ / සේවා ලැයිස්තුව) :'

), h('button',

{

type: 'button',

onClick: handleAddInventoryRow,

className: 'px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1'

}, h(Plus, { className: 'w-3.5 h-3.5' }), h('span', null, 'තව එකතු කරන්න (+)'))), h('div',

{ className: 'space-y-2' },

inventory.map((row, idx) =>

h('div',

{

key: `inv_row_${row.id ? row.id : 'r'}_${idx}`,

className: 'p-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2'

}, h('div',

{ className: 'flex-1 min-w-[130px]' }, h('input', {

type: 'text',

required: true,

value: row.name,

onChange: (e: any) => handleUpdateInventoryRow(row.id, 'name', e.target.value),

placeholder: 'භාණ්ඩයේ / සේවාවේ නම',

className: 'w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500'

})), h('div',

{ className: 'w-full sm:w-24 shrink-0' }, h('input', {

type: 'text',

value: row.quantity,

onChange: (e: any) => handleUpdateInventoryRow(row.id, 'quantity', e.target.value),

placeholder: 'ප්‍රමාණය',

className: 'w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500'

})), h('div',

{ className: 'w-full sm:w-28 shrink-0 relative' }, h('span',

{ className: 'absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-bold' },

'Rs.'

), h('input', {

type: 'number',

min: '0',

value: row.price ? row.price : '',

onChange: (e: any) => handleUpdateInventoryRow(row.id, 'price', Number(e.target.value)),

placeholder: 'මිල',

className: 'w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500'

})), h('div',

{ className: 'w-full sm:w-28 shrink-0' }, h('select',

{

value: row.saleType,

onChange: (e: any) => handleUpdateInventoryRow(row.id, 'saleType', e.target.value),

className: 'w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500'

}, h('option', { value: 'retail' }, 'සිල්ලර'), h('option', { value: 'wholesale' }, 'තොග'), h('option', { value: 'both' }, 'දෙකම'))),

inventory.length >= 2

? h('button',

{

type: 'button',

onClick: () => handleRemoveInventoryRow(row.id),

className: 'p-1.5 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer self-center',

title: 'ඉවත් කරන්න'

}, h(Trash2, { className: 'w-4 h-4' }))

: null

)))), h('div',

null, h('label',

{ className: 'block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5' },

'* අයත් අංශය / කාණ්ඩය (Category Tag) :'

), h('div',

{ className: 'flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700' },

allTags.map((t, tIdx) =>

h('button',

{

key: `shop_tag_${t.id ? t.id : 't'}_${tIdx}`,

type: 'button',

onClick: () => setCategoryTag(t.tagName),

className: `px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${

categoryTag === t.tagName

? 'bg-emerald-600 text-white shadow-xs'

: 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'

}`

},

`#${t.tagName}`

)))), h('div',

{ className: 'p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-2.5' }, h('label',

{ className: 'text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5' }, h(LinkIcon, { className: 'w-4 h-4 text-emerald-600' }),

'සම්බන්ධතා සහ වෙබ් ලින්ක්ස් (Social Media & Web Links) :'

), h('div',

{ className: 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' }, h('div',

null, h('label', { className: 'block text-[11px] font-semibold text-zinc-500 mb-1' }, 'විද්‍යුත් තැපෑල (Email)'), h('input', {

type: 'email',

value: email,

onChange: (e: any) => setEmail(e.target.value),

placeholder: 'shop@example.com',

className: 'w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100'

})), h('div',

null, h('label', { className: 'block text-[11px] font-semibold text-zinc-500 mb-1' }, 'වෙබ් අඩවිය (Website URL)'), h('input', {

type: 'url',

value: websiteUrl,

onChange: (e: any) => setWebsiteUrl(e.target.value),

placeholder: 'https://www.yourshop.lk',

className: 'w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100'

})), h('div',

null, h('label', { className: 'block text-[11px] font-semibold text-zinc-500 mb-1' }, 'Facebook පිටුව'), h('input', {

type: 'url',

value: facebookUrl,

onChange: (e: any) => setFacebookUrl(e.target.value),

placeholder: 'https://facebook.com/...',

className: 'w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100'

})), h('div',

null, h('label', { className: 'block text-[11px] font-semibold text-zinc-500 mb-1' }, 'TikTok පිටුව'), h('input', {

type: 'url',

value: tiktokUrl,

onChange: (e: any) => setTiktokUrl(e.target.value),

placeholder: 'https://tiktok.com/@...',

className: 'w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100'

})), h('div',

{ className: 'sm:col-span-2' }, h('label', { className: 'block text-[11px] font-semibold text-zinc-500 mb-1' }, 'YouTube නාලිකාව'), h('input', {

type: 'url',

value: youtubeUrl,

onChange: (e: any) => setYoutubeUrl(e.target.value),

placeholder: 'https://youtube.com/@...',

className: 'w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100'

})))), h('div',

{ className: 'p-3.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-3' }, h('div',

{ className: 'flex items-center justify-between' }, h('label',

{ className: 'text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5' }, h(MessageSquare, { className: 'w-4 h-4 text-emerald-600' }),

'සන්නිවේදනය (Chat Box / WhatsApp) :'

), h('label',

{ className: 'flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300' }, h('input', {

type: 'checkbox',

checked: showWhatsapp,

onChange: (e: any) => setShowWhatsapp(e.target.checked),

className: 'w-4 h-4 text-emerald-600 rounded-md cursor-pointer'

}), h('span', null, 'වට්සැප් අංකය පෙන්වන්න'))),

showWhatsapp

? h('div',

{ className: 'pt-2 border-t border-slate-200 dark:border-zinc-700' }, h('input', {

type: 'tel',

value: whatsappNumber,

onChange: (e: any) => setWhatsappNumber(e.target.value),

placeholder: '07XXXXXXXX',

className: 'w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-zinc-100'

}))

: null, h('div',

{ className: 'pt-2.5 border-t border-slate-200 dark:border-zinc-700' }, h('label',

{ className: 'flex items-start gap-2.5 cursor-pointer' }, h('input', {

type: 'checkbox',

checked: revealContactConsent,

onChange: (e: any) => setRevealContactConsent(e.target.checked),

className: 'w-4 h-4 mt-0.5 text-emerald-600 rounded-md cursor-pointer shrink-0'

}), h('div',

{ className: 'text-xs' }, h('span',

{ className: 'font-bold text-slate-800 dark:text-zinc-200 block' },

'දුරකථන අංකය ප්‍රසිද්ධියේ පෙන්වීමට අවසර දෙමි (Reveal Phone Number)'

), h('span',

{ className: 'text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight block mt-0.5' },

'(මෙය සලකුණු නොකළහොත්, දුරකථන අංකය ආරක්ෂිතව තබාගන්නා අතර ගනුදෙනුකරුවන්ට In-App Chat මඟින් ඔබෙන් අංකය විමසීමට සිදුවේ)'

))))), h('div',

{ className: 'pt-2' }, h('button',

{

type: 'submit',

className: 'w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98'

}, h(Check, { className: 'w-5 h-5' }), h('span', null, editShop ? 'වෙනස්කම් සුරකින්න (Save Changes)' : 'තහවුරු කර ඇතුළත් කරන්න (Confirm & Save)')))))), h(GroupChatMapPickerModal, {

isOpen: isMapPickerOpen,

onClose: () => setIsMapPickerOpen(false),

onSelectLocation: (loc: any) => {

setLocation({

name: loc.name,

address: loc.address,

lat: loc.lat,

lng: loc.lng,

note: loc.note

});

setIsMapPickerOpen(false);

}

}));

};

export default MarketplaceAddShopModal;

