import { User, Issue, LocationOption, HelpPost } from '../types';

export const initialLocations: LocationOption[] = [
  { id: 'loc_kadawatha', nameSi: 'කඩවත', nameEn: 'Kadawatha', nameTa: 'கடவத்த', lat: 7.0016, lng: 79.9500 },
  { id: 'loc_kiribathgoda', nameSi: 'කිරිබත්ගොඩ', nameEn: 'Kiribathgoda', nameTa: 'கிரிபத்கொட', lat: 6.9800, lng: 79.9300 },
  { id: 'loc_gampaha', nameSi: 'ගම්පහ', nameEn: 'Gampaha', nameTa: 'கம்பஹா', lat: 7.0917, lng: 79.9997 },
  { id: 'loc_nittambuwa', nameSi: 'නිට්ටඹුව', nameEn: 'Nittambuwa', nameTa: 'நிட்டம்புவ', lat: 7.1444, lng: 80.1031 },
  { id: 'loc_colombo7', nameSi: 'කොළඹ 07 (Cinnamon Gardens)', nameEn: 'Colombo 07', nameTa: 'கொழும்பு 07', lat: 6.9061, lng: 79.8708 },
  { id: 'loc_kandy', nameSi: 'මහනුවර', nameEn: 'Kandy', nameTa: 'கண்டி', lat: 7.2906, lng: 80.6337 },
];

export const initialHelpPosts: HelpPost[] = [];

export const initialUsers: User[] = [
  {
    id: 'usr_admin',
    userId: '970181547V',
    name: 'පරිපාලක (System Administrator)',
    email: 'admin@sahaya.lk',
    nicNumber: '970181547V',
    phone: '0771234567',
    address: 'කොළඹ 07',
    role: 'admin',
    status: 'approved',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    registeredAt: '2026-08-01 09:00',
    key: '1691@@Devhas',
  },
];

export const initialIssues: Issue[] = [];
