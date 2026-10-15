import React, { useState } from 'react';
import {
  AccommodationListing,
  AccommodationCategory,
  TargetAudience,
  AccommodationPhoto,
} from '../types/accommodation';
import {
  X,
  Home,
  Users,
  Hotel,
  Upload,
  Camera,
  MapPin,
  Crosshair,
  CheckCircle,
  Sparkles,
  Phone,
  Loader2,
} from 'lucide-react';

interface AccommodationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (listing: AccommodationListing) => void;
  currentLat?: number;
  currentLng?: number;
  currentCityName?: string;
}

export const AccommodationModal: React.FC<AccommodationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentLat = 7.0786,
  currentLng = 79.8913,
  currentCityName = 'ජා-ඇල',
}) => {
  const [activeCategory, setActiveCategory] = useState<AccommodationCategory>('house');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(currentCityName);
  const [address, setAddress] = useState('');
  const [nearestTown, setNearestTown] = useState(currentCityName);
  const [nearestCampusOrSchool, setNearestCampusOrSchool] = useState('');
  const [lat, setLat] = useState<number>(currentLat);
  const [lng, setLng] = useState<number>(currentLng);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);

  // 9:16 Portrait Photos (Up to 4)
  const [photos, setPhotos] = useState<AccommodationPhoto[]>([
    {
      id: 'ph_1',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=720&h=1280&q=80',
      caption: 'ඉදිරිපස පෙනුම (Front View)',
      aspectRatio: '9:16',
    },
    {
      id: 'ph_2',
      url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=720&h=1280&q=80',
      caption: 'සාලය / ප්‍රධාන කාමරය (Main Room)',
      aspectRatio: '9:16',
    },
    {
      id: 'ph_3',
      url: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=720&h=1280&q=80',
      caption: 'කුස්සිය / බාත්රූම් (Kitchen / Bath)',
      aspectRatio: '9:16',
    },
    {
      id: 'ph_4',
      url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=720&h=1280&q=80',
      caption: 'නිදන කාමරය (Bedroom)',
      aspectRatio: '9:16',
    },
  ]);

  // House Specific
  const [houseType, setHouseType] = useState<'single_story' | 'two_story' | 'upper_floor' | 'ground_floor' | 'annex'>('single_story');
  const [houseBedrooms, setHouseBedrooms] = useState<number>(2);
  const [houseBathrooms, setHouseBathrooms] = useState<number>(1);
  const [hasPantry, setHasPantry] = useState<boolean>(true);
  const [parkingSpaces, setParkingSpaces] = useState<number>(1);
  const [hasBoundaryWall, setHasBoundaryWall] = useState<boolean>(true);
  const [hasHotWater, setHasHotWater] = useState<boolean>(false);
  const [electricityMeter, setElectricityMeter] = useState<'separate_meter' | 'shared_meter'>('separate_meter');
  const [houseRent, setHouseRent] = useState<number>(45000);
  const [houseKeyMoneyMonths, setHouseKeyMoneyMonths] = useState<number>(4);
  const [houseFurnished, setHouseFurnished] = useState<'fully_furnished' | 'semi_furnished' | 'unfurnished'>('unfurnished');
  const [petFriendly, setPetFriendly] = useState<boolean>(false);
  const [roadWidthFeet, setRoadWidthFeet] = useState<number>(15);

  // Boarding Specific
  const [boardingTarget, setBoardingTarget] = useState<TargetAudience>('boys');
  const [roomSharingType, setRoomSharingType] = useState<'single_room' | 'two_sharing' | 'three_sharing' | 'entire_annex'>('two_sharing');
  const [boardingBathroomType, setBoardingBathroomType] = useState<'attached' | 'shared'>('attached');
  const [cookingAllowed, setCookingAllowed] = useState<boolean>(true);
  const [billsIncluded, setBillsIncluded] = useState<boolean>(true);
  const [separateEntrance, setSeparateEntrance] = useState<boolean>(true);
  const [studyTableProvided, setStudyTableProvided] = useState<boolean>(true);
  const [cctvSecurity, setCctvSecurity] = useState<boolean>(true);
  const [boardingRent, setBoardingRent] = useState<number>(12000);
  const [boardingKeyMoney, setBoardingKeyMoney] = useState<number>(12000);
  const [boardingRentMode, setBoardingRentMode] = useState<'per_person' | 'per_room'>('per_person');

  // Hotel Specific
  const [hotelRoomType, setHotelRoomType] = useState<'single' | 'double' | 'family' | 'deluxe'>('deluxe');
  const [hotelAc, setHotelAc] = useState<'ac' | 'non_ac'>('ac');
  const [hotelBedType, setHotelBedType] = useState<'king' | 'queen' | 'twin' | 'single'>('king');
  const [hotelMealPlan, setHotelMealPlan] = useState<'room_only' | 'bed_and_breakfast' | 'half_board' | 'full_board'>('bed_and_breakfast');
  const [hotelDailyPrice, setHotelDailyPrice] = useState<number>(7500);
  const [hotelHourlyPrice, setHotelHourlyPrice] = useState<number>(4000);
  const [hasPool, setHasPool] = useState<boolean>(false);
  const [hasWifi, setHasWifi] = useState<boolean>(true);

  // Contact Info
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerWhatsApp, setOwnerWhatsApp] = useState('');

  if (!isOpen) return null;

  const handleAutoGps = () => {
    setIsLocating(true);
    setGpsSuccess(false);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setIsLocating(false);
          setGpsSuccess(true);
          setTimeout(() => setGpsSuccess(false), 3000);
        },
        () => {
          setIsLocating(false);
          setGpsSuccess(true);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const updated = [...photos];
      updated[index] = {
        id: `local_${Date.now()}_${index}`,
        url,
        caption: `චායාරූපය ${index + 1}`,
        aspectRatio: '9:16',
      };
      setPhotos(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let facilities: string[] = [];
    let price = 0;
    let pricePeriod: 'per_month' | 'per_day' | 'per_person_month' = 'per_month';
    let keyMoneyText = '';

    if (activeCategory === 'house') {
      price = Number(houseRent) || 45000;
      pricePeriod = 'per_month';
      keyMoneyText = `මාස ${houseKeyMoneyMonths}ක අත්තිකාරම් (Key Money)`;
      facilities = [
        parkingSpaces > 0 ? 'Parking' : '',
        hasBoundaryWall ? 'Boundary Wall & Gate' : '',
        hasHotWater ? 'Hot Water' : '',
        hasPantry ? 'Pantry Cupboards' : '',
        electricityMeter === 'separate_meter' ? 'Separate Meter' : '',
        houseFurnished !== 'unfurnished' ? 'Furnished' : '',
        petFriendly ? 'Pet Friendly' : '',
      ].filter(Boolean);
    } else if (activeCategory === 'boarding') {
      price = Number(boardingRent) || 12000;
      pricePeriod = boardingRentMode === 'per_person' ? 'per_person_month' : 'per_month';
      keyMoneyText = `රු. ${Number(boardingKeyMoney).toLocaleString()} අත්තිකාරම්`;
      facilities = [
        'Wi-Fi',
        boardingBathroomType === 'attached' ? 'Attached Bathroom' : 'Shared Bathroom',
        cookingAllowed ? 'Cooking Allowed' : '',
        billsIncluded ? 'Utility Bills Included' : '',
        separateEntrance ? 'Separate Entrance' : '',
        cctvSecurity ? 'CCTV Security' : '',
        studyTableProvided ? 'Study Table & Chair' : '',
      ].filter(Boolean);
    } else {
      price = Number(hotelDailyPrice) || 7500;
      pricePeriod = 'per_day';
      keyMoneyText = hotelMealPlan === 'bed_and_breakfast' ? 'Breakfast Included (B&B)' : 'දිනක කුලිය';
      facilities = [
        hotelAc === 'ac' ? 'AC' : 'Non-AC',
        hasWifi ? 'Free Wi-Fi' : '',
        hasPool ? 'Swimming Pool' : '',
        'Attached Bathroom',
        'Hot Water',
        'Parking',
        'Room Service',
      ].filter(Boolean);
    }

    const newListing: AccommodationListing = {
      id: `acc_${Date.now()}`,
      title: title.trim() || (activeCategory === 'house' ? 'කුලියට දීමට ඇති නිවස' : activeCategory === 'boarding' ? 'සුවපහසු බෝඩිම් කාමරය' : 'හෝටල් කාමරය'),
      category: activeCategory,
      description: description.trim() || 'සියලුම පහසුකම් සහිත ඉහළ ආරක්ෂිත ස්ථානයකි.',
      location: {
        city: city || 'කොළඹ',
        address: address || city,
        lat,
        lng,
        nearestTown: nearestTown || city,
        nearestCampusOrSchool: nearestCampusOrSchool || undefined,
      },
      price,
      pricePeriod,
      keyMoneyOrDepositText: keyMoneyText,
      photos,
      facilities,
      ownerName: ownerName.trim() || 'දැන්වීම්කරු',
      ownerPhone: ownerPhone.trim() || '0771234567',
      ownerWhatsApp: (ownerWhatsApp.trim() || ownerPhone.trim() || '0771234567').replace(/^0/, '94'),
      createdAt: new Date().toISOString(),
      isAvailable: true,
      isVerified: true,
      houseDetails: activeCategory === 'house' ? {
        houseType,
        bedrooms: Number(houseBedrooms),
        bathrooms: Number(houseBathrooms),
        hasLivingRoom: true,
        hasDiningRoom: true,
        hasKitchen: true,
        hasPantry,
        parkingSpaces: Number(parkingSpaces),
        parkingVehicleTypes: ['car', 'bike'],
        hasBoundaryWallAndGate: hasBoundaryWall,
        waterSupply: ['tap', hasHotWater ? 'hot_water' : 'overhead_tank'],
        electricityType: electricityMeter,
        monthlyRent: Number(houseRent),
        keyMoneyMonths: Number(houseKeyMoneyMonths),
        furnishedStatus: houseFurnished,
        petFriendly,
        accessRoadWidthFeet: Number(roadWidthFeet),
      } : undefined,
      boardingDetails: activeCategory === 'boarding' ? {
        targetAudience: boardingTarget,
        roomSharingType,
        bathroomType: boardingBathroomType,
        furnishedItems: ['bed', 'mattress', studyTableProvided ? 'study_table' : 'fan'],
        cookingAllowed,
        hasKitchenAccess: cookingAllowed,
        utilityBillsIncluded: billsIncluded,
        hasSeparateEntrance: separateEntrance,
        hasCctvSecurity: cctvSecurity,
        isPeacefulStudyEnvironment: true,
        rentPerPersonOrRoom: boardingRentMode,
        monthlyRent: Number(boardingRent),
        keyMoneyAdvance: Number(boardingKeyMoney),
      } : undefined,
      hotelDetails: activeCategory === 'hotel' ? {
        roomType: hotelRoomType,
        acStatus: hotelAc,
        hasAttachedBathroom: true,
        hasHotWater: true,
        bedType: hotelBedType,
        amenities: ['free_wifi', 'tv', 'hot_water', hasPool ? 'swimming_pool' : 'parking'],
        mealPlan: hotelMealPlan,
        pricePerDay: Number(hotelDailyPrice),
        priceHourlyOrDayUse: Number(hotelHourlyPrice),
        checkInTime: '14:00',
        checkOutTime: '12:00',
      } : undefined,
    };

    onSubmit(newListing);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#071910] border-2 border-emerald-500 rounded-3xl shadow-2xl overflow-hidden my-6">
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-white/20 text-white">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide">
                නවාතැන් දැන්වීමක් එක් කරන්න (Add Accommodation)
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                ශ්‍රී ලංකාවේ ප්‍රමිතීන්ට අනුකූලව සම්පූර්ණ තොරතුරු ඇතුළත් කරන්න
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Category Selection Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-[#0a2316] border-b border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
            දැන්වීමේ කාණ්ඩය තෝරන්න (Select Category):
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory('house')}
              className={`py-3 px-2 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center gap-1.5 transition-all cursor-pointer border-2 ${
                activeCategory === 'house'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md scale-[1.02]'
                  : 'bg-white dark:bg-[#0c2a1c] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-emerald-50'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>1. කුලී නිවාස</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('boarding')}
              className={`py-3 px-2 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center gap-1.5 transition-all cursor-pointer border-2 ${
                activeCategory === 'boarding'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md scale-[1.02]'
                  : 'bg-white dark:bg-[#0c2a1c] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-blue-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>2. බෝඩින් / ඇනෙක්ස්</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('hotel')}
              className={`py-3 px-2 rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center gap-1.5 transition-all cursor-pointer border-2 ${
                activeCategory === 'hotel'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md scale-[1.02]'
                  : 'bg-white dark:bg-[#0c2a1c] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-purple-50'
              }`}
            >
              <Hotel className="w-5 h-5" />
              <span>3. හොටල් Room</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Photos 9:16 (4 Photos) */}
          <div className="bg-slate-50 dark:bg-[#0a2316] p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>9:16 ප්‍රමාණයේ ඡායාරූප 4ක් එක් කරන්න (Portrait Photos)</span>
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-amber-600 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                9:16 Format
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((ph, idx) => (
                <div
                  key={ph.id}
                  className="relative aspect-[9/16] rounded-2xl overflow-hidden border-2 border-dashed border-emerald-400 bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center group"
                >
                  <img
                    src={ph.url}
                    alt={ph.caption}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                    <label className="p-2 rounded-full bg-white text-slate-900 cursor-pointer shadow-md hover:bg-amber-400 transition-colors">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, idx)}
                      />
                    </label>
                  </div>
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white font-mono text-[10px]">
                    Photo {idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                දැන්වීමේ ප්‍රධාන මාතෘකාව (Title) *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. ජා-ඇල නගරයට ආසන්න දෙමහල් නිවසක් කුලියට / මොරටුව සරසවිය අසල බෝඩිම"
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs sm:text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                සම්පූර්ණ විස්තරය (Description)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="නවාතැන පිළිබඳ වැදගත් කරුණු සහ පිවිසුම් මාර්ග..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Location & Auto GPS */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>ස්ථානය සහ GPS Coordinates (Auto Location)</span>
              </span>

              <button
                type="button"
                onClick={handleAutoGps}
                disabled={isLocating}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>GPS ලබාගනිමින්...</span>
                  </>
                ) : (
                  <>
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>{gpsSuccess ? 'GPS තහවුරුයි!' : 'Auto GPS ලබාගන්න'}</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  නගරය (City) *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ආසන්නතම පාසල හෝ Campus
                </label>
                <input
                  type="text"
                  value={nearestCampusOrSchool}
                  onChange={(e) => setNearestCampusOrSchool(e.target.value)}
                  placeholder="e.g. මොරටුව සරසවිය"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Form details per category */}
          {activeCategory === 'house' && (
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300">
                🏡 කුලී නිවාස විස්තර
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    කාමර ගණන
                  </label>
                  <select
                    value={houseBedrooms}
                    onChange={(e) => setHouseBedrooms(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={`h_br_${n}`} value={n}>{n} කාමර</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    නාන කාමර
                  </label>
                  <select
                    value={houseBathrooms}
                    onChange={(e) => setHouseBathrooms(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={`h_bath_${n}`} value={n}>{n} බාත්රූම්</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    වාහන නැවතුම්
                  </label>
                  <select
                    value={parkingSpaces}
                    onChange={(e) => setParkingSpaces(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                  >
                    <option value={0}>නැත</option>
                    <option value={1}>1 වාහනයක්</option>
                    <option value={2}>2ක් හෝ වැඩි</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    මාසික කුලිය (රු.) *
                  </label>
                  <input
                    type="number"
                    required
                    value={houseRent}
                    onChange={(e) => setHouseRent(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    අත්තිකාරම් මාස ගණන
                  </label>
                  <select
                    value={houseKeyMoneyMonths}
                    onChange={(e) => setHouseKeyMoneyMonths(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 6, 12].map((m) => (
                      <option key={`m_${m}`} value={m}>මාස {m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'boarding' && (
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-xs sm:text-sm font-black text-blue-800 dark:text-blue-300">
                👥 බෝඩින් / ඇනෙක්ස් විස්තර
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    සුදුසු වන්නේ
                  </label>
                  <select
                    value={boardingTarget}
                    onChange={(e) => setBoardingTarget(e.target.value as TargetAudience)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                  >
                    <option value="boys">👦 පිරිමි ළමුන්</option>
                    <option value="girls">👧 ගැහැණු ළමුන්</option>
                    <option value="couples">💑 යුවළක්</option>
                    <option value="students">🎓 සරසවි සිසුන්</option>
                    <option value="any">👥 ඕනෑම අයෙකුට</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    මාසික කුලිය (රු.) *
                  </label>
                  <input
                    type="number"
                    required
                    value={boardingRent}
                    onChange={(e) => setBoardingRent(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'hotel' && (
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-xs sm:text-sm font-black text-purple-800 dark:text-purple-300">
                🏨 හෝටල් Room විස්තර
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    දිනකට ගාස්තුව (රු.) *
                  </label>
                  <input
                    type="number"
                    required
                    value={hotelDailyPrice}
                    onChange={(e) => setHotelDailyPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    AC තත්ත්වය
                  </label>
                  <select
                    value={hotelAc}
                    onChange={(e) => setHotelAc(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                  >
                    <option value="ac">AC සහිතයි</option>
                    <option value="non_ac">Non-AC</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className="bg-slate-50 dark:bg-[#0a2316] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>අයිතිකරුගේ සම්බන්ධීකරණ තොරතුරු</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  නම *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. නිමල් පෙරේරා"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ඇමතුම් අංකය *
                </label>
                <input
                  type="tel"
                  required
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="e.g. 0771234567"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp අංකය *
                </label>
                <input
                  type="tel"
                  required
                  value={ownerWhatsApp}
                  onChange={(e) => setOwnerWhatsApp(e.target.value)}
                  placeholder="e.g. 0771234567"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081f14] text-xs font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 font-bold text-xs"
            >
              අවලංගු කරන්න
            </button>

            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs sm:text-sm shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>දැන්වීම සජීවීව පළකරන්න</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
