import React from 'react';
import { Upload, CheckCircle2, Image as ImageIcon } from 'lucide-react';

interface IdPhotoUploadSectionProps {
  nicFrontPreview: string | null;
  nicBackPreview: string | null;
  onFrontPhotoSelect: (file: File, base64: string) => void;
  onBackPhotoSelect: (file: File, base64: string) => void;
}

export const IdPhotoUploadSection: React.FC<IdPhotoUploadSectionProps> = ({
  nicFrontPreview,
  nicBackPreview,
  onFrontPhotoSelect,
  onBackPhotoSelect,
}) => {
  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (file: File, base64: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      callback(file, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 my-4">
      {/* 1. FRONT PHOTO UPLOAD BOX */}
      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
          හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය <span className="text-red-500">*</span>
        </label>
        
        <div className="relative flex justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-5 hover:border-emerald-500 transition-colors bg-gray-50 dark:bg-gray-800/60 overflow-hidden cursor-pointer group">
          
          {/* Box එක මත සම්පූර්ණයෙන්ම ක්‍රියාත්මක වන Invisible Input එක */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFile(e, onFrontPhotoSelect)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
            aria-label="හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය තෝරන්න"
          />

          <div className="text-center pointer-events-none z-10 w-full">
            {nicFrontPreview ? (
              <div className="flex flex-col items-center">
                <img
                  src={nicFrontPreview}
                  alt="NIC Front Preview"
                  className="h-32 w-auto max-w-full rounded-xl object-cover shadow-sm mb-2 border border-emerald-500/30"
                />
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> ඉදිරිපස ඡායාරූපය තෝරාගෙන ඇත (වෙනස් කිරීමට ස්පර්ශ කරන්න)
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  ඉදිරිපස ඡායාරූපය මෙතැනට එක් කරන්න
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  කැමරාවෙන් ඡායාරූපයක් ගැනීමට හෝ ගැලරියෙන් තේරීමට ස්පර්ශ කරන්න
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. BACK PHOTO UPLOAD BOX (OPTIONAL) */}
      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
          හැඳුනුම්පතේ පිටුපස ඡායාරූපය (විකල්ප)
        </label>
        
        <div className="relative flex justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-5 hover:border-emerald-500 transition-colors bg-gray-50 dark:bg-gray-800/60 overflow-hidden cursor-pointer group">
          
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFile(e, onBackPhotoSelect)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
            aria-label="හැඳුනුම්පතේ පිටුපස ඡායාරූපය තෝරන්න"
          />

          <div className="text-center pointer-events-none z-10 w-full">
            {nicBackPreview ? (
              <div className="flex flex-col items-center">
                <img
                  src={nicBackPreview}
                  alt="NIC Back Preview"
                  className="h-32 w-auto max-w-full rounded-xl object-cover shadow-sm mb-2 border border-emerald-500/30"
                />
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> පිටුපස ඡායාරූපය තෝරාගෙන ඇත (වෙනස් කිරීමට ස්පර්ශ කරන්න)
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center py-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  පිටුපස ඡායාරූපය මෙතැනට එක් කරන්න
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  කැමරාවෙන් හෝ ගැලරියෙන් තේරීමට ස්පර්ශ කරන්න
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
