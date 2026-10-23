import React, { useState } from 'react';

import MarketplaceItemDetailModal from './MarketplaceItemDetailModal';

interface MarketItem {

  id: string;

  title: string;

  price: number;

  category: string;

  sellerId: string;

  sellerName: string;

  description?: string;

  imageUrl?: string;

  [key: string]: any;

}

interface User {

  id: string;

  name: string;

  email?: string;

  [key: string]: any;

}

interface MarketplaceViewProps {

  items: MarketItem[];

  currentUser: User;

  language: string;

}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({

  items,

  currentUser,

  language,

}) => {

  const [selectedDetailItem, setSelectedDetailItem] = useState<MarketItem | null>(null);

  const filteredSellerItems = items;

  return (

    <div className="p-4 space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {filteredSellerItems.map((item) => (

          <div

            key={item.id}

            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between"

          >

            <div>

              {item.imageUrl && (

                <img

                  src={item.imageUrl}

                  alt={item.title}

                  className="w-full h-48 object-cover rounded-md mb-3"

                />

              )}

              <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>

              <p className="text-xl font-bold text-green-600 my-1">

                LKR {item.price.toLocaleString()}

              </p>

              {item.description && (

                <p className="text-sm text-gray-600 line-clamp-2 mb-3">

                  {item.description}

                </p>

              )}

            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">

              <button

                type="button"

                onClick={() => setSelectedDetailItem(item)}

                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md text-sm transition-colors duration-150 flex items-center justify-center gap-2 shadow-sm"

              >

<span>විස්තර සහ මිල සංසන්දනය ➔</span>

              </button>

            </div>

          </div>

        ))}

      </div>

      <MarketplaceItemDetailModal

        isOpen={Boolean(selectedDetailItem)}

        onClose={() => setSelectedDetailItem(null)}

        item={selectedDetailItem}

        allItems={items}

        onSelectItem={(newItem) => setSelectedDetailItem(newItem)}

        currentUser={currentUser}

        language={language}

      />

    </div>

  );

};

export default MarketplaceView;

