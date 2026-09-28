export type Role = 'user' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'blocked';
export type IssueStatus = 'pending' | 'in_progress' | 'resolved';
export type Language = 'si' | 'en' | 'ta';
export type Theme = 'dark' | 'light';
export type ViewMode = 'gps_gate' | 'login' | 'register' | 'issues_help' | 'dashboard' | 'admin' | 'pending' | 'create_help_post' | 'shortcut_hub';

export interface LocationOption {
  id: string;
  nameSi: string;
  nameEn: string;
  nameTa: string;
  lat: number;
  lng: number;
}

export interface PostReply {
  id: string;
  responderName: string;
  responderPhone: string;
  message: string;
  createdAt: string;
  createdAtMs?: number;
  whatsappSent?: boolean;
  isAccepted?: boolean;
  isConfirmed?: boolean;
  responderId?: string;
}

export interface MultilingualText {
  si: string;
  en: string;
  ta: string;
}

export interface RegistrationConfig {
  mainTitle: MultilingualText;
  subtitle: MultilingualText;
  noticeBanner: MultilingualText;
  termsAndConditions: MultilingualText;
  showDemoUserLogin?: boolean; // Controls visibility of "👤 නරඹන්නා ලෙස පිවිසෙන්න (User Demo)" on Login page
}

export interface CustomFormField {
  id: string;
  categoryId?: string;
  labelSi: string;
  labelEn: string;
  labelTa: string;
  fieldType: 'text' | 'textarea' | 'number' | 'dropdown' | 'checkbox';
  required: boolean;
  options?: string[]; // Dropdown choices
}

export interface CategoryItem {
  id: string;
  nameSi: string;
  nameEn: string;
  nameTa: string;
  descSi: string;
  descEn: string;
  descTa: string;
  icon: string;
  customFields: CustomFormField[];
}

export interface BillItem {
  id: string;
  title: string;
  amount: number;
  isTravelFee?: boolean;
}

export interface ServiceBill {
  items: BillItem[];
  travelDistanceKm: number;
  travelRatePerKm: number;
  travelOption?: 'came' | 'brought' | 'sent' | 'none';
  travelFee: number;
  totalAmount: number;
  actionsSummary?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface HelpPost {
  id: string;
  postCode: string; // e.g., #POST-7891
  userName: string;
  userNic?: string;
  userPhotoUrl?: string;
  userPhone: string; // WhatsApp number
  serviceType?: string;
  likeCount?: number;
  whatHappened: string; // සිදුවී ඇති දේ
  whatIsNeeded: string; // වියයුතු දේ
  conditions?: string; // කොන්දේසි
  specialNotice?: string; // විශේෂ දැනුවත් කිරීම
  transport: string; // ගමනාගමනය
  payment: string; // ගෙවීම් (e.g., Rs. 2,500 / නොමිලේ)
  helpersNeeded?: number; // උදව් අවශ්‍ය පුද්ගලයන් සංඛ්‍යාව (e.g. 2, 3)
  helpersAccepted?: number; // දැනට බාරගත් සංඛ්‍යාව
  feeAgreed?: boolean; // රු. 50 අයවීමට එකඟතාවය
  locationName: string; // e.g. "කඩවත (Kadawatha)"
  distanceKm: number; // distance relative to current active location
  lat?: number;
  lng?: number;
  createdAt: string;
  createdAtMs?: number;
  repliesCount: number;
  helpersCount: number;
  replies: PostReply[];
  verifiedOtp?: boolean;
  category?: string;
  customFieldValues?: Record<string, string | boolean>;
  tagName?: string;
  tagCategory?: string;
  tagId?: string;
  userId?: string;
  isConfirmed?: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  confirmedHelperName?: string;
  confirmedHelperPhone?: string;
  isCompleted?: boolean;
  completedAt?: string;
  completedBy?: string;
  completedHelperName?: string;
  completedHelperPhone?: string;
  requesterResolved?: boolean;
  requesterResolvedAt?: string;
  serviceBill?: ServiceBill;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  status?: 'active' | 'confirmed' | 'completed' | 'deleted';
  findForMeType?: 'lost' | 'stolen' | 'find' | 'found';
  itemLostStolenOrSearched?: string;
  incidentLocation?: string;
  incidentDate?: string;
  incidentTime?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactAddress?: string;
  hasReward?: boolean;
  rewardDetails?: string;
  identifyingInfo?: string; // නැති වූ දේ ඇති දුරකථන අංකයක්, හැඳුනුම්පත් අංකයක් හෝ එහි ඇති අංකයක් හෝ නමක්
  targetPrice?: string;
  quantityNeeded?: string;
  hasDeadline?: boolean;
  deadlineDate?: string;
  deadlineTime?: string;
  deliveryOption?: string;
  otherDeliveryDetails?: string;
  otherDetails?: string;
  fromMeToYouType?: 'donation' | 'giveaway' | 'exchange';
  donationItem?: string;
  donationRecipient?: string;
  donationDeliveryMethod?: string;
  donationDateType?: 'today' | 'custom';
  donationDate?: string;
  donationQuantity?: string;
  saveLocationConsent?: boolean;
  revealContactConsent?: boolean;
  confirmedHelperId?: string;
  authorizedUserIds?: string[];
  exchangeHaveItem?: string;
  exchangeHaveQuantity?: string;
  exchangeWantItem?: string;
  exchangeWantQuantity?: string;
  exchangeMethod?: string;
  groupWorkTitle?: string;
  isBoosted?: boolean;
  boostedAt?: string;
  boostedAtMs?: number;
  boostedUntil?: string;
  boostAmount?: number;
  boostPaymentMethod?: 'wallet' | 'card_qr' | 'bank_slip' | string;
  boostPaymentReference?: string;
  boostCategory?: string;
  isPinnedEmergency?: boolean;
  priorityLevel?: 'emergency' | 'high' | 'normal';
  emergencyAlertReason?: string;
  // External links & Embedded media (Facebook video, Telegram, YouTube, Website)
  externalLink?: string;
  videoUrl?: string;
  audioUrl?: string;
  mediaType?: string;
  audioDurationSec?: number;
  voiceSentDate?: string; // හඬ පණිවිඩය යැවූ දිනය (Date)
  voiceSentTime?: string; // හඬ පණිවිඩය යැවූ වේලාව (Time)
  voiceSentLocation?: string; // හඬ පණිවිඩය යැවූ ස්ථානය (Location / GPS Address)
  voiceCoordinates?: { lat: number; lng: number };
  isVoicePost?: boolean;
  voiceTranscript?: string;
  voiceLanguage?: 'si' | 'ta' | 'en';
  imageUrl?: string;
  images?: string[];
  telegramStorage?: TelegramMediaRecord;
  // Master Plan Anti-Fraud & Two-Party Completion Verification
  completionPin?: string;
  settlementBreakdown?: {
    serviceFee: number;
    bonusDiscount: number;
    netPayable: number;
    platformFee: number;
    helperEarned: number;
    isSettled: boolean;
    settledAt?: string;
    settledBy?: string;
  };
  // Admin Moderation & Flagging fields
  adminFlagged?: boolean;
  adminFlagReason?: string;
  adminFlaggedAt?: string;
  adminFlaggedBy?: string;
  isHiddenByAdmin?: boolean;
  posterCorrectionNote?: string;
  posterRespondedAt?: string;
  moderationStatus?: 'clean' | 'flagged' | 'poster_responded' | 'resolved' | 'approved' | 'pending_review';
}

export interface TelegramMediaRecord {
  fileId: string;
  fileUniqueId?: string;
  fileType: 'image' | 'video' | 'voice' | 'audio' | 'document';
  mimeType?: string;
  fileSize?: number;
  fileName?: string;
  messageId?: number;
  chatId?: string | number;
  directTelegramUrl?: string;
  proxyUrl?: string;
  caption?: string;
  createdAt?: string;
  senderName?: string;
}

export interface TagItem {
  id: string;
  tagName: string; // e.g., "Food", "Vehicle Repair"
  category: string; // e.g., "කෑම", "වාහන අලුත්වැඩියාව"
  createdBy?: string;
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: 'seeker' | 'helper' | 'admin' | 'system';
  text: string;
  timestamp: string;
  createdAtMs?: number;
  senderPhone?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video' | 'voice' | 'audio';
  telegramStorage?: TelegramMediaRecord;
  senderLang?: Language;
  detectedLang?: string;
  translations?: {
    si?: string;
    en?: string;
    ta?: string;
  };
  originalText?: string;
}

export interface UserLoginLog {
  id: string;
  timestamp: string; // Sri Lanka formatted date/time string e.g. "2025-05-18 14:32:10"
  timestampMs: number;
  ipAddress: string;
  locationName: string;
  lat?: number;
  lng?: number;
  deviceInfo: string;
}

export interface DuplicatePhotoMatch {
  userId: string;
  name: string;
  nicNumber: string;
  similarityPercent: number;
  userStatus: string;
}

export interface AiSecurityScanResult {
  scannedAt: string;
  isAiGenerated: boolean;
  aiConfidence: number; // 0 - 100
  isDocumentAuthentic: boolean;
  detectedNicNumber?: string;
  nicMatch?: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number; // 0 - 100
  analysisSummarySi: string;
  analysisSummaryEn?: string;
  flags: string[];
  duplicateMatches?: DuplicatePhotoMatch[];
}

export interface User {
  id: string;
  userId: string; // E.g., SS-980124 or email
  name: string;
  surname?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  nicNumber: string;
  phone: string;
  address?: string;
  district?: string;
  birthDate?: string;
  nearestTown?: string;
  whatsappNumber?: string;
  securityCode?: string;
  tempCode?: string;
  tempPassword?: string;
  isTemporaryPassword?: boolean;
  isPasswordChanged?: boolean;
  devicePinConfigured?: boolean;
  role: Role;
  status: UserStatus;
  isBlocked?: boolean;
  photoUrl?: string;
  idCardPhotoUrl?: string;
  nicFrontPhotoUrl?: string;
  nicBackPhotoUrl?: string;
  facePhotoUrl?: string;
  registeredAt: string;
  approvedAt?: string;
  updatedAt?: string;
  key?: string; // password
  password?: string; // stored password representation
  rejectionReason?: string;
  ipAddress?: string;
  registrationLat?: number;
  registrationLng?: number;
  registrationLocationName?: string;
  registrationAccuracy?: number;
  locationTimestamp?: string;
  deviceInfo?: string;
  blockedReason?: string;
  blockedAt?: string;
  loginHistory?: UserLoginLog[];
  lastLoginAt?: string;
  pdfDownloadCount?: number;
  lastPdfDownloadedAt?: string;
  personalDetailsPurged?: boolean;
  personalDetailsPurgedAt?: string;
  isDemo?: boolean;
  credits?: number;
  userNumericId?: string;
  welcomeGiftCredited?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorConfirmedAt?: string;
  activeDeviceId?: string;
  deviceSessionToken?: string;
  devicePinUpdatedAt?: string;
  pendingProfileUpdate?: PendingProfileUpdate;
  aiScanResult?: AiSecurityScanResult;
  trustPoints?: number; // 0 to 1000, default 100
  customBadges?: TrustBadgeType[];
  trustScoreLogs?: TrustScoreLogItem[];
}

export interface PendingProfileUpdate {
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  requestedAtMs: number;
  oldName: string;
  newName?: string;
  oldAddress?: string;
  newAddress?: string;
  oldPhone?: string;
  newPhone?: string;
  oldEmail?: string;
  newEmail?: string;
  adminRemark?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export type CreditTransactionType = 
  | 'welcome_gift' 
  | 'deposit' 
  | 'ad_fee' 
  | 'reward' 
  | 'penalty_compensation' 
  | 'admin_adjustment';

export interface CreditTransaction {
  id: string;
  userId: string;
  userNumericId: string;
  userName: string;
  userNic?: string;
  userPhone?: string;
  amount: number; // Positive (+) for credit/gift/deposit, negative (-) for fees/penalties
  type: CreditTransactionType;
  title: string; // e.g. "ලියාපදිංචි පිළිගැනීමේ ත්‍යාගය", "ඉක්මන් සේවා දැන්වීම් ගාස්තුව"
  description: string;
  categoryKey?: string;
  postCode?: string;
  timestamp: string;
  timestampMs: number;
  balanceAfter: number;
  adminRemark?: string;
}

export interface BankDepositDetails {
  bankNameSi: string;
  bankNameEn: string;
  accountHolderSi: string;
  accountHolderEn: string;
  accountNumber: string;
  branchSi: string;
  branchEn: string;
  remark: string;
}

export interface BlockedCredential {
  id: string;
  userId?: string;
  userName?: string;
  email?: string;
  phone?: string;
  nicNumber?: string;
  ipAddress?: string;
  blockedAt: string;
  reason: string;
}

export interface Issue {
  id: string;
  issueCode: string; // e.g., #ISSUE-4921
  userId?: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  nicNumber?: string;
  category: string;
  title: string;
  description: string;
  attachmentUrl?: string;
  status: IssueStatus;
  createdAt: string;
  isRegisteredUser?: boolean;
  targetChannel?: 'inbox' | 'sms' | 'whatsapp';
  adminReply?: string;
  adminRepliedAt?: string;
  replyChannel?: 'inbox' | 'sms' | 'whatsapp';
  updatedAt?: string;
}

export interface ServiceItem {
  id: string;
  titleSi: string;
  titleEn: string;
  titleTa: string;
  descSi: string;
  descEn: string;
  descTa: string;
  icon: string;
  category: string;
  available: boolean;
}

export interface ServiceReview {
  id: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  createdAtMs?: number;
}

export type ServiceDeliveryMethod = 'location' | 'anywhere' | 'online' | 'customer_must_come' | 'other';

export interface ProfessionalServiceSubCategory {
  name: string;
  icon: string;
}

export interface ProfessionalServiceCategory {
  category_id: string;
  category_name: string;
  category_icon: string;
  sub_categories: ProfessionalServiceSubCategory[];
}

export interface ProfessionalService {
  id: string;
  userId: string;
  providerName: string;
  providerPhotoUrl?: string;
  providerPhone: string;
  providerWhatsapp?: string;
  providerNic?: string;
  altPhone?: string; // 5. ගිණුමට ලබාදුන් අංකය හැර වෙනත් දුරකථන අංක
  serviceTitle: string; // 1. ඔබට ලබාදිය හැකි සේවය කුමක්ද?
  profession?: string;
  deliveryMethod: ServiceDeliveryMethod; // 2. සේවය ලබාදෙන්නේ කෙසේද
  deliveryMethodDetails?: string; // ස්ථානය / වෙනත් විස්තර
  locationName?: string;
  lat?: number;
  lng?: number;
  qualifications: string; // 3. ඔබට ඒ සදහා ඇති සුදුසුකම්
  qualificationsList?: string[]; // Dynamic multi-item qualifications
  experienceDuration: string; // 4. පලපුරුද්දේ කාලසීමාව
  categoryId: string; // 6. Main Category
  categoryName: string;
  categoryIcon: string;
  subCategoryName: string;
  subCategoryIcon: string;
  createdAt: string;
  createdAtMs: number;
  reviews: ServiceReview[];
  avgRating?: number;
  isVerified?: boolean;
  revealContactConsent?: boolean;
}

export type GroupWorkSubCategory = 'social_service' | 'religious_activity' | 'friendly_meetup';

export interface GroupPermissions {
  editGroupSettings: boolean; // name, icon, description, disappearing message timer, pin/keep/unkeep
  sendNewMessages: boolean; // whether non-admins can send messages
  addOtherMembers: boolean; // whether non-admins can add other members
  inviteViaLinkOrQr: boolean; // whether members can invite via link or QR
  adminApproveNewMembers: boolean; // when turned on, admin must approve anyone who wants to join
  disappearingTimer?: 'off' | '24h' | '7d' | '90d';
}

export type GroupMemberRole = 'admin' | 'moderator' | 'member';
export type GroupMemberStatus = 'active' | 'pending_invite' | 'pending_approval' | 'removed';

export interface GroupMember {
  userId: string;
  name: string;
  phone: string;
  photoUrl?: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  joinedAt: string;
  customPermissions?: Partial<GroupPermissions>;
}

export interface GroupMessageLocation {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  note?: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhone: string;
  senderPhotoUrl?: string;
  senderRole?: GroupMemberRole;
  text: string;
  timestamp: string;
  createdAtMs: number;
  isPinned?: boolean;
  isKept?: boolean;
  location?: GroupMessageLocation;
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
}

export type GroupPrivacy = 'public' | 'private';

export interface GroupJoinRequest {
  id: string;
  groupId: string;
  groupName: string;
  groupUsername: string;
  groupPhotoUrl?: string;
  groupSubCategory?: GroupWorkSubCategory;
  userId: string;
  userName: string;
  userPhone: string;
  userPhotoUrl?: string;
  requestedAt: string;
  requestedAtMs: number;
  status: 'pending' | 'accepted' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface GroupItem {
  id: string;
  name: string; // unique, e.g. "කැලණිය ප්‍රජා සත්කාර බලකාය"
  username: string; // unique, e.g. "@kelaniya_volunteers"
  subCategory: GroupWorkSubCategory; // 'social_service' | 'religious_activity' | 'friendly_meetup'
  privacy: GroupPrivacy; // 'public' (visible & open to everyone) | 'private' (admin approval required)
  photoUrl?: string;
  description: string;
  locationName?: string;
  lat?: number;
  lng?: number;
  creatorId: string;
  creatorName: string;
  creatorPhone: string;
  createdAt: string;
  createdAtMs: number;
  permissions: GroupPermissions;
  members: GroupMember[];
  joinRequests?: GroupJoinRequest[];
  inviteCode: string; // for link or QR code join
  isPinned?: boolean;
}

export interface GroupInviteNotification {
  id: string;
  groupId: string;
  groupName: string;
  groupUsername: string;
  groupPhotoUrl?: string;
  subCategory: GroupWorkSubCategory;
  inviterName: string;
  inviterPhone: string;
  targetPhone: string;
  targetUserId?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  createdAtMs: number;
}

// ---------------- Marketplace (වෙළඳපොළ) Types ----------------
export type MarketItemSaleType = 'wholesale' | 'retail' | 'free_giveaway' | 'exchange';
export type MarketDeliveryOption = 'pickup' | 'seller_deliver' | 'free_shipping' | 'paid_shipping';
export type MarketSection = 'sellers' | 'buyers' | 'shops' | 'businesses';
export type MarketSellerSubTab = 'all' | 'wholesale' | 'retail' | 'free_giveaway' | 'exchange';

export interface MarketLocation {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  note?: string;
}

export interface MarketItem {
  id: string;
  type: 'seller_item' | 'buyer_request';
  title: string; // භාණ්ඩයේ නම / සොයන්නේ කුමක්ද
  tagName: string;
  tagCategory?: string;
  price?: number; // විකුණුම් මිල
  quantity: string; // ප්‍රමාණය
  availableDateType: 'today' | 'custom';
  availableDate?: string;
  saleTypes: MarketItemSaleType[]; // තොග, සිල්ලර, හුවමාරු
  // Barter / Exchange details
  barterNeeds?: string; // අවශ්‍ය මොනවාද
  barterQuantity?: string; // කොපමණ ප්‍රමාණයක්ද
  // Warranty
  hasWarranty?: boolean;
  warrantyPeriod?: string;
  // Expiry
  expiryDate?: string;
  expiryNote?: string;
  // Delivery
  deliveryOption?: MarketDeliveryOption;
  pickupLocation?: MarketLocation;
  // Notes / details
  notes?: string;
  // Contact
  userId: string;
  userName: string;
  userPhone: string;
  showWhatsapp: boolean;
  whatsappNumber?: string;
  revealContactConsent?: boolean;
  // Metadata
  locationName?: string;
  distanceKm?: number;
  lat?: number;
  lng?: number;
  createdAt: string;
  createdAtMs: number;
  images?: string[];
}

export interface DaySchedule {
  isOpen: boolean;
  openTime: string; // e.g. "08:30"
  closeTime: string; // e.g. "19:00"
}

export interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface ShopInventoryItem {
  id: string;
  name: string;
  quantity: string;
  price: number;
  saleType: 'wholesale' | 'retail' | 'both';
}

export interface MarketShop {
  id: string;
  type: 'shop' | 'business'; // Shop (අලෙවිසැල) or Business Place (ව්‍යාපාරික ස්ථානය)
  mode?: 'shop' | 'online'; // for shops: Shop / Online
  name: string;
  location?: MarketLocation;
  schedulePreset?: 'everyday' | 'weekdays_only' | 'no_poya' | 'no_holidays' | 'custom';
  schedule: WeekSchedule;
  inventory: ShopInventoryItem[];
  categoryTag: string;
  email?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  showWhatsapp: boolean;
  whatsappNumber?: string;
  chatEnabled: boolean;
  revealContactConsent?: boolean;
  userId: string;
  userName: string;
  userPhone: string;
  createdAt: string;
  createdAtMs: number;
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface BloodDonationRequest {
  id: string;
  postCode: string; // e.g. #BLD-401
  patientName: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  hospitalName: string;
  district: string;
  urgency: 'urgent' | 'within_24h' | 'planned';
  neededDate: string;
  contactName: string;
  contactPhone: string;
  additionalNotes?: string;
  status: 'active' | 'fulfilled' | 'cancelled';
  createdAt: string;
  createdAtMs?: number;
  userId?: string;
  fulfilledBy?: string;
  supportedCount?: number;
  supportedUserIds?: string[];
}

export interface VolunteerDonor {
  id: string;
  name: string;
  phone: string;
  bloodGroup: BloodGroup;
  district: string;
  lastDonatedDate?: string;
  isAvailable: boolean;
  registeredAt: string;
  userId?: string;
}

export interface DisasterReliefItem {
  id: string;
  title: string;
  type: 'meals' | 'dry_rations' | 'water_medicine' | 'temporary_shelter' | 'clothing_blankets' | 'other';
  locationName: string;
  district: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  contactPerson: string;
  contactPhone: string;
  status: 'needed' | 'collecting' | 'delivered';
  targetQuantity?: string;
  collectedQuantity?: string;
  createdAt: string;
  createdAtMs?: number;
  userId?: string;
  userNic?: string;
  userPhone?: string;
  supportedCount?: number;
  supportedUserIds?: string[];
}

export interface InactiveReportDetail {
  userId: string;
  userName: string;
  userPhone?: string;
  reportedAt: string;
  reportedAtMs: number;
  timestamp?: string;
  reason?: string;
}

export interface EmergencyServiceContact {
  id: string;
  serviceNameSi: string;
  serviceNameEn: string;
  category: 'police' | 'hospital' | 'ambulance' | 'fire' | 'disaster' | 'helpline' | 'utilities';
  phone: string;
  altPhone?: string;
  district?: string;
  address?: string;
  isNational: boolean;
  descriptionSi?: string;
  // Community contribution & 2 Credit Reward
  submittedByUserId?: string;
  submittedByUserName?: string;
  submittedByUserPhone?: string;
  submittedAt?: string;
  submittedAtMs?: number;
  rewardCreditsAwarded?: number; // 2
  // Verification & Inactive reporting (3 reports = deactivated & admin flagged)
  reportedInactiveCount?: number;
  reportedInactiveUserIds?: string[];
  reportedInactiveDetails?: InactiveReportDetail[];
  isInactiveDeactivated?: boolean;
  deactivatedAt?: string;
  adminStatus?: 'active' | 'flagged' | 'removed' | 'verified';
  adminRemark?: string;
  adminReviewedAt?: string;
}

export type TrustBadgeType = 
  | 'bronze' 
  | 'silver' 
  | 'gold' 
  | 'community_hero'
  | 'verified_seller'
  | 'verified_volunteer'
  | 'verified_professional'
  | 'warning'
  | 'blocked';

export interface TrustScoreLogItem {
  id: string;
  userId: string;
  userName: string;
  change: number; // e.g. +30, -50
  balanceAfter: number;
  reason: string;
  category: 
    | 'verification' 
    | 'help_completed' 
    | 'aid_verified' 
    | 'rating' 
    | 'fraud_penalty' 
    | 'fake_report' 
    | 'policy_strike' 
    | 'admin_manual' 
    | 'unblock_reset';
  adminName?: string;
  timestamp: string;
  timestampMs: number;
}

export interface UserTrustProfile {
  completedHelpsCount: number;
  positiveReviewsCount: number;
  karmaPoints: number;
  trustPoints?: number;
  trustBadge: TrustBadgeType;
  activeBadges?: TrustBadgeType[];
  badgeTitleSi: string;
  badgeIcon: string;
  verifiedPhone: boolean;
  verifiedNic: boolean;
  trustLevel?: 'high' | 'good' | 'warning' | 'critical' | 'blocked';
  isBlockedDueToPoints?: boolean;
}

export interface ProximityNotificationConfig {
  enabled: boolean;
  radiusKm: number;
  notifyOnUrgentHelp: boolean;
  notifyOnBloodRequests: boolean;
  notifyOnDisasterRelief: boolean;
  soundEnabled: boolean;
}

export interface EmergencyAdminAlert {
  id: string;
  contactId: string;
  serviceName?: string;
  serviceNameSi?: string;
  phone: string;
  type?: string;
  message?: string;
  reportedCount?: number;
  reportedUsersCount?: number;
  createdAt?: string;
  reportedAt?: string;
  submitterUserName?: string;
  reportedUsers?: {
    name?: string;
    phone?: string;
    reason?: string;
  }[];
  isResolved: boolean;
}

export interface SearchSynonymGroup {
  id: string;
  canonical: string; // The primary/standard term (e.g. 'සහල්')
  terms: string[];   // All aliases and synonyms (e.g. ['හාල්', 'සහල්', 'rice', 'කැකුළු', 'නාඩු', 'සම්බා'])
  category?: string; // e.g. 'ආහාර', 'සෞඛ්‍ය', 'ප්‍රවාහන'
  isLearned?: boolean; // If learned dynamically by user confirmation
  confirmedCount?: number; // Times users clicked "Yes"
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchSuggestionPrompt {
  originalQuery: string;
  suggestedTerm: string;
  canonicalTerm: string;
  matchingCount: number;
  allSynonyms: string[];
}

// ==========================================
// 🚨 රතු එළිය (Red Alert) Emergency System
// ==========================================
export type RedAlertDisasterType =
  | 'fire' // ගින්නක්
  | 'flood' // ජල ගැල්මක්
  | 'mountain_collapse' // කඳු / පස් කඩා වැටීමක්
  | 'landslide' // නායයාමක්
  | 'sinkhole' // ගිලාබැසීමක්
  | 'gale_wind' // තද සුළං
  | 'tsunami' // සුනාමි
  | 'earthquake' // භූමි කම්පාවක්
  | 'other'; // වෙනත් ආපදාවක්

export interface RedAlertComment {
  id: string;
  userId?: string;
  userName: string;
  authorName?: string;
  userPhone?: string;
  comment: string;
  text?: string;
  createdAt: string;
  createdAtDisplay?: string;
  isReporterUpdate?: boolean;
}

export interface RedAlertFakeReport {
  id: string;
  userId?: string;
  userName: string;
  userPhone?: string;
  reason: string; // e.g. "බොරුවක් / අසත්‍ය පුවතක්", "නොමඟ යවන සුළුයි", "පැරණි සිදුවීමක්", "වෙනත්"
  additionalNotes?: string;
  reportedAt: string;
}

export interface RedAlertItem {
  id: string;
  alertCode?: string; // e.g., #RED-1042
  disasterType: RedAlertDisasterType;
  customDisasterTitle?: string;
  disasterTitleSi: string;
  disasterTitleEn: string;
  disasterTitleTa: string;
  description?: string; // වැඩි විස්තර

  // Location & Coordinates
  latitude: number;
  longitude: number;
  locationName: string; // e.g. "කඩවත", "රත්නපුර", "මහනුවර"
  locationAccuracyMeters?: number;

  // Timestamps
  incidentDate: string; // YYYY-MM-DD
  incidentTime: string; // HH:MM AM/PM
  createdAt: string;
  createdAtMs: number;

  // Reporter
  reportedByUserId?: string;
  reportedByName: string;
  reportedByPhone: string;

  // Status & Severity
  status: 'active' | 'resolved' | 'cancelled' | 'false_alarm';
  severity: 'critical' | 'high' | 'moderate';

  // Voice & Audio SOS Recording
  audioUrl?: string;
  audioDurationSec?: number;
  voiceSentDate?: string;
  voiceSentTime?: string;
  voiceSentLocation?: string;
  voiceCoordinates?: { lat: number; lng: number };
  isVoiceAlert?: boolean;

  // Interactive Elements
  comments: RedAlertComment[];
  fakeReports: RedAlertFakeReport[];
  isFlaggedFake?: boolean;
  adminActionNote?: string;
  resolvedAt?: string;
  cancelledAt?: string;
  statusChangeMessage?: string;
  latestReporterUpdate?: {
    text: string;
    createdAt: string;
    reporterName?: string;
    notificationText?: string;
  };
}

// ==========================================
// 🏛️ ආධාර සහ සම්පත් විනිවිදභාවයේ ලෙජරය (Transparent Aid Ledger) Types
// ==========================================

export type AidCategory = 
  | 'dry_rations'       // වියළි ආහාර / සලාක
  | 'cooked_meals'      // පිසූ ආහාර
  | 'medicine'          // ඖෂධ හා ප්‍රථමාධාර
  | 'funds'             // මුදල් ආධාර / අරමුදල්
  | 'drinking_water'    // පිරිසිදු පානීය ජලය
  | 'clothing_blankets' // ඇඳුම් පැළඳුම් හා උණුසුම් පොරෝන
  | 'baby_care'         // ළදරු ආහාර හා ඩයපර්ස්
  | 'hygiene_sanitary'  // සනීපාරක්ෂක ද්‍රව්‍ය
  | 'shelter_equipment' // කූඩාරම් / ටෙන්ට් / උපකරණ
  | 'other';            // වෙනත් ආධාර

export type AidCenterType = 
  | 'camp'              // ආපදා සහන කඳවුර (Relief Camp)
  | 'temple_church'     // පන්සල / පල්ලිය / ආගමික ස්ථානය
  | 'school'            // පාසල් ගොඩනැගිල්ල
  | 'community_center'  // ප්‍රජා ශාලාව / සමිති ශාලාව
  | 'hospital'          // රෝහල / සෞඛ්‍ය මධ්‍යස්ථානය
  | 'family_group'      // පීඩාවට පත් පවුල් එකමුතුවක්
  | 'distribution_hub'; // ප්‍රධාන බෙදාහැරීමේ මධ්‍යස්ථානය

export interface AidRecipientCenter {
  id: string;
  centerCode: string;          // 6-digit unique code e.g. "849201"
  centerName: string;          // e.g. "කැලණිය ගංවතුර විපත සහන කඳවුර"
  centerType: AidCenterType;
  coordinatorName: string;     // වගකිවයුතු බාරකරුගේ නම
  coordinatorPhone: string;    // දුරකථන අංකය
  coordinatorNic: string;      // හැඳුනුම්පත් අංකය
  coordinatorUserId?: string;  // Registered User ID if logged in
  village: string;             // ගම
  town: string;                // නගරය
  district: string;            // දිස්ත්‍රික්කය
  province: string;            // පළාත
  address: string;             // සම්පූර්ණ ලිපිනය / ස්ථානය
  peopleCount: number;         // රැඳී සිටින / ප්‍රතිලාභ ලබන පුද්ගලයින් සංඛ්‍යාව
  familiesCount?: number;      // පවුල් සංඛ්‍යාව
  urgentNeeds: string[];       // හදිසි අවශ්‍යතා (dry_rations, water, etc.)
  notes?: string;              // විශේෂ සටහන්
  fraudWarningAccepted: boolean; // වංචනික ක්‍රියාවලින් වැලකීමේ සහතිකය
  fraudWarningAcceptedAt: string;
  createdAt: string;
  createdAtMs: number;
  status: 'active' | 'closed' | 'verified';
  totalDeliveriesCount: number;
  totalEstimatedValue: number;
  totalItemsDeliveredSummary?: string;
  qrCodeData?: string;
}

export interface AidDeliveryRecord {
  id: string;
  recordCode: string;            // e.g. "#AID-LOG-849201-104"
  centerCode: string;            // The 6-digit center code
  centerId: string;
  centerName: string;
  centerTown: string;
  centerDistrict: string;
  
  // Donor Details
  donorUserId?: string;
  donorName: string;
  donorPhone: string;
  donorOrganization?: string;    // සමාගම / සංගමය / පෞද්ගලික
  
  // Delivered Aid Details
  aidCategory: AidCategory;
  categoryTitleSi: string;
  itemDescription: string;       // ලබාදුන් ආධාර පිළිබඳ විස්තරය
  quantity: string;              // ප්‍රමාණය (e.g. "සහල් කිලෝ 500, පරිප්පු 100kg, වතුර බෝතල් 200")
  monetaryValueEstimate?: number;// ඇස්තමේන්තුගත වටිනාකම (රු.) හෝ මුදල් ආධාරය
  photos?: string[];             // ආධාර භාරදීමේ / රිසිට්පත් පින්තූර
  
  // Handover Timestamp
  deliveryDate: string;          // YYYY-MM-DD
  deliveryTime: string;          // HH:MM AM/PM
  donorNotes?: string;
  
  // Verification State & Dual-Confirm Workflow
  status: 'pending_recipient_confirmation' | 'confirmed_received' | 'disputed';
  submittedAt: string;
  submittedAtMs: number;
  
  // Recipient Confirmation
  confirmedAt?: string;
  confirmedAtMs?: number;
  confirmedByRecipientName?: string;
  recipientConfirmationNote?: string;
  recipientConfirmationPhoto?: string;
  isVerifiedPublic: boolean;
}

export type BroadcastScope = 'village' | 'town' | 'district' | 'province' | 'country';

export interface AidCommunityBroadcastPost {
  id: string;
  postCode: string;              // e.g. "#AID-POST-502"
  broadcastScope: BroadcastScope;// ගම, නගරය, දිස්ත්‍රික්කය, පළාත, රට
  scopeName: string;             // e.g. "කැලණිය (නගරය)" or "බස්නාහිර පළාත"
  title: string;
  organizerName: string;
  organizerPhone: string;
  organizerUserId?: string;
  collectedSummary: string;      // එකතු කළ මුළු ආධාර සාරාංශය
  distributedSummary: string;    // බෙදාහැරි ආකාරය සහ ප්‍රතිලාභීන්
  beneficiaryCenters: string[];  // ආධාර ලැබූ මධ්‍යස්ථාන වල 6-Digit Codes හෝ නම්
  photos?: string[];
  totalValueFormatted?: string;
  createdAt: string;
  createdAtMs: number;
  likesCount: number;
  likedUserIds?: string[];
  verifiedByLedger: boolean;
}

// ==============================================================
// 🔄 BARTER & EXCHANGE HUB TYPES (භාණ්ඩ හුවමාරු ක්‍රමය)
// ==============================================================

export type BarterCondition = 'brand_new' | 'like_new' | 'good' | 'used';
export type BarterStatus = 'available' | 'reserved' | 'completed' | 'cancelled';
export type BarterProposalStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface BarterItem {
  id: string;
  barterCode: string;            // e.g. "#SWAP-8921"
  userId: string;
  userNumericId?: string;
  userName: string;
  userPhone: string;
  userNic?: string;
  userDistrict?: string;
  userTown?: string;

  // What I Offer (මා සතු අතිරික්ත භාණ්ඩය)
  offeringTitle: string;
  offeringCategory: string;      // electronics, agriculture, tools, furniture, vehicles, books, clothing, appliances, general
  offeringDescription: string;
  condition: BarterCondition;
  estimatedValue?: number;       // Fair swap value (රු.)
  photos: string[];

  // What I Want In Exchange (මට අවශ්‍ය භාණ්ඩය)
  wantedItem: string;
  wantedCategory?: string;
  wantedDescription?: string;

  status: BarterStatus;
  proposalsCount: number;
  createdAt: string;
  createdAtMs: number;
  updatedAt?: string;
  completedWithUserId?: string;
  completedAt?: string;
}

export interface BarterProposal {
  id: string;
  proposalCode: string;          // e.g. "#PROP-4021"
  barterItemId: string;          // The listing ID
  barterItemTitle: string;
  targetUserId: string;          // Owner of the listing

  // Proposer Details
  proposerUserId: string;
  proposerName: string;
  proposerPhone: string;
  proposerDistrict?: string;

  // What Proposer Offers
  offeredItemTitle: string;
  offeredItemCategory?: string;
  offeredItemDescription: string;
  offeredCondition?: BarterCondition;
  offeredPhotos?: string[];
  proposerNotes?: string;

  status: BarterProposalStatus;
  createdAt: string;
  createdAtMs: number;
  respondedAt?: string;
}

// ==============================================================
// 📱 QR CODE & WALLET PAYMENT TYPES (QR ක්‍රමවේදය)
// ==============================================================

export interface QrTransaction {
  id: string;
  referenceNo: string;           // e.g. "#QR-PAY-984210"
  payerId: string;
  payerNumericId?: string;
  payerName: string;
  payerPhone?: string;
  
  payeeId: string;
  payeeNumericId?: string;
  payeeName: string;
  payeePhone?: string;
  
  amount: number;
  purpose: string;               // e.g. "භාණ්ඩ මිලදී ගැනීම (Goods Purchase)", "සේවා ගාස්තු", etc.
  paymentCode?: string;          // 6-digit dynamic/static verification code
  timestamp: string;
  timestampMs: number;
  status: 'completed' | 'refunded' | 'disputed';
  payerBalanceAfter: number;
  payeeBalanceAfter: number;
}

export interface QrPayPayload {
  type: 'SAHAYA_PAY';
  userId: string;
  numericId: string;
  name: string;
  phone: string;
  fixedAmount?: number;
  payCode: string;
  timestamp: number;
}

// ==============================================================
// 🟢 LIVE ONLINE PRESENCE TYPES (සජීවී පරිශීලකයින්)
// ==============================================================

export interface OnlinePresenceUser {
  sessionId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userRole: 'user' | 'admin' | 'guest';
  district?: string;
  currentView?: string;
  device?: string;               // Mobile / Desktop / Tablet
  lastPing: number;
  isOnline: boolean;
  joinedAt: number;
}

// ==============================================================
// 🚨 SOS LIVE GPS TRACKER TYPES (සජීවී SOS ස්ථාන විකාශන)
// ==============================================================

export interface SosBreadcrumbPoint {
  lat: number;
  lng: number;
  timestampMs: number;
  accuracyMeters?: number;
  speedKmh?: number;
}

export interface SosLiveSession {
  id: string;
  sessionCode: string;           // e.g. #SOS-8924
  userId: string;
  userName: string;
  userPhone: string;
  userNic?: string;
  userPhotoUrl?: string;
  
  // Realtime Coordinates & Geo
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  speedKmh?: number;
  headingDegrees?: number;
  altitudeMeters?: number;
  locationName?: string;
  locationAddress?: string;
  
  // Emergency Context
  emergencyNote?: string;
  batteryPercent?: number;
  isCharging?: boolean;
  
  // Life-cycle
  isActive: boolean;             // Master switch state (Active when ON, Terminated when OFF)
  startedAt: string;
  startedAtMs: number;
  updatedAt: string;
  updatedAtMs: number;
  deactivatedAt?: string;
  deactivatedAtMs?: number;
  
  // Path History
  breadcrumbTrail?: SosBreadcrumbPoint[];
  
  // Emergency Contact Info
  emergencyHotlineCalled?: string;
  sirenTriggered?: boolean;
}



