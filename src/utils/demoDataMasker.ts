/**
 * Demo Data Masker Utility
 * Ensures that when a user browses the app in Guest/User Demo mode,
 * no personal details (real names, full addresses, phone numbers, NICs) are exposed.
 */

export const maskName = (name?: string, isDemo?: boolean, lang: string = 'si'): string => {
  if (!isDemo || !name) return name || '';
  if (lang === 'en') return 'User (Register to view)';
  if (lang === 'ta') return 'பயனர் (பார்க்க பதிவு செய்க)';
  return 'පරිශීලක (ලියාපදිංචි වන්න)';
};

export const maskPhone = (phone?: string, isDemo?: boolean): string => {
  if (!isDemo || !phone) return phone || '';
  return '07• ••• ••••';
};

export const maskAddress = (address?: string, isDemo?: boolean, lang: string = 'si'): string => {
  if (!isDemo || !address) return address || '';
  // Extract general town if possible, otherwise hide full road/house numbers
  const segments = address.split(',').map(s => s.trim()).filter(Boolean);
  const generalArea = segments.length > 0 ? segments[segments.length - 1] : (lang === 'en' ? 'Sri Lanka' : lang === 'ta' ? 'இலங்கை' : 'ශ්‍රී ලංකාව');
  if (lang === 'en') return `${generalArea} (Register for full address)`;
  if (lang === 'ta') return `${generalArea} (முழு முகவரிக்கு பதிவு செய்க)`;
  return `${generalArea} (සම්පූර්ණ ලිපිනය සඳහා ලියාපදිංචි වන්න)`;
};

export const maskGeneralDetail = (detail?: string, isDemo?: boolean, lang: string = 'si'): string => {
  if (!isDemo || !detail) return detail || '';
  if (lang === 'en') return '•••••••••• (Register to view)';
  if (lang === 'ta') return '•••••••••• (பார்க்க பதிவு செய்க)';
  return '•••••••••• (ලියාපදිංචි වන්න)';
};
