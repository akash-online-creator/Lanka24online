import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Check, X, FlipHorizontal, AlertTriangle, ShieldCheck } from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  title?: string;
  guideText?: string;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'ජාතික හැඳුනුම්පත සජීවීව ඡායාරූපගත කරන්න',
  guideText = 'හැඳුනුම්පත පහත රාමුව තුළ කෙළින් සහ පැහැදිලිව තබා ඡායාරූපය ලබාගන්න.',
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream safely
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start camera stream
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setCameraError(null);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('මෙම උපාංගයේ සජීවී කැමරා තාක්ෂණය සඳහා සහය නොදක්වයි.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Live camera access error:', err);
      setCameraError(
        'කැමරාව විවෘත කිරීමට නොහැකි විය. කරුණාකර Browser Settings වෙතින් Camera Permission ලබාදෙන්න.'
      );
    }
  }, [stopStream]);

  // Manage camera on modal open / close
  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      startCamera(facingMode);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, startCamera, stopStream]);

  // Capture frame from video element
  const handleSnap = async () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      // Draw the video frame
      ctx.drawImage(video, 0, 0, width, height);

      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.92);

      // Compress photo for performance & storage
      let finalDataUrl = rawDataUrl;
      try {
        const res = await fetch(rawDataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'live_nic_capture.jpg', { type: 'image/jpeg' });
        finalDataUrl = await compressImageFile(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.85,
        });
      } catch (e) {
        console.warn('Compression notice:', e);
      }

      setCapturedPhoto(finalDataUrl);
      stopStream();
    } catch (e: any) {
      console.error('Snap error:', e);
      setCameraError('ඡායාරූපය ලබාගැනීමේදී දෝෂයක් හටගැනිණි.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  // Confirm and use captured photo
  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      onClose();
    }
  };

  // Switch between front and rear cameras
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Handle fallback native camera file input
  const handleNativeCameraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.85,
        });
        setCapturedPhoto(compressed);
        stopStream();
      } catch (err) {
        console.warn('Native camera capture error:', err);
      }
    }
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-emerald-500 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700/80 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">{title}</h3>
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> සජීවී කැමරා සත්‍යාපනය (Live Camera Only)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-700/80 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Body */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[380px]">
          {capturedPhoto ? (
            /* Preview of Captured Photo */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-3">
              <img
                src={capturedPhoto}
                alt="Captured NIC"
                className="max-h-[55vh] w-auto max-w-full rounded-2xl border-2 border-emerald-400 object-contain shadow-xl"
              />
              <div className="mt-3 bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-emerald-300 text-xs font-semibold text-center">
                ✨ ඡායාරූපය සාර්ථකව ලබාගන්නා ලදී. හැඳුනුම්පත් අංකය සහ නම පැහැදිලිව කියවිය හැකිදැයි පරීක්ෂා කරන්න.
              </div>
            </div>
          ) : cameraError ? (
            /* Error / Permission fallback */
            <div className="p-6 text-center space-y-4 max-w-sm">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {cameraError}
              </p>
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>දුරකථන කැමරාවෙන් ඡායාරූපය ගන්න</span>
                </button>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  නැවත උත්සාහ කරන්න (Retry)
                </button>
              </div>
            </div>
          ) : (
            /* Live Camera Stream with ID Card Frame Overlay */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover min-h-[320px]"
              />

              {/* ID Card Guiding Box Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div className="relative w-full max-w-[340px] aspect-[1.586/1] border-2 border-emerald-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                  {/* Card Corner Accents */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  {/* Center Hint Label */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-black/60 backdrop-blur-sm text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-500/40">
                      🪪 හැඳුනුම්පත මෙම රාමුව තුළ තබන්න
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-slate-200 text-xs font-medium text-center drop-shadow-md px-2 max-w-xs">
                  {guideText}
                </p>
              </div>

              {/* Switch Camera Button (Rear / Front) */}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="absolute top-3 right-3 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
                title="කැමරාව මාරු කරන්න"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Hidden Native Camera Input (Forces Camera ONLY - NO Gallery allowed) */}
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
          onChange={handleNativeCameraChange}
        />

        {/* Footer Actions */}
        <div className="bg-slate-800/90 px-4 py-3.5 border-t border-slate-700/80 flex items-center justify-between gap-3">
          {capturedPhoto ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>නැවත ගන්න (Retake)</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>මෙම ඡායාරූපය භාවිත කරන්න</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                අවලංගු කරන්න
              </button>

              <button
                type="button"
                onClick={handleSnap}
                disabled={isCapturing || Boolean(cameraError)}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50 transition-all cursor-pointer active:scale-95"
              >
                <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
                <span>ඡායාරූපය ලබාගන්න (Capture)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
