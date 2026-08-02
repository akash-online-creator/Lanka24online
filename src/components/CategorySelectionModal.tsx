import React from 'react';
import { Language, Theme } from '../types';
import { 
  Zap, 
  Pencil, 
  Search, 
  Package, 
  Users, 
  Store, 
  ChevronRight, 
  ArrowLeft,
  Moon,
  Sun,
  Languages
} from 'lucide-react';

interface CategorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (categoryKey: string, categoryTitle: string) => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  theme?: Theme;
  toggleTheme?: () => void;
}

export const CategorySelectionModal: React.FC<CategorySelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
  language,
  setLanguage,
  theme = 'light',
  toggleTheme,
}) => {
  if (!isOpen) return null;

  const handleNextLanguage = () => {
    if (!setLanguage) return;
    const langSeq: Language[] = ['si', 'en', 'ta'];
    const currentIndex = langSeq.indexOf(language);
    const nextLang = langSeq[(currentIndex + 1) % langSeq.length];
    setLanguage(nextLang);
  };

  const getLanguageDisplayName = (lang: Language) => {
    switch (lang) {
      case 'si':
        return 'සිංහල';
      case 'ta':
        return 'தமிழ்';
      case 'en':
      default:
        return 'English';
    }
  };

  const categories = [
    {
      key: 'quick_services',
      titleSi: 'ඉක්මන් සේවා',
      titleEn: 'Quick Services',
      titleTa: 'விரைவான சேவைகள்',
      descSi: 'ඉක්මන් උපකාර සඳහා',
      descEn: 'For quick & emergency help',
      descTa: 'உடனடி உதவிக்கு',
      icon: Zap,
      iconContainerClass: 'bg-[#00a86b] text-white',
    },
    {
      key: 'standard_services',
      titleSi: 'සාමාන්‍ය සේවා',
      titleEn: 'Standard Services',
      titleTa: 'இயல்பான சேவைகள்',
      descSi: 'සාමාන්‍ය සේවා ඉල්ලීම්',
      descEn: 'General service requests',
      descTa: 'பொது சேவை கோரிக்கைகள்',
      icon: Pencil,
      iconContainerClass: 'bg-[#f59e0b] text-white',
    },
    {
      key: 'find_for_me',
      titleSi: 'සොයාදෙන්න',
      titleEn: 'Find For Me',
      titleTa: 'கண்டுபிடித்துத் தருக',
      descSi: 'මට යමක් සොයාදෙන්න',
      descEn: 'Find something for me',
      descTa: 'எனக்கு எதையாவது கண்டுபிடி',
      icon: Search,
      iconContainerClass: 'bg-[#e6f7f0] dark:bg-[#0e291c] text-[#00a86b] dark:text-[#00c880]',
    },
    {
      key: 'from_me_to_you',
      titleSi: 'මගෙන් ඔබට',
      titleEn: 'From Me To You',
      titleTa: 'என்னிடமிருந்து உங்களுக்கு',
      descSi: 'මගෙන් අලෙවියට',
      descEn: 'For sale from me',
      descTa: 'என்னிடமிருந்து விற்பனைக்கு',
      icon: Package,
      iconContainerClass: 'bg-[#fef3c7] dark:bg-[#2b1f0c] text-[#d97706] dark:text-[#f59e0b]',
    },
    {
      key: 'traders',
      titleSi: 'වෙළෙන්දෝ',
      titleEn: 'Traders',
      titleTa: 'வியாபாரிகள்',
      descSi: 'වෙළෙන්දන් සඳහා',
      descEn: 'For traders & merchants',
      descTa: 'வியாபாரிகளுக்கு',
      icon: Users,
      iconContainerClass: 'bg-[#f3e8ff] dark:bg-[#261238] text-[#9333ea] dark:text-[#c084fc]',
    },
    {
      key: 'stores',
      titleSi: 'වෙළඳසැල්',
      titleEn: 'Stores & Shops',
      titleTa: 'கடைகள்',
      descSi: 'වෙළඳසැල් සඳහා',
      descEn: 'For stores & shop owners',
      descTa: 'கடைகளுக்கு',
      icon: Store,
      iconContainerClass: 'bg-[#e0f2fe] dark:bg-[#0c2438] text-[#0284c7] dark:text-[#38bdf8]',
    },
  ];

  const getTitle = (cat: typeof categories[0]) => {
    if (language === 'en') return cat.titleEn;
    if (language === 'ta') return cat.titleTa;
    return cat.titleSi;
  };

  const getDesc = (cat: typeof categories[0]) => {
    if (language === 'en') return cat.descEn;
    if (language === 'ta') return cat.descTa;
    return cat.descSi;
  };

  const mainHeading = language === 'en' 
    ? 'Select the service you need' 
    : language === 'ta' 
    ? 'உங்களுக்குத் தேவையான சேவையைத் தேர்ந்தெடுக்கவும்' 
    : 'ඔබට අවශ්‍ය සේවාව තෝරන්න';

  const subHeading = language === 'en'
    ? 'Select one from the categories below.'
    : language === 'ta'
    ? 'கீழே உள்ள பிரிவுகளில் ஒன்றைத் தேர்ந்தெடுக்கவும்.'
    : 'පහත වර්ග වලින් එකක් තෝරන්න.';

  const backText = language === 'en' ? 'Back' : language === 'ta' ? 'திரும்பி' : 'ආපසු';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-[#f4faf5] via-[#f8fdf9] to-[#ffffff] dark:from-[#06110a] dark:via-[#08140e] dark:to-[#040b07] text-slate-900 dark:text-slate-100 animate-fadeIn min-h-screen p-4 sm:p-6 flex flex-col justify-start items-center">
      <div className="w-full max-w-[500px] mx-auto py-2 flex flex-col">
        
        {/* Top Controls Row (Theme toggle + Language selector) */}
        <div className="w-full flex items-center justify-start gap-2.5 mb-6">
          {toggleTheme && (
            <button
              type="button"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-white dark:bg-[#112318] border border-slate-200/80 dark:border-[#1e3d2a] shadow-sm hover:shadow-md flex items-center justify-center text-slate-700 dark:text-emerald-300 transition-all cursor-pointer active:scale-95"
              title="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-emerald-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700" />
              )}
            </button>
          )}

          {setLanguage && (
            <button
              type="button"
              onClick={handleNextLanguage}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white dark:bg-[#112318] border border-slate-200/80 dark:border-[#1e3d2a] shadow-sm hover:shadow-md text-slate-800 dark:text-slate-200 transition-all text-xs font-semibold cursor-pointer active:scale-95"
              title="Change language"
            >
              <Languages className="w-4 h-4 text-slate-600 dark:text-emerald-400" />
              <span>{getLanguageDisplayName(language)}</span>
            </button>
          )}
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 text-slate-600 dark:text-[#8ba294] hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
            <span>{backText}</span>
          </button>
        </div>

        {/* Heading Section */}
        <div className="mb-6">
          <span className="block text-xs font-mono text-slate-400 dark:text-[#506e5b] mb-1">
            2.1
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
            {mainHeading}
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#708a79] font-medium">
            {subHeading}
          </p>
        </div>

        {/* Category Cards List */}
        <div className="space-y-3.5 w-full">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const title = getTitle(cat);
            const desc = getDesc(cat);

            return (
              <div
                key={cat.key}
                onClick={() => onSelectCategory(cat.key, title)}
                className="w-full bg-white dark:bg-[#0c1811] hover:bg-slate-50 dark:hover:bg-[#112218] border border-slate-200/70 dark:border-[#173222] rounded-[1.5rem] p-4 sm:p-4.5 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4 group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  {/* Category Circular Icon Container */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold shadow-sm ${cat.iconContainerClass}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                      {title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-[#708a79] font-medium mt-0.5">
                      {desc}
                    </p>
                  </div>
                </div>

                {/* Right Arrow Chevron */}
                <div className="text-slate-400 dark:text-[#385242] group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
