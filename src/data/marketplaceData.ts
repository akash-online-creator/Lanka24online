import { MarketItem, MarketShop, WeekSchedule } from '../types';
import { filterNonDeletedMarketItems, filterNonDeletedMarketShops } from '../utils/deletedPostsManager';
export const defaultWeekSchedule: any = {
  monday: {
    isOpen: true,
    openTime: '08:30',
    closeTime: '19:00'
  },
  tuesday: {
    isOpen: true,
    openTime: '08:30',
    closeTime: '19:00'
  },
  wednesday: {
    isOpen: true,
    openTime: '08:30',
    closeTime: '19:00'
  },
  thursday: {
    isOpen: true,
    openTime: '08:30',
    closeTime: '19:00'
  },
  friday: {
    isOpen: true,
    openTime: '08:30',
    closeTime: '19:00'
  },
  saturday: {
    isOpen: true,
    openTime: '08:30',
    closeTime: '18:00'
  },
  sunday: {
    isOpen: false,
    openTime: '09:00',
    closeTime: '14:00'
  }
};
export const initialMarketItems: any = [];
export const initialMarketShops: any = [];
const MARKET_ITEMS_KEY = 'sahaya_marketplace_items';
const MARKET_SHOPS_KEY = 'sahaya_marketplace_shops';
const DUMMY_MARKET_ITEM_IDS = ['mkt_seller_1', 'mkt_seller_2', 'mkt_seller_3', 'mkt_seller_4', 'mkt_seller_5', 'mkt_seller_6', 'mkt_seller_7', 'mkt_seller_8', 'mkt_seller_free_1', 'mkt_seller_free_2', 'mkt_buyer_1', 'mkt_buyer_2'];
const DUMMY_MARKET_SHOP_IDS = ['mkt_shop_1', 'mkt_shop_2', 'mkt_biz_1', 'mkt_biz_2', 'shop_1', 'shop_2', 'shop_3', 'shop_4'];
export function isDummyMarketItem(item: any): boolean {
  if (!item) return true;
  const id = String(item.id ? item.id : '');
  if (!id) return true;
  if (DUMMY_MARKET_ITEM_IDS.includes(id)) return true;
  return false;
}
export function isDummyMarketShop(shop: any): boolean {
  if (!shop) return true;
  const id = String(shop.id ? shop.id : '');
  if (!id) return true;
  if (DUMMY_MARKET_SHOP_IDS.includes(id)) return true;
  return false;
}
export function getStoredMarketItems(): MarketItem[] {
  try {
    const saved = localStorage.getItem(MARKET_ITEMS_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((item: any) => !isDummyMarketItem(item));
        return filterNonDeletedMarketItems(cleaned);
      }
    }
  } catch (e) {
    console.warn('Error reading market items:', e);
  }
  return [];
}
export function saveMarketItemsToStorage(items: any): void {
  const cleaned = (items ? items : []).filter((item: any) => !isDummyMarketItem(item));
  localStorage.setItem(MARKET_ITEMS_KEY, JSON.stringify(filterNonDeletedMarketItems(cleaned)));
}
export function getStoredMarketShops(): MarketShop[] {
  try {
    const saved = localStorage.getItem(MARKET_SHOPS_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((shop: any) => !isDummyMarketShop(shop));
        return filterNonDeletedMarketShops(cleaned);
      }
    }
  } catch (e) {
    console.warn('Error reading market shops:', e);
  }
  return [];
}
export function saveMarketShopsToStorage(shops: any): void {
  const cleaned = (shops ? shops : []).filter((shop: any) => !isDummyMarketShop(shop));
  localStorage.setItem(MARKET_SHOPS_KEY, JSON.stringify(filterNonDeletedMarketShops(cleaned)));
}