import React, { useState } from 'react';
import { 
  JobListing, 
  JobScope, 
  JobType, 
  JobCategoryId, 
  JOB_CATEGORIES, 
  LOCAL_BENEFITS, 
  OVERSEAS_BENEFITS 
} from '../types/job';
import { addJobListing } from '../utils/jobStorage';
import { 
  X, 
  MapPin, 
  Crosshair, 
  Phone, 
  MessageCircle, 
  Building2, 
  Plane, 
  Coins, 
  CheckCircle2, 
  Image as ImageIcon, 
  Plus, 
  Loader2, 
  AlertCircle,
  FileText,
  Calendar,
  Sparkles,
  ShieldCheck,
  Globe
} from 'lucide-react';

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: (newJob: JobListing) => void;
  userLat?: number;
  userLng?: number;
  userCity?: string;
  language?: string;
}

const SRI_LANKAN_DISTRICTS = [
  'කොළඹ', 'ගම්පහ', 'කළුතර', 'මහනුවර', 'මාතලේ', 'නුවරඑළිය',
  'ගාල්ල', 'මාතර', 'හම්බන්තොට', 'යාපනය', 'කිලිනොච්චිය', 'මන්නාරම',
  'වවුනියාව', 'මුලතිව්', 'මඩකලපුව', 'අම්පාර', 'ත්‍රිකුණාමලය',
  'කුරුණෑගල', 'පුත්තලම', 'අනුරාධපුරය', 'පොළොන්නරුව', 'බදුල්ල',
  'මොණරාගල', 'රත්නපුර', 'කෑගල්ල'
];

const POPULAR_FOREIGN_COUNTRIES = [
  'එක්සත් අරාබි එමීර් (ඩුබායි / UAE)',
  'කටාර් (Qatar)',
  'සෞදි අරාබිය (Saudi Arabia)',
  'කුවේට් (Kuwait)',
  'ඕමාන් (Oman)',
  'ඊශ්‍රායල් (Israel)',
  'ජපානය (Japan)',
  'දකුණු කොරියාව (South Korea)',
  'රුමේනියාව (Romania)',
  'පෝලන්තය (Poland)',
  'ඉතාලිය (Italy)',
  'එක්සත් රාජධානිය (UK)',
  'කැනඩාව (Canada)',
  'ඕස්ට්‍රේලියාව (Australia)',
  'නවසීලන්තය (New Zealand)',
  'සිංගප්පූරුව (Singapore)',
  'මැලේසියාව (Malaysia)',
  'මාලදිවයින (Maldives)',
  'වෙනත් රටක් (Other Country)'
];

export const JobModal: React.FC<JobModalProps> = ({
  isOpen,
  onClose,
  onJobCreated,
  userLat,
  userLng,
  userCity,
  language = 'si',
}) => {
  // Mode selection: 'local' | 'overseas'
  const [scope, setScope] = useState<JobScope>('local');

  // Common Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<JobCategoryId>('manufacturing_factory');
  const [companyName, setCompanyName] = useState('');
  const [jobType, setJobType] = useState<JobType>('full_time');
  const [description, setDescription] = useState('');
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [howToApply, setHowToApply] = useState('');
  const [deadline, setDeadline] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // GPS Coordinates & Status
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: userLat || 7.1802,
    lng: userLng || 79.8841,
  });
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Local Specific State
  const [salaryMin, setSalaryMin] = useState<string>('');
  const [salaryMax, setSalaryMax] = useState<string>('');
  const [salaryPeriod, setSalaryPeriod] = useState<'monthly' | 'daily' | 'weekly' | 'hourly'>('monthly');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [district, setDistrict] = useState(userCity || 'ගම්පහ');
  const [city, setCity] = useState(userCity || 'කටුනායක');
  const [address, setAddress] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [experience, setExperience] = useState('');
  const [genderPreference, setGenderPreference] = useState<'any' | 'male' | 'female'>('any');
  const [ageLimit, setAgeLimit] = useState('');

  // Overseas Specific State
  const [country, setCountry] = useState('එක්සත් අරාබි එමීර් (ඩුබායි / UAE)');
  const [agencyName, setAgencyName] = useState('');
  const [slbfeRegNo, setSlbfeRegNo] = useState('');
  const [contractPeriod, setContractPeriod] = useState('අවුරුදු 2');
  const [currency, setCurrency] = useState('AED');
  const [salaryForeign, setSalaryForeign] = useState<string>('');
  const [salaryLkrApprox, setSalaryLkrApprox] = useState<string>('');
  const [isFreeVisa, setIsFreeVisa] = useState(true);
  const [processingFee, setProcessingFee] = useState('නොමිලේ වීසා (Zero Cost)');
  const [passportRequired, setPassportRequired] = useState(true);
  const [medicalTestRequired, setMedicalTestRequired] = useState(true);
  const [languageRequired, setLanguageRequired] = useState('මූලික ඉංග්‍රීසි දැනුම');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Auto-detect GPS Location
  const handleAutoLocation = () => {
    if (!navigator.geolocation) {
      alert('ඔබගේ උපාංගය GPS ස්ථාන හඳුනාගැනීම සඳහා සහය නොදක්වයි.');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setIsDetectingGps(false);
      },
      (err) => {
        console.warn('GPS detection failed:', err);
        setIsDetectingGps(false);
        alert('GPS ස්ථානය ලබාගැනීම අසාර්ථක විය. කරුණාකර Location Permissions ලබා දී ඇත්දැයි බලන්න.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Toggle Benefit Checkbox
  const toggleBenefit = (key: string) => {
    setSelectedBenefits((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!title.trim()) {
      setFormError('කරුණාකර රැකියා තනතුර ඇතුළත් කරන්න.');
      return;
    }
    if (!companyName.trim()) {
      setFormError(scope === 'overseas' ? 'කරුණාකර විදේශ සේවා ආයතනයේ නම ඇතුළත් කරන්න.' : 'කරුණාකර ආයතනයේ / සේවා යෝජකයාගේ නම ඇතුළත් කරන්න.');
      return;
    }
    if (!phone.trim()) {
      setFormError('කරුණාකර දුරකථන අංකය ඇතුළත් කරන්න.');
      return;
    }

    setIsSubmitting(true);

    try {
      const imagesList = imageUrl.trim() ? [imageUrl.trim()] : [
        scope === 'overseas'
          ? 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80'
          : 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80'
      ];

      const newJobData = {
        scope,
        title: title.trim(),
        category,
        companyName: companyName.trim(),
        jobType,
        description: description.trim() || `${title} සඳහා සුදුස්සන් වහාම බඳවා ගැනේ.`,
        salaryMin: salaryMin ? parseInt(salaryMin, 10) : undefined,
        salaryMax: salaryMax ? parseInt(salaryMax, 10) : undefined,
        salaryPeriod,
        isNegotiable,
        currency: scope === 'overseas' ? currency : 'LKR',
        salaryForeign: salaryForeign ? parseInt(salaryForeign, 10) : undefined,
        salaryLkrApprox: salaryLkrApprox ? parseInt(salaryLkrApprox, 10) : undefined,
        district: scope === 'local' ? district : undefined,
        city: scope === 'local' ? city : undefined,
        address: address.trim(),
        lat: coords.lat,
        lng: coords.lng,
        country: scope === 'overseas' ? country : 'ශ්‍රී ලංකාව',
        qualifications: qualifications.trim(),
        experience: experience.trim(),
        genderPreference,
        ageLimit: ageLimit.trim(),
        agencyName: scope === 'overseas' ? agencyName.trim() || companyName.trim() : undefined,
        slbfeRegNo: scope === 'overseas' ? slbfeRegNo.trim() : undefined,
        contractPeriod: scope === 'overseas' ? contractPeriod : undefined,
        isFreeVisa: scope === 'overseas' ? isFreeVisa : undefined,
        processingFee: scope === 'overseas' ? processingFee.trim() : undefined,
        passportRequired: scope === 'overseas' ? passportRequired : undefined,
        medicalTestRequired: scope === 'overseas' ? medicalTestRequired : undefined,
        languageRequired: scope === 'overseas' ? languageRequired.trim() : undefined,
        benefits: selectedBenefits,
        contactPerson: contactPerson.trim() || 'සේවා අංශය',
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        howToApply: howToApply.trim() || 'සෘජුවම අමතන්න හෝ WhatsApp කරන්න.',
        deadline: deadline.trim() || undefined,
        images: imagesList,
        isVerified: true,
        isUrgentHiring: true,
      };

      const created = addJobListing(newJobData);
      setIsSubmitting(false);

      if (onJobCreated) {
        onJobCreated(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Error creating job:', err);
      setFormError('දැන්වීම සුරැකීමේදී දෝෂයක් සිදුවිය.');
      setIsSubmitting(false);
    }
  };

  const currentBenefitDefs = scope === 'overseas' ? OVERSEAS_BENEFITS : LOCAL_BENEFITS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white dark:bg-[#07190f] border-2 border-emerald-500 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-t-3xl flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                නව රැකියා අවස්ථාවක් එක් කරන්න
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                දේශීය හා විදේශීය රැකියා සොයන්නන් වෙත ක්ෂණිකව ප්‍රචාරය කරන්න
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Scope Tabs: ලංකාව තුළ vs විදේශීය */}
        <div className="p-3 sm:p-4 bg-slate-100 dark:bg-[#0a2014] border-b border-slate-200 dark:border-[#132d20]">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setScope('local');
                setSelectedBenefits([]);
              }}
              className={`py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                scope === 'local'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
                  : 'bg-white dark:bg-[#07170e] text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-300" />
              <span>ලංකාව තුළ (In Sri Lanka)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScope('overseas');
                setSelectedBenefits(['free_air_ticket', 'free_visa', 'free_accommodation']);
              }}
              className={`py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                scope === 'overseas'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 ring-2 ring-sky-400'
                  : 'bg-white dark:bg-[#07170e] text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Plane className="w-4 h-4 text-sky-300" />
              <span>විදේශීය (Overseas / Foreign)</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Job Title */}
          <div>
            <label className="block mb-1.5 font-extrabold text-slate-700 dark:text-slate-300">
              රැකියා තනතුර (Job Title / Designation) *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. ඇඟලුම් තත්ත්ව පාලක, AC කාර්මික, ඩිලිවරි රියදුරු..."
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28] focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Category Dropdown & Job Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 font-extrabold">
                රැකියා කාණ්ඩය (Job Category) *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as JobCategoryId)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28] focus:border-emerald-500 focus:outline-none"
              >
                {JOB_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titleSi}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1.5 font-extrabold">
                සේවා ආකාරය (Job Type)
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as JobType)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28] focus:border-emerald-500 focus:outline-none"
              >
                <option value="full_time">පූර්ණ කාලීන (Full Time)</option>
                <option value="part_time">අර්ධ කාලීන (Part Time)</option>
                <option value="contract">කොන්ත්‍රාත් පදනම (Contract)</option>
                <option value="daily_wage">දෛනික වැටුප් (Daily Wage)</option>
                <option value="work_from_home">නිවසේ සිට වැඩ (Work From Home)</option>
              </select>
            </div>
          </div>

          {/* ========================================================== */}
          {/* LOCAL FORM SPECIFIC FIELDS */}
          {/* ========================================================== */}
          {scope === 'local' ? (
            <>
              {/* Company / Employer */}
              <div>
                <label className="block mb-1.5 font-extrabold">
                  ආයතනයේ / සේවා යෝජකයාගේ නම (Company / Employer) *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. මාස් ඇක්ටිව් හෝල්ඩින්ග්ස්, කටුනායක"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28] focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Salary Breakdown (Local) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0a2014] border border-slate-200 dark:border-[#132d20] space-y-3">
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Coins className="w-4 h-4" /> වැටුප් සහ දීමනා (Salary Details)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] mb-1 font-bold">අවම වැටුප (රු.)</label>
                    <input
                      type="number"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      placeholder="e.g. 65000"
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c2618] border border-slate-300 dark:border-slate-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1 font-bold">උපරිම වැටුප (රු.)</label>
                    <input
                      type="number"
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                      placeholder="e.g. 95000"
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c2618] border border-slate-300 dark:border-slate-700 text-xs"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] mb-1 font-bold">ගෙවීම් වාරය</label>
                    <select
                      value={salaryPeriod}
                      onChange={(e) => setSalaryPeriod(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c2618] border border-slate-300 dark:border-slate-700 text-xs"
                    >
                      <option value="monthly">මාසිකව (Monthly)</option>
                      <option value="daily">දෛනිකව (Daily)</option>
                      <option value="weekly">සතිපතා (Weekly)</option>
                      <option value="hourly">පැයකට (Hourly)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="negotiable_chk"
                    checked={isNegotiable}
                    onChange={(e) => setIsNegotiable(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <label htmlFor="negotiable_chk" className="text-xs font-bold cursor-pointer">
                    වැටුප සාකච්ඡා කරගත හැක (Negotiable)
                  </label>
                </div>
              </div>

              {/* District & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-extrabold">දිස්ත්‍රික්කය</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28] focus:border-emerald-500 focus:outline-none"
                  >
                    {SRI_LANKAN_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 font-extrabold">නගරය / ප්‍රදේශය</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. කටුනායක, ජා-ඇල, කොළඹ..."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28] focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Exact Address & Auto GPS */}
              <div>
                <label className="block mb-1.5 font-extrabold">රැකියා ස්ථානයේ ලිපිනය</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. නො. 12, නිදහස් වෙළඳ කලාපය, කටුනායක"
                    className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28] focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAutoLocation}
                    disabled={isDetectingGps}
                    className="px-3.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer"
                    title="සජීවී GPS ස්ථානය Auto Save කරගන්න"
                  >
                    {isDetectingGps ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Crosshair className="w-4 h-4 text-amber-300" />
                    )}
                    <span className="hidden sm:inline">Auto GPS</span>
                  </button>
                </div>
                {gpsAccuracy && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 block">
                    ✓ නිවැරදි GPS ස්ථානය සුරකින ලදී (±{gpsAccuracy}m නිරවද්‍යතාව)
                  </span>
                )}
              </div>

              {/* Qualifications & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-extrabold">අධ්‍යාපනික සුදුසුකම්</label>
                  <input
                    type="text"
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                    placeholder="e.g. O/L, A/L, හෝ සුදුසුකම් අවශ්‍ය නොවේ"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28]"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-extrabold">අවශ්‍ය පළපුරුද්ද</label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. වසර 1ක් හෝ පුහුණුව නොමිලේ"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28]"
                  />
                </div>
              </div>
            </>
          ) : (
            /* ========================================================== */
            /* OVERSEAS FORM SPECIFIC FIELDS */
            /* ========================================================== */
            <>
              {/* Destination Country */}
              <div>
                <label className="block mb-1.5 font-extrabold">
                  සේවා ස්ථානගතවන රට (Destination Country) *
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28] focus:border-sky-500 focus:outline-none"
                >
                  {POPULAR_FOREIGN_COUNTRIES.map((cntry) => (
                    <option key={cntry} value={cntry}>{cntry}</option>
                  ))}
                </select>
              </div>

              {/* Agency Name & SLBFE Registration No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-extrabold">
                    විදේශ රැකියා නියෝජිතායතනය (Agency Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      setAgencyName(e.target.value);
                    }}
                    placeholder="e.g. Empire Manpower, Colombo"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28]"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 font-extrabold">
                    SLBFE අනුමැති අංකය (Approval No)
                  </label>
                  <input
                    type="text"
                    value={slbfeRegNo}
                    onChange={(e) => setSlbfeRegNo(e.target.value)}
                    placeholder="e.g. SLBFE/LIC/1458/2026"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28]"
                  />
                </div>
              </div>

              {/* Foreign Salary & LKR Equivalent */}
              <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-[#082030] border border-sky-200 dark:border-sky-900 space-y-3">
                <span className="font-extrabold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                  <Coins className="w-4 h-4" /> විදේශ මුදලින් වැටුප (Foreign Currency & Salary)
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] mb-1 font-bold">මුදල් ඒකකය</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0a2a40] border border-sky-300 dark:border-sky-800 text-xs"
                    >
                      <option value="AED">AED (ඩුබායි ඩිරාම්)</option>
                      <option value="QAR">QAR (කටාර් රියාල්)</option>
                      <option value="SAR">SAR (සෞදි රියාල්)</option>
                      <option value="KWD">KWD (කුවේට් ඩිනාර්)</option>
                      <option value="EUR">EUR (යුරෝ)</option>
                      <option value="USD">USD (ඇමරිකානු ඩොලර්)</option>
                      <option value="JPY">JPY (ජපන් යෙන්)</option>
                      <option value="KRW">KRW (කොරියානු වොන්)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1 font-bold">මූලික වැටුප ({currency})</label>
                    <input
                      type="number"
                      value={salaryForeign}
                      onChange={(e) => setSalaryForeign(e.target.value)}
                      placeholder="e.g. 2500"
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0a2a40] border border-sky-300 dark:border-sky-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1 font-bold">දළ LKR වටිනාකම</label>
                    <input
                      type="number"
                      value={salaryLkrApprox}
                      onChange={(e) => setSalaryLkrApprox(e.target.value)}
                      placeholder="e.g. 210000"
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0a2a40] border border-sky-300 dark:border-sky-800 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={isFreeVisa}
                      onChange={(e) => setIsFreeVisa(e.target.checked)}
                      className="w-4 h-4 accent-sky-600 rounded"
                    />
                    <span>නොමිලේ වීසා (Free Visa / Zero Cost)</span>
                  </label>
                </div>
              </div>

              {/* Contract Period & Qualifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-extrabold">ගිවිසුම් කාලය</label>
                  <input
                    type="text"
                    value={contractPeriod}
                    onChange={(e) => setContractPeriod(e.target.value)}
                    placeholder="e.g. අවුරුදු 2 (දීර්ඝ කරගත හැක)"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28]"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-extrabold">අවශ්‍ය භාෂා දැනුම</label>
                  <input
                    type="text"
                    value={languageRequired}
                    onChange={(e) => setLanguageRequired(e.target.value)}
                    placeholder="e.g. ඉංග්‍රීසි, අරාබි හෝ අවශ්‍ය නොවේ"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28]"
                  />
                </div>
              </div>

              {/* Local Agency Address & GPS */}
              <div>
                <label className="block mb-1.5 font-extrabold">ලංකාවේ පිහිටි ඒජන්සි කාර්යාල ලිපිනය</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. නො. 50, බම්බලපිටිය, කොළඹ 04"
                    className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28]"
                  />
                  <button
                    type="button"
                    onClick={handleAutoLocation}
                    className="px-3.5 py-3 rounded-xl bg-sky-600 text-white font-extrabold flex items-center gap-1.5 shrink-0 cursor-pointer"
                    title="ඒජන්සියේ GPS පිහිටීම සටහන් කරගන්න"
                  >
                    <Crosshair className="w-4 h-4 text-amber-300" />
                    <span className="hidden sm:inline">Auto GPS</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Facilities & Benefits Multi-select Checkboxes */}
          <div>
            <label className="block mb-2 font-extrabold text-emerald-800 dark:text-emerald-300">
              නොමිලේ හිමිවන පහසුකම් සහ වරප්‍රසාද (Benefits & Facilities)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {currentBenefitDefs.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => toggleBenefit(b.key)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    selectedBenefits.includes(b.key)
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-xs'
                      : 'bg-slate-50 dark:bg-[#081a10] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                    selectedBenefits.includes(b.key) ? 'bg-emerald-600 text-white' : 'border border-slate-400'
                  }`}>
                    {selectedBenefits.includes(b.key) && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <span className="truncate">{b.labelSi}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contact Details */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0a2014] border border-slate-200 dark:border-[#132d20] space-y-3">
            <span className="font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Phone className="w-4 h-4" /> සම්බන්ධ කරගැනීමේ තොරතුරු (Contact Details) *
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] mb-1 font-bold">සම්බන්ධීකාරක නම</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. සුමිත් / HR අංශය"
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c2618] border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] mb-1 font-bold">දුරකථන අංකය (Direct Call) *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0771234567"
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c2618] border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] mb-1 font-bold">වට්ස්ඇප් අංකය (WhatsApp)</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="e.g. 0771234567"
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c2618] border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Description & Flyer URL */}
          <div>
            <label className="block mb-1.5 font-extrabold">වැඩිදුර විස්තර සහ අවශ්‍යතා</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="රැකියාව පිළිබඳ වැදගත් විස්තර, රාජකාරි වේලාවන් සහ වෙනත් අවශ්‍යතා..."
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28]"
            />
          </div>

          <div>
            <label className="block mb-1.5 font-extrabold">දැන්වීම් පත්‍රිකා ඡායාරූප (Flyer Image URL)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... (Job vacancy flyer හෝ ආයතනයේ ඡායාරූප ලින්ක් එක)"
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c2618] border border-slate-300 dark:border-[#173e28]"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>දැන්වීම පළ කරමින් පවතී...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>රැකියා දැන්වීම ක්ෂණිකව පළ කරන්න</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
