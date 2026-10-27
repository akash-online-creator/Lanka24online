import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Pencil,
  Ban,
  ShieldAlert, 
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
  Award,
  Waves,
  Trash2,
  HeartHandshake,
  Lock,
  CheckCircle
} from 'lucide-react';
import { 
  AidRecipientCenter, 
  AidDeliveryRecord, 
  AidCommunityBroadcastPost, 
  AidCategory, 
  AidCenterType,
  BroadcastScope,
  DisasterReliefItem,
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
  deleteAidCenterFromFirestore,
  subscribeToAidCentersFromFirestore,
  saveAidDeliveryToFirestore,
  updateAidDeliveryInFirestore,
  deleteAidDeliveryFromFirestore,
  subscribeToAidDeliveriesFromFirestore,
  saveAidBroadcastToFirestore,
  subscribeToAidBroadcastsFromFirestore,
} from '../lib/firebase';
import { addBlockedCredential, removeBlockedCredential } from '../utils/blockedCredentialsManager';

import { 
  getStoredDisasterReliefItems, 
  saveDisasterReliefItemsToStorage, 
  getStoredSupportedDisasterIds, 
  saveSupportedDisasterIdsToStorage 
} from '../data/bloodAndDisasterData';
import { maskName, maskPhone } from '../utils/demoDataMasker';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { addDeletedDisasterId } from '../utils/deletedPostsManager';
import { 
  saveDisasterReliefToFirestore, 
  deleteDisasterReliefFromFirestore,
  subscribeToDisasterReliefFromFirestore
} from '../lib/firebase';
import { broadcastAppNotification } from '../utils/notificationManager';
interface TransparentAidLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType;
  lang?: Language;
  onRequireRegistration?: () => void;
  onSubmitHelpPost?: (post: any) => Promise<any>;
}

export const TransparentAidLedgerModal: React.FC<TransparentAidLedgerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang = 'si',
  onRequireRegistration,
  onSubmitHelpPost,
}) => {
  // Top-Level Mode Selector: 'disaster_requests' vs 'relief_camps' (Default to disaster_requests as requested in prompt)
  const [mainSection, setMainSection] = useState<'disaster_requests' | 'relief_camps'>('disaster_requests');

  // User Privileges & Registration
  const isDemo = Boolean(currentUser?.isDemo);
  const isAdmin = !isDemo && checkIsAdmin(currentUser);

  // Navigation Tabs for Relief Camps (සහන කඳවුරු) - Strictly Admin-only for public_ledger!
  const [activeTab, setActiveTab] = useState<'public_ledger' | 'register_center' | 'log_delivery' | 'recipient_confirm' | 'broadcasts'>(
    isAdmin ? 'public_ledger' : 'register_center'
  );

  // Admin Surveillance & Audit States
  const [ledgerSubView, setLedgerSubView] = useState<'deliveries' | 'centers'>('deliveries');
  const [editingDelivery, setEditingDelivery] = useState<AidDeliveryRecord | null>(null);
  const [blockingCenterTarget, setBlockingCenterTarget] = useState<AidRecipientCenter | null>(null);
  const [blockReasonText, setBlockReasonText] = useState('');
  const [expandedCenterCode, setExpandedCenterCode] = useState<string | null>(null);
  const [centerAuditSearch, setCenterAuditSearch] = useState('');
  const [centerAuditStatusFilter, setCenterAuditStatusFilter] = useState<'all' | 'verified' | 'blocked'>('all');

  // Security guard: ensure non-admin users cannot access public_ledger under any circumstances
  React.useEffect(() => {
    if (!isAdmin && activeTab === 'public_ledger') {
      setActiveTab('register_center');
    }
  }, [isAdmin, activeTab]);

  // Auto-scroll to Notice Feed when opening modal or changing mainSection
  React.useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const targetId = mainSection === 'disaster_requests' ? 'disaster-requests-feed' : 'relief-camps-nav';
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [isOpen, mainSection]);

  // Disaster Relief Items State
  const [disasterItems, setDisasterItems] = useState<DisasterReliefItem[]>(() => getStoredDisasterReliefItems());
  const [supportedDisasterIds, setSupportedDisasterIds] = useState<string[]>(() => getStoredSupportedDisasterIds());
  const [showAddDisasterForm, setShowAddDisasterForm] = useState(false);
  const [selectedDisasterDistrict, setSelectedDisasterDistrict] = useState<string>('all');
  const [disasterSearchQuery, setDisasterSearchQuery] = useState('');

  // Disaster Relief Form state
  const [reliefTitle, setReliefTitle] = useState('');
  const [reliefType, setReliefType] = useState<DisasterReliefItem['type']>('meals');
  const [reliefLocation, setReliefLocation] = useState('');
  const [reliefDistrict, setReliefDistrict] = useState('ගම්පහ');
  const [reliefDesc, setReliefDesc] = useState('');
  const [reliefTargetQty, setReliefTargetQty] = useState('');
  const [reliefUrgency, setReliefUrgency] = useState<'high' | 'medium' | 'low'>('high');
  const [reliefContactName, setReliefContactName] = useState(currentUser?.name || '');
  const [reliefContactPhone, setReliefContactPhone] = useState(currentUser?.phone || '');

  const districtsList = [
    'all',
    'කොළඹ',
    'ගම්පහ',
    'කළුතර',
    'මහනුවර',
    'මාතලේ',
    'නුවරඑළිය',
    'ගාල්ල',
    'මාතර',
    'හම්බන්තොට',
    'යාපනය',
    'කිලිනොච්චිය',
    'මන්නාරම',
    'වවුනියාව',
    'මුලතිව්',
    'මඩකලපුව',
    'අම්පාර',
    'ත්‍රිකුණාමලය',
    'කුරුණෑගල',
    'පුත්තලම',
    'අනුරාධපුරය',
    'පොළොන්නරුව',
    'බදුල්ල',
    'මොණරාගල',
    'රත්නපුර',
    'කෑගල්ල',
  ];


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

    const unsubRelief = subscribeToDisasterReliefFromFirestore((remoteRelief) => {
      if (Array.isArray(remoteRelief) && remoteRelief.length > 0) {
        setDisasterReliefItems(remoteRelief);
        saveDisasterReliefItemsToStorage(remoteRelief);
      }
    });

    return () => {
      unsubCenters();
      unsubDeliveries();
      unsubBroadcasts();
      unsubRelief();
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

  // Admin Operations: Delete, Clear All, Edit, Block Center
  const handleDeleteDelivery = async (deliveryId: string) => {
    if (!isAdmin || !deliveryId) return;
    if (!window.confirm('⚠️ මෙම ආධාර වාර්තාව ලෙජරයෙන් ස්ථිරවම මකා දැමීමට අවශ්‍ය බව සහතිකද?')) return;

    const updated = deliveries.filter(d => d.id !== deliveryId);
    setDeliveries(updated);
    saveAidDeliveriesToStorage(updated);
    try {
      await deleteAidDeliveryFromFirestore(deliveryId);
      setSuccessMessage('✅ ආධාර වාර්තාව ලෙජරයෙන් සාර්ථකව මකා දමන ලදි.');
    } catch (err) {
      console.warn('Error deleting delivery from Firestore:', err);
    }
  };

  const handleClearAllDeliveries = async () => {
    if (!isAdmin) return;
    const confirmText = prompt('⚠️ අනතුරු ඇඟවීමයි: ලෙජරයේ ඇති සියලුම බෙදාහැරීම් වාර්තා මැකීමට අවශ්‍ය නම් "CLEAR" ලෙස ටයිප් කරන්න:');
    if (confirmText !== 'CLEAR') {
      alert('ක්‍රියාවලිය අවලංගු කරන ලදි.');
      return;
    }

    const toDelete = [...deliveries];
    setDeliveries([]);
    saveAidDeliveriesToStorage([]);
    for (const d of toDelete) {
      if (d.id) {
        deleteAidDeliveryFromFirestore(d.id).catch(console.warn);
      }
    }
    setSuccessMessage('🧹 ලෙජරයේ සියලු බෙදාහැරීම් වාර්තා සාර්ථකව Clear කරන ලදි.');
  };

  const handleSaveEditedDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !editingDelivery) return;

    const updated = deliveries.map(d => d.id === editingDelivery.id ? editingDelivery : d);
    setDeliveries(updated);
    saveAidDeliveriesToStorage(updated);
    try {
      await updateAidDeliveryInFirestore(editingDelivery.id, editingDelivery);
      setSuccessMessage('✅ ආධාර වාර්තාව සාර්ථකව සංශෝධනය කරන ලදි.');
    } catch (err) {
      console.warn('Error updating delivery in Firestore:', err);
    }
    setEditingDelivery(null);
  };

  const handleConfirmBlockCenter = async () => {
    if (!isAdmin || !blockingCenterTarget) return;
    const reason = blockReasonText.trim() || 'වංචා සහගත ක්‍රියාකාරකම් හෝ පැමිණිලි හේතුවෙන් පරිපාලක විසින් අත්හිටුවන ලදි.';
    const nowIso = new Date().toISOString();

    const updatedCenter: AidRecipientCenter = {
      ...blockingCenterTarget,
      status: 'blocked',
      notes: `${blockingCenterTarget.notes ? blockingCenterTarget.notes + ' | ' : ''}[අවහිර කළා: ${reason}]`,
    };

    const updatedCenters = centers.map(c => c.id === blockingCenterTarget.id ? updatedCenter : c);
    setCenters(updatedCenters);
    saveAidCentersToStorage(updatedCenters);
    if (blockingCenterTarget.id) {
      updateAidCenterInFirestore(blockingCenterTarget.id, {
        status: 'blocked',
        notes: updatedCenter.notes,
      }).catch(console.warn);
    }

    addBlockedCredential({
      id: `block_center_${blockingCenterTarget.id}`,
      userId: blockingCenterTarget.coordinatorUserId,
      phone: blockingCenterTarget.coordinatorPhone,
      nicNumber: blockingCenterTarget.coordinatorNic,
      userName: blockingCenterTarget.coordinatorName,
      reason: `සහන මධ්‍යස්ථාන වංචා චෝදනා (#${blockingCenterTarget.centerCode} - ${blockingCenterTarget.centerName}): ${reason}`,
      blockedAt: nowIso,
    });

    setSuccessMessage(`🚫 අංක ${blockingCenterTarget.centerCode} මධ්‍යස්ථානය සහ සම්බන්ධීකාරක සාර්ථකව අවහිර (Blocked) කරන ලදි.`);
    setBlockingCenterTarget(null);
    setBlockReasonText('');
  };

  const handleUnblockCenter = async (center: AidRecipientCenter) => {
    if (!isAdmin || !center.id) return;
    if (!window.confirm(`මෙම මධ්‍යස්ථානය (#${center.centerCode}) නැවත සක්‍රීය (Restore / Unblock) කිරීමට අවශ්‍යද?`)) return;

    const updatedCenter: AidRecipientCenter = {
      ...center,
      status: 'verified',
    };

    const updatedCenters = centers.map(c => c.id === center.id ? updatedCenter : c);
    setCenters(updatedCenters);
    saveAidCentersToStorage(updatedCenters);
    updateAidCenterInFirestore(center.id, { status: 'verified' }).catch(console.warn);

    if (center.coordinatorPhone) removeBlockedCredential(center.coordinatorPhone);
    if (center.coordinatorNic) removeBlockedCredential(center.coordinatorNic);
    if (center.coordinatorUserId) removeBlockedCredential(center.coordinatorUserId);

    setSuccessMessage(`✅ අංක ${center.centerCode} මධ්‍යස්ථානය නැවත සක්‍රීය කරන ලදි.`);
  };

  const handleDeleteCenter = async (centerId: string) => {
    if (!isAdmin || !centerId) return;
    if (!window.confirm('⚠️ මෙම මධ්‍යස්ථානය පද්ධතියෙන් ස්ථිරවම මකා දැමීමට අවශ්‍ය බව සහතිකද?')) return;

    const updatedCenters = centers.filter(c => c.id !== centerId);
    setCenters(updatedCenters);
    saveAidCentersToStorage(updatedCenters);
    deleteAidCenterFromFirestore(centerId).catch(console.warn);
    setSuccessMessage('✅ මධ්‍යස්ථානය සාර්ථකව මකා දමන ලදි.');
  };

  // 2. Donor Code Lookup
  const handleLookupDonorCode = (code: string) => {
    setDonorTargetCode(code);
    setCodeLookupError(null);
    if (code.trim().length === 6) {
      const found = findAidCenterByCode(code) || centers.find(c => c.centerCode === code.trim());
      if (found) {
        if (found.status === 'blocked') {
          setMatchedCenter(null);
          setCodeLookupError('🚫 මෙම සහන මධ්‍යස්ථානය පරිපාලක විසින් තාවකාලිකව අත්හිටුවා ඇත (Blocked/Suspended). ආධාර භාරදීම අවහිර කර ඇත.');
          return;
        }
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


  // Submit Disaster Relief
  const handleCreateDisasterItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reliefTitle.trim() || !reliefLocation.trim() || !reliefContactPhone.trim()) {
      alert('කරුණාකර ආපදා තොරතුර, ස්ථානය සහ සම්බන්ධීකාරක අංකය ඇතුළත් කරන්න.');
      return;
    }

    const newItem: DisasterReliefItem = {
      id: `rel_${Date.now()}`,
      title: reliefTitle,
      type: reliefType,
      locationName: reliefLocation,
      district: reliefDistrict,
      description: reliefDesc,
      urgency: reliefUrgency,
      contactPerson: reliefContactName || 'ආපදා කමිටුව',
      contactPhone: reliefContactPhone,
      status: 'collecting',
      targetQuantity: reliefTargetQty || 'අවශ්‍ය ප්‍රමාණය පරිදි',
      collectedQuantity: 'ආරම්භක මට්ටමේ',
      createdAt: 'දැන් (Just now)',
      createdAtMs: Date.now(),
      userId: currentUser?.userId || currentUser?.id,
    };

    const updated = [newItem, ...disasterItems];
    setDisasterItems(updated);
    saveDisasterReliefItemsToStorage(updated);
    saveDisasterReliefToFirestore(newItem).catch((err) => console.warn('saveDisasterReliefToFirestore error:', err));

    broadcastAppNotification({
      type: 'aid_ledger',
      title: `📦 හදිසි ආපදා සහන ඉල්ලීමක්: ${reliefTitle}`,
      message: `${reliefLocation} (${reliefDistrict}) - ${reliefDesc || 'ආපදා සහනාධාර ද්‍රව්‍ය කඩිනමින් අවශ්‍යයි.'}`,
      locationName: reliefDistrict,
      badgeText: 'ආපදා සහන',
      targetModal: 'aid_ledger',
      targetPostId: newItem.id,
    });

    setShowAddDisasterForm(false);
    setSuccessMessage(`✅ ආපදා සහන ඉල්ලීම සාර්ථකව පළකරන ලදී!`);

    if (onSubmitHelpPost) {
      onSubmitHelpPost({
        category: 'emergency',
        tagCategory: 'හදිසි / ආපදා',
        tagName: `📦 හදිසි ආපදා සහන: ${reliefType}`,
        whatHappened: `📦 හදිසි ආපදා සහන ඉල්ලීමක්: ${reliefTitle}`,
        whatIsNeeded: `ආපදා වර්ගය: ${reliefType} • ස්ථානය: ${reliefLocation} • දිස්ත්‍රික්කය: ${reliefDistrict} • අවශ්‍ය ප්‍රමාණය: ${reliefTargetQty || 'අවශ්‍ය පරිදි'} • විස්තර: ${reliefDesc} • සම්බන්ධීකාරක: ${reliefContactName || 'ආපදා කමිටුව'} (${reliefContactPhone})`,
        locationName: `${reliefLocation}, ${reliefDistrict}`,
        district: reliefDistrict,
        priorityLevel: 'emergency',
        isPinnedEmergency: true,
        contactNumber: reliefContactPhone,
        contactPersonName: reliefContactName || 'ආපදා කමිටුව',
        status: 'open',
        postCode: `#EMG-${Math.floor(1000 + Math.random() * 9000)}`,
      }).catch((e) => console.warn('Sync disaster to help posts notice:', e));
    }

    setReliefTitle('');
    setReliefLocation('');
    setReliefDesc('');
    setReliefTargetQty('');
  };

  const canDeleteDisaster = (item: DisasterReliefItem) => {
    if (isAdmin) return true;
    if (!currentUser || !item) return false;
    const userPhone = (currentUser.phone || currentUser.whatsappNumber || '').replace(/\D/g, '');
    const itemPhone = (item.contactPhone || '').replace(/\D/g, '');
    return Boolean(
      (userPhone && itemPhone && userPhone === itemPhone) ||
      (currentUser?.name && item.contactPerson && currentUser?.name.trim().toLowerCase() === item.contactPerson.trim().toLowerCase()) ||
      (currentUser.userId && item.userId && (currentUser.userId === item.userId || currentUser.id === item.userId)) ||
      (currentUser.id && item.userId && (currentUser.id === item.userId || currentUser.userId === item.userId)) ||
      (currentUser.nicNumber && item.userId && currentUser.nicNumber === item.userId)
    );
  };

  const handleDeleteDisaster = (id?: string) => {
    if (!id) return;
    const confirmMsg = isAdmin
      ? 'පරිපාලක (Admin) ලෙස මෙම ආපදා සහනාධාර දැන්වීම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට (Delete) අවශ්‍ය බව තහවුරු කරන්න ද?'
      : 'මෙම ආපදා සහනාධාර දැන්වීම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට (Delete) අවශ්‍ය බව තහවුරු කරන්න ද?';
    if (!window.confirm(confirmMsg)) return;
    const updated = disasterItems.filter((item) => item.id !== id);
    setDisasterItems(updated);
    saveDisasterReliefItemsToStorage(updated);
    addDeletedDisasterId(id);
    deleteDisasterReliefFromFirestore(id).catch((err) => {
      console.warn('Delete disaster item notice:', err);
    });
    try {
      window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
    } catch {}
    alert('ආපදා සහනාධාර දැන්වීම සාර්ථකව ඉවත් කරන ලදී.');
  };

  const handleSupportDisaster = (item: DisasterReliefItem) => {
    if (!item || !item.id) return;
    if (!supportedDisasterIds.includes(item.id)) {
      const nextSupported = [...supportedDisasterIds, item.id];
      setSupportedDisasterIds(nextSupported);
      saveSupportedDisasterIdsToStorage(nextSupported);

      const updatedItems = (disasterItems || []).map((d) => {
        if (d && d.id === item.id) {
          return { ...d, supportedCount: (d.supportedCount || 0) + 1 };
        }
        return d;
      });
      setDisasterItems(updatedItems);
      saveDisasterReliefItemsToStorage(updatedItems);
    }
    alert(`ස්තූතියි! ${item.district} (${item.title}) සහනාධාරය සඳහා ඔබ සහය දැක්වීමට ඉදිරිපත් වීම අගය කරමු.\n\n📞 සම්බන්ධීකාරක අංකය: ${item.contactPhone}\n(දැන් ඔබට සෘජුවම අමතා සම්බන්ධීකාරක සමඟ සම්බන්ධ විය හැක)`);
  };

  const filteredDisasterItems = useMemo(() => {
    return disasterItems.filter((item) => {
      if (selectedDisasterDistrict !== 'all' && item.district !== selectedDisasterDistrict) return false;
      if (disasterSearchQuery.trim()) {
        const q = disasterSearchQuery.toLowerCase();
        return (
          (item.title || '').toLowerCase().includes(q) ||
          (item.district || '').toLowerCase().includes(q) ||
          (item.locationName || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [disasterItems, selectedDisasterDistrict, disasterSearchQuery]);
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
                  ආපදා සහන සේවය
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-emerald-950 uppercase">
                  Disaster Relief Service
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                ආපදා සහන ඉල්ලීම්, සහන කඳවුරු සහ ආධාර විනිවිදභාවයේ ලෙජරය
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

                {/* Top-Level Mode Selector (Requirement 3 & 6): 📦 ආපදා සහන ඉල්ලීම් vs ⛺ සහන කඳවුරු */}
        <div className="p-2.5 sm:p-4 bg-gradient-to-b from-slate-100 to-emerald-50/50 dark:from-[#05140d] dark:to-[#071b12] border-b border-emerald-200/80 dark:border-emerald-900/60 shrink-0">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {/* Mode 1: ආපදා සහන ඉල්ලීම් (Disaster Relief Requests) */}
            <button
              type="button"
              onClick={() => { setMainSection('disaster_requests'); setSuccessMessage(null); }}
              className={`p-3.5 sm:p-4 rounded-2xl transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[96px] sm:min-h-[108px] relative overflow-hidden active:scale-98 shadow-md ${
                mainSection === 'disaster_requests'
                  ? 'bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 text-white shadow-xl shadow-teal-600/40 border-2 border-white ring-4 ring-teal-400/50 scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 hover:border-teal-400/80 hover:scale-[1.01] opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform ${
                  mainSection === 'disaster_requests' ? 'bg-white/20 text-white' : 'bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-300'
                }`}>
                  <Waves className="w-5 h-5" />
                </div>
                <span className={`px-2.5 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black shadow-md ${
                  mainSection === 'disaster_requests' ? 'bg-white text-teal-800' : 'bg-teal-50 dark:bg-teal-900 text-teal-700 dark:text-teal-200 border border-teal-200 dark:border-teal-700'
                }`}>
                  {disasterItems.length} ඉල්ලීම්
                </span>
              </div>
              <div className="min-w-0 mt-2">
                <h4 className={`text-sm sm:text-base font-black leading-tight flex items-center gap-1.5 ${
                  mainSection === 'disaster_requests' ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}>
                  <span>ආපදා සහන ඉල්ලීම්</span>
                  {mainSection === 'disaster_requests' && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </h4>
                <p className={`text-[11px] sm:text-xs font-semibold truncate mt-0.5 ${
                  mainSection === 'disaster_requests' ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  සහන මෙහෙයුම් & ආධාර අවශ්‍යතා
                </p>
              </div>
            </button>

            {/* Mode 2: සහන කඳවුරු (Relief Camps) */}
            <button
              type="button"
              onClick={() => { setMainSection('relief_camps'); setSuccessMessage(null); }}
              className={`p-3.5 sm:p-4 rounded-2xl transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[96px] sm:min-h-[108px] relative overflow-hidden active:scale-98 shadow-md ${
                mainSection === 'relief_camps'
                  ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-800 text-white shadow-xl shadow-emerald-700/40 border-2 border-white ring-4 ring-emerald-400/50 scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400/80 hover:scale-[1.01] opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform ${
                  mainSection === 'relief_camps' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300'
                }`}>
                  <Building className="w-5 h-5" />
                </div>
                <span className={`px-2.5 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black shadow-md ${
                  mainSection === 'relief_camps' ? 'bg-white text-emerald-900' : 'bg-emerald-50 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700'
                }`}>
                  {centers.length} කඳවුරු / මධ්‍යස්ථාන
                </span>
              </div>
              <div className="min-w-0 mt-2">
                <h4 className={`text-sm sm:text-base font-black leading-tight flex items-center gap-1.5 ${
                  mainSection === 'relief_camps' ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}>
                  <span>සහන කඳවුරු</span>
                  {mainSection === 'relief_camps' && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </h4>
                <p className={`text-[11px] sm:text-xs font-semibold truncate mt-0.5 ${
                  mainSection === 'relief_camps' ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  ලියාපදිංචි කඳවුරු & විනිවිදභාවයේ ලෙජරය
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* VIEW 1: 📦 ආපදා සහන ඉල්ලීම් (Disaster Relief Requests) */}
        {/* ==================================================== */}
        {mainSection === 'disaster_requests' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-[#05140d]">
            {/* CTA Button to add new Disaster Relief Request */}
            <button
              type="button"
              onClick={() => {
                if (isDemo) {
                  if (onRequireRegistration) onRequireRegistration();
                  return;
                }
                setShowAddDisasterForm(true);
              }}
              className="w-full py-4 sm:py-4.5 px-5 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-sm sm:text-base shadow-xl shadow-teal-600/30 hover:shadow-teal-600/50 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-3 border-2 border-teal-300/80 group"
            >
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <Plus className="w-5 h-5 text-white stroke-[3]" />
              </div>
              <span className="tracking-wide">+ නව ආපදා සහනාධාර අවශ්‍යතාවක් එක්කරන්න (Post Relief Request)</span>
              <Waves className="w-5 h-5 text-white animate-pulse" />
            </button>

            {/* Filter Bar: District & Search */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">දිස්ත්‍රික්කය:</span>
                <select
                  value={selectedDisasterDistrict}
                  onChange={(e) => setSelectedDisasterDistrict(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-xs"
                >
                  {districtsList.map((dist) => (
                    <option key={`disaster_dist_${dist}`} value={dist}>
                      {dist === 'all' ? 'සියලු දිස්ත්‍රික්ක' : dist}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={disasterSearchQuery}
                  onChange={(e) => setDisasterSearchQuery(e.target.value)}
                  placeholder="නගරය, ආපදාව හෝ අවශ්‍යතාව සොයන්න..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Header info bar (Anchor for auto-scroll) */}
            <div id="disaster-requests-feed" className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs scroll-mt-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  සක්‍රිය ආපදා සහනාධාර අවශ්‍යතා ({filteredDisasterItems.length})
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                {selectedDisasterDistrict !== 'all' ? `දිස්ත්‍රික්කය: ${selectedDisasterDistrict}` : 'දිවයින පුරා සියලු දිස්ත්‍රික්ක'}
              </span>
            </div>

            {/* Disaster Items List */}
            {filteredDisasterItems.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white dark:bg-[#071d12] rounded-2xl border border-emerald-100 dark:border-emerald-900/60 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                    තෝරාගත් සෙවුමට හෝ දිස්ත්‍රික්කයට අදාළ ආපදා වාර්තා වී නොමැත
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ඔබගේ ප්‍රදේශයේ ආපදාවක් හෝ සහනාධාර අවශ්‍යතාවක් ඇත්නම් ඉහත බොත්තම මඟින් දැනුම්දෙන්න.
                  </p>
                </div>
              </div>
            ) : (
              filteredDisasterItems.filter(Boolean).map((item, itmIdx) => {
                const isSupported = item.id ? supportedDisasterIds.includes(item.id) : false;
                return (
                  <div
                    key={`disaster_item_${item.id || 'itm'}_${itmIdx}`}
                    className="p-4 sm:p-5 bg-white dark:bg-[#071d12] border-2 border-emerald-200/80 dark:border-emerald-900/80 hover:border-emerald-400 rounded-2xl shadow-xs transition-all space-y-3"
                  >
                    {/* Card Top: Badges & Title */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            <span>{item.urgency === 'high' ? '🚨 හදිසි අවශ්‍යතාවක්' : 'සහනාධාර ඉල්ලීමක්'}</span>
                          </span>

                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>{item.district} ({item.locationName})</span>
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                            {item.type === 'meals' && '🍲 පිසූ ආහාර'}
                            {item.type === 'dry_rations' && '📦 වියළි සලාක'}
                            {item.type === 'water_medicine' && '💊 ජලය / ඖෂධ'}
                            {item.type === 'clothing_blankets' && '👕 ඇඳුම් / ඇතිරිලි'}
                            {item.type === 'temporary_shelter' && '⛺ තාවකාලික නවාතැන්'}
                            {item.type === 'other' && '🤝 වෙනත් ආධාර'}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                          {item.title}
                        </h4>
                      </div>
                    </div>

                    {/* Detailed Description */}
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-emerald-950">
                      {item.description}
                    </p>

                    {/* Quantity & Status & Support Count Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-emerald-50/50 dark:bg-[#04150d] rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">අවශ්‍ය ප්‍රමාණය / ඉලක්කය:</span>
                        <span className="font-black text-slate-800 dark:text-slate-200 font-mono">
                          {item.targetQuantity || 'අවශ්‍ය පරිදි'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">සහන එකතුකිරීමේ තත්ත්වය:</span>
                        <span className="font-bold text-amber-700 dark:text-amber-300">
                          {item.status === 'collecting' ? '📦 එකතු කරමින් පවතී' : '🚨 කඩිනමින් අවශ්‍යයි'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">සහය දැක්වූ පිරිස:</span>
                        <span className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{item.supportedCount || 0} දෙනෙකු සහය වීමට එක්ව ඇත</span>
                        </span>
                      </div>
                    </div>

                    {/* Footer: Coordinator Info & Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-100 dark:border-emerald-950">
                      <div className="text-xs">
                        <span className="text-[10px] text-slate-400 block">සම්බන්ධීකාරක / සංවිධානය:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{maskName(item.contactPerson, isDemo)}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {canDeleteDisaster(item) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDisaster(item.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-900 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                            title={isAdmin ? "පරිපාලක ලෙස ආපදා දැන්වීම ඉවත් කරන්න (Admin Delete)" : "ආපදා දැන්වීම ඉවත් කරන්න (Delete)"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isAdmin ? 'ඉවත් කරන්න (Admin)' : 'ඉවත් කරන්න'}</span>
                          </button>
                        )}
                        {!isDemo && isSupported ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 shadow-xs">
                              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                              <span className="font-mono font-black">{item.contactPhone}</span>
                            </div>

                            <a
                              href={`tel:${item.contactPhone}`}
                              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                            >
                              <Phone className="w-4 h-4" />
                              <span>අමතන්න</span>
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-bold">
                              <Lock className="w-4 h-4 text-slate-400" />
                              <span className="font-mono tracking-widest">{maskPhone(item.contactPhone, true)}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (isDemo) {
                                  if (onRequireRegistration) onRequireRegistration();
                                  return;
                                }
                                handleSupportDisaster(item);
                              }}
                              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer border-2 border-emerald-400/80 hover:scale-105"
                            >
                              <HeartHandshake className="w-4 h-4 text-emerald-200" />
                              <span>මම සහය වෙමි</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 2: ⛺ සහන කඳවුරු (Relief Camps & Aid Ledger)    */}
        {/* ==================================================== */}
        {mainSection === 'relief_camps' && (
          <>
{/* Navigation Sub-Buttons (Compact, High-Visibility Responsive Bar) */}
        <div id="relief-camps-nav" className="p-2 sm:p-2.5 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Admin-Only Tab: 📊 පොදු ලෙජරය (පරිපාලක සඳහා පමණි) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => { setActiveTab('public_ledger'); setSuccessMessage(null); }}
                className={`py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-black text-xs border shadow-xs active:scale-95 ${
                  activeTab === 'public_ledger'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-sm shadow-emerald-700/30 ring-2 ring-emerald-400/40'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>📊 ලෙජරය (Admin)</span>
              </button>
            )}

            {/* Button 2: 🏢 ස්ථානයක් ලියාපදිංචි කිරිම */}
            <button
              type="button"
              onClick={() => { setActiveTab('register_center'); setSuccessMessage(null); }}
              className={`py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-black text-xs border shadow-xs active:scale-95 ${
                activeTab === 'register_center'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-sm shadow-emerald-700/30'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-blue-500" />
              <span>🏢 මධ්‍යස්ථාන ලියාපදිංචිය</span>
            </button>

            {/* Button 3: 🚚 ආධාර සටහන් කිරීම */}
            <button
              type="button"
              onClick={() => { setActiveTab('log_delivery'); setSuccessMessage(null); }}
              className={`py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-black text-xs border shadow-xs active:scale-95 ${
                activeTab === 'log_delivery'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-sm shadow-emerald-700/30'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-amber-500" />
              <span>🚚 ආධාර සටහන් කිරීම</span>
            </button>

            {/* Button 4: 📥 ආධාර ලැබීම් තහවුරුව */}
            <button
              type="button"
              onClick={() => { setActiveTab('recipient_confirm'); setSuccessMessage(null); }}
              className={`py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-black text-xs border shadow-xs active:scale-95 ${
                activeTab === 'recipient_confirm'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-sm shadow-emerald-700/30'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>📥 ලැබීම් තහවුරුව</span>
              {pendingDeliveries.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-black animate-pulse">
                  {pendingDeliveries.length}
                </span>
              )}
            </button>

            {/* Button 5: 📢 ප්‍රජා නිවේදන */}
            <button
              type="button"
              onClick={() => { setActiveTab('broadcasts'); setSuccessMessage(null); }}
              className={`py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-black text-xs border shadow-xs active:scale-95 ${
                activeTab === 'broadcasts'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-sm shadow-emerald-700/30'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-purple-500" />
              <span>📢 ප්‍රජා නිවේදන</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">

          {/* ==================================================== */}
          {/* TAB 1: 📊 ADMIN AUDIT & VERIFIED AID LEDGER (Strictly Admin Only) */}
          {/* ==================================================== */}
          {activeTab === 'public_ledger' && isAdmin && (
            <div className="space-y-6">
              {/* Page Header Banner */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-transparent border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>📊 පරිපාලක අධීක්ෂණ සහන ලෙජරය (Admin Audit Ledger)</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    *මෙම ලෙජරය පරිපාලක (Admin) සඳහා පමණක් විවෘත වේ. සියලු ආධාර ගනුදෙනු, මධ්‍යස්ථාන නිරීක්ෂණය සහ වංචා පාලනය.
                  </p>
                </div>
                {/* Admin Clear All Button */}
                <button
                  type="button"
                  onClick={handleClearAllDeliveries}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>සියලු දත්ත Clear කරන්න</span>
                </button>
              </div>

              {/* Sub-view switcher: Deliveries vs Centers Audit */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setLedgerSubView('deliveries')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    ledgerSubView === 'deliveries'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>📦 ආධාර බෙදාහැරීම් වාර්තා ({filteredDeliveries.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerSubView('centers')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    ledgerSubView === 'centers'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>🏢 මධ්‍යස්ථාන නිරීක්ෂණය & Audit ({centers.length})</span>
                </button>
              </div>

              {ledgerSubView === 'deliveries' ? (
                <>
                  {/* Metric Summary Cards (No Estimated Monetary Value Card) */}
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

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 shadow-xs">
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                        <span className="text-xs font-black uppercase">බලාපොරොත්තුවෙන්</span>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100">
                        {pendingDeliveries.length}
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">තහවුරු වීමට ඇති</p>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 shadow-xs">
                      <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                        <span className="text-xs font-black uppercase">ලියාපදිංචි මධ්‍යස්ථාන</span>
                        <Building className="w-4 h-4" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-100">
                        {centers.length}
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">අංක 6ක ස්ථාන</p>
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
                        *පරිපාලක අධීක්ෂණ දත්ත
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

                                <div className="flex items-center gap-2">
                                  {isConfirmed ? (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500 text-white flex items-center gap-1 shadow-xs">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>ලබාගත් බව තහවුරු කළා</span>
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500 text-white flex items-center gap-1 shadow-xs">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>මධ්‍යස්ථාන තහවුරුව බලාපොරොත්තුවෙන්</span>
                                    </span>
                                  )}

                                  {/* Admin Actions: Edit & Delete */}
                                  <button
                                    type="button"
                                    onClick={() => setEditingDelivery(record)}
                                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1"
                                    title="වාර්තාව සංශෝධනය (Edit)"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-blue-500" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDelivery(record.id)}
                                    className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-700 dark:text-rose-200 text-xs font-bold flex items-center gap-1"
                                    title="වාර්තාව මකන්න (Delete)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  </button>
                                </div>
                              </div>

                              {/* Item & Quantity Details Grid (Estimated value removed) */}
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
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
                </>
              ) : (
                /* Centers Audit & Surveillance View */
                <div className="space-y-4">
                  {/* Surveillance Filters */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2.5 items-center justify-between">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={centerAuditSearch}
                        onChange={(e) => setCenterAuditSearch(e.target.value)}
                        placeholder="කේතය, මධ්‍යස්ථානය, භාරකරු, NIC හෝ දුරකථනය සොයන්න..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={centerAuditStatusFilter}
                        onChange={(e: any) => setCenterAuditStatusFilter(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      >
                        <option value="all">සියලු තත්ත්වයන් (All Status)</option>
                        <option value="verified">✅ සක්‍රීය මධ්‍යස්ථාන පමණක්</option>
                        <option value="blocked">🚫 අවහිර කළ (Blocked) පමණක්</option>
                      </select>
                    </div>
                  </div>

                  {/* Centers List */}
                  <div className="space-y-3">
                    {centers
                      .filter(c => {
                        if (centerAuditStatusFilter === 'verified' && c.status === 'blocked') return false;
                        if (centerAuditStatusFilter === 'blocked' && c.status !== 'blocked') return false;
                        if (!centerAuditSearch.trim()) return true;
                        const q = centerAuditSearch.trim().toLowerCase();
                        return (
                          (c.centerCode && c.centerCode.toLowerCase().includes(q)) ||
                          (c.centerName && c.centerName.toLowerCase().includes(q)) ||
                          (c.coordinatorName && c.coordinatorName.toLowerCase().includes(q)) ||
                          (c.coordinatorPhone && c.coordinatorPhone.includes(q)) ||
                          (c.coordinatorNic && c.coordinatorNic.toLowerCase().includes(q)) ||
                          (c.town && c.town.toLowerCase().includes(q))
                        );
                      })
                      .map(center => {
                        const isBlocked = center.status === 'blocked';
                        const centerDeliveries = deliveries.filter(d => d.centerCode === center.centerCode);
                        const isExpanded = expandedCenterCode === center.centerCode;

                        return (
                          <div
                            key={center.id}
                            className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${
                              isBlocked
                                ? 'bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-900'
                                : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-1">
                                    <Building className="w-3.5 h-3.5" />
                                    <span>කේතය: {center.centerCode}</span>
                                  </span>
                                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                    {center.centerName}
                                  </h4>
                                  <span className="text-xs text-slate-500">
                                    📍 {center.town} ({center.district})
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3 flex-wrap pt-0.5">
                                  <span>👤 භාරකරු: <strong>{center.coordinatorName}</strong></span>
                                  <span>📞 {center.coordinatorPhone}</span>
                                  {center.coordinatorNic && <span>🆔 NIC: {center.coordinatorNic}</span>}
                                  <span>👥 ජනගහනය: {center.peopleCount} (පවුල් {center.familiesCount})</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isBlocked ? (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-red-600 text-white flex items-center gap-1 shadow-xs">
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>🚫 අවහිර කළ මධ්‍යස්ථානයක්</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500 text-white flex items-center gap-1 shadow-xs">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>✅ සක්‍රීයයි</span>
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setExpandedCenterCode(isExpanded ? null : center.centerCode)}
                                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>ගනුදෙනු ({centerDeliveries.length})</span>
                                </button>

                                {isBlocked ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUnblockCenter(center)}
                                    className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                  >
                                    නැවත සක්‍රීය (Restore)
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setBlockingCenterTarget(center)}
                                    className="px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>අවහිර කරන්න (Block)</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteCenter(center.id)}
                                  className="p-1.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-700 dark:text-rose-200 text-xs font-bold"
                                  title="මධ්‍යස්ථානය මකන්න"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Expanded Center Transaction Ledger */}
                            {isExpanded && (
                              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                <h5 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                                  📜 මෙම මධ්‍යස්ථානයට ලැබුණු ආධාර ගනුදෙනු ඉතිහාසය ({centerDeliveries.length})
                                </h5>
                                {centerDeliveries.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">මෙම මධ්‍යස්ථානයට තවමත් ආධාර බෙදාහැරීම් වාර්තා වී නොමැත.</p>
                                ) : (
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {centerDeliveries.map(d => (
                                      <div key={d.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2 flex-wrap">
                                        <div>
                                          <span className="font-black text-emerald-700 dark:text-emerald-400">{d.categoryTitleSi}</span>
                                          <span className="ml-2 font-bold text-slate-900 dark:text-white">ප්‍රමාණය: {d.quantity}</span>
                                          <p className="text-[11px] text-slate-500 mt-0.5">{d.itemDescription}</p>
                                        </div>
                                        <div className="text-right text-[11px] text-slate-500">
                                          <span>🚚 {d.donorName}</span>
                                          <span className="block">{d.deliveryDate} {d.deliveryTime}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: 🏢 REGISTER 6-DIGIT RECIPIENT CENTER          */}
          {/* ==================================================== */}
          {activeTab === 'register_center' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Page Header Banner */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-600/15 via-teal-600/10 to-transparent border border-blue-500/30 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-600" />
                    <span>🏢 සහන මධ්‍යස්ථානයක් / කඳවුරක් ලියාපදිංචි කිරීම</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ආධාර ලබාගැනීම සඳහා අංක 6ක නිල කේතයක් ලබාගෙන ඔබගේ කඳවුර සක්‍රීය කරන්න.
                  </p>
                </div>
              </div>
              
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
                    {isAdmin ? (
                      <button
                        onClick={() => setActiveTab('public_ledger')}
                        className="px-6 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all cursor-pointer"
                      >
                        ලෙජරය බලන්න
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab('recipient_confirm')}
                        className="px-6 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all cursor-pointer"
                      >
                        ආධාර ලැබීම් පුවරුව
                      </button>
                    )}
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

                  </>
        )}

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

      {/* Add Disaster Relief Request Form Modal */}
      {showAddDisasterForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#071911] border-2 border-teal-500 rounded-3xl p-5 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-teal-100 dark:border-teal-900">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-teal-600" />
                <span>ආපදා සහන අවශ්‍යතාවක් පලකිරීම</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddDisasterForm(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreateDisasterItem} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ආපදා තත්ත්වය / අවශ්‍යතාවය *
                </label>
                <input
                  type="text"
                  required
                  value={reliefTitle}
                  onChange={(e) => setReliefTitle(e.target.value)}
                  placeholder="උදා: ගංවතුරින් පීඩාවට පත් පවුල් සඳහා පිසූ ආහාර"
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    සහන වර්ගය (Type)
                  </label>
                  <select
                    value={reliefType}
                    onChange={(e) => setReliefType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="meals">🍱 පිසූ ආහාර</option>
                    <option value="dry_rations">🌾 වියළි සලාක</option>
                    <option value="water_medicine">💧 පානීය ජලය / බෙහෙත්</option>
                    <option value="clothing_blankets">🧥 ඇඳුම් / පොරෝන</option>
                    <option value="temporary_shelter">🏕️ තාවකාලික නවාතැන්</option>
                    <option value="other">🤝 වෙනත් ආධාර</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    දිස්ත්‍රික්කය
                  </label>
                  <select
                    value={reliefDistrict}
                    onChange={(e) => setReliefDistrict(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  >
                    {districtsList.filter((d) => d !== 'all').map((dist) => (
                      <option key={`form_dist_${dist}`} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ස්ථානය (Location) *
                </label>
                <input
                  type="text"
                  required
                  value={reliefLocation}
                  onChange={(e) => setReliefLocation(e.target.value)}
                  placeholder="උදා: කැළණිය ප්‍රදේශය"
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    අවශ්‍ය ප්‍රමාණය (Target Qty)
                  </label>
                  <input
                    type="text"
                    value={reliefTargetQty}
                    onChange={(e) => setReliefTargetQty(e.target.value)}
                    placeholder="උදා: ආහාර පැකට් 100"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    අවශ්‍යතාවයේ හදිසි බව
                  </label>
                  <select
                    value={reliefUrgency}
                    onChange={(e) => setReliefUrgency(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="high">🚨 ඉතා හදිසි (High)</option>
                    <option value="medium">⚡ මධ්‍යම (Medium)</option>
                    <option value="low">🌱 සාමාන්‍ය (Low)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    සම්බන්ධීකාරක නම
                  </label>
                  <input
                    type="text"
                    value={reliefContactName}
                    onChange={(e) => setReliefContactName(e.target.value)}
                    placeholder="උදා: කමල් ප්‍රනාන්දු"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    දුරකථන අංකය *
                  </label>
                  <input
                    type="tel"
                    required
                    value={reliefContactPhone}
                    onChange={(e) => setReliefContactPhone(e.target.value)}
                    placeholder="07X XXX XXXX"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  විස්තරය (Description)
                </label>
                <textarea
                  rows={2}
                  value={reliefDesc}
                  onChange={(e) => setReliefDesc(e.target.value)}
                  placeholder="ආපදාවට පත්වූවන් සංඛ්‍යාව හා අවශ්‍ය ප්‍රමුඛතා..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white font-black text-sm sm:text-base shadow-xl shadow-teal-600/30 hover:shadow-teal-600/50 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer border-2 border-teal-300/80"
              >
                ආපදා සහන අවශ්‍යතාවය පලකරන්න
              </button>
            </form>
          </div>
        </div>
      )}
      {/* ========================================== */}
      {/* ADMIN EDIT DELIVERY MODAL                  */}
      {/* ========================================== */}
      {editingDelivery && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-500" />
                <span>ආධාර වාර්තාව සංශෝධනය (Edit Aid Delivery)</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingDelivery(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedDelivery} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ආධාර කාණ්ඩය:</label>
                <select
                  value={editingDelivery.category}
                  onChange={(e) => {
                    const catObj = AID_CATEGORIES.find(c => c.id === e.target.value);
                    setEditingDelivery({
                      ...editingDelivery,
                      category: e.target.value as AidCategory,
                      categoryTitleSi: catObj?.titleSi || editingDelivery.categoryTitleSi,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  {AID_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.titleSi}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ලබාදුන් ප්‍රමාණය:</label>
                <input
                  type="text"
                  value={editingDelivery.quantity}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">භාණ්ඩ විස්තරය:</label>
                <textarea
                  value={editingDelivery.itemDescription}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, itemDescription: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">පරිත්‍යාගශීලියා / සංවිධානය:</label>
                <input
                  type="text"
                  value={editingDelivery.donorName}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, donorName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">පරිත්‍යාගශීලියාගේ සටහන:</label>
                <input
                  type="text"
                  value={editingDelivery.donorNotes || ''}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, donorNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDelivery(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                >
                  සංශෝධනය සුරකින්න
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ADMIN BLOCK CENTER CONFIRMATION MODAL      */}
      {/* ========================================== */}
      {blockingCenterTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-md w-full border-2 border-red-500/50 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-black text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>සහන මධ්‍යස්ථානයක් අවහිර කිරීම (Block Center)</span>
            </div>

            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-900 dark:text-red-200 space-y-1">
              <p><strong>කේතය:</strong> #{blockingCenterTarget.centerCode}</p>
              <p><strong>නම:</strong> {blockingCenterTarget.centerName}</p>
              <p><strong>භාරකරු:</strong> {blockingCenterTarget.coordinatorName} ({blockingCenterTarget.coordinatorPhone})</p>
              <p className="text-[11px] text-red-700 dark:text-red-300 pt-1">
                ⚠️ මෙම මධ්‍යස්ථානය අවහිර කළ පසු පරිත්‍යාගශීලීන්ට මෙම අංකයට ආධාර ලොග් කිරීමට නොහැකි වන අතර සම්බන්ධීකාරකගේ අංකය Blacklist කරනු ලැබේ.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                අවහිර කිරීමට හේතුව (Reason for Blocking):
              </label>
              <textarea
                value={blockReasonText}
                onChange={(e) => setBlockReasonText(e.target.value)}
                placeholder="උදා: වංචනික තොරතුරු සැපයීම හෝ ආධාර අවභාවිතා කිරීම පිළිබඳ පැමිණිලි..."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setBlockingCenterTarget(null); setBlockReasonText(''); }}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                අවලංගු කරන්න
              </button>
              <button
                type="button"
                onClick={handleConfirmBlockCenter}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>අවහිර කිරීම තහවුරු කරන්න</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
