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
import { BloodDonationRequest, VolunteerDonor, BloodGroup, Language, User as UserType } from '../types';
import { maskName, maskPhone, maskAddress } from '../utils/demoDataMasker';
import { 
  getStoredBloodRequests, 
  saveBloodRequestsToStorage, 
  getStoredVolunteerDonors, 
  saveVolunteerDonorsToStorage, 
  getStoredSupportedBloodIds, 
  saveSupportedBloodIdsToStorage 
} from '../data/bloodAndDisasterData';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { addDeletedBloodId, addDeletedDonorId } from '../utils/deletedPostsManager';
import { 
  deleteBloodRequestFromFirestore, 
  deleteVolunteerDonorFromFirestore, 
  deleteDisasterReliefFromFirestore,
  saveBloodRequestToFirestore,
  saveVolunteerDonorToFirestore,
  saveDisasterReliefToFirestore,
  subscribeToBloodRequestsFromFirestore,
  subscribeToVolunteerDonorsFromFirestore
} from '../lib/firebase';
import { broadcastAppNotification } from '../utils/notificationManager';

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

    return () => {
      unsubBlood();
      unsubDonors();
      window.removeEventListener('sahaya_blood_disaster_updated', refresh);
      window.removeEventListener('sahaya_sync_all_services', refresh);
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
  const [newNotes, setNewNotes] = useState('');

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
    setActiveTab('blood_requests');
    setBannerMessage(`🩸 ${newPatientName} වෙනුවෙන් ${newBloodGroup} ලේ අවශ්‍යතාවය සාර්ථකව පළ කරන ලදී! පහත ලැයිස්තුවේ දැන් දිස්වේ.`);
    
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
      (currentUser?.name && req.contactName && currentUser?.name.trim().toLowerCase() === req.contactName.trim().toLowerCase()) ||
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

  // Merge any blood emergency posts from helpPosts
  const allMergedBloodRequests = useMemo(() => {
    const map = new Map<string, BloodDonationRequest>();
    for (const b of bloodRequests) {
      if (b && b.id) map.set(String(b.id), b);
    }
    if (helpPosts && helpPosts.length > 0) {
      for (const p of helpPosts) {
        if (!p) continue;
        const isBlood = 
          p.category === 'emergency' || 
          p.category === 'blood' || 
          p.isPinnedEmergency || 
          (p.tagName && (p.tagName.includes('ලේ') || p.tagName.toLowerCase().includes('blood'))) ||
          (p.whatHappened && (p.whatHappened.includes('ලේ') || p.whatHappened.includes('රුධිරය'))) ||
          (p.whatIsNeeded && (p.whatIsNeeded.includes('ලේ') || p.whatIsNeeded.includes('රුධිරය')));
        
        if (isBlood) {
          const id = String(p.id || `bld_hp_${Date.now()}`);
          if (!map.has(id)) {
            const bgMatch = `${p.tagName || ''} ${p.whatHappened || ''} ${p.whatIsNeeded || ''}`.match(/(A\+|A-|B\+|B-|AB\+|AB-|O\+|O-)/i);
            const bg = (bgMatch ? bgMatch[1].toUpperCase() : 'O+') as BloodGroup;
            map.set(id, {
              id,
              postCode: p.postCode || `#BLD-${id.slice(-4)}`,
              patientName: p.contactPersonName || p.authorName || 'රෝගියා',
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

      </div>
    </div>
  );
};

