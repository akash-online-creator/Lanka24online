import React, { useState, useEffect } from 'react';
import { 
  Search, 
  AlertCircle, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Home, 
  Calendar, 
  Clock, 
  Gift, 
  CheckCircle2, 
  X, 
  Tag, 
  User as UserIcon, 
  DollarSign, 
  Truck, 
  ShieldCheck, 
  Sparkles,
  Map as MapIcon
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User, TagItem } from '../types';
import { TagSelector } from './TagSelector';
import { getStoredTags } from '../utils/tagUtils';
import { MapLocationTracker } from './MapLocationTracker';
import { getPostRateLimitStatus, recordPostSubmission } from '../utils/rateLimiter';

interface FindForMeModalProps {
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

export type FindForMeType = 'lost' | 'stolen' | 'find';

export const FindForMeModal: React.FC<FindForMeModalProps> = ({
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
  // 01. Sub-type Selection ('lost' | 'stolen' | 'find')
  const [subType, setSubType] = useState<FindForMeType>('lost');

  // Common Item name / search query
  const [itemName, setItemName] = useState(''); // නැතිවූ/සොරාගත්/සොයන දෙය

  // Incident details (For lost & stolen)
  const [incidentLocation, setIncidentLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentTime, setIncidentTime] = useState('');

  // Procurement details (For 'find')
  const [targetPrice, setTargetPrice] = useState('');
  const [quantityNeeded, setQuantityNeeded] = useState('');
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  
  // Delivery options (For 'find')
  const deliveryOptionList = [
    'ගෙනවිත් දෙන්න ඒ සඳහා මම ඔබට වෙනම ගෙවන්නම්',
    'ගෙනවිත් දීමට අමතර ගාස්තුවක් ලබාදෙන්නේ නැත',
    'ඇවිත් රැගෙන යන්නම්',
    'මා හට එවන්න මම මුදල් දී ගන්නම්',
    'ඔබ මුදල් දී එවන්න මම ගන්නම්',
    'වෙනත්',
  ];
  const [deliveryOption, setDeliveryOption] = useState<string>(deliveryOptionList[0]);
  const [customDeliveryDetail, setCustomDeliveryDetail] = useState('');

  // Reward info (For lost & stolen)
  const [hasReward, setHasReward] = useState(false);
  const [rewardDetails, setRewardDetails] = useState('');

  // Identifying info on item (Phone, ID, Reg/Serial No, or Name)
  const [identifyingInfo, setIdentifyingInfo] = useState('');

  // Contact info
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '');
  const [contactWhatsapp, setContactWhatsapp] = useState(currentUser?.whatsappNumber || currentUser?.phone || '');
  const [contactAddress, setContactAddress] = useState(currentUser?.address || '');

  // Map location state
  const [selectedLocation, setSelectedLocation] = useState<LocationOption>(currentLocation);
  const [isMapTrackerOpen, setIsMapTrackerOpen] = useState(false);

  // Other details
  const [otherDetails, setOtherDetails] = useState('');

  // Confirmations (Requirement 03)
  const [isFeeConfirmed, setIsFeeConfirmed] = useState(false);
  const [isWhatsAppConfirmed, setIsWhatsAppConfirmed] = useState(false);

  // Tags
  const [allTags, setAllTags] = useState<TagItem[]>(() => getStoredTags());
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      const tags = getStoredTags();
      setAllTags(tags);

      if (editPost) {
        // Pre-populate with existing data
        let initialType: FindForMeType = 'lost';
        if (editPost.findForMeType) {
          initialType = editPost.findForMeType as FindForMeType;
        } else if (editPost.whatHappened?.includes('සොරාගත්') || editPost.whatIsNeeded?.includes('සොරාගත්')) {
          initialType = 'stolen';
        } else if (editPost.whatHappened?.includes('අවශ්‍යයි') || editPost.whatIsNeeded?.includes('අවශ්‍යයි') || editPost.whatHappened?.includes('සොයන')) {
          initialType = 'find';
        }
        setSubType(initialType);

        // Item Name
        const extractedItemName = editPost.itemLostStolenOrSearched || 
          (editPost.whatIsNeeded ? editPost.whatIsNeeded.replace(/^(නැතිවූ|සොරාගත්|සොයන|අවශ්‍ය)\s*/i, '').replace(/\s*සොයාදෙන්න\.?$/i, '').replace(/පිළිබඳ තොරතුරු සොයාදෙන්න\.?/i, '').trim() : '') ||
          '';
        setItemName(extractedItemName);

        setIncidentLocation(editPost.incidentLocation || editPost.locationName || '');
        setIncidentDate(editPost.incidentDate || (editPost.createdAt ? '' : new Date().toISOString().split('T')[0]));
        setIncidentTime(editPost.incidentTime || '10:00');

        setTargetPrice(editPost.targetPrice || (editPost.payment?.startsWith('රු.') ? editPost.payment.replace('රු.', '').replace('/=', '').trim() : ''));
        setQuantityNeeded(editPost.quantityNeeded || '1');
        setHasDeadline(Boolean(editPost.hasDeadline || editPost.deadlineDate));
        setDeadlineDate(editPost.deadlineDate || '');
        setDeadlineTime(editPost.deadlineTime || '18:00');

        if (editPost.deliveryOption) {
          if (deliveryOptionList.includes(editPost.deliveryOption)) {
            setDeliveryOption(editPost.deliveryOption);
          } else {
            setDeliveryOption('වෙනත්');
            setCustomDeliveryDetail(editPost.deliveryOption);
          }
        } else if (editPost.otherDeliveryDetails) {
          setDeliveryOption('වෙනත්');
          setCustomDeliveryDetail(editPost.otherDeliveryDetails);
        }

        setHasReward(Boolean(editPost.hasReward || (editPost.rewardDetails && editPost.rewardDetails.trim() !== '' && editPost.rewardDetails !== 'ත්‍යාග නැත')));
        setRewardDetails(editPost.rewardDetails && editPost.rewardDetails !== 'ත්‍යාග නැත' ? editPost.rewardDetails : '');
        setIdentifyingInfo(editPost.identifyingInfo || '');

        setContactPhone(editPost.contactPhone || editPost.userPhone || currentUser?.phone || '');
        setContactWhatsapp(editPost.contactWhatsapp || editPost.userPhone || currentUser?.whatsappNumber || currentUser?.phone || '');
        setContactAddress(editPost.contactAddress || currentUser?.address || '');
        setOtherDetails(editPost.otherDetails || '');

        setIsFeeConfirmed(true);
        setIsWhatsAppConfirmed(true);

        if (editPost.lat && editPost.lng) {
          setSelectedLocation({
            id: 'custom_loc',
            nameSi: editPost.locationName || currentLocation.nameSi,
            nameEn: editPost.locationName || currentLocation.nameEn,
            lat: editPost.lat,
            lng: editPost.lng,
            district: currentLocation.district,
          });
        } else {
          setSelectedLocation(currentLocation);
        }

        if (editPost.tagName) {
          const foundTag = tags.find(t => t.tagName === editPost.tagName) || {
            id: editPost.tagId || 'tag_find',
            tagName: editPost.tagName,
            category: editPost.tagCategory || 'සොයාදෙන්න'
          };
          setSelectedTag(foundTag);
        } else {
          setSelectedTag(null);
        }
      } else {
        // Clear all fields for new post
        setSubType('lost');
        setItemName('');
        setIncidentLocation('');
        setIncidentDate('');
        setIncidentTime('');
        setTargetPrice('');
        setQuantityNeeded('');
        setHasDeadline(false);
        setDeadlineDate('');
        setDeadlineTime('');
        setDeliveryOption(deliveryOptionList[0]);
        setCustomDeliveryDetail('');
        setHasReward(false);
        setRewardDetails('');
        setIdentifyingInfo('');
        setOtherDetails('');
        setSelectedLocation(currentLocation);
        setContactPhone(currentUser?.phone || '');
        setContactWhatsapp(currentUser?.whatsappNumber || currentUser?.phone || '');
        setContactAddress(currentUser?.address || '');
        setIsFeeConfirmed(false);
        setIsWhatsAppConfirmed(false);
        setSelectedTag(null);
        setErrors({});
      }
    }
  }, [isOpen, editPost, currentLocation, currentUser]);

  if (!isOpen) return null;

  const validateForm = () => {
    const errs: { [key: string]: string } = {};

    if (!selectedTag) {
      errs.selectedTag = 'දැන්වීම සඳහා Tag එකක් තෝරන්න (අනිවාර්යයි *).';
    }

    if (!itemName.trim()) {
      if (subType === 'lost') errs.itemName = 'නැතිවූ දේ ඇතුළත් කිරීම අනිවාර්යයි.';
      else if (subType === 'stolen') errs.itemName = 'සොරාගත් දේ ඇතුළත් කිරීම අනිවාර්යයි.';
      else errs.itemName = 'ඔබ සොයන දේ ඇතුළත් කිරීම අනිවාර්යයි.';
    }

    if (subType === 'lost' || subType === 'stolen') {
      if (!incidentLocation.trim()) {
        errs.incidentLocation = 'සිදුවීම වූ ස්ථානය ඇතුළත් කරන්න.';
      }
      if (!incidentDate) {
        errs.incidentDate = 'දිනය තෝරන්න.';
      }
    }

    if (subType === 'find') {
      if (hasDeadline && !deadlineDate) {
        errs.deadlineDate = 'අවසන් දිනය ඇතුළත් කරන්න.';
      }
      if (deliveryOption === 'වෙනත්' && !customDeliveryDetail.trim()) {
        errs.customDeliveryDetail = 'වෙනත් විස්තරය ඇතුළත් කරන්න.';
      }
    }

    if (hasReward && !rewardDetails.trim()) {
      errs.rewardDetails = 'ලබාදෙන තෑග්ග/ත්‍යාගය පිළිබඳ විස්තරය ඇතුළත් කරන්න.';
    }

    if (!contactPhone.trim()) {
      errs.contactPhone = 'දුරකථන අංකය අනිවාර්යයි.';
    }

    if (!contactWhatsapp.trim()) {
      errs.contactWhatsapp = 'වට්සැප් අංකය අනිවාර්යයි.';
    }

    if (!isFeeConfirmed) {
      errs.isFeeConfirmed = 'රු. 50 ඇප් ගාස්තුව තහවුරු කරන්න.';
    }

    if (!isWhatsAppConfirmed) {
      errs.isWhatsAppConfirmed = 'වට්සැප් අංකය සක්‍රීය බව තහවුරු කරන්න.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!editPost) {
      const rateStatus = getPostRateLimitStatus(contactPhone.trim() || currentUser?.phone || 'user');
      if (rateStatus.isCoolingDown) {
        setErrors((prev) => ({
          ...prev,
          rateLimit: `⏱️ ${rateStatus.messageSi}`,
        }));
        return;
      }
    }

    // Construct narrative texts strictly aligned with user specifications
    let structuredWhatHappened = '';
    let structuredWhatIsNeeded = '';
    const finalDelivery = deliveryOption === 'වෙනත්' ? (customDeliveryDetail.trim() || 'වෙනත් ක්‍රමයක්') : deliveryOption;

    if (subType === 'lost') {
      structuredWhatHappened = `${incidentDate || 'අද'} දින, ${incidentTime ? `${incidentTime} පමණ, ` : ''}${incidentLocation.trim()} දී, ${itemName.trim()} නැතිවී ඇත. සොයාගත් කෙනෙක් වේනම් ${contactPhone.trim() || contactWhatsapp.trim()} හරහා මා සම්බන්ධ කරගන්න. නැතිනම් ${contactAddress.trim() || 'ගෙදර ලිපිනය'} ට එවන්න.`;
      structuredWhatIsNeeded = `නැතිවූ ${itemName.trim()} සොයාදෙන්න.`;
    } else if (subType === 'stolen') {
      structuredWhatHappened = `${incidentDate || 'අද'} දින, ${incidentTime ? `${incidentTime} පමණ, ` : ''}${incidentLocation.trim()} දී, ${itemName.trim()} සොරාගෙන ඇත. සොයාගත් කෙනෙක් වේනම් ${contactPhone.trim() || contactWhatsapp.trim()} හරහා මා සම්බන්ධ කරගන්න. නැතිනම් ${contactAddress.trim() || 'ගෙදර ලිපිනය'} ට එවන්න.`;
      structuredWhatIsNeeded = `සොරාගත් ${itemName.trim()} පිළිබඳ තොරතුරු සොයාදෙන්න.`;
    } else {
      structuredWhatHappened = `${targetPrice.trim() ? `${targetPrice.trim()} පමණ, ` : ''}${itemName.trim()} ${quantityNeeded.trim() ? `${quantityNeeded.trim()} ` : ''}අවශ්‍යයි.${hasDeadline && deadlineDate ? ` ${deadlineDate}${deadlineTime ? ` (${deadlineTime})` : ''} පෙර සොයාදෙන්න.` : ''}`;
      structuredWhatIsNeeded = `${itemName.trim()} සොයාදෙන්න.`;
    }

    if (editPost) {
      const updatedPost: HelpPost = {
        ...editPost,
        userName: currentUser?.name || editPost.userName || 'ගිණුම් හිමියා',
        userPhone: contactWhatsapp.trim() || contactPhone.trim() || editPost.userPhone,
        whatHappened: structuredWhatHappened,
        whatIsNeeded: structuredWhatIsNeeded,
        conditions: subType === 'find'
          ? `ගණුදෙනුව සිදුවියයුතු ආකාරය: ${finalDelivery}`
          : `සම්බන්ධ කරගැනීම - දුරකථන: ${contactPhone.trim()}, WhatsApp: ${contactWhatsapp.trim()}${contactAddress.trim() ? `, ලිපිනය: ${contactAddress.trim()}` : ''}`,
        transport: subType === 'find' ? finalDelivery : 'සෘජු සම්බන්ධතා ලබාගන්න',
        payment: subType === 'find' 
          ? (targetPrice.trim() ? `රු. ${targetPrice.trim()}` : 'සාකච්ඡා කරගත හැක') 
          : (hasReward ? `ත්‍යාගය: ${rewardDetails.trim()}` : 'ත්‍යාග නැත'),
        locationName: `${selectedLocation.nameSi} (${selectedLocation.nameEn})`,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        category: 'find_for_me',
        tagName: selectedTag?.tagName || 'සොයාදෙන්න',
        tagCategory: selectedTag?.category || 'සොයාදෙන්න',
        tagId: selectedTag?.id || 'tag_find',
        
        // Extended fields
        findForMeType: subType,
        itemLostStolenOrSearched: itemName.trim(),
        incidentLocation: incidentLocation.trim(),
        incidentDate,
        incidentTime,
        contactPhone: contactPhone.trim(),
        contactWhatsapp: contactWhatsapp.trim(),
        contactAddress: contactAddress.trim(),
        hasReward,
        rewardDetails: hasReward ? rewardDetails.trim() : '',
        identifyingInfo: identifyingInfo.trim(),
        targetPrice: targetPrice.trim(),
        quantityNeeded: quantityNeeded.trim(),
        hasDeadline,
        deadlineDate,
        deadlineTime,
        deliveryOption: finalDelivery,
        otherDeliveryDetails: customDeliveryDetail.trim(),
        otherDetails: otherDetails.trim(),
        feeAgreed: true,
      };

      if (onUpdatePost) {
        onUpdatePost(updatedPost);
      }
      onClose();
      return;
    }

    onSubmitPost({
      userName: currentUser?.name || 'ගිණුම් හිමියා',
      userPhone: contactWhatsapp.trim() || contactPhone.trim(),
      whatHappened: structuredWhatHappened,
      whatIsNeeded: structuredWhatIsNeeded,
      conditions: subType === 'find'
        ? `ගණුදෙනුව සිදුවියයුතු ආකාරය: ${finalDelivery}`
        : `සම්බන්ධ කරගැනීම - දුරකථන: ${contactPhone.trim()}, WhatsApp: ${contactWhatsapp.trim()}${contactAddress.trim() ? `, ලිපිනය: ${contactAddress.trim()}` : ''}`,
      transport: subType === 'find' ? finalDelivery : 'සෘජු සම්බන්ධතා ලබාගන්න',
      payment: subType === 'find' 
        ? (targetPrice.trim() ? `රු. ${targetPrice.trim()}` : 'සාකච්ඡා කරගත හැක') 
        : (hasReward ? `ත්‍යාගය: ${rewardDetails.trim()}` : 'ත්‍යාග නැත'),
      locationName: `${selectedLocation.nameSi} (${selectedLocation.nameEn})`,
      distanceKm: 0.5,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      verifiedOtp: true,
      category: 'find_for_me',
      tagName: selectedTag?.tagName || 'සොයාදෙන්න',
      tagCategory: selectedTag?.category || 'සොයාදෙන්න',
      tagId: selectedTag?.id || 'tag_find',
      
      // Extended fields
      findForMeType: subType,
      itemLostStolenOrSearched: itemName.trim(),
      incidentLocation: incidentLocation.trim(),
      incidentDate,
      incidentTime,
      contactPhone: contactPhone.trim(),
      contactWhatsapp: contactWhatsapp.trim(),
      contactAddress: contactAddress.trim(),
      hasReward,
      rewardDetails: hasReward ? rewardDetails.trim() : '',
      identifyingInfo: identifyingInfo.trim(),
      targetPrice: targetPrice.trim(),
      quantityNeeded: quantityNeeded.trim(),
      hasDeadline,
      deadlineDate,
      deadlineTime,
      deliveryOption: finalDelivery,
      otherDeliveryDetails: customDeliveryDetail.trim(),
      otherDetails: otherDetails.trim(),
      feeAgreed: true,
    });

    recordPostSubmission(contactPhone.trim() || currentUser?.phone || 'user');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fadeIn p-3 sm:p-5 flex justify-center items-start">
        <div className="w-full max-w-2xl bg-white dark:bg-[#07130c] border border-slate-200 dark:border-[#193d27] rounded-3xl shadow-2xl overflow-hidden my-4 sm:my-8 text-slate-900 dark:text-slate-100 flex flex-col">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-5 sm:p-6 text-white border-b border-emerald-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>{editPost ? 'සොයාදෙන්න දැන්වීම සංස්කරණය' : 'සොයාදෙන්න'}</span>
                  <span className="text-xs bg-emerald-500/30 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-400/30">
                    {editPost ? `#${editPost.postCode}` : 'Find For Me'}
                  </span>
                </h2>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  {editPost 
                    ? 'ඔබ පළ කළ දැන්වීමේ තොරතුරු යාවත්කාලීන කර සුරකින්න' 
                    : 'නැතිවූ, සොරාගත් හෝ ඔබ සොයන දෙයක් පිළිබඳ ඉල්ලීමක් ඉදිරිපත් කරන්න'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[82vh]">

            {/* Account Owner Badge (Required) */}
            <div className="bg-emerald-50 dark:bg-[#0d2216] border border-emerald-200 dark:border-[#1a442b] p-3.5 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                    ගිණුම් හිමියාගේ නම (Account Owner)
                  </span>
                  <strong className="text-sm font-black text-slate-900 dark:text-white">
                    {currentUser?.name || 'ගිණුම් හිමියා'}
                  </strong>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-300 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>සනාථයි</span>
              </span>
            </div>

            {errors.rateLimit && (
              <div className="p-3.5 bg-amber-500/20 border border-amber-500/50 rounded-2xl text-amber-300 text-xs font-bold flex items-center gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{errors.rateLimit}</span>
              </div>
            )}

            {/* 01. Sub-type selector (3 Choices) */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                01. ඉල්ලීම් වර්ගය තෝරන්න <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setSubType('lost')}
                  className={`p-3 rounded-2xl border text-xs sm:text-sm font-extrabold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    subType === 'lost'
                      ? 'bg-rose-500 text-white border-rose-600 shadow-md scale-[1.02]'
                      : 'bg-slate-100 dark:bg-[#0d1f15] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1a3824] hover:bg-rose-50 dark:hover:bg-rose-950/30'
                  }`}
                >
                  <span className="text-base">🔴</span>
                  <span>නැතිවූ දෙයක්</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubType('stolen')}
                  className={`p-3 rounded-2xl border text-xs sm:text-sm font-extrabold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    subType === 'stolen'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-md scale-[1.02]'
                      : 'bg-slate-100 dark:bg-[#0d1f15] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1a3824] hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  }`}
                >
                  <span className="text-base">⚠️</span>
                  <span>සොරාගත් දෙයක්</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubType('find')}
                  className={`p-3 rounded-2xl border text-xs sm:text-sm font-extrabold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    subType === 'find'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-[1.02]'
                      : 'bg-slate-100 dark:bg-[#0d1f15] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1a3824] hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  }`}
                >
                  <span className="text-base">🔍</span>
                  <span>සොයාදෙන්න</span>
                </button>
              </div>
            </div>

            {/* 02. Dynamic Form based on selection */}
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-[#163522]">

              {/* Tag Selector */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                  ටැග් එක තෝරන්න (Tag) <span className="text-rose-500">*</span>
                </label>
                <TagSelector
                  allTags={allTags}
                  tags={allTags}
                  selectedTag={selectedTag}
                  onSelectTag={(t) => {
                    setSelectedTag(t);
                    if (errors.selectedTag) setErrors(prev => ({ ...prev, selectedTag: '' }));
                  }}
                  onTagCreated={(newT) => {
                    setAllTags(prev => [newT, ...prev]);
                    setSelectedTag(newT);
                    if (errors.selectedTag) setErrors(prev => ({ ...prev, selectedTag: '' }));
                  }}
                  errorMsg={errors.selectedTag}
                  lang={lang}
                />
              </div>

              {/* Form for LOST or STOLEN */}
              {(subType === 'lost' || subType === 'stolen') && (
                <>
                  {/* 1. නැතිවුනේ / සොරාගත්තේ කුමක්ද? */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                      1. {subType === 'lost' ? 'නැතිවුනේ කුමක්ද?' : 'සොරාගත්තේ කුමක්ද?'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder={subType === 'lost' ? 'උදා: රන් මාලයක්, ලේඛන ගොනුවක්, ජංගම දුරකථනය...' : 'උදා: මෝටර් බයිසිකලය (WP BXX-XXXX), ලැප්ටොප් පරිගණකය...'}
                      className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {errors.itemName && <p className="text-xs text-rose-500 font-bold mt-1">{errors.itemName}</p>}
                  </div>

                  {/* 2. නැතිවුන / සොරාගත් ස්ථානය */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                      2. {subType === 'lost' ? 'නැතිවුන ස්ථානය කොහෙද?' : 'සොරාගත් ස්ථානය කොහෙද?'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={incidentLocation}
                      onChange={(e) => setIncidentLocation(e.target.value)}
                      placeholder="උදා: කඩවත බස් නැවතුම්පොළ අසල, නිවස ඉදිරිපිට..."
                      className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {errors.incidentLocation && <p className="text-xs text-rose-500 font-bold mt-1">{errors.incidentLocation}</p>}
                  </div>

                  {/* 3 & 4. කවදද? කියටද? */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span>3. {subType === 'lost' ? 'නැතිවුනේ කවදද?' : 'සිදුවීම වුණේ කවදද?'}</span> <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={incidentDate}
                        onChange={(e) => setIncidentDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {errors.incidentDate && <p className="text-xs text-rose-500 font-bold mt-1">{errors.incidentDate}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>4. කීයටද මේ සිදුවීම සිදුවුණේ?</span>
                      </label>
                      <input
                        type="time"
                        value={incidentTime}
                        onChange={(e) => setIncidentTime(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* 5. නැති වූ දේ ඇති දුරකථන අංකයක්, හැඳුනුම්පත් අංකයක් හෝ එහි ඇති අංකයක් හෝ නමක් */}
                  <div className="bg-amber-500/10 dark:bg-amber-950/30 border-2 border-amber-400/60 dark:border-amber-700/60 p-3.5 rounded-2xl space-y-2">
                    <label className="block text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5 leading-snug">
                      <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>නැති වූ දේ ඇති දුරකථන අංකයක්, හැඳුනුම්පත් අංකයක් හෝ එහි ඇති අංකයක් හෝ නමක් සඳහන් කරන්න</span>
                    </label>
                    <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed font-medium">
                      💡 සොයාගත් පුද්ගලයාට අයිතිකරු ඔබ බව පහසුවෙන් හඳුනාගැනීමට හා ඉක්මනින් ඔබට භාරදීමට මෙය උපකාරී වේ.
                    </p>
                    <input
                      type="text"
                      value={identifyingInfo}
                      onChange={(e) => setIdentifyingInfo(e.target.value)}
                      placeholder="උදා: එහි ඇති දුරකථන අංකය, NIC අංකය, නම, Serial / Model අංකය, ලියාපදිංචි අංකය..."
                      className="w-full bg-white dark:bg-[#081b10] border border-amber-300 dark:border-amber-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </>
              )}

              {/* Form for FIND */}
              {subType === 'find' && (
                <>
                  {/* 1. ඔබ සොයන්නේ කුමක්ද? */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                      1. ඔබ සොයන්නේ කුමක්ද? <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="උදා: පරණ වෝටර් පොම්පයක්, ලී කපාගැනීමට කියතක්, විශේෂ උපකරණයක්..."
                      className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {errors.itemName && <p className="text-xs text-rose-500 font-bold mt-1">{errors.itemName}</p>}
                  </div>

                  {/* 2 & 3. වටිනාකම & ප්‍රමාණය */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span>2. කොපමණ වටිනාකමකින්ද?</span>
                      </label>
                      <input
                        type="text"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        placeholder="උදා: රු. 5,000 / සාකච්ඡා කරගත හැක"
                        className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                        3. කොපමණ අවශ්‍යද?
                      </label>
                      <input
                        type="text"
                        value={quantityNeeded}
                        onChange={(e) => setQuantityNeeded(e.target.value)}
                        placeholder="උදා: 1 යි, 2 යි, කිලෝ 5 යි"
                        className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* 4. ලබාදීමට අවසන් දිනයක් තිබේද? */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0b1d13] border border-slate-200 dark:border-[#183a25] space-y-2">
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                      4. ලබාදීමට අවසන් දිනයක් තිබේද?
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                        <input
                          type="radio"
                          name="hasDeadline"
                          checked={!hasDeadline}
                          onChange={() => setHasDeadline(false)}
                          className="accent-emerald-600 w-4 h-4"
                        />
                        <span>නැත (No)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                        <input
                          type="radio"
                          name="hasDeadline"
                          checked={hasDeadline}
                          onChange={() => setHasDeadline(true)}
                          className="accent-emerald-600 w-4 h-4"
                        />
                        <span>ඔව් (Yes)</span>
                      </label>
                    </div>

                    {hasDeadline && (
                      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            දිනය (Deadline Date) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={deadlineDate}
                            onChange={(e) => setDeadlineDate(e.target.value)}
                            className="w-full bg-white dark:bg-[#07130c] border border-slate-300 dark:border-[#193d27] rounded-xl px-3 py-2 text-xs font-semibold"
                          />
                          {errors.deadlineDate && <p className="text-xs text-rose-500 font-bold mt-1">{errors.deadlineDate}</p>}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            වේලාව (Deadline Time)
                          </label>
                          <input
                            type="time"
                            value={deadlineTime}
                            onChange={(e) => setDeadlineTime(e.target.value)}
                            className="w-full bg-white dark:bg-[#07130c] border border-slate-300 dark:border-[#193d27] rounded-xl px-3 py-2 text-xs font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 5. මා සම්බන්ධ කරගතහැකි ක්‍රම */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  5. මා සම්බන්ධ කරගතහැකි ක්‍රම <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      <span>දුරකථන අංකය</span> <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="077XXXXXXX"
                      className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2 text-sm font-semibold"
                    />
                    {errors.contactPhone && <p className="text-xs text-rose-500 font-bold mt-1">{errors.contactPhone}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                      <span>වට්සැප් අංකය</span> <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={contactWhatsapp}
                      onChange={(e) => setContactWhatsapp(e.target.value)}
                      placeholder="077XXXXXXX"
                      className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2 text-sm font-semibold"
                    />
                    {errors.contactWhatsapp && <p className="text-xs text-rose-500 font-bold mt-1">{errors.contactWhatsapp}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Home className="w-3.5 h-3.5 text-emerald-500" />
                    <span>ගෙදර ලිපිනය (Home Address)</span>
                  </label>
                  <input
                    type="text"
                    value={contactAddress}
                    onChange={(e) => setContactAddress(e.target.value)}
                    placeholder="ලිපිනය ඇතුළත් කරන්න..."
                    className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2 text-sm font-semibold"
                  />
                </div>
              </div>

              {/* 6. ස්ථානය Map එකෙන් Save කිරීම */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>6. ස්ථානය Map එකෙන් Save කරන්න</span>
                </label>
                
                <div className="bg-slate-50 dark:bg-[#09170e] border border-slate-200 dark:border-[#193e27] p-3.5 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {selectedLocation.nameSi} ({selectedLocation.nameEn})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      GPS: {selectedLocation.lat?.toFixed(4)}, {selectedLocation.lng?.toFixed(4)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMapTrackerOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform shrink-0"
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Map එකෙන් තෝරන්න</span>
                  </button>
                </div>
              </div>

              {/* 7. වෙනත් තොරතුරු */}
              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                  7. වෙනත් තොරතුරු (Other details)
                </label>
                <textarea
                  rows={2}
                  value={otherDetails}
                  onChange={(e) => setOtherDetails(e.target.value)}
                  placeholder="වෙනත් ඕනෑම විශේෂ තොරතුරක් ඇතුළත් කරන්න..."
                  className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 8. Extra Specific Section based on subType */}
              {(subType === 'lost' || subType === 'stolen') && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-[#1a1c0d] border border-amber-200 dark:border-[#383a15] space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-amber-900 dark:text-amber-300">
                    <input
                      type="checkbox"
                      checked={hasReward}
                      onChange={(e) => setHasReward(e.target.checked)}
                      className="accent-amber-600 w-4 h-4 rounded"
                    />
                    <Gift className="w-4 h-4 text-amber-600" />
                    <span>8. සොයාදෙන්නාට සතුටෙන් දෙයක් ලබාදෙන්නේ නම් මෙහි සලකුණු කරන්න</span>
                  </label>

                  {hasReward && (
                    <div className="pt-2 animate-fadeIn">
                      <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-200 mb-1">
                        ලබාදෙන තෑග්ග / ත්‍යාගය පිළිබඳ විස්තර <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={rewardDetails}
                        onChange={(e) => setRewardDetails(e.target.value)}
                        placeholder="උදා: රු. 10,000 ක මුදල් ත්‍යාගයක් ලබාදෙමි"
                        className="w-full bg-white dark:bg-[#08120a] border border-amber-300 dark:border-[#383a15] rounded-xl px-3 py-2 text-xs font-semibold"
                      />
                      {errors.rewardDetails && <p className="text-xs text-rose-500 font-bold mt-1">{errors.rewardDetails}</p>}
                    </div>
                  )}
                  {!hasReward && (
                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400/70 italic">
                      *(මෙයට Tick එක නොදමන්නේ නම් මෙම තොරතුරු දැන්වීමේ පෙන්වන්නේ නැත)*
                    </p>
                  )}
                </div>
              )}

              {subType === 'find' && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-[#0b1d13] border border-emerald-200 dark:border-[#183a25] space-y-2">
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>8. බෙදාහැරීමේ / භාරගැනීමේ කොන්දේසිය තෝරන්න <span className="text-rose-500">*</span></span>
                  </label>

                  <div className="space-y-1.5">
                    {deliveryOptionList.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 p-1.5 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors">
                        <input
                          type="radio"
                          name="deliveryOption"
                          value={opt}
                          checked={deliveryOption === opt}
                          onChange={() => setDeliveryOption(opt)}
                          className="accent-emerald-600 w-4 h-4"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>

                  {deliveryOption === 'වෙනත්' && (
                    <div className="pt-2 animate-fadeIn">
                      <input
                        type="text"
                        value={customDeliveryDetail}
                        onChange={(e) => setCustomDeliveryDetail(e.target.value)}
                        placeholder="වෙනත් විස්තරය මෙහි සටහන් කරන්න..."
                        className="w-full bg-white dark:bg-[#07130c] border border-emerald-300 dark:border-[#193d27] rounded-xl px-3 py-2 text-xs font-semibold"
                      />
                      {errors.customDeliveryDetail && <p className="text-xs text-rose-500 font-bold mt-1">{errors.customDeliveryDetail}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* 03. Confirmations */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-[#183d26]">

                {/* App fee confirmation */}
                <div className={`p-3.5 rounded-2xl border transition-colors ${
                  isFeeConfirmed 
                    ? 'bg-emerald-50 dark:bg-[#0c2417] border-emerald-300 dark:border-emerald-700' 
                    : 'bg-rose-50 dark:bg-[#200d0d] border-rose-200 dark:border-rose-900/60'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeeConfirmed}
                      onChange={(e) => setIsFeeConfirmed(e.target.checked)}
                      className="accent-emerald-600 w-5 h-5 rounded mt-0.5 shrink-0"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        ගාස්තු තහවුරු කිරීම (Fee Confirmation) <span className="text-rose-500">*</span>
                      </span>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        ඇප් ගාස්තු ලෙස රු. 50 ක් අයවේ. ගාස්තුව අය කරගන්නද?
                      </p>
                    </div>
                  </label>
                  {errors.isFeeConfirmed && <p className="text-xs text-rose-500 font-bold mt-1.5">{errors.isFeeConfirmed}</p>}
                </div>

                {/* WhatsApp confirmation */}
                <div className={`p-3.5 rounded-2xl border transition-colors ${
                  isWhatsAppConfirmed 
                    ? 'bg-emerald-50 dark:bg-[#0c2417] border-emerald-300 dark:border-emerald-700' 
                    : 'bg-rose-50 dark:bg-[#200d0d] border-rose-200 dark:border-rose-900/60'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isWhatsAppConfirmed}
                      onChange={(e) => setIsWhatsAppConfirmed(e.target.checked)}
                      className="accent-emerald-600 w-5 h-5 rounded mt-0.5 shrink-0"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        වට්සැප් තහවුරු කිරීම (WhatsApp Confirmation) <span className="text-rose-500">*</span>
                      </span>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        ඔබ ලබා දී ඇති මෙම වට්සැප් අංකය (<strong className="text-emerald-600 dark:text-emerald-400">{contactWhatsapp || 'නොදක්වා ඇත'}</strong>) වැඩද?
                      </p>
                    </div>
                  </label>
                  {errors.isWhatsAppConfirmed && <p className="text-xs text-rose-500 font-bold mt-1.5">{errors.isWhatsAppConfirmed}</p>}
                </div>

              </div>

              {/* 04. Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{editPost ? 'වෙනස්කම් සුරකින්න (Save Changes)' : 'තහවුරු කර දැන්වීම පළ කරන්න'}</span>
                </button>
              </div>

            </div>

          </form>

        </div>
      </div>

      {/* Map Location Tracker Modal */}
      {isMapTrackerOpen && (
        <MapLocationTracker
          isOpen={isMapTrackerOpen}
          onClose={() => setIsMapTrackerOpen(false)}
          currentLocation={selectedLocation}
          availableLocations={availableLocations}
          onSaveLocation={(loc) => {
            setSelectedLocation(loc);
            setIsMapTrackerOpen(false);
          }}
          lang={lang}
        />
      )}
    </>
  );
};
