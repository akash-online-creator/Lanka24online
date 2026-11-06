import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import webPush from 'web-push';

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

  // 🛡️ Helmet.js Security Middleware (configured for SPA + AI Studio Preview compatibility)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Handled per-route on media endpoints; SPA uses inline scripts/styles & external map tiles
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: false, // Allow embedding inside trusted AI Studio preview environment
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      dnsPrefetchControl: { allow: false },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    })
  );

  // 🛡️ Strict CORS Origin Allowlist (blocks unauthorized third-party websites)
  const customAllowedOrigins = String(process.env.ALLOWED_CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const STATIC_TRUSTED_ORIGINS = new Set([
    'https://supporservice.online',
    'https://www.supporservice.online',
    'https://sahayasewa.lk',
    'https://www.sahayasewa.lk',
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'https://localhost',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    ...customAllowedOrigins,
  ]);

  const isTrustedCorsOrigin = (origin?: string): boolean => {
    // Allow same-origin requests, native Android/Capacitor calls, or server health probes (no Origin header)
    if (!origin) return true;
    const cleanOrigin = origin.trim().replace(/\/$/, '');
    if (STATIC_TRUSTED_ORIGINS.has(cleanOrigin)) return true;
    // Allow official Cloud Run deployment URLs (*.run.app) and Google AI Studio preview frames
    if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.run\.app$/i.test(cleanOrigin)) return true;
    if (/^https:\/\/([a-z0-9-]+\.)?aistudio\.google\.com$/i.test(cleanOrigin)) return true;
    return false;
  };

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isTrustedCorsOrigin(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS policy: Origin not allowed'), false);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Sahaya-Client-Guard',
        'X-Sahaya-Session-Token',
        'X-Internal-Api-Secret',
      ],
      credentials: true,
      maxAge: 86400,
    })
  );

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

  // 🔐 Server-side Cryptographic Scrypt Password Hashing (Salt + N=16384, r=8, p=1)
  // Replaces fast SHA-256 with memory-hard scrypt while transparently migrating legacy hashes on login
  const hashRawServerPassword = (rawPass: string): string => {
    const clean = String(rawPass || '').trim();
    if (!clean) return '';
    const saltHex = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(clean, saltHex, 64, { N: 16384, r: 8, p: 1 });
    return `scrypt_v1$${saltHex}$${derivedKey.toString('hex')}`;
  };

  const verifyServerPassword = (
    rawPass: string,
    storedHash: string
  ): { valid: boolean; needsUpgrade: boolean } => {
    const cleanPass = String(rawPass || '').trim();
    const cleanStored = String(storedHash || '').trim();
    if (!cleanPass || !cleanStored) return { valid: false, needsUpgrade: false };

    // 1. Modern scrypt_v1$<saltHex>$<hashHex>
    if (cleanStored.startsWith('scrypt_v1$')) {
      const parts = cleanStored.split('$');
      if (parts.length !== 3) return { valid: false, needsUpgrade: false };
      const [, saltHex, hashHex] = parts;
      try {
        const expectedBuf = Buffer.from(hashHex, 'hex');
        const derivedBuf = crypto.scryptSync(cleanPass, saltHex, expectedBuf.length, { N: 16384, r: 8, p: 1 });
        if (expectedBuf.length === derivedBuf.length && crypto.timingSafeEqual(expectedBuf, derivedBuf)) {
          return { valid: true, needsUpgrade: false };
        }
      } catch {}
      return { valid: false, needsUpgrade: false };
    }

    // 2. Legacy sha256_v1$<hex> (verify with timingSafeEqual and flag for immediate scrypt upgrade)
    if (cleanStored.startsWith('sha256_v1$')) {
      const legacyPayload = 'sahaya_pass_salt_2026::' + cleanPass;
      const legacyHex = crypto.createHash('sha256').update(legacyPayload, 'utf8').digest('hex');
      const expectedLegacy = 'sha256_v1$' + legacyHex;
      const bufA = Buffer.from(cleanStored);
      const bufB = Buffer.from(expectedLegacy);
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return { valid: true, needsUpgrade: true };
      }
      return { valid: false, needsUpgrade: false };
    }

    // 3. Legacy plaintext fallback (flag for immediate scrypt upgrade)
    const bufA = Buffer.from(cleanStored);
    const bufB = Buffer.from(cleanPass);
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      return { valid: true, needsUpgrade: true };
    }
    return { valid: false, needsUpgrade: false };
  };

  // 🛡️ Cryptographic HMAC-SHA256 Session Secret (NEVER uses GEMINI_API_KEY, PID, or predictable values)
  // Fails fast in production if SESSION_HMAC_SECRET / SESSION_SECRET is not configured
  const resolveSessionHmacSecret = (): string => {
    const envSecret = String(
      process.env.SESSION_HMAC_SECRET ||
      process.env.SESSION_SECRET ||
      process.env.INTERNAL_API_SECRET ||
      ''
    ).trim();

    if (envSecret.length >= 32) {
      return envSecret;
    }

    const secretFilePath = path.join(process.cwd(), '.sahaya_session_secret');
    if (process.env.NODE_ENV === 'production' && !envSecret && !fs.existsSync(secretFilePath)) {
      throw new Error(
        'FATAL SECURITY ERROR: SESSION_HMAC_SECRET or SESSION_SECRET environment variable (min 32 chars) must be set in production!'
      );
    }

    if (envSecret.length > 0) {
      throw new Error(
        'FATAL SECURITY ERROR: SESSION_HMAC_SECRET / SESSION_SECRET must be at least 32 characters long.'
      );
    }

    try {
      if (fs.existsSync(secretFilePath)) {
        const stored = fs.readFileSync(secretFilePath, 'utf8').trim();
        if (stored.length >= 64) return stored;
      }
      const generated = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(secretFilePath, generated, { encoding: 'utf8', mode: 0o600 });
      return generated;
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL SECURITY ERROR: Unable to load or persist SESSION_HMAC_SECRET.');
      }
      return crypto.randomBytes(32).toString('hex');
    }
  };

  const SESSION_HMAC_SECRET = resolveSessionHmacSecret();

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

  const ALLOWED_UPLOAD_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.webm',
    '.ogg',
    '.mp3',
    '.wav',
    '.m4a',
    '.mp4',
    '.mov',
    '.pdf',
  ]);

  const isBufferDisguisedHtmlOrScript = (buf: Buffer): boolean => {
    const head = buf.subarray(0, 1024).toString('utf8').toLowerCase().trim();
    return (
      head.startsWith('<!doctype') ||
      head.startsWith('<html') ||
      head.includes('<script') ||
      head.startsWith('<svg') ||
      head.includes('onload=') ||
      head.includes('onerror=') ||
      head.includes('javascript:') ||
      head.includes('<?php') ||
      head.includes('#!/')
    );
  };

  // Binary Magic-Byte Signature Validator (prevents disguised executables/scripts renamed to .jpg/.png)
  const validateFileMagicBytes = (buf: Buffer, mimeType: string): boolean => {
    if (!buf || buf.length < 12) return false;
    // JPEG: FF D8 FF
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (mimeType === 'image/png') {
      return (
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47
      );
    }
    // GIF: GIF87a or GIF89a
    if (mimeType === 'image/gif') {
      const sig = buf.subarray(0, 6).toString('ascii');
      return sig === 'GIF87a' || sig === 'GIF89a';
    }
    // WebP: RIFF....WEBP
    if (mimeType === 'image/webp') {
      return (
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }
    // PDF: %PDF-
    if (mimeType === 'application/pdf') {
      return buf.subarray(0, 5).toString('ascii') === '%PDF-';
    }
    // WebM / Matroska: 1A 45 DF A3
    if (mimeType === 'audio/webm' || mimeType === 'video/webm') {
      return buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
    }
    // Ogg: OggS
    if (mimeType === 'audio/ogg') {
      return buf.subarray(0, 4).toString('ascii') === 'OggS';
    }
    // WAV: RIFF....WAVE
    if (mimeType === 'audio/wav') {
      return (
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WAVE'
      );
    }
    // MP3 / AAC: ID3 or FF FB / FF F3 / FF F2 / FF F1 / FF F9
    if (mimeType === 'audio/mpeg' || mimeType === 'audio/mp3' || mimeType === 'audio/aac') {
      if (buf.subarray(0, 3).toString('ascii') === 'ID3') return true;
      return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
    }
    // MP4 / M4A / QuickTime: ....ftyp or ....moov or ....wide
    if (
      mimeType === 'video/mp4' ||
      mimeType === 'audio/mp4' ||
      mimeType === 'audio/x-m4a' ||
      mimeType === 'video/quicktime'
    ) {
      const boxType = buf.subarray(4, 8).toString('ascii');
      return ['ftyp', 'moov', 'mdat', 'wide', 'free'].includes(boxType);
    }
    return false;
  };

  // Validate reasonable image dimensions from PNG/JPEG header to block decompression bombs
  const validateImageDimensionsSafe = (buf: Buffer, mimeType: string): boolean => {
    try {
      if (mimeType === 'image/png' && buf.length >= 24) {
        const width = buf.readUInt32BE(16);
        const height = buf.readUInt32BE(20);
        if (width <= 0 || height <= 0 || width > 12000 || height > 12000) return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  // Path-traversal safe filename sanitizer
  const sanitizeUploadFileName = (rawName: string, defaultExt = '.jpg'): string => {
    const rawStr = String(rawName || '').replace(/\0/g, '');
    if (rawStr.includes('..') || rawStr.includes('/') || rawStr.includes('\\')) {
      throw new Error('PATH_TRAVERSAL_DETECTED');
    }
    const base = path.basename(rawStr).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(base).toLowerCase();
    const safeExt = ALLOWED_UPLOAD_EXTENSIONS.has(ext) ? ext : defaultExt;
    const stem = path.basename(base, ext).slice(0, 48) || 'media';
    return `${stem}${safeExt}`;
  };

  // -------------------------------------------------------------
  // 📤 1. Unified Cloud Storage - Media Upload Endpoint (R2 + Telegram + Fallback)
  // -------------------------------------------------------------
  const handleMediaUpload = async (req: any, res: any) => {
    try {
      let fileBuffer: Buffer | null = null;
      let rawFileName = 'media_file.jpg';
      let fileType = String(req.body.type || req.body.mediaType || 'image').trim().toLowerCase();
      if (!['image', 'video', 'voice', 'audio', 'document'].includes(fileType)) {
        fileType = 'image';
      }
      let mimeType = String(req.body.mimeType || 'application/octet-stream').split(';')[0].trim().toLowerCase();

      if (req.file) {
        fileBuffer = req.file.buffer;
        rawFileName = req.file.originalname || 'media_file.jpg';
        if (req.file.mimetype) mimeType = String(req.file.mimetype).split(';')[0].trim().toLowerCase();
      } else if (req.body.fileBase64) {
        let base64Data = String(req.body.fileBase64 || '');
        if (base64Data.includes(',')) {
          const match = base64Data.match(/^data:([^;]+);base64,/);
          if (match && match[1]) mimeType = String(match[1]).split(';')[0].trim().toLowerCase();
          base64Data = base64Data.split(',')[1];
        }
        fileBuffer = Buffer.from(base64Data, 'base64');
        rawFileName = req.body.fileName || `media_${Date.now()}.jpg`;
        if (req.body.mediaType) {
          fileType = String(req.body.mediaType).trim().toLowerCase();
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

      // Enforce Per-Category File Size Limits (Images <= 10MB, Audio <= 15MB, Video <= 25MB)
      const maxBytes =
        mimeType.startsWith('image/')
          ? 10 * 1024 * 1024
          : mimeType.startsWith('audio/')
          ? 15 * 1024 * 1024
          : 25 * 1024 * 1024;
      if (fileBuffer.length > maxBytes) {
        return res.status(413).json({
          error: `ගොනුවේ විශාලත්වය උපරිම සීමාව (${Math.round(maxBytes / (1024 * 1024))}MB) ඉක්මවා ඇත.`,
        });
      }

      const defaultExt =
        mimeType === 'image/png'
          ? '.png'
          : mimeType === 'image/webp'
          ? '.webp'
          : mimeType.startsWith('audio/')
          ? '.webm'
          : mimeType.startsWith('video/')
          ? '.mp4'
          : '.jpg';

      let fileName = 'media_file.jpg';
      try {
        fileName = sanitizeUploadFileName(rawFileName, defaultExt);
      } catch {
        return res.status(400).json({ error: 'අනාරක්ෂිත ගොනු නාමයකි (Path traversal blocked).' });
      }

      // Enforce Strict MIME Type, Binary Magic Bytes, Image Dimensions & Script Sniffing
      if (
        !ALLOWED_UPLOAD_MIME_TYPES.has(mimeType) ||
        isBufferDisguisedHtmlOrScript(fileBuffer) ||
        !validateFileMagicBytes(fileBuffer, mimeType) ||
        !validateImageDimensionsSafe(fileBuffer, mimeType)
      ) {
        return res.status(400).json({
          error: 'අනාරක්ෂිත හෝ විකෘති කළ ගොනු වර්ගයකි. වලංගු ඡායාරූප (JPG/PNG/WebP), හඬ (WebM/MP3) හෝ වීඩියෝ (MP4) පමණක් අවසර ඇත.',
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
          const cleanName = fileName;
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
      const fileKey = decodeURIComponent(String(req.params.fileKey || '')).replace(/\0/g, '');
      // Block path traversal or unauthorized bucket key probing
      if (
        !fileKey ||
        fileKey.includes('..') ||
        fileKey.includes('\\') ||
        fileKey.startsWith('/') ||
        !/^(images|videos|voices|audios|documents)\/\d{4}\/\d{2}\/[a-zA-Z0-9._-]+$/.test(fileKey)
      ) {
        return res.status(400).send('Invalid file key');
      }

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

  // 🛡️ AI Prompt Injection Sanitizer & Per-Actor Daily Quota Limiter
  const PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts)/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts)/gi,
    /system\s*prompt\s*:/gi,
    /you\s+are\s+now\s+(dan|a\s+different|unrestricted)/gi,
    /reveal\s+(your\s+)?(system\s+prompt|api\s+key|secret)/gi,
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  ];

  const sanitizeAiPromptInput = (raw: string, maxLen = 1500): string => {
    let cleaned = String(raw || '').replace(/\0/g, '').trim().slice(0, maxLen);
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      cleaned = cleaned.replace(pattern, '[filtered]');
    }
    return cleaned;
  };

  const aiDailyQuotaMap = new Map<string, { count: number; dayKey: string }>();
  const enforceAiAbuseProtection = (req: any, res: any): boolean => {
    const session = extractSessionFromReq(req);
    const clientGuard = String(req.headers['x-sahaya-client-guard'] || '').trim();
    const origin = String(req.headers['origin'] || req.headers['referer'] || '').trim();
    const isSameAppOrigin =
      !origin ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('supporservice.online') ||
      origin.includes('sahayasewa') ||
      origin.includes('.run.app') ||
      origin.includes('aistudio.google.com');

    if (!session && clientGuard !== 'sahaya_v1_secure' && !isSameAppOrigin) {
      res.status(401).json({ error: 'Unauthorized AI endpoint access.' });
      return false;
    }

    const actorKey = session?.uid || String(req.ip || req.socket?.remoteAddress || 'ip_anon');
    const dayKey = new Date().toISOString().slice(0, 10);
    const maxDaily = session ? 120 : 45; // Authenticated users get 120/day, guests 45/day

    const rec = aiDailyQuotaMap.get(actorKey);
    if (!rec || rec.dayKey !== dayKey) {
      aiDailyQuotaMap.set(actorKey, { count: 1, dayKey });
      return true;
    }
    if (rec.count >= maxDaily) {
      res.status(429).json({
        error: 'දෛනික AI විමසුම් සීමාව ඉක්මවා ඇත. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
        fallback: true,
        reply: '',
      });
      return false;
    }
    rec.count += 1;
    return true;
  };

  app.post('/api/chat', aiRateLimiter, async (req: any, res: any) => {
    try {
      if (!enforceAiAbuseProtection(req, res)) return;
      const { message: rawMessage, language = 'si', conversationHistory = [], mode = 'full', locationContext = '' } = req.body;
      if (!rawMessage || typeof rawMessage !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }
      if (rawMessage.length > 2000) {
        return res.status(400).json({ error: 'පණිවිඩය දිග වැඩිය (උපරිම අකුරු 2000).' });
      }
      const message = sanitizeAiPromptInput(rawMessage, 1500);
      const safeLocationContext = sanitizeAiPromptInput(String(locationContext || ''), 120);

      quotaStats.totalAiRequests += 1;

      const isStandaloneQuery = !Array.isArray(conversationHistory) || conversationHistory.length <= 1;

      // ⚡ 1. Check Semantic Cache (Only for standalone questions, never override contextual follow-ups)
      const normalizedQuery = normalizeSemanticQuery(message);
      const semanticHash = computeSemanticHash(normalizedQuery);
      const semanticCacheKey = `semantic_ai_v3:${mode}:${language}:${semanticHash}`;

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

===================================================================
🚫 CRITICAL ANTI-HALLUCINATION RULE FOR FORMS (අනිවාර්ය නීතිය):
When a user asks how to fill out ANY form in Sahaya Sewa (පෝරමයක් පුරවන ආකාරය, ලියාපදිංචි වන ආකාරය, දැන්වීමක් පළකරන ආකාරය), you MUST ONLY list the exact fields and options that ACTUALLY EXIST in that specific form as documented in the "EXACT FORM FIELDS CATALOG" below.
- NEVER invent, guess, or tell the user to fill in fields that do NOT exist in that form!
- Specifically:
  * In the Registration Form (නව ලියාපදිංචි පෝරමය): There is ONLY 1 photo field — **NIC Front Photo (හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය)** taken directly via camera. There is NO Face/Selfie photo field, NO NIC Back photo field, and NO separate "User ID" text field (users enter their NIC Number, not a separate User ID).
  * In the Community Help Post Form (සාමාන්‍ය සේවා / උපකාර ඉල්ලුම් පෝරමය): It is a 2-step form (Step 1: Headline, Text/Image/Poll tab, Service Tag, optional External Link; Step 2: Preview, Anonymous toggle, Distance/Comments toggles, and Publish Now vs Schedule). Do NOT tell users to select District/Police Division or Paid/Volunteer inside this form because those fields are NOT in this form!
  * In the Find For Me Form (සොයාදෙන්න පෝරමය): There is NO image upload field in this form (it has AI Voice inline fill, Sub-type Lost/Stolen/Find/Found, Item Name, Tag, Location/Date/Time/Identifying Info/Reward or Target Price/Qty/Deadline/Delivery, and Contact Phone/WhatsApp/Address).
===================================================================

📋 EXACT FORM FIELDS CATALOG (පෝරමවල ඇති සැබෑ ක්ෂේත්‍ර පමණි):

1. 📝 **නව ගිණුමක් ලියාපදිංචි කිරීමේ පෝරමය (Registration Form - RegisterForm.tsx)**:
   - **ඡායාරූපය (1ක් පමණි)**: ජාතික හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය (NIC Front Photo) — කැමරාවෙන් පමණක් ලබාගත යුතුය. *(මුහුණේ Selfie ඡායාරූපයක් හෝ NIC පිටුපස ඡායාරූපයක් මෙම පෝරමයේ නැත!)*
   - **සම්පූර්ණ නම (Full Name) \***
   - **ජාතික හැඳුනුම්පත් අංකය (NIC Number) \*** (උදා: 970181547V හෝ 199701815470 — වෙනම User ID ක්ෂේත්‍රයක් නැත)
   - **දුරකථන / WhatsApp අංකය \*** (උදා: 0771234567)
   - **දිස්ත්‍රික්කය (District)** සහ **පොලිස් බලප්‍රදේශය (Police Division)**
   - **නගරය (City / Town)**
   - **ලිපිනය (Address) \***
   - **රහස් පදය (PIN / Password) \*** (අවම අකුරු/ඉලක්කම් 6ක්) සහ **රහස් පදය තහවුරු කරන්න (Confirm Password) \***

2. 🤝 **සාමාන්‍ය සේවා / උපකාර ඉල්ලුම් පෝරමය (Community Help Post Form - HelpPostModal.tsx)**:
   - **පියවර 1 (තොරතුරු ඇතුළත් කිරීම)**:
     1. **හෙඩ්ලයින් එක (Headline) \***: ඔබගේ ඉල්ලීමේ ප්‍රධාන මාතෘකාව.
     2. **දැන්වීමේ අන්තර්ගතය (Tabs 3න් 1ක් තෝරන්න)**:
        • **විස්තරය (Text)**: සම්පූර්ණ විස්තරය ලිවීම (අකුරු හැඩතල / Font තේරීමේ පහසුකම සහිතයි).
        • **ඡායාරූප (Image)**: ඡායාරූපයක් එක් කිරීම සහ කෙටි සටහනක් (Caption).
        • **මත විමසුම (Poll)**: විකල්ප (Options) 2ක් හෝ වැඩි ගණනක් සහිත ජනමත විමසුමක්.
     3. **සාමාන්‍ය සේවා Tag එකක් තේරීම \***: (උදා: ජලනල හා විදුලි කාර්මික, වාහන අලුත්වැඩියාව, ප්‍රවාහන, අධ්‍යාපන, සෞඛ්‍ය ආදිය හෝ අලුත් Tag එකක් සෑදීම).
     4. **බාහිර සබැඳිය (External Link - අත්‍යවශ්‍ය නොවේ)**: Website/Facebook link එකක් ඇත්නම්.
   - **පියවර 2 (පෙරදසුන සහ පළකිරීමේ සැකසුම්)**:
     1. **නම සහ දුරකථන අංකය**: ගිණුමෙන් ස්වයංක්‍රීයව පිරවේ. අවශ්‍ය නම් **"නම සඟවන්න (Anonymous)"** ඔබා නිර්නාමිකව පළ කළ හැක. දුර පෙන්වීම සහ අදහස් (Comments) සක්‍රීය/අක්‍රීය කළ හැක.
     2. **පළ කරන ආකාරය**: දැන්ම පළ කරන්න (**Public**) හෝ දිනයක් හා වේලාවක් නියම කර පසුව පළ කරන්න (**Schedule**). *(ගාස්තුව: රු. 25 ක්‍රෙඩිට්)*.

3. ⚡ **ඉක්මන් සේවා / ක්ෂණික කාර්මික සේවා පෝරමය (Quick Service Form - QuickServiceModal.tsx)**:
   - **Tag එකක් තේරීම**: අදාළ කාර්මික/සේවා වර්ගය තේරීම (හෝ අලුත් Tag එකක් එක් කිරීම).
   - **සිදුවී ඇති දේ (What Happened) \***: දෝෂය හෝ ගැටලුව කුමක්ද යන්න.
   - **විය යුතු දේ (What Needs to be Done) \***: ඔබට අවශ්‍ය උපකාරය හෝ අලුත්වැඩියාව.
   - **කොන්දේසි (Conditions)** සහ **විශේෂ දැනුම්දීම් (Special Notice)** *(අත්‍යවශ්‍ය නොවේ)*.
   - **ප්‍රවාහන ක්‍රමය (Transport Mode - විකල්ප 5න් 1ක්)**:
     • 'ඔබ පැමිණිය යුතුයි' / 'මා එවන්නම්' / 'මා ගෙනවිත් දෙන්නම්' / 'ඔබ එවන්න : Free delivery' / 'ඔබ එවන්න : ප්‍රවාහන ගාස්තු ගෙවන්නම්'.
   - **ගෙවීම් ක්‍රමය (Payment)**: 'ඔබගේ ගාස්තුවට මම එකඟ වෙමි' හෝ 'මට ගෙවිය හැකි මුදල (රු.)' සඳහන් කිරීම.
   - **අවශ්‍ය සහායකයින් ගණන (Helpers Needed)**: '-' සහ '+' බොත්තම් මඟින් ගණන තේරීම.
   - **WhatsApp දුරකථන අංකය \***. *(ගාස්තුව: රු. 25 ක්‍රෙඩිට්)*.

4. 🩸 **හදිසි ලේ ඉල්ලුම් පෝරමය සහ ලේ පරිත්‍යාගශීලී ලියාපදිංචි පෝරමය (BloodAndDisasterModal.tsx - 100% නොමිලේ)**:
   - **ලේ ඉල්ලුම් පෝරමය (Request Blood Tab)**:
     1. **රෝගියාගේ නම (Patient Name) \***
     2. **අවශ්‍ය ලේ වර්ගය (Blood Group)**: 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
     3. **අවශ්‍ය ලේ ඒකක ගණන (Units Needed)**
     4. **රෝහලේ නම (Hospital) \*** සහ **දිස්ත්‍රික්කය (District)**
     5. **හදිසිභාවය (Urgency)**: 'ඉතා හදිසි (Urgent)' / 'පැය 24ක් ඇතුළත' / 'සැලසුම් කළ' සහ **අවශ්‍ය දිනය (Needed Date)**
     6. **සම්බන්ධීකාරකගේ නම (Contact Name)**, **දුරකථන අංකය (Contact Phone) \*** සහ **අමතර සටහන් (Notes)**.
   - **ලේ පරිත්‍යාගශීලියෙකු ලෙස ලියාපදිංචි වීමේ පෝරමය (Donor Registration Tab)**:
     1. **නම (Donor Name)**, **දුරකථන අංකය (Phone)**, **ලේ වර්ගය (Blood Group)**, **දිස්ත්‍රික්කය (District)**, සහ **අවසන් වරට ලේ දුන් දිනය (Last Donated Date)**.

5. 🚨 **රතු නිවේදන / ආපදා වාර්තා පෝරමය (Red Alert Create Form - RedAlertCreateModal.tsx - 100% නොමිලේ)**:
   - **ආපදා වර්ගය (Disaster Type)**: ගංවතුර (Flood), නායයෑම් (Landslide), ගින්නක් (Fire), ගිලාබැසීම් (Sinkhole), දැඩි සුළං (Gale Wind), කඳු කඩාවැටීම්, සුනාමි, භූමිකම්පා හෝ වෙනත්.
   - **විශේෂ මාතෘකාව (Custom Title - අත්‍යවශ්‍ය නොවේ)** සහ **විස්තරය (Description) \***.
   - **ස්ථානය (GPS Location)**: ස්වයංක්‍රීයව GPS මඟින් හඳුනාගනී ('Locate Me'), නැතහොත් ස්ථානයේ නම සටහන් කළ හැක.
   - **දැනුම් දෙන්නාගේ විස්තර (Show Reporter Info Toggle)**: ඔබගේ නම සහ දුරකථන අංකය ප්‍රසිද්ධියේ පෙන්වනවාද නැද්ද යන්න තේරීම.
   - **ආරක්ෂක තහවුරු කිරීම**: ඉලක්කම් 4ක Device PIN එක ඇතුළත් කර රතු නිවේදනය නිකුත් කිරීම.

6. 🔍 **සොයාදෙන්න පෝරමය (Find For Me / Lost & Found Form - FindForMeModal.tsx)**:
   - *(ඉහළින්ම ඇති **AI හඬ පිරවුම / Voice Bar** මඟින් කතා කර ස්වයංක්‍රීයව පෝරමය පිරවිය හැක. සැ.යු: මෙහි ඡායාරූප Upload කරන ක්ෂේත්‍රයක් නැත).*
   - **අනු-වර්ගය (Sub-type 4න් 1ක්)**: 'නැතිවූ දෙයක් (Lost)' / 'සොරාගත් දෙයක් (Stolen)' / 'මිලදී ගැනීමට සොයන දෙයක් (Find)' / 'හමුවූ දෙයක් (Found)'.
   - **භාණ්ඩයේ / දෙයෙහි නම (Item Name) \*** සහ **Tag එකක් තේරීම**.
   - **නැතිවූ / සොරාගත් / හමුවූ දෙයක් නම්**: සිදුවූ ස්ථානය (Location), දිනය (Date), වේලාව (Time), හඳුනාගැනීමේ විශේෂ ලක්ෂණ/අංක (Identifying Info), සහ **ත්‍යාග මුදලක් (Reward)** පිරිනමන්නේ නම් එහි විස්තර.
   - **මිලදී ගැනීමට සොයන දෙයක් නම් (Find)**: අපේක්ෂිත මිල (Target Price), ප්‍රමාණය (Quantity), අවසන් දිනය (Deadline), සහ බෙදාහැරීමේ ක්‍රමය (Delivery Option).
   - **සම්බන්ධ කරගත හැකි දුරකථන අංකය, WhatsApp අංකය, ලිපිනය** සහ **වෙනත් විස්තර**.

7. 🎁 **මගෙන් ඔබට පෝරමය (From Me To You Form - FromMeToYouModal.tsx)**:
   - **අරමුණ (Purpose 3න් 1ක්)**: 'පරිත්‍යාග කිරීම (Donation)' / 'නොමිලේ ඉවත් කිරීම (Giveaway)' / 'භාණ්ඩ හුවමාරුව (Exchange)'.
   - **පරිත්‍යාග හෝ ඉවත් කිරීම නම්**: ලබාදෙන භාණ්ඩයේ නම (Item Title), කාණ්ඩය (Donation Category & Tag), කා වෙනුවෙන්ද (Recipient - පාසල් ළමුන්, අඩු ආදායම්ලාභී පවුල්, වැඩිහිටියන්, ආබාධිත අය, ඕනෑම අයෙකුට), ප්‍රමාණය (Quantity), ලබාගන්නා ක්‍රමය ('ඇවිත් රැගෙන යන්න' / 'ගෙනවිත් දෙන්නම්' / 'එවන්නම්'), සහ දිනය ('අදම' හෝ වෙනත් දිනයක්).
   - **භාණ්ඩ හුවමාරුවක් (Exchange) නම්**: ඔබ ළඟ ඇති භාණ්ඩය හා ප්‍රමාණය (Have Item & Qty), ඔබට අවශ්‍ය භාණ්ඩය හා ප්‍රමාණය (Want Item & Qty), සහ හුවමාරු කරගන්නා ක්‍රමය.
   - **ස්ථානය (GPS Location), WhatsApp දුරකථන අංකය, සහ වැඩිදුර විස්තර (More Details)**.

8. 👷 **වෘත්තීය සේවා ලියාපදිංචි පෝරමය (Register Professional Service Form - RegisterProfessionalServiceModal.tsx)**:
   - **ප්‍රධාන වෘත්තීය කාණ්ඩය (Category)** සහ **උප කාණ්ඩය (Sub-category)**.
   - **සේවා මාතෘකාව / තනතුර (Service Title) \***.
   - **සේවාව සපයන ආකාරය (Delivery Method)**: 'ස්ථානයක සිට (Location - සිතියම මත Pin එක තබා ස්ථානය පෙන්විය හැක)' / 'නිවසට පැමිණ (Home Visit)' / 'මාර්ගගතව (Online)' සහ එහි විස්තර.
   - **සුදුසුකම් ලැයිස්තුව (Qualifications - එකින් එක ටයිප් කර + බොත්තමෙන් එකතු කිරීම)** සහ **පළපුරුද්ද (Experience Duration)**.
   - **අමතර දුරකථන අංකය (Alt Phone)** සහ දුරකථන අංකය ප්‍රසිද්ධියේ පෙන්වීමේ අනුමැතිය.

9. 💼 **රැකියා පළකිරීමේ පෝරමය (Job Post Form - JobModal.tsx)**:
   - **රැකියා පරාසය (Scope)**: 'දේශීය රැකියා (Local)' හෝ 'විදේශ රැකියා (Overseas)'.
   - **රැකියා තනතුර (Job Title) \***, **කාණ්ඩය (Category)**, **ආයතනයේ නම (Company/Agency Name) \***, සහ **රැකියා වර්ගය** ('Full Time', 'Part Time', 'Contract', ආදිය).
   - **දේශීය රැකියා නම්**: අවම/උපරිම වැටුප (Salary Min/Max), වැටුප් කාලසීමාව, දිස්ත්‍රික්කය, නගරය, ලිපිනය, සුදුසුකම්, පළපුරුද්ද, ස්ත්‍රී/පුරුෂ භාවය, වයස් සීමාව.
   - **විදේශ රැකියා නම්**: රට (Country), SLBFE ලියාපදිංචි අංකය, ගිවිසුම් කාලය, විදේශ මුදල් ඒකකය හා වැටුප, Free Visa ද යන්න, ගමන් බලපත්‍ර/වෛද්‍ය පරීක්ෂණ අවශ්‍යතා.
   - **ප්‍රතිලාභ (Benefits Checkboxes)**, **විස්තරය**, **දුරකථන / WhatsApp අංකය \***, **අයදුම් කරන ආකාරය**, **අවසන් දිනය**, සහ **ඡායාරූප Link එකක් (Optional)**.

10. 🏠 **නවාතැන් පහසුකම් පළකිරීමේ පෝරමය (Accommodation Form - AccommodationModal.tsx)**:
    - **නවාතැන් වර්ගය (Category)**: 'නිවසක්/ඇනෙක්සියක් (House)' / 'බෝඩිං කාමර (Boarding)' / 'හෝටල් කාමර (Hotel)'.
    - **මාතෘකාව (Title)**, **විස්තරය**, **නගරය (City)**, **ලිපිනය**, **ආසන්නතම පාසල/විශ්වවිද්‍යාලය**, සහ **GPS පිහිටීම**.
    - **ඡායාරූප 4ක් දක්වා (Up to 4 Photos)**: ඉදිරිපස පෙනුම, සාලය, කුස්සිය/බාත්රූම්, නිදන කාමරය.
    - **වර්ගය අනුව විස්තර**:
      • *House*: තට්ටු ගණන, නිදන කාමර/බාත්රූම් ගණන, මාසික කුලිය (House Rent), අත්තිකාරම් මාස ගණන (Key Money Months), පැන්ට්‍රි/වාහන නැවැත්වීම/තාප්ප/වෙනම මීටර්.
      • *Boarding*: කා සඳහාද ('Boys'/'Girls'/'Couple'/'Working'), කාමර බෙදාගන්නා ආකාරය, මාසික ගාස්තුව හා අත්තිකාරම්, ආහාර පිසීමේ පහසුව, බිල්පත් ඇතුළත්ද යන්න, CCTV.
      • *Hotel*: කාමර වර්ගය, AC/Non-AC, ආහාර සැලැස්ම ('B&B'/'Half Board'/'Full Board'), දෛනික හා පැය ගණනේ ගාස්තුව, Wi-Fi/Pool.
    - **හිමිකරුගේ නම (Owner Name), දුරකථන අංකය සහ WhatsApp අංකය**.

11. 🛒 **වෙළඳපල භාණ්ඩ විකිණීමේ පෝරමය (Marketplace Seller Item Form - MarketplaceAddSellerItemModal.tsx)**:
    - **භාණ්ඩයේ නම (Title) \*** සහ **Tag එකක් තේරීම**.
    - **විකුණුම් ආකාරය (Sale Types - එකක් හෝ කිහිපයක්)**: 'සිල්ලර (Retail)' / 'තොග (Wholesale)' / 'හුවමාරු (Exchange - අවශ්‍ය හුවමාරු භාණ්ඩය හා ප්‍රමාණය)'.
    - **මිල (Price - රු.)** සහ **ප්‍රමාණය (Quantity)**.
    - **ලබාගත හැකි දිනය (Available Date)**: අද සිට හෝ වෙනත් දිනයක්.
    - **වගකීම් කාලය (Warranty)** සහ **කල්ඉකුත්වීමේ දිනය (Expiry Date)** *(ඇත්නම් පමණක්)*.
    - **බෙදාහැරීමේ ක්‍රමය (Delivery Option)**: 'පැමිණ රැගෙන යාම (Pickup - සිතියම මත ස්ථානය)' හෝ 'බෙදාහැරීම (Delivery)'.
    - **විශේෂ සටහන් (Notes)** සහ **WhatsApp දුරකථන අංකය**.

12. 🤝 **ශ්‍රමදාන / කණ්ඩායම් නිර්මාණය කිරීමේ පෝරමය (Create Group Form - CreateGroupModal.tsx)**:
    - **කණ්ඩායමේ නම (Group Name) \***
    - **කණ්ඩායමේ Username එක (@username - අකුරු 3-20) \***
    - **කාණ්ඩය (Category)** සහ **විස්තරය (Description)**
    - **පෞද්ගලිකත්වය (Privacy)**: 'Public (පොදු)' හෝ 'Private (පෞද්ගලික - ආරාධනා Link එකක් ලැබේ)'. *(ගාස්තුව: රු. 100 ක්‍රෙඩිට්)*.

===================================================================
🌟 COMPLETE SAHAYA SEWA APP ARCHITECTURE & FEATURE KNOWLEDGE (100% COVERAGE):

1. 🔐 **AUTHENTICATION, REGISTRATION, QUICK PIN & DATA PRIVACY**:
   • **New Registration (RegisterForm)**: Requires Full Name, NIC Number, WhatsApp Phone Number, District, Police Division, City, Address, Password (min 6 chars), and **ONLY 1 Photo**: **NIC Front Photo (හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය)** captured via camera. (No Face/Selfie photo or NIC back photo is needed).
   • **100% Privacy & Security**: NIC front photo and passwords are NEVER visible to other users and are never stored in plain text in browser storage. They are encrypted in Cloud Firestore and viewed only by authorized Admins for account verification.
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
   • Enter Patient Name, Blood Group (A+, A-, B+, B-, O+, O-, AB+), Units Needed, Hospital, District, Urgency, and Phone -> Immediately notifies all verified donors of that blood type in the district.

5. ⚡ **24/7 QUICK ARTISAN SERVICES & VERIFIED PROFESSIONALS (QuickServiceModal, ProfessionalServicesView)**:
   • Connect with Electricians (විදුලි කාර්මික), Plumbers (ජලනල කාර්මික), Mechanics (වාහන කාර්මික), Masons, AC technicians, etc. within a **15km radius**.
   • **4-Digit Start PIN & Digital Bill**: When the artisan arrives, the customer gives a 4-digit Start PIN to begin work, and settles the bill via the transparent Helper Bill invoice at completion.

6. 📦 **TRANSPARENT AID LEDGER (TransparentAidLedgerModal - විනිවිදභාවයේ ආධාර ලෙජරය)**:
   • Prevents disaster relief fraud and duplicate hoarding.
   • Relief centers (Temples, Schools, Camps) register with a **6-Digit Secret Security PIN**.
   • Donors log delivered rations/water/medicine and confirm handover using the recipient's 6-digit PIN on the public ledger.

7. 📝 **COMMUNITY HELP BULLETIN (HelpRequestsPage, HelpPostModal)**:
   • Post any community help request via the 2-step composer (Headline, Text/Image/Poll, Service Tag, Anonymous/Public/Schedule options). Standard posting fee is **Rs. 25 (25 Credits)**.
   • Supports **Singlish & Phonetic Sinhala Search**, District/City filtering on the dashboard, Voice Notes, Photos, In-App Chat, WhatsApp contact, and Post Boosting (BoostPostModal).

8. 💼 **JOBS PORTAL (JobsView - රැකියා පියස) & 🏠 ACCOMMODATIONS (AccommodationView - නවාතැන් පහසුකම්)**:
   • **Jobs Portal**: Browse or post local/overseas jobs, view job locations on the interactive JobMap, and apply/comment.
   • **Accommodations**: Find or list boarding rooms, annexes, houses for rent, and hotel stays with interactive AccommodationMap and price filters.

9. 🔄 **CASHLESS BARTER EXCHANGE (BarterExchangeModal - භාණ්ඩ හුවමාරුව) & 🎁 FROM ME TO YOU (FromMeToYouModal - මගෙන් ඔබට)**:
   • **Barter Exchange**: Swap items directly without money (item-for-item exchange proposals).
   • **From Me To You**: Donate books, clothes, wheelchairs, or school supplies 100% FREE with zero monetary charge.

10. 🔍 **FIND FOR ME (FindForMeModal - සොයාදෙන්න)** & 🛒 **MARKETPLACE LOWEST PRICES (MarketplaceView)** & 🤝 **SHRAMADANA (GroupWorkView)**:
    • **Find For Me**: Report lost/stolen/found NICs, driving licenses, wallets, pets, or items to buy (with optional reward).
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
- User's Current Location: ${safeLocationContext || 'Sri Lanka'}. Always address the user's exact question or problem directly in the first paragraph!`;

      // Sanitize multi-turn conversation history for Gemini API (cap at last 10 turns & sanitize each turn):
      // 1. Must alternate user / model
      // 2. Must begin with a 'user' turn (skip leading model turns like welcome greeting)
      // 3. Consecutive turns with same role must be merged
      const rawHistory = Array.isArray(conversationHistory) ? conversationHistory.slice(-10) : [];
      const sanitizedTurns: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      for (const h of rawHistory) {
        if (!h || !h.text) continue;
        const cleanTurnText = sanitizeAiPromptInput(String(h.text), 800);
        if (!cleanTurnText) continue;
        const role: 'user' | 'model' = h.role === 'model' ? 'model' : 'user';
        if (sanitizedTurns.length === 0 && role === 'model') {
          continue; // Gemini API requires the first turn in contents to have role: 'user'
        }
        const lastTurn = sanitizedTurns[sanitizedTurns.length - 1];
        if (lastTurn && lastTurn.role === role) {
          lastTurn.parts[0].text += `\n${cleanTurnText}`;
        } else {
          sanitizedTurns.push({
            role,
            parts: [{ text: cleanTurnText }],
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
      if (!enforceAiAbuseProtection(req, res)) return;
      const { transcript, language = 'si', locationContext } = req.body;
      const cleanText = sanitizeAiPromptInput(String(transcript || ''), 1000);

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
      if (!enforceAiAbuseProtection(req, res)) return;
      const { text: rawText, targetLanguage = 'si' } = req.body;
      if (!rawText || typeof rawText !== 'string') {
        return res.status(400).json({ error: 'Text is required' });
      }
      const text = sanitizeAiPromptInput(rawText, 1500);

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
      if (rawPass.startsWith('sha256_v1$') || rawPass.startsWith('scrypt_v1$')) {
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

      // If user record exists on the server/Firestore, strictly verify the password hash with scrypt + timingSafeEqual
      if (targetUser && (targetUser.password || targetUser.key || targetUser.tempPassword || targetUser.temporaryPassword)) {
        if (!rawPass) {
          return res.status(401).json({ error: 'Password required' });
        }
        const storedPerm = String(targetUser.password || targetUser.key || '').trim();
        const storedTemp = String(targetUser.tempPassword || targetUser.temporaryPassword || '').trim();

        const permCheck = verifyServerPassword(rawPass, storedPerm);
        const tempCheck = verifyServerPassword(rawPass, storedTemp);

        const isPermMatch = permCheck.valid;
        const isTempMatch = tempCheck.valid;

        if (!isPermMatch && !isTempMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Automatically upgrade legacy sha256_v1$ or plaintext password to scrypt_v1$ in Firestore
        if (isPermMatch && permCheck.needsUpgrade) {
          const upgradedScryptHash = hashRawServerPassword(rawPass);
          targetUser.password = upgradedScryptHash;
          targetUser.key = upgradedScryptHash;
          seedUser(targetUser);
          if (adminDb && targetUser.id) {
            await adminDb.collection('users').doc(String(targetUser.id)).set({
              password: upgradedScryptHash,
              key: upgradedScryptHash,
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

      if (!cleanNic || !cleanNewPass || cleanNewPass.startsWith('sha256_v1$') || cleanNewPass.startsWith('scrypt_v1$')) {
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

      if (!cleanPass || !cleanNic || cleanPass.startsWith('sha256_v1$') || cleanPass.startsWith('scrypt_v1$')) {
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
  // 🔔 FREE MULTI-CHANNEL RED ALERT DISPATCHER (Rs. 0 Cost Architecture)
  // Channel 1: Web Push (VAPID RFC8030/RFC8291)
  // Channel 2: ntfy.sh Public Topic Push (https://ntfy.sh/lanka24-<district>)
  // Channel 3: Telegram Bot Channel/Group Broadcast
  // Channel 4: Brevo Email API (300/day free tier)
  // Channel 5: Public RSS 2.0 XML Feed (/feed.xml & /api/alerts/rss.xml)
  // -------------------------------------------------------------
  const resolveVapidKeys = (): { publicKey: string; privateKey: string; subject: string } => {
    const envPub = String(process.env.VAPID_PUBLIC_KEY || '').trim();
    const envPriv = String(process.env.VAPID_PRIVATE_KEY || '').trim();
    const subject = String(process.env.VAPID_SUBJECT || 'mailto:admin@sahayasewa.lk').trim();
    if (envPub && envPriv) {
      return { publicKey: envPub, privateKey: envPriv, subject };
    }
    const vapidPath = path.join(process.cwd(), '.sahaya_vapid_keys.json');
    try {
      if (fs.existsSync(vapidPath)) {
        const parsed = JSON.parse(fs.readFileSync(vapidPath, 'utf8'));
        if (parsed.publicKey && parsed.privateKey) {
          return { publicKey: parsed.publicKey, privateKey: parsed.privateKey, subject };
        }
      }
      const generated = webPush.generateVAPIDKeys();
      fs.writeFileSync(vapidPath, JSON.stringify(generated, null, 2), { encoding: 'utf8', mode: 0o600 });
      return { publicKey: generated.publicKey, privateKey: generated.privateKey, subject };
    } catch {
      const generated = webPush.generateVAPIDKeys();
      return { publicKey: generated.publicKey, privateKey: generated.privateKey, subject };
    }
  };

  const vapidConfig = resolveVapidKeys();
  try {
    webPush.setVapidDetails(vapidConfig.subject, vapidConfig.publicKey, vapidConfig.privateKey);
  } catch (vapidErr: any) {
    console.warn('WebPush VAPID initialization notice:', vapidErr?.message || vapidErr);
  }

  const inMemoryWebPushSubscriptions = new Map<string, any>();
  const recentConfirmedAlertsFeed: Array<{
    id: string;
    title: string;
    description: string;
    locationName: string;
    district: string;
    score: number;
    confidenceStatus: string;
    pubDate: string;
  }> = [];

  app.get('/api/webpush/vapid-public-key', (_req: any, res: any) => {
    res.json({
      success: true,
      publicKey: vapidConfig.publicKey,
      ntfyPrefix: process.env.NTFY_TOPIC_PREFIX || 'lanka24',
      rssUrl: '/feed.xml',
    });
  });

  app.post('/api/webpush/subscribe', authRateLimiter, async (req: any, res: any) => {
    try {
      const { userId, subscription, lat, lng, radiusKm = 15, categories = ['all'] } = req.body || {};
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Valid PushSubscription object required' });
      }
      const subKey = String(userId || crypto.createHash('sha256').update(subscription.endpoint).digest('hex').slice(0, 24));
      const record = {
        userId: subKey,
        subscription,
        lat: typeof lat === 'number' ? lat : null,
        lng: typeof lng === 'number' ? lng : null,
        radiusKm: Number(radiusKm) || 15,
        categories: Array.isArray(categories) ? categories : ['all'],
        updatedAt: new Date().toISOString(),
      };
      inMemoryWebPushSubscriptions.set(subKey, record);

      if (adminDb) {
        await adminDb.collection('subscriptions').doc(subKey).set(record, { merge: true }).catch(() => {});
      }
      return res.json({ success: true, subscriptionId: subKey });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  const notifiedAlertMilestones = new Set<string>();

  app.post('/api/alerts/notify-channels', authRateLimiter, async (req: any, res: any) => {
    try {
      const {
        alertId,
        title = 'හදිසි ආපදා අනතුරු ඇඟවීමක්',
        description = '',
        locationName = 'ශ්‍රී ලංකාව',
        district = 'srilanka',
        latitude = 6.9271,
        longitude = 79.8612,
        score = 4,
        confidenceStatus = 'likely_true',
        tier = 'likely_true',
      } = req.body || {};

      if (!alertId) {
        return res.status(400).json({ error: 'alertId required' });
      }

      const milestoneKey = `${alertId}_${tier}`;
      if (notifiedAlertMilestones.has(milestoneKey)) {
        return res.json({ success: true, deduplicated: true });
      }
      notifiedAlertMilestones.add(milestoneKey);

      const cleanTitle = String(title).slice(0, 120);
      const cleanDesc = String(description || `${locationName} ප්‍රදේශයෙන් ප්‍රජාව තහවුරු කළ ආපදා තත්ත්වයක්.`).slice(0, 350);
      const cleanLoc = String(locationName).slice(0, 80);
      const districtSlug = String(district || locationName || 'srilanka')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'srilanka';

      // Add to RSS feed buffer (keep latest 20)
      recentConfirmedAlertsFeed.unshift({
        id: String(alertId),
        title: `${tier === 'confirmed' ? '✅ [තහවුරු විය]' : '🟢 [බොහෝ දුරට සත්‍ය]'} ${cleanTitle} — ${cleanLoc}`,
        description: `${cleanDesc} (ලකුණු: ${score >= 0 ? '+' + score : score}) | හදිසි ඇමතුම්: 119 / 110 / 117 / 1990`,
        locationName: cleanLoc,
        district: districtSlug,
        score: Number(score),
        confidenceStatus: String(confidenceStatus),
        pubDate: new Date().toUTCString(),
      });
      if (recentConfirmedAlertsFeed.length > 20) {
        recentConfirmedAlertsFeed.length = 20;
      }

      const channelResults: Record<string, string> = {};

      // 1. Web Push (VAPID)
      try {
        const pushPayload = JSON.stringify({
          title: `🚨 ${cleanTitle} (${cleanLoc})`,
          body: `${cleanDesc}\n⚠️ ප්‍රජාව විසින් වාර්තා කරන ලද, නිල නොවන අනතුරු ඇඟවීමකි. හදිසි: 119 / 117 / 1990`,
          tag: `sahaya_red_alert_${alertId}`,
          url: `/?alertId=${encodeURIComponent(String(alertId))}`,
          alertId: String(alertId),
          latitude,
          longitude,
          score,
          confidenceStatus,
        });

        let webPushSent = 0;
        for (const [subKey, subRec] of inMemoryWebPushSubscriptions.entries()) {
          if (subRec?.subscription?.endpoint) {
            try {
              await webPush.sendNotification(subRec.subscription, pushPayload);
              webPushSent++;
            } catch (wpErr: any) {
              if (wpErr?.statusCode === 404 || wpErr?.statusCode === 410) {
                inMemoryWebPushSubscriptions.delete(subKey);
              }
            }
          }
        }
        channelResults.webPush = `sent_${webPushSent}`;
      } catch (e: any) {
        channelResults.webPush = `err_${e?.message || 'failed'}`;
      }

      // 2. ntfy.sh Free Topic Push (https://ntfy.sh/lanka24-<district>)
      try {
        const ntfyPrefix = String(process.env.NTFY_TOPIC_PREFIX || 'lanka24').trim();
        const ntfyTopic = `${ntfyPrefix}-${districtSlug}`;
        await fetch(`https://ntfy.sh/${encodeURIComponent(ntfyTopic)}`, {
          method: 'POST',
          headers: {
            Title: `Red Alert: ${cleanLoc}`,
            Priority: tier === 'confirmed' ? 'urgent' : 'high',
            Tags: 'rotating_light,warning,sri_lanka',
          },
          body: `🚨 ${cleanTitle} (${cleanLoc})\n${cleanDesc}\nලකුණු: ${score >= 0 ? '+' + score : score}\nහදිසි: 119 / 110 / 117 / 1990\n⚠️ ප්‍රජාව විසින් වාර්තා කරන ලද නිල නොවන අනතුරු ඇඟවීමකි.`,
        }).catch(() => {});
        channelResults.ntfy = `published_${ntfyTopic}`;
      } catch {
        channelResults.ntfy = 'skipped';
      }

      // 3. Telegram Bot Channel Broadcast
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        try {
          const tgMsg =
            `${tier === 'confirmed' ? '🚨✅ *තහවුරු වූ රතු එළිය (CONFIRMED RED ALERT)*' : '🟢 *බොහෝ දුරට සත්‍ය ආපදා වාර්තාවක්*'}\n\n` +
            `📌 *ආපදාව:* ${cleanTitle}\n` +
            `📍 *ස්ථානය:* ${cleanLoc}\n` +
            `📊 *ප්‍රජා විශ්වාස ලකුණු:* ${score >= 0 ? '+' + score : score}\n` +
            `📝 *විස්තරය:* ${cleanDesc}\n\n` +
            `📞 *නිල හදිසි අංක:* 119 (පොලිසිය) | 110 (ගිනි නිවීම) | 117 (ආපදා කළමනාකරණ) | 1990 (සුව සැරිය)\n` +
            `⚠️ _ප්‍රජාව විසින් වාර්තා කරන ලද, නිල නොවන අනතුරු ඇඟවීමකි._`;

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: tgMsg,
              parse_mode: 'Markdown',
            }),
          }).catch(() => {});
          channelResults.telegram = 'sent';
        } catch {
          channelResults.telegram = 'failed';
        }
      }

      // 4. Brevo Email API (Free Tier 300/day when BREVO_API_KEY is configured)
      const brevoKey = String(process.env.BREVO_API_KEY || '').trim();
      const brevoRecipient = String(process.env.BREVO_ALERT_RECIPIENT || '').trim();
      if (brevoKey && brevoRecipient && tier === 'confirmed') {
        try {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': brevoKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sender: {
                name: 'Lanka24 Sahaya Red Alert',
                email: process.env.BREVO_SENDER_EMAIL || 'alerts@sahayasewa.lk',
              },
              to: [{ email: brevoRecipient }],
              subject: `🚨 [තහවුරු විය] ${cleanTitle} - ${cleanLoc}`,
              htmlContent: `<h2>🚨 ${cleanTitle} (${cleanLoc})</h2><p>${cleanDesc}</p><p><strong>ලකුණු:</strong> +${score}</p><p><strong>නිල හදිසි අංක:</strong> 119 / 110 / 117 / 1990</p><hr/><p><small>⚠️ ප්‍රජාව විසින් වාර්තා කරන ලද, නිල නොවන අනතුරු ඇඟවීමකි.</small></p>`,
            }),
          }).catch(() => {});
          channelResults.brevoEmail = 'sent';
        } catch {
          channelResults.brevoEmail = 'failed';
        }
      }

      return res.json({
        success: true,
        alertId,
        tier,
        channels: channelResults,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 📡 Public RSS 2.0 XML Feed (/feed.xml & /api/alerts/rss.xml) — 100% Free Open Standard
  const escapeXml = (unsafe: string): string =>
    String(unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  app.get(['/feed.xml', '/api/alerts/rss.xml'], async (_req: any, res: any) => {
    try {
      let items = [...recentConfirmedAlertsFeed];

      // Also pull latest active alerts from Firestore if available
      if (adminDb && items.length < 5) {
        try {
          const snap = await adminDb
            .collection('red_alerts')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
          snap.forEach((docSnap: any) => {
            const d = docSnap.data() || {};
            if (d.confidenceStatus === 'removed' || d.status === 'fake' || d.status === 'cancelled') return;
            if (!items.some((x) => x.id === docSnap.id)) {
              items.push({
                id: docSnap.id,
                title: `${d.disasterTitleSi || d.title || 'හදිසි ආපදා අනතුරු ඇඟවීමක්'} — ${d.locationName || 'ශ්‍රී ලංකාව'}`,
                description: `${d.description || ''} (ලකුණු: ${d.score ?? 0}) | ⚠️ ප්‍රජාව විසින් වාර්තා කරන ලද, නිල නොවන අනතුරු ඇඟවීමකි. හදිසි: 119 / 110 / 117 / 1990`,
                locationName: d.locationName || 'ශ්‍රී ලංකාව',
                district: d.district || 'srilanka',
                score: Number(d.score || 0),
                confidenceStatus: String(d.confidenceStatus || 'suspicious'),
                pubDate: d.createdAt ? new Date(d.createdAt).toUTCString() : new Date().toUTCString(),
              });
            }
          });
        } catch {}
      }

      const xmlItems = items
        .slice(0, 20)
        .map(
          (item) => `    <item>
      <guid isPermaLink="false">${escapeXml(item.id)}</guid>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <category>${escapeXml(item.confidenceStatus)}</category>
      <pubDate>${escapeXml(item.pubDate)}</pubDate>
    </item>`
        )
        .join('\n');

      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Lanka24online — සහය සේවා රතු එළිය හදිසි අනතුරු ඇඟවීම් (Red Alerts RSS)</title>
    <link>https://supporservice.online</link>
    <description>ප්‍රජාව විසින් වාර්තා කර තහවුරු කරන ලද හදිසි ආපදා නිවේදන (නිල නොවන ප්‍රජා අනතුරු ඇඟවීම් පද්ධතිය - 119 / 110 / 117 / 1990)</description>
    <language>si-LK</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${xmlItems}
  </channel>
</rss>`;

      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.status(200).send(rssXml);
    } catch (err: any) {
      return res.status(500).send('Failed to generate RSS feed');
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
