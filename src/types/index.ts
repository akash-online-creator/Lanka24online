export type Role = 'user' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';
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
  whatsappSent?: boolean;
}

export interface HelpPost {
  id: string;
  postCode: string; // e.g., #POST-7891
  userName: string;
  userPhone: string; // WhatsApp number
  whatHappened: string; // සිදුවී ඇති දේ
  whatIsNeeded: string; // වියයුතු දේ
  conditions?: string; // කොන්දේසි
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
  repliesCount: number;
  helpersCount: number;
  replies: PostReply[];
  verifiedOtp?: boolean;
  category?: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: 'seeker' | 'helper';
  text: string;
  timestamp: string;
}

export interface User {
  id: string;
  userId: string; // E.g., SS-980124 or email
  name: string;
  email: string;
  nicNumber: string;
  phone: string;
  address?: string;
  role: Role;
  status: UserStatus;
  photoUrl?: string;
  idCardPhotoUrl?: string;
  registeredAt: string;
  key: string; // password
  rejectionReason?: string;
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
