import React, { useState } from 'react';
import { User, Language } from '../types';
import { translations } from '../data/translations';
import { Card3D } from './Card3D';
import { UserPlus, Upload, Image as ImageIcon, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';

interface RegisterFormProps {
  onRegister: (newUser: Omit<User, 'id' | 'registeredAt'>) => void;
  onNavigateToLogin: () => void;
  language: Language;
}

const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
];

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegister,
  onNavigateToLogin,
  language,
}) => {
  const t = translations[language];

  const [name, setName] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [key, setKey] = useState('');
  const [photoUrl, setPhotoUrl] = useState(SAMPLE_AVATARS[1]);
  const [customPhotoInput, setCustomPhotoInput] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedUserId = `SS-${Math.floor(100000 + Math.random() * 900000)}`;
    
    onRegister({
      userId: generatedUserId,
      name,
      nicNumber,
      phone,
      email: email || `${generatedUserId.toLowerCase()}@sahaya.lk`,
      address,
      role: 'user',
      status: 'pending', // Piyawara 1.1: Standard user starts as Pending
      photoUrl,
      idCardPhotoUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80',
      key,
    });
  };

  return (
    <div className="w-full max-w-[500px] mx-auto py-4">
      <Card3D glowColor="rgba(6, 182, 212, 0.2)">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1">
            {t.registerTitle}
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto">
            {t.registerSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-medium ml-1">
                {t.fullName} *
              </label>
              <input
                type="text"
                required
                placeholder="उदा: කසුන් රංගන"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/70"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-medium ml-1">
                {t.nicNumber} *
              </label>
              <input
                type="text"
                required
                placeholder="199801240982"
                value={nicNumber}
                onChange={(e) => setNicNumber(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/70 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-medium ml-1">
                {t.phone} *
              </label>
              <input
                type="tel"
                required
                placeholder="0771234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/70 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-medium ml-1">
                {t.emailOptional}
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/70 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-medium ml-1">
              {t.address}
            </label>
            <input
              type="text"
              placeholder="ලිපිනය..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/70"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-medium ml-1">
              {t.keyLabel} *
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/70 font-mono"
            />
          </div>

          {/* Admin Photo Verification Upload */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="text-xs uppercase tracking-wider text-cyan-400 font-semibold flex items-center justify-between">
              <span>{t.uploadPhoto}</span>
              <span className="text-[10px] text-slate-400">Admin Approval Image</span>
            </label>

            <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-2xl border border-white/10">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-700 border border-white/20 flex-shrink-0 relative group">
                <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-500/30 cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>ඡායාරූපය තෝරන්න (Browse)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <p className="text-[11px] text-slate-400 leading-tight">
                  {t.photoNote}
                </p>
              </div>
            </div>

            {/* Quick Preset avatars selector */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-slate-400">නැතහොත් නිදර්ශන ඡායාරූපයක් තෝරන්න:</span>
              <div className="flex gap-1.5">
                {SAMPLE_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoUrl(url)}
                    className={`w-7 h-7 rounded-lg overflow-hidden border transition-all ${
                      photoUrl === url ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-105' : 'border-slate-600 opacity-60'
                    }`}
                  >
                    <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_20px_rgba(6,182,212,0.35)] border-b-4 border-cyan-800 transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2 cursor-pointer text-base"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{t.submitRegistration}</span>
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={onNavigateToLogin}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.alreadyRegistered}</span>
          </button>
        </div>
      </Card3D>
    </div>
  );
};
