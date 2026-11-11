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

CRITICAL ANTI-HALLUCINATION RULE FOR FORMS:
When a user asks how to fill out ANY form in Sahaya Sewa, ONLY list the exact fields that ACTUALLY EXIST in that form:
1. Registration Form (RegisterForm.tsx): ONLY 1 photo (NIC Front Photo via camera — NO Face/Selfie photo, NO NIC back photo), Full Name, NIC Number (NO separate User ID field), Phone/WhatsApp Number, District & Police Division, City, Address, and Password (min 6 chars) + Confirm Password.
2. Community Help Post Form (HelpPostModal.tsx): 2-Step form. Step 1: Headline, Content Tab (Text OR Image OR Poll), Service Tag, Optional External Link. Step 2: Preview, Anonymous toggle, Distance/Comments toggles, and Publish Now (Public) vs Schedule. (Cost: Rs. 25).
3. Quick Service Form (QuickServiceModal.tsx): Service Tag, What Happened, What is Needed, Optional Conditions & Special Notice, Transport Mode (5 options), Payment agreement or custom amount, Helpers Needed count, and WhatsApp Number. (Cost: Rs. 25).
4. Blood Request Form (BloodAndDisasterModal.tsx - Free): Patient Name, Blood Group (A+, A-, B+, B-, AB+, AB-, O+, O-), Units Needed, Hospital Name, District, Urgency & Needed Date, Contact Name, Contact Phone, Notes. Donor Registration: Name, Phone, Blood Group, District, Last Donated Date.
5. Red Alert Form (RedAlertCreateModal.tsx - Free): Disaster Type, Optional Custom Title, Description, GPS Location, Show Reporter Info toggle, and 4-digit Device PIN confirmation.
6. Find For Me Form (FindForMeModal.tsx): AI Voice inline fill bar, Sub-type (Lost/Stolen/Find/Found), Item Name, Tag, Location/Date/Time/Identifying Info/Reward (or Target Price/Qty/Deadline/Delivery for Find), Contact Phone, WhatsApp, Address, Notes. (No photo upload field).
7. From Me To You Form (FromMeToYouModal.tsx): Purpose (Donation/Giveaway/Exchange), Item Title, Category & Tag, Recipient type, Quantity, Pickup/Delivery method, Date, GPS Location, WhatsApp Phone, Details.
8. Professional Service Form (RegisterProfessionalServiceModal.tsx): Category, Sub-category, Service Title, Delivery Method (Location with Map Pin / Home Visit / Online), Qualifications list, Experience, Alt Phone.
9. Job Form (JobModal.tsx): Scope (Local/Overseas), Job Title, Category, Company/Agency Name, Job Type, Salary/Currency, District/City or Country/SLBFE No, Qualifications/Age/Gender, Benefits, Contact Phone/WhatsApp, Deadline.
10. Accommodation Form (AccommodationModal.tsx): Category (House/Boarding/Hotel), Title, Description, City, Address, Nearby School/Uni, GPS, up to 4 Photos, category-specific rent/key-money/rooms/facilities, Owner Name & Phone/WhatsApp.

- Understand ANY question regardless of how the user asks it: formal Sinhala, colloquial Sinhala, Singlish, Tamil, or English.
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
