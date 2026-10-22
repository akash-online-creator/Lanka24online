// 🎨 Multilingual Font Management Engine for Sahaya Sewa Feed
// Supports Sinhala, Tamil, and English dynamic web & local typography

export interface PostFontOption {
  id: string;
  name: string;
  lang: 'si' | 'en' | 'ta' | 'all';
  fontFamily: string;
  cssClass: string;
  previewSample: string;
}

export const SUPPORTED_POST_FONTS: PostFontOption[] = [
  {
    id: 'noto-sans-sinhala',
    name: 'සිංහල සම්මත (Noto Sans)',
    lang: 'si',
    fontFamily: "'Noto Sans Sinhala', 'Segoe UI', sans-serif",
    cssClass: 'font-sinhala-sans',
    previewSample: 'සහය සේවා ප්‍රජාව වෙත සාදරයෙන් පිළිගනිමු',
  },
  {
    id: 'abhaya-libre',
    name: 'සිංහල සම්භාව්‍ය (Abhaya Serif)',
    lang: 'si',
    fontFamily: "'Abhaya Libre', 'Noto Serif Sinhala', serif",
    cssClass: 'font-sinhala-serif',
    previewSample: 'කඩිනම් සහය සහ විශ්වාසනීය සේවාවන්',
  },
  {
    id: 'yaldevi',
    name: 'සිංහල නවීන (Yaldevi Modern)',
    lang: 'si',
    fontFamily: "'Yaldevi', 'Noto Sans Sinhala', sans-serif",
    cssClass: 'font-sinhala-modern',
    previewSample: 'ඔබට අවශ්‍ය ඕනෑම උපකාරයක් සොයාගන්න',
  },
  {
    id: 'inter',
    name: 'English Clean (Inter Sans)',
    lang: 'en',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    cssClass: 'font-sans',
    previewSample: 'Community Support & Instant Help Network',
  },
  {
    id: 'merriweather',
    name: 'English Editorial (Merriweather)',
    lang: 'en',
    fontFamily: "'Merriweather', Georgia, serif",
    cssClass: 'font-serif',
    previewSample: 'Reliable, safe and transparent community aid',
  },
  {
    id: 'playfair',
    name: 'English Royal (Playfair Display)',
    lang: 'en',
    fontFamily: "'Playfair Display', Georgia, serif",
    cssClass: 'font-serif',
    previewSample: 'Emergency Alert & Direct Assistance',
  },
  {
    id: 'caveat',
    name: 'English Handwritten (Caveat Script)',
    lang: 'en',
    fontFamily: "'Caveat', 'Comic Sans MS', cursive",
    cssClass: 'font-handwritten',
    previewSample: 'Hand in hand, building a stronger community',
  },
  {
    id: 'noto-sans-tamil',
    name: 'தமிழ் இயல்பு (Noto Sans Tamil)',
    lang: 'ta',
    fontFamily: "'Noto Sans Tamil', sans-serif",
    cssClass: 'font-tamil-sans',
    previewSample: 'சஹாய சேவா சமூக உதவி தளம்',
  },
  {
    id: 'noto-serif-tamil',
    name: 'தமிழ் செரிஃப் (Noto Serif Tamil)',
    lang: 'ta',
    fontFamily: "'Noto Serif Tamil', serif",
    cssClass: 'font-tamil-serif',
    previewSample: 'அவசர உதவி மற்றும் நேரடி ஆதரவு',
  },
];

const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Abhaya+Libre:wght@400;600;700;800&family=Caveat:wght@600;700&family=Inter:wght@400;600;700;800;900&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Noto+Sans+Sinhala:wght@400;600;700;800;900&family=Noto+Sans+Tamil:wght@400;600;700;800&family=Noto+Serif+Tamil:wght@400;700&family=Playfair+Display:ital,wght@0,600;0,800;1,600&family=Yaldevi:wght@400;600;700&display=swap';

export function injectPostFonts(): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('sahaya-post-google-fonts');
  if (existing) return;

  try {
    const link = document.createElement('link');
    link.id = 'sahaya-post-google-fonts';
    link.rel = 'stylesheet';
    link.href = GOOGLE_FONTS_HREF;
    document.head.appendChild(link);
  } catch (err) {
    console.debug('Fonts injection notice:', err);
  }
}

export function getFontFamilyById(fontId?: string): string {
  if (!fontId) return "'Noto Sans Sinhala', 'Inter', sans-serif";
  const found = SUPPORTED_POST_FONTS.find((f) => f.id === fontId);
  return found ? found.fontFamily : "'Noto Sans Sinhala', 'Inter', sans-serif";
}
