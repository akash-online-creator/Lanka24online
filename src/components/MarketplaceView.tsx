import React, { useState, useEffect } from 'react';
import { ArrowLeft, Store, Tag } from 'lucide-react';
import MarketplaceItemDetailModal from './MarketplaceItemDetailModal';
import { getStoredMarketItems } from '../data/marketplaceData';

export interface MarketplaceViewProps {
  items?: any[];
  currentUser: any;
  language?: any;
  allTags?: any[];
  currentLocationName?: string;
  onBackToBoard?: () => void;
  onRequireRegistration?: () => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  items: propItems,
  currentUser,
  language = 'si',
  allTags = [],
  currentLocationName = 'කඩවත',
  onBackToBoard,
  onRequireRegistration
}) => {
  const [items, setItems] = useState<any[]>(() => {
    if (propItems && Array.isArray(propItems)) return propItems;
    try {
      return getStoredMarketItems();
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (propItems && Array.isArray(propItems)) {
      setItems(propItems);
    }
  }, [propItems]);

  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);

  const filteredSellerItems = Array.isArray(items) ? items : [];

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          {onBackToBoard && (
            <button
              type="button"
              onClick={onBackToBoard}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
              title="ආපසු සහය පුවරුවට"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              වෙළඳපොළ (Marketplace)
            </h2>
          </div>
        </div>
      </div>

      {filteredSellerItems.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl p-12 text-center bg-gray-50 dark:bg-zinc-900/50">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-300">
            විකිණීමට ඇති භාණ්ඩ කිසිවක් හමු නොවීය
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            තවමත් වෙළඳපොළට භාණ්ඩ එකතු කර නොමැත.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSellerItems.map((item) => (
            <div
              key={item.id}
              className="border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 flex flex-col justify-between"
            >
              <div>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-xl mb-3"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 dark:bg-zinc-800 rounded-xl mb-3 flex items-center justify-center text-gray-400">
                    <Tag className="w-8 h-8" />
                  </div>
                )}
                <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-lg font-extrabold text-emerald-600 my-1">
                  රු. {Number(item.price || 0).toLocaleString()}
                </p>
                {item.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedDetailItem(item)}
                  className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>විස්තර සහ මිල සංසන්දනය ➔</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <MarketplaceItemDetailModal
        isOpen={Boolean(selectedDetailItem)}
        onClose={() => setSelectedDetailItem(null)}
        item={selectedDetailItem}
        allItems={filteredSellerItems}
        onSelectItem={(newItem) => setSelectedDetailItem(newItem)}
        currentUser={currentUser}
        language={language}
      />
    </div>
  );
};

export default MarketplaceView;

