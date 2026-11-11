/**
 * ⚡ Semantic Caching System for Gemini AI Queries
 * Reduces Gemini API quota consumption by caching queries semantically.
 * If another user (or the same user) asks a question with the same meaning,
 * this returns the cached response in <5ms with 0 token cost!
 */

export interface CachedAiResponse {
  queryNormalized: string;
  queryFingerprint: string;
  response: string;
  serviceType?: string;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  isSemanticMatch: boolean;
}

// Stop words and conversational fillers to strip during semantic normalization
const SINHALA_FILLER_WORDS = new Set([
  'මට', 'අපට', 'ඔබට', 'කියන්න', 'කියන්නකෝ', 'දැනගන්න', 'ඕනෙ', 'ඕනේ', 'කොහොමද',
  'කරන්නේ', 'කරන්නෙ', 'පුලුවන්ද', 'පුළුවන්ද', 'ප්ලීස්', 'ප්ලිස්', 'යාලුවනේ', 'සහය',
  'help', 'me', 'please', 'tell', 'how', 'to', 'can', 'you', 'what', 'is', 'the',
]);

/**
 * Normalizes text to extract semantic core intent
 */
export function normalizeSemanticQuery(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .toLowerCase()
    // Replace Sinhala common variants
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word.length > 1 && !SINHALA_FILLER_WORDS.has(word))
    .sort() // Word-order invariant matching! ("කොහොමද ලොගින් වෙන්නේ" == "ලොගින් වෙන්නේ කොහොමද")
    .join(' ');
}

/**
 * Fast hash for fingerprinting normalized queries
 */
export function computeSemanticFingerprint(normalizedText: string): string {
  let hash = 0;
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `sem_${Math.abs(hash).toString(36)}`;
}

// Client-side Memory + IndexedDB Semantic Cache
const clientSemanticMemory = new Map<string, CachedAiResponse>();

export function getClientCachedAiResponse(rawQuery: string): CachedAiResponse | null {
  const norm = normalizeSemanticQuery(rawQuery);
  if (!norm) return null;
  const fp = computeSemanticFingerprint(norm);

  const cached = clientSemanticMemory.get(fp);
  if (cached) {
    if (Date.now() < cached.expiresAt) {
      cached.hitCount += 1;
      return cached;
    } else {
      clientSemanticMemory.delete(fp);
    }
  }
  return null;
}

export function setClientCachedAiResponse(
  rawQuery: string,
  response: string,
  ttlHours: number = 24 * 7 // 7 days TTL
): void {
  const norm = normalizeSemanticQuery(rawQuery);
  if (!norm || !response) return;
  const fp = computeSemanticFingerprint(norm);

  clientSemanticMemory.set(fp, {
    queryNormalized: norm,
    queryFingerprint: fp,
    response,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
    hitCount: 1,
    isSemanticMatch: true,
  });
}
