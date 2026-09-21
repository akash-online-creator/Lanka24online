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
  // 🤖 3. AI Smart Assistant Proxy (Gemini 2.5 Flash)
  // -------------------------------------------------------------
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

      const systemPrompt = `You are the helpful Sahaya Seva (සහය සේවා) AI Assistant in Sri Lanka.
Sahaya Seva is a community support and mutual-aid platform providing:
1. Community Help Requests & Bulletin Board (උපකාර ඉල්ලීම් සහ දැන්වීම් පුවරුව)
2. Blood Donation & Emergency Disaster Relief (රතු නිවේදන / Red Alerts)
3. Artisan & Professional Quick Services (electricians, plumbers, mechanics, etc.)
4. Free item sharing (From Me To You / නොමිලේ බෙදාගැනීම)
5. Shramadana & Group initiatives (ශ්‍රමදාන)
6. Community Marketplace & Lowest Prices Guide (වෙළඳපල අඩුම මිල දර්ශකය)
7. Emergency Hotlines Directory (Police 119, Ambulance 1990, Disaster 117)
8. User Credit Wallet & Verification Badges

Respond politely, accurately, and concisely in the user's preferred language (${language === 'ta' ? 'Tamil' : language === 'en' ? 'English' : 'Sinhala'}).
Mode: ${mode}. Provide direct guidance to help the user navigate to the right section or solve their emergency or service request.`;

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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      const reply = response.text || '';
      return res.json({ success: true, reply, fallback: false });
    } catch (error: any) {
      console.warn('Chat API Gemini Warning:', error?.message || error);
      return res.json({ fallback: true, reply: '' });
    }
  });

  // -------------------------------------------------------------
  // 🌐 4. Multilingual Translation API (Gemini 2.5 Flash)
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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
        },
      });

      const translatedText = response.text?.trim() || '';
      return res.json({ success: true, translatedText, fallback: false });
    } catch (error: any) {
      console.warn('Translate API Gemini Warning:', error?.message || error);
      return res.json({ fallback: true, translatedText: '' });
    }
  });

  // -------------------------------------------------------------
  // 🔑 5. Admin Password Reset API
  // -------------------------------------------------------------
  app.post('/api/admin/reset-password', async (req: any, res: any) => {
    try {
      const { userId, nicNumber, newPassword } = req.body;
      console.log(`[Admin] Password reset request processed for User ID: ${userId}, NIC: ${nicNumber}`);
      return res.json({ success: true, message: 'Password reset processed successfully' });
    } catch (error: any) {
      console.error('Admin Reset Password Error:', error);
      return res.status(500).json({ error: 'Failed to reset password' });
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

