import React, { useState, useEffect, useRef } from 'react';
import { Type, ZoomIn, ZoomOut, RotateCcw, Check, Sliders, X, Sparkles } from 'lucide-react';
import { Language } from '../types';

interface FontSizeControllerProps {
  language?: Language;
  className?: string;
}

const FONT_PRESETS = [
  { scale: 87.5, labelSi: 'පෙරනිමි කුඩා', labelEn: 'Default (14px)', labelTa: 'இயல்பு (14px)', desc: '87.5%' },
  { scale: 100, labelSi: 'සාමාන්‍ය', labelEn: 'Normal (16px)', labelTa: 'இயல்பு', desc: '100%' },
  { scale: 112.5, labelSi: 'මධ්‍යම', labelEn: 'Medium (18px)', labelTa: 'நடுத்தரம்', desc: '112.5%' },
  { scale: 125, labelSi: 'ලොකු', labelEn: 'Large (20px)', labelTa: 'பெரியது', desc: '125%' },
  { scale: 137.5, labelSi: 'ඉතා ලොකු', labelEn: 'Extra Large (22px)', labelTa: 'மிகப் பெரியது', desc: '137.5%' },
];

export const FontSizeController: React.FC<FontSizeControllerProps> = ({
  language = 'si',
  className = '',
}) => {
  const [scale, setScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sahaya_font_scale');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 75 && parsed <= 160) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return 87.5;
  });

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Apply root font-size percentage on mount and changes
  useEffect(() => {
    try {
      document.documentElement.style.fontSize = `${scale}%`;
      localStorage.setItem('sahaya_font_scale', scale.toString());
    } catch (e) {
      console.warn('Could not set font scale:', e);
    }
  }, [scale]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleIncrease = () => {
    const nextPreset = FONT_PRESETS.find((p) => p.scale > scale);
    if (nextPreset) {
      setScale(nextPreset.scale);
    } else if (scale < 155) {
      setScale((prev) => Math.min(155, prev + 15));
    }
  };

  const handleDecrease = () => {
    const prevPreset = [...FONT_PRESETS].reverse().find((p) => p.scale < scale);
    if (prevPreset) {
      setScale(prevPreset.scale);
    } else if (scale > 80) {
      setScale((prev) => Math.max(80, prev - 15));
    }
  };

  const handleReset = () => {
    setScale(100);
  };

  return (
    <div ref={dropdownRef} className={`relative flex items-center ${className}`}>
      {/* Quick Stepper Bar on Header */}
      <div 
        className="flex items-center gap-0.5 bg-white dark:bg-[#0a1c13] p-0.5 rounded-xl border border-slate-200 dark:border-[#1e4230] shadow-xs"
        title="අකුරු ප්‍රමාණය ලොකු / පොඩි කරන්න (Adjust Text Size)"
      >
        {/* Decrease A- button */}
        <button
          type="button"
          onClick={handleDecrease}
          disabled={scale <= 80}
          className={`px-1.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
            scale <= 80
              ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#163625] active:scale-95'
          }`}
          title="අකුරු කුඩා කරන්න (Decrease Font - A-)"
          aria-label="Decrease Font Size"
        >
          <span className="font-mono text-[11px] font-extrabold">A-</span>
        </button>

        {/* Center Indicator / Dropdown Opener */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer border ${
            scale !== 100
              ? 'bg-[#007a4b] text-white border-emerald-500/50 shadow-xs'
              : 'bg-slate-50 dark:bg-[#11261c] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#163625]'
          }`}
          title="අකුරු ප්‍රමාණය සැකසීම විවෘත කරන්න (Font Size Menu)"
          aria-label="Open Font Size Settings"
        >
          <Type className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] font-mono font-bold leading-none">{scale}%</span>
        </button>

        {/* Increase A+ button */}
        <button
          type="button"
          onClick={handleIncrease}
          disabled={scale >= 155}
          className={`px-1.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
            scale >= 155
              ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#163625] active:scale-95 text-[#007a4b] dark:text-[#00c880]'
          }`}
          title="අකුරු විශාල කරන්න (Increase Font - A+)"
          aria-label="Increase Font Size"
        >
          <span className="font-mono text-[11px] font-black">A+</span>
        </button>
      </div>

      {/* Accessible Elderly-Friendly Popup Modal / Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-[#0c2417] rounded-2xl shadow-2xl border-2 border-emerald-500/30 dark:border-emerald-500/40 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#007a4b] dark:text-[#00c880] flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  {language === 'si' ? 'අකුරු ප්‍රමාණය සැකසීම' : language === 'ta' ? 'எழுத்து அளவு அமைப்பு' : 'Text Size Settings'}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'si' ? 'ඕනෑම වයසකට පහසුවෙන් කියවීමට' : 'Easy reading for all ages'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="mt-3 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
              {language === 'si' ? 'ප්‍රමාණ තෝරාගැනීම (Presets):' : 'Select Size:'}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {FONT_PRESETS.map((preset) => {
                const isSelected = scale === preset.scale;
                return (
                  <button
                    key={preset.scale}
                    type="button"
                    onClick={() => setScale(preset.scale)}
                    className={`py-2 px-2.5 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-600 to-[#007a4b] text-white border-emerald-400 shadow-md scale-[1.02]'
                        : 'bg-slate-50 dark:bg-[#112a1d] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-emerald-400/50 hover:bg-emerald-50/50 dark:hover:bg-[#163827]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold leading-none">
                        {language === 'si' ? preset.labelSi : language === 'ta' ? preset.labelTa : preset.labelEn}
                      </div>
                      <div className={`text-[10px] mt-1 font-mono font-medium ${isSelected ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {preset.desc}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Continuous Slider Control */}
          <div className="mt-4 p-3 bg-slate-50 dark:bg-[#112a1d] rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'si' ? 'සියුම් ගැලපුම' : 'Fine Tune'}:</span>
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                {scale}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 font-mono">80%</span>
              <input
                type="range"
                min="80"
                max="155"
                step="5"
                value={scale}
                onChange={(e) => setScale(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#007a4b]"
              />
              <span className="text-[10px] font-bold text-slate-400 font-mono">155%</span>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="mt-3 p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
              {language === 'si' ? '👀 පෙරදසුන (Live Preview):' : 'Live Preview:'}
            </span>
            <p className="text-slate-800 dark:text-slate-100 font-semibold leading-relaxed">
              {language === 'si' 
                ? 'සැමට පිහිට • සහය සේවා පද්ධතිය' 
                : 'Sahaya Sewa Community Support'}
            </p>
          </div>

          {/* Footer Reset button */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              disabled={scale === 100}
              className={`text-xs font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                scale === 100
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-emerald-600'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'si' ? 'සාමාන්‍ය තත්වයට (100%)' : 'Reset (100%)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-[#007a4b] hover:bg-[#006a40] text-white font-bold text-xs shadow-sm cursor-pointer transition-all active:scale-95"
            >
              {language === 'si' ? 'හරි (Done)' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
