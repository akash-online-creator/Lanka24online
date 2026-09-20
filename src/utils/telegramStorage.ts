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
  isTelegramStored: boolean;
  isLocalFallback?: boolean;
  url: string; // The URL to view or play the media (either proxy stream or fallback)
  telegramFileId?: string;
  filePath?: string;
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

export interface TelegramStatusResponse {
  configured: boolean;
  bot?: {
    id: number;
    name: string;
    username: string;
    canJoinGroups?: boolean;
  } | null;
  chat?: {
    id: string | number;
    title: string;
    type?: string;
  } | null;
  totalStoredMedia: number;
  stats: {
    videos: number;
    voices: number;
    images: number;
  };
  message: string;
}

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

    const response = await fetch('/api/telegram/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('Telegram upload endpoint returned non-200 status, using local fallback');
      const fallbackUrl = base64;
      return {
        success: true,
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

    const finalUrl = result.proxyUrl || base64;

    const record: TelegramMediaRecord = {
      fileId: result.telegramFileId || `local_${Date.now()}`,
      fileType: options.mediaType,
      mimeType: result.mimeType || mime,
      fileSize: result.fileSize || options.file?.size,
      fileName: name,
      messageId: result.messageId,
      proxyUrl: result.proxyUrl,
      directTelegramUrl: result.directTelegramUrl,
      caption: result.caption,
      createdAt: result.createdAt || new Date().toISOString(),
      senderName: options.senderName,
    };

    return {
      success: true,
      isTelegramStored: Boolean(result.isTelegramStored),
      isLocalFallback: Boolean(result.isLocalFallback),
      url: finalUrl,
      telegramFileId: result.telegramFileId,
      filePath: result.filePath,
      directTelegramUrl: result.directTelegramUrl,
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
    console.error('Failed to upload media to Telegram:', error);
    // Graceful fallback to provided base64
    const fallbackUrl = options.fileBase64 || '';
    return {
      success: true,
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
 * Check Telegram Bot connection and stats
 */
export async function getTelegramStatus(): Promise<TelegramStatusResponse> {
  try {
    const response = await fetch('/api/telegram/status');
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }
    return await response.json();
  } catch (err: any) {
    return {
      configured: false,
      bot: null,
      chat: null,
      totalStoredMedia: 0,
      stats: { videos: 0, voices: 0, images: 0 },
      message: err.message || 'Failed to connect to Telegram service',
    };
  }
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
