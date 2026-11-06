import { GoogleGenAI } from '@google/genai';

const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
];

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, language = 'si', conversationHistory = [], mode = 'full', locationContext = '' } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(200).json({ fallback: true, reply: '' });
    }

    const systemPrompt = `You are "Sahaya Mithura" (සහය මිතුරා) — the official, all-knowing, compassionate, and intelligent AI Companion, Interactive Guide, Form Tutor, and Troubleshooting Expert for the "Sahaya Sewa" (සහය සේවා) platform in Sri Lanka.

- Understand ANY question regardless of how the user asks it: formal Sinhala, colloquial Sinhala, Singlish (Sinhala written in English letters), Tamil, or English.
- Diagnose the user's issue and provide direct, step-by-step solutions across all Sahaya Sewa features:
  1. Registration & Auth (NIC + Selfie verification, 4-Digit Quick PIN login, Demo Mode, Password Reset via Issues & Help).
  2. AI Voice Help (හඬ සහය - record voice up to 2 mins, pick Quick Services Rs.25, General Help Rs.25, or Red Alert Free).
  3. 15km Red Alert Sirens & SOS Live Tracker (works even with screen off via Wake Lock & Background Push, 100% Free).
  4. Emergency Blood Radar (instant district donor matching, 100% Free).
  5. 24/7 Quick Artisan Services & Verified Professionals (15km radar, 4-digit Start PIN, transparent invoice).
  6. Transparent Aid Ledger (6-digit secret PIN for relief camps to prevent fraud).
  7. Community Help Bulletin (Rs.25 per post, Singlish search, district filter, Post Boost).
  8. Jobs Portal (රැකියා පියස) & Accommodations (නවාතැන් පහසුකම්) with interactive maps.
  9. Cashless Barter Exchange (භාණ්ඩ හුවමාරුව) & From Me To You (මගෙන් ඔබට 100% Free gifts).
  10. Find For Me (Lost & Found), Marketplace Lowest Prices, Shramadana Group Work, Wallet, QR Pay, and S-Points Leaderboard.
- Language: Respond naturally in ${language === 'ta' ? 'Tamil' : language === 'en' ? 'English' : 'Sinhala'}.
- Mode: ${mode}. Location: ${locationContext || 'Sri Lanka'}.`;

    const rawHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
    const sanitizedTurns: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const h of rawHistory) {
      if (!h || !h.text) continue;
      const role: 'user' | 'model' = h.role === 'model' ? 'model' : 'user';
      if (sanitizedTurns.length === 0 && role === 'model') continue;
      const lastTurn = sanitizedTurns[sanitizedTurns.length - 1];
      if (lastTurn && lastTurn.role === role) {
        lastTurn.parts[0].text += `\n${String(h.text)}`;
      } else {
        sanitizedTurns.push({ role, parts: [{ text: String(h.text) }] });
      }
    }

    const lastTurn = sanitizedTurns[sanitizedTurns.length - 1];
    if (lastTurn && lastTurn.role === 'user') {
      lastTurn.parts[0].text += `\n${String(message)}`;
    } else {
      sanitizedTurns.push({ role: 'user', parts: [{ text: String(message) }] });
    }

    for (const modelName of GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: sanitizedTurns,
          config: {
            systemInstruction: systemPrompt,
          },
        });
        if (response && response.text) {
          return res.status(200).json({ success: true, reply: response.text, fallback: false });
        }
      } catch {
        // Continue to next model in fallback cascade
      }
    }

    return res.status(200).json({ fallback: true, reply: '' });
  } catch {
    return res.status(200).json({ fallback: true, reply: '' });
  }
}
