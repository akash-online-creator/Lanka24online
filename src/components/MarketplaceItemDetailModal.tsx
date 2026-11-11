import React, { useMemo } from 'react';

import {

  X,

  Phone,

  MessageSquare,

  MapPin,

  ShieldCheck,

  Truck,

  Calendar,

  FileText,

  Tag,

  ArrowRight,

  TrendingDown,

  CheckCircle2,

  Store

} from 'lucide-react';

export type Language = 'si' | 'en' | 'ta';


export interface User {

  id: string;

  name: string;

  phone?: string;

  location?: string;

}

export interface MarketItem {
  id: string;
  title: string;
  price?: number;
  unit?: string;
  quantity?: number | string;
  sellerName?: string;
  sellerPhone?: string;
  location?: string;
  distanceKm?: number;
  hasDelivery?: boolean;
  warranty?: string;
  expiryDate?: string;
  notes?: string;
  categoryTag?: string;
  imageUrl?: string;
  userName?: string;
  userPhone?: string;
  locationName?: string;
  [key: string]: any;
}

export interface MarketplaceItemDetailModalProps {

  isOpen: boolean;

  onClose: () => void;

  item: MarketItem | null;

  allItems: MarketItem[];

  onSelectItem?: (newItem: MarketItem) => void;

  currentUser?: User | null;

  language?: Language;

}

export const MarketplaceItemDetailModal: React.FC<MarketplaceItemDetailModalProps> = ({

  isOpen,

  onClose,

  item,

  allItems = [],

  onSelectItem,

  currentUser,

  language = 'si'

}) => {

  // Find alternative listings matching the title keywords or category tag, excluding current item
  const comparisonItems = useMemo(() => {
    if (!item) return [];
    const currentTitleTokens = item.title
      .toLowerCase()
      .split(' ')
      .filter((token) => token.length > 2);

    return allItems
      .filter((otherItem) => {
        if (otherItem.id === item.id) return false;
        // Tag match
        if (
          item.categoryTag &&
          otherItem.categoryTag &&
          item.categoryTag.toLowerCase() === otherItem.categoryTag.toLowerCase()
        ) {
          return true;
        }

        // Title token match
        const otherTitle = otherItem.title.toLowerCase();
        return currentTitleTokens.some((token) => otherTitle.includes(token));
      })
      .sort((a, b) => a.price - b.price);
  }, [item, allItems]);

  if (!isOpen || !item) return null;

  const handleCall = (phone?: string) => {

    if (phone) {

      window.location.href = `tel:${phone}`;

    }

  };

  const handleWhatsApp = (phone?: string, itemTitle?: string) => {

    if (phone) {

      const cleanPhone = phone.replace(/[^0-9]/g, '');

      const text = encodeURIComponent(

        `Hello, I am interested in your listing: "${itemTitle || item.title}" on the marketplace.`

      );

      window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');

    }

  };

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4 backdrop-blur-sm">

      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl transition-all">

        {/* Modal Header */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">

          <div className="flex items-center gap-2">

            <Store className="h-6 w-6 text-emerald-600" />

            <h2 className="text-lg font-bold text-gray-800 md:text-xl">

              භාණ්ඩ විස්තර සහ මිල සංසන්දනය (Item Details & Price Comparison)

            </h2>

          </div>

          <button

            onClick={onClose}

            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"

            aria-label="Close modal"

          >

            <X className="h-5 w-5" />

          </button>

        </div>

        {/* Modal Body */}

        <div className="p-6 space-y-8">

          {/* TOP SECTION: Primary Item Detail */}

          <section className="rounded-xl border border-gray-200 bg-slate-50/50 p-6 shadow-sm">

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

              {/* Image / Icon Placeholder */}

              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-4">

                {item.imageUrl ? (

                  <img

                    src={item.imageUrl}

                    alt={item.title}

                    className="h-48 w-full rounded-md object-cover"

                  />

                ) : (

                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">

                    <Tag className="h-16 w-16 stroke-1 text-emerald-500 mb-2" />

                    <span className="text-xs font-medium">No Image Available</span>

                  </div>

                )}

              </div>

              {/* Item Info */}

              <div className="flex flex-col justify-between space-y-4 md:col-span-2">

                <div>

                  <div className="flex items-start justify-between">

                    <div>

                      <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>

                      <p className="mt-1 text-sm font-medium text-emerald-700">

                        වෙළෙන්දා: {item.sellerName}

                      </p>

                    </div>

                    <div className="text-right">

                      <span className="text-2xl font-extrabold text-emerald-600">

                        රු. {item.price.toLocaleString()}

                      </span>

                      {item.unit && (

                        <span className="text-xs font-medium text-gray-500"> / {item.unit}</span>

                      )}

                    </div>

                  </div>

                  {/* Metadata Grid */}

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm text-gray-600">

                    <div className="flex items-center gap-2">

                      <MapPin className="h-4 w-4 text-gray-400" />

                      <span>

                        ස්ථානය: <strong>{item.location}</strong>

                        {item.distanceKm !== undefined && (

                          <span className="text-xs text-gray-500"> ({item.distanceKm} km away)</span>

                        )}

                      </span>

                    </div>

                    {item.quantity && (

                      <div className="flex items-center gap-2">

                        <Tag className="h-4 w-4 text-gray-400" />

                        <span>ප්‍රමාණය: <strong>{item.quantity}</strong></span>

                      </div>

                    )}

                    <div className="flex items-center gap-2">

                      <Truck className="h-4 w-4 text-gray-400" />

                      <span>

                        බෙදාහැරීම: <strong>{item.hasDelivery ? 'ඇත (Available)' : 'නැත (Not Available)'}</strong>

                      </span>

                    </div>

                    {item.warranty && (

                      <div className="flex items-center gap-2">

                        <ShieldCheck className="h-4 w-4 text-gray-400" />

                        <span>වගකීම: <strong>{item.warranty}</strong></span>

                      </div>

                    )}

                    {item.expiryDate && (

                      <div className="flex items-center gap-2">

                        <Calendar className="h-4 w-4 text-gray-400" />

                        <span>කල්ඉකුත්වීමේ දිනය: <strong>{item.expiryDate}</strong></span>

                      </div>

                    )}

                  </div>

                  {/* Notes */}

                  {item.notes && (

                    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">

                      <div className="flex items-start gap-1.5">

                        <FileText className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />

                        <div>

                          <span className="font-semibold">අමතර සටහන්: </span>

                          {item.notes}

                        </div>

                      </div>

                    </div>

                  )}

                </div>

                {/* Contact Action Buttons */}

                <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200">

                  <button

                    onClick={() => handleCall(item.sellerPhone)}

                    disabled={!item.sellerPhone}

                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"

                  >

                    <Phone className="h-4 w-4" />

                    අමතන්න (Call)

                  </button>

                  <button

                    onClick={() => handleWhatsApp(item.sellerPhone, item.title)}

                    disabled={!item.sellerPhone}

                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors"

                  >

                    <MessageSquare className="h-4 w-4" />

                    WhatsApp

                  </button>

                </div>

              </div>

            </div>

          </section>

          {/* BOTTOM SECTION: Comparison Listings */}

          <section className="space-y-4">

            <div className="border-b border-gray-200 pb-2">

              <h3 className="text-base font-bold text-gray-900 md:text-lg">

                මෙම භාණ්ඩය සඳහා වෙනත් වෙළෙන්දන්ගේ දැන්වීම් සහ මිල ගණන් (Other Sellers & Price Comparison)

              </h3>

              <p className="text-xs text-gray-500">

                අඩුම මිල සිට වැඩිම මිල දක්වා පිළිවෙලින් දක්වා ඇත.

              </p>

            </div>

            {comparisonItems.length === 0 ? (

              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">

                <p className="text-sm font-medium text-gray-600">

                  මෙම භාණ්ඩය සඳහා තවමත් වෙනත් වෙළෙන්දන්ගේ දැන්වීම් පළවී නොමැත.

                </p>

              </div>

            ) : (

              <div className="space-y-3">

                {comparisonItems.map((compItem) => {

                  const priceDifference = item.price - compItem.price;

                  const isCheaper = priceDifference > 0;

                  return (

                    <div

                      key={compItem.id}

                      className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition-all sm:flex-row sm:items-center gap-4"

                    >

                      <div className="space-y-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="font-bold text-gray-900">{compItem.sellerName}</span>

                          {isCheaper && (

                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">

                              <TrendingDown className="h-3 w-3" />

                              රු. {priceDifference.toLocaleString()} ක වාසියක් (Lowest Price Deal)

                            </span>

                          )}

                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500">

                          <span className="flex items-center gap-1">

                            <MapPin className="h-3 w-3" /> {compItem.location}

                          </span>

                          {compItem.hasDelivery && (

                            <span className="flex items-center gap-1 text-emerald-600">

                              <CheckCircle2 className="h-3 w-3" /> Delivery Available

                            </span>

                          )}

                        </div>

                        <div className="pt-1">

                          <span className="text-lg font-extrabold text-gray-900">

                            රු. {compItem.price.toLocaleString()}

                          </span>

                          {compItem.unit && (

                            <span className="text-xs text-gray-500"> / {compItem.unit}</span>

                          )}

                        </div>

                      </div>

                      {/* Action Buttons for Alternative Seller */}

                      <div className="flex flex-wrap items-center gap-2 shrink-0">

                        <button

                          onClick={() => handleCall(compItem.sellerPhone)}

                          disabled={!compItem.sellerPhone}

                          title="Call Seller"

                          className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"

                        >

                          <Phone className="h-4 w-4" />

                        </button>

                        <button

                          onClick={() => handleWhatsApp(compItem.sellerPhone, compItem.title)}

                          disabled={!compItem.sellerPhone}

                          title="WhatsApp Seller"

                          className="rounded-lg border border-green-300 bg-green-50 p-2 text-green-700 hover:bg-green-100 disabled:opacity-40 transition-colors"

                        >

                          <MessageSquare className="h-4 w-4" />

                        </button>

                        <button

                          onClick={() => onSelectItem && onSelectItem(compItem)}

                          className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"

                        >

                          <span>මෙම දැන්වීම තෝරන්න (View Ad)</span>

                          <ArrowRight className="h-3.5 w-3.5" />

                        </button>

                      </div>

                    </div>

                  );

                })}

              </div>

            )}

          </section>

        </div>

      </div>

    </div>

  );

};

export default MarketplaceItemDetailModal;

