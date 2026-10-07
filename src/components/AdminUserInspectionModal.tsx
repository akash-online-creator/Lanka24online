import React, { useState } from 'react';
import { User, Language } from '../types';
import { 
  X, 
  CheckCircle2, 
  ShieldAlert, 
  UserX, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard, 
  Maximize2, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Copy, 
  AlertTriangle,
  FileText,
  UserCheck,
  ShieldCheck,
  RotateCw,
  Eye
} from 'lucide-react';

interface AdminUserInspectionModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (user: User) => void;
  onBlock: (user: User, reason: string) => void;
  onUnblock: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  language?: Language;
}

export const AdminUserInspectionModal: React.FC<AdminUserInspectionModalProps> = ({
  user,
  isOpen,
  onClose,
  onApprove,
  onBlock,
  onUnblock,
  onEdit,
  onDelete,
  language = 'si',
}) => {
  const [showBlockReasonPrompt, setShowBlockReasonPrompt] = useState(false);
  const [blockReason, setBlockReason] = useState('හැඳුනුම්පත් ඡායාරූපය සහ ලබාදුන් අංකය නොගැළපේ.');
  const [copiedNic, setCopiedNic] = useState(false);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [photoRotation, setPhotoRotation] = useState(0);

  if (!isOpen || !user) return null;

  const nicPhoto = user.nicFrontPhotoUrl || user.idCardPhotoUrl || user.photoUrl;
  const userNic = user.nicNumber || user.nic || user.userId || 'N/A';

  const handleCopyNic = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(userNic);
      setCopiedNic(true);
      setTimeout(() => setCopiedNic(false), 2000);
    }
  };

  const handleConfirmBlock = () => {
    if (!blockReason.trim()) {
      alert('කරුණාකර බ්ලොක් කිරීමට හේතුව සඳහන් කරන්න.');
      return;
    }
    onBlock(user, blockReason.trim());
    setShowBlockReasonPrompt(false);
    onClose();
  };

  const isPending = user.status === 'pending';
  const isApproved = user.status === 'approved';
  const isBlocked = user.status === 'blocked' || user.isBlocked === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0c1811] rounded-3xl border-2 border-emerald-500/40 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-[#007a4b] to-teal-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-lg">
              🪪
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>සාමාජික තොරතුරු සහ හැඳුනුම්පත් සත්‍යාපනය</span>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-black ${
                  isApproved 
                    ? 'bg-emerald-400 text-slate-950' 
                    : isPending 
                    ? 'bg-amber-400 text-slate-950 animate-pulse' 
                    : 'bg-rose-500 text-white'
                }`}>
                  {user.status}
                </span>
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                ලබාදුන් හැඳුනුම්පත් අංකය සහ ඡායාරූපය සංසන්දනය කර අනුමත හෝ බ්ලොක් කරන්න
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/30 hover:bg-black/60 flex items-center justify-center text-white cursor-pointer transition-all active:scale-95"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-900 dark:text-slate-100">
          
          {/* Main Inspection Grid: Details Left, Photo Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left Column: User Profile Data (7 Cols) */}
            <div className="lg:col-span-6 space-y-3.5 bg-slate-50 dark:bg-[#07170e] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#143321]">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#163824]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                    {user.name?.charAt(0) || '👤'}
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                      {user.name}
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      User ID: {user.userId || user.id}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onEdit(user)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-[#112d1c] hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>සංස්කරණය</span>
                </button>
              </div>

              {/* 🪪 Highlighted Provided NIC Number Box */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/15 border-2 border-amber-400/60 dark:border-amber-500/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>ලබාදුන් ජාතික හැඳුනුම්පත් අංකය (Provided NIC)</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyNic}
                    className="px-2 py-0.5 rounded-lg bg-amber-200/80 dark:bg-amber-950 text-amber-950 dark:text-amber-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-amber-300"
                  >
                    {copiedNic ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedNic ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                <div className="text-lg sm:text-xl font-black font-mono tracking-wider text-slate-900 dark:text-white pt-0.5">
                  {userNic}
                </div>
              </div>

              {/* Other Profile Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                
                {/* Phone & WhatsApp */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0d2215] border border-slate-200/80 dark:border-[#1a4028]">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">දුරකථන / WhatsApp අංකය</span>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {user.phone || user.whatsappNumber || 'නොමැත'}
                    </span>
                    {(user.phone || user.whatsappNumber) && (
                      <a
                        href={`https://wa.me/94${(user.phone || user.whatsappNumber || '').replace(/^0/, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                      >
                        <span>WhatsApp</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* District / Town */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0d2215] border border-slate-200/80 dark:border-[#1a4028]">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">දිස්ත්‍රික්කය / නගරය</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {user.district || user.nearestTown || 'සඳහන් කර නැත'}
                  </span>
                </div>

                {/* Full Address */}
                <div className="sm:col-span-2 p-2.5 rounded-xl bg-white dark:bg-[#0d2215] border border-slate-200/80 dark:border-[#1a4028]">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">ස්ථිර ලිපිනය</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {user.address || 'ලිපිනය ඇතුළත් කර නොමැත'}
                  </span>
                </div>

                {/* Registration Timestamp & GPS */}
                <div className="sm:col-span-2 p-2.5 rounded-xl bg-white dark:bg-[#0d2215] border border-slate-200/80 dark:border-[#1a4028] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold">ලියාපදිංචි වූ දිනය:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {user.registeredAt ? new Date(user.registeredAt).toLocaleString('si-LK') : 'N/A'}
                    </span>
                  </div>

                  {user.registrationLocationName && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-bold">GPS සටහන් ස්ථානය:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[200px]">
                        {user.registrationLocationName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Blocked info if blocked */}
                {isBlocked && (
                  <div className="sm:col-span-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 space-y-1">
                    <span className="font-black flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>ගිණුම බ්ලොක් කර ඇත (Account Blocked)</span>
                    </span>
                    <p className="text-[11px] font-medium leading-relaxed">
                      <strong>හේතුව:</strong> {user.blockedReason || 'පරිපාලක විසින් අවහිර කරන ලදී.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Uploaded NIC Front Photo (6 Cols) */}
            <div className="lg:col-span-6 space-y-3 bg-slate-50 dark:bg-[#07170e] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#143321] flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>උඩුගත කළ හැඳුනුම්පත් ඡායාරූපය (NIC Photo)</span>
                  </h4>

                  {nicPhoto && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPhotoRotation((prev) => (prev + 90) % 360)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-[#112d1c] hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-emerald-300 transition-colors cursor-pointer"
                        title="Rotate Photo"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPhotoZoomed(!isPhotoZoomed)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-[#112d1c] hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-emerald-300 transition-colors cursor-pointer"
                        title="Zoom / Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Photo Viewer Container */}
                <div className="w-full min-h-[260px] sm:min-h-[300px] rounded-2xl bg-slate-900 border-2 border-slate-300 dark:border-emerald-950 flex items-center justify-center overflow-hidden relative shadow-inner p-2">
                  {nicPhoto ? (
                    <img
                      src={nicPhoto}
                      alt="NIC Front"
                      style={{ transform: `rotate(${photoRotation}deg)` }}
                      className={`max-h-[280px] sm:max-h-[320px] w-auto object-contain rounded-xl transition-transform duration-300 cursor-zoom-in ${
                        isPhotoZoomed ? 'scale-125' : 'scale-100'
                      }`}
                      onClick={() => setIsPhotoZoomed(!isPhotoZoomed)}
                    />
                  ) : (
                    <div className="text-center p-6 text-slate-400 space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-black text-xl">
                        ✕
                      </div>
                      <p className="text-xs font-bold text-rose-400">
                        හැඳුනුම්පත් ඡායාරූපයක් උඩුගත කර නොමැත.
                      </p>
                      <p className="text-[10px] text-slate-500">
                        ලියාපදිංචියේදී ඡායාරූපය ලැබී නොමැති බැවින් සත්‍යාපනය කළ නොහැක.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Inspection Tip Banner */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-slate-700 dark:text-emerald-200/90 leading-relaxed font-medium">
                💡 <strong>සත්‍යාපන උපදෙස:</strong> ඡායාරූපයේ ඇති හැඳුනුම්පත් අංකය, නම සහ ඡායාරූපය වම්පස ලියාපදිංචි දත්ත සමඟ ගැළපේදැයි පරික්ෂා කර තීරණය ගන්න.
              </div>
            </div>

          </div>

          {/* Block Reason Enter Box (Shown when Block clicked) */}
          {showBlockReasonPrompt && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-500/60 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                  <UserX className="w-4 h-4 text-rose-600" />
                  <span>ගිණුම බ්ලොක් කිරීමට හේතුව ඇතුළත් කරන්න:</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowBlockReasonPrompt(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  අවලංගු කරන්න ✕
                </button>
              </div>

              {/* Quick Reason Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'හැඳුනුම්පත් ඡායාරූපය සහ ලබාදුන් අංකය නොගැළපේ.',
                  'හැඳුනුම්පත් ඡායාරූපය අපැහැදිලියි / කියවිය නොහැක.',
                  'ව්‍යාජ හෝ වෙනත් අයෙකුගේ හැඳුනුම්පතක් භාවිත කර ඇත.',
                  'අසත්‍ය පුද්ගලික තොරතුරු සපයා ඇත.'
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setBlockReason(reason)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      blockReason === reason
                        ? 'bg-rose-600 text-white'
                        : 'bg-white dark:bg-[#12281b] text-slate-700 dark:text-slate-300 border border-rose-200 dark:border-rose-900/60'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="හේතුව සඳහන් කරන්න..."
                className="w-full p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-[#08170e] text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBlockReasonPrompt(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBlock}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>ස්ථිරවම බ්ලොක් කරන්න</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Action Buttons */}
        <div className="p-4 sm:p-5 bg-slate-100 dark:bg-[#07170e] border-t border-slate-200 dark:border-[#143321] flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`"${user.name}" ගිණුම සම්පූර්ණයෙන්ම මකා දැමීමට ඔබට විශ්වාසද?`)) {
                onDelete(user);
                onClose();
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ගිණුම මකන්න</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Unblock Button if Blocked */}
            {isBlocked && (
              <button
                type="button"
                onClick={() => {
                  onUnblock(user);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>බ්ලොක් ඉවත් කර අනුමත කරන්න (Unblock)</span>
              </button>
            )}

            {/* Block Button if NOT Blocked */}
            {!isBlocked && (
              <button
                type="button"
                onClick={() => setShowBlockReasonPrompt(true)}
                className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <UserX className="w-4 h-4 text-rose-600" />
                <span>බ්ලොක් කරන්න (Block User)</span>
              </button>
            )}

            {/* Accept / Approve Button if Pending or Rejected */}
            {!isApproved && (
              <button
                type="button"
                onClick={() => {
                  onApprove(user);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>සාමාජිකත්වය අනුමත කරන්න (Accept)</span>
              </button>
            )}

            {/* Done / Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition-all"
            >
              වසන්න
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
