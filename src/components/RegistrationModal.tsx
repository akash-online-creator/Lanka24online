import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  User, 
  CreditCard, 
  Phone, 
  MapPin, 
  HeartHandshake, 
  Camera,
  Trash2,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { UserRegistration } from '../types';
import { NicSpecimenCard } from './NicSpecimenCard';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: UserRegistration) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    nicNumber: '',
    phone: '',
    email: '',
    address: '',
    district: 'Colombo',
    userRole: 'volunteer' as 'volunteer' | 'helper' | 'recipient' | 'first_responder',
    skills: [] as string[],
    bloodGroup: 'O+',
    emergencyContact: ''
  });

  const [idCardFrontImage, setIdCardFrontImage] = useState<string | null>(null);
  const [idCardBackImage, setIdCardBackImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitErrorSummary, setSubmitErrorSummary] = useState<string[]>([]);

  // Refs for smooth auto-scroll to the first missing field
  const fieldRefs = {
    fullName: useRef<HTMLInputElement>(null),
    nicNumber: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    address: useRef<HTMLTextAreaElement>(null),
    district: useRef<HTMLSelectElement>(null),
    idCardFrontImage: useRef<HTMLDivElement>(null),
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Sri Lanka Districts
  const districts = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle'
  ];

  const volunteerSkills = [
    'ප්‍රථමාධාර (First Aid)',
    'ජල ගලවාගැනීම් (Water Rescue)',
    'ආහාර බෙදාහැරීම (Food Distribution)',
    'වෛද්‍ය සහය (Medical Care)',
    'ප්‍රවාහන පහසුකම් (Transport/4x4)',
    'සන්නිවේදනය (Ham Radio/Coordination)',
    'තාක්ෂණික සහය (IT/Data)'
  ];

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isBack = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          [isBack ? 'idCardBackImage' : 'idCardFrontImage']: 'කරුණාකර වලංගු ඡායාරූප ගොනුවක් තෝරන්න (JPG, PNG).'
        }));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (isBack) {
          setIdCardBackImage(base64);
        } else {
          setIdCardFrontImage(base64);
          // Clear error if resolved
          setErrors(prev => {
            const next = { ...prev };
            delete next.idCardFrontImage;
            return next;
          });
          setSubmitErrorSummary(prev => prev.filter(msg => !msg.includes('හැඳුනුම්පතේ ඉදිරිපස')));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setIdCardFrontImage(reader.result as string);
        setErrors(prev => {
          const next = { ...prev };
          delete next.idCardFrontImage;
          return next;
        });
        setSubmitErrorSummary(prev => prev.filter(msg => !msg.includes('හැඳුනුම්පතේ ඉදිරිපස')));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => {
      const exists = prev.skills.includes(skill);
      return {
        ...prev,
        skills: exists ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill]
      };
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const summary: string[] = [];

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'සම්පූර්ණ නම ඇතුළත් කිරීම අනිවාර්ය වේ.';
      summary.push('සම්පූර්ණ නම ඇතුළත් කරන්න');
    }

    const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
    if (!formData.nicNumber.trim()) {
      newErrors.nicNumber = 'ජාතික හැඳුනුම්පත් අංකය ඇතුළත් කිරීම අනිවාර්ය වේ.';
      summary.push('ජාතික හැඳුනුම්පත් අංකය (NIC) ඇතුළත් කරන්න');
    } else if (!nicRegex.test(formData.nicNumber.trim())) {
      newErrors.nicNumber = 'වලංගු NIC අංකයක් ඇතුළත් කරන්න (උදා: 199512345678 හෝ 951234567V).';
      summary.push('වලංගු NIC අංක ආකෘතියක් (951234567V හෝ 12 ඉලක්කම්) ඇතුළත් කරන්න');
    }

    const phoneDigits = formData.phone.replace(/[^0-9]/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'දුරකථන අංකය ඇතුළත් කිරීම අනිවාර්ය වේ.';
      summary.push('දුරකථන අංකය ඇතුළත් කරන්න');
    } else if (phoneDigits.length < 9) {
      newErrors.phone = 'වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න (ඉලක්කම් 10ක්).';
      summary.push('වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න');
    }

    if (!formData.address.trim()) {
      newErrors.address = 'ලිපිනය ඇතුළත් කිරීම අනිවාර්ය වේ.';
      summary.push('ලිපිනය ඇතුළත් කරන්න');
    }

    // Direct Front ID Photo Validation
    if (!idCardFrontImage) {
      newErrors.idCardFrontImage = 'හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය උඩුගත කිරීම අනිවාර්ය වේ.';
      summary.push('හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය එක් කරන්න');
    }

    setErrors(newErrors);
    setSubmitErrorSummary(summary);
    return { isValid: Object.keys(newErrors).length === 0, newErrors };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, newErrors } = validateForm();

    if (!isValid) {
      // REQUIREMENT 03: Scroll to first missing field smoothly AND display visible alert near submit button
      const errorKeys = ['fullName', 'nicNumber', 'phone', 'address', 'idCardFrontImage'] as const;
      for (const key of errorKeys) {
        if (newErrors[key]) {
          const el = fieldRefs[key]?.current;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if ('focus' in el) {
              (el as HTMLElement).focus();
            }
          }
          break;
        }
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitErrorSummary([]);

    setTimeout(() => {
      const newRegistration: UserRegistration = {
        id: 'user_' + Date.now(),
        fullName: formData.fullName.trim(),
        nicNumber: formData.nicNumber.trim().toUpperCase(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        district: formData.district,
        userRole: formData.userRole,
        skills: formData.skills,
        bloodGroup: formData.bloodGroup,
        idCardFrontImage: idCardFrontImage!,
        idCardBackImage: idCardBackImage || undefined,
        verifiedStatus: 'verified',
        registeredAt: Date.now(),
        emergencyContact: formData.emergencyContact
      };

      onSuccess(newRegistration);
      setIsSubmitting(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-950/50">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-sinhala leading-tight">
                සහය සේවා සාමාජික ලියාපදිංචිය
              </h2>
              <p className="text-xs text-slate-400 font-sinhala">
                ආරක්ෂිත 24/7 හදිසි සහන ජාලය සමග එක්වන්න
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          
          {/* USER REQUIREMENT 01: NicSpecimenCard Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 font-sinhala">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>ආදර්ශ හැඳුනුම්පත් පෙරදසුන (Specimen NIC Preview)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {idCardFrontImage ? '✅ ඔබගේ ඡායාරූපය සම්බන්ධ කර ඇත' : 'ඡායාරූපය උඩුගත කළ පසු මෙහි දිස්වේ'}
              </span>
            </div>
            
            {/* Dynamic Card rendering custom uploaded photo in specimen photo slot */}
            <NicSpecimenCard customImage={idCardFrontImage} />
          </div>

          {/* User Role Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 font-sinhala">
              ලියාපදිංචි වන කාණ්ඩය තෝරන්න <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'volunteer', label: 'ස්වේච්ඡා සාමාජික', sub: 'Volunteer', icon: HeartHandshake },
                { id: 'first_responder', label: 'හදිසි ගලවාගැනීම්', sub: 'First Responder', icon: ShieldCheck },
                { id: 'helper', label: 'සහනාධාර සපයන්නා', sub: 'Resource Donor', icon: Sparkles },
                { id: 'recipient', label: 'ආධාර අපේක්ෂක', sub: 'Recipient/Public', icon: User }
              ].map((role) => {
                const Icon = role.icon;
                const active = formData.userRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, userRole: role.id as any }))}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      active 
                        ? 'bg-red-500/10 border-red-500 text-white ring-2 ring-red-500/30' 
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${active ? 'text-red-400' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold font-sinhala leading-tight">{role.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{role.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Personal Info Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-sinhala">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>සම්පූර්ණ නම (Full Name)</span>
                <span className="text-red-400">*</span>
              </label>
              <input
                ref={fieldRefs.fullName}
                type="text"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, fullName: e.target.value }));
                  if (errors.fullName) setErrors(prev => { const n = { ...prev }; delete n.fullName; return n; });
                }}
                placeholder="කේ. එම්. අසංක පෙරේරා"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/70 border text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${
                  errors.fullName ? 'border-red-500 animate-field-error bg-red-950/20' : 'border-slate-700 focus:border-red-500'
                }`}
              />
              {errors.fullName && (
                <p className="text-[11px] text-red-400 font-medium font-sinhala flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* NIC Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-sinhala">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>ජාතික හැඳුනුම්පත් අංකය (NIC)</span>
                <span className="text-red-400">*</span>
              </label>
              <input
                ref={fieldRefs.nicNumber}
                type="text"
                value={formData.nicNumber}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, nicNumber: e.target.value.toUpperCase() }));
                  if (errors.nicNumber) setErrors(prev => { const n = { ...prev }; delete n.nicNumber; return n; });
                }}
                placeholder="199512345678 හෝ 951234567V"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/70 border text-white placeholder-slate-500 text-sm font-mono focus:outline-none transition-all ${
                  errors.nicNumber ? 'border-red-500 animate-field-error bg-red-950/20' : 'border-slate-700 focus:border-red-500'
                }`}
              />
              {errors.nicNumber && (
                <p className="text-[11px] text-red-400 font-medium font-sinhala flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {errors.nicNumber}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-sinhala">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>දුරකථන අංකය (Mobile Number)</span>
                <span className="text-red-400">*</span>
              </label>
              <input
                ref={fieldRefs.phone}
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, phone: e.target.value }));
                  if (errors.phone) setErrors(prev => { const n = { ...prev }; delete n.phone; return n; });
                }}
                placeholder="077 123 4567"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/70 border text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${
                  errors.phone ? 'border-red-500 animate-field-error bg-red-950/20' : 'border-slate-700 focus:border-red-500'
                }`}
              />
              {errors.phone && (
                <p className="text-[11px] text-red-400 font-medium font-sinhala flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* District */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-sinhala">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>දිස්ත්‍රික්කය (District)</span>
                <span className="text-red-400">*</span>
              </label>
              <select
                ref={fieldRefs.district}
                value={formData.district}
                onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-500"
              >
                {districts.map(d => (
                  <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Full Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-sinhala">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>ස්ථිර ලිපිනය (Permanent Address)</span>
              <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={fieldRefs.address}
              rows={2}
              value={formData.address}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, address: e.target.value }));
                if (errors.address) setErrors(prev => { const n = { ...prev }; delete n.address; return n; });
              }}
              placeholder="නො. 45, විහාර මාවත, නුවර"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/70 border text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${
                errors.address ? 'border-red-500 animate-field-error bg-red-950/20' : 'border-slate-700 focus:border-red-500'
              }`}
            />
            {errors.address && (
              <p className="text-[11px] text-red-400 font-medium font-sinhala flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {errors.address}
              </p>
            )}
          </div>

          {/* USER REQUIREMENT 02: Directly Clickable Upload Box & Removal of bottom green button */}
          <div className="space-y-2" ref={fieldRefs.idCardFrontImage}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 font-sinhala">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය</span>
                <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-sinhala">
                (JPG / PNG ඡායාරූපයක්)
              </span>
            </div>

            {/* Hidden Input Triggered Directly by Clicking the Box */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, false)}
            />

            {/* The Main Clickable Upload Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              className={`relative cursor-pointer group rounded-2xl border-2 border-dashed transition-all p-6 text-center flex flex-col items-center justify-center min-h-[160px] overflow-hidden ${
                errors.idCardFrontImage
                  ? 'border-red-500 bg-red-950/20 animate-field-error'
                  : isDragOver
                  ? 'border-emerald-400 bg-emerald-950/30 scale-[1.01]'
                  : idCardFrontImage
                  ? 'border-emerald-500/80 bg-slate-800/60'
                  : 'border-slate-700 bg-slate-800/40 hover:border-emerald-500/80 hover:bg-slate-800/80'
              }`}
            >
              {idCardFrontImage ? (
                <div className="w-full flex flex-col sm:flex-row items-center gap-4 justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={idCardFrontImage}
                      alt="Uploaded Front NIC"
                      className="w-20 h-14 object-cover rounded-lg border border-emerald-500 shadow-md shrink-0"
                    />
                    <div className="text-left">
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-sinhala">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ඡායාරූපය සාර්ථකව ඇතුළත් විය</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sinhala mt-0.5">
                        වෙනස් කිරීමට කොටුව නැවත ක්ලික් කරන්න
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-emerald-600/30 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold font-sinhala">
                      වෙනස් කරන්න
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIdCardFrontImage(null);
                      }}
                      className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title="ඉවත් කරන්න"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-100 font-sinhala">
                      හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය මෙතැනට එක් කරන්න
                    </p>
                    <p className="text-xs text-slate-400 font-sinhala mt-1">
                      (ක්ලික් කරන්න හෝ ඡායාරූපය මෙතැනට Drag & Drop කරන්න)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Inline Field Error Under Box */}
            {errors.idCardFrontImage && (
              <p className="text-[11px] text-red-400 font-medium font-sinhala flex items-center gap-1 mt-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {errors.idCardFrontImage}
              </p>
            )}
          </div>

          {/* Volunteer Skills Multi-select (if volunteer or first responder) */}
          {(formData.userRole === 'volunteer' || formData.userRole === 'first_responder') && (
            <div className="space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-sinhala">
                <HeartHandshake className="w-4 h-4 text-rose-400" />
                <span>ඔබට සහය විය හැකි අංශ (Skills & Support Capacity)</span>
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {volunteerSkills.map(skill => {
                  const selected = formData.skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium font-sinhala transition-all ${
                        selected
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {skill} {selected && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* USER REQUIREMENT 03: Visible Validation Summary Near Submit Button */}
          {submitErrorSummary.length > 0 && (
            <div 
              ref={errorSummaryRef}
              className="p-4 rounded-2xl bg-red-950/60 border-2 border-red-500/80 text-red-200 shadow-xl shadow-red-950/40 animate-field-error transition-all"
            >
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm font-sinhala mb-2">
                <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
                <span>කරුණාකර පහත අඩුපාඩු සම්පූර්ණ කර නැවත උත්සාහ කරන්න:</span>
              </div>
              <ul className="space-y-1 text-xs text-red-200 font-sinhala pl-6 list-disc">
                {submitErrorSummary.map((msg, idx) => (
                  <li key={idx} className="font-medium">{msg}</li>
                ))}
              </ul>
              <p className="text-[11px] text-red-300/80 font-sinhala mt-2 pt-2 border-t border-red-900/40">
                👉 අදාළ කොටු රතු පැහැයෙන් ලකුණු කර ඇති අතර, ඒවා නිවැරදිව පුරවා යොමු කරන්න.
              </p>
            </div>
          )}

          {/* Submit Action Area */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 font-sinhala flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>ඔබගේ සියලු තොරතුරු ආරක්ෂිත 256-bit සංකේතනයෙන් සුරැකේ</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 sm:w-auto px-5 py-3 rounded-xl bg-slate-800 text-slate-300 font-sinhala text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                අවලංගු කරන්න
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-1/2 sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-sinhala text-xs font-bold shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>ලියාපදිංචි වෙමින්...</span>
                  </>
                ) : (
                  <>
                    <span>ලියාපදිංචිය යොමු කරන්න</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
