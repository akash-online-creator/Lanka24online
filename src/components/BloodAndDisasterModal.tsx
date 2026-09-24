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
  Trash2
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
  deleteDisasterReliefFromFirestore 
} from '../lib/firebase';

interface BloodAndDisasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType;
  lang?: Language;
  initialTab?: 'blood_requests' | 'volunteer_donors' | 'disaster_relief';
  onRequireRegistration?: () => void;
  onOpenAidLedger?: () => void;
}

export const BloodAndDisasterModal: React.FC<BloodAndDisasterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang = 'si',
  initialTab = 'blood_requests',
  onRequireRegistration,
  onOpenAidLedger,
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
    setShowAddBloodRequestForm(false);
    alert('හදිසි ලේ අවශ්‍යතාවය සාර්ථකව පලකෙරිණි!');
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
    };

    const updated = [newItem, ...disasterItems];
    setDisasterItems(updated);
    saveDisasterReliefItemsToStorage(updated);
    setShowAddDisasterForm(false);
    alert('ආපදා සහන අවශ්‍යතාවය සාර්ථකව පලකෙරිණි!');
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

  const isAdmin = checkIsAdmin(currentUser);

  const handleDeleteBloodRequest = (id?: string) => {
    if (!id) return;
    if (!confirm('මෙම ලේ ඉල්ලීම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න ද?')) return;
    const updated = bloodRequests.filter((b) => b.id !== id);
    setBloodRequests(updated);
    saveBloodRequestsToStorage(updated);
    addDeletedBloodId(id);
    deleteBloodRequestFromFirestore(id).catch((err) => {
      console.warn('Delete blood request notice:', err);
    });
  };

  const handleDeleteDonor = (id?: string) => {
    if (!id) return;
    if (!confirm('මෙම ලේ පරිත්‍යාගශීලියා ලැයිස්තුවෙන් ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න ද?')) return;
    const updated = volunteerDonors.filter((d) => d.id !== id);
    setVolunteerDonors(updated);
    saveVolunteerDonorsToStorage(updated);
    addDeletedDonorId(id);
    deleteVolunteerDonorFromFirestore(id).catch((err) => {
      console.warn('Delete volunteer donor notice:', err);
    });
  };

  const handleDeleteDisaster = (id?: string) => {
    if (!id) return;
    if (!confirm('මෙම ආපදා සහනාධාර දැන්වීම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න ද?')) return;
    const updated = disasterItems.filter((item) => item.id !== id);
    setDisasterItems(updated);
    saveDisasterReliefItemsToStorage(updated);
    addDeletedDisasterId(id);
    deleteDisasterReliefFromFirestore(id).catch((err) => {
      console.warn('Delete disaster item notice:', err);
    });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-[#071910] border-2 border-emerald-500/60 rounded-[2rem] shadow-[0_20px_60px_rgba(0,122,75,0.25)] overflow-hidden relative flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-600 via-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Droplet className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>හදිසි ලේ පරිත්‍යාග සහ ආපදා සහන කේන්ද්‍රය</span>
              </h3>
              <p className="text-[11px] text-rose-100 flex items-center gap-1.5">
                <span>ජීවිත බේරාගැනීමේ හදිසි සත්කාරක ප්‍රජා ජාලය</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Main Navigation Tabs: Reordered to Blood Requests | Disaster Relief | Volunteer Donors */}
        <div className="flex items-center border-b border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-[#05140d] px-4 pt-2 gap-2 overflow-x-auto shrink-0">
          {/* Tab 1: හදිසි ලේ අවශ්‍යතා */}
          <button
            type="button"
            onClick={() => setActiveTab('blood_requests')}
            className={`pb-2.5 px-3 font-black text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'blood_requests'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-rose-500'
            }`}
          >
            <Droplet className="w-4 h-4 fill-current" />
            <span>හදිසි ලේ අවශ්‍යතා ({bloodRequests.length})</span>
          </button>

          {/* Tab 2: ආපදා සහන */}
          <button
            type="button"
            onClick={() => setActiveTab('disaster_relief')}
            className={`pb-2.5 px-3 font-black text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'disaster_relief'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-teal-500'
            }`}
          >
            <Waves className="w-4 h-4" />
            <span>ආපදා සහන ({disasterItems.length})</span>
          </button>

          {/* Tab 3: ලේ පරිත්‍යාගශීලීන් */}
          <button
            type="button"
            onClick={() => setActiveTab('volunteer_donors')}
            className={`pb-2.5 px-3 font-black text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'volunteer_donors'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-emerald-500'
            }`}
          >
            <Heart className="w-4 h-4 fill-current" />
            <span>ලේ පරිත්‍යාගශීලීන් ({volunteerDonors.length})</span>
          </button>

          {/* Quick switch to Transparent Aid Ledger */}
          {onOpenAidLedger && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAidLedger();
              }}
              className="pb-2.5 px-3 font-black text-xs sm:text-sm border-b-2 border-transparent text-emerald-700 dark:text-emerald-400 hover:text-emerald-600 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ml-auto bg-emerald-50 dark:bg-emerald-950/40 rounded-t-xl"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>🏛️ විනිවිදභාවයේ ලෙජරය (Aid Ledger)</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="p-3 bg-white dark:bg-[#06180f] border-b border-emerald-100 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Blood group filter if on blood tabs */}
            {(activeTab === 'blood_requests' || activeTab === 'volunteer_donors') && (
              <div className="flex items-center gap-1 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedBloodGroup('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                    selectedBloodGroup === 'all'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  සියලු ලේ වර්ග
                </button>
                {bloodGroups.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setSelectedBloodGroup(bg)}
                    className={`px-2 py-1 rounded-lg font-black font-mono text-xs cursor-pointer ${
                      selectedBloodGroup === bg
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            )}

            {/* District select */}
            <div className="flex items-center gap-1 text-xs">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="px-2 py-1 bg-slate-50 dark:bg-[#0a2618] border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="all">සියලු දිස්ත්‍රික්ක</option>
                {districtsList.filter((d) => d !== 'all').map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Button: Post New */}
          <div>
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
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ලේ අවශ්‍යතාවක් පලකරන්න</span>
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
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>පරිත්‍යාගශීලියෙකු වන්න</span>
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
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ආපදා සහන අවශ්‍යතාවක්</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Blood Requests Feed */}
        {activeTab === 'blood_requests' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-[#05140d]">
            {filteredBloodRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                තෝරාගත් ලේ වර්ගය හෝ දිස්ත්‍රික්කය සඳහා දැනට සක්‍රිය ලේ ඉල්ලීම් නොමැත.
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
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 text-white flex flex-col items-center justify-center font-mono font-black shrink-0 shadow-md">
                        <span className="text-base leading-none">{req.bloodGroup}</span>
                        <span className="text-[9px] uppercase font-bold opacity-80 mt-0.5">Blood</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800">
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
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBloodRequest(req.id)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                              title="පරිපාලක ලෙස ලේ ඉල්ලීම ඉවත් කරන්න (Admin Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                          <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-200 shadow-xs">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-mono font-black">{req.contactPhone}</span>
                          </div>

                          <a
                            href={`tel:${req.contactPhone}`}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>අමතන්න</span>
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-1.5 text-xs text-slate-400">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
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
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            <HeartHandshake className="w-3.5 h-3.5 text-rose-200" />
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
              <div className="text-center py-12 text-slate-400 text-xs">
                තෝරාගත් ලේ වර්ගය සඳහා ලියාපදිංචි පරිත්‍යාගශීලීන් නොමැත. ඔබත් ස්වේච්ඡා පරිත්‍යාගශීලියෙකු ලෙස එක්වන්න!
              </div>
            ) : (
              filteredDonors.map((donor, dIdx) => (
                <div
                  key={`blood_donor_${donor.id || 'd'}_${dIdx}`}
                  className="p-3.5 bg-white dark:bg-[#071d12] border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 flex flex-col items-center justify-center font-mono font-black shrink-0">
                      <span className="text-sm leading-none">{donor.bloodGroup}</span>
                      <span className="text-[8px] uppercase font-bold text-emerald-600 mt-0.5">Donor</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          {maskName(donor.name, isDemo)}
                        </h4>
                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-300">
                          {donor.district}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        අවසාන වරට ලේ දුන් දිනය: <span className="font-bold text-slate-600 dark:text-slate-300">{donor.lastDonatedDate}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDonor(donor.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                        title="පරිපාලක ලෙස පරිත්‍යාගශීලියා ඉවත් කරන්න (Admin Delete)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isDemo ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (onRequireRegistration) onRequireRegistration();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>විමසන්න</span>
                      </button>
                    ) : (
                      <a
                        href={`tel:${donor.phone}`}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>විමසන්න</span>
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Disaster Relief Items - Detailed Card Feed (Clean & Clear View) */}
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
                    ඔබගේ ප්‍රදේශයේ ආපදාවක් හෝ සහනාධාර අවශ්‍යතාවක් ඇත්නම් පහත බොත්තම මඟින් දැනුම්දෙන්න.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddDisasterForm(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>නව ආපදා අවශ්‍යතාවක් එක්කරන්න</span>
                </button>
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
                            {item.type === 'medicine' && '💊 ඖෂධ'}
                            {item.type === 'clothes' && '👕 ඇඳුම් පැළඳුම්'}
                            {item.type === 'rescue' && '🛶 බෝට්ටු / මුදාගැනීම්'}
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
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDisaster(item.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title="පරිපාලක ලෙස ආපදා දැන්වීම ඉවත් කරන්න (Admin Delete)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {!isDemo && isSupported ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-200 shadow-xs">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-mono font-black">{item.contactPhone}</span>
                            </div>

                            <a
                              href={`tel:${item.contactPhone}`}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>අමතන්න</span>
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-1.5 text-xs text-slate-400">
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
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
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                            >
                              <HeartHandshake className="w-3.5 h-3.5 text-emerald-200" />
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
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-[#071911] border-2 border-rose-500 rounded-3xl p-5 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-rose-100 dark:border-rose-900">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-rose-600 fill-current" />
                  <span>හදිසි ලේ අවශ්‍යතාවක් පලකිරීම</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddBloodRequestForm(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold"
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
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
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
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold font-mono"
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
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
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
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
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
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
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
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold"
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
                    className="w-full p-2 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  හදිසි ලේ ඉල්ලීම පලකරන්න (Publish Request)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 2. Register Donor Form */}
        {showRegisterDonorForm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-[#071911] border-2 border-emerald-500 rounded-3xl p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-emerald-900">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-emerald-600 fill-current" />
                  <span>ලේ පරිත්‍යාගශීලියෙකු ලෙස ලියාපදිංචිය</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowRegisterDonorForm(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold"
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
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
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
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold font-mono"
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
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold"
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
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  ස්වේච්ඡා පරිත්‍යාගශීලියෙකු ලෙස එක්වන්න
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 3. Add Disaster Item Form */}
        {showAddDisasterForm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-[#071911] border-2 border-teal-500 rounded-3xl p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-teal-100 dark:border-teal-900">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Waves className="w-4 h-4 text-teal-600" />
                  <span>ආපදා සහන අවශ්‍යතාවක් පලකිරීම</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddDisasterForm(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold"
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
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
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
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
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
                      placeholder="07xxxxxxxx"
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
                    className="w-full p-2 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
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
