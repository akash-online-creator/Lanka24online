import React from 'react';
import { Language, Theme, CategoryItem } from '../types';
import { initialCategories } from '../data/initialData';
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
  Languages,
  PhoneCall,
  Car,
  Wrench,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface CategorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (categoryKey: string, categoryTitle: string, selectedCatObj?: CategoryItem) => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  theme?: Theme;
  toggleTheme?: () => void;
  categories?: CategoryItem[];
}

export const CategorySelectionModal: React.FC<CategorySelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
  language,
  setLanguage,
  theme = 'light',
  toggleTheme,
  categories = initialCategories,
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

  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Zap':
        return Zap;
      case 'PhoneCall':
        return PhoneCall;
      case 'Car':
        return Car;
      case 'Wrench':
        return Wrench;
      case 'Pencil':
        return Pencil;
      case 'Search':
        return Search;
      case 'Package':
        return Package;
      case 'Users':
        return Users;
      case 'Store':
        return Store;
      default:
        return Sparkles;
    }
  };

  const getTitle = (cat: CategoryItem) => {
    if (language === 'en') return cat.nameEn || cat.nameSi;
    if (language === 'ta') return cat.nameTa || cat.nameSi;
    return cat.nameSi;
  };

  const getDesc = (cat: CategoryItem) => {
    if (language === 'en') return cat.descEn || cat.descSi;
    if (language === 'ta') return cat.descTa || cat.descSi;
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

  const displayCategoryList = categories && categories.length > 0 ? categories : initialCategories;

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
          {displayCategoryList.map((cat, idx) => {
            const Icon = getCategoryIcon(cat.icon);
            const title = getTitle(cat);
            const desc = getDesc(cat);

            // Give nice colorful icon containers
            const iconBgClasses = [
              'bg-[#00a86b] text-white',
              'bg-[#0284c7] text-white',
              'bg-[#f59e0b] text-white',
              'bg-[#9333ea] text-white',
              'bg-[#e11d48] text-white',
            ];
            const bgClass = iconBgClasses[idx % iconBgClasses.length];

            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id, title, cat)}
                className="w-full bg-white dark:bg-[#0c1811] hover:bg-slate-50 dark:hover:bg-[#112218] border border-slate-200/70 dark:border-[#173222] rounded-[1.5rem] p-4 sm:p-4.5 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4 group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  {/* Category Circular Icon Container */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold shadow-sm ${bgClass}`}>
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
                    {cat.customFields && cat.customFields.length > 0 && (
                      <span className="inline-block mt-1 text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-extrabold">
                        {cat.customFields.length} Form Fields
                      </span>
                    )}
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

