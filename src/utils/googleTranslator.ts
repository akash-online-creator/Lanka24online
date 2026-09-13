import { HelpPost, Language } from '../types';
import { translateLocation } from './postTranslator';

// In-memory translation cache for instant response
const memoryCache = new Map<string, string>();
const CACHE_PREFIX = 'sahaya_gtranslate_';

/**
 * Cleanly translate any arbitrary text using Google Translate API
 */
export async function translateWithGoogle(
  text: string,
  targetLang: Language | string = 'en',
  sourceLang: string = 'auto'
): Promise<string> {
  if (!text || !text.trim()) return text;
  const trimmed = text.trim();

  // If text is purely numbers or punctuation, return as is
  if (/^[0-9\s.,!?:;/()#@%&*+=-]+$/.test(trimmed)) {
    return text;
  }

  // Cache key
  const cacheKey = `${CACHE_PREFIX}${sourceLang}_${targetLang}_${trimmed}`;

  // 1. Check memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. Check localStorage cache
  try {
    const localVal = localStorage.getItem(cacheKey);
    if (localVal) {
      memoryCache.set(cacheKey, localVal);
      return localVal;
    }
  } catch {
    // ignore storage error
  }

  // Map app lang to Google translate language codes
  const langCode = targetLang === 'si' ? 'si' : targetLang === 'ta' ? 'ta' : 'en';

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${langCode}&dt=t&q=${encodeURIComponent(
      trimmed
    )}`;

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Google Translate responded with ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0]
        .map((segment: any) => (Array.isArray(segment) ? segment[0] : ''))
        .filter(Boolean)
        .join('');

      if (translated && translated.trim()) {
        const finalResult = translated.trim();
        memoryCache.set(cacheKey, finalResult);
        try {
          localStorage.setItem(cacheKey, finalResult);
        } catch {
          // ignore storage quota error
        }
        return finalResult;
      }
    }
  } catch (error) {
    console.warn('Google Translate fetch error (falling back):', error);
  }

  return text;
}

/**
 * Translate all content fields of a HelpPost using Google Translate
 */
export async function translatePostWithGoogle(
  post: HelpPost,
  targetLang: Language | string = 'en'
): Promise<HelpPost> {
  if (!post) return post;

  const langCode = targetLang === 'si' ? 'si' : targetLang === 'ta' ? 'ta' : 'en';

  // Translate all post fields in parallel
  const [
    whatHappened,
    whatIsNeeded,
    conditions,
    specialNotice,
    transport,
    payment,
    itemLostStolenOrSearched,
    otherDetails,
    rewardDetails,
    deliveryOption,
    donationItem,
    donationRecipient,
    donationDeliveryMethod,
    exchangeHaveItem,
    exchangeWantItem,
    identifyingInfo,
  ] = await Promise.all([
    post.whatHappened ? translateWithGoogle(post.whatHappened, langCode) : Promise.resolve(post.whatHappened),
    post.whatIsNeeded ? translateWithGoogle(post.whatIsNeeded, langCode) : Promise.resolve(post.whatIsNeeded),
    post.conditions ? translateWithGoogle(post.conditions, langCode) : Promise.resolve(post.conditions),
    post.specialNotice ? translateWithGoogle(post.specialNotice, langCode) : Promise.resolve(post.specialNotice),
    post.transport ? translateWithGoogle(post.transport, langCode) : Promise.resolve(post.transport),
    post.payment ? translateWithGoogle(post.payment, langCode) : Promise.resolve(post.payment),
    post.itemLostStolenOrSearched ? translateWithGoogle(post.itemLostStolenOrSearched, langCode) : Promise.resolve(post.itemLostStolenOrSearched),
    post.otherDetails ? translateWithGoogle(post.otherDetails, langCode) : Promise.resolve(post.otherDetails),
    post.rewardDetails ? translateWithGoogle(post.rewardDetails, langCode) : Promise.resolve(post.rewardDetails),
    post.deliveryOption ? translateWithGoogle(post.deliveryOption, langCode) : Promise.resolve(post.deliveryOption),
    post.donationItem ? translateWithGoogle(post.donationItem, langCode) : Promise.resolve(post.donationItem),
    post.donationRecipient ? translateWithGoogle(post.donationRecipient, langCode) : Promise.resolve(post.donationRecipient),
    post.donationDeliveryMethod ? translateWithGoogle(post.donationDeliveryMethod, langCode) : Promise.resolve(post.donationDeliveryMethod),
    post.exchangeHaveItem ? translateWithGoogle(post.exchangeHaveItem, langCode) : Promise.resolve(post.exchangeHaveItem),
    post.exchangeWantItem ? translateWithGoogle(post.exchangeWantItem, langCode) : Promise.resolve(post.exchangeWantItem),
    post.identifyingInfo ? translateWithGoogle(post.identifyingInfo, langCode) : Promise.resolve(post.identifyingInfo),
  ]);

  // Translate replies if any
  let translatedReplies = post.replies;
  if (post.replies && post.replies.length > 0) {
    translatedReplies = await Promise.all(
      post.replies.map(async (r) => ({
        ...r,
        message: r.message ? await translateWithGoogle(r.message, langCode) : r.message,
        responderName: translateLocation(r.responderName, targetLang),
      }))
    );
  }

  return {
    ...post,
    whatHappened,
    whatIsNeeded,
    conditions,
    specialNotice,
    transport,
    payment,
    itemLostStolenOrSearched,
    otherDetails,
    rewardDetails,
    deliveryOption,
    donationItem,
    donationRecipient,
    donationDeliveryMethod,
    exchangeHaveItem,
    exchangeWantItem,
    identifyingInfo,
    locationName: translateLocation(post.locationName, targetLang),
    incidentLocation: translateLocation(post.incidentLocation, targetLang),
    replies: translatedReplies,
  };
}
