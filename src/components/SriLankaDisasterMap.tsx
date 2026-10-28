import React, { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Phone, 
  Package, 
  X, 
  Waves, 
  ChevronRight, 
  ShieldAlert,
  Search,
  Check,
  HeartHandshake,
  Siren,
  Radio,
  Loader2
} from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { DisasterReliefItem } from '../types';

export interface SriLankaDisasterMapProps {
  disasterItems: DisasterReliefItem[];
  selectedDistrict?: string;
  apiBaseUrl?: string; // රතුවෙලිය Broadcast API URL එක (උදා: https://api.yourdomain.com/api)
  currentUserId?: string;
  onSelectDistrict?: (district: string) => void;
  onOfferRelief?: (item: DisasterReliefItem) => void;
  onOpenReportForm?: (defaultDistrict?: string) => void;
}

export interface DistrictShape {
  id: string;
  nameSi: string;
  nameEn: string;
  provinceSi: string;
  color: string;
  textColor: string;
  d: string;
  labelX: number;
  labelY: number;
  beaconX: number;
  beaconY: number;
  islands?: string[];
}

// දිස්ත්‍රික්ක 25 හි SVG මායිම් සහ පිහිටීම්
export const SRI_LANKA_DISTRICT_MAP: DistrictShape[] = [
  // 1. JAFFNA
  {
    id: 'jaffna',
    nameSi: 'යාපනය',
    nameEn: 'Jaffna',
    provinceSi: 'උතුරු පළාත',
    color: '#ffcd05',
    textColor: '#1f2937',
    d: `M 175,42 C 188,26 218,18 238,24 C 255,29 270,44 286,58 C 305,74 328,95 344,112 C 334,114 316,98 298,84 C 280,72 260,62 240,65 C 222,68 206,75 190,82 C 178,86 168,82 172,70 C 176,56 166,50 175,42 Z`,
    labelX: 236,
    labelY: 42,
    beaconX: 236,
    beaconY: 45,
    islands: [
      'M 134,80 C 142,76 150,82 144,90 C 138,94 130,88 134,80 Z',
      'M 152,58 C 160,54 166,60 162,68 C 156,72 148,66 152,58 Z',
      'M 118,94 C 126,90 130,98 124,104 C 118,106 114,100 118,94 Z'
    ]
  },
  // 2. KILINOCHCHI
  {
    id: 'kilinochchi',
    nameSi: 'කිලිනොච්චිය',
    nameEn: 'Kilinochchi',
    provinceSi: 'උතුරු පළාත',
    color: '#fff19d',
    textColor: '#292524',
    d: `M 190,82 C 206,75 222,68 240,65 C 260,62 280,72 298,84 C 316,98 334,114 344,112 C 352,122 360,132 355,138 C 338,136 312,142 290,140 C 268,138 250,132 232,136 C 214,140 200,152 184,152 C 180,138 184,112 186,96 C 188,90 188,85 190,82 Z`,
    labelX: 275,
    labelY: 118,
    beaconX: 275,
    beaconY: 115,
  },
  // 3. MULLAITIVU
  {
    id: 'mullaitivu',
    nameSi: 'මුලතිව්',
    nameEn: 'Mullaitivu',
    provinceSi: 'උතුරු පළාත',
    color: '#3ea59c',
    textColor: '#ffffff',
    d: `M 290,140 C 312,142 338,136 355,138 C 372,154 394,182 414,212 C 400,218 382,216 368,212 C 352,208 340,212 328,218 C 318,220 305,212 298,202 C 302,192 312,185 316,174 C 320,162 308,154 290,156 C 286,148 288,142 290,140 Z`,
    labelX: 345,
    labelY: 178,
    beaconX: 345,
    beaconY: 175,
  },
  // 4. MANNAR
  {
    id: 'mannar',
    nameSi: 'මන්නාරම',
    nameEn: 'Mannar',
    provinceSi: 'උතුරු පළාත',
    color: '#d3de2c',
    textColor: '#1c1917',
    d: `M 184,152 C 200,152 214,140 232,136 C 238,146 244,160 235,172 C 224,186 215,198 210,214 C 198,218 185,224 175,232 C 162,238 152,248 142,260 C 134,248 136,222 142,200 C 148,178 162,160 184,152 Z`,
    labelX: 180,
    labelY: 202,
    beaconX: 180,
    beaconY: 200,
    islands: [
      'M 92,168 C 110,160 134,172 152,185 C 146,192 126,186 104,178 C 96,174 92,170 92,168 Z'
    ]
  },
  // 5. VAVUNIYA
  {
    id: 'vavuniya',
    nameSi: 'වවුනියාව',
    nameEn: 'Vavuniya',
    provinceSi: 'උතුරු පළාත',
    color: '#7f6424',
    textColor: '#ffffff',
    d: `M 232,136 C 250,132 268,138 290,140 C 288,142 286,148 290,156 C 308,154 320,162 316,174 C 312,185 302,192 298,202 C 292,204 282,208 274,214 C 264,222 254,232 242,238 C 232,232 222,224 210,214 C 215,198 224,186 235,172 C 244,160 238,146 232,136 Z`,
    labelX: 275,
    labelY: 196,
    beaconX: 275,
    beaconY: 194,
  },
  // 6. ANURADHAPURA
  {
    id: 'anuradhapura',
    nameSi: 'අනුරාධපුර',
    nameEn: 'Anuradhapura',
    provinceSi: 'උතුරු මැද පළාත',
    color: '#a9d9a0',
    textColor: '#064e3b',
    d: `M 142,260 C 152,248 162,238 175,232 C 185,224 198,218 210,214 C 222,224 232,232 242,238 C 254,232 264,222 274,214 C 282,208 292,204 298,202 C 305,212 318,220 328,218 C 334,228 342,238 340,248 C 332,260 320,268 314,282 C 305,298 300,314 296,330 C 284,338 272,342 258,340 C 245,338 234,332 224,328 C 210,326 195,334 182,340 C 170,332 158,322 150,305 C 142,290 138,274 142,260 Z`,
    labelX: 250,
    labelY: 288,
    beaconX: 250,
    beaconY: 285,
  },
  // 7. TRINCOMALEE
  {
    id: 'trincomalee',
    nameSi: 'ත්‍රිකුණාමලය',
    nameEn: 'Trincomalee',
    provinceSi: 'නැගෙනහිර පළාත',
    color: '#635fa2',
    textColor: '#ffffff',
    d: `M 328,218 C 340,212 352,208 368,212 C 382,216 400,218 414,212 C 430,236 448,268 460,305 C 445,312 432,320 422,330 C 410,322 396,316 382,315 C 370,302 360,285 348,272 C 344,260 340,248 340,248 C 342,238 334,228 328,218 Z`,
    labelX: 412,
    labelY: 282,
    beaconX: 412,
    beaconY: 280,
  },
  // 8. POLONNARUWA
  {
    id: 'polonnaruwa',
    nameSi: 'පොළොන්නරුව',
    nameEn: 'Polonnaruwa',
    provinceSi: 'උතුරු මැද පළාත',
    color: '#ffce00',
    textColor: '#1c1917',
    d: `M 314,282 C 320,268 332,260 340,248 C 344,260 348,272 360,285 C 370,302 382,315 396,316 C 410,322 422,330 422,330 C 415,348 408,368 405,388 C 390,392 376,388 362,382 C 350,378 338,382 328,390 C 322,375 318,360 312,345 C 306,330 305,305 314,282 Z`,
    labelX: 372,
    labelY: 348,
    beaconX: 372,
    beaconY: 345,
  },
  // 9. BATTICALOA
  {
    id: 'batticaloa',
    nameSi: 'මඩකලපුව',
    nameEn: 'Batticaloa',
    provinceSi: 'නැගෙනහිර පළාත',
    color: '#99cbbd',
    textColor: '#0f172a',
    d: `M 422,330 C 432,320 445,312 460,305 C 475,345 492,390 505,432 C 490,442 478,448 468,452 C 455,432 444,410 435,390 C 422,375 415,355 422,330 Z`,
    labelX: 472,
    labelY: 395,
    beaconX: 472,
    beaconY: 390,
  },
  // 10. AMPARA
  {
    id: 'ampara',
    nameSi: 'අම්පාර',
    nameEn: 'Ampara',
    provinceSi: 'නැගෙනහිර පළාත',
    color: '#3ea44f',
    textColor: '#ffffff',
    d: `M 405,388 C 408,368 415,348 422,330 C 435,390 444,410 455,432 C 468,452 478,448 490,442 C 505,432 525,482 538,542 C 518,555 495,558 480,550 C 468,542 458,528 450,510 C 440,490 434,468 438,448 C 430,432 418,415 405,388 Z`,
    labelX: 486,
    labelY: 508,
    beaconX: 486,
    beaconY: 505,
  },
  // 11. PUTTALAM
  {
    id: 'puttalam',
    nameSi: 'පුත්තලම',
    nameEn: 'Puttalam',
    provinceSi: 'වයඹ පළාත',
    color: '#6fb6e8',
    textColor: '#082f49',
    d: `M 142,260 C 138,274 142,290 150,305 C 158,322 170,332 182,340 C 178,355 174,372 172,390 C 160,402 148,416 138,432 C 126,412 120,385 118,355 C 114,320 115,285 125,250 C 132,254 138,258 142,260 Z`,
    labelX: 142,
    labelY: 345,
    beaconX: 142,
    beaconY: 342,
    islands: [
      'M 104,260 C 110,230 118,205 124,185 C 128,198 124,230 118,265 C 112,275 106,275 104,260 Z'
    ]
  },
  // 12. KURUNEGALA
  {
    id: 'kurunegala',
    nameSi: 'කුරුණෑගල',
    nameEn: 'Kurunegala',
    provinceSi: 'වයඹ පළාත',
    color: '#f17c38',
    textColor: '#ffffff',
    d: `M 182,340 C 195,334 210,326 224,328 C 234,332 245,338 258,340 C 264,354 266,370 262,388 C 258,405 248,418 240,430 C 228,442 216,450 205,455 C 194,448 185,438 178,422 C 172,406 174,390 178,375 C 180,360 181,350 182,340 Z`,
    labelX: 220,
    labelY: 420,
    beaconX: 220,
    beaconY: 416,
  },
  // 13. MATALE
  {
    id: 'matale',
    nameSi: 'මාතලේ',
    nameEn: 'Matale',
    provinceSi: 'මධ්‍යම පළාත',
    color: '#0da783',
    textColor: '#ffffff',
    d: `M 258,340 C 272,342 284,338 296,330 C 300,314 305,298 314,282 C 305,305 306,330 312,345 C 318,360 322,375 328,390 C 315,398 300,405 288,412 C 276,418 266,412 258,405 C 262,388 264,370 258,340 Z`,
    labelX: 295,
    labelY: 382,
    beaconX: 295,
    beaconY: 380,
  },
  // 14. KANDY
  {
    id: 'kandy',
    nameSi: 'මහනුවර',
    nameEn: 'Kandy',
    provinceSi: 'මධ්‍යම පළාත',
    color: '#fff07b',
    textColor: '#292524',
    d: `M 240,430 C 248,418 258,405 266,412 C 276,418 288,412 300,405 C 315,398 328,390 328,390 C 338,382 350,378 362,382 C 356,400 350,422 342,442 C 332,455 318,465 305,472 C 290,470 275,465 262,458 C 252,450 245,440 240,430 Z`,
    labelX: 295,
    labelY: 450,
    beaconX: 295,
    beaconY: 446,
  },
  // 15. NUWARA ELIYA
  {
    id: 'nuwara_eliya',
    nameSi: 'නුවරඑළිය',
    nameEn: 'Nuwara Eliya',
    provinceSi: 'මධ්‍යම පළාත',
    color: '#d44d93',
    textColor: '#ffffff',
    d: `M 262,458 C 275,465 290,470 305,472 C 318,465 332,455 342,442 C 345,455 348,472 342,490 C 334,505 320,518 305,528 C 288,525 272,518 258,508 C 248,495 244,480 248,468 C 252,462 258,460 262,458 Z`,
    labelX: 290,
    labelY: 502,
    beaconX: 290,
    beaconY: 500,
  },
  // 16. GAMPAHA
  {
    id: 'gampaha',
    nameSi: 'ගම්පහ',
    nameEn: 'Gampaha',
    provinceSi: 'බස්නාහිර පළාත',
    color: '#e4f285',
    textColor: '#1c1917',
    d: `M 138,432 C 148,416 160,402 172,390 C 174,390 172,406 178,422 C 185,438 194,448 205,455 C 198,468 188,482 178,495 C 165,492 152,488 142,480 C 134,465 132,448 138,432 Z`,
    labelX: 160,
    labelY: 462,
    beaconX: 160,
    beaconY: 460,
  },
  // 17. COLOMBO
  {
    id: 'colombo',
    nameSi: 'කොළඹ',
    nameEn: 'Colombo',
    provinceSi: 'බස්නාහිර පළාත',
    color: '#007a3d',
    textColor: '#ffffff',
    d: `M 142,480 C 152,488 165,492 178,495 C 172,508 165,520 156,530 C 144,525 136,515 132,502 C 134,492 138,485 142,480 Z`,
    labelX: 154,
    labelY: 512,
    beaconX: 154,
    beaconY: 510,
  },
  // 18. KALUTARA
  {
    id: 'kalutara',
    nameSi: 'කළුතර',
    nameEn: 'Kaluthara',
    provinceSi: 'බස්නාහිර පළාත',
    color: '#d8dbe9',
    textColor: '#1e293b',
    d: `M 156,530 C 165,520 172,508 178,495 C 188,482 198,468 205,455 C 214,472 222,490 228,510 C 218,532 205,555 192,575 C 180,570 170,560 162,548 C 158,540 156,534 156,530 Z`,
    labelX: 182,
    labelY: 558,
    beaconX: 182,
    beaconY: 555,
  },
  // 19. KEGALLE
  {
    id: 'kegalle',
    nameSi: 'කෑගල්ල',
    nameEn: 'Kegalle',
    provinceSi: 'සබරගමුව පළාත',
    color: '#77c8f2',
    textColor: '#0c4a6e',
    d: `M 205,455 C 216,450 228,442 240,430 C 245,440 252,450 262,458 C 258,460 252,462 248,468 C 240,480 232,492 225,505 C 218,492 210,475 205,455 Z`,
    labelX: 228,
    labelY: 468,
    beaconX: 228,
    beaconY: 466,
  },
  // 20. RATNAPURA
  {
    id: 'ratnapura',
    nameSi: 'රත්නපුර',
    nameEn: 'Rathnapura',
    provinceSi: 'සබරගමුව පළාත',
    color: '#f3a677',
    textColor: '#431407',
    d: `M 225,505 C 232,492 240,480 248,468 C 258,475 272,485 285,498 C 298,512 312,525 320,540 C 310,555 295,570 280,582 C 265,588 248,582 232,572 C 220,555 214,535 218,518 C 220,512 222,508 225,505 Z`,
    labelX: 275,
    labelY: 552,
    beaconX: 275,
    beaconY: 550,
  },
  // 21. BADULLA
  {
    id: 'badulla',
    nameSi: 'බදුල්ල',
    nameEn: 'Badulla',
    provinceSi: 'ඌව පළාත',
    color: '#c8c8df',
    textColor: '#2e1065',
    d: `M 342,442 C 350,422 356,400 362,382 C 376,388 390,392 405,388 C 418,415 430,432 438,448 C 425,462 410,478 395,495 C 382,510 368,522 355,535 C 348,520 342,505 342,490 C 348,472 345,455 342,442 Z`,
    labelX: 382,
    labelY: 472,
    beaconX: 382,
    beaconY: 468,
  },
  // 22. MONARAGALA
  {
    id: 'monaragala',
    nameSi: 'මොණරාගල',
    nameEn: 'Monaragala',
    provinceSi: 'ඌව පළාත',
    color: '#9d468b',
    textColor: '#ffffff',
    d: `M 395,495 C 410,478 425,462 438,448 C 434,468 440,490 450,510 C 458,528 468,542 480,550 C 470,572 455,595 440,612 C 425,625 408,622 392,610 C 380,592 372,570 368,548 C 375,532 385,515 395,495 Z`,
    labelX: 435,
    labelY: 558,
    beaconX: 435,
    beaconY: 554,
  },
  // 23. GALLE
  {
    id: 'galle',
    nameSi: 'ගාල්ල',
    nameEn: 'Galle',
    provinceSi: 'දකුණු පළාත',
    color: '#65be7b',
    textColor: '#064e3b',
    d: `M 192,575 C 205,555 218,532 228,510 C 232,572 248,582 265,588 C 255,608 242,628 228,645 C 210,642 195,628 188,610 C 185,595 188,585 192,575 Z`,
    labelX: 215,
    labelY: 622,
    beaconX: 215,
    beaconY: 620,
  },
  // 24. MATARA
  {
    id: 'matara',
    nameSi: 'මාතර',
    nameEn: 'Matara',
    provinceSi: 'දකුණු පළාත',
    color: '#9ea4d4',
    textColor: '#1e1b4b',
    d: `M 265,588 C 280,582 295,570 310,555 C 320,575 330,598 340,618 C 325,635 305,645 285,650 C 265,648 248,638 238,625 C 248,610 258,598 265,588 Z`,
    labelX: 288,
    labelY: 636,
    beaconX: 288,
    beaconY: 632,
  },
  // 25. HAMBANTOTA
  {
    id: 'hambantota',
    nameSi: 'හම්බන්තොට',
    nameEn: 'Hambanthota',
    provinceSi: 'දකුණු පළාත',
    color: '#2762b3',
    textColor: '#ffffff',
    d: `M 310,555 C 320,540 334,505 355,535 C 368,548 372,570 380,592 C 392,610 408,622 425,625 C 440,612 455,595 480,550 C 495,558 518,555 538,542 C 515,595 485,635 448,655 C 410,670 370,665 335,645 C 325,635 318,610 310,555 Z`,
    labelX: 410,
    labelY: 620,
    beaconX: 410,
    beaconY: 616,
  },
];

export const SriLankaDisasterMap: React.FC<SriLankaDisasterMapProps> = ({
  disasterItems,
  selectedDistrict = 'all',
  apiBaseUrl = 'https://api.yourdomain.com/api',
  currentUserId,
  onSelectDistrict,
  onOfferRelief,
  onOpenReportForm,
}) => {
  const [activeDistrictId, setActiveDistrictId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<DisasterReliefItem | null>(() => disasterItems[0] || null);
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictShape | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [offeredIds, setOfferedIds] = useState<string[]>([]);

  // "රතුවෙලිය" 5km Broadcast Modal States
  const [isRathuweliyaOpen, setIsRathuweliyaOpen] = useState(false);
  const [disasterType, setDisasterType] = useState('ජලගැලීම');
  const [disasterDesc, setDisasterDesc] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // වත්මන් User Location එක ලබා ගැනීම
  useEffect(() => {
    Geolocation.getCurrentPosition({ enableHighAccuracy: true })
      .then((pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      })
      .catch((e) => console.log('Location access not available yet', e));
  }, []);

  // ආපදා විස්තර දිස්ත්‍රික්ක අනුව Group කිරීම
  const disastersByDistrict = useMemo(() => {
    const map = new Map<string, DisasterReliefItem[]>();
    for (const item of disasterItems) {
      const raw = (item?.district || '').trim().toLowerCase();
      if (!raw) continue;
      const norm = raw.replace(/ය$/, '');
      const existingRaw = map.get(raw) || [];
      existingRaw.push(item);
      map.set(raw, existingRaw);

      if (norm !== raw) {
        const existingNorm = map.get(norm) || [];
        existingNorm.push(item);
        map.set(norm, existingNorm);
      }
    }
    return map;
  }, [disasterItems]);

  const getDistrictDisasters = (districtNameSi: string, districtNameEn?: string): DisasterReliefItem[] => {
    const rawSi = (districtNameSi || '').trim().toLowerCase();
    const normSi = rawSi.replace(/ය$/, '');
    const listSi = disastersByDistrict.get(rawSi) || disastersByDistrict.get(normSi) || [];
    if (listSi.length > 0) return listSi;
    if (districtNameEn) {
      const dKeyEn = (districtNameEn || '').trim().toLowerCase();
      return disastersByDistrict.get(dKeyEn) || [];
    }
    return [];
  };

  const filteredDisasterItems = useMemo(() => {
    return disasterItems.filter((item) => {
      if (selectedDistrict !== 'all' && item.district !== selectedDistrict) {
        return false;
      }
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        return (
          (item.title || '').toLowerCase().includes(q) ||
          (item.district || '').toLowerCase().includes(q) ||
          (item.locationName || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [disasterItems, selectedDistrict, filterSearch]);

  const handleSelectDistrictOnMap = (district: DistrictShape) => {
    setActiveDistrictId(district.id);
    onSelectDistrict?.(district.nameSi);
    const districtDisasters = getDistrictDisasters(district.nameSi, district.nameEn);
    if (districtDisasters.length > 0) {
      setActiveItem(districtDisasters[0]);
    }
  };

  const handleOfferHelpClick = (item: DisasterReliefItem) => {
    setOfferedIds((prev) => [...prev, item.id]);
    onOfferRelief?.(item);
  };

  // රතුවෙලිය 5km Siren Push Notification එක Backend එකට යැවීම
  const handleBroadcastRathuweliya = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcasting(true);

    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });

      const payload = {
        disasterType,
        description: disasterDesc,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        reporterId: currentUserId || 'anonymous',
      };

      const response = await fetch(`${apiBaseUrl}/rathuweliya/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (resData.success) {
        alert(`🚨 රතුවෙලිය අනතුරු ඇඟවීම සාර්ථකයි!\nකිලෝමීටර් 5 සීමාවේ සිටින පරිශීලකයන් ${resData.alertedUsersCount} කට සයිරන් ශබ්දය සමඟ පණිවිඩය නිකුත් කෙරුණි.`);
        setIsRathuweliyaOpen(false);
        setDisasterDesc('');
      } else {
        alert(resData.error || 'දැනුම්දීම යැවීමට නොහැකි විය.');
      }
    } catch (err) {
      console.error(err);
      alert('ස්ථානය ලබා ගැනීමට හෝ සර්වරය සම්බන්ධ කර ගැනීමට නොහැකි විය.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="w-full bg-slate-900/95 text-white rounded-3xl border-2 border-emerald-500/50 p-4 sm:p-5 shadow-2xl relative overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-emerald-800/60 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/30">
            <Waves className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                ශ්‍රී ලංකා සජීවී ආපදා සහන සිතියම & රතුවෙලිය (25 Districts)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-mono text-[9px] font-black animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>5KM SIREN RADAR</span>
              </span>
            </div>
            <p className="text-[11px] text-emerald-300/90 font-medium mt-0.5">
              දිවයිනේ දිස්ත්‍රික්ක 25 හි ආපදා තත්ත්වයන් සහ කිලෝමීටර් 5 සීමාවට හදිසි සයිරන් අනතුරු ඇඟවීම් සජීවීව ක්‍රියාත්මක කරන්න.
            </p>
          </div>
        </div>

        {/* Action Buttons: Report & Rathuweliya Siren Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsRathuweliyaOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs shadow-md shadow-red-600/40 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-red-400"
          >
            <Siren className="w-4 h-4 animate-spin text-amber-300" />
            <span>🚨 රතුවෙලිය 5km සයිරන් නාද කරන්න</span>
          </button>

          {onOpenReportForm && (
            <button
              type="button"
              onClick={() => onOpenReportForm(selectedDistrict !== 'all' ? selectedDistrict : undefined)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-600/50 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>+ සාමාන්‍ය ආපදාවක් ලියාපදිංචි කරන්න</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start relative z-10">
        
        {/* Left Map Canvas (6 Columns) */}
        <div className="lg:col-span-6 xl:col-span-6 bg-slate-950 border-2 border-emerald-600/40 rounded-2xl p-3 sm:p-4 relative flex flex-col items-center justify-center min-h-[560px] shadow-inner">
          
          <div className="w-full flex items-center justify-between text-xs pb-2 mb-1 border-b border-emerald-900/60 px-1">
            <h4 className="font-serif font-black text-white text-sm sm:text-base tracking-wide flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>25 Districts Live Geo-Radar</span>
            </h4>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="flex items-center gap-1 bg-red-950 text-red-300 font-bold px-2 py-0.5 rounded-full border border-red-800">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                <span>ආපදා: {disasterItems.length}</span>
              </span>
            </div>
          </div>

          {/* SVG Map Container */}
          <div className="relative w-full max-w-[420px] aspect-[5.5/7.2] mx-auto select-none py-1">
            <svg
              viewBox="80 10 470 670"
              className="w-full h-full drop-shadow-md"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="districtGlow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.35" />
                </filter>
              </defs>

              <g filter="url(#districtGlow)">
                {SRI_LANKA_DISTRICT_MAP.map((district, dIdx) => {
                  const disasters = getDistrictDisasters(district.nameSi, district.nameEn);
                  const hasDisaster = disasters.length > 0;
                  const isSelected = selectedDistrict === district.nameSi || activeDistrictId === district.id;
                  const isHovered = hoveredDistrict?.id === district.id;

                  return (
                    <g
                      key={`district_poly_${district.id}_${dIdx}`}
                      className="cursor-pointer transition-all duration-200"
                      onClick={() => handleSelectDistrictOnMap(district)}
                      onMouseEnter={() => setHoveredDistrict(district)}
                      onMouseLeave={() => setHoveredDistrict(null)}
                    >
                      {/* District Shape */}
                      <path
                        d={district.d}
                        fill={district.color}
                        stroke={isSelected ? '#ffffff' : isHovered ? '#1e293b' : '#ffffff'}
                        strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.4}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className={`transition-all duration-150 ${
                          isSelected 
                            ? 'brightness-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]' 
                            : isHovered 
                              ? 'brightness-105' 
                              : 'hover:brightness-105'
                        }`}
                        opacity={selectedDistrict !== 'all' && !isSelected ? 0.65 : 1}
                      />

                      {/* District Islands */}
                      {district.islands?.map((islandD, idx) => (
                        <path
                          key={idx}
                          d={islandD}
                          fill={district.color}
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                        />
                      ))}

                      {/* English Label */}
                      <text
                        x={district.labelX}
                        y={district.labelY}
                        textAnchor="middle"
                        fill={district.textColor}
                        fontSize={['colombo', 'gampaha', 'kalutara'].includes(district.id) ? '9' : '10.5'}
                        fontWeight="800"
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                        className="pointer-events-none select-none drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]"
                      >
                        {district.nameEn}
                      </text>

                      {/* Sinhala Sub-Label on Hover/Select */}
                      {(isHovered || isSelected) && (
                        <text
                          x={district.labelX}
                          y={district.labelY + 11}
                          textAnchor="middle"
                          fill={district.textColor}
                          fontSize="8.5"
                          fontWeight="900"
                          className="pointer-events-none select-none transition-opacity duration-200"
                        >
                          ({district.nameSi})
                        </text>
                      )}

                      {/* Live Radar Siren Pulse */}
                      {hasDisaster && (
                        <g transform={`translate(${district.beaconX}, ${district.beaconY})`}>
                          <circle r="18" fill="#ef4444" opacity="0.3" className="animate-ping" />
                          <circle r="11" fill="#ef4444" opacity="0.6" />
                          <circle
                            r="6"
                            fill="#dc2626"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="drop-shadow-[0_0_8px_rgba(239,68,68,1)]"
                          />
                          <g transform="translate(10, -10)">
                            <circle r="6" fill="#7f1d1d" stroke="#ffffff" strokeWidth="1" />
                            <text
                              y="2.5"
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="7.5"
                              fontWeight="900"
                              fontFamily="monospace"
                            >
                              {disasters.length}
                            </text>
                          </g>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Map Footer */}
          <div className="w-full mt-2 pt-2 border-t border-emerald-900/60 flex items-center justify-between text-xs text-slate-300">
            <span className="text-[11px] text-slate-400">
              දිස්ත්‍රික්කය මත Click කර විස්තර සහ සහන අවශ්‍යතා බලන්න
            </span>
            <span className="font-bold text-emerald-300">
              {hoveredDistrict 
                ? `තෝරාගැනීම: ${hoveredDistrict.nameSi} (${hoveredDistrict.nameEn})` 
                : selectedDistrict !== 'all' 
                  ? `සක්‍රිය: ${selectedDistrict} දිස්ත්‍රික්කය` 
                  : 'දිස්ත්‍රික්ක 25 සක්‍රියයි'}
            </span>
          </div>
        </div>

        {/* Right Details Panel (6 Columns) */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-3.5">
          
          {/* Quick Filter Toolbar */}
          <div className="p-3 bg-slate-950/80 rounded-2xl border border-emerald-800/60 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>දිස්ත්‍රික්කය තෝරන්න:</span>
              </span>

              <select
                value={selectedDistrict}
                onChange={(e) => {
                  const val = e.target.value;
                  onSelectDistrict?.(val);
                  if (val !== 'all') {
                    const foundDisasters = getDistrictDisasters(val);
                    if (foundDisasters.length > 0) setActiveItem(foundDisasters[0]);
                  }
                }}
                className="px-2.5 py-1 bg-slate-900 border border-emerald-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                <option value="all">සියලු දිස්ත්‍රික්ක ({disasterItems.length})</option>
                {SRI_LANKA_DISTRICT_MAP.map((d, dIdx) => {
                  const cnt = getDistrictDisasters(d.nameSi, d.nameEn).length;
                  return (
                    <option key={`dist_opt_${d.id}_${dIdx}`} value={d.nameSi}>
                      {d.nameSi} ({d.nameEn}) {cnt > 0 ? `(🚨 ${cnt})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="ආපදා හෝ සහනාධාර අවශ්‍යතා සොයන්න..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-emerald-800/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 font-medium"
              />
            </div>
          </div>

          {/* Active Disaster Detailed Card */}
          {activeItem ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-red-950/80 via-slate-900 to-[#071911] border-2 border-red-500 shadow-xl space-y-3.5 relative transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] uppercase tracking-wider animate-pulse flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      <span>හදිසි ආපදා සහන</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-200 border border-emerald-700 font-bold text-[10px]">
                      📍 {activeItem.district} ({activeItem.locationName})
                    </span>
                  </div>
                  <h4 className="text-base font-black text-white leading-snug">
                    {activeItem.title}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold cursor-pointer"
                  title="Close Card"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-200 font-medium leading-relaxed bg-black/40 p-3 rounded-xl border border-red-900/60">
                {activeItem.description}
              </p>

              <div className="grid grid-cols-2 gap-2 p-3 bg-red-900/20 rounded-xl border border-red-800/60">
                <div>
                  <span className="text-[10px] text-red-300 font-bold block">අවශ්‍ය ප්‍රමාණය / ඉලක්කය:</span>
                  <span className="text-xs font-black text-white font-mono">{activeItem.targetQuantity || 'අවශ්‍යයි'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-300 font-bold block">සහන තත්ත්වය:</span>
                  <span className="text-xs font-black text-amber-300">
                    {activeItem.status === 'collecting' ? '📦 එකතු කරමින් පවතී' : '🚨 කඩිනමින් අවශ්‍යයි'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">සම්බන්ධීකාරක:</span>
                  <span className="text-xs font-bold text-white truncate block">{activeItem.contactPerson}</span>
                </div>

                <a
                  href={`tel:${activeItem.contactPhone}`}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-red-600/30 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Phone className="w-4 h-4" />
                  <span className="font-mono">{activeItem.contactPhone}</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => handleOfferHelpClick(activeItem)}
                className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
                  offeredIds.includes(activeItem.id)
                    ? 'bg-emerald-700 text-white'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                }`}
              >
                {offeredIds.includes(activeItem.id) ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>ඔබ සහය වීමට කැමැත්ත පලකර ඇත (Thank You!)</span>
                  </>
                ) : (
                  <>
                    <HeartHandshake className="w-4 h-4 text-amber-300" />
                    <span>මම මේ සඳහා සහය වෙමි (Offer Relief Support)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-emerald-900/80 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white">
                ආපදා විස්තර බැලීමට සිතියමෙන් හෝ පහතින් තෝරන්න
              </h4>
              <p className="text-[11px] text-slate-400">
                සිතියමේ රතු පැහැති රේඩාර් සලකුණක් ක්ලික් කිරීමෙන් සම්බන්ධීකාරක තොරතුරු සහ ආධාර අවශ්‍යතා ලබාගත හැක.
              </p>
            </div>
          )}

          {/* Quick List */}
          <div className="space-y-2">
            <h5 className="text-xs font-black text-emerald-300 flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                <span>ආපදා සහන ලැයිස්තුව ({filteredDisasterItems.length})</span>
              </span>
              {selectedDistrict !== 'all' && (
                <button
                  type="button"
                  onClick={() => onSelectDistrict?.('all')}
                  className="text-[10px] text-emerald-400 hover:underline cursor-pointer font-bold"
                >
                  සියල්ල පෙන්වන්න
                </button>
              )}
            </h5>

            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
              {filteredDisasterItems.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-950 text-center text-xs text-slate-400">
                  තෝරාගත් සෙවුමට හෝ දිස්ත්‍රික්කයට අදාළ ආපදා වාර්තා වී නොමැත.
                </div>
              ) : (
                filteredDisasterItems.map((item, dIdx) => (
                  <button
                    key={`map_disaster_${item.id || 'd'}_${dIdx}`}
                    type="button"
                    onClick={() => setActiveItem(item)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2 border cursor-pointer ${
                      activeItem?.id === item.id
                        ? 'bg-red-950/80 border-red-500 text-white shadow-md'
                        : 'bg-slate-900/80 hover:bg-slate-800/90 border-emerald-900/50 text-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] bg-red-600 text-white font-mono font-black px-1.5 py-0.5 rounded">
                          {item.district}
                        </span>
                        <span className="text-xs font-bold truncate text-white">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        {item.targetQuantity} • {item.contactPerson}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* "රතුවෙලිය" 5km Emergency Broadcast Popup Modal */}
      {isRathuweliyaOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl text-white relative">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white">
                  <Siren className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">රතුවෙලිය - කිලෝමීටර් 5 සයිරන් නාදය</h3>
                  <span className="text-[10px] text-red-400 font-bold block">5km High-Priority Alarm Broadcast</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsRathuweliyaOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBroadcastRathuweliya} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">ආපදා වර්ගය (Disaster Type):</label>
                <select
                  value={disasterType}
                  onChange={(e) => setDisasterType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-red-500"
                >
                  <option value="ජලගැලීමක්">🌊 ජලගැලීමක් (Flood)</option>
                  <option value="නායයාමක්">⛰️ නායයාමක් (Landslide)</option>
                  <option value="ගින්නක්">🔥 ගින්නක් (Wildfire / Building Fire)</option>
                  <option value="වන අලි ප්‍රහාරයක්">🐘 වන අලි ප්‍රහාරයක් (Wild Elephant Alert)</option>
                  <option value="සුනාමි / මුහුදු රළ">🌊 සුනාමි / රළ අනතුරක් (Tsunami / Tidal)</option>
                  <option value="කුණාටුවක් / ගස් කඩාවැටීමක්">🌪️ කුණාටුවක් (Storm / Fallen Trees)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">හදිසි විස්තරය සහ ප්‍රදේශය:</label>
                <textarea
                  required
                  rows={3}
                  value={disasterDesc}
                  onChange={(e) => setDisasterDesc(e.target.value)}
                  placeholder="සිද්ධිය සිදුවූ නිශ්චිත ස්ථානය සහ දැනුවත් විය යුතු කරුණු ඇතුළත් කරන්න..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="p-3 bg-red-950/60 border border-red-900/80 rounded-xl">
                <p className="text-[11px] text-red-200 leading-relaxed font-medium">
                  ⚠️ <strong>අවධානයයි:</strong> ඔබ මෙම දැනුම්දීම Submit කළ සැනින්, ඔබේ GPS Coordinates අනුව කිලෝමීටර් 5ක් වටපිටාවේ සිටින සියලුම දෙනාගේ දුරකථන Silent කර තිබුණද සයිරන් නාද වේ.
                </p>
              </div>

              <button
                type="submit"
                disabled={isBroadcasting}
                className="w-full py-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                {isBroadcasting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>සයිරන් පණිවිඩය නිකුත් කරමින් පවතී...</span>
                  </>
                ) : (
                  <>
                    <Siren className="w-4 h-4" />
                    <span>🚨 කිලෝමීටර් 5 සීමාවට සයිරන් නාද කරන්න</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
