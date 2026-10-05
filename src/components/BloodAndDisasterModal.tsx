import React, { useState, useMemo } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { BloodDonationRequest, VolunteerDonor, DisasterReliefItem, BloodGroup, Language, User as UserType } from '../types';
import { maskName, maskPhone, maskAddress } from '../utils/demoDataMasker';
import { 
  getStoredBloodRequests, 
  saveBloodRequestsToStorage, 
  getStoredVolunteerDonors, 
  saveVolunteerDonorsToStorage, 
  getStoredDisasterReliefItems, 
  saveDisasterReliefItemsToStorage, 
  getStoredSupportedBloodIds, 
  saveSupportedBloodIdsToStorage, 
  getStoredSupportedDisasterIds, 
  saveSupportedDisasterIdsToStorage 
} from '../data/bloodAndDisasterData';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { addDeletedBloodId, addDeletedDonorId, addDeletedDisasterId } from '../utils/deletedPostsManager';
import { 
  deleteBloodRequestFromFirestore, 
  deleteVolunteerDonorFromFirestore, 
  deleteDisasterReliefFromFirestore,
  saveBloodRequestToFirestore,
  saveVolunteerDonorToFirestore,
  saveDisasterReliefToFirestore
} from '../lib/firebase';
import { broadcastAppNotification } from '../utils/notificationManager';

interface BloodAndDisasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType;
  lang?: Language;
  initialTab?: 'blood_requests' | 'volunteer_donors' | 'disaster_relief';
  onRequireRegistration?: () => void;
  onOpenAidLedger?: () => void;
  onSubmitHelpPost?: (post: any) => Promise<any>;
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
}) => {
  const isDemo = Boolean(currentUser?.isDemo);
  const [activeTab, setActiveTab] = useState<'blood_requests' | 'volunteer_donors' | 'disaster_relief'>(initialTab);

  // States
  const [bloodRequests, setBloodRequests] = useState<BloodDonationRequest[]>(() => getStoredBloodRequests());
  const [volunteerDonors, setVolunteerDonors] = useState<VolunteerDonor[]>(() => getStoredVolunteerDonors());
  const [disasterItems, setDisasterItems] = useState<DisasterReliefItem[]>(() => getStoredDisasterReliefItems());

  // User Supported / Offered tracking
  const [supportedBloodIds, setSupportedBloodIds] = useState<string[]>(() => getStoredSupportedBloodIds());
  const [supportedDisasterIds, setSupportedDisasterIds] = useState<string[]>(() => getStoredSupportedDisasterIds());

  // Filter States
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Modals
  const [showAddBloodRequestForm, setShowAddBloodRequestForm] = useState(false);
  const [showRegisterDonorForm, setShowRegisterDonorForm] = useState(false);
  const [showAddDisasterForm, setShowAddDisasterForm] = useState(false);

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
  const [newNotes, setNewNotes] = useState('');

  // Donor Register Form state
  const [donorName, setDonorName] = useState(currentUser?.name || '');
  const [donorPhone, setDonorPhone] = useState(currentUser?.phone || '');
  const [donorBloodGroup, setDonorBloodGroup] = useState<BloodGroup>('O+');
  const [donorDistrict, setDonorDistrict] = useState('ගම්පහ');
  const [donorLastDate, setDonorLastDate] = useState('');

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
    'කුරුණෑගල',
    'පුත්තලම',
    'අනුරාධපුර',
    'පොළොන්නරුව',
    'බදුල්ල',
    'මොණරාගල',
    'රත්නපුර',
    'කෑගල්ල',
    'යාපනය',
  ];

  // Submit Blood Request
  const handleCreateBloodRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newHospitalName.trim() || !newContactPhone.trim()) {
      alert('කරුණාකර රෝගියාගේ නම, රෝහල සහ දුරකථන අංකය ඇතුළත් කරන්න.');
      return;
    }

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
      contactName: newContactName || 'සම්බන්ධීකාරක',
      contactPhone: newContactPhone,
      additionalNotes: newNotes,
      status: 'active',
      createdAt: 'දැන් (Just now)',
      createdAtMs: Date.now(),
      userId: currentUser?.userId || currentUser?.id,
    };

    const updated = [newRequest, ...bloodRequests];
    setBloodRequests(updated);
    saveBloodRequestsToStorage(updated);
    saveBloodRequestToFirestore(newRequest).catch((err) => console.warn('saveBloodRequestToFirestore error:', err));
    
    // 🚨 PickMe-style background alert broadcast
    broadcastAppNotification({
      type: 'emergency_blood',
      title: `🩸 හදිසි ${newBloodGroup} ලේ අවශ්‍යතාවයක්!`,
      message: `${newHospitalName} - ${newPatientName} වෙනුවෙන් ${newBloodGroup} ලේ ඒකක ${newUnitsNeeded}ක් හදිසියේ අවශ්‍යයි.`,
      locationName: newDistrict,
      badgeText: 'හදිසි',
      targetModal: 'blood',
      targetPostId: newRequest.id,
    });

    setShowAddBloodRequestForm(false);
    
    // Also save to Main Help Posts Notice Board with High-Priority Pinned Emergency flag
    if (onSubmitHelpPost) {
      onSubmitHelpPost({
        category: 'emergency',
        tagCategory: 'හදිසි / ආපදා',
        tagName: `🩸 හදිසි ${newBloodGroup} ලේ අවශ්‍යතාවය`,
        whatHappened: `🩸 ${newBloodGroup} රුධිරය හදිසියේ අවශ්‍යයි: ${newHospitalName}`,
        whatIsNeeded: `රෝගී නම: ${newPatientName} • ලේ වර්ගය: ${newBloodGroup} • අවශ්‍ය ඒකක: ${newUnitsNeeded} • රෝහල: ${newHospitalName} • දිස්ත්‍රික්කය: ${newDistrict} • අවශ්‍ය දිනය: ${newNeededDate || 'කඩිනමින්'} • සම්බන්ධීකාරක: ${newContactName || 'සම්බන්ධීකාරක'} (${newContactPhone}) ${newNotes ? `• සටහන්: ${newNotes}` : ''}`,
        locationName: `${newHospitalName}, ${newDistrict}`,
        district: newDistrict,
        priorityLevel: 'emergency',
        isPinnedEmergency: true,
        contactNumber: newContactPhone,
        contactPersonName: newContactName || 'සම්බන්ධීකාරක',
        status: 'open',
        postCode: newRequest.postCode,
      }).catch((e) => console.warn('Sync blood to help posts notice:', e));
    }

    onClose();
    setTimeout(() => {
      const el = document.getElementById('help-notices-feed');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 300);
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
    alert('ස්වේච්ඡා ලේ පරිත්‍යාගශීලියෙකු ලෙස සාර්ථකව ලියාපදිංචි විය! ඔබගේ සහයට ස්තූතියි.');
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
    
    // 📦 PickMe-style background alert broadcast
    broadcastAppNotification({
      type: 'aid_ledger',
      title: `📦 හදිසි ආපදා සහන ඉල්ලීමක්: ${reliefTitle}`,
      message: `${reliefLocation} (${reliefDistrict}) - ${reliefDesc || 'ආපදා සහනාධාර ද්‍රව්‍ය කඩිනමින් අවශ්‍යයි.'}`,
      locationName: reliefDistrict,
      badgeText: 'ආපදා සහන',
      targetModal: 'blood',
      targetPostId: newItem.id,
    });

    setShowAddDisasterForm(false);
    
    // Also save to Main Help Posts Notice Board with High-Priority Pinned Emergency flag
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

    onClose();
    setTimeout(() => {
      const el = document.getElementById('help-notices-feed');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 300);
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
    alert(`ස්තූතියි! ${req.patientName} වෙනුවෙන් ලේ පරිත්‍යාගයට ඔබ සහය දැක්වීම අගය කරමු.\n\n📞 දුරකථන අංකය: ${req.contactPhone}\n(දැන් ඔබට සෘජුවම අමතා රෝගියාගේ පාර්ශවය හා සම්බන්ධ විය හැක)`);
  };

  const isAdmin = checkIsAdmin(currentUser) || currentUser?.role === 'admin' || (currentUser as any)?.isAdmin === true;

  const canDeleteBlood = (req: BloodDonationRequest) => {
    if (isAdmin) return true;
    if (!currentUser || !req) return false;
    const userPhone = (currentUser.phone || currentUser.whatsappNumber || '').replace(/\D/g, '');
    const reqPhone = (req.contactPhone || '').replace(/\D/g, '');
    return Boolean(
      (userPhone && reqPhone && userPhone === reqPhone) ||
      (user?.name && req.contactName && user?.name.trim().toLowerCase() === req.contactName.trim().toLowerCase()) ||
      (currentUser.userId && req.userId && (currentUser.userId === req.userId || currentUser.id === req.userId)) ||
      (currentUser.id && req.userId && (currentUser.id === req.userId || currentUser.userId === req.userId)) ||
      (currentUser.nicNumber && req.userId && currentUser.nicNumber === req.userId)
    );
  };

  const canDeleteDonor = (donor: VolunteerDonor) => {
    if (isAdmin) return true;
    if (!currentUser || !donor) return false;
    const userPhone = (currentUser.phone || currentUser.whatsappNumber || '').replace(/\D/g, '');
    const donorPhone = (donor.phone || '').replace(/\D/g, '');
    return Boolean(
      (userPhone && donorPhone && userPhone === donorPhone) ||
      (user?.name && donor.name && user?.name.trim().toLowerCase() === donor.name.trim().toLowerCase()) ||
      (currentUser.userId && donor.userId && (currentUser.userId === donor.userId || currentUser.id === donor.userId)) ||
      (currentUser.id && donor.userId && (currentUser.id === donor.userId || currentUser.userId === donor.userId)) ||
      (currentUser.nicNumber && donor.userId && currentUser.nicNumber === donor.userId)
    );
  };

  const canDeleteDisaster = (item: DisasterReliefItem) => {
    if (isAdmin) return true;
    if (!currentUser || !item) return false;
    const userPhone = (currentUser.phone || currentUser.whatsappNumber || '').replace(/\D/g, '');
    const itemPhone = (item.contactPhone || '').replace(/\D/g, '');
    return Boolean(
      (userPhone && itemPhone && userPhone === itemPhone) ||
      (user?.name && item.contactPerson && user?.name.trim().toLowerCase() === item.contactPerson.trim().toLowerCase()) ||
      (currentUser.userId && item.userId && (currentUser.userId === item.userId || currentUser.id === item.userId)) ||
      (currentUser.id && item.userId && (currentUser.id === item.userId || currentUser.userId === item.userId)) ||
      (currentUser.nicNumber && item.userId && currentUser.nicNumber === item.userId)
    );
  };

  const handleDeleteBloodRequest = (id?: string) => {
    if (!id) return;
    const confirmMsg = isAdmin
      ? 'පරිපාලක (Admin) ලෙස මෙම ලේ ඉල්ලීම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට (Delete) අවශ්‍ය බව තහවුරු කරන්න ද?'
      : 'මෙම ලේ ඉල්ලීම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට (Delete) අවශ්‍ය බව තහවුරු කරන්න ද?';
    if (!window.confirm(confirmMsg)) return;
    const updated = bloodRequests.filter((b) => b.id !== id);
    setBloodRequests(updated);
    saveBloodRequestsToStorage(updated);
    addDeletedBloodId(id);
    deleteBloodRequestFromFirestore(id).catch((err) => {
      console.warn('Delete blood request notice:', err);
    });
    try {
      window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
    } catch {}
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

  const filteredBloodRequests = useMemo(() => {
    return bloodRequests.filter((b) => {
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
  }, [bloodRequests, selectedBloodGroup, selectedDistrict, searchQuery]);

  const filteredDonors = useMemo(() => {
    return volunteerDonors.filter((d) => {
      if (selectedBloodGroup !== 'all' && d.bloodGroup !== selectedBloodGroup) return false;
      if (selectedDistrict !== 'all' && d.district !== selectedDistrict) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (d.name || '').toLowerCase().includes(q) || (d.district || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [volunteerDonors, selectedBloodGroup, selectedDistrict, searchQuery]);

  const filteredDisasterItems = useMemo(() => {
    return disasterItems.filter((item) => {
      if (selectedDistrict !== 'all' && item.district !== selectedDistrict) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (item.title || '').toLowerCase().includes(q) ||
          (item.district || '').toLowerCase().includes(q) ||
          (item.locationName || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [disasterItems, selectedDistrict, searchQuery]);

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
                <span>හදිසි ලේ පරිත්‍යාග සහ ආපදා සහන කේන්ද්‍රය</span>
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

        {/* 🌟 3 LARGE 3D HUB CARDS AT THE TOP (Matching Main Dashboard Hub Style) */}
        <div className="p-3 sm:p-4 bg-gradient-to-b from-slate-100 to-emerald-50/50 dark:from-[#05140d] dark:to-[#071b12] border-b border-emerald-200/80 dark:border-emerald-900/60 shrink-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
            
            {/* BIG BUTTON 1: 🩸 හදිසි ලේ අවශ්‍යතා */}
            <button
              type="button"
              onClick={() => setActiveTab('blood_requests')}
              className={`p-4 sm:p-4.5 rounded-2xl transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[110px] sm:min-h-[125px] relative overflow-hidden active:scale-98 shadow-md ${
                activeTab === 'blood_requests'
                  ? 'bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-xl shadow-red-600/40 border-2 border-white ring-4 ring-rose-400/50 scale-[1.02]'
                  : 'bg-gradient-to-br from-red-700/90 to-rose-800 text-white/95 border border-red-500/40 hover:scale-[1.02] hover:border-white/70 shadow-lg opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner backdrop-blur-xs group-hover:scale-110 transition-transform">
                  <Droplet className="w-6 h-6 fill-white text-white" />
                </div>
                <span className="px-2.5 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black bg-white text-red-700 shadow-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <span>{bloodRequests.length} ඉල්ලීම්</span>
                </span>
              </div>
              <div className="min-w-0 mt-3">
                <h4 className="text-sm sm:text-base font-black text-white leading-tight flex items-center gap-1.5">
                  <span>හදිසි ලේ අවශ්‍යතා</span>
                  {activeTab === 'blood_requests' && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </h4>
                <p className="text-[11px] sm:text-xs text-red-100 font-semibold truncate mt-1">
                  ලේ ඉල්ලීම් බලන්න / පළකරන්න
                </p>
              </div>
            </button>

            {/* BIG BUTTON 2: 🌊 ආපදා සහන */}
            <button
              type="button"
              onClick={() => setActiveTab('disaster_relief')}
              className={`p-4 sm:p-4.5 rounded-2xl transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[110px] sm:min-h-[125px] relative overflow-hidden active:scale-98 shadow-md ${
                activeTab === 'disaster_relief'
                  ? 'bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 text-white shadow-xl shadow-teal-600/40 border-2 border-white ring-4 ring-teal-400/50 scale-[1.02]'
                  : 'bg-gradient-to-br from-teal-700/90 to-emerald-800 text-white/95 border border-teal-500/40 hover:scale-[1.02] hover:border-white/70 shadow-lg opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner backdrop-blur-xs group-hover:scale-110 transition-transform">
                  <Waves className="w-6 h-6 text-white" />
                </div>
                <span className="px-2.5 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black bg-white text-teal-800 shadow-md">
                  {disasterItems.length} ආපදා
                </span>
              </div>
              <div className="min-w-0 mt-3">
                <h4 className="text-sm sm:text-base font-black text-white leading-tight flex items-center gap-1.5">
                  <span>ආපදා සහනාධාර</span>
                  {activeTab === 'disaster_relief' && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </h4>
                <p className="text-[11px] sm:text-xs text-teal-100 font-semibold truncate mt-1">
                  සහන මෙහෙයුම් & ආධාර
                </p>
              </div>
            </button>

            {/* BIG BUTTON 3: 💖 ලේ පරිත්‍යාගශීලීන් */}
            <button
              type="button"
              onClick={() => setActiveTab('volunteer_donors')}
              className={`p-4 sm:p-4.5 rounded-2xl transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[110px] sm:min-h-[125px] relative overflow-hidden active:scale-98 shadow-md ${
                activeTab === 'volunteer_donors'
                  ? 'bg-gradient-to-br from-pink-600 via-rose-600 to-red-600 text-white shadow-xl shadow-pink-600/40 border-2 border-white ring-4 ring-pink-400/50 scale-[1.02]'
                  : 'bg-gradient-to-br from-rose-700/90 to-pink-800 text-white/95 border border-pink-500/40 hover:scale-[1.02] hover:border-white/70 shadow-lg opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner backdrop-blur-xs group-hover:scale-110 transition-transform">
                  <Heart className="w-6 h-6 fill-white text-white" />
                </div>
                <span className="px-2.5 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black bg-white text-pink-800 shadow-md">
                  {volunteerDonors.length} දායකයින්
                </span>
              </div>
              <div className="min-w-0 mt-3">
                <h4 className="text-sm sm:text-base font-black text-white leading-tight flex items-center gap-1.5">
                  <span>පරිත්‍යාගශීලීන්</span>
                  {activeTab === 'volunteer_donors' && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </h4>
                <p className="text-[11px] sm:text-xs text-pink-100 font-semibold truncate mt-1">
                  ස්වේච්ඡා දායක නාමාවලිය
                </p>
              </div>
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
              className="w-full py-2.5 sm:py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 hover:from-amber-500/25 hover:to-emerald-500/25 text-amber-900 dark:text-amber-200 border-2 border-amber-400/60 flex items-center justify-between text-xs sm:text-sm font-black transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <div className="flex items-center gap-2 sm:gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>🏛️ විනිවිදභාවයේ ආධාර ලෙජරය (Transparent Aid Ledger) විවෘත කරන්න</span>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            </button>
          )}
        </div>

        {/* 🚀 PROMINENT PRIMARY CTA ACTION BUTTON FOR ACTIVE TAB */}
        <div className="p-3 sm:p-4 bg-white dark:bg-[#06180f] border-b border-emerald-100 dark:border-emerald-900/60 shrink-0 space-y-3">
          {activeTab === 'blood_requests' && (
            <button
              type="button"
              onClick={() => {
                if (isDemo) {
                  if (onRequireRegistration) onRequireRegistration();
                  return;
                }
                setShowAddBloodRequestForm(true);
              }}
              className="w-full py-4 sm:py-4.5 px-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-700 text-white font-black text-sm sm:text-base shadow-xl shadow-red-600/30 hover:shadow-red-600/50 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-3 border-2 border-red-300/80 group"
            >
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <Plus className="w-5 h-5 text-white stroke-[3]" />
              </div>
              <span className="tracking-wide">+ හදිසි ලේ අවශ්‍යතාවක් පළකරන්න (Post Blood Request)</span>
              <Droplet className="w-5 h-5 fill-white text-white animate-bounce" />
            </button>
          )}

          {activeTab === 'disaster_relief' && (
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
          )}

          {activeTab === 'volunteer_donors' && (
            <button
              type="button"
              onClick={() => {
                if (isDemo) {
                  if (onRequireRegistration) onRequireRegistration();
                  return;
                }
                setShowRegisterDonorForm(true);
              }}
              className="w-full py-4 sm:py-4.5 px-5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 hover:from-pink-700 hover:to-rose-700 text-white font-black text-sm sm:text-base shadow-xl shadow-pink-600/30 hover:shadow-pink-600/50 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-3 border-2 border-pink-300/80 group"
            >
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <Heart className="w-5 h-5 fill-white text-white" />
              </div>
              <span className="tracking-wide">+ ස්වේච්ඡා ලේ පරිත්‍යාගශීලියෙකු ලෙස ලියාපදිංචි වන්න (Register as Donor)</span>
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </button>
          )}

          {/* Filter Bar (Blood Group & District) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-emerald-950">
            {/* Blood group filter */}
            {(activeTab === 'blood_requests' || activeTab === 'volunteer_donors') && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
                <button
                  type="button"
                  onClick={() => setSelectedBloodGroup('all')}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs cursor-pointer transition-all ${
                    selectedBloodGroup === 'all'
                      ? 'bg-rose-600 text-white shadow-md scale-105'
                      : 'bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-rose-50 border border-slate-200 dark:border-emerald-900'
                  }`}
                >
                  සියලු ලේ වර්ග
                </button>
                {bloodGroups.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setSelectedBloodGroup(bg)}
                    className={`px-3 py-1.5 rounded-xl font-black font-mono text-xs sm:text-sm cursor-pointer transition-all ${
                      selectedBloodGroup === bg
                        ? 'bg-rose-600 text-white shadow-md scale-105 ring-2 ring-rose-400'
                        : 'bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-rose-50 border border-slate-200 dark:border-emerald-900'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            )}

            {/* District select */}
            <div className="flex items-center gap-2 text-xs sm:text-sm ml-auto">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 dark:bg-[#0a2618] border-2 border-emerald-400 dark:border-emerald-800 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">📍 සියලු දිස්ත්‍රික්ක</option>
                {districtsList.filter((d) => d !== 'all').map((dist) => (
                  <option key={dist} value={dist}>
                    📍 {dist}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tab 1: Blood Requests Feed */}
        {activeTab === 'blood_requests' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-[#05140d]">
            {filteredBloodRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                <Droplet className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p>තෝරාගත් ලේ වර්ගය හෝ දිස්ත්‍රික්කය සඳහා දැනට සක්‍රිය ලේ ඉල්ලීම් නොමැත.</p>
              </div>
            ) : (
              filteredBloodRequests.filter(Boolean).map((req, rIdx) => {
                const isSupported = req.id ? supportedBloodIds.includes(req.id) : false;
                return (
                  <div
                    key={`blood_req_${req.id || 'r'}_${rIdx}`}
                    className="p-4 bg-white dark:bg-[#071d12] border-2 border-rose-200 dark:border-rose-950 rounded-2xl shadow-xs hover:border-rose-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            {maskName(req.patientName, isDemo)} වෙනුවෙන් (පයින්ට් {req.unitsNeeded}ක්)
                          </h4>
                          {req.urgency === 'urgent' && (
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
                              <span>{isAdmin ? 'ඉවත් කරන්න (Admin)' : 'ඉවත් කරන්න'}</span>
                            </button>
                          )}
                        </div>

                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-rose-600" />
                          <span>{req.hospitalName} ({req.district})</span>
                        </p>

                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            🗓️ අවශ්‍ය දිනය: <strong className="text-slate-700 dark:text-slate-300">{req.neededDate}</strong>
                          </span>
                          <span className="flex items-center gap-1 font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                            <Users className="w-3 h-3" />
                            <span>සහය දැක්වූවන්: {req.supportedCount || 0}ක්</span>
                          </span>
                        </div>

                        {req.additionalNotes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-rose-50/60 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
                            {req.additionalNotes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact & Support Button Area */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                      {!isDemo && isSupported ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 shadow-xs">
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span className="font-mono font-black">{req.contactPhone}</span>
                          </div>

                          <a
                            href={`tel:${req.contactPhone}`}
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
                            <span className="font-mono tracking-widest">{maskPhone(req.contactPhone, true)}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (isDemo) {
                                if (onRequireRegistration) onRequireRegistration();
                                return;
                              }
                              handleSupportBlood(req);
                            }}
                            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer border-2 border-rose-300/80 hover:scale-105"
                          >
                            <HeartHandshake className="w-4 h-4 text-rose-200" />
                            <span>මම සහය වෙමි</span>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-[#05140d]">
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

        {/* Tab 3: Disaster Relief Items - Detailed Card Feed */}
        {activeTab === 'disaster_relief' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-[#05140d]">
            {/* Header info bar */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  සක්‍රිය ආපදා සහනාධාර අවශ්‍යතා ({filteredDisasterItems.length})
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                {selectedDistrict !== 'all' ? `දිස්ත්‍රික්කය: ${selectedDistrict}` : 'දිවයින පුරා සියලු දිස්ත්‍රික්ක'}
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

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    අමතර විස්තර / වාට්ටු අංකය (Notes)
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

        {/* 3. Add Disaster Item Form */}
        {showAddDisasterForm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-[#071911] border-2 border-teal-500 rounded-3xl p-5 shadow-2xl space-y-3.5">
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
                        <option key={dist} value={dist}>{dist}</option>
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
                      දුරකථන අංකය *
                    </label>
                    <input
                      type="tel"
                      required
                      value={reliefContactPhone}
                      onChange={(e) => setReliefContactPhone(e.target.value)}
                      placeholder="07xxxxxxxx"
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black"
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

      </div>
    </div>
  );
};
