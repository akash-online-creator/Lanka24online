import React, { useState } from 'react';
import { Sparkles, AlertCircle, CheckSquare, Zap, ArrowRight } from 'lucide-react';
import { HelpPost, Language, LocationOption, User } from '../types';
import { translations } from '../data/translations';

interface QuickServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPost: (post: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>) => void;
  currentLocation: LocationOption;
  currentUser: User;
  lang: Language;
  categoryTitle?: string;
}

export const QuickServiceModal: React.FC<QuickServiceModalProps> = ({
  isOpen,
  onClose,
  onSubmitPost,
  currentLocation,
  currentUser,
  lang,
  categoryTitle,
}) => {
  const t = translations[lang];

  // Form states according to PDF specifications:
  const [whatHappened, setWhatHappened] = useState('මගේ බයික් එක කැඩිලා');
  const [whatIsNeeded, setWhatIsNeeded] = useState('උදව් කරන්න');
  const [conditions, setConditions] = useState('කාර්මික ශිල්පීන් පමණක් සම්බන්ධ වන්න. TOOLS අවශ්‍ය වේ.');
  const [transport, setTransport] = useState('මම පැමිණිය යුතුයි');
  const [paymentOption, setPaymentOption] = useState<'agree' | 'custom'>('agree');
  const [customPaymentAmount, setCustomPaymentAmount] = useState('1500');
  const [helpersNeeded, setHelpersNeeded] = useState<number>(2);
  const [feeAgreed, setFeeAgreed] = useState<boolean>(true);

  if (!isOpen) return null;

  const transportOptions = [
    'මම පැමිණිය යුතුයි',
    'මා පැමිණෙන්නම්',
    'මට එවන්න',
    'මම ගෙනැවිත්දෙන්නම්',
    'ඔබට එවන්නම්'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatHappened.trim() || !whatIsNeeded.trim()) {
      alert('කරුණාකර සියලු විස්තර ඇතුළත් කරන්න.');
      return;
    }
    if (!feeAgreed) {
      alert('කරුණාකර රු. 50 අයවීමට එකඟතාවය පළ කරන්න.');
      return;
    }

    const paymentText = paymentOption === 'agree'
      ? 'ඔබගේ ගාස්තුවට මම එකඟ වෙමි'
      : `රු. ${customPaymentAmount}/= (ගෙවිය හැක)`;

    onSubmitPost({
      userName: currentUser.name || 'විමල්සි',
      userPhone: currentUser.phone || '0771234567',
      whatHappened: whatHappened.trim(),
      whatIsNeeded: whatIsNeeded.trim(),
      conditions: conditions.trim(),
      transport: transport,
      payment: paymentText,
      helpersNeeded: helpersNeeded,
      helpersAccepted: 1,
      feeAgreed: true,
      locationName: `${currentLocation.nameSi} (${currentLocation.nameEn})`,
      distanceKm: 20, // Default 20KM matching PDF illustration
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      verifiedOtp: true,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.2)] overflow-hidden relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg">
              <Zap className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {categoryTitle ? `${categoryTitle} ඉල්ලීම` : 'ක්ෂණික සේවා ඉල්ලීම (Quick Services Request)'}
              </h3>
              <p className="text-xs text-emerald-300">
                ඉක්මන්, උපකාර ලබාගැනීම - වැදගත් තොරතුරු පුරවා ඉල්ලීම් පල කරන්න.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* 1. ගැටලුව පිළිබඳ විස්තරය */}
          <div>
            <label className="block text-xs font-bold text-rose-400 mb-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              ගැටලුව පිළිබඳ විස්තරය *
            </label>
            <input
              type="text"
              required
              value={whatHappened}
              onChange={(e) => setWhatHappened(e.target.value)}
              placeholder="උදා: මගේ බයික් එක කැඩිලා"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* 2. අවශ්‍යවන ප්‍රතිඵලය */}
          <div>
            <label className="block text-xs font-bold text-cyan-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              අවශ්‍යවන ප්‍රතිඵලය *
            </label>
            <input
              type="text"
              required
              value={whatIsNeeded}
              onChange={(e) => setWhatIsNeeded(e.target.value)}
              placeholder="උදා: උදව් කරන්න"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* 3. කොන්දේසි */}
          <div>
            <label className="block text-xs font-bold text-amber-400 mb-1">
              කොන්දේසි (Conditions)
            </label>
            <textarea
              rows={2}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="කාර්මික ශිල්පීන් පමණක් සම්බන්ධ වන්න. TOOLS අවශ්‍ය වේ."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-100 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* 4. ප්‍රවාහන අවශ්‍යතා */}
          <div>
            <label className="block text-xs font-bold text-emerald-300 mb-2">
              ප්‍රවාහන අවශ්‍යතා (Transport Requirements)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              {transportOptions.map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                    transport === opt
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="transport_option"
                    checked={transport === opt}
                    onChange={() => setTransport(opt)}
                    className="accent-emerald-500"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 5. ගෙවීම් ක්‍රමය */}
          <div>
            <label className="block text-xs font-bold text-emerald-400 mb-2">
              ගෙවීම් ක්‍රමය (Payment Method)
            </label>
            <div className="space-y-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="payment_option"
                  checked={paymentOption === 'agree'}
                  onChange={() => setPaymentOption('agree')}
                  className="accent-emerald-500"
                />
                <span className="font-semibold text-emerald-300">
                  [x] ඔබගේ ගාස්තුවට මම එකඟ වෙමි (I agree to your fee)
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer pt-1 border-t border-slate-800">
                <input
                  type="radio"
                  name="payment_option"
                  checked={paymentOption === 'custom'}
                  onChange={() => setPaymentOption('custom')}
                  className="accent-emerald-500"
                />
                <span>මම ගෙවිය හැක: රු.</span>
                <input
                  type="text"
                  disabled={paymentOption !== 'custom'}
                  value={customPaymentAmount}
                  onChange={(e) => setCustomPaymentAmount(e.target.value)}
                  className="w-24 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs font-mono text-emerald-300"
                />
              </label>

            </div>
          </div>

          {/* 6. උදව් අවශ්‍ය පුද්ගලයන් සංඛ්‍යාව */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                උදව් අවශ්‍ය පුද්ගලයන් සංඛ්‍යාව
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={helpersNeeded}
                onChange={(e) => setHelpersNeeded(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none font-bold text-center"
              />
            </div>

            <div className="flex items-center">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs text-slate-400">
                සහායකයින් එකතු වීමෙන් පසු සෘජුව සම්බන්ධ විය හැක.
              </div>
            </div>
          </div>

          {/* Fee Acceptance Checkbox */}
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-start gap-2 text-xs text-emerald-200">
            <input
              type="checkbox"
              id="fee_agree"
              checked={feeAgreed}
              onChange={(e) => setFeeAgreed(e.target.checked)}
              className="mt-0.5 accent-emerald-500"
            />
            <label htmlFor="fee_agree" className="cursor-pointer font-medium">
              මගින් සපයා දක්වන ලද තොරතුරු කැමති වූ පසු ඔබගෙන් රු. 50 ක් අයවේ.
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>SUBMIT (පළ කරන්න)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
