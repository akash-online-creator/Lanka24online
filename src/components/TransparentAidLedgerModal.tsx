import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Package, 
  Building, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Plus, 
  QrCode, 
  Share2, 
  MapPin, 
  Phone, 
  Calendar, 
  Clock, 
  DollarSign, 
  X, 
  Camera, 
  FileText, 
  Filter, 
  Sparkles, 
  Users, 
  Check, 
  Copy, 
  Radio, 
  Heart, 
  ThumbsUp, 
  ExternalLink,
  ChevronRight,
  Eye,
  Info,
  BadgeAlert,
  ArrowRight,
  Award
} from 'lucide-react';
import { 
  AidRecipientCenter, 
  AidDeliveryRecord, 
  AidCommunityBroadcastPost, 
  AidCategory, 
  AidCenterType,
  BroadcastScope,
  User as UserType, 
  Language 
} from '../types';
import { 
  AID_CATEGORIES, 
  AID_CENTER_TYPES, 
  BROADCAST_SCOPES,
  generate6DigitCode,
  getStoredAidCenters,
  saveAidCentersToStorage,
  getStoredAidDeliveries,
  saveAidDeliveriesToStorage,
  getStoredCommunityBroadcasts,
  saveCommunityBroadcastsToStorage,
  findAidCenterByCode,
  notifyRecipientOfLoggedAid
} from '../data/transparentAidLedgerData';
import { compressImageFile } from '../utils/imageCompressor';
import {
  saveAidCenterToFirestore,
  updateAidCenterInFirestore,
  subscribeToAidCentersFromFirestore,
  saveAidDeliveryToFirestore,
  updateAidDeliveryInFirestore,
  subscribeToAidDeliveriesFromFirestore,
  saveAidBroadcastToFirestore,
  subscribeToAidBroadcastsFromFirestore,
} from '../lib/firebase';

interface TransparentAidLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType;
  lang?: Language;
  onRequireRegistration?: () => void;
}

export const TransparentAidLedgerModal: React.FC<TransparentAidLedgerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang = 'si',
  onRequireRegistration,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'public_ledger' | 'register_center' | 'log_delivery' | 'recipient_confirm' | 'broadcasts'>('public_ledger');

  // Master Data Stores
  const [centers, setCenters] = useState<AidRecipientCenter[]>(() => getStoredAidCenters());
  const [deliveries, setDeliveries] = useState<AidDeliveryRecord[]>(() => getStoredAidDeliveries());
  const [broadcasts, setBroadcasts] = useState<AidCommunityBroadcastPost[]>(() => getStoredCommunityBroadcasts());

  // Real-time Firestore sync
  React.useEffect(() => {
    const unsubCenters = subscribeToAidCentersFromFirestore((remoteCenters) => {
      if (remoteCenters && remoteCenters.length > 0) {
        setCenters(remoteCenters);
        saveAidCentersToStorage(remoteCenters);
      }
    });

    const unsubDeliveries = subscribeToAidDeliveriesFromFirestore((remoteDeliveries) => {
      if (remoteDeliveries && remoteDeliveries.length > 0) {
        setDeliveries(remoteDeliveries);
        saveAidDeliveriesToStorage(remoteDeliveries);
      }
    });

    const unsubBroadcasts = subscribeToAidBroadcastsFromFirestore((remoteBroadcasts) => {
      if (remoteBroadcasts && remoteBroadcasts.length > 0) {
        setBroadcasts(remoteBroadcasts);
        saveCommunityBroadcastsToStorage(remoteBroadcasts);
      }
    });

    return () => {
      unsubCenters();
      unsubDeliveries();
      unsubBroadcasts();
    };
  }, []);

  // Filters & Search for Ledger
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<string>('all');
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<string>('all');

  // Photo viewer lightbox
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Success / Status Alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ----------------------------------------------------
  // Form State: 1. Register 6-Digit Center
  // ----------------------------------------------------
  const [fraudWarningAccepted, setFraudWarningAccepted] = useState(false);
  const [newCenterName, setNewCenterName] = useState('');
  const [newCenterType, setNewCenterType] = useState<AidCenterType>('camp');
  const [newCoordinatorName, setNewCoordinatorName] = useState(currentUser?.name || '');
  const [newCoordinatorPhone, setNewCoordinatorPhone] = useState(currentUser?.phone || '');
  const [newCoordinatorNic, setNewCoordinatorNic] = useState(currentUser?.nicNumber || '');
  const [newVillage, setNewVillage] = useState('');
  const [newTown, setNewTown] = useState('');
  const [newDistrict, setNewDistrict] = useState('ගම්පහ');
  const [newProvince, setNewProvince] = useState('බස්නාහිර');
  const [newAddress, setNewAddress] = useState('');
  const [newPeopleCount, setNewPeopleCount] = useState<number>(50);
  const [newFamiliesCount, setNewFamiliesCount] = useState<number>(15);
  const [newUrgentNeeds, setNewUrgentNeeds] = useState<AidCategory[]>(['dry_rations', 'drinking_water']);
  const [newNotes, setNewNotes] = useState('');
  const [registeredNewCenter, setRegisteredNewCenter] = useState<AidRecipientCenter | null>(null);

  // ----------------------------------------------------
  // Form State: 2. Log Delivered Aid (Donor)
  // ----------------------------------------------------
  const [donorTargetCode, setDonorTargetCode] = useState('');
  const [matchedCenter, setMatchedCenter] = useState<AidRecipientCenter | null>(null);
  const [codeLookupError, setCodeLookupError] = useState<string | null>(null);
  const [donorName, setDonorName] = useState(currentUser?.name || '');
  const [donorPhone, setDonorPhone] = useState(currentUser?.phone || '');
  const [donorOrg, setDonorOrg] = useState('');
  const [aidCategory, setAidCategory] = useState<AidCategory>('dry_rations');
  const [itemDescription, setItemDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [monetaryValue, setMonetaryValue] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [deliveryTime, setDeliveryTime] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [donorNotes, setDonorNotes] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // ----------------------------------------------------
  // Form State: 3. Recipient Confirmation Hub
  // ----------------------------------------------------
  const [recipientLookupCode, setRecipientLookupCode] = useState('');
  const [recipientActiveCenter, setRecipientActiveCenter] = useState<AidRecipientCenter | null>(null);
  const [recipientLookupError, setRecipientLookupError] = useState<string | null>(null);
  const [confirmingRecordId, setConfirmingRecordId] = useState<string | null>(null);
  const [recipientNote, setRecipientNote] = useState('');
  const [recipientSignName, setRecipientSignName] = useState(currentUser?.name || '');

  // ----------------------------------------------------
  // Form State: 4. Community Broadcast
  // ----------------------------------------------------
  const [broadcastScope, setBroadcastScope] = useState<BroadcastScope>('town');
  const [scopeName, setScopeName] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [organizerName, setOrganizerName] = useState(currentUser?.name || '');
  const [organizerPhone, setOrganizerPhone] = useState(currentUser?.phone || '');
  const [collectedSummary, setCollectedSummary] = useState('');
  const [distributedSummary, setDistributedSummary] = useState('');
  const [beneficiaryCentersInput, setBeneficiaryCentersInput] = useState('');
  const [broadcastTotalValue, setBroadcastTotalValue] = useState('');
  const [broadcastPhoto, setBroadcastPhoto] = useState('');

  // ----------------------------------------------------
  // Metrics Calculations
  // ----------------------------------------------------
  const verifiedDeliveries = useMemo(() => deliveries.filter(d => d.status === 'confirmed_received'), [deliveries]);
  const pendingDeliveries = useMemo(() => deliveries.filter(d => d.status === 'pending_recipient_confirmation'), [deliveries]);
  
  const totalVerifiedValue = useMemo(() => {
    return verifiedDeliveries.reduce((acc, curr) => acc + (curr.monetaryValueEstimate || 0), 0);
  }, [verifiedDeliveries]);

  const totalPeopleBenefited = useMemo(() => {
    return centers.reduce((acc, curr) => acc + (curr.peopleCount || 0), 0);
  }, [centers]);

  // Unique Districts
  const districts = ['all', 'ගම්පහ', 'කොළඹ', 'කළුතර', 'මහනුවර', 'රත්නපුර', 'ගාල්ල', 'මාතර', 'නුවරඑළිය', 'කෑගල්ල', 'කුරුණෑගල', 'අනුරාධපුර', 'බදුල්ල'];

  // Filtered Deliveries for Public Ledger
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      // Must be confirmed or pending
      if (selectedCategoryFilter !== 'all' && d.aidCategory !== selectedCategoryFilter) return false;
      if (selectedDistrictFilter !== 'all' && d.centerDistrict !== selectedDistrictFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = d.centerCode.toLowerCase().includes(q);
        const matchCenter = d.centerName.toLowerCase().includes(q);
        const matchDonor = d.donorName.toLowerCase().includes(q);
        const matchDesc = d.itemDescription.toLowerCase().includes(q);
        const matchTown = d.centerTown.toLowerCase().includes(q);
        return matchCode || matchCenter || matchDonor || matchDesc || matchTown;
      }
      return true;
    });
  }, [deliveries, selectedCategoryFilter, selectedDistrictFilter, searchQuery]);

  // Filtered Broadcasts
  const filteredBroadcasts = useMemo(() => {
    return broadcasts.filter(b => {
      if (selectedScopeFilter !== 'all' && b.broadcastScope !== selectedScopeFilter) return false;
      return true;
    });
  }, [broadcasts, selectedScopeFilter]);

  // ----------------------------------------------------
  // Handlers
  // ----------------------------------------------------

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Image Upload helper
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const base64 = await compressImageFile(file, { maxWidth: 800, maxHeight: 800, quality: 0.75 });
      setter(base64);
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // 1. Submit Register Center (6-Digit Generation)
  const handleRegisterCenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fraudWarningAccepted) {
      alert('කරුණාකර වංචනික ක්‍රියාවලින් වැලකී සිටීමේ ප්‍රතිඥාව පිළිගන්න.');
      return;
    }
    if (!newCenterName.trim() || !newCoordinatorName.trim() || !newCoordinatorPhone.trim()) {
      alert('කරුණාකර අවශ්‍ය සියලු තොරතුරු ඇතුළත් කරන්න.');
      return;
    }

    const existingCodes = centers.map(c => c.centerCode);
    const new6DigitCode = generate6DigitCode(existingCodes);

    const newCenter: AidRecipientCenter = {
      id: `center_${Date.now()}`,
      centerCode: new6DigitCode,
      centerName: newCenterName.trim(),
      centerType: newCenterType,
      coordinatorName: newCoordinatorName.trim(),
      coordinatorPhone: newCoordinatorPhone.trim(),
      coordinatorNic: newCoordinatorNic.trim(),
      coordinatorUserId: currentUser?.userId || currentUser?.id,
      village: newVillage.trim() || newTown.trim(),
      town: newTown.trim() || 'නගරය',
      district: newDistrict,
      province: newProvince,
      address: newAddress.trim() || `${newTown} ප්‍රදේශය`,
      peopleCount: Number(newPeopleCount) || 1,
      familiesCount: Number(newFamiliesCount) || 1,
      urgentNeeds: newUrgentNeeds,
      notes: newNotes.trim(),
      fraudWarningAccepted: true,
      fraudWarningAcceptedAt: new Date().toLocaleString(),
      createdAt: new Date().toISOString().split('T')[0],
      createdAtMs: Date.now(),
      status: 'verified',
      totalDeliveriesCount: 0,
      totalEstimatedValue: 0,
    };

    const updated = [newCenter, ...centers];
    setCenters(updated);
    saveAidCentersToStorage(updated);
    saveAidCenterToFirestore(newCenter);
    setRegisteredNewCenter(newCenter);
    setSuccessMessage(`🎉 අංක ${new6DigitCode} යටතේ ආධාර මධ්‍යස්ථානය සාර්ථකව විවෘත කරන ලදි!`);
  };

  // 2. Donor Code Lookup
  const handleLookupDonorCode = (code: string) => {
    setDonorTargetCode(code);
    setCodeLookupError(null);
    if (code.trim().length === 6) {
      const found = findAidCenterByCode(code);
      if (found) {
        setMatchedCenter(found);
      } else {
        setMatchedCenter(null);
        setCodeLookupError('❌ මෙම අංක 6ට අදාළ ආධාර මධ්‍යස්ථානයක් හමු නොවිණි. කරුණාකර අංකය පරීක්ෂා කරන්න.');
      }
    } else {
      setMatchedCenter(null);
    }
  };

  // 3. Submit Log Delivered Aid
  const handleLogDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedCenter) {
      alert('කරුණාකර නිවැරදි අංක 6ක ආධාර මධ්‍යස්ථාන කේතය ඇතුළත් කරන්න.');
      return;
    }
    if (!donorName.trim() || !quantity.trim() || !itemDescription.trim()) {
      alert('කරුණාකර ආධාර විස්තරය සහ ප්‍රමාණය ඇතුළත් කරන්න.');
      return;
    }

    const categoryObj = AID_CATEGORIES.find(c => c.id === aidCategory);

    const newRecord: AidDeliveryRecord = {
      id: `deliv_${Date.now()}`,
      recordCode: `#AID-${matchedCenter.centerCode}-${Math.floor(100 + Math.random() * 900)}`,
      centerCode: matchedCenter.centerCode,
      centerId: matchedCenter.id,
      centerName: matchedCenter.centerName,
      centerTown: matchedCenter.town,
      centerDistrict: matchedCenter.district,
      donorUserId: currentUser?.userId || currentUser?.id,
      donorName: donorName.trim(),
      donorPhone: donorPhone.trim(),
      donorOrganization: donorOrg.trim() || undefined,
      aidCategory,
      categoryTitleSi: categoryObj?.titleSi || 'ආධාර',
      itemDescription: itemDescription.trim(),
      quantity: quantity.trim(),
      monetaryValueEstimate: monetaryValue ? Number(monetaryValue) : undefined,
      photos: deliveryPhoto ? [deliveryPhoto] : undefined,
      deliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
      deliveryTime: deliveryTime || '12:00 PM',
      donorNotes: donorNotes.trim() || undefined,
      status: 'pending_recipient_confirmation',
      submittedAt: new Date().toLocaleString(),
      submittedAtMs: Date.now(),
      isVerifiedPublic: false,
    };

    const updated = [newRecord, ...deliveries];
    setDeliveries(updated);
    saveAidDeliveriesToStorage(updated);
    saveAidDeliveryToFirestore(newRecord);

    // Notify the Recipient Center Coordinator
    notifyRecipientOfLoggedAid(newRecord, matchedCenter);

    setSuccessMessage(`✅ ඔබගේ ආධාර බෙදාහැරීම සාර්ථකව සටහන් විය! මධ්‍යස්ථාන බාරකරු වෙත තහවුරු කිරීමේ පණිවිඩයක් යවන ලදි.`);
    // Reset form
    setDonorTargetCode('');
    setMatchedCenter(null);
    setItemDescription('');
    setQuantity('');
    setMonetaryValue('');
    setDonorNotes('');
    setDeliveryPhoto('');
  };

  // 4. Recipient Lookup for Confirmation
  const handleRecipientLookup = (code: string) => {
    setRecipientLookupCode(code);
    setRecipientLookupError(null);
    if (code.trim().length === 6) {
      const found = findAidCenterByCode(code);
      if (found) {
        setRecipientActiveCenter(found);
      } else {
        setRecipientActiveCenter(null);
        setRecipientLookupError('❌ අදාළ අංක 6ට ලියාපදිංචි ආධාර මධ්‍යස්ථානයක් හමු නොවිණි.');
      }
    } else {
      setRecipientActiveCenter(null);
    }
  };

  // 5. Recipient Confirm Received
  const handleConfirmReceived = (recordId: string) => {
    const targetRecord = (deliveries || []).find(d => d && d.id === recordId);
    if (!targetRecord) return;

    const confirmedDeliveries = (deliveries || []).map(d => {
      if (d && d.id === recordId) {
        return {
          ...d,
          status: 'confirmed_received' as const,
          confirmedAt: new Date().toLocaleString(),
          confirmedAtMs: Date.now(),
          confirmedByRecipientName: recipientSignName.trim() || recipientActiveCenter?.coordinatorName || 'මධ්‍යස්ථාන බාරකරු',
          recipientConfirmationNote: recipientNote.trim() || 'ආධාර ද්‍රව්‍ය ලැබුණු බව තහවුරු කරන ලදී.',
          isVerifiedPublic: true,
        };
      }
      return d;
    });

    setDeliveries(confirmedDeliveries);
    saveAidDeliveriesToStorage(confirmedDeliveries);

    const confirmedDelivery = confirmedDeliveries.find(d => d && d.id === recordId);
    if (confirmedDelivery) {
      updateAidDeliveryInFirestore(recordId, confirmedDelivery);
    }

    // Update Center Totals
    const updatedCenters = (centers || []).map(c => {
      if (c && c.centerCode === targetRecord.centerCode) {
        const updatedC = {
          ...c,
          totalDeliveriesCount: (c.totalDeliveriesCount || 0) + 1,
          totalEstimatedValue: (c.totalEstimatedValue || 0) + (targetRecord.monetaryValueEstimate || 0),
        };
        if (c.id) updateAidCenterInFirestore(c.id, updatedC);
        return updatedC;
      }
      return c;
    });
    setCenters(updatedCenters);
    saveAidCentersToStorage(updatedCenters);

    setConfirmingRecordId(null);
    setRecipientNote('');
    setSuccessMessage(`🔒 ආධාර ලැබීම සාර්ථකව තහවුරු කරන ලදී! එය ප්‍රසිද්ධ විනිවිදභාවයේ ලෙජරයට එක්විය.`);
  };

  // 6. Submit Community Broadcast
  const handlePublishBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !collectedSummary.trim() || !distributedSummary.trim()) {
      alert('කරුණාකර මාතෘකාව, එකතු කළ සහ බෙදාහැරි සාරාංශය ඇතුළත් කරන්න.');
      return;
    }

    const scopeObj = BROADCAST_SCOPES.find(s => s.id === broadcastScope);

    const newBroadcast: AidCommunityBroadcastPost = {
      id: `post_${Date.now()}`,
      postCode: `#AID-POST-${Math.floor(500 + Math.random() * 499)}`,
      broadcastScope,
      scopeName: scopeName.trim() || scopeObj?.titleSi || 'ප්‍රදේශය',
      title: broadcastTitle.trim(),
      organizerName: organizerName.trim() || 'ප්‍රජා සහන කමිටුව',
      organizerPhone: organizerPhone.trim(),
      organizerUserId: currentUser?.userId || currentUser?.id,
      collectedSummary: collectedSummary.trim(),
      distributedSummary: distributedSummary.trim(),
      beneficiaryCenters: beneficiaryCentersInput.trim() ? beneficiaryCentersInput.split(',').map(s => s.trim()) : [],
      photos: broadcastPhoto ? [broadcastPhoto] : undefined,
      totalValueFormatted: broadcastTotalValue.trim() || undefined,
      createdAt: 'මීට සුළු මොහොතකට පෙර',
      createdAtMs: Date.now(),
      likesCount: 1,
      verifiedByLedger: true,
    };

    const updated = [newBroadcast, ...broadcasts];
    setBroadcasts(updated);
    saveCommunityBroadcastsToStorage(updated);
    saveAidBroadcastToFirestore(newBroadcast);
    setSuccessMessage('📢 ප්‍රජා දැනුවත් කිරීමේ නිවේදනය සාර්ථකව පළ කරන ලදි!');
    
    // Reset Form
    setBroadcastTitle('');
    setCollectedSummary('');
    setDistributedSummary('');
    setBeneficiaryCentersInput('');
    setBroadcastTotalValue('');
    setBroadcastPhoto('');
  };

  // Like Broadcast
  const handleLikeBroadcast = (postId: string) => {
    const updated = broadcasts.map(b => {
      if (b.id === postId) {
        return { ...b, likesCount: b.likesCount + 1 };
      }
      return b;
    });
    setBroadcasts(updated);
    saveCommunityBroadcastsToStorage(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[94vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-900 dark:text-white">
        
        {/* Modal Top Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md shadow-inner">
              <ShieldCheck className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  ආධාර සහ සම්පත් විනිවිදභාවයේ ලෙජරය
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-emerald-950 uppercase">
                  Transparent Aid Ledger
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                ආධාර එකතු කිරීම්, අංක 6ක මධ්‍යස්ථාන ලැබීම් සහ දෙපැත්තේම තහවුරු කළ වාර්තා
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Success Notification Bar */}
        {successMessage && (
          <div className="px-4 py-2.5 bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="p-1 hover:bg-emerald-600 rounded-lg text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Sub-Buttons (Clean, High-Visibility Responsive Grid / Layout) */}
        <div className="p-2.5 sm:p-3.5 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
            {/* Button 1: පොදු ලෙජරය */}
            <button
              type="button"
              onClick={() => { setActiveTab('public_ledger'); setSuccessMessage(null); }}
              className={`p-2.5 sm:p-3 rounded-2xl flex items-center gap-2 transition-all cursor-pointer font-extrabold text-xs sm:text-sm text-left border-2 shadow-xs active:scale-[0.98] ${
                activeTab === 'public_ledger'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-md shadow-emerald-700/25'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${
                activeTab === 'public_ledger' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300'
              }`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="leading-tight truncate">📊 පොදු ලෙජරය</span>
            </button>

            {/* Button 2: ස්ථානයක් ලියාපදිංචි කිරිම */}
            <button
              type="button"
              onClick={() => { setActiveTab('register_center'); setSuccessMessage(null); }}
              className={`p-2.5 sm:p-3 rounded-2xl flex items-center gap-2 transition-all cursor-pointer font-extrabold text-xs sm:text-sm text-left border-2 shadow-xs active:scale-[0.98] ${
                activeTab === 'register_center'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-md shadow-emerald-700/25'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${
                activeTab === 'register_center' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300'
              }`}>
                <Building className="w-4 h-4" />
              </div>
              <span className="leading-tight truncate">🏢 ස්ථානයක් ලියාපදිංචි කිරිම</span>
            </button>

            {/* Button 3: ආධාර ලබාදුන් පසු සටහන් කිරීම */}
            <button
              type="button"
              onClick={() => { setActiveTab('log_delivery'); setSuccessMessage(null); }}
              className={`p-2.5 sm:p-3 rounded-2xl flex items-center gap-2 transition-all cursor-pointer font-extrabold text-xs sm:text-sm text-left border-2 shadow-xs active:scale-[0.98] ${
                activeTab === 'log_delivery'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-md shadow-emerald-700/25'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${
                activeTab === 'log_delivery' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300'
              }`}>
                <Truck className="w-4 h-4" />
              </div>
              <span className="leading-tight truncate">🚚 ආධාර සටහන් කිරීම</span>
            </button>

            {/* Button 4: ආධාර ලැබීම තහවුරු කිරීම */}
            <button
              type="button"
              onClick={() => { setActiveTab('recipient_confirm'); setSuccessMessage(null); }}
              className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-1.5 transition-all cursor-pointer font-extrabold text-xs sm:text-sm text-left border-2 shadow-xs active:scale-[0.98] ${
                activeTab === 'recipient_confirm'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-md shadow-emerald-700/25'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'recipient_confirm' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="leading-tight truncate">📥 ආධාර ලැබීම තහවුරුව</span>
              </div>
              {pendingDeliveries.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-black animate-pulse shrink-0">
                  {pendingDeliveries.length}
                </span>
              )}
            </button>

            {/* Button 5: ප්‍රජා නිවේදන */}
            <button
              type="button"
              onClick={() => { setActiveTab('broadcasts'); setSuccessMessage(null); }}
              className={`p-2.5 sm:p-3 rounded-2xl flex items-center gap-2 transition-all cursor-pointer font-extrabold text-xs sm:text-sm text-left border-2 shadow-xs active:scale-[0.98] col-span-2 sm:col-span-1 ${
                activeTab === 'broadcasts'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-md shadow-emerald-700/25'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${
                activeTab === 'broadcasts' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300'
              }`}>
                <Radio className="w-4 h-4" />
              </div>
              <span className="leading-tight truncate">📢 ප්‍රජා නිවේදන</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">

          {/* ==================================================== */}
          {/* TAB 1: 📊 PUBLIC VERIFIED AID LEDGER                 */}
          {/* ==================================================== */}
          {activeTab === 'public_ledger' && (
            <div className="space-y-6">
              {/* Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                    <span className="text-xs font-black uppercase">තහවුරු කළ ආධාර</span>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100">
                    {verifiedDeliveries.length}
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">දෙපැත්තෙන්ම තහවුරු කළ</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 shadow-xs">
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                    <span className="text-xs font-black uppercase">ඇස්තමේන්තු වටිනාකම</span>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-blue-950 dark:text-blue-100">
                    රු. {totalVerifiedValue.toLocaleString()}
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">මුළු බෙදාහැරි වටිනාකම</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 shadow-xs">
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                    <span className="text-xs font-black uppercase">අංක 6ක මධ්‍යස්ථාන</span>
                    <Building className="w-4 h-4" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100">
                    {centers.length}
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">ලියාපදිංචි කඳවුරු/ස්ථාන</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40 border border-purple-200 dark:border-purple-800 shadow-xs">
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
                    <span className="text-xs font-black uppercase">ප්‍රතිලාභී පිරිස</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-purple-950 dark:text-purple-100">
                    {totalPeopleBenefited}+
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">ආධාර ලැබෙන ජනතාව</p>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="අංක 6, මධ්‍යස්ථානය හෝ ආධාරය සොයන්න..."
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="all">සියලු ආධාර කාණ්ඩ (All Categories)</option>
                    {AID_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.titleSi}</option>
                    ))}
                  </select>

                  <select
                    value={selectedDistrictFilter}
                    onChange={(e) => setSelectedDistrictFilter(e.target.value)}
                    className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="all">සියලු දිස්ත්‍රික්ක (All Districts)</option>
                    {districts.filter(d => d !== 'all').map(d => (
                      <option key={d} value={d}>📍 {d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Verified Ledger Stream */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>විනිවිදභාවයෙන් යුත් ආධාර බෙදාහැරීම් වාර්තා ({filteredDeliveries.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    *මධ්‍යස්ථාන විසින් නිල වශයෙන් තහවුරු කළ වාර්තා
                  </span>
                </div>

                {filteredDeliveries.length === 0 ? (
                  <div className="text-center py-12 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <Package className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-slate-500 font-bold">ගැලපෙන ආධාර වාර්තා කිසිවක් හමු නොවිණි.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5">
                    {filteredDeliveries.map((record) => {
                      const isConfirmed = record.status === 'confirmed_received';
                      return (
                        <div 
                          key={record.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-slate-200/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all space-y-3"
                        >
                          {/* Top Row */}
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-1.5">
                                  <Building className="w-3.5 h-3.5" />
                                  <span>කේතය: {record.centerCode}</span>
                                </span>
                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                  {record.centerName}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-rose-500" />
                                  {record.centerTown} ({record.centerDistrict})
                                </span>
                              </div>
                            </div>

                            {/* Verification Badge */}
                            <div>
                              {isConfirmed ? (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500 text-white flex items-center gap-1 shadow-xs">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>ලබාගත් බව තහවුරු කළා (VERIFIED)</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500 text-white flex items-center gap-1 shadow-xs">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>මධ්‍යස්ථාන තහවුරුව බලාපොරොත්තුවෙන්</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Item & Quantity Details Grid */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div>
                              <span className="text-slate-400 block font-bold text-[10px] uppercase">ආධාර කාණ්ඩය:</span>
                              <span className="font-black text-emerald-700 dark:text-emerald-400">
                                {record.categoryTitleSi}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-bold text-[10px] uppercase">ලබාදුන් ප්‍රමාණය:</span>
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {record.quantity}
                              </span>
                            </div>
                            {record.monetaryValueEstimate && (
                              <div>
                                <span className="text-slate-400 block font-bold text-[10px] uppercase">ඇස්තමේන්තු වටිනාකම:</span>
                                <span className="font-black text-blue-600 dark:text-blue-400">
                                  රු. {record.monetaryValueEstimate.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Full Description & Donor Notes */}
                          <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                            <p className="font-medium"><strong className="text-slate-900 dark:text-white">විස්තරය:</strong> {record.itemDescription}</p>
                            {record.donorNotes && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                <strong>පරිත්‍යාගශීලියාගේ සටහන:</strong> "{record.donorNotes}"
                              </p>
                            )}
                          </div>

                          {/* Photo Proofs */}
                          {record.photos && record.photos.length > 0 && (
                            <div className="flex items-center gap-2 pt-1">
                              {record.photos.map((img, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setPreviewPhotoUrl(img)}
                                  className="relative group rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 hover:scale-105 transition-transform"
                                >
                                  <img src={img} alt="Aid proof" className="w-16 h-16 object-cover" />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                                    <Eye className="w-4 h-4" />
                                  </div>
                                </button>
                              ))}
                              <span className="text-[11px] text-slate-400 font-medium">📷 ආධාර භාරදීමේ ඡායාරූප සාක්ෂි</span>
                            </div>
                          )}

                          {/* Dual Confirmation Proof Box */}
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-semibold">
                              <span>🚚 ලබාදුන්නේ: <strong>{record.donorName}</strong> {record.donorOrganization ? `(${record.donorOrganization})` : ''}</span>
                              <span>• {record.deliveryDate} {record.deliveryTime}</span>
                            </div>

                            {isConfirmed && record.confirmedByRecipientName && (
                              <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>භාරගත්තේ: {record.confirmedByRecipientName} ({record.confirmedAt})</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: 🏢 REGISTER 6-DIGIT RECIPIENT CENTER          */}
          {/* ==================================================== */}
          {activeTab === 'register_center' && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Generated Result Card if just created */}
              {registeredNewCenter ? (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950 to-teal-950 text-white border-2 border-emerald-400 shadow-2xl space-y-5 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/30 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-300 animate-bounce">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-emerald-300 tracking-widest">
                      ස්ථාන අනන්‍යතා අංකය (CENTER CODE)
                    </span>
                    <div className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-emerald-300 flex items-center justify-center gap-3">
                      <span>{registeredNewCenter.centerCode}</span>
                      <button
                        onClick={() => handleCopyCode(registeredNewCenter.centerCode)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-sans transition-all cursor-pointer flex items-center gap-1"
                        title="Copy Code"
                      >
                        <Copy className="w-4 h-4" />
                        <span>{copiedCode === registeredNewCenter.centerCode ? 'පිටපත් විය!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/40 text-left space-y-2 text-xs">
                    <p><strong>මධ්‍යස්ථානයේ නම:</strong> {registeredNewCenter.centerName}</p>
                    <p><strong>ස්ථානය:</strong> {registeredNewCenter.village}, {registeredNewCenter.town} ({registeredNewCenter.district})</p>
                    <p><strong>බාරකරු:</strong> {registeredNewCenter.coordinatorName} ({registeredNewCenter.coordinatorPhone})</p>
                    <p><strong>රැඳී සිටින පිරිස:</strong> {registeredNewCenter.peopleCount} දෙනෙකු (පවුල් {registeredNewCenter.familiesCount})</p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs text-left">
                    💡 <strong>උපදෙස:</strong> මෙම <strong>අංක 6 ({registeredNewCenter.centerCode})</strong> ඔබගේ කඳවුරේ හෝ මධ්‍යස්ථානයේ පුවරුවක ප්‍රදර්ශනය කරන්න. ආධාර රැගෙන එන පරිත්‍යාගශීලීන්ට මෙම අංකය ලබාදෙන්න. ඔවුන් ද්‍රව්‍ය ලබාදුන් පසු ඔබට ක්ෂණික දැනුම්දීමක් ලැබෙනු ඇත.
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setRegisteredNewCenter(null)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all cursor-pointer"
                    >
                      තවත් මධ්‍යස්ථානයක් ලියාපදිංචි කරන්න
                    </button>
                    <button
                      onClick={() => setActiveTab('public_ledger')}
                      className="px-6 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all cursor-pointer"
                    >
                      ලෙජරය බලන්න
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegisterCenter} className="space-y-6">
                  {/* Strict Anti-Fraud Warning Box */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 space-y-3">
                    <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300 text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>වංචනික ක්‍රියාවලින් වැලකී සිටීමේ දැඩි නීතිමය අවවාදය සහ ප්‍රතිඥාව:</span>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                      ආපදා සහන යනු විපතට පත් අසරණ ජනතාවගේ ජීවිත බේරාගැනීමට ලබාදෙන සම්පත්ය. අසත්‍ය තොරතුරු ලබාදීම, නොලැබුණු ආධාර හෝ ව්‍යාජ පුද්ගලයින් පෙන්වා ආධාර රැස්කිරීම, සහ තමන් වෙත ලැබෙන ආධාර අවභාවිතා කිරීම හෝ විකිණීම <strong>දඬුවම් ලැබිය හැකි බරපතල අපරාධයකි</strong>. සියලු ආධාර ලෙජර සටහන් ප්‍රසිද්ධියේ විනිවිදභාවයෙන් නිරීක්ෂණය වේ.
                    </p>
                    <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={fraudWarningAccepted}
                        onChange={(e) => setFraudWarningAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-amber-400"
                        required
                      />
                      <span className="text-xs font-black text-amber-950 dark:text-amber-100">
                        මා ඉහත අවවාදය පිළිගන්නා අතර, කිසිදු වංචනික ක්‍රියාවකට සම්බන්ධ නොවන බවටත්, සැබෑ ප්‍රතිලාභීන් වෙනුවෙන් පමණක් මෙම ගිණුම විවෘත කරන බවටත් මෙයින් සපථ කරමි.
                      </span>
                    </label>
                  </div>

                  {/* Center Details Form */}
                  <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-emerald-600" />
                      <span>ආධාර ලබන ස්ථානයේ / කඳවුරේ තොරතුරු:</span>
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          මධ්‍යස්ථානයේ / කඳවුරේ නම *
                        </label>
                        <input
                          type="text"
                          required
                          value={newCenterName}
                          onChange={(e) => setNewCenterName(e.target.value)}
                          placeholder="උදා: කැලණිය රජමහා විහාර සහන කඳවුර"
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ස්ථාන වර්ගය *
                          </label>
                          <select
                            value={newCenterType}
                            onChange={(e) => setNewCenterType(e.target.value as AidCenterType)}
                            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                          >
                            {AID_CENTER_TYPES.map(t => (
                              <option key={t.id} value={t.id}>{t.icon} {t.titleSi}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            දිස්ත්‍රික්කය *
                          </label>
                          <select
                            value={newDistrict}
                            onChange={(e) => setNewDistrict(e.target.value)}
                            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                          >
                            {districts.filter(d => d !== 'all').map(d => (
                              <option key={d} value={d}>📍 {d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ගම / ග්‍රාම සේවා වසම *
                          </label>
                          <input
                            type="text"
                            required
                            value={newVillage}
                            onChange={(e) => setNewVillage(e.target.value)}
                            placeholder="උදා: කැලණිය / මානෙල්ගම"
                            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ළඟම නගරය *
                          </label>
                          <input
                            type="text"
                            required
                            value={newTown}
                            onChange={(e) => setNewTown(e.target.value)}
                            placeholder="උදා: කඩවත"
                            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          සම්පූර්ණ ලිපිනය / ස්ථානය *
                        </label>
                        <input
                          type="text"
                          required
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          placeholder="උදා: විහාර පරිශ්‍රය, කැලණිය පන්සල පාර"
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Coordinator & Beneficiary Counts */}
                  <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>වගකිවයුතු බාරකරු සහ ප්‍රතිලාභීන් සංඛ්‍යාව:</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          බාරකරුගේ නම *
                        </label>
                        <input
                          type="text"
                          required
                          value={newCoordinatorName}
                          onChange={(e) => setNewCoordinatorName(e.target.value)}
                          placeholder="නම"
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          දුරකථන අංකය *
                        </label>
                        <input
                          type="tel"
                          required
                          value={newCoordinatorPhone}
                          onChange={(e) => setNewCoordinatorPhone(e.target.value)}
                          placeholder="07XXXXXXXX"
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          හැඳුනුම්පත් අංකය (NIC) *
                        </label>
                        <input
                          type="text"
                          required
                          value={newCoordinatorNic}
                          onChange={(e) => setNewCoordinatorNic(e.target.value)}
                          placeholder="NIC Number"
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          රැඳී සිටින / ප්‍රතිලාභ ලබන මුළු පුද්ගලයින් සංඛ්‍යාව *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={newPeopleCount}
                          onChange={(e) => setNewPeopleCount(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          පවුල් සංඛ්‍යාව (Families)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newFamiliesCount}
                          onChange={(e) => setNewFamiliesCount(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                        />
                      </div>
                    </div>

                    {/* Urgent Needs Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        හදිසි අවශ්‍යතා (Urgent Needs)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {AID_CATEGORIES.map(c => {
                          const isSelected = newUrgentNeeds.includes(c.id);
                          return (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => {
                                if (isSelected) {
                                  setNewUrgentNeeds(newUrgentNeeds.filter(item => item !== c.id));
                                } else {
                                  setNewUrgentNeeds([...newUrgentNeeds, c.id]);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span>{c.icon}</span>
                              <span>{c.titleSi}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!fraudWarningAccepted}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>අංක 6ක ස්ථාන කේතය ලබාගන්න (Generate 6-Digit Center Code)</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: 🚚 LOG DELIVERED AID (DONOR WORKFLOW)         */}
          {/* ==================================================== */}
          {activeTab === 'log_delivery' && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200 text-xs flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0" />
                <span>
                  ආධාර ලබාදුන් පසු, අදාළ ස්ථානයේ ඇති <strong>අංක 6ක කේතය (6-Digit Code)</strong> ඇතුළත් කර විස්තර සටහන් කරන්න. මධ්‍යස්ථානය එය ලබාගත් පසු තහවුරු කළ විට එය ලෙජරයේ ස්ථිරව සටහන් වේ.
                </span>
              </div>

              <form onSubmit={handleLogDelivery} className="space-y-5">
                {/* Step 1: 6-Digit Code Input & Preview */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-emerald-500/50 space-y-3">
                  <label className="block text-xs font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">
                    1. ආධාර ලබාදුන් ස්ථානයේ අංක 6ක කේතය (6-Digit Center Code) *
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      maxLength={6}
                      value={donorTargetCode}
                      onChange={(e) => handleLookupDonorCode(e.target.value)}
                      placeholder="උදා: 712845"
                      className="w-48 px-4 py-3 text-2xl font-mono font-black text-center tracking-widest rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      required
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      කඳවුරේ පුවරුවේ ඇති අංක 6
                    </span>
                  </div>

                  {codeLookupError && (
                    <p className="text-xs text-rose-500 font-bold">{codeLookupError}</p>
                  )}

                  {matchedCenter && (
                    <div className="p-3.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-400 text-xs space-y-1 text-emerald-950 dark:text-emerald-100 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-emerald-900 dark:text-emerald-200">
                          🏢 {matchedCenter.centerName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px]">
                          තහවුරු වූ මධ්‍යස්ථානයකි
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        📍 {matchedCenter.address} ({matchedCenter.town}, {matchedCenter.district}) • බාරකරු: {matchedCenter.coordinatorName}
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 2: Aid Details */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                    2. ලබාදුන් ආධාර පිළිබඳ විස්තරය:
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ආධාර කාණ්ඩය *
                      </label>
                      <select
                        value={aidCategory}
                        onChange={(e) => setAidCategory(e.target.value as AidCategory)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                      >
                        {AID_CATEGORIES.map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.titleSi}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ප්‍රමාණය (Quantity) *
                      </label>
                      <input
                        type="text"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="උදා: සලාක මලු 50ක් / ජල බෝතල් 200ක්"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ලබාදුන් ද්‍රව්‍යවල සම්පූර්ණ විස්තරය *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="උදා: සහල් කිලෝ 250, පරිප්පු 50kg, ටින් මාළු 60, සීනි 25kg සහ බිස්කට් පැකට් 100"
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ඇස්තමේන්තු වටිනාකම හෝ මුදල් ආධාරය (රු.)
                      </label>
                      <input
                        type="number"
                        value={monetaryValue}
                        onChange={(e) => setMonetaryValue(e.target.value)}
                        placeholder="උදා: 150000"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ලබාදුන් දිනය
                      </label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  {/* Photo Proof Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      භාරදීමේ ඡායාරූපය / රිසිට්පත (විකල්ප)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span>{isUploadingPhoto ? 'සකසමින්...' : 'ඡායාරූපයක් එක්කරන්න'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageFileChange(e, setDeliveryPhoto)}
                          className="hidden"
                        />
                      </label>
                      {deliveryPhoto && (
                        <div className="relative">
                          <img src={deliveryPhoto} alt="Delivery" className="w-12 h-12 rounded-lg object-cover border border-emerald-500" />
                          <button
                            type="button"
                            onClick={() => setDeliveryPhoto('')}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      විශේෂ සටහන් (Notes)
                    </label>
                    <input
                      type="text"
                      value={donorNotes}
                      onChange={(e) => setDonorNotes(e.target.value)}
                      placeholder="උදා: කඳවුරේ බාරකරු ඉදිරියේ නිල වශයෙන් භාර දෙන ලදී."
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                {/* Step 3: Donor Contact Details */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                    3. පරිත්‍යාගශීලියාගේ / සංවිධානයේ තොරතුරු:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        නම *
                      </label>
                      <input
                        type="text"
                        required
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        placeholder="නම"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        දුරකථන අංකය *
                      </label>
                      <input
                        type="tel"
                        required
                        value={donorPhone}
                        onChange={(e) => setDonorPhone(e.target.value)}
                        placeholder="07XXXXXXXX"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        සංවිධානය / එකමුතුව (ඇත්නම්)
                      </label>
                      <input
                        type="text"
                        value={donorOrg}
                        onChange={(e) => setDonorOrg(e.target.value)}
                        placeholder="උදා: Rotary / Lions / පෞද්ගලික"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!matchedCenter}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Truck className="w-5 h-5" />
                  <span>ලබාදුන් ආධාරය සටහන් කර මධ්‍යස්ථානයට දැනුම් දෙන්න (Submit Delivery Log)</span>
                </button>
              </form>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: 📥 RECIPIENT CONFIRMATION HUB                 */}
          {/* ==================================================== */}
          {activeTab === 'recipient_confirm' && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                <span>
                  ආධාර ලබන මධ්‍යස්ථාන බාරකරු විසින් මෙහි ඔබගේ <strong>අංක 6ක කේතය (6-Digit Code)</strong> ඇතුළත් කර ලැබුණු ආධාර පරීක්ෂා කර "ලබාගත්තා" ලෙස තහවුරු කරන්න.
                </span>
              </div>

              {/* Code Lookup Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="block text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                  ඔබගේ මධ්‍යස්ථාන අංක 6 ඇතුළත් කරන්න (Enter 6-Digit Center Code):
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="text"
                    maxLength={6}
                    value={recipientLookupCode}
                    onChange={(e) => handleRecipientLookup(e.target.value)}
                    placeholder="උදා: 712845"
                    className="w-48 px-4 py-2.5 text-2xl font-mono font-black text-center tracking-widest rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300"
                  />
                  {centers.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-slate-400">ක්ෂණික තේරීම:</span>
                      {centers.slice(0, 3).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleRecipientLookup(c.centerCode)}
                          className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-slate-200 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white transition-all"
                        >
                          #{c.centerCode}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {recipientLookupError && (
                  <p className="text-xs text-rose-500 font-bold">{recipientLookupError}</p>
                )}
              </div>

              {/* Pending Deliveries for this center */}
              {recipientActiveCenter && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-sm text-emerald-900 dark:text-emerald-200">
                        🏢 {recipientActiveCenter.centerName} (කේතය: {recipientActiveCenter.centerCode})
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        බාරකරු: {recipientActiveCenter.coordinatorName} ({recipientActiveCenter.coordinatorPhone})
                      </p>
                    </div>
                  </div>

                  {/* List of pending deliveries */}
                  {(() => {
                    const centerPending = deliveries.filter(d => d.centerCode === recipientActiveCenter.centerCode && d.status === 'pending_recipient_confirmation');
                    const centerConfirmed = deliveries.filter(d => d.centerCode === recipientActiveCenter.centerCode && d.status === 'confirmed_received');

                    return (
                      <div className="space-y-4">
                        <h5 className="text-xs font-black uppercase text-amber-700 dark:text-amber-300 tracking-wider flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>තහවුරු කිරීමට ඇති නව ආධාර ({centerPending.length})</span>
                        </h5>

                        {centerPending.length === 0 ? (
                          <div className="text-center py-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-bold">
                            ✅ මෙම මධ්‍යස්ථානය සඳහා තහවුරු කිරීමට ඉතිරි නව ආධාර කිසිවක් නොමැත. සියල්ල යාවත්කාලීනයි!
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {centerPending.map(item => (
                              <div
                                key={item.id}
                                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-amber-400 dark:border-amber-600 shadow-md space-y-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200 uppercase">
                                      {item.categoryTitleSi}
                                    </span>
                                    <h6 className="font-black text-sm text-slate-900 dark:text-white mt-1">
                                      {item.quantity}
                                    </h6>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                                      {item.itemDescription}
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 block">
                                      {item.monetaryValueEstimate ? `රු. ${item.monetaryValueEstimate.toLocaleString()}` : ''}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {item.deliveryDate} {item.deliveryTime}
                                    </span>
                                  </div>
                                </div>

                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-[11px] text-slate-600 dark:text-slate-300">
                                  <strong>ලබාදුන්නේ:</strong> {item.donorName} ({item.donorPhone}) {item.donorOrganization ? `• ${item.donorOrganization}` : ''}
                                  {item.donorNotes && <div className="italic text-slate-500 mt-0.5">"{item.donorNotes}"</div>}
                                </div>

                                {item.photos && item.photos.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    {item.photos.map((img, i) => (
                                      <img 
                                        key={i} 
                                        src={img} 
                                        alt="Proof" 
                                        onClick={() => setPreviewPhotoUrl(img)}
                                        className="w-12 h-12 rounded-lg object-cover border border-slate-300 cursor-pointer" 
                                      />
                                    ))}
                                    <span className="text-[10px] text-slate-400">ඡායාරූප සාක්ෂිය බලන්න</span>
                                  </div>
                                )}

                                {/* Confirmation Trigger / Action */}
                                {confirmingRecordId === item.id ? (
                                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-400 space-y-2 animate-fade-in">
                                    <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                      භාරගත් නිලධාරී / බාරකරුගේ නම:
                                    </label>
                                    <input
                                      type="text"
                                      value={recipientSignName}
                                      onChange={(e) => setRecipientSignName(e.target.value)}
                                      placeholder="නම"
                                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-300 bg-white dark:bg-slate-900"
                                    />
                                    <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                      තහවුරු කිරීමේ සටහන (Optional):
                                    </label>
                                    <input
                                      type="text"
                                      value={recipientNote}
                                      onChange={(e) => setRecipientNote(e.target.value)}
                                      placeholder="උදා: ද්‍රව්‍ය ගණන් කර නිවැරදිව භාරගන්නා ලදී."
                                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-300 bg-white dark:bg-slate-900"
                                    />
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setConfirmingRecordId(null)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200"
                                      >
                                        අවලංගු කරන්න
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmReceived(item.id)}
                                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-sm flex items-center gap-1"
                                      >
                                        <Check className="w-4 h-4" />
                                        <span>ලැබුණා - තහවුරු කරන්න (Confirm)</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmingRecordId(item.id);
                                      setRecipientSignName(recipientActiveCenter.coordinatorName || currentUser?.name || '');
                                    }}
                                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>✅ ආධාරය නිවැරදිව ලැබුණා (Confirm Received)</span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Already Confirmed for this center */}
                        {centerConfirmed.length > 0 && (
                          <div className="pt-4 space-y-2">
                            <h5 className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300 tracking-wider">
                              දැනට තහවුරු කර අවසන් ආධාර ({centerConfirmed.length})
                            </h5>
                            <div className="space-y-2">
                              {centerConfirmed.map(c => (
                                <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                                  <div>
                                    <span className="font-bold">{c.quantity}</span> ({c.categoryTitleSi}) • {c.donorName}
                                  </div>
                                  <span className="text-[10px] text-emerald-600 font-bold">✓ {c.confirmedAt}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 5: 📢 COMMUNITY BROADCAST SCOPES                 */}
          {/* ==================================================== */}
          {activeTab === 'broadcasts' && (
            <div className="space-y-6">
              
              {/* Broadcast Scope Creator Form */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-950 text-white border-2 border-purple-400 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-purple-300 animate-pulse" />
                    <h4 className="text-sm font-black tracking-tight">
                      ප්‍රජා දැනුවත් කිරීමේ ප්‍රකාශනයක් පළකරන්න (Publish Aid Transparency Post)
                    </h4>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                    ගම / නගරය / දිස්ත්‍රික්කය / රට
                  </span>
                </div>

                <form onSubmit={handlePublishBroadcast} className="space-y-3.5 text-slate-800 dark:text-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        දැනුවත් කිරීමේ සීමාව (Broadcast Scope) *
                      </label>
                      <select
                        value={broadcastScope}
                        onChange={(e) => setBroadcastScope(e.target.value as BroadcastScope)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-purple-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                      >
                        {BROADCAST_SCOPES.map(s => (
                          <option key={s.id} value={s.id}>{s.icon} {s.titleSi}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        ප්‍රදේශයේ / නගරයේ / දිස්ත්‍රික්කයේ නම *
                      </label>
                      <input
                        type="text"
                        required
                        value={scopeName}
                        onChange={(e) => setScopeName(e.target.value)}
                        placeholder="උදා: කැලණිය නගරය / කළුතර දිස්ත්‍රික්කය"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-purple-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-200 mb-1">
                      ප්‍රකාශනයේ මාතෘකාව *
                    </label>
                    <input
                      type="text"
                      required
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="උදා: ගංවතුර විපතට පත් පවුල් 200ක් සඳහා ආධාර බෙදාදීමේ ප්‍රගති වාර්තාව"
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-purple-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        එකතු කළ මුළු ආධාර සාරාංශය *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={collectedSummary}
                        onChange={(e) => setCollectedSummary(e.target.value)}
                        placeholder="උදා: වියළි සලාක මලු 150ක්, වතුර බෝතල් 400ක් සහ රු. 250,000ක අරමුදල්"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-purple-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        බෙදාහැරි ආකාරය සහ ලෙජර තහවුරුව *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={distributedSummary}
                        onChange={(e) => setDistributedSummary(e.target.value)}
                        placeholder="උදා: කැලණිය රජමහා විහාර කඳවුර (අංක 712845) වෙත සියලු සලාක භාරදෙන ලදී."
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-purple-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        ආධාර ලැබූ අංක 6 කේත (Codes)
                      </label>
                      <input
                        type="text"
                        value={beneficiaryCentersInput}
                        onChange={(e) => setBeneficiaryCentersInput(e.target.value)}
                        placeholder="උදා: 712845, 593812"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-purple-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        මුළු ඇස්තමේන්තු වටිනාකම (රු.)
                      </label>
                      <input
                        type="text"
                        value={broadcastTotalValue}
                        onChange={(e) => setBroadcastTotalValue(e.target.value)}
                        placeholder="උදා: රු. 580,000"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-purple-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        සංවිධායක / බාරකරු
                      </label>
                      <input
                        type="text"
                        value={organizerName}
                        onChange={(e) => setOrganizerName(e.target.value)}
                        placeholder="නම"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-purple-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <label className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-purple-300 text-xs font-bold text-purple-100 cursor-pointer flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      <span>{broadcastPhoto ? 'ඡායාරූපය එක්විය' : 'සාක්ෂි ඡායාරූපයක් එක්කරන්න'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileChange(e, setBroadcastPhoto)}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Radio className="w-4 h-4" />
                      <span>ප්‍රකාශනය පළකරන්න (Publish)</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Broadcast Posts Stream */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-500" />
                    <span>ප්‍රජා විනිවිදභාවයේ නිවේදන ({filteredBroadcasts.length})</span>
                  </h4>

                  {/* Scope filter */}
                  <select
                    value={selectedScopeFilter}
                    onChange={(e) => setSelectedScopeFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="all">සියලු සීමාවන් (All Scopes)</option>
                    {BROADCAST_SCOPES.map(s => (
                      <option key={s.id} value={s.id}>{s.icon} {s.titleSi}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  {filteredBroadcasts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200 uppercase">
                              {post.broadcastScope === 'village' ? '🏡 ගම' : post.broadcastScope === 'town' ? '🏙️ නගරය' : post.broadcastScope === 'district' ? '🗺️ දිස්ත්‍රික්කය' : post.broadcastScope === 'province' ? '🏛️ පළාත' : '🇱🇰 මුළු රටම'}
                            </span>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              📍 {post.scopeName}
                            </span>
                            <span className="text-[10px] text-slate-400">• {post.createdAt}</span>
                          </div>
                          <h5 className="text-base font-black text-slate-900 dark:text-white mt-1">
                            {post.title}
                          </h5>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-white flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>LEDGER VERIFIED</span>
                        </span>
                      </div>

                      {/* Summary Grids */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 block">
                            📦 එකතු කළ මුළු ආධාර:
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 font-medium">
                            {post.collectedSummary}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">
                            🚚 බෙදාහැරි ආකාරය හා තහවුරුව:
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 font-medium">
                            {post.distributedSummary}
                          </p>
                        </div>
                      </div>

                      {/* Beneficiary Centers Links */}
                      {post.beneficiaryCenters && post.beneficiaryCenters.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          <span className="text-slate-400 font-bold text-[11px]">ප්‍රතිලාභී මධ්‍යස්ථාන:</span>
                          {post.beneficiaryCenters.map((b, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-[11px] border border-emerald-300 dark:border-emerald-800">
                              #{b}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Photos */}
                      {post.photos && post.photos.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          {post.photos.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="Broadcast proof"
                              onClick={() => setPreviewPhotoUrl(img)}
                              className="w-20 h-20 rounded-xl object-cover border border-slate-300 dark:border-slate-700 cursor-pointer hover:scale-105 transition-transform"
                            />
                          ))}
                        </div>
                      )}

                      {/* Footer Info & Like Button */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <span>සංවිධානය: <strong>{post.organizerName}</strong> {post.organizerPhone ? `(${post.organizerPhone})` : ''}</span>
                          {post.totalValueFormatted && (
                            <span className="font-black text-blue-600 dark:text-blue-400">
                              • වටිනාකම: {post.totalValueFormatted}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLikeBroadcast(post.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-600 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>ස්තූතියි ({post.likesCount})</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 px-4 sm:px-6 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>සහය සේවා විනිවිදභාවයේ ආරක්ෂිත පද්ධතිය • Transparent Aid & Resource Verification Protocol</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold transition-all cursor-pointer"
          >
            වසන්න (Close)
          </button>
        </div>

      </div>

      {/* Lightbox Photo Preview Modal */}
      {previewPhotoUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={previewPhotoUrl} alt="Preview" className="rounded-2xl max-w-full max-h-[85vh] object-contain shadow-2xl" />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
