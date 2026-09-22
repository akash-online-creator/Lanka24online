import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

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

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Telegram Credentials (.env ගොනුවෙන් ලබා ගනී)
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Telegram Channel/Group ID (-100xxxxxxxxx)

  // Multer memory storage - Files තාවකාලිකව RAM එකේ තබා ගනී
  const upload = multer({ storage: multer.memoryStorage() });

  // -------------------------------------------------------------
  // 📤 1. Telegram Cloud Storage - Media Upload Endpoint
  // -------------------------------------------------------------
  app.post('/api/telegram/upload', (upload.single('file') as any), async (req: any, res: any) => {
    try {
      if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        return res.status(500).json({ error: 'Telegram credentials සකස් කර නොමැත.' });
      }

      let fileBuffer: Buffer | null = null;
      let fileName = 'media_file';
      let fileType = req.body.type || req.body.mediaType || 'image';

      if (req.file) {
        fileBuffer = req.file.buffer;
        fileName = req.file.originalname || 'media_file';
      } else if (req.body.fileBase64) {
        let base64Data = req.body.fileBase64;
        if (base64Data.includes(',')) {
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

      // Telegram API එකට Upload කිරීම
      const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${telegramApiMethod}`, {
        method: 'POST',
        body: formData as any,
      });

      const tgData: any = await tgResponse.json();

      if (!tgData.ok) {
        console.error('Telegram Upload Error:', tgData);
        return res.status(500).json({ error: 'Telegram එකට Upload කිරීම අසාර්ථක විය.', details: tgData });
      }

      // File ID ලබා ගැනීම
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

      // App එක තුළ Play කිරීමට Proxy Stream URL එක සාදයි
      const streamUrl = `/api/telegram/file/${fileId}`;

      return res.json({
        success: true,
        fileId: fileId,
        url: streamUrl,
        proxyUrl: streamUrl,
        type: fileType,
      });
    } catch (error: any) {
      console.error('Upload Error:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  });

  // -------------------------------------------------------------
  // 🎬 2. Telegram File Stream / View Endpoint (Proxy)
  // -------------------------------------------------------------
  app.get('/api/telegram/file/:fileId', async (req: any, res: any) => {
    try {
      const { fileId } = req.params;

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
  // 🤖 3. AI Smart Assistant Proxy (Resilient Multi-Model Cascade)
  // -------------------------------------------------------------
  const GEMINI_MODELS = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
  ];

  app.post('/api/chat', async (req: any, res: any) => {
    try {
      const { message, language = 'si', conversationHistory = [], mode = 'full' } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.json({ fallback: true, reply: '' });
      }

      const systemPrompt = `You are "Sahaya Mithura" (සහය මිතුරා) — an exceptionally intelligent, friendly, compassionate, and versatile AI assistant in Sri Lanka.

🌟 Core Identity & Capabilities:
1. 🧠 ANSWER ANY QUESTION FREELY & INTELLIGENTLY (ඕනෑම ප්‍රශ්නයකට පිළිතුරු දීම):
   - You can answer ANY question the user asks on ANY topic (General Knowledge, Science, Math, Technology, History, Healthcare & First Aid, Education, Advice, Daily Living, Sinhala/English/Tamil Literature, Cooking/Recipes, Law, Travel, Coding, etc.) with the depth, clarity, and helpfulness of a world-class AI (like ChatGPT or Gemini).
   - Never refuse or evade a general question by saying "I only know Sahaya Seva". Always answer the user's specific question directly and comprehensively!

2. 🤝 SAHAYA SEVA (සහය සේවා) PLATFORM EXPERT:
   - When asked about Sahaya Seva services, you are the definitive guide:
     • Community Help Requests (උපකාර ඉල්ලීම් සහ දැන්වීම් පුවරුව)
     • Blood Donation & Disaster Radar (රතු නිවේදන / Red Alerts / ලේ පරිත්‍යාග)
     • 24/7 Artisan & Quick Services (විදුලි, නල, වාහන කාර්මික, මේසන් සේවා - 15km radar)
     • Find For Me / Lost & Found (නැතිවූ හැඳුනුම්පත්, පසුම්බි, සුරතල් සතුන්)
     • From Me To You / Free Donations (නොමිලේ පොත්පත්, ඇඳුම්, උපකරණ දීමනා)
     • Community Marketplace & Lowest Prices Guide (වෙළඳපල අඩුම මිල දර්ශකය)
     • Group Initiatives & Shramadana (ශ්‍රමදාන සහ ප්‍රජා වැඩ)
     • Verified Professional Services & Emergency Directory (119, 1990, 117)
     • Form-filling step-by-step guidance (මාතෘකාව, විස්තරය, ස්ථානය, ඡායාරූප, සම්බන්ධතා)

Guidelines:
- Language: Respond naturally and fluently in ${language === 'ta' ? 'Tamil' : language === 'en' ? 'English' : 'Sinhala'}. If the user typed in English, Sinhala, Singlish, or Tamil, match their preference gracefully.
- Tone: Warm, respectful, natural, intelligent, supportive, and polite (මිත්‍රශීලී සහ ගෞරවනීය).
- Formatting: Use clear Markdown formatting with paragraphs, bullet points, bold key terms, and numbered steps when explaining.
- Mode: ${mode}. Always address what the user actually asked first!`;

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
  // 🌐 4. Multilingual Translation API (Resilient Multi-Model Cascade)
  // -------------------------------------------------------------
  app.post('/api/translate', async (req: any, res: any) => {
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
  // 🌐 6. Frontend Serving (Vite middleware in dev, static dist in prod)
  // -------------------------------------------------------------
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

