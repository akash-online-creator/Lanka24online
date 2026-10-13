export type Role = 'user' | 'admin' | 'super_admin';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'blocked';
export type IssueStatus = 'pending' | 'in_progress' | 'resolved';
export type Language = 'si' | 'en' | 'ta';
export type Theme = 'dark' | 'light';
export type ViewMode = 'gps_gate' | 'login' | 'register' | 'issues_help' | 'dashboard' | 'admin' | 'pending' | 'create_help_post' | 'shortcut_hub';

export interface LocationOption {
  id: string;
  nameSi: string;
  nameEn: string;
  nameTa?: string;
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
  id: string;
  title: MultilingualText;
  description: MultilingualText;
  isActive: boolean;
  customFields: CustomFormField[];
}

export interface CustomFormField {
  id: string;
  label: MultilingualText;
  type: 'text' | 'number' | 'select' | 'boolean' | 'textarea';
  required: boolean;
  options?: MultilingualText[]; // For select type
  placeholder?: MultilingualText;
}

export interface CategoryItem {
  id: string;
  nameSi: string;
  nameEn: string;
  nameTa?: string;
  iconName: string;
  descriptionSi?: string;
  descriptionEn?: string;
  descriptionTa?: string;
  registrationConfig?: RegistrationConfig;
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

export type RatingTier = 'excellent' | 'very_good' | 'good' | 'average' | 'bad' | 'very_bad';

export interface HelperApplicant {
  id: string;
  helperId: string;
  helperName: string;
  helperPhone: string;
  helperNicMasked?: string;
  helperRating?: number;
  helperReviewsCount?: number;
  appliedAt: string;
  distanceKm?: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface HelpPost {
  id: string;
  title?: string;
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
  createdAtIso?: string;
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
  isHidden?: boolean;
  hiddenAt?: string;
  hiddenBy?: string;
  status?: 'active' | 'confirmed' | 'completed' | 'deleted' | 'hidden';
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
  identifyingInfo?: string;
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
  externalLink?: string;
  videoUrl?: string;
  audioUrl?: string;
  mediaType?: string;
  audioDurationSec?: number;
  voiceSentDate?: string;
  voiceSentTime?: string;
  voiceSentLocation?: string;
  voiceCoordinates?: { lat: number; lng: number };
  isVoicePost?: boolean;
  voiceTranscript?: string;
  voiceLanguage?: 'si' | 'ta' | 'en';
  imageUrl?: string;
  images?: string[];
  telegramStorage?: TelegramMediaRecord;
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
  // Unified Service Workflow & Start PIN System
  startPin?: string;
  serviceStage?: 'open' | 'accepted' | 'in_progress' | 'bill_submitted' | 'completed' | 'cancelled';
  startedAt?: string;
  platformFee?: number;
  travelFeePerKm?: number;
  travelFeeCalculated?: number;
  applicants?: HelperApplicant[];
  selectedHelpers?: HelperApplicant[];
  serviceReviews?: ServiceReview[];
  rejectedApplicantIds?: string[];
  billSubmittedAt?: string;
  billRejectedReason?: string;
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
  uploadedAt: string;
  directDownloadUrl?: string;
  caption?: string;
  mimeType?: string;
  mediaType?: 'photo' | 'video' | 'audio' | 'voice' | 'document';
  sizeBytes?: number;
  sourceType?: 'blood' | 'disaster' | 'aid' | 'sos' | 'general';
  targetDocumentId?: string;
  syncedWithFirestore?: boolean;
  storedVia?: 'bot_api' | 'user_account_client';
}

export interface TagItem {
  id: string;
  tagName: string;
  category: string;
  categoryEn?: string;
  createdAt?: string;
  usageCount?: number;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: 'seeker' | 'helper' | 'system';
  text: string;
  timestamp: string;
  createdAtMs?: number;
  senderPhone?: string;
  systemWarning?: boolean;
  translatedText?: string;
  detectedLang?: Language;
  translations?: Record<Language, string>;
  singlishText?: string;
  originalLanguage?: Language;
  audioVoiceUrl?: string;
  audioDurationSec?: number;
  isVoiceMessage?: boolean;
}

export interface UserLoginLog {
  timestamp: string;
  ipAddress?: string;
  deviceInfo?: string;
  browser?: string;
  locationName?: string;
  lat?: number;
  lng?: number;
}

export interface DuplicatePhotoMatch {
  matchedUserId: string;
  matchedUserName: string;
  matchedField: 'idCard' | 'face' | 'nicFront' | 'nicBack';
  similarity: number; // 0 to 1
  matchedAt: string;
}

export interface AiSecurityScanResult {
  scanTimestamp: string;
  idCardLegible: boolean;
  idCardConfidence: number;
  extractedName?: string;
  extractedNic?: string;
  extractedDob?: string;
  faceMatchWithIdCard: boolean;
  faceMatchScore: number;
  detectedDuplicatePhotos: DuplicatePhotoMatch[];
  duplicateCount: number;
  isSuspicious: boolean;
  suspiciousReasons: string[];
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
  nic?: string;
  phone: string;
  address?: string;
  district?: string;
  policeDivision?: string;
  birthDate?: string;
  nearestTown?: string;
  whatsappNumber?: string;
  whatsappPhone?: string;
  securityCode?: string;
  tempCode?: string;
  tempPassword?: string;
  temporaryPassword?: string;
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
  isMedicalVerified?: boolean;
  credits?: number;
  creditBalance?: number;
  trustScore?: number;
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
  ratingScore?: number;
  totalCompletedJobs?: number;
  totalReviewsCount?: number;
  reviewsReceived?: ServiceReview[];
  nicMasked?: string;
  isAccountSuspended?: boolean;
  suspensionReason?: string;
  trustPoints?: number; // 0 to 1000, default 100
  customBadges?: TrustBadgeType[];
  trustScoreLogs?: TrustScoreLogItem[];
}

export interface PendingProfileUpdate {
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  requestedFields: {
    name?: string;
    phone?: string;
    whatsappNumber?: string;
    address?: string;
    nearestTown?: string;
    policeDivision?: string;
    district?: string;
    photoUrl?: string;
    nicFrontPhotoUrl?: string;
    nicBackPhotoUrl?: string;
  };
}

export type CreditTransactionType = 
  | 'welcome_bonus'
  | 'daily_login'
  | 'referral_bonus'
  | 'admin_adjustment'
  | 'boost_post_fee'
  | 'top_up';

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: CreditTransactionType;
  description: string;
  balanceAfter: number;
  createdAt: string;
  createdAtMs?: number;
  referenceId?: string;
  status: 'completed' | 'pending' | 'rejected';
  proofSlipUrl?: string;
  bankDepositDetails?: BankDepositDetails;
  approvedBy?: string;
  approvedAt?: string;
}

export interface BankDepositDetails {
  bankName: string;
  branchName: string;
  accountNumber: string;
  accountHolderName: string;
  depositDate: string;
  referenceNumber?: string;
}

export interface BlockedCredential {
  id: string;
  type: 'nic' | 'phone';
  value: string;
  reason?: string;
  blockedAt: string;
  blockedBy: string;
  isActive: boolean;
}

export interface Issue {
  id: string;
  postCode?: string;
  title: string;
  description: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: IssueStatus;
  userId: string;
  userName: string;
  userPhone: string;
  createdAt: string;
  createdAtMs?: number;
  responsesCount: number;
  images?: string[];
  imageUrl?: string;
  telegramStorage?: TelegramMediaRecord;
}

export interface ServiceItem {
  id: string;
  userId: string;
  name: string;
  phone: string;
  nic: string;
  profession?: string;
  deliveryMethod: ServiceDeliveryMethod;
  deliveryMethodDetails?: string;
  locationName?: string;
  lat?: number;
  lng?: number;
  qualifications: string;
  qualificationsList?: string[];
  experienceDuration: string;
  categoryId: string;
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

export interface ServiceReview {
  id: string;
  userId?: string;
  userName?: string;
  userPhotoUrl?: string;
  rating?: number; // 1 to 5
  comment?: string;
  createdAt: string;
  createdAtMs?: number;
  postId?: string;
  postCode?: string;
  reviewerId?: string;
  reviewerName?: string;
  helperId?: string;
  helperName?: string;
  helperNicMasked?: string;
  ratingTier?: RatingTier;
  ratingPointsAdded?: number;
  isRedAlert?: boolean;
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
  altPhone?: string;
  serviceTitle: string;
  serviceCategory: string;
  serviceSubCategory?: string;
  deliveryMethod: ServiceDeliveryMethod;
  deliveryMethodDetails?: string;
  qualifications: string;
  qualificationsList?: string[];
  experienceYears: number;
  locationName: string;
  lat?: number;
  lng?: number;
  basePrice?: number;
  priceType?: 'fixed' | 'negotiable' | 'per_hour' | 'free';
  photos?: string[];
  reviewsCount?: number;
  averageRating?: number;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt: string;
  createdAtMs?: number;
}

export type GroupWorkSubCategory = 'social_service' | 'religious_activity' | 'friendly_meetup';

export interface GroupPermissions {
  allowMemberPosting: boolean;
  requireAdminApprovalForPosts: boolean;
  allowMemberInvites: boolean;
  allowLocationSharing: boolean;
}

export type GroupMemberRole = 'admin' | 'moderator' | 'member';
export type GroupMemberStatus = 'active' | 'pending_invite' | 'pending_approval' | 'removed';

export interface GroupMember {
  userId: string;
  userName: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  joinedAt: string;
  invitedBy?: string;
  userPhone?: string;
  userPhotoUrl?: string;
}

export interface GroupMessageLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl?: string;
  text: string;
  timestamp: string;
  createdAtMs: number;
  location?: GroupMessageLocation;
  audioVoiceUrl?: string;
  audioDurationSec?: number;
  isVoiceMessage?: boolean;
  images?: string[];
  isPinned?: boolean;
  replyToMessageId?: string;
}

export type GroupPrivacy = 'public' | 'private';

export interface GroupJoinRequest {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userPhone: string;
  userPhotoUrl?: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface GroupItem {
  id: string;
  title: string;
  description: string;
  category: 'group_work';
  subCategory: GroupWorkSubCategory;
  privacy: GroupPrivacy;
  creatorId: string;
  creatorName: string;
  creatorPhone: string;
  creatorPhotoUrl?: string;
  locationName: string;
  district?: string;
  lat?: number;
  lng?: number;
  coverImageUrl?: string;
  images?: string[];
  membersCount: number;
  members: GroupMember[];
  permissions: GroupPermissions;
  joinRequests?: GroupJoinRequest[];
  createdAt: string;
  createdAtMs: number;
  updatedAt?: string;
  isActive: boolean;
}

export interface GroupInviteNotification {
  id: string;
  groupId: string;
  groupTitle: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

export type MarketItemSaleType = 'wholesale' | 'retail' | 'free_giveaway' | 'exchange';
export type MarketDeliveryOption = 'pickup' | 'seller_deliver' | 'free_shipping' | 'paid_shipping';
export type MarketSection = 'sellers' | 'buyers' | 'shops' | 'businesses';
export type MarketSellerSubTab = 'all' | 'wholesale' | 'retail' | 'free_giveaway' | 'exchange';

export interface MarketLocation {
  name: string;
  lat?: number;
  lng?: number;
  district?: string;
  nearestTown?: string;
}

export interface MarketItem {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userWhatsapp?: string;
  userPhotoUrl?: string;
  shopId?: string;
  shopName?: string;
  section: 'sellers' | 'buyers';
  subTab?: MarketSellerSubTab;
  title: string;
  description: string;
  category: string;
  subCategory?: string;
  price?: number;
  originalPrice?: number;
  isPriceNegotiable?: boolean;
  saleType: MarketItemSaleType;
  quantity?: number;
  quantityUnit?: string;
  condition?: 'brand_new' | 'used' | 'refurbished';
  brand?: string;
  photos: string[];
  location: MarketLocation;
  deliveryOption: MarketDeliveryOption;
  deliveryFee?: number;
  deliveryNote?: string;
  exchangeFor?: string;
  hasBulkDiscount?: boolean;
  bulkDiscountDetails?: string;
  isPromoted?: boolean;
  status: 'active' | 'sold' | 'expired' | 'hidden';
  viewsCount?: number;
  inquiriesCount?: number;
  createdAt: string;
  createdAtMs: number;
  updatedAt?: string;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
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
  title: string;
  price: number;
  saleType: 'retail' | 'wholesale';
  inStock: boolean;
  imageUrl?: string;
}

export interface MarketShop {
  id: string;
  userId: string;
  ownerName: string;
  ownerPhone: string;
  ownerWhatsapp?: string;
  shopName: string;
  shopCategory: string;
  businessRegistrationNumber?: string;
  registrationDocumentPhotoUrl?: string;
  bannerPhotoUrl?: string;
  logoPhotoUrl?: string;
  photos?: string[];
  location: MarketLocation;
  streetAddress?: string;
  weekSchedule?: WeekSchedule;
  inventory?: ShopInventoryItem[];
  itemCount?: number;
  isVerified?: boolean;
  isPromoted?: boolean;
  status: 'active' | 'pending_verification' | 'suspended';
  reviewsCount?: number;
  averageRating?: number;
  createdAt: string;
  createdAtMs: number;
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface BloodDonationRequest {
  id: string;
  patientName: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  hospitalName: string;
  hospitalLocation: string;
  district: string;
  contactPerson: string;
  contactPhone: string;
  whatsappPhone?: string;
  neededDate: string;
  neededTime?: string;
  urgency: 'critical' | 'urgent' | 'standard';
  medicalReason?: string;
  requesterId: string;
  status: 'active' | 'fulfilled' | 'cancelled';
  createdAt: string;
  createdAtMs: number;
  lat?: number;
  lng?: number;
}

export interface VolunteerDonor {
  id: string;
  userId: string;
  donorName: string;
  bloodGroup: BloodGroup;
  contactPhone: string;
  whatsappPhone?: string;
  district: string;
  city: string;
  lastDonationDate?: string;
  isAvailable: boolean;
  availableDays?: string[];
  registeredAt: string;
  lat?: number;
  lng?: number;
}

export interface DisasterReliefItem {
  id: string;
  title: string;
  disasterType: 'flood' | 'landslide' | 'drought' | 'storm' | 'wildfire' | 'other';
  locationName: string;
  district: string;
  gpsCoords?: { lat: number; lng: number };
  urgency: 'emergency' | 'high' | 'normal';
  description: string;
  affectedPeopleCount?: number;
  neededAidCategories: string[];
  aidItemsRequired?: { item: string; qty: string }[];
  contactPerson: string;
  contactPhone: string;
  whatsappPhone?: string;
  campName?: string;
  isOfficialCamp?: boolean;
  reporterId: string;
  status: 'active' | 'in_progress' | 'resolved';
  images?: string[];
  createdAt: string;
  createdAtMs: number;
}

export interface InactiveReportDetail {
  userId: string;
  userName: string;
  timestamp: string;
  userPhone?: string;
  reason?: string;
}

export interface EmergencyServiceContact {
  id: string;
  category: 'police' | 'hospital' | 'fire' | 'disaster' | 'child_women' | 'electricity' | 'water' | 'ambulance' | 'other';
  serviceName: string;
  descriptionSi?: string;
  descriptionEn?: string;
  district: string;
  division?: string;
  phone1: string;
  phone2?: string;
  tollFree?: string;
  address?: string;
  is24Hours: boolean;
  isNationalTollFree?: boolean;
  isUserAdded?: boolean;
  addedByUserId?: string;
  addedByUserName?: string;
  verifiedByAdmin?: boolean;
  inactiveReportsCount?: number;
  inactiveReportedBy?: string[];
  inactiveReportDetails?: InactiveReportDetail[];
  status?: 'active' | 'under_review' | 'inactive';
  upvotesCount?: number;
  upvotedByUserIds?: string[];
  lastConfirmedDate?: string;
  createdAt: string;
  lat?: number;
  lng?: number;
}

export type TrustBadgeType = 
  | 'verified_citizen' 
  | 'helpful_neighbor' 
  | 'community_guardian' 
  | 'quick_responder' 
  | 'lifesaver' 
  | 'expert_helper';

export interface TrustScoreLogItem {
  id: string;
  change: number; // e.g., +15, -10
  actionType: 
    | 'signup' 
    | 'verify_nic' 
    | 'resolve_help' 
    | 'offer_help_accepted' 
    | 'red_alert_assist' 
    | 'dispute_reported' 
    | 'strike_issued' 
    | 'daily_active' 
    | 'positive_review' 
    | 'negative_review';
  description: string;
  timestamp: string;
}

export interface UserTrustProfile {
  userId: string;
  trustPoints: number; // 0 to 1000, default 100
  trustLevel: 'new' | 'verified' | 'bronze' | 'silver' | 'gold' | 'platinum';
  completedHelpsCount: number;
  requestedHelpsCount: number;
  strikesCount: number;
  badges: TrustBadgeType[];
  logs: TrustScoreLogItem[];
  joinedAt: string;
}

export interface ProximityNotificationConfig {
  radiusKm: number;
  enabledCategories: {
    quick_service: boolean;
    red_alert: boolean;
    disaster_relief: boolean;
    blood_donation: boolean;
    community_post: boolean;
  };
  minimumTrustFilter?: number;
}

export interface EmergencyAdminAlert {
  id: string;
  category: 'red_alert' | 'sos_call' | 'mass_disaster' | 'fake_report_alert' | 'security_breach';
  title: string;
  message: string;
  sourceDocId?: string;
  sourceUserId?: string;
  sourceUserName?: string;
  userPhone?: string;
  lat?: number;
  lng?: number;
  locationName?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
  createdAtMs: number;
}

export interface SearchSynonymGroup {
  id: string;
  primaryKey: string;
  synonymsSi: string[];
  synonymsEn: string[];
  synonymsTa: string[];
  matchedCategoryIds: string[];
  suggestedTags: string[];
}

export interface SearchSuggestionPrompt {
  id: string;
  textSi: string;
  textEn: string;
  textTa: string;
  category: string;
  icon: string;
  priority: number;
}

export type RedAlertDisasterType = 
  | 'flood' 
  | 'landslide' 
  | 'fire' 
  | 'accident' 
  | 'medical' 
  | 'wild_elephant' 
  | 'storm' 
  | 'missing_person' 
  | 'other';

export interface RedAlertComment {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userPhotoUrl?: string;
  text: string;
  createdAt: string;
  createdAtMs: number;
  audioVoiceUrl?: string;
  isVolunteerOffer?: boolean;
}

export interface RedAlertFakeReport {
  reportedByUserId: string;
  reportedByUserName: string;
  reportedAt: string;
  reason: string;
}

export interface RedAlertItem {
  id: string;
  disasterType: RedAlertDisasterType;
  title: string;
  locationName: string;
  lat: number;
  lng: number;
  urgency: 'critical' | 'high' | 'moderate';
  affectedPeopleCount?: number;
  description: string;
  helpNeededTypes?: string[];
  contactName: string;
  contactPhone: string;
  whatsappPhone?: string;
  reportedByUserId: string;
  reporterPhotoUrl?: string;
  createdAt: string;
  createdAtMs: number;
  status: 'active' | 'in_progress' | 'resolved' | 'cancelled' | 'fake';
  resolvedAt?: string;
  resolvedReason?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  fakeReportsCount?: number;
  fakeReports?: RedAlertFakeReport[];
  reporterUpdates?: string[];
  reporterLastUpdateAt?: string;
  photos?: string[];
  audioVoiceUrl?: string;
  commentsCount?: number;
  comments?: RedAlertComment[];
  isVerifiedByAuthority?: boolean;
  authorityName?: string;
  isNationalEmergency?: boolean;
  radiusKm?: number;
  aidCenterId?: string;
}

export type AidCategory = 
  | 'dry_rations' 
  | 'cooked_food' 
  | 'drinking_water' 
  | 'baby_items' 
  | 'medicine' 
  | 'clothes' 
  | 'bedding' 
  | 'sanitary' 
  | 'boat_rescue' 
  | 'other';

export type AidCenterType = 
  | 'official_camp' 
  | 'temple' 
  | 'school' 
  | 'church' 
  | 'community_hall' 
  | 'hospital' 
  | 'informal';

export interface AidRecipientCenter {
  id: string;
  centerName: string;
  centerType: AidCenterType;
  disasterType: RedAlertDisasterType;
  relatedRedAlertId?: string;
  locationName: string;
  district: string;
  lat: number;
  lng: number;
  coordinatorName: string;
  coordinatorPhone: string;
  coordinatorWhatsapp?: string;
  affectedPeopleCount: number;
  infantCount?: number;
  elderlyCount?: number;
  urgentRequirements: {
    category: AidCategory;
    itemName: string;
    requiredQty: string;
    receivedQty: string;
    isFulfilled: boolean;
  }[];
  isOfficialGovernmentCenter?: boolean;
  status: 'active' | 'full' | 'closed';
  createdAt: string;
  createdAtMs: number;
}

export interface AidDeliveryRecord {
  id: string;
  centerId: string;
  centerName: string;
  donorUserId: string;
  donorName: string;
  donorPhone: string;
  donorVehicleType?: string;
  donorVehicleNumber?: string;
  itemsDelivered: {
    category: AidCategory;
    itemName: string;
    quantity: string;
  }[];
  departureLocation?: string;
  departureLat?: number;
  departureLng?: number;
  status: 'pledged' | 'in_transit' | 'delivered' | 'cancelled';
  departedAt?: string;
  estimatedArrival?: string;
  deliveredAt?: string;
  verifiedByCoordinator?: boolean;
  coordinatorReceiptNote?: string;
  createdAt: string;
  createdAtMs: number;
}

export type BroadcastScope = 'village' | 'town' | 'district' | 'province' | 'country';

export interface AidCommunityBroadcastPost {
  id: string;
  title: string;
  content: string;
  broadcastScope: BroadcastScope;
  locationName: string;
  district: string;
  lat?: number;
  lng?: number;
  urgency: 'critical' | 'high' | 'normal';
  authorId: string;
  authorName: string;
  authorRole: string;
  authorPhone?: string;
  images?: string[];
  audioVoiceUrl?: string;
  createdAt: string;
  createdAtMs: number;
  expiresAt?: string;
}

export type BarterCondition = 'brand_new' | 'like_new' | 'good' | 'used';
export type BarterStatus = 'available' | 'reserved' | 'completed' | 'cancelled';
export type BarterProposalStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface BarterItem {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userWhatsapp?: string;
  userPhotoUrl?: string;
  haveTitle: string;
  haveDescription: string;
  haveCategory: string;
  haveCondition: BarterCondition;
  haveQuantity?: string;
  haveEstimatedValue?: number;
  havePhotos: string[];
  wantTitle: string;
  wantDescription?: string;
  wantCategory?: string;
  wantConditions?: BarterCondition[];
  locationName: string;
  district?: string;
  lat?: number;
  lng?: number;
  status: BarterStatus;
  proposalsCount?: number;
  completedWithUserId?: string;
  completedAt?: string;
  createdAt: string;
  createdAtMs: number;
  updatedAt?: string;
}

export interface BarterProposal {
  id: string;
  barterItemId: string;
  senderUserId: string;
  senderUserName: string;
  senderPhone: string;
  senderWhatsapp?: string;
  senderPhotoUrl?: string;
  offeredTitle: string;
  offeredDescription: string;
  offeredCondition: BarterCondition;
  offeredPhotos: string[];
  cashDifference?: number;
  cashDifferenceDirection?: 'sender_pays' | 'receiver_pays';
  status: BarterProposalStatus;
  proposalNote?: string;
  ownerResponseNote?: string;
  meetingLocation?: string;
  meetingDate?: string;
  isConfirmedBySender?: boolean;
  isConfirmedByOwner?: boolean;
  createdAt: string;
  createdAtMs: number;
  updatedAt?: string;
}

export interface QrTransaction {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  amount: number;
  currency: 'LKR' | 'TOKEN';
  note?: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  timestampMs: number;
  qrPayloadString: string;
  relatedPostId?: string;
  receiptNumber: string;
}

export interface QrPayPayload {
  version: '1.0';
  targetUserId: string;
  targetUserName: string;
  targetPhone?: string;
  targetNicMasked?: string;
  fixedAmount?: number;
  referencePostCode?: string;
  qrType: 'transfer' | 'bill_pay' | 'tip';
  timestampMs: number;
}

export interface OnlinePresenceUser {
  userId: string;
  name: string;
  photoUrl?: string;
  lastActiveMs: number;
  isOnline: boolean;
  activeView?: ViewMode;
  currentLocationName?: string;
}

export interface SosBreadcrumbPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  timestampMs: number;
}

export interface SosLiveSession {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userNic?: string;
  userPhotoUrl?: string;
  currentLocation: {
    lat: number;
    lng: number;
    accuracy?: number;
    locationName?: string;
  };
  breadcrumbs: SosBreadcrumbPoint[];
  batteryLevel?: number;
  emergencyContactsNotified?: string[];
  status: 'active' | 'cancelled' | 'resolved';
  startedAt: string;
  startedAtMs: number;
  endedAt?: string;
  alertReason?: string;
}


// -------------------------------------------------------------
// 🤖 AI KNOWLEDGE BASE & PENDING Q&A REVIEW TYPES
// -------------------------------------------------------------
export interface PendingAiQuery {
  id: string;
  question: string;
  answer: string;
  detectedLang?: 'si' | 'en' | 'ta';
  askedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  locationContext?: string;
  userPhone?: string;
}

export interface VerifiedAiKnowledgeItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category?: string;
  lang?: 'si' | 'en' | 'ta';
  updatedAt: string;
  approvedBy?: string;
  hitCount?: number;
}
