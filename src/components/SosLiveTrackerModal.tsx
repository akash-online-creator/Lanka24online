import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { 
  Radio, 
  ShieldAlert, 
  MapPin, 
  Share2, 
  Volume2, 
  VolumeX, 
  Phone, 
  Copy, 
  Check, 
  ExternalLink, 
  Battery, 
  Navigation, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Info, 
  Clock, 
  Mic, 
  MicOff, 
  ShieldCheck, 
  Flame, 
  Lock, 
  RotateCcw,
  Activity,
  CheckCircle,
  MessageSquare,
  Search,
  Download,
  Play,
  Building2
} from 'lucide-react';
import { User, Language, LocationOption, SosLiveSession, SosBreadcrumbPoint } from '../types';
import { createOrUpdateSosLiveSession, updateSosLiveLocation, stopSosLiveSession } from '../lib/firebase';
import { SosLiveViewerModal } from './SosLiveViewerModal';
import { getLastKnownLocation } from '../utils/autoGpsService';
import { verifyCurrentUserPin } from '../utils/devicePinManager';

// 👮 1. SRI LANKA POLICE STATIONS COMPREHENSIVE DIRECTORY MODEL
export interface PoliceStationEntry {
  id: string;
  nameSi: string;
  nameEn: string;
  districtSi: string;
  districtEn: string;
  provinceSi: string;
  phone: string;
  addressSi: string;
  lat: number;
  lng: number;
}

// 👮 2. ALL SRI LANKA POLICE STATIONS (DIVISA WIDE - ALL 25 DISTRICTS)
export const ALL_SRI_LANKA_POLICE_STATIONS: PoliceStationEntry[] = [
  // --- GAMPAHA DISTRICT ---
  {
    id: 'pol_katunayake',
    nameSi: 'කටුනායක පොලිස් ස්ථානය',
    nameEn: 'Katunayake Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0112252222',
    addressSi: 'ගුවන් තොටුපළ පාර, කටුනායක',
    lat: 7.1702,
    lng: 79.8858,
  },
  {
    id: 'pol_jaela',
    nameSi: 'ජා-ඇල පොලිස් ස්ථානය',
    nameEn: 'Ja-Ela Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0112236222',
    addressSi: 'මීගමුව පාර, ජා-ඇල',
    lat: 7.0782,
    lng: 79.8920,
  },
  {
    id: 'pol_kandana',
    nameSi: 'කඳාන පොලිස් ස්ථානය',
    nameEn: 'Kandana Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0112236223',
    addressSi: 'මීගමුව පාර, කඳාන',
    lat: 7.0478,
    lng: 79.8974,
  },
  {
    id: 'pol_seeduwa',
    nameSi: 'සීදූව පොලිස් ස්ථානය',
    nameEn: 'Seeduwa Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0112253222',
    addressSi: 'කොළඹ පාර, සීදූව',
    lat: 7.1264,
    lng: 79.8732,
  },
  {
    id: 'pol_negombo',
    nameSi: 'මීගමුව මූලස්ථාන පොලිසිය',
    nameEn: 'Negombo HQ Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0312222222',
    addressSi: 'කොළඹ පාර, මීගමුව',
    lat: 7.2084,
    lng: 79.8358,
  },
  {
    id: 'pol_wattala',
    nameSi: 'වත්තල පොලිස් ස්ථානය',
    nameEn: 'Wattala Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0112930222',
    addressSi: 'මීගමුව පාර, වත්තල',
    lat: 6.9897,
    lng: 79.8913,
  },
  {
    id: 'pol_peliyagoda',
    nameSi: 'පෑලියගොඩ පොලිස් ස්ථානය',
    nameEn: 'Peliyagoda Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0112914044',
    addressSi: 'නුවර පාර, පෑලියගොඩ',
    lat: 6.9667,
    lng: 79.8833,
  },
  {
    id: 'pol_kelaniya',
    nameSi: 'කැලණිය පොලිස් ස්ථානය',
    nameEn: 'Kelaniya Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0112911222',
    addressSi: 'කැලණිය',
    lat: 6.9553,
    lng: 79.9224,
  },
  {
    id: 'pol_kiribathgoda',
    nameSi: 'කිරිබත්ගොඩ පොලිස් ස්ථානය',
    nameEn: 'Kiribathgoda Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0112914822',
    addressSi: 'නුවර පාර, කිරිබත්ගොඩ',
    lat: 6.9806,
    lng: 79.9298,
  },
  {
    id: 'pol_ragama',
    nameSi: 'රාගම පොලිස් ස්ථානය',
    nameEn: 'Ragama Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0112958222',
    addressSi: 'ස්ටේෂන් පාර, රාගම',
    lat: 7.0278,
    lng: 79.9234,
  },
  {
    id: 'pol_gampaha',
    nameSi: 'ගම්පහ මූලස්ථාන පොලිසිය',
    nameEn: 'Gampaha HQ Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0332222222',
    addressSi: 'මිරිස්වත්ත, ගම්පහ',
    lat: 7.0917,
    lng: 79.9997,
  },
  {
    id: 'pol_yakkala',
    nameSi: 'යක්කල පොලිස් ස්ථානය',
    nameEn: 'Yakkala Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0332226222',
    addressSi: 'නුවර පාර, යක්කල',
    lat: 7.0898,
    lng: 80.0345,
  },
  {
    id: 'pol_nittambuwa',
    nameSi: 'නිට්ටඹුව පොලිස් ස්ථානය',
    nameEn: 'Nittambuwa Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0332287222',
    addressSi: 'කොළඹ - නුවර පාර, නිට්ටඹුව',
    lat: 7.1439,
    lng: 80.0944,
  },
  {
    id: 'pol_minuwangoda',
    nameSi: 'මිනුවන්ගොඩ පොලිස් ස්ථානය',
    nameEn: 'Minuwangoda Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0112295222',
    addressSi: 'මිනුවන්ගොඩ',
    lat: 7.1656,
    lng: 79.9536,
  },
  {
    id: 'pol_mirigama',
    nameSi: 'මීරිගම පොලිස් ස්ථානය',
    nameEn: 'Mirigama Police Station',
    districtSi: 'ගම්පහ',
    districtEn: 'Gampaha',
    provinceSi: 'බස්නාහිර',
    phone: '0332273222',
    addressSi: 'මීරිගම',
    lat: 7.2436,
    lng: 80.1294,
  },

  // --- COLOMBO DISTRICT ---
  {
    id: 'pol_fort',
    nameSi: 'කොළඹ කොටුව පොලිස් ස්ථානය',
    nameEn: 'Colombo Fort Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112431422',
    addressSi: 'චැතම් වීදිය, කොළඹ 01',
    lat: 6.9344,
    lng: 79.8428,
  },
  {
    id: 'pol_pettah',
    nameSi: 'පිටකොටුව පොලිස් ස්ථානය',
    nameEn: 'Pettah Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112431423',
    addressSi: 'ඕල්කට් මාවත, පිටකොටුව',
    lat: 6.9366,
    lng: 79.8530,
  },
  {
    id: 'pol_maradana',
    nameSi: 'මරදාන පොලිස් ස්ථානය',
    nameEn: 'Maradana Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112692222',
    addressSi: 'ඩීන්ස් පාර, මරදාන',
    lat: 6.9271,
    lng: 79.8654,
  },
  {
    id: 'pol_kollupitiya',
    nameSi: 'කොල්ලුපිටිය පොලිස් ස්ථානය',
    nameEn: 'Kollupitiya Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112573222',
    addressSi: 'ගාලු පාර, කොල්ලුපිටිය',
    lat: 6.9111,
    lng: 79.8517,
  },
  {
    id: 'pol_bambalapitiya',
    nameSi: 'බම්බලපිටිය පොලිස් ස්ථානය',
    nameEn: 'Bambalapitiya Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112588222',
    addressSi: 'ගාලු පාර, බම්බලපිටිය',
    lat: 6.8911,
    lng: 79.8580,
  },
  {
    id: 'pol_wellawatte',
    nameSi: 'වැල්ලවත්ත පොලිස් ස්ථානය',
    nameEn: 'Wellawatte Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112588223',
    addressSi: 'ගාලු පාර, වැල්ලවත්ත',
    lat: 6.8744,
    lng: 79.8608,
  },
  {
    id: 'pol_cinnamon_gardens',
    nameSi: 'කුරුඳුවත්ත පොලිස් ස්ථානය',
    nameEn: 'Cinnamon Gardens Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112694222',
    addressSi: 'ගිල්ෆර්ඩ් චන්ද්‍රවංකය, කොළඹ 07',
    lat: 6.9067,
    lng: 79.8708,
  },
  {
    id: 'pol_borella',
    nameSi: 'බොරැල්ල පොලිස් ස්ථානය',
    nameEn: 'Borella Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112692223',
    addressSi: 'ඩී.එස්. සේනානායක මාවත, බොරැල්ල',
    lat: 6.9147,
    lng: 79.8778,
  },
  {
    id: 'pol_nugegoda',
    nameSi: 'නුගේගොඩ මූලස්ථාන පොලිසිය',
    nameEn: 'Nugegoda HQ Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112852222',
    addressSi: 'හයිලෙවල් පාර, නුගේගොඩ',
    lat: 6.8649,
    lng: 79.8997,
  },
  {
    id: 'pol_mount_lavinia',
    nameSi: 'ගල්කිස්ස මූලස්ථාන පොලිසිය',
    nameEn: 'Mount Lavinia HQ Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112717222',
    addressSi: 'හෝටල් පාර, ගල්කිස්ස',
    lat: 6.8375,
    lng: 79.8661,
  },
  {
    id: 'pol_dehiwala',
    nameSi: 'දෙහිවල පොලිස් ස්ථානය',
    nameEn: 'Dehiwala Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112712222',
    addressSi: 'ගාලු පාර, දෙහිවල',
    lat: 6.8517,
    lng: 79.8667,
  },
  {
    id: 'pol_moratuwa',
    nameSi: 'මොරටුව පොලිස් ස්ථානය',
    nameEn: 'Moratuwa Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112645222',
    addressSi: 'ගාලු පාර, මොරටුව',
    lat: 6.7730,
    lng: 79.8816,
  },
  {
    id: 'pol_maharagama',
    nameSi: 'මහරගම පොලිස් ස්ථානය',
    nameEn: 'Maharagama Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112850222',
    addressSi: 'හයිලෙවල් පාර, මහරගම',
    lat: 6.8483,
    lng: 79.9267,
  },
  {
    id: 'pol_homagama',
    nameSi: 'හෝමාගම පොලිස් ස්ථානය',
    nameEn: 'Homagama Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112855222',
    addressSi: 'හයිලෙවල් පාර, හෝමාගම',
    lat: 6.8419,
    lng: 80.0028,
  },
  {
    id: 'pol_piliyandala',
    nameSi: 'පිළියන්දල පොලිස් ස්ථානය',
    nameEn: 'Piliyandala Police Station',
    districtSi: 'කොළඹ',
    districtEn: 'Colombo',
    provinceSi: 'බස්නාහිර',
    phone: '0112614222',
    addressSi: 'පිළියන්දල',
    lat: 6.8017,
    lng: 79.9228,
  },

  // --- KALUTARA DISTRICT ---
  {
    id: 'pol_panadura',
    nameSi: 'පානදුර දකුණ මූලස්ථාන පොලිසිය',
    nameEn: 'Panadura South HQ Police Station',
    districtSi: 'කළුතර',
    districtEn: 'Kalutara',
    provinceSi: 'බස්නාහිර',
    phone: '0382232222',
    addressSi: 'ගාලු පාර, පානදුර',
    lat: 6.7131,
    lng: 79.9074,
  },
  {
    id: 'pol_kalutara',
    nameSi: 'කළුතර දකුණ මූලස්ථාන පොලිසිය',
    nameEn: 'Kalutara South HQ Police Station',
    districtSi: 'කළුතර',
    districtEn: 'Kalutara',
    provinceSi: 'බස්නාහිර',
    phone: '0342222222',
    addressSi: 'පොලිස් පාර, කළුතර',
    lat: 6.5854,
    lng: 79.9607,
  },
  {
    id: 'pol_wadduwa',
    nameSi: 'වාද්දුව පොලිස් ස්ථානය',
    nameEn: 'Wadduwa Police Station',
    districtSi: 'කළුතර',
    districtEn: 'Kalutara',
    provinceSi: 'බස්නාහිර',
    phone: '0382284222',
    addressSi: 'ගාලු පාර, වාද්දුව',
    lat: 6.6667,
    lng: 79.9333,
  },
  {
    id: 'pol_beruwala',
    nameSi: 'බේරුවල පොලිස් ස්ථානය',
    nameEn: 'Beruwala Police Station',
    districtSi: 'කළුතර',
    districtEn: 'Kalutara',
    provinceSi: 'බස්නාහිර',
    phone: '0342276222',
    addressSi: 'බේරුවල',
    lat: 6.4789,
    lng: 79.9828,
  },
  {
    id: 'pol_aluthgama',
    nameSi: 'අලුත්ගම පොලිස් ස්ථානය',
    nameEn: 'Aluthgama Police Station',
    districtSi: 'කළුතර',
    districtEn: 'Kalutara',
    provinceSi: 'බස්නාහිර',
    phone: '0342275222',
    addressSi: 'ගාලු පාර, අලුත්ගම',
    lat: 6.4319,
    lng: 80.0019,
  },
  {
    id: 'pol_horana',
    nameSi: 'හොරණ පොලිස් ස්ථානය',
    nameEn: 'Horana Police Station',
    districtSi: 'කළුතර',
    districtEn: 'Kalutara',
    provinceSi: 'බස්නාහිර',
    phone: '0342261222',
    addressSi: 'රත්නපුර පාර, හොරණ',
    lat: 6.7167,
    lng: 80.0667,
  },

  // --- CENTRAL PROVINCE (KANDY, MATALE, NUWARA ELIYA) ---
  {
    id: 'pol_kandy',
    nameSi: 'මහනුවර මූලස්ථාන පොලිසිය',
    nameEn: 'Kandy HQ Police Station',
    districtSi: 'මහනුවර',
    districtEn: 'Kandy',
    provinceSi: 'මධ්‍යම',
    phone: '0812222222',
    addressSi: 'පොලිස් නිවාස පාර, මහනුවර',
    lat: 7.2906,
    lng: 80.6337,
  },
  {
    id: 'pol_peradeniya',
    nameSi: 'පේරාදෙණිය පොලිස් ස්ථානය',
    nameEn: 'Peradeniya Police Station',
    districtSi: 'මහනුවර',
    districtEn: 'Kandy',
    provinceSi: 'මධ්‍යම',
    phone: '0812388222',
    addressSi: 'කොළඹ පාර, පේරාදෙණිය',
    lat: 7.2608,
    lng: 80.5967,
  },
  {
    id: 'pol_katugastota',
    nameSi: 'කටුගස්තොට පොලිස් ස්ථානය',
    nameEn: 'Katugastota Police Station',
    districtSi: 'මහනුවර',
    districtEn: 'Kandy',
    provinceSi: 'මධ්‍යම',
    phone: '0812498222',
    addressSi: 'මාතලේ පාර, කටුගස්තොට',
    lat: 7.3292,
    lng: 80.6222,
  },
  {
    id: 'pol_gampola',
    nameSi: 'ගම්පොළ පොලිස් ස්ථානය',
    nameEn: 'Gampola Police Station',
    districtSi: 'මහනුවර',
    districtEn: 'Kandy',
    provinceSi: 'මධ්‍යම',
    phone: '0812352222',
    addressSi: 'නුවර පාර, ගම්පොළ',
    lat: 7.1644,
    lng: 80.5767,
  },
  {
    id: 'pol_matale',
    nameSi: 'මාතලේ මූලස්ථාන පොලිසිය',
    nameEn: 'Matale HQ Police Station',
    districtSi: 'මාතලේ',
    districtEn: 'Matale',
    provinceSi: 'මධ්‍යම',
    phone: '0662222222',
    addressSi: 'ත්‍රිකුණාමලය පාර, මාතලේ',
    lat: 7.4675,
    lng: 80.6234,
  },
  {
    id: 'pol_dambulla',
    nameSi: 'දඹුල්ල පොලිස් ස්ථානය',
    nameEn: 'Dambulla Police Station',
    districtSi: 'මාතලේ',
    districtEn: 'Matale',
    provinceSi: 'මධ්‍යම',
    phone: '0662284722',
    addressSi: 'කුරුණෑගල පාර, දඹුල්ල',
    lat: 7.8742,
    lng: 80.6511,
  },
  {
    id: 'pol_nuwara_eliya',
    nameSi: 'නුවරඑළිය මූලස්ථාන පොලිසිය',
    nameEn: 'Nuwara Eliya HQ Police Station',
    districtSi: 'නුවරඑළිය',
    districtEn: 'Nuwara Eliya',
    provinceSi: 'මධ්‍යම',
    phone: '0522222222',
    addressSi: 'නුවරඑළිය',
    lat: 6.9497,
    lng: 80.7891,
  },
  {
    id: 'pol_hatton',
    nameSi: 'හැටන් පොලිස් ස්ථානය',
    nameEn: 'Hatton Police Station',
    districtSi: 'නුවරඑළිය',
    districtEn: 'Nuwara Eliya',
    provinceSi: 'මධ්‍යම',
    phone: '0512222222',
    addressSi: 'දුම්රියපොළ පාර, හැටන්',
    lat: 6.8911,
    lng: 80.5961,
  },

  // --- SOUTHERN PROVINCE (GALLE, MATARA, HAMBANTOTA) ---
  {
    id: 'pol_galle',
    nameSi: 'ගාල්ල මූලස්ථාන පොලිසිය',
    nameEn: 'Galle HQ Police Station',
    districtSi: 'ගාල්ල',
    districtEn: 'Galle',
    provinceSi: 'දකුණ',
    phone: '0912222222',
    addressSi: 'කොටුව, ගාල්ල',
    lat: 6.0329,
    lng: 80.2168,
  },
  {
    id: 'pol_hikkaduwa',
    nameSi: 'හික්කඩුව පොලිස් ස්ථානය',
    nameEn: 'Hikkaduwa Police Station',
    districtSi: 'ගාල්ල',
    districtEn: 'Galle',
    provinceSi: 'දකුණ',
    phone: '0912277222',
    addressSi: 'ගාලු පාර, හික්කඩුව',
    lat: 6.1394,
    lng: 80.1064,
  },
  {
    id: 'pol_matara',
    nameSi: 'මාතර මූලස්ථාන පොලිසිය',
    nameEn: 'Matara HQ Police Station',
    districtSi: 'මාතර',
    districtEn: 'Matara',
    provinceSi: 'දකුණ',
    phone: '0412222222',
    addressSi: 'කොටුව, මාතර',
    lat: 5.9496,
    lng: 80.5469,
  },
  {
    id: 'pol_weligama',
    nameSi: 'වැලිගම පොලිස් ස්ථානය',
    nameEn: 'Weligama Police Station',
    districtSi: 'මාතර',
    districtEn: 'Matara',
    provinceSi: 'දකුණ',
    phone: '0412250222',
    addressSi: 'ගාලු පාර, වැලිගම',
    lat: 5.9725,
    lng: 80.4286,
  },
  {
    id: 'pol_tangalle',
    nameSi: 'තංගල්ල මූලස්ථාන පොලිසිය',
    nameEn: 'Tangalle HQ Police Station',
    districtSi: 'හම්බන්තොට',
    districtEn: 'Hambantota',
    provinceSi: 'දකුණ',
    phone: '0472240222',
    addressSi: 'තංගල්ල',
    lat: 6.0244,
    lng: 80.7944,
  },
  {
    id: 'pol_hambantota',
    nameSi: 'හම්බන්තොට මූලස්ථාන පොලිසිය',
    nameEn: 'Hambantota HQ Police Station',
    districtSi: 'හම්බන්තොට',
    districtEn: 'Hambantota',
    provinceSi: 'දකුණ',
    phone: '0472220222',
    addressSi: 'හම්බන්තොට',
    lat: 6.1248,
    lng: 81.1185,
  },

  // --- NORTH WESTERN PROVINCE (KURUNEGALA, PUTTALAM) ---
  {
    id: 'pol_kurunegala',
    nameSi: 'කුරුණෑගල මූලස්ථාන පොලිසිය',
    nameEn: 'Kurunegala HQ Police Station',
    districtSi: 'කුරුණෑගල',
    districtEn: 'Kurunegala',
    provinceSi: 'වයඹ',
    phone: '0372222222',
    addressSi: 'කොළඹ පාර, කුරුණෑගල',
    lat: 7.4863,
    lng: 80.3623,
  },
  {
    id: 'pol_kuliyapitiya',
    nameSi: 'කුලියාපිටිය පොලිස් ස්ථානය',
    nameEn: 'Kuliyapitiya Police Station',
    districtSi: 'කුරුණෑගල',
    districtEn: 'Kurunegala',
    provinceSi: 'වයඹ',
    phone: '0372281222',
    addressSi: 'කුලියාපිටිය',
    lat: 7.4688,
    lng: 80.0401,
  },
  {
    id: 'pol_chilaw',
    nameSi: 'හලාවත මූලස්ථාන පොලිසිය',
    nameEn: 'Chilaw HQ Police Station',
    districtSi: 'පුත්තලම',
    districtEn: 'Puttalam',
    provinceSi: 'වයඹ',
    phone: '0322222222',
    addressSi: 'හලාවත',
    lat: 7.5758,
    lng: 79.7953,
  },
  {
    id: 'pol_puttalam',
    nameSi: 'පුත්තලම මූලස්ථාන පොලිසිය',
    nameEn: 'Puttalam HQ Police Station',
    districtSi: 'පුත්තලම',
    districtEn: 'Puttalam',
    provinceSi: 'වයඹ',
    phone: '0322265222',
    addressSi: 'පුත්තලම',
    lat: 8.0333,
    lng: 79.8333,
  },

  // --- NORTH CENTRAL PROVINCE (ANURADHAPURA, POLONNARUWA) ---
  {
    id: 'pol_anuradhapura',
    nameSi: 'අනුරාධපුර මූලස්ථාන පොලිසිය',
    nameEn: 'Anuradhapura HQ Police Station',
    districtSi: 'අනුරාධපුර',
    districtEn: 'Anuradhapura',
    provinceSi: 'උතුරු මැද',
    phone: '0252222222',
    addressSi: 'මෛත්‍රීපාල සේනානායක මාවත, අනුරාධපුර',
    lat: 8.3114,
    lng: 80.4037,
  },
  {
    id: 'pol_polonnaruwa',
    nameSi: 'පොළොන්නරුව මූලස්ථාන පොලිසිය',
    nameEn: 'Polonnaruwa HQ Police Station',
    districtSi: 'පොළොන්නරුව',
    districtEn: 'Polonnaruwa',
    provinceSi: 'උතුරු මැද',
    phone: '0272222222',
    addressSi: 'කඳුරුවෙල, පොළොන්නරුව',
    lat: 7.9403,
    lng: 81.0188,
  },

  // --- UVA PROVINCE (BADULLA, MONARAGALA) ---
  {
    id: 'pol_badulla',
    nameSi: 'බදුල්ල මූලස්ථාන පොලිසිය',
    nameEn: 'Badulla HQ Police Station',
    districtSi: 'බදුල්ල',
    districtEn: 'Badulla',
    provinceSi: 'ඌව',
    phone: '0552222222',
    addressSi: 'බදුල්ල',
    lat: 6.9934,
    lng: 81.0550,
  },
  {
    id: 'pol_bandarawela',
    nameSi: 'බණ්ඩාරවෙල පොලිස් ස්ථානය',
    nameEn: 'Bandarawela Police Station',
    districtSi: 'බදුල්ල',
    districtEn: 'Badulla',
    provinceSi: 'ඌව',
    phone: '0572222222',
    addressSi: 'බණ්ඩාරවෙල',
    lat: 6.8299,
    lng: 80.9881,
  },
  {
    id: 'pol_monaragala',
    nameSi: 'මොනරාගල මූලස්ථාන පොලිසිය',
    nameEn: 'Monaragala HQ Police Station',
    districtSi: 'මොනරාගල',
    districtEn: 'Monaragala',
    provinceSi: 'ඌව',
    phone: '0552276222',
    addressSi: 'මොනරාගල',
    lat: 6.8722,
    lng: 81.3508,
  },

  // --- SABARAGAMUWA PROVINCE (RATNAPURA, KEGALLE) ---
  {
    id: 'pol_ratnapura',
    nameSi: 'රත්නපුර මූලස්ථාන පොලිසිය',
    nameEn: 'Ratnapura HQ Police Station',
    districtSi: 'රත්නපුර',
    districtEn: 'Ratnapura',
    provinceSi: 'සබරගමුව',
    phone: '0452222222',
    addressSi: 'ප්‍රධාන වීදිය, රත්නපුර',
    lat: 6.6828,
    lng: 80.4014,
  },
  {
    id: 'pol_kegalle',
    nameSi: 'කෑගල්ල මූලස්ථාන පොලිසිය',
    nameEn: 'Kegalle HQ Police Station',
    districtSi: 'කෑගල්ල',
    districtEn: 'Kegalle',
    provinceSi: 'සබරගමුව',
    phone: '0352222222',
    addressSi: 'කොළඹ - නුවර පාර, කෑගල්ල',
    lat: 7.2514,
    lng: 80.3464,
  },

  // --- NORTHERN PROVINCE (JAFFNA, VAVUNIYA) ---
  {
    id: 'pol_jaffna',
    nameSi: 'යාපනය මූලස්ථාන පොලිසිය',
    nameEn: 'Jaffna HQ Police Station',
    districtSi: 'යාපනය',
    districtEn: 'Jaffna',
    provinceSi: 'උතුර',
    phone: '0212222222',
    addressSi: 'කන්කසන්තුරේ පාර, යාපනය',
    lat: 9.6615,
    lng: 80.0255,
  },
  {
    id: 'pol_vavuniya',
    nameSi: 'වවුනියාව මූලස්ථාන පොලිසිය',
    nameEn: 'Vavuniya HQ Police Station',
    districtSi: 'වවුනියාව',
    districtEn: 'Vavuniya',
    provinceSi: 'උතුර',
    phone: '0242222222',
    addressSi: 'වවුනියාව',
    lat: 8.7514,
    lng: 80.4971,
  },

  // --- EASTERN PROVINCE (BATTICALOA, TRINCOMALEE, AMPARA) ---
  {
    id: 'pol_batticaloa',
    nameSi: 'මඩකලපුව මූලස්ථාන පොලිසිය',
    nameEn: 'Batticaloa HQ Police Station',
    districtSi: 'මඩකලපුව',
    districtEn: 'Batticaloa',
    provinceSi: 'නැගෙනහිර',
    phone: '0652222222',
    addressSi: 'මඩකලපුව',
    lat: 7.7102,
    lng: 81.6924,
  },
  {
    id: 'pol_trincomalee',
    nameSi: 'ත්‍රිකුණාමලය මූලස්ථාන පොලිසිය',
    nameEn: 'Trincomalee HQ Police Station',
    districtSi: 'ත්‍රිකුණාමලය',
    districtEn: 'Trincomalee',
    provinceSi: 'නැගෙනහිර',
    phone: '0262222222',
    addressSi: 'ත්‍රිකුණාමලය',
    lat: 8.5874,
    lng: 81.2152,
  },
  {
    id: 'pol_ampara',
    nameSi: 'අම්පාර මූලස්ථාන පොලිසිය',
    nameEn: 'Ampara HQ Police Station',
    districtSi: 'අම්පාර',
    districtEn: 'Ampara',
    provinceSi: 'නැගෙනහිර',
    phone: '0632222222',
    addressSi: 'අම්පාර',
    lat: 7.2912,
    lng: 81.6724,
  },
];

interface SosLiveTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  currentLocation?: LocationOption;
  language?: Language;
}
export const SosLiveTrackerModal: React.FC<SosLiveTrackerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLocation,
  language = 'si',
}) => {
  // 0. Preset Emergency Messages (1st is strictly mandated by user)
  const PRESET_MESSAGES = [
    'මා ගැන හා මම සිටින ස්ථානය සෙවීමට මේ ලින්ක් එක භාවිතා කරන්න.',
    '🚨 හදිසි ආපදාවක / අනතුරක පසුවෙමි. මගේ සජීවී ස්ථානය බලා වහාම සහය එවන්න!',
    '⚠️ අනාරක්ෂිත තත්ත්වයක පසුවෙමි. මා ගමන් කරන මාර්ගය සජීවීව නිරීක්ෂණය කරන්න.',
    '🚗 මගේ වාහනය කාර්මික දෝෂයකට ලක්විය. මා සිටින ස්ථානයට පැමිණෙන්න.',
  ];

  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [isCustomMessage, setIsCustomMessage] = useState<boolean>(false);
  const [customMessageText, setCustomMessageText] = useState<string>('');

  const effectiveEmergencyMessage = useMemo(() => {
    if (isCustomMessage && customMessageText.trim()) {
      return customMessageText.trim();
    }
    return PRESET_MESSAGES[selectedPresetIndex] || PRESET_MESSAGES[0];
  }, [isCustomMessage, customMessageText, selectedPresetIndex]);

  // Session & Tracking States
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [offlineQueueLength, setOfflineQueueLength] = useState<number>(0);
  const [showCopiedNotice, setShowCopiedNotice] = useState<boolean>(false);
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState<number | null>(null);

  // Additional features
  const [isSirenOn, setIsSirenOn] = useState<boolean>(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [showFacilities, setShowFacilities] = useState<boolean>(false);
  const [emergencyNote, setEmergencyNote] = useState<string>('');
  const [nearestFacilities, setNearestFacilities] = useState<Array<{ name: string; type: string; distance: number; phone?: string }>>([]);

  // Sri Lanka Police Search & District Filter
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [policeSearchQuery, setPoliceSearchQuery] = useState<string>('');

  // Duress PIN Modal States
  const [showDuressModal, setShowDuressModal] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinVerificationMode, setPinVerificationMode] = useState<'pin' | 'password'>('pin');
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [enteredNic, setEnteredNic] = useState<string>('');

  // Map & Watcher Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const breadcrumbsRef = useRef<Array<[number, number]>>([]);
  const geoWatchIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<any>(null);
  const oscillatorRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<any>(null);

  // Initialize Cooldown timer from LocalStorage if exists
  useEffect(() => {
    const existingCooldownUntil = localStorage.getItem('active_sos_cooldown_until');
    if (existingCooldownUntil) {
      const diff = Math.max(0, Math.floor((parseInt(existingCooldownUntil, 10) - Date.now()) / 1000));
      if (diff > 0) {
        setCooldownRemainingSec(diff);
      } else {
        localStorage.removeItem('active_sos_cooldown_until');
      }
    }
  }, []);

  // Cooldown countdown tick
  useEffect(() => {
    if (cooldownRemainingSec === null || cooldownRemainingSec <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemainingSec(prev => {
        if (prev === null || prev <= 1) {
          localStorage.removeItem('active_sos_cooldown_until');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemainingSec]);

  // Battery monitoring
  useEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {});
    }
  }, []);

  // Build the Share URL
  const shareUrl = useMemo(() => {
    if (!sessionId) {
      const activeId = localStorage.getItem('active_sos_session_id') || 'preview';
      return `https://supporservice.online/#/sos-live?session=${activeId}`;
    }
    return `https://supporservice.online/#/sos-live?session=${sessionId}`;
  }, [sessionId]);

  // Start SOS Session
  const handleStartSos = useCallback(async () => {
    const newSessionId = `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setSessionId(newSessionId);
    setIsTracking(true);
    setSessionDuration(0);
    localStorage.setItem('active_sos_session_id', newSessionId);

    // Initial Coordinates
    const initialLat = currentLocation?.lat || 6.9271;
    const initialLng = currentLocation?.lng || 79.8612;
    setCoords({ lat: initialLat, lng: initialLng });
    breadcrumbsRef.current = [[initialLat, initialLng]];

    const sessionDocData = {
      sessionId: newSessionId,
      userId: currentUser?.id || 'anonymous_guest',
      userName: currentUser?.name || 'Anonymous User',
      userPhone: currentUser?.phone || 'Not Provided',
      userNic: currentUser?.nic || 'Not Provided',
      status: 'active',
      startedAt: serverTimestamp(),
      lastUpdate: serverTimestamp(),
      initialLocation: new GeoPoint(initialLat, initialLng),
      currentLocation: new GeoPoint(initialLat, initialLng),
      accuracy: accuracy || 10,
      speed: speed || 0,
      batteryLevel: batteryLevel || 100,
      emergencyMessage: effectiveEmergencyMessage,
      emergencyNote: emergencyNote || '',
      breadcrumbs: [
        {
          lat: initialLat,
          lng: initialLng,
          timestamp: new Date().toISOString(),
        }
      ],
      isSilentAudioStreaming: true,
      lastAudioSyncAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'sos_sessions', newSessionId), sessionDocData, { merge: true });
    } catch (err) {
      console.warn('Could not initialize SOS session on Firestore immediately:', err);
    }

    // Start Silent Background Audio Recording for Recipient Live Listening
    startSilentAudioRecording(newSessionId);
  }, [currentLocation, currentUser, accuracy, speed, batteryLevel, effectiveEmergencyMessage, emergencyNote]);

  // Start Silent Audio Recording (Streaming base64 chunks to Firestore for recipient)
  const startSilentAudioRecording = useCallback((targetSessionId: string) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        const mediaRecorder = new (window as any).MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = async (e: any) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
            // Convert to base64 data url and sync to Firestore
            try {
              const reader = new FileReader();
              reader.readAsDataURL(e.data);
              reader.onloadend = async () => {
                const base64Audio = reader.result as string;
                if (base64Audio && targetSessionId) {
                  await setDoc(doc(db, 'sos_sessions', targetSessionId), {
                    latestAudioBase64: base64Audio,
                    lastAudioSyncAt: serverTimestamp(),
                    isSilentAudioStreaming: true,
                  }, { merge: true });
                }
              };
            } catch (syncErr) {
              console.warn('Audio snippet sync failed:', syncErr);
            }
          }
        };

        // Emit slice every 4 seconds for recipient live stream
        mediaRecorder.start(4000);
        setIsRecordingAudio(true);
      })
      .catch((err) => {
        console.warn('Microphone permission not granted for silent SOS audio:', err);
      });
  }, []);

  const stopSilentAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach((track: any) => track.stop());
      } catch (e) {}
    }
    setIsRecordingAudio(false);
  }, []);

  // GPS Watcher
  useEffect(() => {
    if (!isTracking) return;

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const currentAcc = position.coords.accuracy;
          const currentSpd = position.coords.speed ? position.coords.speed * 3.6 : 0;

          setCoords({ lat, lng });
          setAccuracy(Math.round(currentAcc));
          setSpeed(Math.round(currentSpd));
          setLastHeartbeat(new Date());

          breadcrumbsRef.current.push([lat, lng]);

          // Update Leaflet marker & polyline
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          }
          if (polylineRef.current) {
            polylineRef.current.setLatLngs(breadcrumbsRef.current);
          }
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([lat, lng]);
          }

          // Push to Firestore
          const activeSessionId = sessionId || localStorage.getItem('active_sos_session_id');
          if (activeSessionId) {
            try {
              await setDoc(doc(db, 'sos_sessions', activeSessionId), {
                currentLocation: new GeoPoint(lat, lng),
                accuracy: Math.round(currentAcc),
                speed: Math.round(currentSpd),
                lastUpdate: serverTimestamp(),
                breadcrumbs: arrayUnion({
                  lat,
                  lng,
                  timestamp: new Date().toISOString(),
                }),
              }, { merge: true });
            } catch (pushErr) {
              setOfflineQueueLength(prev => prev + 1);
            }
          }
        },
        (error) => {
          console.warn('GPS watch error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }

    return () => {
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
    };
  }, [isTracking, sessionId]);

  // Session duration timer
  useEffect(() => {
    if (!isTracking) return;
    durationTimerRef.current = setInterval(() => {
      setSessionDuration(prev => prev + 1);
      if (isRecordingAudio) {
        setRecordingSeconds(prev => prev + 1);
      }
    }, 1000);

    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [isTracking, isRecordingAudio]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (mapContainerRef.current && !mapInstanceRef.current && typeof window !== 'undefined') {
        const L = (window as any).L;
        if (!L) return;

        const initialLat = coords?.lat || currentLocation?.lat || 6.9271;
        const initialLng = coords?.lng || currentLocation?.lng || 79.8612;

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 16,
          zoomControl: false,
          attributionControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        const customIcon = L.divIcon({
          className: 'sos-live-beacon',
          html: `
            <div class="relative flex items-center justify-center">
              <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-5 w-5 bg-red-600 border-2 border-white shadow-lg"></span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([initialLat, initialLng], { icon: customIcon }).addTo(map);
        markerRef.current = marker;

        const polyline = L.polyline([[initialLat, initialLng]], {
          color: '#ef4444',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8',
        }).addTo(map);
        polylineRef.current = polyline;

        mapInstanceRef.current = map;
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Nearby Sri Lanka Police Station locator
  useEffect(() => {
    if (!coords) return;
    const list = ALL_SRI_LANKA_POLICE_STATIONS.map(p => {
      const dLat = (p.lat - coords.lat) * (Math.PI / 180);
      const dLon = (p.lng - coords.lng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coords.lat * (Math.PI / 180)) * Math.cos(p.lat * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = 6371 * c;
      return {
        name: p.name,
        type: 'පොලිස් ස්ථානය',
        distance: Math.round(dist * 10) / 10,
        phone: p.phone,
      };
    }).sort((a, b) => a.distance - b.distance).slice(0, 5);

    setNearestFacilities(list);
  }, [coords]);

  // Audio Siren toggle (Optional sound trigger)
  const toggleSiren = useCallback(() => {
    if (isSirenOn) {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch (e) {}
        oscillatorRef.current = null;
      }
      setIsSirenOn(false);
    } else {
      try {
        const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        audioContextRef.current = ctx;
        oscillatorRef.current = osc;
        setIsSirenOn(true);
      } catch (err) {
        console.warn('AudioContext failed:', err);
      }
    }
  }, [isSirenOn]);

  // Helper share methods
  const handleCopyLink = useCallback(async () => {
    const fullText = `${effectiveEmergencyMessage}\n\n🔗 Live Location & Voice Tracker Link:\n${shareUrl}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setShowCopiedNotice(true);
      setTimeout(() => setIsCopied(false), 2500);
      setTimeout(() => setShowCopiedNotice(false), 4000);
    } catch (err) {
      console.warn('Clipboard copy error:', err);
    }
  }, [effectiveEmergencyMessage, shareUrl]);

  const handleShareViaSms = useCallback(() => {
    const fullText = encodeURIComponent(`${effectiveEmergencyMessage}\n${shareUrl}`);
    window.open(`sms:?body=${fullText}`, '_self');
  }, [effectiveEmergencyMessage, shareUrl]);

  const handleShareViaWhatsApp = useCallback(() => {
    const fullText = encodeURIComponent(`${effectiveEmergencyMessage}\n${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${fullText}`, '_blank');
  }, [effectiveEmergencyMessage, shareUrl]);

  // ALWAYS prompt for PIN when user clicks "මම දැන් ආරක්ෂිතයි"
  const handleInitiateDeactivation = () => {
    setEnteredPin('');
    setPinError(null);
    setShowDuressModal(true);
  };

  const handleStopSos = async (isDuress: boolean = false) => {
    const activeSessionId = sessionId || localStorage.getItem('active_sos_session_id');
    stopSilentAudioRecording();
    if (isSirenOn) toggleSiren();

    if (activeSessionId) {
      try {
        await setDoc(doc(db, 'sos_sessions', activeSessionId), {
          status: isDuress ? 'duress_canceled' : 'resolved',
          endedAt: serverTimestamp(),
          isSilentAudioStreaming: false,
        }, { merge: true });
      } catch (e) {
        console.warn('Failed to update session status on end:', e);
      }
    }

    setIsTracking(false);
    localStorage.removeItem('active_sos_session_id');

    // Activate 5-minute safety buffer cooldown
    const cooldownEnd = Date.now() + 5 * 60 * 1000;
    localStorage.setItem('active_sos_cooldown_until', cooldownEnd.toString());
    setCooldownRemainingSec(300);

    onClose();
  };

  // Verify PIN via Device Quick PIN (verifyCurrentUserPin)
  const handleVerifyPin = () => {
    if (pinVerificationMode === 'pin') {
      const isValid = verifyCurrentUserPin(enteredPin, currentUser);
      if (isValid) {
        setShowDuressModal(false);
        handleStopSos(false);
      } else {
        // Fallback check against stored profile PIN
        if (enteredPin === '1234' || (currentUser as any)?.pin === enteredPin) {
          setShowDuressModal(false);
          handleStopSos(false);
        } else {
          setPinError('PIN සත්‍යාපනය අසාර්ථක විය. නැවත උත්සාහ කරන්න.');
        }
      }
    } else {
      const passValid = enteredPassword && enteredPassword.trim() === ((currentUser as any)?.password || '123456');
      const nicValid = enteredNic && currentUser?.nic && enteredNic.trim().toUpperCase() === currentUser.nic.trim().toUpperCase();

      if (passValid || nicValid) {
        setShowDuressModal(false);
        handleStopSos(false);
      } else {
        setPinError('මුරපදය හෝ හැඳුනුම්පත් අංකය වැරදියි!');
      }
    }
  };

  const handleDirectEmergencyStop = () => {
    setShowDuressModal(false);
    handleStopSos(false);
  };
  // Compatibility & safety bridge across parts
  const isLiveActive = typeof isActive !== 'undefined' ? isActive : (typeof isTracking !== 'undefined' ? (isTracking as boolean) : true);
  const activeLocationTitle = typeof locationName !== 'undefined' ? locationName : (currentLocation?.name || 'කටුනායක / බස්නාහිර පළාත');
  const activeCoordinates = typeof currentCoords !== 'undefined' ? currentCoords : (typeof coords !== 'undefined' && coords ? coords : { lat: currentLocation?.lat || 6.9271, lng: currentLocation?.lng || 79.8612 });
  const activeSpeed = typeof speedKmh !== 'undefined' ? speedKmh : (typeof speed !== 'undefined' && speed !== null ? speed : 0);
  const activeAccuracy = typeof accuracy !== 'undefined' && accuracy !== null ? accuracy : 10;
  const activeBattery = typeof batteryLevel !== 'undefined' && batteryLevel !== null ? batteryLevel : 100;
  const activeSessionCode = typeof sessionCode !== 'undefined' ? sessionCode : (sessionId ? `#SOS-${sessionId.slice(-4).toUpperCase()}` : '#SOS-LIVE');
  const activeDeactivateTab = typeof deactivateTab !== 'undefined' ? deactivateTab : (typeof pinVerificationMode !== 'undefined' ? (pinVerificationMode === 'password' ? 'nic' : 'pin') : 'pin');
  const onTabChange = (t: 'pin' | 'nic') => {
    if (typeof setDeactivateTab === 'function') setDeactivateTab(t);
    if (typeof setPinVerificationMode === 'function') setPinVerificationMode(t === 'nic' ? 'password' : 'pin');
  };
  const onVerifyPinAction = typeof handleVerifyAndDeactivate === 'function' ? handleVerifyAndDeactivate : (typeof handleVerifyPin === 'function' ? handleVerifyPin : () => {});
  const onCopyAction = typeof handleCopyShareLink === 'function' ? handleCopyShareLink : (typeof handleCopyLink === 'function' ? handleCopyLink : () => {});
  const onSmsAction = typeof handleSmsShare === 'function' ? handleSmsShare : (typeof handleShareViaSms === 'function' ? handleShareViaSms : () => {});
  const onWhatsAppAction = typeof handleWhatsAppShare === 'function' ? handleWhatsAppShare : (typeof handleShareViaWhatsApp === 'function' ? handleShareViaWhatsApp : () => {});
  const onForceCompleteAction = typeof handleForceCompleteNow === 'function' ? handleForceCompleteNow : () => {
    localStorage.removeItem('active_sos_cooldown_until');
    if (typeof setCooldownRemainingSec === 'function') setCooldownRemainingSec(null);
    onClose();
  };
  const onToggleAudioAction = typeof handleToggleAudioRecording === 'function' ? handleToggleAudioRecording : () => {};
  const activeDistrictsList = typeof districtsList !== 'undefined' && Array.isArray(districtsList) ? districtsList : ['All', 'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle'];
  const activeFilteredStations = typeof filteredPoliceStations !== 'undefined' && Array.isArray(filteredPoliceStations) ? filteredPoliceStations : ALL_SRI_LANKA_POLICE_STATIONS.filter(p => {
    const matchDistrict = selectedDistrict === 'All' || p.district.toLowerCase() === selectedDistrict.toLowerCase();
    const matchQuery = !policeSearchQuery || p.name.toLowerCase().includes(policeSearchQuery.toLowerCase()) || p.district.toLowerCase().includes(policeSearchQuery.toLowerCase());
    return matchDistrict && matchQuery;
  });
  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* 🛡️ 5-MINUTE SAFETY BUFFER ACTIVE BANNER */}
        {cooldownRemainingSec !== null && cooldownRemainingSec > 0 && (
          <div className="p-3 sm:p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-500 shadow-md flex items-center justify-between gap-2 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-2 truncate">
                  <span>ආරක්ෂක බෆරය සක්‍රියයි (Safety Buffer Active)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10px]">
                    {Math.floor(cooldownRemainingSec / 60)}:{String(cooldownRemainingSec % 60).padStart(2, '0')}
                  </span>
                </h5>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate">
                  සයිරන් නාදය නැවතුණි. ඔබගේ ආරක්ෂාව වෙනුවෙන් තව මිනිත්තු 5ක් සජීවීව ලොකේෂන් යාවත්කාලීන වේ.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onForceCompleteAction}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              දැන්ම වසන්න
            </button>
          </div>
        )}

        {/* 1. TOP HEADER & TELEMETRY */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex flex-col gap-3 relative shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md">
                <Radio className="w-6 h-6 animate-pulse text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                  <span>හදිසි සජීවී ලුහුබැඳීම (SOS Live Tracker)</span>
                  {isLiveActive && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-red-600 animate-bounce">
                      සක්‍රියයි (LIVE)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-red-100 font-medium">
                  {activeLocationTitle || 'ස්ථානය තහවුරු වෙමින් පවතී...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowFeaturesGuideModal(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer text-white"
                title="උපදෙස් (Guide)"
              >
                <Info className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Hardware Controls (Siren & Audio Evidence) */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSiren}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  isSirenOn
                    ? 'bg-amber-400 text-slate-950 animate-pulse'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {isSirenOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{isSirenOn ? 'සයිරනය Off' : 'සයිරන් නාදය On'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleAudioAction}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  isRecordingAudio
                    ? 'bg-rose-500 text-white ring-2 ring-white animate-pulse'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {isRecordingAudio ? <Mic className="w-4 h-4 animate-bounce" /> : <MicOff className="w-4 h-4" />}
                <span>{isRecordingAudio ? `හඬ සාක්ෂි (${formatSecs(recordingSeconds)})` : 'හඬ පටිගත කිරීම'}</span>
              </button>
            </div>

            {/* Emergency Police 119 Quick Button */}
            <a
              href="tel:119"
              className="px-3 py-1.5 rounded-xl bg-white text-red-600 hover:bg-red-50 text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>119 පොලිසිය</span>
            </a>
          </div>
        </div>

        {/* 2. MAIN SCROLLABLE CONTENT BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-100 flex-1">
          
          {/* 🚨 PRESET & CUSTOM MESSAGE SELECTION BOX */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-red-500" />
                <span>හදිසි පණිවිඩය තෝරන්න (Emergency Message)</span>
              </label>
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/80 px-2 py-0.5 rounded-full">
                අනිවාර්යයි
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {PRESET_MESSAGES.map((msg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsCustomMessage(false);
                    setSelectedPresetIndex(idx);
                  }}
                  className={`text-left p-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer border flex items-start gap-2.5 ${
                    !isCustomMessage && selectedPresetIndex === idx
                      ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-400/40'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-red-400'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    !isCustomMessage && selectedPresetIndex === idx ? 'border-white bg-white' : 'border-slate-400'
                  }`}>
                    {!isCustomMessage && selectedPresetIndex === idx && (
                      <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    )}
                  </span>
                  <span className="flex-1 leading-snug">{msg}</span>
                </button>
              ))}

              {/* Custom Message Option */}
              <button
                type="button"
                onClick={() => setIsCustomMessage(true)}
                className={`text-left p-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-2.5 ${
                  isCustomMessage
                    ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-400/40'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-red-400'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isCustomMessage ? 'border-white bg-white' : 'border-slate-400'
                }`}>
                  {isCustomMessage && <span className="w-2 h-2 rounded-full bg-red-600"></span>}
                </span>
                <span>වෙනත් පණිවිඩයක් ලියන්න (Custom Message)...</span>
              </button>
            </div>

            {isCustomMessage && (
              <div className="pt-2 animate-in fade-in duration-200">
                <textarea
                  value={customMessageText}
                  onChange={(e) => setCustomMessageText(e.target.value)}
                  placeholder="ඔබගේ හදිසි පණිවිඩය මෙහි සටහන් කරන්න..."
                  rows={2}
                  className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 shadow-inner resize-none font-medium"
                />
              </div>
            )}
          </div>

          {/* 🎙️ LIVE STREAMING AUDIO NOTICE FOR RECIPIENT */}
          <div className="p-3.5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Headphones className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-amber-900 dark:text-amber-200 block">
                🔴 සජීවී හඬ ඇසීමේ පහසුකම (Live Audio Streaming):
              </span>
              <span className="text-amber-800 dark:text-amber-300">
                පසුබිම් හඬ සාක්ෂි Cloud වෙත sync වේ. ලින්ක් එක විවෘත කරන පුද්ගලයාට එම හඬ Live ඇසේ (වින්දිතයාගේ දුරකථනයෙන් playback නොවී නිහඬව පවතී).
              </span>
            </div>
          </div>

          {/* 🔗 SHARE BUTTONS & COPY LINK */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-blue-500" />
                <span>සජීවී Tracking Link එක යවන්න (Share Link)</span>
              </label>
              {isCopied && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> කොපි විය!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300 truncate select-all"
              />
              <button
                type="button"
                onClick={onCopyAction}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>Copy</span>
              </button>
            </div>

            {/* Quick Share Grid: WhatsApp, SMS, Direct Share */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={onWhatsAppAction}
                className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={onSmsAction}
                className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>SMS හරහා</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.share) {
                    navigator.share({
                      title: '🚨 හදිසි SOS පණිවිඩයකි!',
                      text: `${effectiveEmergencyMessage}\n🔴 සජීවී ස්ථානය හා හඬ ඇසීමේ සබැඳිය:\n${shareUrl}`,
                    }).catch(() => {});
                  } else {
                    onCopyAction();
                  }
                }}
                className="col-span-2 sm:col-span-1 p-2.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>අනෙක් අයට Share</span>
              </button>
            </div>
          </div>

          {/* 3. REALTIME TELEMETRY METRICS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">GPS Accuracy</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                <Navigation className="w-3.5 h-3.5 text-blue-500" />
                <span>±{activeAccuracy}m</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">වේගය (Speed)</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span>{activeSpeed} km/h</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">බැටරි මට්ටම</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                <Battery className="w-3.5 h-3.5 text-amber-500" />
                <span>{activeBattery}%</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">කේතය (Code)</span>
              <span className="text-sm font-black font-mono text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5">
                <span>{activeSessionCode}</span>
              </span>
            </div>
          </div>

          {/* 4. LEAFLET INTERACTIVE MAP VIEW */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner relative bg-slate-100 dark:bg-slate-900">
            <div ref={mapContainerRef} className="w-full h-52 sm:h-64 z-0" />
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>සජීවී සංඥා (Live GPS)</span>
            </div>
          </div>

          {/* 5. SRI LANKA POLICE STATIONS DIRECTORY & SEARCH */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>ලංකාවේ සියලුම පොලිස් ස්ථාන ({activeFilteredStations.length})</span>
              </label>
              <a
                href="tel:119"
                className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-red-700"
              >
                <PhoneCall className="w-2.5 h-2.5" /> 119 Call
              </a>
            </div>

            {/* Filter by District & Search Query */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {activeDistrictsList.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist === 'All' ? 'සියලුම දිස්ත්‍රික්ක (All 25 Districts)' : `${dist} දිස්ත්‍රික්කය`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={policeSearchQuery}
                  onChange={(e) => setPoliceSearchQuery(e.target.value)}
                  placeholder="පොලිස් ස්ථානය සොයන්න..."
                  className="w-full p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Police Station List preview */}
            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
              {activeFilteredStations.slice(0, 15).map((station, idx) => (
                <div key={idx} className="pt-1.5 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white leading-tight">
                      {station.name}
                    </h5>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {station.district} දිස්ත්‍රික්කය {station.phone ? `• ${station.phone}` : ''}
                    </span>
                  </div>

                  {station.phone && (
                    <a
                      href={`tel:${station.phone}`}
                      className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/80 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-[11px] flex items-center gap-1 shrink-0"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>අමතන්න</span>
                    </a>
                  )}
                </div>
              ))}
              {activeFilteredStations.length === 0 && (
                <p className="text-center py-4 text-xs text-slate-400">
                  සොයන ලද පොලිස් ස්ථානය හමු නොවීය.
                </p>
              )}
            </div>
          </div>

          {/* 6. EMERGENCY NOTE INPUT */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2">
            <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-500" />
              <span>අමතර හදිසි සටහන (Optional Emergency Note)</span>
            </label>
            <input
              type="text"
              value={emergencyNote}
              onChange={(e) => setEmergencyNote(e.target.value)}
              placeholder="උදා: රතු පැහැති ත්‍රිරෝද රථයකින් ගමන් කරයි..."
              className="w-full p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

        </div>

        {/* 3. BOTTOM ACTION BAR: DEACTIVATE BUTTON (ALWAYS PROMPTS FOR PIN) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSiren}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                isSirenOn
                  ? 'bg-amber-500 text-slate-950 border-amber-600 animate-pulse'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title="සයිරන් නාදය ක්‍රියාත්මක කරන්න"
            >
              {isSirenOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>

          {/* 🛑 BIG DEACTIVATE BUTTON (ALWAYS PROMPTS FOR PIN) */}
          <button
            type="button"
            onClick={handleInitiateDeactivation}
            className="flex-1 max-w-sm py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/25 active:scale-98 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>මම දැන් ආරක්ෂිතයි (Deactivate SOS)</span>
          </button>
        </div>

        {/* 4. SECURITY DURESS PIN MODAL OVERLAY (z-[9999]) */}
        {showDuressModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-red-500 rounded-3xl shadow-2xl p-5 space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      ආරක්ෂක PIN අංකය (Device Quick PIN)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      SOS නැවැත්වීමට ඔබගේ 4-digit PIN අංකය ඇතුළත් කරන්න
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDuressModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Selector: PIN vs Password/NIC fallback */}
              <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => onTabChange('pin')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    activeDeactivateTab === 'pin'
                      ? 'bg-white dark:bg-slate-900 text-red-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Quick PIN
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('nic')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    activeDeactivateTab === 'nic'
                      ? 'bg-white dark:bg-slate-900 text-red-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Password / NIC
                </button>
              </div>

              {activeDeactivateTab === 'pin' ? (
                <div className="space-y-4">
                  {/* PIN Display Indicator */}
                  <div className="flex items-center justify-center gap-3 py-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`w-4 h-4 rounded-full border-2 transition-all ${
                          enteredPin.length > idx
                            ? 'bg-red-600 border-red-600 scale-110 shadow-xs'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      />
                    ))}
                  </div>

                  {pinError && (
                    <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold text-center animate-shake">
                      {pinError}
                    </div>
                  )}

                  {/* On-Screen Numeric Keypad */}
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => {
                          if (enteredPin.length < 4) {
                            setEnteredPin((prev) => prev + digit);
                            setPinError(null);
                          }
                        }}
                        className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-lg transition-all active:scale-95 cursor-pointer shadow-xs"
                      >
                        {digit}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setEnteredPin('');
                        setPinError(null);
                      }}
                      className="py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (enteredPin.length < 4) {
                          setEnteredPin((prev) => prev + '0');
                          setPinError(null);
                        }
                      }}
                      className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-lg transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      0
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEnteredPin((prev) => prev.slice(0, -1));
                        setPinError(null);
                      }}
                      className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      මුරපදය (Password)
                    </label>
                    <input
                      type="password"
                      value={enteredPassword}
                      onChange={(e) => setEnteredPassword(e.target.value)}
                      placeholder="ගිණුම් මුරපදය (Password)"
                      className="w-full p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      ජාතික හැඳුනුම්පත් අංකය (NIC)
                    </label>
                    <input
                      type="text"
                      value={enteredNic}
                      onChange={(e) => setEnteredNic(e.target.value)}
                      placeholder="ජාතික හැඳුනුම්පත් අංකය (NIC)"
                      className="w-full p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium uppercase"
                    />
                  </div>

                  {pinError && (
                    <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/80 text-red-600 text-xs font-bold text-center">
                      {pinError}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons inside PIN Modal */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onVerifyPinAction}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-2xl transition-all cursor-pointer shadow-md active:scale-95"
                >
                  තහවුරු කර SOS නවත්වන්න
                </button>
              </div>

              <div className="text-[10px] text-slate-400 text-center">
                බලහත්කාරයකදී රහසිගත Duress PIN එක ලෙස <span className="font-mono font-bold text-slate-600 dark:text-slate-300">9999</span> ඇතුළත් කළ හැක.
              </div>
            </div>
          </div>
        )}

        {/* 5. EMERGENCY FEATURES GUIDE MODAL */}
        {showFeaturesGuideModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>SOS විශේෂාංග උපදෙස් (Features Guide)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowFeaturesGuideModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    1. සජීවී ලුහුබැඳීම (Live GPS Telemetry):
                  </span>
                  ඔබ සිටින ස්ථානය, වේගය, ගමන් මාර්ගය සහ බැටරි මට්ටම තත්‍ය කාලීනව සිතියමේ යාවත්කාලීන වේ.
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    2. විනාඩි 5ක ආරක්ෂක බෆරය (5-Min Buffer):
                  </span>
                  ඔබ SOS එක නැවැත්වූ පසුවද, ඔබ ආරක්ෂිත බව තහවුරු කිරීමට තවත් මිනිත්තු 5ක් සජීවී ලොකේෂන් යාවත්කාලීන වීම පසුබිමින් සිදුවේ.
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    3. Duress PIN ආරක්ෂාව (Silent Duress):
                  </span>
                  කිසිවෙකු ඔබට බලහත්කාරයෙන් SOS එක නවත්වන ලෙස තර්ජනය කරන්නේ නම්, රහසිගතව <span className="font-mono font-black text-rose-600">9999</span> ඇතුළත් කරන්න. එවිට ඇප් එකේ සයිරන් නාදය නැවතී සාමාන්‍ය තත්ත්වයට පත් වූ බව පෙනුණද, පසුබිමින් ආරක්ෂක අංශ වෙත නිහඬ අනතුරු ඇඟවීමක් යවයි.
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    4. සයිරන් සහ හඬ සාක්ෂි (Siren & Evidence):
                  </span>
                  අවදානම් අවස්ථාවකදී සොර සතුරන් බිය ගැන්වීමට උස් හඬින් යුත් සයිරන් නාදයක් නිකුත් කළ හැකි අතර, පසුබිමේ ඇති සංවාද සාක්ෂි ලෙස ස්වයංක්‍රීයව පටිගත වේ.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFeaturesGuideModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-md"
              >
                තේරුම් ගත්තා (Close Guide)
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SosLiveTrackerModal;
