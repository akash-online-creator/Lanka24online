import React, { useState, useMemo } from 'react';
import {
  AccommodationListing,
  AccommodationCategory,
  AccommodationFilterOptions,
} from '../types/accommodation';
import {
  getStoredAccommodations,
  saveAccommodationListing,
  filterAccommodations,
} from '../utils/accommodationStorage';
import { AccommodationCard } from './AccommodationCard';
import { AccommodationModal } from './AccommodationModal';
import { AccommodationDetailModal } from './AccommodationDetailModal';
import { AccommodationMap } from './AccommodationMap';
import {
  Search,
  Plus,
  Home,
  Users,
  Hotel,
  Layers,
  List,
  Map as MapIcon,
  X,
  Compass,
  Sparkles,
  SlidersHorizontal,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';

interface AccommodationViewProps {
  onBackToBoard?: () => void;
  userLat?: number;
  userLng?: number;
  userCityName?: string;
}

export const AccommodationView: React.FC<AccommodationViewProps> = ({
  onBackToBoard,
  userLat = 7.0786,
  userLng = 79.8913,
  userCityName = 'ජා-ඇල',
}) => {
  const [listings, setListings] = useState<AccommodationListing[]>(() =>
    getStoredAccommodations()
  );

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedListingForDetail, setSelectedListingForDetail] = useState<AccommodationListing | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | AccommodationCategory>('all');
  const [distanceFilter, setDistanceFilter] = useState<'all' | 'walk_15' | 'walk_30' | 'tuk_15' | 'tuk_30' | 'custom'>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(20);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const QUICK_SEARCH_CHIPS = [
    'මොරටුව Uni',
    'පේරාදෙණිය Uni',
    'කැලණිය Uni',
    'කොළඹ',
    'ජා-ඇල',
    'මහනුවර',
    'මීගමුව',
    'ගාල්ල',
    'SLIIT මාලඹේ',
    'NSBM හෝමාගම',
  ];

  const ALL_FACILITIES = [
    'AC',
    'Attached Bathroom',
    'Parking',
    'Cooking Allowed',
    'Wi-Fi',
    'Furnished',
    'Separate Entrance',
    'Hot Water',
    'CCTV Security',
    'Pet Friendly',
  ];

  const filteredListings = useMemo(() => {
    const filterOptions: AccommodationFilterOptions = {
      searchQuery,
      category: activeCategory,
      distanceFilter,
      maxDistanceKm,
      minPrice,
      maxPrice,
      selectedFacilities,
    };
    return filterAccommodations(listings, filterOptions, userLat, userLng);
  }, [
    listings,
    searchQuery,
    activeCategory,
    distanceFilter,
    maxDistanceKm,
    minPrice,
    maxPrice,
    selectedFacilities,
    userLat,
    userLng,
  ]);

  const categoryCounts = useMemo(() => {
    return {
      all: listings.length,
      house: listings.filter((l) => l.category === 'house').length,
      boarding: listings.filter((l) => l.category === 'boarding').length,
      hotel: listings.filter((l) => l.category === 'hotel').length,
    };
  }, [listings]);

  const handleAddNewListing = (newListing: AccommodationListing) => {
    const updated = saveAccommodationListing(newListing);
    setListings(updated);
  };

  const toggleFacility = (facility: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setDistanceFilter('all');
    setMaxDistanceKm(20);
    setMinPrice(0);
    setMaxPrice(0);
    setSelectedFacilities([]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 animate-fadeIn pb-16">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToBoard && (
            <button
              type="button"
              onClick={onBackToBoard}
              className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer active:scale-95 shrink-0"
              title="ආපසු දැන්වීම් පුවරුවට"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md">
                #නවාතැන (Accommodation)
              </span>
              <span className="text-xs text-emerald-100 font-bold hidden sm:inline">
                කුලී නිවාස, බෝඩින් සහ හොටල් සේවාව
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1 tracking-tight">
              නවාතැන් සොයන්න සහ කුලියට දෙන්න
            </h1>
          </div>
        </div>

        <div className="flex items-center bg-black/30 p-1 rounded-2xl backdrop-blur-sm self-start sm:self-auto border border-white/20">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-slate-950 shadow-md scale-100'
                : 'text-white hover:text-amber-300'
            }`}
          >
            <List className="w-4 h-4" />
            <span>දුර අනුව (List)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'map'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-100'
                : 'text-white hover:text-amber-300'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>සිතියමෙන් (Map)</span>
          </button>
        </div>
      </div>

      {/* Top Search Bar */}
      <div className="bg-white dark:bg-[#071910] border-2 border-emerald-500/50 p-4 sm:p-5 rounded-3xl shadow-lg space-y-3">
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 නගරය, පාසල හෝ University නම සෙවුම (e.g. මොරටුව, Colombo, Ananda College, Peradeniya Campus)..."
            className="w-full bg-slate-50 dark:bg-[#0b2417] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border-2 border-emerald-400/80 dark:border-emerald-600 rounded-2xl py-3.5 pl-12 pr-12 text-xs sm:text-sm font-bold shadow-inner focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-emerald-500/30"
          />
          <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute left-4 pointer-events-none" />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 p-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>ඉක්මන් සෙවුම්:</span>
          </span>
          {QUICK_SEARCH_CHIPS.map((chip, idx) => (
            <button
              key={`chip_${idx}`}
              type="button"
              onClick={() => setSearchQuery(chip)}
              className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                searchQuery === chip
                  ? 'bg-amber-400 border-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-100 dark:bg-[#0c2a1c] border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-emerald-50'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Category Filter Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`p-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-between gap-2 border-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
            activeCategory === 'all'
              ? 'bg-slate-900 text-white border-slate-950 dark:bg-white dark:text-slate-900 shadow-md scale-[1.01]'
              : 'bg-white dark:bg-[#081e13] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            <span>සියල්ල (All)</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs">
            {categoryCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('house')}
          className={`p-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-between gap-2 border-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
            activeCategory === 'house'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md scale-[1.01]'
              : 'bg-white dark:bg-[#081e13] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 hover:bg-emerald-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-emerald-500" />
            <span>කුලී නිවාස</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-mono text-xs">
            {categoryCounts.house}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('boarding')}
          className={`p-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-between gap-2 border-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
            activeCategory === 'boarding'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md scale-[1.01]'
              : 'bg-white dark:bg-[#081e13] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 hover:bg-blue-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span>බෝඩින් / ඇනෙක්ස්</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 font-mono text-xs">
            {categoryCounts.boarding}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('hotel')}
          className={`p-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-between gap-2 border-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
            activeCategory === 'hotel'
              ? 'bg-purple-600 text-white border-purple-500 shadow-md scale-[1.01]'
              : 'bg-white dark:bg-[#081e13] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 hover:bg-purple-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-purple-500" />
            <span>හෝටල් Room</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 font-mono text-xs">
            {categoryCounts.hotel}
          </span>
        </button>
      </div>

      {/* Add Place Button */}
      <button
        type="button"
        onClick={() => setIsCreateModalOpen(true)}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 active:scale-[0.99] text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/20 border-2 border-amber-300 flex items-center justify-center gap-3 transition-all cursor-pointer group"
      >
        <div className="p-1.5 rounded-xl bg-slate-950 text-amber-400 group-hover:scale-110 transition-transform">
          <Plus className="w-5 h-5 stroke-[3]" />
        </div>
        <span>ස්ථානයක් එක් කරන්න (+ Add House / Boarding / Hotel)</span>
      </button>

      {/* Distance & Advanced Filters */}
      <div className="bg-white dark:bg-[#071910] border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>දුර / කාලය:</span>
            </span>

            <button
              type="button"
              onClick={() => setDistanceFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                distanceFilter === 'all'
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              සියලු දුර
            </button>

            <button
              type="button"
              onClick={() => setDistanceFilter('walk_15')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                distanceFilter === 'walk_15'
                  ? 'bg-emerald-600 text-white font-black shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              }`}
            >
              <span>🚶 ඇවිදින දුරින් (මිනිත්තු 15)</span>
            </button>

            <button
              type="button"
              onClick={() => setDistanceFilter('walk_30')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                distanceFilter === 'walk_30'
                  ? 'bg-emerald-600 text-white font-black shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              }`}
            >
              <span>🚶 ඇවිදින දුරින් (මිනිත්තු 30)</span>
            </button>

            <button
              type="button"
              onClick={() => setDistanceFilter('tuk_15')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                distanceFilter === 'tuk_15'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
              }`}
            >
              <span>🛺 ත්‍රීවීල් එකෙන් (මිනිත්තු 15)</span>
            </button>

            <button
              type="button"
              onClick={() => setDistanceFilter('tuk_30')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                distanceFilter === 'tuk_30'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
              }`}
            >
              <span>🛺 ත්‍රීවීල් එකෙන් (මිනිත්තු 30)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
              showAdvancedFilters || selectedFacilities.length > 0 || minPrice > 0 || maxPrice > 0
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>ගාන & පහසුකම්</span>
            {(selectedFacilities.length > 0 || minPrice > 0 || maxPrice > 0) && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  අවම මිල (Min Price Rs.):
                </label>
                <input
                  type="number"
                  value={minPrice || ''}
                  onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                  placeholder="e.g. 10000"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c2a1c] text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  උපරිම මිල (Max Price Rs.):
                </label>
                <input
                  type="number"
                  value={maxPrice || ''}
                  onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
                  placeholder="e.g. 60000"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c2a1c] text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                අවශ්‍ය පහසුකම් තෝරන්න (Select Facilities):
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ALL_FACILITIES.map((fac, idx) => (
                  <button
                    key={`fac_chip_${idx}`}
                    type="button"
                    onClick={() => toggleFacility(fac)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      selectedFacilities.includes(fac)
                        ? 'bg-emerald-600 border-emerald-700 text-white font-black shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {selectedFacilities.includes(fac) ? '✓ ' : '+ '}
                    {fac}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>සියලු පෙරහන් ඉවත් කරන්න (Reset)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Area: List vs Map */}
      {viewMode === 'map' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300">
              🗺️ සිතියමේ පෙන්වන ස්ථාන ({filteredListings.length}):
            </span>
          </div>

          <AccommodationMap
            items={filteredListings}
            userLat={userLat}
            userLng={userLng}
            onSelectListing={(listing) => setSelectedListingForDetail(listing)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
              දැන්වීම් ලැයිස්තුව ({filteredListings.length}ක් හමුවිය):
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
              ඔබ සිටින ස්ථානයට ළඟම ස්ථාන ඉහළින් පෙන්වයි
            </span>
          </div>

          {filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredListings.map((item) => (
                <AccommodationCard
                  key={item.id}
                  item={item}
                  onViewDetails={(it) => setSelectedListingForDetail(it)}
                  userLat={userLat}
                  userLng={userLng}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-[#071910] border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl space-y-3">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                ඔබ සෙවූ කරුණුවලට අදාළ නවාතැන් හමුනොවිණි
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                කරුණාකර සෙවුම් වචන වෙනස් කරන්න හෝ පෙරහන් ඉවත් කරන්න.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer"
              >
                සියලු පෙරහන් ඉවත් කරන්න
              </button>
            </div>
          )}
        </div>
      )}

      {/* Creation Modal */}
      <AccommodationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleAddNewListing}
        currentLat={userLat}
        currentLng={userLng}
        currentCityName={userCityName}
      />

      {/* Detail Modal */}
      <AccommodationDetailModal
        item={selectedListingForDetail}
        onClose={() => setSelectedListingForDetail(null)}
        userLat={userLat}
        userLng={userLng}
      />
    </div>
  );
};
