import React from 'react';
import { Language } from '../types';
import { 
  Zap, 
  Ruler, 
  Globe, 
  Search, 
  Gift, 
  Store, 
  Users, 
  Wrench 
} from 'lucide-react';

interface CategoryGridProps {
  selectedCategory: string;
  onSelectCategory: (key: string, title: string) => void;
  language: Language;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  selectedCategory,
  onSelectCategory,
  language,
}) => {
  const getCategoryTitle = (key: string) => {
    switch (key) {
      case 'quick_services':
        return language === 'en' ? 'Quick Services' : language === 'ta' ? 'விரைவான சேவைகள்' : 'ඉක්මන් සේවා';
      case 'by_distance':
        return language === 'en' ? 'By Distance' : language === 'ta' ? 'தூரம் வாரியாக' : 'දුර අනුව';
      case 'islandwide':
        return language === 'en' ? 'Islandwide' : language === 'ta' ? 'தீவு முழுவதிலும்' : 'දිවයිනපුරා';
      case 'find_for_me':
        return language === 'en' ? 'Find For Me' : language === 'ta' ? 'கண்டுபிடித்துத் தருக' : 'සොයාදෙන්න';
      case 'from_me_to_you':
        return language === 'en' ? 'From Me To You' : language === 'ta' ? 'என்னிடமிருந்து உங்களுக்கு' : 'මගෙන් ඔබට';
      case 'marketplace':
        return language === 'en' ? 'Marketplace' : language === 'ta' ? 'சந்தை' : 'වෙළඳපොල';
      case 'group_work':
        return language === 'en' ? 'Group Work' : language === 'ta' ? 'குழு வேலை' : 'කණ්ඩායම් වැඩ';
      case 'services':
        return language === 'en' ? 'Services' : language === 'ta' ? 'சேவைகள்' : 'සේවා';
      default:
        return '';
    }
  };

  const topCategories = [
    { key: 'quick_services', icon: Zap },
    { key: 'by_distance', icon: Ruler },
    { key: 'islandwide', icon: Globe },
    { key: 'find_for_me', icon: Search },
  ];

  const bottomCategories = [
    { key: 'from_me_to_you', icon: Gift },
    { key: 'marketplace', icon: Store },
    { key: 'group_work', icon: Users },
    { key: 'services', icon: Wrench },
  ];

  const sectionDividerText = language === 'en' ? 'Various Services' : language === 'ta' ? 'பல்வேறு சேவைகள்' : 'විවිධ සේවා';

  return (
    <div className="w-full space-y-5">
      {/* Top 4 Categories Grid (2 Columns) */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
        {topCategories.map((cat) => {
          const Icon = cat.icon;
          const title = getCategoryTitle(cat.key);
          const isSelected = selectedCategory === cat.key;

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelectCategory(cat.key, title)}
              className={`p-4 sm:p-5 rounded-[1.4rem] flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-[#eaf8f1] dark:bg-[#0e291c] border-2 border-[#00a86b] shadow-md shadow-emerald-950/10'
                  : 'bg-white dark:bg-[#0c1811] hover:bg-slate-50 dark:hover:bg-[#112318] border border-slate-200/80 dark:border-[#173222] shadow-sm'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2.5 transition-colors ${
                  isSelected
                    ? 'bg-[#00a86b] text-white shadow-sm'
                    : 'bg-[#dff7eb] dark:bg-[#123120] text-[#00a86b] dark:text-[#00c880]'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 tracking-tight">
                {title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Center Divider: "විවිධ සේවා" */}
      <div className="flex items-center justify-center py-1">
        <div className="flex-1 border-t border-slate-200/90 dark:border-[#162e20]" />
        <span className="px-4 text-slate-500 dark:text-[#6a8775] text-xs sm:text-sm font-semibold tracking-wide">
          {sectionDividerText}
        </span>
        <div className="flex-1 border-t border-slate-200/90 dark:border-[#162e20]" />
      </div>

      {/* Bottom 4 Categories Grid (2 Columns) */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
        {bottomCategories.map((cat) => {
          const Icon = cat.icon;
          const title = getCategoryTitle(cat.key);
          const isSelected = selectedCategory === cat.key;

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelectCategory(cat.key, title)}
              className={`p-4 sm:p-5 rounded-[1.4rem] flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-[#eaf8f1] dark:bg-[#0e291c] border-2 border-[#00a86b] shadow-md shadow-emerald-950/10'
                  : 'bg-white dark:bg-[#0c1811] hover:bg-slate-50 dark:hover:bg-[#112318] border border-slate-200/80 dark:border-[#173222] shadow-sm'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2.5 transition-colors ${
                  isSelected
                    ? 'bg-[#00a86b] text-white shadow-sm'
                    : 'bg-[#dff7eb] dark:bg-[#123120] text-[#00a86b] dark:text-[#00c880]'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 tracking-tight">
                {title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
