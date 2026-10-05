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
  RedAlertItem,
  AiSecurityScanResult,
  DuplicatePhotoMatch,
  ProfessionalService
} from '../types';
import { translations } from '../data/translations';
import { initialRegistrationConfig, initialCategories } from '../data/initialData';
import { AppLogo } from './AppLogo';
import { MemoryStorageBar } from './MemoryStorageBar';
import { generateAndDownloadUserPdf } from '../utils/pdfGenerator';
import { deduplicateUsers } from '../utils/userUtils';
import { scanUserNicSecurity } from '../utils/aiSecurityScanner';
import { 
  fetchAllPostsBackupData, 
  restorePostsBackupData, 
  syncUserProfileToFirestore,
  syncUserPasswordInFirestore,
  updateHelpPostInFirestore,
  sendChatMessageToFirestore,
  deleteUserAccount,
  deleteHelpPostFromFirestore,
  deleteProfessionalServiceFromFirestore,
  deleteBloodRequestFromFirestore,
  deleteVolunteerDonorFromFirestore,
  deleteDisasterReliefFromFirestore
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
  getStoredProfessionalServices,
  saveProfessionalServicesToStorage
} from '../data/professionalServicesData';
import {
  addDeletedBloodId,
  addDeletedDisasterId,
  addDeletedDonorId,
  addDeletedPostId,
  removeDeletedPostId,
  addDeletedProServiceId,
  addDeletedUserId,
  filterNonDeletedUsers
} from '../utils/deletedPostsManager';
import { broadcastAdminNotification } from '../utils/notificationManager';
import { 
  Shield, 
  ShieldAlert,
  ShieldCheck,
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
  Key,
  Briefcase,
  Megaphone,
  Radio
} from 'lucide-react';
import { AdminIssuesManagement } from './AdminIssuesManagement';
import { AdminCreditManagement } from './AdminCreditManagement';
import { AdminEmergencyDirectoryManagement } from './AdminEmergencyDirectoryManagement';
import { AdminSearchDictionaryManager } from './AdminSearchDictionaryManager';
import { AdminPresenceDashboard } from './AdminPresenceDashboard';
import { AdminRedAlertManagement } from './AdminRedAlertManagement';
import { AdminTrustManagement } from './AdminTrustManagement';
import { getEmergencyAdminAlerts, getStoredEmergencyContacts } from '../data/emergencyDirectory';
import { 
  getUserCreditBalance, 
  getUserCreditTransactions, 
  addCreditByAdmin, 
  deductCreditByAdmin, 
  extractNumericId, 
  ADMIN_ADD_REASON_PRESETS, 
  ADMIN_DEDUCT_REASON_PRESETS 
} from '../utils/creditManager';

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
  onDeleteUser?: (userId: string) => void;
  onBlockUser?: (userId: string, reason: string) => void;
  onUnblockCredential?: (id: string) => void;
  onDeletePost?: (postId: string) => void;
  onPermanentDeletePost?: (postId: string) => void;
  onRestorePost?: (postId: string) => void;
  onUpdatePost?: (updatedPost: HelpPost) => void;
  onRestoreAllPosts?: (posts: HelpPost[]) => void;
  onReplyIssue: (issueId: string, reply: string, resolve: boolean, replyChannel?: 'inbox' | 'sms' | 'whatsapp') => void;
  onSeedDemoData: () => void;
  language: Language;
  onNavigate?: (view: any) => void;
  onSwitchToUserMode?: () => void;
  onResetUserPassword?: (nicNumber: string) => Promise<any>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  users: rawUsers = [],
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
  onDeleteUser,
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
  onNavigate,
  onSwitchToUserMode,
  onResetUserPassword,
}) => {
  const users = useMemo(() => filterNonDeletedUsers(deduplicateUsers(rawUsers)), [rawUsers]);
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<
    'pending' | 'profile_updates' | 'issues' | 'all_users' | 'blocked_list' | 'registration_edit' | 'categories_edit' | 'posts_edit' | 'tags_edit' | 'credits' | 'trust_badges' | 'emergency_directory' | 'search_dictionary' | 'red_alerts' | 'ai_security' | 'live_presence' | 'professional_services' | 'blood_and_disaster'
  >('pending');
  
  // AI Security Scanner States
  const [scanningUsersMap, setScanningUsersMap] = useState<Record<string, boolean>>({});
  const [batchScanning, setBatchScanning] = useState(false);
  const [inspectorScanning, setInspectorScanning] = useState(false);
  const [inspectorScanResult, setInspectorScanResult] = useState<AiSecurityScanResult | null>(null);

  // High-Clarity Photo Inspector State
  interface PhotoInspectorState {
    user: User;
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

  // State for User Deletion Modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const openInspectorForUser = (
    user: User,
    activeType: 'face' | 'nicFront' | 'nicBack' = 'nicFront'
  ) => {
    if (!user) return;
    setInspectorScanResult(user.aiScanResult || null);
    setPhotoInspector({
      user,
      userName: user?.name || 'පරිශීලක',
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
  const [modalSubTab, setModalSubTab] = useState<'profile' | 'posts' | 'credits'>('profile');
  const [editingUserForm, setEditingUserForm] = useState<Partial<User>>({});
  const [blockReasonInput, setBlockReasonInput] = useState('අනිසි භාවිතය සහ විධාන කඩකිරීම (Policy Violation)');
  
  // Modal Credit Adjustment State
  const [modalCreditAmount, setModalCreditAmount] = useState<string>('100');
  const [modalCreditMode, setModalCreditMode] = useState<'add' | 'deduct'>('add');
  const [modalCreditReason, setModalCreditReason] = useState<string>('boc_slip');
  const [modalCreditRemark, setModalCreditRemark] = useState<string>('');
  const [modalCreditNotice, setModalCreditNotice] = useState<string | null>(null);
  const [modalCreditFilter, setModalCreditFilter] = useState<string>('all');
  const [modalCreditSearch, setModalCreditSearch] = useState<string>('');

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
  const [bloodTabSub, setBloodTabSub] = useState<'requests' | 'donors' | 'disaster'>('requests');
  const [bloodSearchQuery, setBloodSearchQuery] = useState('');

  // Professional Services Data States
  const [proServices, setProServices] = useState<ProfessionalService[]>(() => getStoredProfessionalServices());
  const [proSearchQuery, setProSearchQuery] = useState('');
  const [proCategoryFilter, setProCategoryFilter] = useState('all');

  // 📢 Admin Announcement Broadcast Modal State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastBadge, setBroadcastBadge] = useState('ADMIN');
  const [isPublishingBroadcast, setIsPublishingBroadcast] = useState(false);

  const handlePublishAdminAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      alert('කරුණාකර නිවේදනයේ මාතෘකාව සහ විස්තරය ඇතුළත් කරන්න.');
      return;
    }

    setIsPublishingBroadcast(true);
    try {
      broadcastAdminNotification({
        title: broadcastTitle.trim(),
        message: broadcastBody.trim(),
        badgeText: broadcastBadge.trim() || 'ADMIN',
        adminSender: 'පරිපාලක මණ්ඩලය (Admin Panel)',
      });

      setAdminActionNotification(`📢 "${broadcastTitle}" නිවේදනය සියලුම පරිශීලකයන්ගේ Notification වෙත සාර්ථකව විකාශනය කරන ලදී!`);
      setBroadcastTitle('');
      setBroadcastBody('');
      setIsBroadcastModalOpen(false);
      setTimeout(() => setAdminActionNotification(null), 7000);
    } catch (err) {
      console.error('Error broadcasting announcement:', err);
      alert('නිවේදනය නිකුත් කිරීමට නොහැකි විය.');
    } finally {
      setIsPublishingBroadcast(false);
    }
  };

  const handleAdminDeleteProService = (serviceId: string) => {
    if (!serviceId) return;
    const target = proServices.find(s => s && s.id === serviceId);
    if (!window.confirm(`පරිපාලක (Admin) ලෙස "${target?.providerName || 'වෘත්තිකයා'}" ගේ සේවා දැන්වීම පද්ධතියෙන් ස්ථිරවම මකා දැමීමට (Delete) අවශ්‍ය බව තහවුරු කරන්න ද?`)) return;
    
    const updated = proServices.filter(s => s && s.id !== serviceId);
    setProServices(updated);
    saveProfessionalServicesToStorage(updated);
    addDeletedProServiceId(serviceId);
    deleteProfessionalServiceFromFirestore(serviceId).catch(err => console.warn('Delete pro service error:', err));
    try {
      window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
    } catch {}
    setAdminActionNotification(`🗑️ වෘත්තිකයාගේ සේවා දැන්වීම සාර්ථකව මකා දමන ලදී.`);
    setTimeout(() => setAdminActionNotification(null), 6000);
  };

  const handleAdminDeleteBlood = (id: string) => {
    if (!id) return;
    const target = bloodRequests.find(b => b && b.id === id);
    if (!window.confirm(`පරිපාලක ලෙස "${target?.patientName || 'ලේ ඉල්ලීම'}" (${target?.postCode || ''}) පද්ධතියෙන් ස්ථිරවම මකා දැමීමට අවශ්‍ය බව තහවුරු කරන්න ද?`)) return;
    const updated = bloodRequests.filter(b => b && b.id !== id);
    setBloodRequests(updated);
    saveBloodRequestsToStorage(updated);
    addDeletedBloodId(id);
    deleteBloodRequestFromFirestore(id).catch(err => console.warn('Delete blood request error:', err));
    try {
      window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
    } catch {}
    setAdminActionNotification(`🗑️ ලේ ඉල්ලීම සාර්ථකව මකා දමන ලදී.`);
    setTimeout(() => setAdminActionNotification(null), 6000);
  };

  const handleAdminDeleteDonor = (id: string) => {
    if (!id) return;
    const target = volunteerDonors.find(d => d && d.id === id);
    if (!window.confirm(`පරිපාලක ලෙස "${target?.name || 'පරිත්‍යාගශීලියා'}" ලැයිස්තුවෙන් ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න ද?`)) return;
    const updated = volunteerDonors.filter(d => d && d.id !== id);
    setVolunteerDonors(updated);
    saveVolunteerDonorsToStorage(updated);
    addDeletedDonorId(id);
    deleteVolunteerDonorFromFirestore(id).catch(err => console.warn('Delete donor error:', err));
    try {
      window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
    } catch {}
    setAdminActionNotification(`🗑️ පරිත්‍යාගශීලියා ලැයිස්තුවෙන් සාර්ථකව ඉවත් කරන ලදී.`);
    setTimeout(() => setAdminActionNotification(null), 6000);
  };

  const handleAdminDeleteDisaster = (id: string) => {
    if (!id) return;
    const target = disasterItems.find(d => d && d.id === id);
    if (!window.confirm(`පරිපාලක ලෙස "${target?.title || 'ආපදා සහනාධාරය'}" පද්ධතියෙන් ස්ථිරවම මකා දැමීමට අවශ්‍ය බව තහවුරු කරන්න ද?`)) return;
    const updated = disasterItems.filter(d => d && d.id !== id);
    setDisasterItems(updated);
    saveDisasterReliefItemsToStorage(updated);
    addDeletedDisasterId(id);
    deleteDisasterReliefFromFirestore(id).catch(err => console.warn('Delete disaster item error:', err));
    try {
      window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
    } catch {}
    setAdminActionNotification(`🗑️ ආපදා සහනාධාර දැන්වීම සාර්ථකව මකා දමන ලදී.`);
    setTimeout(() => setAdminActionNotification(null), 6000);
  };

  const [adminActionNotification, setAdminActionNotification] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Help Posts Admin Management States
  const [postCategoryFilter, setPostCategoryFilter] = useState('all');
  const [postStatusFilter, setPostStatusFilter] = useState('all');
  const [postToDelete, setPostToDelete] = useState<HelpPost | null>(null);

  const handleAdminDeleteHelpPost = async (post: HelpPost, permanent: boolean = true) => {
    if (!post || !post.id) return;
    addDeletedPostId(post.id);
    if (permanent) {
      if (onPermanentDeletePost) {
        onPermanentDeletePost(post.id);
      } else if (onDeletePost) {
        onDeletePost(post.id);
      }
    } else {
      if (onDeletePost) {
        onDeletePost(post.id);
      }
    }
    deleteHelpPostFromFirestore(post.id).catch(err => console.warn('Delete help post firestore error:', err));
    setPostToDelete(null);
    setAdminActionNotification(`🗑️ #${post.postCode || post.id} දැන්වීම සාර්ථකව මකා දමන ලදී.`);
    setTimeout(() => setAdminActionNotification(null), 6000);
  };

  // Tag Management State
  const [tagItems, setTagItems] = useState<TagItem[]>(() => tags || getStoredTags());

  const pendingUsers = (users || []).filter((u) => u && u.status === 'pending');
  const usersWithPendingProfileUpdates = (users || []).filter(
    (u) => u && u.pendingProfileUpdate && u.pendingProfileUpdate.status === 'pending'
  );
  const approvedUsers = (users || []).filter((u) => u && u.status === 'approved');
  const blockedUsers = (users || []).filter((u) => u && u.status === 'blocked');
  const pendingIssues = (issues || []).filter((i) => i && i.status !== 'resolved');

  // AI Security Analytics
  const scannedUsers = (users || []).filter((u) => u && !!u.aiScanResult);
  const highRiskUsers = (users || []).filter(
    (u) => u && u.aiScanResult && (u.aiScanResult.riskLevel === 'high' || u.aiScanResult.isAiGenerated)
  );
  const duplicateDetectedUsers = (users || []).filter(
    (u) => u && u.aiScanResult && u.aiScanResult.duplicateMatches && u.aiScanResult.duplicateMatches.length > 0
  );
  const aiSyntheticUsers = (users || []).filter(
    (u) => u && u.aiScanResult && u.aiScanResult.isAiGenerated
  );
  const totalAiSecurityAlerts = highRiskUsers.length + duplicateDetectedUsers.length;

  // AI Scanner Handler for Single User
  const handleScanUserNic = async (user: User): Promise<AiSecurityScanResult | undefined> => {
    const uid = user?.id || user?.userId;
    if (!uid) return;
    setScanningUsersMap((prev) => ({ ...prev, [uid]: true }));
    try {
      const result = await scanUserNicSecurity(user, users);
      const updatedUser: User = {
        ...user,
        aiScanResult: result,
      };

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      // Sync to local storage
      const savedUsers = localStorage.getItem('sahaya_users');
      if (savedUsers) {
        try {
          const usersList: User[] = JSON.parse(savedUsers);
          const newUsersList = (usersList || []).map((u) => (u && (u.id === updatedUser.id || u.userId === updatedUser.userId) ? updatedUser : u));
          localStorage.setItem('sahaya_users', JSON.stringify(newUsersList));
        } catch (err) {
          console.warn('Local storage sync error:', err);
        }
      }

      const curUserId = user?.id || user?.userId;
      if (selectedUserForModal && curUserId && (selectedUserForModal.id === curUserId || selectedUserForModal.userId === curUserId)) {
        setSelectedUserForModal(updatedUser);
      }

      if (photoInspector && curUserId && (photoInspector.user?.id === curUserId || photoInspector.user?.userId === curUserId)) {
        setInspectorScanResult(result);
      }

      const riskLabel = result.riskLevel === 'high' ? 'අධි අවදානම් (HIGH RISK)' : result.riskLevel === 'medium' ? 'මධ්‍යම අවදානම් (MEDIUM RISK)' : 'අඩු අවදානම් / නිරවුල් (LOW RISK)';
      setAdminActionNotification(`🤖 ${user?.name || 'පරිශීලක'} සඳහා AI ස්කෑන් පරීක්ෂාව අවසන්! (අවදානම: ${riskLabel}, ලකුණු: ${result.riskScore}/100)`);
      setTimeout(() => setAdminActionNotification(null), 7000);
      return result;
    } catch (err) {
      console.error('AI Scan execution error:', err);
    } finally {
      setScanningUsersMap((prev) => ({ ...prev, [uid]: false }));
    }
  };

  // Batch AI Scan Handler for all Pending Users
  const handleBatchScanPending = async () => {
    if (pendingUsers.length === 0) return;
    setBatchScanning(true);
    let highRiskCount = 0;
    let dupCount = 0;

    for (const user of pendingUsers) {
      if (!user) continue;
      const uid = user.id || user.userId || '';
      if (uid) setScanningUsersMap((prev) => ({ ...prev, [uid]: true }));
      try {
        const res = await scanUserNicSecurity(user, users);
        const updatedUser: User = {
          ...user,
          aiScanResult: res,
        };
        if (onUpdateUser) onUpdateUser(updatedUser);
        if (res.riskLevel === 'high' || res.isAiGenerated) highRiskCount++;
        if (res.duplicateMatches && res.duplicateMatches.length > 0) dupCount++;
      } catch {
        // continue to next
      } finally {
        if (uid) setScanningUsersMap((prev) => ({ ...prev, [uid]: false }));
      }
    }
    setBatchScanning(false);
    setAdminActionNotification(`🤖 සියලුම පොරොත්තු අයදුම්පත් (${pendingUsers.length}) AI ස්කෑන් කර අවසන්! (අධි අවදානම්: ${highRiskCount}, සමාන ඡායාරූප: ${dupCount})`);
    setTimeout(() => setAdminActionNotification(null), 8000);
  };

  // Batch AI Scan Handler for All Users in Directory
  const handleDeepScanAllUsers = async () => {
    if (users.length === 0) return;
    const confirmAll = window.confirm(`පද්ධතියේ සිටින සියලුම පරිශීලකයන් (${users.length}) AI මගින් පරීක්ෂා කිරීමට ඔබට අවශ්‍යද?`);
    if (!confirmAll) return;

    setBatchScanning(true);
    let flaggedCount = 0;

    for (const user of users) {
      if (!user) continue;
      const uid = user.id || user.userId || '';
      if (uid) setScanningUsersMap((prev) => ({ ...prev, [uid]: true }));
      try {
        const res = await scanUserNicSecurity(user, users);
        const updatedUser: User = {
          ...user,
          aiScanResult: res,
        };
        if (onUpdateUser) onUpdateUser(updatedUser);
        if (res.riskLevel === 'high' || (res.duplicateMatches && res.duplicateMatches.length > 0)) {
          flaggedCount++;
        }
      } catch {
        // continue
      } finally {
        if (uid) setScanningUsersMap((prev) => ({ ...prev, [uid]: false }));
      }
    }
    setBatchScanning(false);
    setAdminActionNotification(`🤖 සම්පූර්ණ පරිශීලක ලැයිස්තුව (${users.length}) AI ස්කෑන් කර අවසන්! සැක සහිත ගිණුම්: ${flaggedCount}`);
    setTimeout(() => setAdminActionNotification(null), 8000);
  };

  const emergencyAlerts = useMemo(() => (getEmergencyAdminAlerts() || []).filter(a => a && !a.isResolved), [activeTab]);
  const emergencyFlagged = useMemo(() => (getStoredEmergencyContacts(true) || []).filter(c => c && c.isInactiveDeactivated), [activeTab]);
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
  const handleResetUserPassword = async (user?: User | null) => {
    if (!user) return;
    const confirmReset = window.confirm(`ඔබට ${user?.name || 'පරිශීලක'} සඳහා මුරපදය නැවත සැකසීමට (Reset Password) අවශ්‍යද?`);
    if (!confirmReset) return;

    // Generate a secure 6-digit random temporary password
    const newTempPassword = Math.floor(100000 + Math.random() * 900000).toString();

    const updatedUser: User = {
      ...user,
      securityCode: newTempPassword,
      tempCode: newTempPassword,
      tempPassword: newTempPassword,
      key: newTempPassword,
      password: newTempPassword,
      isPasswordChanged: false,
      isTemporaryPassword: true,
    };

    // 1. Call Backend API to synchronize Firebase Auth password
    try {
      await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.userId || user.id || '',
          nicNumber: user.nicNumber || user.userId || user.id,
          newPassword: newTempPassword,
        }),
      });
    } catch (err) {
      console.warn('Backend API password reset call error:', err);
    }

    // 2. Sync to Firestore
    try {
      await syncUserProfileToFirestore(updatedUser);
      await syncUserPasswordInFirestore(updatedUser, newTempPassword);
    } catch (err) {
      console.warn('Firestore password reset sync notice:', err);
    }

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    // Save to local storage
    const savedUsers = localStorage.getItem('sahaya_users');
    if (savedUsers) {
      try {
        const usersList: User[] = JSON.parse(savedUsers);
        const newUsersList = (usersList || []).map((u) => (u && updatedUser && (u.id === updatedUser.id || u.userId === updatedUser.userId) ? updatedUser : u));
        localStorage.setItem('sahaya_users', JSON.stringify(newUsersList));
      } catch (err) {
        console.warn('User update error:', err);
      }
    }

    if (selectedUserForModal && user && (selectedUserForModal.id === user.id || selectedUserForModal.userId === user.userId)) {
      setSelectedUserForModal(updatedUser);
    }

    // Prepare WhatsApp message (Security: exclude NIC/User ID to protect account credentials)
    const rawPhone = user.whatsappNumber || user.phone || '';
    const formattedPhone = formatPhoneForWhatsApp(rawPhone);

    const messageText = `🔑 *සහය සේවා (Sahaya Seva) - මුරපදය නැවත සැකසීම (Password Reset)*\n\n` +
      `ඔබගේ සහය සේවා ගිණුමේ මුරපදය පරිපාලක විසින් සාර්ථකව නැවත සකසන ලදී.\n\n` +
      `🔑 *නව තාවකාලික මුරපදය (New Password):* ${newTempPassword}\n\n` +
      `🌐 කරුණාකර මෙම නව මුරපදය භාවිතයෙන් ඔබගේ ලියාපදිංචි ගිණුමෙන් ඇප් එකට Log in වී ඔබගේ රහස්‍යභාවය සඳහා නව මුරපදයක් සකසා ගන්න.\n` +
      `ස්තූතියි! - *සහය සේවා පරිපාලන කණ්ඩායම*`;

    if (formattedPhone) {
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }

    setAdminActionNotification(`🔑 ${user?.name || 'පරිශීලක'} ගේ මුරපදය සාර්ථකව Reset කරන ලදී! නව මුරපදය: ${newTempPassword}`);
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
        const newUsersList = (usersList || []).map((u) => (u && updated && (u.id === updated.id || u.userId === updated.userId) ? updated : u));
        localStorage.setItem('sahaya_users', JSON.stringify(newUsersList));
      } catch (err) {
        console.warn('Update error:', err);
      }
    }

    alert('පරිශීලක තොරතුරු සාර්ථකව යාවත්කාලීන කෙරිණි! (මුරපදය වෙනස් නොවීය)');
  };

  // Function 3: Adjust user credit balance directly from user details modal
  const handleAdminUserCreditAdjust = () => {
    if (!selectedUserForModal) return;
    const numAmount = parseFloat(modalCreditAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('කරුණාකර වලංගු මුදලක් ඇතුළත් කරන්න.');
      return;
    }

    let res;
    if (modalCreditMode === 'add') {
      const reasonObj = ADMIN_ADD_REASON_PRESETS.find((p) => p && p.id === modalCreditReason);
      const title = reasonObj ? reasonObj.label : 'පරිපාලක ගිණුම් බැර කිරීම (Admin Top-Up)';
      res = addCreditByAdmin(selectedUserForModal, numAmount, 'deposit', title, modalCreditRemark);
    } else {
      const reasonObj = ADMIN_DEDUCT_REASON_PRESETS.find((p) => p && p.id === modalCreditReason);
      const title = reasonObj ? reasonObj.label : 'පරිපාලක ගිණුම් අඩු කිරීම (Admin Debit)';
      res = deductCreditByAdmin(selectedUserForModal, numAmount, 'admin_adjustment', title, modalCreditRemark);
    }

    if (res && res.success) {
      const updatedUser: User = { ...selectedUserForModal, credits: res.newBalance };
      setSelectedUserForModal(updatedUser);
      if (onUpdateUser) onUpdateUser(updatedUser);
      setModalCreditNotice(`සාර්ථකයි! නව ක්‍රෙඩිට් ශේෂය: රු. ${res.newBalance.toFixed(2)}`);
      setModalCreditRemark('');
      setTimeout(() => setModalCreditNotice(null), 4000);
    }
  };

  const handleDirectApproveUser = (user: User) => {
    const updatedUser: User = {
      ...user,
      status: 'approved',
      isBlocked: false,
      approvedAt: new Date().toISOString(),
    };
    if (onUpdateUser) onUpdateUser(updatedUser);
    const uid = user?.id || user?.userId;
    if (uid && onApproveUser) onApproveUser(uid);
    setAdminActionNotification(`✅ ${user?.name || 'පරිශීලක'} (NIC: ${user.nicNumber}) ගේ ගිණුම සාර්ථකව අනුමත (Approve) කරන ලදී.`);

    // 📢 Broadcast Admin Notification
    broadcastAdminNotification({
      title: `සාමාජික ගිණුමක් සත්‍යාපනය විය: ${user?.name || 'පරිශීලක'}`,
      message: `${user?.name || 'පරිශීලක'} (${user.district || 'ශ්‍රී ලංකාව'}) සාමාජික ගිණුම පරිපාලක මණ්ඩලය විසින් සත්‍යාපනය කර අනුමත කරන ලදී.`,
      badgeText: 'VERIFIED',
      adminSender: 'පරිපාලක මණ්ඩලය (Admin Panel)',
      locationName: user.district,
    });

    setTimeout(() => setAdminActionNotification(null), 6000);
  };

  const handleDirectRejectUser = (user: User) => {
    const reason = window.prompt(`කරුණාකර ${user?.name || 'පරිශීලක'} ගේ ගිණුම ප්‍රතික්ෂේප කිරීමට හේතුව ඇතුළත් කරන්න (හෝ Cancel කරන්න):`, 'හැඳුනුම්පත් ඡායාරූපය අපැහැදිලියි හෝ තොරතුරු නොගැළපේ');
    if (reason === null) return;
    const updatedUser: User = {
      ...user,
      status: 'rejected',
      rejectionReason: reason,
    };
    if (onUpdateUser) onUpdateUser(updatedUser);
    const uid = user?.id || user?.userId;
    if (uid && onRejectUser) onRejectUser(uid, reason);
    setAdminActionNotification(`❌ ${user?.name || 'පරිශීලක'} ගේ ලියාපදිංචිය ප්‍රතික්ෂේප කරන ලදී.`);
    setTimeout(() => setAdminActionNotification(null), 6000);
  };

  const handleToggleBlockUser = (user: User) => {
    const willBlock = user.status !== 'blocked';
    const promptMsg = willBlock 
      ? `ඔබට ${user?.name || 'පරිශීලක'} (NIC: ${user.nicNumber}) ගේ ගිණුම අවහිර (Block) කිරීමට අවශ්‍යද?` 
      : `ඔබට ${user?.name || 'පරිශීලක'} (NIC: ${user.nicNumber}) ගේ ගිණුමේ අවහිරය ඉවත් (Unblock) කිරීමට අවශ්‍යද?`;
    if (!window.confirm(promptMsg)) return;

    let reason = user.blockedReason;
    if (willBlock) {
      reason = window.prompt('අවහිර කිරීමට හේතුව:', 'නීති රීති උල්ලංඝනය කිරීම හෝ වංචනික ක්‍රියාවක්') || 'පරිපාලක විසින් ගිණුම අවහිර කරන ලදී';
    }

    const updatedUser: User = {
      ...user,
      status: willBlock ? 'blocked' : 'approved',
      isBlocked: willBlock,
      blockedReason: willBlock ? reason : undefined,
    };

    if (onUpdateUser) onUpdateUser(updatedUser);
    const uid = user?.id || user?.userId;
    if (willBlock && onBlockUser && uid) onBlockUser(uid, reason || 'Blocked by Admin');
    setAdminActionNotification(willBlock ? `⛔ ${user?.name || 'පරිශීලක'} ගේ ගිණුම අවහිර (Blocked) කරන ලදී.` : `✅ ${user?.name || 'පරිශීලක'} ගේ ගිණුම නැවත සක්‍රීය (Unblocked) කරන ලදී.`);
    setTimeout(() => setAdminActionNotification(null), 6000);
  };

  // Handler for Confirming User Deletion
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    const targetUser = { ...userToDelete };
    const targetUid = targetUser.id || targetUser.userId;
    
    // 1. Permanently blacklist deleted user identifier
    if (targetUid) addDeletedUserId(targetUid);
    if (targetUser.id) addDeletedUserId(targetUser.id);
    if (targetUser.userId) addDeletedUserId(targetUser.userId);
    if (targetUser.nicNumber) addDeletedUserId(targetUser.nicNumber);

    // 2. Call parent props method to update App state & Firestore
    if (onDeleteUser && targetUid) {
      onDeleteUser(targetUid);
    }
    
    // 3. Perform direct local storage update
    const savedUsers = localStorage.getItem('sahaya_users');
    if (savedUsers) {
      try {
        const usersList: User[] = JSON.parse(savedUsers);
        const newUsersList = filterNonDeletedUsers((usersList || []).filter((u) => 
          u &&
          (!targetUser.id || u.id !== targetUser.id) && 
          (!targetUser.userId || u.userId !== targetUser.userId) && 
          (!targetUser.nicNumber || u.nicNumber !== targetUser.nicNumber)
        ));
        localStorage.setItem('sahaya_users', JSON.stringify(newUsersList));
      } catch (err) {
        console.warn('Delete user storage error:', err);
      }
    }

    // 4. Fallback direct Firestore deletion to guarantee immediate deletion
    try {
      await deleteUserAccount(targetUser, true);
    } catch (err) {
      console.warn('Direct Firestore user deletion warning:', err);
    }
    
    setAdminActionNotification(`🗑️ ${targetUser.name} ගේ ගිණුම සාර්ථකව මකා දමන ලදී.`);
    setTimeout(() => setAdminActionNotification(null), 6000);
    setUserToDelete(null); // Close Modal
  };

  const filteredUsers = (users || []).filter((u) => {
    if (!u) return false;
    const q = (searchQuery || '').trim().toLowerCase();
    const matchesSearch =
      !q ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.userId || '').toLowerCase().includes(q) ||
      (u.nicNumber || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q) ||
      (u.email || '').toLowerCase().includes(q);

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

          {(onNavigate || onSwitchToUserMode) && (
            <button
              type="button"
              onClick={() => {
                if (onSwitchToUserMode) {
                  onSwitchToUserMode();
                } else if (onNavigate) {
                  onNavigate('dashboard');
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 active:bg-emerald-100 font-black text-xs sm:text-sm shadow-lg border-2 border-emerald-300 cursor-pointer transition-all hover:scale-105 active:scale-95"
              title={language === 'en' ? 'Switch to User View' : language === 'ta' ? 'பயனர் முறை' : 'පරිශීලක ප්‍රකාරයට මාරුවන්න (User Mode)'}
            >
              <Shield className="w-4 h-4 text-emerald-700" />
              <span>{language === 'en' ? '👤 Switch to User Mode' : language === 'ta' ? '👤 பயனர் முறை' : '👤 පරිශීලක ප්‍රකාරය (User Mode)'}</span>
            </button>
          )}

          {/* 📢 Admin Announcement Broadcast Button */}
          <button
            type="button"
            onClick={() => setIsBroadcastModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm shadow-lg border-2 border-amber-300 cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="සියලුම පරිශීලකයන්ගේ Notification වලට නිල Admin නිවේදනයක් නිකුත් කරන්න"
          >
            <Megaphone className="w-4 h-4 text-slate-950" />
            <span>📢 Admin නිවේදනයක් නිකුත් කරන්න</span>
          </button>
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
          <span>පොරොත්තු අනුමැති (Approvals)</span>
          {pendingUsers.length > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'issues'
              ? 'bg-white border-teal-600 text-teal-900 shadow-md font-black'
              : 'bg-teal-50/80 border-slate-200 text-teal-800 hover:bg-teal-100'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-teal-600" />
          <span>💬 වාර්තා වූ ගැටලු (User Issues & Replies)</span>
          {pendingIssues.length > 0 ? (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {pendingIssues.length} Pending
            </span>
          ) : (
            <span className="bg-teal-200 text-teal-900 text-[10px] font-black px-2 py-0.5 rounded-full">
              {issues.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ai_security')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'ai_security'
              ? 'bg-white border-purple-600 text-purple-900 shadow-md font-black'
              : 'bg-purple-50/80 border-slate-200 text-purple-800 hover:bg-purple-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-purple-600" />
          <span>🤖 AI ආරක්ෂක (AI Fraud)</span>
          {totalAiSecurityAlerts > 0 ? (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {totalAiSecurityAlerts}
            </span>
          ) : (
            <span className="bg-purple-200 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-full">
              {scannedUsers.length}
            </span>
          )}
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
          <span>පරිශීලකයන් (Users)</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('posts_edit')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'posts_edit'
              ? 'bg-white border-emerald-600 text-emerald-950 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          <Megaphone className="w-4 h-4 text-emerald-600" />
          <span>📢 දැන්වීම් (Help Posts)</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
            {helpPosts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('red_alerts')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'red_alerts'
              ? 'bg-white border-rose-500 text-rose-900 shadow-md font-black'
              : 'bg-rose-50/80 border-slate-200 text-rose-800 hover:bg-rose-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>🚨 Red Alerts</span>
          {redAlerts.filter(a => a.status === 'active').length > 0 && (
            <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {redAlerts.filter(a => a.status === 'active').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('credits')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'credits'
              ? 'bg-white border-amber-500 text-amber-900 shadow-md font-black'
              : 'bg-amber-50/80 border-slate-200 text-amber-800 hover:bg-amber-100'
          }`}
        >
          <Coins className="w-4 h-4 text-amber-600" />
          <span>💰 Credits</span>
        </button>

        <button
          onClick={() => setActiveTab('trust_badges')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'trust_badges'
              ? 'bg-white border-emerald-600 text-emerald-950 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>🛡️ විශ්වාසනීයත්ව & Badges</span>
        </button>

        <button
          onClick={() => setActiveTab('emergency_directory')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'emergency_directory'
              ? 'bg-white border-blue-500 text-blue-900 shadow-md font-black'
              : 'bg-blue-50/80 border-slate-200 text-blue-800 hover:bg-blue-100'
          }`}
        >
          <PhoneCall className="w-4 h-4 text-blue-600" />
          <span>📞 Directory</span>
          {totalEmergencyBadge > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {totalEmergencyBadge}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('search_dictionary')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'search_dictionary'
              ? 'bg-white border-indigo-500 text-indigo-900 shadow-md font-black'
              : 'bg-indigo-50/80 border-slate-200 text-indigo-800 hover:bg-indigo-100'
          }`}
        >
          <Search className="w-4 h-4 text-indigo-600" />
          <span>🔍 Dictionary</span>
        </button>

        <button
          onClick={() => setActiveTab('professional_services')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'professional_services'
              ? 'bg-white border-emerald-600 text-emerald-950 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          <Briefcase className="w-4 h-4 text-emerald-600" />
          <span>💼 වෘත්තිකයන් (Pro Services)</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
            {proServices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('blood_and_disaster')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'blood_and_disaster'
              ? 'bg-white border-rose-600 text-rose-950 shadow-md font-black'
              : 'bg-rose-50/80 border-slate-200 text-rose-800 hover:bg-rose-100'
          }`}
        >
          <Droplet className="w-4 h-4 text-rose-600 fill-current" />
          <span>🩸 ලේ & ආපදා සහන (Blood & Disaster)</span>
          <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full">
            {bloodRequests.length + disasterItems.length + volunteerDonors.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('live_presence')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'live_presence'
              ? 'bg-white border-emerald-500 text-emerald-950 shadow-md font-black'
              : 'bg-emerald-100/90 border-emerald-300 text-emerald-900 hover:bg-emerald-200'
          }`}
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
          </span>
          <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>🟢 සජීවී Online පරිශීලකයින් (Live Presence)</span>
        </button>
      </div>

      {/* Tab: Pending Approvals (හැඳුනුම්පත් ඡායාරූපය සහ තොරතුරු සත්‍යාපනය) */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 space-y-1">
                <p className="font-extrabold">
                  🛡️ නව ලියාපදිංචි අනුමැතිය සහ හැඳුනුම්පත් සත්‍යාපනය (NIC Verification Gateway)
                </p>
                <p className="text-amber-800 leading-relaxed font-medium">
                  පරිශීලකයා ලබාදුන් ජාතික හැඳුනුම්පත් අංකය (NIC Number) සහ උඩුගත කළ හැඳුනුම්පත් ඉදිරිපස ඡායාරූපය (Front ID) සසඳා බලා අනුමත (Accept) කරන්න. කෘතිම බුද්ධිය (AI) මගින් සාදන ලද ව්‍යාජ හැඳුනුම්පත් හා සමාන ඡායාරූප සහිත ගිණුම් පරීක්ෂා කිරීමට AI Scanner භාවිතා කරන්න.
                </p>
              </div>
            </div>

            {pendingUsers.length > 0 && (
              <button
                type="button"
                onClick={handleBatchScanPending}
                disabled={batchScanning}
                className="shrink-0 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                {batchScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI පරිලෝකනය වෙමින් පවතී...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-purple-200" />
                    <span>🤖 සියලුම පොරොත්තු අයදුම්පත් AI ස්කෑන් කරන්න</span>
                  </>
                )}
              </button>
            )}
          </div>

          {pendingUsers.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-emerald-200 p-12 text-center space-y-3 shadow-md">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-black text-slate-900">
                පොරොත්තු අනුමැති කිසිවක් නොමැත!
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                සියලුම නව ලියාපදිංචි ගිණුම් සාර්ථකව පරීක්ෂා කර අනුමත කර ඇත.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((user, idx) => {
                const nicFront = user.nicFrontPhotoUrl || user.idCardPhotoUrl || user.photoUrl;
                const isScanning = !!scanningUsersMap[user.id];
                const scan = user.aiScanResult;

                return (
                  <div 
                    key={`pending_${user.id || user.nicNumber}_${idx}`} 
                    className={`bg-white rounded-3xl border-2 shadow-md p-5 space-y-4 transition-all flex flex-col justify-between ${
                      scan?.riskLevel === 'high' || scan?.isAiGenerated
                        ? 'border-rose-400 bg-rose-50/20'
                        : scan?.riskLevel === 'medium'
                        ? 'border-amber-300 bg-amber-50/10'
                        : 'border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* User Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => nicFront && openInspectorForUser(user, 'nicFront')}
                            className="w-12 h-12 rounded-2xl bg-slate-100 border-2 border-emerald-300 overflow-hidden shrink-0 flex items-center justify-center font-black text-emerald-900 cursor-pointer shadow-sm hover:scale-105 transition-transform"
                            title="ඡායාරූපය විශාල කර බලන්න (Click to inspect)"
                          >
                            {nicFront ? (
                              <img src={nicFront} alt={user?.name || 'User'} className="w-full h-full object-cover" />
                            ) : (
                              (user?.name || 'U').charAt(0)
                            )}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm">{user?.name}</h4>
                            <div className="text-[11px] font-mono text-emerald-800 font-bold">
                              ID: {user.userId}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              ලියාපදිංචි දිනය: {user.registeredAt ? new Date(user.registeredAt).toLocaleDateString('si-LK') : 'නැත'}
                            </div>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                          Pending Review
                        </span>
                      </div>

                      {/* User Verification Info Cards */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5 text-xs font-semibold text-slate-700">
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">ජාතික හැඳුනුම්පත් අංකය (NIC):</span>
                          <span className="font-mono font-black text-slate-950 bg-amber-200/60 px-2 py-0.5 rounded-md text-xs">
                            {user.nicNumber}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">දුරකථන අංකය:</span>
                          <span className="font-mono font-bold text-slate-900">{user.phone}</span>
                        </div>

                        {user.whatsappNumber && (
                          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                            <span className="text-slate-500">WhatsApp:</span>
                            <span className="font-mono font-bold text-emerald-700">{user.whatsappNumber}</span>
                          </div>
                        )}

                        {user.address && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-500">ලිපිනය / නගරය:</span>
                            <span className="text-slate-900 truncate max-w-[180px] text-right">{user.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Front ID Photo Box (Single Prominent Card) */}
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-800 mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            <span>හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය (NIC Front Photo):</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (විශාල කර බැලීමට ක්ලික් කරන්න)
                          </span>
                        </div>

                        <div 
                          onClick={() => nicFront && openInspectorForUser(user, 'nicFront')}
                          className="relative bg-slate-900/5 rounded-2xl border-2 border-slate-200 p-2 cursor-pointer group hover:border-emerald-500 transition-all text-center"
                        >
                          <div className="h-40 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center relative">
                            {nicFront ? (
                              <img 
                                src={nicFront} 
                                alt="NIC Front" 
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
                              />
                            ) : (
                              <div className="text-xs text-slate-400 font-bold p-4">
                                ඡායාරූපයක් උඩුගත කර නොමැත
                              </div>
                            )}

                            {/* Hover Inspector Pill */}
                            <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 opacity-90 group-hover:opacity-100">
                              <Eye className="w-3 h-3 text-emerald-400" />
                              <span>විශාල කර බලන්න</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 🤖 AI Security Analysis Card */}
                      <div className="rounded-2xl border p-3 text-xs space-y-2.5 transition-all bg-slate-50 border-slate-200">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                            <ShieldAlert className={`w-4 h-4 ${
                              scan?.riskLevel === 'high' ? 'text-rose-600' : scan?.riskLevel === 'medium' ? 'text-amber-600' : 'text-purple-600'
                            }`} />
                            <span>AI ආරක්ෂක වාර්තාව (AI Security Scan):</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleScanUserNic(user)}
                            disabled={isScanning}
                            className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 flex items-center gap-1 cursor-pointer transition-all"
                          >
                            {isScanning ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin text-purple-700" />
                                <span>ස්කෑන් වෙමින්...</span>
                              </>
                            ) : scan ? (
                              <>
                                <RefreshCw className="w-3 h-3 text-purple-700" />
                                <span>යළි ස්කෑන් (Re-scan)</span>
                              </>
                            ) : (
                              <>
                                <span>🤖 දැන් ස්කෑන් කරන්න</span>
                              </>
                            )}
                          </button>
                        </div>

                        {scan ? (
                          <div className="space-y-2">
                            {/* Risk Gauge Bar */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-600">අවදානම් ලකුණු (Risk Score):</span>
                              <span className={`font-mono font-black px-2 py-0.5 rounded-md ${
                                scan.riskLevel === 'high' 
                                  ? 'bg-rose-600 text-white' 
                                  : scan.riskLevel === 'medium'
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                {scan.riskScore} / 100 ({scan.riskLevel.toUpperCase()})
                              </span>
                            </div>

                            {/* AI Generated Warning Pill */}
                            {scan.isAiGenerated && (
                              <div className="bg-rose-100 border border-rose-400 p-2 rounded-xl text-rose-900 flex items-start gap-2 text-[11px] font-bold">
                                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-black text-rose-950">🚨 AI කෘතිම ඡායාරූපයක් (AI-Generated / Deepfake Face Detected)</p>
                                  <p className="text-[10px] font-medium text-rose-800">මෙම ඡායාරූපය AI තාක්ෂණයෙන් ජනනය කළ එකක් ලෙස හඳුනාගෙන ඇත (විශ්වාසය: {scan.aiConfidence}%).</p>
                                </div>
                              </div>
                            )}

                            {/* Duplicate Photos Warning */}
                            {scan.duplicateMatches && scan.duplicateMatches.length > 0 && (
                              <div className="bg-amber-100 border border-amber-400 p-2 rounded-xl text-amber-950 text-[11px] space-y-1">
                                <div className="font-black flex items-center gap-1 text-amber-900">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                  <span>⚠️ සමාන ඡායාරූප සහිත වෙනත් ගිණුම් {scan.duplicateMatches.length} ක් හමු විය!</span>
                                </div>
                                <div className="space-y-0.5 pl-4 text-[10px]">
                                  {scan.duplicateMatches.map((dup, i) => (
                                    <div key={i} className="font-medium text-slate-800">
                                      • <strong className="text-slate-950">{dup.name}</strong> (NIC: {dup.nicNumber}) - <span className="text-amber-800 font-mono font-bold">{dup.similarityPercent}% සමානයි</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Document & OCR Info */}
                            <div className="text-[10px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200 space-y-1">
                              <p className="font-semibold leading-relaxed">
                                📝 {scan.analysisSummarySi}
                              </p>
                              {scan.detectedNicNumber && (
                                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                                  <span>ඡායාරූපයෙන් හඳුනාගත් NIC: <strong className="font-mono text-slate-900">{scan.detectedNicNumber}</strong></span>
                                  <span>ගැළපීම: {scan.nicMatch ? '✅ නිවැරදියි' : '⚠️ නොගැළපේ'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">
                            තවමත් AI ආරක්ෂක පරීක්ෂාවක් සිදු කර නොමැත. "දැන් ස්කෑන් කරන්න" ක්ලික් කරන්න.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDirectApproveUser(user)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 px-1 rounded-xl flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer"
                        title="ගිණුම අනුමත කරන්න"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDirectRejectUser(user)}
                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-xs py-2 px-1 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                        title="ලියාපදිංචිය ප්‍රතික්ෂේප කරන්න"
                      >
                        <XCircle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleBlockUser(user)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 font-bold text-xs py-2 px-1 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                        title="ගිණුම අවහිර කරන්න"
                      >
                        <Ban className="w-3.5 h-3.5 text-rose-700" />
                        <span>Block</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUserToDelete(user)}
                        className="bg-rose-100 hover:bg-rose-600 text-rose-900 hover:text-white border border-rose-300 font-bold text-xs py-2 px-1 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                        title="අයදුම්පත සම්පූර්ණයෙන්ම මකා දමන්න"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: AI Security Hub (AI Fraud & Duplicate Accounts Detection Center) */}
      {activeTab === 'ai_security' && (
        <div className="space-y-6">
          {/* Top Banner with Action Button */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-950 text-white p-6 rounded-3xl shadow-xl border border-purple-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1 max-w-2xl">
              <h3 className="text-lg font-black flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-purple-400" />
                <span>AI ආරක්ෂක සහ වංචා පරීක්ෂණ මධ්‍යස්ථානය (AI Security & Fraud Center)</span>
              </h3>
              <p className="text-xs text-purple-200 leading-relaxed">
                කෘතිම බුද්ධිය (AI) මගින් සකස් කරන ලද ව්‍යාජ ඡායාරූප (Deepfakes/Synthetics), විවිධ NIC අංක යටතේ එකම ඡායාරූපය යොදාගත් බහු ගිණුම් (Duplicate Photo Accounts), සහ හැඳුනුම්පත් අංක නොගැළපීම් ස්වයංක්‍රීයව පරිලෝකනය කර හසුකරගැනීම.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDeepScanAllUsers}
              disabled={batchScanning}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 text-white font-black text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg transition-all cursor-pointer shrink-0"
            >
              {batchScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>ස්කෑන් වෙමින් පවතී...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-purple-200" />
                  <span>සියලුම ගිණුම් AI ස්කෑන් කරන්න (Deep Scan All)</span>
                </>
              )}
            </button>
          </div>

          {/* 4 Overview Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-sm">
              <div className="text-[10px] font-black uppercase text-slate-500">පරීක්ෂා කළ මුළු ගිණුම්</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {scannedUsers.length} <span className="text-xs font-normal text-slate-500">/ {users.length}</span>
              </div>
            </div>

            <div className="bg-white border-2 border-rose-200 p-4 rounded-2xl shadow-sm">
              <div className="text-[10px] font-black uppercase text-rose-700">AI කෘතිම ඡායාරූප (Synthetic)</div>
              <div className="text-2xl font-black text-rose-600 font-mono mt-1">
                {aiSyntheticUsers.length}
              </div>
            </div>

            <div className="bg-white border-2 border-amber-200 p-4 rounded-2xl shadow-sm">
              <div className="text-[10px] font-black uppercase text-amber-700">සමාන ඡායාරූප සහිත ගිණුම්</div>
              <div className="text-2xl font-black text-amber-600 font-mono mt-1">
                {duplicateDetectedUsers.length}
              </div>
            </div>

            <div className="bg-white border-2 border-purple-200 p-4 rounded-2xl shadow-sm">
              <div className="text-[10px] font-black uppercase text-purple-700">අධි අවදානම් ගිණුම් (High Risk)</div>
              <div className="text-2xl font-black text-purple-900 font-mono mt-1">
                {highRiskUsers.length}
              </div>
            </div>
          </div>

          {/* Section 1: 🚨 Duplicate Photo Networks */}
          <div className="bg-white rounded-3xl border-2 border-amber-300 p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h4 className="font-black text-slate-900 text-sm">
                  🚨 අනාවරණය වූ සමාන ඡායාරූප සහිත ගිණුම් ජාලය (Duplicate Photo Matches)
                </h4>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {duplicateDetectedUsers.length} ගිණුම් හමු විය
              </span>
            </div>

            {duplicateDetectedUsers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                ✅ සමාන හෝ එකම ඡායාරූපය යොදාගත් කිසිදු ව්‍යාජ ගිණුමක් හමු වී නොමැත.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {duplicateDetectedUsers.map((user, idx) => {
                  const frontPhoto = user.nicFrontPhotoUrl || user.idCardPhotoUrl || user.photoUrl;
                  const duplicates = user.aiScanResult?.duplicateMatches || [];

                  return (
                    <div key={`dup_${user.id || user.nicNumber}_${idx}`} className="bg-amber-50/40 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div 
                            onClick={() => frontPhoto && openInspectorForUser(user, 'nicFront')}
                            className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden border border-amber-300 cursor-pointer shrink-0"
                          >
                            {frontPhoto ? (
                              <img src={frontPhoto} alt={user?.name} className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          <div>
                            <h5 className="font-black text-slate-900 text-xs">{user?.name}</h5>
                            <div className="text-[11px] font-mono text-slate-600">NIC: {user.nicNumber}</div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              user.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              Status: {user.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleBlockUser(user)}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Ban className="w-3 h-3 text-rose-700" />
                          <span>Block</span>
                        </button>
                      </div>

                      {/* Duplicate Accounts Match List */}
                      <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-xs space-y-1.5">
                        <div className="text-[11px] font-extrabold text-amber-900">
                          සමාන ඡායාරූපය යොදා ඇති වෙනත් ගිණුම් ({duplicates.length}):
                        </div>
                        {duplicates.map((dup, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-100 last:border-0">
                            <div>
                              <strong className="text-slate-900">{dup.name}</strong>
                              <span className="text-slate-500 font-mono ml-1.5">(NIC: {dup.nicNumber})</span>
                            </div>
                            <span className="font-mono font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md text-[10px]">
                              {dup.similarityPercent}% සමානයි
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: 🤖 AI-Generated & Flagged Accounts */}
          <div className="bg-white rounded-3xl border-2 border-purple-300 p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-600" />
                <h4 className="font-black text-slate-900 text-sm">
                  🤖 AI-Generated හෝ සැක සහිත හැඳුනුම්පත් (AI Synthetics & High Risk List)
                </h4>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {highRiskUsers.length} ගිණුම්
              </span>
            </div>

            {highRiskUsers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                ✅ AI මගින් නිපදවන ලද හෝ සැක සහිත හැඳුනුම්පත් කිසිවක් හමු වී නොමැත.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {highRiskUsers.map((user, idx) => {
                  const frontPhoto = user.nicFrontPhotoUrl || user.idCardPhotoUrl || user.photoUrl;
                  const scan = user.aiScanResult;

                  return (
                    <div key={`risk_${user.id || user.nicNumber}_${idx}`} className="bg-rose-50/30 border-2 border-rose-300 rounded-2xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div 
                            onClick={() => frontPhoto && openInspectorForUser(user, 'nicFront')}
                            className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden border border-rose-300 cursor-pointer shrink-0"
                          >
                            {frontPhoto ? (
                              <img src={frontPhoto} alt={user?.name} className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          <div>
                            <h5 className="font-black text-slate-900 text-xs">{user?.name}</h5>
                            <div className="text-[11px] font-mono text-slate-600">NIC: {user.nicNumber}</div>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono">
                              Risk Score: {scan?.riskScore} / 100
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleBlockUser(user)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Block</span>
                          </button>
                        </div>
                      </div>

                      {/* Details & Flags */}
                      <div className="bg-white p-2.5 rounded-xl border border-rose-200 text-xs space-y-1.5">
                        <p className="font-semibold text-rose-950 text-[11px]">
                          {scan?.analysisSummarySi}
                        </p>
                        {scan?.flags && scan.flags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {scan.flags.map((flag, fIdx) => (
                              <span key={fIdx} className="bg-rose-100 text-rose-900 text-[9px] font-bold px-2 py-0.5 rounded-md border border-rose-300">
                                ⚠️ {flag}
                              </span>
                            ))}
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

      {/* Tab: All Users (Users Directory - WITHOUT PASSWORD COLUMN) */}
      {activeTab === 'all_users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-2xl border-2 border-emerald-200 shadow-sm">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="නම, User ID, NIC හෝ දුරකථන අංකයෙන් සොයන්න..."
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
                    <th className="p-3.5">ක්‍රෙඩිට් (Credits)</th>
                    <th className="p-3.5">හැඳුනුම්පත (ID Photo)</th>
                    <th className="p-3.5">තත්ත්වය (Status)</th>
                    <th className="p-3.5 text-center">ක්‍රියාමාර්ග (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                        පරිශීලකයන් හමු නොවිණි.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, idx) => {
                      const nicFront = user.nicFrontPhotoUrl || user.idCardPhotoUrl;
                      const hasLoginHistory = Array.isArray(user.loginHistory) && user.loginHistory.length > 0;

                      return (
                        <tr key={`tbl_${user.id || user.nicNumber}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div 
                                onClick={() => openInspectorForUser(user, 'face')}
                                className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 overflow-hidden shrink-0 flex items-center justify-center font-black text-emerald-900 cursor-pointer hover:scale-105 transition-transform"
                                title="පින්තූරය විශාල කර බලන්න"
                              >
                                {user.photoUrl ? (
                                  <img src={user.photoUrl} alt={user?.name || 'User'} className="w-full h-full object-cover" />
                                ) : (
                                  (user?.name || 'U').charAt(0)
                                )}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                  <span>{user?.name}</span>
                                  {user.role === 'admin' && (
                                    <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                                      Admin
                                    </span>
                                  )}
                                </div>
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
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserForModal(user);
                                setEditingUserForm({ ...user });
                                setModalSubTab('credits');
                              }}
                              className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-1.5 rounded-xl font-mono font-black text-xs transition-all cursor-pointer shadow-xs active:scale-95 group"
                              title="ක්‍රෙඩිට් ගනුදෙනු විස්තර බලන්න (View Credits & Statement)"
                            >
                              <Coins className="w-3.5 h-3.5 text-amber-600 group-hover:rotate-12 transition-transform" />
                              <span>රු. {getUserCreditBalance(user).toFixed(2)}</span>
                            </button>
                          </td>
                          <td className="p-3.5">
                            {nicFront ? (
                              <button
                                type="button"
                                onClick={() => openInspectorForUser(user, 'nicFront')}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                                title="හැඳුනුම්පත් ඡායාරූපය පරීක්ෂා කරන්න"
                              >
                                <Eye className="w-3 h-3 text-emerald-700" />
                                <span>බලන්න (View)</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold">නැත</span>
                            )}
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
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Quick Approve button if pending */}
                              {user.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleDirectApproveUser(user)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                                  title="ගිණුම අනුමත කරන්න"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                              )}

                              {/* Toggle Block/Unblock */}
                              <button
                                type="button"
                                onClick={() => handleToggleBlockUser(user)}
                                className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 border ${
                                  user.status === 'blocked'
                                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
                                    : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
                                }`}
                                title={user.status === 'blocked' ? 'අවහිරය ඉවත් කරන්න' : 'ගිණුම අවහිර කරන්න'}
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>{user.status === 'blocked' ? 'Unblock' : 'Block'}</span>
                              </button>

                              {/* Reset Password Button */}
                              <button
                                type="button"
                                onClick={() => handleResetUserPassword(user)}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                                title="මුරපදය නැවත සකස් කරන්න (Reset Password)"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-700" />
                                <span>Reset Pass</span>
                              </button>

                              {/* View / Edit Modal Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserForModal(user);
                                  setEditingUserForm({ ...user });
                                  setModalSubTab('profile');
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Profile & Logs</span>
                              </button>

                              {/* Delete User Button - Added Here */}
                              <button
                                type="button"
                                onClick={() => setUserToDelete(user)}
                                className="bg-rose-50 hover:bg-rose-600 text-rose-900 hover:text-white border border-rose-300 hover:border-rose-600 px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 group"
                                title="ගිණුම සම්පූර්ණයෙන්ම මකා දමන්න (Delete User)"
                              >
                                <Trash2 className="w-3.5 h-3.5 group-hover:text-white text-rose-700 transition-colors" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: User Issues & Reply Management (වාර්තා වූ ගැටලු සහ පිළිතුරු කළමනාකරණය) */}
      {activeTab === 'issues' && (
        <AdminIssuesManagement
          issues={issues}
          users={users}
          onReplyIssue={onReplyIssue}
          language={language}
        />
      )}

      {/* Tab: Red Alerts Management */}
      {activeTab === 'red_alerts' && (
        <AdminRedAlertManagement
          redAlerts={redAlerts}
          onRefreshRedAlerts={onRefreshRedAlerts}
          onViewDetail={onViewRedAlertDetail}
          language={language}
        />
      )}

      {/* Tab: User Credits Management */}
      {activeTab === 'credits' && (
        <AdminCreditManagement
          users={users}
          onUpdateUser={onUpdateUser}
          language={language}
        />
      )}

      {/* Tab: User Trust & Verified Badges Management */}
      {activeTab === 'trust_badges' && (
        <AdminTrustManagement
          users={users}
          language={language}
          onBlockUser={onBlockUser}
          onUnblockCredential={onUnblockCredential}
          onUpdateUser={onUpdateUser}
        />
      )}

      {/* Tab: Emergency Contacts Directory Management */}
      {activeTab === 'emergency_directory' && (
        <AdminEmergencyDirectoryManagement
          language={language}
        />
      )}

      {/* Tab: Search Synonym Dictionary Management */}
      {activeTab === 'search_dictionary' && (
        <AdminSearchDictionaryManager
          language={language}
        />
      )}

      {/* Tab: Live Presence & Online Users Management */}
      {activeTab === 'live_presence' && (
        <AdminPresenceDashboard
          onSendAdminNotice={(msg) => {
            alert(`පරිශීලකයින් වෙත නිවේදනය සාර්ථකව විකාශනය කෙරිණි: "${msg}"`);
          }}
        />
      )}

      {/* Tab: Professional Services Management (වෘත්තීය සේවා කළමනාකරණය) */}
      {activeTab === 'professional_services' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Top Banner & Search */}
          <div className="p-4 bg-emerald-50 dark:bg-[#081f14] border-2 border-emerald-300 dark:border-emerald-800 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ලියාපදිංචි වෘත්තිකයන් කළමනාකරණය (Professional Services Registry)
                </h3>
                <p className="text-xs text-slate-600 dark:text-[#88ad97]">
                  සේවා වෘත්තිකයන් පරීක්ෂා කිරීම, තොරතුරු සමාලෝචනය සහ පද්ධතියෙන් ඉවත් කිරීම (Delete)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="නම, වෘත්තිය, නගරය සොයන්න..."
                  value={proSearchQuery}
                  onChange={(e) => setProSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-900 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Providers Grid */}
          {(() => {
            const filtered = proServices.filter((srv) => {
              if (!srv) return false;
              if (proSearchQuery.trim()) {
                const q = proSearchQuery.toLowerCase();
                const text = `${srv.providerName || ''} ${srv.profession || ''} ${srv.serviceTitle || ''} ${srv.categoryName || ''} ${srv.locationName || ''} ${srv.providerPhone || ''}`.toLowerCase();
                if (!text.includes(q)) return false;
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="p-12 text-center bg-white dark:bg-[#0c1811] rounded-3xl border border-slate-200 dark:border-emerald-900/60 text-slate-400 text-xs space-y-2">
                  <Briefcase className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p>කිසිදු සේවා වෘත්තිකයෙකු හමු නොවීය.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((srv, idx) => (
                  <div
                    key={`adm_pro_${srv.id || idx}`}
                    className="p-4 bg-white dark:bg-[#0c1811] border-2 border-slate-200 dark:border-[#173222] hover:border-emerald-500 rounded-3xl shadow-sm flex flex-col justify-between gap-3 transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-emerald-400/40 overflow-hidden shrink-0">
                          {srv.providerPhotoUrl ? (
                            <img src={srv.providerPhotoUrl} alt={srv.providerName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-xl text-slate-600 dark:text-slate-300">
                              {(srv.providerName || 'P').charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                              {srv.providerName}
                            </h4>
                            {srv.isVerified && (
                              <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-md">
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">
                            {srv.subCategoryIcon} {srv.subCategoryName || srv.profession}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>📍 {srv.locationName || 'නොදනී'}</span>
                            <span>•</span>
                            <span className="font-mono">{srv.providerPhone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#071710] border border-slate-100 dark:border-emerald-950 text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                        {srv.serviceTitle}
                      </div>

                      {srv.qualifications && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          🎓 {srv.qualifications}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-emerald-950 flex items-center justify-between gap-2">
                      <div className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                        <span>★ {srv.avgRating?.toFixed(1) || '5.0'}</span>
                        <span className="text-slate-400 font-normal">({srv.reviews?.length || 0} reviews)</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAdminDeleteProService(srv.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 hover:border-rose-600 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                        title="පරිපාලක ලෙස මෙම වෘත්තිකයා සම්පූර්ණයෙන්ම ඉවත් කරන්න"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete (ඉවත් කරන්න)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab: Blood Donation & Disaster Relief Center Management */}
      {activeTab === 'blood_and_disaster' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Top Info Banner */}
          <div className="p-4 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Droplet className="w-5 h-5 fill-white" />
              </div>
              <div>
                <h3 className="text-base font-black">
                  හදිසි ලේ පරිත්‍යාග සහ ආපදා සහනාධාර පාලනය (Blood & Disaster Hub)
                </h3>
                <p className="text-xs text-rose-100 font-medium">
                  පද්ධතියේ ඇති ලේ ඉල්ලීම්, පරිත්‍යාගශීලීන් සහ ආපදා සහනාධාර දැන්වීම් සමාලෝචනය සහ මකා දැමීම (Admin Delete)
                </p>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex bg-white/20 p-1 rounded-2xl gap-1 text-xs font-bold flex-wrap">
              <button
                type="button"
                onClick={() => setBloodTabSub('requests')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  bloodTabSub === 'requests' ? 'bg-white text-red-900 shadow-sm font-black' : 'text-white hover:bg-white/10'
                }`}
              >
                🩸 ලේ ඉල්ලීම් ({bloodRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setBloodTabSub('donors')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  bloodTabSub === 'donors' ? 'bg-white text-red-900 shadow-sm font-black' : 'text-white hover:bg-white/10'
                }`}
              >
                ❤️ පරිත්‍යාගශීලීන් ({volunteerDonors.length})
              </button>
              <button
                type="button"
                onClick={() => setBloodTabSub('disaster')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  bloodTabSub === 'disaster' ? 'bg-white text-red-900 shadow-sm font-black' : 'text-white hover:bg-white/10'
                }`}
              >
                📦 ආපදා සහන ({disasterItems.length})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="රෝගියා, රෝහල, දිස්ත්‍රික්කය, සම්බන්ධීකාරක හෝ දුරකථන අංකය සොයන්න..."
              value={bloodSearchQuery}
              onChange={(e) => setBloodSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-[#071910] border border-slate-300 dark:border-emerald-900 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Sub-Tab 1: Blood Requests */}
          {bloodTabSub === 'requests' && (
            <div className="space-y-3">
              {bloodRequests.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#071910] rounded-2xl border text-slate-400 text-xs">
                  ලේ ඉල්ලීම් කිසිවක් නොමැත.
                </div>
              ) : (
                bloodRequests
                  .filter((b) => {
                    if (!bloodSearchQuery.trim()) return true;
                    const q = bloodSearchQuery.toLowerCase();
                    return `${b.patientName} ${b.hospitalName} ${b.district} ${b.contactPhone} ${b.bloodGroup}`.toLowerCase().includes(q);
                  })
                  .map((b) => (
                    <div
                      key={`adm_blood_${b.id}`}
                      className="p-4 bg-white dark:bg-[#071d12] border-2 border-rose-200 dark:border-rose-950 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex flex-col items-center justify-center font-mono font-black shrink-0">
                          <span className="text-base">{b.bloodGroup}</span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 px-2 py-0.5 rounded-md">
                              {b.postCode || '#BLD'}
                            </span>
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              {b.patientName} (පයින්ට් {b.unitsNeeded}ක්)
                            </h4>
                            <span className="text-[10px] text-slate-500">📍 {b.hospitalName} ({b.district})</span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            📞 සම්බන්ධීකාරක: <strong>{b.contactName}</strong> ({b.contactPhone}) • දිනය: {b.neededDate}
                          </div>
                          {b.additionalNotes && (
                            <p className="text-[11px] text-slate-500 italic mt-1">{b.additionalNotes}</p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAdminDeleteBlood(b.id)}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 hover:border-rose-600 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete (මකා දමන්න)</span>
                      </button>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* Sub-Tab 2: Volunteer Donors */}
          {bloodTabSub === 'donors' && (
            <div className="space-y-3">
              {volunteerDonors.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#071910] rounded-2xl border text-slate-400 text-xs">
                  පරිත්‍යාගශීලීන් කිසිවක් නොමැත.
                </div>
              ) : (
                volunteerDonors
                  .filter((d) => {
                    if (!bloodSearchQuery.trim()) return true;
                    const q = bloodSearchQuery.toLowerCase();
                    return `${d.name} ${d.district} ${d.phone} ${d.bloodGroup}`.toLowerCase().includes(q);
                  })
                  .map((d) => (
                    <div
                      key={`adm_donor_${d.id}`}
                      className="p-3.5 bg-white dark:bg-[#071d12] border-2 border-emerald-200 dark:border-emerald-950 rounded-2xl shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-mono font-black flex items-center justify-center shrink-0">
                          {d.bloodGroup}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">{d.name}</h4>
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold">
                              {d.district}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">📞 {d.phone} • අවසන් වරට: {d.lastDonatedDate}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAdminDeleteDonor(d.id)}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 hover:border-rose-600 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete (ඉවත් කරන්න)</span>
                      </button>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* Sub-Tab 3: Disaster Relief */}
          {bloodTabSub === 'disaster' && (
            <div className="space-y-3">
              {disasterItems.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#071910] rounded-2xl border text-slate-400 text-xs">
                  ආපදා සහනාධාර දැන්වීම් කිසිවක් නොමැත.
                </div>
              ) : (
                disasterItems
                  .filter((item) => {
                    if (!bloodSearchQuery.trim()) return true;
                    const q = bloodSearchQuery.toLowerCase();
                    return `${item.title} ${item.district} ${item.locationName} ${item.contactPerson} ${item.contactPhone}`.toLowerCase().includes(q);
                  })
                  .map((item) => (
                    <div
                      key={`adm_dis_${item.id}`}
                      className="p-4 bg-white dark:bg-[#071d12] border-2 border-emerald-200 dark:border-emerald-900 rounded-2xl shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black">
                              {item.urgency === 'high' ? '🚨 HIGH URGENCY' : 'සහනාධාර'}
                            </span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                              📍 {item.district} ({item.locationName})
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">{item.title}</h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAdminDeleteDisaster(item.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 hover:border-rose-600 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete (මකා දමන්න)</span>
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300">{item.description}</p>
                      <div className="text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-100 dark:border-emerald-950 flex justify-between items-center flex-wrap gap-2">
                        <span>📞 සම්බන්ධීකාරක: {item.contactPerson} ({item.contactPhone})</span>
                        <span className="font-mono font-bold">ඉලක්කය: {item.targetQuantity || 'අවශ්‍ය පරිදි'}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Help Posts & Community Ads Management (සියලුම ප්‍රජා දැන්වීම් කළමනාකරණය) */}
      {activeTab === 'posts_edit' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Top Control Bar & Filters */}
          <div className="p-4 bg-emerald-50 dark:bg-[#081f14] border-2 border-emerald-300 dark:border-emerald-800 rounded-3xl space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    ප්‍රජා දැන්වීම් සහ ඉල්ලීම් කළමනාකරණය (Community Help Posts Registry)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-[#88ad97]">
                    සියලුම සාමාන්‍ය දැන්වීම්, ඉක්මන් සේවා, මගෙන් ඔබට සහ සොයාදෙන්න ඉල්ලීම් පරීක්ෂා කර මකා දැමීම (Delete)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white dark:bg-[#0c2217] px-3 py-1.5 rounded-2xl border border-emerald-300 dark:border-emerald-900 text-xs font-black text-emerald-800 dark:text-emerald-300">
                <span>මුළු දැන්වීම් ගණන:</span>
                <span className="font-mono text-sm">{helpPosts.length}</span>
              </div>
            </div>

            {/* Search and Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/60">
              {/* Search input */}
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="කේතය (#HLP), විස්තරය, නම, දුරකථන අංකය හෝ නගරය සොයන්න..."
                  value={postSearchQuery}
                  onChange={(e) => setPostSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-900 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Category Filter */}
              <div className="sm:col-span-3">
                <select
                  value={postCategoryFilter}
                  onChange={(e) => setPostCategoryFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-white dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-900 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="all">සියලුම වර්ග (All Categories)</option>
                  <option value="quick_services">⚡ ඉක්මන් සේවා (Quick)</option>
                  <option value="normal_services">🛠️ සාමාන්‍ය සේවා (General)</option>
                  <option value="find_for_me">🔍 සොයාදෙන්න (Find for Me)</option>
                  <option value="from_me_to_you">🎁 මගෙන් ඔබට (From Me)</option>
                  <option value="emergency">🚨 හදිසි ආධාර (Emergency)</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="sm:col-span-3">
                <select
                  value={postStatusFilter}
                  onChange={(e) => setPostStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-white dark:bg-[#0c2217] border border-slate-300 dark:border-emerald-900 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="all">සියලුම තත්ත්වයන් (All Status)</option>
                  <option value="active">🟢 සක්‍රීය (Active)</option>
                  <option value="confirmed">✅ සනාථ වූ (Confirmed)</option>
                  <option value="deleted">🗑️ මකා දැමූ (Deleted)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Posts Table / Cards View */}
          {(() => {
            const filteredPosts = (helpPosts || []).filter((p) => {
              if (!p) return false;
              if (postStatusFilter === 'active' && (p.isDeleted || p.status === 'deleted')) return false;
              if (postStatusFilter === 'confirmed' && (!p.isConfirmed && p.status !== 'confirmed')) return false;
              if (postStatusFilter === 'deleted' && !p.isDeleted && p.status !== 'deleted') return false;

              if (postCategoryFilter !== 'all' && p.category !== postCategoryFilter) return false;

              if (postSearchQuery.trim()) {
                const q = postSearchQuery.toLowerCase();
                const text = `${p.postCode || ''} ${p.whatHappened || ''} ${p.whatIsNeeded || ''} ${p.userName || ''} ${p.userPhone || ''} ${p.contactWhatsapp || ''} ${p.locationName || ''} ${p.tagName || ''} ${p.donationItem || ''} ${p.itemLostStolenOrSearched || ''}`.toLowerCase();
                if (!text.includes(q)) return false;
              }
              return true;
            });

            if (filteredPosts.length === 0) {
              return (
                <div className="p-12 text-center bg-white dark:bg-[#0c1811] rounded-3xl border border-slate-200 dark:border-emerald-900/60 text-slate-400 text-xs space-y-2">
                  <Megaphone className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p>කිසිදු ප්‍රජා දැන්වීමක් හමු නොවීය.</p>
                </div>
              );
            }

            return (
              <div className="bg-white dark:bg-[#0c1811] rounded-3xl border-2 border-emerald-200 dark:border-[#173222] shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-[#081f14] text-slate-800 dark:text-slate-200 font-black border-b-2 border-slate-200 dark:border-emerald-900/60 uppercase tracking-wider">
                        <th className="p-3.5">කේතය & වර්ගය</th>
                        <th className="p-3.5">දැන්වීම් විස්තරය</th>
                        <th className="p-3.5">දැන්වීම්කරු & දුරකථනය</th>
                        <th className="p-3.5">ස්ථානය (Location)</th>
                        <th className="p-3.5">දිනය / කාලය</th>
                        <th className="p-3.5">තත්ත්වය</th>
                        <th className="p-3.5 text-center">පරිපාලක පාලනය</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#173222]">
                      {filteredPosts.map((post, idx) => {
                        const isDel = Boolean(post.isDeleted || post.status === 'deleted');
                        const isConf = Boolean(post.isConfirmed || post.status === 'confirmed');

                        return (
                          <tr key={`adm_post_${post.id || idx}`} className="hover:bg-slate-50/80 dark:hover:bg-[#10271c] transition-colors">
                            <td className="p-3.5">
                              <span className="font-mono font-black text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-md">
                                {post.postCode || `#HLP-${idx + 1}`}
                              </span>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                                {post.tagName || post.category || 'සාමාන්‍ය'}
                              </div>
                            </td>

                            <td className="p-3.5 max-w-[280px]">
                              <div className="font-bold text-slate-900 dark:text-white line-clamp-2">
                                {post.whatHappened || post.whatIsNeeded || post.donationItem || post.itemLostStolenOrSearched || 'විස්තර නැත'}
                              </div>
                              {post.specialNotice && (
                                <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium italic mt-0.5">
                                  {post.specialNotice}
                                </div>
                              )}
                            </td>

                            <td className="p-3.5 font-mono">
                              <div className="font-extrabold text-slate-900 dark:text-slate-100">{post.userName || 'නොදනී'}</div>
                              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                                {post.contactWhatsapp || post.userPhone || 'දුරකථනය නැත'}
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                                📍 {post.locationName || 'ශ්‍රී ලංකාව'}
                              </div>
                            </td>

                            <td className="p-3.5 text-[11px] text-slate-500 dark:text-slate-400">
                              {post.createdAt || 'මෑතකදී'}
                            </td>

                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isDel
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                                  : isConf
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                              }`}>
                                {isDel ? 'Deleted' : isConf ? 'Confirmed' : 'Active'}
                              </span>
                            </td>

                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {isDel && onRestorePost ? (
                                  <button
                                    type="button"
                                    onClick={() => onRestorePost(post.id)}
                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                                    title="දැන්වීම නැවත ප්‍රතිස්ථාපනය කරන්න"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Restore</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setPostToDelete(post)}
                                    className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-900 hover:text-white border border-rose-300 hover:border-rose-600 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-xs group"
                                    title="දැන්වීම ස්ථිරවම මකා දමන්න (Delete Post)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-700 group-hover:text-white transition-colors" />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* User Edit / Details / Login History Modal */}
      {selectedUserForModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border-2 border-emerald-400 dark:border-emerald-600 shadow-2xl p-6 space-y-5 animate-scaleUp my-8">
            <div className="flex justify-between items-center border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-black text-slate-900">
                  {selectedUserForModal.name} - පරිශීලක තොරතුරු සහ පාලනය
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex border-b border-slate-200 gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setModalSubTab('profile')}
                className={`px-4 py-2 font-bold text-xs rounded-t-xl transition-all cursor-pointer ${
                  modalSubTab === 'profile'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                පැතිකඩ විස්තර (Profile Info)
              </button>

              <button
                type="button"
                onClick={() => setModalSubTab('credits')}
                className={`px-4 py-2 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalSubTab === 'credits'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-amber-300" />
                <span>ක්‍රෙඩිට් ගනුදෙනු (Credits & Statement)</span>
                <span className="bg-amber-400 text-slate-950 font-mono text-[10px] font-black px-2 py-0.5 rounded-full">
                  රු. {getUserCreditBalance(selectedUserForModal).toFixed(2)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModalSubTab('posts')}
                className={`px-4 py-2 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalSubTab === 'posts'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>ප්‍රවේශ ඉතිහාසය (Login History)</span>
                {Array.isArray(selectedUserForModal.loginHistory) && (
                  <span className="bg-white/20 text-xs px-1.5 py-0.2 rounded-full font-mono">
                    {selectedUserForModal.loginHistory.length}
                  </span>
                )}
              </button>
            </div>

            {/* SubTab 1: Profile Info Form */}
            {modalSubTab === 'profile' && (
              <div className="space-y-4">
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

                {/* ID Photo Preview in Profile Tab */}
                {(selectedUserForModal.nicFrontPhotoUrl || selectedUserForModal.idCardPhotoUrl) && (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <div className="text-xs font-black text-slate-800 mb-2 flex items-center justify-between">
                      <span>හැඳුනුම්පත් ඡායාරූප (NIC Photos):</span>
                      <button
                        type="button"
                        onClick={() => openInspectorForUser(selectedUserForModal, 'nicFront')}
                        className="text-[11px] text-emerald-700 font-bold underline flex items-center gap-1"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>විශාල කර බලන්න</span>
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-32 h-20 bg-slate-200 rounded-xl overflow-hidden border border-slate-300">
                        <img 
                          src={selectedUserForModal.nicFrontPhotoUrl || selectedUserForModal.idCardPhotoUrl} 
                          alt="Front NIC" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {selectedUserForModal.nicBackPhotoUrl && (
                        <div className="w-32 h-20 bg-slate-200 rounded-xl overflow-hidden border border-slate-300">
                          <img 
                            src={selectedUserForModal.nicBackPhotoUrl} 
                            alt="Back NIC" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Password & Security Actions */}
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-[11px] text-amber-900 font-semibold flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ආරක්ෂිතයි: වෙනස්කම් සුරැකීමේදී පරිශීලකයාගේ මුරපදයට බලපෑමක් සිදු නොවේ.</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleResetUserPassword(selectedUserForModal)}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-xl font-extrabold text-[11px] shrink-0 transition-all cursor-pointer shadow-sm"
                  >
                    🔑 Reset Password
                  </button>
                </div>
              </div>
            )}

            {/* SubTab 2: User Credits & Detailed Transactions Statement */}
            {modalSubTab === 'credits' && (() => {
              const userTxList = getUserCreditTransactions(selectedUserForModal);
              const currentBalance = getUserCreditBalance(selectedUserForModal);

              const inflowTotal = userTxList
                .filter((tx) => ['deposit', 'welcome_gift', 'reward'].includes(tx.type) || (tx.type === 'admin_adjustment' && tx.amount > 0))
                .reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0), 0);

              const outflowTotal = userTxList
                .filter((tx) => ['ad_fee', 'penalty_compensation'].includes(tx.type) || (tx.type === 'admin_adjustment' && tx.amount < 0))
                .reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);

              const filteredTxList = userTxList
                .filter((tx) => {
                  if (modalCreditFilter === 'inflow') {
                    return ['deposit', 'welcome_gift', 'reward'].includes(tx.type) || (tx.type === 'admin_adjustment' && tx.amount > 0);
                  }
                  if (modalCreditFilter === 'outflow') {
                    return ['ad_fee', 'penalty_compensation'].includes(tx.type) || (tx.type === 'admin_adjustment' && tx.amount < 0);
                  }
                  if (modalCreditFilter === 'reward') {
                    return tx.type === 'reward' || tx.type === 'welcome_gift';
                  }
                  return true;
                })
                .filter((tx) => {
                  if (!modalCreditSearch.trim()) return true;
                  const q = modalCreditSearch.toLowerCase();
                  return (
                    (tx.title && tx.title.toLowerCase().includes(q)) ||
                    (tx.description && tx.description.toLowerCase().includes(q)) ||
                    (tx.postCode && tx.postCode.toLowerCase().includes(q)) ||
                    (tx.adminRemark && tx.adminRemark.toLowerCase().includes(q)) ||
                    (tx.categoryKey && tx.categoryKey.toLowerCase().includes(q))
                  );
                });

              return (
                <div className="space-y-4 animate-fadeIn">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 p-3 rounded-2xl">
                      <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1 mb-1">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        <span>වත්මන් ශේෂය (Balance)</span>
                      </div>
                      <div className="text-xl font-black font-mono text-amber-950 dark:text-amber-100">
                        රු. {currentBalance.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700/60 p-3 rounded-2xl">
                      <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1 mb-1">
                        <span>📥 මුළු බැර කළ (Inflow)</span>
                      </div>
                      <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                        + රු. {inflowTotal.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-700/60 p-3 rounded-2xl">
                      <div className="text-[11px] font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1 mb-1">
                        <span>📤 මුළු අඩු කළ (Outflow)</span>
                      </div>
                      <div className="text-xl font-black font-mono text-rose-700 dark:text-rose-300">
                        - රු. {outflowTotal.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-2xl">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>මුළු ගනුදෙනු ගණන</span>
                      </div>
                      <div className="text-xl font-black font-mono text-slate-900 dark:text-slate-100">
                        {userTxList.length} <span className="text-xs font-normal text-slate-500">වාර්තා</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Credit Quick Adjustment Tool */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                          පරිපාලක ගිණුම් ගැලපුම (Admin Quick Credit Adjustment)
                        </span>
                      </div>

                      {/* Mode Toggle */}
                      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setModalCreditMode('add');
                            setModalCreditReason('boc_slip');
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            modalCreditMode === 'add'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
                          }`}
                        >
                          🟢 මුදල් බැර කිරීම (Deposit / Reward)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalCreditMode('deduct');
                            setModalCreditReason('policy_violation');
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            modalCreditMode === 'deduct'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
                          }`}
                        >
                          🔴 මුදල් අඩු කිරීම (Debit / Penalty)
                        </button>
                      </div>
                    </div>

                    {modalCreditNotice && (
                      <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center gap-2 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>{modalCreditNotice}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      {/* Amount Input */}
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          මුදල (Amount - රු.):
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={modalCreditAmount}
                          onChange={(e) => setModalCreditAmount(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Reason Preset Dropdown */}
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          හේතුව (Preset Reason):
                        </label>
                        <select
                          value={modalCreditReason}
                          onChange={(e) => setModalCreditReason(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs focus:outline-none focus:border-amber-500"
                        >
                          {modalCreditMode === 'add'
                            ? ADMIN_ADD_REASON_PRESETS.map((p, pIdx) => (
                                <option key={`preset_add_${p?.id || pIdx}_${pIdx}`} value={p?.id}>
                                  {p?.label}
                                </option>
                              ))
                            : ADMIN_DEDUCT_REASON_PRESETS.map((p, pIdx) => (
                                <option key={`preset_deduct_${p?.id || pIdx}_${pIdx}`} value={p?.id}>
                                  {p?.label}
                                </option>
                              ))}
                        </select>
                      </div>

                      {/* Custom Remark */}
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          සටහන / Reference (Remarks):
                        </label>
                        <input
                          type="text"
                          placeholder="උදා: BOC Slip #4928"
                          value={modalCreditRemark}
                          onChange={(e) => setModalCreditRemark(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Submit Button */}
                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={handleAdminUserCreditAdjust}
                          className={`w-full p-2 rounded-xl font-black text-xs text-white transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-1 ${
                            modalCreditMode === 'add'
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : 'bg-rose-600 hover:bg-rose-700'
                          }`}
                        >
                          {modalCreditMode === 'add' ? (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>බැර කරන්න</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>අඩු කරන්න</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Quick Amount Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] font-bold text-slate-500">ක්ෂණික මුදල්:</span>
                      {[25, 50, 100, 250, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setModalCreditAmount(amt.toString())}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 hover:border-amber-500 transition-colors cursor-pointer"
                        >
                          + රු. {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transaction Statement Header, Search & Filter Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                        සම්පූර්ණ ගනුදෙනු ලේඛනය (Detailed Transaction Statement)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="සොයන්න..."
                          value={modalCreditSearch}
                          onChange={(e) => setModalCreditSearch(e.target.value)}
                          className="pl-8 pr-2.5 py-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Filter Chips */}
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setModalCreditFilter('all')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            modalCreditFilter === 'all'
                              ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          සියල්ල ({userTxList.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalCreditFilter('inflow')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            modalCreditFilter === 'inflow'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          බැර (+)
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalCreditFilter('outflow')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            modalCreditFilter === 'outflow'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          අඩු (-)
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalCreditFilter('reward')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            modalCreditFilter === 'reward'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          ත්‍යාග 🎁
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                          <th className="p-3">#</th>
                          <th className="p-3">දිනය සහ වේලාව (Date & Time)</th>
                          <th className="p-3">ගනුදෙනු විස්තරය (Description)</th>
                          <th className="p-3">වර්ගය (Type)</th>
                          <th className="p-3">මුදල (Amount)</th>
                          <th className="p-3">ශේෂය (Balance After)</th>
                          <th className="p-3">Reference / Code</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTxList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                              ගනුදෙනු වාර්තා හමු නොවිණි.
                            </td>
                          </tr>
                        ) : (
                          filteredTxList.map((tx, idx) => {
                            const isInflow = tx.amount > 0;

                            return (
                              <tr key={`admin_tx_${tx.id || 'tx'}_${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-3 font-mono text-slate-500 font-bold">{idx + 1}</td>
                                <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {tx.timestamp || 'නැත'}
                                </td>
                                <td className="p-3">
                                  <div className="font-extrabold text-slate-900 dark:text-slate-100">{tx.title}</div>
                                  {tx.description && (
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      {tx.description}
                                    </div>
                                  )}
                                  {tx.adminRemark && (
                                    <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 mt-0.5 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md inline-block border border-amber-200 dark:border-amber-800/50">
                                      📝 Remark: {tx.adminRemark}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                      isInflow
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                    }`}
                                  >
                                    {tx.type}
                                  </span>
                                </td>
                                <td className="p-3 font-mono font-black text-sm">
                                  <span className={isInflow ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                    {isInflow ? '+' : '-'} රු. {Math.abs(tx.amount).toFixed(2)}
                                  </span>
                                </td>
                                <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                  රු. {(tx.balanceAfter ?? currentBalance).toFixed(2)}
                                </td>
                                <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                  {tx.postCode || tx.categoryKey || '-'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* SubTab 3: Login History (පසුගිය අවස්ථා 20 ප්‍රවේශ වාර්තා) */}
            {modalSubTab === 'posts' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs text-slate-700 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900">පරිශීලක ප්‍රවේශ ඉතිහාසය: </span>
                    <span>පරිශීලකයා ඇප් එකට පිවිසි අවසන් අවස්ථා 20 හි IP ලිපිනය, ස්ථානය සහ දිනය/වේලාව මෙහි සටහන් වේ.</span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-200 uppercase tracking-wider">
                        <th className="p-3">#</th>
                        <th className="p-3">දිනය සහ වේලාව (Date & Time)</th>
                        <th className="p-3">IP ලිපිනය (IP Address)</th>
                        <th className="p-3">ස්ථානය / නගරය (Location)</th>
                        <th className="p-3">උපාංගය (Device / Browser)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!Array.isArray(selectedUserForModal.loginHistory) || selectedUserForModal.loginHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500 font-bold">
                            තවමත් ප්‍රවේශ වාර්තා සටහන් වී නොමැත. (පළමු පිවිසුමෙන් පසු වාර්තා වේ)
                          </td>
                        </tr>
                      ) : (
                        selectedUserForModal.loginHistory.map((log, index) => (
                          <tr key={`admin_log_${log.id || 'log'}_${index}`} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono text-slate-500 font-bold">{index + 1}</td>
                            <td className="p-3 font-mono font-bold text-slate-900">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString('si-LK') : 'නැත'}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-800 bg-emerald-50/50">
                              {log.ipAddress || 'නොදනී'}
                            </td>
                            <td className="p-3 font-bold text-slate-700">
                              {log.locationName || 'නොදනී'}
                            </td>
                            <td className="p-3 text-[11px] text-slate-600 truncate max-w-[160px]" title={log.deviceInfo}>
                              {log.deviceInfo || 'නොදනී'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleBlockUser(selectedUserForModal)}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                    selectedUserForModal.status === 'blocked'
                      ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                  }`}
                >
                  {selectedUserForModal.status === 'blocked' ? '✅ Unblock Account' : '⛔ Block Account'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const u = selectedUserForModal;
                    setSelectedUserForModal(null);
                    setUserToDelete(u);
                  }}
                  className="px-4 py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer bg-rose-50 hover:bg-rose-600 text-rose-900 hover:text-white border border-rose-300 hover:border-rose-600 flex items-center gap-1.5 active:scale-95 shadow-sm"
                  title="ගිණුම සම්පූර්ණයෙන්ම ඉවත් කරන්න"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete User</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs cursor-pointer"
                >
                  වසන්න (Close)
                </button>
                {modalSubTab === 'profile' && (
                  <button
                    type="button"
                    onClick={handleSaveUserEdit}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                  >
                    වෙනස්කම් සුරකින්න (Save Changes)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* High-Clarity Photo Inspector Lightbox Modal */}
      {photoInspector && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl p-4 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10 text-white">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <span>{photoInspector.userName}</span>
                  {photoInspector.nicNumber && (
                    <span className="text-xs bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md font-mono font-black">
                      NIC: {photoInspector.nicNumber}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  ඡායාරූපය විශාල කර පරීක්ෂා කිරීම (High-Clarity ID & Face Inspector)
                </p>
              </div>

              {/* Photo Switch Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl">
                {photoInspector.nicFrontPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoInspector({ ...photoInspector, activeType: 'nicFront', zoom: 1, rotation: 0 })}
                    className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                      photoInspector.activeType === 'nicFront'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Front ID
                  </button>
                )}
                {photoInspector.nicBackPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoInspector({ ...photoInspector, activeType: 'nicBack', zoom: 1, rotation: 0 })}
                    className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                      photoInspector.activeType === 'nicBack'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Back ID
                  </button>
                )}
                {photoInspector.facePhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoInspector({ ...photoInspector, activeType: 'face', zoom: 1, rotation: 0 })}
                    className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                      photoInspector.activeType === 'face'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Face Photo
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPhotoInspector(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Canvas Area */}
            <div className="flex-1 min-h-[350px] overflow-hidden flex items-center justify-center p-4 bg-slate-950/80 rounded-2xl my-3 relative">
              {(() => {
                const currentImg = 
                  photoInspector.activeType === 'nicFront' 
                    ? photoInspector.nicFrontPhotoUrl 
                    : photoInspector.activeType === 'nicBack' 
                    ? photoInspector.nicBackPhotoUrl 
                    : photoInspector.facePhotoUrl;

                return currentImg ? (
                  <img
                    src={currentImg}
                    alt="Inspect Target"
                    style={{
                      transform: `scale(${photoInspector.zoom}) rotate(${photoInspector.rotation}deg)`,
                      transition: 'transform 0.2s ease-out',
                    }}
                    className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-2xl"
                  />
                ) : (
                  <div className="text-slate-400 font-bold text-sm">
                    ඡායාරූපයක් ලබා දී නොමැත.
                  </div>
                );
              })()}
            </div>

            {/* Zoom / Rotate Controls Bar */}
            <div className="flex justify-between items-center pt-2 text-white">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPhotoInspector({ ...photoInspector, zoom: Math.min(photoInspector.zoom + 0.25, 3) })}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl font-bold flex items-center gap-1 text-xs cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                  <span>Zoom In</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPhotoInspector({ ...photoInspector, zoom: Math.max(photoInspector.zoom - 0.25, 0.5) })}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl font-bold flex items-center gap-1 text-xs cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                  <span>Zoom Out</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPhotoInspector({ ...photoInspector, rotation: (photoInspector.rotation + 90) % 360 })}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl font-bold flex items-center gap-1 text-xs cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Rotate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border-2 border-rose-400 shadow-2xl p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-lg font-black text-slate-900">ගිණුම මකා දැමීම තහවුරු කරන්න</h3>
            </div>
            <p className="text-sm font-semibold text-slate-600">
              ඔබට විශ්වාසද <span className="font-black text-rose-600">{userToDelete.name}</span> ගේ ගිණුම සම්පූර්ණයෙන්ම පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍ය බව? මෙම ක්‍රියාව ආපසු හැරවිය නොහැක.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs cursor-pointer"
              >
                අවලංගු කරන්න (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                මකා දමන්න (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Help Post Confirmation Modal */}
      {postToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border-2 border-rose-400 shadow-2xl p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">දැන්වීම මකා දැමීම තහවුරු කරන්න</h3>
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              පරිපාලක ලෙස <span className="font-black text-rose-600">#{postToDelete.postCode || postToDelete.id}</span> දැන්වීම සම්පූර්ණයෙන්ම පද්ධතියෙන් සහ දත්ත ගබඩාවෙන් ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න ද?
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs cursor-pointer"
              >
                අවලංගු කරන්න (Cancel)
              </button>
              <button
                type="button"
                onClick={() => handleAdminDeleteHelpPost(postToDelete, true)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                මකා දමන්න (Delete Post)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📢 Admin Announcement Broadcast Modal */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border-2 border-amber-400 shadow-2xl p-6 space-y-4 animate-scaleUp text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black">
                    📢 නිල Admin නිවේදනයක් විකාශනය කරන්න
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    සියලුම සාමාජිකයන්ගේ Notifications වෙත සජීවීව යැවේ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishAdminAnnouncement} className="space-y-3.5">
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                  නිවේදන මාතෘකාව (Announcement Title):
                </label>
                <input
                  type="text"
                  required
                  placeholder="උදා: 📢 පද්ධති නඩත්තු දැනුම්දීමක් / 🛡️ නව ආරක්ෂක උපදෙස්..."
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                  ලාංඡනය / Badge Text:
                </label>
                <div className="flex items-center gap-2">
                  {['ADMIN', 'NOTICE', 'SECURITY', 'UPDATE', 'IMPORTANT'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBroadcastBadge(b)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black border transition-all ${
                        broadcastBadge === b 
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs' 
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                  සම්පූර්ණ පණිවිඩය (Detailed Message):
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="පරිශීලකයන්ට දැනුම්දිය යුතු කරුණු මෙහි පැහැදිලිව සටහන් කරන්න..."
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs cursor-pointer"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="submit"
                  disabled={isPublishingBroadcast}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  {isPublishingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                  <span>දැන්ම විකාශනය කරන්න (Broadcast Now)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
