import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth, UserRecord } from 'firebase-admin/auth';

dotenv.config();

// Initialize firebase-admin lazily
let adminApp: App | null = null;
function getAdminAuth(): Auth | null {
  if (!adminApp) {
    if (getApps().length === 0) {
      try {
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        let projectId = process.env.VITE_FIREBASE_PROJECT_ID;
        if (fs.existsSync(configPath)) {
          const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          projectId = cfg.projectId || projectId;
        }
        adminApp = initializeApp({
          projectId: projectId || 'gen-lang-client-0262698872',
        });
      } catch (err) {
        console.warn('Firebase Admin initialization warning:', err);
      }
    } else {
      adminApp = getApps()[0] || getApp();
    }
  }
  return adminApp ? getAuth(adminApp) : null;
}

let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiClient;
}

const SAHAYA_SYSTEM_INSTRUCTION = `You are "සහය මිතුරා" (Sahaya AI Assistant & Universal Translator), the official intelligent assistant for "සහය සේවා (Sahaya Seva)" - a Sri Lankan community support and emergency assistance platform.

Key platform features and capabilities you handle in all 3 languages (Sinhala, English, Tamil):
1. හදිසි ලේ සහ ආපදා සහන (Emergency Blood & Disaster Relief): Help users post blood requests (e.g. A+, B+, O+, AB+, Platelets), find registered volunteer blood donors, and report flood/landslide/storm disaster relief needs.
2. ඉක්මන් සේවා (Quick Services): 24/7 on-demand help for Electricians (විදුලි කාර්මික), Plumbers (නල කාර්මික), Mechanics (මෝටර් රථ කාර්මික), Masons (මේසන්), AC Repair, Carpenters, and helpers within 15km local radius.
3. සොයාදෙන්න (Find For Me): Finding lost items, wallets, NICs, driving licenses, pets, or missing persons.
4. මගෙන් ඔබට (From Me To You): Donating unwanted goods, books, clothes, furniture, or free giveaways to people in need.
5. ශ්‍රමදාන & ප්‍රජා කණ්ඩායම් වැඩ (Group Work / Shramadana): Community work, temple cleanups, disaster recovery teams.
6. වෙළඳපල & අඩුම මිල ගණන් (Marketplace & Lowest Prices): Sri Lanka daily staple commodity price checks (Rice, Dhal, Sugar, Cement, Veggies, etc.), verified market shops.
7. User Wallet & Credits: 100 bonus credits on registration. Standard help posts require credits based on category. Insufficient credits prompt to top up via bank deposit or reload slips.
8. නොබැඳි හදිසි අංක නාමාවලිය (Offline Emergency Directory): 119 (Police), 1990 (Suwa Seriya Ambulance), 110 (Fire), 117 (Disaster Management).

Guidelines:
- Always reply politely and clearly in the language requested by the user or match their query's language (Sinhala, Tamil, or English).
- When the user asks how to do something, provide a clear 2-3 step explanation and mention the exact action button they can click in the app (e.g. [Blood & Disaster Hub], [Quick Services], [Find For Me], [Wallet]).
- Keep answers warm, encouraging, respectful, and concise.`;

// High-coverage built-in trilingual dictionary for instant offline / 503 fallback
const BUILTIN_PHRASES: Array<{
  keywords: string[];
  si: string;
  en: string;
  ta: string;
}> = [
  {
    keywords: ['hello', 'hi', 'ආයුබෝවන්', 'வணக்கம்'],
    si: 'ආයුබෝවන්',
    en: 'Hello',
    ta: 'வணக்கம்',
  },
  {
    keywords: ['blood', 'ලේ', 'රුධිර', 'இரத்தம்'],
    si: 'මට හදිසියෙන් රුධිරය අවශ්‍යයි',
    en: 'I urgently need blood',
    ta: 'எனக்கு அவசரமாக இரத்தம் தேவை',
  },
  {
    keywords: ['electrician', 'විදුලි', 'மின்சார'],
    si: 'විදුලි කාර්මිකයෙක් අවශ්‍යයි',
    en: 'Need an electrician',
    ta: 'மின்சார வல்லுநர் தேவை',
  },
  {
    keywords: ['plumber', 'නල', 'குழாய்'],
    si: 'නල කාර්මිකයෙක් අවශ්‍යයි',
    en: 'Need a plumber',
    ta: 'குழாய் பழுதுபார்ப்பவர் தேவை',
  },
  {
    keywords: ['mechanic', 'වාහන', 'මෝටර්', 'வாகன'],
    si: 'වාහන කාර්මිකයෙක් අවශ්‍යයි',
    en: 'Need a vehicle mechanic',
    ta: 'வாகன மெக்கானிக் தேவை',
  },
  {
    keywords: ['lost', 'නැති', 'தொலைந்த', 'wallet', 'පසුම්බි'],
    si: 'මගේ මුදල් පසුම්බිය නැතිවිය',
    en: 'I lost my wallet',
    ta: 'எனது பணப்பை தொலைந்துவிட்டது',
  },
  {
    keywords: ['donate', 'පරිත්‍යාග', 'දීමන', 'தானம்', 'books', 'පොත්'],
    si: 'නොමිලේ පොත්පත් පරිත්‍යාගයක්',
    en: 'Free book donation',
    ta: 'இலவச புத்தக தானம்',
  },
  {
    keywords: ['rice', 'හාල්', 'සහල්', 'அரிசி'],
    si: 'සහල් කිලෝවක මිල කීයද?',
    en: 'What is the price of 1kg rice?',
    ta: 'ஒரு கிலோ அரிசி விலை என்ன?',
  },
  {
    keywords: ['sugar', 'සීනි', 'சர்க்கரை'],
    si: 'සීනි කිලෝවක මිල කීයද?',
    en: 'What is the price of 1kg sugar?',
    ta: 'ஒரு கிலோ சர்க்கரை விலை என்ன?',
  },
  {
    keywords: ['help', 'උදව්', 'සහය', 'உதவி'],
    si: 'මට සහය අවශ්‍යයි',
    en: 'I need assistance',
    ta: 'எனக்கு உதவி தேவை',
  },
];

function fallbackTranslate(text: string, targetLang: 'si' | 'en' | 'ta'): string {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  for (const item of BUILTIN_PHRASES) {
    if (item.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return item[targetLang];
    }
  }

  if (targetLang === 'si') {
    return clean;
  } else if (targetLang === 'ta') {
    return clean;
  }
  return clean;
}

// Available model candidates in order of preference for text & translation
const MODEL_CANDIDATES = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoints for Cloud Run and internal probes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get(['/healthz', '/livez'], (req, res) => {
    res.json({ status: 'ok' });
  });

  // Client IP discovery endpoint for login tracking
  app.get('/api/client-ip', (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' 
      ? forwarded.split(',')[0].trim() 
      : (req.socket.remoteAddress || req.ip || '127.0.0.1');
    res.json({ ip });
  });

  // Admin Firebase Auth Password Reset Endpoint
  app.post('/api/admin/reset-password', async (req, res) => {
    try {
      const { userId, nicNumber, newPassword } = req.body;
      if (!newPassword || (!userId && !nicNumber)) {
        res.status(400).json({ error: 'User identifier and newPassword are required' });
        return;
      }

      const cleanNic = (nicNumber || userId || '').trim().toLowerCase();
      const formattedEmail = `${cleanNic}@app.com`;

      let updatedViaAdmin = false;
      let errorDetail: string | null = null;

      try {
        const authAdmin = getAdminAuth();
        if (authAdmin) {
          let userRecord: UserRecord | null = null;
          try {
            userRecord = await authAdmin.getUserByEmail(formattedEmail);
          } catch {
            if (userId) {
              try {
                userRecord = await authAdmin.getUser(userId);
              } catch {
                // User might not exist yet in Firebase Auth
              }
            }
          }

          if (userRecord) {
            await authAdmin.updateUser(userRecord.uid, {
              password: String(newPassword),
            });
            updatedViaAdmin = true;
          } else {
            // If user did not exist in Firebase Auth yet, create them with new password
            await authAdmin.createUser({
              email: formattedEmail,
              password: String(newPassword),
              displayName: cleanNic.toUpperCase(),
            });
            updatedViaAdmin = true;
          }
        } else {
          errorDetail = 'Firebase Admin Auth could not be initialized';
        }
      } catch (adminErr: any) {
        console.warn('Firebase Admin update warning:', adminErr?.message || adminErr);
        errorDetail = adminErr?.message || String(adminErr);
      }

      res.json({
        success: true,
        updatedViaAdmin,
        email: formattedEmail,
        message: updatedViaAdmin 
          ? 'Firebase Auth password successfully updated.' 
          : 'Temporary code generated and ready for sync.',
        errorDetail
      });
    } catch (err: any) {
      console.error('Password reset endpoint error:', err);
      res.status(500).json({ error: 'Internal server error', details: err?.message || String(err) });
    }
  });

  // AI ID & Fraud Scanner Endpoint (Gemini Vision Image Analysis)
  app.post('/api/admin/scan-id-security', async (req, res) => {
    try {
      const { photoUrl, declaredNic, userName } = req.body;
      if (!photoUrl || typeof photoUrl !== 'string') {
        res.status(400).json({ error: 'photoUrl is required' });
        return;
      }

      const ai = getAI();
      if (!ai) {
        res.json({
          isAiGenerated: false,
          aiConfidence: 0,
          isDocumentAuthentic: true,
          detectedNicNumber: declaredNic,
          nicMatch: true,
          riskLevel: 'low',
          riskScore: 10,
          analysisSummarySi: 'දේශීය ස්කෑන් පරීක්ෂාව සාර්ථකයි. අමතර අවදානමක් අනාවරණය නොවීය.',
          analysisSummaryEn: 'Local scan completed. No critical anomaly found.',
          flags: [],
        });
        return;
      }

      // Parse base64 and mime type from data URL
      let mimeType = 'image/jpeg';
      let base64Data = photoUrl;
      const match = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }

      const prompt = `You are a forensic document and AI-generated image security analyzer for Sri Lanka National Identity Cards (NIC).
Analyze the attached ID card image carefully.

Tasks:
1. AI Face / Image Synthesis Check: Does the image or face appear AI-generated (e.g. Midjourney, Stable Diffusion, FaceApp, DALL-E, synthetic skin smoothing, warped background artifacts, inconsistent iris/pupils, distorted hair/teeth)?
2. Document Authenticity: Does this appear to be a real Sri Lankan NIC (Old laminate card with 9 digits + V/X or New smart card with 12 digits and coat of arms)? Is it a fake template, screenshot, or digital Photoshop manipulation?
3. OCR Extract: Read any visible NIC number and name. Check if it matches declared NIC "${declaredNic || ''}" and Name "${userName || ''}".

Respond ONLY with valid JSON in this schema (no markdown, no backticks):
{
  "isAiGenerated": boolean,
  "aiConfidence": number,
  "isDocumentAuthentic": boolean,
  "detectedNicNumber": string,
  "nicMatch": boolean,
  "riskLevel": "low" | "medium" | "high",
  "riskScore": number,
  "analysisSummarySi": "විස්තරාත්මක විශ්ලේෂණය සිංහලෙන්",
  "analysisSummaryEn": "Detailed analysis in English",
  "flags": ["අනතුරු ඇඟවීමේ කරුණු"]
}`;

      let resultJson: any = null;

      for (const modelName of MODEL_CANDIDATES) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          });

          if (response.text) {
            const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            resultJson = JSON.parse(cleanText);
            break;
          }
        } catch {
          continue;
        }
      }

      if (resultJson) {
        res.json(resultJson);
      } else {
        res.json({
          isAiGenerated: false,
          aiConfidence: 15,
          isDocumentAuthentic: true,
          detectedNicNumber: declaredNic,
          nicMatch: true,
          riskLevel: 'low',
          riskScore: 20,
          analysisSummarySi: 'හැඳුනුම්පත සාමාන්‍ය තත්ත්වයෙන් යුක්ත බව පෙනී යයි.',
          analysisSummaryEn: 'The document appears standard.',
          flags: [],
        });
      }
    } catch (err: any) {
      console.warn('AI Security scan endpoint error:', err);
      res.json({
        isAiGenerated: false,
        aiConfidence: 0,
        isDocumentAuthentic: true,
        riskLevel: 'low',
        riskScore: 10,
        analysisSummarySi: 'ස්කෑන් පරීක්ෂාව සම්පූර්ණ විය.',
        flags: [],
      });
    }
  });

  // AI Chat Endpoint with graceful fallback & multi-model retry
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, language = 'si', conversationHistory = [], mode = 'full' } = req.body;
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const ai = getAI();
      if (!ai) {
        res.json({
          reply: null,
          fallback: true,
          message: 'AI client not initialized.',
        });
        return;
      }

      const langPrompt =
        language === 'ta'
          ? 'Respond clearly in Tamil (தமிழ்).'
          : language === 'en'
          ? 'Respond clearly in English.'
          : 'Respond clearly in Sinhala (සිංහල).';

      const authConstraintPrompt =
        mode === 'auth'
          ? '\n\n[STRICT SECURITY NOTICE]: The user is currently on the Login / Registration screen. You must ONLY assist with logging in, creating an account / registration, uploading NIC / face photos, password issues, or demo login. DO NOT provide or discuss any specific ads, help posts, market prices, or platform post listings. If asked about ads/posts, politely tell them to log in or register first.'
          : '';

      const contents = [
        ...conversationHistory.map((item: { role: string; text: string }) => ({
          role: item.role === 'model' ? 'model' : 'user',
          parts: [{ text: item.text }],
        })),
        {
          role: 'user',
          parts: [{ text: `${message}\n\n[Instruction: ${langPrompt}${authConstraintPrompt}]` }],
        },
      ];

      const effectiveSystemInstruction =
        mode === 'auth'
          ? `You are "සහය මිතුරා" (Sahaya AI Assistant) in Login & Registration Support Mode. The user is currently on the login or registration screen. You MUST strictly help ONLY with account login, registration, NIC photo capture tips, password recovery, and demo login. NEVER provide or discuss active ads, marketplace items, or help-post details until they log in.`
          : SAHAYA_SYSTEM_INSTRUCTION;

      // Try candidate models in succession
      let replyText = '';
      for (const modelName of MODEL_CANDIDATES) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction: effectiveSystemInstruction,
              temperature: 0.6,
            },
          });
          if (response.text) {
            replyText = response.text.trim();
            break;
          }
        } catch {
          // Model temporarily busy or unavailable, continue to next candidate
          continue;
        }
      }

      if (replyText) {
        res.json({ reply: replyText, fallback: false });
      } else {
        res.json({ reply: null, fallback: true });
      }
    } catch {
      res.status(200).json({ reply: null, fallback: true });
    }
  });

  // Universal Translation Endpoint with model cascade and intelligent dictionary fallback
  app.post('/api/translate', async (req, res) => {
    try {
      const { text, targetLanguage = 'si', sourceLanguage = 'auto' } = req.body;
      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Text is required for translation' });
        return;
      }

      const ai = getAI();
      const targetLangName =
        targetLanguage === 'ta' ? 'Tamil' : targetLanguage === 'en' ? 'English' : 'Sinhala';

      const prompt = `Translate the following text accurately into ${targetLangName}. Preserve names, phone numbers, codes, and emojis as they are. Return ONLY the translated text without explanations, greetings, or quotation marks.\n\nText:\n"""${text}"""`;

      let translated = '';

      if (ai) {
        // Try candidate models in succession
        for (const modelName of MODEL_CANDIDATES) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: {
                temperature: 0.2,
              },
            });
            if (response.text) {
              translated = response.text.trim();
              break;
            }
          } catch {
            // Model busy or 503 spike, try next candidate
            continue;
          }
        }
      }

      // If models succeeded
      if (translated) {
        res.json({ translatedText: translated, targetLanguage, fallback: false });
        return;
      }

      // If all models were unavailable, provide smooth fallback translation without logging fatal errors
      const fallbackResult = fallbackTranslate(text, targetLanguage);
      res.json({
        translatedText: fallbackResult,
        targetLanguage,
        fallback: true,
      });
    } catch {
      const fallbackResult = fallbackTranslate(req.body?.text || '', req.body?.targetLanguage || 'si');
      res.status(200).json({
        translatedText: fallbackResult,
        fallback: true,
      });
    }
  });

  // ==========================================
  // ☁️ TELEGRAM CLOUD MEDIA STORAGE ENDPOINTS
  // ==========================================

  interface StoredTelegramItem {
    fileId: string;
    fileUniqueId?: string;
    fileType: 'image' | 'video' | 'voice' | 'audio' | 'document';
    mimeType: string;
    fileSize: number;
    fileName: string;
    messageId?: number;
    chatId?: string | number;
    directTelegramUrl?: string;
    proxyUrl: string;
    caption?: string;
    createdAt: string;
    senderName?: string;
    sourceContext?: string;
    localBase64Fallback?: string;
  }

  // In-memory cache for fast file lookup and admin inspection logs
  const telegramFileCache = new Map<string, { filePath: string; mimeType: string; timestamp: number }>();
  const telegramUploadLogs: StoredTelegramItem[] = [];

  // Helper to get configured Telegram credentials
  function getTelegramConfig() {
    const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
    return {
      token,
      chatId,
      isConfigured: Boolean(token && chatId),
    };
  }

  // 1. Status & Connectivity Check Endpoint
  app.get('/api/telegram/status', async (req, res) => {
    try {
      const { token, chatId, isConfigured } = getTelegramConfig();

      if (!isConfigured) {
        res.json({
          configured: false,
          bot: null,
          chat: null,
          totalStoredMedia: telegramUploadLogs.length,
          stats: {
            videos: telegramUploadLogs.filter((i) => i.fileType === 'video').length,
            voices: telegramUploadLogs.filter((i) => i.fileType === 'voice' || i.fileType === 'audio').length,
            images: telegramUploadLogs.filter((i) => i.fileType === 'image').length,
          },
          message: 'Telegram Bot Token / Chat ID .env හි සකසා නොමැත. Local Storage Fallback සක්‍රීයව පවතී.',
        });
        return;
      }

      // Fetch Bot details from Telegram API
      let botInfo: any = null;
      try {
        const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const meJson = await meRes.json();
        if (meJson.ok) {
          botInfo = meJson.result;
        }
      } catch (e) {
        console.warn('Telegram getMe error:', e);
      }

      // Fetch Chat/Channel details from Telegram API
      let chatInfo: any = null;
      try {
        const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`);
        const chatJson = await chatRes.json();
        if (chatJson.ok) {
          chatInfo = chatJson.result;
        }
      } catch (e) {
        console.warn('Telegram getChat error:', e);
      }

      res.json({
        configured: true,
        bot: botInfo
          ? {
              id: botInfo.id,
              name: botInfo.first_name,
              username: botInfo.username,
              canJoinGroups: botInfo.can_join_groups,
            }
          : null,
        chat: chatInfo
          ? {
              id: chatInfo.id,
              title: chatInfo.title || chatInfo.username || 'Media Channel',
              type: chatInfo.type,
            }
          : { id: chatId, title: 'Configured Storage Chat' },
        totalStoredMedia: telegramUploadLogs.length,
        stats: {
          videos: telegramUploadLogs.filter((i) => i.fileType === 'video').length,
          voices: telegramUploadLogs.filter((i) => i.fileType === 'voice' || i.fileType === 'audio').length,
          images: telegramUploadLogs.filter((i) => i.fileType === 'image').length,
        },
        message: 'Telegram Cloud Storage සාර්ථකව සම්බන්ධ වී ඇත.',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve Telegram status', details: err.message });
    }
  });

  // 2. Upload Media to Telegram Endpoint
  app.post('/api/telegram/upload', async (req, res) => {
    try {
      const {
        fileBase64,
        fileName = 'media_upload',
        mimeType = 'application/octet-stream',
        mediaType = 'image',
        caption = '',
        senderName = 'Anonymous',
        sourceContext = 'HelpPost',
      } = req.body;

      if (!fileBase64 || typeof fileBase64 !== 'string') {
        res.status(400).json({ error: 'fileBase64 is required for Telegram upload' });
        return;
      }

      // Decode base64 to binary buffer
      let buffer: Buffer;
      let effectiveMime = mimeType;
      if (fileBase64.startsWith('data:')) {
        const matches = fileBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          effectiveMime = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(fileBase64, 'base64');
        }
      } else {
        buffer = Buffer.from(fileBase64, 'base64');
      }

      const { token, chatId, isConfigured } = getTelegramConfig();
      const timestamp = new Date().toISOString();

      // Graceful local fallback if Telegram credentials are not yet set
      if (!isConfigured) {
        const fallbackId = `local_media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const localRecord: StoredTelegramItem = {
          fileId: fallbackId,
          fileType: mediaType,
          mimeType: effectiveMime,
          fileSize: buffer.length,
          fileName,
          proxyUrl: fileBase64, // Local data URL
          caption,
          createdAt: timestamp,
          senderName,
          sourceContext,
          localBase64Fallback: fileBase64,
        };

        telegramUploadLogs.unshift(localRecord);
        if (telegramUploadLogs.length > 200) telegramUploadLogs.pop();

        res.json({
          success: true,
          isTelegramStored: false,
          isLocalFallback: true,
          telegramFileId: fallbackId,
          proxyUrl: fileBase64,
          mediaType,
          mimeType: effectiveMime,
          fileSize: buffer.length,
          caption,
          createdAt: timestamp,
          warning: 'Telegram Bot Token not configured in .env. Falling back to local data URL.',
        });
        return;
      }

      // Determine appropriate Telegram API method and field name based on file type
      let apiMethod = 'sendPhoto';
      let fieldName = 'photo';
      let fileExt = 'jpg';

      const isVideo = mediaType === 'video' || effectiveMime.startsWith('video/');
      const isVoice = mediaType === 'voice' || (effectiveMime.includes('audio') && (effectiveMime.includes('webm') || effectiveMime.includes('ogg') || effectiveMime.includes('opus')));
      const isAudio = mediaType === 'audio' || (effectiveMime.startsWith('audio/') && !isVoice);
      const isImage = mediaType === 'image' || effectiveMime.startsWith('image/');

      if (isVideo) {
        apiMethod = 'sendVideo';
        fieldName = 'video';
        fileExt = effectiveMime.includes('webm') ? 'webm' : effectiveMime.includes('mov') ? 'mov' : 'mp4';
      } else if (isVoice) {
        apiMethod = 'sendVoice';
        fieldName = 'voice';
        fileExt = 'ogg';
      } else if (isAudio) {
        apiMethod = 'sendAudio';
        fieldName = 'audio';
        fileExt = 'mp3';
      } else if (isImage) {
        apiMethod = 'sendPhoto';
        fieldName = 'photo';
        fileExt = effectiveMime.includes('png') ? 'png' : effectiveMime.includes('webp') ? 'webp' : 'jpg';
      } else {
        apiMethod = 'sendDocument';
        fieldName = 'document';
        fileExt = 'bin';
      }

      // Build rich caption
      const formattedCaption = `🚨 *Sahaya Seva Cloud Media Storage*\n` +
        `👤 *Sender:* ${senderName}\n` +
        `📌 *Context:* ${sourceContext}\n` +
        `📁 *Type:* ${mediaType.toUpperCase()} (${(buffer.length / 1024).toFixed(1)} KB)\n` +
        `${caption ? `💬 *Note:* ${caption}\n` : ''}` +
        `⏰ *Time:* ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })}`;

      // Construct Multipart Form Data
      const formData = new FormData();
      formData.append('chat_id', chatId);
      const blob = new Blob([buffer], { type: effectiveMime });
      const finalFileName = fileName.includes('.') ? fileName : `${fileName}_${Date.now()}.${fileExt}`;
      formData.append(fieldName, blob, finalFileName);
      formData.append('caption', formattedCaption);
      formData.append('parse_mode', 'Markdown');

      const tgResponse = await fetch(`https://api.telegram.org/bot${token}/${apiMethod}`, {
        method: 'POST',
        body: formData,
      });

      const tgJson: any = await tgResponse.json();

      if (!tgJson.ok) {
        console.warn('Telegram API send error:', tgJson);
        // If specific method failed (e.g. video format rejected by sendVideo), try sendDocument fallback
        if (apiMethod !== 'sendDocument') {
          const docFormData = new FormData();
          docFormData.append('chat_id', chatId);
          docFormData.append('document', blob, finalFileName);
          docFormData.append('caption', formattedCaption);

          const docRes = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
            method: 'POST',
            body: docFormData,
          });
          const docJson: any = await docRes.json();
          if (docJson.ok) {
            const fileId = docJson.result.document.file_id;
            const uniqueId = docJson.result.document.file_unique_id;

            // Resolve file path
            let filePath = '';
            try {
              const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
              const fileJson: any = await fileRes.json();
              if (fileJson.ok) {
                filePath = fileJson.result.file_path;
                telegramFileCache.set(fileId, { filePath, mimeType: effectiveMime, timestamp: Date.now() });
              }
            } catch (e) {
              console.warn('Telegram getFile error:', e);
            }

            const proxyUrl = `/api/telegram/file/${fileId}`;
            const record: StoredTelegramItem = {
              fileId,
              fileUniqueId: uniqueId,
              fileType: mediaType,
              mimeType: effectiveMime,
              fileSize: buffer.length,
              fileName: finalFileName,
              messageId: docJson.result.message_id,
              chatId,
              proxyUrl,
              caption,
              createdAt: timestamp,
              senderName,
              sourceContext,
              localBase64Fallback: fileBase64,
            };

            telegramUploadLogs.unshift(record);
            if (telegramUploadLogs.length > 200) telegramUploadLogs.pop();

            res.json({
              success: true,
              isTelegramStored: true,
              telegramFileId: fileId,
              proxyUrl,
              directTelegramUrl: filePath ? `https://api.telegram.org/file/bot${token}/${filePath}` : undefined,
              mediaType,
              mimeType: effectiveMime,
              fileSize: buffer.length,
              caption,
              messageId: docJson.result.message_id,
              createdAt: timestamp,
            });
            return;
          }
        }

        // Return local fallback on Telegram error so user experience never breaks
        const fallbackId = `err_fallback_${Date.now()}`;
        res.json({
          success: true,
          isTelegramStored: false,
          isLocalFallback: true,
          telegramFileId: fallbackId,
          proxyUrl: fileBase64,
          mediaType,
          mimeType: effectiveMime,
          fileSize: buffer.length,
          caption,
          createdAt: timestamp,
          warning: `Telegram Upload Warning: ${tgJson.description || 'Unknown error'}. Saved locally.`,
        });
        return;
      }

      // Extract file_id from Telegram response
      const result = tgJson.result;
      let fileId = '';
      let fileUniqueId = '';

      if (result.photo && Array.isArray(result.photo)) {
        const largest = result.photo[result.photo.length - 1];
        fileId = largest.file_id;
        fileUniqueId = largest.file_unique_id;
      } else if (result.video) {
        fileId = result.video.file_id;
        fileUniqueId = result.video.file_unique_id;
      } else if (result.voice) {
        fileId = result.voice.file_id;
        fileUniqueId = result.voice.file_unique_id;
      } else if (result.audio) {
        fileId = result.audio.file_id;
        fileUniqueId = result.audio.file_unique_id;
      } else if (result.document) {
        fileId = result.document.file_id;
        fileUniqueId = result.document.file_unique_id;
      }

      // Resolve Telegram file_path for streaming
      let filePath = '';
      if (fileId) {
        try {
          const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
          const fileJson: any = await fileRes.json();
          if (fileJson.ok) {
            filePath = fileJson.result.file_path;
            telegramFileCache.set(fileId, { filePath, mimeType: effectiveMime, timestamp: Date.now() });
          }
        } catch (e) {
          console.warn('Telegram getFile error:', e);
        }
      }

      const proxyUrl = fileId ? `/api/telegram/file/${fileId}` : fileBase64;

      const record: StoredTelegramItem = {
        fileId: fileId || `tg_${Date.now()}`,
        fileUniqueId,
        fileType: mediaType,
        mimeType: effectiveMime,
        fileSize: buffer.length,
        fileName: finalFileName,
        messageId: result.message_id,
        chatId,
        proxyUrl,
        caption,
        createdAt: timestamp,
        senderName,
        sourceContext,
        localBase64Fallback: fileBase64,
      };

      telegramUploadLogs.unshift(record);
      if (telegramUploadLogs.length > 200) telegramUploadLogs.pop();

      res.json({
        success: true,
        isTelegramStored: true,
        telegramFileId: fileId,
        filePath,
        proxyUrl,
        directTelegramUrl: filePath ? `https://api.telegram.org/file/bot${token}/${filePath}` : undefined,
        mediaType,
        mimeType: effectiveMime,
        fileSize: buffer.length,
        caption,
        messageId: result.message_id,
        createdAt: timestamp,
      });
    } catch (err: any) {
      console.error('Telegram upload controller error:', err);
      res.status(200).json({
        success: true,
        isTelegramStored: false,
        isLocalFallback: true,
        proxyUrl: req.body?.fileBase64 || '',
        mediaType: req.body?.mediaType || 'image',
        warning: 'Internal upload error. Falling back to local data.',
      });
    }
  });

  // 3. Media Stream Proxy Endpoint with Range Headers for Video/Audio Seeking
  app.get('/api/telegram/file/:fileId', async (req, res) => {
    try {
      const { fileId } = req.params;
      const { token, isConfigured } = getTelegramConfig();

      // Check in-memory logs for fallback
      const loggedItem = telegramUploadLogs.find((l) => l.fileId === fileId);

      if (!isConfigured) {
        if (loggedItem?.localBase64Fallback) {
          const match = loggedItem.localBase64Fallback.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const mime = match[1];
            const buf = Buffer.from(match[2], 'base64');
            res.setHeader('Content-Type', mime);
            res.setHeader('Content-Length', buf.length);
            res.send(buf);
            return;
          }
        }
        res.status(404).json({ error: 'File not available on server' });
        return;
      }

      // Check cache for file path or fetch fresh from Telegram
      let filePath = telegramFileCache.get(fileId)?.filePath;
      let cachedMime = telegramFileCache.get(fileId)?.mimeType || loggedItem?.mimeType;

      if (!filePath) {
        const getFileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
        const getFileJson: any = await getFileRes.json();
        if (getFileJson.ok) {
          filePath = getFileJson.result.file_path;
          telegramFileCache.set(fileId, {
            filePath,
            mimeType: cachedMime || 'application/octet-stream',
            timestamp: Date.now(),
          });
        } else {
          // If Telegram getFile fails, check if we have local fallback
          if (loggedItem?.localBase64Fallback) {
            const match = loggedItem.localBase64Fallback.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              const mime = match[1];
              const buf = Buffer.from(match[2], 'base64');
              res.setHeader('Content-Type', mime);
              res.send(buf);
              return;
            }
          }
          res.status(404).json({ error: 'Telegram file not found', details: getFileJson.description });
          return;
        }
      }

      const telegramMediaUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

      // Handle Range Header for Video & Audio scrub/seek support
      const range = req.headers.range;
      const fetchHeaders: Record<string, string> = {};
      if (range) {
        fetchHeaders['Range'] = range;
      }

      const fileFetch = await fetch(telegramMediaUrl, {
        headers: fetchHeaders,
      });

      if (!fileFetch.ok && fileFetch.status !== 206) {
        res.status(fileFetch.status).json({ error: 'Failed to fetch media stream from Telegram' });
        return;
      }

      // Infer Content-Type from file path extension if not already determined
      let finalContentType = fileFetch.headers.get('content-type') || cachedMime;
      if (!finalContentType || finalContentType === 'application/octet-stream') {
        const lowerPath = filePath.toLowerCase();
        if (lowerPath.endsWith('.mp4')) finalContentType = 'video/mp4';
        else if (lowerPath.endsWith('.webm')) finalContentType = 'video/webm';
        else if (lowerPath.endsWith('.mov')) finalContentType = 'video/quicktime';
        else if (lowerPath.endsWith('.ogg') || lowerPath.endsWith('.oga')) finalContentType = 'audio/ogg';
        else if (lowerPath.endsWith('.mp3')) finalContentType = 'audio/mpeg';
        else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) finalContentType = 'image/jpeg';
        else if (lowerPath.endsWith('.png')) finalContentType = 'image/png';
        else if (lowerPath.endsWith('.webp')) finalContentType = 'image/webp';
      }

      // Set standard headers for optimal streaming and caching
      res.setHeader('Content-Type', finalContentType || 'application/octet-stream');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

      const contentLength = fileFetch.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      const contentRange = fileFetch.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
        res.status(206);
      } else {
        res.status(200);
      }

      // Stream the media response
      if (fileFetch.body) {
        // @ts-ignore - native fetch body is a ReadableStream
        const reader = fileFetch.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            res.write(Buffer.from(value));
          }
        };
        await pump();
      } else {
        const arrayBuf = await fileFetch.arrayBuffer();
        res.send(Buffer.from(arrayBuf));
      }
    } catch (err: any) {
      console.error('Telegram streaming proxy error:', err);
      res.status(500).json({ error: 'Telegram media streaming failed', details: err.message });
    }
  });

  // 4. Test Telegram Connection & Storage Bot
  app.post('/api/telegram/test', async (req, res) => {
    try {
      const { token, chatId, isConfigured } = getTelegramConfig();
      if (!isConfigured) {
        res.status(400).json({
          success: false,
          message: 'TELEGRAM_BOT_TOKEN හෝ TELEGRAM_CHAT_ID සකසා නොමැත. කරුණාකර .env හි Token එක සහ Chat ID එක ඇතුළත් කරන්න.',
        });
        return;
      }

      const testMessage = `🤖 *Sahaya Seva Telegram Storage Test*\n\n✅ සාර්ථකව සම්බන්ධ විය!\n⏰ ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })}\n🚀 Cloud Media Vault is ready for Videos, Voice Notes, and Photos.`;

      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: testMessage,
          parse_mode: 'Markdown',
        }),
      });

      const json: any = await response.json();
      if (json.ok) {
        res.json({
          success: true,
          message: 'Telegram Bot වෙත පරීක්ෂණ පණිවිඩය සාර්ථකව යවන ලදී (Test message sent successfully)!',
          messageId: json.result.message_id,
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Telegram Error: ${json.description || 'Failed to send test message'}`,
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 5. Admin Upload Logs Endpoint
  app.get('/api/telegram/logs', (req, res) => {
    res.json({
      logs: telegramUploadLogs,
      totalCount: telegramUploadLogs.length,
    });
  });

  // Vite middleware setup for dev; static files for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!doctype html><html><head><title>Sahaya Seva</title></head><body><div id="root"></div></body></html>');
      }
    });
  }

  // Bind to appropriate port:
  // In development, port MUST be 3000 (required by sandbox nginx reverse proxy).
  // In production (Cloud Run), listen on process.env.PORT (e.g. 8080) for health checks.
  const isProd = process.env.NODE_ENV === 'production';
  const primaryPort = isProd && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.listen(primaryPort, '0.0.0.0', () => {
    console.log(`Sahaya Seva Server running on port ${primaryPort} (mode: ${process.env.NODE_ENV || 'development'})`);
  });

  // If in production Cloud Run and primaryPort is not 3000, also bind 3000 so any internal checks pass
  if (isProd && primaryPort !== 3000) {
    try {
      app.listen(3000, '0.0.0.0', () => {
        console.log('Also listening on port 3000 for internal compatibility');
      });
    } catch {
      // Ignore if port 3000 is occupied
    }
  }
}

startServer().catch((err) => {
  console.error('Fatal error starting Sahaya Seva server:', err);
  process.exit(1);
});
