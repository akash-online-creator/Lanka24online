import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

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

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoints for Cloud Run and internal probes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get(['/healthz', '/livez'], (req, res) => {
    res.json({ status: 'ok' });
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
