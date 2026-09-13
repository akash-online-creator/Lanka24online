import { TagItem } from '../types';
import { initialTags } from '../data/initialData';
import { 
  Leaf, 
  Scale, 
  Stethoscope, 
  Bus, 
  Wrench, 
  School, 
  BookOpen, 
  Shield, 
  Wallet, 
  Utensils, 
  Zap, 
  Tag,
  HeartPulse,
  HandCoins,
  PackageOpen,
  Clock,
  Lightbulb,
  Sprout,
  Laptop,
  Gift
} from 'lucide-react';

const TAGS_STORAGE_KEY = 'sahaya_tags_v1';

export function getTagIconComponent(tagName?: string, tagCategory?: string, categoryId?: string) {
  const text = `${tagName || ''} ${tagCategory || ''} ${categoryId || ''}`.toLowerCase();

  // 1. ශරීර අවයව සහ ජීව විද්‍යාත්මක ද්‍රව්‍ය (Biological / Organ donation -> HeartPulse)
  if (text.includes('ශරීර') || text.includes('අවයව') || text.includes('ජීව විද්') || text.includes('ජීව විද්‍යා') || text.includes('ලේ') || text.includes('blood') || text.includes('organ') || text.includes('biological')) {
    return HeartPulse;
  }

  // 2. මූල්‍යමය සහ ආර්ථික පරිත්‍යාග (Financial donation -> HandCoins / Wallet)
  if (text.includes('මූල්ය') || text.includes('මූල්‍ය') || text.includes('ආර්ථික') || text.includes('මුදල්') || text.includes('financ') || text.includes('money') || text.includes('hand-holding-dollar')) {
    return HandCoins;
  }

  // 3. භෞතික ද්‍රව්‍ය සහ සම්පත් පරිත්‍යාග (Material / physical resources -> PackageOpen)
  if (text.includes('භෞතික') || text.includes('ද්‍රව්‍ය') || text.includes('ද්රව්ය') || text.includes('සම්පත්') || text.includes('භාණ්ඩ') || text.includes('material') || text.includes('package') || text.includes('box')) {
    return PackageOpen;
  }

  // 4. කාලය සහ ශ්‍රමය පරිත්‍යාග කිරීම (Time & labor donation -> Clock)
  if (text.includes('කාලය') || text.includes('ශ්‍රමය') || text.includes('ශ්රමය') || text.includes('time') || text.includes('labor') || text.includes('volunteer')) {
    return Clock;
  }

  // 5. බුද්ධිමය සහ නිර්මාණාත්මක ද්‍රව්‍ය (Intellectual & creative -> Lightbulb)
  if (text.includes('බුද්ධි') || text.includes('නිර්මාණ') || text.includes('intellectual') || text.includes('creative') || text.includes('idea')) {
    return Lightbulb;
  }

  // 6. සත්ව සහ පරිසර පරිත්‍යාග (Animal & Environment -> Sprout)
  if (text.includes('සත්ව') || text.includes('පරිසර') || text.includes('හරිත') || text.includes('animal') || text.includes('env') || text.includes('seedling') || text.includes('sprout')) {
    return Sprout;
  }

  // 7. ඩිජිටල් වත්කම් සහ තාක්ෂණික දත්ත (Digital assets & tech data -> Laptop)
  if (text.includes('ඩිජිටල්') || text.includes('තාක්ෂණ') || text.includes('දත්ත') || text.includes('digital') || text.includes('laptop') || text.includes('tech') || text.includes('code')) {
    return Laptop;
  }

  // 8. වෙනත් විශේෂිත පරිත්‍යාග / Gift (Other donation -> Gift)
  if (text.includes('විශේෂිත පරිත්‍යාග') || text.includes('විශේෂිත පරිත්යාග') || text.includes('තෑගි') || text.includes('gift') || text.includes('donation')) {
    return Gift;
  }

  // 9. නීතිමය (Legal -> Scale)
  if (text.includes('නීති') || text.includes('ආරවුල්') || text.includes('legal') || text.includes('law') || text.includes('scale')) {
    return Scale;
  }

  // 10. සෞඛ්‍ය (Health / Medical -> Stethoscope)
  if (text.includes('සෞඛ්ය') || text.includes('සෞක්‍ය') || text.includes('සෞඛ්‍ය') || text.includes('වෛද්ය') || text.includes('වෛද්‍ය') || text.includes('health') || text.includes('medic') || text.includes('hospit')) {
    return Stethoscope;
  }

  // 11. ප්‍රවාහන (Transport -> Bus / Car)
  if (text.includes('ප්රවාහන') || text.includes('ප්‍රවාහන') || text.includes('ගමනාගමන') || text.includes('transp') || text.includes('bus') || text.includes('car') || text.includes('වාහන')) {
    return Bus;
  }

  // 12. කාර්මික (Technical / Mechanical -> Wrench)
  if (text.includes('කාර්මික') || text.includes('mechanic') || text.includes('repair') || text.includes('අලුත්වැඩියා') || text.includes('නඩත්තු') || text.includes('roof')) {
    return Wrench;
  }

  // 13. පාසල් (School -> School)
  if (text.includes('පාසල්') || text.includes('school')) {
    return School;
  }

  // 14. ඉගෙනුම් (Learning -> BookOpen)
  if (text.includes('ඉගෙනුම්') || text.includes('අධ්යාපන') || text.includes('අධ්‍යාපන') || text.includes('අධ්යයන') || text.includes('අධ්‍යයන') || text.includes('learn') || text.includes('study') || text.includes('book')) {
    return BookOpen;
  }

  // 15. ආරක්ෂක (Security -> Shield)
  if (text.includes('ආරක්ෂක') || text.includes('ආරක්‍ෂක') || text.includes('secur') || text.includes('shield') || text.includes('lock')) {
    return Shield;
  }

  // 16. කෑම / බීම (Food & Beverage -> Utensils)
  if (text.includes('කෑම') || text.includes('බීම') || text.includes('ආහාර') || text.includes('පෝෂණ') || text.includes('food') || text.includes('eat') || text.includes('utensil')) {
    return Utensils;
  }

  if (categoryId === 'quick_services') return Zap;
  if (categoryId === 'emergency') return Stethoscope;
  if (categoryId === 'vehicle') return Bus;
  if (categoryId === 'services') return Wrench;

  return Tag;
}

export function getStoredTags(): TagItem[] {
  try {
    const saved = localStorage.getItem(TAGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure all initialTags exist in returned tags
        const existingKeys = new Set(parsed.map((t: TagItem) => (t.tagName || '').trim().toLowerCase()));
        const missing = initialTags.filter((t) => !existingKeys.has(t.tagName.trim().toLowerCase()));
        if (missing.length > 0) {
          const merged = [...parsed, ...missing];
          saveTagsToStorage(merged);
          return merged;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load tags from storage', e);
  }
  return initialTags;
}

export function saveTagsToStorage(tags: TagItem[]): void {
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
  } catch (e) {
    console.warn('Failed to save tags to storage', e);
  }
}

export function addTagToStorage(tagName: string, category: string): { tag: TagItem; allTags: TagItem[]; isDuplicate: boolean } {
  const currentTags = getStoredTags();
  
  const trimmedName = tagName.trim();
  const trimmedCategory = category.trim();

  // Check if identical or near-identical name & category exists
  const existing = currentTags.find(
    (t) =>
      t.tagName.toLowerCase() === trimmedName.toLowerCase() &&
      t.category.toLowerCase() === trimmedCategory.toLowerCase()
  );

  if (existing) {
    return { tag: existing, allTags: currentTags, isDuplicate: true };
  }

  const newTag: TagItem = {
    id: `tag_${Date.now()}`,
    tagName: trimmedName,
    category: trimmedCategory,
    createdAt: new Date().toISOString(),
  };

  const updatedTags = [newTag, ...currentTags];
  saveTagsToStorage(updatedTags);

  return { tag: newTag, allTags: updatedTags, isDuplicate: false };
}

export function deleteTagFromStorage(tagId: string): TagItem[] {
  const currentTags = getStoredTags();
  const updated = currentTags.filter((t) => t.id !== tagId);
  saveTagsToStorage(updated);
  return updated;
}

export function updateTagInStorage(tagId: string, newName: string, newCategory: string): TagItem[] {
  const currentTags = getStoredTags();
  const updated = currentTags.map((t) => {
    if (t.id === tagId) {
      return {
        ...t,
        tagName: newName.trim(),
        category: newCategory.trim(),
      };
    }
    return t;
  });
  saveTagsToStorage(updated);
  return updated;
}

export function purgeUnusedTagsFromStorage(posts: { tagName?: string; tagId?: string }[]): TagItem[] {
  const currentTags = getStoredTags();
  // Collect all unique tag names and tag IDs used in active help posts
  const usedTagNames = new Set<string>();
  const usedTagIds = new Set<string>();

  posts.forEach((p) => {
    if (p.tagName) usedTagNames.add(p.tagName.trim().toLowerCase());
    if (p.tagId) usedTagIds.add(p.tagId);
  });

  const activeUsedTags = currentTags.filter((t) => {
    const nameMatch = usedTagNames.has(t.tagName.trim().toLowerCase());
    const idMatch = usedTagIds.has(t.id);
    return nameMatch || idMatch;
  });

  saveTagsToStorage(activeUsedTags);
  return activeUsedTags;
}

export function findSimilarTags(queryName: string, queryCategory: string, tags: TagItem[]): TagItem[] {
  const qName = (queryName || '').trim().toLowerCase();
  const qCat = (queryCategory || '').trim().toLowerCase();

  if ((!qName && !qCat) || !Array.isArray(tags)) return [];

  return tags.filter((t) => {
    if (!t) return false;
    const tagNameLower = (t.tagName || '').toLowerCase();
    const catLower = (t.category || '').toLowerCase();
    const nameMatch = qName.length >= 2 && (tagNameLower.includes(qName) || qName.includes(tagNameLower));
    const catMatch = qCat.length >= 2 && (catLower.includes(qCat) || qCat.includes(catLower));
    return nameMatch || catMatch;
  });
}

export function searchTags(query: string, tags: TagItem[]): TagItem[] {
  const q = (query || '').trim().toLowerCase();
  if (!q || !Array.isArray(tags)) return [];

  return tags.filter(
    (t) => t && ((t.tagName || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q))
  );
}
