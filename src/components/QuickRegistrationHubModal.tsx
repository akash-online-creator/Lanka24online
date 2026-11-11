import React from 'react';
import { 
  UserPlus, 
  Building2, 
  Store, 
  X, 
  ShieldCheck, 
  MapPin, 
  Sparkles, 
  ChevronRight 
} from 'lucide-react';
import { Language } from '../types';

interface QuickRegistrationHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  onSelectUserRegistration: () => void;
  onSelectBusinessRegistration: () => void;
  onSelectShopRegistration: () => void;
  onSelectProfessionalRegistration?: () => void;
}

export const QuickRegistrationHubModal: React.FC<QuickRegistrationHubModalProps> = ({
  isOpen,
  onClose,
  language = 'si',
  onSelectUserRegistration,
  onSelectBusinessRegistration,
  onSelectShopRegistration,
}) => {
  if (!isOpen) return null;

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  const registrationOptions = [
    {
      id: 'user',
      titleSi: '1. සාමාන්‍ය ප්‍රජා පරිශීලක ලියාපදිංචිය',
      titleEn: '1. Community User Registration',
      titleTa: '1. சமூக பயனர் பதிவு',
      subtitleSi: 'ප්‍රජා සහයෝගීතා ගිණුමක් විවෘත කර සියලුම සේවාවන් ලබාගන්න / උදව් කරන්න.',
      subtitleEn: 'Create a personal community account to request or offer help and access all services.',
      subtitleTa: 'உதவி கோர அல்லது வழங்க தனிப்பட்ட சமூக கணக்கை உருவாக்கவும்.',
      badgeSi: 'පුද්ගලික ගිණුම්',
      badgeEn: 'Personal Account',
      badgeTa: 'தனிப்பட்ட கணக்கு',
      icon: UserPlus,
      gradient: 'from-emerald-600 to-teal-700',
      borderHover: 'hover:border-emerald-400',
      action: onSelectUserRegistration,
    },
    {
      id: 'business',
      titleSi: '2. ව්‍යාපාර හා ආයතන ලියාපදිංචිය',
      titleEn: '2. Business & Enterprise Registration',
      titleTa: '2. வணிக பதிவு',
      subtitleSi: 'සමාගම්, ආයතන, සේවා කාර්යාල හා නිෂ්පාදන ආයතන ප්‍රජා සිතියමේ ලියාපදිංචි කරන්න.',
      subtitleEn: 'Register companies, service enterprises, and corporate locations on community map.',
      subtitleTa: 'நிறுவனங்கள் மற்றும் சேவை மையங்களை சமூக வரைபடத்தில் பதிவு செய்யவும்.',
      badgeSi: 'ආයතන හා සමාගම්',
      badgeEn: 'Enterprises',
      badgeTa: 'நிறுவனங்கள்',
      icon: Building2,
      gradient: 'from-amber-600 to-orange-700',
      borderHover: 'hover:border-amber-400',
      action: onSelectBusinessRegistration,
    },
    {
      id: 'shop',
      titleSi: '3. වෙළඳසැල් හා අලෙවිසැල් ලියාපදිංචිය',
      titleEn: '3. Shop & Store Registration',
      titleTa: '3. கடை மற்றும் விற்பனை நிலைய பதிவு',
      subtitleSi: 'සිල්ලර/තොග කඩසාප්පු, ඖෂධහල්, සුපිරි වෙළඳසැල් හා භාණ්ඩ විකුණුම්හල් ලියාපදිංචි කරන්න.',
      subtitleEn: 'Register retail stores, wholesale shops, pharmacies, and local grocery outlets.',
      subtitleTa: 'சில்லறை/மொத்த கடைகள், மருந்தகங்கள் மற்றும் உள்ளூர் கடைகளை பதிவு செய்யவும்.',
      badgeSi: 'කඩසාප්පු හා වෙළඳසැල්',
      badgeEn: 'Retail & Wholesale',
      badgeTa: 'கடைகள்',
      icon: Store,
      gradient: 'from-rose-600 to-pink-700',
      borderHover: 'hover:border-rose-400',
      action: onSelectShopRegistration,
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#071d13] text-slate-900 dark:text-slate-100 rounded-3xl border-2 border-emerald-500/70 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide">
                {getLang('ලියාපදිංචි වන්න (Registration Hub)', 'Register on Sahaya Sewa', 'பதிவு செய்யவும்')}
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium">
                {getLang('ඔබට අවශ්‍ය ලියාපදිංචි වර්ගය තෝරන්න', 'Choose your registration category', 'உங்களுக்கு தேவையான பதிவு வகையைத் தேர்ந்தெடுக்கவும்')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
          {/* Options Grid (3 Distinct Categories) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {registrationOptions.map((opt) => {
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    opt.action();
                  }}
                  className={`p-4 rounded-2xl text-left bg-slate-50 dark:bg-[#0c2e1f] border-2 border-slate-200 dark:border-emerald-800/60 ${opt.borderHover} hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-200 group flex flex-col justify-between cursor-pointer`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${opt.gradient} text-white shadow-md`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        {getLang(opt.badgeSi, opt.badgeEn, opt.badgeTa)}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {getLang(opt.titleSi, opt.titleEn, opt.titleTa)}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {getLang(opt.subtitleSi, opt.subtitleEn, opt.subtitleTa)}
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-200 dark:border-emerald-900/40 flex items-center justify-between text-xs font-black text-emerald-700 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>{getLang('ලියාපදිංචි වෙන්න', 'Register Now', 'பதிவு செய்')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* 100m Geo-Fence Policy Notice Box */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-black text-xs">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{getLang('📌 100m භූගෝලීය ආරක්ෂණ නීතිය (100m Geo-Fence Security Rule):', '📌 100m Geo-Fence Security Rule:', '📌 100m புவிசார் பாதுகாப்பு விதி:')}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-950 dark:text-amber-200 leading-relaxed font-semibold">
              {getLang(
                'ලියාපදිංචි පරිශීලකයෙකු නොවී සෘජුව මෙලෙස ලියාපදිංචි කරන ස්ථානවල තොරතුරු පසුව වෙනස් කිරීම හෝ ඉවත් කිරීම කළ හැක්කේ ලියාපදිංචි කළ ස්ථානයේ සිට 100mක් ඇතුළත සිටින අයෙකුට හෝ ඇඩ්මින්වරයාට (Admin) පමණි.',
                'Note: Locations registered without a full registered user account can only be edited or removed in the future by someone physically present within 100m of the registered location, or by an Administrator.',
                'முழுமையாக பதிவுசெய்யப்பட்ட பயனர் கணக்கு இல்லாமல் நேரடியாக பதிவுசெய்யப்படும் இடங்களின் தகவல்களை பின்னர் மாற்றுவது அல்லது நீக்குவது அந்த இடத்திலிருந்து 100 மீட்டருக்குள் இருப்பவர்களால் அல்லது நிர்வாகியால் மட்டுமே செய்ய முடியும்.'
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 dark:bg-[#05170f] border-t border-slate-200 dark:border-emerald-900/50 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{getLang('සියලුම ලියාපදිංචි කිරීම් 100% නොමිලේ', '100% Free Community Registration', '100% இலவச சமூக பதிவு')}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-300 dark:bg-slate-800 hover:bg-slate-400 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs transition-all cursor-pointer"
          >
            {getLang('වසන්න', 'Close', 'மூடு')}
          </button>
        </div>
      </div>
    </div>
  );
};
