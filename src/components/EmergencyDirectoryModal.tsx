import React, { useState, useMemo } from 'react';
import { 
  Phone, 
  PhoneCall, 
  Search, 
  MapPin, 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  HeartPulse, 
  Flame, 
  Waves, 
  HelpCircle, 
  Zap, 
  Copy, 
  Check, 
  Info,
  Building,
  Plus,
  Trash2,
  Lock,
  Sparkles,
  ShieldAlert,
  Coins,
  Flag,
  UserCheck,
  AlertCircle,
  ThumbsDown,
  Gift
} from 'lucide-react';
import { EmergencyServiceContact, Language, User as UserType } from '../types';
import { 
  getStoredEmergencyContacts, 
  saveCustomEmergencyContact, 
  deleteCustomEmergencyContact,
  reportEmergencyContactInactive
} from '../data/emergencyDirectory';
import { rewardEmergencyContactCredit } from '../utils/creditManager';
import { syncUserProfileToFirestore } from '../lib/firebase';

interface EmergencyDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType | null;
  lang?: Language;
  onUpdateUser?: (updatedUser: UserType) => void;
  onRequireRegistration?: () => void;
}

type FilterCategory = 'all' | 'community' | 'ambulance' | 'police' | 'hospital' | 'fire' | 'disaster' | 'helpline' | 'utilities';

export const EmergencyDirectoryModal: React.FC<EmergencyDirectoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang = 'si',
  onUpdateUser,
  onRequireRegistration,
}) => {
  const [contacts, setContacts] = useState<EmergencyServiceContact[]>(() => getStoredEmergencyContacts(false));
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add contact form state (open to ALL registered users!)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNameSi, setNewNameSi] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newCategory, setNewCategory] = useState<EmergencyServiceContact['category']>('hospital');
  const [newPhone, setNewPhone] = useState('');
  const [newAltPhone, setNewAltPhone] = useState('');
  const [newIsNational, setNewIsNational] = useState(false);
  const [newDistrict, setNewDistrict] = useState('කොළඹ');
  const [newAddress, setNewAddress] = useState('');
  const [newDescSi, setNewDescSi] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inactive report modal state
  const [reportTargetContact, setReportTargetContact] = useState<EmergencyServiceContact | null>(null);
  const [reportReason, setReportReason] = useState('දුරකථන අංකය විසන්ධි කර ඇත / ක්‍රියා නොකරයි');
  const [customReportReason, setCustomReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Reward celebratory popup state
  const [rewardNotice, setRewardNotice] = useState<{
    serviceName: string;
    phone: string;
    creditsEarned: number;
    newBalance: number;
  } | null>(null);

  // General toast / notification message
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Check user registration status
  const isRegisteredUser = !!currentUser && currentUser.status === 'approved' && !currentUser.isDemo;
  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.email?.includes('admin') || 
                  currentUser?.email === 'www.akash.online@gmail.com' ||
                  currentUser?.phone === '0771234567';

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

  const handleOpenAddForm = () => {
    if (!currentUser || currentUser.isDemo || currentUser.status !== 'approved') {
      if (onRequireRegistration) {
        onRequireRegistration();
        return;
      }
      alert('හදිසි අංක එක්කර ක්‍රෙඩිට් 2 (Rs. 2.00) ක ත්‍යාගය ලබාගැනීමට කරුණාකර ලියාපදිංචි වී Login වන්න.');
      return;
    }
    setShowAddForm(true);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameSi.trim() || !newPhone.trim()) {
      alert('කරුණාකර සේවාවේ නම සහ දුරකථන අංකය ඇතුළත් කරන්න.');
      return;
    }

    if (!currentUser) {
      alert('කරුණාකර පළමුව ලියාපදිංචි වන්න.');
      return;
    }

    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const nowReadable = nowIso.replace('T', ' ').slice(0, 16);

      const newContact: EmergencyServiceContact = {
        id: `custom_emg_${Date.now()}`,
        serviceNameSi: newNameSi.trim(),
        serviceNameEn: newNameEn.trim() || newNameSi.trim(),
        category: newCategory,
        phone: newPhone.trim(),
        altPhone: newAltPhone.trim() || undefined,
        isNational: newIsNational,
        district: newIsNational ? undefined : newDistrict,
        address: newAddress.trim() || undefined,
        descriptionSi: newDescSi.trim() || undefined,
        submittedByUserId: currentUser.id || currentUser.userId,
        submittedByUserName: currentUser.name || 'පරිශීලක',
        submittedByUserPhone: currentUser.phone || '',
        submittedAt: nowReadable,
        submittedAtMs: Date.now(),
        rewardCreditsAwarded: 2,
        reportedInactiveCount: 0,
        reportedInactiveUserIds: [],
        reportedInactiveDetails: [],
        isInactiveDeactivated: false,
        adminStatus: 'active',
      };

      // Save to directory storage
      const updatedList = saveCustomEmergencyContact(newContact);
      setContacts(updatedList);

      // Award 2 Credits to user
      const creditResult = rewardEmergencyContactCredit(
        currentUser,
        newContact.serviceNameSi,
        newContact.phone
      );

      // Update current user state and firestore
      const updatedUser: UserType = {
        ...currentUser,
        credits: creditResult.newBalance,
      };

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }
      syncUserProfileToFirestore(updatedUser).catch((err) => {
        console.warn('Firestore user sync warning:', err);
      });

      // Show celebratory reward modal
      setRewardNotice({
        serviceName: newContact.serviceNameSi,
        phone: newContact.phone,
        creditsEarned: 2,
        newBalance: creditResult.newBalance,
      });

      setShowAddForm(false);

      // Reset form fields
      setNewNameSi('');
      setNewNameEn('');
      setNewPhone('');
      setNewAltPhone('');
      setNewAddress('');
      setNewDescSi('');
    } catch (err) {
      console.error('Failed to create emergency contact:', err);
      alert('හදිසි අංකය එක්කිරීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReportModal = (contact: EmergencyServiceContact) => {
    if (!currentUser || currentUser.isDemo || currentUser.status !== 'approved') {
      if (onRequireRegistration) {
        onRequireRegistration();
        return;
      }
      alert('හදිසි අංක ක්‍රියා විරහිත බව වාර්තා කිරීමට කරුණාකර ලියාපදිංචි වී Login වන්න.');
      return;
    }

    // Check if user already reported
    if (contact.reportedInactiveUserIds?.includes(currentUser.id)) {
      setFeedbackNotice({
        type: 'info',
        message: 'ඔබ දැනටමත් මෙම අංකය ක්‍රියා විරහිත බවට වාර්තා කර ඇත.',
      });
      return;
    }

    setReportTargetContact(contact);
    setReportReason('දුරකථන අංකය විසන්ධි කර ඇත / ක්‍රියා නොකරයි');
    setCustomReportReason('');
  };

  const handleConfirmReportInactive = async () => {
    if (!reportTargetContact || !currentUser) return;

    setIsReporting(true);
    const finalReason = reportReason === 'other' ? customReportReason.trim() || 'වෙනත් හේතුවක්' : reportReason;

    try {
      const result = reportEmergencyContactInactive(
        reportTargetContact.id,
        {
          id: currentUser.id,
          name: currentUser.name,
          phone: currentUser.phone,
        },
        finalReason
      );

      // Refresh public contacts list
      setContacts(getStoredEmergencyContacts(false));
      setReportTargetContact(null);

      if (result.isNowDeactivated) {
        setFeedbackNotice({
          type: 'warning',
          message: `⚠️ ස්තූතියි! පරිශීලකයින් 3 දෙනෙකු විසින් මෙම අංකය (${reportTargetContact.phone}) ක්‍රියා විරහිත බව සනාථ කර ඇති බැවින්, එය නාමාවලියෙන් ඉවත් කර පරිපාලක (Admin) වෙත දැනුවත් කරන ලදී.`,
        });
      } else if (result.success) {
        setFeedbackNotice({
          type: 'success',
          message: result.message,
        });
      } else {
        setFeedbackNotice({
          type: 'info',
          message: result.message,
        });
      }
    } catch (err) {
      console.error('Report error:', err);
      alert('වාර්තාව සටහන් කිරීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setIsReporting(false);
    }
  };

  const handleDeleteContact = (id: string) => {
    const updatedList = deleteCustomEmergencyContact(id);
    setContacts(updatedList);
    setFeedbackNotice({
      type: 'info',
      message: 'අංකය නාමාවලියෙන් ඉවත් කරන ලදී.',
    });
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter((item) => {
      // Category filter
      if (selectedCategory === 'community') {
        if (!item.submittedByUserId && !item.id.startsWith('custom_emg_')) {
          return false;
        }
      } else if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // District filter
      if (selectedDistrict !== 'all') {
        if (!item.isNational && item.district !== selectedDistrict) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNameSi = (item.serviceNameSi || '').toLowerCase().includes(q);
        const matchesNameEn = (item.serviceNameEn || '').toLowerCase().includes(q);
        const matchesPhone = (item.phone || '').includes(q) || (item.altPhone && item.altPhone.includes(q));
        const matchesDesc = (item.descriptionSi || '').toLowerCase().includes(q);
        const matchesSubmitter = (item.submittedByUserName || '').toLowerCase().includes(q);
        const matchesAddress = (item.address || '').toLowerCase().includes(q);
        if (!matchesNameSi && !matchesNameEn && !matchesPhone && !matchesDesc && !matchesSubmitter && !matchesAddress) {
          return false;
        }
      }
      return true;
    });
  }, [contacts, selectedCategory, selectedDistrict, searchQuery]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ambulance':
        return <HeartPulse className="w-5 h-5 text-rose-500" />;
      case 'police':
        return <ShieldCheck className="w-5 h-5 text-blue-500" />;
      case 'fire':
        return <Flame className="w-5 h-5 text-amber-500" />;
      case 'hospital':
        return <Building className="w-5 h-5 text-emerald-500" />;
      case 'disaster':
        return <Waves className="w-5 h-5 text-cyan-500" />;
      case 'utilities':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'helpline':
      default:
        return <HelpCircle className="w-5 h-5 text-purple-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-[#071910] border-2 border-emerald-500/60 rounded-[2rem] shadow-[0_20px_60px_rgba(0,122,75,0.25)] overflow-hidden relative flex flex-col max-h-[92vh]">
        
        {/* Top Header Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  ශ්‍රී ලංකා හදිසි සේවා අංක නාමාවලිය
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <Coins className="w-3 h-3" />
                  <span>+2 Credits ත්‍යාග</span>
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                <span>අන්තර්ජාලය නොමැතිව වුවද (Offline) ක්ෂණිකව ලබාගත හැකි සේවා</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Community Contribution & 2 Credits Reward Promo Bar */}
        <div className="p-3 bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-teal-500/15 border-b border-amber-300/60 dark:border-amber-900/60 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
            <Gift className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
            <div>
              <span>ඔබ දන්නා හදිසි සේවා අංකයක් එකතු කරන්න: </span>
              <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">
                සෑම අංකයකටම ක්‍රෙඩිට් 2 (Rs. 2.00) බැගින් හිමිවේ!
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddForm}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ නව අංකයක් එක්කරන්න (+2 Cr)</span>
          </button>
        </div>

        {/* Feedback / Toast Notice */}
        {feedbackNotice && (
          <div className={`mx-4 mt-3 p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shrink-0 animate-fadeIn ${
            feedbackNotice.type === 'warning'
              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300'
              : feedbackNotice.type === 'success'
              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300'
              : 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border border-blue-300'
          }`}>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{feedbackNotice.message}</span>
            </div>
            <button
              onClick={() => setFeedbackNotice(null)}
              className="text-slate-500 hover:text-slate-800 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter Controls */}
        <div className="p-3.5 sm:p-4 bg-emerald-50/60 dark:bg-[#05140d] border-b border-emerald-200/80 dark:border-emerald-900/60 space-y-3 shrink-0">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="සේවාව, රෝහල, අංකය හෝ එක්කළ අය අනුව සොයන්න (Search numbers)..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#092217] border border-emerald-300/80 dark:border-emerald-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Category Chips Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {[
              { id: 'all', label: 'සියල්ල (All)' },
              { id: 'community', label: '👥 සාමාජිකයින් එක්කළ අංක' },
              { id: 'ambulance', label: '🚑 ගිලන්රථ (1990)' },
              { id: 'police', label: '👮 පොලිසිය (119)' },
              { id: 'hospital', label: '🏥 රෝහල්' },
              { id: 'fire', label: '🚒 ගිනි නිවන (110)' },
              { id: 'disaster', label: '🌊 ආපදා (117)' },
              { id: 'helpline', label: '🛡️ උපකාරක සේවා' },
              { id: 'utilities', label: '⚡ ජල/විදුලි' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as FilterCategory)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-xs cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#092217] text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* District Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>දිස්ත්‍රික්කය:</span>
            </span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-[#092217] border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">දිවයින පුරා (All Island / සියලු දිස්ත්‍රික්ක)</option>
              {districtsList.filter((d) => d !== 'all').map((dist) => (
                <option key={dist} value={dist}>
                  {dist} දිස්ත්‍රික්කය
                </option>
              ))}
            </select>

            <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
              ප්‍රතිඵල: {filteredContacts.length}
            </span>
          </div>
        </div>

        {/* Directory Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs space-y-2">
              <p>සොයන හදිසි සේවාව හමුවූයේ නැත.</p>
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>ඔබ මෙම අංකය එක්කරන්න (+2 Credits)</span>
              </button>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const hasReportedByMe = currentUser && contact.reportedInactiveUserIds?.includes(currentUser.id);
              const reportCount = contact.reportedInactiveCount || (contact.reportedInactiveUserIds?.length || 0);

              return (
                <div
                  key={contact.id}
                  className="p-3.5 sm:p-4 bg-white dark:bg-[#092217] border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl shadow-xs hover:border-emerald-400 transition-all flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-[#071911] border border-emerald-300 dark:border-emerald-800 flex items-center justify-center shrink-0">
                        {getCategoryIcon(contact.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            {contact.serviceNameSi}
                          </h4>
                          {contact.isNational && (
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-800">
                              ජාතික සේවාව
                            </span>
                          )}
                          {contact.district && (
                            <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-300 dark:border-blue-800">
                              {contact.district}
                            </span>
                          )}
                          {contact.submittedByUserName && (
                            <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-0.5">
                              <Coins className="w-2.5 h-2.5 text-amber-600" />
                              <span>ප්‍රජා දායකත්වය</span>
                            </span>
                          )}
                        </div>

                        {contact.descriptionSi && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                            {contact.descriptionSi}
                          </p>
                        )}
                        {contact.address && (
                          <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                            📍 {contact.address}
                          </p>
                        )}
                        {contact.submittedByUserName && (
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                            👤 එක්කළේ: {contact.submittedByUserName} ({contact.submittedAt || 'මෑතකදී'})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Direct Call & Copy Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAdmin && contact.id.startsWith('custom_emg_') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-2 rounded-xl bg-red-100 dark:bg-red-950/80 hover:bg-red-200 text-red-600 text-xs transition-all active:scale-95"
                          title="අංකය ඉවත් කරන්න (Admin Delete)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopy(contact.id, contact.phone)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-emerald-950/80 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs transition-all active:scale-95 cursor-pointer"
                        title="අංකය කොපි කරන්න"
                      >
                        {copiedId === contact.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <a
                        href={`tel:${contact.phone}`}
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="font-mono">{contact.phone}</span>
                      </a>
                    </div>
                  </div>

                  {/* Bottom Action Line: "නිවැරදි නොවේ" (Report Inactive) Button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-emerald-900/40 flex items-center justify-between text-[11px] gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {reportCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900 text-[10px] flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          <span>ක්‍රියා නොකරන වාර්තා: {reportCount}/3</span>
                        </span>
                      )}
                      {contact.altPhone && (
                        <span className="text-slate-500 font-mono text-[10px]">
                          විකල්ප අංකය: <a href={`tel:${contact.altPhone}`} className="text-emerald-600 underline font-bold">{contact.altPhone}</a>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenReportModal(contact)}
                      disabled={hasReportedByMe}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        hasReportedByMe
                          ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95'
                      }`}
                      title="මෙම දුරකථන අංකය ක්‍රියා විරහිත නම් හෝ වැරදි නම් වාර්තා කරන්න"
                    >
                      <ThumbsDown className="w-3 h-3 text-rose-500" />
                      <span>{hasReportedByMe ? '✓ ඔබ වාර්තා කර ඇත' : '⚠️ නිවැරදි නොවේ (ක්‍රියා විරහිතයි)'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Safety Tip */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border-t border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-200 font-bold flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>හදිසි අනතුරකදී හෝ ජීවිත අවදානමකදී පළමුව 1990 (සුවසැරිය) හෝ 119 (පොලිසිය) අමතන්න.</span>
        </div>

        {/* Add Emergency Contact Modal Form (Open to ALL registered users!) */}
        {showAddForm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-[#071911] border-2 border-emerald-500 rounded-3xl p-5 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-emerald-900">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Gift className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      නව හදිසි අංකයක් එක් කිරීම
                    </h4>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                      🎁 සාර්ථකව එක් කළ පසු ඔබට ක්‍රෙඩිට් 2 (Rs. 2.00) ක් හිමිවේ!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleCreateContact} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    සේවාවේ / රෝහලේ / ආයතනයේ නම (සිංහලෙන්) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newNameSi}
                    onChange={(e) => setNewNameSi(e.target.value)}
                    placeholder="උදා: හෝමාගම මූලික රෝහල / කුරුණෑගල පොලිසිය"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Service Name (English - විකල්ප)
                  </label>
                  <input
                    type="text"
                    value={newNameEn}
                    onChange={(e) => setNewNameEn(e.target.value)}
                    placeholder="e.g. Homagama Base Hospital"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      සේවා කාණ්ඩය *
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                    >
                      <option value="hospital">🏥 රෝහල් (Hospital)</option>
                      <option value="ambulance">🚑 ගිලන්රථ (Ambulance)</option>
                      <option value="police">👮 පොලිසිය (Police)</option>
                      <option value="fire">🚒 ගිනි නිවන (Fire)</option>
                      <option value="disaster">🌊 ආපදා සහන (Disaster)</option>
                      <option value="utilities">⚡ ජල/විදුලි (Utilities)</option>
                      <option value="helpline">🛡️ උපකාරක සේවා (Helpline)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      ප්‍රධාන දුරකථන අංකය *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="උදා: 0112855224 හෝ 1990"
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      විකල්ප අංකය (Optional)
                    </label>
                    <input
                      type="tel"
                      value={newAltPhone}
                      onChange={(e) => setNewAltPhone(e.target.value)}
                      placeholder="උදා: 0112855225"
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      දිස්ත්‍රික්කය
                    </label>
                    <select
                      disabled={newIsNational}
                      value={newDistrict}
                      onChange={(e) => setNewDistrict(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl disabled:opacity-50 font-bold"
                    >
                      {districtsList.filter((d) => d !== 'all').map((d) => (
                        <option key={d} value={d}>
                          {d} දිස්ත්‍රික්කය
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded-xl border border-emerald-200 dark:border-emerald-900">
                  <input
                    type="checkbox"
                    id="isNationalCheckUser"
                    checked={newIsNational}
                    onChange={(e) => setNewIsNational(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="isNationalCheckUser" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    මෙය දිවයින පුරා ක්‍රියාත්මක ජාතික සේවාවකි (All-Island Service)
                  </label>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    ලිපිනය / ස්ථානය
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="උදා: රෝහල් පාර, හෝමාගම"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    සේවා විස්තරය (Description)
                  </label>
                  <textarea
                    rows={2}
                    value={newDescSi}
                    onChange={(e) => setNewDescSi(e.target.value)}
                    placeholder="සේවාව පිළිබඳ කෙටි විස්තරයක්..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                {/* Reward info banner */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-2xl border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>ඔබගේ දායකත්වයට ස්තූතියි!</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    මෙම අංකය සාර්ථකව සුරැකි පසු ඔබගේ ගිණුමට ක්‍රෙඩිට් 2 (Rs. 2.00) ක් ක්ෂණිකව බැරවේ. ඔබගේ නම සහ විස්තර Admin පුවරුවට වාර්තා වේ.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                  >
                    අවලංගු කරන්න
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSubmitting ? 'සුරකිමින් පවතී...' : 'අංකය එක්කරන්න (+2 Credits)'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Report Inactive Sub-Modal */}
        {reportTargetContact && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-[#071911] border-2 border-rose-500 rounded-3xl p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-rose-200 dark:border-rose-900">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
                    <ThumbsDown className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                      අංකය ක්‍රියා විරහිත බව වාර්තා කිරීම
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Report Inactive / Incorrect Emergency Number
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReportTargetContact(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#05140d] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="font-bold text-slate-800 dark:text-white">
                  {reportTargetContact.serviceNameSi}
                </div>
                <div className="text-emerald-600 font-mono font-bold">
                  දුරකථන අංකය: {reportTargetContact.phone}
                </div>
                <div className="text-[10px] text-slate-500">
                  වත්මන් පරිශීලක වාර්තා: {reportTargetContact.reportedInactiveCount || 0}/3 (පරිශීලකයින් 3 ක් සනාථ කළ පසු ඉවත් වේ)
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  හේතුව තෝරන්න (Select Reason):
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'දුරකථන අංකය විසන්ධි කර ඇත / ක්‍රියා නොකරයි', label: '📞 දුරකථන අංකය විසන්ධි කර ඇත / ක්‍රියා නොකරයි' },
                    { id: 'වැරදි ආයතනයක් / වෙනත් පුද්ගලයෙකුට අයත් වේ', label: '🚫 වැරදි ආයතනයක් / වෙනත් පුද්ගලයෙකුට අයත් වේ' },
                    { id: 'ඇමතුම්වලට කිසිදු ප්‍රතිචාරයක් නොදක්වයි (No Response)', label: '🔇 ඇමතුම්වලට කිසිදු ප්‍රතිචාරයක් නොදක්වයි' },
                    { id: 'other', label: '✍️ වෙනත් හේතුවක් (Other Reason)' },
                  ].map((r) => (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer font-medium ${
                        reportReason === r.id
                          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-900 dark:text-rose-200'
                          : 'bg-white dark:bg-[#092217] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReasonRadio"
                        checked={reportReason === r.id}
                        onChange={() => setReportReason(r.id)}
                        className="text-rose-600"
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>

                {reportReason === 'other' && (
                  <textarea
                    rows={2}
                    value={customReportReason}
                    onChange={(e) => setCustomReportReason(e.target.value)}
                    placeholder="වැරැද්ද හෝ හේතුව පිළිබඳ කෙටියෙන් ලියන්න..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                )}
              </div>

              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-300 text-[10px] text-amber-900 dark:text-amber-200">
                ⚠️ පරිශීලකයින් 3 දෙනෙකු විසින් මෙම අංකය ක්‍රියා විරහිත බව සනාථ කළ පසු, එය නාමාවලියෙන් ඉවත් කර Admin වෙත දැනුවත් කෙරේ.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportTargetContact(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReportInactive}
                  disabled={isReporting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>{isReporting ? 'සටහන් කරමින්...' : 'ක්‍රියා විරහිත බව සනාථ කරන්න'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2 Credits Reward Celebratory Popup Modal */}
        {rewardNotice && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm bg-gradient-to-b from-emerald-50 via-white to-amber-50 dark:from-[#062014] dark:via-[#092217] dark:to-[#171607] border-3 border-amber-400 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-scaleUp">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30 animate-bounce">
                <Coins className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <div className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 rounded-full text-xs font-black tracking-wider uppercase border border-amber-300">
                  🎉 සුභ පැතුම්! REWARD UNLOCKED
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  ක්‍රෙඩිට් 2.00 ක් හිමිවිය!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  ශ්‍රී ලංකා හදිසි සේවා නාමාවලියට <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">"{rewardNotice.serviceName}" ({rewardNotice.phone})</span> සාර්ථකව එක්කිරීම වෙනුවෙන් ඔබගේ ගිණුමට ක්‍රෙඩිට් 2.00 බැර කරන ලදී.
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-[#071911] rounded-2xl border-2 border-emerald-300/80 dark:border-emerald-800 shadow-inner flex items-center justify-around">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">ලැබුණු ත්‍යාගය</div>
                  <div className="text-lg font-black text-amber-600 font-mono">+2.00 Cr</div>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">නව ක්‍රෙඩිට් ශේෂය</div>
                  <div className="text-lg font-black text-emerald-600 font-mono">Rs. {rewardNotice.newBalance.toFixed(2)}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRewardNotice(null)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-md active:scale-95 transition-all cursor-pointer"
              >
                නියමයි! දිගටම පවත්වාගන්න (OK)
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

