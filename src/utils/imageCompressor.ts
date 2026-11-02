/**
 * High-performance Client-Side Image Compressor
 * Resizes and compresses image files/base64 strings to stay safely under 200KB,
 * preventing Firestore 1MB document quota overflow and boosting mobile rendering speed.
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default 0.75)
  maxSizeBytes?: number; // default 200 KB (200 * 1024)
}

/**
 * Compresses an image File/Blob into an optimized JPEG Data URL.
 * Robust across mobile browsers (Android WebView, iOS Safari, PWA).
 */
export async function compressImageFile(
  file: File | Blob,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.75,
    maxSizeBytes = 200 * 1024, // 200 KB
  } = options;

  return new Promise((resolve) => {
    // Fallback direct reader if canvas decoding fails
    const fallbackFileReader = () => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const res = e.target?.result;
          resolve(typeof res === 'string' ? res : '');
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      } catch {
        resolve('');
      }
    };

    try {
      let objectUrl = '';
      try {
        objectUrl = URL.createObjectURL(file);
      } catch {
        fallbackFileReader();
        return;
      }

      const img = new Image();
      let isCleanedUp = false;

      const cleanup = () => {
        if (!isCleanedUp && objectUrl) {
          isCleanedUp = true;
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {}
        }
      };

      img.onload = () => {
        cleanup();
        try {
          let { width, height } = img;
          if (!width || !height) {
            fallbackFileReader();
            return;
          }

          // Scale down dimensions proportionally if they exceed max limits
          if (width > maxWidth || height > maxHeight) {
            const widthRatio = maxWidth / width;
            const heightRatio = maxHeight / height;
            const ratio = Math.min(widthRatio, heightRatio);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            fallbackFileReader();
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // White background for transparent PNGs
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Iteratively compress if larger than target size
          let currentQuality = quality;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);

          let attempts = 0;
          while (
            compressedDataUrl.length * 0.75 > maxSizeBytes &&
            currentQuality > 0.4 &&
            attempts < 4
          ) {
            currentQuality -= 0.1;
            compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
            attempts++;
          }

          resolve(compressedDataUrl);
        } catch (err) {
          console.warn('Canvas compression error, falling back:', err);
          fallbackFileReader();
        }
      };

      img.onerror = () => {
        cleanup();
        fallbackFileReader();
      };

      img.src = objectUrl;
    } catch {
      fallbackFileReader();
    }
  });
}

/**
 * Compresses an existing base64 image string to under 200KB.
 */
export async function compressImageBase64(
  base64Str: string,
  options: ImageCompressionOptions = {}
): Promise<string> {
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return base64Str;
  }

  const {
    maxWidth = 1000,
    maxHeight = 1000,
    quality = 0.75,
    maxSizeBytes = 200 * 1024,
  } = options;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onerror = () => resolve(base64Str);
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) return resolve(base64Str);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          let currentQuality = quality;
          let result = canvas.toDataURL('image/jpeg', currentQuality);

          let attempts = 0;
          while (
            result.length * 0.75 > maxSizeBytes &&
            currentQuality > 0.4 &&
            attempts < 3
          ) {
            currentQuality -= 0.1;
            result = canvas.toDataURL('image/jpeg', currentQuality);
            attempts++;
          }

          resolve(result);
        } catch {
          resolve(base64Str);
        }
      };
      img.src = base64Str;
    } catch {
      resolve(base64Str);
    }
  });
}
