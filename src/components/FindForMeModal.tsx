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

export type FindForMeType = 'lost' | 'stolen' | 'find' | 'found';

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
  const getLangText = (si: string, en: string, ta: string) => {
    if (lang === 'en') return en;
    if (lang === 'ta') return ta;
    return si;
  };

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
        } else if (editPost.whatHappened?.includes('හමුවී ඇත') || editPost.whatIsNeeded?.includes('හමුවූ')) {
          initialType = 'found';
        } else if (editPost.whatHappened?.includes('සොරාගත්') || editPost.whatIsNeeded?.includes('සොරාගත්')) {
          initialType = 'stolen';
        } else if (editPost.whatHappened?.includes('අවශ්‍යයි') || editPost.whatIsNeeded?.includes('අවශ්‍යයි') || editPost.whatHappened?.includes('සොයන')) {
          initialType = 'find';
        }
        setSubType(initialType);

        // Item Name
        const extractedItemName = editPost.itemLostStolenOrSearched || 
          (editPost.whatIsNeeded ? editPost.whatIsNeeded.replace(/^(නැතිවූ|සොරාගත්|සොයන|අවශ්‍ය|හමුවූ)\s*/i, '').replace(/\s*(සොයාදෙන්න|භාරදීමට|තොරතුරු තහවුරු කරගන්න)\.?$/i, '').replace(/පිළිබඳ තොරතුරු සොයාදෙන්න\.?/i, '').trim() : '') ||
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
      if (subType === 'lost') errs.itemName = getLangText('නැතිවූ දේ ඇතුළත් කිරීම අනිවාර්යයි.', 'Lost item name is required.', 'தொலைந்த பொருளை உள்ளிடுவது கட்டாயம்.');
      else if (subType === 'stolen') errs.itemName = getLangText('සොරාගත් දේ ඇතුළත් කිරීම අනිවාර්යයි.', 'Stolen item name is required.', 'திருடப்பட்ட பொருளை உள்ளிடுவது கட்டாயம்.');
      else if (subType === 'found') errs.itemName = getLangText('හමුවූ දේ පිළිබඳ ඉඟිය ඇතුළත් කිරීම අනිවාර්යයි.', 'Found item clue is required.', 'கண்டெடுக்கப்பட்ட பொருள் பற்றிய குறிப்பு கட்டாயம்.');
      else errs.itemName = getLangText('ඔබ සොයන දේ ඇතුළත් කිරීම අනිවාර්යයි.', 'Requested item name is required.', 'நீங்கள் தேடும் பொருளை உள்ளிடுவது கட்டாயம்.');
    }

    if (subType === 'lost' || subType === 'stolen' || subType === 'found') {
      if (!incidentLocation.trim()) {
        errs.incidentLocation = subType === 'found' 
          ? getLangText('හමුවූ ස්ථානය ඇතුළත් කරන්න.', 'Please enter the found location.', 'கண்டெடுக்கப்பட்ட இடத்தை உள்ளிடவும்.')
          : getLangText('සිදුවීම වූ ස්ථානය ඇතුළත් කරන්න.', 'Please enter the incident location.', 'சம்பவம் நடந்த இடத்தை உள்ளிடவும்.');
      }
      if (!incidentDate) {
        errs.incidentDate = subType === 'found' 
          ? getLangText('හමුවූ දිනය තෝරන්න.', 'Please select the found date.', 'கண்டெடுக்கப்பட்ட தேதியைத் தேர்ந்தெடுக்கவும்.')
          : getLangText('දිනය තෝරන්න.', 'Please select the date.', 'தேதியைத் தேர்ந்தெடுக்கவும்.');
      }
    }

    if (subType === 'find') {
      if (hasDeadline && !deadlineDate) {
        errs.deadlineDate = getLangText('අවසන් දිනය ඇතුළත් කරන්න.', 'Please enter the deadline date.', 'கடைசி தேதியை உள்ளிடவும்.');
      }
      if (deliveryOption === 'වෙනත්' && !customDeliveryDetail.trim()) {
        errs.customDeliveryDetail = getLangText('වෙනත් විස්තරය ඇතුළත් කරන්න.', 'Please enter custom delivery details.', 'வேறு விவரங்களை உள்ளிடவும்.');
      }
    }

    if (hasReward && !rewardDetails.trim()) {
      errs.rewardDetails = getLangText('ලබාදෙන තෑග්ග/ත්‍යාගය පිළිබඳ විස්තරය ඇතුළත් කරන්න.', 'Please enter reward details.', 'வழங்கப்படும் பரிசு விவரங்களை உள்ளிடவும்.');
    }

    if (!contactPhone.trim()) {
      errs.contactPhone = getLangText('දුරකථන අංකය අනිවාර්යයි.', 'Phone number is required.', 'தொலைபேசி எண் கட்டாயம்.');
    }

    if (!contactWhatsapp.trim()) {
      errs.contactWhatsapp = getLangText('වට්සැප් අංකය අනිවාර්යයි.', 'WhatsApp number is required.', 'WhatsApp எண் கட்டாயம்.');
    }

    if (!isFeeConfirmed) {
      errs.isFeeConfirmed = getLangText('රු. 50 ඇප් ගාස්තුව තහවුරු කරන්න.', 'Please confirm the Rs. 50 app fee.', 'ரூ. 50 கட்டணத்தை உறுதிப்படுத்தவும்.');
    }

    if (!isWhatsAppConfirmed) {
      errs.isWhatsAppConfirmed = getLangText('වට්සැප් අංකය සක්‍රීය බව තහවුරු කරන්න.', 'Please confirm WhatsApp is active.', 'WhatsApp எண் செயலில் உள்ளதை உறுதிப்படுத்தவும்.');
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
    } else if (subType === 'found') {
      structuredWhatHappened = `${incidentDate || 'අද'} දින, ${incidentTime ? `${incidentTime} පමණ, ` : ''}${incidentLocation.trim()} ආසන්නයේ දී, ${itemName.trim()} හමුවී ඇත. අයිතිකරු විසින් Chat බොත්තම ඔස්සේ සම්බන්ධ වී විස්තර තහවුරු කර භාරගන්න.`;
      structuredWhatIsNeeded = `හමුවූ ${itemName.trim()} අයිතිකරුට භාරදීම.`;
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
          : subType === 'found'
          ? `අයිතිකරු සනාථ කර භාරදීම - Chat හරහා සම්බන්ධ වන්න. දුරකථන: ${contactPhone.trim()}, WhatsApp: ${contactWhatsapp.trim()}`
          : `සම්බන්ධ කරගැනීම - දුරකථන: ${contactPhone.trim()}, WhatsApp: ${contactWhatsapp.trim()}${contactAddress.trim() ? `, ලිපිනය: ${contactAddress.trim()}` : ''}`,
        transport: subType === 'find' ? finalDelivery : subType === 'found' ? 'Chat හරහා විස්තර සනාථ කිරීම' : 'සෘජු සම්බන්ධතා ලබාගන්න',
        payment: subType === 'find' 
          ? (targetPrice.trim() ? `රු. ${targetPrice.trim()}` : 'සාකච්ඡා කරගත හැක') 
          : subType === 'found'
          ? 'අයිතිකරු සනාථ කර භාරදීම'
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
        : subType === 'found'
        ? `අයිතිකරු සනාථ කර භාරදීම - Chat හරහා සම්බන්ධ වන්න. දුරකථන: ${contactPhone.trim()}, WhatsApp: ${contactWhatsapp.trim()}`
        : `සම්බන්ධ කරගැනීම - දුරකථන: ${contactPhone.trim()}, WhatsApp: ${contactWhatsapp.trim()}${contactAddress.trim() ? `, ලිපිනය: ${contactAddress.trim()}` : ''}`,
      transport: subType === 'find' ? finalDelivery : subType === 'found' ? 'Chat හරහා විස්තර සනාථ කිරීම' : 'සෘජු සම්බන්ධතා ලබාගන්න',
      payment: subType === 'find' 
        ? (targetPrice.trim() ? `රු. ${targetPrice.trim()}` : 'සාකච්ඡා කරගත හැක') 
        : subType === 'found'
        ? 'අයිතිකරු සනාථ කර භාරදීම'
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
                  <span>{editPost ? getLangText('සොයාදෙන්න දැන්වීම සංස්කරණය', 'Edit Find Notice', 'தேடுங்கள் பதிவைத் திருத்துக') : getLangText('සොයාදෙන්න', 'Find For Me', 'தேடுங்கள்')}</span>
                  <span className="text-xs bg-emerald-500/30 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-400/30">
                    {editPost ? `#${editPost.postCode}` : 'Find For Me'}
                  </span>
                </h2>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  {editPost 
                    ? getLangText('ඔබ පළ කළ දැන්වීමේ තොරතුරු යාවත්කාලීන කර සුරකින්න', 'Update and save your posted notice information', 'உங்கள் இடுகையின் தகவலைப் புதுப்பித்து சேமிக்கவும்')
                    : getLangText('නැතිවූ, සොරාගත් හෝ ඔබ සොයන දෙයක් පිළිබඳ ඉල්ලීමක් ඉදිරිපත් කරන්න', 'Submit a request for lost, stolen, or items you are searching for', 'தொலைந்த, திருடப்பட்ட அல்லது நீங்கள் தேடும் பொருள் பற்றிய கோரிக்கையைச் சமர்ப்பிக்கவும்')}
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
                    {getLangText('ගිණුම් හිමියාගේ නම (Account Owner)', 'Account Owner Name', 'கணக்கு உரிமையாளர் பெயர்')}
                  </span>
                  <strong className="text-sm font-black text-slate-900 dark:text-white">
                    {currentUser?.name || getLangText('ගිණුම් හිමියා', 'Account Owner', 'கணக்கு உரிமையாளர்')}
                  </strong>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-300 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{getLangText('සනාථයි', 'Verified', 'உறுதிப்படுத்தப்பட்டது')}</span>
              </span>
            </div>

            {errors.rateLimit && (
              <div className="p-3.5 bg-amber-500/20 border border-amber-500/50 rounded-2xl text-amber-300 text-xs font-bold flex items-center gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{errors.rateLimit}</span>
              </div>
            )}

            {/* 01. Sub-type selector (4 Choices) */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                {getLangText('01. ඉල්ලීම් වර්ගය තෝරන්න', '01. Select Request Type', '01. கோரிக்கை வகையைத் தேர்ந்தெடுக்கவும்')} <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
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
                  <span>{getLangText('නැතිවූ දෙයක්', 'Lost Item', 'தொலைந்த பொருள்')}</span>
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
                  <span>{getLangText('සොරාගත් දෙයක්', 'Stolen Item', 'திருடப்பட்ட பொருள்')}</span>
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
                  <span>{getLangText('සොයාදෙන්න', 'Find For Me', 'தேடுங்கள்')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubType('found')}
                  className={`p-3 rounded-2xl border text-xs sm:text-sm font-extrabold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    subType === 'found'
                      ? 'bg-teal-600 text-white border-teal-700 shadow-md scale-[1.02]'
                      : 'bg-slate-100 dark:bg-[#0d1f15] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1a3824] hover:bg-teal-50 dark:hover:bg-teal-950/30'
                  }`}
                >
                  <span className="text-base">🎁</span>
                  <span>{getLangText('හමුවනලද', 'Found Item', 'கண்டெடுக்கப்பட்டவை')}</span>
                </button>
              </div>
            </div>

            {/* 02. Dynamic Form based on selection */}
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-[#163522]">

              {/* Tag Selector */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                  {getLangText('ටැග් එක තෝරන්න (Tag)', 'Select Tag', 'குறிச்சொல்லைத் தேர்ந்தெடுக்கவும்')} <span className="text-rose-500">*</span>
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
                      {subType === 'lost' 
                        ? getLangText('1. නැතිවුනේ කුමක්ද?', '1. What was lost?', '1. என்ன தொலைந்தது?') 
                        : getLangText('1. සොරාගත්තේ කුමක්ද?', '1. What was stolen?', '1. என்ன திருடப்பட்டது?')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder={subType === 'lost' 
                        ? getLangText('උදා: රන් මාලයක්, ලේඛන ගොනුවක්, ජංගම දුරකථනය...', 'e.g. Gold necklace, document file, mobile phone...', 'எ.கா: தங்க சங்கிலி, ஆவண கோப்பு, கைபேசி...') 
                        : getLangText('උදා: මෝටර් බයිසිකලය (WP BXX-XXXX), ලැප්ටොප් පරිගණකය...', 'e.g. Motorcycle (WP BXX-XXXX), Laptop...', 'எ.கா: மோட்டார் சைக்கிள், மடிக்கணினி...')}
                      className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {errors.itemName && <p className="text-xs text-rose-500 font-bold mt-1">{errors.itemName}</p>}
                  </div>

                  {/* 2. නැතිවුන / සොරාගත් ස්ථානය */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                      {subType === 'lost' 
                        ? getLangText('2. නැතිවුන ස්ථානය කොහෙද?', '2. Where was it lost?', '2. எங்கு தொலைந்தது?') 
                        : getLangText('2. සොරාගත් ස්ථානය කොහෙද?', '2. Where was it stolen?', '2. எங்கு திருடப்பட்டது?')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={incidentLocation}
                      onChange={(e) => setIncidentLocation(e.target.value)}
                      placeholder={getLangText('උදා: කඩවත බස් නැවතුම්පොළ අසල, නිවස ඉදිරිපිට...', 'e.g. Near Kadawatha bus stop, in front of house...', 'எ.கா: பேருந்து நிறுத்தம் அருகில், வீட்டிற்கு முன்னால்...')}
                      className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {errors.incidentLocation && <p className="text-xs text-rose-500 font-bold mt-1">{errors.incidentLocation}</p>}
                  </div>

                  {/* 3 & 4. කවදද? කියටද? */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{subType === 'lost' 
                          ? getLangText('3. නැතිවුනේ කවදද?', '3. When was it lost?', '3. எப்போது தொலைந்தது?') 
                          : getLangText('3. සිදුවීම වුණේ කවදද?', '3. When did it happen?', '3. எப்போது நிகழ்ந்தது?')}</span> <span className="text-rose-500">*</span>
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
                        <span>{getLangText('4. කීයටද මේ සිදුවීම සිදුවුණේ?', '4. What time did this happen?', '4. எந்த நேரத்தில் நடந்தது?')}</span>
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
                      <span>{getLangText('නැති වූ දේ ඇති දුරකථන අංකයක්, හැඳුනුම්පත් අංකයක් හෝ එහි ඇති අංකයක් හෝ නමක් සඳහන් කරන්න', 'Specify any phone number, ID number, serial number or name on the item', 'தொலைந்த பொருளில் உள்ள தொலைபேசி எண், அடையாள அட்டை எண் அல்லது பெயரை உள்ளிடவும்')}</span>
                    </label>
                    <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed font-medium">
                      {getLangText('💡 සොයාගත් පුද්ගලයාට අයිතිකරු ඔබ බව පහසුවෙන් හඳුනාගැනීමට හා ඉක්මනින් ඔබට භාරදීමට මෙය උපකාරී වේ.', '💡 This helps the finder easily verify that you are the owner and return it quickly.', '💡 கண்டெடுத்தவர் நீங்கள் தான் உரிமையாளர் என்பதை எளிதாக உறுதிப்படுத்த இது உதவும்.')}
                    </p>
                    <input
                      type="text"
                      value={identifyingInfo}
                      onChange={(e) => setIdentifyingInfo(e.target.value)}
                      placeholder={getLangText('උදා: එහි ඇති දුරකථන අංකය, NIC අංකය, නම, Serial / Model අංකය, ලියාපදිංචි අංකය...', 'e.g. Phone number on it, NIC number, name, serial/model no...', 'எ.கா: தொலைபேசி எண், NIC எண், பெயர், வரிசை எண்...')}
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
                      {getLangText('1. ඔබ සොයන්නේ කුමක්ද?', '1. What are you searching for?', '1. நீங்கள் என்ன தேடுகிறீர்கள்?')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder={getLangText('උදා: පරණ වෝටර් පොම්පයක්, ලී කපාගැනීමට කියතක්, විශේෂ උපකරණයක්...', 'e.g. Used water pump, wood saw, specialized tool...', 'எ.கா: பழைய தண்ணீர் பம்ப், மரம் அறுக்கும் வாள்...')}
                      className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {errors.itemName && <p className="text-xs text-rose-500 font-bold mt-1">{errors.itemName}</p>}
                  </div>

                  {/* 2 & 3. වටිනාකම & ප්‍රමාණය */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{getLangText('2. කොපමණ වටිනාකමකින්ද?', '2. Target price / budget?', '2. எதிர்பார்க்கும் விலை?')}</span>
                      </label>
                      <input
                        type="text"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        placeholder={getLangText('උදා: රු. 5,000 / සාකච්ඡා කරගත හැක', 'e.g. Rs. 5,000 / Negotiable', 'எ.கா: ரூ. 5,000 / பேசிக்கொள்ளலாம்')}
                        className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                        {getLangText('3. කොපමණ අවශ්‍යද?', '3. Quantity needed?', '3. எவ்வளவு தேவை?')}
                      </label>
                      <input
                        type="text"
                        value={quantityNeeded}
                        onChange={(e) => setQuantityNeeded(e.target.value)}
                        placeholder={getLangText('උදා: 1 යි, 2 යි, කිලෝ 5 යි', 'e.g. 1 unit, 2 units, 5 kg', 'எ.கா: 1 அலகு, 2, 5 கிலோ')}
                        className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* 4. ලබාදීමට අවසන් දිනයක් තිබේද? */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0b1d13] border border-slate-200 dark:border-[#183a25] space-y-2">
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                      {getLangText('4. ලබාදීමට අවසන් දිනයක් තිබේද?', '4. Is there a deadline date?', '4. கடைசி தேதி ஏதும் உள்ளதா?')}
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
                        <span>{getLangText('නැත (No)', 'No', 'இல்லை (No)')}</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                        <input
                          type="radio"
                          name="hasDeadline"
                          checked={hasDeadline}
                          onChange={() => setHasDeadline(true)}
                          className="accent-emerald-600 w-4 h-4"
                        />
                        <span>{getLangText('ඔව් (Yes)', 'Yes', 'ஆம் (Yes)')}</span>
                      </label>
                    </div>

                    {hasDeadline && (
                      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            {getLangText('දිනය (Deadline Date)', 'Deadline Date', 'கடைசி தேதி')} <span className="text-rose-500">*</span>
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
                            {getLangText('වේලාව (Deadline Time)', 'Deadline Time', 'கடைசி நேரம்')}
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

              {/* Form for FOUND (හමුවනලද) */}
              {subType === 'found' && (
                <>
                  {/* 1. හමුවූ දේ පිළිබඳ ඉඟියක් ලබාදෙන්න */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                      {getLangText('1. හමුවූ දේ පිළිබඳ ඉඟියක් ලබාදෙන්න', '1. Give a clue about the found item', '1. கண்டெடுக்கப்பட்ட பொருள் பற்றி குறிப்பு தரவும்')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder={getLangText('උදා: කළු පැහැති මුදල් පසුම්බියක්, ජාතික හැඳුනුම්පතක්, යතුරු කැරැල්ලක්...', 'e.g. Black wallet, national identity card, bunch of keys...', 'எ.கா: கருப்பு பணப்பை, அடையாள அட்டை, சாவி கொத்து...')}
                      className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-medium">
                      ⚠️ <strong>{getLangText('ආරක්ෂාව සඳහා:', 'For Security:', 'பாதுகாப்புக்காக:')}</strong> {getLangText('මුදල් ප්‍රමාණය, සම්පූර්ණ හැඳුනුම්පත් අංකය හෝ සුවිශේෂී සලකුණු මෙහි සඳහන් නොකරන්න. අයිතිකරු Chat හරහා සම්බන්ධ වන විට ඒවා විමසා තහවුරු කරගන්න.', 'Do not state the exact cash amount, full ID number, or secret marks here. Verify them when the claimant connects via Chat.', 'துல்லியமான தொகை அல்லது முழு அடையாள அட்டை எண்ணை இங்கே வெளியிட வேண்டாம். அரட்டை வழியே கேட்டு உறுதிப்படுத்தவும்.')}
                    </p>
                    {errors.itemName && <p className="text-xs text-rose-500 font-bold mt-1">{errors.itemName}</p>}
                  </div>

                  {/* 2. හමුවූ ස්ථානය සඳහන් කරන්න */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                      {getLangText('2. හමුවූ ස්ථානය සඳහන් කරන්න', '2. Specify where it was found', '2. கண்டெடுக்கப்பட்ட இடத்தை உள்ளிடவும்')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={incidentLocation}
                      onChange={(e) => setIncidentLocation(e.target.value)}
                      placeholder={getLangText('උදා: මහරගම බස් නැවතුම අසල, මහජන බැංකුව ඉදිරිපිට...', 'e.g. Near Maharagama bus stop, in front of Peoples Bank...', 'எ.கா: பேருந்து நிறுத்தம் அருகில்...')}
                      className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {errors.incidentLocation && <p className="text-xs text-rose-500 font-bold mt-1">{errors.incidentLocation}</p>}
                  </div>

                  {/* 3. දිනය & වේලාව */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-teal-500" />
                        <span>{getLangText('3. හමුවූ දිනය', '3. Found Date', '3. கண்டெடுக்கப்பட்ட தேதி')}</span> <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={incidentDate}
                        onChange={(e) => setIncidentDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      {errors.incidentDate && <p className="text-xs text-rose-500 font-bold mt-1">{errors.incidentDate}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-teal-500" />
                        <span>{getLangText('හමුවූ වේලාව (ආසන්න වශයෙන්)', 'Found Time (Approximate)', 'கண்டெடுக்கப்பட்ட நேரம் (தோராயமாக)')}</span>
                      </label>
                      <input
                        type="time"
                        value={incidentTime}
                        onChange={(e) => setIncidentTime(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  {/* 4. Chat බොත්තම සහ ආරක්ෂිත භාරදීම පිළිබඳ විශේෂ දැනුවත් කිරීම */}
                  <div className="bg-teal-50 dark:bg-[#0a2016] border-2 border-teal-400/60 dark:border-teal-700/60 p-4 rounded-2xl space-y-2.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-teal-600 text-white">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black text-teal-950 dark:text-teal-200 uppercase tracking-wide">
                        {getLangText('4. Chat බොත්තම මඟින් සෘජු සංවාදය සහ අයිතිකරු තහවුරු කරගැනීම', '4. Direct Chat & Ownership Verification', '4. நேரடி அரட்டை மற்றும் உரிமையாளர் சரிபார்ப்பு')}
                      </h4>
                    </div>
                    
                    <p className="text-xs text-teal-900 dark:text-teal-200 leading-relaxed font-medium">
                      🛡️ <strong>{getLangText('ආරක්ෂිත දැනුවත් කිරීම:', 'Safety Notice:', 'பாதுகாப்பு அறிவிப்பு:')}</strong> {getLangText('කිසියම් කෙනෙකුගෙන් අතපසුවීමකින් හෝ අස්ථානගතවූ යම් දෙයක් තවත් කෙනෙකුට හමුවූ පසු ඒ පිළිබඳ ලංකාවේම සිටින මිනිසුන්ට දැනුවත් කිරීමට හා නිවැරදි අයිතිකරු සෙවීමට මෙම සේවය භාවිතා කරයි. එලෙස පළකළ දැන්වීමකට යම් කෙනෙකු අයිතිවාසිකම් කීමේදී ඔහුගෙන් හමුවූ දේ පිළිබඳ විස්තර (මුදල් ප්‍රමාණය, හැඳුනුම්පත් අංකය, සලකුණු) විමසා නිවැරදි අයිතිකරුද යන්න තහවුරු වන තෙක් හමුවූ දේ පිළිබඳ සම්පූර්ණ විස්තර වෙනත් අයට ලබානොදෙන ලෙස කාරුණිකව දැනුම් දෙමු.', 'This service helps find rightful owners for found items across Sri Lanka. When someone claims ownership, please ask them for specific details (amount, ID number, unique marks) to verify their identity before handing it over.', 'தொலைந்து கண்டெடுக்கப்பட்ட பொருட்களின் உண்மையான உரிமையாளரை கண்டுபிடிக்க இந்த சேவை உதவுகிறது. உரிமை கோருபவரிடம் அடையாள விவரங்களை கேட்டு உறுதி செய்தபின் ஒப்படைக்கவும்.')}
                    </p>
                  </div>
                </>
              )}

              {/* 5. මා සම්බන්ධ කරගතහැකි ක්‍රම */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {getLangText('5. මා සම්බන්ධ කරගතහැකි ක්‍රම', '5. Contact Methods', '5. தொடர்பு கொள்ளும் வழிகள்')} <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{getLangText('දුරකථන අංකය', 'Phone Number', 'தொலைபேசி எண்')}</span> <span className="text-rose-500">*</span>
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
                      <span>{getLangText('වට්සැප් අංකය', 'WhatsApp Number', 'WhatsApp எண்')}</span> <span className="text-rose-500">*</span>
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
                    <span>{getLangText('ගෙදර ලිපිනය (Home Address)', 'Home Address', 'வீட்டு முகவரி')}</span>
                  </label>
                  <input
                    type="text"
                    value={contactAddress}
                    onChange={(e) => setContactAddress(e.target.value)}
                    placeholder={getLangText('ලිපිනය ඇතුළත් කරන්න...', 'Enter address...', 'முகவரியை உள்ளிடவும்...')}
                    className="w-full bg-slate-50 dark:bg-[#0a1b12] border border-slate-300 dark:border-[#193d27] rounded-xl px-3.5 py-2 text-sm font-semibold"
                  />
                </div>
              </div>

              {/* 6. ස්ථානය Map එකෙන් Save කිරීම */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>{getLangText('6. ස්ථානය Map එකෙන් Save කරන්න', '6. Select Location on Map', '6. வரைபடத்தில் இருப்பிடத்தைத் தேர்ந்தெடுக்கவும்')}</span>
                </label>
                
                <div className="bg-slate-50 dark:bg-[#09170e] border border-slate-200 dark:border-[#193e27] p-3.5 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {lang === 'en' ? selectedLocation.nameEn : lang === 'ta' ? (selectedLocation.nameTa || selectedLocation.nameEn) : selectedLocation.nameSi}
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
                    <span>{getLangText('Map එකෙන් තෝරන්න', 'Select from Map', 'வரைபடத்தில் தேர்வு செய்க')}</span>
                  </button>
                </div>
              </div>

              {/* 7. වෙනත් තොරතුරු */}
              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                  {getLangText('7. වෙනත් තොරතුරු (Other details)', '7. Other details', '7. பிற விவரங்கள்')}
                </label>
                <textarea
                  rows={2}
                  value={otherDetails}
                  onChange={(e) => setOtherDetails(e.target.value)}
                  placeholder={getLangText('වෙනත් ඕනෑම විශේෂ තොරතුරක් ඇතුළත් කරන්න...', 'Enter any other special details...', 'வேறு ஏதேனும் சிறப்பு விவரங்களை உள்ளிடவும்...')}
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
                    <span>{getLangText('8. සොයාදෙන්නාට සතුටෙන් දෙයක් ලබාදෙන්නේ නම් මෙහි සලකුණු කරන්න', '8. Check here if offering a reward or gift for the finder', '8. கண்டுபிடிப்பவருக்கு பரிசு அல்லது சன்மானம் வழங்குவதாயின் தேர்வு செய்யவும்')}</span>
                  </label>

                  {hasReward && (
                    <div className="pt-2 animate-fadeIn">
                      <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-200 mb-1">
                        {getLangText('ලබාදෙන තෑග්ග / ත්‍යාගය පිළිබඳ විස්තර', 'Reward / Gift Details', 'வழங்கப்படும் பரிசு / சன்மான விவரம்')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={rewardDetails}
                        onChange={(e) => setRewardDetails(e.target.value)}
                        placeholder={getLangText('උදා: රු. 10,000 ක මුදල් ත්‍යාගයක් ලබාදෙමි', 'e.g. Rs. 10,000 cash reward offered', 'எ.கா: ரூ. 10,000 ரொக்க பரிசு வழங்கப்படும்')}
                        className="w-full bg-white dark:bg-[#08120a] border border-amber-300 dark:border-[#383a15] rounded-xl px-3 py-2 text-xs font-semibold"
                      />
                      {errors.rewardDetails && <p className="text-xs text-rose-500 font-bold mt-1">{errors.rewardDetails}</p>}
                    </div>
                  )}
                  {!hasReward && (
                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400/70 italic">
                      {getLangText('*(මෙයට Tick එක නොදමන්නේ නම් මෙම තොරතුරු දැන්වීමේ පෙන්වන්නේ නැත)*', '*(If unchecked, reward details will not be shown on the post)*', '*(தேர்வு செய்யப்படாவிட்டால், பரிசு விவரம் இடுகையில் காட்டப்படாது)*')}
                    </p>
                  )}
                </div>
              )}

              {subType === 'find' && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-[#0b1d13] border border-emerald-200 dark:border-[#183a25] space-y-2">
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>{getLangText('8. බෙදාහැරීමේ / භාරගැනීමේ කොන්දේසිය තෝරන්න', '8. Select Delivery / Pickup Condition', '8. விநியோக / பெறும் நிபந்தனையைத் தேர்ந்தெடுக்கவும்')} <span className="text-rose-500">*</span></span>
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
                        <span>
                          {opt === 'ගෙනවිත් දෙන්න ඒ සඳහා මම ඔබට වෙනම ගෙවන්නම්'
                            ? getLangText('ගෙනවිත් දෙන්න ඒ සඳහා මම ඔබට වෙනම ගෙවන්නම්', 'Deliver to me, I will pay you separately', 'கொண்டு வந்து தாருங்கள், அதற்காக தனியாக கட்டணம் செலுத்துகிறேன்')
                            : opt === 'ගෙනවිත් දීමට අමතර ගාස්තුවක් ලබාදෙන්නේ නැත'
                            ? getLangText('ගෙනවිත් දීමට අමතර ගාස්තුවක් ලබාදෙන්නේ නැත', 'No extra fee will be given for delivery', 'கொண்டு வந்து தர கூடுதல் கட்டணம் வழங்கப்படாது')
                            : opt === 'ඇවිත් රැගෙන යන්නම්'
                            ? getLangText('ඇවිත් රැගෙන යන්නම්', 'I will come and pick it up', 'நான் வந்து பெற்றுக்கொள்வேன்')
                            : opt === 'මා හට එවන්න මම මුදල් දී ගන්නම්'
                            ? getLangText('මා හට එවන්න මම මුදල් දී ගන්නම්', 'Send it to me, I will pay upon delivery', 'எனக்கு அனுப்புங்கள் நான் பணம் கொடுத்து பெறுகிறேன்')
                            : opt === 'ඔබ මුදල් දී එවන්න මම ගන්නම්'
                            ? getLangText('ඔබ මුදල් දී එවන්න මම ගන්නම්', 'Pay upfront and send, I will reimburse you', 'நீங்கள் பணம் செலுத்தி அனுப்புங்கள் நான் பெற்றுக்கொள்கிறேன்')
                            : getLangText('වෙනත්', 'Other', 'வேறு')}
                        </span>
                      </label>
                    ))}
                  </div>

                  {deliveryOption === 'වෙනත්' && (
                    <div className="pt-2 animate-fadeIn">
                      <input
                        type="text"
                        value={customDeliveryDetail}
                        onChange={(e) => setCustomDeliveryDetail(e.target.value)}
                        placeholder={getLangText('වෙනත් විස්තරය මෙහි සටහන් කරන්න...', 'Enter custom delivery details here...', 'வேறு விவரங்களை இங்கே குறிப்பிடவும்...')}
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
                        {getLangText('ගාස්තු තහවුරු කිරීම (Fee Confirmation)', 'Fee Confirmation', 'கட்டண உறுதிப்படுத்தல்')} <span className="text-rose-500">*</span>
                      </span>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        {getLangText('ඇප් ගාස්තු ලෙස රු. 50 ක් අයවේ. ගාස්තුව අය කරගන්නද?', 'An app fee of Rs. 50 applies. Do you accept this fee?', 'பயன்பாட்டுக் கட்டணமாக ரூ. 50 பொருந்தும். இதை ஏற்கிறீர்களா?')}
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
                        {getLangText('වට්සැප් තහවුරු කිරීම (WhatsApp Confirmation)', 'WhatsApp Confirmation', 'WhatsApp உறுதிப்படுத்தல்')} <span className="text-rose-500">*</span>
                      </span>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        {getLangText('ඔබ ලබා දී ඇති මෙම වට්සැප් අංකය', 'Is this WhatsApp number', 'நீங்கள் வழங்கிய இந்த WhatsApp எண்')} (<strong className="text-emerald-600 dark:text-emerald-400">{contactWhatsapp || getLangText('නොදක්වා ඇත', 'Not specified', 'வழங்கப்படவில்லை')}</strong>) {getLangText('වැඩද?', 'working / active?', 'செயலில் உள்ளதா?')}
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
                  <span>{editPost ? getLangText('වෙනස්කම් සුරකින්න (Save Changes)', 'Save Changes', 'மாற்றங்களை சேமிக்கவும்') : getLangText('තහවුරු කර දැන්වීම පළ කරන්න', 'Confirm and Post Notice', 'உறுதிப்படுத்தி இடுகையிடவும்')}</span>
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
