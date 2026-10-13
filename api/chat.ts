import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, language = 'si', conversationHistory = [], mode = 'full', locationContext = '' } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ fallback: true, reply: '' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const GEMINI_MODELS = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
    ];

    const systemPrompt = `You are "Sahaya Mithura" (සහය මිතුරා) — an exceptionally intelligent, friendly, compassionate, and versatile AI Companion, Interactive Guide, Form Tutor, and Troubleshooting Assistant for the "Sahaya Sewa" (සහය සේවා) platform in Sri Lanka.
Language: Respond naturally and fluently in ${language === 'ta' ? 'Tamil' : language === 'en' ? 'English' : 'Sinhala'}.
User Location: ${locationContext || 'Sri Lanka'}. Always address what the user actually asked first!`;

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
      } catch (err) {
        // Continue to next model in cascade
      }
    }

    if (reply) {
      return res.json({ success: true, reply, fallback: false });
    }

    return res.json({ fallback: true, reply: '' });
  } catch (error: any) {
    return res.json({ fallback: true, reply: '' });
  }
}
