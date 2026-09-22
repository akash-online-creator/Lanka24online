import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Trash2, 
  ArrowLeftRight, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  X, 
  Tag, 
  User as UserIcon, 
  Sparkles,
  RefreshCw,
  Navigation,
  Share2,
  PackageOpen,
  Info,
  ShieldCheck,
  Check,
  HeartPulse,
  HandCoins,
  Lightbulb,
  Sprout,
  Laptop
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User, TagItem } from '../types';
import { TagSelector } from './TagSelector';
import { getStoredTags } from '../utils/tagUtils';
import { MapLocationTracker } from './MapLocationTracker';
import { getPostRateLimitStatus, recordPostSubmission } from '../utils/rateLimiter';

export type FromMeToYouType = 'donation' | 'giveaway' | 'exchange';

export const donationCategories = [
  { id: 'biological', name: 'ශරීර අවයව සහ ජීව විද්‍යාත්මක ද්‍රව්‍ය', icon: HeartPulse },
  { id: 'financial', name: 'මූල්‍යමය සහ ආර්ථික පරිත්‍යාග', icon: HandCoins },
  { id: 'material', name: 'භෞතික ද්‍රව්‍ය සහ සම්පත් පරිත්‍යාග', icon: PackageOpen },
  { id: 'time', name: 'කාලය සහ ශ්‍රමය පරිත්‍යාග කිරීම', icon: Clock },
  { id: 'intellectual', name: 'බුද්ධිමය සහ නිර්මාණාත්මක ද්‍රව්‍ය', icon: Lightbulb },
  { id: 'animal_env', name: 'සත්ව සහ පරිසර පරිත්‍යාග', icon: Sprout },
  { id: 'digital', name: 'ඩිජිටල් වත්කම් සහ තාක්ෂණික දත්ත', icon: Laptop },
  { id: 'other', name: 'වෙනත් විශේෂිත පරිත්‍යාග', icon: Gift }
];

interface FromMeToYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPost: (post: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>) => void;
  currentLocation: LocationOption;
  availableLocations?: LocationOption[];
  currentUser: User;
  lang: Language;
  editPost?: HelpPost | null;
  onUpdatePost?: (updatedPost: HelpPost) => void;
}

export const FromMeToYouModal: React.FC<FromMeToYouModalProps> = ({
  isOpen,
  onClose,
  onSubmitPost,
  currentLocation,
  availableLocations = [],
  currentUser,
  lang,
  editPost,
  onUpdatePost,
}) => {
  // 01. Purpose (අරමුණ) Selection ('donation' | 'giveaway' | 'exchange')
  const [purpose, setPurpose] = useState<FromMeToYouType>('donation');

  // ==================== FIELDS FOR DONATION & GIVEAWAY ====================
  const [itemTitle, setItemTitle] = useState(''); // පරිත්‍යාග කරන්නේ කුමක්ද / ඉවත් කරන්නේ කුමක්ද
  const [recipient, setRecipient] = useState('අවශ්‍ය ඕනෑම අයෙක්'); // කා වෙනුවෙන්ද
  const [customRecipient, setCustomRecipient] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'ඇවිත් රැගෙන යන්න' | 'ගෙනවිත් දෙන්නම්' | 'එවන්නම්'>('ඇවිත් රැගෙන යන්න');
  const [dateType, setDateType] = useState<'today' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [quantity, setQuantity] = useState(''); // කොපමණ තිබේද

  // ==================== FIELDS FOR EXCHANGE ====================
  const [exchangeHaveItem, setExchangeHaveItem] = useState(''); // ඔබ ළඟ හුවමාරු කිරීමට ඇත්තේ කුමක්ද
  const [exchangeHaveQuantity, setExchangeHaveQuantity] = useState(''); // ඔබ ළඟ කොපමණ තිබේද
  const [exchangeWantItem, setExchangeWantItem] = useState(''); // ඔබට අවශ්‍ය කුමක්ද
  const [exchangeWantQuantity, setExchangeWantQuantity] = useState(''); // ඔබට අවශ්‍ය කොපමණ ප්‍රමාණයක්ද
  const [exchangeMethod, setExchangeMethod] = useState<'ඇවිත් රැගෙන යන්න' | 'ගෙනවිත් දෙන්නම්'>('ඇවිත් රැගෙන යන්න');

  // ==================== COMMON FIELDS ====================
  // Location save consent & details
  const [saveLocationConsent, setSaveLocationConsent] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption>(currentLocation);
  const [isMapTrackerOpen, setIsMapTrackerOpen] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsDetectedMsg, setGpsDetectedMsg] = useState('');

  // WhatsApp number
  const [whatsappNumber, setWhatsappNumber] = useState(currentUser?.whatsappNumber || currentUser?.phone || '');

  // More details
  const [moreDetails, setMoreDetails] = useState('');

  // Tag selection
  const [allTags, setAllTags] = useState<TagItem[]>(() => getStoredTags());
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);
  const [selectedDonationCatId, setSelectedDonationCatId] = useState<string>('');

  // Errors & form feedback
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recipient options list
  const recipientOptions = [
    'අවශ්‍ය ඕනෑම අයෙක්',
    'පාසල් ළමුන් / සිසුන් සදහා',
    'දුෂ්කර / අඩු ආදායම්ලාභී පවුල් සදහා',
    'වැඩිහිටියන් සදහා',
    'ප්‍රයෝජනයක් ගතහැකි අයෙක්',
    'කාර්මික ශිල්පීන් සදහා',
    'වෙනත් (විශේෂිත)',
  ];

  // Sync / Reset on open or edit
  useEffect(() => {
    if (!isOpen) return;

    if (editPost) {
      const pType = (editPost.fromMeToYouType || (
        editPost.whatHappened?.includes('පරිත්‍යාග') ? 'donation' :
        editPost.whatHappened?.includes('ඉවත්') ? 'giveaway' :
        editPost.whatHappened?.includes('හුවමාරු') ? 'exchange' : 'donation'
      )) as FromMeToYouType;

      setPurpose(pType);
      setItemTitle(editPost.donationItem || editPost.itemLostStolenOrSearched || '');
      
      const rec = editPost.donationRecipient || '';
      if (recipientOptions.includes(rec)) {
        setRecipient(rec);
        setCustomRecipient('');
      } else if (rec) {
        setRecipient('වෙනත් (විශේෂිත)');
        setCustomRecipient(rec);
      }

      setDeliveryMethod((editPost.donationDeliveryMethod as any) || 'ඇවිත් රැගෙන යන්න');
      setDateType(editPost.donationDateType || (editPost.donationDate === 'අදම' || editPost.donationDate === 'අද' ? 'today' : 'custom'));
      setCustomDate(editPost.donationDate && editPost.donationDate !== 'අදම' && editPost.donationDate !== 'අද' ? editPost.donationDate : '');
      setQuantity(editPost.donationQuantity || editPost.quantityNeeded || '');

      setExchangeHaveItem(editPost.exchangeHaveItem || '');
      setExchangeHaveQuantity(editPost.exchangeHaveQuantity || '');
      setExchangeWantItem(editPost.exchangeWantItem || '');
      setExchangeWantQuantity(editPost.exchangeWantQuantity || '');
      setExchangeMethod((editPost.exchangeMethod as any) || 'ඇවිත් රැගෙන යන්න');

      setSaveLocationConsent(editPost.saveLocationConsent !== false);
      if (editPost.lat && editPost.lng && editPost.locationName) {
        setSelectedLocation({
          id: `loc_${Date.now()}`,
          nameSi: editPost.locationName,
          nameEn: editPost.locationName,
          nameTa: editPost.locationName,
          lat: editPost.lat,
          lng: editPost.lng,
        });
      } else {
        setSelectedLocation(currentLocation);
      }

      setWhatsappNumber(editPost.contactWhatsapp || editPost.userPhone || currentUser?.whatsappNumber || currentUser?.phone || '');
      setMoreDetails(editPost.otherDetails || editPost.whatIsNeeded || '');

      if (editPost.tagName) {
        const found = allTags.find(t => t.tagName === editPost.tagName);
        if (found) {
          setSelectedTag(found);
        } else {
          setSelectedTag({
            id: editPost.tagId || `tag_${Date.now()}`,
            tagName: editPost.tagName,
            category: editPost.tagCategory || 'මගෙන් ඔබට',
          });
        }
        const matchedCat = donationCategories.find(c => c.name === editPost.tagName);
        setSelectedDonationCatId(matchedCat ? matchedCat.id : '');
      } else {
        setSelectedTag(null);
        setSelectedDonationCatId('');
      }
    } else {
      // Fresh new modal open -> clean blank state with default options
      setPurpose('donation');
      setItemTitle('');
      setRecipient('අවශ්‍ය ඕනෑම අයෙක්');
      setCustomRecipient('');
      setDeliveryMethod('ඇවිත් රැගෙන යන්න');
      setDateType('today');
      setCustomDate('');
      setQuantity('');

      setExchangeHaveItem('');
      setExchangeHaveQuantity('');
      setExchangeWantItem('');
      setExchangeWantQuantity('');
      setExchangeMethod('ඇවිත් රැගෙන යන්න');

      setSaveLocationConsent(true);
      setSelectedLocation(currentLocation);
      setWhatsappNumber(currentUser?.whatsappNumber || currentUser?.phone || '');
      setMoreDetails('');
      setSelectedTag(null);
      setSelectedDonationCatId('');
      setErrors({});
    }
  }, [isOpen, editPost, currentLocation, currentUser]);

  // GPS Auto detection helper
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsDetectedMsg('GPS පහසුකම ඔබගේ බ්‍රවුසරය මඟින් සහය නොදක්වයි.');
      return;
    }
    setIsDetectingGps(true);
    setGpsDetectedMsg('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        setSelectedLocation({
          id: `gps_${Date.now()}`,
          nameSi: `වත්මන් ස්ථානය (GPS: ~${accuracy}m)`,
          nameEn: `Current GPS (~${accuracy}m)`,
          nameTa: `தற்போதைய இடம் (~${accuracy}m)`,
          lat,
          lng,
        });
        setIsDetectingGps(false);
        setGpsDetectedMsg(`GPS මඟින් ස්ථානය සාර්ථකව සොයාගන්නා ලදී (නිරවද්‍යතාවය: ±${accuracy}m).`);
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsDetectedMsg('GPS සක්‍රිය කර ස්ථානය ලබාගැනීමට අවසර දෙන්න.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (!isOpen) return null;

  // Effective values for narrative generation
  const effectiveRecipient = recipient === 'වෙනත් (විශේෂිත)' ? (customRecipient.trim() || 'වටිනා පුද්ගලයෙක්') : recipient;
  const effectiveDate = dateType === 'today' ? (purpose === 'giveaway' ? 'අද' : 'අදම') : (customDate.trim() || 'නියමිත දිනයක');
  const effectiveLocationName = saveLocationConsent ? (selectedLocation?.nameSi || 'ස්ථානය තහවුරු කර ඇත') : 'පෞද්ගලිකව දැනුම්දෙනු ලැබේ';

  // Build live formatted narrative according to user's exact specification
  const generateNarrative = () => {
    if (purpose === 'donation') {
      const item = itemTitle.trim() || '[පරිත්‍යාග කරන්නේ කුමක්ද]';
      const qty = quantity.trim() || '[ප්‍රමාණය]';
      return `${item} ${qty} ක් පරිත්‍යාග කිරීමට නියමිතයි. ${effectiveRecipient} හෝ වටිනා පුද්ගලයෙක් වේනම් ${effectiveDate} සිට ${deliveryMethod}.`;
    } else if (purpose === 'giveaway') {
      const item = itemTitle.trim() || '[ඉවත් කරන ද්‍රව්‍ය]';
      const qty = quantity.trim() || '[ප්‍රමාණය]';
      return `${item} ${qty} ක් ඉවත් කිරීමට නියමිතයි. ${effectiveRecipient} හෝ වටිනා පුද්ගලයෙක් වේනම් ${effectiveDate} සිට ${deliveryMethod}.`;
    } else {
      // Exchange
      const haveItem = exchangeHaveItem.trim() || '[ඔබ ළඟ හුවමාරු කිරීමට ඇත්තේ කුමක්ද?]';
      const haveQty = exchangeHaveQuantity.trim() || '[ඔබ ළඟ කොපමණ තිබේද?]';
      const wantItem = exchangeWantItem.trim() || '[ඔබට අවශ්‍ය කුමක්ද?]';
      const wantQty = exchangeWantQuantity.trim() || '[ඔබට අවශ්‍ය කොපමණ ප්‍රමාණයක්ද?]';
      return `${haveItem} ${haveQty} ක් ${wantItem} ${wantQty} කට හුවමාරු කිරීමට අවශ්‍යයි.`;
    }
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (purpose === 'donation') {
      if (!itemTitle.trim()) errs.itemTitle = 'පරිත්‍යාග කරන දේ ඇතුළත් කරන්න';
      if (!quantity.trim()) errs.quantity = 'ප්‍රමාණය ඇතුළත් කරන්න (e.g. 1ක් / 5ක් / පෙට්ටියක්)';
      if (dateType === 'custom' && !customDate.trim()) errs.customDate = 'ලබාදිය හැකි දිනය තෝරන්න';
      // දුරකථන/වට්සැප් අංකය සහ ස්ථානය කැමතිනම් පමණි (Optional)
    } else if (purpose === 'giveaway') {
      if (!itemTitle.trim()) errs.itemTitle = 'ඉවත් කරන ද්‍රව්‍ය / භාණ්ඩය ඇතුළත් කරන්න';
      if (!quantity.trim()) errs.quantity = 'ප්‍රමාණය ඇතුළත් කරන්න';
      if (dateType === 'custom' && !customDate.trim()) errs.customDate = 'ලබාදිය හැකි දිනය තෝරන්න';
      // දුරකථන/වට්සැප් අංකය සහ ස්ථානය කැමතිනම් පමණි (Optional)
    } else if (purpose === 'exchange') {
      if (!exchangeHaveItem.trim()) errs.exchangeHaveItem = 'ඔබ ළඟ හුවමාරුවට ඇති දේ ඇතුළත් කරන්න';
      if (!exchangeHaveQuantity.trim()) errs.exchangeHaveQuantity = 'ඔබ ළඟ ඇති ප්‍රමාණය ඇතුළත් කරන්න';
      if (!exchangeWantItem.trim()) errs.exchangeWantItem = 'ඔබට අවශ්‍ය දේ ඇතුළත් කරන්න';
      if (!exchangeWantQuantity.trim()) errs.exchangeWantQuantity = 'අවශ්‍ය ප්‍රමාණය ඇතුළත් කරන්න';
      // දුරකථන/වට්සැප් අංකය සහ ස්ථානය කැමතිනම් පමණි (Optional)
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!editPost) {
      const rateStatus = getPostRateLimitStatus(whatsappNumber.trim() || currentUser?.phone || 'user');
      if (rateStatus.isCoolingDown) {
        setErrors((prev) => ({
          ...prev,
          rateLimit: `⏱️ ${rateStatus.messageSi}`,
        }));
        return;
      }
    }

    setIsSubmitting(true);

    const narrative = generateNarrative();
    const cleanPhone = whatsappNumber.trim().replace(/^0/, '');
    const fullPhone = cleanPhone ? `0${cleanPhone}` : (currentUser?.phone || '');

    const whatHappenedFormatted = purpose === 'donation'
      ? `පරිත්‍යාගයකි: ${itemTitle} (${quantity})`
      : purpose === 'giveaway'
      ? `ඉවත් කිරීමට නියමිතයි: ${itemTitle} (${quantity})`
      : `හුවමාරුවට: ${exchangeHaveItem} (${exchangeHaveQuantity}) ⇄ ${exchangeWantItem} (${exchangeWantQuantity})`;

    const whatIsNeededFormatted = narrative;

    const postPayload: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'> = {
      userName: currentUser.name || 'පරිශීලකයා',
      userPhone: fullPhone,
      whatHappened: whatHappenedFormatted,
      whatIsNeeded: whatIsNeededFormatted,
      conditions: `ස්ථානය: ${effectiveLocationName}\nමා සම්බන්ධ කරගැනීමට: ${whatsappNumber.trim() ? whatsappNumber.trim() : 'අපගේ Chat මඟින්'}\nවැඩි විස්තර: ${moreDetails || 'නැත'}`,
      specialNotice: purpose === 'donation' ? 'පරිත්‍යාගයකි' : purpose === 'giveaway' ? 'ඉවත් කිරීමට නියමිතයි' : 'හුවමාරු කිරීමට',
      transport: purpose === 'exchange' ? exchangeMethod : deliveryMethod,
      payment: purpose === 'donation' ? 'නොමිලේ (පරිත්‍යාගයකි)' : purpose === 'giveaway' ? 'නොමිලේ (ඉවත්කරන බැවින්)' : 'හුවමාරුව (භාණ්ඩ සඳහා භාණ්ඩ)',
      helpersNeeded: 1,
      locationName: effectiveLocationName,
      distanceKm: 0.8,
      lat: saveLocationConsent ? selectedLocation.lat : 7.1710,
      lng: saveLocationConsent ? selectedLocation.lng : 79.8986,
      category: 'from_me_to_you',
      fromMeToYouType: purpose,
      donationItem: purpose !== 'exchange' ? itemTitle.trim() : undefined,
      donationRecipient: purpose !== 'exchange' ? effectiveRecipient : undefined,
      donationDeliveryMethod: purpose !== 'exchange' ? deliveryMethod : undefined,
      donationDateType: dateType,
      donationDate: effectiveDate,
      donationQuantity: purpose !== 'exchange' ? quantity.trim() : undefined,
      saveLocationConsent: saveLocationConsent,
      exchangeHaveItem: purpose === 'exchange' ? exchangeHaveItem.trim() : undefined,
      exchangeHaveQuantity: purpose === 'exchange' ? exchangeHaveQuantity.trim() : undefined,
      exchangeWantItem: purpose === 'exchange' ? exchangeWantItem.trim() : undefined,
      exchangeWantQuantity: purpose === 'exchange' ? exchangeWantQuantity.trim() : undefined,
      exchangeMethod: purpose === 'exchange' ? exchangeMethod : undefined,
      contactWhatsapp: whatsappNumber.trim(),
      otherDetails: moreDetails.trim(),
      tagName: selectedTag?.tagName || (purpose === 'donation' ? 'පරිත්‍යාග' : purpose === 'giveaway' ? 'ඉවත්කිරීම්' : 'හුවමාරු'),
      tagCategory: selectedTag?.category || 'මගෙන් ඔබට',
      tagId: selectedTag?.id,
      status: 'active',
    };

    if (editPost && onUpdatePost) {
      onUpdatePost({
        ...editPost,
        ...postPayload,
      });
    } else {
      onSubmitPost(postPayload);
      recordPostSubmission(whatsappNumber.trim() || currentUser?.phone || 'user');
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-[#07150e] border-2 border-emerald-500/70 dark:border-emerald-500/60 rounded-3xl shadow-2xl overflow-hidden relative max-h-[92vh] flex flex-col">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-purple-700 via-emerald-800 to-teal-900 p-4 sm:p-5 text-white flex items-center justify-between border-b border-purple-500/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner border border-white/30">
              <Gift className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-mono">
                  🎁 මගෙන් ඔබට (From Me To You)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                {editPost ? 'දැන්වීම සංස්කරණය (Edit Post)' : 'මගෙන් ඔබට දැන්වීමක් පළකරන්න'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-rose-600 text-white flex items-center justify-center font-bold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {errors.rateLimit && (
            <div className="p-3.5 bg-amber-500/20 border border-amber-500/50 rounded-2xl text-amber-300 text-xs font-bold flex items-center gap-2 animate-pulse">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{errors.rateLimit}</span>
            </div>
          )}
          
          {/* STEP 01: ඔබගේ අරමුණ (Purpose Selector) */}
          <div className="space-y-2.5">
            <label className="block text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-mono">01</span>
              <span>ඔබගේ අරමුණ තෝරන්න (Purpose):</span>
              <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: පරිත්‍යාගයක් ලෙස */}
              <button
                type="button"
                onClick={() => {
                  setPurpose('donation');
                  setErrors({});
                }}
                className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 cursor-pointer ${
                  purpose === 'donation'
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-600 text-purple-950 dark:text-purple-200 shadow-md shadow-purple-600/10'
                    : 'bg-slate-50 dark:bg-[#0c1e14] border-slate-200 dark:border-[#163323] text-slate-700 dark:text-slate-300 hover:border-purple-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  purpose === 'donation' ? 'bg-purple-600 text-white' : 'bg-purple-100 dark:bg-purple-950 text-purple-600'
                }`}>
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black">පරිත්‍යාගයක් ලෙස</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">As a Donation</p>
                </div>
                {purpose === 'donation' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 dark:text-purple-300">
                    <Check className="w-3 h-3" /> තෝරාගෙන ඇත
                  </span>
                )}
              </button>

              {/* Option 2: ඉවත්කරන නිසා */}
              <button
                type="button"
                onClick={() => {
                  setPurpose('giveaway');
                  setErrors({});
                }}
                className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 cursor-pointer ${
                  purpose === 'giveaway'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-950 dark:text-amber-200 shadow-md shadow-amber-500/10'
                    : 'bg-slate-50 dark:bg-[#0c1e14] border-slate-200 dark:border-[#163323] text-slate-700 dark:text-slate-300 hover:border-amber-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  purpose === 'giveaway' ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                }`}>
                  <PackageOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black">ඉවත්කරන නිසා</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Giveaway / Free</p>
                </div>
                {purpose === 'giveaway' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 dark:text-amber-300">
                    <Check className="w-3 h-3" /> තෝරාගෙන ඇත
                  </span>
                )}
              </button>

              {/* Option 3: හුවමාරුවට */}
              <button
                type="button"
                onClick={() => {
                  setPurpose('exchange');
                  setErrors({});
                }}
                className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 cursor-pointer ${
                  purpose === 'exchange'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-50 dark:bg-[#0c1e14] border-slate-200 dark:border-[#163323] text-slate-700 dark:text-slate-300 hover:border-emerald-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  purpose === 'exchange' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                }`}>
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black">හුවමාරුවට</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Exchange / Barter</p>
                </div>
                {purpose === 'exchange' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                    <Check className="w-3 h-3" /> තෝරාගෙන ඇත
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-[#163323]" />

          {/* ======================================================== */}
          {/* SECTION A: පරිත්‍යාගයක් ලෙස හෝ ඉවත්කරන නිසා FORM FIELDS */}
          {/* ======================================================== */}
          {(purpose === 'donation' || purpose === 'giveaway') && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* 1. ඔබ පරිත්‍යාග කරන්නේ / ඉවත් කරන්නේ කුමක්ද? */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {purpose === 'donation' ? '1. ඔබ පරිත්‍යාග කරන්නේ කුමක්ද?' : '1. ඔබ ඉවත් කරන්නේ කුමක්ද?'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={(e) => {
                    setItemTitle(e.target.value);
                    if (errors.itemTitle) setErrors(prev => ({ ...prev, itemTitle: '' }));
                  }}
                  placeholder={purpose === 'donation' ? 'e.g., පොත්පත්, පාසල් බෑග්, ඇඳුම්, පරිගණක කොටස්...' : 'e.g., පැරණි මේසයක්, ලී පුටු, යකඩ බට, ටයිල් කැට...'}
                  className={`w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-[#06180f] border text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                    errors.itemTitle
                      ? 'border-rose-500 focus:ring-rose-400'
                      : 'border-slate-300 dark:border-[#1a3826] focus:ring-purple-500'
                  }`}
                />
                {errors.itemTitle && <p className="text-xs text-rose-500 font-bold">{errors.itemTitle}</p>}
              </div>

              {/* 2. කොපමණ තිබේද? (Quantity) */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {purpose === 'donation' ? '6. කොපමණ තිබේද? (ප්‍රමාණය)' : '7. කොපමණ තිබේද? (ප්‍රමාණය)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    if (errors.quantity) setErrors(prev => ({ ...prev, quantity: '' }));
                  }}
                  placeholder="e.g., 10 ක් / පෙට්ටි 2ක් / 1ක් පමණ"
                  className={`w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-[#06180f] border text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                    errors.quantity
                      ? 'border-rose-500 focus:ring-rose-400'
                      : 'border-slate-300 dark:border-[#1a3826] focus:ring-purple-500'
                  }`}
                />
                {errors.quantity && <p className="text-xs text-rose-500 font-bold">{errors.quantity}</p>}
              </div>

              {/* 3. කා වෙනුවෙන්ද? */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  2. කා වෙනුවෙන්ද? (සුදුසු පාර්ශ්වය) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-[#06180f] border border-slate-300 dark:border-[#1a3826] text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  {recipientOptions.map((opt) => (
                    <option key={opt} value={opt} className="dark:bg-[#06180f]">
                      {opt}
                    </option>
                  ))}
                </select>
                {recipient === 'වෙනත් (විශේෂිත)' && (
                  <input
                    type="text"
                    value={customRecipient}
                    onChange={(e) => setCustomRecipient(e.target.value)}
                    placeholder="සුදුසු පාර්ශ්වය සඳහන් කරන්න..."
                    className="w-full mt-2 px-4 py-2 rounded-xl bg-white dark:bg-[#06180f] border border-slate-300 dark:border-[#1a3826] text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                )}
              </div>

              {/* 4. ලබාදෙන්නේ කෙසේද? */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  3. ලබාදෙන්නේ කෙසේද? <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['ඇවිත් රැගෙන යන්න', 'ගෙනවිත් දෙන්නම්', 'එවන්නම්'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setDeliveryMethod(method)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        deliveryMethod === method
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0c1e14] border-slate-200 dark:border-[#163323] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {deliveryMethod === method && <Check className="w-3.5 h-3.5" />}
                      <span>{method}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. ලබාදිය හැකි දිනය කවදාද? */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  4. ලබාදිය හැකි දිනය කවදාද? <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDateType('today');
                      if (errors.customDate) setErrors(prev => ({ ...prev, customDate: '' }));
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      dateType === 'today'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-[#0c1e14] border-slate-200 dark:border-[#163323] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {purpose === 'giveaway' ? 'අද' : 'අදම (Today)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDateType('custom')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      dateType === 'custom'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-[#0c1e14] border-slate-200 dark:border-[#163323] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    දිනයක් තෝරන්න (Select Date)
                  </button>
                </div>

                {dateType === 'custom' && (
                  <div className="pt-2">
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => {
                        setCustomDate(e.target.value);
                        if (errors.customDate) setErrors(prev => ({ ...prev, customDate: '' }));
                      }}
                      className={`w-full px-4 py-2 rounded-xl bg-white dark:bg-[#06180f] border text-xs sm:text-sm text-slate-900 dark:text-white ${
                        errors.customDate ? 'border-rose-500' : 'border-slate-300 dark:border-[#1a3826]'
                      }`}
                    />
                    {errors.customDate && <p className="text-xs text-rose-500 font-bold">{errors.customDate}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION B: හුවමාරුවට (EXCHANGE / BARTER) FORM FIELDS */}
          {/* ======================================================== */}
          {purpose === 'exchange' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>භාණ්ඩ හුවමාරු කරගැනීම සඳහා ඔබ සතු දේ සහ ඔබට අවශ්‍ය දේ පහතින් ඇතුළත් කරන්න.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. ඔබ ළඟ හුවමාරු කිරීමට ඇත්තේ කුමක්ද? */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    1. ඔබ ළඟ හුවමාරු කිරීමට ඇත්තේ කුමක්ද? <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={exchangeHaveItem}
                    onChange={(e) => {
                      setExchangeHaveItem(e.target.value);
                      if (errors.exchangeHaveItem) setErrors(prev => ({ ...prev, exchangeHaveItem: '' }));
                    }}
                    placeholder="e.g., 6 ශ්‍රේණිය පොත් කට්ටලයක්, සයිකලයක්..."
                    className={`w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-[#06180f] border text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                      errors.exchangeHaveItem
                        ? 'border-rose-500 focus:ring-rose-400'
                        : 'border-slate-300 dark:border-[#1a3826] focus:ring-emerald-500'
                    }`}
                  />
                  {errors.exchangeHaveItem && <p className="text-xs text-rose-500 font-bold">{errors.exchangeHaveItem}</p>}
                </div>

                {/* 2. ඔබ ළඟ කොපමණ තිබේද? */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    2. ඔබ ළඟ කොපමණ තිබේද? <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={exchangeHaveQuantity}
                    onChange={(e) => {
                      setExchangeHaveQuantity(e.target.value);
                      if (errors.exchangeHaveQuantity) setErrors(prev => ({ ...prev, exchangeHaveQuantity: '' }));
                    }}
                    placeholder="e.g., 1ක් / 3ක්"
                    className={`w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-[#06180f] border text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                      errors.exchangeHaveQuantity
                        ? 'border-rose-500 focus:ring-rose-400'
                        : 'border-slate-300 dark:border-[#1a3826] focus:ring-emerald-500'
                    }`}
                  />
                  {errors.exchangeHaveQuantity && <p className="text-xs text-rose-500 font-bold">{errors.exchangeHaveQuantity}</p>}
                </div>

                {/* 3. ඔබට අවශ්‍ය කුමක්ද? */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    3. ඔබට අවශ්‍ය කුමක්ද? <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={exchangeWantItem}
                    onChange={(e) => {
                      setExchangeWantItem(e.target.value);
                      if (errors.exchangeWantItem) setErrors(prev => ({ ...prev, exchangeWantItem: '' }));
                    }}
                    placeholder="e.g., 7 ශ්‍රේණිය පොත් කට්ටලයක්, විදුලි පංකාවක්..."
                    className={`w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-[#06180f] border text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                      errors.exchangeWantItem
                        ? 'border-rose-500 focus:ring-rose-400'
                        : 'border-slate-300 dark:border-[#1a3826] focus:ring-emerald-500'
                    }`}
                  />
                  {errors.exchangeWantItem && <p className="text-xs text-rose-500 font-bold">{errors.exchangeWantItem}</p>}
                </div>

                {/* 4. ඔබට අවශ්‍ය කොපමණ ප්‍රමාණයක්ද? */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    4. ඔබට අවශ්‍ය කොපමණ ප්‍රමාණයක්ද? <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={exchangeWantQuantity}
                    onChange={(e) => {
                      setExchangeWantQuantity(e.target.value);
                      if (errors.exchangeWantQuantity) setErrors(prev => ({ ...prev, exchangeWantQuantity: '' }));
                    }}
                    placeholder="e.g., 1ක් / 2ක්"
                    className={`w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-[#06180f] border text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                      errors.exchangeWantQuantity
                        ? 'border-rose-500 focus:ring-rose-400'
                        : 'border-slate-300 dark:border-[#1a3826] focus:ring-emerald-500'
                    }`}
                  />
                  {errors.exchangeWantQuantity && <p className="text-xs text-rose-500 font-bold">{errors.exchangeWantQuantity}</p>}
                </div>
              </div>

              {/* 5. හුවමාරුව සිදුවන්නේ කෙසේද? */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  5. හුවමාරුව සිදුවන්නේ කෙසේද? <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(['ඇවිත් රැගෙන යන්න', 'ගෙනවිත් දෙන්නම්'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setExchangeMethod(method)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        exchangeMethod === method
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0c1e14] border-slate-200 dark:border-[#163323] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {exchangeMethod === method && <Check className="w-3.5 h-3.5" />}
                      <span>{method}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-slate-200 dark:bg-[#163323]" />

          {/* ======================================================== */}
          {/* SECTION C: LOCATION (ස්ථානය & GPS) */}
          {/* ======================================================== */}
          <div className="space-y-3 bg-slate-50 dark:bg-[#0c1e14] p-4 rounded-2xl border border-slate-200 dark:border-[#163323]">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>ස්ථානය (Location):</span>
              </label>

              {/* Consent Toggle: ස්ථානය Save කිරීමට කැමතිද? */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  ස්ථානය Save කිරීමට කැමතිද?
                </span>
                <button
                  type="button"
                  onClick={() => setSaveLocationConsent(!saveLocationConsent)}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                    saveLocationConsent
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {saveLocationConsent ? 'ඔව් (Yes)' : 'නැත (No)'}
                </button>
              </div>
            </div>

            {saveLocationConsent ? (
              <div className="space-y-2.5 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#06180f] border border-slate-300 dark:border-[#1a3826] text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{selectedLocation?.nameSi || currentLocation?.nameSi}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={isDetectingGps}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                    <span>Auto GPS Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMapTrackerOpen(true)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 text-amber-300" />
                    <span>සිතියම (Map)</span>
                  </button>
                </div>

                {gpsDetectedMsg && (
                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/70 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                    {gpsDetectedMsg}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                ස්ථානය ප්‍රසිද්ධියේ පළ නොකෙරේ. පෞද්ගලිකව සම්බන්ධ වූ පසු දැනුම් දිය හැක.
              </p>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION D: WHATSAPP NUMBER & MORE DETAILS */}
          {/* ======================================================== */}
          <div className="space-y-4">
            
            {/* වට්සැප් අංකය */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                වට්සැප් / දුරකථන අංකය (WhatsApp / Phone): <span className="text-emerald-600 dark:text-emerald-400 text-xs font-normal">(කැමතිනම් පමණක්)</span>
              </label>
              <div className="relative max-w-md">
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => {
                    setWhatsappNumber(e.target.value);
                    if (errors.whatsappNumber) setErrors(prev => ({ ...prev, whatsappNumber: '' }));
                  }}
                  placeholder="077XXXXXXX"
                  className={`w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#06180f] border text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                    errors.whatsappNumber
                      ? 'border-rose-500 focus:ring-rose-400'
                      : 'border-slate-300 dark:border-[#1a3826] focus:ring-purple-500'
                  }`}
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              {errors.whatsappNumber && <p className="text-xs text-rose-500 font-bold">{errors.whatsappNumber}</p>}
            </div>

            {/* පරිත්‍යාග වර්ග තෝරන්න (DONATION CATEGORIES & TAGS SELECTOR) */}
            <div className="space-y-3 bg-slate-50/80 dark:bg-[#081e13] p-4 rounded-2xl border-2 border-purple-200 dark:border-purple-900/60 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>පරිත්‍යාග වර්ග තෝරන්න (Donation Categories)</span>
                </h3>

                {selectedTag && (
                  <span className="text-[11px] font-bold bg-purple-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <span>✓ {selectedTag.tagName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTag(null);
                        setSelectedDonationCatId('');
                      }}
                      className="ml-1 hover:text-rose-200"
                      title="ඉවත් කරන්න"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              {/* Dropdown එක: ප්‍රධාන මාතෘකාවක් තෝරන්න */}
              <div className="space-y-1.5">
                <label htmlFor="donationDropdown" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  ප්‍රධාන මාතෘකාවක් තෝරන්න:
                </label>
                <select
                  id="donationDropdown"
                  value={selectedDonationCatId}
                  onChange={(e) => {
                    const catId = e.target.value;
                    setSelectedDonationCatId(catId);
                    const found = donationCategories.find((c) => c.id === catId);
                    if (found) {
                      setSelectedTag({
                        id: `tag_${found.id}`,
                        tagName: found.name,
                        category: 'පරිත්‍යාග',
                      });
                    } else if (!catId) {
                      setSelectedTag(null);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#04140d] border border-slate-300 dark:border-[#1a3826] text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-xs"
                >
                  <option value="">-- ප්‍රධාන මාතෘකාවක් තෝරන්න --</option>
                  {donationCategories.map((cat, cIdx) => (
                    <option key={`don_cat_opt_${cat.id}_${cIdx}`} value={cat.id} className="dark:bg-[#04140d]">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags Container: තෝරාගත් Tags */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  තෝරාගත් Tags:
                </label>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {donationCategories.map((cat, cIdx) => {
                    const isSelected = selectedTag?.tagName === cat.name || selectedDonationCatId === cat.id;
                    const IconComp = cat.icon;
                    return (
                      <button
                        key={`don_cat_${cat.id}_${cIdx}`}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTag(null);
                            setSelectedDonationCatId('');
                          } else {
                            setSelectedDonationCatId(cat.id);
                            setSelectedTag({
                              id: `tag_${cat.id}`,
                              tagName: cat.name,
                              category: 'පරිත්‍යාග',
                            });
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer select-none active:scale-95 shadow-xs ${
                          isSelected
                            ? 'bg-purple-600 text-white border-2 border-purple-600 ring-2 ring-purple-300 dark:ring-purple-800 shadow-md scale-105'
                            : 'bg-white dark:bg-[#0b2417] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#163323] hover:bg-slate-100 dark:hover:bg-[#123623]'
                        }`}
                      >
                        <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                        <span>{cat.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 ml-0.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expandable Custom / All Community Tags */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <details className="text-xs group">
                  <summary className="cursor-pointer font-bold text-purple-700 dark:text-purple-400 hover:underline inline-flex items-center gap-1">
                    <span>+ වෙනත් පොදු Tags / අලුත් Tag එකක් ඇතුළත් කරන්න</span>
                  </summary>
                  <div className="pt-3">
                    <TagSelector
                      allTags={allTags}
                      tags={allTags}
                      selectedTag={selectedTag}
                      onSelectTag={(t) => {
                        setSelectedTag(t);
                        if (t) {
                          const matched = donationCategories.find((c) => c.name === t.tagName);
                          setSelectedDonationCatId(matched ? matched.id : '');
                        } else {
                          setSelectedDonationCatId('');
                        }
                      }}
                      onTagCreated={(newT) => {
                        setAllTags((prev) => [newT, ...prev]);
                        setSelectedTag(newT);
                      }}
                      lang={lang}
                    />
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* වැඩි විස්තර (More details) */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
              වැඩි විස්තර (More Details):
            </label>
            <textarea
              rows={2}
              value={moreDetails}
              onChange={(e) => setMoreDetails(e.target.value)}
              placeholder="අමතර උපදෙස් හෝ කොන්දේසි වේනම් මෙහි සටහන් කරන්න..."
              className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-[#06180f] border border-slate-300 dark:border-[#1a3826] text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* ======================================================== */}
          {/* SECTION E: LIVE REAL-TIME ADVERTISEMENT PREVIEW */}
          {/* ======================================================== */}
          <div className="p-4 bg-gradient-to-br from-purple-50 via-emerald-50 to-teal-50 dark:from-[#0b1722] dark:via-[#091f14] dark:to-[#07150e] rounded-2xl border-2 border-purple-400/80 dark:border-purple-600/80 space-y-2 shadow-sm">
            <div className="flex items-center justify-between pb-1.5 border-b border-purple-200 dark:border-purple-900/60">
              <span className="text-xs font-black text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>දැන්වීම පෙනෙන ආකාරය (Live Preview):</span>
              </span>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-600 text-white font-mono">
                {purpose === 'donation' ? '🎁 පරිත්‍යාගයකි' : purpose === 'giveaway' ? '♻️ ඉවත් කිරීමට නියමිතයි' : '🔄 හුවමාරු කිරීමට'}
              </span>
            </div>

            <div className="p-3 bg-white/90 dark:bg-[#06180f] rounded-xl border border-purple-200 dark:border-purple-900/60 text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed space-y-2">
              <p>{generateNarrative()}</p>
              
              <div className="text-xs pt-1 border-t border-purple-100 dark:border-purple-950/80 space-y-1 text-slate-700 dark:text-slate-300">
                <p><strong className="text-purple-900 dark:text-purple-300">ස්ථානය :-</strong> {effectiveLocationName}</p>
                {whatsappNumber && (
                  <p><strong className="text-purple-900 dark:text-purple-300">මා සම්බන්ධ කරගැනීමට:</strong> {whatsappNumber}</p>
                )}
                {moreDetails && (
                  <p><strong className="text-purple-900 dark:text-purple-300">වැඩි විස්තර:</strong> {moreDetails}</p>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SUBMIT BUTTON (පළකරන්න) */}
          {/* ======================================================== */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-emerald-700 to-teal-800 hover:from-purple-800 hover:to-teal-900 text-white font-black text-sm sm:text-base shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2 border border-purple-400/40"
            >
              <Gift className="w-5 h-5 text-amber-300" />
              <span>{editPost ? 'වෙනස්කම් සුරකින්න (Save Changes)' : 'පළකරන්න (Publish Post)'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Map location picker modal */}
      {isMapTrackerOpen && (
        <MapLocationTracker
          isOpen={isMapTrackerOpen}
          onClose={() => setIsMapTrackerOpen(false)}
          initialLat={selectedLocation.lat}
          initialLng={selectedLocation.lng}
          onLocationSelected={(lat, lng, locName) => {
            setSelectedLocation({
              id: `custom_${Date.now()}`,
              nameSi: locName || 'සිතියමෙන් තෝරාගත් ස්ථානය',
              nameEn: locName || 'Selected Location',
              nameTa: locName || 'தேர்ந்தெடுக்கப்பட்ட இடம்',
              lat,
              lng,
            });
            setIsMapTrackerOpen(false);
          }}
        />
      )}
    </div>
  );
};
