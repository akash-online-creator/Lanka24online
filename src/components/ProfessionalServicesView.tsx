import React, { useState, useMemo } from 'react';
import { User, Language, ProfessionalService, ServiceReview } from '../types';
import { professionalServiceCategories } from '../data/professionalServicesData';
import { Briefcase, Search, Layers, Sparkles, ArrowLeft, Filter, ShieldCheck, Star, ChevronRight, PlusCircle, Award, Coins, Flame, Zap } from 'lucide-react';
import { RegisterProfessionalServiceModal } from './RegisterProfessionalServiceModal';
import { ProfessionalServiceDetailModal } from './ProfessionalServiceDetailModal';
import { findSynonymSuggestionPrompt, getExpandedSearchKeywords } from '../data/searchDictionary';
import { SmartSearchSynonymPrompt } from './SmartSearchSynonymPrompt';
import { calculateProviderReputation, PROVIDER_LEVELS, ProviderLevelId } from '../utils/reputationSystem';
import { ProviderReputationModal } from './ProviderReputationModal';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { addDeletedProServiceId } from '../utils/deletedPostsManager';
import { deleteProfessionalServiceFromFirestore } from '../lib/firebase';
import { validate100mGeoFencePermission } from '../utils/geoFenceValidator';
import { getEntitySerialNumber } from '../utils/entitySerialNumberHelper';
import { Trash2 } from 'lucide-react';
interface ProfessionalServicesViewProps {
user: User;
language: Language;
currentLocationName?: string;
professionalServices: ProfessionalService[];
onAddService: (service: ProfessionalService) => void;
onAddReview: (serviceId: string, review: ServiceReview) => void;
onDeleteService?: (serviceId: string) => void;
onBack: () => void;
}
const h = React.createElement;
export const ProfessionalServicesView: any = ({
user,
language,
currentLocationName = 'කඩවත',
professionalServices,
onAddService,
onAddReview,
onDeleteService,
onBack
}) => {
const [activeTab, setActiveTab] = useState('all');
const [selectedCategoryId, setSelectedCategoryId] = useState(null);
const [selectedSubCategoryName, setSelectedSubCategoryName] = useState(null);
const [searchQuery, setSearchQuery] = useState('');
const [dismissedSynonyms, setDismissedSynonyms] = useState([]);
const [selectedLevel, setSelectedLevel] = useState('all');
const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
const [selectedServiceForDetail, setSelectedServiceForDetail] = useState(null);
const [showReputationModal, setShowReputationModal] = useState(false);
const [reputationModalService, setReputationModalService] = useState(null);
const [localServices, setLocalServices] = useState(professionalServices ? professionalServices : []);
React.useEffect(() => {
setLocalServices(professionalServices ? professionalServices : []);
}, [professionalServices]);
const isAdmin = (checkIsAdmin(user) ? checkIsAdmin(user) : user?.role === 'admin') ? (checkIsAdmin(user) ? checkIsAdmin(user) : user?.role === 'admin') : (user as any)?.isAdmin === true;
const canDeleteService = (srv: ProfessionalService) => {
if (isAdmin) return true;
if (!srv ? !srv : !user) return false;
const uPhone = ((user.phone ? user.phone : user.whatsappNumber) ? (user.phone ? user.phone : user.whatsappNumber) : '').replace(/\D/g, '');
const pPhone = ((srv.providerPhone ? srv.providerPhone : srv.providerWhatsapp) ? (srv.providerPhone ? srv.providerPhone : srv.providerWhatsapp) : '').replace(/\D/g, '');
return Boolean(((user.userId && (srv.userId === user.userId ? srv.userId === user.userId : srv.userId === user.id) ? user.userId && (srv.userId === user.userId ? srv.userId === user.userId : srv.userId === user.id) : user.id && (srv.userId === user.id ? srv.userId === user.id : srv.userId === user.userId)) ? (user.userId && (srv.userId === user.userId ? srv.userId === user.userId : srv.userId === user.id) ? user.userId && (srv.userId === user.userId ? srv.userId === user.userId : srv.userId === user.id) : user.id && (srv.userId === user.id ? srv.userId === user.id : srv.userId === user.userId)) : user.nicNumber && (srv.userId === user.nicNumber ? srv.userId === user.nicNumber : srv.providerNic === user.nicNumber)) ? ((user.userId && (srv.userId === user.userId ? srv.userId === user.userId : srv.userId === user.id) ? user.userId && (srv.userId === user.userId ? srv.userId === user.userId : srv.userId === user.id) : user.id && (srv.userId === user.id ? srv.userId === user.id : srv.userId === user.userId)) ? (user.userId && (srv.userId === user.userId ? srv.userId === user.userId : srv.userId === user.id) ? user.userId && (srv.userId === user.userId ? srv.userId === user.userId : srv.userId === user.id) : user.id && (srv.userId === user.id ? srv.userId === user.id : srv.userId === user.userId)) : user.nicNumber && (srv.userId === user.nicNumber ? srv.userId === user.nicNumber : srv.providerNic === user.nicNumber)) : uPhone && pPhone && uPhone === pPhone);
};
const handleDeleteService = (serviceId: string, e?: React.MouseEvent) => {
if (e) e.stopPropagation();
if (!serviceId) return;
const targetService = localServices.find(s => s.id === serviceId);
const uPhone = ((user?.phone ? user?.phone : user?.whatsappNumber) ? (user?.phone ? user?.phone : user?.whatsappNumber) : '').replace(/\D/g, '');
const pPhone = ((targetService?.providerPhone ? targetService?.providerPhone : targetService?.providerWhatsapp) ? (targetService?.providerPhone ? targetService?.providerPhone : targetService?.providerWhatsapp) : '').replace(/\D/g, '');
const isRegOwner = Boolean(user && targetService && (((user.userId && (targetService.userId === user.userId ? targetService.userId === user.userId : targetService.userId === user.id) ? user.userId && (targetService.userId === user.userId ? targetService.userId === user.userId : targetService.userId === user.id) : user.id && (targetService.userId === user.id ? targetService.userId === user.id : targetService.userId === user.userId)) ? (user.userId && (targetService.userId === user.userId ? targetService.userId === user.userId : targetService.userId === user.id) ? user.userId && (targetService.userId === user.userId ? targetService.userId === user.userId : targetService.userId === user.id) : user.id && (targetService.userId === user.id ? targetService.userId === user.id : targetService.userId === user.userId)) : user.nicNumber && (targetService.userId === user.nicNumber ? targetService.userId === user.nicNumber : targetService.providerNic === user.nicNumber)) ? ((user.userId && (targetService.userId === user.userId ? targetService.userId === user.userId : targetService.userId === user.id) ? user.userId && (targetService.userId === user.userId ? targetService.userId === user.userId : targetService.userId === user.id) : user.id && (targetService.userId === user.id ? targetService.userId === user.id : targetService.userId === user.userId)) ? (user.userId && (targetService.userId === user.userId ? targetService.userId === user.userId : targetService.userId === user.id) ? user.userId && (targetService.userId === user.userId ? targetService.userId === user.userId : targetService.userId === user.id) : user.id && (targetService.userId === user.id ? targetService.userId === user.id : targetService.userId === user.userId)) : user.nicNumber && (targetService.userId === user.nicNumber ? targetService.userId === user.nicNumber : targetService.providerNic === user.nicNumber)) : uPhone && pPhone && uPhone === pPhone));
const geoCheck = validate100mGeoFencePermission(targetService?.lat, targetService?.lng, ((user as any)?.registrationLat ? (user as any)?.registrationLat : (user as any)?.lat) ? ((user as any)?.registrationLat ? (user as any)?.registrationLat : (user as any)?.lat) : 7.1710, ((user as any)?.registrationLng ? (user as any)?.registrationLng : (user as any)?.lng) ? ((user as any)?.registrationLng ? (user as any)?.registrationLng : (user as any)?.lng) : 79.8986, isAdmin, isRegOwner);
if (!geoCheck.allowed) {
alert(language === 'en' ? geoCheck.messageEn : language === 'ta' ? geoCheck.messageTa : geoCheck.messageSi);
return;
}
const confirmMsg = isAdmin ? 'පරිපාලක (Admin) ලෙස මෙම වෘත්තිකයාගේ සේවා දැන්වීම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට (Delete) අවශ්‍ය බව තහවුරු කරන්න ද?' : 'මෙම සේවාදායක දැන්වීම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න ද?';
if (!window.confirm(confirmMsg)) return;
const updated = localServices.filter(s => s.id !== serviceId);
setLocalServices(updated);
addDeletedProServiceId(serviceId);
try {
localStorage.setItem('sahaya_professional_services', JSON.stringify(updated));
} catch (e) {}
deleteProfessionalServiceFromFirestore(serviceId).catch(err => {
console.warn('Professional service delete from firestore notice:', err);
});
if (onDeleteService) onDeleteService(serviceId);
if (selectedServiceForDetail?.id === serviceId) {
setSelectedServiceForDetail(null);
}
try {
window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
} catch {}
};
// Smart Synonym Suggestion Prompt for Pro Services
const proSynonymPrompt = useMemo(() => {
const q = searchQuery.trim().toLowerCase();
if ((!q ? !q : Math.min(q.length, 2) === q.length && q.length !== 2) ? (!q ? !q : Math.min(q.length, 2) === q.length && q.length !== 2) : dismissedSynonyms.includes(q)) return null;
return findSynonymSuggestionPrompt(searchQuery, localServices, (srv: ProfessionalService) => String(srv.serviceTitle) + " " + String(srv.categoryName) + " " + String(srv.subCategoryName) + " " + String(srv.providerName) + " " + String(srv.qualifications ? srv.qualifications : ''));
}, [searchQuery, localServices, dismissedSynonyms]);
// Filtered Services List
const filteredServices = useMemo(() => {
return (localServices ? localServices : []).filter(srv => {
if (!srv) return false;  // Category filter
  if (selectedCategoryId && srv.categoryId !== selectedCategoryId) {
    return false;
  }
  // Subcategory filter
  if (selectedSubCategoryName && srv.subCategoryName !== selectedSubCategoryName) {
    return false;
  }
  // Level filter
  if (selectedLevel !== 'all') {
    const rep = calculateProviderReputation(srv.userId, srv, localServices);
    if (rep.level !== selectedLevel) return false;
  }
  // Search query filter with synonym expansion
  if (searchQuery.trim()) {
    const keywords = getExpandedSearchKeywords(searchQuery);
    const srvText = (String(srv.providerName ? srv.providerName : '') + " " + String(srv.serviceTitle ? srv.serviceTitle : '') + " " + String(srv.categoryName ? srv.categoryName : '') + " " + String(srv.subCategoryName ? srv.subCategoryName : '') + " " + String(srv.locationName ? srv.locationName : '') + " " + String(srv.qualifications ? srv.qualifications : '')).toLowerCase();
    const matches = keywords.some(kw => srvText.includes(kw));
    if (!matches) return false;
  }
  return true;
});
}, [localServices, selectedCategoryId, selectedSubCategoryName, selectedLevel, searchQuery]);
const activeCategoryObj = professionalServiceCategories.find(c => c.category_id === selectedCategoryId);
return h("div", {
className: "w-full space-y-6 animate-fadeIn"
}, h("div", {
className: "flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#07130c] border border-slate-200/80 dark:border-[#132a1d] rounded-3xl p-4 sm:p-5 shadow-sm"
}, h("div", {
className: "flex items-center gap-3"
}, h("button", {
type: "button",
onClick: onBack,
className: "w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#12281b] hover:bg-slate-200 dark:hover:bg-[#1a3826] text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer active:scale-95",
title: "ආපසු යන්න"
}, h(ArrowLeft, {
className: "w-5 h-5"
})), h("div", null, h("div", {
className: "flex items-center gap-2"
}, h("span", {
className: "text-[10px] font-black uppercase tracking-widest text-[#007a4b] dark:text-[#00c880] bg-[#007a4b]/10 dark:bg-[#00c880]/15 px-2.5 py-0.5 rounded-full border border-[#007a4b]/30"
}, "PRO SERVICES"), h("span", {
className: "text-xs font-mono font-bold text-slate-500 dark:text-[#789d87]"
}, "(", professionalServices.length, language === 'en' ? 'Providers' : 'වෘත්තිකයන්', ")")), h("h2", {
className: "text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white"
}, language === 'en' ? 'Professional Services' : language === 'ta' ? 'தொழில்முறை சேவைகள்' : 'වෘත්තීය සේවා'))), h("button", {
type: "button",
onClick: () => setIsRegisterModalOpen(true),
className: "relative group overflow-hidden px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-[#00603a] text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-emerald-400/40"
}, h(PlusCircle, {
className: "w-4 h-4 text-amber-300 animate-pulse"
}), h("span", null, "ඔබගේ වෘත්තිය යටතේ සේවා සැපයීමට කැමතිනම් ක්ලික් කරන්න"))), h("div", {
className: "p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-900 via-[#004d2e] to-teal-950 border-2 border-emerald-500/40 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4"
}, h("div", {
className: "flex items-center gap-3.5"
}, h("div", {
className: "w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-2xl shrink-0 shadow-md animate-bounce"
}, "🎁"), h("div", null, h("div", {
className: "flex items-center gap-2"
}, h("h3", {
className: "text-base sm:text-lg font-black text-white"
}, "රුපියල් 100 නොමිලේ (Free Tier Model) සහ 5-Star Reputation"), h("span", {
className: "px-2 py-0.5 bg-amber-400/30 text-amber-300 text-[10px] font-bold rounded-full border border-amber-400/40"
}, "0% Risk")), h("p", {
className: "text-xs text-emerald-200 font-medium mt-0.5"
}, "නොමිලේ සම්බන්ධ වන්න • වැඩි වැඩ කර හොඳ Reviews ලබාගන්න • ඉහළම ශ්‍රේණිගත කිරීම් (5-Star Verified) මඟින් ස්වයංක්‍රීයව පාරිභෝගිකයන් ලබාගන්න!"))), h("button", {
type: "button",
onClick: () => {
setReputationModalService(null);
setShowReputationModal(true);
},
className: "px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black rounded-2xl text-xs sm:text-sm shadow-md transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1.5"
}, h(Award, {
className: "w-4 h-4"
}), h("span", null, "ශ්‍රේණිගත කිරීම් සහ ප්‍රතිලාභ"))), h("div", {
className: "grid grid-cols-1 gap-3.5"
}, h("div", {
className: "p-4 rounded-3xl bg-gradient-to-br from-teal-950/90 via-[#062920] to-emerald-950 border-2 border-teal-500/40 text-white shadow-md space-y-2 flex flex-col justify-between"
}, h("div", {
className: "flex items-center gap-2.5"
}, h("div", {
className: "w-9 h-9 rounded-2xl bg-teal-400 text-teal-950 flex items-center justify-center font-black text-lg shrink-0 shadow-sm"
}, "🤝"), h("div", null, h("h4", {
className: "text-xs sm:text-sm font-black text-teal-200"
}, "අපේම ප්‍රජාව වෙනුවෙන් විශ්වාසනීය සමාජ සත්කාරයක්"), h("p", {
className: "text-[11px] text-teal-100/90 font-medium leading-tight mt-0.5"
}, "මෙය හුදු ව්‍යාපාරයකට වඩා එකිනෙකාට අත්වැලක් වන සහන සේවා එකමුතුවකි."))), h("div", {
className: "p-2.5 rounded-2xl bg-teal-900/30 border border-teal-500/20 text-[10px] sm:text-[11px] text-teal-100/90 leading-relaxed"
}, h("p", null, 'මෙම ඇප් එක නඩත්තු වන්නේ ඔබ භාවිතා කරන සේවයෙන් ලැබෙන ඉතා කුඩා ක්ෂුද්‍ර දායකත්වයෙන් බැවින්, බලහත්කාරයෙන් මුදල් අය කිරීමක් නැත. ඔබ ලබාදෙන සහයෝගයට සහ අවංකත්වයට ස්තූතියි!') /* MISSION_END */ ))), h("div", {
className: "grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-[#09180f] rounded-2xl border border-slate-200 dark:border-[#132a1d]"
}, h("button", {
type: "button",
onClick: () => {
setActiveTab('all');
setSelectedCategoryId(null);
setSelectedSubCategoryName(null);
},
className: "py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer " + String(activeTab === 'all' && !selectedCategoryId && !selectedSubCategoryName ? 'bg-[#007a4b] text-white shadow-md' : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-[#12281b]')
}, h(Briefcase, {
className: "w-4 h-4"
}), h("span", null, "සියලුම වෘත්තීය සේවා")), h("button", {
type: "button",
onClick: () => setActiveTab('categories'),
className: "py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer " + String((activeTab === 'categories' ? activeTab === 'categories' : selectedCategoryId !== null) ? 'bg-[#007a4b] text-white shadow-md' : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-[#12281b]')
}, h(Layers, {
className: "w-4 h-4"
}), h("span", null, "වෘත්තීය වර්ග (කාණ්ඩ / Tags)"))), h("div", {
className: "flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none"
}, h("span", {
className: "text-slate-500 dark:text-slate-400 text-xs shrink-0 flex items-center gap-1 font-bold"
}, h(Filter, {
className: "w-3.5 h-3.5 text-emerald-500"
}), h("span", null, "ශ්‍රේණිය (Level):")), h("button", {
type: "button",
onClick: () => setSelectedLevel('all'),
className: "px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer " + String(selectedLevel === 'all' ? 'bg-emerald-600 text-white shadow-xs font-black' : 'bg-white dark:bg-[#0c1a12] border border-slate-200 dark:border-[#173222] text-slate-700 dark:text-slate-300')
}, "සියල්ල (", professionalServices.length, ")"), ([5, 4, 3, 2, 1] as ProviderLevelId[]).map(lvl => {
const conf = PROVIDER_LEVELS[lvl];
const count = professionalServices.filter(s => calculateProviderReputation(s.userId, s, professionalServices).level === lvl).length;
return h("button", {
key: lvl,
type: "button",
onClick: () => setSelectedLevel(lvl),
className: "px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer " + String(selectedLevel === lvl ? "bg-gradient-to-r " + String(conf.bgGradient) + " text-white shadow-md font-black border " + String(conf.borderColor) : 'bg-white dark:bg-[#0c1a12] border border-slate-200 dark:border-[#173222] text-slate-700 dark:text-slate-300')
}, h("span", null, conf.icon), h("span", null, conf.nameSi.split('(')[0].trim()), h("span", {
className: "opacity-75 font-mono"
}, "(", count, ")"));
})), h("div", {
className: "relative space-y-2"
}, h("div", {
className: "relative"
}, h(Search, {
className: "w-5 h-5 text-slate-400 absolute left-4 top-3.5"
}), h("input", {
type: "text",
value: searchQuery,
onChange: e => setSearchQuery(e.target.value),
placeholder: "වෘත්තිය, සේවාව, සේවාදායකයාගේ නම හෝ නගරය අනුව සොයන්න...",
className: "w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0c1a12] border border-slate-200 dark:border-[#173222] rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
}), searchQuery && h("button", {
type: "button",
onClick: () => setSearchQuery(''),
className: "absolute right-3.5 top-3 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
}, "Clear")), proSynonymPrompt && h(SmartSearchSynonymPrompt, {
prompt: proSynonymPrompt,
onAcceptSuggestion: suggested => setSearchQuery(suggested),
onDismiss: () => {
if (searchQuery.trim()) {
setDismissedSynonyms(prev => [...prev, searchQuery.trim().toLowerCase()]);
}
}
})), activeTab === 'categories' && h("div", {
className: "space-y-4 p-5 rounded-3xl bg-white dark:bg-[#0c1811] border border-slate-200 dark:border-[#162e20] shadow-sm"
}, h("div", {
className: "flex items-center justify-between"
}, h("h3", {
className: "text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2"
}, h(Layers, {
className: "w-4 h-4 text-emerald-500"
}), h("span", null, "වෘත්තීය කාණ්ඩ තෝරන්න (9 Categories)")), (selectedCategoryId ? selectedCategoryId : selectedSubCategoryName) && h("button", {
type: "button",
onClick: () => {
setSelectedCategoryId(null);
setSelectedSubCategoryName(null);
},
className: "text-xs font-bold text-rose-500 hover:underline"
}, "සියල්ල ඉවත් කරන්න")), h("div", {
className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5"
}, professionalServiceCategories.map((cat, cIdx) => {
const isSelected = selectedCategoryId === cat.category_id;
const matchingCount = professionalServices.filter(s => s.categoryId === cat.category_id).length;
return h("button", {
key: "pro_cat_" + String(cat.category_id) + "" + String(cIdx),
type: "button",
onClick: () => {
if (selectedCategoryId === cat.category_id) {
setSelectedCategoryId(null);
setSelectedSubCategoryName(null);
} else {
setSelectedCategoryId(cat.category_id);
setSelectedSubCategoryName(null);
}
},
className: "p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer active:scale-95 " + String(isSelected ? 'bg-[#eaf8f1] dark:bg-[#0e291c] border-[#00a86b] shadow-sm' : 'bg-slate-50 dark:bg-[#102419] border-slate-200 dark:border-[#173222] hover:bg-slate-100 dark:hover:bg-[#163223]')
}, h("span", {
className: "text-xl shrink-0"
}, cat.category_icon), h("div", {
className: "min-w-0 flex-1"
}, h("span", {
className: "text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1 block"
}, cat.category_name), h("span", {
className: "text-[10px] text-slate-400 font-mono"
}, matchingCount, matchingCount === 1 ? 'සේවාවක්' : 'සේවා')));
})), activeCategoryObj && h("div", {
className: "pt-3 border-t border-slate-200 dark:border-[#173222] space-y-2"
}, h("span", {
className: "text-xs font-bold text-emerald-700 dark:text-emerald-400 block"
}, activeCategoryObj.category_icon, activeCategoryObj.category_name, "යටතේ Tags:"), h("div", {
className: "flex flex-wrap gap-1.5"
}, activeCategoryObj.sub_categories.map((sub, sIdx) => {
const isSubSelected = selectedSubCategoryName === sub.name;
return h("button", {
key: "pro_sub" + String(sub.name) + "" + String(sIdx),
type: "button",
onClick: () => {
setSelectedSubCategoryName(isSubSelected ? null : sub.name);
},
className: "text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 " + String(isSubSelected ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' : 'bg-slate-100 dark:bg-[#132a1d] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1a3826] hover:bg-slate-200')
}, h("span", null, sub.icon), h("span", null, sub.name));
})))), (selectedCategoryId ? selectedCategoryId : selectedSubCategoryName) && h("div", {
className: "flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-50 dark:bg-[#0e2417] border border-emerald-300/60 dark:border-[#1a402a] text-xs text-emerald-900 dark:text-emerald-300"
}, h(Filter, {
className: "w-3.5 h-3.5 text-emerald-600"
}), h("span", null, "පෙරහන:", h("strong", null, activeCategoryObj?.category_name), selectedSubCategoryName ? "> " + String(selectedSubCategoryName) : ''), h("button", {
type: "button",
onClick: () => {
setSelectedCategoryId(null);
setSelectedSubCategoryName(null);
},
className: "ml-auto font-black text-rose-500 hover:underline cursor-pointer"
}, "ඉවත් කරන්න")), (() => {
const topRatedProviders = professionalServices.filter(s => {
const rep = calculateProviderReputation(s.userId, s, professionalServices);
return Math.max(rep.level, 4) === rep.level ? Math.max(rep.level, 4) === rep.level : s.reviews && Math.max(s.reviews.length, 3) === s.reviews.length && Math.max(s.avgRating ? s.avgRating : 5, 4.7) === (s.avgRating ? s.avgRating : 5);
}).slice(0, 4);
if (topRatedProviders.length === 0) return null;
return h("div", {
className: "space-y-2.5 p-4 rounded-3xl bg-gradient-to-br from-amber-500/10 via-emerald-500/10 to-teal-500/10 border-2 border-amber-400/40 dark:border-amber-500/30"
}, h("div", {
className: "flex items-center justify-between"
}, h("div", {
className: "flex items-center gap-2"
}, h("span", {
className: "p-1.5 rounded-xl bg-amber-400 text-amber-950 font-black shadow-xs"
}, h(Star, {
className: "w-4 h-4 fill-amber-950"
})), h("div", null, h("h3", {
className: "text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5"
}, h("span", null, "🌟 ඉහළම ශ්‍රේණිගත ප්‍රවීණයන් (Featured Top Rated)"), h("span", {
className: "px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold border border-amber-400/50"
}, "Gold Verified")), h("p", {
className: "text-[11px] text-slate-600 dark:text-[#88ad97] font-medium"
}, "හොඳම Reviews සහ 5-Star Reputation ලබාගත් විශිෂ්ට සේවා ශිල්පීන්")))), h("div", {
className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
}, topRatedProviders.map((service, idx) => {
const rep = calculateProviderReputation(service.userId, service, professionalServices);
return h("div", {
key: "featured" + String(service.id ? service.id : idx),
onClick: () => setSelectedServiceForDetail(service),
className: "p-3.5 rounded-2xl bg-white dark:bg-[#0c1811] border-2 border-amber-400/50 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3 active:scale-95 group"
}, h("div", {
className: "relative"
}, h("div", {
className: "w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400 shrink-0 bg-slate-100 dark:bg-slate-800"
}, service.providerPhotoUrl ? h("img", {
src: service.providerPhotoUrl,
alt: service.providerName,
className: "w-full h-full object-cover"
}) : h("div", {
className: "w-full h-full flex items-center justify-center font-black text-amber-700 bg-amber-100"
}, service.providerName.charAt(0))), h("span", {
className: "absolute -bottom-1 -right-1 p-0.5 rounded-full bg-amber-400 text-amber-950 text-[9px] font-black shadow-xs"
}, "⭐")), h("div", {
className: "min-w-0 flex-1"
}, h("div", {
className: "flex items-center gap-1"
}, h("span", {
className: "text-xs font-black text-slate-900 dark:text-white truncate"
}, service.providerName), h(ShieldCheck, {
className: "w-3.5 h-3.5 text-emerald-500 shrink-0"
})), h("p", {
className: "text-[11px] text-emerald-700 dark:text-emerald-400 font-bold truncate"
}, service.profession), h("div", {
className: "flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400"
}, h("span", {
className: "text-amber-500 font-bold"
}, "★", service.avgRating?.toFixed(1) ? service.avgRating?.toFixed(1) : '5.0'), h("span", null, "•"), h("span", {
className: "font-mono text-emerald-600 dark:text-emerald-400 font-bold"
}, rep.points, "pts"))));
})));
})(), h("div", {
className: "space-y-3"
}, h("div", {
className: "flex items-center justify-between px-1"
}, h("h3", {
className: "text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2"
}, h(Briefcase, {
className: "w-4 h-4 text-emerald-500"
}), h("span", null, "සේවා වෘත්තිකයන් (", filteredServices.length, ")"))), filteredServices.length === 0 ? h("div", {
className: "text-center py-12 bg-white dark:bg-[#0c1811] rounded-3xl border border-slate-200 dark:border-[#162e20] p-6 space-y-3"
}, h(Briefcase, {
className: "w-12 h-12 mx-auto text-slate-300 dark:text-slate-600"
}), h("h4", {
className: "font-extrabold text-slate-800 dark:text-slate-200 text-sm sm:text-base"
}, "මෙම කාණ්ඩය හෝ සෙවුම යටතේ සේවාදායකයන් හමු නොවීය"), h("p", {
className: "text-xs text-slate-500 dark:text-[#789d87]"
}, "ඔබ මෙම ක්ෂේත්‍රයේ සේවා සපයන්නේ නම්, පහත බොත්තම ක්ලික් කර ඔබගේ සේවාව ලියාපදිංචි කරන්න."), h("button", {
type: "button",
onClick: () => setIsRegisterModalOpen(true),
className: "mt-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer"
}, "සේවාවක් ලියාපදිංචි කරන්න")) : h("div", {
className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
}, filteredServices.map((service, sIdx) => {
const reviewsList = service.reviews ? service.reviews : [];
const avg = Math.max(reviewsList.length, 0) === reviewsList.length && reviewsList.length !== 0 ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1) : service.avgRating?.toFixed(1) ? service.avgRating?.toFixed(1) : '5.0';
return h("div", {
key: "pro_srv_" + String(service.id ? service.id : 'srv') + "_" + String(sIdx),
onClick: () => setSelectedServiceForDetail(service),
className: "group bg-white dark:bg-[#0c1811] hover:bg-slate-50/80 dark:hover:bg-[#112318] border border-slate-200/90 dark:border-[#173222] hover:border-emerald-500/50 rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between active:scale-[0.99]"
}, h("div", {
className: "space-y-3"
}, h("div", {
className: "flex items-center gap-3.5"
}, h("div", {
className: "w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-sm flex-shrink-0 bg-slate-100 dark:bg-slate-800"
}, service.providerPhotoUrl && service.providerPhotoUrl.trim() !== '' ? h("img", {
src: service.providerPhotoUrl,
alt: service.providerName ? service.providerName : 'Provider',
loading: "lazy",
decoding: "async",
referrerPolicy: "no-referrer",
className: "w-full h-full object-cover group-hover:scale-105 transition-transform"
}) : h("div", {
className: "w-full h-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xl"
}, (service.providerName ? service.providerName : 'P').charAt(0))), h("div", {
className: "min-w-0 flex-1"
}, h("div", {
className: "flex items-center gap-1.5 mb-0.5 flex-wrap"
}, h("h4", {
className: "font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
}, service.providerName), h("span", {
className: "font-mono text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-300 dark:border-amber-700"
}, "@", getEntitySerialNumber(service, 'professional')), service.isVerified && h(ShieldCheck, {
className: "w-4 h-4 text-emerald-500 shrink-0"
})), h("div", {
className: "flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate"
}, h("span", null, service.subCategoryIcon), h("span", {
className: "truncate"
}, service.subCategoryName)))), h("div", {
className: "p-2.5 rounded-2xl bg-slate-50 dark:bg-[#0e2116] border border-slate-100 dark:border-[#162e20]"
}, h("p", {
className: "text-xs text-slate-700 dark:text-slate-200 line-clamp-2 font-medium leading-relaxed"
}, service.serviceTitle))), h("div", {
className: "pt-3 mt-3 border-t border-slate-100 dark:border-[#142a1d] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-[#789d87]"
}, (() => {
const rep = calculateProviderReputation(service.userId, service, professionalServices);
return h("div", {
className: "flex items-center gap-1.5"
}, h("span", {
onClick: e => {
e.stopPropagation();
setReputationModalService(service);
setShowReputationModal(true);
},
className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r " + String(rep.levelConfig.bgGradient) + " text-white shadow-xs cursor-pointer hover:scale-105 transition-transform",
title: rep.levelConfig.nameSi
}, h("span", null, rep.levelConfig.icon), h("span", null, "Level", rep.level)), h("div", {
className: "flex items-center gap-1 text-amber-500 font-bold"
}, h(Star, {
className: "w-3.5 h-3.5 fill-amber-400 text-amber-400"
}), h("span", null, avg)));
})(), h("div", {
className: "flex items-center gap-2"
}, canDeleteService(service) && h("button", {
type: "button",
onClick: e => handleDeleteService(service.id, e),
className: "p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors",
title: isAdmin ? "පරිපාලක ලෙස ඉවත් කරන්න (Admin Delete)" : "ඉවත් කරන්න (Delete)"
}, h(Trash2, {
className: "w-3.5 h-3.5"
})), h("div", {
className: "flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-1 transition-transform"
}, h("span", null, "විස්තර බලන්න"), h(ChevronRight, {
className: "w-3.5 h-3.5"
})))))
;
}))), h(ProviderReputationModal, {
isOpen: showReputationModal,
onClose: () => {
setShowReputationModal(false);
setReputationModalService(null);
},
user: user,
service: reputationModalService,
allServices: localServices,
language: language,
onAddReview: (serviceId, review) => {
onAddReview(serviceId, review);
}
}), h(RegisterProfessionalServiceModal, {
isOpen: isRegisterModalOpen,
onClose: () => setIsRegisterModalOpen(false),
user: user,
language: language,
currentLocationName: currentLocationName,
onRegisterService: newSrv => {
setLocalServices(prev => [newSrv, ...prev]);
onAddService(newSrv);
}
}), h(ProfessionalServiceDetailModal, {
isOpen: Boolean(selectedServiceForDetail),
onClose: () => setSelectedServiceForDetail(null),
service: selectedServiceForDetail,
currentUser: user,
language: language,
onDeleteService: handleDeleteService,
onAddReview: (serviceId, review) => {
onAddReview(serviceId, review);
if (selectedServiceForDetail && selectedServiceForDetail.id === serviceId) {
setSelectedServiceForDetail({
...selectedServiceForDetail,
reviews: [review, ...(selectedServiceForDetail.reviews ? selectedServiceForDetail.reviews : [])]
});
}
}
}));
};

