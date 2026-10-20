import { User, Issue, LocationOption, HelpPost, RegistrationConfig, CategoryItem, TagItem } from '../types';

export const donationCategoriesList = [
  { id: 'financial', name: 'මූල්‍යමය සහ ආර්ථික පරිත්‍යාග', icon: 'HandCoins' },
  { id: 'material', name: 'භෞතික ද්‍රව්‍ය සහ සම්පත් පරිත්‍යාග', icon: 'PackageOpen' },
  { id: 'time', name: 'කාලය සහ ශ්‍රමය පරිත්‍යාග කිරීම', icon: 'Clock' },
  { id: 'intellectual', name: 'බුද්ධිමය සහ නිර්මාණාත්මක ද්‍රව්‍ය', icon: 'Lightbulb' },
  { id: 'animal_env', name: 'සත්ව සහ පරිසර පරිත්‍යාග', icon: 'Sprout' },
  { id: 'digital', name: 'ඩිජිටල් වත්කම් සහ තාක්ෂණික දත්ත', icon: 'Laptop' },
  { id: 'other', name: 'වෙනත් විශේෂිත පරිත්‍යාග', icon: 'Gift' },
  { id: 'biological', name: 'ශරීර අවයව සහ ජීව විද්‍යාත්මක ද්‍රව්‍ය', icon: 'HeartPulse' }
];

export const initialTags: TagItem[] = [
  { id: 'tag_financial_don', tagName: 'මූල්‍යමය සහ ආර්ථික පරිත්‍යාග', category: 'පරිත්‍යාග' },
  { id: 'tag_material', tagName: 'භෞතික ද්‍රව්‍ය සහ සම්පත් පරිත්‍යාග', category: 'පරිත්‍යාග' },
  { id: 'tag_time', tagName: 'කාලය සහ ශ්‍රමය පරිත්‍යාග කිරීම', category: 'පරිත්‍යාග' },
  { id: 'tag_intellectual', tagName: 'බුද්ධිමය සහ නිර්මාණාත්මක ද්‍රව්‍ය', category: 'පරිත්‍යාග' },
  { id: 'tag_animal_env', tagName: 'සත්ව සහ පරිසර පරිත්‍යාග', category: 'පරිත්‍යාග' },
  { id: 'tag_digital', tagName: 'ඩිජිටල් වත්කම් සහ තාක්ෂණික දත්ත', category: 'පරිත්‍යාග' },
  { id: 'tag_other_don', tagName: 'වෙනත් විශේෂිත පරිත්‍යාග', category: 'පරිත්‍යාග' },
  { id: 'tag_env', tagName: 'පරිසර', category: 'පරිසර, හරිත' },
  { id: 'tag_legal', tagName: 'නීතිමය', category: 'නීති, ආරවුල්' },
  { id: 'tag_health', tagName: 'සෞඛ්‍ය', category: 'සෞඛ්‍ය, වෛද්‍ය' },
  { id: 'tag_transport', tagName: 'ප්‍රවාහන', category: 'ප්‍රවාහන, ගමනාගමන' },
  { id: 'tag_mech', tagName: 'කාර්මික', category: 'Mechanical, Repair' },
  { id: 'tag_school', tagName: 'පාසල්', category: 'පාසල්, අධ්‍යාපන' },
  { id: 'tag_learning', tagName: 'ඉගෙනුම්', category: 'ඉගෙනුම්, අධ්‍යයන' },
  { id: 'tag_security', tagName: 'ආරක්ෂක', category: 'ආරක්ෂක, නීතිය' },
  { id: 'tag_financial', tagName: 'මූල්‍යමය', category: 'මූල්‍ය, ආර්ථික' },
  { id: 'tag_food', tagName: 'කෑම / බීම', category: 'ආහාර, පෝෂණ' },
  { id: 'tag_biological', tagName: 'ශරීර අවයව සහ ජීව විද්‍යාත්මක ද්‍රව්‍ය', category: 'පරිත්‍යාග' },
];

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
  showDemoUserLogin: false,
};

export const initialCategories: CategoryItem[] = [
  {
    id: 'quick_services',
    nameSi: 'ඉක්මන් සේවා',
    nameEn: 'Quick Services',
    nameTa: 'விரைவான சேவைகள்',
    descSi: 'හදිසි සහ සෘජු උපකාරී සේවාවන්',
    descEn: 'Urgent and direct assistance services',
    descTa: 'அவசர மற்றும் நேரடி உதவி சேவைகள்',
    icon: 'Zap',
    customFields: [
      {
        id: 'f_urgency',
        labelSi: 'හදිසිභාවය',
        labelEn: 'Urgency Level',
        labelTa: 'அவசர நிலை',
        fieldType: 'dropdown',
        required: true,
        options: ['අතිශය හදිසි', 'පැය 2ක් ඇතුළත', 'සාමාන්‍ය'],
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
    id: 'normal_services',
    nameSi: 'සාමාන්‍ය සේවා',
    nameEn: 'General Services',
    nameTa: 'பொதுவான சேவைகள்',
    descSi: 'දෛනික සහ සාමාන්‍ය උපකාරී සේවාවන්',
    descEn: 'Daily and general assistance services',
    descTa: 'அன்றாட மற்றும் பொதுவான உதவி சேவைகள்',
    icon: 'Wrench',
    customFields: [
      {
        id: 'f_urgency',
        labelSi: 'හදිසිභාවය',
        labelEn: 'Urgency Level',
        labelTa: 'அவசர நிலை',
        fieldType: 'dropdown',
        required: true,
        options: ['සාමාන්‍ය', 'දින 1-2 ඇතුළත', 'සති අන්තයේ'],
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
    id: 'find_for_me',
    nameSi: 'සොයාදෙන්න',
    nameEn: 'Find for Me',
    nameTa: 'தேடித் தாருங்கள்',
    descSi: 'නැතිවූ, සොරාගත් හෝ අවශ්‍ය දේ සොයාගැනීමේ සේවාව',
    descEn: 'Lost, stolen or procurement search request',
    descTa: 'இழந்த அல்லது திருடப்பட்டவை தேடல் சேவை',
    icon: 'Search',
    customFields: [],
  },
  {
    id: 'professional_services',
    nameSi: 'වෘත්තීය සේවා',
    nameEn: 'Professional Services',
    nameTa: 'தொழில்முறை சேவைகள்',
    descSi: 'සුදුසුකම් ලත් වෘත්තිකයන් සහ තාක්ෂණික සේවා සැපයුම්කරුවන්',
    descEn: 'Qualified professionals and technical service providers',
    descTa: 'தகுதிவாய்ந்த வல்லுநர்கள் மற்றும் சேவை வழங்குநர்கள்',
    icon: 'Briefcase',
    customFields: [],
  },
  {
    id: 'from_me_to_you',
    nameSi: 'මගෙන් ඔබට',
    nameEn: 'From Me to You',
    nameTa: 'என்னிடமிருந்து உங்களுக்கு',
    descSi: 'පරිත්‍යාග, ඉවත්කරන ද්‍රව්‍ය හෝ හුවමාරු කිරීම්',
    descEn: 'Donations, item giveaways & barters/exchanges',
    descTa: 'நன்கொடைகள், அகற்றல்கள் மற்றும் பரிமாற்றங்கள்',
    icon: 'Gift',
    customFields: [],
  },
];

export const initialLocations: LocationOption[] = [
  { id: 'loc_kovinna', nameSi: 'කෝවින්න, ගංගාරාම පාර, කටුනායක', nameEn: 'Kovinna, Gangarama Road, Katunayake', nameTa: 'கோவின்ன, கங்காராம வீதி, கட்டுநாயக்க', lat: 7.1710, lng: 79.8986 },
  { id: 'loc_kadawatha', nameSi: 'කඩවත, නුවර පාර, කඩවත', nameEn: 'Kadawatha, Kandy Road, Kadawatha', nameTa: 'கடவத்தை, கண்டி வீதி, கடவத்தை', lat: 7.0016, lng: 79.9500 },
  { id: 'loc_kiribathgoda', nameSi: 'කිරිබත්ගොඩ, නුවර පාර, කිරිබත්ගොඩ', nameEn: 'Kiribathgoda, Kandy Road, Kiribathgoda', nameTa: 'கிரிபத்கொட, கண்டி வீதி, கிரிபத்கொட', lat: 6.9800, lng: 79.9300 },
  { id: 'loc_gampaha', nameSi: 'ගම්පහ, මිරිස්වත්ත පාර, ගම්පහ', nameEn: 'Gampaha, Miriswatta Road, Gampaha', nameTa: 'கம்பஹா, மிரிஸ்வத்த வீதி, கம்பஹா', lat: 7.0917, lng: 79.9997 },
  { id: 'loc_nittambuwa', nameSi: 'නිට්ටඹුව, කොළඹ - නුවර ප්‍රධාන පාර, නිට්ටඹුව', nameEn: 'Nittambuwa, Colombo - Kandy Main Road, Nittambuwa', nameTa: 'நிட்டம்புவ, கொழும்பு - கண்டி பிரதான வீதி, நிட்டம்புவ', lat: 7.1444, lng: 80.1031 },
  { id: 'loc_colombo7', nameSi: 'කුරුඳුගහ, හෝටන් පෙදෙස, කොළඹ 07', nameEn: 'Cinnamon Gardens, Horton Place, Colombo 07', nameTa: 'கறுவாத்தோட்டம், ஹோர்டன் பிளேஸ், கொழும்பு 07', lat: 6.9061, lng: 79.8708 },
  { id: 'loc_kandy', nameSi: 'මහනුවර, දළදා වීදිය, මහනුවර', nameEn: 'Kandy, Dalada Veediya, Kandy', nameTa: 'கண்டி, தளதா வீதி, கண்டி', lat: 7.2906, lng: 80.6337 },
];

// 📋 දැන්වීම් පුවරුව ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල දැන්වීම් සියල්ල ඉවත් කර ඇත)
export const initialHelpPosts: HelpPost[] = [];

// 👤 සැබෑ පරිපාලක ගිණුම පමණක් තබා ව්‍යාජ සාම්පල පරිශීලකයින් (සම්පත් පෙරේරා ආදී) ඉවත් කර ඇත
export const initialUsers: User[] = [
  {
    id: 'usr_admin',
    userId: '970181547V',
    userNumericId: '970181547',
    credits: 500,
    name: 'පරිපාලක (Admin)',
    email: 'admin@supporservice.online',
    nicNumber: '970181547V',
    phone: '',
    address: 'ශ්‍රී ලංකාව',
    role: 'admin',
    status: 'approved',
    photoUrl: '',
    registeredAt: '2026-08-01 09:00',
    key: '1691@@Devhas',
    welcomeGiftCredited: true,
  }
];

export const initialIssues: Issue[] = [];
