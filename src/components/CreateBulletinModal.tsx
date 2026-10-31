import React, { useState } from 'react';
import { X, PlusCircle, AlertTriangle, Send, MapPin, Phone, Tag } from 'lucide-react';
import { BulletinPost } from '../types';

interface CreateBulletinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: Omit<BulletinPost, 'id' | 'createdAt' | 'verified' | 'resolved'>) => void;
}

export const CreateBulletinModal: React.FC<CreateBulletinModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'flood' as BulletinPost['category'],
    severity: 'high' as BulletinPost['severity'],
    description: '',
    location: '',
    district: 'Colombo',
    contactName: '',
    contactPhone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'දැන්වීමේ මාතෘකාව ඇතුළත් කරන්න.';
    if (!formData.description.trim()) newErrors.description = 'විස්තරය ඇතුළත් කරන්න.';
    if (!formData.location.trim()) newErrors.location = 'ස්ථානය / ප්‍රදේශය ඇතුළත් කරන්න.';
    if (!formData.contactName.trim()) newErrors.contactName = 'සම්බන්ධීකාරක නම ඇතුළත් කරන්න.';
    if (!formData.contactPhone.trim()) newErrors.contactPhone = 'දුරකථන අංකය ඇතුළත් කරන්න.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white font-sinhala">
            නව ආපදා / සහන දැන්වීමක් පළ කරන්න
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 font-sinhala block mb-1">
              දැන්වීමේ මාතෘකාව <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="උදා: කඩුවෙල ප්‍රදේශයේ ගංවතුරින් කොටුවූවන්ට වියළි සලාක අවශ්‍යයි"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-sinhala focus:outline-none focus:border-red-500"
            />
            {errors.title && <p className="text-[11px] text-red-400 mt-1">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 font-sinhala block mb-1">
                කාණ්ඩය
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-sinhala"
              >
                <option value="flood">🌊 ගංවතුර / ආපදා</option>
                <option value="medical">🏥 වෛද්‍ය / බෙහෙත්</option>
                <option value="blood">🩸 රුධිර පරිත්‍යාග</option>
                <option value="food">🍲 ආහාර / සලාක</option>
                <option value="shelter">🏠 නවාතැන්</option>
                <option value="transport">🚜 ප්‍රවාහන / බෝට්ටු</option>
                <option value="general">📢 සාමාන්‍ය සහන</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 font-sinhala block mb-1">
                හදිසි මට්ටම (Severity)
              </label>
              <select
                value={formData.severity}
                onChange={e => setFormData({ ...formData, severity: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-sinhala"
              >
                <option value="critical">🚨 අතිශය හදිසි (Critical)</option>
                <option value="high">⚠️ ඉහළ හදිසි (High)</option>
                <option value="medium">⚡ මධ්‍යම (Medium)</option>
                <option value="low">ℹ️ සාමාන්‍ය (Low)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 font-sinhala block mb-1">
              සවිස්තරාත්මක තොරතුරු <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="අවශ්‍ය ආධාර, ප්‍රමාණය, නිශ්චිත ස්ථානය සහ අවශ්‍යතා පැහැදිලිව සඳහන් කරන්න..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-sinhala focus:outline-none focus:border-red-500"
            />
            {errors.description && <p className="text-[11px] text-red-400 mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 font-sinhala block mb-1">
                ස්ථානය / නගරය <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="උදා: කඩුවෙල, වැලිවිට"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-sinhala"
              />
              {errors.location && <p className="text-[11px] text-red-400 mt-1">{errors.location}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 font-sinhala block mb-1">
                දිස්ත්‍රික්කය
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={e => setFormData({ ...formData, district: e.target.value })}
                placeholder="Colombo"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-sinhala"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 font-sinhala block mb-1">
                සම්බන්ධීකාරක නම <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.contactName}
                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="නිමල් සිරිවර්ධන"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-sinhala"
              />
              {errors.contactName && <p className="text-[11px] text-red-400 mt-1">{errors.contactName}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 font-sinhala block mb-1">
                දුරකථන අංකය <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="071 234 5678"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
              />
              {errors.contactPhone && <p className="text-[11px] text-red-400 mt-1">{errors.contactPhone}</p>}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-sinhala hover:bg-slate-700"
            >
              අවලංගු කරන්න
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-sinhala flex items-center gap-1.5 shadow-lg shadow-red-950/40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>දැන්වීම පළ කරන්න</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
