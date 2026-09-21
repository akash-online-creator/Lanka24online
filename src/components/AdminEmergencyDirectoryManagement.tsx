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
  Gift,
  RotateCcw,
  CheckCircle2,
  Edit,
  User as UserIcon,
  Filter,
  ArrowRight
} from 'lucide-react';
import { EmergencyServiceContact, EmergencyAdminAlert, Language } from '../types';
import { 
  getStoredEmergencyContacts, 
  saveCustomEmergencyContact, 
  deleteCustomEmergencyContact,
  adminReactivateEmergencyContact,
  getEmergencyAdminAlerts,
  markEmergencyAdminAlertResolved
} from '../data/emergencyDirectory';

interface AdminEmergencyDirectoryManagementProps {
  language?: Language;
}

export const AdminEmergencyDirectoryManagement: React.FC<AdminEmergencyDirectoryManagementProps> = ({
  language = 'si',
}) => {
  const [contacts, setContacts] = useState<EmergencyServiceContact[]>(() => getStoredEmergencyContacts(true));
  const [alerts, setAlerts] = useState<EmergencyAdminAlert[]>(() => getEmergencyAdminAlerts());
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'flagged' | 'community' | 'alerts'>('flagged');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');

  // Edit / Add modal state
  const [editingContact, setEditingContact] = useState<EmergencyServiceContact | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editNameSi, setEditNameSi] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editCategory, setEditCategory] = useState<EmergencyServiceContact['category']>('hospital');
  const [editPhone, setEditPhone] = useState('');
  const [editAltPhone, setEditAltPhone] = useState('');
  const [editIsNational, setEditIsNational] = useState(false);
  const [editDistrict, setEditDistrict] = useState('කොළඹ');
  const [editAddress, setEditAddress] = useState('');
  const [editDescSi, setEditDescSi] = useState('');

  // Selected contact inspector for view reports
  const [inspectContact, setInspectContact] = useState<EmergencyServiceContact | null>(null);

  // Success message
  const [feedback, setFeedback] = useState<string | null>(null);

  const refreshData = () => {
    setContacts(getStoredEmergencyContacts(true));
    setAlerts(getEmergencyAdminAlerts());
  };

  const flaggedContacts = useMemo(() => {
    return contacts.filter((c) => c.isInactiveDeactivated || (c.reportedInactiveCount && c.reportedInactiveCount > 0));
  }, [contacts]);

  const communityContacts = useMemo(() => {
    return contacts.filter((c) => c.submittedByUserId || c.id.startsWith('custom_emg_'));
  }, [contacts]);

  const pendingAlerts = useMemo(() => {
    return alerts.filter((a) => !a.isResolved);
  }, [alerts]);

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

  const filteredList = useMemo(() => {
    let list: EmergencyServiceContact[] = [];
    if (activeSubTab === 'flagged') {
      list = flaggedContacts;
    } else if (activeSubTab === 'community') {
      list = communityContacts;
    } else {
      list = contacts;
    }

    return list.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (selectedDistrict !== 'all') {
        if (!item.isNational && item.district !== selectedDistrict) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (item.serviceNameSi || '').toLowerCase().includes(q) || (item.serviceNameEn || '').toLowerCase().includes(q);
        const matchesPhone = (item.phone || '').includes(q) || (item.altPhone && item.altPhone.includes(q));
        const matchesSubmitter = (item.submittedByUserName || '').toLowerCase().includes(q) || (item.submittedByUserPhone || '').includes(q);
        const matchesAddress = (item.address || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesSubmitter && !matchesAddress) {
          return false;
        }
      }
      return true;
    });
  }, [contacts, flaggedContacts, communityContacts, activeSubTab, selectedCategory, selectedDistrict, searchQuery]);

  const handleOpenAddNew = () => {
    setIsAddingNew(true);
    setEditingContact(null);
    setEditNameSi('');
    setEditNameEn('');
    setEditCategory('hospital');
    setEditPhone('');
    setEditAltPhone('');
    setEditIsNational(false);
    setEditDistrict('කොළඹ');
    setEditAddress('');
    setEditDescSi('');
  };

  const handleOpenEdit = (contact: EmergencyServiceContact) => {
    setEditingContact(contact);
    setIsAddingNew(false);
    setEditNameSi(contact.serviceNameSi);
    setEditNameEn(contact.serviceNameEn || '');
    setEditCategory(contact.category);
    setEditPhone(contact.phone);
    setEditAltPhone(contact.altPhone || '');
    setEditIsNational(contact.isNational || false);
    setEditDistrict(contact.district || 'කොළඹ');
    setEditAddress(contact.address || '');
    setEditDescSi(contact.descriptionSi || '');
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameSi.trim() || !editPhone.trim()) {
      alert('කරුණාකර නම සහ දුරකථන අංකය ඇතුළත් කරන්න.');
      return;
    }

    const nowIso = new Date().toISOString();
    const nowReadable = nowIso.replace('T', ' ').slice(0, 16);

    const contactToSave: EmergencyServiceContact = {
      id: editingContact ? editingContact.id : `custom_emg_${Date.now()}`,
      serviceNameSi: editNameSi.trim(),
      serviceNameEn: editNameEn.trim() || editNameSi.trim(),
      category: editCategory,
      phone: editPhone.trim(),
      altPhone: editAltPhone.trim() || undefined,
      isNational: editIsNational,
      district: editIsNational ? undefined : editDistrict,
      address: editAddress.trim() || undefined,
      descriptionSi: editDescSi.trim() || undefined,
      submittedByUserId: editingContact ? editingContact.submittedByUserId : 'ADMIN',
      submittedByUserName: editingContact ? editingContact.submittedByUserName : 'පරිපාලක (Admin)',
      submittedByUserPhone: editingContact ? editingContact.submittedByUserPhone : '',
      submittedAt: editingContact ? editingContact.submittedAt : nowReadable,
      submittedAtMs: editingContact ? editingContact.submittedAtMs : Date.now(),
      reportedInactiveCount: editingContact ? editingContact.reportedInactiveCount : 0,
      reportedInactiveUserIds: editingContact ? editingContact.reportedInactiveUserIds : [],
      reportedInactiveDetails: editingContact ? editingContact.reportedInactiveDetails : [],
      isInactiveDeactivated: false,
      adminStatus: 'active',
    };

    saveCustomEmergencyContact(contactToSave);
    refreshData();
    setIsAddingNew(false);
    setEditingContact(null);
    setFeedback('හදිසි සේවා අංකය සාර්ථකව සුරකින ලදී.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleReactivate = (contactId: string) => {
    adminReactivateEmergencyContact(contactId);
    refreshData();
    setFeedback('අංකය සාර්ථකව නැවත සක්‍රීය කරන ලදී.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDelete = (contactId: string) => {
    deleteCustomEmergencyContact(contactId);
    refreshData();
    setFeedback('අංකය නාමාවලියෙන් ඉවත් කරන ලදී.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleResolveAlert = (alertId: string) => {
    markEmergencyAdminAlertResolved(alertId);
    refreshData();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
            <PhoneCall className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                හදිසි සේවා අංක නාමාවලි පරිපාලනය (Emergency Directory Admin)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black uppercase tracking-wider">
                ADMIN CONTROL
              </span>
            </div>
            <p className="text-xs text-emerald-200/90 mt-1">
              ප්‍රජා සාමාජිකයින් විසින් එක්කළ අංක, පරිශීලක අක්‍රීය වාර්තා (3-Report Deactivations) සහ රාජ්‍ය අංක කළමනාකරණය
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddNew}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ නව හදිසි අංකයක් එක්කරන්න</span>
        </button>
      </div>

      {/* Flagged Emergency Notification Banner if any deactivated */}
      {flaggedContacts.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/15 border-2 border-rose-500/60 rounded-3xl flex items-center justify-between gap-3 shadow-md animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <span>පරිශීලකයින් විසින් ක්‍රියා විරහිත බවට වාර්තා කළ අංක {flaggedContacts.length} ක් පවතී!</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                පරිශීලකයින් 3 දෙනෙකු විසින් අංක ක්‍රියා විරහිත බව තහවුරු කළ විට ඒවා පොදු ලැයිස්තුවෙන් ඉවත් වේ. කරුණාකර පහතින් පරීක්ෂා කර නැවත සක්‍රීය කරන්න හෝ ඉවත් කරන්න.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSubTab('flagged')}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shrink-0 cursor-pointer shadow-sm"
          >
            වාර්තා පරීක්ෂා කරන්න ({flaggedContacts.length})
          </button>
        </div>
      )}

      {/* Feedback notice */}
      {feedback && (
        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 text-slate-500 hover:text-slate-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#071911] border-2 border-emerald-200 dark:border-emerald-900/60 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">මුළු හදිසි අංක</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
            {contacts.length}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">සක්‍රීය හා ලියාපදිංචි</div>
        </div>

        <div className="bg-white dark:bg-[#071911] border-2 border-amber-300 dark:border-amber-900/60 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">සාමාජිකයින් එක්කළ අංක</div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-0.5">
            {communityContacts.length}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-1 flex items-center gap-1">
            <Coins className="w-3 h-3" />
            <span>Rs. {communityContacts.length * 2}.00 Cr ත්‍යාග ගෙවා ඇත</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#071911] border-2 border-rose-300 dark:border-rose-900/60 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">අක්‍රීය බවට වාර්තා වූ (Flagged)</div>
          <div className="text-2xl font-black text-rose-600 font-mono mt-0.5">
            {flaggedContacts.length}
          </div>
          <div className="text-[10px] text-rose-600 font-bold mt-1">3-Reports Deactivated</div>
        </div>

        <div className="bg-white dark:bg-[#071911] border-2 border-blue-200 dark:border-blue-900/60 p-4 rounded-2xl shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">නොවිසඳූ දැනුම්දීම් (Alerts)</div>
          <div className="text-2xl font-black text-blue-600 font-mono mt-0.5">
            {pendingAlerts.length}
          </div>
          <div className="text-[10px] text-blue-600 font-bold mt-1">පරිපාලක අවධානයට</div>
        </div>
      </div>

      {/* Sub-Tabs Control */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveSubTab('flagged')}
          className={`flex items-center gap-2 px-4 py-2.5 font-black text-xs rounded-t-xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeSubTab === 'flagged'
              ? 'bg-white dark:bg-[#071911] border-rose-500 text-rose-700 dark:text-rose-300 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-900/50 border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>අක්‍රීය වාර්තා (Flagged Inactive)</span>
          {flaggedContacts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
              {flaggedContacts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('community')}
          className={`flex items-center gap-2 px-4 py-2.5 font-black text-xs rounded-t-xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeSubTab === 'community'
              ? 'bg-white dark:bg-[#071911] border-amber-500 text-amber-800 dark:text-amber-300 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-900/50 border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Coins className="w-4 h-4 text-amber-600" />
          <span>සාමාජිකයින් එක්කළ අංක (Community Added)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-black">
            {communityContacts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 font-black text-xs rounded-t-xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeSubTab === 'all'
              ? 'bg-white dark:bg-[#071911] border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-900/50 border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4 text-emerald-600" />
          <span>සියලුම හදිසි අංක (All Directory)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-black">
            {contacts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2.5 font-black text-xs rounded-t-xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeSubTab === 'alerts'
              ? 'bg-white dark:bg-[#071911] border-blue-500 text-blue-800 dark:text-blue-300 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-900/50 border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Flag className="w-4 h-4 text-blue-600" />
          <span>දැනුම්දීම් ඉතිහාසය (Admin Alerts)</span>
          {pendingAlerts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black">
              {pendingAlerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Filter & Search Bar */}
      {activeSubTab !== 'alerts' && (
        <div className="p-3 bg-slate-50 dark:bg-[#071911] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="සේවාව, දුරකථන අංකය, ලිපිනය හෝ එක්කළ සාමාජිකයා අනුව සොයන්න..."
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#092217] border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#092217] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            >
              <option value="all">සියලු කාණ්ඩ (All Categories)</option>
              <option value="hospital">🏥 රෝහල්</option>
              <option value="ambulance">🚑 ගිලන්රථ</option>
              <option value="police">👮 පොලිසිය</option>
              <option value="fire">🚒 ගිනි නිවන</option>
              <option value="disaster">🌊 ආපදා</option>
              <option value="helpline">🛡️ උපකාරක සේවා</option>
              <option value="utilities">⚡ ජල/විදුලි</option>
            </select>

            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#092217] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            >
              <option value="all">සියලු දිස්ත්‍රික්ක (All Districts)</option>
              {districtsList.filter((d) => d !== 'all').map((d) => (
                <option key={d} value={d}>
                  {d} දිස්ත්‍රික්කය
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Alerts View */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              කිසිදු හදිසි සේවා දැනුම්දීමක් වාර්තා වී නැත.
            </div>
          ) : (
            alerts.map((alertItem) => (
              <div
                key={alertItem.id}
                className={`p-4 rounded-2xl border transition-all ${
                  alertItem.isResolved
                    ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70'
                    : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                        {alertItem.type}
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {alertItem.serviceNameSi} ({alertItem.phone})
                      </h4>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      {alertItem.message}
                    </p>
                    <div className="text-[10px] text-slate-400 flex items-center gap-3">
                      <span>දිනය: {alertItem.createdAt}</span>
                      <span>වාර්තා ගණන: {alertItem.reportedUsersCount}</span>
                      {alertItem.submitterUserName && (
                        <span>මුල් එක්කළ අය: {alertItem.submitterUserName}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!alertItem.isResolved ? (
                      <button
                        onClick={() => handleResolveAlert(alertItem.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                      >
                        ✓ විසඳූ බව සලකුණු කරන්න
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>විසඳන ලදී</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Contact Cards List */}
      {activeSubTab !== 'alerts' && (
        <div className="space-y-3">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              කිසිදු හදිසි අංකයක් හමුවූයේ නැත.
            </div>
          ) : (
            filteredList.map((contact) => {
              const isFlagged = contact.isInactiveDeactivated || (contact.reportedInactiveCount && contact.reportedInactiveCount > 0);
              const isCommunity = !!contact.submittedByUserId || contact.id.startsWith('custom_emg_');

              return (
                <div
                  key={contact.id}
                  className={`p-4 bg-white dark:bg-[#071911] border-2 rounded-2xl shadow-xs transition-all ${
                    contact.isInactiveDeactivated
                      ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20'
                      : isFlagged
                      ? 'border-amber-300 bg-amber-50/20 dark:bg-amber-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left: Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {contact.serviceNameSi}
                        </h3>
                        {contact.serviceNameEn && (
                          <span className="text-xs text-slate-400 font-medium">
                            ({contact.serviceNameEn})
                          </span>
                        )}

                        {contact.isNational ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300">
                            ජාතික සේවාව
                          </span>
                        ) : contact.district ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold border border-blue-300">
                            {contact.district}
                          </span>
                        ) : null}

                        {contact.isInactiveDeactivated && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black animate-pulse">
                            ⚠️ අක්‍රීයයි (Deactivated - 3 Reports)
                          </span>
                        )}

                        {isCommunity && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-[10px] font-bold border border-amber-300 flex items-center gap-1">
                            <Coins className="w-2.5 h-2.5 text-amber-600" />
                            <span>සාමාජික දායකත්වය (+2 Cr)</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono font-bold flex-wrap">
                        <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{contact.phone}</span>
                        </span>
                        {contact.altPhone && (
                          <span className="text-slate-500">
                            විකල්ප: {contact.altPhone}
                          </span>
                        )}
                        {contact.address && (
                          <span className="text-slate-400 font-sans font-normal">
                            📍 {contact.address}
                          </span>
                        )}
                      </div>

                      {contact.descriptionSi && (
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {contact.descriptionSi}
                        </p>
                      )}

                      {/* Submitter details */}
                      {isCommunity && (
                        <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-950 dark:text-amber-200 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-3.5 h-3.5 text-amber-600" />
                            <span>
                              <strong>එක්කළ සාමාජිකයා:</strong> {contact.submittedByUserName || 'පරිශීලක'}
                              {contact.submittedByUserPhone ? ` (${contact.submittedByUserPhone})` : ''}
                            </span>
                            <span className="text-slate-400">• {contact.submittedAt || 'මෑතකදී'}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-black">
                            ✓ +2.00 Credits ත්‍යාගය හිමිවිය
                          </span>
                        </div>
                      )}

                      {/* Inactive Reports Details */}
                      {contact.reportedInactiveDetails && contact.reportedInactiveDetails.length > 0 && (
                        <div className="p-2.5 bg-rose-50/80 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-[11px] text-rose-950 dark:text-rose-200 space-y-1">
                          <div className="font-bold flex items-center gap-1 text-rose-700 dark:text-rose-300">
                            <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />
                            <span>ක්‍රියා විරහිත බවට ලැබුණු පරිශීලක වාර්තා ({contact.reportedInactiveDetails.length}/3):</span>
                          </div>
                          <div className="space-y-1 pl-4">
                            {contact.reportedInactiveDetails.map((rep, idx) => (
                              <div key={idx} className="text-[10px] text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2">
                                <span>• <strong>{rep.userName}</strong> ({rep.userPhone || 'No phone'}): {rep.reason}</span>
                                <span className="text-slate-400">{rep.timestamp}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                      {contact.isInactiveDeactivated && (
                        <button
                          type="button"
                          onClick={() => handleReactivate(contact.id)}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                          title="නැවත සක්‍රීය කරන්න"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>නැවත සක්‍රීය කරන්න</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(contact)}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs transition-all active:scale-95 cursor-pointer"
                        title="සංස්කරණය කරන්න"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {contact.id.startsWith('custom_emg_') && (
                        <button
                          type="button"
                          onClick={() => handleDelete(contact.id)}
                          className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/80 hover:bg-red-200 text-red-600 text-xs transition-all active:scale-95 cursor-pointer"
                          title="ස්ථිරවම ඉවත් කරන්න"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Edit / Add Modal */}
      {(isAddingNew || editingContact) && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-[#071911] border-2 border-emerald-500 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-emerald-900">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{isAddingNew ? 'නව හදිසි අංකයක් එක් කිරීම' : 'හදිසි අංකය සංස්කරණය'}</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingContact(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  සේවාවේ නම (සිංහලෙන්) *
                </label>
                <input
                  type="text"
                  required
                  value={editNameSi}
                  onChange={(e) => setEditNameSi(e.target.value)}
                  placeholder="උදා: හෝමාගම මූලික රෝහල"
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Service Name (English)
                </label>
                <input
                  type="text"
                  value={editNameEn}
                  onChange={(e) => setEditNameEn(e.target.value)}
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
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
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
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="උදා: 0112855224"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    විකල්ප අංකය
                  </label>
                  <input
                    type="tel"
                    value={editAltPhone}
                    onChange={(e) => setEditAltPhone(e.target.value)}
                    placeholder="උදා: 0112855225"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    දිස්ත්‍රික්කය
                  </label>
                  <select
                    disabled={editIsNational}
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl disabled:opacity-50"
                  >
                    {districtsList.filter((d) => d !== 'all').map((d) => (
                      <option key={d} value={d}>
                        {d} දිස්ත්‍රික්කය
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="editIsNationalCheck"
                  checked={editIsNational}
                  onChange={(e) => setEditIsNational(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="editIsNationalCheck" className="font-bold text-slate-700 dark:text-slate-300">
                  මෙය ජාතික මට්ටමේ සේවාවකි (All-Island Service)
                </label>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ලිපිනය / ස්ථානය
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="උදා: හෝමාගම"
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  සේවා විස්තරය (Description)
                </label>
                <textarea
                  rows={2}
                  value={editDescSi}
                  onChange={(e) => setEditDescSi(e.target.value)}
                  placeholder="සේවාව පිළිබඳ කෙටි විස්තරයක්..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#05140d] border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingContact(null);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md"
                >
                  සුරකින්න (Save Contact)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
