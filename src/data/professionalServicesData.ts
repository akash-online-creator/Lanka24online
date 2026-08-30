import { ProfessionalServiceCategory, ProfessionalService } from '../types';

export const professionalServiceCategories: ProfessionalServiceCategory[] = [
  {
    category_id: 'home_maintenance',
    category_name: 'ගෘහස්ථ නඩත්තු හා අලුත්වැඩියා',
    category_icon: '🛠️',
    sub_categories: [
      { name: 'විදුලි කාර්මික (Electrician)', icon: '⚡' },
      { name: 'නළ කාර්මික (Plumber)', icon: '🚰' },
      { name: 'වඩු කාර්මික (Carpenter)', icon: '🪚' },
      { name: 'පෙදරේරු සහ මේසන් වැඩ (Mason / Construction)', icon: '🧱' },
      { name: 'පින්තාරු කිරීම සහ ගෘහ අලංකරණය (Painting & Decorating)', icon: '🎨' },
      { name: 'වායුසමීකරණ (AC) අලුත්වැඩියා සහ සේවා', icon: '❄️' },
      { name: 'ශීතකරණ සහ රෙදි සෝදන යන්ත්ර අලුත්වැඩියා', icon: '🔌' },
      { name: 'සූර්ය පැනල (Solar Panel) නඩත්තු සහ සේවා', icon: '☀️' },
      { name: 'CCTV සහ ආරක්ෂක කැමරා ස්ථාපනය', icon: '📹' },
      { name: 'ඡායාරූප සහ විදුලි පහන් උපාංග සවි කිරීම', icon: '💡' }
    ]
  },
  {
    category_id: 'cleaning_household',
    category_name: 'පිරිසිදු කිරීම සහ ගෘහපාලන සේවා',
    category_icon: '🧹',
    sub_categories: [
      { name: 'නිවෙස් සහ කාර්යාල පිරිසිදු කිරීම (General Cleaning)', icon: '🧽' },
      { name: 'සෝෆා සහ කාපට් පිරිසිදු කිරීම (Sofa & Carpet Cleaning)', icon: '🛋️' },
      { name: 'ජල ටැංකි පිරිසිදු කිරීම (Water Tank Cleaning)', icon: '💧' },
      { name: 'මදුරු හා කෘමි පාලනය (Pest Control)', icon: '🦟' },
      { name: 'කුණු සහ අපද්රව්ය ඉවත් කිරීම (Garbage Removal)', icon: '🗑️' },
      { name: 'නිවෙස් පාලිකාවන් / සේවිකාවන් (Maids / Domestic Helpers)', icon: '👩‍🦰' },
      { name: 'උයන්පල්ලන් සහ භූමි අලංකරණය (Gardeners / Landscaping)', icon: '🌱' }
    ]
  },
  {
    category_id: 'personal_care',
    category_name: 'පද්ගලික සත්කාර සහ සුවතා',
    category_icon: '✨',
    sub_categories: [
      { name: 'රූපලාවන්ය ශිල්පිනී / ශිල්පී (Beautician / Hair Stylist)', icon: '💇' },
      { name: 'මේකප් ශිල්පී (Makeup Artist)', icon: '💄' },
      { name: 'පෞද්ගලික සම්බාහන සේවා (Spa & Massage Therapist)', icon: '💆' },
      { name: 'නියපොතු සත්කාර (Nail Art / Manicure & Pedicure)', icon: '💅' },
      { name: 'මඟුල් ඇඳුම් සහ හැඩගැන්වීම් (Bridal Dressing)', icon: '👰' },
      { name: 'සුරතල් සතුන් රැකබලා ගැනීම සහ නෑම (Pet Grooming & Walking)', icon: '🐕' }
    ]
  },
  {
    category_id: 'health_medical',
    category_name: 'සෞඛ්ය සහ වෛද්ය සේවා',
    category_icon: '🏥',
    sub_categories: [
      { name: 'නිවෙසට පැමිණෙන සාමාන්ය වෛද්යවරුන් (General Practitioner)', icon: '👨‍⚕️' },
      { name: 'හෙදියන් සහ රෝගීන් බලාගන්නන් (Caregivers / Home Nurses)', icon: '🩺' },
      { name: 'භෞතචිකිත්සක (Physiotherapist)', icon: '🦴' },
      { name: 'රසායනාගාර පරීක්ෂණ සඳහා රුධිරය ලබාගැනීම (Lab Blood Collection)', icon: '🩸' },
      { name: 'දන්ත වෛද්ය උපදේශන (Dental Consultation)', icon: '🦷' },
      { name: 'ඖෂධ නිවසට ගෙනැවිත් දීම (Pharmacy Delivery)', icon: '💊' },
      { name: 'වාචික සහ භාෂා ප්රතිකාර (Speech Therapy at Home)', icon: '🗣️' },
      { name: 'ස්නායු රෝගීන්ට අවශ්ය පුනරුත්ථාපන ව්යායාම', icon: '🧠' },
      { name: 'මානසික ආතතිය දුරු කිරීමේ සහ සුවතා වැඩසටහන්', icon: '🧘‍♂️' }
    ]
  },
  {
    category_id: 'education_tutors',
    category_name: 'වෘත්තීය සහ උපකාරක පන්ති',
    category_icon: '📚',
    sub_categories: [
      { name: 'පාසල් විෂය සඳහා පෞද්ගලික උපකාරක පන්ති (Academic Tutors)', icon: '📖' },
      { name: 'සංගීත, නැටුම් සහ චිත්ර උපදේශකයන් (Music, Dance & Art)', icon: '🎸' },
      { name: 'ක්රීඩා පුහුණුකරුවන් (Personal Fitness Trainer / Gym)', icon: '🏋️‍♂️' },
      { name: 'පිහිනුම් පුහුණුකරුවන් (Swimming Coach)', icon: '🏊‍♂️' },
      { name: 'රියදුරු උපදේශකයන් (Driving Instructor)', icon: '🚗' },
      { name: 'භාෂා උපදේශකයන් (Language Tutors)', icon: '🗣️' },
      { name: 'ළමුන් සඳහා මොළයේ ක්රියාකාරීත්වය වැඩි දියුණු කිරීමේ පුහුණුකරුවන්', icon: '🧩' },
      { name: 'කියවීමේ සහ ලිවීමේ ආබාධ ඇති දරුවන්ට විශේෂ උපකාර', icon: '📝' },
      { name: 'යොවුන් වියේ පසුවන අයට මඟපෙන්වන තරුණ උපදේශකයන්', icon: '🌟' }
    ]
  },
  {
    category_id: 'tech_digital',
    category_name: 'තාක්ෂණික සහ ඩිජිටල් සේවා',
    category_icon: '💻',
    sub_categories: [
      { name: 'පරිගණක සහ ලැප්ටොප් අලුත්වැඩියා (Computer Repair)', icon: '💻' },
      { name: 'ජංගම දුරකථන අලුත්වැඩියා (Mobile Phone Repair)', icon: '📱' },
      { name: 'අන්තර්ජාල සහ වයි-ෆයි සැකසීම (Internet & Wi-Fi Setup)', icon: '📶' },
      { name: 'වෙබ් අඩවි නිර්මාණය සහ මෘදුකාංග සංවර්ධනය', icon: '🌐' },
      { name: 'ඩිජිටල් අලෙවිකරණය (Digital Marketing)', icon: '📈' },
      { name: 'ග්රැෆික් නිර්මාණකරණය (Graphic Design)', icon: '🎨' },
      { name: 'යූ ටියුබ් හෝ ටික්ටෝක් වීඩියෝ තිර රචනා ලිවීම', icon: '🎬' },
      { name: 'පොඩ්කාස්ට් ශ්රව්ය සංස්කරණය (Podcast Production)', icon: '🎙️' },
      { name: 'ඊ-වාණිජ්ය වෙළඳසැල් සඳහා නිෂ්පාදන ඡායාරූපකරණය', icon: '📸' },
      { name: 'මැකී ගිය දත්ත නැවත ලබාගැනීමේ සේවා (Data Recovery)', icon: '💾' },
      { name: 'මුද්රණ යන්ත්ර සහ රවුටර වින්යාස කරදෙන තාක්ෂණ ශිල්පීන්', icon: '🖨️' }
    ]
  },
  {
    category_id: 'events_wedding',
    category_name: 'මංගල සහ උත්සව සේවා',
    category_icon: '🎉',
    sub_categories: [
      { name: 'ඡායාරූප ශිල්පී සහ වීඩියෝකරණය (Photographer & Videographer)', icon: '📷' },
      { name: 'මංගල සැලසුම්කරු (Wedding Planner)', icon: '💍' },
      { name: 'කේක් නිර්මාණ ශිල්පී (Wedding Cake Structure)', icon: '🎂' },
      { name: 'උත්සව ශාලා මල් අලංකරණය (Floral & Event Decorator)', icon: '💐' },
      { name: 'නිවේදකයන් සහ DJ ශිල්පීන් (Emcee & DJ Services)', icon: '🎧' },
      { name: 'කැටරින් සහ ආහාර සැපයීම් (Catering Services)', icon: '🍲' },
      { name: 'ආරාධනා පත්ර සහ ඩිජිටල් කාඩ්පත් නිර්මාණය', icon: '✉️' },
      { name: 'මංගල රථ අලංකරණ සහ කුලී සේවා', icon: '🚗' },
      { name: 'සජීවී සංගීත කණ්ඩායම් (Live Bands / Instrumentalists)', icon: '🎷' },
      { name: 'උත්සව සඳහා නර්තන කණ්ඩායම් (Dance Troupes)', icon: '💃' },
      { name: 'බාර්ටෙන්ඩර්වරුන් සහ පානය සකස් කරන්නන්', icon: '🍸' },
      { name: 'මැජික් දැක්වීම් සහ විහිළු තහළු ඉදිරිපත් කරන්නන්', icon: '🪄' }
    ]
  },
  {
    category_id: 'transport_travel',
    category_name: 'ප්රවාහන සහ සංචාරක සේවා',
    category_icon: '🚗',
    sub_categories: [
      { name: 'පෞද්ගලික රියදුරු (Personal Chauffeur / Driver)', icon: '👔' },
      { name: 'කුලී රථ සහ ත්රිරෝද රථ සේවා (Taxi / Three-wheel)', icon: '🛺' },
      { name: 'භාණ්ඩ ප්රවාහන සහ මාරු කිරීමේ සේවා (Movers / Lorry)', icon: '🚚' },
      { name: 'සංචාරක මගපෙන්වන්නා (Tourist Guide)', icon: '🗺️' },
      { name: 'වාහන වොෂ් සහ ඩීටේලිං (Mobile Car Wash)', icon: '🧽' },
      { name: 'පෞද්ගලික බෝට්ටු හෝ යාත්රා කුලියට දීමේ සේවා', icon: '🛥️' },
      { name: 'ඩ්රෝන මඟින් ගුවන් ඡායාරූප සහ වීඩියෝ ලබාගැනීම', icon: '🛸' },
      { name: 'කැලෑ සවාරි සහ වනජීවී ඡායාරූප මාර්ගෝපදේශකයන්', icon: '🐅' },
      { name: 'වාහන මිලදී ගැනීමේදී තත්ත්වය පරීක්ෂා කිරීම', icon: '🔍' },
      { name: 'නිවෙස් වෙත පැමිණ බැටරි මාරු කිරීමේ සේවා', icon: '🔋' },
      { name: 'ටයර් පන්චර් සකස් කරන සේවාවන් (Mobile Tire Repair)', icon: '🛞' }
    ]
  },
  {
    category_id: 'professional_legal',
    category_name: 'ව්යාපාරික, නීතිමය සහ මූල්ය සේවා',
    category_icon: '⚖️',
    sub_categories: [
      { name: 'නීතිඥ සහ නොතාරිස් සේවා (Lawyer & Notary Public)', icon: '⚖️' },
      { name: 'ගණකාධිකාරී සහ බදු උපදේශක (Accountant & Tax Consultant)', icon: '📊' },
      { name: 'පරිවර්තක (Sworn Translator)', icon: '🗣️' },
      { name: 'ඉඩම් මැනුම් ශිල්පී (Land Surveyor)', icon: '📐' },
      { name: 'රියල් එස්ටේට් නියෝජිත (Real Estate Agent / Broker)', icon: '🏢' },
      { name: 'ජෝතිෂ්ය සහ වාస్తు විද්යා උපදේශක (Astrologer & Vastu)', icon: '🔮' },
      { name: 'වීසා, ගමන් බලපත්ර සහ රාජ්ය ලියකියවිලි නියෝජිතයන්', icon: '🛂' },
      { name: 'ව්යාපාර ලියාපදිංචි කිරීමේ සහ සමාගම් ලේකම් සේවා', icon: '📁' },
      { name: 'කොටස් වෙළඳපොළ සහ ක්රිප්ටෝ ආයෝජන උපදේශකයන්', icon: '📈' },
      { name: 'පෞද්ගලික ණය කළමනාකරණය සහ අයවැය සැලසුම්කරුවන්', icon: '💳' },
      { name: 'බුද්ධිමය දේපළ ප්රකාශන හිමිකම් සහායකයන්', icon: '©️' },
      { name: 'බැංකු ණය සඳහා ව්යාපාරික සැලසුම් සකස් කරදෙන උපදේශකයන්', icon: '📑' }
    ]
  }
];

export const initialProfessionalServices: ProfessionalService[] = [
  {
    id: 'ps_1',
    userId: '970181547V',
    providerName: 'සුනිල් ශාන්ත පෙරේරා',
    providerPhotoUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400&auto=format&fit=crop&q=80',
    providerPhone: '0771234567',
    providerWhatsapp: '0771234567',
    altPhone: '0112918234',
    serviceTitle: 'ගෘහස්ථ සහ කාර්මික විදුලි රැහැන් ඇදීම හා පරිපූර්ණ අලුත්වැඩියාව',
    deliveryMethod: 'anywhere',
    deliveryMethodDetails: 'බස්නාහිර පළාතේ ඕනෑම ස්ථානයකට පැමිණිය හැක.',
    locationName: 'කඩවත (Kadawatha)',
    lat: 7.0016,
    lng: 79.9535,
    qualifications: 'NVQ Level 4 Electrician සහතිකලත්, වසර 8ක ක්ෂේත්‍ර සුදුසුකම් සහිතයි.',
    experienceDuration: 'වසර 8+',
    categoryId: 'home_maintenance',
    categoryName: 'ගෘහස්ථ නඩත්තු හා අලුත්වැඩියා',
    categoryIcon: '🛠️',
    subCategoryName: 'විදුලි කාර්මික (Electrician)',
    subCategoryIcon: '⚡',
    createdAt: 'මීට දින 2කට පෙර',
    createdAtMs: Date.now() - 172800000,
    isVerified: true,
    avgRating: 4.9,
    reviews: [
      {
        id: 'rev_1',
        userId: 'u_101',
        userName: 'කමල් ගුණවර්ධන',
        rating: 5,
        comment: 'ඉතාම ඉක්මනින් පැමිණ ඉතාම පිළිවෙළට සහ සාධාරණ මිලකට නිවසේ විදුලි කාන්දුව සකස් කර දුන්නා. ස්තුතියි!',
        createdAt: 'මීට දිනකට පෙර',
        createdAtMs: Date.now() - 86400000
      },
      {
        id: 'rev_2',
        userId: 'u_102',
        userName: 'නිශාන්ත ප්‍රනාන්දු',
        rating: 5,
        comment: 'විශ්වාසවන්ත පළපුරුදු විදුලි කාර්මිකයෙක්. බෙහෙවින් අගය කරමි.',
        createdAt: 'මීට පැය 5කට පෙර',
        createdAtMs: Date.now() - 18000000
      }
    ]
  },
  {
    id: 'ps_2',
    userId: '920456123V',
    providerName: 'චතුරංග බණ්ඩාර',
    providerPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    providerPhone: '0718899223',
    providerWhatsapp: '0718899223',
    altPhone: '',
    serviceTitle: 'පරිගණක, ලැප්ටොප් දෘඩාංග සහ මෘදුකාංග අලුත්වැඩියාව',
    deliveryMethod: 'location',
    deliveryMethodDetails: 'කැලණිය සහ කඩවත ප්‍රදේශයේ නිවෙස් වලට පැමිණ හෝ වැඩපලට රැගෙන විත් සකස් කර දෙනු ලැබේ.',
    locationName: 'කැලණිය (Kelaniya)',
    lat: 6.9535,
    lng: 79.9168,
    qualifications: 'BSc in Information Technology & CompTIA A+ Hardware Certified',
    experienceDuration: 'වසර 5',
    categoryId: 'tech_digital',
    categoryName: 'තාක්ෂණික සහ ඩිජිටල් සේවා',
    categoryIcon: '💻',
    subCategoryName: 'පරිගණක සහ ලැප්ටොප් අලුත්වැඩියා (Computer Repair)',
    subCategoryIcon: '💻',
    createdAt: 'මීට දින 3කට පෙර',
    createdAtMs: Date.now() - 259200000,
    isVerified: true,
    avgRating: 4.8,
    reviews: [
      {
        id: 'rev_3',
        userId: 'u_103',
        userName: 'රුවිනි සෙනෙවිරත්න',
        rating: 5,
        comment: 'ලැප්ටොප් එකේ මැකී ගිය දත්ත නැවත ලබාදුන්නා. සුහදශීලී සේවාවක්.',
        createdAt: 'මීට දින 2කට පෙර',
        createdAtMs: Date.now() - 172800000
      }
    ]
  },
  {
    id: 'ps_3',
    userId: '887654321V',
    providerName: 'දිලිනි මාධවී හේරත්',
    providerPhotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    providerPhone: '0704455667',
    providerWhatsapp: '0704455667',
    altPhone: '0778899112',
    serviceTitle: 'මනාලියන් හැඩගැන්වීම සහ උත්සව රූපලාවන්‍ය සත්කාර',
    deliveryMethod: 'anywhere',
    deliveryMethodDetails: 'දිවයිනේ ඕනෑම තැනකට උත්සව දිනයට පැමිණිය හැක.',
    locationName: 'ගම්පහ (Gampaha)',
    lat: 7.084,
    lng: 79.994,
    qualifications: 'Diploma in Professional Cosmetology & Bridal Dressing (UK Certified)',
    experienceDuration: 'වසර 6+',
    categoryId: 'personal_care',
    categoryName: 'පද්ගලික සත්කාර සහ සුවතා',
    categoryIcon: '✨',
    subCategoryName: 'මඟුල් ඇඳුම් සහ හැඩගැන්වීම් (Bridal Dressing)',
    subCategoryIcon: '👰',
    createdAt: 'මීට දිනකට පෙර',
    createdAtMs: Date.now() - 86400000,
    isVerified: true,
    avgRating: 5.0,
    reviews: [
      {
        id: 'rev_4',
        userId: 'u_104',
        userName: 'සචිනි තිළිණි',
        rating: 5,
        comment: 'මගේ විවාහ උත්සවයේදී ගොඩක් ලස්සනට Dressing එක කරලා දුන්නා. හැමෝම අගය කළා!',
        createdAt: 'මීට දිනකට පෙර',
        createdAtMs: Date.now() - 86400000
      }
    ]
  },
  {
    id: 'ps_4',
    userId: '851239874V',
    providerName: 'නීතිඥ අශාන් විජේසිංහ',
    providerPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    providerPhone: '0779988776',
    providerWhatsapp: '0779988776',
    altPhone: '0112445566',
    serviceTitle: 'ඉඩම් ඔප්පු, ගිවිසුම් ලිවීම සහ නීතිමය උපදේශන සේවා',
    deliveryMethod: 'customer_must_come',
    deliveryMethodDetails: 'කඩවත කාර්යාලය වෙත පැමිණිය යුතුය. හදිසි අවස්ථා වලදී Online උපදෙස්.',
    locationName: 'කඩවත (Kadawatha)',
    lat: 7.0016,
    lng: 79.9535,
    qualifications: 'LL.B (Hons), Attorney-at-Law & Notary Public (High Court of Colombo)',
    experienceDuration: 'වසර 10+',
    categoryId: 'professional_legal',
    categoryName: 'ව්යාපාරික, නීතිමය සහ මූල්ය සේවා',
    categoryIcon: '⚖️',
    subCategoryName: 'නීතිඥ සහ නොතාරිස් සේවා (Lawyer & Notary Public)',
    subCategoryIcon: '⚖️',
    createdAt: 'මීට දින 4කට පෙර',
    createdAtMs: Date.now() - 345600000,
    isVerified: true,
    avgRating: 4.9,
    reviews: [
      {
        id: 'rev_5',
        userId: 'u_105',
        userName: 'මහින්ද අල්විස්',
        rating: 5,
        comment: 'නොතාරිස් සහ ඔප්පු කටයුතු කිසිම ගැටලුවක් නැතුව නිවැරදිව කර දුන්නා.',
        createdAt: 'මීට දින 3කට පෙර',
        createdAtMs: Date.now() - 259200000
      }
    ]
  }
];

export const getStoredProfessionalServices = (): ProfessionalService[] => {
  if (typeof window === 'undefined') return initialProfessionalServices;
  const saved = localStorage.getItem('sahaya_professional_services');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // fallback
    }
  }
  return initialProfessionalServices;
};

export const saveProfessionalServicesToStorage = (services: ProfessionalService[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sahaya_professional_services', JSON.stringify(services));
};
