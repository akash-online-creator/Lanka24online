import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { User, Language, ProfessionalService, ServiceDeliveryMethod, LocationOption } from '../types';
import { professionalServiceCategories } from '../data/professionalServicesData';
import { 
  X, 
  Briefcase, 
  MapPin, 
  Phone, 
  Award, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Send,
  Plus,
  Trash2,
  Navigation,
  Search,
  Maximize2,
  Check,
  Globe,
  Loader2
} from 'lucide-react';
import { 
  resolveExactLocation, 
  searchSriLankanPlacesAndRoads, 
  PlaceSearchResult,
  formatOrderedLocation
} from '../utils/geoUtils';
import { initialLocations } from '../data/initialData';

interface RegisterProfessionalServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  language: Language;
  currentLocationName?: string;
  onRegisterService: (newService: ProfessionalService) => void;
}

export const RegisterProfessionalServiceModal: React.FC<RegisterProfessionalServiceModalProps> = ({
  isOpen,
  onClose,
  user,
  language,
  currentLocationName = 'කඩවත',
  onRegisterService,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(professionalServiceCategories[0].category_id);
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState<string>(
    professionalServiceCategories[0].sub_categories[0].name
  );
  const [selectedSubCategoryIcon, setSelectedSubCategoryIcon] = useState<string>(
    professionalServiceCategories[0].sub_categories[0].icon
  );

  const [serviceTitle, setServiceTitle] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<ServiceDeliveryMethod>('location');
  const [deliveryMethodDetails, setDeliveryMethodDetails] = useState('');
  
  // Dynamic qualifications list (Requirement 02: එකින් එක සුදුසුකම් ඇතුලත් කිරිමට පහළට ඉඩ තියන්න)
  const [qualificationsList, setQualificationsList] = useState<string[]>([]);
  const [currentQualInput, setCurrentQualInput] = useState('');

  const [experienceDuration, setExperienceDuration] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [revealContactConsent, setRevealContactConsent] = useState(true);
  const [locationName, setLocationName] = useState(currentLocationName || user.nearestTown || 'කඩවත');
  
  // Coordinates for map
  const [mapLat, setMapLat] = useState<number>(user.registrationLat || 7.1712);
  const [mapLng, setMapLng] = useState<number>(user.registrationLng || 79.8978);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Leaflet map container references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const currentCategory = professionalServiceCategories.find((c) => c.category_id === selectedCategoryId) || professionalServiceCategories[0];

  // Geocoding helper
  const handleLookupLocation = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const geo = await resolveExactLocation(lat, lng);
      if (geo && geo.shortDisplaySi) {
        setLocationName(geo.shortDisplaySi);
      }
    } catch (err) {
      console.warn('Geocoding notice:', err);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Initialize and synchronize inline map when 'location' delivery method is chosen
  useEffect(() => {
    if (!isOpen || deliveryMethod !== 'location' || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [mapLat, mapLng],
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    // Update coordinates and address when map dragging stops
    map.on('moveend', () => {
      const center = map.getCenter();
      setMapLat(center.lat);
      setMapLng(center.lng);
      handleLookupLocation(center.lat, center.lng);
    });

    // Also support clicking on map to set pin
    map.on('click', (e) => {
      map.panTo(e.latlng, { animate: true });
      setMapLat(e.latlng.lat);
      setMapLng(e.latlng.lng);
      handleLookupLocation(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    // Trigger invalidateSize after slight delay for proper container rendering in modals
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [deliveryMethod, handleLookupLocation]);

  // Handle map search
  const handleSearchPlace = async (query: string) => {
    setMapSearchQuery(query);
    if (!query.trim() || query.trim().length < 2) {
      setMapSearchResults([]);
      setIsSearchingMap(false);
      return;
    }

    setIsSearchingMap(true);
    try {
      const results = await searchSriLankanPlacesAndRoads(query.trim());
      setMapSearchResults((results || []).slice(0, 5));
    } catch (err) {
      console.warn('Search notice:', err);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handleSelectSearchResult = (res: PlaceSearchResult) => {
    setMapLat(res.lat);
    setMapLng(res.lng);
    setLocationName(res.shortDisplaySi || res.titleSi || `${res.lat.toFixed(4)}, ${res.lng.toFixed(4)}`);
    setMapSearchQuery('');
    setMapSearchResults([]);
    setIsSearchingMap(false);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([res.lat, res.lng], 16, { animate: true });
    }
  };

  // GPS Locate current position
  const handleGetGpsPosition = () => {
    if ('geolocation' in navigator) {
      setIsGeocoding(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMapLat(lat);
          setMapLng(lng);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
          }
          handleLookupLocation(lat, lng);
        },
        (err) => {
          console.warn('GPS notice:', err);
          setIsGeocoding(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = professionalServiceCategories.find((c) => c.category_id === catId);
    if (cat && cat.sub_categories.length > 0) {
      setSelectedSubCategoryName(cat.sub_categories[0].name);
      setSelectedSubCategoryIcon(cat.sub_categories[0].icon);
    }
  };

  const handleSubCategorySelect = (subName: string, subIcon: string) => {
    setSelectedSubCategoryName(subName);
    setSelectedSubCategoryIcon(subIcon);
  };

  // Qualifications list handlers (Requirement 02)
  const handleAddQualification = (textToAdd?: string) => {
    const qual = (textToAdd !== undefined ? textToAdd : currentQualInput).trim();
    if (!qual) return;

    if (!qualificationsList.includes(qual)) {
      setQualificationsList([...qualificationsList, qual]);
    }
    setCurrentQualInput('');
    setErrorMsg('');
  };

  const handleRemoveQualification = (indexToRemove: number) => {
    setQualificationsList(qualificationsList.filter((_, idx) => idx !== indexToRemove));
  };

  const quickQualificationSuggestions = [
    'NVQ Level 4 සහතිකය',
    'වෘත්තීය ඩිප්ලෝමාව',
    'වසර 5+ ප්‍රායෝගික පළපුරුද්ද',
    'කාර්මික ශිල්පී සහතිකය',
    'රජයේ ලියාපදිංචි බලපත්‍රය',
    'උපාධිය (Degree)',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTitle.trim()) {
      setErrorMsg('කරුණාකර ඔබට ලබාදිය හැකි සේවය කුමක්දැයි සටහන් කරන්න.');
      return;
    }

    // Combine qualifications
    let finalQualifications = qualificationsList;
    if (currentQualInput.trim() && !qualificationsList.includes(currentQualInput.trim())) {
      finalQualifications = [...qualificationsList, currentQualInput.trim()];
    }

    if (finalQualifications.length === 0) {
      setErrorMsg('කරුණාකර ඔබ සතු සුදුසුකම් අවම වශයෙන් එකක් හෝ ඇතුළත් කරන්න.');
      return;
    }

    if (!experienceDuration.trim()) {
      setErrorMsg('කරුණාකර පළපුරුද්දේ කාලසීමාව ඇතුළත් කරන්න.');
      return;
    }

    const newService: ProfessionalService = {
      id: `ps_${Date.now()}`,
      userId: user?.userId || user?.id || '',
      providerName: user?.name || 'සේවා වෘත්තිකයා',
      providerPhotoUrl: user?.photoUrl || '',
      providerPhone: user?.phone || '',
      providerWhatsapp: user?.whatsappNumber || user?.phone || '',
      altPhone: altPhone.trim(),
      serviceTitle: serviceTitle.trim(),
      deliveryMethod,
      deliveryMethodDetails: deliveryMethodDetails.trim(),
      locationName: locationName.trim(),
      lat: mapLat,
      lng: mapLng,
      qualifications: finalQualifications.join(' • '),
      qualificationsList: finalQualifications,
      experienceDuration: experienceDuration.trim(),
      categoryId: currentCategory.category_id,
      categoryName: currentCategory.category_name,
      categoryIcon: currentCategory.category_icon,
      subCategoryName: selectedSubCategoryName,
      subCategoryIcon: selectedSubCategoryIcon,
      createdAt: 'දැන්',
      createdAtMs: Date.now(),
      reviews: [],
      avgRating: 5.0,
      isVerified: user.status === 'approved' || true,
      revealContactConsent,
    };

    onRegisterService(newService);
    setIsSubmittedSuccess(true);
    setTimeout(() => {
      setIsSubmittedSuccess(false);
      onClose();
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center animate-fadeIn">
      <div className="bg-white dark:bg-[#0c1a12] border border-slate-200 dark:border-[#1a3826] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#173222] flex items-center justify-between bg-gradient-to-r from-emerald-600/10 via-teal-600/5 to-transparent flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-[#007a4b] text-white flex items-center justify-center shadow-md">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                {language === 'en' 
                  ? 'Register Professional Service' 
                  : language === 'ta' 
                  ? 'தொழில்முறை சேவையைப் பதிவுசெய்க' 
                  : 'වෘත්තීය සේවා සැපයීමේ ලියාපදිංචිය'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#789d87]">
                ඔබගේ වෘත්තීය හැකියාවන් පාරිභෝගිකයන් වෙත ඉදිරිපත් කරන්න
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#162e20] hover:bg-slate-200 dark:hover:bg-[#1f422e] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content / Form */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Free Tier Model Welcome Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-800 via-[#005e37] to-teal-800 border border-emerald-400/40 text-white shadow-md flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xl shrink-0 shadow-xs">
              🎁
            </div>
            <div className="text-xs">
              <span className="font-extrabold text-amber-300 block">
                පළමු ලියාපදිංචිය රු. 100 නොමිලේ (Free Tier Model)!
              </span>
              <span className="text-emerald-100">
                කිසිදු මූලික වියදමක් නැත. සේවාව ලියාපදිංචි කර, හොඳ Reviews සහ තරු ලබාගනිමින් ඔබගේ Reputation Level එක වර්ධනය කරගන්න.
              </span>
            </div>
          </div>

          {isSubmittedSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                වෘත්තීය සේවාව සාර්ථකව ලියාපදිංචි කරන ලදී!
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#88ad97]">
                ඔබගේ සේවා දැන්වීම දැන් වෘත්තීය සේවා පුවරුවේ දිස්වනු ඇත.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 6. Main Category & Subcategory Selection */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span>06. ඔබගේ සේවය ඇතුළත් වන ප්‍රධාන කාණ්ඩය සහ උප කාණ්ඩය තෝරන්න *</span>
                </label>

                {/* Main Category Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-[#789d87] block mb-1">ප්‍රධාන කාණ්ඩය (Main Category)</span>
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#112318] border border-slate-300 dark:border-[#1e3e2b] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {professionalServiceCategories.map((cat, cIdx) => (
                        <option key={`reg_cat_${cat.category_id}_${cIdx}`} value={cat.category_id}>
                          {cat.category_icon} {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-[#789d87] block mb-1">නගරය / ප්‍රදේශය (Location)</span>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-emerald-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="උදා: කඩවත, කොළඹ"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#112318] border border-slate-300 dark:border-[#1e3e2b] rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Subcategory Pills Grid */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-[#789d87] block mb-1.5">
                    {currentCategory.category_name} යටතේ උප කාණ්ඩය:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-50 dark:bg-[#0e2116] border border-slate-200 dark:border-[#173222] rounded-2xl">
                    {currentCategory.sub_categories.map((sub, sIdx) => {
                      const isSelected = selectedSubCategoryName === sub.name;
                      return (
                        <button
                          key={`reg_sub_${sub.name}_${sIdx}`}
                          type="button"
                          onClick={() => handleSubCategorySelect(sub.name, sub.icon)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                              : 'bg-white dark:bg-[#12281b] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1d3d29] hover:bg-slate-100 dark:hover:bg-[#183524]'
                          }`}
                        >
                          <span>{sub.icon}</span>
                          <span>{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 1. Service Title & Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>01. ඔබට ලබාදිය හැකි සේවය කුමක්ද? *</span>
                </label>
                <textarea
                  rows={2}
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                  placeholder="උදා: ගෘහස්ථ විදුලි රැහැන් ඇදීම, විදුලි කාන්දුවීම් පරික්ෂා කිරීම, උපකරණ සවි කිරීම සහ අලුත්වැඩියාව"
                  className="w-full p-3 bg-slate-50 dark:bg-[#112318] border border-slate-300 dark:border-[#1e3e2b] rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 2. Service Delivery Method (Requirement 01: Interactive Map for Location) */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>02. සේවය ලබාදෙන්නේ කෙසේද? *</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'location', label: 'ස්ථානය සටහන් කරන්න (Specific Location on Map)' },
                    { id: 'anywhere', label: 'ඕනෑම තැනකට පැමිණිය හැක (Travel Anywhere)' },
                    { id: 'online', label: 'Online හරහා (Remote / Online)' },
                    { id: 'customer_must_come', label: 'ඔබ පැමිණිය යුතුයි (Client Visit)' },
                    { id: 'other', label: 'වෙනත් ආකාරයකින් (Other)' },
                  ].map((method, mIdx) => (
                    <label
                      key={`deliv_method_${method.id}_${mIdx}`}
                      className={`flex items-center gap-2 p-2.5 rounded-2xl border cursor-pointer transition-all ${
                        deliveryMethod === method.id
                          ? 'bg-emerald-50 dark:bg-[#122e1e] border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-sm'
                          : 'bg-slate-50 dark:bg-[#112318] border-slate-200 dark:border-[#1d3d29] text-slate-700 dark:text-slate-300 text-xs hover:bg-slate-100 dark:hover:bg-[#163022]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery_method"
                        value={method.id}
                        checked={deliveryMethod === method.id}
                        onChange={() => setDeliveryMethod(method.id as ServiceDeliveryMethod)}
                        className="accent-emerald-600"
                      />
                      <span className="text-xs">{method.label}</span>
                    </label>
                  ))}
                </div>

                {/* Interactive Map Picker when 'location' is selected (Requirement 01) */}
                {deliveryMethod === 'location' && (
                  <div className="p-3 sm:p-4 rounded-3xl bg-slate-50 dark:bg-[#0e2116] border-2 border-emerald-500/40 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-500 animate-bounce" />
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                          සිතියම මත ඔබගේ සේවා ස්ථානය තෝරන්න (Manual Map Pin):
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsFullMapOpen(true)}
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>විශාල සිතියම</span>
                      </button>
                    </div>

                    {/* Place search & GPS tool bar */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={mapSearchQuery}
                          onChange={(e) => handleSearchPlace(e.target.value)}
                          placeholder="නගරය, ගම හෝ පාර සොයන්න (උදා: කඩවත, නුගේගොඩ, මීගමුව)..."
                          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#12281b] border border-slate-300 dark:border-[#1e3e2b] rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {isSearchingMap && (
                          <div className="absolute right-3 top-2.5">
                            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                          </div>
                        )}

                        {/* Search drop-down results */}
                        {mapSearchResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#112419] border border-slate-200 dark:border-[#1a3826] rounded-2xl shadow-xl z-[2000] overflow-hidden">
                            {mapSearchResults.map((res, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectSearchResult(res)}
                                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-[#183625] flex items-center gap-2 border-b border-slate-100 dark:border-[#183524] last:border-none cursor-pointer"
                              >
                                <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                <span className="truncate">{res.shortDisplaySi || res.titleSi}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleGetGpsPosition}
                        title="වත්මන් GPS ස්ථානය"
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all flex-shrink-0"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">මගේ GPS</span>
                      </button>
                    </div>

                    {/* Interactive Leaflet Map Box */}
                    <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden border border-slate-300 dark:border-[#1e3e2b] shadow-inner">
                      <div ref={mapContainerRef} className="w-full h-full z-0" />

                      {/* Center Pin Marker */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[1000] flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-[#0c1a12]">
                          <MapPin className="w-5 h-5 fill-white text-emerald-600" />
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-900/60 blur-[1px] -mt-1" />
                      </div>

                      {/* Live Coordinates / Geocoding Status Overlay */}
                      <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[11px] font-mono flex items-center justify-between z-[1000] shadow-md border border-white/10">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="truncate font-sans font-bold text-emerald-200">
                            {isGeocoding ? 'ස්ථානය පරික්ෂා කරමින්...' : locationName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 hidden sm:inline flex-shrink-0">
                          {mapLat.toFixed(4)}, {mapLng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 dark:text-[#789d87]">
                      * සිතියම Drag කර හෝ ක්ලික් කර නිශ්චිත සේවා ස්ථානය Pin කරන්න.
                    </p>
                  </div>
                )}

                <input
                  type="text"
                  value={deliveryMethodDetails}
                  onChange={(e) => setDeliveryMethodDetails(e.target.value)}
                  placeholder="සේවාව ලබාදෙන ආකාරය පිළිබඳ අමතර විස්තර (උදා: බස්නාහිර පළාත ඇතුළත, සවස 5න් පසු)"
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#112318] border border-slate-300 dark:border-[#1e3e2b] rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 3. Qualifications (Requirement 02: Dynamic item-by-item qualifications downward) */}
              <div className="space-y-3 p-4 rounded-3xl bg-slate-50 dark:bg-[#0e2116] border border-slate-200 dark:border-[#1a3826]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>03. ඔබට ඒ සඳහා ඇති සුදුසුකම් (Qualifications) *</span>
                  </label>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    {qualificationsList.length} ක් ඇතුළත් කර ඇත
                  </span>
                </div>

                {/* Qualification Add Input Row */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentQualInput}
                    onChange={(e) => setCurrentQualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddQualification();
                      }
                    }}
                    placeholder="සුදුසුකම ඇතුළත් කර '+' ඔබන්න (උදා: NVQ Level 4 සහතිකය)..."
                    className="flex-1 px-3.5 py-2.5 bg-white dark:bg-[#12281b] border border-slate-300 dark:border-[#1e3e2b] rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddQualification()}
                    disabled={!currentQualInput.trim()}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-extrabold text-xs rounded-2xl shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>එක් කරන්න</span>
                  </button>
                </div>

                {/* Quick Suggestion Chips */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-[#789d87] block mb-1.5">
                    ඉක්මන් තේරීම් (Quick Suggestions):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickQualificationSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleAddQualification(suggestion)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-white dark:bg-[#12281b] hover:bg-amber-50 dark:hover:bg-[#1a2d1d] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1c3a27] transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3 h-3 text-amber-500" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Added Qualifications List (Requirement 02: එකින් එක පහළට ලැයිස්තුව) */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                    ඇතුළත් කළ සුදුසුකම් ලැයිස්තුව:
                  </span>
                  {qualificationsList.length === 0 ? (
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#12281b] border border-dashed border-slate-300 dark:border-[#1e3e2b] text-center text-xs text-slate-400 dark:text-[#678b75]">
                      තවමත් සුදුසුකම් ඇතුළත් කර නොමැත. ඉහත කොටුවෙන් එකින් එක ඇතුළත් කරන්න.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {qualificationsList.map((qual, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-[#12281b] border border-amber-500/30 text-xs shadow-sm animate-fadeIn"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center flex-shrink-0 shadow-sm">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-100 break-words">
                              {qual}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveQualification(idx)}
                            className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                            title="ඉවත් කරන්න"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Experience Duration & 5. Alternative Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>04. පළපුරුද්දේ කාලසීමාව *</span>
                  </label>
                  <input
                    type="text"
                    value={experienceDuration}
                    onChange={(e) => setExperienceDuration(e.target.value)}
                    placeholder="උදා: වසර 5+, මාස 6"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#112318] border border-slate-300 dark:border-[#1e3e2b] rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    <span>05. විකල්ප දුරකථන අංකය</span>
                  </label>
                  <input
                    type="tel"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="උදා: 0712345678 / 0112345678"
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#112318] border border-slate-300 dark:border-[#1e3e2b] rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Privacy Protection Checkbox */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-[#0c2417] border border-emerald-300/80 dark:border-[#1c472d]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revealContactConsent}
                    onChange={(e) => setRevealContactConsent(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-emerald-600 rounded-md cursor-pointer shrink-0"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      දුරකථන අංකය ප්‍රසිද්ධියේ පෙන්වීමට අවසර දෙමි (Direct Contact Consent)
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight block mt-0.5">
                      (මෙය සලකුණු නොකළහොත්, දුරකථන අංකය සඟවා තබන අතර සේවාලාභීන් In-App Chat මඟින් ඔබ හා සම්බන්ධ වනු ඇත)
                    </span>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-[#00603a] text-white font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>වෘත්තීය සේවාව ලියාපදිංචි කර ප්‍රකාශයට පත් කරන්න</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
