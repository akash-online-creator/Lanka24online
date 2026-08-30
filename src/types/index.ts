export type Role = 'user' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'blocked';
export type IssueStatus = 'pending' | 'in_progress' | 'resolved';
export type Language = 'si' | 'en' | 'ta';
export type Theme = 'dark' | 'light';
export type ViewMode = 'login' | 'register' | 'issues_help' | 'dashboard' | 'admin' | 'pending' | 'create_help_post';

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
  userPhone: string; // WhatsApp number
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
  findForMeType?: 'lost' | 'stolen' | 'find';
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
  exchangeHaveItem?: string;
  exchangeHaveQuantity?: string;
  exchangeWantItem?: string;
  exchangeWantQuantity?: string;
  exchangeMethod?: string;
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
  senderRole: 'seeker' | 'helper';
  text: string;
  timestamp: string;
  createdAtMs?: number;
  senderPhone?: string;
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
  birthDate?: string;
  nearestTown?: string;
  whatsappNumber?: string;
  securityCode?: string;
  tempCode?: string;
  isPasswordChanged?: boolean;
  role: Role;
  status: UserStatus;
  photoUrl?: string;
  idCardPhotoUrl?: string;
  nicFrontPhotoUrl?: string;
  nicBackPhotoUrl?: string;
  facePhotoUrl?: string;
  registeredAt: string;
  key: string; // password
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
  pdfDownloadCount?: number;
  lastPdfDownloadedAt?: string;
  personalDetailsPurged?: boolean;
  personalDetailsPurgedAt?: string;
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
  adminReply?: string;
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
  altPhone?: string; // 5. ගිණුමට ලබාදුන් අංකය හැර වෙනත් දුරකථන අංක
  serviceTitle: string; // 1. ඔබට ලබාදිය හැකි සේවය කුමක්ද?
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
}

