export type AccommodationCategory = 'house' | 'boarding' | 'hotel';

export type TargetAudience = 'boys' | 'girls' | 'couples' | 'family' | 'any' | 'working' | 'students';

export type RoomType = 'single' | 'sharing' | 'double' | 'family' | 'suite' | 'annex' | 'full_house';

export interface AccommodationPhoto {
  id: string;
  url: string;
  caption?: string;
  aspectRatio: '9:16';
}

export interface AccommodationLocation {
  city: string;
  district?: string;
  address?: string;
  lat: number;
  lng: number;
  nearestTown: string;
  nearestCampusOrSchool?: string;
  distanceToCampusOrSchoolKm?: number;
  distanceToMainRoadMeters?: number;
}

export interface HouseRentalDetails {
  houseType: 'single_story' | 'two_story' | 'upper_floor' | 'ground_floor' | 'annex';
  bedrooms: number;
  bathrooms: number;
  hasLivingRoom: boolean;
  hasDiningRoom: boolean;
  hasKitchen: boolean;
  hasPantry: boolean;
  parkingSpaces: number;
  parkingVehicleTypes: ('car' | 'van' | 'bike')[];
  hasBoundaryWallAndGate: boolean;
  waterSupply: ('tap' | 'well' | 'hot_water' | 'overhead_tank')[];
  electricityType: 'separate_meter' | 'shared_meter';
  monthlyRent: number;
  keyMoneyMonths: number;
  advanceDepositAmount?: number;
  furnishedStatus: 'fully_furnished' | 'semi_furnished' | 'unfurnished';
  petFriendly: boolean;
  accessRoadWidthFeet: number;
  minimumStayMonths?: number;
}

export interface BoardingAnnexDetails {
  targetAudience: TargetAudience;
  roomSharingType: 'single_room' | 'two_sharing' | 'three_sharing' | 'four_sharing' | 'entire_annex';
  maxOccupantsPerRoom?: number;
  bathroomType: 'attached' | 'shared';
  furnishedItems: ('bed' | 'mattress' | 'study_table' | 'chair' | 'wardrobe' | 'fan' | 'mosquito_net')[];
  cookingAllowed: boolean;
  hasKitchenAccess: boolean;
  utilityBillsIncluded: boolean;
  hasSeparateEntrance: boolean;
  hasCctvSecurity: boolean;
  isPeacefulStudyEnvironment: boolean;
  rentPerPersonOrRoom: 'per_person' | 'per_room';
  monthlyRent: number;
  keyMoneyAdvance: number;
}

export interface HotelRoomDetails {
  roomType: 'single' | 'double' | 'family' | 'deluxe' | 'suite';
  acStatus: 'ac' | 'non_ac';
  hasAttachedBathroom: boolean;
  hasHotWater: boolean;
  bedType: 'king' | 'queen' | 'twin' | 'single';
  amenities: ('free_wifi' | 'tv' | 'mini_fridge' | 'swimming_pool' | 'balcony_view' | 'room_service' | 'restaurant' | 'parking' | 'hot_water')[];
  mealPlan: 'room_only' | 'bed_and_breakfast' | 'half_board' | 'full_board';
  pricePerDay: number;
  priceHourlyOrDayUse?: number;
  checkInTime: string;
  checkOutTime: string;
}

export interface AccommodationListing {
  preferredGender?: 'any' | 'male' | 'female' | 'boys' | 'girls' | 'couples' | 'family' | string;
  commentsCount?: number;
  id: string;
  title: string;
  category: AccommodationCategory;
  description: string;
  location: AccommodationLocation;
  houseDetails?: HouseRentalDetails;
  boardingDetails?: BoardingAnnexDetails;
  hotelDetails?: HotelRoomDetails;
  price: number;
  pricePeriod: 'per_month' | 'per_day' | 'per_person_month';
  keyMoneyOrDepositText?: string;
  photos: AccommodationPhoto[];
  facilities: string[];
  ownerName: string;
  ownerPhone: string;
  ownerWhatsApp: string;
  createdAt: string;
  updatedAt?: string;
  isAvailable: boolean;
  isVerified?: boolean;
  authorId?: string;
  distanceKm?: number;
}

export interface AccommodationFilterOptions {
  preferredGender?: string;
  searchQuery: string;
  category: 'all' | AccommodationCategory;
  distanceFilter: 'all' | 'walk_15' | 'walk_30' | 'tuk_15' | 'tuk_30' | 'custom';
  maxDistanceKm: number;
  minPrice: number;
  maxPrice: number;
  selectedFacilities: string[];
  targetAudience?: TargetAudience | 'all';
}
