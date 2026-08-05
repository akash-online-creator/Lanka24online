import { User, Issue, LocationOption, HelpPost, RegistrationConfig, CategoryItem } from '../types';

export const initialRegistrationConfig: RegistrationConfig = {
  mainTitle: {
    si: 'සහය සේවා ලියාපදිංචිය',
    en: 'Sahaya Seva Registration',
    ta: 'சஹாய சேவா பதிவு',
  },
  subtitle: {
    si: 'ඔබගේ නම, ජා.හැ. අංකය සහ ජායාරූපය ඇතුළත් කර අනුමැතිය ලබාගන්න.',
    en: 'Provide your name, NIC, and photo to receive admin verification.',
    ta: 'நிர்வாகி அங்கீகாரத்தைப் பெற உங்கள் பெயர், NIC மற்றும் புகைப்படத்தைச் சமர்ப்பிக்கவும்.',
  },
  noticeBanner: {
    si: 'ඔබ ඇතුළත් කරන සියලුම තොරතුරු පරිපාලක (Admin) විසින් පරීක්ෂා කර අනුමත කළ පසුව පමණක් ගිණුම සක්‍රීය වේ.',
    en: 'All provided details will be reviewed and approved by the Admin before account activation.',
    ta: 'கணக்கு செயல்படுத்தப்படுவதற்கு முன்பு அனைத்து விவரங்களும் நிர்வாகியால் சரிபார்க்கப்பட்டு அங்கீகரிக்கப்படும்.',
  },
  termsAndConditions: {
    si: '1. ව්‍යාජ විස්තර ඇතුළත් කිරීම තහනම්ය.\n2. බ්ලොක් කළ ගිණුම්වල IP, NIC, දුරකථන සහ Gmail නැවත ලියාපදිංචි විය නොහැක.\n3. සාමකාමී සහ සත්‍ය සේවාවන් සඳහා පමණක් පද්ධතිය භාවිතා කරන්න.',
    en: '1. False information is strictly prohibited.\n2. Blocked IP, NIC, Phone and Gmail cannot re-register.\n3. Use the platform for genuine service assistance only.',
    ta: '1. தவறான தகவல்களை வழங்குவது கண்டிப்பாகத் தடைசெய்யப்பட்டுள்ளது.\n2. தடுக்கப்பட்ட IP, NIC, போன் மற்றும் ஜிமெயில் மீண்டும் பதிவு செய்ய முடியாது.\n3. உண்மையான உதவி பெற மட்டுமே தளத்தைப் பயன்படுத்தவும்.',
  },
};

export const initialCategories: CategoryItem[] = [
  {
    id: 'quick_services',
    nameSi: 'ඉක්මන් සේවා (Quick Services)',
    nameEn: 'Quick Services',
    nameTa: 'விரைவான சேவைகள்',
    descSi: 'හදිසි සහ සෘජු උපකාරී සේවාවන්',
    descEn: 'Urgent and direct assistance services',
    descTa: 'அவசர மற்றும் நேரடி உதவி சேவைகள்',
    icon: 'Zap',
    customFields: [
      {
        id: 'f_urgency',
        labelSi: 'හදිසිභාවය (Urgency Level)',
        labelEn: 'Urgency Level',
        labelTa: 'அவசர நிலை',
        fieldType: 'dropdown',
        required: true,
        options: ['අතිශය හදිසි (Immediate)', 'පැය 2ක් ඇතුළත (Within 2 hrs)', 'සාමාන්‍ය (Normal)'],
      },
      {
        id: 'f_details',
        labelSi: 'විශේෂ උපදෙස්',
        labelEn: 'Special Instructions',
        labelTa: 'சிறப்பு அறிவுறுத்தல்கள்',
        fieldType: 'textarea',
        required: false,
      },
    ],
  },
  {
    id: 'emergency',
    nameSi: 'හදිසි අවස්ථා සහ වෛද්‍ය',
    nameEn: 'Emergency & Medical',
    nameTa: 'அவசரநிலை & மருத்துவம்',
    descSi: 'ලෙඩ රෝග සහ හදිසි අනතුරු සේවා',
    descEn: 'Medical emergencies and accident assistance',
    descTa: 'மருத்துவ அவசரநிலைகள் மற்றும் உதவி',
    icon: 'PhoneCall',
    customFields: [
      {
        id: 'f_patient_type',
        labelSi: 'රෝගී තත්ත්වය / අවශ්‍යතාවය',
        labelEn: 'Patient Condition',
        labelTa: 'நோயாளி நிலை',
        fieldType: 'text',
        required: true,
      },
      {
        id: 'f_ambulance',
        labelSi: 'ගිලන් රථයක් අවශ්‍යද (Ambulance Required)?',
        labelEn: 'Ambulance Required?',
        labelTa: 'ஆம்புலன்ஸ் தேவையா?',
        fieldType: 'checkbox',
        required: false,
      },
    ],
  },
  {
    id: 'vehicle',
    nameSi: 'වාහන අලුත්වැඩියා සහ ප්‍රවාහන',
    nameEn: 'Vehicle & Transport',
    nameTa: 'வாகனம் & போக்குவரத்து',
    descSi: 'වාහන බිඳවැටීම්, ටෝවිං සහ ගරාජ් සේවා',
    descEn: 'Vehicle breakdown, towing, garage assistance',
    descTa: 'வாகன பழுது & போக்குவரத்து சேவைகள்',
    icon: 'Car',
    customFields: [
      {
        id: 'f_vehicle_type',
        labelSi: 'වාහන වර්ගය',
        labelEn: 'Vehicle Type',
        labelTa: 'வாகன வகை',
        fieldType: 'dropdown',
        required: true,
        options: ['මෝටර් බයිසිකල් (Bike)', 'ත්‍රිරෝද රථ (TukTuk)', 'කාර් / වැන් (Car/Van)', 'ලොරි / බස් (Lorry/Bus)'],
      },
      {
        id: 'f_breakdown_type',
        labelSi: 'දෝෂය (Engine/Tire/Fuel)',
        labelEn: 'Issue Type',
        labelTa: 'பிரச்சனை வகை',
        fieldType: 'text',
        required: true,
      },
    ],
  },
  {
    id: 'services',
    nameSi: 'ගෘහස්ථ සහ කාර්මික සේවා',
    nameEn: 'Home & Technical Services',
    nameTa: 'வீட்டுச் சேவைகள்',
    descSi: 'විදුලි, ජලනල, වඩඩු සහ නඩත්තු සේවා',
    descEn: 'Electrical, plumbing, carpentry, maintenance',
    descTa: 'மின்சாரம், பிளம்பிங் & பராமரிப்பு',
    icon: 'Wrench',
    customFields: [
      {
        id: 'f_service_type',
        labelSi: 'සේවා වර්ගය',
        labelEn: 'Service Needed',
        labelTa: 'தேவைப்படும் சேவை',
        fieldType: 'dropdown',
        required: true,
        options: ['විදුලි (Electrician)', 'ජලනල (Plumber)', 'වඩඩු (Carpenter)', 'පින්තාරු (Painter)', 'වෙනත් (Other)'],
      },
    ],
  },
];

export const initialLocations: LocationOption[] = [
  { id: 'loc_kovinna', nameSi: 'කෝවින්න, ගංගාරාම පාර, කටුනායක', nameEn: 'Kovinna, Gangarama Road, Katunayake', nameTa: 'Kovinna, Gangarama Road, Katunayake', lat: 7.1710, lng: 79.8986 },
  { id: 'loc_kadawatha', nameSi: 'කඩවත, නුවර පාර, කඩවත', nameEn: 'Kadawatha, Kandy Road, Kadawatha', nameTa: 'Kadawatha, Kandy Road, Kadawatha', lat: 7.0016, lng: 79.9500 },
  { id: 'loc_kiribathgoda', nameSi: 'කිරිබත්ගොඩ, නුවර පාර, කිරිබත්ගොඩ', nameEn: 'Kiribathgoda, Kandy Road, Kiribathgoda', nameTa: 'Kiribathgoda, Kandy Road, Kiribathgoda', lat: 6.9800, lng: 79.9300 },
  { id: 'loc_gampaha', nameSi: 'ගම්පහ, මිරිස්වත්ත පාර, ගම්පහ', nameEn: 'Gampaha, Miriswatta Road, Gampaha', nameTa: 'Gampaha, Miriswatta Road, Gampaha', lat: 7.0917, lng: 79.9997 },
  { id: 'loc_nittambuwa', nameSi: 'නිට්ටඹුව, කොළඹ - නුවර ප්‍රධාන පාර, නිට්ටඹුව', nameEn: 'Nittambuwa, Colombo - Kandy Main Road, Nittambuwa', nameTa: 'Nittambuwa, Colombo - Kandy Main Road, Nittambuwa', lat: 7.1444, lng: 80.1031 },
  { id: 'loc_colombo7', nameSi: 'කුරුඳුගහ, හෝටන් පෙදෙස, කොළඹ 07', nameEn: 'Cinnamon Gardens, Horton Place, Colombo 07', nameTa: 'Cinnamon Gardens, Horton Place, Colombo 07', lat: 6.9061, lng: 79.8708 },
  { id: 'loc_kandy', nameSi: 'මහනුවර, දළදා වීදිය, මහනුවර', nameEn: 'Kandy, Dalada Veediya, Kandy', nameTa: 'Kandy, Dalada Veediya, Kandy', lat: 7.2906, lng: 80.6337 },
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
