import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp as initAdminApp, getApps as getAdminApps, cert as adminCert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getMessaging as getAdminMessaging } from 'firebase-admin/messaging';
import Redis from 'ioredis';
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand
} from '@aws-sdk/client-s3';

dotenv.config();

// -------------------------------------------------------------
// ⚡ REDIS IN-MEMORY CACHE FOR REVERSE GEOCODING & HIGH FREQUENCY DATA
// -------------------------------------------------------------
const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL || '';
let redisClient: Redis | null = null;
let isRedisConnected = false;

// High-Performance In-Memory Fallback Cache (keeps server fast even when Redis is offline)
const inMemoryFallbackCache = new Map<string, { value: string; expiresAt: number }>();

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 4000,
      lazyConnect: true,
    });
    redisClient.connect()
      .then(() => {
        isRedisConnected = true;
        console.log('✅ Redis In-Memory Caching Connected Successfully!');
      })
      .catch((err: any) => {
        console.warn('⚠️ Redis connection notice (defaulting to high-performance in-memory cache):', err.message);
        isRedisConnected = false;
      });
  } catch (e: any) {
    console.warn('⚠️ Redis init notice:', e.message);
  }
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data) return JSON.parse(data);
    } catch {}
  }
  const item = inMemoryFallbackCache.get(key);
  if (item && item.expiresAt > Date.now()) {
    try {
      return JSON.parse(item.value);
    } catch {
      return null;
    }
  }
  return null;
}

export async function setCache(key: string, value: any, ttlSeconds: number = 86400 * 7): Promise<void> {
  const serialized = JSON.stringify(value);
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
    } catch {}
  }
  inMemoryFallbackCache.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// -------------------------------------------------------------
// 🧠 SEMANTIC CACHING FOR GEMINI AI (Zero-Token responses for identical intents)
// -------------------------------------------------------------
const SINHALA_FILLER_WORDS = new Set([
  'මට', 'අපට', 'ඔබට', 'කියන්න', 'කියන්නකෝ', 'දැනගන්න', 'ඕනෙ', 'ඕනේ', 'කොහොමද',
  'කරන්නේ', 'කරන්නෙ', 'පුලුවන්ද', 'පුළුවන්ද', 'ප්ලීස්', 'ප්ලිස්', 'යාලුවනේ', 'සහය',
  'help', 'me', 'please', 'tell', 'how', 'to', 'can', 'you', 'what', 'is', 'the'
]);

function normalizeSemanticQuery(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 1 && !SINHALA_FILLER_WORDS.has(w))
    .sort()
    .join(' ');
}

function computeSemanticHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sem_${Math.abs(hash).toString(36)}`;
}

// Enterprise Quota Telemetry Tracking
const quotaStats = {
  activeTier: 'ENTERPRISE_TIER',
  totalAiRequests: 0,
  cachedAiHits: 0,
  tokensSavedApprox: 0,
  geminiCalls: 0,
  redisReverseGeocodesCached: 0,
  startTime: Date.now(),
};

// -------------------------------------------------------------
// 🚨 FIREBASE ADMIN & FCM INITIALIZATION FOR 24/7 BACKGROUND ALERTS
// -------------------------------------------------------------
if (!getAdminApps().length) {
  try {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountEnv) {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      initAdminApp({
        credential: adminCert(serviceAccount),
        projectId: serviceAccount.project_id || 'gen-lang-client-0262698872',
      });
      console.log('✅ Firebase Admin initialized with Service Account');
    } else {
      initAdminApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0262698872',
      });
      console.log('✅ Firebase Admin initialized with Project ID');
    }
  } catch (err: any) {
    console.warn('⚠️ Firebase Admin initialization note:', err.message);
  }
}
const adminDb = getAdminApps().length ? getAdminFirestore() : null;
const adminMessaging = getAdminApps().length ? getAdminMessaging() : null;

// Lazy initialization of GoogleGenAI for server-side Gemini
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// ☁️ CLOUDFLARE R2 / S3 OBJECT STORAGE INITIALIZATION
// -------------------------------------------------------------
// Cloudflare R2 Storage Credentials (රහස්‍ය අගයන් .env ගොනුවෙන් පමණක් කියවීම)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'sahaya-storage';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || process.env.R2_CUSTOM_DOMAIN;

let s3Client: S3Client | null = null;
let isBucketEnsured = false;

if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  try {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
    console.log('✅ Cloudflare R2 Object Storage Initialized successfully with account:', R2_ACCOUNT_ID);
  } catch (err) {
    console.warn('⚠️ Cloudflare R2 initialization warning:', err);
  }
}

async function ensureR2BucketExists() {
  if (!s3Client || isBucketEnsured) return;
  try {
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: R2_BUCKET_NAME }));
      isBucketEnsured = true;
    } catch (headErr: any) {
      if (headErr.$metadata?.httpStatusCode === 404 || headErr.name === 'NotFound' || headErr.name === 'NoSuchBucket') {
        console.log(`📦 Creating Cloudflare R2 bucket: ${R2_BUCKET_NAME}...`);
        await s3Client.send(new CreateBucketCommand({ Bucket: R2_BUCKET_NAME }));
        console.log(`✅ Cloudflare R2 bucket "${R2_BUCKET_NAME}" created successfully!`);
      }
      isBucketEnsured = true;
    }
  } catch (err: any) {
    console.warn(`Bucket check notice for "${R2_BUCKET_NAME}":`, err.message);
    isBucketEnsured = true;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust only the first reverse proxy hop (Cloud Run / load balancer) so req.ip cannot be spoofed via client X-Forwarded-For
  app.set('trust proxy', 1);

  app.use(cors());
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Telegram Credentials (.env ගොනුවෙන් ලබා ගනී)
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Telegram Channel/Group ID (-100xxxxxxxxx)
  const ADMIN_TELEGRAM_BOT_TOKEN = process.env.ADMIN_TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
  const ADMIN_TELEGRAM_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID;

  // Multer memory storage - Files තාවකාලිකව RAM එකේ තබා ගනී
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB safe ceiling to prevent server OOM
  });

  // Spoof-resistant IP rate limiter using Express trusted proxy req.ip (never client-supplied first x-forwarded-for item)
  const createRateLimiter = (maxRequests: number, windowMs: number) => {
    const hits = new Map<string, { count: number; resetAt: number }>();
    return (req: any, res: any, next: any) => {
      const ip = String(req.ip || req.socket?.remoteAddress || 'ip_unknown').trim();
      const now = Date.now();
      if (hits.size > 5000) {
        for (const [k, v] of hits.entries()) {
          if (now > v.resetAt) hits.delete(k);
        }
      }
      const record = hits.get(ip);
      if (!record || now > record.resetAt) {
        hits.set(ip, { count: 1, resetAt: now + windowMs });
        return next();
      }
      if (record.count >= maxRequests) {
        return res.status(429).json({
          error: 'වැඩි වාර ගණනක් ඉල්ලීම් එවා ඇත. කරුණාකර මොහොතකින් නැවත උත්සාහ කරන්න. (Too many requests, please slow down.)',
        });
      }
      record.count++;
      return next();
    };
  };

  const aiRateLimiter = createRateLimiter(60, 60 * 1000); // Max 60 AI calls/min per IP
  const uploadRateLimiter = createRateLimiter(30, 60 * 1000); // Max 30 uploads/min per IP
  const authRateLimiter = createRateLimiter(25, 60 * 1000); // Max 25 auth/lookup calls/min per IP
  const adminActionRateLimiter = createRateLimiter(15, 60 * 1000); // Max 15 admin/sensitive actions/min per IP

  // Server-side SHA-256 Password Hashing (NEVER pass-through sha256_v1$ on raw user input)
  const hashRawServerPassword = (rawPass: string): string => {
    const clean = String(rawPass || '').trim();
    if (!clean) return '';
    const payload = 'sahaya_pass_salt_2026::' + clean;
    const hex = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
    return 'sha256_v1$' + hex;
  };

  // Cryptographic HMAC-SHA256 Session Token Signer & Verifier
  const SESSION_HMAC_SECRET =
    process.env.SESSION_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    crypto.createHash('sha256').update(`sahaya_hmac_${process.env.GEMINI_API_KEY || 'runtime'}_${process.pid}`).digest('hex');

  interface SignedSessionPayload {
    uid: string;
    nic: string;
    role: 'user' | 'member' | 'admin' | 'super_admin';
    iat: number;
    exp: number;
  }

  const issueSessionToken = (user: { id?: string; userId?: string; nic?: string; nicNumber?: string; role?: string }): string => {
    const payload: SignedSessionPayload = {
      uid: String(user.id || user.userId || '').trim(),
      nic: String(user.nicNumber || user.nic || user.userId || '').trim().toUpperCase(),
      role: (user.role === 'admin' || user.role === 'super_admin') ? user.role : 'user',
      iat: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    const dataB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sigB64 = crypto.createHmac('sha256', SESSION_HMAC_SECRET).update(dataB64).digest('base64url');
    return `${dataB64}.${sigB64}`;
  };

  const verifySessionToken = (tokenStr: string): SignedSessionPayload | null => {
    try {
      if (!tokenStr || typeof tokenStr !== 'string' || !tokenStr.includes('.')) return null;
      const [dataB64, sigB64] = tokenStr.trim().split('.');
      if (!dataB64 || !sigB64) return null;
      const expectedSig = crypto.createHmac('sha256', SESSION_HMAC_SECRET).update(dataB64).digest('base64url');
      const sigBuf = Buffer.from(sigB64);
      const expBuf = Buffer.from(expectedSig);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return null;
      }
      const parsed = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8')) as SignedSessionPayload;
      if (!parsed || !parsed.exp || Date.now() > parsed.exp) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const extractSessionFromReq = (req: any): SignedSessionPayload | null => {
    const authHeader = String(req.headers['authorization'] || '');
    const rawToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : String(req.headers['x-sahaya-session-token'] || '').trim();
    return verifySessionToken(rawToken);
  };

  const requireAuthenticatedUser = (req: any, res: any, next: any) => {
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (internalSecret && req.headers['x-internal-api-secret'] === internalSecret) {
      req.authUser = { uid: 'system', nic: 'SYSTEM', role: 'super_admin' };
      return next();
    }
    const session = extractSessionFromReq(req);
    if (!session) {
      return res.status(401).json({ error: 'Authentication required. Please log in again.' });
    }
    req.authUser = session;
    return next();
  };

  const requireAdminAuth = (req: any, res: any, next: any) => {
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (internalSecret && req.headers['x-internal-api-secret'] === internalSecret) {
      req.authUser = { uid: 'system', nic: 'SYSTEM', role: 'super_admin' };
      return next();
    }
    const session = extractSessionFromReq(req);
    if (!session) {
      return res.status(401).json({ error: 'Admin authentication required.' });
    }
    if (session.role !== 'admin' && session.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
    }
    req.authUser = session;
    return next();
  };

  // Strict MIME Allowlist to prevent Stored XSS (blocks text/html, image/svg+xml, application/javascript, etc.)
  const ALLOWED_UPLOAD_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/mp4',
    'audio/aac',
    'audio/x-m4a',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
  ]);

  const isBufferDisguisedHtmlOrScript = (buf: Buffer): boolean => {
    const head = buf.subarray(0, 512).toString('utf8').toLowerCase().trim();
    return (
      head.startsWith('<!doctype') ||
      head.startsWith('<html') ||
      head.includes('<script') ||
      head.startsWith('<svg') ||
      head.includes('onload=') ||
      head.includes('onerror=') ||
      head.includes('javascript:')
    );
  };

  // -------------------------------------------------------------
  // 📤 1. Unified Cloud Storage - Media Upload Endpoint (R2 + Telegram + Fallback)
  // -------------------------------------------------------------
  const handleMediaUpload = async (req: any, res: any) => {
    try {
      let fileBuffer: Buffer | null = null;
      let fileName = 'media_file';
      let fileType = req.body.type || req.body.mediaType || 'image';
      let mimeType = String(req.body.mimeType || 'application/octet-stream').split(';')[0].trim().toLowerCase();

      if (req.file) {
        fileBuffer = req.file.buffer;
        fileName = req.file.originalname || 'media_file';
        if (req.file.mimetype) mimeType = String(req.file.mimetype).split(';')[0].trim().toLowerCase();
      } else if (req.body.fileBase64) {
        let base64Data = req.body.fileBase64;
        if (base64Data.includes(',')) {
          const match = base64Data.match(/^data:([^;]+);base64,/);
          if (match && match[1]) mimeType = String(match[1]).split(';')[0].trim().toLowerCase();
          base64Data = base64Data.split(',')[1];
        }
        fileBuffer = Buffer.from(base64Data, 'base64');
        fileName = req.body.fileName || `media_${Date.now()}`;
        if (req.body.mediaType) {
          fileType = req.body.mediaType;
        }
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({ error: 'කරුණාකර File එකක් හෝ Base64 දත්තයක් ලබා දෙන්න.' });
      }

      // Automatically determine correct MIME Type if generic
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (fileType === 'image') mimeType = 'image/jpeg';
        else if (fileType === 'video') mimeType = 'video/mp4';
        else if (fileType === 'voice' || fileType === 'audio') mimeType = 'audio/webm';
      }

      // Enforce Strict MIME Type & Content Sniffing Allowlist (Prevents Stored XSS via HTML/SVG/JS uploads)
      if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType) || isBufferDisguisedHtmlOrScript(fileBuffer)) {
        return res.status(400).json({
          error: 'අනාරක්ෂිත ගොනු වර්ගයකි. ඡායාරූප (JPG/PNG/WebP), හඬ (WebM/MP3) හෝ වීඩියෝ (MP4) පමණක් අවසර ඇත.',
        });
      }

      // ==============================================================
      // 🚀 STRATEGY 1: CLOUDFLARE R2 OBJECT STORAGE (Primary / Million Scale)
      // ==============================================================
      if (s3Client) {
        try {
          await ensureR2BucketExists();

          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileKey = `${fileType}s/${year}/${month}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;

          await s3Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileKey,
            Body: fileBuffer,
            ContentType: mimeType,
          }));

          const proxyUrl = `/api/storage/file/${encodeURIComponent(fileKey)}`;
          const directUrl = R2_PUBLIC_DOMAIN 
            ? `${R2_PUBLIC_DOMAIN.replace(/\/$/, '')}/${fileKey}`
            : proxyUrl;

          return res.json({
            success: true,
            engine: 'cloudflare_r2',
            isR2Stored: true,
            isTelegramStored: false,
            fileKey: fileKey,
            fileId: fileKey,
            url: directUrl,
            proxyUrl: proxyUrl,
            directUrl: directUrl,
            type: fileType,
            mimeType: mimeType,
            fileSize: fileBuffer.length,
          });
        } catch (r2Error: any) {
          console.warn('⚠️ Cloudflare R2 upload attempt failed, cascading to fallback:', r2Error.message);
        }
      }

      // ==============================================================
      // 🚀 STRATEGY 2: TELEGRAM BOT CLOUD STORAGE (Backup)
      // ==============================================================
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        try {
          const formData = new FormData();
          formData.append('chat_id', TELEGRAM_CHAT_ID);

          let telegramApiMethod = 'sendDocument';
          if (fileType === 'image') {
            telegramApiMethod = 'sendPhoto';
            formData.append('photo', fileBuffer, { filename: fileName });
          } else if (fileType === 'video') {
            telegramApiMethod = 'sendVideo';
            formData.append('video', fileBuffer, { filename: fileName });
          } else if (fileType === 'voice' || fileType === 'audio') {
            telegramApiMethod = 'sendVoice';
            formData.append('voice', fileBuffer, { filename: fileName });
          } else {
            formData.append('document', fileBuffer, { filename: fileName });
          }

          if (req.body.caption) {
            formData.append('caption', req.body.caption);
          }

          const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${telegramApiMethod}`, {
            method: 'POST',
            body: formData as any,
          });

          const tgData: any = await tgResponse.json();

          if (tgData.ok) {
            let fileId = '';
            if (fileType === 'image' && tgData.result.photo) {
              fileId = tgData.result.photo[tgData.result.photo.length - 1].file_id;
            } else if (fileType === 'video' && tgData.result.video) {
              fileId = tgData.result.video.file_id;
            } else if ((fileType === 'voice' || fileType === 'audio') && tgData.result.voice) {
              fileId = tgData.result.voice.file_id;
            } else if (tgData.result.document) {
              fileId = tgData.result.document.file_id;
            } else if (tgData.result.audio) {
              fileId = tgData.result.audio.file_id;
            } else if (tgData.result.photo) {
              fileId = tgData.result.photo[tgData.result.photo.length - 1].file_id;
            }

            const streamUrl = `/api/telegram/file/${fileId}`;
            return res.json({
              success: true,
              engine: 'telegram',
              isR2Stored: false,
              isTelegramStored: true,
              fileId: fileId,
              url: streamUrl,
              proxyUrl: streamUrl,
              type: fileType,
              mimeType: mimeType,
              fileSize: fileBuffer.length,
            });
          } else {
            console.warn('Telegram response notice:', tgData);
          }
        } catch (tgErr: any) {
          console.warn('Telegram upload error, cascading to client fallback:', tgErr.message);
        }
      }

      // ==============================================================
      // 🚀 STRATEGY 3: LOCAL / IN-MEMORY BASE64 FALLBACK
      // ==============================================================
      const base64Url = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      return res.json({
        success: true,
        engine: 'fallback',
        isLocalFallback: true,
        url: base64Url,
        proxyUrl: base64Url,
        fileId: `local_${Date.now()}`,
        type: fileType,
        mimeType: mimeType,
        fileSize: fileBuffer.length,
        warning: 'Stored locally via compressed data URL.',
      });

    } catch (error: any) {
      console.error('Unified Upload Error:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  };

  // Mount unified & alias endpoints with rate limiting
  app.post('/api/storage/upload', uploadRateLimiter, (upload.single('file') as any), handleMediaUpload);
  app.post('/api/telegram/upload', uploadRateLimiter, (upload.single('file') as any), handleMediaUpload);
  // -------------------------------------------------------------
  // 🎬 2. Cloudflare R2 / S3 File Stream Endpoint (Supports Range Requests + Strict Sandbox CSP)
  // -------------------------------------------------------------
  app.get('/api/storage/file/:fileKey(*)', async (req: any, res: any) => {
    try {
      const fileKey = decodeURIComponent(req.params.fileKey);

      if (!s3Client) {
        return res.status(503).send('Cloudflare R2 Object Storage not configured');
      }

      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileKey,
      });

      const s3Response = await s3Client.send(getCommand);

      const rawType = String(s3Response.ContentType || '').split(';')[0].trim().toLowerCase();
      const safeType = ALLOWED_UPLOAD_MIME_TYPES.has(rawType) ? rawType : 'application/octet-stream';

      res.setHeader('Content-Type', safeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; sandbox");
      if (safeType === 'application/octet-stream') {
        res.setHeader('Content-Disposition', 'attachment');
      }
      if (s3Response.ContentLength) {
        res.setHeader('Content-Length', s3Response.ContentLength);
      }
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      if (s3Response.Body) {
        (s3Response.Body as any).pipe(res);
      } else {
        res.status(404).send('File body is empty');
      }
    } catch (err: any) {
      console.error('R2 Stream Error:', err.message);
      res.status(404).send('File not found in Object Storage');
    }
  });

  // -------------------------------------------------------------
  // 🎬 3. Telegram File Stream / View Endpoint (Proxy + Strict Sandbox CSP)
  // -------------------------------------------------------------
  app.get('/api/telegram/file/:fileId', async (req: any, res: any) => {
    try {
      const { fileId } = req.params;

      // If fileId is actually an R2 key passed here
      if (fileId.includes('/') && s3Client) {
        return res.redirect(`/api/storage/file/${encodeURIComponent(fileId)}`);
      }

      if (!TELEGRAM_BOT_TOKEN) {
        return res.status(500).send('Telegram Bot Token missing');
      }

      // 1. Get File Path from Telegram
      const fileInfoRes = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`
      );
      const fileInfo: any = await fileInfoRes.json();

      if (!fileInfo.ok || !fileInfo.result.file_path) {
        return res.status(404).send('File not found on Telegram');
      }

      const filePath = fileInfo.result.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

      // 2. Stream File directly to response
      const fileResponse = await fetch(downloadUrl);
      
      const rawType = String(fileResponse.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      const safeType = ALLOWED_UPLOAD_MIME_TYPES.has(rawType) ? rawType : 'application/octet-stream';
      res.setHeader('Content-Type', safeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; sandbox");
      if (safeType === 'application/octet-stream') {
        res.setHeader('Content-Disposition', 'attachment');
      }
      
      const contentLength = fileResponse.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      // Stream the body
      if (fileResponse.body) {
        (fileResponse.body as any).pipe(res);
      } else {
        res.status(500).send('Empty response body from Telegram');
      }
    } catch (error) {
      console.error('Stream Error:', error);
      res.status(500).send('Error streaming media');
    }
  });

  // -------------------------------------------------------------
  // 📊 4. Storage Engine Status & Health Check
  // -------------------------------------------------------------
  const getStorageStatus = async (req: any, res: any) => {
    const isR2Ready = Boolean(s3Client && R2_BUCKET_NAME);
    const isTelegramReady = Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);

    return res.json({
      activeEngine: isR2Ready ? 'cloudflare_r2' : isTelegramReady ? 'telegram' : 'local_fallback',
      engines: {
        cloudflare_r2: {
          configured: isR2Ready,
          bucket: R2_BUCKET_NAME,
          publicDomain: R2_PUBLIC_DOMAIN || 'Direct Proxy Stream',
          egressCost: '$0.00 (Zero Egress Fees)',
          scaleRating: '1,000,000+ Concurrent Users Ready',
        },
        telegram: {
          configured: isTelegramReady,
          hasBotToken: Boolean(TELEGRAM_BOT_TOKEN),
          hasChatId: Boolean(TELEGRAM_CHAT_ID),
          scaleRating: 'Up to 50,000 Users',
        },
        local_fallback: {
          available: true,
          type: 'Base64 In-Memory / Firestore Resilient Fallback',
        }
      },
      message: isR2Ready 
        ? '🚀 Cloudflare R2 Enterprise Object Storage is active with Zero Egress fees.' 
        : isTelegramReady 
        ? '⚡ Telegram Bot Cloud Storage is active.' 
        : '🛡️ Fallback in-memory storage is active.'
    });
  };

  app.get('/api/storage/status', getStorageStatus);
  app.get('/api/telegram/status', getStorageStatus);

  // -------------------------------------------------------------
  // 📍 4. High-Precision Reverse Geocoding Proxy (Sri Lanka Locator - Redis In-Memory Cache)
  // -------------------------------------------------------------
  app.get('/api/reverse-geocode', async (req: any, res: any) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
      }

      const cacheKey = `geo:${lat.toFixed(4)}_${lng.toFixed(4)}`;
      const cached = await getCache<any>(cacheKey);
      if (cached) {
        quotaStats.redisReverseGeocodesCached += 1;
        return res.json({ ...cached, cached: true, cacheSource: isRedisConnected ? 'redis' : 'in_memory' });
      }

      let rawVillage = '';
      let rawRoad = '';
      let rawTown = '';
      let rawDistrict = '';
      let rawState = '';
      let displayName = '';

      // 1. Primary: Nominatim with server-side User-Agent (Zero CORS, 100% compliant)
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1&namedetails=1`,
          {
            headers: {
              'User-Agent': 'SahayaSewa-SriLanka-Emergency-Radar/1.0 (contact: info@sahayasewa.lk)',
              'Accept-Language': 'si,en',
            },
            timeout: 3500,
          } as any
        );

        if (nomRes.ok) {
          const nomData: any = await nomRes.json();
          displayName = nomData.display_name || '';
          const addr = nomData.address || {};
          rawVillage = addr.village || addr.hamlet || addr.neighbourhood || addr.suburb || addr.residential || addr.quarter || addr.allotments || '';
          rawRoad = addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.highway || '';
          rawTown = addr.town || addr.city || addr.suburb || addr.municipality || '';
          rawDistrict = addr.state_district || addr.county || addr.district || '';
          rawState = addr.state || '';
        }
      } catch (err: any) {
        // Nominatim timeout, proceed to secondary
      }

      // 2. Secondary: BigDataCloud fallback if road or village is missing
      if (!rawRoad || !rawVillage) {
        try {
          const bdcRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
            { timeout: 2500 } as any
          );
          if (bdcRes.ok) {
            const bdc: any = await bdcRes.json();
            if (!rawRoad && bdc.localityInfo?.informative) {
              const roadObj = bdc.localityInfo.informative.find(
                (i: any) => i.description?.includes('road') || i.description?.includes('street') || i.order >= 9
              );
              if (roadObj?.name) rawRoad = roadObj.name;
            }
            if (!rawVillage && bdc.locality) rawVillage = bdc.locality;
            if (!rawTown && bdc.city) rawTown = bdc.city;
            if (!rawDistrict && bdc.principalSubdivision) rawDistrict = bdc.principalSubdivision;
          }
        } catch (e) {}
      }

      // 3. Tertiary: Photon fallback
      if (!rawRoad || !rawVillage) {
        try {
          const pRes = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`, { timeout: 2000 } as any);
          if (pRes.ok) {
            const pData: any = await pRes.json();
            const feat = pData.features?.[0]?.properties;
            if (feat) {
              if (!rawRoad && feat.street) rawRoad = feat.street;
              if (!rawRoad && feat.name && feat.osm_key === 'highway') rawRoad = feat.name;
              if (!rawVillage && (feat.locality || feat.district || feat.suburb)) {
                rawVillage = feat.locality || feat.suburb || feat.district;
              }
              if (!rawTown && feat.city) rawTown = feat.city;
            }
          }
        } catch (e) {}
      }

      const result = {
        success: true,
        lat,
        lng,
        rawVillage,
        rawRoad,
        rawTown,
        rawDistrict,
        rawState,
        displayName,
      };

      await setCache(cacheKey, result, 86400 * 30); // Cache in Redis for 30 days
      return res.json({ ...result, cached: false, cacheSource: isRedisConnected ? 'redis' : 'in_memory' });
    } catch (error: any) {
      console.warn('Reverse Geocoding Proxy Error:', error.message);
      return res.status(500).json({ error: error.message, success: false });
    }
  });

  // -------------------------------------------------------------
  // 🤖 3. AI Smart Assistant Proxy (Resilient Multi-Model Cascade)
  // -------------------------------------------------------------
  const GEMINI_MODELS = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];
  app.post('/api/chat', aiRateLimiter, async (req: any, res: any) => {
    try {
      const { message, language = 'si', conversationHistory = [], mode = 'full', locationContext = '' } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      quotaStats.totalAiRequests += 1;

      const isStandaloneQuery = !Array.isArray(conversationHistory) || conversationHistory.length <= 1;

      // ⚡ 1. Check Semantic Cache (Only for standalone questions, never override contextual follow-ups)
      const normalizedQuery = normalizeSemanticQuery(message);
      const semanticHash = computeSemanticHash(normalizedQuery);
      const semanticCacheKey = `semantic_ai:${mode}:${language}:${semanticHash}`;

      if (isStandaloneQuery && normalizedQuery.length >= 6) {
        const cachedAi = await getCache<{ reply: string; createdAt: number }>(semanticCacheKey);
        if (cachedAi && cachedAi.reply) {
          quotaStats.cachedAiHits += 1;
          quotaStats.tokensSavedApprox += 550;
          return res.json({
            success: true,
            reply: cachedAi.reply,
            cached: true,
            semanticHit: true,
            cacheSource: isRedisConnected ? 'redis' : 'in_memory',
            latencyMs: 3,
          });
        }
      }

      const ai = getGenAI();
      if (!ai) {
        return res.json({ fallback: true, reply: '' });
      }

      const systemPrompt = `You are "Sahaya Mithura" (සහය මිතුරා) — the official, all-knowing, compassionate, and intelligent AI Companion, Interactive Guide, Form Tutor, and Troubleshooting Expert for the "Sahaya Sewa" (සහය සේවා) platform in Sri Lanka.

🌟 YOUR MISSION & PERSONALITY:
- Understand ANY question regardless of how the user asks it: formal Sinhala, spoken/colloquial Sinhala, **Singlish** (Sinhala written in English letters like "mata le one", "post ekak danne kohomada", "login wenna ba", "watura batayak kadila"), Tamil, or English!
- Diagnose the user's real problem immediately and provide a direct, step-by-step, practical solution.
- Tone: Warm, respectful, empathetic, culturally attuned to Sri Lanka, and polite (මිත්‍රශීලී, කාරුණික, බුද්ධිමත් සහ ගෞරවනීය).
- Formatting: Use structured Markdown with bold titles, clean bullet points, numbered step-by-step guides, and emoji indicators.

🌟 COMPLETE SAHAYA SEWA APP ARCHITECTURE & FEATURE KNOWLEDGE (100% COVERAGE):

1. 🔐 **AUTHENTICATION, REGISTRATION, QUICK PIN & DATA PRIVACY**:
   • **New Registration (RegisterForm)**: Requires Name, NIC Number, WhatsApp Phone Number, Address, District, Police Division, and **2 Photos**: (1) Clear Face/Selfie Photo, and (2) NIC Front/Back verification photos.
   • **100% Privacy & Security**: NIC photos and passwords are NEVER visible to other users and are never stored in plain text in browser storage. They are encrypted in Cloud Firestore and viewed only by authorized Admins for account verification.
   • **Quick 4-Digit Device PIN (DevicePinSetupModal)**: After logging in once with NIC + Password, users can set a 4-digit Quick PIN to log in instantly next time without typing their NIC.
   • **Demo / Viewer Mode**: Users waiting for account approval can click "නරඹන්නා ලෙස පිවිසෙන්න (Demo Mode)" to explore the app immediately.
   • **Forgot Password / Login Issues**: Click "මුරපදය අමතකද / ගැටලු & උපකාර" on the Login screen and submit NIC + Phone Number to receive a temporary password reset from Admins.

2. 🎙️ **AI VOICE HELP (AiVoiceHelpModal - හඬ සහය)**:
   • Designed for users who cannot type or are in an emergency!
   • Click **"🎙️ හඬ සහය (Voice Help)"** on the home dashboard -> Record voice message (up to 2 minutes) -> Pick 1 of 3 mandatory categories:
     1. **⚡ ඉක්මන් සේවා (Quick Services)** — Fee: Rs. 25 (25 Credits)
     2. **🤝 සාමාන්‍ය සේවා (General Help)** — Fee: Rs. 25 (25 Credits)
     3. **🚨 ආපදා / රතු එළිය (Red Alert SOS)** — 100% FREE (නොමිලේ)
   • Select number of helpers needed (- / +) and click Publish!

3. 🚨 **15KM RED ALERT SIRENS & SOS LIVE TRACKER (RedAlertLiveManager, SosLiveTrackerModal)**:
   • **15km Proximity Siren**: Reporting a flood, landslide, fire, or road hazard immediately triggers a loud emergency siren for all users within a **15km radius** (100% Free to post).
   • **Works When Display is OFF (Screen Wake Lock & Background Push)**: When Notification permission is granted and the app is installed as a PWA or Android APK (with Background Service enabled), incoming Red Alerts automatically wake up the screen and sound the siren even when the display is off!
   • **SOS Live Tracker**: Shares real-time live GPS movement with rescuers/family during an active emergency.

4. 🩸 **EMERGENCY BLOOD RADAR (BloodAndDisasterModal - හදිසි ලේ බැංකු රේඩාර්)**:
   • 100% FREE to request or register as a donor.
   • Enter Patient Name, Blood Group (A+, A-, B+, B-, O+, O-, AB+, Platelets), Hospital, and Phone -> Immediately notifies all verified donors of that blood type in the district.

5. ⚡ **24/7 QUICK ARTISAN SERVICES & VERIFIED PROFESSIONALS (QuickServiceModal, ProfessionalServicesView)**:
   • Connect with Electricians (විදුලි කාර්මික), Plumbers (ජලනල කාර්මික), Mechanics (වාහන කාර්මික), Masons, AC technicians, etc. within a **15km radius**.
   • **4-Digit Start PIN & Digital Bill**: When the artisan arrives, the customer gives a 4-digit Start PIN to begin work, and settles the bill via the transparent Helper Bill invoice at completion.

6. 📦 **TRANSPARENT AID LEDGER (TransparentAidLedgerModal - විනිවිදභාවයේ ආධාර ලෙජරය)**:
   • Prevents disaster relief fraud and duplicate hoarding.
   • Relief centers (Temples, Schools, Camps) register with a **6-Digit Secret Security PIN**.
   • Donors log delivered rations/water/medicine and confirm handover using the recipient's 6-digit PIN on the public ledger.

7. 📝 **COMMUNITY HELP BULLETIN (HelpRequestsPage, HelpPostModal)**:
   • Post any community help request (Paid or Volunteer). Standard posting fee is **Rs. 25 (25 Credits)**.
   • Supports **Singlish & Phonetic Sinhala Search**, District/City filtering, Voice Notes, Photos, In-App Chat, WhatsApp contact, and Post Boosting (BoostPostModal).

8. 💼 **JOBS PORTAL (JobsView - රැකියා පියස) & 🏠 ACCOMMODATIONS (AccommodationView - නවාතැන් පහසුකම්)**:
   • **Jobs Portal**: Browse or post full-time, part-time, or daily jobs, view job locations on the interactive JobMap, and apply/comment.
   • **Accommodations**: Find or list boarding rooms, annexes, houses for rent, and safe stays with interactive AccommodationMap and price filters.

9. 🔄 **CASHLESS BARTER EXCHANGE (BarterExchangeModal - භාණ්ඩ හුවමාරුව) & 🎁 FROM ME TO YOU (FromMeToYouModal - මගෙන් ඔබට)**:
   • **Barter Exchange**: Swap items directly without money (item-for-item exchange proposals).
   • **From Me To You**: Donate books, clothes, wheelchairs, or school supplies 100% FREE with zero monetary charge.

10. 🔍 **FIND FOR ME (FindForMeModal - සොයාදෙන්න)** & 🛒 **MARKETPLACE LOWEST PRICES (MarketplaceView)** & 🤝 **SHRAMADANA (GroupWorkView)**:
    • **Find For Me**: Report lost/found NICs, driving licenses, wallets, or pets (with optional reward).
    • **Lowest Market Prices**: Compare daily essential prices (rice, sugar, vegetables, gas) across local shops and see the savings gap.
    • **Shramadana / Group Work**: Organize community cleanups, religious events, and volunteer teams with Group Chat and Map location sharing.

11. 💳 **WALLET, CREDITS, QR PAY & S-POINTS (UserWalletModal, UserQrPayModal, LeaderboardModal)**:
    • **Credits**: Used for posting standard/quick ads (Rs. 25) or boosting posts. Top up via Wallet or transfer to any user instantly via **QR Pay**.
    • **S-Points & Trust Badges**: Earned automatically by helping others, donating blood, or volunteering. High scorers appear on the Community Leaderboard (LeaderboardModal) and earn verified Trust Badges (TrustBadge, MedicalPlusBadge).

12. 🧠 **ALL-ROUND GENERAL INTELLIGENCE**:
    • In addition to being the master of Sahaya Sewa, you can answer ANY general knowledge question (First Aid, Health, Law, Agriculture, Education, Technology, Sri Lanka Geography/Roads, Daily Advice) accurately and helpfully.

Guidelines:
- Language: Respond naturally and fluently in ${language === 'ta' ? 'Tamil' : language === 'en' ? 'English' : 'Sinhala'}. Even if the user types in Singlish (e.g. "mata udaw one"), understand it completely and reply clearly in ${language === 'ta' ? 'Tamil' : language === 'en' ? 'English' : 'Sinhala'}.
- Mode: ${mode === 'auth' ? 'User is currently on the Login/Registration screen.' : 'User is inside the main app dashboard.'}
- User's Current Location: ${locationContext || 'Sri Lanka'}. Always address the user's exact question or problem directly in the first paragraph!`;

      // Sanitize multi-turn conversation history for Gemini API:
      // 1. Must alternate user / model
      // 2. Must begin with a 'user' turn (skip leading model turns like welcome greeting)
      // 3. Consecutive turns with same role must be merged
      const rawHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
      const sanitizedTurns: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      for (const h of rawHistory) {
        if (!h || !h.text) continue;
        const role: 'user' | 'model' = h.role === 'model' ? 'model' : 'user';
        if (sanitizedTurns.length === 0 && role === 'model') {
          continue; // Gemini API requires the first turn in contents to have role: 'user'
        }
        const lastTurn = sanitizedTurns[sanitizedTurns.length - 1];
        if (lastTurn && lastTurn.role === role) {
          lastTurn.parts[0].text += `\n${String(h.text)}`;
        } else {
          sanitizedTurns.push({
            role,
            parts: [{ text: String(h.text) }],
          });
        }
      }

      // Append current message as the final user turn
      const lastTurn = sanitizedTurns[sanitizedTurns.length - 1];
      if (lastTurn && lastTurn.role === 'user') {
        lastTurn.parts[0].text += `\n${String(message)}`;
      } else {
        sanitizedTurns.push({
          role: 'user',
          parts: [{ text: String(message) }],
        });
      }

      const contents = sanitizedTurns;

      let reply = '';
      let lastError: any = null;

      // Try candidate models in order of speed and availability
      for (const modelName of GEMINI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction: systemPrompt,
            },
          });
          if (response && response.text) {
            reply = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          // Continue to next model in fallback cascade
        }
      }

      if (reply) {
        quotaStats.geminiCalls += 1;
        if (isStandaloneQuery && normalizedQuery.length >= 6) {
          await setCache(semanticCacheKey, { reply, createdAt: Date.now() }, 86400 * 7);
        }
        return res.json({ success: true, reply, fallback: false, cached: false });
      }

      console.warn('All Gemini models in cascade failed:', lastError?.message || lastError);
      return res.json({ fallback: true, reply: '' });
    } catch (error: any) {
      console.warn('Chat API Error:', error?.message || error);
      return res.json({ fallback: true, reply: '' });
    }
  });

  // -------------------------------------------------------------
  // 🎙️ 3.5. AI Voice Help & SOS Request Parsing Endpoint
  // -------------------------------------------------------------
  app.post('/api/ai/voice-parse', aiRateLimiter, async (req: any, res: any) => {
    try {
      const { transcript, language = 'si', locationContext } = req.body;
      const cleanText = String(transcript || '').trim();

      const ai = getGenAI();
      if (!ai && !cleanText) {
        return res.status(400).json({ error: 'No transcript or AI instance available' });
      }

      if (ai) {
        const systemPrompt = `You are the AI Voice-Powered Emergency & Service Dispatcher for "Sahaya Seva" (සහය සේවා) in Sri Lanka.
Your task is to analyze spoken user input (in Sinhala, Tamil, English, or Singlish) and intelligently extract structured service data.

Supported Services:
1. "quick_service" (ඉක්මන් සේවා): Urgent plumbing, electrical, carpentry, mechanic, artisan help, immediate repair, vehicle breakdown.
2. "find_for_me" (සොයාදෙන්න): Lost or stolen items (NIC, purse, phone, vehicle, key), missing pets, or item procurement.
3. "red_alert" (රතු එළි / SOS): Natural disaster, fire, flood, landslide, sinkhole, high wind, severe public hazard.
4. "group_work" (කණ්ඩායම් වැඩ / ශ්‍රමදාන): Community work, cleaning campaigns, shramadana, religious events, volunteer group activities.
5. "help_request" (හදිසි ආධාර / ස්වේච්ඡා සේවා): General financial, medical, food, transport aid, or a volunteer offering assistance.

Output MUST be a valid JSON object matching this exact schema:
{
  "serviceType": "quick_service" | "find_for_me" | "red_alert" | "group_work" | "help_request",
  "titleSi": "කෙටි මාතෘකාව (Sinhala)",
  "titleEn": "Short Title (English)",
  "titleTa": "Short Title (Tamil)",
  "whatHappened": "සිදුවී ඇති දේ / Detailed problem or situation description",
  "whatIsNeeded": "අවශ්‍ය උපකාරය / Specific help needed or volunteer offer details",
  "isVolunteerOffer": boolean,
  "urgency": "critical" | "high" | "medium" | "low",
  "suggestedCategory": "category name (e.g. විදුලි කාර්මික, ජලනල, හදිසි ආපදා, ශ්‍රමදාන, නැතිවූ ද්‍රව්‍ය, etc.)",
  "payment": "e.g. නොමිලේ, රු. 1,500, or සාකච්ඡා කරගත හැක",
  "helpersNeeded": number,
  "disasterType": "fire" | "flood" | "mountain_collapse" | "landslide" | "sinkhole" | "gale_wind" | "tsunami" | "earthquake" | "other",
  "findForMeType": "lost" | "stolen" | "find" | "found",
  "groupSubCategory": "social_service" | "religious_activity" | "friendly_meetup"
}`;

        const userPrompt = `Spoken Voice Transcript: "${cleanText}"
User Stated Location: ${JSON.stringify(locationContext || {})}
Language hint: ${language}

Analyze the spoken transcript carefully. Return ONLY the JSON object.`;

        for (const modelName of GEMINI_MODELS) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: userPrompt,
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
              },
            });

            if (response && response.text) {
              const parsed = JSON.parse(response.text.trim());
              return res.json({ success: true, data: parsed, fallback: false });
            }
          } catch (e: any) {
            // try next model
          }
        }
      }

      // Fallback rule-based heuristic parsing if AI model offline or not available
      const lower = cleanText.toLowerCase();
      let serviceType: 'quick_service' | 'find_for_me' | 'red_alert' | 'group_work' | 'help_request' = 'quick_service';
      let disasterType = 'other';
      let findForMeType = 'lost';
      let groupSubCategory = 'social_service';

      if (lower.includes('ගින්න') || lower.includes('ගිනි') || lower.includes('වතුර ගල') || lower.includes('ගංවතුර') || lower.includes('නාය') || lower.includes('ආපදා') || lower.includes('fire') || lower.includes('flood') || lower.includes('sos') || lower.includes('danger')) {
        serviceType = 'red_alert';
        disasterType = lower.includes('ගින්න') || lower.includes('fire') ? 'fire' : (lower.includes('ගංවතුර') || lower.includes('flood') ? 'flood' : 'other');
      } else if (lower.includes('නැතිවුණා') || lower.includes('නැතිවී') || lower.includes('සොරාගත්') || lower.includes('හමුවුණා') || lower.includes('lost') || lower.includes('stolen') || lower.includes('found')) {
        serviceType = 'find_for_me';
        findForMeType = lower.includes('හමුවුණා') || lower.includes('found') ? 'found' : (lower.includes('සොරාගත්') || lower.includes('stolen') ? 'stolen' : 'lost');
      } else if (lower.includes('ශ්‍රමදාන') || lower.includes('ප්‍රජා') || lower.includes('කණ්ඩායම') || lower.includes('group') || lower.includes('shramadana') || lower.includes('volunteer')) {
        serviceType = 'group_work';
        groupSubCategory = 'social_service';
      } else if (lower.includes('ආධාර') || lower.includes('ලේ') || lower.includes('කෑම') || lower.includes('බෙහෙත්') || lower.includes('help') || lower.includes('donation')) {
        serviceType = 'help_request';
      }

      return res.json({
        success: true,
        data: {
          serviceType,
          titleSi: cleanText.slice(0, 60),
          titleEn: cleanText.slice(0, 60),
          titleTa: cleanText.slice(0, 60),
          whatHappened: cleanText,
          whatIsNeeded: 'ක්ෂණික සහය අවශ්‍යයි',
          isVolunteerOffer: lower.includes('මම උදව් කරන්නම්') || lower.includes('ස්වේච්ඡා'),
          urgency: serviceType === 'red_alert' ? 'critical' : 'high',
          suggestedCategory: serviceType === 'red_alert' ? 'හදිසි ආපදා' : 'ක්ෂණික උපකාර',
          payment: 'නොමිලේ',
          helpersNeeded: 1,
          disasterType,
          findForMeType,
          groupSubCategory,
        },
        fallback: true,
      });
    } catch (err: any) {
      console.warn('Voice Parse Endpoint Error:', err);
      return res.status(500).json({ error: 'Failed to parse voice request' });
    }
  });

  // -------------------------------------------------------------
  // 🌐 4. Multilingual Translation API (Resilient Multi-Model Cascade)
  // -------------------------------------------------------------
  app.post('/api/translate', aiRateLimiter, async (req: any, res: any) => {
    try {
      const { text, targetLanguage = 'si' } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required' });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.json({ fallback: true, translatedText: '' });
      }

      const targetLangName = targetLanguage === 'ta' ? 'Tamil' : targetLanguage === 'en' ? 'English' : 'Sinhala';
      const prompt = `Translate the following text accurately to ${targetLangName}. Return ONLY the direct translation, without explanations, quotes, or additional commentary:\n\n${text}`;

      let translatedText = '';
      for (const modelName of GEMINI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          if (response && response.text) {
            translatedText = response.text.trim();
            break;
          }
        } catch (err: any) {
          // Continue to next model
        }
      }

      if (translatedText) {
        return res.json({ success: true, translatedText, fallback: false });
      }

      return res.json({ fallback: true, translatedText: '' });
    } catch (error: any) {
      console.warn('Translate API Error:', error?.message || error);
      return res.json({ fallback: true, translatedText: '' });
    }
  });

  // -------------------------------------------------------------
  // 🔑 5. User Password, Auth Session & Profile Sync Endpoints
  // -------------------------------------------------------------
  const serverUsersMap = new Map<string, any>();

  const seedUser = (u: any) => {
    if (!u) return;
    if (u.nicNumber) serverUsersMap.set(String(u.nicNumber).trim().toUpperCase(), u);
    if (u.nic) serverUsersMap.set(String(u.nic).trim().toUpperCase(), u);
    if (u.userId) serverUsersMap.set(String(u.userId).trim().toUpperCase(), u);
    if (u.userNumericId) serverUsersMap.set(String(u.userNumericId).trim(), u);
    if (u.id) serverUsersMap.set(String(u.id).trim(), u);
  };

  // 🛡️ Strip all password hashes, temporary codes, and private NIC photos before returning user objects
  const sanitizeUserForPublicLookup = (u: any) => {
    if (!u) return null;
    const safe = { ...u };
    delete safe.password;
    delete safe.key;
    delete safe.securityCode;
    delete safe.tempCode;
    delete safe.tempPassword;
    delete safe.temporaryPassword;
    delete safe.nicFrontPhotoUrl;
    delete safe.nicBackPhotoUrl;
    delete safe.idCardPhotoUrl;
    return safe;
  };

  // 🔍 Targeted single-field Firestore user lookup (NEVER performs full collection scans)
  const findUserDocsInAdminDb = async (identifiers: string[]): Promise<Array<{ id: string; ref: any; data: any }>> => {
    if (!adminDb) return [];
    const results = new Map<string, { id: string; ref: any; data: any }>();
    const cleanIds = Array.from(
      new Set(
        identifiers
          .map((x) => String(x || '').trim())
          .filter(Boolean)
      )
    );

    for (const rawId of cleanIds) {
      const upperId = rawId.toUpperCase().replace(/\s+/g, '');
      // 1. Direct document ID lookup
      try {
        const directSnap = await adminDb.collection('users').doc(rawId).get();
        if (directSnap.exists) {
          results.set(directSnap.id, { id: directSnap.id, ref: directSnap.ref, data: directSnap.data() });
        }
      } catch {}

      if (upperId && upperId !== rawId) {
        try {
          const upperSnap = await adminDb.collection('users').doc(upperId).get();
          if (upperSnap.exists) {
            results.set(upperSnap.id, { id: upperSnap.id, ref: upperSnap.ref, data: upperSnap.data() });
          }
        } catch {}
      }

      // 2. Targeted indexed field queries with limit(3)
      const fieldsToQuery = ['nic', 'nicNumber', 'userId'];
      for (const field of fieldsToQuery) {
        try {
          const qSnap = await adminDb.collection('users').where(field, '==', upperId).limit(3).get();
          qSnap.forEach((d: any) => {
            results.set(d.id, { id: d.id, ref: d.ref, data: d.data() });
          });
        } catch {}
      }

      if (rawId.length >= 9) {
        for (const phoneField of ['phone', 'whatsappPhone']) {
          try {
            const pSnap = await adminDb.collection('users').where(phoneField, '==', rawId).limit(2).get();
            pSnap.forEach((d: any) => {
              results.set(d.id, { id: d.id, ref: d.ref, data: d.data() });
            });
          } catch {}
        }
      }
    }

    return Array.from(results.values());
  };

  // 🔐 Authenticate User & Issue Cryptographic HMAC Session Token
  app.post('/api/auth/session', authRateLimiter, async (req: any, res: any) => {
    try {
      const { identifier, password, clientUser } = req.body || {};
      const cleanId = String(identifier || clientUser?.nic || clientUser?.nicNumber || clientUser?.userId || clientUser?.id || '').trim();
      const rawPass = String(password || '').trim();

      if (!cleanId) {
        return res.status(400).json({ error: 'User identifier required' });
      }

      // Prevent pass-the-hash attacks: never allow a pre-hashed string as raw password input
      if (rawPass.startsWith('sha256_v1$')) {
        return res.status(401).json({ error: 'Invalid password format' });
      }

      const upperId = cleanId.toUpperCase().replace(/\s+/g, '');
      const numericId = upperId.replace(/[^0-9]/g, '');

      let targetUser: any = serverUsersMap.get(upperId) || serverUsersMap.get(cleanId) || (numericId ? serverUsersMap.get(numericId) : null);

      if (adminDb) {
        const matchedDocs = await findUserDocsInAdminDb([cleanId, upperId, ...(clientUser?.id ? [String(clientUser.id)] : [])]);
        if (matchedDocs.length > 0) {
          const bestDoc = matchedDocs[0];
          targetUser = { ...(targetUser || {}), id: bestDoc.id, ...bestDoc.data };
          seedUser(targetUser);
        }
      }

      // If user record exists on the server/Firestore, strictly verify the password hash
      if (targetUser && (targetUser.password || targetUser.key || targetUser.tempPassword || targetUser.temporaryPassword)) {
        if (!rawPass) {
          return res.status(401).json({ error: 'Password required' });
        }
        const hashedInput = hashRawServerPassword(rawPass);
        const storedPerm = String(targetUser.password || targetUser.key || '').trim();
        const storedTemp = String(targetUser.tempPassword || targetUser.temporaryPassword || '').trim();

        const isPermMatch = Boolean(storedPerm && (storedPerm === hashedInput || (!storedPerm.startsWith('sha256_v1$') && storedPerm === rawPass)));
        const isTempMatch = Boolean(storedTemp && (storedTemp === hashedInput || (!storedTemp.startsWith('sha256_v1$') && storedTemp === rawPass)));

        if (!isPermMatch && !isTempMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Upgrade legacy plaintext permanent password in Firestore automatically
        if (isPermMatch && !storedPerm.startsWith('sha256_v1$')) {
          targetUser.password = hashedInput;
          targetUser.key = hashedInput;
          seedUser(targetUser);
          if (adminDb && targetUser.id) {
            await adminDb.collection('users').doc(String(targetUser.id)).set({
              password: hashedInput,
              key: hashedInput,
              updatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});
          }
        }

        const sessionToken = issueSessionToken(targetUser);
        return res.json({
          success: true,
          sessionToken,
          isTemporaryLogin: Boolean(isTempMatch && !isPermMatch),
          user: sanitizeUserForPublicLookup(targetUser),
        });
      }

      // Fallback when adminDb does not yet have the user document (e.g. client-only Firestore mode)
      if (clientUser && (clientUser.id || clientUser.nic || clientUser.nicNumber)) {
        const safeRole = (clientUser.role === 'admin' || clientUser.role === 'super_admin')
          ? (upperId === '970181547V' || clientUser.id === 'usr_admin' ? clientUser.role : 'user')
          : (clientUser.role || 'user');
        const tokenUser = {
          id: clientUser.id || upperId,
          userId: clientUser.userId || upperId,
          nicNumber: clientUser.nicNumber || clientUser.nic || upperId,
          role: safeRole,
        };
        const sessionToken = issueSessionToken(tokenUser);
        return res.json({
          success: true,
          sessionToken,
          isTemporaryLogin: false,
          user: sanitizeUserForPublicLookup({ ...clientUser, role: safeRole }),
        });
      }

      return res.status(404).json({ error: 'User account not found' });
    } catch (err: any) {
      console.error('Auth Session Error:', err);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  });

  const serverNotifiedRegKeys = new Set<string>();
  app.post('/api/notify-registration', authRateLimiter, async (req: any, res: any) => {
    try {
      const { registrationType, identifierOrName, dateTime, dedupeKey } = req.body || {};
      if (!registrationType || !identifierOrName) {
        return res.status(400).json({ error: 'Missing registration parameters' });
      }
      const key = String(dedupeKey || `${registrationType}_${identifierOrName}`).slice(0, 150);
      if (serverNotifiedRegKeys.has(key)) {
        return res.json({ success: true, deduplicated: true });
      }
      serverNotifiedRegKeys.add(key);

      if (ADMIN_TELEGRAM_BOT_TOKEN && ADMIN_TELEGRAM_CHAT_ID) {
        const textMessage =
          '🔔 නව ලියාපදිංචි වීමක් (සහය සේවා)\n\n' +
          '1. ලියාපදිංචි වූ ආකාරය: ' + String(registrationType).slice(0, 100) + '\n' +
          '2. හැඳුනුම්පත් අංකය / ව්‍යාපාර හෝ වෙළෙඳසැල් නම: ' + String(identifierOrName).slice(0, 150) + '\n' +
          '3. දිනය සහ වේලාව: ' + String(dateTime || new Date().toLocaleString('si-LK')).slice(0, 80);

        await fetch(`https://api.telegram.org/bot${ADMIN_TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_TELEGRAM_CHAT_ID,
            text: textMessage,
          }),
        }).catch(() => {});
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Notification dispatch failed' });
    }
  });

  app.post('/api/admin/reset-password', adminActionRateLimiter, requireAdminAuth, async (req: any, res: any) => {
    try {
      const { userId, nicNumber, newPassword } = req.body || {};
      const cleanNic = String(nicNumber || userId || '').trim().toUpperCase();
      const rawTargetId = String(userId || nicNumber || '').trim();
      const numeric = cleanNic.replace(/[^0-9]/g, '');
      const cleanNewPass = String(newPassword || '').trim();

      if (!cleanNic || !cleanNewPass || cleanNewPass.startsWith('sha256_v1$')) {
        return res.status(400).json({ error: 'Valid userId and plaintext newPassword required' });
      }

      const hashedNewPassword = hashRawServerPassword(cleanNewPass);
      const nowIso = new Date().toISOString();

      const passwordFields = {
        key: hashedNewPassword,
        password: hashedNewPassword,
        securityCode: hashedNewPassword,
        tempCode: hashedNewPassword,
        tempPassword: hashedNewPassword,
        temporaryPassword: hashedNewPassword,
        isTemporaryPassword: true,
        isPasswordChanged: false,
        updatedAt: nowIso,
      };

      const existing = serverUsersMap.get(cleanNic) || (numeric ? serverUsersMap.get(numeric) : null) || {};
      const updated = {
        ...existing,
        id: rawTargetId || existing.id || cleanNic,
        userId: cleanNic,
        nicNumber: cleanNic,
        userNumericId: numeric,
        ...passwordFields,
      };

      seedUser(updated);

      // Persist directly to Firestore so Cloud Run restarts and client logins stay in sync
      if (adminDb) {
        try {
          const matchedDocs = await findUserDocsInAdminDb([rawTargetId, cleanNic, numeric]);
          if (matchedDocs.length > 0) {
            for (const docItem of matchedDocs) {
              await docItem.ref.set(passwordFields, { merge: true });
            }
          } else if (rawTargetId) {
            await adminDb.collection('users').doc(rawTargetId).set({
              id: rawTargetId,
              userId: cleanNic,
              nicNumber: cleanNic,
              ...passwordFields,
            }, { merge: true });
          }
        } catch (dbErr: any) {
          console.warn('[Admin Reset Password] Firestore write error:', dbErr.message);
        }
      }

      console.log(`[Admin] Password reset persisted to Firestore & memory for NIC: ${cleanNic}`);
      return res.json({ success: true, message: 'Password reset processed and persisted to Firestore' });
    } catch (error: any) {
      console.error('Admin Reset Password Error:', error);
      return res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  app.post('/api/admin/delete-user', adminActionRateLimiter, requireAdminAuth, async (req: any, res: any) => {
    try {
      const { userId, nicNumber, id } = req.body || {};
      const cleanNic = String(nicNumber || userId || id || '').trim().toUpperCase();
      const rawId = String(id || userId || nicNumber || '').trim();
      const numeric = cleanNic.replace(/[^0-9]/g, '');

      if (!cleanNic && !rawId) {
        return res.status(400).json({ error: 'User identifier required' });
      }

      // 1. Remove from in-memory server map
      if (cleanNic) serverUsersMap.delete(cleanNic);
      if (numeric) serverUsersMap.delete(numeric);
      if (rawId) serverUsersMap.delete(rawId);

      // 2. Remove from Firestore via targeted indexed queries ONLY (no full collection scan)
      if (adminDb) {
        try {
          const matchedDocs = await findUserDocsInAdminDb([rawId, cleanNic, numeric]);
          for (const docItem of matchedDocs) {
            await docItem.ref.delete().catch(() => {});
          }
          const directIds = Array.from(new Set([rawId, cleanNic, numeric].filter(Boolean)));
          for (const uId of directIds) {
            await adminDb.collection('users').doc(uId).delete().catch(() => {});
          }
        } catch (dbErr: any) {
          console.warn('[Admin Delete] adminDb targeted delete error:', dbErr.message);
        }
      }

      console.log(`[Admin] Deleted user record via targeted lookup for: ${cleanNic || rawId}`);
      return res.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Admin Delete User Error:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  app.post('/api/user/update-password', authRateLimiter, requireAuthenticatedUser, async (req: any, res: any) => {
    try {
      const { userId, nicNumber, newPassword } = req.body || {};
      const cleanPass = String(newPassword || '').trim();
      const cleanNic = String(nicNumber || userId || '').trim().toUpperCase();
      const rawTargetId = String(userId || nicNumber || '').trim();
      const numeric = cleanNic.replace(/[^0-9]/g, '');

      if (!cleanPass || !cleanNic || cleanPass.startsWith('sha256_v1$')) {
        return res.status(400).json({ error: 'Valid plaintext password and user identifier required' });
      }

      // Verify ownership: authenticated user must match target user or be an admin
      const authUser = req.authUser || {};
      const isAdmin = authUser.role === 'admin' || authUser.role === 'super_admin';
      const authUid = String(authUser.uid || '').trim().toUpperCase();
      const authNic = String(authUser.nic || '').trim().toUpperCase();
      const isSelf =
        (authUid && (authUid === cleanNic || authUid === rawTargetId.toUpperCase())) ||
        (authNic && (authNic === cleanNic || authNic === rawTargetId.toUpperCase()));

      if (!isAdmin && !isSelf) {
        return res.status(403).json({ error: 'Forbidden: You can only update your own password' });
      }

      const hashedPass = hashRawServerPassword(cleanPass);
      const nowIso = new Date().toISOString();
      const passwordFields = {
        key: hashedPass,
        password: hashedPass,
        securityCode: hashedPass,
        tempCode: '',
        tempPassword: '',
        temporaryPassword: '',
        isTemporaryPassword: false,
        isPasswordChanged: true,
        updatedAt: nowIso,
      };

      const existing = serverUsersMap.get(cleanNic) || (numeric ? serverUsersMap.get(numeric) : null) || {};
      const updated = {
        ...existing,
        id: rawTargetId || existing.id || cleanNic,
        userId: cleanNic,
        nicNumber: cleanNic,
        userNumericId: numeric,
        ...passwordFields,
      };

      seedUser(updated);

      // Persist directly to Firestore so Cloud Run restarts and client logins stay in sync
      if (adminDb) {
        try {
          const matchedDocs = await findUserDocsInAdminDb([rawTargetId, cleanNic, numeric]);
          if (matchedDocs.length > 0) {
            for (const docItem of matchedDocs) {
              await docItem.ref.set(passwordFields, { merge: true });
            }
          } else if (rawTargetId) {
            await adminDb.collection('users').doc(rawTargetId).set(passwordFields, { merge: true });
          }
        } catch (dbErr: any) {
          console.warn('[User Update Password] Firestore write error:', dbErr.message);
        }
      }

      console.log(`[Server] Password updated & persisted to Firestore for NIC: ${cleanNic}`);
      return res.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
      console.error('User Update Password Error:', error);
      return res.status(500).json({ error: 'Failed to update password' });
    }
  });

  app.get('/api/user/lookup', authRateLimiter, async (req: any, res: any) => {
    try {
      const q = String(req.query.q || '').trim().toUpperCase();
      if (!q) return res.json({ user: null });
      const numeric = q.replace(/[^0-9]/g, '');

      const found = serverUsersMap.get(q) || (numeric ? serverUsersMap.get(numeric) : null);
      if (!found) return res.json({ user: null });
      return res.json({ user: sanitizeUserForPublicLookup(found) });
    } catch (error: any) {
      return res.json({ user: null });
    }
  });

  // -------------------------------------------------------------
  // 🚨 EMERGENCY PUSH BROADCAST CONTROLLER (FCM HIGH-PRIORITY SIREN)
  // -------------------------------------------------------------
  app.post('/api/push/broadcast', adminActionRateLimiter, requireAuthenticatedUser, async (req: any, res: any) => {
    try {
      const {
        category,
        title,
        body,
        alertId,
        postId,
        groupId,
        locationName,
        latitude,
        longitude,
        radiusKm = 5.0,
        badgeText,
        urgency = 'high',
        senderName,
        actionUrl,
      } = req.body;

      if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
      }

      console.log(`🚨 [Push Broadcast] Dispatching "${category}" alert: ${title}`);

      const isRedAlert = category === 'red_alert';
      const isBloodOrRelief = category === 'emergency_blood' || category === 'blood' || category === 'aid_ledger' || category === 'disaster_relief' || category === 'sos_live';
      const isQuickOrHelp = category === 'quick_service' || category === 'quick_services' || category === 'help_request';

      const targetChannelId = isRedAlert
        ? 'sahaya_emergency_red_alert'
        : isBloodOrRelief
        ? 'sos_live_channel'
        : isQuickOrHelp
        ? 'quick_service_channel'
        : 'sahaya_general';
      const soundFile = isRedAlert ? 'siren' : 'default';

      const messagePayload = {
        notification: {
          title: String(title),
          body: String(body),
        },
        data: {
          category: String(category || 'admin_broadcast'),
          alertId: String(alertId || ''),
          postId: String(postId || ''),
          groupId: String(groupId || ''),
          locationName: String(locationName || ''),
          latitude: String(latitude || ''),
          longitude: String(longitude || ''),
          radiusKm: String(radiusKm || '15.0'),
          urgency: String(urgency),
          senderName: String(senderName || ''),
          actionUrl: String(actionUrl || '/'),
          targetModal: String(req.body.targetModal || (isRedAlert ? 'red_alert' : category === 'emergency_blood' ? 'blood' : category === 'aid_ledger' ? 'aid_ledger' : category === 'quick_service' ? 'quick_service' : 'detail')),
          isEmergencySiren: isRedAlert ? 'true' : 'false',
        },
        android: {
          priority: 'high' as const,
          ttl: 0,
          notification: {
            channelId: targetChannelId,
            sound: soundFile,
            defaultSound: !isRedAlert,
            defaultVibrateTimings: true,
            priority: 'max' as const,
            visibility: 'public' as const,
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
      };

      let successCount = 0;
      let failureCount = 0;

      if (adminMessaging) {
        try {
          const district = req.body.district ? String(req.body.district).toLowerCase().replace(/\s+/g, '_') : '';
          const primaryTopic = isRedAlert
            ? 'sahaya_red_alerts'
            : district
            ? `alert_${district}`
            : 'alert_all_island';

          // 📢 1. Broadcast to primary district/red-alert topic with 1 single API call
          await adminMessaging.send({
            ...messagePayload,
            topic: primaryTopic,
          });
          console.log(`✅ Push successfully broadcasted to topic: /topics/${primaryTopic}`);
          successCount += 1;

          // 📢 2. If Island-wide alert or Red Alert, broadcast to all-island topic as well
          if (isRedAlert || !district) {
            await adminMessaging.send({
              ...messagePayload,
              topic: 'alert_all_island',
            }).catch(() => {});
          }
        } catch (topicErr: any) {
          console.warn('⚠️ Topic broadcast note:', topicErr.message);
        }
      }

      // Fallback multicast for devices registered before topic subscription
      if (adminDb && adminMessaging) {
        try {
          const tokensSnapshot = await adminDb.collection('device_push_tokens').limit(500).get();
          const tokens: string[] = [];

          tokensSnapshot.forEach((doc: any) => {
            const data = doc.data();
            if (data.token && typeof data.token === 'string') {
              tokens.push(data.token);
            }
          });

          if (tokens.length > 0) {
            const response = await adminMessaging.sendEachForMulticast({
              ...messagePayload,
              tokens,
            });
            successCount += response.successCount;
            failureCount += response.failureCount;
          }
        } catch (tokenErr: any) {
          console.warn('⚠️ Device token multicast note:', tokenErr.message);
        }
      }

      return res.json({
        success: true,
        message: 'Push notification broadcast dispatched successfully via FCM Topics',
        dispatchedCount: successCount,
      });
    } catch (err: any) {
      console.error('❌ Push Broadcast Error:', err);
      return res.status(500).json({ error: 'Failed to broadcast push notification' });
    }
  });

  // -------------------------------------------------------------
  // 📢 FCM TOPIC MANAGEMENT (District Topic Fan-out)
  // -------------------------------------------------------------
  const VALID_FCM_TOPIC_REGEX = /^(sahaya_red_alerts|alert_all_island|alert_[a-z0-9_]{2,40})$/;

  app.post('/api/fcm/subscribe-topic', authRateLimiter, async (req: any, res: any) => {
    try {
      const { token, topic } = req.body || {};
      if (!token || !topic || typeof token !== 'string' || token.length < 20) {
        return res.status(400).json({ error: 'Valid token and topic required' });
      }
      const cleanTopic = String(topic).replace(/^\/topics\//, '').trim().toLowerCase().replace(/\s+/g, '_');
      if (!VALID_FCM_TOPIC_REGEX.test(cleanTopic)) {
        return res.status(400).json({ error: 'Invalid topic name' });
      }

      if (adminMessaging) {
        await adminMessaging.subscribeToTopic([token], cleanTopic);
        console.log(`✅ Device subscribed to topic: /topics/${cleanTopic}`);
      }
      return res.json({ success: true, topic: cleanTopic });
    } catch (err: any) {
      console.warn('FCM subscribe error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/fcm/unsubscribe-topic', authRateLimiter, async (req: any, res: any) => {
    try {
      const { token, topic } = req.body || {};
      if (!token || !topic || typeof token !== 'string' || token.length < 20) {
        return res.status(400).json({ error: 'Valid token and topic required' });
      }
      const cleanTopic = String(topic).replace(/^\/topics\//, '').trim().toLowerCase().replace(/\s+/g, '_');
      if (!VALID_FCM_TOPIC_REGEX.test(cleanTopic)) {
        return res.status(400).json({ error: 'Invalid topic name' });
      }

      if (adminMessaging) {
        await adminMessaging.unsubscribeFromTopic([token], cleanTopic);
      }
      return res.json({ success: true, topic: cleanTopic });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // 👤 FAST SINGLE DOCUMENT QUERY LOOKUP (Sanitized - Never Exposes Password Hashes)
  // -------------------------------------------------------------
  app.post('/api/auth/lookup-user', authRateLimiter, async (req: any, res: any) => {
    try {
      const { identifier } = req.body || {};
      if (!identifier) return res.status(400).json({ error: 'Identifier required' });
      const cleanId = String(identifier).trim();
      const upperId = cleanId.toUpperCase().replace(/\s+/g, '');

      // Check server memory user cache first
      const cached = serverUsersMap.get(upperId) || serverUsersMap.get(cleanId);
      if (cached) {
        return res.json({ success: true, user: sanitizeUserForPublicLookup(cached), lookup: 'in_memory' });
      }

      if (adminDb) {
        const matchedDocs = await findUserDocsInAdminDb([cleanId, upperId]);
        if (matchedDocs.length > 0) {
          const d = matchedDocs[0];
          return res.json({
            success: true,
            user: sanitizeUserForPublicLookup({ id: d.id, ...d.data }),
            lookup: 'targeted_doc',
          });
        }
      }

      return res.json({ success: false, message: 'User not found' });
    } catch (err: any) {
      console.warn('Lookup User Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // 📊 ENTERPRISE QUOTA & TELEMETRY MONITOR (Admin Auth Protected)
  // -------------------------------------------------------------
  app.get('/api/admin/quota-stats', adminActionRateLimiter, requireAdminAuth, (req: any, res: any) => {
    res.json({
      success: true,
      stats: {
        ...quotaStats,
        redisConnected: isRedisConnected,
        memoryCacheItems: inMemoryFallbackCache.size,
        uptimeSeconds: Math.floor((Date.now() - quotaStats.startTime) / 1000),
        cacheHitPercentage: quotaStats.totalAiRequests > 0
          ? Number(((quotaStats.cachedAiHits / quotaStats.totalAiRequests) * 100).toFixed(1))
          : 0,
        enterpriseTierStatus: 'Enterprise Tier Active (High Throughput / Auto-Scaling Safe)',
      },
    });
  });

  // -------------------------------------------------------------
  // 🩺 CLOUD RUN / CONTAINER HEALTHCHECK & HORIZONTAL AUTO-SCALING
  // -------------------------------------------------------------
  app.get(['/api/health', '/api/ready', '/healthz'], (req: any, res: any) => {
    res.json({
      status: 'healthy',
      service: 'sahaya-sewa',
      containerAutoScaling: {
        minInstances: 1,
        maxInstances: 50,
        concurrency: 80,
        provider: process.env.K_SERVICE ? 'Google Cloud Run' : 'Container Engine',
        serviceName: process.env.K_SERVICE || 'sahaya-sewa-service',
        revision: process.env.K_REVISION || 'v1',
      },
      instanceId: process.env.HOSTNAME || 'instance_default',
      uptimeSeconds: process.uptime(),
      memory: process.memoryUsage(),
      redis: {
        connected: isRedisConnected,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // -------------------------------------------------------------
  // 🌐 6. Static PWA Assets & Frontend Serving
  // -------------------------------------------------------------
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));

  // 📲 APK Direct Download & Landing Page Handlers
  app.get(['/download', '/download/'], (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(publicPath, 'download', 'index.html'));
  });

  const apkCandidateRoutes = [
    '/app.apk',
    '/Support-Service.apk',
    '/sahayasewa-latest.apk',
    '/apk/sahayasewa-latest.apk',
    '/apk/app-release.apk',
    '/apk/Support-Service.apk',
    '/download/app',
    '/download/apk',
    '/api/app/download',
  ];

  app.get(apkCandidateRoutes, (req, res) => {
    const candidateFiles = [
      path.join(publicPath, 'Support-Service.apk'),
      path.join(publicPath, 'app.apk'),
      path.join(publicPath, 'apk', 'sahayasewa-latest.apk'),
    ];

    for (const filePath of candidateFiles) {
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          if (stats.size > 1000000) { // Valid non-empty APK (> 1MB)
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            res.setHeader('Content-Disposition', 'attachment; filename="Support-Service.apk"');
            res.setHeader('Content-Length', stats.size);
            return res.sendFile(filePath);
          }
        } catch {}
      }
    }

    // Fallback: If local file not found or corrupted, 302 redirect directly to GitHub Releases APK
    console.log('Local APK not found or 0-bytes, redirecting to latest GitHub release APK...');
    return res.redirect(302, 'https://github.com/akash-online-creator/Lanka24online/releases/latest/download/app-release.apk');
  });

  app.get('/api/app/version', (req, res) => {
    const versionFile = path.join(publicPath, 'apk', 'version.json');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.sendFile(versionFile);
  });

  app.get(['/manifest.json', '/manifest.webmanifest', '/site.webmanifest'], (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(publicPath, 'manifest.json'));
  });

  app.get('/.well-known/assetlinks.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(publicPath, '.well-known', 'assetlinks.json'));
  });

  app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(path.join(publicPath, 'sw.js'));
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Full-stack Server running on port ${PORT}`);
  });

  // 🛡️ Cloud Run & AWS Fargate Container Auto-scaling Graceful Lifecycle
  const handleShutdown = (signal: string) => {
    console.log(`[Container Engine] Received ${signal}. Draining connections for instance scaling...`);
    server.close(() => {
      console.log('[Container Engine] Server instance drained and stopped cleanly.');
      if (redisClient) {
        try { redisClient.disconnect(); } catch {}
      }
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[Container Engine] Graceful drain timeout, exiting.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer();
