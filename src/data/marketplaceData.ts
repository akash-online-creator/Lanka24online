import { MarketItem, MarketShop, WeekSchedule } from '../types';
import { filterNonDeletedMarketItems, filterNonDeletedMarketShops } from '../utils/deletedPostsManager';

export const defaultWeekSchedule: WeekSchedule = {
  monday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  tuesday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  wednesday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  thursday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  friday: { isOpen: true, openTime: '08:30', closeTime: '19:00' },
  saturday: { isOpen: true, openTime: '08:30', closeTime: '18:00' },
  sunday: { isOpen: false, openTime: '09:00', closeTime: '14:00' }
};

// 🛒 වෙළඳපොළ ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල බඩු භාණ්ඩ ඉවත් කර ඇත)
export const initialMarketItems: MarketItem[] = [];

// 🏪 වෙළඳසැල් ආරම්භයේදී පිරිසිදුව හිස්ව තැබීම (සාම්පල වෙළඳසැල් ඉවත් කර ඇත)
export const initialMarketShops: MarketShop[] = [];

const MARKET_ITEMS_KEY = 'sahaya_marketplace_items';
const MARKET_SHOPS_KEY = 'sahaya_marketplace_shops';

export function getStoredMarketItems(): MarketItem[] {
  try {
    const saved = localStorage.getItem(MARKET_ITEMS_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // පෙර තිබූ sample mock items (mkt_seller_, mkt_buyer_) ස්වයංක්‍රීයව පෙරීම
        return filterNonDeletedMarketItems(
          parsed.filter((item: MarketItem) => item && !item.id?.startsWith('mkt_seller_') && !item.id?.startsWith('mkt_buyer_'))
        );
      }
    }
  } catch (e) {
    console.warn('Error reading market items:', e);
  }
  return [];
}

export function saveMarketItemsToStorage(items: MarketItem[]): void {
  localStorage.setItem(MARKET_ITEMS_KEY, JSON.stringify(filterNonDeletedMarketItems(items)));
}

export function getStoredMarketShops(): MarketShop[] {
  try {
    const saved = localStorage.getItem(MARKET_SHOPS_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // පෙර තිබූ sample mock shops (shop_) ස්වයංක්‍රීයව පෙරීම
        return filterNonDeletedMarketShops(
          parsed.filter((shop: MarketShop) => shop && !shop.id?.startsWith('shop_'))
        );
      }
    }
  } catch (e) {
    console.warn('Error reading market shops:', e);
  }
  return [];
}

export function saveMarketShopsToStorage(shops: MarketShop[]): void {
  localStorage.setItem(MARKET_SHOPS_KEY, JSON.stringify(filterNonDeletedMarketShops(shops)));
}

