import React, { useState, useRef, useEffect } from 'react';
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
  Eye,
  Upload,
  MessageSquare,
  Send,
  Loader2
} from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';
import { syncUserProfileToFirestore } from '../lib/firebase';

interface AdminUserInspectionModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (user: User) => void;
  onBlock: (user: User, reason: string) => void;
  onUnblock: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onUpdateUser?: (updatedUser: User) => Promise<void> | void;
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
  onUpdateUser,
  language = 'si',
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  const [showBlockReasonPrompt, setShowBlockReasonPrompt] = useState(false);
  const [blockReason, setBlockReason] = useState('හැඳුනුම්පත් ඡායාරූපය සහ ලබාදුන් අංකය නොගැළපේ.');
  
  // Rejection with WhatsApp States
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('හැඳුනුම්පත් ඡායාරූපය අපැහැදිලියි.');

  // Photo Inspection & Admin Upload States
  const [copiedNic, setCopiedNic] = useState(false);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [photoRotation, setPhotoRotation] = useState(0);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCurrentUser(user);
    setShowBlockReasonPrompt(false);
    setShowRejectPrompt(false);
  }, [user]);

  if (!isOpen || !currentUser) return null;

  const nicPhoto = currentUser.nicFrontPhotoUrl || currentUser.idCardPhotoUrl || currentUser.photoUrl;
  const userNic = currentUser.nicNumber || currentUser.nic || currentUser.userId || 'N/A';
  const rawPhone = currentUser.whatsappPhone || currentUser.phone || currentUser.whatsappNumber || '';
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '').replace(/^0/, '');

  const handleCopyNic = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(userNic);
      setCopiedNic(true);
      setTimeout(() => setCopiedNic(false), 2000);
    }
  };

  const handleConfirmBlock = () => {
    if (!blockReason.trim()) {
      alert('කරුණාකර බ්ලොක් කිරීමට හේතුව ඇතුළත් කරන්න.');
      return;
    }
    onBlock(currentUser, blockReason.trim());
    setShowBlockReasonPrompt(false);
    onClose();
  };

  // 📷 Admin Image Upload & Replacement Handler
  const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      setIsProcessingPhoto(true);
      let dataUrl: string = '';
      try {
        dataUrl = await compressImageFile(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 });
      } catch {
        dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      }

      const updated: User = {
        ...currentUser,
        nicFrontPhotoUrl: dataUrl,
        idCardPhotoUrl: dataUrl,
        photoUrl: dataUrl,
        updatedAt: new Date().toISOString(),
      };

      setCurrentUser(updated);

      try {
        await syncUserProfileToFirestore(updated);
      } catch (err) {
        console.warn('Firestore sync notice:', err);
      }

      if (onUpdateUser) {
        await onUpdateUser(updated);
      }

      alert('✅ පරිශීලකයාගේ හැඳුනුම්පත් ඡායාරූපය සාර්ථකව යාවත්කාලීන කරන ලදී!');
    } catch (err) {
      console.error('Photo replacement failed:', err);
      alert('ඡායාරූපය යාවත්කාලීන කිරීම අසාර්ථක විය.');
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 🗑️ Admin Image Removal Handler
  const handleAdminPhotoRemove = async () => {
    if (!currentUser) return;
    if (!window.confirm('පරිශීලකයාගේ හැඳුනුම්පත් ඡායාරූපය ඉවත් කිරීමට ඔබට විශ්වාසද?')) return;

    try {
      setIsProcessingPhoto(true);
      const updated: User = {
        ...currentUser,
        nicFrontPhotoUrl: '',
        idCardPhotoUrl: '',
        photoUrl: '',
        updatedAt: new Date().toISOString(),
      };

      setCurrentUser(updated);

      try {
        await syncUserProfileToFirestore(updated);
      } catch (err) {
        console.warn('Firestore sync notice:', err);
      }

      if (onUpdateUser) {
        await onUpdateUser(updated);
      }

      alert('🗑️ හැඳුනුම්පත් ඡායාරූපය ඉවත් කරන ලදී.');
    } catch (err) {
      console.error('Photo removal failed:', err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // 💬 Generate Pre-filled WhatsApp Rejection Message
  const getWhatsAppRejectionMessage = () => {
    return `*සහය සේවා (Support Service) - ගිණුම් ලියාපදිංචි කිරීමේ නිවේදනයයි*

ගරු *${currentUser.name}*,
ඔබ විසින් ඉදිරිපත් කරන ලද ජාතික හැඳුනුම්පත් අංක *${userNic}* දරණ ගිණුම් ලියාපදිංචිය අනුමත කළ නොහැකි විය.

*ප්‍රතික්ෂේප වීමට හේතුව:*
👉 ${rejectionReason.trim()}

කරුණාකර නිවැරදි තොරතුරු හා පැහැදිලි හැඳුනුම්පත් ඡායාරූපයක් සහිතව නැවත ලියාපදිංචි වන්න, නැතහොත් මෙම WhatsApp අංකය හරහා පරිපාලක සහාය ලබාගන්න.

ස්තූතියි!
_පරිපාලක මණ්ඩලය - සහය සේවා_`;
  };

  // ❌ Confirm Rejection & Optional WhatsApp Dispatch
  const handleConfirmReject = (sendWhatsApp: boolean) => {
    if (!currentUser) return;

    if (sendWhatsApp && cleanPhone) {
      const msg = getWhatsAppRejectionMessage();
      const waUrl = `https://wa.me/94${cleanPhone}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
    }

    onDelete(currentUser);
    setShowRejectPrompt(false);
    onClose();
  };

  const isPending = currentUser.status === 'pending';
  const isApproved = currentUser.status === 'approved';
  const isBlocked = currentUser.status === 'blocked' || currentUser.isBlocked === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0a1a11] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#173a26] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Hidden File Input for Admin Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAdminPhotoUpload}
          className="hidden"
        />

        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-base shadow-md">
              {currentUser.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">{currentUser.name}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                  isApproved 
                    ? 'bg-emerald-400 text-slate-950' 
                    : isPending 
                    ? 'bg-amber-400 text-slate-950 animate-pulse' 
                    : 'bg-rose-400 text-slate-950'
                }`}>
                  {isApproved ? 'සක්‍රිය සාමාජික' : isPending ? 'අනුමැතියට නව අයදුම්පතක්' : 'අවහිර කර ඇත'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                පරිශීලක හැඳුනුම් අංකය: <span className="font-mono text-emerald-400">{currentUser.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct WhatsApp Contact Button in Header */}
            {cleanPhone && (
              <a
                href={`https://wa.me/94${cleanPhone}?text=${encodeURIComponent(`ආයුබෝවන් ${currentUser.name}, ඔබ සහය සේවා (Support Service) යෙදුමේ සිදුකළ ලියාපදිංචිය සම්බන්ධයෙනි.`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                title="WhatsApp මඟින් සම්බන්ධ වන්න"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp Chat</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">

          {/* Inspection Grid: Details Left, Photo Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left Column: User Profile Data (6 Cols) */}
            <div className="lg:col-span-6 space-y-4">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-[#173a26]">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>ලියාපදිංචි දත්ත පිරික්සුම (Registration Details)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Full Name */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0d2215] border border-slate-200/80 dark:border-[#1a4028]">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">සම්පූර්ණ නම</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{currentUser.name}</span>
                </div>

                {/* NIC Number */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0d2215] border border-slate-200/80 dark:border-[#1a4028]">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-slate-400 font-bold">ජාතික හැඳුනුම්පත් අංකය</span>
                    <button
                      type="button"
                      onClick={handleCopyNic}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      <span>{copiedNic ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <span className="font-black text-slate-900 dark:text-emerald-400 font-mono text-sm tracking-wide">
                    {userNic}
                  </span>
                </div>

                {/* Phone & WhatsApp with Direct Chat Button */}
                <div className="sm:col-span-2 p-3 rounded-xl bg-emerald-50/60 dark:bg-[#0d2215] border-2 border-emerald-200 dark:border-[#1a4028] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block mb-0.5">
                      දුරකථන / WhatsApp අංකය
                    </span>
                    <span className="font-black text-slate-900 dark:text-white font-mono text-sm">
                      {rawPhone || 'නොමැත'}
                    </span>
                  </div>
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/94${cleanPhone}?text=${encodeURIComponent(`ආයුබෝවන් ${currentUser.name}, ඔබ සහය සේවා (Support Service) යෙදුමේ සිදුකළ ලියාපදිංචිය සම්බන්ධයෙනි.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp මඟින් අමතන්න</span>
                    </a>
                  )}
                </div>

                {/* District / Town */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0d2215] border border-slate-200/80 dark:border-[#1a4028]">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">දිස්ත්‍රික්කය / පොලිස් වසම</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {currentUser.district || 'සඳහන් කර නැත'} {currentUser.policeDivision ? `(${currentUser.policeDivision})` : ''}
                  </span>
                </div>

                {/* Full Address */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0d2215] border border-slate-200/80 dark:border-[#1a4028]">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">ස්ථිර ලිපිනය</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                    {currentUser.address || 'ලිපිනය ඇතුළත් කර නොමැත'}
                  </span>
                </div>

                {/* Registration Timestamp */}
                <div className="sm:col-span-2 p-2.5 rounded-xl bg-white dark:bg-[#0d2215] border border-slate-200/80 dark:border-[#1a4028] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold">ලියාපදිංචි වූ දිනය:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {currentUser.registeredAt ? new Date(currentUser.registeredAt).toLocaleString('si-LK') : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Blocked info if blocked */}
                {isBlocked && (
                  <div className="sm:col-span-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 space-y-1">
                    <span className="font-black flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>ගිණුම බ්ලොක් කර ඇත (Account Blocked)</span>
                    </span>
                    <p className="text-[11px] font-medium leading-relaxed">
                      <strong>හේතුව:</strong> {currentUser.blockedReason || 'පරිපාලක විසින් අවහිර කරන ලදී.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Uploaded NIC Front Photo & Admin Controls (6 Cols) */}
            <div className="lg:col-span-6 space-y-3 bg-slate-50 dark:bg-[#07170e] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#143321] flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>හැඳුනුම්පත් ඡායාරූපය (NIC Photo)</span>
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
                <div className="w-full min-h-[240px] sm:min-h-[280px] rounded-2xl bg-slate-900 border-2 border-slate-300 dark:border-emerald-950 flex items-center justify-center overflow-hidden relative shadow-inner p-2">
                  {isProcessingPhoto ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-emerald-400">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-xs font-bold">ඡායාරූපය සකසමින් පවතී...</span>
                    </div>
                  ) : nicPhoto ? (
                    <img
                      src={nicPhoto}
                      alt="NIC Front"
                      style={{ transform: `rotate(${photoRotation}deg)` }}
                      className={`max-h-[260px] sm:max-h-[300px] w-auto object-contain rounded-xl transition-transform duration-300 cursor-zoom-in ${
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
                        හැඳුනුම්පත් ඡායාරූපයක් නොමැත හෝ ඉවත් කර ඇත.
                      </p>
                      <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                        පරිශීලකයාගෙන් WhatsApp මඟින් පැහැදිලි ඡායාරූපයක් ලබාගෙන පහත බොත්තමෙන් උඩුගත කරන්න.
                      </p>
                    </div>
                  )}
                </div>

                {/* 🛠️ Admin Photo Action Buttons (Upload / Replace / Remove) */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
                  <button
                    type="button"
                    disabled={isProcessingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{nicPhoto ? 'නිවැරදි ඡායාරූපය උඩුගත කරන්න (Replace)' : 'නව ඡායාරූපය උඩුගත කරන්න'}</span>
                  </button>

                  {nicPhoto && (
                    <button
                      type="button"
                      disabled={isProcessingPhoto}
                      onClick={handleAdminPhotoRemove}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ඡායාරූපය ඉවත් කරන්න</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Photo Inspection Tip Banner */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-slate-700 dark:text-emerald-200/90 leading-relaxed font-medium">
                💡 <strong>පරිපාලක උපදෙස:</strong> ඡායාරූපය අපැහැදිලි නම්, ඉහත WhatsApp බොත්තමෙන් පරිශීලකයා අමතා පැහැදිලි ඡායාරූපයක් ලබාගෙන මෙතැනින් Replace කරන්න.
              </div>
            </div>

          </div>

          {/* ❌ REJECTION WITH WHATSAPP DISPATCH MODAL (When Reject Clicked) */}
          {showRejectPrompt && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-500 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-900 pb-2">
                <h4 className="text-sm font-black text-rose-950 dark:text-rose-100 flex items-center gap-2">
                  <UserX className="w-5 h-5 text-rose-600" />
                  <span>ලියාපදිංචිය ප්‍රතික්ෂේප කිරීම සහ WhatsApp පණිවිඩය යැවීම</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowRejectPrompt(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ✕ වසන්න
                </button>
              </div>

              {/* User Identity Context */}
              <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-[#12281b] p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold">නම: </span>{currentUser.name} | <span className="font-bold">NIC: </span>{userNic}
                </div>
                <div className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                  WhatsApp: {rawPhone || 'නොමැත'}
                </div>
              </div>

              {/* Rejection Reason Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-900 dark:text-white">
                  ප්‍රතික්ෂේප කිරීමට හේතුව තෝරන්න හෝ ලියන්න:
                </label>

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'හැඳුනුම්පත් ඡායාරූපය අපැහැදිලියි / කියවිය නොහැක.',
                    'හැඳුනුම්පත් අංකය සහ ඡායාරූපයේ තොරතුරු නොගැළපේ.',
                    'ලබාදී ඇති නම හෝ ලිපිනය අසම්පූර්ණයි.',
                    'ව්‍යාජ හෝ වෙනත් අයෙකුගේ හැඳුනුම්පතක් භාවිත කර ඇත.',
                    'පරිපාලක අමතා නැවත තොරතුරු තහවුරු කරන්න.'
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setRejectionReason(chip)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        rejectionReason === chip
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#12281b] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-rose-900/60 hover:bg-rose-100'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="හේතුව සඳහන් කරන්න..."
                  className="w-full p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-[#08170e] text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* WhatsApp Message Live Preview Box */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>පරිශීලකයාගේ WhatsApp වෙත යවන පණිවිඩයේ පෙරදසුන (Preview):</span>
                </span>
                <div className="p-3 bg-emerald-50 dark:bg-[#06170c] border border-emerald-300 dark:border-emerald-900/60 rounded-xl text-[11px] font-sans text-slate-800 dark:text-emerald-100 whitespace-pre-line leading-relaxed shadow-inner">
                  {getWhatsAppRejectionMessage()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-rose-200 dark:border-rose-900">
                <button
                  type="button"
                  onClick={() => setShowRejectPrompt(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmReject(false)}
                  className="px-4 py-2 rounded-xl bg-rose-200 hover:bg-rose-300 text-rose-900 font-bold text-xs cursor-pointer transition-all"
                  title="WhatsApp පණිවිඩය නොයවා ඉවත් කරන්න"
                >
                  WhatsApp නොමැතිව ප්‍රතික්ෂේප කරන්න
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmReject(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ප්‍රතික්ෂේප කර WhatsApp පණිවිඩය යවන්න</span>
                </button>
              </div>
            </div>
          )}

          {/* Block Reason Enter Box */}
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
          
          {/* Reject / Delete Button */}
          <button
            type="button"
            onClick={() => setShowRejectPrompt(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
          >
            <UserX className="w-4 h-4" />
            <span>ප්‍රතික්ෂේප කරන්න (Reject Account)</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Unblock Button if Blocked */}
            {isBlocked && (
              <button
                type="button"
                onClick={() => {
                  onUnblock(currentUser);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>බ්ලොක් ඉවත් කර අනුමත කරන්න</span>
              </button>
            )}

            {/* Block Button if NOT Blocked */}
            {!isBlocked && (
              <button
                type="button"
                onClick={() => setShowBlockReasonPrompt(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>බ්ලොක් කරන්න</span>
              </button>
            )}

            {/* Accept / Approve Button if Pending */}
            {!isApproved && (
              <button
                type="button"
                onClick={() => {
                  onApprove(currentUser);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>සාමාජිකත්වය අනුමත කරන්න (Approve)</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition-all"
            >
              වසන්න
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminUserInspectionModal;
