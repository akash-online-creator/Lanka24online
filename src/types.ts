export interface UserRegistration {
  id: string;
  fullName: string;
  nicNumber: string;
  phone: string;
  email?: string;
  address: string;
  district: string;
  userRole: 'volunteer' | 'helper' | 'recipient' | 'first_responder';
  skills?: string[];
  bloodGroup?: string;
  idCardFrontImage: string; // Base64 or URL
  idCardBackImage?: string;
  verifiedStatus: 'pending' | 'verified' | 'rejected';
  registeredAt: number;
  latitude?: number;
  longitude?: number;
  emergencyContact?: string;
}

export interface BulletinPost {
  id: string;
  title: string;
  category: 'medical' | 'flood' | 'food' | 'transport' | 'shelter' | 'blood' | 'sos' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  district: string;
  contactName: string;
  contactPhone: string;
  createdAt: number;
  verified: boolean;
  resolved: boolean;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  tags?: string[];
}

export interface EmergencyContactItem {
  id: string;
  nameSi: string;
  nameEn: string;
  number: string;
  category: string;
  badge: string;
  description: string;
}
