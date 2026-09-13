/**
 * Demo Data Masker Utility
 * Ensures that when a user browses the app in Guest/User Demo mode,
 * no personal details (real names, full addresses, phone numbers, NICs) are exposed.
 */

export const maskName = (name?: string, isDemo?: boolean): string => {
  if (!isDemo || !name) return name || '';
  return 'පරිශීලක (ලියාපදිංචි වන්න)';
};

export const maskPhone = (phone?: string, isDemo?: boolean): string => {
  if (!isDemo || !phone) return phone || '';
  return '07• ••• ••••';
};

export const maskAddress = (address?: string, isDemo?: boolean): string => {
  if (!isDemo || !address) return address || '';
  // Extract general town if possible, otherwise hide full road/house numbers
  const segments = address.split(',').map(s => s.trim()).filter(Boolean);
  const generalArea = segments.length > 0 ? segments[segments.length - 1] : 'ශ්‍රී ලංකාව';
  return `${generalArea} (සම්පූර්ණ ලිපිනය සඳහා ලියාපදිංචි වන්න)`;
};

export const maskGeneralDetail = (detail?: string, isDemo?: boolean): string => {
  if (!isDemo || !detail) return detail || '';
  return '•••••••••• (ලියාපදිංචි වන්න)';
};
