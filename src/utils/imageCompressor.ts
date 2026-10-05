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

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Image reader returned empty result'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down dimensions proportionally if they exceed max limits
          if (width > maxWidth || height > maxHeight) {
            const widthRatio = maxWidth / width;
            const heightRatio = maxHeight / height;
            const ratio = Math.min(widthRatio, heightRatio);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            resolve(dataUrl); // fallback
            return;
          }

          // Use high quality image smoothing to prevent blurry downscaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fill white background in case of transparent PNGs
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Iteratively compress if larger than target size
          let currentQuality = quality;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);

          // If still larger than maxSizeBytes, step down quality slightly
          let attempts = 0;
          while (compressedDataUrl.length * 0.75 > maxSizeBytes && currentQuality > 0.5 && attempts < 3) {
            currentQuality -= 0.1;
            compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
            attempts++;
          }

          resolve(compressedDataUrl);
        } catch (err) {
          console.warn('Image compression fallback:', err);
          resolve(dataUrl);
        }
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
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
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(base64Str);
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
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

        const result = canvas.toDataURL('image/jpeg', quality);
        resolve(result);
      } catch {
        resolve(base64Str);
      }
    };
    img.src = base64Str;
  });
}
