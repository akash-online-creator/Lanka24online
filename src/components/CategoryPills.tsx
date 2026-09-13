import React from 'react';
import { Language } from '../types';
import { 
  Zap, 
  Briefcase, 
  Search, 
  Gift, 
  Store, 
  Users,
  Wrench,
  Globe
} from 'lucide-react';

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (key: string, title: string) => void;
  language: Language;
  className?: string;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
  language,
  className = '',
}) => {
  const getCategoryTitle = (key: string) => {
    switch (key) {
      case 'quick_services':
        return language === 'en' ? 'Quick Services' : language === 'ta' ? 'விரைவான சேவைகள்' : 'ඉක්මන් සේවා';
      case 'normal_services':
        return language === 'en' ? 'General Services' : language === 'ta' ? 'பொதுவான சேவைகள்' : 'සාමාන්‍ය සේවා';
      case 'professional_services':
        return language === 'en' ? 'Professional' : language === 'ta' ? 'தொழில்முறை' : 'වෘත්තීය සේවා';
      case 'islandwide':
        return language === 'en' ? 'Islandwide' : language === 'ta' ? 'தீவு முழுவதிலும்' : 'දිවයිනපුරා';
      case 'find_for_me':
        return language === 'en' ? 'Find For Me' : language === 'ta' ? 'கண்டுபிடிக்க' : 'සොයාදෙන්න';
      case 'from_me_to_you':
        return language === 'en' ? 'From Me To You' : language === 'ta' ? 'பரிசுகள்' : 'මගෙන් ඔබට';
      case 'marketplace':
        return language === 'en' ? 'Marketplace' : language === 'ta' ? 'சந்தை' : 'වෙළඳපොල';
      case 'group_work':
        return language === 'en' ? 'Group Work' : language === 'ta' ? 'குழு வேலை' : 'කණ්ඩායම් වැඩ';
      default:
        return '';
    }
  };

  const categories = [
    { key: 'quick_services', icon: Zap, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
    { key: 'normal_services', icon: Wrench, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
    { key: 'professional_services', icon: Briefcase, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
    { key: 'group_work', icon: Users, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
    { key: 'marketplace', icon: Store, color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' },
    { key: 'find_for_me', icon: Search, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30' },
    { key: 'from_me_to_you', icon: Gift, color: 'text-pink-500 bg-pink-500/10 border-pink-500/30' },
  ];

  return (
    <div className={`w-full overflow-x-auto no-scrollbar py-1 ${className}`}>
      <div className="flex items-center gap-2 px-0.5 min-w-max">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const title = getCategoryTitle(cat.key);
          const isSelected = selectedCategory === cat.key;

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelectCategory(cat.key, title)}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 border shadow-2xs whitespace-nowrap active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-600 to-[#007a4b] text-white border-emerald-500 shadow-xs'
                  : 'bg-white dark:bg-[#0c1811] hover:bg-slate-50 dark:hover:bg-[#12281b] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#173222]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : ''}`} />
              <span>{title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
