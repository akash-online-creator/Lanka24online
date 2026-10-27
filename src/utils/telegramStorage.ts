import { TelegramMediaRecord } from '../types';

export interface TelegramUploadOptions {
  file?: File | Blob;
  fileBase64?: string;
  fileName?: string;
  mimeType?: string;
  mediaType: 'image' | 'video' | 'voice' | 'audio' | 'document';
  caption?: string;
  senderName?: string;
  sourceContext?: string;
}

export interface TelegramUploadResult {
  success: boolean;
  engine?: 'cloudflare_r2' | 'telegram' | 'fallback' | string;
  isR2Stored?: boolean;
  isTelegramStored: boolean;
  isLocalFallback?: boolean;
  url: string; // The URL to view or play the media (either direct CDN, proxy stream or fallback)
  fileKey?: string;
  telegramFileId?: string;
  filePath?: string;
  directUrl?: string;
  directTelegramUrl?: string;
  proxyUrl?: string;
  mediaType: 'image' | 'video' | 'voice' | 'audio' | 'document';
  mimeType?: string;
  fileSize?: number;
  messageId?: number;
  caption?: string;
  createdAt?: string;
  record?: TelegramMediaRecord;
  warning?: string;
}

export interface CloudStorageStatusResponse {
  activeEngine: 'cloudflare_r2' | 'telegram' | 'local_fallback';
  engines: {
    cloudflare_r2: {
      configured: boolean;
      bucket: string;
      publicDomain: string;
      egressCost: string;
      scaleRating: string;
    };
    telegram: {
      configured: boolean;
      hasBotToken: boolean;
      hasChatId: boolean;
      scaleRating: string;
    };
    local_fallback: {
      available: boolean;
      type: string;
    };
  };
  message: string;
}

export type TelegramStatusResponse = CloudStorageStatusResponse;

/**
 * Convert a File or Blob to Base64 string
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as base64 string'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a media item (Video, Voice, Audio, Image) to Telegram via backend proxy
 */
export async function uploadMediaToTelegram(options: TelegramUploadOptions): Promise<TelegramUploadResult> {
  try {
    let base64 = options.fileBase64;
    let mime = options.mimeType;
    let name = options.fileName;

    if (options.file && !base64) {
      base64 = await fileToBase64(options.file);
      if (!mime && options.file.type) {
        mime = options.file.type;
      }
      if (!name && 'name' in options.file) {
        name = (options.file as File).name;
      }
    }

    if (!base64) {
      throw new Error('No media content provided for upload');
    }

    if (!mime) {
      if (options.mediaType === 'video') mime = 'video/mp4';
      else if (options.mediaType === 'voice') mime = 'audio/webm';
      else if (options.mediaType === 'audio') mime = 'audio/mp3';
      else if (options.mediaType === 'image') mime = 'image/jpeg';
      else mime = 'application/octet-stream';
    }

    const payload = {
      fileBase64: base64,
      fileName: name || `media_${Date.now()}`,
      mimeType: mime,
      mediaType: options.mediaType,
      caption: options.caption || '',
      senderName: options.senderName || 'App User',
      sourceContext: options.sourceContext || 'Sahaya Seva',
    };

    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('Storage upload endpoint returned non-200 status, using local fallback');
      const fallbackUrl = base64;
      return {
        success: true,
        engine: 'fallback',
        isR2Stored: false,
        isTelegramStored: false,
        isLocalFallback: true,
        url: fallbackUrl,
        mediaType: options.mediaType,
        mimeType: mime,
        fileSize: options.file?.size,
        warning: 'Backend upload failed, stored locally.',
      };
    }

    const result = await response.json();

    const finalUrl = result.url || result.directUrl || result.proxyUrl || base64;

    const record: TelegramMediaRecord = {
      fileId: result.fileKey || result.fileId || `storage_${Date.now()}`,
      fileType: options.mediaType,
      mimeType: result.mimeType || mime,
      fileSize: result.fileSize || options.file?.size,
      fileName: name,
      messageId: result.messageId,
      proxyUrl: result.proxyUrl,
      directTelegramUrl: result.directUrl || result.directTelegramUrl,
      caption: result.caption,
      createdAt: result.createdAt || new Date().toISOString(),
      senderName: options.senderName,
    };

    return {
      success: true,
      engine: result.engine || (result.isR2Stored ? 'cloudflare_r2' : result.isTelegramStored ? 'telegram' : 'fallback'),
      isR2Stored: Boolean(result.isR2Stored),
      isTelegramStored: Boolean(result.isTelegramStored),
      isLocalFallback: Boolean(result.isLocalFallback),
      url: finalUrl,
      fileKey: result.fileKey,
      telegramFileId: result.fileId,
      filePath: result.filePath,
      directUrl: result.directUrl,
      directTelegramUrl: result.directUrl || result.directTelegramUrl,
      proxyUrl: result.proxyUrl,
      mediaType: options.mediaType,
      mimeType: result.mimeType || mime,
      fileSize: result.fileSize,
      messageId: result.messageId,
      caption: result.caption,
      createdAt: result.createdAt,
      record,
      warning: result.warning,
    };
  } catch (error: any) {
    console.error('Failed to upload media:', error);
    // Graceful fallback to provided base64
    const fallbackUrl = options.fileBase64 || '';
    return {
      success: true,
      engine: 'fallback',
      isR2Stored: false,
      isTelegramStored: false,
      isLocalFallback: true,
      url: fallbackUrl,
      mediaType: options.mediaType,
      mimeType: options.mimeType,
      warning: error.message || 'Upload error, falling back to local storage',
    };
  }
}

/**
 * Universal Cloud Storage Upload alias (Cloudflare R2, Telegram & Fallback)
 */
export const uploadMediaToCloudStorage = uploadMediaToTelegram;

/**
 * Check Storage engine connection and health status
 */
export async function getCloudStorageStatus(): Promise<CloudStorageStatusResponse> {
  try {
    const response = await fetch('/api/storage/status');
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }
    return await response.json();
  } catch (err: any) {
    return {
      activeEngine: 'local_fallback',
      engines: {
        cloudflare_r2: {
          configured: false,
          bucket: '',
          publicDomain: '',
          egressCost: '$0.00',
          scaleRating: 'Million Scale',
        },
        telegram: {
          configured: false,
          hasBotToken: false,
          hasChatId: false,
          scaleRating: 'Up to 50k',
        },
        local_fallback: {
          available: true,
          type: 'Base64 / Firestore Fallback',
        },
      },
      message: err.message || 'Failed to connect to storage service',
    };
  }
}

/**
 * Check Storage Bot connection and stats
 */
export async function getTelegramStatus(): Promise<TelegramStatusResponse> {
  return getCloudStorageStatus();
}

/**
 * Test Telegram bot messaging and channel configuration
 */
export async function testTelegramBot(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/telegram/test', { method: 'POST' });
    const data = await response.json();
    return {
      success: Boolean(data.success),
      message: data.message || (data.success ? 'Test message sent successfully' : 'Test failed'),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to execute test message',
    };
  }
}

/**
 * Fetch media upload logs for Admin
 */
export async function getTelegramMediaLogs(): Promise<{ logs: any[]; totalCount: number }> {
  try {
    const res = await fetch('/api/telegram/logs');
    if (!res.ok) return { logs: [], totalCount: 0 };
    return await res.json();
  } catch {
    return { logs: [], totalCount: 0 };
  }
}
