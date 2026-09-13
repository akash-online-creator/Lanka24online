import React, { useState, useEffect } from 'react';
import { MarketItem } from '../types';
import { Flame, TrendingDown, ChevronRight, Tag, ArrowUpRight, Sparkles } from 'lucide-react';

interface MarketplaceNewsTickerProps {
  items: MarketItem[];
  onOpenLowestPrices: (item?: MarketItem) => void;
  onSelectItem?: (item: MarketItem) => void;
}

export const MarketplaceNewsTicker: React.FC<MarketplaceNewsTickerProps> = ({
  items,
  onOpenLowestPrices,
  onSelectItem
}) => {
  // Filter items that have prices and sort by lowest price
  const pricedItems = items
    .filter((it) => it.type === 'seller_item' && typeof it.price === 'number' && it.price > 0)
    .sort((a, b) => (a.price || 0) - (b.price || 0));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (pricedItems.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % pricedItems.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [pricedItems.length, isHovered]);

  if (pricedItems.length === 0) return null;

  const currentItem = pricedItems[currentIndex];

  const handleTickerClick = (e: React.MouseEvent) => {
    onOpenLowestPrices(currentItem);
  };

  return (
    <div
      className="w-full relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 dark:from-amber-950/30 dark:via-emerald-950/30 dark:to-teal-950/30 border-2 border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-2.5 sm:p-3 shadow-sm transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* News Badge - Clickable to open all lowest prices */}
        <button
          type="button"
          onClick={() => onOpenLowestPrices()}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
          title="සියලු අවම මිලැති භාණ්ඩ බලන්න"
        >
          <Flame className="w-4 h-4 animate-bounce text-amber-200" />
          <span className="text-[11px] sm:text-xs font-black tracking-wide uppercase whitespace-nowrap">
            අවම මිල ගනුදෙනු
          </span>
          <span className="hidden md:inline text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full font-bold">
            HOT DEALS
          </span>
        </button>

        {/* Upward Scrolling Animated Text Container */}
        <div 
          className="flex-1 min-w-0 h-8 sm:h-9 relative overflow-hidden cursor-pointer"
          onClick={handleTickerClick}
        >
          <div
            key={currentItem.id + '_' + currentIndex}
            className="w-full h-full flex items-center justify-between gap-2 animate-in slide-in-from-bottom-4 fade-in duration-500"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <div className="truncate flex items-baseline gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-zinc-100 truncate">
                  {currentItem.title}
                </span>
                <span className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full shrink-0">
                  {currentItem.quantity}
                </span>
              </div>
            </div>

            {/* Price Tag with Upward Animation Highlight */}
            <div className="shrink-0 flex items-center gap-2">
              <div className="text-right">
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium leading-none mb-0.5">
                  අවම විකුණුම් මිල
                </div>
                <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                  රු. {currentItem.price?.toLocaleString()}
                </div>
              </div>

              {/* Responsive "බලන්න" (View) button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLowestPrices(currentItem);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-zinc-700 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-zinc-600 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <span>බලන්න</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Ticker Indicator Dots */}
        <div className="shrink-0 hidden lg:flex items-center gap-1">
          {pricedItems.slice(0, 5).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentIndex % 5
                  ? 'bg-emerald-500 w-3'
                  : 'bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400'
              }`}
              title={`Deal ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
