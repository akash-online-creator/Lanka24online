import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { User, QrTransaction, Language } from '../types';
import { 
  generateUserPayCode, 
  createQrPayPayloadString, 
  generateQrDataUrl, 
  parseScannedQrPayload, 
  executeQrWalletPayment, 
  findUserForQrPayment,
  getStoredQrTransactions 
} from '../utils/qrPayManager';
import { getUserCreditBalance, extractNumericId } from '../utils/creditManager';
import { 
  QrCode, 
  Scan, 
  Camera, 
  Upload, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  Coins, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Receipt, 
  Sparkles,
  Zap,
  RotateCcw,
  Search,
  Phone,
  CreditCard,
  SwitchCamera,
  Layers,
  Flashlight
} from 'lucide-react';

interface UserQrPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  currentUser?: User | null;
  allUsers?: User[];
  language?: Language;
  onUpdateUser?: (updatedUser: any) => void;
  theme?: any;
  usersList?: any[];
  initialTab?: 'my_qr' | 'scan_pay';
  prefilledRecipient?: {
    userId: string;
    numericId?: string;
    name: string;
    phone?: string;
    fixedAmount?: number;
    purpose?: string;
  };
  targetRecipient?: {
    userId: string;
    numericId?: string;
    name: string;
    phone?: string;
    fixedAmount?: number;
    purpose?: string;
  };
  onPaymentSuccess?: (tx: QrTransaction) => void;
  onPaymentComplete?: (tx: QrTransaction) => void;
}

export const UserQrPayModal: React.FC<UserQrPayModalProps> = ({
  isOpen,
  onClose,
  user: propUser,
  currentUser: propCurrentUser,
  allUsers = [],
  language = 'si',
  initialTab = 'my_qr',
  prefilledRecipient,
  targetRecipient,
  onPaymentSuccess,
  onPaymentComplete,
}) => {
  const activeUser = propUser || propCurrentUser;
  const effectiveRecipient = prefilledRecipient || targetRecipient;

  const [activeTab, setActiveTab] = useState<'my_qr' | 'scan_pay'>(initialTab);

  // My QR Tab States
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [fixedAmountInput, setFixedAmountInput] = useState<string>('');
  const [isFixedAmount, setIsFixedAmount] = useState<boolean>(false);
  const [copiedPayCode, setCopiedPayCode] = useState<boolean>(false);
  const [myPayCode, setMyPayCode] = useState<string>('');

  // Scan & Pay States
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [purposeInput, setPurposeInput] = useState<string>('භාණ්ඩ / සේවා ගෙවීම');
  const [customPurpose, setCustomPurpose] = useState<string>('');
  const [isSearchingManual, setIsSearchingManual] = useState<boolean>(false);
  
  // Recipient Target State
  const [recipient, setRecipient] = useState<{
    userId: string;
    numericId?: string;
    name: string;
    phone?: string;
    payCode?: string;
    verified?: boolean;
    photo?: string;
  } | null>(null);

  // Processing & Success States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedTx, setCompletedTx] = useState<QrTransaction | null>(null);

  // Camera Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live balance listener
  const [currentBalance, setCurrentBalance] = useState<number>(() => {
    return activeUser ? getUserCreditBalance(activeUser) : 0;
  });

  useEffect(() => {
    if (activeUser) {
      setCurrentBalance(getUserCreditBalance(activeUser));
    }
  }, [activeUser, isOpen]);

  useEffect(() => {
    const handleWalletUpdated = () => {
      if (activeUser) {
        setCurrentBalance(getUserCreditBalance(activeUser));
      }
    };
    window.addEventListener('sahaya_wallet_updated', handleWalletUpdated);
    return () => window.removeEventListener('sahaya_wallet_updated', handleWalletUpdated);
  }, [activeUser]);

  const userNumericId = activeUser ? extractNumericId(activeUser.nicNumber || activeUser.userId) : '';

  // Initialize My QR
  useEffect(() => {
    if (isOpen && activeUser) {
      const code = generateUserPayCode(activeUser);
      setMyPayCode(code);
      const fixedNum = isFixedAmount && fixedAmountInput ? parseFloat(fixedAmountInput) : undefined;
      const payloadString = createQrPayPayloadString(activeUser, fixedNum);
      generateQrDataUrl(payloadString).then((url) => setQrDataUrl(url));
    }
  }, [isOpen, activeUser, isFixedAmount, fixedAmountInput]);

  // Handle Tab and Pre-filled recipient
  useEffect(() => {
    if (isOpen) {
      if (effectiveRecipient) {
        setActiveTab('scan_pay');
        const matched = findUserForQrPayment(effectiveRecipient.userId || effectiveRecipient.numericId || effectiveRecipient.phone || '', allUsers);
        setRecipient({
          userId: matched?.id || matched?.userId || effectiveRecipient.userId,
          numericId: matched ? extractNumericId(matched.nicNumber || matched.userId) : (effectiveRecipient.numericId || extractNumericId(effectiveRecipient.userId)),
          name: matched?.name || effectiveRecipient.name || 'සහය සාමාජිකයා',
          phone: matched?.phone || effectiveRecipient.phone,
          payCode: matched ? generateUserPayCode(matched) : undefined,
          verified: matched ? matched.status === 'approved' : true,
          photo: matched?.facePhotoUrl || matched?.photoUrl,
        });
        if (effectiveRecipient.fixedAmount) {
          setAmountInput(effectiveRecipient.fixedAmount.toString());
        }
        if (effectiveRecipient.purpose) {
          setPurposeInput(effectiveRecipient.purpose);
        }
      } else {
        setActiveTab(initialTab);
      }
      setCompletedTx(null);
      setErrorMessage(null);
    }
  }, [isOpen, initialTab, effectiveRecipient, allUsers]);

  // Auto start camera when switching to scan_pay tab (if no recipient is currently set)
  useEffect(() => {
    if (isOpen && activeTab === 'scan_pay' && !recipient && !completedTx) {
      const timer = setTimeout(() => {
        startCamera('environment');
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, recipient, completedTx]);

  // Audio feedback on successful QR scan
  const playScanSuccessSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      if (navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
    } catch (e) {
      // Audio context might be restricted
    }
  };

  // Start Camera Stream with reliable fallbacks
  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('කැමරාව මෙම බ්‍රවුසරයේ ක්‍රියාත්මක කළ නොහැක. කරුණාකර කේතය අතින් ඇතුළත් කරන්න හෝ QR පින්තූරය Upload කරන්න.');
        return;
      }

      let stream: MediaStream | null = null;
      
      // Attempt 1: Ideal facing mode and resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: facing }, 
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          },
          audio: false,
        });
      } catch (err1) {
        // Attempt 2: Exact/basic facingMode
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: false,
          });
        } catch (err2) {
          // Attempt 3: Any available video camera fallback
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) {
        throw new Error('කැමරා දත්ත ලබාගත නොහැකි විය.');
      }

      streamRef.current = stream;
      setCameraActive(true);
      setCameraFacing(facing);

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = (videoTrack.getCapabilities && videoTrack.getCapabilities()) as any;
          setIsTorchSupported(Boolean(capabilities && capabilities.torch));
        } catch (e) {
          setIsTorchSupported(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play warning:', playErr);
        }
      }

      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
      }
      scanLoopRef.current = requestAnimationFrame(scanVideoFrame);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      let errorMsg = 'කැමරාවට අවසර ලබාදී නොමැත. කරුණාකර බ්‍රවුසර් Address Bar එකෙන් Camera Allow කරන්න හෝ කේතය / දුරකථන අංකය අතින් ඇතුළත් කරන්න.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'කැමරා අවසරය (Camera Permission) අක්‍රීය කර ඇත. කරුණාකර Browser Settings වලින් හෝ URL Bar එකේ ඇති 🔒 අයිකනය ක්ලික් කර Camera අවසරය ලබාදෙන්න.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'ඔබගේ උපාංගයේ සක්‍රීය කැමරාවක් සොයාගත නොහැකි විය. කරුණාකර QR පින්තූරය Upload කරන්න හෝ කේතය ඇතුළත් කරන්න.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'කැමරාව වෙනත් යෙදුමක් මගින් භාවිතා වේ. කරුණාකර වෙනත් apps වසා නැවත උත්සාහ කරන්න.';
      }
      setCameraError(errorMsg);
      setCameraActive(false);
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    startCamera(nextFacing);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const targetTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: targetTorch }]
      });
      setIsTorchOn(targetTorch);
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsTorchOn(false);
    setIsTorchSupported(false);
  };

  // Real-time Video QR Frame Scanner using jsQR
  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current) {
      scanLoopRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          playScanSuccessSound();
          handleQrPayloadDetected(code.data);
          stopCamera();
          return;
        }
      }
    }

    scanLoopRef.current = requestAnimationFrame(scanVideoFrame);
  };

  // Process detected QR String
  const handleQrPayloadDetected = (rawPayload: string) => {
    setErrorMessage(null);
    const result = parseScannedQrPayload(rawPayload, allUsers);

    if (!result.isValid) {
      setErrorMessage(result.error || 'වලංගු සහය සේවා QR කේතයක් නොවේ.');
      return;
    }

    const matched = result.matchedUser || findUserForQrPayment(result.recipientUserId || result.recipientNumericId || result.recipientPhone || '', allUsers);

    const recipientData = {
      userId: matched?.id || matched?.userId || result.recipientUserId || `usr_${result.recipientNumericId || 'target'}`,
      numericId: matched ? extractNumericId(matched.nicNumber || matched.userId) : (result.recipientNumericId || ''),
      name: matched?.name || result.recipientName || 'සහය සාමාජිකයා',
      phone: matched?.phone || result.recipientPhone || '',
      payCode: result.payCode || (matched ? generateUserPayCode(matched) : undefined),
      verified: matched ? matched.status === 'approved' : true,
      photo: matched?.facePhotoUrl || matched?.photoUrl,
    };

    setRecipient(recipientData);
    if (result.fixedAmount && result.fixedAmount > 0) {
      setAmountInput(result.fixedAmount.toString());
    }
  };

  // Upload QR Image from gallery with downscaling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Downscale large images for optimal QR detection
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const imgData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            handleQrPayloadDetected(code.data);
          } else {
            setErrorMessage('පින්තූරයෙන් QR කේතයක් හඳුනාගත නොහැකි විය. කරුණාකර පැහැදිලි QR පින්තූරයක් තෝරන්න හෝ කේතය අතින් ඇතුළත් කරන්න.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Lookup manual code / phone / NIC
  const handleManualLookup = () => {
    const query = manualCodeInput.trim();
    if (!query) {
      setErrorMessage('කරුණාකර 6-ඉලක්කම් ගෙවීම් කේතය, දුරකථන අංකය හෝ NIC අංකය ඇතුළත් කරන්න.');
      return;
    }
    setIsSearchingManual(true);
    handleQrPayloadDetected(query);
    setIsSearchingManual(false);
  };

  // Copy Pay Code
  const handleCopyCode = () => {
    if (!myPayCode) return;
    navigator.clipboard.writeText(myPayCode);
    setCopiedPayCode(true);
    setTimeout(() => setCopiedPayCode(false), 2500);
  };

  // Download QR Image
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `SahayaPay_QR_${userNumericId || 'User'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    if (!activeUser) return;
    const amountText = isFixedAmount && fixedAmountInput ? `\nඅයවිය යුතු මුදල: *රු. ${parseFloat(fixedAmountInput).toFixed(2)}*` : '';
    const text = `*සහය සේවා (Sahaya Pay) QR ගෙවීම් තොරතුරු*\n\nනම: ${activeUser.name}\nසාමාජික ID: ${userNumericId}\nගෙවීම් කේතය (Pay Code): *${myPayCode}*\nදුරකථන: ${activeUser.phone || 'N/A'}${amountText}\n\nමෙම කේතය හෝ QR එක Sahaya Sewa Wallet Scan & Pay හරහා ගෙවීමට භාවිතා කරන්න.`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Execute Payment
  const handleConfirmPayment = () => {
    setErrorMessage(null);
    if (!activeUser) {
      setErrorMessage('ඔබගේ ගිණුම හඳුනාගත නොහැක. කරුණාකර නැවත Log in වන්න.');
      return;
    }

    if (!recipient) {
      setErrorMessage('ගෙවීම ලබන්නාගේ තොරතුරු තහවුරු කර නොමැත.');
      return;
    }

    const numAmount = parseFloat(amountInput);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('කරුණාකර වලංගු ගෙවීම් මුදලක් (LKR) ඇතුළත් කරන්න.');
      return;
    }

    if (currentBalance < numAmount) {
      setErrorMessage(`ඔබගේ Wallet ශේෂය ප්‍රමාණවත් නොවේ. අවශ්‍ය මුදල රු. ${numAmount.toFixed(2)} කි. ඔබගේ දැනට ශේෂය රු. ${currentBalance.toFixed(2)} කි. කරුණාකර Top-Up කරන්න.`);
      return;
    }

    setIsProcessing(true);

    try {
      const finalPurpose = purposeInput === 'වෙනත්' ? (customPurpose || 'වෙනත් ගෙවීමක්') : purposeInput;
      const result = executeQrWalletPayment(
        activeUser,
        {
          userId: recipient.userId,
          numericId: recipient.numericId,
          name: recipient.name,
          phone: recipient.phone,
        },
        numAmount,
        finalPurpose,
        recipient.payCode
      );

      if (result.success && result.qrTransaction) {
        setCompletedTx(result.qrTransaction);
        setCurrentBalance(result.payerNewBalance ?? (currentBalance - numAmount));
        if (onPaymentSuccess) onPaymentSuccess(result.qrTransaction);
        if (onPaymentComplete) onPaymentComplete(result.qrTransaction);
      } else {
        setErrorMessage(result.error || 'ගෙවීම සම්පූර්ණ කිරීමේදී දෝෂයක් සිදුවිය.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'ගෙවීම් දෝෂයක් සිදුවිය.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset payment form
  const handleResetScan = () => {
    setRecipient(null);
    setAmountInput('');
    setManualCodeInput('');
    setErrorMessage(null);
    setCompletedTx(null);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white dark:bg-[#07170e] border-2 border-emerald-500/50 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl transition-all relative max-h-[94vh] flex flex-col">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-md shrink-0">
              <QrCode className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Sahaya Pay QR ක්‍රමවේදය
                </h2>
                <span className="bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Wallet Direct
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 font-medium">
                QR ස්කෑන් කර හෝ කේතය ලබාදී Wallet එකෙන් ක්ෂණිකව ගෙවන්න
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="වසන්න"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center border-b border-slate-200 dark:border-[#163a25] bg-slate-50 dark:bg-[#05110a] px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => {
              setActiveTab('my_qr');
              setCompletedTx(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'my_qr'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#07170e] rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>මගේ QR & Pay Code (ලබාගැනීමට)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('scan_pay');
              setCompletedTx(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'scan_pay'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#07170e] rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Scan className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Scan & Pay (මුදල් ගෙවීමට)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          
          {/* ======================================================== */}
          {/* TAB 1: MY QR CODE & RECEIVE DETAILS */}
          {/* ======================================================== */}
          {activeTab === 'my_qr' && (
            <div className="space-y-5 flex flex-col items-center">
              
              {/* Branded QR Card Container */}
              <div className="bg-gradient-to-b from-emerald-50 via-white to-slate-50 dark:from-[#0b2216] dark:via-[#07170e] dark:to-[#040e09] border-2 border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-xl w-full max-w-sm flex flex-col items-center text-center relative overflow-hidden">
                
                {/* Header User Badge */}
                <div className="flex items-center gap-2 mb-3 bg-white dark:bg-[#122e1e] border border-emerald-300 dark:border-emerald-700/50 px-3.5 py-1.5 rounded-full shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                    {activeUser?.name || 'පරිශීලක'} • ID: {userNumericId}
                  </span>
                </div>

                {/* QR Canvas Box */}
                <div className="bg-white p-3.5 rounded-2xl shadow-md border-2 border-slate-200 dark:border-slate-700 mb-3 relative group">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Sahaya Pay QR Code"
                      className="w-56 h-56 sm:w-60 sm:h-60 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center bg-slate-100 rounded-lg">
                      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-1 text-[10px] font-black text-slate-400 tracking-widest uppercase text-center pointer-events-none">
                    SAHAYA PAY SECURE
                  </div>
                </div>

                {/* 6-Digit Pay Code Display */}
                <div className="w-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-3 mb-3">
                  <span className="text-[11px] font-extrabold text-amber-900 dark:text-amber-200 block mb-1">
                    ස්කෑන් කළ නොහැකි විට ලබාදෙන 6-ඉලක්කම් ගෙවීම් කේතය:
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-2xl font-black tracking-widest text-emerald-900 dark:text-amber-300 bg-white dark:bg-[#0f2a1a] px-4 py-1 rounded-xl border border-amber-400/50 shadow-inner">
                      {myPayCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 rounded-xl bg-amber-200/60 hover:bg-amber-300 text-amber-950 dark:bg-amber-900/60 dark:text-amber-200 transition-all cursor-pointer"
                      title="කේතය Copy කරගන්න"
                    >
                      {copiedPayCode ? <Check className="w-4 h-4 text-emerald-700 font-bold" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Fixed Amount Option */}
                <div className="w-full bg-white dark:bg-[#0c2216] border border-slate-200 dark:border-emerald-900/60 rounded-2xl p-3 text-left mb-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isFixedAmount}
                        onChange={(e) => setIsFixedAmount(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>නියමිත ස්ථාවර මුදලක් සඳහා QR සැකසීම</span>
                    </label>
                  </div>
                  {isFixedAmount && (
                    <div className="flex items-center gap-2 animate-fadeIn">
                      <span className="text-xs font-bold text-slate-500">රු.</span>
                      <input
                        type="number"
                        placeholder="මුදල (LKR) උදා: 500"
                        value={fixedAmountInput}
                        onChange={(e) => setFixedAmountInput(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-1.5 bg-slate-50 dark:bg-[#07160e] border border-emerald-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 w-full">
                  <button
                    onClick={handleDownloadQr}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download QR</span>
                  </button>

                  <button
                    onClick={handleShareWhatsApp}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>WhatsApp Share</span>
                  </button>
                </div>
              </div>

              {/* Security Hint */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5 w-full max-w-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  අනෙක් පාර්ශවය මෙම QR එක ස්කෑන් කර හෝ Pay Code එක ඇතුළත් කළ විට ඔවුන්ගේ Wallet එකෙන් ඔබගේ Wallet එකට ක්ෂණිකව මුදල් බැර වේ.
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: SCAN & PAY WORKFLOW */}
          {/* ======================================================== */}
          {activeTab === 'scan_pay' && (
            <div className="space-y-5">
              
              {/* If Payment completed, show receipt */}
              {completedTx ? (
                <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-[#0a2014] dark:via-[#07180f] dark:to-[#04100a] border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-xl text-center space-y-4 animate-scaleUp">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-200">
                      ගෙවීම සාර්ථකයි! (Payment Successful)
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">
                      මුදල් සාර්ථකව අනෙක් පාර්ශවයේ Wallet එකට බැර කරන ලදි.
                    </p>
                  </div>

                  {/* Digital Receipt Card */}
                  <div className="bg-white dark:bg-[#0e2719] border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                    <div className="flex justify-between items-center border-b pb-2 border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-bold">ගනුදෙනු අංකය (Ref):</span>
                      <span className="font-mono font-black text-emerald-800 dark:text-emerald-300">{completedTx.referenceNo}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">ලබන්නා (Payee):</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{completedTx.payeeName}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">ගෙවූ මුදල:</span>
                      <span className="font-black text-base text-emerald-700 dark:text-emerald-400">රු. {completedTx.amount.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">හේතුව:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{completedTx.purpose}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">දිනය සහ වේලාව:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{completedTx.timestamp}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-bold">ඔබගේ නව ශේෂය:</span>
                      <span className="font-black text-amber-600 dark:text-amber-400">රු. {completedTx.payerBalanceAfter.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleResetScan}
                      className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>තවත් ගෙවීමක් කරන්න</span>
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-white font-extrabold text-xs transition-all cursor-pointer"
                    >
                      <span>වසන්න</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Scan & Input Form */
                <div className="space-y-4">
                  
                  {/* Current Available Wallet Balance Notice */}
                  <div className="bg-gradient-to-r from-amber-500 to-emerald-600 rounded-2xl p-3 text-white flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-amber-200" />
                      <div>
                        <span className="text-[11px] font-bold text-amber-100 block">ඔබගේ Wallet ශේෂය:</span>
                        <span className="text-base font-black">රු. {currentBalance.toFixed(2)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      Direct Pay
                    </span>
                  </div>

                  {/* Error Notification */}
                  {errorMessage && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl p-3 flex items-start gap-2 text-xs text-rose-900 dark:text-rose-200 animate-shake">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* STEP 1: If No Recipient Selected yet -> Scanner & Code Input */}
                  {!recipient ? (
                    <div className="space-y-4">
                      
                      {/* Camera Viewfinder Box */}
                      <div className="bg-slate-950 border-2 border-emerald-500/50 rounded-3xl overflow-hidden relative min-h-[260px] flex flex-col items-center justify-center p-3 text-white shadow-xl">
                        
                        {/* Always-mounted video element to prevent null ref */}
                        <div className={`relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden shadow-inner border-2 border-emerald-400/60 bg-black ${cameraActive ? 'block' : 'hidden'}`}>
                          <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            autoPlay
                            playsInline
                            muted
                          />
                          <canvas ref={canvasRef} className="hidden" />

                          {/* Green Target Overlay */}
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-2xl relative animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                              <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                              <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
                              <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] absolute top-1/2 -translate-y-1/2 animate-bounce" />
                            </div>
                          </div>

                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-300 flex items-center gap-1.5 border border-emerald-500/30">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span>QR එක කොටුව තුළට යොමු කරන්න</span>
                          </div>
                        </div>

                        {/* Inactive or Error state */}
                        {!cameraActive && (
                          <div className="text-center p-4 space-y-3 w-full max-w-sm">
                            <div className="w-16 h-16 bg-emerald-950/80 border-2 border-emerald-500/40 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-md">
                              <Camera className="w-8 h-8 animate-pulse" />
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-white">
                                කැමරාව ක්‍රියාත්මක කර QR එක Scan කරන්න
                              </p>
                              <p className="text-xs text-slate-300 mt-1">
                                හෝ ගැලරියෙන් QR පින්තූරයක් තෝරන්න
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => startCamera('environment')}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-700/40 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                              >
                                <Camera className="w-4 h-4" />
                                <span>කැමරාව අරඹන්න (Start Camera)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                              >
                                <Upload className="w-4 h-4 text-emerald-400" />
                                <span>QR Image Upload</span>
                              </button>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </div>

                            {cameraError && (
                              <div className="bg-rose-950/70 border border-rose-600/70 rounded-2xl p-3 text-left space-y-2 mt-3 animate-fadeIn">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                  <p className="text-[11px] text-rose-200 font-bold leading-relaxed">{cameraError}</p>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-800/50">
                                  <button
                                    type="button"
                                    onClick={() => startCamera('environment')}
                                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>නැවත උත්සාහ කරන්න (Retry)</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Controls Toolbar when camera is active */}
                        {cameraActive && (
                          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                            <button
                              type="button"
                              onClick={toggleCameraFacing}
                              className="px-3 py-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                            >
                              <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{cameraFacing === 'environment' ? 'Front Camera' : 'Back Camera'}</span>
                            </button>

                            {isTorchSupported && (
                              <button
                                type="button"
                                onClick={toggleTorch}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 border ${
                                  isTorchOn 
                                    ? 'bg-amber-400 text-amber-950 border-amber-300 font-black shadow-md' 
                                    : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
                                }`}
                              >
                                <Flashlight className="w-3.5 h-3.5" />
                                <span>{isTorchOn ? 'Torch On' : 'Flashlight'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer flex items-center gap-1.5 transition-all"
                            >
                              <Upload className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Upload</span>
                            </button>

                            <button
                              type="button"
                              onClick={stopCamera}
                              className="px-3 py-1.5 bg-rose-900/80 text-rose-200 border border-rose-800 rounded-xl text-xs font-bold hover:bg-rose-800 cursor-pointer transition-all active:scale-95"
                            >
                              නවත්වන්න
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Alternative: Enter 6-Digit Pay Code / NIC / Phone manually */}
                      <div className="bg-slate-50 dark:bg-[#0d2317] border border-slate-200 dark:border-emerald-900/60 rounded-2xl p-4 space-y-2">
                        <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                          🔢 හෝ ලබන්නාගේ 6-ඉලක්කම් Pay Code / දුරකථන / NIC අංකය ඇතුළත් කරන්න:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="උදා: 789021 හෝ 0771234567 හෝ 981234567V"
                            value={manualCodeInput}
                            onChange={(e) => setManualCodeInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                            className="flex-1 px-3 py-2 bg-white dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                          />
                          <button
                            onClick={handleManualLookup}
                            disabled={isSearchingManual}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Search className="w-4 h-4" />
                            <span>සොයන්න</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* STEP 2: Recipient Confirmed -> Enter Amount & Purpose */
                    <div className="space-y-4 animate-fadeIn">
                      
                      {/* Selected Recipient Card */}
                      <div className="bg-emerald-50/80 dark:bg-[#0d261a] border-2 border-emerald-500/60 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm overflow-hidden shrink-0">
                            {recipient.photo ? (
                              <img src={recipient.photo} alt={recipient.name} className="w-full h-full object-cover" />
                            ) : (
                              recipient.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                {recipient.name}
                              </h4>
                              {recipient.verified && (
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                              ID: <span className="font-mono font-bold">{recipient.numericId || 'N/A'}</span>
                              {recipient.phone && ` • ${recipient.phone}`}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setRecipient(null)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-rose-600 bg-white dark:bg-[#081b11] rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          වෙනස් කරන්න
                        </button>
                      </div>

                      {/* Payment Amount Input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                          ගෙවීමට අවශ්‍ය මුදල (LKR):
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">
                            රු.
                          </span>
                          <input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={amountInput}
                            onChange={(e) => setAmountInput(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#07170e] border-2 border-emerald-500/50 rounded-2xl text-lg font-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Quick Amount Pills */}
                      <div className="flex flex-wrap gap-2">
                        {[100, 250, 500, 1000, 2500].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setAmountInput(amt.toString())}
                            className="px-3 py-1 bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                          >
                            + රු. {amt}
                          </button>
                        ))}
                      </div>

                      {/* Payment Purpose Selector */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                          ගෙවීමේ හේතුව / අරමුණ:
                        </label>
                        <select
                          value={purposeInput}
                          onChange={(e) => setPurposeInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="භාණ්ඩ / සේවා ගෙවීම">භාණ්ඩ / සේවා ගෙවීම (Goods/Services)</option>
                          <option value="වෘත්තීය සේවා කුලිය">වෘත්තීය සේවා කුලිය (Professional Fee)</option>
                          <option value="ඉක්මන් සහය ගාස්තුව">ඉක්මන් සහය ගාස්තුව (Quick Service Help)</option>
                          <option value="ප්‍රජා සහන ආධාර">ප්‍රජා සහන ආධාර (Donation/Relief)</option>
                          <option value="වෙනත්">වෙනත් (Other Purpose)</option>
                        </select>
                      </div>

                      {purposeInput === 'වෙනත්' && (
                        <input
                          type="text"
                          placeholder="හේතුව සඳහන් කරන්න..."
                          value={customPurpose}
                          onChange={(e) => setCustomPurpose(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      )}

                      {/* Final Confirm Payment Button */}
                      <div className="pt-2">
                        <button
                          onClick={handleConfirmPayment}
                          disabled={isProcessing || !amountInput || parseFloat(amountInput) <= 0}
                          className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Zap className="w-5 h-5 text-amber-300" />
                              <span>ගෙවීම තහවුරු කර මුදල් යවන්න</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
