import React, { useState } from 'react';
import { User } from '../types';
import { saveDevicePin, getStoredDevicePin } from '../utils/devicePinManager';

interface PinSetupProps {
  hasExistingPin?: boolean;
  currentUser?: User | null;
  onPinSaved?: (newPin: string) => void;
  onClose?: () => void;
}

type ActiveField = 'current' | 'new' | 'confirm';

export const NeonPinSetupManager: React.FC<PinSetupProps> = ({
  hasExistingPin = false,
  currentUser,
  onPinSaved,
  onClose
}) => {
  const [activeField, setActiveField] = useState<ActiveField>(
    hasExistingPin ? 'current' : 'new'
  );

  const [currentPin, setCurrentPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleKeyPress = (num: string) => {
    clearMessages();

    if (activeField === 'current') {
      if (currentPin.length < 4) {
        const updated = currentPin + num;
        setCurrentPin(updated);
        if (updated.length === 4) setActiveField('new');
      }
    } else if (activeField === 'new') {
      if (newPin.length < 4) {
        const updated = newPin + num;
        setNewPin(updated);
        if (updated.length === 4) setActiveField('confirm');
      }
    } else if (activeField === 'confirm') {
      if (confirmPin.length < 4) {
        setConfirmPin((prev) => prev + num);
      }
    }
  };

  // Backspace - කලින් Field එකට Navigation වෙන ලෙස සැකසීම
  const handleDelete = () => {
    clearMessages();

    if (activeField === 'confirm') {
      if (confirmPin.length > 0) {
        setConfirmPin((prev) => prev.slice(0, -1));
      } else {
        setActiveField('new');
        setNewPin((prev) => prev.slice(0, -1));
      }
    } else if (activeField === 'new') {
      if (newPin.length > 0) {
        setNewPin((prev) => prev.slice(0, -1));
      } else if (hasExistingPin) {
        setActiveField('current');
        setCurrentPin((prev) => prev.slice(0, -1));
      }
    } else if (activeField === 'current') {
      setCurrentPin((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    clearMessages();

    if (activeField === 'current') setCurrentPin('');
    if (activeField === 'new') setNewPin('');
    if (activeField === 'confirm') setConfirmPin('');
  };

  const handleSavePin = async () => {
    clearMessages();

    if (hasExistingPin && currentPin.length !== 4) {
      setError('කරුණාකර දැනට පවතින PIN අංකය (ඉලක්කම් 4) ඇතුළත් කරන්න.');
      return;
    }

    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setError('කරුණාකර අලුත් PIN අංකය සහ Confirm PIN එක දෙකම ඉලක්කම් 4 බැගින් ඇතුළත් කරන්න.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('ඇතුළත් කළ PIN අංක දෙක සමාන නොවේ! කරුණාකර නැවත පරීක්ෂා කරන්න.');
      return;
    }

    // Save to devicePinManager if currentUser is provided
    try {
      if (currentUser) {
        await saveDevicePin(currentUser, newPin);
      }
    } catch (e) {
      console.warn('Device pin save note:', e);
    }

    setSuccess('PIN අංකය සාර්ථකව සුරකින ලදී!');
    if (onPinSaved) onPinSaved(newPin);

    // Reset Form
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setActiveField(hasExistingPin ? 'current' : 'new');

    if (onClose) {
      setTimeout(() => onClose(), 1500);
    }
  };

  const handleFieldSelect = (field: ActiveField) => {
    clearMessages();
    setActiveField(field);
  };

  const renderPinDots = (value: string, fieldName: ActiveField, label: string) => {
    const isActive = activeField === fieldName;
    return (
      <button
        type="button"
        onClick={() => handleFieldSelect(fieldName)}
        className={`w-full text-left p-3 rounded-xl transition-all border ${
          isActive
            ? 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
        }`}
      >
        <div className="flex justify-between items-center mb-1">
          <span className={`text-xs font-medium ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
            {label}
          </span>
          {value.length > 0 && (
            <span className="text-[10px] text-emerald-300 font-mono">{value.length}/4</span>
          )}
        </div>
        <div className="flex justify-center gap-3 py-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                index < value.length
                  ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            />
          ))}
        </div>
      </button>
    );
  };

  return (
    <div className="w-full max-w-sm mx-auto p-6 bg-slate-950 text-slate-100 rounded-3xl border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] font-sans">
      <h2 className="text-lg font-bold text-center mb-5 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 tracking-wide uppercase">
        {hasExistingPin ? 'PIN අංකය වෙනස් කරන්න' : 'අලුත් PIN අංකයක් යොදන්න'}
      </h2>

      <div className="space-y-3 mb-5">
        {hasExistingPin && renderPinDots(currentPin, 'current', 'දැනට පවතින PIN අංකය')}
        {renderPinDots(newPin, 'new', 'අලුත් PIN අංකය')}
        {renderPinDots(confirmPin, 'confirm', 'PIN අංකය නැවත ඇතුළත් කරන්න')}
      </div>

      {error && (
        <div className="mb-4 p-2.5 text-xs text-rose-400 bg-rose-950/50 border border-rose-500/40 rounded-lg text-center shadow-[0_0_10px_rgba(244,63,94,0.2)]">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-2.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-500/40 rounded-lg text-center shadow-[0_0_10px_rgba(16,185,129,0.2)]">
          {success}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(num)}
            className="h-12 rounded-xl bg-slate-900 border border-emerald-500/20 text-emerald-300 font-semibold text-lg hover:bg-emerald-500/20 hover:border-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          onClick={handleClear}
          className="h-12 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs font-medium hover:text-slate-200 hover:border-slate-700 active:scale-95 transition-all uppercase"
        >
          මකන්න
        </button>

        <button
          type="button"
          onClick={() => handleKeyPress('0')}
          className="h-12 rounded-xl bg-slate-900 border border-emerald-500/20 text-emerald-300 font-semibold text-lg hover:bg-emerald-500/20 hover:border-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="h-12 rounded-xl bg-slate-900/50 border border-slate-800 text-rose-400 text-xs font-medium hover:bg-rose-950/30 hover:border-rose-500/30 active:scale-95 transition-all"
        >
          ⌫
        </button>
      </div>

      <button
        type="button"
        onClick={handleSavePin}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold uppercase tracking-wider hover:from-emerald-400 hover:to-teal-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all cursor-pointer"
      >
        PIN එක සුරකින්
      </button>
    </div>
  );
};

export default NeonPinSetupManager;
