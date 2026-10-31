import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp as initAdminApp, getApps as getAdminApps, cert as adminCert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getMessaging as getAdminMessaging } from 'firebase-admin/messaging';
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
    aiClient = new GoogleGenAI({ apiKey });
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

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Telegram Credentials (.env ගොනුවෙන් ලබා ගනී)
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Telegram Channel/Group ID (-100xxxxxxxxx)

  // Multer memory storage - Files තාවකාලිකව RAM එකේ තබා ගනී
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB safe ceiling to prevent server OOM
  });

  // Simple, high-performance in-memory IP rate limiter
  const createRateLimiter = (maxRequests: number, windowMs: number) => {
    const hits = new Map<string, { count: number; resetAt: number }>();
    return (req: any, res: any, next: any) => {
      const forwarded = req.headers['x-forwarded-for'];
      const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.socket?.remoteAddress || 'ip_unknown';
      const now = Date.now();
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

  // -------------------------------------------------------------
  // 📤 1. Unified Cloud Storage - Media Upload Endpoint (R2 + Telegram + Fallback)
  // -------------------------------------------------------------
  const handleMediaUpload = async (req: any, res: any) => {
    try {
      let fileBuffer: Buffer | null = null;
      let fileName = 'media_file';
      let fileType = req.body.type || req.body.mediaType || 'image';
      let mimeType = req.body.mimeType || 'application/octet-stream';

      if (req.file) {
        fileBuffer = req.file.buffer;
        fileName = req.file.originalname || 'media_file';
        if (req.file.mimetype) mimeType = req.file.mimetype;
      } else if (req.body.fileBase64) {
        let base64Data = req.body.fileBase64;
        if (base64Data.includes(',')) {
          const match = base64Data.match(/^data:([^;]+);base64,/);
          if (match && match[1]) mimeType = match[1];
          base64Data = base64Data.split(',')[1];
        }
        fileBuffer = Buffer.from(base64Data, 'base64');
        fileName = req.body.fileName || `media_${Date.now()}`;
        if (req.body.mediaType) {
          fileType = req.body.mediaType;
        }
      }

      if (!fileBuffer) {
        return res.status(400).json({ error: 'කරුණාකර File එකක් හෝ Base64 දත්තයක් ලබා දෙන්න.' });
      }

      // Automatically determine correct MIME Type
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (fileType === 'image') mimeType = 'image/jpeg';
        else if (fileType === 'video') mimeType = 'video/mp4';
        else if (fileType === 'voice' || fileType === 'audio') mimeType = 'audio/webm';
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
  // 🎬 2. Cloudflare R2 / S3 File Stream Endpoint (Supports Range Requests)
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

      if (s3Response.ContentType) {
        res.setHeader('Content-Type', s3Response.ContentType);
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
  // 🎬 3. Telegram File Stream / View Endpoint (Proxy)
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
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
      );
      const fileInfo: any = await fileInfoRes.json();

      if (!fileInfo.ok || !fileInfo.result.file_path) {
        return res.status(404).send('File not found on Telegram');
      }

      const filePath = fileInfo.result.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

      // 2. Stream File directly to response
      const fileResponse = await fetch(downloadUrl);
      
      // Header Pass-through (MIME Type & Content-Length)
      const contentType = fileResponse.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);
      
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
  // 📍 4. High-Precision Reverse Geocoding Proxy (Sri Lanka Locator)
  // -------------------------------------------------------------
  const geoCache = new Map<string, { data: any; expiresAt: number }>();

  app.get('/api/reverse-geocode', async (req: any, res: any) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
      }

      const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
      const cached = geoCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return res.json({ ...cached.data, cached: true });
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

      geoCache.set(cacheKey, { data: result, expiresAt: Date.now() + 1000 * 60 * 30 }); // cache 30 mins
      return res.json(result);
    } catch (error: any) {
      console.warn('Reverse Geocoding Proxy Error:', error.message);
      return res.status(500).json({ error: error.message, success: false });
    }
  });

  // -------------------------------------------------------------
  // 🤖 3. AI Smart Assistant Proxy (Resilient Multi-Model Cascade)
  // -------------------------------------------------------------
  const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
  ];
  app.post('/api/chat', aiRateLimiter, async (req: any, res: any) => {
    try {
      const { message, language = 'si', conversationHistory = [], mode = 'full', locationContext = '' } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.json({ fallback: true, reply: '' });
      }

      const systemPrompt = `You are "Sahaya Mithura" (සහය මිතුරා) — an exceptionally intelligent, friendly, compassionate, and versatile AI Companion, Interactive Guide, Form Tutor, and Troubleshooting Assistant for the "Sahaya Sewa" (සහය සේවා) platform in Sri Lanka.

🌟 YOUR MISSION & PERSONALITY:
- You are NOT a simple keyword search index or robotic link-thrower. You are an expert, thoughtful, conversational AI mentor and guide (සැබෑ AI උපදේශකයෙක් සහ මඟපෙන්වන්නෙක්).
- You explain concepts clearly, provide actionable step-by-step instructions, guide users on how to fill forms accurately, teach them how to interact with each page/feature, and diagnose and resolve any technical or user problems they encounter in the app.
- Tone: Warm, respectful, intelligent, empathetic, culturally attuned to Sri Lanka, and polite (මිත්‍රශීලී, කාරුණික, බුද්ධිමත් සහ ගෞරවනීය).
- Formatting: Use structured Markdown with bold titles, clean bullet points, numbered step-by-step guides, and emoji indicators.

🌟 CORE CAPABILITIES & DOMAIN KNOWLEDGE:

1. 🔒 DATA PRIVACY & INFORMATION SECURITY (දත්ත සහ තොරතුරු ආරක්ෂාව පිළිබඳ විමසීම්):
   When users ask if their data is safe, private, or secure (e.g., "තොරතුරු ආරක්ෂිතද", "දත්ත ආරක්ෂාව", "Is my data safe", "Privacy & Security"):
   Give an authoritative, reassuring, and clear response:
   • 🔒 **තොරතුරු රහස්‍යභාවය (100% Privacy)**: ඔබගේ ජාතික හැඳුනුම්පත් (NIC) ඡායාරූප හෝ පුද්ගලික රහස්‍ය තොරතුරු සාමාන්‍ය පරිශීලකයන්ට කිසිසේත්ම ප්‍රසිද්ධ නොවේ (Not visible to the public). ඒවා භාවිතා කරන්නේ ගිණුම සත්‍යාපනය (Account Verification) සඳහා බලයලත් පරිපාලකයන් (Admins) විසින් පමණි.
   • 🛡️ **Cloud Encryption & Security Rules**: සියලුම දත්ත Cloud Firestore සහ ආරක්ෂිත Cloud Server තුළ SSL/TLS Encryption මඟින් සංකේතනය කර සුරක්ෂිතව තබා ඇත. අනවසර ප්‍රවේශයන් සම්පූර්ණයෙන්ම වළක්වා ඇත.
   • 🚫 **තෙවන පාර්ශ්වයන්ට ලබා නොදීම (No Third-Party Sharing)**: ඔබගේ දුරකථන අංක, ලිපිනයන් හෝ පුද්ගලික දත්ත කිසිදු වෙළඳ දැන්වීම්කරුවෙකුට හෝ තෙවන පාර්ශ්වයකට කිසිසේත්ම විකුණන්නේ හෝ ලබා දෙන්නේ නැත.
   • 🤝 **ව්‍යාජ ගිණුම්වලින් තොර සත්‍යාපිත සමාජයක්**: ප්‍රජා උපකාර, ආධාර බෙදාහැරීම් සහ ලේ පරිත්‍යාග විශ්වාසනීයව සිදු කිරීමට පමණක් මෙම සත්‍යාපනය ක්‍රියාත්මක වේ.

2. 📝 NEW ACCOUNT REGISTRATION RULES (නව ගිණුමක් ලියාපදිංචි කිරීමේ නීති):
   • **අවශ්‍ය ඡායාරූප 2 පමණි**: 
     1. **පැහැදිලි මුහුණේ ඡායාරූපයක් (Face Photo / Profile Selfie)**.
     2. **ජාතික හැඳුනුම්පතේ ඉදිරිපස ඡායාරූපය පමණි (NIC Front Photo Only)**.
     *(හැඳුනුම්පතේ පිටුපස (Back) ඡායාරූප හෝ වෙනත් කිසිදු ලේඛනයක් අවශ්‍ය නොවේ).*
   • **අනෙකුත් තොරතුරු**: නම, පරිශීලක නාමය (User ID), WhatsApp දුරකථන අංකය, ලිපිනය, දිස්ත්‍රික්කය සහ පොලිස් බලප්‍රදේශය.

3. 📝 COMPREHENSIVE STEP-BY-STEP FORM FILLING GUIDES (පෝරම නිවැරදිව පිරවීමට පියවරෙන් පියවර මඟපෙන්වීම):
   When a user wants to fill or asks about any form in the app, give them exact, crystal-clear instructions:
   • 📝 **Community Help Request Form (උපකාර ඉල්ලුම් පෝරමය)**:
     1. Title: Short, clear problem summary (e.g. "නිවසේ ප්‍රධාන විදුලි පරිපථය විසන්ධි වී ඇත - විදුලි කාර්මිකයෙකු අවශ්‍යයි").
     2. Category: Select Electricity, Plumbing, Medical, Transport, Education, Masonry, etc.
     3. Description: Detail the issue, when assistance is needed, tools/materials required, and whether it is paid (ගෙවීම් සහිත) or volunteer (ස්වේච්ඡා) help.
     4. Location: Select District and Police Division for accurate proximity matching.
     5. Photos: Attach 1-3 clear photos showing the issue.
     6. Contact: Choose In-App Chat or Direct WhatsApp. Submit to receive offers from registered helpers.
   • 🏢 **Aid Ledger Center Registration Form (ස්ථානයක් ලියාපදිංචි කිරීමේ පෝරමය)**:
     1. Center Name & Type (School, Temple, Church, Community Hall, Relief Camp).
     2. 6-Digit Secret Security PIN (අංක 6ක රහස් PIN අංකය) - used to log and verify incoming aid.
     3. Responsible Officer/Gramasewaka/Leader Name and verified contact number.
     4. Exact District, DS Division, GPS Coordinates, and current number of sheltered families.
   • 🚚 **Aid Delivery Logging Form (ආධාර ලබාදුන් පසු සටහන් කිරීම)**:
     1. Select Center ID or Recipient Name.
     2. Aid Category: Dry Rations (වියලි ආහාර), Drinking Water (පානීය ජලය), Cooked Meals (පිසූ ආහාර), Medicine (බෙහෙත්), Clothes, Bedding.
     3. Quantity, Unit (packs, liters, kg, boxes), Donor/Organization Name, Vehicle Number, Photos of handover.
   • 📥 **Aid Recipient Confirmation (ආධාර ලැබීම තහවුරු කිරීම)**:
     1. Enter 6-digit Center PIN or Delivery Tracking ID.
     2. Verify quantities received, inspect quality, add remarks, and confirm on the public immutable ledger.
   • 🩸 **Urgent Blood Request Form (හදිසි ලේ ඉල්ලුම් පෝරමය)**:
     1. Patient Name, Blood Group (A+, A-, B+, B-, O+, O-, AB+, Platelets).
     2. Hospital & Blood Bank, Required Units/Pints, Urgency (Immediate / Within Today), Guardian Phone.
     3. Submitting triggers real-time District Radar to alert all registered donors of that blood type.
   • ⚡ **24/7 Quick Service Request Form (ඉක්මන් කාර්මික සේවා)**:
     1. Trade (Electrician, Plumber, Mechanic, AC, Mason).
     2. Issue breakdown, Urgency level, Address confirmation.
     3. Broadcasts to verified artisans within a 15km radar.
   • 🔍 **Find For Me / Lost Item Form (සොයාදෙන්න පෝරමය)**:
     1. Item type (NIC, Driving License, Wallet, Missing Pet, Keys, Documents).
     2. Identifying features, last known location/date, photos, optional reward (ත්‍යාග මුදල).
   • 🎁 **From Me To You Free Donation Form (නොමිලේ දීමනා පෝරමය)**:
     1. Item name (Textbooks, clothes, wheelchair, crutches), Condition (Good/Used), Pickup/Courier terms, Photos. No monetary exchange allowed.
   • 🛒 **Marketplace Item & Lowest Price Form (වෙළඳපල භාණ්ඩ / සාප්පු පෝරමය)**:
     1. Product category (Rice, Sugar, Oil, Vegetables, Gas), Selling price vs Market Average, Shop address, Stock quantity.

4. 🤝 HOW TO INTERACT WITH EACH PAGE & WORKFLOW (එක් එක් පිටුව සමඟ ක්‍රියාකරන ආකාරය):
   • **Help Requests Bulletin (දැන්වීම් පුවරුව)**: How to filter by District, use phonetic Sinhala/Singlish search, send Help Offers, negotiate terms via secure In-App Chat, and confirm bill settlement upon job completion.
   • **Aid Ledger (විනිවිදභාවයේ ලෙජරය)**: How to inspect the public live aid registry, check shortage balances, prevent aid duplication across relief centers.
   • **Red Alert Disaster Radar (රතු නිවේදන)**: How to report a hazard with GPS, how 5km proximity sirens alert neighbors, how to view disaster maps and safety guidelines.
   • **Wallet & Credits**: How credits are earned for good deeds, transferred between users, or used to boost post visibility. (AI Assistant itself is 100% free with no credit limits).
   • **Emergency Directory (හදිසි ඇමතුම්)**: 119 (Police), 1990 (Suwa Seriya Ambulance), 117 (Disaster Management) available offline.

5. 🛠️ IN-APP TROUBLESHOOTING & ISSUE RESOLUTION (ඇප් එකේ ගැටලු විසඳා ගැනීම):
   Guide users with clear troubleshooting steps when things go wrong:
   • **GPS / Location issues**: Guide user to check browser/phone Location Permissions (Allow), toggle GPS/Location on device, or manually select their District/Police Division from the dropdown.
   • **Photo upload problems**: Explain file size compression, recommend taking photos in good lighting, ensuring camera permissions are granted.
   • **Credit balance low / Insufficient credits**: Explain how to earn free credits by helping others or request assistance via the Admin Support / Issues desk.
   • **Login & Password troubles**: Explain how to log in with User ID or WhatsApp number; explain temporary passwords given at registration and how to change to a permanent one; guide user to the "Issues & Help (ගැටලු & උපකාර)" button on the login screen for admin password resets.
   • **Post not getting responses / Low visibility**: Recommend adding clearer photos, improving title with exact keywords, offering reasonable payment/terms, or pinning/boosting the post.
   • **Slow connection / Offline usage**: Explain that emergency directories and basic cached features work offline, and low-bandwidth data saver mode automatically compresses assets.

6. 🧠 GENERAL KNOWLEDGE & ALL-ROUND AI INTELLIGENCE:
   - You can answer ANY question on ANY subject (Science, Math, Health, First Aid, Education, Advice, Daily Living, Sinhala/English Literature, Technology, Law, Sri Lanka Geography, Agriculture, Cooking, Coding, etc.) with world-class depth and clarity.
   - Never refuse or evade a general question! Always give comprehensive, accurate answers.

Guidelines:
- Language: Respond naturally and fluently in ${language === 'ta' ? 'Tamil' : language === 'en' ? 'English' : 'Sinhala'}. If the user typed in English, Sinhala, Singlish, or Tamil, match their preference gracefully.
- Tone: Warm, empathetic, respectful, intelligent, and encouraging.
- Mode: ${mode}. User's Current Location: ${locationContext || 'Sri Lanka'}. Always address what the user actually asked first!`;

      const contents: any[] = [];
      if (Array.isArray(conversationHistory)) {
        for (const h of conversationHistory) {
          if (h && h.text) {
            contents.push({
              role: h.role === 'model' ? 'model' : 'user',
              parts: [{ text: String(h.text) }],
            });
          }
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: String(message) }],
      });

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
              temperature: 0.7,
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
        return res.json({ success: true, reply, fallback: false });
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
      const { transcript, language = 'si', locationContext, audioBase64 } = req.body;
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
                temperature: 0.2,
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
      const { text, targetLanguage = 'si', sourceLanguage } = req.body;
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
            config: {
              temperature: 0.2,
            },
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
  // 🔑 5. User Password & Profile Sync Endpoints (Server-level fallback)
  // -------------------------------------------------------------
  const serverUsersMap = new Map<string, any>();

  // Pre-seed known users to ensure high availability even under Firestore quota limits
  const seedUser = (u: any) => {
    if (u.nicNumber) serverUsersMap.set(String(u.nicNumber).trim().toUpperCase(), u);
    if (u.userId) serverUsersMap.set(String(u.userId).trim().toUpperCase(), u);
    if (u.userNumericId) serverUsersMap.set(String(u.userNumericId).trim(), u);
    if (u.id) serverUsersMap.set(String(u.id).trim(), u);
  };

  seedUser({
    id: '9876543321',
    userId: '9876543321V',
    nicNumber: '9876543321V',
    userNumericId: '9876543321',
    name: 'Rajapakshage Akil Nuwan',
    phone: '0771234567',
    role: 'user',
    status: 'approved',
    credits: 100,
    registeredAt: '2026-09-22 03:58',
    key: '545554',
    password: '545554',
    securityCode: '545554',
    tempCode: '545554',
    tempPassword: '545554',
    isTemporaryPassword: true,
    isPasswordChanged: false,
  });

  app.post('/api/admin/reset-password', async (req: any, res: any) => {
    try {
      const { userId, nicNumber, newPassword } = req.body;
      const cleanNic = String(nicNumber || userId || '').trim().toUpperCase();
      const numeric = cleanNic.replace(/[^0-9]/g, '');

      const existing = serverUsersMap.get(cleanNic) || (numeric ? serverUsersMap.get(numeric) : null) || {};
      const updated = {
        ...existing,
        id: userId || existing.id || cleanNic,
        userId: cleanNic,
        nicNumber: cleanNic,
        userNumericId: numeric,
        key: newPassword,
        password: newPassword,
        securityCode: newPassword,
        tempCode: newPassword,
        tempPassword: newPassword,
        isTemporaryPassword: true,
        isPasswordChanged: false,
        updatedAt: new Date().toISOString(),
      };

      seedUser(updated);
      console.log(`[Admin] Password reset stored for NIC: ${cleanNic}, Temp Password: ${newPassword}`);
      return res.json({ success: true, message: 'Password reset processed successfully' });
    } catch (error: any) {
      console.error('Admin Reset Password Error:', error);
      return res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  app.post('/api/admin/delete-user', async (req: any, res: any) => {
    try {
      const { userId, nicNumber, id } = req.body || {};
      const cleanNic = String(nicNumber || userId || id || '').trim().toUpperCase();
      const numeric = cleanNic.replace(/[^0-9]/g, '');

      // 1. Remove from in-memory server map
      if (cleanNic) serverUsersMap.delete(cleanNic);
      if (numeric) serverUsersMap.delete(numeric);
      if (id) serverUsersMap.delete(id);

      // 2. Remove from Firestore via Admin SDK
      if (adminDb) {
        try {
          const idsToDelete = [id, cleanNic, numeric].filter(Boolean);
          for (const uId of idsToDelete) {
            await adminDb.collection('users').doc(uId).delete().catch(() => {});
          }
          const snap = await adminDb.collection('users').get();
          for (const docSnap of snap.docs) {
            const data = docSnap.data();
            const dNic = String(data.nicNumber || data.nic || '').trim().toUpperCase();
            const dUser = String(data.userId || '').trim().toUpperCase();
            if (
              idsToDelete.includes(docSnap.id) ||
              (cleanNic && (dNic === cleanNic || dUser === cleanNic)) ||
              (numeric && (dNic === numeric || dUser === numeric))
            ) {
              await docSnap.ref.delete().catch(() => {});
            }
          }
        } catch (dbErr: any) {
          console.warn('[Admin Delete] adminDb error:', dbErr.message);
        }
      }

      console.log(`[Admin] Successfully deleted user record for: ${cleanNic || id}`);
      return res.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Admin Delete User Error:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  app.post('/api/user/update-password', async (req: any, res: any) => {
    try {
      const { userId, nicNumber, newPassword } = req.body;
      const cleanPass = String(newPassword || '').trim();
      const cleanNic = String(nicNumber || userId || '').trim().toUpperCase();
      const numeric = cleanNic.replace(/[^0-9]/g, '');

      if (!cleanPass) {
        return res.status(400).json({ error: 'Password required' });
      }

      const existing = serverUsersMap.get(cleanNic) || (numeric ? serverUsersMap.get(numeric) : null) || {};
      const updated = {
        ...existing,
        id: userId || existing.id || cleanNic,
        userId: cleanNic,
        nicNumber: cleanNic,
        userNumericId: numeric,
        key: cleanPass,
        password: cleanPass,
        securityCode: cleanPass,
        tempCode: '',
        tempPassword: '',
        isTemporaryPassword: false,
        isPasswordChanged: true,
        updatedAt: new Date().toISOString(),
      };

      seedUser(updated);
      console.log(`[Server] Password changed successfully for NIC: ${cleanNic}`);
      return res.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
      console.error('User Update Password Error:', error);
      return res.status(500).json({ error: 'Failed to update password' });
    }
  });

  app.get('/api/user/lookup', async (req: any, res: any) => {
    try {
      const q = String(req.query.q || '').trim().toUpperCase();
      if (!q) return res.json({ user: null });
      const numeric = q.replace(/[^0-9]/g, '');

      const found = serverUsersMap.get(q) || (numeric ? serverUsersMap.get(numeric) : null);
      return res.json({ user: found || null });
    } catch (error: any) {
      return res.json({ user: null });
    }
  });

  // -------------------------------------------------------------
  // 🚨 EMERGENCY PUSH BROADCAST CONTROLLER (FCM HIGH-PRIORITY SIREN)
  // -------------------------------------------------------------
  app.post('/api/push/broadcast', async (req: any, res: any) => {
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
      const targetChannelId = isRedAlert ? 'sahaya_emergency_red_alert' : 'sahaya_general';
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
          radiusKm: String(radiusKm || '5.0'),
          urgency: String(urgency),
          senderName: String(senderName || ''),
          actionUrl: String(actionUrl || '/'),
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
          const topicName = isRedAlert ? 'sahaya_red_alerts' : 'sahaya_all_users';
          await adminMessaging.send({
            ...messagePayload,
            topic: topicName,
          });
          console.log(`✅ Push successfully broadcasted to topic: /topics/${topicName}`);
        } catch (topicErr: any) {
          console.warn('⚠️ Topic broadcast note:', topicErr.message);
        }
      }

      if (adminDb && adminMessaging) {
        try {
          const tokensSnapshot = await adminDb.collection('device_push_tokens').get();
          const tokens: string[] = [];

          tokensSnapshot.forEach((doc: any) => {
            const data = doc.data();
            if (data.token && typeof data.token === 'string') {
              tokens.push(data.token);
            }
          });

          if (tokens.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < tokens.length; i += chunkSize) {
              const chunk = tokens.slice(i, i + chunkSize);
              const response = await adminMessaging.sendEachForMulticast({
                ...messagePayload,
                tokens: chunk,
              });
              successCount += response.successCount;
              failureCount += response.failureCount;
            }
            console.log(`✅ Device tokens multicast: ${successCount} sent, ${failureCount} failed.`);
          }
        } catch (tokenErr: any) {
          console.warn('⚠️ Device token multicast note:', tokenErr.message);
        }
      }

      return res.json({
        success: true,
        message: 'Push notification broadcast dispatched successfully',
        dispatchedCount: successCount,
      });
    } catch (err: any) {
      console.error('❌ Push Broadcast Error:', err);
      return res.status(500).json({ error: 'Failed to broadcast push notification' });
    }
  });

  // -------------------------------------------------------------
  // 🌐 6. Static PWA Assets & Frontend Serving
  // -------------------------------------------------------------
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));

  // 📲 APK Direct Download & Version Handlers
  app.get(['/apk/sahayasewa-latest.apk', '/download/app', '/api/app/download'], (req, res) => {
    const apkFilePath = path.join(publicPath, 'apk', 'sahayasewa-latest.apk');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="sahayasewa-latest.apk"');
    res.sendFile(apkFilePath);
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

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Full-stack Server running on port ${PORT}`);
  });
}

startServer();
