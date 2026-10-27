import React, { useState, useEffect } from 'react';
import { User, Language, UserStatus, Role } from '../types';
import { 
  X, 
  Save, 
  User as UserIcon, 
  CreditCard, 
  Phone, 
  MapPin, 
  Coins, 
  Shield, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AdminEditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => Promise<void> | void;
  language?: Language;
}

export const AdminEditUserModal: React.FC<AdminEditUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  language = 'si',
}) => {
  const [name, setName] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('ගම්පහ');
  const [status, setStatus] = useState<UserStatus>('pending');
  const [role, setRole] = useState<Role>('user');
  const [credits, setCredits] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setNicNumber(user.nicNumber || user.nic || user.userId || '');
      setPhone(user.phone || user.whatsappNumber || user.whatsappPhone || '');
      setAddress(user.address || '');
      setDistrict(user.district || 'ගම්පහ');
      setStatus(user.status || 'pending');
      setRole(user.role || 'user');
      setCredits(user.credits ?? user.creditBalance ?? 0);
      setError(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('සාමාජිකයාගේ නම ඇතුළත් කිරීම අනිවාර්යයි.');
      return;
    }
    if (!nicNumber.trim()) {
      setError('හැඳුනුම්පත් අංකය ඇතුළත් කිරීම අනිවාර්යයි.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const updated: User = {
      ...user,
      name: name.trim(),
      nicNumber: nicNumber.trim().toUpperCase(),
      nic: nicNumber.trim().toUpperCase(),
      phone: phone.trim(),
      whatsappNumber: phone.trim(),
      whatsappPhone: phone.trim(),
      address: address.trim(),
      district,
      status,
      role,
      credits: Number(credits) || 0,
      creditBalance: Number(credits) || 0,
      isBlocked: status === 'blocked',
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSave(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'දත්ත යාවත්කාලීන කිරීමේදී දෝෂයක් ඇති විය.');
    } finally {
      setIsSaving(false);
    }
  };

  const DISTRICTS = [
    'ගම්පහ', 'කොළඹ', 'කළුතර', 'මහනුවර', 'මාතලේ', 'නුවරඑළිය',
    'ගාල්ල', 'මාතර', 'හම්බන්තොට', 'යාපනය', 'කිලිනොච්චිය', 'මන්නාරම',
    'වවුනියාව', 'මුලතිව්', 'මඩකලපුව', 'අම්පාර', 'ත්‍රිකුණාමලය', 'කුරුණෑගල',
    'පුත්තලම', 'අනුරාධපුරය', 'පොළොන්නරුව', 'බදුල්ල', 'මොණරාගල', 'රත්නපුර', 'කෑගල්ල'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0c1811] rounded-3xl border-2 border-emerald-500/40 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold">
              ✏️
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black">
                සාමාජික තොරතුරු සංස්කරණය (Edit Member)
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                User ID: {user.userId || user.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/60 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-900 dark:text-slate-100">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>සම්පූර්ණ නම *</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="සාමාජිකයාගේ සම්පූර්ණ නම"
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#173a26] bg-slate-50 dark:bg-[#07170e] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* NIC Number */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>ජාතික හැඳුනුම්පත් අංකය (NIC) *</span>
            </label>
            <input
              type="text"
              required
              value={nicNumber}
              onChange={(e) => setNicNumber(e.target.value.toUpperCase())}
              placeholder="970181547V හෝ 199701815470"
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#173a26] bg-slate-50 dark:bg-[#07170e] text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>දුරකථන / WhatsApp අංකය</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="077XXXXXXX"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#173a26] bg-slate-50 dark:bg-[#07170e] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* District */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>දිස්ත්‍රික්කය</span>
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#173a26] bg-slate-50 dark:bg-[#07170e] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>ලිපිනය</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="නිවසේ ලිපිනය"
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#173a26] bg-slate-50 dark:bg-[#07170e] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status, Role & Credits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            
            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                ගිණුමේ තත්ත්වය (Status)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#173a26] bg-slate-50 dark:bg-[#07170e] text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="pending">🟡 Pending (අනුමැතියට)</option>
                <option value="approved">🟢 Approved (අනුමත)</option>
                <option value="blocked">🔴 Blocked (බ්ලොක් කළ)</option>
                <option value="rejected">⚪ Rejected (ප්‍රතික්ෂේපිත)</option>
              </select>
            </div>

            {/* Role */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                භූමිකාව (Role)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#173a26] bg-slate-50 dark:bg-[#07170e] text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="user">👤 User (සාමාන්‍ය)</option>
                <option value="admin">🛡️ Admin (පරිපාලක)</option>
              </select>
            </div>

            {/* Credits */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>ක්‍රෙඩිට් (Credits)</span>
              </label>
              <input
                type="number"
                min="0"
                value={credits}
                onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#173a26] bg-slate-50 dark:bg-[#07170e] text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
            >
              අවලංගු කරන්න
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'සුරකිමින් පවතී...' : 'වෙනස්කම් සුරකින්න'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
