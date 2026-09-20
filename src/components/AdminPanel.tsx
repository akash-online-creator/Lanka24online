import React, { useState, useMemo } from 'react';
import { 
  User, 
  Issue, 
  Language, 
  HelpPost, 
  BlockedCredential, 
  UserStatus, 
  RegistrationConfig, 
  CategoryItem, 
  CustomFormField, 
  TagItem,
  BloodDonationRequest,
  VolunteerDonor,
  DisasterReliefItem,
  BloodGroup,
  RedAlertItem
} from '../types';
import { translations } from '../data/translations';
import { initialRegistrationConfig, initialCategories } from '../data/initialData';
import { AppLogo } from './AppLogo';
import { MemoryStorageBar } from './MemoryStorageBar';
import { generateAndDownloadUserPdf } from '../utils/pdfGenerator';
import { 
  fetchAllPostsBackupData, 
  restorePostsBackupData, 
  syncUserProfileToFirestore,
  updateHelpPostInFirestore,
  sendChatMessageToFirestore
} from '../lib/firebase';
import { AdminModerationModal } from './AdminModerationModal';
import { 
  getStoredTags, 
  saveTagsToStorage, 
  addTagToStorage, 
  updateTagInStorage, 
  deleteTagFromStorage, 
  purgeUnusedTagsFromStorage 
} from '../utils/tagUtils';
import {
  getStoredBloodRequests,
  saveBloodRequestsToStorage,
  getStoredVolunteerDonors,
  saveVolunteerDonorsToStorage,
  getStoredDisasterReliefItems,
  saveDisasterReliefItemsToStorage
} from '../data/bloodAndDisasterData';
import {
  addDeletedBloodId,
  addDeletedDisasterId,
  addDeletedDonorId,
  addDeletedPostId,
  removeDeletedPostId
} from '../utils/deletedPostsManager';
import { 
  Shield, 
  ShieldAlert,
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  MessageCircle,
  Search, 
  Sparkles, 
  UserCheck, 
  Eye, 
  Ban, 
  Edit, 
  Trash2, 
  Globe, 
  Phone, 
  Mail, 
  Lock, 
  Save, 
  FileText,
  UserX,
  MapPin,
  Calendar,
  AlertTriangle,
  Plus,
  Layers,
  Settings,
  ListPlus,
  Navigation,
  ExternalLink,
  Compass,
  Smartphone,
  KeyRound,
  Copy,
  Tag,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Download,
  FileDown,
  Loader2,
  Image as ImageIcon,
  RefreshCw,
  CreditCard,
  UserCheck2,
  Database,
  X,
  Coins,
  PhoneCall,
  BookOpen,
  Heart,
  Droplet,
  Waves,
  Building,
  Check,
  Users,
  HeartHandshake,
  Activity,
  Package,
  Share2,
  SlidersHorizontal,
  HelpCircle,
  Key
} from 'lucide-react';
import { AdminCreditManagement } from './AdminCreditManagement';
import { AdminEmergencyDirectoryManagement } from './AdminEmergencyDirectoryManagement';
import { AdminSearchDictionaryManager } from './AdminSearchDictionaryManager';
import { AdminRedAlertManagement } from './AdminRedAlertManagement';
import { getEmergencyAdminAlerts, getStoredEmergencyContacts } from '../data/emergencyDirectory';

interface AdminPanelProps {
  users: User[];
  issues: Issue[];
  helpPosts?: HelpPost[];
  blockedCredentials?: BlockedCredential[];
  registrationConfig?: RegistrationConfig;
  onUpdateRegistrationConfig?: (config: RegistrationConfig) => void;
  categories?: CategoryItem[];
  onUpdateCategories?: (categories: CategoryItem[]) => void;
  tags?: TagItem[];
  onUpdateTags?: (tags: TagItem[]) => void;
  redAlerts?: RedAlertItem[];
  onRefreshRedAlerts?: () => void;
  onViewRedAlertDetail?: (alert: RedAlertItem) => void;
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string, reason?: string) => void;
  onUpdateUser?: (updatedUser: User) => void;
  onBlockUser?: (userId: string, reason: string) => void;
  onUnblockCredential?: (id: string) => void;
  onDeletePost?: (postId: string) => void;
  onPermanentDeletePost?: (postId: string) => void;
  onRestorePost?: (postId: string) => void;
  onUpdatePost?: (updatedPost: HelpPost) => void;
  onRestoreAllPosts?: (posts: HelpPost[]) => void;
  onReplyIssue: (issueId: string, reply: string, resolve: boolean) => void;
  onSeedDemoData: () => void;
  language: Language;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  users = [],
  issues = [],
  helpPosts = [],
  blockedCredentials = [],
  registrationConfig,
  onUpdateRegistrationConfig,
  categories = initialCategories,
  onUpdateCategories,
  tags,
  onUpdateTags,
  onApproveUser,
  onRejectUser,
  onUpdateUser,
  onBlockUser,
  onUnblockCredential,
  onDeletePost,
  onPermanentDeletePost,
  onRestorePost,
  onUpdatePost,
  onRestoreAllPosts,
  onReplyIssue,
  onSeedDemoData,
  language,
  redAlerts = [],
  onRefreshRedAlerts,
  onViewRedAlertDetail,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<
    'pending' | 'profile_updates' | 'issues' | 'all_users' | 'blocked_list' | 'registration_edit' | 'categories_edit' | 'posts_edit' | 'tags_edit' | 'credits' | 'emergency_directory' | 'search_dictionary' | 'red_alerts'
  >('pending');
  
  // High-Clarity Photo Inspector State
  interface PhotoInspectorState {
    userName: string;
    userId?: string;
    nicNumber?: string;
    facePhotoUrl?: string;
    nicFrontPhotoUrl?: string;
    nicBackPhotoUrl?: string;
    activeType: 'face' | 'nicFront' | 'nicBack';
    zoom: number;
    rotation: number;
  }
  const [photoInspector, setPhotoInspector] = useState<PhotoInspectorState | null>(null);

  const openInspectorForUser = (
    user: User,
    activeType: 'face' | 'nicFront' | 'nicBack' = 'nicFront'
  ) => {
    setPhotoInspector({
      userName: user.name,
      userId: user.userId,
      nicNumber: user.nicNumber,
      facePhotoUrl: (user.facePhotoUrl && user.facePhotoUrl.trim() !== '') ? user.facePhotoUrl : user.photoUrl,
      nicFrontPhotoUrl: (user.nicFrontPhotoUrl && user.nicFrontPhotoUrl.trim() !== '') ? user.nicFrontPhotoUrl : user.idCardPhotoUrl,
      nicBackPhotoUrl: user.nicBackPhotoUrl,
      activeType,
      zoom: 1,
      rotation: 0,
    });
  };

  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');

  // Detailed Modal for User Editing & Posts View
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);
  const [modalSubTab, setModalSubTab] = useState<'profile' | 'posts'>('profile');
  const [editingUserForm, setEditingUserForm] = useState<Partial<User>>({});
  const [blockReasonInput, setBlockReasonInput] = useState('අනිසි භාවිතය සහ විධාන කඩකිරීම (Policy Violation)');

  // Registration Text Edit State
  const [regEditLang, setRegEditLang] = useState<Language>('si');
  const [regState, setRegState] = useState<RegistrationConfig>(
    () => registrationConfig || initialRegistrationConfig
  );

  // Category & Dynamic Forms State
  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>(
    () => categories || initialCategories
  );
  const [selectedCatForFields, setSelectedCatForFields] = useState<string>(
    categories?.[0]?.id || 'quick_services'
  );

  // Posts Management State
  const [postSearchQuery, setPostSearchQuery] = useState('');
  const [adminPostFilter, setAdminPostFilter] = useState<'all' | 'active' | 'flagged' | 'deleted'>('all');
  const [adminPostCategoryFilter, setAdminPostCategoryFilter] = useState<string>('all');
  
  // Blood, Disaster, Donors Data States
  const [bloodRequests, setBloodRequests] = useState<BloodDonationRequest[]>(() => getStoredBloodRequests());
  const [disasterItems, setDisasterItems] = useState<DisasterReliefItem[]>(() => getStoredDisasterReliefItems());
  const [volunteerDonors, setVolunteerDonors] = useState<VolunteerDonor[]>(() => getStoredVolunteerDonors());

  const [adminActionNotification, setAdminActionNotification] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Tag Management State
  const [tagItems, setTagItems] = useState<TagItem[]>(() => tags || getStoredTags());

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const usersWithPendingProfileUpdates = users.filter(
    (u) => u.pendingProfileUpdate && u.pendingProfileUpdate.status === 'pending'
  );
  const approvedUsers = users.filter((u) => u.status === 'approved');
  const blockedUsers = users.filter((u) => u.status === 'blocked');
  const pendingIssues = issues.filter((i) => i.status !== 'resolved');

  const emergencyAlerts = useMemo(() => getEmergencyAdminAlerts().filter(a => !a.isResolved), [activeTab]);
  const emergencyFlagged = useMemo(() => getStoredEmergencyContacts(true).filter(c => c.isInactiveDeactivated), [activeTab]);
  const totalEmergencyBadge = emergencyAlerts.length + emergencyFlagged.length;

  // Helper to format Sri Lankan phone number for WhatsApp
  const formatPhoneForWhatsApp = (rawPhone?: string): string => {
    if (!rawPhone) return '';
    let cleaned = rawPhone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '94' + cleaned.slice(1);
    } else if (cleaned.length === 9) {
      cleaned = '94' + cleaned;
    }
    return cleaned;
  };

  // Function 1: Reset Password Feature for Admin
  const handleResetUserPassword = async (user: User) => {
    const confirmReset = window.confirm(`ඔබට ${user.name} සඳහා මුරපදය නැවත සැකසීමට (Reset Password) අවශ්‍යද?`);
    if (!confirmReset) return;

    // Generate a secure 6-digit random temporary password
    const newTempPassword = Math.floor(100000 + Math.random() * 900000).toString();

    const updatedUser: User = {
      ...user,
      securityCode: newTempPassword,
      tempCode: newTempPassword,
      key: newTempPassword,
      isPasswordChanged: false,
    };

    // 1. Call Backend API to synchronize Firebase Auth password
    try {
      await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          nicNumber: user.nicNumber || user.userId,
          newPassword: newTempPassword,
        }),
      });
    } catch (err) {
      console.warn('Backend API password reset call error:', err);
    }

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    // Save to local storage
    const savedUsers = localStorage.getItem('sahaya_users');
    if (savedUsers) {
      try {
        const usersList: User[] = JSON.parse(savedUsers);
        const newUsersList = usersList.map((u) => (u.id === updatedUser.id ? updatedUser : u));
        localStorage.setItem('sahaya_users', JSON.stringify(newUsersList));
      } catch (err) {
        console.warn('User update error:', err);
      }
    }

    if (selectedUserForModal && selectedUserForModal.id === user.id) {
      setSelectedUserForModal(updatedUser);
    }

    // Prepare WhatsApp message
    const rawPhone = user.whatsappNumber || user.phone || '';
    const formattedPhone = formatPhoneForWhatsApp(rawPhone);
    const loginId = user.userId || user.nicNumber || user.phone || '';

    const messageText = `🔑 *සහය සේවා (Sahaya Seva) - මුරපදය නැවත සැකසීම (Password Reset)*\n\n` +
      `ඔබගේ ගිණුමේ මුරපදය පරිපාලක විසින් සාර්ථකව නැවත සකසන ලදී.\n\n` +
      `👤 *නම:* ${user.name}\n` +
      `🆔 *User ID / NIC:* ${loginId}\n` +
      `🔑 *නව තාවකාලික මුරපදය (New Password):* ${newTempPassword}\n\n` +
      `🌐 කරුණාකර මෙම නව මුරපදය භාවිතයෙන් ඇප් එකට Log in වී ඔබගේ රහස්‍යභාවය සඳහා නව මුරපදයක් සකසා ගන්න.\n` +
      `ස්තූතියි! - *සහය සේවා පරිපාලන කණ්ඩායම*`;

    if (formattedPhone) {
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }

    setAdminActionNotification(`🔑 ${user.name} ගේ මුරපදය සාර්ථකව Reset කරන ලදී! නව මුරපදය: ${newTempPassword}`);
    setTimeout(() => setAdminActionNotification(null), 8000);
  };

  // Function 2: Save User Edit without affecting Password
  const handleSaveUserEdit = () => {
    if (!selectedUserForModal || !onUpdateUser) return;

    // Explicitly exclude any password attributes from the edit form
    const { securityCode, tempCode, key, ...safeEditFields } = editingUserForm as any;

    const updated: User = {
      ...selectedUserForModal,
      ...safeEditFields,
      // Retain existing password credentials unchanged
      securityCode: selectedUserForModal.securityCode,
      tempCode: selectedUserForModal.tempCode,
      key: selectedUserForModal.key,
    };

    onUpdateUser(updated);
    setSelectedUserForModal(updated);

    const savedUsers = localStorage.getItem('sahaya_users');
    if (savedUsers) {
      try {
        const usersList: User[] = JSON.parse(savedUsers);
        const newUsersList = usersList.map((u) => (u.id === updated.id ? updated : u));
        localStorage.setItem('sahaya_users', JSON.stringify(newUsersList));
      } catch (err) {
        console.warn('Update error:', err);
      }
    }

    alert('පරිශීලක තොරතුරු සාර්ථකව යාවත්කාලීන කෙරිණි! (මුරපදය වෙනස් නොවීය)');
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.nicNumber.includes(searchQuery) ||
      u.phone.includes(searchQuery) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      userStatusFilter === 'all' || u.status === userStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full max-w-6xl mx-auto py-4 space-y-6">
      {/* Top Banner Stats */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 rounded-3xl p-6 shadow-xl border-2 border-emerald-400/40 text-white">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <AppLogo size="md" showGlow animated />
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <span>{t.adminDashboard}</span>
                <span className="text-xs bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase font-mono shadow-sm">
                  LIVE CONTROLLER
                </span>
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                සහය සේවා (Sahaya Seva) • පරිශීලක කළමනාකරණය, ආරක්ෂාව සහ පාලන මධ්‍යස්ථානය
              </p>
            </div>
          </div>
        </div>

        {/* Quick Numbers Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white/95 text-slate-900 border-2 border-amber-300 p-3.5 rounded-2xl shadow-md">
            <div className="text-[10px] uppercase tracking-wider text-amber-800 font-black mb-1">
              පොරොත්තු අනුමැති
            </div>
            <div className="text-2xl font-black text-amber-900 font-mono">
              {pendingUsers.length}
            </div>
          </div>

          <div className="bg-white/95 text-slate-900 border-2 border-teal-300 p-3.5 rounded-2xl shadow-md">
            <div className="text-[10px] uppercase tracking-wider text-teal-800 font-black mb-1">
              වාර්තා වූ ගැටලු
            </div>
            <div className="text-2xl font-black text-teal-900 font-mono">
              {pendingIssues.length}
            </div>
          </div>

          <div className="bg-white/95 text-slate-900 border-2 border-emerald-300 p-3.5 rounded-2xl shadow-md">
            <div className="text-[10px] uppercase tracking-wider text-emerald-800 font-black mb-1">
              සක්‍රීය පරිශීලකයන්
            </div>
            <div className="text-2xl font-black text-emerald-900 font-mono">
              {approvedUsers.length}
            </div>
          </div>

          <div className="bg-white/95 text-slate-900 border-2 border-rose-300 p-3.5 rounded-2xl shadow-md">
            <div className="text-[10px] uppercase tracking-wider text-rose-800 font-black mb-1">
              Block කළ ගිණුම්
            </div>
            <div className="text-2xl font-black text-rose-900 font-mono">
              {blockedUsers.length || blockedCredentials.length}
            </div>
          </div>

          <div className="bg-white/95 text-slate-900 border-2 border-slate-200 p-3.5 rounded-2xl shadow-md">
            <div className="text-[10px] uppercase tracking-wider text-slate-700 font-black mb-1">
              මුළු ලියාපදිංචි
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {users.length}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Action Notification Alert */}
      {adminActionNotification && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-5 py-3.5 rounded-2xl shadow-xl border-2 border-emerald-300 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs font-black">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{adminActionNotification}</span>
          </div>
          <button
            onClick={() => setAdminActionNotification(null)}
            className="text-white/80 hover:text-white font-bold text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b-2 border-emerald-200 gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-white border-emerald-500 text-emerald-900 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-slate-700 hover:bg-emerald-100'
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>{t.pendingApprovalsTab}</span>
        </button>

        <button
          onClick={() => setActiveTab('all_users')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'all_users'
              ? 'bg-white border-emerald-500 text-emerald-900 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-slate-700 hover:bg-emerald-100'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>පරිශීලක ලැයිස්තුව (Users Directory)</span>
        </button>
      </div>

      {/* Tab: All Users (Users Directory - WITHOUT PASSWORD COLUMN) */}
      {activeTab === 'all_users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-2xl border-2 border-emerald-200 shadow-sm">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="නම, User ID, NIC හෝ දුරකථන අංකයෙන් සෝයන්න..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold focus:outline-none bg-transparent"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">තත්ත්වය:</span>
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">සියලුම පරිශීලකයන්</option>
                <option value="approved">අනුමත (Approved)</option>
                <option value="pending">පොරොත්තු (Pending)</option>
                <option value="blocked">අවහිර කළ (Blocked)</option>
              </select>
            </div>
          </div>

          {/* Users Table WITHOUT Password Column */}
          <div className="bg-white rounded-3xl border-2 border-emerald-200 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black border-b-2 border-slate-200 uppercase tracking-wider">
                    <th className="p-3.5">පරිශීලක (User Details)</th>
                    <th className="p-3.5">ID / NIC</th>
                    <th className="p-3.5">දුරකථන අංකය</th>
                    <th className="p-3.5">තත්ත්වය (Status)</th>
                    <th className="p-3.5 text-center">ක්‍රියාමාර්ග (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
                        පරිශීලකයන් හමු නොවිණි.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 overflow-hidden shrink-0 flex items-center justify-center font-black text-emerald-900">
                              {user.photoUrl ? (
                                <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                user.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900">{user.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-700">
                          <div>ID: {user.userId}</div>
                          <div className="text-[10px] text-slate-500">NIC: {user.nicNumber}</div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-800">
                          {user.phone}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            user.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : user.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Reset Password Button */}
                            <button
                              type="button"
                              onClick={() => handleResetUserPassword(user)}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                              title="මුරපදය නැවත සකස් කරන්න (Reset Password)"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-700" />
                              <span>Reset Password</span>
                            </button>

                            {/* View / Edit Modal Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserForModal(user);
                                setEditingUserForm({ ...user });
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit / View</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Edit Modal - WITHOUT Password Fields */}
      {selectedUserForModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border-2 border-emerald-400 shadow-2xl p-6 space-y-5 animate-scaleUp my-8">
            <div className="flex justify-between items-center border-b pb-3 border-slate-200">
              <div className="flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-black text-slate-900">
                  පරිශීලක සංස්කරණය (User Profile Editor)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields WITHOUT Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">සම්පූර්ණ නම (Full Name):</label>
                <input
                  type="text"
                  value={editingUserForm.name || ''}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block mb-1">ජාතික හැඳුනුම්පත් අංකය (NIC):</label>
                <input
                  type="text"
                  value={editingUserForm.nicNumber || ''}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, nicNumber: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block mb-1">දුරකථන අංකය (Phone):</label>
                <input
                  type="text"
                  value={editingUserForm.phone || ''}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block mb-1">WhatsApp අංකය:</label>
                <input
                  type="text"
                  value={editingUserForm.whatsappNumber || ''}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, whatsappNumber: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block mb-1">ලිපිනය (Address):</label>
                <input
                  type="text"
                  value={editingUserForm.address || ''}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block mb-1">ගිණුමේ තත්ත්වය (Account Status):</label>
                <select
                  value={editingUserForm.status || 'approved'}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, status: e.target.value as UserStatus })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="approved">Approved (අනුමතයි)</option>
                  <option value="pending">Pending (පොරොත්තු)</option>
                  <option value="blocked">Blocked (අවහිරයි)</option>
                </select>
              </div>
            </div>

            {/* Note confirming Password safety */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-[11px] text-amber-900 font-semibold flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ආරක්ෂිතයි: මෙහිදී වෙනස්කම් සුරැකීමේදී පරිශීලකයාගේ මුරපදයට බලපෑමක් සිදු නොවේ.</span>
              </span>

              <button
                type="button"
                onClick={() => handleResetUserPassword(selectedUserForModal)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-xl font-extrabold text-[11px] shrink-0 transition-all cursor-pointer shadow-sm"
              >
                🔑 Reset Password
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedUserForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs"
              >
                අවලංගු කරන්න
              </button>
              <button
                type="button"
                onClick={handleSaveUserEdit}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
              >
                වෙනස්කම් සුරකින්න (Save Changes)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
