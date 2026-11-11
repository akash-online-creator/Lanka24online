/**
 * #රැකියා (Jobs & Careers Service) Types & Interfaces
 * Comprehensive type definitions for Sri Lankan Local & Overseas Job listings
 */

export type JobScope = 'local' | 'overseas';

export type JobType = 
  | 'full_time' 
  | 'part_time' 
  | 'contract' 
  | 'daily_wage' 
  | 'work_from_home';

export type JobCategoryId = 
  | 'all'
  | 'it_software'
  | 'manufacturing_factory'
  | 'construction_technical'
  | 'driving_transport'
  | 'hotel_tourism'
  | 'healthcare_nursing'
  | 'sales_marketing'
  | 'security_maintenance'
  | 'office_admin'
  | 'agriculture_farming'
  | 'domestic_cleaning'
  | 'garment_apparel'
  | 'education_teaching'
  | 'beauty_salon'
  | 'banking_finance'
  | 'mechanics_automotive'
  | 'graphics_media'
  | 'customer_service'
  | 'other';

export interface JobCategoryDef {
  id: JobCategoryId;
  titleSi: string;
  titleEn: string;
  titleTa: string;
  iconName: string;
}

export const JOB_CATEGORIES: JobCategoryDef[] = [
  { id: 'all', titleSi: 'සියලුම රැකියා', titleEn: 'All Jobs', titleTa: 'அனைத்து வேலைகள்', iconName: 'Briefcase' },
  { id: 'it_software', titleSi: 'තොරතුරු තාක්ෂණ / පරිගණක', titleEn: 'IT & Software', titleTa: 'தகவல் தொழில்நுட்பம்', iconName: 'Laptop' },
  { id: 'manufacturing_factory', titleSi: 'කර්මාන්තශාලා / නිෂ්පාදන', titleEn: 'Factory & Manufacturing', titleTa: 'தொழிற்சாலை & உற்பத்தி', iconName: 'Factory' },
  { id: 'construction_technical', titleSi: 'ඉදිකිරීම් / තාක්ෂණික', titleEn: 'Construction & Technical', titleTa: 'கட்டுமானம் & தொழில்நுட்பம்', iconName: 'Hammer' },
  { id: 'driving_transport', titleSi: 'රියදුරු / ප්‍රවාහන / ඩිලිවරි', titleEn: 'Driving & Delivery', titleTa: 'சாரதி & விநியோகம்', iconName: 'Truck' },
  { id: 'hotel_tourism', titleSi: 'හෝටල් / සංචාරක / ආපනශාලා', titleEn: 'Hotel, Tourism & Food', titleTa: 'ஹோட்டல் & சுற்றுலா', iconName: 'Utensils' },
  { id: 'healthcare_nursing', titleSi: 'සෞඛ්‍ය / සාත්තු සේවා', titleEn: 'Healthcare & Nursing', titleTa: 'சுகாதாரம் & தாதியர்', iconName: 'Stethoscope' },
  { id: 'sales_marketing', titleSi: 'විකුණුම් / අලෙවිකරණ', titleEn: 'Sales & Marketing', titleTa: 'விற்பனை & சந்தைப்படுத்தல்', iconName: 'TrendingUp' },
  { id: 'security_maintenance', titleSi: 'ආරක්ෂක / නඩත්තු', titleEn: 'Security & Maintenance', titleTa: 'பாதுகாப்பு & பராமரிப்பு', iconName: 'Shield' },
  { id: 'office_admin', titleSi: 'කාර්යාල / ගිණුම්කරණ', titleEn: 'Office & Accounts', titleTa: 'அலுவலகம் & கணக்கியல்', iconName: 'FileSpreadsheet' },
  { id: 'agriculture_farming', titleSi: 'කෘෂිකාර්මික / වතු / සත්ව', titleEn: 'Agriculture & Farming', titleTa: 'விவசாயம் & பண்ணை', iconName: 'Sprout' },
  { id: 'domestic_cleaning', titleSi: 'ගෘහ සේවක / පිරිසිදුකිරීම්', titleEn: 'Domestic & Cleaning', titleTa: 'வீட்டுப்பணி & துப்புரவு', iconName: 'Sparkles' },
  { id: 'garment_apparel', titleSi: 'ඇඟලුම් / මහන / Textile', titleEn: 'Garments & Apparel', titleTa: 'ஆடை & தையல்', iconName: 'Scissors' },
  { id: 'education_teaching', titleSi: 'ගුරු / උපකාරක පන්ති', titleEn: 'Teaching & Education', titleTa: 'கற்பித்தல் & கல்வி', iconName: 'GraduationCap' },
  { id: 'beauty_salon', titleSi: 'රූපලාවන්‍ය / සැලුන් / Spa', titleEn: 'Beauty & Salon', titleTa: 'அழகு & சலூன்', iconName: 'HeartHandshake' },
  { id: 'banking_finance', titleSi: 'බැංකු / මූල්‍ය / Insurance', titleEn: 'Banking & Finance', titleTa: 'வங்கி & நிதி', iconName: 'Landmark' },
  { id: 'mechanics_automotive', titleSi: 'මෝටර් රථ / යාන්ත්‍රික / AC', titleEn: 'Automotive & Mechanical', titleTa: 'வாகன மெக்கானிக்', iconName: 'Wrench' },
  { id: 'graphics_media', titleSi: 'මාධ්‍ය / ග්‍රැෆික් / මුද්‍රණ', titleEn: 'Media, Design & Print', titleTa: 'ஊடகம் & கிராபிக்ஸ்', iconName: 'Palette' },
  { id: 'customer_service', titleSi: 'පාරිභෝගික සේවා / Call Center', titleEn: 'Customer Support', titleTa: 'வாடிக்கையாளர் சேவை', iconName: 'Headphones' },
  { id: 'other', titleSi: 'වෙනත් රැකියා', titleEn: 'Other Jobs', titleTa: 'மற்றவை', iconName: 'MoreHorizontal' },
];

export interface JobFacilityOption {
  key: string;
  labelSi: string;
  labelEn: string;
  icon: string;
}

export const LOCAL_BENEFITS: JobFacilityOption[] = [
  { key: 'free_accommodation', labelSi: 'නවාතැන් නොමිලේ', labelEn: 'Free Accommodation', icon: 'Home' },
  { key: 'free_food', labelSi: 'ආහාර නොමිලේ / දීමනා', labelEn: 'Free Food / Meals', icon: 'Utensils' },
  { key: 'transport_provided', labelSi: 'ප්‍රවාහන පහසුකම්', labelEn: 'Transport Provided', icon: 'Bus' },
  { key: 'ot_available', labelSi: 'අතිකාල දීමනා (OT)', labelEn: 'Overtime (OT)', icon: 'Clock' },
  { key: 'epf_etf', labelSi: 'EPF / ETF සහිතයි', labelEn: 'EPF / ETF', icon: 'ShieldCheck' },
  { key: 'medical_insurance', labelSi: 'වෛද්‍ය / රක්ෂණ ආවරණ', labelEn: 'Medical / Insurance', icon: 'HeartPulse' },
  { key: 'annual_bonus', labelSi: 'වාර්ෂික බෝනස්', labelEn: 'Annual Bonus', icon: 'Coins' },
  { key: 'uniform_free', labelSi: 'නිල ඇඳුම් නොමිලේ', labelEn: 'Free Uniforms', icon: 'Shirt' },
  { key: 'training_provided', labelSi: 'පුහුණුව ලබාදේ', labelEn: 'Training Provided', icon: 'BookOpen' },
];

export const OVERSEAS_BENEFITS: JobFacilityOption[] = [
  { key: 'free_air_ticket', labelSi: 'ගුවන් ටිකට්පත් නොමිලේ', labelEn: 'Free Both-Way Air Tickets', icon: 'Plane' },
  { key: 'free_visa', labelSi: 'නොමිලේ වීසා (Zero Cost)', labelEn: 'Free Visa', icon: 'CheckCircle2' },
  { key: 'free_accommodation', labelSi: 'නවාතැන් නොමිලේ', labelEn: 'Free Accommodation', icon: 'Home' },
  { key: 'free_food', labelSi: 'ආහාර නොමිලේ', labelEn: 'Free Food', icon: 'Utensils' },
  { key: 'free_medical', labelSi: 'වෛද්‍ය පහසුකම් නොමිලේ', labelEn: 'Free Medical Cover', icon: 'HeartPulse' },
  { key: 'free_transport', labelSi: 'ප්‍රවාහනය නොමිලේ', labelEn: 'Free Local Transport', icon: 'Bus' },
  { key: 'ot_available', labelSi: 'අතිකාල දීමනා (OT)', labelEn: 'Overtime Available', icon: 'Clock' },
];

export interface JobListing {
  id: string;
  scope: JobScope; // 'local' | 'overseas'
  title: string;
  category: JobCategoryId;
  companyName: string;
  jobType: JobType;
  description: string;
  
  // Financial details
  salaryMin?: number;
  salaryMax?: number;
  salaryPeriod?: 'monthly' | 'daily' | 'weekly' | 'hourly';
  isNegotiable?: boolean;
  currency?: string;
  salaryForeign?: number;
  salaryLkrApprox?: number;

  // Location & Navigation
  district?: string;
  city?: string;
  address?: string;
  lat: number;
  lng: number;
  country?: string;

  // Requirements & Qualifications
  qualifications?: string;
  experience?: string;
  genderPreference?: 'any' | 'male' | 'female';
  ageLimit?: string;
  
  // Overseas specific
  agencyName?: string;
  slbfeRegNo?: string;
  contractPeriod?: string;
  isFreeVisa?: boolean;
  processingFee?: string;
  passportRequired?: boolean;
  medicalTestRequired?: boolean;
  languageRequired?: string;

  // Facilities / Benefits keys
  benefits: string[];

  // Contact details
  contactPerson: string;
  phone: string;
  whatsapp?: string;
  howToApply?: string;
  deadline?: string;

  // Media
  images: string[];

  // Metadata
  userId?: string;
  userName?: string;
  createdAtMs: number;
  isVerified?: boolean;
  isUrgentHiring?: boolean;
  viewsCount?: number;
  commentsCount?: number;
}

export type ProximityFilterType = 
  | 'all'
  | 'walk_15'   // < 1.2 km
  | 'walk_30'   // < 2.5 km
  | 'tuktuk_15' // < 6.0 km
  | 'tuktuk_30' // < 12.0 km
  | 'km_5'      // < 5.0 km
  | 'km_15'     // < 15.0 km
  | 'km_30';    // < 30.0 km

export interface JobFilters {
  scope: 'all' | 'local' | 'overseas';
  category: JobCategoryId;
  searchQuery: string;
  proximity: ProximityFilterType;
  minSalary?: number;
  maxSalary?: number;
  benefits: string[];
  jobType?: JobType | 'all';
  country?: string;
}

export interface JobComment {
  id: string;
  jobId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAtMs: number;
  createdAtStr?: string;
}
