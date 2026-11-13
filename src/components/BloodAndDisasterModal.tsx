import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, 
  Droplet, 
  Waves, 
  MapPin, 
  Plus, 
  Search, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  ShieldCheck, 
  Share2, 
  X, 
  Calendar,
  Building,
  Package,
  Check,
  Lock,
  Unlock,
  Users,
  HeartHandshake,
  Trash2,
  Sparkles,
  ArrowRight,
  MessageCircle
} from 'lucide-react';
import { BloodDonationRequest, VolunteerDonor, BloodGroup, Language, User as UserType } from '../types';
import { maskName, maskPhone, maskAddress } from '../utils/demoDataMasker';
import { 
  getStoredBloodRequests, 
  saveBloodRequestsToStorage, 
  getStoredVolunteerDonors, 
  saveVolunteerDonorsToStorage, 
  getStoredSupportedBloodIds, 
  saveSupportedBloodIdsToStorage,
  purgeBloodRequestEverywhere,
} from '../data/bloodAndDisasterData';
import { checkIsAdmin, checkIsPostOwner } from '../utils/postOwnerHelper';
import { 
  addDeletedBloodId, 
  addDeletedDonorId,
  isBloodPermanentlyDeleted,
  isPostPermanentlyDeleted,
} from '../utils/deletedPostsManager';
import { 
  deleteBloodRequestFromFirestore, 
  deleteVolunteerDonorFromFirestore, 
  deleteDisasterReliefFromFirestore,
  saveBloodRequestToFirestore,
  saveVolunteerDonorToFirestore,
  saveDisasterReliefToFirestore,
  subscribeToBloodRequestsFromFirestore,
  subscribeToVolunteerDonorsFromFirestore,
  deduplicatePostReplies
} from '../lib/firebase';
import { broadcastAppNotification } from '../utils/notificationManager';
import { broadcastPushNotification } from '../utils/fcmNotificationService';

interface BloodAndDisasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType;
  lang?: Language;
  initialTab?: 'blood_requests' | 'volunteer_donors';
  onRequireRegistration?: () => void;
  onOpenAidLedger?: () => void;
  onSubmitHelpPost?: (post: any) => Promise<any>;
  helpPosts?: any[];
  onOfferSupport?: (post: any) => void;
  onOpenChat?: (post: any) => void;
  onOpenSupportOffers?: (post: any) => void;
}

export const BloodAndDisasterModal: React.FC<BloodAndDisasterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang = 'si',
  initialTab = 'blood_requests',
  onRequireRegistration,
  onOpenAidLedger,
  onSubmitHelpPost,
  helpPosts,
  onOfferSupport,
  onOpenChat,
  onOpenSupportOffers,
}) => {
  const isDemo = Boolean(currentUser?.isDemo);
  const [activeTab, setActiveTab] = useState<'blood_requests' | 'volunteer_donors'>(initialTab || 'blood_requests');

  // States
  const [bloodRequests, setBloodRequests] = useState<BloodDonationRequest[]>(() => getStoredBloodRequests());
  const [volunteerDonors, setVolunteerDonors] = useState<VolunteerDonor[]>(() => getStoredVolunteerDonors());
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Real-time Firestore sync & local event sync
  React.useEffect(() => {
    const refresh = () => {
      setBloodRequests(getStoredBloodRequests());
      setVolunteerDonors(getStoredVolunteerDonors());
    };

    const unsubBlood = subscribeToBloodRequestsFromFirestore((reqs) => {
      if (reqs && reqs.length >= 0) {
        saveBloodRequestsToStorage(reqs);
        setBloodRequests(getStoredBloodRequests());
      }
    });

    const unsubDonors = subscribeToVolunteerDonorsFromFirestore((donors) => {
      if (donors && donors.length >= 0) {
        saveVolunteerDonorsToStorage(donors);
        setVolunteerDonors(getStoredVolunteerDonors());
      }
    });

    window.addEventListener('sahaya_blood_disaster_updated', refresh);
    window.addEventListener('sahaya_sync_all_services', refresh);
    window.addEventListener('sahaya_post_deleted', refresh);

    return () => {
      unsubBlood();
      unsubDonors();
      window.removeEventListener('sahaya_blood_disaster_updated', refresh);
      window.removeEventListener('sahaya_sync_all_services', refresh);
      window.removeEventListener('sahaya_post_deleted', refresh);
    };
  }, []);

  // User Supported / Offered tracking
  const [supportedBloodIds, setSupportedBloodIds] = useState<string[]>(() => getStoredSupportedBloodIds());

  // Filter States
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Modals
  const [showAddBloodRequestForm, setShowAddBloodRequestForm] = useState(false);
  const [showRegisterDonorForm, setShowRegisterDonorForm] = useState(false);

  // New Blood Request Form state
  const [newPatientName, setNewPatientName] = useState('');
  const [newBloodGroup, setNewBloodGroup] = useState<BloodGroup>('O+');
  const [newUnitsNeeded, setNewUnitsNeeded] = useState<number>(1);
  const [newHospitalName, setNewHospitalName] = useState('');
  const [newDistrict, setNewDistrict] = useState('ගම්පහ');
  const [newUrgency, setNewUrgency] = useState<'urgent' | 'within_24h' | 'planned'>('urgent');
  const [newNeededDate, setNewNeededDate] = useState('අද දින (Today)');
  const [newContactName, setNewContactName] = useState(currentUser?.name || '');
  const [newContactPhone, setNewContactPhone] = useState(currentUser?.phone || '');
  const [newNotes, setNewNotes] = useState("");
  const [newWardNumber, setNewWardNumber] = useState("");
  const [newRequestSlipNumber, setNewRequestSlipNumber] = useState("");
  const [newRequestSlipPhotoUrl, setNewRequestSlipPhotoUrl] = useState("");
  const [newDropLocationUrl, setNewDropLocationUrl] = useState("");
  const [hospitalPinLat, setHospitalPinLat] = useState<number | null>(null);
  const [hospitalPinLng, setHospitalPinLng] = useState<number | null>(null);
  const [showUberMapPicker, setShowUberMapPicker] = useState<boolean>(false);
  const [viewingSlipPhoto, setViewingSlipPhoto] = useState<string | null>(null);

  useEffect(() => {
    const handleBloodModalClose = () => {
      onClose();
    };
    window.addEventListener("sahaya_blood_modal_close", handleBloodModalClose);
    return () => window.removeEventListener("sahaya_blood_modal_close", handleBloodModalClose);
  }, [onClose]);

  const handleSlipPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewRequestSlipPhotoUrl(String(event.target?.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const handlePinLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setHospitalPinLat(pos.coords.latitude);
          setHospitalPinLng(pos.coords.longitude);
          setNewDropLocationUrl(`https://www.google.com/maps/dir/?api=1&destination=${pos.coords.latitude},${pos.coords.longitude}&travelmode=driving`);
        },
        () => {
          alert("GPS පිහිටීම ලබාගැනීමට නොහැකි විය. කරුණාකර Google Maps Link එක හෝ රෝහලේ නම ඇතුළත් කරන්න.");
        }
      );
    }
  };

  // Donor Register Form state
  const [donorName, setDonorName] = useState(currentUser?.name || '');
  const [donorPhone, setDonorPhone] = useState(currentUser?.phone || '');
  const [donorBloodGroup, setDonorBloodGroup] = useState<BloodGroup>('O+');
  const [donorDistrict, setDonorDistrict] = useState('ගම්පහ');
  const [donorLastDate, setDonorLastDate] = useState('');

  // Auto-scroll to Notice Feed when opening modal or changing activeTab
  React.useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const targetId = activeTab === 'blood_requests' ? 'blood-requests-feed' : 'volunteer-donors-feed';
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [isOpen, activeTab]);

  const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
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
    'අනුරාධපුර',
    'පොළොන්නරුව',
    'බදුල්ල',
    'මොණරාගල',
    'රත්නපුර',
    'කෑගල්ල',
  ];

  // Submit Blood Request
  const handleCreateBloodRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newHospitalName.trim() || !newContactPhone.trim()) {
      alert('කරුණාකර රෝගියාගේ නම, රෝහල සහ දුරකථන අංකය ඇතුළත් කරන්න.');
      return;
    }

    const actualAuthorIdVal = currentUser?.userId || (currentUser as any)?.id || currentUser?.nicNumber || (currentUser as any)?.nic || '';
    const actualAuthorNameVal = currentUser?.name || '';
    const actualAuthorPhoneVal = currentUser?.phone || (currentUser as any)?.whatsappPhone || (currentUser as any)?.whatsappNumber || '';

    const newRequest: BloodDonationRequest = {
      id: `bld_${Date.now()}`,
      postCode: `#BLD-${Math.floor(100 + Math.random() * 900)}`,
      patientName: newPatientName,
      bloodGroup: newBloodGroup,
      unitsNeeded: Number(newUnitsNeeded) || 1,
      hospitalName: newHospitalName,
      district: newDistrict,
      urgency: newUrgency,
      neededDate: newNeededDate,
      contactName: newContactName || currentUser?.name || 'සම්බන්ධීකාරක',
      contactPhone: newContactPhone,
      additionalNotes: newNotes,
      wardNumber: newWardNumber,
      requestSlipNumber: newRequestSlipNumber,
      requestSlipPhotoUrl: newRequestSlipPhotoUrl,
      dropLocationUrl: newDropLocationUrl,
      hospitalPinLat: hospitalPinLat || undefined,
      hospitalPinLng: hospitalPinLng || undefined,
      status: "active",
      createdAt: 'දැන් (Just now)',
      createdAtMs: Date.now(),
      userId: actualAuthorIdVal,
    };

    const updated = [newRequest, ...bloodRequests];
    setBloodRequests(updated);
    saveBloodRequestsToStorage(updated);
    saveBloodRequestToFirestore(newRequest).catch((err) => console.warn('saveBloodRequestToFirestore error:', err));

    // Do NOT call broadcastAppNotification locally on the publisher's own device (so the publisher does not hear the alert sound).
    // If onSubmitHelpPost is not provided, dispatch push notification to other users with senderId.
    if (!onSubmitHelpPost) {
      broadcastPushNotification({
        category: 'emergency_blood',
        title: `🩸 හදිසි ${newBloodGroup} ලේ ඉල්ලීමක්!`,
        body: `${newHospitalName} (${newDistrict}) - ${newPatientName} වෙනුවෙන් ${newBloodGroup} ලේ ඒකක ${newUnitsNeeded}ක් හදිසියේ අවශ්‍යයි.`,
        postId: newRequest.id,
        locationName: `${newHospitalName}, ${newDistrict}`,
        urgency: 'critical',
        badgeText: `ලේ (${newBloodGroup})`,
        targetModal: 'blood',
        senderId: actualAuthorIdVal,
        senderName: newContactName || currentUser?.name || '',
      });
    }

    setShowAddBloodRequestForm(false);
    setActiveTab('blood_requests');
    setBannerMessage(`🩸 ${newPatientName} වෙනුවෙන් ${newBloodGroup} ලේ අවශ්‍යතාවය සාර්ථකව පළ කරන ලදී! පහත ලැයිස්තුවේ දැන් දිස්වේ.`);
    
    // Also save to Main Help Posts Notice Board with High-Priority Pinned Emergency flag (using the exact same id & postCode)
    if (onSubmitHelpPost) {
      onSubmitHelpPost({
        id: newRequest.id,
        postCode: newRequest.postCode,
        category: 'emergency',
        postType: 'blood_request',
        serviceType: 'blood_donation',
        bloodGroup: newBloodGroup,
        patientName: newPatientName,
        hospitalName: newHospitalName,
        unitsNeeded: Number(newUnitsNeeded) || 1,
        neededDate: newNeededDate || 'කඩිනමින් (හදිසි)',
        additionalNotes: newNotes || '',
        tagCategory: 'හදිසි / ආපදා',
        tagName: `🩸 හදිසි ${newBloodGroup} ලේ අවශ්‍යතාවය`,
        title: `🩸 හදිසි ${newBloodGroup} රුධිර අවශ්‍යතාවයක් (${newDistrict})`,
        headline: `🩸 හදිසි ${newBloodGroup} රුධිර අවශ්‍යතාවයක් (${newDistrict})`,
        whatHappened: `🩸 ${newDistrict} ප්‍රදේශයේ රෝගියෙකු සඳහා ${newBloodGroup} රුධිරය (ඒකක ${newUnitsNeeded}ක්) හදිසියේ අවශ්‍ය වී ඇත.`,
        whatIsNeeded: `රෝගී නම: ${newPatientName} • ලේ වර්ගය: ${newBloodGroup} • අවශ්‍ය ඒකක: ${newUnitsNeeded} • රෝහල: ${newHospitalName} • වාට්ටු අංකය: ${newWardNumber || "රුධිර බැංකුව"} • ගොනු අංකය: ${newRequestSlipNumber || "රෝහල් ගොනුව"} • දිස්ත්‍රික්කය: ${newDistrict} • අවශ්‍ය දිනය: ${newNeededDate || "කඩිනමින්"} • සම්බන්ධීකාරක: ${newContactName || "සම්බන්ධීකාරක"} (${newContactPhone}) ${newNotes ? `• සටහන්: ${newNotes}` : ""}`,
        locationName: `${newHospitalName}, ${newDistrict}`,
        district: newDistrict,
        wardNumber: newWardNumber,
        requestSlipNumber: newRequestSlipNumber,
        requestSlipPhotoUrl: newRequestSlipPhotoUrl,
        dropLocationUrl: newDropLocationUrl,
        hospitalPinLat: hospitalPinLat || undefined,
        hospitalPinLng: hospitalPinLng || undefined,
        priorityLevel: "emergency",
        isPinnedEmergency: true,
        contactNumber: newContactPhone,
        contactPersonName: newContactName || currentUser?.name || 'සම්බන්ධීකාරක',
        userId: actualAuthorIdVal || 'blood_requester',
        authorId: actualAuthorIdVal || 'blood_requester',
        actualAuthorId: actualAuthorIdVal,
        actualAuthorName: actualAuthorNameVal,
        actualAuthorPhone: actualAuthorPhoneVal,
        userName: newContactName || currentUser?.name || 'සම්බන්ධීකාරක',
        userPhone: newContactPhone || actualAuthorPhoneVal || '',
        helpersNeeded: Number(newUnitsNeeded) || 1,
        status: 'open',
      } as any).catch((e) => console.warn('Sync blood to help posts notice:', e));
    }

    setTimeout(() => {
      const el = document.getElementById('blood-requests-feed');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  };

  // Register Donor
  const handleRegisterDonor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim() || !donorPhone.trim()) {
      alert('කරුණාකර ඔබගේ නම සහ දුරකථන අංකය ඇතුළත් කරන්න.');
      return;
    }

    const newDonor: VolunteerDonor = {
      id: `donor_${Date.now()}`,
      name: donorName,
      phone: donorPhone,
      bloodGroup: donorBloodGroup,
      district: donorDistrict,
      lastDonatedDate: donorLastDate || 'මෑතකදී නැත',
      isAvailable: true,
      registeredAt: new Date().toISOString().slice(0, 10),
      userId: currentUser?.userId || currentUser?.id,
    };

    const updated = [newDonor, ...volunteerDonors];
    setVolunteerDonors(updated);
    saveVolunteerDonorsToStorage(updated);
    saveVolunteerDonorToFirestore(newDonor).catch((err) => console.warn('saveVolunteerDonorToFirestore error:', err));

    setShowRegisterDonorForm(false);
    setActiveTab('volunteer_donors');
    setBannerMessage(`💖 ${donorName} ස්වේච්ඡා ලේ පරිත්‍යාගශීලියෙකු ලෙස සාර්ථකව ලියාපදිංචි විය!`);

    setTimeout(() => {
      const el = document.getElementById('volunteer-donors-feed');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  };

  const resolveLinkedHelpPost = (req: BloodDonationRequest): any => {
    const reqReplies = Array.isArray((req as any).replies) ? (req as any).replies : [];
    const matched = (helpPosts || []).find(
      (p) =>
        p &&
        (String(p.id) === String(req.id) ||
          (req.postCode && p.postCode && String(p.postCode).toUpperCase() === String(req.postCode).toUpperCase()))
    );
    if (matched) {
      const mergedReplies = deduplicatePostReplies(
        [...(Array.isArray(matched.replies) ? matched.replies : []), ...reqReplies],
        matched
      );
      return {
        ...matched,
        bloodGroup: matched.bloodGroup || req.bloodGroup,
        patientName: (matched as any).patientName || req.patientName,
        hospitalName: (matched as any).hospitalName || req.hospitalName,
        unitsNeeded: (matched as any).unitsNeeded || req.unitsNeeded || 1,
        neededDate: (matched as any).neededDate || req.neededDate || 'කඩිනමින් (හදිසි)',
        additionalNotes: (matched as any).additionalNotes || req.additionalNotes || "",
        wardNumber: (matched as any).wardNumber || req.wardNumber || "",
        requestSlipNumber: (matched as any).requestSlipNumber || req.requestSlipNumber || "",
        requestSlipPhotoUrl: (matched as any).requestSlipPhotoUrl || req.requestSlipPhotoUrl || "",
        dropLocationUrl: (matched as any).dropLocationUrl || req.dropLocationUrl || "",
        hospitalPinLat: (matched as any).hospitalPinLat || req.hospitalPinLat,
        hospitalPinLng: (matched as any).hospitalPinLng || req.hospitalPinLng,
        replies: mergedReplies,
        repliesCount: mergedReplies.length,
        bloodWorkflowStep: Math.max(Number((matched as any).bloodWorkflowStep || 0), Number((req as any).bloodWorkflowStep || 0)) || undefined,
      };
    }
    const cleanReqReplies = deduplicatePostReplies(reqReplies, req);
    return {
      id: req.id,
      postCode: req.postCode || `#BLD-${String(req.id).slice(-4)}`,
      category: 'emergency',
      postType: 'blood_request',
      serviceType: 'blood_donation',
      bloodGroup: req.bloodGroup,
      patientName: req.patientName,
      hospitalName: req.hospitalName,
      unitsNeeded: req.unitsNeeded || 1,
      neededDate: req.neededDate || 'කඩිනමින් (හදිසි)',
      additionalNotes: req.additionalNotes || "",
      wardNumber: req.wardNumber || "",
      requestSlipNumber: req.requestSlipNumber || "",
      requestSlipPhotoUrl: req.requestSlipPhotoUrl || "",
      dropLocationUrl: req.dropLocationUrl || "",
      hospitalPinLat: req.hospitalPinLat,
      hospitalPinLng: req.hospitalPinLng,
      tagCategory: "හදිසි / ආපදා",
      tagName: `🩸 හදිසි ${req.bloodGroup} ලේ අවශ්‍යතාවය`,
      title: `🩸 හදිසි ${req.bloodGroup} රුධිර අවශ්‍යතාවයක් (${req.district})`,
      headline: `🩸 හදිසි ${req.bloodGroup} රුධිර අවශ්‍යතාවයක් (${req.district})`,
      whatHappened: `🩸 ${req.district} ප්‍රදේශයේ රෝගියෙකු සඳහා ${req.bloodGroup} රුධිරය (ඒකක ${req.unitsNeeded}ක්) හදිසියේ අවශ්‍ය වී ඇත.`,
      whatIsNeeded: `රෝගී නම: ${req.patientName} • ලේ වර්ගය: ${req.bloodGroup} • අවශ්‍ය ඒකක: ${req.unitsNeeded} • රෝහල: ${req.hospitalName} • දිස්ත්‍රික්කය: ${req.district} • අවශ්‍ය දිනය: ${req.neededDate || 'කඩිනමින්'} • සම්බන්ධීකාරක: ${req.contactName || 'සම්බන්ධීකාරක'} (${req.contactPhone})`,
      locationName: `${req.hospitalName}, ${req.district}`,
      district: req.district || 'කොළඹ',
      userId: req.userId || 'blood_requester',
      userName: req.contactName || req.patientName || 'දැන්වීම්කරු',
      userPhone: req.contactPhone || '',
      contactNumber: req.contactPhone || '',
      contactPersonName: req.contactName || req.patientName || 'දැන්වීම්කරු',
      helpersNeeded: req.unitsNeeded || 1,
      status: req.status === 'fulfilled' ? 'resolved' : 'open',
      isResolved: req.status === 'fulfilled',
      createdAt: req.createdAt || 'දැන්',
      createdAtMs: req.createdAtMs || Date.now(),
      replies: cleanReqReplies,
      repliesCount: cleanReqReplies.length,
      bloodWorkflowStep: (req as any).bloodWorkflowStep,
    };
  };

  // Support / Unlock Handlers
  const handleSupportBlood = (req: BloodDonationRequest) => {
    if (!supportedBloodIds.includes(req.id)) {
      const nextSupported = [...supportedBloodIds, req.id];
      setSupportedBloodIds(nextSupported);
      saveSupportedBloodIdsToStorage(nextSupported);

      const updatedRequests = bloodRequests.map((b) => {
        if (b.id === req.id) {
          return { ...b, supportedCount: (b.supportedCount || 0) + 1 };
        }
        return b;
      });
      setBloodRequests(updatedRequests);
      saveBloodRequestsToStorage(updatedRequests);
    }
    const linkedPost = resolveLinkedHelpPost(req);
    if (onOfferSupport) {
      onClose();
      onOfferSupport(linkedPost);
      return;
    }
    if (onOpenChat) {
      onClose();
      onOpenChat(linkedPost);
      return;
    }
  };

  const isAdmin = checkIsAdmin(currentUser) || currentUser?.role === 'admin' || (currentUser as any)?.isAdmin === true;

  const isPosterOfBloodReq = (req: BloodDonationRequest, linkedPost?: any) => {
    if (!currentUser || !req) return false;
    if (linkedPost && checkIsPostOwner(currentUser, linkedPost)) return true;
    const userPhone = (currentUser.phone || (currentUser as any).whatsappNumber || '').replace(/\D/g, '');
    const reqPhone = (req.contactPhone || '').replace(/\D/g, '');
    return Boolean(
      (userPhone && reqPhone && (userPhone === reqPhone || userPhone.slice(-7) === reqPhone.slice(-7))) ||
      (currentUser?.name && req.contactName && currentUser?.name.trim().toLowerCase() === req.contactName.trim().toLowerCase()) ||
      (currentUser.userId && req.userId && (currentUser.userId === req.userId || (currentUser as any).id === req.userId)) ||
      ((currentUser as any).id && req.userId && ((currentUser as any).id === req.userId || currentUser.userId === req.userId)) ||
      (currentUser.nicNumber && req.userId && currentUser.nicNumber === req.userId)
    );
  };

  const canDeleteBlood = (req: BloodDonationRequest) => {
    if (isAdmin) return true;
    return isPosterOfBloodReq(req);
  };

  const canDeleteDonor = (donor: VolunteerDonor) => {
    if (isAdmin) return true;
    if (!currentUser || !donor) return false;
    const userPhone = (currentUser.phone || currentUser.whatsappNumber || '').replace(/\D/g, '');
    const donorPhone = (donor.phone || '').replace(/\D/g, '');
    return Boolean(
      (userPhone && donorPhone && userPhone === donorPhone) ||
      (currentUser?.name && donor.name && currentUser?.name.trim().toLowerCase() === donor.name.trim().toLowerCase()) ||
      (currentUser.userId && donor.userId && (currentUser.userId === donor.userId || currentUser.id === donor.userId)) ||
      (currentUser.id && donor.userId && (currentUser.id === donor.userId || currentUser.userId === donor.userId)) ||
      (currentUser.nicNumber && donor.userId && currentUser.nicNumber === donor.userId)
    );
  };

  const handleDeleteBloodRequest = (id?: string) => {
    if (!id) return;
    const confirmMsg = isAdmin
      ? 'පරිපාලක (Admin) ලෙස මෙම ලේ ඉල්ලීම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට (Delete) අවශ්‍ය බව තහවුරු කරන්න ද?'
      : 'මෙම ලේ ඉල්ලීම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට (Delete) අවශ්‍ය බව තහවුරු කරන්න ද?';
    if (!window.confirm(confirmMsg)) return;
    const targetReq = allMergedBloodRequests.find((b) => b && String(b.id) === String(id));
    const remaining = purgeBloodRequestEverywhere(
      String(id),
      targetReq?.postCode,
      targetReq?.patientName
    );
    setBloodRequests(remaining);
    alert('ලේ ඉල්ලීම සාර්ථකව ඉවත් කරන ලදී.');
  };

  const handleDeleteDonor = (id?: string) => {
    if (!id) return;
    const confirmMsg = isAdmin
      ? 'පරිපාලක (Admin) ලෙස මෙම ලේ පරිත්‍යාගශීලියා ලැයිස්තුවෙන් ඉවත් කිරීමට (Delete) අවශ්‍ය බව තහවුරු කරන්න ද?'
      : 'මෙම ලේ පරිත්‍යාගශීලියා ලැයිස්තුවෙන් ඉවත් කිරීමට (Delete) අවශ්‍ය බව තහවුරු කරන්න ද?';
    if (!window.confirm(confirmMsg)) return;
    const updated = volunteerDonors.filter((d) => d.id !== id);
    setVolunteerDonors(updated);
    saveVolunteerDonorsToStorage(updated);
    addDeletedDonorId(id);
    deleteVolunteerDonorFromFirestore(id).catch((err) => {
      console.warn('Delete volunteer donor notice:', err);
    });
    try {
      window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
    } catch {}
    alert('පරිත්‍යාගශීලියා සාර්ථකව ඉවත් කරන ලදී.');
  };

  // Merge any blood emergency posts from helpPosts without duplicating
  const allMergedBloodRequests = useMemo(() => {
    const map = new Map<string, BloodDonationRequest>();
    const seenPostCodes = new Set<string>();
    const seenPatients = new Set<string>();

    for (const b of bloodRequests) {
      if (!b || !b.id) continue;
      if (isBloodPermanentlyDeleted(b.id) || isPostPermanentlyDeleted(b.id)) continue;
      map.set(String(b.id), b);
      if (b.postCode) seenPostCodes.add(String(b.postCode));
      if (b.patientName) seenPatients.add(`${b.patientName.trim().toLowerCase()}|${(b.bloodGroup || '').toLowerCase()}`);
    }
    if (helpPosts && helpPosts.length > 0) {
      for (const p of helpPosts) {
        if (!p || !p.id) continue;
        if (p.isDeleted || p.status === 'deleted' || isPostPermanentlyDeleted(p.id) || isBloodPermanentlyDeleted(p.id)) {
          continue;
        }
        const pCode = String(p.postCode || '');
        if (pCode.startsWith("#RED-") || pCode.startsWith("#EMG-") || pCode.startsWith("#HON-") || pCode.startsWith("#SRV-") || p.postType === "disaster_relief" || p.postType === ("blood_donation_honor" as any)) {
          continue;
        }
        const isBlood =
          pCode.startsWith('#BLD-') ||
          p.postType === 'blood_request' ||
          p.serviceType === 'blood_donation' ||
          p.category === 'blood' ||
          p.category === 'blood_disaster' ||
          (p.tagName && (p.tagName.includes('ලේ') || p.tagName.toLowerCase().includes('blood'))) ||
          (p.whatHappened && (p.whatHappened.includes('ලේ') || p.whatHappened.includes('රුධිරය')));

        if (isBlood) {
          const id = String(p.id);
          if (map.has(id) || (pCode && seenPostCodes.has(pCode))) continue;
          const bgMatch = `${p.tagName || ''} ${p.whatHappened || ''} ${p.whatIsNeeded || ''}`.match(/(A\+|A-|B\+|B-|AB\+|AB-|O\+|O-)/i);
          const bg = (bgMatch ? bgMatch[1].toUpperCase() : 'O+') as BloodGroup;
          const pName = (p.contactPersonName || p.authorName || 'රෝගියා').trim();
          const patientKey = `${pName.toLowerCase()}|${bg.toLowerCase()}`;
          if (seenPatients.has(patientKey)) continue;
          if (pCode) seenPostCodes.add(pCode);
          seenPatients.add(patientKey);
          map.set(id, {
            id,
            postCode: pCode || `#BLD-${id.slice(-4)}`,
            patientName: pName,
            bloodGroup: bg,
            unitsNeeded: 1,
            hospitalName: p.locationName || p.district || 'රෝහල',
            district: p.district || 'කොළඹ',
            urgency: 'urgent',
            neededDate: 'හදිසි (Urgent)',
            contactName: p.contactPersonName || p.authorName || 'සම්බන්ධීකාරක',
            contactPhone: p.contactNumber || p.phone || '',
            additionalNotes: p.whatIsNeeded || p.whatHappened || '',
            status: 'active',
            createdAt: p.createdAt || 'දැන්',
            createdAtMs: p.createdAtMs || Date.now(),
            userId: p.userId,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  }, [bloodRequests, helpPosts]);

  const filteredBloodRequests = useMemo(() => {
    return allMergedBloodRequests.filter((b) => {
      if (selectedBloodGroup !== 'all' && b.bloodGroup !== selectedBloodGroup) return false;
      if (selectedDistrict !== 'all' && b.district !== selectedDistrict) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (b.hospitalName || '').toLowerCase().includes(q) ||
          (b.patientName || '').toLowerCase().includes(q) ||
          (b.district || '').toLowerCase().includes(q) ||
          (b.bloodGroup || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allMergedBloodRequests, selectedBloodGroup, selectedDistrict, searchQuery]);

  const filteredDonors = useMemo(() => {
    return volunteerDonors.filter((d) => {
      if (selectedBloodGroup !== 'all' && d.bloodGroup !== selectedBloodGroup) return false;
      if (selectedDistrict !== 'all' && d.district !== selectedDistrict) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (d.name || '').toLowerCase().includes(q) || (d.district || '').toLowerCase().includes(q) || (d.bloodGroup || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [volunteerDonors, selectedBloodGroup, selectedDistrict, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-emerald-950/75 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-[#071910] border-2 border-emerald-500/60 rounded-[2rem] shadow-[0_20px_60px_rgba(0,122,75,0.3)] overflow-hidden relative flex flex-col max-h-[94vh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-600 to-teal-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner shrink-0">
              <Droplet className="w-6 h-6 text-white fill-current animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>හදිසි ලේ අවශ්ෂතා සහ පරිත්‍යාග කේන්ද්‍රය</span>
              </h3>
              <p className="text-[11px] text-rose-100 flex items-center gap-1.5 font-medium">
                <span>ජීවිත බේරාගැනීමේ හදිසි සත්කාරක ප්‍රජා ජාලය</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            title="වසන්න"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Navigation Bar (Compact, High-Visibility Responsive Bar) */}
        <div id="blood-sub-nav" className="p-2 sm:p-2.5 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Tab 1: 🩸 හදිසි ලේ අවශ්‍යතා */}
              <button
                type="button"
                onClick={() => setActiveTab('blood_requests')}
                className={`py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-black text-xs border shadow-xs active:scale-95 ${
                  activeTab === 'blood_requests'
                    ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-400 shadow-sm shadow-red-700/30 ring-2 ring-red-400/40'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Droplet className={`w-3.5 h-3.5 ${activeTab === 'blood_requests' ? 'text-white fill-white' : 'text-red-500 fill-red-500'}`} />
                <span>🩸 ලේ අවශ්‍යතා</span>
                <span className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] font-black ${
                  activeTab === 'blood_requests' ? 'bg-white text-red-700' : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                }`}>
                  {allMergedBloodRequests.length}
                </span>
              </button>

              {/* Tab 2: 💖 පරිත්‍යාගශීලීන් */}
              <button
                type="button"
                onClick={() => setActiveTab('volunteer_donors')}
                className={`py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-black text-xs border shadow-xs active:scale-95 ${
                  activeTab === 'volunteer_donors'
                    ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 text-white border-pink-400 shadow-sm shadow-pink-700/30 ring-2 ring-pink-400/40'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${activeTab === 'volunteer_donors' ? 'text-white fill-white' : 'text-pink-500 fill-pink-500'}`} />
                <span>💖 පරිත්‍යාගශීලීන්</span>
                <span className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] font-black ${
                  activeTab === 'volunteer_donors' ? 'bg-white text-pink-800' : 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300'
                }`}>
                  {volunteerDonors.length}
                </span>
              </button>
            </div>

            {/* Quick link to Transparent Aid Ledger */}
            {onOpenAidLedger && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAidLedger();
                }}
                className="py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-400/50 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ml-auto"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>🤝 ආපදා සහන සේවය</span>
                <ArrowRight className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* Status Confirmation Banner */}
        {bannerMessage && (
          <div className="p-3 mx-3 mt-3 sm:mx-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 text-xs font-bold animate-fadeIn shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{bannerMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Blood Requests Feed */}
        {activeTab === 'blood_requests' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-[#05140d]">
            {/* Page Header Banner */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-600/15 via-rose-600/10 to-transparent border border-red-500/30 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-red-600 fill-red-600" />
                  <span>🩸 හදිසි ලේ අවශ්‍යතා පුවරුව (Emergency Blood Requests)</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  රෝහල් සහ රෝගීන් සඳහා හදිසි රුධිර අවශ්‍යතා නිරීක්ෂණය සහ ක්ෂණික සම්බන්ධීකරණය.
                </p>
              </div>
            </div>

            {/* CTA Button: Post Blood Request */}
            <button
              type="button"
              onClick={() => {
                if (isDemo) {
                  if (onRequireRegistration) onRequireRegistration();
                  return;
                }
                setShowAddBloodRequestForm(true);
              }}
              className="w-full py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-600/25 hover:shadow-red-600/40 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2.5 border-2 border-red-300/80 group"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <Plus className="w-4 h-4 text-white stroke-[3]" />
              </div>
              <span className="tracking-wide">+ හදිසි ලේ අවශ්‍යතාවක් පළකරන්න (Post Blood Request)</span>
              <Droplet className="w-4 h-4 fill-white text-white animate-bounce" />
            </button>

            {/* Filter Bar: Blood Groups & District & Search */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Blood group pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
                  <button
                    type="button"
                    onClick={() => setSelectedBloodGroup('all')}
                    className={`px-3 py-1 rounded-xl font-black text-xs cursor-pointer transition-all ${
                      selectedBloodGroup === 'all'
                        ? 'bg-rose-600 text-white shadow-md scale-105'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    සියලු වර්ග
                  </button>
                  {bloodGroups.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setSelectedBloodGroup(bg)}
                      className={`px-2.5 py-1 rounded-xl font-black font-mono text-xs cursor-pointer transition-all ${
                        selectedBloodGroup === bg
                          ? 'bg-rose-600 text-white shadow-md scale-105 ring-2 ring-rose-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>

                {/* District Select */}
                <div className="flex items-center gap-1.5 text-xs ml-auto">
                  <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="all">📍 සියලු දිස්ත්‍රික්ක</option>
                    {districtsList.filter((d) => d !== 'all').map((dist) => (
                      <option key={dist} value={dist}>📍 {dist}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="රෝහල, රෝගියා හෝ දිස්ත්‍රික්කය අනුව සොයන්න..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-rose-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Header Info Bar (Anchor for Auto-Scroll) */}
            <div id="blood-requests-feed" className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs scroll-mt-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  සක්‍රිය හදිසි ලේ ඉල්ලීම් ({filteredBloodRequests.length})
                </span>
              </div>
              <span className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                {selectedBloodGroup !== 'all' ? `රුධිර වර්ගය: ${selectedBloodGroup}` : 'සියලු රුධිර වර්ග'} • {selectedDistrict !== 'all' ? `දිස්ත්‍රික්කය: ${selectedDistrict}` : 'දිවයින පුරා'}
              </span>
            </div>

            {filteredBloodRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                <Droplet className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p>තෝරාගත් ලේ වර්ගය හෝ දිස්ත්‍රික්කය සඳහා දැනට සක්‍රිය ලේ ඉල්ලීම් නොමැත.</p>
              </div>
            ) : (
              filteredBloodRequests.filter(Boolean).map((req, rIdx) => {
                const linkedPost = resolveLinkedHelpPost(req);
                const isPoster = isPosterOfBloodReq(req, linkedPost);
                const repliesList = deduplicatePostReplies(Array.isArray(linkedPost?.replies) ? linkedPost.replies : [], linkedPost);
                const offersCount = repliesList.length > 0 ? repliesList.length : Math.min(req.supportedCount || 0, 1);
                const viewerPhone = (currentUser?.phone || (currentUser as any)?.whatsappNumber || '').replace(/\D/g, '');
                const myReply = !isPoster && currentUser
                  ? repliesList.find((r: any) => {
                      if (!r) return false;
                      const rPhone = String(r.responderPhone || '').replace(/\D/g, '');
                      return Boolean(
                        (r.responderId && (r.responderId === currentUser.userId || r.responderId === (currentUser as any).id)) ||
                        (viewerPhone && rPhone && (viewerPhone === rPhone || viewerPhone.slice(-7) === rPhone.slice(-7))) ||
                        (currentUser.name && r.responderName && currentUser.name.trim().toLowerCase() === String(r.responderName).trim().toLowerCase())
                      );
                    })
                  : null;
                const isSupported = Boolean(myReply || (req.id ? supportedBloodIds.includes(req.id) : false));
                const isMyReplyConfirmed = Boolean(myReply && (myReply.isConfirmed || myReply.isAccepted));
                const isFulfilled = Boolean(req.status === 'fulfilled' || linkedPost?.isResolved || linkedPost?.status === 'resolved');
                const currentStepNum = isFulfilled
                  ? 4
                  : Boolean((linkedPost as any)?.bloodDonatedByHelper || Number((linkedPost as any)?.bloodWorkflowStep || 0) >= 4 || Number(myReply?.workflowStep || 0) >= 4)
                  ? 4
                  : Boolean(linkedPost?.isConfirmed || isMyReplyConfirmed || Number((linkedPost as any)?.bloodWorkflowStep || 0) >= 3 || Number(myReply?.workflowStep || 0) >= 3)
                  ? 3
                  : offersCount > 0 || isSupported
                  ? 2
                  : 1;

                return (
                  <div
                    key={`blood_req_${req.id || 'r'}_${rIdx}`}
                    className={`p-4 bg-white dark:bg-[#071d12] border-2 rounded-2xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isPoster
                        ? 'border-emerald-400/80 dark:border-emerald-700'
                        : 'border-rose-200 dark:border-rose-950 hover:border-rose-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Big Blood Badge */}
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 text-white flex flex-col items-center justify-center font-mono font-black shrink-0 shadow-md">
                        <span className="text-lg leading-none">{req.bloodGroup}</span>
                        <span className="text-[9px] uppercase font-bold opacity-80 mt-0.5">Blood</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 px-2.5 py-0.5 rounded-md border border-rose-300 dark:border-rose-800">
                            {req.postCode}
                          </span>
                          {isPoster ? (
                            <span className="text-[10px] bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-full shadow-xs">
                              👤 ඔබගේ දැන්වීම (දැන්වීම්කරු)
                            </span>
                          ) : isMyReplyConfirmed ? (
                            <span className="text-[10px] bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-full shadow-xs">
                              ✅ තෝරාගත් පරිත්‍යාගශීලියා (ඔබ)
                            </span>
                          ) : isSupported ? (
                            <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full shadow-xs">
                              ⏳ ඉදිරිපත් වී ඇත (සහයක)
                            </span>
                          ) : null}
                          {isFulfilled && (
                            <span className="text-[10px] bg-teal-600 text-white font-black px-2.5 py-0.5 rounded-full">
                              🎉 ලේ ලැබුණා • අවසන්
                            </span>
                          )}
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            {isPoster || isAdmin || isMyReplyConfirmed
                              ? `${maskName(req.patientName, isDemo)} වෙනුවෙන් (පයින්ට් ${req.unitsNeeded}ක්)`
                              : `${req.bloodGroup} රුධිර අවශ්‍යතාවයක් (පයින්ට් ${req.unitsNeeded}ක්)`}
                          </h4>
                          {req.urgency === 'urgent' && !isFulfilled && (
                            <span className="text-[9px] bg-red-600 text-white font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                              🚨 හදිසි (Urgent)
                            </span>
                          )}
                          {canDeleteBlood(req) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBloodRequest(req.id)}
                              className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-900 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                              title={isAdmin ? "පරිපාලක ලෙස ලේ ඉල්ලීම ඉවත් කරන්න (Admin Delete)" : "ලේ ඉල්ලීම ඉවත් කරන්න (Delete)"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{isAdmin && !isPoster ? 'ඉවත් කරන්න (Admin)' : 'ඉවත් කරන්න'}</span>
                            </button>
                          )}
                        </div>

                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-rose-600" />
                          <span>{req.hospitalName} ({req.district})</span>
                        </p>

                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            🏥 දැන්වීම්කරු: <strong className="text-slate-700 dark:text-slate-300">{req.contactName || req.patientName}</strong>
                          </span>
                          <span>
                            🗓️ අවශ්‍ය දිනය: <strong className="text-slate-700 dark:text-slate-300">{req.neededDate}</strong>
                          </span>
                          <span className="flex items-center gap-1 font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                            <Users className="w-3 h-3" />
                            <span>පරිත්‍යාගශීලීන්: {offersCount}ක්</span>
                          </span>
                        </div>

                        {req.additionalNotes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-rose-50/60 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
                            {req.additionalNotes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Role-Aware Action Area for Poster vs Donor/Helper */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                      {isPoster ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {onOpenSupportOffers && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenSupportOffers(linkedPost);
                              }}
                              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                            >
                              <Users className="w-4 h-4" />
                              <span>🩸 පියවර {currentStepNum}/4 • පරිත්‍යාගශීලීන් ({offersCount})</span>
                            </button>
                          )}
                          {onOpenChat && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenChat(linkedPost);
                              }}
                              className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                              title="අවශ්‍ය නම් පමණක් Chat කරන්න"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>💬 Chat</span>
                            </button>
                          )}
                        </div>
                      ) : !isDemo && isSupported ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {onOpenSupportOffers && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenSupportOffers(linkedPost);
                              }}
                              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                            >
                              <HeartHandshake className="w-4 h-4" />
                              <span>🩸 පියවර {currentStepNum}/4 ඉදිරියට යන්න</span>
                            </button>
                          )}
                          {onOpenChat && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenChat(linkedPost);
                              }}
                              className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                              title="අවශ්‍ය නම් පමණක් Chat කරන්න"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>💬 Chat</span>
                            </button>
                          )}
                          {isMyReplyConfirmed && req.contactPhone && (
                            <a
                              href={`tel:${req.contactPhone}`}
                              className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                            >
                              <Phone className="w-4 h-4" />
                              <span>{req.contactPhone}</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          {onOpenChat && !isDemo && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenChat(linkedPost);
                              }}
                              className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4 text-emerald-600" />
                              <span>පණිවිඩ</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (isDemo) {
                                if (onRequireRegistration) onRequireRegistration();
                                return;
                              }
                              handleSupportBlood(req);
                            }}
                            className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer border-2 border-rose-300/80 hover:scale-105"
                          >
                            <HeartHandshake className="w-4 h-4 text-rose-200" />
                            <span>🩸 ලේ ලබාදෙන්න</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Volunteer Donors Directory */}
        {activeTab === 'volunteer_donors' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-[#05140d]">
            {/* Page Header Banner */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-pink-600/15 via-rose-600/10 to-transparent border border-pink-500/30 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-600 fill-pink-600" />
                  <span>💖 ස්වේච්ඡා ලේ පරිත්‍යාගශීලීන්ගේ නාමාවලිය (Volunteer Blood Donors)</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ඕනෑම හදිසි අවස්ථාවකදී ලේ පරිත්‍යාග කිරීමට සූදානම් ස්වේච්ඡා දායකයින්ගේ නාමාවලිය.
                </p>
              </div>
            </div>

            {/* CTA Button: Register Donor */}
            <button
              type="button"
              onClick={() => {
                if (isDemo) {
                  if (onRequireRegistration) onRequireRegistration();
                  return;
                }
                setShowRegisterDonorForm(true);
              }}
              className="w-full py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 hover:from-pink-700 hover:to-rose-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-pink-600/25 hover:shadow-pink-600/40 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2.5 border-2 border-pink-300/80 group"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <Heart className="w-4 h-4 fill-white text-white" />
              </div>
              <span className="tracking-wide">+ ස්වේච්ඡා ලේ පරිත්‍යාගශීලියෙකු ලෙස ලියාපදිංචි වන්න (Register as Donor)</span>
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </button>

            {/* Filter Bar: Blood Groups & District */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Blood group pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
                  <button
                    type="button"
                    onClick={() => setSelectedBloodGroup('all')}
                    className={`px-3 py-1 rounded-xl font-black text-xs cursor-pointer transition-all ${
                      selectedBloodGroup === 'all'
                        ? 'bg-rose-600 text-white shadow-md scale-105'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    සියලු වර්ග
                  </button>
                  {bloodGroups.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setSelectedBloodGroup(bg)}
                      className={`px-2.5 py-1 rounded-xl font-black font-mono text-xs cursor-pointer transition-all ${
                        selectedBloodGroup === bg
                          ? 'bg-rose-600 text-white shadow-md scale-105 ring-2 ring-rose-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>

                {/* District Select */}
                <div className="flex items-center gap-1.5 text-xs ml-auto">
                  <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="all">📍 සියලු දිස්ත්‍රික්ක</option>
                    {districtsList.filter((d) => d !== 'all').map((dist) => (
                      <option key={dist} value={dist}>📍 {dist}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="පරිත්‍යාගශීලියාගේ නම හෝ දිස්ත්‍රික්කය අනුව සොයන්න..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-pink-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Header Info Bar (Anchor for Auto-Scroll) */}
            <div id="volunteer-donors-feed" className="p-3 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900/60 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs scroll-mt-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-600 animate-pulse" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  ලියාපදිංචි පරිත්‍යාගශීලීන් ({filteredDonors.length})
                </span>
              </div>
              <span className="text-[11px] text-pink-700 dark:text-pink-300 font-medium">
                {selectedBloodGroup !== 'all' ? `රුධිර වර්ගය: ${selectedBloodGroup}` : 'සියලු රුධිර වර්ග'} • {selectedDistrict !== 'all' ? `දිස්ත්‍රික්කය: ${selectedDistrict}` : 'දිවයින පුරා'}
              </span>
            </div>

            {filteredDonors.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                <Heart className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p>තෝරාගත් ලේ වර්ගය සඳහා ලියාපදිංචි පරිත්‍යාගශීලීන් නොමැත. ඔබත් ස්වේච්ඡා පරිත්‍යාගශීලියෙකු ලෙස එක්වන්න!</p>
              </div>
            ) : (
              filteredDonors.map((donor, dIdx) => (
                <div
                  key={`blood_donor_${donor.id || 'd'}_${dIdx}`}
                  className="p-3.5 sm:p-4 bg-white dark:bg-[#071d12] border-2 border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-13 h-13 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-2 border-emerald-300 dark:border-emerald-800 flex flex-col items-center justify-center font-mono font-black shrink-0 shadow-xs">
                      <span className="text-lg leading-none">{donor.bloodGroup}</span>
                      <span className="text-[8px] uppercase font-bold text-emerald-600 mt-0.5">Donor</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          {maskName(donor.name, isDemo)}
                        </h4>
                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-300">
                          {donor.district}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        අවසාන වරට ලේ දුන් දිනය: <span className="font-bold text-slate-700 dark:text-slate-300">{donor.lastDonatedDate}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {canDeleteDonor(donor) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDonor(donor.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-900 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                        title={isAdmin ? "පරිපාලක ලෙස පරිත්‍යාගශීලියා ඉවත් කරන්න (Admin Delete)" : "පරිත්‍යාගශීලියා ඉවත් කරන්න (Delete)"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isAdmin ? 'ඉවත් කරන්න (Admin)' : 'ඉවත් කරන්න'}</span>
                      </button>
                    )}
                    {isDemo ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (onRequireRegistration) onRequireRegistration();
                        }}
                        className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        <Phone className="w-4 h-4" />
                        <span>විමසන්න</span>
                      </button>
                    ) : (
                      <a
                        href={`tel:${donor.phone}`}
                        className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        <Phone className="w-4 h-4" />
                        <span>විමසන්න</span>
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal Sub-forms */}
        {/* 1. Add Blood Request Form */}
        {showAddBloodRequestForm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-[#071911] border-2 border-rose-500 rounded-3xl p-5 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-rose-100 dark:border-rose-900">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-rose-600 fill-current" />
                  <span>හදිසි ලේ අවශ්‍යතාවක් පලකිරීම</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddBloodRequestForm(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleCreateBloodRequest} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    රෝගියාගේ නම (Patient Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    placeholder="උදා: සුනිල් පෙරේරා"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      අවශ්‍ය ලේ වර්ගය (Blood Group) *
                    </label>
                    <select
                      value={newBloodGroup}
                      onChange={(e) => setNewBloodGroup(e.target.value as BloodGroup)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-black font-mono text-sm"
                    >
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      අවශ්‍ය පයින්ට් ගණන (Units)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newUnitsNeeded}
                      onChange={(e) => setNewUnitsNeeded(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      රෝහල (Hospital Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newHospitalName}
                      onChange={(e) => setNewHospitalName(e.target.value)}
                      placeholder="උදා: රාගම ශික්ෂණ රෝහල"
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      දිස්ත්‍රික්කය
                    </label>
                    <select
                      value={newDistrict}
                      onChange={(e) => setNewDistrict(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                    >
                      {districtsList.filter((d) => d !== 'all').map((dist) => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      හදිසිභාවය (Urgency)
                    </label>
                    <select
                      value={newUrgency}
                      onChange={(e) => setNewUrgency(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-rose-600"
                    >
                      <option value="urgent">🚨 කඩිනමින් (Urgent)</option>
                      <option value="within_24h">පැය 24ක් තුළ</option>
                      <option value="planned">සැලසුම් කළ ශල්‍යකර්මයකට</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      අවශ්‍ය දිනය
                    </label>
                    <input
                      type="text"
                      value={newNeededDate}
                      onChange={(e) => setNewNeededDate(e.target.value)}
                      placeholder="උදා: අද දින"
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      සම්බන්ධීකාරක නම
                    </label>
                    <input
                      type="text"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="ඔබගේ නම"
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      දුරකථන අංකය (Phone) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      placeholder="07xxxxxxxx"
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      වාට්ටු අංකය (Ward No) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newWardNumber}
                      onChange={(e) => setNewWardNumber(e.target.value)}
                      placeholder="උදා: වාට්ටු අංක 14 / ICU"
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      ලේ ලබාදීමේ විස්තර ගොනුවේ අංකය
                    </label>
                    <input
                      type="text"
                      value={newRequestSlipNumber}
                      onChange={(e) => setNewRequestSlipNumber(e.target.value)}
                      placeholder="උදා: BHT / Blood Bank File No"
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                {/* File / Slip Photo Upload */}
                <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    📷 හෝ ලේ ලබාදීමට අදාල විස්තර ගොනුවේ ඡායාරූපයක් එක් කරන්න:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSlipPhotoChange}
                    className="w-full text-[11px] text-slate-600 dark:text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-rose-600 file:text-white cursor-pointer"
                  />
                  {newRequestSlipPhotoUrl && (
                    <div className="flex items-center gap-2 pt-1">
                      <img src={newRequestSlipPhotoUrl} alt="Slip preview" className="w-14 h-14 object-cover rounded-lg border border-rose-400" />
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">✅ ගොනුවේ ඡායාරූපය එක් කරන ලදී</span>
                    </div>
                  )}
                </div>

                {/* Drop Location Pin / Link via Uber-style Map Picker */}
                <div className="p-3 rounded-xl bg-slate-900 text-white border-2 border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <label className="font-black text-xs text-white block">
                        🚕 අදාල ස්ථානයේ Drop ලොකේෂන් එක (Uber Map ක්‍රමයට):
                      </label>
                      <span className="text-[10px] text-slate-400">
                        සිතියම හරහා නිවැරදි රෝහල හෝ ලේ ලබාදෙන ස්ථානය ලකුණු කරන්න
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowUberMapPicker(true)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{hospitalPinLat ? '🚕 සිතියමේ ස්ථානය වෙනස් කරන්න ✓' : '🚕 Map එක හරහා ස්ථානය තෝරන්න'}</span>
                    </button>
                  </div>
                  {hospitalPinLat && hospitalPinLng && (
                    <div className="text-[11px] font-bold text-emerald-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-emerald-800/60">
                      ✅ ස්ථානය සිතියමේ ලකුණු කර ඇත (GPS: {hospitalPinLat.toFixed(4)}, {hospitalPinLng.toFixed(4)})
                    </div>
                  )}
                  <input
                    type="text"
                    value={newDropLocationUrl}
                    onChange={(e) => setNewDropLocationUrl(e.target.value)}
                    placeholder="හෝ Google Maps Drop Location Link එක මෙහි ඇතුළත් කරන්න..."
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-[11px] text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    අමතර විස්තර (Notes)
                  </label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="ශල්‍යකර්මය පිළිබඳ හෝ විශේෂ සටහන්..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-sm sm:text-base shadow-xl shadow-red-600/30 hover:shadow-red-600/50 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer border-2 border-red-300/80"
                >
                  හදිසි ලේ ඉල්ලීම පලකරන්න (Publish Request)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 2. Register Donor Form */}
        {showRegisterDonorForm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-[#071911] border-2 border-pink-500 rounded-3xl p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-pink-100 dark:border-pink-900">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-pink-600 fill-current" />
                  <span>ලේ පරිත්‍යාගශීලියෙකු ලෙස ලියාපදිංචිය</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowRegisterDonorForm(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleRegisterDonor} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    ඔබගේ සම්පූර්ණ නම *
                  </label>
                  <input
                    type="text"
                    required
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="ඔබගේ නම"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      ලේ වර්ගය (Blood Group) *
                    </label>
                    <select
                      value={donorBloodGroup}
                      onChange={(e) => setDonorBloodGroup(e.target.value as BloodGroup)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-black font-mono text-sm"
                    >
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      දිස්ත්‍රික්කය
                    </label>
                    <select
                      value={donorDistrict}
                      onChange={(e) => setDonorDistrict(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                    >
                      {districtsList.filter((d) => d !== 'all').map((dist) => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    දුරකථන අංකය (Phone) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={donorPhone}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    placeholder="07xxxxxxxx"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    අවසාන වරට ලේ දුන් දිනය (විකල්ප)
                  </label>
                  <input
                    type="date"
                    value={donorLastDate}
                    onChange={(e) => setDonorLastDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 hover:from-pink-700 hover:to-rose-700 text-white font-black text-sm sm:text-base shadow-xl shadow-pink-600/30 hover:shadow-pink-600/50 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer border-2 border-pink-300/80"
                >
                  ස්වේච්ඡා පරිත්‍යාගශීලියෙකු ලෙස එක්වන්න
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
      <UberBloodLocationModal
        isOpen={showUberMapPicker}
        onClose={() => setShowUberMapPicker(false)}
        initialLat={hospitalPinLat}
        initialLng={hospitalPinLng}
        initialHospitalName={newHospitalName}
        onConfirmLocation={(loc) => {
          setHospitalPinLat(loc.lat);
          setHospitalPinLng(loc.lng);
          setNewDropLocationUrl(loc.dropLocationUrl);
          if (!newHospitalName.trim() && loc.placeName) {
            setNewHospitalName(loc.placeName);
          }
        }}
      />
    </div>
  );
};