import React, { useState } from 'react';
import { User, Issue, Language, HelpPost, BlockedCredential, UserStatus, RegistrationConfig, CategoryItem, CustomFormField, TagItem } from '../types';
import { translations } from '../data/translations';
import { initialRegistrationConfig, initialCategories } from '../data/initialData';
import { AppLogo } from './AppLogo';
import { MemoryStorageBar } from './MemoryStorageBar';
import { generateAndDownloadUserPdf } from '../utils/pdfGenerator';
import { fetchAllPostsBackupData, restorePostsBackupData } from '../lib/firebase';
import { 
  getStoredTags, 
  saveTagsToStorage, 
  addTagToStorage, 
  updateTagInStorage, 
  deleteTagFromStorage, 
  purgeUnusedTagsFromStorage 
} from '../utils/tagUtils';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
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
  X
} from 'lucide-react';

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
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<
    'pending' | 'issues' | 'all_users' | 'blocked_list' | 'registration_edit' | 'categories_edit' | 'posts_edit' | 'tags_edit'
  >('pending');
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);
  
  // High-Clarity Photo Inspector State for Admin Document Verification
  interface PhotoInspectorState {
    userName: string;
    userId?: string;
    nicNumber?: string;
    facePhotoUrl?: string;
    nicFrontPhotoUrl?: string;
    nicBackPhotoUrl?: string;
    activeType: 'face' | 'nicFront' | 'nicBack';
    zoom: number; // 1, 1.25, 1.5, 2, 2.5, 3
    rotation: number; // 0, 90, 180, 270
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

  const openInspectorSingleUrl = (url: string, title?: string) => {
    if (!url || url.trim() === '') return;
    setPhotoInspector({
      userName: title || 'ඡායාරූපය (Photo Preview)',
      facePhotoUrl: url,
      activeType: 'face',
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

  // 01. Registration Text Edit State
  const [regEditLang, setRegEditLang] = useState<Language>('si');
  const [regState, setRegState] = useState<RegistrationConfig>(
    () => registrationConfig || initialRegistrationConfig
  );

  // 02. Category & Dynamic Ad Forms Management State
  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>(
    () => categories || initialCategories
  );
  const [selectedCatForFields, setSelectedCatForFields] = useState<string>(
    categories?.[0]?.id || 'quick_services'
  );
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [editingCatModal, setEditingCatModal] = useState<CategoryItem | null>(null);
  const [catFormState, setCatFormState] = useState({
    id: '',
    nameSi: '',
    nameEn: '',
    nameTa: '',
    descSi: '',
    descEn: '',
    descTa: '',
    icon: 'Sparkles',
  });

  // Dynamic Custom Form Fields State
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [editingFieldModal, setEditingFieldModal] = useState<CustomFormField | null>(null);
  const [fieldFormState, setFieldFormState] = useState({
    labelSi: '',
    labelEn: '',
    labelTa: '',
    fieldType: 'text' as 'text' | 'textarea' | 'number' | 'dropdown' | 'checkbox',
    options: '',
    required: false,
  });

  // 03. Posts Management State
  const [postSearchQuery, setPostSearchQuery] = useState('');
  const [adminPostFilter, setAdminPostFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [selectedPostForAdminEdit, setSelectedPostForAdminEdit] = useState<HelpPost | null>(null);
  const [postToDelete, setPostToDelete] = useState<HelpPost | null>(null);
  const [isPermanentDeleteRequested, setIsPermanentDeleteRequested] = useState(false);
  const [adminActionNotification, setAdminActionNotification] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [editPostFormState, setEditPostFormState] = useState({
    whatHappened: '',
    whatIsNeeded: '',
    conditions: '',
    transport: '',
    payment: '',
    locationName: '',
    category: '',
  });

  const handleBackupPosts = async () => {
    try {
      setIsBackingUp(true);
      const backupObj = await fetchAllPostsBackupData(helpPosts);
      const jsonString = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `sahaya_seva_posts_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setAdminActionNotification(
        `✅ පලකරන ලද සියලුම දැන්වීම්, ස්ථාන විස්තර, Chat history සහ ගණුදෙනු විස්තර (${backupObj.totalPostsCount} posts) සාර්ථකව Backup ලෙස Download කරන ලදී!`
      );
      setTimeout(() => setAdminActionNotification(null), 6000);
    } catch (err) {
      console.error('Backup error:', err);
      alert('Backup සැකසීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestorePosts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsRestoring(true);
      const fileText = await file.text();
      const parsedData = JSON.parse(fileText);

      const res = await restorePostsBackupData(parsedData);

      if (res.restoredPostsList.length > 0 && onRestoreAllPosts) {
        onRestoreAllPosts(res.restoredPostsList);
      } else if (res.restoredPostsList.length > 0 && onUpdatePost) {
        res.restoredPostsList.forEach((p) => onUpdatePost(p));
      }

      setAdminActionNotification(
        `✅ සාර්ථකයි! දැන්වීම් ${res.restoredPostsCount} ක් සහ Chat පණිවුඩ ${res.restoredMessagesCount} ක් සාර්ථකව Restore කරන ලදී!`
      );
      setTimeout(() => setAdminActionNotification(null), 7000);

      alert(
        `✅ Restore සාර්ථකයි!\n\n• Restore කළ දැන්වීම් ගණන: ${res.restoredPostsCount}\n• Restore කළ Chat පණිවුඩ ගණන: ${res.restoredMessagesCount}\n\nදැන්වීම් සහ Chat History පද්ධතියට සාර්ථකව ඇතුළත් විය!`
      );
    } catch (err) {
      console.error('Restore error:', err);
      alert('Restore කිරීමේදී දෝෂයක් ඇතිවිය. කරුණාකර වලංගු Backup JSON ගොනුවක් තෝරන්න.');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  const handleExecuteDelete = (post: HelpPost, permanent: boolean = false) => {
    if (permanent || post.isDeleted) {
      if (onPermanentDeletePost) {
        onPermanentDeletePost(post.id);
      } else if (onDeletePost) {
        onDeletePost(post.id);
      }
      setAdminActionNotification(`දැන්වීම #${post.postCode} පද්ධතියෙන් සම්පූර්ණයෙන්ම ඉවත් කරන ලදී (Permanently Deleted).`);
    } else {
      if (onDeletePost) {
        onDeletePost(post.id);
      }
      setAdminActionNotification(`දැන්වීම #${post.postCode} සාර්ථකව Delete කර "🚨 Delete කළ දැන්වීම්" වෙත යවන ලදී.`);
    }
    setPostToDelete(null);
    setIsPermanentDeleteRequested(false);
    setTimeout(() => {
      setAdminActionNotification(null);
    }, 4500);
  };

  const handleExecuteRestore = (post: HelpPost) => {
    if (onRestorePost) {
      onRestorePost(post.id);
    } else if (onUpdatePost) {
      onUpdatePost({
        ...post,
        isDeleted: false,
        deletedAt: undefined,
        deletedBy: undefined,
        status: 'active',
      });
    }
    setAdminActionNotification(`දැන්වීම #${post.postCode} සාර්ථකව නැවත සක්‍රීය (Restore) කරන ලදී.`);
    setTimeout(() => {
      setAdminActionNotification(null);
    }, 4500);
  };

  // 04. Tag Management State
  const [tagItems, setTagItems] = useState<TagItem[]>(() => tags || getStoredTags());
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [editingTagModal, setEditingTagModal] = useState<TagItem | null>(null);
  const [tagFormState, setTagFormState] = useState({ tagName: '', category: '' });

  const handlePurgeUnusedTags = () => {
    const activePosts = helpPosts.filter((p) => !p.isDeleted);
    const purgedTags = purgeUnusedTagsFromStorage(activePosts);
    setTagItems(purgedTags);
    if (onUpdateTags) onUpdateTags(purgedTags);
    alert(`දැන්වීම් සඳහා ඇතුළත් නොකළ Tag සියල්ල සාර්ථකව ඉවත් කෙරිණි! (ඉතිරි Tag ගණන: ${purgedTags.length})`);
  };

  const handleCreateNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagFormState.tagName.trim() || !tagFormState.category.trim()) {
      alert('කරුණාකර Tag Name සහ Category දෙකම ඇතුළත් කරන්න.');
      return;
    }
    const result = addTagToStorage(tagFormState.tagName, tagFormState.category);
    setTagItems(result.allTags);
    if (onUpdateTags) onUpdateTags(result.allTags);
    setTagFormState({ tagName: '', category: '' });
    setShowAddTagModal(false);
    alert('නව Tag එක සාර්ථකව ඇතුළත් කරන ලදී!');
  };

  const handleSaveEditTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTagModal || !tagFormState.tagName.trim() || !tagFormState.category.trim()) return;

    const oldTagName = editingTagModal.tagName;
    const newName = tagFormState.tagName.trim();
    const newCat = tagFormState.category.trim();

    const updated = updateTagInStorage(editingTagModal.id, newName, newCat);
    setTagItems(updated);
    if (onUpdateTags) onUpdateTags(updated);

    // Update existing posts that use this tag
    helpPosts.forEach((post) => {
      if (post.tagId === editingTagModal.id || post.tagName === oldTagName) {
        if (onUpdatePost) {
          onUpdatePost({
            ...post,
            tagName: newName,
            tagCategory: newCat,
          });
        }
      }
    });

    setEditingTagModal(null);
    setTagFormState({ tagName: '', category: '' });
    alert('Tag එක සහ අදාළ දැන්වීම් සියල්ල සාර්ථකව යාවත්කාලීන කරන ලදී!');
  };

  const handleDeleteTag = (tag: TagItem) => {
    if (window.confirm(`"${tag.tagName} (${tag.category})" Tag එක ඉවත් කිරීමට තහවුරු කරන්නද?`)) {
      const updated = deleteTagFromStorage(tag.id);
      setTagItems(updated);
      if (onUpdateTags) onUpdateTags(updated);
      alert('Tag එක සාර්ථකව ඉවත් කරන ලදී!');
    }
  };

  const selectedCatObj = categoryItems.find((c) => c.id === selectedCatForFields) || categoryItems[0];

  const filteredHelpPosts = helpPosts.filter((post) => {
    // 3 Days retention rule for deleted posts
    if (post.isDeleted) {
      const deletedTime = post.deletedAt ? new Date(post.deletedAt).getTime() : Date.now();
      const isWithin3Days = Date.now() - deletedTime <= 3 * 24 * 60 * 60 * 1000;
      if (!isWithin3Days) return false;
      if (adminPostFilter === 'active') return false;
    } else {
      if (adminPostFilter === 'deleted') return false;
    }

    const q = postSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      post.postCode.toLowerCase().includes(q) ||
      post.userName.toLowerCase().includes(q) ||
      post.userPhone.includes(q) ||
      post.whatHappened.toLowerCase().includes(q) ||
      post.whatIsNeeded.toLowerCase().includes(q) ||
      post.locationName.toLowerCase().includes(q) ||
      (post.category && post.category.toLowerCase().includes(q))
    );
  });

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status === 'approved');
  const blockedUsers = users.filter((u) => u.status === 'blocked');
  const pendingIssues = issues.filter((i) => i.status !== 'resolved');

  // Search and filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.nicNumber.includes(searchQuery) ||
      u.phone.includes(searchQuery) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.ipAddress && u.ipAddress.includes(searchQuery));

    const matchesStatus =
      userStatusFilter === 'all' || u.status === userStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleReplyChange = (issueId: string, val: string) => {
    setReplyTextMap((prev) => ({ ...prev, [issueId]: val }));
  };

  const handleOpenUserModal = (user: User) => {
    setSelectedUserForModal(user);
    setEditingUserForm({ ...user });
    setModalSubTab('profile');
  };

  const handleSaveUserEdit = () => {
    if (!selectedUserForModal || !onUpdateUser) return;
    const updated: User = {
      ...selectedUserForModal,
      ...editingUserForm,
    } as User;

    onUpdateUser(updated);
    setSelectedUserForModal(updated);
    alert('පරිශීලක තොරතුරු සාර්ථකව යාවත්කාලීන කෙරිණි!');
  };

  const handleConfirmBlockUser = () => {
    if (!selectedUserForModal || !onBlockUser) return;
    const reason = blockReasonInput.trim() || 'පරිපාලක විසින් අවහිර කරන ලදී';
    onBlockUser(selectedUserForModal.id, reason);
    alert(`පරිශීලක ${selectedUserForModal.name} ගේ දුරකථනය, ජා.හැ. අංකය, Gmail සහ IP ලිපිනය සාර්ථකව අවහිර (Block) කෙරිණි!`);
    setSelectedUserForModal(null);
  };

  const [pdfGeneratingUserId, setPdfGeneratingUserId] = useState<string | null>(null);

  const handleDownloadUserPdf = async (user: User) => {
    try {
      setPdfGeneratingUserId(user.id);
      const success = await generateAndDownloadUserPdf(user);
      if (success) {
        const newCount = (user.pdfDownloadCount || 0) + 1;
        const nowIso = new Date().toISOString();
        const updatedUser: User = {
          ...user,
          pdfDownloadCount: newCount,
          lastPdfDownloadedAt: nowIso,
        };

        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }

        if (selectedUserForModal && selectedUserForModal.id === user.id) {
          setSelectedUserForModal(updatedUser);
          setEditingUserForm((prev) => ({
            ...prev,
            pdfDownloadCount: newCount,
            lastPdfDownloadedAt: nowIso,
          }));
        }

        alert(`✅ ${user.nicNumber || user.userId}.pdf ගොණුව සාර්ථකව බාගත කරන ලදී!\n(මෙම ගොණුව බාගත කළ මුළු වාර ගණන: ${newCount})`);
      } else {
        alert('PDF ගොනුව නිර්මාණය කිරීමේදී දෝෂයක් ඇතිවිය. කරුණාකර නැවත උත්සාහ කරන්න.');
      }
    } catch (err) {
      console.error('Error in handleDownloadUserPdf:', err);
      alert('PDF ගොනුව බාගත කිරීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setPdfGeneratingUserId(null);
    }
  };

  const handlePurgePersonalDetails = (user: User) => {
    const downloadCount = user.pdfDownloadCount || 0;
    const confirmMessage = downloadCount > 0
      ? `⚠️ අවධානයයි: ඔබ "${user.name}" (NIC: ${user.nicNumber}) ගේ ලියාපදිංචි පෞද්ගලික තොරතුරු (ඡායාරූප 3, ලිපිනය, උපන්දිනය, GPS ස්ථානය ආදිය) Delete කිරීමට නියමිතයි.\n\nමෙම තොරතුරු ඉවත් කළ පසු ඉතිරිවන්නේ Login වීමට අවශ්‍ය තොරතුරු (NIC, Phone, Key) පමණි.\n\n(PDF බාගත කළ වාර ගණන: ${downloadCount})\n\nමෙම ක්‍රියාව ස්ථිරවම සිදු කිරීමට අවශ්‍යද?`
      : `⚠️ අවවාදයයි: ඔබ මෙම පරිශීලකයාගේ PDF එක තවම Download කර නොමැත (බාගත වාර ගණන: 0).\n\nපෞද්ගලික තොරතුරු Delete කිරීමට පෙර PDF ගොනුව බාගත කර තබා ගැනීම නිර්දේශ කෙරේ.\n\nඑසේ වුවද පෞද්ගලික තොරතුරු Delete කර Login තොරතුරු (NIC, Phone, Key) පමණක් ඉතිරි කිරීමට අවශ්‍යද?`;

    if (!window.confirm(confirmMessage)) return;

    const nowPurgedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const purgedUser: User = {
      ...user,
      // Retain login essentials only
      id: user.id,
      userId: user.userId,
      nicNumber: user.nicNumber,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      key: user.key,
      securityCode: user.securityCode,
      tempCode: user.tempCode,
      isPasswordChanged: user.isPasswordChanged,
      role: user.role,
      status: user.status,
      registeredAt: user.registeredAt,
      name: user.name,
      email: user.email,
      pdfDownloadCount: user.pdfDownloadCount,
      lastPdfDownloadedAt: user.lastPdfDownloadedAt,

      // Purge personal info & photo data from memory storage
      facePhotoUrl: '',
      photoUrl: '',
      nicFrontPhotoUrl: '',
      nicBackPhotoUrl: '',
      idCardPhotoUrl: '',
      address: '',
      birthDate: '',
      surname: '',
      lastName: '',
      nearestTown: '',
      registrationLat: undefined,
      registrationLng: undefined,
      registrationLocationName: '',
      registrationAccuracy: undefined,
      deviceInfo: '',

      // Mark as purged
      personalDetailsPurged: true,
      personalDetailsPurgedAt: nowPurgedAt,
    };

    if (onUpdateUser) {
      onUpdateUser(purgedUser);
    }

    if (selectedUserForModal && selectedUserForModal.id === user.id) {
      setSelectedUserForModal(purgedUser);
      setEditingUserForm({ ...purgedUser });
    }

    alert(`🛡️ පරිශීලක (${user.nicNumber}) ගේ පෞද්ගලික තොරතුරු සහ ඡායාරූප සාර්ථකව Delete කරන ලදී!\nදැන් පද්ධතියේ ඉතිරිව ඇත්තේ Login වීමට අවශ්‍ය තොරතුරු (NIC, Phone, Key) පමණි.`);
  };

  // Get user's help posts
  const userPosts = helpPosts.filter(
    (post) =>
      selectedUserForModal &&
      (post.userName.trim().toLowerCase() === selectedUserForModal.name.trim().toLowerCase() ||
       post.userPhone.trim() === selectedUserForModal.phone.trim())
  );

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
                සහය සේවා (Sahaya Seva) • පරිශීලක කළමනාකරණය, දැන්වීම් පරීක්ෂාව සහ ආරක්ෂක මධ්‍යස්ථානය
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleBackupPosts}
              disabled={isBackingUp}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all text-xs font-black cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
              title="පලකරන ලද සියලුම දැන්වීම්, ස්ථාන, Chat history සහ ගණුදෙනු විස්තර Backup කරන්න"
            >
              {isBackingUp ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
              ) : (
                <Download className="w-4 h-4 text-slate-950" />
              )}
              <span>{isBackingUp ? 'Backup වෙමින්...' : '📦 Backup (දැන්වීම් + Chat)'}</span>
            </button>

            <label className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-300 hover:bg-emerald-200 text-slate-950 transition-all text-xs font-black cursor-pointer shadow-md active:scale-95">
              {isRestoring ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
              ) : (
                <FileDown className="w-4 h-4 text-slate-950" />
              )}
              <span>{isRestoring ? 'Restore වෙමින්...' : '📥 Restore Backup'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestorePosts}
                disabled={isRestoring}
                className="hidden"
              />
            </label>

            <button
              onClick={onSeedDemoData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 transition-all text-xs font-extrabold cursor-pointer shadow-md active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{t.quickSeedData}</span>
            </button>
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
            <p className="text-[10px] text-amber-700 font-bold mt-0.5">Pending Approvals</p>
          </div>

          <div className="bg-white/95 text-slate-900 border-2 border-teal-300 p-3.5 rounded-2xl shadow-md">
            <div className="text-[10px] uppercase tracking-wider text-teal-800 font-black mb-1">
              වාර්තා වූ ගැටලු
            </div>
            <div className="text-2xl font-black text-teal-900 font-mono">
              {pendingIssues.length}
            </div>
            <p className="text-[10px] text-teal-700 font-bold mt-0.5">Open Tickets</p>
          </div>

          <div className="bg-white/95 text-slate-900 border-2 border-emerald-300 p-3.5 rounded-2xl shadow-md">
            <div className="text-[10px] uppercase tracking-wider text-emerald-800 font-black mb-1">
              සක්‍රීය පරිශීලකයන්
            </div>
            <div className="text-2xl font-black text-emerald-900 font-mono">
              {approvedUsers.length}
            </div>
            <p className="text-[10px] text-emerald-700 font-bold mt-0.5">Approved Active</p>
          </div>

          <div className="bg-white/95 text-slate-900 border-2 border-rose-300 p-3.5 rounded-2xl shadow-md">
            <div className="text-[10px] uppercase tracking-wider text-rose-800 font-black mb-1">
              Block කළ ගිණුම්
            </div>
            <div className="text-2xl font-black text-rose-900 font-mono">
              {blockedUsers.length || blockedCredentials.length}
            </div>
            <p className="text-[10px] text-rose-700 font-bold mt-0.5">Blocked Users</p>
          </div>

          <div className="bg-white/95 text-slate-900 border-2 border-slate-200 p-3.5 rounded-2xl shadow-md">
            <div className="text-[10px] uppercase tracking-wider text-slate-700 font-black mb-1">
              මුළු ලියාපදිංචි
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {users.length}
            </div>
            <p className="text-[10px] text-slate-600 font-bold mt-0.5">Total Database</p>
          </div>
        </div>
      </div>

      {/* Real-time Long-term Storage & Memory Bar */}
      <MemoryStorageBar
        helpPosts={helpPosts}
        users={users}
        categoryItems={categoryItems}
        tagItems={tagItems}
        issues={issues}
        blockedCredentials={blockedCredentials}
      />

      {/* Tabs Control */}
      <div className="flex flex-wrap border-b-2 border-emerald-200 gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-white border-emerald-500 text-emerald-900 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-900'
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>{t.pendingApprovalsTab}</span>
          {pendingUsers.length > 0 && (
            <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('all_users')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'all_users'
              ? 'bg-white border-emerald-500 text-emerald-900 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>පරිශීලක කළමනාකරණය (User Directory)</span>
        </button>

        <button
          onClick={() => setActiveTab('blocked_list')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'blocked_list'
              ? 'bg-white border-rose-500 text-rose-900 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-900'
          }`}
        >
          <Ban className="w-4 h-4 text-rose-600" />
          <span>Block වූ ලැයිස්තුව (Blocked List)</span>
          {blockedCredentials.length > 0 && (
            <span className="bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
              {blockedCredentials.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('registration_edit')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'registration_edit'
              ? 'bg-white border-emerald-500 text-emerald-900 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-900'
          }`}
        >
          <Edit className="w-4 h-4 text-emerald-600" />
          <span>ලියාපදිංචි පුවරුව (Text Edit)</span>
        </button>

        <button
          onClick={() => setActiveTab('categories_edit')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'categories_edit'
              ? 'bg-white border-emerald-500 text-emerald-900 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Categories හා ෆෝරම</span>
          <span className="bg-emerald-700 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
            {categoryItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('posts_edit')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'posts_edit'
              ? 'bg-white border-emerald-500 text-emerald-900 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-900'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>දැන්වීම් සවිස්තර (Posts)</span>
          {helpPosts.length > 0 && (
            <span className="bg-purple-700 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
              {helpPosts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tags_edit')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'tags_edit'
              ? 'bg-white border-emerald-500 text-emerald-900 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-900'
          }`}
        >
          <Tag className="w-4 h-4 text-emerald-600" />
          <span>Tag කළමනාකරණය (Tags)</span>
          <span className="bg-emerald-800 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
            {tagItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs sm:text-sm rounded-t-2xl border-t-2 border-x-2 transition-all cursor-pointer ${
            activeTab === 'issues'
              ? 'bg-white border-emerald-500 text-emerald-900 shadow-md font-black'
              : 'bg-emerald-50/80 border-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-900'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>{t.reportedIssuesTab}</span>
          {pendingIssues.length > 0 && (
            <span className="bg-teal-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
              {pendingIssues.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Pending Approvals */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex items-center justify-between text-amber-900 shadow-sm">
            <p className="text-xs font-bold">
              💡 <strong>පියවර 1.1 (Admin Approval Logic):</strong> පරිශීලකයින් ලියාපදිංචි වූ පසු ඔවුන්ගේ ඡායාරූපය සහ විස්තර බලා <strong>"Accept"</strong> කළ පසු පමණක් ඔවුන්ට ලොග් වීමට ඉඩ ලැබෙනු ඇත.
            </p>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="bg-white border-2 border-emerald-200 rounded-3xl p-12 text-center text-slate-600 shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-lg font-black text-slate-900 mb-1">
                අනුමැතිය සඳහා පොරොත්තු ගිණුම් නැත
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                සියලු පරිශීලකයින් අනුමත කර (Accept) ඇත.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white border-2 border-amber-300 rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex gap-3 items-center">
                      <div
                        onClick={() => openInspectorForUser(user, 'face')}
                        className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md bg-slate-100 flex-shrink-0 cursor-pointer relative group"
                        title="Click to inspect face photo in Full HD"
                      >
                        {user.photoUrl && user.photoUrl.trim() !== '' ? (
                          <img
                            src={user.photoUrl}
                            alt={user.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-xl">
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
                          <Eye className="w-5 h-5 mb-0.5" />
                          <span className="text-[9px] font-bold">HD</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base">
                          {user.name}
                        </h4>
                        <p className="text-xs font-mono font-extrabold text-amber-800">
                          ID: {user.userId}
                        </p>
                        <p className="text-xs font-mono font-bold text-slate-600">
                          NIC: {user.nicNumber}
                        </p>
                      </div>
                    </div>

                    <span className="bg-amber-100 text-amber-900 border-2 border-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                      PENDING
                    </span>
                  </div>

                  {/* High-Clarity Registration Documents & Photos Inspection Bar */}
                  <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 p-3 rounded-2xl border-2 border-emerald-500/40 text-white space-y-2 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ලියාපදිංචි ලේඛන / ඡායාරූප (3 Documents)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => openInspectorForUser(user, 'nicFront')}
                        className="text-[10px] font-bold text-emerald-200 bg-emerald-800/80 hover:bg-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-400/50 flex items-center gap-1 transition-all"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>පැහැදිලිව පරීක්ෂා කරන්න</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* 1. මුහුණේ ඡායාරූපය */}
                      <div
                        onClick={() => openInspectorForUser(user, 'face')}
                        className="bg-slate-800/90 hover:bg-slate-700/90 border border-emerald-400/40 rounded-xl p-1.5 cursor-pointer group transition-all text-center flex flex-col items-center justify-between"
                        title="Click to view Face Photo in HD"
                      >
                        <div className="w-full h-16 rounded-lg overflow-hidden bg-slate-900 mb-1 relative">
                          {(user.facePhotoUrl || user.photoUrl) ? (
                            <img
                              src={user.facePhotoUrl || user.photoUrl}
                              alt="Face"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">නැත</div>
                          )}
                          <div className="absolute inset-0 bg-emerald-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-4 h-4 text-emerald-300" />
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-200 group-hover:text-emerald-300 line-clamp-1">
                          👤 මුහුණ
                        </span>
                      </div>

                      {/* 2. NIC ඉදිරිපස */}
                      <div
                        onClick={() => openInspectorForUser(user, 'nicFront')}
                        className="bg-slate-800/90 hover:bg-slate-700/90 border border-emerald-400/40 rounded-xl p-1.5 cursor-pointer group transition-all text-center flex flex-col items-center justify-between"
                        title="Click to view NIC Front Photo in HD"
                      >
                        <div className="w-full h-16 rounded-lg overflow-hidden bg-slate-900 mb-1 relative">
                          {(user.nicFrontPhotoUrl || user.idCardPhotoUrl) ? (
                            <img
                              src={user.nicFrontPhotoUrl || user.idCardPhotoUrl}
                              alt="NIC Front"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">නැත</div>
                          )}
                          <div className="absolute inset-0 bg-emerald-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-4 h-4 text-emerald-300" />
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-200 group-hover:text-emerald-300 line-clamp-1">
                          🪪 NIC ඉදිරිපස
                        </span>
                      </div>

                      {/* 3. NIC පසුපස */}
                      <div
                        onClick={() => openInspectorForUser(user, 'nicBack')}
                        className="bg-slate-800/90 hover:bg-slate-700/90 border border-emerald-400/40 rounded-xl p-1.5 cursor-pointer group transition-all text-center flex flex-col items-center justify-between"
                        title="Click to view NIC Back Photo in HD"
                      >
                        <div className="w-full h-16 rounded-lg overflow-hidden bg-slate-900 mb-1 relative">
                          {user.nicBackPhotoUrl ? (
                            <img
                              src={user.nicBackPhotoUrl}
                              alt="NIC Back"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">නැත</div>
                          )}
                          <div className="absolute inset-0 bg-emerald-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-4 h-4 text-emerald-300" />
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-200 group-hover:text-emerald-300 line-clamp-1">
                          🪪 NIC පසුපස
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 p-3 rounded-2xl text-xs space-y-1.5 border border-emerald-200 font-mono text-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-bold">දුරකථනය:</span>
                      <span className="text-slate-900 font-extrabold">{user.phone}</span>
                    </div>
                    {user.whatsappNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-bold">WhatsApp:</span>
                        <span className="text-emerald-800 font-extrabold">{user.whatsappNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-bold">ඊමේල් / Gmail:</span>
                      <span className="text-slate-900 font-semibold">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-bold">IP ලිපිනය:</span>
                      <span className="text-emerald-900 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300 font-black">{user.ipAddress || '112.134.120.45'}</span>
                    </div>
                    {user.deviceInfo && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-bold">උපාංගය (Device):</span>
                        <span className="text-slate-800 font-semibold">{user.deviceInfo}</span>
                      </div>
                    )}
                    {/* Live Tracked GPS Location */}
                    <div className="pt-2 mt-1 border-t border-emerald-200/80">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-slate-700 font-black flex items-center gap-1">
                          <Navigation className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                          <span>Tracked GPS Location:</span>
                        </span>
                        {user.registrationLat && user.registrationLng && (
                          <a
                            href={`https://www.google.com/maps?q=${user.registrationLat},${user.registrationLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-white hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300 shadow-sm transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-700" />
                            <span>Map එකේ බලන්න</span>
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-slate-800">
                        📍 {user.registrationLocationName || user.nearestTown || user.address || 'Colombo / Sri Lanka'}
                      </p>
                      {user.registrationLat && user.registrationLng && (
                        <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                          GPS: {user.registrationLat.toFixed(5)}°, {user.registrationLng.toFixed(5)}° (±{user.registrationAccuracy || 10}m)
                        </p>
                      )}
                    </div>
                    <div className="flex justify-between pt-1 border-t border-emerald-200/60">
                      <span className="text-slate-600 font-bold">ලියාපදිංචි වේලාව:</span>
                      <span className="text-slate-700 font-semibold">{user.registeredAt}</span>
                    </div>
                  </div>

                  {/* 6-Digit Random Verification Code / Passcode for Admin */}
                  <div className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-100/60 border-2 border-amber-400/90 rounded-2xl p-3.5 shadow-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                        <KeyRound className="w-4 h-4 text-amber-700 animate-pulse" />
                        <span>අහඹු පිවිසුම් කේතය (6-Digit Code)</span>
                      </span>
                      <span className="text-[10px] font-black text-amber-900 bg-amber-200 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-sm">
                        NIC + මෙම කේතය
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-2xl sm:text-3xl font-black text-amber-950 tracking-[0.2em] bg-white px-4 py-2 rounded-xl border-2 border-amber-300 shadow-inner flex items-center justify-center">
                        {user.securityCode || user.tempCode || user.key || '123456'}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const code = user.securityCode || user.tempCode || user.key || '123456';
                          navigator.clipboard.writeText(code);
                          alert(`අංක 6ක කේතය (${code}) කොපි කර ගන්නා ලදි!`);
                        }}
                        className="text-xs font-black text-amber-950 bg-amber-300 hover:bg-amber-400 active:scale-95 px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md border border-amber-400 cursor-pointer"
                        title="Copy Code"
                      >
                        <Copy className="w-4 h-4 text-amber-900" />
                        <span>Copy Code</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-amber-950 font-bold leading-relaxed bg-amber-200/40 p-2 rounded-xl border border-amber-300/60">
                      💡 පරිපාලක අවසරය (Accept) දුන් පසු, පරිශීලකයාට හැඳුනුම්පත් අංකය (NIC: <strong className="font-mono text-emerald-950">{user.nicNumber}</strong>) සහ මෙම <strong className="text-amber-900">අංක 6ක කේතය ({user.securityCode || user.tempCode || user.key || '123456'})</strong> ලබාදී Login විය හැක.
                    </p>
                  </div>

                  {/* PDF Download & Data Purge Bar for Pending User */}
                  <div className="flex items-center justify-between gap-2 p-2 bg-emerald-950/80 rounded-xl border border-emerald-500/40 text-white">
                    <button
                      onClick={() => handleDownloadUserPdf(user)}
                      disabled={pdfGeneratingUserId === user.id}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow transition-all disabled:opacity-50"
                      title={`PDF බාගත කරන්න (${user.nicNumber}.pdf)`}
                    >
                      {pdfGeneratingUserId === user.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Download PDF ({user.pdfDownloadCount || 0})</span>
                    </button>

                    {user.personalDetailsPurged ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Data Purged</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePurgePersonalDetails(user)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                        title="පෞද්ගලික තොරතුරු Delete කරන්න"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        <span>Delete Data</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => onApproveUser(user.id)}
                      className="btn-3d-green text-white font-black py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept</span>
                    </button>

                    <button
                      onClick={() => handleOpenUserModal(user)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black py-2.5 rounded-xl border-2 border-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer text-xs shadow-sm"
                    >
                      <Edit className="w-4 h-4 text-emerald-700" />
                      <span>විස්තර</span>
                    </button>

                    <button
                      onClick={() => {
                        const reason = prompt('ප්‍රතික්ෂේප කිරීමට හේතුව (Optional):');
                        onRejectUser(user.id, reason || undefined);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 rounded-xl shadow-md border-b-2 border-rose-800 transition-all flex items-center justify-center gap-1 cursor-pointer text-xs"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: User Directory & Management Section (සියලුම පරිශීලකයන්) */}
      {activeTab === 'all_users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border-2 border-emerald-200 shadow-md">
            <div className="flex items-center gap-3 bg-emerald-50/80 px-4 py-2.5 rounded-xl border-2 border-emerald-200 w-full sm:w-80">
              <Search className="w-4 h-4 text-emerald-700" />
              <input
                type="text"
                placeholder="නම, ID, NIC, දුරකථන, Gmail, IP මගින් සොයන්න..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-slate-900 text-xs focus:outline-none placeholder-slate-500 font-bold"
              />
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {['all', 'approved', 'pending', 'rejected', 'blocked'].map((st) => (
                <button
                  key={st}
                  onClick={() => setUserStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black capitalize transition-all cursor-pointer ${
                    userStatusFilter === st
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 border border-slate-200'
                  }`}
                >
                  {st === 'all' ? 'සියල්ල' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border-2 border-emerald-200 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-emerald-800 text-white uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4 font-black">පරිශීලක (User)</th>
                    <th className="p-4 font-black">User ID / NIC</th>
                    <th className="p-4 font-black">දුරකථන / Gmail</th>
                    <th className="p-4 font-black">IP Address</th>
                    <th className="p-4 font-black">තත්ත්වය (Status)</th>
                    <th className="p-4 text-right font-black">ක්‍රියාකාරකම් (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                        පරිශීලකයන් කිසිවෙකු හමු නොවීය.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isUserBlocked = u.status === 'blocked';

                      return (
                        <tr key={u.id} className="hover:bg-emerald-50/50 transition-colors">
                          <td className="p-4 font-extrabold text-slate-900 flex items-center gap-3">
                            <img
                              src={(u.photoUrl && u.photoUrl.trim() !== '') ? u.photoUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                              alt={u.name}
                              className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-300 shadow-md cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => openInspectorForUser(u, 'face')}
                              title="Click to inspect user photos in HD"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black text-slate-900">{u.name}</span>
                                {u.role === 'admin' && (
                                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-mono px-1.5 py-0.2 rounded font-black">
                                    ADMIN
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-bold font-mono block">
                                {u.address || 'ලිපිනය සපයා නැත'}
                              </span>
                            </div>
                          </td>

                          <td className="p-4 font-mono">
                            <span className="text-emerald-800 font-black block">{u.userId}</span>
                            <span className="text-slate-600 text-[11px] font-bold">{u.nicNumber}</span>
                          </td>

                          <td className="p-4 font-mono">
                            <span className="text-slate-900 font-bold block">{u.phone}</span>
                            <span className="text-slate-600 text-[11px] font-semibold block truncate max-w-[160px]">
                              {u.email}
                            </span>
                          </td>

                          <td className="p-4 font-mono">
                            <span className="text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300 text-[11px] font-black">
                              {u.ipAddress || '192.168.1.102'}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-center ${
                                  u.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : u.status === 'blocked'
                                    ? 'bg-rose-100 text-rose-900 border border-rose-300 font-black animate-pulse'
                                    : u.status === 'rejected'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                              >
                                {u.status}
                              </span>

                              {u.personalDetailsPurged && (
                                <span className="inline-flex items-center justify-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded-md">
                                  <Shield className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Data Purged</span>
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* PDF Download Button */}
                              <button
                                onClick={() => handleDownloadUserPdf(u)}
                                disabled={pdfGeneratingUserId === u.id}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-[11px] shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title={`PDF බාගත කරන්න (${u.nicNumber}.pdf)`}
                              >
                                {pdfGeneratingUserId === u.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                <span>PDF ({u.pdfDownloadCount || 0})</span>
                              </button>

                              {/* View & Edit Profile Button */}
                              <button
                                onClick={() => handleOpenUserModal(u)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-[11px] border border-slate-300 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                              >
                                <Edit className="w-3.5 h-3.5 text-emerald-700" />
                                <span>විස්තර</span>
                              </button>

                              {/* Block / Unblock Button */}
                              {isUserBlocked ? (
                                <button
                                  onClick={() => {
                                    if (onUpdateUser) {
                                      onUpdateUser({ ...u, status: 'approved' });
                                      alert(`පරිශීලක ${u.name} ගේ අවහිරතාවය (Block) සාර්ථකව ඉවත් කරන ලදී.`);
                                    }
                                  }}
                                  className="btn-3d-green text-white font-black text-[11px] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Unblock</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    handleOpenUserModal(u);
                                    setModalSubTab('profile');
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Block</span>
                                </button>
                              )}
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

      {/* Tab 3: Blocked Credentials List */}
      {activeTab === 'blocked_list' && (
        <div className="space-y-4">
          <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-900 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">
              <strong>ආරක්ෂිත නීති (Blocked Blacklist):</strong> පරිශීලකයෙකු Block කළ පසු එම ගිණුමේ <strong>දුරකථන අංකය, ජා.හැ. අංකය, Gmail ලිපිනය සහ IP ලිපිනය</strong> පද්ධතිය මගින් අවහිර වේ. මෙම එකම ක්‍රමයකින්වත් නැවත පද්ධතියට ලියාපදිංචි වීමට හෝ ඇතුළු වීමට ඉඩ නොලැබේ.
            </p>
          </div>

          <div className="bg-white border-2 border-rose-200 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b-2 border-rose-100 flex justify-between items-center bg-rose-50/50">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>අවහිර කරන ලද දත්ත ලැයිස්තුව (Blocked Credentials)</span>
              </h3>
              <span className="text-xs font-mono font-bold text-slate-600">
                එකතුව: {blockedCredentials.length} entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-rose-800 text-white uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4 font-black">අවහිර වූ පරිශීලක</th>
                    <th className="p-4 font-black">Blocked Phone</th>
                    <th className="p-4 font-black">Blocked NIC</th>
                    <th className="p-4 font-black">Blocked Gmail</th>
                    <th className="p-4 font-black">Blocked IP</th>
                    <th className="p-4 font-black">හේතුව සහ දිනය</th>
                    <th className="p-4 text-right font-black">ක්‍රියාව</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100">
                  {blockedCredentials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                        දැනට අවහිර කළ දත්ත (Blocked Credentials) කිසිවක් නැත.
                      </td>
                    </tr>
                  ) : (
                    blockedCredentials.map((bc) => (
                      <tr key={bc.id} className="hover:bg-rose-50/40">
                        <td className="p-4 font-extrabold text-slate-900">
                          <span>{bc.userName || 'පරිශීලක'}</span>
                          <span className="text-[10px] text-slate-500 font-mono block font-bold">ID: {bc.userId}</span>
                        </td>
                        <td className="p-4 font-mono text-rose-800 font-extrabold">{bc.phone || '-'}</td>
                        <td className="p-4 font-mono text-rose-800 font-extrabold">{bc.nicNumber || '-'}</td>
                        <td className="p-4 font-mono text-rose-800 font-extrabold">{bc.email || '-'}</td>
                        <td className="p-4 font-mono text-emerald-800 font-black">{bc.ipAddress || '-'}</td>
                        <td className="p-4">
                          <span className="text-slate-900 font-bold block">{bc.reason}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-semibold">{bc.blockedAt}</span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              if (onUnblockCredential) {
                                onUnblockCredential(bc.id);
                                alert('අවහිරතාවය (Unblock) සාර්ථකව ඉවත් කෙරිණි.');
                              }
                            }}
                            className="btn-3d-green text-white font-black text-[11px] px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            Unblock
                          </button>
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

      {/* Tab 4: Reported Issues */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-2xl flex items-center justify-between">
            <p className="text-xs text-cyan-300 font-medium">
              💡 <strong>පියවර 1.3 (Page 1.2 Issues Desk):</strong> පරිශීලකයින් "ඔබගේ ගැටලුව කුමක්ද?" ෆෝම් එකෙන් යොමු කළ සියලු ගැටලු මෙහි ලැබෙනු ඇත.
            </p>
          </div>

          {issues.length === 0 ? (
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-12 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-cyan-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold text-white mb-1">
                ගැටලු කිසිවක් වාර්තා වී නැත
              </h3>
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 shadow-xl space-y-4 backdrop-blur-md"
                >
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                          {issue.issueCode}
                        </span>
                        <span className="text-xs font-bold text-amber-400">
                          {issue.category}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white">
                        {issue.title}
                      </h4>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${
                        issue.status === 'resolved'
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      }`}
                    >
                      {issue.status === 'resolved' ? t.resolvedStatus : t.pendingStatus}
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5">
                    "{issue.description}"
                  </p>

                  {/* Issue Image Attachment if present */}
                  {issue.attachmentUrl && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl">
                      <div
                        onClick={() => openInspectorSingleUrl(issue.attachmentUrl!, `Issue #${issue.issueCode} Attachment`)}
                        className="w-16 h-16 rounded-xl overflow-hidden bg-black/80 border-2 border-emerald-400 cursor-pointer relative group shrink-0"
                        title="Click to view HD Image"
                      >
                        <img
                          src={issue.attachmentUrl}
                          alt="Issue Attachment"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold">
                          HD
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-300 block">අමුණන ලද ඡායාරූපය / Screenshot</span>
                        <button
                          type="button"
                          onClick={() => openInspectorSingleUrl(issue.attachmentUrl!, `Issue #${issue.issueCode} Attachment`)}
                          className="text-[11px] text-cyan-400 font-bold hover:underline cursor-pointer flex items-center gap-1 mt-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>විශාල කර බලන්න (Inspect Image)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 bg-slate-800/50 p-3 rounded-xl border border-white/5 font-mono">
                    <span>පරිශීලක: <strong>{issue.userName}</strong> • WhatsApp: <strong>{issue.userPhone}</strong></span>
                    <span>දිනය: {issue.createdAt}</span>
                  </div>

                  <div className="bg-slate-800/80 p-4 rounded-2xl border border-white/10 space-y-3">
                    <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                      {t.replyToIssue} (User Notification)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="පරිශීලකයාට යැවීමට පිළිතුරක් ඇතුලත් කරන්න..."
                      value={replyTextMap[issue.id] ?? issue.adminReply ?? ''}
                      onChange={(e) => handleReplyChange(issue.id, e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-slate-100 text-xs focus:outline-none focus:border-cyan-500/70"
                    />

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          const reply = replyTextMap[issue.id] || 'ඔබගේ ගැටලුව සම්බන්ධයෙන් ක්‍රියාකරමින් පවතී.';
                          onReplyIssue(issue.id, reply, false);
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs border border-white/10 transition-all cursor-pointer"
                      >
                        {t.sendReplyBtn}
                      </button>

                      <button
                        onClick={() => {
                          const reply = replyTextMap[issue.id] || 'ඔබගේ ගැටලුව විසඳන ලදී.';
                          onReplyIssue(issue.id, reply, true);
                        }}
                        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md border-b-2 border-cyan-800 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t.markResolved}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Registration Text Edit */}
      {activeTab === 'registration_edit' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-950 shadow-sm">
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Edit className="w-4 h-4 text-emerald-700" />
                <span>ලියාපදිංචි පෝරමයේ පෙළ සෘජුවම Edit කිරීම (Registration Board Text Management)</span>
              </h3>
              <p className="text-xs text-slate-700 font-medium">
                ලියාපදිංචි වීමේ පෝරමයේ ඇති ප්‍රධාන මාතෘකාව, උප මාතෘකාව, දැනුම්දීමේ බැනර් සටහන (Notice Banner Box) සහ කොන්දේසි සිංහල, ඉංග්‍රීසි සහ දෙමළ භාෂාවලින් මෙහිදී සෘජුවම වෙනස් කර සුරැකිය හැක.
              </p>
            </div>
          </div>

          {/* Language selector tabs */}
          <div className="flex gap-2 border-b-2 border-emerald-200 pb-2">
            {(['si', 'en', 'ta'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setRegEditLang(l)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  regEditLang === l
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'bg-white text-slate-700 hover:bg-emerald-100 border border-slate-200'
                }`}
              >
                {l === 'si' ? 'සිංහල (Sinhala)' : l === 'en' ? 'English' : 'தமிழ் (Tamil)'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Fields for Selected Language */}
            <div className="bg-white border-2 border-emerald-200 rounded-3xl p-6 shadow-xl space-y-4">
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2 border-b pb-2">
                <Save className="w-4 h-4 text-emerald-700" />
                <span>
                  {regEditLang === 'si' ? 'සිංහල' : regEditLang === 'en' ? 'English' : 'දෙමළ'} පාඨ වෙනස් කරන්න
                </span>
              </h4>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  01. ප්‍රධාන මාතෘකාව (Main Title)
                </label>
                <input
                  type="text"
                  value={regState.mainTitle[regEditLang] || ''}
                  onChange={(e) =>
                    setRegState({
                      ...regState,
                      mainTitle: { ...regState.mainTitle, [regEditLang]: e.target.value },
                    })
                  }
                  className="w-full bg-emerald-50/50 border-2 border-emerald-200 rounded-xl p-3 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  02. උප මාතෘකාව (Subtitle)
                </label>
                <textarea
                  rows={2}
                  value={regState.subtitle[regEditLang] || ''}
                  onChange={(e) =>
                    setRegState({
                      ...regState,
                      subtitle: { ...regState.subtitle, [regEditLang]: e.target.value },
                    })
                  }
                  className="w-full bg-emerald-50/50 border-2 border-emerald-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-amber-900 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>03. දැනුම්දීමේ බැනර් සටහන (Notice Banner Box)</span>
                </label>
                <textarea
                  rows={2}
                  value={regState.noticeBanner[regEditLang] || ''}
                  onChange={(e) =>
                    setRegState({
                      ...regState,
                      noticeBanner: { ...regState.noticeBanner, [regEditLang]: e.target.value },
                    })
                  }
                  className="w-full bg-amber-50/50 border-2 border-amber-300 rounded-xl p-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>04. ලියාපදිංචි වීමේ කොන්දේසි (Terms & Conditions)</span>
                </label>
                <textarea
                  rows={4}
                  value={regState.termsAndConditions[regEditLang] || ''}
                  onChange={(e) =>
                    setRegState({
                      ...regState,
                      termsAndConditions: { ...regState.termsAndConditions, [regEditLang]: e.target.value },
                    })
                  }
                  className="w-full bg-emerald-50/50 border-2 border-emerald-200 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <button
                onClick={() => {
                  if (onUpdateRegistrationConfig) {
                    onUpdateRegistrationConfig(regState);
                    alert('ලියාපදිංචි පුවරුවේ පෙළ සාර්ථකව යාවත්කාලීන කර සුරකින ලදී!');
                  }
                }}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 text-xs cursor-pointer shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                <span>ලියාපදිංචි පුවරුවේ පෙළ සුරකින්න (Save Settings)</span>
              </button>
            </div>

            {/* Live Preview Card */}
            <div className="bg-slate-900 border-2 border-emerald-400 rounded-3xl p-6 shadow-2xl text-white space-y-4">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-xs font-mono font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Eye className="w-4 h-4" /> Live Board Preview ({regEditLang.toUpperCase()})
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  පරිශීලකයන්ට පෙනෙන ආකාරය
                </span>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-white/10 space-y-4">
                <div className="text-center">
                  <h3 className="text-xl font-extrabold text-white mb-1">
                    {regState.mainTitle[regEditLang] || 'ලියාපදිංචිය'}
                  </h3>
                  <p className="text-slate-300 text-xs">
                    {regState.subtitle[regEditLang] || 'විස්තර ඇතුළත් කරන්න'}
                  </p>
                </div>

                {regState.noticeBanner[regEditLang] && (
                  <div className="bg-amber-500/20 border border-amber-400/50 p-3 rounded-xl text-amber-200 text-xs font-semibold leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{regState.noticeBanner[regEditLang]}</span>
                  </div>
                )}

                <div className="bg-slate-900 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                  <div className="text-cyan-400 font-bold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>ලියාපදිංචි වීමේ කොන්දේසි</span>
                  </div>
                  <p className="text-slate-300 text-[11px] whitespace-pre-line leading-relaxed">
                    {regState.termsAndConditions[regEditLang]}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Categories & Forms */}
      {activeTab === 'categories_edit' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-950 shadow-sm">
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>Category කළමනාකරණය හා දැන්වීම් පෝරම (Categories & Ad Forms)</span>
              </h3>
              <p className="text-xs text-slate-700 font-medium">
                අලුතින් Category එකතු කිරීම, පවතින Category වල නම/විස්තරය Edit කිරීම, ඉවත් කිරීම සහ ඒ ඒ Category වලට අදාළ Dynamic Form Fields (Short Text, Textarea, Number, Dropdown, Checkbox) කළමනාකරණය මෙහිදී සිදුකළ හැක.
              </p>
            </div>

            <button
              onClick={() => {
                setCatFormState({
                  id: `cat_${Date.now()}`,
                  nameSi: '',
                  nameEn: '',
                  nameTa: '',
                  descSi: '',
                  descEn: '',
                  descTa: '',
                  icon: 'Sparkles',
                });
                setShowAddCatModal(true);
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2.5 rounded-xl shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>අලුත් Category එකක් එකතු කරන්න</span>
            </button>
          </div>

          {/* Section 1: Categories Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryItems.map((cat) => {
              const isSelectedForFields = selectedCatForFields === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`bg-white border-2 rounded-3xl p-5 shadow-lg space-y-3 relative transition-all ${
                    isSelectedForFields ? 'border-emerald-500 ring-2 ring-emerald-400/50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-black">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          {cat.nameSi}
                        </h4>
                        <span className="text-[10px] font-mono font-extrabold text-emerald-700 block">
                          ID: {cat.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCatModal(cat);
                          setCatFormState({
                            id: cat.id,
                            nameSi: cat.nameSi,
                            nameEn: cat.nameEn,
                            nameTa: cat.nameTa,
                            descSi: cat.descSi,
                            descEn: cat.descEn,
                            descTa: cat.descTa,
                            icon: cat.icon || 'Sparkles',
                          });
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`ඔබට "${cat.nameSi}" Category එක පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍යද?`)) {
                            const updated = categoryItems.filter((c) => c.id !== cat.id);
                            setCategoryItems(updated);
                            if (onUpdateCategories) onUpdateCategories(updated);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 transition-all cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-medium line-clamp-2">
                    {cat.descSi}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      Form Fields: {cat.customFields?.length || 0} ක්
                    </span>
                    <button
                      onClick={() => setSelectedCatForFields(cat.id)}
                      className={`text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        isSelectedForFields
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {isSelectedForFields ? 'තෝරාගෙන ඇත ✓' : 'Form Fields පාලනය'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section 2: Custom Form Fields Management for Selected Category */}
          {selectedCatObj && (
            <div className="bg-white border-2 border-emerald-300 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-2 border-emerald-100 pb-4">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-700" />
                    <span>"{selectedCatObj.nameSi}" සඳහා වන Ad Form Questions / Fields</span>
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    මෙම Category එකේ දැන්වීම් පළකරන විට පරිශීලකයාගෙන් අසන ප්‍රශ්න/විස්තර ක්ෂේත්‍ර.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setFieldFormState({
                      labelSi: '',
                      labelEn: '',
                      labelTa: '',
                      fieldType: 'text',
                      options: '',
                      required: false,
                    });
                    setShowAddFieldModal(true);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>අලුත් Field එකක් එකතු කරන්න</span>
                </button>
              </div>

              {(!selectedCatObj.customFields || selectedCatObj.customFields.length === 0) ? (
                <div className="p-8 text-center text-slate-600 font-bold bg-emerald-50/50 rounded-2xl border border-emerald-200">
                  මෙම Category එක සඳහා විශේෂිත Form Fields තවම සකසා නැත. "+ අලුත් Field එකක් එකතු කරන්න" ඔබන්න.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(selectedCatObj.customFields || []).map((f) => (
                    <div
                      key={f.id}
                      className="bg-emerald-50/60 border-2 border-emerald-200 rounded-2xl p-4 space-y-2 relative"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h5 className="font-extrabold text-slate-900 text-xs">
                            {f.labelSi}
                          </h5>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            Type: <strong className="text-emerald-800 uppercase">{f.fieldType}</strong> {f.required ? '• (Required)' : '• (Optional)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingFieldModal(f);
                              setFieldFormState({
                                labelSi: f.labelSi,
                                labelEn: f.labelEn,
                                labelTa: f.labelTa,
                                fieldType: f.fieldType,
                                options: f.options ? f.options.join(', ') : '',
                                required: f.required,
                              });
                            }}
                            className="p-1 rounded bg-white text-slate-700 border border-slate-300 text-xs cursor-pointer hover:bg-slate-100"
                            title="Edit Field"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const updatedFields = (selectedCatObj.customFields || []).filter((cf) => cf.id !== f.id);
                              const updatedCatList = categoryItems.map((c) =>
                                c.id === selectedCatObj.id ? { ...c, customFields: updatedFields } : c
                              );
                              setCategoryItems(updatedCatList);
                              if (onUpdateCategories) onUpdateCategories(updatedCatList);
                            }}
                            className="p-1 rounded bg-rose-100 text-rose-700 border border-rose-300 text-xs cursor-pointer hover:bg-rose-200"
                            title="Delete Field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {f.fieldType === 'dropdown' && f.options && (
                        <div className="bg-white p-2 rounded-xl border border-emerald-200 text-[11px] text-slate-700 space-y-1">
                          <span className="font-bold text-slate-900 block">Options:</span>
                          <p className="font-mono text-emerald-800">{f.options.join(' | ')}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 7: Posts Management */}
      {activeTab === 'posts_edit' && (
        <div className="space-y-4">
          {/* Admin Action Notification Alert */}
          {adminActionNotification && (
            <div className="bg-emerald-800 text-white p-3.5 rounded-2xl font-black text-xs flex items-center justify-between gap-2 shadow-lg border border-emerald-500 animate-fadeIn">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span>{adminActionNotification}</span>
              </span>
              <button
                type="button"
                onClick={() => setAdminActionNotification(null)}
                className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-950 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-950 shadow-sm">
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-700" />
                <span>පරිශීලක දැන්වීම් සහ ඉල්ලීම් පාලනය (Help Posts Content Control)</span>
              </h3>
              <p className="text-xs text-slate-700 font-medium">
                පරිශීලකයින් විසින් පළකර ඇති දැන්වීම්වල සිදුවී ඇති දේ, වියයුතු දේ, ගෙවීම්, ස්ථානය සහ කොන්දේසි සෘජුවම Edit කිරීම හෝ ඉවත් කිරීම මෙහිදී සිදුකළ හැක.
              </p>
            </div>
          </div>

          {/* Dedicated Backup & Restore Card */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 border-2 border-amber-400/80 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-white shadow-2xl">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300/50 flex items-center justify-center shrink-0 shadow-inner">
                <Database className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-amber-200 flex items-center gap-2">
                  <span>දැන්වීම් & Chat History Backup / Restore</span>
                  <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Full Data Backup
                  </span>
                </h4>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  පලකරන ලද සියලුම දැන්වීම්, එම දැන්වීමට අදාළ සියලු විස්තර (දැන්වීම ලැයිස්තුගත ස්ථාන, Chat history, ගණුදෙනු) Backup කිරීමට හා Restore කිරීමට පහත බොත්තම් භාවිතා කරන්න.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleBackupPosts}
                disabled={isBackingUp}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin text-slate-900" /> : <Download className="w-4 h-4 text-slate-900" />}
                <span>{isBackingUp ? 'Backup වෙනවා...' : '📦 Backup කරන්න'}</span>
              </button>

              <label className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer">
                {isRestoring ? <Loader2 className="w-4 h-4 animate-spin text-slate-900" /> : <FileDown className="w-4 h-4 text-slate-900" />}
                <span>{isRestoring ? 'Restore වෙනවා...' : '📥 Restore කරන්න'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestorePosts}
                  disabled={isRestoring}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border-2 border-emerald-200 shadow-md">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setAdminPostFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                  adminPostFilter === 'all'
                    ? 'bg-emerald-700 text-white shadow'
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                සියල්ල ({helpPosts.filter((p) => !p.isDeleted || (p.deletedAt && Date.now() - new Date(p.deletedAt).getTime() <= 3 * 86400000)).length})
              </button>
              <button
                type="button"
                onClick={() => setAdminPostFilter('active')}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                  adminPostFilter === 'active'
                    ? 'bg-emerald-700 text-white shadow'
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                සක්‍රීය ({helpPosts.filter((p) => !p.isDeleted).length})
              </button>
              <button
                type="button"
                onClick={() => setAdminPostFilter('deleted')}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                  adminPostFilter === 'deleted'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                🚨 Delete කළ දැන්වීම් ({helpPosts.filter((p) => p.isDeleted && p.deletedAt && Date.now() - new Date(p.deletedAt).getTime() <= 3 * 86400000).length})
              </button>
            </div>

            <div className="flex items-center gap-3 bg-emerald-50/80 px-4 py-2 rounded-xl border-2 border-emerald-200 w-full sm:w-72">
              <Search className="w-4 h-4 text-emerald-700" />
              <input
                type="text"
                placeholder="දැන්වීම් කේතය, නම, විස්තර මගින් සොයන්න..."
                value={postSearchQuery}
                onChange={(e) => setPostSearchQuery(e.target.value)}
                className="w-full bg-transparent text-slate-900 text-xs focus:outline-none placeholder-slate-500 font-bold"
              />
            </div>
          </div>

          {/* Posts Grid / Cards */}
          <div className="space-y-3">
            {filteredHelpPosts.length === 0 ? (
              <div className="bg-white border-2 border-emerald-200 rounded-3xl p-12 text-center text-slate-600 shadow-md">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold">දැන්වීම් කිසිවක් හමු නොවීය.</p>
              </div>
            ) : (
              (filteredHelpPosts || []).map((post) => (
                <div
                  key={post.id}
                  className={`bg-white border-2 ${
                    post.isDeleted ? 'border-rose-400 bg-rose-50/20' : 'border-emerald-200'
                  } rounded-3xl p-5 shadow-lg space-y-3 relative overflow-hidden`}
                >
                  {/* Deleted Banner Notice for Admin (Requirement 01) */}
                  {post.isDeleted && (
                    <div className="bg-rose-100 border-2 border-rose-500 text-rose-950 px-3.5 py-2 rounded-xl font-black text-xs flex flex-wrap items-center justify-between gap-2 shadow-sm">
                      <span className="flex items-center gap-1.5 text-rose-900">
                        <Trash2 className="w-4 h-4 text-rose-700" />
                        <span>🚨 Delete කරන ලදි. ({post.deletedBy || 'පරිශීලකයා විසින් මකා දමන ලදි'} • දින 3ක් පාලක මණ්ඩලයේ පෙන්වයි)</span>
                      </span>
                      <span className="bg-rose-200 text-rose-900 font-mono text-[11px] px-2.5 py-0.5 rounded-lg border border-rose-300">
                        {post.deletedAt ? new Date(post.deletedAt).toLocaleString('si-LK') : 'දැන්'}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[10px] font-black px-2.5 py-0.5 rounded-full">
                          {post.postCode}
                        </span>
                        <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                          {post.category || 'සාමාන්‍ය'}
                        </span>
                        <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          {post.locationName}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-base">
                        {post.userName} <span className="text-xs text-emerald-800 font-mono">({post.userPhone})</span>
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {!post.isDeleted && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPostForAdminEdit(post);
                            setEditPostFormState({
                              whatHappened: post.whatHappened,
                              whatIsNeeded: post.whatIsNeeded,
                              conditions: post.conditions || '',
                              transport: post.transport,
                              payment: post.payment,
                              locationName: post.locationName,
                              category: post.category || 'quick_services',
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs flex items-center gap-1 shadow-md cursor-pointer transition-all active:scale-95"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>විස්තර Edit කරන්න</span>
                        </button>
                      )}

                      {post.isDeleted ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleExecuteRestore(post)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                            title="Restore Post to Active Feed"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>නැවත සක්‍රීය කරන්න</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsPermanentDeleteRequested(true);
                              setPostToDelete(post);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                            title="Permanently Delete Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>සම්පූර්ණයෙන්ම ඉවත් කරන්න</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsPermanentDeleteRequested(false);
                            setPostToDelete(post);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                          title="Delete Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ඉවත් කරන්න</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-xs text-slate-800 font-mono">
                    <div>
                      <strong className="text-rose-900 block font-sans mb-0.5">📌 සිදුවී ඇති දේ (What Happened):</strong>
                      <p className="font-sans font-bold text-slate-900">{post.whatHappened}</p>
                    </div>
                    <div>
                      <strong className="text-cyan-900 block font-sans mb-0.5">🛠️ වියයුතු දේ (What Is Needed):</strong>
                      <p className="font-sans font-bold text-slate-900">{post.whatIsNeeded}</p>
                    </div>
                    <div>
                      <strong className="text-amber-900 block font-sans mb-0.5">📜 කොන්දේසි (Conditions):</strong>
                      <p className="font-sans font-semibold text-slate-800">{post.conditions || 'නොමැත'}</p>
                    </div>
                    <div>
                      <strong className="text-emerald-900 block font-sans mb-0.5">💰 ගෙවීම් & ගමනාගමනය:</strong>
                      <p className="font-sans font-bold text-slate-900">{post.payment} | {post.transport}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* DETAILED USER EDIT & POSTS MODAL */}
      {selectedUserForModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-3xl bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 px-6 py-4 border-b border-emerald-500/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={(selectedUserForModal.photoUrl && selectedUserForModal.photoUrl.trim() !== '') ? selectedUserForModal.photoUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                  alt={selectedUserForModal.name}
                  className="w-11 h-11 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                />
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <span>{selectedUserForModal.name}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                      ID: {selectedUserForModal.userId}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    පරිශීලක ගිණුම් කළමනාකරණය සහ දැන්වීම් අධීක්ෂණය
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Sub Tabs */}
            <div className="flex border-b border-white/10 bg-slate-950/60 px-6 pt-3 gap-3 shrink-0">
              <button
                onClick={() => setModalSubTab('profile')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalSubTab === 'profile'
                    ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit className="w-3.5 h-3.5" />
                <span>විස්තර සහ වෙනස් කිරීම් (Edit Profile)</span>
              </button>

              <button
                onClick={() => setModalSubTab('posts')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalSubTab === 'posts'
                    ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>පරිශීලකයාගේ දැන්වීම් ({userPosts.length})</span>
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950/40">
              {modalSubTab === 'profile' ? (
                <div className="space-y-5">
                  
                  {/* ADMIN PDF & DATA RETENTION / PURGE TOOLBAR */}
                  <div className="bg-gradient-to-r from-slate-900 via-emerald-950/70 to-slate-900 border-2 border-emerald-500/50 p-4 rounded-2xl shadow-lg space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/40 shrink-0">
                          <FileDown className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white flex items-center gap-2">
                            <span>පෞද්ගලික තොරතුරු PDF බාගත කිරීම සහ මතක ගබඩාව පාලනය</span>
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                              File: {selectedUserForModal.nicNumber || selectedUserForModal.userId}.pdf
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-300 mt-0.5">
                            ලියාපදිංචි පෞද්ගලික විස්තර හා ඡායාරූප PDF එකක් ලෙස බාගත කර පෞද්ගලික තොරතුරු Delete කළ හැක.
                          </p>
                        </div>
                      </div>

                      {/* Download Stats Badge */}
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-950/90 px-3.5 py-1.5 rounded-xl border border-emerald-500/40 text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">බාගත කළ වාර ගණන:</span>
                          <span className="text-xs font-black text-emerald-400 font-mono">
                            {selectedUserForModal.pdfDownloadCount || 0} වතාවක්
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-emerald-500/20">
                      {/* PDF Download Button */}
                      <button
                        onClick={() => handleDownloadUserPdf(selectedUserForModal)}
                        disabled={pdfGeneratingUserId === selectedUserForModal.id}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md border border-emerald-400/50 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                      >
                        {pdfGeneratingUserId === selectedUserForModal.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>PDF සකසමින් පවතී...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 text-emerald-200" />
                            <span>PDF බාගත කරන්න ({selectedUserForModal.nicNumber || selectedUserForModal.userId}.pdf)</span>
                          </>
                        )}
                      </button>

                      {/* Delete / Purge Personal Info Button */}
                      {selectedUserForModal.personalDetailsPurged ? (
                        <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs px-3.5 py-2 rounded-xl font-bold">
                          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            පෞද්ගලික තොරතුරු ඉවත් කර ඇත ({selectedUserForModal.personalDetailsPurgedAt || 'දැනට'}) • Login තොරතුරු (NIC, Phone, Key) සුරක්ෂිතව පවතී
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePurgePersonalDetails(selectedUserForModal)}
                          className="px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white font-black text-xs border border-rose-600/50 flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                          title="ඡායාරූප, ලිපිනය හා GPS ස්ථානය ඉවත් කර Login තොරතුරු පමණක් ඉතිරි කරයි"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400" />
                          <span>පෞද්ගලික තොරතුරු Delete කරන්න (Purge Personal Data)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Photo & Identity Document Previews - All 3 Documents */}
                  <div className="space-y-2 bg-slate-900/90 p-4 rounded-2xl border border-emerald-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-emerald-400 font-extrabold flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4" />
                        <span>ලියාපදිංචි ලේඛන සහ ඡායාරූප (3 Registration Documents)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ක්ලික් කර HD විශාල කර බලන්න
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* 1. මුහුණේ ඡායාරූපය */}
                      <div
                        onClick={() => openInspectorForUser(selectedUserForModal, 'face')}
                        className="bg-slate-800/90 border border-white/10 hover:border-emerald-400 rounded-xl p-2 cursor-pointer group transition-all flex flex-col justify-between"
                      >
                        <label className="text-[11px] uppercase tracking-wider text-slate-300 font-bold block mb-1 text-center">
                          👤 මුහුණේ ඡායාරූපය
                        </label>
                        <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-950 relative">
                          <img
                            src={(editingUserForm.photoUrl && editingUserForm.photoUrl.trim() !== '') ? editingUserForm.photoUrl : (selectedUserForModal.photoUrl && selectedUserForModal.photoUrl.trim() !== '') ? selectedUserForModal.photoUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                            alt="Profile"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-emerald-200 text-xs font-bold gap-1">
                            <ZoomIn className="w-4 h-4" />
                            <span>HD Inspect</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. NIC ඉදිරිපස */}
                      <div
                        onClick={() => openInspectorForUser(selectedUserForModal, 'nicFront')}
                        className="bg-slate-800/90 border border-white/10 hover:border-emerald-400 rounded-xl p-2 cursor-pointer group transition-all flex flex-col justify-between"
                      >
                        <label className="text-[11px] uppercase tracking-wider text-slate-300 font-bold block mb-1 text-center">
                          🪪 NIC ඉදිරිපස (Front)
                        </label>
                        <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-950 relative">
                          {(selectedUserForModal.nicFrontPhotoUrl || selectedUserForModal.idCardPhotoUrl) ? (
                            <img
                              src={(selectedUserForModal.nicFrontPhotoUrl && selectedUserForModal.nicFrontPhotoUrl.trim() !== '') ? selectedUserForModal.nicFrontPhotoUrl : (selectedUserForModal.idCardPhotoUrl && selectedUserForModal.idCardPhotoUrl.trim() !== '') ? selectedUserForModal.idCardPhotoUrl : 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80'}
                              alt="NIC Front"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">නැත</div>
                          )}
                          <div className="absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-emerald-200 text-xs font-bold gap-1">
                            <ZoomIn className="w-4 h-4" />
                            <span>HD Inspect</span>
                          </div>
                        </div>
                      </div>

                      {/* 3. NIC පසුපස */}
                      <div
                        onClick={() => openInspectorForUser(selectedUserForModal, 'nicBack')}
                        className="bg-slate-800/90 border border-white/10 hover:border-emerald-400 rounded-xl p-2 cursor-pointer group transition-all flex flex-col justify-between"
                      >
                        <label className="text-[11px] uppercase tracking-wider text-slate-300 font-bold block mb-1 text-center">
                          🪪 NIC පසුපස (Back)
                        </label>
                        <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-950 relative">
                          {selectedUserForModal.nicBackPhotoUrl ? (
                            <img
                              src={selectedUserForModal.nicBackPhotoUrl}
                              alt="NIC Back"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">පසුපස ඡායාරූපයක් නැත</div>
                          )}
                          <div className="absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-emerald-200 text-xs font-bold gap-1">
                            <ZoomIn className="w-4 h-4" />
                            <span>HD Inspect</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Edit Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                        සම්පූර්ණ නම (Name)
                      </label>
                      <input
                        type="text"
                        value={editingUserForm.name ?? ''}
                        onChange={(e) => setEditingUserForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                        ජාතික හැඳුනුම්පත් අංකය (NIC)
                      </label>
                      <input
                        type="text"
                        value={editingUserForm.nicNumber ?? ''}
                        onChange={(e) => setEditingUserForm((prev) => ({ ...prev, nicNumber: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                        දුරකථන අංකය (Phone)
                      </label>
                      <input
                        type="text"
                        value={editingUserForm.phone ?? ''}
                        onChange={(e) => setEditingUserForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                        Gmail / Email ලිපිනය
                      </label>
                      <input
                        type="email"
                        value={editingUserForm.email ?? ''}
                        onChange={(e) => setEditingUserForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                        ලිපිනය (Address)
                      </label>
                      <input
                        type="text"
                        value={editingUserForm.address ?? ''}
                        onChange={(e) => setEditingUserForm((prev) => ({ ...prev, address: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                        මුරපදය / Key
                      </label>
                      <input
                        type="text"
                        value={editingUserForm.key ?? ''}
                        onChange={(e) => setEditingUserForm((prev) => ({ ...prev, key: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                        ගිණුමේ තත්ත්වය (Account Status)
                      </label>
                      <select
                        value={editingUserForm.status ?? 'approved'}
                        onChange={(e) => setEditingUserForm((prev) => ({ ...prev, status: e.target.value as UserStatus }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                      >
                        <option value="approved">Approved (සක්‍රීය)</option>
                        <option value="pending">Pending (පොරොත්තු)</option>
                        <option value="rejected">Rejected (ප්‍රතික්ෂේපිත)</option>
                        <option value="blocked">Blocked (අවහිර කළ)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                        IP Address (කළමනාකරණය)
                      </label>
                      <input
                        type="text"
                        value={editingUserForm.ipAddress ?? '192.168.1.102'}
                        onChange={(e) => setEditingUserForm((prev) => ({ ...prev, ipAddress: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-cyan-400 font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Real-time GPS Location & IP Audit Panel */}
                  <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Navigation className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span>ලියාපදිංචි GPS ස්ථානය සහ උපාංග තොරතුරු (Verified GPS & IP Audit)</span>
                      </h4>
                      {selectedUserForModal.registrationLat && selectedUserForModal.registrationLng && (
                        <a
                          href={`https://www.google.com/maps?q=${selectedUserForModal.registrationLat},${selectedUserForModal.registrationLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded-xl shadow-md transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Google Maps හි බලන්න</span>
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/70 p-3 rounded-xl border border-white/5 font-mono text-slate-300">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">ස්ථානය (Location):</span>
                        <span className="text-white font-bold">
                          📍 {selectedUserForModal.registrationLocationName || selectedUserForModal.nearestTown || selectedUserForModal.address || 'Sri Lanka GPS Zone'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">GPS ඛණ්ඩාංක (Coordinates):</span>
                        <span className="text-emerald-400 font-bold">
                          {selectedUserForModal.registrationLat ? `${selectedUserForModal.registrationLat.toFixed(6)}°, ${selectedUserForModal.registrationLng?.toFixed(6)}°` : '6.9271° N, 79.8612° E'}
                          {selectedUserForModal.registrationAccuracy ? ` (±${selectedUserForModal.registrationAccuracy}m)` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">IP ලිපිනය (Client IP):</span>
                        <span className="text-cyan-400 font-bold">{selectedUserForModal.ipAddress || '112.134.120.45'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">උපාංගය (Device & Platform):</span>
                        <span className="text-slate-200 font-bold">{selectedUserForModal.deviceInfo || 'Web Client'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Save Changes Action Bar */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
                    <button
                      onClick={handleSaveUserEdit}
                      className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Save className="w-4 h-4" />
                      <span>වෙනස්කම් සුරකින් (Save Changes)</span>
                    </button>

                    {/* Block Account Section */}
                    <div className="flex items-center gap-2 bg-red-950/60 p-2 rounded-2xl border border-red-500/30">
                      <input
                        type="text"
                        placeholder="Block කිරීමට හේතුව..."
                        value={blockReasonInput}
                        onChange={(e) => setBlockReasonInput(e.target.value)}
                        className="bg-slate-900 border border-red-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none w-56"
                      />
                      <button
                        onClick={handleConfirmBlockUser}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>ගිණුම Block කරන්න</span>
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                /* Modal Sub Tab 2: User's Posts */
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-900/80 p-3 rounded-2xl border border-white/10">
                    <span className="text-xs font-bold text-slate-300">
                      {selectedUserForModal.name} විසින් ඇතුලත් කළ සියලුම දැන්වීම් ({userPosts.length})
                    </span>
                  </div>

                  {userPosts.length === 0 ? (
                    <div className="bg-slate-900/60 p-8 rounded-2xl border border-white/10 text-center text-slate-400 space-y-2">
                      <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-xs">
                        මෙම පරිශීලකයා විසින් තවම කිසිදු දැන්වීමක් හෝ ඉල්ලීමක් ඇතුළත් කර නොමැත.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(userPosts || []).map((post) => (
                        <div
                          key={post.id}
                          className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 shadow-md space-y-3 relative"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                                  {post.postCode}
                                </span>
                                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                                  {post.category || 'සාමාන්‍ය (General)'}
                                </span>
                              </div>
                              <h4 className="font-bold text-white text-sm mt-1">
                                {post.whatHappened}
                              </h4>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setIsPermanentDeleteRequested(false);
                                setPostToDelete(post);
                              }}
                              className="p-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/40 border border-red-500/30 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                              title="Delete Post"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="hidden sm:inline">ඉවත් කරන්න</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-white/5 font-mono">
                            <div>
                              <span className="text-slate-400 block text-[10px]">වියයුතු දේ:</span>
                              <span>{post.whatIsNeeded}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">ස්ථානය සහ ගෙවීම්:</span>
                              <span className="text-amber-300">{post.locationName} | {post.payment}</span>
                            </div>
                          </div>

                          {/* Category Edit Control for Admin */}
                          <div className="bg-slate-800/80 p-3 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-300">
                              දැන්වීම් වර්ගය (Category) වෙනස් කරන්න:
                            </span>
                            <select
                              value={post.category || 'හදිසි අවස්ථා සහ රෝගී සේවා'}
                              onChange={(e) => {
                                const newCat = e.target.value;
                                if (onUpdatePost) {
                                  onUpdatePost({ ...post, category: newCat });
                                  alert(`දැන්වීම් #${post.postCode} හි Category එක "${newCat}" ලෙස සාර්ථකව වෙනස් කරන ලදී!`);
                                }
                              }}
                              className="bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-bold focus:outline-none"
                            >
                              <option value="හදිසි අවස්ථා සහ රෝගී සේවා">හදිසි අවස්ථා සහ රෝගී සේවා</option>
                              <option value="වාහන අලුත්වැඩියා සහ ප්‍රවාහන">වාහන අලුත්වැඩියා සහ ප්‍රවාහන</option>
                              <option value="ගෘහස්ථ සහ කාර්මික සේවා">ගෘහස්ථ සහ කාර්මික සේවා</option>
                              <option value="තාක්ෂණික සහ පරිගණක">තාක්ෂණික සහ පරිගණක</option>
                              <option value="පිරිසිදු කිරීම් සහ නඩත්තු">පිරිසිදු කිරීම් සහ නඩත්තු</option>
                              <option value="වෙනත් සේවා">වෙනත් සේවා</option>
                            </select>
                          </div>

                          <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                            <span>දිනය: {post.createdAt}</span>
                            <span>ප්‍රතිචාර: {post.repliesCount} | Helpers: {post.helpersCount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Tab: Tag Management */}
      {activeTab === 'tags_edit' && (
        <div className="space-y-6">
          {/* Top Info Banner & Action Controls */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border-2 border-emerald-500/40 p-6 rounded-3xl text-white shadow-xl space-y-4">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Tag className="w-6 h-6 text-emerald-400" />
                  <span>Tag කළමනාකරණය (Tag Management)</span>
                </h3>
                <p className="text-xs text-slate-300">
                  දැන්වීම් සදහා ඇතුලත් නොකල Tag සියල්ල ඉවත් කිරීම, වෙනස් කිරීම සහ නව Tag එකතු කිරීම මෙතැනින් සිදුකළ හැක.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handlePurgeUnusedTags}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Remove all tags not assigned to any post"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>දැන්වීම් සඳහා ඇතුළත් නොකළ Tag සියල්ල ඉවත් කරන්න</span>
                </button>

                <button
                  onClick={() => {
                    setTagFormState({ tagName: '', category: '' });
                    setShowAddTagModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>නව Tag එකක් එකතු කරන්න</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-300 uppercase font-bold block">මුළු Tag ගණන</span>
                  <span className="text-xl font-black font-mono text-emerald-300">{tagItems.length}</span>
                </div>
                <Tag className="w-6 h-6 text-emerald-400 opacity-60" />
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-300 uppercase font-bold block">භාවිත කර ඇති Tags</span>
                  <span className="text-xl font-black font-mono text-teal-300">
                    {tagItems.filter((t) => helpPosts.some((p) => p.tagId === t.id || p.tagName?.toLowerCase() === t.tagName.toLowerCase())).length}
                  </span>
                </div>
                <CheckCircle2 className="w-6 h-6 text-teal-400 opacity-60" />
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-300 uppercase font-bold block">භාවිත නොකළ Tags</span>
                  <span className="text-xl font-black font-mono text-rose-300">
                    {tagItems.filter((t) => !helpPosts.some((p) => p.tagId === t.id || p.tagName?.toLowerCase() === t.tagName.toLowerCase())).length}
                  </span>
                </div>
                <AlertTriangle className="w-6 h-6 text-rose-400 opacity-60" />
              </div>
            </div>
          </div>

          {/* Tag Search Bar */}
          <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                placeholder="Tag Name හෝ Category මඟින් සොයන්න..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="text-xs font-bold text-slate-500">
              පෙන්වන්නේ Tags {tagItems.filter(t => 
                !tagSearchQuery.trim() || 
                t.tagName.toLowerCase().includes(tagSearchQuery.toLowerCase()) || 
                t.category.toLowerCase().includes(tagSearchQuery.toLowerCase())
              ).length} ක්
            </div>
          </div>

          {/* Tags List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {tagItems
              .filter((t) => {
                const q = tagSearchQuery.toLowerCase().trim();
                if (!q) return true;
                return t.tagName.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
              })
              .map((tag) => {
                const usedInPostsCount = helpPosts.filter(
                  (p) => p.tagId === tag.id || p.tagName?.toLowerCase() === tag.tagName.toLowerCase()
                ).length;

                return (
                  <div
                    key={tag.id}
                    className="bg-white border-2 border-slate-200 hover:border-emerald-500 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 font-black text-xs rounded-xl border border-emerald-300">
                          <Tag className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{tag.tagName}</span>
                        </span>

                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono ${
                            usedInPostsCount > 0
                              ? 'bg-teal-100 text-teal-800 border border-teal-300'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {usedInPostsCount > 0 ? `දැන්වීම් ${usedInPostsCount} ක` : 'නොපවතී (0)'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 font-bold bg-slate-50 p-2 rounded-xl border border-slate-200">
                        Category: <span className="text-slate-900 font-extrabold">{tag.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setEditingTagModal(tag);
                          setTagFormState({ tagName: tag.tagName, category: tag.category });
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>වෙනස් කරන්න</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTag(tag)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                        title="Delete Tag"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Ultra-Clear High-Resolution Photo & Document Inspector Modal */}
      {photoInspector && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-between p-3 sm:p-5 animate-fadeIn select-none">
          {/* Top Control Bar */}
          <div className="w-full max-w-5xl bg-slate-900/95 border border-emerald-500/40 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-400 flex items-center justify-center text-emerald-300">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                  <span>{photoInspector.userName}</span>
                  {photoInspector.userId && (
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">
                      ID: {photoInspector.userId}
                    </span>
                  )}
                  {photoInspector.nicNumber && (
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded hidden sm:inline-block">
                      NIC: {photoInspector.nicNumber}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-emerald-400 font-bold">
                  {photoInspector.activeType === 'face' && '👤 මුහුණේ ඡායාරූපය (Face Photo)'}
                  {photoInspector.activeType === 'nicFront' && '🪪 ජාතික හැඳුනුම්පත ඉදිරිපස (NIC Front)'}
                  {photoInspector.activeType === 'nicBack' && '🪪 ජාතික හැඳුනුම්පත පසුපස (NIC Back)'}
                </p>
              </div>
            </div>

            {/* Quick Switcher Tabs between the user's 3 documents */}
            {(photoInspector.facePhotoUrl || photoInspector.nicFrontPhotoUrl || photoInspector.nicBackPhotoUrl) && (
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setPhotoInspector((prev) => prev ? { ...prev, activeType: 'face', zoom: 1, rotation: 0 } : null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    photoInspector.activeType === 'face'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>1. මුහුණ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoInspector((prev) => prev ? { ...prev, activeType: 'nicFront', zoom: 1, rotation: 0 } : null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    photoInspector.activeType === 'nicFront'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>2. NIC ඉදිරිපස</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoInspector((prev) => prev ? { ...prev, activeType: 'nicBack', zoom: 1, rotation: 0 } : null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    photoInspector.activeType === 'nicBack'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>3. NIC පසුපස</span>
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPhotoInspector(null)}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center font-black transition-all cursor-pointer border border-white/10"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Central Ultra-HD Image Viewport */}
          {(() => {
            let activeUrl = photoInspector.facePhotoUrl;
            if (photoInspector.activeType === 'nicFront') activeUrl = photoInspector.nicFrontPhotoUrl || photoInspector.facePhotoUrl;
            if (photoInspector.activeType === 'nicBack') activeUrl = photoInspector.nicBackPhotoUrl || photoInspector.nicFrontPhotoUrl || photoInspector.facePhotoUrl;

            return (
              <div className="relative w-full max-w-5xl flex-1 flex items-center justify-center my-3 overflow-hidden rounded-3xl bg-slate-950/80 border border-white/10 shadow-2xl p-2 sm:p-4">
                {activeUrl && activeUrl.trim() !== '' ? (
                  <div className="w-full h-full flex items-center justify-center overflow-auto">
                    <img
                      src={activeUrl}
                      alt={photoInspector.userName}
                      style={{
                        transform: `scale(${photoInspector.zoom}) rotate(${photoInspector.rotation}deg)`,
                        transition: 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
                        maxWidth: '100%',
                        maxHeight: '72vh',
                        objectFit: 'contain',
                        imageRendering: 'auto',
                      }}
                      className="rounded-xl shadow-2xl select-none"
                    />
                  </div>
                ) : (
                  <div className="text-center text-slate-400 space-y-2 p-8">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                    <p className="font-bold text-sm">මෙම ලේඛනය සඳහා ඡායාරූපයක් උඩුගත කර නොමැත.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Bottom Zoom & Inspection Controls Toolbar */}
          <div className="w-full max-w-5xl bg-slate-900/95 border border-emerald-500/40 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl shrink-0">
            <div className="flex items-center gap-2">
              {/* Zoom Out */}
              <button
                type="button"
                onClick={() => setPhotoInspector((prev) => prev ? { ...prev, zoom: Math.max(0.5, prev.zoom - 0.25) } : null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 transition-all border border-white/10 cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
                <span>Zoom -</span>
              </button>

              {/* Zoom Level Indicator */}
              <span className="font-mono text-xs font-extrabold text-emerald-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-emerald-500/40 min-w-[65px] text-center">
                {Math.round(photoInspector.zoom * 100)}%
              </span>

              {/* Zoom In */}
              <button
                type="button"
                onClick={() => setPhotoInspector((prev) => prev ? { ...prev, zoom: Math.min(3.5, prev.zoom + 0.25) } : null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 transition-all border border-white/10 cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
                <span>Zoom +</span>
              </button>

              {/* Reset View */}
              <button
                type="button"
                onClick={() => setPhotoInspector((prev) => prev ? { ...prev, zoom: 1, rotation: 0 } : null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all border border-white/10 cursor-pointer"
                title="Reset View"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Rotate Left */}
              <button
                type="button"
                onClick={() => setPhotoInspector((prev) => prev ? { ...prev, rotation: (prev.rotation - 90 + 360) % 360 } : null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 transition-all border border-white/10 cursor-pointer"
                title="Rotate -90°"
              >
                <RotateCcw className="w-4 h-4" />
                <span>-90°</span>
              </button>

              {/* Rotate Right */}
              <button
                type="button"
                onClick={() => setPhotoInspector((prev) => prev ? { ...prev, rotation: (prev.rotation + 90) % 360 } : null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 transition-all border border-white/10 cursor-pointer"
                title="Rotate +90°"
              >
                <RotateCw className="w-4 h-4" />
                <span>+90°</span>
              </button>

              {/* Open in New Window */}
              {(() => {
                let currentUrl = photoInspector.facePhotoUrl;
                if (photoInspector.activeType === 'nicFront') currentUrl = photoInspector.nicFrontPhotoUrl || photoInspector.facePhotoUrl;
                if (photoInspector.activeType === 'nicBack') currentUrl = photoInspector.nicBackPhotoUrl || photoInspector.nicFrontPhotoUrl || photoInspector.facePhotoUrl;

                if (!currentUrl) return null;

                return (
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-xs font-black flex items-center gap-1 transition-all border border-emerald-500 shadow-md"
                    title="Open Full Image in New Tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>New Tab</span>
                  </a>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {(showAddCatModal || editingCatModal) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-700" />
                <span>{editingCatModal ? 'Category සංස්කරණය (Edit Category)' : 'අලුත් Category එකක් එකතු කරන්න (Add Category)'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowAddCatModal(false);
                  setEditingCatModal(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-slate-800 mb-1">
                  Category ID / Key (Unique String)
                </label>
                <input
                  type="text"
                  disabled={!!editingCatModal}
                  value={catFormState.id}
                  onChange={(e) => setCatFormState({ ...catFormState, id: e.target.value })}
                  placeholder="e.g. medical_help"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-slate-900 focus:outline-none focus:border-emerald-600 disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">නම (සිංහල)</label>
                  <input
                    type="text"
                    value={catFormState.nameSi}
                    onChange={(e) => setCatFormState({ ...catFormState, nameSi: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Name (English)</label>
                  <input
                    type="text"
                    value={catFormState.nameEn}
                    onChange={(e) => setCatFormState({ ...catFormState, nameEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">නම (දෙමළ)</label>
                  <input
                    type="text"
                    value={catFormState.nameTa}
                    onChange={(e) => setCatFormState({ ...catFormState, nameTa: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">විස්තරය (සිංහල)</label>
                <textarea
                  rows={2}
                  value={catFormState.descSi}
                  onChange={(e) => setCatFormState({ ...catFormState, descSi: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Description (English)</label>
                  <input
                    type="text"
                    value={catFormState.descEn}
                    onChange={(e) => setCatFormState({ ...catFormState, descEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">විස්තරය (දෙමළ)</label>
                  <input
                    type="text"
                    value={catFormState.descTa}
                    onChange={(e) => setCatFormState({ ...catFormState, descTa: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddCatModal(false);
                  setEditingCatModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs"
              >
                අවලංගු කරන්න
              </button>
              <button
                onClick={() => {
                  if (!catFormState.nameSi.trim() || !catFormState.id.trim()) {
                    alert('කරුණාකර Category ID සහ සිංහල නම ඇතුලත් කරන්න!');
                    return;
                  }

                  let updated: CategoryItem[];
                  if (editingCatModal) {
                    updated = categoryItems.map((c) =>
                      c.id === editingCatModal.id
                        ? { ...c, ...catFormState }
                        : c
                    );
                  } else {
                    const newCat: CategoryItem = {
                      ...catFormState,
                      customFields: [],
                    };
                    updated = [...categoryItems, newCat];
                  }

                  setCategoryItems(updated);
                  if (onUpdateCategories) onUpdateCategories(updated);
                  setShowAddCatModal(false);
                  setEditingCatModal(null);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md"
              >
                {editingCatModal ? 'වෙනස්කම් සුරකින්න' : 'Category එකතු කරන්න'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Custom Field Modal */}
      {(showAddFieldModal || editingFieldModal) && selectedCatObj && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <span>
                  {editingFieldModal ? 'Form Field එක Edit කරන්න' : `"${selectedCatObj.nameSi}" ට අලුත් Field එකක් එකතු කරන්න`}
                </span>
              </h3>
              <button
                onClick={() => {
                  setShowAddFieldModal(false);
                  setEditingFieldModal(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-slate-800 mb-1">
                  ප්‍රශ්නය / ක්ෂේත්‍ර නාමය (සිංහල)
                </label>
                <input
                  type="text"
                  value={fieldFormState.labelSi}
                  onChange={(e) => setFieldFormState({ ...fieldFormState, labelSi: e.target.value })}
                  placeholder="e.g. රෝගී තත්ත්වය"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Question (English)</label>
                  <input
                    type="text"
                    value={fieldFormState.labelEn}
                    onChange={(e) => setFieldFormState({ ...fieldFormState, labelEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">ප්‍රශ්නය (දෙමළ)</label>
                  <input
                    type="text"
                    value={fieldFormState.labelTa}
                    onChange={(e) => setFieldFormState({ ...fieldFormState, labelTa: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-slate-800 mb-1">Field Type (වර්ගය)</label>
                <select
                  value={fieldFormState.fieldType}
                  onChange={(e) =>
                    setFieldFormState({
                      ...fieldFormState,
                      fieldType: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="text">Short Text (කෙටි පෙළ)</option>
                  <option value="textarea">Textarea (දිගු විස්තරය)</option>
                  <option value="number">Number (අංක)</option>
                  <option value="dropdown">Dropdown (ලැයිස්තුවෙන් තෝරන්න)</option>
                  <option value="checkbox">Checkbox (ඔව් / නැත)</option>
                </select>
              </div>

              {fieldFormState.fieldType === 'dropdown' && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Dropdown Options (කොමා වලින් වෙන්කර ඇතුලත් කරන්න)
                  </label>
                  <input
                    type="text"
                    value={fieldFormState.options}
                    onChange={(e) => setFieldFormState({ ...fieldFormState, options: e.target.value })}
                    placeholder="e.g. අතිශය හදිසි, පැය 2ක් ඇතුළත, සාමාන්‍ය"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-emerald-800 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="req_toggle"
                  checked={fieldFormState.required}
                  onChange={(e) => setFieldFormState({ ...fieldFormState, required: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <label htmlFor="req_toggle" className="text-xs font-bold text-slate-800">
                  මෙම Field එක පිළිතුරු දීම අනිවාර්යයි (Required Field)
                </label>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddFieldModal(false);
                  setEditingFieldModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs"
              >
                අවලංගු කරන්න
              </button>
              <button
                onClick={() => {
                  if (!fieldFormState.labelSi.trim()) {
                    alert('කරුණාකර සිංහල ප්‍රශ්නය / ලේබලය ඇතුලත් කරන්න!');
                    return;
                  }

                  const optionsArr = fieldFormState.options
                    ? fieldFormState.options.split(',').map((s) => s.trim()).filter(Boolean)
                    : undefined;

                  let updatedFields: CustomFormField[];

                  if (editingFieldModal) {
                    updatedFields = (selectedCatObj.customFields || []).map((f) =>
                      f.id === editingFieldModal.id
                        ? {
                            ...f,
                            labelSi: fieldFormState.labelSi,
                            labelEn: fieldFormState.labelEn || fieldFormState.labelSi,
                            labelTa: fieldFormState.labelTa || fieldFormState.labelSi,
                            fieldType: fieldFormState.fieldType,
                            options: optionsArr,
                            required: fieldFormState.required,
                          }
                        : f
                    );
                  } else {
                    const newF: CustomFormField = {
                      id: `f_${Date.now()}`,
                      categoryId: selectedCatObj.id,
                      labelSi: fieldFormState.labelSi,
                      labelEn: fieldFormState.labelEn || fieldFormState.labelSi,
                      labelTa: fieldFormState.labelTa || fieldFormState.labelSi,
                      fieldType: fieldFormState.fieldType,
                      options: optionsArr,
                      required: fieldFormState.required,
                    };
                    updatedFields = [...(selectedCatObj.customFields || []), newF];
                  }

                  const updatedCatList = categoryItems.map((c) =>
                    c.id === selectedCatObj.id ? { ...c, customFields: updatedFields } : c
                  );

                  setCategoryItems(updatedCatList);
                  if (onUpdateCategories) onUpdateCategories(updatedCatList);

                  setShowAddFieldModal(false);
                  setEditingFieldModal(null);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md"
              >
                {editingFieldModal ? 'වෙනස්කම් සුරකින්න' : 'Field එකතු කරන්න'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Post Details Modal */}
      {selectedPostForAdminEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-700" />
                <span>දැන්වීම් විස්තර Edit කරන්න (#{selectedPostForAdminEdit.postCode})</span>
              </h3>
              <button
                onClick={() => setSelectedPostForAdminEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-slate-800 mb-1">
                  01. සිදුවී ඇති දේ (What Happened)
                </label>
                <textarea
                  rows={2}
                  value={editPostFormState.whatHappened}
                  onChange={(e) => setEditPostFormState({ ...editPostFormState, whatHappened: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-800 mb-1">
                  02. වියයුතු දේ / අවශ්‍ය සහාය (What Is Needed)
                </label>
                <textarea
                  rows={2}
                  value={editPostFormState.whatIsNeeded}
                  onChange={(e) => setEditPostFormState({ ...editPostFormState, whatIsNeeded: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-800 mb-1">
                  03. කොන්දේසි (Conditions)
                </label>
                <input
                  type="text"
                  value={editPostFormState.conditions}
                  onChange={(e) => setEditPostFormState({ ...editPostFormState, conditions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">ගෙවීම් (Payment)</label>
                  <input
                    type="text"
                    value={editPostFormState.payment}
                    onChange={(e) => setEditPostFormState({ ...editPostFormState, payment: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">ගමනාගමනය (Transport)</label>
                  <input
                    type="text"
                    value={editPostFormState.transport}
                    onChange={(e) => setEditPostFormState({ ...editPostFormState, transport: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">ස්ථානය (Location Name)</label>
                <input
                  type="text"
                  value={editPostFormState.locationName}
                  onChange={(e) => setEditPostFormState({ ...editPostFormState, locationName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                onClick={() => setSelectedPostForAdminEdit(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs"
              >
                අවලංගු කරන්න
              </button>
              <button
                onClick={() => {
                  if (onUpdatePost && selectedPostForAdminEdit) {
                    const updated: HelpPost = {
                      ...selectedPostForAdminEdit,
                      ...editPostFormState,
                    };
                    onUpdatePost(updated);
                    alert(`දැන්වීම #${selectedPostForAdminEdit.postCode} සාර්ථකව යාවත්කාලීන කරන ලදී!`);
                    setSelectedPostForAdminEdit(null);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md"
              >
                වෙනස්කම් සුරකින්න
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Tag Modal */}
      {(showAddTagModal || editingTagModal) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-700" />
                <span>{editingTagModal ? 'Tag එක වෙනස් කරන්න (Edit Tag)' : 'නව Tag එකක් එකතු කරන්න (Add Tag)'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowAddTagModal(false);
                  setEditingTagModal(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingTagModal ? handleSaveEditTag : handleCreateNewTag} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-slate-800 mb-1">
                  01. Tag Name (English / Singlish)
                </label>
                <input
                  type="text"
                  required
                  value={tagFormState.tagName}
                  onChange={(e) => setTagFormState({ ...tagFormState, tagName: e.target.value })}
                  placeholder="e.g. Vehicle Repair, Food, Plumbing"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-800 mb-1">
                  02. Category (සිංහල)
                </label>
                <input
                  type="text"
                  required
                  value={tagFormState.category}
                  onChange={(e) => setTagFormState({ ...tagFormState, category: e.target.value })}
                  placeholder="e.g. වාහන අලුත්වැඩියාව, කෑම, ජලනල සේවා"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTagModal(false);
                    setEditingTagModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md cursor-pointer"
                >
                  {editingTagModal ? 'සුරකින්න (Save Changes)' : 'ඇතුළත් කරන්න (Create Tag)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN POST DELETE CONFIRMATION MODAL */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-[#071a10] border-2 border-rose-500/80 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex justify-between items-center border-b border-rose-200 dark:border-rose-900 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {isPermanentDeleteRequested || postToDelete.isDeleted
                      ? 'දැන්වීම සම්පූර්ණයෙන්ම ඉවත් කිරීම'
                      : 'දැන්වීම මකා දැමීම (Admin Delete)'}
                  </h3>
                  <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                    #{postToDelete.postCode}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPostToDelete(null);
                  setIsPermanentDeleteRequested(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-extrabold text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    {isPermanentDeleteRequested || postToDelete.isDeleted
                      ? 'මෙම දැන්වීම පද්ධතියෙන් සම්පූර්ණයෙන්ම මැකීමට අවශ්‍යද?'
                      : 'ඔබට මෙම දැන්වීම පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍යද?'}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {isPermanentDeleteRequested || postToDelete.isDeleted
                    ? 'මෙමගින් දැන්වීම සහ අදාළ තොරතුරු සියල්ල සදහටම මැකී යනු ඇත.'
                    : 'දැන්වීම සජීවී පුවරුවෙන් (Feed) ඉවත් වන අතර, පරිපාලක (Admin) සඳහා "🚨 Delete කළ දැන්වීම්" යටතේ දින 3ක් පවතිනු ඇත.'}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">පරිශීලක:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{postToDelete.userName} ({postToDelete.userPhone})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">ස්ථානය:</span>
                  <span className="font-extrabold text-emerald-600">{postToDelete.locationName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">විස්තරය:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2 bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    {postToDelete.whatHappened}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPostToDelete(null);
                  setIsPermanentDeleteRequested(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 cursor-pointer"
              >
                අවලංගු කරන්න
              </button>

              <button
                type="button"
                onClick={() => handleExecuteDelete(postToDelete, isPermanentDeleteRequested || postToDelete.isDeleted)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isPermanentDeleteRequested || postToDelete.isDeleted
                    ? 'ඔව්, සම්පූර්ණයෙන්ම Delete කරන්න'
                    : 'ඔව්, ඉවත් කරන්න'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
